// The art island's 3D models, all made in code: pink-and-cream terraces in
// a turquoise sea, and one place per lesson of the art book, in its order —
// the square of colour circles, Fatna's house, the street in perspective,
// Braque's cubist studio, Palmyra, the painted African village, the norias
// of the Orontes, the cardboard workshop, the realist's studio with its soap
// bubbles, the mandala garden, the Damascene house, the house of ideas
// (paper butterflies, clay, logs), the wall of lines, the crafts market and
// the artists' gallery on the hill. Plus the gallery of paintings at the
// harbour (one painting per finished quest) and the helper «ريشة», a little
// paintbrush. Most places show their lesson's painting (art.js) on an easel.
// Units: 1 ≈ 1 metre; Y is up; the camera looks from +Z.

import * as THREE from '../../vendor/three/three.module.min.js';
import { Kit, VC, rng, roundBox } from '../farm/models.js';
import { treeGeo, bushGeo, rockGeo, personGeo, put, glow } from '../tunes/models.js';
import { makeGround } from '../isle/ground.js';
import { plinth as basePlinth, beaconArrow, selectRing, sparkSprite, lampGeo } from '../isle/kit.js';
import { drawArt, LESSON_ART } from './art.js';

export { treeGeo, bushGeo, rockGeo, personGeo, put, glow, beaconArrow, selectRing, sparkSprite };
const lampGeoS = () => lampGeo('#8a4fc9', '#fff1d0');
export { lampGeoS as lampGeo };

const kit = () => new Kit();
const LO = new THREE.SphereGeometry(1, 12, 8);
const mat = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
const mesh = (geo, m) => { const x = new THREE.Mesh(geo, m); x.castShadow = true; return x; };

export const PAL = {
  grass: '#bfe08a', grassB: '#c9e595', grassC: '#d3e89c', grassD: '#dce9a6',
  cliff: '#f7d6c9', cliffDark: '#d99a8a', sand: '#fbe3b4', sandSide: '#e9c189',
  path: '#fff1dc', pathEdge: '#e8c6a0', white: '#fffaf2', cream: '#f6e8cc', wood: '#a8703f', woodLight: '#c99863',
  ink: '#3b2414', red: '#e8453c', orange: '#f28c1a', yellow: '#ffd23f', blue: '#2f7fd6', green: '#34b04a', purple: '#8a4fc9', pink: '#ff9fc4', teal: '#2fb3a8',
};
export const UNIT_COLORS = { 1: '#e8453c', 2: '#3f8fd6', 3: '#e0a93a', 4: '#2fb3a8', 5: '#8a63c9' };
const plinth = (k, unit, opts) => basePlinth(k, UNIT_COLORS[unit], { top: PAL.white, side: PAL.cream, ...opts });

// ---------- Ground ----------
const G = makeGround({
  isle: { cx: 0, cz: -14.5, hx: 19.5, hz: 57 },
  levels: [[0.9, Infinity], [2.1, 6], [3.3, -20], [4.6, -46]],
  slabs: [
    [0, -14.5, 16.4, 53.4, 5, 0.8, 5, 0.9, 0.5, PAL.grass],
    [0, -27, 15.6, 33, 6, 0.6, 7, 2.1, 1.1, PAL.grassB],
    [0, -40, 15, 20, 6, 0.5, 9, 3.3, 1.1, PAL.grassC],
    [0.3, -57.6, 13.4, 11.6, 5, 0.5, 11, 4.6, 1.2, PAL.grassD],
  ],
  ramps: [[9.2, 5.4, 0.9, 2.1], [-16.6, -20.4, 2.1, 3.3], [-42.6, -46.4, 3.3, 4.6]],
  path: [[14, 38], [8, 35], [2.5, 31.5], [0.6, 26], [1, 20], [0.8, 14], [0.6, 8], [0.4, 3], [0.8, -3], [0.2, -9], [0.8, -15], [0.4, -21], [0.8, -27], [0.2, -33], [0.8, -39], [0.6, -44], [0.8, -48], [0.3, -53], [0.8, -57.5], [0.7, -60.5]],
  pal: { sand: PAL.sand, sandSide: PAL.sandSide, cliff: PAL.cliff, cliffDark: PAL.cliffDark, path: PAL.path, pathEdge: PAL.pathEdge, post: PAL.white },
});
export const { ISLE, levelAt, pathY, terrain, pathCurve, pathRibbon } = G;

// ---------- Canvas pictures ----------
const texCache = {};
function canvasTex(key, w, h, draw) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  texCache[key] = t;
  return t;
}
// A painting of the book (art.js) as a texture.
const artTex = key => canvasTex(`art-${key}`, 250, 200, (g, w, h) => drawArt(g, key, 0, 0, w, h));
const artMat = key => new THREE.MeshLambertMaterial({ map: artTex(key) });
// A flat picture facing +Z (w × h), e.g. a canvas on an easel.
function picture(key, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), artMat(key));
  m.castShadow = false;
  return m;
}
// A wooden easel at (x, y, z) turned by ry, holding a painting: legs in the
// kit, the painting added to the group. Returns the painting.
function easel(g, k, key, x, y, z, ry = 0, s = 1) {
  const c = Math.cos(ry), sn = Math.sin(ry), P = (lx, ly, lz) => [x + lx * c + lz * sn, y + ly, z - lx * sn + lz * c];
  for (const sx of [-1, 1]) k.add('box', PAL.wood, { p: P(sx * 0.55 * s, 1.15 * s, 0.05 * s), r: [-0.1, ry, sx * -0.12], s: [0.09 * s, 2.4 * s, 0.09 * s] });
  k.add('box', PAL.wood, { p: P(0, 1.1 * s, -0.42 * s), r: [0.32, ry, 0], s: [0.08 * s, 2.3 * s, 0.08 * s] });
  k.add('box', PAL.woodLight, { p: P(0, 0.78 * s, 0.16 * s), r: [-0.1, ry, 0], s: [1.45 * s, 0.08 * s, 0.2 * s] });
  k.add('box', PAL.ink, { p: P(0, 1.42 * s, 0.1 * s), r: [-0.1, ry, 0], s: [1.42 * s, 1.14 * s, 0.05 * s] });
  const pic = picture(key, 1.32 * s, 1.04 * s);
  pic.position.set(...P(0, 1.42 * s, 0.135 * s));
  pic.rotation.set(-0.1, ry, 0, 'YXZ');
  g.add(pic);
  return pic;
}
// Concentric discs standing on edge (a target of colour), facing +Z.
function discs(cols, r0, step, depth = 0.06) {
  const k = kit();
  cols.forEach((c, i) => k.add('cyl', c, { p: [0, 0, i * 0.012], r: [Math.PI / 2, 0, 0], s: [r0 - i * step, depth, r0 - i * step] }));
  return k;
}
const STRIPES = (g, w, h, cols, n = 8) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(0, (i * h) / n, w, h / n + 1); } };

// ---------- Places, in the book's order ----------

