use std::sync::Arc;
use axum::{Router, routing::{get, post}, extract::{State, Path, Query}, Json};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_posts).post(create_post))
        .route("/{id}", get(get_post).delete(delete_post))
        .route("/{id}/like", post(like_post).delete(unlike_post))
        .route("/{id}/comments", get(get_comments).post(add_comment))
}

#[derive(Deserialize)]
struct CreatePostReq {
    text_content: String,
    is_anonymous: Option<bool>,
    media: Option<Vec<MediaItem>>,
}

#[derive(Deserialize)]
struct MediaItem {
    url: String,
    media_type: Option<String>,
    thumbnail: Option<String>,
    duration: Option<i16>,
}

async fn create_post(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<CreatePostReq>,
) -> Result<(axum::http::StatusCode, Json<serde_json::Value>), (axum::http::StatusCode, Json<serde_json::Value>)> {
    let anon = body.is_anonymous.unwrap_or(false) as i8;
    let result = sqlx::query("INSERT INTO timeline_posts (user_id, text_content, is_anonymous) VALUES (?, ?, ?)")
        .bind(&auth.0.id).bind(&body.text_content).bind(anon)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;

    let post_id = result.last_insert_id();

    if let Some(media) = &body.media {
        for (i, item) in media.iter().enumerate() {
            let mt = item.media_type.as_deref().unwrap_or("image");
            sqlx::query("INSERT INTO timeline_media (post_id, url, media_type, thumbnail, duration, sort_order) VALUES (?, ?, ?, ?, ?, ?)")
                .bind(post_id).bind(&item.url).bind(mt).bind(&item.thumbnail).bind(item.duration.unwrap_or(0)).bind(i as u8)
                .execute(&state.db).await.ok();
        }
    }

    Ok((axum::http::StatusCode::CREATED, Json(serde_json::json!({ "id": post_id }))))
}

#[derive(Deserialize)]
struct ListQuery {
    before: Option<u64>,
    limit: Option<i64>,
}

async fn list_posts(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Query(params): Query<ListQuery>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let limit = params.limit.unwrap_or(20).min(50);

    let posts: Vec<(u64, String, String, i8, chrono::NaiveDateTime, String, Option<String>)> = if let Some(before) = params.before {
        sqlx::query_as(
            "SELECT p.id, p.user_id, p.text_content, p.is_anonymous, p.created_at, u.nickname, u.avatar
             FROM timeline_posts p JOIN users u ON u.id = p.user_id
             WHERE p.id < ? ORDER BY p.id DESC LIMIT ?"
        ).bind(before).bind(limit).fetch_all(&state.db).await.unwrap_or_default()
    } else {
        sqlx::query_as(
            "SELECT p.id, p.user_id, p.text_content, p.is_anonymous, p.created_at, u.nickname, u.avatar
             FROM timeline_posts p JOIN users u ON u.id = p.user_id
             ORDER BY p.id DESC LIMIT ?"
        ).bind(limit).fetch_all(&state.db).await.unwrap_or_default()
    };

    let mut result = Vec::new();
    for (id, user_id, text, is_anon, created_at, nickname, avatar) in &posts {
        let media: Vec<(String, String, Option<String>, i16)> = sqlx::query_as(
            "SELECT url, media_type, thumbnail, duration FROM timeline_media WHERE post_id = ? ORDER BY sort_order"
        ).bind(id).fetch_all(&state.db).await.unwrap_or_default();

        let like_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM timeline_likes WHERE post_id = ?")
            .bind(id).fetch_one(&state.db).await.unwrap_or((0,));

        let comment_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM timeline_comments WHERE post_id = ?")
            .bind(id).fetch_one(&state.db).await.unwrap_or((0,));

        result.push(serde_json::json!({
            "id": id, "user_id": user_id, "text_content": text, "is_anonymous": *is_anon == 1,
            "created_at": created_at.and_utc().timestamp_millis(),
            "user": if *is_anon == 1 { serde_json::json!({ "nickname": "Anonymous", "avatar": null }) }
                    else { serde_json::json!({ "nickname": nickname, "avatar": avatar }) },
            "media": media.iter().map(|(url, mt, thumb, dur)| serde_json::json!({
                "url": url, "media_type": mt, "thumbnail": thumb, "duration": dur
            })).collect::<Vec<_>>(),
            "like_count": like_count.0,
            "comment_count": comment_count.0,
        }));
    }

    Ok(Json(serde_json::json!(result)))
}

