// Sync and telemetry in a headless browser, against a fake server that keeps
// the real one's contract (Backend/README.md):
//   a new child → the device registers, its events and the child's save
//   arrive → offline, events wait on the device and play goes on → back
//   online, they are sent → another device changed the same child: the
//   copies merge (pearls from both, the other device's purchase kept) → an
//   error is reported → a second device restores the child with its code.
//
//   npm test   (or: node tests/sync.mjs)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

const site = createServer(async (req, res) => {
  const file = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try {
    const body = await readFile(join(ROOT, file));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);

// ---------- The fake server ----------

const db = { devices: new Map(), events: [], profiles: new Map(), codes: new Map(), requests: [] };
const digits = s => [...String(s)].map(c => { const a = c.charCodeAt(0); return a >= 0x660 && a <= 0x669 ? String(a - 0x660) : /\d/.test(c) ? c : ''; }).join('');
const api = createServer(async (req, res) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, PUT, DELETE', 'access-control-allow-headers': 'authorization, content-type, content-encoding' };
  const send = (status, body) => { res.writeHead(status, { ...cors, 'content-type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  let raw = Buffer.concat(chunks);
  if (req.headers['content-encoding'] === 'gzip') raw = gunzipSync(raw);
  const body = raw.length ? JSON.parse(raw) : null;
  const url = new URL(req.url, 'http://x');
  db.requests.push({ method: req.method, path: url.pathname, gzip: req.headers['content-encoding'] === 'gzip' });

  if (req.method === 'POST' && url.pathname === '/v1/devices') {
    const token = randomUUID();
    db.devices.set(token, { id: body.id, info: body.info });
    return send(200, { token });
  }
  const device = db.devices.get((req.headers.authorization || '').replace('Bearer ', ''));
  if (!device) return send(401, { error: 'unauthorized' });

  if (req.method === 'POST' && url.pathname === '/v1/events') {
    if (body.device) device.info = body.device;
    const seen = new Set(db.events.map(e => e.id));
    body.events.filter(e => !seen.has(e.id)).forEach(e => db.events.push(e));
    return send(200, { received: body.events.length });
  }
  const m = /^\/v1\/profiles\/([0-9a-f-]+)(\/code)?$/.exec(url.pathname);
  if (m) {
    const [, uid, code] = m;
    const p = db.profiles.get(uid);
    if (req.method === 'PUT') {
      if (!p) { db.profiles.set(uid, { version: 1, save: body.save, name: body.name, hero: body.hero, devices: new Set([device.id]) }); return send(200, { version: 1 }); }
      if (!p.devices.has(device.id)) return send(403, {});
      if (p.version !== body.base_version) return send(409, { version: p.version, save: p.save, name: p.name, hero: p.hero });
      Object.assign(p, { version: p.version + 1, save: body.save, name: body.name, hero: body.hero });
      return send(200, { version: p.version });
    }
    if (!p) return send(404, {});
    if (!p.devices.has(device.id)) return send(403, {});
    if (code) {
      const found = [...db.codes].find(([, u]) => u === uid);
      const c = found ? found[0] : String(Math.floor(Math.random() * 1e12)).padStart(12, '0');
      db.codes.set(c, uid);
      return send(200, { code: c });
    }
    if (req.method === 'GET') return Number(url.searchParams.get('since')) === p.version ? send(204) : send(200, { version: p.version, save: p.save, name: p.name, hero: p.hero });
    if (req.method === 'DELETE') { p.devices.delete(device.id); return send(204); }
  }
  if (req.method === 'POST' && url.pathname === '/v1/restore') {
    const uid = db.codes.get(digits(body.code));
    if (!uid) return send(404, {});
    const p = db.profiles.get(uid);
    p.devices.add(device.id);
    return send(200, { id: uid, version: p.version, save: p.save, name: p.name, hero: p.hero });
  }
  send(404, {});
}).listen(0);

const API_ORIGIN = `http://localhost:${api.address().port}`;
const GAME = `http://localhost:${site.address().port}/?api=${encodeURIComponent(API_ORIGIN)}`;

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures += 1; };
async function until(fn, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await new Promise(r => setTimeout(r, 150)); }
  return false;
}
const named = name => db.events.filter(e => e.name === name);
const inPage = (p, code) => p.evaluate(code);
const flush = p => inPage(p, async () => { await (await import('./core/telemetry.js')).flush(); });
const syncAll = p => inPage(p, async () => { await (await import('./core/sync.js')).syncAll(); });

const browser = await chromium.launch({ args: ['--mute-audio'] });
async function device() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { window.__SINDBAD_TEST__ = true; });
  const p = await ctx.newPage();
  const errors = [];
  // Chromium logs every 4xx answer; 409 (merge) and 404 (wrong code) are the protocol working.
  const expected = m => /status of (404|409)\b/.test(m.text()) && (m.location().url || '').startsWith(API_ORIGIN);
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('boom-test') && !expected(m)) errors.push(m.text()); });
  p.on('pageerror', e => { if (!e.message.includes('boom-test')) errors.push(e.message); });
  return { ctx, p, errors };
}

// ---------- Device A: a new child ----------
console.log('— device A');
const A = await device();
await A.p.goto(GAME);
await A.p.click('text=ابدأ الرحلة');
await A.p.fill('#child-name', 'ليلى');
await A.p.click('#who-form [type=submit]');
await A.p.waitForSelector('#screen-select[data-active]', { timeout: 5000 });
await A.p.click('.hero-card[data-hero=yasmina]');
await A.p.click('#select-go');

