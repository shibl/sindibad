// Grade 6 Maths — الحسم والزيادة (percentage discounts and rises), played
// at a market stall: work out the price, then pay it in coins and notes.
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { market } from '../engines/market.js';
import { num } from '../../core/format.js';
import { grid100 } from '../engines/visuals.js';

// "١٥٠ درهماً", "٢٠٠ درهم", "٨ دراهم" — the counted noun follows the number.
const dh = n => { const r = n % 100; return `${num(n)} ${r === 0 || r < 3 ? 'درهم' : r <= 10 ? 'دراهم' : 'درهماً'}`; };

const DISCOUNTS = [
  ['السجّادة', 200, 25], ['الفانوس', 80, 10], ['الإبريق النحاسي', 120, 50], ['الصندوق الخشبي', 240, 25],
  ['صابون الغار', 60, 20], ['الشال', 150, 20], ['كيس التمر', 90, 10], ['المصباح', 400, 15],
  ['المسبحة', 50, 30], ['الصحن المزخرف', 300, 40], ['زجاجة زيت الزيتون', 160, 75], ['السلّة', 250, 20],
];
const RISES = [
  ['كيس البُنّ', 70, 10], ['القنديل', 200, 15], ['علبة الزعتر', 40, 50], ['الحقيبة الجلدية', 120, 25], ['كيس الأرز', 80, 5],
];

export const ITEMS = [
  ...DISCOUNTS.map(([name, p, x]) => {
    const d = (p * x) / 100, pay = p - d;
    return {
      q: `<b>${name}</b>: ${dh(p)}، وحسم اليوم <b>${num(x)}٪</b>. ادفع الثمن بعد الحسم.`,
      target: pay,
      hint: `احسب الحسم أولاً: ${num(x)}٪ من ${num(p)}، ثم اطرحه من السعر.`,
      explain: `الحسم = ${num(p)} × ${num(x)} ÷ ${num(100)} = ${num(d)}، والثمن = ${num(p)} − ${num(d)} = ${num(pay)}.`,
      note: `الحسم ${num(d)}، فالثمن ${num(pay)}.`,
    };
  }),
  ...RISES.map(([name, p, x]) => {
    const d = (p * x) / 100, pay = p + d;
    return {
      q: `<b>${name}</b>: كان ${dh(p)}، ثم ارتفع السعر <b>${num(x)}٪</b>. ادفع السعر الجديد.`,
      target: pay,
      hint: `احسب الزيادة: ${num(x)}٪ من ${num(p)}، ثم أضفها إلى السعر.`,
      explain: `الزيادة = ${num(p)} × ${num(x)} ÷ ${num(100)} = ${num(d)}، والسعر الجديد = ${num(p)} + ${num(d)} = ${num(pay)}.`,
      note: `الزيادة ${num(d)}، فالسعر ${num(pay)}.`,
    };
  }),
];

registerTopic({
  id: 'math-market',
  region: 'math',
  order: 10,
  icon: '🛍️',
  title: 'الحسم والزيادة',
  blurb: 'احسب الثمن وادفعه بالدراهم',
  learn: [
    {
      title: 'الحسم',
      html: `<p>سعر السجّادة ${num(200)} درهم، وعليها حسم ${num(25)}٪:</p>
             <p>الحسم = ${num(200)} × ${num(25)} ÷ ${num(100)} = <b>${num(50)}</b></p>
             <p>الثمن = ${num(200)} − ${num(50)} = <b>${num(150)}</b></p>${grid100(25)}`,
      say: 'الحسم يُطرح من السعر، فتدفع أقلّ!',
    },
    {
      title: 'الزيادة',
      html: `<p>كان سعر البُنّ ${num(70)} درهماً، ثم ارتفع ${num(10)}٪:</p>
             <p>الزيادة = ${num(70)} × ${num(10)} ÷ ${num(100)} = <b>${num(7)}</b></p>
             <p>السعر الجديد = ${num(70)} + ${num(7)} = <b>${num(77)}</b></p>
             <p class="tip">حيلة: حسم ${num(25)}٪ يعني أنك تدفع ${num(75)}٪ من السعر.</p>`,
      say: 'الزيادة تُضاف إلى السعر.',
    },
    {
      title: 'كيف تدفع؟',
      html: `<p>اضغط على النقود لتضعها على الطاولة، واضغط على قطعة فوق الطاولة لتعيدها.</p>
             <p>حين يصير المجموع هو الثمن الصحيح، اضغط <b>«ادفع»</b>.</p>`,
      say: 'لا تدفع درهماً زيادة، ولا درهماً نقصاناً!',
    },
  ],
  render: market({
    items: ITEMS, count: 8,
    intro: 'إلى السوق! احسب، ثم ادفع.',
  }),
});
