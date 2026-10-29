// Telemetry: what happens in the game and on which devices, for the stats
// page (Backend/, /admin). Events wait on the device (localStorage) and go
// to the server in batches whenever it is online; play never waits for it.
//
//   session_start / session_end   a visit (a new one after 30 minutes away)
//   screen                        each screen shown
//   taps                          buttons tapped, counted per visit
//   lesson_start / answer / lesson_complete / lesson_quit   (core/lesson.ts)
//   island_enter, perf            islands opened, load time, frame rate
//   profile_*, hero_pick, shop_buy, setting, language
//   error                         uncaught errors, failed files, console.error
//
// Each event carries the device id (core/api.ts), the child's profile uid,
// the visit's id and the game build.

import { apiBase, storeKey, STAGING } from './env.js';
import { activeProfile, uuid } from './save.js';
import { api, ensureToken } from './api.js';

interface TrackedEvent { id: string; name: string; at: number; profile: string | null; session: string; v: string; props: Record<string, unknown> }

const OUTBOX = storeKey('outbox');
const BUILD = storeKey('build');
const MAX_QUEUE = 3000;     // oldest dropped beyond this (weeks offline)
const BATCH = 200;
const KEEPALIVE_BYTES = 60_000;
const NEW_SESSION_AFTER = 30 * 60_000;
const FLUSH_EVERY = 30_000;

let enabled = false;
let queue: TrackedEvent[] = [];
let session = uuid();
let visibleSince = Date.now();
let hiddenAt = 0;
let build = 'dev';
let taps: Record<string, number> = {};
let errorsThisSession = 0;
const errorCounts = new Map<string, number>();
let model: string | null = null;
let gpu: string | null = null;

function loadQueue(): TrackedEvent[] {
  try { const q = JSON.parse(localStorage.getItem(OUTBOX) || '[]'); return Array.isArray(q) ? q : []; } catch { return []; }
}
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveQueue() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  try { localStorage.setItem(OUTBOX, JSON.stringify(queue)); } catch {
    // Full: keep the newer half.
    queue = queue.slice(-Math.floor(queue.length / 2));
    try { localStorage.setItem(OUTBOX, JSON.stringify(queue)); } catch { /* in memory only */ }
  }
}
// Writing the whole queue on every tap would be slow on a cheap phone.
const saveSoon = () => { saveTimer ||= setTimeout(saveQueue, 3000); };

/** Record an event. Does nothing when there is no server (core/env.ts). */
export function track(name: string, props: Record<string, unknown> = {}): void {
  if (!enabled) return;
  queue.push({ id: uuid(), name, at: Date.now(), profile: activeProfile()?.uid || null, session, v: build, props });
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  saveSoon();
}

// ---------- Sending ----------

let sending = false;
let retryAt = 0;
let backoff = 0;
let infoSent = '';

/** Send what is waiting. Keepalive: the page is being hidden (one small batch, uncompressed). */
export async function flush({ keepalive = false } = {}): Promise<void> {
  if (!enabled || sending || !navigator.onLine || Date.now() < retryAt) return;
  countTaps();
  if (!queue.length) return;
  sending = true;
  try {
    if (!(await ensureToken(deviceInfo))) throw new Error('not registered');
    while (queue.length) {
      let batch = queue.slice(0, BATCH);
      if (keepalive) while (batch.length > 1 && JSON.stringify(batch).length > KEEPALIVE_BYTES) batch = batch.slice(0, batch.length >> 1);
      const info = JSON.stringify(deviceInfo());
      const body = { sent_at: Date.now(), device: info === infoSent ? undefined : JSON.parse(info), events: batch };
      const res = await api('POST', '/v1/events', body, { keepalive, gzip: !keepalive });
      // Rejected as malformed: drop it rather than retry it forever.
      if (res && res.status === 400) console.warn('Telemetry batch rejected', await res.text());
      else if (!res?.ok) throw new Error(`events: ${res?.status ?? 'offline'}`);
      else infoSent = info;
      const sent = new Set(batch.map(e => e.id));
      queue = queue.filter(e => !sent.has(e.id));   // new ones may have arrived meanwhile
      saveQueue();
      if (keepalive) break;
    }
    backoff = 0;
  } catch {
    backoff = Math.min((backoff || 15_000) * 2, 15 * 60_000);
    retryAt = Date.now() + backoff;
  } finally {
    sending = false;
  }
}

