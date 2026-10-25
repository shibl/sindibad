// Made from app.ts by tools/build.ts. Edit that file, then run: npm run build
// رحلات سندباد وياسمينة — core app entry point.
//
// Responsibilities of the core (see SPEC.md): screens/navigation, the world
// map, the ship, save data and progress. Subject content never lives here —
// it lives in plugins/ and talks to the core through the plugin interface,
// so adding a topic never requires editing this file.
import { wipe } from './core/fx.js';
import { openSettings, applySettings } from './core/settings.js';
import { startAmbience, stopAmbience } from './core/ambience.js';
import { defsSVG, shipSVG, palmSVG, gullSVG, cloudSVG, skylineSVG, shoreSVG, heroSVG, hudhudSVG } from './art/art.js';
import { save } from './core/save.js';
import { initMap, enter as enterMap, totalStars, badgeState, preloadMapView, debugSea, debugSeaLook } from './core/map.js';
import { renderChapters } from './core/chapters.js';
import { STAGES, CHAPTERS } from './worlds/chapters.js';
import { renderJourney } from './core/journey.js';
import { openShop, applyStyle } from './core/shop.js';
import { showStory } from './core/story.js';
import { initFamily, renderWho, renderParentGate } from './core/family.js';
import { playMusic } from './core/music.js';
import { profileList, addPlayTime, activeProfile } from './core/save.js';
import { initOverworld, enterIsland, lessonReturned, debugState, debugBlocked, debugPlace } from './core/overworld.js';
import arabicIsland from './worlds/grade6/arabic.js';
import mathIsland from './worlds/grade6/math.js';
import treasureIsland from './worlds/grade6/treasure.js';
import { initLesson, startLesson, streak } from './core/lesson.js';
import { sfx } from './core/sound.js';
import world from './worlds/grade6.js';
import { num } from './core/format.js';
import { STAGING, storeKey } from './core/env.js';
import { stopSpeaking } from './core/voice.js';
import { initTouch } from './core/touch.js';
import { initLanguage, playerName } from './core/i18n.js';
import './plugins/index.js';
// ---------- Backdrop ----------
// Day, sunset or night, from the device clock (override with ?time=night).
function timeOfDay() {
    const forced = new URLSearchParams(location.search).get('time');
    if (['day', 'sunset', 'night'].includes(forced))
        return forced;
    const h = new Date().getHours();
    return h >= 6 && h < 16 ? 'day' : h >= 16 && h < 19 ? 'sunset' : 'night';
}
function paintScene() {
    document.body.dataset.time = timeOfDay();
    const stars = document.querySelector('.stars');
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    stars.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 100).toFixed(1)}%;--s:${(1 + rnd() * 2.2).toFixed(1)}px;animation-delay:${(-rnd() * 4).toFixed(1)}s"></i>`).join('');
    document.body.insertAdjacentHTML('afterbegin', defsSVG());
    document.querySelector('.skyline').innerHTML = skylineSVG();
    document.querySelector('.shore').innerHTML = shoreSVG();
    document.querySelectorAll('.palm').forEach(el => { el.innerHTML = palmSVG(); });
    document.querySelectorAll('.guide__bird').forEach(el => { el.innerHTML = hudhudSVG(); });
    const clouds = document.querySelector('.clouds');
    [
        { top: 6, width: 30, duration: 90, delay: -20 },
        { top: 22, width: 20, duration: 120, delay: -70 },
        { top: 14, width: 24, duration: 105, delay: -45 },
    ].forEach(({ top, width, duration, delay }) => {
        clouds.insertAdjacentHTML('beforeend', cloudSVG());
        const c = clouds.lastElementChild;
        Object.assign(c.style, { top: `${top}%`, width: `${width}vmin`, animationDuration: `${duration}s`, animationDelay: `${delay}s` });
    });
    const gulls = document.querySelector('.gulls');
    [
        { top: 34, duration: 16, delay: 0 },
        { top: 42, duration: 22, delay: -9 },
        { top: 38, duration: 19, delay: -4 },
    ].forEach(({ top, duration, delay }) => {
        gulls.insertAdjacentHTML('beforeend', gullSVG());
        const g = gulls.lastElementChild;
        Object.assign(g.style, { top: `${top}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` });
    });
}
// Draw a ship into `el` with the given crew; wraps it so it can bob.
function paintShip(el, crew) {
    el.innerHTML = `<div class="ship__bob">${shipSVG({ crew })}</div>`;
}
// ---------- Screens ----------
// Show one screen by name ("title", "select", "chapters", "map", "activity" …); hides the rest.
let place = 'title'; // which music theme is playing
export function showScreen(name, detail) {
    document.querySelectorAll('.screen').forEach(el => {
        el.toggleAttribute('data-active', el.id === `screen-${name}`);
    });
    document.body.dataset.screen = name;
    if (['island', 'farm', 'tunes', 'lab', 'atlas', 'studio', 'english'].includes(name))
        startAmbience();
    else
        stopAmbience();
    if (name === 'title' || name === 'map' || name === 'chapters') {
        place = name === 'chapters' ? 'map' : name;
        playMusic(place);
    }
    if (name === 'chapters') {
        renderChapters(document.getElementById('chapters'), {
            stages: STAGES,
            chapters: CHAPTERS,
            // Only voyage 6 is open: its world is worlds/grade6.js.
            progress: () => ({ ...totalStars(), badges: world.regions.filter(r => badgeState(r.id)).length, badgeMax: world.regions.length }),
            open: () => wipe(() => showScreen('map')),
        });
    }
    if (name === 'map') {
        const hero = save.get().hero || 'sindbad';
        document.getElementById('hero-btn').innerHTML = `<span class="hero-face">${heroSVG(hero)}</span>`;
        enterMap(detail);
    }
    if (name === 'who')
        renderWho(document.getElementById('who'));
    if (name === 'parents')
        renderParentGate(document.getElementById('parents'));
    if (name === 'journey')
        renderJourney(document.getElementById('journey'), world, { showScreen });
}
function wireNavigation() {
    document.addEventListener('click', e => {
        const target = e.target.closest('[data-go]');
        if (target) {
            sfx.tap();
            showScreen(target.dataset.go);
        }
    });
    document.getElementById('pearl-btn').addEventListener('click', () => openShop({
        changed: () => {
            paintShip(document.querySelector('.ship--title'), ['sindbad', 'yasmina']);
            document.getElementById('hero-btn').innerHTML = `<span class="hero-face">${heroSVG(save.get().hero || 'sindbad')}</span>`;
            enterMap();
        },
    }));
    document.getElementById('mute-btn').addEventListener('click', () => { sfx.tap(); openSettings(); });
    applySettings();
}
// ---------- Character select ----------
const HERO_LINES = {
    sindbad: '<b>سندباد</b> البحّار الشجاع! لا يخاف الموج ولا الأسئلة الصعبة.',
    yasmina: '<b>ياسمينة</b> المستكشفة الذكية! عينها على كل سرّ في الخريطة.',
};
function wireHeroSelect() {
    const cards = [...document.querySelectorAll('.hero-card')];
    const group = document.querySelector('.heroes');
    const go = document.getElementById('select-go');
    const bubble = document.getElementById('select-bubble');
    cards.forEach(card => {
        card.querySelector('.hero-card__art').innerHTML = heroSVG(card.dataset.hero);
    });
    function choose(id, { announce = true } = {}) {
        cards.forEach(c => c.setAttribute('aria-checked', String(c.dataset.hero === id)));
        group.classList.add('has-choice');
        go.disabled = false;
        if (announce) {
            bubble.innerHTML = HERO_LINES[id];
            bubble.classList.remove('pop');
            void bubble.offsetWidth;
            bubble.classList.add('pop');
        }
    }
    cards.forEach(card => card.addEventListener('click', () => choose(card.dataset.hero)));
    go.addEventListener('click', () => {
        const chosen = cards.find(c => c.getAttribute('aria-checked') === 'true');
        if (!chosen)
            return;
        save.update(s => { s.hero = chosen.dataset.hero; });
        applyStyle();
        if (save.get().storySeen)
            showScreen('chapters');
        else
            showStory(() => showScreen('chapters'));
    });
    const saved = save.get().hero;
    if (saved)
        choose(saved, { announce: false });
}
// ---------- Offline support ----------
function registerServiceWorker() {
    if (!('serviceWorker' in navigator))
        return;
    // Service workers need a secure context (https or localhost) — skip
    // silently otherwise, e.g. when opened straight from file://.
    if (!window.isSecureContext)
        return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(err => {
            console.warn('Service worker registration failed:', err);
        });
    });
    // A new version arrived while the old one was open: reload to show it,
    // but only between activities (title, voyages, sea map), never mid-lesson.
    // The first install (no old version) never reloads.
    const hadOld = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadOld || reloading)
            return;
        // (No screen name yet = the title screen, before any tap.)
        if (['title', 'chapters', 'map'].includes(document.body.dataset.screen || 'title')) {
            reloading = true;
            location.reload();
        }
    });
}
// Lite mode for budget phones: ≤ 2 GB memory or ≤ 4 cores.
// ?lite=1 / ?lite=0 force it on or off.
{
    const forced = new URLSearchParams(location.search).get('lite');
    const weak = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    if (forced === '1' || (forced !== '0' && weak))
        document.body.classList.add('lite');
}
// Browsers only allow sound after the first tap: start the music then.
window.addEventListener('pointerdown', () => playMusic(place), { once: true });
window.addEventListener('keydown', () => playMusic(place), { once: true });
// Pause every animation while the app is in the background (saves battery
// on low-end phones).
document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('is-paused', document.hidden);
    if (document.hidden)
        stopSpeaking(); // sound itself pauses in core/sound.js
});
// ---------- Boot ----------
initLanguage();
applyStyle();
initTouch();
paintScene();
paintShip(document.querySelector('.ship--title'), ['sindbad', 'yasmina']);
wireNavigation();
wireHeroSelect();
const ISLANDS = { arabic: arabicIsland, math: mathIsland, treasure: treasureIsland };
// The 3D islands, by their kind in worlds/grade6.js. Each one's code (and
// three.js) loads only when a child first sails there, so the rest of the
// game starts as fast as before. Each module has init(hooks),
// enter(region), lessonReturned(after) and debug() (core/isle/island.ts);
// its screen is #screen-<kind>, and `region` is its id on the map, which
// also names its music.
const ISLANDS_3D = {
    farm: { file: './core/farm/farm.js', region: 'farm', name: 'The farm' },
    tunes: { file: './core/tunes/tunes.js', region: 'music', name: 'The music island' },
    lab: { file: './core/lab/lab.js', region: 'science', name: 'The science island' },
    atlas: { file: './core/atlas/atlas.js', region: 'social', name: 'The atlas island' },
    studio: { file: './core/studio/studio.js', region: 'art', name: 'The art island' },
    english: { file: './core/english/english.js', region: 'english', name: 'The English island' },
};
const loaded3D = {};
// Where the lesson that is playing was started: a 3D island's kind,
// 'island' (an island of the overworld) or null (the map).
let lessonFrom = null;
function load3D(kind) {
    return (loaded3D[kind] ||= import(ISLANDS_3D[kind].file).then((m) => {
        m.init({
            leave: after => wipe(() => showScreen('map', after)),
            startLesson: id => { lessonFrom = kind; wipe(() => startLesson(id)); },
        });
        return m;
    }).catch(err => { delete loaded3D[kind]; throw err; }));
}
function enter3D(kind, region) {
    const { region: music, name } = ISLANDS_3D[kind];
    load3D(kind).then(m => wipe(() => { showScreen(kind); m.enter(region); place = music; playMusic(music); }))
        .catch(err => console.error(`${name} failed to load`, err));
}
initMap(document.getElementById('map'), world, {
    openTopic: startLesson,
    islands: { ...ISLANDS, ...Object.fromEntries(Object.values(ISLANDS_3D).map(I => [I.region, true])) },
    enterIsland: (id) => {
        const region = world.regions.find(r => r.id === id);
        if (ISLANDS_3D[region.kind]) {
            enter3D(region.kind, region);
            return;
        }
        wipe(() => { showScreen('island'); enterIsland(ISLANDS[id], region); place = id; playMusic(id); });
    },
});
// The 3D sea map (staging) loads while the child is still on the title
// screen, so the map is ready when they get there.
setTimeout(() => preloadMapView(), 800);
initOverworld({
    startLesson: (id, host) => { lessonFrom = 'island'; wipe(() => startLesson(id, { host })); },
    leave: (after) => wipe(() => showScreen('map', after)),
});
initLesson({
    showScreen,
    onReturn: (after) => {
        const from = lessonFrom;
        lessonFrom = null;
        if (from === 'island')
            wipe(() => { showScreen('island'); lessonReturned(after); });
        else if (from)
            load3D(from).then(m => wipe(() => { showScreen(from); m.lessonReturned(after); }));
        else
            showScreen('map', after);
    },
});
// The staging copy wears a ribbon, so nobody mistakes it for the live game.
if (STAGING) {
    document.documentElement.dataset.env = 'staging';
}
registerServiceWorker();
initFamily({ worldDef: world, showScreen });
try {
    const boot = sessionStorage.getItem(storeKey('boot'));
    if (boot) {
        sessionStorage.removeItem(storeKey('boot'));
        showScreen(boot);
    }
}
catch { /* ignore */ }
// Count play time for the parents' page (only while the game is visible).
setInterval(() => { if (!document.hidden && document.body.dataset.screen !== 'title')
    addPlayTime(15); }, 15000);
