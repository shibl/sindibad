// The music island's little games: one renderer per kind of quest step
// (see the list at the top of worlds/grade6/tunes.js). Each draws into the
// quest card, plays real notes (synth.js) and resolves when the step is done:
//
//   runStep(step, host, ctx) → Promise<{ ok, total }>
//
// `total` counts the graded parts (a learn card has none) and `ok` the parts
// right on the first try. ctx: { say(html, mood), sfx, signal }.
// Test hook: the right button carries data-ok (see plugins/engines/kit.js).

import { num, frac } from '../format.js';
import * as S from './synth.js';
import { explore } from '../learn/explore.js';
import { makeRunStep, tracker, finish as finishStep } from '../learn/steps.js';
import { TEST, shuffle, bump } from '../learn/util.js';
import { SOLFEGE, GLASSES } from '../../worlds/grade6/tunes.js';

const wait = ms => new Promise(r => setTimeout(r, TEST ? Math.min(ms, 40) : ms));

// ---------- Notes ----------

const WHITE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SHARP_NAME = { C: 'دو♯', D: 'ره♯', F: 'فا♯', G: 'صول♯', A: 'لا♯' };
export const nameOf = note => {
  const m = /^([A-G])(#?)(\d)$/.exec(note);
  return m ? (m[2] ? SHARP_NAME[m[1]] : SOLFEGE[m[1]]) : note;
};
const whitesBetween = (from, to) => {
  const out = [];
  let o = Number(from.slice(-1)), i = WHITE.indexOf(from[0]);
  for (;;) {
    const n = `${WHITE[i]}${o}`;
    out.push(n);
    if (n === to || out.length > 30) break;
    i += 1; if (i === 7) { i = 0; o += 1; }
  }
  return out;
};
const glassOf = id => GLASSES.find(g => g.id === id);
const glassFreq = id => { const g = glassOf(id); return S.freq('C4') * g.d / g.n; };
const GLASS_COLORS = { C: '#8a63c9', D: '#e86aa0', E: '#3fbdb6', F: '#3faa5a', G: '#93c94f', A: '#f2b631', B: '#f08a3c', C2: '#8a63c9' };
const glassLetter = id => id.replace('2', '');
// A note name ('C4') sounds on the piano; a glass id ('C', 'C2') on its glass.
const tone = (s, o) => (GLASS_COLORS[s] ? S.glass(glassFreq(s), o) : S.piano(s, o));

// ---------- Drawings ----------

// A piano keyboard (always low → high from left to right, like a real one).
function keyboardHTML({ from = 'C4', to = 'C5', labels = 'names', gaps = false, marks = null }) {
  const whites = whitesBetween(from, to), n = whites.length;
  const label = w => labels === 'names' ? SOLFEGE[w[0]] : labels === 'letters' ? w[0] : '';
  let html = `<div class="tn-kb" dir="ltr" style="--n:${n}">`;
  html += whites.map(w => `<button class="tn-key tn-key--w" data-note="${w}" aria-label="${SOLFEGE[w[0]]}${w === 'C4' ? ' الوسطى' : ''}"><span>${label(w)}</span></button>`).join('');
  whites.forEach((w, i) => {
    if (i < n - 1 && SHARP_NAME[w[0]]) html += `<button class="tn-key tn-key--b" data-note="${w[0]}#${w.slice(-1)}" style="left:${((i + 1) / n) * 100}%" aria-label="ملمس أسود بين ${SOLFEGE[w[0]]} و${SOLFEGE[whites[i + 1][0]]}"></button>`;
  });
  if (gaps) whites.forEach((w, i) => { if (i < n - 1) html += `<button class="tn-gap" data-gap="${i}" style="left:${((i + 1) / n) * 100}%" aria-label="بين ${SOLFEGE[w[0]]} و${SOLFEGE[whites[i + 1][0]]}">${marks?.[i] ?? '·'}</button>`; });
  return `${html}</div>`;
}

// The grand staff: d = steps from middle C (C4 = 0, D4 = 1, B3 = −1 …).
const HALF = 10, TOP = 16, W = 320, H = TOP * 2 + 24 * HALF;
const yOf = d => TOP + (12 - d) * HALF;
const noteD = note => { const m = /^([A-G])#?(\d)$/.exec(note); return WHITE.indexOf(m[1]) + (Number(m[2]) - 4) * 7; };
const TREBLE = 'M21 86 C13 88 11 80 17 77 C24 74 27 80 24 84 M20 82 C27 64 29 30 25 14 C23 4 34 2 33 14 C32 28 10 38 9 56 C8 70 26 76 33 66 C39 56 31 46 23 50 C15 54 17 64 23 63';
const BASS = 'M10 26 C10 14 34 12 34 30 C34 46 20 58 6 66';
function staffSVG({ notes = [], targets = false, ok = null, middle = true, clefs = true } = {}) {
  let s = `<svg class="tn-staff" viewBox="0 0 ${W} ${H}" dir="ltr" role="img" aria-label="المدرج الكبير">`;
  for (const d of [2, 4, 6, 8, 10, -2, -4, -6, -8, -10]) s += `<line x1="8" x2="${W - 8}" y1="${yOf(d)}" y2="${yOf(d)}" class="tn-staff__line"/>`;
  if (middle) s += `<line x1="56" x2="${W - 8}" y1="${yOf(0)}" y2="${yOf(0)}" class="tn-staff__mid"/>`;
  s += `<line x1="8" x2="8" y1="${yOf(10)}" y2="${yOf(-10)}" class="tn-staff__line"/><path d="M4 ${yOf(10)} q-6 ${HALF * 10} 0 ${HALF * 20}" class="tn-staff__brace"/>`;
  if (clefs) {
    s += `<g transform="translate(12 ${yOf(4) - 66 * 0.92}) scale(0.92)"><path d="${TREBLE}" class="tn-clef tn-clef--g"/></g>`;
    s += `<g transform="translate(12 ${yOf(-4) - 30 * 0.62}) scale(0.62)"><path d="${BASS}" class="tn-clef tn-clef--f"/><circle cx="10" cy="26" r="4.5" class="tn-clef__dot"/><circle cx="42" cy="22" r="3.2" class="tn-clef__dot"/><circle cx="42" cy="38" r="3.2" class="tn-clef__dot"/></g>`;
  }
  if (targets) for (let d = -11; d <= 11; d++) s += `<rect class="tn-pos" data-d="${d}" ${d === ok ? 'data-ok' : ''} x="56" width="${W - 64}" y="${yOf(d) - HALF / 2}" height="${HALF}"/>`;
  s += '<g class="tn-staff__notes">';
  for (const { d, cls = '', x = 200, label = '' } of notes) s += noteHead(d, x, cls, label);
  s += '</g><g class="tn-staff__ghost"></g></svg>';
  return s;
}
function noteHead(d, x, cls = '', label = '') {
  const y = yOf(d);
  const ledger = d === 0 || d >= 12 || d <= -12 ? `<line x1="${x - 14}" x2="${x + 14}" y1="${y}" y2="${y}" class="tn-staff__ledger"/>` : '';
  return `<g class="tn-note ${cls}">${ledger}<ellipse cx="${x}" cy="${y}" rx="8.5" ry="6.2" transform="rotate(-18 ${x} ${y})"/>${label ? `<text x="${x + 16}" y="${y + 4}">${label}</text>` : ''}</g>`;
}

// Rhythm notation: q h w ee r.
function rhythmSVG(pattern, { beatW = 34 } = {}) {
  const toks = pattern.split(' ');
  const beats = toks.reduce((b, t) => b + (t === 'h' ? 2 : t === 'w' ? 4 : 1), 0);
  const w = beats * beatW + 24;
  let x = 18, s = `<svg class="tn-rhythm" viewBox="0 0 ${w} 58" dir="ltr" aria-hidden="true"><line x1="4" x2="4" y1="10" y2="50"/><line x1="${w - 4}" x2="${w - 4}" y1="10" y2="50"/>`;
  const head = (cx, hollow) => `<ellipse cx="${cx}" cy="42" rx="7" ry="5" transform="rotate(-20 ${cx} 42)" class="${hollow ? 'is-hollow' : ''}"/>`;
  const stem = cx => `<line x1="${cx + 6}" x2="${cx + 6}" y1="40" y2="10" class="tn-rhythm__stem"/>`;
  for (const t of toks) {
    if (t === 'q') { s += head(x) + stem(x); x += beatW; }
    else if (t === 'h') { s += head(x, true) + stem(x); x += beatW * 2; }
    else if (t === 'w') { s += head(x, true); x += beatW * 4; }
    else if (t === 'ee') { s += head(x) + stem(x) + head(x + beatW / 2) + stem(x + beatW / 2) + `<rect x="${x + 6}" y="9" width="${beatW / 2}" height="5" class="tn-rhythm__beam"/>`; x += beatW; }
    else if (t === 'r') { s += `<path d="M${x - 2} 16 l7 8 l-6 6 l7 9 q-8 -3 -6 5" class="tn-rhythm__rest"/>`; x += beatW; }
  }
  return `${s}</svg>`;
}
const VALUE = { w: ['مستديرة', 4], h: ['بيضاء', 2], q: ['سوداء', 1], ee: ['ذاتا سنّ', 1] };
const beatsOfToken = t => VALUE[t]?.[1] ?? 1;

// A glass with water up to n/d; `parts` draws the d equal parts.
function glassSVG({ id = 'C', n = 0, d = 1, parts = false, label = true, fill = null } = {}) {
  const col = GLASS_COLORS[id] || '#4cc3e0';
  const lv = fill ?? n / d, top = 14, bot = 104, hgt = bot - top, wy = bot - hgt * lv;
  let s = `<svg class="tn-glass" viewBox="0 0 70 ${label ? 130 : 110}" aria-hidden="true">`;
  s += `<clipPath id="gl-${id}-${d}"><path d="M10 ${top} L60 ${top} L55 ${bot} Q35 ${bot + 5} 15 ${bot} Z"/></clipPath>`;
  s += `<g clip-path="url(#gl-${id}-${d})"><rect x="0" y="${wy}" width="70" height="${bot - wy + 6}" fill="${col}" class="tn-glass__water"/><rect x="0" y="${wy}" width="70" height="4" fill="#fff" opacity=".45"/></g>`;
  if (parts) for (let k = 1; k < d; k++) { const y = bot - (hgt * k) / d; s += `<line x1="12" x2="58" y1="${y}" y2="${y}" class="tn-glass__part"/>`; }
  s += `<path d="M10 ${top} L60 ${top} L55 ${bot} Q35 ${bot + 5} 15 ${bot} Z" class="tn-glass__rim"/><path d="M16 22 L19 92" class="tn-glass__shine"/>`;
  if (label) s += `<text x="35" y="124" class="tn-glass__label">${glassLetter(id)}</text>`;
  return `${s}</svg>`;
}

// Pictures of the five folk instruments and of the singers on the stage.
const ART = {
  balalaika: '<svg viewBox="0 0 80 80"><path d="M40 70 L16 40 L64 40Z" fill="#d9894a" stroke="#3b2414" stroke-width="3" stroke-linejoin="round" transform="rotate(180 40 55)"/><circle cx="40" cy="58" r="5" fill="#3b2414"/><rect x="37" y="6" width="6" height="40" rx="2" fill="#8a5a34" stroke="#3b2414" stroke-width="2.5"/><path d="M36 4 h8 v8 h-8z" fill="#5a3a22"/><path d="M38.5 12 V64 M41.5 12 V64" stroke="#f3e6c8" stroke-width="1"/></svg>',
  panflute: '<svg viewBox="0 0 80 80">' + Array.from({ length: 8 }, (_, i) => `<rect x="${10 + i * 7.5}" y="12" width="7" height="${58 - i * 5}" rx="3" fill="${i % 2 ? '#e8c27a' : '#d9a95a'}" stroke="#3b2414" stroke-width="2"/>`).join('') + '<rect x="8" y="24" width="64" height="7" rx="3" fill="#c7373f" stroke="#3b2414" stroke-width="2"/></svg>',
  mizmar: '<svg viewBox="0 0 80 80"><path d="M14 66 L34 66 L46 20 L42 8 L38 8 L34 20Z" fill="#b8723a" stroke="#3b2414" stroke-width="3" stroke-linejoin="round" transform="rotate(-28 40 40)"/><g fill="#3b2414" transform="rotate(-28 40 40)"><circle cx="38" cy="26" r="2"/><circle cx="36.5" cy="34" r="2"/><circle cx="35" cy="42" r="2"/><circle cx="33" cy="50" r="2"/></g><ellipse cx="22" cy="68" rx="14" ry="5" fill="#d9894a" stroke="#3b2414" stroke-width="2.5" transform="rotate(-28 40 40)"/></svg>',
  harmonica: '<svg viewBox="0 0 80 80"><rect x="8" y="28" width="64" height="24" rx="5" fill="#c9d3dc" stroke="#3b2414" stroke-width="3"/><rect x="8" y="36" width="64" height="8" fill="#7a5130"/>' + Array.from({ length: 8 }, (_, i) => `<rect x="${12 + i * 7.5}" y="38" width="4.5" height="4" fill="#2a1a10"/>`).join('') + '<path d="M12 31 h56" stroke="#fff" stroke-width="2" opacity=".7"/></svg>',
  bagpipe: '<svg viewBox="0 0 80 80"><path d="M44 8 L48 44 M54 6 L56 42 M62 10 L62 44" stroke="#3b2414" stroke-width="5" stroke-linecap="round"/><path d="M44 8 L48 44 M54 6 L56 42 M62 10 L62 44" stroke="#e8c27a" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="42" cy="50" rx="24" ry="16" fill="#c7373f" stroke="#3b2414" stroke-width="3"/><path d="M22 44 l40 12 M26 58 l32 -18" stroke="#2f8a5f" stroke-width="3"/><path d="M26 60 L18 76" stroke="#3b2414" stroke-width="5" stroke-linecap="round"/><path d="M60 40 L72 28" stroke="#3b2414" stroke-width="4" stroke-linecap="round"/></svg>',
  monologue: '<svg viewBox="0 0 80 90"><rect x="24" y="40" width="32" height="38" rx="10" fill="#f2c14e" stroke="#3b2414" stroke-width="3"/><circle cx="40" cy="26" r="15" fill="#f6c9a0" stroke="#3b2414" stroke-width="3"/><path d="M27 15 L53 15 L50 4 L30 4Z" fill="#c7373f" stroke="#3b2414" stroke-width="2.5"/><path d="M50 4 q8 2 6 10" stroke="#3b2414" stroke-width="2" fill="none"/><circle cx="34" cy="25" r="2" fill="#3b2414"/><circle cx="46" cy="25" r="2" fill="#3b2414"/><path d="M31 31 q9 9 18 0" fill="#fff" stroke="#3b2414" stroke-width="2.5"/><path d="M58 44 L70 34" stroke="#3b2414" stroke-width="4" stroke-linecap="round"/><path d="M64 24 q4 -6 8 0 M68 16 q3 -4 6 0" stroke="#d0507e" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
  solo: '<svg viewBox="0 0 80 90"><path d="M22 80 Q24 42 40 42 Q56 42 58 80Z" fill="#8a63c9" stroke="#3b2414" stroke-width="3"/><circle cx="40" cy="27" r="14" fill="#f6c9a0" stroke="#3b2414" stroke-width="3"/><path d="M26 24 Q26 8 40 9 Q54 8 54 24 Q48 14 40 15 Q32 14 26 24Z" fill="#5a3a22"/><circle cx="35" cy="27" r="2" fill="#3b2414"/><circle cx="45" cy="27" r="2" fill="#3b2414"/><ellipse cx="40" cy="34" rx="3" ry="2.5" fill="#c7373f"/><rect x="56" y="30" width="5" height="18" rx="2" fill="#3b2414" transform="rotate(25 58 38)"/><circle cx="61" cy="27" r="5" fill="#9aa5ad" stroke="#3b2414" stroke-width="2"/><path d="M66 12 v10 M66 12 l6 -2" stroke="#3b2414" stroke-width="2.5" fill="none"/><circle cx="64" cy="22" r="2.5" fill="#3b2414"/></svg>',
  choir: '<svg viewBox="0 0 90 90">' + [[18, '#3f8fd6'], [45, '#d0507e'], [72, '#2f8a5f']].map(([x, c]) => `<path d="M${x - 13} 82 Q${x - 12} 52 ${x} 52 Q${x + 12} 52 ${x + 13} 82Z" fill="${c}" stroke="#3b2414" stroke-width="2.5"/><circle cx="${x}" cy="40" r="11" fill="#f6c9a0" stroke="#3b2414" stroke-width="2.5"/><ellipse cx="${x}" cy="45" rx="3" ry="2.5" fill="#c7373f"/><rect x="${x - 8}" y="58" width="16" height="11" rx="2" fill="#fff8e8" stroke="#3b2414" stroke-width="2"/>`).join('') + '</svg>',
};

// Picture cards for `show`.
const SHOW = {
  keyboard: () => keyboardHTML({ from: 'C4', to: 'C5', labels: 'names' }),
  tones: () => keyboardHTML({ from: 'C4', to: 'C5', labels: 'names', gaps: true, marks: ['⌒', '⌒', '∨', '⌒', '⌒', '⌒', '∨'] }),
  signs: () => '<div class="tn-signs"><span><b>♯</b>دييز<small>يرفع ½</small></span><span><b>♭</b>بيمول<small>يخفض ½</small></span><span><b>♮</b>بيكار<small>يعيد</small></span></div>',
  keysig: () => `<div class="tn-keysig">${staffSVG({ notes: [], middle: false, clefs: true }).replace('</svg>', `<text x="58" y="${yOf(10) + 6}" class="tn-sig">♯</text><text x="80" y="${yOf(10) + 6}" class="tn-sig-cap">لائحة</text><text x="200" y="${yOf(5) + 6}" class="tn-sig">♭</text><text x="214" y="${yOf(5) + 6}" class="tn-sig-cap">اعتراضية</text></svg>`)}</div>`,
  values: () => `<div class="tn-values">${Object.entries(VALUE).map(([t, [n, b]]) => `<span>${rhythmSVG(t, { beatW: 26 })}<b>${n}</b><small>${b === 1 ? 'زمن' : `${num(b)} ${b === 2 ? 'زمنان' : 'أزمنة'}`}</small></span>`).join('')}</div>`,
  measure: () => `<div class="tn-measure-pic"><b class="tn-ts" dir="ltr"><i>4</i><i>4</i></b>${rhythmSVG('q q h')}${rhythmSVG('ee q q q')}</div>`,
  anacrusis: () => `<div class="tn-measure-pic tn-ana"><span>${rhythmSVG('q')}<small>${num(1)}</small></span><span class="tn-ana__mid">${rhythmSVG('q q q q')}<small>${num(1)}</small></span><span>${rhythmSVG('h q')}<small>${num(3)}</small></span><p dir="ltr">${num(1)} + ${num(3)} = ${num(4)}</p></div>`,
  grand: () => staffSVG({ notes: [{ d: 0, x: 200, cls: 'is-mid', label: 'دو الوسطى' }] }),
  range: () => keyboardHTML({ from: 'G3', to: 'C5', labels: 'names' }).replace('class="tn-kb"', 'class="tn-kb tn-kb--range"'),
  letters: () => `<table class="tn-letters"><tr>${['لا', 'سي', 'دو', 'ره', 'مي', 'فا', 'صول'].map(n => `<td>${n}</td>`).join('')}</tr><tr>${['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(n => `<td>${n}</td>`).join('')}</tr></table>`,
  hymn: () => `<div class="tn-hymn" dir="ltr">${[['Ut', ' queant laxis'], ['Re', 'sonare fibris'], ['Mi', 'ra gestorum'], ['Fa', 'muli tuorum'], ['Sol', 've polluti'], ['La', 'bii reatum'], ['S', 'ancte ', 'I', 'oannes']].map(p => `<p>${p.length > 2 ? `<b>${p[0]}</b>${p[1]}<b>${p[2]}</b>${p[3]}` : `<b>${p[0]}</b>${p[1]}`}</p>`).join('')}</div>`,
  fractions: () => `<div class="tn-glassrow">${GLASSES.map(g => `<span>${glassSVG({ ...g })}<small dir="ltr">${g.d === 1 ? num(1) : frac(g.n, g.d)}</small></span>`).join('')}</div>`,
  choir: () => `<div class="tn-art-row">${ART.solo}${ART.choir}</div>`,
  curtain: () => '<div class="tn-curtain" aria-hidden="true"><i></i><b>🎭</b><i></i></div>',
  heritage: () => '<div class="tn-icons"><span>🎡<small>نواعير حماة</small></span><span>🏛️<small>مسرح بصرى</small></span><span>🏰<small>قلعة الحصن</small></span></div>',
  ships: () => `<div class="tn-art-row">${ART.balalaika}${ART.panflute}${ART.harmonica}</div>`,
};
export const showHTML = name => (SHOW[name] ? `<div class="tn-show">${SHOW[name]()}</div>` : '');

// ---------- «أتعلّم» pictures (core/learn/explore.js) ----------
// Each draws a picture whose parts carry data-spot="<spot id>"; the spots
// the picture lacks become cards under it.

const tpl = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const idsOf = step => new Set(step.spots.map(x => x.id));
const hymnLines = [['Ut', 'Ut', ' queant laxis'], ['Re', 'Re', 'sonare fibris'], ['Mi', 'Mi', 'ra gestorum'], ['Fa', 'Fa', 'muli tuorum'], ['Sol', 'Sol', 've polluti'], ['La', 'La', 'bii reatum'], ['Si', 'S', 'ancte ', 'I', 'oannes']];
const svgNote = (id, d, x) => {
  const y = yOf(d), ledger = d === 0 ? `<line x1="${x - 14}" x2="${x + 14}" y1="${y}" y2="${y}" class="tn-staff__ledger"/>` : '';
  return `<g data-spot="${id}" class="tn-note lx-n"><rect x="${x - 13}" y="${y - 11}" width="26" height="22" rx="8" class="lx-hit"/>${ledger}<ellipse cx="${x}" cy="${y}" rx="8.5" ry="6.2" transform="rotate(-18 ${x} ${y})"/><text x="${x}" y="${d >= 0 ? y - 12 : y + 20}" class="lx-label lx-n__t"></text></g>`;
};
const hit = (id, x, y, w, h) => `<rect data-spot="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="lx-hit"/>`;

const LX_VIEWS = {
  keyboard(step) {
    const kb = step.kb || {}, ids = idsOf(step);
    const el = tpl(keyboardHTML({ from: kb.from || 'C4', to: kb.to || 'C5', labels: kb.labels ?? 'names', gaps: !!kb.gaps, marks: kb.gaps ? Array(16).fill('') : null }));
    el.querySelectorAll('.tn-key').forEach(k => {
      if (ids.has(k.dataset.note)) k.dataset.spot = k.dataset.note;
      if (kb.labels === 'none') k.querySelector('span')?.classList.add('lx-label');
    });
    el.querySelectorAll('.tn-gap').forEach(g => {
      const id = `gap${g.dataset.gap}`;
      if (ids.has(id)) { g.dataset.spot = id; g.innerHTML = '<span class="lx-label"></span>'; } else g.textContent = '·';
    });
    return el.outerHTML;
  },
  // The grand staff in parts: the clefs, the two groups of lines, middle C.
  grand: () => staffSVG({ notes: [] }).replace('</svg>', hit('treble', 4, yOf(12), 48, yOf(1) - yOf(12))
    + hit('glines', 58, yOf(10) - 6, W - 70, yOf(2) - yOf(10) + 12) + hit('mid', 58, yOf(0) - 6, W - 70, 12)
    + hit('flines', 58, yOf(-2) - 6, W - 70, yOf(-10) - yOf(-2) + 12) + hit('bass', 4, yOf(-1), 48, yOf(-11) - yOf(-1)) + '</svg>'),
  // Notes on the grand staff, one per spot (spot id = the note), left to right.
  notes: step => staffSVG({ notes: [] }).replace('</svg>', step.spots.map((x, i) => svgNote(x.id, noteD(x.id), 84 + i * 34)).join('') + '</svg>'),
  // One treble staff, large: a ♯ right after the clef (a key signature)
  // and a ♭ in front of one note (an accidental).
  keysig: () => {
    const y = d => 22 + (10 - d) * 9, head = (d, x) => `<ellipse cx="${x}" cy="${y(d)}" rx="8" ry="5.8" transform="rotate(-18 ${x} ${y(d)})" class="lx-ks__note"/>`;
    return `<svg class="lx-ks" viewBox="0 0 320 132" dir="ltr" role="img" aria-label="سطر موسيقي فيه إشارتا تحويل">${[2, 4, 6, 8, 10].map(d => `<line x1="6" x2="314" y1="${y(d)}" y2="${y(d)}" class="tn-staff__line"/>`).join('')}
      <g transform="translate(10 ${y(4) - 66 * 0.83}) scale(0.83)"><path d="${TREBLE}" class="tn-clef tn-clef--g"/></g>
      ${head(4, 112)}${head(6, 150)}${head(5, 214)}${head(3, 252)}${head(2, 290)}
      <g data-spot="sig"><rect x="54" y="${y(10) - 16}" width="28" height="30" rx="7" class="lx-hit"/><text x="60" y="${y(10) + 8}" class="lx-ks__sign">♯</text><text x="68" y="124" class="lx-label lx-ks__cap"></text></g>
      <g data-spot="acc"><rect x="184" y="${y(5) - 18}" width="22" height="32" rx="7" class="lx-hit"/><text x="188" y="${y(5) + 7}" class="lx-ks__sign">♭</text><text x="200" y="124" class="lx-label lx-ks__cap"></text></g></svg>`;
  },
  glasses: step => `<div class="lx-glasses" dir="ltr">${GLASSES.filter(g => idsOf(step).has(g.id)).map(g => `<button class="lx-glass" data-spot="${g.id}" aria-label="كوب ${glassLetter(g.id)}">${glassSVG({ ...g })}<small class="lx-label"></small></button>`).join('')}</div>`,
  hymn: () => `<div class="tn-hymn lx-hymn" dir="ltr">${hymnLines.map(([id, ...p]) => `<p data-spot="${id}">${p.length > 2 ? `<b>${p[0]}</b>${p[1]}<b>${p[2]}</b>${p[3]}` : `<b>${p[0]}</b>${p[1]}`}<span class="lx-label"></span></p>`).join('')}</div>`,
  tempo: step => `<div class="lx-tempo"><div class="lx-tempo__zones" dir="ltr">${step.spots.map(z => `<button class="lx-zone" data-spot="${z.id}"><span>${z.icon}</span><b>${z.label}</b></button>`).join('')}</div>
    <input type="range" class="lx-tempo__range" dir="ltr" min="40" max="200" value="90" aria-label="السرعة"><p class="lx-tempo__bpm"><b>${num(90)}</b> نبضة في الدقيقة</p></div>`,
  measure: () => `<div class="lx-measure" dir="ltr"><b class="tn-ts" data-spot="ts"><i>4</i><i>4</i></b><span data-spot="m1">${rhythmSVG('q q h')}</span><span data-spot="m2">${rhythmSVG('ee q q q')}</span></div>`,
  ana: () => `<div class="lx-measure lx-ana" dir="ltr"><span data-spot="first">${rhythmSVG('q')}<small class="lx-label"></small></span><span data-spot="mid">${rhythmSVG('q q q q')}<small class="lx-label"></small></span><span data-spot="last">${rhythmSVG('h q')}<small class="lx-label"></small></span></div>`,
  portrait: step => `<div class="lx-portrait"><span class="lx-portrait__frame">${step.person.icon}</span><div><b>${step.person.name}</b><small>${step.person.role}</small></div></div>`,
  art: step => `<div class="lx-art">${ART[step.art] || ''}</div>`,
};
const LX_ART = { ...ART, ...Object.fromEntries(['w', 'h', 'q', 'ee'].map(t => [`v-${t}`, rhythmSVG(t, { beatW: 22 })])) };

// What a spot does when it opens: play it, light keys, move the 3D island.
const lightKeys = (host, notes, ctx, gap) => notes.forEach((n, k) => setTimeout(() => {
  if (ctx.signal.aborted) return;
  const key = host.querySelector(`.tn-key[data-note="${n}"]`);
  if (key) { key.classList.add('is-lit'); setTimeout(() => key.classList.remove('is-lit'), gap * 1000 + 250); }
  S.piano(n); ctx.onNote?.(n);
}, k * gap * 1000));
const HOLD = { w: 4, h: 2, q: 1, ee: 1 };
function spotSound(ctx) {
  return (s, el, host) => {
    if (s.light) lightKeys(host, s.light, ctx, 0.6);
    else if (s.pair) {
      lightKeys(host, s.pair.slice(0, 2), ctx, 0.45);
      const black = s.pair[2] && host.querySelector(`.tn-key[data-note="${s.pair[2]}"]`);
      if (black) { black.classList.add('is-mark'); setTimeout(() => black.classList.remove('is-mark'), 1600); }
    } else if (el.dataset.note) { S.piano(el.dataset.note); bump(el, 'is-down'); ctx.onNote?.(el.dataset.note); }
    if (s.note) { S.piano(s.note); ctx.onNote?.(s.note); }
    if (s.glass) { S.glass(glassFreq(s.id)); ctx.onGlass?.(s.id); }
    if (s.hold) {
      const spb = 60 / 76, n = HOLD[s.hold];
      if (s.hold === 'ee') { S.piano('G4', { dur: spb }); S.piano('G4', { at: spb / 2, dur: spb }); } else S.piano('G4', { dur: n * spb * 1.6 });
      S.metronome(76, n);
      el.style.setProperty('--hold', `${n * spb}s`); bump(el, 'is-holding');
    }
    if (s.bpm) {
      const r = host.querySelector('.lx-tempo__range');
      if (r) { r.value = s.bpm; host.querySelector('.lx-tempo__bpm b').textContent = num(s.bpm); }
      S.metronome(s.bpm, Math.max(4, Math.round(s.bpm / 30))); ctx.race?.(s.bpm);
    }
    if (s.rhythm) S.playRhythm(s.rhythm, 84);
    if (s.play) playSound(s.play);
  };
}
// A picture's own controls: every key sounds; the tempo slider finds the
// speed words as it moves.
function lxMount(ctx) {
  return (host, step, tap) => {
    host.querySelectorAll('.tn-key:not(.lx-spot)').forEach(k => k.addEventListener('click', () => { S.piano(k.dataset.note); bump(k, 'is-down'); ctx.onNote?.(k.dataset.note); }));
    const range = host.querySelector('.lx-tempo__range');
    if (!range) return;
    const out = host.querySelector('.lx-tempo__bpm b');
    range.addEventListener('input', () => { out.textContent = num(range.value); });
    range.addEventListener('change', () => {
      const v = +range.value, z = step.spots.find(x => v >= x.min && v <= x.max);
      if (z) tap(host.querySelector(`[data-spot="${z.id}"]`));
    });
  };
}

// ---------- Sounds for `play` / `listen` ----------

export function playSound(p) {
  if (!p) return 0;
  if (p.notes) return S.phrase(p.notes, { step: p.step || 0.42 });
  if (p.tempo) return S.metronome(p.tempo, Math.max(6, Math.round(p.tempo / 22)));
  if (p.longa) return S.longa();
  if (p.canon) return S.canon();
  if (p.inst) return S.instrument(p.inst);
  if (p.choir) { S.choir(); return 2.5; }
  if (p.solo) return S.phrase(['E4', 'F4', 'G4', 'A4', 'G4', 'F4', 'G4', 'E4', 'D4', 'E4', 'C4'], { step: 0.22 });
  if (p.glasses) { p.glasses.forEach((g, i) => S.glass(glassFreq(g), { at: i * 0.9 })); return p.glasses.length * 0.9 + 1; }
  if (p.rhythm) return S.playRhythm(p.rhythm, p.bpm).seconds;
  return 0;
}
const playBtn = (label = '▶ اسمع') => `<button class="tn-play" data-play>${label}</button>`;

// Shared bits (core/learn/steps.ts): tracker() for a miss (hint first, then
// show the answer), and finish() for the end of a step (the helper explains;
// «تابِع» moves on), here with the island's own look.
const finish = (host, step, ctx, resolve, result) => finishStep(host, step, ctx, resolve, result, { look: 'tn' });
function wirePlay(host, p, ctx, auto = true) {
  const b = host.querySelector('[data-play]');
  if (!b || !p) return;
  b.addEventListener('click', () => { ctx.sfx.tap(); bump(b, 'is-on'); playSound(p); });
  if (auto && !TEST) setTimeout(() => { if (!ctx.signal.aborted && b.isConnected) playSound(p); }, 600);
}

const KINDS = {
  // «أتعلّم»: discover each part of a picture before the questions.
  explore(step, host, ctx, resolve) {
    explore(step, host, ctx, resolve, { views: LX_VIEWS, art: LX_ART, onSpot: spotSound(ctx), mount: lxMount(ctx) });
  },

  // A short teaching card.
  learn(step, host, ctx, resolve) {
    host.innerHTML = `<div class="tn-learn"><h3>${step.title}</h3>${showHTML(step.show)}<div class="tn-text">${step.html}</div>
      <div class="tn-row">${step.play ? playBtn() : ''}<button class="btn btn--gold" data-next data-step>فهمت ✓</button></div></div>`;
    if (step.say) ctx.say(step.say);
    wirePlay(host, step.play, ctx);
    if (step.show === 'keyboard' || step.show === 'range' || step.show === 'tones') host.querySelectorAll('.tn-key').forEach(k => k.addEventListener('click', () => { S.piano(k.dataset.note); bump(k, 'is-down'); }));
    const next = host.querySelector('[data-next]');
    next.focus({ preventScroll: true });
    next.addEventListener('click', () => { ctx.sfx.tap(); resolve({ ok: 0, total: 0 }); }, { once: true });
  },

  // A question with options (options[0] is right).
  choice(step, host, ctx, resolve) {
    const opts = shuffle(step.options.map((t, i) => ({ t, ok: i === 0, art: step.art?.[i] })));
    const layout = step.layout || (step.art ? 'art' : 'list');
    host.innerHTML = `<div class="tn-q tn-q--${layout}"><p class="tn-ask">${step.q}</p>${showHTML(step.show)}
      ${step.listen ? `<div class="tn-row">${playBtn(step.listen.tempo ? '▶ اسمع السرعة' : '▶ اسمع')}</div>` : ''}
      <div class="tn-opts">${opts.map((o, i) => `<button class="tn-opt" data-i="${i}" ${o.ok ? 'data-ok' : ''}>${o.art ? `<span class="tn-opt__art">${ART[o.art] || ''}</span>` : ''}<span class="tn-opt__t" ${/^[A-Za-z0-9/ ]+$/.test(o.t) ? 'dir="ltr"' : ''}>${o.t}</span></button>`).join('')}</div></div>`;
    if (step.say) ctx.say(step.say);
    if (step.listen) { wirePlay(host, step.listen, ctx); if (step.listen.tempo) ctx.race?.(step.listen.tempo); }
    const right = host.querySelector('[data-ok]');
    const tr = tracker(step, ctx, () => right.classList.add('is-reveal'));
    host.querySelector('.tn-opts').addEventListener('click', e => {
      const b = e.target.closest('.tn-opt');
      if (!b || host.classList.contains('is-solved')) return;
      if (!('ok' in b.dataset)) { b.disabled = true; tr.miss(b); return; }
      b.classList.add('is-right');
      ctx.sfx.good();
      if (layout === 'stage') host.querySelector('.tn-opts').classList.add('is-spot');
      finish(host, step, ctx, resolve, { ok: tr.misses ? 0 : 1, total: 1 });
    });
  },

  // Play notes on the piano in order.
  keys(step, host, ctx, resolve) {
    const to = step.play.some(n => /^(D|E|F|G|A|B)#?5$/.test(n)) ? 'E5' : 'C5';
    host.innerHTML = `<div class="tn-q"><p class="tn-ask">${step.q}</p>
      ${step.play.length > 1 ? `<div class="tn-seq" dir="ltr">${step.play.map(() => '<i></i>').join('')}</div>` : ''}
      ${keyboardHTML({ from: 'C4', to, labels: step.labels || 'names' })}</div>`;
    const keys = [...host.querySelectorAll('.tn-key')];
    const dots = [...host.querySelectorAll('.tn-seq i')];
    let i = 0;
    const mark = () => keys.forEach(k => { k.toggleAttribute('data-ok', k.dataset.note === step.play[i]); k.classList.remove('is-reveal'); });
    const tr = tracker(step, ctx, () => keys.find(k => k.dataset.note === step.play[i])?.classList.add('is-reveal'));
    mark();
    host.querySelector('.tn-kb').addEventListener('click', e => {
      const k = e.target.closest('.tn-key');
      if (!k || host.classList.contains('is-solved')) return;
      S.piano(k.dataset.note);
      bump(k, 'is-down');
      ctx.onNote?.(k.dataset.note);
      if (k.dataset.note !== step.play[i]) { tr.miss(k); return; }
      k.classList.add('is-lit'); setTimeout(() => k.classList.remove('is-lit'), 500);
      dots[i]?.classList.add('is-on');
      i += 1;
      if (i < step.play.length) { mark(); return; }
      keys.forEach(x => x.removeAttribute('data-ok'));
      ctx.sfx.good();
      finish(host, step, ctx, resolve, { ok: tr.misses ? 0 : 1, total: 1 });
    });
  },

  // Tap the two places on the keyboard with no black key between.
  gaps(step, host, ctx, resolve) {
    host.innerHTML = `<div class="tn-q"><p class="tn-ask">${step.q}</p>${keyboardHTML({ from: 'C4', to: 'C5', labels: 'names', gaps: true })}</div>`;
    const RIGHT = ['2', '6'];
    const found = new Set();
    const gaps = [...host.querySelectorAll('.tn-gap')];
    gaps.forEach(g => { if (RIGHT.includes(g.dataset.gap)) g.setAttribute('data-ok', ''); });
    const tr = tracker(step, ctx, () => gaps.forEach(g => { if (RIGHT.includes(g.dataset.gap) && !found.has(g.dataset.gap)) g.classList.add('is-reveal'); }));
    host.querySelector('.tn-kb').addEventListener('click', e => {
      const k = e.target.closest('.tn-key');
      if (k) { S.piano(k.dataset.note); bump(k, 'is-down'); return; }
      const g = e.target.closest('.tn-gap');
      if (!g || host.classList.contains('is-solved') || found.has(g.dataset.gap)) return;
      const ws = host.querySelectorAll('.tn-key--w');
      const a = ws[+g.dataset.gap].dataset.note, b = ws[+g.dataset.gap + 1].dataset.note;
      S.piano(a); S.piano(b, { at: 0.25 });
      if (!RIGHT.includes(g.dataset.gap)) { tr.miss(g); g.textContent = '✗'; setTimeout(() => { g.textContent = '·'; }, 700); return; }
      found.add(g.dataset.gap);
      g.textContent = '∨'; g.classList.add('is-right'); g.removeAttribute('data-ok'); g.classList.remove('is-reveal');
      ctx.sfx.good();
      if (found.size === 2) finish(host, step, ctx, resolve, { ok: tr.misses ? 0 : 1, total: 1 });
    });
  },

  // Mark each step of the C major scale: whole tone or half tone.
  pattern(step, host, ctx, resolve) {
    const ANSWER = ['w', 'w', 'h', 'w', 'w', 'w', 'h'];
    host.innerHTML = `<div class="tn-q"><p class="tn-ask">${step.q}</p>${keyboardHTML({ from: 'C4', to: 'C5', labels: 'names', gaps: true })}
      <div class="tn-opts tn-opts--two"><button class="tn-opt" data-v="w">⌒ بُعد</button><button class="tn-opt" data-v="h">∨ نصف بُعد</button></div></div>`;
    const gaps = [...host.querySelectorAll('.tn-gap')], ws = [...host.querySelectorAll('.tn-key--w')];
    gaps.forEach(g => { g.disabled = true; });
    let i = 0;
    const btns = [...host.querySelectorAll('[data-v]')];
    const tr = tracker(step, ctx, () => btns.find(b => b.dataset.v === ANSWER[i])?.classList.add('is-reveal'));
    const show = () => {
      gaps.forEach((g, k) => g.classList.toggle('is-now', k === i));
      ws.forEach((w, k) => w.classList.toggle('is-lit', k === i || k === i + 1));
      btns.forEach(b => { b.toggleAttribute('data-ok', b.dataset.v === ANSWER[i]); b.classList.remove('is-reveal'); });
      S.piano(ws[i].dataset.note); S.piano(ws[i + 1].dataset.note, { at: 0.3 });
    };
    show();
    host.querySelector('.tn-opts').addEventListener('click', e => {
      const b = e.target.closest('[data-v]');
      if (!b || host.classList.contains('is-solved')) return;
      if (b.dataset.v !== ANSWER[i]) { tr.miss(b); return; }
      gaps[i].textContent = b.dataset.v === 'w' ? '⌒' : '∨';
      gaps[i].classList.add('is-right');
      ctx.sfx.tap();
      i += 1;
      if (i < ANSWER.length) { show(); return; }
      gaps.forEach(g => g.classList.remove('is-now')); ws.forEach(w => w.classList.remove('is-lit')); btns.forEach(x => x.removeAttribute('data-ok'));
      ctx.sfx.good();
      S.phrase(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], { step: 0.3 });
      finish(host, step, ctx, resolve, { ok: tr.misses ? 0 : 1, total: 1 });
    });
  },

  // Rain drops: put each named note on the grand staff.
  staff(step, host, ctx, resolve) {
    let i = 0, ok = 0, total = step.drops.length;
    const placed = [];
    const xs = [96, 136, 176, 216, 256, 290];
    const draw = () => {
      const [note, label] = step.drops[i] || [];
      host.innerHTML = `<div class="tn-q tn-q--staff"><p class="tn-ask">${step.q}</p>
        <div class="tn-rain">${step.drops.map(([, l], k) => `<span class="${k < i ? 'is-done' : k === i ? 'is-now' : ''}">💧<small>${l}</small></span>`).join('')}</div>
        <div class="tn-staffbox">${staffSVG({ notes: placed, targets: i < total, ok: note ? noteD(note) : null })}${note ? `<span class="tn-drop" aria-live="polite">💧 ${label}</span>` : ''}</div></div>`;
    };
    draw();
    let tr = tracker(step, ctx, () => host.querySelector('.tn-pos[data-ok]')?.classList.add('is-reveal'));
    let misses = 0;
    const svgPos = e => {
      const svg = host.querySelector('.tn-staff'), r = svg.getBoundingClientRect();
      const yv = ((e.clientY - r.top) / r.height) * H;
      return Math.max(-11, Math.min(11, Math.round(12 - (yv - TOP) / HALF)));
    };
    host.addEventListener('pointermove', e => {
      if (!e.target.closest('.tn-staff') || i >= total) return;
      const g = host.querySelector('.tn-staff__ghost');
      if (g) g.innerHTML = noteHead(svgPos(e), xs[i % xs.length], 'is-ghost');
    });
    host.addEventListener('click', e => {
      if (!e.target.closest('.tn-staff') || i >= total || host.classList.contains('is-solved')) return;
      const d = svgPos(e), [note, label] = step.drops[i];
      if (d !== noteD(note)) {
        misses += 1;
        tr.miss(host.querySelector('.tn-staffbox'));
        S.piano(note, { vol: 0.15 });
        if (misses >= 2) host.querySelector('.tn-pos[data-ok]')?.classList.add('is-reveal');
        return;
      }
      if (!misses) ok += 1;
      placed.push({ d, x: xs[i % xs.length], cls: 'is-in', label });
      S.piano(note);
      ctx.sfx.good();
      ctx.onNote?.(note);
      i += 1; misses = 0; tr = tracker(step, ctx, () => host.querySelector('.tn-pos[data-ok]')?.classList.add('is-reveal'));
      draw();
      if (i >= total) { S.phrase(step.drops.map(dr => dr[0]), { step: 0.35 }); finish(host, step, ctx, resolve, { ok, total }); }
      else ctx.say(`👍 والآن: <b>${step.drops[i][1]}</b>`, 'happy');
    });
  },

  // A note on the staff: what is it?
  name(step, host, ctx, resolve) {
    const opts = shuffle(step.options.map((t, i) => ({ t, ok: i === 0 })));
    host.innerHTML = `<div class="tn-q tn-q--staff"><p class="tn-ask">${step.q}</p><div class="tn-staffbox">${staffSVG({ notes: [{ d: noteD(step.note), x: 200, cls: 'is-in' }] })}</div>
      <div class="tn-opts tn-opts--row">${opts.map(o => `<button class="tn-opt" ${o.ok ? 'data-ok' : ''}>${o.t}</button>`).join('')}</div></div>`;
    S.piano(step.note);
    const right = host.querySelector('[data-ok]');
    const tr = tracker(step, ctx, () => right.classList.add('is-reveal'));
    host.querySelector('.tn-opts').addEventListener('click', e => {
      const b = e.target.closest('.tn-opt');
      if (!b || host.classList.contains('is-solved')) return;
      if (!('ok' in b.dataset)) { b.disabled = true; tr.miss(b); return; }
      b.classList.add('is-right');
      S.piano(step.note);
      ctx.sfx.good();
      finish(host, step, ctx, resolve, { ok: tr.misses ? 0 : 1, total: 1 });
    });
  },

  // Tap the items in order.
  order(step, host, ctx, resolve) {
    const items = step.items;
    const chip = (t, k) => {
      if (step.fracs) { const [n, d] = t.split('/').map(Number); const g = GLASSES.find(x => x.n === n && x.d === (d || 1)) || GLASSES[0]; return `<button class="tn-chip tn-chip--glass" data-k="${k}">${glassSVG({ ...g, label: false })}<small dir="ltr">${d ? frac(n, d) : num(n)}</small></button>`; }
      return `<button class="tn-chip" data-k="${k}" ${step.latin ? 'dir="ltr"' : ''}>${t}</button>`;
    };
    host.innerHTML = `<div class="tn-q"><p class="tn-ask">${step.q}</p>${showHTML(step.show)}
      <div class="tn-slots" ${step.latin || step.fracs ? 'dir="ltr"' : ''}>${items.map(() => '<i></i>').join('')}</div>
      <div class="tn-pool">${shuffle(items.map((t, k) => ({ t, k }))).map(({ t, k }) => chip(t, k)).join('')}</div></div>`;
    let i = 0;
    const chips = [...host.querySelectorAll('.tn-chip')], slots = [...host.querySelectorAll('.tn-slots i')];
    const mark = () => chips.forEach(c => { c.toggleAttribute('data-ok', +c.dataset.k === i); c.classList.remove('is-reveal'); });
    const tr = tracker(step, ctx, () => chips.find(c => +c.dataset.k === i)?.classList.add('is-reveal'));
    mark();
    const sound = k => { const s = step.sound?.[k]; if (s) tone(s); };
    host.querySelector('.tn-pool').addEventListener('click', e => {
      const c = e.target.closest('.tn-chip');
      if (!c || c.disabled || host.classList.contains('is-solved')) return;
      if (+c.dataset.k !== i) { tr.miss(c); return; }
      sound(i);
      slots[i].innerHTML = c.innerHTML; slots[i].classList.add('is-on');
      c.disabled = true; c.classList.add('is-used');
      i += 1;
      if (i < items.length) { ctx.sfx.tap(); mark(); return; }
      chips.forEach(x => x.removeAttribute('data-ok'));
      ctx.sfx.good();
      if (step.sound) S.phrase(step.sound, { step: 0.4, inst: tone });
      finish(host, step, ctx, resolve, { ok: tr.misses ? 0 : 1, total: 1 });
    });
  },

  // Hear a rhythm, pick its card.
  rhythm(step, host, ctx, resolve) {
    const cards = shuffle([{ p: step.pattern, ok: true }, ...step.others.map(p => ({ p }))]);
    host.innerHTML = `<div class="tn-q"><p class="tn-ask">${step.q}</p><div class="tn-row">${playBtn('▶ اسمع الإيقاع')}</div>
      <div class="tn-cards">${cards.map((c, k) => `<div class="tn-card-r"><button class="tn-opt tn-opt--r" data-k="${k}" ${c.ok ? 'data-ok' : ''} aria-label="البطاقة ${num(k + 1)}">${rhythmSVG(c.p)}</button><button class="tn-mini" data-hear="${k}" aria-label="اسمع البطاقة">🔈</button></div>`).join('')}</div></div>`;
    wirePlay(host, { rhythm: step.pattern, bpm: step.bpm }, ctx);
    const right = host.querySelector('[data-ok]');
    const tr = tracker(step, ctx, () => right.classList.add('is-reveal'));
    host.querySelector('.tn-cards').addEventListener('click', e => {
      const h = e.target.closest('[data-hear]');
      if (h) { S.playRhythm(cards[+h.dataset.hear].p, step.bpm); return; }
      const b = e.target.closest('.tn-opt');
      if (!b || host.classList.contains('is-solved')) return;
      if (!('ok' in b.dataset)) { b.disabled = true; tr.miss(b); return; }
      b.classList.add('is-right');
      ctx.sfx.good();
      S.playRhythm(step.pattern, step.bpm);
      finish(host, step, ctx, resolve, { ok: tr.misses ? 0 : 1, total: 1 });
    });
  },

  // Hear a rhythm, then tap it back on the drum.
  drum(step, host, ctx, resolve) {
    const { hits } = S.beatsOf(step.pattern);
    const spb = 60 / step.bpm;
    host.innerHTML = `<div class="tn-q"><p class="tn-ask">${step.q}</p>${rhythmSVG(step.pattern)}
      <div class="tn-lights" dir="ltr">${hits.map(() => '<i></i>').join('')}</div>
      <div class="tn-row">${playBtn('▶ اسمع')}<button class="btn btn--gold tn-go" data-turn>🥁 دوري!</button></div>
      <button class="tn-drum" data-step data-taps="${hits.length}" aria-label="الطبلة" disabled><span>دُم</span></button>
      <p class="tn-count" aria-live="polite"></p></div>`;
    const lights = [...host.querySelectorAll('.tn-lights i')];
    const flash = k => { const l = lights[k]; if (l) { l.classList.add('is-on'); setTimeout(() => l.classList.remove('is-on'), 180); } };
    const play = host.querySelector('[data-play]'), go = host.querySelector('[data-turn]'), drumBtn = host.querySelector('.tn-drum'), count = host.querySelector('.tn-count');
    play.addEventListener('click', () => { ctx.sfx.tap(); S.playRhythm(step.pattern, step.bpm, { onHit: flash }); });
    if (!TEST) setTimeout(() => { if (!ctx.signal.aborted && play.isConnected) S.playRhythm(step.pattern, step.bpm, { onHit: flash }); }, 600);
    let misses = 0, taps = null, startAt = 0, timer = 0, guide = false;
    // Time's up `n` beats from now: a slow start or a slow tap is not cut
    // off, because every tap gives time for the rest of the rhythm.
    const beats = S.beatsOf(step.pattern).beats;
    const arm = n => { clearTimeout(timer); if (!TEST) timer = setTimeout(() => { if (taps) judge(); }, n * spb * 1000); };
    const judge = () => {
      clearTimeout(timer);
      drumBtn.disabled = true; go.disabled = false;
      const t = taps; taps = null;
      let good = t.length === hits.length;
      if (good && !TEST) {
        const tol = (guide ? 0.45 : 0.32) * spb, off = t[0] - hits[0] * spb;
        good = t.every((x, k) => Math.abs(x - off - hits[k] * spb) <= tol);
      }
      if (good) {
        lights.forEach(l => l.classList.add('is-done'));
        ctx.sfx.good();
        finish(host, step, ctx, resolve, { ok: misses ? 0 : 1, total: 1 });
        return;
      }
      misses += 1;
      ctx.sfx.bad();
      count.textContent = t.length === hits.length ? 'قريب جداً! انتبه للضربتين السريعتين.' : `ضربت ${num(t.length)} مرات، والإيقاع ${num(hits.length)} ضربات.`;
      if (misses === 1) ctx.say(step.hint, 'oops');
      else { guide = true; ctx.say('سأضيء لك كل ضربة وأنت تعزف. اضرب مع الأضواء! ✨', 'think'); }
    };
    go.addEventListener('click', () => {
      if (taps) return;
      ctx.sfx.tap();
      go.disabled = true;
      count.textContent = '';
      const a = S.playRhythm('', step.bpm, { count: 4 });
      const lead = a.start;
      [3, 2, 1].forEach((n, k) => setTimeout(() => { count.textContent = num(n); }, (k + 1) * spb * 1000));
      setTimeout(() => {
        if (ctx.signal.aborted) return;
        count.textContent = 'الآن!';
        drumBtn.disabled = false; drumBtn.focus({ preventScroll: true });
        taps = []; startAt = performance.now();
        if (guide) hits.forEach((h, k) => setTimeout(() => flash(k), h * spb * 1000));
        arm(beats + 4);
      }, TEST ? 0 : lead * 1000);
    });
    // A tap is a pointerdown (no click delay); the click that follows it is
    // ignored, so each tap counts once even on a slow phone. A click with no
    // pointerdown before it is the keyboard (Enter / Space).
    let pressed = false;
    drumBtn.addEventListener('pointerdown', e => { e.preventDefault(); pressed = true; hit(); });
    drumBtn.addEventListener('click', () => { if (pressed) { pressed = false; return; } hit(); });
    let lastHit = 0;
    function hit() {
      if (!taps || performance.now() - lastHit < 60) return;
      lastHit = performance.now();
      const k = taps.length;
      S.drum(k % 2 ? 'tak' : 'dum');
      bump(drumBtn, 'is-hit');
      taps.push((performance.now() - startAt) / 1000);
      lights[k]?.classList.add('is-done');
      if (taps.length >= hits.length) { clearTimeout(timer); setTimeout(() => { if (taps) judge(); }, TEST ? 0 : 250); }
      else arm(beats - hits[k] + 1.5);
    }
  },

  // Fill a measure with note values.
  measure(step, host, ctx, resolve) {
    const placed = [...step.given];
    const sum = () => placed.reduce((s, t) => s + beatsOfToken(t), 0);
    host.innerHTML = `<div class="tn-q"><p class="tn-ask">${step.q}</p>
      <div class="tn-bar"><b class="tn-ts" dir="ltr"><i>${num(step.beats)}</i><i>4</i></b><div class="tn-bar__notes" dir="ltr"></div><span class="tn-bar__left"></span></div>
      <div class="tn-pieces">${Object.entries(VALUE).map(([t, [n, b]]) => `<button class="tn-piece" data-t="${t}">${rhythmSVG(t, { beatW: 22 })}<b>${n}</b><small>${b === 1 ? 'زمن' : `${num(b)} ${b === 2 ? 'زمنان' : 'أزمنة'}`}</small></button>`).join('')}</div>
      <div class="tn-row"><button class="tn-mini tn-undo" data-undo>↺ امسح</button></div></div>`;
    const notesEl = host.querySelector('.tn-bar__notes'), left = host.querySelector('.tn-bar__left');
    const pieces = [...host.querySelectorAll('.tn-piece')];
    let misses = 0;
    const draw = () => {
      notesEl.innerHTML = placed.map((t, k) => `<span class="${k < step.given.length ? 'is-given' : 'is-new'}" style="flex:${beatsOfToken(t)}">${rhythmSVG(t, { beatW: 26 })}</span>`).join('')
        + Array.from({ length: Math.max(0, Math.ceil(step.beats - sum())) }, () => '<span class="is-empty" style="flex:1"></span>').join('');
      const rest = step.beats - sum();
      left.textContent = rest ? `ينقص ${num(rest)} ${rest === 1 ? 'زمن' : rest === 2 ? 'زمنان' : 'أزمنة'}` : '✔';
      const best = Object.keys(VALUE).find(t => beatsOfToken(t) <= rest);
      pieces.forEach(p => p.toggleAttribute('data-ok', p.dataset.t === best));
    };
    draw();
    host.querySelector('.tn-pieces').addEventListener('click', e => {
      const p = e.target.closest('.tn-piece');
      if (!p || host.classList.contains('is-solved')) return;
      const b = beatsOfToken(p.dataset.t);
      if (sum() + b > step.beats) {
        misses += 1; ctx.sfx.bad(); bump(p); bump(host.querySelector('.tn-bar'));
        ctx.say(misses === 1 ? `${step.hint} هذه النوتة أطول مما بقي!` : `${step.hint} <b>جرّب ما يلمع ✨</b>`, misses === 1 ? 'oops' : 'think');
        if (misses >= 2) host.querySelector('.tn-piece[data-ok]')?.classList.add('is-reveal');
        return;
      }
      placed.push(p.dataset.t);
      S.drum(p.dataset.t === 'ee' ? 'tak' : 'dum');
      draw();
      if (sum() === step.beats) {
        pieces.forEach(x => { x.removeAttribute('data-ok'); x.classList.remove('is-reveal'); });
        ctx.sfx.good();
        S.playRhythm(placed.join(' '), 96);
        finish(host, step, ctx, resolve, { ok: misses ? 0 : 1, total: 1 });
      }
    });
    host.querySelector('[data-undo]').addEventListener('click', () => {
      if (host.classList.contains('is-solved')) return;
      ctx.sfx.tap(); placed.length = step.given.length; draw();
    });
  },

  // Put each item in its basket.
  sort(step, host, ctx, resolve) {
    const items = shuffle(step.items);
    let i = 0, ok = 0, misses = 0;
    host.innerHTML = `<div class="tn-q"><p class="tn-ask">${step.q}</p><div class="tn-sortitem" aria-live="polite"></div>
      <div class="tn-bins">${step.bins.map(b => `<button class="tn-bin" data-bin="${b.id}"><span>${b.icon}</span><b>${b.label}</b><em></em></button>`).join('')}</div></div>`;
    const item = host.querySelector('.tn-sortitem'), bins = [...host.querySelectorAll('.tn-bin')];
    const show = () => {
      item.innerHTML = `<span>${items[i][0]}</span><small>${num(i + 1)} / ${num(items.length)}</small>`;
      bump(item, 'is-in');
      bins.forEach(b => { b.toggleAttribute('data-ok', b.dataset.bin === items[i][1]); b.classList.remove('is-reveal'); });
    };
    show();
    host.querySelector('.tn-bins').addEventListener('click', e => {
      const b = e.target.closest('.tn-bin');
      if (!b || host.classList.contains('is-solved')) return;
      if (b.dataset.bin !== items[i][1]) {
        misses += 1; ctx.sfx.bad(); bump(b);
        if (misses === 1) ctx.say(step.hint, 'oops'); else { ctx.say(`${step.hint} <b>انظر إلى ما يلمع ✨</b>`, 'think'); host.querySelector('.tn-bin[data-ok]').classList.add('is-reveal'); }
        return;
      }
      if (!misses) ok += 1;
      misses = 0;
      ctx.sfx.good();
      const em = b.querySelector('em');
      em.textContent = em.textContent ? `${em.textContent}، ${items[i][0]}` : items[i][0];
      bump(b, 'is-in');
      i += 1;
      if (i < items.length) { show(); return; }
      bins.forEach(x => { x.removeAttribute('data-ok'); x.classList.remove('is-reveal'); });
      item.innerHTML = '<span>✔</span>';
      finish(host, step, ctx, resolve, { ok, total: items.length });
    });
  },

  // Fill a glass to n/d by tapping its parts.
  fill(step, host, ctx, resolve) {
    const g = glassOf(step.glass);
    host.innerHTML = `<div class="tn-q"><p class="tn-ask">${step.q}</p>
      <div class="tn-fill"><div class="tn-fill__glass">${glassSVG({ id: g.id, n: 0, d: step.d, parts: true })}<div class="tn-fill__parts">${Array.from({ length: step.d }, (_, k) => `<button data-k="${step.d - k}" ${step.d - k === step.n ? 'data-ok' : ''} aria-label="${num(step.d - k)} من ${num(step.d)}"></button>`).join('')}</div></div>
      <p class="tn-fill__frac" dir="ltr">${frac(step.n, step.d)}</p></div></div>`;
    const glassBox = host.querySelector('.tn-fill__glass');
    const setLevel = k => { glassBox.querySelector('svg').outerHTML = glassSVG({ id: g.id, n: k, d: step.d, parts: true }); };
    const tr = tracker(step, ctx, () => host.querySelector('.tn-fill__parts [data-ok]')?.classList.add('is-reveal'));
    host.querySelector('.tn-fill__parts').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || host.classList.contains('is-solved')) return;
      const k = +b.dataset.k;
      setLevel(k);
      S.glass(S.freq('C4') * (step.d / k));
      ctx.sfx.tap();
      if (k !== step.n) { tr.miss(glassBox); setTimeout(() => { if (!host.classList.contains('is-solved')) setLevel(0); }, 900); return; }
      ctx.sfx.good();
      host.querySelector('.tn-fill__parts [data-ok]')?.classList.remove('is-reveal');
      finish(host, step, ctx, resolve, { ok: tr.misses ? 0 : 1, total: 1 });
    });
  },

  // Play the glasses in order.
  glasses(step, host, ctx, resolve) {
    host.innerHTML = `<div class="tn-q"><p class="tn-ask">${step.q}</p>
      <div class="tn-seq" dir="ltr">${step.play.map(id => `<i><small>${glassLetter(id)}</small></i>`).join('')}</div>
      <div class="tn-glasses" dir="ltr">${GLASSES.map(gl => `<button class="tn-gl" data-g="${gl.id}" aria-label="كوب ${glassLetter(gl.id)}">${glassSVG(gl)}</button>`).join('')}</div></div>`;
    const btns = [...host.querySelectorAll('.tn-gl')], dots = [...host.querySelectorAll('.tn-seq i')];
    let i = 0;
    const mark = () => btns.forEach(b => { b.toggleAttribute('data-ok', b.dataset.g === step.play[i]); b.classList.remove('is-reveal'); });
    const tr = tracker(step, ctx, () => btns.find(b => b.dataset.g === step.play[i])?.classList.add('is-reveal'));
    mark();
    host.querySelector('.tn-glasses').addEventListener('click', e => {
      const b = e.target.closest('.tn-gl');
      if (!b || host.classList.contains('is-solved')) return;
      S.glass(glassFreq(b.dataset.g));
      bump(b, 'is-ring');
      ctx.onGlass?.(b.dataset.g);
      if (b.dataset.g !== step.play[i]) { tr.miss(b); return; }
      dots[i]?.classList.add('is-on');
      i += 1;
      if (i < step.play.length) { mark(); return; }
      btns.forEach(x => x.removeAttribute('data-ok'));
      ctx.sfx.good();
      finish(host, step, ctx, resolve, { ok: tr.misses ? 0 : 1, total: 1 });
    });
  },
};

export { glassSVG, keyboardHTML, staffSVG, ART, GLASS_COLORS, glassFreq };

// ---------- The runner ----------

export const runStep = makeRunStep({ games: KINDS });
