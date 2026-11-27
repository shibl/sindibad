// Export an island's quests step by step (every step kind, with all the fields the native quest
// framework needs) from the original CC-BY-SA curriculum: node tools/import-quests.mjs music tunes
// writes app/src/main/resources/islands/music-quests.json; node tools/import-quests.mjs science lab writes
// science-quests.json (with the island's stickers and their facts from Web/core/stickers.ts). The review topics (<region>.json, made by
// import-island.mjs) stay the quick review; the quest is the main way to play a place, as on the web.
//
// Wording is kept verbatim. HTML is reduced to plain text with the shared `plain` helper; the one piece of
// meaningful markup, bold (<b>…</b>, used for note names and key words), is kept as **…**.
import { mkdir, writeFile } from 'node:fs/promises';
import { plain } from '../../Shared/Art/tools/math-source.ts';

const [region, source] = process.argv.slice(2);
if (!region || !source) throw new Error('usage: node tools/import-quests.mjs <region> <world module>');
const book = await import(`../../Web/worlds/grade6/${source}.js`);

/** Plain text with bold kept as **…** (the app draws it bold; TalkBack reads the words). */
// The English island marks English inside Arabic with <bdi class="en" dir="ltr">…</bdi> (worlds/grade6/english/kit.ts
// en()). Its text keeps that as Unicode isolates (U+2066 LRI … U+2069 PDI): invisible, and English reads left to
// right inside the right-to-left sentence on Android as in the browser. Other islands are unchanged.
const LRI = '\u2066', PDI = '\u2069';
const isolate = s => source === 'english' ? String(s).replace(/<bdi\b[^>]*>([\s\S]*?)<\/bdi>/g, `${LRI}$1${PDI}`) : s;
function rich(html) {
    if (html == null) return undefined;
    const s = isolate(String(html));
    if (s.includes('**')) throw new Error(`"**" already in source text: ${s}`);
    return plain(s.replace(/<b\b[^>]*>([\s\S]*?)<\/b>/g, '**$1**')).replace(/\*\*\s*\*\*/g, '');
}
const text = value => value == null ? undefined : plain(isolate(String(value)));
const compact = object => Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined && v !== null && v !== false));

// How a step's parts count (web: core/learn/steps.ts and the island's own games). "whole": any miss
// costs the step (ok 0 or 1 of 1); "share": ok = share of parts right first try (of 1); "parts": every
// part counts 1 (ok = parts right first try, total = parts).
const ISLAND_SCORING = { tunes: { sort: 'parts', order: 'whole' } };
// The English island's own games (core/english/games.ts): ok = the share of rounds with no slip (rounds()); rank
// scores 1 − misses / items, memory (pairs − slips) / pairs — both are worked out in domain/quest/EnglishGames.kt.
const ENGLISH_GAMES = ['listen', 'picture', 'build', 'spell', 'verb', 'memory', 'odd', 'rank', 'adjorder', 'chat'];
ISLAND_SCORING.english = Object.fromEntries(ENGLISH_GAMES.map(k => [k, 'share']));
const SHARED_SCORING = { choice: 'whole', twoway: 'share', sort: 'share', order: 'share', match: 'share', tf: 'share', number: 'whole', label: 'share' };

const sound = p => p && compact({ notes: p.notes, step: p.step, tempo: p.tempo, longa: p.longa, canon: p.canon, inst: p.inst,
    choir: p.choir, solo: p.solo, glasses: p.glasses, rhythm: p.rhythm, bpm: p.bpm });
const spot = s => compact({
    id: s.id, title: rich(s.title), text: rich(s.text), label: text(s.label), icon: s.icon, art: s.art, say: rich(s.say),
    light: s.light, pair: s.pair, note: s.note, glass: s.glass, hold: s.hold, bpm: s.bpm, min: s.min, max: s.max,
    rhythm: s.rhythm, play: sound(s.play),
});

