// The science island's pictures for unit 4, simple machines (see views.js
// for how a picture works: spots, `st-<id>` classes, CSS in style.css).

import { arrow, svg, spot, emo, lab, txt, table, scaleTool, weight, INK } from './views.js';

// A wheel with spokes, for the pulleys, the knob and the steering wheels.
const wheel = (x, y, r, cls = '', fill = '#f2c14e') => `<g class="sv-wheel ${cls}" style="transform-origin:${x}px ${y}px"><circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="2.5"/>${[0, 60, 120].map(a => `<line x1="${x - r * Math.cos(a * Math.PI / 180)}" y1="${y - r * Math.sin(a * Math.PI / 180)}" x2="${x + r * Math.cos(a * Math.PI / 180)}" y2="${y + r * Math.sin(a * Math.PI / 180)}" stroke="${INK}" stroke-width="1.8"/>`).join('')}<circle cx="${x}" cy="${y}" r="${Math.max(3, r * 0.18)}" fill="${INK}"/></g>`;
const books = (x, y, n) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y - (i + 1) * 12}" width="54" height="12" rx="2" fill="${['#e8453c', '#3f8fd6', '#f2c14e', '#4fbf5a', '#8a63c9'][i % 5]}" stroke="${INK}" stroke-width="1.6"/>`).join('');
const marbles = (x, y, n) => Array.from({ length: n }, (_, i) => `<circle cx="${x - 8 + (i % 3) * 8}" cy="${y - Math.floor(i / 3) * 7}" r="3.6" fill="#eaf4ff" stroke="#7a9ab0"/>`).join('');

// One configuration of the ramp experiment: books, the plank, the car, the
// thread over the top, the bucket of marbles.
function rampCfg(cls, n, m, vertical = false) {
  const top = 150 - n * 12, x0 = 54, x1 = vertical ? 110 : 262;
  return `<g class="rp-cfg ${cls}">${books(x0, 150, n)}
    ${vertical ? '' : `<line x1="${x0 + 54}" y1="${top}" x2="${x1}" y2="150" stroke="#a8703f" stroke-width="8" stroke-linecap="round"/>`}
    <g class="rp-car" style="--x:${vertical ? 0 : (x1 - x0 - 54) * 0.55}px; --y:${vertical ? -40 : (150 - top) * 0.55}px">${emo('🛻', vertical ? x0 + 80 : x0 + 54 + (x1 - x0 - 54) * 0.75, vertical ? 136 : top + (150 - top) * 0.75 - 8, 22)}</g>
    <path d="M${x0 + 50} ${top - 2} H${x0 - 22} V164" stroke="#e8453c" stroke-width="1.6" fill="none"/>
    <path d="M${x0 - 34} 164 h24 l-3 26 h-18z" fill="#3f8fd6" stroke="${INK}" stroke-width="2"/>${marbles(x0 - 22, 184, m)}</g>`;
}

