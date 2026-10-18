// The art island's pictures for lessons 9–16 of the book (see views.js).
// They show the idea the book teaches, never copies of the artists' works.

import { svg, spot, region, slot, stage, emo, lab, txt, INK } from './svg.js';

// ---------- small drawing helpers ----------
const r1 = v => Math.round(v * 10) / 10;
const C = (cx, cy, r) => `M${r1(cx - r)} ${r1(cy)}a${r} ${r} 0 1 0 ${r1(2 * r)} 0a${r} ${r} 0 1 0 ${r1(-2 * r)} 0Z`;
const E = (cx, cy, rx, ry) => `M${r1(cx - rx)} ${r1(cy)}a${rx} ${ry} 0 1 0 ${r1(2 * rx)} 0a${rx} ${ry} 0 1 0 ${r1(-2 * rx)} 0Z`;
const P = pts => `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}Z`;
const rad = a => (a * Math.PI) / 180;
// A star of n points (a lily, a flower): R outer radius, r inner.
const star = (cx, cy, R, r, n = 6, rot = -90) => P(Array.from({ length: 2 * n }, (_, i) => {
  const a = rad(rot + (i * 180) / n), k = i % 2 ? r : R;
  return [cx + Math.cos(a) * k, cy + Math.sin(a) * k];
}));
const path = (d, fill, more = '') => `<path d="${d}" fill="${fill}" ${more}/>`;
const line = (d, stroke, w = 2, more = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${more}/>`;

// ---------- Lesson 9 · Ursula Bahr's Syrian fields ----------
// Where things stand in the field (shared by the painting and the one to colour).
const OLIVES = [[30, 62, 1.35], [86, 58, 1.2], [234, 58, 1.2], [290, 63, 1.35]];
const SUNS = [[100, 96], [116, 91], [133, 97], [107, 110], [124, 112], [141, 106], [99, 124], [117, 128], [135, 122]];
const LILIES = [[230, 140, 12], [262, 154, 13], [298, 136, 12], [238, 172, 11], [290, 172, 12]];
const SKY = 'M12 0H308Q320 0 320 12V70H0V12Q0 0 12 0Z';
const ROAD = 'M128 200L196 200L171 70L163 70Z';
const LAVENDER = 'M198 84L318 80L318 110L206 115Z';
const oliveCrowns = OLIVES.map(([x, y, s]) => E(x, y - 2 * s, 13 * s, 8 * s)).join('');
const trunks = OLIVES.map(([x, y, s]) => `<rect x="${r1(x - 1.6 * s)}" y="${y}" width="${r1(3.2 * s)}" height="${r1(10 * s)}" fill="#6b4a2a"/>`).join('');
const sunHeads = SUNS.map(([x, y]) => C(x, y, 6.5)).join('');
const sunHearts = SUNS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#6b4a2a"/>`).join('');
const stems = line(SUNS.map(([x, y]) => `M${x} ${y + 6}V${y + 18}`).join(''), '#3f7a2a', 2);
const lilyStars = LILIES.map(([x, y, R]) => star(x, y, R, R * 0.36)).join('');
const lilyHearts = LILIES.map(([x, y, R]) => path(star(x, y, R * 0.45, R * 0.18), '#d9622a')).join('');
const lilyLeaves = line(LILIES.map(([x, y, R]) => `M${x} ${y + R * 0.4}Q${x - 5} ${y + R + 4} ${x - 12} ${y + R + 8}M${x} ${y + R * 0.4}Q${x + 4} ${y + R + 4} ${x + 10} ${y + R + 9}`).join(''), '#2f6a2a', 3);
const fieldRows = `${path('M0 140Q70 116 150 118L146 132Q70 132 0 160Z', '#7fae48')}${path('M0 182Q60 160 140 160L136 176Q60 178 0 200Z', '#7fae48')}`;
const farmers = `<g stroke="${INK}" stroke-width="1.4" stroke-linejoin="round">
  ${path('M33 104L47 104L52 150L28 150Z', '#f3efe4')}${path(C(40, 96, 7), '#e8b48a')}${path('M32 96Q32 86 40 86Q48 86 48 96L50 108L46 98Q40 92 34 98L30 108Z', '#3f6fae')}
  ${path('M62 118Q72 108 84 116L88 150L64 150Z', '#d9cfb6')}${path(C(62, 114, 6.5), '#c98f62')}${path('M55 112Q58 104 66 106L68 112Z', '#e8453c')}
  ${line('M66 128Q60 138 56 146', INK, 2)}</g>`;

// ---------- Lesson 10 · Zuhair Hadramout: a noria of Hama ----------
// A noria (wheel, spokes, paddles); it turns slowly when `spin`.
const noria = (cx, cy, R, spin = true) => {
  const spokes = Array.from({ length: 6 }, (_, i) => { const a = rad(i * 30); return `M${r1(cx + Math.cos(a) * R)} ${r1(cy + Math.sin(a) * R)}L${r1(cx - Math.cos(a) * R)} ${r1(cy - Math.sin(a) * R)}`; }).join('');
  const paddles = Array.from({ length: 20 }, (_, i) => { const a = rad(i * 18); return `M${r1(cx + Math.cos(a) * R)} ${r1(cy + Math.sin(a) * R)}L${r1(cx + Math.cos(a) * (R + R * 0.12))} ${r1(cy + Math.sin(a) * (R + R * 0.12))}`; }).join('');
  const w = Math.max(1.4, R / 18);
  const body = `${line(spokes, '#7a5130', w)}<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#5a3a22" stroke-width="${w * 1.8}"/><circle cx="${cx}" cy="${cy}" r="${r1(R * 0.8)}" fill="none" stroke="#7a5130" stroke-width="${w}"/>${line(paddles, '#5a3a22', w * 1.6)}<circle cx="${cx}" cy="${cy}" r="${r1(R * 0.1)}" fill="#3b2414"/>`;
  return spin ? `<g class="sv-wheel">${body}<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="-360 ${cx} ${cy}" dur="24s" repeatCount="indefinite"/></g>` : body;
};
const hamaCity = () => Array.from({ length: 14 }, (_, i) => {
  const x = r1(110 + i * 14.5), top = 30 + ((i * 5) % 4) * 6;
  return `<rect x="${x}" y="${top}" width="13" height="${84 - top}" fill="${['#f3e6c8', '#e9d6b0', '#f6edd8'][i % 3]}" stroke="#c9b48a" stroke-width=".8"/><rect x="${r1(x + 4)}" y="${top + 6}" width="4" height="5" fill="#8a7a5a"/>`;
}).join('') + `<path d="M268 84V22L275 10L282 22V84Z" fill="#efe2c4" stroke="#c9b48a"/><rect x="272" y="30" width="6" height="8" fill="#8a7a5a"/>`;
const ARCHES = [150, 182, 214, 246, 278].map(x => `M${x} 128V114Q${x + 9} 100 ${x + 18} 114V128Z`).join('');