// Lessons 1–2 · The square of colour circles: two great targets of warm and
// cold colours that turn and cross, free straight lines through them, and a
// floor of squares cut into triangles.
export function circlesSquare() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 1, { r: 5.4 });
  const tri = ['#e8453c', '#2f7fd6', '#ffd23f', '#34b04a', '#f28c1a', '#8a4fc9', '#fffaf2', '#1f1612'];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
    const x = -2.6 + i * 1.3, z = 0.6 + j * 1.05;
    if (Math.hypot(x, z) > 4.6) continue;
    k.add('box', tri[(i * 3 + j) % 8], { p: [x, h + 0.02, z], s: [1.28, 0.04, 1.03] });
    k.add(new THREE.CylinderGeometry(0.73, 0.73, 0.05, 3), tri[(i * 5 + j * 3 + 2) % 8], { p: [x + 0.12, h + 0.03, z + 0.1], r: [0, (i + j) % 2 ? Math.PI / 4 : -Math.PI / 4, 0], s: [1, 1, 1] });
  }
  for (const [x, z, ry, l] of [[-0.6, -1.2, 0.5, 9], [0.8, -1.6, -0.7, 8.6], [-3.2, -0.8, 1.3, 4]]) k.add('box', PAL.ink, { p: [x, h + 2.2, z], r: [0, ry, 0.35], s: [l, 0.12, 0.12] });
  for (const x of [-1.9, 1.9]) k.add('cyl', PAL.ink, { p: [x, h + 1.4, -1.9], s: [0.1, 2.8, 0.1] });
  put(k, personGeo(201), 3.6, h, 1.8, -0.8, 1); put(k, personGeo(202), -3.4, h, 2.4, 0.6, 1);
  g.add(k.mesh());
  const a = discs(['#e8453c', '#f28c1a', '#ffd23f', '#e8453c', '#fff2a8'], 2.1, 0.4).mesh(VC);
  a.position.set(-1.2, h + 3, -1.9); g.add(a);
  const b = discs(['#2f7fd6', '#34b04a', '#8a4fc9', '#a9d8ff', '#1d3f8a'], 1.8, 0.34).mesh(VC);
  b.position.set(1.5, h + 2.7, -1.75); g.add(b);
  g.userData = { height: h + 5.2, discs: [a, b] };
  return g;
}

// Lesson 3 · Fatna Kabbouri's house: a white Moroccan house with a horseshoe
// door and a band of zellij, a teapot on a low table, and her painting.
export function fatnaHouse() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { w: 9.4, d: 8 });
  k.add(roundBox(5, 3.2, 3, 0.1), PAL.white, { p: [0, h + 1.6, -1.8] });
  k.add('box', '#2f9a6a', { p: [0, h + 3.28, -1.8], s: [5.3, 0.2, 3.3] });
  for (let i = 0; i < 10; i++) k.add('box', ['#2f7fd6', '#ffd23f', '#e8453c', '#34b04a'][i % 4], { p: [-2.25 + i * 0.5, h + 0.42, -0.28], s: [0.46, 0.46, 0.06] });
  k.add('box', '#c98a4a', { p: [0, h + 1.05, -0.27], s: [1.1, 1.9, 0.06] });
  k.add(new THREE.TorusGeometry(0.62, 0.16, 6, 18, Math.PI * 1.3), '#2f9a6a', { p: [0, h + 2, -0.24], r: [0, 0, -0.15 * Math.PI] });
  for (const x of [-1.7, 1.7]) { k.add('box', '#2f7fd6', { p: [x, h + 2.1, -0.28], s: [0.7, 0.8, 0.06] }); k.add('box', PAL.white, { p: [x, h + 2.1, -0.24], s: [0.08, 0.8, 0.04] }); }
  // the low table and the teapot
  k.add(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 18), '#c98a4a', { p: [2.4, h + 0.5, 1.8] });
  k.add('cyl', '#a8703f', { p: [2.4, h + 0.25, 1.8], s: [0.12, 0.5, 0.12] });
  k.add(LO, '#d9d2c8', { p: [2.4, h + 0.78, 1.8], s: [0.26, 0.24, 0.26] });
  k.add(new THREE.ConeGeometry(0.14, 0.3, 10), '#d9d2c8', { p: [2.4, h + 1.08, 1.8] });
  k.add('cyl', '#d9d2c8', { p: [2.68, h + 0.86, 1.86], r: [0, 0, -0.9], s: [0.04, 0.4, 0.04] });
  for (const [x, z] of [[2, 2.3], [2.8, 2.3], [2.4, 1.3]]) k.add('cyl', '#ffd23f', { p: [x, h + 0.62, z], s: [0.07, 0.16, 0.07] });
  put(k, personGeo(211, { sit: true }), 1.4, h, 2.4, 0.9, 1); put(k, personGeo(212, { sit: true }), 3.4, h, 2.6, -1.1, 1);
  const pic = easel(g, k, 'fatna', -2.6, h, 1.6, 0.35);
  g.add(k.mesh());
  g.userData = { height: h + 4.2, pic };
  return g;
}

// Lesson 4 · The street in perspective: a road whose edges meet at the
// vanishing point, trees and lamps that shrink as they go, a painter.
export function perspectiveStreet() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 1, { w: 9.6, d: 8.4 });
  // wide near the viewer (+Z), narrow at the vanishing point (−Z)
  const road = new THREE.Shape([new THREE.Vector2(-2.2, -3.8), new THREE.Vector2(2.2, -3.8), new THREE.Vector2(0.08, 3.8), new THREE.Vector2(-0.08, 3.8)]);
  const rg = new THREE.ShapeGeometry(road); rg.rotateX(-Math.PI / 2);
  k.add(rg, '#4a4f5a', { p: [0, h + 0.03, 0] });
  for (let i = 0; i < 6; i++) { const t = i / 6, z = 3.4 - t * 6.8, w = 0.16 * (1 - t * 0.85); k.add('box', '#ffffff', { p: [0, h + 0.05, z], s: [w, 0.02, 0.5 * (1 - t * 0.8)] }); }
  for (let i = 0; i < 5; i++) {
    const t = i / 5, z = 3 - t * 6.4, sc = 1 - t * 0.78, x = 2.6 * (1 - t * 0.9) + 0.3;
    for (const side of [-1, 1]) {
      const tx = side * x;
      k.add('cyl', '#8a5a34', { p: [tx, h + 0.5 * sc, z], s: [0.1 * sc, 1 * sc, 0.1 * sc] });
      k.add(LO, i % 2 ? '#3f9a4e' : '#2f8a3f', { p: [tx, h + 1.3 * sc, z], s: 0.55 * sc });
      if (i % 2 === 0) { k.add('cyl', '#4d434c', { p: [tx - side * 0.5 * sc, h + 0.9 * sc, z - 0.3], s: [0.04 * sc, 1.8 * sc, 0.04 * sc] }); k.add(LO, '#ffd36b', { p: [tx - side * 0.5 * sc, h + 1.85 * sc, z - 0.3], s: 0.1 * sc }); }
    }
    if (i < 4) for (const side of [-1, 1]) k.add('box', ['#f3e6c8', '#ffd9c2', '#d9e8f6', '#fbe7a6'][i], { p: [side * (x + 1.3 * sc), h + 0.9 * sc, z - 0.2], s: [1.1 * sc, 1.8 * sc, 1.2 * sc] });
  }
  // the vanishing point: a red marker at the far end, and the horizon line
  k.add(LO, '#e8453c', { p: [0, h + 0.5, -3.95], s: 0.16 });
  k.add('box', '#e8453c', { p: [0, h + 0.5, -4.05], s: [8.6, 0.05, 0.05] });
  put(k, personGeo(221), -3.4, h, 3.2, 0.5, 1);
  const pic = easel(g, k, 'street', -2.6, h, 2.7, 0.5, 0.9);
  g.add(k.mesh());
  g.userData = { height: h + 3.2, pic };
  return g;
}

