// «جزيرة الأطلس» — the social studies island, played in 3D (three.js).
//
// The grade-6 social studies book (الدراسات الاجتماعية) as an island of
// thirteen places, one district per unit: the globe observatory, the
// pyramids, Carthage and the palace of the state (Arab Africa's
// civilisations and the state); the Nile valley, Fustat and the Horn of
// Africa; the family house and the square of institutions; the Libyan oasis
// and the heroes' garden; the Atlas mountains and the Andalusian palace.
// Each quest teaches first (maps and timelines to explore) and then asks.
// The helper «سهيل», a little star explorer (Arab travellers steered by the
// star Suhail), explains every step. A finished quest lights a ray of the
// travellers' compass.
//
// The observatory opens the atlas globe (globe.js): every country of the
// world with its flag, capital, currency, the meaning of its name and of its
// flag, and its resources; and two games, «أين تقع؟» and «علم مَن هذا؟».
//
// The engine is core/isle/island.ts. Content: worlds/grade6/atlas.js and
// worlds/atlas/ (the countries). Models: models.js. Maps: views.js.

import { makeIsland } from '../isle/island.js';
import type { IslandApi, Extras, LitMesh } from '../isle/island.js';
import type * as THREE from '../../vendor/three/three.module.min.js';
import * as M from './models.js';
import { runStep } from './games.js';
import { num } from '../format.js';
import { sfx } from '../sound.js';
import { save } from '../save.js';
import { HELPER, STATIONS, UNITS, QUESTS } from '../../worlds/grade6/atlas.js';

const COMPASS: [number, number] = [-9, 33.5];

const isle = makeIsland({
  key: 'atlas', title: 'جزيرة الأطلس', book: 'الدراسات الاجتماعية', sticker: 'social', music: 'social',
  content: { HELPER, STATIONS, UNITS, QUESTS },
  ground: M, runStep,
  helper: () => M.helperStar(),
  // A warm golden afternoon over a deep blue sea.
  look: { sky: ['#6fb3f0', '#ffe4b8', '#fff2dc'], fogColor: '#ffeccd', fog: [90, 180], hemi: ['#fff4e2', '#9a8a6a', 1.55], sun: ['#fff0d8', 2.5], sea: ['#5fd6d0', '#1a6fb8', '#fff0d8'], yaw: -0.2, pitch: 0.88 },
  camera: { start: [0.5, 25.5], dist: [98, 58], bounds: { x: 9, zMin: -50, zMax: 33 } },
  decor: {
    breaks: [6, -20, -46], trees: [0, 3, 1, 3, 0, 1], avoid: [[...COMPASS, 3.6]], beach: [[14, 38, 4]],
    lampGlow: '#ffe2a0',
    visitors: [['atlas', 3.4, 3.6, -2.6, 3], ['pyramids', 4, 3.4, -2.2, 4, { prop: 'book' }], ['carthage', -3.2, 3.4, 2.4, 5], ['fustat', 3.6, 3, -2, 6], ['andalus', 2.4, 6.4, Math.PI, 7]],
  },
  places: {
    atlas: { at: [7.8, 27.5], ry: -0.25, r: 5.6, make: () => M.observatory() },
    pyramids: { at: [-7.6, 23.5], ry: 0.25, r: 5.6, make: () => M.pyramids() },
    carthage: { at: [7.8, 15.2], ry: -0.2, r: 5.4, make: () => M.carthage() },
    state: { at: [-7.6, 12.2], ry: 0.25, r: 5.4, make: () => M.statePalace() },
    nile: { at: [7.8, -0.8], ry: -0.2, r: 5.6, make: () => M.nileValley() },
    fustat: { at: [-7.6, -2.4], ry: 0.25, r: 5.3, make: () => M.fustat() },
    horn: { at: [7.8, -13.4], ry: -0.25, r: 5.4, make: () => M.hornPort() },
    home: { at: [-7.6, -13.8], ry: 0.25, r: 5.2, make: () => M.familyHouse() },
    town: { at: [7.8, -27.2], ry: -0.2, r: 5.6, make: () => M.institutions() },
    libya: { at: [-7.6, -27.6], ry: 0.25, r: 5.6, make: () => M.oasis() },
    heroes: { at: [7.8, -38.6], ry: -0.2, r: 5.2, make: () => M.heroesGarden() },
    maghreb: { at: [-7.6, -39], ry: 0.25, r: 5.6, make: () => M.atlasMountains() },
    andalus: { at: [0.8, -52.6], ry: 0, r: 6.2, make: () => M.andalusPalace() },
  },
  stationExtra: { atlas: '🌍 في المرصد كرة أرضية: كل دول العالم بأعلامها وعواصمها وعملاتها.' },
  text: {
    quit: 'لا بأس! نكمل الرحلة متى شئت. 🧭',
    allDone: 'أضأت البوصلة كلها! 🧭 افتح الأطلس 🌍 وتجوّل في دول العالم.',
    goalDone: '<span>🧭</span><p><b>أنهيت دروس الجزيرة كلها!</b> افتح الأطلس 🌍، وراجع الدروس متى شئت 🔁</p>',
    gainChip: '🧭 شعاع في البوصلة',
    gained: '🧭 أضأنا شعاعاً جديداً في بوصلة الرحّالة.',
    allDoneNext: '🎉 أضأت بوصلة الرحّالة كلها!',
    questsSub: (n, all) => `كل درس يضيء شعاعاً في بوصلة الرحّالة. 🧭 ${num(n)} من ${num(all)}`,
  },
  extras,
});

