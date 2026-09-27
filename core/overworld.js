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
import { HEROES, g } from '../art/art.js';
import { save } from './save.js';
import { sfx } from './sound.js';
import { num } from './format.js';

const SPEED = 4.2;          // tiles per second
const RADIUS = 0.28;        // player collision radius (tiles)
const TALK_RANGE = 1.8;     // how close you must be to interact (tiles)
const SOLID = new Set(['~', '#']);

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
  return (w[id] ||= { letters: [], pearls: [], chests: [], monument: false, met: [] });
}
const persist = () => save.update(() => {});
const heroId = () => save.get().hero || 'sindbad';
const fill = text => text.replace(/\{name\}/g, HEROES[heroId()].name);
const questDone = q => (save.get().topics[q.topic]?.stars || 0) >= 1;

// ---------- Enter / leave ----------

export function enterIsland(def) {
  island = def;
  state = islandState(def.id);
  els.name.textContent = def.name;
  const [sx, sy] = def.spawn;
  player = { x: sx, y: sy, face: 1, moving: false, step: 0, sprite: heroSprite(heroId()) };
  bird = { x: sx - 0.9, y: sy - 0.6, sprite: hudhudSprite() };
  cam = { x: sx, y: sy };
  people = def.people.map(p => ({ ...p, x: p.at[0], y: p.at[1], face: -1, sprite: villagerSprite(p.id, p.look) }));
  props = def.objects.map(o => ({ ...o, x: o.at[0], y: o.at[1], sprite: objectSprite(o.kind === 'gate' && gateOpen(o) ? 'gate' : o.kind) }));
  sessionGain = { gained: 0, topic: null };
  dialog = null; busy = false; target = null; keys.clear();
  resize();
  buildGround();
  updateHud();
  if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  // First visit: the fisherman calls out.
  if (!state.met.includes('arrival')) {
    state.met.push('arrival'); persist();
    setTimeout(() => showHint('اقترب من <b>العم مصطفى</b> واضغط ✋ للتحدّث'), 600);
  }
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

function blocked(x, y) {
  if (SOLID.has(tileAt(x, y))) return true;
  for (const o of props) {
    if (!o.block) continue;
    if (o.kind === 'gate' && gateOpen(o)) continue;
    const [bw, bh] = o.block;
    if (x > o.x - bw / 2 && x < o.x + bw / 2 && y > o.y - bh && y < o.y) return true;
  }
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
  const land = (x, y) => !'~'.includes(tileAt(x + 0.5, y + 0.5));

  // Sea: deep with a lighter shallow band near land.
  c.fillStyle = '#2b8fbf';
  c.fillRect(0, 0, ground.width, ground.height);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (land(x, y)) continue;
    let near = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (land(x + dx, y + dy)) near = Math.max(near, 3 - Math.max(Math.abs(dx), Math.abs(dy)));
    if (near) { c.fillStyle = near >= 2 ? '#5fcbe0' : '#3fa9d2'; c.fillRect(x * T, y * T, T + 1, T + 1); }
  }
  // Land, drawn as soft blobs so coasts look organic.
  const colors = { s: '#f2d496', '.': '#8ccf6c', '=': '#e6d3a8', d: '#b98a5a', '#': '#d9c4a0' };
  const order = ['s', '.', '=', 'd', '#'];
  for (const kind of order) {
    c.fillStyle = colors[kind];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const t = tileAt(x + 0.5, y + 0.5);
      const draw = kind === 's' ? land(x, y) : t === kind;
      if (!draw) continue;
      if (kind === 's' || kind === '.') {
        c.beginPath(); c.arc((x + 0.5) * T, (y + 0.5) * T, T * 0.72, 0, 7); c.fill();
      } else c.fillRect(x * T, y * T, T + 1, T + 1);
    }
  }
  // Coastline outline + foam.
  c.lineWidth = 2.5 * GROUND_RES;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!land(x, y)) continue;
    const edges = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dy]) => !land(x + dx, y + dy));
    for (const [dx, dy] of edges) {
      const cx = (x + 0.5 + dx * 0.62) * T, cy = (y + 0.5 + dy * 0.62) * T;
      c.strokeStyle = 'rgba(255,255,255,.55)';
      c.beginPath(); c.arc(cx + dx * T * 0.12, cy + dy * T * 0.12, T * 0.28, 0, 7); c.stroke();
    }
  }
  // Grass texture and sand specks.
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const t = tileAt(x + 0.5, y + 0.5);
    if (t === '.') {
      c.strokeStyle = '#6fb257'; c.lineWidth = 2 * GROUND_RES; c.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        if (rand(x, y, k) < 0.55) continue;
        const px = (x + rand(x, y, k + 3)) * T, py = (y + rand(x, y, k + 5)) * T;
        c.beginPath(); c.moveTo(px - 4 * GROUND_RES, py); c.quadraticCurveTo(px - 2, py - 7 * GROUND_RES, px, py); c.quadraticCurveTo(px + 2, py - 7 * GROUND_RES, px + 4 * GROUND_RES, py); c.stroke();
      }
    } else if (t === 's') {
      c.fillStyle = '#d9b070';
      for (let k = 0; k < 3; k++) if (rand(x, y, k) > 0.5) { c.beginPath(); c.arc((x + rand(x, y, k + 7)) * T, (y + rand(x, y, k + 9)) * T, 1.6 * GROUND_RES, 0, 7); c.fill(); }
    } else if (t === '=') {
      c.strokeStyle = '#c9b184'; c.lineWidth = 2 * GROUND_RES;
      c.strokeRect(x * T + 3, y * T + 3, T / 2 - 4, T / 2 - 4);
      c.strokeRect(x * T + T / 2 + 1, y * T + T / 2 + 1, T / 2 - 4, T / 2 - 4);
    } else if (t === 'd') {
      c.strokeStyle = '#8a5a30'; c.lineWidth = 2 * GROUND_RES;
      for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x * T, y * T + (k * T) / 4); c.lineTo((x + 1) * T, y * T + (k * T) / 4); c.stroke(); }
    } else if (t === '#') {
      // A low stone wall: lit top, shaded front face.
      c.fillStyle = '#c4ab80'; c.fillRect(x * T, y * T + T * 0.55, T + 1, T * 0.45);
      c.strokeStyle = '#3b2414'; c.lineWidth = 2 * GROUND_RES;
      c.strokeRect(x * T, y * T + 1, T, T - 2);
      c.beginPath(); c.moveTo(x * T, y * T + T * 0.55); c.lineTo((x + 1) * T, y * T + T * 0.55); c.stroke();
    }
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
    const sp = SPEED * Math.min(1, len) / (len > 1 ? len : 1);
    const mx = dx * sp * dt, my = dy * sp * dt;
    if (!hits(player.x + mx, player.y)) player.x += mx;
    if (!hits(player.x, player.y + my)) player.y += my;
    if (Math.abs(dx) > 0.2) player.face = dx > 0 ? -1 : 1; // art faces the viewer; flip toward travel
    player.step += dt * 10;
    if (target && Math.abs(mx) + Math.abs(my) < 1e-4) target = null; // stuck: give up
  }
  collectPearls();
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

