# Game server

The server every grade of Sindibad & Yasmina talks to: device registration,
telemetry, backup and sync of each child's progress, restore codes, and the
stats page. Rust 1.99.1 (axum, sqlx), PostgreSQL 18.6 and Valkey 9.1.3.

The game never waits for it. Children play offline from the copy on their
device; the game queues events and changes and sends them when it is
connected (Grade 6: `Classes/Grade6/Web/core/telemetry.ts`, `sync.ts`,
`merge.ts`). Every write can be repeated safely: events carry their own ids,
and saves carry the version they were made from.

## Run it locally

Needs only Docker.

```sh
cd Studio/Games/Sindibad-Yasmina/Backend
docker compose up -d --build      # postgres, valkey, api on :8080
docker compose logs -f api
```

- Stats page: <http://localhost:8080/admin> (token: `dev-admin`, or the
  `ADMIN_TOKEN` you start it with).
- The Grade 6 game served from this computer or the local network (for
  example `python3 -m http.server 8000` in `Classes/Grade6/`, then
  <http://localhost:8000/Web/>) sends to port 8080 on the same host by
  itself. Elsewhere, open the game once with `?api=http://<host>:8080`
  (`?api=off` to undo).
- PostgreSQL: `localhost:5432`, user, password and database `sindibad`.
  Valkey: `localhost:6379`. Both listen on this computer only.
- `docker compose down` stops it; `docker compose down -v` also deletes the
  data.

## Test

```sh
docker compose run --rm dev cargo test     # unit + API tests on the real database
docker compose run --rm dev cargo clippy --all-targets
```

## API

All bodies are JSON; requests may be gzip-compressed (`Content-Encoding:
gzip`). Every route but registration needs `Authorization: Bearer <token>`.

| Route | What it does |
| --- | --- |
| `POST /v1/devices` `{id, info}` | Registers a device (its id made up by the client) → `{token}`. 409 if the id is taken. |
| `POST /v1/events` `{sent_at, device?, events}` | Stores up to 500 events → `{received, inserted}`. An event is `{id, name, at, profile?, session?, v?, props}`; the same id is stored once. Times are shifted by the device clock's error (`sent_at` against the server clock). |
| `PUT /v1/profiles/{uid}` `{base_version, name, hero, save}` | Stores a child's save → `{version}`. 409 `{version, save, name, hero}` when the server has a newer version than `base_version`: the client merges and sends again. |
| `GET /v1/profiles/{uid}?since=N` | The child's save, or 204 if the server is still at version N. |
| `DELETE /v1/profiles/{uid}` | This device no longer has the child (the backup stays). |
| `POST /v1/profiles/{uid}/code` | The child's 12-digit restore code (the same every time). |
| `POST /v1/restore` `{code}` | Links this device to the child with that code → `{id, version, save, name, hero}`. Any digits (0–9, ٠–٩, ۰–۹), dashes ignored. |
| `GET /v1/stats?days=N` | Everything the stats page shows (`ADMIN_TOKEN`). |
| `GET /admin` | The stats page. |
| `GET /healthz` | `{db, valkey}`; 503 without the database. |

A device can read or write a child only if it created the profile or
restored it with the code.

## Data

`migrations/` creates the tables (run at start-up):

- `devices`: id, token hash, first and last seen, country (from
  Cloudflare's `CF-IPCountry` when deployed behind it), and `info`: platform,
  OS, browser, model, memory, cores, screen, GPU, language, time zone, build.
- `profiles`, `profile_devices`, `profile_snapshots` (the last save of each
  day, to undo a bad sync by hand), `restore_codes`.
- `events`: one row per event; `props` holds the details (for example
  `answer`: topic, item, ok; `lesson_complete`: topic, correct, total, pct,
  stars, secs; `error`: kind, message, source, stack).

Valkey holds rate limits (registration per address, events and sync per
device, restore attempts), a cache of tokens, and the live counters
(devices online in the last five minutes, devices and children today). If
Valkey is down the server keeps working without them.

## Settings

| Variable | Default | |
| --- | --- | --- |
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `VALKEY_URL` | `redis://127.0.0.1:6379` | |
| `ADMIN_TOKEN` | (unset: stats off) | Bearer token for `/v1/stats` and the page |
| `BIND` | `0.0.0.0:8080` | |
| `DB_POOL` | `10` | Database connections |
| `RUST_LOG` | `info` | Log filter |
