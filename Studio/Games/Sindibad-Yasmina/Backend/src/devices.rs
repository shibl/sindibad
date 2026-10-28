use axum::{
    Json,
    extract::State,
    http::HeaderMap,
};
use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::{
    AppState,
    auth::{ClientIp, new_token, token_hash},
    error::{AppError, Result, bad},
};

const MAX_INFO: usize = 4096;

#[derive(Deserialize)]
pub struct Register {
    /// Made up by the client at first launch.
    pub id: Uuid,
    #[serde(default)]
    pub info: Value,
}

/// POST /v1/devices {id, info} → {token}. The token is shown once: the
/// server keeps only its hash. 409 if the id is taken (the client then makes
/// up another).
pub async fn register(
    State(s): State<AppState>,
    ClientIp(ip): ClientIp,
    headers: HeaderMap,
    Json(body): Json<Register>,
) -> Result<Json<Value>> {
    if !s.kv.allow(&format!("register:{ip}"), 60, 60 * 60).await {
        return Err(AppError::TooMany);
    }
    let info = clean_info(body.info)?;
    let token = new_token();
    let added = sqlx::query("insert into devices (id, token_hash, info, country) values ($1, $2, $3, $4) on conflict (id) do nothing")
        .bind(body.id)
        .bind(token_hash(&token))
        .bind(&info)
        .bind(country(&headers))
        .execute(&s.db)
        .await?
        .rows_affected();
    if added == 0 {
        return Err(AppError::Conflict(json!({ "error": "device id taken" })));
    }
    Ok(Json(json!({ "token": token })))
}

/// Device details: an object of at most 4 KB.
pub fn clean_info(info: Value) -> Result<Value> {
    match info {
        Value::Null => Ok(json!({})),
        Value::Object(_) if info.to_string().len() <= MAX_INFO => Ok(info),
        Value::Object(_) => Err(bad("info is over 4 KB")),
        _ => Err(bad("info must be an object")),
    }
}

/// The two-letter country Cloudflare adds in front of the server.
pub fn country(headers: &HeaderMap) -> Option<String> {
    let code = headers.get("cf-ipcountry")?.to_str().ok()?;
    (code.len() == 2 && code != "XX").then(|| code.to_owned())
}
