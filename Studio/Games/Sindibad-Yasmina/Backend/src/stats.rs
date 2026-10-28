//! GET /v1/stats?days=N (admin token): everything the stats page shows, as
//! JSON. Each query builds its part of the answer as jsonb in Postgres.
//! GET /admin: the stats page itself.

use axum::{
    Json,
    extract::{Query, State},
    response::Html,
};
use serde::Deserialize;
use serde_json::{Value, json};

use crate::{AppState, auth::Admin, error::Result};

#[derive(Deserialize)]
pub struct Window {
    pub days: Option<i32>,
}

pub async fn page() -> Html<&'static str> {
    Html(include_str!("admin.html"))
}

pub async fn overview(State(s): State<AppState>, _: Admin, Query(w): Query<Window>) -> Result<Json<Value>> {
    let days = w.days.unwrap_or(30).clamp(1, 365);
    let q = |sql: &'static str| {
        let db = s.db.clone();
        async move { sqlx::query_scalar::<_, Value>(sql).bind(days).fetch_one(&db).await }
    };
    let (totals, daily, retention, churn, engagement, devices, errors, topics, questions, usage) = tokio::try_join!(
        q(TOTALS), q(DAILY), q(RETENTION), q(CHURN), q(ENGAGEMENT), q(DEVICES), q(ERRORS), q(TOPICS), q(QUESTIONS), q(USAGE),
    )?;
    Ok(Json(json!({
        "days": days,
        "live": s.kv.live().await,
        "totals": totals,
        "daily": daily,
        "retention": retention,
        "churn": churn,
        "engagement": engagement,
        "devices": devices,
        "errors": errors,
        "topics": topics,
        "questions": questions,
        "usage": usage,
    })))
}

// All queries take $1 = the window in days.

const TOTALS: &str = "
select jsonb_build_object(
  'days', $1::int,
  'devices', (select count(*) from devices),
  'active_devices', (select count(*) from devices where last_seen >= now() - make_interval(days => $1::int)),
  'profiles', (select count(*) from profiles),
  'restores', (select count(*) from profile_devices where how = 'restored'),
  'events', (select count(*) from events))";

// One row per day: who played, how much, and the errors.
const DAILY: &str = "
select coalesce(jsonb_agg(t order by t.day), '[]'::jsonb) from (
  select d.day::date as day,
         coalesce(a.devices, 0) as devices, coalesce(a.profiles, 0) as profiles,
         coalesce(a.sessions, 0) as sessions, coalesce(a.lessons, 0) as lessons,
         coalesce(a.answers, 0) as answers, coalesce(a.errors, 0) as errors,
         coalesce(n.new_devices, 0) as new_devices
  from generate_series((current_date - ($1::int - 1))::timestamptz, current_date::timestamptz, interval '1 day') as d(day)
  left join (
    select date_trunc('day', at) as day,
           count(distinct device_id) as devices, count(distinct profile_id) as profiles,
           count(*) filter (where name = 'session_start') as sessions,
           count(*) filter (where name = 'lesson_complete') as lessons,
           count(*) filter (where name = 'answer') as answers,
           count(*) filter (where name = 'error') as errors
    from events where at >= (current_date - ($1::int - 1))::timestamptz group by 1
  ) a on a.day = d.day
  left join (
    select date_trunc('day', first_seen) as day, count(*) as new_devices
    from devices where first_seen >= (current_date - ($1::int - 1))::timestamptz group by 1
  ) n on n.day = d.day
) t";

