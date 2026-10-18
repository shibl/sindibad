// «جزيرة Hello» — the English island: the grade-6 English book (Pupil's
// Book 103 pages and Activity Book 92 pages, 2025–2026), played instead of
// read (core/english/).
//
// One quest per unit, in the book's order (twenty units), and the book's four
// revisions as review quests after units 5, 10, 15 and 20: twenty-four
// quests. Each uses the book's vocabulary, grammar tables, characters,
// sentences and exercises. Instructions are in simple Arabic; the content is
// English. Every quest teaches first («أتعلّم»): the unit's words (tap a card
// to hear the word and see it in a sentence from the book), then the
// grammar rule (the book's table, with its examples); then it asks.
//
// The quests: worlds/grade6/english/block1.js … block4.js (units 1–5 and
// Revision 1, 6–10 and Revision 2, 11–15 and Revision 3, 16–20 and
// Revision 4). `en()` (english/kit.js) marks English inside Arabic text.
//
// Step kinds
//   explore   «أتعلّم» (core/learn/explore.js), in three shapes:
//               words: [[english, arabic, picture, example sentence], …]
//                 picture: an emoji, 'art:<name>' (core/english/views.js) or
//                 'p:<who>,<looks…>' (a drawn person, e.g. 'p:girl,tall,slim,long,straight,blond')
//               rule: { table?: [[head…], [cells…], …], rows: [[english sentence (<b> on the rule), arabic], …] }
//               read: { title?, text: 'passage with [glossary words]', gloss: { word: arabic } }
//             (a `view` may draw the words as a picture: 'planets')
//   the shared questions (core/learn/steps.js): choice, twoway, sort, order,
//             match, tf, number, label (views 'whale', 'plant', 'planets')
//   the island's own games (core/english/games.js):
//     listen    hear a word or a sentence (read it when the phone has no
//               voice), tap its picture: items [[english, picture], …], ask?, opts?
//     picture   mode 'pic' (a word → its picture) or 'word' (a picture → its word): items, ask?, opts?
//     build     tap word tiles to build the book's sentence, left to right:
//               items [{ en, tiles?, ar? }] (tiles join with spaces into en)
//     spell     tap letters to spell a word: items [{ en, pic?, show?, ar? }], extra?
//     verb      the right form in the gap: lines [[sentence with ___ (and *clue*), base | null, right, [wrong…]]]
//     memory    flip cards to pair them: pairs [[english, picture | english | arabic], …]
//     odd       the odd one out: rows [[[words…], odd word, why (arabic)]]
//     rank      tap in order (the planets by distance…): items [{ en, pic?, ar? }], ends [first, last]
//     adjorder  adjectives in the book's order (opinion, size, shape, age, colour):
//               items [{ before, adjs (in order), noun, ar? }]
//     chat      a conversation from the book; the child picks the right line:
//               who { A: [name, face], B: [name, face] }, lines [[A|B, text | [right, wrong…]], …]
//
// Draft content, pending review by Syrian educators. CC-BY-SA.

import block1 from './english/block1.js';
import block2 from './english/block2.js';
import block3 from './english/block3.js';
import block4 from './english/block4.js';

export const HELPER = {
  name: 'بولي',
  pitch: 1150,
  hello: '<bdi class="en" dir="ltr" lang="en">Hello! Welcome to Hello Island!</bdi> 👋 أنا <b>بولي</b>، ببغاء يحبّ الكلام بالإنكليزية! 🦜 في هذه البلدة نلعب كتاب اللغة الإنكليزية وحدةً وحدة: نسافر ونمثّل ونغوص ونطبخ ونزور الكواكب. اتبع السهم الذهبي!',
  back: '<bdi class="en" dir="ltr" lang="en">Welcome back!</bdi> أهلاً بعودتك! 🦜',
};

