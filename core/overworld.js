// Walkable islands: a small top-down adventure engine (think Zelda, gently).
//
// The student walks their hero around an island, talks to villagers, reads
// signs, opens chests and collects pearls. Villagers' quests launch the
// normal lessons (core/lesson.js); success earns a golden letter and can
// open gates. Islands are plain data files (worlds/grade6/*.js).
//
// Rendering: one <canvas>. The ground is drawn once into an offscreen
// canvas; each frame blits the visible part, animates the sea, then draws
// people and props sorted by depth (y). Sprites are the same SVG art as the
// rest of the game, rasterised once (art/sprites.js).
//
// Input: arrow keys / WASD + Space/Enter; on touch a floating joystick
// (drag anywhere on the lower-left) and an action button; tapping a person
// or thing walks there and interacts.

import { objectSprite, villagerSprite, heroSprite, hudhudSprite, portraitSVG, drawPearl } from '../art/sprites.js';
import { hudhudSVG } from '../art/art.js';
const hudhudPortrait = () => hudhudSVG();
import { HEROES, g, heroSVG } from '../art/art.js';
import { shake } from './fx.js';
import { save } from './save.js';
import { sfx } from './sound.js';
import { num } from './format.js';
import { canSpeak, speak, stopSpeaking } from './voice.js';

const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;

const SPEED = 4.2;          // tiles per second
const RADIUS = 0.28;        // player collision radius (tiles)
const TALK_RANGE = 1.8;     // how close you must be to interact (tiles)
const SOLID = new Set(['~', 'w', '#']);
const WATER = new Set(['~', 'w']);

let els;                    // DOM handles
let ctx, dpr = 1, W = 0, H = 0, TILE = 48;
let island = null;          // current island definition
let state = null;           // this island's saved progress
let ground = null;          // offscreen canvas with the static ground
let GROUND_RES = 1;         // ground canvas pixels per CSS pixel
let player, bird, cam;
let people = [], props = [];
let running = false, last = 0, time = 0;
let keys = new Set();
let joy = null;             // { id, ox, oy, dx, dy }
let target = null;          // tap-to-walk { x, y, then }
let dialog = null;          // active conversation
let busy = false;           // input locked (dialogue, lesson, popups)
let hooks;                  // { startLesson, leave, hero }
let pendingQuest = null;    // quest waiting for a lesson result
let sessionGain = { gained: 0, topic: null };
let puzzles = [];           // live walk-on puzzles (see setupPuzzles)
let splashes = [];          // water splash effects { x, y, t }
let dust = [];              // footstep puffs { x, y, t }
let dustTimer = 0;
let shade = null;           // offscreen canvas for night lighting

// ---------- Setup ----------

