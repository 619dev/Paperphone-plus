use crate::config::Config;

/// Send push notification via OneSignal REST API
pub async fn push_to_user(db: &sqlx::MySqlPool, config: &Config, user_id: &str, title: &str, body: &str) {
    let (app_id, rest_key) = match (&config.onesignal_app_id, &config.onesignal_rest_key) {
        (Some(aid), Some(rk)) => (aid.clone(), rk.clone()),
        _ => return,
    };

    let players: Vec<(String,)> = sqlx::query_as(
        "SELECT player_id FROM onesignal_players WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_all(db).await.unwrap_or_default();

    if players.is_empty() { return; }

    let player_ids: Vec<String> = players.into_iter().map(|(pid,)| pid).collect();

    let client = reqwest::Client::new();
    let _ = client
        .post("https://onesignal.com/api/v1/notifications")
        .header("Authorization", format!("Basic {}", rest_key))
        .json(&serde_json::json!({
            "app_id": app_id,
            "include_player_ids": player_ids,
            "headings": { "en": title },
            "contents": { "en": body },
        }))
        .send()
        .await;
}
