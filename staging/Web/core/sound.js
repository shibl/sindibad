// Made from sound.ts by tools/build.ts. Edit that file, then run: npm run build
// Tiny synthesized sound effects (Web Audio) — no audio files to download,
// so they cost nothing offline. Muting is remembered in the save.
//
// Each effect also plays its vibration (core/haptics.ts): a tap ticks, a
// right answer pulses twice, a wrong one buzzes. Vibrations have their own
// switch, so they keep working with the sound off.
import { save } from './save.js';
import { buzz } from './haptics.js';
let ctx;
export function ac() {
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC)
            return null;
        ctx = new AC();
    }
    // Never wake the sound while the game is in the background.
    if (ctx.state === 'suspended' && !document.hidden)
        ctx.resume();
    return ctx;
}
// All game sound (music, sea, effects) stops while the game is in the
// background — another tab, another app, the phone locked — and picks up
// again when the child comes back.
document.addEventListener('visibilitychange', () => {
    if (!ctx)
        return;
    if (document.hidden)
        ctx.suspend();
    else
        ctx.resume();
});
function tone(freq, { at = 0, dur = 0.15, type = 'sine', vol = 0.18, slide = 0 } = {}) {
    if (save.get().muted)
        return;
    const a = ac();
    if (!a)
        return;
    const t = a.currentTime + at;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide)
        o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
}
function noise({ dur = 0.8, vol = 0.08, from = 400, to = 1600 } = {}) {
    if (save.get().muted)
        return;
    const a = ac();
    if (!a)
        return;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(from, a.currentTime);
    f.frequency.exponentialRampToValueAtTime(to, a.currentTime + dur);
    const g = a.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
}
// A pentatonic-ish palette so everything sounds friendly together.
export const sfx = {
    tap: () => { buzz('tap'); tone(660, { dur: 0.07, type: 'triangle', vol: 0.12 }); },
    // A softer tick: something picked, a drag passing a step, a key pressed.
    tick: () => { buzz('tick'); tone(1320, { dur: 0.03, type: 'triangle', vol: 0.05 }); },
    good: () => { buzz('success'); tone(784, { dur: 0.12, type: 'triangle' }); tone(1047, { at: 0.09, dur: 0.18, type: 'triangle' }); },
    bad: () => { buzz('error'); tone(220, { dur: 0.22, type: 'sawtooth', vol: 0.06, slide: 0.7 }); },
    reveal: () => { buzz('success'); [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.3, type: 'sine', vol: 0.12 })); },
    win: () => { buzz('reward'); [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, { at: i * 0.11, dur: 0.24, type: 'triangle', vol: 0.15 })); },
    star: (i = 0) => { buzz('press'); tone(880 * (1 + i * 0.25), { dur: 0.25, type: 'sine', vol: 0.16 }); },
    // A soft "voice" blip for dialogue text; each speaker has their own pitch.
    blip: (f = 520) => tone(f * (0.92 + Math.random() * 0.16), { dur: 0.045, type: 'square', vol: 0.025 }),
    // "You got it!" — a rising fanfare for golden tokens and big rewards.
    fanfare: () => {
        buzz('reward');
        [[523, 0], [659, 0.13], [784, 0.26], [1047, 0.39]].forEach(([f, at]) => tone(f, { at, dur: 0.14, type: 'square', vol: 0.07 }));
        [[1047, 0.6], [1319, 0.6], [1568, 0.6]].forEach(([f, at]) => tone(f, { at, dur: 0.7, type: 'triangle', vol: 0.1 }));
    },
    // Footsteps: a short filtered noise tick, coloured by the ground.
    step: (kind) => {
        const grounds = { grass: [700, 0.035, 0.05], sand: [2200, 0.05, 0.035], stone: [1800, 0.028, 0.06], wood: [380, 0.05, 0.09] };
        const k = (kind && grounds[kind]) || [900, 0.04, 0.04];
        noise({ dur: k[1], vol: k[2] * (0.8 + Math.random() * 0.4), from: k[0], to: k[0] * 0.8 });
    },
    sail: () => { buzz('long'); noise({ dur: 1.2, vol: 0.06, from: 300, to: 900 }); },
};
export function toggleMute() {
    save.update((s) => { s.muted = !s.muted; });
    return save.get().muted;
}
