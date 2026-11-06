# Every paper piece in the storybook's pop-up world, drawn as stacks of cut layers. build.py renders them with Cycles into one
# atlas and exports their outlines. All of this art is original to this project; see src/about/README.md.
import math, random
from shapes import *

INK, DARK, PINK, BLUE, MID = '#004646', '#013f3b', '#fa2a6f', '#d6ecf0', '#badfe6'
CREAM, FOAM = '#fbf4e4', '#fffcf4'
SAND, SAND2, SAND3 = '#f3ddb1', '#e4c48b', '#c9a064'
LEAF, LEAF2, LEAF3 = '#2f9a76', '#5cbd8c', '#1b6f5f'
WOOD, WOOD2, WOOD3 = '#9e6239', '#6f3f24', '#c7925f'
GOLD, GOLD2, GOLD3 = '#f2b138', '#ffd983', '#cf8a1f'
TEAL, TEAL2 = '#0f7f86', '#0a5f68'

PIECES = []


def piece(name, **kw):
    p = Piece(name, **kw)
    PIECES.append(p)
    return p


# ------------------------------------------------------------------------------------------------------------------- the sea
SEA = [
    # far to near: top colour, base colour, foam, height, amp, wavelength
    dict(n='sea1', a='#d3eff0', b='#aee2e4', h=128, amp=30, wl=118, d=0),
    dict(n='sea2', a='#aee6e6', b='#7fd3d6', h=150, amp=36, wl=136, d=1),
    dict(n='sea3', a='#84d8d8', b='#4fbcc2', h=176, amp=42, wl=156, d=2),
    dict(n='sea4', a='#57c3c6', b='#2a9faa', h=202, amp=48, wl=176, d=3),
    dict(n='sea5', a='#2fa9b0', b='#148591', h=214, amp=52, wl=196, d=4),
    dict(n='sea6', a='#14878f', b='#0a646c', h=180, amp=46, wl=216, d=5),
]
for s in SEA:
    w = 970
    p = piece(s['n'], back='#f1e9d8', edge='#eaf6f4', density=1.0, grid=70)
    seed = 40 + s['d'] * 7
    top = crest(w, s['amp'], s['wl'], seed, base=s['h'] - s['amp'])
    p.add(crest_fill(top, 0), s['a'], b=s['b'], g=(0, s['h'], 0, 0), tex=1.0)
    # The foam along the crest, thicker on the crests.
    amp = s['amp']
    fm = band(top, lambda t: 5.0 + 4.0 * math.sin(t * 71.0 + seed) ** 2)
    p.add(fm, FOAM, tex=0.5, lift=0.45)
    # Inner swells, cut as lower layers, each with its own thin foam line.
    t2 = crest(w, amp * 0.72, s['wl'] * 0.84, seed + 1, curl=0.2, base=s['h'] * 0.56 - amp * 0.72)
    mid = [(s['a'], s['b'])]
    p.add(crest_fill(t2, 0), s['b'], b=s['b'], tex=1.1, lift=1.2)
    p.add(band(t2, 3.2), s['a'], tex=0.3, lift=0.3)
    t3 = crest(w, amp * 0.55, s['wl'] * 0.68, seed + 2, curl=0.24, base=s['h'] * 0.24 - amp * 0.55)
    p.add(crest_fill(t3, 0), s['a'], b=s['b'], g=(0, s['h'] * 0.5, 0, 0), tex=1.1, lift=1.2)
    p.add(band(t3, 2.6), FOAM, tex=0.2, lift=0.3)
    # Little wave ticks painted across the strip.
    rng = random.Random(seed + 3)
    ticks = []
    for i in range(14):
        x, y = rng.uniform(-w / 2 + 20, w / 2 - 40), rng.uniform(s['h'] * 0.3, s['h'] * 0.62)
        ww = rng.uniform(16, 30)
        ticks.append(ribbon(cr([(x, y), (x + ww * 0.5, y + 4.5), (x + ww, y)], n=5), 2.6, 1.4))
    p.add(ticks, s['a'], tex=0.2, lift=0.05)


# ------------------------------------------------------------------------------------------------------------------- palms
def palm(name, h, lean, seed, frond=150, n=7, density=1.2, dark=False):
    p = piece(name, back='#f1e9d8', edge='#f4ecd9', density=density)
    rng = random.Random(seed)
    spine = cr([(0, 0), (lean * 0.25, h * 0.4), (lean * 0.7, h * 0.76), (lean, h)], n=10)
    p.add(ribbon(spine, 26, 12), WOOD, b=WOOD2, g=(-14, 0, 14, 0), tex=1.2)
    rings = []
    m = len(spine)
    for i in range(2, m - 1, 3):
        x, y = spine[i]
        wd = lerp(26, 12, i / (m - 1))
        rings.append(ell(x, y, wd * 0.52, 2.2, n=10))
    p.add(rings, WOOD2, tex=0.2, lift=0.1)
    cx, cy = lean, h
    # Fronds, back ones darker, spread from upper right, over the top, to upper left.
    back = LEAF3 if not dark else '#165a50'
    front = LEAF if not dark else LEAF3
    light = LEAF2 if not dark else LEAF
    angs = [lerp(0.1, math.pi - 0.1, (i + 0.5) / n) for i in range(n)]
    order = sorted(range(n), key=lambda i: -abs(i - (n - 1) / 2))
    for tier, (cols, sc, offs) in enumerate(((back, 1.05, 0.3), (front, 0.92, 0.0))):
        for i in order:
            a = angs[i] + offs * (0.5 if i % 2 else -0.5) + rng.uniform(-0.08, 0.08)
            L = frond * sc * rng.uniform(0.86, 1.1)
            wd = frond * 0.26 * sc
            f, sp = frond_poly = frond_(cx, cy, a, L, wd, 2.1, seed + i * 3 + tier)
            p.add(f, cols, b=light if tier else cols, g=(cx, cy, cx + math.cos(a) * L, cy + math.sin(a) * L), tex=1.0, lift=0.6)
            if tier:
                p.add(ribbon(sp[:-2], 3.0, 0.9), light, tex=0.2, lift=0.1)
    p.add([circle(cx - 8, cy - 5, 7.5, 14), circle(cx + 8, cy - 7, 7.5, 14), circle(cx + 1, cy - 14, 7, 14)], WOOD2, tex=0.8, lift=0.8)
    return p


def frond_(cx, cy, a, L, w, droop, seed):
    return frond(cx, cy, a, L, w, droop, teeth=10, seed=seed)


