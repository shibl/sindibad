// What the Don't Press machine says, in each language, and two small helpers for putting words on its signs.
export const lang = () => ((document.documentElement.lang || '').startsWith('ar') ? 'ar' : 'en')
export const stillness = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export const WORDS = {
  en: {
    title: "Don't Press",
    hero: "The button you must not press",
    dont: "DON'T PRESS",
    press: 'PRESS!',
    said: "I SAID DON'T.",
    told: "I SAID DON'T!",
    double: "DON'T DON'T PRESS",
    almost: 'PRESS...',
    not: 'PRESS... NOT!',
    simonGo: 'SIMON SAYS PRESS',
    simonNo: "SIMON SAYS DON'T",
    newRule: 'NEW RULE!',
    onlySimon: 'ONLY WHEN SIMON SAYS',
    fine: 'FINE. YOU ASKED.',
    rule: 'PRESS ONLY WHEN I SAY',
    ready: 'READY?',
    notYet: 'NOT YET',
    enough: "THAT'S ENOUGH.",
    time: "TIME'S UP.",
    twoDonts: "Two don'ts make a do!",
    readAll: 'Read it all!',
    slow: 'Too slow!',
    score: 'Score',
    best: 'Best',
    newBest: 'New best!',
    again: 'Play again',
    leave: 'Back to the site',
    exit: 'Close the game',
    mute: 'Turn the sound off',
    unmute: 'Turn the sound on',
    press1: 'Press the button',
    strikes: 'Strikes',
    offender: ['Repeat offender', 'You were told. Three times.'],
    ranks: [
      ['Obedient citizen', "You barely touched it. We're a little worried."],
      ['Curious bystander', 'You looked at the button. The button looked back.'],
      ['Button enthusiast', 'Rules are more of a suggestion, aren’t they?'],
      ['Professional rule bender', 'You read every word, then pressed anyway.'],
      ['Menace to society', 'We have told your mother.'],
    ],
  },
  ar: {
    title: 'لا تضغط',
    hero: 'الزر الذي يجب ألّا تضغطه',
    dont: 'لا تضغط',
    press: 'اضغط!',
    said: 'قلتُ لك لا!',
    told: 'قلتُ لك لا!',
    double: 'لا تمتنع عن الضغط',
    almost: 'اضغط…',
    not: 'اضغط… لا!',
    simonGo: 'سندباد يقول: اضغط',
    simonNo: 'سندباد يقول: لا تضغط',
    newRule: 'قاعدة جديدة!',
    onlySimon: 'فقط حين يقول سندباد',
    fine: 'حسناً، أنت من طلب هذا.',
    rule: 'اضغط فقط حين أقول لك',
    ready: 'مستعد؟',
    notYet: 'ليس بعد',
    enough: 'يكفي هذا!',
    time: 'انتهى الوقت.',
    twoDonts: 'نفي النفي إثبات!',
    readAll: 'اقرأ حتى النهاية!',
    slow: 'تأخرت!',
    score: 'النقاط',
    best: 'أفضل نتيجة',
    newBest: 'رقم قياسي جديد!',
    again: 'العب مرة أخرى',
    leave: 'العودة إلى الموقع',
    exit: 'أغلق اللعبة',
    mute: 'أوقف الصوت',
    unmute: 'شغّل الصوت',
    press1: 'اضغط الزر',
    strikes: 'الأخطاء',
    offender: ['مخالف متكرر', 'قيل لك ذلك ثلاث مرات.'],
    ranks: [
      ['مواطن مطيع', 'بالكاد لمسته. بدأنا نقلق عليك.'],
      ['متفرّج فضولي', 'نظرت إلى الزر، فنظر إليك.'],
      ['عاشق الأزرار', 'القواعد عندك مجرد اقتراحات، أليس كذلك؟'],
      ['كاسر قواعد محترف', 'قرأت كل كلمة، ثم ضغطت على أي حال.'],
      ['خطر على المجتمع', 'لقد أخبرنا والدتك بكل شيء.'],
    ],
  },
}

// The largest size at which some words fit their box, wrapping onto lines as needed.
const fitted = new Map<string, number>()
export function fitText(box: HTMLElement, text: string, largest: number, smallest: number) {
  box.textContent = text
  const key = `${text}|${box.clientWidth}|${box.clientHeight}`
  let size = fitted.get(key)
  if (size === undefined) {
    size = largest
    for (; size > smallest; size -= Math.max(1, size * 0.06)) {
      box.style.fontSize = `${size}px`
      if (box.scrollWidth <= box.clientWidth + 1 && box.scrollHeight <= box.clientHeight + 1) break
    }
    fitted.set(key, size)
  }
  box.style.fontSize = `${size}px`
}

// The CSS matrix that lays a w by h box onto four corners: its top left, top right, bottom right and bottom left.
export function quadMatrix(w: number, h: number, q: readonly (readonly number[])[]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2, dx2 = x3 - x2, sx = x0 - x1 + x2 - x3
  const dy1 = y1 - y2, dy2 = y3 - y2, sy = y0 - y1 + y2 - y3
  const det = dx1 * dy2 - dx2 * dy1
  const g = (sx * dy2 - dx2 * sy) / det, k = (dx1 * sy - sx * dy1) / det
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3
  const d = y1 - y0 + g * y1, e = y3 - y0 + k * y3
  return `matrix3d(${[a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1].join(',')})`
}
