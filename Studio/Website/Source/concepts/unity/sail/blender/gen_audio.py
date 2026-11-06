# Writes the game's sounds as WAV files, synthesised from scratch with no sample libraries.
#   OUT=<Assets/Audio> Blender -b --factory-startup --python gen_audio.py
import math, os, wave
import numpy as np

OUT = os.environ['OUT']
SR = 32000
rng = np.random.default_rng(9)


def write(name, x, gain=0.92, loop=False):
    x = np.asarray(x, np.float64)
    # Take out any slow drift, which would thump when a sound starts, and let one-shots end on silence rather than a click.
    x = x - lowpass(x, 28.0)
    if not loop:
        n = min(int(0.03 * SR), len(x))
        x[-n:] *= np.linspace(1, 0, n)
    peak = max(1e-6, np.abs(x).max())
    pcm = np.clip(x / peak * gain, -1, 1)
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((pcm * 32767).astype(np.int16).tobytes())
    print('wrote', name, round(len(x) / SR, 2), flush=True)


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def noise(n):
    return rng.standard_normal(n)


def lowpass(x, fc, order=1):
    """One-pole lowpass, either fixed or following a per-sample cutoff."""
    x = np.asarray(x, np.float64)
    if np.isscalar(fc):
        a = 1 - np.exp(-2 * np.pi * fc / SR)
        a = np.full(len(x), a)
    else:
        a = 1 - np.exp(-2 * np.pi * np.asarray(fc) / SR)
    for _ in range(order):
        y = np.empty(len(x))
        s = 0.0
        for i in range(len(x)):
            s += a[i] * (x[i] - s)
            y[i] = s
        x = y
    return x


