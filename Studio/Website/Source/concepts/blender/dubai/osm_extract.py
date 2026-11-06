# Pulls the Dubai layers out of a Geofabrik .osm.pbf with nothing but the standard library. Data (c) OpenStreetMap
# contributors, ODbL. Writes the same layer files build.py reads.
#   curl -LO https://download.geofabrik.de/asia/gcc-states-latest.osm.pbf
#   python3 -I osm_extract.py gcc-states-latest.osm.pbf <outdir>
import json, multiprocessing as mp, os, re, struct, sys, time, zlib

S, W, N, E = 25.06, 55.10, 25.30, 55.36
M = 0.05    # nodes are kept this far (degrees) past the frame, so ways crossing the edge stay whole
LA0, LA1, LO0, LO1 = S - M, N + M, W - M, E + M
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)

def fields(b):
    """Walks one protobuf message, yielding (field number, value). Length-delimited values come back as (start, end)."""
    i, n = 0, len(b)
    while i < n:
        key = 0; sh = 0
        while True:
            c = b[i]; i += 1
            key |= (c & 127) << sh
            if c < 128: break
            sh += 7
        wt = key & 7; fn = key >> 3
        if wt == 0:
            v = 0; sh = 0
            while True:
                c = b[i]; i += 1
                v |= (c & 127) << sh
                if c < 128: break
                sh += 7
            yield fn, v
        elif wt == 2:
            ln = 0; sh = 0
            while True:
                c = b[i]; i += 1
                ln |= (c & 127) << sh
                if c < 128: break
                sh += 7
            yield fn, b[i:i + ln]
            i += ln
        elif wt == 1:
            yield fn, b[i:i + 8]; i += 8
        elif wt == 5:
            yield fn, b[i:i + 4]; i += 4
        else:
            raise ValueError(f'wire type {wt}')

def uints(b):
    out = []; v = 0; sh = 0
    for c in b:
        v |= (c & 127) << sh
        if c < 128:
            out.append(v); v = 0; sh = 0
        else:
            sh += 7
    return out

def deltas(b):
    """Packed zig-zag deltas, as used for node ids, coordinates and way refs."""
    out = []; v = 0; sh = 0; cur = 0
    for c in b:
        v |= (c & 127) << sh
        if c < 128:
            cur += (v >> 1) ^ -(v & 1)
            out.append(cur); v = 0; sh = 0
        else:
            sh += 7
    return out

def read_blob(path, off, size):
    with open(path, 'rb') as f:
        f.seek(off)
        raw = f.read(size)
    for fn, v in fields(raw):
        if fn == 1: return bytes(v)
        if fn == 3: return zlib.decompress(v)
    raise ValueError('unsupported blob compression')

def block(path, off, size):
    table = []; groups = []; gran = 100; la_off = lo_off = 0
    for fn, v in fields(read_blob(path, off, size)):
        if fn == 1: table = [s for k, s in fields(v) if k == 1]
        elif fn == 2: groups.append(v)
        elif fn == 17: gran = v
        elif fn == 19: la_off = v
        elif fn == 20: lo_off = v
    return table, groups, gran, la_off, lo_off

def job_nodes(a):
    path, off, size = a
    table, groups, gran, la_off, lo_off = block(path, off, size)
    nodes, other = [], False
    for g in groups:
        for fn, v in fields(g):
            if fn == 2:
                ids = la = lo = None
                for k, d in fields(v):
                    if k == 1: ids = deltas(d)
                    elif k == 8: la = deltas(d)
                    elif k == 9: lo = deltas(d)
                for i, x, y in zip(ids, la, lo):
                    lat = (la_off + gran * x) * 1e-9; lon = (lo_off + gran * y) * 1e-9
                    if LA0 <= lat <= LA1 and LO0 <= lon <= LO1:
                        nodes.append((i, round(lat, 7), round(lon, 7)))
            elif fn in (3, 4):
                other = True
    return nodes, (off, size) if other else None

NODES = {}
def tags_of(table, keys, vals):
    return {table[k].decode('utf-8', 'replace'): table[x].decode('utf-8', 'replace') for k, x in zip(keys, vals)}

def job_ways(a):
    path, off, size = a
    table, groups, *_ = block(path, off, size)
    out = []
    for g in groups:
        for fn, v in fields(g):
            if fn != 3: continue
            wid = 0; keys = vals = refs = b''
            for k, d in fields(v):
                if k == 1: wid = d
                elif k == 2: keys = d
                elif k == 3: vals = d
                elif k == 8: refs = d
            rs = [r for r in deltas(refs) if r in NODES]
            if len(rs) >= 2:
                out.append((wid, tags_of(table, uints(keys), uints(vals)), rs))
    return out

