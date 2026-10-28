// The science island's pictures for «أتعلّم» (core/learn/explore.js) and for
// the `label` and `choice` questions (core/learn/steps.js). Each is drawn in
// code (SVG) from the book's own pictures and experiments, and its parts carry
// data-spot="<spot id>". When a spot opens, the picture's root gets the class
// `st-<id>` and data-st="<id>", and CSS (style.css, «science pictures») plays
// the experiment: pins jump to the magnet, the spring stretches, the folded
// paper lands first, the kidney filters…
//
//   VIEWS[name] = { html(step) → string, spot?(spot, el, root, ctx) }
//
// Units: viewBox 320 × 200 unless noted. Emoji draw the animals and things
// that need no detail; the experiments are drawn.

import { num } from '../format.js';
import { INK, svg, hitR, spot, emo, lab, txt } from '../learn/svg.js';
import type { Picture } from '../learn/steps.js';

// An arrow from (x1, y1) to (x2, y2), with a head.
function arrow(x1: number, y1: number, x2: number, y2: number, cls = '', head = 9) {
  const a = Math.atan2(y2 - y1, x2 - x1), hx = x2 - Math.cos(a) * head, hy = y2 - Math.sin(a) * head;
  const px = Math.sin(a) * head * 0.6, py = -Math.cos(a) * head * 0.6;
  return `<g class="sv-ar ${cls}"><line x1="${x1}" y1="${y1}" x2="${hx}" y2="${hy}"/><path d="M${x2} ${y2} L${hx + px} ${hy + py} L${hx - px} ${hy - py} Z"/></g>`;
}
const spring = (x: number, y: number, len: number, coils = 8, w = 9) => {
  let d = `M${x} ${y}`;
  for (let i = 0; i < coils; i++) d += ` L${x + (i % 2 ? -w : w)} ${y + ((i + 0.5) / coils) * len}`;
  return `<path class="sv-spring" d="${d} L${x} ${y + len}"/>`;
};
const table = (y = 150, x0 = 10, x1 = 310) => `<rect class="sv-table" x="${x0}" y="${y}" width="${x1 - x0}" height="12" rx="4"/><rect class="sv-table-leg" x="${x0 + 14}" y="${y + 12}" width="10" height="${196 - y - 12}"/><rect class="sv-table-leg" x="${x1 - 24}" y="${y + 12}" width="10" height="${196 - y - 12}"/>`;
const sky = (id = 'sk') => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe8ff"/><stop offset="1" stop-color="#eaf8ff"/></linearGradient></defs><rect width="320" height="200" fill="url(#${id})"/>`;

// A spring scale (الرّبيعة) hanging from y0; `len` is the spring's length.
function scaleTool(x: number, y0: number, len: number, reading: string, cls = '') {
  return `<g class="sv-scale ${cls}"><rect class="sv-scale__case" x="${x - 13}" y="${y0}" width="26" height="${len + 34}" rx="8"/>
    <circle class="sv-scale__ring" cx="${x}" cy="${y0 - 7}" r="6"/>${spring(x, y0 + 8, len)}
    <rect class="sv-scale__ptr" x="${x - 9}" y="${y0 + 8 + len}" width="18" height="4" rx="2"/>
    <line class="sv-scale__hook" x1="${x}" y1="${y0 + 12 + len}" x2="${x}" y2="${y0 + 34 + len}"/>
    <text class="sv-read" x="${x + 22}" y="${y0 + 14 + len}" dir="ltr">${reading}</text></g>`;
}
const weight = (x: number, y: number, w = 26, h = 22, label = '') => `<g class="sv-wt"><path d="M${x - w / 2} ${y + h} L${x - w / 2 + 4} ${y} L${x + w / 2 - 4} ${y} L${x + w / 2} ${y + h} Z"/><circle cx="${x}" cy="${y - 3}" r="4" class="sv-wt__ring"/>${label ? `<text x="${x}" y="${y + h / 2 + 4}" class="sv-wt__t" dir="ltr">${label}</text>` : ''}</g>`;

