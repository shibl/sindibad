// Sailor ranks, by share of all stars (about one every 7 stars in grade 6).

import { g } from '../art/art.js';

const STEPS = [
  [0, 'بحّار مبتدئ', 'بحّارة مبتدئة'],
  [0.1, 'بحّار متدرّب', 'بحّارة متدرّبة'],
  [0.2, 'بحّار نشيط', 'بحّارة نشيطة'],
  [0.35, 'بحّار شجاع', 'بحّارة شجاعة'],
  [0.5, 'ربّان ماهر', 'ربّانة ماهرة'],
  [0.65, 'ربّان خبير', 'ربّانة خبيرة'],
  [0.8, 'سيّد الأمواج', 'سيّدة الأمواج'],
  [0.95, 'قائد الأسطول الصغير', 'قائدة الأسطول الصغيرة'],
];

// { level, rank, next (name or null), to (stars needed for next), pct }
export function rankInfo(hero, stars, max) {
  const level = STEPS.filter(([k]) => stars >= Math.ceil(k * max)).length - 1;
  const name = i => g(hero, STEPS[i][1], STEPS[i][2]);
  const nextStep = STEPS[level + 1];
  const from = Math.ceil(STEPS[level][0] * max), to = nextStep ? Math.ceil(nextStep[0] * max) : max;
  return {
    level,
    rank: name(level),
    next: nextStep ? name(level + 1) : null,
    to,
    pct: nextStep ? Math.round(((stars - from) / Math.max(1, to - from)) * 100) : 100,
  };
}
