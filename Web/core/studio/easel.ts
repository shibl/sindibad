// «مرسمي» — the art island's free easel (🖌️ on the island): a sheet to draw
// and colour with a finger, like the book's «أحاول» in the drawing book.
//
// - Paint pots of the island's colours, three brush sizes and an eraser.
// - Three ways to draw: free; «مرآة» (each line is mirrored, as in the
//   symmetric African masks); «ماندالا» (each line turns round the centre
//   eight times, as in the Indian mandala art).
// - Undo, and a new sheet. Each stroke is kept as points, so the drawing is
//   redrawn sharp when the screen turns, and undo costs no memory.
// - Every choice ticks (core/haptics.ts through the sound effects).
//
//   openEasel(host, { sfx, onClose }) → { close(), debug() }

interface Sfx { tap(): void; tick(): void; good(): void }
type Mode = 'free' | 'mirror' | 'mandala';
interface Stroke { color: string; size: number; erase: boolean; mode: Mode; pts: number[] }

const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;

const COLORS: [string, string][] = [
  ['#1f1612', 'الأسود'], ['#e8453c', 'الأحمر'], ['#f28c1a', 'البرتقاليّ'], ['#ffd23f', 'الأصفر'], ['#34b04a', 'الأخضر'],
  ['#2f7fd6', 'الأزرق'], ['#8a4fc9', 'البنفسجيّ'], ['#ff9fc4', 'الورديّ'], ['#6b4226', 'البنّيّ'], ['#a9d8ff', 'الأزرق الفاتح'],
];
const SIZES: [number, string][] = [[0.008, 'رفيعة'], [0.018, 'متوسّطة'], [0.04, 'عريضة']];
const MODES: [Mode, string, string][] = [['free', '✏️', 'حرّ'], ['mirror', '🦋', 'مرآة'], ['mandala', '🪷', 'ماندالا']];
const PAPER = '#fffdf6';