// Two little paintings on a balance: (أ) every element on one side, so it
// tips over; (ب) the elements spread on both sides, so it stays level.
const mini = balanced => {
  const sky = `<rect width="136" height="92" fill="#cfe8ff"/><rect y="70" width="136" height="22" fill="#3f8fc0"/>`;
  const houses = (x, y) => `<path d="M${x} ${y + 34}V${y + 8}H${x + 14}V${y}H${x + 30}V${y + 34}Z" fill="#efdcae" stroke="${INK}" stroke-width="1"/><path d="M${x + 4} ${y + 34}V${y + 26}Q${x + 8} ${y + 20} ${x + 12} ${y + 26}V${y + 34}ZM${x + 18} ${y + 34}V${y + 26}Q${x + 22} ${y + 20} ${x + 26} ${y + 26}V${y + 34}Z" fill="#7a5a3a"/>`;
  const tree = (x, y) => `<rect x="${x - 2}" y="${y}" width="4" height="16" fill="#6b4a2a"/>${path(C(x, y - 2, 10), '#4f9a3a')}`;
  const flowers = xs => xs.map((x, i) => path(C(x, 84, 3.2), ['#e8537a', '#ffd23f', '#e8453c'][i % 3])).join('');
  return balanced
    ? `${sky}${noria(34, 50, 24, false)}${houses(78, 36)}${tree(120, 54)}${flowers([12, 24, 92, 104, 124])}`
    : `${sky}${noria(30, 50, 24, false)}${houses(8, 34)}${houses(36, 30)}${tree(64, 50)}${flowers([8, 18, 28, 40, 52])}`;
};
const frameOn = (x, kind, tilt) => `<g transform="translate(${x} 14) rotate(${tilt} 68 92)"><rect x="-5" y="-5" width="146" height="102" rx="4" fill="#c98a4a" stroke="${INK}" stroke-width="2"/><svg width="136" height="92" viewBox="0 0 136 92">${mini(kind)}</svg><rect width="136" height="92" fill="none" stroke="${INK}" stroke-width="1.5"/></g>
  <path d="M${x + 68} 112L${x + 82} 136H${x + 54}Z" fill="#9a958c" stroke="${INK}" stroke-width="2"/>`;

// The collage of lesson 10: the noria is there; the rest is to glue.
const HAMA_PIECES = {
  houses: { label: 'بيت بقناطر', d: 'M146 130V96H168Q178 84 188 96H214Q224 84 234 96H256V130Z', fill: '#efdcae',
    inner: `${path([150, 172, 194, 216, 238].map(x => `M${x} 130V116Q${x + 7} 106 ${x + 14} 116V130Z`).join(''), '#7a5a3a')}${path('M170 104h6v6h-6ZM218 104h6v6h-6Z', '#8a7a5a')}` },
  tower: { label: 'برج', d: 'M266 130V58L274 40L282 58V130Z', fill: '#e9d6b0',
    inner: `${path('M271 66h6v9h-6ZM271 88h6v9h-6Z', '#8a7a5a')}${line('M264 80H284', INK, 2)}` },
  tree: { label: 'شجرة', d: `${C(300, 92, 17)}M297 106H303V132H297Z`, fill: '#4f9a3a',
    inner: `${path('M297 106H303V132H297Z', '#6b4a2a')}${path(`${C(294, 86, 6)}${C(305, 94, 5)}`, '#7cc35a')}` },
  flowers: { label: 'أزهار', d: 'M178 198Q176 174 198 172Q204 160 220 166Q234 154 250 164Q266 156 280 166Q300 162 306 178Q314 188 310 198Z', fill: '#5aa244',
    inner: [[196, 182, '#e8537a'], [214, 174, '#ffd23f'], [232, 184, '#e8453c'], [250, 172, '#ec79a8'], [268, 186, '#ffd23f'], [286, 176, '#e8537a'], [298, 190, '#e8453c']].map(([x, y, c]) => path(star(x, y, 6, 2.6, 5), c)).join('') },
};
export const PIECES = {
  hamaCollage: {
    houses: { ...HAMA_PIECES.houses, box: [144, 82, 114, 50] },
    tower: { ...HAMA_PIECES.tower, box: [262, 38, 24, 94] },
    tree: { ...HAMA_PIECES.tree, box: [280, 72, 40, 62] },
    flowers: { ...HAMA_PIECES.flowers, box: [174, 152, 142, 48] },
  },
};
for (const p of Object.values(PIECES.hamaCollage)) p.art = `${path(p.d, p.fill)}${p.inner}`;

// ---------- Lesson 11 · cardboard effects ----------
// The grooves under the first layer of cardboard, as a fill pattern.
const ridges = id => `<pattern id="${id}" width="6" height="5" patternUnits="userSpaceOnUse"><rect width="6" height="5" fill="#a8743e"/><rect width="6" height="2.2" fill="#e3bf88"/></pattern>`;
const sheetLines = (x, y, w, h) => line(Array.from({ length: Math.floor(h / 5) }, (_, i) => `M${x} ${y + 3 + i * 5}H${x + w}`).join(''), '#c99a5e', 0.8, 'opacity=".5"');
// The flower of the book's steps (p. 36): a tulip, two leaves, a curl.
const TULIP = 'M138 58Q134 30 146 20L153 38L160 18L167 38L174 20Q186 30 182 58Q160 72 138 58Z';
const STEM = 'M155 182Q144 140 155 100Q162 76 157 64L164 64Q169 76 162 100Q152 140 165 182Z';
const LEAF_L = 'M155 146Q118 132 104 104Q140 104 158 132Z';
const LEAF_R = 'M161 120Q198 108 214 80Q178 80 160 106Z';
const CURL = 'M156 168Q122 178 112 158Q106 140 124 142Q134 146 126 154';
const FLOWER = `${TULIP}${STEM}${LEAF_L}${LEAF_R}`;
const pencil = d => line(d, '#6b6b6b', 1.6);
// A box cutter, for the craft's tool button.
export const CUTTER = '<svg viewBox="0 0 40 40" width="1em" height="1em" aria-hidden="true"><path d="M5 31L25 11L31 17L11 37Z" fill="#ffd23f" stroke="#3b2414" stroke-width="2.4" stroke-linejoin="round"/><path d="M25 11L35 3L37 5L31 17Z" fill="#c9cfd6" stroke="#3b2414" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 28L20 20" stroke="#3b2414" stroke-width="2"/></svg>';