// Devices that came back 1, 7 and 30 days after their first day (devices
// first seen in the last 90 days, each counted once it is old enough).
const RETENTION: &str = "
with c as (select id, first_seen::date as d0 from devices where first_seen >= current_date - 90),
r as (
  select c.d0,
    exists(select 1 from events e where e.device_id = c.id and e.at >= (c.d0 + 1)::timestamptz and e.at < (c.d0 + 2)::timestamptz) as d1,
    exists(select 1 from events e where e.device_id = c.id and e.at >= (c.d0 + 7)::timestamptz and e.at < (c.d0 + 8)::timestamptz) as d7,
    exists(select 1 from events e where e.device_id = c.id and e.at >= (c.d0 + 30)::timestamptz and e.at < (c.d0 + 31)::timestamptz) as d30
  from c)
select jsonb_build_object(
  'window', $1::int,
  'cohort', count(*),
  'd1', jsonb_build_object('eligible', count(*) filter (where d0 <= current_date - 1), 'returned', count(*) filter (where d0 <= current_date - 1 and d1)),
  'd7', jsonb_build_object('eligible', count(*) filter (where d0 <= current_date - 7), 'returned', count(*) filter (where d0 <= current_date - 7 and d7)),
  'd30', jsonb_build_object('eligible', count(*) filter (where d0 <= current_date - 30), 'returned', count(*) filter (where d0 <= current_date - 30 and d30)))
from r";

// Children (profiles) by their last activity. Churned: played before the
// last 14 days and in the 30 days before that, but not in the last 14.
const CHURN: &str = "
with p as (select profile_id, min(at) as first_at, max(at) as last_at from events where profile_id is not null group by 1)
select jsonb_build_object(
  'window', $1::int,
  'total', count(*),
  'active_14d', count(*) filter (where last_at >= now() - interval '14 days'),
  'new_14d', count(*) filter (where first_at >= now() - interval '14 days'),
  'base', count(*) filter (where first_at < now() - interval '14 days' and last_at >= now() - interval '44 days'),
  'churned', count(*) filter (where first_at < now() - interval '14 days' and last_at >= now() - interval '44 days' and last_at < now() - interval '14 days'),
  'dormant', count(*) filter (where last_at < now() - interval '44 days'))
from p";

const ENGAGEMENT: &str = "
select jsonb_build_object(
  'sessions', count(*) filter (where name = 'session_start'),
  'avg_session_secs', round(avg(secs) filter (where name = 'session_end')),
  'median_session_secs', percentile_cont(0.5) within group (order by secs) filter (where name = 'session_end'),
  'lessons_started', count(*) filter (where name = 'lesson_start'),
  'lessons_completed', count(*) filter (where name = 'lesson_complete'),
  'lessons_quit', count(*) filter (where name = 'lesson_quit'),
  'answers', count(*) filter (where name = 'answer'),
  'correct_rate', round(avg(case when props->>'ok' = 'true' then 1.0 else 0.0 end) filter (where name = 'answer'), 3),
  'profiles_created', count(*) filter (where name = 'profile_create'),
  'profiles_restored', count(*) filter (where name = 'profile_restore'),
  'profile_switches', count(*) filter (where name = 'profile_switch'))
from (
  select name, props, case when jsonb_typeof(props->'secs') = 'number' then (props->>'secs')::numeric end as secs
  from events
  where at >= now() - make_interval(days => $1::int)
    and name in ('session_start', 'session_end', 'lesson_start', 'lesson_complete', 'lesson_quit', 'answer',
                 'profile_create', 'profile_restore', 'profile_switch')
) e";

// Devices seen in the window, counted by each detail (top 15 of each).
const DEVICES: &str = "
select coalesce(jsonb_object_agg(field, items), '{}'::jsonb) from (
  select field, jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc) as items from (
    select field, k, n, row_number() over (partition by field order by n desc) as rank from (
      select f.field, coalesce(f.k, '?') as k, count(*) as n
      from devices d
      cross join lateral (values
        ('platform', d.info->>'platform'), ('os', d.info->>'os'), ('browser', d.info->>'browser'),
        ('model', d.info->>'model'), ('memory', d.info->>'memory'), ('cores', d.info->>'cores'),
        ('screen', d.info->>'screen'), ('gpu', d.info->>'gpu'), ('version', d.info->>'version'),
        ('language', d.info->>'lang'), ('timezone', d.info->>'tz'), ('installed', d.info->>'standalone'),
        ('country', d.country)) as f(field, k)
      where d.last_seen >= now() - make_interval(days => $1::int)
      group by 1, 2
    ) c
  ) r where rank <= 15 group by field
) t";

