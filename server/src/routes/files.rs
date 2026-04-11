use std::sync::Arc;
use axum::{Router, routing::get, extract::{State, Path}, response::IntoResponse, http::{header, StatusCode}};

use crate::AppState;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/*path", get(proxy_file))
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
                let body = output.body.collect().await.unwrap_or_default().into_bytes();
                return (
                    StatusCode::OK,
                    [(header::CONTENT_TYPE, content_type), (header::CACHE_CONTROL, "public, max-age=31536000".to_string())],
                    body.to_vec(),
                ).into_response();
            }
            Err(_) => {
                return (StatusCode::NOT_FOUND, "File not found").into_response();
            }
        }
    }

    // Fallback: serve from local filesystem
    let file_path = format!("{}/{}", state.config.upload_dir, key);
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
