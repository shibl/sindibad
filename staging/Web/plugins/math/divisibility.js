// Grade 6 Maths — قابلية القسمة، القاسم المشترك الأكبر، المضاعف المشترك
// الأصغر. Questions are generated fresh each time.
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { quiz } from '../engines/quiz.js';
import { num } from '../../core/format.js';
import { shuffle } from '../engines/kit.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// Three distinct wrong answers near the right one.
function distractors(right, pool) {
  const out = [];
  for (const v of shuffle(pool)) if (v !== right && v > 0 && Number.isInteger(v) && !out.includes(v)) { out.push(v); if (out.length === 3) break; }
  return out;
}

const RULES = {
  2: 'يقبل القسمة على ٢ إذا كان آحاده زوجياً (٠، ٢، ٤، ٦، ٨).',
  3: 'يقبل القسمة على ٣ إذا كان مجموع أرقامه يقبل القسمة على ٣.',
  5: 'يقبل القسمة على ٥ إذا كان آحاده ٠ أو ٥.',
  9: 'يقبل القسمة على ٩ إذا كان مجموع أرقامه يقبل القسمة على ٩.',
};

function divisibleQ() {
  const d = [2, 3, 5, 9][rnd(0, 3)];
  const right = d * rnd(12, 99);
  const wrong = [];
  while (wrong.length < 3) { const v = rnd(100, 900); if (v % d && !wrong.includes(v)) wrong.push(v); }
  return {
    q: `أيّ عدد يقبل القسمة على ${num(d)}؟`,
    options: [num(right), ...wrong.map(num)], answer: 0,
    hint: RULES[d], explain: `${num(right)} = ${num(d)} × ${num(right / d)}.`,
  };
}

function gcdQ() {
  const g = [2, 3, 4, 5, 6, 8][rnd(0, 5)];
  let a, b;
  do { a = g * rnd(2, 9); b = g * rnd(2, 9); } while (a === b || gcd(a, b) !== g);
  return {
    q: `ما القاسم المشترك الأكبر للعددين ${num(a)} و${num(b)}؟`,
    options: [num(g), ...distractors(g, [1, 2, 3, 4, 6, 8, 9, 10, 12, g * 2, Math.min(a, b)]).map(num)], answer: 0,
    hint: 'اكتب قواسم كل عدد، ثم اختر أكبر قاسم يظهر في القائمتين.',
    explain: `${num(g)} يقسم ${num(a)} و${num(b)}، ولا يوجد قاسم مشترك أكبر منه.`,
  };
}

function lcmQ() {
  let a, b;
  do { a = rnd(2, 12); b = rnd(2, 12); } while (a === b || lcm(a, b) > 72);
  const m = lcm(a, b);
  return {
    q: `ما المضاعف المشترك الأصغر للعددين ${num(a)} و${num(b)}؟`,
    options: [num(m), ...distractors(m, [a * b, m * 2, m / 2, a + b, Math.max(a, b), m + a]).map(num)], answer: 0,
    hint: 'عُدّ مضاعفات العدد الأكبر حتى تجد أول مضاعف يقبل القسمة على العدد الآخر.',
    explain: `${num(m)} أصغر عدد يقبل القسمة على ${num(a)} وعلى ${num(b)}.`,
  };
}

function storyQ() {
  // Two lighthouses flash every a and b seconds; when together again?
  let a, b;
  do { a = rnd(3, 10); b = rnd(3, 10); } while (a === b || lcm(a, b) > 60);
  const m = lcm(a, b);
  return {
    q: `منارة تومض كل ${num(a)} ثوانٍ، وأخرى كل ${num(b)} ثوانٍ. ومضتا معاً الآن؛ بعد كم ثانية تومضان معاً مرة أخرى؟`,
    options: [num(m), ...distractors(m, [a * b, m * 2, a + b, Math.max(a, b), m + 1]).map(num)], answer: 0,
    hint: 'هذا سؤال عن المضاعف المشترك الأصغر.',
    explain: `المضاعف المشترك الأصغر لـ${num(a)} و${num(b)} هو ${num(m)}.`,
  };
}

export const questions = () => [
  ...Array.from({ length: 3 }, divisibleQ), ...Array.from({ length: 3 }, gcdQ),
  ...Array.from({ length: 3 }, lcmQ), storyQ(), storyQ(),
];

registerTopic({
  id: 'math-divisibility', region: 'math', order: 8, icon: '🔗',
  title: 'القواسم والمضاعفات', blurb: 'قابلية القسمة، والقاسم والمضاعف المشترك',
  learn: [
    {
      title: 'قواعد قابلية القسمة',
      html: `<p><b>٢</b>: الآحاد زوجي • <b>٥</b>: الآحاد ٠ أو ٥</p><p><b>٣</b> و<b>٩</b>: اجمع الأرقام. ٢٣٤ ← ٢+٣+٤ = ٩ ✔</p>`,
      say: 'قواعد سريعة تغنيك عن القسمة الطويلة.',
    },
    {
      title: 'القاسم والمضاعف المشترك',
      html: `<p>قواسم ١٢: ١، ٢، ٣، ٤، <b>٦</b>، ١٢<br>قواسم ١٨: ١، ٢، ٣، <b>٦</b>، ٩، ١٨<br>القاسم المشترك الأكبر = <b>٦</b></p><p>مضاعفات ٤: ٤، ٨، <b>١٢</b>… ومضاعفات ٦: ٦، <b>١٢</b>… ← المضاعف المشترك الأصغر = <b>١٢</b></p>`,
      say: 'القاسم يقسم العدد، والمضاعف ينتج من ضربه.',
    },
  ],
  render: quiz({ questions, count: 8, intro: 'منارات الجزيرة تومض بإيقاعات مختلفة… القواسم والمضاعفات تكشف سرّها!' }),
});
