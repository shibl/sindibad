// The 3D world (three.js): the board with a following camera, the city island, and the map of unit islands.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const STEP = 1.07;
const FONT = '"Baloo Bhaijaan 2", "Geeza Pro", sans-serif';
const DISPLAY = '"Lalezar", "Baloo Bhaijaan 2", sans-serif';
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const TAU = Math.PI * 2;

let renderer;
let envMap = null;
let current = null;
let onPick = () => {};
const clock = new THREE.Clock();
const tweens = [];

// ── helpers ──
// Toy-plastic look: physical material with a light clearcoat, lit by a room environment map.
const mats = new Map();
function std(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!o.unique && mats.has(key)) return mats.get(key);
  const { unique, ...rest } = o;
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.3, ...rest });
  if (!unique) mats.set(key, m);
  return m;
}
const glass = () => std('#eaf8ff', { transmission: 0.92, thickness: 0.25, roughness: 0.04, ior: 1.45, clearcoat: 1, envMapIntensity: 1.2 });
function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}
function tween(dur, fn) {
  return new Promise(res => tweens.push({ t: 0, dur, fn, res }));
}
const easeOut = k => 1 - (1 - k) ** 3;
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
  return t;
}
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function wrap(g, text, maxW, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines.length <= maxLines ? lines : null;
}
function fitText(g, text, maxW, maxLines, start, min, weight = 800, family = FONT) {
  for (let fs = start; fs >= min; fs -= 2) {
    g.font = `${weight} ${fs}px ${family}`;
    const lines = wrap(g, text, maxW, maxLines);
    if (lines) return { fs, lines };
  }
  g.font = `${weight} ${min}px ${family}`;
  return { fs: min, lines: wrap(g, text, maxW, 99) || [text] };
}

function sky(scene, top, bottom) {
  scene.background = canvasTex(4, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, top);
    grd.addColorStop(1, bottom);
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
}
function lights(scene, size) {
  if (envMap) scene.environment = envMap;
  scene.add(new THREE.HemisphereLight('#eaf6ff', '#6f8f5a', 0.95));
  const sun = new THREE.DirectionalLight('#fff1d6', 1.9);
  sun.position.set(-7, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 1, far: 50 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  return sun;
}
function label(text, { sub = '', bg = '#e53935', fg = '#fff', w = 640, h = 220 } = {}) {
  const tex = canvasTex(w, h, (g) => {
    g.direction = 'rtl';
    rr(g, 10, 14, w - 20, h - 28, 46);
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.translate(0, 10);
    g.fill();
    g.translate(0, -10);
    g.fillStyle = bg;
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = '#fff';
    g.stroke();
    g.textAlign = 'center';
    g.fillStyle = fg;
    g.font = `400 ${sub ? 86 : 100}px ${DISPLAY}`;
    g.fillText(text, w / 2, sub ? 112 : 140);
    if (sub) { g.font = `700 44px ${FONT}`; g.fillText(sub, w / 2, 180); }
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.renderOrder = 10;
  s.scale.set(w / h, 1, 1);
  return s;
}

// ── small props ──
function tree(scale = 1) {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6), std('#8d5a3b'));
  trunk.position.y = 0.15;
  const top = mesh(new THREE.IcosahedronGeometry(0.26, 0), std('#4caf50', { flatShading: true }));
  top.position.y = 0.45;
  const top2 = mesh(new THREE.IcosahedronGeometry(0.18, 0), std('#66bb6a', { flatShading: true }));
  top2.position.set(0.08, 0.62, 0.04);
  g.add(trunk, top, top2);
  g.scale.setScalar(scale);
  return g;
}
const FLASK = [[0, 0], [0.22, 0], [0.26, 0.03], [0.26, 0.06], [0.1, 0.32], [0.075, 0.37], [0.075, 0.5], [0.095, 0.52], [0, 0.52]];
function flask(liquid, scale = 1) {
  const g = new THREE.Group();
  const pts = FLASK.map(([x, y]) => new THREE.Vector2(x, y));
  const shell = mesh(new THREE.LatheGeometry(pts, 20), glass());
  const liq = mesh(new THREE.LatheGeometry([[0, 0.01], [0.21, 0.01], [0.24, 0.05], [0.17, 0.16], [0, 0.16]].map(([x, y]) => new THREE.Vector2(x, y)), 20), std(liquid, { emissive: liquid, emissiveIntensity: 0.25 }));
  g.add(liq, shell);
  g.scale.setScalar(scale);
  return g;
}
function house(color) {
  const g = new THREE.Group();
  const b = mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), std(color));
  b.position.y = 0.05;
  const roof = mesh(new THREE.ConeGeometry(0.11, 0.08, 4), std(color === '#2fbf57' ? '#1f8f3f' : '#9b1c1c'));
  roof.position.y = 0.14;
  roof.rotation.y = Math.PI / 4;
  g.add(b, roof);
  return g;
}
function hotel() {
  const g = new THREE.Group();
  const b = mesh(new THREE.BoxGeometry(0.34, 0.15, 0.14), std('#e53935'));
  b.position.y = 0.075;
  const roof = mesh(new THREE.CylinderGeometry(0.01, 0.11, 0.34, 3), std('#9b1c1c'));
  roof.rotation.set(0, 0, Math.PI / 2);
  roof.position.y = 0.19;
  const flag = mesh(new THREE.BoxGeometry(0.01, 0.08, 0.06), std('#ffd54f'));
  flag.position.set(0, 0.33, 0.03);
  const pole = mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.16, 4), std('#ffffff'));
  pole.position.set(0, 0.3, 0);
  g.add(b, roof, pole, flag);
  return g;
}
function citizen(color) {
  const g = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(0.075, 0.11, 4, 10), std(color));
  body.position.y = 0.14;
  const head = mesh(new THREE.SphereGeometry(0.075, 14, 10), std('#f2c7a5'));
  head.position.y = 0.31;
  const hair = mesh(new THREE.SphereGeometry(0.078, 14, 10, 0, TAU, 0, Math.PI / 2), std(['#3e2723', '#f9a825', '#5d4037'][Math.floor(Math.random() * 3)]));
  hair.position.y = 0.315;
  g.add(body, head, hair);
  return g;
}
function cityBlock(x, z, h, color) {
  const win = canvasTex(64, 128, (g, w, hh) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, hh);
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (let y = 10; y < hh - 8; y += 22) for (let xx = 8; xx < w - 8; xx += 20) g.fillRect(xx, y, 11, 13);
  });
  win.wrapS = win.wrapT = THREE.RepeatWrapping;
  win.repeat.set(1, Math.max(1, Math.round(h)));
  const m = mesh(new THREE.BoxGeometry(1.2, h, 1.2), [std(color, { map: win, unique: true }), std(color, { map: win, unique: true }), std('#eceff1'), std(color), std(color, { map: win, unique: true }), std(color, { map: win, unique: true })]);
  m.position.set(x, h / 2 - 0.6, z);
  return m;
}

