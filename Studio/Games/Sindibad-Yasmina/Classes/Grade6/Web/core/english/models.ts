// The English island's 3D models, all made in code: a bright seaside town on
// white limestone terraces in a turquoise sea, and one place per stop of the
// English book, in its order — the harbour of countries with its flags
// (unit 1), Bosra's black-basalt theatre (2), the Big Blue with its whale and
// dive boat (3), the house of arts and TV (4–5), the hospital (6), the park
// (7–8), grandpa's farm with its recycling corner (9–10), the Sunday souq
// and its kitchen café (11–12), the garden of feelings by the river and the
// forest (13–14), the school (15), the clock-tower square with the party
// hall (16–17) and the hill of stars: the tech lab, the holiday camp and the
// observatory with its turning planets (18–20). Plus white and coloured
// houses, the HELLO sign (its letters and 24 star bulbs light up as quests
// are finished) and the helper «بولي», a macaw.
// Units: 1 ≈ 1 metre; Y is up; the camera looks from +Z.
//
// The browser loads models.js, made from this file by `npm run build`.

import * as THREE from '../../vendor/three/three.module.min.js';
import { Kit, VC, rng, roundBox, dhow, windmill, tractor, barn as farmBarn } from '../farm/models.js';
import { treeGeo, bushGeo, rockGeo, personGeo, put, glow, bunting } from '../tunes/models.js';
import { makeGround } from '../isle/ground.js';
import { plinth as basePlinth, beaconArrow, selectRing, sparkSprite, lampGeo, canvasTextures } from '../isle/kit.js';

export { treeGeo, bushGeo, rockGeo, personGeo, put, glow, beaconArrow, selectRing, sparkSprite };
const lampGeoE = () => lampGeo('#2f4a7a', '#fff3c4');
export { lampGeoE as lampGeo };

const kit = () => new Kit();
const LO = new THREE.SphereGeometry(1, 12, 8);
const mesh = (geo: THREE.BufferGeometry, m: THREE.Material) => { const x = new THREE.Mesh(geo, m); x.castShadow = true; return x; };
const lambert = (color: THREE.ColorRepresentation, o: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, ...o });

export const PAL = {
  grass: '#a9dc7a', grassB: '#b4df82', grassC: '#bfe08a', grassD: '#c9e294',
  cliff: '#f4efe2', cliffDark: '#c9bfa8', sand: '#f8e3a8', sandSide: '#e6c483',
  path: '#f6f1e6', pathEdge: '#d8cdb6', white: '#fbfaf5', stone: '#ece4d2', basalt: '#4b4652', basaltL: '#615b68',
  wood: '#a8703f', ink: '#3b2414', blue: '#2f6fd0', sky: '#7fc4f0', terracotta: '#d9774a', gold: '#f2c14e',
};
export const BLOCK: Record<number, string> = { 1: '#2f6fd0', 2: '#23a26a', 3: '#e0782f', 4: '#8a55d0' };
const plinth = (k: Kit, block: number, opts: Parameters<typeof basePlinth>[2]) => basePlinth(k, BLOCK[block], { top: PAL.white, side: PAL.stone, ...opts });

// ---------- Ground: four terraces of white limestone ----------
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

