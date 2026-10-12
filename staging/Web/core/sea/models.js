// The 3D sea map's models, made in code like the farm's (core/farm/models.js),
// so they cost nothing to download: an island base, one landmark per island
// (the same ones the flat map draws in art/art.js), fog clouds, the whale, the
// gulls, and pictures of the hero and Hudhud for the ship's deck.
//
// Units: an island is about 8 across. Y is up; the camera looks from +Z.

import * as THREE from '../../vendor/three/three.module.min.js';
import { Kit, VC, rng, roundBox, palm, rock, bush, barn, windmill, silo, hive } from '../farm/models.js';
import { DEFS, heroSVG, hudhudSVG } from '../../art/art.js';

export const R = 4.2;        // island radius at the waterline
export const GROUND = 0.95;  // height of the grass top
const kit = () => new Kit();

// ---------- The island base: a sandy beach and a grassy top ----------

// The island's outline: a circle with gentle bumps. The sea's shader uses the
// same formula for its foam (sea.js), so keep the two in step.
export const bumps = (t, seed) =>
  1 + 0.09 * Math.sin(3 * t + seed) + 0.054 * Math.sin(5 * t + seed * 2.3) + 0.027 * Math.sin(2 * t + seed * 3.7);

function blob(r, seed, scale = 1) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 56; i++) {
    const t = (i / 56) * Math.PI * 2, rr = r * (1 + (bumps(t, seed) - 1) * scale);
    // Shape y becomes world −z once the slab is laid flat.
    if (i) s.lineTo(Math.cos(t) * rr, Math.sin(t) * rr); else s.moveTo(Math.cos(t) * rr, Math.sin(t) * rr);
  }
  return s;
}

