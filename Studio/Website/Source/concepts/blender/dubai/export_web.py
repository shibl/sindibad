# Packs city.blend for the browser: flat ground layers, ribbons, buildings, trees, jets and traffic routes, quantised and gzipped.
#   OUT=<dir of routes.json> WEB=<out dir> Blender -b city.blend -P export_web.py
import bpy, gzip, json, math, os, struct
import numpy as np
OUT, WEB = os.environ['OUT'], os.environ['WEB']
RX0, RY0, RX1, RY1 = -200.0, -200.0, 200.0, 200.0     # everything fits in here, 400 units = 40 km
ZMAX = 8.6
sections, blobs = {}, []
offset = 0
def put(name, arr, **meta):
    global offset
    arr = np.asarray(arr)
    b = arr.tobytes()
    pad = (-len(b)) % 8
    sections[name] = dict(type=arr.dtype.name, count=int(arr.size), offset=offset, **meta)
    blobs.append(b + b'\0' * pad)
    offset += len(b) + pad
    print(f'PACK {name:14s} {arr.size:>10,} x {arr.dtype.name}  {len(b)/1e6:6.2f} MB', flush=True)
def qxy(co):
    q = np.empty((len(co), 2), np.uint16)
    q[:, 0] = np.clip((co[:, 0] - RX0) / (RX1 - RX0), 0, 1) * 65535
    q[:, 1] = np.clip((co[:, 1] - RY0) / (RY1 - RY0), 0, 1) * 65535
    return q
