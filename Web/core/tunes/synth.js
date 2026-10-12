// The music island's instruments, made live with Web Audio — no sound files,
// so they cost nothing to download and work offline (like core/music.js).
//
// A piano, water glasses, the drum circle (dum, tak, the riq's jingles,
// claps, a woodblock tick), five folk instruments from around the world, and
// a few short tunes the lessons play (a Longa, a two-voice fugue entry).
// Everything goes through one gain node, silent when the game is muted.

import { ac } from '../sound.js';
import { save } from '../save.js';

const A4 = 440;
const LETTER = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

// 'C4' / 'F#4' / 'Bb3' → Hz (equal temperament, A4 = 440).
export function freq(note) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!m) return 0;
  const semi = LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return A4 * 2 ** (semi / 12);
}

let out = null;
function bus() {
  const a = ac();
  if (!a) return null;
  if (!out) {
    out = a.createGain();
    // A soft "room": a short feedback echo, so notes ring like a hall.
    const dry = a.createGain(), wet = a.createGain(), d = a.createDelay(0.5), fb = a.createGain(), lp = a.createBiquadFilter();
    d.delayTime.value = 0.13; fb.gain.value = 0.28; wet.gain.value = 0.22; lp.type = 'lowpass'; lp.frequency.value = 2600;
    out.connect(dry).connect(a.destination);
    out.connect(d); d.connect(lp).connect(fb).connect(d); lp.connect(wet).connect(a.destination);
  }
  out.gain.value = save.get().muted ? 0 : 0.9;
  return a;
}