export function initOverworld({ startLesson, leave }) {
  hooks = { startLesson, leave };
  els = {
    screen: document.getElementById('screen-island'),
    canvas: document.getElementById('island-canvas'),
    name: document.getElementById('island-name'),
    pearls: document.getElementById('pearl-count'),
    letters: document.getElementById('letter-slots'),
    joy: document.getElementById('joy'),
    knob: document.querySelector('#joy .joy__knob'),
    act: document.getElementById('act-btn'),
    dlg: document.getElementById('dialog'),
    popup: document.getElementById('item-popup'),
    hint: document.getElementById('island-hint'),
    banner: document.getElementById('isle-banner'),
    goal: document.getElementById('goal'),
    tut: document.getElementById('walk-tut'),
  };
  ctx = els.canvas.getContext('2d');
  new ResizeObserver(resize).observe(els.canvas);

  window.addEventListener('keydown', e => {
    if (!running) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { keys.add(k); e.preventDefault(); }
    if (k === ' ' || k === 'enter') { e.preventDefault(); if (!e.repeat) action(); }
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  // Floating joystick: press anywhere on the canvas and drag.
  els.canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  els.act.addEventListener('click', e => { e.stopPropagation(); action(); });
  document.getElementById('island-leave').addEventListener('click', () => { sfx.tap(); leaveIsland(); });
  els.dlg.addEventListener('click', onDialogClick);
  els.popup.addEventListener('click', () => closePopup());
  document.getElementById('log-btn').addEventListener('click', e => { e.stopPropagation(); sfx.tap(); toggleLog(); });
}

function resize() {
  const r = els.canvas.getBoundingClientRect();
  if (!r.width) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  els.canvas.width = Math.round(W * dpr);
  els.canvas.height = Math.round(H * dpr);
  // About 9 tiles across a phone, more on bigger screens.
  const newTile = Math.round(Math.max(40, Math.min(64, W / 9)));
  if (newTile !== TILE || !ground) { TILE = newTile; if (island) buildGround(); }
}

// ---------- Save data ----------

function islandState(id) {
  const s = save.get();
  const w = (s.world ||= {});
  const st = (w[id] ||= { letters: [], pearls: [], chests: [], monument: false, met: [] });
  st.puzzles ||= {};
  st.items ||= [];
  return st;
}
const persist = () => save.update(() => {});
const tokens = () => island.tokens || ['ع', 'ل', 'م'];
const heroId = () => save.get().hero || 'sindbad';
const fill = text => text.replace(/\{name\}/g, HEROES[heroId()].name);
// A quest is done when its lesson has a star — or, for a fetch quest, when
// the lost thing has been found.
// Has this villager already handed over their reward?
const rewarded = p => (p.quest.letter ? state.letters.includes(p.quest.letter) : (state.rewarded || []).includes(p.id));
const questDone = q => (q.fetch ? state.items.includes(q.fetch) : (save.get().topics[q.topic]?.stars || 0) >= 1);

// ---------- Enter / leave ----------

export function enterIsland(def, region) {
  island = def;
  state = islandState(def.id);
  els.name.textContent = def.name;
  const [sx, sy] = def.spawn;
  player = { x: sx, y: sy, face: 1, moving: false, step: 0, sprite: heroSprite(heroId()) };
  bird = { x: sx - 0.9, y: sy - 0.6, sprite: hudhudSprite() };
  cam = { x: sx, y: sy };
  people = def.people.map(p => ({ ...p, x: p.at[0], y: p.at[1], face: -1, sprite: villagerSprite(p.id, p.look), pause: Math.random() * 3 }));
  props = def.objects.map(o => ({ ...o, x: o.at[0], y: o.at[1], sprite: objectSprite(o.kind === 'gate' && gateOpen(o) ? 'gate' : o.kind) }));
  sessionGain = { gained: 0, topic: null };
  setupAmbient();
  setupPuzzles();
  dialog = null; busy = false; target = null; keys.clear();
  ground = null;
  resize();
  if (!ground) buildGround();
  updateHud();
  if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  showBanner(def, region);
  // First visit: the fisherman calls out.
  if (!state.met.includes('arrival')) {
    state.met.push('arrival'); persist();
    setTimeout(() => showHint(`اقترب من <b>${def.people[0].name}</b> واضغط ✋ للتحدّث`), 2600);
  }
  // Very first island ever: show how to walk until the child moves.
  let tutSeen = false;
  try { tutSeen = !!localStorage.getItem('sindbad.walked'); } catch { /* ignore */ }
  if (!tutSeen) setTimeout(() => { if (island === def && !walked) els.tut.hidden = false; }, 2400);
}

// A big title card as the hero steps ashore: island name, subject and how
// many golden tokens are already collected.
let bannerTimer;
function showBanner(def, region) {
  const have = def.tokens.filter(t => state.letters.includes(t)).length;
  els.banner.innerHTML = `
    ${region ? `<small style="--c:${region.color}">${region.subject}</small>` : ''}
    <b>${def.name}</b>
    <span>${def.tokens.map(t => `<i class="${state.letters.includes(t) ? 'on' : ''}">${t}</i>`).join('')}</span>
    <em>${have === def.tokens.length ? 'أكملت هذه الجزيرة! ✔' : `${def.tokenName}: ${have} / ${def.tokens.length}`.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])}</em>`;
  els.banner.hidden = false;
  els.banner.classList.remove('is-out'); void els.banner.offsetWidth;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => els.banner.classList.add('is-out'), 2200);
  els.banner.onanimationend = e => { if (e.animationName === 'banner-out') els.banner.hidden = true; };
}

// Called the first time the player actually moves.
let walked = false;
function markWalked() {
  if (walked) return;
  walked = true;
  els.tut.hidden = true;
  try { localStorage.setItem('sindbad.walked', '1'); } catch { /* ignore */ }
}

function leaveIsland() {
  running = false;
  closeDialog();
  hooks.leave(sessionGain.gained > 0 ? sessionGain : undefined);
}

export function isActive() { return !!island && els.screen.hasAttribute('data-active'); }

// ---------- Map helpers ----------

const tileAt = (x, y) => {
  const row = island.tiles[Math.floor(y)];
  return row ? row[Math.floor(x)] ?? '~' : '~';
};
const gateOpen = o => o.opens && state && state.letters.includes(island.people.find(p => p.id === o.opens)?.quest.letter);

function onStone(x, y) {
  for (const pz of puzzles) for (const st of pz.stones) if (Math.abs(x - st.x) < 0.5 && Math.abs(y - st.y) < 0.5) return st;
  return null;
}

function propAt(x, y) {
  for (const o of props) {
    if (!o.block) continue;
    if (o.kind === 'gate' && gateOpen(o)) continue;
    const [bw, bh] = o.block;
    if (x > o.x - bw / 2 && x < o.x + bw / 2 && y > o.y - bh && y < o.y) return true;
  }
  return false;
}

function blocked(x, y) {
  const t = tileAt(x, y);
  if (SOLID.has(t) && !(WATER.has(t) && onStone(x, y))) return true;
  if (propAt(x, y)) return true;
  for (const p of people) if (Math.hypot(p.x - x, p.y - 0.15 - y) < 0.42) return true;
  return false;
}
const hits = (x, y) => [[0, 0], [RADIUS, 0], [-RADIUS, 0], [0, -RADIUS * 0.6], [0, RADIUS * 0.4]].some(([dx, dy]) => blocked(x + dx, y + dy));

// ---------- Ground ----------

function rand(x, y, k = 0) {
  const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function buildGround() {
  if (!island) return;
  const rows = island.tiles.length, cols = island.tiles[0].length;
  GROUND_RES = Math.min(dpr, 1.5);
  const T = TILE * GROUND_RES;
  ground = document.createElement('canvas');
  ground.width = Math.ceil(cols * T);
  ground.height = Math.ceil(rows * T);
  const c = ground.getContext('2d');
  const land = (x, y) => !WATER.has(tileAt(x + 0.5, y + 0.5));
  const at = (x, y) => tileAt(x + 0.5, y + 0.5);

  // Each layer is one Path2D of soft blobs (so coasts look organic),
  // filled once — overlapping blobs don't stack their transparency. Layers
  // are stacked like a toy diorama: sea < sand < grass, each with a darker
  // "lip" below it so the land looks raised.
  let path;
  const shape = (pred, r) => {
    path = new Path2D();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!pred(x, y)) continue;
      path.moveTo((x + 0.5 + r) * T, (y + 0.5) * T);
      path.arc((x + 0.5) * T, (y + 0.5) * T, r * T, 0, 7);
    }
  };
  // Fill the current shape in a colour (optionally offset and textured by
  // paint(c), clipped to the shape).
  const stamp = (color, { dy = 0, alpha = 1, paint = null } = {}) => {
    c.save();
    c.globalAlpha = alpha;
    c.translate(0, dy * T);
    c.fillStyle = color;
    c.fill(path);
    if (paint) { c.clip(path); paint(c); }
    c.restore();
  };
  const blob = (g, x, y, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };

  // Sea: deep blue with darker patches, then shallow turquoise bands that
  // fade out away from the coast.
  const sea = c.createLinearGradient(0, 0, 0, ground.height);
  sea.addColorStop(0, '#1f78b4'); sea.addColorStop(1, '#2a8cc0');
  c.fillStyle = sea; c.fillRect(0, 0, ground.width, ground.height);
  for (let i = 0; i < cols * rows / 6; i++) {
    const x = rand(i, 1) * ground.width, y = rand(i, 2) * ground.height;
    blob(c, x, y, T * (0.8 + rand(i, 3) * 1.6), `rgba(15,70,130,${0.08 + rand(i, 4) * 0.08})`);
  }
  shape(land, 2.6); stamp('#3aa6cf', { alpha: 0.5 });
  shape(land, 2); stamp('#44b2d4', { alpha: 0.6 });
  shape(land, 1.5); stamp('#5cc4d9', { alpha: 0.8 });
  shape(land, 1.15); stamp('#7ad6dd');
  // Ponds are bright and still, with lily pads.
  if (island.tiles.some(r => r.includes('w'))) { shape((x, y) => at(x, y) === 'w', 0.6); stamp('#6fd0de'); }
  // Shadow of the island on the water, then white surf and wet sand.
  shape(land, 0.74); stamp('rgba(10,60,90,1)', { dy: 0.28, alpha: 0.28 });
  shape(land, 0.92); stamp('#ffffff', { alpha: 0.85 });
  shape(land, 0.8); stamp('#d7b374');

  // Sand, with a short sandy bank below it and speckles.
  shape(land, 0.72);
  stamp('#c7934f', { dy: 0.16 });
  stamp('#f3d69a', {
    paint: g => {
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (!land(x, y)) continue;
        for (let k = 0; k < 4; k++) if (rand(x, y, k) > 0.45) blob(g, (x + rand(x, y, k + 7)) * T, (y + rand(x, y, k + 9)) * T, (1 + rand(x, y, k) * 1.4) * GROUND_RES, k % 2 ? '#dcb877' : '#fff1c8');
        if (rand(x, y, 30) > 0.93) { // a shell
          g.fillStyle = '#ffd9d0'; g.beginPath(); g.ellipse((x + 0.5) * T, (y + 0.5) * T, 4 * GROUND_RES, 3 * GROUND_RES, rand(x, y) * 3, 0, 7); g.fill();
        }
      }
    },
  });

  // Grass: raised with a dark lip, painted with light and dark patches,
  // tufts and tiny flowers.
  const grassy = (x, y) => '.=#'.includes(at(x, y)) || at(x, y) === 'd' && false;
  shape((x, y) => at(x, y) === '.' || at(x, y) === '#', 0.68);
  stamp('#4a8a3a', { dy: 0.2 });
  stamp('#8fd16a', {
    paint: g => {
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (!grassy(x, y)) continue;
        if (rand(x, y, 11) > 0.6) blob(g, (x + rand(x, y, 12)) * T, (y + rand(x, y, 13)) * T, T * (0.6 + rand(x, y, 14)), 'rgba(170,225,110,.35)');
        if (rand(x, y, 15) > 0.7) blob(g, (x + rand(x, y, 16)) * T, (y + rand(x, y, 17)) * T, T * (0.5 + rand(x, y, 18) * 0.8), 'rgba(60,130,50,.18)');
      }
      g.lineCap = 'round';
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (at(x, y) !== '.') continue;
        for (let k = 0; k < 3; k++) {
          if (rand(x, y, k + 20) < 0.5) continue;
          const px = (x + rand(x, y, k + 3)) * T, py = (y + rand(x, y, k + 5)) * T, u = GROUND_RES;
          g.strokeStyle = k % 2 ? '#5fa648' : '#6db552'; g.lineWidth = 2.2 * u;
          g.beginPath();
          g.moveTo(px, py); g.quadraticCurveTo(px - 3 * u, py - 5 * u, px - 5 * u, py - 9 * u);
          g.moveTo(px, py); g.lineTo(px, py - 11 * u);
          g.moveTo(px, py); g.quadraticCurveTo(px + 3 * u, py - 5 * u, px + 5 * u, py - 8 * u);
          g.stroke();
        }
        if (rand(x, y, 40) > 0.9) {
          const fx = (x + rand(x, y, 41)) * T, fy = (y + rand(x, y, 42)) * T, col = ['#fff', '#ffd23f', '#ff8fb1', '#b9a4ff'][Math.floor(rand(x, y, 43) * 4)];
          for (let a = 0; a < 5; a++) blob(g, fx + Math.cos(a * 1.26) * 2.6 * GROUND_RES, fy + Math.sin(a * 1.26) * 2.6 * GROUND_RES, 2 * GROUND_RES, col);
          blob(g, fx, fy, 1.6 * GROUND_RES, '#f59e0b');
        }
      }
    },
  });

  // Paths: sunken cobbles with a soft darker rim.
  shape((x, y) => at(x, y) === '=', 0.64);
  stamp('rgba(90,70,40,1)', { dy: -0.05, alpha: 0.35 });
  stamp('#dcc697', {
    paint: g => {
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (at(x, y) !== '=') continue;
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
          const k = j * 3 + i;
          const cx = (x + (i + 0.5) / 3 + (rand(x, y, k) - 0.5) * 0.12) * T;
          const cy = (y + (j + 0.5) / 3 + (rand(x, y, k + 9) - 0.5) * 0.12) * T;
          const rx = T * (0.13 + rand(x, y, k + 18) * 0.04), ry = T * (0.11 + rand(x, y, k + 27) * 0.04);
          g.fillStyle = 'rgba(120,95,55,.35)';
          g.beginPath(); g.ellipse(cx, cy + 1.5 * GROUND_RES, rx, ry, 0, 0, 7); g.fill();
          g.fillStyle = ['#efe0bb', '#e5d3a6', '#f5e9c9', '#e0caa0'][Math.floor(rand(x, y, k + 36) * 4)];
          g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill();
        }
      }
    },
  });

  // Dock: planks with gaps, and posts standing in the water.
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (at(x, y) !== 'd') continue;
    const u = GROUND_RES;
    if (!land(x, y + 1) || at(x, y + 1) !== 'd') {
      c.fillStyle = 'rgba(10,60,90,.3)'; c.fillRect(x * T, (y + 1) * T, T, T * 0.3);
      c.fillStyle = '#6b4424'; c.fillRect(x * T + 3 * u, (y + 1) * T - 2, 7 * u, T * 0.28); c.fillRect((x + 1) * T - 10 * u, (y + 1) * T - 2, 7 * u, T * 0.28);
    }
    for (let k = 0; k < 4; k++) {
      c.fillStyle = ['#c48f5c', '#b98352', '#cf9a66', '#b27a49'][Math.floor(rand(x, y, k) * 4)];
      c.fillRect(x * T, y * T + (k * T) / 4, T + 1, T / 4 - 2 * u);
      c.fillStyle = '#7a4d2a'; c.fillRect(x * T, y * T + ((k + 1) * T) / 4 - 2 * u, T + 1, 2 * u);
      c.fillStyle = '#5a3a20'; blob(c, x * T + 5 * u, y * T + (k + 0.4) * T / 4, 1.3 * u, '#5a3a20'); blob(c, (x + 1) * T - 5 * u, y * T + (k + 0.4) * T / 4, 1.3 * u, '#5a3a20');
    }
  }
  // Walls: a low stone wall with a lit top and shaded front face.
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (at(x, y) !== '#') continue;
    c.fillStyle = '#e3cfa8'; c.fillRect(x * T, y * T, T + 1, T * 0.55);
    c.fillStyle = '#b89a6b'; c.fillRect(x * T, y * T + T * 0.55, T + 1, T * 0.45);
    c.strokeStyle = '#8f7449'; c.lineWidth = 1.5 * GROUND_RES;
    for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(x * T + (k + (y % 2) * 0.5) * T / 2, y * T + T * 0.55); c.lineTo(x * T + (k + (y % 2) * 0.5) * T / 2, y * T + T); c.stroke(); }
    c.strokeStyle = '#3b2414'; c.lineWidth = 2 * GROUND_RES;
    c.beginPath(); c.moveTo(x * T, y * T + T * 0.55); c.lineTo((x + 1) * T, y * T + T * 0.55); c.stroke();
  }
  // Lily pads on ponds.
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (at(x, y) !== 'w' || rand(x, y, 50) < 0.6) continue;
    const px = (x + 0.3 + rand(x, y, 51) * 0.4) * T, py = (y + 0.3 + rand(x, y, 52) * 0.4) * T, r = T * 0.16;
    c.fillStyle = '#4f9e45'; c.beginPath(); c.moveTo(px, py); c.arc(px, py, r, 0.4, Math.PI * 2 - 0.1); c.fill();
    if (rand(x, y, 53) > 0.6) blob(c, px + r * 0.3, py - r * 0.2, r * 0.35, '#ff9ec4');
  }
  // Soft contact shadows under everything that stands on the ground.
  for (const o of island.objects) {
    if (!o.block) continue;
    const [bw] = o.block;
    const x = o.at[0] * T, y = o.at[1] * T;
    const g = c.createRadialGradient(x, y, 0, x, y, bw * T * 0.75);
    g.addColorStop(0, 'rgba(30,50,20,.28)'); g.addColorStop(1, 'rgba(30,50,20,0)');
    c.save(); c.translate(x, y); c.scale(1, 0.45); c.translate(-x, -y);
    c.fillStyle = g; c.fillRect(x - bw * T, y - bw * T, bw * T * 2, bw * T * 2);
    c.restore();
  }
}

