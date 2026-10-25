// Small synthesised sounds (no audio files).
let ctx = null, master = null, noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem('lab-muted') === '1'; } catch {}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noise({ dur = 0.3, f = 1200, q = 0.8, type = 'bandpass', gain = 0.3, attack = 0.005, loop = false, f2 = null }) {
  const c = ac();
  if (!c) return null;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = loop;
  const flt = c.createBiquadFilter();
  flt.type = type;
  flt.frequency.value = f;
  flt.Q.value = q;
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  if (!loop) g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
  src.connect(flt).connect(g).connect(master);
  src.start();
  if (!loop) src.stop(t + dur + 0.05);
  return { src, g };
}

function tone(freq, dur = 0.15, { type = 'sine', gain = 0.15, when = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when;
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const loops = {};
function loopOn(name, opts) {
  if (loops[name]) return;
  loops[name] = noise({ ...opts, loop: true });
}
function loopOff(name) {
  const l = loops[name];
  if (!l) return;
  const t = ctx.currentTime;
  l.g.gain.cancelScheduledValues(t);
  l.g.gain.setValueAtTime(l.g.gain.value, t);
  l.g.gain.linearRampToValueAtTime(0, t + 0.25);
  l.src.stop(t + 0.3);
  delete loops[name];
}

export const snd = {
  get muted() { return muted; },
  toggle() {
    muted = !muted;
    try { localStorage.setItem('lab-muted', muted ? '1' : '0'); } catch {}
    if (master) master.gain.value = muted ? 0 : 0.6;
    return muted;
  },
  unlock: () => ac(),
  click: () => tone(1800, 0.04, { type: 'square', gain: 0.03 }),
  place: () => { noise({ dur: 0.08, f: 2400, q: 2, gain: 0.12 }); tone(2600, 0.06, { gain: 0.03 }); },
  glass: () => { tone(3100, 0.25, { gain: 0.05 }); tone(4650, 0.2, { gain: 0.03 }); },
  pour: () => noise({ dur: 0.9, f: 900, q: 1.5, gain: 0.12, attack: 0.1, f2: 1500 }),
  powder: () => noise({ dur: 0.45, f: 5200, q: 0.7, type: 'highpass', gain: 0.07, attack: 0.03 }),
  ignite: () => noise({ dur: 0.5, f: 300, q: 0.6, gain: 0.35, attack: 0.02, f2: 1400 }),
  strike: () => noise({ dur: 0.25, f: 3200, q: 0.8, gain: 0.25, attack: 0.005, f2: 900 }),
  pop: () => { noise({ dur: 0.18, f: 900, q: 0.4, type: 'lowpass', gain: 0.9, attack: 0.001 }); tone(120, 0.18, { gain: 0.4, type: 'triangle' }); },
  switch: () => { tone(900, 0.03, { type: 'square', gain: 0.05 }); tone(500, 0.04, { type: 'square', gain: 0.04, when: 0.03 }); },
  ok: () => { tone(660, 0.12, { gain: 0.07 }); tone(990, 0.18, { gain: 0.06, when: 0.08 }); },
  bad: () => tone(220, 0.22, { type: 'triangle', gain: 0.08 }),
  done: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.3, { gain: 0.06, when: i * 0.09 })); },
  hiss: on => (on ? loopOn('hiss', { f: 2600, q: 0.5, gain: 0.04, attack: 0.3 }) : loopOff('hiss')),
  boil: on => (on ? loopOn('boil', { f: 420, q: 1.4, gain: 0.07, attack: 0.8 }) : loopOff('boil')),
  water: on => (on ? loopOn('water', { f: 1100, q: 0.4, gain: 0.06, attack: 0.3 }) : loopOff('water')),
  hum: on => (on ? loopOn('hum', { f: 100, q: 8, gain: 0.12, attack: 0.2 }) : loopOff('hum')),
  fan: on => (on ? loopOn('fan', { f: 500, q: 0.3, type: 'lowpass', gain: 0.12, attack: 0.6 }) : loopOff('fan')),
  stopAll() { Object.keys(loops).forEach(loopOff); },
};