// Lesson 5 · Braque's cubist studio: a still life of facets — a jug, lemons,
// a pear and a mandolin made of boxes on a table with a white cloth, and big
// cubes with a side in light and a side in shadow.
export function cubistStudio() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { w: 9.2, d: 8 });
  k.add('box', '#8a5a34', { p: [0, h + 1, -0.6], s: [4.6, 0.16, 2.4] });
  for (const [x, z] of [[-2, -1.6], [2, -1.6], [-2, 0.4], [2, 0.4]]) k.add('box', '#6b4226', { p: [x, h + 0.5, z], s: [0.16, 1, 0.16] });
  k.add('box', '#f6f1e4', { p: [-0.6, h + 1.1, -0.4], r: [0, 0.2, 0], s: [2.8, 0.04, 2] });
  k.add(new THREE.CylinderGeometry(0.42, 0.55, 1.4, 6), '#ffd23f', { p: [-1.1, h + 1.82, -0.9] });
  k.add(new THREE.CylinderGeometry(0.28, 0.42, 0.4, 6), '#e0b52a', { p: [-1.1, h + 2.7, -0.9] });
  k.add('box', '#c9a32a', { p: [-1.55, h + 2.1, -0.9], r: [0, 0, 0.4], s: [0.1, 0.8, 0.14] });
  for (const [x, z] of [[0.2, -0.2], [0.6, 0.1], [-0.2, 0.2]]) k.add(new THREE.IcosahedronGeometry(0.22, 0), '#ffe14a', { p: [x, h + 1.32, z], s: [1.2, 0.85, 0.85] });
  k.add(new THREE.IcosahedronGeometry(0.3, 0), '#9fcf4a', { p: [1, h + 1.42, -0.6], s: [0.9, 1.2, 0.9] });
  // the mandolin: a body of facets and a neck
  k.add(new THREE.CylinderGeometry(0.6, 0.6, 0.18, 6), '#b8682e', { p: [1.3, h + 1.9, -1.5], r: [Math.PI / 2, 0, 0.3] });
  k.add('box', '#6b4226', { p: [1.62, h + 2.6, -1.5], r: [0, 0, 0.3], s: [0.16, 1.2, 0.1] });
  k.add(LO, '#3b2414', { p: [1.3, h + 1.9, -1.39], s: [0.14, 0.14, 0.02] });
  // big cubes: a light face and a shadow face
  for (const [x, z, s] of [[-3.4, 1.8, 1], [3.5, 2, 0.8], [3.1, -2.4, 1.2]]) {
    k.add('box', '#d9c79e', { p: [x, h + s / 2, z], r: [0, 0.6, 0], s: [s, s, s] });
    k.add('box', '#f6efd6', { p: [x - 0.02, h + s + 0.01, z], r: [0, 0.6, 0], s: [s * 0.98, 0.02, s * 0.98] });
    k.add('box', '#8a7a5a', { p: [x + Math.cos(0.6) * s * 0.5, h + s / 2, z - Math.sin(0.6) * s * 0.5 + 0.02], r: [0, 0.6, 0], s: [0.02, s * 0.98, s * 0.98] });
  }
  put(k, personGeo(231, { prop: 'book' }), -1.6, h, 2.8, 0.3, 1);
  const pic = easel(g, k, 'braque', 2, h, 2.4, -0.4, 0.95);
  g.add(k.mesh());
  g.userData = { height: h + 3.6, pic };
  return g;
}

// Lessons 6–7 · Palmyra: a colonnade, the monumental arch, a relief of a
// banquet carved in soft limestone, and the lion holding a gazelle.
export function palmyra() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 3, { w: 9.8, d: 8.2, top: '#f4e6c4' });
  const stone = '#e8cf9a', dark = '#c9a96a';
  for (let i = 0; i < 6; i++) {
    const x = -3.8 + i * 1.5;
    k.add(new THREE.CylinderGeometry(0.24, 0.28, 3.2, 10), stone, { p: [x, h + 1.7, -2.6] });
    k.add('box', dark, { p: [x, h + 3.36, -2.6], s: [0.7, 0.18, 0.7] });
    k.add('box', dark, { p: [x, h + 0.1, -2.6], s: [0.66, 0.2, 0.66] });
  }
  k.add('box', stone, { p: [0, h + 3.6, -2.6], s: [8.2, 0.35, 0.8] });
  // the arch: a big one between two small ones
  for (const [x, w, ah] of [[-1.9, 0.7, 1.5], [0, 1.2, 2.1], [1.9, 0.7, 1.5]]) {
    k.add('box', stone, { p: [x - w - 0.2, h + ah / 2, 0.2], s: [0.4, ah, 0.7] });
    k.add('box', stone, { p: [x + w + 0.2, h + ah / 2, 0.2], s: [0.4, ah, 0.7] });
    k.add(new THREE.TorusGeometry(w + 0.2, 0.2, 6, 14, Math.PI), stone, { p: [x, h + ah, 0.2], s: [1, 1, 1.75] });
  }
  k.add('box', stone, { p: [0, h + 3.55, 0.2], s: [5.6, 0.4, 0.75] });
  // the relief: a slab with figures standing out of it
  k.add('box', '#efdcb0', { p: [3.3, h + 0.9, 2.2], r: [0, -0.4, 0], s: [2.2, 1.6, 0.3] });
  for (let i = 0; i < 4; i++) { const lx = -0.7 + i * 0.47; k.add('cyl', '#e2c98e', { p: [3.3 + lx * Math.cos(-0.4), h + 0.85, 2.2 - lx * Math.sin(-0.4) + 0.18], s: [0.12, 0.9, 0.08] }); k.add(LO, '#e2c98e', { p: [3.3 + lx * Math.cos(-0.4), h + 1.42, 2.2 - lx * Math.sin(-0.4) + 0.18], s: 0.12 }); }
  // the lion holding a gazelle (in the round)
  k.add('box', dark, { p: [-3.3, h + 0.35, 2.2], s: [1.8, 0.7, 1.1] });
  k.add(LO, '#e9d8b0', { p: [-3.3, h + 1.1, 2.1], s: [0.7, 0.45, 0.42] });
  k.add(LO, '#d9bf86', { p: [-2.75, h + 1.45, 2.15], s: 0.42 });
  k.add(LO, '#efdcb0', { p: [-2.62, h + 1.45, 2.4], s: 0.25 });
  k.add(LO, '#e2c98e', { p: [-3.3, h + 0.82, 2.55], s: [0.6, 0.16, 0.2] });
  put(k, personGeo(241), 3.6, h, -0.6, -1.2, 1); put(k, personGeo(242, { prop: 'book' }), -1, h, 2.6, 0.2, 1);
  g.add(k.mesh());
  g.userData = { height: h + 4.2 };
  return g;
}

