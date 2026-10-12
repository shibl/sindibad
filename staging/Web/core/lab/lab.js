// «جزيرة العلوم» — the science island, played in 3D (three.js).
//
// The grade-6 science book (semester 1) as an island of ten places, one
// district per unit: the forest and the pond (living things), the forces
// arena, the friction slopes and the farm yard (forces and work), the body
// dome and the skin pavilion (excretion and the skin), the builders' ramp,
// the machines square and قلعة الحصن on the hill (simple machines). Each
// place holds quests; each quest teaches first («أتعلّم»: the book's
// experiments, played) and then asks (games.js). The helper «شرارة», a little
// lab robot, explains every step. A finished quest records stars for its
// topic (plugins/science/ holds the quick reviews) and lights a crystal in
// the lighthouse; seventeen crystals light its beam.
//
// Content: worlds/grade6/lab.js. Models: models.js. Pictures: views.js.
// The 3D stage (camera, touch, light) is the farm's (core/farm/scene.js);
// the screen and its cards share the music island's styles (.tn-*).

import * as THREE from '../../vendor/three/three.module.min.js';
import { createStage } from '../farm/scene.js';
import { sea, Kit, rng, VC } from '../farm/models.js';
import * as M from './models.js';
import { runStep } from './games.js';
import { save } from '../save.js';
import { sfx } from '../sound.js';
import { num } from '../format.js';
import { recordResult } from '../lesson.js';
import { getTopic } from '../topics.js';
import { awardSticker } from '../stickers.js';
import { canSpeak, speak, stopSpeaking } from '../voice.js';
import { playMusic, stopMusic } from '../music.js';
import { HELPER, STATIONS, UNITS, QUESTS } from '../../worlds/grade6/lab.js';

const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
const $ = id => document.getElementById(id);
const _v = new THREE.Vector3();

// Where each place stands: [x, z], its turn, its footprint radius.
const PLACES = {
  forest: { at: [-7.6, 25], ry: 0.25, r: 5.4, make: () => M.forest() },
  pond: { at: [7.6, 18], ry: -0.25, r: 5.2, make: () => M.pond() },
  arena: { at: [-7.4, 5.6], ry: 0.2, r: 5.8, make: () => M.arena() },
  slopes: { at: [7.8, -0.5], ry: -0.25, r: 5.6, make: () => M.slopes() },
  yard: { at: [-7.6, -6.6], ry: 0.25, r: 5.3, make: () => M.yard() },
  body: { at: [7.8, -17.5], ry: -0.2, r: 5.2, make: () => M.bodyDome() },
  skin: { at: [-7.6, -19], ry: 0.25, r: 5.4, make: () => M.skinPavilion() },
  ramp: { at: [8, -30], ry: -0.3, r: 5.6, make: () => M.builders() },
  machines: { at: [-6.8, -31.5], ry: 0.25, r: 6, make: () => M.machines() },
  castle: { at: [0.8, -44], ry: 0, r: 6.5, make: () => M.castle() },
};
const LIGHTHOUSE = [12.2, 29.5];

let els, stage, hooks, built = false, failed = false;
let L;                                // this child's island save (save.world.lab)
let curve, helperObj, beacon, ring, tower;
const places = {};                    // id → { obj, pos, r, height }
const walkers = [], sparks = [];
let quest = null, selected = null, icons = {};
let sessionGain = { gained: 0, topic: null };
let seesawKick = 0, craneKick = 0, noriaKick = 0;

// ---------- Save data ----------

function labState() {
  const s = save.get();
  const w = (s.world ||= {});
  const t = (w.lab ||= {});
  t.met ??= false;
  t.done ||= {};
  return t;
}
const persist = () => save.update(() => {});
const doneCount = () => QUESTS.filter(q => L.done[q.id]).length;
const nextQuest = () => QUESTS.find(q => !L.done[q.id]) || null;
const starsOf = q => save.get().topics?.[q.topic]?.stars || 0;

// ---------- Setup ----------

export function initLab(h) { hooks = h; }

export function enterLab(region) {
  L = labState();
  sessionGain = { gained: 0, topic: null };
  els ||= grabEls();
  if (!built && !failed) build();
  if (failed) { els.goal.innerHTML = '<p>هذه الجزيرة تحتاج إلى رسوم ثلاثية الأبعاد (WebGL)، وجهازك لا يدعمها. جرّب جزيرة أخرى! ⛵</p>'; return; }
  els.title.textContent = region?.name || 'جزيرة العلوم';
  stage.start();
  stage.setEnabled(true);
  const r = stage.rig;
  r.goal.set(0.5, 0, 22.5); r.target.copy(r.goal);
  r.goalDist = r.dist = portrait() ? 98 : 58;
  deselect();
  refresh();
  setTimeout(() => {
    if (!L.met) { L.met = true; persist(); sayHelper(HELPER.hello, 'cheer'); }
    else {
      const q = nextQuest();
      sayHelper(`${HELPER.back} ${q ? `الدرس التالي: <b>${q.title}</b> في ${STATIONS[q.station].name}. اتبع السهم الذهبي! ✨` : 'أضأت المنارة كلها! اضغط 💎 لترى شعاعها.'}`);
    }
  }, TEST ? 0 : 600);
}