await syncAll(A.p);
await flush(A.p);
check(db.devices.size === 1, 'the device registered');
const [info] = [...db.devices.values()].map(d => d.info);
check(info?.platform === 'web' && typeof info.os === 'string' && typeof info.browser === 'string' && 'memory' in info, `device details arrive (${info?.os}, ${info?.browser})`);
const uid = await inPage(A.p, async () => (await import('./core/save.js')).activeProfile().uid);
check(/^[0-9a-f-]{36}$/.test(uid), 'the child has a uid');
check(db.profiles.get(uid)?.save.hero === 'yasmina' && db.profiles.get(uid)?.name === 'ليلى', "the child's save is backed up");
for (const name of ['session_start', 'screen', 'profile_create', 'hero_pick']) check(named(name).length > 0, `event ${name} arrives`);
check(db.events.every(e => e.id && e.session && typeof e.at === 'number'), 'every event has an id, a visit and a time');
check(named('hero_pick').every(e => e.profile === uid), 'events name the child by uid');

// ---------- Offline ----------
console.log('— offline');
await A.ctx.setOffline(true);
await inPage(A.p, async () => {
  const { save } = await import('./core/save.js');
  save.update(s => { s.pearls = (s.pearls || 0) + 10; });
  (await import('./core/telemetry.js')).track('test_offline', { n: 1 });
});
await flush(A.p);
await syncAll(A.p);
check(named('test_offline').length === 0, 'offline: nothing is sent');
check(await until(() => inPage(A.p, () => (JSON.parse(localStorage.getItem('sindbad.outbox')) || []).some(e => e.name === 'test_offline')), 6000), 'offline: the event waits on the device');
check(await inPage(A.p, async () => (await import('./core/save.js')).save.get().pearls === 10), 'offline: play goes on (pearls saved locally)');

await A.ctx.setOffline(false);
check(await until(() => named('test_offline').length === 1), 'back online: the waiting event is sent, once');
check(await until(() => db.profiles.get(uid)?.save.pearls === 10), 'back online: the change is backed up');
await flush(A.p);
check(named('test_offline').length === 1, 'sending again stores nothing twice');

// ---------- Two devices changed the same child ----------
console.log('— conflict');
await syncAll(A.p);
const server = db.profiles.get(uid);
const before = server.version;
server.version += 1;
server.save = { ...server.save, pearls: server.save.pearls + 7, owned: ['hat-fez'] };   // another device earned 7 and bought a hat
await inPage(A.p, async () => { (await import('./core/save.js')).save.update(s => { s.pearls += 5; }); });   // this one earned 5
await syncAll(A.p);
const merged = await inPage(A.p, async () => (await import('./core/save.js')).save.get());
check(merged.pearls === 22, `pearls from both devices add up (10 + 7 + 5 = ${merged.pearls})`);
check(merged.owned?.includes('hat-fez'), "the other device's purchase is kept");
check(db.profiles.get(uid).save.pearls === 22 && db.profiles.get(uid).version === before + 2, 'the merged copy is sent back');

// ---------- Errors ----------
console.log('— errors');
await inPage(A.p, () => { setTimeout(() => { throw new Error('boom-test'); }); });
await A.p.waitForTimeout(200);
await flush(A.p);
const boom = named('error').find(e => String(e.props.message).includes('boom-test'));
check(!!boom && boom.props.kind === 'error' && boom.props.source.includes(':'), 'an uncaught error is reported with where it happened');
check(db.requests.some(r => r.path === '/v1/events' && r.gzip), 'big batches are sent compressed');

// ---------- Device B: restore with the code ----------
console.log('— device B');
const code = await inPage(A.p, async () => (await import('./core/sync.js')).restoreCode((await import('./core/save.js')).activeProfile()));
check(/^\d{4}-\d{4}-\d{4}$/.test(code || ''), `the parents' page code looks right (${code})`);
const B = await device();
await B.p.goto(GAME);
await B.p.click('text=ابدأ الرحلة');
await B.p.click('[data-restore]');
await B.p.fill('#restore-code', '0000-0000-0000');
await B.p.click('#restore-form [type=submit]');
check(await until(async () => (await B.p.textContent('#restore-msg')).includes('غير صحيح'), 5000), 'a wrong code says so');
// Typed in Arabic-Indic digits, as an Arabic keyboard would.
const arabic = code.replace(/\d/g, d => String.fromCharCode(0x660 + Number(d)));
await B.p.fill('#restore-code', arabic);
await B.p.click('#restore-form [type=submit]');
await B.p.waitForSelector('#screen-chapters[data-active], #screen-select[data-active]', { timeout: 8000 });
const restored = await inPage(B.p, async () => { const s = await import('./core/save.js'); return { name: s.activeProfile().name, uid: s.activeProfile().uid, pearls: s.save.get().pearls, hero: s.save.get().hero }; });
check(restored.uid === uid && restored.name === 'ليلى' && restored.pearls === 22 && restored.hero === 'yasmina', 'the child is restored on device B with all their progress');
check(named('profile_restore').length === 1, 'the restore is counted');

// B plays; A sees it.
await inPage(B.p, async () => { (await import('./core/save.js')).save.update(s => { s.pearls += 3; s.stickers = ['s-b']; }); });
await syncAll(B.p);
await syncAll(A.p);
const onA = await inPage(A.p, async () => (await import('./core/save.js')).save.get());
check(onA.pearls === 25 && onA.stickers?.includes('s-b'), 'progress made on B reaches A');

check(A.errors.length === 0 && B.errors.length === 0, `no console errors${[...A.errors, ...B.errors].length ? `: ${[...A.errors, ...B.errors].join(' | ')}` : ''}`);

await browser.close();
site.close();
api.close();
if (failures) { console.error(`✗ ${failures} sync check(s) failed`); process.exit(1); }
console.log('✓ sync and telemetry');
