use std::sync::Arc;
use axum::{Router, routing::{post, delete}, extract::State, Json};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/subscribe", post(subscribe))
        .route("/unsubscribe", delete(unsubscribe))
        .route("/onesignal", post(register_onesignal))
}

#[derive(Deserialize)]
struct SubscribeReq {
    endpoint: String,
    keys: PushKeys,
}

#[derive(Deserialize)]
struct PushKeys {
    p256dh: String,
    auth: String,
}

async fn subscribe(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<SubscribeReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query(
        "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)"
    )
    .bind(&auth.0.id).bind(&body.endpoint).bind(&body.keys.p256dh).bind(&body.keys.auth)
    .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct UnsubscribeReq {
    endpoint: String,
}

async fn unsubscribe(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<UnsubscribeReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?")
        .bind(&auth.0.id).bind(&body.endpoint)
        .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct OneSignalReq {
    player_id: String,
    platform: Option<String>,
}

async fn register_onesignal(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<OneSignalReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query(
        "INSERT INTO onesignal_players (user_id, player_id, platform) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform)"
    )
    .bind(&auth.0.id).bind(&body.player_id).bind(&body.platform)
    .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}