const ERRORS: &str = "
select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
  select left(props->>'message', 300) as message, props->>'source' as source,
         count(*) as n, count(distinct device_id) as devices, max(at) as last, max(version) as version
  from events where name = 'error' and at >= now() - make_interval(days => $1::int)
  group by 1, 2 order by n desc limit 30
) x";

// Per lesson: how often it is started, finished and abandoned.
const TOPICS: &str = "
select coalesce(jsonb_agg(x order by x.starts desc), '[]'::jsonb) from (
  select props->>'topic' as topic,
    count(*) filter (where name = 'lesson_start') as starts,
    count(*) filter (where name = 'lesson_complete') as completes,
    count(*) filter (where name = 'lesson_quit') as quits,
    round(avg(case when jsonb_typeof(props->'pct') = 'number' then (props->>'pct')::numeric end) filter (where name = 'lesson_complete'), 2) as avg_pct,
    round(avg(case when jsonb_typeof(props->'secs') = 'number' then (props->>'secs')::numeric end) filter (where name = 'lesson_complete')) as avg_secs
  from events
  where name in ('lesson_start', 'lesson_complete', 'lesson_quit') and at >= now() - make_interval(days => $1::int)
  group by 1 order by starts desc limit 80
) x";

// The questions answered right least often (at least 3 answers).
const QUESTIONS: &str = "
select coalesce(jsonb_agg(x order by x.correct, x.n desc), '[]'::jsonb) from (
  select props->>'topic' as topic, props->>'item' as item, count(*) as n,
         round(avg(case when props->>'ok' = 'true' then 1.0 else 0.0 end), 2) as correct
  from events where name = 'answer' and at >= now() - make_interval(days => $1::int)
  group by 1, 2 having count(*) >= 3 order by correct, n desc limit 40
) x";

// What gets used: events by name, screens, taps, islands, network, speed.
const USAGE: &str = "
with e as (select name, props from events where at >= now() - make_interval(days => $1::int))
select jsonb_build_object(
  'events', (select coalesce(jsonb_agg(jsonb_build_object('k', name, 'n', n) order by n desc), '[]'::jsonb)
             from (select name, count(*) as n from e group by 1) x),
  'screens', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
              from (select props->>'screen' as k, count(*) as n from e where name = 'screen' group by 1 order by 2 desc limit 30) x),
  'taps', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
           from (select c.key as k, sum(case when jsonb_typeof(c.value) = 'number' then (c.value)::numeric else 0 end) as n
                 from e cross join lateral jsonb_each(case when jsonb_typeof(e.props->'counts') = 'object' then e.props->'counts' else '{}'::jsonb end) as c
                 where e.name = 'taps' group by 1 order by 2 desc limit 40) x),
  'islands', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n, 'load_ms', ms) order by n desc), '[]'::jsonb)
              from (select props->>'island' as k, count(*) as n,
                           round(avg(case when jsonb_typeof(props->'load_ms') = 'number' then (props->>'load_ms')::numeric end)) as ms
                    from e where name = 'island_enter' group by 1) x),
  'network', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
              from (select coalesce(props->>'net', '?') as k, count(*) as n from e where name = 'session_start' group by 1) x),
  'fps', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n, 'fps', fps) order by n desc), '[]'::jsonb)
          from (select props->>'island' as k, count(*) as n,
                       round(avg(case when jsonb_typeof(props->'fps') = 'number' then (props->>'fps')::numeric end)) as fps
                from e where name = 'perf' group by 1) x))";
