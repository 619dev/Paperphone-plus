use crate::config::Config;

/// Send push notification via OneSignal REST API
pub async fn push_to_user(db: &sqlx::MySqlPool, config: &Config, user_id: &str, title: &str, body: &str) {
    let (app_id, rest_key) = match (&config.onesignal_app_id, &config.onesignal_rest_key) {
        (Some(aid), Some(rk)) => (aid.clone(), rk.clone()),
        _ => {
            // OneSignal not configured
            return;
        }
    };

    let players: Vec<(String,)> = sqlx::query_as(
        "SELECT player_id FROM onesignal_players WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_all(db).await.unwrap_or_default();

    if players.is_empty() {
        tracing::debug!("[OneSignal] No players registered for user {}", user_id);
        return;
    }

    let player_ids: Vec<String> = players.into_iter().map(|(pid,)| pid).collect();
    tracing::info!("[OneSignal] Sending push to user {} ({} devices)", user_id, player_ids.len());

    let client = reqwest::Client::new();
    let resp = client
        .post("https://onesignal.com/api/v1/notifications")
        .header("Authorization", format!("Basic {}", rest_key))
        .json(&serde_json::json!({
            "app_id": app_id,
            "include_subscription_ids": player_ids,
            "headings": { "en": title },
            "contents": { "en": body },
            "priority": 10,
            "ttl": 86400,
        }))
        .send()
        .await;

    match resp {
        Ok(r) => {
            let status = r.status();
            let body_text = r.text().await.unwrap_or_default();
            if status.is_success() {
                tracing::info!("[OneSignal] ✅ Push sent to user {}: {}", user_id, &body_text[..100.min(body_text.len())]);
            } else {
                tracing::warn!("[OneSignal] ❌ Push failed for user {} (HTTP {}): {}", user_id, status, &body_text[..200.min(body_text.len())]);
            }
        }
        Err(e) => {
            tracing::error!("[OneSignal] ❌ Request error for user {}: {:?}", user_id, e);
        }
    }
}
