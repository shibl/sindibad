// Little paintings of the art island, drawn in code: one per lesson of the
// book (they hang in the island's gallery when a quest is finished) and a few
// more for the gallery games (whose painting is this?). Each is a list of
// shapes on a 100 × 80 canvas, so the same picture is drawn both as SVG (in
// the quest card) and on a canvas (a texture in the 3D gallery), from the
// same data:
//
//   ART[key] = [{ d: SVG path, f: fill, s: stroke, w: stroke width, o: opacity }, …]
//   artSVG(key, cls)   → '<svg …>'
//   drawArt(ctx, key, x, y, w, h)   paints it on a 2D canvas (Path2D)
//
// They are not copies of the artists' works: each shows the idea the book
// teaches with it (open eyes and pure colours, a vanishing point, cubes of
// light and shadow, a carved relief…).

const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const E = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const R = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const P = (...p) => `M${p.slice(0, 2).join(' ')}${p.slice(2).reduce((a, v, i) => a + (i % 2 ? ` ${v}` : `L${v}`), '')}Z`;
const L = (...p) => `M${p.slice(0, 2).join(' ')}${p.slice(2).reduce((a, v, i) => a + (i % 2 ? ` ${v}` : `L${v}`), '')}`;
const f = (d, fill, o) => ({ d, f: fill, ...(o != null ? { o } : {}) });
const s = (d, stroke, w = 1.5) => ({ d, s: stroke, w });
const bg = c => f(R(0, 0, 100, 80), c);
const rings = (cx, cy, cols, step) => cols.map((c, i) => f(C(cx, cy, (cols.length - i) * step), c));
const eye = (x, y, r = 4) => [f(C(x, y, r), '#fff'), f(C(x, y + 0.4, r * 0.55), '#1f1612'), f(C(x + r * 0.25, y - r * 0.3, r * 0.18), '#fff')];

// A few shared pieces.
function triGrid(cols, rows, pal, seed = 3) {
  const out = [], w = 100 / cols, h = 80 / rows;
  let k = seed;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * w, y = r * h, a = pal[k++ % pal.length], b = pal[(k * 3 + 1) % pal.length];
    out.push(f(R(x, y, w, h), a));
    out.push(f((r + c) % 2 ? P(x, y, x + w, y, x, y + h) : P(x + w, y, x + w, y + h, x, y + h), b));
  }
  return out;
}

