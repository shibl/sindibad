/** Copy for design A. Quotes express our studio principles, rather than testimonials. */
export interface APrinciple {
  title: string
  body: string
  quote: string
}

export interface AInsight {
  title: string
  body: string
}

export interface AProject {
  title: string
  description: string
  details: string
  kind: 'game' | 'chemistry' | 'physics'
}

export interface AContent {
  principles: APrinciple[]
  insights: AInsight[]
  projects: AProject[]
}

const en: AContent = {
  principles: [
    {
      title: 'Play comes first.',
      body: 'We bring game developers, AI researchers and educators together around one question: what makes the next moment worth playing?',
      quote: 'Make the player want to take one more step.',
    },
    {
      title: 'Arabic from day one.',
      body: 'Arabic and English belong at the beginning of the creative process. Language shapes our stories, interfaces and worlds.',
      quote: 'A language is a way into a world.',
    },
    {
      title: 'Build for real devices.',
      body: 'Our first voyage is designed for low-powered Android phones. Small downloads and thoughtful systems make room for more players.',
      quote: 'The best device is the one a player already has.',
    },
    {
      title: 'Keep the voyage offline.',
      body: 'Sindibad & Yasmina works without an internet connection, so a player can keep exploring wherever the day takes them.',
      quote: 'An adventure should not depend on a signal.',
    },
    {
      title: 'Let curiosity lead.',
      body: 'Every island in our first game is a world to master. We use stories, puzzles and discovery to give each next step a purpose.',
      quote: 'Give curiosity somewhere to go.',
    },
    {
      title: 'Find each player’s rhythm.',
      body: 'Our adaptive engine adjusts difficulty and pacing to the player, keeping the challenge within reach while making progress matter.',
      quote: 'A good challenge invites another try.',
    },
    {
      title: 'Test the journey.',
      body: 'Our player simulator explores games before launch. Simulation helps the team examine pacing and difficulty, then learn from real players.',
      quote: 'Every path deserves a thoughtful playthrough.',
    },
    {
      title: 'Make ideas stay.',
      body: 'Memory research informs when an idea returns. We look for ways to make revisiting a discovery feel like part of the adventure.',
      quote: 'Return to an idea with something new to discover.',
    },
    {
      title: 'One crew, many horizons.',
      body: 'With our home port in Dubai and a team across five countries, we bring different disciplines and perspectives to the same voyage.',
      quote: 'Build a shared world from different points of view.',
    },
  ],
  insights: [
    {
      title: 'Small worlds. Wide possibilities.',
      body: 'Sindibad & Yasmina brings nine islands and 128 lessons into a game of approximately 4.4 MB, designed to run fully offline.',
    },
    {
      title: 'Two languages. One starting point.',
      body: 'We make games in Arabic and English for players everywhere, with a focus on the Gulf. Language is part of the design from the outset.',
    },
    {
      title: 'Research meets the next move.',
      body: 'Player gesture identification, an adaptive engine, player simulation and memory research form our four in-house AI systems.',
    },
    {
      title: 'A studio with a shared horizon.',
      body: 'Our team works across Dubai, Canada, the United States, Lebanon and Syria, bringing games, AI research and education together.',
    },
  ],
  projects: [
    {
      title: 'Sindibad & Yasmina',
      description: 'The Syrian curriculum, reimagined as a game.',
      details: 'Sindibad & Yasmina turns the Syrian school curriculum into a learning adventure. Explore islands, meet characters and solve challenges built around curriculum lessons. Each journey brings school subjects to life through stories, puzzles and play.',
      kind: 'game',
    },
    {
      title: 'The Chemistry Lab',
      description: 'Small experiments. Extraordinary discoveries.',
      details: 'A playful space for exploring chemistry through interactive experiments. Discover how substances behave, explore reactions and follow your curiosity. The Chemistry Lab is in development. More to come soon.',
      kind: 'chemistry',
    },
    {
      title: 'The Physics Lab',
      description: 'Big questions. A universe to explore.',
      details: 'An invitation to explore the forces that shape our world. Discover motion, energy and everyday phenomena through playful experiments. The Physics Lab is in development. More to come soon.',
      kind: 'physics',
    },
  ],
}