// ════════════════ BOARD ════════════════
export function tileRC(i) {
  if (i === 0) return [9, 9];
  if (i < 8) return [9, 9 - i];
  if (i === 8) return [9, 1];
  if (i < 16) return [9 - (i - 8), 1];
  if (i === 16) return [1, 1];
  if (i < 24) return [1, 1 + (i - 16)];
  if (i === 24) return [1, 9];
  return [1 + (i - 24), 9];
}
const sideFrac = i => (i % 8 === 0 ? (i === 0 ? 3.5 : i / 8 - 0.5) : Math.floor(i / 8));
const tilePos = i => { const [r, c] = tileRC(i); return new THREE.Vector3((c - 5) * STEP, 0.15, (r - 5) * STEP); };

function tileTexture(t) {
  return canvasTex(512, 512, (g, w, h) => {
    g.direction = 'rtl';
    g.textAlign = 'center';
    rr(g, 8, 8, w - 16, h - 16, 44);
    g.fillStyle = t.bg;
    g.fill();
    if (t.color) {
      g.save();
      g.clip();
      g.fillStyle = t.color;
      g.fillRect(0, 0, w, 128);
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.fillRect(0, 108, w, 20);
      g.restore();
    }
    g.lineWidth = 10;
    g.strokeStyle = 'rgba(255,255,255,.9)';
    rr(g, 8, 8, w - 16, h - 16, 44);
    g.stroke();
    if (t.icon) {
      g.font = `${t.corner ? 190 : 150}px ${EMOJI}`;
      g.fillText(t.icon, w / 2, t.corner ? 270 : 240);
      if (t.shut) { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 60, w, 220); }
    }
    const top = t.color ? 150 : t.icon ? (t.corner ? 312 : 290) : 140;
    const room = (t.sub ? 430 : 470) - top;
    const { fs, lines } = fitText(g, t.name, w - 80, t.icon ? 2 : 3, t.icon ? (t.corner ? 92 : 74) : 86, 40);
    g.fillStyle = '#0d1838';
    g.font = `800 ${fs}px ${FONT}`;
    const lh = fs * 1.08;
    const y0 = top + (room - lh * lines.length) / 2 + fs * 0.82;
    lines.forEach((l, k) => g.fillText(l, w / 2, y0 + k * lh));
    if (t.sub) {
      g.font = `800 44px ${FONT}`;
      g.fillStyle = t.subColor || '#5b6475';
      g.fillText(t.sub, w / 2, 470);
    }
  });
}

const B = { scene: null, cam: null, tiles: [], groups: [], token: null, tokenPos: new THREE.Vector3(), target: new THREE.Vector3(), phi: Math.PI / 4, phiTarget: Math.PI / 4, overview: false, hl: null, walkers: [], sign: null, coins: [], hop: null };

