// Island soundscape, generated live with Web Audio (no audio files): waves
// that breathe in and out (louder near the shore), birds by day, crickets
// by night, and the odd gull over the water. Footsteps live in sound.js.

import { ac } from './sound.js';
import { save } from './save.js';

let bus = null, waveGain = null, noiseSrc = null, timer = null;
let on = false, seaLevel = 0.5, nextCall = 0, t0 = 0;

function noiseBuffer(a, seconds = 2) {
  const len = Math.floor(a.sampleRate * seconds), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } // brown-ish
  return buf;
}

function chirp(a, t, f0, f1, dur, vol, type = 'sine') {
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.02);
}

function tick() {
  const a = ac();
  if (!a || !on) return;
  const now = a.currentTime;
  // Waves: a slow swell every ~7 s, scaled by how much sea is in view.
  const swell = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(((now - t0) / 7) * Math.PI * 2)) ** 2;
  waveGain.gain.setTargetAtTime(0.9 * swell * (0.25 + 0.75 * seaLevel), now, 0.4);
  if (now < nextCall) return;
  const night = document.body.dataset.time === 'night';
  if (night) {
    // Crickets: a few quick pulses.
    for (let i = 0; i < 6; i++) chirp(a, now + i * 0.06, 4600, 4500, 0.03, 0.05);
    nextCall = now + 1.2 + Math.random() * 2.5;
  } else if (seaLevel > 0.4 && Math.random() < 0.3) {
    // A gull: "kee-ow".
    chirp(a, now, 1500, 820, 0.35, 0.05, 'sawtooth');
    chirp(a, now + 0.4, 1400, 900, 0.25, 0.035, 'sawtooth');
    nextCall = now + 5 + Math.random() * 6;
  } else {
    // A small bird: two to four bright twitters.
    const n = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 1400;
    for (let i = 0; i < n; i++) chirp(a, now + i * 0.13, base, base * (1.3 + Math.random() * 0.4), 0.08, 0.07);
    nextCall = now + 2.5 + Math.random() * 5;
  }
}

export function startAmbience() {
  const a = ac();
  if (!a) return;
  if (!bus) {
    bus = a.createGain(); bus.gain.value = 0; bus.connect(a.destination);
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650;
    waveGain = a.createGain(); waveGain.gain.value = 0;
    noiseSrc = a.createBufferSource(); noiseSrc.buffer = noiseBuffer(a); noiseSrc.loop = true;
    noiseSrc.connect(f).connect(waveGain).connect(bus); noiseSrc.start();
    t0 = a.currentTime;
  }
  on = true;
  refreshAmbience();
  if (!timer) timer = setInterval(tick, 200);
}

export function stopAmbience() {
  on = false;
  if (bus) bus.gain.setTargetAtTime(0, ac().currentTime, 0.4);
}

export function refreshAmbience() {
  if (!bus) return;
  bus.gain.setTargetAtTime(on && !save.get().muted ? 0.09 : 0, ac().currentTime, 0.4);
}

// 0 (inland) … 1 (surrounded by sea).
export function setSeaLevel(v) { seaLevel = Math.max(0, Math.min(1, v)); }
