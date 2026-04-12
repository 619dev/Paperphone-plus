use std::sync::Arc;
use axum::{Router, routing::post, extract::{State, Multipart}, Json};
use uuid::Uuid;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(upload_file))
}

async fn upload_file(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let filename = field.file_name().unwrap_or("file").to_string();
        let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
        let data = field.bytes().await
            .map_err(|e| (axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": e.to_string() }))))?;

        let ext = filename.rsplit('.').next().unwrap_or("bin");
        let file_id = format!("{}.{}", Uuid::new_v4(), ext);
        let key = format!("uploads/{}", file_id);

        // Always save to local filesystem first (ensures file is persisted)
        let upload_dir = &state.config.upload_dir;
        tokio::fs::create_dir_all(upload_dir).await.ok();
        let file_path = format!("{}/{}", upload_dir, file_id);
        tokio::fs::write(&file_path, &data).await
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": format!("Local save failed: {}", e) }))))?;

        // Try R2 upload (optional, best-effort)
        if let (Some(account_id), Some(access_key), Some(secret_key), Some(bucket)) = (
            &state.config.r2_account_id,
            &state.config.r2_access_key_id,
            &state.config.r2_secret_access_key,
            &state.config.r2_bucket,
        ) {
            let r2_url = format!("https://{}.r2.cloudflarestorage.com", account_id);

            let creds = aws_credential_types::Credentials::new(access_key, secret_key, None, None, "r2");
            let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
                .credentials_provider(creds)
                .endpoint_url(&r2_url)
                .region(aws_config::Region::new("auto"))
                .load()
                .await;

            let s3 = aws_sdk_s3::Client::new(&config);
            match s3.put_object()
                .bucket(bucket)
                .key(&key)
                .body(aws_sdk_s3::primitives::ByteStream::from(data.to_vec()))
                .content_type(&content_type)
                .send()
                .await
            {
                Ok(_) => {
                    let url = if let Some(ref public_url) = state.config.r2_public_url {
                        format!("{}/{}", public_url.trim_end_matches('/'), key)
                    } else {
                        format!("/api/files/{}", key)
                    };
                    return Ok(Json(serde_json::json!({ "url": url, "key": key })));
                }
                Err(e) => {
                    tracing::warn!("R2 upload failed, using local fallback: {}", e);
                    // Fall through to return local URL
                }
            }
        }

        // Return local URL
        let url = format!("/api/files/{}", key);
        return Ok(Json(serde_json::json!({ "url": url, "key": key })));
    }

    Err((axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "No file uploaded" }))))
}