// An extruded slab, laid flat with its top at `top`; caps and sides coloured
// separately (ExtrudeGeometry: group 0 = caps, group 1 = sides and bevel).
function slab(k, shape, { depth, bevel, top, cap, side }) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, top - depth - bevel, 0);
  g.deleteAttribute('uv');
  const colors = [new THREE.Color(cap), new THREE.Color(side)];
  const col = new Float32Array(g.attributes.position.count * 3);
  for (const grp of g.groups) {
    const c = colors[grp.materialIndex] || colors[0];
    for (let i = grp.start; i < grp.start + grp.count; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  k.parts.push(g);
}

export function islandBase(seed, { sand = '#f3d596', grass = '#86c86a' } = {}) {
  const k = kit();
  slab(k, blob(R - 0.5, seed), { depth: 0.6, bevel: 0.5, top: 0.45, cap: sand, side: '#e2bd77' });
  slab(k, blob((R - 0.5) * 0.72, seed + 1.3, 1.4), { depth: 0.25, bevel: 0.25, top: GROUND, cap: grass, side: '#5f9e48' });
  const m = k.mesh();
  m.castShadow = false;
  return m;
}

// Palms, bushes, rocks and grass around the edge. `spots`: [kind, angle, radius, size].
function decor(group, spots, seed) {
  const r = rng(seed * 7 + 1);
  for (const [kind, a, rad, size = 1] of spots) {
    const x = Math.cos(a) * rad, z = -Math.sin(a) * rad;
    let m;
    if (kind === 'palm') { m = palm(Math.floor(r() * 9) + 1); m.scale.setScalar(0.42 * size); m.position.set(x, GROUND - 0.05, z); m.rotation.y = r() * 6; }
    else if (kind === 'bush') { m = bush(Math.floor(r() * 9) + 1, r() > 0.5 ? '#5cbb4c' : '#4fae45'); m.scale.setScalar(0.55 * size); m.position.set(x, GROUND - 0.05, z); }
    else { m = rock(Math.floor(r() * 9) + 1, 0.45 * size); m.position.set(x, 0.1, z); m.rotation.y = r() * 6; }
    group.add(m);
  }
}

// A row of small square merlons along the top of a wall.
function merlons(k, x, y, z, w, d, color, m = 0.26) {
  const step = m * 2;
  for (let i = 0, n = Math.max(2, Math.round(w / step)); i < n; i++) {
    const px = x - w / 2 + (i + 0.5) * (w / n);
    k.add('box', color, { p: [px, y, z - d / 2 + m / 2], s: m });
    k.add('box', color, { p: [px, y, z + d / 2 - m / 2], s: m });
  }
  for (let i = 1, n = Math.max(2, Math.round(d / step)); i < n - 1; i++) {
    const pz = z - d / 2 + (i + 0.5) * (d / n);
    k.add('box', color, { p: [x - w / 2 + m / 2, y, pz], s: m });
    k.add('box', color, { p: [x + w / 2 - m / 2, y, pz], s: m });
  }
}

// An arched doorway on a wall facing +Z.
function door(k, x, y, z, w, h, color = '#6b3f1f') {
  k.add('box', color, { p: [x, y + (h - w / 2) / 2, z], s: [w, h - w / 2, 0.08] });
  k.add('cyl', color, { p: [x, y + h - w / 2, z], r: [Math.PI / 2, 0, 0], s: [w / 2, 0.08, w / 2] });
}

// Moving parts that sea.js animates: { flags, spin, beams, smoke, bob, glow }.
const parts = () => ({ flags: [], spin: [], beams: [], smoke: [], bob: [], glow: [], lights: [] });

const glowMat = color => new THREE.MeshBasicMaterial({ color, toneMapped: false });

// ---------- Landmarks (one per island; see art/art.js LANDMARKS) ----------

const G = GROUND;

const LANDMARKS = {
  // Home port: Arwad's little fort, white houses, a pier and a flag.
  port(group, p) {
    const k = kit(), stone = '#e6c79a', dark = '#6b3f1f';
    k.add(roundBox(1.9, 2.5, 1.9, 0.06), stone, { p: [-0.2, G + 1.25, -0.5] });
    merlons(k, -0.2, G + 2.63, -0.5, 1.9, 1.9, stone, 0.3);
    door(k, -0.2, G, 0.46, 0.62, 1.05, dark);
    for (const x of [-0.65, 0.25]) k.add('box', dark, { p: [x, G + 1.75, 0.46], s: [0.22, 0.36, 0.06] });
    k.add('cyl', '#5a3a22', { p: [-0.2, G + 3.4, -0.5], s: [0.04, 1.6, 0.04] });
    // white houses with blue doors
    for (const [x, z, s] of [[1.55, 0.1, 1], [-1.75, 0.75, 0.85], [1.0, 1.45, 0.75]]) {
      k.add(roundBox(0.9 * s, 0.8 * s, 0.85 * s, 0.05), '#fbf1dc', { p: [x, G + 0.4 * s, z] });
      k.add('cone4', '#e07a52', { p: [x, G + 0.8 * s + 0.24 * s, z], r: [0, Math.PI / 4, 0], s: [0.72 * s, 0.48 * s, 0.72 * s] });
      k.add('box', '#3b8fc9', { p: [x, G + 0.22 * s, z + 0.43 * s], s: [0.22 * s, 0.42 * s, 0.04] });
    }
    // the pier, reaching out to where the ship moors
    for (let i = 0; i < 6; i++) k.add('box', i % 2 ? '#b98652' : '#c8955f', { p: [2.9 + i * 0.5, 0.42, 0.9], s: [0.46, 0.1, 1.1] });
    for (const x of [3.0, 4.4, 5.5]) for (const z of [0.42, 1.38]) k.add('cyl', '#7a5130', { p: [x, 0.15, z], s: [0.08, 0.8, 0.08] });
    for (const [x, z] of [[2.55, 1.45], [2.85, 1.7]]) k.add('cyl', '#9a6a3c', { p: [x, G - 0.15, z], s: [0.18, 0.4, 0.18] });
    group.add(k.mesh());
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.45), new THREE.MeshLambertMaterial({ color: '#d0507e', side: THREE.DoubleSide }));
    flag.geometry.translate(0.4, 0, 0);
    flag.position.set(-0.17, G + 3.95, -0.5);
    group.add(flag);
    p.flags.push(flag);
    decor(group, [['palm', 2.4, 2.4], ['palm', 0.5, 2.6, 0.9], ['bush', 3.3, 2.3], ['rock', 4.2, 3.6], ['rock', 1.4, 3.7, 0.8]], 1);
  },

  // Letters: a Damascene gate in ablaq stone (white limestone and black
  // basalt in bands), an open book, and golden letters floating round it.
  letters(group, p) {
    const k = kit(), cream = '#fbf1dc', basalt = '#3b3029', teal = '#2c5e6e';
    const W = 2.7, H = 3.3, base = G;
    k.add('box', cream, { p: [0, base + H / 2, -0.35], s: [W, H, 0.7] });
    for (const y of [0.45, 0.95, 2.95]) k.add('box', basalt, { p: [0, base + y, -0.35], s: [W + 0.03, 0.2, 0.73] });
    // the door and its striped arch (alternating voussoirs, as in Damascus)
    door(k, 0, base, 0.02, 1.3, 2.4, teal);
    const cy = base + 2.4 - 0.65;
    for (let i = 0; i < 11; i++) {
      const a = (i / 10) * Math.PI;
      k.add('box', i % 2 ? basalt : cream, { p: [Math.cos(a) * 0.82, cy + Math.sin(a) * 0.82, 0.02], r: [0, 0, a - Math.PI / 2], s: [0.3, 0.3, 0.12] });
    }
    for (let i = 0; i < 6; i++) for (const x of [-0.82, 0.82]) k.add('box', i % 2 ? basalt : cream, { p: [x, base + 0.15 + i * 0.29, 0.02], s: [0.3, 0.29, 0.12] });
    // stepped merlons and a golden finial
    for (let i = 0; i < 7; i++) k.add('cone4', cream, { p: [-W / 2 + 0.2 + i * ((W - 0.4) / 6), base + H + 0.17, -0.35], r: [0, Math.PI / 4, 0], s: [0.22, 0.34, 0.22] });
    k.add('sphere', '#f2c14e', { p: [0, base + H + 0.55, -0.35], s: 0.2 });
    // an open book on a stand
    k.add('box', '#8a5a32', { p: [1.55, base + 0.3, 1.25], s: [0.12, 0.6, 0.12] });
    k.add('box', '#d0507e', { p: [1.55, base + 0.62, 1.25], r: [-0.5, 0, 0], s: [1.0, 0.06, 0.7] });
    for (const sx of [-1, 1]) k.add('box', '#ffffff', { p: [1.55 + sx * 0.23, base + 0.68, 1.25], r: [-0.5, 0, sx * 0.18], s: [0.44, 0.04, 0.62] });
    group.add(k.mesh());
    p.letters = { y: base + 2.2, r: 2.0, chars: ['أ', 'ض', 'ب', 'ع'] };
    decor(group, [['palm', 2.6, 2.5], ['bush', 0.6, 2.4], ['bush', 2.2, 2.6, 0.8], ['rock', 3.9, 3.6], ['rock', 5.6, 3.7, 0.7]], 2);
  },

  // Numbers: a striped lighthouse whose beam sweeps the sea, and a brass astrolabe.
  numbers(group, p) {
    const k = kit(), white = '#fbf1dc', red = '#c7373f';
    k.add('cyl', '#cfa977', { p: [0, G + 0.15, -0.2], s: [1.0, 0.3, 1.0] });
    for (let i = 0; i < 4; i++) {
      const r0 = 0.78 - i * 0.08, r1 = r0 - 0.08;
      k.add(new THREE.CylinderGeometry(r1, r0, 0.8, 18), i % 2 ? red : white, { p: [0, G + 0.7 + i * 0.8, -0.2] });
    }
    door(k, 0, G + 0.3, 0.55, 0.42, 0.75);
    k.add('cyl', '#6b3f1f', { p: [0, G + 3.56, -0.2], s: [0.66, 0.12, 0.66] });
    k.add('torus', '#6b3f1f', { p: [0, G + 3.78, -0.2], r: [Math.PI / 2, 0, 0], s: [0.6, 0.6, 0.6] });
    k.add('cone', red, { p: [0, G + 4.5, -0.2], s: [0.5, 0.5, 0.5] });
    k.add('sphere', '#f2c14e', { p: [0, G + 4.8, -0.2], s: 0.09 });
    group.add(k.mesh());
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.55, 14), glowMat('#fff4b0'));
    lamp.position.set(0, G + 3.95, -0.2);
    group.add(lamp);
    p.lights.push(lamp);
    // the beam: a long soft cone turning slowly
    const beamGeo = new THREE.ConeGeometry(1.1, 7, 20, 1, true);
    beamGeo.translate(0, -3.5, 0);
    beamGeo.rotateZ(Math.PI / 2);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: '#fff4b0', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    const pivot = new THREE.Group();
    pivot.position.copy(lamp.position);
    pivot.add(beam);
    group.add(pivot);
    p.beams.push(pivot);
    // the astrolabe
    const astro = new THREE.Group();
    const a = kit();
    a.add('cyl', '#8a5a32', { p: [0, 0.35, 0], s: [0.06, 0.7, 0.06] });
    a.add('cyl', '#d4a53c', { p: [0, 1.05, 0], r: [Math.PI / 2, 0, 0], s: [0.38, 0.05, 0.38] });
    a.add('torus', '#b8862a', { p: [0, 1.05, 0], s: [0.42, 0.42, 0.42] });
    a.add('torus', '#b8862a', { p: [0, 1.05, 0], r: [0, Math.PI / 2, 0], s: [0.36, 0.36, 0.36] });
    a.add('box', '#c7373f', { p: [0, 1.05, 0.04], r: [0, 0, 0.7], s: [0.62, 0.06, 0.04] });
    astro.add(a.mesh());
    astro.position.set(1.55, G, 0.85);
    group.add(astro);
    p.spin.push({ obj: astro, axis: 'y', speed: 0.4 });
    decor(group, [['rock', 1.2, 2.3], ['rock', 2.9, 2.2, 0.8], ['bush', 2.3, 2.5], ['palm', 0.4, 2.4, 0.9], ['rock', 5.0, 3.6]], 3);
  },

  // Science: a friendly volcano that puffs smoke, giant leaves and a flask.
  science(group, p) {
    const k = kit(), rockC = '#9a6b4e', lava = '#f06a3a';
    k.add(new THREE.CylinderGeometry(0.55, 2.1, 2.6, 14), rockC, { p: [-0.2, G + 1.3, -0.4] });
    k.add(new THREE.CylinderGeometry(0.4, 1.4, 1.5, 11), '#86593f', { p: [0.6, G + 0.75, -0.9], r: [0, 0.4, 0] });
    k.add('cyl', lava, { p: [-0.2, G + 2.62, -0.4], s: [0.5, 0.08, 0.5] });
    const slope = Math.atan2(2.1 - 0.55, 2.6);
    for (const [phi, len] of [[0.2, 1.3], [-0.5, 0.9], [0.9, 1.0]]) {
      const g = new THREE.BoxGeometry(0.16, len, 0.08);
      g.translate(0, -len / 2, 0);
      g.rotateX(-slope);
      g.translate(0, 0, 0.58);
      g.rotateY(phi);
      k.add(g, lava, { p: [-0.2, G + 2.6, -0.4] });
    }
    // giant leaves
    for (const [x, z, rot, s] of [[-2.0, 0.6, 0.6, 1], [1.7, 0.4, -0.7, 0.9], [-1.4, 1.5, 0.2, 0.7]]) {
      k.add('sphere', '#3a9b4a', { p: [x, G + 0.7 * s, z], r: [0, rot, 0.9 * Math.sign(-x)], s: [0.25 * s, 0.85 * s, 0.4 * s] });
      k.add('sphere', '#4fae45', { p: [x + 0.25 * Math.sign(x), G + 0.55 * s, z + 0.15], r: [0, rot, 1.1 * Math.sign(-x)], s: [0.2 * s, 0.7 * s, 0.33 * s] });
    }
    // a bubbling flask
    k.add('sphere', '#dff6ff', { p: [1.35, G + 0.42, 1.25], s: 0.42 });
    k.add('cyl', '#dff6ff', { p: [1.35, G + 0.95, 1.25], s: [0.14, 0.5, 0.14] });
    k.add('sphere', '#6ee07a', { p: [1.35, G + 0.33, 1.25], s: [0.38, 0.28, 0.38] });
    k.add('cyl', '#c9a26b', { p: [1.35, G + 1.22, 1.25], s: [0.16, 0.08, 0.16] });
    group.add(k.mesh());
    // smoke puffs that rise from the crater and fade
    const smokeMat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), smokeMat.clone());
      puff.userData.phase = i / 4;
      puff.userData.from = new THREE.Vector3(-0.2, G + 2.7, -0.4);
      group.add(puff);
      p.smoke.push(puff);
    }
    decor(group, [['palm', 2.0, 2.5], ['bush', 0.9, 2.5], ['rock', 3.6, 3.6], ['rock', 0.1, 3.7, 0.8]], 4);
  },

  // Geography and history: the Citadel of Aleppo on its mound, with the bridge.
  citadel(group, p) {
    const k = kit(), sand = '#d9b27a', wall = '#e8cf9c', dark = '#6b3f1f';
    k.add(new THREE.CylinderGeometry(1.75, 2.5, 1.3, 22), sand, { p: [0, G + 0.65, -0.5] });
    k.add(new THREE.CylinderGeometry(2.12, 2.16, 0.08, 22), '#b98d55', { p: [0, G + 0.6, -0.5] });
    k.add(roundBox(2.9, 1.0, 2.3, 0.04), wall, { p: [0, G + 1.8, -0.5] });
    merlons(k, 0, G + 2.42, -0.5, 2.9, 2.3, wall, 0.24);
    for (const [x, z] of [[-1.35, -1.55], [1.35, -1.55], [-1.35, 0.55], [1.35, 0.55]]) {
      k.add('box', wall, { p: [x, G + 2.0, z], s: [0.6, 1.5, 0.6] });
      merlons(k, x, G + 2.85, z, 0.6, 0.6, wall, 0.18);
    }
    // the gate tower and the bridge up the glacis
    k.add('box', wall, { p: [0, G + 1.95, 0.85], s: [1.0, 1.6, 0.7] });
    merlons(k, 0, G + 2.85, 0.85, 1.0, 0.7, wall, 0.2);
    door(k, 0, G + 1.3, 1.21, 0.42, 0.75, dark);
    const len = 1.7, rise = 1.3 - 0.05, ang = Math.atan2(rise, len);
    k.add('box', '#c9a26b', { p: [0, G + 0.7, 1.21 + len / 2 * Math.cos(ang) + 0.1], r: [ang, 0, 0], s: [0.5, 0.14, Math.hypot(len, rise)] });
    for (const t of [0.35, 0.7]) k.add('box', '#c9a26b', { p: [0, G + (1.3 * (1 - t)) / 2, 1.3 + len * t], s: [0.42, 1.3 * (1 - t), 0.22] });
    // a minaret with a golden top
    k.add('cyl', wall, { p: [-0.7, G + 3.0, -0.9], s: [0.17, 1.6, 0.17] });
    k.add('cyl', wall, { p: [-0.7, G + 3.4, -0.9], s: [0.26, 0.08, 0.26] });
    k.add('sphere', '#f2c14e', { p: [-0.7, G + 3.95, -0.9], s: [0.18, 0.24, 0.18] });
    k.add('cone', '#f2c14e', { p: [-0.7, G + 4.25, -0.9], s: [0.06, 0.25, 0.06] });
    group.add(k.mesh());
    decor(group, [['palm', 2.5, 2.6, 0.9], ['bush', 0.3, 2.6], ['bush', 3.6, 2.5, 0.8], ['rock', 4.6, 3.6], ['rock', 1.0, 3.7, 0.7]], 5);
  },

  // Farm: the farm island's own barn, windmill, silo, crops and hive.
  farm(group, p) {
    const add = (obj, s, x, z, ry = 0) => { obj.scale.setScalar(s); obj.position.set(x, G, z); obj.rotation.y = ry; group.add(obj); return obj; };
    add(barn(), 0.3, -0.1, -0.6);
    add(silo(), 0.32, 1.35, -0.9);
    const mill = add(windmill(), 0.34, -1.75, -0.1, 0.35);
    p.spin.push({ obj: mill.userData.blades, axis: 'z', speed: 1.4 });
    add(hive(), 0.6, 1.55, 0.95, -0.4);
    const k = kit();
    k.add(roundBox(1.9, 0.12, 1.2, 0.04), '#a36f42', { p: [-0.35, G + 0.06, 1.25] });
    for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) k.add('ball', i % 2 ? '#4fae45' : '#5cbb4c', { p: [-1.1 + i * 0.38, G + 0.22, 0.88 + row * 0.37], s: 0.15 });
    group.add(k.mesh());
    decor(group, [['palm', 2.6, 2.6, 0.85], ['bush', 0.9, 2.5], ['rock', 4.0, 3.6], ['rock', 5.5, 3.7, 0.7]], 6);
  },

  // Treasure: a glowing chest under a palm, with gold coins about.
  treasure(group, p) {
    const k = kit(), brass = '#f2c14e';
    k.add(roundBox(1.15, 0.62, 0.78, 0.05), '#a0602e', { p: [-0.1, G + 0.31, 0.3] });
    const lid = new THREE.CylinderGeometry(0.39, 0.39, 1.15, 14, 1, false, 0, Math.PI);
    lid.rotateZ(Math.PI / 2);
    k.add(lid, '#b8723a', { p: [-0.1, G + 0.62, 0.3] });
    const band = new THREE.CylinderGeometry(0.41, 0.41, 0.1, 14, 1, false, 0, Math.PI);
    band.rotateZ(Math.PI / 2);
    for (const x of [-0.45, 0.25]) k.add('box', brass, { p: [x, G + 0.31, 0.3], s: [0.1, 0.64, 0.82] }).add(band, brass, { p: [x, G + 0.62, 0.3] });
    k.add('box', brass, { p: [-0.1, G + 0.55, 0.7], s: [0.2, 0.22, 0.06] });
    for (const [x, z, n] of [[-0.9, 0.9, 3], [0.65, 1.05, 2], [-0.3, 1.25, 1], [0.95, 0.45, 1], [-1.2, 0.2, 2]]) {
      for (let i = 0; i < n; i++) k.add('cyl', i % 2 ? '#ffd23f' : '#f6c12c', { p: [x + i * 0.03, G + 0.04 + i * 0.07, z], s: [0.17, 0.06, 0.17] });
    }
    group.add(k.mesh());
    const pm = palm(4);
    pm.scale.setScalar(0.62);
    pm.position.set(0.9, G - 0.05, -0.8);
    group.add(pm);
    // a warm glow around the chest
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffe27a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    glow.scale.set(3.6, 3.6, 1);
    glow.position.set(-0.1, G + 0.7, 0.3);
    group.add(glow);
    p.glow.push(glow);
    decor(group, [['palm', 2.4, 2.5, 0.85], ['bush', 0.2, 2.5], ['rock', 3.8, 3.6], ['rock', 5.4, 3.7, 0.7]], 7);
  },
};

