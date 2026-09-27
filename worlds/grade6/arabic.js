// جزيرة الحروف — the walkable Arabic island.
//
// Content, not engine code: the map, who lives here, what they say, and
// which lesson each quest uses. The engine is core/overworld.js.
//
// tiles: one character per tile —
//   ~ sea   w pond   s sand   . grass   = stone path   d wooden dock   # stone wall
// Positions are [x, y] in tiles (x grows right, y grows down); objects and
// people stand with their feet at that point.
//
// Dialogue lines may use {name} (the hero's name). Quests: talk → lesson →
// on success the villager hands over a golden letter. The three letters
// spell «علم» (knowledge) and complete the monument in the north garden.
//
// Draft content, pending review by Syrian educators. CC-BY-SA.

import { riddle } from '../../plugins/review/pools.js';

export default {
  id: 'arabic',
  name: 'جزيرة الحروف',
  spawn: [12.9, 31.6],
  tokens: ['ع', 'ل', 'م'],
  tokenName: 'الحرف الذهبي',
  tokenHint: 'ضعها على النُّصب في الحديقة الشمالية.',
  monument: {
    name: '🏛️ نُصب العلم',
    partial: 'في النُّصب ثلاث فجوات لأحرف ذهبية. معك {n} منها.',
    hint: 'ساعد أهل الجزيرة لتجمع الأحرف الثلاثة.',
    place: ['تضع الأحرف الذهبية في أماكنها: <b>ع</b>… <b>ل</b>… <b>م</b>…', '«العِلم»! يتوهّج النُّصب ويُسمع صوت كصوت الأجراس!'],
    complete: 'تلمع الأحرف الثلاثة: <b>ع ل م</b> — «العلم نور». أكملتَ جزيرة الحروف!',
    reward: { icon: '🗝️', title: 'مفتاح الحروف', text: 'أكملتَ جزيرة الحروف! عُد إلى السفينة ⛵ لتُبحر إلى جزيرة جديدة.' },
  },
  tiles: [
    '~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~ssssssss~~~~~~~~',
    '~~~~~~~~~s....sssss~~~~~',
    '~~~wssssw.........ss~~~~',
    '~~~ws..sw..........ss~~~',
    '~~swwwwww...........ss~~',
    '~~swwwwww............s~~',
    '~~swwwwww............s~~',
    '~~s.........==.......s~~',
    '~~s.........==.......s~~',
    '~~s#########==#######s~~',
    '~~s.........==.......s~~',
    '~~s.........==.......s~~',
    '~ss.........==.......ss~',
    '~s......==========....s~',
    '~s......==========....s~',
    '~s......==========....s~',
    '~s......==========....s~',
    '~s......==========....s~',
    '~s.........====.......s~',
    '~s..........==........s~',
    '~s..........==........s~',
    '~ss.........==.......ss~',
    '~~s.........==.......s~~',
    '~~s.........==.......s~~',
    '~~ss........==......ss~~',
    '~~~s........==......s~~~',
    '~~~ss.......==.....ss~~~',
    '~~~~ss......==....ss~~~~',
    '~~~~~sssss..==.ssss~~~~~',
    '~~~~~~~~ssssddss~~~~~~~~',
    '~~~~~~~~~~~~dd~~~~~~~~~~',
    '~~~~~~~~~~~~dd~~~~~~~~~~',
    '~~~~~~~~~~~~dd~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~',
  ],

  // Scenery. block: [w, h] in tiles, centred on x, ending at y — solid.
  objects: [
    { kind: 'boat', at: [14.6, 34.2] },
    { kind: 'gate', id: 'gate', at: [13, 11], block: [2, 1], opens: 'calligrapher' },
    { kind: 'fountain', at: [13, 17.4], block: [3, 1.4] },
    { kind: 'stall', at: [19.5, 15.6], block: [3, 1] },
    { kind: 'house', at: [4.5, 13.6], block: [4, 2.2] },
    { kind: 'house', at: [19.5, 12.4], block: [4, 2.2] },
    { kind: 'house', at: [5, 25.2], block: [4, 2.2] },
    { kind: 'house', at: [18.5, 24.6], block: [4, 2.2] },
    { kind: 'monument', id: 'monument', at: [13, 5.6], block: [2.4, 1] },
    { kind: 'palm', at: [2.9, 9.6], block: [0.6, 0.4] }, { kind: 'palm', at: [20.2, 6.8], block: [0.6, 0.4] },
    { kind: 'palm', at: [3.2, 20.5], block: [0.6, 0.4] }, { kind: 'palm', at: [21, 21.5], block: [0.6, 0.4] },
    { kind: 'palm', at: [6.5, 28.3], block: [0.6, 0.4] }, { kind: 'palm', at: [18, 28.5], block: [0.6, 0.4] },
    { kind: 'palm', at: [9, 3.4], block: [0.6, 0.4] }, { kind: 'palm', at: [17, 3.6], block: [0.6, 0.4] },
    { kind: 'bush', at: [8, 8.4], block: [1, 0.5] }, { kind: 'bush', at: [17.5, 8.8], block: [1, 0.5] },
    { kind: 'bush', at: [3.5, 16.5], block: [1, 0.5] }, { kind: 'bush', at: [9, 22.5], block: [1, 0.5] },
    { kind: 'rock', at: [16.5, 21], block: [1, 0.5] }, { kind: 'rock', at: [10.5, 4.6], block: [1, 0.5] },
    { kind: 'lamp', at: [11.2, 20], block: [0.4, 0.3] }, { kind: 'lamp', at: [14.8, 20], block: [0.4, 0.3] },
    { kind: 'lamp', at: [11.2, 26], block: [0.4, 0.3] }, { kind: 'lamp', at: [14.8, 26], block: [0.4, 0.3] },
    { kind: 'flowers', at: [10, 6.5] }, { kind: 'flowers', at: [16, 7] }, { kind: 'flowers', at: [7, 18.5] },
    { kind: 'flowers', at: [17, 19.5] }, { kind: 'flowers', at: [9.5, 24] }, { kind: 'flowers', at: [16.5, 27] },
  ],

  signs: [
    { at: [11.3, 29.2], text: 'جزيرة الحروف ↑<br>الساحة — البوابة — حديقة الحكمة' },
    { at: [10.6, 12.4], text: '«بوابة الحروف»<br>لا تُفتح إلا لمن يفكّ شيفرتها: فعلٌ وفاعلٌ ومفعولٌ به.' },
    { at: [15.8, 4.9], text: '«نُصب العلم»<br>ثلاثة أحرف ذهبية تُكمل كلمته.' },
    { at: [7.8, 9.2], text: '«جسر الكلمات» ↑<br>فعلٌ، ثم فاعلٌ مرفوع، ثم مفعولٌ به منصوب.', puzzle: 'word-bridge' },
  ],

  // Walk-on puzzles. 'stones': rows of stepping stones across water; each
  // row offers the words of one sentence, and the student must step on
  // them in grammatical order (rows[0] first). A wrong stone = a splash
  // back to `reset`. Sentences are drawn at random each attempt.
  puzzles: [
    {
      id: 'word-bridge', kind: 'stones', title: 'جسر الكلمات',
      rows: [7.5, 6.5, 5.5], cols: [4.5, 5.5, 6.5], reset: [5.5, 8.6],
      steps: ['الفعل', 'الفاعل', 'المفعول به'], across: 'اعبر إلى الجزيرة!',
      sentences: [
        ['كتبَ', 'الطالبُ', 'الدرسَ'], ['رفعَ', 'البحّارُ', 'الشراعَ'], ['قرأتْ', 'ياسمينةُ', 'القصةَ'],
        ['زرعَ', 'الفلاحُ', 'الزيتونَ'], ['فتحَ', 'المعلمُ', 'البابَ'], ['شربَ', 'العصفورُ', 'الماءَ'],
      ],
      intro: ['«جسر الكلمات»: الحجارة تحمل كلمات جملة فعلية مبعثرة.', 'اعبر عليها <b>بترتيب الجملة</b>: الفعل أولاً، ثم <b>الفاعل</b> (آخره ضمة ـُـ)، ثم <b>المفعول به</b> (آخره فتحة ـَـ).', 'الحجر الخطأ يغوص في الماء!'],
      fail: 'سبلاش! 💦 انظر إلى آخر الكلمة: الضمة للفاعل، والفتحة للمفعول به، والفعل يأتي أولاً.',
      done: 'أحسنت! عبرت جسر الكلمات. الصندوق على الجزيرة الصغيرة صار لك!',
    },
  ],

  chests: [
    { id: 'garden-chest', at: [5.5, 4.5], pearls: 10 },
  ],

  pearls: [
    [7, 16], [20, 18.5], [4.5, 22], [16, 23], [20.5, 27.5], [8, 27.5],
    [5, 9.2], [20, 9.5], [12.5, 8], [18.5, 5], [6.8, 3.6], [3.5, 11.8],
  ],

  people: [
    {
      id: 'teacher', name: 'المعلّمة هدى', at: [7.6, 12.3],
      look: { skin: '#eab38a', robe: '#2f5e8a', trim: '#f2c14e', sash: '#fbf1dc', hat: 'hijab', headColor: '#2f8a5f', glasses: true, prop: 'book', lashes: true },
      quest: {
        topic: 'arabic-kana', pearls: 10,
        intro: ['أهلاً يا {name}! أنا معلّمة اللغة في هذه الجزيرة.', 'تلاميذي نسوا قاعدة <b>كان وأخواتها</b>: أيّ كلمة اسمها وأيّها خبرها؟', 'هل تساعدني في تذكيرهم؟'],
        accept: 'سأساعدك!', decline: 'لاحقاً',
        done: ['أحسنت! كان ترفع الاسم وتنصب الخبر — لن ينسوها بعد اليوم.', 'خذ هذه اللآلئ هدية مني.'],
        retry: ['قاربت! تذكّر: بعد كان الاسم مرفوع (ـُـ) والخبر منصوب (ـً).'],
        after: ['تلاميذي صاروا ماهرين! تريد درساً آخر؟'],
      },
    },
    {
      id: 'poet', name: 'الشاعرة وداد', at: [19.5, 20.4],
      look: { skin: '#d49a6c', robe: '#7a4ac2', trim: '#f2c14e', sash: '#d0507e', hat: 'hijab', headColor: '#f2c14e', prop: 'pen', lashes: true },
      quest: {
        topic: 'arabic-inna', pearls: 10,
        intro: ['«إنَّ العلمَ نورٌ»… أنا وداد، أكتب الشعر.', 'لكنّ الريح خلطت حركات قصيدتي! بعد <b>إنّ وأخواتها</b>: أيّها الاسم وأيّها الخبر؟'],
        accept: 'هيّا نصلحها!', decline: 'لاحقاً',
        done: ['ما أجمل قصيدتي الآن! إنّ تنصب الاسم وترفع الخبر.', 'خذ لآلئ القصيدة.'],
        retry: ['ما زالت الحركات مختلطة. تذكّر: إنّ عكس كان تماماً.'],
        after: ['كتبتُ قصيدة جديدة! تساعدني في ضبطها؟'],
      },
    },
    {
      id: 'postman', name: 'ساعي البريد أبو زيد', at: [8.6, 27.4],
      look: { skin: '#c98e60', robe: '#1f9aa0', trim: '#fbf1dc', sash: '#a0602e', hat: 'cap', headColor: '#1f9aa0', beard: 'dark', prop: 'basket' },
      quest: {
        topic: 'arabic-tenses', pearls: 10,
        intro: ['يا ويلي! سقطت حقيبة الرسائل واختلطت الأفعال!', 'أحتاج أن أفرز: ماضٍ ومضارع وأمر. هل تساعدني؟'],
        accept: 'أنا أفرزها!', decline: 'لاحقاً',
        done: ['وصلت كل رسالة إلى صندوقها! أنت ساعي بريد ماهر.', 'تفضّل هذه اللآلئ.'],
        retry: ['بعض الرسائل في غير صندوقها. المضارع يبدأ بأحد أحرف «أنيت».'],
        after: ['وصلني بريد جديد! تساعدني في فرزه؟'],
      },
    },
    {
      id: 'fisher', name: 'العم مصطفى', at: [10.3, 30.6],
      look: { skin: '#c98e60', robe: '#6b8fa8', sash: '#2f8a5f', hat: 'cap', headColor: '#e8d3a6', beard: 'dark', prop: 'basket' },
      talk: [
        'أهلاً بك في <b>جزيرة الحروف</b> يا {name}!',
        'أهل هذه الجزيرة يحبّون اللغة العربية. لكنّ البوابة الكبيرة في الشمال مقفلة منذ أيام…',
        'اذهب إلى <b>الساحة</b> وتحدّث مع الناس. من يساعدهم ينال <b>حرفاً ذهبياً</b>.',
      ],
    },
    {
      wander: 1.8, riddles: () => riddle('arabic'), id: 'kid', name: 'رامي', at: [6.4, 21.5],
      look: { skin: '#eab38a', robe: '#e0a93a', sash: '#1f9aa0', hat: 'none', hair: '#4a2c1a' },
      talk: [
        'هل تعرف سرّاً؟ الكلمة التي في آخرها <b>ـُـ</b> (ضمة) تكون غالباً <b>مرفوعة</b>!',
        'والتي في آخرها <b>ـَـ</b> (فتحة) تكون غالباً <b>منصوبة</b>. هكذا نعرف الفاعل من المفعول به!',
        'وأنا أجمع <b>اللآلئ</b> على الشاطئ… هل وجدت الصندوق المخبّأ في الحديقة؟',
      ],
    },
    {
      id: 'storyteller', name: 'الحكواتي أبو سليم', at: [9.4, 16.6],
      look: { skin: '#d49a6c', robe: '#7a4ac2', trim: '#f2c14e', sash: '#b3303a', hat: 'kufiya', beard: 'dark', prop: 'staff' },
      quest: {
        topic: 'arabic-mubtada-khabar', letter: 'ع',
        intro: [
          'تعال يا {name}، اجلس! أنا الحكواتي، أروي الحكايات في هذه الساحة منذ أربعين عاماً.',
          'لكنّ الريح بعثرت جُمل حكايتي الاسمية! لم أعد أعرف <b>المبتدأ</b> من <b>الخبر</b>…',
          'هل تساعدني في ترتيبها؟',
        ],
        accept: 'نعم، سأساعدك!', decline: 'لاحقاً',
        done: ['أحسنت! عادت الحكاية كما كانت: «العلمُ نورٌ»… مبتدأ وخبر!', 'خذ هذا <b>الحرف الذهبي</b> جزاءً لك.'],
        retry: ['اقتربت كثيراً! تذكّر: المبتدأ نتحدث عنه، والخبر نُخبر به عنه. عُد إليّ متى شئت.'],
        after: ['حكايتي كاملة بفضلك يا {name}. هل تريد تحدياً آخر لتجمع نجوماً أكثر؟'],
      },
    },
    {
      id: 'bookseller', name: 'سلمى بائعة الكتب', at: [19.3, 17.1],
      look: { skin: '#eab38a', robe: '#1f9aa0', trim: '#fbf1dc', sash: '#d0507e', hat: 'hijab', headColor: '#d0507e', prop: 'book', lashes: true },
      quest: {
        topic: 'arabic-plurals', letter: 'ل',
        intro: [
          'أهلاً يا {name}! وصلتني صناديق كتب جديدة… لكنها مختلطة كلها!',
          'كل صندوق فيه كلمات مجموعة: <b>جمع مذكر سالم</b>، و<b>جمع مؤنث سالم</b>، و<b>جمع تكسير</b>.',
          'هل تساعدني في ترتيبها على الرفوف؟',
        ],
        accept: 'بكل سرور!', decline: 'ليس الآن',
        done: ['رائع! الرفوف مرتبة تماماً.', 'تفضّل هذا <b>الحرف الذهبي</b>، وجدته بين صفحات كتاب قديم.'],
        retry: ['بعض الكتب ما زالت في غير مكانها. تذكّر: «ات» للمؤنث السالم، و«ونَ/ينَ» للمذكر السالم.'],
        after: ['مكتبتي أجمل مكتبة في الجزيرة الآن! هل تريد ترتيب صناديق أخرى؟'],
      },
    },
    {
      id: 'calligrapher', name: 'الخطّاط أبو نور', at: [15.9, 11.7],
      look: { skin: '#d8a070', robe: '#2f5e8a', trim: '#f2c14e', sash: '#2f8a5f', hat: 'fez', beard: 'white', glasses: true, prop: 'pen' },
      quest: {
        topic: 'arabic-fael-mafool', letter: 'م',
        intro: [
          'أنا أبو نور، خطّاط هذه البوابة. نقشتُ عليها جملاً فعلية… وهي قفلها!',
          'البوابة لا تُفتح إلا لمن يعرف في كل جملة <b>الفاعل</b> و<b>المفعول به</b>.',
          'هل أنت مستعد لفكّ الشيفرة؟',
        ],
        accept: 'مستعد!', decline: 'أحتاج وقتاً',
        done: ['ما شاء الله! فككتَ الشيفرة. انظر… البوابة تُفتح!', 'وهذا <b>الحرف الذهبي</b> الأخير. ضعه مع أخويه على النُّصب في الحديقة.'],
        retry: ['لم تنفتح بعد. تذكّر: الفاعل مَن فعل (مرفوع)، والمفعول به ما وقع عليه الفعل (منصوب).'],
        after: ['البوابة مفتوحة لك دائماً يا {name}. هل تريد شيفرة أصعب؟'],
      },
    },
    {
      id: 'scribe', name: 'الكاتب أبو سليم', at: [11.5, 13.5],
      look: { skin: '#d49a6c', robe: '#5b3f8c', trim: '#f2c14e', sash: '#f2c14e', hat: 'fez', headColor: '#c7373f', beard: 'dark', glasses: true, prop: 'book' },
      quest: {
        topic: 'arabic-five-verbs', pearls: 10,
        intro: ['أكتب رسائل أهل الجزيرة منذ ثلاثين عاماً!', 'لكن <b>الأفعال الخمسة</b> تلعب بالنون: مرّة تظهر ومرّة تختفي!', 'هل تساعدني في تصحيح الرسائل؟'],
        accept: 'نعم، هيّا!', decline: 'لاحقاً',
        done: ['رسائل صحيحة بلا خطأ! النون عرفت مكانها أخيراً.', 'خذ هذه اللآلئ، شكراً لك.'],
        retry: ['تذكّر: الرفع بثبوت النون، والنصب والجزم بحذفها.'],
        after: ['وصلتني رسائل جديدة! تراجعها معي؟'],
      },
    },
  ],
};
