use std::sync::Arc;
use axum::Router;

pub mod auth;
pub mod users;
pub mod friends;
pub mod groups;
pub mod messages;
pub mod upload;
pub mod files;
pub mod moments;
pub mod timeline;
pub mod calls;
pub mod push;
pub mod stickers;
pub mod totp;
pub mod sessions;
pub mod tags;

use crate::AppState;

pub fn api_router() -> Router<Arc<AppState>> {
    Router::new()
        .nest("/auth", auth::router())
        .nest("/users", users::router())
        .nest("/friends", friends::router())
        .nest("/groups", groups::router())
        .nest("/messages", messages::router())
        .nest("/upload", upload::router())
        .nest("/files", files::router())
        .nest("/moments", moments::router())
        .nest("/timeline", timeline::router())
        .nest("/calls", calls::router())
        .nest("/push", push::router())
        .nest("/stickers", stickers::router())
        .nest("/totp", totp::router())
        .nest("/sessions", sessions::router())
        .nest("/tags", tags::router())
}