// ---------- The device ----------

function osOf(ua: string): string {
  let m;
  if ((m = /Android (\d+(?:\.\d+)?)/.exec(ua))) return `Android ${m[1]}`;
  if ((m = /(?:iPhone|iPad|iPod).*? OS (\d+)/.exec(ua))) return `iOS ${m[1]}`;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'iPadOS';
  if ((m = /Windows NT (\d+\.\d+)/.exec(ua))) return `Windows ${m[1]}`;
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'other';
}

function browserOf(ua: string): string {
  const named: [RegExp, string][] = [
    [/SamsungBrowser\/(\d+)/, 'Samsung'], [/OPR\/(\d+)|Opera\/(\d+)/, 'Opera'], [/Edg[A-Z]?\/(\d+)/, 'Edge'],
    [/UCBrowser\/(\d+)/, 'UC'], [/YaBrowser\/(\d+)/, 'Yandex'], [/MiuiBrowser\/(\d+)/, 'Mi'], [/HuaweiBrowser\/(\d+)/, 'Huawei'],
    [/FxiOS\/(\d+)/, 'Firefox iOS'], [/CriOS\/(\d+)/, 'Chrome iOS'], [/Firefox\/(\d+)/, 'Firefox'],
    [/; wv\).*Chrome\/(\d+)/, 'WebView'], [/Chrome\/(\d+)/, 'Chrome'], [/Version\/(\d+).*Safari/, 'Safari'],
  ];
  for (const [re, name] of named) {
    const m = re.exec(ua);
    if (m) return `${name} ${m[1] || m[2] || ''}`.trim();
  }
  return 'other';
}

function deviceInfo() {
  const ua = navigator.userAgent;
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  return {
    platform: 'web',
    app: 'grade6',
    version: build,
    staging: STAGING,
    os: osOf(ua),
    browser: browserOf(ua),
    model,
    ua: ua.slice(0, 300),
    memory: navigator.deviceMemory ?? null,
    cores: navigator.hardwareConcurrency ?? null,
    screen: `${screen.width}x${screen.height}@${Math.round(devicePixelRatio * 100) / 100}`,
    touch: navigator.maxTouchPoints > 0,
    standalone: matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    lang: document.documentElement.lang || 'ar',
    locale: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    gpu,
    lite: document.body.classList.contains('lite'),
    data_saver: conn?.saveData ?? null,
  };
}

function network() {
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return navigator.onLine ? conn?.effectiveType || 'online' : 'offline';
}

// The details that cost something to find out, once, when the game is idle.
function probeDevice() {
  const ua = navigator as Navigator & { userAgentData?: { getHighEntropyValues(h: string[]): Promise<{ model?: string; platformVersion?: string }> } };
  ua.userAgentData?.getHighEntropyValues(['model', 'platformVersion']).then(v => { model = v.model || null; }).catch(() => {});
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER)).slice(0, 120);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    } else gpu = 'none';
  } catch { gpu = 'none'; }
}

// The game build is the offline copy's version (service-worker.js).
function askBuild() {
  try { build = localStorage.getItem(BUILD) || build; } catch { /* ignore */ }
  const sw = navigator.serviceWorker;
  if (!sw?.controller) return;
  sw.addEventListener('message', e => {
    if (typeof e.data?.version !== 'string') return;
    build = e.data.version;
    try { localStorage.setItem(BUILD, build); } catch { /* ignore */ }
  });
  sw.controller.postMessage('version');
}

// ---------- Automatic events ----------

function sessionStart(resumed: boolean) {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  track('session_start', {
    resumed,
    net: network(),
    load_ms: resumed || !nav ? null : Math.round(nav.domContentLoadedEventEnd || nav.duration),
    screen: document.body.dataset.screen || 'title',
  });
}

function sessionEnd() {
  track('session_end', { secs: Math.round((Date.now() - visibleSince) / 1000), screen: document.body.dataset.screen || 'title' });
}