export const ART = {
  // 1 · intersecting colour circles and free straight lines
  circles: [bg('#f4f1ea'), ...rings(30, 38, ['#e8453c', '#ffd23f', '#3f8fd6', '#fff', '#1f1612'], 6), ...rings(72, 46, ['#3f8fd6', '#f28c3a', '#4fbf5a', '#8a63c9'], 7),
    ...rings(84, 12, ['#e8453c', '#fff', '#1f1612'], 3.5), s(L(0, 70, 100, 6), '#1f1612', 2), s(L(10, 0, 58, 80), '#1f1612', 2), s(L(0, 22, 100, 34), '#1f1612', 1.2)],
  // 2 · squares cut by lines into triangles, repeated in harmony
  triangles: triGrid(5, 4, ['#e8453c', '#3f8fd6', '#ffd23f', '#1f1612', '#4fbf5a', '#f28c3a', '#fff', '#8a63c9']),
  // 3 · a naive painting: big open eyes, pure colours, patterned dresses
  fatna: [bg('#ffd23f'), ...[10, 30, 50, 70, 90].flatMap(x => [f(C(x, 8, 3), '#e8453c'), f(C(x - 10, 74, 3), '#4fbf5a')]),
    f(P(30, 34, 52, 34, 60, 78, 22, 78), '#e8453c'), ...[[34, 46], [46, 52], [38, 62], [50, 68], [30, 72]].map(([x, y]) => f(C(x, y, 2.4), '#fff')),
    f(E(41, 24, 11, 12), '#f3c9a0'), f('M29 24 Q41 4 53 24 L53 18 Q41 0 29 18Z', '#2fa84f'), ...eye(36, 24, 4.2), ...eye(46, 24, 4.2), f(E(41, 32, 3, 1.6), '#c7373f'),
    f(P(66, 40, 84, 40, 90, 78, 60, 78), '#3f8fd6'), ...[[68, 52], [78, 60], [72, 70], [84, 70]].map(([x, y]) => f(P(x, y - 3, x + 3, y + 2, x - 3, y + 2), '#ffd23f')),
    f(E(75, 30, 8.5, 9.5), '#e8b48a'), f('M66 30 Q75 14 84 30 L84 24 Q75 10 66 24Z', '#8a63c9'), ...eye(71.5, 30, 3.3), ...eye(78.5, 30, 3.3)],
  // 4 · a street in perspective: the lines meet at the vanishing point
  street: [bg('#bfe6ff'), f(R(0, 34, 100, 46), '#a6d98b'), f(P(50, 34, 96, 80, 4, 80), '#4a4f5a'), f(P(50, 34, 4, 80, 0, 80, 0, 74), '#f3e2bd'), f(P(50, 34, 96, 80, 100, 80, 100, 74), '#f3e2bd'),
    ...[[50, 80, 4], [50, 60, 2.6], [50, 46, 1.5]].map(([x, y, w]) => f(R(x - w / 4, y - w * 2.4, w / 2, w * 2.2), '#fff')),
    ...[[12, 62, 10], [28, 48, 6], [38, 40, 3.4]].flatMap(([x, y, r]) => [f(R(x - r * 0.16, y, r * 0.32, r * 1.4), '#8a5a34'), f(C(x, y - r * 0.2, r), '#3f9a4e')]),
    ...[[88, 62, 10], [72, 48, 6], [62, 40, 3.4]].flatMap(([x, y, r]) => [f(R(x - r * 0.16, y, r * 0.32, r * 1.4), '#8a5a34'), f(C(x, y - r * 0.2, r), '#7cc35a')]),
    s(L(0, 34, 100, 34), '#e8453c', 0.8), f(C(50, 34, 1.6), '#e8453c')],
  // 5 · a cubist still life: a jug, a glass, lemons and a pear, in planes of light and shadow
  braque: [bg('#c9b07a'), f(P(0, 52, 100, 46, 100, 80, 0, 80), '#5a4a3a'), f(P(8, 58, 70, 50, 92, 66, 30, 78), '#f6f1e4'), f(P(30, 78, 92, 66, 96, 72, 40, 80), '#d8d0bd'),
    f(P(12, 18, 26, 14, 30, 60, 10, 62), '#e8c23a'), f(P(12, 18, 19, 16, 18, 61, 10, 62), '#b8902a'), f(P(26, 14, 34, 22, 30, 34), '#e8c23a'), f(P(8, 30, 12, 26, 12, 40), '#2f5a3a'),
    f(P(42, 24, 56, 24, 54, 54, 44, 54), '#cfd8d6', 0.9), f(P(42, 24, 48, 24, 47, 54, 44, 54), '#8a9a98', 0.9),
    f(E(66, 50, 9, 6), '#ffd23f'), f(P(60, 48, 66, 44, 72, 52, 64, 56), '#e0b020'), f(E(78, 58, 8, 5.5), '#ffd23f'),
    f('M86 52 Q80 40 86 26 Q92 40 90 52 Q88 58 86 52Z', '#d9862e'), f('M86 52 Q83 40 86 26 L86 52Z', '#b0641e'), s(L(0, 0, 40, 80), '#8a7a5a', 0.6), s(L(60, 0, 100, 40), '#8a7a5a', 0.6)],
  // 6 · Palmyrene relief: figures raised from the limestone
  palmyra: [bg('#e6d3a8'), f(R(4, 6, 92, 68), '#d9c18e'), ...[18, 36, 54].flatMap(x => [f('M' + (x - 7) + ' 70 L' + (x - 6) + ' 26 Q' + x + ' 18 ' + (x + 6) + ' 26 L' + (x + 7) + ' 70Z', '#efdcb0'), f(C(x, 18, 6), '#efdcb0'), s(L(x - 3, 34, x - 2, 66), '#bfa36e', 0.8), s(L(x + 3, 34, x + 2, 66), '#bfa36e', 0.8)]),
    f('M50 70 Q58 48 72 48 L92 52 L92 70Z', '#efdcb0'), f(C(76, 36, 8), '#efdcb0'), s('M56 64 Q70 56 90 60', '#bfa36e', 0.8), f(R(4, 70, 92, 4), '#c4a874')],
  // 7 · sculpture in the round: a lion holding a gazelle
  lion: [bg('#bfe6ff'), f(R(0, 64, 100, 16), '#e6d3a8'), f(R(30, 10, 40, 58), '#e9d8b0'), f(C(50, 26, 15), '#d9bf86'), f(C(50, 27, 10), '#efdcb0'), ...eye(45, 24, 2.6), ...eye(55, 24, 2.6),
    f(E(50, 32, 5, 3.5), '#bfa36e'), f(R(36, 42, 28, 22), '#efdcb0'), f('M40 64 Q46 52 56 56 L60 64Z', '#d9c18e'), f(P(44, 52, 47, 44, 48, 52), '#bfa36e')],
  // 8 · warm earth colours, a woman's face, a horse and a bird
  madoun: [bg('#e3a65a'), f(R(0, 0, 100, 26), '#f0c27a', 0.8), f(E(30, 40, 14, 18), '#f3d2b3'), f('M16 40 Q16 14 30 14 Q46 14 44 40 Q40 22 30 22 Q20 24 16 40Z', '#5a3a22'),
    ...eye(25, 38, 3.4), ...eye(35, 38, 3.4), f(E(30, 50, 3.2, 1.6), '#c7373f'), f(P(0, 80, 14, 58, 46, 58, 60, 80), '#c94a3a'),
    f('M60 44 L82 40 L90 30 L94 34 L88 44 L88 60 L84 60 L82 48 L66 50 L64 62 L60 62Z', '#f6efe0'), f('M66 18 Q74 10 80 16 L92 12 L84 20 Q76 26 66 18Z', '#3f8fd6'), f(R(50, 8, 6, 30), '#d9c18e'), f(C(53, 8, 4), '#d9c18e')],
  // 9 · an African mask: long, symmetric, geometric, carved from wood
  mask: [bg('#ffd23f'), f(E(50, 40, 22, 36), '#8a4a24'), f(E(50, 40, 18, 32), '#b8682e'), f('M32 18 Q50 0 68 18 L68 22 Q50 8 32 22Z', '#2fa84f'),
    ...[24, 28, 32].map(y => s(L(36, y, 64, y), '#1f1612', 1.2)), f(P(36, 38, 46, 34, 46, 40), '#fff'), f(P(64, 38, 54, 34, 54, 40), '#fff'), f(P(48, 40, 52, 40, 54, 56, 46, 56), '#5a2a14'),
    f(P(42, 62, 50, 58, 58, 62, 50, 68), '#e8453c'), ...[0, 1, 2].map(i => f(P(38 + i * 8, 70, 42 + i * 8, 74, 34 + i * 8, 74), '#fff'))],
  // 10 · Ursula Bahr's Syrian fields: olive trees, sunflowers, lilies, farmers
  fields: [bg('#9fb7c9'), f('M0 20 Q30 10 60 18 T100 14 V30 H0Z', '#c7d3dc'), f(R(0, 30, 100, 50), '#6a9a3a'), f(P(40, 30, 60, 30, 70, 80, 30, 80), '#c98a4a'),
    ...[[10, 26], [26, 24], [74, 24], [90, 27]].flatMap(([x, y]) => [f(R(x - 1, y, 2, 7), '#6b4a2a'), f(E(x, y - 2, 7, 4.5), '#8aa25a')]),
    ...[[8, 50], [16, 56], [6, 66], [20, 70], [12, 76], [24, 60]].flatMap(([x, y]) => [f(C(x, y, 3.2), '#ffd23f'), f(C(x, y, 1.2), '#6b4a2a')]),
    ...[[80, 52], [90, 60], [74, 66], [88, 74]].map(([x, y]) => f(P(x, y - 6, x + 2, y - 1, x + 7, y, x + 2, y + 1, x, y + 6, x - 2, y + 1, x - 7, y, x - 2, y - 1), '#f28c3a')),
    f(R(48, 40, 4, 12), '#fff'), f(C(50, 37, 3), '#e8b48a'), f(R(57, 44, 4, 10), '#8a63c9'), f(C(59, 41, 2.6), '#c98f62')],
  // Ursula Bahr: a patient in hospital (her paintings of illness and war)
  patient: [bg('#f2c38a'), f(R(0, 52, 100, 28), '#d98a4a'), f(R(70, 10, 6, 50), '#9aa6b0'), f(R(66, 10, 14, 10), '#cfe3f0'), s(L(73, 20, 56, 40), '#9aa6b0', 0.8),
    f(P(38, 34, 60, 34, 64, 76, 34, 76), '#7fb3c8'), f(E(49, 24, 7, 8), '#e8b48a'), f('M40 22 Q49 8 58 22 L60 50 L56 50 L55 26 Q49 16 43 26 L42 50 L38 50Z', '#d9862e')],
  // 11 · Zuhair Hadramout: a noria of Hama by the arches and the river
  noria: [bg('#cfe8ff'), f(R(0, 18, 100, 22), '#efe2c4'), ...[0, 1, 2, 3, 4].map(i => f(R(4 + i * 10, 22, 8, 10), '#d9c79e')), f(R(0, 52, 100, 28), '#3f8fc0'),
    ...[52, 64, 76, 88].map(x => f('M' + (x - 6) + ' 52 V42 Q' + x + ' 32 ' + (x + 6) + ' 42 V52Z', '#e9d8b0')), f(R(44, 36, 56, 6), '#e9d8b0'),
    f(C(30, 46, 22), '#6b4a2a'), f(C(30, 46, 19), '#cfe8ff', 0), s(C(30, 46, 20), '#7a5130', 3), ...[0, 1, 2, 3, 4, 5].map(i => s(L(30 + Math.cos(i * 1.047) * 20, 46 + Math.sin(i * 1.047) * 20, 30 - Math.cos(i * 1.047) * 20, 46 - Math.sin(i * 1.047) * 20), '#7a5130', 1.6)),
    ...[[6, 74], [14, 70], [62, 76], [72, 72], [84, 76], [94, 70]].map(([x, y], i) => f(C(x, y, 3.6), ['#e8537a', '#ffd23f', '#f28c3a', '#ec79a8'][i % 4]))],
  // Zuhair Hadramout: a musician among fruits and flowers
  cellist: [bg('#9fc77a'), f(C(18, 18, 10), '#6a9a3a'), f(C(86, 60, 12), '#5aa244'), f(E(52, 56, 13, 18), '#b8682e'), f(E(52, 56, 9, 13), '#8a4a24'), s(L(52, 20, 52, 74), '#3b2414', 1.4),
    f(E(36, 30, 6, 7), '#e8b48a'), f('M30 30 Q36 18 44 28 L42 34Z', '#c98a3a'), f(P(30, 38, 42, 38, 46, 64, 26, 64), '#3f8fd6'),
    f(C(14, 64, 5), '#e8453c'), f(C(22, 70, 4), '#ffd23f'), f(C(80, 20, 4), '#e8453c'), f(C(88, 28, 3), '#8a63c9')],
  // 12 · cardboard: the first layer peeled off, the grooves show a flower
  cardboard: [bg('#c9955b'), ...Array.from({ length: 16 }, (_, i) => s(L(0, 4 + i * 5, 100, 4 + i * 5), '#b07c44', 0.6)),
    ...[[50, 66, 50, 20], [50, 44, 34, 30], [50, 52, 66, 38]].map(([x1, y1, x2, y2]) => s(L(x1, y1, x2, y2), '#7a4f2d', 5)),
    f('M42 22 L50 6 L58 22 Q50 30 42 22Z', '#7a4f2d'), f(E(30, 28, 8, 4), '#7a4f2d'), f(E(70, 36, 8, 4), '#7a4f2d'),
    ...Array.from({ length: 10 }, (_, i) => s(L(40, 8 + i * 2.4, 60, 8 + i * 2.4), '#c9955b', 0.5))],
  // 13 · realism: a girl blowing soap bubbles
  bubbles: [bg('#bfe0d8'), f(E(46, 30, 13, 15), '#f3d2b3'), f('M32 30 Q32 10 46 10 Q60 10 60 30 Q56 18 46 18 Q36 18 32 30Z', '#6b3a1e'), f(R(30, 30, 5, 34), '#6b3a1e'), f(R(57, 30, 5, 34), '#6b3a1e'),
    f(P(32, 46, 60, 46, 66, 80, 26, 80), '#2f8a6a'), f(P(40, 46, 52, 46, 50, 80, 42, 80), '#e9f2ff'), f(E(43, 28, 2, 1.2), '#3b2414'), f(E(52, 28, 2, 1.2), '#3b2414'), f(E(48, 37, 2.6, 2.2), '#c7373f'),
    s(L(50, 38, 66, 34), '#9a8a6a', 1), ...[[72, 30, 8], [84, 16, 6], [78, 50, 5], [92, 40, 4], [64, 14, 3.6]].flatMap(([x, y, r]) => [f(C(x, y, r), '#fff', 0.35), s(C(x, y, r), '#fff', 0.8)])],
  // 14 · a mandala: a circle of balanced motifs that gather at the centre
  mandala: [bg('#2a1a3e'), f(C(50, 40, 36), '#3f8fd6'), ...Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2, x = 50 + Math.cos(a) * 28, y = 40 + Math.sin(a) * 28; return f(C(x, y, 7), i % 2 ? '#ffd23f' : '#e8453c'); }),
    f(C(50, 40, 22), '#2fb3a8'), ...Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return f(P(50, 40, 50 + Math.cos(a - 0.3) * 20, 40 + Math.sin(a - 0.3) * 20, 50 + Math.cos(a) * 26, 40 + Math.sin(a) * 26, 50 + Math.cos(a + 0.3) * 20, 40 + Math.sin(a + 0.3) * 20), '#f28c3a'); }),
    f(C(50, 40, 12), '#8a63c9'), f(C(50, 40, 7), '#ffd23f'), f(C(50, 40, 3), '#e8453c')],
  // 15 · a Damascene courtyard: stripes of stone, arches, a fountain
  courtyard: [bg('#bfe0ff'), ...Array.from({ length: 10 }, (_, i) => f(R(0, 4 + i * 5, 100, 5), i % 2 ? '#3b3640' : '#f3e6c8')),
    ...[18, 50, 82].map(x => f('M' + (x - 11) + ' 56 V36 Q' + x + ' 20 ' + (x + 11) + ' 36 V56Z', '#5a4a3a')), f(R(0, 56, 100, 24), '#e9dcc0'),
    f(E(50, 66, 16, 5), '#7fc4e8'), f(R(48, 54, 4, 10), '#efe6d2'), f(C(50, 52, 3), '#bfe8ff'), f(R(84, 46, 3, 20), '#8a5a34'), f(C(85, 40, 9), '#4fae45'), ...[[80, 38], [88, 42], [84, 34]].map(([x, y]) => f(C(x, y, 1.6), '#ffd23f'))],
  // 16 · a paper butterfly (origami)
  butterfly: [bg('#f4ecff'), f(P(50, 40, 12, 14, 18, 44), '#b9a3f0'), f(P(50, 40, 88, 14, 82, 44), '#b9a3f0'), f(P(50, 40, 18, 44, 26, 66), '#9a7fe0'), f(P(50, 40, 82, 44, 74, 66), '#9a7fe0'),
    s(L(50, 40, 18, 44), '#7a5fc0', 0.8), s(L(50, 40, 82, 44), '#7a5fc0', 0.8), f(P(48, 30, 52, 30, 52, 56, 48, 56), '#6a4ab0'), s('M49 30 Q44 20 40 18', '#6a4ab0', 1), s('M51 30 Q56 20 60 18', '#6a4ab0', 1)],
  // 17 · surface effects on clay: pressed in (sunken) and added on (raised)
  clay: [bg('#e9dcc7'), f(R(8, 8, 84, 64), '#d6c4a6'), ...[[22, 22], [34, 22], [46, 22], [22, 34], [34, 34], [46, 34]].flatMap(([x, y]) => [f(E(x, y, 4.2, 5.4), '#a8946e'), f(E(x + 0.8, y + 1, 3.4, 4.4), '#c2ad86')]),
    s('M72 40 m-10 0 a10 10 0 1 0 20 0 a7 7 0 1 0 -14 0 a4 4 0 1 0 8 0', '#f2e6cf', 4), s('M72 40 m-10 0 a10 10 0 1 0 20 0 a7 7 0 1 0 -14 0 a4 4 0 1 0 8 0', '#bfa680', 1),
    ...[0, 1, 2, 3, 4, 5, 6].map(i => f(C(20 + i * 9, 60, 2.6), '#f2e6cf'))],
  // 18 · cylinders: a wreath of cardboard tubes and wood
  tubes: [bg('#cfd8e0'), ...Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2, r = i % 3 ? 7 : 9.5; const x = 50 + Math.cos(a) * 26, y = 40 + Math.sin(a) * 26; return [f(C(x, y, r), '#b07c44'), f(C(x, y, r - 1.8), '#e8d4b0'), ...(i % 4 === 0 ? [f(C(x, y, r - 4), ['#2fb3a8', '#3b4a9a', '#d9a04a'][i % 3])] : [])]; }).flat()],
  // 19 · lines and visual crossings: black and white
  zigzag: [bg('#fff'), f(R(0, 0, 50, 40), '#1f1612'), s(L(0, 30, 10, 10, 20, 30, 30, 10, 40, 30, 50, 10), '#fff', 3), s(L(0, 44, 10, 36, 20, 44), '#1f1612', 0),
    ...[46, 54, 62, 70, 78].map(y => s(`M0 ${y} Q12.5 ${y - 6} 25 ${y} T50 ${y}`, '#1f1612', 2)), ...[0, 1, 2, 3].flatMap(r => [0, 1, 2, 3].map(c => (r + c) % 2 ? null : f(R(50 + c * 12.5, r * 10, 12.5, 10), '#1f1612'))).filter(Boolean),
    ...[[62, 52, 10], [88, 66, 9], [70, 72, 6]].flatMap(([x, y, r]) => [s(C(x, y, r), '#1f1612', 2), s(C(x, y, r / 2), '#1f1612', 2)])],
  // 20 · moving colour lines: a bird of patterned feathers
  turkey: [bg('#f2ede0'), ...Array.from({ length: 7 }, (_, i) => { const a = Math.PI + (i / 6) * Math.PI, x = 52 + Math.cos(a) * 34, y = 52 + Math.sin(a) * 34; return f(P(52, 52, 52 + Math.cos(a - 0.2) * 22, 52 + Math.sin(a - 0.2) * 22, x, y, 52 + Math.cos(a + 0.2) * 22, 52 + Math.sin(a + 0.2) * 22), i % 2 ? '#1f1612' : '#fff'); }),
    ...Array.from({ length: 6 }, (_, i) => s(L(28 + i * 8, 28, 30 + i * 8, 44), '#1f1612', 1.2)), f(C(54, 54, 14), '#1f1612'), ...[10, 6].map(r => s(C(54, 54, r), '#fff', 1.6)), f(C(72, 44, 5), '#1f1612'), f(C(73, 43, 1.4), '#fff'), f('M76 46 Q80 54 74 58 Q70 52 74 46Z', '#e8453c')],
  // 21 · collage: a fish made of scraps of paper, newspaper and fabric
  collagefish: [bg('#3f8fd6'), ...[[0, 0], [30, 6], [60, 0], [10, 60], [50, 66], [80, 56]].map(([x, y], i) => f(P(x, y, x + 24, y + 4, x + 20, y + 16, x - 2, y + 14), ['#6fb3e8', '#2a6fb0', '#9fd3ff'][i % 3])),
    f('M18 40 Q40 14 70 30 L88 18 L84 40 L88 62 L70 50 Q40 66 18 40Z', '#f28c3a'), f(P(40, 26, 56, 24, 60, 40, 44, 44), '#ffd23f'), ...[30, 33, 36, 39].map(y => s(L(42, y, 57, y), '#555', 0.6)),
    f(P(52, 44, 66, 40, 64, 54, 50, 52), '#e8453c'), ...[[56, 46], [60, 49], [55, 50]].map(([x, y]) => f(C(x, y, 1), '#fff')), ...eye(28, 36, 4), f(P(46, 20, 54, 10, 62, 22), '#e8453c')],
  // 22 · the carpenter: a wooden chair and a saw
  chair: [bg('#f6e8cc'), f(R(0, 66, 100, 14), '#c9955b'), f(R(30, 10, 6, 56), '#a8703f'), f(R(54, 10, 6, 56), '#a8703f'), ...[16, 26].map(y => f(R(30, y, 30, 4), '#c99863')),
    f(R(26, 40, 40, 6), '#c99863'), f(R(60, 40, 6, 26), '#a8703f'), f(R(26, 46, 4, 20), '#a8703f'),
    f(P(70, 30, 96, 22, 96, 30, 72, 36), '#c9cfd6'), ...[0, 1, 2, 3, 4, 5].map(i => f(P(72 + i * 4, 35.4 - i, 74 + i * 4, 38 - i, 76 + i * 4, 34.6 - i), '#9aa6b0')), f(R(64, 26, 8, 12), '#e8453c')],
  // 23 · art in daily life: a face made of vegetables
  veggie: [bg('#f6f6f6'), f(E(50, 44, 26, 32), '#7cc35a'), ...[[34, 18], [50, 12], [66, 18], [28, 30], [72, 30]].map(([x, y]) => f(E(x, y, 11, 8), '#9fd36a')),
    ...[[40, 38], [60, 38]].flatMap(([x, y]) => [f(C(x, y, 6), '#e8453c'), f(C(x, y, 2), '#1f1612')]), f('M50 40 L44 54 L56 54Z', '#f3d6a8'),
    f('M38 60 Q50 68 62 60 L60 64 Q50 70 40 64Z', '#f28c3a'), ...[[40, 70], [46, 72], [52, 72], [58, 70]].map(([x, y]) => f(C(x, y, 2), '#5aa244')), f(E(50, 76, 9, 4), '#d9b06a')],
  // 24 · materials: a robot made of tin cans and bottle caps
  robot: [bg('#bfe0ec'), f(R(36, 10, 28, 20), '#c9cfd6'), ...[13, 17, 21, 25].map(y => s(L(36, y, 64, y), '#9aa6b0', 0.6)), ...[44, 56].flatMap(x => [f(C(x, 18, 4.5), '#e8453c'), f(C(x, 18, 2), '#1f1612')]),
    f(R(30, 34, 40, 30), '#b8c2cc'), ...[40, 46, 52, 58].map(y => s(L(30, y, 70, y), '#9aa6b0', 0.6)), f(C(50, 48, 5), '#ffd23f'), s('M50 10 Q44 2 40 4', '#3b3640', 1), s('M50 10 Q56 0 62 4', '#e8453c', 1),
    f(R(22, 38, 8, 6), '#d9a04a'), f(R(70, 38, 8, 6), '#d9a04a'), f(R(36, 64, 8, 12), '#c9cfd6'), f(R(56, 64, 8, 12), '#c9cfd6')],
  // 25 · a child's drawing: a patterned cat
  cat: [bg('#ffd23f'), f(R(0, 0, 100, 26), '#3f8fd6'), ...[[14, 8], [34, 16], [80, 10]].map(([x, y]) => f(P(x, y - 4, x + 1.2, y - 1, x + 4, y, x + 1.2, y + 1, x, y + 4, x - 1.2, y + 1, x - 4, y, x - 1.2, y - 1), '#fff')),
    f(E(50, 58, 20, 22), '#4fbf5a'), f(E(50, 30, 16, 14), '#7cc35a'), f(P(36, 24, 38, 10, 46, 20), '#7cc35a'), f(P(64, 24, 62, 10, 54, 20), '#7cc35a'),
    ...eye(44, 30, 4), ...eye(56, 30, 4), f(P(48, 36, 52, 36, 50, 39), '#e8537a'), ...[[42, 52], [56, 60], [46, 68], [58, 72]].map(([x, y], i) => f(C(x, y, 3), ['#e8453c', '#8a63c9', '#fff', '#f28c3a'][i])),
    ...[0, 1, 2].map(i => s(L(36, 44 + i * 4, 64, 44 + i * 4), '#1f1612', 0.8))],
  // the contemporary Syrian artists: a palette and a brush
  palette: [bg('#f6efe0'), f('M14 44 Q14 10 50 10 Q90 10 88 40 Q86 56 70 52 Q60 50 60 60 Q60 74 42 72 Q14 70 14 44Z', '#d9a86a'), f(E(64, 58, 6, 5), '#f6efe0'),
    ...[[28, 28, '#e8453c'], [44, 22, '#ffd23f'], [62, 24, '#3f8fd6'], [76, 34, '#4fbf5a'], [28, 50, '#8a63c9'], [42, 60, '#f28c3a']].map(([x, y, c]) => f(C(x, y, 6), c)),
    f(P(52, 70, 92, 30, 96, 34, 56, 74), '#8a5a34'), f(P(88, 26, 98, 22, 96, 34), '#3b3640')],
  // styles, for the gallery of Syrian artists
  realist: [bg('#5a6a72'), f(E(50, 36, 15, 18), '#e8b48a'), f('M34 34 Q34 12 50 12 Q66 12 66 34 Q62 20 50 20 Q38 20 34 34Z', '#3b2414'), f(P(26, 80, 34, 56, 66, 56, 74, 80), '#1f2a3a'),
    f(E(44, 34, 2.4, 1.4), '#3b2414'), f(E(56, 34, 2.4, 1.4), '#3b2414'), f(E(50, 46, 4, 1.6), '#b05a4a'), f(E(42, 30, 10, 14), '#fff', 0.12)],
  horse: [bg('#e9e0cc'), f('M20 40 Q24 30 40 32 L64 30 L76 14 L86 18 L82 30 Q84 44 76 48 L74 70 L68 70 L68 50 L44 50 L40 70 L34 70 L34 50 Q22 50 20 40Z', '#7a4a2a'), f('M76 14 Q70 10 66 22 L72 26Z', '#3b2414'), f(C(80, 20, 1.4), '#fff')],
  abstract: [bg('#f4f1ea'), f(R(8, 8, 40, 30), '#e8453c'), f(C(68, 30, 18), '#3f8fd6'), f(P(20, 76, 50, 40, 80, 76), '#ffd23f'), s(L(0, 50, 100, 46), '#1f1612', 2.5), f(R(70, 56, 22, 16), '#1f1612')],
  expression: [bg('#e8453c'), f('M30 70 Q24 30 50 18 Q78 26 72 70Z', '#ffd23f'), f(E(42, 40, 5, 7), '#1f1612'), f(E(60, 38, 4, 8), '#1f1612'), s('M40 58 Q50 50 62 60', '#1f1612', 3), s(L(10, 10, 30, 30), '#3f8fd6', 4), s(L(90, 8, 74, 26), '#3f8fd6', 4)],
  nature: [bg('#cfe8ff'), f(R(0, 50, 100, 30), '#9a8a4a'), ...[[20, 36, 16, '#e0902a'], [52, 30, 20, '#f2b03a'], [82, 38, 14, '#c9762a']].flatMap(([x, y, r, c]) => [f(R(x - 2, y, 4, 24), '#6b4a2a'), f(C(x, y, r), c)]), f(E(30, 70, 12, 5), '#c9bfae'), f(E(70, 66, 9, 4), '#c9bfae')],
  folk: [bg('#bfe0ff'), ...[[4, 30, 26, 44, '#efe2c4'], [32, 20, 30, 54, '#e9d6b4'], [64, 34, 32, 40, '#f3e6c8']].map(([x, y, w, h, c]) => f(R(x, y, w, h), c)), ...[[12, 40], [42, 30], [52, 30], [74, 44], [86, 44]].map(([x, y]) => f(R(x, y, 6, 8), '#7a5130')),
    f(R(0, 74, 100, 6), '#c9b48a'), ...[[20, 62, '#e8453c'], [50, 64, '#3f8fd6'], [80, 62, '#f2c14e']].flatMap(([x, y, c]) => [f(R(x - 3, y, 6, 12), c), f(C(x, y - 3, 3), '#e8b48a')])],
  giraffe: [bg('#ff7ab0'), f('M40 80 L44 30 Q46 10 60 12 L70 8 L72 16 L64 20 Q58 24 58 34 L62 80Z', '#ffd23f'), ...[[48, 40, '#3f8fd6'], [54, 52, '#e8453c'], [48, 64, '#4fbf5a'], [56, 72, '#8a63c9'], [52, 26, '#f28c3a']].map(([x, y, c]) => f(R(x - 4, y - 4, 8, 8), c)),
    s('M40 80 L44 30 Q46 10 60 12 L70 8 L72 16 L64 20 Q58 24 58 34 L62 80', '#1f1612', 1.8), f(C(64, 13, 1.4), '#1f1612')],
  africans: [bg('#f28c3a'), ...[34, 28, 22, 16].map((r, i) => f(C(50, 30, r), ['#ffd23f', '#e8453c', '#ffd23f', '#e8453c'][i])), f(R(0, 56, 100, 24), '#4fbf5a'),
    ...[[38, '#5a3a22'], [60, '#3b2414']].flatMap(([x, c]) => [f(R(x - 5, 34, 10, 30), c), f(C(x, 28, 5), c), f(R(x - 5, 46, 10, 12), '#ffd23f'), s(L(x + 8, 20, x + 8, 76), '#3b2414', 1.4)])],
  city: [bg('#ffd23f'), ...[[4, 20, 14], [20, 10, 12], [34, 24, 10], [46, 6, 14], [62, 18, 12], [76, 8, 10], [88, 22, 12]].map(([x, y, w], i) => f(R(x, y, w, 50), ['#3f8fd6', '#2fb3a8', '#e8537a', '#3f8fd6', '#8a63c9', '#2fb3a8', '#3f8fd6'][i])),
    ...[[8, 30], [24, 20], [50, 16], [66, 28], [80, 18]].map(([x, y]) => f(R(x, y, 4, 4), '#fff')), f(P(6, 58, 70, 58, 62, 68, 14, 68), '#1f1612'), ...[14, 22, 30, 38, 46].map(x => f(R(x, 50, 4, 8), '#e8453c')),
    ...[[70, 70], [84, 66], [94, 74], [76, 78]].map(([x, y]) => f(C(x, y, 6), '#ec79a8'))],
};

