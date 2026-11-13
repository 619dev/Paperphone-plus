use std::sync::Arc;
use axum::{Router, routing::{get, post, put, delete}, extract::{State, Path}, Json};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

type ApiError = (axum::http::StatusCode, Json<serde_json::Value>);

fn database_error(error: sqlx::Error) -> ApiError {
    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": error.to_string() })))
}

async fn lock_friendship(
    db: &sqlx::MySqlPool,
    user_id: &str,
    friend_id: &str,
) -> Result<(sqlx::Transaction<'static, sqlx::MySql>, bool), ApiError> {
    let mut tx = db.begin().await.map_err(database_error)?;
    // Lock both users in primary-key order, including when neither friend row exists.
    let users: Vec<(String,)> = sqlx::query_as(
        "SELECT id FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE"
    )
    .bind(user_id).bind(friend_id)
    .fetch_all(&mut *tx).await.map_err(database_error)?;
    Ok((tx, users.len() == 2))
}

fn notify_friendship_changed(state: &AppState, user_id: &str, friend_id: &str) {
    let event = serde_json::json!({ "type": "friendship_changed" });
    state.ws_clients.send_to_user(user_id, event.clone());
    state.ws_clients.send_to_user(friend_id, event);
}

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

    let (mut tx, users_exist) = lock_friendship(&state.db, &auth.0.id, &body.friend_id).await?;
    if !users_exist {
        return Err((axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Friend not found" }))));
    }

    let relationships: Vec<(String, String, i32)> = sqlx::query_as(
        "SELECT user_id, status, auto_delete FROM friends
         WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
    )
    .bind(&auth.0.id).bind(&body.friend_id)
    .bind(&body.friend_id).bind(&auth.0.id)
    .fetch_all(&mut *tx).await.map_err(database_error)?;

    if let Some((owner, _, auto_delete)) = relationships.iter().find(|(_, status, _)| status == "accepted") {
        if relationships.iter().filter(|(_, status, _)| status == "accepted").count() == 1 {
            let peer = if owner == &auth.0.id { &body.friend_id } else { &auth.0.id };
            sqlx::query(
                "INSERT INTO friends (user_id, friend_id, status, auto_delete) VALUES (?, ?, 'accepted', ?)
                 ON DUPLICATE KEY UPDATE auto_delete = VALUES(auto_delete), status = 'accepted'"
            )
            .bind(peer).bind(owner).bind(auto_delete)
            .execute(&mut *tx).await.map_err(database_error)?;
            tx.commit().await.map_err(database_error)?;
            notify_friendship_changed(&state, &auth.0.id, &body.friend_id);
        }
        return Ok(Json(serde_json::json!({ "ok": true, "already_friends": true })));
    }
    if relationships.iter().any(|(user_id, status, _)| user_id != &auth.0.id && status == "pending") {
        return Err((axum::http::StatusCode::CONFLICT, Json(serde_json::json!({ "error": "This user has already sent you a friend request" }))));
    }
    if relationships.iter().any(|(_, status, _)| status == "blocked") {
        return Err((axum::http::StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Unable to send friend request" }))));
    }

    sqlx::query(
        "INSERT INTO friends (user_id, friend_id, status, message) VALUES (?, ?, 'pending', ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message)"
    )
    .bind(&auth.0.id).bind(&body.friend_id).bind(&body.message)
    .execute(&mut *tx).await.map_err(database_error)?;
    tx.commit().await.map_err(database_error)?;

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
    let (mut tx, users_exist) = lock_friendship(&state.db, &auth.0.id, &body.friend_id).await?;
    let request_not_found = || (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Friend request not found or already processed" })));
    if !users_exist {
        return Err(request_not_found());
    }
    let result = sqlx::query(
        "UPDATE friends SET status = 'accepted'
         WHERE user_id = ? AND friend_id = ? AND status = 'pending'"
    )
    .bind(&body.friend_id).bind(&auth.0.id)
    .execute(&mut *tx).await.map_err(database_error)?;
    if result.rows_affected() == 0 {
        return Err(request_not_found());
    }

    sqlx::query(
        "INSERT INTO friends (user_id, friend_id, status)
         VALUES (?, ?, 'accepted') ON DUPLICATE KEY UPDATE status = 'accepted'"
    )
    .bind(&auth.0.id).bind(&body.friend_id)
    .execute(&mut *tx).await.map_err(database_error)?;
    tx.commit().await.map_err(database_error)?;
    notify_friendship_changed(&state, &auth.0.id, &body.friend_id);

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
    let (mut tx, _) = lock_friendship(&state.db, &auth.0.id, &friend_id).await?;
    let deleted = sqlx::query(
        "DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
    )
    .bind(&auth.0.id).bind(&friend_id).bind(&friend_id).bind(&auth.0.id)
    .execute(&mut *tx).await.map_err(database_error)?;
    tx.commit().await.map_err(database_error)?;
    if deleted.rows_affected() > 0 {
        notify_friendship_changed(&state, &auth.0.id, &friend_id);
    }
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
    sqlx::query(
        "UPDATE friends SET auto_delete = ?
         WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)"
    )
    .bind(body.auto_delete).bind(&auth.0.id).bind(&body.friend_id)
    .bind(&body.friend_id).bind(&auth.0.id)
    .execute(&state.db).await.map_err(database_error)?;
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
