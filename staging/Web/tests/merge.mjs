// The merge of a child's save from two devices (core/merge.ts): each field's
// rule, and that nothing is counted twice or lost.
import assert from 'node:assert/strict';
import { merge, same } from '../core/merge.js';

let n = 0;
const check = (label, fn) => { fn(); n += 1; console.log(`✓ ${label}`); };

const base = {
  version: 1, hero: 'sindbad', pearls: 20, time: 100, muted: false,
  days: { '2026-10-26': 100 }, daily: { '2026-10-26': 2 },
  topics: { t1: { stars: 1, best: 0.5, plays: 2, last: 10, missed: ['a', 'b'], history: [{ t: 1, pct: 0.4 }, { t: 2, pct: 0.5 }] } },
  review: { t1: { box: 0, due: 100 } },
  owned: ['sail-rose'], stickers: ['s1'], badges: { arabic: 'bronze' },
  world: { farm: { coins: 10, xp: 5, quest: 1, inv: { tomato: 3 }, plots: [{ run: null }, { run: null }] } },
};
const copy = v => structuredClone(v);

check('same() ignores key order', () => {
  assert.ok(same({ a: 1, b: [1, { c: 2, d: 3 }] }, { b: [1, { d: 3, c: 2 }], a: 1 }));
  assert.ok(!same({ a: 1 }, { a: 1, b: undefined }));
  assert.ok(!same([1, 2], [2, 1]));
});

check('a change on one side only wins', () => {
  const local = copy(base); local.pearls = 35; local.hero = 'yasmina';
  assert.deepEqual(merge(base, local, copy(base)), local);
  assert.deepEqual(merge(base, copy(base), local), local);
});

check('counters add both sides (pearls earned on one, spent on the other)', () => {
  const local = copy(base), remote = copy(base);
  local.pearls = 30;            // +10 here
  remote.pearls = 5;            // −15 there (bought something)
  local.time = 160; remote.time = 130;
  local.days['2026-10-27'] = 60; remote.days['2026-10-27'] = 30;
  local.topics.t1.plays = 3; remote.topics.t1.plays = 4;
  local.world.farm.coins = 4; remote.world.farm.coins = 15;
  local.world.farm.inv.tomato = 1; remote.world.farm.inv.tomato = 5;
  const m = merge(base, local, remote);
  assert.equal(m.pearls, 15);
  assert.equal(m.time, 190);
  assert.equal(m.days['2026-10-27'], 60, 'a day new on both sides has no base: the higher');
  assert.equal(m.days['2026-10-26'], 100);
  assert.equal(m.topics.t1.plays, 5);
  assert.equal(m.world.farm.coins, 9);
  assert.equal(m.world.farm.inv.tomato, 3);
});

check('counters never go below zero', () => {
  const local = copy(base), remote = copy(base);
  local.pearls = 0; remote.pearls = 0;   // both spent 20
  assert.equal(merge(base, local, remote).pearls, 0);
});

check('other numbers keep the higher; badges the better medal', () => {
  const local = copy(base), remote = copy(base);
  local.topics.t1.stars = 3; remote.topics.t1.stars = 2;
  local.topics.t1.best = 0.7; remote.topics.t1.best = 0.9;
  local.world.farm.quest = 4; remote.world.farm.quest = 3;
  local.badges.arabic = 'silver'; remote.badges.arabic = 'gold';
  const m = merge(base, local, remote);
  assert.equal(m.topics.t1.stars, 3);
  assert.equal(m.topics.t1.best, 0.9);
  assert.equal(m.world.farm.quest, 4);
  assert.equal(m.badges.arabic, 'gold');
});

check('lists keep what either side added, minus what either removed', () => {
  const local = copy(base), remote = copy(base);
  local.owned = ['sail-rose', 'hat-fez']; remote.owned = ['sail-rose', 'flag-gold'];
  local.topics.t1.missed = ['b', 'c'];       // answered a right, missed c
  remote.topics.t1.missed = ['a', 'b', 'd'];
  local.stickers = ['s1', 's2']; remote.stickers = ['s1', 's2'];
  const m = merge(base, local, remote);
  assert.deepEqual([...m.owned].sort(), ['flag-gold', 'hat-fez', 'sail-rose']);
  assert.deepEqual([...m.topics.t1.missed].sort(), ['b', 'c', 'd']);
  assert.deepEqual(m.stickers, ['s1', 's2']);
});