// ---------- Lesson 12 · Haidar Yazigi: realism ----------
// A girl blowing soap bubbles (the idea of the book's painting, p. 38).
const HAIR = `M136 74Q134 42 160 42Q186 42 184 74Q178 56 160 54Q142 56 136 74Z${[0, 1, 2, 3].map(i => `${E(136, 90 + i * 14, 6.5, 8.5)}${E(184, 90 + i * 14, 6.5, 8.5)}`).join('')}`;
const DRESS = 'M128 138H192L204 200H116Z';
const GIRL_FACE = `${path('M152 96h16v16h-16Z', '#f3d2b3')}${path(E(160, 74, 22, 26), '#f3d2b3', `stroke="${INK}" stroke-width="1.4"`)}
  ${line('M146 72Q151 76 156 72M164 72Q169 76 174 72M145 64Q151 61 156 64M164 64Q169 61 175 64', INK, 1.6)}${line('M160 76L158 84L162 84', '#c98f62', 1.4)}
  ${path(C(160, 91, 3.6), '#c7373f')}${path(C(160, 91, 1.6), '#5a1a1a')}${path(`${C(147, 84, 4)}${C(173, 84, 4)}`, '#f2a7a0', 'opacity=".5"')}`;
const BLOUSE = `${path(`${E(122, 130, 18, 14)}${E(198, 130, 18, 14)}`, '#f4f6ff', `stroke="${INK}" stroke-width="1.4"`)}${path('M130 114Q160 124 190 114L192 140H128Z', '#f4f6ff', `stroke="${INK}" stroke-width="1.4"`)}`;
const DRESS_TRIM = `${line('M138 116L134 200M182 116L186 200', '#f3e6c8', 5)}${[148, 166, 184].map(y => path(`${C(135.5, y, 1.8)}${C(184.5, y, 1.8)}`, '#e8453c')).join('')}${line('M154 144L166 152L154 160L166 168L154 176', '#f3e6c8', 1.6)}`;
const ARM = `${line('M200 126Q206 110 194 98', '#f3d2b3', 9)}${path(C(192, 96, 6.5), '#f3d2b3', `stroke="${INK}" stroke-width="1.2"`)}${line('M188 94L204 80', '#9a8a6a', 2)}${line(C(210, 74, 8), '#9a8a6a', 2)}`;
const BUBBLES = [[234, 66, 13], [256, 34, 9], [266, 98, 11], [242, 130, 8], [292, 62, 7], [288, 136, 10], [220, 28, 6]]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" fill-opacity=".3" stroke="#ffffff" stroke-width="1.6"/>${line(`M${x - r * 0.6} ${y - r * 0.2}Q${x - r * 0.5} ${y - r * 0.6} ${x - r * 0.1} ${y - r * 0.65}`, '#ffffff', 1.4)}`).join('');

// ---------- Lesson 13 · Indian art: the mandala ----------
// A petal (or leaf) along the radius at angle a, from radius ra to rb.
const petal = (cx, cy, a, ra, rb, w) => {
  const ca = Math.cos(rad(a)), sa = Math.sin(rad(a)), pt = (r, o) => `${r1(cx + ca * r - sa * o)} ${r1(cy + sa * r + ca * o)}`;
  return `M${pt(ra, 0)}Q${pt((ra + rb) / 2, w)} ${pt(rb, 0)}Q${pt((ra + rb) / 2, -w)} ${pt(ra, 0)}Z`;
};
// A triangle pointing outwards at angle a.
const spike = (cx, cy, a, ra, rb, h) => {
  const at = (r, d) => `${r1(cx + Math.cos(rad(a + d)) * r)} ${r1(cy + Math.sin(rad(a + d)) * r)}`;
  return `M${at(ra, -h)}L${at(rb, 0)}L${at(ra, h)}Z`;
};
const ringOf = (n, f, start = 0) => Array.from({ length: n }, (_, i) => f(start + (i * 360) / n, i));
const dotsAt = (cx, cy, n, r, size, start = 0) => ringOf(n, a => C(cx + Math.cos(rad(a)) * r, cy + Math.sin(rad(a)) * r, size), start).join('');
const OUTLINE = `stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"`;
// The mandala's rings (centre 160, 100), from the outside in.
const M = {
  outer: ringOf(16, a => petal(160, 100, a, 70, 94, 9)),
  spikes: ringOf(16, a => spike(160, 100, a, 50, 68, 9), 11.25),
  leaves: ringOf(8, a => petal(160, 100, a, 26, 48, 9)),
  inner: ringOf(8, a => petal(160, 100, a, 12, 26, 5), 22.5),
};

