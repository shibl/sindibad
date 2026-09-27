// Shared inline-SVG art for the game.
//
// Art lives here as SVG strings (rather than .svg files loaded via <img>) so
// the page's CSS animations can reach inside them — sails billowing, Sindbad
// waving, Yasmina's braid swinging, Hudhud's crest lifting, eyes blinking.
// The class names below (.wave-arm, .eyes, .crest, .flag, .frond …) are the
// hooks those animations target in style.css.
//
// Style rules, so new art matches:
// - Warm dark-brown outline (#3b2414), rounded joins, ~3 units wide.
// - Flat fills plus one gradient or highlight for volume; no SVG filters
//   (they are slow on low-end Android).
// - Colours come from a Levantine palette: sand, sea teal, Damascene rose,
//   embroidery red/green, brass gold.
//
// Characters are the grade 4–6 "البحار الصغير" (young sailor) stage from the
// founding brief: active build, practical scarf, leather belt with a pouch.
//
// Licence: CC-BY-SA (see README.md).

export const LINE = '#3b2414';
export const OUT = `stroke="${LINE}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
export const OUT_THIN = `stroke="${LINE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

// A limb: a thick coloured stroke with a darker outline stroke under it.
export function limb(d, color, width = 14) {
  return `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="${width + 6}" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// ---------- Shared gradients ----------
// Injected once into the page (see app.js). Kept out of the individual
// pictures so hidden screens can't break them (Chrome won't paint a gradient
// whose <defs> live inside a display:none subtree). Also used raw by
// art/sprites.js to make self-contained images for the canvas.
export const DEFS = `
    <linearGradient id="g-wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b06a36"/><stop offset=".55" stop-color="#8a4c24"/><stop offset="1" stop-color="#5e3214"/>
    </linearGradient>
    <linearGradient id="g-sail" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fffaf0"/><stop offset=".6" stop-color="#f6e7c8"/><stop offset="1" stop-color="#e2c99a"/>
    </linearGradient>
    <linearGradient id="g-skin-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#7a3b1c" stop-opacity=".18"/>
    </linearGradient>
    <linearGradient id="g-frond" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2f7d3c"/><stop offset="1" stop-color="#58b04f"/>
    </linearGradient>
    <linearGradient id="g-trunk" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7a4a26"/><stop offset=".5" stop-color="#a86e3c"/><stop offset="1" stop-color="#6b3f1f"/>
    </linearGradient>
    <linearGradient id="g-brass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe08a"/><stop offset=".5" stop-color="#e0a93a"/><stop offset="1" stop-color="#a8741e"/>
    </linearGradient>
    <radialGradient id="g-glow">
      <stop offset="0" stop-color="#fff2b0" stop-opacity="1"/><stop offset=".4" stop-color="#ffc94a" stop-opacity=".6"/><stop offset="1" stop-color="#ffb030" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g-cheek">
      <stop offset="0" stop-color="#ff7f7f" stop-opacity=".55"/><stop offset="1" stop-color="#ff7f7f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="g-hudhud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4ac6c"/><stop offset="1" stop-color="#d9824a"/>
    </linearGradient>
  `;

export function defsSVG() {
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${DEFS}</defs></svg>`;
}

// ---------- Faces ----------

function eyes({ lashes = false } = {}) {
  const eye = (cx, flip) => `
    <ellipse cx="${cx}" cy="86" rx="9.5" ry="11.5" fill="#fff" ${OUT_THIN}/>
    <circle cx="${cx + 1}" cy="88" r="6.8" fill="#5a3218"/>
    <circle cx="${cx + 1}" cy="88.5" r="3.4" fill="#1b0f08"/>
    <circle cx="${cx - 1.6}" cy="85" r="2.3" fill="#fff"/>
    <circle cx="${cx + 3}" cy="91.5" r="1" fill="#fff"/>
    ${lashes ? `<path d="M${cx + flip * 8} 78 l${flip * 5} -4 M${cx + flip * 9.5} 82 l${flip * 5.5} -2" ${OUT_THIN} fill="none"/>` : ''}`;
  return `<g class="eyes">${eye(84, -1)}${eye(116, 1)}</g>`;
}

function face({ lashes = false } = {}) {
  return `
    <ellipse cx="72" cy="101" rx="9" ry="6" fill="url(#g-cheek)"/>
    <ellipse cx="128" cy="101" rx="9" ry="6" fill="url(#g-cheek)"/>
    ${eyes({ lashes })}
    <path d="M98 93 Q103 99 97.5 101.5" fill="none" ${OUT_THIN}/>
    <path d="M87 106 Q100 120 113 106 Q100 111 87 106Z" fill="#8a2c2c" ${OUT_THIN}/>
    <path d="M90 107.2 Q100 110.5 110 107.2 L109 109.5 Q100 112 91 109.5Z" fill="#fff"/>
    <path d="M94 114.5 Q100 117.5 106 114.5 Q100 112.5 94 114.5Z" fill="#e0686b"/>`;
}

export function head({ skin, lashes }) {
  return `
    <rect x="91" y="110" width="18" height="20" rx="6" fill="${skin}" ${OUT}/>
    <circle cx="61" cy="84" r="9" fill="${skin}" ${OUT}/>
    <circle cx="139" cy="84" r="9" fill="${skin}" ${OUT}/>
    <ellipse cx="100" cy="80" rx="40" ry="42" fill="${skin}" ${OUT}/>
    <ellipse cx="100" cy="80" rx="38" ry="40" fill="url(#g-skin-shade)"/>
    ${face({ lashes })}`;
}