function buildToken() {
  const g = new THREE.Group();
  const pts = [[0, 0], [0.24, 0], [0.28, 0.035], [0.28, 0.07], [0.12, 0.36], [0.09, 0.42], [0.09, 0.56], [0.115, 0.58], [0.115, 0.6], [0, 0.6]].map(([x, y]) => new THREE.Vector2(x, y));
  const shell = mesh(new THREE.LatheGeometry(pts, 28), glass());
  const liq = mesh(new THREE.LatheGeometry([[0, 0.012], [0.23, 0.012], [0.265, 0.05], [0.18, 0.2], [0, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 28), std('#ff4f9a', { emissive: '#ff4f9a', emissiveIntensity: 0.3 }));
  const cork = mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.1, 16), std('#c9894f'));
  cork.position.y = 0.63;
  const eyeW = std('#ffffff');
  const eyeB = std('#1b2a4a');
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.058, 16, 12), eyeW);
    e.position.set(0.075 * s, 0.27, 0.15);
    const p = mesh(new THREE.SphereGeometry(0.032, 12, 10), eyeB);
    p.position.set(0.075 * s, 0.27, 0.198);
    const cheek = mesh(new THREE.SphereGeometry(0.03, 10, 8), std('#ff8fb8'));
    cheek.position.set(0.13 * s, 0.2, 0.15);
    g.add(e, p, cheek);
  }
  const ring = mesh(new THREE.TorusGeometry(0.27, 0.035, 10, 32), std('#f2b705', { metalness: 0.4, roughness: 0.3 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  g.add(liq, shell, cork, ring);
  g.scale.setScalar(1.25);
  return g;
}

export function buildBoard(tiles, pos) {
  const scene = new THREE.Scene();
  sky(scene, '#7cc9ff', '#e3f5ff');
  scene.fog = new THREE.Fog('#d9f0ff', 20, 46);
  lights(scene, 8);
  const W = 9 * STEP;

  const ground = mesh(new THREE.PlaneGeometry(140, 140), std('#c9dccb'), { cast: false });
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.62;
  const road = mesh(new THREE.RingGeometry(W * 0.72, W * 0.84, 4, 1), std('#9aa5b1'), { cast: false });
  road.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
  road.position.y = -0.6;
  const plinth = mesh(new RoundedBoxGeometry(W + 0.8, 0.6, W + 0.8, 4, 0.24), std('#fbf6ec'));
  plinth.position.y = -0.33;
  const rim = mesh(new RoundedBoxGeometry(W + 0.95, 0.2, W + 0.95, 4, 0.1), std('#2f5d8a'));
  rim.position.y = -0.55;
  const field = mesh(new RoundedBoxGeometry(7 * STEP - 0.12, 0.26, 7 * STEP - 0.12, 3, 0.1), std('#9fd84f'));
  field.position.y = -0.06;
  scene.add(ground, road, plinth, rim, field);

  // surrounding city
  const palette = ['#f8bbd0', '#ffe0b2', '#c5e1a5', '#b3e5fc', '#d1c4e9', '#ffccbc', '#fff59d'];
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * TAU + Math.random() * 0.05;
    const r = 8.6 + Math.random() * 6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.random() < 0.35) { const tr = tree(1.6 + Math.random()); tr.position.set(x, -0.6, z); scene.add(tr); continue; }
    scene.add(cityBlock(x, z, 0.8 + Math.random() * (r > 11 ? 3.2 : 1.6), palette[k % palette.length]));
  }

  // board life on the field
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let k = 0; k < 16; k++) {
    let x, z;
    do { x = rnd(-3.2, 3.2); z = rnd(-3.2, 3.2); } while (Math.hypot(x, z) < 1.9);
    const tr = tree(rnd(0.7, 1.1));
    tr.position.set(x, 0.07, z);
    scene.add(tr);
  }
  [['#ff4f9a', -2.4, -2.4], ['#4fc3f7', 2.4, -2.4], ['#9ccc65', -2.4, 2.4], ['#ffb74d', 2.4, 2.4]].forEach(([c, x, z]) => {
    const f = flask(c, 1.0);
    f.position.set(x, 0.07, z);
    scene.add(f);
  });
  B.walkers = [];
  ['#e53935', '#1e88e5', '#fdd835', '#8e24aa', '#43a047', '#fb8c00'].forEach((c, k) => {
    const p = citizen(c);
    const w = { m: p, r: 1.9 + (k % 3) * 0.55, a: (k / 6) * TAU, s: (k % 2 ? 1 : -1) * rnd(0.18, 0.3) };
    p.position.y = 0.07;
    scene.add(p);
    B.walkers.push(w);
  });
  const sign = new THREE.Group();
  const signTex = canvasTex(1024, 384, (g, w, h) => {
    g.direction = 'rtl';
    rr(g, 8, 8, w - 16, h - 16, 60);
    g.fillStyle = '#fffaf0';
    g.fill();
    g.lineWidth = 16;
    g.strokeStyle = '#f2b705';
    g.stroke();
    g.textAlign = 'center';
    g.fillStyle = '#e53935';
    g.font = `400 150px ${DISPLAY}`;
    g.fillText('مدينة المادة', w / 2, 190);
    g.fillStyle = '#1b2a4a';
    g.font = `800 64px ${FONT}`;
    g.fillText('الوحدة الأولى · المادة وتحوّلاتها', w / 2, 300);
  });
  const panel = mesh(new THREE.BoxGeometry(2.8, 1.05, 0.08), [std('#f2b705'), std('#f2b705'), std('#f2b705'), std('#f2b705'), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }), std('#f2b705')]);
  panel.position.y = 1.0;
  for (const s of [-1, 1]) { const post = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), std('#8d5a3b')); post.position.set(1.1 * s, 0.3, 0); sign.add(post); }
  sign.add(panel);
  sign.position.y = 0.07;
  scene.add(sign);
  B.sign = sign;

  // tiles
  B.tiles = [];
  B.groups = [];
  tiles.forEach((t, i) => {
    const p = tilePos(i);
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = -Math.ceil(sideFrac(i)) * Math.PI / 2;
    const body = mesh(new RoundedBoxGeometry(1, 0.3, 1, 3, 0.07), std(t.body || '#d6eef3'));
    body.userData = { kind: 'tile', i };
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.94), new THREE.MeshStandardMaterial({ map: tileTexture(t), roughness: 0.95, envMapIntensity: 0.1 }));
    decal.rotation.x = -Math.PI / 2;
    decal.position.y = 0.152;
    decal.receiveShadow = true;
    decal.userData = { kind: 'tile', i };
    const deco = new THREE.Group();
    deco.position.y = 0.15;
    g.add(body, decal, deco);
    scene.add(g);
    B.groups.push({ g, decal, deco, data: t });
    B.tiles.push(body, decal);
    setDeco(i, t);
  });

  // destination marker
  const hlTex = canvasTex(256, 256, (g, w, h) => {
    rr(g, 10, 10, w - 20, h - 20, 34);
    g.lineWidth = 18;
    g.strokeStyle = '#ffd400';
    g.shadowColor = '#ffae00';
    g.shadowBlur = 14;
    g.stroke();
  });
  B.hl = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.12), new THREE.MeshBasicMaterial({ map: hlTex, transparent: true, depthWrite: false }));
  B.hl.rotation.x = -Math.PI / 2;
  B.hl.visible = false;
  scene.add(B.hl);

  B.token = buildToken();
  scene.add(B.token);
  const tp = tilePos(pos);
  B.tokenPos.copy(tp);
  B.token.position.copy(tp);
  B.target.copy(tp);
  B.phi = B.phiTarget = -sideFrac(pos) * Math.PI / 2;
  B.cam = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  B.scene = scene;
  scene.userData.pickables = B.tiles;
  scene.userData.update = updateBoard;
  scene.userData.camera = B.cam;
  return scene;
}

