// «جزيرة الأنغام» — the music island, played in 3D (three.js).
//
// A toy-diorama island where the grade-6 music book is played instead of
// read: eight places along a winding path (the giant grand piano, the glass
// pavilion, the drum circle, the metronome tower, the cloud over the grand
// staff, the music library, the basalt theatre, the harbour of world
// instruments). Each place holds one or two quests; each quest is a few
// steps of real music — play the scale, tap a rhythm on the drum, rain notes
// onto the staff, tune glasses by the book's fractions (games.js). The
// helper «نغمة» explains every step. A finished quest records stars for its
// topic like a lesson (plugins/music/ holds the quick reviews), and hangs a
// golden note on the rainbow gate; ten notes make the «sky song».
//
// Between quests the island is a toy to play with: the piano's keys, the
// darbuka, the metronome and (once made) the water glasses all sound.
//
// Content: worlds/grade6/tunes.js. Models: models.js. Sounds: synth.js.
// The 3D stage (camera, touch, light) is the farm's (core/farm/scene.js).

import * as THREE from '../../vendor/three/three.module.min.js';
import { createStage } from '../farm/scene.js';
import { sea, Kit, rng, VC } from '../farm/models.js';
import * as M from './models.js';
import * as S from './synth.js';
import { runStep, glassFreq, GLASS_COLORS } from './games.js';
import { save } from '../save.js';
import { sfx } from '../sound.js';
import { num } from '../format.js';
import { recordResult } from '../lesson.js';
import { getTopic } from '../topics.js';
import { awardSticker } from '../stickers.js';
import { canSpeak, speak, stopSpeaking } from '../voice.js';
import { playMusic, stopMusic } from '../music.js';
import { HELPER, STATIONS, QUESTS, GLASSES, SKY_SONG } from '../../worlds/grade6/tunes.js';

const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
const $ = id => document.getElementById(id);
const _v = new THREE.Vector3();

// Where each place stands: [x, z], its turn, and its footprint radius.
const PLACES = {
  harbor: { at: [9.5, 29], ry: -0.25, r: 3.8, make: () => M.harbor() },
  piano: { at: [-6.2, 21.5], ry: 0.3, r: 5.3, make: () => M.grandPiano() },
  glasses: { at: [7.2, 8.5], ry: -0.3, r: 4.0, make: () => M.glassPavilion(GLASSES.map(g => ({ id: g.id, color: GLASS_COLORS[g.id] }))) },
  drums: { at: [-7.2, 0.5], ry: 0.25, r: 4.7, make: () => M.drumCircle() },
  metronome: { at: [7.8, -5.2], ry: -0.15, r: 5.6, make: () => M.metronomeTower() },
  cloud: { at: [-6.6, -17.5], ry: 0.25, r: 4.6, make: () => M.staffCloud() },
  library: { at: [9.0, -19.5], ry: -0.4, r: 4.0, make: () => M.musicLibrary() },
  theatre: { at: [-1.2, -30.8], ry: 0, r: 7.0, make: () => M.theatre() },
};

let els, stage, hooks, built = false, failed = false;
let T;                                // this child's island save (save.world.tunes)
let curve, gate, helperObj, car, rain, beacon, ring;
const places = {};                    // id → { obj, pos, r, height }
const walkers = [], sprites = [], keyAnim = new Map(), glassAnim = new Map();
let quest = null;                     // the quest being played
let selected = null, icons = {};
let tempo = 70, tempoUntil = 0, pendPhase = 0, carAngle = 0, drumBounce = 0, keyTaps = 0;
let sessionGain = { gained: 0, topic: null };

// ---------- Save data ----------

function tunesState() {
  const s = save.get();
  const w = (s.world ||= {});
  const t = (w.tunes ||= {});
  t.met ??= false;
  t.done ||= {};            // quest id → true once finished
  return t;
}
const persist = () => save.update(() => {});
const doneCount = () => QUESTS.filter(q => T.done[q.id]).length;
const nextQuest = () => QUESTS.find(q => !T.done[q.id]) || null;
const starsOf = q => save.get().topics?.[q.topic]?.stars || 0;

// ---------- Setup ----------

export function initTunes(h) { hooks = h; }

export function enterTunes(region) {
  T = tunesState();
  sessionGain = { gained: 0, topic: null };
  els ||= grabEls();
  if (!built && !failed) build();
  if (failed) { els.goal.innerHTML = '<p>هذه الجزيرة تحتاج إلى رسوم ثلاثية الأبعاد (WebGL)، وجهازك لا يدعمها. جرّب جزيرة أخرى! ⛵</p>'; return; }
  els.title.textContent = region?.name || 'جزيرة الأنغام';
  stage.start();
  stage.setEnabled(true);
  const r = stage.rig;
  r.goal.set(1.5, 0, 22.5); r.target.copy(r.goal);
  r.goalDist = r.dist = portrait() ? 84 : 52;
  deselect();
  refresh();
  setTimeout(() => {
    if (!T.met) { T.met = true; persist(); sayHelper(HELPER.hello, 'cheer'); }
    else sayHelper(`${HELPER.back} ${nextQuest() ? `الدرس التالي: <b>${nextQuest().title}</b> في ${STATIONS[nextQuest().station].name}. اتبع السهم الذهبي! ✨` : 'جمعت كل النوتات الذهبية! اضغط 🎵 لتسمع أغنية السماء.'}`);
  }, TEST ? 0 : 600);
}