// An island with its landmark. Unknown kinds get a plain palm island.
export function buildIsland(kind, seed) {
  const group = new THREE.Group();
  const p = parts();
  const tint = { port: '#9bcf72', numbers: '#8ccf8a', science: '#78c46a', citadel: '#9ccf6e', farm: '#8fd06e', treasure: '#8fd06e' }[kind];
  group.add(islandBase(seed, { grass: tint || '#86c86a', sand: kind === 'treasure' ? '#f7dc9c' : '#f3d596' }));
  const landmark = new THREE.Group();
  (LANDMARKS[kind] || (g => decor(g, [['palm', 1.6, 0.6], ['palm', 4, 1.2, 0.9], ['bush', 0, 1.5]], seed)))(landmark, p);
  group.add(landmark);
  return { group, landmark, parts: p };
}

// ---------- Fog, whale, gulls ----------

// A puffy cloud: a few white balls merged into one mesh. It glows a little
// from inside, so it stays white in any light.
const CLOUD = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#c4d2e0', emissiveIntensity: 0.55 });
// A puffy cloud: a few white balls merged into one mesh.
export function cloud(seed = 1, size = 1) {
  const r = rng(seed * 19 + 3);
  const k = kit();
  const n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    k.add('sphere', i % 3 ? '#ffffff' : '#eef4fa', { p: [Math.cos(a) * 0.9 * size, (0.1 + r() * 0.35) * size, Math.sin(a) * 0.5 * size], s: (0.65 + r() * 0.35) * size });
  }
  k.add('sphere', '#ffffff', { p: [0, 0.55 * size, 0], s: 0.95 * size });
  const m = k.mesh(CLOUD, { shadow: false });
  m.castShadow = true;
  m.receiveShadow = false;
  return m;
}

