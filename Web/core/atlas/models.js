// The atlas island's 3D models, all made in code: warm sandstone terraces
// in a deep blue sea, and one landmark per place of the social studies book —
// the globe observatory (its Earth drawn from the real country outlines),
// the pyramids and the sphinx, Carthage's round harbour, the palace of the
// state, the Nile valley with its felucca and its dam, Fustat's mosque, the
// Horn of Africa's port, the family house, the square of institutions, the
// Libyan oasis, the heroes' garden, the Atlas mountains and the Andalusian
// palace on the hill. Plus the travellers' compass (one ray per finished
// quest) and the helper «سهيل», a little star explorer.
// Units: 1 ≈ 1 metre; Y is up; the camera looks from +Z.

import * as THREE from '../../vendor/three/three.module.min.js';
import { Kit, VC, rng, roundBox, dhow } from '../farm/models.js';
import { treeGeo, bushGeo, rockGeo, personGeo, put, glow } from '../tunes/models.js';
import { makeGround } from '../isle/ground.js';
import { plinth as basePlinth, animalGeo, beaconArrow, selectRing, sparkSprite, lampGeo } from '../isle/kit.js';
import { SHAPES } from '../../worlds/atlas/shapes.js';

export { treeGeo, bushGeo, rockGeo, personGeo, put, glow, beaconArrow, selectRing, sparkSprite };
export const lampGeoA = () => lampGeo('#6b4a2a', '#ffe9a8');
export { lampGeoA as lampGeo };

const kit = () => new Kit();
const LO = new THREE.SphereGeometry(1, 12, 8);
const mat = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
const mesh = (geo, m) => { const x = new THREE.Mesh(geo, m); x.castShadow = true; return x; };

export const PAL = {
  grass: '#b5d77a', grassB: '#c2d982', grassC: '#cfd98a', grassD: '#d8d090', grassE: '#c9d68a',
  cliff: '#efd3a0', cliffDark: '#c99a5a', sand: '#f6dc9e', sandSide: '#e2bd78',
  path: '#f3e2bd', pathEdge: '#d9bf8a', stone: '#e8cfa0', stoneDark: '#c4a06a', white: '#fbf6ea',
  wood: '#a8703f', woodLight: '#c99863', gold: '#e0a93a', ink: '#3b2414', brick: '#c7563a', blue: '#2e7fc4', green: '#3f9d3c',
};
export const UNIT_COLORS = { 1: '#e0a93a', 2: '#2fb3a8', 3: '#e8537a', 4: '#f28c3a', 5: '#3f8fd6' };
const plinth = (k, unit, opts) => basePlinth(k, UNIT_COLORS[unit], { top: PAL.white, side: PAL.stone, ...opts });

// ---------- Ground ----------
const G = makeGround({
  isle: { cx: 0, cz: -8.5, hx: 19.5, hz: 51 },
  levels: [[0.9, Infinity], [2.1, 6], [3.3, -20], [4.6, -46]],
  slabs: [
    [0, -8.5, 16.4, 47.4, 5, 0.8, 5, 0.9, 0.5, PAL.grass],
    [0, -21, 15.6, 27, 6, 0.6, 7, 2.1, 1.1, PAL.grassB],
    [0, -34, 15, 14, 6, 0.5, 9, 3.3, 1.1, PAL.grassC],
    [0.5, -52.4, 10.4, 6.4, 4, 0.4, 11, 4.6, 1.2, PAL.grassD],
  ],
  ramps: [[9.2, 5.4, 0.9, 2.1], [-16.6, -20.4, 2.1, 3.3], [-42.6, -46.4, 3.3, 4.6]],
  path: [[14, 38], [8, 35], [2.5, 31.5], [0.6, 26], [1, 20], [0.8, 14], [0.6, 8], [0.4, 3], [0.8, -3], [0.2, -9], [0.8, -15], [0.4, -21], [0.8, -27], [0.2, -33], [0.8, -39], [0.6, -44], [0.8, -46.6]],
  pal: { sand: PAL.sand, sandSide: PAL.sandSide, cliff: PAL.cliff, cliffDark: PAL.cliffDark, path: PAL.path, pathEdge: PAL.pathEdge, post: PAL.white },
});
export const { ISLE, levelAt, pathY, terrain, pathCurve, pathRibbon } = G;

