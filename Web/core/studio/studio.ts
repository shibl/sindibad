// «جزيرة الألوان» — the art island, played in 3D (three.js).
//
// The grade-6 art book («التربية الفنية البصرية والجمالية») as an island of
// fifteen places, in the book's order (worlds/grade6/studio.js): one quest
// per lesson, twenty-five quests. Each teaches first (the book's paintings
// and words to discover) and then plays its «أحاول» with the fingers
// (games.js: mixing paints, colouring, perspective, folding, collage,
// rhythms of lines, symmetry, clay…). The helper «ريشة», a little
// paintbrush, explains every step. A finished quest hangs its painting in
// the gallery at the harbour (رواق اللوحات).
//
// 🖌️ opens «مرسمي» (easel.js): a sheet to draw and colour freely, with
// mirror and mandala symmetry.
//
// The engine is core/isle/island.ts. Models: models.js. Pictures: views.js
// and art.js.

import { makeIsland } from '../isle/island.js';
import type { IslandApi, Extras } from '../isle/island.js';
import type * as THREE from '../../vendor/three/three.module.min.js';
import * as M from './models.js';
import { runStep } from './games.js';
import { num } from '../format.js';
import { sfx } from '../sound.js';
import { HELPER, STATIONS, UNITS, QUESTS } from '../../worlds/grade6/studio.js';

const WALL: [number, number] = [-9.2, 33];

const isle = makeIsland({
  key: 'studio', title: 'جزيرة الألوان', book: 'التربية الفنية البصرية والجمالية', sticker: 'art', music: 'art',
  content: { HELPER, STATIONS, UNITS, QUESTS },
  ground: M, runStep,
  helper: () => M.helperBrush(),
  // A soft pink morning over a turquoise sea.
  look: { sky: ['#7cc0f2', '#ffd9e8', '#fff2ea'], fogColor: '#ffeef0', fog: [95, 200], hemi: ['#fff6f0', '#a08a9a', 1.6], sun: ['#fff2e6', 2.45], sea: ['#6ae6d8', '#1f86c8', '#fff0f0'], yaw: -0.2, pitch: 0.88 },
  camera: { start: [0.5, 25.5], dist: [98, 58], bounds: { x: 9, zMin: -63, zMax: 33 } },
  decor: {
    breaks: [6, -20, -46], trees: [2, 0, 3, 2, 0, 1], avoid: [[...WALL, 5]], beach: [[14, 38, 4]],
    lampGlow: '#ffe6f2',
    visitors: [['circles', 3.6, 3.6, -2.6, 3], ['fatna', -3.6, 3.6, 2.6, 4, { prop: 'book' }], ['palmyra', 4, 3.4, -2.2, 5], ['mandala', 3.4, 3.4, -2, 6], ['expo', 2.6, 6.6, Math.PI, 7]],
  },
  places: {
    circles: { at: [7.8, 27.5], ry: -0.25, r: 5.6, make: () => M.circlesSquare() },
    fatna: { at: [-7.6, 23.5], ry: 0.25, r: 5.6, make: () => M.fatnaHouse() },
    street: { at: [7.8, 15.2], ry: -0.2, r: 5.6, make: () => M.perspectiveStreet() },
    braque: { at: [-7.6, 12.2], ry: 0.25, r: 5.4, make: () => M.cubistStudio() },
    palmyra: { at: [7.8, -0.8], ry: -0.2, r: 5.6, make: () => M.palmyra() },
    africa: { at: [-7.6, -2.4], ry: 0.25, r: 5.6, make: () => M.africanVillage() },
    orontes: { at: [7.8, -13.4], ry: -0.25, r: 5.6, make: () => M.noria() },
    cardboard: { at: [-7.6, -13.8], ry: 0.25, r: 5.2, make: () => M.cardboardWorkshop() },
    portrait: { at: [7.8, -27.2], ry: -0.2, r: 5.4, make: () => M.realistStudio() },
    mandala: { at: [-7.6, -27.6], ry: 0.25, r: 5.6, make: () => M.mandalaGarden() },
    damascus: { at: [7.8, -39], ry: -0.2, r: 5.6, make: () => M.damasceneHouse() },
    ideas: { at: [-7.6, -39.4], ry: 0.25, r: 5.6, make: () => M.ideasHouse() },
    lines: { at: [7.6, -52.4], ry: -0.2, r: 5.4, make: () => M.linesWall() },
    market: { at: [-7.4, -52.8], ry: 0.2, r: 5.6, make: () => M.craftsMarket() },
    expo: { at: [0.6, -64.6], ry: 0, r: 6.2, make: () => M.artistsGallery() },
  },
  stationExtra: {
    circles: '🖼️ رواق اللوحات على الشاطئ: كل درس تُنهيه يعلّق لوحته فيه.',
    expo: '🖌️ وفي «مرسمي» ترسم وتلوّن بحرّية: اضغط 🖌️ في الأعلى.',
  },
  text: {
    quit: 'لا بأس! نكمل الرسم متى شئت. 🖌️',
    allDone: 'علّقت لوحات الكتاب كلّها في الرواق! 🖼️ افتح «مرسمي» 🖌️ وارسم ما تحبّ.',
    goalDone: '<span>🖼️</span><p><b>أنهيت دروس الجزيرة كلها!</b> ارسم في «مرسمي» 🖌️، وراجع الدروس متى شئت 🔁</p>',
    gainChip: '🖼️ لوحة في الرواق',
    gained: '🖼️ علّقنا لوحة جديدة في رواق اللوحات.',
    allDoneNext: '🎉 امتلأ رواق اللوحات!',
    questsSub: (n, all) => `كل درس يعلّق لوحته في رواق اللوحات. 🖼️ ${num(n)} من ${num(all)}`,
  },
  extras,
});

