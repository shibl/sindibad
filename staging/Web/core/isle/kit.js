// Small models every 3D quest island shares (core/isle/island.js): a raised
// base for a landmark, toy animals, the golden guide arrow, the selection
// ring, rising sparks and lamp posts. Made in code like everything else
// (core/farm/models.js' Kit: shapes merged into one vertex-coloured mesh).

import * as THREE from '../../vendor/three/three.module.min.js';
import { Kit, roundBox } from '../farm/models.js';

const kit = () => new Kit();
const LO = new THREE.SphereGeometry(1, 12, 8);

// A raised base for a landmark: a skirt, a coloured trim and a top, with
// steps at the front. Round (r) or rectangular (w × d). Returns its height.
export function plinth(k, trim, { r, w, d, h = 0.5, top = '#fbfbf8', side = '#e9dcc2', steps = true }) {
  if (r) {
    k.add(new THREE.CylinderGeometry(r, r + 0.16, h, 32), side, { p: [0, h / 2, 0] });
    k.add(new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.12, 32), trim, { p: [0, h - 0.02, 0] });
    k.add(new THREE.CylinderGeometry(r - 0.05, r - 0.05, 0.06, 32), top, { p: [0, h + 0.05, 0] });
  } else {
    k.add(roundBox(w, h, d, 0.08), side, { p: [0, h / 2, 0] });
    k.add(roundBox(w + 0.14, 0.12, d + 0.14, 0.04), trim, { p: [0, h - 0.02, 0] });
    k.add(roundBox(w - 0.1, 0.06, d - 0.1, 0.03), top, { p: [0, h + 0.05, 0] });
  }
  if (steps) {
    const front = r || d / 2;
    for (let i = 0; i < 2; i++) k.add(roundBox(2.2 - i * 0.4, h / 2, 0.42, 0.04), i ? top : side, { p: [0, (h / 2) * (i + 0.5) - 0.02, front + 0.3 - i * 0.28] });
  }
  return h + 0.08;
}

