use crate::config::Config;
use jsonwebtoken::{encode, EncodingKey, Header, Algorithm};
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// Cached APNS JWT token (valid for ~1 hour, Apple allows up to 1 hour)
static APNS_TOKEN_CACHE: std::sync::LazyLock<Mutex<Option<(String, u64)>>> =
    std::sync::LazyLock::new(|| Mutex::new(None));

/// Reusable HTTP/2 client for APNS requests.
/// APNs requires HTTP/2 — using a shared client also improves performance
/// by reusing connections.
static APNS_CLIENT: std::sync::LazyLock<reqwest::Client> =
    std::sync::LazyLock::new(|| {
        reqwest::Client::builder()
            .http2_prior_knowledge()
            .build()
            .expect("Failed to build APNS HTTP/2 client")
    });

/// Validate that a device token is a valid APNs token (64 hex characters).
pub fn is_valid_apns_token(token: &str) -> bool {
    token.len() == 64 && token.chars().all(|c| c.is_ascii_hexdigit())
}

#[derive(Serialize)]
struct ApnsClaims {
    iss: String, // Team ID
    iat: u64,
}

/// Generate or retrieve a cached APNS JWT token using the p8 private key.
fn get_apns_token(config: &Config) -> Option<String> {
    let (team_id, key_id, private_key_raw) = match (
        &config.apns_team_id,
        &config.apns_key_id,
        &config.apns_private_key,
    ) {
        (Some(tid), Some(kid), Some(pk)) => (tid.clone(), kid.clone(), pk.clone()),
        _ => return None,
    };

    // Normalize escaped newlines in PEM key (common in env vars)
    let private_key = private_key_raw.replace("\\n", "\n");

    // Check cache (refresh every 50 minutes, Apple allows up to 60 min)
    {
        if let Ok(cache) = APNS_TOKEN_CACHE.lock() {
            if let Some((token, created_at)) = cache.as_ref() {
                let now = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_secs();
                if now < *created_at + 3000 {
                    return Some(token.clone());
                }
            }
        }
    }

    let now = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_secs();
    let claims = ApnsClaims {
        iss: team_id,
        iat: now,
    };

    let mut header = Header::new(Algorithm::ES256);
    header.kid = Some(key_id);

    let key = EncodingKey::from_ec_pem(private_key.as_bytes()).ok()?;
    let jwt = encode(&header, &claims, &key).ok()?;

    // Cache the token
    if let Ok(mut cache) = APNS_TOKEN_CACHE.lock() {
        *cache = Some((jwt.clone(), now));
    }

    Some(jwt)
}

/// Result of sending a push to a single device token.
pub enum SendResult {
    Sent,
    StaleToken,
    Failed,
}

/// Send a push notification to a single APNS device token directly.
/// Returns the result so callers can handle stale tokens.
pub async fn send_push(config: &Config, device_token: &str, title: &str, body: &str) -> SendResult {
    let bundle_id = match &config.apns_bundle_id {
        Some(bid) => bid.clone(),
        None => return SendResult::Failed,
    };

    let token = match get_apns_token(config) {
        Some(t) => t,
        None => return SendResult::Failed,
    };

    let base_url = if config.apns_sandbox {
        "https://api.sandbox.push.apple.com"
    } else {
        "https://api.push.apple.com"
    };

    // Validate device token format
    let normalized_token = device_token.to_lowercase();
    if !is_valid_apns_token(&normalized_token) {
        tracing::warn!(
            "[APNS] ⚠️ Invalid device token (len={}, expected 64 hex): {}...",
            device_token.len(),
            &device_token[..20.min(device_token.len())]
        );
        return SendResult::StaleToken; // Treat as stale so it gets cleaned up
    }

    let client = &*APNS_CLIENT;
    let url = format!("{}/3/device/{}", base_url, normalized_token);

    let payload = serde_json::json!({
        "aps": {
            "alert": {
                "title": title,
                "body": body,
            },
            "sound": "default",
            "badge": 1,
        },
        "type": "message",
    });

    match client
        .post(&url)
        .bearer_auth(&token)
        .header("apns-topic", &bundle_id)
        .header("apns-push-type", "alert")
        .header("apns-priority", "10")
        .json(&payload)
        .send()
        .await
    {
        Ok(r) => {
            let status = r.status();
            let body_text = r.text().await.unwrap_or_default();
            if status.is_success() {
                SendResult::Sent
            } else if status.as_u16() == 410
                || body_text.contains("Unregistered")
                || body_text.contains("BadDeviceToken")
                || body_text.contains("ExpiredToken")
            {
                SendResult::StaleToken
            } else {
                tracing::warn!(
                    "[APNS] ❌ Push failed (HTTP {}): {}",
                    status, &body_text[..200.min(body_text.len())]
                );
                SendResult::Failed
            }
        }
        Err(e) => {
            tracing::error!("[APNS] ❌ Request error: {:?}", e);
            SendResult::Failed
        }
    }
}

