// Sprites for the walkable islands: villagers, props and buildings, drawn as
// SVG in the same outlined cartoon style as art.js, then rasterised once into
// images the canvas can draw cheaply every frame.
//
// Licence: CC-BY-SA (see README.md).

import { DEFS, LINE, OUT, OUT_THIN, limb, head, hudhudBody, HEROES, palmSVG, chestSVG } from './art.js';

// ---------- Rasterising ----------

const cache = new Map();

// Turn an SVG body (viewBox w×h) into an <img>. `scale` sets the raster
// resolution relative to the viewBox (sprites are drawn smaller than their
// viewBox on screen, so 1 is usually plenty).
export function svgImage(key, body, w, h, scale = 1) {
  if (cache.has(key)) return cache.get(key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}"><defs>${DEFS}</defs>${body}</svg>`;
  const img = new Image();
  img.decoding = 'async';
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const entry = { img, w, h, ready: img.decode ? img.decode().catch(() => {}) : Promise.resolve() };
  cache.set(key, entry);
  return entry;
}

// ---------- Villagers ----------
// A villager in a long robe (qumbaz / jalabiya). viewBox 200×300 like the
// heroes, so they stand at the same scale.
//
// look: { skin, robe, trim, sash, hat: 'fez'|'kufiya'|'hijab'|'cap'|'turban'|'none',
//         hair, beard: 'white'|'dark'|null, glasses, prop: 'pen'|'book'|'staff'|'basket'|'flask'|null, lashes }
export function villagerBody(look) {
  const {
    skin = '#e3a878', robe = '#3f6fb0', trim = '#f2c14e', sash = '#b3303a', hat = 'none',
    hair = '#3a2215', beard = null, glasses = false, prop = null, lashes = false, headColor = '#c7373f',
  } = look;
  const hatSVG = {
    fez: `<path d="M72 50 L78 20 Q100 12 122 20 L128 50 Q100 42 72 50Z" fill="#b3303a" ${OUT}/>
          <path d="M100 14 Q112 16 116 34" fill="none" stroke="#1b0f08" stroke-width="3"/><circle cx="116" cy="36" r="4" fill="#1b0f08"/>`,
    kufiya: `<path d="M56 86 Q52 34 100 30 Q148 34 144 86 Q150 120 138 132 L128 96 Q100 60 72 96 L62 132 Q50 120 56 86Z" fill="#fbf7ee" ${OUT}/>
             <path d="M64 60 Q100 44 136 60 M60 76 Q100 60 140 76" fill="none" stroke="#c7373f" stroke-width="3" stroke-dasharray="4 4"/>
             <path d="M58 52 Q100 34 142 52" fill="none" stroke="#1b0f08" stroke-width="7" stroke-linecap="round"/>`,
    hijab: `<path d="M57 86 Q54 38 100 34 Q146 38 143 86 Q138 62 100 58 Q62 62 57 86Z" fill="${headColor}" ${OUT}/>
            <path d="M64 70 Q100 50 136 70" fill="none" stroke="#fff" stroke-width="3" opacity=".35"/>`,
    cap: `<path d="M60 60 Q64 34 100 32 Q136 34 140 60 Q100 48 60 60Z" fill="${headColor}" ${OUT}/>`,
    turban: `<path d="M58 64 Q54 28 100 26 Q146 28 142 64 Q100 50 58 64Z" fill="#fbf7ee" ${OUT}/>
             <path d="M62 50 Q100 34 138 50 M64 40 Q100 26 136 40" fill="none" stroke="#e0d2b4" stroke-width="3"/>`,
    none: '',
  }[hat];
  const hairSVG = hat === 'none' || hat === 'cap'
    ? `<path d="M60 78 Q56 40 100 34 Q144 40 140 78 Q132 58 100 56 Q68 58 60 78Z" fill="${hair}" ${OUT}/>` : '';
  const beardSVG = beard
    ? `<path d="M70 96 Q72 132 100 136 Q128 132 130 96 Q122 112 100 112 Q78 112 70 96Z" fill="${beard === 'white' ? '#f4f1ea' : '#3a2215'}" ${OUT_THIN}/>
       <path d="M86 104 Q100 98 114 104" fill="none" stroke="${beard === 'white' ? '#d8d2c4' : '#1b0f08'}" stroke-width="5" stroke-linecap="round"/>` : '';
  const glassesSVG = glasses
    ? `<g fill="none" stroke="#6b4a1a" stroke-width="2.5"><circle cx="84" cy="86" r="12"/><circle cx="116" cy="86" r="12"/><path d="M96 86 h8"/></g>` : '';
  const propSVG = {
    pen: `<path d="M156 150 L178 104" stroke="${LINE}" stroke-width="7" stroke-linecap="round"/><path d="M156 150 L178 104" stroke="#e8d3a6" stroke-width="3.5" stroke-linecap="round"/><path d="M178 104 l4 -8" stroke="#1b0f08" stroke-width="3"/>`,
    book: `<g transform="rotate(-10 158 170)"><rect x="140" y="150" width="36" height="44" rx="4" fill="#2f8a5f" ${OUT}/><path d="M146 150 v44" stroke="#f2c14e" stroke-width="3"/></g>`,
    staff: `<path d="M160 290 L150 90" stroke="${LINE}" stroke-width="9" stroke-linecap="round"/><path d="M160 290 L150 90" stroke="#9a6b3a" stroke-width="5" stroke-linecap="round"/>`,
    basket: `<path d="M136 172 h44 l-6 30 h-32Z" fill="#c9a05a" ${OUT}/><path d="M140 172 Q158 146 176 172" fill="none" ${OUT}/><g fill="#d0507e" ${OUT_THIN}><circle cx="150" cy="168" r="6"/><circle cx="164" cy="166" r="6"/></g>`,
    flask: `<path d="M150 150 h12 v10 l10 20 q2 8 -6 8 h-20 q-8 0 -6 -8 l10 -20Z" fill="#dff6ff" ${OUT_THIN}/><path d="M144 176 h24 l3 6 q1 4 -4 4 h-22 q-5 0 -4 -4Z" fill="#6ee07a"/>`,
  }[prop] || '';
  return `
  <ellipse cx="100" cy="289" rx="48" ry="7" fill="#000" opacity=".16"/>
  ${prop === 'staff' ? propSVG : ''}
  <path d="M84 272 h12 v14 h-14Z M104 272 h12 v14 h-14Z" fill="#6e3a1a" ${OUT_THIN}/>
  ${limb('M72 140 Q62 170 64 196', robe, 17)}
  ${limb('M128 140 Q138 170 136 196', robe, 17)}
  <circle cx="64" cy="200" r="8" fill="${skin}" ${OUT}/>
  <circle cx="136" cy="200" r="8" fill="${skin}" ${OUT}/>
  <path d="M70 130 Q100 121 130 130 Q142 200 140 276 L60 276 Q58 200 70 130Z" fill="${robe}" ${OUT}/>
  <path d="M100 132 V274" stroke="${trim}" stroke-width="4"/>
  <path d="M100 132 V274" stroke="${LINE}" stroke-width="1" opacity=".4"/>
  <path d="M62 262 H138" stroke="${trim}" stroke-width="5"/>
  <path d="M64 186 Q100 194 136 186 L136 198 Q100 206 64 198Z" fill="${sash}" ${OUT_THIN}/>
  ${prop && prop !== 'staff' ? propSVG : ''}
  ${hat === 'hijab' ? `<path d="M52 92 Q48 30 100 26 Q152 30 148 92 Q150 128 132 140 L68 140 Q50 128 52 92Z" fill="${headColor}" ${OUT}/>` : ''}
  ${head({ skin, lashes })}
  ${hairSVG}${beardSVG}${glassesSVG}${hatSVG}`;
}