function drawSprite(sp, x, y, height, { flip = false, bob = 0, tilt = 0, alpha = 1 } = {}) {
  if (!sp.img.complete || !sp.img.naturalWidth) return;
  const h = height * TILE, w = (h * sp.w) / sp.h;
  const px = sx(x), py = sy(y) + bob;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(px, py);
  if (tilt) ctx.rotate(tilt);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(sp.img, (-sp.ax / sp.w) * w, (-sp.ay / sp.h) * h, w, h);
  ctx.restore();
}

const HEIGHTS = { palm: 3.2, house: 3.4, fountain: 2.4, stall: 2.9, gate: 4, chest: 1, chestOpen: 1, sign: 1.1, bush: 0.9, rock: 0.75, boat: 2.2, lamp: 1.8, monument: 3.3, flowers: 0.5 };

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
    if (tileAt(x + 0.5, y + 0.5) !== '~' || rand(x, y) > 0.35) continue;
    const ph = time * 1.2 + rand(x, y, 2) * 6;
    const px = sx(x + 0.5 + Math.sin(ph) * 0.15), py = sy(y + 0.5);
    ctx.globalAlpha = 0.25 + 0.3 * Math.sin(ph * 1.3) ** 2;
    ctx.beginPath(); ctx.arc(px, py, TILE * 0.18, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Flat decals, pearls, then everything that stands up, sorted by depth.
  for (const o of props) if (o.sprite.flat) drawSprite(o.sprite, o.x, o.y, HEIGHTS[o.kind]);
  island.pearls.forEach(([x, y], i) => { if (!state.pearls.includes(i)) drawPearl(ctx, sx(x), sy(y), time); });

  const drawables = [];
  for (const o of props) if (!o.sprite.flat) drawables.push({ y: o.y, draw: () => drawProp(o) });
  for (const s of island.signs) drawables.push({ y: s.at[1], draw: () => drawSprite(objectSprite('sign'), s.at[0], s.at[1], HEIGHTS.sign) });
  for (const c of island.chests) drawables.push({ y: c.at[1], draw: () => drawSprite(objectSprite(state.chests.includes(c.id) ? 'chestOpen' : 'chest'), c.at[0], c.at[1], HEIGHTS.chest) });
  for (const p of people) drawables.push({ y: p.y, draw: () => drawPerson(p) });
  drawables.push({ y: player.y, draw: drawPlayer });
  drawables.sort((a, b) => a.y - b.y).forEach(d => d.draw());

  // Hudhud flies above everything, with a shadow on the ground.
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.beginPath(); ctx.ellipse(sx(bird.x), sy(bird.y + 0.6), TILE * 0.22, TILE * 0.08, 0, 0, 7); ctx.fill();
  drawSprite(bird.sprite, bird.x, bird.y + Math.sin(time * 5) * 0.08, 0.75, { flip: player.face > 0 });

  drawPrompts();
}

