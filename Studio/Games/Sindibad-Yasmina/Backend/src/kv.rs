//! Valkey: rate limits, the token cache and live counters (who is playing
//! now, today's players). Everything here fails open: without Valkey the
//! server still stores events and saves, only without limits and live counts.

use std::time::Duration;

use chrono::Utc;
use redis::aio::ConnectionManager;
use serde_json::{Value, json};
use uuid::Uuid;

#[derive(Clone, Default)]
pub struct Kv(Option<ConnectionManager>);

const TOKEN_TTL: u64 = 60 * 60;
const DAY_TTL: u64 = 3 * 24 * 60 * 60;
/// "Playing now" = sent something in the last five minutes.
const ONLINE_SECS: i64 = 5 * 60;

impl Kv {
    pub async fn connect(url: &str) -> Kv {
        let client = match redis::Client::open(url) {
            Ok(client) => client,
            Err(error) => {
                tracing::warn!(%error, "bad VALKEY_URL: running without Valkey");
                return Kv(None);
            }
        };
        for attempt in 1..=10 {
            match ConnectionManager::new(client.clone()).await {
                Ok(manager) => return Kv(Some(manager)),
                Err(error) => tracing::warn!(%error, attempt, "Valkey not reachable yet"),
            }
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
        tracing::warn!("running without Valkey");
        Kv(None)
    }

    /// No Valkey (the tests).
    pub fn disabled() -> Kv {
        Kv(None)
    }

    pub async fn ping(&self) -> bool {
        let Some(mut c) = self.0.clone() else { return false };
        redis::cmd("PING").query_async::<String>(&mut c).await.is_ok()
    }

    /// At most `limit` calls per `window` seconds for `key`.
    pub async fn allow(&self, key: &str, limit: i64, window: u64) -> bool {
        let Some(mut c) = self.0.clone() else { return true };
        let key = format!("rl:{key}");
        let counted: redis::RedisResult<(i64,)> = redis::pipe()
            .atomic()
            .cmd("INCR").arg(&key)
            .cmd("EXPIRE").arg(&key).arg(window).arg("NX").ignore()
            .query_async(&mut c)
            .await;
        match counted {
            Ok((n,)) => n <= limit,
            Err(error) => {
                tracing::warn!(%error, "rate limit check failed");
                true
            }
        }
    }

    pub async fn token(&self, hash: &str) -> Option<Uuid> {
        let mut c = self.0.clone()?;
        let id: Option<String> = redis::cmd("GET").arg(format!("tok:{hash}")).query_async(&mut c).await.ok()?;
        id?.parse().ok()
    }

    pub async fn remember_token(&self, hash: &str, id: Uuid) {
        let Some(mut c) = self.0.clone() else { return };
        let _: redis::RedisResult<()> = redis::cmd("SET")
            .arg(format!("tok:{hash}")).arg(id.to_string()).arg("EX").arg(TOKEN_TTL)
            .query_async(&mut c)
            .await;
    }

    /// A device (and the children playing on it) sent something just now.
    pub async fn seen(&self, device: Uuid, profiles: &[Uuid]) {
        let Some(mut c) = self.0.clone() else { return };
        let now = Utc::now();
        let day = now.format("%Y-%m-%d");
        let mut pipe = redis::pipe();
        pipe.cmd("PFADD").arg(format!("dau:devices:{day}")).arg(device.to_string()).ignore()
            .cmd("EXPIRE").arg(format!("dau:devices:{day}")).arg(DAY_TTL).ignore()
            .cmd("ZADD").arg("online").arg(now.timestamp()).arg(device.to_string()).ignore()
            .cmd("ZREMRANGEBYSCORE").arg("online").arg("-inf").arg(now.timestamp() - ONLINE_SECS).ignore();
        if !profiles.is_empty() {
            pipe.cmd("PFADD").arg(format!("dau:profiles:{day}")).arg(profiles.iter().map(Uuid::to_string).collect::<Vec<_>>()).ignore()
                .cmd("EXPIRE").arg(format!("dau:profiles:{day}")).arg(DAY_TTL).ignore();
        }
        if let Err(error) = pipe.query_async::<()>(&mut c).await {
            tracing::warn!(%error, "live counters");
        }
    }

    /// Devices online now, and devices and children seen today (UTC).
    pub async fn live(&self) -> Value {
        let Some(mut c) = self.0.clone() else { return Value::Null };
        let now = Utc::now();
        let day = now.format("%Y-%m-%d");
        let counts: redis::RedisResult<(i64, i64, i64)> = redis::pipe()
            .cmd("ZCOUNT").arg("online").arg(now.timestamp() - ONLINE_SECS).arg("+inf")
            .cmd("PFCOUNT").arg(format!("dau:devices:{day}"))
            .cmd("PFCOUNT").arg(format!("dau:profiles:{day}"))
            .query_async(&mut c)
            .await;
        match counts {
            Ok((online, devices, profiles)) => json!({ "online": online, "devices_today": devices, "profiles_today": profiles }),
            Err(_) => Value::Null,
        }
    }
}
