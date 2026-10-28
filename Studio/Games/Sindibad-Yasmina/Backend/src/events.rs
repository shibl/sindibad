use axum::{Json, extract::State, http::HeaderMap};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::{
    AppState,
    auth::Device,
    devices::{clean_info, country},
    error::{AppError, Result, bad},
};

const MAX_EVENTS: usize = 500;
const MAX_PROPS: usize = 8192;

#[derive(Deserialize)]
pub struct Batch {
    /// The device clock when the batch was sent (ms since 1970).
    pub sent_at: i64,
    /// The device's details, to refresh (game version, language…).
    #[serde(default)]
    pub device: Option<Value>,
    pub events: Vec<Event>,
}

#[derive(Deserialize)]
pub struct Event {
    pub id: Uuid,
    pub name: String,
    /// When it happened, by the device clock (ms since 1970).
    pub at: i64,
    #[serde(default)]
    pub profile: Option<Uuid>,
    #[serde(default)]
    pub session: Option<Uuid>,
    /// The game build that recorded it.
    #[serde(default)]
    pub v: Option<String>,
    #[serde(default)]
    pub props: Value,
}

/// POST /v1/events {sent_at, device?, events: [...]} → {received, inserted}.
/// Sending the same events again inserts nothing new.
pub async fn ingest(
    State(s): State<AppState>,
    Device(device): Device,
    headers: HeaderMap,
    Json(batch): Json<Batch>,
) -> Result<Json<Value>> {
    if !s.kv.allow(&format!("events:{device}"), 120, 60).await {
        return Err(AppError::TooMany);
    }
    let received = batch.events.len();
    if received > MAX_EVENTS {
        return Err(bad(format!("at most {MAX_EVENTS} events per batch")));
    }
    let now = Utc::now();
    // Cheap phones often have the wrong date. Shift every event by how far
    // the device clock was from ours when it sent the batch.
    let skew = now.timestamp_millis() - batch.sent_at;

    let mut ids = Vec::with_capacity(received);
    let mut profiles = Vec::with_capacity(received);
    let mut sessions = Vec::with_capacity(received);
    let mut names = Vec::with_capacity(received);
    let mut ats = Vec::with_capacity(received);
    let mut versions = Vec::with_capacity(received);
    let mut props = Vec::with_capacity(received);
    for e in batch.events {
        if !valid_name(&e.name) {
            return Err(bad(format!("bad event name {:?}", e.name)));
        }
        let p = match e.props {
            Value::Null => json!({}),
            p @ Value::Object(_) => p,
            _ => return Err(bad("props must be an object")),
        };
        if p.to_string().len() > MAX_PROPS {
            return Err(bad(format!("{}: props over 8 KB", e.name)));
        }
        let at: DateTime<Utc> = DateTime::from_timestamp_millis(e.at.saturating_add(skew)).unwrap_or(now).min(now);
        ids.push(e.id);
        profiles.push(e.profile);
        sessions.push(e.session);
        names.push(e.name);
        ats.push(at);
        versions.push(e.v.map(|v| v.chars().take(40).collect::<String>()));
        props.push(p);
    }

    let inserted = sqlx::query(
        "insert into events (id, device_id, profile_id, session_id, name, at, version, props)
         select e.id, $2, e.profile_id, e.session_id, e.name, e.at, e.version, e.props
         from unnest($1::uuid[], $3::uuid[], $4::uuid[], $5::text[], $6::timestamptz[], $7::text[], $8::jsonb[])
              as e(id, profile_id, session_id, name, at, version, props)
         on conflict (id) do nothing",
    )
    .bind(&ids)
    .bind(device)
    .bind(&profiles)
    .bind(&sessions)
    .bind(&names)
    .bind(&ats)
    .bind(&versions)
    .bind(&props)
    .execute(&s.db)
    .await?
    .rows_affected();

    let info = batch.device.map(clean_info).transpose()?;
    sqlx::query("update devices set last_seen = now(), info = coalesce($2, info), country = coalesce($3, country) where id = $1")
        .bind(device)
        .bind(info)
        .bind(country(&headers))
        .execute(&s.db)
        .await?;

    let mut children: Vec<Uuid> = profiles.iter().flatten().copied().collect();
    children.sort_unstable();
    children.dedup();
    s.kv.seen(device, &children).await;

    Ok(Json(json!({ "received": received, "inserted": inserted })))
}

/// snake_case, starting with a letter, at most 48 characters.
pub fn valid_name(name: &str) -> bool {
    (1..=48).contains(&name.len())
        && name.starts_with(|c: char| c.is_ascii_lowercase())
        && name.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

#[cfg(test)]
mod tests {
    use super::valid_name;

    #[test]
    fn event_names() {
        assert!(valid_name("lesson_complete"));
        assert!(valid_name("perf"));
        assert!(!valid_name(""));
        assert!(!valid_name("Lesson"));
        assert!(!valid_name("1st"));
        assert!(!valid_name("drop table"));
        assert!(!valid_name(&"a".repeat(49)));
    }
}
