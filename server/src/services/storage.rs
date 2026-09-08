use std::{
    collections::HashSet,
    path::{Component, Path, PathBuf},
    time::{Duration, SystemTime},
};
use tokio::io::AsyncWriteExt;

use crate::{config::Config, AppState};

const MIGRATION_MARKER: &str = ".r2-migration-complete";

fn safe_object_key(key: &str) -> Option<String> {
    let key = key
        .trim_start_matches('/')
        .strip_prefix("uploads/")
        .unwrap_or(key.trim_start_matches('/'));
    if key.is_empty()
        || Path::new(key)
            .components()
            .any(|c| !matches!(c, Component::Normal(_)))
    {
        return None;
    }
    Some(key.to_string())
}

fn key_from_url(url: &str, public_url: Option<&str>) -> Option<String> {
    if let Some((_, tail)) = url.split_once("/api/files/") {
        return safe_object_key(tail).map(|key| {
            key.strip_prefix("permanent/")
                .or_else(|| key.strip_prefix("temporary/"))
                .unwrap_or(&key)
                .to_string()
        });
    }
    if let Some(base) = public_url {
        if let Some(tail) = url
            .strip_prefix(base.trim_end_matches('/'))
            .map(|v| v.trim_start_matches('/'))
        {
            return safe_object_key(tail);
        }
    }
    None
}

async fn permanent_keys(state: &AppState) -> HashSet<String> {
    let sql = "SELECT avatar AS url FROM users WHERE avatar IS NOT NULL UNION ALL \
               SELECT avatar FROM `groups` WHERE avatar IS NOT NULL UNION ALL \
               SELECT url FROM moment_images UNION ALL SELECT url FROM moment_videos UNION ALL \
               SELECT thumbnail FROM moment_videos WHERE thumbnail IS NOT NULL UNION ALL \
               SELECT url FROM timeline_media UNION ALL SELECT thumbnail FROM timeline_media WHERE thumbnail IS NOT NULL";
    sqlx::query_scalar::<_, String>(sql)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
        .into_iter()
        .filter_map(|url| key_from_url(&url, state.config.r2_public_url.as_deref()))
        .collect()
}

async fn migrate_legacy_local(
    state: &AppState,
    permanent: &HashSet<String>,
) -> Result<u64, String> {
    let root = Path::new(&state.config.upload_dir);
    let mut entries = tokio::fs::read_dir(root).await.map_err(|e| e.to_string())?;
    let mut moved = 0;
    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        if !entry
            .file_type()
            .await
            .map_err(|e| e.to_string())?
            .is_file()
        {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let class = if permanent.contains(&name) {
            "permanent"
        } else {
            "temporary"
        };
        let destination = root.join(class).join(&name);
        if destination.exists() {
            continue;
        }
        tokio::fs::rename(entry.path(), destination)
            .await
            .map_err(|e| e.to_string())?;
        moved += 1;
    }
    Ok(moved)
}

async fn rewrite_permanent_urls(state: &AppState) -> Result<(), sqlx::Error> {
    let Some(base) = state.config.r2_public_url.as_deref() else {
        return Ok(());
    };
    let old = format!("{}/uploads/", base.trim_end_matches('/'));
    let new = "/api/files/permanent/";
    for (table, column) in [
        ("users", "avatar"),
        ("`groups`", "avatar"),
        ("moment_images", "url"),
        ("moment_videos", "url"),
        ("moment_videos", "thumbnail"),
        ("timeline_media", "url"),
        ("timeline_media", "thumbnail"),
    ] {
        let query =
            format!("UPDATE {table} SET {column}=REPLACE({column}, ?, ?) WHERE {column} LIKE ?");
        sqlx::query(&query)
            .bind(&old)
            .bind(new)
            .bind(format!("{}%", old))
            .execute(&state.db)
            .await?;
    }
    Ok(())
}

