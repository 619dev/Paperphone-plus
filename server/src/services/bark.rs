use std::time::Duration;
use serde::Serialize;
use crate::config::Config;

#[derive(Serialize)]
struct BarkPayload<'a> {
    title: &'a str,
    body: &'a str,
    group: &'a str,
    level: &'a str,
}

pub fn validate_endpoint(config: &Config, endpoint: &str) -> Result<reqwest::Url, &'static str> {
    let url = reqwest::Url::parse(endpoint).map_err(|_| "Invalid Bark URL")?;
    if url.scheme() != "https" || url.username() != "" || url.password().is_some()
        || url.query().is_some() || url.fragment().is_some()
    {
        return Err("Bark URL must be a plain HTTPS endpoint");
    }
    let host = url.host_str().ok_or("Bark URL has no host")?.to_lowercase();
    if !config.bark_allowed_hosts.iter().any(|allowed| host == *allowed) {
        return Err("Bark host is not allowed by this server");
    }
    if url.path_segments().map(|mut parts| parts.next().is_none()).unwrap_or(true) || url.path() == "/" {
        return Err("Bark URL must include a device key");
    }
    Ok(url)
}

pub fn endpoint_hint(endpoint: &str) -> String {
    reqwest::Url::parse(endpoint).ok().and_then(|url| {
        let host = url.host_str()?;
        Some(format!("{}://{}/••••••", url.scheme(), host))
    }).unwrap_or_else(|| "••••••".to_string())
}

pub async fn send(endpoint: &str, title: &str, body: &str) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::none())
        .build().map_err(|_| "Bark request failed".to_string())?;
    let response = client.post(endpoint).json(&BarkPayload {
        title, body, group: "PaperPhonePlus", level: "active",
    }).send().await.map_err(|_| "Bark request failed".to_string())?;
    if !response.status().is_success() {
        return Err(format!("Bark returned HTTP {}", response.status()));
    }
    let value: serde_json::Value = response.json().await.map_err(|_| "Bark request failed".to_string())?;
    if value.get("code").and_then(|v| v.as_i64()).unwrap_or(0) != 200 {
        return Err("Bark rejected the request".to_string());
    }
    Ok(())
}

pub async fn push_to_user(db: &sqlx::MySqlPool, config: &Config, user_id: &str, title: &str, body: &str) {
    let endpoints: Vec<(String,)> = sqlx::query_as(
        "SELECT endpoint FROM bark_subscriptions WHERE user_id = ?"
    ).bind(user_id).fetch_all(db).await.unwrap_or_default();

    for (endpoint,) in endpoints {
        if validate_endpoint(config, &endpoint).is_err() { continue; }
        if let Err(error) = send(&endpoint, title, body).await {
            // Never log the endpoint: its path contains the Bark device key.
            tracing::warn!("[Bark] Push failed for user {}: {}", user_id, error);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bark_endpoint_policy_and_redaction() {
        let mut config = Config::from_env();
        config.bark_allowed_hosts = vec!["api.day.app".into()];
        assert!(validate_endpoint(&config, "https://api.day.app/device-key").is_ok());
        for invalid in ["http://api.day.app/key", "https://example.com/key",
            "https://api.day.app/", "https://user@api.day.app/key",
            "https://api.day.app/key?x=1", "https://api.day.app/key#fragment"] {
            assert!(validate_endpoint(&config, invalid).is_err(), "{invalid}");
        }
        assert_eq!(endpoint_hint("https://api.day.app/private-key"), "https://api.day.app/••••••");
        config.bark_allowed_hosts.push("bark.example.com".into());
        assert!(validate_endpoint(&config, "https://bark.example.com/key").is_ok());
    }
}
