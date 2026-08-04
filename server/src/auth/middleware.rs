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
                if let Some(session_id) = claims.session_id.as_deref() {
                    let active: Option<(i8,)> = sqlx::query_as(
                        "SELECT revoked FROM sessions WHERE id = ? AND user_id = ?"
                    ).bind(session_id).bind(&claims.id)
                        .fetch_optional(&state.db).await.ok().flatten();
                    if active.map(|r| r.0).unwrap_or(1) != 0 {
                        return Err((
                            StatusCode::UNAUTHORIZED,
                            axum::Json(serde_json::json!({
                                "error":"Session revoked", "code":"session_revoked", "logout":true
                            })),
                        ));
                    }
                    sqlx::query("UPDATE sessions SET last_active=NOW() WHERE id=?")
                        .bind(session_id).execute(&state.db).await.ok();
                }
                Ok(AuthUser(claims))
            }
            Err(_) => Err((
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({
                    "error": "Invalid or expired token", "code":"access_token_expired", "refreshable":true
                })),
            )),
        }
    }
}
