// Made from views-3.ts by tools/build.ts. Edit that file, then run: npm run build
// The art island's pictures for lessons 17–25 of the book (see views.js).
import { svg, spot, region, slot, stage, emo, lab, txt, INK } from './svg.js';
import { artG } from './art.js';
// ---------- small drawing helpers ----------
const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const E = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const deg = (a) => (a * Math.PI) / 180;
const r1 = (v) => Math.round(v * 10) / 10;
// A tube seen from its end: a ring (rim, hollow, inner shadow), maybe a ball inside.
const tubeEnd = (x, y, r, { rim = '#7a5130', hollow = '#f1dfbf', shade = '#d9bd8e', ball } = {}) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${rim}"/><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r - 2.4)}" fill="${hollow}"/>` +
    `<circle cx="${r1(x + r * 0.16)}" cy="${r1(y + r * 0.16)}" r="${r1(r - 3.8)}" fill="${shade}"/>` +
    (ball ? `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r * 0.6)}" fill="${ball}"/><circle cx="${r1(x - r * 0.2)}" cy="${r1(y - r * 0.2)}" r="${r1(r * 0.16)}" fill="#fff" opacity=".6"/>` : '');
// A standing tube (a hollow cylinder).
const cyl = (x, y, w, h, body = '#c9955b') => {
    const rx = w / 2, ry = r1(w * 0.22);
    return `<path d="M${x} ${y}v${h}a${rx} ${ry} 0 0 0 ${w} 0v${-h}Z" fill="${body}" stroke="${INK}" stroke-width="1.6"/>` +
        `<ellipse cx="${x + rx}" cy="${y}" rx="${rx}" ry="${ry}" fill="#e8d4b0" stroke="${INK}" stroke-width="1.6"/><ellipse cx="${x + rx}" cy="${y}" rx="${r1(rx * 0.7)}" ry="${r1(ry * 0.6)}" fill="#6b4a2a"/>`;
};
// The end of a log: tree rings.
const logEnd = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e9c98f" stroke="#7a4f2d" stroke-width="3"/>` +
    `<circle cx="${x}" cy="${y}" r="${r1(r * 0.62)}" fill="none" stroke="#c99a5a" stroke-width="1"/><circle cx="${x}" cy="${y}" r="${r1(r * 0.3)}" fill="none" stroke="#c99a5a" stroke-width="1"/><circle cx="${x}" cy="${y}" r="1.4" fill="#7a4f2d"/>`;