export function whale() {
  const g = new THREE.Group();
  const k = kit();
  k.add('sphere', '#5a8fd0', { s: [1.6, 0.75, 0.85] });
  k.add('sphere', '#cfe3f7', { p: [0.15, -0.3, 0], s: [1.35, 0.45, 0.7] });
  k.add('sphere', '#5a8fd0', { p: [-1.5, 0.05, 0], s: [0.6, 0.3, 0.32] });
  for (const z of [-0.45, 0.45]) k.add('sphere', '#5a8fd0', { p: [-2.0, 0.22, z], r: [0, z > 0 ? 0.6 : -0.6, 0], s: [0.45, 0.08, 0.28] });
  k.add('sphere', '#4a7cbc', { p: [0.2, -0.25, 0.75], r: [0.6, 0, 0], s: [0.45, 0.08, 0.22] });
  k.add('sphere', '#4a7cbc', { p: [0.2, -0.25, -0.75], r: [-0.6, 0, 0], s: [0.45, 0.08, 0.22] });
  for (const z of [-0.6, 0.6]) {
    k.add('sphere', '#ffffff', { p: [1.05, 0.12, z], s: 0.14 });
    k.add('sphere', '#1f1612', { p: [1.12, 0.12, z * 1.06], s: 0.08 });
  }
  g.add(k.mesh());
  return g;
}

