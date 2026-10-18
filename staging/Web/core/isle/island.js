// A 3D quest island: the engine the science island (core/lab/) and the
// atlas island (core/atlas/) are built on.
//
// An island is a terraced 3D world (three.js, the farm's stage) with places
// along a winding path. Each place holds quests from a book; each quest is a
// list of steps shown in a card at the bottom of the screen — «أتعلّم» first
// (core/learn/explore.js), then questions (core/learn/steps.js). A helper
// walks the path and explains every step. A finished quest records stars for
// its topic (the island's plugins/ folder holds the quick reviews) and adds
// one to the island's reward (crystals in a lighthouse, stamps in a
// passport…).
//
//   const isle = makeIsland(cfg)   →   { init, enter, lessonReturned, debugLook, debugStart, debug }
//
// cfg (see core/lab/lab.js for a full example):
//   key          'lab': DOM ids (#screen-lab, #lab-stage…) and the save
//                (save.world.lab = { met, done })
//   content      { HELPER, STATIONS, UNITS, QUESTS } (worlds/…)
//   book         the book's name, for «تعلّمنا من كتاب …»
//   sticker, music   the sticker set and the music of the island
//   ground       the island's models module: ISLE, terrain(), pathCurve(),
//                pathRibbon(), levelAt(), pathY(), and the small things
//                (treeGeo, bushGeo, rockGeo, personGeo, put, glow, lampGeo,
//                beaconArrow, selectRing, sparkSprite)
//   look         { sky: [top, middle, bottom], fog, hemi, sun, sea, yaw, pitch }
//   camera       { start: [x, z], dist: [portrait, landscape], bounds }
//   decor        { breaks: terrace edges (z), avoid: [[x, z, r]], visitors: [[place, lx, lz, ry, seed, opts]] }
//   places       { id: { at: [x, z], ry, r, make } }
//   helper       () → the helper's model (userData.shine glows)
//   extras(scene, api) → { tap(id), animate(dt, t), clickables: [[obj, id]], reward() }
//   text         the island's own lines: quit, allDone, goalDone, gainChip,
//                gained, allDoneNext, questsSub(n, total), reward(n, total)
//   stationExtra { place id: a line shown on its card }

import * as THREE from '../../vendor/three/three.module.min.js';
import { createStage } from '../farm/scene.js';
import { sea, Kit, rng, VC } from '../farm/models.js';
import { save } from '../save.js';
import { sfx } from '../sound.js';
import { num } from '../format.js';
import { recordResult } from '../lesson.js';
import { getTopic } from '../topics.js';
import { awardSticker } from '../stickers.js';
import { canSpeak, speak, stopSpeaking } from '../voice.js';
import { playMusic, stopMusic } from '../music.js';

const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
const $ = id => document.getElementById(id);

