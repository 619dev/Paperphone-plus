use axum::{
    extract::{Multipart, Query, State},
    routing::post,
    Json, Router,
};
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::middleware::AuthUser;
use crate::AppState;

pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/", post(upload_file))
}

async fn upload_file(
    State(state): State<Arc<AppState>>,
    Query(params): Query<UploadParams>,
    _auth: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let filename = field.file_name().unwrap_or("file").to_string();
        let field_name = field.name().unwrap_or("").to_string();
        if field_name != "file" {
            continue;
        }
        let data = field.bytes().await.map_err(|e| {
            (
                axum::http::StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
        })?;

        let ext = filename
            .rsplit('.')
            .next()
            .filter(|v| v.len() <= 16 && v.chars().all(|c| c.is_ascii_alphanumeric()))
            .unwrap_or("bin");
        let file_id = format!("{}.{}", Uuid::new_v4(), ext);
        let class = if params.storage_class.as_deref() == Some("permanent") {
            "permanent"
        } else {
            "temporary"
        };
        let key = format!("{}/{}", class, file_id);

        // Always save to local filesystem first (ensures file is persisted)
        let upload_dir = format!("{}/{}", state.config.upload_dir, class);
        tokio::fs::create_dir_all(&upload_dir).await.map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": format!("Upload directory failed: {}", e) })),
            )
        })?;
        let file_path = format!("{}/{}", upload_dir, file_id);
        tokio::fs::write(&file_path, &data).await.map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": format!("Local save failed: {}", e) })),
            )
        })?;

        let url = format!("/api/files/{}", key);
        return Ok(Json(serde_json::json!({ "url": url, "key": key })));
    }

    Err((
        axum::http::StatusCode::BAD_REQUEST,
        Json(serde_json::json!({ "error": "No file uploaded" })),
    ))
}

#[derive(Default, Deserialize)]
struct UploadParams {
    storage_class: Option<String>,
}