function setDeco(i, t) {
  const { deco } = B.groups[i];
  deco.clear();
  if (t.kind !== 'prop') return;
  if (t.owned) {
    const h = hotel();
    h.position.z = -0.36;
    deco.add(h);
    return;
  }
  const n = t.mastered || 0;
  for (let k = 0; k < n; k++) {
    const hs = house('#2fbf57');
    hs.position.set((k - (t.total - 1) / 2) * 0.17, 0, -0.36);
    deco.add(hs);
  }
}

export function setTile(i, t) {
  const grp = B.groups[i];
  if (!grp) return;
  const changed = JSON.stringify({ ...grp.data, mastered: 0, owned: 0 }) !== JSON.stringify({ ...t, mastered: 0, owned: 0 });
  if (changed) {
    grp.decal.material.map.dispose();
    grp.decal.material.map = tileTexture(t);
    grp.decal.material.needsUpdate = true;
  }
  const grew = (t.mastered || 0) > (grp.data.mastered || 0) || (t.owned && !grp.data.owned);
  grp.data = t;
  setDeco(i, t);
  if (grew) {
    grp.deco.scale.setScalar(0.01);
    tween(0.45, k => grp.deco.scale.setScalar(0.01 + easeOut(k) * 0.99 + Math.sin(k * Math.PI) * 0.25));
  }
}

function setPhiFor(i) {
  let b = -sideFrac(i) * Math.PI / 2;
  while (b - B.phiTarget > Math.PI) b -= TAU;
  while (b - B.phiTarget < -Math.PI) b += TAU;
  B.phiTarget = b;
}

export function hopTo(i) {
  return new Promise(res => {
    B.hop = { from: B.tokenPos.clone(), to: tilePos(i), t: 0, dur: 0.36, res };
    setPhiFor(i);
  });
}
export function placeToken(i) {
  const p = tilePos(i);
  B.tokenPos.copy(p);
  B.token.position.copy(p);
  setPhiFor(i);
}
export function highlight(i) {
  if (!B.hl) return;
  if (i == null) { B.hl.visible = false; return; }
  const p = tilePos(i);
  B.hl.position.set(p.x, 0.17, p.z);
  B.hl.visible = true;
}
export function setOverview(on) { B.overview = on; }

// Gold coin marked «ك» (for كيمياء), like the game's own currency mark.
const coinTex = () => canvasTex(128, 128, (g) => {
  g.fillStyle = '#a86400';
  g.beginPath(); g.arc(64, 68, 54, 0, TAU); g.fill();
  const grd = g.createRadialGradient(48, 42, 6, 64, 62, 56);
  grd.addColorStop(0, '#fff6b0'); grd.addColorStop(0.45, '#ffcf3a'); grd.addColorStop(1, '#e09400');
  g.fillStyle = grd;
  g.beginPath(); g.arc(64, 62, 54, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,248,200,.9)'; g.lineWidth = 6;
  g.beginPath(); g.arc(64, 62, 39, 0, TAU); g.stroke();
  g.fillStyle = '#a86400'; g.font = `400 58px ${DISPLAY}`; g.textAlign = 'center'; g.fillText('ك', 64, 84);
});
let COIN;
export function coinBurst(i, n = 8) {
  COIN ||= coinTex();
  const p = i == null ? B.tokenPos : tilePos(i);
  for (let k = 0; k < n; k++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: COIN, transparent: true, depthWrite: false }));
    s.scale.setScalar(0.36);
    s.position.set(p.x, 0.6, p.z);
    const v = new THREE.Vector3((Math.random() - 0.5) * 2.2, 3 + Math.random() * 2, (Math.random() - 0.5) * 2.2);
    B.scene.add(s);
    B.coins.push({ s, v, t: 0 });
  }
}

