use std::sync::Arc;
use axum::{Router, routing::{get, post}, extract::State, Json};
use sha2::{Sha256, Digest};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/status", get(push_status))
        .route("/bark", get(get_bark).post(register_bark).delete(delete_bark))
        .route("/bark/test", post(test_bark))
        .route("/fcm", post(register_fcm))
        .route("/ntfy", post(register_ntfy))
        .route("/ntfy-topic", get(get_ntfy_topic))
        .route("/apns", post(register_apns))
}

/// Diagnostic endpoint to check push notification configuration status
async fn push_status(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Json<serde_json::Value> {
    let fcm_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM fcm_tokens WHERE user_id = ?"
    ).bind(&auth.0.id).fetch_one(&state.db).await.unwrap_or((0,));

    let ntfy_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM ntfy_subscriptions WHERE user_id = ?"
    ).bind(&auth.0.id).fetch_one(&state.db).await.unwrap_or((0,));

    let apns_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM apns_tokens WHERE user_id = ?"
    ).bind(&auth.0.id).fetch_one(&state.db).await.unwrap_or((0,));

    Json(serde_json::json!({
        "livekit_calling_configured": state.config.livekit_url.is_some()
            && state.config.livekit_api_key.is_some()
            && state.config.livekit_api_secret.is_some(),
        "fcm_configured": state.config.fcm_project_id.is_some() && state.config.fcm_client_email.is_some() && state.config.fcm_private_key.is_some(),
        "fcm_relay_configured": state.config.fcm_relay_url.is_some() && state.config.fcm_relay_key.is_some(),
        "apns_configured": state.config.apns_team_id.is_some() && state.config.apns_key_id.is_some() && state.config.apns_private_key.is_some(),
        "apns_relay_configured": state.config.apns_relay_url.is_some() && state.config.apns_relay_key.is_some(),
        "ntfy_configured": true,
        "ntfy_base_url": &state.config.ntfy_base_url,
        "user_fcm_tokens": fcm_count.0,
        "user_ntfy_subscriptions": ntfy_count.0,
        "user_apns_tokens": apns_count.0,
    }))
}

#[derive(Deserialize)]
struct FcmReq {
    fcm_token: String,
    platform: Option<String>,
}

async fn register_fcm(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<FcmReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query(
        "INSERT INTO fcm_tokens (user_id, fcm_token, platform) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE platform = VALUES(platform), updated_at = NOW()"
    )
    .bind(&auth.0.id).bind(&body.fcm_token).bind(&body.platform)
    .execute(&state.db).await.ok();

    tracing::info!("[FCM] Token registered for user {}: {}...", &auth.0.id, &body.fcm_token[..20.min(body.fcm_token.len())]);
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct NtfyReq {
    ntfy_topic: String,
    platform: Option<String>,
}

/// Register an ntfy topic for push notifications.
/// The client subscribes to this topic in the ntfy mobile app.
async fn register_ntfy(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<NtfyReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query(
        "INSERT INTO ntfy_subscriptions (user_id, ntfy_topic, platform) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE platform = VALUES(platform)"
    )
    .bind(&auth.0.id).bind(&body.ntfy_topic).bind(&body.platform)
    .execute(&state.db).await.ok();

    tracing::info!("[ntfy] Topic registered for user {}: {}", &auth.0.id, &body.ntfy_topic);
    Ok(Json(serde_json::json!({ "ok": true })))
}

/// Generate and return a unique ntfy topic for the authenticated user.
/// Topic format: pp-{first 16 chars of SHA256(user_id)}
async fn get_ntfy_topic(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Json<serde_json::Value> {
    let topic = generate_ntfy_topic(&auth.0.id);
    Json(serde_json::json!({
        "ntfy_topic": topic,
        "ntfy_url": format!("{}/{}", state.config.ntfy_base_url.trim_end_matches('/'), topic),
    }))
}

/// Generate a deterministic ntfy topic from a user_id.
fn generate_ntfy_topic(user_id: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(user_id.as_bytes());
    let hash = hasher.finalize();
    format!("pp-{}", hex::encode(&hash[..8]))
}

#[derive(Deserialize)]
struct ApnsReq {
    apns_token: String,
    platform: Option<String>,
}

/// Register an iOS APNS device token for push notifications.
async fn register_apns(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<ApnsReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    // Normalize: lowercase, strip non-hex characters
    let normalized: String = body.apns_token.chars()
        .filter(|c| c.is_ascii_hexdigit())
        .collect::<String>()
        .to_lowercase();

    // Validate: APNs device tokens must be exactly 64 hex characters (32 bytes)
    if normalized.len() != 64 {
        tracing::warn!(
            "[APNS] ⚠️ Rejected invalid token from user {} (len={}, expected 64): {}...",
            &auth.0.id, normalized.len(), &normalized[..20.min(normalized.len())]
        );
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Invalid APNS token: must be 64 hex characters" })),
        ));
    }

    sqlx::query(
        "INSERT INTO apns_tokens (user_id, apns_token, platform) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE platform = VALUES(platform), updated_at = NOW()"
    )
    .bind(&auth.0.id).bind(&normalized).bind(&body.platform)
    .execute(&state.db).await.ok();

    tracing::info!("[APNS] Token registered for user {}: {}...", &auth.0.id, &normalized[..20]);
    Ok(Json(serde_json::json!({ "ok": true })))
}