// ---------- Sindbad ----------
// Young sailor: red bandana, embroidered red vest, green scarf, leather belt
// with pouch, blue sirwal, rolled map scroll in hand. Right arm waves.
function sindbadBody() {
  const skin = '#e3a878';
  return `
  <ellipse cx="100" cy="289" rx="48" ry="7" fill="#000" opacity=".16"/>
  <!-- legs: baggy sirwal with ankle wraps -->
  <path d="M71 196 Q64 240 74 272 L97 272 Q98 238 100 214 Q102 238 103 272 L126 272 Q136 240 129 196Z" fill="#35508f" ${OUT}/>
  <path d="M100 216 L100 250" stroke="#26396b" stroke-width="3" stroke-linecap="round"/>
  <path d="M73 262 L97 262 L97 272 L74 272Z M103 262 L126 262 L126 272 L103 272Z" fill="#efe1c2" ${OUT_THIN}/>
  <path d="M74 270 Q62 288 84 287 L98 285 Q101 277 97 270Z" fill="#6e3a1a" ${OUT}/>
  <path d="M126 270 Q138 288 116 287 L102 285 Q99 277 103 270Z" fill="#6e3a1a" ${OUT}/>
  <!-- left arm holding a map scroll -->
  ${limb('M72 138 Q60 160 60 184', '#fbf1dc', 16)}
  ${limb('M60 184 L60 192', skin, 12)}
  <g transform="rotate(-18 60 196)">
    <rect x="44" y="190" width="34" height="12" rx="6" fill="#f3e2b8" ${OUT_THIN}/>
    <path d="M58 190 L58 202" stroke="#c7373f" stroke-width="3"/>
    <ellipse cx="44" cy="196" rx="3" ry="6" fill="#e6cf9a" ${OUT_THIN}/>
  </g>
  <circle cx="60" cy="195" r="7.5" fill="${skin}" ${OUT}/>
  <!-- torso -->
  <path d="M70 130 Q100 121 130 130 Q139 162 133 200 L67 200 Q61 162 70 130Z" fill="#fbf1dc" ${OUT}/>
  <path d="M70 130 Q82 125 91 127 Q88 164 92 200 L67 200 Q61 162 70 130Z" fill="#b3303a" ${OUT}/>
  <path d="M130 130 Q118 125 109 127 Q112 164 108 200 L133 200 Q139 162 130 130Z" fill="#b3303a" ${OUT}/>
  <path d="M88 132 Q86 164 89 196 M112 132 Q114 164 111 196" fill="none" stroke="#f2c14e" stroke-width="2.5" stroke-dasharray="1 5" stroke-linecap="round"/>
  <path d="M78 150 l5 6 l-5 6 l-5 -6Z M122 150 l5 6 l-5 6 l-5 -6Z" fill="#f2c14e" ${OUT_THIN}/>
  <!-- belt + pouch -->
  <path d="M66 186 Q100 194 134 186 L134 199 Q100 207 66 199Z" fill="#7a4520" ${OUT}/>
  <rect x="93" y="188" width="14" height="14" rx="3" fill="url(#g-brass)" ${OUT_THIN}/>
  <path d="M114 194 h20 v20 q0 6 -6 6 h-8 q-6 0 -6 -6Z" fill="#94562a" ${OUT}/>
  <path d="M114 194 h20 v8 q-10 5 -20 0Z" fill="#7a4520" ${OUT_THIN}/>
  <!-- scarf -->
  <path d="M78 124 Q100 140 122 124 Q120 136 100 145 Q80 136 78 124Z" fill="#2f8a5f" ${OUT}/>
  <path d="M104 138 L116 166 L104 163 Z" fill="#2f8a5f" ${OUT}/>
  <!-- waving arm -->
  <g class="wave-arm">
    ${limb('M129 137 Q146 128 152 110', '#fbf1dc', 16)}
    ${limb('M152 110 L155 100', skin, 12)}
    <path d="M150 99 Q148 84 155 84 Q157 76 162 80 Q167 78 167 86 Q172 88 167 98 Q160 104 150 99Z" fill="${skin}" ${OUT}/>
  </g>
  <!-- head -->
  ${head({ skin, lashes: false })}
  <!-- curly hair -->
  <path d="M60 78 Q54 40 100 34 Q146 40 140 78 Q135 64 126 66 Q119 54 108 60 Q98 50 88 60 Q77 54 71 67 Q64 64 60 78Z" fill="#3a2215" ${OUT}/>
  <path d="M62 84 Q58 96 64 104" fill="none" stroke="#3a2215" stroke-width="5" stroke-linecap="round"/>
  <path d="M138 84 Q142 96 136 104" fill="none" stroke="#3a2215" stroke-width="5" stroke-linecap="round"/>
  <!-- bandana with fluttering tails -->
  <path d="M60 64 Q100 42 140 64 L139 74 Q100 54 61 74Z" fill="#c7373f" ${OUT}/>
  <path d="M68 61 Q100 46 132 61" fill="none" stroke="#fbf1dc" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>
  <g class="flutter">
    <path d="M139 66 Q156 60 162 70 Q152 70 146 74Z" fill="#c7373f" ${OUT}/>
    <path d="M139 70 Q152 78 154 90 Q146 84 140 78Z" fill="#a82c34" ${OUT}/>
  </g>
  <circle cx="140" cy="68" r="5" fill="#a82c34" ${OUT}/>
  <!-- brows -->
  <path d="M75 70 Q84 65 92 70 M108 70 Q116 65 125 70" fill="none" stroke="#3a2215" stroke-width="4" stroke-linecap="round"/>
  <circle cx="94" cy="99" r="1" fill="#b56a44"/><circle cx="106" cy="99" r="1" fill="#b56a44"/><circle cx="100" cy="102" r="1" fill="#b56a44"/>`;
}

