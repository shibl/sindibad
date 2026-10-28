// Made from sync.ts by tools/build.ts. Edit that file, then run: npm run build
// Backup and sync of each child's progress with the server (Backend/). The
// game always plays from the save on this device; when online, each child's
// save is sent to the server, and changes made on another device (restored
// there with the child's code) come back. When both changed, the copies are
// merged (core/merge.ts), so progress made offline on two devices adds up.
//
// Per child, this device remembers the last version it agreed on with the
// server and that copy (the merge base):
//   sindbad.sync:<uid>   { version, base, pending }
// `pending` is the copy being sent: if the reply is lost and the server
// already has it, the next attempt recognises it instead of merging it twice.
import { apiBase, storeKey } from './env.js';
import { api, ensureToken } from './api.js';
import { merge, same } from './merge.js';
import { profileList, profileSave, replaceSave, addRestoredProfile, onSaveChange, activeProfile } from './save.js';
import { track } from './telemetry.js';
const metaKey = (uid) => storeKey(`sync:${uid}`);
const UNLINK = storeKey('sync-unlink');
const PULL_EVERY = 5 * 60_000;
const PUSH_AFTER = 15_000;
function readMeta(uid) {
    try {
        const m = JSON.parse(localStorage.getItem(metaKey(uid)) || 'null');
        if (m && typeof m.version === 'number')
            return m;
    }
    catch { /* ignore */ }
    return { version: 0, base: null };
}
function writeMeta(uid, m) {
    try {
        localStorage.setItem(metaKey(uid), JSON.stringify(m));
    }
    catch {
        // Full: without its base, the next sync merges safely (core/merge.ts).
        try {
            localStorage.removeItem(metaKey(uid));
        }
        catch { /* ignore */ }
    }
}
const deviceInfo = () => ({ platform: 'web', app: 'grade6' });
export const syncEnabled = () => !!apiBase();
/** When this child's progress was last backed up (ms), or null. */
export const lastBackup = (uid) => readMeta(uid).at || null;
// Write the merged copy, keeping anything the child did while it was on its way.
function apply(p, expected, next) {
    const now = profileSave(p.id);
    replaceSave(p.id, same(now, expected) ? next : merge(expected, now, next));
}
async function syncOne(p) {
    let meta = readMeta(p.uid);
    for (let attempt = 0; attempt < 4; attempt++) {
        const local = profileSave(p.id);
        if (meta.base && same(local, meta.base)) {
            // Nothing new here: has another device changed it?
            const res = await api('GET', `/v1/profiles/${p.uid}?since=${meta.version}`);
            if (res?.status === 204) {
                writeMeta(p.uid, { ...meta, at: Date.now() });
                return true;
            }
            if (res?.status === 404) {
                meta = { version: 0, base: null };
                continue;
            } // the server lost it: send it again
            if (!res?.ok)
                return false;
            const remote = await res.json();
            apply(p, local, remote.save);
            writeMeta(p.uid, { version: remote.version, base: remote.save, at: Date.now() });
            return true;
        }
        writeMeta(p.uid, { ...meta, pending: local });
        const res = await api('PUT', `/v1/profiles/${p.uid}`, { base_version: meta.version, name: p.name, hero: local.hero, save: local }, { gzip: true });
        if (res?.ok) {
            const { version } = await res.json();
            writeMeta(p.uid, { version, base: local, at: Date.now() });
            return true;
        }
        if (res?.status !== 409)
            return false;
        const remote = await res.json();
        if (meta.pending && same(remote.save, meta.pending)) {
            // Our last send arrived; only its reply was lost.
            meta = { version: remote.version, base: meta.pending };
            continue;
        }
        // Changed here and on another device: merge, then send the result.
        apply(p, local, merge(meta.base, local, remote.save));
        meta = { version: remote.version, base: remote.save };
        writeMeta(p.uid, meta);
    }
    return false;
}
let running = null;
/** Sync every child on this device (one at a time). */
export function syncAll() {
    if (!syncEnabled())
        return Promise.resolve();
    return (running ||= (async () => {
        try {
            if (!(await ensureToken(deviceInfo)))
                return;
            await sendUnlinks();
            for (const p of profileList())
                await syncOne(p);
        }
        catch (err) {
            console.warn('Sync failed', err);
        }
        finally {
            running = null;
        }
    })());
}
/** Sync one child now (before showing its code). */
export async function syncProfile(p) {
    if (!syncEnabled() || !(await ensureToken(deviceInfo)))
        return false;
    await running;
    return syncOne(p);
}
// ---------- Restore codes ----------
/** The child's restore code, as 1234-5678-9012; null when offline. */
export async function restoreCode(p) {
    if (!(await syncProfile(p)))
        return null;
    const res = await api('POST', `/v1/profiles/${p.uid}/code`);
    if (!res?.ok)
        return null;
    const { code } = await res.json();
    return String(code).replace(/(\d{4})(?=\d)/g, '$1-');
}
/** Bring a child onto this device from their code (typed in any digits). */
export async function restoreWithCode(code) {
    if (!syncEnabled() || !(await ensureToken(deviceInfo)))
        return { ok: false, reason: 'offline' };
    const res = await api('POST', '/v1/restore', { code });
    if (!res)
        return { ok: false, reason: 'offline' };
    if (res.status === 404)
        return { ok: false, reason: 'wrong' };
    if (res.status === 429)
        return { ok: false, reason: 'busy' };
    if (!res.ok)
        return { ok: false, reason: 'offline' };
    const r = await res.json();
    const here = profileList().find(p => p.uid === r.id);
    if (here) {
        // Already on this device: merge with what is here (no base: nothing counted twice).
        replaceSave(here.id, merge(null, profileSave(here.id), r.save));
        writeMeta(here.uid, { version: r.version, base: r.save, at: Date.now() });
        track('profile_restore', { again: true });
        syncAll();
        return { ok: true, id: here.id };
    }
    const id = addRestoredProfile(r.id, r.name || '', r.save);
    writeMeta(r.id, { version: r.version, base: r.save, at: Date.now() });
    track('profile_restore', { again: false });
    return { ok: true, id };
}
// ---------- Deleted children ----------
/** A child was deleted on this device: the server forgets this device for them (their backup stays). */
export function profileDeleted(uid) {
    try {
        localStorage.removeItem(metaKey(uid));
        const list = JSON.parse(localStorage.getItem(UNLINK) || '[]');
        localStorage.setItem(UNLINK, JSON.stringify([...new Set([...list, uid])]));
    }
    catch { /* ignore */ }
    syncAll();
}
async function sendUnlinks() {
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem(UNLINK) || '[]');
    }
    catch { /* ignore */ }
    for (const uid of list) {
        const res = await api('DELETE', `/v1/profiles/${uid}`);
        if (!res?.ok)
            return;
        list = list.filter(u => u !== uid);
        try {
            localStorage.setItem(UNLINK, JSON.stringify(list));
        }
        catch { /* ignore */ }
    }
}
// ---------- When ----------
export function initSync() {
    if (!syncEnabled())
        return;
    let timer = null;
    const pushSoon = () => { if (!timer)
        timer = setTimeout(() => { timer = null; const p = activeProfile(); if (p)
            syncProfile(p); }, PUSH_AFTER); };
    onSaveChange(pushSoon);
    addEventListener('online', () => syncAll());
    document.addEventListener('visibilitychange', () => { if (document.hidden) {
        const p = activeProfile();
        if (p)
            syncProfile(p);
    } });
    setInterval(() => { if (!document.hidden)
        syncAll(); }, PULL_EVERY);
    setTimeout(() => syncAll(), 4000);
}