function updateBoard(dt, t) {
  const h = B.hop;
  if (h) {
    h.t += dt / h.dur;
    const k = Math.min(h.t, 1);
    B.tokenPos.lerpVectors(h.from, h.to, easeInOut(k));
    B.token.position.set(B.tokenPos.x, B.tokenPos.y + Math.sin(Math.PI * k) * 0.6, B.tokenPos.z);
    B.token.scale.set(1.25, 1.25 * (1 + Math.sin(Math.PI * k) * 0.12), 1.25);
    if (k >= 1) { B.hop = null; h.res(); tween(0.18, q => B.token.scale.set(1.25 * (1 + Math.sin(q * Math.PI) * 0.12), 1.25 * (1 - Math.sin(q * Math.PI) * 0.16), 1.25 * (1 + Math.sin(q * Math.PI) * 0.12))); }
  } else {
    B.token.position.set(B.tokenPos.x, B.tokenPos.y + Math.abs(Math.sin(t * 2.2)) * 0.05, B.tokenPos.z);
  }
  const damp = 1 - Math.exp(-dt * 3.5);
  B.phi += (B.phiTarget - B.phi) * damp;
  B.token.rotation.y = B.phi;
  B.sign.rotation.y = B.phi;
  const tgt = B.overview ? new THREE.Vector3(0, 0, 0) : B.tokenPos;
  B.target.lerp(tgt, 1 - Math.exp(-dt * 5));
  const aspect = B.cam.aspect;
  const k = aspect < 1 ? 1 / Math.pow(aspect, 0.75) : 1;
  const d = (B.overview ? 9.5 : 5.6) * k;
  const y = (B.overview ? 14 : 6.8) * k;
  B.cam.position.set(B.target.x + Math.sin(B.phi) * d, y, B.target.z + Math.cos(B.phi) * d);
  B.cam.lookAt(B.target.x, 0, B.target.z);
  for (const w of B.walkers) {
    w.a += w.s * dt;
    w.m.position.x = Math.cos(w.a) * w.r;
    w.m.position.z = Math.sin(w.a) * w.r;
    w.m.position.y = 0.07 + Math.abs(Math.sin(t * 8 + w.r)) * 0.03;
    w.m.rotation.y = -w.a + (w.s > 0 ? Math.PI : 0);
  }
  if (B.hl?.visible) B.hl.material.opacity = 0.55 + Math.sin(t * 6) * 0.45;
  for (let j = B.coins.length - 1; j >= 0; j--) {
    const c = B.coins[j];
    c.t += dt;
    c.v.y -= 9 * dt;
    c.s.position.addScaledVector(c.v, dt);
    c.s.material.opacity = Math.max(0, 1 - c.t / 1.1);
    if (c.t > 1.1) { B.scene.remove(c.s); c.s.material.dispose(); B.coins.splice(j, 1); }
  }
}

