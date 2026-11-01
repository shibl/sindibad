// Made from diag.ts by tools/build.ts. Edit that file, then run: npm run build
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
const MAX_LINES = 500;
const KEEP_LINES = 150; // kept across a reload (localStorage)
const LOG_BATCH = 40;
const DEBUG_KEY = storeKey('debug');
const LOG_KEY = storeKey('debugLog');
const SENT_KEY = storeKey('diagSent');
const started = Date.now();
const lines = [];
const facts = {};
let unsent = 0; // lines not yet sent as `log` events
let debugOn = false;
let ready = false;
// ---------- The log ----------
function text(a) {
    if (a instanceof Error)
        return `${a.name}: ${a.message}${a.stack ? `\n${a.stack}` : ''}`;
    if (typeof a === 'string')
        return a;
    if (a instanceof Event)
        return `[${a.type} event]`;
    try {
        return JSON.stringify(a);
    }
    catch {
        return String(a);
    }
}
function add(level, args) {
    const line = { t: Date.now(), level, text: args.map(text).join(' ').slice(0, 2000) };
    lines.push(line);
    unsent++;
    if (lines.length > MAX_LINES)
        lines.splice(0, lines.length - MAX_LINES);
    if (panel && !panel.hidden)
        paint();
}
/** Record something the game decided, for the report and the log. */
export function note(topic, details = true) {
    facts[topic] = details;
    add('note', [`[${topic}]`, details]);
}
function captureConsole() {
    for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
        const original = console[level].bind(console);
        console[level] = (...args) => {
            original(...args);
            try {
                add(level, args);
            }
            catch { /* never let the log break the game */ }
        };
    }
    addEventListener('error', e => {
        const t = e.target;
        if (t && t !== window && 'tagName' in t) {
            add('error', [`${t.tagName.toLowerCase()} failed to load:`, t.src || t.href || '']);
            return;
        }
        const ev = e;
        add('error', [`Uncaught ${ev.message} (${ev.filename || ''}:${ev.lineno || 0}:${ev.colno || 0})`, ...(ev.error ? [ev.error] : [])]);
    }, true);
    addEventListener('unhandledrejection', e => add('error', ['Unhandled promise rejection:', e.reason]));
    addEventListener('online', () => add('info', ['online']));
    addEventListener('offline', () => add('info', ['offline']));
    addEventListener('pagehide', keep);
    document.addEventListener('visibilitychange', () => {
        add('info', [document.hidden ? 'hidden' : 'visible']);
        if (document.hidden)
            keep();
    });
    // Each screen the game shows (app.ts sets body[data-screen]).
    new MutationObserver(() => add('info', [`screen: ${document.body.dataset.screen}`]))
        .observe(document.body, { attributes: true, attributeFilter: ['data-screen'] });
}
// The end of the last visit's log, so a crash that reloads the page still
// shows what led to it.
function keep() {
    try {
        localStorage.setItem(LOG_KEY, JSON.stringify(lines.slice(-KEEP_LINES)));
    }
    catch { /* full or blocked */ }
}
function previous() {
    try {
        const l = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
        return Array.isArray(l) ? l : [];
    }
    catch {
        return [];
    }
}
function glInfo(gl, withExtensions) {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    return {
        version: String(gl.getParameter(gl.VERSION)),
        glsl: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
        vendor: String(gl.getParameter(gl.VENDOR)),
        renderer: String(gl.getParameter(gl.RENDERER)),
        unmaskedVendor: dbg ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) : undefined,
        unmaskedRenderer: dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : undefined,
        maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxRenderbuffer: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        maxViewport: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS)),
        maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
        maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
        maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
        maxVertexTextureUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
        fragmentHighp: !!hp && hp.precision > 0,
        attributes: gl.getContextAttributes(),
        extensions: withExtensions ? gl.getSupportedExtensions() || [] : undefined,
    };
}
// One try at a context, on a canvas of its own, given back straight after.
// The browser says why it refused in the webglcontextcreationerror event.
function attempt(type, options, withExtensions) {
    const canvas = document.createElement('canvas');
    let message = '';
    canvas.addEventListener('webglcontextcreationerror', e => { message = e.statusMessage || '(no reason given)'; });
    const t0 = performance.now();
    const a = { type, options: JSON.stringify(options), ok: false, ms: 0 };
    try {
        const gl = canvas.getContext(type, options);
        a.ms = Math.round(performance.now() - t0);
        if (gl) {
            a.ok = !gl.isContextLost();
            try {
                a.info = glInfo(gl, withExtensions);
            }
            catch (err) {
                a.thrown = text(err);
            }
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
    }
    catch (err) {
        a.ms = Math.round(performance.now() - t0);
        a.thrown = text(err);
    }
    if (message)
        a.message = message;
    return a;
}
function probeGL() {
    const out = [];
    const seen = new Set();
    const tries = [
        ['webgl2', {}],
        ['webgl2', { failIfMajorPerformanceCaveat: true }],
        ['webgl2', { antialias: true, powerPreference: 'high-performance' }],
        ['webgl', {}],
        ['webgl', { failIfMajorPerformanceCaveat: true }],
        ['experimental-webgl', {}],
    ];
    for (const [type, options] of tries) {
        const a = attempt(type, options, !seen.has(type));
        if (a.ok)
            seen.add(type);
        out.push(a);
    }
    return out;
}
let uaHigh = null;
function environment() {
    const nav = navigator;
    return {
        url: location.pathname + location.search,
        staging: STAGING,
        ua: navigator.userAgent,
        uaData: nav.userAgentData ? { brands: nav.userAgentData.brands, mobile: nav.userAgentData.mobile, platform: nav.userAgentData.platform, ...uaHigh } : null,
        memory: navigator.deviceMemory ?? null,
        cores: navigator.hardwareConcurrency ?? null,
        screen: `${screen.width}x${screen.height}`,
        viewport: `${innerWidth}x${innerHeight}`,
        dpr: devicePixelRatio,
        lite: document.body.classList.contains('lite'),
        webgl1Copy: !!window.__SINDBAD_WEBGL1__,
        boot: window.__SINDBAD_BOOT__ ?? null,
        webgpu: 'gpu' in navigator,
        offscreenCanvas: typeof OffscreenCanvas === 'function',
        secure: isSecureContext,
        online: navigator.onLine,
        net: nav.connection?.effectiveType ?? null,
        saveData: nav.connection?.saveData ?? null,
        standalone: matchMedia('(display-mode: standalone)').matches,
        serviceWorker: !!navigator.serviceWorker?.controller,
        lang: document.documentElement.lang,
        screenNow: document.body.dataset.screen || 'title',
        upSecs: Math.round((Date.now() - started) / 1000),
    };
}
let lastGL = null;
/** Everything about this device's graphics and what the game chose. */
export function report({ fresh = false } = {}) {
    if (fresh || !lastGL)
        lastGL = probeGL();
    return { at: new Date().toISOString(), env: environment(), gl: lastGL, facts: { ...facts } };
}
/** The report in a few plain lines, for the top of the panel. */
function summary(r) {
    const best = (type) => r.gl.find(a => a.type === type && a.ok);
    const why = (type) => {
        const tries = r.gl.filter(a => a.type === type);
        return [...new Set(tries.map(a => a.message || a.thrown || (a.ok ? '' : 'refused, no reason given')).filter(Boolean))].join(' | ') || 'no reason given';
    };
    const out = [];
    for (const type of ['webgl2', 'webgl']) {
        const ok = best(type);
        out.push(ok
            ? `${type === 'webgl2' ? 'WebGL 2' : 'WebGL 1'}: yes, ${ok.info?.unmaskedRenderer || ok.info?.renderer || '?'} (${ok.info?.version || '?'})`
            : `${type === 'webgl2' ? 'WebGL 2' : 'WebGL 1'}: NO, ${why(type)}`);
    }
    const caveat = r.gl.find(a => a.type === 'webgl2' && a.options.includes('Caveat'));
    if (best('webgl2') && caveat && !caveat.ok)
        out.push('WebGL 2 runs in software (failIfMajorPerformanceCaveat refused it)');
    out.push(`three.js copy: ${r.env.webgl1Copy ? 'r162 (for WebGL 1)' : 'r170 (needs WebGL 2)'}; lite mode: ${r.env.lite ? 'on' : 'off'}`);
    for (const key of ['map_view', 'map_webgl', 'map_3d', 'renderer'])
        if (key in r.facts)
            out.push(`${key}: ${text(r.facts[key])}`);
    for (const [key, v] of Object.entries(r.facts))
        if (key.startsWith('island_'))
            out.push(`${key}: ${text(v)}`);
    return out;
}
function details(r, all) {
    const time = (t) => new Date(t).toISOString().slice(11, 23);
    return [
        JSON.stringify(r, null, 1),
        '',
        `Log (${all.length} lines):`,
        ...all.map(l => `${time(l.t)} ${l.level.padEnd(5)} ${l.text}`),
    ].join('\n');
}
const asText = (r, all) => [`Sindibad & Yasmina diagnostics, ${r.at}`, ...summary(r), '', details(r, all)].join('\n');
// ---------- Sending (with a server) ----------
function sendReport(r, why) {
    if (!apiBase())
        return;
    track('diag', { why, ...r });
}
function sendLog() {
    if (!debugOn || !apiBase() || !unsent)
        return;
    const fresh = lines.slice(-Math.min(unsent, lines.length));
    unsent = 0;
    for (let i = 0; i < fresh.length; i += LOG_BATCH) {
        track('log', { lines: fresh.slice(i, i + LOG_BATCH).map(l => ({ t: l.t, level: l.level, text: l.text.slice(0, 600) })) });
    }
}
// ---------- The panel (?debug=1) ----------
let panel = null;
function paint() {
    if (!panel)
        return;
    const r = report();
    panel.querySelector('.dg-summary').textContent = summary(r).join('\n');
    panel.querySelector('.dg-body').textContent = details(r, lines);
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
        for (const b of panel.querySelectorAll('button'))
            b.setAttribute('style', 'font:inherit;padding:8px 12px;border-radius:8px;border:1px solid #4a6a7a;background:#173040;color:inherit');
        const status = (s) => { panel.querySelector('.dg-status').textContent = s; };
        panel.addEventListener('click', async (e) => {
            const what = e.target.closest('[data-dg]')?.dataset.dg;
            if (!what)
                return;
            e.stopPropagation();
            const all = asText(report(), [...previous().map(l => ({ ...l, level: `old-${l.level}` })), ...lines]);
            if (what === 'close')
                panel.hidden = true;
            else if (what === 'retest') {
                report({ fresh: true });
                paint();
                status('Tested again.');
            }
            else if (what === 'copy') {
                try {
                    await navigator.clipboard.writeText(all);
                    status('Copied. Paste it in the chat.');
                }
                catch {
                    status('Copy failed: select the text below and copy it by hand.');
                }
            }
            else if (what === 'share') {
                try {
                    await navigator.share({ title: 'Sindibad diagnostics', text: all });
                    status('Shared.');
                }
                catch (err) {
                    status(`Share failed: ${text(err)}`);
                }
            }
            else if (what === 'send') {
                if (!apiBase()) {
                    status('No server set. Open the game once with ?api=https://<your server>');
                    return;
                }
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
export function initDiag() {
    if (ready)
        return;
    ready = true;
    try {
        const asked = new URLSearchParams(location.search).get('debug');
        if (asked === '0')
            localStorage.removeItem(DEBUG_KEY);
        else if (asked)
            localStorage.setItem(DEBUG_KEY, '1');
        debugOn = localStorage.getItem(DEBUG_KEY) === '1';
    }
    catch {
        debugOn = new URLSearchParams(location.search).get('debug') === '1';
    }
    captureConsole();
    for (const e of window.__SINDBAD_BOOT__?.errors || [])
        add('error', [`(before start) ${e}`]);
    add('info', [`start: ${location.pathname}${location.search}`, navigator.userAgent]);
    if (debugOn)
        showButton();
    const nav = navigator;
    nav.userAgentData?.getHighEntropyValues?.(['model', 'platformVersion', 'fullVersionList', 'architecture'])
        .then(v => { uaHigh = v; }).catch(() => { });
    // The report, once the game has settled (the sea map has chosen its view):
    // to the server once per browser version, and to the log on a debug
    // device. Without either, no test contexts are made at all.
    setTimeout(() => {
        if (!debugOn && !apiBase())
            return;
        const r = report();
        if (debugOn)
            add('info', ['diagnostics:', summary(r).join(' / ')]);
        let sent = '';
        try {
            sent = localStorage.getItem(SENT_KEY) || '';
        }
        catch { /* blocked */ }
        const key = `${navigator.userAgent}|${r.gl.map(a => a.ok ? 1 : 0).join('')}|${text(r.facts.map_3d)}`;
        if (debugOn || sent !== key) {
            sendReport(r, debugOn ? 'debug' : 'first');
            try {
                localStorage.setItem(SENT_KEY, key);
            }
            catch { /* blocked */ }
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