function step(st) {
    const base = { kind: st.kind, say: rich(st.say), hint: rich(st.hint), explain: rich(st.explain) };
    const scoring = ISLAND_SCORING[source]?.[st.kind] ?? SHARED_SCORING[st.kind];
    if (scoring) base.scoring = scoring;
    switch (st.kind) {
        case 'explore': if (st.words || st.rule || st.read) return englishExplore(st, base);
            return compact({ ...base, title: rich(st.title), tap: text(st.tap), view: st.view, area: st.area, guided: st.guided, cols: st.cols,
            events: st.events?.map(e => ({ id: e.id, year: e.year, label: text(e.label) })),
            theme: st.theme, done: rich(st.done), sum: rich(st.sum), spots: st.spots.map(spot),
            kb: st.kb && compact({ from: st.kb.from, to: st.kb.to, labels: st.kb.labels, gaps: st.kb.gaps }),
            person: st.person && { name: text(st.person.name), role: text(st.person.role), icon: st.person.icon }, art: st.art });
        case 'learn': return compact({ ...base, title: rich(st.title), html: rich(st.html), show: st.show, play: sound(st.play) });
        case 'choice': return compact({ ...base, q: rich(st.q), options: st.options.map(rich), art: st.art, layout: st.layout,
            listen: sound(st.listen), show: st.show, pic: st.pic, area: st.area, mark: st.mark });
        case 'keys': return compact({ ...base, q: rich(st.q), play: st.play, labels: st.labels });
        case 'gaps': case 'pattern': return compact({ ...base, q: rich(st.q) });
        case 'staff': return compact({ ...base, q: rich(st.q), drops: st.drops.map(([note, name]) => ({ note, name: text(name) })) });
        case 'name': return compact({ ...base, q: rich(st.q), note: st.note, options: st.options.map(rich) });
        case 'order': return compact({ ...base, q: rich(st.q), items: st.items.map(rich), show: st.show, latin: st.latin, fracs: st.fracs,
            sound: st.sound, icons: st.icons, pic: st.pic });
        case 'rhythm': return compact({ ...base, q: rich(st.q), pattern: st.pattern, others: st.others, bpm: st.bpm });
        case 'drum': return compact({ ...base, q: rich(st.q), pattern: st.pattern, bpm: st.bpm });
        case 'measure': return compact({ ...base, q: rich(st.q), beats: st.beats, given: st.given });
        case 'sort': return compact({ ...base, q: rich(st.q), bins: st.bins.map(b => compact({ id: b.id, label: rich(b.label), icon: b.icon })),
            items: st.items.map(([item, bin, icon]) => compact({ text: rich(item), bin, icon })), pic: st.pic });
        case 'fill': return compact({ ...base, q: rich(st.q), glass: st.glass, n: st.n, d: st.d });
        case 'glasses': return compact({ ...base, q: rich(st.q), play: st.play });
        case 'twoway': return compact({ ...base, q: rich(st.q), lines: st.lines.map(([line, right, wrong]) => ({ text: rich(line), right: rich(right), wrong: rich(wrong) })), pic: st.pic });
        case 'match': return compact({ ...base, q: rich(st.q), pairs: st.pairs.map(([left, right]) => ({ left: rich(left), right: rich(right) })), pic: st.pic });
        case 'tf': return compact({ ...base, q: rich(st.q), items: st.items.map(([line, truth, fix]) => ({ text: rich(line), truth: !!truth, ...compact({ fix: rich(fix) }) })), pic: st.pic });
        case 'number': return compact({ ...base, q: rich(st.q), answer: String(st.answer), unit: text(st.unit), pic: st.pic });
        case 'label': return compact({ ...base, q: rich(st.q), view: st.view, area: st.area, ask: st.ask.map(([id, name]) => ({ id, name: text(name) })) });
        case 'listen': case 'picture': return compact({ ...base, q: rich(st.q), mode: st.mode, ask: st.ask, opts: st.opts,
            items: st.items.map(([en, pic]) => ({ en: text(en), pic })) });
        case 'build': return compact({ ...base, q: rich(st.q), items: st.items.map(it => compact({ en: text(it.en), tiles: it.tiles?.map(text), ar: rich(it.ar) })) });
        case 'spell': return compact({ ...base, q: rich(st.q), extra: st.extra, items: st.items.map(it => compact({ en: it.en, pic: it.pic, show: text(it.show), ar: rich(it.ar) })) });
        case 'verb': return compact({ ...base, q: rich(st.q), lines: st.lines.map(([line, b, right, wrong]) => compact({ text: text(line), base: b ?? undefined, right, wrong })) });
        case 'memory': return compact({ ...base, q: rich(st.q), pairs: st.pairs.map(([a, b]) => ({ a: text(a), b: text(b) })) });
        case 'odd': return compact({ ...base, q: rich(st.q), rows: st.rows.map(([words, odd, why]) => ({ words, odd, why: rich(why) })) });
        case 'rank': return compact({ ...base, q: rich(st.q), ends: st.ends, items: st.items.map(it => compact({ en: it.en, pic: it.pic, ar: rich(it.ar) })) });
        case 'adjorder': return compact({ ...base, q: rich(st.q), items: st.items.map(it => compact({ before: text(it.before), adjs: it.adjs, noun: text(it.noun), cats: it.cats, ar: rich(it.ar) })) });
        case 'chat': return compact({ ...base, q: rich(st.q), who: Object.fromEntries(Object.entries(st.who).map(([k, [name, face]]) => [k, { name: text(name), face }])),
            lines: st.lines.map(([side, t]) => Array.isArray(t) ? { side, options: t.map(text) } : { side, text: text(t) }) });
        default: throw new Error(`import-quests: step kind "${st.kind}" is not handled — add it here and in domain/quest/`);
    }
}

