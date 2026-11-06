# The player simulator. Thousands of seeded agents play the island: they land at the dock, want the flag, and differ in speed,
# patience, curiosity and nerve. They walk the real walkable map of the land (slopes, water, buildings and rim included), detour
# to places that catch their eye, hop out over the stepping stones, and sometimes misjudge an edge and fall.
#   OUT=<cache> AGENTS=3200 SEED=20261 Blender -b --factory-startup -P sim.py
# Writes OUT/sim.npz: every trail as (x, y, z, t) in world units, t being simulation time from 0 to 1.
import os, sys, time, heapq
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import *
from layout import *

OUT = os.environ['OUT']
N = int(os.environ.get('AGENTS', 3200))
SEED = int(os.environ.get('SEED', 20261))
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)
L = np.load(os.path.join(OUT, 'land.npz'))
P = np.load(os.path.join(OUT, 'props.npz'))
xs, ys = L['xs'], L['ys']
RES = float(L['RES'])
step = max(1, int(round(1.0 / RES)))
NAV = RES * step
walk = L['walk'] & ~P['obst']
d = L['d']
slope = L['slope']
nav_h = L['nav_h']
gx = xs[::step]
gy = ys[::step]
W = walk[::step, ::step]
SL = slope[::step, ::step]
Hn = nav_h[::step, ::step]
Dn = d[::step, ::step]
# keep only the land connected to the dock
sy, sx = W.shape
def to_ij(p):
    return int(np.clip((p[1] - gy[0]) / NAV, 0, sy - 1)), int(np.clip((p[0] - gx[0]) / NAV, 0, sx - 1))
def nearest_walk(p):
    i, j = to_ij(p)
    ii, jj = np.nonzero(W)
    k = np.argmin((ii - i) ** 2 + (jj - j) ** 2)
    return int(ii[k]), int(jj[k])

NB = [(-1, 0, 1.0), (1, 0, 1.0), (0, -1, 1.0), (0, 1, 1.0), (-1, -1, 1.414), (-1, 1, 1.414), (1, -1, 1.414), (1, 1, 1.414)]
def field_to(goal, avoid_slope=2.2):
    """Dijkstra over the walkable grid. Slopes cost more, rims cost more: people keep away from an edge unless they mean it."""
    cost = 1 + avoid_slope * np.minimum(SL, 1.2) ** 2 + 2.2 * smooth(4, 0, Dn)
    dist = np.full(W.shape, 1e9, np.float32)
    i0, j0 = nearest_walk(goal)
    dist[i0, j0] = 0
    h = [(0.0, i0, j0)]
    W_, cost_, dist_ = W.tolist(), cost.tolist(), dist.tolist()
    while h:
        c, i, j = heapq.heappop(h)
        if c > dist_[i][j]:
            continue
        for di, dj, w in NB:
            a, b = i + di, j + dj
            if 0 <= a < sy and 0 <= b < sx and W_[a][b]:
                nc = c + w * cost_[a][b]
                if nc < dist_[a][b]:
                    dist_[a][b] = nc
                    heapq.heappush(h, (nc, a, b))
    dist = np.array(dist_, np.float32)
    # direction field: towards the best neighbour, then smoothed only over walkable cells, so narrow ramps still flow along their length
    pad = np.pad(dist, 1, constant_values=1e9)
    best = dist.copy()
    vx_, vy_ = np.zeros(dist.shape, np.float32), np.zeros(dist.shape, np.float32)
    for di, dj, w in NB:
        nb = pad[1 + di:pad.shape[0] - 1 + di, 1 + dj:pad.shape[1] - 1 + dj]
        val = dist - (dist - nb) / w      # compare by slope, not raw value
        hit = (nb < 1e8) & (val < best)
        best[hit] = val[hit]
        vx_[hit], vy_[hit] = dj / w, di / w
    mask = (dist < 1e8).astype(np.float32)
    wgt = blur(mask, 1.0) + 1e-3
    fx, fy = blur(vx_ * mask, 1.0) / wgt, blur(vy_ * mask, 1.0) / wgt
    n = np.sqrt(fx ** 2 + fy ** 2) + 1e-4
    return fx / n, fy / n, np.where(dist > 1e8, 1e6, dist)