palm('palm_tall', 300, 46, 11, frond=170, density=1.25)
palm('palm_short', 200, -30, 12, frond=130, n=6, density=1.25)
palm('palm_far', 170, 20, 13, frond=96, n=6, density=0.9, dark=True)


# ------------------------------------------------------------------------------------------------------------------- islands
def tufts(pts, h=12):
    out = []
    for (x, y) in pts:
        out.append([(x - h * 0.8, y), (x - h * 0.3, y + h * 0.7), (x - h * 0.1, y + h * 0.1), (x + h * 0.2, y + h), (x + h * 0.4, y + h * 0.1), (x + h * 0.9, y + h * 0.6), (x + h, y)])
    return out


# The fort: a Gulf harbour fort with a wind tower.
p = piece('fort', back='#f1e9d8', edge='#fbf3e0', density=1.15)
hill = cr([(-280, 0), (-250, 44), (-186, 78), (-110, 104), (-20, 110), (86, 104), (170, 80), (236, 46), (276, 0)], n=8)
p.add(hill + [(276, -2), (-280, -2)], '#ecd3a0', b=SAND2, g=(0, 120, 0, 0), wob=2, tex=1.2)
grass = cr([(-240, 46), (-180, 88), (-90, 112), (0, 118), (92, 110), (176, 84), (232, 46), (130, 62), (40, 74), (-60, 70), (-150, 58)], closed=True, n=6)
p.add(grass, LEAF2, b=LEAF, g=(0, 118, 0, 46), wob=2, tex=1.2)
# Main wall with crenellations
wall = [(-120, 92)]
x = -120
wall += [(-120, 182)]
xs = [-120 + i * 24 for i in range(11)]
for i, x in enumerate(xs[:-1]):
    wall += [(x, 196), (x + 12, 196), (x + 12, 182), (x + 24, 182)]
wall += [(120, 92)]
p.add(wall, '#f7e7c4', b='#e7cc98', g=(0, 196, 0, 92), tex=1.0)
# Round tower left
tw = rect(-168, 84, -104, 238) + []
twr = [(-168, 84), (-104, 84), (-104, 232)]
for i in range(4, -1, -1):
    x = -168 + i * 13
    twr += [(x + 13, 248), (x + 6, 248), (x + 6, 232), (x, 232)]
p.add(twr, '#fbeed1', b='#e5c990', g=(-168, 0, -104, 0), tex=1.0)
# Wind tower right, the barjeel
bj = [(46, 96), (46, 268), (40, 268), (40, 282), (54, 282), (54, 270), (66, 270), (66, 282), (78, 282), (78, 270), (90, 270), (90, 282), (102, 282), (102, 270), (114, 270), (114, 282), (128, 282), (128, 268), (122, 268), (122, 96)]
p.add(bj, '#fff3d9', b='#ead09d', g=(46, 0, 122, 0), tex=1.0)
slots = []
for i in range(3):
    x = 56 + i * 20
    slots.append(svg(f'M {x} 196 L {x+14} 196 L {x+14} 246 Q {x+7} 260 {x} 246 Z', seg=6))
p.add(slots, DARK, b=TEAL2, g=(0, 260, 0, 196), tex=0.2, lift=0.4)
p.add(rect(44, 186, 124, 192), GOLD, tex=0.2, lift=0.4)
# Dome
dome = svg('M -66 182 C -66 222 -30 236 -20 252 C -10 236 26 222 26 182 Z', seg=10)
p.add(dome, '#27a5a3', b=TEAL, g=(-66, 0, 26, 0), tex=0.9)
p.add(ribbon([(-20, 250), (-20, 272)], 3), GOLD3, tex=0.2)
p.add(circle(-20, 262, 4.4, 10), GOLD, tex=0.2, lift=0.3)
# Gate and windows
p.add(svg('M -28 92 L -28 136 C -28 156 -8 166 0 170 C 8 166 28 156 28 136 L 28 92 Z', seg=8), '#a26a3c', tex=1.0, lift=0.5)
p.add(svg('M -20 92 L -20 134 C -20 148 -6 156 0 160 C 6 156 20 148 20 134 L 20 92 Z', seg=8), DARK, b=TEAL2, g=(0, 160, 0, 92), tex=0.2, lift=0.5)
win = []
for x in (-92, -64, 44 - 0):
    pass
for x in (-152, -128):
    win.append(svg(f'M {x} 186 L {x+12} 186 L {x+12} 206 Q {x+6} 216 {x} 206 Z', seg=5))
for x in (-84, 52, 86):
    win.append(svg(f'M {x} 128 L {x+14} 128 L {x+14} 150 Q {x+7} 162 {x} 150 Z', seg=5))
p.add(win, DARK, tex=0.2, lift=0.4)
# Sand edge and tufts in front of the walls
front = cr([(-280, 0), (-230, 40), (-150, 72), (-60, 84), (40, 86), (150, 74), (232, 42), (276, 0)], n=8) + [(276, -2), (-280, -2)]
p.add(front, SAND, b=SAND2, g=(0, 90, 0, 0), wob=2.2, tex=1.2, lift=1.4, seed=3)
p.add(tufts([(-180, 54), (-130, 68), (-40, 74), (70, 74), (170, 58)], 10), LEAF, tex=0.5, lift=0.4)

# The lighthouse on its rock
p = piece('light', back='#f1e9d8', edge='#fbf3e0', density=1.2)
rock = cr([(-190, 0), (-172, 40), (-120, 66), (-60, 92), (10, 96), (82, 84), (140, 56), (182, 0)], n=8) + [(182, -2), (-190, -2)]
p.add(rock, '#c4a06a', b='#96794f', g=(0, 96, 0, 0), wob=2.4, tex=1.6)
lh = [(-42, 76), (-28, 300), (28, 300), (42, 76)]
p.add(lh, CREAM, b='#ead9b4', g=(-42, 0, 42, 0), tex=0.8)
bands = []
for y0, y1 in ((96, 134), (172, 210), (248, 282)):
    w0 = lerp(42, 28, (y0 - 76) / 224)
    w1 = lerp(42, 28, (y1 - 76) / 224)
    bands.append([(-w0, y0), (w0, y0), (w1, y1), (-w1, y1)])