// ---------- Yasmina ----------
// Young explorer: long braid, teal headband with a jasmine flower, rose
// tunic with a Levantine cross-stitch chest panel and hem, leather belt with
// pouch, brass spyglass in hand. Right arm waves.
function yasminaBody() {
  const skin = '#eab38a';
  const stitch = (x, y) => `<path d="M${x} ${y - 4} l4 4 l-4 4 l-4 -4Z" fill="#b3303a"/><circle cx="${x}" cy="${y}" r="1.3" fill="#2f8a5f"/>`;
  return `
  <ellipse cx="100" cy="289" rx="46" ry="7" fill="#000" opacity=".16"/>
  <!-- back hair (behind head and shoulders) -->
  <path d="M58 80 Q56 118 70 132 L130 132 Q144 118 142 80Z" fill="#2e1a10" ${OUT}/>
  <!-- legs -->
  <path d="M80 230 L78 272 L97 272 L99 230Z M101 230 L103 272 L122 272 L120 230Z" fill="#1f6d78" ${OUT}/>
  <path d="M78 270 Q66 287 86 286 L98 285 Q100 277 97 270Z" fill="#b8373a" ${OUT}/>
  <path d="M122 270 Q134 287 114 286 L102 285 Q100 277 103 270Z" fill="#b8373a" ${OUT}/>
  <!-- left arm with spyglass -->
  ${limb('M71 138 Q60 160 60 184', '#d0507e', 15)}
  ${limb('M60 184 L60 192', skin, 12)}
  <g transform="rotate(24 60 198)">
    <rect x="40" y="191" width="44" height="12" rx="3" fill="url(#g-brass)" ${OUT_THIN}/>
    <rect x="36" y="189" width="10" height="16" rx="3" fill="url(#g-brass)" ${OUT_THIN}/>
    <path d="M58 191 v12 M70 191 v12" stroke="#8a5a14" stroke-width="2"/>
  </g>
  <circle cx="60" cy="196" r="7.5" fill="${skin}" ${OUT}/>
  <!-- tunic -->
  <path d="M70 130 Q100 121 130 130 Q142 180 144 236 L56 236 Q58 180 70 130Z" fill="#d0507e" ${OUT}/>
  <path d="M60 222 L140 222 L142 236 L58 236Z" fill="#fbf1dc" ${OUT_THIN}/>
  ${[66, 80, 94, 108, 122, 136].map(x => stitch(x, 229)).join('')}
  <path d="M86 130 L114 130 L111 172 L89 172Z" fill="#fbf1dc" ${OUT_THIN}/>
  ${stitch(93, 140)}${stitch(107, 140)}${stitch(100, 152)}${stitch(93, 164)}${stitch(107, 164)}
  <!-- belt + pouch -->
  <path d="M64 184 Q100 192 136 184 L137 196 Q100 204 63 196Z" fill="#7a4520" ${OUT}/>
  <circle cx="100" cy="193" r="6" fill="url(#g-brass)" ${OUT_THIN}/>
  <path d="M114 192 h18 v18 q0 6 -6 6 h-6 q-6 0 -6 -6Z" fill="#94562a" ${OUT}/>
  <path d="M114 192 h18 v8 q-9 5 -18 0Z" fill="#7a4520" ${OUT_THIN}/>
  <!-- scarf -->
  <path d="M80 124 Q100 138 120 124 Q118 134 100 142 Q82 134 80 124Z" fill="#f2c14e" ${OUT}/>
  <!-- braid over the shoulder (swings) -->
  <g class="braid">
    ${[0, 1, 2, 3, 4].map(i => `<ellipse cx="${64 - i * 0.5}" cy="${118 + i * 13}" rx="8.5" ry="8" fill="#2e1a10" ${OUT_THIN}/>`).join('')}
    <path d="M58 178 q6 -4 12 0 l-2 6 h-8Z" fill="#1f9aa0" ${OUT_THIN}/>
    <path d="M58 184 q5 12 6 12 q2 0 6 -12Z" fill="#2e1a10" ${OUT_THIN}/>
  </g>
  <!-- waving arm -->
  <g class="wave-arm">
    ${limb('M129 137 Q146 128 152 110', '#d0507e', 15)}
    ${limb('M152 110 L155 100', skin, 12)}
    <path d="M150 99 Q148 84 155 84 Q157 76 162 80 Q167 78 167 86 Q172 88 167 98 Q160 104 150 99Z" fill="${skin}" ${OUT}/>
  </g>
  <!-- head -->
  ${head({ skin, lashes: true })}
  <!-- fringe -->
  <path d="M60 80 Q56 38 100 34 Q146 38 141 82 Q134 60 116 56 Q108 72 84 66 Q70 68 60 80Z" fill="#2e1a10" ${OUT}/>
  <!-- headband with jasmine -->
  <path d="M61 62 Q100 38 139 62" fill="none" stroke="${LINE}" stroke-width="10" stroke-linecap="round"/>
  <path d="M61 62 Q100 38 139 62" fill="none" stroke="#1f9aa0" stroke-width="6" stroke-linecap="round"/>
  <g transform="translate(133 60)">
    ${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-7" rx="4.6" ry="7" fill="#fff" ${OUT_THIN} transform="rotate(${a})"/>`).join('')}
    <circle r="3.4" fill="#f2c14e" ${OUT_THIN}/>
  </g>
  <!-- brows -->
  <path d="M76 71 Q84 67 92 71 M108 71 Q116 67 124 71" fill="none" stroke="#2e1a10" stroke-width="3" stroke-linecap="round"/>`;
}

export const HEROES = {
  sindbad: { id: 'sindbad', name: 'سندباد', female: false, body: sindbadBody },
  yasmina: { id: 'yasmina', name: 'ياسمينة', female: true, body: yasminaBody },
};

// Arabic is gendered: pick the masculine or feminine form for a hero.
export const g = (heroId, m, f) => (HEROES[heroId]?.female ? f : m);

// Full-body portrait of a hero. viewBox 200×300.
export function heroSVG(id, cls = '') {
  return `<svg class="hero-art ${cls}" viewBox="0 0 200 300" aria-hidden="true"><g class="hero hero--${id}">${HEROES[id].body()}</g></svg>`;
}

// ---------- Hudhud (الهدهد) ----------
// The wise hoopoe guide: salmon body, black-and-white barred wings, a crest
// fan with black tips, long curved beak, and round reading glasses.
export function hudhudBody() {
  const feathers = [-62, -44, -26, -8, 10, 28].map((a, i) => `
    <g transform="rotate(${a} 60 40)">
      <path d="M60 40 Q54 22 60 ${6 - (i % 2) * 3} Q66 22 60 40Z" fill="#f2a45e" ${OUT_THIN}/>
      <path d="M57 ${14 - (i % 2) * 3} Q60 ${3 - (i % 2) * 3} 63 ${14 - (i % 2) * 3} Z" fill="#241c18"/>
      <path d="M57.3 ${16 - (i % 2) * 3} L62.7 ${16 - (i % 2) * 3}" stroke="#fff" stroke-width="2"/>
    </g>`).join('');
  return `
  <ellipse cx="86" cy="134" rx="34" ry="5" fill="#000" opacity=".14"/>
  <path d="M112 86 L154 72 L152 86 L116 98Z" fill="#241c18" ${OUT}/>
  <path d="M132 80 L136 92" stroke="#fff" stroke-width="4"/>
  <path d="M72 106 L68 128 M84 106 L86 128 M62 128 h12 M80 128 h12" fill="none" stroke="#6b5a50" stroke-width="3.5" stroke-linecap="round"/>
  <ellipse cx="88" cy="86" rx="37" ry="27" fill="url(#g-hudhud)" ${OUT}/>
  <ellipse cx="78" cy="96" rx="22" ry="13" fill="#f9d2a6"/>
  <g class="wing">
    <path d="M74 74 Q110 60 132 84 Q110 106 76 96Z" fill="#241c18" ${OUT}/>
    <path d="M88 70 Q93 84 88 98 M101 69 Q106 84 101 101 M114 72 Q119 86 113 100" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  </g>
  <g class="crest">${feathers}</g>
  <circle cx="54" cy="58" r="23" fill="url(#g-hudhud)" ${OUT}/>
  <path d="M34 58 Q16 63 2 80 Q20 68 35 66Z" fill="#2f2622" ${OUT_THIN}/>
  <ellipse cx="60" cy="68" rx="6" ry="4" fill="url(#g-cheek)"/>
  <g class="eyes">
    <circle cx="48" cy="54" r="8" fill="#fff" ${OUT_THIN}/>
    <circle cx="46.5" cy="55" r="4.6" fill="#1b0f08"/>
    <circle cx="45" cy="53" r="1.8" fill="#fff"/>
  </g>
  <circle cx="48" cy="54" r="11" fill="#fff" fill-opacity=".12" stroke="#6b4a1a" stroke-width="2.5"/>
  <path d="M59 52 L72 48" stroke="#6b4a1a" stroke-width="2.5" stroke-linecap="round"/>`;
}

// viewBox 160×140.
export function hudhudSVG(cls = '') {
  return `<svg class="hudhud-art ${cls}" viewBox="0 0 160 140" aria-hidden="true"><g class="hudhud">${hudhudBody()}</g></svg>`;
}

// ---------- Ship: a Levantine dhow ----------
// crew: array of hero ids standing on deck (0–2). Hudhud rides on the bow.
// viewBox 360×260.
export function shipSVG({ crew = ['sindbad', 'yasmina'], hudhud = true } = {}) {
  const slots = [[96, 104], [226, 96]];
  const heroes = crew.slice(0, 2).map((id, i) => `
    <svg x="${slots[i][0]}" y="${slots[i][1]}" width="80" height="120" viewBox="0 0 200 300" overflow="visible">
      <g class="hero hero--${id}">${HEROES[id].body()}</g>
    </svg>`).join('');
  const zig = Array.from({ length: 19 }, (_, i) => `M${36 + i * 16} 196 l6 -6 l6 6`).join(' ');
  return `