# Things worth a look. Each agent's curiosity picks some of these on the way to the flag.
POIS = {
    'plaza': (VILLAGE[0] + 3, VILLAGE[1] - 16),
    'backlane': (VILLAGE[0] + 8, VILLAGE[1] + 34),
    'lookout': (38, -50),
    'lakeshore': (58, 4),
    'grove': (62, -22),
    'cape': (54, -42),
    'north': (6, 58),
    'terrace': (50, 28),
    'east': (92, 10),
    'meadow': (8, -30),
    'orchard': (46, -28),
    'cliffedge': (-8, -28),
    'farfront': (18, -40),
    'woods': (74, 16),
}
fields = {}
fields['flag'] = field_to(FLAG)
dock_ij = nearest_walk((DOCK[0] + 12, DOCK[1] + 2))
if fields['flag'][2][dock_ij] >= 1e6:
    raise SystemExit('the flag cannot be reached from the dock')
for k, v in list(POIS.items()):
    fields[k] = field_to(v)
    if fields[k][2][dock_ij] >= 1e6:
        log('unreachable, dropped', k)
        del fields[k], POIS[k]
    else:
        log('field', k, 'cost from dock', float(fields[k][2][dock_ij]))
names = list(fields)
log('flag cost from dock', float(fields['flag'][2][dock_ij]))

rng = np.random.default_rng(SEED)
# Personal taste: each agent is pulled gently along one of a dozen slow noise fields, so paths curve and fan out over open ground.
# The clearance map turns all of this off in narrow places, where people just walk.
FLD = []
for k in range(12):
    FLD.append((fbm2(W.shape, 34 / NAV, 700 + k * 2, 2, 0.35), fbm2(W.shape, 34 / NAV, 701 + k * 2, 2, 0.35)))
clearance = edt(W) * NAV
# personas: a player's age, skill and temperament boil down to these
speed = np.clip(rng.lognormal(np.log(1.12), 0.24, N), 0.55, 2.2)        # units per tick
curiosity = rng.beta(1.6, 1.9, N)                                       # how many detours
wobble = np.clip(rng.lognormal(np.log(0.09), 0.5, N), 0.03, 0.4)       # how straight they walk
nerve = rng.beta(1.3, 5.0, N)                                           # appetite for edges and jumps
lane = rng.normal(0, 0.95, N)                                           # which side of a path they like
close_enough = rng.uniform(3, 30, N)                                    # how near counts as having seen a place
taste = rng.integers(0, 12, N)                                          # which way their eye wanders
drift_k = np.clip(rng.lognormal(np.log(0.55), 0.5, N), 0.1, 1.5)
delay = rng.uniform(0, 110, N)                                          # they don't all land at once

# Each agent's plan: a queue of targets ending with the flag
plans = []
for i in range(N):
    n_det = rng.binomial(4, curiosity[i])
    opts = rng.permutation(len(POIS))[:n_det]
    # rough order by distance from the dock, so the plan is sensible
    pts = [list(POIS)[k] for k in opts]
    pts.sort(key=lambda a: np.hypot(POIS[a][0] - DOCK[0], POIS[a][1] - DOCK[1]) + rng.normal(0, 22))
    plans.append(pts + ['flag'])

pos = np.zeros((N, 2), np.float32)
dock_i = dock_ij
best_left = np.full(N, 1e9, np.float32)
stall = np.zeros(N, np.int32)
pos[:, 0] = gx[dock_i[1]] + rng.normal(0, 1.2, N)
pos[:, 1] = gy[dock_i[0]] + rng.normal(0, 1.2, N)
vel = np.zeros((N, 2), np.float32)
stage = np.zeros(N, np.int32)
state = np.zeros(N, np.int32)      # 0 waiting, 1 walking, 2 airborne(fall), 3 finished, 4 hop, 5 on a stone
wander = np.zeros((N, 2), np.float32)
pz = np.zeros(N, np.float32)
vz = np.zeros(N, np.float32)
goal_idx = np.array([names.index(p[0]) for p in plans], np.int32)
hop_from = np.zeros((N, 3), np.float32)
hop_to = np.zeros((N, 3), np.float32)
hop_t = np.zeros(N, np.float32)
hop_dur = np.ones(N, np.float32)
hop_stage = np.zeros(N, np.int32)
rest = np.zeros(N, np.float32)

