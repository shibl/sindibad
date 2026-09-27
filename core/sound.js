// Tiny synthesized sound effects (Web Audio) — no audio files to download,
// so they cost nothing offline. Muting is remembered in the save.

import { save } from './save.js';

let ctx;
export function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { at = 0, dur = 0.15, type = 'sine', vol = 0.18, slide = 0 } = {}) {
  if (save.get().muted) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise({ dur = 0.8, vol = 0.08, from = 400, to = 1600 } = {}) {
  if (save.get().muted) return;
  const a = ac(); if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass';
  f.frequency.setValueAtTime(from, a.currentTime);
  f.frequency.exponentialRampToValueAtTime(to, a.currentTime + dur);
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

// A pentatonic-ish palette so everything sounds friendly together.
export const sfx = {
  tap: () => tone(660, { dur: 0.07, type: 'triangle', vol: 0.12 }),
  good: () => { tone(784, { dur: 0.12, type: 'triangle' }); tone(1047, { at: 0.09, dur: 0.18, type: 'triangle' }); },
  bad: () => tone(220, { dur: 0.22, type: 'sawtooth', vol: 0.06, slide: 0.7 }),
  reveal: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.3, type: 'sine', vol: 0.12 })),
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, { at: i * 0.11, dur: 0.24, type: 'triangle', vol: 0.15 })),
  star: (i = 0) => tone(880 * (1 + i * 0.25), { dur: 0.25, type: 'sine', vol: 0.16 }),
  // A soft "voice" blip for dialogue text; each speaker has their own pitch.
  blip: (f = 520) => tone(f * (0.92 + Math.random() * 0.16), { dur: 0.045, type: 'square', vol: 0.025 }),
  sail: () => noise({ dur: 1.2, vol: 0.06, from: 300, to: 900 }),
};

export function toggleMute() {
  save.update(s => { s.muted = !s.muted; });
  return save.get().muted;
}
