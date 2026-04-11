use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use chrono::{Utc, Duration};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub id: String,
    pub username: String,
    pub session_id: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub token_type: Option<String>,
    pub exp: i64,
    pub iat: i64,
}

pub fn sign_token(id: &str, username: &str, session_id: Option<&str>, secret: &str) -> String {
    let now = Utc::now();
    let claims = Claims {
        id: id.to_string(),
        username: username.to_string(),
        session_id: session_id.map(|s| s.to_string()),
        token_type: None,
        exp: (now + Duration::days(7)).timestamp(),
        iat: now.timestamp(),
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes())).unwrap()
}

pub fn sign_2fa_pending_token(id: &str, username: &str, secret: &str) -> String {
    let now = Utc::now();
    let claims = Claims {
        id: id.to_string(),
        username: username.to_string(),
        session_id: None,
        token_type: Some("2fa_pending".to_string()),
        exp: (now + Duration::minutes(5)).timestamp(),
        iat: now.timestamp(),
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes())).unwrap()
}

pub fn verify_token(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )?;
    Ok(data.claims)
}
