// The art island's pictures for lessons 1–8 of the book (see views.js).

import { svg, spot, region, slot, stage, emo, lab, txt, INK } from './svg.js';
import { artG } from './art.js';

const ring = (cx, cy, R, r) => `M${cx - R} ${cy}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0Z${r ? `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z` : ''}`;
const rings = (cx, cy, radii, cols) => radii.map((R, i) => `<path d="${ring(cx, cy, R, radii[i + 1])}" fill="${cols[i]}" fill-rule="evenodd"/>`).join('');

// Lesson 2: a square at (x, y) of side s, cut by its diagonal into two
// triangles. dir 0 cuts «\», dir 1 cuts «/»; low 0 is the triangle on the
// top edge, low 1 the one on the bottom edge.
const triD = (x, y, s, dir, low) => (dir
  ? (low ? `M${x + s} ${y}L${x + s} ${y + s}L${x} ${y + s}Z` : `M${x} ${y}L${x + s} ${y}L${x} ${y + s}Z`)
  : (low ? `M${x} ${y}L${x + s} ${y + s}L${x} ${y + s}Z` : `M${x} ${y}L${x + s} ${y}L${x + s} ${y + s}Z`));
// The same triangle shrunk by d on every side (about its incentre): the
// parts to colour do not touch, so a tap on a shared line takes neither.
// An empty sub-path beyond the right angle moves the centre of its box
// inside the triangle (a tap aimed at the centre lands in it, not on the
// shared diagonal).
const triIn = (x, y, s, dir, low, d = 1.2) => {
  const p = triD(x, y, s, dir, low).match(/-?[\d.]+/g).map(Number), P = [[p[0], p[1]], [p[2], p[3]], [p[4], p[5]]];
  const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), w = [len(P[1], P[2]), len(P[0], P[2]), len(P[0], P[1])], sum = w[0] + w[1] + w[2];
  const I = [0, 1].map(k => (w[0] * P[0][k] + w[1] * P[1][k] + w[2] * P[2][k]) / sum);
  const r = Math.sqrt((sum / 2 - w[0]) * (sum / 2 - w[1]) * (sum / 2 - w[2]) / (sum / 2)), k = (r - d) / r;
  const v = w.indexOf(Math.max(...w)), V = P[v], o = P.filter((_, j) => j !== v), E = [0, 1].map(j => +(V[j] + (V[j] - (o[0][j] + o[1][j]) / 2) * 0.5).toFixed(2));
  return `M${P.map(q => q.map((t, j) => +(I[j] + (t - I[j]) * k).toFixed(2)).join(' ')).join('L')}ZM${E[0]} ${E[1]}Z`;
};
// Lesson 4: a round tree standing at (x, y), its crown of radius r.
const tree = (x, y, r, c, line = '') => `<rect x="${x - r * 0.14}" y="${y - r * 1.5}" width="${r * 0.28}" height="${r * 1.5}" fill="${line ? '#fff' : '#8a5a34'}"${line ? ` stroke="${line}" stroke-width="1.4"` : ''}/><circle cx="${x}" cy="${y - r * 1.9}" r="${r}" fill="${c}"${line ? ` stroke="${line}" stroke-width="1.6"` : ''}/>`;
// Lesson 3: a little flower of five petals (a plant decoration).
const flower = (x, y, c, r = 5) => [0, 1, 2, 3, 4].map(i => { const a = i * 1.2566 - 1.5708; return `<circle cx="${(x + Math.cos(a) * r * 1.2).toFixed(1)}" cy="${(y + Math.sin(a) * r * 1.2).toFixed(1)}" r="${r}" fill="${c}" stroke="${INK}" stroke-width="1"/>`; }).join('') + `<circle cx="${x}" cy="${y}" r="${(r * 0.8).toFixed(1)}" fill="#ffd23f" stroke="${INK}" stroke-width="1"/>`;
const diagD = (x, y, s, dir) => (dir ? `M${x + s} ${y}L${x} ${y + s}` : `M${x} ${y}L${x + s} ${y + s}`);
const SQ = ['#e8453c', '#ffd23f', '#2f7fd6', '#1f1612', '#ffffff', '#2fb3a8', '#f28c1a', '#ff9fc4', '#34b04a'];
const sqDir = (r, c) => ((r * 7 + c * 3) % 4 < 2 ? 0 : 1);
const sqCols = (r, c) => { const a = (r * 4 + c * 7) % 9; let b = (r * 5 + c * 2 + 3) % 9; if (b === a) b = (b + 4) % 9; return [SQ[a], SQ[b]]; };
const sqCell = (x, y, s, r, c) => { const [a, b] = sqCols(r, c), d = sqDir(r, c); return `<path d="${triD(x, y, s, d, 0)}" fill="${a}"/><path d="${triD(x, y, s, d, 1)}" fill="${b}"/>`; };
// The lines of a grid of squares (and their diagonals, if diag).
const gridLines = (x0, y0, s, cols, rows, diag, w = 1.6) => {
  let d = '';
  for (let r = 0; r <= rows; r++) d += `M${x0} ${y0 + r * s}H${x0 + cols * s}`;
  for (let c = 0; c <= cols; c++) d += `M${x0 + c * s} ${y0}V${y0 + rows * s}`;
  if (diag) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) d += diagD(x0 + c * s, y0 + r * s, s, sqDir(r, c));
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" pointer-events="none"/>`;
};

