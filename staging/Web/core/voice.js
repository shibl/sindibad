// Read-aloud for weaker readers: speaks Arabic text with the device's own
// speech voice (offline on most phones). Hidden when no Arabic voice exists.

let arabic = null;

function findVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  return voices.find(v => /^ar(-|_|$)/i.test(v.lang)) || null;
}

export function canSpeak() {
  arabic = arabic || findVoice();
  return !!arabic;
}

if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => { arabic = findVoice(); document.dispatchEvent(new Event('voices-ready')); });

// Strip markup and speak.
export function speak(html) {
  if (!canSpeak()) return;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/[🧩🔬🩺🔭🏰🗺️📜💎⛵🦪✔★☆]/gu, '').replace(/\s+/g, ' ').trim();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = arabic; u.lang = arabic.lang; u.rate = 0.92;
  speechSynthesis.speak(u);
}

export function stopSpeaking() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