function env(a, g, t, attack, peak, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function osc(a, type, f, t, stop) {
  const o = a.createOscillator();
  o.type = type; o.frequency.setValueAtTime(f, t);
  o.start(t); o.stop(stop);
  return o;
}

function noiseBuf(a, dur) {
  const len = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// A bright, bell-ish piano: a few partials that fade, higher ones faster.
export function piano(note, { at = 0, dur = 1.4, vol = 0.32 } = {}) {
  const a = bus(); if (!a) return;
  const f = typeof note === 'number' ? note : freq(note), t = a.currentTime + at;
  [[1, 1, 1], [2, 0.42, 0.7], [3, 0.18, 0.45], [4.02, 0.08, 0.3]].forEach(([k, amp, len]) => {
    const g = a.createGain(), o = osc(a, k === 1 ? 'triangle' : 'sine', f * k, t, t + dur * len + 0.1);
    env(a, g, t, 0.006, vol * amp, dur * len);
    o.connect(g).connect(out);
  });
  // the hammer's tiny knock
  const n = a.createBufferSource(), nf = a.createBiquadFilter(), ng = a.createGain();
  n.buffer = noiseBuf(a, 0.03); nf.type = 'bandpass'; nf.frequency.value = Math.min(6000, f * 4); ng.gain.value = vol * 0.25;
  n.connect(nf).connect(ng).connect(out); n.start(t);
}

// A struck glass: a pure tone with a long ring and a faint inharmonic shimmer.
export function glass(f, { at = 0, vol = 0.3 } = {}) {
  const a = bus(); if (!a) return;
  const t = a.currentTime + at;
  [[1, 1, 2.2], [2.76, 0.18, 0.7], [5.4, 0.06, 0.3]].forEach(([k, amp, len]) => {
    const g = a.createGain(), o = osc(a, 'sine', f * k, t, t + len + 0.1);
    env(a, g, t, 0.003, vol * amp, len);
    o.connect(g).connect(out);
  });
}

// The drum circle.
export function drum(kind, { at = 0, vol = 1 } = {}) {
  const a = bus(); if (!a) return;
  const t = a.currentTime + at;
  if (kind === 'dum') {
    const g = a.createGain(), o = osc(a, 'sine', 120, t, t + 0.4);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.25);
    env(a, g, t, 0.004, 0.75 * vol, 0.32);
    o.connect(g).connect(out);
  } else if (kind === 'tak' || kind === 'clap' || kind === 'riq') {
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    const dur = kind === 'riq' ? 0.22 : kind === 'clap' ? 0.12 : 0.07;
    src.buffer = noiseBuf(a, dur);
    f.type = kind === 'riq' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'riq' ? 6500 : kind === 'clap' ? 1400 : 2600;
    env(a, g, t, 0.002, (kind === 'riq' ? 0.35 : 0.55) * vol, dur);
    src.connect(f).connect(g).connect(out); src.start(t);
    if (kind === 'tak') { const g2 = a.createGain(), o = osc(a, 'triangle', 820, t, t + 0.08); env(a, g2, t, 0.002, 0.18 * vol, 0.06); o.connect(g2).connect(out); }
  } else if (kind === 'tick' || kind === 'tock') {
    const g = a.createGain(), o = osc(a, 'square', kind === 'tick' ? 1650 : 1100, t, t + 0.06), f = a.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = kind === 'tick' ? 1650 : 1100; f.Q.value = 4;
    env(a, g, t, 0.001, 0.32 * vol, 0.05);
    o.connect(f).connect(g).connect(out);
  } else if (kind === 'triangle') {
    [1, 2.4, 4.1].forEach((k, i) => { const g = a.createGain(), o = osc(a, 'sine', 2100 * k, t, t + 1.3); env(a, g, t, 0.002, 0.12 / (i + 1) * vol, 1.2); o.connect(g).connect(out); });
  }
}

// Play a rhythm: tokens q h w ee r (see worlds/grade6/tunes.js). Returns
// the onset times (in beats) and the length in seconds; `onBeat(i)` fires as
// each hit sounds, for the lights.
export function beatsOf(pattern) {
  const hits = [];
  let b = 0;
  for (const tok of pattern.split(' ').filter(Boolean)) {
    if (tok === 'ee') { hits.push(b, b + 0.5); b += 1; }
    else if (tok === 'r') b += 1;
    else { hits.push(b); b += tok === 'h' ? 2 : tok === 'w' ? 4 : 1; }
  }
  return { hits, beats: b };
}

export function playRhythm(pattern, bpm = 92, { at = 0, onHit, count = 0 } = {}) {
  const spb = 60 / bpm;
  for (let i = 0; i < count; i++) drum(i ? 'tock' : 'tick', { at: at + i * spb });
  const { hits, beats } = beatsOf(pattern);
  const t0 = at + count * spb;
  hits.forEach((h, i) => {
    drum(Number.isInteger(h) && h % 2 === 0 ? 'dum' : 'tak', { at: t0 + h * spb });
    if (onHit) setTimeout(() => onHit(i), (t0 + h * spb) * 1000);
  });
  return { hits, start: t0, seconds: t0 + beats * spb };
}

// A metronome at a tempo, for `beats` beats.
export function metronome(bpm, beats = 8, { onBeat } = {}) {
  const spb = 60 / bpm;
  for (let i = 0; i < beats; i++) {
    drum(i % 4 ? 'tock' : 'tick', { at: i * spb });
    drum(i % 2 ? 'tak' : 'dum', { at: i * spb, vol: 0.5 });
    if (onBeat) setTimeout(() => onBeat(i), i * spb * 1000);
  }
  return beats * spb;
}

// ---------- Folk instruments from around the world ----------

function voice(a, { type, f, t, dur, vol, filter, q = 1, vibrato = 0, breath = 0, attack = 0.04 }) {
  const o = osc(a, type, f, t, t + dur + 0.1), g = a.createGain(), fl = a.createBiquadFilter();
  fl.type = 'bandpass'; fl.frequency.value = filter || f * 2; fl.Q.value = q;
  if (vibrato) { const l = osc(a, 'sine', 5.5, t, t + dur + 0.1), lg = a.createGain(); lg.gain.value = f * vibrato; l.connect(lg).connect(o.frequency); }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl).connect(g).connect(out);
  if (breath) {
    const n = a.createBufferSource(), nf = a.createBiquadFilter(), ng = a.createGain();
    n.buffer = noiseBuf(a, dur); nf.type = 'bandpass'; nf.frequency.value = f * 2; nf.Q.value = 2; ng.gain.value = vol * breath;
    n.connect(nf).connect(ng).connect(out); n.start(t);
  }
}