// ---------- Canvas pictures (flags, screens, clock faces…) ----------
const canvasTex = canvasTextures();
/** Draws a picture on a canvas of w × h. */
type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;
const star5 = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.fill(); };
const FLAGS: Record<string, Draw> = {
  // as on the atlas island (worlds/atlas/countries.js): green, white, black, three red stars
  syria: (g, w, h) => { g.fillStyle = '#007a3d'; g.fillRect(0, 0, w, h / 3 + 1); g.fillStyle = '#fff'; g.fillRect(0, h / 3, w, h / 3 + 1); g.fillStyle = '#000'; g.fillRect(0, (2 * h) / 3, w, h / 3); for (const x of [0.28, 0.5, 0.72]) star5(g, w * x, h / 2, h * 0.11, '#ce1126'); },
  italy: (g, w, h) => { ['#009246', '#fff', '#ce2b37'].forEach((c, i) => { g.fillStyle = c; g.fillRect((i * w) / 3, 0, w / 3 + 1, h); }); },
  spain: (g, w, h) => { g.fillStyle = '#aa151b'; g.fillRect(0, 0, w, h); g.fillStyle = '#f1bf00'; g.fillRect(0, h / 4, w, h / 2); },
  canada: (g, w, h) => { g.fillStyle = '#d52b1e'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(w / 4, 0, w / 2, h); star5(g, w / 2, h / 2, h * 0.3, '#d52b1e'); },
  germany: (g, w, h) => { ['#000', '#dd0000', '#ffce00'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i * h) / 3, w, h / 3 + 1); }); },
  china: (g, w, h) => { g.fillStyle = '#de2910'; g.fillRect(0, 0, w, h); star5(g, w * 0.17, h * 0.27, h * 0.16, '#ffde00'); for (const [x, y] of [[0.33, 0.1], [0.4, 0.2], [0.4, 0.35], [0.33, 0.45]]) star5(g, w * x, h * y, h * 0.05, '#ffde00'); },
  russia: (g, w, h) => { ['#fff', '#0039a6', '#d52b1e'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i * h) / 3, w, h / 3 + 1); }); },
};
const flagTex = (id: string) => canvasTex(`flag-${id}`, 96, 64, FLAGS[id]);
function writeText(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, col = '#3b2414', font = 'bold') {
  g.font = `${font} ${size}px "Baloo Bhaijaan 2", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(text, x, y);
}
const signTex = () => canvasTex('sign', 128, 160, (g, w, h) => {
  ([['DAMASCUS', '#2f6fd0', 22], ['LONDON', '#e0782f', 70], ['ROME', '#23a26a', 118]] as const).forEach(([t, c, y], i) => {
    g.fillStyle = c; g.beginPath();
    if (i % 2) { g.moveTo(4, y); g.lineTo(18, y - 18); g.lineTo(124, y - 18); g.lineTo(124, y + 18); g.lineTo(18, y + 18); }
    else { g.moveTo(124, y); g.lineTo(110, y - 18); g.lineTo(4, y - 18); g.lineTo(4, y + 18); g.lineTo(110, y + 18); }
    g.fill(); writeText(g, t, 64, y + 1, 19, '#fff');
  });
});
const SCREENS: Draw[] = [
  (g, w, h) => { g.fillStyle = '#7fd0ff'; g.fillRect(0, 0, w, h); g.fillStyle = '#5fbf5a'; g.fillRect(0, h * 0.72, w, h); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(w * 0.8, h * 0.25, 12, 0, 7); g.fill(); g.fillStyle = '#8a5a34'; g.beginPath(); g.arc(w * 0.35, h * 0.55, 20, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.3, h * 0.5, 5, 0, 7); g.arc(w * 0.42, h * 0.5, 5, 0, 7); g.fill(); writeText(g, 'CARTOON', w / 2, h * 0.88, 16, '#fff'); },
  (g, w, h) => { g.fillStyle = '#1f3a6a'; g.fillRect(0, 0, w, h); g.fillStyle = '#d0344c'; g.fillRect(0, h * 0.74, w, h * 0.26); writeText(g, 'NEWS', w / 2, h * 0.87, 20, '#fff'); g.fillStyle = '#f6c9a0'; g.beginPath(); g.arc(w * 0.5, h * 0.35, 16, 0, 7); g.fill(); g.fillStyle = '#3f6fd6'; g.fillRect(w * 0.36, h * 0.48, w * 0.28, h * 0.26); },
  (g, w, h) => { g.fillStyle = '#9fe0ff'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(w * 0.35, h * 0.4, 18, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.6, h * 0.45, 16, 0, 7); g.arc(w * 0.72, h * 0.42, 20, 0, 7); g.arc(w * 0.84, h * 0.48, 14, 0, 7); g.fill(); writeText(g, 'WEATHER 25°', w / 2, h * 0.86, 15, '#1f3a6a'); },
  (g, w, h) => { g.fillStyle = '#2f8a3f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(8, 8, w - 16, h - 16); g.beginPath(); g.moveTo(w / 2, 8); g.lineTo(w / 2, h - 8); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 14, 0, 7); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.65, h * 0.6, 5, 0, 7); g.fill(); writeText(g, 'SPORT', w / 2, h * 0.2, 14, '#fff'); },
];
const screenTex = (i: number) => canvasTex(`tv-${i}`, 128, 96, SCREENS[i]);
const paintingTex = (i: number) => canvasTex(`paint-${i}`, 64, 80, (g, w, h) => {
  const bg = ['#ffe9b8', '#d8f0ff', '#ffe0ec'][i]; g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (i === 0) { g.strokeStyle = '#2f6fd0'; g.lineWidth = 5; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(w / 2, h / 2, 6 + k * 7, k, k + 4.5); g.stroke(); } g.strokeStyle = '#e0782f'; g.beginPath(); g.arc(w / 2, h / 2, 26, 3, 6); g.stroke(); }
  if (i === 1) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(w * 0.7, h * 0.25, 9, 0, 7); g.fill(); g.fillStyle = '#5fbf5a'; g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.35, h * 0.45); g.lineTo(w * 0.7, h); g.fill(); g.fillStyle = '#3f9d3c'; g.beginPath(); g.moveTo(w * 0.3, h); g.lineTo(w * 0.7, h * 0.55); g.lineTo(w, h); g.fill(); }
  if (i === 2) { g.fillStyle = '#f6c9a0'; g.beginPath(); g.arc(w / 2, h * 0.42, 16, 0, 7); g.fill(); g.fillStyle = '#3b2414'; g.beginPath(); g.arc(w / 2, h * 0.34, 17, Math.PI, 0); g.fill(); g.fillStyle = '#8a55d0'; g.fillRect(w * 0.25, h * 0.66, w * 0.5, h * 0.34); g.fillStyle = '#3b2414'; g.fillRect(w * 0.42, h * 0.42, 3, 3); g.fillRect(w * 0.55, h * 0.42, 3, 3); }
});
const faceTex = (mood: 'happy' | 'sad' | 'surprised' | 'excited') => canvasTex(`face-${mood}`, 64, 64, (g, w) => {
  g.fillStyle = { happy: '#ffd23f', sad: '#8fc8f0', surprised: '#ffb05a', excited: '#ff8fb8' }[mood]; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
  g.strokeStyle = '#3b2414'; g.lineWidth = 3; g.fillStyle = '#3b2414';
  g.beginPath(); g.arc(22, 26, 4, 0, 7); g.arc(42, 26, 4, 0, 7); g.fill();
  g.beginPath();
  if (mood === 'happy' || mood === 'excited') g.arc(32, 36, 14, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (mood === 'sad') g.arc(32, 52, 12, 1.2 * Math.PI, 1.8 * Math.PI);
  else { g.arc(32, 44, 6, 0, 7); }
  g.stroke();
});
const clockTex = () => canvasTex('clock', 128, 128, (g, w) => {
  g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#3b2414'; g.lineWidth = 6; g.stroke();
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; writeText(g, String(i), 64 + Math.cos(a) * 46, 66 + Math.sin(a) * 46, 18); }
});
const boardTex = () => canvasTex('board', 128, 80, (g, w, h) => { g.fillStyle = '#2f5a3f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a8703f'; g.lineWidth = 8; g.strokeRect(0, 0, w, h); writeText(g, 'A B C', w / 2, h * 0.4, 28, '#fff'); writeText(g, 'my rights', w / 2, h * 0.75, 16, '#ffe9a8', 'normal'); });
const hopTex = () => canvasTex('hop', 64, 192, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.strokeRect(12, 4 + i * 30, 40, 30); writeText(g, String(i + 1), 32, 20 + i * 30, 18, '#fff'); } });
const planeWith = (tex: THREE.Texture, w: number, h: number, o: { transparent?: boolean; side?: THREE.Side } = {}) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex, transparent: !!o.transparent, side: o.side || THREE.FrontSide }));

// ---------- Small pieces ----------
export function palmGeo(seed = 1, s = 1) {
  const r = rng(seed * 13 + 5), k = kit();
  const curve = 0.15 + r() * 0.2;
  for (let i = 0; i < 6; i++) k.add(new THREE.CylinderGeometry(0.16 * s, 0.2 * s, 0.75 * s, 7), i % 2 ? '#b48a55' : '#a07a48', { p: [i * curve * 0.4 * s, (0.38 + i * 0.7) * s, 0], r: [0, 0, -curve * 0.6] });
  const top = [6 * curve * 0.4 * s - 0.1 * s, 4.4 * s, 0];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; k.add(LO, i % 2 ? '#3f9d3c' : '#4fae45', { p: [top[0] + Math.cos(a) * 0.9 * s, top[1] - 0.25 * s, Math.sin(a) * 0.9 * s], r: [Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5], s: [1.1 * s, 0.08 * s, 0.32 * s] }); }
  return k.geometry();
}
// A small Mediterranean house: white (or pastel) walls, blue door and
// shutters, a flat roof with a parapet or a terracotta roof.
function houseInto(k: Kit, x: number, y: number, z: number, ry: number, seed: number) {
  const r = rng(seed * 7 + 3);
  const walls = ['#fbfaf5', '#fbfaf5', '#fff3c9', '#ffe1e6', '#dcefff', '#fbfaf5'][Math.floor(r() * 6)];
  const w = 1.4 + r() * 0.8, d = 1.3 + r() * 0.6, h = 1.2 + r() * 0.9;
  const c = Math.cos(ry), s = Math.sin(ry), P = (lx: number, ly: number, lz: number) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  k.add(roundBox(w, h, d, 0.06), walls, { p: P(0, h / 2, 0), r: [0, ry, 0] });
  const door = ['#2f6fd0', '#23a26a', '#2fb3a8', '#d9774a'][Math.floor(r() * 4)];
  k.add('box', door, { p: P(-w * 0.2, 0.42, d / 2 + 0.02), r: [0, ry, 0], s: [0.36, 0.78, 0.04] });
  k.add('box', '#7fc4f0', { p: P(w * 0.22, h * 0.62, d / 2 + 0.02), r: [0, ry, 0], s: [0.34, 0.32, 0.04] });
  k.add('box', door, { p: P(w * 0.22 - 0.25, h * 0.62, d / 2 + 0.03), r: [0, ry, 0], s: [0.1, 0.34, 0.03] });
  k.add('box', door, { p: P(w * 0.22 + 0.25, h * 0.62, d / 2 + 0.03), r: [0, ry, 0], s: [0.1, 0.34, 0.03] });
  if (r() < 0.5) k.add(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 0.7, 4), PAL.terracotta, { p: P(0, h + 0.34, 0), r: [0, ry + Math.PI / 4, 0], s: [w / Math.max(w, d), 1, d / Math.max(w, d)] });
  else { k.add('box', walls, { p: P(0, h + 0.08, 0), r: [0, ry, 0], s: [w + 0.06, 0.16, d + 0.06] }); if (r() < 0.6) k.add('box', '#ec79a8', { p: P(w * 0.3, h + 0.28, d * 0.3), r: [0, ry, 0], s: [0.35, 0.25, 0.35] }); }
}
export function town(spots: readonly (readonly number[])[]) {
  const k = kit();
  spots.forEach(([x, z, ry], i) => houseInto(k, x, levelAt(z), z, ry, i + 1));
  const m = k.mesh();
  return m;
}
function flagPole(g: THREE.Group, k: Kit, x: number, y: number, z: number, id: string, h = 2.6) {
  k.add('cyl', '#dfe4ea', { p: [x, y + h / 2, z], s: [0.05, h, 0.05] });
  k.add(LO, PAL.gold, { p: [x, y + h + 0.05, z], s: 0.08 });
  const geo = new THREE.PlaneGeometry(0.9, 0.6, 6, 1);
  geo.translate(0.45, 0, 0);
  const f = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: flagTex(id), side: THREE.DoubleSide }));
  f.position.set(x + 0.04, y + h - 0.35, z);
  g.add(f);
  return f;
}

// ---------- Unit 1 · The harbour of countries ----------
export function harbour() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 1, { r: 5.4 });
  // a basin of sea with a wooden quay
  k.add(new THREE.CylinderGeometry(4.7, 4.7, 0.1, 40, 1, false, 0.2, 1.9), '#3fb3e0', { p: [0, h + 0.03, 0] });
  for (let i = 0; i < 6; i++) k.add('box', i % 2 ? '#b98652' : '#c8955f', { p: [1.2 + i * 0.5, h + 0.16, 0.2], s: [0.46, 0.1, 1.2] });
  // a lighthouse, white with red bands
  for (let i = 0; i < 5; i++) k.add(new THREE.CylinderGeometry(0.62 - i * 0.07, 0.68 - i * 0.07, 0.7, 16), i % 2 ? '#e8453c' : '#fbfaf5', { p: [-3.3, h + 0.35 + i * 0.7, -1.9] });
  k.add(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 12), '#bfe8ff', { p: [-3.3, h + 3.75, -1.9] });
  k.add('cone', '#e8453c', { p: [-3.3, h + 4.3, -1.9], s: [0.55, 0.6, 0.55] });
  // the signpost: Damascus, London, Rome
  k.add('cyl', '#8a5a34', { p: [-2.7, h + 1.1, 2.2], s: [0.07, 2.2, 0.07] });
  // a little globe on a stand
  k.add('cyl', PAL.gold, { p: [-0.6, h + 0.35, -3], s: [0.12, 0.7, 0.12] });
  put(k, personGeo(201, { prop: 'book' }), -1.4, h, 3.2, 0.3, 1); put(k, personGeo(202), 0.6, h, 3.6, -0.2, 1); put(k, personGeo(203), -3.8, h, 0.6, 0.9, 1);
  g.add(k.mesh());
  const sign = planeWith(signTex(), 1.1, 1.36, { transparent: true, side: THREE.DoubleSide });
  sign.position.set(-2.7, h + 1.55, 2.25); sign.rotation.y = 0.4; g.add(sign);
  const earth = mesh(new THREE.SphereGeometry(0.5, 20, 14), lambert('#3f8fd6'));
  earth.position.set(-0.6, h + 1.1, -3); g.add(earth);
  const ek = kit(); ek.add(LO, '#6fcf6a', { p: [0.2, 0.15, 0.35], s: [0.22, 0.18, 0.12] }).add(LO, '#6fcf6a', { p: [-0.3, -0.1, 0.32], s: [0.16, 0.24, 0.12] }).add(LO, '#6fcf6a', { p: [0.1, 0.25, -0.38], s: [0.25, 0.14, 0.1] });
  earth.add(mesh(ek.geometry(), VC));
  const fk = kit(), flags: THREE.Mesh[] = [];
  ['syria', 'italy', 'spain', 'canada', 'germany', 'china', 'russia'].forEach((id, i) => { const a = Math.PI * (0.62 + i * 0.12); flags.push(flagPole(g, fk, Math.cos(a) * 4.4, h, -Math.sin(a) * 4.4 + 0.4, id)); });
  g.add(fk.mesh());
  const ship = dhow(); ship.scale.setScalar(0.4); ship.position.set(2.6, h + 0.05, -1.4); ship.rotation.y = -0.5; g.add(ship);
  const beam = glow('#fff3a0', 1.6, 0.8); beam.position.set(-3.3, h + 3.75, -1.9); g.add(beam);
  g.userData = { height: h + 4.8, flags, ship, earth, beam, baseY: h };
  return g;
}

// ---------- Unit 2 · Bosra's theatre, black basalt ----------
export function theatre() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 1, { r: 5.4, top: '#e9e4dc' });
  // the cavea: tiers of basalt seats in a half circle, rising to the back
  for (let i = 0; i < 5; i++) {
    const r0 = 2.2 + i * 0.6;
    k.add(new THREE.CylinderGeometry(r0 + 0.6, r0 + 0.6, 0.36 + i * 0.36, 28, 1, false, Math.PI / 2, Math.PI), i % 2 ? PAL.basalt : PAL.basaltL, { p: [0, h + (0.36 + i * 0.36) / 2, -0.6] });
  }
  // arches round the top
  for (let i = 0; i < 9; i++) { const a = Math.PI / 2 + (i + 0.5) * (Math.PI / 9); k.add('box', PAL.basalt, { p: [Math.sin(a) * 4.9, h + 2.15, -0.6 + Math.cos(a) * 4.9], r: [0, a, 0], s: [0.22, 0.6, 0.3] }); }
  // the stage at the front, with columns and red curtains
  k.add(roundBox(5.2, 0.5, 1.6, 0.06), '#5a5560', { p: [0, h + 0.25, 2.6] });
  k.add(roundBox(5.4, 0.08, 1.7, 0.03), '#a8703f', { p: [0, h + 0.53, 2.6] });
  for (const x of [-2.4, -1.2, 1.2, 2.4]) k.add('cyl', '#efe8dc', { p: [x, h + 1.45, 2.0], s: [0.13, 1.8, 0.13] });
  k.add('box', '#efe8dc', { p: [0, h + 2.42, 2.0], s: [5.2, 0.2, 0.3] });
  put(k, personGeo(211), 0.4, h + 0.55, 2.6, 0, 0.9); put(k, personGeo(212), -0.6, h + 0.55, 2.8, 0.4, 0.9);
  for (let i = 0; i < 5; i++) put(k, personGeo(213 + i, { sit: true }), -1.6 + i * 0.8, h + 0.36 * 2, -0.6 + 2.5, Math.PI, 0.75);
  g.add(k.mesh());
  const curtains = [];
  for (const sx of [-1, 1]) {
    const c = mesh(new THREE.BoxGeometry(1.1, 1.9, 0.12), lambert('#d0344c'));
    c.geometry.translate(-sx * 0.55, -0.95, 0);
    c.position.set(sx * 2.55, h + 2.32, 2.05); g.add(c); curtains.push(c);
  }
  const masks = new THREE.Group();
  const mk = kit(); mk.add(LO, '#ffd23f', { p: [-0.32, 0, 0], s: [0.3, 0.36, 0.1] }).add(LO, '#9fd0ff', { p: [0.32, 0, 0], s: [0.3, 0.36, 0.1] });
  masks.add(mesh(mk.geometry(), VC)); masks.position.set(0, h + 3.1, 2.0); g.add(masks);
  const spots = [glow('#fff4c0', 1.8, 0.6), glow('#ffd0e0', 1.6, 0.5)];
  spots[0].position.set(-1, h + 1.3, 2.7); spots[1].position.set(1, h + 1.3, 2.7); g.add(...spots);
  g.userData = { height: h + 3.6, curtains, masks, spots };
  return g;
}

// ---------- Unit 3 · The Big Blue: a pool with a whale, a glass tank, a dive boat ----------
function fishGeo(color: string) { const k = kit(); k.add(LO, color, { s: [0.22, 0.14, 0.08] }).add('cone4', color, { p: [-0.28, 0, 0], r: [0, 0, Math.PI / 2], s: [0.12, 0.16, 0.05] }); return k.geometry(); }
export function aquarium() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 1, { r: 5.2 });
  k.add(new THREE.CylinderGeometry(2.4, 2.5, 0.2, 32), '#efe8dc', { p: [1.2, h + 0.1, 1.6] });
  k.add(new THREE.CylinderGeometry(2.2, 2.2, 0.06, 32), '#2f9fe0', { p: [1.2, h + 0.22, 1.6] });
  // the tank's base and lid
  k.add(new THREE.CylinderGeometry(1.75, 1.85, 0.4, 28), '#2f6fd0', { p: [-1.8, h + 0.2, -1.6] });
  k.add(new THREE.CylinderGeometry(1.8, 1.75, 0.25, 28), '#2f6fd0', { p: [-1.8, h + 3.15, -1.6] });
  for (const [x, z] of [[-2.4, -1.2], [-1.2, -2]]) k.add(LO, '#f28c3a', { p: [x, h + 0.55, z], s: [0.18, 0.12, 0.18] });
  // a dive boat at the side, with the diver-down flag
  k.add(roundBox(2.2, 0.5, 0.9, 0.2), '#fbfaf5', { p: [3.2, h + 0.3, -1.6], r: [0, 0.9, 0] });
  k.add('box', '#2f6fd0', { p: [3.2, h + 0.4, -1.6], r: [0, 0.9, 0], s: [2.24, 0.12, 0.94] });
  k.add('cyl', '#8a8a8a', { p: [3.4, h + 1.1, -1.9], s: [0.04, 1.2, 0.04] });
  put(k, personGeo(221), -3.8, h, 1.4, 0.6, 1); put(k, personGeo(222, { prop: 'book' }), -0.6, h, 3.6, 0.2, 1);
  g.add(k.mesh());
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshLambertMaterial({ map: canvasTex('diveflag', 32, 24, (gg, w, hh) => { gg.fillStyle = '#e8453c'; gg.fillRect(0, 0, w, hh); gg.strokeStyle = '#fff'; gg.lineWidth = 5; gg.beginPath(); gg.moveTo(0, 0); gg.lineTo(w, hh); gg.stroke(); }), side: THREE.DoubleSide }));
  flag.position.set(3.65, h + 1.55, -1.9); g.add(flag);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 2.7, 28, 1, true), new THREE.MeshPhongMaterial({ color: '#9fe2ff', transparent: true, opacity: 0.32, shininess: 90, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.set(-1.8, h + 1.75, -1.6); g.add(glass);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 2.3, 24), new THREE.MeshLambertMaterial({ color: '#3fa8e8', transparent: true, opacity: 0.35, depthWrite: false }));
  water.position.copy(glass.position); water.position.y -= 0.12; g.add(water);
  const school = new THREE.Group();
  ['#ffd23f', '#f28c3a', '#ec79a8', '#6fe6dc', '#ffffff', '#ffd23f'].forEach((c, i) => { const f = new THREE.Mesh(fishGeo(c), VC); const a = (i / 6) * Math.PI * 2; f.position.set(Math.cos(a) * 1.1, (i % 3) * 0.55 - 0.5, Math.sin(a) * 1.1); f.rotation.y = -a - Math.PI / 2; school.add(f); });
  school.position.copy(glass.position); g.add(school);
  // the whale, leaping out of the pool
  const whale = new THREE.Group();
  const wk = kit();
  wk.add(LO, '#3f6fc8', { s: [1.1, 0.5, 0.48] }); wk.add(LO, '#e8f2ff', { p: [0.15, -0.2, 0], s: [0.85, 0.3, 0.36] });
  wk.add('cone4', '#3f6fc8', { p: [-1.15, 0.05, 0], r: [0, 0, Math.PI / 2], s: [0.22, 0.6, 0.18] });
  wk.add(LO, '#3f6fc8', { p: [-1.5, 0.12, 0], s: [0.12, 0.08, 0.5] });
  wk.add(LO, '#3f6fc8', { p: [0.2, -0.3, 0.42], r: [0.6, 0, 0], s: [0.3, 0.06, 0.16] }).add(LO, '#3f6fc8', { p: [0.2, -0.3, -0.42], r: [-0.6, 0, 0], s: [0.3, 0.06, 0.16] });
  wk.eyes({ x: 0.0, y: 0.05, z: 0.45, r: 0.07 }); // eyes on the sides
  whale.add(mesh(wk.geometry(), VC)); whale.position.set(1.2, h + 0.6, 1.6); g.add(whale);
  const spout = glow('#e8f8ff', 1.2, 0.7); spout.position.set(1.6, h + 1.6, 1.6); g.add(spout);
  g.userData = { height: h + 3.8, school, whale, spout, flag, baseY: h };
  return g;
}

// ---------- Units 4–5 · The house of arts and TV ----------
export function arts() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 1, { w: 9.4, d: 7.6 });
  // the gallery: white, with columns and a pediment
  k.add(roundBox(4.4, 2.4, 3, 0.06), PAL.white, { p: [-2.2, h + 1.2, -1.6] });
  for (let i = 0; i < 5; i++) k.add('cyl', '#f3efe6', { p: [-4.0 + i * 0.9, h + 1.15, 0.05], s: [0.12, 2.3, 0.12] });
  k.add(new THREE.CylinderGeometry(0.01, 2.8, 0.8, 4, 1), '#efe8dc', { p: [-2.2, h + 2.75, -0.9], r: [0, Math.PI / 4, 0], s: [1, 1, 0.55] });
  k.add('box', '#efe8dc', { p: [-2.2, h + 2.38, -0.1], s: [4.6, 0.16, 0.5] });
  // a statue on a pedestal and an easel
  k.add(roundBox(0.7, 0.8, 0.7, 0.04), '#e9e1d0', { p: [-3.4, h + 0.4, 2.2] });
  put(k, personGeo(231), -3.4, h + 0.8, 2.2, 0.3, 1.1);
  k.add('box', PAL.wood, { p: [-1.2, h + 0.7, 2.6], r: [0.15, 0, 0], s: [0.06, 1.4, 0.06] });
  k.add('box', '#fffaf0', { p: [-1.2, h + 1.05, 2.66], r: [0.15, 0, 0], s: [0.8, 0.6, 0.04] });
  // the TV studio: a building with a giant screen and an antenna
  k.add(roundBox(3.6, 2.6, 2.8, 0.08), '#dcefff', { p: [2.6, h + 1.3, -1.7] });
  k.add(roundBox(3.2, 2.1, 0.3, 0.06), '#3b3640', { p: [2.6, h + 1.6, -0.25] });
  k.add('cyl', '#8a8a8a', { p: [2.0, h + 3.2, -1.7], r: [0, 0, 0.4], s: [0.04, 1.4, 0.04] }).add('cyl', '#8a8a8a', { p: [3.2, h + 3.2, -1.7], r: [0, 0, -0.4], s: [0.04, 1.4, 0.04] });
  k.add(LO, '#e8453c', { p: [2.6, h + 2.78, -1.7], s: 0.12 });
  // a camera on its tripod
  for (const a of [0, 2.1, 4.2]) k.add('cyl', '#3b3640', { p: [2.4 + Math.cos(a) * 0.2, h + 0.5, 2.0 + Math.sin(a) * 0.2], r: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3], s: [0.03, 1, 0.03] });
  k.add('box', '#3b3640', { p: [2.4, h + 1.1, 2.0], s: [0.5, 0.35, 0.6] }).add('cyl', '#3b3640', { p: [2.4, h + 1.1, 1.6], r: [Math.PI / 2, 0, 0], s: [0.12, 0.3, 0.12] });
  put(k, personGeo(232), 3.2, h, 2.4, Math.PI * 0.9, 1); put(k, personGeo(233, { prop: 'book' }), 0.6, h, 3.2, 0, 1);
  g.add(k.mesh());
  [0, 1, 2].forEach(i => { const p = planeWith(paintingTex(i), 0.8, 1.0); p.position.set(-3.5 + i * 1.3, h + 1.35, -0.08); g.add(p); });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.8), new THREE.MeshBasicMaterial({ map: screenTex(0) }));
  screen.position.set(2.6, h + 1.6, -0.09); g.add(screen);
  const canvasPic = planeWith(paintingTex(1), 0.72, 0.52); canvasPic.position.set(-1.2, h + 1.06, 2.69); canvasPic.rotation.x = -0.15; g.add(canvasPic);
  g.userData = { height: h + 3.6, screen, screens: [0, 1, 2, 3].map(screenTex) };
  return g;
}

// ---------- Unit 6 · The hospital ----------
export function hospital() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { w: 9, d: 7.4 });
  k.add(roundBox(6.2, 3.2, 3, 0.08), PAL.white, { p: [-0.6, h + 1.6, -1.8] });
  for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) k.add('box', '#7fc4f0', { p: [-3.1 + i * 1, h + 0.95 + r * 1.3, -0.28], s: [0.55, 0.6, 0.04] });
  k.add('box', '#7fc4f0', { p: [-0.6, h + 0.6, -0.27], s: [1.2, 1.1, 0.04] });
  k.add('box', PAL.white, { p: [-0.6, h + 1.3, 0.2], s: [2, 0.12, 1.1] });
  k.add(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 24), '#d6dde4', { p: [0.8, h + 3.25, -1.8] });
  k.add('box', '#fbfaf5', { p: [0.8, h + 3.3, -1.8], s: [0.16, 0.02, 0.9] }).add('box', '#fbfaf5', { p: [0.55, h + 3.3, -1.8], s: [0.12, 0.02, 0.9] });
  k.add('box', '#fbfaf5', { p: [0.8, h + 3.3, -1.8], s: [0.6, 0.02, 0.14] });
  // the red cross
  k.add('box', '#e8453c', { p: [-2.6, h + 3.6, -1.6], s: [0.9, 0.3, 0.12] }).add('box', '#e8453c', { p: [-2.6, h + 3.6, -1.6], s: [0.3, 0.9, 0.12] });
  // the ambulance
  k.add(roundBox(2.2, 1.1, 1.1, 0.12), PAL.white, { p: [2.6, h + 0.75, 1.9] });
  k.add('box', '#e8453c', { p: [2.6, h + 0.75, 1.9], s: [2.24, 0.16, 1.14] });
  k.add('box', '#7fc4f0', { p: [3.55, h + 1.0, 1.9], s: [0.3, 0.4, 0.9] });
  for (const [x, z] of [[1.9, 1.35], [3.3, 1.35], [1.9, 2.45], [3.3, 2.45]]) k.add('cyl', '#2d2622', { p: [x, h + 0.25, z], r: [Math.PI / 2, 0, 0], s: [0.24, 0.16, 0.24] });
  k.add('box', '#e8453c', { p: [2.0, h + 1.0, 2.46], s: [0.12, 0.4, 0.02] }).add('box', '#e8453c', { p: [2.0, h + 1.0, 2.46], s: [0.4, 0.12, 0.02] });
  put(k, personGeo(241), -2.4, h, 2.2, 0.3, 1); put(k, personGeo(242, { sit: true }), -1.2, h, 2.6, 0, 0.9); put(k, personGeo(243), 0.4, h, 2.8, -0.3, 1);
  g.add(k.mesh());
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.24), lambert('#3f8fd6', { emissive: '#1f4fd0' }));
  light.position.set(2.2, h + 1.38, 1.9); g.add(light);
  const flash = glow('#6fb0ff', 1.4, 0.7); flash.position.copy(light.position); g.add(flash);
  g.userData = { height: h + 4, light, flash };
  return g;
}

// ---------- Units 7–8 · The park ----------
function bikeRider(seed: number) {
  const g = new THREE.Group(), k = kit();
  for (const x of [-0.32, 0.32]) k.add('torus', '#3b3640', { p: [x, 0.24, 0], s: [0.24, 0.24, 0.5] });
  k.add('box', '#e8453c', { p: [0, 0.4, 0], r: [0, 0, 0.2], s: [0.6, 0.05, 0.05] }).add('box', '#e8453c', { p: [0.05, 0.5, 0], r: [0, 0, 1.2], s: [0.4, 0.05, 0.05] });
  g.add(mesh(k.geometry(), VC));
  const rider = new THREE.Mesh(personGeo(seed, { sit: true }), VC); rider.position.set(-0.1, 0.18, 0); rider.rotation.y = Math.PI / 2; rider.scale.setScalar(0.85); rider.castShadow = true;
  g.add(rider);
  return g;
}
export function park() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { r: 5.3, top: '#bfe59a' });
  k.add(new THREE.TorusGeometry(3.3, 0.32, 6, 48), '#f3e2bd', { p: [0, h + 0.02, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.12] });
  // a fountain in the middle
  k.add(new THREE.CylinderGeometry(1.0, 1.1, 0.4, 20), '#efe8dc', { p: [0, h + 0.2, 0] });
  k.add(new THREE.CylinderGeometry(0.88, 0.88, 0.06, 20), '#5fc0f0', { p: [0, h + 0.38, 0] });
  k.add('cyl', '#efe8dc', { p: [0, h + 0.75, 0], s: [0.12, 0.8, 0.12] });
  // swings
  for (const x of [-4.2, -2.6]) { k.add('box', '#e8453c', { p: [x, h + 1.0, -2.6], r: [0, 0, x < -3 ? 0.2 : -0.2], s: [0.08, 2.0, 0.08] }); }
  k.add('box', '#e8453c', { p: [-3.4, h + 1.95, -2.6], s: [1.8, 0.08, 0.08] });
  // benches and trees
  for (const [x, z, ry] of [[3.6, -2.2, -0.8], [2.4, 3.6, 0.4]]) { k.add('box', PAL.wood, { p: [x, h + 0.4, z], r: [0, ry, 0], s: [1.2, 0.08, 0.4] }); k.add('box', PAL.wood, { p: [x, h + 0.62, z - 0.2], r: [0, ry, 0], s: [1.2, 0.4, 0.06] }); }
  put(k, treeGeo(0, 41), -4, h, 1.4, 0, 0.8); put(k, treeGeo(2, 42), 4.2, h, 0.6, 0, 0.75); put(k, treeGeo(3, 43), 0.2, h, -4.2, 0, 0.8);
  put(k, personGeo(251, { sit: true }), 3.6, h + 0.2, -2.0, -0.8 + Math.PI, 0.9); put(k, personGeo(252), -1.4, h, 2.4, 0.4, 0.95); put(k, personGeo(253), -1.9, h, 2.6, 0.9, 1.1);
  g.add(k.mesh());
  const swing = new THREE.Group();
  const sk = kit(); sk.add('box', '#9a6a3c', { p: [0, -0.7, 0], s: [0.02, 1.4, 0.02] }).add('box', '#f2c14e', { p: [0, -1.4, 0], s: [0.5, 0.06, 0.3] });
  swing.add(mesh(sk.geometry(), VC));
  const kid = new THREE.Mesh(personGeo(254, { sit: true }), VC); kid.scale.setScalar(0.75); kid.position.set(0, -1.75, -0.1); swing.add(kid);
  swing.position.set(-3.4, h + 1.95, -2.6); g.add(swing);
  const bike = bikeRider(255); g.add(bike);
  const jogger = new THREE.Mesh(personGeo(256), VC); jogger.castShadow = true; g.add(jogger);
  const spray = glow('#d8f4ff', 1.3, 0.6); spray.position.set(0, h + 1.3, 0); g.add(spray);
  g.userData = { height: h + 2.6, swing, bike, jogger, spray, baseY: h };
  return g;
}

// ---------- Units 9–10 · Grandpa's farm and the recycling corner ----------
function cowInto(k: Kit, x: number, y: number, z: number, ry: number) {
  const c = Math.cos(ry), s = Math.sin(ry), P = (lx: number, ly: number, lz: number) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  k.add(roundBox(0.5, 0.42, 0.9, 0.12), '#fbfaf5', { p: P(0, 0.62, 0), r: [0, ry, 0] });
  k.add(LO, '#3b2414', { p: P(0.18, 0.7, 0.1), s: 0.16 }).add(LO, '#3b2414', { p: P(-0.2, 0.62, -0.25), s: 0.13 });
  k.add(roundBox(0.32, 0.3, 0.34, 0.08), '#fbfaf5', { p: P(0, 0.86, 0.55), r: [0, ry, 0] });
  k.add(roundBox(0.3, 0.14, 0.12, 0.05), '#f6b3b3', { p: P(0, 0.78, 0.72), r: [0, ry, 0] });
  for (const [lx, lz] of [[-0.16, 0.3], [0.16, 0.3], [-0.16, -0.3], [0.16, -0.3]]) k.add('cyl', '#fbfaf5', { p: P(lx, 0.22, lz), s: [0.05, 0.44, 0.05] });
}
function sheepInto(k: Kit, x: number, y: number, z: number) {
  for (let i = 0; i < 5; i++) k.add(LO, '#fbfaf5', { p: [x + (i - 2) * 0.12, y + 0.42 + (i % 2) * 0.06, z], s: 0.2 });
  k.add(LO, '#3b3640', { p: [x + 0.36, y + 0.48, z], s: [0.12, 0.12, 0.1] });
  for (const [lx, lz] of [[-0.15, 0.1], [0.15, 0.1], [-0.15, -0.1], [0.15, -0.1]]) k.add('cyl', '#3b3640', { p: [x + lx, y + 0.16, z + lz], s: [0.03, 0.32, 0.03] });
}
export function farm() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 2, { w: 9.6, d: 8, top: '#cfe8a0' });
  // fields: furrows and green rows
  for (let i = 0; i < 5; i++) { k.add('box', '#8a5a34', { p: [2.6, h + 0.05, -3.2 + i * 0.5], s: [3.6, 0.08, 0.3] }); k.add('box', '#5fbf5a', { p: [2.6, h + 0.14, -3.2 + i * 0.5], s: [3.4, 0.1, 0.14] }); }
  // a fence
  for (let i = 0; i < 7; i++) k.add('box', '#fbfaf5', { p: [-4.4 + i * 0.6, h + 0.3, 0.6], s: [0.08, 0.6, 0.08] });
  k.add('box', '#fbfaf5', { p: [-2.6, h + 0.42, 0.6], s: [3.8, 0.06, 0.06] }).add('box', '#fbfaf5', { p: [-2.6, h + 0.22, 0.6], s: [3.8, 0.06, 0.06] });
  cowInto(k, -3.2, h, 2.0, 0.5); cowInto(k, -1.6, h, 2.6, -0.4); sheepInto(k, -3.8, h, 3.4); sheepInto(k, -0.6, h, 3.6);
  for (const [x, z] of [[0.6, 2.2], [0.9, 2.5], [0.4, 2.7]]) k.add(LO, '#fbfaf5', { p: [x, h + 0.18, z], s: [0.12, 0.12, 0.15] }).add('cone4', '#e8453c', { p: [x, h + 0.3, z + 0.05], s: [0.03, 0.06, 0.03] });
  // the recycling corner: blue, green and yellow bins
  ([['#2f6fd0', 2.2], ['#23a26a', 3.0], ['#f2c14e', 3.8]] as const).forEach(([c, x]) => { k.add(roundBox(0.66, 0.9, 0.66, 0.08), c, { p: [x, h + 0.45, 2.6] }); k.add(roundBox(0.72, 0.1, 0.72, 0.04), c, { p: [x, h + 0.94, 2.6] }); k.add('torus', '#fbfaf5', { p: [x, h + 0.5, 2.94], s: [0.16, 0.16, 0.3] }); });
  k.add('hemi', '#6b4a2a', { p: [4.3, h, 1.2], s: [0.6, 0.45, 0.6] });
  put(k, personGeo(261), 1.2, h, 3.4, Math.PI * 0.1, 1); put(k, personGeo(262), 1.8, h, 1.2, -0.6, 0.9);
  g.add(k.mesh());
  const barnM = (() => { const m = farmBarn(); m.scale.setScalar(0.45); m.position.set(-2.4, h, -2.2); return m; })();
  g.add(barnM);
  const mill = windmill(); mill.scale.setScalar(0.5); mill.position.set(4.2, h, -1.0); mill.rotation.y = -0.5; g.add(mill);
  const tr = tractor(); tr.scale.setScalar(0.85); tr.position.set(0.7, h, -1.2); tr.rotation.y = 0.4; g.add(tr);
  g.userData = { height: h + 3.6, blades: mill.userData.blades, tractor: tr, baseY: h };
  return g;
}

// ---------- Units 11–12 · The Sunday souq and its kitchen café ----------
export function souq() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 3, { w: 9.2, d: 7.6, top: '#f1e6cf' });
  // a stone arcade at the back
  for (let i = 0; i < 6; i++) {
    const x = -3.6 + i * 1.45;
    k.add('box', '#e8d9b8', { p: [x - 0.6, h + 1.0, -2.8], s: [0.25, 2, 0.5] });
    k.add(new THREE.TorusGeometry(0.6, 0.13, 6, 14, Math.PI), '#e8d9b8', { p: [x, h + 2.0, -2.8], s: [1, 1, 1.9] });
  }
  k.add('box', '#e8d9b8', { p: [0.0, h + 2.7, -2.8], s: [9, 0.4, 0.6] });
  k.add('box', '#e8d9b8', { p: [5.1, h + 1.0, -2.8], s: [0.25, 2, 0.5] });
  // stalls with fruit and goods
  const stall = (x: number, z: number, c: string, fruit: string[]): [number, number, string] => {
    k.add('box', PAL.wood, { p: [x, h + 0.45, z], s: [1.4, 0.7, 0.8] });
    for (const sx of [-0.6, 0.6]) k.add('cyl', '#8a5a34', { p: [x + sx, h + 1.1, z + 0.35], s: [0.04, 1.4, 0.04] });
    for (let i = 0; i < 6; i++) k.add(LO, fruit[i % fruit.length], { p: [x - 0.45 + (i % 3) * 0.45, h + 0.88, z - 0.15 + Math.floor(i / 3) * 0.3], s: 0.14 });
    return [x, z, c];
  };
  const awnings = [stall(-3.2, -1.2, '#e8453c', ['#ff9a1f', '#ffd23f']), stall(-1.3, -1.4, '#2f6fd0', ['#e8453c', '#5fbf5a']), stall(0.6, -1.2, '#23a26a', ['#8a55d0', '#f2c14e'])];
  // the café: tables, an umbrella and a pizza oven
  k.add(new THREE.SphereGeometry(0.85, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#c9704a', { p: [3.4, h + 0.45, -0.9] });
  k.add('box', '#c9704a', { p: [3.4, h + 0.22, -0.9], s: [1.8, 0.45, 1.8] });
  k.add('box', '#3b2414', { p: [3.4, h + 0.7, -0.08], s: [0.5, 0.36, 0.06] });
  k.add(LO, '#ff9a1f', { p: [3.4, h + 0.65, -0.05], s: [0.18, 0.12, 0.04] });
  for (const [x, z] of [[2.2, 2.0], [3.8, 2.4]]) { k.add('cyl', '#fbfaf5', { p: [x, h + 0.5, z], s: [0.5, 0.06, 0.5] }).add('cyl', '#8a8a8a', { p: [x, h + 0.25, z], s: [0.05, 0.5, 0.05] }); k.add('cyl', '#e8453c', { p: [x + 0.15, h + 0.58, z], s: [0.14, 0.06, 0.14] }); }
  k.add('cyl', '#8a8a8a', { p: [3.0, h + 1.1, 2.2], s: [0.04, 2.2, 0.04] });
  put(k, personGeo(271), -2.2, h, 0.4, 0, 1); put(k, personGeo(272, { prop: 'book' }), -0.2, h, 1.6, 0.4, 1); put(k, personGeo(273, { sit: true }), 2.2, h, 2.6, Math.PI, 0.85); put(k, personGeo(274), -3.6, h, 2.6, 0.6, 1);
  g.add(k.mesh());
  const tents = awnings.map(([x, z, c]) => {
    const m = mesh(new THREE.BoxGeometry(1.6, 0.06, 1.1), lambert(c));
    m.position.set(x, h + 1.8, z + 0.15); m.rotation.x = 0.18; g.add(m);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.07, 0.25), lambert('#fbfaf5')); stripe.position.y = 0.002; m.add(stripe);
    return m;
  });
  const umbrella = mesh(new THREE.ConeGeometry(1.2, 0.5, 12), lambert('#ffd23f')); umbrella.position.set(3.0, h + 2.3, 2.2); g.add(umbrella);
  const lanterns = [-2.8, -0.6, 1.6, 3.8].map(x => { const l = glow('#ffcf6a', 0.9, 0.7); l.position.set(x, h + 2.1, -2.3); g.add(l); return l; });
  const lk = kit(); [-2.8, -0.6, 1.6, 3.8].forEach(x => lk.add('cyl', '#c9963a', { p: [x, h + 2.1, -2.3], s: [0.12, 0.26, 0.12] }));
  g.add(lk.mesh());
  const fire = glow('#ff9a3f', 0.9, 0.8); fire.position.set(3.4, h + 0.7, 0); g.add(fire);
  g.userData = { height: h + 3.2, tents, lanterns, fire };
  return g;
}

// ---------- Units 13–14 · The garden of feelings, the river and the forest ----------
export function garden() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 3, { r: 5.4, top: '#c7e8a2' });
  // the river across, with a little bridge
  k.add('box', '#4fb8ea', { p: [0, h + 0.05, 0.6], r: [0, 0.35, 0], s: [10.2, 0.06, 1.3] });
  k.add(new THREE.TorusGeometry(0.9, 0.18, 6, 14, Math.PI), PAL.wood, { p: [-0.5, h + 0.05, 0.6], r: [0, 0.35 + Math.PI / 2, 0], s: [1, 0.55, 3.2] });
  // the forest at the back
  for (const [x, z, s] of [[-3.2, -2.6, 1], [-1.8, -3.6, 1.15], [-0.4, -2.8, 0.9], [-3.9, -0.8, 0.85], [0.8, -3.9, 1]]) { k.add('cyl', '#8a5a34', { p: [x, h + 0.4 * s, z], s: [0.12 * s, 0.8 * s, 0.12 * s] }); for (let i = 0; i < 3; i++) k.add('cone', i % 2 ? '#2f8a4f' : '#3f9d5c', { p: [x, h + (0.9 + i * 0.45) * s, z], s: [(0.85 - i * 0.2) * s, 0.8 * s, (0.85 - i * 0.2) * s] }); }
  // flowerbeds
  for (let i = 0; i < 18; i++) { const a = i * 0.7, rr = 2.6 + (i % 3) * 0.4; const x = 1.2 + Math.cos(a) * 1.2, z = 2.6 + Math.sin(a) * 0.9; k.add(LO, ['#ec79a8', '#ffd23f', '#ffffff', '#e8453c', '#8a63c9'][i % 5], { p: [x + (rr - 2.6), h + 0.2, z], s: 0.13 }); }
  k.add('hemi', '#5fae4a', { p: [1.6, h, 2.7], s: [1.5, 0.22, 0.9] });
  // a solar panel and the posts of the three faces
  k.add('box', '#8a8a8a', { p: [3.6, h + 0.5, -1.6], s: [0.08, 1, 0.08] });
  k.add('box', '#1f3a6a', { p: [3.6, h + 1.05, -1.6], r: [-0.6, -0.4, 0], s: [1.5, 0.06, 1] });
  for (let i = 0; i < 3; i++) k.add('box', '#7fc4f0', { p: [3.6, h + 1.08, -1.6], r: [-0.6, -0.4, 0], s: [1.48, 0.065, 0.02 + (i === 1 ? 0 : 0)] });
  for (const x of [-3.4, -2.2, -1.0]) k.add('cyl', '#efe8dc', { p: [x, h + 0.5, 2.9], s: [0.08, 1, 0.08] });
  k.add('cyl', '#efe8dc', { p: [2.4, h + 1.0, -3.2], s: [0.08, 2.0, 0.08] });
  put(k, personGeo(281), 0.8, h, 3.6, 0.2, 1); put(k, personGeo(282, { sit: true }), 3.2, h, 1.4, -1.2, 0.9);
  g.add(k.mesh());
  const faces = (['happy', 'sad', 'surprised'] as const).map((m, i) => { const f = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshLambertMaterial({ map: faceTex(m) })); f.position.set(-3.4 + i * 1.2, h + 1.25, 2.95); g.add(f); const back = new THREE.Mesh(new THREE.CircleGeometry(0.44, 20), lambert('#3b2414')); back.position.z = -0.01; f.add(back); return f; });
  const rotor = new THREE.Group();
  const rk = kit(); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; rk.add('box', '#fbfaf5', { p: [Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0], r: [0, 0, a], s: [1, 0.1, 0.03] }); }
  rk.add(LO, '#fbfaf5', { s: 0.1 });
  rotor.add(mesh(rk.geometry(), VC)); rotor.position.set(2.4, h + 2.05, -3.05); g.add(rotor);
  const shimmer = glow('#bff0ff', 2.4, 0.35); shimmer.position.set(1.6, h + 0.2, 1.2); g.add(shimmer);
  g.userData = { height: h + 3, faces, rotor, shimmer };
  return g;
}

// ---------- Unit 15 · The school ----------
export function school() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 3, { w: 9.2, d: 7.4 });
  k.add(roundBox(6.6, 2.6, 2.8, 0.08), '#fff1cf', { p: [-0.4, h + 1.3, -1.8] });
  k.add(new THREE.ConeGeometry(4.9, 1.1, 4), PAL.terracotta, { p: [-0.4, h + 3.15, -1.8], r: [0, Math.PI / 4, 0], s: [1, 1, 0.46] });
  for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) if (!(r === 0 && (i === 2 || i === 3))) k.add('box', '#7fc4f0', { p: [-3.2 + i * 1.12, h + 0.8 + r * 1.1, -0.38], s: [0.6, 0.55, 0.04] });
  k.add('box', '#d9774a', { p: [-0.4, h + 0.7, -0.37], s: [1.2, 1.3, 0.05] });
  k.add('cyl', '#fbfaf5', { p: [-0.4, h + 2.1, -0.36], r: [Math.PI / 2, 0, 0], s: [0.38, 0.06, 0.38] });
  // the flag pole and the playground
  k.add('cyl', '#dfe4ea', { p: [3.6, h + 1.6, 0.4], s: [0.05, 3.2, 0.05] });
  k.add(new THREE.TorusGeometry(1.2, 0.05, 4, 32), '#fbfaf5', { p: [1.2, h + 0.03, 2.2], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 6; i++) put(k, personGeo(291 + i), -3.4 + i * 0.95, h, 1.6 + (i % 2) * 0.9, Math.PI * (i % 2 ? 0.2 : -0.1), 0.78);
  k.add('box', PAL.wood, { p: [-3.4, h + 0.7, 2.8], s: [0.06, 1.4, 0.06] }).add('box', PAL.wood, { p: [-2.2, h + 0.7, 2.8], s: [0.06, 1.4, 0.06] });
  g.add(k.mesh());
  const board = planeWith(boardTex(), 1.5, 0.95); board.position.set(-2.8, h + 1.15, 2.84); g.add(board);
  const flagGeo = new THREE.PlaneGeometry(0.9, 0.6, 6, 1); flagGeo.translate(0.45, 0, 0);
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ map: flagTex('syria'), side: THREE.DoubleSide })); flag.position.set(3.64, h + 2.85, 0.4); g.add(flag);
  const hands = new THREE.Group();
  const hk = kit(); hk.add('box', '#3b2414', { p: [0, 0.13, 0], s: [0.04, 0.26, 0.02] }).add('box', '#3b2414', { p: [0.09, 0, 0], s: [0.18, 0.04, 0.02] });
  hands.add(mesh(hk.geometry(), VC)); hands.position.set(-0.4, h + 2.1, -0.32); g.add(hands);
  g.userData = { height: h + 3.8, flag, hands };
  return g;
}

// ---------- Units 16–17 · The clock-tower square and the party hall ----------
export function square() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 4, { r: 5.2, top: '#f3ead6' });
  // the clock tower
  k.add(roundBox(1.6, 5.2, 1.6, 0.06), '#efe2c4', { p: [-1.8, h + 2.6, -1.6] });
  for (let i = 0; i < 4; i++) k.add('box', '#e2cfa4', { p: [-1.8, h + 0.8 + i * 1.4, -1.6], s: [1.7, 0.12, 1.7] });
  k.add(roundBox(2, 1.6, 2, 0.06), '#efe2c4', { p: [-1.8, h + 6.0, -1.6] });
  k.add(new THREE.ConeGeometry(1.5, 1.4, 4), '#2f6fd0', { p: [-1.8, h + 7.5, -1.6], r: [0, Math.PI / 4, 0] });
  k.add(LO, PAL.gold, { p: [-1.8, h + 8.3, -1.6], s: 0.14 });
  // the party hall: a pavilion with a striped roof
  for (const [x, z] of [[1.2, -1.2], [3.8, -1.2], [1.2, 1.2], [3.8, 1.2]]) k.add('cyl', '#fbfaf5', { p: [x, h + 1.1, z - 0.6], s: [0.1, 2.2, 0.1] });
  for (let i = 0; i < 8; i++) k.add(new THREE.CylinderGeometry(0.01, 2.1, 1.1, 8, 1, false, (i / 8) * Math.PI * 2, Math.PI / 4), i % 2 ? '#ec79a8' : '#fbfaf5', { p: [2.5, h + 2.75, -0.6] });
  k.add('cyl', '#fbfaf5', { p: [2.5, h + 0.45, -0.6], s: [0.7, 0.06, 0.7] }).add('cyl', '#8a5a34', { p: [2.5, h + 0.22, -0.6], s: [0.08, 0.45, 0.08] });
  k.add('cyl', '#fff1f6', { p: [2.5, h + 0.62, -0.6], s: [0.32, 0.28, 0.32] }).add('cyl', '#ec79a8', { p: [2.5, h + 0.8, -0.6], s: [0.33, 0.06, 0.33] });
  for (let i = 0; i < 3; i++) k.add('cyl', '#fbfaf5', { p: [2.4 + i * 0.1, h + 0.95, -0.6], s: [0.02, 0.18, 0.02] });
  for (let i = 0; i < 5; i++) put(k, personGeo(301 + i), 1.2 + i * 0.7, h, 1.8 + (i % 2) * 0.5, Math.PI + (i - 2) * 0.2, 0.9);
  put(k, personGeo(306, { prop: 'book' }), -3.6, h, 1.6, 0.6, 1);
  g.add(k.mesh());
  g.add(bunting([-3.6, h, 3.4], [0.6, h, 3.6], 7));
  const faces = [];
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const f = new THREE.Mesh(new THREE.CircleGeometry(0.66, 24), new THREE.MeshLambertMaterial({ map: clockTex() })); f.position.set(-1.8 + Math.sin(a) * 1.02, h + 6.0, -1.6 + Math.cos(a) * 1.02); f.rotation.y = a; g.add(f); faces.push(f); }
  const hands = faces.map(f => { const hh = new THREE.Group(); const hk = kit(); hk.add('box', '#3b2414', { p: [0, 0.22, 0], s: [0.06, 0.44, 0.02] }); const hour = mesh(hk.geometry(), VC); const mk2 = kit(); mk2.add('box', '#3b2414', { p: [0, 0.3, 0], s: [0.04, 0.6, 0.02] }); const min = mesh(mk2.geometry(), VC); min.position.z = 0.02; hh.add(hour, min); hh.position.copy(f.position); hh.rotation.y = f.rotation.y; hh.translateZ(0.02); g.add(hh); return { hour, min }; });
  const hop = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.7), new THREE.MeshLambertMaterial({ map: hopTex(), transparent: true }));
  hop.rotation.x = -Math.PI / 2; hop.rotation.z = 0.3; hop.position.set(-3.6, h + 0.07, -0.2); g.add(hop);
  const balloons: THREE.Group[] = [];
  ['#e8453c', '#ffd23f', '#2f6fd0', '#23a26a', '#ec79a8', '#8a55d0'].forEach((c, i) => {
    const b = new THREE.Group();
    const m = mesh(new THREE.SphereGeometry(0.28, 12, 10), lambert(c)); m.scale.y = 1.2; b.add(m);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 4), lambert('#fbfaf5')); s.position.y = -0.9; b.add(s);
    b.position.set(i < 3 ? 1.2 : 3.8, h + 3.0 + (i % 3) * 0.35, (i % 3) - 1.6 + (i < 3 ? 0 : 0.2));
    b.userData.y = b.position.y; g.add(b); balloons.push(b);
  });
  g.userData = { height: h + 8.6, hands, balloons };
  return g;
}

// ---------- Units 18–20 · The hill of stars: tech lab, holiday camp, observatory ----------
export function space() {
  const g = new THREE.Group(), k = kit();
  const h = plinth(k, 4, { r: 6.3, top: '#eef0f8' });
  // the observatory: a white drum and dome with a slit
  k.add(new THREE.CylinderGeometry(1.7, 1.8, 1.6, 24), PAL.white, { p: [-2.8, h + 0.8, -2.2] });
  k.add('box', '#2f4a7a', { p: [-2.8, h + 0.7, -0.45], s: [0.7, 1.2, 0.06] });
  // the tech lab: a glass-fronted cube with a satellite dish
  k.add(roundBox(2.6, 1.9, 2.0, 0.08), '#dfe7f2', { p: [2.6, h + 0.95, -2.8] });
  k.add('box', '#7fd0ff', { p: [2.6, h + 0.95, -1.78], s: [2.2, 1.3, 0.04] });
  k.add('hemi', '#fbfaf5', { p: [3.4, h + 2.2, -3.2], r: [0.8, 0, 0], s: [0.6, 0.25, 0.6] });
  k.add('cyl', '#8a8a8a', { p: [3.4, h + 2.0, -3.2], s: [0.05, 0.3, 0.05] });
  // a rocket on its pad
  k.add(new THREE.CylinderGeometry(0.8, 0.9, 0.2, 16), '#8a8a8a', { p: [4.6, h + 0.1, 0.4] });
  k.add('cyl', '#fbfaf5', { p: [4.6, h + 1.4, 0.4], s: [0.36, 2.2, 0.36] });
  k.add('cone', '#e8453c', { p: [4.6, h + 2.9, 0.4], s: [0.36, 0.8, 0.36] });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.add('box', '#e8453c', { p: [4.6 + Math.cos(a) * 0.4, h + 0.55, 0.4 + Math.sin(a) * 0.4], r: [0, -a, 0], s: [0.06, 0.7, 0.4] }); }
  k.add('cyl', '#7fd0ff', { p: [4.6, h + 1.9, 0.77], r: [Math.PI / 2, 0, 0], s: [0.14, 0.04, 0.14] });
  // the camp: two tents, a campfire and a zip wire
  k.add(new THREE.ConeGeometry(0.9, 1.3, 4), '#f28c3a', { p: [-4.0, h + 0.65, 2.0], r: [0, 0.4, 0] });
  k.add(new THREE.ConeGeometry(0.8, 1.15, 4), '#23a26a', { p: [-2.4, h + 0.58, 3.4], r: [0, -0.2, 0] });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; k.add(LO, '#9a9a9a', { p: [-2.2 + Math.cos(a) * 0.4, h + 0.08, 1.6 + Math.sin(a) * 0.4], s: 0.12 }); }
  k.add('box', '#8a5a34', { p: [-2.2, h + 0.12, 1.6], r: [0, 0.5, 0], s: [0.6, 0.08, 0.08] }).add('box', '#8a5a34', { p: [-2.2, h + 0.12, 1.6], r: [0, -0.5, 0], s: [0.6, 0.08, 0.08] });
  k.add('cyl', PAL.wood, { p: [-5.2, h + 1.6, -0.4], s: [0.1, 3.2, 0.1] }).add('cyl', PAL.wood, { p: [-0.6, h + 0.9, 4.6], s: [0.1, 1.8, 0.1] });
  put(k, personGeo(311, { sit: true }), -1.6, h, 2.1, -2.2, 0.85); put(k, personGeo(312, { sit: true }), -2.7, h, 1.0, -0.6, 0.85); put(k, personGeo(313, { prop: 'book' }), 0.8, h, 4.2, 0, 1);
  g.add(k.mesh());
  // the zip wire between its two poles
  const A = new THREE.Vector3(-5.2, h + 3.1, -0.4), Bp = new THREE.Vector3(-0.6, h + 1.7, 4.6), dir = Bp.clone().sub(A);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, dir.length(), 5), lambert('#3b3640'));
  wire.position.copy(A).add(Bp).multiplyScalar(0.5);
  wire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  g.add(wire);
  const dome = new THREE.Group();
  const dk = kit(); dk.add('hemi', '#fbfaf5', { s: [1.7, 1.6, 1.7] }); dk.add('box', '#2f4a7a', { p: [0, 0.9, 0.95], r: [-0.6, 0, 0], s: [0.5, 1.4, 0.3] });
  dk.add('cyl', '#8a8a8a', { p: [0, 1.15, 1.2], r: [-0.7, 0, 0], s: [0.16, 1.4, 0.16] });
  dome.add(mesh(dk.geometry(), VC)); dome.position.set(-2.8, h + 1.6, -2.2); g.add(dome);
  // the orrery: the Sun and eight planets turning
  const orrery = new THREE.Group();
  orrery.position.set(1.2, h + 1.6, 0.6);
  const ok = kit(); ok.add('cyl', '#c9963a', { p: [0, -0.8, 0], s: [0.08, 1.6, 0.08] }).add('cyl', '#c9963a', { p: [0, -1.55, 0], s: [0.5, 0.1, 0.5] });
  g.add((() => { const m = mesh(ok.geometry(), VC); m.position.copy(orrery.position); return m; })());
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), new THREE.MeshLambertMaterial({ color: '#ffc93c', emissive: '#ff9a1f', emissiveIntensity: 0.8 }));
  orrery.add(sun);
  const sunGlow = glow('#ffd84a', 2.2, 0.8); orrery.add(sunGlow);
  const PL: [string, number, number][] = [['#b3aca2', 0.07, 0.7], ['#f0cf86', 0.1, 0.95], ['#3f8fd6', 0.11, 1.2], ['#e0663e', 0.09, 1.45], ['#e2b07a', 0.2, 1.8], ['#f2d68a', 0.17, 2.2], ['#a8e4ec', 0.13, 2.55], ['#4f7fe0', 0.13, 2.85]];
  const planets = PL.map(([c, r, d], i) => {
    const arm = new THREE.Group();
    const p = mesh(new THREE.SphereGeometry(r, 12, 8), lambert(c)); p.position.x = d; arm.add(p);
    if (i === 5) { const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.4, r * 2, 20), new THREE.MeshLambertMaterial({ color: '#c9a35a', side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2.4; p.add(ring); }
    arm.rotation.y = i * 1.3;
    orrery.add(arm);
    return { arm, speed: 1.2 / Math.sqrt(d * d * d) };
  });
  const rings = new THREE.Group(); PL.forEach(([, , d]) => { const rg = new THREE.Mesh(new THREE.RingGeometry(d - 0.01, d + 0.01, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, side: THREE.DoubleSide })); rg.rotation.x = -Math.PI / 2; rings.add(rg); }); orrery.add(rings);
  g.add(orrery);
  // the robot, waving
  const robot = new THREE.Group();
  const rk = kit();
  rk.add(roundBox(0.6, 0.7, 0.45, 0.08), '#c9d3dc', { p: [0, 0.75, 0] }); rk.add(roundBox(0.5, 0.4, 0.4, 0.08), '#c9d3dc', { p: [0, 1.32, 0] });
  rk.add('cyl', '#8a8a8a', { p: [0, 1.6, 0], s: [0.02, 0.2, 0.02] }).add(LO, '#e8453c', { p: [0, 1.72, 0], s: 0.06 });
  rk.add(LO, '#3fd0ff', { p: [-0.1, 1.35, 0.2], s: 0.06 }).add(LO, '#3fd0ff', { p: [0.1, 1.35, 0.2], s: 0.06 });
  rk.add('box', '#2f6fd0', { p: [0, 0.8, 0.23], s: [0.3, 0.2, 0.02] });
  for (const x of [-0.15, 0.15]) rk.add('cyl', '#8a8a8a', { p: [x, 0.2, 0], s: [0.07, 0.4, 0.07] });
  rk.add('box', '#8a8a8a', { p: [-0.38, 0.75, 0], s: [0.1, 0.5, 0.1] });
  robot.add(mesh(rk.geometry(), VC));
  const arm = new THREE.Group(); const ak = kit(); ak.add('box', '#8a8a8a', { p: [0, 0.25, 0], s: [0.1, 0.5, 0.1] }).add(LO, '#c9d3dc', { p: [0, 0.52, 0], s: 0.08 }); arm.add(mesh(ak.geometry(), VC)); arm.position.set(0.38, 0.95, 0); robot.add(arm);
  robot.position.set(1.6, h, -1.4); robot.rotation.y = -0.3; g.add(robot);
  const fire = glow('#ff9a3f', 1.1, 0.85); fire.position.set(-2.2, h + 0.35, 1.6); g.add(fire);
  g.userData = { height: h + 3.6, dome, planets, robotArm: arm, fire, sunGlow };
  return g;
}

// ---------- The HELLO sign: five letters and 24 star bulbs ----------
const LETTER_COLORS = ['#e8453c', '#ff9a1f', '#f2c14e', '#23a26a', '#2f6fd0'];
function letterGeo(ch: string) {
  const k = kit(), w = 0.3, H = 1.5, W = 1.0;
  const bar = (x: number, y: number, sx: number, sy: number) => k.add('box', '#ffffff', { p: [x, y, 0], s: [sx, sy, 0.24] });
  if (ch === 'H') { bar(-W / 2 + w / 2, H / 2, w, H); bar(W / 2 - w / 2, H / 2, w, H); bar(0, H / 2, W, w); }
  if (ch === 'E') { bar(-W / 2 + w / 2, H / 2, w, H); bar(0, H - w / 2, W, w); bar(-0.05, H / 2, W - 0.1, w); bar(0, w / 2, W, w); }
  if (ch === 'L') { bar(-W / 2 + w / 2, H / 2, w, H); bar(0, w / 2, W, w); }
  if (ch === 'O') k.add(new THREE.TorusGeometry(0.58, 0.15, 8, 24), '#ffffff', { p: [0, H / 2, 0], s: [0.85, 1.2, 1.6] });
  return k.geometry();
}
export function helloSign(n = 24) {
  const g = new THREE.Group(), k = kit();
  basePlinth(k, '#2f6fd0', { r: 2.8, top: PAL.white, side: PAL.stone, steps: false });
  for (const x of [-2.9, 2.9]) k.add('cyl', '#2f4a7a', { p: [x, 1.6, 0], s: [0.12, 2.6, 0.12] });
  k.add(roundBox(6.6, 2.4, 0.22, 0.12), '#2f4a7a', { p: [0, 2.4, -0.15] });
  k.add(roundBox(6.9, 0.18, 0.3, 0.06), PAL.gold, { p: [0, 3.66, -0.15] });
  g.add(k.mesh());
  const letters = [...'HELLO'].map((ch, i) => {
    const m = new THREE.Mesh(letterGeo(ch), new THREE.MeshLambertMaterial({ color: '#8a93a6', emissive: '#000000' }));
    m.position.set(-2.4 + i * 1.2, 1.65, 0.05); g.add(m); m.castShadow = true; return m;
  });
  const bulbs = [];
  const bulbGeo = new THREE.OctahedronGeometry(0.11, 0);
  for (let i = 0; i < n; i++) {
    // round the board: along the top, down the right, along the bottom, up the left
    const per = 6.6 * 2 + 2.4 * 2, d = (i / n) * per;
    let x, y;
    if (d < 6.6) { x = -3.3 + d; y = 3.6; } else if (d < 9) { x = 3.3; y = 3.6 - (d - 6.6); } else if (d < 15.6) { x = 3.3 - (d - 9); y = 1.2; } else { x = -3.3; y = 1.2 + (d - 15.6); }
    const b = new THREE.Mesh(bulbGeo, new THREE.MeshLambertMaterial({ color: '#6a7080', emissive: '#000000' }));
    b.position.set(x, y, 0.02); g.add(b); bulbs.push(b);
  }
  const shine = glow('#fff2a8', 6, 0); shine.position.set(0, 2.4, 0.4); g.add(shine);
  g.userData = { height: 4.4, letters, bulbs, shine, colors: LETTER_COLORS };
  return g;
}

// A little sailing boat out at sea (white sail, a coloured hull).
export function harbourBoat(i = 0) {
  const g = new THREE.Group(), k = kit();
  const hullC = ['#2f6fd0', '#e8453c'][i % 2];
  k.add(roundBox(1.8, 0.4, 0.7, 0.18), hullC, { p: [0, 0.15, 0] });
  k.add('box', '#fbfaf5', { p: [0, 0.36, 0], s: [1.84, 0.06, 0.74] });
  k.add('cone4', hullC, { p: [1.0, 0.15, 0], r: [0, 0, -Math.PI / 2], s: [0.3, 0.4, 0.3] });
  k.add('cyl', '#8a5a34', { p: [-0.1, 1.2, 0], s: [0.04, 1.9, 0.04] });
  g.add(mesh(k.geometry(), VC));
  const sail = new THREE.Shape(); sail.moveTo(0, 0); sail.lineTo(0, 1.6); sail.lineTo(0.9, 0.1); sail.lineTo(0, 0);
  const s = new THREE.Mesh(new THREE.ShapeGeometry(sail), new THREE.MeshLambertMaterial({ color: '#fffaf0', side: THREE.DoubleSide }));
  s.position.set(-0.05, 0.4, 0); s.castShadow = true; g.add(s);
  return g;
}

// ---------- The helper «بولي»: a scarlet macaw ----------
export const parrots: THREE.Group[] = [];
export function helperParrot() {
  const g = new THREE.Group(), k = kit();
  k.add(LO, '#e8453c', { p: [0, 0.62, 0], s: [0.24, 0.3, 0.22] });
  k.add(LO, '#e8453c', { p: [0, 0.98, 0.04], s: 0.2 });
  k.add(LO, '#fbfaf5', { p: [0, 0.98, 0.17], s: [0.14, 0.11, 0.08] });
  k.eyes({ x: 0.08, y: 1.02, z: 0.17, r: 0.05, look: 0.4 });
  k.add('cone', '#3b3640', { p: [0, 0.9, 0.27], r: [Math.PI / 2 + 0.5, 0, 0], s: [0.06, 0.16, 0.07] });
  k.add('cone', '#f2c14e', { p: [0, 0.95, 0.24], r: [Math.PI / 2 + 0.3, 0, 0], s: [0.07, 0.12, 0.06] });
  for (const [c, s, z] of [['#e8453c', 0.12, -0.22], ['#2f6fd0', 0.1, -0.3]] as const) k.add('cone', c, { p: [0, 0.34, z], r: [-0.4, 0, 0], s: [s, 0.6, s * 0.5] });
  for (const sx of [-0.08, 0.08]) k.add('cyl', '#8a8a8a', { p: [sx, 0.28, 0.02], s: [0.025, 0.14, 0.025] });
  k.add('cyl', '#3b3640', { p: [0, 0.2, 0], s: [0.14, 0.04, 0.14] });
  g.add(mesh(k.geometry(), VC));
  const wings = [-1, 1].map(sx => {
    const w = new THREE.Group(); const wk = kit();
    wk.add(LO, '#f2c14e', { p: [sx * 0.06, -0.08, 0], s: [0.08, 0.2, 0.17] });
    wk.add(LO, '#2f6fd0', { p: [sx * 0.07, -0.22, -0.02], s: [0.07, 0.15, 0.14] });
    w.add(mesh(wk.geometry(), VC)); w.position.set(sx * 0.2, 0.74, -0.02); g.add(w); return w;
  });
  const shine = glow('#fff2a8', 1.1, 0.6); shine.position.y = 0.7; g.add(shine);
  g.userData = { shine, wings };
  parrots.push(g);
  return g;
}
