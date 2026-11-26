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
        cards = task.steps.map(step => {
            const actions = [step.do].flat();
            const text = [step.hint, ...Object.values(typeof step.why === 'object' ? step.why : [step.why]), step.pick?.why].filter(Boolean).map(plain).join('\n');
            return { title: plain(task.book), text, tools: task.tools.map(id => book.TOOLS[id].name), requiredTools: actions.map(id => book.TOOLS[id].name) };
        });
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
        }));
        for (const step of quest.steps.filter(s => ['keys', 'glasses'].includes(s.kind))) {
            cards.push({ title: quest.title, text: plain(step.q), notes: step.play.map(note =>
                step.kind === 'glasses' ? (note === 'C2' ? 'C5' : note + '4') : note) });
        }
        if (['science', 'social', 'art'].includes(region)) {
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
if (region === 'social') {
    const { COUNTRIES, SMALL, CONTINENTS } = await import('../../Web/worlds/atlas/countries.js');
    const { SHAPES } = await import('../../Web/worlds/atlas/shapes.js');
    const cards = Object.entries({ ...COUNTRIES, ...SMALL }).map(([id, c]) => ({
        name: c.ar, lat: c.lat, lon: c.lon, lines: SHAPES[id] ?? [],
        facts: [CONTINENTS[c.continent], c.capital, c.language, c.currency?.ar, c.nameMeaning, c.note].filter(Boolean).map(plain),
    }));
    await writeFile(new URL('globe.json', directory), JSON.stringify(cards) + '\n');
}
if (region === 'farm') {
    const goods = Object.fromEntries(book.QUESTS.map(q => {
        const task = book.CROPS[q.crop] ?? book.TASKS[q.id];
        return [q.topic, { product: task.product, amount: task.yield }];
    }));
    const helpers = Object.fromEntries(book.HELPERS.map(h => [h.id, { name: h.name, fact: plain(h.hello) }]));
    const decorations = Object.fromEntries(book.DECOR.map(d => [d.id, { name: d.icon + ' ' + d.name, cost: d.cost, fact: plain(d.fact) }]));
    await writeFile(new URL('barn.json', directory), JSON.stringify({ goods, helpers, decorations, products: book.PRODUCTS, orders: book.ORDERS }, null, 2) + '\n');
}
