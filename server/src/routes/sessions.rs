use std::sync::Arc;
use axum::{Router, routing::{get, delete}, extract::{State, Path}, Json};

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_sessions))
        .route("/{id}", delete(revoke_session))
}

async fn list_sessions(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let rows: Vec<(String, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, chrono::NaiveDateTime, chrono::NaiveDateTime, i8)> = sqlx::query_as(
        "SELECT id, device_name, device_type, os, browser, ip_address, last_active, created_at, revoked
         FROM sessions WHERE user_id = ? AND revoked = 0 ORDER BY last_active DESC"
    )
    .bind(&auth.0.id)
    .fetch_all(&state.db).await.unwrap_or_default();

    let sessions: Vec<serde_json::Value> = rows.iter().map(|(id, device, dtype, os, browser, ip, last_active, created, _revoked)| {
        serde_json::json!({
            "id": id, "device_name": device, "device_type": dtype,
            "os": os, "browser": browser, "ip_address": ip,
            "last_active": last_active.and_utc().timestamp_millis(),
            "created_at": created.and_utc().timestamp_millis(),
            "is_current": auth.0.session_id.as_deref() == Some(id.as_str()),
        })
    }).collect();

    Ok(Json(serde_json::json!(sessions)))
}

async fn revoke_session(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(session_id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("UPDATE sessions SET revoked = 1 WHERE id = ? AND user_id = ?")
        .bind(&session_id).bind(&auth.0.id)
        .execute(&state.db).await.ok();

    // Notify WS to disconnect
    state.ws_clients.revoke_session(&auth.0.id, &session_id);

    Ok(Json(serde_json::json!({ "ok": true })))
}