// Lesson 8 · The painted African village: round huts painted with bold
// stripes and circles, a great wooden mask, a necklace of beads, drums.
export function africanVillage() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 3, { r: 5.4, top: '#f3d9a8' });
  const hut = (x, z, r, cols) => {
    k.add(new THREE.CylinderGeometry(r, r * 1.05, 1.8, 18), cols[0], { p: [x, h + 0.9, z] });
    for (let i = 0; i < 3; i++) k.add(new THREE.CylinderGeometry(r + 0.02, r + 0.03, 0.18, 18), cols[1 + (i % 2)], { p: [x, h + 0.35 + i * 0.5, z] });
    for (let i = 0; i < 5; i++) { const a = -0.6 + i * 0.3; k.add('cyl', cols[3], { p: [x + Math.sin(a) * (r + 0.02), h + 1.1, z + Math.cos(a) * (r + 0.02)], r: [Math.PI / 2, a, 0], s: [0.16, 0.04, 0.16] }); }
    k.add(new THREE.ConeGeometry(r * 1.45, 1.7, 18), '#d9a85a', { p: [x, h + 2.6, z] });
    k.add(new THREE.ConeGeometry(r * 1.5, 0.3, 18), '#b8863a', { p: [x, h + 1.9, z] });
    k.add('box', '#3b2414', { p: [x, h + 0.6, z + r], s: [0.6, 1.1, 0.06] });
  };
  hut(-2.4, -1.6, 1.5, ['#f6efe0', '#e8453c', '#1f1612', '#2f7fd6']);
  hut(2.2, -2, 1.3, ['#ffd23f', '#1f1612', '#34b04a', '#e8453c']);
  // the mask on a post: long, symmetric, with stripes and red lips
  k.add('box', '#6b4226', { p: [0.2, h + 1, 0.8], s: [0.14, 2, 0.14] });
  k.add(LO, '#8a4a24', { p: [0.2, h + 2.4, 0.9], s: [0.55, 0.95, 0.2] });
  for (const sx of [-1, 1]) { k.add(LO, '#fffaf2', { p: [0.2 + sx * 0.2, h + 2.6, 1.07], s: [0.13, 0.07, 0.04] }); k.add('box', '#ffd23f', { p: [0.2 + sx * 0.3, h + 2.25, 1.06], s: [0.06, 0.4, 0.03] }); }
  k.add(LO, '#e8453c', { p: [0.2, h + 2.0, 1.08], s: [0.12, 0.06, 0.04] });
  k.add('box', '#ffd23f', { p: [0.2, h + 3.15, 0.92], s: [0.7, 0.12, 0.12] });
  // a necklace of beads on a stand, and drums
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; k.add(LO, ['#e8453c', '#ffd23f', '#2f7fd6', '#34b04a', '#fffaf2', '#1f1612', '#f28c1a'][i % 7], { p: [3.2 + Math.cos(a) * 0.55, h + 1.3 + Math.sin(a) * 0.55, 1.8], s: 0.12 }); }
  k.add('box', PAL.wood, { p: [3.2, h + 0.95, 1.72], s: [0.1, 1.9, 0.1] });
  for (const [x, z, s] of [[-3.6, 1.8, 1], [-2.9, 2.6, 0.75]]) { k.add(new THREE.CylinderGeometry(0.36 * s, 0.26 * s, 0.9 * s, 12), '#b8682e', { p: [x, h + 0.45 * s, z] }); k.add(new THREE.CylinderGeometry(0.37 * s, 0.37 * s, 0.04, 12), '#f3e2c0', { p: [x, h + 0.92 * s, z] }); }
  put(k, personGeo(251, { prop: 'drum' }), -1.6, h, 2.6, 0.4, 1); put(k, personGeo(252), 1.8, h, 2.8, -0.5, 1);
  g.add(k.mesh());
  g.userData = { height: h + 3.9 };
  return g;
}

// Lessons 9–10 · The norias of the Orontes in Hama: a great wooden wheel
// that turns in the river, the aqueduct on its arches, sunflowers and an
// olive tree from Ursula Bahr's fields, a violinist.
export function noria() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { w: 9.8, d: 8.2 });
  k.add('box', '#3f8fc0', { p: [0, h + 0.03, 1.2], s: [9.4, 0.06, 2.2] });
  for (let i = 0; i < 6; i++) k.add('box', '#9fd3ff', { p: [-4 + i * 1.6, h + 0.07, 1 + (i % 2) * 0.5], s: [0.8, 0.02, 0.06] });
  // the aqueduct: arches carrying the water
  for (let i = 0; i < 4; i++) {
    const x = -4 + i * 1.2;
    k.add('box', '#e8d4a8', { p: [x, h + 1.3, -1.6], s: [0.32, 2.6, 0.7] });
    k.add(new THREE.TorusGeometry(0.44, 0.14, 6, 12, Math.PI), '#e8d4a8', { p: [x + 0.6, h + 2.2, -1.6], s: [1, 1, 2.4] });
  }
  k.add('box', '#d9c18e', { p: [-2.2, h + 2.75, -1.6], s: [4.4, 0.4, 0.8] });
  k.add('box', '#e8d4a8', { p: [1.2, h + 1.6, -1.6], s: [0.5, 3.2, 0.8] });
  // the olive tree and the sunflowers
  k.add('cyl', '#7a5a3a', { p: [-3.5, h + 0.6, 2.9], s: [0.16, 1.2, 0.16] });
  k.add(LO, '#8aa05a', { p: [-3.5, h + 1.5, 2.9], s: [0.8, 0.55, 0.7] });
  for (let i = 0; i < 5; i++) { const x = 2.2 + i * 0.5, z = 3 - (i % 2) * 0.4; k.add('cyl', '#3f8a3a', { p: [x, h + 0.55, z], s: [0.03, 1.1, 0.03] }); k.add('cyl', '#ffd23f', { p: [x, h + 1.15, z], r: [Math.PI / 2 - 0.3, 0, 0], s: [0.22, 0.03, 0.22] }); k.add('cyl', '#6b4226', { p: [x, h + 1.16, z + 0.02], r: [Math.PI / 2 - 0.3, 0, 0], s: [0.1, 0.035, 0.1] }); }
  put(k, personGeo(261, { prop: 'violin' }), -1.6, h, 3, 0.3, 1);
  g.add(k.mesh());
  // the wheel turns
  const wheel = new THREE.Group(), wk = kit();
  wk.add('torus', '#8a5a34', { s: [2.3, 2.3, 1.2] });
  wk.add('torus', '#a8703f', { s: [1.4, 1.4, 1] });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; wk.add('box', '#7a4a2a', { p: [Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0], r: [0, 0, a], s: [2.3, 0.1, 0.1] }); wk.add('box', '#6b4226', { p: [Math.cos(a) * 2.35, Math.sin(a) * 2.35, 0], r: [0, 0, a], s: [0.3, 0.26, 0.36] }); }
  wk.add('cyl', '#5a3a22', { r: [Math.PI / 2, 0, 0], s: [0.24, 0.6, 0.24] });
  wheel.add(wk.mesh(VC));
  wheel.position.set(2.6, h + 2.5, 0.2);
  wheel.rotation.y = Math.PI / 2 - 0.25;
  g.add(wheel);
  g.userData = { height: h + 5.2, wheel };
  return g;
}

