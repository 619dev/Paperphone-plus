use std::sync::Arc;
use std::collections::HashMap;
use axum::{Router, routing::get, extract::{State, Path}, Json};
use axum::response::IntoResponse;
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
        .route("/proxy/{file_id}", get(proxy_file))
}

async fn list_packs(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
) -> Json<serde_json::Value> {
    let default_packs = vec![
        ("asterism_by_favorite_stickers_bot", "Asterism"),
        ("in_DFCEDC_by_NaiDrawBot", "DFCEDC"),
        ("sevendays_holidays_by_favorite_stickers_bot", "7 Days"),
        ("marching_pockets_by_favorite_stickers_bot", "Pockets"),
        ("triedge_by_favorite_stickers_bot", "Triedge"),
        ("ongeki", "Ongeki"),
        ("LINE_YURU_YURI", "Yuru Yuri"),
        ("mingfengOuO", "MingFeng"),
        ("hanamarulily", "HanamaruLily"),
        ("yuexinmiao_one", "月薪喵"),
        ("shenye_by_luxiaoxun_bot", "深夜"),
        ("shenye2_by_moe_sticker_bot", "深夜 2"),
        ("LLM_Moe", "LLM Moe"),
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

    Json(serde_json::json!({ "packs": packs }))
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

    // Return stable application URLs. Resolving every sticker to Telegram's
    // temporary download URL both leaks the bot token and makes old messages
    // break when that URL expires.
    let mut resolved = Vec::new();
    if let Some(arr) = stickers.as_array() {
        for sticker in arr {
            let file_id = sticker.get("file_id").and_then(|v| v.as_str()).unwrap_or("");
            if file_id.is_empty() { continue; }

            let is_animated = sticker.get("is_animated").and_then(|v| v.as_bool()).unwrap_or(false);
            let is_video = sticker.get("is_video").and_then(|v| v.as_bool()).unwrap_or(false);
            let sticker_type = if is_video { "video" } else if is_animated { "animated" } else { "static" };
            resolved.push(serde_json::json!({
                "file_id": file_id,
                "url": format!("/api/stickers/proxy/{}", file_id),
                "emoji": sticker.get("emoji"),
                "is_animated": is_animated,
                "is_video": is_video,
                "type": sticker_type,
            }));
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

/// Proxy endpoint to fetch Telegram sticker files, avoiding CORS issues.
/// GET /api/stickers/proxy/{file_id}
async fn proxy_file(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(file_id): Path<String>,
) -> Result<impl IntoResponse, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let token = state.config.telegram_bot_token.as_ref()
        .ok_or_else(|| (axum::http::StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Telegram bot token not configured" }))))?;

    let client = reqwest::Client::new();

    // Get file path from Telegram
    let file_resp = client
        .get(format!("https://api.telegram.org/bot{}/getFile?file_id={}", token, file_id))
        .send()
        .await
        .map_err(|e| (axum::http::StatusCode::BAD_GATEWAY, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let file_body: serde_json::Value = file_resp.json().await
        .map_err(|e| (axum::http::StatusCode::BAD_GATEWAY, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let file_path = file_body.pointer("/result/file_path").and_then(|v| v.as_str())
        .ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "File not found" }))))?;

    // Download the actual file
    let download_url = format!("https://api.telegram.org/file/bot{}/{}", token, file_path);
    let download_resp = client.get(&download_url).send().await
        .map_err(|e| (axum::http::StatusCode::BAD_GATEWAY, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let content_type = download_resp.headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let bytes = download_resp.bytes().await
        .map_err(|e| (axum::http::StatusCode::BAD_GATEWAY, Json(serde_json::json!({ "error": e.to_string() }))))?;

    Ok((
        axum::http::StatusCode::OK,
        [
            (axum::http::header::CONTENT_TYPE, content_type),
            // Telegram file_id values are stable. Clients persist this response
            // indefinitely and no longer depend on Telegram's temporary file URL.
            (axum::http::header::CACHE_CONTROL, "private, max-age=31536000, immutable".to_string()),
            (axum::http::header::ACCESS_CONTROL_ALLOW_ORIGIN, "*".to_string()),
        ],
        bytes,
    ))
}
