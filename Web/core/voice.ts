// Read-aloud for weaker readers: speaks text with the device's own speech
// voice (offline on most phones). Arabic for the game's words, English for
// the English island (core/english/). A button that reads aloud is hidden
// when the phone has no voice for its language.

type Lang = 'ar' | 'en';
const voices: Partial<Record<Lang, SpeechSynthesisVoice | null>> = {};
const has = typeof window !== 'undefined' && 'speechSynthesis' in window;
// The end-to-end test (tests/e2e.mjs) plays silently: the device's voice
// speaks outside the browser, so a muted test browser would still talk.
const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;

function findVoice(lang: Lang): SpeechSynthesisVoice | null {
  if (!has) return null;
  const list = speechSynthesis.getVoices();
  const re = new RegExp(`^${lang}(-|_|$)`, 'i');
  // English: a British or American voice first, as in the book's recordings.
  if (lang === 'en') return list.find(v => /^en[-_](GB|US)/i.test(v.lang) && v.localService) || list.find(v => re.test(v.lang)) || null;
  return list.find(v => re.test(v.lang)) || null;
}

export function canSpeak(lang: Lang = 'ar'): boolean {
  voices[lang] ||= findVoice(lang);
  return !!voices[lang];
}

if (has) speechSynthesis.addEventListener?.('voiceschanged', () => { voices.ar = findVoice('ar'); voices.en = findVoice('en'); document.dispatchEvent(new Event('voices-ready')); });

// Strip markup and speak. English is read a little slower, for learners.
export function speak(html: string, lang: Lang = 'ar', { rate }: { rate?: number } = {}): void {
  if (!canSpeak(lang) || TEST) return;
  const voice = voices[lang] as SpeechSynthesisVoice;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/[🧩🔬🩺🔭🏰🗺️📜💎⛵🦪✔★☆]/gu, '').replace(/\s+/g, ' ').trim();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice; u.lang = voice.lang; u.rate = rate ?? (lang === 'en' ? 0.82 : 0.92);
  speechSynthesis.speak(u);
}

export function stopSpeaking(): void { if (has) speechSynthesis.cancel(); }