def job_rels(a):
    path, off, size = a
    table, groups, *_ = block(path, off, size)
    out = []
    for g in groups:
        for fn, v in fields(g):
            if fn != 4: continue
            rid = 0; keys = vals = roles = ids = types = b''
            for k, d in fields(v):
                if k == 1: rid = d
                elif k == 2: keys = d
                elif k == 3: vals = d
                elif k == 8: roles = d
                elif k == 9: ids = d
                elif k == 10: types = d
            t = tags_of(table, uints(keys), uints(vals))
            if t.get('type') != 'multipolygon': continue
            if not classify(t): continue
            mem = [(i, table[r].decode(), ty) for i, r, ty in zip(deltas(ids), uints(roles), uints(types))]
            out.append((rid, t, [(i, r) for i, r, ty in mem if ty == 1]))
    return out

ROADS = re.compile(r'^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|residential|unclassified|living_street|pedestrian)$')
def classify(t):
    """Which layer files a tagged way or relation belongs to."""
    out = []
    if 'building' in t and t['building'] != 'no': out.append('bld-0-0')
    if t.get('natural') == 'coastline': out.append('coast')
    if (t.get('natural') == 'water' or t.get('waterway') in ('canal', 'river', 'riverbank', 'dock')
            or t.get('landuse') in ('basin', 'reservoir') or t.get('leisure') == 'marina'): out.append('water')
    if (t.get('leisure') in ('park', 'garden', 'golf_course', 'pitch', 'nature_reserve', 'stadium')
            or t.get('landuse') in ('grass', 'forest', 'meadow', 'recreation_ground', 'village_green', 'cemetery')
            or t.get('natural') in ('wood', 'scrub', 'grassland')): out.append('green')
    if t.get('natural') in ('beach', 'sand', 'bare_rock'): out.append('sand')
    if ROADS.match(t.get('highway', '')): out.append('roads')
    if t.get('railway') in ('subway', 'light_rail', 'monorail', 'tram'): out.append('rail')
    return out

def inframe(geom):
    return any(S <= p['lat'] <= N and W <= p['lon'] <= E for p in geom)

def main(path, out):
    os.makedirs(out, exist_ok=True)
    offs = []
    with open(path, 'rb') as f:
        while True:
            h = f.read(4)
            if len(h) < 4: break
            n = struct.unpack('>I', h)[0]
            size = 0; kind = b''
            for fn, v in fields(f.read(n)):
                if fn == 1: kind = bytes(v)
                elif fn == 3: size = v
            if kind == b'OSMData': offs.append((path, f.tell(), size))
            f.seek(size, 1)
    log(len(offs), 'data blocks')
    workers = max(2, (os.cpu_count() or 4) - 2)
    ctx = mp.get_context('fork')
    rest = []
    with ctx.Pool(workers) as p:
        for nodes, other in p.imap_unordered(job_nodes, offs, 8):
            for i, la, lo in nodes: NODES[i] = (la, lo)
            if other: rest.append((path, other[0], other[1]))
    log(f'{len(NODES):,} nodes kept, {len(rest)} way/relation blocks')
    ways = {}
    rels = []
    with ctx.Pool(workers) as p:      # forked now, so workers can see NODES
        for got in p.imap_unordered(job_ways, rest, 4):
            for wid, t, rs in got: ways[wid] = (t, rs)
        log(f'{len(ways):,} ways touch the area')
        for got in p.imap_unordered(job_rels, rest, 4):
            rels += got
    log(f'{len(rels):,} multipolygons with useful tags')

    layers = {k: [] for k in ('coast', 'water', 'green', 'sand', 'roads', 'rail', 'bld-0-0')}
    geom = lambda rs: [{'lat': NODES[r][0], 'lon': NODES[r][1]} for r in rs]
    for wid, (t, rs) in ways.items():
        cl = classify(t)
        if not cl: continue
        g = geom(rs)
        if not inframe(g): continue
        el = {'type': 'way', 'id': wid, 'tags': t, 'geometry': g}
        for k in cl: layers[k].append(el)
    for rid, t, mem in rels:
        ms = []
        for i, role in mem:
            if i in ways: ms.append({'type': 'way', 'role': role, 'geometry': geom(ways[i][1])})
        if not ms or not any(inframe(m['geometry']) for m in ms): continue
        el = {'type': 'relation', 'id': rid, 'tags': t, 'members': ms}
        for k in classify(t): layers[k].append(el)
    for k, els in layers.items():
        json.dump({'elements': els}, open(os.path.join(out, k + '.json'), 'w'), separators=(',', ':'))
        log(f'{k}: {len(els):,}')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
