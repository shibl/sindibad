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
// The engine is core/isle/island.ts; this file is the island: its places,
// its look, what moves on it, and the lighthouse.
// Content: worlds/grade6/lab.js. Models: models.js. Pictures: views.js.

import { makeIsland, solid } from '../isle/island.js';
import type { IslandApi, Extras, LitMesh } from '../isle/island.js';
import type * as THREE from '../../vendor/three/three.module.min.js';
import * as M from './models.js';
import { runStep } from './games.js';
import { num } from '../format.js';
import { sfx } from '../sound.js';
import { HELPER, STATIONS, UNITS, QUESTS } from '../../worlds/grade6/lab.js';

const LIGHTHOUSE: [number, number] = [12.2, 29.5];

const isle = makeIsland({
  key: 'lab', title: 'جزيرة العلوم', book: 'العلوم', sticker: 'science', music: 'science',
  content: { HELPER, STATIONS, UNITS, QUESTS },
  ground: M, runStep,
  helper: () => M.helperBot(),
  // A bright, clean morning: pale blue sky, white sun, crisp shadows.
  look: { sky: ['#7cc7ff', '#c8ecff', '#eefaff'], fogColor: '#cdeeff', fog: [85, 175], hemi: ['#f4fbff', '#8ea88a', 1.55], sun: ['#fffaf0', 2.55], sea: ['#6fe6dc', '#1f7fc9', '#dff4ff'], yaw: -0.2, pitch: 0.88 },
  camera: { start: [0.5, 22.5], dist: [98, 58], bounds: { x: 9, zMin: -42, zMax: 30 } },
  decor: {
    breaks: [12, -12, -38], avoid: [[...LIGHTHOUSE, 3]], beach: [[14, 33, 4]],
    visitors: [['pond', 3.4, 3.6, -2.6, 3], ['body', 2.6, 3.8, -2.4, 4], ['body', -2.8, 3.6, 2.6, 5, { prop: 'book' }], ['skin', 3.6, 2.8, -2, 6], ['castle', 2.4, 6.6, Math.PI, 7], ['castle', -1.6, 6.8, Math.PI, 8, { prop: 'book' }]],
  },
  places: {
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
  },
  stationExtra: { machines: '⚙️ اضغط على الأرجوحة أو الرافعة أو الناعورة لتعمل!' },
  text: {
    quit: 'لا بأس! نكمل الدرس متى شئت. 🔬',
    allDone: 'أضأت المنارة كلها! اضغط 💎 لترى شعاعها.',
    goalDone: '<span>💎</span><p><b>أنهيت دروس الجزيرة كلها!</b> المنارة مضاءة، وكل الدروس تنتظر المراجعة 🔁</p>',
    gainChip: '💎 بلّورة في المنارة',
    gained: '💎 أضأنا بلّورة جديدة في المنارة.',
    allDoneNext: '🎉 أضأت المنارة كلها!',
    questsSub: (n, all) => `كل درس يضيء بلّورة في المنارة. 💎 ${num(n)} من ${num(all)}`,
  },
  extras,
});