// ---------- Lesson 14 · Ziad Zakari: folk costumes, the Damascene house ----------
// A woman in a folk costume, on a 60 × 130 canvas: veil, cap with coins,
// long dress, dark embroidered front with motifs, a band at the hem.
const FOLK = {
  veil: 'M14 18Q30 0 46 18L54 70Q30 64 6 70Z',
  cap: 'M20 15Q20 4 30 4Q40 4 40 15Z',
  dress: 'M17 40L43 40L56 84L49 86L44 62L54 128L6 128L16 62L11 86L4 84Z',
  panel: 'M22 40L38 40L42 128L18 128Z',
  motifs: [52, 70, 88, 106].map(y => `M30 ${y - 6}L36 ${y}L30 ${y + 6}L24 ${y}Z`).join(''),
  hem: 'M7 116L53 116L54 128L6 128Z',
};
const FOLK_COLORS = { cap: '#e8453c', dress: '#e8453c', panel: '#1f1612', motifs: '#ffd23f', hem: '#34b04a' };
const folkFace = `${path(E(30, 22, 8.5, 10.5), '#f3d2b3', `stroke="${INK}" stroke-width="1"`)}${path(`${C(26.5, 21, 1.3)}${C(33.5, 21, 1.3)}`, INK)}${line('M27 27Q30 29 33 27', '#c7373f', 1.2)}${path(`${C(7.5, 87, 3.4)}${C(52.5, 87, 3.4)}`, '#f3d2b3')}`;
const coins = path([22, 26, 30, 34, 38].map(x => C(x, 15, 1.7)).join(''), '#ffd23f', `stroke="${INK}" stroke-width=".5"`);
// part: (name, d) → the drawn part (a colour, a region, or a spot's piece).
const folkWoman = part => `${path(FOLK.veil, '#fbfbf6', `stroke="${INK}" stroke-width="1.2"`)}${part('dress', FOLK.dress)}${part('panel', FOLK.panel)}${part('hem', FOLK.hem)}${part('motifs', FOLK.motifs)}${folkFace}${part('cap', FOLK.cap)}${coins}`;
const filled = (name, d) => path(d, FOLK_COLORS[name], `stroke="${INK}" stroke-width="1"`);
const ablaq = (y0, y1) => Array.from({ length: Math.ceil((y1 - y0) / 8) }, (_, i) => `<rect y="${y0 + i * 8}" width="320" height="8" fill="${i % 2 ? '#3b3640' : '#f3e6c8'}"/>`).join('');

// ---------- Lesson 15 · origami: the paper butterfly ----------
// A small origami butterfly centred on (x, y).
const bfly = (x, y, s = 1, c = '#9a7fe0') => `<g transform="translate(${x} ${y}) scale(${s})">${path('M0 0L-20 -14L-16 4ZM0 0L20 -14L16 4Z', c, `stroke="${INK}" stroke-width="1" stroke-linejoin="round"`)}${path('M0 0L-16 4L-10 14ZM0 0L16 4L10 14Z', c, `stroke="${INK}" stroke-width="1" stroke-linejoin="round" opacity=".8"`)}<rect x="-1.6" y="-7" width="3.2" height="18" rx="1.6" fill="#4a2f80"/></g>`;
// The folds of the butterfly (p. 49), on a 200 × 200 sheet: one right fold
// line per stage; the last stage, without lines, is the finished butterfly.
const PAPER = `fill="#c9b5f5" stroke="#6a4ab0" stroke-width="2" stroke-linejoin="round"`;
const crease = d => line(d, '#8f78d6', 1.2, 'stroke-dasharray="4 3"');
const SQUARE = `<path d="M20 20H180V180H20Z" ${PAPER}/>`;
const TRIANGLE = `<path d="M10 140L190 140L100 50Z" ${PAPER}/>${crease('M100 50V140M100 50L55 140M100 50L145 140')}`;
export const STAGES = {
  butterfly: [
    { sheet: SQUARE, say: 'اطوِ المربّع نصفين، ثمّ افتحه',
      lines: [{ d: 'M100 20V180', ok: true }, { d: 'M58 20V180' }, { d: 'M20 160L160 20' }] },
    { sheet: `${SQUARE}${crease('M100 20V180M20 100H180')}`, say: 'نصفين في الاتّجاهين ✔️ والآن اطوِه قطريّاً',
      lines: [{ d: 'M20 20L180 180', ok: true }, { d: 'M20 100L100 20' }, { d: 'M20 140H180' }] },
    { sheet: `${SQUARE}${crease('M100 20V180M20 100H180M20 20L180 180M180 20L20 180')}`, say: 'والقطر الآخر ✔️ اجمعه مثلّثاً إلى الأسفل',
      lines: [{ d: 'M20 100H180', ok: true }, { d: 'M20 56H180' }, { d: 'M146 20V180' }] },
    { sheet: TRIANGLE, say: 'ارفع زاويتي المثلّث السفليّتين إلى رأسه',
      lines: [{ d: 'M55 95L100 140L145 95', ok: true }, { d: 'M34 116H166' }, { d: 'M64 68L126 140' }] },
    { sheet: `${TRIANGLE}<path d="M100 50L145 95L100 140L55 95Z" fill="#b39ce8" stroke="#6a4ab0" stroke-width="1.6" stroke-linejoin="round"/>${crease('M100 50V140')}`, say: 'اقلبه، واطوِ رأسه إلى ما تحت الحافّة',
      lines: [{ d: 'M46 104H154', ok: true }, { d: 'M68 66L160 134' }, { d: 'M18 132H182' }] },
    { sheet: `<path d="M46 104L154 104L190 140L10 140Z" ${PAPER}/><path d="M46 104L154 104L100 158Z" fill="#b39ce8" stroke="#6a4ab0" stroke-width="1.6" stroke-linejoin="round"/>`, say: 'اطوِ الفراشة نصفين، ثمّ افتحها قليلاً',
      lines: [{ d: 'M100 96V166', ok: true }, { d: 'M26 122H174' }, { d: 'M54 104L140 158' }] },
    { sheet: `<path d="M100 112L14 52L36 124ZM100 112L186 52L164 124Z" ${PAPER}/><path d="M100 116L36 124L58 172ZM100 116L164 124L142 172Z" fill="#b39ce8" stroke="#6a4ab0" stroke-width="2" stroke-linejoin="round"/>
      <rect x="94" y="88" width="12" height="84" rx="6" fill="#6a4ab0"/>${line('M97 90Q88 70 78 64M103 90Q112 70 122 64', '#6a4ab0', 2.4)}`,
      say: 'ها هي فراشتك! 🦋 زيّن بها الصفّ' },
  ],
};

// ---------- Lesson 16 · effects on surfaces ----------
// Sunken: a darker hollow, shadowed at the top left. Raised: a lighter
// shape with its shadow at the bottom right.
const hollow = d => `${path(d, '#9a8462')}<g transform="translate(1.4 1.8)">${path(d, '#c4ae88')}</g>`;
const bump = (d, c = '#efe2c8') => `<g transform="translate(1.6 2)">${path(d, '#8a7450', 'opacity=".55"')}</g>${path(d, c)}`;
const LEAF = 'M150 84Q140 56 160 36Q180 56 170 84Q160 92 150 84Z';
const SPIRAL = 'M258 56m-14 0a14 14 0 1 0 28 0a10 10 0 1 0 -20 0a6 6 0 1 0 12 0';

