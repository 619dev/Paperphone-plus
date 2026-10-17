use std::sync::Arc;
use axum::{Router, routing::{get, post, put, delete}, extract::{State, Path, Query}, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::AppState;
use crate::auth::middleware::AuthUser;

type ApiError = (axum::http::StatusCode, Json<serde_json::Value>);
fn fail(status: axum::http::StatusCode, message: &str) -> ApiError {
    (status, Json(serde_json::json!({ "error": message })))
}
fn db_error(error: sqlx::Error) -> ApiError {
    tracing::error!("Group transaction failed: {}", error);
    fail(axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Group operation failed")
}
async fn require_member(db: &sqlx::MySqlPool, group: &str, user: &str) -> Result<(), ApiError> {
    let member: Option<(String,)> = sqlx::query_as("SELECT user_id FROM group_members WHERE group_id=? AND user_id=?")
        .bind(group).bind(user).fetch_optional(db).await.map_err(db_error)?;
    if member.is_none() { return Err(fail(axum::http::StatusCode::FORBIDDEN, "Not a group member")); }
    Ok(())
}
async fn lock_epoch(tx: &mut sqlx::Transaction<'_, sqlx::MySql>, group: &str) -> Result<u32, ApiError> {
    let row: Option<(u32,)> = sqlx::query_as("SELECT key_epoch FROM `groups` WHERE id=? FOR UPDATE")
        .bind(group).fetch_optional(&mut **tx).await.map_err(db_error)?;
    row.map(|r| r.0).ok_or_else(|| fail(axum::http::StatusCode::NOT_FOUND, "Group not found"))
}
async fn advance_epoch(tx: &mut sqlx::Transaction<'_, sqlx::MySql>, group: &str, epoch: u32) -> Result<u32, ApiError> {
    let next = epoch.checked_add(1).ok_or_else(|| fail(axum::http::StatusCode::CONFLICT, "Group epoch exhausted"))?;
    sqlx::query("UPDATE `groups` SET key_epoch=? WHERE id=?").bind(next).bind(group).execute(&mut **tx).await.map_err(db_error)?;
    sqlx::query("DELETE FROM group_sender_keys WHERE group_id=?").bind(group).execute(&mut **tx).await.map_err(db_error)?;
    Ok(next)
}
async fn notify_rotation(state: &AppState, group: &str, epoch: u32, removed: Option<&str>) {
    let members: Vec<(String,)> = sqlx::query_as("SELECT user_id FROM group_members WHERE group_id=?")
        .bind(group).fetch_all(&state.db).await.unwrap_or_default();
    for (id,) in members {
        state.ws_clients.send_to_user(&id, serde_json::json!({ "type":"sender_key_rotate", "group_id":group, "key_epoch":epoch, "removed_user":removed }));
    }
}

const MAX_GROUP_MEMBERS: usize = 2000;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_groups).post(create_group))
        .route("/search", get(search_groups))
        .route("/{id}", get(get_group).put(update_group).delete(disband_group))
        .route("/{id}/members", post(add_members))
        .route("/{id}/members/{user_id}", delete(remove_member))
        .route("/{id}/leave", post(leave_group))
        .route("/{id}/mute", post(toggle_mute))
        .route("/{id}/invite", post(create_invite))
        .route("/join/{invite_id}", post(join_by_invite))
        .route("/{id}/auto-delete", put(update_auto_delete))
        .route("/{id}/encryption", put(toggle_encryption))
        .route("/{id}/sender-keys", post(upload_sender_keys).get(get_sender_keys))
}

#[derive(Deserialize)]
struct CreateGroupReq {
    name: String,
    member_ids: Option<Vec<String>>,
}