// ---------- Small pieces ----------
export function palmGeo(seed = 1, s = 1) {
  const r = rng(seed * 13 + 5), k = kit();
  const curve = 0.15 + r() * 0.2;
  for (let i = 0; i < 6; i++) k.add(new THREE.CylinderGeometry(0.16 * s, 0.2 * s, 0.75 * s, 7), i % 2 ? '#b48a55' : '#a07a48', { p: [i * curve * 0.4 * s, (0.38 + i * 0.7) * s, 0], r: [0, 0, -curve * 0.6] });
  const top = [6 * curve * 0.4 * s - 0.1 * s, 4.4 * s, 0];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; k.add(LO, i % 2 ? '#3f9d3c' : '#4fae45', { p: [top[0] + Math.cos(a) * 0.9 * s, top[1] - 0.25 * s, Math.sin(a) * 0.9 * s], r: [Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5], s: [1.1 * s, 0.08 * s, 0.32 * s] }); }
  k.add(LO, '#7a5130', { p: [top[0], top[1] - 0.3 * s, 0.15 * s], s: 0.17 * s });
  return k.geometry();
}
function arch(k, x, z, w, h, col, ry = 0, d = 0.3) {
  const c = Math.cos(ry), s = Math.sin(ry), P = (lx, ly, lz) => [x + lx * c + lz * s, ly, z - lx * s + lz * c];
  k.add('box', col, { p: P(-w / 2 - 0.15, h / 2, 0), r: [0, ry, 0], s: [0.3, h, d] });
  k.add('box', col, { p: P(w / 2 + 0.15, h / 2, 0), r: [0, ry, 0], s: [0.3, h, d] });
  k.add(new THREE.TorusGeometry(w / 2 + 0.15, 0.15, 6, 16, Math.PI), col, { p: P(0, h, 0), r: [0, ry, 0], s: [1, 1, d / 0.3] });
}
// A dome on a drum (mosques, the observatory, the palace).
function dome(k, x, y, z, r, col, drum = '#fbf6ea', drumH = 0.6) {
  k.add(new THREE.CylinderGeometry(r, r, drumH, 20), drum, { p: [x, y + drumH / 2, z] });
  k.add('hemi', col, { p: [x, y + drumH, z], s: [r, r * 1.05, r] });
  k.add(new THREE.ConeGeometry(0.06, 0.5, 6), PAL.gold, { p: [x, y + drumH + r + 0.2, z] });
}
function minaret(k, x, y, z, h = 4, col = '#f3e6c8') {
  k.add('box', col, { p: [x, y + h / 2, z], s: [0.7, h, 0.7] });
  k.add('box', '#e2cfa4', { p: [x, y + h + 0.1, z], s: [0.95, 0.22, 0.95] });
  k.add('box', col, { p: [x, y + h + 0.6, z], s: [0.5, 0.8, 0.5] });
  k.add(new THREE.ConeGeometry(0.35, 0.6, 4), '#3f9d3c', { p: [x, y + h + 1.3, z], r: [0, Math.PI / 4, 0] });
}

// A little Earth for the observatory, painted from the real outlines.
let earthTex = null;
function earthTexture() {
  if (earthTex) return earthTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#3f8fd6'; g.fillRect(0, 0, 512, 256);
  const ARAB = new Set(['760', '422', '400', '275', '368', '682', '414', '634', '784', '512', '887', '818', '729', '434', '788', '012', '504', '478', '706', '262']);
  for (const [id, rings] of Object.entries(SHAPES)) {
    g.fillStyle = ARAB.has(id) ? '#ffcf6b' : '#cde3a0';
    for (const r of rings) {
      g.beginPath();
      let prev = null;
      for (let i = 0; i < r.length; i += 2) {
        let lon = r[i] / 10; const lat = r[i + 1] / 10;
        if (prev !== null && Math.abs(lon - prev) > 180) { g.closePath(); g.fill(); g.beginPath(); }
        const x = ((lon + 180) / 360) * 512, y = ((90 - lat) / 180) * 256;
        if (i && prev !== null && Math.abs(lon - prev) <= 180) g.lineTo(x, y); else g.moveTo(x, y);
        prev = lon;
      }
      g.closePath(); g.fill();
    }
  }
  earthTex = new THREE.CanvasTexture(c);
  earthTex.colorSpace = THREE.SRGBColorSpace;
  return earthTex;
}

// ---------- Landmarks ----------

// Unit 1 · The globe observatory: a white observatory with a great turning
// Earth (the atlas opens here).
export function observatory() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 1, { r: 5.4 });
  k.add(new THREE.CylinderGeometry(2.4, 2.6, 1.6, 24), PAL.white, { p: [0, h + 0.8, -1.4] });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; k.add('box', PAL.gold, { p: [Math.cos(a) * 2.55, h + 0.9, -1.4 + Math.sin(a) * 2.55], r: [0, -a, 0], s: [0.08, 1.2, 0.5] }); }
  k.add(new THREE.CylinderGeometry(0.25, 0.4, 1.4, 12), '#8a5a34', { p: [0, h + 2.3, -1.4] });
  k.add('torus', PAL.gold, { p: [0, h + 4.2, -1.4], r: [0, 0, 0.4], s: [1.9, 1.9, 0.5] });
  // a compass rose inlaid in the floor
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, L = i % 2 ? 1.1 : 1.8; k.add(new THREE.ConeGeometry(0.28, L, 3), i % 2 ? '#c7563a' : PAL.gold, { p: [Math.cos(a) * L / 2 + 2.6, h + 0.04, 2.2 + Math.sin(a) * L / 2], r: [Math.PI / 2, 0, -a + Math.PI / 2], s: [1, 1, 0.12] }); }
  put(k, personGeo(91, { prop: 'book' }), -3.2, h, 1.8, 0.6, 1); put(k, personGeo(92), 3.6, h, -0.4, -1.2, 1);
  g.add(k.mesh());
  const earth = mesh(new THREE.SphereGeometry(1.75, 40, 28), new THREE.MeshPhongMaterial({ map: earthTexture(), shininess: 20 }));
  earth.position.set(0, h + 4.2, -1.4); earth.rotation.z = 0.4; g.add(earth);
  g.userData = { height: h + 6.4, earth };
  return g;
}