// The visited countries of the atlas (save.world.atlas.visited).
type AtlasSave = { world?: { atlas?: { visited?: string[] } } };
const visitedSet = () => new Set((save.get() as AtlasSave).world?.atlas?.visited || []);
function remember(id: string) { save.update((s: AtlasSave) => { const w = (s.world ||= {}); const a = (w.atlas ||= {}); a.visited = [...new Set([...(a.visited || []), id])]; }); }

function extras(scene: THREE.Scene, api: IslandApi): Extras {
  const P = api.places;
  const compass = M.travellersCompass(QUESTS.length);
  compass.position.set(COMPASS[0], M.levelAt(COMPASS[1]), COMPASS[1]);
  scene.add(compass);
  const globeHost = document.getElementById('atlas-globe')!;
  let globe: ReturnType<typeof import('./globe.js').openGlobe> | null = null;

  function openAtlas() {
    if (globe) return;
    sfx.tap();
    api.stage.stop();
    import('./globe.js').then(m => {
      globe = m.openGlobe(globeHost, {
        say: api.say, sfx, visited: visitedSet(), onVisit: remember,
        onClose: () => { globe = null; api.stage.start(); api.say('أهلاً بعودتك من رحلتك حول العالم! 🌍'); },
      });
      api.say('هذه أرضنا! 🌍 اسحب لتديرها، واضغط على أيّ دولة لترى علمها وعاصمتها وعملتها ومعنى اسمها.', 'cheer');
    }).catch(err => { console.error('The atlas failed to load', err); api.stage.start(); });
  }
  document.getElementById('atlas-globe-btn')?.addEventListener('click', openAtlas);

  function reward() {
    const n = api.doneCount();
    api.focus(compass.position.x, compass.position.z, api.portrait() ? 38 : 32);
    api.say(n === api.total ? 'بوصلة الرحّالة مضاءة كلها، ونجمة سهيل فوقها! 🧭✨ كل شعاع درس أتقنته.' : `في البوصلة ${num(n)} من ${num(api.total)} أشعّة مضيئة. كل درس تُنهيه يضيء شعاعاً! 🧭`, n ? 'cheer' : 'happy');
  }

  function animate(dt: number, t: number) {
    P.atlas.obj.userData.earth.rotation.y = t * 0.25;
    const pu = P.pyramids.obj.userData; pu.boat.position.x = 1.4 + Math.sin(t * 0.3) * 2.2; pu.boat.position.y = pu.baseY + 0.12 + Math.sin(t * 2) * 0.02; pu.boat.rotation.y = Math.cos(t * 0.3) > 0 ? 0 : Math.PI;
    const cu = P.carthage.obj.userData; cu.ship.position.y = cu.baseY + 0.1 + Math.sin(t * 1.3) * 0.04; cu.ship.rotation.z = Math.sin(t * 1.1) * 0.03;
    const nu = P.nile.obj.userData, k = (t * 0.07) % 1; nu.boat.position.set(0, nu.baseY + 0.13 + Math.sin(t * 2) * 0.02, 3.4 - k * 6.2);
    const hu = P.horn.obj.userData; hu.ship.position.y = hu.baseY + 0.08 + Math.sin(t * 1.4 + 1) * 0.04;
    P.libya.obj.userData.beam.rotation.z = Math.sin(t * 1.6) * 0.32;
    const sp = P.andalus.obj.userData.spout; sp.material.opacity = 0.45 + Math.sin(t * 3) * 0.15;
    // the compass: one ray per finished quest; all of them light the star
    const cu2 = compass.userData, n = api.doneCount(), all = n === api.total;
    cu2.rays.forEach((r: LitMesh, i: number) => { r.material.emissive.set(i < n ? '#ff9a20' : '#000000'); r.material.color.set(i < n ? '#ffd36b' : '#a89878'); });
    cu2.needle.rotation.y = Math.sin(t * 0.7) * 0.4 + (all ? t * 0.6 : 0);
    cu2.star.material.emissiveIntensity = all ? 0.9 : 0.1;
    cu2.star.rotation.y = t;
    cu2.shine.material.opacity = all ? 0.8 + Math.sin(t * 3) * 0.15 : 0;
  }

  function tap(id: string) {
    if (id === 'earth') { openAtlas(); return true; }
    if (id === 'compass') { reward(); return true; }
    return false;
  }

  return {
    animate, tap, reward, action: (id: string) => { if (id === 'atlas') openAtlas(); },
    covering: () => !!globe, close: () => { globe?.close(); globe = null; },
    clickables: [[P.atlas.obj.userData.earth, 'earth'], [compass, 'compass']],
    debug: () => ({ globe: globe?.debug?.() || null }),
  };
}

export const { init, enter, lessonReturned, debugLook, debugStart, debug } = isle;