async fn create_group(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<CreateGroupReq>,
) -> Result<(axum::http::StatusCode, Json<serde_json::Value>), (axum::http::StatusCode, Json<serde_json::Value>)> {
    let id = Uuid::new_v4().to_string();
    let mut members: std::collections::BTreeSet<String> = body.member_ids.unwrap_or_default().into_iter().collect();
    members.insert(auth.0.id.clone());
    if members.len() > MAX_GROUP_MEMBERS { return Err(fail(axum::http::StatusCode::BAD_REQUEST, "Group member limit exceeded")); }
    let mut tx = state.db.begin().await.map_err(db_error)?;
    sqlx::query("INSERT INTO `groups` (id,name,owner_id,encrypted,signed_protocol) VALUES (?,?,?,1,1)")
        .bind(&id).bind(&body.name).bind(&auth.0.id).execute(&mut *tx).await.map_err(db_error)?;
    for member in &members {
        sqlx::query("INSERT INTO group_members (group_id,user_id,role,joined_epoch) VALUES (?,?,?,1)")
            .bind(&id).bind(member).bind(if member==&auth.0.id {"owner"} else {"member"}).execute(&mut *tx).await.map_err(db_error)?;
    }
    tx.commit().await.map_err(db_error)?;
    for member in members {
        state.ws_clients.send_to_user(&member, serde_json::json!({"type":"group_member_added","group_id":id,"group_name":body.name,"added_by":auth.0.id,"key_epoch":1}));
    }
    Ok((axum::http::StatusCode::CREATED, Json(serde_json::json!({"id":id,"name":body.name}))))
}