// Unit 1 · The pyramids of Giza and the sphinx, with palms and the Nile.
export function pyramids() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 1, { w: 9.6, d: 8, top: '#f1d9a0' });
  const pyr = (x, z, s) => k.add(new THREE.ConeGeometry(s, s * 1.3, 4), '#e8c27a', { p: [x, h + s * 0.65, z], r: [0, Math.PI / 4, 0] });
  pyr(-1.6, -1.8, 2.6); pyr(1.8, -2.4, 2.1); pyr(3.6, -1, 1.2);
  // the sphinx: body, paws, head with its headdress
  k.add(roundBox(1.8, 0.7, 0.8, 0.2), '#d9b06a', { p: [-2.4, h + 0.4, 2.1], r: [0, 0.3, 0] });
  k.add(roundBox(0.6, 0.9, 0.7, 0.2), '#d9b06a', { p: [-1.6, h + 0.85, 2.4], r: [0, 0.3, 0] });
  k.add(new THREE.ConeGeometry(0.5, 0.6, 4), '#c9963a', { p: [-1.6, h + 1.4, 2.4], r: [0, 0.3 + Math.PI / 4, 0] });
  // the Nile along the front, with a felucca
  k.add('box', '#3f9ad6', { p: [1.4, h + 0.04, 3.2], s: [6.4, 0.06, 1.1] });
  put(k, palmGeo(3, 0.55), 3.8, h, 1.8, 0, 1); put(k, palmGeo(4, 0.5), -4, h, -0.6, 1, 1); put(k, palmGeo(5, 0.45), 4.2, h, 3, 2, 1);
  put(k, animalGeo('camel'), 0.4, h, 1.4, -0.6, 1);
  g.add(k.mesh());
  const boat = new THREE.Group();
  const bk = kit(); bk.add(roundBox(1, 0.22, 0.34, 0.1), PAL.wood); bk.add('cyl', PAL.ink, { p: [0, 0.7, 0], s: [0.03, 1.3, 0.03] });
  bk.add(new THREE.ConeGeometry(0.5, 1.1, 3), '#fff8e8', { p: [0.18, 0.75, 0], r: [0, Math.PI / 2, Math.PI / 2 - 0.3], s: [1, 1, 0.08] });
  boat.add(mesh(bk.geometry(), VC)); boat.position.set(1.4, h + 0.12, 3.2); g.add(boat);
  g.userData = { height: h + 3.6, boat, baseY: h };
  return g;
}

// Unit 1 · Carthage: the round naval harbour (the Cothon) with its island,
// columns and a Phoenician ship.
export function carthage() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 1, { r: 5.2 });
  k.add(new THREE.CylinderGeometry(3.4, 3.4, 0.12, 40), '#2e8bc8', { p: [0, h + 0.02, -0.2] });
  k.add(new THREE.CylinderGeometry(1.2, 1.3, 0.6, 24), PAL.stone, { p: [0, h + 0.3, -0.2] });
  dome(k, 0, h + 0.6, -0.2, 0.6, '#e8cfa0', '#e8cfa0', 0.8);
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; k.add('box', PAL.stoneDark, { p: [Math.cos(a) * 1.35, h + 0.4, -0.2 + Math.sin(a) * 1.35], r: [0, -a, 0], s: [0.5, 0.4, 0.12] }); }
  for (let i = 0; i < 6; i++) { const a = -0.5 + i * 0.22; k.add('cyl', '#f3ead8', { p: [Math.cos(a) * 4.3, h + 0.9, -0.2 + Math.sin(a) * 4.3], s: [0.16, 1.8, 0.16] }); }
  k.add('box', '#f3ead8', { p: [4.25, h + 1.85, 0.3], r: [0, -0.4, 0], s: [0.3, 0.16, 2.6] });
  put(k, personGeo(93), -3.6, h, 3, 0.4, 1);
  g.add(k.mesh());
  const ship = dhow(); ship.scale.setScalar(0.42); ship.position.set(-1.9, h + 0.1, 1.2); ship.rotation.y = 0.6; g.add(ship);
  g.userData = { height: h + 2.8, ship, baseY: h };
  return g;
}

