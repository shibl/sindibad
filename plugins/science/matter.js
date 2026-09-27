// Grade 6 Science — حالات المادة (states of matter).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { sort } from '../engines/sort.js';

const S = { bin: 's', hint: 'الصلب له شكل ثابت وحجم ثابت، لا يتغيّر شكله بتغيّر الإناء.', explain: 'هذه مادة صلبة: شكلها وحجمها ثابتان.' };
const L = { bin: 'l', hint: 'السائل حجمه ثابت، لكنه يأخذ شكل الإناء الذي يوضع فيه ويسيل.', explain: 'هذه مادة سائلة: حجمها ثابت وشكلها يتبع الإناء.' };
const G = { bin: 'g', hint: 'الغاز ليس له شكل ثابت ولا حجم ثابت، ينتشر ليملأ المكان كله.', explain: 'هذه مادة غازية: تنتشر وتملأ أي حيّز.' };

export const ITEMS = [
  { text: '🧊 الجليد', ...S }, { text: '🪨 الحجر', ...S }, { text: '🪵 الخشب', ...S }, { text: '🔩 الحديد', ...S }, { text: '🧂 الملح', ...S },
  { text: '💧 الماء', ...L }, { text: '🫒 زيت الزيتون', ...L }, { text: '🧃 العصير', ...L }, { text: '🥛 الحليب', ...L }, { text: '🍯 العسل', ...L },
  { text: '♨️ بخار الماء', ...G }, { text: '🌬️ الهواء', ...G }, { text: '🫧 الأكسجين', ...G }, { text: '🎈 غاز البالون', ...G },
];

registerTopic({
  id: 'science-matter',
  region: 'science',
  order: 1,
  icon: '🧪',
  title: 'حالات المادة',
  blurb: 'صلب، سائل، أم غاز؟',
  render: sort({
    items: ITEMS, count: 9,
    prompt: 'ما حالة هذه المادة؟',
    bins: [
      { id: 's', label: 'صلب', icon: '🧱' },
      { id: 'l', label: 'سائل', icon: '💧' },
      { id: 'g', label: 'غاز', icon: '💨' },
    ],
    intro: 'مختبر البركان يحتاج ترتيباً! للمادة ثلاث حالات: <b>صلبة</b> و<b>سائلة</b> و<b>غازية</b>.',
  }),
});
