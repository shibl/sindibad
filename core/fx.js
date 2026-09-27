// Screen effects shared across screens: the iris wipe between scenes (the
// circle that closes on the hero and opens on the next place) and a small
// screen shake for big moments.

const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
const lite = () => document.body.classList.contains('lite');
let busy = false;

// Close an iris on (x, y) (screen px; default centre), run `mid` while the
// screen is dark, then open it again. Resolves when fully open.
export function wipe(mid, { x, y, ms = 380 } = {}) {
  if (TEST || lite() || busy || matchMedia('(prefers-reduced-motion: reduce)').matches) { mid(); return Promise.resolve(); }
  busy = true;
  const el = document.getElementById('wipe');
  const W = innerWidth, H = innerHeight;
  const cx = x ?? W / 2, cy = y ?? H / 2;
  const max = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 20;
  el.hidden = false;
  const set = r => { el.style.background = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${r}px, #0d2233 ${r + 1.5}px)`; };
  const run = (from, to, dur) => new Promise(res => {
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      set(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
  return run(max, 0, ms)
    .then(() => { mid(); return new Promise(r => setTimeout(r, 140)); })
    .then(() => run(0, max, ms))
    .then(() => { el.hidden = true; busy = false; });
}

export function shake(el = document.body, strength = 1) {
  if (lite() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.style.setProperty('--shake', `${6 * strength}px`);
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
}
