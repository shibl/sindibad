// Made from english.ts by tools/build.ts. Edit that file, then run: npm run build
// «جزيرة Hello» — the English island, played in 3D (three.js).
//
// The grade-6 English book (Pupil's Book and Activity Book) as a bright
// seaside town of twelve places, in the book's order: the harbour of
// countries, Bosra's theatre, the Big Blue, the house of arts and TV, the
// hospital, the park, grandpa's farm, the Sunday souq, the garden of
// feelings by the river, the school, the clock-tower square and the hill of
// stars. One quest per unit (twenty) and the book's four revisions:
// twenty-four quests. Each teaches first (the unit's words, to hear and to
// see in the book's sentences; the grammar box) and then plays the book's
// exercises as games (core/english/games.js). The helper «بولي», a macaw,
// explains every step. A finished quest lights a star bulb round the HELLO
// sign at the beach; every fifth lights one of its letters.
//
// 📖 opens the child's word book (words.js): every word met so far, by unit,
// with its picture, its Arabic meaning and its sound, and a flash-card game.
//
// The engine is core/isle/island.ts. Content: worlds/grade6/english.js.
// Models: models.js. Pictures: views.js.
import { makeIsland } from '../isle/island.js';
import * as M from './models.js';
import { runStep, sayEn } from './games.js';
import { openWords } from './words.js';
import { num } from '../format.js';
import { sfx } from '../sound.js';
import { HELPER, STATIONS, UNITS, QUESTS } from '../../worlds/grade6/english.js';
const SIGN = [-9, 33.5];
// White and coloured houses round the edges of the town.
const TOWN = [
    [-14.8, 30.5, 0.5], [-14.6, 18.5, 0.3], [-14.6, 7, 0.2], [-14.6, -8, 0.2], [-14.2, -21, 0.4], [-13.8, -34, 0.3],
    [-9.5, -39, 0.2], [-6.6, -41.2, -0.3], [-11.6, -42.6, 0.5],
    [14.6, 21.5, -0.4], [14.8, 9.6, -0.3], [14.6, -7, -0.2], [14.4, -20.5, -0.4], [14.2, -33, -0.3], [12.6, -46, -0.5],
    [4.2, 36.6, 0.1], [-3.6, 37.2, 0], [-15, 37, 0.7],
];
const THRESHOLDS = [5, 10, 15, 20, 24];
const isle = makeIsland({
    key: 'english', title: 'جزيرة Hello', book: 'اللغة الإنكليزية', sticker: 'english', music: 'english',
    content: { HELPER, STATIONS, UNITS, QUESTS },
    ground: M, runStep,
    helper: () => M.helperParrot(),
    // A fresh blue morning over a turquoise sea.
    look: { sky: ['#3f9be8', '#a9dcff', '#eef9ff'], fogColor: '#e2f3ff', fog: [95, 190], hemi: ['#ffffff', '#86a9c0', 1.6], sun: ['#fff8ea', 2.45], sea: ['#58e0dc', '#1876c4', '#e8f6ff'], yaw: -0.2, pitch: 0.88 },
    camera: { start: [0.5, 25.5], dist: [98, 58], bounds: { x: 9, zMin: -50, zMax: 33 } },
    decor: {
        breaks: [6, -20, -46], trees: [0, 3, 2, 3, 0, 2], avoid: [[...SIGN, 3.6], ...TOWN.map(([x, z]) => [x, z, 1.8])], beach: [[14, 38, 4]],
        lampGlow: '#fff3c4',
        visitors: [['harbour', 3.4, 3.6, -2.6, 3], ['theatre', -3.6, 3.6, 2.6, 4, { prop: 'book' }], ['arts', 4.2, 3.4, -2.2, 5], ['souq', 3.6, 3.4, -2, 6], ['space', 2.4, 6.6, Math.PI, 7]],
    },
    places: {
        harbour: { at: [7.8, 27.5], ry: -0.25, r: 5.6, make: () => M.harbour() },
        theatre: { at: [-7.6, 23.5], ry: 0.25, r: 5.6, make: () => M.theatre() },
        aquarium: { at: [7.8, 15.2], ry: -0.2, r: 5.4, make: () => M.aquarium() },
        arts: { at: [-7.6, 12.2], ry: 0.25, r: 5.6, make: () => M.arts() },
        hospital: { at: [7.8, -0.8], ry: -0.2, r: 5.4, make: () => M.hospital() },
        park: { at: [-7.6, -2.4], ry: 0.25, r: 5.4, make: () => M.park() },
        farm: { at: [7.8, -13.4], ry: -0.25, r: 5.6, make: () => M.farm() },
        souq: { at: [-7.6, -13.8], ry: 0.25, r: 5.4, make: () => M.souq() },
        garden: { at: [7.8, -27.2], ry: -0.2, r: 5.6, make: () => M.garden() },
        school: { at: [-7.6, -27.6], ry: 0.25, r: 5.4, make: () => M.school() },
        square: { at: [7.8, -39], ry: -0.2, r: 5.4, make: () => M.square() },
        space: { at: [0.8, -52.6], ry: 0, r: 6.4, make: () => M.space() },
    },
    stationExtra: {
        harbour: '🔤 لافتة <bdi class="en" dir="ltr" lang="en">HELLO</bdi> على الشاطئ: كل درس تُنهيه يضيء نجمة حولها.',
        space: '🪐 اضغط على الكواكب الدوّارة لتسمع أسماءها بالإنكليزية.',
    },
    text: {
        quit: 'لا بأس! <bdi class="en" dir="ltr" lang="en">See you later!</bdi> نكمل متى شئت. 🦜',
        allDone: 'أضأت لافتة <bdi class="en" dir="ltr" lang="en">HELLO</bdi> كلها! 🌟 افتح دفتر كلماتك 📖 والعب بالبطاقات.',
        goalDone: '<span>🌟</span><p><b>أنهيت دروس الجزيرة كلها!</b> افتح دفتر كلماتك 📖، وراجع الدروس متى شئت 🔁</p>',
        gainChip: '⭐ نجمة في لافتة HELLO',
        gained: '⭐ أضأنا نجمة جديدة حول لافتة <bdi class="en" dir="ltr" lang="en">HELLO</bdi>.',
        allDoneNext: '🎉 أضأت لافتة HELLO كلها!',
        questsSub: (n, all) => `كل درس يضيء نجمة حول لافتة <bdi class="en" dir="ltr" lang="en">HELLO</bdi>. ⭐ ${num(n)} من ${num(all)}`,
    },
    extras,
});
function extras(scene, api) {
    const P = api.places;
    const sign = M.helloSign(QUESTS.length);
    sign.position.set(SIGN[0], M.levelAt(SIGN[1]), SIGN[1]);
    sign.rotation.y = 0.35;
    scene.add(sign);
    const town = M.town(TOWN);
    town.castShadow = !api.lite();
    scene.add(town);
    // two boats out at sea
    const boats = [[-23, 26, 0.6], [22, -4, -2.2]].map(([x, z, ry], i) => { const b = M.harbourBoat(i); b.position.set(x, 0.12, z); b.rotation.y = ry; scene.add(b); return b; });
    // ---------- the word book ----------
    const host = document.getElementById('english-words');
    let book = null;
    function openBook() {
        if (book)
            return;
        sfx.tap();
        api.stage.stop();
        book = openWords(host, {
            say: api.say, sfx,
            onClose: () => { book = null; api.stage.start(); },
        });
    }
    document.getElementById('english-words-btn')?.addEventListener('click', openBook);
    // ---------- the HELLO sign ----------
    const su = sign.userData;
    let litFor = -1;
    function light(n) {
        if (n === litFor)
            return;
        litFor = n;
        su.letters.forEach((m, i) => { const on = n >= THRESHOLDS[i]; m.material.color.set(on ? su.colors[i] : '#8a93a6'); m.material.emissive.set(on ? su.colors[i] : '#000000'); m.material.emissiveIntensity = on ? 0.45 : 0; });
        su.bulbs.forEach((b, i) => { const on = i < n; b.material.color.set(on ? '#fff2a8' : '#6a7080'); b.material.emissive.set(on ? '#ffc93c' : '#000000'); });
    }
    function reward() {
        const n = api.doneCount();
        api.focus(sign.position.x, sign.position.z, api.portrait() ? 34 : 30);
        const letters = THRESHOLDS.filter(x => n >= x).length;
        api.say(n === api.total
            ? 'لافتة <bdi class="en" dir="ltr" lang="en">HELLO</bdi> مضيئة كلها! 🌟 كل نجمة درس أتقنته من كتاب الإنكليزية. <bdi class="en" dir="ltr" lang="en">Well done!</bdi>'
            : `حول لافتة <bdi class="en" dir="ltr" lang="en">HELLO</bdi> ${num(n)} من ${num(api.total)} نجوم مضيئة${letters ? `، و${num(letters)} من حروفها` : ''}. كل درس يضيء نجمة، وكل خمسة دروس تضيء حرفاً! ⭐`, n ? 'cheer' : 'happy');
        sayEn('Hello!');
    }
    const parrot = () => M.parrots[0];
    let screenT = 0, screenI = 0;
    function animate(dt, t) {
        const n = api.doneCount(), all = n === api.total;
        light(n);
        if (all)
            su.letters.forEach((m, i) => { m.material.emissiveIntensity = 0.35 + Math.max(0, Math.sin(t * 3 - i * 0.7)) * 0.6; });
        su.shine.material.opacity = all ? 0.55 + Math.sin(t * 2.5) * 0.2 : 0;
        const pw = parrot()?.userData.wings;
        if (pw) {
            const f = Math.sin(t * 7) * 0.3;
            pw[0].rotation.z = f;
            pw[1].rotation.z = -f;
        }
        boats.forEach((b, i) => { b.position.y = 0.12 + Math.sin(t * 1.3 + i) * 0.06; b.rotation.z = Math.sin(t * 1.1 + i) * 0.05; });
        const hu = P.harbour.obj.userData;
        hu.flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 3 + i * 0.8) * 0.28; });
        hu.ship.position.y = hu.baseY + 0.05 + Math.sin(t * 1.4) * 0.04;
        hu.ship.rotation.z = Math.sin(t * 1.1) * 0.04;
        hu.earth.rotation.y = t * 0.6;
        hu.beam.material.opacity = 0.55 + Math.sin(t * 2) * 0.3;
        const tu = P.theatre.obj.userData;
        tu.curtains.forEach((c) => { c.scale.x = 0.82 + Math.sin(t * 0.7) * 0.16; });
        tu.masks.rotation.y = t * 0.8;
        tu.spots.forEach((s, i) => { s.material.opacity = 0.35 + Math.sin(t * 1.7 + i * 2) * 0.25; });
        const au = P.aquarium.obj.userData;
        au.school.rotation.y = t * 0.6;
        const leap = Math.sin(t * 1.1);
        au.whale.position.y = au.baseY + 0.45 + Math.max(0, leap) * 0.7;
        au.whale.rotation.z = Math.cos(t * 1.1) * 0.35;
        au.spout.material.opacity = Math.max(0, Math.sin(t * 2.2)) * 0.8;
        au.flag.rotation.y = Math.sin(t * 2.6) * 0.3;
        const ru = P.arts.obj.userData;
        screenT += dt;
        if (screenT > 2.6) {
            screenT = 0;
            screenI = (screenI + 1) % ru.screens.length;
            ru.screen.material.map = ru.screens[screenI];
        }
        const hsp = P.hospital.obj.userData, blink = Math.floor(t * 2.5) % 2;
        hsp.flash.material.opacity = blink ? 0.85 : 0.1;
        hsp.light.material.emissive.set(blink ? '#3f8fff' : '#0a1a40');
        const pu = P.park.obj.userData;
        pu.swing.rotation.x = Math.sin(t * 2) * 0.5;
        const a = t * 0.55;
        pu.bike.position.set(Math.cos(a) * 3.3, pu.baseY + 0.02, Math.sin(a) * 3.3);
        pu.bike.rotation.y = -a;
        const j = -t * 0.35 + 2;
        pu.jogger.position.set(Math.cos(j) * 2.95, pu.baseY + Math.abs(Math.sin(t * 8)) * 0.06, Math.sin(j) * 2.95);
        pu.jogger.rotation.y = -j + Math.PI;
        pu.spray.material.opacity = 0.45 + Math.sin(t * 4) * 0.15;
        P.farm.obj.userData.blades.rotation.z += dt * 1.4;
        const qu = P.souq.obj.userData;
        qu.tents.forEach((m, i) => { m.rotation.x = 0.18 + Math.sin(t * 1.6 + i) * 0.035; });
        qu.lanterns.forEach((l, i) => { l.material.opacity = 0.55 + Math.sin(t * 5 + i * 1.7) * 0.15; });
        qu.fire.material.opacity = 0.6 + Math.sin(t * 9) * 0.15;
        const gu = P.garden.obj.userData;
        gu.rotor.rotation.z = t * 3;
        gu.faces.forEach((f, i) => { f.rotation.y = Math.sin(t * 1.2 + i * 1.5) * 0.35; });
        gu.shimmer.material.opacity = 0.25 + Math.sin(t * 2) * 0.12;
        const scu = P.school.obj.userData;
        scu.flag.rotation.y = Math.sin(t * 3) * 0.28;
        scu.hands.rotation.z = -t * 0.4;
        const sq = P.square.obj.userData, now = new Date(), mins = now.getMinutes() + now.getSeconds() / 60, hrs = (now.getHours() % 12) + mins / 60;
        sq.hands.forEach((hd) => { hd.hour.rotation.z = -(hrs / 12) * Math.PI * 2; hd.min.rotation.z = -(mins / 60) * Math.PI * 2; });
        sq.balloons.forEach((b, i) => { b.position.y = b.userData.y + Math.sin(t * 1.4 + i) * 0.12; b.rotation.z = Math.sin(t + i) * 0.1; });
        const spu = P.space.obj.userData;
        spu.dome.rotation.y = Math.sin(t * 0.3) * 0.9;
        spu.planets.forEach((pl) => { pl.arm.rotation.y += dt * pl.speed; });
        spu.robotArm.rotation.z = 2.4 + Math.sin(t * 5) * 0.5;
        spu.fire.material.opacity = 0.6 + Math.sin(t * 11) * 0.2;
        spu.sunGlow.material.opacity = 0.65 + Math.sin(t * 2) * 0.15;
    }
    function tap(id) {
        if (id === 'sign') {
            reward();
            return true;
        }
        if (id === 'orrery') {
            api.say('هذه المجموعة الشمسية: <bdi class="en" dir="ltr" lang="en">The Sun and the eight planets.</bdi> ☀️🪐', 'cheer');
            sayEn('Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.');
            return true;
        }
        return false;
    }
    return {
        animate, tap, reward,
        covering: () => !!book, close: () => { book?.close(); book = null; },
        clickables: [[sign, 'sign'], [P.space.obj.userData.planets[0].arm.parent, 'orrery']],
        debug: () => ({ book: book?.debug?.() || null, lit: litFor }),
    };
}
export const initEnglish = isle.init, enterEnglish = isle.enter, lessonReturned = isle.lessonReturned;
export const debugLook = isle.debugLook, debugStart = isle.debugStart, debugEnglish = isle.debug;
