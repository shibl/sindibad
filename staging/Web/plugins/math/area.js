// Grade 6 Maths — المساحة والمحيط (area and perimeter).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { registerTopic } from '../../core/topics.js';
import { quiz } from '../engines/quiz.js';
import { num } from '../../core/format.js';

function shape(w, h, kind = 'rect') {
  const S = 14, W = w * S, H = h * S;
  if (kind === 'tri') {
    return `<svg class="shape-fig" viewBox="-30 -20 ${W + 60} ${H + 50}" dir="ltr"><path d="M0 ${H} H${W} L${W * 0.35} 0Z" fill="#bfe9f5" stroke="#3b2414" stroke-width="3"/>
      <path d="M${W * 0.35} 0 V${H}" stroke="#d0507e" stroke-width="2.5" stroke-dasharray="5 4"/>
      <text x="${W / 2}" y="${H + 24}" class="fig-t">${num(w)} سم</text><text x="${W * 0.35 + 8}" y="${H / 2}" class="fig-t" text-anchor="start">${num(h)} سم</text></svg>`;
  }
  return `<svg class="shape-fig" viewBox="-40 -24 ${W + 80} ${H + 54}" dir="ltr"><rect width="${W}" height="${H}" fill="#fff3c4" stroke="#3b2414" stroke-width="3"/>
    <text x="${W / 2}" y="-8" class="fig-t">${num(w)} سم</text><text x="-14" y="${H / 2 + 5}" class="fig-t" text-anchor="end">${num(h)} سم</text></svg>`;
}

const AREA = 'مساحة المستطيل = الطول × العرض، وتُقاس بالسنتيمتر المربع (سم²).';
const PER = 'المحيط = مجموع أطوال الأضلاع = (الطول + العرض) × ٢، ويُقاس بالسنتيمتر (سم).';
const u = n => `${num(n)} سم²`, c = n => `${num(n)} سم`;

const rects = [[6, 4], [5, 5], [8, 3], [7, 7], [10, 2], [9, 4]];
export const QUESTIONS = [
  ...rects.map(([w, h]) => ({
    q: `${shape(w, h)}ما <b>مساحة</b> هذا ${w === h ? 'المربع' : 'المستطيل'}؟`,
    options: [u(w * h), u(2 * (w + h)), u(w + h), u(w * h * 2)], answer: 0, hint: AREA, explain: `${num(w)} × ${num(h)} = ${num(w * h)} سم².`,
  })),
  ...rects.map(([w, h]) => ({
    q: `${shape(w, h)}ما <b>محيط</b> هذا ${w === h ? 'المربع' : 'المستطيل'}؟`,
    options: [c(2 * (w + h)), c(w * h), c(w + h), c(4 * w)].filter((v, i, a) => a.indexOf(v) === i).concat([c(2 * (w + h) + 2)]).slice(0, 4), answer: 0,
    hint: PER, explain: `(${num(w)} + ${num(h)}) × ${num(2)} = ${num(2 * (w + h))} سم.`,
  })),
  ...[[6, 4], [8, 5], [10, 3]].map(([b, h]) => ({
    q: `${shape(b, h, 'tri')}ما <b>مساحة</b> هذا المثلث؟`,
    options: [u((b * h) / 2), u(b * h), u(b + h), u(2 * (b + h))], answer: 0,
    hint: 'مساحة المثلث = (القاعدة × الارتفاع) ÷ ٢ — نصف مساحة المستطيل.', explain: `(${num(b)} × ${num(h)}) ÷ ${num(2)} = ${num((b * h) / 2)} سم².`,
  })),
];

registerTopic({
  id: 'math-area', region: 'math', order: 7, icon: '📐',
  title: 'المساحة والمحيط', blurb: 'كم بلاطة؟ وكم سياجاً؟',
  learn: [
    {
      title: 'المساحة والمحيط',
      html: `${shape(6, 4)}<p><b>المساحة</b>: كم مربعاً يغطي الشكل؟ ${num(6)} × ${num(4)} = <b>${u(24)}</b></p><p><b>المحيط</b>: طول السياج حوله: (${num(6)} + ${num(4)}) × ${num(2)} = <b>${c(20)}</b></p>`,
      say: 'المساحة للداخل (البلاط)، والمحيط للحدود (السياج).',
    },
    { title: 'مساحة المثلث', html: `${shape(6, 4, 'tri')}<p>المثلث نصف مستطيل: (${num(6)} × ${num(4)}) ÷ ${num(2)} = <b>${u(12)}</b></p>`, say: 'لا تنسَ القسمة على اثنين في المثلث!' },
  ],
  render: quiz({ questions: QUESTIONS, count: 8, intro: 'المهندسة رهف تبني بيتاً جديداً. ساعدها في حساب المساحات والمحيطات!' }),
});