// Unit 1 · The palace of the state: a white building with columns and a
// dome, a wide stair and citizens; the pillars of the state.
export function statePalace() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 1, { w: 9, d: 7.4 });
  k.add(roundBox(6.4, 0.5, 3.6, 0.06), '#efe6d2', { p: [0, h + 0.25, -1.4] });
  k.add(roundBox(5.6, 2.2, 2.6, 0.06), PAL.white, { p: [0, h + 1.6, -1.8] });
  for (let i = 0; i < 8; i++) k.add('cyl', '#f6efe0', { p: [-2.45 + i * 0.7, h + 1.55, -0.3], s: [0.16, 2.1, 0.16] });
  k.add(new THREE.CylinderGeometry(0.01, 3.6, 0.9, 4, 1), '#efe6d2', { p: [0, h + 3.05, -0.9], r: [0, Math.PI / 4, 0], s: [1, 1, 0.42] });
  dome(k, 0, h + 2.7, -2, 1.1, '#4f8fc0');
  for (let i = 0; i < 3; i++) k.add(roundBox(4.6 - i * 0.4, 0.16, 0.5, 0.03), '#efe6d2', { p: [0, h + 0.08 + i * 0.16, 0.7 - i * 0.3] });
  // the four pillars of the state, as four standing stones
  [['#e0a93a', -3.6], ['#2fb3a8', -2.6], ['#e8537a', 2.6], ['#3f8fd6', 3.6]].forEach(([c, x]) => { k.add('cyl', c, { p: [x, h + 0.7, 2.4], s: [0.3, 1.4, 0.3] }); k.add(LO, c, { p: [x, h + 1.5, 2.4], s: 0.3 }); });
  for (let i = 0; i < 4; i++) put(k, personGeo(94 + i), -1.4 + i * 0.9, h, 2.6, Math.PI, 1);
  g.add(k.mesh());
  g.userData = { height: h + 5 };
  return g;
}

// Unit 2 · The Nile valley: the river between green fields, a felucca,
// the High Dam, a water wheel and palms.
export function nileValley() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { w: 9.4, d: 8 });
  k.add('box', '#7cc35a', { p: [-2.6, h + 0.05, 0], s: [3.2, 0.1, 7] }); k.add('box', '#8fcf62', { p: [2.6, h + 0.05, 0], s: [3.2, 0.1, 7] });
  for (let i = 0; i < 6; i++) k.add('box', i % 2 ? '#a5d66c' : '#6ab44c', { p: [-2.6, h + 0.12, -3 + i * 1.2], s: [3, 0.06, 0.5] });
  k.add('box', '#3f9ad6', { p: [0, h + 0.06, 0], s: [2, 0.08, 7.6] });
  // the High Dam across the river at the back, and the lake behind it
  k.add('box', '#c9b48a', { p: [0, h + 0.6, -3.2], s: [8.4, 1.1, 0.8] });
  k.add('box', '#2e7fc4', { p: [0, h + 0.9, -3.75], s: [8.2, 0.12, 0.4] });
  // a water wheel (saqiya) on the bank
  k.add('torus', PAL.wood, { p: [1.25, h + 0.8, 1.2], r: [0, Math.PI / 2, 0], s: [0.7, 0.7, 0.8] });
  put(k, palmGeo(6, 0.5), -4.2, h, 2.6, 0, 1); put(k, palmGeo(7, 0.55), 4.2, h, -1.4, 1, 1); put(k, palmGeo(8, 0.45), 3.4, h, 3.2, 2, 1);
  put(k, personGeo(98), -2.4, h, 1.6, 0.4, 1); put(k, animalGeo('camel'), 3, h, 1, -1, 0.9);
  g.add(k.mesh());
  const boat = new THREE.Group();
  const bk = kit(); bk.add(roundBox(1, 0.22, 0.34, 0.1), PAL.wood); bk.add('cyl', PAL.ink, { p: [0, 0.7, 0], s: [0.03, 1.3, 0.03] });
  bk.add(new THREE.ConeGeometry(0.5, 1.1, 3), '#fff8e8', { p: [0.18, 0.75, 0], r: [0, Math.PI / 2, Math.PI / 2 - 0.3], s: [1, 1, 0.08] });
  boat.add(mesh(bk.geometry(), VC)); boat.rotation.y = Math.PI / 2; g.add(boat);
  g.userData = { height: h + 2.4, boat, baseY: h };
  return g;
}

