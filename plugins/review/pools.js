// Question pools per subject, built from the topics' own content and turned
// into multiple choice. Used by the treasure review and by villagers' riddles
// on the islands (worlds/grade6/*.js). CC-BY-SA.

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
import { ITEMS as KANA } from '../arabic/kana.js';
import { ITEMS as INNA } from '../arabic/inna.js';
import { QUESTIONS as RATIO } from '../math/ratio.js';
import { QUESTIONS as CLIMATE } from '../social/climate.js';
import { PAIRS as CIVS } from '../social/civilizations.js';

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

function mixed() {
  return [
    ...pick(FAEL, 2).map(fromTap), ...pick(MUBTADA, 1).map(fromTap), ...pick(PLURALS, 1).map(fromPlural),
    ...pick(percent(), 1), ...pick(FRACOPS, 1),
    ...pick(MATTER, 1).map(fromMatter), ...pick(BODY, 1), ...pick(PLANETS, 1),
    ...pick(GEO, 1), ...pick(LANDMARKS, 1).map(p => fromLandmark(p, LANDMARKS)),
    ...pick([...KANA, ...INNA], 1).map(fromTap), ...pick(RATIO, 1), ...pick(CLIMATE, 1),
  ];
}


const POOLS = {
  arabic: () => [...FAEL.map(fromTap), ...MUBTADA.map(fromTap), ...PLURALS.map(fromPlural), ...KANA.map(fromTap), ...INNA.map(fromTap)],
  math: () => [...percent(), ...FRACOPS, ...RATIO],
  science: () => [...MATTER.map(fromMatter), ...BODY, ...PLANETS],
  social: () => [...GEO, ...CLIMATE, ...LANDMARKS.map(p => fromLandmark(p, LANDMARKS)),
    ...CIVS.map(p => ({ q: `بماذا اشتهرت ${p.a}؟`, options: [p.b, ...shuffle(CIVS.filter(x => x !== p)).slice(0, 3).map(x => x.b)], answer: 0, hint: p.hint, explain: `${p.a}: ${p.b}.` }))],
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
