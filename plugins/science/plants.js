// Grade 6 Science — أجزاء النبات ووظائفها (plant parts and their jobs).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { match } from '../engines/match.js';
import { cards } from '../engines/visuals.js';

export const PAIRS = [
  { a: '🟫 الجذر', b: 'يمتصّ الماء والأملاح من التربة', hint: 'إنه تحت الأرض.' },
  { a: '🌿 الساق', b: 'تحمل النبات وتنقل الماء إلى الأوراق', hint: 'إنها كالعمود الذي يحمل كل شيء.' },
  { a: '🍃 الورقة', b: 'تصنع الغذاء بالتركيب الضوئي', hint: 'تحتاج ضوء الشمس.' },
  { a: '🌸 الزهرة', b: 'عضو التكاثر الذي يكوّن البذور', hint: 'تزورها النحلات.' },
  { a: '🍎 الثمرة', b: 'تحمي البذور وتساعد على نشرها', hint: 'نأكلها كثيراً!' },
  { a: '🌰 البذرة', b: 'تنمو لتصبح نباتاً جديداً', hint: 'نزرعها في التربة.' },
];

registerTopic({
  id: 'science-plants', region: 'science', order: 5, icon: '🌱',
  title: 'أجزاء النبات', blurb: 'لكل جزء عمل',
  learn: [{
    title: 'النبات فريق عمل',
    html: cards(PAIRS.map(p => [p.a.split(' ')[0], p.a.split(' ').slice(1).join(' '), p.b])),
    say: 'الورقة مطبخ النبات: تصنع الغذاء من الماء والهواء وضوء الشمس.',
  }],
  render: match({ pairs: PAIRS, boards: 2, perBoard: 3, headA: 'الجزء', headB: 'وظيفته', intro: 'المزارعة تعلّمك أسرار النبات: صِل كل جزء بوظيفته.' }),
});
