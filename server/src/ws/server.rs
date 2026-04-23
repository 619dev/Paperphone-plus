use std::sync::Arc;
use std::collections::HashSet;
use axum::{
    extract::{State, WebSocketUpgrade, ws::{Message, WebSocket}},
    response::IntoResponse,
};
use dashmap::DashMap;
use futures::{SinkExt, StreamExt};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::AppState;
use crate::auth::jwt::verify_token;

/// Thread-safe map of userId -> set of sender channels
#[derive(Default, Clone)]
pub struct WsClients {
    inner: Arc<DashMap<String, HashSet<usize>>>,
    senders: Arc<DashMap<usize, mpsc::UnboundedSender<String>>>,
    sessions: Arc<DashMap<usize, String>>, // conn_id -> session_id
}

static CONN_COUNTER: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

impl WsClients {
    pub fn register(&self, user_id: &str, conn_id: usize, tx: mpsc::UnboundedSender<String>, session_id: Option<&str>) {
        self.inner.entry(user_id.to_string()).or_default().insert(conn_id);
        self.senders.insert(conn_id, tx);
        if let Some(sid) = session_id {
            self.sessions.insert(conn_id, sid.to_string());
        }
    }

    pub fn remove(&self, user_id: &str, conn_id: usize) {
        if let Some(mut set) = self.inner.get_mut(user_id) {
            set.remove(&conn_id);
            if set.is_empty() {
                drop(set);
                self.inner.remove(user_id);
            }
        }
        self.senders.remove(&conn_id);
        self.sessions.remove(&conn_id);
    }

    pub fn send_to_user(&self, user_id: &str, payload: serde_json::Value) -> bool {
        let data = serde_json::to_string(&payload).unwrap_or_default();
        if let Some(set) = self.inner.get(user_id) {
            let mut sent = false;
            for &conn_id in set.iter() {
                if let Some(tx) = self.senders.get(&conn_id) {
                    let _ = tx.send(data.clone());
                    sent = true;
                }
            }
            return sent;
        }
        false
    }

    pub fn is_online(&self, user_id: &str) -> bool {
        self.inner.get(user_id).map(|s| !s.is_empty()).unwrap_or(false)
    }

    pub fn revoke_session(&self, user_id: &str, session_id: &str) {
        if let Some(set) = self.inner.get(user_id) {
            for &conn_id in set.iter() {
                if let Some(sid) = self.sessions.get(&conn_id) {
                    if sid.value() == session_id {
                        if let Some(tx) = self.senders.get(&conn_id) {
                            let _ = tx.send(serde_json::json!({"type":"session_revoked"}).to_string());
                        }
                    }
                }
            }
        }
    }
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let conn_id = CONN_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    let (mut ws_tx, mut ws_rx) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    let mut user_id: Option<String> = None;
    let mut session_id: Option<String>;

