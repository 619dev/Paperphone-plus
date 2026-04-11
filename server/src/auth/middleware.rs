use std::sync::Arc;
use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
};

use crate::AppState;
use super::jwt::{Claims, verify_token};

/// Axum extractor that validates JWT from Authorization header.
pub struct AuthUser(pub Claims);

impl FromRequestParts<Arc<AppState>> for AuthUser {
    type Rejection = (StatusCode, axum::Json<serde_json::Value>);

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");

        let token = if auth_header.starts_with("Bearer ") {
            &auth_header[7..]
        } else {
            return Err((
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({ "error": "Missing or invalid token" })),
            ));
        };

        match verify_token(token, &state.config.jwt_secret) {
            Ok(claims) => {
                // Reject 2fa_pending tokens for normal API access
                if claims.token_type.as_deref() == Some("2fa_pending") {
                    return Err((
                        StatusCode::UNAUTHORIZED,
                        axum::Json(serde_json::json!({ "error": "2FA verification required" })),
                    ));
                }
                Ok(AuthUser(claims))
            }
            Err(_) => Err((
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({ "error": "Invalid or expired token" })),
            )),
        }
    }
}
