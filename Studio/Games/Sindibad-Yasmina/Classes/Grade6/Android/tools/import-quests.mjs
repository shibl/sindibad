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
function rich(html) {
    if (html == null) return undefined;
    const s = String(html);
    if (s.includes('**')) throw new Error(`"**" already in source text: ${s}`);
    return plain(s.replace(/<b\b[^>]*>([\s\S]*?)<\/b>/g, '**$1**')).replace(/\*\*\s*\*\*/g, '');
}
const text = value => value == null ? undefined : plain(String(value));
const compact = object => Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined && v !== null && v !== false));

// How a step's parts count (web: core/learn/steps.ts and the island's own games). "whole": any miss
// costs the step (ok 0 or 1 of 1); "share": ok = share of parts right first try (of 1); "parts": every
// part counts 1 (ok = parts right first try, total = parts).
const ISLAND_SCORING = { tunes: { sort: 'parts', order: 'whole' } };
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
        case 'explore': return compact({ ...base, title: rich(st.title), tap: text(st.tap), view: st.view, guided: st.guided, cols: st.cols,
            theme: st.theme, done: rich(st.done), sum: rich(st.sum), spots: st.spots.map(spot),
            kb: st.kb && compact({ from: st.kb.from, to: st.kb.to, labels: st.kb.labels, gaps: st.kb.gaps }),
            person: st.person && { name: text(st.person.name), role: text(st.person.role), icon: st.person.icon }, art: st.art });
        case 'learn': return compact({ ...base, title: rich(st.title), html: rich(st.html), show: st.show, play: sound(st.play) });
        case 'choice': return compact({ ...base, q: rich(st.q), options: st.options.map(rich), art: st.art, layout: st.layout,
            listen: sound(st.listen), show: st.show, pic: st.pic });
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
        case 'label': return compact({ ...base, q: rich(st.q), view: st.view, ask: st.ask.map(([id, name]) => ({ id, name: text(name) })) });
        default: throw new Error(`import-quests: step kind "${st.kind}" is not handled — add it here and in domain/quest/`);
    }
}

// The quest's stars go to the native review topic of the same quest (import-island.mjs: <region>-<quest id>).
const quests = book.QUESTS.map(q => compact({
    id: q.id, topic: `${region}-${q.id}`, station: q.station, icon: q.icon, sticker: q.sticker, title: text(q.title), goal: text(q.goal),
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
if (source === 'lab') {
    // The stickers a science quest gives on its first finish (web: awardSticker(cfg.sticker, quest.sticker)).
    // core/stickers.js wires the web's sound to `document` when it loads; a stub is enough to read the data.
    globalThis.document ??= { addEventListener() {}, hidden: true };
    const { STICKERS } = await import('../../Web/core/stickers.js');
    out.stickers = STICKERS[region].map(([id, icon, name, fact]) => ({ id, icon, name: text(name), fact: rich(fact) }));
    for (const q of quests) if (q.sticker && !out.stickers.some(s => s.id === q.sticker)) throw new Error(`no sticker "${q.sticker}"`);
}
if (source === 'lab') {
    // The pictures' parts (core/lab/views.ts, views-machines.ts): for every view, each data-spot's hit box
    // [x, y, w, h] and where its name shows once found, in the 320 × 200 picture. The app draws the pictures
    // natively (ui/science/) and lays its own touch targets over these boxes; a test checks both agree.
    const { VIEWS } = await import('../../Web/core/lab/views.js');
    const { MACHINE_VIEWS } = await import('../../Web/core/lab/views-machines.js');
    const num = (tag, a) => { const m = tag.match(new RegExp(`\\s${a}="(-?[\\d.]+)"`)); return m ? Number(m[1]) : undefined; };
    out.views = Object.entries({ ...VIEWS, ...MACHINE_VIEWS }).map(([name, view]) => {
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