# stepping stones: from the land's front edge out over the void and back
STONES = []
for isl in ISLANDS:
    if isl['name'].startswith('step_'):
        t = np.load(os.path.join(OUT, f'top_{isl["name"]}.npz'))
        cx, cy = isl['lobes'][0][0], isl['lobes'][0][1]
        res = float(t['xs'][1] - t['xs'][0])
        z = float(sample2(t['top'], np.array([(cx - t['xs'][0]) / res]), np.array([(cy - t['ys'][0]) / res]))[0])
        STONES.append((cx, cy, z))
STONES.sort()
log('stones', STONES)
# edges the brave leave from and land back on
launch_edge = np.array([(-6, -30), (8, -38), (18, -42)], np.float32)

def h_of(px, py):
    return sample2(nav_h, (px - xs[0]) / RES, (py - ys[0]) / RES)
def fieldval(F, px, py):
    return sample2(F, (px - gx[0]) / NAV, (py - gy[0]) / NAV)
def is_walk(px, py):
    i = np.clip(((py - gy[0]) / NAV + 0.5).astype(np.int32), 0, sy - 1)
    j = np.clip(((px - gx[0]) / NAV + 0.5).astype(np.int32), 0, sx - 1)
    return W[i, j]
def rim_of(px, py):
    return sample2(Dn, (px - gx[0]) / NAV, (py - gy[0]) / NAV)

