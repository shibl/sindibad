# Writes the game's sounds as WAV files, synthesised from scratch with no sample libraries.
#   OUT=<Assets/Audio> python3 gen_audio.py
import array, math, os, random, wave

OUT = os.environ['OUT']
SR = 32000
random.seed(3)

def write(name, data):
    peak = max(1e-6, max(abs(x) for x in data))
    gain = 0.92 / peak
    a = array.array('h', (int(max(-1, min(1, x * gain)) * 32767) for x in data))
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(a.tobytes())
    print('wrote', name, round(len(data) / SR, 2), flush=True)

def buf(sec):
    return [0.0] * int(sec * SR)

def ping(b, t, freqs, amp=1.0, decay=14.0, dur=0.5):
    """A struck piece of metal: a handful of inharmonic partials, each with its own fall."""
    i0 = int(t * SR)
    for f, a, d in freqs:
        n = int(dur * SR)
        for i in range(n):
            if i0 + i >= len(b):
                break
            tt = i / SR
            b[i0 + i] += amp * a * math.exp(-decay * d * tt) * math.sin(2 * math.pi * f * tt)

def tick(b, t, amp=1.0, dur=0.006, cut=0.6):
    """A very short burst of noise, for contact and clicks."""
    i0 = int(t * SR)
    last = 0.0
    for i in range(int(dur * SR)):
        if i0 + i >= len(b):
            break
        last += cut * (random.uniform(-1, 1) - last)
        b[i0 + i] += amp * last * (1 - i / (dur * SR)) ** 2

COIN = [(4120, 1.0, 1.0), (6380, 0.7, 1.4), (8950, 0.45, 1.9), (2730, 0.35, 0.8), (11400, 0.2, 2.6)]

b = buf(0.7); tick(b, 0, 0.8); ping(b, 0, COIN, 0.8, 11, 0.7); write('coin_pick', b)

# A coin enters the slot, rattles down the chute inside the mechanism and lands in the cash box.
b = buf(1.25)
tick(b, 0.0, 0.8, 0.012); ping(b, 0.0, COIN, 0.5, 26, 0.3)
t = 0.11
for i in range(9):
    amp = 0.9 * (0.82 ** i)
    ping(b, t, [(f * (1 - 0.012 * i), a, d) for f, a, d in COIN], amp * 0.55, 40, 0.14); tick(b, t, amp * 0.7, 0.004)
    t += 0.09 * (0.84 ** i) + 0.012
ping(b, t + 0.03, [(1900, 1, 1), (3100, 0.6, 1.4), (640, 0.7, 0.6)], 0.8, 18, 0.35); tick(b, t + 0.03, 1.0, 0.014, 0.25)
write('coin_in', b)

b = buf(0.4)
ping(b, 0, [(1400, 1, 1), (2200, 0.5, 1.2), (3600, 0.25, 2)], 0.6, 38, 0.2); tick(b, 0.0, 1.0, 0.008)
write('click', b)

# The little motor: a looped hum with gear whine and a bit of brush noise.
L = int(SR * 1.0)
b = [0.0] * L
n = 0.0
for i in range(L):
    t = i / SR
    n += 0.15 * (random.uniform(-1, 1) - n)
    ph = 2 * math.pi * t
    b[i] = 0.5 * math.sin(ph * 120) + 0.28 * math.sin(ph * 240) + 0.16 * math.sin(ph * 840) + 0.08 * math.sin(ph * 1680) + 0.35 * n
for i in range(2000):                       # a smooth loop point
    f = i / 2000
    b[L - 2000 + i] = b[L - 2000 + i] * (1 - f) + b[i] * f
write('motor', b[:L - 0])

L = int(SR * 1.0)
b = [0.0] * L
n = 0.0
for i in range(L):
    t = i / SR
    n += 0.3 * (random.uniform(-1, 1) - n)
    b[i] = 0.3 * math.sin(2 * math.pi * 196 * t) + 0.2 * math.sin(2 * math.pi * 392 * t) + 0.12 * math.sin(2 * math.pi * 1180 * t) + 0.3 * n * (0.6 + 0.4 * math.sin(2 * math.pi * 26 * t))
