// Export the original CC-BY-SA curriculum as offline native lesson data.
import { practiceCards } from './practice-cards.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { plain } from '../../Shared/Art/tools/math-source.ts';

const [region, source] = process.argv.slice(2);
const book = await import(`../../Web/worlds/grade6/${source}.js`);
const topics = [];
for (const quest of book.QUESTS) {
    let cards;
    let review;
    if (region === 'farm') {
        const task = book.CROPS[quest.crop] ?? book.TASKS[quest.id];
        // The steps are played in the native farm scene (barn.json); the review lesson
        // opens with what the quest taught («تعلّمنا من كتاب …»).
        cards = [{ title: 'تعلّمنا من كتاب «' + plain(task.book) + '»', text: task.learned.map(plain).join('\n') }];
        const bank = await import(`../../Web/plugins/agriculture/${quest.id}.js`);
        const feeds = { strong: 'علف مركّز', rough: 'علف خشن', green: 'علف أخضر' };
        review = bank.QUESTIONS ?? bank.ITEMS.map(item => ({
            q: 'من أيّ نوع هذا العلف؟ ' + item.text, options: Object.values(feeds),
            answer: Object.keys(feeds).indexOf(item.bin), hint: item.hint, explain: feeds[item.bin] + ' — ' + item.hint,
        }));
    } else {
        cards = quest.steps.filter(step => step.kind === 'explore').map(step => ({
            title: plain(step.title ?? quest.title),
            text: [step.say, step.done, step.sum].filter(Boolean).map(plain).join('\n'),
            example: (step.spots ?? []).map(spot => plain(spot.title ?? spot.label)),
            labels: (step.spots ?? []).map(spot => plain(spot.text)),
            ...(step.words ? { words: step.words.map(([en, ar,, sentence]) => ({ en: plain(en), ar: plain(ar), sentence: plain(sentence) })) } : {}),
            ...(step.read ? { text: [step.say, step.read.title, step.read.text].filter(Boolean).map(plain).join('\n'),
                example: Object.keys(step.read.gloss ?? {}), labels: Object.values(step.read.gloss ?? {}).map(plain) } : {}),
            ...(step.rule?.rows ? { example: step.rule.rows.map(row => plain(row[0])), labels: step.rule.rows.map(row => plain(row[1])) } : {}),
        }));
        for (const step of quest.steps.filter(s => ['keys', 'glasses'].includes(s.kind))) {
            cards.push({ title: quest.title, text: plain(step.q), notes: step.play.map(note =>
                step.kind === 'glasses' ? (note === 'C2' ? 'C5' : note + '4') : note) });
        }
        if (['science', 'social', 'art', 'english'].includes(region)) {
            const explorations = cards[Symbol.iterator]();
            cards = quest.steps.flatMap(step => step.kind === 'explore' ? [explorations.next().value] : practiceCards(step));
        }
        review = book.reviewOf(quest.id);
    }
    if (!cards.length) cards.push({ title: quest.title, text: quest.goal });
    const id = region + '-' + quest.id;
    const questions = review.map((q, i) => ({
        id: id + '-' + i, prompt: plain(q.q), choices: q.options.map(plain),
        answer: [q.answer ?? 0], hint: plain(q.hint), explanation: plain(q.explain),
    }));
    topics.push({ id, title: plain(quest.title), blurb: plain(quest.goal), kind: 'Choice', cards, questions, roundCount: Math.min(6, questions.length) });
}
const directory = new URL('../app/src/main/resources/islands/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL(region + '.json', directory), JSON.stringify(topics, null, 2) + '\n');
// The atlas globe (islands/globe.json) is written by `node tools/import-quests.mjs social atlas`.
if (region === 'farm') {
    // Everything the native farm scene needs to play each quest as the web does.
    const places = { barn: 'pen', dairy: 'dairy', hive: 'hive' };
    const text = value => plain(value ?? '');
    const perTool = (value, tools) => value == null ? {} : typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, text(v)]))
        : Object.fromEntries(tools.map(t => [t, text(value)]));
    const step = st => {
        const tools = [st.do].flat();
        const out = { do: tools, hint: text(st.hint), why: perTool(st.why, tools) };
        if (st.wrong) out.wrong = perTool(st.wrong, []);
        if (st.pick) {
            const p = st.pick;
            out.pick = { type: p.type ?? 'choice', ask: text(p.ask), oops: text(p.oops) };
            if (p.tool) out.pick.tool = p.tool;
            if (p.options) out.pick.options = p.options.map(o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? text(v) : v])));
            if (p.groups) out.pick.groups = perTool(p.groups, []);
            for (const k of ['from', 'target', 'min', 'max']) if (p[k] != null) out.pick[k] = p[k];
            if (p.why) out.pick.why = text(p.why);
            if (p.reveal) out.pick.reveal = text(p.reveal);
        }
        for (const k of ['stage', 'then', 'then2', 'power', 'rounds']) if (st[k] != null) out[k] = st[k];
        for (const k of ['lapse', 'lapse2', 'roundLapse']) if (st[k] != null) out[k] = text(st[k]);
        for (const k of ['weeds', 'dense']) if (st[k]) out[k] = true;
        if (st.whyRounds) out.whyRounds = st.whyRounds.map(text);
        return out;
    };
    const quests = book.QUESTS.map(q => {
        const task = book.CROPS[q.crop] ?? book.TASKS[q.task];
        return {
            id: q.id, topic: q.topic, title: text(q.title), icon: q.icon, goal: text(q.goal),
            crop: !!q.crop, place: q.crop ? 'plot' : places[task.place], name: text(task.name), book: text(task.book),
            product: task.product, yield: task.yield ?? 1, needs: task.needs ?? {}, tools: task.tools,
            nope: perTool(task.nope, []), steps: task.steps.map(step), learned: task.learned.map(text),
        };
    });
    const helpers = Object.fromEntries(book.HELPERS.map(h => [h.id, { name: h.name, fact: plain(h.hello), kind: h.kind, blurb: plain(h.blurb), power: plain(h.power) }]));
    const decorations = Object.fromEntries(book.DECOR.map(d => [d.id, { name: d.icon + ' ' + d.name, cost: d.cost, fact: plain(d.fact) }]));
    await writeFile(new URL('barn.json', directory), JSON.stringify({ helpers, decorations, products: book.PRODUCTS, orders: book.ORDERS,
        tools: book.TOOLS, quests, levels: book.LEVELS }, null, 2) + '\n');
}
