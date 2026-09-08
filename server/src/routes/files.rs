use axum::{
    extract::{Path, State},
    http::{header, HeaderValue, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use std::path::{Component, Path as FsPath};
use std::sync::Arc;

use crate::AppState;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/migration-config", get(migration_config))
        .route("/{*path}", get(proxy_file))
}

async fn migration_config(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    Json(serde_json::json!({ "legacy_r2_public_url": state.config.r2_public_url }))
}

async fn proxy_file(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
) -> impl IntoResponse {
    // Legacy keys were uploads/{uuid}; new keys include permanent/ or temporary/.
    let local_name = key.strip_prefix("uploads/").unwrap_or(&key);
    if FsPath::new(local_name)
        .components()
        .any(|part| !matches!(part, Component::Normal(_)))
    {
        return (StatusCode::BAD_REQUEST, "Invalid file path").into_response();
    }
    let candidates = if local_name.contains('/') {
        vec![format!("{}/{}", state.config.upload_dir, local_name)]
    } else {
        vec![
            format!("{}/permanent/{}", state.config.upload_dir, local_name),
            format!("{}/temporary/{}", state.config.upload_dir, local_name),
            format!("{}/{}", state.config.upload_dir, local_name),
        ]
    };
    let file_path = candidates
        .into_iter()
        .find(|p| std::path::Path::new(p).is_file());
    let Some(file_path) = file_path else {
        return (StatusCode::NOT_FOUND, "File not found").into_response();
    };
    match tokio::fs::read(&file_path).await {
        Ok(data) => {
            let content_type = mime_guess::from_path(&file_path)
                .first_or_octet_stream()
                .to_string();
            let mut response = data.into_response();
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                HeaderValue::from_str(&content_type)
                    .unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")),
            );
            response.headers_mut().insert(
                header::CACHE_CONTROL,
                HeaderValue::from_static("private, max-age=31536000, immutable"),
            );
            response.headers_mut().insert(
                header::X_CONTENT_TYPE_OPTIONS,
                HeaderValue::from_static("nosniff"),
            );
            response
        }
        Err(_) => (StatusCode::NOT_FOUND, "File not found").into_response(),
    }
}