export function lessonReturned(after) {
  if (after?.gained > 0) { sessionGain.gained += after.gained; sessionGain.topic = after.topic; }
  stage?.start();
  refresh();
}

function leave() {
  stopSpeaking();
  if (quest) closeQuest();
  closeModal();
  stage?.stop();
  hooks.leave(sessionGain.gained > 0 ? sessionGain : undefined);
}

function grabEls() {
  const e = {
    screen: $('screen-lab'), host: $('lab-stage'), labels: $('lab-labels'), title: $('lab-title'),
    goal: $('lab-goal'), places: $('lab-places'), say: $('lab-say'), panel: $('lab-panel'), modal: $('lab-modal'),
    gems: $('lab-gems'),
  };
  $('lab-leave').addEventListener('click', () => { sfx.tap(); leave(); });
  $('lab-quests-btn').addEventListener('click', () => { sfx.tap(); openQuests(); });
  $('lab-gems-btn').addEventListener('click', () => { sfx.tap(); showLighthouse(); });
  e.say.addEventListener('click', ev => {
    if (ev.target.closest('.farm-say__voice')) { speak(e.say.querySelector('.bubble').innerHTML); return; }
    if (ev.target.closest('.farm-say__face')) { sfx.tap(); hint(); return; }
    e.say.classList.add('is-small');
  });
  e.places.addEventListener('click', ev => { const b = ev.target.closest('[data-place]'); if (b) openStation(b.dataset.place); });
  e.labels.addEventListener('click', ev => { const b = ev.target.closest('[data-place]'); if (b) { sfx.tap(); openStation(b.dataset.place); } });
  new ResizeObserver(() => { e.screen.style.setProperty('--panel-h', `${e.panel.hidden ? 0 : e.panel.offsetHeight}px`); }).observe(e.panel);
  return e;
}

const portrait = () => innerHeight > innerWidth;
const lite = () => document.body.classList.contains('lite');

// ---------- Building the island ----------

function build() {
  try {
    stage = createStage(els.host, { lite: lite(), fov: [34, 30], sky: '#cdeeff', fog: [85, 175], cls: 'tn-canvas' });
  } catch (err) {
    console.warn('The science island needs WebGL', err);
    failed = true;
    return;
  }
  const { scene, rig, sun, hemi } = stage;
  // A bright, clean morning: pale blue sky, white sun, crisp shadows.
  scene.background = skyTexture();
  hemi.color.set('#f4fbff'); hemi.groundColor.set('#8ea88a'); hemi.intensity = 1.55;
  sun.color.set('#fffaf0'); sun.intensity = 2.55;
  const sc = sun.shadow.camera;
  sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 2; sc.far = 95;
  sc.updateProjectionMatrix();
  if (lite()) sun.castShadow = false;
  rig.yaw = -0.2; rig.pitch = 0.88;
  rig.bounds = { x: 9, zMin: -42, zMax: 30 };
  rig.min = 22; rig.max = 115;

  const water = sea();
  const u = water.material.uniforms;
  u.uHalf.value.set(M.ISLE.hx - 1.5, M.ISLE.hz - 1.5); u.uR.value = 12;
  u.uShallow.value.set('#6fe6dc'); u.uDeep.value.set('#1f7fc9'); u.uFar.value.set('#dff4ff');
  water.position.z = M.ISLE.cz;
  scene.add(water);
  scene.add(M.terrain());
  curve = M.pathCurve();
  scene.add(M.pathRibbon(curve));

  for (const [id, def] of Object.entries(PLACES)) {
    const obj = def.make();
    const [x, z] = def.at, y = M.levelAt(z);
    obj.position.set(x, y, z);
    obj.rotation.y = def.ry;
    obj.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(obj);
    stage.addClickable(obj, id);
    places[id] = { obj, pos: new THREE.Vector3(x, y, z), r: def.r, height: obj.userData.height || 5 };
  }
  // toys: the seesaw, the crane, the noria
  const mu = places.machines.obj.userData;
  stage.addClickable(mu.beam, 'seesaw'); stage.addClickable(mu.noria, 'noria'); stage.addClickable(mu.hook, 'crane');

  tower = M.lighthouse(QUESTS.length);
  tower.position.set(LIGHTHOUSE[0], M.levelAt(LIGHTHOUSE[1]), LIGHTHOUSE[1]);
  tower.traverse(o => { if (o.isMesh && !o.material.transparent) o.castShadow = true; });
  scene.add(tower);
  stage.addClickable(tower, 'tower');

  decorate(scene);

  helperObj = M.helperBot();
  scene.add(helperObj);
  helperObj.position.set(4, M.pathY(28), 28);

  beacon = M.beaconArrow();
  scene.add(beacon);
  ring = M.selectRing(1);
  ring.visible = false;
  scene.add(ring);

  for (let i = 0; i < (lite() ? 8 : 16); i++) {
    const s = M.sparkSprite(['✦', '★', '✧', '⚡'][i % 4], ['#ffd23f', '#6fe6dc', '#f28c3a', '#e8537a'][i % 4]);
    s.visible = false;
    s.userData = { t: 1 };
    scene.add(s);
    sparks.push(s);
  }

  icons = stage.snapshots([{ id: 'helper', object: M.helperBot(), yaw: 0.35, pitch: 0.2, pad: 1.05 }]);
  els.say.querySelector('.farm-say__face img').src = icons.helper || '';
  stage.onFrame(animate);
  stage.onTap(tap);
  buildPlaceButtons();
  built = true;
}

