# plugins/ — add a lesson without touching the game

Every curriculum topic (one mini-game, one quiz, one lesson) is a small,
self-contained **plugin**. The core game — map, ship, saving, stars,
Hudhud — never needs to change when a topic is added. See "Plugin /
mini-game architecture" in [`SPEC.md`](../SPEC.md).

```
plugins/
  index.js            ← the list of topics to load (one import per topic)
  engines/            ← reusable game mechanics (quiz, sort, number line …)
  arabic/ math/ science/ social/ review/   ← the grade-6 topics
  agriculture/        ← quick reviews of the farm island's quests
  music/              ← quick reviews of the music island's quests
```

## Add a topic in 4 steps

1. **Write the file**, e.g. `plugins/math/ratios.js`:

   ```js
   import { registerTopic } from '../../core/topics.js';
   import { quiz } from '../engines/quiz.js';

   registerTopic({
     id: 'math-ratios',            // unique, never rename (it's in save data)
     region: 'math',               // island id from worlds/grade6.js
     order: 5,                     // position in the island's list
     icon: '⚖️',
     title: 'النسبة والتناسب',
     blurb: 'قارن بين كميتين',
     learn: [                      // optional: Hudhud teaches first
       { title: 'ما النسبة؟', html: '<p>…</p>', say: 'جملة قصيرة يقولها هدهد' },
     ],
     render: quiz({
       count: 8,
       intro: 'جملة ترحيب يقولها هدهد',
       questions: [
         { q: 'سؤال؟', options: ['الصحيح', 'خطأ ١', 'خطأ ٢'], answer: 0,
           hint: 'تلميح لا يكشف الإجابة', explain: 'شرح يظهر بعد محاولتين' },
       ],
     }),
   });
   ```

2. **List it** in `plugins/index.js`: `import './math/ratios.js';`
3. **Cache it for offline play**: `node tools/update-shell.mjs`
4. **Test**: `npm test`, then play it (`npm run serve` → http://localhost:8000).

That's it — the topic appears on the island, earns stars, counts toward
the island's badge, unlocks the next island, and joins spaced review.

## The contract

`registerTopic(def)` — see the comment at the top of `core/topics.js`.
`render(container, onComplete, ctx)`:

- draw your activity inside `container`;
- call `onComplete({ correct, total })` **once** when finished — the core
  turns it into 0–3 stars (90% → ★★★, 70% → ★★, 50% → ★);
- use `ctx` for shared services:

| `ctx.` | what it does |
|---|---|
| `hero`, `heroName` | `'sindbad'`/`'yasmina'` and the display name |
| `say(html, mood)` | Hudhud speaks; mood `happy` · `think` · `cheer` · `oops` |
| `progress(i, n)` | move the progress rope |
| `sfx.tap/good/bad/win()` | built-in sound effects (no files needed) |
| `num(n)` | a number for display, digits 1 2 3: `num(-3.5)` → `−3.5` |
| `signal` | an `AbortSignal` fired if the student leaves mid-lesson |

## Engines you can reuse

Pick a mechanic and feed it content — no game code needed:

| engine | good for | content shape |
|---|---|---|
| `quiz` | anything multiple-choice | `{ q, options, answer, hint, explain }` |
| `tapword` | grammar: tap the subject / predicate … | `{ words: [...], ask, answer, hint, explain }` |
| `sort` | classify into 2–3 baskets | `bins: [{id,label,icon}]`, items `{ text, bin, hint }` |
| `numberline` | fractions, decimals, negatives | `{ value, label, min, max, ticks, hint }` |
| `match` | pairs: landmark ↔ city, word ↔ meaning | `{ a, b, hint }` |
| `helm` | angles: steer the ship to an angle | `{ q, angle, hint }` or `{ q, range: [min, max], show, hint }` |
| `market` | money and weights: pay or weigh an exact amount | `{ q, target, hint }`; options `pieces`, `kind: 'coin'\|'weight'`, `unit` |
| `fill` | equivalent fractions, decimals, percent: fill a bucket | `{ q, parts, answer, hint }` (answer = parts to fill) |
| `blocks` | grammar: build a sentence from word blocks | `{ words, slots: [[label, role]], extra, hint }` |

`engines/visuals.js` has helpers for learn cards: colour-coded sentence
roles, fraction bars, a 100-square percent grid, mini number lines,
plural tables, icon cards, planets, angles.

## Content rules

- **Hints never give the answer away.** They point to the rule or a
  question to ask yourself. After two tries Hudhud shows and explains it.
- Use the Syrian curriculum's terms, and the digits 1 2 3 (`num()`).
- Keep everything local: no network fetches, small emoji/SVG instead of
  big images. The whole grade must stay well under 35 MB.
- Mark new content as draft until a Syrian educator has reviewed it.
- Licences: code MIT/GPL; educational content and art CC-BY-SA.

## Quests played outside the lesson screen (the farm, the music island)

The farm island (`core/farm/`) is a 3D game, not a lesson screen. Each of
its quests is still a topic (`plugins/agriculture/`, region `farm`), so it
earns stars, counts toward the island's badge and joins spaced review.
When a quest ends, the farm records the result itself:

```js
import { recordResult } from '../core/lesson.js';
recordResult('farm-potato', { correct, total });   // → { stars, pearls }
```

(`correct` = jobs done right the first time, `total` = all jobs.) The
topic's own `render` is a short quiz or sort: the review that comes back
days later. Adding a farm quest: a crop or task in
`worlds/grade6/farm.js` (steps, choices, the book's facts), a quest in
`QUESTS`, and its review topic here.

The music island (`core/tunes/`) works the same way: its quests are in
`worlds/grade6/tunes.js` (a list of steps per quest, each drawn by a small
music game in `core/tunes/games.js`: keys, staff, rhythm, drum, measure,
fill, glasses…), and `plugins/music/reviews.js` registers one review topic
per quest, built from the quest's own questions (`reviewOf()`).
