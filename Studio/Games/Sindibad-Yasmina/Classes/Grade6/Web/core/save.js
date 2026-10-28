// Made from save.ts by tools/build.ts. Edit that file, then run: npm run build
// Local save data (localStorage). The game always plays from the copy on the
// device, so it works offline; core/sync.ts backs each child's save up to the
// server and merges it with other devices' copies when online. Several
// children can share a device: each has a profile with its own save.
//
//   sindbad.profiles        { active: id, list: [{ id, name, created, uid }] }
//                           (uid: the profile's id on the server and every device)
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
const LEGACY_KEY = storeKey('save.v1');
const PROFILES_KEY = storeKey('profiles');
const keyFor = (id) => `${LEGACY_KEY}:${id}`;
function read(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
function write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    }
    catch { /* in-memory only */ }
}
/** A random id (UUID v4). randomUUID needs https or localhost; a phone on the local network gets the fallback. */
export function uuid() {
    if (typeof crypto.randomUUID === 'function')
        return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
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
            p = { active: 'p1', list: [{ id: 'p1', name: '', created: Date.now(), uid: uuid() }] };
            write(keyFor('p1'), legacy);
        }
        write(PROFILES_KEY, p);
    }
    // Profiles from before sync get their uid now.
    if (p.list.some(x => !x.uid)) {
        p.list.forEach(x => { x.uid ||= uuid(); });
        write(PROFILES_KEY, p);
    }
    return p;
}
let profiles = loadProfiles();
// The legacy key always mirrors the active child's save (older builds and
// the tests read and write it directly), so it is the source of truth here.
function loadState() {
    if (!profiles.active)
        return fresh();
    return { ...fresh(), ...(read(LEGACY_KEY) || read(keyFor(profiles.active)) || {}) };
}
let state = loadState();
function persist() {
    if (!profiles.active) {
        // First save of a brand-new device: create a profile on the fly.
        profiles = { active: 'p1', list: [{ id: 'p1', name: '', created: Date.now(), uid: uuid() }] };
        write(PROFILES_KEY, profiles);
    }
    write(keyFor(profiles.active), state);
    write(LEGACY_KEY, state);
    changed.forEach(fn => fn());
}
// Called after every change to the active child's save (core/sync.ts).
const changed = [];
export function onSaveChange(fn) { changed.push(fn); }
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
export const profileSave = (id) => ({ ...fresh(), ...(read(keyFor(id)) || {}) });
export function createProfile(name) {
    const id = `p${Date.now().toString(36)}`;
    profiles.list.push({ id, name: name.trim().slice(0, 20), created: Date.now(), uid: uuid() });
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
    if (p) {
        p.name = name.trim().slice(0, 20);
        write(PROFILES_KEY, profiles);
    }
}
// ---------- Sync (core/sync.ts) ----------
/** Replace a child's save with the merged copy (live, if it's the one playing). */
export function replaceSave(id, next) {
    write(keyFor(id), next);
    if (profiles.active !== id)
        return;
    // In place: the game may hold on to the save object.
    for (const k of Object.keys(state))
        delete state[k];
    Object.assign(state, fresh(), next);
    write(LEGACY_KEY, state);
}
/** A child restored from the server onto this device. Returns the local id. */
export function addRestoredProfile(uid, name, data) {
    const id = `p${Date.now().toString(36)}`;
    profiles.list.push({ id, name: name.trim().slice(0, 20), created: Date.now(), uid });
    write(PROFILES_KEY, profiles);
    write(keyFor(id), { ...fresh(), ...data });
    return id;
}
export function deleteProfile(id) {
    profiles.list = profiles.list.filter(p => p.id !== id);
    try {
        localStorage.removeItem(keyFor(id));
    }
    catch { /* ignore */ }
    if (profiles.active === id)
        profiles.active = profiles.list[0]?.id || null;
    write(PROFILES_KEY, profiles);
    state = profiles.active ? { ...fresh(), ...(read(keyFor(profiles.active)) || {}) } : fresh();
    write(LEGACY_KEY, state);
}
// ---------- Play time ----------
// Called every few seconds while the game is visible.
export function addPlayTime(seconds) {
    if (!profiles.active || !state.hero)
        return;
    const day = new Date().toISOString().slice(0, 10);
    state.time = (state.time || 0) + seconds;
    state.days = { ...(state.days || {}), [day]: ((state.days || {})[day] || 0) + seconds };
    persist();
}
