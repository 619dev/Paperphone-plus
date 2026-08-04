#[derive(Clone, Debug)]
pub struct Config {
    pub port: u16,
    pub jwt_secret: String,

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

    // LiveKit SFU (required for all one-to-one calls and group meetings)
    pub livekit_url: Option<String>,
    pub livekit_api_key: Option<String>,
    pub livekit_api_secret: Option<String>,

    // Web Push (VAPID)
    pub vapid_public_key: Option<String>,
    pub vapid_private_key: Option<String>,
    pub vapid_subject: Option<String>,

    // Firebase Cloud Messaging (FCM)
    pub fcm_project_id: Option<String>,
    pub fcm_client_email: Option<String>,
    pub fcm_private_key: Option<String>,
    // FCM Push Relay (for self-hosted servers without Firebase credentials)
    pub fcm_relay_secret: Option<String>,   // Set on the relay host to enable the relay endpoint
    pub fcm_relay_url: Option<String>,      // Set on self-hosted servers: URL of the relay
    pub fcm_relay_key: Option<String>,      // Set on self-hosted servers: shared key to auth with relay

    // OneSignal
    pub onesignal_app_id: Option<String>,
    pub onesignal_rest_key: Option<String>,
    // OneSignal Push Relay (for self-hosted servers without OneSignal credentials)
    pub onesignal_relay_secret: Option<String>,  // Set on the relay host to enable the relay endpoint
    pub onesignal_relay_url: Option<String>,     // Set on self-hosted servers: URL of the relay
    pub onesignal_relay_key: Option<String>,     // Set on self-hosted servers: shared key to auth with relay

    // ntfy Push (for Chinese Android devices without GMS)
    pub ntfy_base_url: String,
    pub ntfy_token: Option<String>,

    // Apple Push Notification Service (APNS) for iOS native push
    pub apns_team_id: Option<String>,
    pub apns_key_id: Option<String>,
    pub apns_private_key: Option<String>,
    pub apns_bundle_id: Option<String>,
    pub apns_sandbox: bool,
    // APNS Push Relay (for self-hosted servers without Apple credentials)
    pub apns_relay_secret: Option<String>,  // Set on the relay host to enable the relay endpoint
    pub apns_relay_url: Option<String>,     // Set on self-hosted servers: URL of the relay
    pub apns_relay_key: Option<String>,     // Set on self-hosted servers: shared key to auth with relay

    // Telegram stickers
    pub telegram_bot_token: Option<String>,
    pub sticker_packs: Option<String>,

    // Upload
    pub upload_dir: String,

    // Admin panel
    pub admin_path: String,
    pub admin_password: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: env_or("PORT", "3000").parse().unwrap_or(3000),
            jwt_secret: env_or("JWT_SECRET", "dev_secret_change_me"),

            db_host: env_or("DB_HOST", "localhost"),
            db_port: env_or("DB_PORT", "3306").parse().unwrap_or(3306),
            db_user: env_or("DB_USER", "paperphoneplus"),
            db_pass: env_or("DB_PASS", ""),
            db_name: env_or("DB_NAME", "paperphoneplus"),

            redis_host: env_or("REDIS_HOST", "localhost"),
            redis_port: env_or("REDIS_PORT", "6379").parse().unwrap_or(6379),
            redis_pass: env_opt("REDIS_PASS"),

            r2_account_id: env_opt("R2_ACCOUNT_ID"),
            r2_access_key_id: env_opt("R2_ACCESS_KEY_ID"),
            r2_secret_access_key: env_opt("R2_SECRET_ACCESS_KEY"),
            r2_bucket: env_opt("R2_BUCKET"),
            r2_public_url: env_opt("R2_PUBLIC_URL"),

            livekit_url: env_opt("LIVEKIT_URL"),
            livekit_api_key: env_opt("LIVEKIT_API_KEY"),
            livekit_api_secret: env_opt("LIVEKIT_API_SECRET"),

            vapid_public_key: env_opt("VAPID_PUBLIC_KEY"),
            vapid_private_key: env_opt("VAPID_PRIVATE_KEY"),
            vapid_subject: env_opt("VAPID_SUBJECT"),

            fcm_project_id: env_opt("FCM_PROJECT_ID"),
            fcm_client_email: env_opt("FCM_CLIENT_EMAIL"),
            fcm_private_key: env_opt("FCM_PRIVATE_KEY"),
            fcm_relay_secret: env_opt("FCM_RELAY_SECRET"),
            fcm_relay_url: env_opt("FCM_RELAY_URL"),
            fcm_relay_key: env_opt("FCM_RELAY_KEY"),

            onesignal_app_id: env_opt("ONESIGNAL_APP_ID"),
            onesignal_rest_key: env_opt("ONESIGNAL_REST_KEY"),
            onesignal_relay_secret: env_opt("ONESIGNAL_RELAY_SECRET"),
            onesignal_relay_url: env_opt("ONESIGNAL_RELAY_URL"),
            onesignal_relay_key: env_opt("ONESIGNAL_RELAY_KEY"),

            ntfy_base_url: env_or("NTFY_BASE_URL", "https://ntfy.sh"),
            ntfy_token: env_opt("NTFY_TOKEN"),

            apns_team_id: env_opt("APNS_TEAM_ID"),
            apns_key_id: env_opt("APNS_KEY_ID"),
            apns_private_key: env_opt("APNS_PRIVATE_KEY"),
            apns_bundle_id: env_opt("APNS_BUNDLE_ID"),
            apns_sandbox: env_or("APNS_SANDBOX", "false") == "true",
            apns_relay_secret: env_opt("APNS_RELAY_SECRET"),
            apns_relay_url: env_opt("APNS_RELAY_URL"),
            apns_relay_key: env_opt("APNS_RELAY_KEY"),

            telegram_bot_token: env_opt("TELEGRAM_BOT_TOKEN"),
            sticker_packs: env_opt("STICKER_PACKS"),

            upload_dir: env_or("UPLOAD_DIR", "./uploads"),

            admin_path: env_or("ADMIN_PATH", "/admin"),
            admin_password: env_or("ADMIN_PASSWORD", "admin123"),
        }
    }
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

fn env_opt(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|v| !v.is_empty())
}
