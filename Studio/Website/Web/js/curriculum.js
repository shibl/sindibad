// Product-wide navigation. No grade is the default or a stand-in for the product.
export const grades = [
  { number: 1, ar: 'الصف الأول' },
  { number: 2, ar: 'الصف الثاني' },
  { number: 3, ar: 'الصف الثالث' },
  { number: 4, ar: 'الصف الرابع' },
  { number: 5, ar: 'الصف الخامس' },
  { number: 6, ar: 'الصف السادس' },
  { number: 7, ar: 'الصف السابع' },
  { number: 8, ar: 'الصف الثامن' },
  { number: 9, ar: 'الصف التاسع' },
  { number: 10, ar: 'الصف العاشر' },
  { number: 11, ar: 'الصف الحادي عشر' },
  { number: 12, ar: 'الصف الثاني عشر' },
];

// These are navigation areas, not a claim that every grade has an identical syllabus.
export const areas = [
  { id: 'languages', number: '01', mark: 'Aa', arMark: 'أ', en: 'Languages & literature', ar: 'اللغات والأدب',
    description: { en: 'Reading, writing, language, and expression.', ar: 'القراءة والكتابة واللغة والتعبير.' } },
  { id: 'mathematics', number: '02', mark: 'x²', arMark: 'x²', en: 'Mathematics', ar: 'الرياضيات',
    description: { en: 'Numbers, patterns, geometry, and problem solving.', ar: 'الأعداد والأنماط والهندسة وحلّ المسائل.' } },
  { id: 'sciences', number: '03', mark: '◎', arMark: '◎', en: 'Sciences', ar: 'العلوم',
    description: { en: 'The natural world, explored through observation and experiment.', ar: 'استكشاف العالم الطبيعي بالملاحظة والتجربة.' } },
  { id: 'society', number: '04', mark: '↔', arMark: '↔', en: 'Society & the humanities', ar: 'المجتمع والعلوم الإنسانية',
    description: { en: 'People, places, history, and the world we share.', ar: 'الإنسان والمكان والتاريخ والعالم الذي يجمعنا.' } },
  { id: 'arts', number: '05', mark: '◒', arMark: '◒', en: 'Arts & expression', ar: 'الفنون والتعبير',
    description: { en: 'Creativity, visual thinking, and making ideas your own.', ar: 'الإبداع والتفكير البصري والتعبير عن الأفكار.' } },
];
