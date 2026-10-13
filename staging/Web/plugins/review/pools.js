// Question pools per subject, built from the topics' own content and turned
// into multiple choice. Used by the treasure review and by villagers' riddles
// on the islands (worlds/grade6/*.js). CC-BY-SA.

import { pick } from '../engines/kit.js';
import { ITEMS as FAEL } from '../arabic/fael-mafool.js';
import { ITEMS as MUBTADA } from '../arabic/mubtada-khabar.js';
import { ITEMS as PLURALS } from '../arabic/plurals.js';
import { questions as percent } from '../math/percent.js';
import { QUESTIONS as FRACOPS } from '../math/fraction-ops.js';
import { QUESTS as SCIENCE, reviewOf as scienceReview } from '../../worlds/grade6/lab.js';
import { ITEMS as KANA } from '../arabic/kana.js';
import { ITEMS as INNA } from '../arabic/inna.js';
import { QUESTIONS as RATIO } from '../math/ratio.js';
import { QUESTS as SOCIAL, reviewOf as socialReview } from '../../worlds/grade6/atlas.js';

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
// The science island's quick-review questions (worlds/grade6/lab.js).
const sciencePool = () => SCIENCE.flatMap(q => scienceReview(q.id));
// The atlas island's quick-review questions (worlds/grade6/atlas.js).
const socialPool = () => SOCIAL.flatMap(q => socialReview(q.id));

function mixed() {
  return [
    ...pick(FAEL, 2).map(fromTap), ...pick(MUBTADA, 1).map(fromTap), ...pick(PLURALS, 1).map(fromPlural),
    ...pick(percent(), 1), ...pick(FRACOPS, 1),
    ...pick(sciencePool(), 3),
    ...pick(socialPool(), 2),
    ...pick([...KANA, ...INNA], 1).map(fromTap), ...pick(RATIO, 1),
  ];
}


const POOLS = {
  arabic: () => [...FAEL.map(fromTap), ...MUBTADA.map(fromTap), ...PLURALS.map(fromPlural), ...KANA.map(fromTap), ...INNA.map(fromTap)],
  math: () => [...percent(), ...FRACOPS, ...RATIO],
  science: sciencePool,
  social: socialPool,
};

// One random question from a subject (or from everything).
export function riddle(subject) {
  const list = subject && POOLS[subject] ? POOLS[subject]() : Object.values(POOLS).flatMap(f => f());
  return pick(list, 1)[0];
}

// The treasure island's mixed review: a little of everything.
export { mixed };

// Every question for a subject ('treasure' → the mixed review).
export function pool(subject) {
  if (subject === 'treasure') return [...mixed(), ...mixed()];
  return POOLS[subject] ? POOLS[subject]() : Object.values(POOLS).flatMap(f => f());
}
