// Made from studio.ts by tools/build.ts. Edit that file, then run: npm run build
// «جزيرة الألوان» — the art island: the grade-6 art book («التربية الفنية
// البصرية والجمالية»، الصف السادس، 2025–2026), played instead of read.
//
// Fifteen places on a 3D island (core/studio/), visited in the book's order,
// and one quest per lesson of the book: twenty-five quests. Every quest
// teaches first («أتعلّم»: the book's paintings and words to discover) and
// then plays the lesson's «أحاول» with the fingers: mixing paints, colouring,
// perspective, folding paper, collage, rhythms of lines, symmetry, clay…
//
// Step kinds: 'explore' (core/learn/explore.js), the shared questions
// (core/learn/steps.js: choice, twoway, sort, order, match, tf, number,
// label) and the island's own games (core/studio/games.js: mix, paint,
// vanish, fold, collage, pattern, mirror, gallery, press, craft). The
// pictures: core/studio/views-1.js … views-3.js; the little paintings:
// core/studio/art.js.
//
// The lessons: worlds/grade6/studio/part1.js (lessons 1–8), part2.js
// (9–16), part3.js (17–25).
// Draft content, pending review by Syrian educators. CC-BY-SA.
import part1 from './studio/part1.js';
import part2 from './studio/part2.js';
import part3 from './studio/part3.js';
export const HELPER = {
    name: 'ريشة',
    pitch: 980,
    hello: 'أهلاً بك في جزيرة الألوان! أنا «ريشة»، فرشاة رسم صغيرة تحبّ الألوان. 🖌️ في كل مكان هنا درس من كتاب التربية الفنية: نتأمّل لوحات الفنّانين، ثم نرسم ونلوّن ونطوي ونلصق بأصابعنا. وكل درس تُنهيه يعلّق لوحة في رواق اللوحات! اتبع السهم الذهبي. ✨',
    back: 'عدت أيها الفنّان! 🎨',
};
// The book has no units: each lesson carries a theme («الحركة البصريّة»،
// «مبدعٌ من وطني»، «أفكّر وأبتكر»…). The island gathers them in five.
export const UNITS = {
    1: { name: 'الحركة البصريّة والمنظور', color: '#e8453c' },
    2: { name: 'فنّانون من وطني ومن العالم', color: '#3f8fd6' },
    3: { name: 'الفنّ والتراث وثقافات الشعوب', color: '#e0a93a' },
    4: { name: 'أفكّر وأبتكر', color: '#2fb3a8' },
    5: { name: 'فنّ وابتكار في حياتنا', color: '#8a63c9' },
};
// In the book's order: the lessons of each place follow one another.
export const STATIONS = {
    circles: { name: 'ساحة الدوائر', icon: '🎯', unit: 1 }, // lessons 1, 2
    fatna: { name: 'بيت فاطنة', icon: '🫖', unit: 2 }, // 3
    street: { name: 'شارع المنظور', icon: '🛣️', unit: 1 }, // 4
    braque: { name: 'مرسم براك', icon: '🍋', unit: 2 }, // 5
    palmyra: { name: 'تدمر', icon: '🏛️', unit: 3 }, // 6, 7
    africa: { name: 'القرية الإفريقيّة', icon: '🛖', unit: 3 }, // 8
    orontes: { name: 'نواعير العاصي', icon: '🎡', unit: 2 }, // 9, 10
    cardboard: { name: 'ورشة الكرتون', icon: '📦', unit: 4 }, // 11
    portrait: { name: 'مرسم الواقعيّة', icon: '🫧', unit: 2 }, // 12
    mandala: { name: 'حديقة الماندالا', icon: '🪷', unit: 3 }, // 13
    damascus: { name: 'البيت الدمشقيّ', icon: '🕌', unit: 2 }, // 14
    ideas: { name: 'بيت الأفكار', icon: '🦋', unit: 4 }, // 15, 16, 17
    lines: { name: 'جدار الخطوط', icon: '〰️', unit: 4 }, // 18, 19
    market: { name: 'سوق الحِرَف', icon: '🪚', unit: 5 }, // 20, 21, 22, 23
    expo: { name: 'معرض الفنّانين', icon: '🖼️', unit: 2 }, // 24, 25
};
export const QUESTS = [...part1, ...part2, ...part3];
// The quick review of a quest (plugins/art/reviews.js).
export function reviewOf(id) {
    const q = QUESTS.find(x => x.id === id);
    if (!q)
        throw new Error(`reviewOf: no quest "${id}"`);
    const fromSteps = q.steps.filter((s) => s.kind === 'choice' && !s.pic);
    return [...fromSteps, ...(q.review || [])].map(({ q: text, options, hint, explain }) => ({ q: text, options, answer: 0, hint, explain }));
}
