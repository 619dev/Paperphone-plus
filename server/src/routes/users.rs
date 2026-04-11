use std::sync::Arc;
use axum::{Router, routing::{get, put}, extract::{State, Path, Query}, Json};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/search", get(search_users))
        .route("/me", get(get_me))
        .route("/:id", get(get_user))
        .route("/:id/prekey", get(get_prekey_bundle))
        .route("/avatar", put(update_avatar))
        .route("/nickname", put(update_nickname))
        .route("/password", put(change_password))
}

#[derive(Deserialize)]
struct SearchQuery {
    q: String,
}

async fn search_users(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Query(params): Query<SearchQuery>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let pattern = format!("%{}%", params.q);
    let rows: Vec<(String, String, String, Option<String>, i8)> = sqlx::query_as(
        "SELECT id, username, nickname, avatar, is_online FROM users WHERE username LIKE ? OR nickname LIKE ? LIMIT 20"
    )
    .bind(&pattern).bind(&pattern)
    .fetch_all(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let users: Vec<serde_json::Value> = rows.iter().map(|(id, username, nickname, avatar, online)| {
        serde_json::json!({ "id": id, "username": username, "nickname": nickname, "avatar": avatar, "is_online": *online == 1 })
    }).collect();

    Ok(Json(serde_json::json!(users)))
}

async fn get_me(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let user: Option<(String, String, String, Option<String>, String, String, String, String)> = sqlx::query_as(
        "SELECT id, username, nickname, avatar, ik_pub, spk_pub, spk_sig, kem_pub FROM users WHERE id = ?"
    )
    .bind(&auth.0.id)
    .fetch_optional(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    match user {
        Some((id, username, nickname, avatar, ik_pub, spk_pub, spk_sig, kem_pub)) => {
            Ok(Json(serde_json::json!({
                "id": id, "username": username, "nickname": nickname, "avatar": avatar,
                "ik_pub": ik_pub, "spk_pub": spk_pub, "spk_sig": spk_sig, "kem_pub": kem_pub
            })))
        }
        None => Err((axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "User not found" })))),
    }
}

async fn get_user(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let user: Option<(String, String, String, Option<String>, i8, String, String, String, String)> = sqlx::query_as(
        "SELECT id, username, nickname, avatar, is_online, ik_pub, spk_pub, spk_sig, kem_pub FROM users WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    match user {
        Some((id, username, nickname, avatar, online, ik_pub, spk_pub, spk_sig, kem_pub)) => {
            Ok(Json(serde_json::json!({
                "id": id, "username": username, "nickname": nickname, "avatar": avatar,
                "is_online": online == 1, "ik_pub": ik_pub, "spk_pub": spk_pub, "spk_sig": spk_sig, "kem_pub": kem_pub
            })))
        }
        None => Err((axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "User not found" })))),
    }
}

async fn get_prekey_bundle(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    // Get user identity keys
    let user: Option<(String, String, String, String)> = sqlx::query_as(
        "SELECT ik_pub, spk_pub, spk_sig, kem_pub FROM users WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let (ik_pub, spk_pub, spk_sig, kem_pub) = user
        .ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "User not found" }))))?;

    // Get one-time prekey
    let opk: Option<(u32, i32, String)> = sqlx::query_as(
        "SELECT id, key_id, opk_pub FROM prekeys WHERE user_id = ? AND used = 0 LIMIT 1"
    )
    .bind(&id)
    .fetch_optional(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let mut bundle = serde_json::json!({
        "ik_pub": ik_pub, "spk_pub": spk_pub, "spk_sig": spk_sig, "kem_pub": kem_pub
    });

    if let Some((pk_id, key_id, opk_pub)) = opk {
        bundle["opk"] = serde_json::json!({ "key_id": key_id, "opk_pub": opk_pub });
        // Mark as used
        sqlx::query("UPDATE prekeys SET used = 1 WHERE id = ?")
            .bind(pk_id)
            .execute(&state.db).await.ok();
    }

    Ok(Json(bundle))
}

#[derive(Deserialize)]
struct AvatarUpdate {
    avatar: String,
}

async fn update_avatar(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<AvatarUpdate>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("UPDATE users SET avatar = ? WHERE id = ?")
        .bind(&body.avatar).bind(&auth.0.id)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct NicknameUpdate {
    nickname: String,
}

async fn update_nickname(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<NicknameUpdate>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("UPDATE users SET nickname = ? WHERE id = ?")
        .bind(&body.nickname).bind(&auth.0.id)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct PasswordChange {
    old_password: String,
    new_password: String,
}

async fn change_password(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<PasswordChange>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    use argon2::{Argon2, PasswordHasher, PasswordVerifier, password_hash::{SaltString, rand_core::OsRng}};

    let user: Option<(String,)> = sqlx::query_as("SELECT password FROM users WHERE id = ?")
        .bind(&auth.0.id)
        .fetch_optional(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let (pw_hash,) = user.ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "User not found" }))))?;

    let parsed = argon2::PasswordHash::new(&pw_hash)
        .map_err(|_| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": "Hash error" }))))?;
    Argon2::default()
        .verify_password(body.old_password.as_bytes(), &parsed)
        .map_err(|_| (axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Old password incorrect" }))))?;

    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(body.new_password.as_bytes(), &salt)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?
        .to_string();

    sqlx::query("UPDATE users SET password = ? WHERE id = ?")
        .bind(&new_hash).bind(&auth.0.id)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    Ok(Json(serde_json::json!({ "ok": true })))
}