// Back from a review lesson opened from the island.
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
    screen: $('screen-tunes'), host: $('tunes-stage'), labels: $('tunes-labels'), title: $('tunes-title'),
    goal: $('tunes-goal'), places: $('tunes-places'), say: $('tunes-say'), panel: $('tunes-panel'), modal: $('tunes-modal'),
    notes: $('tunes-notes'),
  };
  $('tunes-leave').addEventListener('click', () => { sfx.tap(); leave(); });
  $('tunes-quests-btn').addEventListener('click', () => { sfx.tap(); openQuests(); });
  $('tunes-notes-btn').addEventListener('click', () => { sfx.tap(); playSkySong(); });
  e.say.addEventListener('click', ev => {
    if (ev.target.closest('.farm-say__voice')) { speak(e.say.querySelector('.bubble').innerHTML); return; }
    if (ev.target.closest('.farm-say__face')) { sfx.tap(); hint(); return; }
    e.say.classList.add('is-small');
  });
  e.places.addEventListener('click', ev => { const b = ev.target.closest('[data-place]'); if (b) openStation(b.dataset.place); });
  e.labels.addEventListener('click', ev => { const b = ev.target.closest('[data-place]'); if (b) { sfx.tap(); openStation(b.dataset.place); } });
  // Keep the helper's speech just above the quest card.
  new ResizeObserver(() => { e.screen.style.setProperty('--panel-h', `${e.panel.hidden ? 0 : e.panel.offsetHeight}px`); }).observe(e.panel);
  return e;
}

const portrait = () => innerHeight > innerWidth;
const lite = () => document.body.classList.contains('lite');

// ---------- Building the island ----------

function build() {
  try {
    stage = createStage(els.host, { lite: lite(), fov: [34, 30], sky: '#ffdcbf', fog: [75, 160], cls: 'tn-canvas' });
  } catch (err) {
    console.warn('The music island needs WebGL', err);
    failed = true;
    return;
  }
  const { scene, rig, sun, hemi } = stage;
  // A warm late-afternoon look: peach sky, golden sun, soft long shadows.
  scene.background = skyTexture();
  hemi.color.set('#fff0e2'); hemi.groundColor.set('#9a7a6a'); hemi.intensity = 1.6;
  sun.color.set('#ffe3c2'); sun.intensity = 2.45;
  const sc = sun.shadow.camera;
  sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 2; sc.far = 90;
  sc.updateProjectionMatrix();
  if (lite()) sun.castShadow = false;
  rig.yaw = -0.22; rig.pitch = 0.9;
  rig.bounds = { x: 9, zMin: -30, zMax: 28 };
  rig.min = 22; rig.max = 110;

  const water = sea();
  const u = water.material.uniforms;
  u.uHalf.value.set(M.ISLE.hx - 1.5, M.ISLE.hz - 1.5); u.uR.value = 12;
  u.uShallow.value.set('#79e3d6'); u.uDeep.value.set('#2b8ac9'); u.uFar.value.set('#ffe2c8');
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
    obj.traverse(o => { if (o.isMesh && !o.material.transparent && !o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(obj);
    stage.addClickable(obj, id);
    places[id] = { obj, pos: new THREE.Vector3(x, y, z), r: def.r, height: obj.userData.height || 5 };
  }
  // the toy parts that sound when tapped
  for (const [n, key] of Object.entries(places.piano.obj.userData.keys)) stage.addClickable(key, `key:${n}`);
  for (const [id, gl] of Object.entries(places.glasses.obj.userData.glasses)) stage.addClickable(gl, `glass:${id}`);
  stage.addClickable(places.drums.obj.userData.drum, 'drum');

  decorate(scene);
  gate = M.rainbowGate();
  gate.position.set(3.4, M.pathY(25) + 0.05, 25.1);
  gate.rotation.y = 0.45;
  scene.add(gate);

  car = M.noteCar();
  places.metronome.obj.add(car);
  car.scale.setScalar(0.9);

  helperObj = M.helperNote();
  scene.add(helperObj);
  helperObj.position.set(4, M.pathY(26), 27);

  // rain under the cloud: falling drops, recycled
  const n = lite() ? 18 : 36;
  rain = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: '#7fd0ff' }), n);
  rain.frustumCulled = false;
  rain.userData.drops = Array.from({ length: n }, (_, i) => ({ x: (Math.random() - 0.5) * 3.6, y: Math.random(), z: (Math.random() - 0.5) * 1.6, s: 2.5 + Math.random() * 2, on: i < n / 3 }));
  places.cloud.obj.add(rain);

  beacon = M.beaconArrow();
  scene.add(beacon);
  ring = M.selectRing(1);
  ring.visible = false;
  scene.add(ring);

  // little ♪ that rise from the places
  for (let i = 0; i < (lite() ? 8 : 16); i++) {
    const s = M.noteSprite(M.NOTE_COLORS[i % 7], i % 3 ? '♪' : '♫');
    s.visible = false;
    s.userData = { t: 1 };
    scene.add(s);
    sprites.push(s);
  }

  icons = stage.snapshots([{ id: 'helper', object: M.helperNote(), yaw: 0.35, pitch: 0.2, pad: 1.05 }]);
  els.say.querySelector('.farm-say__face img').src = icons.helper || '';
  stage.onFrame(animate);
  stage.onTap(tap);
  buildPlaceButtons();
  built = true;
}

