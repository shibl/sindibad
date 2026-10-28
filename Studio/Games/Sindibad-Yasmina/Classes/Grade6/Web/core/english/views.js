// Made from views.ts by tools/build.ts. Edit that file, then run: npm run build
// The English island's pictures, drawn in code (SVG), for «أتعلّم» and the
// questions (core/english/games.js):
//
//   ART[name]        small pictures for words that have no good emoji (a
//                    seahorse, a zip wire, the planets, shapes…)
//   person(spec)     a drawn person for the Appearance unit: 'girl,tall,slim,
//                    longhair,curly,blond,blueeyes,glasses'
//   picHTML(pic)     an emoji, 'art:<name>' or 'p:<spec>' as HTML
//   EN_VIEWS[name]   { html(step) } — the book's grammar table (`rule`), a
//                    reading with glossary words (`read`), and pictures with
//                    parts to find: the whale (`whale`), a plant (`plant`),
//                    the solar system (`planets`). Their parts carry
//                    data-spot="<id>".
//
// English always reads left to right (dir="ltr" lang="en").
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const escAttr = esc;
const svg = (body, vb = '0 0 64 64', cls = '') => `<svg class="en-svg ${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const INK = '#3b2414';
// ---------- The planets (the book's colours: Mars red, Saturn yellow with rings…) ----------
export const PLANETS = {
    sun: { c: '#ffc93c', c2: '#ff9a1f', r: 26 },
    mercury: { c: '#b3aca2', c2: '#8d867c', r: 9 },
    venus: { c: '#f0cf86', c2: '#d9a95a', r: 13 },
    earth: { c: '#3f8fd6', c2: '#2a6fb0', r: 13.5, land: '#5fbf5a' },
    mars: { c: '#e0663e', c2: '#b8462a', r: 11 },
    jupiter: { c: '#e2b07a', c2: '#c98c50', r: 24, bands: '#b8784a' },
    saturn: { c: '#f2d68a', c2: '#d9b25a', r: 19, ring: '#c9a35a' },
    uranus: { c: '#a8e4ec', c2: '#6fc4d4', r: 16 },
    neptune: { c: '#4f7fe0', c2: '#2f56b8', r: 16 },
    moon: { c: '#e8e4da', c2: '#bdb6a6', r: 12 },
};
function planetShape(id, cx, cy, r, gid) {
    const p = PLANETS[id];
    let s = `<defs><radialGradient id="${gid}" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="${p.c}"/><stop offset="1" stop-color="${p.c2}"/></radialGradient></defs>`;
    if (p.ring)
        s += `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.85}" ry="${r * 0.5}" fill="none" stroke="${p.ring}" stroke-width="${r * 0.22}" opacity=".9"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gid})" stroke="${INK}" stroke-width="1.5"/>`;
    if (p.bands)
        s += `<path d="M${cx - r * 0.95} ${cy - r * 0.3} H${cx + r * 0.95} M${cx - r * 0.98} ${cy + r * 0.15} H${cx + r * 0.98} M${cx - r * 0.85} ${cy + r * 0.5} H${cx + r * 0.85}" stroke="${p.bands}" stroke-width="${r * 0.13}" opacity=".7"/>`;
    if (p.land)
        s += `<path d="M${cx - r * 0.5} ${cy - r * 0.55} q${r * 0.5} ${-r * 0.2} ${r * 0.6} ${r * 0.3} q${-r * 0.1} ${r * 0.4} ${-r * 0.5} ${r * 0.3}z M${cx + r * 0.15} ${cy + r * 0.2} q${r * 0.5} ${-r * 0.1} ${r * 0.55} ${r * 0.35} q${-r * 0.3} ${r * 0.35} ${-r * 0.6} ${r * 0.1}z" fill="${p.land}"/>`;
    if (p.ring)
        s += `<path d="M${cx - r * 1.85} ${cy} A${r * 1.85} ${r * 0.5} 0 0 0 ${cx + r * 1.85} ${cy}" fill="none" stroke="${p.ring}" stroke-width="${r * 0.22}"/>`;
    if (id === 'sun')
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            s += `<path d="M${cx + Math.cos(a) * r * 1.12} ${cy + Math.sin(a) * r * 1.12} L${cx + Math.cos(a) * r * 1.38} ${cy + Math.sin(a) * r * 1.38}" stroke="#ff9a1f" stroke-width="3" stroke-linecap="round"/>`;
        }
    if (id === 'moon')
        s += `<circle cx="${cx - r * 0.3}" cy="${cy + r * 0.2}" r="${r * 0.18}" fill="${p.c2}"/><circle cx="${cx + r * 0.35}" cy="${cy - r * 0.3}" r="${r * 0.12}" fill="${p.c2}"/>`;
    return s;
}
const planetArt = (id) => svg(planetShape(id, 32, 32, id === 'saturn' ? 15 : id === 'sun' ? 21 : 22, `pa-${id}`));
// ---------- Small pictures ----------
export const ART = {
    seahorse: svg(`<path d="M36 10c8 0 12 6 10 12l-6 2c4 2 6 7 4 12-2 6-8 8-8 14 0 5 6 6 6 2" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M36 10c8 0 12 6 10 12l-6 2c4 2 6 7 4 12-2 6-8 8-8 14 0 6 7 6 6 1-1-3-4-2-3 0" fill="#f2a83a"/>
    <path d="M37 10c-6 0-10 4-10 9 0 4 3 6 5 8-4 3-7 8-6 13 1 4 4 6 6 7" fill="#f2a83a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M27 17l-9 2c-2 1-2 3 0 3l9 0" fill="#f2a83a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="35" cy="16" r="2.4" fill="${INK}"/><path d="M40 28c3 1 4 4 2 6" stroke="#e07a1f" stroke-width="2" fill="none"/>
    <path d="M30 30h8M29 36h9M31 42h7" stroke="#e07a1f" stroke-width="2"/><path d="M41 12l4-5 2 6" fill="#f2a83a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`),
    zipwire: svg(`<path d="M4 14L60 40" stroke="${INK}" stroke-width="3"/><rect x="2" y="10" width="5" height="50" fill="#a8703f"/><rect x="57" y="36" width="5" height="24" fill="#a8703f"/>
    <path d="M30 27l0 8" stroke="${INK}" stroke-width="2.5"/><circle cx="30" cy="27" r="3" fill="#e8453c" stroke="${INK}" stroke-width="2"/>
    <circle cx="30" cy="38" r="5" fill="#f6c9a0" stroke="${INK}" stroke-width="2"/><path d="M30 43v9M30 46l-6-4M30 46l6-4M30 52l-4 7M30 52l4 7" stroke="#2f6fd0" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M24 35l12-2" stroke="#f2c14e" stroke-width="3" stroke-linecap="round"/>`),
    circle: svg(`<circle cx="32" cy="32" r="22" fill="#5fb3f0" stroke="${INK}" stroke-width="3"/>`),
    triangle: svg(`<path d="M32 9L57 53H7Z" fill="#f2c14e" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`),
    rectangle: svg(`<rect x="6" y="17" width="52" height="30" rx="2" fill="#7cc35a" stroke="${INK}" stroke-width="3"/>`),
    curtains: svg(`<rect x="4" y="6" width="56" height="6" rx="2" fill="#c9963a" stroke="${INK}" stroke-width="2"/>
    <path d="M6 12h22c-2 14 0 30 4 46H6Z" fill="#d0344c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M58 12H36c2 14 0 30-4 46h26Z" fill="#d0344c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M12 14v42M19 14c0 14 1 28 4 42M52 14v42M45 14c0 14-1 28-4 42" stroke="#a8243a" stroke-width="2"/>`),
    stage: svg(`<rect x="4" y="40" width="56" height="16" rx="2" fill="#a8703f" stroke="${INK}" stroke-width="2.5"/><path d="M4 44h56" stroke="#c99863" stroke-width="2"/>
    <path d="M6 6h18c-2 12 0 24 2 34H6Z" fill="#d0344c" stroke="${INK}" stroke-width="2"/><path d="M58 6H40c2 12 0 24-2 34h20Z" fill="#d0344c" stroke="${INK}" stroke-width="2"/>
    <circle cx="32" cy="30" r="5" fill="#f6c9a0" stroke="${INK}" stroke-width="2"/><path d="M32 35v6M27 38h10" stroke="#2f6fd0" stroke-width="3"/>`),
    soil: svg(`<path d="M4 30q14-6 28 0t28 0V58H4Z" fill="#8a5a34" stroke="${INK}" stroke-width="2.5"/><circle cx="16" cy="44" r="2.5" fill="#5a3a22"/><circle cx="38" cy="50" r="2" fill="#5a3a22"/><circle cx="48" cy="40" r="2.5" fill="#5a3a22"/>
    <path d="M30 30c0-8 0-12 0-16M30 20c-6-4-10-2-11 2 5 2 8 1 11-2M30 17c5-5 10-4 11-1-5 3-8 3-11 1" stroke="#3f9d3c" stroke-width="2.5" fill="#5fbf5a" stroke-linejoin="round"/>`),
    coal: svg(`<path d="M10 44l8-14 12-4 14 6 8 12-6 10H16Z" fill="#3b3640" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M18 30l8 8 4-12M30 26l6 12 8-6M26 38l-6 14M36 38l8 14" stroke="#6b6670" stroke-width="2"/><path d="M22 34l3-2" stroke="#fff" stroke-width="2" opacity=".6"/>`),
};
for (const id of Object.keys(PLANETS))
    ART[id] = planetArt(id);
