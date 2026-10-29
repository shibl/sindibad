// The grade-6 world: "بحر الصف السادس".
//
// This is content, not engine code: it names the islands (one per subject),
// where they sit on the map, and how the fog lifts. Topic plugins attach
// themselves to an island by its `id` (see plugins/README.md).
//
// pos: [x%, y%] on a portrait map (home port at the bottom, the treasure at
// the top). On landscape screens the map turns so the route runs right→left.
//
// badge: earned when every topic on the island has at least one star;
// it turns gold when every topic has three.
//
// unlock: the island stays under fog until the named island has earned at
// least `stars` stars in total. `null` = open from the start.
//
// from: draw the sea route from this stop instead of the island before it
// (a side trip). kind: 'farm' / 'tunes' / 'lab' / 'atlas' / 'studio' /
// 'english' = a 3D island (core/farm/, core/tunes/, core/lab/, core/atlas/,
// core/studio/, core/english/), not a walkable one.
//
// Curriculum mapping is a draft pending review by Syrian educators.

export default {
  grade: 6,
  title: 'بحر الصف السادس',
  home: { id: 'home', name: 'ميناء أرواد', art: 'port', pos: [50, 93] },
  regions: [
    {
      id: 'arabic', name: 'جزيرة الحروف', subject: 'اللغة العربية', art: 'letters', pos: [22, 80],
      color: '#d0507e', unlock: null,
      badge: { name: 'مفتاح الحروف', icon: '🗝️' },
      intro: 'في جزيرة الحروف تُفتح الأبواب بقواعد اللغة! كل جملة شيفرة، وأنت مَن يفكّها.',
    },
    {
      // A side trip from the home port, open from the start: a 3D farm
      // (core/farm/) where the agriculture book is played (worlds/grade6/farm.js).
      id: 'farm', name: 'مزرعتي السعيدة', subject: 'التربية الزراعية', art: 'farm', pos: [80, 81],
      color: '#6aa84f', unlock: null, from: 'home', kind: 'farm',
      badge: { name: 'سنبلة المزرعة', icon: '🌾' },
      intro: 'مزرعة كاملة بين يديك! تحرث وتزرع وتحلب البقرة وتصنع الجبن… كما في كتاب التربية الزراعية.',
    },
    {
      // A side trip from the letters island, open from the start: a 3D toy
      // island (core/tunes/) where the music book is played (worlds/grade6/tunes.js).
      id: 'music', name: 'جزيرة الأنغام', subject: 'التربية الموسيقية', art: 'music', pos: [18, 57],
      color: '#8a63c9', unlock: null, from: 'arabic', kind: 'tunes',
      badge: { name: 'قيثارة الأنغام', icon: '🎼' },
      intro: 'جزيرة تعزف! بيانو عملاق، ودائرة إيقاع، وغيمة تمطر نوتات… كما في كتاب التربية الموسيقية.',
    },
    {
      id: 'math', name: 'جزيرة الأرقام', subject: 'الرياضيات', art: 'numbers', pos: [56, 63],
      color: '#c7373f', unlock: { region: 'arabic', stars: 2 },
      badge: { name: 'بوصلة الأرقام', icon: '🧭' },
      intro: 'منارة الأرقام ترشد السفن بالكسور والنسب. احسب جيداً لتصل بأمان!',
    },
    {
      // A side trip from the numbers island, open from the start: a 3D island
      // (core/studio/) where the art book is played (worlds/grade6/studio.js).
      id: 'art', name: 'جزيرة الألوان', subject: 'التربية الفنية', art: 'palette', pos: [83, 53],
      color: '#e2543a', unlock: null, from: 'math', kind: 'studio',
      badge: { name: 'ريشة الألوان', icon: '🎨' },
      intro: 'جزيرة كلها ألوان! دوائر تدور، ومنظور شارع، وأقنعة أفريقية، وطيّ ورق، وكولاج… كما في كتاب التربية الفنية.',
    },
    {
      // A 3D island (core/lab/) where the science book, semester 1, is
      // played: experiments first, then questions (worlds/grade6/lab.js).
      id: 'science', name: 'جزيرة العلوم', subject: 'العلوم', art: 'science', pos: [40, 41],
      color: '#2f8a5f', unlock: { region: 'math', stars: 2 }, kind: 'lab',
      badge: { name: 'مصباح العلوم', icon: '🔬' },
      intro: 'جزيرة نجرّب فيها العلوم بأيدينا: غابة وبحيرة، وساحة القوى، وقبّة الجسم، وقلعة الحصن… كما في كتاب العلوم.',
    },
    {
      // A 3D island (core/atlas/) where the social studies book is played,
      // with a globe of the world's countries (worlds/grade6/atlas.js).
      id: 'social', name: 'جزيرة الأطلس', subject: 'الدراسات الاجتماعية', art: 'atlas', pos: [78, 32], kind: 'atlas',
      color: '#c98d1c', unlock: { region: 'science', stars: 2 },
      badge: { name: 'بوصلة الرحّالة', icon: '🧭' },
      intro: 'من النيل إلى الأندلس! نرحل في وطننا العربي في أفريقيا، وفي مرصد الجزيرة كرة أرضية فيها كل دول العالم بأعلامها وعملاتها.',
    },
    {
      // A side trip from the science island: a 3D island (core/english/)
      // where the English book is played (worlds/grade6/english.js).
      id: 'english', name: 'جزيرة Hello', subject: 'اللغة الإنكليزية', art: 'english', pos: [20, 25],
      color: '#2f6fd0', unlock: { region: 'math', stars: 2 }, from: 'science', kind: 'english',
      badge: { name: 'نجمة الكلمات', icon: '🔤' },
      intro: 'Hello! جزيرة نتكلّم فيها الإنكليزية: نسافر ونمثّل ونغوص ونطبخ ونزور الكواكب… كما في كتاب اللغة الإنكليزية.',
    },
    {
      id: 'treasure', name: 'جزيرة الكنز', subject: 'مراجعة شاملة', art: 'treasure', pos: [55, 10],
      color: '#e0a93a', unlock: { region: 'social', stars: 2 },
      badge: { name: 'تاج الحكمة', icon: '👑' },
      intro: 'وصلت إلى الكنز! لكن قفله لا يُفتح إلا لمن يتذكر كل ما تعلّمه.',
    },
  ],
};