function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#7cc7ff'); grd.addColorStop(0.55, '#c8ecff'); grd.addColorStop(1, '#eefaff');
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Trees, bushes, rocks, lamps and people, mostly merged into one mesh.
function decorate(scene) {
  const r = rng(21), k = new Kit(), glowK = new Kit();
  const trees = [0, 3, 0, 1, 3, 0, 2, 3].map((kind, i) => M.treeGeo(kind, i + 3));
  const bushes = [1, 2, 3, 4].map(s => M.bushGeo(s, ['#6ab44c', '#7cc35a', '#5fae4a', '#8fd06a'][s % 4]));
  const rocks = [1, 2, 3].map(s => M.rockGeo(s, 0.45 + s * 0.12));
  const pathPts = curve.getSpacedPoints(140);
  const nearPath = (x, z, d) => pathPts.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < d * d);
  const nearPlace = (x, z, pad) => Object.values(places).some(p => (p.pos.x - x) ** 2 + (p.pos.z - z) ** 2 < (p.r + pad) ** 2);
  const inside = (x, z, hx, hz) => (Math.abs(x) / hx) ** 5 + (Math.abs(z + 6.5) / hz) ** 5 < 1;
  const n = lite() ? 80 : 160;
  for (let i = 0, made = 0; i < 1100 && made < n; i++) {
    const x = (r() - 0.5) * 31, z = -46 + r() * 82;
    if (!inside(x, z, 14.6, 40.4) || [12, -12, -38].some(b => Math.abs(z - b) < 1.6)) continue;
    if (nearPath(x, z, 2.4) || nearPlace(x, z, 0.8) || Math.hypot(x - LIGHTHOUSE[0], z - LIGHTHOUSE[1]) < 3) continue;
    const y = M.levelAt(z), roll = r();
    if (roll < 0.55) M.put(k, trees[Math.floor(r() * trees.length)], x, y, z, r() * 6, 0.8 + r() * 0.5);
    else if (roll < 0.88) M.put(k, bushes[Math.floor(r() * bushes.length)], x, y, z, r() * 6, 0.8 + r() * 0.6);
    else M.put(k, rocks[Math.floor(r() * rocks.length)], x, y, z, r() * 6, 1);
    made += 1;
  }
  for (let i = 0; i < 52; i++) {
    const t = (i / 52) * Math.PI * 2 + r() * 0.1, c = Math.cos(t), s = Math.sin(t);
    const x = Math.sign(c) * Math.abs(c) ** 0.5 * 17.4, z = -6.5 + Math.sign(s) * Math.abs(s) ** 0.5 * 43.1;
    if (Math.hypot(x - 14, z - 33) < 4) continue;
    M.put(k, rocks[i % 3], x, 0.3, z, r() * 6, 0.8 + r() * 0.7);
  }
  // lamp posts along the path
  const lamp = M.lampGeo();
  let side = 1;
  for (let t = 0.04; t < 0.97; t += 0.06) {
    const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const nx = -tg.z * side, nz = tg.x * side, l = Math.hypot(nx, nz) || 1;
    const x = p.x + (nx / l) * 1.9, z = p.z + (nz / l) * 1.9, y = M.pathY(z);
    if (!nearPlace(x, z, -0.4)) {
      M.put(k, lamp, x, y, z, 0);
      if (!lite() || side > 0) { const gl = M.glow('#fff1b8', 1.3, 0.5); gl.position.set(x, y + 2.15, z); scene.add(gl); }
    }
    side = -side;
  }
  // visitors at the places
  const at = (id, lx, lz, ry, seed, opts) => { const p = places[id], c = Math.cos(p.obj.rotation.y), s = Math.sin(p.obj.rotation.y); M.put(k, M.personGeo(seed, opts), p.pos.x + lx * c + lz * s, p.pos.y + 0.55, p.pos.z - lx * s + lz * c, ry + p.obj.rotation.y, 1); };
  at('pond', 3.4, 3.6, -2.6, 3); at('body', 2.6, 3.8, -2.4, 4); at('body', -2.8, 3.6, 2.6, 5, { prop: 'book' });
  at('skin', 3.6, 2.8, -2, 6); at('castle', 2.4, 6.6, Math.PI, 7); at('castle', -1.6, 6.8, Math.PI, 8, { prop: 'book' });
  const decor = k.mesh();
  decor.castShadow = !lite();
  scene.add(decor);
  for (let i = 0; i < (lite() ? 3 : 6); i++) {
    const m = new THREE.Mesh(M.personGeo(30 + i), VC);
    m.castShadow = true;
    m.userData = { t: (i / 6 + 0.05) % 1, dir: i % 2 ? 1 : -1, off: (i % 3 - 1) * 0.6, speed: 0.55 + (i % 3) * 0.12 };
    scene.add(m);
    walkers.push(m);
  }
}

