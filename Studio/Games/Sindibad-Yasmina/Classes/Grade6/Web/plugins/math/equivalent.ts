// Grade 6 Maths — الكسور المتكافئة (equivalent fractions; fractions as
// decimals and percentages), played at the noria: fill the bucket to the
// right level when it is split into a different number of parts.
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { fill } from '../engines/fill.js';
import type { FillItem } from '../engines/fill.js';
import { frac, num } from '../../core/format.js';
import { fracBar } from '../engines/visuals.js';

/** A fraction n/d, and the parts the bucket is split into. */
type Rescale = [n: number, d: number, parts: number];
/** A value as it is shown (decimal or percent), the same as a fraction n/d, and the parts. */
type Shown = [shown: number, n: number, d: number, parts: number];

const SCALE_UP: Rescale[] = [[1, 2, 4], [1, 2, 6], [1, 2, 8], [1, 2, 10], [3, 4, 8], [3, 4, 12], [2, 3, 6], [2, 3, 9], [1, 5, 10], [3, 5, 10], [1, 3, 12]];
const SIMPLIFY: Rescale[] = [[4, 8, 2], [6, 9, 3], [8, 10, 5], [9, 12, 4], [6, 8, 4]];
const DECIMALS: Shown[] = [[0.5, 1, 2, 4], [0.25, 1, 4, 4], [0.75, 3, 4, 8], [0.4, 2, 5, 5]];
const PERCENTS: Shown[] = [[75, 3, 4, 4], [40, 2, 5, 5], [20, 1, 5, 10], [50, 1, 2, 6]];

// "مقسوم إلى جزأين / 6 أجزاء / 12 جزءاً" — the counted noun follows the number.
const partsText = (n: number): string => (n === 2 ? 'جزأين' : n <= 10 ? `${num(n)} أجزاء` : `${num(n)} جزءاً`);
const ask = (shown: string, parts: number): string => `املأ الدلو إلى <span class="target">${shown}</span><small class="prompt__sub">الدلو مقسوم إلى ${partsText(parts)}</small>`;

export const ITEMS: FillItem[] = [
  ...SCALE_UP.map(([n, d, parts]) => {
    const k = parts / d;
    return {
      q: ask(frac(n, d), parts), parts, answer: n * k,
      hint: `اضرب البسط والمقام في العدد نفسه حتى يصير المقام ${num(parts)}.`,
      explain: `${frac(n, d)} = ${frac(n * k, parts)} (ضربنا البسط والمقام في ${num(k)}).`,
      note: `${frac(n, d)} = ${frac(n * k, parts)}`,
    };
  }),
  ...SIMPLIFY.map(([n, d, parts]) => {
    const k = d / parts;
    return {
      q: ask(frac(n, d), parts), parts, answer: n / k,
      hint: `اقسم البسط والمقام على العدد نفسه حتى يصير المقام ${num(parts)}.`,
      explain: `${frac(n, d)} = ${frac(n / k, parts)} (قسمنا البسط والمقام على ${num(k)}).`,
      note: `${frac(n, d)} = ${frac(n / k, parts)}`,
    };
  }),
  ...DECIMALS.map(([v, n, d, parts]) => ({
    q: ask(num(v), parts), parts, answer: (n * parts) / d,
    hint: `اكتب العدد العشري كسراً مقامه ${num(10)} أو ${num(100)}، ثم اجعل مقامه ${num(parts)}.`,
    explain: `${num(v)} = ${frac(n, d)}${d === parts ? '' : ` = ${frac((n * parts) / d, parts)}`}.`,
    note: `${num(v)} = ${frac((n * parts) / d, parts)}`,
  })),
  ...PERCENTS.map(([p, n, d, parts]) => ({
    q: ask(`${num(p)}%`, parts), parts, answer: (n * parts) / d,
    hint: `النسبة المئوية كسر مقامه ${num(100)}: ${num(p)}% = ${frac(p, 100)}. اختصره حتى يصير المقام ${num(parts)}.`,
    explain: `${num(p)}% = ${frac(p, 100)} = ${frac((n * parts) / d, parts)}.`,
    note: `${num(p)}% = ${frac((n * parts) / d, parts)}`,
  })),
];

registerTopic({
  id: 'math-equivalent',
  region: 'math',
  order: 11,
  icon: '💧',
  title: 'الكسور المتكافئة',
  blurb: 'املأ دلاء الناعورة بالكسر الصحيح',
  learn: [
    {
      title: 'كسور متكافئة',
      html: `<p>الكسور المتكافئة تدلّ على <b>الكمية نفسها</b>: ${frac(1, 2)} = ${frac(2, 4)} = ${frac(4, 8)}</p>
             ${fracBar(1, 2, '#4fb3e8')}${fracBar(2, 4, '#4fb3e8')}${fracBar(4, 8, '#4fb3e8')}`,
      say: 'انظر: الأشرطة الثلاثة ملوّنة إلى المكان نفسه!',
    },
    {
      title: 'كيف أجد كسراً مكافئاً؟',
      html: `<p><b>اضرب</b> البسط والمقام في العدد نفسه: ${frac(3, 4)} = ${frac(6, 8)} (× ${num(2)})</p>
             <p><b>اقسم</b> البسط والمقام على العدد نفسه: ${frac(6, 9)} = ${frac(2, 3)} (÷ ${num(3)})</p>
             <p class="tip">الضرب والقسمة على العدد نفسه لا يغيّران قيمة الكسر.</p>`,
      say: 'وهكذا تملأ دلواً مقسوماً إلى ثمانية أجزاء بثلاثة أرباع!',
    },
    {
      title: 'عشري ونسبة مئوية',
      html: `<p>${num(0.5)} = ${frac(1, 2)} &nbsp;•&nbsp; ${num(25)}% = ${frac(1, 4)} &nbsp;•&nbsp; ${num(0.75)} = ${num(75)}% = ${frac(3, 4)}</p>
             <p>املأ الدلو بالزرّين ▲ ▼ أو بالضغط على الجزء، ثم اضغط <b>«اسكب»</b>.</p>`,
      say: 'الناعورة تنتظر. املأ الدلاء بدقّة!',
    },
  ],
  render: fill({
    items: ITEMS, count: 8,
    intro: 'الناعورة عطشى! املأ الدلاء.',
  }),
});
