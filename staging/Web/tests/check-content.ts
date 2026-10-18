// Checks the game's lessons in a second, without a browser: what the full
// test (e2e.mjs) would only find by playing every lesson, or never. Part of
// npm test.
//
// The 3D book islands (art, English, science, atlas):
// Every island: each quest teaches first («أتعلّم») and then asks at least
// four questions; every question has a hint and an explanation; the places,
// units, pictures and kinds of play it names exist; a picture's parts are
// the ones the step lists; at least six review questions; «تعلّمنا» lines.
// The art island also: its paint colours, collage pieces, folds, tiles and
// paintings exist.
//
// Every topic of the lesson screen (plugins/: Arabic, maths, the farm, the
// islands' quick reviews…): it belongs to an island of the map, its mini-
// lesson cards are complete, every item has a hint and an explanation, the
// lesson does not ask for more items than it has, and each engine's answer
// is one it can show (a quiz's answer is one of its options, a tapped word
// is in the sentence, a sorted card has its basket…). To read a topic's
// content, the engines are replaced here by stand-ins that keep what the
// topic gives them.

import { register } from 'node:module';
import type { Quest, Step, IslandContent } from '../types/content.d.ts';

const ENGINES = ['quiz', 'tapword', 'sort', 'match', 'numberline', 'blocks', 'fill', 'helm', 'market'];
register('data:text/javascript,' + encodeURIComponent(`
  const ENGINES = ${JSON.stringify(ENGINES)};
  export async function load(url, context, next) {
    const m = /\\/plugins\\/engines\\/([a-z]+)\\.js$/.exec(url);
    if (!m || !ENGINES.includes(m[1])) return next(url, context);
    return { format: 'module', shortCircuit: true, source: \`export * from '\${url}?real';
      export const \${m[1]} = opts => Object.assign(() => {}, { engine: '\${m[1]}', opts });\` };
  }`));

type Views = Record<string, { html(step: Step): string }>;
const WEB = new URL('..', import.meta.url);
const load = (path: string): Promise<any> => import(new URL(path, WEB).href);

const { QUESTION_KINDS } = await load('core/learn/steps.js') as { QUESTION_KINDS: string[] };
const merge = async (parts: [string, string][]): Promise<Views> => Object.assign({}, ...await Promise.all(parts.map(async ([file, name]) => (await load(file))[name])));

const ISLANDS: { key: string; content: string; views: [string, string][]; kinds?: [string, string] }[] = [
  { key: 'studio', content: 'worlds/grade6/studio.js', views: [['core/studio/views.js', 'VIEWS']], kinds: ['core/studio/games.js', 'CUSTOM_KINDS'] },
  { key: 'english', content: 'worlds/grade6/english.js', views: [['core/english/views.js', 'EN_VIEWS']], kinds: ['core/english/games.js', 'GAME_KINDS'] },
  { key: 'lab', content: 'worlds/grade6/lab.js', views: [['core/lab/views.js', 'VIEWS'], ['core/lab/views-machines.js', 'MACHINE_VIEWS']] },
  { key: 'atlas', content: 'worlds/grade6/atlas.js', views: [['core/atlas/views.js', 'ATLAS_VIEWS']] },
];

const problems: string[] = [];
const strip = (h: unknown) => String(h ?? '').replace(/<[^>]*>/g, '');
const attrs = (html: string, a: string) => [...html.matchAll(new RegExp(`${a}="([^"]+)"`, 'g'))].map(m => m[1]);
const dupes = (list: unknown[]) => list.filter((x, i) => list.indexOf(x) !== i);
const topics = new Set<string>();
let quests = 0;

