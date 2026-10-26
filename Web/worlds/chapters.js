// Made from chapters.ts by tools/build.ts. Edit that file, then run: npm run build
// The voyages (chapters): the meta map above the sea maps. One voyage per
// school grade, grouped by the brief's four age stages (see
// docs/original-project-brief.md, slide 4).
//
// A voyage with `open: true` leads to its sea map (worlds/gradeN.js, wired
// up in app.js). The others stay locked, under the fog, until their world
// exists. Today only voyage 6 (grade 6) is open.
export const STAGES = [
    { id: 'explorer', name: 'الطفل المستكشف', grades: [1, 3], icon: '🏘️', color: '#e8962a' },
    { id: 'sailor', name: 'البحّار الصغير', grades: [4, 6], icon: '🏝️', color: '#2f9e8f' },
    { id: 'captain', name: 'الربّان اليافع', grades: [7, 9], icon: '🧭', color: '#3b6fd8', exam: 'الشهادة الإعدادية' },
    { id: 'admiral', name: 'قائد الأسطول', grades: [10, 12], icon: '🚢', color: '#7a4ac2', exam: 'البكالوريا' },
];
export const CHAPTERS = [
    { grade: 1, name: 'الرحلة الأولى', gradeName: 'الصف الأول' },
    { grade: 2, name: 'الرحلة الثانية', gradeName: 'الصف الثاني' },
    { grade: 3, name: 'الرحلة الثالثة', gradeName: 'الصف الثالث' },
    { grade: 4, name: 'الرحلة الرابعة', gradeName: 'الصف الرابع' },
    { grade: 5, name: 'الرحلة الخامسة', gradeName: 'الصف الخامس' },
    { grade: 6, name: 'الرحلة السادسة', gradeName: 'الصف السادس', open: true },
    { grade: 7, name: 'الرحلة السابعة', gradeName: 'الصف السابع' },
    { grade: 8, name: 'الرحلة الثامنة', gradeName: 'الصف الثامن' },
    { grade: 9, name: 'الرحلة التاسعة', gradeName: 'الصف التاسع' },
    { grade: 10, name: 'الرحلة العاشرة', gradeName: 'الصف العاشر' },
    { grade: 11, name: 'الرحلة الحادية عشرة', gradeName: 'الصف الحادي عشر' },
    { grade: 12, name: 'الرحلة الثانية عشرة', gradeName: 'الصف الثاني عشر' },
];