type ApiError = (axum::http::StatusCode, Json<serde_json::Value>);

fn api_error(status: axum::http::StatusCode, message: impl Into<String>) -> ApiError {
    (status, Json(serde_json::json!({ "error": message.into() })))
}

#[derive(Deserialize)]
struct BarkReq { endpoint: String, platform: Option<String> }

#[derive(Deserialize)]
struct BarkTestReq { endpoint: Option<String> }

async fn get_bark(State(state): State<Arc<AppState>>, auth: AuthUser) -> Result<Json<serde_json::Value>, ApiError> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT endpoint FROM bark_subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1"
    ).bind(&auth.0.id).fetch_optional(&state.db).await
        .map_err(|e| api_error(axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(match row {
        Some((endpoint,)) => serde_json::json!({ "configured": true, "endpoint_hint": crate::services::bark::endpoint_hint(&endpoint) }),
        None => serde_json::json!({ "configured": false }),
    }))
}

async fn register_bark(State(state): State<Arc<AppState>>, auth: AuthUser, Json(body): Json<BarkReq>)
    -> Result<Json<serde_json::Value>, ApiError>
{
    let endpoint = crate::services::bark::validate_endpoint(&state.config, body.endpoint.trim())
        .map_err(|e| api_error(axum::http::StatusCode::BAD_REQUEST, e))?.to_string().trim_end_matches('/').to_string();
    sqlx::query("INSERT INTO bark_subscriptions (user_id, endpoint, platform) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE endpoint = VALUES(endpoint), platform = VALUES(platform), updated_at = NOW()")
        .bind(&auth.0.id).bind(endpoint).bind(body.platform.as_deref().unwrap_or("ios"))
        .execute(&state.db).await.map_err(|e| api_error(axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn test_bark(State(state): State<Arc<AppState>>, auth: AuthUser, Json(body): Json<BarkTestReq>)
    -> Result<Json<serde_json::Value>, ApiError>
{
    let endpoint = if let Some(value) = body.endpoint {
        crate::services::bark::validate_endpoint(&state.config, value.trim())
            .map_err(|e| api_error(axum::http::StatusCode::BAD_REQUEST, e))?.to_string()
    } else {
        sqlx::query_as::<_, (String,)>("SELECT endpoint FROM bark_subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1")
            .bind(&auth.0.id).fetch_optional(&state.db).await
            .map_err(|e| api_error(axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .map(|row| row.0).ok_or_else(|| api_error(axum::http::StatusCode::NOT_FOUND, "Bark is not configured"))?
    };
    crate::services::bark::validate_endpoint(&state.config, &endpoint)
        .map_err(|e| api_error(axum::http::StatusCode::BAD_REQUEST, e))?;
    crate::services::bark::send(&endpoint, "PaperPhonePlus", "Bark notifications are ready")
        .await.map_err(|e| api_error(axum::http::StatusCode::BAD_GATEWAY, e))?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn delete_bark(State(state): State<Arc<AppState>>, auth: AuthUser) -> Result<Json<serde_json::Value>, ApiError> {
    sqlx::query("DELETE FROM bark_subscriptions WHERE user_id = ?")
        .bind(&auth.0.id).execute(&state.db).await
        .map_err(|e| api_error(axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