// ---------- Loop ----------

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt;
  if (els.screen.hasAttribute('data-active') && !document.hidden) {
    update(dt);
    draw();
  }
  requestAnimationFrame(loop);
}

function update(dt) {
  let dx = 0, dy = 0;
  if (!busy) {
    if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
    if (keys.has('arrowright') || keys.has('d')) dx += 1;
    if (keys.has('arrowup') || keys.has('w')) dy -= 1;
    if (keys.has('arrowdown') || keys.has('s')) dy += 1;
    if (joy && (Math.abs(joy.dx) > 0.15 || Math.abs(joy.dy) > 0.15)) { dx = joy.dx; dy = joy.dy; target = null; }
    if (dx || dy) target = null;
    if (!dx && !dy && target) {
      const tx = target.x - player.x, ty = target.y - player.y;
      const d = Math.hypot(tx, ty);
      if (d < (target.then ? TALK_RANGE * 0.8 : 0.15)) { const then = target.then; target = null; if (then) then(); }
      else { dx = tx / d; dy = ty / d; }
    }
  }
  const len = Math.hypot(dx, dy);
  player.moving = len > 0.01;
  if (player.moving) {
    if (!walked) markWalked();
    const sp = SPEED * Math.min(1, len) / (len > 1 ? len : 1);
    const mx = dx * sp * dt, my = dy * sp * dt;
    if (!hits(player.x + mx, player.y)) player.x += mx;
    if (!hits(player.x, player.y + my)) player.y += my;
    if (Math.abs(dx) > 0.2) player.face = dx > 0 ? -1 : 1; // art faces the viewer; flip toward travel
    player.step += dt * 10;
    if (target && Math.abs(mx) + Math.abs(my) < 1e-4) target = null; // stuck: give up
  }
  collectPearls();
  stepPuzzles();
  if ((goalTimer -= dt) <= 0) { goalTimer = 0.5; updateGoal(); }
  wander(dt);
  if (player.moving && (dustTimer -= dt) <= 0) { dustTimer = 0.16; dust.push({ x: player.x + (Math.random() - 0.5) * 0.2, y: player.y, t: 0 }); }
  dust = dust.filter(d => (d.t += dt) < 0.5);
  splashes = splashes.filter(sp => (sp.t += dt) < 0.9);
  updateAmbient(dt);
  // Hudhud flutters behind the hero.
  const bx = player.x + player.face * 0.9, by = player.y - 0.5;
  bird.x += (bx - bird.x) * Math.min(1, dt * 3);
  bird.y += (by - bird.y) * Math.min(1, dt * 3);
  // Camera eases toward the hero, clamped to the map.
  const cols = island.tiles[0].length, rows = island.tiles.length;
  const vw = W / TILE, vh = H / TILE;
  const cx = Math.max(vw / 2, Math.min(cols - vw / 2, player.x));
  const cy = Math.max(vh / 2, Math.min(rows - vh / 2, player.y - 0.5));
  cam.x += (cx - cam.x) * Math.min(1, dt * 6);
  cam.y += (cy - cam.y) * Math.min(1, dt * 6);
  updateActionButton();
}

// ---------- Drawing ----------

const sx = x => (x - cam.x) * TILE + W / 2;
const sy = y => (y - cam.y) * TILE + H / 2;

function drawSprite(sp, x, y, height, { flip = false, bob = 0, tilt = 0, alpha = 1, sqx = 1, sqy = 1 } = {}) {
  if (!sp.img.complete || !sp.img.naturalWidth) return;
  const h = height * TILE, w = (h * sp.w) / sp.h;
  const px = sx(x), py = sy(y) + bob;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(px, py);
  if (tilt) ctx.rotate(tilt);
  if (flip) ctx.scale(-1, 1);
  if (sqx !== 1 || sqy !== 1) ctx.scale(sqx, sqy);
  ctx.drawImage(sp.img, (-sp.ax / sp.w) * w, (-sp.ay / sp.h) * h, w, h);
  ctx.restore();
}