// Lesson 11 · The cardboard workshop: stacked boxes, a flower cut into
// cardboard so its waves show, a cutter and tape.
export function cardboardWorkshop() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 4, { w: 9, d: 7.6 });
  const box = (x, y, z, w, hh, d, ry = 0) => { k.add('box', '#c9955b', { p: [x, y + hh / 2, z], r: [0, ry, 0], s: [w, hh, d] }); k.add('box', '#b07c44', { p: [x, y + hh - 0.02, z], r: [0, ry, 0], s: [w * 0.06, 0.03, d * 1.01] }); };
  box(-3, h, -1.6, 1.4, 1.1, 1.2, 0.2); box(-3, h + 1.1, -1.6, 1.1, 0.9, 1, -0.1); box(-1.6, h, -2.1, 1.2, 0.9, 1.1, 0.4); box(3.2, h, 1.4, 1, 0.8, 1, -0.3);
  // the panel: a cardboard with a flower peeled out (corrugation lines)
  k.add('box', '#d9a86a', { p: [0.8, h + 1.7, -2], s: [3.2, 2.6, 0.12] });
  for (let i = 0; i < 9; i++) k.add('box', '#b8834a', { p: [0.8, h + 0.55 + i * 0.28, -1.92], s: [3.1, 0.06, 0.03] });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; k.add(LO, '#e8b878', { p: [0.8 + Math.cos(a) * 0.55, h + 1.9 + Math.sin(a) * 0.55, -1.88], s: [0.36, 0.36, 0.04] }); }
  k.add(LO, '#a8703f', { p: [0.8, h + 1.9, -1.85], s: [0.3, 0.3, 0.05] });
  k.add('box', '#5a8a3a', { p: [0.8, h + 1, -1.88], s: [0.08, 1.1, 0.03] });
  // a work table with the cutter and a roll of tape
  k.add('box', PAL.woodLight, { p: [1.4, h + 0.8, 1.2], s: [2.4, 0.12, 1.3] });
  for (const [x, z] of [[0.3, 0.7], [2.5, 0.7], [0.3, 1.7], [2.5, 1.7]]) k.add('box', PAL.wood, { p: [x, h + 0.4, z], s: [0.1, 0.8, 0.1] });
  k.add('box', '#ffd23f', { p: [1, h + 0.9, 1.2], r: [0, 0.4, 0], s: [0.5, 0.06, 0.1] }); k.add('box', '#b8bec4', { p: [1.3, h + 0.9, 1.08], r: [0, 0.4, 0], s: [0.2, 0.03, 0.05] });
  k.add('torus', '#c9a86a', { p: [2, h + 0.95, 1.3], r: [Math.PI / 2, 0, 0], s: [0.24, 0.24, 0.6] });
  put(k, personGeo(271), -0.6, h, 2, 0.4, 1);
  g.add(k.mesh());
  g.userData = { height: h + 3.5 };
  return g;
}

// Lesson 12 · The realist's studio: a great easel with the girl blowing
// soap bubbles, and real bubbles that float up.
export function realistStudio() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { r: 5.2 });
  const pic = easel(g, k, 'bubbles', 0, h, -1, 0, 1.9);
  // a stool, a palette, paint tubes
  k.add(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 14), PAL.woodLight, { p: [-2.6, h + 0.75, 1.2] });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.add('cyl', PAL.wood, { p: [-2.6 + Math.cos(a) * 0.28, h + 0.37, 1.2 + Math.sin(a) * 0.28], s: [0.04, 0.75, 0.04] }); }
  k.add('cyl', '#f3d9a8', { p: [2.4, h + 0.06, 1.6], s: [0.7, 0.05, 0.5] });
  [['#e8453c', 2.1, 1.4], ['#ffd23f', 2.4, 1.3], ['#2f7fd6', 2.7, 1.45], ['#34b04a', 2.8, 1.8]].forEach(([c, x, z]) => k.add(LO, c, { p: [x, h + 0.12, z], s: [0.1, 0.05, 0.1] }));
  put(k, personGeo(281), 2.6, h, -0.4, -0.9, 1);
  g.add(k.mesh());
  const bubbles = [];
  const bm = new THREE.MeshPhongMaterial({ color: '#cfefff', transparent: true, opacity: 0.45, shininess: 90, specular: '#ffffff', depthWrite: false });
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.18 + (i % 3) * 0.08, 14, 10), bm);
    b.userData = { x: -1.4 + (i % 4) * 0.9, z: 0.8 - (i % 2) * 0.8, t: i / 7 };
    g.add(b); bubbles.push(b);
  }
  g.userData = { height: h + 4.6, pic, bubbles, baseH: h };
  return g;
}

// Lesson 13 · The mandala garden: a great round mandala of petals on the
// ground, a painted mandala disc that turns, painted stones.
export function mandalaGarden() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 3, { r: 5.4, top: '#fff6e6' });
  const rings = [[3.6, 16, '#8a4fc9'], [2.8, 12, '#2fb3a8'], [2, 10, '#f28c1a'], [1.2, 8, '#e8453c']];
  for (const [r, n, c] of rings) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; k.add(LO, i % 2 ? c : '#ffd23f', { p: [Math.cos(a) * r, h + 0.04, 1 + Math.sin(a) * r * 0.55], r: [0, -a, 0], s: [0.42, 0.04, 0.2] }); }
  k.add('cyl', '#ffd23f', { p: [0, h + 0.05, 1], s: [0.5, 0.06, 0.5] });
  for (const [x, z, c] of [[-4, -1.6, '#e8453c'], [4, -1.4, '#2f7fd6'], [-3.6, 3, '#34b04a'], [3.8, 2.8, '#f28c1a']]) { k.add(LO, '#d9d2c8', { p: [x, h + 0.2, z], s: [0.42, 0.24, 0.36] }); k.add(LO, c, { p: [x, h + 0.36, z], s: [0.2, 0.1, 0.18] }); }
  k.add('box', PAL.wood, { p: [0, h + 1.2, -2.3], s: [0.2, 2.4, 0.2] });
  g.add(k.mesh());
  // the turning disc
  const dk = kit();
  dk.add('cyl', '#2a1a3e', { r: [Math.PI / 2, 0, 0], s: [1.9, 0.1, 1.9] });
  for (const [r, n, c, s] of [[1.55, 16, '#ffd23f', 0.2], [1.1, 12, '#e8453c', 0.22], [0.65, 8, '#2fb3a8', 0.2]]) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; dk.add(LO, c, { p: [Math.cos(a) * r, Math.sin(a) * r, 0.08], r: [0, 0, a], s: [s * 1.6, s, 0.05] }); }
  dk.add('cyl', '#f28c1a', { p: [0, 0, 0.1], r: [Math.PI / 2, 0, 0], s: [0.3, 0.06, 0.3] });
  const disc = dk.mesh(VC);
  disc.position.set(0, h + 3, -2.1);
  g.add(disc);
  g.userData = { height: h + 5.2, disc };
  return g;
}

