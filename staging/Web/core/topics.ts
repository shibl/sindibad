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
//     learn: [                       // optional mini-lesson shown before
//       { title, html, say },        //   practice (always the first time,
//     ],                             //   on request afterwards)
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
//   ctx.num(n)             format a number for display (−3.5)
//   ctx.signal             AbortSignal fired when the student leaves early —
//                          pass it to addEventListener / clear timers on it.

import type { sfx } from './sound.js';

/** A topic's result: answers right on the first try, of how many (and the best run of them). */
export interface Result { correct: number; total: number; streak?: number }

/** What a topic gets from the lesson screen (core/lesson.ts). */
export interface LessonCtx {
  hero: 'sindbad' | 'yasmina';
  heroName: string;
  /** Hudhud (or the villager) speaks; mood: 'happy' | 'think' | 'cheer' | 'oops'. */
  say(html: string, mood?: string): void;
  /** Moves the progress rope: i of n done. */
  progress(i: number, n: number): void;
  sfx: typeof sfx;
  num(n: number | string): string;
  /** Fired when the student leaves early. */
  signal: AbortSignal;
  /** Adaptive practice: n items, the ones missed before first. */
  choose?<T>(list: T[], n: number): T[];
  /** Remembers whether an item was right on the first try. */
  mark?(item: unknown, ok: boolean): void;
}

/** Draws the activity into `container` and calls onComplete once. */
export type Render = (container: HTMLElement, onComplete: (result: Result) => void, ctx: LessonCtx) => void;

/** A card of the mini-lesson before practice. */
export interface LearnCard { title: string; html: string; say?: string }

export interface TopicDef {
  id: string;
  /** The island's id in worlds/grade6.js. */
  region: string;
  title: string;
  icon?: string;
  blurb?: string;
  order?: number;
  learn?: LearnCard[];
  render: Render;
}
export type Topic = Required<Pick<TopicDef, 'icon' | 'blurb' | 'order'>> & TopicDef;

const topics = new Map<string, Topic>();

export function registerTopic(def: TopicDef) {
  const missing = (['id', 'region', 'title', 'render'] as const).filter(k => !def[k]);
  if (missing.length) throw new Error(`registerTopic: missing ${missing.join(', ')}`);
  if (typeof def.render !== 'function') throw new Error(`registerTopic(${def.id}): render must be a function`);
  if (topics.has(def.id)) throw new Error(`registerTopic: duplicate id "${def.id}"`);
  topics.set(def.id, { icon: '⭐', blurb: '', order: 100, ...def });
}

export function getTopic(id: string) { return topics.get(id); }

export function topicsIn(regionId: string) {
  return [...topics.values()].filter(t => t.region === regionId).sort((a, b) => a.order - b.order);
}

export function allTopics() { return [...topics.values()]; }

// Stars for a result: 90%+ → 3, 70%+ → 2, 50%+ → 1.
export function starsFor({ correct, total }: Result) {
  const r = total ? correct / total : 0;
  return r >= 0.9 ? 3 : r >= 0.7 ? 2 : r >= 0.5 ? 1 : 0;
}
