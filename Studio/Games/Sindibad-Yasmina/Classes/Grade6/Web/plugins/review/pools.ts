// Question pools per subject, built from the topics' own content and turned
// into multiple choice. Used by the treasure review and by villagers' riddles
// on the islands (worlds/grade6/*.js). CC-BY-SA.

import { pick } from '../engines/kit.js';
import type { QuizQuestion } from '../engines/quiz.js';
import type { TapwordItem } from '../engines/tapword.js';
import type { SortItem } from '../engines/sort.js';
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
import { QUESTS as ART, reviewOf as artReview } from '../../worlds/grade6/studio.js';
import { QUESTS as ENGLISH, reviewOf as englishReview } from '../../worlds/grade6/english.js';

const fromTap = (it: TapwordItem): QuizQuestion => ({
  curriculum: 'arabic',
  q: `في جملة «${it.words.join(' ')}»، ما ${it.ask}؟`,
  options: [it.words[it.answer], ...it.words.filter((_, i) => i !== it.answer)], answer: 0,
  hint: it.hint, explain: it.explain,
});
// The plural baskets of plugins/arabic/plurals.js, by id.
const PLURAL_NAMES: Record<string, string> = { m: 'جمع مذكر سالم', f: 'جمع مؤنث سالم', b: 'جمع تكسير' };
const fromPlural = (it: SortItem): QuizQuestion => ({
  curriculum: 'arabic',
  q: `ما نوع الجمع في كلمة «${it.text}»؟`,
  options: [PLURAL_NAMES[it.bin], ...Object.entries(PLURAL_NAMES).filter(([k]) => k !== it.bin).map(([, v]) => v)], answer: 0,
  hint: it.hint, explain: it.explain,
});
// The science island's quick-review questions (worlds/grade6/lab.js).
const sciencePool = (): QuizQuestion[] => SCIENCE.flatMap(q => scienceReview(q.id));
// The atlas island's quick-review questions (worlds/grade6/atlas.js).
const socialPool = (): QuizQuestion[] => SOCIAL.flatMap(q => socialReview(q.id));
// The art island's and the English island's (worlds/grade6/studio.js, english.js).
const artPool = (): QuizQuestion[] => ART.flatMap(q => artReview(q.id));
const englishPool = (): QuizQuestion[] => ENGLISH.flatMap(q => englishReview(q.id));

function mixed(): QuizQuestion[] {
  return [
    ...pick(FAEL, 2).map(fromTap), ...pick(MUBTADA, 1).map(fromTap), ...pick(PLURALS, 1).map(fromPlural),
    ...pick(percent(), 1), ...pick(FRACOPS, 1),
    ...pick(sciencePool(), 3),
    ...pick(socialPool(), 2),
    ...pick(englishPool(), 2), ...pick(artPool(), 1),
    ...pick([...KANA, ...INNA], 1).map(fromTap), ...pick(RATIO, 1),
  ];
}

type Subject = 'arabic' | 'math' | 'science' | 'social' | 'art' | 'english';
const POOLS: Record<Subject, () => QuizQuestion[]> = {
  arabic: () => [...FAEL.map(fromTap), ...MUBTADA.map(fromTap), ...PLURALS.map(fromPlural), ...KANA.map(fromTap), ...INNA.map(fromTap)],
  math: () => [...percent(), ...FRACOPS, ...RATIO],
  science: sciencePool,
  social: socialPool,
  art: artPool,
  english: englishPool,
};

// (Not Object.hasOwn: older Safari on the iPads the game runs on lacks it.)
const isSubject = (s: string): s is Subject => Object.prototype.hasOwnProperty.call(POOLS, s);
const everything = (): QuizQuestion[] => Object.values(POOLS).flatMap(f => f());

// One random question from a subject (or from everything).
export function riddle(subject?: string): QuizQuestion {
  const list = subject && isSubject(subject) ? POOLS[subject]() : everything();
  return pick(list, 1)[0];
}

// The treasure island's mixed review: a little of everything.
export { mixed };

// Every question for a subject ('treasure' → the mixed review).
export function pool(subject: string): QuizQuestion[] {
  if (subject === 'treasure') return [...mixed(), ...mixed()];
  return isSubject(subject) ? POOLS[subject]() : everything();
}
