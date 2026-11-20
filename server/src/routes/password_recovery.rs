use std::sync::Arc;

use argon2::{Argon2, PasswordHasher, password_hash::{SaltString, rand_core::OsRng}};
use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::AppState;
use super::totp::make_totp;

type ApiError = (StatusCode, Json<Value>);

#[derive(Deserialize)]
pub(super) struct ResetPassword {
    username: String,
    code: String,
    new_password: String,
}

fn denied() -> ApiError {
    (StatusCode::BAD_REQUEST, Json(json!({ "error": "Password recovery verification failed" })))
}

fn unavailable(error: impl std::fmt::Display) -> ApiError {
    tracing::error!(%error, "Unable to complete password recovery");
    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Password recovery unavailable" })))
}

pub(super) async fn reset_password(
    State(state): State<Arc<AppState>>, Json(body): Json<ResetPassword>,
) -> Result<Json<Value>, ApiError> {
    if body.username.is_empty() || body.code.len() != 6 || !body.code.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(denied());
    }
    if !(6..=128).contains(&body.new_password.chars().count()) {
        return Err((StatusCode::BAD_REQUEST, Json(json!({ "error": "Invalid new password length" }))));
    }

    let mut tx = state.db.begin().await.map_err(unavailable)?;
    let user_id: Option<String> = sqlx::query_scalar("SELECT id FROM users WHERE username = ? FOR UPDATE")
        .bind(&body.username).fetch_optional(&mut *tx).await.map_err(unavailable)?;
    let user_id = user_id.ok_or_else(denied)?;

    let enrollment: Option<(String, u64, Option<u64>)> = sqlx::query_as(
        "SELECT totp_secret,
                CAST(IF(reset_window_started_at > NOW() - INTERVAL 30 MINUTE, reset_attempts, 0) AS UNSIGNED),
                last_reset_totp_step
         FROM user_totp WHERE user_id = ? AND enabled = 1 FOR UPDATE"
    )
    .bind(&user_id).fetch_optional(&mut *tx).await.map_err(unavailable)?;
    let (secret, attempts, last_step) = enrollment.ok_or_else(denied)?;
    if attempts >= 5 {
        return Err(denied());
    }

    let secret = totp_rs::Secret::Encoded(secret).to_bytes().map_err(unavailable)?;
    let totp = make_totp(secret, &body.username).map_err(unavailable)?;
    let current_step = chrono::Utc::now().timestamp() as u64 / totp.step;
    let skew = u64::from(totp.skew);
    let matched_step = (current_step.saturating_sub(skew)..=current_step + skew)
        .rev()
        .find(|&step| last_step.is_none_or(|used| step > used) && totp.generate(step * totp.step) == body.code);

    sqlx::query(
        "UPDATE user_totp SET reset_attempts = ?,
         reset_window_started_at = IF(? = 0, NOW(), reset_window_started_at) WHERE user_id = ?"
    )
    .bind(attempts + 1).bind(attempts).bind(&user_id)
    .execute(&mut *tx).await.map_err(unavailable)?;

    let Some(matched_step) = matched_step else {
        tx.commit().await.map_err(unavailable)?;
        return Err(denied());
    };

    let hash = tokio::task::spawn_blocking(move || {
        let salt = SaltString::generate(&mut OsRng);
        Argon2::default().hash_password(body.new_password.as_bytes(), &salt).map(|hash| hash.to_string())
    }).await.map_err(unavailable)?.map_err(unavailable)?;

    sqlx::query("UPDATE users SET password = ?, password_reset_version = password_reset_version + 1 WHERE id = ?")
        .bind(hash).bind(&user_id).execute(&mut *tx).await.map_err(unavailable)?;
    sqlx::query("UPDATE user_totp SET last_reset_totp_step = ? WHERE user_id = ?")
        .bind(matched_step).bind(&user_id).execute(&mut *tx).await.map_err(unavailable)?;
    let sessions: Vec<String> = sqlx::query_scalar("SELECT id FROM sessions WHERE user_id = ? AND revoked = 0 FOR UPDATE")
        .bind(&user_id).fetch_all(&mut *tx).await.map_err(unavailable)?;
    sqlx::query("UPDATE sessions SET revoked = 1 WHERE user_id = ? AND revoked = 0")
        .bind(&user_id).execute(&mut *tx).await.map_err(unavailable)?;
    tx.commit().await.map_err(unavailable)?;

    for session in sessions {
        state.ws_clients.revoke_session(&user_id, &session);
    }
    Ok(Json(json!({ "ok": true })))
}
