// Renderer, camera, picking, labels and animation helpers for the 3D lab.
// Units are metres; the bench top is at y = BENCH.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export { THREE };
export const BENCH = 0.9;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export const E = {
  renderer: null, scene: null, camera: null, controls: null,
  speed: 4,        // simulation speed: real seconds × speed = simulated seconds
  paused: false,   // simulation is frozen while a question is open
  t: 0,
  onPick: null,    // (key, hit) => void
  inset: { right: 0, bottom: 0 },
  dtCap: new URLSearchParams(location.search).has('fast') ? 0.6 : 0.05, // ?fast: let slow test machines keep real time
};

// ── frame loop ──
const updaters = new Set();
export const onFrame = fn => { updaters.add(fn); return () => updaters.delete(fn); };

export const ease = {
  linear: t => t,
  out: t => 1 - (1 - t) ** 3,
  in: t => t * t * t,
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};

// Runs fn(k) every frame for dur real seconds, k eased 0→1.
export function anim(dur, fn, e = ease.inOut) {
  return new Promise(res => {
    let t = 0;
    if (dur <= 0) { fn(1, 1); res(); return; }
    const off = onFrame(dt => {
      t += dt;
      const k = Math.min(1, t / dur);
      fn(e(k), k);
      if (k >= 1) { off(); res(); }
    });
  });
}
export const wait = s => anim(s, () => {}, ease.linear);

const _q = new THREE.Quaternion();
// Moves obj to `to` (parent space) with an optional lift arc and target rotation.
export function moveTo(obj, to, dur = 0.8, { lift = 0, rot = null, e = ease.inOut } = {}) {
  const from = obj.position.clone();
  const q0 = obj.quaternion.clone();
  const q1 = rot ? (rot.isQuaternion ? rot : _q.clone().setFromEuler(rot)) : q0.clone();
  return anim(dur, k => {
    obj.position.lerpVectors(from, to, k);
    if (lift) obj.position.y += Math.sin(Math.PI * k) * lift;
    obj.quaternion.slerpQuaternions(q0, q1, k);
  }, e);
}

// Re-parents obj without moving it in the world.
export function reparent(obj, parent) {
  parent.updateMatrixWorld(true);
  obj.updateMatrixWorld(true);
  parent.attach(obj);
}

// ── renderer + scene ──
let canvas, clock, ray, ndc;

export function init(cv) {
  canvas = cv;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd9dee4);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 40);
  camera.position.set(0, 1.45, 1.0);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.0, -0.1);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 0.3;
  controls.maxDistance = 3.6;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.48;
  controls.minAzimuthAngle = -0.85;
  controls.maxAzimuthAngle = 0.85;

  Object.assign(E, { renderer, scene, camera, controls });
  clock = new THREE.Clock();
  ray = new THREE.Raycaster();
  ndc = new THREE.Vector2();

  bindPointer();
  window.addEventListener('resize', resize);
  resize();
  loop();
}

export function setInset(right = 0, bottom = 0) {
  E.inset = { right, bottom };
  resize();
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  E.renderer.setSize(w, h, false);
  const { right, bottom } = E.inset;
  // Shift the view centre into the part of the screen that the panels leave free.
  E.camera.aspect = (w + right) / (h + bottom);
  E.camera.fov = w / h < 0.8 ? 52 : w / h < 1.2 ? 44 : 38;
  if (right || bottom) E.camera.setViewOffset(w + right, h + bottom, document.documentElement.dir === 'rtl' ? right : 0, bottom, w, h);
  else E.camera.clearViewOffset();
  E.camera.updateProjectionMatrix();
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), E.dtCap);
  const sdt = E.paused ? 0 : dt * E.speed;
  E.t += dt;
  for (const f of [...updaters]) f(dt, sdt);
  E.controls.update();
  updateLabels();
  E.renderer.render(E.scene, E.camera);
}

// ── camera flights ──
export function fly(pos, target, dur = 1.4) {
  const p0 = E.camera.position.clone(), t0 = E.controls.target.clone();
  const p1 = pos.clone(), t1 = target.clone();
  E.controls.enabled = false;
  return anim(dur, k => {
    E.camera.position.lerpVectors(p0, p1, k);
    E.controls.target.lerpVectors(t0, t1, k);
  }).then(() => { E.controls.enabled = true; });
}

// ── picking ──
// pickable(root, key, name) makes root clickable. Hover shows its name; a halo ring marks hint targets.
const picks = new Map();
let hoverKey = null;
const tip = () => document.getElementById('tip');

export function pickable(root, key, name, { halo = true, r = null } = {}) {
  root.userData.pick = key;
  const entry = { root, key, name, halo: null, r, hint: false, hover: false, enabled: true };
  if (halo) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 64), m);
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 5;
    ring.visible = false;
    E.scene.add(ring);
    entry.halo = ring;
  }
  picks.set(key, entry);
  return entry;
}
export function unpick(key) {
  const p = picks.get(key);
  if (!p) return;
  if (p.halo) { E.scene.remove(p.halo); p.halo.geometry.dispose(); p.halo.material.dispose(); }
  delete p.root.userData.pick;
  picks.delete(key);
  if (hoverKey === key) setHover(null);
}
export const pickName = key => picks.get(key)?.name || '';
export const hasPick = key => picks.has(key);
export function setHint(keys) {
  const s = new Set(keys ? [].concat(keys) : []);
  for (const p of picks.values()) p.hint = s.has(p.key);
}
export function rename(key, name) { const p = picks.get(key); if (p) p.name = name; }

