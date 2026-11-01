//! GET /v1/debug (admin token): the latest diagnostics from the devices, to
//! see why a phone does what it does without holding it. The game sends
//! `diag` (its report on the device's 3D graphics and what it chose), `log`
//! (every line of its log, from a device in debug mode: ?debug=1) and
//! `error` events (Grade 6: core/diag.ts, core/telemetry.ts).
//! GET /admin/debug: the page that shows them.
//!
//!   ?device=<uuid>        one device only
//!   ?names=diag,log       which events (default: diag, log, error)
//!   ?since=<rfc3339>      only newer ones (the page polls with this)
//!   ?limit=N              at most N (default 200, at most 2000), newest first

use axum::{
    Json,
    extract::{Query, State},
    response::Html,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::{
    AppState,
    auth::Admin,
    error::{Result, bad},
    events::valid_name,
};

#[derive(Deserialize)]
pub struct Filter {
    pub device: Option<Uuid>,
    pub names: Option<String>,
    pub since: Option<DateTime<Utc>>,
    pub limit: Option<i64>,
}

pub async fn page() -> Html<&'static str> {
    Html(include_str!("debug.html"))
}

pub async fn recent(State(s): State<AppState>, _: Admin, Query(f): Query<Filter>) -> Result<Json<Value>> {
    let names: Vec<String> = f
        .names
        .as_deref()
        .unwrap_or("diag,log,error")
        .split(',')
        .map(|n| n.trim().to_owned())
        .filter(|n| !n.is_empty())
        .collect();
    if names.is_empty() || !names.iter().all(|n| valid_name(n)) {
        return Err(bad("names: event names, separated by commas"));
    }
    let limit = f.limit.unwrap_or(200).clamp(1, 2000);
    let events: Value = sqlx::query_scalar(
        "select coalesce(jsonb_agg(t order by t.received_at desc, t.at desc), '[]'::jsonb) from (
           select e.id, e.device_id as device, e.session_id as session, e.name, e.at, e.received_at, e.version, e.props
           from events e
           where e.name = any($1)
             and ($2::uuid is null or e.device_id = $2)
             and ($3::timestamptz is null or e.received_at > $3)
           order by e.received_at desc, e.at desc
           limit $4
         ) t",
    )
    .bind(&names)
    .bind(f.device)
    .bind(f.since)
    .bind(limit)
    .fetch_one(&s.db)
    .await?;

    // The devices those events came from: what each one is.
    let devices: Value = sqlx::query_scalar(
        "select coalesce(jsonb_object_agg(d.id, jsonb_build_object(
            'first_seen', d.first_seen, 'last_seen', d.last_seen, 'country', d.country, 'info', d.info)), '{}'::jsonb)
         from devices d
         where d.id in (select (x->>'device')::uuid from jsonb_array_elements($1) x)",
    )
    .bind(&events)
    .fetch_one(&s.db)
    .await?;

    Ok(Json(json!({ "now": Utc::now(), "events": events, "devices": devices })))
}