async fn get_post(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(id): Path<u64>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let post: Option<(u64, String, String, i8, chrono::NaiveDateTime, String, Option<String>)> = sqlx::query_as(
        "SELECT p.id, p.user_id, p.text_content, p.is_anonymous, p.created_at, u.nickname, u.avatar
         FROM timeline_posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?"
    ).bind(id).fetch_optional(&state.db).await.unwrap_or(None);

    let (pid, user_id, text, is_anon, created_at, nickname, avatar) = post
        .ok_or_else(|| (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Post not found" }))))?;

    let media: Vec<(String, String, Option<String>, i16)> = sqlx::query_as(
        "SELECT url, media_type, thumbnail, duration FROM timeline_media WHERE post_id = ? ORDER BY sort_order"
    ).bind(pid).fetch_all(&state.db).await.unwrap_or_default();

    let likes: Vec<(String, String, Option<String>)> = sqlx::query_as(
        "SELECT u.id, u.nickname, u.avatar FROM timeline_likes tl JOIN users u ON u.id = tl.user_id WHERE tl.post_id = ?"
    ).bind(pid).fetch_all(&state.db).await.unwrap_or_default();

    let comments: Vec<(u64, String, String, i8, String, chrono::NaiveDateTime)> = sqlx::query_as(
        "SELECT c.id, c.user_id, u.nickname, c.is_anonymous, c.text_content, c.created_at
         FROM timeline_comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.created_at ASC"
    ).bind(pid).fetch_all(&state.db).await.unwrap_or_default();

    Ok(Json(serde_json::json!({
        "id": pid, "user_id": user_id, "text_content": text, "is_anonymous": is_anon == 1,
        "created_at": created_at.and_utc().timestamp_millis(),
        "user": if is_anon == 1 { serde_json::json!({"nickname":"Anonymous","avatar":null}) } else { serde_json::json!({"nickname":nickname,"avatar":avatar}) },
        "media": media.iter().map(|(u,m,t,d)| serde_json::json!({"url":u,"media_type":m,"thumbnail":t,"duration":d})).collect::<Vec<_>>(),
        "likes": likes.iter().map(|(id,n,a)| serde_json::json!({"id":id,"nickname":n,"avatar":a})).collect::<Vec<_>>(),
        "comments": comments.iter().map(|(cid,uid,nick,anon,text,ts)| serde_json::json!({
            "id":cid,"user_id":uid,"nickname":if *anon==1{"Anonymous".to_string()}else{nick.clone()},
            "is_anonymous":*anon==1,"text_content":text,"created_at":ts.and_utc().timestamp_millis()
        })).collect::<Vec<_>>(),
    })))
}

async fn delete_post(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<u64>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM timeline_posts WHERE id = ? AND user_id = ?")
        .bind(id).bind(&auth.0.id).execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn like_post(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<u64>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("INSERT IGNORE INTO timeline_likes (post_id, user_id) VALUES (?, ?)")
        .bind(id).bind(&auth.0.id).execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn unlike_post(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<u64>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM timeline_likes WHERE post_id = ? AND user_id = ?")
        .bind(id).bind(&auth.0.id).execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn get_comments(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(id): Path<u64>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let comments: Vec<(u64, String, String, i8, String, chrono::NaiveDateTime)> = sqlx::query_as(
        "SELECT c.id, c.user_id, u.nickname, c.is_anonymous, c.text_content, c.created_at
         FROM timeline_comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.created_at ASC"
    ).bind(id).fetch_all(&state.db).await.unwrap_or_default();

    let result: Vec<serde_json::Value> = comments.iter().map(|(cid, uid, nick, anon, text, ts)| {
        serde_json::json!({
            "id": cid, "user_id": uid,
            "nickname": if *anon == 1 { "Anonymous".to_string() } else { nick.clone() },
            "is_anonymous": *anon == 1, "text_content": text,
            "created_at": ts.and_utc().timestamp_millis(),
        })
    }).collect();

    Ok(Json(serde_json::json!(result)))
}

#[derive(Deserialize)]
struct AddCommentReq {
    text_content: String,
    is_anonymous: Option<bool>,
}

async fn add_comment(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<u64>,
    Json(body): Json<AddCommentReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let anon = body.is_anonymous.unwrap_or(false) as i8;
    let result = sqlx::query("INSERT INTO timeline_comments (post_id, user_id, is_anonymous, text_content) VALUES (?, ?, ?, ?)")
        .bind(id).bind(&auth.0.id).bind(anon).bind(&body.text_content)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))))?;
    Ok(Json(serde_json::json!({ "id": result.last_insert_id() })))
}
