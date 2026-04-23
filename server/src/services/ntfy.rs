use crate::config::Config;

/// Send push notification to a user via ntfy (https://ntfy.sh)
///
/// ntfy is used as a fallback push channel for Chinese Android devices
/// where FCM (Google Cloud Messaging) is unavailable due to lack of GMS.
/// Each user subscribes to a unique ntfy topic from the ntfy mobile app.
pub async fn push_to_user(db: &sqlx::MySqlPool, config: &Config, user_id: &str, title: &str, body: &str) {
    let base_url = &config.ntfy_base_url;

    let subs: Vec<(String,)> = sqlx::query_as(
        "SELECT ntfy_topic FROM ntfy_subscriptions WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_all(db).await.unwrap_or_default();

    if subs.is_empty() { return; }

    let client = reqwest::Client::new();

    for (topic,) in &subs {
        let url = format!("{}/{}", base_url.trim_end_matches('/'), topic);

        let mut req = client
            .post(&url)
            .header("Title", title)
            .header("Priority", "high")
            .header("Tags", "speech_balloon")
            .body(body.to_string());

        // Attach bearer token if configured (for authenticated ntfy servers)
        if let Some(ref token) = config.ntfy_token {
            req = req.bearer_auth(token);
        }

        match req.send().await {
            Ok(r) => {
                let status = r.status();
                if status.is_success() {
                    tracing::debug!("[ntfy] ✅ Push sent to user {} (topic: {})", user_id, topic);
                } else {
                    let body_text = r.text().await.unwrap_or_default();
                    if status.as_u16() == 404 {
                        // Topic not found — subscription is invalid, remove it
                        tracing::info!("[ntfy] Removing invalid subscription for user {} (topic: {})", user_id, topic);
                        let _ = sqlx::query(
                            "DELETE FROM ntfy_subscriptions WHERE user_id = ? AND ntfy_topic = ?"
                        )
                        .bind(user_id).bind(topic)
                        .execute(db).await;
                    } else {
                        tracing::warn!("[ntfy] ❌ Push failed for user {} (HTTP {}): {}", user_id, status, &body_text[..200.min(body_text.len())]);
                    }
                }
            }
            Err(e) => {
                tracing::error!("[ntfy] ❌ Request error for user {}: {:?}", user_id, e);
            }
        }
    }
}