export const VIEWS: Record<string, Picture> = {
  // ===================== Unit 1: living things =====================

  valley: {
    html: () => svg('valley', `${sky('vsk')}
      <path d="M0 120 Q60 70 120 110 T240 95 T320 110 V200 H0Z" fill="#a6d98b"/><path d="M0 140 Q80 115 160 135 T320 130 V200 H0Z" fill="#8ccc72"/>
      <ellipse cx="236" cy="172" rx="70" ry="16" fill="#7fd0f0"/><rect y="182" width="320" height="18" fill="#a07a4f"/>
      <rect x="54" y="70" width="8" height="70" fill="#8a5a34"/><path d="M58 30 L30 82 H86 Z M58 50 L26 104 H90 Z" fill="#3f9a4e"/>
      ${spot('nest', `<ellipse cx="70" cy="76" rx="13" ry="6" fill="#9a6a3c"/><circle cx="66" cy="72" r="3.4" fill="#eaf4ff"/><circle cx="73" cy="72" r="3.4" fill="#eaf4ff"/>${lab(70, 96)}`, [52, 60, 36, 30])}
      ${spot('food', `${emo('🐇', 130, 150, 26)}<circle cx="152" cy="146" r="9" fill="#5aa244"/><circle cx="149" cy="142" r="2.4" fill="#e8453c"/><circle cx="155" cy="147" r="2.4" fill="#e8453c"/>${lab(140, 172)}`, [112, 128, 52, 36])}
      ${spot('dung', `${emo('🐑', 206, 122, 28)}<ellipse cx="222" cy="140" rx="5" ry="3" fill="#6b4a2a"/><ellipse cx="229" cy="141" rx="4" ry="2.5" fill="#6b4a2a"/>${lab(210, 156)}`, [188, 100, 52, 50])}
      ${spot('seed', `${emo('🐦', 250, 40, 24)}<circle cx="238" cy="50" r="2.5" fill="#c98a3a" class="sv-seed"/>${lab(252, 66)}`, [232, 22, 40, 50])}
      ${spot('air', `<path d="M24 190 q8 -6 16 0 t16 0" class="sv-worm"/><circle cx="20" cy="188" r="1.6" fill="#5a3a22"/>${lab(40, 178)}`, [10, 170, 56, 28])}`),
  },

  story: {
    html: () => svg('story', `
      ${[0, 1, 2].map(i => `<rect x="${8 + i * 104}" y="18" width="96" height="164" rx="12" class="sv-panel"/>`).join('')}
      ${spot('tiger', `${emo('🐅', 268, 86, 36)}${emo('🦌', 238, 124, 26)}${txt('النمر والغزال', 260, 166)}`, [216, 18, 96, 164])}
      ${spot('hyena', `${emo('🦴', 160, 120, 26)}${emo('🐺', 184, 92, 26)}${emo('🐺', 138, 86, 22)}${txt('الضباع', 160, 166)}`, [112, 18, 96, 164])}
      ${spot('microbe', `${emo('🦴', 56, 120, 30)}<circle cx="56" cy="78" r="22" class="sv-lens"/>${emo('🦠', 48, 74, 14)}${emo('🍄', 64, 84, 13)}${emo('🪱', 58, 68, 12)}${txt('ديدان وفطريات', 56, 166)}`, [8, 18, 96, 164])}`),
  },

  chain: {
    html: () => {
      const L = [['grass', '🌿'], ['hopper', '🦗'], ['frog', '🐸'], ['snake', '🐍'], ['hawk', '🦅']];
      const x = (i: number) => 286 - i * 63;
      return svg('chain', `<rect width="320" height="200" rx="16" fill="#eef9e8"/>
        ${L.slice(1).map((_, i) => arrow(x(i) - 21, 100, x(i + 1) + 21, 100, `ar-${i + 1}`)).join('')}
        ${L.map(([id, e], i) => spot(id, `<circle cx="${x(i)}" cy="100" r="19" class="sv-node"/>${emo(e, x(i), 101, 22)}${lab(x(i), 140)}`, [x(i) - 22, 74, 44, 80])).join('')}
        <text class="sv-t sv-energy" x="160" y="40">⚡ الطاقة</text>`);
    },
  },

  web: {
    html: () => {
      const N: Record<string, [x: number, y: number, emoji: string]> = { seeds: [210, 170, '🌾'], mouse: [210, 112, '🐭'], owl: [270, 40, '🦉'], snake: [170, 40, '🐍'], fox: [70, 46, '🦊'], grass: [80, 170, '🌿'], rabbit: [80, 112, '🐇'] };
      const a = (f: string, t: string, cls: string) => { const [x1, y1] = N[f], [x2, y2] = N[t], d = Math.hypot(x2 - x1, y2 - y1); return arrow(x1 + ((x2 - x1) / d) * 20, y1 + ((y2 - y1) / d) * 20, x2 - ((x2 - x1) / d) * 21, y2 - ((y2 - y1) / d) * 21, cls); };
      const node = (id: string) => `<circle cx="${N[id][0]}" cy="${N[id][1]}" r="19" class="sv-node"/>${emo(N[id][2], N[id][0], N[id][1] + 1, 22)}`;
      return svg('web', `<rect width="320" height="200" rx="16" fill="#eef7ea"/>
        ${a('seeds', 'mouse', 'w-1 w-2')}${a('mouse', 'owl', 'w-1')}${a('mouse', 'snake', 'w-2')}${a('grass', 'rabbit', 'w-3')}${a('rabbit', 'fox', 'w-3')}${a('mouse', 'fox', 'w-3')}
        ${['seeds', 'mouse', 'grass', 'rabbit'].map(node).join('')}
        ${spot('c1', node('owl'), [248, 18, 44, 44])}${spot('c2', node('snake'), [148, 18, 44, 44])}${spot('c3', node('fox'), [48, 24, 44, 44])}`);
    },
  },

  town: {
    html: () => svg('town', `${sky('tsk')}<rect y="130" width="320" height="70" fill="#9bd27a"/><path d="M0 160 Q50 150 90 165 T170 160 V200 H0Z" fill="#7fd0f0"/>
      ${spot('axe', `${emo('🪵', 236, 150, 26)}${emo('🪓', 262, 140, 22)}${lab(250, 178)}`, [218, 118, 66, 66])}
      ${spot('goat', `${emo('🌳', 294, 52, 34)}${emo('🐐', 282, 78, 22)}${lab(286, 104)}`, [268, 30, 52, 80])}
      ${spot('trash', `${emo('🗑️', 40, 172, 22)}<circle cx="64" cy="176" r="4" fill="#e8453c"/><rect x="72" y="172" width="9" height="5" fill="#ffd23f"/>${lab(56, 196)}`, [20, 150, 70, 48])}
      ${spot('smoke', `<rect x="128" y="88" width="46" height="44" fill="#9aa5ad"/><rect x="136" y="60" width="10" height="30" fill="#7a858d"/><circle cx="141" cy="52" r="8" class="sv-smoke"/><circle cx="150" cy="40" r="10" class="sv-smoke"/>${lab(150, 148)}`, [122, 30, 60, 106])}
      ${spot('law', `<rect x="22" y="40" width="70" height="44" rx="6" fill="#f6f2a0" stroke="${INK}" stroke-width="2"/>${emo('⚖️', 57, 58, 18)}<text x="57" y="78" class="sv-t sv-t--red">قوانين</text>`, [20, 38, 74, 48])}
      ${spot('plant', `${emo('🌱', 218, 74, 22)}${emo('🧑‍🌾', 200, 68, 24)}${lab(208, 98)}`, [186, 48, 48, 56])}`),
  },

  dust: {
    html: () => {
      const C: [id: string, emoji: string, name: string, specks: number][] = [['window', '🪟', 'النافذة', 2], ['stairs', '🪜', 'الدرج', 3], ['board', '🧑‍🏫', 'السبّورة', 4], ['yard', '🏫', 'الباحة', 6]];
      return svg('dust', `<rect width="320" height="200" rx="16" fill="#f4efe6"/>
        ${C.map(([id, e, name, n], i) => {
          const x = 250 - i * 76, dots = Array.from({ length: n * 4 }, (_, k) => `<circle cx="${x - 22 + ((k * 37) % 44)}" cy="${86 + ((k * 23) % 50)}" r="${1.4 + (k % 3) * 0.7}"/>`).join('');
          return spot(id, `<rect x="${x - 30}" y="60" width="60" height="96" rx="8" class="sv-card"/><rect x="${x - 26}" y="78" width="52" height="62" rx="5" class="sv-jelly"/>
            <g class="sv-specks">${dots}</g>${emo(e, x, 44, 22)}<text x="${x}" y="172" class="sv-t">${name}</text>`, [x - 32, 26, 64, 160]);
        }).join('')}`);
    },
  },

  // ===================== Unit 2: forces =====================

  pins: {
    html: () => {
      const pin = (x: number, y: number, c: string) => `<g class="sv-pin"><line x1="${x}" y1="${y}" x2="${x + 9}" y2="${y + 3}"/><circle cx="${x}" cy="${y}" r="3.2" fill="${c}"/></g>`;
      const cols = ['#e8453c', '#3f8fd6', '#f2c14e', '#4fbf5a', '#8a63c9'];
      return svg('pins', `<rect width="320" height="200" rx="16" fill="#fff6e6"/>${table(150)}
        <g class="pins-a">${[0, 1, 2, 3].map(i => pin(186 + i * 9, 140 + (i % 2) * 4, cols[i])).join('')}</g>
        <g class="pins-b">${[0, 1, 2, 3].map(i => pin(106 + i * 10, 140 + (i % 2) * 4, cols[(i + 2) % 5])).join('')}</g>
        ${spot('ruler', `<g class="sv-ruler"><rect x="236" y="126" width="74" height="16" rx="3" fill="#f28c3a" stroke="${INK}" stroke-width="2"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="${244 + i * 9}" y1="126" x2="${244 + i * 9}" y2="${i % 2 ? 131 : 134}" stroke="${INK}" stroke-width="1.5"/>`).join('')}</g>`, [232, 110, 82, 40])}
        ${spot('magnet', `<g class="sv-magnet"><path d="M30 112 h18 v26 a12 12 0 0 0 24 0 v-26 h18 v26 a30 30 0 0 1 -60 0z" fill="#e8453c" stroke="${INK}" stroke-width="2.5"/><rect x="30" y="112" width="18" height="10" fill="#eaeaea" stroke="${INK}" stroke-width="2"/><rect x="72" y="112" width="18" height="10" fill="#eaeaea" stroke="${INK}" stroke-width="2"/></g>`, [24, 100, 72, 80])}`);
    },
  },

  car: {
    html: () => svg('car', `<rect width="320" height="200" rx="16" fill="#f1f7ff"/>${table(146)}
      ${spot('still', `<g class="sv-car"><rect x="120" y="108" width="80" height="30" rx="10" fill="#8a63c9" stroke="${INK}" stroke-width="2.5"/><rect x="138" y="94" width="44" height="18" rx="6" fill="#b79cf0" stroke="${INK}" stroke-width="2"/>
        <rect x="146" y="86" width="28" height="9" fill="#e8453c" stroke="${INK}" stroke-width="1.5"/><circle cx="140" cy="140" r="9" fill="#3b3640" stroke="${INK}" stroke-width="2"/><circle cx="182" cy="140" r="9" fill="#3b3640" stroke="${INK}" stroke-width="2"/></g>`, [114, 80, 92, 72])}
      ${spot('weight', `${arrow(160, 120, 160, 188, 'sv-ar--y car-w')}<text class="sv-t car-w" x="186" y="182">الفعل</text>`, [146, 150, 60, 46])}
      ${spot('reaction', `${arrow(130, 152, 130, 64, 'sv-ar--g car-r')}<text class="sv-t car-r" x="100" y="66">ردّ الفعل</text>`, [80, 50, 60, 40])}
      ${spot('balanced', `<g class="car-b">${emo('⚖️', 262, 44, 26)}</g>`, [238, 22, 50, 46])}
      ${spot('magnet', `<g class="sv-hand"><rect x="236" y="88" width="34" height="14" rx="3" fill="#e8453c" stroke="${INK}" stroke-width="2"/><rect x="262" y="88" width="10" height="14" fill="#3f8fd6" stroke="${INK}" stroke-width="2"/><circle cx="286" cy="95" r="12" fill="#f6c9a0" stroke="${INK}" stroke-width="2"/></g>`, [230, 76, 72, 36])}`),
  },

  scale: {
    html: () => svg('scale', `<rect width="320" height="200" rx="16" fill="#f3f8ff"/>${table(160)}
      <rect x="236" y="12" width="8" height="150" fill="#9aa5ad"/><rect x="150" y="12" width="94" height="8" fill="#9aa5ad"/>
      ${spot('pull', `<g class="sc-tool">${scaleTool(160, 28, 34, '0N')}</g>`, [140, 14, 60, 90])}
      <line class="sc-thread" x1="160" y1="96" x2="160" y2="136"/>
      ${spot('hang', `<g class="sc-wt">${weight(160, 136, 34, 24)}</g>`, [138, 126, 46, 36])}`),
    spot(s, el, root) {
      const scale = root?.querySelector('.sv-read');
      if (s.id === 'pull' && scale) scale.textContent = '3N';
    },
  },

  vector: {
    html: () => svg('vector', `<rect width="320" height="200" rx="16" fill="#fffaf0"/>
      ${spot('line', `<line x1="20" y1="100" x2="300" y2="100" class="sv-dash"/><text class="sv-t" x="22" y="88">X′</text><text class="sv-t" x="298" y="88">X</text>${lab(160, 132, 'lab-line')}`, [16, 88, 288, 24])}
      ${spot('mag', `<line x1="90" y1="150" x2="230" y2="150" class="sv-mag"/><line x1="90" y1="142" x2="90" y2="158" class="sv-mag"/><line x1="230" y1="142" x2="230" y2="158" class="sv-mag"/>${lab(160, 176)}`, [84, 136, 152, 46])}
      ${arrow(90, 100, 232, 100, 'sv-ar--r vec')}
      ${spot('dir', `<circle cx="226" cy="100" r="14" class="sv-ring"/>${lab(226, 72)}`, [208, 82, 36, 36])}
      ${spot('point', `<circle cx="90" cy="100" r="7" fill="#e8453c" stroke="${INK}" stroke-width="2"/><text class="sv-t" x="90" y="82">O</text>${lab(90, 64)}`, [72, 70, 36, 44])}`),
  },

  resultant: {
    html: () => svg('resultant', `<rect width="320" height="200" rx="16" fill="#f3f8ff"/>
      <rect x="60" y="10" width="200" height="8" fill="#9aa5ad"/>
      ${spot('empty', `<g class="rs-tool">${scaleTool(160, 26, 30, '0N')}</g>`, [140, 14, 60, 84])}
      <g class="rs-w1">${weight(160, 98, 26, 22, 'w₁')}</g><g class="rs-w2">${weight(160, 124, 34, 26, 'w₂')}</g><g class="rs-w">${weight(160, 106, 44, 36, 'w')}</g>
      ${spot('w1', `${weight(44, 160, 26, 22, 'w₁')}${txt('2N', 44, 196, 'sv-t--ltr')}`, [26, 140, 38, 60])}
      ${spot('w2', `${weight(96, 156, 34, 26, 'w₂')}${txt('3N', 96, 196, 'sv-t--ltr')}`, [74, 136, 46, 64])}
      ${spot('w', `${weight(262, 150, 44, 36, 'w')}${txt('5N', 262, 196, 'sv-t--ltr')}`, [236, 130, 54, 70])}`),
    spot(s, el, root) {
      const reads: Record<string, string> = { empty: '0N', w1: '2N', w2: '5N', w: '5N' };
      const read = reads[s.id], scale = root?.querySelector('.sv-read');
      if (read && scale) scale.textContent = read;
    },
  },

  book: {
    html: () => svg('book', `<rect width="320" height="200" rx="16" fill="#fdf4ec"/>
      ${spot('press', `<g class="bk-l"><path d="M60 50 h60 a14 14 0 0 1 14 14 v60 a14 14 0 0 1 -14 14 h-60z" fill="#f6c9a0" stroke="${INK}" stroke-width="2.5"/><rect x="20" y="70" width="44" height="50" fill="#6fc3df" stroke="${INK}" stroke-width="2.5"/></g>
        <g class="bk-r"><path d="M260 50 h-60 a14 14 0 0 0 -14 14 v60 a14 14 0 0 0 14 14 h60z" fill="#f6c9a0" stroke="${INK}" stroke-width="2.5"/><rect x="256" y="70" width="44" height="50" fill="#2fb3a8" stroke="${INK}" stroke-width="2.5"/></g>`, [16, 46, 288, 98])}
      <g class="bk-book"><rect x="136" y="30" width="48" height="118" rx="4" fill="#3f8fd6" stroke="${INK}" stroke-width="2.5"/><rect x="140" y="34" width="6" height="110" fill="#2a6fb0"/></g>
      ${arrow(160, 96, 160, 30, 'sv-ar--r bk-f')}<text class="sv-t sv-t--red bk-f" x="200" y="28">الاحتكاك</text>
      ${spot('pull', `<g class="bk-hand"><circle cx="160" cy="176" r="15" fill="#f6c9a0" stroke="${INK}" stroke-width="2.5"/>${arrow(160, 160, 160, 196, 'sv-ar--b')}</g>`, [138, 154, 44, 46])}`),
  },

  balls: {
    html: () => svg('balls', `<rect width="320" height="200" rx="16" fill="#fff8ec"/><rect x="10" y="90" width="300" height="80" rx="6" fill="#d9a86a" stroke="${INK}" stroke-width="2.5"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<line x1="20" y1="${100 + i * 12}" x2="300" y2="${100 + i * 12}" stroke="#c4904f" stroke-width="1.2"/>`).join('')}
      <g class="bl-red"><circle cx="270" cy="110" r="11" fill="#e8453c" stroke="${INK}" stroke-width="2.5"/></g><g class="bl-blue"><circle cx="270" cy="148" r="11" fill="#7fc4ff" stroke="${INK}" stroke-width="2.5"/><circle cx="266" cy="144" r="3" fill="#fff"/></g>
      <g class="bl-flags"><text class="sv-emo" x="190" y="96" font-size="16">✏️</text><text class="sv-emo" x="70" y="136" font-size="16">✏️</text></g>
      ${spot('push', `<g class="bl-ruler"><rect x="286" y="96" width="14" height="66" rx="3" fill="#f28c3a" stroke="${INK}" stroke-width="2"/></g>`, [278, 88, 30, 82])}`),
  },

  surfaces: {
    html: () => {
      const lane = (id: string, y: number, fill: string, name: string) => spot(id, `<rect x="20" y="${y}" width="230" height="38" rx="6" fill="${fill}" stroke="${INK}" stroke-width="2"/>
        <g class="sf-cube sf-${id}"><rect x="200" y="${y + 6}" width="26" height="26" rx="3" fill="#a9b3bc" stroke="${INK}" stroke-width="2"/></g>
        <rect x="258" y="${y + 8}" width="50" height="22" rx="6" class="sv-meter"/><rect x="261" y="${y + 11}" width="0" height="16" rx="4" class="sv-meter__fill mt-${id}"/>
        <text class="sv-t" x="135" y="${y + 25}">${name}</text>`, [16, y - 2, 296, 42]);
      return svg('surfaces', `<rect width="320" height="200" rx="16" fill="#f5f9ff"/>
        ${lane('glass', 22, '#d9f5ee', 'زجاج')}${lane('wood', 80, '#c99863', 'خشب')}${lane('felt', 138, '#9c78d4', 'جوخ')}`);
    },
  },

  paper: {
    html: () => svg('paper', `<rect width="320" height="200" rx="16" fill="#f3f8ff"/><rect y="182" width="320" height="18" fill="#c99863"/>
      ${spot('drop', `<g class="pp-flat"><path d="M190 30 h90 l-6 10 h-78z" fill="#bfe3ff" stroke="${INK}" stroke-width="2"/></g><g class="pp-fold"><rect x="70" y="24" width="22" height="22" rx="2" fill="#bfe3ff" stroke="${INK}" stroke-width="2"/></g>
        <circle cx="62" cy="38" r="9" class="pp-hand" fill="#f6c9a0" stroke="${INK}" stroke-width="2"/><circle cx="290" cy="38" r="9" class="pp-hand" fill="#f6c9a0" stroke="${INK}" stroke-width="2"/>`, [40, 10, 270, 50])}
      <text class="sv-t pp-first" x="81" y="168">الأولى! 🏁</text>`),
  },

  paraglider: {
    html: () => svg('paraglider', `${sky('psk')}
      <path d="M90 50 Q160 0 230 50 Q160 30 90 50Z" fill="#f28c3a" stroke="${INK}" stroke-width="2.5"/>
      <line x1="95" y1="50" x2="155" y2="112" stroke="${INK}"/><line x1="225" y1="50" x2="165" y2="112" stroke="${INK}"/><line x1="160" y1="36" x2="160" y2="112" stroke="${INK}"/>
      <circle cx="160" cy="118" r="8" fill="#f6c9a0" stroke="${INK}" stroke-width="2"/><rect x="152" y="126" width="16" height="22" rx="5" fill="#3f8fd6" stroke="${INK}" stroke-width="2"/>
      ${spot('air', `${arrow(60, 170, 60, 70, 'sv-ar--g')}${lab(60, 190)}`, [40, 60, 40, 140])}
      ${spot('move', `${arrow(260, 70, 260, 170, 'sv-ar--g')}${lab(260, 190)}`, [240, 60, 40, 140])}`),
  },

  push: {
    html: () => svg('push', `<rect width="320" height="200" rx="16" fill="#f7fbef"/>
      ${[0, 1, 2].map(i => `<line x1="${10 + i * 104}" y1="160" x2="${102 + i * 104}" y2="160" stroke="#8ccc72" stroke-width="6"/>`).join('')}
      ${spot('horse', `<g class="ps-horse">${emo('🐴', 286, 136, 34)}<rect x="226" y="124" width="40" height="22" rx="4" fill="#c99863" stroke="${INK}" stroke-width="2"/><circle cx="236" cy="150" r="7" fill="#8a5a34"/><circle cx="258" cy="150" r="7" fill="#8a5a34"/>${emo('🥬', 246, 120, 14)}</g>${txt('الحصان', 262, 184)}`, [214, 90, 100, 104])}
      ${spot('chair', `<g class="ps-chair"><rect x="140" y="118" width="26" height="6" fill="#a8703f"/><rect x="160" y="96" width="6" height="28" fill="#a8703f"/><rect x="142" y="124" width="4" height="34" fill="#a8703f"/><rect x="160" y="124" width="4" height="34" fill="#a8703f"/></g>${emo('🧒', 188, 132, 30)}${txt('الكرسيّ', 160, 184)}`, [112, 90, 96, 104])}
      ${spot('rock', `<g class="ps-rock"><path d="M28 158 Q20 118 50 110 Q80 104 86 132 Q92 158 70 158Z" fill="#9aa5ad" stroke="${INK}" stroke-width="2.5"/></g>${emo('🧑‍🌾', 96, 136, 28)}<text class="sv-t sv-t--red ps-zero" x="56" y="96">لا عمل!</text>${txt('الصخرة', 56, 184)}`, [10, 86, 100, 108])}`),
  },

  barrow: {
    html: () => {
      const bar = (id: string, x: number, h: number, name: string) => spot(id, `<rect x="${x}" y="${170 - h}" width="40" height="${h}" rx="5" class="br-bar br-${id}"/><text class="sv-t" x="${x + 20}" y="188">${name}</text>`, [x - 4, 90, 48, 106]);
      return svg('barrow', `<rect width="320" height="200" rx="16" fill="#fbf7ee"/><line x1="16" y1="170" x2="304" y2="170" stroke="${INK}" stroke-width="2"/>
        <text class="sv-t" x="160" y="22">العمل 🔨</text>${emo('🛞', 160, 60, 26)}
        ${bar('light', 250, 26, 'خفيفة')}${bar('heavy', 190, 62, 'ثقيلة')}${bar('short', 110, 30, '5m')}${bar('long', 50, 62, '10m')}`);
    },
  },

  joule: {
    html: () => svg('joule', `<rect width="320" height="200" rx="16" fill="#fffaf0"/>
      ${spot('f', `<rect x="236" y="40" width="70" height="56" rx="10" class="jl-box"/><text class="sv-t jl-big" x="271" y="74" dir="ltr">40N</text><text class="sv-t" x="271" y="114">القوة F</text>`, [232, 36, 78, 88])}
      <text class="sv-t jl-op" x="218" y="76">×</text>
      ${spot('d', `<rect x="128" y="40" width="70" height="56" rx="10" class="jl-box"/><text class="sv-t jl-big" x="163" y="74" dir="ltr">20m</text><text class="sv-t" x="163" y="114">المسافة d</text>`, [124, 36, 78, 88])}
      <text class="sv-t jl-op" x="110" y="76">=</text>
      ${spot('w', `<rect x="14" y="40" width="80" height="56" rx="10" class="jl-box jl-box--w"/><text class="sv-t jl-big jl-ans" x="54" y="74" dir="ltr">800J</text><text class="sv-t" x="54" y="114">العمل W</text>`, [10, 36, 88, 88])}
      <text class="sv-t jl-law" x="160" y="168" dir="ltr">W = F × d</text>`),
  },

  // ===================== Unit 3: my body =====================

  exits: {
    html: () => svg('exits', `<rect width="320" height="200" rx="16" fill="#fdf2f4"/>
      <circle cx="160" cy="40" r="22" fill="#f6c9a0" stroke="${INK}" stroke-width="2.5"/><path d="M120 66 h80 a16 16 0 0 1 16 16 v64 h-112 v-64 a16 16 0 0 1 16 -16z" fill="#8fd0e8" stroke="${INK}" stroke-width="2.5"/>
      <rect x="126" y="146" width="28" height="44" rx="8" fill="#3b4a7a"/><rect x="166" y="146" width="28" height="44" rx="8" fill="#3b4a7a"/>
      <rect x="86" y="72" width="22" height="64" rx="10" fill="#f6c9a0" stroke="${INK}" stroke-width="2"/><rect x="212" y="72" width="22" height="64" rx="10" fill="#f6c9a0" stroke="${INK}" stroke-width="2"/>
      ${spot('lungs', `<path d="M146 78 q-14 4 -14 26 q0 14 12 10 q6 -2 6 -14z M174 78 q14 4 14 26 q0 14 -12 10 q-6 -2 -6 -14z" fill="#f29ac0" stroke="${INK}" stroke-width="1.8"/>
        <g class="ex-breath"><circle cx="186" cy="38" r="5" class="sv-bub"/><circle cx="198" cy="28" r="7" class="sv-bub"/><text class="sv-t sv-small" x="236" y="26" dir="ltr">CO₂</text></g>${lab(76, 30)}`, [126, 16, 120, 104])}
      ${spot('skin', `<g class="ex-sweat"><path d="M226 92 q4 6 0 10 q-4 -4 0 -10z" class="sv-drop"/><path d="M222 112 q4 6 0 10 q-4 -4 0 -10z" class="sv-drop"/></g>${lab(270, 104)}`, [206, 70, 36, 70])}
      ${spot('kidney', `<ellipse cx="148" cy="126" rx="7" ry="11" fill="#b33a3a" stroke="${INK}" stroke-width="1.5"/><ellipse cx="172" cy="124" rx="7" ry="11" fill="#b33a3a" stroke="${INK}" stroke-width="1.5"/><path d="M160 150 q-6 8 0 14 q6 -6 0 -14z" class="sv-drop sv-drop--y ex-urine"/>${lab(54, 132)}`, [134, 108, 52, 64])}`),
  },

  urinary: {
    html: () => svg('urinary', `<rect width="320" height="200" rx="16" fill="#fff4f2"/>
      <rect x="152" y="14" width="6" height="150" rx="3" fill="#e8453c" opacity=".55"/><rect x="162" y="14" width="6" height="150" rx="3" fill="#3f8fd6" opacity=".55"/>
      ${spot('ureters', `<path d="M128 84 Q136 120 150 150" class="ur-tube"/><path d="M192 74 Q184 120 170 150" class="ur-tube"/>${lab(232, 118, 'sv-lab--side')}`, [122, 86, 76, 60])}
      ${spot('kidneys', `<path d="M110 50 q-22 0 -22 30 q0 30 26 30 q10 0 12 -10 q-8 -6 -8 -20 q0 -14 8 -20 q-2 -10 -16 -10z" class="ur-kid"/><path d="M210 40 q22 0 22 30 q0 30 -26 30 q-10 0 -12 -10 q8 -6 8 -20 q0 -14 -8 -20 q2 -10 16 -10z" class="ur-kid"/>${lab(160, 32)}`, [84, 34, 152, 82])}
      ${spot('bladder', `<path d="M138 146 q-10 0 -10 16 q0 18 32 18 q32 0 32 -18 q0 -16 -10 -16 q-10 6 -22 6 q-12 0 -22 -6z" class="ur-blad"/>${lab(232, 164, 'sv-lab--side')}`, [126, 140, 68, 44])}
      ${spot('urethra', `<rect x="156" y="178" width="8" height="18" rx="3" class="ur-tube ur-out"/>${lab(96, 192, 'sv-lab--side')}`, [146, 176, 28, 24])}`),
  },

  filter: {
    html: () => svg('filter', `<rect width="320" height="200" rx="16" fill="#f3fbff"/>${table(176, 20, 300)}
      ${spot('mix', `<path d="M226 96 h56 l-6 78 h-44z" class="fl-cup"/><path d="M229 116 h50 l-4 56 h-42z" class="fl-murky"/>${[0, 1, 2, 3, 4].map(i => `<circle cx="${238 + i * 8}" cy="${160 - (i % 2) * 8}" r="2.5" fill="#c9a26a"/>`).join('')}${txt('ماء عكر', 254, 90)}`, [218, 76, 72, 100])}
      ${spot('pour', `<path d="M100 40 h80 l-30 50 v16 h-20 v-16z" class="fl-funnel"/><path d="M108 44 h64 l-28 40 h-8z" class="fl-paper"/><g class="fl-sand">${[0, 1, 2, 3].map(i => `<circle cx="${130 + i * 7}" cy="${72 + (i % 2) * 4}" r="2.6" fill="#c9a26a"/>`).join('')}</g>
        <g class="fl-drops"><path d="M140 112 q4 6 0 10 q-4 -4 0 -10z" class="sv-drop"/><path d="M140 128 q4 6 0 10 q-4 -4 0 -10z" class="sv-drop"/></g>`, [96, 30, 92, 96])}
      <path d="M112 128 h56 l-6 46 h-44z" class="fl-cup"/><path d="M118 150 h44 l-3 22 h-38z" class="fl-clear"/>`),
  },

  kidneycut: {
    html: () => svg('kidneycut', `<rect width="320" height="200" rx="16" fill="#fff6f4"/>
      ${spot('capsule', `<path d="M168 20 q86 0 86 82 q0 82 -86 82 q-40 0 -52 -30 q24 -16 24 -52 q0 -36 -24 -52 q12 -30 52 -30z" fill="#8a4a2a" stroke="${INK}" stroke-width="2.5"/>${lab(256, 22)}`, [196, 14, 70, 30])}
      ${spot('cortex', `<path d="M168 28 q78 0 78 74 q0 74 -78 74 q-34 0 -44 -24 q22 -18 22 -50 q0 -32 -22 -50 q10 -24 44 -24z" fill="#d97a6a"/>${lab(280, 70, 'sv-lab--side')}`, [222, 52, 36, 50])}
      ${spot('medulla', `${[-54, -18, 18, 54].map(d => { const a = d * Math.PI / 180, c = [170, 102], R = 62, r0 = 26, w = 0.22; const P = (rr: number, aa: number) => `${(c[0] + Math.cos(aa) * rr).toFixed(1)} ${(c[1] + Math.sin(aa) * rr).toFixed(1)}`; return `<path d="M${P(r0, a)} L${P(R, a - w)} L${P(R, a + w)}Z" fill="#f29ac0" stroke="#c2507a" stroke-width="1.5"/>`; }).join('')}${lab(280, 140, 'sv-lab--side')}`, [190, 40, 50, 124])}
      <path d="M150 90 q20 6 26 12 q-6 6 -26 12z" fill="#f2d16a"/><path d="M140 110 q-6 30 -4 80" stroke="#f2d16a" stroke-width="9" fill="none"/>
      ${spot('artery', `<path d="M20 112 h104 q14 0 26 -4" stroke="#e8453c" stroke-width="9" fill="none" stroke-linecap="round"/>${lab(56, 132)}`, [16, 100, 120, 40])}
      ${spot('vein', `<path d="M20 82 h104 q14 0 26 4" stroke="#3f8fd6" stroke-width="9" fill="none" stroke-linecap="round"/>${lab(56, 70)}`, [16, 60, 120, 36])}`),
  },

  prints: {
    html: () => {
      // A fingerprint: kind 0 a whorl, 1 a loop, 2 an arch.
      const fp = (x: number, y: number, kind: 0 | 1 | 2, r = 16) => {
        let d = '';
        for (let i = 1; i <= 5; i++) {
          const k = i * (r / 5.5);
          d += kind === 0 ? `M${x - k} ${y} a${k} ${k * 1.2} 0 1 1 ${2 * k} 0 a${k} ${k * 1.2} 0 1 1 ${-2 * k} 0 `
            : kind === 1 ? `M${x - k} ${y + r} q0 ${-2.2 * k} ${k} ${-2.2 * k} q${k} 0 ${k} ${2.2 * k} `
              : `M${x - r} ${y + k - r / 2} q${r} ${-k * 0.9} ${2 * r} 0 `;
        }
        return `<path d="${d}" class="sv-fp"/>`;
      };
      const card = (i: number, kind: 0 | 1 | 2) => `<g class="pr-card pr-${i}"><rect x="${208 - i * 62}" y="122" width="52" height="64" rx="8" class="sv-card"/>${fp(234 - i * 62, 150, kind)}<text class="sv-t" x="${234 - i * 62}" y="182">${'أبجد'[i]}</text></g>`;
      return svg('prints', `<rect width="320" height="200" rx="16" fill="#f6f3ff"/>
        ${spot('cards', ([0, 1, 2, 1] as const).map((k, i) => card(i, k)).join('').replace('pr-card pr-1', 'pr-card pr-1 pr-match'), [14, 118, 252, 72])}
        ${spot('glass', `<path d="M128 18 h52 l-6 86 h-40z" class="pr-glass"/><g class="pr-print">${fp(154, 60, 1, 14)}</g>${emo('🖌️', 200, 40, 22, 'pr-brush')}`, [118, 10, 100, 100])}
        ${spot('match', `<circle cx="296" cy="60" r="18" class="sv-node"/>${emo('🔍', 296, 61, 22)}`, [274, 38, 44, 44])}`);
    },
  },

  skinblock: {
    html: () => svg('skinblock', `<rect width="320" height="200" rx="16" fill="#fff8f2"/>
      <rect x="40" y="152" width="200" height="34" fill="#f7d36a"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<circle cx="${52 + i * 22}" cy="169" r="9" fill="#f9e08f" stroke="#e0b84a"/>`).join('')}
      ${spot('derm', `<rect x="40" y="62" width="200" height="90" fill="#f8c6c6"/>${lab(286, 112, 'sv-lab--side')}`, [240, 92, 70, 40])}
      ${spot('vessels', `<path d="M40 136 q25 -10 50 0 t50 0 t50 0 t50 0" stroke="#e8453c" stroke-width="4" fill="none"/><path d="M40 144 q25 10 50 0 t50 0 t50 0 t50 0" stroke="#3f8fd6" stroke-width="4" fill="none"/>${lab(286, 148, 'sv-lab--side')}`, [40, 126, 200, 26])}
      ${spot('sweat', `<path d="M180 42 v40" stroke="#d0507e" stroke-width="2.5" fill="none"/><path d="M172 104 q16 -6 16 4 q0 10 -16 6 q-12 -4 0 -12 q14 -6 14 4" stroke="#d0507e" stroke-width="3" fill="none"/><path d="M180 82 v18" stroke="#d0507e" stroke-width="2.5"/>${lab(214, 130)}`, [160, 78, 44, 44])}
      ${spot('epi', `<path d="M40 42 h200 v20 q-25 8 -50 0 t-50 0 t-50 0 t-50 0z" fill="#f3b48a"/>${lab(286, 52, 'sv-lab--side')}`, [240, 36, 70, 30])}
      <path d="M100 6 L104 112" stroke="#3b2414" stroke-width="3"/><ellipse cx="104" cy="116" rx="6" ry="9" fill="#c2507a"/>
      ${spot('oil', `<circle cx="88" cy="96" r="5" fill="#f2c14e" stroke="#c9962a"/><circle cx="82" cy="102" r="4" fill="#f2c14e" stroke="#c9962a"/><circle cx="90" cy="105" r="4" fill="#f2c14e" stroke="#c9962a"/>${lab(62, 130)}`, [72, 86, 28, 28])}
      ${spot('sense', `<ellipse cx="140" cy="108" rx="10" ry="6" fill="#9aa65a" stroke="#6a7a3a"/>${lab(140, 149)}`, [126, 98, 28, 22])}
      ${spot('nerve', `<path d="M210 120 q-4 -30 2 -58 M214 120 q8 -28 0 -58" stroke="#e8c23a" stroke-width="2" fill="none"/>${lab(226, 30)}`, [200, 56, 28, 66])}
      ${spot('pores', `<circle cx="180" cy="42" r="3" fill="${INK}"/><circle cx="140" cy="42" r="2.5" fill="${INK}"/><circle cx="60" cy="42" r="2.5" fill="${INK}"/>${lab(150, 24)}`, [50, 30, 140, 20])}`),
  },
};
export { arrow, svg, spot, hitR, emo, lab, txt, spring, table, scaleTool, weight, INK };