/**
 * The English island's «أتعلّم» (core/english/games.ts exploreStep): the unit's words, the book's grammar box or a
 * reading. Its spots are made as the web makes them (w<i> — or the word itself on a picture view —, r<i>, g<i>), so
 * the shared explore rules apply; the words, table and reading are kept for the native cards (ui/english/).
 */
function englishExplore(st, base) {
    const out = { ...base, title: rich(st.title), view: st.view, cols: st.cols, tap: text(st.tap), done: rich(st.done), sum: rich(st.sum) };
    if (st.words) {
        out.view ??= 'words';
        out.words = st.words.map(([en, ar, pic, ex]) => ({ en, ar: text(ar), pic, ex: text(ex) }));
        out.spots = st.words.map(([w, ar, pic, ex], i) => compact({ id: st.view ? w.toLowerCase().replace(/^the /, '') : `w${i}`,
            title: `${LRI}${w}${PDI} ${text(ar)}`, text: `${LRI}${text(ex)}${PDI}`, label: w,
            ...(/^(art:|p:)/.test(pic) ? { art: pic } : { icon: pic }) }));
    } else if (st.rule) {
        out.view = 'rule';
        out.rule = compact({ table: st.rule.table?.map(r => r.map(text)), rows: st.rule.rows.map(([e, ar]) => ({ en: rich(e), ar: rich(ar) })) });
        out.spots = out.rule.rows.map((r, i) => ({ id: `r${i}`, title: `${LRI}${r.en}${PDI}`, text: r.ar }));
    } else {
        out.view = 'read';
        const words = [...st.read.text.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
        out.read = compact({ title: text(st.read.title), text: text(st.read.text), gloss: Object.fromEntries(words.map(w => [w, text(st.read.gloss[w])])) });
        out.spots = words.map((w, i) => ({ id: `g${i}`, title: `${LRI}${w}${PDI}`, text: text(st.read.gloss[w]) }));
    }
    return compact(out);
}

// The quest's stars go to the native review topic of the same quest (import-island.mjs: <region>-<quest id>).
const quests = book.QUESTS.map(q => compact({
    id: q.id, topic: `${region}-${q.id}`, unit: source === 'english' ? String(q.unit) : undefined, station: q.station, icon: q.icon, sticker: q.sticker, title: text(q.title), goal: text(q.goal),
    book: (q.book ?? []).map(text), learned: (q.learned ?? []).map(text), steps: q.steps.map(step),
}));
const out = {
    helper: compact({ name: text(book.HELPER.name), hello: rich(book.HELPER.hello), back: rich(book.HELPER.back), free: rich(book.HELPER.free) }),
    stations: Object.entries(book.STATIONS ?? {}).map(([id, s]) => compact({ id, name: text(s.name), icon: s.icon, unit: s.unit })),
    quests,
};
if (source === 'tunes') {
    out.skySong = book.SKY_SONG;
    out.glasses = book.GLASSES.map(g => ({ id: g.id, n: g.n, d: g.d, color: book.GLASS_COLORS[g.id] }));
    out.instruments = book.INSTRUMENTS;
}
if (book.UNITS) out.units = Object.entries(book.UNITS).map(([n, u]) => ({ n: Number(n), name: text(u.name), color: u.color }));
if (source === 'lab' || source === 'atlas' || source === 'english') {
    // The stickers a science quest gives on its first finish (web: awardSticker(cfg.sticker, quest.sticker)).
    // core/stickers.js wires the web's sound to `document` when it loads; a stub is enough to read the data.
    globalThis.document ??= { addEventListener() {}, hidden: true };
    const { STICKERS } = await import('../../Web/core/stickers.js');
    out.stickers = STICKERS[region].map(([id, icon, name, fact]) => ({ id, icon, name: text(name), fact: rich(fact) }));
    for (const q of quests) if (q.sticker && !out.stickers.some(s => s.id === q.sticker)) throw new Error(`no sticker "${q.sticker}"`);
}
if (source === 'english') {
    // The book's four parts (units 1–5 … 16–20), each closed by a revision; their colours.
    out.blocks = Object.entries(book.BLOCKS).map(([n, u]) => ({ n: Number(n), name: text(u.name), color: u.color }));
    // Bilingual unit names: «بلدي · ⁦My country⁩».
    out.units = Object.entries(book.UNITS).map(([n, u]) => ({ n: Number(n), name: `${text(u.ar)} · ${LRI}${u.en}${PDI}`, color: u.color }));
}
if (source === 'lab' || source === 'english') {
    // The pictures' parts (core/lab/views.ts, views-machines.ts): for every view, each data-spot's hit box
    // [x, y, w, h] and where its name shows once found, in the 320 × 200 picture. The app draws the pictures
    // natively (ui/science/) and lays its own touch targets over these boxes; a test checks both agree.
    const VIEWS = {};
    if (source === 'lab') {
        Object.assign(VIEWS, (await import('../../Web/core/lab/views.js')).VIEWS, (await import('../../Web/core/lab/views-machines.js')).MACHINE_VIEWS);
    } else {
        // The English pictures with parts to find (core/english/views.ts): the whale, the plant, the solar system.
        const { EN_VIEWS } = await import('../../Web/core/english/views.js');
        for (const k of ['whale', 'plant', 'planets']) VIEWS[k] = EN_VIEWS[k];
    }
    const num = (tag, a) => { const m = tag.match(new RegExp(`\\s${a}="(-?[\\d.]+)"`)); return m ? Number(m[1]) : undefined; };
    out.views = Object.entries(VIEWS).map(([name, view]) => {
        const html = view.html({});
        const spots = [];
        for (const m of html.matchAll(/<(g|button)( class="[^"]*")? data-spot="([^"]+)">/g)) {
            const [open, tag, , id] = m;
            if (tag === 'button') { spots.push({ id, pill: text(html.slice(m.index + open.length, html.indexOf('</button>', m.index))) }); continue; }
            // The group's own markup, up to its matching </g>.
            let depth = 1, at = m.index + open.length;
            const re = /<g[\s>]|<\/g>/g; re.lastIndex = at;
            for (let t; depth && (t = re.exec(html));) { depth += t[0] === '</g>' ? -1 : 1; at = re.lastIndex; }
            const inner = html.slice(m.index, at);
            const hit = inner.match(/<rect class="lx-hit"[^>]*>/)?.[0];
            const lab = inner.match(/<text class="lx-label[^>]*>/)?.[0];
            spots.push(compact({ id, hit: hit && ['x', 'y', 'width', 'height'].map(a => num(hit, a)), label: lab && [num(lab, 'x'), num(lab, 'y')] }));
        }
        return { name, spots };
    });
}
const directory = new URL('../app/src/main/resources/islands/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL(region + '-quests.json', directory), JSON.stringify(out, null, 2) + '\n');

if (source === 'atlas') await exportAtlas(book, quests);

/**
 * The atlas island's world (web: core/atlas/views.ts, core/atlas/globe.ts, worlds/atlas/): written to
 * islands/atlas-map.json (the map's places, frames and label tweaks, read from views.js itself — they are not
 * exported, so its top-level tables are evaluated in a sandbox) and islands/globe.json (every country: its card,
 * its flag as plain shapes, its outline from shapes.js). Nothing is copied by hand. For the tests, the web's own
 * SVG of every map and timeline a step draws is reduced to its spots and their name positions
 * (src/test/resources/atlas-web-pictures.json), so the native drawing can be checked against it.
 */
async function exportAtlas(book, quests) {
    const { readFile } = await import('node:fs/promises');
    const vm = await import('node:vm');
    const { SHAPES } = await import('../../Web/worlds/atlas/shapes.js');
    const { COUNTRIES, SMALL, CONTINENTS } = await import('../../Web/worlds/atlas/countries.js');
    const { ATLAS_VIEWS } = await import('../../Web/core/atlas/views.js');
    const source = await readFile(new URL('../../Web/core/atlas/views.js', import.meta.url), 'utf8');
    const head = source.slice(0, source.indexOf('function projector')).replace(/^import .*$/gm, '').replace(/^export /gm, '');
    const names = ['COUNTRY', 'DOT_COUNTRY', 'WATER', 'LAKES', 'RIVERS', 'MOUNTAINS', 'LAND', 'CITY', 'AT', 'OFF', 'LINES', 'ARAB', 'AREAS'];
    const t = vm.runInNewContext(`${head}\n({ ${names.join(', ')} })`, { SHAPES });
    const nudge = vm.runInNewContext(source.match(/^const NUDGE = .*;$/m)[0].replace('const NUDGE =', '(') .replace(/;$/, ')'), {});
    // The always-drawn mountain ranges (views.ts: `!['atlas', 'ethiohigh'].includes(k)`).
    const always = source.match(/\['atlas', 'ethiohigh'\]\.includes\(k\)/) ? ['atlas', 'ethiohigh'] : null;
    if (!always) throw new Error('views.js: the always-drawn mountains changed — update exportAtlas');
    const map = {
        country: t.COUNTRY, dotCountry: t.DOT_COUNTRY, water: t.WATER, lakes: t.LAKES, rivers: t.RIVERS, mountains: t.MOUNTAINS,
        alwaysMountains: always, land: t.LAND, city: t.CITY, at: t.AT, off: t.OFF, lines: t.LINES, arab: [...t.ARAB], areas: t.AREAS, nudge,
    };
    const directory = new URL('../app/src/main/resources/islands/', import.meta.url);
    await writeFile(new URL('atlas-map.json', directory), JSON.stringify(map) + '\n');

    // ---- the globe: every country with its card and outline ----
    const color = c => {
        if (c == null || c === 'none') return undefined;
        const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
        if (!m) throw new Error(`flag colour "${c}"`);
        const h = m[1].length === 3 ? [...m[1]].map(x => x + x).join('') : m[1];
        return '#' + h.toLowerCase();
    };
    const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
    const I = [1, 0, 0, 1, 0, 0];
    function transformOf(s) {
        if (!s) return I;
        let m = I;
        for (const [, fn, args] of s.matchAll(/(\w+)\(([^)]*)\)/g)) {
            const a = args.split(/[\s,]+/).filter(Boolean).map(Number);
            if (fn === 'rotate') {
                const r = a[0] * Math.PI / 180, cx = a[1] ?? 0, cy = a[2] ?? 0, c = Math.cos(r), sn = Math.sin(r);
                m = mul(m, [c, sn, -sn, c, cx - c * cx + sn * cy, cy - sn * cx - c * cy]);
            } else if (fn === 'translate') m = mul(m, [1, 0, 0, 1, a[0], a[1] ?? 0]);
            else if (fn === 'scale') m = mul(m, [a[0], 0, 0, a[1] ?? a[0], 0, 0]);
            else throw new Error(`flag transform ${fn}`);
        }
        return m;
    }
    const r1 = x => Math.round(x * 1e4) / 1e4;
    /** A flag's SVG (worlds/atlas/countries.ts: rect, circle, polygon, path, g and a nested svg) as plain shapes. */
    function flagShapes(svg) {
        const shapes = [];
        const stack = [{ m: I, clip: null }];
        let first = true;
        for (const [tag, close, name, , self] of svg.matchAll(/<(\/?)(\w+)([^>]*?)(\/?)>/g).map(m => [m[0], m[1], m[2], m[3], m[4]])) {
            const top = stack[stack.length - 1];
            if (close) { if (name === 'svg' || name === 'g') stack.pop(); continue; }
            const a = attrs(tag);
            if (name === 'svg') {
                if (first) { first = false; if (a.viewBox !== '0 0 300 200') throw new Error('flag viewBox'); stack.push(top); continue; }
                const [, , vw, vh] = a.viewBox.split(/\s+/).map(Number), w = +a.width, h = +a.height, x = +(a.x ?? 0), y = +(a.y ?? 0);
                if (top.m !== I) throw new Error('nested flag svg inside a transform');
                stack.push({ m: mul(top.m, [w / vw, 0, 0, h / vh, x, y]), clip: [x, y, w, h] });
                continue;
            }
            if (name === 'g') { if (!self) stack.push({ m: mul(top.m, transformOf(a.transform)), clip: top.clip }); continue; }
            let d;
            if (name === 'rect') { const x = +(a.x ?? 0), y = +(a.y ?? 0), w = +a.width, h = +a.height; d = `M${x},${y}h${w}v${h}h${-w}z`; }
            else if (name === 'circle') { const cx = +a.cx, cy = +a.cy, r = +a.r; d = `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0z`; }
            else if (name === 'polygon') { const p = a.points.trim().split(/[\s,]+/).map(Number); d = 'M' + p.reduce((s, v, i) => s + (i % 2 ? `,${v}` : `${i ? 'L' : ''}${v}`), '') + 'z'; }
            else if (name === 'path') d = a.d;
            else throw new Error(`flag element <${name}>`);
            const m = mul(top.m, transformOf(a.transform));
            shapes.push(compact({
                d, fill: a.fill === undefined ? '#000000' : color(a.fill), stroke: color(a.stroke), sw: a['stroke-width'] && Number(a['stroke-width']),
                cap: a['stroke-linecap'], join: a['stroke-linejoin'], m: m.every((v, i) => Math.abs(v - I[i]) < 1e-9) ? undefined : m.map(r1), clip: top.clip ?? undefined,
            }));
        }
        return shapes;
    }
    const all = { ...COUNTRIES, ...SMALL };
    const countries = Object.entries(all).map(([id, c]) => compact({
        id, ar: text(c.ar), capital: c.capital == null ? undefined : text(c.capital), continent: c.continent, lat: c.lat, lon: c.lon,
        arab: c.arab, territory: c.territory, note: text(c.note), small: id in SMALL,
        official: text(c.official), currency: c.currency && { ar: text(c.currency.ar), code: c.currency.code }, language: text(c.language),
        nameMeaning: text(c.nameMeaning), flagMeaning: text(c.flagMeaning), resources: c.resources?.map(text), fact: text(c.fact),
        flag: c.flag && { colors: c.flag.colors.map(color), shapes: flagShapes(c.flag.svg) },
        rings: SHAPES[id],
    }));
    for (const id of Object.keys(SHAPES)) if (!all[id]) throw new Error(`shape ${id} has no card`);
    await writeFile(new URL('globe.json', directory), JSON.stringify({ continents: Object.fromEntries(Object.entries(CONTINENTS).map(([k, v]) => [k, text(v)])), countries }) + '\n');

    // ---- the web's own pictures, for the tests ----
    const num = (tag, a) => { const m = tag.match(new RegExp(`\\s${a}="(-?[\\d.]+)"`)); return m ? Number(m[1]) : undefined; };
    const pictures = [];
    book.QUESTS.forEach(q => q.steps.forEach((st, index) => {
        const view = st.kind === 'choice' ? st.pic : st.view;
        if (!view) return;
        const html = ATLAS_VIEWS[view].html(st);
        const [, , w, h] = html.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
        const spots = [];
        for (const m of html.matchAll(/<g data-spot="([^"]+)"( class="[^"]*")?>/g)) {
            const rest = html.slice(m.index);
            const lab = rest.match(/<text class="lx-label[^>]*>/)[0];
            spots.push({ id: m[1], label: [num(lab, 'x'), num(lab, 'y')] });
        }
        const marks = [...html.matchAll(/class="[^"]*mp-mark[^"]*"/g)].length;
        pictures.push({ quest: q.id, index, view, w, h, spots, marks });
    }));
    const tests = new URL('../app/src/test/resources/', import.meta.url);
    await mkdir(tests, { recursive: true });
    await writeFile(new URL('atlas-web-pictures.json', tests), JSON.stringify(pictures, null, 1) + '\n');
}
