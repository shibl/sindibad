// The ground of a 3D quest island (core/isle/island.ts): terraces that step
// up from a beach, and a paved path that winds up them, with ramps where it
// climbs. Each island describes its own (core/lab/models.js,
// core/atlas/models.js):
//
//   makeGround({
//     isle: { cx, cz, hx, hz },               the beach's outline
//     levels: [[top, z below which it applies], …]   from the front up
//     slabs: [[cx, cz, hx, hz, n, wob, seed, top, depth, colour], …]
//     ramps: [[z0, z1, y0, y1], …]            where the path climbs
//     path: [[x, z], …]
//     pal: { sand, sandSide, cliff, cliffDark, path, pathEdge, post }
//   }) → { ISLE, levelAt, pathY, terrain, pathCurve, pathRibbon }

import * as THREE from '../../vendor/three/three.module.min.js';
import { Kit } from '../farm/models.js';

/** What an island's ground is made of (see above). */
export interface GroundSpec {
  isle: { cx: number; cz: number; hx: number; hz: number };
  levels: [top: number, below: number][];
  slabs: [cx: number, cz: number, hx: number, hz: number, n: number, wob: number, seed: number, top: number, depth: number, colour: string][];
  ramps: [z0: number, z1: number, y0: number, y1: number][];
  path: [x: number, z: number][];
  pal: { sand: string; sandSide: string; cliff: string; cliffDark: string; path: string; pathEdge: string; post: string };
}

const C = (h: string) => new THREE.Color(h);

function outline(cx: number, cz: number, hx: number, hz: number, { n = 5, wob = 0.5, seed = 1, pts = 140 } = {}) {
  const s = new THREE.Shape();
  for (let i = 0; i <= pts; i++) {
    const t = (i / pts) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
    const w = 1 + (wob / Math.max(hx, hz)) * (Math.sin(t * 5 + seed) * 0.6 + Math.sin(t * 9 + seed * 2.1) * 0.4);
    const x = cx + hx * Math.sign(c) * Math.abs(c) ** (2 / n) * w, z = cz + hz * Math.sign(sn) * Math.abs(sn) ** (2 / n) * w;
    if (i) s.lineTo(x, -z); else s.moveTo(x, -z);
  }
  return s;
}
// A flat slab with its top at `top`: `cap` on top, a cliff (darker at the
// foot, with faint stone courses) on the sides.
function slab(shape: THREE.Shape, { top, depth, bevel = 0.35, cap, side, sideDark }: { top: number; depth: number; bevel?: number; cap: string; side: string; sideDark?: string }) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, top - depth - bevel, 0);
  g.deleteAttribute('uv');
  const ng = g.index ? g.toNonIndexed() : g;
  if (ng !== g) g.dispose();
  const pos = ng.attributes.position as THREE.BufferAttribute, nor = ng.attributes.normal as THREE.BufferAttribute, col = new Float32Array(pos.count * 3);
  const cTop = C(cap), cSide = C(side), cDark = C(sideDark || side), tmp = new THREE.Color();
  const bottom = top - depth - bevel * 2;
  for (let i = 0; i < pos.count; i++) {
    if (nor.getY(i) > 0.6) tmp.copy(cTop);
    else {
      tmp.copy(cDark).lerp(cSide, Math.min(1, Math.max(0, (pos.getY(i) - bottom) / (top - bottom))));
      if (Math.floor(pos.getY(i) * 2.5) % 2) tmp.multiplyScalar(0.96);
    }
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  ng.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return ng;
}

export function makeGround(spec: GroundSpec) {
  const { isle: ISLE, levels, slabs, ramps: RAMPS, path, pal: P } = spec;
  const levelAt = (z: number) => { for (const [top, below] of [...levels].reverse()) if (z < below) return top; return levels[0][0]; };
  function pathY(z: number) {
    for (const [z0, z1, y0, y1] of RAMPS) if (z <= z0 && z >= z1) { const t = (z0 - z) / (z0 - z1); return y0 + (y1 - y0) * t * t * (3 - 2 * t); }
    return levelAt(z);
  }
  function terrain() {
    const k = new Kit();
    k.parts.push(slab(outline(ISLE.cx, ISLE.cz, ISLE.hx, ISLE.hz, { n: 4, wob: 1, seed: 3 }), { top: 0.35, depth: 1.2, bevel: 0.6, cap: P.sand, side: P.sandSide }));
    for (const [cx, cz, hx, hz, n, wob, seed, top, depth, cap] of slabs) k.parts.push(slab(outline(cx, cz, hx, hz, { n, wob, seed }), { top, depth, cap, side: P.cliff, sideDark: P.cliffDark }));
    const m = k.mesh();
    m.castShadow = false;
    return m;
  }
  function pathCurve() {
    return new THREE.CatmullRomCurve3(path.map(([x, z]) => new THREE.Vector3(x, pathY(z), z)), false, 'centripetal');
  }
  function pathRibbon(curve: THREE.Curve<THREE.Vector3>, w = 2.8) {
    const N = 300, pos: number[] = [], col: number[] = [], nor: number[] = [], edge = C(P.pathEdge), mid = C(P.path), ring: [number, number, number][][] = [];
    for (let i = 0; i <= N; i++) {
      const p = curve.getPointAt(i / N), t = curve.getTangentAt(i / N);
      const nx = -t.z, nz = t.x, l = Math.hypot(nx, nz) || 1, y = pathY(p.z) + 0.04;
      ring.push([-w / 2, -w / 2 + 0.3, w / 2 - 0.3, w / 2].map((o): [number, number, number] => [p.x + (nx / l) * o, y, p.z + (nz / l) * o]));
    }
    const cols = [edge, mid, mid, edge];
    for (let i = 0; i < N; i++) for (let j = 0; j < 3; j++) {
      const a = ring[i][j], b = ring[i][j + 1], c = ring[i + 1][j], d = ring[i + 1][j + 1];
      const shade = j === 1 && i % 6 < 3 ? 0.97 : 1;
      for (const [v, cc] of [[a, cols[j]], [b, cols[j + 1]], [c, cols[j]], [b, cols[j + 1]], [d, cols[j + 1]], [c, cols[j]]] as [number[], THREE.Color][]) { pos.push(...v); col.push(cc.r * shade, cc.g * shade, cc.b * shade); nor.push(0, 1, 0); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.receiveShadow = true;
    const k = new Kit();
    for (const [z0, z1, y0, y1] of RAMPS) {
      const zm = (z0 + z1) / 2, near = curve.getPoints(90).reduce((b, p) => (Math.abs(p.z - zm) < Math.abs(b.z - zm) ? p : b));
      const len = Math.hypot(z0 - z1, y1 - y0), ang = Math.atan2(y1 - y0, z0 - z1);
      k.add('box', P.cliffDark, { p: [near.x, (y0 + y1) / 2 - 0.55, zm], r: [ang, 0, 0], s: [w + 0.4, 1, len + 0.2] });
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) k.add('box', P.post, { p: [near.x + sx * (w / 2 + 0.22), y0 + (y1 - y0) * (i / 3) + 0.3, z0 - (z0 - z1) * (i / 3)], s: [0.16, 0.6, 0.16] });
    }
    const g2 = new THREE.Group(); g2.add(m, k.mesh());
    return g2;
  }
  return { ISLE, levelAt, pathY, terrain, pathCurve, pathRibbon };
}
