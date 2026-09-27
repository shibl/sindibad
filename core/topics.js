// Topic registry — the contract between the core game and topic plugins.
//
// A topic is one short activity (a quiz, a puzzle, a mini-game) about one
// curriculum idea. Plugins register topics; the core decides where they
// appear (by `region`), launches them, and records the result. The core
// never needs to change when a topic is added. Full guide: plugins/README.md.
//
//   registerTopic({
//     id:     'arabic-fael',          // unique, stable (used in save data)
//     region: 'arabic',              // island id from worlds/grade6.js
//     title:  'الفاعل والمفعول به',   // shown on the island card
//     icon:   '✍️',                  // one emoji
//     blurb:  'مَن فعل؟ وعلى مَن وقع الفعل؟',   // optional one-liner
//     order:  1,                     // optional sort order within the island
//     render(container, onComplete, ctx) { ... },
//   });
//
// render() draws the activity into `container` (an empty element; the core
// clears it afterwards). When the student finishes it must call
//   onComplete({ correct, total })
// exactly once. The core turns that into 0–3 stars.
//
// ctx gives the plugin the shared game services:
//   ctx.hero               'sindbad' | 'yasmina'
//   ctx.heroName           'سندباد' | 'ياسمينة'
//   ctx.say(html, mood?)   Hudhud speaks; mood: 'happy' | 'think' | 'cheer' | 'oops'
//   ctx.progress(i, n)     update the progress bar (i of n done)
//   ctx.sfx.tap() / good() / bad() / win()
//   ctx.num(n)             format a number with Arabic-Indic digits (٣٫٥)
//   ctx.signal             AbortSignal fired when the student leaves early —
//                          pass it to addEventListener / clear timers on it.

const topics = new Map();

export function registerTopic(def) {
  const missing = ['id', 'region', 'title', 'render'].filter(k => !def[k]);
  if (missing.length) throw new Error(`registerTopic: missing ${missing.join(', ')}`);
  if (typeof def.render !== 'function') throw new Error(`registerTopic(${def.id}): render must be a function`);
  if (topics.has(def.id)) throw new Error(`registerTopic: duplicate id "${def.id}"`);
  topics.set(def.id, { icon: '⭐', blurb: '', order: 100, ...def });
}

export function getTopic(id) { return topics.get(id); }

export function topicsIn(regionId) {
  return [...topics.values()].filter(t => t.region === regionId).sort((a, b) => a.order - b.order);
}

export function allTopics() { return [...topics.values()]; }

// Stars for a result: 90%+ → 3, 70%+ → 2, 50%+ → 1.
export function starsFor({ correct, total }) {
  const r = total ? correct / total : 0;
  return r >= 0.9 ? 3 : r >= 0.7 ? 2 : r >= 0.5 ? 1 : 0;
}