function buildPlaceButtons() {
  els.places.innerHTML = Object.entries(STATIONS).map(([id, s]) => `<button data-place="${id}">${s.icon} ${s.name}</button>`).join('');
}

// ---------- Every frame ----------

const labelEls = {};
function animate(dt, t) {
  const { rig, sun } = stage;
  sun.position.set(rig.target.x - 16, 32, rig.target.z + 10);
  sun.target.position.set(rig.target.x, 0, rig.target.z - 2);
  const busy = id => quest?.def.station === id;

  // the forest's bird circles the tree of life
  const fu = places.forest.obj.userData;
  fu.bird.position.set(-0.6 + Math.cos(t * 0.7) * 3, fu.height - 1.4 + Math.sin(t * 2) * 0.3, -0.8 + Math.sin(t * 0.7) * 2.6);
  fu.bird.rotation.set(0, -t * 0.7, Math.sin(t * 8) * 0.2);
  // ducks paddle round the pond
  for (const d of places.pond.obj.userData.ducks) { const u = d.userData; u.a += dt * 0.35; d.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 3 + u.r) * 0.02, -0.2 + Math.sin(u.a) * u.r); d.rotation.y = -u.a; }
  // the spring scale bounces
  const au = places.arena.obj.userData, bob = Math.sin(t * (busy('arena') ? 3.4 : 1.6));
  au.weight.position.y = au.baseY + 1.8 - bob * 0.25;
  au.spring.scale.y = 3.2 + bob * 0.45;
  au.spring.position.y = au.baseY + 2.9 - bob * 0.12;
  // blocks slide down the friction lanes: glass fastest, felt slowest
  const su = places.slopes.obj.userData;
  for (const b of su.blocks) {
    const sp = [0.36, 0.24, 0.13][b.userData.i];
    b.userData.t = (b.userData.t + dt * sp) % 1.4;
    const k = Math.min(1, b.userData.t), z = -2.6 + k * 4.6, y = su.baseY + 2.35 - k * 1.95 + 0.25;
    b.position.set(b.userData.x, y, z);
    b.rotation.x = -0.42;
  }
  const sk = (t * 0.25) % 1;
  su.skier.position.set(3.4 - sk * 1.1, su.baseY + 2.6 - sk * 2.5, -2.9 + sk * 1.6);
  // the horse nods
  const yu = places.yard.obj.userData;
  yu.horse.position.y = yu.baseY + Math.abs(Math.sin(t * 2.4)) * 0.04;
  yu.horse.rotation.z = Math.sin(t * 1.2) * 0.02;
  // the body dome glows; the bladder fills and empties
  const bu = places.body.obj.userData;
  bu.organ.rotation.y = Math.sin(t * 0.5) * 0.4;
  bu.bladder.scale.set(1.1 + Math.sin(t * 0.9) * 0.12, 0.8 + Math.sin(t * 0.9) * 0.1, 0.9);
  // the giant fingerprint turns
  places.skin.obj.userData.print.rotation.z = t * 0.3;
  // the barrel rolls up the builders' ramp
  const ru = places.ramp.obj.userData, rk = (t * 0.22) % 1;
  ru.barrel.position.set(2.4 - rk * 4, ru.baseY + 0.4 + rk * 1.3, -1.6);
  ru.barrel.rotation.y = rk * 9;
  // the seesaw rocks, the crane lifts, the noria turns, the well's bucket bobs
  const mu = places.machines.obj.userData;
  seesawKick = Math.max(0, seesawKick - dt);
  mu.beam.rotation.z = Math.sin(t * (seesawKick ? 5 : 1.1)) * (seesawKick ? 0.32 : 0.18);
  craneKick = Math.max(0, craneKick - dt);
  const lift = (Math.sin(t * (craneKick ? 2.2 : 0.8)) + 1) / 2;
  mu.rope.scale.y = 0.6 + lift * 1.8; mu.rope.position.y = -mu.rope.scale.y / 2 + 0.5;
  mu.hook.children[1].position.y = -mu.rope.scale.y;
  noriaKick = Math.max(0, noriaKick - dt);
  mu.noria.rotation.z -= dt * (noriaKick ? 1.8 : 0.45);
  mu.bucket.position.y = mu.baseY + 1.2 + Math.sin(t * 1.1) * 0.3;
  // the lighthouse: one crystal per finished quest; all of them light the beam
  const tu = tower.userData, n = doneCount(), all = n === QUESTS.length;
  tu.crystals.forEach((c, i) => { c.rotation.y = t * 1.5 + i; c.material.emissive.set(i < n ? '#ffb020' : '#000000'); c.material.color.set(i < n ? '#ffe680' : '#8fa3b0'); });
  tu.lamp.material.opacity = 0.15 + (n / QUESTS.length) * 0.75 + Math.sin(t * 3) * 0.05;
  tu.beam.material.opacity = all ? 0.22 : 0;
  if (all) tu.beamPivot.rotation.y = t * 0.6;
  // people walk the path
  for (const w of walkers) {
    const u = w.userData;
    u.t += (dt * u.speed * u.dir) / 90;
    if (u.t > 0.97 || u.t < 0.03) { u.dir *= -1; u.t = Math.min(0.97, Math.max(0.03, u.t)); }
    const p = curve.getPointAt(u.t), tg = curve.getTangentAt(u.t), l = Math.hypot(tg.x, tg.z) || 1;
    w.position.set(p.x - (tg.z / l) * u.off, M.pathY(p.z) + Math.abs(Math.sin(t * 7 + u.off * 3)) * 0.05, p.z + (tg.x / l) * u.off);
    w.rotation.y = Math.atan2(tg.x * u.dir, tg.z * u.dir);
  }
  stepHelper(dt, t);
  const nq = nextQuest();
  beacon.visible = !!nq && !quest;
  if (nq) { const p = places[nq.station]; beacon.position.set(p.pos.x, p.pos.y + p.height + 1.6 + Math.sin(t * 3) * 0.25, p.pos.z); beacon.rotation.y = t * 1.5; }
  if (ring.visible) ring.material.opacity = 0.6 + Math.sin(t * 4) * 0.25;
  spawnT -= dt;
  if (spawnT <= 0) { spawnT = lite() ? 1.8 : 0.9; const ids = Object.keys(places); const p = places[selected || ids[Math.floor(Math.random() * ids.length)]]; spawnSpark(p.pos.x + (Math.random() - 0.5) * 3, p.pos.y + p.height * 0.7, p.pos.z + (Math.random() - 0.5) * 2); }
  for (const s of sparks) {
    if (!s.visible) continue;
    const u = s.userData;
    u.t += dt / 2.2;
    s.position.y += dt * 1.1;
    s.position.x += Math.sin(u.t * 9 + u.p) * dt * 0.5;
    s.material.opacity = Math.min(1, (1 - u.t) * 2.5);
    if (u.t >= 1) s.visible = false;
  }
  viewOffset();
  drawLabels();
}
let spawnT = 0;

