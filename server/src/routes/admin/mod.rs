use std::sync::Arc;
use axum::{
    Router, routing::{get, post, delete},
    extract::{State, Path, Query},
    Json, response::Html,
};
use serde::Deserialize;

use crate::AppState;

mod html;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(admin_page))
        .route("/api/login", post(admin_login))
        .route("/api/stats", get(admin_stats))
        .route("/api/reports", get(list_reports))
        .route("/api/reports/{id}/review", post(review_report))
        .route("/api/reports/{id}/dismiss", post(dismiss_report))
        .route("/api/content/{content_type}/{id}", delete(delete_content))
        .route("/api/users/{id}/ban", post(ban_user))
}

async fn admin_page(State(state): State<Arc<AppState>>) -> Html<String> {
    let page = html::ADMIN_HTML.replace("{{ADMIN_PATH}}", &state.config.admin_path);
    Html(page)
}

#[derive(Deserialize)]
struct LoginReq { password: String }

async fn admin_login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    if body.password != state.config.admin_password {
        return Err((axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error":"Invalid password"}))));
    }
    // Simple token: hash of password + timestamp (good enough for admin panel)
    let ts = chrono::Utc::now().timestamp();
    let raw = format!("{}:{}:{}", state.config.admin_password, state.config.jwt_secret, ts);
    let hash = format!("{:x}", sha2::Sha256::digest(raw.as_bytes()));
    let token = format!("{}:{}", ts, hash);
    Ok(Json(serde_json::json!({"ok":true,"token":token})))
}

use sha2::Digest;

fn verify_admin_token(token: &str, state: &AppState) -> bool {
    let parts: Vec<&str> = token.splitn(2, ':').collect();
    if parts.len() != 2 { return false; }
    let ts: i64 = parts[0].parse().unwrap_or(0);
    // Token valid for 24h
    if chrono::Utc::now().timestamp() - ts > 86400 { return false; }
    let raw = format!("{}:{}:{}", state.config.admin_password, state.config.jwt_secret, ts);
    let expected = format!("{:x}", sha2::Sha256::digest(raw.as_bytes()));
    parts[1] == expected
}

fn extract_admin_token(headers: &axum::http::HeaderMap) -> Option<String> {
    headers.get("authorization")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim_start_matches("Bearer ").to_string())
}

macro_rules! require_admin {
    ($headers:expr, $state:expr) => {
        match extract_admin_token(&$headers) {
            Some(t) if verify_admin_token(&t, &$state) => {},
            _ => return Err((axum::http::StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error":"Unauthorized"})))),
        }
    };
}

async fn admin_stats(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    require_admin!(headers, state);
    let users: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users").fetch_one(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":e.to_string()}))))?;
    let reports_pending: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM reports WHERE status='pending'").fetch_one(&state.db).await.unwrap_or((0,));
    let reports_total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM reports").fetch_one(&state.db).await.unwrap_or((0,));
    let blocks: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM user_blocks").fetch_one(&state.db).await.unwrap_or((0,));
    Ok(Json(serde_json::json!({
        "users": users.0, "reports_pending": reports_pending.0,
        "reports_total": reports_total.0, "blocks": blocks.0,
    })))
}

#[derive(Deserialize)]
struct ReportFilter { status: Option<String> }

async fn list_reports(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
    Query(filter): Query<ReportFilter>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    require_admin!(headers, state);
    let status = filter.status.unwrap_or_else(|| "all".to_string());
    let rows: Vec<(u64, String, String, String, String, Option<String>, String, chrono::NaiveDateTime)> = if status == "all" {
        sqlx::query_as(
            "SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.detail, r.status, r.created_at FROM reports r ORDER BY r.created_at DESC LIMIT 200"
        ).fetch_all(&state.db).await.unwrap_or_default()
    } else {
        sqlx::query_as(
            "SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.detail, r.status, r.created_at FROM reports r WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 200"
        ).bind(&status).fetch_all(&state.db).await.unwrap_or_default()
    };
    let list: Vec<serde_json::Value> = rows.iter().map(|(id,reporter,tt,tid,reason,detail,status,ts)| {
        serde_json::json!({"id":id,"reporter_id":reporter,"target_type":tt,"target_id":tid,"reason":reason,"detail":detail,"status":status,"created_at":ts.and_utc().timestamp_millis()})
    }).collect();
    Ok(Json(serde_json::json!(list)))
}

async fn review_report(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
    Path(id): Path<u64>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    require_admin!(headers, state);
    sqlx::query("UPDATE reports SET status='reviewed' WHERE id=?").bind(id).execute(&state.db).await.ok();
    tracing::info!("✅ Admin reviewed report #{}", id);
    Ok(Json(serde_json::json!({"ok":true})))
}

async fn dismiss_report(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
    Path(id): Path<u64>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    require_admin!(headers, state);
    sqlx::query("UPDATE reports SET status='dismissed' WHERE id=?").bind(id).execute(&state.db).await.ok();
    tracing::info!("❌ Admin dismissed report #{}", id);
    Ok(Json(serde_json::json!({"ok":true})))
}

async fn delete_content(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
    Path((content_type, id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    require_admin!(headers, state);
    match content_type.as_str() {
        "moment" => {
            sqlx::query("DELETE FROM moments WHERE id=?").bind(&id).execute(&state.db).await.ok();
            tracing::info!("🗑️ Admin deleted moment #{}", id);
        }
        "timeline_post" => {
            sqlx::query("DELETE FROM timeline_posts WHERE id=?").bind(&id).execute(&state.db).await.ok();
            tracing::info!("🗑️ Admin deleted timeline post #{}", id);
        }
        _ => return Err((axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"Invalid content type"})))),
    }
    Ok(Json(serde_json::json!({"ok":true})))
}

async fn ban_user(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    require_admin!(headers, state);
    // Check user exists
    let exists: Option<(String,)> = sqlx::query_as("SELECT id FROM users WHERE id=?")
        .bind(&id).fetch_optional(&state.db).await.ok().flatten();
    if exists.is_none() {
        return Err((axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"User not found"}))));
    }
    // Delete user's messages
    sqlx::query("DELETE FROM messages WHERE from_id=? OR (to_id=? AND type='private')").bind(&id).bind(&id).execute(&state.db).await.ok();
    // Delete user's groups
    sqlx::query("DELETE FROM `groups` WHERE owner_id=?").bind(&id).execute(&state.db).await.ok();
    // Delete user (CASCADE handles the rest)
    sqlx::query("DELETE FROM users WHERE id=?").bind(&id).execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":e.to_string()}))))?;
    // Disconnect WS
    state.ws_clients.send_to_user(&id, serde_json::json!({"type":"account_deleted"}));
    // Clean Redis
    if let Ok(mut conn) = state.redis.get().await {
        let _: Result<(), _> = deadpool_redis::redis::cmd("DEL")
            .arg(format!("online:{}", id)).arg(format!("heartbeat:{}", id))
            .query_async(&mut *conn).await;
    }
    tracing::info!("🚫 Admin BANNED user {}", id);
    Ok(Json(serde_json::json!({"ok":true})))
}