// Which button: its id or data-* name, never its text (it can hold a child's name).
function tapLabel(el: HTMLElement): string {
  const d = el.dataset;
  if (el.id) return `#${el.id}`;
  if (d.go) return `go:${d.go}`;
  if (d.who) return d.who === 'new' || d.who === 'restore' ? `who:${d.who}` : 'who:child';
  for (const k of ['p', 'result', 'key', 'learn', 'buy', 'slot', 'item', 'lang']) if (d[k]) return `${k}:${d[k]}`.slice(0, 60);
  const cls = el.classList[0];
  return cls ? `.${cls}` : el.tagName.toLowerCase();
}

function countTaps() {
  if (!Object.keys(taps).length) return;
  const counts = taps;
  taps = {};
  track('taps', { counts });
}

function report(kind: string, message: string, source = '', stack = '') {
  if (++errorsThisSession > 50) return;
  const key = `${kind}:${message}`;
  const seen = (errorCounts.get(key) || 0) + 1;
  errorCounts.set(key, seen);
  if (seen > 5) return;   // one broken loop must not fill the queue
  track('error', { kind, message: message.slice(0, 500), source: source.slice(0, 200), stack: stack.slice(0, 1500), screen: document.body.dataset.screen || 'title' });
}

function captureErrors() {
  addEventListener('error', e => {
    const t = e.target as HTMLElement | null;
    if (t && t !== (window as unknown) && 'tagName' in t) {
      // A file that failed to load (script, image, audio…).
      report('resource', `${t.tagName.toLowerCase()} failed to load`, (t as HTMLImageElement).src || (t as HTMLLinkElement).href || '');
      return;
    }
    const ev = e as ErrorEvent;
    report('error', ev.message || 'error', `${ev.filename || ''}:${ev.lineno || 0}:${ev.colno || 0}`, ev.error?.stack || '');
  }, true);
  addEventListener('unhandledrejection', e => {
    const r = e.reason;
    report('promise', r instanceof Error ? r.message : String(r), '', r instanceof Error ? r.stack || '' : '');
  });
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    original(...args);
    try {
      const err = args.find(a => a instanceof Error) as Error | undefined;
      const text = args.map(a => a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      report('console', text, '', err?.stack || '');
    } catch { /* never let reporting break the game */ }
  };
}

/** Frame rate on a 3D island: counted for 5 s once it has settled. */
export function sampleFps(island: string): void {
  if (!enabled) return;
  setTimeout(() => {
    if (document.hidden || document.body.dataset.screen !== island) return;
    let frames = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (now - start < 5000) { frames++; requestAnimationFrame(tick); return; }
      if (document.body.dataset.screen === island) {
        track('perf', { island, fps: Math.round((frames * 1000) / (now - start)), lite: document.body.classList.contains('lite') });
      }
    };
    requestAnimationFrame(tick);
  }, 3000);
}

export function initTelemetry(): void {
  if (!apiBase()) return;
  enabled = true;
  queue = loadQueue();
  captureErrors();
  askBuild();
  sessionStart(false);

  document.addEventListener('click', e => {
    const el = (e.target as Element).closest<HTMLElement>('button, a, [data-go], [role="button"], [role="switch"], [data-who], [data-p]');
    if (!el) return;
    const label = `${document.body.dataset.screen || 'title'}/${tapLabel(el)}`;
    taps[label] = (taps[label] || 0) + 1;
  }, true);
  document.addEventListener('languagechange', () => track('language', { lang: document.documentElement.lang }));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      sessionEnd();
      countTaps();
      saveQueue();
      flush({ keepalive: true });
    } else {
      if (Date.now() - hiddenAt > NEW_SESSION_AFTER) { session = uuid(); sessionStart(true); }
      visibleSince = Date.now();
      flush();
    }
  });
  addEventListener('pagehide', saveQueue);
  addEventListener('online', () => { retryAt = 0; flush(); });
  setInterval(() => { if (!document.hidden) flush(); }, FLUSH_EVERY);
  setTimeout(() => { probeDevice(); flush(); }, 5000);
}
