// Grade 6 Arabic — المبتدأ والخبر (subject and predicate of a nominal sentence).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { tapword } from '../engines/tapword.js';

const SENTENCES = [
  ['البحرُ', 'واسعٌ'],
  ['السفينةُ', 'سريعةٌ'],
  ['الشمسُ', 'مشرقةٌ'],
  ['العلمُ', 'نورٌ'],
  ['الهدهدُ', 'حكيمٌ'],
  ['الطالبانِ', 'مجتهدانِ'],
  ['المعلمونَ', 'مخلصونَ'],
  ['دمشقُ', 'جميلةٌ'],
  ['الكتابُ', 'مفيدٌ'],
  ['الياسمينُ', 'عَطِرٌ'],
  ['القلعةُ', 'عاليةٌ'],
];

const MUBTADA = {
  ask: 'المبتدأ',
  hint: 'المبتدأ اسم مرفوع نبدأ به الجملة الاسمية، وهو الذي نتحدث عنه.',
  explain: 'المبتدأ هو الاسم المرفوع الذي تبدأ به الجملة الاسمية ونُخبر عنه.',
};
const KHABAR = {
  ask: 'الخبر',
  hint: 'الخبر هو ما نُخبر به عن المبتدأ فيُتمّ معنى الجملة، وهو مرفوع أيضاً.',
  explain: 'الخبر اسم مرفوع يُتمّ معنى الجملة مع المبتدأ.',
};

// Two-word sentences get a neutral third tile so guessing by position is harder.
export const ITEMS = SENTENCES.flatMap(words => [
  { words, answer: 0, ...MUBTADA, note: `«${words[0]}» مبتدأ مرفوع.` },
  { words, answer: 1, ...KHABAR, note: `«${words[1]}» خبر مرفوع.` },
]);

registerTopic({
  id: 'arabic-mubtada-khabar',
  region: 'arabic',
  order: 2,
  icon: '📜',
  title: 'المبتدأ والخبر',
  blurb: 'الجملة الاسمية: عمّن نتحدث؟ وماذا نقول عنه؟',
  render: tapword({
    items: ITEMS, count: 8,
    intro: 'الجملة الاسمية تبدأ باسم: <b>المبتدأ</b> نتحدث عنه، و<b>الخبر</b> نُخبر به عنه. كلاهما مرفوع.',
  }),
});
