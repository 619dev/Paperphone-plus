#[derive(Clone, Debug)]
pub struct Config {
    pub port: u16,
    pub jwt_secret: String,
    pub jwt_expires_in: String,

    // MySQL
    pub db_host: String,
    pub db_port: u16,
    pub db_user: String,
    pub db_pass: String,
    pub db_name: String,

    // Redis
    pub redis_host: String,
    pub redis_port: u16,
    pub redis_pass: Option<String>,

    // Cloudflare R2
    pub r2_account_id: Option<String>,
    pub r2_access_key_id: Option<String>,
    pub r2_secret_access_key: Option<String>,
    pub r2_bucket: Option<String>,
    pub r2_public_url: Option<String>,

    // Cloudflare TURN
    pub cf_calls_app_id: Option<String>,
    pub cf_calls_app_secret: Option<String>,

    // Metered.ca TURN (free tier)
    pub metered_turn_api_key: Option<String>,

    // Web Push (VAPID)
    pub vapid_public_key: Option<String>,
    pub vapid_private_key: Option<String>,
    pub vapid_subject: Option<String>,

    // OneSignal
    pub onesignal_app_id: Option<String>,
    pub onesignal_rest_key: Option<String>,

    // Telegram stickers
    pub telegram_bot_token: Option<String>,
    pub sticker_packs: Option<String>,

    // Upload
    pub upload_dir: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: env_or("PORT", "3000").parse().unwrap_or(3000),
            jwt_secret: env_or("JWT_SECRET", "dev_secret_change_me"),
            jwt_expires_in: env_or("JWT_EXPIRES_IN", "7d"),

            db_host: env_or("DB_HOST", "localhost"),
            db_port: env_or("DB_PORT", "3306").parse().unwrap_or(3306),
            db_user: env_or("DB_USER", "paperphone"),
            db_pass: env_or("DB_PASS", ""),
            db_name: env_or("DB_NAME", "paperphone"),

            redis_host: env_or("REDIS_HOST", "localhost"),
            redis_port: env_or("REDIS_PORT", "6379").parse().unwrap_or(6379),
            redis_pass: env_opt("REDIS_PASS"),

            r2_account_id: env_opt("R2_ACCOUNT_ID"),
            r2_access_key_id: env_opt("R2_ACCESS_KEY_ID"),
            r2_secret_access_key: env_opt("R2_SECRET_ACCESS_KEY"),
            r2_bucket: env_opt("R2_BUCKET"),
            r2_public_url: env_opt("R2_PUBLIC_URL"),

            cf_calls_app_id: env_opt("CF_CALLS_APP_ID"),
            cf_calls_app_secret: env_opt("CF_CALLS_APP_SECRET"),

            metered_turn_api_key: env_opt("METERED_TURN_API_KEY"),

            vapid_public_key: env_opt("VAPID_PUBLIC_KEY"),
            vapid_private_key: env_opt("VAPID_PRIVATE_KEY"),
            vapid_subject: env_opt("VAPID_SUBJECT"),

            onesignal_app_id: env_opt("ONESIGNAL_APP_ID"),
            onesignal_rest_key: env_opt("ONESIGNAL_REST_KEY"),

            telegram_bot_token: env_opt("TELEGRAM_BOT_TOKEN"),
            sticker_packs: env_opt("STICKER_PACKS"),

            upload_dir: env_or("UPLOAD_DIR", "./uploads"),
        }
    }
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

fn env_opt(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|v| !v.is_empty())
}
