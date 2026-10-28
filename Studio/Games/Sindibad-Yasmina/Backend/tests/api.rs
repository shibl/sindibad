//! The API against a real Postgres (and Valkey when VALKEY_URL is set):
//!   docker compose run --rm dev cargo test
//! Skipped when DATABASE_URL is not set. Every test makes up its own ids, so
//! they can run again on the same database.

use std::sync::Arc;

use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use sindibad_backend::{AppState, MIGRATOR, app, kv::Kv};
use tower::ServiceExt;
use uuid::Uuid;

const ADMIN: &str = "test-admin";

async fn server() -> Option<Router> {
    let Ok(url) = std::env::var("DATABASE_URL") else {
        eprintln!("DATABASE_URL not set: skipping");
        return None;
    };
    let db = sqlx::PgPool::connect(&url).await.expect("postgres");
    MIGRATOR.run(&db).await.expect("migrations");
    // Rate limits are per address, and every test request comes from the
    // same one: test them in kv_limits only.
    Some(app(AppState { db, kv: Kv::disabled(), admin_token: Some(Arc::from(ADMIN)) }))
}

async fn call(app: &Router, method: &str, uri: &str, token: Option<&str>, body: Option<Value>) -> (StatusCode, Value) {
    let mut req = Request::builder().method(method).uri(uri);
    if let Some(token) = token {
        req = req.header("authorization", format!("Bearer {token}"));
    }
    let req = match body {
        Some(body) => req.header("content-type", "application/json").body(Body::from(body.to_string())),
        None => req.body(Body::empty()),
    }
    .unwrap();
    let res = app.clone().oneshot(req).await.unwrap();
    let status = res.status();
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&bytes).unwrap_or(Value::Null))
}

async fn device(app: &Router) -> (Uuid, String) {
    let id = Uuid::new_v4();
    let (status, body) = call(app, "POST", "/v1/devices", None, Some(json!({ "id": id, "info": { "platform": "web", "os": "Android 13" } }))).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    (id, body["token"].as_str().unwrap().to_owned())
}

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