export function makeIsland(cfg) {
  const { key, content: { HELPER, STATIONS, UNITS, QUESTS }, ground: M, text: T } = cfg;
  const _v = new THREE.Vector3();
  let els, stage, hooks, built = false, failed = false;
  let S;                                // this child's island save (save.world[key])
  let curve, helperObj, beacon, ring, extra = {};
  const places = {}, walkers = [], sparks = [];
  let quest = null, selected = null, icons = {};
  let sessionGain = { gained: 0, topic: null };

  // ---------- Save data ----------
  function state() {
    const s = save.get();
    const w = (s.world ||= {});
    const t = (w[key] ||= {});
    t.met ??= false;
    t.done ||= {};
    return t;
  }
  const persist = () => save.update(() => {});
  const doneCount = () => QUESTS.filter(q => S.done[q.id]).length;
  const nextQuest = () => QUESTS.find(q => !S.done[q.id]) || null;
  const starsOf = q => save.get().topics?.[q.topic]?.stars || 0;
  const portrait = () => innerHeight > innerWidth;
  const lite = () => document.body.classList.contains('lite');

  // What extras (the island's own code) may use.
  const api = {
    get places() { return places; }, get quest() { return quest; }, get stage() { return stage; },
    get selected() { return selected; }, doneCount, isDone: id => !!S?.done[id], total: QUESTS.length, lite, portrait,
    say: (h, m) => sayHelper(h, m), spark: (x, y, z) => spawnSpark(x, y, z),
    focus: (x, z, d) => { deselect(); stage.focus(_v.set(x, 0, z), d); },
  };

  // ---------- Entering and leaving ----------
  function init(h) { hooks = h; }

  function enter(region) {
    S = state();
    sessionGain = { gained: 0, topic: null };
    els ||= grabEls();
    if (!built && !failed) build();
    if (failed) { els.goal.innerHTML = '<p>هذه الجزيرة تحتاج إلى رسوم ثلاثية الأبعاد (WebGL)، وجهازك لا يدعمها. جرّب جزيرة أخرى! ⛵</p>'; return; }
    els.title.textContent = region?.name || cfg.title;
    stage.start();
    stage.setEnabled(true);
    const r = stage.rig, [sx, sz] = cfg.camera.start;
    r.goal.set(sx, 0, sz); r.target.copy(r.goal);
    r.goalDist = r.dist = portrait() ? cfg.camera.dist[0] : cfg.camera.dist[1];
    deselect();
    refresh();
    setTimeout(() => {
      if (!S.met) { S.met = true; persist(); sayHelper(HELPER.hello, 'cheer'); return; }
      const q = nextQuest();
      sayHelper(`${HELPER.back} ${q ? `الدرس التالي: <b>${q.title}</b> في ${STATIONS[q.station].name}. اتبع السهم الذهبي! ✨` : T.allDone}`);
    }, TEST ? 0 : 600);
  }

  function lessonReturned(after) {
    if (after?.gained > 0) { sessionGain.gained += after.gained; sessionGain.topic = after.topic; }
    stage?.start();
    refresh();
  }

  function leave() {
    stopSpeaking();
    if (quest) closeQuest();
    closeModal();
    extra.close?.();
    stage?.stop();
    hooks.leave(sessionGain.gained > 0 ? sessionGain : undefined);
  }

  function grabEls() {
    const id = n => $(`${key}-${n}`);
    const e = {
      screen: $(`screen-${key}`), host: id('stage'), labels: id('labels'), title: id('title'),
      goal: id('goal'), places: id('places'), say: id('say'), panel: id('panel'), modal: id('modal'), gems: id('gems'),
    };
    id('leave').addEventListener('click', () => { sfx.tap(); leave(); });
    id('quests-btn').addEventListener('click', () => { sfx.tap(); openQuests(); });
    id('gems-btn').addEventListener('click', () => { sfx.tap(); extra.reward?.(); });
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

  // ---------- Building the island ----------
  function build() {
    const L = cfg.look;
    try {
      stage = createStage(els.host, { lite: lite(), fov: [34, 30], sky: L.fogColor, fog: L.fog, cls: 'tn-canvas' });
    } catch (err) {
      console.warn(`The island ${key} needs WebGL`, err);
      failed = true;
      return;
    }
    const { scene, rig, sun, hemi } = stage;
    scene.background = skyTexture(L.sky);
    hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2];
    sun.color.set(L.sun[0]); sun.intensity = L.sun[1];
    const sc = sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 2; sc.far = 95;
    sc.updateProjectionMatrix();
    if (lite()) sun.castShadow = false;
    rig.yaw = L.yaw; rig.pitch = L.pitch;
    rig.bounds = cfg.camera.bounds;
    rig.min = 22; rig.max = 115;

    const water = sea();
    const u = water.material.uniforms;
    u.uHalf.value.set(M.ISLE.hx - 1.5, M.ISLE.hz - 1.5); u.uR.value = 12;
    u.uShallow.value.set(L.sea[0]); u.uDeep.value.set(L.sea[1]); u.uFar.value.set(L.sea[2]);
    water.position.z = M.ISLE.cz;
    scene.add(water);
    scene.add(M.terrain());
    curve = M.pathCurve();
    scene.add(M.pathRibbon(curve));

    for (const [id, def] of Object.entries(cfg.places)) {
      const obj = def.make();
      const [x, z] = def.at, y = M.levelAt(z);
      obj.position.set(x, y, z);
      obj.rotation.y = def.ry;
      obj.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(obj);
      stage.addClickable(obj, id);
      places[id] = { obj, pos: new THREE.Vector3(x, y, z), r: def.r, height: obj.userData.height || 5 };
    }
    extra = cfg.extras?.(scene, api) || {};
    for (const [obj, id] of extra.clickables || []) stage.addClickable(obj, id);

    decorate(scene);

    helperObj = cfg.helper();
    scene.add(helperObj);
    const [sx, sz] = cfg.camera.start;
    helperObj.position.set(sx + 2, M.pathY(sz + 4), sz + 4);
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
    icons = stage.snapshots([{ id: 'helper', object: cfg.helper(), yaw: 0.35, pitch: 0.2, pad: 1.05 }]);
    els.say.querySelector('.farm-say__face img').src = icons.helper || '';
    stage.onFrame(animate);
    stage.onTap(tap);
    els.places.innerHTML = Object.entries(STATIONS).map(([id, s]) => `<button data-place="${id}">${s.icon} ${s.name}</button>`).join('');
    built = true;
  }

  function skyTexture(cols) {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, cols[0]); grd.addColorStop(0.55, cols[1]); grd.addColorStop(1, cols[2]);
    g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // Trees, bushes, rocks, lamps and visitors, mostly merged into one mesh.
  function decorate(scene) {
    const D = cfg.decor, I = M.ISLE;
    const r = rng(21), k = new Kit();
    const trees = (D.trees || [0, 3, 0, 1, 3, 0, 2, 3]).map((kind, i) => M.treeGeo(kind, i + 3));
    const bushes = [1, 2, 3, 4].map(s => M.bushGeo(s, ['#6ab44c', '#7cc35a', '#5fae4a', '#8fd06a'][s % 4]));
    const rocks = [1, 2, 3].map(s => M.rockGeo(s, 0.45 + s * 0.12));
    const pathPts = curve.getSpacedPoints(140);
    const nearPath = (x, z, d) => pathPts.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < d * d);
    const nearPlace = (x, z, pad) => Object.values(places).some(p => (p.pos.x - x) ** 2 + (p.pos.z - z) ** 2 < (p.r + pad) ** 2);
    const inside = (x, z) => (Math.abs(x) / (I.hx - 4.4)) ** 5 + (Math.abs(z - I.cz) / (I.hz - 4.6)) ** 5 < 1;
    const n = lite() ? 80 : 160;
    for (let i = 0, made = 0; i < 1100 && made < n; i++) {
      const x = (r() - 0.5) * (I.hx * 2 - 7), z = I.cz - I.hz + 4 + r() * (I.hz * 2 - 8);
      if (!inside(x, z) || D.breaks.some(b => Math.abs(z - b) < 1.6)) continue;
      if (nearPath(x, z, 2.4) || nearPlace(x, z, 0.8) || (D.avoid || []).some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      const y = M.levelAt(z), roll = r();
      if (roll < 0.55) M.put(k, trees[Math.floor(r() * trees.length)], x, y, z, r() * 6, 0.8 + r() * 0.5);
      else if (roll < 0.88) M.put(k, bushes[Math.floor(r() * bushes.length)], x, y, z, r() * 6, 0.8 + r() * 0.6);
      else M.put(k, rocks[Math.floor(r() * rocks.length)], x, y, z, r() * 6, 1);
      made += 1;
    }
    for (let i = 0; i < 52; i++) {
      const t = (i / 52) * Math.PI * 2 + r() * 0.1, c = Math.cos(t), s = Math.sin(t);
      const x = Math.sign(c) * Math.abs(c) ** 0.5 * (I.hx - 1.6), z = I.cz + Math.sign(s) * Math.abs(s) ** 0.5 * (I.hz - 1.9);
      if ((D.beach || []).some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      M.put(k, rocks[i % 3], x, 0.3, z, r() * 6, 0.8 + r() * 0.7);
    }
    const lamp = M.lampGeo();
    let side = 1;
    for (let t = 0.04; t < 0.97; t += 0.06) {
      const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      const nx = -tg.z * side, nz = tg.x * side, l = Math.hypot(nx, nz) || 1;
      const x = p.x + (nx / l) * 1.9, z = p.z + (nz / l) * 1.9, y = M.pathY(z);
      if (!nearPlace(x, z, -0.4)) {
        M.put(k, lamp, x, y, z, 0);
        if (!lite() || side > 0) { const gl = M.glow(D.lampGlow || '#fff1b8', 1.3, 0.5); gl.position.set(x, y + 2.15, z); scene.add(gl); }
      }
      side = -side;
    }
    for (const [id, lx, lz, ry, seed, opts] of D.visitors || []) {
      const p = places[id], c = Math.cos(p.obj.rotation.y), s = Math.sin(p.obj.rotation.y);
      M.put(k, M.personGeo(seed, opts), p.pos.x + lx * c + lz * s, p.pos.y + 0.55, p.pos.z - lx * s + lz * c, ry + p.obj.rotation.y, 1);
    }
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

  // ---------- Every frame ----------
  const labelEls = {};
  let spawnT = 0, offsetFor = -1;
  function animate(dt, t) {
    const { rig, sun } = stage;
    sun.position.set(rig.target.x - 16, 32, rig.target.z + 10);
    sun.target.position.set(rig.target.x, 0, rig.target.z - 2);
    extra.animate?.(dt, t);
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
  // With the quest card open, lift the picture so the place stays in view.
  function viewOffset() {
    const cam = stage.camera, W = els.host.clientWidth, H = els.host.clientHeight;
    const lift = quest && !els.panel.hidden ? Math.round(Math.min(els.panel.offsetHeight, H * 0.7) * 0.5) : 0;
    const k = lift * 100000 + W * 7 + H;
    if (k === offsetFor) return;
    offsetFor = k;
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
    const hide = !!quest || !els.modal.hidden || !!extra.covering?.();
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
      const done = qs.filter(q => S.done[q.id]).length;
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
  const helperGoal = new THREE.Vector3(), _pts = [];
  let hopT = 0;
  function stepHelper(dt, t) {
    const r = stage.rig;
    if (selected) { const p = places[selected]; const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); helperGoal.set(p.pos.x + fx * (p.r + 0.6) + Math.cos(r.yaw) * 2.2, 0, p.pos.z + fz * (p.r + 0.6) - Math.sin(r.yaw) * 2.2); }
    else { const pt = closestPathPoint(r.target.x, r.target.z + 4); helperGoal.set(pt.x + 1.2, 0, pt.z); }
    const h = helperObj.position, dx = helperGoal.x - h.x, dz = helperGoal.z - h.z, dist = Math.hypot(dx, dz);
    const step = Math.min(dist, dt * 7);
    if (dist > 0.05) { h.x += (dx / dist) * step; h.z += (dz / dist) * step; }
    const moving = dist > 0.3;
    hopT = Math.max(0, hopT - dt);
    const groundY = Math.max(M.pathY(h.z), M.levelAt(h.z));
    h.y = groundY + 0.4 + Math.abs(Math.sin(t * (moving ? 9 : 2.6))) * (moving ? 0.35 : 0.12) + Math.sin(hopT * Math.PI) * 1.1;
    helperObj.rotation.y = moving ? Math.atan2(dx, dz) : r.yaw + Math.sin(t * 1.2) * 0.25;
    const hu = helperObj.userData;
    if (hu.shine) hu.shine.material.opacity = 0.55 + Math.sin(t * 5) * 0.25 + (hopT ? 0.3 : 0);
  }
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
    sayHelper(q ? `الدرس التالي: <b>${q.title}</b> في ${STATIONS[q.station].name}. اضغط على اسم المكان الذي فوقه السهم الذهبي! ✨` : T.allDone, 'think');
  }

  // ---------- Tapping the island ----------
  function tap(id) {
    if (quest) return;
    if (!id) { deselect(); return; }
    if (extra.tap?.(id)) return;
    if (places[id]) openStation(id);
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

  // ---------- Cards ----------
  function openStation(id) {
    if (quest) return;
    select(id);
    const st = STATIONS[id], qs = QUESTS.filter(q => q.station === id), unit = UNITS[st.unit];
    const extraLine = cfg.stationExtra?.[id] || '';
    openModal(`
      <h3>${st.icon} ${st.name}</h3>
      <p class="fm-sub lb-unit" style="--unit:${unit.color}">الوحدة ${num(st.unit)}: ${unit.name}</p>
      ${extraLine ? `<p class="fm-sub">${extraLine}</p>` : ''}
      ${st.action ? `<p class="fm-sub"><button class="btn btn--ghost" data-action="${id}">${st.action}</button></p>` : ''}
      <ul class="fm-quests">${qs.map(q => {
        const s = starsOf(q), done = !!S.done[q.id];
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
        if (r) { sfx.tap(); closeModal(); stage.stop(); hooks.startLesson(r.dataset.review); return; }
        const a = e.target.closest('[data-action]');
        if (a) { sfx.tap(); closeModal(); extra.action?.(a.dataset.action); }
      });
    });
  }
  function openQuests() {
    openModal(`
      <h3>📜 دروس ${cfg.title}</h3>
      <p class="fm-sub">${T.questsSub(doneCount(), QUESTS.length)}</p>
      <ul class="fm-quests">${QUESTS.map(q => {
        const s = starsOf(q), done = !!S.done[q.id], now = nextQuest() === q, st = STATIONS[q.station];
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
    els.panel.querySelector('[data-quit]').addEventListener('click', () => { sfx.tap(); closeQuest(); sayHelper(T.quit); });
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
      const res = await Promise.race([cfg.runStep(steps[i], host, ctx), stopped]);
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
    playMusic(cfg.music);
  }
  async function finishQuest(def, ok, total) {
    const topic = getTopic(def.topic);
    const before = save.get().topics?.[def.topic]?.stars || 0;
    const res = recordResult(def.topic, { correct: ok, total: Math.max(1, total) });
    const after = save.get().topics?.[def.topic]?.stars || 0;
    if (after > before && topic) { sessionGain.gained += after - before; sessionGain.topic = topic; }
    const first = !S.done[def.id];
    S.done[def.id] = true;
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
          <div class="fm-learned"><b>📖 تعلّمنا من كتاب «${cfg.book}»:</b><ul>${def.learned.map(l => `<li>${l}</li>`).join('')}</ul></div>
          <p class="fm-chips">${first ? `<span>+1 ${T.gainChip}</span>` : ''}${res?.pearls ? `<span>+${num(res.pearls)} 🦪</span>` : ''}<span>✔ ${num(score)}/${num(total)}</span></p>
          ${next ? `<p class="fm-next">الدرس التالي: <b>${next.icon} ${next.title}</b></p>` : `<p class="fm-next"><b>${T.allDoneNext}</b></p>`}
          <button class="btn btn--gold" data-close>تابِع</button>
        </div>`, root => { root.querySelector('[data-close]').addEventListener('click', () => setTimeout(resolve, 0)); }, { keep: true });
    });
    if (first && def.sticker) awardSticker(cfg.sticker, def.sticker);
    deselect();
    if (first && doneCount() === QUESTS.length) extra.reward?.();
    else if (next) sayHelper(`أحسنت! ${T.gained} الدرس التالي: <b>${next.title}</b> في ${STATIONS[next.station].name}. اتبع السهم الذهبي! ✨`, 'cheer');
  }

  // ---------- HUD ----------
  function refresh() {
    els.gems.textContent = num(doneCount());
    const q = nextQuest();
    const html = q
      ? `<span>${q.icon}</span><p>الدرس ${num(QUESTS.indexOf(q) + 1)} من ${num(QUESTS.length)}: <b>${q.title}</b> — ${STATIONS[q.station].name}</p>`
      : T.goalDone;
    if (els.goal.dataset.html !== html) { els.goal.innerHTML = html; els.goal.dataset.html = html; }
    extra.refresh?.();
  }

  // ---------- Test hooks ----------
  function debugLook(x, z, dist, yaw) {
    const r = stage.rig;
    r.goal.set(x, 0, z); r.target.copy(r.goal);
    r.goalDist = r.dist = dist;
    if (yaw != null) r.yaw = yaw;
    r.min = 5; r.max = 220; r.bounds = { x: 99, zMin: -99, zMax: 99 };
  }
  function debugStart(id) { closeModal(); runQuest(QUESTS.find(q => q.id === id)); }
  function debug() {
    const info = stage?.renderer.info.render;
    return { calls: info?.calls, triangles: info?.triangles, L: state(), next: nextQuest()?.id || null, quest: quest?.def.id || null, step: quest?.i ?? null, kind: quest ? quest.def.steps[quest.i].kind : null, places: Object.keys(places), selected, ...(extra.debug?.() || {}) };
  }

  return { init, enter, lessonReturned, debugLook, debugStart, debug, api };
}
