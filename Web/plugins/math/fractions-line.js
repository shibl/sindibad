// Grade 6 Maths — الكسور على خط الأعداد (placing fractions on a number line).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { numberline } from '../engines/numberline.js';
import { frac, num } from '../../core/format.js';
import { fracBar, miniLine } from '../engines/visuals.js';

const F = (n, d) => ({
  value: n / d, label: frac(n, d), min: 0, max: 1, ticks: d,
  labels: [[0, num(0)], [1, num(1)]],
  hint: `قسّم المسافة من ${num(0)} إلى ${num(1)} إلى ${num(d)} أجزاء متساوية (المقام)، ثم عُدّ ${num(n)} منها (البسط).`,
  explain: `${frac(n, d)} تعني ${num(n)} أجزاء من ${num(d)} أجزاء متساوية.`,
});

export const ITEMS = [
  F(1, 2), F(3, 4), F(1, 4), F(2, 5), F(3, 5), F(1, 3), F(2, 3), F(5, 6), F(3, 8), F(5, 8), F(7, 10), F(3, 10),
  // Improper fraction on a longer line.
  { ...F(3, 2), max: 2, ticks: 4, labels: [[0, num(0)], [1, num(1)], [2, num(2)]],
    hint: `${frac(3, 2)} أكبر من الواحد: كل واحد فيه نصفان، فعُدّ ثلاثة أنصاف.` },
  { ...F(5, 4), max: 2, ticks: 8, labels: [[0, num(0)], [1, num(1)], [2, num(2)]],
    hint: `${frac(5, 4)} = واحد و${frac(1, 4)}. تجاوز الواحد بربع.` },
];

registerTopic({
  id: 'math-fractions-line',
  region: 'math',
  order: 1,
  icon: '🧭',
  title: 'الكسور على خط الأعداد',
  blurb: 'أبحِر بالقارب إلى الكسر الصحيح!',
  learn: [
    {
      title: 'ما الكسر؟',
      html: `<p><b>المقام</b> (العدد في الأسفل) = عدد الأجزاء المتساوية.<br><b>البسط</b> (العدد في الأعلى) = عدد الأجزاء التي نأخذها.</p>
             ${fracBar(3, 4)}`,
      say: 'قسّمنا الشريط إلى ٤ أجزاء متساوية ولوّنّا ٣ منها: ثلاثة أرباع.',
    },
    {
      title: 'الكسر على خط الأعداد',
      html: `<p>قسّم المسافة من ${num(0)} إلى ${num(1)} إلى أجزاء بعدد <b>المقام</b>، ثم عُدّ من الصفر بعدد <b>البسط</b>.</p>
             ${miniLine(0.75, 1, 4, frac(3, 4))}`,
      say: 'عُدّ القفزات: واحدة، اثنتان، ثلاث… وصلنا إلى ثلاثة أرباع!',
    },
    {
      title: 'أكبر من الواحد',
      html: `<p>إذا كان البسط أكبر من المقام فالكسر <b>أكبر من ${num(1)}</b>: ${frac(3, 2)} = واحد ونصف.</p>
             ${miniLine(1.5, 2, 4, frac(3, 2))}`,
      say: 'هيّا! أوصل القارب إلى كل كسر أطلبه.',
    },
  ],
  render: numberline({
    items: ITEMS, count: 7,
    intro: 'الكسر يدلّنا على المكان: <b>المقام</b> عدد الأجزاء المتساوية، و<b>البسط</b> عدد ما نأخذه منها.',
  }),
});