<svg class="ship-art" viewBox="0 0 360 260" aria-hidden="true">
  <!-- rigging -->
  <path d="M202 36 L24 172 M202 36 L336 160" stroke="${LINE}" stroke-width="1.5" opacity=".6"/>
  <!-- mast -->
  <path d="M214 196 L199 8" stroke="${LINE}" stroke-width="11" stroke-linecap="round"/>
  <path d="M214 196 L199 8" stroke="#7a4520" stroke-width="6" stroke-linecap="round"/>
  <!-- lateen sail -->
  <g class="sail">
    <path d="M62 92 Q176 34 300 22 Q262 110 222 178 Q148 128 62 92Z" fill="url(#g-sail)" ${OUT}/>
    <path d="M110 70 Q156 110 178 150 M160 50 Q186 100 200 164 M214 36 Q222 90 222 172 M258 28 Q248 90 232 160" fill="none" stroke="#d8bf8e" stroke-width="2"/>
    <path d="M150 96 l18 -6 l6 16 l-18 6Z" fill="#e8d3a6" ${OUT_THIN}/>
    <path d="M62 92 Q176 34 300 22" fill="none" stroke="${LINE}" stroke-width="9" stroke-linecap="round"/>
    <path d="M62 92 Q176 34 300 22" fill="none" stroke="#8a4c24" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g class="flag"><path d="M199 4 Q224 0 250 10 Q226 12 200 20Z" fill="#d0507e" ${OUT_THIN}/></g>
  <circle cx="199" cy="6" r="4" fill="url(#g-brass)" ${OUT_THIN}/>
  <!-- crew -->
  ${heroes}
  ${hudhud ? `<svg x="8" y="118" width="76" height="66" viewBox="0 0 160 140" overflow="visible"><g class="hudhud">${hudhudBody()}</g></svg>` : ''}
  <!-- hull -->
  <path d="M18 176 Q60 190 110 192 L290 192 Q320 188 344 160 L338 206 Q318 238 264 244 L110 244 Q60 238 18 176Z" fill="url(#g-wood)" ${OUT}/>
  <path d="M24 180 Q62 196 110 198 L290 198 Q322 194 342 170 L341 184 Q320 206 290 208 L110 208 Q64 206 30 188Z" fill="#23a39a" ${OUT_THIN}/>
  <path d="${zig}" fill="none" stroke="#fbf1dc" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M58 214 Q100 224 150 224 L300 222 M84 230 Q120 236 170 236 L290 234" fill="none" stroke="#4a2610" stroke-width="2" opacity=".55"/>
  <path d="M300 214 h18 v12 h-18Z M270 216 h16 v10 h-16Z" fill="#f2c14e" ${OUT_THIN}/>
  <path d="M18 176 Q6 164 12 152 Q20 150 20 160" fill="none" ${OUT}/>
  <!-- stern lantern (glows at night) -->
  <circle class="lantern-glow" cx="330" cy="150" r="40" fill="url(#g-glow)"/>
  <path d="M330 162 V176" stroke="${LINE}" stroke-width="3"/>
  <rect x="322" y="140" width="16" height="22" rx="4" fill="#ffe08a" ${OUT_THIN}/>
  <path d="M320 140 h20 l-4 -6 h-12Z" fill="#7a4520" ${OUT_THIN}/>
  <!-- foam at the waterline -->
  <path d="M40 232 Q190 250 336 228 L340 252 Q190 262 36 250Z" fill="#2c9fc6" opacity=".55"/>
  <g class="foam" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9">
    <path d="M30 236 q10 -8 20 0 t20 0 M110 246 q10 -7 20 0 t20 0 t20 0 M230 244 q10 -7 20 0 t20 0 M300 236 q10 -8 20 0 t20 0"/>
  </g>