// ---------- Canvas sprite set ----------
// Every drawable thing on an island: key → { img, w, h, ax, ay } where
// (ax, ay) is the anchor point (feet / base) in viewBox units.

const objects = {
  palm: { w: 160, h: 240, ax: 84, ay: 236, body: null },
  house: {
    w: 200, h: 180, ax: 100, ay: 170, body: `
      <ellipse cx="100" cy="172" rx="96" ry="8" fill="#000" opacity=".15"/>
      <path d="M10 60 H190 V170 H10Z" fill="#f1e2c4" ${OUT}/>
      <path d="M10 92 H190 M10 124 H190" stroke="#d8c29a" stroke-width="3"/>
      <path d="M4 60 H196 V46 H4Z" fill="#d9b27a" ${OUT}/>
      <path d="M78 170 V122 Q78 98 100 96 Q122 98 122 122 V170Z" fill="#6b3f1f" ${OUT}/>
      <path d="M78 122 Q78 98 100 96 Q122 98 122 122" fill="none" stroke="#3b3029" stroke-width="10" opacity=".8"/>
      <path d="M78 122 Q78 98 100 96 Q122 98 122 122" fill="none" stroke="#fbf1dc" stroke-width="10" stroke-dasharray="8 8" opacity=".9"/>
      <rect x="28" y="82" width="30" height="36" rx="15" fill="#2c5e6e" ${OUT_THIN}/>
      <rect x="142" y="82" width="30" height="36" rx="15" fill="#2c5e6e" ${OUT_THIN}/>
      <path d="M28 100 h30 M43 82 v36 M142 100 h30 M157 82 v36" stroke="#e8cf9c" stroke-width="2.5"/>
      <path d="M150 60 q10 -26 24 -6" fill="#3a9b4a" ${OUT_THIN}/>
      <circle cx="100" cy="140" r="3" fill="#f2c14e"/>` },
  fountain: {
    w: 160, h: 130, ax: 80, ay: 118, body: `
      <ellipse cx="80" cy="112" rx="76" ry="16" fill="#000" opacity=".15"/>
      <path d="M8 88 Q8 118 80 118 Q152 118 152 88 Z" fill="#d9c4a0" ${OUT}/>
      <ellipse cx="80" cy="88" rx="72" ry="20" fill="#e8d7b8" ${OUT}/>
      <ellipse cx="80" cy="88" rx="60" ry="14" fill="#5cc6dd" ${OUT_THIN}/>
      <path d="M70 88 V50 H90 V88Z" fill="#e8d7b8" ${OUT}/>
      <ellipse cx="80" cy="50" rx="24" ry="8" fill="#e8d7b8" ${OUT}/>
      <g class="spray" fill="#bfeefa" ${OUT_THIN}><path d="M80 44 Q60 20 52 70 Q66 30 80 44Z"/><path d="M80 44 Q100 20 108 70 Q94 30 80 44Z"/></g>
      <circle cx="80" cy="36" r="6" fill="#bfeefa" ${OUT_THIN}/>` },
  stall: {
    w: 180, h: 160, ax: 90, ay: 150, body: `
      <ellipse cx="90" cy="152" rx="84" ry="7" fill="#000" opacity=".15"/>
      <path d="M20 60 V150 M160 60 V150" stroke="${LINE}" stroke-width="8"/><path d="M20 60 V150 M160 60 V150" stroke="#9a6b3a" stroke-width="4"/>
      <path d="M8 60 L90 24 L172 60Z" fill="#d0507e" ${OUT}/>
      <path d="M8 60 Q22 72 36 60 Q50 72 64 60 Q78 72 92 60 Q106 72 120 60 Q134 72 148 60 Q160 72 172 60" fill="#fbf1dc" ${OUT_THIN}/>
      <path d="M14 104 H166 V128 H14Z" fill="#a0602e" ${OUT}/>
      <g ${OUT_THIN}><rect x="24" y="84" width="14" height="20" fill="#2f8a5f"/><rect x="40" y="80" width="12" height="24" fill="#c7373f"/><rect x="54" y="86" width="14" height="18" fill="#1f9aa0"/>
        <rect x="100" y="82" width="14" height="22" fill="#f2c14e"/><rect x="116" y="86" width="12" height="18" fill="#7a4ac2"/><rect x="130" y="80" width="14" height="24" fill="#2f8a5f"/></g>` },
  gate: {
    w: 240, h: 220, ax: 120, ay: 210, body: `
      <ellipse cx="120" cy="212" rx="116" ry="8" fill="#000" opacity=".15"/>
      <path d="M10 210 V70 Q10 20 120 14 Q230 20 230 70 V210Z" fill="#fbf1dc" ${OUT}/>
      <path d="M10 60 H230 M10 94 H230 M10 128 H230 M10 162 H230" stroke="#3b3029" stroke-width="12" opacity=".85"/>
      <path d="M10 210 V70 Q10 20 120 14 Q230 20 230 70 V210Z" fill="none" ${OUT}/>
      <path d="M62 210 V110 Q62 62 120 58 Q178 62 178 110 V210Z" fill="#2c5e6e" ${OUT}/>
      <circle cx="120" cy="34" r="8" fill="#f2c14e" ${OUT_THIN}/>` },
  gateDoors: {
    w: 240, h: 220, ax: 120, ay: 210, body: `
      <path d="M64 210 V110 Q64 64 120 60 V210Z" fill="#8a4c24" ${OUT}/>
      <path d="M176 210 V110 Q176 64 120 60 V210Z" fill="#8a4c24" ${OUT}/>
      <g fill="#f2c14e" ${OUT_THIN}><circle cx="110" cy="150" r="6"/><circle cx="130" cy="150" r="6"/></g>
      <path d="M78 130 H108 M78 170 H108 M132 130 H162 M132 170 H162" stroke="#5e3214" stroke-width="4"/>
      <rect x="108" y="140" width="24" height="26" rx="4" fill="url(#g-brass)" ${OUT_THIN}/>` },
  chest: {
    w: 80, h: 70, ax: 40, ay: 64, body: `
      <ellipse cx="40" cy="64" rx="36" ry="5" fill="#000" opacity=".18"/>
      <path d="M6 32 H74 V60 Q74 64 70 64 H10 Q6 64 6 60Z" fill="#a0602e" ${OUT}/>
      <path d="M4 34 Q4 8 40 6 Q76 8 76 34Z" fill="#b8723a" ${OUT}/>
      <path d="M20 8 V64 M60 8 V64" stroke="url(#g-brass)" stroke-width="6"/>
      <rect x="33" y="30" width="14" height="14" rx="3" fill="url(#g-brass)" ${OUT_THIN}/>` },
  chestOpen: {
    w: 80, h: 70, ax: 40, ay: 64, body: `
      <ellipse cx="40" cy="64" rx="36" ry="5" fill="#000" opacity=".18"/>
      <path d="M4 20 Q4 -4 40 -6 Q76 -4 76 20 L70 30 H10Z" fill="#8a4c24" ${OUT}/>
      <path d="M6 32 H74 V60 Q74 64 70 64 H10 Q6 64 6 60Z" fill="#a0602e" ${OUT}/>
      <path d="M10 32 Q40 22 70 32" fill="#ffd23f" ${OUT_THIN}/>
      <path d="M20 32 V64 M60 32 V64" stroke="url(#g-brass)" stroke-width="6"/>` },
  sign: {
    w: 70, h: 80, ax: 35, ay: 76, body: `
      <ellipse cx="35" cy="76" rx="18" ry="4" fill="#000" opacity=".18"/>
      <path d="M35 76 V30" stroke="${LINE}" stroke-width="9"/><path d="M35 76 V30" stroke="#9a6b3a" stroke-width="5"/>
      <rect x="4" y="6" width="62" height="36" rx="6" fill="#d9a86a" ${OUT}/>
      <path d="M14 18 H56 M14 30 H46" stroke="#6b3f1f" stroke-width="4" stroke-linecap="round"/>` },
  bush: {
    w: 80, h: 60, ax: 40, ay: 56, body: `
      <ellipse cx="40" cy="56" rx="34" ry="5" fill="#000" opacity=".15"/>
      <path d="M8 50 Q0 30 18 26 Q20 8 40 10 Q60 6 64 26 Q82 30 72 50Z" fill="#4f9c49" ${OUT}/>
      <path d="M20 30 q6 -6 12 0 M44 22 q6 -6 12 0" fill="none" stroke="#7cc36a" stroke-width="3" stroke-linecap="round"/>
      <g fill="#fff" ${OUT_THIN}><circle cx="26" cy="40" r="4"/><circle cx="52" cy="36" r="4"/></g>` },
  rock: {
    w: 70, h: 50, ax: 35, ay: 46, body: `
      <ellipse cx="35" cy="46" rx="30" ry="5" fill="#000" opacity=".15"/>
      <path d="M6 44 Q2 22 22 14 Q40 4 56 16 Q70 28 64 44Z" fill="#b8a992" ${OUT}/>
      <path d="M18 22 Q30 14 42 18" fill="none" stroke="#e0d6c4" stroke-width="4" stroke-linecap="round"/>` },
  boat: {
    w: 180, h: 120, ax: 90, ay: 100, body: null },
  lamp: {
    w: 40, h: 110, ax: 20, ay: 106, body: `
      <ellipse cx="20" cy="106" rx="10" ry="3" fill="#000" opacity=".18"/>
      <path d="M20 106 V30" stroke="${LINE}" stroke-width="7"/><path d="M20 106 V30" stroke="#3b3b3b" stroke-width="3"/>
      <path d="M8 30 L12 12 H28 L32 30Z" fill="#ffe08a" ${OUT_THIN}/><path d="M6 12 H34 L20 2Z" fill="#3b3b3b" ${OUT_THIN}/>` },
  monument: {
    w: 140, h: 200, ax: 70, ay: 192, body: `
      <ellipse cx="70" cy="192" rx="64" ry="8" fill="#000" opacity=".15"/>
      <path d="M14 192 V168 H126 V192Z" fill="#d9c4a0" ${OUT}/>
      <path d="M30 168 V40 Q30 14 70 10 Q110 14 110 40 V168Z" fill="#f1e2c4" ${OUT}/>
      <path d="M44 150 V56 Q44 34 70 32 Q96 34 96 56 V150Z" fill="#2c5e6e" ${OUT_THIN}/>
      <g class="slots" fill="#1b3e4a" ${OUT_THIN}><circle cx="70" cy="62" r="11"/><circle cx="70" cy="96" r="11"/><circle cx="70" cy="130" r="11"/></g>` },
  lighthouse: {
    w: 160, h: 320, ax: 80, ay: 310, body: `
      <ellipse cx="80" cy="310" rx="74" ry="9" fill="#000" opacity=".15"/>
      <path d="M22 310 V262 H138 V310Z" fill="#d9c4a0" ${OUT}/>
      <path d="M40 262 L54 70 H106 L120 262Z" fill="#fbf1dc" ${OUT}/>
      <path d="M43 222 L117 222 L114 188 L46 188Z M48 150 L112 150 L109 118 L51 118Z" fill="#c7373f"/>
      <path d="M40 262 L54 70 H106 L120 262Z" fill="none" ${OUT}/>
      <path d="M68 262 V230 Q80 214 92 230 V262Z" fill="#6b3f1f" ${OUT_THIN}/>
      <path d="M46 70 H114 V58 H46Z" fill="#6b3f1f" ${OUT}/>
      <path d="M56 58 V26 H104 V58Z" fill="#fff4b0" ${OUT}/>
      <path d="M68 58 V26 M92 58 V26" stroke="${LINE}" stroke-width="3"/>
      <path d="M50 26 Q80 -6 110 26Z" fill="#c7373f" ${OUT}/>
      <circle cx="80" cy="4" r="5" fill="url(#g-brass)" ${OUT_THIN}/>` },
  compass: {
    w: 140, h: 150, ax: 70, ay: 142, body: `
      <ellipse cx="70" cy="142" rx="64" ry="8" fill="#000" opacity=".15"/>
      <path d="M22 142 V112 H118 V142Z" fill="#d9c4a0" ${OUT}/>
      <path d="M40 112 V92 H100 V112Z" fill="#e8d7b8" ${OUT}/>
      <circle cx="70" cy="62" r="54" fill="url(#g-brass)" ${OUT}/>
      <circle cx="70" cy="62" r="44" fill="#fff7e6" ${OUT_THIN}/>
      <path d="M70 26 L78 62 L70 98 L62 62Z" fill="#e8d3a6" ${OUT_THIN}/>
      <path d="M34 62 L70 55 L106 62 L70 69Z" fill="#e8d3a6" ${OUT_THIN}/>
      <circle cx="70" cy="62" r="6" fill="#c7373f" ${OUT_THIN}/>` },
  fishstall: {
    w: 180, h: 160, ax: 90, ay: 150, body: `
      <ellipse cx="90" cy="152" rx="84" ry="7" fill="#000" opacity=".15"/>
      <path d="M20 60 V150 M160 60 V150" stroke="${LINE}" stroke-width="8"/><path d="M20 60 V150 M160 60 V150" stroke="#9a6b3a" stroke-width="4"/>
      <path d="M8 60 L90 24 L172 60Z" fill="#1f9aa0" ${OUT}/>
      <path d="M8 60 Q22 72 36 60 Q50 72 64 60 Q78 72 92 60 Q106 72 120 60 Q134 72 148 60 Q160 72 172 60" fill="#fbf1dc" ${OUT_THIN}/>
      <path d="M14 104 H166 V128 H14Z" fill="#a0602e" ${OUT}/>
      <g ${OUT_THIN}><path d="M26 98 q14 -12 28 0 q-14 10 -28 0Z M54 98 l8 -6 v12Z" fill="#8fb8d8"/><path d="M70 98 q14 -12 28 0 q-14 10 -28 0Z M98 98 l8 -6 v12Z" fill="#e8a070"/></g>
      <path d="M124 80 V104 M112 84 H136" stroke="${LINE}" stroke-width="3"/><path d="M112 84 l-6 12 h12Z M136 84 l-6 12 h12Z" fill="url(#g-brass)" ${OUT_THIN}/>` },
  hull: {
    w: 220, h: 150, ax: 110, ay: 140, body: `
      <ellipse cx="110" cy="142" rx="104" ry="8" fill="#000" opacity=".15"/>
      <path d="M40 140 L56 104 M180 140 L164 104 M100 140 V110 M130 140 V110" stroke="${LINE}" stroke-width="8"/>
      <path d="M40 140 L56 104 M180 140 L164 104 M100 140 V110 M130 140 V110" stroke="#9a6b3a" stroke-width="4"/>
      <path d="M8 50 Q110 96 212 50 L196 92 Q110 124 24 92Z" fill="url(#g-wood)" ${OUT}/>
      <path d="M30 70 Q110 104 190 70 M20 58 Q110 98 200 58" fill="none" stroke="#5e3214" stroke-width="3"/>
      <path d="M150 90 Q170 84 186 72 L190 60 Q170 78 146 84Z" fill="#fbf1dc" ${OUT_THIN}/>` },
  crates: {
    w: 90, h: 80, ax: 45, ay: 74, body: `
      <ellipse cx="45" cy="74" rx="40" ry="5" fill="#000" opacity=".15"/>
      <rect x="4" y="34" width="44" height="40" fill="#c9954f" ${OUT}/><path d="M4 34 L48 74 M48 34 L4 74" stroke="#8a5a30" stroke-width="3"/>
      <rect x="44" y="40" width="40" height="34" fill="#b88442" ${OUT}/><path d="M44 57 H84" stroke="#8a5a30" stroke-width="3"/>
      <rect x="20" y="4" width="36" height="30" fill="#d9a660" ${OUT}/>` },
  barrel: {
    w: 60, h: 70, ax: 30, ay: 66, body: `
      <ellipse cx="30" cy="66" rx="26" ry="5" fill="#000" opacity=".15"/>
      <path d="M8 12 Q2 38 8 64 H52 Q58 38 52 12Z" fill="#a0602e" ${OUT}/>
      <ellipse cx="30" cy="12" rx="22" ry="7" fill="#c98a50" ${OUT}/>
      <path d="M5 26 H55 M5 50 H55" stroke="#3b3b3b" stroke-width="4"/>` },
  observatory: {
    w: 160, h: 240, ax: 80, ay: 232, body: `
      <ellipse cx="80" cy="232" rx="74" ry="8" fill="#000" opacity=".15"/>
      <path d="M24 232 V110 H136 V232Z" fill="#e8d7b8" ${OUT}/>
      <path d="M24 150 H136 M24 190 H136" stroke="#d0bc94" stroke-width="3"/>
      <path d="M64 232 V194 Q80 176 96 194 V232Z" fill="#2c5e6e" ${OUT_THIN}/>
      <path d="M16 112 Q16 36 80 34 Q144 36 144 112Z" fill="#9fb8d8" ${OUT}/>
      <path d="M72 36 L68 112 M88 36 L92 112" stroke="${LINE}" stroke-width="3"/>
      <path d="M86 60 L138 26 L146 38 L94 72Z" fill="url(#g-brass)" ${OUT}/>
      <g fill="#fff3a0"><circle cx="30" cy="20" r="3"/><circle cx="130" cy="10" r="2.5"/><circle cx="148" cy="60" r="2"/></g>` },
  crystal: {
    w: 140, h: 180, ax: 70, ay: 172, body: `
      <ellipse cx="70" cy="172" rx="64" ry="8" fill="#000" opacity=".15"/>
      <path d="M18 172 V146 H122 V172Z" fill="#9a6b4e" ${OUT}/>
      <path d="M30 146 L40 60 L58 30 L70 8 L82 30 L100 60 L110 146Z" fill="#bfeefa" ${OUT}/>
      <path d="M70 8 V146 M40 60 L70 90 L100 60 M58 30 L70 60 L82 30" fill="none" stroke="#7fc8dd" stroke-width="3"/>
      <g class="slots" fill="#1b3e4a" ${OUT_THIN}><circle cx="70" cy="62" r="11"/><circle cx="70" cy="96" r="11"/><circle cx="70" cy="130" r="11"/></g>` },
  labtable: {
    w: 140, h: 100, ax: 70, ay: 92, body: `
      <ellipse cx="70" cy="92" rx="64" ry="6" fill="#000" opacity=".15"/>
      <path d="M14 52 H126 V64 H14Z" fill="#a0602e" ${OUT}/>
      <path d="M22 64 V92 M118 64 V92" stroke="${LINE}" stroke-width="7"/><path d="M22 64 V92 M118 64 V92" stroke="#9a6b3a" stroke-width="3"/>
      <g ${OUT_THIN}><path d="M30 52 V30 h10 V52Z" fill="#dff6ff"/><path d="M30 44 h10 v8 h-10Z" fill="#6ee07a"/>
      <path d="M56 22 h10 v10 l10 16 q2 6 -4 6 h-18 q-6 0 -4 -6 l10 -16Z" fill="#dff6ff"/><path d="M50 42 h26 l2 6 q0 4 -4 4 h-22 q-4 0 -4 -4Z" fill="#d0507e"/>
      <circle cx="100" cy="40" r="12" fill="#dff6ff"/><path d="M90 44 h20 q-2 8 -10 8 q-8 0 -10 -8Z" fill="#f2c14e"/></g>
      <g fill="#fff" opacity=".9"><circle cx="61" cy="14" r="3"/><circle cx="66" cy="6" r="2"/></g>` },
  citadel: {
    w: 280, h: 260, ax: 140, ay: 250, body: `
      <ellipse cx="140" cy="250" rx="134" ry="10" fill="#000" opacity=".15"/>
      <path d="M10 250 Q30 170 70 150 L210 150 Q250 170 270 250Z" fill="#d9b27a" ${OUT}/>
      <path d="M30 220 L250 220 M50 190 L230 190" stroke="#b98d55" stroke-width="3"/>
      <path d="M70 150 V70 H210 V150Z" fill="#e8cf9c" ${OUT}/>
      <path d="M64 70 h152 v-16 h-12 v8 h-14 v-8 h-14 v8 h-14 v-8 h-16 v8 h-14 v-8 h-14 v8 h-14 v-8 h-14 v8 h-12 v-8 h-12Z" fill="#e8cf9c" ${OUT}/>
      <path d="M120 150 V112 q20 -24 40 0 V150Z" fill="#6b3f1f" ${OUT_THIN}/>
      <path d="M140 150 L124 250 H156Z" fill="#c9a26b" ${OUT_THIN}/>
      <path d="M124 250 L140 150 L156 250" fill="none" stroke="#8a6a3a" stroke-width="2"/>
      <rect x="86" y="90" width="14" height="22" rx="7" fill="#6b3f1f"/><rect x="180" y="90" width="14" height="22" rx="7" fill="#6b3f1f"/>
      <path d="M190 54 V20" ${OUT}/><path d="M190 22 Q182 10 190 2 Q198 10 190 22Z" fill="#f2c14e" ${OUT_THIN}/>` },
  noria: {
    w: 180, h: 180, ax: 90, ay: 90, spin: true, body: `
      <circle cx="90" cy="90" r="80" fill="none" stroke="${LINE}" stroke-width="12"/>
      <circle cx="90" cy="90" r="80" fill="none" stroke="#8a5a30" stroke-width="7"/>
      <circle cx="90" cy="90" r="56" fill="none" stroke="#8a5a30" stroke-width="4"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<path d="M90 90 L${90 + Math.cos(a) * 80} ${90 + Math.sin(a) * 80}" stroke="#6b3f1f" stroke-width="5"/><rect x="${90 + Math.cos(a) * 80 - 8}" y="${90 + Math.sin(a) * 80 - 8}" width="16" height="16" fill="#b98a5a" ${OUT_THIN} transform="rotate(${(a * 180) / Math.PI} ${90 + Math.cos(a) * 80} ${90 + Math.sin(a) * 80})"/>`; }).join('')}
      <circle cx="90" cy="90" r="12" fill="url(#g-brass)" ${OUT}/>` },
  noriabase: {
    w: 200, h: 120, ax: 100, ay: 112, body: `
      <path d="M30 112 L70 10 H90 L60 112Z M170 112 L130 10 H110 L140 112Z" fill="#d9c4a0" ${OUT}/>` },
  columns: {
    w: 220, h: 200, ax: 110, ay: 192, body: `
      <ellipse cx="110" cy="192" rx="104" ry="8" fill="#000" opacity=".15"/>
      <path d="M10 192 V178 H210 V192Z" fill="#e0c79a" ${OUT}/>
      ${[30, 80, 130, 180].map(x => `<path d="M${x - 12} 178 V50 H${x + 12} V178Z" fill="#f1e2c4" ${OUT}/><path d="M${x - 4} 170 V58 M${x + 4} 170 V58" stroke="#d8c29a" stroke-width="2"/><path d="M${x - 18} 50 h36 v-12 h-36Z" fill="#e8d7b8" ${OUT_THIN}/>`).join('')}
      <path d="M8 38 H212 V20 H8Z" fill="#e8d7b8" ${OUT}/>` },
  bigchest: { w: 240, h: 200, ax: 120, ay: 186, body: null },
  flowers: { w: 48, h: 30, ax: 24, ay: 26, flat: true, body: `
      <g ${OUT_THIN}><circle cx="10" cy="18" r="5" fill="#d0507e"/><circle cx="24" cy="10" r="5" fill="#fff"/><circle cx="38" cy="18" r="5" fill="#f2c14e"/><circle cx="26" cy="24" r="4" fill="#fff"/></g>` },
};

// Late-bound bodies that reuse art from art.js.
objects.palm.body = palmSVG().replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '');
objects.bigchest.body = chestSVG().replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '');
objects.boat.body = `
  <path d="M10 70 Q90 96 170 70 L156 94 Q90 112 24 94Z" fill="url(#g-wood)" ${OUT}/>
  <path d="M16 74 Q90 98 164 74" fill="none" stroke="#23a39a" stroke-width="6"/>
  <path d="M90 76 V10" ${OUT}/><path d="M92 12 Q140 30 94 70Z" fill="url(#g-sail)" ${OUT}/>`;

export function objectSprite(kind) {
  const o = objects[kind];
  const e = svgImage(`obj:${kind}`, o.body, o.w, o.h, 1);
  return { ...e, ax: o.ax, ay: o.ay, flat: !!o.flat, spin: !!o.spin };
}

export function villagerSprite(id, look) {
  const e = svgImage(`npc:${id}`, villagerBody(look), 200, 300, 0.6);
  return { ...e, ax: 100, ay: 290 };
}

export function heroSprite(id) {
  const e = svgImage(`hero:${id}`, HEROES[id].body(), 200, 300, 0.6);
  return { ...e, ax: 100, ay: 290 };
}

export function hudhudSprite() {
  const e = svgImage('hudhud', hudhudBody(), 160, 140, 0.8);
  return { ...e, ax: 86, ay: 128 };
}

// Portrait crop for dialogue boxes (just the head and shoulders).
export function portraitSVG(look, heroId) {
  const body = heroId ? HEROES[heroId].body() : villagerBody(look);
  return `<svg viewBox="40 20 120 130" aria-hidden="true">${body}</svg>`;
}

// Collectibles drawn straight on the canvas (cheap, and they spin/bob).
export function drawPearl(ctx, x, y, t) {
  const b = Math.sin(t * 3 + x) * 3;
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.beginPath(); ctx.ellipse(x, y + 8, 8, 3, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(x - 3, y - 4 + b, 1, x, y + b, 9);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f3e9ff'); g.addColorStop(1, '#c9b8e8');
  ctx.fillStyle = g; ctx.strokeStyle = LINE; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y - 2 + b, 8, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 3, y - 5 + b, 2.2, 0, 7); ctx.fill();
}