const _box = new THREE.Box3(), _c = new THREE.Vector3(), _s = new THREE.Vector3();
function placeHalo(p) {
  _box.setFromObject(p.root, true);
  if (_box.isEmpty()) return;
  _box.getCenter(_c);
  _box.getSize(_s);
  const r = p.r ?? Math.max(0.03, Math.min(0.16, Math.max(_s.x, _s.z) * 0.62));
  p.halo.position.set(_c.x, _box.min.y + 0.002, _c.z);
  p.halo.scale.setScalar(r);
}
onFrame(() => {
  for (const p of picks.values()) {
    if (!p.halo) continue;
    const on = p.hint || p.hover;
    p.halo.visible = on;
    if (!on) continue;
    placeHalo(p);
    const m = p.halo.material;
    if (p.hint) { m.color.setHex(0x14b8a6); m.opacity = 0.55 + 0.35 * Math.sin(E.t * 5); }
    else { m.color.setHex(0xffffff); m.opacity = 0.7; }
  }
});

function hitAt(x, y) {
  const rect = canvas.getBoundingClientRect();
  ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
  ray.setFromCamera(ndc, E.camera);
  const roots = [...picks.values()].filter(p => p.enabled).map(p => p.root);
  const hits = ray.intersectObjects(roots, true);
  for (const h of hits) {
    let o = h.object;
    while (o && o.userData.pick === undefined) o = o.parent;
    if (o && picks.has(o.userData.pick)) return { key: o.userData.pick, point: h.point };
  }
  return null;
}

function setHover(key, x, y) {
  if (hoverKey && picks.get(hoverKey)) picks.get(hoverKey).hover = false;
  hoverKey = key;
  const el = tip();
  if (!key) { el.classList.remove('on'); canvas.style.cursor = ''; return; }
  const p = picks.get(key);
  p.hover = true;
  el.textContent = p.name;
  el.style.transform = `translate(${x + 14}px, ${y + 16}px)`;
  el.classList.add('on');
  canvas.style.cursor = 'pointer';
}

function bindPointer() {
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 500;
    down = null;
    if (moved > 7 || !quick) return;
    const h = hitAt(e.clientX, e.clientY);
    if (h && E.onPick) E.onPick(h.key, h);
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const h = hitAt(e.clientX, e.clientY);
    setHover(h?.key || null, e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerleave', () => setHover(null));
}

// Exposed for automated tests: screen position of a pickable.
export function screenOf(key) {
  const p = picks.get(key);
  if (!p) return null;
  _box.setFromObject(p.root, true);
  _box.getCenter(_c).project(E.camera);
  const rect = canvas.getBoundingClientRect();
  return { x: rect.left + (_c.x + 1) / 2 * rect.width, y: rect.top + (1 - _c.y) / 2 * rect.height };
}

// ── labels anchored to 3D points ──
const labels = new Set();
export function label(obj, offset = V(), cls = '') {
  const el = document.createElement('div');
  el.className = 'callout ' + cls;
  document.getElementById('labels').append(el);
  const L = { el, obj, offset, on: true, set(html) { if (el._h !== html) { el.innerHTML = html; el._h = html; } return L; }, show(v) { L.on = v; return L; }, remove() { el.remove(); labels.delete(L); } };
  labels.add(L);
  return L;
}
const _p = new THREE.Vector3();
function updateLabels() {
  if (!labels.size) return;
  const w = window.innerWidth, h = window.innerHeight;
  for (const L of labels) {
    if (!L.on || !L.obj.parent) { L.el.style.display = 'none'; continue; }
    _p.copy(L.offset);
    L.obj.localToWorld(_p);
    _p.project(E.camera);
    if (_p.z > 1) { L.el.style.display = 'none'; continue; }
    L.el.style.display = '';
    L.el.style.transform = `translate(${((_p.x + 1) / 2 * w).toFixed(1)}px, ${((1 - _p.y) / 2 * h).toFixed(1)}px)`;
  }
}

// ── scopes: everything an experiment adds, removed together ──
export function scope() {
  const group = new THREE.Group();
  E.scene.add(group);
  const offs = [], keys = [], lbls = [];
  return {
    group,
    add(...o) { group.add(...o); return o[0]; },
    onFrame(fn) { const off = onFrame(fn); offs.push(off); return off; },
    pickable(root, key, name, opts) { keys.push(key); return pickable(root, key, name, opts); },
    label(obj, offset, cls) { const L = label(obj, offset, cls); lbls.push(L); return L; },
    dispose() {
      offs.forEach(f => f());
      keys.forEach(unpick);
      lbls.forEach(L => L.remove());
      E.scene.remove(group);
      group.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach(m => { if (!m.userData.shared) { m.map?.dispose(); m.dispose(); } });
      });
    },
  };
}
