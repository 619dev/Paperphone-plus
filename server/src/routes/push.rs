use std::sync::Arc;
use axum::{Router, routing::{get, post, delete}, extract::State, Json};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/subscribe", post(subscribe))
        .route("/unsubscribe", delete(unsubscribe))
        .route("/onesignal", post(register_onesignal))
        .route("/vapid-key", get(get_vapid_key))
        .route("/onesignal-app-id", get(get_onesignal_app_id))
        .route("/status", get(push_status))
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

async fn get_vapid_key(
    State(state): State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "vapid_public_key": state.config.vapid_public_key
    }))
}

/// Public endpoint to retrieve the OneSignal App ID for frontend SDK init
async fn get_onesignal_app_id(
    State(state): State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "onesignal_app_id": state.config.onesignal_app_id
    }))
}

/// Diagnostic endpoint to check push notification configuration status
async fn push_status(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Json<serde_json::Value> {
    // Count subscriptions for this user
    let web_push_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM push_subscriptions WHERE user_id = ?"
    ).bind(&auth.0.id).fetch_one(&state.db).await.unwrap_or((0,));

    let onesignal_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM onesignal_players WHERE user_id = ?"
    ).bind(&auth.0.id).fetch_one(&state.db).await.unwrap_or((0,));

    Json(serde_json::json!({
        "vapid_configured": state.config.vapid_public_key.is_some() && state.config.vapid_private_key.is_some(),
        "vapid_subject_configured": state.config.vapid_subject.is_some(),
        "onesignal_configured": state.config.onesignal_app_id.is_some() && state.config.onesignal_rest_key.is_some(),
        "cf_turn_configured": state.config.cf_calls_app_id.is_some() && state.config.cf_calls_app_secret.is_some(),
        "user_web_push_subscriptions": web_push_count.0,
        "user_onesignal_players": onesignal_count.0,
    }))
}
