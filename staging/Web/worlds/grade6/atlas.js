// Made from atlas.ts by tools/build.ts. Edit that file, then run: npm run build
// «جزيرة الأطلس» — the atlas island: the grade-6 social studies book
// («الدراسات الاجتماعية»، الصف السادس، 2025–2026), played instead of read,
// with a globe of the whole world (core/atlas/globe.js, worlds/atlas/).
//
// Thirteen places on a 3D island, one district per unit of the book. Every
// quest teaches first («أتعلّم»: maps of the Arab homeland in Africa to
// explore, timelines, cards) and then asks, in the book's own formats.
// Step kinds: as on the science island (see worlds/grade6/lab.js); the maps
// and the timeline are drawn by core/atlas/views.js (view 'map' with an
// `area`, view 'timeline' with `events`).
//
// The units: worlds/grade6/atlas/unit1.js … unit5.js.
// Draft content, pending review by Syrian educators. CC-BY-SA.
import unit1 from './atlas/unit1.js';
import unit2 from './atlas/unit2.js';
import unit3 from './atlas/unit3.js';
import unit4 from './atlas/unit4.js';
import unit5 from './atlas/unit5.js';
export const HELPER = {
    name: 'سهيل',
    pitch: 1050,
    hello: 'أهلاً بك في جزيرة الأطلس! أنا «سهيل»، نجمة كان الرحّالة العرب يهتدون بها. ⭐ معاً نرحل في وطننا العربي في أفريقيا، من النيل إلى الأندلس. وفي المرصد كرة أرضية فيها كل دول العالم! 🌍 اتبع السهم الذهبي.',
    back: 'عدت أيها الرحّالة! 🧭',
};
export const UNITS = {
    1: { name: 'الحضارة العربية في أفريقيا', color: '#e0a93a' },
    2: { name: 'وادي النيل والقرن الأفريقي', color: '#2fb3a8' },
    3: { name: 'الأسرة والمؤسّسات', color: '#e8537a' },
    4: { name: 'إقليم ليبيا', color: '#f28c3a' },
    5: { name: 'المغرب العربي والأندلس', color: '#3f8fd6' },
};
export const STATIONS = {
    atlas: { name: 'مرصد الأطلس', icon: '🌍', unit: 1, action: 'افتح الأطلس 🌍' },
    pyramids: { name: 'مصر القديمة', icon: '🔺', unit: 1 },
    carthage: { name: 'ميناء قرطاجة', icon: '⛵', unit: 1 },
    state: { name: 'قصر الدولة', icon: '🏛️', unit: 1 },
    nile: { name: 'وادي النيل', icon: '🌊', unit: 2 },
    fustat: { name: 'الفسطاط', icon: '🕌', unit: 2 },
    horn: { name: 'القرن الأفريقي', icon: '🐪', unit: 2 },
    home: { name: 'بيت الأسرة', icon: '🏠', unit: 3 },
    town: { name: 'ساحة المؤسّسات', icon: '🏫', unit: 3 },
    libya: { name: 'واحة ليبيا', icon: '🌴', unit: 4 },
    heroes: { name: 'حديقة الأبطال', icon: '🗿', unit: 4 },
    maghreb: { name: 'جبال الأطلس', icon: '⛰️', unit: 5 },
    andalus: { name: 'قصر الأندلس', icon: '🏰', unit: 5 },
};
export const QUESTS = [...unit1, ...unit2, ...unit3, ...unit4, ...unit5];
// The quick review of a quest (plugins/social/reviews.js).
export function reviewOf(id) {
    const q = QUESTS.find(x => x.id === id);
    if (!q)
        throw new Error(`reviewOf: no quest "${id}"`);
    const fromSteps = q.steps.filter((s) => s.kind === 'choice' && !s.pic);
    return [...fromSteps, ...(q.review || [])].map(({ q: text, options, hint, explain }) => ({ q: text, options, answer: 0, hint, explain }));
}
