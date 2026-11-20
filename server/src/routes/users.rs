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
        .route("/account-deletion", get(get_account_deletion).put(update_account_deletion))
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
    let query = params.q.trim();
    if query.is_empty() {
        return Ok(Json(serde_json::json!([])));
    }

    let rows: Vec<(String, String, String, Option<String>, i8)> = sqlx::query_as(
        "SELECT id, username, nickname, avatar, is_online \
         FROM users \
         WHERE CONVERT(username USING utf8mb4) COLLATE utf8mb4_unicode_ci \
                   LIKE CONCAT('%', CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci, '%') \
            OR CONVERT(nickname USING utf8mb4) COLLATE utf8mb4_unicode_ci \
                   LIKE CONCAT('%', CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci, '%') \
         LIMIT 20"
    )
    .bind(query).bind(query)
    .fetch_all(&state.db).await
    .map_err(|e| {
        // Log only lengths, not the searched username itself.
        tracing::error!(
            query_bytes = query.len(),
            query_chars = query.chars().count(),
            error = %e,
            "User search query failed"
        );
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "User search failed" })),
        )
    })?;

    tracing::debug!(
        query_bytes = query.len(),
        query_chars = query.chars().count(),
        result_count = rows.len(),
        "User search completed"
    );

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

    let updated = sqlx::query("UPDATE users SET password = ? WHERE id = ? AND password = ?")
        .bind(&new_hash).bind(&auth.0.id).bind(&pw_hash)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
    if updated.rows_affected() == 0 {
        return Err((axum::http::StatusCode::CONFLICT, Json(serde_json::json!({ "error": "Password changed during request" }))));
    }

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

    super::groups::rotate_identity_groups(&state, &auth.0.id).await?;

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
    super::groups::rotate_identity_groups(&state, &auth.0.id).await?;
    Ok(Json(serde_json::json!({"ok":true})))
}

type ApiError = (axum::http::StatusCode, Json<serde_json::Value>);

fn account_db_error(error: sqlx::Error) -> ApiError {
    tracing::error!(%error, "Account deletion operation failed");
    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
        "error": "Account operation failed"
    })))
}

#[derive(Deserialize)]
struct AccountDeletionSettings {
    inactivity_months: u8,
}

async fn get_account_deletion(
    State(state): State<Arc<AppState>>, auth: AuthUser,
) -> Result<Json<serde_json::Value>, ApiError> {
    let months: u8 = sqlx::query_scalar("SELECT inactivity_months FROM users WHERE id = ?")
        .bind(&auth.0.id).fetch_one(&state.db).await.map_err(account_db_error)?;
    Ok(Json(serde_json::json!({ "inactivity_months": months })))
}

async fn update_account_deletion(
    State(state): State<Arc<AppState>>, auth: AuthUser, Json(body): Json<AccountDeletionSettings>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !matches!(body.inactivity_months, 3 | 6 | 12 | 24 | 36) {
        return Err((axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "Unsupported account inactivity period"
        }))));
    }
    sqlx::query("UPDATE users SET inactivity_months = ? WHERE id = ?")
        .bind(body.inactivity_months).bind(&auth.0.id)
        .execute(&state.db).await.map_err(account_db_error)?;
    Ok(Json(serde_json::json!({ "inactivity_months": body.inactivity_months })))
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

    remove_account(&state, &auth.0.id, false).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub(crate) async fn purge_inactive_accounts(state: &AppState) -> Result<(), sqlx::Error> {
    let mut cursor = String::new();
    loop {
        let accounts: Vec<String> = sqlx::query_scalar(
            "SELECT id FROM users WHERE id > ?
             AND DATE_ADD(COALESCE(last_login_at, created_at), INTERVAL inactivity_months MONTH) <= NOW()
             ORDER BY id LIMIT 100"
        )
        .bind(&cursor).fetch_all(&state.db).await?;

        for uid in &accounts {
            if let Err((status, Json(body))) = remove_account(state, uid, true).await {
                tracing::warn!(user_id = %uid, %status, error = %body, "Unable to purge inactive account");
            }
        }
        match accounts.into_iter().last() {
            Some(uid) => cursor = uid,
            None => return Ok(()),
        }
    }
}

async fn remove_account(state: &AppState, uid: &str, inactive_only: bool) -> Result<(), ApiError> {
    let mut tx = state.db.begin().await.map_err(account_db_error)?;

    // Serialize deletion with login and settings changes, and recheck eligibility
    // after acquiring the lock in case the scheduled query saw an older snapshot.
    let user: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM users WHERE id = ?
         AND (? = 0 OR DATE_ADD(COALESCE(last_login_at, created_at), INTERVAL inactivity_months MONTH) <= NOW())
         FOR UPDATE"
    )
    .bind(uid).bind(inactive_only).fetch_optional(&mut *tx).await.map_err(account_db_error)?;
    if user.is_none() {
        return Ok(());
    }

    let memberships: Vec<String> = sqlx::query_scalar(
        "SELECT gm.group_id FROM group_members gm JOIN `groups` g ON g.id = gm.group_id
         WHERE gm.user_id = ? AND g.owner_id <> ? ORDER BY gm.group_id"
    )
    .bind(uid).bind(uid).fetch_all(&mut *tx).await.map_err(account_db_error)?;
    let mut rotations = Vec::new();
    for group in memberships {
        let epoch = match super::groups::lock_epoch(&mut tx, &group).await {
            Ok(epoch) => epoch,
            Err((axum::http::StatusCode::NOT_FOUND, _)) => continue,
            Err(error) => return Err(error),
        };
        if let Some(next) = super::groups::remove_member_and_rotate(&mut tx, &group, uid, epoch).await? {
            rotations.push((group, next));
        }
    }

    // Group sends lock the group before the message barrier. Keep the same order.
    let owned_groups: Vec<String> = sqlx::query_scalar("SELECT id FROM `groups` WHERE owner_id = ? FOR UPDATE")
        .bind(uid).fetch_all(&mut *tx).await.map_err(account_db_error)?;
    sqlx::query("SELECT id FROM message_sync_barrier WHERE id = 1 FOR UPDATE")
        .fetch_one(&mut *tx).await.map_err(account_db_error)?;

    sqlx::query("DELETE FROM messages WHERE from_id = ? OR (type = 'private' AND to_id = ?)")
        .bind(uid).bind(uid).execute(&mut *tx).await.map_err(account_db_error)?;
    for group in owned_groups {
        sqlx::query("DELETE FROM messages WHERE type = 'group' AND to_id = ?")
            .bind(group).execute(&mut *tx).await.map_err(account_db_error)?;
    }

    sqlx::query("DELETE FROM `groups` WHERE owner_id = ?")
        .bind(uid).execute(&mut *tx).await.map_err(account_db_error)?;
    sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(uid).execute(&mut *tx).await.map_err(account_db_error)?;
    tx.commit().await.map_err(account_db_error)?;

    state.ws_clients.disconnect_deleted_account(uid);

    for (group, epoch) in rotations {
        super::groups::notify_rotation(state, &group, epoch, Some(uid)).await;
    }

    // Clean up Redis
    if let Ok(mut conn) = state.redis.get().await {
        let _: Result<(), _> = deadpool_redis::redis::cmd("DEL")
            .arg(format!("online:{}", uid))
            .arg(format!("heartbeat:{}", uid))
            .query_async(&mut *conn).await;
    }

    tracing::info!("🗑️ Account deleted: user_id={}", uid);

    Ok(())
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
