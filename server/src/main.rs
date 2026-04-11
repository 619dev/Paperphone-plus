use std::sync::Arc;

use axum::{Router, routing::get};
use tower_http::cors::{CorsLayer, Any};
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

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Health check
        .route("/health", get(|| async {
            axum::Json(serde_json::json!({ "status": "ok", "time": chrono::Utc::now().timestamp_millis() }))
        }))
        // WebSocket
        .route("/ws", get(ws::server::ws_handler))
        // API routes
        .nest("/api", routes::api_router())
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .expect("Failed to bind");

    tracing::info!("🚀 PaperPhone server listening on port {}", port);
    axum::serve(listener, app).await.unwrap();
}
