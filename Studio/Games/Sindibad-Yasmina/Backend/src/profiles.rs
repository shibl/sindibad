//! Profile backup and sync. The server stores each child's save document
//! with a version number; the merge happens on the device (Web/core/merge.ts),
//! which knows what each field means. A device that writes from an older
//! version gets 409 and the newer copy, merges, and writes again.

use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::{
    AppState,
    auth::{ClientIp, Device},
    error::{AppError, Result, bad},
};

const MAX_SAVE: usize = 1024 * 1024;

#[derive(Deserialize)]
pub struct Push {
    /// The version this save was made from (0: never synced).
    pub base_version: i64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub hero: Option<String>,
    pub save: Value,
}

/// PUT /v1/profiles/{id} {base_version, name, hero, save} → {version}.
/// Creates the profile on its first push. 409 {version, save, name, hero}
/// when the server has a newer version than `base_version`.
pub async fn put(
    State(s): State<AppState>,
    Device(device): Device,
    Path(id): Path<Uuid>,
    Json(body): Json<Push>,
) -> Result<Json<Value>> {
    if !s.kv.allow(&format!("sync:{device}"), 60, 60).await {
        return Err(AppError::TooMany);
    }
    if !body.save.is_object() {
        return Err(bad("save must be an object"));
    }
    if body.save.to_string().len() > MAX_SAVE {
        return Err(bad("save is over 1 MB"));
    }
    let name: String = body.name.trim().chars().take(20).collect();
    let hero = body.hero.filter(|h| h.len() <= 20);

    let mut tx = s.db.begin().await?;
    let current: Option<i64> = sqlx::query_scalar("select version from profiles where id = $1 for update")
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?;
    let version: i64 = match current {
        None => {
            let added = sqlx::query("insert into profiles (id, created_by, name, hero, save) values ($1, $2, $3, $4, $5) on conflict (id) do nothing")
                .bind(id)
                .bind(device)
                .bind(&name)
                .bind(&hero)
                .bind(&body.save)
                .execute(&mut *tx)
                .await?
                .rows_affected();
            if added == 0 {
                // Another request created it a moment ago.
                tx.rollback().await?;
                return Err(conflict(&s, id).await?);
            }
            sqlx::query("insert into profile_devices (profile_id, device_id) values ($1, $2)")
                .bind(id)
                .bind(device)
                .execute(&mut *tx)
                .await?;
            1
        }
        Some(version) => {
            if !linked(&mut tx, id, device).await? {
                return Err(AppError::Forbidden);
            }
            if version != body.base_version {
                tx.rollback().await?;
                return Err(conflict(&s, id).await?);
            }
            sqlx::query_scalar("update profiles set save = $2, name = $3, hero = $4, version = version + 1, updated_at = now() where id = $1 returning version")
                .bind(id)
                .bind(&body.save)
                .bind(&name)
                .bind(&hero)
                .fetch_one(&mut *tx)
                .await?
        }
    };
    sqlx::query(
        "insert into profile_snapshots (profile_id, day, version, save) values ($1, current_date, $2, $3)
         on conflict (profile_id, day) do update set version = excluded.version, save = excluded.save",
    )
    .bind(id)
    .bind(version)
    .bind(&body.save)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(Json(json!({ "version": version })))
}

#[derive(Deserialize)]
pub struct Since {
    pub since: Option<i64>,
}

/// GET /v1/profiles/{id}?since=N → {version, save, name, hero, updated_at},
/// or 204 when the server is still at version N.
pub async fn get(
    State(s): State<AppState>,
    Device(device): Device,
    Path(id): Path<Uuid>,
    Query(q): Query<Since>,
) -> Result<Response> {
    let version: Option<i64> = sqlx::query_scalar("select version from profiles where id = $1")
        .bind(id)
        .fetch_optional(&s.db)
        .await?;
    let version = version.ok_or(AppError::NotFound)?;
    let mut conn = s.db.acquire().await?;
    if !linked(&mut conn, id, device).await? {
        return Err(AppError::Forbidden);
    }
    if q.since == Some(version) {
        return Ok(StatusCode::NO_CONTENT.into_response());
    }
    let (version, save, name, hero, updated_at): (i64, Value, String, Option<String>, DateTime<Utc>) =
        sqlx::query_as("select version, save, name, hero, updated_at from profiles where id = $1")
            .bind(id)
            .fetch_one(&mut *conn)
            .await?;
    Ok(Json(json!({ "version": version, "save": save, "name": name, "hero": hero, "updated_at": updated_at })).into_response())
}

