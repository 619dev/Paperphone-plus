use std::sync::Arc;
use axum::{Router, routing::get, extract::State, Json};

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/turn-credentials", get(get_turn_credentials))
}

async fn get_turn_credentials(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {

    // ── Strategy 1: Cloudflare TURN (premium, if configured) ──
    if let (Some(app_id), Some(app_secret)) = (&state.config.cf_calls_app_id, &state.config.cf_calls_app_secret) {
        if !app_id.is_empty() && !app_secret.is_empty() {
            let client = reqwest::Client::new();
            let resp = client
                .post(format!("https://rtc.live.cloudflare.com/v1/turn/keys/{}/credentials/generate", app_id))
                .bearer_auth(app_secret)
                .json(&serde_json::json!({ "ttl": 86400 }))
                .send()
                .await;

            match resp {
                Ok(r) if r.status().is_success() => {
                    let body: serde_json::Value = r.json().await.unwrap_or_default();
                    let ice_servers = body.get("iceServers").cloned().unwrap_or_default();
                    if ice_servers.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
                        tracing::info!("[TURN] ✅ Cloudflare TURN credentials OK");
                        return Ok(Json(serde_json::json!({ "iceServers": ice_servers })));
                    }
                }
                Ok(r) => {
                    let status = r.status();
                    let body = r.text().await.unwrap_or_default();
                    tracing::warn!("[TURN] Cloudflare API error ({}): {}", status, &body[..200.min(body.len())]);
                }
                Err(e) => {
                    tracing::warn!("[TURN] Cloudflare API request failed: {:?}", e);
                }
            }
        }
    }

    // ── Strategy 2: Metered.ca TURN (free tier, if API key configured) ──
    if let Some(api_key) = &state.config.metered_turn_api_key {
        if !api_key.is_empty() {
            let client = reqwest::Client::new();
            let resp = client
                .get(format!("https://paperphone.metered.live/api/v1/turn/credentials?apiKey={}", api_key))
                .send()
                .await;

            match resp {
                Ok(r) if r.status().is_success() => {
                    let ice_servers: serde_json::Value = r.json().await.unwrap_or_default();
                    if ice_servers.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
                        tracing::info!("[TURN] ✅ Metered.ca TURN credentials OK");
                        return Ok(Json(serde_json::json!({ "iceServers": ice_servers })));
                    }
                }
                _ => {
                    tracing::warn!("[TURN] Metered.ca API failed");
                }
            }
        }
    }

    // ── Strategy 3: Static free TURN servers (always available fallback) ──
    tracing::info!("[TURN] Using static free TURN servers");
    Ok(Json(serde_json::json!({
        "iceServers": [
            { "urls": "stun:stun.l.google.com:19302" },
            { "urls": "stun:stun.cloudflare.com:3478" },
            {
                "urls": [
                    "turn:openrelay.metered.ca:80",
                    "turn:openrelay.metered.ca:443",
                    "turn:openrelay.metered.ca:443?transport=tcp"
                ],
                "username": "openrelayproject",
                "credential": "openrelayproject"
            }
        ]
    })))
}