// Lesson 14 · The Damascene house: a courtyard with walls striped in black
// and white stone (ablaq), an iwan, a fountain, a lemon tree and jasmine,
// and two women in folk dress.
export function damasceneHouse() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { w: 9.6, d: 8.2, top: '#f1e6cf' });
  // the courtyard floor in patterned stone
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) k.add('box', (i + j) % 2 ? '#e9dcc0' : '#d9c7a0', { p: [-2.5 + i, h + 0.02, -0.4 + j], s: [0.98, 0.03, 0.98] });
  // the back wall with its ablaq stripes and the iwan
  for (let i = 0; i < 10; i++) k.add('box', i % 2 ? '#3b3640' : '#f3e6c8', { p: [0, h + 0.18 + i * 0.36, -2.6], s: [8.6, 0.36, 0.6] });
  k.add('box', '#7a5130', { p: [0, h + 1.3, -2.28], s: [2, 2.6, 0.06] });
  k.add(new THREE.TorusGeometry(1.1, 0.2, 6, 16, Math.PI), '#f3e6c8', { p: [0, h + 2.6, -2.25], s: [1, 1, 0.8] });
  for (const x of [-1.2, 1.2]) k.add('box', '#f3e6c8', { p: [x, h + 1.3, -2.25], s: [0.3, 2.6, 0.2] });
  for (const x of [-3.2, 3.2]) { k.add('box', '#2f7a9a', { p: [x, h + 1.8, -2.28], s: [0.8, 1.1, 0.05] }); k.add('box', '#f3e6c8', { p: [x, h + 1.8, -2.24], s: [0.06, 1.1, 0.04] }); }
  // the fountain
  k.add(new THREE.CylinderGeometry(1.1, 1.2, 0.5, 8), '#e9dcc0', { p: [0.4, h + 0.25, 1.2] });
  k.add(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 8), '#4fb0d8', { p: [0.4, h + 0.48, 1.2] });
  k.add('cyl', '#e9dcc0', { p: [0.4, h + 0.75, 1.2], s: [0.12, 0.6, 0.12] });
  k.add(new THREE.CylinderGeometry(0.35, 0.2, 0.15, 8), '#e9dcc0', { p: [0.4, h + 1.1, 1.2] });
  // the lemon tree and jasmine
  k.add('cyl', '#7a5a3a', { p: [-3.2, h + 0.7, 0.8], s: [0.14, 1.4, 0.14] });
  k.add(LO, '#4f9e40', { p: [-3.2, h + 1.8, 0.8], s: [0.9, 0.75, 0.9] });
  for (let i = 0; i < 6; i++) { const a = i * 1.1; k.add(LO, '#ffe14a', { p: [-3.2 + Math.cos(a) * 0.75, h + 1.7 + (i % 3) * 0.25, 0.8 + Math.sin(a) * 0.7], s: 0.12 }); }
  for (let i = 0; i < 8; i++) k.add(LO, i % 2 ? '#ffffff' : '#5aa244', { p: [3.6 + (i % 2) * 0.2, h + 0.6 + i * 0.32, -2.2], s: i % 2 ? 0.1 : 0.22 });
  put(k, personGeo(291), 2.6, h, 2, -0.6, 1); put(k, personGeo(292), -1.4, h, 2.6, 0.3, 1);
  g.add(k.mesh());
  const spout = glow('#bfe8ff', 1, 0.55); spout.position.set(0.4, h + 1.4, 1.2); g.add(spout);
  g.userData = { height: h + 4.2, spout };
  return g;
}

// Lessons 15–17 · The house of ideas: a mobile of paper butterflies that
// flutter, a table of clay with pressed and raised marks, and a ring of
// log slices and cardboard tubes.
export function ideasHouse() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 4, { r: 5.4 });
  // the frame the butterflies hang from
  for (const x of [-2.2, 2.2]) k.add('box', PAL.wood, { p: [x, h + 1.8, -1.6], s: [0.16, 3.6, 0.16] });
  k.add('box', PAL.wood, { p: [0, h + 3.6, -1.6], s: [4.6, 0.16, 0.16] });
  // the clay table
  k.add('box', PAL.woodLight, { p: [2.4, h + 0.75, 1.6], r: [0, -0.3, 0], s: [2, 0.12, 1.2] });
  for (const [x, z] of [[1.6, 1.3], [3.2, 1.0], [1.6, 2.2], [3.2, 1.9]]) k.add('box', PAL.wood, { p: [x, h + 0.37, z], s: [0.1, 0.75, 0.1] });
  k.add(new THREE.CylinderGeometry(0.32, 0.24, 0.5, 12), '#c98a5a', { p: [1.9, h + 1.06, 1.7] });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; k.add(LO, '#a86a3a', { p: [1.9 + Math.cos(a) * 0.3, h + 1.1, 1.7 + Math.sin(a) * 0.3], s: 0.05 }); }
  k.add('cyl', '#d9b08a', { p: [2.8, h + 0.84, 1.4], s: [0.45, 0.06, 0.45] });
  for (let i = 0; i < 5; i++) k.add(LO, '#e9c9a0', { p: [2.6 + (i % 3) * 0.18, h + 0.9, 1.3 + Math.floor(i / 3) * 0.2], s: 0.07 });
  // the ring of logs and tubes on the ground
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, x = -2.6 + Math.cos(a) * 1.1, z = 1.8 + Math.sin(a) * 0.8, log = i % 2; k.add('cyl', log ? '#a8703f' : '#c9955b', { p: [x, h + 0.25, z], s: [log ? 0.3 : 0.22, 0.5, log ? 0.3 : 0.22] }); k.add('cyl', log ? '#e8c890' : '#8a5a34', { p: [x, h + 0.51, z], s: [log ? 0.24 : 0.14, 0.02, log ? 0.24 : 0.14] }); }
  put(k, personGeo(301), 0.2, h, 2.8, 0, 1);
  g.add(k.mesh());
  // the butterflies: two wings each, hanging on threads
  const flies = [];
  [['#b9a3f0', -1.6, 2.6], ['#ffd23f', -0.5, 2.2], ['#ff9fc4', 0.6, 2.7], ['#9a7fe0', 1.6, 2.3]].forEach(([c, x, y], i) => {
    const b = new THREE.Group();
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 3.6 - y, 4), mat('#ffffff'));
    thread.position.set(x, h + (3.6 + y) / 2, -1.6); g.add(thread);
    const wing = side => { const w = new THREE.Mesh(new THREE.CircleGeometry(0.42, 3), mat(c, { side: THREE.DoubleSide })); w.position.x = side * 0.3; w.rotation.z = side > 0 ? 0 : Math.PI; w.scale.set(1, 1.2, 1); const p = new THREE.Group(); p.add(w); b.add(p); return p; };
    const L = wing(-1), R = wing(1);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), mat('#3b2414')); body.rotation.x = Math.PI / 2; b.add(body);
    b.position.set(x, h + y, -1.6);
    b.userData = { L, R, y: h + y, i };
    g.add(b); flies.push(b);
  });
  g.userData = { height: h + 4.2, flies };
  return g;
}

