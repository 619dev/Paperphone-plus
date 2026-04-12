use sqlx::mysql::MySqlPoolOptions;
use crate::config::Config;

pub async fn create_pool(config: &Config) -> sqlx::MySqlPool {
    let url = format!(
        "mysql://{}:{}@{}:{}/{}",
        config.db_user, config.db_pass, config.db_host, config.db_port, config.db_name
    );

    let pool = MySqlPoolOptions::new()
        .max_connections(20)
        .min_connections(2)
        .connect(&url)
        .await
        .expect("Failed to connect to MySQL");

    pool
}

pub async fn run_schema(pool: &sqlx::MySqlPool) {
    let schema = include_str!("schema.sql");
    // Split by semicolons and execute each statement
    for statement in schema.split(';') {
        // Strip leading comment lines (--) so they don't cause CREATE TABLE to be skipped
        let stmt: String = statement
            .lines()
            .filter(|line| !line.trim().starts_with("--"))
            .collect::<Vec<_>>()
            .join("\n");
        let stmt = stmt.trim();
        if stmt.is_empty() {
            continue;
        }
        // Skip PREPARE/EXECUTE/DEALLOCATE/SET statements (MySQL-specific procedural)
        let upper = stmt.to_uppercase();
        if upper.starts_with("SET @")
            || upper.starts_with("PREPARE")
            || upper.starts_with("EXECUTE")
            || upper.starts_with("DEALLOCATE")
        {
            continue;
        }
        if let Err(e) = sqlx::query(stmt).execute(pool).await {
            tracing::warn!("Schema statement skipped: {}", e);
        }
    }
}
