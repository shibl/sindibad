// Grade 6 Maths — الأعداد العشرية (decimals on a number line).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { numberline } from '../engines/numberline.js';
import { num, frac } from '../../core/format.js';
import { fracBar, miniLine } from '../engines/visuals.js';

const D = (v, max = 1) => ({
  value: v, label: `<b>${num(v)}</b>`, min: 0, max, ticks: max * 10,
  labels: Array.from({ length: max + 1 }, (_, k) => [k, num(k)]).concat(max === 1 ? [[0.5, num(0.5)]] : []),
  hint: `كل قفزة صغيرة على الخط تساوي ${num(0.1)} (عُشر). عُدّ الأعشار في ${num(v)}.`,
  explain: `${num(v)} = ${num(Math.round(v * 10))} أعشار.`,
});

export const ITEMS = [
  D(0.3), D(0.7), D(0.2), D(0.9), D(0.6), D(0.1), D(0.4), D(0.8),
  D(1.2, 2), D(1.5, 2), D(1.8, 2), D(0.5, 2), D(1.1, 2),
];

registerTopic({
  id: 'math-decimals',
  region: 'math',
  order: 2,
  icon: '📏',
  title: 'الأعداد العشرية',
  blurb: 'الأعشار على خط الأعداد',
  learn: [
    {
      title: 'الأعشار',
      html: `<p>نقسم الواحد إلى <b>${num(10)}</b> أجزاء متساوية؛ كل جزء = <b>${num(0.1)}</b> (عُشر).</p>
             ${fracBar(3, 10, '#1f9aa0')}
             <p class="tip">${num(0.3)} = ثلاثة أعشار = ${frac(3, 10)}</p>`,
      say: 'الفاصلة العشرية تفصل الآحاد عن الأعشار.',
    },
    {
      title: 'بين ١ و٢',
      html: `<p>${num(1.5)} = واحد وخمسة أعشار = واحد ونصف.</p>
             ${miniLine(1.5, 2, 20, num(1.5))}`,
      say: 'كل قفزة صغيرة عُشر. عشر قفزات تساوي واحداً كاملاً.',
    },
  ],
  render: numberline({
    items: ITEMS, count: 7,
    intro: `العدد العشري يعدّ الأعشار: ${num(0.3)} تعني ثلاثة أعشار. أبحِر إلى كل عدد!`,
  }),
});
