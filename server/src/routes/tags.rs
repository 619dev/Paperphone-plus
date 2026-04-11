use std::sync::Arc;
use axum::{Router, routing::{get, post, put}, extract::{State, Path}, Json};
use serde::Deserialize;

use crate::AppState;
use crate::auth::middleware::AuthUser;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_tags).post(create_tag))
        .route("/{id}", put(update_tag).delete(delete_tag))
        .route("/{id}/assign", post(assign_tag))
        .route("/{id}/unassign", post(unassign_tag))
        .route("/friend/{friend_id}", get(get_friend_tags))
}

async fn list_tags(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let rows: Vec<(u64, String, String)> = sqlx::query_as(
        "SELECT id, name, color FROM friend_tags WHERE user_id = ? ORDER BY name"
    )
    .bind(&auth.0.id).fetch_all(&state.db).await.unwrap_or_default();

    let tags: Vec<serde_json::Value> = rows.iter().map(|(id, name, color)| {
        serde_json::json!({ "id": id, "name": name, "color": color })
    }).collect();

    Ok(Json(serde_json::json!(tags)))
}

#[derive(Deserialize)]
struct CreateTagReq {
    name: String,
    color: Option<String>,
}

async fn create_tag(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<CreateTagReq>,
) -> Result<(axum::http::StatusCode, Json<serde_json::Value>), (axum::http::StatusCode, Json<serde_json::Value>)> {
    let color = body.color.unwrap_or_else(|| "#2196F3".to_string());
    let result = sqlx::query("INSERT INTO friend_tags (user_id, name, color) VALUES (?, ?, ?)")
        .bind(&auth.0.id).bind(&body.name).bind(&color)
        .execute(&state.db).await
        .map_err(|e| (axum::http::StatusCode::CONFLICT, Json(serde_json::json!({ "error": e.to_string() }))))?;
    Ok((axum::http::StatusCode::CREATED, Json(serde_json::json!({ "id": result.last_insert_id(), "name": body.name, "color": color }))))
}

#[derive(Deserialize)]
struct UpdateTagReq {
    name: Option<String>,
    color: Option<String>,
}

async fn update_tag(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<u64>,
    Json(body): Json<UpdateTagReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    if let Some(name) = &body.name {
        sqlx::query("UPDATE friend_tags SET name = ? WHERE id = ? AND user_id = ?")
            .bind(name).bind(id).bind(&auth.0.id).execute(&state.db).await.ok();
    }
    if let Some(color) = &body.color {
        sqlx::query("UPDATE friend_tags SET color = ? WHERE id = ? AND user_id = ?")
            .bind(color).bind(id).bind(&auth.0.id).execute(&state.db).await.ok();
    }
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn delete_tag(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<u64>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM friend_tags WHERE id = ? AND user_id = ?")
        .bind(id).bind(&auth.0.id).execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Deserialize)]
struct AssignReq { friend_id: String }

async fn assign_tag(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(tag_id): Path<u64>,
    Json(body): Json<AssignReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("INSERT IGNORE INTO friend_tag_assignments (tag_id, friend_id) VALUES (?, ?)")
        .bind(tag_id).bind(&body.friend_id)
        .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn unassign_tag(
    State(state): State<Arc<AppState>>,
    _auth: AuthUser,
    Path(tag_id): Path<u64>,
    Json(body): Json<AssignReq>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    sqlx::query("DELETE FROM friend_tag_assignments WHERE tag_id = ? AND friend_id = ?")
        .bind(tag_id).bind(&body.friend_id)
        .execute(&state.db).await.ok();
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn get_friend_tags(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(friend_id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let rows: Vec<(u64, String, String)> = sqlx::query_as(
        "SELECT ft.id, ft.name, ft.color FROM friend_tags ft
         JOIN friend_tag_assignments fta ON fta.tag_id = ft.id
         WHERE ft.user_id = ? AND fta.friend_id = ?"
    )
    .bind(&auth.0.id).bind(&friend_id)
    .fetch_all(&state.db).await.unwrap_or_default();

    let tags: Vec<serde_json::Value> = rows.iter().map(|(id, name, color)| {
        serde_json::json!({ "id": id, "name": name, "color": color })
    }).collect();

    Ok(Json(serde_json::json!(tags)))
}
