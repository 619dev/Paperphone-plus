use axum::{extract::State, routing::post, Json, Router};
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::Deserialize;
use std::sync::Arc;

use crate::auth::middleware::AuthUser;
use crate::AppState;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/direct-token", post(create_direct_token))
        .route("/meeting-token", post(create_meeting_token))
}

#[derive(Deserialize)]
struct DirectTokenRequest {
    peer_id: String,
    call_id: String,
}

#[derive(Deserialize)]
struct MeetingTokenRequest {
    group_id: String,
    call_id: String,
}

/// Mint a LiveKit token for a one-to-one call. Direct-call rooms are isolated
/// from group rooms, and only accepted friends can obtain a token.
async fn create_direct_token(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<DirectTokenRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    if body.peer_id == auth.0.id
        || body.call_id.len() > 96
        || !body.call_id.starts_with("dc_")
        || !body
            .call_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid direct call"})),
        ));
    }

    let friendship: Option<(i64,)> = sqlx::query_as(
        "SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'accepted' LIMIT 1",
    )
    .bind(&auth.0.id)
    .bind(&body.peer_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Unable to validate friendship"})),
        )
    })?;
    if friendship.is_none() {
        return Err((
            axum::http::StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Direct calls are limited to accepted friends"})),
        ));
    }

    let user: Option<(String, Option<String>)> =
        sqlx::query_as("SELECT nickname, avatar FROM users WHERE id = ?")
            .bind(&auth.0.id)
            .fetch_optional(&state.db)
            .await
            .map_err(|_| {
                (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Unable to load caller identity"})),
                )
            })?;
    let (nickname, avatar) = user.ok_or_else(|| {
        (
            axum::http::StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "User not found"})),
        )
    })?;

    let url = state
        .config
        .livekit_url
        .as_deref()
        .filter(|v| !v.is_empty());
    let key = state
        .config
        .livekit_api_key
        .as_deref()
        .filter(|v| !v.is_empty());
    let secret = state
        .config
        .livekit_api_secret
        .as_deref()
        .filter(|v| !v.is_empty());
    let (url, key, secret) = match (url, key, secret) {
        (Some(url), Some(key), Some(secret)) => (url, key, secret),
        _ => {
            return Err((
                axum::http::StatusCode::SERVICE_UNAVAILABLE,
                Json(serde_json::json!({
                    "error": "LiveKit is not configured (LIVEKIT_URL/API_KEY/API_SECRET)"
                })),
            ))
        }
    };

    let now = chrono::Utc::now().timestamp() as usize;
    let room = format!("direct_{}", body.call_id);
    let claims = serde_json::json!({
        "iss": key, "sub": auth.0.id, "nbf": now.saturating_sub(5), "exp": now + 60 * 60,
        "name": nickname,
        "metadata": serde_json::json!({
            "avatar": avatar, "directCall": true, "peerId": body.peer_id
        }).to_string(),
        "video": {
            "roomJoin": true, "room": room, "canPublish": true, "canSubscribe": true,
            "canPublishData": false
        }
    });
    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Unable to create direct-call token"})),
        )
    })?;

    Ok(Json(
        serde_json::json!({"url": url, "token": token, "room": room}),
    ))
}

/// Mint a short-lived LiveKit token only for a member of this group. The group
/// owner receives room-admin capability; all other moderation is still checked
/// by our signaling server before it is broadcast.
async fn create_meeting_token(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(body): Json<MeetingTokenRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let membership: Option<(String, String, Option<String>)> = sqlx::query_as(
        "SELECT g.owner_id, u.nickname, u.avatar FROM group_members gm \
         JOIN `groups` g ON g.id = gm.group_id JOIN users u ON u.id = gm.user_id \
         WHERE gm.group_id = ? AND gm.user_id = ?",
    )
    .bind(&body.group_id)
    .bind(&auth.0.id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error":"Unable to validate meeting membership"})),
        )
    })?;
    let (owner_id, nickname, avatar) = membership.ok_or_else(|| {
        (
            axum::http::StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error":"You are not a member of this group"})),
        )
    })?;

    let url = state
        .config
        .livekit_url
        .as_deref()
        .filter(|v| !v.is_empty());
    let key = state
        .config
        .livekit_api_key
        .as_deref()
        .filter(|v| !v.is_empty());
    let secret = state
        .config
        .livekit_api_secret
        .as_deref()
        .filter(|v| !v.is_empty());
    let (url, key, secret) = match (url, key, secret) {
        (Some(url), Some(key), Some(secret)) => (url, key, secret),
        _ => {
            return Err((
                axum::http::StatusCode::SERVICE_UNAVAILABLE,
                Json(serde_json::json!({
                    "error":"Video meeting SFU is not configured (LIVEKIT_URL/API_KEY/API_SECRET)"
                })),
            ))
        }
    };

    let now = chrono::Utc::now().timestamp() as usize;
    let room = format!("group_{}_{}", body.group_id, body.call_id);
    let is_host = owner_id == auth.0.id;
    let claims = serde_json::json!({
        "iss": key, "sub": auth.0.id, "nbf": now.saturating_sub(5), "exp": now + 6 * 60 * 60,
        "name": nickname,
        "metadata": serde_json::json!({"avatar": avatar, "groupId": body.group_id, "host": is_host}).to_string(),
        "video": {
            "roomJoin": true, "room": room, "canPublish": true, "canSubscribe": true,
            "canPublishData": true, "roomAdmin": is_host
        }
    });
    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error":"Unable to create meeting token"})),
        )
    })?;
    Ok(Json(
        serde_json::json!({"url": url, "token": token, "room": room, "is_host": is_host, "max_participants": 100}),
    ))
}
