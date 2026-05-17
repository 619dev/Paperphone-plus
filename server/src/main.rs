use std::sync::Arc;

use axum::{Router, routing::get, extract::DefaultBodyLimit};
use axum::http::Method;
use tower_http::cors::CorsLayer;
use tracing_subscriber::EnvFilter;

mod config;
mod db;
mod auth;
mod routes;
mod ws;
mod services;

use config::Config;
use db::{mysql::create_pool, redis::create_redis_pool};

pub struct AppState {
    pub db: sqlx::MySqlPool,
    pub redis: deadpool_redis::Pool,
    pub config: Config,
    pub ws_clients: ws::server::WsClients,
}

#[tokio::main]
async fn main() {
    // Load .env
    dotenvy::dotenv().ok();

    // Init tracing
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let config = Config::from_env();
    let port = config.port;

    // Connect to MySQL
    let db_pool = create_pool(&config).await;
    tracing::info!("✅ MySQL connected");

    // Run migrations / schema
    db::mysql::run_schema(&db_pool).await;
    tracing::info!("✅ Database schema initialized");

    // Connect to Redis
    let redis_pool = create_redis_pool(&config);
    tracing::info!("✅ Redis pool created");

    let state = Arc::new(AppState {
        db: db_pool,
        redis: redis_pool,
        config,
        ws_clients: ws::server::WsClients::default(),
    });

    // Ensure upload directory exists
    let upload_path = &state.config.upload_dir;
    tokio::fs::create_dir_all(upload_path).await.ok();
    tracing::info!("✅ Upload directory ready: {}", upload_path);

    // CORS: mirror the request Origin so that credentialed/preflight requests
    // work across Vercel (client) → Zeabur (server).
    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::AllowOrigin::mirror_request())
        .allow_methods([
            Method::GET, Method::POST, Method::PUT,
            Method::DELETE, Method::PATCH, Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
            axum::http::header::ACCEPT,
            axum::http::header::ORIGIN,
            axum::http::header::HeaderName::from_static("x-requested-with"),
        ])
        .expose_headers([
            axum::http::header::CONTENT_LENGTH,
            axum::http::header::CONTENT_TYPE,
        ])
        .max_age(std::time::Duration::from_secs(86400));

    // ── Background task: periodically delete expired messages ──────────
    let cleanup_state = state.clone();

    let app = Router::new()
        // Health check
        .route("/health", get(|| async {
            axum::Json(serde_json::json!({ "status": "ok", "time": chrono::Utc::now().timestamp_millis() }))
        }))
        // WebSocket
        .route("/ws", get(ws::server::ws_handler))
        // API routes
        .nest("/api", routes::api_router())
        // Admin panel
        .nest(&state.config.admin_path, routes::admin::router())
        .layer(DefaultBodyLimit::max(500 * 1024 * 1024)) // 500 MB upload limit
        .layer(cors)
        .with_state(state);

    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            // Delete expired private messages based on auto_delete settings
            let r1 = sqlx::query(
                "DELETE m FROM messages m
                 JOIN friends f ON (f.user_id = m.from_id AND f.friend_id = m.to_id)
                 WHERE m.type = 'private' AND f.auto_delete > 0
                   AND m.created_at < DATE_SUB(NOW(), INTERVAL f.auto_delete SECOND)"
            ).execute(&cleanup_state.db).await;
            // Delete expired group messages
            let r2 = sqlx::query(
                "DELETE m FROM messages m
                 JOIN `groups` g ON g.id = m.to_id
                 WHERE m.type = 'group' AND g.auto_delete > 0
                   AND m.created_at < DATE_SUB(NOW(), INTERVAL g.auto_delete SECOND)"
            ).execute(&cleanup_state.db).await;
            let c1 = r1.as_ref().map(|r| r.rows_affected()).unwrap_or(0);
            let c2 = r2.as_ref().map(|r| r.rows_affected()).unwrap_or(0);
            if c1 > 0 || c2 > 0 {
                tracing::info!("🧹 Auto-delete cleanup: {} private, {} group messages purged", c1, c2);
            }
        }
    });

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .expect("Failed to bind");

    tracing::info!("🚀 PaperPhone server listening on port {}", port);
    axum::serve(listener, app).await.unwrap();
}
