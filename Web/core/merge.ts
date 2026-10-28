// Merging a child's save after playing on two devices (core/sync.ts), even
// offline on both. Three copies: `base`, the last copy the device and the
// server agreed on; `local`, this device's; `remote`, the server's.
//
// A field changed on one side only takes that side's value. Changed on both:
//   counters (pearls, play time, plays, farm coins…) add both sides' changes;
//   other numbers keep the higher (stars, best score, review box, quest…);
//   badges keep the better medal;
//   lists of words or ids keep what either side added, minus what either removed;
//   a lesson's history keeps both sides' plays (the last 10);
//   anything else (the hero, settings, farm plots, lists of objects) keeps
//   this device's.
// With no base (never synced, or the record was lost) counters keep the
// higher instead, so nothing is ever counted twice.
//
// A new saved number that can go down (spent, used up) belongs in COUNTERS.

type Value = unknown;
type Obj = Record<string, Value>;

const COUNTERS = [
  /^pearls$/, /^time$/, /^days\.[^.]+$/, /^daily\.[^.]+$/, /^topics\.[^.]+\.plays$/,
  /^world\.farm\.(coins|xp)$/, /^world\.farm\.inv\.[^.]+$/,
];
const HISTORY = /^topics\.[^.]+\.history$/;
const HISTORY_KEEP = 10;
const CAPS: [RegExp, number][] = [[/^topics\.[^.]+\.missed$/, 30]];
// Kept whole: their parts only make sense together.
const ATOMIC = [/^world\.farm\.(plots|tasks|orders|decor)$/];
const MEDALS = ['bronze', 'silver', 'gold'];

const isObj = (v: Value): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isPlain = (v: Value) => v === null || typeof v !== 'object';

/** Deep equality of JSON values, whatever the key order. */
export function same(a: Value, b: Value): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => k in b && same(a[k], b[k]));
  }
  return false;
}

export function merge<T>(base: T | null | undefined, local: T, remote: T): T {
  return mergeAt(base ?? undefined, local, remote, '') as T;
}

function mergeAt(b: Value, l: Value, r: Value, path: string): Value {
  if (same(l, r)) return l;
  if (b !== undefined && same(l, b)) return r;
  if (b !== undefined && same(r, b)) return l;
  // Changed on both sides.
  if (typeof l === 'number' && typeof r === 'number') {
    if (typeof b === 'number' && COUNTERS.some(re => re.test(path))) return Math.max(0, r + l - b);
    return Math.max(l, r);
  }
  if (/^badges\.[^.]+$/.test(path) && typeof l === 'string' && typeof r === 'string') {
    return MEDALS.indexOf(r) > MEDALS.indexOf(l) ? r : l;
  }
  if (ATOMIC.some(re => re.test(path))) return l;
  if (HISTORY.test(path) && Array.isArray(l) && Array.isArray(r)) {
    const seen = new Set<string>();
    return [...r, ...l]
      .filter(x => { const k = JSON.stringify(x); return seen.has(k) ? false : (seen.add(k), true); })
      .sort((x, y) => ((x as { t?: number })?.t || 0) - ((y as { t?: number })?.t || 0))
      .slice(-HISTORY_KEEP);
  }
  if (Array.isArray(l) && Array.isArray(r) && l.every(isPlain) && r.every(isPlain)) {
    const from = Array.isArray(b) ? b : [];
    const removed = new Set(from.filter(x => !l.includes(x) || !r.includes(x)));
    const out = [...r, ...l.filter(x => !r.includes(x))].filter(x => !removed.has(x));
    const cap = CAPS.find(([re]) => re.test(path));
    return cap ? out.slice(-cap[1]) : out;
  }
  if (isObj(l) && isObj(r)) {
    const bo = isObj(b) ? b : undefined;
    const out: Obj = {};
    for (const k of new Set([...Object.keys(r), ...Object.keys(l)])) {
      const sub = path ? `${path}.${k}` : k;
      if (!(k in l) || !(k in r)) {
        // On one side only: new there, or removed on the other side. A
        // removal wins unless the other side has changed the field since.
        const [kept, other] = k in l ? [l[k], r] : [r[k], l];
        const removedOnOther = bo !== undefined && k in bo && !(k in other);
        if (!removedOnOther || !same(kept, bo![k])) out[k] = kept;
        continue;
      }
      out[k] = mergeAt(bo?.[k], l[k], r[k], sub);
    }
    return out;
  }
  return l;
}