function extras(scene: THREE.Scene, api: IslandApi): Extras {
  const P = api.places;
  const wall = M.paintingsWall(QUESTS.length);
  wall.position.set(WALL[0], M.levelAt(WALL[1]), WALL[1]);
  wall.rotation.y = 0.35;
  scene.add(wall);

  // ---------- «مرسمي»: the free easel ----------
  const host = document.getElementById('studio-easel')!;
  let pad: ReturnType<typeof import('./easel.js').openEasel> | null = null;
  function openEasel() {
    if (pad) return;
    sfx.tap();
    api.stage.stop();
    import('./easel.js').then(m => {
      pad = m.openEasel(host, {
        sfx,
        onClose: () => { pad = null; api.stage.start(); api.say('لوحة جميلة! 🎨 كل فنّان يبدأ بخطّ ودائرة.', 'cheer'); },
      });
      api.say('هذا مرسمك! 🖌️ اختر لوناً وارسم بإصبعك. جرّب «المرآة» 🦋 و«الماندالا» 🪷!', 'cheer');
    }).catch(err => { console.error('The easel failed to load', err); api.stage.start(); });
  }
  document.getElementById('studio-easel-btn')?.addEventListener('click', openEasel);

  // ---------- the gallery of paintings ----------
  const done = () => QUESTS.map(q => api.isDone(q.id));
  function reward() {
    const n = api.doneCount();
    api.focus(wall.position.x, wall.position.z, api.portrait() ? 34 : 30);
    api.say(n === api.total
      ? 'رواق اللوحات ممتلئ: خمس وعشرون لوحة من كتابك! 🖼️✨ أنت فنّان حقيقيّ.'
      : `في رواق اللوحات ${num(n)} من ${num(api.total)} لوحة. كل درس تُنهيه يعلّق لوحته هنا! 🖼️`, n ? 'cheer' : 'happy');
  }

  function animate(dt: number, t: number) {
    const all = api.doneCount() === api.total;
    wall.userData.show(done());
    wall.userData.shine.material.opacity = all ? 0.35 + Math.sin(t * 2) * 0.15 : 0;
    const [a, b] = P.circles.obj.userData.discs; a.rotation.z = t * 0.5; b.rotation.z = -t * 0.65;
    P.orontes.obj.userData.wheel.rotation.z = -t * 0.45;
    const pu = P.portrait.obj.userData;
    pu.bubbles.forEach((bb: THREE.Object3D) => { const u = bb.userData, k = (t * 0.12 + u.t) % 1; bb.position.set(u.x + Math.sin(t + u.t * 9) * 0.3, pu.baseH + 1 + k * 4, u.z); bb.scale.setScalar(k < 0.9 ? 1 : (1 - k) * 10); });
    P.mandala.obj.userData.disc.rotation.z = t * 0.3;
    const sp = P.damascus.obj.userData.spout; sp.material.opacity = 0.4 + Math.sin(t * 3) * 0.15;
    P.ideas.obj.userData.flies.forEach((f: THREE.Object3D) => { const u = f.userData, w = Math.sin(t * 6 + u.i) * 0.7; u.L.rotation.y = w; u.R.rotation.y = -w; f.position.y = u.y + Math.sin(t * 1.3 + u.i) * 0.12; f.rotation.y = Math.sin(t * 0.5 + u.i) * 0.6; });
    P.lines.obj.userData.fish.forEach((f: THREE.Object3D) => { const u = f.userData; f.position.y = u.y + Math.sin(t * 1.6 + u.n) * 0.12; f.rotation.y = Math.sin(t * 0.8 + u.n * 2) * 0.5; });
  }

  function tap(id: string) {
    if (id === 'wall') { reward(); return true; }
    return false;
  }

  return {
    animate, tap, reward,
    covering: () => !!pad, close: () => { pad?.close(); pad = null; },
    clickables: [[wall, 'wall']],
    debug: () => ({ easel: pad?.debug?.() || null, hung: done().filter(Boolean).length }),
  };
}

export const { init, enter, lessonReturned, debugLook, debugStart, debug } = isle;