// Unit 2 · Fustat: a mosque with a courtyard of arches and a minaret, by a
// little market.
export function fustat() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { w: 8.6, d: 7.4 });
  k.add(roundBox(5.6, 0.2, 4.6, 0.04), '#efe2c4', { p: [0, h + 0.1, -0.8] });
  for (let i = 0; i < 5; i++) arch(k, -2.2 + i * 1.1, -3, 0.7, 1.4, '#f3e6c8');
  for (let i = 0; i < 3; i++) { arch(k, -2.7, -2 + i * 1.1, 0.7, 1.4, '#f3e6c8', Math.PI / 2); arch(k, 2.7, -2 + i * 1.1, 0.7, 1.4, '#f3e6c8', Math.PI / 2); }
  k.add('box', '#f3e6c8', { p: [0, h + 2, -3.2], s: [5.8, 0.3, 0.6] });
  minaret(k, 2.8, h, -3.3, 4.2);
  k.add(new THREE.CylinderGeometry(0.5, 0.6, 0.4, 12), '#7fc4e8', { p: [0, h + 0.3, -0.8] });
  // market stalls
  [['#e8537a', -3.4], ['#f2c14e', -2.2], ['#2fb3a8', 3.2]].forEach(([c, x]) => { k.add('box', PAL.woodLight, { p: [x, h + 0.4, 2.6], s: [0.9, 0.6, 0.6] }); k.add('box', c, { p: [x, h + 1.15, 2.6], r: [0.2, 0, 0], s: [1.1, 0.06, 0.9] }); });
  put(k, personGeo(99), 0.2, h, 2.4, Math.PI, 1); put(k, personGeo(100), 1.4, h, 1.6, 2.6, 1);
  g.add(k.mesh());
  g.userData = { height: h + 6.2 };
  return g;
}

// Unit 2 · The Horn of Africa: a port on the Red Sea with ships, camels,
// acacia trees and frankincense.
export function hornPort() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { r: 5.2 });
  k.add(new THREE.CylinderGeometry(4.6, 4.6, 0.1, 40, 1, false, -0.4, 2.2), '#2e8bc8', { p: [0, h + 0.03, 0] });
  k.add('box', PAL.woodLight, { p: [1.4, h + 0.2, 1.4], r: [0, 0.7, 0], s: [0.8, 0.1, 3] });
  // acacia trees: flat crowns on thin trunks
  for (const [x, z, s] of [[-2.6, -1.8, 1], [-3.6, 0.8, 0.8], [-1.2, -3.2, 0.7]]) { k.add('cyl', '#8a5a34', { p: [x, h + 0.9 * s, z], s: [0.08 * s, 1.8 * s, 0.08 * s] }); k.add('cyl', '#6a9a3a', { p: [x, h + 1.9 * s, z], s: [1.1 * s, 0.3 * s, 1.1 * s] }); }
  // white houses of a port town
  for (let i = 0; i < 4; i++) k.add(roundBox(0.9, 0.8 + (i % 2) * 0.4, 0.9, 0.06), '#fbf6ea', { p: [-3.6 + i * 1, h + 0.45, -3.4 + (i % 2) * 0.4] });
  put(k, animalGeo('camel'), -1, h, 1.4, 0.6, 1); put(k, animalGeo('camel'), -2, h, 2.4, 0.2, 0.9);
  put(k, personGeo(101), -0.2, h, 2.6, 0.4, 1);
  g.add(k.mesh());
  const ship = dhow(); ship.scale.setScalar(0.45); ship.position.set(2.8, h + 0.08, -0.8); ship.rotation.y = -0.4; g.add(ship);
  g.userData = { height: h + 2.8, ship, baseY: h };
  return g;
}

// Unit 3 · The family house: a Damascene courtyard house, a fountain, a
// jasmine tree and the family.
export function familyHouse() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 3, { w: 8.4, d: 7.4 });
  k.add(roundBox(6, 0.14, 4.6, 0.04), '#f1e6cf', { p: [0, h + 0.07, -0.6] });
  for (let i = 0; i < 8; i++) k.add('box', i % 2 ? '#3b3640' : '#efe6d2', { p: [-2.8 + (i % 4) * 1.86, h + 0.15, -2.4 + Math.floor(i / 4) * 3.4], s: [0.3, 0.02, 0.3] });
  // the house round three sides: ablaq stripes, wooden windows
  for (const [x, z, w, d] of [[0, -3, 6, 1.2], [-2.6, -0.6, 1, 4], [2.6, -0.6, 1, 4]]) for (let r = 0; r < 4; r++) k.add('box', r % 2 ? '#3b3640' : '#efe6d2', { p: [x, h + 0.3 + r * 0.55, z], s: [w, 0.55, d] });
  for (let i = 0; i < 4; i++) k.add('box', PAL.wood, { p: [-1.8 + i * 1.2, h + 1.5, -2.38], s: [0.5, 0.7, 0.04] });
  k.add('box', '#c7563a', { p: [0, h + 2.45, -3], s: [6.2, 0.2, 1.3] });
  k.add(new THREE.CylinderGeometry(0.7, 0.8, 0.45, 16), '#efe6d2', { p: [0, h + 0.3, 0] });
  k.add(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 16), '#7fc4e8', { p: [0, h + 0.54, 0] });
  k.add('cyl', '#efe6d2', { p: [0, h + 0.8, 0], s: [0.08, 0.5, 0.08] });
  // a jasmine tree with white flowers, a lemon tree
  k.add('cyl', '#8a5a34', { p: [1.6, h + 0.7, 0.8], s: [0.12, 1.4, 0.12] });
  k.add(LO, '#4fae45', { p: [1.6, h + 1.7, 0.8], s: 0.7 });
  for (let i = 0; i < 8; i++) { const a = i * 0.8; k.add(LO, '#ffffff', { p: [1.6 + Math.cos(a) * 0.6, h + 1.7 + Math.sin(i) * 0.4, 0.8 + Math.sin(a) * 0.6], s: 0.07 }); }
  for (let i = 0; i < 4; i++) put(k, personGeo(102 + i, { sit: i > 1 }), -1.6 + i * 0.7, h, 1.8, Math.PI, 0.9 - (i > 1 ? 0.15 : 0));
  g.add(k.mesh());
  g.userData = { height: h + 3.2 };
  return g;
}

