// Small illustration helpers for "learn" cards (Hudhud's mini-lessons).
// All return HTML/SVG strings; styling lives in style.css (.role, .viz …).

import { num, frac } from '../../core/format.js';

const ROLE_LABEL = {
  verb: 'فعل', fael: 'فاعل', mafool: 'مفعول به', mubtada: 'مبتدأ', khabar: 'خبر',
};

// A sentence with each word colour-coded by grammatical role.
// words: [['كتبَ', 'verb'], ['الطالبُ', 'fael'], …]
export function roles(words) {
  return `<div class="roles">${words.map(([t, r]) =>
    `<span class="role role--${r}"><b>${t}</b><small>${ROLE_LABEL[r] || ''}</small></span>`).join('')}</div>`;
}

// A bar split into d equal parts with n shaded, plus the fraction.
export function fracBar(n, d, color = '#f2c14e') {
  const W = 300, H = 50;
  const cells = Array.from({ length: d }, (_, i) =>
    `<rect x="${(i * W) / d}" y="0" width="${W / d}" height="${H}" fill="${i < n ? color : '#fff'}" stroke="#3b2414" stroke-width="3"/>`).join('');
  return `<div class="viz viz--bar"><svg viewBox="-3 -3 306 56" dir="ltr">${cells}</svg><span class="viz__cap">${frac(n, d)}</span></div>`;
}

// A 10×10 grid with p squares shaded — "percent means out of 100".
export function grid100(p, color = '#1f9aa0') {
  let cells = '';
  for (let i = 0; i < 100; i++) {
    const x = (i % 10) * 20, y = Math.floor(i / 10) * 20;
    cells += `<rect x="${x}" y="${y}" width="20" height="20" fill="${i < p ? color : '#fff'}" stroke="#3b2414" stroke-width="1.5"/>`;
  }
  return `<div class="viz viz--grid"><svg viewBox="-2 -2 204 204" dir="ltr">${cells}<rect x="0" y="0" width="200" height="200" fill="none" stroke="#3b2414" stroke-width="4"/></svg><span class="viz__cap">${num(p)}٪</span></div>`;
}

// A mini number line from 0 to max with `ticks` steps and a flag at value.
export function miniLine(value, max, ticks, label) {
  const W = 300, P = 20, Y = 30;
  const x = v => P + (v / max) * (W - 2 * P);
  let t = '';
  for (let k = 0; k <= ticks; k++) t += `<line x1="${x((k / ticks) * max)}" x2="${x((k / ticks) * max)}" y1="${Y - 8}" y2="${Y + 8}" stroke="#3b2414" stroke-width="3"/>`;
  const nums = Array.from({ length: max + 1 }, (_, k) => `<text x="${x(k)}" y="${Y + 30}" text-anchor="middle" class="viz__num">${num(k)}</text>`).join('');
  return `<div class="viz viz--line"><svg viewBox="0 -30 300 100" dir="ltr">
    <line x1="${P}" x2="${W - P}" y1="${Y}" y2="${Y}" stroke="#3b2414" stroke-width="4" stroke-linecap="round"/>${t}${nums}
    <line x1="${x(value)}" x2="${x(value)}" y1="${Y}" y2="${Y - 34}" stroke="#3b2414" stroke-width="3"/>
    <path d="M${x(value)} ${Y - 34} l20 7 l-20 7Z" fill="#d0507e" stroke="#3b2414" stroke-width="2"/>
  </svg><span class="viz__cap">${label}</span></div>`;
}

// Singular → plural rows with the added/changed part highlighted.
// rows: [['معلم', 'معلم', 'ونَ'], …]  (singular, stem, suffix) or [sing, plural] for broken plurals
export function plurals(rows) {
  return `<div class="plurals">${rows.map(r => r.length === 3
    ? `<div class="plurals__row"><span>${r[0]}</span><i>←</i><span>${r[1]}<mark>${r[2]}</mark></span></div>`
    : `<div class="plurals__row"><span>${r[0]}</span><i>←</i><span><mark class="mark--b">${r[1]}</mark></span></div>`).join('')}</div>`;
}

// Icon cards in a row: [[icon, title, text], …]
export function cards(items) {
  return `<div class="mini-cards">${items.map(([i, t, x]) =>
    `<div class="mini-card"><span class="mini-card__icon">${i}</span><b>${t}</b><small>${x}</small></div>`).join('')}</div>`;
}

// The eight planets in order, roughly sized.
export function planets() {
  const P = [
    ['عطارد', 7, '#b7a89a'], ['الزهرة', 11, '#e8c27a'], ['الأرض', 12, '#3f8fd8'], ['المريخ', 9, '#d8553a'],
    ['المشتري', 26, '#d9a36a'], ['زحل', 22, '#e6c98a'], ['أورانوس', 16, '#8fd6de'], ['نبتون', 15, '#4a6fd8'],
  ];
  let x = 34;
  const g = P.map(([n, r, c], i) => {
    const cx = x + r; x += 2 * r + 12;
    const ring = i === 5 ? `<ellipse cx="${cx}" cy="60" rx="${r + 10}" ry="5" fill="none" stroke="#b8935a" stroke-width="3"/>` : '';
    return `<circle cx="${cx}" cy="60" r="${r}" fill="${c}" stroke="#3b2414" stroke-width="2.5"/>${ring}
            <text x="${cx}" y="${i % 2 ? 108 : 22}" text-anchor="middle" class="viz__name">${n}</text>`;
  }).join('');
  return `<div class="viz viz--planets"><svg viewBox="-40 0 ${x + 40} 120" dir="ltr">
    <circle cx="-14" cy="60" r="44" fill="#ffd23f" stroke="#3b2414" stroke-width="3"/>${g}</svg></div>`;
}