for (const island of ISLANDS) {
  const { STATIONS, UNITS, QUESTS } = await load(island.content) as IslandContent;
  const views = await merge(island.views);
  const own: string[] = island.kinds ? (await load(island.kinds[0]))[island.kinds[1]] : [];
  const kinds = new Set(['explore', ...QUESTION_KINDS, ...own]);
  const art = island.key === 'studio' ? await artChecks() : null;
  const ids = new Set<string>();

  for (const st of Object.values(STATIONS)) if (!UNITS[st.unit]) problems.push(`${island.key}: station ${st.name}: no unit ${st.unit}`);
  for (const id of Object.keys(STATIONS)) if (!QUESTS.some(q => q.station === id)) problems.push(`${island.key}: station ${id} has no quest`);

  for (const q of QUESTS as Quest[]) {
    quests += 1;
    const W = `${island.key}/${q.id}`;
    const bad = (msg: string) => problems.push(`${W}: ${msg}`);
    for (const k of ['id', 'topic', 'station', 'icon', 'title', 'goal', 'book', 'steps', 'review', 'learned'] as const) if (!q[k] || (Array.isArray(q[k]) && !q[k].length)) bad(`missing ${k}`);
    if (ids.has(q.id)) bad('two quests have this id'); ids.add(q.id);
    if (topics.has(q.topic)) bad(`two quests have the topic ${q.topic}`); topics.add(q.topic);
    if (!STATIONS[q.station]) bad(`no station ${q.station}`);
    if (/[<>"]/.test(q.title)) bad('the title must be plain text');
    const steps = q.steps || [];
    if (steps[0]?.kind !== 'explore') bad('the first step must teach («أتعلّم», kind explore)');
    if (steps.filter(s => s.kind !== 'explore').length < 4) bad('at least four question steps');

    steps.forEach((s, i) => {
      const S = (msg: string) => bad(`step ${i + 1} (${s.kind}): ${msg}`);
      if (!kinds.has(s.kind)) { S('unknown kind'); return; }
      if (s.kind !== 'explore' && !s.hint) S('no hint');
      if (s.kind !== 'explore' && !s.explain) S('no explanation');
      for (const v of [s.view, s.pic]) if (v && !views[v] && !(art && v === 'art')) S(`no picture ${v}`);
      let html = '';
      if (s.view && views[s.view]) try { html = views[s.view].html(s); } catch (e) { S(`the picture ${s.view} fails: ${(e as Error).message}`); }

      if (s.kind === 'explore') {
        if (!s.title) S('no title');
        if (!s.spots && !s.words && !s.rule && !s.read) S('nothing to discover (spots, words, rule or read)');
        const spots: { id: string; title?: string; text?: string }[] = s.spots || [];
        for (const sp of spots) if (!sp.id || !sp.title || !sp.text) S(`spot ${sp.id}: id, title and text`);
        for (const id of dupes(spots.map(sp => sp.id))) S(`two spots are called ${id}`);
        if (spots.length) for (const id of attrs(html, 'data-spot')) if (!spots.some(sp => sp.id === id)) S(`the picture has a part «${id}» the step does not list (it could never be found)`);
      }
      if (s.kind === 'choice') { if ((s.options || []).length < 2) S('at least two options'); for (const o of dupes(s.options || [])) S(`the option «${strip(o)}» twice`); }
      if (s.kind === 'twoway') for (const [line, right, wrong] of s.lines || []) { if (!line.includes('___')) S(`«${strip(line).slice(0, 40)}» has no ___`); if (right === wrong) S(`«${strip(line).slice(0, 40)}»: the two words are the same`); }
      if (s.kind === 'sort') for (const [text, bin] of s.items || []) if (!(s.bins || []).some((b: { id: string }) => b.id === bin)) S(`«${strip(text)}» goes in a bin that is not there (${bin})`);
      if (s.kind === 'order' && (s.items || []).length < 2) S('at least two items');
      if (s.kind === 'match') { if ((s.pairs || []).length < 2) S('at least two pairs'); for (const r of dupes((s.pairs || []).map((p: string[]) => p[1]))) S(`two pairs share the answer «${strip(r)}»`); }
      if (s.kind === 'tf') for (const it of s.items || []) if (typeof it[1] !== 'boolean') S(`«${strip(it[0]).slice(0, 40)}»: true or false?`);
      if (s.kind === 'number' && (s.answer == null || s.answer === '')) S('no answer');
      if (s.kind === 'label') for (const [id] of s.ask || []) if (!attrs(html, 'data-spot').includes(id)) S(`no part «${id}» in the picture ${s.view}`);
      art?.(s, html, S);
    });

    if ((q.review || []).length < 6) bad(`at least six review questions (${(q.review || []).length})`);
    for (const r of q.review || []) {
      if (!r.q || (r.options || []).length < 3 || !r.hint || !r.explain) bad(`review «${strip(r.q).slice(0, 40)}»: a question, three options, a hint and an explanation`);
      for (const o of dupes(r.options || [])) bad(`review «${strip(r.q).slice(0, 40)}»: the option «${strip(o)}» twice`);
    }
    if ((q.learned || []).length < 2) bad('«تعلّمنا»: two or three lines');
  }
}

// The art island's own games (core/studio/games.js).
async function artChecks() {
  const { COLORS, TILES } = await load('core/studio/games.js');
  const { PIECES, STAGES } = await load('core/studio/views.js');
  const { ART } = await load('core/studio/art.js');
  const TAGS = new Set(Object.values(COLORS as Record<string, { tags: string[] }>).flatMap(c => c.tags));
  return (s: Step, html: string, S: (msg: string) => void) => {
    if (s.art && !ART[s.art]) S(`no painting ${s.art}`);
    for (const sp of s.spots || []) if (sp.art && !ART[sp.art]) S(`spot ${sp.id}: no painting ${sp.art}`);
    if (s.kind === 'paint') {
      const regions = attrs(html, 'data-region');
      for (const c of s.palette || []) if (!COLORS[c]) S(`no colour ${c}`);
      for (const [id, want] of Object.entries(s.regions || {}) as [string, string][]) {
        if (!regions.includes(id)) S(`no part ${id} to paint in ${s.view}`);
        if (!COLORS[want] && !TAGS.has(want)) S(`part ${id}: no colour or kind of colour ${want}`);
        else if (!(s.palette || []).some((c: string) => c === want || COLORS[c]?.tags.includes(want))) S(`part ${id}: no ${want} in the palette`);
      }
    }
    if (s.kind === 'mix') for (const r of s.rounds || []) for (const c of [r.want, ...r.from]) if (!COLORS[c]) S(`no colour ${c}`);
    if (s.kind === 'collage') {
      const slots = attrs(html, 'data-slot'), pieces = Object.keys(PIECES[s.view!] || {});
      if (!pieces.length) S(`no pieces for ${s.view}`);
      for (const id of pieces) if (!slots.includes(id)) S(`no outline for the piece ${id}`);
    }
    if (s.kind === 'craft') for (const st of s.seq || []) if (!(s.tools || []).some((t: { id: string }) => t.id === st.tool)) S(`the tool ${st.tool} is not in the tools`);
    if (s.kind === 'fold' && !STAGES[s.model || 'butterfly']) S(`no folds for ${s.model}`);
    if (s.kind === 'pattern') for (const t of [...(s.seq || []), ...(s.extra || [])]) if (!TILES[t]) S(`no tile ${t}`);
    if (s.kind === 'gallery') for (const f of s.frames || []) if (!ART[f.art]) S(`frame ${f.id}: no painting ${f.art}`);
  };
}

// ---------- The lesson screen's topics ----------

// Known gaps, reported but not failing: topic id → what is missing.
const KNOWN: Record<string, string> = {
  'farm-cow': 'its cards have no explanation (said when the answer is shown)',
};
const { allTopics } = await load('core/topics.js');
await load('plugins/index.js');
const world = (await load('worlds/grade6.js')).default as { regions: { id: string }[] };
const regions = new Set(world.regions.map(r => r.id));
const notes: string[] = [];
let topicCount = 0;
for (const t of allTopics() as { id: string; region: string; title: string; icon: string; learn?: { title: string; html: string }[]; render: { engine?: string; opts?: any } }[]) {
  topicCount += 1;
  const bad = (msg: string) => problems.push(`topic ${t.id}: ${msg}`);
  if (!regions.has(t.region)) bad(`no island ${t.region} on the map`);
  if (!t.title) bad('no title');
  for (const [i, c] of (t.learn || []).entries()) if (!c.title || !c.html) bad(`mini-lesson card ${i + 1}: a title and a text`);
  const { engine, opts } = t.render;
  if (!engine) { bad('its render is not one of the engines (it cannot be checked here)'); continue; }
  const field = opts.questions ? 'questions' : opts.pairs ? 'pairs' : 'items';
  // Questions made afresh each time (sums with random numbers): check a few draws.
  const draws: any[][] = typeof opts[field] === 'function' ? Array.from({ length: 5 }, () => opts[field]()) : [opts[field] || []];
  for (const list of draws) {
    if (!list.length) bad('no content');
    if (opts.count && engine !== 'match' && opts.count > list.length) bad(`asks ${opts.count} but has ${list.length}`);
    for (const it of list) {
      const what = `«${strip(it.q ?? it.text ?? it.words?.join(' ') ?? it.label ?? JSON.stringify(it)).slice(0, 40)}»`;
      if (engine === 'match') { if (!Array.isArray(it) || it.length !== 2 || !it[0] || !it[1]) bad(`${what}: a pair`); continue; }
      if (!it.hint) bad(`${what}: no hint`);
      if (!it.explain && !KNOWN[t.id]) bad(`${what}: no explanation`);
      if (engine === 'quiz') {
        if ((it.options || []).length < 2) bad(`${what}: at least two options`);
        for (const o of dupes(it.options || [])) bad(`${what}: the option «${strip(o)}» twice`);
        if (!(it.answer >= 0 && it.answer < (it.options || []).length)) bad(`${what}: the answer is not one of the options`);
      }
      if (engine === 'tapword' && !(it.answer >= 0 && it.answer < it.words.length)) bad(`${what}: the word to tap is not in the sentence`);
      if (engine === 'sort' && !opts.bins.some((b: { id: string }) => b.id === it.bin)) bad(`${what}: no basket ${it.bin}`);
      if (engine === 'numberline' && !(it.value >= it.min && it.value <= it.max)) bad(`${what}: ${it.value} is not on the line ${it.min}…${it.max}`);
      if (engine === 'fill' && !(it.answer >= 0 && it.answer <= it.parts)) bad(`${what}: fill ${it.answer} of ${it.parts}?`);
      if (engine === 'blocks' && it.words.length !== it.slots.length) bad(`${what}: ${it.words.length} words for ${it.slots.length} places`);
    }
  }
  if (KNOWN[t.id]) notes.push(`${t.id}: ${KNOWN[t.id]}`);
}

if (problems.length) {
  console.error(`✗ the lessons:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
for (const n of notes) console.log(`  (known gap) ${n}`);
console.log(`✓ the lessons are complete (${quests} quests on ${ISLANDS.length} 3D islands, ${topicCount} topics)`);