let offsetFor = -1;
function viewOffset() {
  const cam = stage.camera, W = els.host.clientWidth, H = els.host.clientHeight;
  const lift = quest && !els.panel.hidden ? Math.round(Math.min(els.panel.offsetHeight, H * 0.7) * 0.5) : 0;
  const key = lift * 100000 + W * 7 + H;
  if (key === offsetFor) return;
  offsetFor = key;
  if (lift) cam.setViewOffset(W, H, 0, lift, W, H); else cam.clearViewOffset();
}
function spawnSpark(x, y, z) {
  const s = sparks.find(sp => !sp.visible);
  if (!s) return;
  s.position.set(x, y, z);
  s.userData.t = 0; s.userData.p = Math.random() * 6;
  s.visible = true;
}

function drawLabels() {
  const hide = !!quest || !els.modal.hidden;
  const nq = nextQuest();
  for (const [id, p] of Object.entries(places)) {
    let el = labelEls[id];
    if (!el) {
      el = labelEls[id] = document.createElement('button');
      el.className = 'tn-tag lb-tag';
      el.dataset.place = id;
      el.style.setProperty('--unit', UNITS[STATIONS[id].unit].color);
      el.tabIndex = -1;
      els.labels.append(el);
    }
    const qs = QUESTS.filter(q => q.station === id);
    const done = qs.filter(q => L.done[q.id]).length;
    const html = `<span>${STATIONS[id].icon}</span><b>${STATIONS[id].name}</b>${qs.length ? `<i>${done === qs.length ? '✔' : `${num(done)}/${num(qs.length)}`}</i>` : ''}`;
    if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
    const s = stage.project(_v.set(p.pos.x, p.pos.y + p.height + 0.3, p.pos.z));
    el.hidden = hide || !s.on;
    el.classList.toggle('is-next', nq?.station === id);
    el.classList.toggle('is-done', !!qs.length && done === qs.length);
    el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
  }
}

// ---------- The helper ----------

