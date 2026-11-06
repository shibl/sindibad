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
  kind: 'map' | 'lesson' | 'dialogue' | 'concept'
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
      description:
        'Our first voyage. Explore an archipelago with Yasmina and her hoopoe guide, one island at a time.',
      kind: 'map',
    },
    {
      title: 'A world of puzzles',
      description:
        'Inside Sindibad & Yasmina: a learning journey built around discovery, play and the next challenge.',
      kind: 'lesson',
    },
    {
      title: 'Stories by the harbour',
      description:
        'Inside Sindibad & Yasmina: conversations and characters give the journey its sense of place.',
      kind: 'dialogue',
    },
    {
      title: 'The next horizon',
      description:
        'Concept study · An imagined island world exploring the visual language of a future adventure.',
      kind: 'concept',
    },
    {
      title: 'A city of discoveries',
      description:
        'Concept study · A fictional harbour where architecture, stories and exploration meet.',
      kind: 'concept',
    },
    {
      title: 'Beyond the dunes',
      description:
        'Concept study · An imagined desert journey, developed as a visual exploration for the studio.',
      kind: 'concept',
    },
    {
      title: 'The curious workshop',
      description:
        'Concept study · A playful setting for experimenting with ideas, puzzles and new worlds.',
      kind: 'concept',
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
      title: 'رحلات سندباد وياسمينة',
      description:
        'رحلتنا الأولى. استكشف الأرخبيل مع ياسمينة ودليلها الهدهد، جزيرة بعد أخرى.',
      kind: 'map',
    },
    {
      title: 'عالم من الألغاز',
      description:
        'من رحلات سندباد وياسمينة: رحلة تعلّم تنطلق من الاكتشاف واللعب والتحدّي التالي.',
      kind: 'lesson',
    },
    {
      title: 'حكايات الميناء',
      description:
        'من رحلات سندباد وياسمينة: حوارات وشخصيات تمنح الرحلة روح المكان.',
      kind: 'dialogue',
    },
    {
      title: 'الأفق التالي',
      description:
        'تصوّر فنّي · عالم جزر متخيّل يستكشف اللغة البصرية لمغامرة مستقبلية.',
      kind: 'concept',
    },
    {
      title: 'مدينة الاكتشافات',
      description:
        'تصوّر فنّي · ميناء خيالي تلتقي فيه العمارة والحكايات والاستكشاف.',
      kind: 'concept',
    },
    {
      title: 'ما وراء الكثبان',
      description:
        'تصوّر فنّي · رحلة صحراوية متخيّلة ضمن استكشافات الاستوديو البصرية.',
      kind: 'concept',
    },
    {
      title: 'ورشة الفضول',
      description:
        'تصوّر فنّي · مكان مرح لتجريب الأفكار والألغاز والعوالم الجديدة.',
      kind: 'concept',
    },
  ],
}

export const aContent = (lang: 'en' | 'ar'): AContent =>
  lang === 'ar' ? ar : en
