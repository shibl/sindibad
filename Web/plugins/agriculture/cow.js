// Grade 6 Agriculture — raising cows (book: «مزرعتي الصغيرة»).
// Quick review for the farm island's quest (worlds/grade6/farm.js): sort
// each feed into its kind, as in the balanced meal the child served.
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { sort } from '../engines/sort.js';

export const ITEMS = [
  { text: '🌾 شعير', bin: 'strong', hint: 'حبوب غنية بالطاقة.' },
  { text: '🌽 ذرة صفراء', bin: 'strong', hint: 'حبوب غنية بالطاقة.' },
  { text: '🟫 كُسبة', bin: 'strong', hint: 'ما يبقى بعد عصر الزيت من البذور.' },
  { text: '🟨 تبن', bin: 'rough', hint: 'سيقان جافة تملأ المعدة.' },
  { text: '🌿 دريس', bin: 'rough', hint: 'نبات أخضر جفّفناه.' },
  { text: '🫙 سيلاج', bin: 'rough', hint: 'علف أخضر مخمّر نحفظه في حفرة.' },
  { text: '☘️ برسيم', bin: 'green', hint: 'نبات طازج من الحقل.' },
  { text: '🍀 فِصّة', bin: 'green', hint: 'نبات طازج من الحقل.' },
];

registerTopic({
  id: 'farm-cow', region: 'farm', order: 3, icon: '🐄',
  title: 'شاميّة تحتاج إلى رعاية', blurb: 'الوجبة المتوازنة للبقرة',
  render: sort({
    bins: [{ id: 'strong', label: 'علف مركّز', icon: '🌾' }, { id: 'rough', label: 'علف خشن', icon: '🟨' }, { id: 'green', label: 'علف أخضر', icon: '☘️' }],
    items: ITEMS, count: 8,
    prompt: 'من أيّ نوع هذا العلف؟',
    intro: 'الوجبة المتوازنة فيها الأنواع الثلاثة. لنفرز الأعلاف!',
  }),
});
