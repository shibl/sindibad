use std::{net::SocketAddr, sync::Arc, time::Duration};

use sindibad_backend::{AppState, MIGRATOR, app, kv::Kv};
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // `sindibad-backend health`: the container's health check (the runtime
    // image has no curl).
    if std::env::args().nth(1).as_deref() == Some("health") {
        return health_check().await;
    }

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();

    let db = PgPoolOptions::new()
        .max_connections(env_or("DB_POOL", 10))
        .acquire_timeout(Duration::from_secs(5))
        .connect(&std::env::var("DATABASE_URL")?)
        .await?;
    MIGRATOR.run(&db).await?;

    let kv = Kv::connect(&std::env::var("VALKEY_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into())).await;
    let admin_token = std::env::var("ADMIN_TOKEN").ok().filter(|t| !t.is_empty()).map(Arc::from);
    if admin_token.is_none() {
        tracing::warn!("ADMIN_TOKEN is not set: /v1/stats is off");
    }

    let bind: SocketAddr = std::env::var("BIND").unwrap_or_else(|_| "0.0.0.0:8080".into()).parse()?;
    let listener = tokio::net::TcpListener::bind(bind).await?;
    tracing::info!(%bind, "listening");
    axum::serve(listener, app(AppState { db, kv, admin_token }).into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown())
        .await?;
    Ok(())
}

fn env_or(name: &str, default: u32) -> u32 {
    std::env::var(name).ok().and_then(|v| v.parse().ok()).unwrap_or(default)
}

async fn shutdown() {
    let ctrl_c = async { tokio::signal::ctrl_c().await.ok() };
    #[cfg(unix)]
    let term = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("SIGTERM handler")
            .recv()
            .await
    };
    #[cfg(not(unix))]
    let term = std::future::pending::<Option<()>>();
    tokio::select! { _ = ctrl_c => {}, _ = term => {} }
}

async fn health_check() -> anyhow::Result<()> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let bind = std::env::var("BIND").unwrap_or_else(|_| "0.0.0.0:8080".into());
    let port: u16 = bind.rsplit(':').next().unwrap_or("8080").parse()?;
    let mut stream = tokio::time::timeout(Duration::from_secs(3), tokio::net::TcpStream::connect(("127.0.0.1", port))).await??;
    stream.write_all(b"GET /healthz HTTP/1.0\r\nHost: localhost\r\n\r\n").await?;
    let mut reply = Vec::new();
    tokio::time::timeout(Duration::from_secs(3), stream.read_to_end(&mut reply)).await??;
    anyhow::ensure!(reply.starts_with(b"HTTP/1.0 200") || reply.starts_with(b"HTTP/1.1 200"), "unhealthy");
    Ok(())
}