export const MACHINE_VIEWS = {
  ramp: {
    html: () => `<div class="lx-pick">${svg('ramp', `<rect width="320" height="200" rx="16" fill="#fff6e8"/>${table(150, 52, 312)}
      ${rampCfg('rp-low', 2, 3)}${rampCfg('rp-steep', 5, 9)}${rampCfg('rp-lift', 6, 15, true)}`)}
      <div class="lx-pick__row"><button class="lx-pill" data-spot="low">📏 قليل الميل</button><button class="lx-pill" data-spot="steep">📐 ميل أكبر</button><button class="lx-pill" data-spot="lift">⬆️ شاقولي</button></div></div>`,
  },

  truck: {
    html: () => svg('truck', `${'<rect width="320" height="200" rx="16" fill="#eef7ff"/>'}<rect y="166" width="320" height="34" fill="#a6d98b"/>
      ${emo('🛻', 70, 132, 86)}
      ${spot('bc', `<line x1="118" y1="104" x2="118" y2="166" stroke="${INK}" stroke-width="5"/><text class="sv-t" x="106" y="100">b</text><text class="sv-t" x="106" y="184">c</text>${lab(92, 140, 'sv-lab--side')}`, [104, 96, 28, 74])}
      <line x1="118" y1="166" x2="292" y2="166" stroke="${INK}" stroke-width="2" stroke-dasharray="6 4"/><text class="sv-t" x="296" y="184">a</text>
      ${spot('ab', `<line x1="118" y1="104" x2="292" y2="166" stroke="#e8453c" stroke-width="6" stroke-linecap="round"/>${lab(220, 120)}`, [126, 100, 170, 64])}`),
  },

  wedge: {
    html: () => svg('wedge', `<rect width="320" height="200" rx="16" fill="#f6f4ef"/>${table(176, 30, 290)}
      ${spot('split', `<g class="wd-l"><path d="M90 176 V106 Q90 96 100 96 H160 L150 176Z" fill="#a9b3bc" stroke="${INK}" stroke-width="2.5"/></g><g class="wd-r"><path d="M230 176 V106 Q230 96 220 96 H160 L170 176Z" fill="#9aa5ad" stroke="${INK}" stroke-width="2.5"/></g>`, [86, 92, 148, 86])}
      <g class="wd-wedge"><path d="M140 52 H180 L160 116Z" fill="#7a858d" stroke="${INK}" stroke-width="2.5"/><path d="M140 52 H160 L160 116Z" fill="#c2cad2"/></g>
      ${arrow(152, 100, 112, 120, 'sv-ar--r wd-f')}${arrow(168, 100, 208, 120, 'sv-ar--r wd-f')}
      ${spot('hit', `<g class="wd-hammer"><rect x="196" y="10" width="44" height="20" rx="4" fill="#5a5f66" stroke="${INK}" stroke-width="2.5"/><rect x="214" y="28" width="9" height="46" rx="3" fill="#a8703f" stroke="${INK}" stroke-width="2"/></g>`, [192, 6, 54, 72])}`),
  },

  screw: {
    html: () => svg('screw', `<rect width="320" height="200" rx="16" fill="#f4f6fa"/>
      <rect x="170" y="140" width="130" height="18" fill="#c99863" stroke="${INK}" stroke-width="2"/><rect x="170" y="158" width="130" height="18" fill="#d9a86a" stroke="${INK}" stroke-width="2"/>
      ${spot('shape', `<g class="sc-screw"><rect x="64" y="36" width="44" height="12" rx="4" fill="#c2cad2" stroke="${INK}" stroke-width="2"/><path d="M74 48 H98 V150 L86 178 L74 150Z" fill="#dfe5ea" stroke="${INK}" stroke-width="2"/>
        ${Array.from({ length: 9 }, (_, i) => `<path d="M70 ${56 + i * 11} L102 ${62 + i * 11}" stroke="${INK}" stroke-width="2.2"/>`).join('')}</g>`, [58, 30, 56, 152])}
      ${spot('groove', `${emo('✏️', 130, 84, 26, 'sc-pencil')}`, [112, 62, 40, 44])}
      ${spot('turn', `<g class="sc-drive"><rect x="226" y="16" width="16" height="44" rx="6" fill="#f2c14e" stroke="${INK}" stroke-width="2"/><rect x="232" y="60" width="4" height="40" fill="#9aa5ad" stroke="${INK}" stroke-width="1"/></g>
        <g class="sc-small"><rect x="226" y="100" width="16" height="6" rx="2" fill="#c2cad2" stroke="${INK}" stroke-width="1.5"/><path d="M230 106 H238 V134 L234 142 L230 134Z" fill="#dfe5ea" stroke="${INK}" stroke-width="1.5"/></g>`, [216, 10, 36, 136])}`),
  },

  lever: {
    html: () => svg('lever', `<rect width="320" height="200" rx="16" fill="#fff8ec"/>${table(160, 10, 310)}
      ${spot('load', `<g class="lv-book"><rect x="226" y="122" width="70" height="26" rx="3" fill="#3f8fd6" stroke="${INK}" stroke-width="2.5"/><rect x="230" y="126" width="62" height="5" fill="#bfe3ff"/></g>${lab(262, 112)}`, [222, 100, 78, 52])}
      <g class="lv-bar"><rect x="60" y="146" width="210" height="8" rx="2" fill="#f2c14e" stroke="${INK}" stroke-width="2"/></g>
      ${spot('fulcrum', `<circle cx="196" cy="156" r="6" fill="#e8453c" stroke="${INK}" stroke-width="2"/><path d="M186 160 l10 -10 l10 10z" fill="#2fb3a8" opacity="0"/>${lab(196, 188)}`, [182, 144, 28, 22])}
      ${spot('press', `<g class="lv-hand"><circle cx="72" cy="128" r="14" fill="#f6c9a0" stroke="${INK}" stroke-width="2.5"/></g>`, [54, 108, 38, 40])}
      ${spot('effort', `${arrow(72, 88, 72, 112, 'sv-ar--r lv-e')}${lab(72, 80)}`, [54, 70, 40, 40])}
      ${spot('arms', `<g class="lv-arms"><path d="M72 172 v6 h124 v-6" class="sv-bracket"/><path d="M196 172 v6 h66 v-6" class="sv-bracket sv-bracket--g"/><text class="sv-t sv-small" x="134" y="196">ذراع القوة</text><text class="sv-t sv-small" x="232" y="196">ذراع المقاومة</text></g>`, [66, 166, 200, 34])}`),
  },

  classes: {
    html: () => {
      const F = x => `<path d="M${x - 9} 0 l9 -14 l9 14z" class="cl-f"/>`, L = x => `<rect x="${x - 8}" y="-26" width="16" height="16" class="cl-l"/>`, E = x => `<g transform="translate(0 -6)">${arrow(x, -30, x, -6, 'sv-ar--r')}</g>`;
      const row = (id, y, name, e, parts) => spot(id, `<g transform="translate(0 ${y})"><rect x="12" y="-40" width="296" height="54" rx="12" class="cl-row"/>
        <text class="sv-emo" x="280" y="-14" font-size="24">${e}</text><text class="sv-t" x="280" y="10">${name}</text>
        <rect x="40" y="-3" width="200" height="6" rx="3" fill="#a8703f"/>${parts}</g>`, [12, y - 40, 296, 54]);
      return svg('classes', `<rect width="320" height="200" rx="16" fill="#f3f8ff"/>
        ${row('c1', 54, 'المقصّ', '✂️', E(60) + F(140) + L(220))}
        ${row('c2', 116, 'عربة الجرّ', '🛒', E(60) + L(140) + F(220))}
        ${row('c3', 178, 'كبّاسة الورق', '📎', L(60) + E(140) + F(220))}`);
    },
  },

  hammer: {
    html: () => svg('hammer', `<rect width="320" height="200" rx="16" fill="#fff8ec"/>${table(164, 10, 310)}<rect x="40" y="128" width="170" height="36" rx="4" fill="#c99863" stroke="${INK}" stroke-width="2.5"/>
      <path d="M110 128 L230 26" stroke="#a8703f" stroke-width="12" stroke-linecap="round"/><path d="M84 122 Q96 104 118 112 L112 128 Q100 118 92 128Z" fill="#5a5f66" stroke="${INK}" stroke-width="2"/>
      ${spot('effort', `<circle cx="232" cy="26" r="15" fill="#f6c9a0" stroke="${INK}" stroke-width="2.5"/>${lab(268, 30, 'sv-lab--side')}`, [212, 6, 44, 44])}
      ${spot('load', `<rect x="86" y="112" width="5" height="22" fill="#9aa5ad" stroke="${INK}" stroke-width="1.5"/><rect x="81" y="110" width="15" height="4" fill="#9aa5ad" stroke="${INK}" stroke-width="1.5"/>${lab(60, 100, 'sv-lab--side')}`, [72, 98, 30, 40])}
      ${spot('fulcrum', `<circle cx="116" cy="128" r="6" fill="#2fb3a8" stroke="${INK}" stroke-width="2"/>${lab(140, 152)}`, [104, 116, 26, 24])}`),
  },

  flag: {
    html: () => svg('flag', `<rect width="320" height="200" rx="16" fill="#e7f5ff"/><rect y="186" width="320" height="14" fill="#a6d98b"/>
      <rect x="156" y="20" width="8" height="168" fill="#c2cad2" stroke="${INK}" stroke-width="1.5"/>
      ${spot('top', `${'<circle cx="160" cy="18" r="9" fill="#f2c14e" stroke="#3b2414" stroke-width="2"/>'}${lab(200, 20)}`, [144, 4, 32, 30])}
      <line x1="169" y1="18" x2="169" y2="160" stroke="#f28c3a" stroke-width="2"/><line x1="151" y1="18" x2="151" y2="170" stroke="#f28c3a" stroke-width="2" class="fg-rope"/>
      <g class="fg-flag"><rect x="170" y="134" width="60" height="12" fill="#2f8a3f"/><rect x="170" y="146" width="60" height="12" fill="#fff"/><rect x="170" y="158" width="60" height="12" fill="#1f1612"/>
        ${[184, 200, 216].map(x => `<path d="M${x} 148 l1.6 3.4 3.6 .4 -2.7 2.4 .8 3.6 -3.3 -1.9 -3.3 1.9 .8 -3.6 -2.7 -2.4 3.6 -.4z" fill="#e8453c"/>`).join('')}</g>
      ${spot('pull', `<circle cx="150" cy="176" r="10" fill="#f6c9a0" stroke="${INK}" stroke-width="2" class="fg-hand"/>${arrow(130, 150, 130, 186, 'sv-ar--r fg-down')}`, [118, 140, 44, 50])}`),
  },

  pulleys: {
    html: () => svg('pulleys', `<rect width="320" height="200" rx="16" fill="#f3f8ff"/><rect x="10" y="10" width="300" height="10" fill="#c99863" stroke="${INK}" stroke-width="2"/>
      ${spot('movable', `<line x1="40" y1="20" x2="40" y2="110" stroke="#f28c3a" stroke-width="2.5" class="pu-m-rope"/><line x1="80" y1="110" x2="80" y2="60" stroke="#f28c3a" stroke-width="2.5"/>
        <g class="pu-m">${wheel(60, 110, 20)}<line x1="60" y1="130" x2="60" y2="146" stroke="${INK}" stroke-width="2"/>${weight(60, 146, 32, 22, '10N')}</g>
        <g transform="translate(0 0)">${scaleTool(80, 26, 14, '5N')}</g><text class="sv-t" x="60" y="196">متحرّكة</text>`, [14, 20, 110, 180])}
      ${spot('fixed', `<rect x="232" y="20" width="6" height="16" fill="${INK}"/>${wheel(235, 46, 20)}
        <line x1="255" y1="46" x2="255" y2="140" stroke="#f28c3a" stroke-width="2.5"/><line x1="215" y1="46" x2="215" y2="96" stroke="#f28c3a" stroke-width="2.5"/>
        <g class="pu-f">${weight(255, 140, 32, 22, '10N')}</g>${scaleTool(215, 96, 14, '10N')}<text class="sv-t" x="235" y="196">ثابتة</text>`, [190, 20, 110, 180])}`),
  },

  knob: {
    html: () => svg('knob', `<rect width="320" height="200" rx="16" fill="#fbf4ec"/><rect x="170" y="14" width="140" height="176" rx="6" fill="#8a5a34" stroke="${INK}" stroke-width="2.5"/>
      ${spot('spindle', `<rect x="150" y="86" width="40" height="10" fill="#9aa5ad" stroke="${INK}" stroke-width="2" class="kb-spin"/>${lab(150, 70)}`, [140, 74, 54, 32])}
      ${spot('knob', `<g class="kb-knob" style="transform-origin:134px 91px"><circle cx="134" cy="91" r="26" fill="#f2c14e" stroke="${INK}" stroke-width="3"/><circle cx="134" cy="91" r="8" fill="#c99a2e"/><rect x="130" y="66" width="8" height="12" rx="3" fill="#fff6c8"/></g>${lab(134, 140)}`, [104, 60, 60, 64])}
      ${spot('cap', `<ellipse cx="54" cy="160" rx="34" ry="12" fill="#f4f4f4" stroke="${INK}" stroke-width="2.5"/><ellipse cx="54" cy="156" rx="28" ry="9" fill="#e8a26a"/><g class="kb-pen" style="transform-origin:54px 120px"><rect x="50" y="90" width="8" height="66" fill="#f2c14e" stroke="${INK}" stroke-width="2"/><path d="M50 90 l4 -10 4 10z" fill="${INK}"/></g>`, [16, 76, 76, 100])}`),
  },

  steering: {
    html: () => svg('steering', `<rect width="320" height="200" rx="16" fill="#f3f8ff"/>
      ${spot('small', `${wheel(240, 96, 26, 'st-sm', '#7a858d')}${emo('🚗', 240, 160, 30)}${arrow(266, 70, 266, 96, 'sv-ar--r')}<text class="sv-t" x="240" y="192">مقود صغير</text>`, [196, 54, 96, 144])}
      ${spot('big', `${wheel(90, 92, 52, 'st-bg', '#e8453c')}${emo('🚜', 90, 166, 30)}${arrow(142, 60, 142, 86, 'sv-ar--r')}<text class="sv-t" x="90" y="192">مقود كبير</text>`, [30, 34, 124, 164])}`),
  },

  krak: {
    html: () => {
      const m = (id, e, x, y) => spot(id, `<circle cx="${x}" cy="${y}" r="20" class="sv-node"/>${emo(e, x, y + 1, 22)}${lab(x, y + 36)}`, [x - 24, y - 24, 48, 64]);
      return svg('krak', `${'<defs><linearGradient id="ksk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9b0"/><stop offset="1" stroke="none" stop-color="#fff2df"/></linearGradient></defs><rect width="320" height="200" rx="16" fill="url(#ksk)"/>'}
        <path d="M60 170 Q160 110 260 170 V200 H60Z" fill="#c9b48a"/>
        <g fill="#d9c8a4" stroke="${INK}" stroke-width="2"><rect x="110" y="96" width="100" height="54"/><rect x="100" y="78" width="24" height="72"/><rect x="196" y="78" width="24" height="72"/><rect x="148" y="70" width="24" height="80"/></g>
        ${[100, 108, 116, 196, 204, 212, 148, 156, 164].map((x, i) => `<rect x="${x}" y="${i > 5 ? 62 : 70}" width="6" height="8" fill="#d9c8a4" stroke="${INK}" stroke-width="1.5"/>`).join('')}<path d="M152 150 v-18 a8 8 0 0 1 16 0 v18z" fill="#6b4a2a"/>
        ${m('ramp', '♿', 34, 40)}${m('lever', '⚖️', 34, 120)}${m('pulley', '🪣', 286, 40)}${m('screw', '🫙', 286, 120)}${m('wheel', '🍕', 104, 26)}${m('wedge', '⛺', 216, 26)}`);
    },
  },

  clipper: {
    html: () => svg('clipper', `<rect width="320" height="200" rx="16" fill="#f4f6fa"/>
      ${spot('body', `<path d="M60 128 L250 112 Q262 112 262 122 L262 128 L70 140Z" fill="#c2cad2" stroke="${INK}" stroke-width="2.5"/><path d="M60 140 L250 150 Q262 150 262 140 L262 134 L70 146Z" fill="#aab3bb" stroke="${INK}" stroke-width="2.5"/>${lab(160, 176)}`, [56, 106, 210, 52])}
      ${spot('jaws', `<path d="M262 118 L280 128 L262 132Z M262 136 L280 132 L262 146Z" fill="#7a858d" stroke="${INK}" stroke-width="2"/>${lab(286, 104, 'sv-lab--side')}`, [256, 108, 32, 44])}
      ${spot('top', `<g class="cp-top"><path d="M70 96 L240 84 Q250 84 250 92 L250 96 L80 108Z" fill="#dfe5ea" stroke="${INK}" stroke-width="2.5"/><rect x="226" y="96" width="6" height="22" fill="#7a858d"/></g>${lab(150, 70)}`, [64, 76, 192, 36])}`),
  },
};
