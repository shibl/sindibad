// Every word this concept adds to the page, in both languages. The headline, body and CTA are the page's own.
export type Words = typeof en

const en = {
  setSail: 'Set sail',
  weight: 'A one-time download of about {mb} MB',
  art: 'A dhow under full sail on a golden sea, with islands on the horizon.',
  title: 'Set sail: a small game',
  loading: 'Hoisting the sail',
  noGl: 'This device can’t run the game. It needs a browser with WebGL 2.',
  noLoad: 'The game didn’t load. Please check your connection and try again.',
  close: 'Close the game',
  mute: 'Turn the sound off',
  unmute: 'Turn the sound on',
  hintKeys: 'Steer with ← → or the pointer',
  hintTouch: 'Hold the left or right of the screen to steer',
  follow: 'Follow the hoopoe to the islands',
  isles: {
    beautiful: { name: 'Beautiful', line: 'The island of beautiful things' },
    research: { name: 'Research', line: 'The island of finding out' },
    play: { name: 'Play', line: 'The island of play' },
  } as Record<string, { name: string; line: string }>,
  chart: 'The chart is yours now',
  tapDesktop: 'Press space or click, and they jump',
  tapTouch: 'Tap, and they jump',
  toFind: 'islands found',
  again: 'Sail again',
  back: 'Back to the site',
}

const ar: Words = {
  setSail: 'أبحِر',
  weight: 'تحميل لمرة واحدة بحجم {mb} ميغابايت تقريباً',
  art: 'مركب شراعي تقليدي يبحر بكامل أشرعته فوق بحر ذهبي، وفي الأفق جزر.',
  title: 'أبحِر: لعبة صغيرة',
  loading: 'نرفع الشراع',
  noGl: 'لا يستطيع هذا الجهاز تشغيل اللعبة، فهي تحتاج إلى متصفح يدعم WebGL 2.',
  noLoad: 'لم تُحمَّل اللعبة. تحقّق من اتصالك وحاول مرة أخرى.',
  close: 'أغلق اللعبة',
  mute: 'أوقف الصوت',
  unmute: 'شغّل الصوت',
  hintKeys: 'وجّه المركب بالسهمين ← → أو بالمؤشر',
  hintTouch: 'اضغط مطوّلاً على يمين الشاشة أو يسارها لتوجيه المركب',
  follow: 'اتبع الهدهد إلى الجزر',
  isles: {
    beautiful: { name: 'الجمال', line: 'جزيرة الجمال' },
    research: { name: 'البحث', line: 'جزيرة البحث والاكتشاف' },
    play: { name: 'اللعب', line: 'جزيرة اللعب' },
  },
  chart: 'الخريطة بين يديك الآن',
  tapDesktop: 'اضغط المسافة أو انقر لتقفز الأسماك',
  tapTouch: 'انقر لتقفز الأسماك',
  toFind: 'جزر اكتُشفت',
  again: 'أبحِر من جديد',
  back: 'العودة إلى الموقع',
}

export const WORDS = { en, ar }
