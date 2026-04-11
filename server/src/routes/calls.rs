use std::sync::Arc;
use axum::{Router, routing::post, extract::State, Json};

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/turn-credentials", post(get_turn_credentials))
}

async fn get_turn_credentials(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let (app_id, app_secret) = match (&state.config.cf_calls_app_id, &state.config.cf_calls_app_secret) {
        (Some(id), Some(secret)) => (id.clone(), secret.clone()),
        _ => {
            // Return STUN-only config
            return Ok(Json(serde_json::json!({
                "iceServers": [
                    { "urls": "stun:stun.l.google.com:19302" },
                    { "urls": "stun:stun.cloudflare.com:3478" }
                ]
            })));
        }
    };

    // Request TURN credentials from Cloudflare
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("https://rtc.live.cloudflare.com/v1/turn/keys/{}/credentials/generate", app_id))
        .bearer_auth(&app_secret)
        .json(&serde_json::json!({ "ttl": 86400 }))
        .send()
        .await;

    match resp {
        Ok(r) if r.status().is_success() => {
            let body: serde_json::Value = r.json().await.unwrap_or_default();
            let ice_servers = body.get("iceServers").cloned().unwrap_or(serde_json::json!([]));
            Ok(Json(serde_json::json!({ "iceServers": ice_servers })))
        }
        _ => {
            // Fallback to STUN
            Ok(Json(serde_json::json!({
                "iceServers": [
                    { "urls": "stun:stun.l.google.com:19302" },
                    { "urls": "stun:stun.cloudflare.com:3478" }
                ]
            })))
        }
    }
}