// Lessons 18–19 · The wall of lines: squares of black-and-white line
// patterns, and fish sculptures made of stripes, zigzags and dots.
const LINE_TILES = [
  (g, s) => { g.lineWidth = s * 0.08; g.beginPath(); for (let i = 0; i <= 4; i++) g.lineTo((i / 4) * s, i % 2 ? s * 0.25 : s * 0.75); g.stroke(); },
  (g, s) => { g.lineWidth = s * 0.07; for (let r = 0.15; r < 0.5; r += 0.12) { g.beginPath(); g.arc(s / 2, s / 2, r * s, 0, Math.PI * 2); g.stroke(); } },
  (g, s) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) g.fillRect((i * s) / 4, (j * s) / 4, s / 4, s / 4); },
  (g, s) => { g.lineWidth = s * 0.07; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, s * (0.15 + i * 0.23)); g.quadraticCurveTo(s / 4, s * (0.02 + i * 0.23), s / 2, s * (0.15 + i * 0.23)); g.quadraticCurveTo((3 * s) / 4, s * (0.28 + i * 0.23), s, s * (0.15 + i * 0.23)); g.stroke(); } },
  (g, s) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(s * (0.2 + i * 0.3), s * (0.2 + j * 0.3), s * 0.08, 0, Math.PI * 2); g.fill(); } },
  (g, s) => { g.lineWidth = s * 0.07; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo((i * s) / 5, 0); g.lineTo((i * s) / 5, s); g.stroke(); } },
  (g, s) => { g.lineWidth = s * 0.06; g.beginPath(); let x = s / 2, y = s / 2; for (let i = 1; i < 9; i++) { const d = i * s * 0.05; x += (i % 4 < 2 ? 1 : -1) * (i % 2 ? d : 0); y += (i % 4 < 2 ? 1 : -1) * (i % 2 ? 0 : d); g.lineTo(x, y); } g.stroke(); },
  (g, s) => { g.lineWidth = s * 0.06; for (let i = -1; i < 5; i++) { g.beginPath(); g.moveTo((i * s) / 4, s); g.lineTo(((i + 2) * s) / 4, 0); g.stroke(); } },
];
const lineWallTex = () => canvasTex('lines-wall', 512, 256, (g, w, h) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  const s = 64;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
    const inv = (i + j) % 3 === 0;
    g.save(); g.translate(i * s, j * s);
    g.fillStyle = inv ? '#1f1612' : '#fff'; g.fillRect(0, 0, s, s);
    g.strokeStyle = g.fillStyle = inv ? '#fff' : '#1f1612';
    g.beginPath(); g.rect(2, 2, s - 4, s - 4); g.clip();
    LINE_TILES[(i * 3 + j * 5) % LINE_TILES.length](g, s);
    g.restore();
    g.strokeStyle = '#1f1612'; g.lineWidth = 2; g.strokeRect(i * s, j * s, s, s);
  }
});
const fishTex = n => canvasTex(`fish-${n}`, 128, 64, (g, w, h) => {
  g.fillStyle = ['#ffd23f', '#a9d8ff', '#ff9fc4'][n]; g.fillRect(0, 0, w, h);
  g.strokeStyle = g.fillStyle = '#1f1612'; g.lineWidth = 5;
  if (n === 0) for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(i * 20, 0); g.lineTo(i * 20, h); g.stroke(); }
  if (n === 1) for (let j = 0; j < 3; j++) { g.beginPath(); for (let i = 0; i <= 8; i++) g.lineTo(i * 16, 12 + j * 20 + (i % 2) * 10); g.stroke(); }
  if (n === 2) for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(8 + i * 16, 8 + j * 16, 4, 0, Math.PI * 2); g.fill(); }
});
export function linesWall() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 4, { w: 9.4, d: 7.8 });
  k.add('box', PAL.ink, { p: [0, h + 1.9, -2.3], s: [7.4, 3.8, 0.4] });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshLambertMaterial({ map: lineWallTex() }));
  wall.position.set(0, h + 1.9, -2.09); g.add(wall);
  // fish on poles, each of one kind of line
  [[-2.6, 1.4, 0], [0, 1.9, 1], [2.6, 1.3, 2]].forEach(([x, z, n]) => {
    k.add('cyl', '#3b3640', { p: [x, h + 0.7, z], s: [0.05, 1.4, 0.05] });
    const fish = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 10), new THREE.MeshLambertMaterial({ map: fishTex(n) }));
    body.scale.set(1.3, 0.75, 0.3); fish.add(body);
    const tail = new THREE.Mesh(new THREE.CircleGeometry(0.42, 3), new THREE.MeshLambertMaterial({ color: ['#e8453c', '#2f7fd6', '#8a4fc9'][n], side: THREE.DoubleSide }));
    tail.position.x = -0.85; tail.rotation.z = 0; fish.add(tail);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat('#1f1612')); eye.position.set(0.48, 0.12, 0.17); fish.add(eye);
    fish.position.set(x, h + 1.7, z); fish.userData = { y: h + 1.7, n };
    g.add(fish); (g.userData.fish ||= []).push(fish);
  });
  put(k, personGeo(311), 3.4, h, -0.6, -1.2, 1);
  g.add(k.mesh());
  g.userData.height = h + 4;
  return g;
}

// Lessons 20–23 · The crafts market: a carpenter's bench with a chair being
// made, a stall of fruit-and-vegetable art, a robot of tin cans and a
// collage board of scraps.
export function craftsMarket() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 5, { w: 9.8, d: 8.4 });
  const stall = (x, z, cloth) => {
    for (const [dx, dz] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]]) k.add('box', PAL.wood, { p: [x + dx, h + 1.2, z + dz], s: [0.1, 2.4, 0.1] });
    for (let i = 0; i < 5; i++) k.add('box', i % 2 ? '#fffaf2' : cloth, { p: [x - 1 + i * 0.5, h + 2.45, z], r: [0.2, 0, 0], s: [0.5, 0.06, 1.6] });
    k.add('box', PAL.woodLight, { p: [x, h + 0.8, z + 0.3], s: [2.2, 0.12, 0.9] });
  };
  // the carpenter: bench, saw, a chair, a carved door
  stall(-2.6, -1.6, '#8a4fc9');
  k.add('box', '#c99863', { p: [-3, h + 0.95, -1.3], s: [0.5, 0.06, 0.5] });
  for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) k.add('box', '#a8703f', { p: [-3 + dx, h + 0.75 + 0.15, -1.3 + dz], s: [0.05, 0.3, 0.05] });
  k.add('box', '#b8bec4', { p: [-2.2, h + 0.9, -1.2], r: [0, 0.3, 0], s: [0.7, 0.03, 0.22] });
  k.add('box', '#7a4a2a', { p: [-1.75, h + 0.92, -1.2], r: [0, 0.3, 0], s: [0.2, 0.08, 0.1] });
  // the fruit stall: a watermelon fish, oranges, a pineapple
  stall(2.6, -1.6, '#34b04a');
  k.add(LO, '#2f8a3f', { p: [2.2, h + 1.12, -1.3], s: [0.42, 0.26, 0.26] }); k.add(LO, '#e8453c', { p: [2.42, h + 1.14, -1.3], s: [0.24, 0.2, 0.24] });
  for (let i = 0; i < 4; i++) k.add(LO, '#f28c1a', { p: [2.9 + (i % 2) * 0.24, h + 0.98 + Math.floor(i / 2) * 0.2, -1.2 + (i % 2) * 0.1], s: 0.13 });
  k.add(LO, '#e0a93a', { p: [3.4, h + 1.1, -1.4], s: [0.16, 0.24, 0.16] }); k.add(new THREE.ConeGeometry(0.12, 0.3, 6), '#3f9a4e', { p: [3.4, h + 1.45, -1.4] });
  // the robot of tin cans
  k.add('cyl', '#c9cfd6', { p: [0, h + 0.8, 1.8], s: [0.45, 0.9, 0.45] });
  k.add('cyl', '#b8bec4', { p: [0, h + 1.55, 1.8], s: [0.32, 0.55, 0.32] });
  for (const sx of [-1, 1]) { k.add('cyl', '#9aa6b0', { p: [sx * 0.6, h + 0.95, 1.8], r: [0, 0, sx * 0.5], s: [0.12, 0.6, 0.12] }); k.add('cyl', '#9aa6b0', { p: [sx * 0.18, h + 0.2, 1.8], s: [0.12, 0.4, 0.12] }); }
  for (const sx of [-1, 1]) k.add(LO, '#e8453c', { p: [sx * 0.12, h + 1.62, 2.1], s: 0.07 });
  k.add('cyl', '#ffd23f', { p: [0, h + 1.95, 1.8], s: [0.02, 0.25, 0.02] }); k.add(LO, '#e8453c', { p: [0, h + 2.1, 1.8], s: 0.06 });
  put(k, personGeo(321), -3.2, h, 1.6, 0.6, 1); put(k, personGeo(322, { prop: 'book' }), 3.4, h, 1.8, -0.5, 1);
  const pic = easel(g, k, 'collagefish', 1.9, h, 2.2, -0.35, 0.8);
  g.add(k.mesh());
  g.userData = { height: h + 3.8, pic };
  return g;
}

