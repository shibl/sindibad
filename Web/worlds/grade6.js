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
// (a side trip). kind: 'farm' / 'tunes' = a 3D island (core/farm/,
// core/tunes/), not a walkable one.
//
// Curriculum mapping is a draft pending review by Syrian educators.

export default {
  grade: 6,
  title: 'بحر الصف السادس',
  home: { id: 'home', name: 'ميناء أرواد', art: 'port', pos: [50, 90] },
  regions: [
    {
      id: 'arabic', name: 'جزيرة الحروف', subject: 'اللغة العربية', art: 'letters', pos: [27, 71],
      color: '#d0507e', unlock: null,
      badge: { name: 'مفتاح الحروف', icon: '🗝️' },
      intro: 'في جزيرة الحروف تُفتح الأبواب بقواعد اللغة! كل جملة شيفرة، وأنت مَن يفكّها.',
    },
    {
      // A side trip from the home port, open from the start: a 3D farm
      // (core/farm/) where the agriculture book is played (worlds/grade6/farm.js).
      id: 'farm', name: 'مزرعتي السعيدة', subject: 'التربية الزراعية', art: 'farm', pos: [81, 75],
      color: '#6aa84f', unlock: null, from: 'home', kind: 'farm',
      badge: { name: 'سنبلة المزرعة', icon: '🌾' },
      intro: 'مزرعة كاملة بين يديك! تحرث وتزرع وتحلب البقرة وتصنع الجبن… كما في كتاب التربية الزراعية.',
    },
    {
      // A side trip from the letters island, open from the start: a 3D toy
      // island (core/tunes/) where the music book is played (worlds/grade6/tunes.js).
      id: 'music', name: 'جزيرة الأنغام', subject: 'التربية الموسيقية', art: 'music', pos: [11, 52.5],
      color: '#8a63c9', unlock: null, from: 'arabic', kind: 'tunes',
      badge: { name: 'قيثارة الأنغام', icon: '🎼' },
      intro: 'جزيرة تعزف! بيانو عملاق، ودائرة إيقاع، وغيمة تمطر نوتات… كما في كتاب التربية الموسيقية.',
    },
    {
      id: 'math', name: 'جزيرة الأرقام', subject: 'الرياضيات', art: 'numbers', pos: [73, 55],
      color: '#c7373f', unlock: { region: 'arabic', stars: 2 },
      badge: { name: 'بوصلة الأرقام', icon: '🧭' },
      intro: 'منارة الأرقام ترشد السفن بالكسور والنسب. احسب جيداً لتصل بأمان!',
    },
    {
      id: 'science', name: 'جزيرة العلوم', subject: 'العلوم', art: 'science', pos: [28, 38],
      color: '#2f8a5f', unlock: { region: 'math', stars: 2 },
      badge: { name: 'مصباح العلوم', icon: '🔬' },
      intro: 'بركان صغير ومختبر عجيب! هنا نكتشف المادة والكواكب وجسم الإنسان.',
    },
    {
      id: 'social', name: 'جزيرة القلعة', subject: 'الجغرافيا والتاريخ', art: 'citadel', pos: [72, 22],
      color: '#c98d1c', unlock: { region: 'science', stars: 2 },
      badge: { name: 'درع القلعة', icon: '🛡️' },
      intro: 'من فوق القلعة نرى بلادنا كلها: مدنها وأنهارها ومعالمها.',
    },
    {
      id: 'treasure', name: 'جزيرة الكنز', subject: 'مراجعة شاملة', art: 'treasure', pos: [35, 7],
      color: '#e0a93a', unlock: { region: 'social', stars: 2 },
      badge: { name: 'تاج الحكمة', icon: '👑' },
      intro: 'وصلت إلى الكنز! لكن قفله لا يُفتح إلا لمن يتذكر كل ما تعلّمه.',
    },
  ],
};