p.add(bands, TEAL, b=TEAL2, g=(-42, 0, 42, 0), tex=0.6, lift=0.5)
p.add(rrect(-40, 296, 40, 308, 3), DARK, tex=0.3, lift=0.6)
p.add(rect(-20, 308, 20, 344), GOLD2, b=GOLD, g=(-20, 0, 20, 0), tex=0.3)
p.add([rect(-8, 310, -5, 342), rect(5, 310, 8, 342)], DARK, tex=0.1, lift=0.2)
p.add(svg('M -28 344 C -22 362 -8 372 0 376 C 8 372 22 362 28 344 Z', seg=8), TEAL, tex=0.6)
p.add(circle(0, 380, 5.5, 12), GOLD, tex=0.2, lift=0.3)
p.add(svg('M -12 76 L -12 102 C -12 112 -4 118 0 120 C 4 118 12 112 12 102 L 12 76 Z', seg=6), DARK, tex=0.2, lift=0.4)
grass = cr([(-130, 52), (-70, 86), (0, 92), (78, 80), (130, 50), (60, 62), (-10, 66), (-70, 60)], closed=True, n=6)
p.add(grass, LEAF, b=LEAF2, g=(0, 92, 0, 50), wob=2, tex=1.1, lift=1.2)
p.add(tufts([(-90, 60), (-40, 74), (50, 66), (100, 52)], 11), LEAF3, tex=0.5, lift=0.4)

# The shore in the foreground: Yasmina stands behind its top edge, so her feet sit in the sand.
p = piece('shore', back='#f1e9d8', edge='#fbf3e0', density=1.0, grid=80)
top = cr([(-340, 0), (-316, 38), (-250, 66), (-150, 84), (-20, 92), (110, 92), (220, 76), (296, 48), (336, 0)], n=8)
p.add(top + [(336, -2), (-340, -2)], '#f7e6bf', b=SAND2, g=(0, 92, 0, 0), wob=2, tex=1.3)
t2 = cr([(-330, 0), (-280, 28), (-180, 46), (-40, 52), (90, 50), (210, 38), (300, 18), (330, 0)], n=8)
p.add(t2 + [(330, -2), (-330, -2)], SAND, b=SAND3, g=(0, 52, 0, 0), wob=2, tex=1.3, lift=1.2, seed=5)
p.add(ribbon(cr([(-300, 14), (-180, 26), (-30, 30), (120, 28), (260, 12)], n=8), 2.4), FOAM, tex=0.2, lift=0.2)
# Starfish and shells
p.add(star(-170, 36, 15, 6.5, 5, rot=0.3), PINK, b='#d81f62', r=(-170, 36, 15), tex=0.7, lift=0.4)
p.add(star(-170, 36, 7, 3, 5, rot=0.3), '#ff8fb2', tex=0.2, lift=0.2)
p.add(ell(120, 40, 12, 8, rot=0.3, n=16), CREAM, tex=0.2, lift=0.3)
p.add([ribbon([(114, 36), (124, 44)], 1.3), ribbon([(118, 34), (128, 42)], 1.3)], SAND3, tex=0.1, lift=0.1)
p.add(tufts([(-280, 44), (-250, 60), (248, 60), (280, 44)], 15), LEAF, tex=0.5, lift=0.5)

# A low far island, seen across the water.
p = piece('isle', back='#f1e9d8', edge='#f2ead8', density=0.95)
top = cr([(-230, 0), (-190, 26), (-130, 60), (-60, 84), (10, 66), (70, 96), (150, 62), (206, 26), (240, 0)], n=8)
p.add(top + [(240, -2), (-230, -2)], LEAF3, b=LEAF, g=(0, 96, 0, 0), wob=2.5, tex=1.3)
t2 = cr([(-210, 0), (-150, 28), (-70, 46), (20, 40), (110, 44), (190, 20), (226, 0)], n=8)
p.add(t2 + [(226, -2), (-210, -2)], LEAF2, b=LEAF, g=(0, 46, 0, 0), wob=2, tex=1.3, lift=1.1, seed=2)
t3 = cr([(-200, 0), (-110, 12), (0, 16), (120, 14), (216, 0)], n=8)
p.add(t3 + [(216, -2), (-200, -2)], SAND, tex=1.1, lift=1.0, wob=1.2, seed=4)

# The distant coast: mountains and a walled town. Two layers that stand at the back of the page.
p = piece('coast_far', back='#f1e9d8', edge='#f4f4ee', density=0.62, grid=90)
top = cr([(-500, 0), (-470, 70), (-410, 130), (-340, 110), (-260, 180), (-180, 250), (-110, 200), (-40, 160), (30, 210), (110, 290), (190, 340), (270, 280), (340, 210), (420, 150), (500, 70)], n=8)
p.add(top + [(500, -2), (-500, -2)], '#f9d9c4', b='#f2b9b0', g=(0, 340, 0, 40), wob=2.5, tex=0.9)
t2 = cr([(-500, 0), (-430, 60), (-340, 90), (-250, 70), (-140, 130), (-50, 110), (60, 150), (150, 190), (260, 130), (370, 110), (500, 40)], n=8)
p.add(t2 + [(500, -2), (-500, -2)], '#f4b9b4', b='#d9a7c4', g=(0, 190, 0, 0), wob=2, tex=0.9, lift=1.2, seed=2)

p = piece('coast_town', back='#f1e9d8', edge='#f4f4ee', density=0.8, grid=90)
base = [(-500, 0), (-500, 46), (-430, 62), (-360, 58), (-340, 60)]
# A skyline of domes, wind towers and minarets, in one silhouette.
sky = []
def b_dome(x, w, h, y):
    return bez((x, y), (x, y + h * 0.7), (x + w * 0.3, y + h * 0.8), (x + w * 0.5, y + h), n=8) + bez((x + w * 0.5, y + h), (x + w * 0.7, y + h * 0.8), (x + w, y + h * 0.7), (x + w, y), n=8, first=False)