// Unit 3 · The square of institutions: a school with its clock, a
// hospital, a library and cultural centre, the municipality.
export function institutions() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 3, { w: 9.4, d: 8 });
  const bld = (x, z, w, d, ht, col, roof) => { k.add(roundBox(w, ht, d, 0.06), col, { p: [x, h + ht / 2, z] }); k.add(roundBox(w + 0.2, 0.18, d + 0.2, 0.04), roof, { p: [x, h + ht + 0.06, z] }); for (let i = 0; i < Math.floor(w / 0.7); i++) k.add('box', '#7fc4e8', { p: [x - w / 2 + 0.45 + i * 0.7, h + ht * 0.6, z + d / 2 + 0.01], s: [0.4, 0.45, 0.02] }); };
  bld(-2.6, -2, 3, 2, 2.2, '#f6e8c8', '#e0a93a');      // the school
  k.add(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 20), '#fff', { p: [-2.6, h + 1.9, -0.95], r: [Math.PI / 2, 0, 0] });
  k.add('box', PAL.ink, { p: [-2.6, h + 1.95, -0.9], s: [0.04, 0.3, 0.02] });
  bld(1.6, -2.4, 3.6, 1.8, 1.8, '#fbf6ea', '#e8537a'); // the hospital
  k.add('box', '#e8453c', { p: [1.6, h + 2.2, -1.48], s: [0.5, 0.14, 0.04] }); k.add('box', '#e8453c', { p: [1.6, h + 2.2, -1.48], s: [0.14, 0.5, 0.04] });
  bld(3.4, 1.4, 1.8, 2.2, 1.5, '#e9d6b4', '#3f8fd6');  // the library
  for (let i = 0; i < 4; i++) k.add('box', ['#e8453c', '#3f8fd6', '#f2c14e', '#4fbf5a'][i], { p: [3.1 + i * 0.12, h + 0.4, 2.52], s: [0.1, 0.5, 0.04] });
  bld(-3.4, 1.6, 1.6, 2, 1.6, '#f0e2c8', '#2fb3a8');   // the municipality
  // a playground: a slide and swings
  k.add('box', '#e8453c', { p: [0.4, h + 0.5, 1.6], r: [0, 0, 0.6], s: [1.4, 0.08, 0.5] });
  for (let i = 0; i < 4; i++) put(k, personGeo(106 + i), -1 + i * 0.7, h, 3, Math.PI, 0.85);
  g.add(k.mesh());
  g.userData = { height: h + 3.2 };
  return g;
}

// Unit 4 · The Libyan oasis: dunes, a pool with palms, an oil pump jack
// (it nods) and camels.
export function oasis() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 4, { r: 5.4, top: '#f3d593' });
  for (const [x, z, s] of [[-2.6, -2.2, 1.4], [-0.6, -3.2, 1], [2.8, -2.6, 1.2], [3.6, 0.6, 0.8]]) k.add('hemi', '#ecc67a', { p: [x, h, z], s: [s * 1.6, s * 0.7, s] });
  k.add(new THREE.CylinderGeometry(1.2, 1.25, 0.1, 24), '#3f9ad6', { p: [-1, h + 0.05, 1.2] });
  put(k, palmGeo(9, 0.55), -2.4, h, 1.6, 0, 1); put(k, palmGeo(10, 0.5), 0.2, h, 2.2, 1, 1); put(k, palmGeo(11, 0.45), -1.6, h, -0.2, 2, 1);
  k.add('box', '#3b3640', { p: [2.4, h + 0.2, 1.8], s: [1.4, 0.4, 0.9] });
  k.add('box', '#5a5f66', { p: [2.4, h + 1, 1.8], s: [0.14, 1.6, 0.14] });
  put(k, animalGeo('camel'), 1, h, 3, -0.4, 0.9); put(k, personGeo(110), -3.6, h, 1.8, 0.8, 1);
  g.add(k.mesh());
  const beam = new THREE.Group();
  const bk = kit(); bk.add('box', '#f28c3a', { s: [2.2, 0.18, 0.18] }); bk.add('box', '#3b3640', { p: [1.2, -0.25, 0], s: [0.3, 0.6, 0.24] });
  beam.add(mesh(bk.geometry(), VC)); beam.position.set(2.4, h + 1.85, 1.8); g.add(beam);
  g.userData = { height: h + 4, beam };
  return g;
}