function drawProp(o) {
  if (o.kind === 'gate') {
    drawSprite(o.sprite, o.x, o.y, HEIGHTS.gate);
    if (!gateOpen(o)) drawSprite(objectSprite('gateDoors'), o.x, o.y, HEIGHTS.gate);
    return;
  }
  drawSprite(o.sprite, o.x, o.y, HEIGHTS[o.kind]);
  if (o.kind === 'monument') {
    // The three letter slots light up as golden letters are placed.
    const letters = ['ع', 'ل', 'م'];
    const h = HEIGHTS.monument * TILE;
    letters.forEach((l, i) => {
      if (!state.monument && !state.letters.includes(l)) return;
      const px = sx(o.x), py = sy(o.y) - h + (h * (62 + i * 34)) / 200;
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

function drawPerson(p) {
  const talking = dialog && dialog.person === p;
  drawSprite(p.sprite, p.x, p.y, 1.5, { flip: p.face > 0, bob: talking ? Math.sin(time * 8) * 1.5 : Math.sin(time * 2 + p.x) * 1 });
}

function drawPlayer() {
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath(); ctx.ellipse(sx(player.x), sy(player.y), TILE * 0.3, TILE * 0.1, 0, 0, 7); ctx.fill();
  const bob = player.moving ? -Math.abs(Math.sin(player.step)) * TILE * 0.08 : Math.sin(time * 2) * 1;
  const tilt = player.moving ? Math.sin(player.step) * 0.05 : 0;
  drawSprite(player.sprite, player.x, player.y, 1.55, { flip: player.face < 0, bob, tilt });
}

// "!" over villagers with a quest to offer; "✔" once it's done.
function drawPrompts() {
  const near = nearest();
  for (const p of people) {
    let mark = null;
    if (p.quest) mark = questDone(p.quest) ? (state.letters.includes(p.quest.letter) ? '✔' : '!') : '!';
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
  const mon = props.find(o => o.kind === 'monument');
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
  if (it.kind === 'sign') say({ name: '📜 لافتة', lines: [it.ref.text] });
  if (it.kind === 'chest') openChest(it.ref);
  if (it.kind === 'monument') useMonument();
}

// ---------- Dialogue ----------

function talkTo(p) {
  p.face = player.x > p.x ? -1 : 1;
  if (!state.met.includes(p.id)) { state.met.push(p.id); persist(); }
  const q = p.quest;
  if (!q) { say({ person: p, lines: p.talk }); return; }
  if (questDone(q) && !state.letters.includes(q.letter)) { rewardQuest(p); return; }
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

function say({ person = null, name, lines, choices = null, then = null }) {
  busy = true;
  dialog = { person, lines: lines.map(fill), i: 0, choices, then, name: name || person?.name };
  els.dlg.hidden = false;
  els.dlg.querySelector('.dialog__portrait').innerHTML = person ? portraitSVG(person.look) : '';
  els.dlg.querySelector('.dialog__portrait').hidden = !person;
  els.dlg.querySelector('.dialog__name').textContent = dialog.name;
  showLine();
}

function showLine() {
  const line = dialog.lines[dialog.i];
  const text = els.dlg.querySelector('.dialog__text');
  const last = dialog.i === dialog.lines.length - 1;
  text.innerHTML = line;
  text.classList.remove('typing'); void text.offsetWidth; text.classList.add('typing');
  const box = els.dlg.querySelector('.dialog__choices');
  box.innerHTML = last && dialog.choices
    ? dialog.choices.map((c, k) => `<button class="btn ${k === 0 ? 'btn--gold' : 'btn--ghost'}" data-choice="${k}">${c.label}</button>`).join('')
    : '';
  els.dlg.querySelector('.dialog__next').hidden = last && !!dialog.choices;
  sfx.tap();
}

function advance() {
  if (!dialog) return;
  if (dialog.i < dialog.lines.length - 1) { dialog.i += 1; showLine(); return; }
  if (dialog.choices) return; // must pick one
  const then = dialog.then;
  closeDialog();
  if (then) then();
}

function onDialogClick(e) {
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
  dialog = null;
  els.dlg.hidden = true;
  busy = !els.popup.hidden;
}

// ---------- Quests ----------

function startQuest(p) {
  pendingQuest = p;
  busy = true;
  hooks.startLesson(p.quest.topic);
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
  if (questDone(p.quest) && !state.letters.includes(p.quest.letter)) setTimeout(() => rewardQuest(p), 350);
  else if (!questDone(p.quest)) setTimeout(() => say({ person: p, lines: p.quest.retry }), 350);
}

function rewardQuest(p) {
  say({ person: p, lines: p.quest.done, then: () => {
    state.letters.push(p.quest.letter); persist();
    updateHud();
    const gate = props.find(o => o.kind === 'gate' && o.opens === p.id);
    itemPopup({
      icon: `<span class="golden-letter">${p.quest.letter}</span>`,
      title: `الحرف الذهبي «${p.quest.letter}»`,
      text: gate ? 'انفتحت البوابة الكبيرة في الشمال!' : `معك ${num(state.letters.length)} من ٣ أحرف. ضعها على النُّصب في الحديقة الشمالية.`,
    });
  } });
}

function useMonument() {
  if (state.monument) { say({ name: '🏛️ نُصب العلم', lines: ['تلمع الأحرف الثلاثة: <b>ع ل م</b> — «العلم نور». أكملتَ جزيرة الحروف!'] }); return; }
  const n = state.letters.length;
  if (n < 3) {
    say({ name: '🏛️ نُصب العلم', lines: [`في النُّصب ثلاث فجوات لأحرف ذهبية. معك ${num(n)} منها.`, 'ساعد أهل الجزيرة لتجمع الأحرف الثلاثة.'] });
    return;
  }
  say({ name: '🏛️ نُصب العلم', lines: ['تضع الأحرف الذهبية في أماكنها: <b>ع</b>… <b>ل</b>… <b>م</b>…', '«العِلم»! يتوهّج النُّصب ويُسمع صوت كصوت الأجراس!'], then: () => {
    state.monument = true; persist();
    sfx.win();
    itemPopup({ icon: '🗝️', title: 'مفتاح الحروف', text: 'أكملتَ جزيرة الحروف! عُد إلى السفينة ⛵ لتُبحر إلى جزيرة جديدة.' });
  } });
}

function openChest(c) {
  state.chests.push(c.id);
  const before = state.pearls.length;
  persist();
  sfx.reveal();
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

// ---------- HUD ----------

function updateHud() {
  els.pearls.textContent = num(save.get().pearls || 0);
  els.letters.innerHTML = ['ع', 'ل', 'م'].map(l => `<span class="${state.letters.includes(l) ? 'on' : ''}">${l}</span>`).join('');
}

function itemPopup({ icon, title, text }) {
  busy = true;
  els.popup.innerHTML = `<div class="item-popup__card"><div class="item-popup__rays"></div><div class="item-popup__icon">${icon}</div><h3>${title}</h3><p>${text}</p><button class="btn btn--gold">رائع!</button></div>`;
  els.popup.hidden = false;
  sfx.win();
}

function closePopup() {
  els.popup.hidden = true;
  busy = !!dialog;
  sfx.tap();
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

// For tests: current position and state.
export function debugState() {
  return island && { x: player.x, y: player.y, busy, dialog: !!dialog, letters: [...state.letters], pearls: state.pearls.length, monument: state.monument };
}
