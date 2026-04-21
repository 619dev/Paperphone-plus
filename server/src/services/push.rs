use web_push::WebPushClient;
use crate::config::Config;

/// Send Web Push notification to a user via VAPID
pub async fn push_to_user(db: &sqlx::MySqlPool, config: &Config, user_id: &str, title: &str, body: &str) {
    let (private_key, subject) = match (&config.vapid_private_key, &config.vapid_subject) {
        (Some(priv_k), Some(subj)) => (priv_k.clone(), subj.clone()),
        _ => {
            // VAPID not configured — skip silently
            return;
        }
    };

    let subs: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?"
    )
    .bind(user_id)
    .fetch_all(db).await.unwrap_or_default();

    if subs.is_empty() { return; }

    let payload = serde_json::json!({
        "title": title,
        "body": body,
        "data": { "type": "message" }
    });
    let payload_str = serde_json::to_string(&payload).unwrap_or_default();

    for (endpoint, p256dh, auth) in &subs {
        let sub = web_push::SubscriptionInfo {
            endpoint: endpoint.clone(),
            keys: web_push::SubscriptionKeys {
                p256dh: p256dh.clone(),
                auth: auth.clone(),
            },
        };

        let signature = match web_push::VapidSignatureBuilder::from_base64(
            &private_key,
            web_push::URL_SAFE_NO_PAD,
            &sub,
        ) {
            Ok(mut b) => {
                // Set the subject (mailto: contact) — required by push services
                b.add_claim("sub", &*subject);
                match b.build() {
                    Ok(sig) => sig,
                    Err(e) => {
                        tracing::warn!("[Push] VAPID signature build failed for {}: {:?}", &endpoint[..60.min(endpoint.len())], e);
                        continue;
                    }
                }
            }
            Err(e) => {
                tracing::warn!("[Push] VapidSignatureBuilder failed: {:?}", e);
                continue;
            }
        };

        let mut builder = web_push::WebPushMessageBuilder::new(&sub);
        builder.set_payload(web_push::ContentEncoding::Aes128Gcm, payload_str.as_bytes());
        builder.set_vapid_signature(signature);

        if let Ok(message) = builder.build() {
            if let Ok(client) = web_push::IsahcWebPushClient::new() {
                match client.send(message).await {
                    Ok(_) => tracing::debug!("[Push] Notification sent to user {}", user_id),
                    Err(ref e) if matches!(e, web_push::WebPushError::EndpointNotValid | web_push::WebPushError::EndpointNotFound) => {
                        tracing::info!("[Push] Removing stale subscription for user {}: {:?}", user_id, e);
                        let _ = sqlx::query(
                            "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?"
                        )
                        .bind(user_id)
                        .bind(endpoint)
                        .execute(db).await;
                    }
                    Err(e) => tracing::warn!("[Push] Send failed for user {}: {:?}", user_id, e),
                }
            }
        }
    }
}