// Toy animals, facing +Z.
export function animalGeo(kind) {
  const k = kit();
  const leg = (c, x, z, h = 0.28, r = 0.05) => k.add('cyl', c, { p: [x, h / 2, z], s: [r, h, r] });
  if (kind === 'rabbit') {
    k.add(LO, '#d9d2c8', { p: [0, 0.22, 0], s: [0.2, 0.17, 0.26] }); k.add(LO, '#d9d2c8', { p: [0, 0.38, 0.18], s: 0.13 });
    for (const s of [-1, 1]) k.add(LO, '#d9d2c8', { p: [s * 0.05, 0.56, 0.14], r: [-0.3, 0, s * 0.15], s: [0.035, 0.13, 0.03] });
    k.add(LO, '#ffffff', { p: [0, 0.24, -0.26], s: 0.06 }); k.eyes({ x: 0.06, y: 0.4, z: 0.28, r: 0.025 });
  } else if (kind === 'fox') {
    k.add(LO, '#e8742e', { p: [0, 0.34, 0], s: [0.17, 0.16, 0.34] }); k.add(LO, '#e8742e', { p: [0, 0.48, 0.32], s: 0.15 });
    k.add('cone', '#e8742e', { p: [0, 0.46, 0.5], r: [Math.PI / 2, 0, 0], s: [0.07, 0.14, 0.07] });
    for (const s of [-1, 1]) k.add('cone4', '#3b2414', { p: [s * 0.08, 0.64, 0.3], s: [0.05, 0.1, 0.04] });
    k.add(LO, '#e8742e', { p: [0, 0.38, -0.42], r: [0.6, 0, 0], s: [0.08, 0.08, 0.2] }); k.add(LO, '#ffffff', { p: [0, 0.36, -0.58], s: 0.06 });
    for (const [x, z] of [[-0.09, 0.2], [0.09, 0.2], [-0.09, -0.2], [0.09, -0.2]]) leg('#3b2414', x, z);
    k.eyes({ x: 0.06, y: 0.52, z: 0.44, r: 0.025 });
  } else if (kind === 'deer') {
    k.add(LO, '#b9844a', { p: [0, 0.62, 0], s: [0.18, 0.18, 0.36] }); k.add(LO, '#b9844a', { p: [0, 0.98, 0.36], s: [0.11, 0.13, 0.14] });
    k.add('cyl', '#b9844a', { p: [0, 0.82, 0.3], r: [0.5, 0, 0], s: [0.07, 0.3, 0.07] });
    for (const s of [-1, 1]) { k.add('cyl', '#7a5130', { p: [s * 0.08, 1.16, 0.32], r: [0, 0, s * 0.4], s: [0.02, 0.24, 0.02] }); k.add('cyl', '#7a5130', { p: [s * 0.13, 1.24, 0.32], r: [0.6, 0, s * 0.2], s: [0.016, 0.12, 0.016] }); }
    for (const [x, z] of [[-0.1, 0.24], [0.1, 0.24], [-0.1, -0.24], [0.1, -0.24]]) leg('#8a5a34', x, z, 0.5, 0.035);
    k.add(LO, '#ffffff', { p: [0, 0.66, -0.36], s: 0.06 }); k.eyes({ x: 0.06, y: 1.0, z: 0.47, r: 0.025 });
  } else if (kind === 'owl') {
    k.add(LO, '#9a6a3c', { p: [0, 0.26, 0], s: [0.17, 0.22, 0.16] }); k.add(LO, '#f3e2c0', { p: [0, 0.22, 0.09], s: [0.12, 0.15, 0.08] });
    k.add(LO, '#9a6a3c', { p: [0, 0.48, 0], s: 0.15 }); k.eyes({ x: 0.06, y: 0.5, z: 0.12, r: 0.05, look: 0.3 });
    k.add('cone4', '#f2c14e', { p: [0, 0.44, 0.15], r: [Math.PI / 2, 0, 0], s: [0.025, 0.05, 0.025] });
  } else if (kind === 'frog') {
    k.add(LO, '#5ab84a', { p: [0, 0.1, 0], s: [0.14, 0.09, 0.15] }); k.eyes({ x: 0.06, y: 0.18, z: 0.08, r: 0.04, look: 0.2 });
  } else if (kind === 'duck') {
    k.add(LO, '#ffffff', { p: [0, 0.12, 0], s: [0.16, 0.11, 0.22] }); k.add(LO, '#2f8a3f', { p: [0, 0.3, 0.14], s: 0.09 });
    k.add('cone4', '#f28c3a', { p: [0, 0.28, 0.25], r: [Math.PI / 2, 0, 0], s: [0.04, 0.08, 0.025] }); k.eyes({ x: 0.04, y: 0.33, z: 0.2, r: 0.018 });
  } else if (kind === 'horse') {
    k.add(LO, '#8a5a34', { p: [0, 0.95, 0], s: [0.26, 0.26, 0.55] }); k.add('cyl', '#8a5a34', { p: [0, 1.25, 0.5], r: [0.6, 0, 0], s: [0.12, 0.55, 0.14] });
    k.add(roundBox(0.2, 0.22, 0.42, 0.08), '#8a5a34', { p: [0, 1.52, 0.78], r: [0.3, 0, 0] }); k.add('box', '#3b2414', { p: [0, 1.48, 0.42], r: [0.6, 0, 0], s: [0.06, 0.4, 0.16] });
    for (const [x, z] of [[-0.14, 0.38], [0.14, 0.38], [-0.14, -0.38], [0.14, -0.38]]) leg('#6b4a2a', x, z, 0.8, 0.06);
    k.eyes({ x: 0.09, y: 1.6, z: 0.86, r: 0.03 });
  } else if (kind === 'camel') {
    k.add(LO, '#d9a86a', { p: [0, 1.05, 0], s: [0.26, 0.24, 0.55] }); k.add(LO, '#d9a86a', { p: [0, 1.32, -0.05], s: [0.2, 0.22, 0.24] });
    k.add('cyl', '#d9a86a', { p: [0, 1.32, 0.52], r: [-0.5, 0, 0], s: [0.09, 0.56, 0.11] });
    k.add(roundBox(0.18, 0.18, 0.36, 0.07), '#d9a86a', { p: [0, 1.6, 0.74] });
    for (const [x, z] of [[-0.13, 0.36], [0.13, 0.36], [-0.13, -0.36], [0.13, -0.36]]) leg('#c9925a', x, z, 0.95, 0.055);
    k.add('box', '#c7373f', { p: [0, 1.28, 0], s: [0.56, 0.06, 0.5] });
    k.eyes({ x: 0.08, y: 1.66, z: 0.86, r: 0.028 });
  } else if (kind === 'robin') {
    k.add(LO, '#7a6a5a', { p: [0, 0, 0], s: [0.1, 0.09, 0.13] }); k.add(LO, '#f28c3a', { p: [0, -0.01, 0.06], s: [0.07, 0.06, 0.07] });
    for (const s of [-1, 1]) k.add(LO, '#6a5a4a', { p: [s * 0.13, 0.02, 0], r: [0, 0, s * 0.3], s: [0.12, 0.02, 0.07] });
  }
  return k.geometry();
}

export function beaconArrow() {
  const k = kit();
  k.add(new THREE.ConeGeometry(0.5, 0.8, 4), '#f2c14e', { r: [Math.PI, 0, 0] });
  k.add('box', '#f2c14e', { p: [0, 0.6, 0], s: [0.28, 0.6, 0.28] });
  const m = k.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#7a5a10' }));
  m.castShadow = false;
  return m;
}
export function selectRing(r = 1) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.94, r, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}
// A sprite with a symbol, for sparks that rise from the places.
const sparkTex = {};
export function sparkSprite(ch = '✦', color = '#ffd23f') {
  const key = ch + color;
  if (!sparkTex[key]) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.font = 'bold 46px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = color; x.strokeStyle = '#ffffff'; x.lineWidth = 6;
    x.strokeText(ch, 32, 34); x.fillText(ch, 32, 34);
    sparkTex[key] = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex[key], transparent: true, depthWrite: false }));
  s.scale.set(0.7, 0.7, 1);
  return s;
}
export function lampGeo(post = '#3b3640', light = '#fff6c8') {
  const k = kit();
  k.add('cyl', post, { p: [0, 1, 0], s: [0.06, 2, 0.06] });
  k.add('cyl', post, { p: [0, 0.08, 0], s: [0.18, 0.16, 0.18] });
  k.add(new THREE.SphereGeometry(0.2, 10, 8), light, { p: [0, 2.15, 0] });
  return k.geometry();
}
