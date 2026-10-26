// Grade 6 Arabic — إنّ وأخواتها (inna and its sisters).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { tapword } from '../engines/tapword.js';

const SENTENCES = [
  ['إنَّ', 'العلمَ', 'نورٌ'], ['كأنَّ', 'القمرَ', 'مصباحٌ'], ['لعلَّ', 'الجوَّ', 'جميلٌ'],
  ['إنَّ', 'الهدهدَ', 'حكيمٌ'], ['إنَّ', 'السفينةَ', 'سريعةٌ'], ['ليتَ', 'الغائبَ', 'حاضرٌ'],
  ['كأنَّ', 'البحرَ', 'مرآةٌ'], ['إنَّ', 'الياسمينَ', 'عطرٌ'], ['لعلَّ', 'الامتحانَ', 'سهلٌ'],
];
const ISM = { ask: 'اسم إنّ', hint: 'اسم إنّ (أو أختها) يأتي بعدها، وهو منصوب بالفتحة — عكس كان!', explain: 'إنّ وأخواتها تنصب الاسم.' };
const KHABAR = { ask: 'خبر إنّ', hint: 'خبر إنّ مرفوع، وعلامته غالباً الضمة أو تنوين الضم (ـٌ).', explain: 'إنّ وأخواتها ترفع الخبر.' };

export const ITEMS = SENTENCES.flatMap(w => [
  { words: w, answer: 1, ...ISM, note: `«${w[1]}» اسم ${w[0]} منصوب.` },
  { words: w, answer: 2, ...KHABAR, note: `«${w[2]}» خبر ${w[0]} مرفوع.` },
]);

registerTopic({
  id: 'arabic-inna', region: 'arabic', order: 5, icon: '🔁',
  title: 'إنّ وأخواتها', blurb: 'تنصب الاسم وترفع الخبر',
  learn: [
    {
      title: 'عكس كان تماماً',
      html: `<p>«العلمُ نورٌ» ← <b>إنَّ العلمَ نورٌ</b></p><p>إنّ <b>تنصب</b> الاسم (العلمَ) و<b>ترفع</b> الخبر (نورٌ).</p><p class="tip">كان: ترفع ثم تنصب • إنّ: تنصب ثم ترفع</p>`,
      say: 'حيلة للحفظ: إنّ تبدأ بالنصب، وكان تبدأ بالرفع.',
    },
    {
      title: 'أخوات إنّ',
      html: `<p class="big">أنّ • كأنّ • لكنّ • ليت • لعلّ</p><p>كأنّ للتشبيه، ولعلّ للرجاء، وليت للتمنّي.</p>`,
      say: 'كأنّ القمرَ مصباحٌ: تشبيه جميل!',
    },
  ],
  render: tapword({ items: ITEMS, count: 8, intro: 'بعد إنّ وأخواتها: الاسم <b>منصوب</b> والخبر <b>مرفوع</b>. اضغط على المطلوب!' }),
});
