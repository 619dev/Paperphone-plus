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

    let app = Router::new()
        // Health check
        .route("/health", get(|| async {
            axum::Json(serde_json::json!({ "status": "ok", "time": chrono::Utc::now().timestamp_millis() }))
        }))
        // WebSocket
        .route("/ws", get(ws::server::ws_handler))
        // API routes
        .nest("/api", routes::api_router())
        .layer(DefaultBodyLimit::max(500 * 1024 * 1024)) // 500 MB upload limit
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .expect("Failed to bind");

    tracing::info!("🚀 PaperPhone server listening on port {}", port);
    axum::serve(listener, app).await.unwrap();
}