// Unit 4 · The heroes' garden: two statues on pedestals among olive trees,
// with a Roman arch (Libya before the liberation).
export function heroesGarden() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 4, { w: 8.6, d: 7.4, top: '#e6dcc6' });
  for (const [x, z] of [[-2, -0.6], [1.6, -1.4]]) { k.add(roundBox(1.1, 1.2, 1.1, 0.05), '#d9cdb3', { p: [x, h + 0.6, z] }); put(k, personGeo(x < 0 ? 111 : 112), x, h + 1.2, z, 0.2, 1.4); }
  // a triumphal arch, ruined
  for (const s of [-1, 1]) k.add('box', '#e3c9a0', { p: [2.6 + s * 1, h + 1.3, 2], s: [0.6, 2.6, 0.7] });
  k.add('box', '#e3c9a0', { p: [2.6, h + 2.75, 2], s: [2.8, 0.5, 0.7] });
  for (const [x, z] of [[-3.4, 2.2], [-3.6, -2.6], [3.6, -2.4]]) { k.add('cyl', '#7a6a50', { p: [x, h + 0.5, z], s: [0.12, 1, 0.12] }); k.add(LO, '#8aa25a', { p: [x, h + 1.3, z], s: [0.8, 0.55, 0.8] }); }
  k.add('box', '#c9b48a', { p: [-0.2, h + 0.04, 2.6], s: [3.4, 0.04, 1.2] });
  put(k, personGeo(113, { prop: 'book' }), -0.4, h, 2.6, Math.PI, 0.9);
  g.add(k.mesh());
  g.userData = { height: h + 3.4 };
  return g;
}

// Unit 5 · The Atlas mountains: snowy peaks, cedars, a kasbah of red earth.
export function atlasMountains() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 5, { w: 9.6, d: 8 });
  for (const [x, z, s] of [[-2.4, -2.6, 1.8], [0.6, -3, 2.3], [3, -2.4, 1.6], [-4, -1, 1.2]]) {
    k.add(new THREE.ConeGeometry(s * 1.2, s * 2, 6), '#9a8a6a', { p: [x, h + s, z] });
    k.add(new THREE.ConeGeometry(s * 0.5, s * 0.8, 6), '#ffffff', { p: [x, h + s * 1.62, z] });
  }
  // the kasbah: square towers of red earth with crenellations
  for (const [x, z] of [[1.2, 1.2], [3, 1.2], [1.2, 2.8], [3, 2.8]]) { k.add('box', '#c7563a', { p: [x, h + 0.9, z], s: [0.8, 1.8, 0.8] }); for (let i = 0; i < 4; i++) k.add('box', '#b84a30', { p: [x + (i % 2 ? 0.25 : -0.25), h + 1.9, z + (i < 2 ? 0.25 : -0.25)], s: [0.22, 0.25, 0.22] }); }
  k.add('box', '#d06a48', { p: [2.1, h + 0.6, 2], s: [1.8, 1.2, 1.8] });
  for (const [x, z] of [[-1.6, 1.6], [-2.8, 2.6], [-0.6, 3]]) { k.add('cyl', '#6b4a2a', { p: [x, h + 0.5, z], s: [0.1, 1, 0.1] }); for (let i = 0; i < 3; i++) k.add('cyl', '#2f7a3f', { p: [x, h + 0.9 + i * 0.35, z], s: [0.7 - i * 0.18, 0.12, 0.7 - i * 0.18] }); }
  g.add(k.mesh());
  g.userData = { height: h + 4.8 };
  return g;
}

