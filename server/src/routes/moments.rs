use std::sync::Arc;
use axum::{Router, routing::{get, post, delete}, extract::{State, Path, Query}, Json};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_moments).post(create_moment))
        .route("/{id}", delete(delete_moment))
        .route("/{id}/like", post(like_moment).delete(unlike_moment))
        .route("/{id}/comments", post(add_comment))
        .route("/user/{user_id}", get(get_user_moments))
        .route("/privacy", post(update_privacy))
        .route("/privacy/{target_id}", get(get_privacy))
}

#[derive(Deserialize)]
struct CreateMomentReq {
    text_content: String,
    images: Option<Vec<String>>,
    video: Option<VideoInfo>,
    visibility: Option<String>,
    visibility_rules: Option<Vec<VisibilityRule>>,
}

#[derive(Deserialize)]
struct VideoInfo {
    url: String,
    thumbnail: Option<String>,
    duration: Option<i16>,
}

#[derive(Deserialize)]
struct VisibilityRule {
    target_type: String,
    target_id: String,
}

async fn create_moment(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<CreateMomentReq>,
) -> Result<(axum::http::StatusCode, Json<serde_json::Value>), (axum::http::StatusCode, Json<serde_json::Value>)> {
    let visibility = body.visibility.as_deref().unwrap_or("public");

    let result = sqlx::query("INSERT INTO moments (user_id, text_content, visibility) VALUES (?, ?, ?)")
        .bind(&auth.0.id).bind(&body.text_content).bind(visibility)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let moment_id = result.last_insert_id();

    // Insert images
    if let Some(images) = &body.images {
        for (i, url) in images.iter().enumerate() {
            sqlx::query("INSERT INTO moment_images (moment_id, url, sort_order) VALUES (?, ?, ?)")
                .bind(moment_id).bind(url).bind(i as u8)
                .execute(&state.db).await.ok();
        }
    }

    // Insert video
    if let Some(video) = &body.video {
        sqlx::query("INSERT INTO moment_videos (moment_id, url, thumbnail, duration) VALUES (?, ?, ?, ?)")
            .bind(moment_id).bind(&video.url).bind(&video.thumbnail).bind(video.duration.unwrap_or(0))
            .execute(&state.db).await.ok();
    }

    // Insert visibility rules
    if let Some(rules) = &body.visibility_rules {
        let vis_type = if visibility == "whitelist" { "whitelist" } else { "blacklist" };
        for rule in rules {
            sqlx::query("INSERT INTO moment_visibility (moment_id, type, target_type, target_id) VALUES (?, ?, ?, ?)")
                .bind(moment_id).bind(vis_type).bind(&rule.target_type).bind(&rule.target_id)
                .execute(&state.db).await.ok();
        }
    }

    Ok((axum::http::StatusCode::CREATED, Json(serde_json::json!({ "id": moment_id }))))
}

#[derive(Deserialize)]
struct MomentsQuery {
    before: Option<u64>,
    limit: Option<i64>,
}

async fn list_moments(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Query(params): Query<MomentsQuery>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let limit = params.limit.unwrap_or(20).min(50);

    let moments: Vec<(u64, String, String, String, chrono::NaiveDateTime, String, String, Option<String>)> = if let Some(before) = params.before {
        sqlx::query_as(
            "SELECT m.id, m.user_id, m.text_content, m.visibility, m.created_at, u.nickname, u.username, u.avatar
             FROM moments m JOIN users u ON u.id = m.user_id
             WHERE m.id < ?
             ORDER BY m.id DESC LIMIT ?"
        )
        .bind(before).bind(limit)
        .fetch_all(&state.db).await.unwrap_or_default()
    } else {
        sqlx::query_as(
            "SELECT m.id, m.user_id, m.text_content, m.visibility, m.created_at, u.nickname, u.username, u.avatar
             FROM moments m JOIN users u ON u.id = m.user_id
             ORDER BY m.id DESC LIMIT ?"
        )
        .bind(limit)
        .fetch_all(&state.db).await.unwrap_or_default()
    };

    let mut result = Vec::new();
    for (id, user_id, text, visibility, created_at, nickname, username, avatar) in &moments {
        // Get images
        let images: Vec<(String,)> = sqlx::query_as(
            "SELECT url FROM moment_images WHERE moment_id = ? ORDER BY sort_order"
        ).bind(id).fetch_all(&state.db).await.unwrap_or_default();

        // Get videos
        let videos: Vec<(String, Option<String>, i16)> = sqlx::query_as(
            "SELECT url, thumbnail, duration FROM moment_videos WHERE moment_id = ?"
        ).bind(id).fetch_all(&state.db).await.unwrap_or_default();

        // Get likes
        let likes: Vec<(String, String, Option<String>)> = sqlx::query_as(
            "SELECT u.id, u.nickname, u.avatar FROM moment_likes ml JOIN users u ON u.id = ml.user_id WHERE ml.moment_id = ?"
        ).bind(id).fetch_all(&state.db).await.unwrap_or_default();

        // Get comments
        let comments: Vec<(u64, String, String, String, chrono::NaiveDateTime)> = sqlx::query_as(
            "SELECT mc.id, mc.user_id, u.nickname, mc.text_content, mc.created_at
             FROM moment_comments mc JOIN users u ON u.id = mc.user_id WHERE mc.moment_id = ? ORDER BY mc.created_at ASC"
        ).bind(id).fetch_all(&state.db).await.unwrap_or_default();

        result.push(serde_json::json!({
            "id": id, "user_id": user_id, "text_content": text, "visibility": visibility,
            "created_at": created_at.and_utc().timestamp_millis(),
            "user": { "nickname": nickname, "username": username, "avatar": avatar },
            "images": images.iter().map(|(url,)| url.clone()).collect::<Vec<_>>(),
            "videos": videos.iter().map(|(url, thumb, dur)| serde_json::json!({ "url": url, "thumbnail": thumb, "duration": dur })).collect::<Vec<_>>(),
            "likes": likes.iter().map(|(uid, nick, av)| serde_json::json!({ "id": uid, "nickname": nick, "avatar": av })).collect::<Vec<_>>(),
            "comments": comments.iter().map(|(cid, uid, nick, text, ts)| serde_json::json!({
                "id": cid, "user_id": uid, "nickname": nick, "text_content": text, "created_at": ts.and_utc().timestamp_millis()
            })).collect::<Vec<_>>(),
        }));
    }

    Ok(Json(serde_json::json!(result)))
}

