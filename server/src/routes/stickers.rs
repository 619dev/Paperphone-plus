use std::sync::Arc;
use std::collections::HashMap;
use axum::{Router, routing::get, extract::{State, Path}, Json};
use tokio::sync::RwLock;

use crate::AppState;
use crate::auth::middleware::AuthUser;

// In-memory cache for sticker data
static STICKER_CACHE: std::sync::LazyLock<RwLock<HashMap<String, (serde_json::Value, std::time::Instant)>>> =
    std::sync::LazyLock::new(|| RwLock::new(HashMap::new()));

const CACHE_TTL: std::time::Duration = std::time::Duration::from_secs(3600); // 1 hour

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/packs", get(list_packs))
        .route("/pack/{name}", get(get_pack))
}

async fn list_packs(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
) -> Json<serde_json::Value> {
    let default_packs = vec![
        ("AnimatedEmojis", "Animated Emoji"),
        ("PepeTheFrog", "Pepe"),
        ("CatPack", "Cats"),
        ("DogPack", "Dogs"),
        ("FunnyMemes", "Memes"),
        ("CuteStickers", "Cute"),
        ("ClassicEmoticons", "Classic"),
        ("AnimalStickers", "Animals"),
    ];

    let packs: Vec<serde_json::Value> = if let Some(ref custom) = state.config.sticker_packs {
        custom.split(',').filter_map(|s| {
            let parts: Vec<&str> = s.trim().splitn(2, ':').collect();
            if parts.len() == 2 {
                Some(serde_json::json!({ "name": parts[0], "label": parts[1] }))
            } else {
                None
            }
        }).collect()
    } else {
        default_packs.iter().map(|(name, label)| {
            serde_json::json!({ "name": name, "label": label })
        }).collect()
    };

    Json(serde_json::json!(packs))
}

async fn get_pack(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(name): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    // Check cache
    {
        let cache = STICKER_CACHE.read().await;
        if let Some((data, ts)) = cache.get(&name) {
            if ts.elapsed() < CACHE_TTL {
                return Ok(Json(data.clone()));
            }
        }
    }

    let token = state.config.telegram_bot_token.as_ref()
        .ok_or_else(|| (axum::http::StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Telegram bot token not configured" }))))?;

    let client = reqwest::Client::new();
    let resp = client
        .get(format!("https://api.telegram.org/bot{}/getStickerSet?name={}", token, name))
        .send()
        .await
        .map_err(|e| (axum::http::StatusCode::BAD_GATEWAY, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let body: serde_json::Value = resp.json().await
        .map_err(|e| (axum::http::StatusCode::BAD_GATEWAY, Json(serde_json::json!({ "error": e.to_string() }))))?;

    if !body.get("ok").and_then(|v| v.as_bool()).unwrap_or(false) {
        return Err((axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Sticker pack not found" }))));
    }

    let stickers = body.get("result").and_then(|r| r.get("stickers")).cloned().unwrap_or(serde_json::json!([]));

    // Resolve file URLs
    let mut resolved = Vec::new();
    if let Some(arr) = stickers.as_array() {
        for sticker in arr {
            let file_id = sticker.get("file_id").and_then(|v| v.as_str()).unwrap_or("");
            if file_id.is_empty() { continue; }

            let file_resp = client
                .get(format!("https://api.telegram.org/bot{}/getFile?file_id={}", token, file_id))
                .send()
                .await.ok();

            if let Some(fr) = file_resp {
                let file_body: serde_json::Value = fr.json().await.unwrap_or_default();
                if let Some(path) = file_body.pointer("/result/file_path").and_then(|v| v.as_str()) {
                    let url = format!("https://api.telegram.org/file/bot{}/{}", token, path);
                    resolved.push(serde_json::json!({
                        "file_id": file_id,
                        "url": url,
                        "emoji": sticker.get("emoji"),
                        "is_animated": sticker.get("is_animated"),
                        "is_video": sticker.get("is_video"),
                    }));
                }
            }
        }
    }

    let result = serde_json::json!({ "name": name, "stickers": resolved });

    // Cache result
    {
        let mut cache = STICKER_CACHE.write().await;
        cache.insert(name, (result.clone(), std::time::Instant::now()));
    }

    Ok(Json(result))
}