    // Spawn task to forward messages from channel to websocket
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_tx.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Process incoming messages
    while let Some(Ok(msg)) = ws_rx.next().await {
        let text = match msg {
            Message::Text(t) => t.to_string(),
            Message::Ping(_) => continue,
            Message::Pong(_) => continue,
            Message::Close(_) => break,
            _ => continue,
        };

        let parsed: serde_json::Value = match serde_json::from_str(&text) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let msg_type = parsed.get("type").and_then(|v| v.as_str()).unwrap_or("");

        // ── AUTH ──────────────────────────────────────────────────
        if msg_type == "auth" {
            let token = parsed.get("token").and_then(|v| v.as_str()).unwrap_or("");
            match verify_token(token, &state.config.jwt_secret) {
                Ok(claims) => {
                    user_id = Some(claims.id.clone());
                    session_id = claims.session_id.clone();

                    // Check if session is revoked
                    if let Some(ref sid) = session_id {
                        let revoked: Option<(i8,)> = sqlx::query_as(
                            "SELECT revoked FROM sessions WHERE id = ? AND user_id = ?"
                        ).bind(sid).bind(&claims.id).fetch_optional(&state.db).await.ok().flatten();

                        if revoked.map(|r| r.0).unwrap_or(0) == 1 {
                            let _ = tx.send(serde_json::json!({"type":"session_revoked"}).to_string());
                            break;
                        }
                    }

                    state.ws_clients.register(&claims.id, conn_id, tx.clone(), session_id.as_deref());

                    // Mark online
                    sqlx::query("UPDATE users SET is_online = 1, last_seen = NOW() WHERE id = ?")
                        .bind(&claims.id).execute(&state.db).await.ok();

                    // Set Redis online
                    if let Ok(mut conn) = state.redis.get().await {
                        let _: Result<(), _> = deadpool_redis::redis::cmd("SET")
                            .arg(format!("online:{}", claims.id))
                            .arg("1")
                            .arg("EX").arg(86400)
                            .query_async(&mut *conn).await;
                    }

                    let _ = tx.send(serde_json::json!({"type":"auth_ok","user_id":claims.id}).to_string());

                    // Set initial heartbeat in Redis (60s TTL)
                    if let Ok(mut conn) = state.redis.get().await {
                        let _: Result<(), _> = deadpool_redis::redis::cmd("SET")
                            .arg(format!("heartbeat:{}", claims.id))
                            .arg("1")
                            .arg("EX").arg(60)
                            .query_async(&mut *conn).await;
                    }

                    // Flush pending call signaling
                    flush_pending_call(&state, &claims.id, &tx).await;

                    // Flush offline messages
                    flush_offline_messages(&state, &claims.id, &tx).await;
                }
                Err(_) => {
                    let _ = tx.send(serde_json::json!({"type":"error","msg":"Auth failed"}).to_string());
                }
            }
            continue;
        }

        let uid = match &user_id {
            Some(id) => id.clone(),
            None => {
                let _ = tx.send(serde_json::json!({"type":"error","msg":"Not authenticated"}).to_string());
                continue;
            }
        };

        // ── HEARTBEAT ────────────────────────────────────────────
        if msg_type == "ping" {
            if let Ok(mut conn) = state.redis.get().await {
                let _: Result<(), _> = deadpool_redis::redis::cmd("SET")
                    .arg(format!("heartbeat:{}", uid))
                    .arg("1")
                    .arg("EX").arg(60)
                    .query_async(&mut *conn).await;
            }
            continue;
        }

        // ── PRIVATE MESSAGE ──────────────────────────────────────
        if msg_type == "message" && parsed.get("to").is_some() && parsed.get("group_id").is_none() {
            let to = parsed["to"].as_str().unwrap_or("");
            let msg_id = Uuid::new_v4().to_string();
            let msg_sub_type = parsed.get("msg_type").and_then(|v| v.as_str()).unwrap_or("text");
            let ciphertext = parsed.get("ciphertext").and_then(|v| v.as_str()).unwrap_or("");
            let header = parsed.get("header").and_then(|v| v.as_str());
            let self_ct = parsed.get("self_ciphertext").and_then(|v| v.as_str());
            let self_hdr = parsed.get("self_header").and_then(|v| v.as_str());
            let ts = chrono::Utc::now().timestamp_millis();

            let envelope = serde_json::json!({
                "type": "message", "id": msg_id, "from": uid, "to": to,
                "msg_type": msg_sub_type, "ciphertext": ciphertext,
                "header": header, "ts": ts,
            });

            let delivered = state.ws_clients.send_to_user(to, envelope);

            sqlx::query(
                "INSERT INTO messages (id, type, from_id, to_id, ciphertext, header, self_ciphertext, self_header, msg_type, delivered) VALUES (?, 'private', ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&msg_id).bind(&uid).bind(to)
            .bind(ciphertext).bind(header).bind(self_ct).bind(self_hdr)
            .bind(msg_sub_type).bind(delivered as i8)
            .execute(&state.db).await.ok();

            // Push notification if offline or stale connection (no recent heartbeat)
            if !delivered || !has_fresh_heartbeat(&state, to).await {
                push_offline_message(&state, &uid, to).await;
            }

            let _ = tx.send(serde_json::json!({"type":"ack","msg_id":msg_id,"ts":ts}).to_string());
        }

        // ── GROUP MESSAGE ────────────────────────────────────────
        if msg_type == "message" && parsed.get("group_id").is_some() {
            let group_id = parsed["group_id"].as_str().unwrap_or("");
            let msg_id = Uuid::new_v4().to_string();
            let msg_sub_type = parsed.get("msg_type").and_then(|v| v.as_str()).unwrap_or("text");
            let ciphertext = parsed.get("ciphertext").and_then(|v| v.as_str()).unwrap_or("");
            let header = parsed.get("header").and_then(|v| v.as_str());
            let ts = chrono::Utc::now().timestamp_millis();

            let sender: Option<(String, Option<String>)> = sqlx::query_as(
                "SELECT nickname, avatar FROM users WHERE id = ?"
            ).bind(&uid).fetch_optional(&state.db).await.ok().flatten();
            let (nick, avatar) = sender.unwrap_or(("".to_string(), None));

            let envelope = serde_json::json!({
                "type": "message", "id": msg_id, "from": uid,
                "from_nickname": nick, "from_avatar": avatar,
                "group_id": group_id, "msg_type": msg_sub_type,
                "ciphertext": ciphertext, "header": header, "ts": ts,
            });

            sqlx::query(
                "INSERT INTO messages (id, type, from_id, to_id, ciphertext, header, msg_type) VALUES (?, 'group', ?, ?, ?, ?, ?)"
            )
            .bind(&msg_id).bind(&uid).bind(group_id)
            .bind(ciphertext).bind(header).bind(msg_sub_type)
            .execute(&state.db).await.ok();

            // Send to all group members except sender
            let members: Vec<(String, i8)> = sqlx::query_as(
                "SELECT user_id, muted FROM group_members WHERE group_id = ?"
            ).bind(group_id).fetch_all(&state.db).await.unwrap_or_default();

            for (member_id, muted) in &members {
                if member_id != &uid {
                    let delivered = state.ws_clients.send_to_user(member_id, envelope.clone());
                    // Push notification if (offline or stale) AND not muted
                    if (!delivered || !has_fresh_heartbeat(&state, member_id).await) && *muted == 0 {
                        push_offline_message(&state, &uid, member_id).await;
                    }
                }
            }

            let _ = tx.send(serde_json::json!({"type":"ack","msg_id":msg_id,"ts":ts}).to_string());
        }

        // ── TYPING ───────────────────────────────────────────────
        if msg_type == "typing" {
            let payload = serde_json::json!({"type":"typing","from":&uid});
            if let Some(group_id) = parsed.get("group_id").and_then(|v| v.as_str()) {
                let members: Vec<(String,)> = sqlx::query_as(
                    "SELECT user_id FROM group_members WHERE group_id = ?"
                ).bind(group_id).fetch_all(&state.db).await.unwrap_or_default();
                for (mid,) in &members {
                    if mid != &uid { state.ws_clients.send_to_user(mid, payload.clone()); }
                }
            } else if let Some(to) = parsed.get("to").and_then(|v| v.as_str()) {
                state.ws_clients.send_to_user(to, payload);
            }
        }

        // ── MSG_READ ─────────────────────────────────────────────
        if msg_type == "msg_read" {
            if let Some(ids) = parsed.get("msg_ids").and_then(|v| v.as_array()) {
                let msg_ids: Vec<String> = ids.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect();
                if !msg_ids.is_empty() {
                    let placeholders = msg_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                    let q = format!("UPDATE messages SET read_at = NOW() WHERE id IN ({}) AND to_id = ? AND read_at IS NULL", placeholders);
                    let mut query = sqlx::query(&q);
                    for id in &msg_ids { query = query.bind(id); }
                    query.bind(&uid).execute(&state.db).await.ok();

                    // Relay read receipt
                    let q2 = format!("SELECT DISTINCT from_id FROM messages WHERE id IN ({})", placeholders);
                    let mut query2 = sqlx::query_as::<_, (String,)>(&q2);
                    for id in &msg_ids { query2 = query2.bind(id); }
                    let senders: Vec<(String,)> = query2.fetch_all(&state.db).await.unwrap_or_default();
                    for (from_id,) in senders {
                        state.ws_clients.send_to_user(&from_id, serde_json::json!({
                            "type": "msg_read", "msg_ids": msg_ids, "reader": uid, "ts": chrono::Utc::now().timestamp_millis()
                        }));
                    }
                }
            }
        }

        // ── CALL SIGNALING ───────────────────────────────────────
        let call_types = ["call_offer", "call_answer", "call_reject", "call_cancel", "call_end", "ice_candidate", "call_invite"];
        if call_types.contains(&msg_type) {
            let mut envelope = parsed.clone();
            envelope["from"] = serde_json::json!(uid);

            if let Some(to) = parsed.get("to").and_then(|v| v.as_str()) {
                state.ws_clients.send_to_user(to, envelope.clone());

                // Store pending call in Redis
                if msg_type == "call_offer" || msg_type == "call_invite" {
                    if let Ok(mut conn) = state.redis.get().await {
                        let data = serde_json::to_string(&envelope).unwrap_or_default();
                        let _: Result<(), _> = deadpool_redis::redis::cmd("SET")
                            .arg(format!("pending_call:{}", to))
                            .arg(&data).arg("EX").arg(60)
                            .query_async(&mut *conn).await;
                    }
                }
            } else if let Some(group_id) = parsed.get("group_id").and_then(|v| v.as_str()) {
                let members: Vec<(String,)> = sqlx::query_as(
                    "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?"
                ).bind(group_id).bind(&uid).fetch_all(&state.db).await.unwrap_or_default();

                for (mid,) in &members {
                    state.ws_clients.send_to_user(mid, envelope.clone());
                    if msg_type == "call_offer" || msg_type == "call_invite" {
                        if let Ok(mut conn) = state.redis.get().await {
                            let data = serde_json::to_string(&envelope).unwrap_or_default();
                            let _: Result<(), _> = deadpool_redis::redis::cmd("SET")
                                .arg(format!("pending_call:{}", mid))
                                .arg(&data).arg("EX").arg(60)
                                .query_async(&mut *conn).await;
                        }
                    }
                }
            }

            // Clean up pending on end/reject/cancel
            if ["call_end", "call_reject", "call_cancel"].contains(&msg_type) {
                if let Ok(mut conn) = state.redis.get().await {
                    if let Some(to) = parsed.get("to").and_then(|v| v.as_str()) {
                        let _: Result<(), _> = deadpool_redis::redis::cmd("DEL")
                            .arg(format!("pending_call:{}", to))
                            .query_async(&mut *conn).await;
                    }
                    let _: Result<(), _> = deadpool_redis::redis::cmd("DEL")
                        .arg(format!("pending_call:{}", uid))
                        .query_async(&mut *conn).await;
                }
            }

            // Push for incoming calls
            if msg_type == "call_offer" || msg_type == "call_invite" {
                push_incoming_call(&state, &uid, &parsed).await;
            }
        }

        // ── GROUP CALL SIGNALING ─────────────────────────────────
        let group_call_types = ["group_call_invite", "group_call_join", "group_call_leave"];
        if group_call_types.contains(&msg_type) {
            let mut envelope = parsed.clone();
            envelope["from"] = serde_json::json!(uid);

            if let Some(group_id) = parsed.get("group_id").and_then(|v| v.as_str()) {
                // For invite, attach sender info and group name
                if msg_type == "group_call_invite" {
                    let sender: Option<(String, Option<String>)> = sqlx::query_as(
                        "SELECT nickname, avatar FROM users WHERE id = ?"
                    ).bind(&uid).fetch_optional(&state.db).await.ok().flatten();
                    if let Some((nick, avatar)) = sender {
                        envelope["from_nickname"] = serde_json::json!(nick);
                        envelope["from_avatar"] = serde_json::json!(avatar);
                    }
                    let group_name: Option<(String,)> = sqlx::query_as(
                        "SELECT name FROM `groups` WHERE id = ?"
                    ).bind(group_id).fetch_optional(&state.db).await.ok().flatten();
                    if let Some((gname,)) = group_name {
                        envelope["group_name"] = serde_json::json!(gname);
                    }
                }

                // Broadcast to all group members except sender
                let members: Vec<(String,)> = sqlx::query_as(
                    "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?"
                ).bind(group_id).bind(&uid).fetch_all(&state.db).await.unwrap_or_default();

                for (mid,) in &members {
                    state.ws_clients.send_to_user(mid, envelope.clone());
                }

                // Push notification for group call invite
                if msg_type == "group_call_invite" {
                    push_incoming_call(&state, &uid, &parsed).await;
                }
            }
        }
    }

    // Cleanup on disconnect
    if let Some(ref uid) = user_id {
        state.ws_clients.remove(uid, conn_id);
        if !state.ws_clients.is_online(uid) {
            sqlx::query("UPDATE users SET is_online = 0, last_seen = NOW() WHERE id = ?")
                .bind(uid).execute(&state.db).await.ok();
            if let Ok(mut conn) = state.redis.get().await {
                let _: Result<(), _> = deadpool_redis::redis::cmd("DEL")
                    .arg(format!("online:{}", uid))
                    .query_async(&mut *conn).await;
                let _: Result<(), _> = deadpool_redis::redis::cmd("DEL")
                    .arg(format!("heartbeat:{}", uid))
                    .query_async(&mut *conn).await;
            }
        }
    }

    send_task.abort();
}

async fn flush_pending_call(state: &Arc<AppState>, user_id: &str, tx: &mpsc::UnboundedSender<String>) {
    if let Ok(mut conn) = state.redis.get().await {
        let raw: Result<Option<String>, _> = deadpool_redis::redis::cmd("GET")
            .arg(format!("pending_call:{}", user_id))
            .query_async(&mut *conn).await;
        if let Ok(Some(data)) = raw {
            let _ = tx.send(data);
            let _: Result<(), _> = deadpool_redis::redis::cmd("DEL")
                .arg(format!("pending_call:{}", user_id))
                .query_async(&mut *conn).await;
        }
    }
}

async fn flush_offline_messages(state: &Arc<AppState>, user_id: &str, tx: &mpsc::UnboundedSender<String>) {
    // Private messages
    let rows: Vec<(String, String, String, String, Option<String>, Option<String>, Option<String>, String, chrono::NaiveDateTime, Option<chrono::NaiveDateTime>)> = sqlx::query_as(
        "SELECT id, from_id, to_id, ciphertext, header, self_ciphertext, self_header, msg_type, created_at, read_at
         FROM messages WHERE to_id = ? AND delivered = 0 AND type = 'private' ORDER BY created_at ASC"
    ).bind(user_id).fetch_all(&state.db).await.unwrap_or_default();

    for (id, from_id, to_id, ct, hdr, _self_ct, _self_hdr, msg_type, created, read_at) in &rows {
        let envelope = serde_json::json!({
            "type": "message", "id": id, "from": from_id, "to": to_id,
            "msg_type": msg_type, "ciphertext": ct, "header": hdr,
            "ts": created.and_utc().timestamp_millis(),
            "read_at": read_at.map(|r| r.and_utc().timestamp_millis()),
            "offline": true,
        });
        let _ = tx.send(serde_json::to_string(&envelope).unwrap_or_default());
        sqlx::query("UPDATE messages SET delivered = 1 WHERE id = ?").bind(id).execute(&state.db).await.ok();
    }

    // Group messages
    let group_rows: Vec<(String, String, String, String, Option<String>, String, chrono::NaiveDateTime, String, Option<String>)> = sqlx::query_as(
        "SELECT m.id, m.from_id, m.to_id, m.ciphertext, m.header, m.msg_type, m.created_at, u.nickname, u.avatar
         FROM messages m LEFT JOIN users u ON u.id = m.from_id
         WHERE m.type = 'group' AND m.to_id IN (SELECT group_id FROM group_members WHERE user_id = ?)
           AND m.from_id != ?
           AND m.created_at > COALESCE(
             (SELECT last_active FROM sessions WHERE user_id = ? AND revoked = 0 ORDER BY last_active DESC LIMIT 1),
             DATE_SUB(NOW(), INTERVAL 7 DAY)
           )
         ORDER BY m.created_at ASC LIMIT 50000"
    ).bind(user_id).bind(user_id).bind(user_id).fetch_all(&state.db).await.unwrap_or_default();

    for (id, from_id, group_id, ct, hdr, msg_type, created, nick, avatar) in &group_rows {
        let envelope = serde_json::json!({
            "type": "message", "id": id, "from": from_id,
            "from_nickname": nick, "from_avatar": avatar,
            "group_id": group_id, "msg_type": msg_type,
            "ciphertext": ct, "header": hdr,
            "ts": created.and_utc().timestamp_millis(),
            "offline": true,
        });
        let _ = tx.send(serde_json::to_string(&envelope).unwrap_or_default());
    }
}

/// Check if user has sent a heartbeat recently (within last 60s).
/// Returns false if heartbeat expired (app backgrounded/suspended) or Redis unavailable.
async fn has_fresh_heartbeat(state: &Arc<AppState>, user_id: &str) -> bool {
    if let Ok(mut conn) = state.redis.get().await {
        let result: Result<Option<String>, _> = deadpool_redis::redis::cmd("GET")
            .arg(format!("heartbeat:{}", user_id))
            .query_async(&mut *conn).await;
        return matches!(result, Ok(Some(_)));
    }
    false
}

async fn push_offline_message(state: &Arc<AppState>, sender_id: &str, recipient_id: &str) {
    let sender: Option<(String, String)> = sqlx::query_as(
        "SELECT nickname, username FROM users WHERE id = ?"
    ).bind(sender_id).fetch_optional(&state.db).await.ok().flatten();
    let name = sender.map(|(n, u)| if n.is_empty() { u } else { n }).unwrap_or("Someone".to_string());

    // Web Push
    crate::services::push::push_to_user(&state.db, &state.config, recipient_id, &name, "sent you a message").await;
    // OneSignal
    crate::services::onesignal::push_to_user(&state.db, &state.config, recipient_id, &name, "sent you a message").await;
    // FCM (Capacitor native)
    crate::services::fcm::push_to_user(&state.db, &state.config, recipient_id, &name, "sent you a message").await;
    // ntfy (Chinese Android without GMS)
    crate::services::ntfy::push_to_user(&state.db, &state.config, recipient_id, &name, "sent you a message").await;
}

async fn push_incoming_call(state: &Arc<AppState>, caller_id: &str, msg: &serde_json::Value) {
    let sender: Option<(String, String)> = sqlx::query_as(
        "SELECT nickname, username FROM users WHERE id = ?"
    ).bind(caller_id).fetch_optional(&state.db).await.ok().flatten();
    let name = sender.map(|(n, u)| if n.is_empty() { u } else { n }).unwrap_or("Someone".to_string());
    let is_video = msg.get("is_video").and_then(|v| v.as_bool()).unwrap_or(false);
    let body = if is_video { format!("{} invites you to a video call", name) } else { format!("{} invites you to a voice call", name) };

    if let Some(to) = msg.get("to").and_then(|v| v.as_str()) {
        crate::services::push::push_to_user(&state.db, &state.config, to, "PaperPhone", &body).await;
        crate::services::onesignal::push_to_user(&state.db, &state.config, to, "PaperPhone", &body).await;
        crate::services::fcm::push_to_user(&state.db, &state.config, to, "PaperPhone", &body).await;
        crate::services::ntfy::push_to_user(&state.db, &state.config, to, "PaperPhone", &body).await;
    } else if let Some(group_id) = msg.get("group_id").and_then(|v| v.as_str()) {
        let members: Vec<(String,)> = sqlx::query_as(
            "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?"
        ).bind(group_id).bind(caller_id).fetch_all(&state.db).await.unwrap_or_default();
        for (mid,) in members {
            crate::services::push::push_to_user(&state.db, &state.config, &mid, "PaperPhone", &body).await;
            crate::services::onesignal::push_to_user(&state.db, &state.config, &mid, "PaperPhone", &body).await;
            crate::services::fcm::push_to_user(&state.db, &state.config, &mid, "PaperPhone", &body).await;
            crate::services::ntfy::push_to_user(&state.db, &state.config, &mid, "PaperPhone", &body).await;
        }
    }
}
