// Diagnostics: a log of what the game does on this device, and a full
// report on its 3D graphics (WebGL), to find out why a phone gets the flat
// map or an island says it cannot draw 3D.
//
//   ?debug=1   shows the 🐞 button on this device (remembered; ?debug=0 hides
//              it). The button opens the report and the log, to copy or share
//              them; no server needed.
//
// With a server (core/env.ts apiBase) the report goes there as a `diag`
// event, once per browser version on every device (nothing about the child),
// and on a device in debug mode every log line goes too, as `log` events
// (Backend: the /admin/debug page, and the server's own log).
//
// The rest of the game adds what it decides with note('topic', details):
// the sea map's choice of view, each 3D renderer it makes, an island that
// failed. Everything written to the console is kept as well.

import { apiBase, storeKey, STAGING } from './env.js';
import { track, flush } from './telemetry.js';
import { detailsNow, gatherDetails } from './device.js';

interface Line { t: number; level: string; text: string }

const MAX_LINES = 500;
const KEEP_LINES = 150;          // kept across a reload (localStorage)
const LOG_BATCH = 40;
const DEBUG_KEY = storeKey('debug');
const LOG_KEY = storeKey('debugLog');
const SENT_KEY = storeKey('diagSent');
const started = Date.now();

const lines: Line[] = [];
const facts: Record<string, unknown> = {};
let unsent = 0;                  // lines not yet sent as `log` events
let debugOn = false;
let ready = false;

// ---------- The log ----------

function text(a: unknown): string {
  if (a instanceof Error) return `${a.name}: ${a.message}${a.stack ? `\n${a.stack}` : ''}`;
  if (typeof a === 'string') return a;
  if (a instanceof Event) return `[${a.type} event]`;
  try { return JSON.stringify(a); } catch { return String(a); }
}

function add(level: string, args: unknown[]) {
  const line = { t: Date.now(), level, text: args.map(text).join(' ').slice(0, 2000) };
  lines.push(line);
  unsent++;
  if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES);
  if (panel && !panel.hidden) paint();
}

/** Record something the game decided, for the report and the log. */
export function note(topic: string, details: unknown = true): void {
  facts[topic] = details;
  add('note', [`[${topic}]`, details]);
}

function captureConsole() {
  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      try { add(level, args); } catch { /* never let the log break the game */ }
    };
  }
  addEventListener('error', e => {
    const t = e.target as HTMLElement | null;
    if (t && t !== (window as unknown) && 'tagName' in t) {
      add('error', [`${t.tagName.toLowerCase()} failed to load:`, (t as HTMLImageElement).src || (t as HTMLLinkElement).href || '']);
      return;
    }
    const ev = e as ErrorEvent;
    add('error', [`Uncaught ${ev.message} (${ev.filename || ''}:${ev.lineno || 0}:${ev.colno || 0})`, ...(ev.error ? [ev.error] : [])]);
  }, true);
  addEventListener('unhandledrejection', e => add('error', ['Unhandled promise rejection:', e.reason]));
  // The game's 3D views: the browser can take one away (the graphics chip
  // was reset, or too many views at once) and give it back.
  for (const type of ['webglcontextlost', 'webglcontextrestored', 'webglcontextcreationerror']) {
    addEventListener(type, e => add(type === 'webglcontextrestored' ? 'info' : 'warn', [`${type} on canvas.${(e.target as HTMLElement).className || '?'}`, (e as WebGLContextEvent).statusMessage || '']), true);
  }
  for (const type of ['freeze', 'resume']) document.addEventListener(type, () => add('info', [`page ${type}`]));
  addEventListener('pageshow', e => add('info', [`pageshow${e.persisted ? ' (from the back-forward cache)' : ''}`]));
  addEventListener('orientationchange', () => add('info', [`orientation ${screen.orientation?.type || ''}`]));
  addEventListener('online', () => add('info', ['online']));
  addEventListener('offline', () => add('info', ['offline']));
  addEventListener('pagehide', keep);
  document.addEventListener('visibilitychange', () => {
    add('info', [document.hidden ? 'hidden' : 'visible']);
    if (document.hidden) keep();
  });
  // Each screen the game shows (app.ts sets body[data-screen]).
  new MutationObserver(() => add('info', [`screen: ${document.body.dataset.screen}`]))
    .observe(document.body, { attributes: true, attributeFilter: ['data-screen'] });
}