async fn get_user_moments(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(user_id): Path<String>,
    Query(params): Query<MomentsQuery>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let limit = params.limit.unwrap_or(20).min(50);

    let moments: Vec<(u64, String, String, chrono::NaiveDateTime)> = sqlx::query_as(
        "SELECT id, text_content, visibility, created_at FROM moments WHERE user_id = ? ORDER BY id DESC LIMIT ?"
    )
    .bind(&user_id).bind(limit)
    .fetch_all(&state.db).await.unwrap_or_default();

    let mut result = Vec::new();
    for (id, text, _vis, created_at) in &moments {
        let images: Vec<(String,)> = sqlx::query_as("SELECT url FROM moment_images WHERE moment_id = ? ORDER BY sort_order")
            .bind(id).fetch_all(&state.db).await.unwrap_or_default();
        let videos: Vec<(String, Option<String>, i16)> = sqlx::query_as("SELECT url, thumbnail, duration FROM moment_videos WHERE moment_id = ?")
            .bind(id).fetch_all(&state.db).await.unwrap_or_default();

        result.push(serde_json::json!({
            "id": id, "text_content": text, "created_at": created_at.and_utc().timestamp_millis(),
            "images": images.iter().map(|(u,)| u.clone()).collect::<Vec<_>>(),
            "videos": videos.iter().map(|(u, t, d)| serde_json::json!({"url":u,"thumbnail":t,"duration":d})).collect::<Vec<_>>(),
        }));
    }

    Ok(Json(serde_json::json!(result)))
}

async fn delete_moment(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<u64>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM moments WHERE id = ? AND user_id = ?")
        .bind(id).bind(&auth.0.id)
        .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn like_moment(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<u64>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("INSERT IGNORE INTO moment_likes (moment_id, user_id) VALUES (?, ?)")
        .bind(id).bind(&auth.0.id)
        .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn unlike_moment(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<u64>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM moment_likes WHERE moment_id = ? AND user_id = ?")
        .bind(id).bind(&auth.0.id)
        .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct CommentReq { text_content: String }

async fn add_comment(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<u64>,
    Json(body): Json<CommentReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let result = sqlx::query("INSERT INTO moment_comments (moment_id, user_id, text_content) VALUES (?, ?, ?)")
        .bind(id).bind(&auth.0.id).bind(&body.text_content)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
    Ok(Json(serde_json::json!({ "id": result.last_insert_id() })))
}

#[derive(Deserialize)]
struct PrivacyReq {
    target_id: String,
    hide_their: Option<bool>,
    hide_mine: Option<bool>,
}

async fn update_privacy(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<PrivacyReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let ht = body.hide_their.unwrap_or(false) as i8;
    let hm = body.hide_mine.unwrap_or(false) as i8;
    sqlx::query(
        "INSERT INTO moment_privacy (user_id, target_id, hide_their, hide_mine) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE hide_their = VALUES(hide_their), hide_mine = VALUES(hide_mine)"
    )
    .bind(&auth.0.id).bind(&body.target_id).bind(ht).bind(hm)
    .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn get_privacy(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(target_id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let row: Option<(i8, i8)> = sqlx::query_as(
        "SELECT hide_their, hide_mine FROM moment_privacy WHERE user_id = ? AND target_id = ?"
    )
    .bind(&auth.0.id).bind(&target_id)
    .fetch_optional(&state.db).await.unwrap_or(None);

    let (ht, hm) = row.unwrap_or((0, 0));
    Ok(Json(serde_json::json!({ "hide_their": ht == 1, "hide_mine": hm == 1 })))
}