write('winch', b)

# The claw snapping shut: a solenoid clack and a light rattle of metal.
b = buf(0.6)
tick(b, 0, 1.0, 0.02, 0.35); ping(b, 0, [(320, 1, 0.6), (780, 0.6, 1), (2100, 0.3, 1.8), (3400, 0.15, 2.2)], 1.0, 24, 0.4)
for k in range(4):
    ping(b, 0.05 + k * 0.035, [(3900 + k * 300, 1, 1), (6100, 0.4, 1.6)], 0.14, 60, 0.08)
write('clamp', b)

b = buf(0.5)
tick(b, 0, 0.9, 0.012, 0.3); ping(b, 0, [(520, 1, 0.8), (1300, 0.5, 1.4), (2600, 0.25, 2)], 0.7, 26, 0.3)
write('release', b)

# A prize landing on the rubber tray: soft and low.
b = buf(0.5)
for i in range(int(0.3 * SR)):
    t = i / SR
    b[i] += math.exp(-22 * t) * (math.sin(2 * math.pi * (120 - 80 * t) * t) + 0.4 * math.sin(2 * math.pi * 240 * t))
tick(b, 0, 0.5, 0.02, 0.15)
write('thud', b)

def note(b, t, f, dur=0.16, amp=0.5, bright=1.0):
    """An arcade bell tone: a square-ish wave softened by decay."""
    i0 = int(t * SR)
    for i in range(int(dur * SR)):
        if i0 + i >= len(b):
            break
        tt = i / SR
        env = min(1, tt * 500) * math.exp(-5.5 * tt)
        s = sum(math.sin(2 * math.pi * f * k * tt) / k for k in (1, 3, 5)) * 0.8 + bright * 0.5 * math.sin(2 * math.pi * f * 4 * tt) * math.exp(-14 * tt)
        b[i0 + i] += amp * env * s

# The win: a run up the scale, a held chord and a shower of bells.
b = buf(2.4)
SC = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0]
t = 0
for f in SC:
    note(b, t, f, 0.26, 0.5); t += 0.085
for f in (1046.5, 1318.5, 1568.0, 2093.0):
    note(b, t, f, 1.2, 0.34)
for k in range(16):
    tt = t + 0.1 + k * 0.075
    ping(b, tt, [(random.uniform(3000, 6200), 1, 1), (random.uniform(6500, 9000), 0.4, 1.5)], 0.11, 18, 0.3)
write('win', b)

# Missing out: two falling notes, kept gentle.
b = buf(1.0)
note(b, 0, 392.0, 0.4, 0.45, 0.4); note(b, 0.2, 329.6, 0.7, 0.45, 0.4)
write('lose', b)

b = buf(0.15); note(b, 0, 1760, 0.1, 0.5, 0.5); write('tick', b)

b = buf(0.5); note(b, 0, 880, 0.1, 0.4); note(b, 0.08, 1318.5, 0.3, 0.4); write('start', b)

# The room: a low, wide murmur of machines, with the odd far off jingle.
L = int(SR * 8)
b = [0.0] * L
n = 0.0; m = 0.0
for i in range(L):
    n += 0.012 * (random.uniform(-1, 1) - n)
    m += 0.002 * (random.uniform(-1, 1) - m)
    b[i] = 4.0 * n + 7.0 * m
for k in range(9):
    t0 = random.uniform(0.2, 7.0)
    base = random.choice((523.25, 659.25, 783.99, 880.0))
    for j in range(random.randint(2, 4)):
        note(b, t0 + j * 0.09, base * (1 + 0.25 * j), 0.14, 0.018, 0.2)
for i in range(4000):
    f = i / 4000
    b[L - 4000 + i] = b[L - 4000 + i] * (1 - f) + b[i] * f
write('room', b)
print('DONE')