// The end of the last visit's log, so a crash that reloads the page still
// shows what led to it.
function keep() {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(lines.slice(-KEEP_LINES))); } catch { /* full or blocked */ }
}
function previous(): Line[] {
  try { const l = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); return Array.isArray(l) ? l : []; } catch { return []; }
}

// ---------- WebGL ----------

interface GLInfo {
  version: string; glsl: string; vendor: string; renderer: string;
  unmaskedVendor?: string; unmaskedRenderer?: string;
  limits: Record<string, unknown>; precision: Record<string, string>;
  attributes: WebGLContextAttributes | null; extensions?: string[];
  draw?: string;
}
interface Attempt { type: string; options: string; ok: boolean; ms: number; message?: string; thrown?: string; info?: GLInfo }

const plain = (v: unknown) => (v && typeof v === 'object' && 'length' in v ? Array.from(v as ArrayLike<number>) : v);

function glInfo(gl: WebGLRenderingContext, full: boolean): GLInfo {
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const g2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? gl : null;
  const names = ['MAX_TEXTURE_SIZE', 'MAX_CUBE_MAP_TEXTURE_SIZE', 'MAX_RENDERBUFFER_SIZE', 'MAX_VIEWPORT_DIMS',
    'MAX_VERTEX_ATTRIBS', 'MAX_VERTEX_UNIFORM_VECTORS', 'MAX_FRAGMENT_UNIFORM_VECTORS', 'MAX_VARYING_VECTORS',
    'MAX_TEXTURE_IMAGE_UNITS', 'MAX_VERTEX_TEXTURE_IMAGE_UNITS', 'MAX_COMBINED_TEXTURE_IMAGE_UNITS',
    'ALIASED_LINE_WIDTH_RANGE', 'ALIASED_POINT_SIZE_RANGE', 'SAMPLES', 'DEPTH_BITS', 'STENCIL_BITS',
    ...(g2 ? ['MAX_3D_TEXTURE_SIZE', 'MAX_ARRAY_TEXTURE_LAYERS', 'MAX_SAMPLES', 'MAX_DRAW_BUFFERS', 'MAX_COLOR_ATTACHMENTS',
      'MAX_UNIFORM_BUFFER_BINDINGS', 'MAX_UNIFORM_BLOCK_SIZE', 'MAX_VERTEX_UNIFORM_COMPONENTS', 'MAX_FRAGMENT_UNIFORM_COMPONENTS',
      'MAX_ELEMENTS_VERTICES', 'MAX_ELEMENTS_INDICES', 'MAX_TEXTURE_LOD_BIAS'] : [])];
  const limits: Record<string, unknown> = {};
  const c = gl as unknown as Record<string, number>;
  for (const n of names) limits[n] = c[n] === undefined ? null : plain(gl.getParameter(c[n]));
  const precision: Record<string, string> = {};
  for (const [shader, sn] of [[gl.VERTEX_SHADER, 'vertex'], [gl.FRAGMENT_SHADER, 'fragment']] as const) {
    for (const [kind, kn] of [[gl.HIGH_FLOAT, 'highp'], [gl.MEDIUM_FLOAT, 'mediump'], [gl.HIGH_INT, 'highp int']] as const) {
      const f = gl.getShaderPrecisionFormat(shader, kind);
      precision[`${sn} ${kn}`] = f ? `${f.precision} bits, range ${f.rangeMin}..${f.rangeMax}` : 'none';
    }
  }
  return {
    version: String(gl.getParameter(gl.VERSION)),
    glsl: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
    vendor: String(gl.getParameter(gl.VENDOR)),
    renderer: String(gl.getParameter(gl.RENDERER)),
    unmaskedVendor: dbg ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) : undefined,
    unmaskedRenderer: dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : undefined,
    limits, precision,
    attributes: gl.getContextAttributes(),
    extensions: full ? gl.getSupportedExtensions() || [] : undefined,
    draw: full ? drawTest(gl) : undefined,
  };
}