/// Response from the push relay service.
#[derive(Deserialize)]
struct RelayResponse {
    #[allow(dead_code)]
    ok: bool,
    stale_tokens: Option<Vec<String>>,
}

/// Send push via the relay service (for self-hosted servers without APNS credentials).
async fn push_via_relay(db: &sqlx::MySqlPool, config: &Config, user_id: &str, device_tokens: &[(String,)], title: &str, body: &str) {
    let (relay_url, relay_key) = match (&config.apns_relay_url, &config.apns_relay_key) {
        (Some(url), Some(key)) => (url.clone(), key.clone()),
        _ => return,
    };

    let tokens: Vec<&str> = device_tokens.iter().map(|(t,)| t.as_str()).collect();

    let client = reqwest::Client::new();
    let url = format!("{}/api/push-relay/apns", relay_url.trim_end_matches('/'));

    match client
        .post(&url)
        .json(&serde_json::json!({
            "relay_key": relay_key,
            "tokens": tokens,
            "title": title,
            "body": body,
        }))
        .send()
        .await
    {
        Ok(r) => {
            let status = r.status();
            if status.is_success() {
                // Clean up stale tokens returned by relay
                if let Ok(resp) = r.json::<RelayResponse>().await {
                    if let Some(stale) = resp.stale_tokens {
                        for stale_token in &stale {
                            let _ = sqlx::query(
                                "DELETE FROM apns_tokens WHERE user_id = ? AND apns_token = ?"
                            )
                            .bind(user_id).bind(stale_token)
                            .execute(db).await;
                        }
                        if !stale.is_empty() {
                            tracing::info!("[APNS-Relay] Cleaned {} stale tokens for user {}", stale.len(), user_id);
                        }
                    }
                }
                tracing::debug!("[APNS-Relay] ✅ Push relayed for user {}", user_id);
            } else {
                let body_text = r.text().await.unwrap_or_default();
                tracing::warn!("[APNS-Relay] ❌ Relay failed (HTTP {}): {}", status, &body_text[..200.min(body_text.len())]);
            }
        }
        Err(e) => {
            tracing::error!("[APNS-Relay] ❌ Request error: {:?}", e);
        }
    }
}

/// Check if local APNS credentials are configured.
fn has_local_apns(config: &Config) -> bool {
    config.apns_team_id.is_some()
        && config.apns_key_id.is_some()
        && config.apns_private_key.is_some()
        && config.apns_bundle_id.is_some()
}

/// Check if APNS relay is configured.
fn has_relay(config: &Config) -> bool {
    config.apns_relay_url.is_some() && config.apns_relay_key.is_some()
}

/// Send push notification to a user via APNS.
///
/// Strategy:
/// 1. If local APNS credentials are configured → send directly to Apple
/// 2. Else if relay URL is configured → forward to push relay
/// 3. Else → skip silently
pub async fn push_to_user(db: &sqlx::MySqlPool, config: &Config, user_id: &str, title: &str, body: &str) {
    if !has_local_apns(config) && !has_relay(config) {
        return;
    }

    let tokens: Vec<(String,)> = sqlx::query_as(
        "SELECT apns_token FROM apns_tokens WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_all(db).await.unwrap_or_default();

    if tokens.is_empty() { return; }

    // Strategy 1: Direct APNS
    if has_local_apns(config) {
        for (device_token,) in &tokens {
            match send_push(config, device_token, title, body).await {
                SendResult::Sent => {
                    tracing::debug!("[APNS] ✅ Push sent to user {}", user_id);
                }
                SendResult::StaleToken => {
                    tracing::info!("[APNS] Removing stale token for user {}", user_id);
                    let _ = sqlx::query(
                        "DELETE FROM apns_tokens WHERE user_id = ? AND apns_token = ?"
                    )
                    .bind(user_id).bind(device_token)
                    .execute(db).await;
                }
                SendResult::Failed => {}
            }
        }
        return;
    }

    // Strategy 2: Via relay
    push_via_relay(db, config, user_id, &tokens, title, body).await;
}
