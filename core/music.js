// Background music, generated live with Web Audio — no audio files, so it
// costs nothing to download or store offline.
//
// An oud-like pluck plays a gentle, ever-changing melody in a maqam (Arabic
// mode), over a soft darbuka in the maqsum rhythm (دُم تَك تَك دُم تَك). Each
// place has its own maqam and tempo. Quarter tones are real frequencies,
// not rounded to the piano.

import { ac } from './sound.js';
import { save } from './save.js';

// Scale steps in semitones from the tonic (fractions = quarter tones).
const MAQAM = {
  rast: [0, 2, 3.5, 5, 7, 9, 10.5, 12],      // راست — calm, "home"
  bayati: [0, 1.5, 3, 5, 7, 8, 10, 12],      // بياتي — warm, storytelling
  hijaz: [0, 1, 4, 5, 7, 8, 10, 12],         // حجاز — adventurous
  nahawand: [0, 2, 3, 5, 7, 8, 11, 12],      // نهاوند — thoughtful
  saba: [0, 1.5, 3, 4, 7, 8, 10, 12],        // صبا — tender
  ajam: [0, 2, 4, 5, 7, 9, 11, 12],          // عجم — bright
};

const THEMES = {
  title: { maqam: 'rast', tonic: 196, bpm: 84 },
  map: { maqam: 'rast', tonic: 220, bpm: 92 },
  arabic: { maqam: 'bayati', tonic: 220, bpm: 96 },
  math: { maqam: 'ajam', tonic: 247, bpm: 104 },
  science: { maqam: 'nahawand', tonic: 220, bpm: 100 },
  social: { maqam: 'hijaz', tonic: 196, bpm: 92 },
  treasure: { maqam: 'saba', tonic: 208, bpm: 80 },
};

// Maqsum: dum tak - tak dum - tak -  (8 eighth notes)
const MAQSUM = ['D', 'T', '', 'T', 'D', '', 'T', ''];

let theme = null, timer = null, nextTime = 0, step = 0, degree = 2, master = null;

function pluck(a, freq, t, dur, vol) {
  const o1 = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
  o1.type = 'triangle'; o2.type = 'sawtooth';
  o1.frequency.value = freq; o2.frequency.value = freq * 1.003;
  f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 6, t); f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const mix = a.createGain(); mix.gain.value = 0.25;
  o2.connect(mix).connect(f); o1.connect(f); f.connect(g).connect(master);
  o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}

function drum(a, kind, t) {
  if (kind === 'D') {
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.25);
  } else {
    const len = Math.floor(a.sampleRate * 0.06), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 2400; g.gain.value = 0.35;
    src.connect(f).connect(g).connect(master); src.start(t);
  }
}

function schedule() {
  const a = ac();
  if (!a || !theme) return;
  const beat = 60 / theme.bpm / 2; // eighth notes
  while (nextTime < a.currentTime + 0.3) {
    const t = nextTime;
    const hit = MAQSUM[step % 8];
    if (hit) drum(a, hit, t);
    // Melody: a gentle random walk on the maqam, resting now and then,
    // landing on the tonic at the end of each 4-bar phrase.
    const bar = Math.floor(step / 8) % 4;
    if (step % 2 === 0 || Math.random() < 0.3) {
      if (bar === 3 && step % 8 >= 4) degree = step % 8 === 6 ? 0 : 1;
      else degree = Math.max(0, Math.min(7, degree + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      if (Math.random() > 0.18) {
        const semis = MAQAM[theme.maqam][degree];
        pluck(a, theme.tonic * 2 ** (semis / 12), t, beat * (step % 4 === 0 ? 3 : 1.6), 0.22);
      }
    }
    // A low drone on the tonic every bar.
    if (step % 8 === 0) pluck(a, theme.tonic / 2, t, beat * 7, 0.12);
    nextTime += beat;
    step += 1;
  }
}

function setVolume() {
  if (!master) return;
  const a = ac();
  master.gain.setTargetAtTime(save.get().muted || save.get().musicOff ? 0 : 0.08, a.currentTime, 0.3);
}

// Switch the music to a place ('title', 'map', or an island id).
export function playMusic(place) {
  const a = ac();
  if (!a) return;
  if (!master) { master = a.createGain(); master.gain.value = 0; master.connect(a.destination); }
  const next = THEMES[place] || THEMES.map;
  if (theme !== next) { theme = next; step = 0; degree = 2; nextTime = a.currentTime + 0.1; }
  setVolume();
  if (!timer) timer = setInterval(schedule, 100);
}

export function stopMusic() {
  if (master) master.gain.setTargetAtTime(0, ac().currentTime, 0.3);
}

export const refreshMusicVolume = setVolume;
