-- Devices: one per browser (or app install). The client makes up its id at
-- first launch, so it can queue events offline before it ever registers.
create table devices (
  id          uuid primary key,
  token_hash  bytea not null unique,          -- sha-256 of the bearer token
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  country     text,                           -- from the edge (CF-IPCountry), when deployed behind one
  info        jsonb not null default '{}'::jsonb  -- platform, os, browser, model, memory, screen, version…
);

-- Child profiles backed up from devices. `save` is the game's save document,
-- `version` goes up by one on every write (optimistic concurrency: a client
-- that wrote from an older version gets 409 and the newer copy to merge).
create table profiles (
  id          uuid primary key,
  created_by  uuid not null references devices(id),
  name        text not null default '',
  hero        text,
  save        jsonb not null,
  version     bigint not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Which devices may read and write a profile: the one that created it, and
-- any device that restored it with its code.
create table profile_devices (
  profile_id  uuid not null references profiles(id) on delete cascade,
  device_id   uuid not null references devices(id) on delete cascade,
  how         text not null default 'created',  -- 'created' | 'restored'
  linked_at   timestamptz not null default now(),
  primary key (profile_id, device_id)
);
create index profile_devices_device on profile_devices (device_id);

-- The last save of each day, so a bad sync can be undone by hand.
create table profile_snapshots (
  profile_id  uuid not null references profiles(id) on delete cascade,
  day         date not null,
  version     bigint not null,
  save        jsonb not null,
  primary key (profile_id, day)
);

-- A profile's restore code (12 digits): typed on a new device to bring the
-- child's progress back.
create table restore_codes (
  code        text primary key,
  profile_id  uuid not null unique references profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Telemetry. The client makes up each event's id, so a batch that is sent
-- twice (a retry after a dropped connection) is stored once.
create table events (
  id          uuid primary key,
  device_id   uuid not null,
  profile_id  uuid,
  session_id  uuid,
  name        text not null,
  at          timestamptz not null,           -- when it happened (device clock, corrected)
  received_at timestamptz not null default now(),
  version     text,                           -- game build
  props       jsonb not null default '{}'::jsonb
);
create index events_name_at on events (name, at);
create index events_at on events using brin (at);
create index events_device_at on events (device_id, at);
create index events_profile_at on events (profile_id, at) where profile_id is not null;
