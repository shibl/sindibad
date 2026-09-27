// Treasure island — mixed review of the whole grade.
//
// Reuses other topics' question banks, converted to multiple choice, so the
// student revisits everything spaced out over time (SPEC: adaptive review).
// This shows a plugin can build on other plugins' exported content without
// the core knowing anything about it.

import { registerTopic } from '../../core/topics.js';
import { quiz } from '../engines/quiz.js';
import { pick, shuffle } from '../engines/kit.js';
import { ITEMS as FAEL } from '../arabic/fael-mafool.js';
import { ITEMS as MUBTADA } from '../arabic/mubtada-khabar.js';
import { ITEMS as PLURALS } from '../arabic/plurals.js';
import { questions as percent } from '../math/percent.js';
import { QUESTIONS as FRACOPS } from '../math/fraction-ops.js';
import { ITEMS as MATTER } from '../science/matter.js';
import { QUESTIONS as BODY } from '../science/body.js';
import { QUESTIONS as PLANETS } from '../science/planets.js';
import { QUESTIONS as GEO } from '../social/geography.js';
import { PAIRS as LANDMARKS } from '../social/landmarks.js';

const fromTap = it => ({
  q: `في جملة «${it.words.join(' ')}»، ما ${it.ask}؟`,
  options: [it.words[it.answer], ...it.words.filter((_, i) => i !== it.answer)], answer: 0,
  hint: it.hint, explain: it.explain,
});
const PLURAL_NAMES = { m: 'جمع مذكر سالم', f: 'جمع مؤنث سالم', b: 'جمع تكسير' };
const fromPlural = it => ({
  q: `ما نوع الجمع في كلمة «${it.text}»؟`,
  options: [PLURAL_NAMES[it.bin], ...Object.entries(PLURAL_NAMES).filter(([k]) => k !== it.bin).map(([, v]) => v)], answer: 0,
  hint: it.hint, explain: it.explain,
});
const STATES = { s: 'صلبة', l: 'سائلة', g: 'غازية' };
const fromMatter = it => ({
  q: `ما حالة المادة: ${it.text}؟`,
  options: [STATES[it.bin], ...Object.entries(STATES).filter(([k]) => k !== it.bin).map(([, v]) => v)], answer: 0,
  hint: it.hint, explain: it.explain,
});
const fromLandmark = (p, all) => ({
  q: `في أيّ محافظة يقع: ${p.a}؟`,
  options: [p.b, ...shuffle(all.filter(x => x !== p)).slice(0, 3).map(x => x.b)], answer: 0,
  hint: p.hint, explain: `${p.a} في محافظة ${p.b}.`,
});

function questions() {
  return [
    ...pick(FAEL, 2).map(fromTap), ...pick(MUBTADA, 1).map(fromTap), ...pick(PLURALS, 1).map(fromPlural),
    ...pick(percent(), 1), ...pick(FRACOPS, 1),
    ...pick(MATTER, 1).map(fromMatter), ...pick(BODY, 1), ...pick(PLANETS, 1),
    ...pick(GEO, 1), ...pick(LANDMARKS, 1).map(p => fromLandmark(p, LANDMARKS)),
  ];
}

registerTopic({
  id: 'review-treasure',
  region: 'treasure',
  order: 1,
  icon: '💎',
  title: 'قفل الكنز',
  blurb: 'مراجعة من كل الجزر',
  render: quiz({
    questions, count: 10,
    intro: 'قفل الصندوق له عشرة أرقام سرية، وكل رقم سؤال من جزيرة زرتها. تذكّر جيداً!',
  }),
});