// ---------- A drawn person (Unit 8 · Appearance) ----------
const CLOTH = { girl: '#ec79a8', boy: '#3f8fd6', woman: '#8a63c9', lady: '#2fb3a8', man: '#4fae45', grandma: '#c98ae0', grandpa: '#a8703f' };
const HAIR = { blond: '#f5d061', brown: '#8a5a34', black: '#2a1a10', grey: '#c9c4bc', dark: '#3b2414', red: '#d0603a' };
const EYES = { blueeyes: '#3f8fd6', greeneyes: '#3f9d3c', browneyes: '#7a4a2a', blackeyes: '#1f1612' };
// spec: 'girl,tall,slim,longhair,curly,blond,blueeyes…' (worlds/grade6/english.js, 'p:' pictures).
export function person(spec) {
    const t = new Set(String(spec).split(',').map(s => s.trim()));
    const who = ['girl', 'boy', 'woman', 'lady', 'man', 'grandma', 'grandpa'].find(w => t.has(w)) || 'girl';
    const female = ['girl', 'woman', 'lady', 'grandma'].includes(who), child = who === 'girl' || who === 'boy', old = who.startsWith('grand');
    const H = t.has('tall') ? 100 : t.has('short') ? 70 : 85;
    const bw = t.has('plump') || t.has('fat') ? 30 : t.has('wellbuilt') ? 26 : t.has('thin') ? 13 : t.has('slim') ? 16 : 20;
    const hairCol = HAIR[['blond', 'brown', 'black', 'grey', 'dark', 'red'].find(c => t.has(c)) || (old ? 'grey' : 'brown')];
    const eyes = ['blueeyes', 'greeneyes', 'browneyes', 'blackeyes'].find(c => t.has(c));
    const eyeCol = (eyes && EYES[eyes]) || INK;
    const longHair = t.has('longhair') || (female && !t.has('shorthair'));
    const style = t.has('curly') ? 'curly' : t.has('wavy') ? 'wavy' : 'straight';
    const r = child ? 12 : 11, ground = 108, cx = 40;
    const top = ground - H, hy = top + r, neck = hy + r, hip = neck + (H - 2 * r) * 0.46, cloth = CLOTH[who], skin = '#f6c9a0';
    let s = `<ellipse cx="${cx}" cy="${ground}" rx="${bw * 0.7 + 6}" ry="3" fill="rgba(0,0,0,.15)"/>`;
    // long hair behind the head
    if (longHair) {
        const len = neck + (H - 2 * r) * 0.22;
        if (style === 'curly')
            for (let i = 0; i < 6; i++) {
                const yy = hy + i * ((len - hy) / 5);
                s += `<circle cx="${cx - r * 0.95}" cy="${yy}" r="${r * 0.42}" fill="${hairCol}"/><circle cx="${cx + r * 0.95}" cy="${yy}" r="${r * 0.42}" fill="${hairCol}"/>`;
            }
        else if (style === 'wavy')
            s += `<path d="M${cx - r * 1.1} ${hy} q-3 ${(len - hy) / 4} 0 ${(len - hy) / 2} t0 ${(len - hy) / 2} h${r * 2.2} q3 ${-(len - hy) / 4} 0 ${-(len - hy) / 2} t0 ${-(len - hy) / 2}z" fill="${hairCol}"/>`;
        else
            s += `<rect x="${cx - r * 1.1}" y="${hy - 2}" width="${r * 2.2}" height="${len - hy + 2}" rx="${r * 0.5}" fill="${hairCol}"/>`;
    }
    // legs, body, arms
    const legW = Math.max(4, bw * 0.24), legL = ground - hip;
    if (female && !child && who !== 'lady') {
        s += `<rect x="${cx - bw * 0.3}" y="${hip}" width="${legW}" height="${legL}" fill="${skin}" stroke="${INK}" stroke-width="1.5"/><rect x="${cx + bw * 0.3 - legW}" y="${hip}" width="${legW}" height="${legL}" fill="${skin}" stroke="${INK}" stroke-width="1.5"/>`;
    }
    else {
        const pants = female ? skin : '#3b4a7a';
        s += `<rect x="${cx - bw * 0.36}" y="${hip - 2}" width="${legW + 1}" height="${legL + 2}" rx="2" fill="${pants}" stroke="${INK}" stroke-width="1.5"/><rect x="${cx + bw * 0.36 - legW - 1}" y="${hip - 2}" width="${legW + 1}" height="${legL + 2}" rx="2" fill="${pants}" stroke="${INK}" stroke-width="1.5"/>`;
    }
    s += `<ellipse cx="${cx - bw * 0.3}" cy="${ground - 1}" rx="${legW * 0.9}" ry="2.6" fill="${INK}"/><ellipse cx="${cx + bw * 0.3}" cy="${ground - 1}" rx="${legW * 0.9}" ry="2.6" fill="${INK}"/>`;
    const skirt = female ? `M${cx - bw / 2} ${neck + 2} L${cx - bw / 2 - 5} ${hip + 6} H${cx + bw / 2 + 5} L${cx + bw / 2} ${neck + 2}Z` : `M${cx - bw / 2} ${neck + 2} L${cx - bw / 2} ${hip + 1} H${cx + bw / 2} L${cx + bw / 2} ${neck + 2}Z`;
    s += `<path d="${skirt}" fill="${cloth}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    s += `<path d="M${cx - bw / 2} ${neck + 4} l-5 ${(hip - neck) * 0.75}" stroke="${skin}" stroke-width="4.5" stroke-linecap="round"/><path d="M${cx + bw / 2} ${neck + 4} l5 ${(hip - neck) * 0.75}" stroke="${skin}" stroke-width="4.5" stroke-linecap="round"/>`;
    // head and face
    s += `<circle cx="${cx}" cy="${hy}" r="${r}" fill="${skin}" stroke="${INK}" stroke-width="2"/>`;
    const big = t.has('bigeyes') ? 2.6 : 2;
    for (const sx of [-1, 1])
        s += `<circle cx="${cx + sx * r * 0.38}" cy="${hy - 1}" r="${big}" fill="${eyeCol}"/><circle cx="${cx + sx * r * 0.38 + 0.6}" cy="${hy - 1.7}" r="${big * 0.35}" fill="#fff"/>`;
    s += `<path d="M${cx - 3.5} ${hy + r * 0.42} q3.5 3 7 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    s += `<circle cx="${cx - r * 0.62}" cy="${hy + r * 0.3}" r="1.8" fill="#f29a9a" opacity=".7"/><circle cx="${cx + r * 0.62}" cy="${hy + r * 0.3}" r="1.8" fill="#f29a9a" opacity=".7"/>`;
    if (t.has('glasses'))
        s += `<g fill="none" stroke="${INK}" stroke-width="1.4"><circle cx="${cx - r * 0.38}" cy="${hy - 1}" r="3.6"/><circle cx="${cx + r * 0.38}" cy="${hy - 1}" r="3.6"/><path d="M${cx - r * 0.38 + 3.6} ${hy - 1} H${cx + r * 0.38 - 3.6}"/></g>`;
    // hair on top
    if (style === 'curly')
        for (let i = 0; i < 7; i++) {
            const a = Math.PI + (i / 6) * Math.PI;
            s += `<circle cx="${cx + Math.cos(a) * r * 0.92}" cy="${hy + Math.sin(a) * r * 0.85 - 1}" r="${r * 0.38}" fill="${hairCol}"/>`;
        }
    else if (style === 'wavy')
        s += `<path d="M${cx - r - 1} ${hy} q0 ${-r * 1.3} ${r + 1} ${-r * 1.1} q${r + 1} ${-r * 0.2} ${r + 1} ${r * 1.1} q-3 -4 -6 -2 q-3 -4 -6 -1 q-3 -4 -6 -1 q-3 -4 -6 -1 q-2 -2 -3 5z" fill="${hairCol}"/>`;
    else
        s += `<path d="M${cx - r - 1} ${hy + 1} q0 ${-r * 1.35} ${r + 1} ${-r * 1.15} q${r + 1} ${-r * 0.2} ${r + 1} ${r * 1.15} q-${r * 0.9} -${r * 0.75} -${r * 1.6} -${r * 0.35} q-${r * 0.2} ${r * 0.3} -${r * 0.4} ${r * 0.35}z" fill="${hairCol}"/>`;
    if (who === 'grandpa')
        s += `<path d="M${cx - 4} ${hy + r * 0.2} q4 2 8 0" stroke="#e8e4da" stroke-width="2.5" fill="none"/>`;
    return svg(s, '0 0 80 112', 'en-person');
}
export function picHTML(pic, cls = '') {
    const p = String(pic || '');
    if (p.startsWith('art:'))
        return `<span class="en-art ${cls}">${ART[p.slice(4)] || ''}</span>`;
    if (p.startsWith('p:'))
        return `<span class="en-art en-art--p ${cls}">${person(p.slice(2))}</span>`;
    return `<span class="en-emo ${cls}">${p}</span>`;
}
export const isPicture = (p) => /^(art:|p:)/.test(String(p)) || !/[A-Za-z؀-ۿ]/.test(String(p));
// ---------- The views ----------
const hit = (x, y, w, h, r = 8) => `<rect class="lx-hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
const lab = (x, y, anchor = 'middle') => `<text class="lx-label sv-lab en-lab" x="${x}" y="${y}" text-anchor="${anchor}"></text>`;
const part = (id, inner, box, l) => `<g data-spot="${id}">${hit(...box)}${inner}${l ? lab(...l) : ''}</g>`;
export const EN_VIEWS = {
    // The book's grammar box: its table and its example sentences (spots).
    rule: {
        html(step) {
            const { table, rows } = step.rule;
            const tbl = table ? `<table class="en-rule__table"><thead><tr>${table[0].map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${table.slice(1).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
            return `<div class="en-rule" dir="ltr" lang="en">${tbl}<div class="en-rule__rows">${rows.map(([e], i) => `<button class="en-rule__row" data-spot="r${i}"><span>${e}</span><i class="lx-tick" aria-hidden="true">✓</i></button>`).join('')}</div></div>`;
        },
    },
    // A reading from the book; [words] are glossary spots.
    read: {
        html(step) {
            let i = 0;
            const text = step.read.text.replace(/\[([^\]]+)\]/g, (_, w) => `<button class="en-gloss" data-spot="g${i++}">${w}</button>`);
            return `<div class="en-read" dir="ltr" lang="en">${step.read.title ? `<b class="en-read__t">${step.read.title}</b>` : ''}<p>${text}</p></div>`;
        },
    },
    // Unit 3: the whale's body parts.
    whale: {
        html() {
            return `<svg class="sv en-scene en-whale" viewBox="0 0 320 180" dir="ltr" role="img" aria-label="whale">
        <defs><linearGradient id="enw-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9ff"/><stop offset="1" stop-color="#5fb6e8"/></linearGradient>
        <linearGradient id="enw-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f7fc8"/><stop offset="1" stop-color="#2f5aa0"/></linearGradient></defs>
        <rect width="320" height="180" rx="14" fill="url(#enw-sea)"/>
        <path d="M0 40 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>
        <g class="en-whale__body"><path d="M262 92 C262 60 220 52 170 54 C120 56 80 66 64 84 C56 92 50 98 40 96 L46 116 C60 118 72 116 84 120 C120 134 200 140 240 126 C258 118 262 108 262 92Z" fill="url(#enw-b)" stroke="#3b2414" stroke-width="3"/>
        <path d="M250 112 C220 128 140 130 92 118 C130 140 210 142 246 122Z" fill="#e8f2ff" opacity=".9"/>
        <path d="M232 108 h-30 M232 113 h-36 M228 118 h-38" stroke="#9ab8e0" stroke-width="2"/></g>
        ${part('tail', '<path d="M46 98 C34 84 22 70 8 66 C14 80 22 90 30 100 C20 108 14 118 10 132 C26 126 38 116 48 112Z" fill="#2f5aa0" stroke="#3b2414" stroke-width="3" stroke-linejoin="round"/>', [4, 60, 50, 78], [24, 150])}
        ${part('fin', '<path d="M120 58 C126 44 136 36 146 34 C142 44 142 52 146 56Z" fill="#2f5aa0" stroke="#3b2414" stroke-width="3" stroke-linejoin="round"/>', [112, 28, 40, 34], [128, 24])}
        ${part('blowhole', '<ellipse cx="214" cy="56" rx="6" ry="2.5" fill="#1f3a6a"/><g class="en-spout"><path d="M214 52 C208 40 200 34 196 26 M214 52 C214 38 214 30 214 20 M214 52 C220 40 228 34 232 26" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></g>', [196, 16, 38, 44], [214, 12])}
        ${part('eye', '<circle cx="236" cy="84" r="5.5" fill="#fff" stroke="#3b2414" stroke-width="2"/><circle cx="237.5" cy="84.5" r="3" fill="#1f1612"/>', [226, 74, 22, 20], [274, 72])}
        ${part('mouth', '<path d="M262 98 C250 104 236 106 222 104" stroke="#3b2414" stroke-width="3" fill="none" stroke-linecap="round"/>', [218, 94, 48, 16], [286, 104])}
        ${part('flippers', '<path d="M176 122 C170 138 160 150 148 156 C150 142 156 130 164 120Z" fill="#2f5aa0" stroke="#3b2414" stroke-width="3" stroke-linejoin="round"/>', [144, 116, 36, 44], [150, 172])}
      </svg>`;
        },
    },
    // Activity Book, unit 9: the parts of a plant.
    plant: {
        html() {
            return `<svg class="sv en-scene en-plant" viewBox="0 0 320 190" dir="ltr" role="img" aria-label="plant">
        <rect width="320" height="120" rx="14" fill="#dff3ff"/><rect y="112" width="320" height="78" rx="10" fill="#a8703f"/><path d="M0 114 q40 -6 80 0 t80 0 t80 0 t80 0" stroke="#7a4a2a" stroke-width="3" fill="none"/>
        <circle cx="282" cy="30" r="16" fill="#ffd23f"/>
        ${part('root', '<path d="M160 116 C158 132 150 142 140 150 M160 118 C162 136 170 146 182 154 M160 120 C160 140 158 156 156 172 M150 140 C144 142 138 146 134 150 M168 140 C174 142 178 146 184 146" stroke="#f3e2bd" stroke-width="3.5" fill="none" stroke-linecap="round"/>', [128, 116, 64, 62], [214, 160])}
        ${part('stem', '<path d="M160 116 C160 90 158 66 160 40" stroke="#3f9d3c" stroke-width="6" fill="none" stroke-linecap="round"/>', [150, 40, 20, 74], [96, 96])}
        ${part('leaves', '<path d="M160 86 C140 70 118 74 110 84 C126 94 146 94 160 86Z M160 70 C178 56 200 58 208 68 C194 80 174 80 160 70Z" fill="#5fbf5a" stroke="#2f7a3f" stroke-width="2.5" stroke-linejoin="round"/><path d="M160 86 L116 84 M160 70 L202 68" stroke="#2f7a3f" stroke-width="1.5"/>', [106, 54, 106, 44], [236, 86])}
        ${part('flower', '<g>' + [0, 1, 2, 3, 4].map(i => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return `<ellipse cx="${160 + Math.cos(a) * 10}" cy="${30 + Math.sin(a) * 10}" rx="8" ry="6" transform="rotate(${(a * 180) / Math.PI} ${160 + Math.cos(a) * 10} ${30 + Math.sin(a) * 10})" fill="#ec79a8" stroke="#3b2414" stroke-width="1.5"/>`; }).join('') + '<circle cx="160" cy="30" r="6" fill="#ffd23f" stroke="#3b2414" stroke-width="1.5"/></g>', [140, 10, 40, 40], [160, 8])}
        ${part('fruit', '<circle cx="128" cy="62" r="11" fill="#e8453c" stroke="#3b2414" stroke-width="2"/><path d="M128 51 l-3 -4 M128 51 l4 -3" stroke="#2f7a3f" stroke-width="2.5" stroke-linecap="round"/><path d="M123 58 q2 -3 5 -3" stroke="#fff" stroke-width="2" opacity=".7" fill="none"/><path d="M146 66 L139 62" stroke="#3f9d3c" stroke-width="3"/>', [112, 44, 34, 32], [70, 60])}
      </svg>`;
        },
    },
    // Unit 20: the Sun and the eight planets, in order (not to scale).
    planets: {
        html() {
            const xs = { mercury: 62, venus: 88, earth: 117, mars: 145, jupiter: 182, saturn: 233, uranus: 279, neptune: 308 };
            const rs = { mercury: 5, venus: 8, earth: 8.5, mars: 6.5, jupiter: 17, saturn: 13, uranus: 10.5, neptune: 10.5 };
            let s = `<svg class="sv en-scene en-planets" viewBox="0 0 320 160" dir="ltr" role="img" aria-label="the solar system">
        <defs><radialGradient id="enp-sky" cx=".1" cy=".5" r="1"><stop offset="0" stop-color="#3a2a6a"/><stop offset="1" stop-color="#0f1438"/></radialGradient></defs>
        <rect width="320" height="160" rx="14" fill="url(#enp-sky)"/>`;
            for (let i = 0; i < 40; i++)
                s += `<circle cx="${(i * 73) % 316 + 2}" cy="${(i * 37) % 156 + 2}" r="${i % 5 ? 0.8 : 1.4}" fill="#fff" opacity="${0.4 + (i % 3) * 0.2}"/>`;
            for (const [id, x] of Object.entries(xs))
                s += `<path d="M${x} 20 A${x + 30} ${x + 30} 0 0 1 ${x} 140" transform="translate(${-x * 0.04} 0)" stroke="#fff" stroke-opacity=".12" fill="none"/>`;
            s += part('sun', planetShape('sun', -6, 80, 44, 'enp-sun').replace(/<path d="M[^"]*" stroke="#ff9a1f"[^>]*\/>/g, ''), [0, 30, 40, 100], [18, 150]);
            let k = 0;
            for (const [id, x] of Object.entries(xs)) {
                const r = rs[id], up = k++ % 2 === 0;
                s += part(id, planetShape(id, x, 80, r, `enp-${id}`), [x - Math.max(r * (id === 'saturn' ? 1.9 : 1), 11), 80 - Math.max(r, 11), Math.max(r * (id === 'saturn' ? 3.8 : 2), 22), Math.max(r * 2, 22)], [x, up ? 80 - r - 10 : 80 + r + 18]);
            }
            return `${s}</svg>`;
        },
    },
};
