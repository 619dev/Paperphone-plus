use std::sync::Arc;
use axum::{Router, routing::post, extract::State, Json};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(submit_report))
}

#[derive(Deserialize)]
struct ReportReq {
    target_type: String,
    target_id: String,
    reason: String,
    detail: Option<String>,
}

async fn submit_report(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<ReportReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    // Validate reason
    let valid_reasons = ["offensive", "spam", "harassment", "violence", "misinformation", "other"];
    if !valid_reasons.contains(&body.reason.as_str()) {
        return Err((axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid reason" }))));
    }

    // Validate target_type
    let valid_types = ["user", "moment", "timeline_post", "message"];
    if !valid_types.contains(&body.target_type.as_str()) {
        return Err((axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid target type" }))));
    }

    sqlx::query(
        "INSERT INTO reports (reporter_id, target_type, target_id, reason, detail) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&auth.0.id)
    .bind(&body.target_type)
    .bind(&body.target_id)
    .bind(&body.reason)
    .bind(&body.detail)
    .execute(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    tracing::info!(
        "🚩 Report submitted: reporter={}, type={}, target={}, reason={}",
        auth.0.id, body.target_type, body.target_id, body.reason
    );

    Ok(Json(serde_json::json!({ "ok": true })))
}
