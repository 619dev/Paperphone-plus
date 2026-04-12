use std::sync::Arc;
use axum::{Router, routing::get, extract::{State, Path}, response::IntoResponse, http::{header, StatusCode}};

use crate::AppState;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/{*path}", get(proxy_file))
}

async fn proxy_file(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
) -> impl IntoResponse {
    // Try R2
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
        match s3.get_object().bucket(bucket).key(&key).send().await {
            Ok(output) => {
                let content_type = output.content_type().unwrap_or("application/octet-stream").to_string();
                let body = match output.body.collect().await {
                    Ok(b) => b.into_bytes(),
                    Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to read body").into_response(),
                };
                return (
                    StatusCode::OK,
                    [(header::CONTENT_TYPE, content_type), (header::CACHE_CONTROL, "public, max-age=31536000".to_string())],
                    body.to_vec(),
                ).into_response();
            }
            Err(_) => {
                // R2 miss — fall through to local filesystem
            }
        }
    }

    // Fallback: serve from local filesystem
    // key may be "uploads/{uuid}.ext" — strip the "uploads/" prefix since upload_dir IS the uploads folder
    let local_name = key.strip_prefix("uploads/").unwrap_or(&key);
    let file_path = format!("{}/{}", state.config.upload_dir, local_name);
    match tokio::fs::read(&file_path).await {
        Ok(data) => {
            let content_type = mime_guess::from_path(&file_path)
                .first_or_octet_stream()
                .to_string();
            (
                StatusCode::OK,
                [(header::CONTENT_TYPE, content_type), (header::CACHE_CONTROL, "public, max-age=31536000".to_string())],
                data,
            ).into_response()
        }
        Err(_) => (StatusCode::NOT_FOUND, "File not found").into_response(),
    }
}