line = [(-500, 0), (-500, 40)]
x = -500
rng = random.Random(9)
while x < 480:
    k = rng.random()
    y = 52 + 22 * math.sin(x / 110) + rng.uniform(0, 14)
    if k < 0.28:
        w = rng.uniform(46, 66)
        line += [(x, y)] + b_dome(x, w, rng.uniform(34, 50), y) + [(x + w, y)]
    elif k < 0.48:
        w = rng.uniform(16, 22)
        h = rng.uniform(70, 120)
        line += [(x, y), (x + 2, y + h), (x - 3, y + h + 3), (x - 3, y + h + 8), (x + 2, y + h + 8)] + b_dome(x + 2, w - 4, 14, y + h + 8) + [(x + w - 2, y + h + 8), (x + w + 3, y + h + 8), (x + w + 3, y + h + 3), (x + w - 2, y + h), (x + w, y)]
    elif k < 0.7:
        w = rng.uniform(28, 40)
        h = rng.uniform(38, 66)
        line += [(x, y), (x, y + h)]
        n = int(w // 8)
        for i in range(n):
            q = x + i * w / n
            line += [(q, y + h + 6), (q + w / n / 2, y + h + 6), (q + w / n / 2, y + h), (q + w / n, y + h)]
        line += [(x + w, y)]
    else:
        w = rng.uniform(36, 70)
        line += [(x, y), (x, y + rng.uniform(10, 22)), (x + w, y + rng.uniform(10, 22)), (x + w, y)]
    x += w + rng.uniform(-2, 8)
line += [(500, 40), (500, 0)]
p.add(line, '#a9c9d8', b='#7fb5c4', g=(0, 180, 0, 20), tex=0.9)
hl = cr([(-500, 0), (-500, 24), (-380, 38), (-240, 30), (-90, 46), (60, 38), (220, 48), (360, 34), (500, 22), (500, 0)], n=6)
p.add(hl, '#9ad7d6', b='#7cc8ca', g=(0, 48, 0, 0), wob=1.6, tex=1.0, lift=1.2)
# Lit windows in the town, as tiny cut-outs
rng = random.Random(10)
wins = [rrect(x, y, x + 3.4, y + 6, 1.2, n=2) for x, y in ((rng.uniform(-470, 470), rng.uniform(50, 66)) for _ in range(38))]
p.add(wins, '#fdf1c7', tex=0.1, lift=0.1)

# The coast carried on across the page opposite, low so it stays out of the words' way. +x runs toward the gutter.
p = piece('coast_left', back='#f1e9d8', edge='#f4f4ee', density=0.7, grid=90)
top = cr([(-500, 0), (-470, 26), (-400, 44), (-320, 38), (-230, 62), (-140, 86), (-60, 74), (20, 104), (110, 150), (200, 186), (290, 168), (370, 200), (450, 176), (500, 120)], n=8)
p.add(top + [(500, -2), (-500, -2)], '#f9d9c4', b='#f2b9b0', g=(0, 200, 0, 20), wob=2.2, tex=0.9)
t2 = cr([(-500, 0), (-420, 22), (-300, 26), (-180, 48), (-60, 40), (60, 66), (180, 92), (300, 84), (420, 110), (500, 78)], n=8)
p.add(t2 + [(500, -2), (-500, -2)], '#f4b9b4', b='#d9a7c4', g=(0, 110, 0, 0), wob=1.6, tex=0.9, lift=1.2, seed=2)
line = [(-500, 0), (-500, 14)]
x = -500.0
rng = random.Random(21)
while x < 480:
    k = rng.random()
    y = 22 + 26 * smooth(-500, 500, x) + rng.uniform(0, 6)
    if x < -120:
        # Out toward the edge the skyline thins to scrub.
        w = rng.uniform(30, 70)
        line += [(x, y * 0.7), (x + w * 0.5, y * 0.7 + rng.uniform(4, 11)), (x + w, y * 0.7)]
    elif k < 0.32:
        w = rng.uniform(40, 58)
        line += [(x, y)] + b_dome(x, w, rng.uniform(28, 42), y) + [(x + w, y)]
    elif k < 0.52:
        w = rng.uniform(14, 18)
        h = rng.uniform(52, 92)
        line += [(x, y), (x + 2, y + h), (x - 3, y + h + 3), (x - 3, y + h + 7), (x + 2, y + h + 7)] + b_dome(x + 2, w - 4, 11, y + h + 7) + [(x + w - 2, y + h + 7), (x + w + 3, y + h + 7), (x + w + 3, y + h + 3), (x + w - 2, y + h), (x + w, y)]
    else:
        w = rng.uniform(28, 62)
        line += [(x, y), (x, y + rng.uniform(10, 24)), (x + w, y + rng.uniform(10, 24)), (x + w, y)]
    x += w + rng.uniform(-2, 8)
line += [(500, 16), (500, 0)]
p.add(line, '#a9c9d8', b='#7fb5c4', g=(0, 130, 0, 10), tex=0.9)
hl = cr([(-500, 0), (-500, 10), (-330, 16), (-160, 12), (0, 22), (170, 18), (340, 26), (500, 18), (500, 0)], n=6)
p.add(hl, '#9ad7d6', b='#7cc8ca', g=(0, 26, 0, 0), wob=1.2, tex=1.0, lift=1.2)

# ---------------------------------------------------------------------------------------------------------------- the dhow
p = piece('hull', back='#f1e9d8', edge='#e8c99a', density=1.5, grid=90)
outline = (
    [(-256, 214)] + bez((-256, 214), (-250, 200), (-246, 196), (-180, 190), 6, first=False)
    + bez((-180, 190), (-120, 170), (-70, 128), (-20, 122), 12, first=False)
    + bez((-20, 122), (80, 114), (140, 122), (196, 150), 10, first=False)
    + bez((196, 150), (232, 168), (268, 196), (306, 244), 10, first=False)
    + bez((306, 244), (284, 170), (250, 92), (176, 30), 12, first=False)
    + bez((176, 30), (100, -6), (-110, -8), (-206, 26), 12, first=False)
    + bez((-206, 26), (-240, 70), (-250, 150), (-256, 214), 10, first=False)
)
p.add(outline, '#b5743f', b=WOOD2, g=(0, 170, 0, 0), tex=1.4)
sheer = bez((-180, 190), (-120, 170), (-70, 128), (-20, 122), 12) + bez((-20, 122), (80, 114), (140, 122), (196, 150), 10, first=False) + bez((196, 150), (232, 168), (268, 196), (306, 244), 10, first=False)
# Planks follow the sheer
def under(line, d):
    return [(x, y - d(x) if callable(d) else y - d) for x, y in line]
planks = []
for d in (48, 72, 96):
    a = [q for q in under(sheer, d) if q[1] > 8 and q[0] < 250 - d * 0.7 and q[0] > -226 + d * 0.15]
    planks.append(ribbon(a, 2.0))
p.add(planks, WOOD2, tex=0.2, lift=0.1)
# A painted band under the rail
sb = [q for q in under(sheer, 25) if q[0] < 262]
p.add(ribbon(sb, 20, 12), TEAL, b=TEAL2, g=(0, 170, 0, 90), tex=0.8, lift=0.5)
sb2 = [q for q in under(sheer, 37) if q[0] < 250]
p.add(ribbon(sb2, 3.0), GOLD2, tex=0.2, lift=0.3)
# Little painted triangles along the band
tri = []
for i in range(1, len(sb) - 2, 2):
    x, y = sb[i]
    if -150 < x < 200:
        tri.append([(x - 4, y - 5.5), (x + 4, y - 5.5), (x, y + 5.5)])
p.add(tri, CREAM, tex=0.1, lift=0.2)
p.add(ribbon(sheer, 9, 6), CREAM, b='#e9d5aa', g=(0, 190, 0, 110), tex=0.5, lift=0.8)
# Pink keel stripe, the accent
kl = bez((-206, 34), (-110, 2), (100, 4), (176, 38), 16)
p.add(ribbon(kl, 7), PINK, tex=0.5, lift=0.5)
# The raised stern with its windows
st = [(-256, 214), (-176, 200), (-168, 150), (-240, 118)]
p.add(st, '#fbf0d8', b='#e7cf9f', g=(0, 214, 0, 118), tex=0.7, lift=0.8)
wins = []
for i, (x, y) in enumerate(((-234, 164), (-214, 162), (-194, 160))):
    wins.append(svg(f'M {x} {y} L {x+13} {y} L {x+13} {y+18} Q {x+6.5} {y+30} {x} {y+18} Z', seg=6))
p.add(wins, TEAL2, b=DARK, g=(0, 194, 0, 160), tex=0.2, lift=0.4)
p.add(ribbon([(-250, 148), (-172, 142)], 4), GOLD, tex=0.2, lift=0.3)
p.add(ribbon([(-256, 214), (-174, 200)], 7), WOOD2, tex=0.5, lift=0.4)
p.add(circle(302, 240, 8.5, 16), GOLD, b=GOLD3, r=(300, 242, 9), tex=0.2, lift=0.6)
# Deck bits sticking over the rail: a crate and a jar
p.add(rrect(-100, 134, -62, 176, 3), '#c99a63', b=WOOD, g=(-100, 0, -62, 0), tex=1.3, z=0)

p = piece('sail', back='#f1e9d8', edge='#fff8ea', density=1.3, grid=70)
p.add(ribbon([(-6, 0), (-30, 470)], 15, 8), WOOD, b=WOOD2, g=(-20, 0, 0, 0), tex=1.2)
sailo = bez((200, 92), (70, 240), (-70, 390), (-204, 494), 22) + bez((-204, 494), (-240, 370), (-252, 200), (-176, 40), 18, first=False) + bez((-176, 40), (-80, 18), (70, 34), (200, 92), 18, first=False)
p.add(sailo, FOAM, b='#ecdfc6', g=(-180, 300, 120, 60), tex=1.1, lift=1.2)
# Seams: panels of cloth
seams = []
for i in range(1, 7):
    t = i / 7
    x0 = lerp(-176, 200, t)
    y0 = 40 + 44 * (t - 0.42) ** 2 * 5 - 18 * math.sin(t * math.pi)
    x1 = lerp(-204, 200, t)
    y1 = lerp(494, 92, t)
    seams.append(ribbon(cr([(x0, y0), (lerp(x0, x1, 0.5) - 14 * (1 - t), lerp(y0, y1, 0.5)), (x1, y1)], n=10), 1.7))
p.add(seams, '#d9c8a6', tex=0.1, lift=0.08)
# Two pink stripes along the foot, clipped by the sail's own shape
def footband(a, b):
    top, low = [], []
    for k in range(25):
        t = k / 24
        x, y = bez((-176, 40), (-80, 18), (70, 34), (200, 92), 24)[k]
        ins = 1 - abs(2 * t - 1) ** 8
        low.append((x + 0.0, y + a * ins + 1.5))
        top.append((x - 0.0, y + b * ins + 2.0))
    return low + top[::-1]
p.add(footband(14, 40), PINK, b='#de2164', g=(-180, 0, 200, 0), tex=0.6, lift=0.3)
p.add(footband(50, 60), PINK, b='#de2164', g=(-180, 0, 200, 0), tex=0.6, lift=0.3)
# A gold sun stamped on the sail
p.add(circle(-82, 236, 44, 40), GOLD, b=GOLD3, r=(-92, 246, 50), tex=0.5, lift=0.3)
p.add(star(-82, 236, 34, 18, 8, rot=0.2), GOLD2, tex=0.2, lift=0.2)
p.add(circle(-82, 236, 12, 20), FOAM, tex=0.1, lift=0.2)
# Yard and ropes
p.add(ribbon(bez((208, 84), (70, 240), (-70, 396), (-214, 504), 18), 8.5, 5), WOOD2, b=WOOD, g=(0, 0, 100, 100), tex=1.0, lift=1.1)
p.add([ribbon([(-30, 440), (-178, 44)], 2.2), ribbon([(-22, 300), (196, 96)], 2.2)], '#6f5a44', tex=0.1, lift=0.3)

p = piece('flag', back='#f1e9d8', edge='#ffd0df', density=1.5, grid=30)
p.add(cr([(0, 0), (40, -4), (82, -18), (128, -8), (98, 8), (128, 34), (86, 26), (44, 34), (0, 40)], n=7), PINK, b='#d81f62', g=(0, 0, 128, 0), tex=0.8)

# ---------------------------------------------------------------------------------------------------------------- Yasmina
SKIN, SKIN2, HAIR, HAIR2 = '#cf9266', '#b67a50', '#2a1a1e', '#46282c'
p = piece('yasmina', back='#f1e9d8', edge='#fbf3e0', density=2.1)
p.add(ell(0, 268, 67, 64), HAIR, tex=0.4)
# Legs and shoes
p.add([rrect(-34, 14, -8, 104, 9), rrect(8, 14, 34, 104, 9)], TEAL, b=TEAL2, g=(-34, 0, 34, 0), tex=0.8)
p.add([ell(-23, 11, 22, 11, n=20), ell(23, 11, 22, 11, n=20)], DARK, tex=0.5)
p.add([ribbon([(-37, 14), (-8, 16)], 4), ribbon([(8, 16), (37, 14)], 4)], GOLD, tex=0.2, lift=0.2)
# Dress
dress = svg('M -28 200 C -34 170 -48 120 -70 66 Q 0 48 70 66 C 48 120 34 170 28 200 Q 0 208 -28 200 Z')
p.add(dress, '#ff3d7f', b='#d51c5e', g=(-70, 0, 70, 0), tex=0.8)
hem = bez((-68, 70), (-30, 56), (30, 56), (68, 70), 16)
p.add(ribbon(hem, 20), CREAM, tex=0.3, lift=0.4)
dia = []
for i in range(1, 16, 2):
    x, y = hem[i]
    dia.append([(x, y - 6.5), (x + 5, y), (x, y + 6.5), (x - 5, y)])
p.add(dia, TEAL, tex=0.1, lift=0.2)
p.add(ribbon(bez((-64, 82), (-30, 68), (30, 68), (64, 82), 16), 2.6), GOLD, tex=0.1, lift=0.2)
# Vest and sash
p.add([svg('M -27 198 C -30 178 -33 158 -35 146 L -9 138 L -6 202 Q -18 204 -27 198 Z', seg=6), svg('M 27 198 C 30 178 33 158 35 146 L 9 138 L 6 202 Q 18 204 27 198 Z', seg=6)], TEAL, b=TEAL2, g=(0, 202, 0, 138), tex=0.7, lift=0.5)
p.add([ribbon([(-7, 200), (-10, 140)], 2.4), ribbon([(7, 200), (10, 140)], 2.4)], GOLD2, tex=0.1, lift=0.2)
p.add(ribbon(bez((-37, 146), (-16, 138), (16, 138), (37, 146), 10), 15), GOLD, b=GOLD3, g=(0, 150, 0, 130), tex=0.4, lift=0.5)
p.add(svg('M -6 134 L -14 92 L -2 100 L 4 88 L 7 134 Z', seg=4), GOLD, b=GOLD3, g=(0, 134, 0, 90), tex=0.3, lift=0.2)
# The arm that stays down
arm = cr([(-26, 188), (-46, 158), (-58, 122)], n=8)
p.add(ribbon(arm, 25, 20), '#ff3d7f', b='#c91c59', g=(-70, 0, -26, 0), tex=0.7, lift=0.8)
p.add(ribbon([(-54, 128), (-60, 113)], 21), CREAM, tex=0.2, lift=0.2)
p.add(circle(-62, 102, 11.5, 18), SKIN, tex=0.3, lift=0.3)
# Neck and head
p.add(rrect(-12, 190, 12, 218, 5), SKIN2, tex=0.3)
p.add([ell(-54, 254, 8, 11, n=14), ell(54, 254, 8, 11, n=14)], SKIN2, tex=0.2)
p.add(svg('M -54 262 C -54 296 -30 312 0 312 C 30 312 54 296 54 262 C 54 228 32 204 0 204 C -32 204 -54 228 -54 262 Z'), '#d99b6e', b=SKIN, g=(0, 300, 0, 206), tex=0.3, lift=0.8)
p.add([ell(-33, 233, 12, 7.5, n=16), ell(33, 233, 12, 7.5, n=16)], '#e88a7a', tex=0.1, lift=0.05)
# Eyes
p.add([ell(-21, 254, 13.5, 16, n=20), ell(21, 254, 13.5, 16, n=20)], FOAM, tex=0.05, lift=0.15)
p.add([ell(-19, 253, 10, 13, n=18), ell(19, 253, 10, 13, n=18)], '#2b1a14', tex=0.05, lift=0.1)
p.add([circle(-16, 258, 3.6, 10), circle(22, 258, 3.6, 10), circle(-22, 248, 1.7, 8), circle(16, 248, 1.7, 8)], '#ffffff', tex=0, lift=0.1)
p.add([ribbon(cr([(-37, 262), (-24, 272), (-8, 266)], n=6), 3.6, 2), ribbon(cr([(8, 266), (24, 272), (37, 262)], n=6), 2, 3.6)], HAIR, tex=0.05, lift=0.1)
p.add([ribbon(cr([(-34, 282), (-22, 288), (-8, 284)], n=5), 2.8), ribbon(cr([(8, 284), (22, 288), (34, 282)], n=5), 2.8)], HAIR, tex=0.05, lift=0.1)
p.add(ell(0, 238, 3.4, 2.4, n=10), SKIN2, tex=0, lift=0.05)
p.add(svg('M -13 226 C -6 222 6 222 13 226 C 8 214 -8 214 -13 226 Z', seg=7), '#a2333f', tex=0, lift=0.05)
p.add(svg('M -9 225 C -4 223 4 223 9 225 C 5 221 -5 221 -9 225 Z', seg=5), FOAM, tex=0, lift=0.03)
# Fringe, centre-parted
p.add([svg('M -1 318 C -34 320 -60 296 -58 252 C -50 272 -30 288 -2 292 Z'), svg('M 1 318 C 34 320 60 296 58 252 C 50 272 30 288 2 292 Z')], HAIR, b=HAIR2, g=(0, 322, 0, 280), tex=0.4, lift=0.7)
# Headband and flower
hb = bez((-58, 276), (-40, 304), (40, 304), (58, 276), 16)
p.add(ribbon(hb, 13), TEAL, b=TEAL2, g=(-58, 0, 58, 0), tex=0.4, lift=0.5)
p.add([circle(x, y, 2.3, 8) for (x, y) in hb[2::3]], GOLD2, tex=0, lift=0.1)
petals = [ell(40 + 11.5 * math.cos(a), 302 + 11.5 * math.sin(a), 8.8, 6.6, rot=a, n=12) for a in [TAU * i / 5 + 0.3 for i in range(5)]]
for i, pet in enumerate(petals):
    p.add(pet, FOAM, tex=0.1, lift=0.12)
p.add(circle(40, 302, 5.6, 12), GOLD, tex=0.1, lift=0.15)
# Braids in front of the shoulders
def braid(x0, x1, sign):
    pts = cr([(x0, 258), (x0 + sign * 12, 222), (x0 + sign * 16, 176), (x1, 118)], n=10)
    def w(t):
        return lerp(27, 15, t) * (0.82 + 0.18 * abs(math.sin(t * 7.5 * math.pi)))
    p.add(ribbon(pts, w), HAIR, b=HAIR2, g=(x0 + sign * 16 - 14, 0, x0 + sign * 16 + 14, 0), tex=0.35, lift=0.8)
    lines = []
    for i in range(3, len(pts) - 2, 4):
        a, b = pts[i], pts[i + 1]
        lines.append(ribbon([(a[0] - lerp(11, 6, i / len(pts)), a[1] + 3), (a[0] + lerp(11, 6, i / len(pts)), a[1] - 3)], 1.7))
    p.add(lines, HAIR2, tex=0.05, lift=0.08)
    p.add(rrect(x1 - 9, 108, x1 + 9, 118, 3), PINK, tex=0.1, lift=0.3)
    p.add(svg(f'M {x1-8} 108 L {x1+8} 108 L {x1+4} 92 L {x1} 96 L {x1-5} 90 Z', seg=4), HAIR, tex=0.2, lift=0.2)
braid(-52, -60, -1)
braid(52, 66, 1)

# The waving arm: origin at the shoulder, reaching up and out to the right
p = piece('yas_arm', back='#f1e9d8', edge='#ffd0df', density=2.1)
p.add(ribbon(cr([(0, 0), (20, 34), (42, 74)], n=8), 25, 19), '#ff3d7f', b='#c91c59', g=(-14, 0, 40, 0), tex=0.7)
p.add(ribbon([(37, 66), (46, 82)], 21), CREAM, tex=0.2, lift=0.3)
p.add(circle(51, 94, 12, 18), '#d99b6e', tex=0.3, lift=0.4)
p.add([ell(45, 105, 3.6, 7, rot=0.2, n=8), ell(52, 108, 3.6, 7, n=8), ell(59, 105, 3.6, 7, rot=-0.2, n=8)], '#d99b6e', tex=0.1, lift=0.1)

# ---------------------------------------------------------------------------------------------------------------- the hoopoe
C1, C2, C3 = '#ee9b4d', '#f7c88c', '#d67a2e'
p = piece('hoopoe', back='#f1e9d8', edge='#fce2bf', density=2.4)
# Tail feathers
tail = []
for i, a in enumerate((-0.42, -0.26, -0.1)):
    tail.append(xform(svg('M 0 -8 C 40 -12 90 -12 118 -10 C 124 -4 124 4 118 10 C 90 12 40 12 0 8 Z', seg=6), 54, 44, rot=a))
for t in tail[:1]:
    p.add(t, '#16120f', tex=0.3)
p.add(tail[1], '#231b17', tex=0.3, lift=0.5)
p.add(tail[2], '#16120f', tex=0.3, lift=0.5)
p.add(xform(rect(70, -11, 86, 11), 54, 44, rot=-0.26), FOAM, tex=0.1, lift=0.2)
# Body
body = cr([(-90, 96), (-74, 62), (-52, 28), (-10, 6), (42, 14), (76, 40), (56, 72), (10, 96), (-32, 112), (-66, 122), (-88, 112)], closed=True, n=8)
p.add(body, C1, b=C3, g=(-40, 110, 40, 10), tex=0.8)
belly = cr([(-74, 62), (-52, 30), (-10, 10), (34, 16), (6, 40), (-34, 60)], closed=True, n=8)
p.add(belly, C2, tex=0.5, lift=0.3)
# Beak
p.add(ribbon(cr([(-88, 106), (-126, 106), (-172, 82)], n=10), 12, 1.6), '#2d211c', tex=0.2, lift=0.8)
# Eye
p.add(circle(-66, 102, 10, 18), FOAM, tex=0, lift=0.3)
p.add(circle(-67, 102, 7, 16), '#17100d', tex=0, lift=0.2)
p.add(circle(-69, 105, 2.4, 8), '#ffffff', tex=0, lift=0.1)
# Feet
p.add([ribbon([(-14, 8), (-20, -18)], 3.4), ribbon([(10, 8), (8, -18)], 3.4)], '#6f4a33', tex=0.1, z=0)

p = piece('hoopoe_wing', back='#f1e9d8', edge='#fce2bf', density=2.4)
wing = cr([(-30, 6), (24, 10), (78, -8), (120, -38), (98, -66), (46, -78), (-4, -62), (-34, -30)], closed=True, n=8)
p.add(wing, '#191410', tex=0.4)
bars = []
for i, x in enumerate((-2, 24, 50, 76)):
    bars.append(ribbon(cr([(x + 8, -2 - i * 2), (x + 2, -34 - i * 2), (x - 16, -70 + i * 6)], n=6), 11, 8))
p.add(bars, FOAM, tex=0.2, lift=0.5)
p.add(cr([(-30, 6), (24, 10), (52, 0), (10, -14), (-22, -14)], closed=True, n=6), C1, b=C3, g=(-30, 6, 50, -8), tex=0.6, lift=0.5)

p = piece('hoopoe_crest', back='#f1e9d8', edge='#fce2bf', density=2.4)
for i, a in enumerate((2.5, 2.2, 1.9, 1.6, 1.3, 1.0)):
    L = 66 - abs(i - 2.4) * 4
    f = xform(svg(f'M 0 -5 C {L*0.4} -9 {L*0.8} -9 {L} -3 C {L+3} 0 {L+3} 3 {L} 5 C {L*0.8} 9 {L*0.4} 9 0 5 Z', seg=5), 0, 0, rot=a)
    p.add(f, C1, b=C3, g=(0, 0, math.cos(a) * L, math.sin(a) * L), tex=0.4, lift=0.5)
    t1 = xform(rect(L * 0.72, -6.5, L * 0.84, 6.5), 0, 0, rot=a)
    p.add(t1, FOAM, tex=0, lift=0.1)
    t2 = xform(svg(f'M {L*0.84} -6.5 L {L} -3 C {L+3} 0 {L+3} 3 {L} 5 L {L*0.84} 6.5 Z', seg=3), 0, 0, rot=a)
    p.add(t2, '#17100d', tex=0, lift=0.1)

# A dolphin, for whoever pulls the tab. Drawn level, nose to the right; the rig arcs it through the air.
p = piece('dolphin', back='#f1e9d8', edge='#eaf6f4', density=1.7)
body = cr([(-150, -12), (-110, 6), (-50, 30), (20, 40), (84, 28), (126, 16), (160, 8), (128, -4), (78, -18), (10, -30), (-60, -26), (-118, -14)], closed=True, n=8)
p.add(body, '#3f93a8', b='#1f6f86', g=(0, 42, 0, -30), tex=0.6)
belly = cr([(128, -2), (78, -16), (10, -28), (-60, -24), (-100, -14), (-40, -8), (30, -6), (90, 2)], closed=True, n=8)
p.add(belly, '#eef6f1', b='#cfe6e4', g=(0, 0, 0, -28), tex=0.3, lift=0.4)
p.add(svg('M -8 38 C -18 58 -36 72 -56 76 C -48 60 -44 44 -46 30 Z', seg=8), '#2b7f96', b='#1f6f86', g=(-50, 70, -20, 30), tex=0.5, z=0)
p.add(svg('M -148 -12 C -176 2 -196 22 -210 44 C -204 22 -196 6 -184 -8 C -198 -22 -208 -40 -214 -62 C -194 -44 -172 -30 -146 -20 Z', seg=8), '#2b7f96', b='#1f6f86', g=(-210, 40, -150, -10), tex=0.5, z=0)
p.add(svg('M 26 -8 C 18 -26 4 -42 -14 -50 C -14 -36 -8 -20 0 -8 Z', seg=7), '#2b7f96', tex=0.4, lift=0.5)
p.add(circle(104, 18, 5, 12), '#10262c', tex=0, lift=0.2)
p.add(circle(102.5, 19.5, 1.5, 6), '#ffffff', tex=0, lift=0.05)
p.add(ribbon(cr([(128, 6), (140, 4), (156, 8)], n=4), 1.8), '#10262c', tex=0, lift=0.05)

# ------------------------------------------------------------------------------------------------------------------- the sun
p = piece('sun_rays', back='#f1e9d8', edge='#fff0c6', density=1.5)
n = 16
outline = []
for i in range(n):
    a0 = TAU * i / n
    a1 = TAU * (i + 1) / n
    long = i % 2 == 0
    tip = 196 if long else 158
    am = (a0 + a1) / 2
    # Each ray is a soft leaf shape, symmetrical about its own axis.
    sw = (a1 - a0) * 0.5
    p0 = (116 * math.cos(a0), 116 * math.sin(a0))
    p3 = (tip * math.cos(am), tip * math.sin(am))
    p4 = (116 * math.cos(a1), 116 * math.sin(a1))
    r_c = 150 if long else 132
    outline += bez(p0, (r_c * math.cos(a0 + sw * 0.1), r_c * math.sin(a0 + sw * 0.1)), (r_c * math.cos(am - sw * 0.22), r_c * math.sin(am - sw * 0.22)), p3, 7)
    outline += bez(p3, (r_c * math.cos(am + sw * 0.22), r_c * math.sin(am + sw * 0.22)), (r_c * math.cos(a1 - sw * 0.1), r_c * math.sin(a1 - sw * 0.1)), p4, 7, first=False)[:-1]
p.add(outline, GOLD2, b=GOLD, r=(0, 0, 200), tex=0.6)
spines = []
for i in range(0, n, 2):
    am = TAU * (i + 0.5) / n
    spines.append(ribbon([(118 * math.cos(am), 118 * math.sin(am)), (176 * math.cos(am), 176 * math.sin(am))], 7, 0.8))
p.add(spines, '#ffb545', tex=0.2, lift=0.3)

p = piece('sun_disc', back='#f1e9d8', edge='#fff0c6', density=1.5)
p.add(circle(0, 0, 118, 80), '#ffc64a', b='#f49a2a', r=(-30, 34, 170), tex=0.6)
p.add(circle(0, 0, 96, 72), '#ffdf8e', b='#ffc552', r=(-22, 26, 124), tex=0.4, lift=0.7)
p.add(star(0, 0, 80, 44, 8, rot=math.pi / 8), '#fff3c8', b='#ffd570', r=(0, 0, 84), tex=0.25, lift=0.7)
p.add(circle(0, 0, 25, 40), '#ffb13a', b='#f08f24', r=(-5, 6, 30), tex=0.2, lift=0.5)
p.add(circle(0, 0, 13, 28), PINK, tex=0.2, lift=0.4)

# ------------------------------------------------------------------------------------------------------------------ the clouds
def cloud(name, anchors, seed, density=1.1):
    p = piece(name, back='#f1e9d8', edge='#ffffff', density=density, grid=60)
    bottom = cr([(anchors[-1][0], anchors[-1][1]), ((anchors[-1][0] + anchors[0][0]) * 0.5, anchors[0][1] - 18), (anchors[0][0], anchors[0][1])], n=8)
    base = arcs(anchors, 0.5, 12) + bottom[1:-1]
    p.add(base, '#a9d6e0', b='#cdeaef', g=(0, min(a[1] for a in anchors) - 10, 0, max(a[1] for a in anchors) + 30), tex=0.8)
    a2 = [(a[0] * 0.91, a[1] * 0.92 + 16) for a in anchors]
    b2 = cr([(a2[-1][0], a2[-1][1]), ((a2[-1][0] + a2[0][0]) * 0.5, a2[0][1] - 10), (a2[0][0], a2[0][1])], n=8)
    p.add(arcs(a2, 0.5, 12) + b2[1:-1], '#fffdf6', b='#e8f5f6', g=(0, a2[0][1] - 6, 0, max(a[1] for a in a2) + 30), tex=0.6, lift=1.3)
    a3 = [(a[0] * 0.72, a[1] * 0.74 + 30) for a in anchors[1:-1]]
    if len(a3) >= 2:
        b3 = cr([(a3[-1][0], a3[-1][1]), ((a3[-1][0] + a3[0][0]) * 0.5, a3[0][1] - 6), (a3[0][0], a3[0][1])], n=8)
        p.add(arcs(a3, 0.5, 12) + b3[1:-1], '#ffffff', tex=0.3, lift=1.1)
    return p


cloud('cloud_a', [(-180, 30), (-132, 72), (-60, 108), (24, 112), (92, 84), (146, 58), (188, 28)], 1)
cloud('cloud_b', [(-120, 22), (-74, 62), (-6, 80), (58, 60), (116, 22)], 2)
cloud('cloud_c', [(-150, 26), (-104, 60), (-40, 66), (28, 92), (92, 60), (150, 24)], 3)

# ------------------------------------------------------------------------------------------------------------------- the gull
p = piece('gull', back='#f1e9d8', edge='#ffffff', density=1.6)
p.add(svg('M -96 40 C -70 44 -40 30 -6 4 L 0 -6 L 6 4 C 40 30 70 44 96 40 C 66 56 30 52 0 22 C -30 52 -66 56 -96 40 Z', seg=10), FOAM, b='#dfeef1', g=(0, 50, 0, 0), tex=0.4)
p.add([svg('M -96 40 C -84 41 -72 40 -62 37 L -66 47 C -76 46 -86 44 -96 40 Z', seg=5), svg('M 96 40 C 84 41 72 40 62 37 L 66 47 C 76 46 86 44 96 40 Z', seg=5)], '#2d3f43', tex=0.1, lift=0.4)

# ---------------------------------------------------------------------------------------------------------------- the pull-tab
p = piece('tab', back='#f1e9d8', edge='#fff4f8', density=1.8)
p.add(rrect(-150, -36, 56, 36, 30), PINK, b='#dd1f62', g=(-150, 36, 56, -36), tex=0.5)
p.add(rrect(-142, -28, 48, 28, 24), '#ff4b86', b=PINK, g=(-142, 28, 48, -28), tex=0.3, lift=0.5)
chev = []
for x in (-18, 6, 30):
    chev.append([(x - 8, -14), (x - 2, -14), (x + 8, 0), (x - 2, 14), (x - 8, 14), (x + 2, 0)])
p.add(chev, FOAM, tex=0, lift=0.3)
