use std::sync::Arc;
use axum::{Router, routing::{get, delete}, extract::{State, Path, Query}, Json};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/private/:user_id", get(get_private_messages))
        .route("/group/:group_id", get(get_group_messages))
        .route("/expired", delete(delete_expired))
}

#[derive(Deserialize)]
struct PaginationQuery {
    limit: Option<i64>,
    before: Option<String>,
}

async fn get_private_messages(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(user_id): Path<String>,
    Query(params): Query<PaginationQuery>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let limit = params.limit.unwrap_or(50).min(200);

    let rows: Vec<(String, String, String, String, Option<String>, Option<String>, Option<String>, String, chrono::NaiveDateTime, Option<chrono::NaiveDateTime>)> = if let Some(before) = &params.before {
        sqlx::query_as(
            "SELECT id, from_id, to_id, ciphertext, header, self_ciphertext, self_header, msg_type, created_at, read_at
             FROM (
               SELECT * FROM messages
               WHERE type = 'private'
                 AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))
                 AND created_at < ?
               ORDER BY created_at DESC
               LIMIT ?
             ) sub ORDER BY created_at ASC"
        )
        .bind(&auth.0.id).bind(&user_id).bind(&user_id).bind(&auth.0.id)
        .bind(before).bind(limit)
        .fetch_all(&state.db).await.unwrap_or_default()
    } else {
        sqlx::query_as(
            "SELECT id, from_id, to_id, ciphertext, header, self_ciphertext, self_header, msg_type, created_at, read_at
             FROM (
               SELECT * FROM messages
               WHERE type = 'private'
                 AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))
               ORDER BY created_at DESC
               LIMIT ?
             ) sub ORDER BY created_at ASC"
        )
        .bind(&auth.0.id).bind(&user_id).bind(&user_id).bind(&auth.0.id)
        .bind(limit)
        .fetch_all(&state.db).await.unwrap_or_default()
    };

    let messages: Vec<serde_json::Value> = rows.iter().map(|(id, from_id, to_id, ct, hdr, self_ct, self_hdr, msg_type, created, read_at)| {
        serde_json::json!({
            "id": id, "from": from_id, "to": to_id,
            "ciphertext": ct, "header": hdr,
            "self_ciphertext": self_ct, "self_header": self_hdr,
            "msg_type": msg_type,
            "ts": created.and_utc().timestamp_millis(),
            "read_at": read_at.map(|r| r.and_utc().timestamp_millis()),
        })
    }).collect();

    Ok(Json(serde_json::json!(messages)))
}

async fn get_group_messages(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(group_id): Path<String>,
    Query(params): Query<PaginationQuery>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let limit = params.limit.unwrap_or(50).min(200);

    let rows: Vec<(String, String, String, Option<String>, String, chrono::NaiveDateTime, String, Option<String>)> = if let Some(before) = &params.before {
        sqlx::query_as(
            "SELECT m.id, m.from_id, m.ciphertext, m.header, m.msg_type, m.created_at, u.nickname, u.avatar
             FROM (
               SELECT * FROM messages
               WHERE type = 'group' AND to_id = ? AND created_at < ?
               ORDER BY created_at DESC LIMIT ?
             ) m LEFT JOIN users u ON u.id = m.from_id
             ORDER BY m.created_at ASC"
        )
        .bind(&group_id).bind(before).bind(limit)
        .fetch_all(&state.db).await.unwrap_or_default()
    } else {
        sqlx::query_as(
            "SELECT m.id, m.from_id, m.ciphertext, m.header, m.msg_type, m.created_at, u.nickname, u.avatar
             FROM (
               SELECT * FROM messages
               WHERE type = 'group' AND to_id = ?
               ORDER BY created_at DESC LIMIT ?
             ) m LEFT JOIN users u ON u.id = m.from_id
             ORDER BY m.created_at ASC"
        )
        .bind(&group_id).bind(limit)
        .fetch_all(&state.db).await.unwrap_or_default()
    };

    let messages: Vec<serde_json::Value> = rows.iter().map(|(id, from_id, ct, hdr, msg_type, created, nickname, avatar)| {
        serde_json::json!({
            "id": id, "from": from_id,
            "from_nickname": nickname, "from_avatar": avatar,
            "ciphertext": ct, "header": hdr,
            "msg_type": msg_type,
            "ts": created.and_utc().timestamp_millis(),
        })
    }).collect();

    Ok(Json(serde_json::json!(messages)))
}

async fn delete_expired(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    // Delete expired private messages based on auto_delete settings
    sqlx::query(
        "DELETE m FROM messages m
         JOIN friends f ON (f.user_id = m.from_id AND f.friend_id = m.to_id)
         WHERE m.type = 'private' AND f.auto_delete > 0
           AND m.created_at < DATE_SUB(NOW(), INTERVAL f.auto_delete SECOND)"
    )
    .execute(&state.db).await.ok();

    // Delete expired group messages
    sqlx::query(
        "DELETE m FROM messages m
         JOIN `groups` g ON g.id = m.to_id
         WHERE m.type = 'group' AND g.auto_delete > 0
           AND m.created_at < DATE_SUB(NOW(), INTERVAL g.auto_delete SECOND)"
    )
    .execute(&state.db).await.ok();

    Ok(Json(serde_json::json!({ "ok": true })))
}
