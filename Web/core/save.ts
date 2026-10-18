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
//
// The staging copy uses 'sindbad-staging.' instead of 'sindbad.' (env.ts).

import { storeKey } from './env.js';

/** A topic's record: its stars (0–3), best score (0–1), plays, last play, and each play's score. */
export interface TopicRecord {
  stars: number; best: number; plays: number; last?: number; history?: { t: number; pct: number }[];
  /** The items missed last time (their keys), asked first next time. */
  missed?: string[];
}

/** One child's game. Every field but the first five is added when first used. */
export interface GameSave {
  version: 1;
  hero: 'sindbad' | 'yasmina' | null;
  topics: Record<string, TopicRecord>;
  /** The spaced-review schedule. */
  review: Record<string, { due: number; box: number }>;
  muted: boolean;
  /** Each island's progress (save.world.lab = { met, done }, world.atlas.visited…). */
  world?: Record<string, any>;
  /** The pearl shop: pearls, what was bought, what is worn. */
  pearls?: number;
  owned?: string[];
  style?: Record<string, string | null>;
  stickers?: string[];
  /** Map regions seen, badges won ('bronze' | 'silver' | 'gold'), guardians beaten. */
  revealed?: string[];
  badges?: Record<string, string>;
  guardians?: string[];
  storySeen?: boolean;
  finale?: { at: number };
  /** Lessons played per day ('YYYY-MM-DD'), for the daily goal and the streak. */
  daily?: Record<string, number>;
  /** Play time in seconds, in all and per day ('YYYY-MM-DD'), for the parents' page. */
  time?: number;
  days?: Record<string, number>;
  /** Settings (core/settings.ts). */
  musicOff?: boolean;
  noVibrate?: boolean;
  bigText?: boolean;
  calm?: boolean;
  [more: string]: unknown;
}

export interface Profile { id: string; name: string; created: number }
interface Profiles { active: string | null; list: Profile[] }

const LEGACY_KEY = storeKey('save.v1');
const PROFILES_KEY = storeKey('profiles');
const keyFor = (id: string) => `${LEGACY_KEY}:${id}`;

function read(key: string): any {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* in-memory only */ }
}

function fresh(): GameSave {
  return { version: 1, hero: null, topics: {}, review: {}, muted: false };
}

// Profiles, migrating an older single-child save into the first profile.
function loadProfiles(): Profiles {
  let p: Profiles | null = read(PROFILES_KEY);
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
function loadState(): GameSave {
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
  write(keyFor(profiles.active!), state);
  write(LEGACY_KEY, state);
}

export const save = {
  get: () => state,
  // Mutate the save through a callback, then persist it.
  update(fn: (s: GameSave) => void) {
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
export const profileSave = (id: string): GameSave => ({ ...fresh(), ...(read(keyFor(id)) || {}) });

export function createProfile(name: string) {
  const id = `p${Date.now().toString(36)}`;
  profiles.list.push({ id, name: name.trim().slice(0, 20), created: Date.now() });
  profiles.active = id;
  write(PROFILES_KEY, profiles);
  state = fresh();
  persist();
  return id;
}

export function switchProfile(id: string) {
  profiles.active = id;
  write(PROFILES_KEY, profiles);
  state = { ...fresh(), ...(read(keyFor(id)) || {}) };
  write(LEGACY_KEY, state);
}

export function renameProfile(id: string, name: string) {
  const p = profiles.list.find(x => x.id === id);
  if (p) { p.name = name.trim().slice(0, 20); write(PROFILES_KEY, profiles); }
}

export function deleteProfile(id: string) {
  profiles.list = profiles.list.filter(p => p.id !== id);
  try { localStorage.removeItem(keyFor(id)); } catch { /* ignore */ }
  if (profiles.active === id) profiles.active = profiles.list[0]?.id || null;
  write(PROFILES_KEY, profiles);
  state = profiles.active ? { ...fresh(), ...(read(keyFor(profiles.active)) || {}) } : fresh();
  write(LEGACY_KEY, state);
}

// ---------- Play time ----------
// Called every few seconds while the game is visible.
export function addPlayTime(seconds: number) {
  if (!profiles.active || !state.hero) return;
  const day = new Date().toISOString().slice(0, 10);
  state.time = (state.time || 0) + seconds;
  state.days = { ...(state.days || {}), [day]: ((state.days || {})[day] || 0) + seconds };
  persist();
}
