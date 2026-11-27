// Export an island's quests step by step (every step kind, with all the fields the native quest
// framework needs) from the original CC-BY-SA curriculum: node tools/import-quests.mjs music tunes
// writes app/src/main/resources/islands/music-quests.json. The review topics (<region>.json, made by
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
        case 'tf': return compact({ ...base, q: rich(st.q), items: st.items.map(([line, truth, fix]) => compact({ text: rich(line), truth: !!truth, fix: rich(fix) })), pic: st.pic });
        case 'number': return compact({ ...base, q: rich(st.q), answer: String(st.answer), unit: text(st.unit), pic: st.pic });
        case 'label': return compact({ ...base, q: rich(st.q), view: st.view, ask: st.ask.map(([id, name]) => ({ id, name: text(name) })) });
        default: throw new Error(`import-quests: step kind "${st.kind}" is not handled — add it here and in domain/quest/`);
    }
}

const quests = book.QUESTS.map(q => compact({
    id: q.id, topic: q.topic, station: q.station, icon: q.icon, sticker: q.sticker, title: text(q.title), goal: text(q.goal),
    book: (q.book ?? []).map(text), learned: (q.learned ?? []).map(text), steps: q.steps.map(step),
}));
const out = {
    helper: compact({ name: text(book.HELPER.name), hello: rich(book.HELPER.hello), back: rich(book.HELPER.back), free: rich(book.HELPER.free) }),
    stations: Object.entries(book.STATIONS ?? {}).map(([id, s]) => ({ id, name: text(s.name), icon: s.icon })),
    quests,
};
if (source === 'tunes') {
    out.skySong = book.SKY_SONG;
    out.glasses = book.GLASSES.map(g => ({ id: g.id, n: g.n, d: g.d, color: book.GLASS_COLORS[g.id] }));
    out.instruments = book.INSTRUMENTS;
}
const directory = new URL('../app/src/main/resources/islands/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL(region + '-quests.json', directory), JSON.stringify(out, null, 2) + '\n');