const MOTIFS = {
  // [note, beats] — short, cheerful phrases
  balalaika: [['E4', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['A4', 0.5], ['G4', 0.5], ['E4', 1]],
  panflute: [['G4', 1], ['A4', 0.5], ['B4', 0.5], ['D5', 1.5], ['B4', 0.5], ['A4', 1], ['G4', 1.5]],
  mizmar: [['D4', 0.5], ['Eb4', 0.5], ['F#4', 1], ['G4', 0.5], ['F#4', 0.5], ['Eb4', 0.5], ['D4', 1.5]],
  harmonica: [['C4', 1], ['E4', 0.5], ['G4', 0.5], ['E4', 1], ['C4', 1], ['G3', 1.5]],
  bagpipe: [['A4', 1], ['B4', 0.5], ['C#5', 0.5], ['E5', 1], ['C#5', 0.5], ['B4', 0.5], ['A4', 1.5]],
};

export function instrument(id, { at = 0 } = {}) {
  const a = bus(); if (!a) return 0;
  const spb = 0.32, t0 = a.currentTime + at;
  let b = 0;
  if (id === 'bagpipe') voice(a, { type: 'sawtooth', f: freq('A3'), t: t0, dur: 3.2, vol: 0.09, filter: 600, q: 0.8, attack: 0.15 });
  for (const [n, len] of MOTIFS[id] || []) {
    const t = t0 + b * spb, f = freq(n), d = len * spb;
    if (id === 'balalaika') {
      // a fast tremolo strum: many quick plucks on each note
      for (let k = 0; k < Math.max(1, Math.round(d / 0.07)); k++) {
        const g = a.createGain(), o = osc(a, 'sawtooth', f, t + k * 0.07, t + k * 0.07 + 0.2), fl = a.createBiquadFilter();
        fl.type = 'lowpass'; fl.frequency.value = f * 5;
        env(a, g, t + k * 0.07, 0.003, 0.09, 0.16);
        o.connect(fl).connect(g).connect(out);
      }
    } else if (id === 'panflute') voice(a, { type: 'sine', f, t, dur: d, vol: 0.22, filter: f, q: 0.5, vibrato: 0.006, breath: 0.6, attack: 0.06 });
    else if (id === 'mizmar') voice(a, { type: 'sawtooth', f, t, dur: d, vol: 0.18, filter: 1500, q: 2.5, vibrato: 0.01, attack: 0.02 });
    else if (id === 'harmonica') { voice(a, { type: 'square', f, t, dur: d, vol: 0.09, filter: 1200, q: 1.2, vibrato: 0.008 }); voice(a, { type: 'square', f: f * 1.26, t, dur: d, vol: 0.05, filter: 1400, q: 1.2 }); }
    else if (id === 'bagpipe') voice(a, { type: 'sawtooth', f, t, dur: d, vol: 0.12, filter: 1800, q: 3, attack: 0.01 });
    b += len;
  }
  return b * spb + 0.3;
}

// ---------- Tunes the lessons play ----------

// A Longa-like run: fast, 2/4, in nahawand (the scale of many Longas).
export function longa() {
  const notes = 'D4 E4 F4 G4 A4 Bb4 C#5 D5 C#5 Bb4 A4 G4 A4 F4 E4 D4 A4 A4 Bb4 A4 G4 F4 E4 F4 G4 E4 D4 D4'.split(' ');
  const step = 60 / 152 / 2;
  notes.forEach((n, i) => piano(n, { at: i * step, dur: 0.35, vol: 0.22 }));
  [0, 4, 8, 12, 16, 20, 24].forEach(i => drum(i % 8 ? 'tak' : 'dum', { at: i * step, vol: 0.6 }));
  return notes.length * step + 0.4;
}

// A fugue's first entries: the same melody, then again lower, together.
export function canon() {
  const subject = [['G4', 1], ['C5', 1], ['B4', 0.5], ['A4', 0.5], ['G4', 1], ['F4', 0.5], ['E4', 0.5], ['D4', 1], ['C4', 2]];
  const spb = 0.36;
  const play = (shift, at) => {
    let b = 0;
    for (const [n, len] of subject) {
      const f = freq(n) / (shift ? 2 : 1);
      piano(f, { at: at + b * spb, dur: len * spb * 2, vol: shift ? 0.24 : 0.26 });
      b += len;
    }
    return b;
  };
  const len = play(false, 0);
  play(true, 4 * spb);
  return (len + 4) * spb + 0.5;
}

// Play notes one after another (a scale, a phrase).
export function phrase(notes, { step = 0.42, inst = piano } = {}) {
  notes.forEach((n, i) => inst(n, { at: i * step }));
  return notes.length * step + 0.6;
}

// A soft "aah" chord, for the choir.
export function choir({ at = 0 } = {}) {
  const a = bus(); if (!a) return;
  const t = a.currentTime + at;
  for (const n of ['C4', 'E4', 'G4', 'C5']) {
    for (const det of [-0.004, 0.004]) voice(a, { type: 'sawtooth', f: freq(n) * (1 + det), t, dur: 2.2, vol: 0.05, filter: 800, q: 1.5, vibrato: 0.004, attack: 0.3 });
  }
}