pub async fn migrate_r2(state: &AppState) {
    let marker = Path::new(&state.config.upload_dir).join(MIGRATION_MARKER);
    let permanent = permanent_keys(state).await;
    match migrate_legacy_local(state, &permanent).await {
        Ok(count) if count > 0 => tracing::info!("Classified {} legacy local uploads", count),
        Err(e) => tracing::error!("Unable to classify legacy local uploads: {}", e),
        _ => {}
    }
    let credentials = match (
        state.config.r2_account_id.as_deref(),
        state.config.r2_access_key_id.as_deref(),
        state.config.r2_secret_access_key.as_deref(),
        state.config.r2_bucket.as_deref(),
    ) {
        (Some(a), Some(k), Some(s), Some(b)) => Some((a, k, s, b)),
        _ => None,
    };
    if marker.exists() {
        if credentials.is_some() {
            tracing::warn!(
                "R2 migration is complete and verified; R2_* variables can now be removed"
            );
        }
        return;
    }
    let Some((account, access, secret, bucket)) = credentials else {
        if state.config.r2_account_id.is_some()
            || state.config.r2_access_key_id.is_some()
            || state.config.r2_secret_access_key.is_some()
            || state.config.r2_bucket.is_some()
        {
            tracing::warn!("R2 migration skipped: R2 credentials are incomplete; keep all R2_* variables until migration succeeds");
        }
        return;
    };

    tracing::info!(
        "Starting read-only R2 to local storage migration; remote objects will not be deleted"
    );
    let creds = aws_credential_types::Credentials::new(access, secret, None, None, "r2-migration");
    let sdk_config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .credentials_provider(creds)
        .endpoint_url(format!("https://{}.r2.cloudflarestorage.com", account))
        .region(aws_config::Region::new("auto"))
        .load()
        .await;
    let client = aws_sdk_s3::Client::new(&sdk_config);
    let mut token: Option<String> = None;
    let mut migrated = 0_u64;
    let result: Result<(), String> = async {
        loop {
            let page = client
                .list_objects_v2()
                .bucket(bucket)
                .set_continuation_token(token.clone())
                .send()
                .await
                .map_err(|e| e.to_string())?;
            for object in page.contents() {
                let Some(remote_key) = object.key() else {
                    continue;
                };
                let Some(name) = safe_object_key(remote_key) else {
                    return Err(format!("unsafe R2 object key: {remote_key}"));
                };
                let class = if permanent.contains(&name) {
                    "permanent"
                } else {
                    "temporary"
                };
                let destination = Path::new(&state.config.upload_dir).join(class).join(&name);
                tokio::fs::create_dir_all(destination.parent().unwrap())
                    .await
                    .map_err(|e| e.to_string())?;
                if destination.exists() {
                    let local_size = tokio::fs::metadata(&destination).await.map_err(|e| e.to_string())?.len();
                    if object.size().map(|size| size as u64 == local_size).unwrap_or(true) {
                        continue;
                    }
                    return Err(format!("local file size does not match R2 object: {remote_key}"));
                }
                let partial = destination.with_extension(format!(
                    "{}.part",
                    destination
                        .extension()
                        .and_then(|v| v.to_str())
                        .unwrap_or("migration")
                ));
                let mut body = client
                    .get_object()
                    .bucket(bucket)
                    .key(remote_key)
                    .send()
                    .await
                    .map_err(|e| e.to_string())?
                    .body;
                let mut file = tokio::fs::File::create(&partial)
                    .await
                    .map_err(|e| e.to_string())?;
                while let Some(bytes) = body.try_next().await.map_err(|e| e.to_string())? {
                    file.write_all(&bytes).await.map_err(|e| e.to_string())?;
                }
                file.sync_all().await.map_err(|e| e.to_string())?;
                tokio::fs::rename(&partial, &destination)
                    .await
                    .map_err(|e| e.to_string())?;
                migrated += 1;
            }
            if !page.is_truncated().unwrap_or(false) {
                break;
            }
            token = page.next_continuation_token().map(str::to_string);
            if token.is_none() {
                return Err("R2 returned a truncated page without continuation token".into());
            }
        }
        rewrite_permanent_urls(state)
            .await
            .map_err(|e| e.to_string())?;
        tokio::fs::write(
            &marker,
            format!(
                "completed_at={}\nobjects={}\n",
                chrono::Utc::now().to_rfc3339(),
                migrated
            ),
        )
        .await
        .map_err(|e| e.to_string())?;
        Ok(())
    }
    .await;
    match result {
        Ok(()) => tracing::info!("R2 migration completed: {} objects copied locally; keep R2_* variables until the next successful startup", migrated),
        Err(e) => tracing::error!("R2 migration incomplete: {}; it will safely resume on next startup", e),
    }
}

pub async fn cleanup_temporary_files(config: &Config) {
    if config.chat_file_retention_days == 0 {
        return;
    }
    let cutoff = SystemTime::now()
        .checked_sub(Duration::from_secs(
            config.chat_file_retention_days.saturating_mul(86_400),
        ))
        .unwrap_or(SystemTime::UNIX_EPOCH);
    let dir = PathBuf::from(&config.upload_dir).join("temporary");
    let Ok(mut entries) = tokio::fs::read_dir(&dir).await else {
        return;
    };
    let mut removed = 0_u64;
    while let Ok(Some(entry)) = entries.next_entry().await {
        let Ok(kind) = entry.file_type().await else {
            continue;
        };
        if !kind.is_file() {
            continue;
        }
        let expired = entry
            .metadata()
            .await
            .ok()
            .and_then(|m| m.modified().ok())
            .map(|t| t < cutoff)
            .unwrap_or(false);
        if expired && tokio::fs::remove_file(entry.path()).await.is_ok() {
            removed += 1;
        }
    }
    if removed > 0 {
        tracing::info!(
            "Temporary chat file cleanup removed {} files older than {} days",
            removed,
            config.chat_file_retention_days
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_legacy_and_local_urls() {
        assert_eq!(safe_object_key("uploads/a.jpg").as_deref(), Some("a.jpg"));
        assert_eq!(key_from_url("/api/files/permanent/a.jpg", None).as_deref(), Some("a.jpg"));
        assert_eq!(key_from_url("https://cdn.example/uploads/a.jpg", Some("https://cdn.example")).as_deref(), Some("a.jpg"));
    }

    #[test]
    fn rejects_path_traversal() {
        assert!(safe_object_key("uploads/../secret").is_none());
        assert!(safe_object_key("/absolute/path").is_some());
        assert!(safe_object_key("").is_none());
    }
}
