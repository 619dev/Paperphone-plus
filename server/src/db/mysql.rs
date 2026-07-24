use crate::config::Config;
use sqlx::mysql::{MySqlConnectOptions, MySqlPoolOptions};

pub async fn create_pool(config: &Config) -> sqlx::MySqlPool {
    // Be explicit about the client character set. In particular, search terms
    // arrive as bound parameters, so a connection negotiated as latin1 can
    // reject (or corrupt) Chinese text before MySQL evaluates the query.
    let options = MySqlConnectOptions::new()
        .host(&config.db_host)
        .port(config.db_port)
        .username(&config.db_user)
        .password(&config.db_pass)
        .database(&config.db_name)
        .charset("utf8mb4");

    let pool = MySqlPoolOptions::new()
        .max_connections(20)
        .min_connections(2)
        .connect_with(options)
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
        if let Err(e) = sqlx::query(stmt).execute(pool).await {
            // ALTER TABLE migrations may fail with "Duplicate column name" etc.
            // — that's expected on repeated runs, so just log as debug.
            let msg = e.to_string();
            if msg.contains("Duplicate column") || msg.contains("Duplicate key name") {
                tracing::debug!("Migration already applied: {}", msg);
            } else {
                tracing::warn!("Schema statement skipped: {}", msg);
            }
        }
    }

    // CREATE TABLE IF NOT EXISTS does not update installations created with an
    // older/default character set. Repair only the two searchable columns and
    // only when needed, so this remains cheap on every normal startup.
    let incompatible_columns: Result<(i64,), _> = sqlx::query_as(
        "SELECT COUNT(*) \
         FROM information_schema.COLUMNS \
         WHERE TABLE_SCHEMA = DATABASE() \
           AND TABLE_NAME = 'users' \
           AND COLUMN_NAME IN ('username', 'nickname') \
           AND CHARACTER_SET_NAME <> 'utf8mb4'",
    )
    .fetch_one(pool)
    .await;

    match incompatible_columns {
        Ok((count,)) if count > 0 => {
            if let Err(e) = sqlx::query(
                "ALTER TABLE users \
                 MODIFY username VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, \
                 MODIFY nickname VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL"
            )
            .execute(pool)
            .await
            {
                tracing::warn!("Unable to migrate searchable user fields to utf8mb4: {}", e);
            } else {
                tracing::info!("Migrated searchable user fields to utf8mb4");
            }
        }
        Ok(_) => {}
        Err(e) => tracing::warn!("Unable to inspect user field character sets: {}", e),
    }
}