// Does it really draw? A shader program paints the canvas green; reading a
// pixel back says whether the chip did it. A context the browser hands
// over can still fail here (a broken driver).
function drawTest(gl: WebGLRenderingContext): string {
  const shader = (kind: number, src: string) => {
    const sh = gl.createShader(kind)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`${kind === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader: ${gl.getShaderInfoLog(sh) || 'did not compile'}`);
    return sh;
  };
  try {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, 'precision mediump float; void main() { gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }'));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`link: ${gl.getProgramInfoLog(prog) || 'failed'}`);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const px = new Uint8Array(4);
    gl.readPixels(1, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const err = gl.getError();
    if (px[1] > 200 && px[0] < 50) return 'ok';
    return `wrong colour rgba(${px.join(',')})${err ? `, GL error ${err}` : ''}`;
  } catch (e) {
    return `failed: ${text(e)}`;
  }
}

// One try at a context, on a canvas of its own, given back straight after.
// The browser says why it refused in the webglcontextcreationerror event.
function attempt(type: string, options: WebGLContextAttributes, withExtensions: boolean): Attempt {
  const canvas = document.createElement('canvas');
  let message = '';
  canvas.addEventListener('webglcontextcreationerror', e => { message = (e as WebGLContextEvent).statusMessage || '(no reason given)'; });
  const t0 = performance.now();
  const a: Attempt = { type, options: JSON.stringify(options), ok: false, ms: 0 };
  try {
    const gl = canvas.getContext(type, options) as WebGLRenderingContext | null;
    a.ms = Math.round(performance.now() - t0);
    if (gl) {
      a.ok = !gl.isContextLost();
      try { a.info = glInfo(gl, withExtensions); } catch (err) { a.thrown = text(err); }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch (err) {
    a.ms = Math.round(performance.now() - t0);
    a.thrown = text(err);
  }
  if (message) a.message = message;
  return a;
}

function probeGL(): Attempt[] {
  const out: Attempt[] = [];
  const seen = new Set<string>();
  const tries: [string, WebGLContextAttributes][] = [
    ['webgl2', {}],
    ['webgl2', { failIfMajorPerformanceCaveat: true }],
    ['webgl2', { antialias: true, powerPreference: 'high-performance' }],
    ['webgl', {}],
    ['webgl', { failIfMajorPerformanceCaveat: true }],
    ['experimental-webgl', {}],
  ];
  for (const [type, options] of tries) {
    const a = attempt(type, options, !seen.has(type));
    if (a.ok) seen.add(type);
    out.push(a);
  }
  return out;
}

// ---------- The report ----------

// The game's own side of the report; the phone and the browser are in
// `device` (core/device.ts).
function environment() {
  return {
    staging: STAGING,
    lite: document.body.classList.contains('lite'),
    webgl1Copy: !!window.__SINDBAD_WEBGL1__,
    boot: window.__SINDBAD_BOOT__ ?? null,
    lang: document.documentElement.lang,
    screenNow: document.body.dataset.screen || 'title',
    upSecs: Math.round((Date.now() - started) / 1000),
    device: detailsNow(),
  };
}

export interface Report { at: string; env: ReturnType<typeof environment>; gl: Attempt[]; facts: Record<string, unknown> }
let lastGL: Attempt[] | null = null;

/** Everything about this device's graphics and what the game chose. */
export function report({ fresh = false } = {}): Report {
  if (fresh || !lastGL) lastGL = probeGL();
  return { at: new Date().toISOString(), env: environment(), gl: lastGL, facts: { ...facts } };
}

/** The report in a few plain lines, for the top of the panel. */
function summary(r: Report): string[] {
  const best = (type: string) => r.gl.find(a => a.type === type && a.ok);
  const why = (type: string) => {
    const tries = r.gl.filter(a => a.type === type);
    return [...new Set(tries.map(a => a.message || a.thrown || (a.ok ? '' : 'refused, no reason given')).filter(Boolean))].join(' | ') || 'no reason given';
  };
  const out: string[] = [];
  const d = r.env.device as Record<string, Record<string, unknown> | undefined>;
  const hi = (d.uaHigh || {}) as { model?: string; platformVersion?: string; fullVersionList?: { brand: string; version: string }[] };
  const chrome = hi.fullVersionList?.filter(b => !/Not.?A.?Brand/i.test(b.brand)).map(b => `${b.brand} ${b.version}`).join(', ');
  out.push(`Phone: ${hi.model || '?'}, Android ${hi.platformVersion || '?'}, ${d.hardware?.memoryGB ?? '?'} GB, ${d.hardware?.cores ?? '?'} cores, screen ${d.screen?.physical ?? '?'}`);
  out.push(`Browser: ${chrome || d.browser?.userAgent || '?'}`);
  for (const type of ['webgl2', 'webgl']) {
    const ok = best(type);
    out.push(ok
      ? `${type === 'webgl2' ? 'WebGL 2' : 'WebGL 1'}: yes, ${ok.info?.unmaskedRenderer || ok.info?.renderer || '?'} (${ok.info?.version || '?'}), drawing test: ${ok.info?.draw ?? '?'}`
      : `${type === 'webgl2' ? 'WebGL 2' : 'WebGL 1'}: NO, ${why(type)}`);
  }
  const caveat = r.gl.find(a => a.type === 'webgl2' && a.options.includes('Caveat'));
  if (best('webgl2') && caveat && !caveat.ok) out.push('WebGL 2 runs in software (failIfMajorPerformanceCaveat refused it)');
  out.push(`three.js copy: ${r.env.webgl1Copy ? 'r162 (for WebGL 1)' : 'r170 (needs WebGL 2)'}; lite mode: ${r.env.lite ? 'on' : 'off'}`);
  for (const key of ['map_view', 'map_webgl', 'map_3d', 'renderer']) if (key in r.facts) out.push(`${key}: ${text(r.facts[key])}`);
  for (const [key, v] of Object.entries(r.facts)) if (key.startsWith('island_')) out.push(`${key}: ${text(v)}`);
  return out;
}

function details(r: Report, all: Line[]): string {
  const time = (t: number) => new Date(t).toISOString().slice(11, 23);
  return [
    JSON.stringify(r, null, 1),
    '',
    `Log (${all.length} lines):`,
    ...all.map(l => `${time(l.t)} ${l.level.padEnd(5)} ${l.text}`),
  ].join('\n');
}

const asText = (r: Report, all: Line[]) => [`Sindibad & Yasmina diagnostics, ${r.at}`, ...summary(r), '', details(r, all)].join('\n');

// ---------- Sending (with a server) ----------

function sendReport(r: Report, why: string) {
  if (!apiBase()) return;
  track('diag', { why, ...r });
}

function sendLog() {
  if (!debugOn || !apiBase() || !unsent) return;
  const fresh = lines.slice(-Math.min(unsent, lines.length));
  unsent = 0;
  for (let i = 0; i < fresh.length; i += LOG_BATCH) {
    track('log', { lines: fresh.slice(i, i + LOG_BATCH).map(l => ({ t: l.t, level: l.level, text: l.text.slice(0, 600) })) });
  }
}

// ---------- The panel (?debug=1) ----------

let panel: HTMLElement | null = null;

function paint() {
  if (!panel) return;
  const r = report();
  panel.querySelector('.dg-summary')!.textContent = summary(r).join('\n');
  panel.querySelector('.dg-body')!.textContent = details(r, lines);
}

function openPanel() {
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'dg-panel';
    panel.dir = 'ltr';
    panel.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;background:#0b1620;color:#e8f1f5;font:12px/1.4 ui-monospace,monospace;display:flex;flex-direction:column;padding:max(8px,env(safe-area-inset-top)) 8px 8px');
    panel.innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        <button data-dg="copy">Copy</button><button data-dg="share">Share</button>
        <button data-dg="send">Send to server</button><button data-dg="retest">Test again</button>
        <button data-dg="close">Close</button>
      </div>
      <div class="dg-status" style="color:#8fd18f;min-height:1.4em"></div>
      <pre class="dg-summary" style="white-space:pre-wrap;word-break:break-all;margin:0 0 6px;color:#ffd23f;font-weight:bold"></pre>
      <pre class="dg-body" style="white-space:pre-wrap;word-break:break-all;margin:0;overflow:auto;flex:1;-webkit-overflow-scrolling:touch"></pre>`;
    for (const b of panel.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('style', 'font:inherit;padding:8px 12px;border-radius:8px;border:1px solid #4a6a7a;background:#173040;color:inherit');
    const status = (s: string) => { panel!.querySelector('.dg-status')!.textContent = s; };
    panel.addEventListener('click', async e => {
      const what = (e.target as HTMLElement).closest<HTMLElement>('[data-dg]')?.dataset.dg;
      if (!what) return;
      e.stopPropagation();
      const all = asText(report(), [...previous().map(l => ({ ...l, level: `old-${l.level}` })), ...lines]);
      if (what === 'close') panel!.hidden = true;
      else if (what === 'retest') { report({ fresh: true }); paint(); status('Tested again.'); }
      else if (what === 'copy') {
        try { await navigator.clipboard.writeText(all); status('Copied. Paste it in the chat.'); }
        catch { status('Copy failed: select the text below and copy it by hand.'); }
      } else if (what === 'share') {
        try { await navigator.share({ title: 'Sindibad diagnostics', text: all }); status('Shared.'); }
        catch (err) { status(`Share failed: ${text(err)}`); }
      } else if (what === 'send') {
        if (!apiBase()) { status('No server set. Open the game once with ?api=https://<your server>'); return; }
        sendReport(report({ fresh: true }), 'button');
        sendLog();
        await flush();
        status(`Sent to ${apiBase()} (check /admin/debug there).`);
      }
    });
    document.body.append(panel);
  }
  panel.hidden = false;
  paint();
  gatherDetails().then(paint).catch(() => {});
}

function showButton() {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = '🐞';
  b.setAttribute('aria-label', 'Diagnostics');
  b.setAttribute('style', 'position:fixed;left:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:2147483646;width:44px;height:44px;border-radius:50%;border:2px solid #fff;background:#c0392b;font-size:22px;line-height:1;padding:0;box-shadow:0 2px 8px #0006');
  b.addEventListener('click', e => { e.stopPropagation(); openPanel(); });
  document.body.append(b);
}

// ---------- Start ----------

/** First thing at start-up (app.ts). */
export function initDiag(): void {
  if (ready) return;
  ready = true;
  try {
    const asked = new URLSearchParams(location.search).get('debug');
    if (asked === '0') localStorage.removeItem(DEBUG_KEY);
    else if (asked) localStorage.setItem(DEBUG_KEY, '1');
    debugOn = localStorage.getItem(DEBUG_KEY) === '1';
  } catch { debugOn = new URLSearchParams(location.search).get('debug') === '1'; }

  captureConsole();
  for (const e of window.__SINDBAD_BOOT__?.errors || []) add('error', [`(before start) ${e}`]);
  add('info', [`start: ${location.pathname}${location.search}`, navigator.userAgent]);
  if (debugOn) showButton();

  // The details the browser answers later (exact versions, the model,
  // storage, battery…), only when someone will read them.
  if (debugOn || apiBase()) gatherDetails().then(() => { if (panel && !panel.hidden) paint(); }).catch(() => {});

  // The report, once the game has settled (the sea map has chosen its view):
  // to the server once per browser version, and to the log on a debug
  // device. Without either, no test contexts are made at all.
  setTimeout(async () => {
    if (!debugOn && !apiBase()) return;
    await gatherDetails().catch(() => {});
    const r = report();
    if (debugOn) add('info', ['diagnostics:', summary(r).join(' / ')]);
    let sent = '';
    try { sent = localStorage.getItem(SENT_KEY) || ''; } catch { /* blocked */ }
    const key = `${navigator.userAgent}|${r.gl.map(a => a.info?.draw ?? '').join('')}|${r.gl.map(a => a.ok ? 1 : 0).join('')}|${text(r.facts.map_3d)}`;
    if (debugOn || sent !== key) {
      sendReport(r, debugOn ? 'debug' : 'first');
      try { localStorage.setItem(SENT_KEY, key); } catch { /* blocked */ }
    }
  }, 8000);
  setInterval(sendLog, 15_000);
  addEventListener('pagehide', sendLog);
}

/** For the tests: the report as the panel shows it. */
export function debugDiag() {
  const r = report();
  return { summary: summary(r), lines: lines.length, debugOn, report: r };
}
