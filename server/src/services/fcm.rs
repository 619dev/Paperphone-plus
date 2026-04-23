use crate::config::Config;
use jsonwebtoken::{encode, EncodingKey, Header, Algorithm};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// Cached OAuth2 access token for FCM
static FCM_TOKEN_CACHE: std::sync::LazyLock<Mutex<Option<(String, u64)>>> =
    std::sync::LazyLock::new(|| Mutex::new(None));

#[derive(Serialize)]
struct JwtClaims {
    iss: String,
    scope: String,
    aud: String,
    iat: u64,
    exp: u64,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
}

/// Get a valid OAuth2 access token for FCM, using cache when possible.
async fn get_access_token(config: &Config) -> Option<String> {
    let (client_email, private_key_raw) = match (&config.fcm_client_email, &config.fcm_private_key) {
        (Some(email), Some(key)) => (email.clone(), key.clone()),
        _ => return None,
    };

    // Normalize escaped newlines in PEM key (common in env vars)
    let private_key = private_key_raw.replace("\\n", "\n");

    // Check cache
    {
        let cache = FCM_TOKEN_CACHE.lock().ok()?;
        if let Some((token, expires_at)) = cache.as_ref() {
            let now = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_secs();
            if now < *expires_at - 60 {
                return Some(token.clone());
            }
        }
    }

    // Generate JWT
    let now = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_secs();
    let claims = JwtClaims {
        iss: client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging".to_string(),
        aud: "https://oauth2.googleapis.com/token".to_string(),
        iat: now,
        exp: now + 3600,
    };

    let header = Header::new(Algorithm::RS256);
    let key = EncodingKey::from_rsa_pem(private_key.as_bytes()).ok()?;
    let jwt = encode(&header, &claims, &key).ok()?;

    // Exchange JWT for access token
    let client = reqwest::Client::new();
    let resp = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
            ("assertion", &jwt),
        ])
        .send()
        .await
        .ok()?;

    let token_resp: TokenResponse = resp.json().await.ok()?;
    let expires_at = now + token_resp.expires_in;

    // Cache the token
    if let Ok(mut cache) = FCM_TOKEN_CACHE.lock() {
        *cache = Some((token_resp.access_token.clone(), expires_at));
    }

    Some(token_resp.access_token)
}

/// Send push notification to a user via Firebase Cloud Messaging (HTTP v1 API)
pub async fn push_to_user(db: &sqlx::MySqlPool, config: &Config, user_id: &str, title: &str, body: &str) {
    let project_id = match &config.fcm_project_id {
        Some(pid) => pid.clone(),
        None => return,
    };

    let access_token = match get_access_token(config).await {
        Some(t) => t,
        None => {
            tracing::debug!("[FCM] No access token available (credentials not configured)");
            return;
        }
    };

    let tokens: Vec<(String,)> = sqlx::query_as(
        "SELECT fcm_token FROM fcm_tokens WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_all(db).await.unwrap_or_default();

    if tokens.is_empty() { return; }

    let client = reqwest::Client::new();
    let url = format!(
        "https://fcm.googleapis.com/v1/projects/{}/messages:send",
        project_id
    );

    for (token,) in &tokens {
        let payload = serde_json::json!({
            "message": {
                "token": token,
                "notification": {
                    "title": title,
                    "body": body,
                },
                "android": {
                    "priority": "high",
                    "notification": {
                        "sound": "default",
                        "channel_id": "paperphone_messages",
                    }
                },
                "data": {
                    "type": "message",
                    "click_action": "FLUTTER_NOTIFICATION_CLICK",
                }
            }
        });

        match client
            .post(&url)
            .bearer_auth(&access_token)
            .json(&payload)
            .send()
            .await
        {
            Ok(r) => {
                let status = r.status();
                let body_text = r.text().await.unwrap_or_default();
                if status.is_success() {
                    tracing::debug!("[FCM] ✅ Push sent to user {}", user_id);
                } else if status.as_u16() == 404 || body_text.contains("NOT_FOUND") || body_text.contains("UNREGISTERED") {
                    // Token is stale — remove it
                    tracing::info!("[FCM] Removing stale token for user {}", user_id);
                    let _ = sqlx::query(
                        "DELETE FROM fcm_tokens WHERE user_id = ? AND fcm_token = ?"
                    )
                    .bind(user_id).bind(token)
                    .execute(db).await;
                } else {
                    tracing::warn!("[FCM] ❌ Push failed for user {} (HTTP {}): {}", user_id, status, &body_text[..200.min(body_text.len())]);
                }
            }
            Err(e) => {
                tracing::error!("[FCM] ❌ Request error for user {}: {:?}", user_id, e);
            }
        }
    }
}