export function gull() {
  const g = new THREE.Group();
  g.add(kit().add('sphere', '#ffffff', { s: [0.32, 0.14, 0.14] }).add('cone', '#f2a51a', { p: [0.36, 0, 0], r: [0, 0, -Math.PI / 2], s: [0.05, 0.12, 0.05] }).mesh(VC, { shadow: false }));
  const wings = [];
  for (const side of [-1, 1]) {
    const w = kit().add('box', '#ffffff', { p: [0, 0, side * 0.4], s: [0.22, 0.03, 0.8] }).add('box', '#3b3029', { p: [0, 0.005, side * 0.75], s: [0.2, 0.035, 0.12] }).mesh(VC, { shadow: false });
    g.add(w);
    wings.push(w);
  }
  g.userData.wings = wings;
  return g;
}

// ---------- Small textures ----------

let glowTex;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

// A golden letter for the letters island, drawn with the game's font.
export function letterSprite(ch) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, 128, 128);
    g.font = '800 88px "Baloo Bhaijaan 2", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 12; g.strokeStyle = '#3b2414';
    g.strokeText(ch, 64, 70);
    const grd = g.createLinearGradient(0, 30, 0, 110);
    grd.addColorStop(0, '#fff3a0'); grd.addColorStop(1, '#f2b21e');
    g.fillStyle = grd; g.fillText(ch, 64, 70);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load('800 88px "Baloo Bhaijaan 2"').then(draw, () => {});
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(0.9, 0.9, 1);
  return s;
}

// The hero or Hudhud as a flat picture standing on the deck: the same
// drawings as the rest of the game (art/art.js), turned into a texture.
export function artSprite(kind, height) {
  const [svg, w, h] = kind === 'hudhud' ? [hudhudSVG(), 160, 140] : [heroSVG(kind), 200, 300];
  const S = 2;
  const src = svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${w * S}" height="${h * S}" `)
    .replace(/(<svg[^>]*>)/, `$1<defs>${DEFS}</defs>`);
  const c = document.createElement('canvas');
  c.width = w * S; c.height = h * S;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
  img.onload = () => { c.getContext('2d').drawImage(img, 0, 0); tex.needsUpdate = true; URL.revokeObjectURL(url); };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.05 }));
  s.scale.set(height * (w / h), height, 1);
  s.center.set(0.5, 0.02);
  return s;
}