def arrays(ob, *attrs):
    me = ob.data
    me.calc_loop_triangles()
    co = np.zeros(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    tri = np.zeros(len(me.loop_triangles) * 3, np.int32); me.loop_triangles.foreach_get('vertices', tri)
    out = [co, tri]
    for a in attrs:
        v = np.zeros(len(me.vertices), np.float32); me.attributes[a].data.foreach_get('value', v); out.append(v)
    return out
def delta(tri):
    """Indices as zig-zag deltas, which gzip far better. The page undoes this."""
    d = np.diff(tri.astype(np.int64), prepend=0)
    return ((d << 1) ^ (d >> 63)).astype(np.uint32)

# Flat ground polygons
for name in ('land', 'sand', 'green', 'water'):
    cos, tris, n = [], [], 0
    for ob in bpy.data.objects:
        if ob.name == name or (ob.name.startswith(name + '.') and ob.name != 'land.far'):
            co, tri = arrays(ob); cos.append(co); tris.append(tri + n); n += len(co)
    co = np.concatenate(cos); tri = np.concatenate(tris)
    put(name + '_p', qxy(co)); put(name + '_i', delta(tri))

# Ribbons: the two sides of every point. side lets the shader draw a soft, antialiased road with its edge line.
for name, src in (('road', 'road'), ('big', 'road_big'), ('rail', 'rail')):
    co, tri = arrays(bpy.data.objects[src])
    put(name + '_p', qxy(co)); put(name + '_i', delta(tri))

# Buildings: near ones rise, far ones already stand.
rise = np.load(os.path.join(OUT, 'rise.npz'))
def building_verts(ob, delay, kind=0):
    co, tri, bh, rnd = arrays(ob, 'bh', 'rnd')
    q = qxy(co)
    z = (np.clip(co[:, 2] / ZMAX, 0, 1) * 65535).astype(np.uint16)
    h8 = np.clip(np.sqrt(bh / 830) * 255, 0, 255).astype(np.uint8)
    r8 = np.clip(rnd * 255, 0, 255).astype(np.uint8)
    d8 = delay if delay is not None else np.full(len(co), 255, np.uint8)
    k8 = np.full(len(co), kind, np.uint8)
    return q, z, h8, r8, d8, k8, tri
near = bpy.data.objects['city_near']
nd = (np.clip(rise['near_delay'], 0, 1) * 254).astype(np.uint8)
parts = [building_verts(near, nd), building_verts(bpy.data.objects['city_far'], None)]
n = 0; tris = []
for p in parts:
    tris.append(p[6] + n); n += len(p[0])
put('bld_xy', np.concatenate([p[0] for p in parts]))
put('bld_z', np.concatenate([p[1] for p in parts]))
put('bld_a', np.stack([np.concatenate([p[j] for p in parts]) for j in (2, 3, 4)], 1))    # height, tint, rise delay
put('bld_i', delta(np.concatenate(tris)))

# Landmarks, each with its own colour and its own moment.
# The Burj itself has its own detailed model now, from burj.py.
# The Museum of the Future has its own detailed model too, from extras.py.
KINDS = { 'frame': 3, 'burj_al_arab': 4, 'ain_dubai': 5}
mq, mz, mk, mt, n = [], [], [], [], 0
for name, k in KINDS.items():
    ob = bpy.data.objects[name]
    co, tri = arrays(ob)
    mq.append(qxy(co)); mz.append((np.clip(co[:, 2] / ZMAX, 0, 1) * 65535).astype(np.uint16)); mk.append(np.full(len(co), k, np.uint8)); mt.append(tri + n); n += len(co)
put('mark_xy', np.concatenate(mq)); put('mark_z', np.concatenate(mz)); put('mark_k', np.concatenate(mk)); put('mark_i', delta(np.concatenate(mt)))

# Trees and jets are drawn as instances, so one line each.
co, _t, rnd = arrays(bpy.data.objects['trees'], 'rnd')
c = co.reshape(-1, 12, 3)
ctr = c.mean(1)
sx = np.abs(c[:, :, 0] - ctr[:, None, 0]).max(1); sz = np.abs(c[:, :, 2] - ctr[:, None, 2]).max(1)
put('tree_xy', qxy(ctr))
put('tree_a', np.stack([(np.clip(sx / 0.2, 0, 1) * 255).astype(np.uint8), (np.clip(sz / 0.4, 0, 1) * 255).astype(np.uint8),
                        (rnd.reshape(-1, 12)[:, 0] * 255).astype(np.uint8), (np.clip(rise['tree_delay'].reshape(-1, 12)[:, 0], 0, 1) * 254).astype(np.uint8)], 1))
co, _t = arrays(bpy.data.objects['jets'])
j = co.reshape(-1, 7, 3)
put('jets', np.stack([j[:, :6, 0].mean(1), j[:, :6, 1].mean(1), j[:, 6, 2]], 1).astype(np.float32))

# Traffic routes: ways joined end to end, then resampled evenly so cars can run on them at a steady speed.
ways = json.load(open(os.path.join(OUT, 'routes.json')))
STEP = 0.3
key = lambda p: (round(p[0], 2), round(p[1], 2))
starts = {}
for i, w in enumerate(ways): starts.setdefault(key(w['p'][0]), []).append(i)
used, chains = set(), []
ends = {key(w['p'][-1]) for w in ways}
order = sorted(range(len(ways)), key=lambda i: (key(ways[i]['p'][0]) in ends, -len(ways[i]['p'])))
for i in order:
    if i in used: continue
    used.add(i)
    pts = list(ways[i]['p']); one = ways[i]['one']; big = ways[i]['k']
    while True:
        nxt = [k for k in starts.get(key(pts[-1]), []) if k not in used and ways[k]['k'] == ways[i]['k']]
        if not nxt: break
        ax, ay = pts[-1][0] - pts[-2][0], pts[-1][1] - pts[-2][1]
        def turn(k):
            b = ways[k]['p']; bx, by = b[1][0] - b[0][0], b[1][1] - b[0][1]
            return -(ax * bx + ay * by) / ((math.hypot(ax, ay) * math.hypot(bx, by)) or 1)
        k = min(nxt, key=turn)
        used.add(k); pts += ways[k]['p'][1:]
    chains.append((pts, one, big))
routes = []
for pts, one, big in chains:
    p = np.array(pts, np.float32)
    seg = np.hypot(*np.diff(p, axis=0).T); dist = np.concatenate([[0], np.cumsum(seg)])
    if dist[-1] < 2.5: continue
    s = np.arange(0, dist[-1], STEP)
    r = np.stack([np.interp(s, dist, p[:, 0]), np.interp(s, dist, p[:, 1])], 1)
    for k in range(0, len(r), 1000):
        piece = r[k:k + 1001]
        if len(piece) > 8: routes.append((piece, one, big))
W_ = max(len(r[0]) for r in routes); H_ = len(routes)
tex = np.zeros((H_, W_, 2), np.float32)
lens = np.zeros(H_, np.uint16); flags = np.zeros(H_, np.uint8)
for y, (r, one, big) in enumerate(routes):
    tex[y, :len(r)] = r; lens[y] = len(r); flags[y] = (1 if one else 0) | (2 if big == 'motorway' else 4 if big == 'trunk' else 0)
put('routes', tex, width=W_, height=H_); put('route_len', lens); put('route_flag', flags)
print(f'PACK routes: {H_} routes, longest {W_} points, total {lens.sum() * STEP * 0.1:.0f} km', flush=True)

head = json.dumps(dict(bounds=[RX0, RY0, RX1, RY1], zmax=ZMAX, sections=sections), separators=(',', ':')).encode()
pad = (-(4 + len(head))) % 8
raw = struct.pack('<I', len(head)) + head + b' ' * pad + b''.join(blobs)
path = os.path.join(WEB, 'city.dat')
with open(path, 'wb') as f: f.write(gzip.compress(raw, 9))
print(f'PACK total raw {len(raw)/1e6:.1f} MB, gzipped {os.path.getsize(path)/1e6:.2f} MB', flush=True)
