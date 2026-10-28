// Talking to the game's server (core/env.ts apiBase). This device makes up
// its id at first launch and registers when it is first online; the server
// answers with a token it uses from then on. Requests never throw: offline,
// a timeout or a server error all come back as null or a failed status,
// and the callers (core/telemetry.ts, core/sync.ts) try again later.

import { apiBase, storeKey } from './env.js';
import { uuid } from './save.js';

const KEY = storeKey('device');
const TIMEOUT = 20_000;

interface DeviceRecord { id: string; token?: string }

function read(): DeviceRecord {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && typeof d.id === 'string') return d;
  } catch { /* Storage blocked or broken: a new id. */ }
  const d = { id: uuid() };
  write(d);
  return d;
}
function write(d: DeviceRecord) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* in memory only */ }
}

let device = read();
export const deviceId = () => device.id;

let registering: Promise<string | null> | null = null;

/** This device's token, registering first if needed. Null while that fails. */
export function ensureToken(info: () => object): Promise<string | null> {
  if (device.token) return Promise.resolve(device.token);
  return (registering ||= (async () => {
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await send('POST', '/v1/devices', { id: device.id, info: info() }, null);
        if (res?.ok) {
          const { token } = await res.json();
          device = { ...device, token };
          write(device);
          return token as string;
        }
        // Taken (practically never): make up another id.
        if (res?.status === 409) { device = { id: uuid() }; write(device); continue; }
        return null;
      }
      return null;
    } finally {
      registering = null;
    }
  })());
}

export interface ApiOptions { keepalive?: boolean; gzip?: boolean }

/** An authenticated request; null when there is no server or no network. */
export async function api(method: string, path: string, body?: unknown, opts: ApiOptions = {}): Promise<Response | null> {
  if (!device.token) return null;
  const res = await send(method, path, body, device.token, opts);
  // The server no longer knows this token (its database was reset):
  // register again next time.
  if (res?.status === 401) { device = { id: device.id }; write(device); }
  return res;
}

async function send(method: string, path: string, body: unknown, token: string | null, opts: ApiOptions = {}): Promise<Response | null> {
  const base = apiBase();
  if (!base || (typeof navigator !== 'undefined' && navigator.onLine === false)) return null;
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    const json = JSON.stringify(body);
    payload = json;
    // Mobile data is slow and dear: big bodies go compressed.
    if (opts.gzip && json.length > 1024 && typeof CompressionStream === 'function') {
      try {
        payload = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
        headers['content-encoding'] = 'gzip';
      } catch { payload = json; }
    }
  }
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT);
  try {
    return await fetch(`${base}${path}`, { method, headers, body: payload, signal: abort.signal, keepalive: opts.keepalive, cache: 'no-store' });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