const HEIGHTS = { observatory: 4.4, crystal: 2.8, labtable: 1.5, citadel: 5.5, noria: 3.2, noriabase: 2.1, columns: 3.4, bigchest: 2.6, lighthouse: 5.6, compass: 2.2, fishstall: 2.9, hull: 2.4, crates: 1.1, barrel: 0.9, palm: 3.2, house: 3.4, fountain: 2.4, stall: 2.9, gate: 4, chest: 1, chestOpen: 1, sign: 1.1, bush: 0.9, rock: 0.75, boat: 2.2, lamp: 1.8, monument: 3.3, flowers: 0.5 };

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#2b8fbf';
  ctx.fillRect(0, 0, W, H);
  // Ground: blit the visible slice of the pre-drawn map.
  const T = TILE * GROUND_RES;
  const gx = (cam.x - W / 2 / TILE) * T, gy = (cam.y - H / 2 / TILE) * T;
  ctx.drawImage(ground, gx, gy, W * GROUND_RES, H * GROUND_RES, 0, 0, W, H);

  // Sea shimmer: little arcs that drift, only on visible water tiles.
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  const x0 = Math.floor(cam.x - W / 2 / TILE) - 1, y0 = Math.floor(cam.y - H / 2 / TILE) - 1;
  for (let y = y0; y < y0 + H / TILE + 2; y++) for (let x = x0; x < x0 + W / TILE + 2; x++) {
    if (!WATER.has(tileAt(x + 0.5, y + 0.5)) || rand(x, y) > 0.35) continue;
    const ph = time * 1.2 + rand(x, y, 2) * 6;
    const px = sx(x + 0.5 + Math.sin(ph) * 0.15), py = sy(y + 0.5);
    ctx.globalAlpha = 0.25 + 0.3 * Math.sin(ph * 1.3) ** 2;
    ctx.beginPath(); ctx.arc(px, py, TILE * 0.18, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Flat decals, pearls, then everything that stands up, sorted by depth.
  for (const o of props) if (o.sprite.flat) drawSprite(o.sprite, o.x, o.y, HEIGHTS[o.kind]);
  island.pearls.forEach(([x, y], i) => { if (!state.pearls.includes(i)) drawPearl(ctx, sx(x), sy(y), time); });
  drawPuzzles();
  for (const f of island.finds || []) {
    if (state.items.includes(f.id)) continue;
    const k = (Math.sin(time * 4 + f.at[0]) + 1) / 2;
    ctx.fillStyle = `rgba(255,255,255,${0.4 + k * 0.6})`;
    const x = sx(f.at[0]), y = sy(f.at[1]) - TILE * 0.3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? TILE * 0.06 : TILE * (0.16 + k * 0.08); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.fill();
  }

  for (const d of dust) {
    ctx.fillStyle = `rgba(255,250,235,${0.5 * (1 - d.t / 0.5)})`;
    ctx.beginPath(); ctx.arc(sx(d.x), sy(d.y) - d.t * 10, TILE * (0.06 + d.t * 0.18), 0, 7); ctx.fill();
  }
  const drawables = [];
  for (const o of props) if (!o.sprite.flat) drawables.push({ y: o.y, draw: () => drawProp(o) });
  for (const s of island.signs) drawables.push({ y: s.at[1], draw: () => drawSprite(objectSprite('sign'), s.at[0], s.at[1], HEIGHTS.sign) });
  for (const c of island.chests) drawables.push({ y: c.at[1], draw: () => drawSprite(objectSprite(state.chests.includes(c.id) ? 'chestOpen' : 'chest'), c.at[0], c.at[1], HEIGHTS.chest) });
  for (const p of people) drawables.push({ y: p.y, draw: () => drawPerson(p) });
  drawables.push({ y: player.y, draw: drawPlayer });
  drawables.sort((a, b) => a.y - b.y).forEach(d => d.draw());

  drawAmbient();

  // Hudhud flies above everything, with a shadow on the ground.
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.beginPath(); ctx.ellipse(sx(bird.x), sy(bird.y + 0.6), TILE * 0.22, TILE * 0.08, 0, 0, 7); ctx.fill();
  drawSprite(bird.sprite, bird.x, bird.y + Math.sin(time * 5) * 0.08, 0.75, { flip: player.face > 0 });

  drawLighting();
  drawPrompts();
}

// Night: darken the island and cut warm pools of light around lamps, the
// hero, and lit monuments. Sunset: a soft orange wash. (Follows the same
// clock as the title screen; lite mode uses a flat tint.)
function drawLighting() {
  const t = document.body.dataset.time;
  if (t === 'sunset') { ctx.fillStyle = 'rgba(255,120,60,.12)'; ctx.fillRect(0, 0, W, H); return; }
  if (t !== 'night') return;
  if (document.body.classList.contains('lite')) { ctx.fillStyle = 'rgba(10,20,60,.35)'; ctx.fillRect(0, 0, W, H); return; }
  if (!shade || shade.width !== els.canvas.width || shade.height !== els.canvas.height) {
    shade = document.createElement('canvas');
    shade.width = els.canvas.width; shade.height = els.canvas.height;
  }
  const c = shade.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  c.fillStyle = 'rgba(8,16,52,.62)';
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'destination-out';
  const lights = [{ x: player.x, y: player.y - 0.6, r: 2.6 }];
  for (const o of props) {
    if (o.kind === 'lamp') lights.push({ x: o.x, y: o.y - 1.5, r: 2.2 });
    if (o.kind === 'lighthouse') lights.push({ x: o.x, y: o.y - 5, r: 3.5 });
    if (o.id === 'monument' && state.monument) lights.push({ x: o.x, y: o.y - 1.2, r: 3 });
    if (o.kind === 'house') lights.push({ x: o.x, y: o.y - 0.4, r: 1.3 });
  }
  const flick = 1 + Math.sin(time * 7) * 0.03;
  for (const l of lights) {
    const x = sx(l.x), y = sy(l.y), r = l.r * TILE * flick;
    if (x < -r || y < -r || x > W + r || y > H + r) continue;
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.drawImage(shade, 0, 0, W, H);
  // A warm glow on top of the lamps themselves.
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights.slice(1)) {
    const x = sx(l.x), y = sy(l.y), r = l.r * TILE * 0.45;
    if (x < -r || y < -r || x > W + r || y > H + r) continue;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,190,90,.35)'); gr.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- Ambient life ----------
// Butterflies (fireflies at night) over the grass, petals on the breeze,
// fish leaping from the sea and the shadow of a passing gull. Purely
// decorative; skipped in lite mode.

let goalTimer = 0;
let critters = [], petals = [], fish = null, gull = null, fishTimer = 3, gullTimer = 6;
const lite = () => document.body.classList.contains('lite');
const night = () => document.body.dataset.time === 'night';

function setupAmbient() {
  critters = []; petals = []; fish = null; gull = null;
  if (lite()) return;
  const grass = [];
  island.tiles.forEach((row, y) => [...row].forEach((t, x) => { if (t === '.') grass.push([x + 0.5, y + 0.5]); }));
  const n = night() ? 14 : 6;
  for (let i = 0; i < n && grass.length; i++) {
    const [x, y] = grass[Math.floor(Math.random() * grass.length)];
    critters.push({ hx: x, hy: y, x, y, ph: Math.random() * 9, hue: [45, 330, 200, 280, 20][i % 5] });
  }
  for (let i = 0; i < 10; i++) petals.push({ x: Math.random(), y: Math.random(), v: 0.4 + Math.random() * 0.5, ph: Math.random() * 9, c: ['#ffc2d6', '#fff', '#ffe08a'][i % 3] });
}

function updateAmbient(dt) {
  if (lite()) return;
  for (const b of critters) {
    b.ph += dt;
    b.x = b.hx + Math.sin(b.ph * 0.5) * 1.6 + Math.sin(b.ph * 1.3) * 0.5;
    b.y = b.hy + Math.cos(b.ph * 0.4) * 1.1 + Math.sin(b.ph * 1.7) * 0.3;
    // Scatter from the hero.
    if (Math.hypot(b.x - player.x, b.y - player.y) < 1.2) { b.hx += (b.x - player.x) * dt * 3; b.hy += (b.y - player.y) * dt * 3; }
  }
  for (const p of petals) {
    p.x -= p.v * dt * 0.08; p.y += dt * 0.03 + Math.sin(p.ph + time) * dt * 0.02;
    if (p.x < -0.05) { p.x = 1.05; p.y = Math.random(); }
    if (p.y > 1.05) p.y = -0.05;
  }
  if ((fishTimer -= dt) <= 0) {
    fishTimer = 2.5 + Math.random() * 4;
    for (let tries = 0; tries < 12; tries++) {
      const x = cam.x + (Math.random() - 0.5) * W / TILE, y = cam.y + (Math.random() - 0.5) * H / TILE;
      if (tileAt(x, y) === '~' && tileAt(x + 1.5, y) === '~' && tileAt(x - 1.5, y) === '~') { fish = { x, y, t: 0, dir: Math.random() < 0.5 ? -1 : 1 }; break; }
    }
  }
  if (fish && (fish.t += dt) > 1.6) fish = null;
  if ((gullTimer -= dt) <= 0 && !night()) { gullTimer = 9 + Math.random() * 8; gull = { t: 0, y: cam.y + (Math.random() - 0.5) * 6 }; }
  if (gull && (gull.t += dt) > 5) gull = null;
}

function drawAmbient() {
  if (lite()) return;
  // Fish: a silver arc out of the water, with splashes where it leaves and lands.
  if (fish) {
    const k = Math.min(1, fish.t / 1.1);
    const x = sx(fish.x + fish.dir * (k - 0.5) * 1.8), y = sy(fish.y) - Math.sin(k * Math.PI) * TILE * 1.1;
    if (fish.t < 1.1) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(fish.dir * (k - 0.5) * 2.2); ctx.scale(fish.dir, 1);
      ctx.fillStyle = '#c9e4f2'; ctx.strokeStyle = '#2d4b63'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, TILE * 0.22, TILE * 0.09, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-TILE * 0.2, 0); ctx.lineTo(-TILE * 0.34, -TILE * 0.09); ctx.lineTo(-TILE * 0.34, TILE * 0.09); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    for (const [off, t0] of [[-0.9, 0], [0.9, 1.05]]) {
      const tt = fish.t - t0;
      if (tt < 0 || tt > 0.5) continue;
      ctx.strokeStyle = `rgba(255,255,255,${1 - tt * 2})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(sx(fish.x + fish.dir * off), sy(fish.y), TILE * (0.15 + tt * 0.8), TILE * (0.05 + tt * 0.25), 0, 0, 7); ctx.stroke();
    }
  }
  // Butterflies by day, fireflies by night.
  for (const b of critters) {
    const x = sx(b.x), y = sy(b.y) - TILE * 0.8;
    if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
    if (night()) {
      const a = 0.5 + 0.5 * Math.sin(b.ph * 3);
      const g = ctx.createRadialGradient(x, y, 0, x, y, TILE * 0.25);
      g.addColorStop(0, `rgba(255,245,150,${a})`); g.addColorStop(1, 'rgba(255,245,150,0)');
      ctx.fillStyle = g; ctx.fillRect(x - TILE * 0.25, y - TILE * 0.25, TILE * 0.5, TILE * 0.5);
      continue;
    }
    const flap = Math.abs(Math.sin(b.ph * 14));
    ctx.fillStyle = `hsl(${b.hue} 90% 65%)`; ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.2;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(x + side * TILE * 0.08 * flap, y, TILE * 0.09 * flap + 1, TILE * 0.07, side * 0.5, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 1, y - TILE * 0.05, 2, TILE * 0.1);
  }
  // Petals drifting on the breeze (screen space).
  ctx.globalAlpha = 0.8;
  for (const p of petals) {
    const r = Math.sin(time * 2 + p.ph);
    ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.ellipse(p.x * W, p.y * H, 4, 2 + Math.abs(r) * 2, r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // A gull's shadow glides over the island.
  if (gull) {
    const x = W + 80 - (gull.t / 5) * (W + 160), y = sy(gull.y), f = Math.sin(time * 6) * 0.3;
    ctx.fillStyle = 'rgba(0,30,40,.14)';
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 18, y - 10 - f * 10, x + 38, y - 4 - f * 16); ctx.quadraticCurveTo(x + 18, y + 2, x, y + 6);
    ctx.quadraticCurveTo(x - 18, y + 2, x - 38, y - 4 - f * 16); ctx.quadraticCurveTo(x - 18, y - 10 - f * 10, x, y); ctx.fill();
  }
}

// Villagers with \`wander\` stroll around their home spot.
function wander(dt) {
  for (const p of people) {
    if (!p.wander || (dialog && dialog.person === p)) continue;
    if (p.pause > 0) { p.pause -= dt; p.walking = false; continue; }
    if (!p.tx) { const a = Math.random() * Math.PI * 2, r = Math.random() * p.wander; p.tx = p.at[0] + Math.cos(a) * r; p.ty = p.at[1] + Math.sin(a) * r * 0.6; }
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
    const step = Math.min(d, 1.1 * dt);
    const nx = p.x + (dx / d) * step, ny = p.y + (dy / d) * step;
    const clear = !SOLID.has(tileAt(nx, ny)) && !propAt(nx, ny) && Math.hypot(nx - player.x, ny - player.y) > 0.7;
    if (d < 0.05 || !clear) { p.tx = null; p.pause = 1.5 + Math.random() * 3; continue; }
    p.x = nx; p.y = ny; p.walking = true;
    if (Math.abs(dx) > 0.05) p.face = dx > 0 ? 1 : -1;
  }
}

function drawProp(o) {
  if (o.kind === 'gate') {
    drawSprite(o.sprite, o.x, o.y, HEIGHTS.gate);
    if (!gateOpen(o)) drawSprite(objectSprite('gateDoors'), o.x, o.y, HEIGHTS.gate);
    return;
  }
  if (o.kind === 'noria') {
    // The water wheel of Hama turns forever.
    drawSprite(objectSprite('noriabase'), o.x, o.y + 1.6, HEIGHTS.noriabase);
    drawSprite(o.sprite, o.x, o.y, HEIGHTS.noria, { tilt: time * 0.6 });
    return;
  }
  if (o.kind === 'bigchest' && state.monument) {
    drawSprite(objectSprite('chestOpen'), o.x, o.y, 2);
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 3); ctx.fillStyle = '#fff3a0';
    ctx.beginPath(); ctx.arc(sx(o.x), sy(o.y) - TILE, TILE * 1.4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    return;
  }
  // Plants lean in the sea breeze.
  const sway = SWAY[o.kind] ? Math.sin(time * 1.4 + o.x * 0.7) * SWAY[o.kind] + Math.sin(time * 3.1 + o.y) * SWAY[o.kind] * 0.3 : 0;
  drawSprite(o.sprite, o.x, o.y, HEIGHTS[o.kind], { tilt: sway });
  if (o.kind === 'monument' || o.kind === 'compass' || o.kind === 'crystal') {
    // The token slots light up as golden tokens are placed.
    const letters = tokens();
    const h = HEIGHTS[o.kind] * TILE;
    letters.forEach((l, i) => {
      if (!state.monument && !state.letters.includes(l)) return;
      let px = sx(o.x), py = sy(o.y) - h + (h * (62 + i * 34)) / o.sprite.h;
      if (o.kind === 'compass') {
        // Compass rose: N, S, E, W around the dial (tokens are ش ج ق غ).
        const [dx, dy] = [[0, -1], [0, 1], [1, 0], [-1, 0]][i];
        px = sx(o.x) + dx * h * 0.3; py = sy(o.y) - h * 0.52 + dy * h * 0.22;
      }
      ctx.fillStyle = state.monument ? '#ffd23f' : 'rgba(255,210,63,.55)';
      ctx.font = `800 ${Math.round(TILE * 0.42)}px "Baloo Bhaijaan 2", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(l, px, py);
    });
    if (state.monument) {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 3);
      ctx.fillStyle = '#fff3a0';
      ctx.beginPath(); ctx.arc(sx(o.x), sy(o.y) - h * 0.55, TILE * 1.3, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

const SWAY = { palm: 0.035, bush: 0.03, flowers: 0.06, lamp: 0 };

function drawPerson(p) {
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.y), TILE * 0.3, TILE * 0.1, 0, 0, 7); ctx.fill();
  const talking = dialog && dialog.person === p;
  const bob = talking ? Math.sin(time * 8) * 1.5 : p.walking ? -Math.abs(Math.sin(time * 9)) * TILE * 0.06 : Math.sin(time * 2 + p.at[0]) * 1;
  const breathe = p.walking ? 1 : 1 + Math.sin(time * 2.2 + p.at[0]) * 0.012;
  drawSprite(p.sprite, p.x, p.y, 1.5, { flip: p.face > 0, bob, tilt: p.walking ? Math.sin(time * 9) * 0.04 : 0, sqy: breathe, sqx: 2 - breathe });
}

function drawPlayer() {
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath(); ctx.ellipse(sx(player.x), sy(player.y), TILE * 0.3, TILE * 0.1, 0, 0, 7); ctx.fill();
  const bob = player.moving ? -Math.abs(Math.sin(player.step)) * TILE * 0.08 : Math.sin(time * 2) * 1;
  const tilt = player.moving ? Math.sin(player.step) * 0.05 : 0;
  // Squash and stretch: a little bounce on each step, breathing when idle.
  const sq = player.moving ? 1 + Math.sin(player.step * 2) * 0.035 : 1 + Math.sin(time * 2.4) * 0.015;
  drawSprite(player.sprite, player.x, player.y, 1.55, { flip: player.face < 0, bob, tilt, sqy: sq, sqx: 2 - sq });
}

// "!" over villagers with a quest to offer; "✔" once it's done.
// ---------- Objective ----------
// What should the child do next on this island? Shown as a pill under the
// top bar, with an arrow at the screen edge when the target is off-screen.
function currentGoal() {
  const quests = island.people.filter(p => p.quest);
  const ready = quests.find(p => questDone(p.quest) && !rewarded(p));
  if (ready) return { text: `عُد إلى <b>${ready.name}</b> لتأخذ مكافأتك`, at: ready };
  const m = props.find(o => o.id === 'monument');
  if (!state.monument && state.letters.length >= tokens().length && m) return { text: `ضع ${island.tokenName} على <b>${island.monument.name}</b>`, at: m };
  const todo = quests.find(p => !rewarded(p));
  if (todo) {
    if (todo.quest.fetch && state.met.includes(todo.id)) {
      const f = (island.finds || []).find(x => x.id === todo.quest.fetch);
      return { text: `ابحث عن <b>${f ? f.name : 'الشيء الضائع'}</b> لـ${todo.name}`, at: null };
    }
    return { text: `${state.met.includes(todo.id) ? 'ساعد' : 'تحدّث إلى'} <b>${todo.name}</b>`, at: todo };
  }
  if (!state.monument && m) return { text: `اجمع ${island.tokenName} وضعها على <b>${island.monument.name}</b>`, at: m };
  const left = island.pearls.length - state.pearls.length;
  if (left > 0) return { text: `أكملت الجزيرة! 🦪 بقيت ${num(left)} لآلئ مخبّأة`, at: null };
  return { text: 'أكملت كل شيء هنا! ⛵ أبحر إلى جزيرة أخرى', at: null };
}

let goal = null, goalText = '';
function updateGoal() {
  goal = currentGoal();
  if (goal.at && goal.at.x === undefined) goal.at = people.find(p => p.id === goal.at.id) || null;
  if (goal.text !== goalText) {
    goalText = goal.text;
    els.goal.innerHTML = `<span>🎯</span><p>${goal.text}</p>`;
    els.goal.classList.remove('is-new'); void els.goal.offsetWidth; els.goal.classList.add('is-new');
  }
}

// A bobbing golden arrow at the screen edge pointing to an off-screen goal.
function drawGoalArrow() {
  if (!goal?.at || busy) return;
  const tx = sx(goal.at.x), ty = sy(goal.at.y) - TILE * 0.8;
  const m = 50, top = 140, bottom = H - 120;
  if (tx > m && tx < W - m && ty > top && ty < bottom) return;
  const cx = W / 2, cy = (top + bottom) / 2;
  const a = Math.atan2(ty - cy, tx - cx);
  const k = Math.min((W / 2 - m) / Math.abs(Math.cos(a) || 1e-6), ((bottom - top) / 2) / Math.abs(Math.sin(a) || 1e-6));
  const bob = Math.sin(time * 6) * 4;
  const x = cx + Math.cos(a) * (k + bob), y = cy + Math.sin(a) * (k + bob);
  // A round "!" badge with a pointer sticking out toward the goal.
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#3b2414'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.save(); ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(10, -11); ctx.lineTo(10, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3b2414';
  ctx.font = `800 20px "Baloo Bhaijaan 2", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('!', 0, 2);
  ctx.restore();
}

function drawPrompts() {
  drawGoalArrow();
  const near = nearest();
  for (const p of people) {
    let mark = null;
    if (p.quest) mark = questDone(p.quest) ? (rewarded(p) ? '✔' : '!') : '!';
    else if (p.riddles) mark = '🧩';
    else if (!state.met.includes(p.id)) mark = '…';
    if (!mark) continue;
    const x = sx(p.x), y = sy(p.y) - TILE * 1.75 + Math.sin(time * 4) * 3;
    ctx.fillStyle = mark === '!' ? '#ffd23f' : mark === '✔' ? '#b9f0b4' : '#fff';
    ctx.strokeStyle = '#3b2414'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, TILE * 0.22, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3b2414';
    ctx.font = `800 ${Math.round(TILE * 0.3)}px "Baloo Bhaijaan 2", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(mark, x, y + 1);
  }
  if (near && !busy) {
    const x = sx(near.x), y = sy(near.y) + TILE * 0.25;
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]); ctx.lineDashOffset = -time * 20;
    ctx.beginPath(); ctx.ellipse(x, y - TILE * 0.15, TILE * 0.55, TILE * 0.2, 0, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ---------- Interaction ----------

function interactables() {
  const list = [];
  for (const p of people) list.push({ kind: 'person', x: p.x, y: p.y, ref: p, label: 'تحدّث' });
  for (const s of island.signs) list.push({ kind: 'sign', x: s.at[0], y: s.at[1], ref: s, label: 'اقرأ' });
  for (const c of island.chests) if (!state.chests.includes(c.id)) list.push({ kind: 'chest', x: c.at[0], y: c.at[1], ref: c, label: 'افتح' });
  for (const f of island.finds || []) if (!state.items.includes(f.id)) list.push({ kind: 'find', x: f.at[0], y: f.at[1], ref: f, label: 'ابحث' });
  const mon = props.find(o => o.id === 'monument');
  if (mon) list.push({ kind: 'monument', x: mon.x, y: mon.y, ref: mon, label: 'انظر' });
  return list;
}

function nearest() {
  let best = null, bd = TALK_RANGE;
  for (const it of interactables()) {
    const d = Math.hypot(it.x - player.x, (it.y - player.y) * 1.2);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

function updateActionButton() {
  const n = busy ? null : nearest();
  const label = n ? n.label : '';
  if (els.act.dataset.label !== label) {
    els.act.dataset.label = label;
    els.act.hidden = !n;
    els.act.querySelector('span').textContent = label;
  }
}

function action() {
  if (dialog) { advance(); return; }
  if (!els.popup.hidden) { closePopup(); return; }
  if (busy) return;
  const n = nearest();
  if (n) interact(n);
}

function interact(it) {
  sfx.tap();
  hideHint();
  if (it.kind === 'person') talkTo(it.ref);
  if (it.kind === 'sign') {
    const pz = it.ref.puzzle && puzzles.find(p => p.def.id === it.ref.puzzle);
    say(pz && !pz.solved ? { bird: true, name: `هُدهُد — ${pz.def.title}`, lines: pz.def.intro } : { name: '📜 لافتة', lines: [it.ref.text] });
  }
  if (it.kind === 'chest') openChest(it.ref);
  if (it.kind === 'monument') useMonument();
  if (it.kind === 'find') {
    const f = it.ref;
    state.items.push(f.id); persist();
    sfx.reveal();
    say({ name: `${f.icon} ${f.name}`, lines: f.lines, then: () => itemPopup({ icon: f.icon, title: f.name, text: f.text }) });
  }
}

// ---------- Dialogue ----------

function talkTo(p) {
  p.face = player.x > p.x ? -1 : 1;
  if (!state.met.includes(p.id)) { state.met.push(p.id); persist(); }
  const q = p.quest;
  if (!q && p.riddles) {
    say({ person: p, lines: p.talk, choices: [
      { label: 'اسألني لغزاً! 🧩', go: () => askRiddle(p) },
      { label: 'وداعاً 👋', go: () => {} },
    ] });
    return;
  }
  if (!q) { say({ person: p, lines: p.talk }); return; }
  if (questDone(q) && !rewarded(p)) { rewardQuest(p); return; }
  if (q.fetch) {
    say({ person: p, lines: questDone(q) ? q.after : q.intro });
    return;
  }
  if (questDone(q)) {
    say({ person: p, lines: q.after, choices: [
      { label: 'نعم، تحدٍّ جديد!', go: () => startQuest(p) },
      { label: 'ربما لاحقاً', go: () => {} },
    ] });
    return;
  }
  say({ person: p, lines: q.intro, choices: [
    { label: q.accept, go: () => startQuest(p) },
    { label: q.decline, go: () => {} },
  ] });
}

function say({ person = null, bird = false, name, lines, choices = null, then = null, plain = false }) {
  busy = true;
  dialog = { person, lines: lines.map(fill), i: 0, choices, then, plain, name: name || person?.name };
  els.dlg.hidden = false;
  els.dlg.querySelector('.dialog__portrait').innerHTML = person ? portraitSVG(person.look) : bird ? hudhudPortrait() : '';
  els.dlg.querySelector('.dialog__portrait').hidden = !person && !bird;
  els.dlg.querySelector('.dialog__name').textContent = dialog.name;
  showLine();
}

function showLine() {
  const line = dialog.lines[dialog.i];
  const text = els.dlg.querySelector('.dialog__text');
  const last = dialog.i === dialog.lines.length - 1;
  text.innerHTML = line;
  const box = els.dlg.querySelector('.dialog__choices');
  box.innerHTML = '';
  els.dlg.querySelector('.dialog__next').hidden = true;
  els.dlg.querySelector('.dialog__say').hidden = !canSpeak();
  stopSpeaking();
  const done = () => {
    dialog.typing = null;
    box.innerHTML = last && dialog.choices
      ? dialog.choices.map((c, k) => `<button class="btn ${k === 0 && !dialog.plain ? 'btn--gold' : 'btn--ghost'}" data-choice="${k}">${c.label}</button>`).join('')
      : '';
    els.dlg.querySelector('.dialog__next').hidden = last && !!dialog.choices;
  };
  typewrite(text, done);
}

// Reveal the line letter by letter with little voice blips, RPG-style.
// Tapping while it types shows the whole line at once.
function typewrite(el, done) {
  const nodes = [];
  const walk = n => n.nodeType === 3 ? nodes.push([n, n.nodeValue]) : n.childNodes.forEach(walk);
  walk(el);
  const total = nodes.reduce((a, [, t]) => a + t.length, 0);
  if (TEST || lite() || !total) { done(); return; }
  nodes.forEach(([n]) => { n.nodeValue = ''; });
  const pitch = dialog.person ? 380 + (hash(dialog.person.id) % 7) * 45 : 760;
  let shown = 0, raf;
  const start = performance.now();
  const finish = () => { cancelAnimationFrame(raf); nodes.forEach(([n, t]) => { n.nodeValue = t; }); done(); };
  const step = now => {
    if (!dialog) return;
    const want = Math.min(total, Math.floor(((now - start) / 1000) * 55));
    if (want > shown) {
      if (Math.floor(want / 3) > Math.floor(shown / 3)) sfx.blip(pitch);
      shown = want;
      let left = shown;
      for (const [n, t] of nodes) { n.nodeValue = t.slice(0, Math.max(0, left)); left -= t.length; }
    }
    if (shown >= total) { dialog.typing = null; done(); return; }
    raf = requestAnimationFrame(step);
  };
  dialog.typing = finish;
  dialog.stopTyping = () => cancelAnimationFrame(raf);
  raf = requestAnimationFrame(step);
}
const hash = str => [...str].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

function advance() {
  if (!dialog) return;
  if (dialog.typing) { dialog.typing(); return; }
  if (dialog.i < dialog.lines.length - 1) { dialog.i += 1; showLine(); return; }
  if (dialog.choices) return; // must pick one
  const then = dialog.then;
  closeDialog();
  if (then) then();
}

function onDialogClick(e) {
  if (e.target.closest('.dialog__say')) { e.stopPropagation(); speak(dialog.lines[dialog.i]); return; }
  const c = e.target.closest('[data-choice]');
  if (c) {
    const choice = dialog.choices[+c.dataset.choice];
    sfx.tap();
    closeDialog();
    choice.go();
    return;
  }
  advance();
}

function closeDialog() {
  stopSpeaking();
  dialog?.stopTyping?.();
  dialog = null;
  els.dlg.hidden = true;
  busy = !els.popup.hidden;
}

// ---------- Riddles ----------
// Some villagers ask a quick question from their island's subject, right in
// the conversation. Right answers earn pearls (up to 10 riddles per island).

function askRiddle(p) {
  const r = p.riddles();
  const opts = shuffled(r.options.map((html, k) => ({ html, ok: k === r.answer })));
  say({ person: p, plain: true, lines: [`🧩 ${r.q}`], choices: opts.map(o => ({
    label: o.html,
    go: () => {
      if (o.ok) {
        const paid = (state.riddles || 0) < 10;
        state.riddles = (state.riddles || 0) + 1; persist();
        if (paid) { save.update(s => { s.pearls = (s.pearls || 0) + 2; }); updateHud(); }
        sfx.good();
        say({ person: p, lines: [paid ? 'صحيح! أحسنت 👏 خذ لؤلؤتين 🦪🦪' : 'صحيح! أنت بارع في الألغاز.'], choices: [
          { label: 'لغز آخر!', go: () => askRiddle(p) }, { label: 'يكفي الآن', go: () => {} },
        ] });
      } else {
        sfx.bad();
        say({ person: p, lines: [`ليس تماماً… ${r.explain || r.hint || ''}`], choices: [
          { label: 'لغز آخر!', go: () => askRiddle(p) }, { label: 'يكفي الآن', go: () => {} },
        ] });
      }
    },
  })) });
}

// ---------- Quests ----------

function startQuest(p) {
  pendingQuest = p;
  busy = true;
  hooks.startLesson(p.quest.topic, { name: p.name, portrait: portraitSVG(p.look) });
}

// Called by app.js when the lesson screen closes.
export function lessonReturned({ topic, gained }) {
  if (gained > 0) sessionGain = { gained: sessionGain.gained + gained, topic };
  busy = false;
  last = performance.now();
  if (!running) { running = true; requestAnimationFrame(loop); }
  const p = pendingQuest;
  pendingQuest = null;
  if (!p) return;
  if (questDone(p.quest) && !rewarded(p)) setTimeout(() => rewardQuest(p), 350);
  else if (!questDone(p.quest)) setTimeout(() => say({ person: p, lines: p.quest.retry }), 350);
}

function rewardQuest(p) {
  const q = p.quest;
  say({ person: p, lines: q.done, then: () => {
    if (!q.letter) {
      // Quests without a token pay pearls.
      const n = q.pearls || 10;
      state.rewarded = [...(state.rewarded || []), p.id]; persist();
      save.update(s => { s.pearls = (s.pearls || 0) + n; });
      updateHud();
      itemPopup({ icon: '🦪', title: `${num(n)} لؤلؤات!`, text: `هدية من ${p.name} شكراً على مساعدتك.` });
      return;
    }
    state.letters.push(q.letter); persist();
    updateHud();
    const gate = props.find(o => o.kind === 'gate' && o.opens === p.id);
    itemPopup({
      hold: true, fly: q.letter,
      icon: `<span class="golden-letter">${q.letter}</span>`,
      title: `${island.tokenName || 'الحرف الذهبي'} «${q.letter}»`,
      text: gate ? (island.gateText || 'انفتحت البوابة الكبيرة في الشمال!') : `معك ${num(state.letters.length)} من ${num(tokens().length)}. ${island.tokenHint || ''}`,
    });
  } });
}

function useMonument() {
  const m = island.monument;
  const n = state.letters.length, need = tokens().length;
  if (state.monument) { say({ name: m.name, lines: [m.complete] }); return; }
  if (n < need) { say({ name: m.name, lines: [m.partial.replace('{n}', num(n)), m.hint] }); return; }
  say({ name: m.name, lines: m.place, then: () => {
    state.monument = true; persist();
    shake(els.screen, 1.2);
    itemPopup({ ...m.reward, hold: true });
  } });
}

function openChest(c) {
  state.chests.push(c.id);
  const before = state.pearls.length;
  persist();
  sfx.reveal();
  shake(els.screen, 0.5);
  save.update(s => { s.pearls = (s.pearls || 0) + c.pearls; });
  updateHud();
  itemPopup({ icon: '🦪', title: `${num(c.pearls)} لؤلؤات!`, text: 'كنز صغير مخبّأ! اللآلئ تُزيّن سفينتك.' });
  return before;
}

function collectPearls() {
  island.pearls.forEach(([x, y], i) => {
    if (state.pearls.includes(i)) return;
    if (Math.hypot(x - player.x, y - player.y) < 0.55) {
      state.pearls.push(i);
      save.update(s => { s.pearls = (s.pearls || 0) + 1; });
      sfx.star(state.pearls.length % 4);
      updateHud();
      els.pearls.parentElement.classList.remove('bump'); void els.pearls.offsetWidth; els.pearls.parentElement.classList.add('bump');
    }
  });
}

// ---------- Walk-on puzzles ----------
// 'stones': rows of stepping stones over water. Each row shows the words of
// one sentence; the student must step on them in grammatical order.

function shuffled(a) { return [...a].sort(() => Math.random() - 0.5); }

function setupPuzzles() {
  puzzles = (island.puzzles || []).map(def => {
    const pz = { def, solved: !!state.puzzles[def.id], progress: 0, stones: [], cur: null };
    newSentence(pz);
    return pz;
  });
}

function newSentence(pz) {
  const { def } = pz;
  const sets = def.sets || def.sentences;
  const sentence = sets[Math.floor(Math.random() * sets.length)];
  pz.sentence = sentence;
  pz.progress = 0;
  pz.stones = [];
  def.rows.forEach((r, row) => {
    const words = shuffled(sentence);
    def.cols.forEach((c, k) => {
      const [x, y] = def.axis === 'x' ? [r, c] : [c, r];
      pz.stones.push({ x, y, row, word: words[k], ok: words[k] === sentence[row], lit: false });
    });
  });
}

function stepPuzzles() {
  for (const pz of puzzles) {
    const st = onStone(player.x, player.y);
    const mine = st && pz.stones.includes(st) ? st : null;
    if (mine === pz.cur) continue;
    pz.cur = mine;
    if (!mine || pz.solved) continue;
    if (mine.lit) continue;
    if (mine.row === pz.progress && mine.ok) {
      mine.lit = true;
      pz.progress += 1;
      sfx.good();
      showHint(pz.progress < pz.def.rows.length
        ? `✔ ${pz.def.steps[pz.progress - 1]}: «${mine.word}» — الآن: <b>${pz.def.steps[pz.progress]}</b>`
        : `✔ «${pz.sentence.join(pz.def.joiner ?? ' ')}» — ${pz.def.across || 'اعبر!'}`);
      if (pz.progress === pz.def.rows.length) solvePuzzle(pz);
    } else fall(pz, mine);
  }
}

function fall(pz, stone) {
  splashes.push({ x: stone.x, y: stone.y, t: 0 });
  sfx.bad();
  const [rx, ry] = pz.def.reset;
  player.x = rx; player.y = ry; target = null;
  pz.cur = null;
  newSentence(pz);
  say({ bird: true, name: 'هُدهُد', lines: [pz.def.fail] });
}

function solvePuzzle(pz) {
  pz.solved = true;
  state.puzzles[pz.def.id] = true; persist();
  sfx.reveal();
  setTimeout(() => say({ bird: true, name: 'هُدهُد', lines: [pz.def.done] }), 400);
}

function drawPuzzles() {
  const fs = Math.round(TILE * 0.24);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const pz of puzzles) for (const st of pz.stones) {
    const x = sx(st.x), y = sy(st.y);
    const sink = !pz.solved && pz.cur === st ? 2 : 0;
    ctx.fillStyle = 'rgba(0,40,70,.25)';
    ctx.beginPath(); ctx.ellipse(x, y + TILE * 0.12, TILE * 0.46, TILE * 0.3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = st.lit || pz.solved ? '#ffe28a' : '#d8cdb8';
    ctx.strokeStyle = '#3b2414'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, y + sink, TILE * 0.46, TILE * 0.32, 0, 0, 7); ctx.fill(); ctx.stroke();
    if (!pz.solved) {
      ctx.fillStyle = '#3b2414';
      ctx.font = `800 ${fs}px "Baloo Bhaijaan 2", sans-serif`;
      ctx.fillText(st.word, x, y + sink + 1, TILE * 0.86);
    }
  }
  for (const sp of splashes) {
    const k = sp.t / 0.9;
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 3;
    for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.ellipse(sx(sp.x), sy(sp.y), TILE * (0.2 + k * 0.7 + r * 0.15), TILE * (0.1 + k * 0.35 + r * 0.08), 0, 0, 7); ctx.stroke(); }
    ctx.fillStyle = `rgba(210,245,255,${1 - k})`;
    for (let d = 0; d < 6; d++) { const a = (d / 6) * Math.PI * 2; ctx.beginPath(); ctx.arc(sx(sp.x) + Math.cos(a) * TILE * 0.4 * k, sy(sp.y) - TILE * 0.6 * Math.sin(k * Math.PI) + Math.sin(a) * TILE * 0.15, 4, 0, 7); ctx.fill(); }
  }
}

// ---------- Quest log ----------

function toggleLog(force) {
  const log = document.getElementById('quest-log');
  const open = force ?? log.hidden;
  if (!open) { log.hidden = true; busy = !!dialog || !els.popup.hidden; return; }
  const status = p => {
    const q = p.quest;
    if (rewarded(p)) return ['done', q.letter ? `✔ أعطاك ${q.letter}` : '✔ ساعدته'];
    if (questDone(q)) return ['ready', 'عُد إليه لتأخذ مكافأتك!'];
    if (q.fetch) return ['todo', state.items.includes(q.fetch) ? 'أعِد إليه ما وجدته' : 'أضاع شيئاً… ابحث عنه'];
    return ['todo', state.met.includes(p.id) ? 'ينتظر مساعدتك' : 'لم تلتقِ به بعد'];
  };
  const quests = island.people.filter(p => p.quest).map(p => { const [k, t] = status(p); return `<li class="qlog__item qlog__item--${k}"><b>${p.name}</b><small>${t}</small></li>`; }).join('');
  const puzzleRows = puzzles.map(pz => `<li class="qlog__item qlog__item--${pz.solved ? 'done' : 'todo'}"><b>🧩 ${pz.def.title}</b><small>${pz.solved ? '✔ عبرته' : 'لم تعبره بعد'}</small></li>`).join('');
  const m = island.monument;
  const foundChests = island.chests.filter(c => state.chests.includes(c.id)).length;
  log.innerHTML = `
    <div class="qlog__card">
      <h3>📜 مهمّات ${island.name}</h3>
      <ul>${quests}${puzzleRows}
        <li class="qlog__item qlog__item--${state.monument ? 'done' : 'todo'}"><b>${m.name}</b><small>${state.monument ? '✔ اكتمل' : `${num(state.letters.length)} / ${num(tokens().length)} ${island.tokenName}`}</small></li>
      </ul>
      <p class="qlog__extra">🦪 اللآلئ: ${num(state.pearls.length)} / ${num(island.pearls.length)} &nbsp;•&nbsp; 🧰 الصناديق: ${num(foundChests)} / ${num(island.chests.length)}</p>
      <button class="btn btn--gold" data-close-log>متابعة</button>
    </div>`;
  log.hidden = false;
  busy = true;
  log.querySelector('[data-close-log]').onclick = () => { sfx.tap(); toggleLog(false); };
}

// ---------- HUD ----------

function updateHud() {
  goalText = '';
  updateGoal();
  els.pearls.textContent = num(save.get().pearls || 0);
  els.letters.innerHTML = tokens().map(l => `<span class="${state.letters.includes(l) ? 'on' : ''}">${l}</span>`).join('');
}

// A reward card. With `hold`, the hero lifts the item overhead in a burst
// of light ("you got it!"); `fly` sends a golden token into its HUD slot
// when the card closes.
let flyToken = null;
function itemPopup({ icon, title, text, hold = false, fly = null }) {
  busy = true;
  flyToken = fly;
  els.popup.innerHTML = `<div class="item-popup__card ${hold ? 'is-hold' : ''}"><div class="item-popup__rays"></div>
    ${hold ? `<div class="item-get"><div class="item-get__item">${icon}</div><div class="item-get__hero">${heroSVG(heroId())}</div></div>` : `<div class="item-popup__icon">${icon}</div>`}
    <h3>${title}</h3><p>${text}</p><button class="btn btn--gold">رائع!</button></div>`;
  els.popup.hidden = false;
  if (hold) { sfx.fanfare(); shake(els.popup.querySelector('.item-popup__card'), 0.6); } else sfx.win();
}

function closePopup() {
  const from = els.popup.querySelector('.golden-letter')?.getBoundingClientRect();
  els.popup.hidden = true;
  busy = !!dialog;
  sfx.tap();
  if (flyToken && from) flyToSlot(flyToken, from);
  flyToken = null;
}

// The golden token flies from the card into its slot in the top bar.
function flyToSlot(token, from) {
  const slot = [...els.letters.children].find(sp => sp.textContent === token);
  if (!slot || lite()) return;
  const to = slot.getBoundingClientRect();
  const f = document.createElement('span');
  f.className = 'golden-letter token-fly';
  f.textContent = token;
  f.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;--dx:${to.left + to.width / 2 - (from.left + from.width / 2)}px;--dy:${to.top + to.height / 2 - (from.top + from.height / 2)}px;--s:${to.width / from.width}`;
  document.body.append(f);
  slot.style.visibility = 'hidden';
  f.addEventListener('animationend', () => {
    f.remove();
    slot.style.visibility = '';
    slot.classList.add('pop');
    sfx.star(3);
  }, { once: true });
}

let hintTimer;
function showHint(html) {
  els.hint.innerHTML = html;
  els.hint.hidden = false;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(hideHint, 7000);
}
function hideHint() { els.hint.hidden = true; }

// ---------- Pointer input ----------

function toWorld(e) {
  const r = els.canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left - W / 2) / TILE + cam.x, y: (e.clientY - r.top - H / 2) / TILE + cam.y };
}

function onPointerDown(e) {
  if (busy) return;
  const w = toWorld(e);
  // Tapped someone or something? Walk there and interact.
  const hit = interactables().find(it => Math.abs(it.x - w.x) < 0.8 && w.y < it.y + 0.3 && w.y > it.y - 1.8);
  if (hit) { target = { x: hit.x, y: hit.y + 0.6, then: () => interact(hit) }; return; }
  // Otherwise start a floating joystick where the finger landed.
  joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0, moved: false, w };
  els.joy.hidden = false;
  els.joy.style.left = `${e.clientX}px`;
  els.joy.style.top = `${e.clientY}px`;
  els.knob.style.transform = 'translate(-50%, -50%)';
}

function onPointerMove(e) {
  if (!joy || e.pointerId !== joy.id) return;
  const R = 46;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
  const d = Math.hypot(dx, dy);
  if (d > 8) joy.moved = true;
  if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
  joy.dx = dx / R; joy.dy = dy / R;
  els.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function onPointerUp(e) {
  if (!joy || e.pointerId !== joy.id) return;
  // A quick tap (no drag) walks to that spot.
  if (!joy.moved) target = { x: joy.w.x, y: joy.w.y };
  joy = null;
  els.joy.hidden = true;
}

// For tests: what blocks a spot, and teleporting the hero.
export function debugBlocked(x, y) { return blocked(x, y); }
export function debugPlace(x, y) { player.x = x; player.y = y; }

// For tests: current position and state.
export function debugState() {
  return island && { x: player.x, y: player.y, busy, dialog: !!dialog, letters: [...state.letters], pearls: state.pearls.length, monument: state.monument,
    puzzles: puzzles.map(p => ({ id: p.def.id, solved: p.solved, progress: p.progress, stones: p.stones.map(s => ({ x: s.x, y: s.y, row: s.row, ok: s.ok })) })) };
}
