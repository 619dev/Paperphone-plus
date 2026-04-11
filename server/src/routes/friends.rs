use std::sync::Arc;
use axum::{Router, routing::{get, post, delete}, extract::{State, Path}, Json};
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
}

async fn list_friends(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let rows: Vec<(String, String, String, Option<String>, i8, i32)> = sqlx::query_as(
        "SELECT u.id, u.username, u.nickname, u.avatar, u.is_online, f.auto_delete
         FROM friends f JOIN users u ON u.id = f.friend_id
         WHERE f.user_id = ? AND f.status = 'accepted'
         ORDER BY u.nickname"
    )
    .bind(&auth.0.id)
    .fetch_all(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let friends: Vec<serde_json::Value> = rows.iter().map(|(id, username, nickname, avatar, online, auto_del)| {
        serde_json::json!({
            "id": id, "username": username, "nickname": nickname,
            "avatar": avatar, "is_online": *online == 1, "auto_delete": auto_del
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

    sqlx::query(
        "INSERT INTO friends (user_id, friend_id, status, message) VALUES (?, ?, 'pending', ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), message = VALUES(message)"
    )
    .bind(&auth.0.id).bind(&body.friend_id).bind(&body.message)
    .execute(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

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
    // Update existing request
    sqlx::query("UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ? AND status = 'pending'")
        .bind(&body.friend_id).bind(&auth.0.id)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    // Create reverse friendship
    sqlx::query("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted') ON DUPLICATE KEY UPDATE status = 'accepted'")
        .bind(&auth.0.id).bind(&body.friend_id)
        .execute(&state.db).await.ok();

    // Notify
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