</svg>`;
}

// ---------- Scenery ----------

// A date palm with outlined fronds and a cluster of dates. viewBox 160×240.
export function palmSVG() {
  // Each frond: a broad drooping leaf with a midrib and notched edge.
  const fronds = [
    [-172, 92, 30], [-140, 96, 22], [-104, 78, 10], [-72, 86, -12], [-36, 96, -24], [-6, 88, -30], [-200, 70, 34],
  ].map(([a, len, droop], i) => {
    const tipX = 84 + len, tipY = 72 + droop * 0.4;
    return `
    <g class="frond" style="animation-delay:${-i * 0.37}s" transform="rotate(${a} 84 72)">
      <path d="M84 72 Q${84 + len * 0.45} ${50 - droop * 0.2} ${tipX} ${tipY}
               Q${84 + len * 0.6} ${78} ${84 + len * 0.42} ${84}
               l-6 -4 l-2 6 Q${84 + len * 0.2} ${82} 84 72Z"
            fill="${i % 2 ? '#3a8f45' : 'url(#g-frond)'}" ${OUT_THIN}/>
      <path d="M84 72 Q${84 + len * 0.45} ${62 - droop * 0.15} ${tipX - 4} ${tipY}" fill="none" stroke="#24602c" stroke-width="2"/>
    </g>`;
  }).join('');
  const rings = Array.from({ length: 9 }, (_, i) => {
    const y = 92 + i * 16;
    const x = 83 - Math.sin(i / 3) * 5;
    return `<path d="M${x - 10} ${y} Q${x} ${y + 7} ${x + 10} ${y}" fill="none" stroke="#5a3418" stroke-width="2.4"/>`;
  }).join('');
  return `
<svg class="palm-art" viewBox="0 0 160 240" aria-hidden="true" overflow="visible">
  <path d="M72 238 Q64 150 76 72 L92 72 Q82 150 96 238Z" fill="url(#g-trunk)" ${OUT}/>
  ${rings}
  <g class="leaves">${fronds}
    <g fill="#e2791f" ${OUT_THIN}>
      <circle cx="78" cy="84" r="5.5"/><circle cx="89" cy="86" r="5.5"/><circle cx="84" cy="93" r="5.5"/><circle cx="74" cy="93" r="5"/><circle cx="94" cy="94" r="4.5"/>
    </g>
  </g>
</svg>`;
}

// Distant Damascus skyline at golden hour: Qasioun behind, the Umayyad
// Mosque's dome and minarets, flat-roofed old-city houses with lit windows.
// viewBox 1000×200, meant to sit on the horizon.
export function skylineSVG() {
  // Deterministic pseudo-random so the skyline is identical every load.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let houses = '';
  let windows = '';
  for (let x = 0; x < 2000;) {
    const w = 26 + Math.round(rnd() * 34);
    const h = 22 + Math.round(rnd() * 34);
    houses += `M${x} 200 V${200 - h} H${x + w} V200Z `;
    if (rnd() > 0.35) windows += `<rect x="${x + w / 2 - 3}" y="${200 - h + 8}" width="6" height="8" rx="3"/>`;
    x += w - 2;
  }
  const pencil = (x, top) => `M${x - 4} 200 V${top} H${x + 4} V200Z M${x - 7} ${top + 16} h14 v4 h-14Z M${x - 4} ${top} L${x} ${top - 16} L${x + 4} ${top}Z`;
  const square = (x, top) => `M${x} 200 V${top} H${x + 22} V200Z M${x - 4} ${top + 14} h30 v6 h-30Z M${x + 4} ${top} L${x + 11} ${top - 18} L${x + 18} ${top}Z`;
  const dome = (cx, r, base) => `M${cx - r} ${base} A${r} ${r * 1.05} 0 0 1 ${cx + r} ${base}Z M${cx - r - 4} ${base} h${2 * r + 8} v14 h-${2 * r + 8}Z`;
  return `
<svg class="skyline-art" viewBox="0 0 2000 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <path class="sk-far" d="M0 150 Q160 96 330 124 Q500 84 700 116 Q880 70 1060 118 Q1220 92 1400 124 Q1580 80 1760 118 Q1880 104 2000 124 V200 H0Z"/>
  <path class="sk-near" d="M0 166 Q200 136 420 156 Q640 130 860 154 Q1100 132 1340 156 Q1600 136 2000 160 V200 H0Z"/>
  <g class="sk-city">
    <path d="${houses}"/>
    <path d="${dome(1000, 44, 138)} M950 152 h100 v48 h-100Z ${square(900, 76)} ${pencil(1090, 66)}"/>
    <path d="${pencil(760, 98)} ${pencil(1260, 92)} ${pencil(420, 110)} ${pencil(1640, 104)}"/>
    <path d="${dome(840, 16, 172)} ${dome(1170, 20, 168)} ${dome(560, 14, 176)} ${dome(1480, 18, 172)} ${dome(1820, 14, 176)}"/>
  </g>
  <g class="sk-win">${windows}</g>
</svg>`;
}

// A puffy cartoon cloud. viewBox 200×90.
export function cloudSVG() {
  return `