#[tokio::test]
async fn devices_register_once() {
    let Some(app) = server().await else { return };
    let id = Uuid::new_v4();
    let (status, body) = call(&app, "POST", "/v1/devices", None, Some(json!({ "id": id }))).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["token"].as_str().unwrap().len(), 64);
    let (status, _) = call(&app, "POST", "/v1/devices", None, Some(json!({ "id": id }))).await;
    assert_eq!(status, StatusCode::CONFLICT);
    let (status, _) = call(&app, "POST", "/v1/events", Some("not-a-token"), Some(json!({ "sent_at": 0, "events": [] }))).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn events_are_stored_once() {
    let Some(app) = server().await else { return };
    let (_, token) = device(&app).await;
    let profile = Uuid::new_v4();
    let events: Vec<Value> = (0..3)
        .map(|i| json!({ "id": Uuid::new_v4(), "name": "answer", "at": now_ms() - i * 1000, "profile": profile, "v": "test", "props": { "topic": "t", "item": "q1", "ok": i == 0 } }))
        .collect();
    let batch = json!({ "sent_at": now_ms(), "device": { "platform": "web", "version": "test" }, "events": events });
    let (status, body) = call(&app, "POST", "/v1/events", Some(&token), Some(batch.clone())).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body, json!({ "received": 3, "inserted": 3 }));
    // A retry of the same batch adds nothing.
    let (_, body) = call(&app, "POST", "/v1/events", Some(&token), Some(batch)).await;
    assert_eq!(body, json!({ "received": 3, "inserted": 0 }));

    let bad = json!({ "sent_at": now_ms(), "events": [{ "id": Uuid::new_v4(), "name": "Bad Name", "at": now_ms() }] });
    let (status, _) = call(&app, "POST", "/v1/events", Some(&token), Some(bad)).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn profiles_sync_with_versions() {
    let Some(app) = server().await else { return };
    let (_, a) = device(&app).await;
    let (_, b) = device(&app).await;
    let id = Uuid::new_v4();
    let uri = format!("/v1/profiles/{id}");

    let first = json!({ "base_version": 0, "name": "Test", "hero": "yasmina", "save": { "version": 1, "pearls": 5 } });
    let (status, body) = call(&app, "PUT", &uri, Some(&a), Some(first)).await;
    assert_eq!((status, body), (StatusCode::OK, json!({ "version": 1 })));

    let second = json!({ "base_version": 1, "name": "Test", "save": { "version": 1, "pearls": 9 } });
    let (_, body) = call(&app, "PUT", &uri, Some(&a), Some(second)).await;
    assert_eq!(body, json!({ "version": 2 }));

    // Written from an old version: 409 with the newer copy to merge.
    let stale = json!({ "base_version": 1, "save": { "version": 1, "pearls": 7 } });
    let (status, body) = call(&app, "PUT", &uri, Some(&a), Some(stale)).await;
    assert_eq!(status, StatusCode::CONFLICT);
    assert_eq!(body["version"], 2);
    assert_eq!(body["save"]["pearls"], 9);

    let (status, _) = call(&app, "GET", &format!("{uri}?since=2"), Some(&a), None).await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    let (status, body) = call(&app, "GET", &format!("{uri}?since=1"), Some(&a), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["save"]["pearls"], 9);

    // Another device can't read or write it, until it restores the code.
    let (status, _) = call(&app, "GET", &uri, Some(&b), None).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = call(&app, "PUT", &uri, Some(&b), Some(json!({ "base_version": 2, "save": {} }))).await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    let (status, body) = call(&app, "POST", &format!("{uri}/code"), Some(&a), None).await;
    assert_eq!(status, StatusCode::OK);
    let code = body["code"].as_str().unwrap().to_owned();
    let (_, again) = call(&app, "POST", &format!("{uri}/code"), Some(&a), None).await;
    assert_eq!(again["code"], code, "one code per profile");

    let (status, _) = call(&app, "POST", "/v1/restore", Some(&b), Some(json!({ "code": "000000000000" }))).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let typed = format!("{}-{}-{}", &code[0..4], &code[4..8], &code[8..12]);
    let (status, body) = call(&app, "POST", "/v1/restore", Some(&b), Some(json!({ "code": typed }))).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["id"], json!(id));
    assert_eq!(body["name"], "Test");
    assert_eq!(body["version"], 2);
    let (status, _) = call(&app, "GET", &uri, Some(&b), None).await;
    assert_eq!(status, StatusCode::OK);

    // Deleting it on device b only unlinks b.
    let (status, _) = call(&app, "DELETE", &uri, Some(&b), None).await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    let (status, _) = call(&app, "GET", &uri, Some(&b), None).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = call(&app, "GET", &uri, Some(&a), None).await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn stats_need_the_admin_token() {
    let Some(app) = server().await else { return };
    let (status, _) = call(&app, "GET", "/v1/stats", None, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, _) = call(&app, "GET", "/v1/stats", Some("wrong"), None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    let (status, body) = call(&app, "GET", "/v1/stats?days=7", Some(ADMIN), None).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    for key in ["totals", "daily", "retention", "churn", "engagement", "devices", "errors", "topics", "questions", "usage"] {
        assert!(!body[key].is_null(), "{key} missing: {body}");
    }
    assert_eq!(body["daily"].as_array().unwrap().len(), 7);
}

#[tokio::test]
async fn kv_limits() {
    let Ok(url) = std::env::var("VALKEY_URL") else { return };
    let kv = Kv::connect(&url).await;
    assert!(kv.ping().await);
    let key = format!("test:{}", Uuid::new_v4());
    for _ in 0..3 {
        assert!(kv.allow(&key, 3, 60).await);
    }
    assert!(!kv.allow(&key, 3, 60).await);
    let device = Uuid::new_v4();
    kv.seen(device, &[Uuid::new_v4()]).await;
    assert!(kv.live().await["devices_today"].as_i64().unwrap() >= 1);
}
