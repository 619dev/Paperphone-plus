use std::sync::Arc;
use axum::{Router, routing::{get, post, put, delete}, extract::{State, Path}, Json};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_friends))
        .route("/requests", get(list_requests))
        .route("/request", post(send_request))
        .route("/accept", post(accept_request))
        .route("/{id}", delete(remove_friend))
        .route("/auto-delete", post(update_auto_delete))
        .route("/remark", put(update_remark))
}

async fn list_friends(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let rows: Vec<(String, String, String, Option<String>, i8, i32, Option<String>, Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT u.id, u.username, u.nickname, u.avatar, u.is_online, f.auto_delete, u.ik_pub, u.kem_pub, f.remark
         FROM friends f JOIN users u ON u.id = f.friend_id
         WHERE f.user_id = ? AND f.status = 'accepted'
         ORDER BY u.nickname"
    )
    .bind(&auth.0.id)
    .fetch_all(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let friends: Vec<serde_json::Value> = rows.iter().map(|(id, username, nickname, avatar, online, auto_del, ik_pub, kem_pub, remark)| {
        serde_json::json!({
            "id": id, "username": username, "nickname": nickname,
            "avatar": avatar, "is_online": *online == 1, "auto_delete": auto_del,
            "ik_pub": ik_pub, "kem_pub": kem_pub, "remark": remark
        })
    }).collect();

    Ok(Json(serde_json::json!(friends)))
}

async fn list_requests(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let rows: Vec<(String, String, String, Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT u.id, u.username, u.nickname, u.avatar, f.message
         FROM friends f JOIN users u ON u.id = f.user_id
         WHERE f.friend_id = ? AND f.status = 'pending'
         ORDER BY f.created_at DESC"
    )
    .bind(&auth.0.id)
    .fetch_all(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let requests: Vec<serde_json::Value> = rows.iter().map(|(id, username, nickname, avatar, msg)| {
        serde_json::json!({ "id": id, "username": username, "nickname": nickname, "avatar": avatar, "message": msg })
    }).collect();

    Ok(Json(serde_json::json!(requests)))
}

#[derive(Deserialize)]
struct FriendRequest {
    friend_id: String,
    message: Option<String>,
}

async fn send_request(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<FriendRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    // Check not self
    if auth.0.id == body.friend_id {
        return Err((axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Cannot add yourself" }))));
    }

    // Validate message length (max 512 chars)
    if let Some(ref msg) = body.message {
        if msg.chars().count() > 512 {
            return Err((axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Message too long (max 512 characters)" }))));
        }
    }

    // Never let a new request downgrade an existing friendship. The friends
    // table stores one row per direction, so inspect both directions before
    // writing to also handle incoming requests and legacy inconsistent rows.
    let relationships: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT user_id, friend_id, status FROM friends
         WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
    )
    .bind(&auth.0.id).bind(&body.friend_id)
    .bind(&body.friend_id).bind(&auth.0.id)
    .fetch_all(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    if relationships.iter().any(|(_, _, status)| status == "accepted") {
        // Older releases could leave only one accepted direction behind. A
        // one-way friendship is invisible to one participant because most
        // reads intentionally use user_id -> friend_id. Repair both rows when
        // either side is already accepted instead of trapping the user in an
        // "Already friends" state with no visible contact.
        sqlx::query(
            "INSERT INTO friends (user_id, friend_id, status) VALUES
               (?, ?, 'accepted'), (?, ?, 'accepted')
             ON DUPLICATE KEY UPDATE status = 'accepted'"
        )
        .bind(&auth.0.id).bind(&body.friend_id)
        .bind(&body.friend_id).bind(&auth.0.id)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

        return Ok(Json(serde_json::json!({ "ok": true, "already_friends": true })));
    }
    if relationships.iter().any(|(user_id, _, status)| user_id == &body.friend_id && status == "pending") {
        return Err((axum::http::StatusCode::CONFLICT, Json(serde_json::json!({ "error": "This user has already sent you a friend request" }))));
    }
    if relationships.iter().any(|(_, _, status)| status == "blocked") {
        return Err((axum::http::StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Unable to send friend request" }))));
    }

    sqlx::query(
        "INSERT INTO friends (user_id, friend_id, status, message) VALUES (?, ?, 'pending', ?)
         ON DUPLICATE KEY UPDATE
           message = IF(status = 'pending', VALUES(message), message),
           status = status"
    )
    .bind(&auth.0.id).bind(&body.friend_id).bind(&body.message)
    .execute(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    // Close the small race between the relationship check and the upsert: the
    // upsert above preserves accepted/blocked rows, and this check prevents a
    // misleading notification or success response if one changed meanwhile.
    let stored_status: Option<(String,)> = sqlx::query_as(
        "SELECT status FROM friends WHERE user_id = ? AND friend_id = ?"
    )
    .bind(&auth.0.id).bind(&body.friend_id)
    .fetch_optional(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
    if let Some((status,)) = stored_status {
        if status == "accepted" {
            return Err((axum::http::StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Already friends" }))));
        }
        if status == "blocked" {
            return Err((axum::http::StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Unable to send friend request" }))));
        }
    }

    // Send WS notification
    let sender_info: Option<(String, String, Option<String>)> = sqlx::query_as(
        "SELECT username, nickname, avatar FROM users WHERE id = ?"
    ).bind(&auth.0.id).fetch_optional(&state.db).await.ok().flatten();

    if let Some((username, nickname, avatar)) = sender_info {
        state.ws_clients.send_to_user(&body.friend_id, serde_json::json!({
            "type": "friend_request",
            "from": auth.0.id,
            "username": username,
            "nickname": nickname,
            "avatar": avatar,
            "message": body.message,
        }));
    }

    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct AcceptReq {
    friend_id: String,
}

async fn accept_request(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<AcceptReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    // Update existing request (requester → accepter)
    let result = sqlx::query("UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ? AND status = 'pending'")
        .bind(&body.friend_id).bind(&auth.0.id)
        .execute(&state.db).await
        .map_err(|e| {
            tracing::error!("accept_request UPDATE failed: {}", e);
            (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() })))
        })?;

    if result.rows_affected() == 0 {
        return Err((axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Friend request not found or already processed" }))));
    }

    // Create reverse friendship (accepter → requester)
    sqlx::query("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted') ON DUPLICATE KEY UPDATE status = 'accepted'")
        .bind(&auth.0.id).bind(&body.friend_id)
        .execute(&state.db).await
        .map_err(|e| {
            tracing::error!("accept_request reverse INSERT failed: {}", e);
            (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() })))
        })?;

    // Notify the original requester via WebSocket
    let accepter: Option<(String, String, Option<String>)> = sqlx::query_as(
        "SELECT username, nickname, avatar FROM users WHERE id = ?"
    ).bind(&auth.0.id).fetch_optional(&state.db).await.ok().flatten();

    if let Some((username, nickname, avatar)) = accepter {
        state.ws_clients.send_to_user(&body.friend_id, serde_json::json!({
            "type": "friend_accepted",
            "from": auth.0.id,
            "username": username,
            "nickname": nickname,
            "avatar": avatar,
        }));
    }

    tracing::info!("✅ Friend accepted: {} ↔ {}", auth.0.id, body.friend_id);
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn remove_friend(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(friend_id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)")
        .bind(&auth.0.id).bind(&friend_id).bind(&friend_id).bind(&auth.0.id)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct AutoDeleteReq {
    friend_id: String,
    auto_delete: i32,
}

async fn update_auto_delete(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<AutoDeleteReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    const ALLOWED: [i32; 5] = [0, 86400, 259200, 604800, 2592000];
    if !ALLOWED.contains(&body.auto_delete) {
        return Err((axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid auto_delete value" }))));
    }
    sqlx::query("UPDATE friends SET auto_delete = ? WHERE user_id = ? AND friend_id = ?")
        .bind(body.auto_delete).bind(&auth.0.id).bind(&body.friend_id)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
    // Also update the reverse
    sqlx::query("UPDATE friends SET auto_delete = ? WHERE user_id = ? AND friend_id = ?")
        .bind(body.auto_delete).bind(&body.friend_id).bind(&auth.0.id)
        .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct RemarkReq {
    friend_id: String,
    remark: Option<String>,
}

async fn update_remark(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<RemarkReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let remark = body.remark.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty());
    sqlx::query("UPDATE friends SET remark = ? WHERE user_id = ? AND friend_id = ?")
        .bind(remark).bind(&auth.0.id).bind(&body.friend_id)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
