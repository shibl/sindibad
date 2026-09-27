// Grade 6 Maths — النسبة المئوية (percentages).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { quiz } from '../engines/quiz.js';
import { frac, num } from '../../core/format.js';

const OF = [[25, 80], [50, 60], [10, 90], [20, 50], [75, 40], [25, 120], [10, 250], [50, 36], [20, 35], [5, 200], [30, 70], [40, 50]];
const AS = [[1, 2, 50], [1, 4, 25], [3, 4, 75], [1, 5, 20], [1, 10, 10], [2, 5, 40], [3, 10, 30], [4, 5, 80]];

const uniq = (answer, cands) => {
  const out = [answer];
  for (const c of cands) if (c > 0 && Number.isInteger(c) && !out.includes(c) && out.length < 4) out.push(c);
  for (let k = 1; out.length < 4; k++) if (!out.includes(answer + k * 5)) out.push(answer + k * 5);
  return out;
};

export function questions() {
  const a = OF.map(([p, n]) => {
    const ans = (p * n) / 100;
    const opts = uniq(ans, [n - ans, ans * 2, p, ans + 10, n / 2]);
    return {
      q: `كم يساوي <b>${num(p)}٪</b> من <b>${num(n)}</b>؟`,
      options: opts.map(num), answer: 0,
      hint: `${num(p)}٪ تعني ${num(p)} من كل ${num(100)}. اضرب ${num(n)} في ${num(p)} ثم اقسم على ${num(100)}.`,
      explain: `${num(n)} × ${num(p)} ÷ ${num(100)} = ${num(ans)}.`,
    };
  });
  const b = AS.map(([n, d, p]) => {
    const opts = uniq(p, [n * 10, d * 10, 100 - p, p + 5, n + d]);
    return {
      q: `اكتب الكسر ${frac(n, d)} نسبةً مئوية:`,
      options: opts.map(x => `${num(x)}٪`), answer: 0,
      hint: `حوّل الكسر إلى كسر مقامه ${num(100)}: اضرب البسط والمقام في العدد نفسه.`,
      explain: `${frac(n, d)} = ${frac(p, 100)} = ${num(p)}٪.`,
    };
  });
  return [...a, ...b];
}

registerTopic({
  id: 'math-percent',
  region: 'math',
  order: 3,
  icon: '💯',
  title: 'النسبة المئوية',
  blurb: 'كم من كل مئة؟',
  render: quiz({
    questions, count: 8,
    intro: 'التاجر في السوق يسأل عن الحسومات! <b>النسبة المئوية</b> جزء من مئة: ٢٥٪ = ٢٥ من كل ١٠٠.',
  }),
});
