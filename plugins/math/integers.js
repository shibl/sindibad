// Grade 6 Maths — الأعداد الصحيحة (integers: negatives on the number line).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { numberline } from '../engines/numberline.js';
import { miniLine } from '../engines/visuals.js';
import { num } from '../../core/format.js';

const I = v => ({
  value: v, label: `<b dir="ltr">${num(v)}</b>`, min: -5, max: 5, ticks: 10,
  labels: [[-5, num(-5)], [0, num(0)], [5, num(5)]],
  hint: v < 0 ? `العدد السالب يقع يسار الصفر. عُدّ ${num(-v)} قفزات إلى اليسار.` : `العدد الموجب يقع يمين الصفر. عُدّ ${num(v)} قفزات إلى اليمين.`,
  explain: `${num(v)} يبعد عن الصفر ${num(Math.abs(v))} ${v < 0 ? 'إلى اليسار' : 'إلى اليمين'}.`,
});

export const ITEMS = [-4, -3, -2, -1, 1, 2, 3, 4, -5, 5, 0].map(I);

registerTopic({
  id: 'math-integers', region: 'math', order: 5, icon: '🤿',
  title: 'الأعداد الصحيحة', blurb: 'فوق الصفر وتحته',
  learn: [
    {
      title: 'الأعداد السالبة',
      html: `<p>الغوّاص تحت سطح البحر بـ٣ أمتار: موقعه <b dir="ltr">${num(-3)}</b>. الصفر هو سطح الماء.</p>${miniLine(0, 1, 2, '٠ = سطح البحر')}
             <p class="tip">الأعداد السالبة يسار الصفر، والموجبة يمينه. كلما اتجهنا يساراً صغر العدد: <span dir="ltr">${num(-4)} < ${num(-1)}</span></p>`,
      say: 'درجات الحرارة تحت الصفر في الشتاء أعداد سالبة أيضاً!',
    },
  ],
  render: numberline({ items: ITEMS, count: 7, intro: 'الغوّاص ينزل ويصعد! أوصِل القارب إلى كل عدد صحيح.' }),
});