// ════════════════ LANDMARKS ════════════════
const glassMat = glass;
const LANDMARK = {
  tower(c) {
    const g = new THREE.Group();
    const solid = mesh(new RoundedBoxGeometry(1.5, 1.0, 1.5, 2, 0.1), std('#90a4c0'));
    solid.position.y = 0.5;
    const cubes = new THREE.Group();
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const cb = mesh(new THREE.BoxGeometry(0.34, 0.34, 0.06), std('#cfe8ff')); cb.position.set((a - 1) * 0.42, 0.3 + b * 0.25 + 0.1, 0.76); cubes.add(cb); }
    const liq = mesh(new THREE.CylinderGeometry(0.62, 0.66, 1.1, 28), std('#3fa9f5', { transparent: true, opacity: 0.85 }));
    liq.position.y = 1.55;
    const lid = mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 28), std(c));
    lid.position.y = 2.15;
    const gas = new THREE.Group();
    [[0, 0, 0, 0.36], [0.32, 0.05, 0.1, 0.26], [-0.3, 0.08, -0.05, 0.27], [0.05, 0.3, -0.1, 0.25]].forEach(([x, y, z, r]) => { const s = mesh(new THREE.SphereGeometry(r, 18, 14), std('#ffffff')); s.position.set(x, 2.5 + y, z); gas.add(s); });
    const spire = mesh(new THREE.CylinderGeometry(0.04, 0.09, 0.6, 8), std('#f2b705', { metalness: 0.4 }));
    spire.position.y = 3.1;
    const orb = mesh(new THREE.SphereGeometry(0.28, 20, 16), std('#c084fc', { emissive: '#a855f7', emissiveIntensity: 0.9 }));
    orb.position.y = 3.5;
    const ring = mesh(new THREE.TorusGeometry(0.46, 0.04, 8, 32), std('#f2b705', { metalness: 0.5 }));
    ring.position.y = 3.5;
    ring.rotation.x = 1.2;
    ring.userData.spin = 1.5;
    g.add(solid, cubes, liq, lid, gas, spire, orb, ring);
    return { g, h: 3.85 };
  },
  factory(c) {
    const g = new THREE.Group();
    const main = mesh(new RoundedBoxGeometry(2.3, 1.0, 1.5, 2, 0.08), std(c));
    main.position.y = 0.5;
    for (let k = 0; k < 3; k++) { const r = mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.5, 3), std('#9d174d')); r.rotation.set(Math.PI / 2, 0, 0); r.position.set(-0.75 + k * 0.75, 1.15, 0); g.add(r); }
    for (let k = 0; k < 4; k++) { const w = mesh(new THREE.BoxGeometry(0.32, 0.3, 0.04), std('#fde7f3')); w.position.set(-0.85 + k * 0.56, 0.55, 0.76); g.add(w); }
    const chim = mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.6, 14), std('#64748b'));
    chim.position.set(0.85, 1.6, -0.45);
    const smoke = new THREE.Group();
    [0, 1, 2].forEach(k => { const s = mesh(new THREE.SphereGeometry(0.16 + k * 0.05, 12, 10), std('#eef2f7'), { cast: false }); s.position.set(0.85 + k * 0.15, 2.55 + k * 0.28, -0.45); smoke.add(s); });
    const fl = new THREE.Group();
    const bulb = mesh(new THREE.SphereGeometry(0.42, 22, 18), glassMat());
    const liq = mesh(new THREE.SphereGeometry(0.36, 22, 18, 0, TAU, Math.PI / 2, Math.PI / 2), std('#ff6fb1', { emissive: '#ff4f9a', emissiveIntensity: 0.35 }));
    const neck = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12), glassMat());
    neck.position.y = 0.6;
    fl.add(liq, bulb, neck);
    fl.position.set(-0.6, 1.55, 0.2);
    const tube = mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 12), glassMat());
    tube.rotation.z = -1.0;
    tube.position.set(0.05, 2.05, 0.2);
    g.add(main, chim, smoke, fl, tube);
    return { g, h: 3.0 };
  },
  lab(c) {
    const g = new THREE.Group();
    const main = mesh(new RoundedBoxGeometry(2.1, 0.95, 1.7, 2, 0.08), std(c));
    main.position.y = 0.475;
    const dome = mesh(new THREE.SphereGeometry(0.82, 28, 16, 0, TAU, 0, Math.PI / 2), std('#ffe082'));
    dome.position.y = 0.95;
    const door = mesh(new THREE.BoxGeometry(0.36, 0.55, 0.05), std('#7c2d12'));
    door.position.set(0, 0.28, 0.86);
    const tt = new THREE.Group();
    const tube = mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.3, 20, 1, true), glassMat());
    tube.position.y = 0.65;
    const bottom = mesh(new THREE.SphereGeometry(0.2, 20, 12, 0, TAU, Math.PI / 2, Math.PI / 2), glassMat());
    const liq = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.7, 20), std('#7ee36b', { emissive: '#4caf50', emissiveIntensity: 0.4 }));
    liq.position.y = 0.35;
    tt.add(liq, tube, bottom);
    [0.3, 0.55, 0.8].forEach((y, k) => { const b = mesh(new THREE.SphereGeometry(0.05 + k * 0.01, 10, 8), std('#eaffea'), { cast: false }); b.position.set(0.05 - k * 0.04, y, 0.05); b.userData.bob = k; tt.add(b); });
    tt.position.y = 1.7;
    g.add(main, dome, door, tt);
    return { g, h: 3.2 };
  },
  battery(c) {
    const g = new THREE.Group();
    const body = mesh(new THREE.CylinderGeometry(0.78, 0.78, 2.2, 32), std(c));
    body.position.y = 1.1;
    const cap = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.22, 32), std('#cfd8dc', { metalness: 0.5, roughness: 0.3 }));
    cap.position.y = 2.31;
    const term = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.28, 20), std('#f2b705', { metalness: 0.5 }));
    term.position.y = 2.56;
    [0.55, 1.05, 1.55].forEach(y => { const r = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.22, 32), std('#4ade80', { emissive: '#22c55e', emissiveIntensity: 0.35 })); r.position.y = y; g.add(r); });
    const bolt = new THREE.Shape();
    [[0.05, 0.5], [-0.25, -0.02], [-0.02, -0.02], [-0.12, -0.5], [0.25, 0.08], [0.02, 0.08], [0.12, 0.5]].forEach(([x, y], k) => (k ? bolt.lineTo(x, y) : bolt.moveTo(x, y)));
    const bm = mesh(new THREE.ExtrudeGeometry(bolt, { depth: 0.08, bevelEnabled: false }), std('#ffd400', { emissive: '#ffb300', emissiveIntensity: 0.4 }));
    bm.position.set(0, 1.25, 0.78);
    g.add(body, cap, term, bm);
    return { g, h: 2.75 };
  },
};

function makeLandmark(lm, stage, scale = 1, baseY = 0) {
  const { g, h } = LANDMARK[lm.shape](lm.color);
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const gplane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ghost = g.clone(true);
  const gm = new THREE.MeshBasicMaterial({ color: '#a9d1ff', transparent: true, opacity: 0.3, clippingPlanes: [gplane], depthWrite: false });
  ghost.traverse(o => { if (o.isMesh) { o.material = gm; o.castShadow = false; } });
  g.traverse(o => {
    if (o.isMesh) {
      const src = Array.isArray(o.material) ? o.material : [o.material];
      const cl = src.map(m => { const c = m.clone(); c.clippingPlanes = [plane]; c.clipShadows = true; return c; });
      o.material = Array.isArray(o.material) ? cl : cl[0];
    }
  });
  const root = new THREE.Group();
  root.add(g, ghost);
  root.scale.setScalar(scale);
  const obj = { root, g, h: h * scale, plane, gplane, baseY, stage, scaffold: null, sparks: [] };
  setLevel(obj, stage);
  return obj;
}
function setLevel(obj, s) {
  const lvl = obj.baseY + (s >= 3 ? obj.h + 1 : obj.h * (s / 3));
  obj.plane.constant = lvl;
  obj.gplane.constant = -lvl;
}

// ════════════════ CITY ════════════════
const C = { scene: null, cam: null, lms: {}, t: 0, angle: 0.6 };
const PLOTS = [[-2.7, -2.4], [2.7, -2.4], [-2.7, 2.6], [2.7, 2.6]];