export function openEasel(host: HTMLElement, { sfx, onClose }: { sfx: Sfx; onClose?: () => void }) {
  host.innerHTML = `
    <div class="ez" role="dialog" aria-modal="true" aria-label="مرسمي">
      <header class="ez-top">
        <button class="btn btn--round ez-x" data-close aria-label="إغلاق">✕</button>
        <h3>🖌️ مرسمي</h3>
        <button class="btn btn--round" data-undo aria-label="تراجع">↩️</button>
        <button class="btn btn--round" data-new aria-label="ورقة جديدة">📄</button>
      </header>
      <div class="ez-paper"><canvas class="ez-canvas" aria-label="ورقة الرسم"></canvas><canvas class="ez-guide" aria-hidden="true"></canvas></div>
      <div class="ez-bar">
        <div class="ez-modes">${MODES.map(([id, icon, name]) => `<button class="ez-mode" data-mode="${id}"><span>${icon}</span><small>${name}</small></button>`).join('')}</div>
        <div class="ez-sizes">${SIZES.map(([s, name], i) => `<button class="ez-size" data-size="${i}" aria-label="فرشاة ${name}"><i style="--d:${6 + i * 7}px"></i></button>`).join('')}<button class="ez-size ez-eraser" data-eraser aria-label="ممحاة">🧽</button></div>
        <div class="ez-colors">${COLORS.map(([c, name]) => `<button class="ez-color" data-color="${c}" style="--c:${c}" aria-label="${name}"></button>`).join('')}</div>
      </div>
    </div>`;
  host.hidden = false;
  const root = host.querySelector<HTMLElement>('.ez')!;
  const paper = root.querySelector<HTMLElement>('.ez-paper')!;
  const cv = root.querySelector<HTMLCanvasElement>('.ez-canvas')!, gcv = root.querySelector<HTMLCanvasElement>('.ez-guide')!;
  const g = cv.getContext('2d')!, gg = gcv.getContext('2d')!;
  const undo = root.querySelector<HTMLButtonElement>('[data-undo]')!;
  const strokes: Stroke[] = [];
  let color = COLORS[1][0], size = 1, erase = false, mode: Mode = 'free';
  let W = 1, H = 1, ratio = 1, current: Stroke | null = null, pointer: number | null = null;

  // ---------- Drawing ----------
  // A stroke's copies: itself, its mirror, or its eight turns round the centre.
  function copies(m: Mode, x: number, y: number): [number, number][] {
    if (m === 'mirror') return [[x, y], [1 - x, y]];
    if (m === 'mandala') {
      const cx = 0.5, cy = 0.5 * (H / W), dx = x - cx, dy = y * (H / W) - cy, out: [number, number][] = [];
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); out.push([cx + dx * c - dy * s, (cy + dx * s + dy * c) / (H / W)]); }
      return out;
    }
    return [[x, y]];
  }
  function segment(st: Stroke, i: number) {
    const p = st.pts, x0 = p[i - 2] ?? p[i], y0 = p[i - 1] ?? p[i + 1], x1 = p[i], y1 = p[i + 1];
    g.strokeStyle = st.erase ? PAPER : st.color;
    g.fillStyle = g.strokeStyle;
    g.lineWidth = SIZES[st.size][0] * W * (st.erase ? 1.6 : 1);
    const a = copies(st.mode, x0, y0), b = copies(st.mode, x1, y1);
    for (let k = 0; k < a.length; k++) {
      g.beginPath(); g.moveTo(a[k][0] * W, a[k][1] * H); g.lineTo(b[k][0] * W, b[k][1] * H); g.stroke();
    }
  }
  function redraw() {
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const st of strokes) for (let i = 0; i < st.pts.length; i += 2) segment(st, i);
  }
  function guides() {
    gg.setTransform(ratio, 0, 0, ratio, 0, 0);
    gg.clearRect(0, 0, W, H);
    gg.strokeStyle = 'rgba(138, 79, 201, .28)'; gg.lineWidth = 1.5; gg.setLineDash([6, 6]);
    if (mode === 'mirror') { gg.beginPath(); gg.moveTo(W / 2, 0); gg.lineTo(W / 2, H); gg.stroke(); }
    if (mode === 'mandala') {
      const cx = W / 2, cy = H / 2, r = Math.hypot(W, H) / 2;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; gg.beginPath(); gg.moveTo(cx, cy); gg.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); gg.stroke(); }
      for (const f of [0.15, 0.3, 0.45]) { gg.beginPath(); gg.arc(cx, cy, Math.min(W, H) * f, 0, Math.PI * 2); gg.stroke(); }
    }
  }
  function fit() {
    const r = paper.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    ratio = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [cv, gcv]) { c.width = Math.round(W * ratio); c.height = Math.round(H * ratio); }
    redraw(); guides();
  }
  const ro = new ResizeObserver(fit);
  ro.observe(paper);

  const at = (e: PointerEvent): [number, number] => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  cv.addEventListener('pointerdown', e => {
    if (pointer !== null) return;
    pointer = e.pointerId;
    try { cv.setPointerCapture(e.pointerId); } catch { /* fine */ }
    const [x, y] = at(e);
    current = { color, size, erase, mode, pts: [x, y] };
    strokes.push(current);
    undo.disabled = false;
    g.setTransform(ratio, 0, 0, ratio, 0, 0); g.lineCap = 'round'; g.lineJoin = 'round';
    segment(current, 0);
    e.preventDefault();
  });
  cv.addEventListener('pointermove', e => {
    if (e.pointerId !== pointer || !current) return;
    const [x, y] = at(e), p = current.pts;
    if (Math.hypot(x - p[p.length - 2], (y - p[p.length - 1]) * (H / W)) < 0.003) return;
    p.push(x, y);
    segment(current, p.length - 2);
  });
  const end = (e: PointerEvent) => { if (e.pointerId !== pointer) return; pointer = null; current = null; };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);

  // ---------- The tools ----------
  function mark() {
    root.querySelectorAll<HTMLElement>('[data-color]').forEach(b => b.classList.toggle('is-on', !erase && b.dataset.color === color));
    root.querySelectorAll<HTMLElement>('[data-size]').forEach(b => { b.classList.toggle('is-on', !erase && +b.dataset.size! === size); b.style.setProperty('--c', color); });
    root.querySelector('[data-eraser]')!.classList.toggle('is-on', erase);
    root.querySelectorAll<HTMLElement>('[data-mode]').forEach(b => b.classList.toggle('is-on', b.dataset.mode === mode));
    undo.disabled = !strokes.length;
  }
  root.addEventListener('click', e => {
    const t = (e.target as Element).closest<HTMLElement>('button');
    if (!t) return;
    if (t.dataset.color) { color = t.dataset.color; erase = false; sfx.tick(); }
    else if (t.dataset.size) { size = +t.dataset.size; erase = false; sfx.tick(); }
    else if ('eraser' in t.dataset) { erase = true; sfx.tick(); }
    else if (t.dataset.mode) { mode = t.dataset.mode as Mode; sfx.tick(); guides(); }
    else if ('undo' in t.dataset) { if (strokes.pop()) { sfx.tap(); redraw(); } }
    else if ('new' in t.dataset) { if (strokes.length) { strokes.length = 0; sfx.good(); redraw(); } }
    else if ('close' in t.dataset) { sfx.tap(); close(); onClose?.(); return; }
    mark();
  });
  // Drawing never scrolls or zooms the page.
  paper.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

  function close() {
    ro.disconnect();
    host.hidden = true;
    host.innerHTML = '';
  }
  requestAnimationFrame(fit);
  if (TEST) fit();
  mark();
  root.querySelector<HTMLElement>('[data-color].is-on')?.focus({ preventScroll: true });

  return {
    close,
    debug: () => ({ strokes: strokes.length, points: strokes.reduce((n, s) => n + s.pts.length / 2, 0), mode, color, erase, size: [W, H] }),
  };
}