let helperGoal = new THREE.Vector3(), hopT = 0;
function stepHelper(dt, t) {
  const r = stage.rig;
  if (selected) { const p = places[selected]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); helperGoal.set(p.pos.x + fx * (p.r + 0.6) + Math.cos(r.yaw) * 2.2, 0, p.pos.z + fz * (p.r + 0.6) - Math.sin(r.yaw) * 2.2); }
  else { const pt = closestPathPoint(r.target.x, r.target.z + 4); helperGoal.set(pt.x + 1.2, 0, pt.z); }
  const h = helperObj.position, dx = helperGoal.x - h.x, dz = helperGoal.z - h.z, dist = Math.hypot(dx, dz);
  const step = Math.min(dist, dt * 7);
  if (dist > 0.05) { h.x += (dx / dist) * step; h.z += (dz / dist) * step; }
  const moving = dist > 0.3;
  hopT = Math.max(0, hopT - dt);
  const ground = Math.max(M.pathY(h.z), M.levelAt(h.z));
  h.y = ground + 0.4 + Math.abs(Math.sin(t * (moving ? 9 : 2.6))) * (moving ? 0.35 : 0.12) + Math.sin(hopT * Math.PI) * 1.1;
  helperObj.rotation.y = moving ? Math.atan2(dx, dz) : r.yaw + Math.sin(t * 1.2) * 0.25;
  const hu = helperObj.userData;
  hu.shine.material.opacity = 0.55 + Math.sin(t * 5) * 0.25 + (hopT ? 0.3 : 0);
}
const _pts = [];
function closestPathPoint(x, z) {
  if (!_pts.length) _pts.push(...curve.getSpacedPoints(90));
  return _pts.reduce((b, p) => ((p.x - x) ** 2 + (p.z - z) ** 2 < (b.x - x) ** 2 + (b.z - z) ** 2 ? p : b));
}

function sayHelper(html, mood = 'happy') {
  if (!html) return;
  stopSpeaking();
  const b = els.say.querySelector('.bubble');
  els.say.hidden = false;
  els.say.classList.remove('is-small');
  els.say.dataset.mood = mood;
  els.say.querySelector('.farm-say__name').textContent = HELPER.name;
  b.innerHTML = html;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  els.say.querySelector('.farm-say__voice').hidden = !canSpeak();
  for (let i = 0; i < 4; i++) setTimeout(() => sfx.blip(HELPER.pitch), i * 70);
  if (mood === 'cheer') hopT = 1;
}

function hint() {
  hopT = 1;
  if (quest) { const st = quest.def.steps[quest.i]; sayHelper(st.hint || st.say || 'اضغط على ما يلمع لتكتشفه! ✨', 'think'); return; }
  const q = nextQuest();
  sayHelper(q ? `الدرس التالي: <b>${q.title}</b> في ${STATIONS[q.station].name}. اضغط على اسم المكان الذي فوقه السهم الذهبي! ✨` : 'أضأت المنارة كلها! 💎 اضغط على المنارة لترى شعاعها.', 'think');
}

// ---------- Tapping the island ----------

function tap(id) {
  if (quest) return;
  if (!id) { deselect(); return; }
  if (id === 'seesaw') { seesawKick = 2; sfx.tap(); return; }
  if (id === 'crane') { craneKick = 3; sfx.tap(); return; }
  if (id === 'noria') { noriaKick = 3; sfx.tap(); return; }
  if (id === 'tower') { showLighthouse(); return; }
  openStation(id);
}

function select(id, { close = false } = {}) {
  selected = id;
  const p = places[id];
  ring.visible = true;
  ring.scale.setScalar(p.r + 0.4);
  ring.position.set(p.pos.x, p.pos.y + 0.66, p.pos.z);
  stage.focus(_v.set(p.pos.x, 0, p.pos.z - 1), close ? (portrait() ? 38 : 44) : (portrait() ? 46 : 40));
}
function deselect() { selected = null; if (ring) ring.visible = false; }

function showLighthouse() {
  const n = doneCount();
  deselect();
  stage.focus(_v.set(tower.position.x, 0, tower.position.z), portrait() ? 40 : 34);
  sayHelper(n === QUESTS.length ? 'المنارة مضاءة كلها! 💎 كل بلّورة فيها درس أتقنته. شعاعها يرشد السفن الآن.' : `في المنارة ${num(n)} من ${num(QUESTS.length)} بلّورات مضيئة. كل درس تُنهيه يضيء بلّورة جديدة! 💎`, n ? 'cheer' : 'happy');
}

// ---------- Cards ----------