// Start button: several children → "who is playing?"; a new device → ask
// the child's name; one returning child → straight back to the voyages.
{
    const start = document.querySelector('#screen-title [data-go]');
    const list = profileList();
    if (list.length > 1) {
        start.dataset.go = 'who';
        start.textContent = 'مَن يلعب؟';
    }
    else if (!list.length || !list[0].name && !save.get().hero)
        start.dataset.go = 'who';
}
if (save.get().hero && profileList().length <= 1) {
    const start = document.querySelector('#screen-title [data-go]');
    start.dataset.go = 'chapters';
    start.textContent = 'تابِع الرحلة';
    document.getElementById('title-tag').textContent = `مرحباً بعودتك يا ${save.get().hero === 'yasmina' ? 'ياسمينة' : 'سندباد'}! ⛵`;
    // A "welcome back" card: face, name, stars and the day streak.
    const { stars, max } = totalStars();
    const days = streak();
    const card = document.createElement('div');
    card.className = 'title-card';
    card.innerHTML = `<span class="title-card__face">${heroSVG(save.get().hero)}</span>
    <b>${playerName(activeProfile()?.name, save.get().hero === 'yasmina' ? 'ياسمينة' : 'سندباد')}</b>
    <span class="title-card__stat">★ ${num(stars)}<small>/${num(max)}</small></span>
    ${days ? `<span class="title-card__stat title-card__stat--fire">🔥 ${num(days)}</span>` : ''}`;
    start.before(card);
}
// Gentle parallax on the title scene: layers drift with the finger/mouse.
document.getElementById('screen-title').addEventListener('pointermove', e => {
    const scene = document.getElementById('scene');
    scene.style.setProperty('--px', ((e.clientX / innerWidth) - 0.5).toFixed(3));
    scene.style.setProperty('--py', ((e.clientY / innerHeight) - 0.5).toFixed(3));
});
// Test hooks: the hero's position on an island, and each 3D island's state
// (__lab()) and test functions (__labDo('debugStart', 'quest id')).
if (window.__SINDBAD_TEST__) {
    Object.assign(window, { __island: debugState, __blocked: debugBlocked, __place: debugPlace, __lesson: startLesson, __sea: debugSea, __seaLook: debugSeaLook });
    for (const kind of Object.keys(ISLANDS_3D)) {
        const w = window;
        w[`__${kind}`] = () => load3D(kind).then(m => m.debug());
        w[`__${kind}Do`] = (fn, ...a) => load3D(kind).then(m => m[fn](...a));
    }
}
