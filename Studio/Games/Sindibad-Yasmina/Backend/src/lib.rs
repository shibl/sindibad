//! The game server for Sindibad & Yasmina: device registration, telemetry
//! events, profile backup and sync, and the stats page.
//!
//! The game never waits for it. Clients play offline, queue everything on
//! the device and send it when they are online, so every write here is safe
//! to repeat: events carry their own ids, saves carry the version they were
//! made from.

pub mod auth;
pub mod devices;
pub mod error;
pub mod events;
pub mod kv;
pub mod profiles;
pub mod stats;

use std::{sync::Arc, time::Duration};

use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, State},
    http::{HeaderName, Method, StatusCode, header},
    response::IntoResponse,
    routing::{get, post},
};
use serde_json::json;
use sqlx::PgPool;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    decompression::RequestDecompressionLayer,
    trace::TraceLayer,
};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub kv: kv::Kv,
    /// Bearer token for /v1/stats. Unset: stats are off.
    pub admin_token: Option<Arc<str>>,
}

pub static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

/// Request bodies after gzip decompression (a batch of events, or one save).
const BODY_LIMIT: usize = 2 * 1024 * 1024;

pub fn app(state: AppState) -> Router {
    // The game is served from another origin (GitHub Pages, or a local
    // server), and authenticates with a bearer token, not cookies.
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE, HeaderName::from_static("content-encoding")])
        .max_age(Duration::from_secs(24 * 60 * 60));

    Router::new()
        .route("/healthz", get(health))
        .route("/v1/devices", post(devices::register))
        .route("/v1/events", post(events::ingest))
        .route("/v1/profiles/{id}", get(profiles::get).put(profiles::put).delete(profiles::unlink))
        .route("/v1/profiles/{id}/code", post(profiles::code))
        .route("/v1/restore", post(profiles::restore))
        .route("/v1/stats", get(stats::overview))
        .route("/admin", get(stats::page))
        .layer(DefaultBodyLimit::max(BODY_LIMIT))
        .layer(RequestDecompressionLayer::new())
        .layer(CompressionLayer::new())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn health(State(s): State<AppState>) -> impl IntoResponse {
    let db = sqlx::query("select 1").execute(&s.db).await.is_ok();
    let valkey = s.kv.ping().await;
    let status = if db { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE };
    (status, Json(json!({ "db": db, "valkey": valkey })))
}
