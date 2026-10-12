// «جزيرة العلوم» — the science island: the grade-6 science book, semester 1
// («العلوم»، الصف السادس، الفصل الأول، 2025–2026), played instead of read.
//
// Ten places on a 3D island, one district per unit of the book: the forest
// and the pond (living things), the forces arena, the friction slopes and the
// farm yard (forces and work), the body dome and the skin pavilion (excretion
// and the skin), the builders' ramp, the machines square and the castle on the
// hill (simple machines). Seventeen quests, one per lesson (some lessons share
// a quest), in the book's order.
//
// Every quest teaches before it asks (SPEC: "Taught first"). Step kinds:
//   explore  «أتعلّم»: a picture (`view`, drawn in core/lab/views.js) or cards
//            with glowing `spots`; each tap opens one idea; never scored
//            (core/learn/explore.js)
//   choice   a question: options[0] is right; `pic` shows a picture
//   twoway   the book's «أستنتج»: sentences, each with a blank and two words
//   sort     put each item in its bin: items [text, bin, icon?]
//   order    tap the items in the right order (`items` given in order)
//   match    join each left phrase to its right one (`pairs` in order)
//   tf       true or false, with the fix for the false ones
//   number   type a number (a calculation); `unit` shown after it
//   label    tap the named parts on a picture (`ask`: [spot id, name])
// Every step but explore has a hint (first miss) and an explanation.
//
// The units: life.js, forces.js, body.js, machines.js (worlds/grade6/lab/).
// Draft content, pending review by Syrian educators. CC-BY-SA.

import life from './lab/life.js';
import forces from './lab/forces.js';
import body from './lab/body.js';
import machines from './lab/machines.js';

export const HELPER = {
  name: 'شرارة',
  pitch: 1180,
  hello: 'أهلاً بك في جزيرة العلوم! أنا «شرارة»، روبوت المختبر. 🤖 هنا لا نقرأ العلوم… بل نجرّبها! كل درس يضيء بلّورة في منارة العلوم. اتبع السهم الذهبي إلى الغابة! 💡',
  back: 'عدت يا عالمنا الصغير! 🔬',
};

// One district per unit of the book; `unit` colours the place's base and tag.
export const UNITS = {
  1: { name: 'الأحياء من حولنا', color: '#4fbf5a' },
  2: { name: 'القوى', color: '#f28c3a' },
  3: { name: 'جسمي', color: '#e8537a' },
  4: { name: 'الآلات البسيطة', color: '#3f8fd6' },
};
export const STATIONS = {
  forest: { name: 'غابة الحياة', icon: '🌳', unit: 1 },
  pond: { name: 'بحيرة التوازن', icon: '🦆', unit: 1 },
  arena: { name: 'ساحة القوى', icon: '🧲', unit: 2 },
  slopes: { name: 'منحدرات الاحتكاك', icon: '🛷', unit: 2 },
  yard: { name: 'ساحة العمل', icon: '🐴', unit: 2 },
  body: { name: 'قبّة الجسم', icon: '🫘', unit: 3 },
  skin: { name: 'جناح الجلد', icon: '🖐️', unit: 3 },
  ramp: { name: 'ساحة البنّائين', icon: '📐', unit: 4 },
  machines: { name: 'ميدان الآلات', icon: '⚙️', unit: 4 },
  castle: { name: 'قلعة الحصن', icon: '🏰', unit: 4 },
};

export const QUESTS = [...life, ...forces, ...body, ...machines];

// The quick review of a quest (plugins/science/reviews.js): its plain choice
// steps and its extra `review` questions, in the shape plugins/engines/quiz.js
// expects (answer 0 = the first option).
export function reviewOf(id) {
  const q = QUESTS.find(x => x.id === id);
  const fromSteps = q.steps.filter(s => s.kind === 'choice' && !s.pic);
  return [...fromSteps, ...(q.review || [])].map(({ q: text, options, hint, explain }) => ({ q: text, options, answer: 0, hint, explain }));
}