def fftband(x, f0, f1, tilt=0.0):
    """Keep a band of frequencies, gently, in the frequency domain. Used for long noises where speed matters."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.clip((f - f0) / max(f0 * 0.5, 1), 0, 1) * np.clip((f1 - f) / max(f1 * 0.5, 1), 0, 1)
    if tilt:
        g = g * (np.maximum(f, 20) / 200.0) ** tilt
    return np.fft.irfft(X * g, len(x))


def loopify(x, fade=1.0):
    """Crossfades the end into the start, so a loop has no seam."""
    n = int(fade * SR)
    a = x[:-n].copy()
    k = np.linspace(0, 1, n)
    a[:n] = a[:n] * k + x[-n:] * (1 - k)
    return a


def env(n, attack, decay):
    t = np.arange(n) / SR
    return (1 - np.exp(-t / max(attack, 1e-4))) * np.exp(-t / decay)


def smooth_noise(n, rate):
    """Slow random movement, for gusts."""
    m = max(4, int(n / SR * rate))
    p = rng.random(m + 3)
    xs = np.linspace(0, m, n)
    i = xs.astype(int)
    f = xs - i
    f = f * f * (3 - 2 * f)
    return p[i] * (1 - f) + p[i + 1] * f


# ------------------------------------------------------------------- the air and water
def wind():
    n = int(16 * SR)
    a = fftband(noise(n), 120, 1500, -0.9)
    b = fftband(noise(n), 500, 4200, -0.8)
    g1 = smooth_noise(n, 0.5)
    g2 = smooth_noise(n, 1.3)
    out = a * (0.45 + 0.6 * g1) + b * 0.45 * (0.2 + g2 ** 2)
    write('wind', loopify(out, 1.5), loop=True)


def water():
    n = int(13 * SR)
    wash = fftband(noise(n), 90, 2200, -0.7)
    hiss = fftband(noise(n), 2200, 8500, -0.2)
    swell = 0.5 + 0.5 * np.sin(2 * np.pi * np.arange(n) / SR * 0.42)
    surge = smooth_noise(n, 1.1)
    out = wash * (0.35 + 0.65 * swell * surge) + hiss * 0.28 * (surge ** 1.5)
    # Small glugs and laps against the hull.
    for k in range(70):
        i = int(rng.integers(0, n - 8000))
        d = rng.uniform(0.03, 0.09)
        f0 = rng.uniform(170, 520)
        m = int(d * 4 * SR)
        t = np.arange(m) / SR
        out[i:i + m] += rng.uniform(0.25, 0.8) * np.sin(2 * np.pi * (f0 * t + 70 * t * t)) * np.exp(-t / d)
    write('water', loopify(out, 1.2), loop=True)


def fill():
    """The sail catching the wind: a whump, a rustle and the rig taking the load."""
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (70 * t - 8 * t * t)) * np.exp(-t / 0.14) * (1 - np.exp(-t / 0.012))
    cloth = fftband(noise(n), 400, 5000, -0.3) * np.exp(-t / 0.3) * (0.3 + 0.7 * smooth_noise(n, 30) ** 2)
    x = 1.0 * thump + 0.6 * cloth
    write('fill', x)


def flap():
    """Slack sailcloth rattling."""
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    rate = 16 + 8 * np.sin(t * 7)
    ph = np.cumsum(rate) / SR
    pulse = (np.sin(2 * np.pi * ph) * 0.5 + 0.5) ** 8
    x = fftband(noise(n), 300, 5200, -0.3) * pulse * np.exp(-t / 0.42)
    write('flap', x)


def creak():
    """Rope and timber under load: a slow stick-slip."""
    n = int(1.0 * SR)
    t = np.arange(n) / SR
    rate = 34 + 40 * smooth_noise(n, 5)
    ph = np.cumsum(rate) / SR
    click = (np.sin(2 * np.pi * ph) * 0.5 + 0.5) ** 24
    x = np.zeros(n)
    for f, a in ((430, 1), (760, 0.55), (1240, 0.3), (2100, 0.16)):
        x += a * np.sin(2 * np.pi * f * t) * click
    x *= np.sin(np.pi * t / t[-1]) ** 0.7
    x = lowpass(x, 3200)
    write('creak', x)


def slap():
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    x = fftband(noise(n), 90, 2600, -0.6) * np.exp(-t / 0.13) * (1 - np.exp(-t / 0.004))
    x += 0.8 * np.sin(2 * np.pi * (96 * t)) * np.exp(-t / 0.08)
    x += 0.3 * fftband(noise(n), 1800, 7000) * np.exp(-((t - 0.1) / 0.18) ** 2)
    write('slap', x)


def splash():
    n = int(0.85 * SR)
    t = np.arange(n) / SR
    x = fftband(noise(n), 500, 7000, -0.2) * np.exp(-t / 0.17) * (1 - np.exp(-t / 0.002))
    for k in range(10):
        i = int(rng.integers(0, n // 2))
        m = 3000
        tt = np.arange(m) / SR
        f = rng.uniform(380, 1100)
        x[i:i + m] += rng.uniform(0.2, 0.6) * np.sin(2 * np.pi * (f * tt + 600 * tt * tt)) * np.exp(-tt / 0.018)
    write('splash', x)


def scrape():
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    x = fftband(noise(n), 80, 1400, -0.8) * np.exp(-t / 0.42) * (0.5 + 0.5 * smooth_noise(n, 22))
    write('scrape', x)


def hoopoe():
    """The bird's own call: a soft, low, hollow oop-oop-oop."""
    n = int(1.2 * SR)
    x = np.zeros(n)
    for i, st in enumerate((0.02, 0.24, 0.46)):
        m = int(0.17 * SR)
        tt = np.arange(m) / SR
        f = 560 + 40 * np.sin(np.pi * tt / 0.17) - 70 * tt / 0.17
        ph = 2 * np.pi * np.cumsum(f) / SR
        e = np.sin(np.pi * tt / 0.17) ** 1.2
        tone = np.sin(ph) + 0.28 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
        k = int(st * SR)
        x[k:k + m] += tone * e * (1 - i * 0.05)
    x = lowpass(x, 2400)
    # A touch of open air.
    d = int(0.09 * SR)
    x[d:] += 0.16 * x[:-d]
    write('hoopoe', x)


# ------------------------------------------------------------------- music: an oud-like pluck, a bowed pad and frame drums
A4 = 440.0


def hz(semi):
    return A4 * 2 ** (semi / 12)


def pluck(f, dur=2.4, bright=0.5, gain=1.0):
    """Karplus-Strong with a soft body: close enough to a plucked oud at low volume."""
    n = int(dur * SR)
    p = int(SR / f)
    buf = lowpass(rng.uniform(-1, 1, p), 800 + 5200 * bright)
    out = np.empty(n)
    damp = 0.994 - 0.0015 * (f / 400)
    last = 0.0
    a = 0.48
    for i in range(n):
        v = buf[i % p]
        nxt = buf[(i + 1) % p]
        y = damp * (a * v + (1 - a) * nxt)
        buf[i % p] = y
        out[i] = v
    # Body resonance.
    b = np.sin(2 * np.pi * 180 * np.arange(n) / SR) * np.exp(-np.arange(n) / SR / 0.07) * 0.2
    return (out + b * bright) * gain * (1 - np.exp(-np.arange(n) / SR / 0.002))