<svg class="cloud-art" viewBox="0 0 200 90" aria-hidden="true">
  <path d="M30 76 Q4 76 8 58 Q10 42 32 44 Q34 18 64 20 Q80 2 108 12 Q134 4 144 30 Q176 26 182 50 Q198 56 190 72 Q186 80 170 78Z" fill="#fff"/>
  <path d="M20 70 Q60 82 110 74 Q150 84 184 70 Q186 80 170 80 L30 80 Q12 80 20 70Z" fill="#f1e1f4"/>
</svg>`;
}

// A distant gull, drawn as a simple "M" stroke.
export function gullSVG() {
  return `<svg class="gull-art" viewBox="0 0 24 12" aria-hidden="true"><path d="M1 8 Q6 1 12 8 Q18 1 23 8" fill="none" stroke="#5a3a2a" stroke-width="2" stroke-linecap="round"/></svg>`;
}

// Foreground beach with a starfish and a shell. viewBox 1000×220.
export function shoreSVG() {
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const specks = Array.from({ length: 60 }, () => `<circle cx="${Math.round(rnd() * 1000)}" cy="${Math.round(80 + rnd() * 140)}" r="${(1 + rnd() * 1.8).toFixed(1)}"/>`).join('');
  return `
<svg class="shore-art" viewBox="0 0 1000 220" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
  <path d="M0 70 Q250 20 500 44 Q760 66 1000 30 V220 H0Z" fill="#fff" opacity=".55"/>
  <path d="M0 84 Q250 36 500 58 Q760 80 1000 44 V220 H0Z" fill="#f0cf8f" ${OUT}/>
  <path d="M0 100 Q260 60 500 76 Q760 96 1000 64" fill="none" stroke="#fbe3b0" stroke-width="10" stroke-linecap="round" opacity=".7"/>
  <g fill="#d6a868" opacity=".6">${specks}</g>
  <g transform="translate(820 130) rotate(12)">
    <path d="M0 -20 L6 -6 L21 -6 L9 3 L13 18 L0 9 L-13 18 L-9 3 L-21 -6 L-6 -6Z" fill="#f28a5b" ${OUT_THIN}/>
    <circle r="2" fill="#fff"/>
  </g>
  <g transform="translate(180 150)">
    <path d="M-16 8 Q-18 -14 0 -16 Q18 -14 16 8Z" fill="#f7d9d3" ${OUT_THIN}/>
    <path d="M0 -15 V8 M-8 -12 L-5 8 M8 -12 L5 8" stroke="#d99c92" stroke-width="1.6"/>
  </g>
