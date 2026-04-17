use std::sync::Arc;
use axum::{Router, routing::{get, post}, extract::State, Json, http::HeaderMap};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;
use crate::auth::jwt::{sign_token, verify_token};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/status", get(totp_status))
        .route("/setup", post(setup_totp))
        .route("/enable", post(enable_totp))
        .route("/verify", post(verify_totp))
        .route("/disable", post(disable_totp))
        .route("/recovery", post(use_recovery_code))
}

/// Helper: create a TOTP instance (sync, returns owned values)
fn make_totp(secret_bytes: Vec<u8>, account: &str) -> Result<totp_rs::TOTP, totp_rs::TotpUrlError> {
    totp_rs::TOTP::new(
        totp_rs::Algorithm::SHA1,
        6,
        1,
        30,
        secret_bytes,
        Some("PaperPhone".to_string()),
        account.to_string(),
    )
}

async fn totp_status(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let row: Option<(i8,)> = sqlx::query_as("SELECT enabled FROM user_totp WHERE user_id = ? AND enabled = 1")
        .bind(&auth.0.id).fetch_optional(&state.db).await.unwrap_or(None);
    Ok(Json(serde_json::json!({ "enabled": row.is_some() })))
}

async fn setup_totp(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    // Refuse to overwrite an already-enabled TOTP
    let existing: Option<(i8,)> = sqlx::query_as("SELECT enabled FROM user_totp WHERE user_id = ? AND enabled = 1")
        .bind(&auth.0.id).fetch_optional(&state.db).await.unwrap_or(None);
    if existing.is_some() {
        return Err((axum::http::StatusCode::CONFLICT, Json(serde_json::json!({ "error": "2FA is already enabled. Disable it first." }))));
    }
    // Compute everything synchronously, then drop non-Send types before .await
    let (secret_base32, uri, codes, codes_json) = {
        use totp_rs::Secret;
        use rand::Rng;

        let secret = Secret::generate_secret();
        let totp = make_totp(secret.to_bytes().unwrap(), &auth.0.username)
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

        let secret_base32 = secret.to_encoded().to_string();
        let uri = totp.get_url();

        let mut rng = rand::thread_rng();
        let codes: Vec<String> = (0..8).map(|_| format!("{:08x}", rng.gen::<u32>())).collect();
        let codes_json = serde_json::to_string(&codes).unwrap_or_default();

        (secret_base32, uri, codes, codes_json)
    };

    // Now only Send types are alive across .await
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
    let row: Option<(String,)> = sqlx::query_as("SELECT totp_secret FROM user_totp WHERE user_id = ?")
        .bind(&auth.0.id).fetch_optional(&state.db).await.unwrap_or(None);

    let (secret_b32,) = row.ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "TOTP not set up" }))))?;

    // Scope non-Send TOTP types
    let valid = {
        use totp_rs::Secret;
        let secret = Secret::Encoded(secret_b32).to_bytes()
            .map_err(|_| (axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid secret" }))))?;
        let totp = make_totp(secret, &auth.0.username)
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
        totp.check_current(&body.code).unwrap_or(false)
    };

    if !valid {
        return Err((axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid code" }))));
    }

    sqlx::query("UPDATE user_totp SET enabled = 1 WHERE user_id = ?")
        .bind(&auth.0.id).execute(&state.db).await.ok();

    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn verify_totp(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<VerifyWithTokenReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let claims = verify_token(&body.login_token, &state.config.jwt_secret)
        .map_err(|_| (axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid or expired token" }))))?;

    if claims.token_type.as_deref() != Some("2fa_pending") {
        return Err((axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid token type" }))));
    }

    let row: Option<(String,)> = sqlx::query_as("SELECT totp_secret FROM user_totp WHERE user_id = ? AND enabled = 1")
        .bind(&claims.id).fetch_optional(&state.db).await.unwrap_or(None);

    let (secret_b32,) = row.ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "2FA not enabled" }))))?;

    let valid = {
        use totp_rs::Secret;
        let secret = Secret::Encoded(secret_b32).to_bytes()
            .map_err(|_| (axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid secret" }))))?;
        let totp = make_totp(secret, &claims.username)
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
        totp.check_current(&body.code).unwrap_or(false)
    };

    if !valid {
        return Err((axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid TOTP code" }))));
    }

    let session_id = uuid::Uuid::new_v4().to_string();
    let (device_name, device_type, os_name, browser_name) = crate::routes::auth::parse_user_agent(&headers);
    let ip_address = crate::routes::auth::extract_ip(&headers);
    sqlx::query("INSERT INTO sessions (id, user_id, device_name, device_type, os, browser, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(&session_id).bind(&claims.id).bind(&device_name).bind(&device_type).bind(&os_name).bind(&browser_name).bind(&ip_address)
        .execute(&state.db).await.ok();

    let token = sign_token(&claims.id, &claims.username, Some(&session_id), &state.config.jwt_secret);

    let user: Option<(String, String, String, Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT id, username, nickname, avatar, ik_pub FROM users WHERE id = ?"
    ).bind(&claims.id).fetch_optional(&state.db).await.unwrap_or(None);

    let (id, username, nickname, avatar, ik_pub) = user.unwrap_or_default();
    Ok(Json(serde_json::json!({
        "token": token,
        "user": { "id": id, "username": username, "nickname": nickname, "avatar": avatar, "ik_pub": ik_pub }
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
    let row: Option<(String,)> = sqlx::query_as("SELECT totp_secret FROM user_totp WHERE user_id = ? AND enabled = 1")
        .bind(&auth.0.id).fetch_optional(&state.db).await.unwrap_or(None);

    let (secret_b32,) = row.ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "2FA not enabled" }))))?;

    let valid = {
        use totp_rs::Secret;
        let secret = Secret::Encoded(secret_b32).to_bytes()
            .map_err(|_| (axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid secret" }))))?;
        let totp = make_totp(secret, &auth.0.username)
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
        totp.check_current(&body.code).unwrap_or(false)
    };

    if !valid {
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
    headers: HeaderMap,
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

        let session_id = uuid::Uuid::new_v4().to_string();
        let (device_name, device_type, os_name, browser_name) = crate::routes::auth::parse_user_agent(&headers);
        let ip_address = crate::routes::auth::extract_ip(&headers);
        sqlx::query("INSERT INTO sessions (id, user_id, device_name, device_type, os, browser, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(&session_id).bind(&claims.id).bind(&device_name).bind(&device_type).bind(&os_name).bind(&browser_name).bind(&ip_address)
            .execute(&state.db).await.ok();
        let token = sign_token(&claims.id, &claims.username, Some(&session_id), &state.config.jwt_secret);

        Ok(Json(serde_json::json!({ "token": token, "remaining_codes": codes.len() })))
    } else {
        Err((axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid recovery code" }))))
    }
}