// The book's four parts: units 1–5, 6–10, 11–15 and 16–20, each closed by
// a revision.
export const BLOCKS = {
  1: { name: 'Units 1–5', color: '#2f6fd0' },
  2: { name: 'Units 6–10', color: '#23a26a' },
  3: { name: 'Units 11–15', color: '#e0782f' },
  4: { name: 'Units 16–20', color: '#8a55d0' },
};
const B = n => BLOCKS[Math.ceil(n / 5)].color;
const U = (n, en, ar) => [n, { name: `${ar} · <bdi class="en" dir="ltr" lang="en">${en}</bdi>`, en, ar, color: B(n) }];
// The twenty units of the book, each in its part's colour.
export const UNITS = Object.fromEntries([
  U(1, 'My country', 'بلدي'), U(2, 'At the theatre', 'في المسرح'), U(3, 'The Big Blue', 'الأزرق الكبير'),
  U(4, 'Arts', 'الفنون'), U(5, "What's on TV", 'ماذا في التلفاز؟'),
  U(6, 'At the hospital', 'في المستشفى'), U(7, 'Free time', 'وقت الفراغ'), U(8, 'Appearance', 'المظهر'),
  U(9, 'Farming', 'الزراعة'), U(10, 'Recycling and Reusing', 'إعادة التدوير والاستعمال'),
  U(11, 'Tasty Food', 'طعام لذيذ'), U(12, 'Shopping World', 'عالم التسوّق'), U(13, 'Feelings', 'المشاعر'),
  U(14, 'Natural Resources', 'الموارد الطبيعية'), U(15, 'I know my rights', 'أعرف حقوقي'),
  U(16, 'Parties', 'الحفلات'), U(17, 'Maths', 'الرياضيات'), U(18, 'Technology', 'التكنولوجيا'),
  U(19, 'Holidays', 'العطلات'), U(20, 'The Solar System', 'المجموعة الشمسية'),
]);

// Twelve places in the book's order; `unit` is the first unit played there.
export const STATIONS = {
  harbour: { name: 'ميناء البلدان', icon: '🚢', unit: 1 },
  theatre: { name: 'مسرح بصرى', icon: '🎭', unit: 2 },
  aquarium: { name: 'الأزرق الكبير', icon: '🐋', unit: 3 },
  arts: { name: 'بيت الفنون والتلفاز', icon: '🎨', unit: 4 },
  hospital: { name: 'المستشفى', icon: '🏥', unit: 6 },
  park: { name: 'الحديقة العامّة', icon: '🚲', unit: 7 },
  farm: { name: 'مزرعة الجدّ', icon: '🚜', unit: 9 },
  souq: { name: 'سوق الأحد', icon: '🛍️', unit: 11 },
  garden: { name: 'حديقة المشاعر والنهر', icon: '🌳', unit: 13 },
  school: { name: 'المدرسة', icon: '🏫', unit: 15 },
  square: { name: 'ساحة الساعة', icon: '🕰️', unit: 16 },
  space: { name: 'تلّة النجوم', icon: '🔭', unit: 18 },
};

export const QUESTS = [...block1, ...block2, ...block3, ...block4];

// English options read left to right in the quick reviews, too.
const LATIN = /[A-Za-z]/g, ARABIC = /[؀-ۿ]/g;
const mostlyEnglish = t => { const s = String(t).replace(/<[^>]*>/g, ''); const l = (s.match(LATIN) || []).length; return l > 0 && l >= (s.match(ARABIC) || []).length * 2; };
const ltrOpt = o => (mostlyEnglish(o) && !/^<bdi/.test(o) ? `<bdi class="en" dir="ltr" lang="en">${o}</bdi>` : o);

// The quick review of a quest (plugins/english/reviews.js).
export function reviewOf(id) {
  const q = QUESTS.find(x => x.id === id);
  const fromSteps = q.steps.filter(s => s.kind === 'choice' && !s.pic);
  return [...fromSteps, ...(q.review || [])].map(({ q: text, options, hint, explain }) => ({ q: text, options: options.map(ltrOpt), answer: 0, hint, explain }));
}

// Every word of the island, in the order the book teaches them: [quest, word…].
export function wordsOf(quest) {
  return quest.steps.filter(s => s.words).flatMap(s => s.words);
}