async fn list_groups(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let rows: Vec<(String, String, Option<String>, String, Option<String>, i32, i8, i8)> = sqlx::query_as(
        "SELECT g.id, g.name, g.avatar, g.owner_id, g.notice, g.auto_delete, gm.muted, g.encrypted
         FROM `groups` g JOIN group_members gm ON gm.group_id = g.id
         WHERE gm.user_id = ?"
    )
    .bind(&auth.0.id)
    .fetch_all(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let groups: Vec<serde_json::Value> = rows.iter().map(|(id, name, avatar, owner_id, notice, auto_del, muted, encrypted)| {
        serde_json::json!({ "id": id, "name": name, "avatar": avatar, "owner_id": owner_id, "notice": notice, "auto_delete": auto_del, "muted": *muted == 1, "encrypted": *encrypted == 1 })
    }).collect();

    Ok(Json(serde_json::json!(groups)))
}

async fn get_group(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    require_member(&state.db, &id, &auth.0.id).await?;
    let group: Option<(String, String, Option<String>, String, Option<String>, i32, i8, u32)> = sqlx::query_as(
        "SELECT id, name, avatar, owner_id, notice, auto_delete, encrypted, key_epoch FROM `groups` WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let (gid, name, avatar, owner_id, notice, auto_del, encrypted, key_epoch) = group
        .ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Group not found" }))))?;

    // Get members
    let members: Vec<(String, String, String, Option<String>, String, i8, String, String)> = sqlx::query_as(
        "SELECT u.id, u.username, u.nickname, u.avatar, gm.role, gm.muted, u.ik_pub, u.kem_pub
         FROM group_members gm JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = ?"
    )
    .bind(&id)
    .fetch_all(&state.db).await.unwrap_or_default();

    let member_list: Vec<serde_json::Value> = members.iter().map(|(uid, username, nickname, avatar, role, muted, ik, sign)| {
        serde_json::json!({ "id": uid, "username": username, "nickname": nickname, "avatar": avatar, "role": role, "muted": *muted == 1, "ik_pub":ik, "kem_pub":sign })
    }).collect();

    Ok(Json(serde_json::json!({
        "id": gid, "name": name, "avatar": avatar, "owner_id": owner_id,
        "notice": notice, "auto_delete": auto_del, "encrypted": encrypted == 1, "key_epoch":key_epoch, "members": member_list
    })))
}

#[derive(Deserialize)]
struct UpdateGroupReq {
    name: Option<String>,
    avatar: Option<String>,
    notice: Option<String>,
}

async fn update_group(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<UpdateGroupReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let role: Option<(String,)> = sqlx::query_as("SELECT role FROM group_members WHERE group_id=? AND user_id=?")
        .bind(&id).bind(&auth.0.id).fetch_optional(&state.db).await.map_err(db_error)?;
    if !matches!(role.as_ref().map(|r|r.0.as_str()), Some("owner") | Some("admin")) { return Err(fail(axum::http::StatusCode::FORBIDDEN, "Only group administrators can edit the group")); }
    if let Some(name) = &body.name {
        sqlx::query("UPDATE `groups` SET name = ? WHERE id = ?").bind(name).bind(&id).execute(&state.db).await.ok();
    }
    if let Some(avatar) = &body.avatar {
        sqlx::query("UPDATE `groups` SET avatar = ? WHERE id = ?").bind(avatar).bind(&id).execute(&state.db).await.ok();
    }
    if let Some(notice) = &body.notice {
        sqlx::query("UPDATE `groups` SET notice = ? WHERE id = ?").bind(notice).bind(&id).execute(&state.db).await.ok();
    }
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn disband_group(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    // Only owner can disband
    let owner: Option<(String,)> = sqlx::query_as("SELECT owner_id FROM `groups` WHERE id = ?")
        .bind(&id).fetch_optional(&state.db).await.ok().flatten();
    if owner.map(|o| o.0) != Some(auth.0.id.clone()) {
        return Err((axum::http::StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Only owner can disband" }))));
    }
    let members: Vec<(String,)> = sqlx::query_as("SELECT user_id FROM group_members WHERE group_id=?").bind(&id).fetch_all(&state.db).await.map_err(db_error)?;
    sqlx::query("DELETE FROM `groups` WHERE id=?").bind(&id).execute(&state.db).await.map_err(db_error)?;
    for (member,) in members { state.ws_clients.send_to_user(&member, serde_json::json!({"type":"group_removed","group_id":id})); }
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct AddMembersReq {
    user_ids: Vec<String>,
}

async fn add_members(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(group_id): Path<String>,
    Json(body): Json<AddMembersReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let mut tx = state.db.begin().await.map_err(db_error)?;
    let epoch = lock_epoch(&mut tx, &group_id).await?;
    let member: Option<(String,)> = sqlx::query_as("SELECT user_id FROM group_members WHERE group_id=? AND user_id=?")
        .bind(&group_id).bind(&auth.0.id).fetch_optional(&mut *tx).await.map_err(db_error)?;
    if member.is_none() { return Err(fail(axum::http::StatusCode::FORBIDDEN, "Not a group member")); }
    let (current,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM group_members WHERE group_id=?")
        .bind(&group_id).fetch_one(&mut *tx).await.map_err(db_error)?;
    let unique: std::collections::BTreeSet<_> = body.user_ids.iter().collect();
    if current as usize + unique.len() > MAX_GROUP_MEMBERS { return Err(fail(axum::http::StatusCode::BAD_REQUEST, "Group member limit exceeded")); }
    let next = epoch.checked_add(1).ok_or_else(|| fail(axum::http::StatusCode::CONFLICT, "Group epoch exhausted"))?;
    let mut added = Vec::new();
    for uid in unique {
        let result = sqlx::query("INSERT IGNORE INTO group_members (group_id,user_id,joined_epoch) VALUES (?,?,?)")
            .bind(&group_id).bind(uid).bind(next).execute(&mut *tx).await.map_err(db_error)?;
        if result.rows_affected() > 0 { added.push(uid.clone()); }
    }
    let new_epoch = if added.is_empty() { epoch } else { advance_epoch(&mut tx, &group_id, epoch).await? };
    tx.commit().await.map_err(db_error)?;
    if !added.is_empty() {
        notify_rotation(&state, &group_id, new_epoch, None).await;
        for uid in added { state.ws_clients.send_to_user(&uid, serde_json::json!({"type":"group_member_added","group_id":group_id,"key_epoch":new_epoch})); }
    }
    Ok(Json(serde_json::json!({"ok":true,"key_epoch":new_epoch})))
}

pub(crate) async fn revoke_member(state: &AppState, actor: &str, group: &str, user: &str, leaving: bool) -> Result<u32, ApiError> {
    let mut tx = state.db.begin().await.map_err(db_error)?;
    let epoch = lock_epoch(&mut tx, group).await?;
    let role: Option<(String,)> = sqlx::query_as("SELECT role FROM group_members WHERE group_id=? AND user_id=?")
        .bind(group).bind(actor).fetch_optional(&mut *tx).await.map_err(db_error)?;
    if role.is_none() || (!leaving && !matches!(role.as_ref().map(|r|r.0.as_str()), Some("owner") | Some("admin"))) {
        return Err(fail(axum::http::StatusCode::FORBIDDEN, "Only group administrators can remove members"));
    }
    let target: Option<(String,)> = sqlx::query_as("SELECT role FROM group_members WHERE group_id=? AND user_id=?")
        .bind(group).bind(user).fetch_optional(&mut *tx).await.map_err(db_error)?;
    let target = target.ok_or_else(|| fail(axum::http::StatusCode::NOT_FOUND, "Member not found"))?.0;
    if target == "owner" || (!leaving && target == "admin" && role.as_ref().map(|r|r.0.as_str()) != Some("owner")) {
        return Err(fail(axum::http::StatusCode::FORBIDDEN, "Cannot remove group owner or peer administrator"));
    }
    sqlx::query("DELETE FROM group_members WHERE group_id=? AND user_id=?").bind(group).bind(user).execute(&mut *tx).await.map_err(db_error)?;
    // Remaining recipients retain historical distributions for offline catch-up.
    // The departed member loses every downloadable distribution, including history.
    sqlx::query("DELETE FROM group_sender_key_distributions WHERE group_id=? AND to_id=?")
        .bind(group).bind(user).execute(&mut *tx).await.map_err(db_error)?;
    let next = advance_epoch(&mut tx, group, epoch).await?;
    tx.commit().await.map_err(db_error)?;
    state.ws_clients.send_to_user(user, serde_json::json!({"type":"group_removed","group_id":group,"key_epoch":next}));
    notify_rotation(state, group, next, Some(user)).await;
    Ok(next)
}

async fn remove_member(State(state): State<Arc<AppState>>, auth: AuthUser, Path((group_id,user_id)): Path<(String,String)>) -> Result<Json<serde_json::Value>, ApiError> {
    let epoch = revoke_member(&state, &auth.0.id, &group_id, &user_id, false).await?;
    Ok(Json(serde_json::json!({"ok":true,"key_epoch":epoch})))
}
async fn leave_group(State(state): State<Arc<AppState>>, auth: AuthUser, Path(id): Path<String>) -> Result<Json<serde_json::Value>, ApiError> {
    let epoch = revoke_member(&state, &auth.0.id, &id, &auth.0.id, true).await?;
    Ok(Json(serde_json::json!({"ok":true,"key_epoch":epoch})))
}

#[derive(Deserialize)]
struct MuteReq { muted: bool }

async fn toggle_mute(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<MuteReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("UPDATE group_members SET muted = ? WHERE group_id = ? AND user_id = ?")
        .bind(body.muted as i8).bind(&id).bind(&auth.0.id)
        .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct InviteReq {
    expires_days: Option<i32>,
}

async fn create_invite(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(group_id): Path<String>,
    Json(body): Json<InviteReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    require_member(&state.db, &group_id, &auth.0.id).await?;
    let invite_id = Uuid::new_v4().to_string();
    let days = body.expires_days.unwrap_or(7);

    sqlx::query("INSERT INTO group_invites (id, group_id, created_by, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))")
        .bind(&invite_id).bind(&group_id).bind(&auth.0.id).bind(days)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    Ok(Json(serde_json::json!({ "invite_id": invite_id })))
}

async fn join_by_invite(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(invite_id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let invite: Option<(String,)> = sqlx::query_as(
        "SELECT group_id FROM group_invites WHERE id = ? AND expires_at > NOW()"
    )
    .bind(&invite_id)
    .fetch_optional(&state.db).await
    .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let (group_id,) = invite
        .ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Invalid or expired invite" }))))?;

    let mut tx = state.db.begin().await.map_err(db_error)?;
    let epoch = lock_epoch(&mut tx, &group_id).await?;
    let (count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM group_members WHERE group_id=?")
        .bind(&group_id).fetch_one(&mut *tx).await.map_err(db_error)?;
    if count as usize >= MAX_GROUP_MEMBERS { return Err(fail(axum::http::StatusCode::BAD_REQUEST, "Group member limit exceeded")); }
    let next = epoch.checked_add(1).ok_or_else(|| fail(axum::http::StatusCode::CONFLICT, "Group epoch exhausted"))?;
    let result = sqlx::query("INSERT IGNORE INTO group_members (group_id,user_id,joined_epoch) VALUES (?,?,?)")
        .bind(&group_id).bind(&auth.0.id).bind(next).execute(&mut *tx).await.map_err(db_error)?;
    let changed = result.rows_affected() > 0;
    let epoch = if changed { advance_epoch(&mut tx, &group_id, epoch).await? } else { epoch };
    tx.commit().await.map_err(db_error)?;
    if changed { notify_rotation(&state, &group_id, epoch, None).await; }
    Ok(Json(serde_json::json!({"ok":true,"group_id":group_id,"key_epoch":epoch})))
}

#[derive(Deserialize)]
struct SearchQuery { q: String }

async fn search_groups(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Query(params): Query<SearchQuery>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let pattern = format!("%{}%", params.q);
    let rows: Vec<(String, String, Option<String>)> = sqlx::query_as(
        "SELECT id, name, avatar FROM `groups` WHERE name LIKE ? LIMIT 20"
    )
    .bind(&pattern)
    .fetch_all(&state.db).await.unwrap_or_default();

    let groups: Vec<serde_json::Value> = rows.iter().map(|(id, name, avatar)| {
        serde_json::json!({ "id": id, "name": name, "avatar": avatar })
    }).collect();

    Ok(Json(serde_json::json!(groups)))
}

#[derive(Deserialize)]
struct AutoDeleteReq { auto_delete: i32 }

async fn update_auto_delete(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<AutoDeleteReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    const ALLOWED: [i32; 5] = [0, 86400, 259200, 604800, 2592000];
    if !ALLOWED.contains(&body.auto_delete) {
        return Err((axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid auto_delete value" }))));
    }
    // Only group owner can change auto_delete
    let owner: Option<(String,)> = sqlx::query_as("SELECT owner_id FROM `groups` WHERE id = ?")
        .bind(&id).fetch_optional(&state.db).await.ok().flatten();
    if owner.as_ref().map(|o| o.0.as_str()) != Some(&auth.0.id) {
        return Err((axum::http::StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Only the group owner can change auto-delete" }))));
    }
    sqlx::query("UPDATE `groups` SET auto_delete = ? WHERE id = ?")
        .bind(body.auto_delete).bind(&id)
        .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

// ── Group Encryption Toggle ─────────────────────────────────────────────

#[derive(Deserialize)]
struct EncryptionReq { encrypted: bool }

async fn toggle_encryption(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<EncryptionReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    if !body.encrypted { return Err(fail(axum::http::StatusCode::BAD_REQUEST, "Group encryption is required")); }
    // Only group owner can toggle encryption
    let owner: Option<(String,)> = sqlx::query_as("SELECT owner_id FROM `groups` WHERE id = ?")
        .bind(&id).fetch_optional(&state.db).await.ok().flatten();
    if owner.as_ref().map(|o| o.0.as_str()) != Some(&auth.0.id) {
        return Err((axum::http::StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Only the group owner can toggle encryption" }))));
    }

    Ok(Json(serde_json::json!({"ok":true,"encrypted":true})))
}

/// Identity-key changes are membership-security changes too. Offline members
/// discover the new epoch on recovery, without depending on a transient event.
pub(crate) async fn rotate_identity_groups(state: &AppState, user: &str) -> Result<(), ApiError> {
    let groups: Vec<(String,)> = sqlx::query_as("SELECT group_id FROM group_members WHERE user_id=? ORDER BY group_id")
        .bind(user).fetch_all(&state.db).await.map_err(db_error)?;
    for (group,) in groups {
        let mut tx = state.db.begin().await.map_err(db_error)?;
        let epoch = lock_epoch(&mut tx, &group).await?;
        let next = advance_epoch(&mut tx, &group, epoch).await?;
        tx.commit().await.map_err(db_error)?;
        notify_rotation(state, &group, next, None).await;
    }
    Ok(())
}

// ── Sender Key Management ───────────────────────────────────────────────

#[derive(Deserialize)]
struct SenderKeyUpload {
    distributions: Vec<SenderKeyDistEntry>,
    key_version: u32,
}

#[derive(Deserialize)]
struct SenderKeyDistEntry {
    to_id: String,
    encrypted_key: String,
    header: String,
}

async fn upload_sender_keys(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(group_id): Path<String>,
    Json(body): Json<SenderKeyUpload>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let mut tx = state.db.begin().await.map_err(db_error)?;
    let epoch = lock_epoch(&mut tx, &group_id).await?;
    if body.key_version != epoch { return Err(fail(axum::http::StatusCode::CONFLICT, "Sender key epoch expired; refresh group membership")); }
    let members: Vec<(String,)> = sqlx::query_as("SELECT user_id FROM group_members WHERE group_id=?")
        .bind(&group_id).fetch_all(&mut *tx).await.map_err(db_error)?;
    let expected: std::collections::BTreeSet<_> = members.iter().map(|m|m.0.as_str()).collect();
    if !expected.contains(auth.0.id.as_str()) { return Err(fail(axum::http::StatusCode::FORBIDDEN, "Not a group member")); }
    let actual: std::collections::BTreeSet<_> = body.distributions.iter().map(|d|d.to_id.as_str()).collect();
    if expected != actual || actual.len() != body.distributions.len() || body.distributions.iter().any(|d| !d.header.starts_with("pps1.") || d.encrypted_key.is_empty()) {
        return Err(fail(axum::http::StatusCode::BAD_REQUEST, "Signed key distributions must cover exactly the current members, including self"));
    }
    let published: Option<(u32,)> = sqlx::query_as("SELECT key_version FROM group_sender_keys WHERE group_id=? AND user_id=?")
        .bind(&group_id).bind(&auth.0.id).fetch_optional(&mut *tx).await.map_err(db_error)?;
    if published.is_some() { return Err(fail(axum::http::StatusCode::CONFLICT, "Sender key already published; fetch existing key")); }
    sqlx::query("INSERT INTO group_sender_keys (group_id,user_id,key_version) VALUES (?,?,?)")
        .bind(&group_id).bind(&auth.0.id).bind(epoch).execute(&mut *tx).await.map_err(db_error)?;
    for dist in &body.distributions {
        sqlx::query("INSERT INTO group_sender_key_distributions (group_id,from_id,to_id,encrypted_key,header,key_version) VALUES (?,?,?,?,?,?)")
            .bind(&group_id).bind(&auth.0.id).bind(&dist.to_id).bind(&dist.encrypted_key).bind(&dist.header).bind(epoch)
            .execute(&mut *tx).await.map_err(db_error)?;
    }
    tx.commit().await.map_err(db_error)?;
    for dist in &body.distributions {
        state.ws_clients.send_to_user(&dist.to_id, serde_json::json!({"type":"sender_key_distribution","group_id":group_id,"from_id":auth.0.id,"to_id":dist.to_id,"encrypted_key":dist.encrypted_key,"header":dist.header,"key_version":epoch}));
    }
    Ok(Json(serde_json::json!({"ok":true,"key_epoch":epoch})))
}

async fn get_sender_keys(State(state): State<Arc<AppState>>, auth: AuthUser, Path(group_id): Path<String>) -> Result<Json<serde_json::Value>, ApiError> {
    require_member(&state.db, &group_id, &auth.0.id).await?;
    let rows: Vec<(String,String,String,u32)> = sqlx::query_as(
        "SELECT d.from_id,d.encrypted_key,d.header,d.key_version FROM group_sender_key_distributions d
         JOIN group_members gm ON gm.group_id=d.group_id AND gm.user_id=d.to_id
         WHERE d.group_id=? AND d.to_id=? AND d.key_version>=gm.joined_epoch ORDER BY d.key_version ASC")
        .bind(&group_id).bind(&auth.0.id).fetch_all(&state.db).await.map_err(db_error)?;
    let keys: Vec<_> = rows.into_iter().map(|(from,encrypted,header,epoch)| serde_json::json!({"from_id":from,"to_id":auth.0.id,"encrypted_key":encrypted,"header":header,"key_version":epoch})).collect();
    let (epoch,): (u32,) = sqlx::query_as("SELECT key_epoch FROM `groups` WHERE id=?").bind(&group_id).fetch_one(&state.db).await.map_err(db_error)?;
    Ok(Json(serde_json::json!({"keys":keys,"key_epoch":epoch})))
}

#[cfg(test)]
#[path = "groups_security_tests.rs"]
mod security_tests;