// A soft sunset gradient behind everything.
function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#a9b8ff'); grd.addColorStop(0.45, '#ffc3c8'); grd.addColorStop(1, '#ffe2c8');
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Trees, bushes, rocks, lamps, bunting and people, mostly merged into one mesh.
function decorate(scene) {
  const r = rng(12), k = new Kit(), glowK = new Kit();
  const trees = [0, 1, 2, 3, 0, 1, 3, 2].map((kind, i) => M.treeGeo(kind, i + 1));
  const bushes = [1, 2, 3, 4].map(s => M.bushGeo(s, ['#6ab44c', '#7cc35a', '#5fae4a', '#8fd06a'][s % 4]));
  const rocks = [1, 2, 3].map(s => M.rockGeo(s, 0.45 + s * 0.12));
  const pathPts = curve.getSpacedPoints(120);
  const nearPath = (x, z, d) => pathPts.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < d * d);
  const nearPlace = (x, z, pad) => Object.values(places).some(p => (p.pos.x - x) ** 2 + (p.pos.z - z) ** 2 < (p.r + pad) ** 2);
  const inside = (x, z, hx, hz) => (Math.abs(x) / hx) ** 5 + (Math.abs(z + 0.5) / hz) ** 5 < 1;
  const n = lite() ? 70 : 140;
  for (let i = 0, made = 0; i < 900 && made < n; i++) {
    const x = (r() - 0.5) * 30, z = -35 + r() * 68;
    if (!inside(x, z, 14.2, 34.4) || Math.abs(z - 14) < 1.6 || Math.abs(z + 12) < 1.6) continue;
    if (nearPath(x, z, 2.4) || nearPlace(x, z, 0.8) || Math.hypot(x - 3.4, z - 25.1) < 4.2) continue;
    const y = M.levelAt(z), roll = r();
    if (roll < 0.55) M.put(k, trees[Math.floor(r() * trees.length)], x, y, z, r() * 6, 0.8 + r() * 0.5);
    else if (roll < 0.88) M.put(k, bushes[Math.floor(r() * bushes.length)], x, y, z, r() * 6, 0.8 + r() * 0.6);
    else M.put(k, rocks[Math.floor(r() * rocks.length)], x, y, z, r() * 6, 1);
    made += 1;
  }
  // rocks and palms-ish bushes along the beach
  for (let i = 0; i < 46; i++) {
    const t = (i / 46) * Math.PI * 2 + r() * 0.1, c = Math.cos(t), s = Math.sin(t);
    const x = Math.sign(c) * Math.abs(c) ** 0.5 * 16.9, z = -0.5 + Math.sign(s) * Math.abs(s) ** 0.5 * 37.1;
    if (Math.hypot(x - 13, z - 29.5) < 4) continue;
    M.put(k, rocks[i % 3], x, 0.3, z, r() * 6, 0.8 + r() * 0.7);
  }
  // lamp posts with note lanterns along the path
  const lamp = M.lampGeo();
  let side = 1;
  for (let t = 0.05; t < 0.97; t += 0.07) {
    const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const nx = -tg.z * side, nz = tg.x * side, l = Math.hypot(nx, nz) || 1;
    const x = p.x + (nx / l) * 1.9, z = p.z + (nz / l) * 1.9, y = M.pathY(z);
    const dx = -nx / l, dz = -nz / l;
    if (!nearPlace(x, z, -0.4)) {
      M.put(k, lamp, x, y, z, Math.atan2(-dz, dx));
      const color = M.NOTE_COLORS[Math.floor(t * 20) % 7];
      M.put(glowK, M.noteGeo(color, { s: 0.55 }), x + dx * 0.45, y + 1.4, z + dz * 0.45, 0);
      if (!lite() || side > 0) { const gl = M.glow(color, 1.5, 0.55); gl.position.set(x + dx * 0.45, y + 1.65, z + dz * 0.45); scene.add(gl); }
    }
    side = -side;
  }
  // people: listeners by the places
  const at = (id, lx, lz, ry, seed, opts) => { const p = places[id], c = Math.cos(p.obj.rotation.y), s = Math.sin(p.obj.rotation.y); M.put(k, M.personGeo(seed, opts), p.pos.x + lx * c + lz * s, p.pos.y + 0.6, p.pos.z - lx * s + lz * c, ry + p.obj.rotation.y, 1); };
  at('piano', 3.6, 4.4, -2.4, 3); at('piano', 4.4, 3.4, -2.0, 4); at('piano', -4.4, 3.4, 2.4, 5, { prop: 'violin' });
  at('glasses', 0.9, 2.2, Math.PI, 6); at('library', 2.9, 2.6, -0.6, 7, { prop: 'book' }); at('library', -1.4, 3.0, 0.3, 8, { prop: 'book' });
  at('cloud', 2.5, 2.4, Math.PI - 0.2, 9); at('cloud', 3.3, 2.1, Math.PI + 0.3, 10); at('harbor', 1.2, 1.4, 0.4, 11);
  const decor = k.mesh();
  decor.castShadow = !lite();
  scene.add(decor);
  const lanterns = new THREE.Mesh(glowK.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffffff', emissiveIntensity: 0.45 }));
  scene.add(lanterns);
  // festival bunting across the path
  for (const [t, w] of [[0.16, 3.4], [0.47, 3.6], [0.76, 3.4]]) {
    const p = curve.getPointAt(t), tg = curve.getTangentAt(t), l = Math.hypot(tg.x, tg.z) || 1;
    const nx = -tg.z / l, nz = tg.x / l, y = M.pathY(p.z);
    scene.add(M.bunting([p.x + nx * w / 2 + 0.4, y, p.z + nz * w / 2], [p.x - nx * w / 2 - 0.4, y, p.z - nz * w / 2], Math.floor(t * 100)));
  }
  // people walking along the path
  for (let i = 0; i < (lite() ? 3 : 6); i++) {
    const m = new THREE.Mesh(M.personGeo(20 + i), VC);
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
  // the sun (and its shadows) follows the camera across the long island
  sun.position.set(rig.target.x - 16, 30, rig.target.z + 10);
  sun.target.position.set(rig.target.x, 0, rig.target.z - 2);

  // piano keys spring back up
  for (const [key, a] of keyAnim) {
    a.t += dt;
    key.position.y = key.userData.y - 0.14 * Math.max(0, 1 - a.t / 0.25);
    if (a.t > 0.3) { key.position.y = key.userData.y; keyAnim.delete(key); }
  }
  // glasses wobble when they ring
  for (const [gl, a] of glassAnim) {
    a.t += dt;
    const k = Math.max(0, 1 - a.t / 0.6);
    gl.scale.set(1 + Math.sin(a.t * 40) * 0.08 * k, 1, 1 + Math.cos(a.t * 40) * 0.08 * k);
    if (a.t > 0.6) { gl.scale.set(1, 1, 1); glassAnim.delete(gl); }
  }
  // the fire flickers; the darbuka bounces when hit
  const d = places.drums.obj.userData;
  d.flames.forEach((f, i) => { const s = 1 + Math.sin(t * (9 + i * 3) + i) * 0.12 + Math.sin(t * 23 + i) * 0.05; f.scale.set(1, s, 1); });
  d.fireGlow.material.opacity = 0.6 + Math.sin(t * 11) * 0.1;
  drumBounce = Math.max(0, drumBounce - dt * 4);
  d.drum.scale.set(1 + drumBounce * 0.06, 1 - drumBounce * 0.08, 1 + drumBounce * 0.06);
  // the metronome swings at the tempo; the note-car laps the track
  const bpm = performance.now() < tempoUntil ? tempo : 66;
  pendPhase += dt * Math.PI * (bpm / 60);
  places.metronome.obj.userData.pend.rotation.z = Math.sin(pendPhase) * 0.42;
  carAngle -= dt * (bpm / 60) * 0.5;
  car.position.set(Math.cos(carAngle) * M.TRACK.rx, 0.1 + Math.abs(Math.sin(t * 9)) * 0.03, Math.sin(carAngle) * M.TRACK.rz);
  car.rotation.y = Math.atan2(Math.sin(carAngle) * M.TRACK.rx, -Math.cos(carAngle) * M.TRACK.rz);
  // the cloud bobs and rains
  const cl = places.cloud.obj.userData;
  cl.cloud.position.y += Math.sin(t * 1.3) * 0.003;
  const raining = quest?.def.station === 'cloud';
  const drops = rain.userData.drops, top = cl.cloud.position.y - 0.5, m4 = new THREE.Matrix4();
  drops.forEach((dr, i) => {
    dr.on = raining || i < drops.length / 3;
    dr.y -= dt * dr.s / 6;
    if (dr.y < 0) dr.y += 1;
    const y = 0.7 + dr.y * (top - 0.7);
    m4.makeScale(dr.on ? 1 : 0, dr.on ? 2.2 : 0, dr.on ? 1 : 0).setPosition(cl.cloud.position.x + dr.x, y, dr.z + 0.4);
    rain.setMatrixAt(i, m4);
  });
  rain.instanceMatrix.needsUpdate = true;
  // the theatre's spotlights; the singer sways
  const th = places.theatre.obj.userData, onStage = quest?.def.station === 'theatre';
  th.beams.forEach((b, i) => { b.material.opacity = (onStage ? 0.26 : 0.12) + Math.sin(t * 2 + i) * 0.04; });
  th.singer.rotation.y = Math.sin(t * 1.8) * 0.3;
  th.singer.position.y = 0.78 + Math.abs(Math.sin(t * 3.6)) * (onStage ? 0.08 : 0.02);
  // ships bob in the harbour
  for (const sh of places.harbor.obj.userData.ships) { sh.position.y = sh.userData.baseY + Math.sin(t * 1.4 + sh.userData.phase) * 0.06; sh.rotation.z = Math.sin(t * 1.1 + sh.userData.phase) * 0.03; }
  // the golden note on the library dome turns
  places.library.obj.userData.note.rotation.y = t * 0.8;
  // people walk the path
  for (const w of walkers) {
    const u = w.userData;
    u.t += (dt * u.speed * u.dir) / 78;
    if (u.t > 0.98 || u.t < 0.02) { u.dir *= -1; u.t = Math.min(0.98, Math.max(0.02, u.t)); }
    const p = curve.getPointAt(u.t), tg = curve.getTangentAt(u.t);
    const l = Math.hypot(tg.x, tg.z) || 1;
    w.position.set(p.x - (tg.z / l) * u.off, M.pathY(p.z) + Math.abs(Math.sin(t * 7 + u.off * 3)) * 0.05, p.z + (tg.x / l) * u.off);
    w.rotation.y = Math.atan2(tg.x * u.dir, tg.z * u.dir);
  }
  stepHelper(dt, t);
  // the golden arrow over the next place
  const nq = nextQuest();
  beacon.visible = !!nq && !quest;
  if (nq) { const p = places[nq.station]; beacon.position.set(p.pos.x, p.pos.y + p.height + 1.6 + Math.sin(t * 3) * 0.25, p.pos.z); beacon.rotation.y = t * 1.5; }
  if (ring.visible) ring.material.opacity = 0.6 + Math.sin(t * 4) * 0.25;
  // rising notes
  spawnT -= dt;
  if (spawnT <= 0) { spawnT = lite() ? 1.6 : 0.8; const ids = Object.keys(places); const p = places[selected || ids[Math.floor(Math.random() * ids.length)]]; spawnNote(p.pos.x + (Math.random() - 0.5) * 3, p.pos.y + p.height * 0.7, p.pos.z + (Math.random() - 0.5) * 2); }
  for (const s of sprites) {
    if (!s.visible) continue;
    const u = s.userData;
    u.t += dt / 2.2;
    s.position.y += dt * 1.1;
    s.position.x += Math.sin(u.t * 9 + u.p) * dt * 0.5;
    s.material.opacity = Math.min(1, (1 - u.t) * 2.5);
    if (u.t >= 1) s.visible = false;
  }
  for (const [i, slot] of gate.userData.slots.entries()) if (slot.visible) slot.rotation.y = Math.sin(t * 2 + i) * 0.4;
  viewOffset();
  drawLabels();
}
let spawnT = 0;

// While the quest card covers the bottom of the screen, shift the camera's
// picture up so the place stays in the middle of what is still visible.
let offsetFor = -1;
function viewOffset() {
  const cam = stage.camera, W = els.host.clientWidth, H = els.host.clientHeight;
  const lift = quest && !els.panel.hidden ? Math.round(Math.min(els.panel.offsetHeight, H * 0.7) * 0.5) : 0;
  const key = lift * 100000 + W * 7 + H;
  if (key === offsetFor) return;
  offsetFor = key;
  if (lift) cam.setViewOffset(W, H, 0, lift, W, H); else cam.clearViewOffset();
}
function spawnNote(x, y, z) {
  const s = sprites.find(sp => !sp.visible);
  if (!s) return;
  s.position.set(x, y, z);
  s.userData.t = 0; s.userData.p = Math.random() * 6;
  s.visible = true;
}

// Name tags over the places; the next one bounces.
function drawLabels() {
  const hide = !!quest || !els.modal.hidden;
  const nq = nextQuest();
  for (const [id, p] of Object.entries(places)) {
    let el = labelEls[id];
    if (!el) {
      el = labelEls[id] = document.createElement('button');
      el.className = 'tn-tag';
      el.dataset.place = id;
      el.tabIndex = -1;
      els.labels.append(el);
    }
    const qs = QUESTS.filter(q => q.station === id);
    const done = qs.filter(q => T.done[q.id]).length;
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
  h.y = ground + 0.6 + Math.abs(Math.sin(t * (moving ? 9 : 3))) * (moving ? 0.5 : 0.18) + Math.sin(hopT * Math.PI) * 1.2;
  helperObj.rotation.y = moving ? Math.atan2(dx, dz) : r.yaw + Math.sin(t * 1.2) * 0.25;
  helperObj.userData.flag.rotation.z = Math.PI * 0.6 + Math.sin(t * 6) * 0.15;
}
const _pts = [];
function closestPathPoint(x, z) {
  if (!_pts.length) _pts.push(...curve.getSpacedPoints(80));
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
  if (quest) { const st = quest.def.steps[quest.i]; sayHelper(st.hint || st.say || 'اقرأ البطاقة، ثم اضغط «فهمت».', 'think'); return; }
  const q = nextQuest();
  sayHelper(q ? `الدرس التالي: <b>${q.title}</b> في ${STATIONS[q.station].name}. اضغط على اسم المكان فوقه السهم الذهبي! ✨` : 'جمعت كل النوتات الذهبية! اضغط 🎵 لتسمع أغنية السماء. 🎶', 'think');
}

// ---------- Tapping the island ----------

function tap(id) {
  if (quest) return;
  if (!id) { deselect(); return; }
  if (id.startsWith('key:')) { playKey(id.slice(4)); return; }
  if (id.startsWith('glass:')) { tapGlass(id.slice(6)); return; }
  if (id === 'drum') { drumHits += 1; S.drum(drumHits % 3 ? 'tak' : 'dum'); drumBounce = 1; spawnNote(places.drums.pos.x, places.drums.pos.y + 3.5, places.drums.pos.z - 1.5); return; }
  if (id === 'metronome' && selected === 'metronome') { S.metronome(92, 8); setTempo(92, 8 * 60 / 92); }
  openStation(id);
}
let drumHits = 0;

function playKey(note) {
  S.piano(note);
  pressKey(note);
  keyTaps += 1;
  if (keyTaps === 6 && !T.done.scale) sayHelper('ما أجمل عزفك! 🎹 لدرس السلّم الكبير اضغط على اسم المكان «البيانو العملاق».');
}
function pressKey(note) {
  const key = places.piano.obj.userData.keys[note];
  if (!key) return;
  keyAnim.set(key, { t: 0 });
  const p = key.getWorldPosition(_v);
  spawnNote(p.x, p.y + 0.6, p.z);
}
function tapGlass(id) {
  const gl = places.glasses.obj.userData.glasses[id];
  glassAnim.set(gl, { t: 0 });
  if (T.done.glasses) S.glass(glassFreq(id));
  else {
    S.glass(2400, { vol: 0.06 });
    if (!glassHinted) { glassHinted = true; sayHelper('الأكواب فارغة! اصنع آلة الأكواب أولاً في درس «آلة الأكواب». 🥛'); }
  }
}
let glassHinted = false;
function setTempo(bpm, seconds) { tempo = bpm; tempoUntil = performance.now() + seconds * 1000; }

function select(id, { close = false } = {}) {
  selected = id;
  const p = places[id];
  ring.visible = true;
  ring.scale.setScalar(p.r + 0.4);
  ring.position.set(p.pos.x, p.pos.y + 0.7, p.pos.z);
  // (With the quest card open, viewOffset() lifts the picture above the card.)
  stage.focus(_v.set(p.pos.x, 0, p.pos.z - 1), close ? (portrait() ? 38 : 44) : (portrait() ? 46 : 40));
}
function deselect() { selected = null; if (ring) ring.visible = false; }

// ---------- Cards ----------

function openStation(id) {
  if (quest) return;
  select(id);
  const st = STATIONS[id], qs = QUESTS.filter(q => q.station === id);
  const extra = { piano: '🎹 اضغط على مفاتيح البيانو العملاق لتعزف ما تحب!', drums: '🥁 اضغط على الدربكة الكبيرة لتعزف!', glasses: T.done.glasses ? '🥛 آلتك جاهزة: اضغط على الأكواب لتعزف!' : '', metronome: '⏱️ اضغط على البرج مرة أخرى ليدقّ الإيقاع.', harbor: '⚓ السفن تحمل آلات من حول العالم.' }[id] || '';
  openModal(`
    <h3>${st.icon} ${st.name}</h3>
    ${extra ? `<p class="fm-sub">${extra}</p>` : ''}
    <ul class="fm-quests">${qs.map(q => {
      const s = starsOf(q), done = !!T.done[q.id];
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
    <h3>📜 دروس جزيرة الأنغام</h3>
    <p class="fm-sub">كل درس يعلّق نوتة ذهبية على قوس قزح. 🎵 ${num(doneCount())} من ${num(QUESTS.length)}</p>
    <ul class="fm-quests">${QUESTS.map(q => {
      const s = starsOf(q), done = !!T.done[q.id], now = nextQuest() === q;
      return `<li class="fm-q ${done ? 'is-done' : now ? 'is-now' : ''}">
        <span class="fm-q__icon">${q.icon}</span>
        <span class="fm-q__text"><b>${q.title}</b><small>${done ? `${'★'.repeat(s)}${'☆'.repeat(3 - s)} • ` : ''}${STATIONS[q.station].icon} ${STATIONS[q.station].name}</small></span>
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

let toastTimer;
function toast(html) {
  let t = els.screen.querySelector('.farm-toast');
  if (!t) { t = document.createElement('div'); t.className = 'farm-toast'; els.screen.append(t); }
  t.innerHTML = html;
  t.hidden = false;
  t.classList.remove('is-in'); void t.offsetWidth; t.classList.add('is-in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3600);
}

// ---------- Playing a quest ----------

async function runQuest(def) {
  if (quest || !def) return;
  const abort = new AbortController();
  quest = { def, abort, i: 0 };
  select(def.station, { close: true });
  stage.setEnabled(false);
  stopMusic();
  if (def.station === 'cloud') places.cloud.obj.userData.notes.clear();
  els.screen.classList.add('has-panel');
  els.panel.hidden = false;
  const steps = def.steps;
  els.panel.innerHTML = `<div class="tn-sheet" role="dialog" aria-label="${def.title}">
    <header class="tn-head"><span class="tn-head__icon">${def.icon}</span><b>${def.title}</b>
      <span class="tn-dots">${steps.map(() => '<i></i>').join('')}</span>
      <button class="tn-x" data-quit aria-label="إغلاق الدرس">✕</button></header>
    <div class="tn-body"></div></div>`;
  els.panel.querySelector('[data-quit]').addEventListener('click', () => { sfx.tap(); closeQuest(); sayHelper('لا بأس! نكمل الدرس متى شئت. 🎵'); });
  const body = els.panel.querySelector('.tn-body'), dots = [...els.panel.querySelectorAll('.tn-dots i')];
  const ctx = {
    say: sayHelper, sfx, signal: abort.signal,
    onNote: note => { if (def.station === 'cloud') addStaffNote(note); else pressKey(note); },
    onGlass: id => { const gl = places.glasses.obj.userData.glasses[id]; if (gl) glassAnim.set(gl, { t: 0 }); },
    race: bpm => setTempo(bpm, 9),
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
    if (steps[i].kind !== 'learn' && !steps[i].say) els.say.classList.add('is-small');
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
  playMusic('music');
}

function addStaffNote(note) {
  const u = places.cloud.obj.userData;
  const m = /^([A-G])#?(\d)$/.exec(note);
  if (!m) return;
  const d = 'CDEFGAB'.indexOf(m[1]) + (Number(m[2]) - 4) * 7;
  const n = M.staffNote(M.NOTE_COLORS[(d + 70) % 7]);
  n.position.set(u.x0 + u.notes.children.length * 0.85, u.lineY(d), 0.12);
  u.notes.add(n);
  const p = n.getWorldPosition(_v);
  spawnNote(p.x, p.y + 0.4, p.z);
}

async function finishQuest(def, ok, total) {
  const topic = getTopic(def.topic);
  const before = save.get().topics?.[def.topic]?.stars || 0;
  const res = recordResult(def.topic, { correct: ok, total: Math.max(1, total) });
  const after = save.get().topics?.[def.topic]?.stars || 0;
  if (after > before && topic) { sessionGain.gained += after - before; sessionGain.topic = topic; }
  const first = !T.done[def.id];
  T.done[def.id] = true;
  persist();
  if (def.id === 'glasses') fillGlasses();
  refresh();
  const stars = res?.stars ?? 0;
  sfx.win();
  for (let i = 0; i < stars; i++) setTimeout(() => sfx.star(i), 600 + i * 260);
  if (first) setTimeout(() => S.piano(SKY_SONG[doneCount() - 1] || 'C5', { vol: 0.3 }), 300);
  const p = places[def.station];
  for (let i = 0; i < 8; i++) setTimeout(() => spawnNote(p.pos.x + (Math.random() - 0.5) * 4, p.pos.y + p.height * 0.6, p.pos.z + (Math.random() - 0.5) * 3), i * 90);
  const next = nextQuest();
  await new Promise(resolve => {
    openModal(`
      <div class="fm-done">
        <div class="fm-done__rays" aria-hidden="true"></div>
        <p class="fm-kicker">درس مكتمل!</p>
        <h3>${def.icon} ${def.title}</h3>
        <div class="fm-stars">${[0, 1, 2].map(i => `<span class="${i < stars ? 'is-on' : ''}" style="--i:${i}">★</span>`).join('')}</div>
        <div class="fm-learned"><b>📖 تعلّمنا من كتاب «التربية الموسيقية»:</b><ul>${def.learned.map(l => `<li>${l}</li>`).join('')}</ul></div>
        <p class="fm-chips">${first ? `<span>+1 🎵 نوتة ذهبية</span>` : ''}${res?.pearls ? `<span>+${num(res.pearls)} 🦪</span>` : ''}<span>✔ ${num(ok)}/${num(total)}</span></p>
        ${next ? `<p class="fm-next">الدرس التالي: <b>${next.icon} ${next.title}</b></p>` : '<p class="fm-next"><b>🎉 جمعت النوتات الذهبية كلها!</b></p>'}
        <button class="btn btn--gold" data-close>تابِع</button>
      </div>`, root => { root.querySelector('[data-close]').addEventListener('click', () => setTimeout(resolve, 0)); }, { keep: true });
  });
  if (first && def.sticker) awardSticker('music', def.sticker);
  deselect();
  if (first && doneCount() === QUESTS.length) { playSkySong(); toast('🎉 اكتملت أغنية السماء! اضغط 🎵 لتسمعها متى شئت.'); }
  else if (next) sayHelper(`أحسنت! 🎵 علّقنا نوتة ذهبية على قوس قزح. الدرس التالي: <b>${next.title}</b> في ${STATIONS[next.station].name}. اتبع السهم الذهبي! ✨`, 'cheer');
}

function fillGlasses() {
  const w = places.glasses.obj.userData.waters;
  GLASSES.forEach((g, i) => {
    const t0 = performance.now() + i * 120;
    const tick = () => { const k = Math.min(1, (performance.now() - t0) / 700); if (k > 0) M.setWater(w[g.id], (g.n / g.d) * k); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}

// ---------- The sky song ----------

function playSkySong() {
  const n = doneCount();
  if (!n) { sayHelper('لم نجمع نوتات ذهبية بعد! أنهِ درساً لتعلّق أول نوتة على قوس قزح. 🌈', 'think'); return; }
  const notes = SKY_SONG.slice(0, n), step = 0.42;
  notes.forEach((note, i) => {
    S.piano(note, { at: i * step });
    if (n === SKY_SONG.length && i % 2 === 0) S.piano(S.freq(note) / 2, { at: i * step, vol: 0.16 });
    setTimeout(() => { const s = gate.userData.slots[i]; if (s) { const p = s.getWorldPosition(_v); spawnNote(p.x, p.y + 0.3, p.z); } }, i * step * 1000);
  });
  if (n === SKY_SONG.length) setTimeout(() => S.choir(), notes.length * step * 1000);
  sayHelper(n === SKY_SONG.length ? 'أغنية السماء كاملة! 🌈🎶 كل نوتة فيها درس تعلّمته.' : `أغنية السماء حتى الآن: ${num(n)} من ${num(SKY_SONG.length)} نوتات. أكمل الدروس لتكتمل! 🎵`, 'cheer');
  if (!selected) stage.focus(gate.position, portrait() ? 40 : 32);
}

// ---------- HUD ----------

function refresh() {
  const n = doneCount();
  els.notes.textContent = num(n);
  gate.userData.slots.forEach((s, i) => { s.visible = i < n; });
  const w = places.glasses.obj.userData.waters;
  GLASSES.forEach(g => M.setWater(w[g.id], T.done.glasses ? g.n / g.d : 0));
  const q = nextQuest();
  const html = q
    ? `<span>${q.icon}</span><p>الدرس ${num(QUESTS.indexOf(q) + 1)} من ${num(QUESTS.length)}: <b>${q.title}</b> — ${STATIONS[q.station].name}</p>`
    : '<span>🌈</span><p><b>أنهيت دروس الجزيرة كلها!</b> العب على الآلات، واسمع أغنية السماء 🎵</p>';
  if (els.goal.dataset.html !== html) { els.goal.innerHTML = html; els.goal.dataset.html = html; }
}

// ---------- Test hook ----------

// Test hook: look at a point (x, z) from a distance; `start` opens a quest.
export function debugLook(x, z, dist, yaw) {
  const r = stage.rig;
  r.goal.set(x, 0, z); r.target.copy(r.goal);
  r.goalDist = r.dist = dist;
  if (yaw != null) r.yaw = yaw;
  r.min = 5; r.max = 200; r.bounds = { x: 99, zMin: -99, zMax: 99 };
}
export function debugStart(id) { closeModal(); runQuest(QUESTS.find(q => q.id === id)); }

export function debugTunes() {
  const info = stage?.renderer.info.render;
  return { calls: info?.calls, triangles: info?.triangles, T: tunesState(), next: nextQuest()?.id || null, quest: quest?.def.id || null, step: quest?.i ?? null, kind: quest ? quest.def.steps[quest.i].kind : null, places: Object.keys(places), selected };
}