const leaf = (x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 Q10 -14 0 -30 Q-10 -14 0 0Z" fill="#d9b07a" stroke="#7a4f2d" stroke-width="1.4"/><path d="M0 -2 V-27 M0 -10 L5 -15 M0 -16 L-5 -21 M0 -20 L4 -24" stroke="#7a4f2d" stroke-width="1" fill="none"/></g>`;
// A wreath of tube rings: 12 big rings on a circle, 12 small ones between
// them (outside and inside, in turn).
const wreathRings = (cx, cy, look = {}, balls = {}) => {
    let out = '';
    for (let i = 0; i < 12; i++) {
        const a = deg(i * 30 - 90), b = deg(i * 30 - 75), d = i % 2 ? 78 : 42;
        out += tubeEnd(cx + Math.cos(b) * d, cy + Math.sin(b) * d, i % 2 ? 7.5 : 6.5, look);
        out += tubeEnd(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, i % 3 === 1 ? 12 : 13.5, { ...look, ball: balls[i] });
    }
    return out;
};
const BALLS = { 1: '#2fb3a8', 4: '#d9a04a', 6: '#3b4a9a', 9: '#2fb3a8', 11: '#d9a04a' };
const CREAM = { rim: '#b9ab92', hollow: '#fbf6ec', shade: '#e9e0cf' };
// Line patterns in black and white, drawn in a 40 × 40 square.
const K = '#1f1612';
const zz = (y, h, step, x0 = -4, x1 = 44) => { let d = `M${x0} ${y + h}`; for (let x = x0 + step, k = 1; x <= x1 + step; x += step, k++)
    d += `L${x} ${k % 2 ? y - h : y + h}`; return d; };
export const LINES = {
    zig: [4, 14, 24, 34].map(y => `<path d="${zz(y, 4, 8)}" fill="none" stroke="${K}" stroke-width="3.2" stroke-linejoin="miter"/>`).join(''),
    wave: [5, 13, 21, 29, 37].map(y => `<path d="M0 ${y}Q5 ${y - 5} 10 ${y}T20 ${y}T30 ${y}T40 ${y}" fill="none" stroke="${K}" stroke-width="2.6"/>`).join(''),
    rings: [4, 9, 14, 19].map(r => `<circle cx="20" cy="20" r="${r}" fill="none" stroke="${K}" stroke-width="2.6"/>`).join('') + [[0, 0], [40, 0], [0, 40], [40, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${K}"/>`).join(''),
    checker: Array.from({ length: 25 }, (_, k) => ((k % 5) + Math.floor(k / 5)) % 2 ? '' : `<rect x="${(k % 5) * 8}" y="${Math.floor(k / 5) * 8}" width="8" height="8" fill="${K}"/>`).join(''),
    dots: [[8, 8, 5], [24, 6, 3], [34, 14, 4.5], [14, 22, 3.5], [28, 27, 6], [8, 34, 4], [20, 36, 2.5], [37, 36, 2.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K}"/>`).join(''),
    diag: Array.from({ length: 11 }, (_, k) => `<path d="M${k * 8} -2L${k * 8 - 42} 42" stroke="${K}" stroke-width="3"/>`).join(''),
};
// A white square with a pattern inside (clipped by the inner svg).
const sq = (x, y, s, body) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#fff"/><svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 40 40">${body}</svg><rect x="${x}" y="${y}" width="${s}" height="${s}" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
// Rows of wavy lines crossed by straight ones: the cells of a black and white work.
const waveY = (j, x) => (j === 0 ? 10 : j === 4 ? 190 : r1(10 + j * 45 + 10 * Math.sin(((x - 10) / 300) * Math.PI * 2 + j * 0.9)));
const waveCell = (i, j) => {
    const x0 = 10 + i * 75, n = 10, xs = Array.from({ length: n + 1 }, (_, k) => r1(x0 + (75 * k) / n));
    return `M${xs.map(x => `${x} ${waveY(j, x)}`).join('L')}L${[...xs].reverse().map(x => `${x} ${waveY(j + 1, x)}`).join('L')}Z`;
};
// Fills of line patterns (black on white, or the lines alone over a colour),
// for the fish of lesson 19. Their ids start with p3- (one picture at a time).
const pat = (id, w, h, body, bg = '#fff') => `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</pattern>`;
// A pattern tile: [width, height, its body].
const PAT_BODY = {
    st: [7, 7, `<rect width="3.2" height="7" fill="${K}"/>`],
    zz: [12, 9, `<path d="M0 7.5L6 1.5L12 7.5" fill="none" stroke="${K}" stroke-width="2.6"/>`],
    dt: [11, 11, `<circle cx="5.5" cy="5.5" r="3.2" fill="${K}"/>`],
    wv: [20, 9, `<path d="M0 4.5Q5 0 10 4.5T20 4.5" fill="none" stroke="${K}" stroke-width="2.4"/>`],
    dg: [8, 8, `<path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" stroke="${K}" stroke-width="2.6"/>`],
    rd: [12, 12, `<circle cx="6" cy="6" r="3" fill="#fff"/>`],
};
const PATS = `<defs>${Object.entries(PAT_BODY).map(([k, [w, h, b]]) => pat(`p3-${k}`, w, h, b, k === 'rd' ? '#e8453c' : '#fff') + pat(`p3-${k}L`, w, h, b, '')).join('')}</defs>`;
// A fish (head to the right) on 48 ≤ x ≤ 252, centred on y = 100: a band
// between two fractions of its height follows the shape of its body.
const fishH = (x) => 54 * Math.pow(Math.sin(Math.PI * (0.06 + (0.88 * (x - 48)) / 204)), 0.8);
const fishBand = (f0, f1, xa = 48, xb = 252) => {
    const xs = Array.from({ length: 25 }, (_, k) => xa + ((xb - xa) * k) / 24);
    const at = (x, f) => `${r1(x)} ${r1(100 - fishH(x) + 2 * fishH(x) * f)}`;
    return `M${xs.map(x => at(x, f0)).join('L')}L${[...xs].reverse().map(x => at(x, f1)).join('L')}Z`;
};
const FISH_F = [0, 0.22, 0.42, 0.58, 0.76, 1];
const fishFins = (tail = K) => `<path d="M110 54L126 18L196 22L182 51Z" fill="url(#p3-dg)" stroke="${INK}" stroke-width="2"/>
  <path d="M138 148L130 182L176 176L170 148Z" fill="${K}" stroke="${INK}" stroke-width="2"/>
  <path d="M52 100L12 54L24 100L12 146Z" fill="${tail}" stroke="${INK}" stroke-width="2"/><path d="M48 100L16 66M48 100L20 84M48 100L20 116M48 100L16 134" stroke="#fff" stroke-width="2"/>`;
const fishHead = () => `<path d="${fishBand(0, 1, 214, 252)}" fill="#fff" stroke="${INK}" stroke-width="2"/>
  <path d="M214 ${r1(100 - fishH(214))}Q226 100 214 ${r1(100 + fishH(214))}" fill="none" stroke="${K}" stroke-width="4"/>
  <circle cx="232" cy="94" r="7" fill="${K}"/><circle cx="232" cy="94" r="4.2" fill="#fff"/><circle cx="233" cy="94" r="2.2" fill="${K}"/>`;
// Collage (lesson 20): a fish of paper, newspaper and fabric on a sea of
// torn blue paper. The pieces' shapes are shared by the picture and the game.
const jit = (k, a) => r1(((Math.sin(k * 12.9898) * 43758.5453) % 1) * a);
const SEA = Array.from({ length: 40 }, (_, k) => {
    const x = (k % 8) * 42 - 8, y = Math.floor(k / 8) * 42 - 8;
    return `<path d="M${x + jit(k, 8)} ${y + jit(k + 1, 8)}L${x + 50 + jit(k + 2, 8)} ${y + jit(k + 3, 10)}L${x + 48 + jit(k + 4, 8)} ${y + 50 + jit(k + 5, 8)}L${x + jit(k + 6, 8)} ${y + 46 + jit(k + 7, 8)}Z" fill="${['#6fb3e8', '#2a6fb0', '#9fd3ff', '#3f8fd6', '#cfe8ff'][(k * 7) % 5]}"/>`;
}).join('');
// The scraps, clipped to the picture (an inner svg clips what overflows).
const SEA_BG = `<svg width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#3f8fd6"/>${SEA}</svg>`;
const COL_PATS = `<defs>${pat('p3-news', 24, 10, '<path d="M2 3h9M13 3h9M2 7h14M18 7h4" stroke="#7d7a72" stroke-width="1.3"/>', '#efeee8')}${pat('p3-cdot', 10, 10, '<circle cx="5" cy="5" r="2.2" fill="#fff"/>', '#d9453c')}${pat('p3-cstr', 10, 10, '<path d="M0 10L10 0M-3 3L3 -3M7 13L13 7" stroke="#fff" stroke-width="3"/>', '#2f7fd6')}</defs>`;
const FISH = {
    head: 'M120 46Q70 52 62 100Q70 148 120 154Q132 100 120 46Z',
    body: 'M120 46Q200 34 252 100Q200 166 120 154Q132 100 120 46Z',
    tail: 'M248 100L300 52Q288 100 300 148Z',
    top: 'M138 47L160 12L226 30L214 64Q180 44 138 47Z',
    bottom: 'M152 152L146 188L198 178L192 146Z',
    eye: C(92, 90, 11),
};
// A part's colour, and the details drawn over it.
const FISH_LOOK = {
    head: ['#ffd23f', '<path d="M100 60Q84 100 100 140" fill="none" stroke="#f28c1a" stroke-width="4"/>'],
    body: ['url(#p3-news)', '<path d="M150 70H210M146 90H226M150 110H230M156 130H206" stroke="#3b3640" stroke-width="2.4"/>'],
    tail: ['#f28c1a', '<path d="M262 100L292 66M262 100L292 134" stroke="#e8453c" stroke-width="3"/>'],
    top: ['url(#p3-cdot)', ''],
    bottom: ['url(#p3-cstr)', ''],
    eye: ['#fff', `<circle cx="94" cy="91" r="5.5" fill="${K}"/><circle cx="96" cy="89" r="1.6" fill="#fff"/>`],
};
const fishPart = (id) => `<path d="${FISH[id]}" fill="${FISH_LOOK[id][0]}" stroke="${INK}" stroke-width="2"/>${FISH_LOOK[id][1]}`;
// The carpenter's tools (lesson 21), each drawn in a 60 × 60 box.
const WOOD = '#c98a4a', DARKWOOD = '#8a5a34', STEEL = '#aab3bd';
const st = `stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"`;
const TOOL = {
    hammer: `<rect x="27" y="18" width="7" height="38" rx="2" fill="${WOOD}" ${st}/><path d="M8 8H40L52 3L49 13L52 23L40 18H8Z" fill="${STEEL}" ${st}/>`,
    nail: [16, 38].map(x => `<path d="M${x - 8} 10h16v4h-16z" fill="${STEEL}" ${st}/><path d="M${x - 2} 14h4v32l-2 7l-2 -7z" fill="${STEEL}" ${st}/>`).join(''),
    saw: `<path d="M20 14L58 25V33L20 45Z" fill="#d6dbe1" ${st}/><path d="${Array.from({ length: 10 }, (_, k) => `${k ? 'L' : 'M'}${20 + k * 3.8} ${r1(45 - k * 1.2)}l1.9 3`).join('')}" fill="none" stroke="${INK}" stroke-width="1.2"/>
    <path d="M2 18Q2 11 9 11H21V48H9Q2 48 2 41Z" fill="${WOOD}" ${st}/><ellipse cx="11" cy="29.5" rx="3.6" ry="9" fill="#f6e8cc" ${st}/>`,
    plane: `<path d="M24 12H32L29 32H21Z" fill="${STEEL}" ${st}/><path d="M36 31Q35 9 50 11Q57 20 49 31Z" fill="${DARKWOOD}" ${st}/><circle cx="12" cy="25" r="6" fill="${DARKWOOD}" ${st}/><path d="M3 30H57V44Q57 47 54 47H6Q3 47 3 44Z" fill="${WOOD}" ${st}/><path d="M8 38H52" stroke="${DARKWOOD}" stroke-width="1.2"/>`,
    drill: `<rect x="20" y="3" width="18" height="7" rx="3" fill="${WOOD}" ${st}/><rect x="27" y="10" width="5" height="36" fill="${STEEL}" ${st}/><circle cx="42" cy="27" r="10" fill="#e8453c" ${st}/><path d="M42 17V37M32 27H52" stroke="#fff" stroke-width="1.6"/>
    <path d="M42 27H54" stroke="${INK}" stroke-width="2.4"/><circle cx="55" cy="27" r="3.4" fill="${WOOD}" ${st}/><path d="M25 46H34L32 52H27Z" fill="#6b7280" ${st}/><path d="M29 52H31L30.5 59H29.5Z" fill="${INK}"/>`,
    glue: `<path d="M17 22H43V54Q43 58 39 58H21Q17 58 17 54Z" fill="#fff" ${st}/><path d="M24 22L30 6L36 22Z" fill="#f28c1a" ${st}/><rect x="17" y="32" width="26" height="14" fill="#ffd23f" ${st}/><circle cx="30" cy="4" r="2.4" fill="#fff" ${st}/>`,
    tape: `<path d="M28 44H58V52H28Z" fill="#ffd23f" ${st}/><path d="M34 44v4M40 44v3M46 44v4M52 44v3M58 42v12" stroke="${INK}" stroke-width="1.4"/><circle cx="22" cy="36" r="17" fill="#ffd23f" ${st}/><circle cx="22" cy="36" r="9" fill="#3b3640" ${st}/><circle cx="22" cy="36" r="3" fill="#ffd23f"/>`,
};
export const TOOL_ICONS = Object.fromEntries(Object.entries(TOOL).map(([k, v]) => [k, `<svg viewBox="0 0 60 60" width="36" height="36" aria-hidden="true">${v}</svg>`]));
const toolAt = (id, x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${TOOL[id]}</g>`;
// Art from fruit and vegetables (lesson 22): a face of vegetables on a plate.
const VEG = {
    hair: `${E(116, 52, 28, 20)}${E(160, 38, 32, 22)}${E(204, 52, 28, 20)}`,
    eyes: `${C(138, 94, 12)}${C(182, 94, 12)}`,
    nose: 'M160 100L149 134Q160 140 171 134Z',
    mouth: 'M132 146Q160 162 188 146Q186 158 160 168Q134 158 132 146Z',
    beard: [[132, 170], [144, 178], [156, 182], [168, 182], [180, 178], [190, 170]].map(([x, y]) => C(x, y, 6.5)).join(''),
};
const VEG_LOOK = {
    hair: ['#a6dc72', '<path d="M98 54Q116 46 136 52M128 38Q160 30 192 38M184 52Q204 46 222 54" fill="none" stroke="#5aa244" stroke-width="2"/>'],
    eyes: ['#e8453c', `<path d="${C(138, 94, 4.5)}${C(182, 94, 4.5)}" fill="${K}"/><path d="M133 88l3 2M177 88l3 2M142 100l2 -2M186 100l2 -2" stroke="#ffd0c8" stroke-width="1.6"/>`],
    nose: ['#f28c1a', '<path d="M153 112h7M151 122h9M156 104h6" stroke="#c9620e" stroke-width="1.6"/>'],
    mouth: ['#d62f2f', '<path d="M142 152Q160 160 178 152" fill="none" stroke="#ff8a7a" stroke-width="2"/>'],
    beard: ['#6cc04a', [[132, 170], [144, 178], [156, 182], [168, 182], [180, 178], [190, 170]].map(([x, y]) => `<circle cx="${x - 2}" cy="${y - 2}" r="1.8" fill="#c8f0a8"/>`).join('')],
};
const vegPart = (id) => `<path d="${VEG[id]}" fill="${VEG_LOOK[id][0]}" stroke="${INK}" stroke-width="1.8"/>${VEG_LOOK[id][1]}`;
const VEG_PLATE = `<circle cx="160" cy="104" r="94" fill="#fff" stroke="#d6d0c4" stroke-width="4"/><circle cx="160" cy="104" r="80" fill="none" stroke="#efeae0" stroke-width="2"/><ellipse cx="160" cy="110" rx="52" ry="66" fill="#8acb6a" stroke="${INK}" stroke-width="2"/>`;
// Scraps for a work of many materials (lesson 23), each in a 60 × 60 box.
const TIN = '#c9cfd6', CORK = '#d9b07a';
const can = (x, y, w, h) => `<path d="M${x} ${y}v${h}a${w / 2} ${r1(w * 0.18)} 0 0 0 ${w} 0v${-h}Z" fill="${TIN}" ${st}/>${Array.from({ length: Math.floor(h / 7) }, (_, k) => `<path d="M${x} ${y + 5 + k * 7}a${w / 2} ${r1(w * 0.18)} 0 0 0 ${w} 0" fill="none" stroke="#9aa6b0" stroke-width="1"/>`).join('')}<ellipse cx="${x + w / 2}" cy="${y}" rx="${w / 2}" ry="${r1(w * 0.18)}" fill="#e6eaee" ${st}/>`;
const corkAt = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${CORK}" ${st}/>${[[0.3, 0.3], [0.7, 0.5], [0.4, 0.75], [0.6, 0.2]].map(([a, b]) => `<circle cx="${r1(x + a * w)}" cy="${r1(y + b * h)}" r="1.3" fill="#a87a44"/>`).join('')}`;
const capAt = (x, y, r, c = '#e8453c') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-dasharray="2 1.2"/><circle cx="${x}" cy="${y}" r="${r1(r * 0.55)}" fill="#fff" ${st}/><circle cx="${x}" cy="${y}" r="${r1(r * 0.25)}" fill="${INK}"/>`;
const coil = (x, y, n, w = 7) => `<path d="M${x} ${y}${Array.from({ length: n }, () => `q${w / 2} -${w} ${w} 0q-${w / 2} ${w} -${w / 3} 0`).join('')}" fill="none" stroke="#7d8790" stroke-width="2"/>`;
const MAT = {
    can: can(14, 14, 32, 40),
    smallcan: can(20, 26, 22, 24),
    caps: `${capAt(18, 30, 11)}${capAt(42, 30, 11, '#3f8fd6')}`,
    wire: `${coil(4, 36, 7)}<path d="M4 36L2 50" stroke="#7d8790" stroke-width="2"/>`,
    cork: `${corkAt(10, 20, 16, 30)}${corkAt(34, 20, 16, 30)}`,
};
export const MAT_ICONS = Object.fromEntries(Object.entries(MAT).map(([k, v]) => [k, `<svg viewBox="0 0 60 60" width="36" height="36" aria-hidden="true">${v}</svg>`]));
export const VIEWS = {
    // ---------- Lesson 17 · artworks from cylinders (p. 53–54) ----------
    // The book's wreath of tube rings, logs with wooden leaves, cardboard rolls,
    // and a tube cut into rings.
    wreath: {
        html: () => svg('wreath', `<rect width="320" height="200" rx="12" fill="#dfe7ee"/><rect y="188" width="320" height="12" fill="#c9d3dc"/>
      ${spot('wreath', `${wreathRings(150, 100, {}, BALLS)}${lab(150, 104)}`, [70, 18, 160, 166])}
      ${spot('card', `${cyl(8, 96, 26, 88)}${cyl(36, 126, 22, 58, '#d4a46c')}${lab(34, 82)}`, [2, 86, 60, 106])}
      ${spot('shape', `${cyl(244, 26, 30, 58, '#e9dcc4')}<path d="M244 46a15 6.6 0 0 0 30 0M244 66a15 6.6 0 0 0 30 0" fill="none" stroke="#e8453c" stroke-width="2" stroke-dasharray="4 3"/>
        ${cyl(284, 44, 26, 8, '#e9dcc4')}${cyl(284, 70, 26, 8, '#e9dcc4')}${lab(276, 14)}`, [236, 18, 80, 76])}
      ${spot('logs', `${leaf(246, 152, 0.7, -50)}${leaf(312, 156, 0.65, 45)}${logEnd(256, 152, 14)}${logEnd(284, 148, 12)}${logEnd(306, 162, 9)}${logEnd(262, 178, 11)}${logEnd(290, 175, 13)}${lab(278, 124)}`, [236, 112, 82, 84])}`),
    },
    // «أحاول»: a group work made from tube rings, one stage at a time.
    wreathmake: {
        html: () => svg('wreathmake', `<rect width="320" height="200" rx="12" fill="#e6edf2"/><rect y="186" width="320" height="14" fill="#cfd8df"/>
      ${stage(0, [[60, 60, 200, 26], [90, 100, 160, 34], [70, 146, 180, 20]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#efe6d6" stroke="${INK}" stroke-width="1.6"/><ellipse cx="${x + w}" cy="${y + h / 2}" rx="${h / 4}" ry="${h / 2}" fill="#fbf6ec" stroke="${INK}" stroke-width="1.6"/><ellipse cx="${x + w}" cy="${y + h / 2}" rx="${h / 7}" ry="${h / 3}" fill="#b9ab92"/>`).join(''), 1)}
      ${stage(1, [[60, 50, 13], [110, 70, 7], [150, 40, 12], [200, 64, 13], [250, 44, 7], [80, 120, 7], [130, 140, 13], [180, 110, 12], [230, 140, 13], [270, 100, 7], [100, 170, 7], [210, 176, 6.5]].map(([x, y, r]) => tubeEnd(x, y, r, CREAM)).join(''), 2)}
      ${stage(2, wreathRings(160, 104, CREAM), 5)}
      ${stage(3, Array.from({ length: 12 }, (_, i) => { const a = deg(i * 30 - 75); return `<circle cx="${r1(160 + Math.cos(a) * 60)}" cy="${r1(104 + Math.sin(a) * 60)}" r="3" fill="#fff" stroke="#9fb6c6" stroke-width="1"/>`; }).join(''), 5)}
      ${stage(4, `<path d="M160 10 L148 40 M160 10 L172 40" stroke="#8a8f96" stroke-width="3" stroke-dasharray="5 2" fill="none"/><circle cx="160" cy="9" r="4" fill="#5a5f66"/>`)}
      ${stage(5, wreathRings(160, 104), 6)}
      ${stage(6, wreathRings(160, 104, {}, BALLS))}`),
    },
    // ---------- Lesson 18 · lines and visual crossings (p. 55–57) ----------
    // Squares of black and white line patterns, and the same lines on a
    // cushion and a patchwork armchair (daily life).
    linewall: {
        html: () => svg('linewall', `<rect width="320" height="200" rx="12" fill="#f3efe6"/>
      ${spot('zig', `${sq(8, 16, 62, LINES.zig)}${lab(39, 92)}`, [5, 13, 68, 68])}
      ${spot('wave', `${sq(76, 16, 62, LINES.wave)}${lab(107, 92)}`, [73, 13, 68, 68])}
      ${sq(144, 16, 62, LINES.dots)}${sq(8, 102, 62, LINES.diag)}
      ${spot('rings', `${sq(76, 102, 62, LINES.rings)}${lab(107, 180)}`, [73, 99, 68, 68])}
      ${spot('cross', `${sq(144, 102, 62, LINES.checker)}${lab(175, 180)}`, [141, 99, 68, 68])}
      ${spot('life', `<svg x="222" y="18" width="88" height="62" viewBox="0 0 88 62"><rect width="88" height="62" fill="#fbf3e6"/>${[4, 18, 32, 46, 60].map(y => `<path d="${zz(y, 6, 11, 0, 88)}" fill="none" stroke="#b8743a" stroke-width="6"/>`).join('')}</svg>
        <path d="M222 18Q266 12 310 18Q316 49 310 80Q266 86 222 80Q216 49 222 18Z" fill="none" stroke="${INK}" stroke-width="2.5"/>
        ${['#e8537a', '#3f8fd6', '#ffd23f', '#8a63c9', '#e8453c', '#2fb3a8', '#f28c3a', '#4fbf5a', '#e8537a'].map((c, k) => `<rect x="${238 + (k % 3) * 19}" y="${96 + Math.floor(k / 3) * 15}" width="19" height="15" fill="${c}" stroke="${INK}" stroke-width="1"/>`).join('')}
        <path d="M241 99h13M245 113v12M276 99l8 10M262 130h10" stroke="#fff" stroke-width="2" opacity=".8"/>
        <rect x="226" y="112" width="12" height="44" rx="5" fill="#3f8fd6" stroke="${INK}" stroke-width="1.6"/><rect x="295" y="112" width="12" height="44" rx="5" fill="#e8537a" stroke="${INK}" stroke-width="1.6"/>
        <rect x="232" y="141" width="70" height="17" rx="4" fill="#ffd23f" stroke="${INK}" stroke-width="1.6"/><path d="M238 141v17M250 141v17M262 141v17M274 141v17M286 141v17" stroke="#e8453c" stroke-width="2"/>
        <path d="M236 158l-3 16M298 158l3 16" stroke="#6b3a1e" stroke-width="4" stroke-linecap="round"/>${lab(266, 193)}`, [214, 10, 104, 188])}`),
    },
    // «أحاول»: wavy lines crossed by straight ones; colour the cells in turn,
    // black and white, as the first row shows.
    bwwaves: {
        html: () => svg('bwwaves', `<rect width="320" height="200" rx="12" fill="#fffdf6"/>
      ${[0, 1, 2, 3].map(i => `<path d="${waveCell(i, 0)}" fill="${i % 2 ? '#fff' : K}" stroke="${INK}" stroke-width="2"/>`).join('')}
      ${[1, 2, 3].map(j => [0, 1, 2, 3].map(i => region(`v${j}${i}`, waveCell(i, j), '#e6e0d4')).join('')).join('')}
      <rect x="10" y="10" width="300" height="180" fill="none" stroke="${INK}" stroke-width="3"/>`),
    },
    // ---------- Lesson 19 · moving colour lines (p. 58–60) ----------
    // A fish made of bands of geometric lines, black and white and one red
    // band (as in the book's fish and turkey). Each band glows by its own shape.
    linefish: {
        html: () => svg('linefish', `${PATS}<rect width="320" height="200" rx="12" fill="#f2ede0"/>${fishFins()}
      ${['st', 'zz', 'rd', 'dt', 'wv'].map((p, k) => {
            const d = fishBand(FISH_F[k], FISH_F[k + 1], 48, 214);
            const id = ['stripes', 'zig', 'red', 'dots', 'wave'][k];
            return spot(id, `<path d="${d}" fill="url(#p3-${p})" stroke="${INK}" stroke-width="1.6"/><path class="lx-hit" d="${d}"/>${lab(286, [58, 80, 101, 121, 144][k], 'sv-lab--side')}`);
        }).join('')}
      ${fishHead()}`),
    },
    // Four fish, each of one kind of line (p. 59), to name.
    fourfish: {
        html: () => svg('fourfish', `${PATS}<rect width="320" height="200" rx="12" fill="#f2ede0"/>
      ${[['f-stripes', 'st', 4, 4], ['f-zig', 'zz', 162, 4], ['f-dots', 'dt', 4, 102], ['f-wave', 'wv', 162, 102]].map(([id, p, x, y]) => `<g transform="translate(${x} ${y}) scale(0.5)">${spot(id, `${fishFins()}<path d="${fishBand(0, 1, 48, 214)}" fill="url(#p3-${p})" stroke="${INK}" stroke-width="3"/>${fishHead()}<path class="lx-hit" d="M8 16H262V186H8Z"/><g transform="translate(130 108) scale(2)">${lab(0, 0)}</g>`)}</g>`).join('')}`),
    },
    // «أحاول»: the bands of a fish to colour (warm, cold, in turn); the lines
    // stay on top.
    colorfish: {
        html: () => svg('colorfish', `${PATS}<rect width="320" height="200" rx="12" fill="#eaf4fb"/>${fishFins()}
      ${['st', 'zz', 'dt', 'wv', 'zz'].map((p, k) => { const d = fishBand(FISH_F[k], FISH_F[k + 1], 48, 214); return `${region(`b${k + 1}`, d)}<path d="${d}" fill="url(#p3-${p}L)" opacity=".85"/>`; }).join('')}
      ${fishHead()}`),
    },
    // ---------- Lesson 20 · collage (p. 61–63) ----------
    // A collage fish: newspaper, coloured paper and fabric, on torn blue paper.
    collagesea: {
        html: () => svg('collagesea', `${COL_PATS}${SEA_BG}
      ${spot('sea', `<path class="lx-hit" d="M6 6H66V58H6Z"/>${lab(36, 36)}`)}
      ${spot('news', `${fishPart('body')}<path class="lx-hit" d="${FISH.body}"/>${lab(188, 104)}`)}
      ${spot('paper', `${fishPart('head')}${fishPart('tail')}${fishPart('eye')}<path class="lx-hit" d="${FISH.head}${FISH.tail}"/>${lab(272, 104)}`)}
      ${spot('cloth', `${fishPart('top')}${fishPart('bottom')}<path class="lx-hit" d="${FISH.top}${FISH.bottom}"/>${lab(212, 192)}`)}
      ${spot('glue', `<rect x="14" y="142" width="22" height="40" rx="5" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M19 142L25 128L31 142Z" fill="#e8453c" stroke="${INK}" stroke-width="2"/><rect x="17" y="156" width="16" height="14" fill="#ffd23f"/>${emo('✂️', 50, 172, 24)}<path class="lx-hit" d="M6 120H66V192H6Z"/>${lab(36, 116)}`)}`),
    },
    // «أحاول»: glue each scrap into its outline.
    fishcollage: {
        html: () => svg('fishcollage', `${COL_PATS}${SEA_BG}
      ${['body', 'head', 'tail', 'top', 'bottom', 'eye'].map(id => slot(id, FISH[id], FISH_LOOK[id][0], FISH_LOOK[id][1])).join('')}`),
    },
    // ---------- Lesson 21 · the carpenter (p. 64–67) ----------
    // The carpenter's seven tools on a pegboard, to name.
    toolwall: {
        html: () => svg('toolwall', `<rect width="320" height="200" rx="12" fill="#e9d6b0"/>
      ${Array.from({ length: 60 }, (_, k) => `<circle cx="${12 + (k % 12) * 27}" cy="${10 + Math.floor(k / 12) * 45}" r="1.6" fill="#c9b08a"/>`).join('')}
      ${[['hammer', 6, 4], ['saw', 84, 4], ['plane', 162, 4], ['drill', 240, 4], ['nail', 45, 102], ['tape', 123, 102], ['glue', 201, 102]].map(([id, x, y]) => spot(id, `${toolAt(id, x + 5, y + 4)}${lab(x + 35, y + 88)}`, [x, y, 70, 92])).join('')}`),
    },
    // The workshop: the carpenter at his bench, his tools, a carved door, a
    // dry tree carved into art (the Manshiyya garden in Damascus) and a wooden
    // sculpture.
    workshop: {
        html: () => svg('workshop', `<rect width="320" height="200" rx="12" fill="#f6e8cc"/><rect y="176" width="320" height="24" fill="#c9955b"/><path d="M0 188H320" stroke="#b07c44" stroke-width="1.4"/>
      ${spot('tree', `<path d="M14 186L18 62L6 30L13 26L25 52L27 16H36L38 50L49 24L55 29L44 64L48 186Z" fill="#c98a4a" ${st}/>
        <ellipse cx="25" cy="98" rx="4" ry="6" fill="#7a4f2d"/><ellipse cx="38" cy="98" rx="4" ry="6" fill="#7a4f2d"/><path d="M31 104V116M25 124Q31 130 38 124M20 146L31 134L42 146M20 166L31 154L42 166M22 76Q31 70 41 76" fill="none" stroke="#7a4f2d" stroke-width="2.2"/>${lab(36, 196)}`, [2, 14, 58, 174])}
      ${spot('tools', `<rect x="68" y="10" width="114" height="62" rx="4" fill="#e9d6b0" ${st}/>${toolAt('hammer', 70, 12, 0.9)}${toolAt('saw', 124, 12, 0.9)}${lab(125, 86)}`, [64, 6, 122, 70])}
      ${spot('carpenter', `<path d="M156 140h8v36h-8zM168 140h8v36h-8z" fill="#2a4a7a"/><path d="M150 92h34v50h-34z" fill="#c7373f" ${st}/><path d="M157 100h20v42h-20z" fill="#d9b07a" ${st}/>
        <path d="M152 100L128 116" stroke="#e8b48a" stroke-width="7" stroke-linecap="round"/><circle cx="167" cy="78" r="12" fill="#e8b48a" ${st}/><path d="M155 76Q167 58 179 76Z" fill="#5a3a22"/><circle cx="163" cy="80" r="1.6" fill="${INK}"/><circle cx="171" cy="80" r="1.6" fill="${INK}"/><path d="M163 85Q167 88 171 85" fill="none" stroke="${INK}" stroke-width="1.4"/>
        <rect x="66" y="128" width="100" height="10" fill="#a8703f" ${st}/><rect x="72" y="138" width="8" height="38" fill="#a8703f" ${st}/><rect x="150" y="138" width="8" height="38" fill="#a8703f" ${st}/><rect x="76" y="121" width="80" height="7" fill="#e0b27a" ${st}/>${toolAt('plane', 100, 98, 0.5)}${lab(118, 194)}`, [62, 62, 128, 116])}
      ${spot('furniture', `<path d="M194 176V60Q221 26 248 60V176Z" fill="#a8703f" ${st}/><path d="M200 172V63Q221 36 242 63V172Z" fill="none" stroke="${DARKWOOD}" stroke-width="2"/><path d="M221 42V172M205 80h12v34h-12zM225 80h12v34h-12zM205 124h12v40h-12zM225 124h12v40h-12z" fill="none" stroke="${DARKWOOD}" stroke-width="2"/><circle cx="216" cy="120" r="2.6" fill="#ffd23f"/>${lab(221, 20)}`, [190, 22, 62, 156])}
      ${spot('sculpt', `<rect x="262" y="150" width="46" height="26" fill="#5a3a22" ${st}/><path d="M285 150C266 130 300 112 284 92C270 76 296 66 286 46C282 38 290 32 297 40C306 58 280 70 294 90C306 108 276 128 292 150Z" fill="#a86a3a" ${st}/><ellipse cx="289" cy="92" rx="4" ry="7" fill="#f6e8cc" ${st}/>${lab(285, 26)}`, [256, 30, 60, 148])}`),
    },
    // «أحاول»: make a chair, one tool at a time.
    chairmake: {
        html: () => svg('chairmake', `<rect width="320" height="200" rx="12" fill="#f6e8cc"/><rect y="182" width="320" height="18" fill="#c9955b"/>
      ${stage(0, `<rect x="20" y="140" width="280" height="10" fill="#a8703f" ${st}/><rect x="30" y="150" width="10" height="32" fill="#a8703f" ${st}/><rect x="280" y="150" width="10" height="32" fill="#a8703f" ${st}/>`, 5)}
      ${stage(0, `<rect x="40" y="118" width="240" height="22" fill="#e0b27a" ${st}/><path d="M48 124H140M150 132H270M60 134H120" stroke="#c4925a" stroke-width="1.4"/>`, 2)}
      ${stage(1, `<rect x="40" y="110" width="200" height="6" fill="#ffd23f" ${st}/><path d="M100 104V144M160 104V144M220 104V144" stroke="#e8453c" stroke-width="2.4" stroke-dasharray="4 3"/>${toolAt('tape', 232, 84, 0.6)}`, 2)}
      ${stage(2, `<rect x="40" y="120" width="90" height="20" fill="#e0b27a" ${st}/>${[0, 1, 2, 3].map(k => `<rect x="${142 + (k % 2) * 76}" y="${118 + Math.floor(k / 2) * 11}" width="70" height="9" fill="#d9a86a" ${st}/>`).join('')}`, 5)}
      ${stage(3, `${[[60, 108], [150, 104], [250, 108], [110, 96]].map(([x, y]) => `<path d="M${x} ${y}q7 -9 14 0q-7 7 -11 0" fill="none" stroke="#d9a86a" stroke-width="2.4"/>`).join('')}<rect x="44" y="122" width="82" height="4" fill="#fff" opacity=".5"/>`, 5)}
      ${stage(4, [[52, 130], [118, 130], [64, 130], [106, 130]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#5a3a22"/>`).join(''), 5)}
      ${stage(5, `<rect x="118" y="120" width="10" height="62" fill="#c98a4a" ${st}/><rect x="192" y="120" width="10" height="62" fill="#c98a4a" ${st}/><rect x="118" y="30" width="10" height="84" fill="#c98a4a" ${st}/><rect x="192" y="30" width="10" height="84" fill="#c98a4a" ${st}/>
        <rect x="118" y="44" width="84" height="10" fill="#d9a86a" ${st}/><rect x="118" y="68" width="84" height="10" fill="#d9a86a" ${st}/><rect x="108" y="112" width="104" height="12" fill="#e0b27a" ${st}/>`)}
      ${stage(5, [[123, 118], [197, 118], [123, 49], [197, 49], [123, 73], [197, 73]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#fff" stroke="#c9b08a"/>`).join(''), 6)}
      ${stage(6, `${[[123, 118], [197, 118], [123, 49], [197, 49], [123, 73], [197, 73]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#6b7280"/>`).join('')}${emo('✨', 80, 50, 26)}${emo('✨', 244, 80, 22)}`)}`),
    },
    // ---------- Lesson 22 · art in our daily life (p. 68–70) ----------
    // Works of fruit and vegetables: a face of vegetables, a watermelon carved
    // with a fish, a turtle of orange peel, a mouse with apple ears, a peacock
    // of fruit on a plate.
    fruitart: {
        html: () => svg('fruitart', `<rect width="320" height="200" rx="12" fill="#fff6e6"/><rect y="112" width="320" height="88" fill="#e9c48a"/><path d="M0 112H320" stroke="#c99a5a" stroke-width="2"/>
      ${spot('face', `<circle cx="62" cy="72" r="50" fill="#fff" stroke="#d6d0c4" stroke-width="3"/><ellipse cx="62" cy="76" rx="28" ry="36" fill="#8acb6a" stroke="${INK}" stroke-width="1.6"/>
        <path d="${E(42, 44, 15, 11)}${E(62, 36, 17, 12)}${E(82, 44, 15, 11)}" fill="#a6dc72" stroke="${INK}" stroke-width="1.4"/><path d="${C(51, 70, 6)}${C(73, 70, 6)}" fill="#e8453c" stroke="${INK}" stroke-width="1.2"/><path d="${C(51, 70, 2.2)}${C(73, 70, 2.2)}" fill="${K}"/>
        <path d="M62 74L56 92Q62 95 68 92Z" fill="#f28c1a" stroke="${INK}" stroke-width="1.2"/><path d="M48 98Q62 106 76 98Q74 104 62 108Q50 104 48 98Z" fill="#d62f2f" stroke="${INK}" stroke-width="1.2"/>
        <path d="${[[48, 110], [56, 114], [64, 115], [72, 113], [78, 108]].map(([x, y]) => C(x, y, 3.4)).join('')}" fill="#6cc04a" stroke="${INK}" stroke-width="1"/>${lab(62, 138)}`, [10, 20, 104, 106])}
      ${spot('melon', `<path d="M126 64A42 30 0 0 0 210 64Z" fill="#e8453c" stroke="${INK}" stroke-width="1.6"/><ellipse cx="168" cy="64" rx="42" ry="14" fill="#2f8a3f" stroke="${INK}" stroke-width="1.6"/>
        <path d="M144 64Q160 52 180 62L192 54L190 66L192 76L180 68Q160 76 144 64Z" fill="#b8ec9e" stroke="#1f6a34" stroke-width="1.2"/><circle cx="152" cy="63" r="1.8" fill="#1f6a34"/>${lab(168, 22)}`, [122, 28, 92, 70])}
      ${spot('peel', `<path d="M250 76l-12 8M290 76l12 8M252 48l-12 -6M288 48l12 -6" stroke="#f28c1a" stroke-width="7" stroke-linecap="round"/><circle cx="270" cy="62" r="22" fill="#f6a23a" stroke="${INK}" stroke-width="1.6"/>
        <path d="M270 40V84M249 56L291 68M249 68L291 56" stroke="#e07a10" stroke-width="1.6"/><circle cx="270" cy="34" r="7" fill="#f6a23a" stroke="${INK}" stroke-width="1.4"/><circle cx="267" cy="32" r="1.3" fill="${K}"/><circle cx="273" cy="32" r="1.3" fill="${K}"/>${lab(270, 20)}`, [234, 22, 74, 70])}
      ${spot('mouse', `<path d="${C(136, 138, 11)}${C(158, 134, 11)}" fill="#fbf2d8" stroke="#c7373f" stroke-width="2.6"/><path d="M134 136l2 3M156 132l2 3" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
        <path d="M118 158Q150 128 182 152Q186 166 160 168Q130 172 118 158Z" fill="#d9b06a" stroke="${INK}" stroke-width="1.6"/><path d="M182 158Q196 160 200 150" fill="none" stroke="${INK}" stroke-width="1.6"/><circle cx="129" cy="152" r="2" fill="${K}"/><circle cx="119" cy="158" r="2.4" fill="#c7373f"/>${lab(152, 190)}`, [110, 122, 94, 56])}
      ${spot('peacock', `<ellipse cx="262" cy="158" rx="52" ry="30" fill="#fff" stroke="#d6d0c4" stroke-width="3"/>${[-70, -40, -10, 20, 50, 80].map(a => { const x = 262 + Math.sin(deg(a)) * 36, y = 160 - Math.cos(deg(a)) * 22; return `<path d="M${r1(x - 9)} ${r1(y)}A9 9 0 0 1 ${r1(x + 9)} ${r1(y)}Z" fill="#f6a23a" stroke="${INK}" stroke-width="1.2"/><circle cx="${r1(x)}" cy="${r1(y - 9)}" r="3.4" fill="#b8e070" stroke="${INK}" stroke-width="1"/>`; }).join('')}
        <path d="M262 176Q250 176 252 162Q254 148 262 144Q270 148 272 162Q274 176 262 176Z" fill="#9ab83a" stroke="${INK}" stroke-width="1.4"/><circle cx="262" cy="140" r="6" fill="#9ab83a" stroke="${INK}" stroke-width="1.4"/><path d="M267 140l6 2l-6 2Z" fill="#e8453c"/><circle cx="260" cy="139" r="1.2" fill="${K}"/>${lab(262, 197)}`, [208, 112, 108, 80])}`),
    },
    // «أحاول»: a face of vegetables on a plate; glue each vegetable in its place.
    vegface: {
        html: () => svg('vegface', `<rect width="320" height="200" rx="12" fill="#f4e7cf"/>${VEG_PLATE}
      ${['hair', 'eyes', 'nose', 'mouth', 'beard'].map(id => slot(id, VEG[id], VEG_LOOK[id][0], VEG_LOOK[id][1])).join('')}`),
    },
    // ---------- Lesson 23 · many materials (p. 71–73) ----------
    // Two shelves of works made from scraps: tin-can robots, a girl of
    // corrugated cardboard, a bottle monster, a sock monster, a cork dancer.
    scrapshelf: {
        html: () => svg('scrapshelf', `<rect width="320" height="200" rx="12" fill="#bfe0ec"/><rect y="92" width="320" height="6" fill="#f3f6f8" stroke="#9fb6c6"/><rect y="186" width="320" height="14" fill="#f3f6f8"/>
      ${spot('cans', `${can(38, 50, 44, 42)}${can(48, 24, 24, 22)}${capAt(55, 34, 4.5)}${capAt(66, 34, 4.5, '#3f8fd6')}${coil(60, 24, 2, 6)}<path d="M38 64Q24 62 22 76M82 64Q96 62 98 76" fill="none" stroke="#7d8790" stroke-width="2.4"/>${lab(60, 13)}`, [16, 14, 88, 80])}
      ${spot('card', `<rect x="186" y="18" width="110" height="72" rx="3" fill="#c9955b" ${st}/>${Array.from({ length: 26 }, (_, k) => `<path d="M${190 + k * 4} 20V88" stroke="#b07c44" stroke-width="1"/>`).join('')}
        <path d="${[0, 1, 2, 3, 4, 5].map(k => `M${206 + k * 14} 26q4 8 0 16q-4 8 0 16`).join('')}" fill="none" stroke="#f3e2c4" stroke-width="3"/><ellipse cx="241" cy="56" rx="20" ry="24" fill="#d9a86a" ${st}/>
        <circle cx="233" cy="52" r="3" fill="${INK}"/><circle cx="249" cy="52" r="3" fill="${INK}"/><circle cx="230" cy="62" r="4" fill="#f2c6b0"/><circle cx="252" cy="62" r="4" fill="#f2c6b0"/><path d="M234 68Q241 74 248 68" fill="#c7373f" ${st}/>${lab(241, 13)}`, [180, 8, 122, 86])}
      ${spot('bottle', `<path d="M38 112h14v10q14 6 14 22v38h-42v-38q0 -16 14 -22Z" fill="#d6eefa" fill-opacity=".8" ${st}/><rect x="38" y="106" width="14" height="8" fill="#e8453c" ${st}/>
        ${[0, 1, 2, 3].map(k => `<path d="M${34 + k * 7} 182L${36 + k * 7} 150" stroke="${['#3f8fd6', '#e8453c', '#ffd23f', '#34b04a'][k]}" stroke-width="3"/>`).join('')}<path d="M26 136L32 124L40 132H50L58 124L64 136Q66 160 45 164Q24 160 26 136Z" fill="#f28c1a" fill-opacity=".9" ${st}/>
        <ellipse cx="45" cy="150" rx="12" ry="9" fill="#fff" ${st}/><path d="M36 146l3 5l3 -5l3 5l3 -5l3 5" fill="none" stroke="${INK}" stroke-width="1.4"/><circle cx="38" cy="136" r="3" fill="#fff" ${st}/><circle cx="52" cy="136" r="3" fill="#fff" ${st}/>${lab(45, 198)}`, [12, 102, 66, 84])}
      ${spot('socks', `<path d="M124 186Q118 140 140 128Q160 116 178 130Q196 146 188 186Z" fill="#b48ae0" ${st}/>${[[138, 150], [168, 168], [150, 176]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#d9c4f4"/>`).join('')}
        <path d="${[0, 1, 2, 3, 4].map(k => `M${136 + k * 8} 124l-4 -12`).join('')}" stroke="#ff9f3a" stroke-width="4" stroke-linecap="round"/><circle cx="146" cy="142" r="7" fill="#fff" ${st}/><circle cx="166" cy="142" r="7" fill="#fff" ${st}/><circle cx="147" cy="143" r="3" fill="${INK}"/><circle cx="165" cy="143" r="3" fill="${INK}"/>
        <path d="M144 158H170L166 166H148Z" fill="${INK}"/><path d="M150 158l2 4l2 -4M158 158l2 4l2 -4" fill="#fff"/>${lab(156, 198)}`, [110, 102, 92, 86])}
      ${spot('cork', `${corkAt(246, 112, 16, 22)}${corkAt(244, 138, 20, 26)}<circle cx="250" cy="120" r="2" fill="${INK}"/><circle cx="258" cy="120" r="2" fill="${INK}"/>
        <path d="M244 146L226 136L218 120M264 146L282 134L292 120M248 164L236 184M260 164L276 184" fill="none" stroke="#7d8790" stroke-width="2.2"/>${coil(222, 130, 2, 5)}${coil(276, 176, 2, 5)}<path d="M254 112Q262 98 280 102" fill="none" stroke="#fff" stroke-width="3"/>${lab(256, 198)}`, [212, 98, 96, 90])}`),
    },
    // «أحاول»: a robot from scraps, one material at a time.
    robotmake: {
        html: () => svg('robotmake', `<rect width="320" height="200" rx="12" fill="#bfe0ec"/><rect y="182" width="320" height="18" fill="#f3f6f8"/>
      ${stage(0, `<path d="M120 182V96H200V182M136 92V52H184V92" fill="none" stroke="#7fa6bd" stroke-width="2" stroke-dasharray="5 4"/>`, 1)}
      ${stage(1, can(120, 98, 80, 70))}
      ${stage(2, can(136, 54, 48, 38))}
      ${stage(3, `${capAt(150, 70, 8)}${capAt(170, 70, 8, '#3f8fd6')}`)}
      ${stage(4, `<path d="M120 116Q96 110 90 134M200 116Q224 110 230 134M160 50V30" fill="none" stroke="#7d8790" stroke-width="3"/>${coil(84, 134, 2, 7)}${coil(224, 134, 2, 7)}<circle cx="160" cy="28" r="5" fill="#e8453c" ${st}/>`)}
      ${stage(5, `${corkAt(128, 166, 26, 16)}${corkAt(166, 166, 26, 16)}${emo('✨', 90, 60, 24)}${emo('✨', 236, 70, 22)}`)}`),
    },
    // ---------- Lesson 24 · children's works (p. 74–77) ----------
    // A school exhibition: four children's paintings and an empty frame for yours.
    kidsexpo: {
        html: () => svg('kidsexpo', `<rect width="320" height="200" rx="12" fill="#f3e6c8"/><path d="M0 192H320" stroke="#d9c49a" stroke-width="6"/>
      ${[['giraffe', 10, 8], ['africans', 114, 8], ['city', 10, 104], ['cat', 114, 104]].map(([k, x, y]) => spot(k, `<rect x="${x}" y="${y}" width="96" height="76" fill="#c98a4a" ${st}/>${artG(k, x + 5, y + 5, 86, 66)}<rect x="${x + 5}" y="${y + 5}" width="86" height="66" fill="none" ${st}/>${lab(x + 48, y + 88)}`, [x - 2, y - 2, 100, 80])).join('')}
      ${spot('you', `<rect x="226" y="38" width="82" height="104" fill="#c98a4a" ${st}/><rect x="232" y="44" width="70" height="92" fill="#fffdf6" ${st}/>${emo('🖌️', 267, 82, 30)}${txt('؟', 267, 122)}${lab(267, 160)}`, [222, 34, 90, 112])}`),
    },
    // «أحاول»: colour a patterned cat as our children do, in bright pure colours.
    kidcat: {
        html: () => svg('kidcat', `<rect width="320" height="200" rx="12" fill="#fffdf6"/>
      ${region('wall', 'M12 12H160V188H12Z')}${region('win', 'M160 12H308V188H160Z')}
      <path d="M190 30l3 7l7 1l-5 5l1 7l-6 -4l-6 4l1 -7l-5 -5l7 -1Z M270 60l2 5l5 1l-4 3l1 5l-4 -3l-4 3l1 -5l-4 -3l5 -1Z M250 150l2 5l5 1l-4 3l1 5l-4 -3l-4 3l1 -5l-4 -3l5 -1Z" fill="#fff" stroke="${INK}" stroke-width="1.2"/>
      ${[[40, 40], [70, 90], [36, 140], [96, 160], [104, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${INK}" stroke-width="1.4"/><circle cx="${x}" cy="${y}" r="3" fill="${INK}"/>`).join('')}
      ${region('tail', 'M198 172Q252 178 250 130Q248 110 232 116Q240 150 198 152Z')}<path d="M210 156L216 168M222 150L230 164M234 138L244 146" stroke="${INK}" stroke-width="2.4"/>
      ${region('body', 'M116 188Q110 108 160 102Q210 108 204 188Z')}${[[136, 130], [180, 136], [150, 160], [184, 172], [128, 170], [166, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff" stroke="${INK}" stroke-width="1.2"/>`).join('')}
      ${region('head', 'M118 36L130 50Q160 36 190 50L202 36L204 74Q206 110 160 112Q114 110 116 74Z')}
      <ellipse cx="146" cy="74" rx="9" ry="7" fill="#fff" stroke="${INK}" stroke-width="1.6"/><ellipse cx="174" cy="74" rx="9" ry="7" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="146" cy="74" r="3.5" fill="${INK}"/><circle cx="174" cy="74" r="3.5" fill="${INK}"/>
      <path d="M155 88h10l-5 6Z" fill="#e8537a" stroke="${INK}" stroke-width="1.2"/><path d="M118 88l26 4M118 98l26 0M202 88l-26 4M202 98l-26 0" stroke="${INK}" stroke-width="1.2"/>
      ${region('bow', 'M144 104L160 112L144 122ZM176 104L160 112L176 122Z')}`),
    },
};
export const PIECES = {
    fishcollage: {
        body: { label: 'قصاصة جريدة', box: [116, 30, 140, 140], art: fishPart('body'), say: 'قصاصة الجريدة صارت جسم السمكة، بكلماتها وسطورها! 📰' },
        head: { label: 'ورق أصفر', box: [58, 42, 78, 116], art: fishPart('head') },
        tail: { label: 'ورق برتقاليّ', box: [244, 48, 60, 104], art: fishPart('tail') },
        top: { label: 'قماش منقّط', box: [134, 8, 96, 60], art: fishPart('top'), say: 'بقايا القماش تزيّن الزعانف. 🧵' },
        bottom: { label: 'قماش مقلّم', box: [142, 142, 60, 50], art: fishPart('bottom') },
        eye: { label: 'ورق أبيض', box: [78, 76, 28, 28], art: fishPart('eye') },
    },
    vegface: {
        hair: { label: 'ورق الملفوف', box: [86, 14, 148, 62], art: vegPart('hair'), say: 'ورق الملفوف صار شعراً مجعّداً! 🥬' },
        eyes: { label: 'البندورة', box: [124, 80, 72, 28], art: vegPart('eyes') },
        nose: { label: 'الجزرة', box: [146, 98, 28, 44], art: vegPart('nose') },
        mouth: { label: 'الفليفلة', box: [130, 142, 60, 28], art: vegPart('mouth') },
        beard: { label: 'البازلاء', box: [124, 162, 74, 28], art: vegPart('beard'), say: 'حبّات البازلاء لحية خضراء! 😄' },
    },
};