// The painting of each lesson of the book (in the gallery, in order).
export const LESSON_ART = ['circles', 'triangles', 'fatna', 'street', 'braque', 'palmyra', 'madoun', 'mask', 'fields', 'noria', 'cardboard', 'bubbles', 'mandala', 'courtyard', 'butterfly', 'clay', 'tubes', 'zigzag', 'turkey', 'collagefish', 'chair', 'veggie', 'robot', 'cat', 'palette'];

const shapeSVG = sh => `<path d="${sh.d}" fill="${sh.f || 'none'}"${sh.s ? ` stroke="${sh.s}" stroke-width="${sh.w}" stroke-linecap="round" stroke-linejoin="round"` : ''}${sh.o != null ? ` opacity="${sh.o}"` : ''}/>`;
export function artSVG(key, cls = '') {
  const shapes = ART[key] || [];
  return `<svg class="st-art ${cls}" viewBox="0 0 100 80" role="img" aria-hidden="true">${shapes.map(shapeSVG).join('')}</svg>`;
}
// The same picture, inside another SVG (x, y, width, height in its units).
export function artG(key, x, y, w, h) {
  const shapes = ART[key] || [];
  return `<g transform="translate(${x} ${y}) scale(${w / 100} ${h / 80})">${shapes.map(shapeSVG).join('')}</g>`;
}
const paths = new Map();
const path2d = d => { let p = paths.get(d); if (!p) { p = new Path2D(d); paths.set(d, p); } return p; };
export function drawArt(ctx, key, x, y, w, h) {
  const shapes = ART[key] || [];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / 100, h / 80);
  ctx.beginPath(); ctx.rect(0, 0, 100, 80); ctx.clip();
  for (const sh of shapes) {
    ctx.globalAlpha = sh.o ?? 1;
    const p = path2d(sh.d);
    if (sh.f) { ctx.fillStyle = sh.f; ctx.fill(p); }
    if (sh.s) { ctx.strokeStyle = sh.s; ctx.lineWidth = sh.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p); }
  }
  ctx.restore();
}