check('missed questions keep the last 30', () => {
  const local = copy(base), remote = copy(base);
  local.topics.t1.missed = Array.from({ length: 30 }, (_, i) => `l${i}`);
  remote.topics.t1.missed = Array.from({ length: 30 }, (_, i) => `r${i}`);
  assert.equal(merge(base, local, remote).topics.t1.missed.length, 30);
});

check('a lesson\'s history keeps both sides\' plays in time order (last 10)', () => {
  const local = copy(base), remote = copy(base);
  local.topics.t1.history.push({ t: 5, pct: 1 });
  remote.topics.t1.history.push({ t: 3, pct: 0.6 }, { t: 4, pct: 0.7 });
  const m = merge(base, local, remote);
  assert.deepEqual(m.topics.t1.history.map(h => h.t), [1, 2, 3, 4, 5]);
  const many = copy(base); many.topics.t1.history = Array.from({ length: 10 }, (_, i) => ({ t: 100 + i, pct: 1 }));
  const other = copy(base); other.topics.t1.history = Array.from({ length: 10 }, (_, i) => ({ t: 200 + i, pct: 1 }));
  assert.deepEqual(merge(base, many, other).topics.t1.history.map(h => h.t), Array.from({ length: 10 }, (_, i) => 200 + i));
});

check('everything else keeps this device\'s: hero, settings, farm plots', () => {
  const local = copy(base), remote = copy(base);
  local.hero = 'yasmina'; remote.hero = 'sindbad2';
  local.muted = true; remote.muted = false; remote.time = 101;  // remote changed something else too
  local.world.farm.plots = [{ run: { crop: 'potato', at: 5 } }, { run: null }];
  remote.world.farm.plots = [{ run: null }, { run: { crop: 'tomato', at: 6 } }];
  const m = merge(base, local, remote);
  assert.equal(m.hero, 'yasmina');
  assert.equal(m.muted, true);
  assert.equal(m.time, 101);
  assert.deepEqual(m.world.farm.plots, local.world.farm.plots);
});

check('fields new on one side are kept; removed on one side stay removed', () => {
  const local = copy(base), remote = copy(base);
  local.topics.t2 = { stars: 2, best: 0.8, plays: 1 };
  remote.world.atlas = { visited: ['syria'] };
  delete local.review.t1;          // removed here, unchanged there
  const m = merge(base, local, remote);
  assert.deepEqual(m.topics.t2, local.topics.t2);
  assert.deepEqual(m.world.atlas, { visited: ['syria'] });
  assert.ok(!('t1' in m.review));
  // Removed here but changed there: the change wins.
  const r2 = copy(base); r2.review.t1.box = 2;
  assert.equal(merge(base, local, r2).review.t1.box, 2);
});

check('no base (never synced): nothing counted twice', () => {
  const local = copy(base), remote = copy(base);
  local.pearls = 30; remote.pearls = 25;
  local.topics.t1.plays = 4;
  const m = merge(null, local, remote);
  assert.equal(m.pearls, 30);
  assert.equal(m.topics.t1.plays, 4);
  assert.deepEqual(merge(null, base, copy(base)), base, 'the same copy on both sides is unchanged');
});

check('merging is the same from either side for counters and maxima', () => {
  const local = copy(base), remote = copy(base);
  local.pearls = 31; remote.pearls = 12; local.topics.t1.stars = 2; remote.topics.t1.stars = 3;
  const a = merge(base, local, remote), b = merge(base, remote, local);
  assert.equal(a.pearls, b.pearls);
  assert.equal(a.topics.t1.stars, b.topics.t1.stars);
});

console.log(`merge: ${n} checks passed`);