def pad(f, dur, gain=1.0):
    """A breathy, slightly detuned reed tone, like a ney heard across water."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 4.6 * t) * np.clip(t / 0.9, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    tone = np.sin(ph) + 0.38 * np.sin(2 * ph + 0.3) + 0.12 * np.sin(3 * ph + 1.0)
    breath = fftband(noise(n), f * 0.8, f * 4.5) * 0.09
    e = np.clip(t / 0.55, 0, 1) ** 1.5 * np.clip((dur - t) / 0.9, 0, 1) ** 1.4
    return (tone + breath) * e * gain


def bellnote(f, dur=2.6, gain=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m, a, d in ((1, 1, 1.0), (2.01, 0.42, 0.6), (3.2, 0.22, 0.36), (4.27, 0.12, 0.22), (5.4, 0.07, 0.13)):
        x += a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * dur * 0.35))
    return x * gain * (1 - np.exp(-t / 0.0015))


def drum(dur=0.6, f=95, gain=1.0, slap=0.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (f * t - 18 * t * t)) * np.exp(-t / 0.13)
    x += slap * fftband(noise(n), 700, 5200) * np.exp(-t / 0.03)
    return x * gain


def mixin(buf, x, at):
    i = int(at * SR)
    m = min(len(x), len(buf) - i)
    if m > 0:
        buf[i:i + m] += x[:m]


def airy(buf, wet=0.28, times=(0.11, 0.23, 0.37, 0.53, 0.71), fb=0.5):
    """A simple spread of echoes, so the music sits in open air rather than a dry room."""
    out = buf.copy()
    g = wet
    for d in times:
        k = int(d * SR)
        out[k:] += g * lowpass(buf[:-k], 2400)
        g *= fb
    return out


# A Hijaz flavour: D, E flat, F sharp, G, A, B flat, C.
D = -7
SCALE = [D, D + 1, D + 4, D + 5, D + 7, D + 8, D + 10, D + 12, D + 13, D + 16, D + 17, D + 19]


def beautiful():
    """A rising phrase that opens out with the blossom."""
    b = np.zeros(int(8.5 * SR))
    mixin(b, pad(hz(D - 12), 8.0, 0.32), 0.0)
    mixin(b, pad(hz(D - 5), 7.4, 0.2), 0.5)
    mixin(b, pad(hz(D + 7), 6.2, 0.1), 1.6)
    t = 0.2
    for s, dt, g in ((0, 0.42, 0.8), (2, 0.42, 0.72), (3, 0.42, 0.74), (4, 0.62, 0.86), (6, 0.42, 0.7), (7, 0.42, 0.78), (9, 1.3, 0.92)):
        mixin(b, pluck(hz(SCALE[s]), 3.6, 0.42, g), t)
        t += dt
    for s in (0, 2, 4, 7):
        mixin(b, pluck(hz(SCALE[s]), 3.6, 0.3, 0.42), t + (s * 0.06))
    mixin(b, bellnote(hz(D + 24), 3.4, 0.11), t + 0.1)
    mixin(b, bellnote(hz(D + 31), 3.2, 0.07), t + 0.5)
    write('beautiful', airy(b, 0.34))


def research():
    """A clever little climbing figure, plucked and precise, that ends on a question and then answers it."""
    b = np.zeros(int(7.5 * SR))
    mixin(b, pad(hz(D - 12), 7.0, 0.22), 0.0)
    t = 0.3
    pattern = [0, 4, 2, 5, 3, 6, 4, 7, 5, 9, 7, 11]
    for i, s in enumerate(pattern):
        mixin(b, bellnote(hz(SCALE[s] + 12), 1.7, 0.2 + i * 0.008), t)
        if i % 2 == 0:
            mixin(b, pluck(hz(SCALE[s]), 2.0, 0.55, 0.34), t)
        t += 0.21
    for s in (7, 9, 11):
        mixin(b, bellnote(hz(SCALE[s] + 12), 3.0, 0.2), t)
    mixin(b, pluck(hz(SCALE[4]), 3.2, 0.4, 0.6), t)
    mixin(b, pluck(hz(SCALE[7]), 3.2, 0.4, 0.5), t + 0.02)
    write('research', airy(b, 0.3))


def play():
    """A bouncing dance over frame drums."""
    b = np.zeros(int(9.0 * SR))
    beat = 0.32
    for i in range(24):
        at = i * beat * 0.5 + 0.0
        if i % 4 == 0:
            mixin(b, drum(0.6, 92, 0.8, 0.2), at)
        elif i % 4 == 2:
            mixin(b, drum(0.3, 190, 0.34, 0.7), at)
        elif i % 2 == 1:
            mixin(b, drum(0.2, 260, 0.14, 0.9), at)
    melody = [(4, 0), (6, 1), (7, 2), (6, 3), (4, 4), (2, 5), (3, 6), (4, 8), (6, 9), (7, 10), (9, 11), (7, 12), (6, 14), (7, 15), (4, 16), (0, 18), (2, 20), (4, 22)]
    for s, step in melody:
        mixin(b, pluck(hz(SCALE[s]), 1.6, 0.58, 0.55), step * beat * 0.5)
    mixin(b, pad(hz(D - 12), 8.0, 0.1), 0.0)
    mixin(b, bellnote(hz(D + 24), 2.2, 0.2), 7.68)
    mixin(b, pluck(hz(SCALE[7]), 2.4, 0.5, 0.65), 7.68)
    mixin(b, pluck(hz(SCALE[4]), 2.4, 0.5, 0.55), 7.7)
    write('play', airy(b, 0.2))


def finale():
    """The whole voyage in one long breath: the three ideas together, resolving as the sun goes."""
    b = np.zeros(int(19 * SR))
    mixin(b, pad(hz(D - 12), 18.0, 0.34), 0.0)
    mixin(b, pad(hz(D - 5), 17.0, 0.22), 0.6)
    mixin(b, pad(hz(D + 7), 15.0, 0.14), 2.4)
    mixin(b, pad(hz(D + 12), 12.0, 0.1), 4.6)
    t = 0.5
    line = [(0, .42), (2, .42), (3, .42), (4, .84), (6, .42), (7, .42), (9, .84), (7, .42), (6, .42), (7, 1.26), (9, .42), (11, .42), (9, .84), (7, .42), (6, .42), (4, 1.26), (2, .42), (3, .42), (4, .42), (2, .84), (0, 1.68)]
    for s, dt in line:
        mixin(b, pluck(hz(SCALE[s]), 3.4, 0.42, 0.74), t)
        t += dt
    # Soft drums under the middle of it.
    for i in range(16):
        at = 3.36 + i * 0.84
        if at < 15:
            mixin(b, drum(0.7, 84, 0.34, 0.1), at)
            mixin(b, drum(0.3, 180, 0.11, 0.6), at + 0.42)
    for s in (0, 4, 7, 9):
        mixin(b, pluck(hz(SCALE[s]), 4.2, 0.3, 0.55), t + s * 0.05)
    for f, at, g in ((D + 24, t, 0.13), (D + 31, t + 0.5, 0.09), (D + 36, t + 1.0, 0.06)):
        mixin(b, bellnote(hz(f), 4.2, g), at)
    write('finale', airy(b, 0.36))


def notes():
    """A pentatonic set of plucks that sound good in any order: one for each fish."""
    pent = [D, D + 2, D + 5, D + 7, D + 9, D + 12, D + 14, D + 17]
    for i, s in enumerate(pent):
        write(f'note{i}', pluck(hz(s + 12), 1.2, 0.62, 1.0), 0.86)


def bell():
    """The big bell on the jetty, and it should feel big."""
    n = int(4.0 * SR)
    t = np.arange(n) / SR
    f = hz(D - 5)
    x = np.zeros(n)
    for m, a, d in ((0.5, 0.6, 1.8), (1, 1, 1.4), (1.19, 0.5, 1.1), (1.5, 0.3, 0.8), (2, 0.5, 0.7), (2.67, 0.22, 0.45), (3.4, 0.14, 0.3), (4.2, 0.08, 0.2)):
        x += a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / d)
    x += 0.5 * fftband(noise(n), 800, 4000) * np.exp(-t / 0.02)
    write('bell', x)


def ding():
    b = np.zeros(int(2.4 * SR))
    for i, s in enumerate((7, 9, 11)):
        mixin(b, bellnote(hz(SCALE[s] + 12), 2.0, 0.6), i * 0.09)
    write('ding', b)


def pop():
    n = int(1.3 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (70 * t)) * np.exp(-t / 0.09) * 0.8
    x += fftband(noise(n), 200, 4000, -0.3) * np.exp(-t / 0.07)
    # Crackle fading away.
    for k in range(70):
        i = int(0.1 * SR + rng.uniform(0, 1) ** 1.3 * (n - 0.2 * SR))
        m = 500
        x[i:i + m] += rng.uniform(0.1, 0.4) * rng.standard_normal(m) * np.exp(-np.arange(m) / 90) * (1 - i / n)
    write('pop', x)


def launch():
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    fc = 500 + 3800 * (t / t[-1]) ** 1.5
    x = lowpass(noise(n), fc) * np.sin(np.pi * t / t[-1]) ** 0.8
    write('launch', x)


for f in (wind, water, fill, flap, creak, slap, splash, scrape, hoopoe, beautiful, research, play, finale, notes, bell, ding, pop, launch):
    f()
print('DONE', flush=True)
