// Local save data (localStorage). No server, no accounts, nothing leaves the
// device. Several children can share a device: each has a profile with its
// own save.
//
//   sindbad.profiles        { active: id, list: [{ id, name, created }] }
//   sindbad.save.v1:<id>    one child's game:
//   {
//     version: 1,
//     hero: 'sindbad' | 'yasmina' | null,   // chosen character
//     topics: { [topicId]: { stars: 0–3, best: 0–1, plays: n, last: ms, history: [{ t, pct }] } },
//     review: { [topicId]: { due: ms, box: n } }  // spaced-review schedule
//     world:  { [islandId]: { letters, pearls, chests, … } }  // island progress
//     pearls, owned, style                  // pearl shop
//     time, days: { 'YYYY-MM-DD': seconds } // play time (for the parents' page)
//     muted: false
//   }
//
// Storage can be missing or throw (private mode, blocked site data), so every
// access is wrapped and the game keeps working in memory if it fails.

const LEGACY_KEY = 'sindbad.save.v1';
const PROFILES_KEY = 'sindbad.profiles';
const keyFor = id => `${LEGACY_KEY}:${id}`;

function read(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* in-memory only */ }
}

function fresh() {
  return { version: 1, hero: null, topics: {}, review: {}, muted: false };
}

// Profiles, migrating an older single-child save into the first profile.
function loadProfiles() {
  let p = read(PROFILES_KEY);
  if (!p) {
    p = { active: null, list: [] };
    const legacy = read(LEGACY_KEY);
    if (legacy) {
      p = { active: 'p1', list: [{ id: 'p1', name: '', created: Date.now() }] };
      write(keyFor('p1'), legacy);
    }
    write(PROFILES_KEY, p);
  }
  return p;
}

let profiles = loadProfiles();

// The legacy key always mirrors the active child's save (older builds and
// the tests read and write it directly), so it is the source of truth here.
function loadState() {
  if (!profiles.active) return fresh();
  return { ...fresh(), ...(read(LEGACY_KEY) || read(keyFor(profiles.active)) || {}) };
}

let state = loadState();

function persist() {
  if (!profiles.active) {
    // First save of a brand-new device: create a profile on the fly.
    profiles = { active: 'p1', list: [{ id: 'p1', name: '', created: Date.now() }] };
    write(PROFILES_KEY, profiles);
  }
  write(keyFor(profiles.active), state);
  write(LEGACY_KEY, state);
}

export const save = {
  get: () => state,
  // Mutate the save through a callback, then persist it.
  update(fn) {
    fn(state);
    persist();
    return state;
  },
  reset() {
    state = fresh();
    persist();
  },
};

// ---------- Profiles ----------

export const profileList = () => profiles.list;
export const activeProfile = () => profiles.list.find(p => p.id === profiles.active) || null;
export const profileSave = id => ({ ...fresh(), ...(read(keyFor(id)) || {}) });

export function createProfile(name) {
  const id = `p${Date.now().toString(36)}`;
  profiles.list.push({ id, name: name.trim().slice(0, 20), created: Date.now() });
  profiles.active = id;
  write(PROFILES_KEY, profiles);
  state = fresh();
  persist();
  return id;
}

export function switchProfile(id) {
  profiles.active = id;
  write(PROFILES_KEY, profiles);
  state = { ...fresh(), ...(read(keyFor(id)) || {}) };
  write(LEGACY_KEY, state);
}

export function renameProfile(id, name) {
  const p = profiles.list.find(x => x.id === id);
  if (p) { p.name = name.trim().slice(0, 20); write(PROFILES_KEY, profiles); }
}

export function deleteProfile(id) {
  profiles.list = profiles.list.filter(p => p.id !== id);
  try { localStorage.removeItem(keyFor(id)); } catch { /* ignore */ }
  if (profiles.active === id) profiles.active = profiles.list[0]?.id || null;
  write(PROFILES_KEY, profiles);
  state = profiles.active ? { ...fresh(), ...(read(keyFor(profiles.active)) || {}) } : fresh();
  write(LEGACY_KEY, state);
}

// ---------- Play time ----------
// Called every few seconds while the game is visible.
export function addPlayTime(seconds) {
  if (!profiles.active || !state.hero) return;
  const day = new Date().toISOString().slice(0, 10);
  state.time = (state.time || 0) + seconds;
  state.days = { ...(state.days || {}), [day]: ((state.days || {})[day] || 0) + seconds };
  persist();
}
