// Grade 6 Arabic — الفعل الماضي والمضارع والأمر (verb tenses).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { sort } from '../engines/sort.js';
import { cards } from '../engines/visuals.js';

const P = { bin: 'p', hint: 'الماضي حدث وانتهى، مثل: كتبَ، ذهبَ.', explain: 'فعل ماضٍ: حدث في الزمن الماضي.' };
const N = { bin: 'n', hint: 'المضارع يحدث الآن، ويبدأ بأحد أحرف «أنيت»: أ، ن، ي، ت.', explain: 'فعل مضارع: يبدأ بأحد أحرف «أنيت».' };
const I = { bin: 'i', hint: 'الأمر طلب لفعل شيء: اكتبْ! اذهبْ!', explain: 'فعل أمر: نطلب به القيام بعمل.' };

export const ITEMS = [
  ...['كتبَ', 'ذهبَ', 'قرأَ', 'رسمَ', 'سافرَ', 'لعبَ'].map(text => ({ text, ...P })),
  ...['يكتبُ', 'نذهبُ', 'تقرأُ', 'أرسمُ', 'يسافرُ', 'تلعبُ'].map(text => ({ text, ...N })),
  ...['اكتبْ', 'اذهبْ', 'اقرأْ', 'ارسمْ', 'سافرْ', 'العبْ'].map(text => ({ text, ...I })),
];

registerTopic({
  id: 'arabic-tenses', region: 'arabic', order: 6, icon: '⏳',
  title: 'الماضي والمضارع والأمر', blurb: 'متى حدث الفعل؟',
  learn: [
    {
      title: 'ثلاثة أزمنة',
      html: cards([['⏪', 'الماضي', 'كتبَ — انتهى'], ['▶️', 'المضارع', 'يكتبُ — الآن'], ['📣', 'الأمر', 'اكتبْ — طلب']]),
      say: 'المضارع يبدأ دائماً بأحد أحرف «أنيت»: أكتب، نكتب، يكتب، تكتب.',
    },
  ],
  render: sort({
    items: ITEMS, count: 9, prompt: 'ما زمن هذا الفعل؟',
    bins: [{ id: 'p', label: 'ماضٍ', icon: '⏪' }, { id: 'n', label: 'مضارع', icon: '▶️' }, { id: 'i', label: 'أمر', icon: '📣' }],
    intro: 'ساعي البريد خلط الرسائل! ضع كل فعل في صندوق زمنه.',
  }),
});