function openStation(id) {
  if (quest) return;
  select(id);
  const st = STATIONS[id], qs = QUESTS.filter(q => q.station === id), unit = UNITS[st.unit];
  const extra = { machines: '⚙️ اضغط على الأرجوحة أو الرافعة أو الناعورة لتعمل!' }[id] || '';
  openModal(`
    <h3>${st.icon} ${st.name}</h3>
    <p class="fm-sub lb-unit" style="--unit:${unit.color}">الوحدة ${num(st.unit)}: ${unit.name}</p>
    ${extra ? `<p class="fm-sub">${extra}</p>` : ''}
    <ul class="fm-quests">${qs.map(q => {
      const s = starsOf(q), done = !!L.done[q.id];
      return `<li class="fm-q ${done ? 'is-done' : 'is-now'}">
        <span class="fm-q__icon">${q.icon}</span>
        <span class="fm-q__text"><b>${q.title}</b><small>${done ? `${'★'.repeat(s)}${'☆'.repeat(3 - s)} • ` : ''}من الكتاب: ${q.book.map(b => `«${b}»`).join('، ')}</small></span>
        <span class="tn-qbtns"><button class="btn btn--gold fm-q__btn" data-start="${q.id}">${done ? '↻ العب مجدداً' : 'ابدأ ▶'}</button>${done ? `<button class="btn btn--ghost fm-q__btn" data-review="${q.topic}">🔁 راجع</button>` : ''}</span>
      </li>`;
    }).join('')}</ul>`, root => {
    root.addEventListener('click', e => {
      const s = e.target.closest('[data-start]');
      if (s) { sfx.tap(); closeModal(); runQuest(QUESTS.find(q => q.id === s.dataset.start)); return; }
      const r = e.target.closest('[data-review]');
      if (r) { sfx.tap(); closeModal(); stage.stop(); hooks.startLesson(r.dataset.review); }
    });
  });
}

function openQuests() {
  openModal(`
    <h3>📜 دروس جزيرة العلوم</h3>
    <p class="fm-sub">كل درس يضيء بلّورة في المنارة. 💎 ${num(doneCount())} من ${num(QUESTS.length)}</p>
    <ul class="fm-quests">${QUESTS.map(q => {
      const s = starsOf(q), done = !!L.done[q.id], now = nextQuest() === q, st = STATIONS[q.station];
      return `<li class="fm-q ${done ? 'is-done' : now ? 'is-now' : ''}">
        <span class="fm-q__icon">${q.icon}</span>
        <span class="fm-q__text"><b>${q.title}</b><small>${done ? `${'★'.repeat(s)}${'☆'.repeat(3 - s)} • ` : ''}${st.icon} ${st.name}</small></span>
        <button class="btn ${done ? 'btn--ghost' : 'btn--gold'} fm-q__btn" data-quest="${q.id}">${done ? '↻' : 'ابدأ ▶'}</button>
      </li>`;
    }).join('')}</ul>`, root => {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-quest]');
      if (!b) return;
      sfx.tap(); closeModal();
      runQuest(QUESTS.find(q => q.id === b.dataset.quest));
    });
  });
}

function openModal(html, wire, { keep = false } = {}) {
  els.modal.innerHTML = `<div class="fm-card-wrap" role="dialog" aria-modal="true">${keep ? '' : '<button class="fm-x" data-close aria-label="إغلاق">✕</button>'}${html}</div>`;
  els.modal.hidden = false;
  stage?.setEnabled(false);
  els.modal.onclick = e => { if ((!keep && e.target === els.modal) || e.target.closest('[data-close]')) { sfx.tap(); closeModal(); } };
  wire?.(els.modal);
  els.modal.querySelector('button')?.focus({ preventScroll: true });
}
function closeModal() {
  if (!els?.modal || els.modal.hidden) return;
  els.modal.hidden = true;
  els.modal.innerHTML = '';
  if (!quest) stage?.setEnabled(true);
}

// ---------- Playing a quest ----------

async function runQuest(def) {
  if (quest || !def) return;
  const abort = new AbortController();
  quest = { def, abort, i: 0 };
  select(def.station, { close: true });
  stage.setEnabled(false);
  stopMusic();
  els.screen.classList.add('has-panel');
  els.panel.hidden = false;
  const steps = def.steps;
  els.panel.innerHTML = `<div class="tn-sheet lb-sheet" role="dialog" aria-label="${def.title}" style="--unit:${UNITS[STATIONS[def.station].unit].color}">
    <header class="tn-head"><span class="tn-head__icon">${def.icon}</span><b>${def.title}</b>
      <span class="tn-dots">${steps.map(x => `<i${x.kind === 'explore' ? ' class="is-learn"' : ''}></i>`).join('')}</span>
      <button class="tn-x" data-quit aria-label="إغلاق الدرس">✕</button></header>
    <div class="tn-body"></div></div>`;
  els.panel.querySelector('[data-quit]').addEventListener('click', () => { sfx.tap(); closeQuest(); sayHelper('لا بأس! نكمل الدرس متى شئت. 🔬'); });
  const body = els.panel.querySelector('.tn-body'), dots = [...els.panel.querySelectorAll('.tn-dots i')];
  const p = places[def.station];
  const ctx = {
    say: sayHelper, sfx, signal: abort.signal,
    onSpot: () => spawnSpark(p.pos.x + (Math.random() - 0.5) * 3, p.pos.y + p.height * 0.6, p.pos.z + (Math.random() - 0.5) * 2),
  };
  let ok = 0, total = 0;
  const stopped = new Promise(r => abort.signal.addEventListener('abort', () => r(null), { once: true }));
  for (let i = 0; i < steps.length; i++) {
    quest.i = i;
    dots.forEach((d, k) => { d.classList.toggle('is-on', k < i); d.classList.toggle('is-now', k === i); });
    const host = document.createElement('div');
    host.className = 'tn-step';
    body.replaceChildren(host);
    body.scrollTop = 0;
    if (steps[i].kind !== 'explore' && !steps[i].say) els.say.classList.add('is-small');
    const res = await Promise.race([runStep(steps[i], host, ctx), stopped]);
    if (!res || abort.signal.aborted) return;
    ok += res.ok; total += res.total;
  }
  closeQuest();
  await finishQuest(def, ok, total);
}