// Unit 5 · The Andalusian palace on the hill: arcades round a court with a
// fountain of lions and a long pool, red walls and towers, gardens.
export function andalusPalace() {
  const g = new THREE.Group(), k = kit();
  const red = '#c9704a', cream = '#f3e6c8';
  for (const [x, z, w, d] of [[0, -4.6, 11, 0.8], [-5.4, -0.4, 0.8, 9], [5.4, -0.4, 0.8, 9]]) k.add('box', red, { p: [x, 1.3, z], s: [w, 2.6, d] });
  for (const [x, z] of [[-5.4, -4.6], [5.4, -4.6], [-5.4, 3.8], [5.4, 3.8]]) { k.add('box', red, { p: [x, 1.9, z], s: [1.5, 3.8, 1.5] }); for (let i = 0; i < 4; i++) k.add('box', red, { p: [x + (i % 2 ? 0.5 : -0.5), 3.95, z + (i < 2 ? 0.5 : -0.5)], s: [0.35, 0.35, 0.35] }); }
  k.add(roundBox(8, 0.2, 7, 0.04), '#efe4cc', { p: [0, 0.1, -0.6] });
  for (let i = 0; i < 7; i++) { arch(k, -3 + i * 1, -3, 0.6, 1.5, cream); }
  k.add('box', cream, { p: [0, 2.05, -3], s: [7.4, 0.3, 0.5] });
  // the long pool and the fountain of lions
  k.add('box', '#3f9ad6', { p: [0, 0.22, 0.4], s: [1.4, 0.06, 4.6] });
  k.add(new THREE.CylinderGeometry(0.7, 0.8, 0.4, 16), cream, { p: [0, 0.4, -1.6] });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; k.add(LO, '#e0cf9e', { p: [Math.cos(a) * 0.65, 0.35, -1.6 + Math.sin(a) * 0.65], s: [0.16, 0.18, 0.22] }); }
  k.add(new THREE.CylinderGeometry(0.4, 0.3, 0.2, 12), cream, { p: [0, 0.8, -1.6] });
  for (const x of [-2.6, 2.6]) for (let i = 0; i < 3; i++) { k.add('cyl', '#2f7a3f', { p: [x, 1, -0.4 + i * 1.6], s: [0.25, 2, 0.25] }); }
  put(k, personGeo(114), -1.4, 0.2, 2.6, Math.PI, 1); put(k, personGeo(115, { prop: 'book' }), 1.6, 0.2, 2.2, Math.PI, 1);
  g.add(k.mesh());
  const spout = glow('#bfe8ff', 1.2, 0.6); spout.position.set(0, 1.1, -1.6); g.add(spout);
  g.userData = { height: 5.4, spout };
  return g;
}

// The travellers' compass at the harbour: one ray lights for each finished
// quest; all of them light the north star.
export function travellersCompass(n = 22) {
  const g = new THREE.Group(), k = kit();
  plinth(k, 1, { r: 2.6, steps: false });
  k.add(new THREE.CylinderGeometry(2.2, 2.2, 0.16, 40), '#e8cfa0', { p: [0, 0.66, 0] });
  k.add('torus', PAL.gold, { p: [0, 0.74, 0], r: [Math.PI / 2, 0, 0], s: [2.2, 2.2, 0.6] });
  g.add(k.mesh());
  const rays = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, L = i % 2 ? 1.2 : 1.8;
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.16, L, 3), new THREE.MeshLambertMaterial({ color: '#a89878', emissive: '#000000' }));
    r.rotation.set(Math.PI / 2, 0, -a + Math.PI / 2); r.position.set(Math.cos(a) * L / 2, 0.8, Math.sin(a) * L / 2); r.scale.z = 0.25;
    g.add(r); rays.push(r);
  }
  const needle = new THREE.Group();
  const nk = kit(); nk.add(new THREE.ConeGeometry(0.18, 1.4, 4), '#e8453c', { p: [0, 0, -0.7], r: [-Math.PI / 2, 0, 0] }); nk.add(new THREE.ConeGeometry(0.18, 1.4, 4), '#fbf6ea', { p: [0, 0, 0.7], r: [Math.PI / 2, 0, 0] }); nk.add(LO, PAL.gold, { s: 0.2 });
  needle.add(mesh(nk.geometry(), VC)); needle.position.y = 1; g.add(needle);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), new THREE.MeshLambertMaterial({ color: '#fff2a8', emissive: '#ffd23f', emissiveIntensity: 0 }));
  star.position.y = 2.6; g.add(star);
  const shine = glow('#fff2a8', 3, 0); shine.position.y = 2.6; g.add(shine);
  g.userData = { height: 3.4, rays, needle, star, shine };
  return g;
}

// ---------- The helper «سهيل»: a little star explorer ----------
export function helperStar() {
  const g = new THREE.Group(), k = kit();
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.22 : 0.5; if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const body = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 });
  body.translate(0, 0, -0.11);
  k.add(body, '#ffcf3f', { p: [0, 0.62, 0] });
  k.eyes({ x: 0.1, y: 0.68, z: 0.18, r: 0.07, look: 0.4 });
  k.add(LO, '#e8537a', { p: [0, 0.55, 0.19], s: [0.05, 0.03, 0.02] });
  // an explorer's hat and a red scarf
  k.add('cyl', '#c9a86a', { p: [0, 1.12, 0], s: [0.36, 0.04, 0.36] }); k.add('hemi', '#c9a86a', { p: [0, 1.13, 0], s: [0.22, 0.2, 0.22] });
  k.add('torus', '#c7373f', { p: [0, 0.42, 0], r: [Math.PI / 2, 0, 0], s: [0.2, 0.2, 0.4] });
  k.add('cyl', '#3b3640', { p: [0, 0.03, 0], s: [0.14, 0.06, 0.14] });
  g.add(mesh(k.geometry(), VC));
  const shine = glow('#fff2a8', 1.1, 0.7); shine.position.y = 0.65; g.add(shine);
  g.userData = { shine };
  return g;
}