# ----------------------------------------------------------------- run
TICKS = int(os.environ.get('TICKS', 1100))
hist_x = np.full((TICKS, N), np.nan, np.float32)
hist_y = np.full((TICKS, N), np.nan, np.float32)
hist_z = np.full((TICKS, N), np.nan, np.float32)
falls = 0
for t in range(TICKS):
    wait = (state == 0) & (t >= delay)
    state[wait] = 1
    pz[wait] = h_of(pos[wait, 0], pos[wait, 1])
    m = state == 1
    if m.any():
        idx = np.nonzero(m)[0]
        px, py = pos[idx, 0], pos[idx, 1]
        dx = np.zeros(len(idx), np.float32)
        dy = np.zeros(len(idx), np.float32)
        dist_left = np.zeros(len(idx), np.float32)
        for gi in np.unique(goal_idx[idx]):
            k = goal_idx[idx] == gi
            F = fields[names[gi]]
            dx[k] = fieldval(F[0], px[k], py[k])
            dy[k] = fieldval(F[1], px[k], py[k])
            dist_left[k] = fieldval(F[2], px[k], py[k])
        # a persistent lane to one side of the flow keeps strands apart, and a random walk keeps them alive
        side_x, side_y = -dy, dx
        wander[idx] += rng.normal(0, 1, (len(idx), 2)) * wobble[idx, None] * 0.38 - wander[idx] * 0.06
        room = smooth(2.0, 9.0, sample2(clearance, (px - gx[0]) / NAV, (py - gy[0]) / NAV))
        tx_, ty_ = np.zeros(len(idx), np.float32), np.zeros(len(idx), np.float32)
        for q in np.unique(taste[idx]):
            k = taste[idx] == q
            tx_[k] = sample2(FLD[q][0], (px[k] - gx[0]) / NAV, (py[k] - gy[0]) / NAV)
            ty_[k] = sample2(FLD[q][1], (px[k] - gx[0]) / NAV, (py[k] - gy[0]) / NAV)
        far_ = smooth(0, 14, dist_left) * room
        want_x = dx + side_x * lane[idx] * 0.32 * far_ + wander[idx, 0] + tx_ * drift_k[idx] * 1.7 * far_
        want_y = dy + side_y * lane[idx] * 0.32 * far_ + wander[idx, 1] + ty_ * drift_k[idx] * 1.7 * far_
        n = np.sqrt(want_x ** 2 + want_y ** 2) + 1e-4
        sl = sample2(SL, (px - gx[0]) / NAV, (py - gy[0]) / NAV)
        sp = speed[idx] * (1 - 0.45 * np.minimum(sl, 1.0))
        vel[idx, 0] += (want_x / n * sp - vel[idx, 0]) * 0.24
        vel[idx, 1] += (want_y / n * sp - vel[idx, 1]) * 0.24
        nx, ny = px + vel[idx, 0], py + vel[idx, 1]
        ok = is_walk(nx, ny)
        # hitting the edge of the walkable map: most slide along it, a few with nerve go over an actual cliff edge
        bad = ~ok
        rim = rim_of(nx, ny)
        fall = bad & (rim < 2.0) & (rng.random(len(idx)) < nerve[idx] * 0.05) & (t > delay[idx] + 60)
        slide_x = bad & ~fall & is_walk(nx, py)
        slide_y = bad & ~fall & ~slide_x & is_walk(px, ny)
        stuck = bad & ~fall & ~slide_x & ~slide_y
        nx2 = np.where(slide_y | stuck, px, nx)
        ny2 = np.where(slide_x | stuck, py, ny)
        vel[idx[stuck]] *= -0.4
        pos[idx, 0], pos[idx, 1] = nx2, ny2
        pz[idx] = h_of(nx2, ny2)
        fi = idx[fall]
        state[fi] = 2
        vz[fi] = 0.1
        falls += len(fi)
        # no progress for a while? they give up on this idea and move on, with a little kick out of whatever corner they're in
        better = dist_left < best_left[idx] - 0.2
        stall[idx] = np.where(better, 0, stall[idx] + 1)
        best_left[idx] = np.minimum(best_left[idx], dist_left)
        giveup = stall[idx] > 46
        vel[idx[giveup]] += rng.normal(0, 0.8, (int(giveup.sum()), 2))
        # arrived at this target?
        # (everyone has their own idea of "close enough" to a place, except for the flag, which they must touch)
        at_flag = goal_idx[idx] == names.index('flag')
        reach = np.where(at_flag, 3.6 + 3 * rng.random(len(idx)), close_enough[idx])
        arrive = (dist_left < reach) | (giveup & ~at_flag)
        stall[idx[arrive | giveup]] = 0
        best_left[idx[arrive]] = 1e9
        for i in idx[arrive & ~fall]:
            stage[i] += 1
            if stage[i] >= len(plans[i]):
                state[i] = 3
            else:
                goal_idx[i] = names.index(plans[i][stage[i]])
        # the brave leave the path for the stones
        near_edge = rim_of(nx2, ny2) < 7
        if t % 3 == 0:
            for i in idx[near_edge & (nerve[idx] > 0.26) & (rng.random(len(idx)) < 0.2)]:
                if hop_stage[i] == 0 and state[i] == 1 and pos[i, 1] < -22 and pos[i, 0] < 28:
                    j = int(np.argmin(np.abs(np.array([s[0] for s in STONES]) - pos[i, 0])))
                    s = STONES[j]
                    hop_from[i] = (pos[i, 0], pos[i, 1], pz[i])
                    hop_to[i] = (s[0] + rng.normal(0, 3.2), s[1] + rng.normal(0, 3.0), s[2])
                    dist = np.linalg.norm(hop_to[i, :2] - hop_from[i, :2])
                    hop_dur[i] = dist / (0.9 + rng.uniform(0, 0.35))
                    hop_t[i] = 0
                    hop_stage[i] = 1
                    state[i] = 4
    m = state == 4
    if m.any():
        idx = np.nonzero(m)[0]
        hop_t[idx] += 1
        a = np.clip(hop_t[idx] / hop_dur[idx], 0, 1)
        pos[idx] = hop_from[idx, :2] + (hop_to[idx, :2] - hop_from[idx, :2]) * a[:, None]
        apex = 7 + 0.15 * hop_dur[idx]
        pz[idx] = lerp(hop_from[idx, 2], hop_to[idx, 2], a) + apex * 4 * a * (1 - a)
        done = idx[a >= 1]
        for i in done:
            # a clean landing, or a miss that drops into the cloud
            miss = np.hypot(*(hop_to[i, :2] - np.array(min(STONES, key=lambda s: np.hypot(s[0] - hop_to[i, 0], s[1] - hop_to[i, 1]))[:2]))) > 7.5
            if miss or rng.random() < 0.05:
                state[i] = 2
                vel[i] = (hop_to[i, :2] - hop_from[i, :2]) / hop_dur[i]
                vz[i] = -0.2
                falls += 1
            elif hop_stage[i] == 1 and rng.random() < 0.72:
                # on to the next stone, or back to the land
                cur = int(np.argmin([np.hypot(s[0] - pos[i, 0], s[1] - pos[i, 1]) for s in STONES]))
                nxt = cur + (1 if rng.random() < 0.7 else -1)
                if 0 <= nxt < len(STONES):
                    s = STONES[nxt]
                    hop_from[i] = hop_to[i]
                    hop_to[i] = (s[0] + rng.normal(0, 2.6), s[1] + rng.normal(0, 2.4), s[2])
                    hop_dur[i] = np.linalg.norm(hop_to[i, :2] - hop_from[i, :2]) / (0.9 + rng.uniform(0, 0.35))
                    hop_t[i] = 0
                else:
                    hop_stage[i] = 2
            else:
                hop_stage[i] = 2
            if state[i] == 4 and hop_stage[i] == 2:
                # hop home
                e = launch_edge[rng.integers(len(launch_edge))]
                ii, jj = nearest_walk((e[0] + rng.normal(0, 4), e[1] + 6 + rng.normal(0, 3)))
                hx_, hy_ = gx[jj], gy[ii]
                hop_from[i] = (pos[i, 0], pos[i, 1], pz[i])
                hop_to[i] = (hx_, hy_, float(h_of(np.array([hx_]), np.array([hy_]))[0]))
                hop_dur[i] = np.linalg.norm(hop_to[i, :2] - hop_from[i, :2]) / (0.9 + rng.uniform(0, 0.35))
                hop_t[i] = 0
                hop_stage[i] = 3
            elif state[i] == 4 and hop_stage[i] == 3:
                hop_stage[i] = 4     # home, and never again
                state[i] = 1
    m = state == 2
    if m.any():
        idx = np.nonzero(m)[0]
        vz[idx] -= 0.03
        vel[idx] *= 0.975
        pos[idx] += vel[idx]
        pz[idx] += vz[idx]
        gone = pz[idx] < -125
        state[idx[gone]] = 6
    live = (state == 1) | (state == 2) | (state == 4)
    hist_x[t, live] = pos[live, 0]
    hist_y[t, live] = pos[live, 1]
    hist_z[t, live] = pz[live]
    if t % 100 == 0:
        log('tick', t, 'walking', int((state == 1).sum()), 'done', int((state == 3).sum()), 'fell', falls)
