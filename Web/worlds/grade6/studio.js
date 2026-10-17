// «جزيرة الألوان» — the art island: the grade-6 art book («التربية الفنية
// البصرية والجمالية»، الصف السادس، 2025–2026), played instead of read.
// Draft content, pending review by Syrian educators. CC-BY-SA.
// (A placeholder: the island is being built.)

export const HELPER = { name: 'لونة', pitch: 980, hello: '', back: '' };
export const UNITS = {};
export const STATIONS = {};
export const QUESTS = [];

// The quick review of a quest (plugins/art/reviews.js).
export function reviewOf(id) {
  const q = QUESTS.find(x => x.id === id);
  const fromSteps = q.steps.filter(s => s.kind === 'choice' && !s.pic);
  return [...fromSteps, ...(q.review || [])].map(({ q: text, options, hint, explain }) => ({ q: text, options, answer: 0, hint, explain }));
}