export function buildCity(landmarks, stages) {
  const scene = new THREE.Scene();
  sky(scene, '#6fc3ff', '#e8f7ff');
  scene.fog = new THREE.Fog('#dff3ff', 26, 60);
  lights(scene, 9);
  const water = mesh(new THREE.PlaneGeometry(200, 200), std('#4fc3f7', { roughness: 0.2, metalness: 0.1 }), { cast: false });
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1.6;
  const island = mesh(new RoundedBoxGeometry(11.5, 2, 11.5, 4, 0.5), [std('#b9845a'), std('#b9845a'), std('#8fd14f'), std('#a0714c'), std('#b9845a'), std('#b9845a')]);
  island.position.y = -0.6;
  scene.add(water, island);
  const roadM = std('#8d99a6');
  const r1 = mesh(new THREE.BoxGeometry(11, 0.04, 0.9), roadM, { cast: false });
  r1.position.y = 0.42;
  const r2 = mesh(new THREE.BoxGeometry(0.9, 0.04, 11), roadM, { cast: false });
  r2.position.y = 0.42;
  scene.add(r1, r2);
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * TAU;
    const tr = tree(1.2);
    tr.position.set(Math.cos(a) * 5.1, 0.4, Math.sin(a) * 5.1);
    scene.add(tr);
  }
  C.lms = {};
  landmarks.forEach((lm, i) => {
    const [x, z] = PLOTS[i];
    const plot = mesh(new RoundedBoxGeometry(3.6, 0.16, 3.6, 2, 0.06), std('#d3dae2'));
    plot.position.set(x, 0.48, z);
    plot.userData = { kind: 'lm', id: lm.id };
    scene.add(plot);
    const obj = makeLandmark(lm, stages[lm.id] || 0, 1, 0.56);
    obj.root.position.set(x, 0.56, z);
    obj.root.traverse(o => { if (o.isMesh) o.userData = { kind: 'lm', id: lm.id }; });
    scene.add(obj.root);
    obj.labelPos = new THREE.Vector3(x, 0.56 + obj.h + 0.7, z);
    const tag = label(lm.name, { bg: lm.color, w: 560, h: 160 });
    tag.scale.multiplyScalar(0.62);
    tag.position.set(x, 1.0, z + 1.75);
    scene.add(tag);
    C.lms[lm.id] = obj;
    refreshScaffold(obj);
  });
  C.cam = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
  C.scene = scene;
  scene.userData.pickables = [];
  scene.traverse(o => { if (o.userData?.kind === 'lm') scene.userData.pickables.push(o); });
  scene.userData.update = updateCity;
  scene.userData.camera = C.cam;
  return scene;
}

function refreshScaffold(obj) {
  if (obj.scaffold) { obj.root.parent?.remove(obj.scaffold); obj.scaffold = null; }
  obj.sparks.forEach(s => s.parent?.remove(s));
  obj.sparks = [];
  const scene = obj.root.parent;
  if (!scene) return;
  const s = obj.stage;
  if (s > 0 && s < 3) {
    const bottom = obj.h * (s / 3);
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.6, obj.h - bottom + 0.2, 2.2, 1, 3, 1));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#d97706' }));
    lines.position.set(obj.root.position.x, obj.baseY + bottom + (obj.h - bottom + 0.2) / 2, obj.root.position.z);
    scene.add(lines);
    obj.scaffold = lines;
  }
  if (s >= 3) {
    const tex = canvasTex(128, 128, (g) => { g.font = `96px ${EMOJI}`; g.textAlign = 'center'; g.fillText('✨', 64, 100); });
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.scale.setScalar(0.5);
      sp.userData = { a: (k / 4) * TAU, base: obj.root.position.clone(), h: obj.baseY + obj.h * (0.4 + k * 0.17) };
      scene.add(sp);
      obj.sparks.push(sp);
    }
  }
}

export async function setStage(id, s, animate = true) {
  const obj = C.lms[id];
  if (!obj) return;
  const from = obj.stage;
  obj.stage = s;
  if (obj.scaffold) { obj.root.parent.remove(obj.scaffold); obj.scaffold = null; }
  if (animate) {
    const a = obj.baseY + obj.h * (from / 3);
    const b = obj.baseY + obj.h * (Math.min(s, 3) / 3);
    await tween(1.4, k => { const lv = a + (b - a) * easeOut(k); obj.plane.constant = lv; obj.gplane.constant = -lv; obj.root.position.y = obj.baseY + Math.sin(k * Math.PI * 6) * 0.03 * (1 - k); });
    obj.root.position.y = obj.baseY;
  }
  setLevel(obj, s);
  refreshScaffold(obj);
}
export function cityLabelPositions() {
  return Object.fromEntries(Object.entries(C.lms).map(([id, o]) => [id, project(o.labelPos, C.cam)]));
}

function updateCity(dt, t) {
  C.angle += dt * 0.08;
  const aspect = C.cam.aspect;
  const k = aspect < 1 ? 1 / Math.pow(aspect, 0.7) : 1;
  C.cam.position.set(Math.sin(C.angle) * 14 * k, 10.5 * k, Math.cos(C.angle) * 14 * k);
  C.cam.lookAt(0, -0.6, 2.4);
  for (const o of Object.values(C.lms)) {
    o.root.traverse(m => { if (m.userData.spin) m.rotation.z += dt * m.userData.spin; });
    o.sparks.forEach(sp => { const u = sp.userData; u.a += dt * 1.2; sp.position.set(u.base.x + Math.cos(u.a) * 1.5, u.h + Math.sin(t * 3 + u.a) * 0.1, u.base.z + Math.sin(u.a) * 1.5); });
  }
}

// ════════════════ MAP ════════════════
const M = { scene: null, cam: null, islands: [] };
const ISLES = [[2.6, 2.2], [-2.4, -0.2], [2.4, -3.0], [-2.2, -5.6]];

