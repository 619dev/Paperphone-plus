use std::sync::Arc;
use axum::{Router, routing::post, extract::State, Json};
use serde::Deserialize;
use rand::Rng;

use crate::AppState;
use crate::auth::middleware::AuthUser;
use crate::auth::jwt::{sign_token, verify_token};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/setup", post(setup_totp))
        .route("/enable", post(enable_totp))
        .route("/verify", post(verify_totp))
        .route("/disable", post(disable_totp))
        .route("/recovery", post(use_recovery_code))
}

async fn setup_totp(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    use totp_rs::{TOTP, Algorithm, Secret};

    let secret = Secret::generate_secret();
    let totp = TOTP::new(Algorithm::SHA1, 6, 1, 30, secret.to_bytes().unwrap())
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let secret_base32 = secret.to_encoded().to_string();
    let uri = totp.get_url(&auth.0.username, "PaperPhone");

    // Generate 8 recovery codes
    let mut rng = rand::thread_rng();
    let codes: Vec<String> = (0..8).map(|_| format!("{:08x}", rng.gen::<u32>())).collect();
    let codes_json = serde_json::to_string(&codes).unwrap_or_default();

    // Store (not yet enabled)
    sqlx::query(
        "INSERT INTO user_totp (user_id, totp_secret, recovery_codes, enabled) VALUES (?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE totp_secret = VALUES(totp_secret), recovery_codes = VALUES(recovery_codes), enabled = 0"
    )
    .bind(&auth.0.id).bind(&secret_base32).bind(&codes_json)
    .execute(&state.db).await.ok();

    Ok(Json(serde_json::json!({
        "secret": secret_base32,
        "uri": uri,
        "recovery_codes": codes,
    })))
}

#[derive(Deserialize)]
struct VerifyReq { code: String }

async fn enable_totp(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<VerifyReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    use totp_rs::{TOTP, Algorithm, Secret};

    let row: Option<(String,)> = sqlx::query_as("SELECT totp_secret FROM user_totp WHERE user_id = ?")
        .bind(&auth.0.id).fetch_optional(&state.db).await.unwrap_or(None);

    let (secret_b32,) = row.ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "TOTP not set up" }))))?;

    let secret = Secret::Encoded(secret_b32).to_bytes()
        .map_err(|_| (axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid secret" }))))?;

    let totp = TOTP::new(Algorithm::SHA1, 6, 1, 30, secret)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    if !totp.check_current(&body.code).unwrap_or(false) {
        return Err((axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid code" }))));
    }

    sqlx::query("UPDATE user_totp SET enabled = 1 WHERE user_id = ?")
        .bind(&auth.0.id).execute(&state.db).await.ok();

    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn verify_totp(
    State(state): State<Arc<AppState>>,
    Json(body): Json<VerifyWithTokenReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    use totp_rs::{TOTP, Algorithm, Secret};

    // Verify the pending 2FA token
    let claims = verify_token(&body.login_token, &state.config.jwt_secret)
        .map_err(|_| (axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid or expired token" }))))?;

    if claims.token_type.as_deref() != Some("2fa_pending") {
        return Err((axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid token type" }))));
    }

    let row: Option<(String,)> = sqlx::query_as("SELECT totp_secret FROM user_totp WHERE user_id = ? AND enabled = 1")
        .bind(&claims.id).fetch_optional(&state.db).await.unwrap_or(None);

    let (secret_b32,) = row.ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "2FA not enabled" }))))?;

    let secret = Secret::Encoded(secret_b32).to_bytes()
        .map_err(|_| (axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid secret" }))))?;

    let totp = TOTP::new(Algorithm::SHA1, 6, 1, 30, secret)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    if !totp.check_current(&body.code).unwrap_or(false) {
        return Err((axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid TOTP code" }))));
    }

    // Create session and issue full token
    let session_id = uuid::Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO sessions (id, user_id) VALUES (?, ?)")
        .bind(&session_id).bind(&claims.id).execute(&state.db).await.ok();

    let token = sign_token(&claims.id, &claims.username, Some(&session_id), &state.config.jwt_secret);

    let user: Option<(String, String, String, Option<String>)> = sqlx::query_as(
        "SELECT id, username, nickname, avatar FROM users WHERE id = ?"
    ).bind(&claims.id).fetch_optional(&state.db).await.unwrap_or(None);

    let (id, username, nickname, avatar) = user.unwrap_or_default();
    Ok(Json(serde_json::json!({
        "token": token,
        "user": { "id": id, "username": username, "nickname": nickname, "avatar": avatar }
    })))
}

#[derive(Deserialize)]
struct VerifyWithTokenReq {
    login_token: String,
    code: String,
}

async fn disable_totp(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<VerifyReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    use totp_rs::{TOTP, Algorithm, Secret};

    let row: Option<(String,)> = sqlx::query_as("SELECT totp_secret FROM user_totp WHERE user_id = ? AND enabled = 1")
        .bind(&auth.0.id).fetch_optional(&state.db).await.unwrap_or(None);

    let (secret_b32,) = row.ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "2FA not enabled" }))))?;

    let secret = Secret::Encoded(secret_b32).to_bytes()
        .map_err(|_| (axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid secret" }))))?;

    let totp = TOTP::new(Algorithm::SHA1, 6, 1, 30, secret)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    if !totp.check_current(&body.code).unwrap_or(false) {
        return Err((axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid code" }))));
    }

    sqlx::query("DELETE FROM user_totp WHERE user_id = ?")
        .bind(&auth.0.id).execute(&state.db).await.ok();

    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct RecoveryReq {
    login_token: String,
    code: String,
}

async fn use_recovery_code(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RecoveryReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let claims = verify_token(&body.login_token, &state.config.jwt_secret)
        .map_err(|_| (axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid token" }))))?;

    let row: Option<(Option<String>,)> = sqlx::query_as("SELECT recovery_codes FROM user_totp WHERE user_id = ? AND enabled = 1")
        .bind(&claims.id).fetch_optional(&state.db).await.unwrap_or(None);

    let (codes_json,) = row.ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "2FA not enabled" }))))?;

    let codes_str = codes_json.unwrap_or_default();
    let mut codes: Vec<String> = serde_json::from_str(&codes_str).unwrap_or_default();

    if let Some(pos) = codes.iter().position(|c| c == &body.code) {
        codes.remove(pos);
        let updated = serde_json::to_string(&codes).unwrap_or_default();
        sqlx::query("UPDATE user_totp SET recovery_codes = ? WHERE user_id = ?")
            .bind(&updated).bind(&claims.id).execute(&state.db).await.ok();

        // Issue full token
        let session_id = uuid::Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO sessions (id, user_id) VALUES (?, ?)")
            .bind(&session_id).bind(&claims.id).execute(&state.db).await.ok();
        let token = sign_token(&claims.id, &claims.username, Some(&session_id), &state.config.jwt_secret);

        Ok(Json(serde_json::json!({ "token": token, "remaining_codes": codes.len() })))
    } else {
        Err((axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid recovery code" }))))
    }
}