</svg>`;
}

// ---------- World-map islands ----------
// Seen from above at a slight angle. viewBox 240×200; the landmark sits on
// the grass around (120, 96). Each island kind has its own landmark.

function islandBase({ sand = '#f3d596', grass = '#86c86a', grassDark = '#5fa653' } = {}) {
  return `
  <ellipse cx="120" cy="150" rx="112" ry="40" fill="#8fe0e6" opacity=".55"/>
  <path d="M22 140 Q14 108 52 96 Q70 70 118 74 Q170 70 196 94 Q232 106 222 138 Q214 172 160 176 Q120 184 76 176 Q28 170 22 140Z" fill="${sand}" ${OUT}/>
  <path d="M42 132 Q40 110 66 104 Q84 86 120 88 Q160 86 180 104 Q206 112 198 132 Q190 152 150 154 Q120 160 90 154 Q46 150 42 132Z" fill="${grassDark}"/>
  <path d="M42 128 Q40 106 66 100 Q84 82 120 84 Q160 82 180 100 Q206 108 198 128 Q190 148 150 150 Q120 156 90 150 Q46 146 42 128Z" fill="${grass}" ${OUT_THIN}/>
  <path d="M60 116 q6 -6 12 0 M160 122 q6 -6 12 0 M150 104 q5 -5 10 0" fill="none" stroke="#4f9444" stroke-width="2.5" stroke-linecap="round"/>`;
}

const LANDMARKS = {
  // Home port: Arwad's little fort tower, a pier and a flag.
  port: () => `
    ${islandBase({ grass: '#9bcf72' })}
    <path d="M178 150 L228 168 L222 176 L172 158Z" fill="#a8703c" ${OUT_THIN}/>
    <path d="M186 154 v18 M200 159 v18 M214 164 v18" stroke="${LINE}" stroke-width="3"/>
    <path d="M86 128 V70 H130 V128Z" fill="#e6c79a" ${OUT}/>
    <path d="M82 70 h52 v-10 h-8 v6 h-8 v-6 h-10 v6 h-8 v-6 h-10 v6 h-8 v-6 h-8Z" fill="#e6c79a" ${OUT}/>
    <path d="M100 128 v-22 q8 -12 16 0 v22Z" fill="#6b3f1f" ${OUT_THIN}/>
    <rect x="94" y="80" width="8" height="12" rx="4" fill="#6b3f1f"/><rect x="114" y="80" width="8" height="12" rx="4" fill="#6b3f1f"/>
    <path d="M108 60 V30" ${OUT}/><g class="flag-sm"><path d="M108 30 l24 6 l-24 7Z" fill="#d0507e" ${OUT_THIN}/></g>
    <path d="M140 132 h26 v-18 l-13 -10 l-13 10Z M54 134 h24 v-16 l-12 -9 l-12 9Z" fill="#fbf1dc" ${OUT_THIN}/>`,

  // Letters: a Damascene gate with ablaq (striped) stone and an open book.
  letters: () => `
    ${islandBase()}
    <path d="M70 128 V70 Q70 40 120 36 Q170 40 170 70 V128Z" fill="#fbf1dc" ${OUT}/>
    <path d="M70 60 H170 M70 80 H170 M70 100 H170" stroke="#3b3029" stroke-width="7" opacity=".85"/>
    <path d="M70 128 V70 Q70 40 120 36 Q170 40 170 70 V128Z" fill="none" ${OUT}/>
    <path d="M94 128 V80 Q94 58 120 56 Q146 58 146 80 V128Z" fill="#2c5e6e" ${OUT}/>
    <path d="M100 124 L100 104 Q120 96 120 104 Q120 96 140 104 L140 124 Q120 118 120 124 Q120 118 100 124Z" fill="#fff" ${OUT_THIN}/>
    <path d="M120 104 V122" ${OUT_THIN}/>
    <text x="110" y="117" font-size="12" font-weight="800" text-anchor="middle" fill="${LINE}" font-family="Baloo Bhaijaan 2, sans-serif">ض</text>
    <text x="131" y="117" font-size="12" font-weight="800" text-anchor="middle" fill="#d0507e" font-family="Baloo Bhaijaan 2, sans-serif">أ</text>
    <circle cx="120" cy="46" r="5" fill="#f2c14e" ${OUT_THIN}/>`,

  // Numbers: a striped lighthouse with a brass astrolabe beside it.
  numbers: () => `
    ${islandBase({ grass: '#8ccf8a' })}
    <path d="M100 132 L108 52 H132 L140 132Z" fill="#fbf1dc" ${OUT}/>
    <path d="M103 104 L137 104 L138 116 L102 116Z M106 74 L134 74 L135 86 L105 86Z" fill="#c7373f"/>
    <path d="M100 132 L108 52 H132 L140 132Z" fill="none" ${OUT}/>
    <path d="M104 52 H136 V44 H104Z" fill="#6b3f1f" ${OUT_THIN}/>
    <path d="M108 44 V30 H132 V44Z" fill="#fff4b0" ${OUT_THIN}/>
    <path class="beam" d="M132 36 L200 20 L200 50Z" fill="#fff4b0" opacity=".6"/>
    <path d="M106 30 Q120 16 134 30Z" fill="#c7373f" ${OUT_THIN}/>
    <path d="M114 132 v-14 q6 -8 12 0 v14Z" fill="#6b3f1f" ${OUT_THIN}/>
    <g transform="translate(168 112)">
      <circle r="18" fill="url(#g-brass)" ${OUT}/>
      <circle r="11" fill="none" stroke="${LINE}" stroke-width="2"/>
      <path d="M-16 0 H16 M0 -16 V16" stroke="${LINE}" stroke-width="2"/>
      <path d="M-10 -10 L10 10" stroke="#c7373f" stroke-width="3" stroke-linecap="round"/>
    </g>`,

  // Science: a friendly volcano, giant leaves and a bubbling flask.
  science: () => `
    ${islandBase({ grass: '#78c46a' })}
    <path d="M62 132 L102 58 Q120 50 138 58 L178 132Z" fill="#9a6b4e" ${OUT}/>
    <path d="M102 58 Q120 50 138 58 L130 74 Q120 66 110 74Z" fill="#f06a3a" ${OUT_THIN}/>
    <path d="M112 74 Q108 96 118 110 M128 72 Q134 90 126 104" fill="none" stroke="#f06a3a" stroke-width="5" stroke-linecap="round"/>
    <g class="smoke" fill="#fff" opacity=".9">
      <circle cx="120" cy="40" r="10"/><circle cx="132" cy="30" r="8"/><circle cx="142" cy="18" r="6"/>
    </g>
    <path d="M50 132 Q40 100 62 92 Q66 114 50 132Z M190 132 Q204 104 184 94 Q176 116 190 132Z" fill="#3a9b4a" ${OUT_THIN}/>
    <g transform="translate(160 116)">
      <path d="M-6 -20 h12 v10 l10 18 q2 8 -6 8 h-20 q-8 0 -6 -8 l10 -18Z" fill="#dff6ff" ${OUT_THIN}/>
      <path d="M-11 0 h22 l3 6 q1 4 -4 4 h-20 q-5 0 -4 -4Z" fill="#6ee07a"/>
      <circle cx="-3" cy="-26" r="3" fill="#6ee07a"/><circle cx="4" cy="-32" r="2" fill="#6ee07a"/>
    </g>`,

  // Geography & history: the Citadel of Aleppo on its mound.
  citadel: () => `
    ${islandBase({ grass: '#9ccf6e' })}
    <path d="M56 134 Q64 96 88 88 L152 88 Q176 96 184 134Z" fill="#d9b27a" ${OUT}/>
    <path d="M70 124 L170 124" stroke="#b98d55" stroke-width="3"/>
    <path d="M82 88 V56 H158 V88Z" fill="#e8cf9c" ${OUT}/>
    <path d="M78 56 h84 v-10 h-8 v6 h-10 v-6 h-10 v6 h-10 v-6 h-12 v6 h-10 v-6 h-10 v6 h-6 v-6 h-8Z" fill="#e8cf9c" ${OUT}/>
    <path d="M110 88 V70 q10 -12 20 0 V88Z" fill="#6b3f1f" ${OUT_THIN}/>
    <path d="M120 88 L112 134 H128Z" fill="#c9a26b" ${OUT_THIN}/>
    <path d="M147 56 V34" ${OUT}/><path d="M147 36 Q141 26 147 20 Q153 26 147 36Z" fill="#f2c14e" ${OUT_THIN}/>`,

  // Treasure: a glowing chest under a palm — the final review island.
  treasure: () => `
    ${islandBase({ sand: '#f7dc9c', grass: '#8fd06e' })}
    <circle cx="120" cy="104" r="44" fill="#fff3a0" opacity=".55" class="glow"/>
    <path d="M150 124 Q144 80 156 56" fill="none" stroke="${LINE}" stroke-width="10" stroke-linecap="round"/>
    <path d="M150 124 Q144 80 156 56" fill="none" stroke="#a86e3c" stroke-width="6" stroke-linecap="round"/>
    <path d="M156 56 Q130 40 112 56 Q134 50 156 58 Q180 36 200 50 Q176 50 156 58 Q170 70 176 88 Q160 72 156 58Z" fill="#3a8f45" ${OUT_THIN}/>
    <path d="M90 104 h52 v28 h-52Z" fill="#a0602e" ${OUT}/>
    <path d="M88 104 Q116 78 144 104Z" fill="#b8723a" ${OUT}/>
    <path d="M90 112 h52 M114 104 v28" stroke="url(#g-brass)" stroke-width="5"/>
    <rect x="109" y="108" width="10" height="10" rx="2" fill="url(#g-brass)" ${OUT_THIN}/>
    <g fill="#ffd23f" ${OUT_THIN}><circle cx="82" cy="130" r="5"/><circle cx="150" cy="134" r="5"/><circle cx="92" cy="138" r="4"/></g>`,
};

// An island for the world map. kind: port | letters | numbers | science | citadel | treasure
export function islandSVG(kind) {
  return `<svg class="island-art island-art--${kind}" viewBox="0 0 240 200" aria-hidden="true" overflow="visible">${LANDMARKS[kind]()}</svg>`;
}

// Compass rose for the map corner. viewBox 100×100.
export function compassSVG() {
  return `