function closeQuest() {
  if (!quest) return;
  quest.abort.abort();
  quest = null;
  els.panel.hidden = true;
  els.panel.innerHTML = '';
  els.screen.classList.remove('has-panel');
  stage.setEnabled(true);
  playMusic('science');
}

async function finishQuest(def, ok, total) {
  const topic = getTopic(def.topic);
  const before = save.get().topics?.[def.topic]?.stars || 0;
  const res = recordResult(def.topic, { correct: ok, total: Math.max(1, total) });
  const after = save.get().topics?.[def.topic]?.stars || 0;
  if (after > before && topic) { sessionGain.gained += after - before; sessionGain.topic = topic; }
  const first = !L.done[def.id];
  L.done[def.id] = true;
  persist();
  refresh();
  const stars = res?.stars ?? 0;
  sfx.win();
  for (let i = 0; i < stars; i++) setTimeout(() => sfx.star(i), 600 + i * 260);
  const p = places[def.station];
  for (let i = 0; i < 8; i++) setTimeout(() => spawnSpark(p.pos.x + (Math.random() - 0.5) * 4, p.pos.y + p.height * 0.6, p.pos.z + (Math.random() - 0.5) * 3), i * 90);
  const next = nextQuest();
  const score = Math.round(ok * 10) / 10;
  await new Promise(resolve => {
    openModal(`
      <div class="fm-done">
        <div class="fm-done__rays" aria-hidden="true"></div>
        <p class="fm-kicker">درس مكتمل!</p>
        <h3>${def.icon} ${def.title}</h3>
        <div class="fm-stars">${[0, 1, 2].map(i => `<span class="${i < stars ? 'is-on' : ''}" style="--i:${i}">★</span>`).join('')}</div>
        <div class="fm-learned"><b>📖 تعلّمنا من كتاب «العلوم»:</b><ul>${def.learned.map(l => `<li>${l}</li>`).join('')}</ul></div>
        <p class="fm-chips">${first ? '<span>+1 💎 بلّورة في المنارة</span>' : ''}${res?.pearls ? `<span>+${num(res.pearls)} 🦪</span>` : ''}<span>✔ ${num(score)}/${num(total)}</span></p>
        ${next ? `<p class="fm-next">الدرس التالي: <b>${next.icon} ${next.title}</b></p>` : '<p class="fm-next"><b>🎉 أضأت المنارة كلها!</b></p>'}
        <button class="btn btn--gold" data-close>تابِع</button>
      </div>`, root => { root.querySelector('[data-close]').addEventListener('click', () => setTimeout(resolve, 0)); }, { keep: true });
  });
  if (first && def.sticker) awardSticker('science', def.sticker);
  deselect();
  if (first && doneCount() === QUESTS.length) showLighthouse();
  else if (next) sayHelper(`أحسنت! 💎 أضأنا بلّورة جديدة في المنارة. الدرس التالي: <b>${next.title}</b> في ${STATIONS[next.station].name}. اتبع السهم الذهبي! ✨`, 'cheer');
}

// ---------- HUD ----------

function refresh() {
  els.gems.textContent = num(doneCount());
  const q = nextQuest();
  const html = q
    ? `<span>${q.icon}</span><p>الدرس ${num(QUESTS.indexOf(q) + 1)} من ${num(QUESTS.length)}: <b>${q.title}</b> — ${STATIONS[q.station].name}</p>`
    : '<span>💎</span><p><b>أنهيت دروس الجزيرة كلها!</b> المنارة مضاءة، وكل الدروس تنتظر المراجعة 🔁</p>';
  if (els.goal.dataset.html !== html) { els.goal.innerHTML = html; els.goal.dataset.html = html; }
}

// ---------- Test hooks ----------

export function debugLook(x, z, dist, yaw) {
  const r = stage.rig;
  r.goal.set(x, 0, z); r.target.copy(r.goal);
  r.goalDist = r.dist = dist;
  if (yaw != null) r.yaw = yaw;
  r.min = 5; r.max = 220; r.bounds = { x: 99, zMin: -99, zMax: 99 };
}
export function debugStart(id) { closeModal(); runQuest(QUESTS.find(q => q.id === id)); }
export function debugLab() {
  const info = stage?.renderer.info.render;
  return { calls: info?.calls, triangles: info?.triangles, L: labState(), next: nextQuest()?.id || null, quest: quest?.def.id || null, step: quest?.i ?? null, kind: quest ? quest.def.steps[quest.i].kind : null, places: Object.keys(places), selected };
}