log('finished', int((state == 3).sum()), 'of', N, 'falls', falls, 'still walking', int((state == 1).sum()))

# ----------------------------------------------------------------- store: concatenated trails, smoothed a touch
trails_xyzt = []
offsets = [0]
cls = []
kernel = np.array([1, 2, 3, 2, 1], np.float32) / 9
for i in range(N):
    good = np.nonzero(~np.isnan(hist_x[:, i]))[0]
    if len(good) < 8:
        continue
    x, y, z = hist_x[good, i], hist_y[good, i], hist_z[good, i]
    if state[i] != 2 and state[i] != 6:
        x = np.convolve(np.pad(x, 2, mode='edge'), kernel, 'valid')
        y = np.convolve(np.pad(y, 2, mode='edge'), kernel, 'valid')
    # classes: 0 reached the flag, 1 still exploring when time ran out, 2 fell
    c = 0 if state[i] == 3 else (2 if state[i] == 6 or state[i] == 2 else 1)
    t = good.astype(np.float32) / TICKS
    trails_xyzt.append(np.stack([x, y, z, t], 1))
    offsets.append(offsets[-1] + len(good))
    cls.append(c)
tr = np.concatenate(trails_xyzt, 0).astype(np.float32)
# How far every walkable cell is from the dock along the ground: the flow's clock in the trails pass, so the light runs steadily outward along the trails.
dock_dist = field_to((DOCK[0] + 12, DOCK[1] + 2), avoid_slope=0.6)[2]
np.savez_compressed(os.path.join(OUT, 'sim.npz'), tr=tr, offsets=np.array(offsets, np.int64), cls=np.array(cls, np.int8), speed=speed, N=N, SEED=SEED,
                    dock_dist=dock_dist, nav_x0=float(gx[0]), nav_y0=float(gy[0]), nav_res=NAV)
log('saved', tr.shape, 'classes', np.bincount(np.array(cls)))