export const VIEWS = {
  // ---------- Lesson 1 · free colour circles and lines ----------

  // Two sets of circles that cross, and free straight lines over them.
  motion: {
    html: () => svg('motion', `<rect width="320" height="200" rx="12" fill="#f6f1e6"/>
      ${spot('cold', `${rings(105, 95, [70, 56, 42, 28, 14], ['#2f7fd6', '#34b04a', '#8a4fc9', '#a9d8ff', '#1d3f8a'])}${lab(62, 182)}`, [35, 25, 140, 140])}
      ${spot('warm', `${rings(210, 100, [80, 64, 48, 32, 16], ['#e8453c', '#f28c1a', '#ffd23f', '#e8453c', '#fff2a8'])}${lab(268, 192)}`, [130, 20, 160, 160])}
      ${spot('cross', `<path d="M152.9 44A70 70 0 0 1 147.8 150.4A80 80 0 0 1 152.9 44Z" fill="#fff" fill-opacity=".55" stroke="${INK}" stroke-width="2.5"/>${lab(150, 16)}`, [140, 40, 22, 114])}
      <g stroke="${INK}" stroke-width="3" stroke-linecap="round" pointer-events="none" opacity=".85"><path d="M8 34L312 168M44 196L284 6M6 150L196 4M232 196L312 70"/></g>`),
  },

  // «أحاول»: circles that cross, with free straight lines, to colour with
  // warm (w1–w3) and cold (c1–c3) colours.
  rings: {
    html: () => svg('rings', `<rect width="320" height="200" rx="12" fill="#fffdf6"/>
      ${region('c1', ring(102, 100, 74, 52), undefined, 'fill-rule="evenodd"')}
      ${region('c2', ring(102, 100, 52, 30), undefined, 'fill-rule="evenodd"')}
      ${region('c3', ring(102, 100, 30), undefined)}
      ${region('w1', ring(220, 100, 78, 55), undefined, 'fill-rule="evenodd"')}
      ${region('w2', ring(220, 100, 55, 32), undefined, 'fill-rule="evenodd"')}
      ${region('w3', ring(220, 100, 32), undefined)}
      <g stroke="${INK}" stroke-width="3" stroke-linecap="round" pointer-events="none"><path d="M10 40L310 160M30 192L290 8M240 196L314 92"/></g>
      ${txt('❄️ باردة', 102, 194)}${txt('🔥 حارّة', 220, 194)}`),
  },

  // The same idea in black and white: rings that take turns.
  bwrings: {
    html: () => svg('bwrings', `<rect width="320" height="200" rx="12" fill="#f3efe6"/>
      ${[0, 1, 2, 3, 4].map(i => region(`b${i + 1}`, ring(160, 100, 92 - i * 18, i < 4 ? 74 - i * 18 : 0), undefined, 'fill-rule="evenodd"')).join('')}
      <g stroke="${INK}" stroke-width="3" stroke-linecap="round" pointer-events="none"><path d="M20 20L300 180M20 180L300 20"/></g>`),
  },

  // ---------- Lesson 2 · squares and lines ----------

  // A grid of squares, each cut by a line into two coloured triangles. The
  // spots: one square, one line, the repetition (the bottom row) and the
  // harmony (a balance beside the grid).
  squares: {
    html: () => {
      const s = 38, x0 = 12, y0 = 24, at = (r, c) => [x0 + c * s, y0 + r * s];
      let base = '';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) if (!(r === 0 && (c === 1 || c === 3))) base += sqCell(...at(r, c), s, r, c);
      const row3 = [0, 1, 2, 3, 4].map(c => sqCell(...at(3, c), s, 3, c)).join('');
      return svg('squares', `<rect width="320" height="200" rx="12" fill="#f6f1e6"/>
      ${base}${gridLines(x0, y0, s, 5, 3, true)}
      ${spot('square', `${sqCell(...at(0, 1), s, 0, 1)}<rect x="${at(0, 1)[0]}" y="${y0}" width="${s}" height="${s}" fill="none" stroke="${INK}" stroke-width="4"/>${lab(69, 16)}`, [at(0, 1)[0], y0, s, s])}
      ${spot('line', `${sqCell(...at(0, 3), s, 0, 3)}<rect x="${at(0, 3)[0]}" y="${y0}" width="${s}" height="${s}" fill="none" stroke="${INK}" stroke-width="1.6"/><path d="${diagD(...at(0, 3), s, sqDir(0, 3))}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="${diagD(...at(0, 3), s, sqDir(0, 3))}" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>${lab(145, 16)}`, [at(0, 3)[0], y0, s, s])}
      ${spot('repeat', `${row3}${gridLines(x0, y0 + 3 * s, s, 5, 1, false)}${[0, 1, 2, 3, 4].map(c => `<path d="${diagD(...at(3, c), s, sqDir(3, c))}" stroke="${INK}" stroke-width="1.6"/>`).join('')}${lab(107, 194)}`, [x0, y0 + 3 * s, 5 * s, s])}
      ${spot('harmony', `<rect x="214" y="24" width="96" height="152" rx="14" fill="#fff" stroke="${INK}" stroke-width="2.5"/>${emo('⚖️', 262, 66, 38)}
        ${['#e8453c', '#ffd23f', '#2f7fd6', '#2fb3a8', '#1f1612'].map((c, i) => `<circle cx="${232 + i * 15}" cy="116" r="6.5" fill="${c}" stroke="${INK}" stroke-width="1.5"/>`).join('')}
        ${['#ffd23f', '#1f1612', '#e8453c', '#2f7fd6', '#2fb3a8'].map((c, i) => `<circle cx="${232 + i * 15}" cy="134" r="6.5" fill="${c}" stroke="${INK}" stroke-width="1.5"/>`).join('')}${lab(262, 162)}`, [214, 24, 96, 152])}`);
    },
  },

  // The book's two stages, for «craft»: a white page (0), the grid of
  // squares (1), the lines that cut them into triangles (2), the colours (3).
  stages: {
    html: () => {
      const s = 40, x0 = 60, y0 = 22;
      let fills = '';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) fills += sqCell(x0 + c * s, y0 + r * s, s, r, c);
      return svg('stages', `<rect width="320" height="200" rx="12" fill="#e9dcc0"/>
      <rect x="46" y="10" width="228" height="184" rx="6" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
      ${[70, 110, 150, 190, 230].map(x => `<circle cx="${x}" cy="10" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/>`).join('')}
      ${stage(0, `${emo('✏️', 160, 92, 34)}${txt('ورقة الرسم', 160, 132)}`, 1)}
      ${stage(3, fills)}
      ${stage(1, gridLines(x0, y0, s, 5, 4, false, 2))}
      ${stage(2, `<path d="${[0, 1, 2, 3].flatMap(r => [0, 1, 2, 3, 4].map(c => diagD(x0 + c * s, y0 + r * s, s, sqDir(r, c)))).join('')}" stroke="${INK}" stroke-width="2" stroke-linecap="round" pointer-events="none"/>`)}`);
    },
  },

  // «أحاول»: complete the grid. In every square the top triangle is warm
  // (u1–u4) and the bottom one cold (d1–d4), as in the coloured squares.
  trigrid: {
    html: () => {
      const s = 44, x0 = 72, y0 = 22, todo = ['0-2', '1-0', '1-3', '2-1'];
      const warm = ['#e8453c', '#f28c1a', '#ffd23f'], cold = ['#2f7fd6', '#34b04a', '#8a4fc9'];
      let out = '', k = 0;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const x = x0 + c * s, y = y0 + r * s, d = sqDir(r, c);
        if (todo.includes(`${r}-${c}`)) { k += 1; out += region(`u${k}`, triIn(x, y, s, d, 0), undefined, 'style="stroke-width:0"') + region(`d${k}`, triIn(x, y, s, d, 1), undefined, 'style="stroke-width:0"'); }
        else out += `<path d="${triD(x, y, s, d, 0)}" fill="${warm[(r + c * 2) % 3]}"/><path d="${triD(x, y, s, d, 1)}" fill="${cold[(r * 2 + c) % 3]}"/>`;
      }
      return svg('trigrid', `<rect width="320" height="200" rx="12" fill="#fffdf6"/>${out}${gridLines(x0, y0, s, 4, 3, true, 2)}
      ${txt('🔥 العلويّ حارّ', 112, 172)}${txt('❄️ السفليّ بارد', 208, 172)}`);
    },
  },

  // ---------- Lesson 3 · Fatna Kabbouri ----------

  // A naive painting in her spirit (art.js «fatna») with a vine of plant
  // decorations beside it. The spots: the open eyes, the plant decorations
  // and the geometric ones (the triangles of the blue dress).
  fatnapic: {
    html: () => svg('fatnapic', `<rect width="320" height="200" rx="12" fill="#f6f1e6"/>
      ${artG('fatna', 35, 0, 250, 200)}
      ${spot('plant', `<path d="M64 188Q56 140 66 100Q74 66 62 40" fill="none" stroke="#2f8a3f" stroke-width="3"/>
        ${[[60, 162, -1], [67, 132, 1], [63, 100, -1], [69, 74, 1]].map(([x, y, k]) => `<path d="M${x} ${y}q${k * 12} -11 ${k * 22} -2q${-k * 9} 11 ${-k * 22} 2Z" fill="#34b04a" stroke="#1f6a34" stroke-width="1.2"/>`).join('')}
        ${flower(62, 38, '#e8453c')}${flower(52, 120, '#8a4fc9')}${lab(64, 197)}`, [38, 24, 52, 168])}
      ${spot('colors', lab(186, 44), [92, 6, 192, 26])}
      ${spot('eyes', lab(137, 88), [110, 46, 56, 28])}
      ${spot('geo', lab(222, 197), [188, 102, 70, 88])}
      ${spot('who', `<text x="266" y="62" font-size="15" font-weight="800" font-style="italic" fill="${INK}" text-anchor="middle">فاطنة</text>${lab(266, 84)}`, [246, 44, 40, 26])}`),
  },

  // «أحاول»: a woman in the naive style, to colour with pure colours. The
  // decorations (dots, triangles, flowers) are drawn over the parts.
  naive: {
    html: () => svg('naive', `<rect width="320" height="200" rx="12" fill="#fffdf6"/>
      ${region('left', 'M10 10H98V190H10Z')}${region('right', 'M222 10H310V114H222Z')}
      ${region('dress', 'M126 104H194L212 170H108Z')}${region('hem', 'M108 170H212L216 188H104Z')}
      <circle cx="160" cy="80" r="25" fill="#f3c9a0" stroke="${INK}" stroke-width="2"/>
      ${region('scarf', 'M128 70Q122 22 160 22Q198 22 192 70Q178 56 160 58Q142 56 128 70Z')}
      ${[150, 170].map(x => `<circle cx="${x}" cy="80" r="8.5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="81" r="4.6" fill="${INK}"/><circle cx="${x + 2}" cy="78" r="1.6" fill="#fff"/>`).join('')}
      <ellipse cx="160" cy="95" rx="5" ry="2.6" fill="#c7373f"/>
      ${region('pot', 'M240 160a26 20 0 1 0 52 0a26 20 0 1 0 -52 0Z')}
      <g pointer-events="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round">
        <path d="M241 154Q226 150 222 136" fill="none" stroke-width="5"/><path d="M291 150Q306 152 302 168Q298 176 289 172" fill="none" stroke-width="4"/>
        <path d="M254 141Q266 128 278 141Z" fill="#e0b860"/><circle cx="266" cy="131" r="3.5" fill="#e0b860"/>
        ${[[136, 118], [160, 124], [184, 118], [128, 146], [150, 152], [172, 146], [194, 152], [160, 160]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#fff"/>`).join('')}
        ${[116, 136, 156, 176, 196].map(x => `<path d="M${x} 186L${x + 7} 173L${x + 14} 186Z" fill="#fff" stroke-width="1.4"/>`).join('')}
        <path d="M232 98L246 84L260 98L274 84L288 98L302 84" fill="none" stroke="#fff" stroke-width="3"/>
      </g>
      <g pointer-events="none">${flower(40, 44, '#fff', 6)}${flower(68, 92, '#fff', 6)}${flower(40, 142, '#fff', 6)}</g>`),
  },

  // ---------- Lesson 4 · a street in perspective ----------

  // The road of the book (p. 12): near big and dark, far small and light,
  // the edges that come together; an easel: the flat surface we draw on.
  road: {
    html: () => svg('road', `<rect width="320" height="200" rx="12" fill="#cfeeff"/>
      <path d="M96 80L130 58L156 70L184 52L214 68L246 56L280 80Z" fill="#dcd6ee"/>
      <rect y="80" width="320" height="120" fill="#a6d98b"/>
      <path d="M170 80L300 200H40Z" fill="#efe2c4"/><path d="M170 80L250 200H90Z" fill="#4a4f5a"/>
      ${[[0.96, 5, 14], [0.66, 3.4, 9], [0.4, 2, 5.5], [0.2, 1.2, 3]].map(([t, w, h]) => `<rect x="${170 - w / 2}" y="${80 + 120 * t - h}" width="${w}" height="${h}" fill="#fff"/>`).join('')}
      ${tree(96, 150, 16, '#3f9a4e')}
      ${spot('far', `${tree(136, 101, 6, '#a9e08f')}${lab(136, 74)}`, [124, 86, 24, 18])}
      ${spot('near', `${tree(42, 198, 34, '#1f6a34')}${lab(42, 92)}`, [6, 96, 72, 102])}
      ${spot('road', `<g stroke="#ffd23f" stroke-width="4" stroke-linecap="round" fill="none"><path d="M102 192L128 152M238 192L212 152"/><path d="M120 156L128 152L129 161M220 156L212 152L211 161"/></g>${lab(170, 146)}`, [96, 146, 148, 50])}
      ${spot('def', `<path d="M262 196L272 112M300 196L290 112M281 112V196" stroke="#8a5a34" stroke-width="3.5" stroke-linecap="round"/>
        <rect x="252" y="110" width="58" height="44" rx="2" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
        <rect x="256" y="114" width="50" height="16" fill="#cfeeff"/><rect x="256" y="130" width="50" height="20" fill="#a6d98b"/><path d="M281 130L298 150H264Z" fill="#4a4f5a"/>${lab(281, 104)}`, [248, 106, 66, 92])}`),
  },

  // The perspective diagram of the book (p. 13): the vanishing point F on
  // the horizon, the ground line, the viewer's eye; trees and lamp posts
  // shrink towards F. Also the picture of a «label» step.
  perspective: {
    html: () => {
      const F = [160, 72];
      // Along the edges of the pavements, t from 0 (near) to 1 (at F).
      const at = (x0, t) => [x0 + (F[0] - x0) * t, 176 - (176 - F[1]) * t];
      const post = t => { const [x, y] = at(290, t), h = 120 * (1 - t); return `<path d="M${x} ${y}V${y - h}h${-h * 0.18}" fill="none" stroke="${INK}" stroke-width="${Math.max(1.2, h / 30)}" stroke-linecap="round"/><rect x="${x - h * 0.25}" y="${y - h}" width="${h * 0.12}" height="${h * 0.05}" fill="#ffd36b" stroke="${INK}" stroke-width="1"/>`; };
      return svg('perspective', `<rect width="320" height="200" rx="12" fill="#fbfbf6"/>
      <path d="M10 12L310 132M10 132L310 12" stroke="#e8453c" stroke-width="1.4" stroke-dasharray="3 4" pointer-events="none"/>
      <path d="M${F[0]} ${F[1]}L290 176H30Z" fill="#f2ead8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M${F[0]} ${F[1]}L238 176H82Z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
      ${[[0.92, 4, 12], [0.6, 2.6, 7], [0.36, 1.6, 4]].map(([t, w, h]) => `<rect x="${F[0] - w / 2}" y="${F[1] + 104 * t - h}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="1"/>`).join('')}
      ${[0.05, 0.4, 0.65, 0.82].map(t => tree(...at(30, t), 32 * (1 - t), '#fff', INK)).join('')}
      ${[0.05, 0.4, 0.65, 0.82].map(post).join('')}
      ${spot('horizon', `<path d="M8 ${F[1]}H312" stroke="${INK}" stroke-width="3"/>${lab(46, F[1] - 8)}`, [8, F[1] - 8, 304, 16])}
      ${spot('ground', `<path d="M8 176H312" stroke="${INK}" stroke-width="3.5"/>${lab(268, 192)}`, [8, 168, 304, 16])}
      ${spot('f', `<circle cx="${F[0]}" cy="${F[1]}" r="4.5" fill="#e8453c" stroke="${INK}" stroke-width="1.5"/><text x="${F[0] + 9}" y="${F[1] - 6}" font-size="13" font-weight="800" fill="#e8453c">F</text>${lab(F[0], F[1] - 18)}`, [F[0] - 14, F[1] - 14, 28, 28])}
      ${spot('eye', `${emo('👁️', 160, 190, 18)}${lab(118, 194)}`, [142, 180, 36, 20])}`);
    },
  },

  // ---------- Lesson 5 · Georges Braque ----------

  // A cubist still life in his spirit (art.js «braque»). The spots: the
  // jug's face in the light and its face in the shadow, the glass built of
  // flat planes, the fruit (still life) and the signature.
  braquepic: {
    html: () => svg('braquepic', `<rect width="320" height="200" rx="12" fill="#efe6d2"/>
      ${artG('braque', 35, 0, 250, 200)}
      ${spot('light', lab(97, 28), [86, 40, 26, 104])}
      ${spot('shadow', lab(70, 176), [58, 44, 26, 108])}
      ${spot('geo', lab(158, 152), [138, 56, 40, 82])}
      ${spot('still', lab(232, 56), [180, 62, 90, 92])}
      ${spot('who', `<text x="264" y="192" font-size="14" font-weight="800" font-style="italic" fill="#fff" text-anchor="middle">براك</text>${lab(258, 172)}`, [248, 176, 32, 22])}`),
  },

  // «أحاول»: a still life of planes. The light comes from the left: the
  // faces turned to it are light (j1, b1, b3, p1), the others dark.
  cubist: {
    html: () => svg('cubist', `<rect width="320" height="200" rx="12" fill="#e9dcbc"/>
      <path d="M0 150L320 138V200H0Z" fill="#8a6d4b"/><path d="M30 186L290 150" stroke="#6b5235" stroke-width="2"/>
      <g pointer-events="none" stroke="#f2b400" stroke-width="2.5" stroke-linecap="round" opacity=".7"><path d="M40 30L64 48M44 18L76 26M30 42L48 66"/></g>
      ${emo('☀️', 24, 22, 30)}
      ${region('j1', 'M92 56L68 66L62 160L92 172Z')}${region('j2', 'M92 56L116 66L122 160L92 172Z')}
      <path d="M68 66Q48 80 64 112" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" pointer-events="none"/><path d="M116 66L132 52L124 74Z" fill="#c7b07c" stroke="${INK}" stroke-width="2" pointer-events="none"/>
      ${region('b3', 'M142 112L178 100L216 110L180 122Z')}${region('b1', 'M142 112L180 122V182L142 170Z')}${region('b2', 'M180 122L216 110V168L180 182Z')}
      ${region('p1', 'M266 92Q252 118 246 138Q244 166 266 170Z')}${region('p2', 'M266 92Q280 118 286 138Q288 166 266 170Z')}
      <path d="M266 92Q268 80 274 76" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" pointer-events="none"/>`),
  },

  // ---------- Lesson 6 · Palmyrene art ----------

  // The two sculptures of the book: a relief (art.js «palmyra») and a
  // sculpture in the round, the lion holding a gazelle («lion»); behind
  // them the mountains of soft limestone near Palmyra.
  palmyrapic: {
    html: () => svg('palmyrapic', `<rect width="320" height="200" rx="12" fill="#f3ead6"/>
      ${spot('stone', `<path d="M8 44L40 16L66 32L98 8L132 30L160 12L196 34L226 14L262 30L290 12L312 30V44Z" fill="#e6d3a8" stroke="#bfa36e" stroke-width="2" stroke-linejoin="round"/>
        ${[[60, 36], [140, 34], [244, 36]].map(([x, y]) => `<path d="M${x} ${y}l10 -6l10 6Z" fill="#efdcb0"/>`).join('')}${lab(160, 30)}`, [8, 6, 304, 38])}
      ${spot('relief', `<rect x="10" y="50" width="146" height="118" rx="6" fill="#c4a874"/>${artG('palmyra', 13, 52, 140, 112)}${lab(83, 186)}`, [10, 50, 146, 118])}
      ${spot('round', `<rect x="166" y="50" width="144" height="118" rx="6" fill="#bfe6ff"/>${artG('lion', 168, 52, 140, 112)}${lab(238, 186)}`, [166, 50, 144, 118])}`),
  },

  // «أحاول»: a lion in relief on a slab of clay, stage by stage: a lump (0),
  // a smooth slab (1), the outline drawn (2), clay added: raised (3), the
  // details carved (4).
  claywork: {
    html: () => {
      const lion = (fill, stroke, extra = '') => `<g fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round" ${extra}>
        <path d="M104 100Q90 84 78 92Q70 98 76 108" fill="none" stroke-width="5" stroke-linecap="round"/>
        <path d="M100 98Q118 80 168 84Q206 82 214 100L216 152H202L198 124Q168 130 132 124L126 152H112L110 124Q96 118 100 98Z"/>
        <circle cx="222" cy="92" r="27"/><circle cx="224" cy="94" r="15"/></g>`;
      return svg('claywork', `<rect width="320" height="200" rx="12" fill="#e9dcc7"/>
      ${stage(0, '<path d="M110 150Q100 96 160 92Q222 90 212 150Q160 168 110 150Z" fill="#d6b88c" stroke="#a8875a" stroke-width="2.5"/>', 1)}
      ${stage(1, '<rect x="40" y="30" width="240" height="150" rx="16" fill="#e2c9a0" stroke="#a8875a" stroke-width="3"/>')}
      ${stage(2, lion('none', '#8a6a44', 'stroke-dasharray="6 5"'), 3)}
      ${stage(3, `${lion('#a8875a', 'none', 'transform="translate(4 5)"')}${lion('#f1dfbd', '#a8875a')}`)}
      ${stage(4, `<g fill="none" stroke="#8a6a44" stroke-width="2.4" stroke-linecap="round">${Array.from({ length: 10 }, (_, i) => { const a = i * 0.628; return `<path d="M${(222 + Math.cos(a) * 19).toFixed(1)} ${(92 + Math.sin(a) * 19).toFixed(1)}L${(222 + Math.cos(a) * 25).toFixed(1)} ${(92 + Math.sin(a) * 25).toFixed(1)}"/>`; }).join('')}
        <path d="M218 102Q224 106 230 102M224 96V101M140 104Q150 112 162 104M118 110Q124 116 130 110"/></g><circle cx="219" cy="90" r="2.6" fill="#6b4a2a"/><circle cx="229" cy="90" r="2.6" fill="#6b4a2a"/>`)}`);
    },
  },

  // ---------- Lesson 7 · Ahmad Madoun ----------

  // A painting in his spirit (art.js «madoun»): a woman's face, a horse and
  // a bird, a Palmyrene column; an eye for visual culture; his signature.
  madounpic: {
    html: () => svg('madounpic', `<rect width="320" height="200" rx="12" fill="#f3e6cc"/>
      ${artG('madoun', 35, 0, 250, 200)}
      ${spot('visual', `${emo('👁️', 56, 24, 26)}${lab(112, 30)}`, [40, 6, 34, 34])}
      ${spot('woman', lab(110, 172), [74, 46, 72, 104])}
      ${spot('column', lab(168, 116), [154, 4, 26, 96])}
      ${spot('animals', lab(238, 18), [186, 22, 92, 136])}
      ${spot('who', `<text x="258" y="192" font-size="14" font-weight="800" font-style="italic" fill="#5a3a22" text-anchor="middle">مادون</text>${lab(258, 174)}`, [238, 178, 42, 20])}`),
  },

  // «أحاول»: a painting in his spirit, to glue together (PIECES below).
  madounwork: {
    html: () => svg('madounwork', `<rect width="320" height="200" rx="12" fill="#e3a65a"/>
      <rect width="320" height="58" rx="12" fill="#f0c27a" opacity=".8"/><path d="M0 176Q160 160 320 178V200H0Z" fill="#c98a4a"/>
      <g fill="none" stroke="#c98a4a" stroke-width="2" opacity=".7"><path d="M14 30Q30 12 46 30M276 150Q292 136 308 150M16 170L30 156L44 170"/></g>
      ${Object.entries(MADOUN).map(([id, p]) => slot(id, p.d, p.fill, p.inner)).join('')}`),
  },

  // ---------- Lesson 8 · African art ----------

  // Painted houses (p. 22–23): a wall of corrugated iron with big circles
  // and stripes, a round hut with geometric paint, a woman painting her
  // house, her pots of paint; Africa on the globe.
  africa: {
    html: () => svg('africa', `<rect width="320" height="200" rx="12" fill="#bfe6ff"/><rect y="168" width="320" height="32" fill="#d9a066"/>
      ${spot('def', `${emo('🌍', 28, 28, 30)}${lab(74, 32)}`, [10, 10, 36, 36])}
      ${spot('wall', `<rect x="10" y="62" width="128" height="108" fill="#d8d8d0" stroke="${INK}" stroke-width="2"/><path d="M6 62L72 46L142 62Z" fill="#8a8f96" stroke="${INK}" stroke-width="2"/>
        <path d="${Array.from({ length: 15 }, (_, i) => `M${18 + i * 8} 64V168`).join('')}" stroke="#b9b9b0" stroke-width="2"/>
        ${rings(46, 116, [26, 18, 10], ['#1f1612', '#fff', '#1f1612'])}${rings(46, 116, [5], ['#e8453c'])}
        ${['#e8453c', '#ffd23f', '#34b04a', '#2f7fd6'].map((c, i) => `<rect x="${84 + i * 12}" y="76" width="9" height="80" fill="${c}"/>`).join('')}${lab(74, 186)}`, [8, 44, 136, 128])}
      ${spot('hut', `<rect x="186" y="104" width="122" height="66" fill="#e9b06a" stroke="${INK}" stroke-width="2"/>
        ${[0, 1, 2, 3, 4, 5].map(k => `<path d="M${186 + k * 20} 128L${196 + k * 20} 108L${206 + k * 20} 128Z" fill="${k % 2 ? '#fff' : '#1f1612'}"/>`).join('')}
        <path d="M186 132H308" stroke="#e8453c" stroke-width="5"/><path d="M234 170V142Q247 130 260 142V170Z" fill="#5a3a22"/>
        ${[[204, 152], [288, 152]].map(([x, y]) => `<path d="M${x} ${y - 10}L${x + 10} ${y}L${x} ${y + 10}L${x - 10} ${y}Z" fill="#34b04a" stroke="${INK}" stroke-width="1.5"/>`).join('')}
        <path d="M176 108L247 40L318 108Z" fill="#d9b25a" stroke="${INK}" stroke-width="2"/><path d="M200 106L247 44M222 107L247 44M247 108V44M272 107L247 44M294 106L247 44" stroke="#b08a3a" stroke-width="1.5"/>${lab(247, 186)}`, [176, 38, 140, 134])}
      ${spot('woman', `${emo('👩🏾‍🎨', 160, 132, 34)}${lab(160, 104)}`, [142, 112, 36, 40])}
      ${spot('colors', `${['#e8453c', '#ffd23f', '#34b04a'].map((c, i) => `<path d="M${144 + i * 12} 168h10l-1 14h-8Z" fill="${c}" stroke="${INK}" stroke-width="1.5"/>`).join('')}${lab(160, 196)}`, [140, 162, 40, 24])}`),
  },

  // The African mask (art.js «mask», p. 26): an hourglass (old), a log
  // (wood) and the axis of its symmetry.
  maskpic: {
    html: () => svg('maskpic', `<rect width="320" height="200" rx="12" fill="#f6ecd6"/>
      <rect x="66" y="6" width="188" height="152" rx="6" fill="#c98a4a" stroke="${INK}" stroke-width="2.5"/>${artG('mask', 72, 12, 176, 140)}
      ${spot('old', `${emo('⏳', 32, 62, 34)}${lab(33, 104)}`, [10, 38, 46, 48])}
      ${spot('wood', `${emo('🪵', 288, 62, 34)}${lab(287, 104)}`, [264, 38, 46, 48])}
      ${spot('shape', `<path d="M160 10V156" stroke="#e8453c" stroke-width="3" stroke-dasharray="7 5"/>${lab(160, 180)}`, [148, 8, 24, 150])}`),
  },

  // «أحاول»: a round hut to paint: its wall and circles in pure colours,
  // the band of triangles black and white in turn (the right one is given).
  hutpaint: {
    html: () => svg('hutpaint', `<rect width="320" height="200" rx="12" fill="#bfe6ff"/><rect y="176" width="320" height="24" fill="#d9a066"/>
      ${region('wall', 'M70 122H250V178H70Z')}
      ${[0, 1, 2, 3].map(k => region(`t${k}`, `M${70 + k * 36} 122L${88 + k * 36} 104L${106 + k * 36} 122Z`)).join('')}
      <path d="M214 122L232 104L250 122Z" fill="#1f1612" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      ${region('c1', 'M88 150a16 16 0 1 0 32 0a16 16 0 1 0 -32 0Z')}${region('c2', 'M200 150a16 16 0 1 0 32 0a16 16 0 1 0 -32 0Z')}
      <path d="M146 178V150Q160 136 174 150V178Z" fill="#5a3a22" stroke="${INK}" stroke-width="2" pointer-events="none"/>
      <path d="M58 102L160 26L262 102Z" fill="#d9b25a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" pointer-events="none"/>
      <path d="M90 100L160 30M124 101L160 30M160 102V30M196 101L160 30M230 100L160 30" stroke="#b08a3a" stroke-width="1.6" pointer-events="none"/>`),
  },
};

// The pieces of the collage «madounwork»: a woman's face with wide eyes, a
// Palmyrene column, a white horse, a bird.
const MADOUN = {
  face: { label: 'وجه امرأة', box: [40, 44, 72, 102], d: 'M46 100Q46 50 76 50Q106 50 106 100Q106 142 76 142Q46 142 46 100Z', fill: '#f3d2b3', say: 'وجه امرأة بعينين واسعتين، كوجوه التماثيل التدمريّة. 👁️',
    inner: `<path d="M46 100Q42 48 76 46Q110 48 106 100Q100 70 76 66Q52 70 46 100Z" fill="#5a3a22"/>${[64, 88].map(x => `<ellipse cx="${x}" cy="98" rx="8" ry="6" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="${x}" cy="98" r="3.8" fill="${INK}"/>`).join('')}
      <path d="M76 102V114" stroke="#b07a52" stroke-width="2"/><ellipse cx="76" cy="124" rx="7" ry="3" fill="#c7373f"/><circle cx="48" cy="116" r="3.5" fill="#e0b040"/><circle cx="104" cy="116" r="3.5" fill="#e0b040"/>` },
  column: { label: 'عمود تدمريّ', box: [128, 42, 54, 150], d: 'M140 180V62H134V48H176V62H170V180H178V190H132V180Z', fill: '#e9d6a8', say: 'عمود من تدمر: الثقافة البصريّة التدمريّة في لوحتك. 🏛️',
    inner: `<path d="M148 66V178M155 66V178M162 66V178" stroke="#bfa36e" stroke-width="2"/><path d="M134 56H176" stroke="#bfa36e" stroke-width="2"/>` },
  horse: { label: 'حصان', box: [168, 80, 112, 98], d: 'M184 122L238 112L258 86L272 94L258 118L260 172H248L244 138L204 142L198 174H186Z', fill: '#f6efe0', say: 'حصان أبيض، كما في لوحاته. 🐎',
    inner: `<path d="M184 124Q170 134 174 156" fill="none" stroke="#f6efe0" stroke-width="5" stroke-linecap="round"/><path d="M244 112Q252 98 262 90" fill="none" stroke="#5a3a22" stroke-width="3"/><circle cx="264" cy="94" r="2" fill="${INK}"/>` },
  bird: { label: 'طائر', box: [196, 16, 70, 46], d: 'M200 46Q216 24 236 36L262 26L248 46Q232 60 200 46Z', fill: '#3f8fd6', say: 'طائر يحلّق في السماء. 🕊️',
    inner: `<path d="M214 44Q226 32 240 42" fill="none" stroke="#1d3f8a" stroke-width="2"/><circle cx="208" cy="42" r="2" fill="#fff"/>` },
};

export const PIECES = {
  madounwork: Object.fromEntries(Object.entries(MADOUN).map(([id, p]) => [id, { label: p.label, box: p.box, say: p.say, art: `<path d="${p.d}" fill="${p.fill}" stroke="${INK}" stroke-width="1.5"/>${p.inner}` }])),
};
