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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub password_reset_version: Option<u32>,
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
        password_reset_version: None,
        // Access tokens are deliberately short lived. A revocable, rotating
        // device refresh token keeps normal users signed in without passwords.
        exp: (now + Duration::minutes(30)).timestamp(),
        iat: now.timestamp(),
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes())).unwrap()
}

pub fn sign_2fa_pending_token(id: &str, username: &str, password_reset_version: u32, secret: &str) -> String {
    let now = Utc::now();
    let claims = Claims {
        id: id.to_string(),
        username: username.to_string(),
        session_id: None,
        token_type: Some("2fa_pending".to_string()),
        password_reset_version: Some(password_reset_version),
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