// Lessons 24–25 · The artists' gallery on the hill: a white gallery with a
// row of paintings on its front, banners, and a sculpture before it.
export function artistsGallery() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { w: 10.4, d: 8.8 });
  k.add(roundBox(8.4, 3.6, 3.6, 0.1), PAL.white, { p: [0, h + 1.8, -2] });
  k.add('box', '#3f8fd6', { p: [0, h + 3.75, -2], s: [8.8, 0.3, 4] });
  k.add(new THREE.CylinderGeometry(0.01, 4.6, 1.2, 4), '#3f8fd6', { p: [0, h + 4.5, -2], r: [0, Math.PI / 4, 0], s: [1, 1, 0.45] });
  for (const x of [-3.6, 3.6]) k.add(new THREE.CylinderGeometry(0.22, 0.26, 3.4, 10), '#f6e8cc', { p: [x, h + 1.7, -0.1] });
  k.add('box', '#7a5130', { p: [0, h + 1, -0.19], s: [1.1, 2, 0.06] });
  for (const [x, c] of [[-2.6, '#e8453c'], [2.6, '#ffd23f']]) { k.add('box', '#3b3640', { p: [x, h + 0.9, 2.6], s: [0.06, 1.8, 0.06] }); k.add('box', c, { p: [x + 0.3, h + 1.4, 2.6], s: [0.6, 0.9, 0.02] }); }
  // the sculpture: abstract, of wood
  k.add('box', '#e9dcc0', { p: [0, h + 0.3, 2.2], s: [0.9, 0.6, 0.9] });
  k.add(new THREE.TorusGeometry(0.5, 0.16, 8, 18), '#a8703f', { p: [0, h + 1.2, 2.2], r: [0, 0.6, 0] });
  k.add(LO, '#c99863', { p: [0, h + 0.8, 2.2], s: [0.3, 0.3, 0.3] });
  put(k, personGeo(331), -1.6, h, 2.6, 0.3, 1); put(k, personGeo(332, { prop: 'book' }), 1.8, h, 2.9, -0.4, 1); put(k, personGeo(333), 3.6, h, 1.4, -1, 1);
  g.add(k.mesh());
  const pics = [['giraffe', -3, 2.2], ['cat', -1.35, 2.2], ['city', 1.35, 2.2], ['expression', 3, 2.2]].map(([key, x, y]) => { const p = picture(key, 1.2, 0.96); p.position.set(x, h + y, -0.17); g.add(p); return p; });
  g.userData = { height: h + 5.4, pics };
  return g;
}

// ---------- The gallery of paintings at the harbour ----------
// A wall with a frame for each lesson of the book (5 × 5): a finished quest
// hangs its painting; the others wait under a white cloth with a «?».
export function paintingsWall(n = 25) {
  const g = new THREE.Group(), k = kit();
  const cols = 5, rows = Math.ceil(n / cols), W = 7.4, H = 6.2;
  k.add(roundBox(W + 0.6, H + 0.4, 0.6, 0.08), '#f6e8cc', { p: [0, 0.4 + H / 2, 0] });
  k.add('box', '#e8453c', { p: [0, 0.6 + H, 0], s: [W + 1, 0.3, 0.9] });
  for (let i = 0; i < 6; i++) k.add('box', ['#ffd23f', '#2f7fd6', '#34b04a', '#8a4fc9', '#f28c1a', '#ff9fc4'][i], { p: [-W / 2 + 0.6 + i * ((W - 1.2) / 5), 0.84 + H, 0.42], s: [0.5, 0.18, 0.06] });
  k.add('box', '#c9a86a', { p: [0, 0.2, 0.3], s: [W + 1.2, 0.4, 1.4] });
  const cw = (W - 0.6) / cols, ch = (H - 0.5) / rows;
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols), x = -W / 2 + 0.3 + cw * (c + 0.5), y = 0.4 + H - 0.3 - ch * (r + 0.5);
    k.add('box', '#a8703f', { p: [x, y, 0.32], s: [cw * 0.86, ch * 0.84, 0.08] });
  }
  g.add(k.mesh());
  // all the canvases share one texture, redrawn as paintings are earned
  const c = document.createElement('canvas'); c.width = 125 * cols; c.height = 100 * rows;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.6, H - 0.5), new THREE.MeshLambertMaterial({ map: tex, emissive: '#ffffff', emissiveIntensity: 0.08 }));
  canvas.position.set(0, 0.4 + H / 2 - 0.05, 0.37);
  g.add(canvas);
  let shown = '';
  function show(done) {
    const key = done.map(d => (d ? 1 : 0)).join('');
    if (key === shown) return;
    shown = key;
    const x = c.getContext('2d');
    x.fillStyle = '#a8703f'; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < n; i++) {
      const cx = (i % cols) * 125, cy = Math.floor(i / cols) * 100;
      if (done[i]) drawArt(x, LESSON_ART[i], cx + 10, cy + 9, 105, 82);
      else {
        x.fillStyle = '#fbf6ea'; x.fillRect(cx + 10, cy + 9, 105, 82);
        x.fillStyle = '#d9c9a8'; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('?', cx + 62, cy + 52);
      }
    }
    tex.needsUpdate = true;
  }
  const shine = glow('#fff2a8', 6, 0); shine.position.set(0, 0.4 + H / 2, 0.6); g.add(shine);
  g.userData = { height: H + 1.4, show, shine };
  return g;
}

// ---------- The helper «ريشة»: a little paintbrush ----------
export function helperBrush() {
  const g = new THREE.Group(), k = kit();
  // the bristles at the bottom (a red tip), the metal band, the wooden handle
  k.add(new THREE.ConeGeometry(0.2, 0.34, 14), '#e8453c', { p: [0, 0.2, 0], r: [Math.PI, 0, 0] });
  k.add(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 14), '#3b2414', { p: [0, 0.44, 0] });
  k.add(new THREE.CylinderGeometry(0.22, 0.21, 0.28, 16), '#c9cfd6', { p: [0, 0.66, 0] });
  k.add(new THREE.CylinderGeometry(0.2, 0.22, 0.75, 16), '#f28c1a', { p: [0, 1.17, 0] });
  k.add(LO, '#f28c1a', { p: [0, 1.56, 0], s: [0.2, 0.12, 0.2] });
  k.eyes({ x: 0.08, y: 1.25, z: 0.17, r: 0.07, look: 0.4 });
  k.add(LO, '#e8537a', { p: [0, 1.1, 0.2], s: [0.05, 0.025, 0.02] });
  // a beret
  k.add('cyl', '#8a4fc9', { p: [0.03, 1.66, 0], r: [0, 0, 0.18], s: [0.26, 0.07, 0.26] });
  k.add(LO, '#8a4fc9', { p: [0.06, 1.73, 0], s: 0.04 });
  // drops of paint on the band
  for (const [x, c] of [[-0.15, '#2f7fd6'], [0.15, '#ffd23f']]) k.add(LO, c, { p: [x, 0.62, 0.14], s: 0.05 });
  g.add(mesh(k.geometry(), VC));
  const shine = glow('#fff2a8', 1.1, 0.7); shine.position.y = 0.8; g.add(shine);
  g.userData = { shine };
  return g;
}