const ar: AContent = {
  principles: [
    {
      title: 'اللعب أولاً.',
      body: 'نجمع مطوّري الألعاب وباحثي الذكاء الاصطناعي والتربويين حول سؤال واحد: ما الذي يجعل اللحظة التالية تستحق اللعب؟',
      quote: 'اجعل اللاعب يرغب في خطوة أخرى.',
    },
    {
      title: 'العربية منذ اليوم الأول.',
      body: 'مكان العربية والإنجليزية في بداية العملية الإبداعية. فاللغة تشكّل قصصنا وواجهاتنا وعوالمنا.',
      quote: 'اللغة باب إلى عالم كامل.',
    },
    {
      title: 'للأجهزة التي بين أيدينا.',
      body: 'نصمّم رحلتنا الأولى لهواتف أندرويد البسيطة. حجم التنزيل الصغير والأنظمة المدروسة يفتحان الباب أمام مزيد من اللاعبين.',
      quote: 'أفضل جهاز هو الذي يملكه اللاعب بالفعل.',
    },
    {
      title: 'لتستمر الرحلة دون إنترنت.',
      body: 'تعمل رحلات سندباد وياسمينة دون اتصال بالإنترنت، ليواصل اللاعب الاستكشاف أينما أخذه يومه.',
      quote: 'المغامرة لا تنتظر إشارة اتصال.',
    },
    {
      title: 'ليكن الفضول دليلك.',
      body: 'كل جزيرة في لعبتنا الأولى عالم يستحق الإتقان. نمنح الخطوة التالية معنى من خلال القصص والألغاز والاكتشاف.',
      quote: 'امنح الفضول وجهة ينطلق إليها.',
    },
    {
      title: 'لكل لاعب إيقاعه.',
      body: 'يضبط محرّكنا التكيّفي الصعوبة والإيقاع وفق قدرة اللاعب، ليبقى التحدّي في متناوله ويظلّ للتقدّم معنى.',
      quote: 'التحدّي الجيد يدعوك إلى محاولة أخرى.',
    },
    {
      title: 'اختبر مسارات الرحلة.',
      body: 'يستكشف محاكي اللاعبين ألعابنا قبل إطلاقها. تساعد المحاكاة الفريق على دراسة الإيقاع والصعوبة، ثم نتعلّم من اللاعبين الحقيقيين.',
      quote: 'كل مسار يستحق تجربة متأنّية.',
    },
    {
      title: 'أفكار تبقى مع اللاعب.',
      body: 'تساعدنا أبحاث الذاكرة على تحديد موعد عودة الفكرة. ونبحث عن طرق تجعل العودة إلى الاكتشاف جزءاً من المغامرة.',
      quote: 'عُد إلى الفكرة وفيها شيء جديد تكتشفه.',
    },
    {
      title: 'طاقم واحد وآفاق كثيرة.',
      body: 'ميناؤنا في دبي وفريقنا موزّع على خمس دول. نجمع تخصّصات ووجهات نظر مختلفة في رحلة واحدة.',
      quote: 'ابنِ عالماً مشتركاً من وجهات نظر مختلفة.',
    },
  ],
  insights: [
    {
      title: 'عوالم صغيرة وإمكانات واسعة.',
      body: 'تجمع رحلات سندباد وياسمينة تسع جزر و١٢٨ درساً في لعبة بحجم يقارب ٤٫٤ ميغابايت، مصمّمة للعمل بالكامل دون إنترنت.',
    },
    {
      title: 'لغتان ونقطة انطلاق واحدة.',
      body: 'نصنع ألعاباً بالعربية والإنجليزية للاعبين حول العالم، مع تركيز على الخليج. اللغة جزء من التصميم منذ البداية.',
    },
    {
      title: 'من البحث إلى الخطوة التالية.',
      body: 'التعرّف على اللاعب من لمساته والمحرّك التكيّفي ومحاكاة اللاعبين وأبحاث الذاكرة هي أنظمة الذكاء الاصطناعي الأربعة التي نبنيها داخلياً.',
    },
    {
      title: 'استوديو يجمعه أفق واحد.',
      body: 'يعمل فريقنا من دبي وكندا والولايات المتحدة ولبنان وسوريا، ويجمع بين تطوير الألعاب وأبحاث الذكاء الاصطناعي والتعليم.',
    },
  ],
  projects: [
    {
      title: 'سندباد وياسمينة',
      description: 'المنهاج السوري، في عالم من اللعب.',
      details: 'تحوّل لعبة سندباد وياسمينة المنهاج المدرسي السوري إلى مغامرة تعلّم. استكشف الجزر، وتعرّف على الشخصيات، وحلّ تحدّيات مستوحاة من دروس المنهاج. تمنح كل رحلة المواد الدراسية حياة جديدة من خلال الحكايات والألغاز واللعب.',
      kind: 'game',
    },
    {
      title: 'مختبر الكيمياء',
      description: 'تجارب صغيرة. اكتشافات استثنائية.',
      details: 'مساحة مرحة لاستكشاف الكيمياء عبر تجارب تفاعلية. اكتشف خصائص المواد وتفاعلاتها واتبع فضولك. مختبر الكيمياء قيد التطوير، والمزيد قريباً.',
      kind: 'chemistry',
    },
    {
      title: 'مختبر الفيزياء',
      description: 'أسئلة كبيرة. وكون يستحق الاستكشاف.',
      details: 'دعوة لاستكشاف القوى التي تشكّل عالمنا. اكتشف الحركة والطاقة والظواهر اليومية عبر تجارب مرحة. مختبر الفيزياء قيد التطوير، والمزيد قريباً.',
      kind: 'physics',
    },
  ],
}

export const aContent = (lang: 'en' | 'ar'): AContent =>
  lang === 'ar' ? ar : en