<svg class="compass-art" viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="50" r="40" fill="#fff7e6" ${OUT}/>
  <circle cx="50" cy="50" r="32" fill="none" stroke="#e0c890" stroke-width="2"/>
  <path d="M50 10 L58 50 L50 90 L42 50Z" fill="#fbf1dc" ${OUT_THIN}/>
  <path d="M50 10 L58 50 L42 50Z" fill="#c7373f"/>
  <path d="M10 50 L50 43 L90 50 L50 57Z" fill="#e8d3a6" ${OUT_THIN}/>
  <circle cx="50" cy="50" r="5" fill="url(#g-brass)" ${OUT_THIN}/>
  <text x="50" y="8" text-anchor="middle" font-size="11" font-weight="800" fill="${LINE}" font-family="Baloo Bhaijaan 2, sans-serif">ش</text>
</svg>`;
}

// A friendly whale that surfaces now and then. viewBox 140×80.
export function whaleSVG() {
  return `
<svg class="whale-art" viewBox="0 0 140 80" aria-hidden="true" overflow="visible">
  <g class="spout" fill="#fff" opacity=".9"><circle cx="46" cy="-4" r="6"/><circle cx="38" cy="-12" r="5"/><circle cx="54" cy="-12" r="5"/></g>
  <path d="M10 56 Q8 22 50 20 Q96 18 112 44 Q124 38 134 26 Q138 44 124 54 Q134 62 132 72 Q118 64 110 58 Q90 72 50 70 Q14 70 10 56Z" fill="#5a8fd0" ${OUT}/>
  <path d="M16 58 Q50 72 104 58 Q88 68 50 68 Q22 68 16 58Z" fill="#cfe3f7"/>
  <circle cx="34" cy="42" r="4" fill="${LINE}"/><circle cx="33" cy="40.5" r="1.4" fill="#fff"/>
  <path d="M22 52 Q30 56 38 52" fill="none" ${OUT_THIN}/>
  <ellipse cx="44" cy="50" rx="6" ry="3.5" fill="url(#g-cheek)"/>
</svg>`;
}

// A medal for island badges: ribbon, rim and an emoji face. viewBox 120×150.
export function medalSVG(icon, { gold = false, color = '#d0507e' } = {}) {
  const rim = gold ? 'url(#g-brass)' : '#dfe6ee';
  return `
<svg class="medal-art ${gold ? 'medal-art--gold' : ''}" viewBox="0 0 120 150" aria-hidden="true" overflow="visible">
  <path d="M34 0 L58 56 L42 64 L18 8Z" fill="${color}" ${OUT_THIN}/>
  <path d="M86 0 L62 56 L78 64 L102 8Z" fill="${color}" ${OUT_THIN}/>
  <path d="M40 4 L56 42 M80 4 L64 42" stroke="#fff" stroke-width="3" opacity=".5"/>
  <circle cx="60" cy="98" r="44" fill="${rim}" ${OUT}/>
  ${Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return `<circle cx="${60 + Math.cos(a) * 38}" cy="${98 + Math.sin(a) * 38}" r="2.2" fill="${gold ? '#fff3b0' : '#fff'}"/>`;
  }).join('')}
  <circle cx="60" cy="98" r="31" fill="#fffaf0" ${OUT_THIN}/>
  <text x="60" y="112" text-anchor="middle" font-size="36">${icon}</text>
  <path d="M28 76 Q40 60 60 58" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>
</svg>`;
}

// A big treasure chest whose lid (.chest__lid) can swing open. viewBox 240×200.
export function chestSVG() {
  return `
<svg class="chest-art" viewBox="0 0 240 200" aria-hidden="true" overflow="visible">
  <ellipse cx="120" cy="186" rx="96" ry="10" fill="#000" opacity=".2"/>
  <g class="chest__glow"><path d="M60 100 L10 -120 L230 -120 L180 100Z" fill="url(#g-glow)" opacity=".9"/></g>
  <g class="chest__coins" fill="#ffd23f" ${OUT_THIN}>
    <ellipse cx="96" cy="98" rx="14" ry="6"/><ellipse cx="124" cy="94" rx="14" ry="6"/><ellipse cx="148" cy="100" rx="14" ry="6"/>
    <path d="M112 86 l8 -14 l8 14Z" fill="#7fd6e0"/><circle cx="104" cy="84" r="7" fill="#d0507e"/>
  </g>
  <path d="M40 100 H200 V176 Q200 184 192 184 H48 Q40 184 40 176Z" fill="#a0602e" ${OUT}/>
  <path d="M40 124 H200 M40 156 H200" stroke="#7a4520" stroke-width="3"/>
  <path d="M66 100 V184 M174 100 V184" stroke="url(#g-brass)" stroke-width="10"/>
  <path d="M66 100 V184 M174 100 V184" stroke="${LINE}" stroke-width="2" opacity=".4"/>
  <rect x="108" y="112" width="24" height="28" rx="5" fill="url(#g-brass)" ${OUT_THIN}/>
  <circle cx="120" cy="124" r="4" fill="${LINE}"/>
  <g class="chest__lid">
    <path d="M36 102 Q36 50 120 46 Q204 50 204 102Z" fill="#b8723a" ${OUT}/>
    <path d="M66 100 Q66 58 70 54 M174 100 Q174 58 170 54" fill="none" stroke="url(#g-brass)" stroke-width="10"/>
    <path d="M36 102 H204" ${OUT}/>
  </g>
</svg>`;
}
