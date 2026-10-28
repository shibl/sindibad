use std::net::SocketAddr;

use axum::{
    extract::{ConnectInfo, FromRequestParts},
    http::{header, request::Parts},
};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{
    AppState,
    error::{AppError, Result},
};

/// The device making the request, from its bearer token.
pub struct Device(pub Uuid);

/// The stats reader: the bearer token must be ADMIN_TOKEN.
pub struct Admin;

/// The caller's address, for rate limits: Cloudflare's CF-Connecting-IP when
/// deployed behind it, else the socket peer.
pub struct ClientIp(pub String);

/// 256 random bits (two v4 UUIDs), as 64 hex characters.
pub fn new_token() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

pub fn token_hash(token: &str) -> Vec<u8> {
    Sha256::digest(token.as_bytes()).to_vec()
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn bearer(parts: &Parts) -> Option<&str> {
    let value = parts.headers.get(header::AUTHORIZATION)?.to_str().ok()?;
    value.strip_prefix("Bearer ").map(str::trim).filter(|t| !t.is_empty())
}

impl FromRequestParts<AppState> for Device {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self> {
        let token = bearer(parts).ok_or(AppError::Unauthorized)?;
        let hash = token_hash(token);
        let key = hex(&hash);
        if let Some(id) = state.kv.token(&key).await {
            return Ok(Device(id));
        }
        let id: Option<Uuid> = sqlx::query_scalar("select id from devices where token_hash = $1")
            .bind(&hash)
            .fetch_optional(&state.db)
            .await?;
        let id = id.ok_or(AppError::Unauthorized)?;
        state.kv.remember_token(&key, id).await;
        Ok(Device(id))
    }
}

impl FromRequestParts<AppState> for Admin {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self> {
        let expected = state.admin_token.as_deref().ok_or(AppError::NotFound)?;
        let given = bearer(parts).ok_or(AppError::Unauthorized)?;
        // Constant time, so the token can't be guessed byte by byte.
        let same = given.len() == expected.len()
            && given.bytes().zip(expected.bytes()).fold(0u8, |acc, (a, b)| acc | (a ^ b)) == 0;
        if same { Ok(Admin) } else { Err(AppError::Unauthorized) }
    }
}

impl<S: Send + Sync> FromRequestParts<S> for ClientIp {
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(parts: &mut Parts, _: &S) -> std::result::Result<Self, Self::Rejection> {
        let edge = parts.headers.get("cf-connecting-ip").and_then(|v| v.to_str().ok()).map(str::to_owned);
        let peer = parts.extensions.get::<ConnectInfo<SocketAddr>>().map(|c| c.0.ip().to_string());
        Ok(ClientIp(edge.or(peer).unwrap_or_else(|| "unknown".into())))
    }
}
