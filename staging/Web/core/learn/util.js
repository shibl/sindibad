// Made from util.ts by tools/build.ts. Edit that file, then run: npm run build
// Small helpers every island's lesson steps use (core/learn/steps.ts,
// explore.ts, and each island's games.js).
/** Set by the end-to-end test (tests/e2e.ts): test hooks on, no waiting. */
export const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
/** Runs `fn` after `ms` (at once in the test). */
export const later = (fn, ms) => setTimeout(fn, TEST ? 0 : ms);
/** A shuffled copy of `list`. */
export const shuffle = (list) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
} return a; };
/** Replays a CSS animation class on `el` (a shake by default). */
export const bump = (el, cls = 'is-shake') => { if (!el)
    return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