export const VIEWS = {
  // ---------- Lesson 9 ----------
  // A field of Syria as Ursula Bahr painted it: olive trees, sunflowers,
  // orange lilies, purple flowers and two farmers (the human element).
  ursula: {
    html: () => svg('ursula', `<rect width="320" height="200" rx="12" fill="#6a9a3a"/>
      ${path(SKY, '#9fb7c9')}${path(`${E(70, 20, 46, 11)}${E(160, 12, 40, 9)}${E(256, 22, 56, 12)}`, '#c7d3dc')}
      ${path('M0 66Q60 54 130 62T260 58T320 62V76H0Z', '#8aa07a')}${fieldRows}${path(ROAD, '#c98a4a')}
      ${spot('olives', `${trunks}${path(oliveCrowns, '#8aa25a')}${path(OLIVES.map(([x, y, s]) => E(x - 4 * s, y - 5 * s, 6 * s, 3.5 * s)).join(''), '#a9bf74')}${lab(160, 42)}`, [12, 44, 296, 32])}
      ${spot('lavender', `${path(LAVENDER, '#9a7fd0')}${line('M210 92H312M212 100H314M214 108H316', '#c4b0f0', 3, 'stroke-dasharray="2 5"')}${lab(258, 102)}`, [196, 80, 122, 36])}
      ${spot('suns', `${stems}${path(sunHeads, '#ffd23f')}${sunHearts}${lab(120, 148)}`, [90, 84, 60, 54])}
      ${spot('farmers', `${farmers}${lab(56, 166)}`, [18, 80, 76, 76])}
      ${spot('lilies', `${lilyLeaves}${path(lilyStars, '#f28c3a')}${lilyHearts}${lab(262, 124)}`, [212, 126, 106, 70])}`),
  },

  // «أحاول»: the same field to colour, with the farmers already in it.
  ursulaField: {
    html: () => svg('ursulaField', `<rect width="320" height="200" rx="12" fill="#6a9a3a"/>
      ${region('sky', SKY)}${path('M0 70H320V76H0Z', '#8aa07a')}${fieldRows}
      ${region('road', ROAD)}${trunks}${region('olives', oliveCrowns)}${region('lavender', LAVENDER)}
      ${stems}${region('suns', sunHeads)}${sunHearts}${lilyLeaves}${region('lilies', lilyStars)}${farmers}`),
  },

  // ---------- Lesson 10 ----------
  // Zuhair Hadramout's Hama: a noria on the Orontes, old houses with arches,
  // the city on its hill and flowers in front.
  hama: {
    html: () => svg('hama', `<rect width="320" height="200" rx="12" fill="#cfe8ff"/>
      ${path('M0 128H320V170H0Z', '#3f8fc0')}${line('M146 140H200M222 150H300M150 160H230', '#7fb8e0', 3)}
      ${path('M12 200Q0 200 0 188V166Q80 160 160 168T320 164V188Q320 200 308 200Z', '#6aa84a')}
      ${spot('city', `${hamaCity()}${lab(196, 26)}`, [108, 10, 204, 76])}
      ${spot('arches', `${path('M140 128V94H306V128Z', '#efdcae', `stroke="${INK}" stroke-width="1.5"`)}${path(`${E(176, 94, 12, 8)}${E(250, 94, 14, 9)}`, '#e9d6b0', `stroke="${INK}" stroke-width="1.2"`)}${path(ARCHES, '#7a5a3a')}${lab(222, 110)}`, [138, 84, 170, 46])}
      ${spot('river', `${path('M138 132H312V166H138Z', '#3f8fc0', 'opacity="0"')}${lab(226, 152)}`, [138, 132, 174, 34])}
      ${spot('noria', `${path('M70 110L86 110L94 170L62 170Z', '#d9c79e', `stroke="${INK}" stroke-width="1.2"`)}${noria(78, 108, 52)}${lab(78, 112)}`, [18, 50, 120, 118])}
      ${spot('flowers', `${[[14, 180, '#e8537a'], [30, 188, '#ec79a8'], [46, 178, '#e8453c'], [64, 190, '#ffd23f'], [110, 184, '#e8537a'], [190, 188, '#f28c3a'], [250, 182, '#e8537a'], [288, 188, '#ec79a8'], [304, 176, '#ffd23f']].map(([x, y, c]) => path(star(x, y, 6.5, 2.8, 5), c)).join('')}${lab(160, 194)}`, [8, 170, 304, 28])}`),
  },

  // «هل يوجد في اللوحة توازن بصريّ؟»: (ب) on the left, (أ) on the right.
  hamaBalance: {
    html: () => svg('hamaBalance', `<rect width="320" height="170" rx="12" fill="#fff8ec"/>
      ${frameOn(12, true, 0)}${frameOn(172, false, -8)}
      ${txt('اللوحة (ب)', 80, 158)}${txt('اللوحة (أ)', 240, 158)}`, '0 0 320 170'),
  },

  // «أحاول»: a painting from Hadramout's world, to balance with the pieces.
  hamaCollage: {
    html: () => svg('hamaCollage', `<rect width="320" height="200" rx="12" fill="#cfe8ff"/>
      ${path('M0 70Q80 56 160 64T320 60V130H0Z', '#efe2c4')}${path('M0 128H320V166H0Z', '#3f8fc0')}${line('M140 140H200M220 152H300', '#7fb8e0', 3)}
      ${path('M12 200Q0 200 0 188V164H320V188Q320 200 308 200Z', '#7fb45a')}
      ${path('M62 112L78 112L86 168L54 168Z', '#d9c79e', `stroke="${INK}" stroke-width="1.2"`)}${noria(70, 110, 50)}
      ${Object.entries(HAMA_PIECES).map(([id, p]) => slot(id, p.d, p.fill, p.inner)).join('')}`),
  },

  // ---------- Lesson 11 ----------
  // An open box, a piece of cardboard with its first layer half peeled,
  // and three samples of the effects (p. 35).
  carton: {
    html: () => svg('carton', `<defs>${ridges('cc-ridges-a')}</defs><rect width="320" height="200" rx="12" fill="#f6efe2"/>
      ${spot('box', `${path('M14 92H86V176H14Z', '#c9955b', `stroke="${INK}" stroke-width="2"`)}${path('M86 92L112 76V158L86 176Z', '#a8743e', `stroke="${INK}" stroke-width="2"`)}
        ${path('M14 92L40 76H112L86 92Z', '#6b4426', `stroke="${INK}" stroke-width="2"`)}${path('M14 92L4 66L32 60L40 76Z', '#d9a86a', `stroke="${INK}" stroke-width="2"`)}${path('M86 92L104 62L124 66L112 76Z', '#d9a86a', `stroke="${INK}" stroke-width="2"`)}
        ${line('M30 120H70', '#8a5a2e', 3)}${lab(60, 194)}`, [2, 56, 124, 124])}
      ${spot('layer', `${path('M126 30H222V176H204V70H126Z', '#d9b07a', `stroke="${INK}" stroke-width="2"`)}${lab(174, 24)}`, [124, 18, 100, 52])}
      ${spot('waves', `${path('M126 70H204V176H126Z', 'url(#cc-ridges-a)', `stroke="${INK}" stroke-width="2"`)}${path('M126 70Q150 58 204 70L206 92Q176 80 134 96Z', '#e8c896', `stroke="${INK}" stroke-width="1.5"`)}${lab(166, 194)}`, [126, 98, 78, 80])}
      ${spot('samples', `${[22, 80, 138].map(y => `<rect x="238" y="${y}" width="72" height="50" rx="4" fill="#d9b07a" stroke="${INK}" stroke-width="2"/>`).join('')}
        ${path('M244 28H304V40H244ZM244 52H304V64H244Z', 'url(#cc-ridges-a)')}
        ${path('M246 126Q274 86 304 126L298 126Q274 96 252 126Z', 'url(#cc-ridges-a)')}${path(`${C(256, 160, 6)}${C(274, 150, 6)}${C(292, 164, 6)}${C(266, 176, 5)}`, 'url(#cc-ridges-a)')}${lab(274, 14)}`, [234, 18, 80, 174])}`),
  },

  // «أحاول»: the five steps of «تهشير الكرتون» on one piece of cardboard.
  // Stages: 1 the drawing, 2 wet, 3 cut with the cutter, 4 the first layer off.
  cartonCraft: {
    html: () => svg('cartonCraft', `<defs>${ridges('cc-ridges-b')}</defs><rect width="320" height="200" rx="12" fill="#f6efe2"/>
      <rect x="40" y="8" width="240" height="184" rx="6" fill="#d9b07a" stroke="${INK}" stroke-width="2"/>${sheetLines(42, 10, 236, 180)}
      ${stage(4, `${path(FLOWER, 'url(#cc-ridges-b)')}${line(CURL, '#8a5a2e', 6)}`)}
      ${stage(1, `${pencil(TULIP)}${pencil(STEM)}${pencil(LEAF_L)}${pencil(LEAF_R)}${pencil(CURL)}`)}
      ${stage(2, `<rect x="40" y="8" width="240" height="184" rx="6" fill="#7a5a3a" opacity=".22"/>${[[70, 40], [240, 60], [90, 160], [250, 150], [200, 30]].map(([x, y]) => path(`M${x} ${y - 7}Q${x + 5} ${y} ${x} ${y + 3}Q${x - 5} ${y} ${x} ${y - 7}Z`, '#7fc4e8')).join('')}`, 4)}
      ${stage(3, line(FLOWER, '#5a3a22', 2.2))}
      ${stage(4, `${line(FLOWER, '#5a3a22', 1.4)}${emo('✨', 240, 40, 22)}${emo('✨', 84, 170, 18)}`)}`),
  },

  // The finished work, for a question.
  cartonDone: {
    html: () => svg('cartonDone', `<defs>${ridges('cc-ridges-c')}</defs><rect width="320" height="200" rx="12" fill="#f6efe2"/>
      <rect x="40" y="8" width="240" height="184" rx="6" fill="#d9b07a" stroke="${INK}" stroke-width="2"/>${sheetLines(42, 10, 236, 180)}
      ${path(FLOWER, 'url(#cc-ridges-c)')}${line(CURL, '#8a5a2e', 6)}${line(FLOWER, '#5a3a22', 1.4)}`),
  },

  // ---------- Lesson 12 ----------
  // Realism: a girl blowing soap bubbles, drawn as we see her; in a corner,
  // a little easel (the style).
  yazigi: {
    html: () => svg('yazigi', `<rect width="320" height="200" rx="12" fill="#a9d4c8"/>${path(`${E(60, 60, 50, 40)}${E(70, 160, 60, 40)}`, '#c4e4da', 'opacity=".7"')}
      ${spot('dress', `${path(DRESS, '#2f8a6a', `stroke="${INK}" stroke-width="1.4"`)}${BLOUSE}${DRESS_TRIM}${lab(160, 194)}`, [102, 110, 116, 90])}
      ${spot('face', `${GIRL_FACE}${path(HAIR, '#6b3a1e', `stroke="${INK}" stroke-width="1.2"`)}${lab(160, 34)}`, [126, 38, 68, 72])}
      ${spot('bubbles', `${ARM}${BUBBLES}${lab(258, 166)}`, [186, 18, 118, 132])}
      ${spot('style', `${path('M18 20h62v44h-62Z', '#fffaf0', `stroke="${INK}" stroke-width="2"`)}${path('M22 24h54v36h-54Z', '#a9d4c8')}${path(E(49, 40, 8, 9), '#f3d2b3')}${path('M41 40Q41 30 49 30Q57 30 57 40Q54 34 49 34Q44 34 41 40Z', '#6b3a1e')}${path('M38 60Q40 50 49 50Q58 50 60 60Z', '#2f8a6a')}${line('M70 70L92 40', '#8a5a34', 4)}${path('M90 36l6 -6l3 3l-6 6Z', '#3b2414')}${lab(52, 86)}`, [12, 16, 90, 60])}`),
  },

  // «أحاول»: the same girl in a garden, to colour in real colours.
  yazigiPaint: {
    html: () => svg('yazigiPaint', `<rect width="320" height="200" rx="12" fill="#7cc35a"/>
      ${region('sky', 'M12 0H308Q320 0 320 12V150H0V12Q0 0 12 0Z')}${region('sun', C(290, 30, 16))}
      ${region('trunk', 'M44 92H58V170H44Z')}${region('leaves', `${C(51, 70, 30)}`)}
      ${region('dress', DRESS)}${BLOUSE}${DRESS_TRIM}${GIRL_FACE}${region('hair', HAIR)}${ARM}${BUBBLES.replace(/#ffffff/g, '#3f8fd6')}`),
  },

  // ---------- Lesson 13 ----------
  // A mandala: the circle that holds everything, geometric and plant
  // motifs, dense at the centre; and the pens, warm and cold.
  mandala: {
    html: () => svg('mandala', `<rect width="320" height="200" rx="12" fill="#f7efe2"/>${path(C(160, 100, 96), '#fffaf0', `stroke="${INK}" stroke-width="2"`)}
      ${spot('circle', `${M.outer.map((d, i) => path(d, i % 2 ? '#f28c1a' : '#e8453c', OUTLINE)).join('')}${line(C(160, 100, 70), INK, 1.6)}${lab(160, 12)}`, [64, 4, 192, 192])}
      ${spot('geo', `${M.spikes.map((d, i) => path(d, i % 2 ? '#8a4fc9' : '#2f7fd6', OUTLINE)).join('')}${path(dotsAt(160, 100, 16, 60, 2.6), '#ffd23f', OUTLINE)}${line(C(160, 100, 50), INK, 1.4)}${lab(160, 44)}`, [92, 32, 136, 136])}
      ${spot('plants', `${M.leaves.map(d => path(d, '#34b04a', OUTLINE)).join('')}${line(M.leaves.map((_, i) => { const a = rad(i * 45); return `M${r1(160 + Math.cos(a) * 28)} ${r1(100 + Math.sin(a) * 28)}L${r1(160 + Math.cos(a) * 46)} ${r1(100 + Math.sin(a) * 46)}`; }).join(''), '#1f6a34', 1)}${lab(160, 66)}`, [112, 52, 96, 96])}
      ${spot('center', `${M.inner.map(d => path(d, '#ffd23f', OUTLINE)).join('')}${path(C(160, 100, 11), '#e8453c', OUTLINE)}${path(dotsAt(160, 100, 6, 6, 1.6), '#fff')}${path(C(160, 100, 2.4), '#ffd23f')}${lab(160, 132)}`, [134, 74, 52, 52])}
      ${spot('pens', `${['#e8453c', '#f28c1a', '#2f7fd6', '#34b04a'].map((c, i) => `${path(`M${268 + i * 11} ${66 + (i % 2) * 8}h9v60h-9Z`, c, OUTLINE)}${path(`M${268 + i * 11} ${126 + (i % 2) * 8}h9l-4.5 11Z`, '#f3d6a8', OUTLINE)}`).join('')}${lab(288, 166)}`, [262, 60, 54, 92])}`),
  },

  // «أحاول»: a mandala to colour, warm and cold rings in turn.
  mandalaPaint: {
    html: () => svg('mandalaPaint', `<rect width="320" height="200" rx="12" fill="#f7efe2"/>${path(C(160, 100, 96), '#fffaf0', `stroke="${INK}" stroke-width="2"`)}
      ${region('ring5', M.outer.join(''))}${line(C(160, 100, 70), INK, 1.4)}${region('ring4', M.spikes.join(''))}${line(C(160, 100, 50), INK, 1.4)}
      ${region('ring3', M.leaves.join(''))}${region('ring2', M.inner.join(''))}${region('ring1', C(160, 100, 11))}`),
  },

  // ---------- Lesson 14 ----------
  // A Damascene courtyard (striped stone, arches, a fountain, pigeons, a
  // lemon tree), a woman in a folk costume, a stamp and the signature.
  zakari: {
    html: () => svg('zakari', `<rect width="320" height="200" rx="12" fill="#e9dcc0"/>
      ${spot('house', `<g>${ablaq(0, 130)}</g>${path([70, 112, 154, 196].map(x => `M${x} 130V96Q${x + 18} 70 ${x + 36} 96V130Z`).join(''), '#5a4a3a', `stroke="#f3e6c8" stroke-width="3"`)}
        ${path('M96 14h18v26h-18ZM196 14h18v26h-18Z', '#5a4a3a', `stroke="#f3e6c8" stroke-width="2"`)}${path('M0 130H320V188Q320 200 308 200H12Q0 200 0 188Z', '#e9dcc0')}${line('M0 150H320M0 172H320M60 130L40 200M140 130L136 200M220 130L232 200', '#d3c3a0', 1.2)}
        ${path(E(170, 166, 40, 11), '#d9c79e', `stroke="${INK}" stroke-width="1.4"`)}${path(E(170, 165, 33, 7), '#7fc4e8')}${line('M170 160Q166 142 170 130Q174 142 170 160', '#bfe8ff', 3)}
        <rect x="34" y="72" width="10" height="92" fill="#8a5a34"/>${path(`${C(39, 58, 30)}${C(20, 80, 16)}${C(58, 82, 15)}`, '#4fae45')}${path([[28, 50], [48, 60], [36, 78], [20, 76], [56, 80]].map(([x, y]) => C(x, y, 3.2)).join(''), '#ffd23f')}
        ${[[112, 184], [214, 182], [134, 194]].map(([x, y]) => `${path(E(x, y, 8, 5), '#9aa6b0', `stroke="${INK}" stroke-width=".8"`)}${path(C(x - 7, y - 4, 3.2), '#9aa6b0', `stroke="${INK}" stroke-width=".8"`)}`).join('')}${lab(150, 62)}`, [0, 0, 320, 200])}
      <g transform="translate(244 62) scale(.98)">
        ${spot('costume', `${folkWoman((n, d) => (n === 'panel' || n === 'motifs' ? '' : filled(n, d)))}${lab(-30, 30)}`, [0, 0, 60, 130])}
        ${spot('motifs', `${filled('panel', FOLK.panel)}${filled('hem', 'M18 116H42L42 128H18Z')}${filled('motifs', FOLK.motifs)}${lab(-18, 100)}`, [16, 38, 28, 92])}
      </g>
      ${spot('stamp', `${path('M262 8h48v52h-48Z', '#fff', `stroke="${INK}" stroke-width="1.4" stroke-dasharray="3 2"`)}${path('M267 13h38v42h-38Z', '#bfe0ff')}<g transform="translate(276 16) scale(.32)">${folkWoman(filled)}</g>${lab(286, 74)}`, [258, 4, 56, 60])}
      ${spot('artist', `${line('M18 190q6 -12 11 0t10 -2t10 -6q4 -6 8 4l12 -3', INK, 1.8)}${lab(44, 176)}`, [12, 178, 66, 20])}`),
  },

  // «أحاول»: colour the folk costume like the little painting by its side.
  zakariDress: {
    html: () => svg('zakariDress', `<rect width="320" height="200" rx="12" fill="#f6efe2"/>${path('M0 160H320V188Q320 200 308 200H12Q0 200 0 188Z', '#e9dcc0')}
      <rect x="22" y="26" width="92" height="150" rx="4" fill="#c98a4a" stroke="${INK}" stroke-width="2"/><rect x="28" y="32" width="80" height="138" fill="#f3e6c8"/>
      <g transform="translate(38 36) scale(1)">${folkWoman(filled)}</g>${txt('لوحة زكاري', 68, 18)}
      <g transform="translate(176 4) scale(1.48)">${folkWoman((n, d) => region(n, d, '#fffaf0', 'vector-effect="non-scaling-stroke"'))}</g>`),
  },

  // ---------- Lesson 15 ----------
  // A world art: a square sheet, a folded butterfly, a mobile of
  // butterflies on a metal wire, butterflies decorating the class door.
  origami: {
    html: () => svg('origami', `<rect width="320" height="200" rx="12" fill="#f4ecff"/>
      ${spot('world', `${emo('🌍', 40, 40, 40)}${lab(40, 80)}`, [14, 14, 54, 54])}
      ${spot('square', `<g transform="rotate(-8 50 148)"><path d="M18 116H82V180H18Z" fill="#c9b5f5" stroke="#6a4ab0" stroke-width="2"/>${crease('M50 116V180M18 148H82M18 116L82 180')}</g>${lab(50, 196)}`, [12, 104, 78, 84])}
      ${spot('mobile', `${line(E(160, 22, 52, 8), '#9aa6b0', 2.4)}${line('M160 4V14', '#9aa6b0', 2)}${line([116, 140, 160, 180, 204].map((x, i) => `M${x} ${26}V${46 + (i % 2) * 16}`).join(''), '#9aa6b0', 1)}
        ${[116, 140, 160, 180, 204].map((x, i) => bfly(x, 54 + (i % 2) * 16, 0.55, ['#9a7fe0', '#ffd23f', '#c9b5f5', '#e8537a', '#9a7fe0'][i])).join('')}${lab(160, 94)}`, [100, 2, 120, 84])}
      ${spot('butterfly', `${bfly(160, 150, 1.9, '#b39ce8')}${lab(160, 196)}`, [112, 108, 96, 76])}
      ${spot('wall', `<rect x="244" y="14" width="64" height="176" rx="4" fill="#fff" stroke="${INK}" stroke-width="2"/>${path(C(298, 104, 3.5), '#e0b860')}
        ${[[262, 40, '#6a4ab0'], [286, 56, '#8a63c9'], [266, 78, '#4a2f80'], [290, 138, '#8a63c9'], [264, 160, '#6a4ab0'], [282, 176, '#4a2f80']].map(([x, y, c]) => bfly(x, y, 0.6, c)).join('')}${lab(276, 106)}`, [240, 10, 72, 184])}`),
  },

  // ---------- Lesson 16 ----------
  // Sunken effects (finger presses, a leaf printed on a cup), raised effects
  // (a spiral and drops added on a plate), the ma'amoul mould, lace on clay.
  surfaces: {
    html: () => svg('surfaces', `<rect width="320" height="200" rx="12" fill="#efe6d6"/>
      ${spot('sunken', `<rect x="10" y="14" width="98" height="84" rx="14" fill="#d6c4a6" stroke="#a8946e" stroke-width="2"/>${[0, 1, 2].flatMap(r => [0, 1, 2, 3].map(c => hollow(E(26 + c * 22 + (r % 2) * 6, 34 + r * 24, 7, 9)))).join('')}${lab(59, 112)}`, [8, 10, 102, 92])}
      ${spot('leaf', `<path d="M124 22V92Q160 104 196 92V22Z" fill="#ece6da" stroke="#b9ab92" stroke-width="2"/>${path(E(160, 22, 36, 8), '#f6f2ea', 'stroke="#b9ab92" stroke-width="2"')}${hollow(LEAF)}${line('M160 88V44M160 70L152 62M160 60L168 52M160 78L168 70', '#9a8462', 1.2)}${lab(160, 116)}`, [118, 10, 84, 96])}
      ${spot('raised', `${path(E(258, 58, 54, 42), '#c9bca4')}${path(E(258, 56, 48, 36), '#dccfb8')}<g transform="translate(1.6 2)">${line(SPIRAL, '#8a7450', 4.4, 'opacity=".55"')}</g>${line(SPIRAL, '#f6ecd8', 4.4)}
        ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = rad(i * 45); return bump(C(258 + Math.cos(a) * 34, 56 + Math.sin(a) * 25, 3.4)); }).join('')}${lab(258, 112)}`, [204, 14, 110, 90])}
      ${spot('maamoul', `${path('M16 144L66 140L66 150L16 154Z', '#8a5a34', `stroke="${INK}" stroke-width="1.2"`)}${path(C(86, 145, 18), '#a8703f', `stroke="${INK}" stroke-width="1.4"`)}${path(star(86, 145, 12.5, 5.5, 8), '#7a4f2d')}${path(C(86, 145, 3.6), '#a8703f')}
        ${[[30, 176], [60, 178], [90, 176], [120, 174]].map(([x, y]) => `${path(C(x, y, 11), '#e8c27a', 'stroke="#b8862e" stroke-width="1.4"')}${line(star(x, y, 7.5, 3.2, 8), '#b8862e', 1)}`).join('')}${lab(74, 199)}`, [8, 124, 136, 74])}
      ${spot('lace', `${path('M156 168H310V188H156Z', '#fff', 'stroke="#c9bfae" stroke-width="1.2"')}${path([164, 182, 200, 218, 236, 254, 272, 290].map(x => C(x + 4, 178, 4)).join(''), '#efe6d6')}${[[178, 152], [218, 150], [258, 152], [294, 150]].map(([x, y]) => `${bump(C(x, y, 13), '#c9bfae')}${path(dotsAt(x, y, 6, 7, 1.6) + C(x, y, 2), '#9a8462')}`).join('')}${lab(234, 199)}`, [150, 126, 166, 74])}`),
  },
};
