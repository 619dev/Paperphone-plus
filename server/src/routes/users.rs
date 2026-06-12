use std::sync::Arc;
use axum::{Router, routing::{get, put, post, delete}, extract::{State, Path, Query}, Json};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/search", get(search_users))
        .route("/me", get(get_me))
        .route("/{id}", get(get_user))
        .route("/{id}/prekey", get(get_prekey_bundle))
        .route("/avatar", put(update_avatar))
        .route("/nickname", put(update_nickname))
        .route("/password", put(change_password))
        .route("/keys", put(update_keys))
        .route("/reset-sender-keys", post(reset_sender_keys))
        .route("/delete", post(delete_account))
        .route("/block", post(block_user))
        .route("/block", get(get_blocked_users))
        .route("/block/{id}", delete(unblock_user))
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

#[derive(Deserialize)]
struct UpdateKeysReq {
    ik_pub: String,
    spk_pub: String,
    spk_sig: String,
    kem_pub: String,
    prekeys: Option<Vec<PreKeyItem>>,
}

#[derive(Deserialize)]
struct PreKeyItem {
    key_id: i32,
    opk_pub: String,
}

async fn update_keys(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<UpdateKeysReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("UPDATE users SET ik_pub = ?, spk_pub = ?, spk_sig = ?, kem_pub = ? WHERE id = ?")
        .bind(&body.ik_pub).bind(&body.spk_pub).bind(&body.spk_sig).bind(&body.kem_pub).bind(&auth.0.id)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    // Replace prekeys
    if let Some(prekeys) = &body.prekeys {
        sqlx::query("DELETE FROM prekeys WHERE user_id = ?")
            .bind(&auth.0.id).execute(&state.db).await.ok();
        for pk in prekeys {
            sqlx::query("INSERT INTO prekeys (user_id, key_id, opk_pub) VALUES (?, ?, ?)")
                .bind(&auth.0.id).bind(pk.key_id).bind(&pk.opk_pub)
                .execute(&state.db).await.ok();
        }
    }

    Ok(Json(serde_json::json!({ "ok": true })))
}

/// Reset all sender keys when a user's identity keys have changed.
/// This cleans up stale sender key distributions that were encrypted with the old ik_pub,
/// and notifies all encrypted group members to discard their cached sender keys for this user.
async fn reset_sender_keys(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let uid = &auth.0.id;

    // 1. Delete all sender key distributions where this user is sender or recipient
    sqlx::query("DELETE FROM group_sender_key_distributions WHERE from_id = ? OR to_id = ?")
        .bind(uid).bind(uid)
        .execute(&state.db).await.ok();

    // 2. Delete sender key metadata for this user
    sqlx::query("DELETE FROM group_sender_keys WHERE user_id = ?")
        .bind(uid)
        .execute(&state.db).await.ok();

    // 3. Find all encrypted groups this user belongs to
    let encrypted_groups: Vec<(String,)> = sqlx::query_as(
        "SELECT gm.group_id FROM group_members gm
         JOIN `groups` g ON g.id = gm.group_id
         WHERE gm.user_id = ? AND g.encrypted = 1"
    )
    .bind(uid)
    .fetch_all(&state.db).await.unwrap_or_default();

    // 4. Notify all members of each encrypted group to discard this user's sender key
    for (group_id,) in &encrypted_groups {
        let members: Vec<(String,)> = sqlx::query_as(
            "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?"
        )
        .bind(group_id).bind(uid)
        .fetch_all(&state.db).await.unwrap_or_default();

        for (mid,) in &members {
            state.ws_clients.send_to_user(mid, serde_json::json!({
                "type": "sender_key_invalidated",
                "group_id": group_id,
                "user_id": uid,
            }));
        }
    }

    tracing::info!("🔑 Sender keys reset for user {} across {} encrypted groups", uid, encrypted_groups.len());

    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct DeleteAccountReq {
    password: String,
}

async fn delete_account(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<DeleteAccountReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    use argon2::{Argon2, PasswordVerifier};

    // Verify password
    let user: Option<(String,)> = sqlx::query_as("SELECT password FROM users WHERE id = ?")
        .bind(&auth.0.id)
        .fetch_optional(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let (pw_hash,) = user.ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "User not found" }))))?;

    let parsed = argon2::PasswordHash::new(&pw_hash)
        .map_err(|_| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": "Hash error" }))))?;
    Argon2::default()
        .verify_password(body.password.as_bytes(), &parsed)
        .map_err(|_| (axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Invalid password" }))))?;

    let uid = &auth.0.id;

    // Delete messages sent by or to this user
    sqlx::query("DELETE FROM messages WHERE from_id = ? OR (to_id = ? AND type = 'private')")
        .bind(uid).bind(uid)
        .execute(&state.db).await.ok();

    // Delete groups owned by this user (CASCADE will handle group_members, group_invites)
    sqlx::query("DELETE FROM `groups` WHERE owner_id = ?")
        .bind(uid)
        .execute(&state.db).await.ok();

    // Delete the user record (CASCADE handles: prekeys, friends, group_members,
    // moments, moment_likes, moment_comments, push_subscriptions, onesignal_players,
    // sessions, friend_tags, friend_tag_assignments, user_totp, moment_privacy,
    // timeline_posts, timeline_likes, timeline_comments, group_invites, fcm_tokens,
    // ntfy_subscriptions, apns_tokens)
    sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(uid)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    // Clean up Redis
    if let Ok(mut conn) = state.redis.get().await {
        let _: Result<(), _> = deadpool_redis::redis::cmd("DEL")
            .arg(format!("online:{}", uid))
            .arg(format!("heartbeat:{}", uid))
            .query_async(&mut *conn).await;
    }

    // Disconnect WebSocket connections for this user
    state.ws_clients.send_to_user(uid, serde_json::json!({"type": "account_deleted"}));

    tracing::info!("🗑️ Account deleted: user_id={}", uid);

    Ok(Json(serde_json::json!({ "ok": true })))
}

// ── Block User ──────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct BlockReq {
    user_id: String,
}

async fn block_user(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<BlockReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    if body.user_id == auth.0.id {
        return Err((axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Cannot block yourself" }))));
    }

    sqlx::query(
        "INSERT IGNORE INTO user_blocks (user_id, blocked_id) VALUES (?, ?)"
    )
    .bind(&auth.0.id)
    .bind(&body.user_id)
    .execute(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    tracing::info!("🚫 User {} blocked {}", auth.0.id, body.user_id);

    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn unblock_user(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(blocked_id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query(
        "DELETE FROM user_blocks WHERE user_id = ? AND blocked_id = ?"
    )
    .bind(&auth.0.id)
    .bind(&blocked_id)
    .execute(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn get_blocked_users(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let rows: Vec<(String,)> = sqlx::query_as(
        "SELECT blocked_id FROM user_blocks WHERE user_id = ?"
    )
    .bind(&auth.0.id)
    .fetch_all(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let blocked_ids: Vec<String> = rows.into_iter().map(|(id,)| id).collect();
    Ok(Json(serde_json::json!(blocked_ids)))
}