/// DELETE /v1/profiles/{id}: the child's profile was deleted on this device.
/// The backup stays for the other devices (and the restore code).
pub async fn unlink(State(s): State<AppState>, Device(device): Device, Path(id): Path<Uuid>) -> Result<StatusCode> {
    sqlx::query("delete from profile_devices where profile_id = $1 and device_id = $2")
        .bind(id)
        .bind(device)
        .execute(&s.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// POST /v1/profiles/{id}/code → {code}: the profile's restore code, the
/// same one every time.
pub async fn code(State(s): State<AppState>, Device(device): Device, Path(id): Path<Uuid>) -> Result<Json<Value>> {
    let mut conn = s.db.acquire().await?;
    if !linked(&mut conn, id, device).await? {
        return Err(AppError::NotFound);
    }
    for _ in 0..5 {
        sqlx::query("insert into restore_codes (code, profile_id) values ($1, $2) on conflict do nothing")
            .bind(new_code())
            .bind(id)
            .execute(&mut *conn)
            .await?;
        let code: Option<String> = sqlx::query_scalar("select code from restore_codes where profile_id = $1")
            .bind(id)
            .fetch_optional(&mut *conn)
            .await?;
        if let Some(code) = code {
            return Ok(Json(json!({ "code": code })));
        }
        // The new code belonged to another profile: try another.
    }
    Err(bad("could not make a code, try again"))
}

#[derive(Deserialize)]
pub struct Restore {
    pub code: String,
}

/// POST /v1/restore {code} → {id, version, save, name, hero}, and this
/// device may sync the profile from now on.
pub async fn restore(
    State(s): State<AppState>,
    Device(device): Device,
    ClientIp(ip): ClientIp,
    Json(body): Json<Restore>,
) -> Result<Json<Value>> {
    // 10¹² codes and a few tries per quarter hour: not guessable.
    if !s.kv.allow(&format!("restore:device:{device}"), 10, 15 * 60).await
        || !s.kv.allow(&format!("restore:ip:{ip}"), 30, 15 * 60).await
    {
        return Err(AppError::TooMany);
    }
    let code = normalize_code(&body.code);
    if code.len() != 12 {
        return Err(AppError::NotFound);
    }
    let found: Option<(Uuid, i64, Value, String, Option<String>)> = sqlx::query_as(
        "select p.id, p.version, p.save, p.name, p.hero from restore_codes c join profiles p on p.id = c.profile_id where c.code = $1",
    )
    .bind(&code)
    .fetch_optional(&s.db)
    .await?;
    let (id, version, save, name, hero) = found.ok_or(AppError::NotFound)?;
    sqlx::query("insert into profile_devices (profile_id, device_id, how) values ($1, $2, 'restored') on conflict do nothing")
        .bind(id)
        .bind(device)
        .execute(&s.db)
        .await?;
    Ok(Json(json!({ "id": id, "version": version, "save": save, "name": name, "hero": hero })))
}

async fn linked(conn: &mut sqlx::PgConnection, profile: Uuid, device: Uuid) -> Result<bool> {
    Ok(sqlx::query_scalar("select exists(select 1 from profile_devices where profile_id = $1 and device_id = $2)")
        .bind(profile)
        .bind(device)
        .fetch_one(conn)
        .await?)
}

/// The 409 body: the server's copy, to merge.
async fn conflict(s: &AppState, id: Uuid) -> Result<AppError> {
    let (version, save, name, hero): (i64, Value, String, Option<String>) =
        sqlx::query_as("select version, save, name, hero from profiles where id = $1")
            .bind(id)
            .fetch_one(&s.db)
            .await?;
    Ok(AppError::Conflict(json!({ "version": version, "save": save, "name": name, "hero": hero })))
}

/// Twelve digits.
fn new_code() -> String {
    format!("{:012}", Uuid::new_v4().as_u128() % 1_000_000_000_000)
}

/// Keeps the digits, whichever way they were typed: 0–9, Arabic-Indic ٠–٩
/// or Persian ۰–۹, with or without dashes and spaces.
pub fn normalize_code(typed: &str) -> String {
    typed
        .chars()
        .filter_map(|c| match c {
            '0'..='9' => Some(c),
            '\u{0660}'..='\u{0669}' => char::from_digit(c as u32 - 0x0660, 10),
            '\u{06F0}'..='\u{06F9}' => char::from_digit(c as u32 - 0x06F0, 10),
            _ => None,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{new_code, normalize_code};

    #[test]
    fn codes() {
        assert_eq!(new_code().len(), 12);
        assert!(new_code().chars().all(|c| c.is_ascii_digit()));
        assert_eq!(normalize_code("1234-5678 9012"), "123456789012");
        assert_eq!(normalize_code("١٢٣٤-٥٦٧٨-٩٠١٢"), "123456789012");
        assert_eq!(normalize_code("۱۲۳"), "123");
    }
}