export function buildMap(units, landmarks, stages) {
  const scene = new THREE.Scene();
  sky(scene, '#7fd0ff', '#f1fbff');
  scene.fog = new THREE.Fog('#e6f7ff', 18, 42);
  lights(scene, 10);
  const ground = mesh(new THREE.PlaneGeometry(200, 200), std('#9fd86a'), { cast: false });
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.5;
  scene.add(ground);
  for (let k = 0; k < 14; k++) {
    const hill = mesh(new THREE.SphereGeometry(2 + Math.random() * 2.5, 18, 12), std(k % 2 ? '#5ab56f' : '#4aa864'), { cast: false });
    const side = k % 2 ? 1 : -1;
    hill.position.set(side * (7 + Math.random() * 4), -1.6, -k * 1.4 + 4);
    hill.scale.y = 0.75;
    scene.add(hill);
  }
  M.islands = [];
  units.forEach((u, i) => {
    const [x, z] = ISLES[i];
    const g = new THREE.Group();
    const open = u.open;
    const isle = mesh(new RoundedBoxGeometry(3.6, 0.9, 3.6, 3, 0.25), [std(open ? '#7b8794' : '#9aa5b1'), std(open ? '#7b8794' : '#9aa5b1'), std(open ? '#8fd14f' : '#c9d2db'), std('#6b7480'), std(open ? '#7b8794' : '#9aa5b1'), std(open ? '#7b8794' : '#9aa5b1')]);
    isle.userData = { kind: 'unit', i };
    g.add(isle);
    if (open) {
      landmarks.forEach((lm, k) => {
        const obj = makeLandmark(lm, Math.max(stages[lm.id] || 0, 0), 0.3, 0);
        const [px, pz] = PLOTS[k];
        obj.root.position.set(px * 0.3, 0.45, pz * 0.3);
        setLevel({ ...obj, baseY: 0.45 }, stages[lm.id] || 0);
        obj.plane.constant = (stages[lm.id] || 0) >= 3 ? 99 : 0.45 + obj.h * ((stages[lm.id] || 0) / 3);
        obj.gplane.constant = -obj.plane.constant;
        obj.root.traverse(o => { if (o.isMesh) o.userData = { kind: 'unit', i }; });
        g.add(obj.root);
      });
      for (let k = 0; k < 6; k++) { const tr = tree(0.8); tr.position.set(-1.5 + (k % 3) * 1.5, 0.45, k < 3 ? -1.55 : 1.55); g.add(tr); }
    } else {
      for (let k = 0; k < 4; k++) { const b = mesh(new THREE.BoxGeometry(0.5, 0.4 + k * 0.2, 0.5), std('#dfe5ea')); b.position.set(-0.8 + k * 0.55, 0.45 + (0.4 + k * 0.2) / 2, -0.3); g.add(b); }
    }
    const lb = label(u.city, { sub: u.no, bg: open ? '#e53935' : '#8792a2', w: 620, h: 230 });
    lb.scale.multiplyScalar(0.72);
    lb.position.set(0, open ? 1.75 : 1.45, 1.5);
    g.add(lb);
    if (!open) {
      const lock = label('🔒 قريباً', { bg: '#475569', w: 420, h: 150 });
      lock.scale.multiplyScalar(0.5);
      lock.position.set(0, 0.85, 1.7);
      g.add(lock);
    }
    g.position.set(x, 0, z);
    g.userData.bob = i;
    scene.add(g);
    M.islands.push(g);
  });
  M.cam = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  M.scene = scene;
  scene.userData.pickables = [];
  scene.traverse(o => { if (o.userData?.kind === 'unit') scene.userData.pickables.push(o); });
  scene.userData.update = updateMap;
  scene.userData.camera = M.cam;
  return scene;
}
function updateMap(dt, t) {
  const aspect = M.cam.aspect;
  const k = aspect < 1 ? 1 / Math.pow(aspect, 0.8) : 1;
  M.cam.position.set(0, 9 * k, 9.5 * k + 1);
  M.cam.lookAt(0, 0, -1.4);
  M.islands.forEach((g, i) => { g.position.y = Math.sin(t * 1.2 + i) * 0.12; });
}

// ════════════════ engine ════════════════
function project(v, cam) {
  const p = v.clone().project(cam);
  return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight, hidden: p.z > 1 };
}
function resize() {
  if (!renderer) return;
  renderer.setSize(innerWidth, innerHeight, false);
  for (const c of [B.cam, C.cam, M.cam]) if (c) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
}

export function initWorld(canvas, pick) {
  onPick = pick;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.localClippingEnabled = true;
  const pm = new THREE.PMREMGenerator(renderer);
  envMap = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  addEventListener('resize', resize);
  const ray = new THREE.Raycaster();
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8 || !current) return;
    const v = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(v, current.userData.camera);
    const hit = ray.intersectObjects(current.userData.pickables || [], false)[0];
    if (hit) onPick(hit.object.userData);
  });
  const loop = () => {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for (let j = tweens.length - 1; j >= 0; j--) {
      const tw = tweens[j];
      tw.t += dt / tw.dur;
      tw.fn(Math.min(tw.t, 1));
      if (tw.t >= 1) { tweens.splice(j, 1); tw.res(); }
    }
    if (!current) return;
    current.userData.update(dt, t);
    renderer.render(current, current.userData.camera);
  };
  loop();
}

export function show(scene) {
  current = scene;
  resize();
}