// What moves on the island, its toys, and the lighthouse.
function extras(scene: THREE.Scene, api: IslandApi): Extras {
  const P = api.places, mu = P.machines.obj.userData;
  let seesawKick = 0, craneKick = 0, noriaKick = 0;
  const tower = M.lighthouse(QUESTS.length);
  tower.position.set(LIGHTHOUSE[0], M.levelAt(LIGHTHOUSE[1]), LIGHTHOUSE[1]);
  tower.traverse(o => { if (solid(o)) o.castShadow = true; });
  scene.add(tower);

  function reward() {
    const n = api.doneCount();
    api.focus(tower.position.x, tower.position.z, api.portrait() ? 40 : 34);
    api.say(n === api.total ? 'المنارة مضاءة كلها! 💎 كل بلّورة فيها درس أتقنته. شعاعها يرشد السفن الآن.' : `في المنارة ${num(n)} من ${num(api.total)} بلّورات مضيئة. كل درس تُنهيه يضيء بلّورة جديدة! 💎`, n ? 'cheer' : 'happy');
  }

  function animate(dt: number, t: number) {
    const busy = (id: string) => api.quest?.def.station === id;
    // the forest's bird circles the tree of life
    const fu = P.forest.obj.userData;
    fu.bird.position.set(-0.6 + Math.cos(t * 0.7) * 3, fu.height - 1.4 + Math.sin(t * 2) * 0.3, -0.8 + Math.sin(t * 0.7) * 2.6);
    fu.bird.rotation.set(0, -t * 0.7, Math.sin(t * 8) * 0.2);
    // ducks paddle round the pond
    for (const d of P.pond.obj.userData.ducks) { const u = d.userData; u.a += dt * 0.35; d.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 3 + u.r) * 0.02, -0.2 + Math.sin(u.a) * u.r); d.rotation.y = -u.a; }
    // the spring scale bounces
    const au = P.arena.obj.userData, bob = Math.sin(t * (busy('arena') ? 3.4 : 1.6));
    au.weight.position.y = au.baseY + 1.8 - bob * 0.25;
    au.spring.scale.y = 3.2 + bob * 0.45;
    au.spring.position.y = au.baseY + 2.9 - bob * 0.12;
    // blocks slide down the friction lanes: glass fastest, felt slowest
    const su = P.slopes.obj.userData;
    for (const b of su.blocks) {
      b.userData.t = (b.userData.t + dt * [0.36, 0.24, 0.13][b.userData.i]) % 1.4;
      const k = Math.min(1, b.userData.t);
      b.position.set(b.userData.x, su.baseY + 2.35 - k * 1.95 + 0.25, -2.6 + k * 4.6);
      b.rotation.x = -0.42;
    }
    const sk = (t * 0.25) % 1;
    su.skier.position.set(3.4 - sk * 1.1, su.baseY + 2.6 - sk * 2.5, -2.9 + sk * 1.6);
    // the horse nods
    const yu = P.yard.obj.userData;
    yu.horse.position.y = yu.baseY + Math.abs(Math.sin(t * 2.4)) * 0.04;
    yu.horse.rotation.z = Math.sin(t * 1.2) * 0.02;
    // the body dome: the organs turn, the bladder fills and empties
    const bu = P.body.obj.userData;
    bu.organ.rotation.y = Math.sin(t * 0.5) * 0.4;
    bu.bladder.scale.set(1.1 + Math.sin(t * 0.9) * 0.12, 0.8 + Math.sin(t * 0.9) * 0.1, 0.9);
    // the giant fingerprint turns
    P.skin.obj.userData.print.rotation.z = t * 0.3;
    // the barrel rolls up the builders' ramp
    const ru = P.ramp.obj.userData, rk = (t * 0.22) % 1;
    ru.barrel.position.set(2.4 - rk * 4, ru.baseY + 0.4 + rk * 1.3, -1.6);
    ru.barrel.rotation.y = rk * 9;
    // the seesaw rocks, the crane lifts, the noria turns, the well's bucket bobs
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
    const tu = tower.userData, n = api.doneCount(), all = n === api.total;
    tu.crystals.forEach((c: LitMesh, i: number) => { c.rotation.y = t * 1.5 + i; c.material.emissive.set(i < n ? '#ffb020' : '#000000'); c.material.color.set(i < n ? '#ffe680' : '#8fa3b0'); });
    tu.lamp.material.opacity = 0.15 + (n / api.total) * 0.75 + Math.sin(t * 3) * 0.05;
    tu.beam.material.opacity = all ? 0.22 : 0;
    if (all) tu.beamPivot.rotation.y = t * 0.6;
  }

  function tap(id: string) {
    if (id === 'seesaw') { seesawKick = 2; sfx.tap(); return true; }
    if (id === 'crane') { craneKick = 3; sfx.tap(); return true; }
    if (id === 'noria') { noriaKick = 3; sfx.tap(); return true; }
    if (id === 'tower') { reward(); return true; }
    return false;
  }

  return { animate, tap, reward, clickables: [[mu.beam, 'seesaw'], [mu.noria, 'noria'], [mu.hook, 'crane'], [tower, 'tower']] };
}

export const { init, enter, lessonReturned, debugLook, debugStart, debug } = isle;
