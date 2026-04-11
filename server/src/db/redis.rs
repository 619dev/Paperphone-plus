use deadpool_redis::{Config as RedisConfig, Pool, Runtime};
use crate::config::Config;

pub fn create_redis_pool(config: &Config) -> Pool {
    let url = if let Some(ref pass) = config.redis_pass {
        format!("redis://:{}@{}:{}", pass, config.redis_host, config.redis_port)
    } else {
        format!("redis://{}:{}", config.redis_host, config.redis_port)
    };

    let cfg = RedisConfig::from_url(&url);
    cfg.create_pool(Some(Runtime::Tokio1))
        .expect("Failed to create Redis pool")
}
