// «مزرعتي السعيدة» — the farm island, played in 3D (three.js).
//
// A Hay Day-style farm where each quest is a lesson of the grade-6
// agriculture book: plough, plant, care for and harvest real crops in the
// right order; feed and milk the Shami cow; make village cheese; open a
// beehive. The tool tray is the "question": choosing the right job at the
// right time is the knowledge. The chosen helper (bee, cow, puppy, kitty)
// gives hints, explains each step and has its own special moments.
//
// Content lives in worlds/grade6/farm.js; models in models.js; the 3D stage
// (camera, touch, light, time-lapse) in scene.js. A finished quest records
// stars for its topic like any lesson (plugins/agriculture/ holds the quick
// reviews that spaced repetition brings back).
//
// Nothing waits on a real clock: plants grow when they've been cared for,
// and weeks pass in a short day–night time-lapse.

import * as THREE from '../../vendor/three/three.module.min.js';
import { createStage } from './scene.js';
import * as M from './models.js';
import { save } from '../save.js';
import { STAGING } from '../env.js';
import { sfx } from '../sound.js';
import { num } from '../format.js';
import { recordResult } from '../lesson.js';
import { getTopic } from '../topics.js';
import { awardSticker } from '../stickers.js';
import { canSpeak, speak, stopSpeaking } from '../voice.js';
import { HELPERS, TOOLS, PRODUCTS, CROPS, TASKS, QUESTS, ORDERS, DECOR, LEVELS } from '../../worlds/grade6/farm.js';

import type { IslandHooks } from '../isle/island.js';
import type { LessonReturn } from '../lesson.js';
import type { Topic } from '../topics.js';

// ---------- The content's shapes (worlds/grade6/farm.js) ----------
// The content is plain JS, so its tables are read through these types.

/** A tool of the tray (TOOLS). */
export interface Tool { icon: string; name: string }

/** Something the farm makes (PRODUCTS): its price is paid by the ship's orders. */
export interface Product { name: string; icon: string; price: number }

/** How a plot's soil looks. */
export type Soil = 'grass' | 'ploughed' | 'rich' | 'dry';

/** One option of a choice: an emoji or a small drawing (optionArt), and a label. */
export interface PickOption {
  icon?: string;
  /** 'tuber:2', 'tomato:red', 'bee:queen'… */
  art?: string;
  label?: string;
  /** A right answer. */
  ok?: boolean;
  /** 'oneEach': its group (a key of the pick's groups). */
  group?: string;
}

/** The small choice after a job: the moment where the book's knowledge matters. */
export interface FarmPick {
  /** 'choice' (the default), 'find', 'all' (every right one), 'order', 'oneEach' (one of each group) or 'dial'. */
  type?: 'choice' | 'find' | 'all' | 'order' | 'oneEach' | 'dial';
  /** Only after this tool (a step with several tools). */
  tool?: string;
  ask: string;
  options?: PickOption[];
  /** 'oneEach': the groups, by key. */
  groups?: Record<string, string>;
  /** 'dial': the starting value, the right one, and the limits. */
  from?: number;
  target?: number;
  min?: number;
  max?: number;
  /** Said when done, on a miss, and added after the second miss. */
  why?: string;
  oops: string;
  reveal?: string;
}

/** One step of a crop or a task (see worlds/grade6/farm.js). */
export interface FarmStep {
  /** The tool, or several in any order. */
  do: string | string[];
  hint: string;
  /** The book's fact, said once done (or one per tool). */
  why?: string | Record<string, string>;
  /** A special word for a wrong tool at this step. */
  wrong?: Record<string, string>;
  pick?: FarmPick;
  /** How the plants look as soon as the step is done. */
  stage?: string;
  /** The soil after the step (or per tool, set by the tool's own effect). */
  soil?: Soil | Record<string, Soil>;
  /** Weeks pass with this caption; then the plants look like this, with weeds, too close together. */
  lapse?: string;
  then?: string;
  weeds?: boolean;
  dense?: boolean;
  /** A second time-lapse. */
  lapse2?: string;
  then2?: string;
  /** The helper whose special moment comes after this step. */
  power?: string;
  /** Harvest several times (cotton), with a line for each and a time-lapse between. */
  rounds?: number;
  whyRounds?: string[];
  roundLapse?: string;
}

/** A crop (CROPS) or a task at a place (TASKS): its steps, done with the tools of the tray. */
export interface FarmDef {
  name: string;
  /** What finishing gives, and how many. */
  product: string;
  yield?: number;
  /** The lesson of the book it follows. */
  book: string;
  /** The tool tray. */
  tools: string[];
  /** A special word for a tool that never belongs. */
  nope?: Record<string, string>;
  steps: FarmStep[];
  /** «تعلّمنا من كتاب …» */
  learned: string[];
}
export type Crop = FarmDef;
export interface Task extends FarmDef {
  /** Where it is done. */
  place: string;
  /** Products used up to start it. */
  needs?: Record<string, number>;
}

/** A quest: one lesson of the book, a crop to grow or a task to do. */
export interface FarmQuest {
  id: string;
  /** Where its stars are kept. */
  topic: string;
  crop?: string;
  task?: string;
  title: string;
  icon: string;
  goal: string;
}

/** An order the ship takes to the port (ORDERS). */
export interface Order { who: string; icon: string; want: Record<string, number> }

// ---------- The farm's save (save.world.farm) ----------

/**
 * A run: one crop on one plot, or one task at a place, being played.
 * `done` holds the tools done in this step.
 */
export interface Run {
  kind: 'crop' | 'task';
  id: string;
  step: number;
  done: string[];
  round: number;
  misses: number;
  /** Jobs done, and done without a miss (the quest's score). */
  units: number;
  clean: number;
  /** It is the current quest (not practice). */
  quest: boolean;
  soil: Soil;
  stage: string | null;
  weeds: boolean;
  mounds: boolean;
  stakes: boolean;
  dense: boolean;
  /** Extra products from the helper's special moment. */
  bonus: number;
}

/** An order on the board, with its pay. */
export interface FarmOrder extends Order { coins: number; xp: number }

/** This child's farm: save.world.farm. */
export interface FarmSave {
  /** The chosen helper's id. */
  helper: string | null;
  /** Index into QUESTS of the current quest. */
  quest: number;
  plots: { run: Run | null }[];
  /** place → run */
  tasks: Record<string, Run | undefined>;
  inv: Record<string, number>;
  coins: number;
  xp: number;
  orders: FarmOrder[];
  orderSeq: number;
  decor: string[];
}

// ---------- The farm on screen ----------

type Stage = ReturnType<typeof createStage>;
type Els = ReturnType<typeof grabEls>;
type Table<T> = Record<string, T>;
/** models.js's fence (its JS default of `gate = null` reads as always null). */
type Fence = (x1: number, z1: number, x2: number, z2: number, opts?: { gate?: [number, number] | null }) => THREE.Object3D;

/** A plot, built: its base and the instanced plants, weeds, mounds and stakes on it. */
interface Plot {
  i: number;
  base: THREE.Group;
  x: number;
  z: number;
  /** 0 → 1 as the plants pop up. */
  grow: number;
  key: null;
  layout: null;
  plants: THREE.InstancedMesh;
  weeds: THREE.InstancedMesh;
  mounds: THREE.InstancedMesh;
  stakes: THREE.InstancedMesh;
}

/** A place to tap: a plot, the barn, the orders board, or a task's place. */
interface Place {
  kind: 'plot' | 'barn' | 'board' | 'task';
  anchor: THREE.Vector3;
  label: string;
  radius: number;
  /** The height of its beacon and label. */
  top?: number;
  plot?: Plot;
  task?: string;
}

/** What the end-to-end test reads (debug()): a copy of the save, and what is on screen. */
export interface FarmDebug {
  F: Partial<FarmSave>;
  selected: string | null;
  busy: boolean;
  /** The current quest's id, and the place its beacon points at. */
  quest: string | undefined;
  place: string | null | undefined;
}

/** How the helper looks as it talks. */
type Mood = 'happy' | 'oops' | 'think' | 'cheer';

/** Stars won in this visit (shown on the map when the child leaves). */
interface Gain { gained: number; topic: Topic | null }

const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
const wait = (ms: number) => new Promise(r => setTimeout(r, TEST ? Math.min(ms, 60) : ms));
const $ = (id: string) => document.getElementById(id)!;
const toolsOf = (st: FarmStep): string[] => ([] as string[]).concat(st.do);

let els: Els, stage: Stage, hooks: IslandHooks, built = false, failed = false;
let F: FarmSave;          // this child's farm save (save.world.farm)
let selected: string | null = null;      // place id
let busy = false;         // an action is playing
let helperObj: THREE.Object3D | null = null, helperDef: (typeof HELPERS)[number] | null | undefined = null;
let icons: Record<string, string> = {};           // product/helper pictures (data URLs)
let sessionGain: Gain = { gained: 0, topic: null };
const places: Record<string, Place> = {};        // id → { anchor: Vector3, obj, kind, label, radius }
const plots: Plot[] = [];         // { i, base, plants, weeds, mounds, stakes, layout, grow, … }
let ring: ReturnType<typeof M.selectRing>, beacon: THREE.Mesh<THREE.ConeGeometry, THREE.MeshLambertMaterial>;
let cow: THREE.Object3D, dhowObj: THREE.Object3D, feederObj: THREE.Object3D, bucketObj: THREE.Object3D, windmillObj: THREE.Object3D, swarm: THREE.InstancedMesh, decorObjs: Record<string, THREE.Object3D> = {};

// ---------- Save data ----------

function farmState(): FarmSave {
  const s = save.get();
  const w = (s.world ||= {});
  const f: Partial<FarmSave> = (w.farm ||= {});
  f.helper ??= null;
  f.quest ??= 0;            // index into QUESTS of the current quest
  f.plots ||= Array.from({ length: 6 }, () => ({ run: null }));
  f.tasks ||= {};           // place → run
  f.inv ||= {};
  f.coins ??= 0;
  f.xp ??= 0;
  f.orders ||= [];
  f.orderSeq ??= 0;
  f.decor ||= [];
  return f as FarmSave;
}
const persist = () => save.update(() => {});
const quest = (): FarmQuest | null => QUESTS[F.quest] || null;
const questDone = (q: FarmQuest) => F.quest > (QUESTS as FarmQuest[]).indexOf(q);
const level = () => { let l = 1; while (l < LEVELS.length && F.xp >= LEVELS[l]) l++; return l; };

// ---------- Setup ----------

export function init(h: IslandHooks): void { hooks = h; }

export function enter(region?: { name?: string }): void {
  F = farmState();
  sessionGain = { gained: 0, topic: null };
  els ||= grabEls();
  if (!built) { failed = false; build(); }  // a failed 3D view is tried again on the next visit
  if (failed) { showNoGL(); return; }
  stage.start();
  stage.setEnabled(true);
  // Start looking at the fields, zoomed out more on tall phone screens.
  const r = stage.rig;
  r.goal.set(-3.5, 0, 2); r.target.copy(r.goal);
  r.goalDist = r.dist = portrait() ? 62 : 44;
  deselect();
  refreshAll();
  els.title.textContent = region?.name || 'مزرعتي السعيدة';
  if (!F.helper) setTimeout(chooseHelper, TEST ? 0 : 700);
  else { placeHelper(true); setTimeout(() => greet(), TEST ? 0 : 500); }
}

// Back from a review lesson opened from the quest list.
export function lessonReturned(after: LessonReturn): void {
  if (after?.gained > 0) { sessionGain.gained += after.gained; sessionGain.topic = after.topic; }
  stage?.start();
  refreshAll();
}

function leave() {
  stopSpeaking();
  stage?.release();
  closeModal(); closePick();
  hooks.leave(sessionGain.gained > 0 ? sessionGain : undefined);
}

function grabEls() {
  const e = {
    screen: $('screen-farm'), host: $('farm-stage'), title: $('farm-title'),
    coins: $('farm-coins'), level: $('farm-level'), goal: $('farm-goal'),
    labels: $('farm-labels'), places: $('farm-places'), say: $('farm-say'),
    tray: $('farm-tray'), bar: $('farm-bar'), pick: $('farm-pick'), modal: $('farm-modal'), lapse: $('farm-lapse'),
  };
  $('farm-leave').addEventListener('click', () => { sfx.tap(); leave(); });
  $('farm-quests-btn').addEventListener('click', () => { sfx.tap(); openQuests(); });
  $('farm-coins-btn').addEventListener('click', () => { sfx.tap(); openDecor(); });
  e.bar.addEventListener('click', ev => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-bar]');
    if (!b) return;
    sfx.tap();
    ({ inv: openInventory, orders: openOrders, decor: openDecor })[b.dataset.bar as 'inv' | 'orders' | 'decor']();
  });
  e.say.addEventListener('click', ev => {
    if ((ev.target as Element).closest('.farm-say__voice')) { speak(e.say.querySelector('.bubble')!.innerHTML); return; }
    if ((ev.target as Element).closest('.farm-say__face')) { sfx.tap(); hint(); return; }
    e.say.classList.add('is-small');
  });
  e.tray.addEventListener('click', ev => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-tool]');
    if (b) act(b.dataset.tool!);
    if ((ev.target as Element).closest('[data-close-tray]')) { sfx.tap(); deselect(); }
  });
  e.places.addEventListener('click', ev => { const b = (ev.target as Element).closest<HTMLElement>('[data-place]'); if (b) tapPlace(b.dataset.place!); });
  return e;
}

function showNoGL() {
  els.goal.innerHTML = '<p>هذه الجزيرة تحتاج إلى رسوم ثلاثية الأبعاد (WebGL)، وجهازك لا يدعمها. جرّب جزيرة أخرى! ⛵</p>';
  els.goal.hidden = false;
}

// ---------- Building the farm ----------

const PLOTS_AT = [[-9.6, -1.4], [-5.4, -1.4], [-1.2, -1.4], [-9.6, 2.8], [-5.4, 2.8], [-1.2, 2.8]];

function build() {
  try {
    stage = createStage(els.host, { lite: document.body.classList.contains('lite') });
  } catch (err) {
    console.warn('Farm: no WebGL', err);
    failed = true;
    return;
  }
  built = true;
  const { scene } = stage;
  const lite = document.body.classList.contains('lite');
  const sea = M.sea();
  scene.add(sea);
  stage.seaNight(sea.material.uniforms.uNight);
  scene.add(M.island());
  scene.add(M.paths([
    [7.5, 19.5, 5, 9, 2.4], [5, 9, 4.5, 3.5, 2.4], [4.5, 3.5, 3, -5.2, 2.2], [3, -5.2, 10.5, -5.2, 2.2],
    [5, 9, -2, 6.2, 2.2], [-2, 6.2, -12, 6.6, 2.0], [5, 9, 10, 7.2, 2.0], [-12, 6.6, -14, 8.2, 1.8],
    [-11.8, 0.7, -11.8, -4.8, 1.6],
  ]));
  const add = <T extends THREE.Object3D>(obj: T, x: number, z: number, rot = 0, y = 0): T => { obj.position.set(x, y, z); obj.rotation.y = rot; scene.add(obj); return obj; };

  // Plots
  ring = M.selectRing(2.5);
  ring.visible = false;
  scene.add(ring);
  PLOTS_AT.forEach(([x, z], i) => {
    const base = add(M.plotBase(), x, z);
    const plot = { i, base, x, z, grow: 1, key: null, layout: null } as Plot;
    plot.plants = inst(M.plantGeometry('sprout'), M.VC_SWAY, 16, base);
    plot.weeds = inst(M.weedGeometry(), M.VC_SWAY, 6, base);
    plot.mounds = inst(M.moundGeometry(), M.VC, 9, base);
    plot.stakes = inst(M.stakeGeometry(), M.VC, 9, base);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(4.1, 1.6, 4.1), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.6;
    base.add(hit);
    stage.addClickable(hit, `plot-${i}`);
    plots.push(plot);
    places[`plot-${i}`] = { kind: 'plot', plot, anchor: new THREE.Vector3(x, 0, z), label: `الحقل ${num(i + 1)}`, radius: 2.4 };
  });

  // Buildings and animals
  const barn = add(M.barn(), 11, -8.6);
  stage.addClickable(barn, 'barn');
  places.barn = { kind: 'barn', anchor: new THREE.Vector3(11, 0, -8.6), label: 'المخزن', radius: 4, top: 6.5 };
  add(M.silo(), 16.2, -9.6);
  add(M.waterTank(), 6.3, -10.2);
  const dairy = add(M.dairy(), 2, -8.8);
  stage.addClickable(dairy, 'dairy');
  places.dairy = { kind: 'task', task: 'cheese', anchor: new THREE.Vector3(2, 0, -8.8), label: 'معمل الألبان', radius: 3.4, top: 5.2 };

  scene.add((M.fence as Fence)(6.2, -1.2, 14.6, 6.0, { gate: [10.4, 6.0] }));
  cow = add(M.shamiCow(), 10.6, 2.0, 0.25);
  feederObj = add(M.feeder(), 8.0, 4.4, 0.1);
  add(M.trough(), 12.9, 4.6, -0.1);
  bucketObj = add(M.bucket(), 9.2, 2.6);
  bucketObj.visible = false;
  const penHit = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.4, 7.2), new THREE.MeshBasicMaterial({ visible: false }));
  penHit.position.set(10.4, 1.2, 2.4);
  scene.add(penHit);
  stage.addClickable(penHit, 'pen');
  places.pen = { kind: 'task', task: 'cow', anchor: new THREE.Vector3(10.4, 0, 2.4), label: 'حظيرة البقرة', radius: 4.2, top: 3.2 };

  const hives = [[-14.6, 8.6, 0.2], [-12.3, 9.8, -0.1], [-16.6, 6.6, 0.4]].map(([x, z, r]) => add(M.hive(), x, z, r));
  const hiveHit = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.4, 5.4), new THREE.MeshBasicMaterial({ visible: false }));
  hiveHit.position.set(-14.4, 1.2, 8.3);
  scene.add(hiveHit);
  hives.forEach(h => stage.addClickable(h, 'hive'));
  stage.addClickable(hiveHit, 'hive');
  places.hive = { kind: 'task', task: 'bees', anchor: new THREE.Vector3(-14.4, 0, 8.3), label: 'خلايا النحل', radius: 3.6, top: 2.6 };
  swarm = inst(M.tinyBeeGeometry(), M.VC, lite ? 8 : 16, scene);
  swarm.userData.center = new THREE.Vector3(-14.4, 1.5, 8.3);

  const board = add(M.ordersBoard(), 2.0, 12.6, 0.15);
  stage.addClickable(board, 'board');
  places.board = { kind: 'board', anchor: new THREE.Vector3(2.0, 0, 12.6), label: 'لوحة الطلبات', radius: 2.4, top: 3.3 };
  add(M.dock(), 7.6, 18.8, 0.05, -0.05);
  dhowObj = add(M.dhow(), 10.6, 23.6, Math.PI / 2 + 0.1, -0.35);
  dhowObj.userData.home = dhowObj.position.clone();
  stage.addClickable(dhowObj, 'board');

  windmillObj = add(M.windmill(), -15.2, -9.4, 0.5);
  ([['apple', -19, -3], ['apple', -17.4, 1.8], ['lemon', 17.4, 9.6], ['lemon', 19.2, 4.6], ['olive', -6, -11.4], ['olive', 18.6, -2.6], ['apple', -3.4, -12.2]] as [string, number, number][])
    .forEach(([k, x, z], i) => add(M.tree(k, i + 1), x, z, i));
  [[-22.5, 14.5], [21.5, 15.5], [-24.5, -6], [24.5, -11], [-4, 20.4], [23.5, 3]].forEach(([x, z], i) => add(M.palm(i + 2), x, z, i * 1.3, 0));
  [[-20, 18], [14, 19.5], [25, -2], [-25, 4], [-10, -19.5], [9, -19.8]].forEach(([x, z], i) => add(M.rock(i + 1, 0.5 + (i % 3) * 0.2), x, z, i));
  [[-20.5, -12], [-8.5, -15.5], [13.5, -14.8], [20.5, -12.5], [-20.8, 10], [16.5, 13.8], [-6.5, 11.8]].forEach(([x, z], i) => add(M.bush(i + 1), x, z, i));

  // Decorations bought with coins (hidden until bought)
  const decorAt: Record<string, () => THREE.Object3D> = {
    rose: () => { const g = new THREE.Group(); [[-1.6, 8.6], [-4.0, 8.9], [-6.4, 8.6]].forEach(([x, z], i) => { const b = M.roseBush(i + 1); b.position.set(x, 0, z); g.add(b); }); return g; },
    jasmine: () => { const a = M.jasmineArch(); a.position.set(-9.6, 0, 6.6); a.rotation.y = Math.PI / 2 - 0.05; return a; },
    scarecrow: () => { const s = M.scarecrow(); s.position.set(-12.6, 0, 0.6); s.rotation.y = 0.4; return s; },
    fountain: () => { const f = M.fountain(); f.position.set(7.8, 0, 10.8); return f; },
    lanterns: () => { const g = new THREE.Group(); [[6.6, 14.6], [3.2, 7.4], [1.6, -3.6], [-3.6, 7.6]].forEach(([x, z], i) => { const l = M.lantern(); l.position.set(x, 0, z); l.rotation.y = i; g.add(l); }); return g; },
  };
  for (const d of DECOR) { const o = decorAt[d.id](); o.visible = false; scene.add(o); o.traverse(m => { if ((m as THREE.Mesh).isMesh) m.castShadow = true; }); decorObjs[d.id] = o; }

  scatter(scene, lite);

  // The quest beacon: a bouncing golden arrow over the next place to go.
  beacon = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.7, 4), new THREE.MeshLambertMaterial({ color: '#ffd23f', emissive: '#8a5c00' }));
  beacon.rotation.x = Math.PI;
  scene.add(beacon);

  // Icons for menus: products and the helpers' faces.
  icons = stage.snapshots([
    ...Object.keys(M.PRODUCTS).map(id => ({ id, object: M.product(id), yaw: 0.6, pitch: 0.45, pad: 1.25 })),
    ...HELPERS.map(h => ({ id: `helper-${h.id}`, object: M.helper(h.id), yaw: 0.35, pitch: 0.2, pad: 1.05 })),
  ]);

  stage.onTap(id => { if (!busy || !id) tapPlace(id); });
  if (TEST) (window as Window & { __farmStage?: Stage }).__farmStage = stage;
  stage.onFrame(animate);
  buildPlaceButtons();
}

function inst(geo: THREE.BufferGeometry, mat: THREE.Material, count: number, parent: THREE.Object3D): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(geo, mat, count);
  m.count = 0;
  m.castShadow = true;
  m.receiveShadow = true;
  m.frustumCulled = false;
  parent.add(m);
  return m;
}

// Grass tufts and wild flowers, kept off paths and buildings.
function scatter(scene: THREE.Scene, lite: boolean) {
  const keepOut = [[-12, -4.5, 1.6, 5.2], [6, -1.4, 14.8, 6.2], [7.5, -12, 15, -5.5], [-1, -11.5, 5, -6], [-17.5, 5.2, -11, 11], [0.5, 11, 3.5, 14], [-2, 5.5, 11, 10], [5.2, 15, 9.5, 22], [-18, -12, -12.5, -6.5]];
  const free = (x: number, z: number) => !keepOut.some(([a, b, c, d]) => x > a && x < c && z > b && z < d) && Math.abs(x) < 21.5 && Math.abs(z) < 16.5 && Math.hypot(Math.max(0, Math.abs(x) - 13), Math.max(0, Math.abs(z) - 8)) < 9.2;
  const r = M.rng(5);
  const tufts = new THREE.InstancedMesh(M.tuftGeometry(), M.VC_SWAY, lite ? 140 : 320);
  const d = new THREE.Object3D();
  let n = 0;
  for (let k = 0; k < 3000 && n < tufts.count; k++) {
    const x = (r() - 0.5) * 46, z = (r() - 0.5) * 36;
    if (!free(x, z)) continue;
    d.position.set(x, 0, z); d.rotation.y = r() * 6; d.scale.setScalar(0.8 + r() * 0.9); d.updateMatrix();
    tufts.setMatrixAt(n++, d.matrix);
  }
  tufts.count = n;
  scene.add(tufts);
  const colors = ['#ff8fb1', '#ffffff', '#ffd23f', '#b88cff', '#ff7a59'];
  colors.forEach((c, ci) => {
    const fl = new THREE.InstancedMesh(M.flowerGeometry(c), M.VC_SWAY, lite ? 14 : 30);
    let m = 0;
    for (let k = 0; k < 2000 && m < fl.count; k++) {
      // most flowers near the hives (bees need flowers!), some anywhere
      const nearHives = r() < 0.55;
      const x = nearHives ? -14.4 + (r() - 0.5) * 9 : (r() - 0.5) * 44;
      const z = nearHives ? 8.3 + (r() - 0.5) * 7 : (r() - 0.5) * 34;
      if (!nearHives && !free(x, z)) continue;
      if (nearHives && (Math.hypot(x + 14.6, z - 8.6) < 1 || Math.hypot(x + 12.3, z - 9.8) < 1 || Math.hypot(x + 16.6, z - 6.6) < 1 || Math.abs(z) > 16.5 || x < -21.5)) continue;
      d.position.set(x, 0, z); d.rotation.y = r() * 6; d.scale.setScalar(0.9 + r() * 0.6); d.updateMatrix();
      fl.setMatrixAt(m++, d.matrix);
    }
    fl.count = m;
    fl.castShadow = !lite;
    scene.add(fl);
  });
}

// ---------- Every frame ----------

const _d = new THREE.Object3D(), _v = new THREE.Vector3();
function animate(dt: number, t: number) {
  // Plants pop up when their stage changes.
  for (const p of plots) {
    if (p.grow < 1) { p.grow = Math.min(1, p.grow + dt * 2.2); layPlants(p); }
  }
  // Windmill, cow, ship, bees
  if (windmillObj) windmillObj.userData.blades.rotation.z -= dt * 0.8;
  if (cow) {
    const { head, tail } = cow.userData;
    head.rotation.x = cow.userData.eating ? 0.55 + Math.sin(t * 6) * 0.08 : Math.sin(t * 0.7) * 0.08;
    tail.rotation.z = Math.sin(t * 2.2) * 0.35;
  }
  if (dhowObj && !dhowObj.userData.sailing) {
    dhowObj.position.y = -0.35 + Math.sin(t * 1.4) * 0.08;
    dhowObj.rotation.z = Math.sin(t * 1.1) * 0.03;
    dhowObj.userData.flag.rotation.y = Math.sin(t * 5) * 0.3;
  }
  if (swarm) {
    const c = swarm.userData.center;
    const N = swarm.instanceMatrix.count;
    for (let i = 0; i < N; i++) {
      const a = t * (0.8 + (i % 5) * 0.17) + i * 2.1, rad = 1.6 + (i % 4) * 0.7;
      _d.position.set(c.x + Math.cos(a) * rad, c.y + Math.sin(a * 2.3) * 0.5 + (i % 3) * 0.3, c.z + Math.sin(a) * rad * 0.8);
      _d.rotation.set(0, -a, 0); _d.scale.setScalar(1.6); _d.updateMatrix();
      swarm.setMatrixAt(i, _d.matrix);
    }
    swarm.count = N;
    swarm.instanceMatrix.needsUpdate = true;
  }
  // Selection ring and quest beacon
  if (ring.visible) { ring.material.opacity = 0.6 + Math.sin(t * 5) * 0.25; ring.rotation.z += dt * 0.6; }
  const goalPlace = questPlace();
  if (goalPlace && places[goalPlace] && !busy && selected !== goalPlace) {
    const p = places[goalPlace];
    beacon.visible = true;
    beacon.position.set(p.anchor.x, (p.top || 2.4) + 1.2 + Math.abs(Math.sin(t * 3)) * 0.8, p.anchor.z);
    beacon.rotation.y += dt * 2;
  } else beacon.visible = false;
  stepHelper(dt, t);
  drawLabels();
}

// ---------- Places: tapping things ----------

function buildPlaceButtons() {
  els.places.innerHTML = Object.entries(places).map(([id, p]) => `<button data-place="${id}">${p.label}</button>`).join('') + '<button data-place="helper">المساعد</button>';
}

function tapPlace(id: string | null) {
  if (busy) return;
  if (!id) { if (selected) { deselect(); } return; }
  if (id === 'helper') { sfx.tap(); hint(); return; }
  if (!F.helper) { chooseHelper(); return; }
  sfx.tap();
  const p = places[id];
  if (p.kind === 'barn') { select(id); openInventory(); return; }
  if (p.kind === 'board') { select(id); openOrders(); return; }
  if (p.kind === 'plot') { select(id); openPlot(p.plot!); return; }
  if (p.kind === 'task') { select(id); openTask(id); }
}

function select(id: string) {
  selected = id;
  const p = places[id];
  ring.visible = true;
  ring.scale.setScalar(p.radius / 2.5);
  ring.position.set(p.anchor.x, 0.06, p.anchor.z);
  stage.focus(p.anchor, Math.min(stage.rig.goalDist, portrait() ? 46 : 34));
  moveHelperTo(p);
}

function deselect() {
  selected = null;
  if (ring) ring.visible = false;
  els.tray.hidden = true;
  els.bar.hidden = false;
  els.screen.classList.remove('has-tray');
  setGoal();
}

const portrait = () => innerHeight > innerWidth;

// ---------- Runs: one crop on one plot, or one task at a place ----------
// run = { kind, id, step, done: [tools done in this step], round, misses,
//         units, clean, quest, soil, stage, weeds, mounds, stakes, dense, bonus }

const defOf = (run: Run): FarmDef => (run.kind === 'crop' ? (CROPS as Table<Crop>)[run.id] : (TASKS as Table<Task>)[run.id]);

function newRun(kind: Run['kind'], id: string): Run {
  return { kind, id, step: 0, done: [], round: 0, misses: 0, units: 0, clean: 0, quest: quest()?.[kind === 'crop' ? 'crop' : 'task'] === id && !runningQuestElsewhere(id), soil: 'grass', stage: null, weeds: false, mounds: false, stakes: false, dense: false, bonus: 0 };
}

function runningQuestElsewhere(id: string) {
  return F.plots.some(p => p.run?.quest && p.run.id === id) || Object.values(F.tasks).some(r => r?.quest && r.id === id);
}

function unlockedCrops() {
  return Object.keys(CROPS).filter(c => STAGING || QUESTS.some((q, i) => q.crop === c && i <= F.quest));
}

function openPlot(plot: Plot) {
  const slot = F.plots[plot.i];
  if (slot.run) { showTray(slot.run); return; }
  const q = quest();
  if (q?.crop && !runningQuestElsewhere(q.crop)) {
    slot.run = newRun('crop', q.crop);
    persist();
    sayHelper(`حقل ${(CROPS as Table<Crop>)[q.crop].name}! ${(CROPS as Table<Crop>)[q.crop].steps[0].hint}`);
    showTray(slot.run);
    return;
  }
  // Free planting: choose a crop you have learned.
  const list = unlockedCrops();
  if (!list.length) { sayHelper('لنبدأ بالمهمة الحالية أولاً! 📜'); return; }
  openModal(`
    <h3>ماذا نزرع في ${places[`plot-${plot.i}`].label}؟</h3>
    <div class="fm-grid">${list.map(c => `<button class="fm-card" data-crop="${c}"><img src="${icons[(CROPS as Table<Crop>)[c].product] || ''}" alt=""><b>${(CROPS as Table<Crop>)[c].name}</b></button>`).join('')}</div>
    <button class="btn btn--ghost" data-close>إغلاق</button>`, root => {
    root.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLElement>('[data-crop]');
      if (!b) return;
      sfx.tap();
      closeModal();
      slot.run = newRun('crop', b.dataset.crop!);
      persist();
      sayHelper(`نزرع ${(CROPS as Table<Crop>)[b.dataset.crop!].name}. ${(CROPS as Table<Crop>)[b.dataset.crop!].steps[0].hint}`);
      showTray(slot.run);
    });
  });
}

function openTask(id: string) {
  const p = places[id];
  const def = (TASKS as Table<Task>)[p.task!];
  const qi = QUESTS.findIndex(q => q.task === p.task);
  if (qi > F.quest && !STAGING) {
    sayHelper(`سنعمل في ${p.label} قريباً. أولاً: ${quest()?.goal || ''} 📜`);
    deselect(); return;
  }
  let run = F.tasks[id];
  if (!run) {
    if (def.needs && !Object.entries(def.needs).every(([k, n]) => (F.inv[k] || 0) >= n)) {
      const [k, n] = Object.entries(def.needs)[0];
      sayHelper(`نحتاج إلى ${num(n)} ${(PRODUCTS as Table<Product>)[k].icon} ${(PRODUCTS as Table<Product>)[k].name} على الأقل. ${k === 'milk' ? 'احلب البقرة في الحظيرة أولاً!' : ''}`);
      deselect(); return;
    }
    if (def.needs) for (const [k, n] of Object.entries(def.needs)) F.inv[k] -= n;
    run = F.tasks[id] = newRun('task', p.task!);
    persist();
    updateHud();
    sayHelper(`${def.name}! ${def.steps[0].hint}`);
  }
  showTray(run);
}

function runAt(id: string): Run | null | undefined {
  const p = places[id];
  return p.kind === 'plot' ? F.plots[p.plot!.i].run : F.tasks[id];
}

// The tool tray for the selected place.
function showTray(run: Run) {
  const def = defOf(run);
  const st = def.steps[run.step];
  const need = new Set(toolsOf(st).filter(t => !run.done.includes(t)));
  els.bar.hidden = true;
  els.tray.hidden = false;
  els.screen.classList.add('has-tray');
  els.tray.innerHTML = `
    <div class="farm-tray__head"><b>${def.name}</b><span>${stepDots(run, def)}</span><button class="farm-tray__x" data-close-tray aria-label="إغلاق">✕</button></div>
    <div class="farm-tray__tools" role="toolbar" aria-label="الأدوات">
      ${def.tools.map(t => `<button class="farm-tool ${run.done.includes(t) && toolsOf(st).includes(t) ? 'is-done' : ''} ${run.misses >= 2 && need.has(t) ? 'is-reveal' : ''}" data-tool="${t}" ${TEST && need.has(t) ? 'data-ok' : ''}>
        <span>${(TOOLS as Table<Tool>)[t].icon}</span><small>${(TOOLS as Table<Tool>)[t].name}</small></button>`).join('')}
    </div>`;
  setGoal(run);
  // The helper's bubble sits just above the tray, however tall it is.
  requestAnimationFrame(() => els.screen.style.setProperty('--tray-h', `${els.tray.offsetHeight}px`));
}

function stepDots(run: Run, def: FarmDef) {
  const n = def.steps.length;
  return Array.from({ length: n }, (_, i) => `<i class="${i < run.step ? 'on' : i === run.step ? 'now' : ''}"></i>`).join('');
}

// ---------- Doing a job ----------

async function act(tool: string) {
  if (busy || !selected) return;
  const run = runAt(selected);
  if (!run) return;
  const def = defOf(run);
  const st = def.steps[run.step];
  const need = toolsOf(st).filter(t => !run.done.includes(t));
  if (!need.includes(tool)) { wrongTool(run, def, st, tool); return; }
  busy = true;
  els.tray.classList.add('is-busy');
  stage.setEnabled(false);
  sfx.tap();
  try {
    // A choice that needs the book's knowledge, if this job has one.
    const pick = st.pick && (!st.pick.tool || st.pick.tool === tool) ? st.pick : null;
    if (pick) {
      const ok = await openPick(pick, run);
      if (!ok) return;   // closed without finishing
    }
    await doFx(tool, run, st);
    const clean = run.misses === 0;
    run.units += 1;
    if (clean) { run.clean += 1; gainXp(5, places[selected].anchor); }
    run.misses = 0;
    run.done.push(tool);
    const why = st.rounds ? st.whyRounds?.[run.round] : (pick ? pick.why : typeof st.why === 'object' ? st.why[tool] : st.why);
    if (why) sayHelper(why, 'happy');
    persist();
    if (st.rounds) {
      run.round += 1;
      run.done = [];
      if (run.round < st.rounds) {
        showTray(run);
        await wait(900);
        await lapse(st.roundLapse);
        setStage(run, `open${run.round + 1}`);
        persist();
        return;
      }
    } else if (run.done.length < toolsOf(st).length) { showTray(run); return; }
    await completeStep(run, def, st);
  } finally {
    busy = false;
    els.tray.classList.remove('is-busy');
    stage.setEnabled(true);
    if (selected && runAt(selected)) showTray(runAt(selected)!);
  }
}

function wrongTool(run: Run, def: FarmDef, st: FarmStep, tool: string) {
  sfx.bad();
  run.misses += 1;
  persist();
  let msg = st.wrong?.[tool] || def.nope?.[tool];
  if (!msg) {
    const later = def.steps.slice(run.step + 1).some(s => toolsOf(s).includes(tool));
    const before = def.steps.slice(0, run.step).some(s => toolsOf(s).includes(tool)) || run.done.includes(tool);
    msg = later ? `ليس الآن! «${(TOOLS as Table<Tool>)[tool].name}» يأتي لاحقاً.` : before ? `قمنا بـ«${(TOOLS as Table<Tool>)[tool].name}» من قبل. ما الخطوة التالية؟` : `«${(TOOLS as Table<Tool>)[tool].name}» ليس من خطوات ${def.name}.`;
  }
  if (run.misses >= 2) {
    const need = toolsOf(st).filter(t => !run.done.includes(t));
    msg += ` ${st.hint} جرّب: ${need.map(t => `«${(TOOLS as Table<Tool>)[t].icon} ${(TOOLS as Table<Tool>)[t].name}»`).join(' أو ')}.`;
  }
  sayHelper(msg, 'oops');
  helperHop();
  showTray(run);
  els.tray.querySelector(`[data-tool="${tool}"]`)?.classList.add('is-shake');
}

async function completeStep(run: Run, def: FarmDef, st: FarmStep) {
  if (st.stage) setStage(run, st.stage);
  if (st.soil && typeof st.soil === 'string') setSoil(run, st.soil);
  if (st.lapse) {
    showTray(run);
    await wait(700);
    await lapse(st.lapse);
    if (st.then) setStage(run, st.then);
    if (st.weeds) setWeeds(run, true);
    if (st.dense) { run.dense = true; layPlantsFor(run); }
  }
  if (st.power) await power(st.power, run);
  if (st.lapse2) {
    await wait(500);
    await lapse(st.lapse2);
    if (st.then2) setStage(run, st.then2);
  }
  run.step += 1;
  run.done = [];
  run.round = 0;
  persist();
  if (run.step >= def.steps.length) { await finishRun(run, def); return; }
  const next = def.steps[run.step];
  setTimeout(() => { if (selected && runAt(selected) === run && !busy && run.misses === 0) sayHelper(next.hint, 'think'); }, TEST ? 0 : 2200);
}

async function finishRun(run: Run, def: FarmDef) {
  const placeId = selected!;
  const product = def.product;
  const amount = (def.yield || 1) + (run.bonus || 0);
  F.inv[product] = (F.inv[product] || 0) + amount;
  flyProducts(product, amount, places[placeId].anchor);
  gainXp(10, places[placeId].anchor);
  // Clear the place for next time.
  if (run.kind === 'crop') { const slot = F.plots[places[placeId].plot!.i]; slot.run = null; resetPlot(places[placeId].plot!); }
  else { delete F.tasks[placeId]; resetTask(run.id); }
  persist();
  updateHud();
  await wait(TEST ? 0 : 900);
  deselect();
  // A quest done, or practice: both record stars for the topic.
  const q = QUESTS.find(x => (x.crop || x.task) === run.id);
  const topic = q && getTopic(q.topic);
  let res: ReturnType<typeof recordResult> = null;
  if (topic && (run.quest || questDone(q) || STAGING)) {
    const before = save.get().topics[q.topic]?.stars || 0;
    res = recordResult(q.topic, { correct: run.clean, total: run.units });
    const gained = (save.get().topics[q.topic]?.stars || 0) - before;
    if (gained > 0) { sessionGain.gained += gained; sessionGain.topic = topic; }
  }
  if (run.quest) {
    F.quest = Math.max(F.quest, QUESTS.indexOf(q!) + 1);
    F.coins += 30;
    gainXp(40);
    persist();
    updateHud();
    await questComplete(q!, def, res);
  } else {
    sayHelper(`+${num(amount)} ${(PRODUCTS as Table<Product>)[product].icon} في المخزن! ${res ? `(${'★'.repeat(res.stars)}${'☆'.repeat(3 - res.stars)})` : ''}`, 'happy');
  }
}

// ---------- Visuals for jobs ----------

function plotOf(run: Run): Plot | null {
  const i = F.plots.findIndex(p => p.run === run);
  return i >= 0 ? plots[i] : null;
}

function setSoil(run: Run, soil: Soil) {
  run.soil = soil;
  const p = plotOf(run);
  if (p) applySoil(p, run);
}
function applySoil(p: Plot, run: Run | null) {
  const tex = { grass: 'unploughed', ploughed: 'soil', rich: 'soilRich', dry: 'soilDry' }[run?.soil || 'grass'];
  const mat = p.base.userData.soil;
  if (mat.map !== (M.TEX as Table<THREE.Texture>)[tex]) { mat.map = (M.TEX as Table<THREE.Texture>)[tex]; mat.needsUpdate = true; }
}

function setStage(run: Run, s: string) {
  run.stage = s;
  const p = plotOf(run);
  if (p) { p.grow = 0; layPlantsFor(run); sfx.good(); }
}
function setWeeds(run: Run, on: boolean) {
  run.weeds = on;
  const p = plotOf(run);
  if (p) layExtras(p, run);
}
function layPlantsFor(run: Run) { const p = plotOf(run); if (p) { layPlants(p); layExtras(p, run); } }

function plantSpots(dense: boolean) {
  const out: [number, number][] = [];
  const n = dense ? 4 : 3, gap = dense ? 0.82 : 1.1;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push([(i - (n - 1) / 2) * gap + Math.sin(i * 7 + j) * 0.08, (j - (n - 1) / 2) * gap + Math.cos(i * 3 + j * 5) * 0.08]);
  return out;
}

function layPlants(p: Plot) {
  const run = F.plots[p.i].run;
  if (!run || !run.stage) { p.plants.count = 0; return; }
  const key = run.stage === 'planted' ? 'planted' : `${run.id}:${run.stage}`;
  const geo = M.plantGeometry(key) || M.plantGeometry('sprout');
  if (p.plants.geometry !== geo) p.plants.geometry = geo;
  const spots = plantSpots(run.dense && run.stage === 'young');
  const e = p.grow < 1 ? 1 - (1 - p.grow) ** 3 : 1;
  const pop = p.grow < 1 ? e + Math.sin(p.grow * Math.PI) * 0.18 : 1;
  spots.forEach(([x, z], k) => {
    _d.position.set(x, 0.32, z);
    _d.rotation.set(0, k * 1.7, 0);
    _d.scale.setScalar(Math.max(0.01, pop) * (run.dense && run.stage === 'young' ? 1.0 : 1.45));
    _d.updateMatrix();
    p.plants.setMatrixAt(k, _d.matrix);
  });
  p.plants.count = spots.length;
  p.plants.instanceMatrix.needsUpdate = true;
}

function layExtras(p: Plot, run: Run | null | undefined) {
  const spots = plantSpots(false);
  const put = (mesh: THREE.InstancedMesh, on: boolean | undefined, list: [number, number][], y = 0.32) => {
    if (!on) { mesh.count = 0; return; }
    list.forEach(([x, z], k) => { _d.position.set(x, y, z); _d.rotation.set(0, k * 2.3, 0); _d.scale.setScalar(1); _d.updateMatrix(); mesh.setMatrixAt(k, _d.matrix); });
    mesh.count = list.length;
    mesh.instanceMatrix.needsUpdate = true;
  };
  put(p.weeds, run?.weeds, [[0.55, 0.5], [-0.6, -0.5], [0.5, -0.6], [-0.5, 0.6], [1.5, 0.05], [-1.5, -0.1]]);
  put(p.mounds, run?.mounds && run.stage !== 'pulled', spots, 0.3);
  put(p.stakes, run?.stakes, spots);
}

function resetPlot(p: Plot) {
  p.plants.count = 0; p.weeds.count = 0; p.mounds.count = 0; p.stakes.count = 0;
  applySoil(p, null);
}

function resetTask(id: string) {
  if (id === 'cow') { feederObj.userData.food.visible = false; cow.userData.eating = false; bucketObj.visible = false; }
}

// Restore every plot and place from the save (entering the farm).
function refreshAll() {
  plots.forEach(p => {
    const run = F.plots[p.i].run;
    resetPlot(p);
    if (run) { applySoil(p, run); p.grow = 1; layPlants(p); layExtras(p, run); }
  });
  const cowRun = F.tasks.pen;
  if (cowRun) { feederObj.userData.food.visible = cowRun.step > 1 || cowRun.done.includes('feed'); bucketObj.visible = false; }
  for (const d of DECOR) decorObjs[d.id].visible = F.decor.includes(d.id);
  updateHud();
  setGoal();
  ensureOrders();
}

async function doFx(tool: string, run: Run, st: FarmStep) {
  const place = places[selected!];
  const at = place.anchor;
  const p = place.plot;
  const v = new THREE.Vector3();
  switch (tool) {
    case 'plough': {
      const t = M.tractor();
      stage.scene.add(t);
      sfx.sail();
      const t0 = performance.now(), dur = TEST ? 50 : 1300;
      await new Promise<void>(res => {
        const tick = (now: number) => {
          const k = Math.min(1, (now - t0) / dur);
          t.position.set(at.x - 2.6 + k * 5.2, 0.15, at.z + Math.sin(k * Math.PI * 3) * 1.2);
          t.rotation.y = Math.cos(k * Math.PI * 3) * 0.4;
          if (Math.random() < 0.3) stage.burst('dirt', v.set(t.position.x - 0.9, 0.2, t.position.z), 3);
          if (k < 1) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
      stage.scene.remove(t);
      setSoil(run, run.soil === 'rich' ? 'rich' : 'ploughed');
      break;
    }
    case 'manure':
      for (let i = 0; i < 3; i++) { stage.burst('dirt', v.set(at.x + (i - 1) * 1.1, 0.4, at.z + (i % 2 ? 0.6 : -0.6)), 10); await wait(180); }
      if (!run.stage) setSoil(run, 'rich');
      else if (run.stage === 'young' && (CROPS as Table<Crop>)[run.id] && M.plantGeometry(`${run.id}:grown`)) setStage(run, 'grown');
      break;
    case 'plant':
    case 'cut':
      stage.burst(tool === 'cut' ? 'spark' : 'dirt', v.set(at.x, 0.5, at.z), 16);
      await wait(500);
      break;
    case 'water': {
      const can = M.wateringCan();
      can.position.set(at.x - 0.8, 2.2, at.z);
      can.rotation.z = -0.5;
      stage.scene.add(can);
      for (let i = 0; i < 5; i++) { stage.burst('water', v.set(at.x + 0.2, 0.3, at.z), 14); can.position.x += 0.35; await wait(220); }
      stage.scene.remove(can);
      break;
    }
    case 'hoe':
      if (p) { stage.burst('leaf', v.set(at.x, 0.4, at.z), 22); run.weeds = false; layExtras(p, run); }
      await wait(500);
      break;
    case 'hill':
      if (p) { run.mounds = true; layExtras(p, run); stage.burst('dirt', v.set(at.x, 0.4, at.z), 18); }
      await wait(500);
      break;
    case 'stake':
      if (p) { run.stakes = true; layExtras(p, run); stage.burst('spark', v.set(at.x, 1, at.z), 10); }
      await wait(500);
      break;
    case 'thin':
      if (p) { run.dense = false; p.grow = 0.6; layPlants(p); stage.burst('leaf', v.set(at.x, 0.5, at.z), 18); }
      await wait(500);
      break;
    case 'wean':
      setSoil(run, 'dry');
      stage.burst('spark', v.set(at.x, 0.5, at.z), 8);
      await wait(400);
      break;
    case 'harvest':
    case 'top':
      stage.burst(run.id === 'cotton' ? 'fluff' : 'leaf', v.set(at.x, 0.6, at.z), 24);
      if (tool === 'harvest' && run.id !== 'cotton' && run.id !== 'beet') { if (p) { p.plants.count = 0; run.stage = null; } }
      if (tool === 'harvest' && run.id === 'cotton' && p && run.round === 2) { p.plants.count = 0; }
      if (tool === 'top' && p) { p.plants.count = 0; run.stage = null; }
      sfx.good();
      await wait(600);
      break;
    // animals and workshops
    case 'clean': stage.burst('spark', v.set(at.x, 0.5, at.z), 24); await wait(500); break;
    case 'feed': feederObj.userData.food.visible = true; cow.userData.eating = true; stage.burst('leaf', v.copy(feederObj.position).setY(0.8), 14); await wait(700); break;
    case 'drink': stage.burst('water', v.set(12.9, 0.2, 4.6), 18); await wait(600); break;
    case 'udder': stage.burst('spark', v.set(10.6, 0.8, 2), 14); await wait(500); break;
    case 'milk': bucketObj.visible = true; cow.userData.eating = false; stage.burst('fluff', v.set(9.2, 0.8, 2.6), 14); await wait(700); break;
    case 'heat': stage.burst('fluff', v.set(at.x + 1.3, 5, at.z - 0.6), 18); await wait(600); break;
    case 'cool': stage.burst('water', v.set(at.x, 0.5, at.z + 2), 10); await wait(500); break;
    case 'rennet': case 'check': stage.burst('spark', v.set(at.x, 1.5, at.z + 2), 14); await wait(500); break;
    case 'press': stage.burst('fluff', v.set(at.x, 1, at.z + 2.2), 10); await wait(500); break;
    case 'salt': stage.burst('salt', v.set(at.x, 1.4, at.z + 2.2), 26); await wait(600); break;
    case 'suit': stage.burst('spark', v.set(at.x, 1, at.z), 16); await wait(500); break;
    case 'inspect': stage.burst('spark', v.set(at.x, 1.2, at.z), 10); await wait(400); break;
    case 'frame': stage.burst('spark', v.set(at.x, 1.4, at.z), 20); await wait(600); break;
    default: await wait(300);
  }
}

// Weeks pass in a couple of seconds: day, night, day…
async function lapse(caption: string | undefined) {
  if (!caption) return;
  els.lapse.innerHTML = `<span class="farm-lapse__sun" aria-hidden="true">☀️</span><p>${caption}</p>`;
  els.lapse.hidden = false;
  els.lapse.classList.remove('is-in'); void els.lapse.offsetWidth; els.lapse.classList.add('is-in');
  sfx.reveal();
  await stage.timelapse(TEST ? 0.05 : 2.8, 2);
  await wait(TEST ? 0 : 600);
  els.lapse.hidden = true;
}

// The helper's special moment.
async function power(who: string, run: Run) {
  if (F.helper !== who) return;
  const h = HELPERS.find(x => x.id === who);
  helperHop(true);
  stage.burst('spark', helperObj!.position.clone().setY(1.6), 26);
  sfx.fanfare();
  if (who === 'bee' || who === 'kitty' || who === 'cow') run.bonus = (run.bonus || 0) + (who === 'bee' ? 2 : 1);
  else gainXp(15, helperObj!.position);
  sayHelper(h!.power, 'cheer');
  await wait(TEST ? 0 : 2400);
}

// ---------- Choices (the book's knowledge) ----------

let pickDone: ((ok: boolean) => void) | null = null;
function closePick() {
  els.pick.hidden = true;
  els.pick.innerHTML = '';
  if (pickDone) { const d = pickDone; pickDone = null; d(false); }
}

function openPick(pick: FarmPick, run: Run) {
  return new Promise<boolean>(resolve => {
    pickDone = resolve;
    const type = pick.type || 'choice';
    const opts = pick.options || [];
    let order = opts.map((_, i) => i);
    if (type === 'order' || type === 'choice' || type === 'all') order = shuffle(order, run.units + 3);
    let value = pick.from!, next = 0;
    const chosen = new Set<number>();
    const miss = (msg: string, el?: HTMLElement) => {
      run.misses += 1;
      persist();
      sfx.bad();
      if (el) { el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake'); }
      const reveal = run.misses >= 2;
      setNote(`${msg || pick.oops}${reveal && pick.reveal ? ` ${pick.reveal}` : ''}`, 'oops');
      if (reveal) els.pick.querySelectorAll<HTMLElement>('[data-i]').forEach(b => { if (opts[+b.dataset.i!]?.ok) b.classList.add('is-reveal'); });
    };
    const finish = () => {
      els.pick.querySelectorAll('[data-ok],[data-step]').forEach(x => { x.removeAttribute('data-ok'); x.removeAttribute('data-step'); });
      sfx.good();
      els.pick.classList.add('is-solved');
      setTimeout(() => {
        pickDone = null; els.pick.hidden = true; els.pick.classList.remove('is-solved'); resolve(true);
        if (laterToast) { const t = laterToast; laterToast = null; setTimeout(() => toast(t), 600); }
      }, TEST ? 0 : 650);
    };
    const setNote = (html: string, mood?: string) => { const n = els.pick.querySelector<HTMLElement>('.fpick__note')!; n.innerHTML = html; n.dataset.mood = mood || ''; };
    const card = (i: number) => {
      const o = opts[i];
      return `<button class="fpick__opt ${o.art ? 'has-art' : ''}" data-i="${i}">${o.art ? optionArt(o.art) : `<span class="fpick__icon">${o.icon || ''}</span>`}${o.label ? `<small>${o.label}</small>` : ''}</button>`;
    };
    let body = '';
    if (type === 'dial') {
      body = `<div class="fdial">
        <div class="fdial__therm" aria-hidden="true"><i style="--v:${value}%"></i></div>
        <div class="fdial__read"><b class="fdial__val">${num(value)}</b><span>درجة</span></div>
        <div class="fdial__btns">
          <button class="btn btn--ghost" data-d="-10">−10</button><button class="btn btn--ghost" data-d="-1">−1</button>
          <button class="btn btn--ghost" data-d="1">+1</button><button class="btn btn--ghost" data-d="10">+10</button>
        </div>
        <button class="btn btn--gold fdial__ok" data-done>تمّ ✔</button>
      </div>`;
    } else {
      body = `<div class="fpick__opts fpick__opts--${type} n${opts.length}">${order.map(card).join('')}</div>`;
      if (type === 'oneEach') body += '<button class="btn btn--gold fpick__done" data-done>قدّم الوجبة 🐄</button>';
    }
    els.pick.innerHTML = `<div class="fpick" role="dialog" aria-modal="true" aria-label="اختيار">
        <button class="fpick__x" data-close-pick aria-label="إغلاق">✕</button>
        <p class="fpick__ask">${pick.ask}</p>
        ${body}
        <p class="fpick__note" aria-live="polite"></p>
      </div>`;
    els.pick.hidden = false;
    const mark = () => {
      if (!TEST) return;
      els.pick.querySelectorAll('[data-ok],[data-step]').forEach(b => { b.removeAttribute('data-ok'); b.removeAttribute('data-step'); });
      if (type === 'choice' || type === 'find') els.pick.querySelectorAll<HTMLElement>('[data-i]').forEach(b => { if (opts[+b.dataset.i!].ok) b.dataset.ok = ''; });
      if (type === 'all') { const b = [...els.pick.querySelectorAll<HTMLElement>('[data-i]')].find(x => opts[+x.dataset.i!].ok && !chosen.has(+x.dataset.i!)); if (b) b.dataset.step = ''; }
      if (type === 'order') { const b = els.pick.querySelector<HTMLElement>(`[data-i="${next}"]`); if (b) b.dataset.step = ''; }
      if (type === 'oneEach') {
        const have = new Set([...chosen].map(i => opts[i].group));
        const want = Object.keys(pick.groups!).find(gk => !have.has(gk));
        if (want) { const b = els.pick.querySelector<HTMLElement>(`[data-i="${opts.findIndex(o => o.group === want)}"]`); if (b) b.dataset.step = ''; }
        else els.pick.querySelector<HTMLElement>('[data-done]')!.dataset.ok = '';
      }
      if (type === 'dial') {
        if (value === pick.target) els.pick.querySelector<HTMLElement>('[data-done]')!.dataset.ok = '';
        else { const diff = pick.target! - value; const d = Math.abs(diff) >= 10 ? 10 * Math.sign(diff) : Math.sign(diff); els.pick.querySelector<HTMLElement>(`[data-d="${d}"]`)!.dataset.step = ''; }
      }
    };
    mark();
    els.pick.onclick = e => {
      if ((e.target as Element).closest('[data-close-pick]')) { sfx.tap(); closePick(); return; }
      const d = (e.target as Element).closest<HTMLElement>('[data-d]');
      if (d) {
        sfx.tap();
        value = Math.max(pick.min!, Math.min(pick.max!, value + Number(d.dataset.d)));
        els.pick.querySelector('.fdial__val')!.textContent = num(value);
        els.pick.querySelector<HTMLElement>('.fdial__therm i')!.style.setProperty('--v', `${value}%`);
        mark(); return;
      }
      if ((e.target as Element).closest('[data-done]')) {
        if (type === 'dial') { if (value === pick.target) finish(); else miss(value > pick.target! ? `${pick.oops} (أعلى من اللازم)` : `${pick.oops} (أقلّ من اللازم)`); return; }
        if (type === 'oneEach') {
          const groups = new Set([...chosen].map(i => opts[i].group));
          if (chosen.size === Object.keys(pick.groups!).length && groups.size === chosen.size) finish();
          else miss(pick.oops);
          return;
        }
      }
      const b = (e.target as Element).closest<HTMLElement>('[data-i]');
      if (!b) return;
      const i = +b.dataset.i!, o = opts[i];
      if (type === 'choice' || type === 'find') { if (o.ok) { b.classList.add('is-right'); finish(); } else miss(pick.oops, b); return; }
      if (type === 'all') {
        if (chosen.has(i)) return;
        if (o.ok) { chosen.add(i); b.classList.add('is-right'); sfx.star(chosen.size % 3); if (opts.every((x, k) => !x.ok || chosen.has(k))) finish(); else mark(); }
        else miss(pick.oops, b);
        return;
      }
      if (type === 'order') {
        if (i === next) { b.classList.add('is-right'); b.dataset.n = num(next + 1); next += 1; sfx.star(next % 3); if (next === opts.length) finish(); else mark(); }
        else miss(pick.oops, b);
        return;
      }
      if (type === 'oneEach') {
        sfx.tap();
        if (chosen.has(i)) { chosen.delete(i); b.classList.remove('is-on'); }
        else {
          for (const k of [...chosen]) if (opts[k].group === o.group) { chosen.delete(k); els.pick.querySelector(`[data-i="${k}"]`)!.classList.remove('is-on'); }
          chosen.add(i); b.classList.add('is-on');
        }
        mark();
      }
    };
  });
}

function shuffle<T>(list: T[], seed: number): T[] {
  const r = M.rng(seed * 97 + 13);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Small drawings for choices: potato pieces with buds, tomatoes, bees.
function optionArt(art: string) {
  const [kind, v] = art.split(':');
  const S = '#3b2414';
  if (kind === 'tuber') {
    const buds = [[30, 26], [52, 40], [40, 54]].slice(0, +v);
    return `<svg viewBox="0 0 80 70" class="fpick__art"><path d="M10 40 Q8 16 36 12 Q66 10 70 34 Q72 58 44 60 Q14 62 10 40Z" fill="#e7c08a" stroke="${S}" stroke-width="3"/><path d="M14 40 Q40 46 66 38" fill="none" stroke="#c9955b" stroke-width="3"/>
      ${buds.map(([x, y]) => `<g><circle cx="${x}" cy="${y}" r="5" fill="#8a5a34"/><path d="M${x} ${y - 4} q3 -8 9 -9" fill="none" stroke="#4fae45" stroke-width="3" stroke-linecap="round"/></g>`).join('')}</svg>`;
  }
  if (kind === 'tomato') {
    const c = v === 'red' ? '#e8402f' : '#8fcf4a';
    return `<svg viewBox="0 0 60 60" class="fpick__art"><circle cx="30" cy="34" r="20" fill="${c}" stroke="${S}" stroke-width="3"/><path d="M20 16 l10 6 l10 -6 l-4 10 h-12Z" fill="#3f9d3c" stroke="${S}" stroke-width="2"/><ellipse cx="22" cy="28" rx="5" ry="3" fill="#fff" opacity=".5"/></svg>`;
  }
  if (kind === 'bee') {
    const body = { queen: { rx: 10, ry: 24, cy: 34 }, drone: { rx: 15, ry: 16, cy: 32 }, worker: { rx: 9, ry: 12, cy: 32 } }[v as 'queen' | 'drone' | 'worker'];
    const eye = v === 'drone' ? 7 : 4;
    return `<svg viewBox="0 0 60 64" class="fpick__art">
      <ellipse cx="18" cy="${body.cy - 6}" rx="12" ry="7" fill="#e8f6ff" stroke="${S}" stroke-width="2" opacity=".9"/><ellipse cx="42" cy="${body.cy - 6}" rx="12" ry="7" fill="#e8f6ff" stroke="${S}" stroke-width="2" opacity=".9"/>
      <ellipse cx="30" cy="${body.cy + 4}" rx="${body.rx}" ry="${body.ry}" fill="#ffd23f" stroke="${S}" stroke-width="2.5"/>
      ${[-0.3, 0.1, 0.5].map(k => `<path d="M${30 - body.rx * 0.9} ${body.cy + 4 + k * body.ry} h${body.rx * 1.8}" stroke="${S}" stroke-width="4"/>`).join('')}
      <circle cx="30" cy="${body.cy - body.ry + 2}" r="8" fill="#3b2414"/>
      <circle cx="${30 - eye / 1.5}" cy="${body.cy - body.ry + 1}" r="${eye / 2}" fill="#fff"/><circle cx="${30 + eye / 1.5}" cy="${body.cy - body.ry + 1}" r="${eye / 2}" fill="#fff"/></svg>`;
  }
  return '';
}

// ---------- The helper ----------

let helperGoal = new THREE.Vector3(-2, 0, 6.5), helperHopT = 0, helperShadow: ReturnType<typeof M.blobShadow> | undefined;
function placeHelper(snap?: boolean) {
  helperDef = HELPERS.find(h => h.id === F.helper);
  if (!helperDef) return;
  if (helperObj?.userData.kind !== F.helper) {
    if (helperObj) { stage.scene.remove(helperObj); stage.removeClickable(helperObj); }
    helperObj = M.helper(F.helper);
    helperObj.userData.kind = F.helper;
    helperObj.scale.setScalar(1.25);
    stage.scene.add(helperObj);
    stage.addClickable(helperObj, 'helper');
  }
  if (!helperShadow) { helperShadow = M.blobShadow(0.7); stage.scene.add(helperShadow); }
  if (snap) helperObj.position.copy(helperGoal);
  els.say.querySelector<HTMLImageElement>('.farm-say__face img')!.src = icons[`helper-${F.helper}`] || '';
  els.say.querySelector('.farm-say__face')!.setAttribute('aria-label', `${helperDef.name}: اضغط لتلميح`);
}

function moveHelperTo(p: Place) {
  const side = p.anchor.x > 0 ? -1 : 1;
  helperGoal.set(p.anchor.x + side * (p.radius + 0.4), 0, p.anchor.z + p.radius * 0.6);
}

function helperHop(big?: boolean) { helperHopT = big ? 1.4 : 0.7; }

function stepHelper(dt: number, t: number) {
  if (!helperObj) return;
  const pos = helperObj.position;
  const to = _v.copy(helperGoal).sub(pos).setY(0);
  const dist = to.length();
  const fly = helperObj.userData.fly;
  if (dist > 0.05) {
    const step = Math.min(dist, dt * (fly ? 7 : 6));
    pos.addScaledVector(to.normalize(), step);
    helperObj.rotation.y = Math.atan2(to.x, to.z);
  } else {
    // face the camera when standing still
    const camYaw = stage.rig.yaw;
    helperObj.rotation.y += (camYaw - helperObj.rotation.y) * Math.min(1, dt * 4);
  }
  const walking = dist > 0.1;
  helperHopT = Math.max(0, helperHopT - dt);
  const hop = helperHopT > 0 ? Math.abs(Math.sin(helperHopT * 9)) * 0.6 * helperHopT : 0;
  pos.y = (fly ? 1.0 + Math.sin(t * 3) * 0.18 : walking ? Math.abs(Math.sin(t * 12)) * 0.25 : 0) + hop;
  const parts = helperObj.userData.parts;
  if (parts.wings) parts.wings.forEach((w: THREE.Object3D) => { w.rotation.z = w.userData.side * Math.sin(t * 40) * 0.5; });
  if (parts.tail) parts.tail.rotation.z = Math.sin(t * (F.helper === 'puppy' ? 14 : 3)) * (F.helper === 'kitty' ? 0.35 : 0.5);
  if (parts.ears) parts.ears.forEach((e: THREE.Object3D) => { e.rotation.x = Math.sin(t * 2 + e.userData.side) * 0.12; });
  helperObj.userData.body.rotation.z = walking ? Math.sin(t * 12) * 0.08 : 0;
  if (helperShadow) { helperShadow.position.set(pos.x, 0.04, pos.z); helperShadow.scale.setScalar(fly ? 0.8 : 1); }
}

function sayHelper(html: string | undefined, mood: Mood = 'happy') {
  if (!html) return;
  stopSpeaking();
  const b = els.say.querySelector<HTMLElement>('.bubble')!;
  els.say.hidden = false;
  els.say.classList.remove('is-small');
  els.say.classList.toggle('is-oops', mood === 'oops');
  els.say.dataset.mood = mood;
  els.say.querySelector('.farm-say__name')!.textContent = helperDef ? helperDef.name : '';
  b.innerHTML = html;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  els.say.querySelector<HTMLElement>('.farm-say__voice')!.hidden = !canSpeak();
  if (helperDef) for (let i = 0; i < 4; i++) setTimeout(() => sfx.blip(helperDef!.pitch), i * 70);
}

function hint() {
  if (!helperDef) return;
  helperHop();
  const run = selected && runAt(selected);
  if (run) {
    const st = defOf(run).steps[run.step];
    sayHelper(st.hint, 'think');
    return;
  }
  const q = quest();
  sayHelper(q ? `مهمّتنا الآن: <b>${q.goal}</b>. اتبع السهم الذهبي! ✨` : 'أنهيت كل المهمات! ازرع ما تحبّ، ولبِّ طلبات السفينة. 🌾', 'think');
}

function greet() {
  if (!helperDef) return;
  const q = quest();
  sayHelper(q ? `أهلاً بعودتك! مهمّتنا: <b>${q.goal}</b>. ✨` : 'أهلاً بعودتك إلى مزرعتنا السعيدة! 🌾');
}

function chooseHelper() {
  openModal(`
    <h3>اختر مساعدك في المزرعة</h3>
    <p class="fm-sub">يرافقك في كل المهمات، ويدلّك حين تحتار.</p>
    <div class="fm-helpers">${HELPERS.map(h => `
      <button class="fm-helper ${F.helper === h.id ? 'is-on' : ''}" data-helper="${h.id}" ${TEST && h.id === 'kitty' ? 'data-ok' : ''}>
        <img src="${icons[`helper-${h.id}`] || ''}" alt="">
        <b>${h.name}</b><span>${h.kind}</span><small>${h.blurb}</small>
      </button>`).join('')}</div>`, root => {
    root.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLElement>('[data-helper]');
      if (!b) return;
      sfx.fanfare();
      const first = !F.helper;
      F.helper = b.dataset.helper!;
      persist();
      closeModal();
      placeHelper(true);
      stage.burst('spark', helperObj!.position.clone().setY(1), 30);
      helperHop(true);
      sayHelper(helperDef!.hello, 'cheer');
      if (first) setTimeout(() => { if (!selected) sayHelper(`مهمّتنا الأولى: <b>${quest()!.goal}</b>. اضغط على الحقل الذي فوقه السهم الذهبي! ✨`); }, TEST ? 0 : 4200);
    });
  }, { keep: !F.helper });
}

// ---------- Labels over things ----------

const labelEls: Record<string, HTMLElement> = {};
function drawLabels() {
  const want: [string, string][] = [];
  F.plots.forEach((s, i) => { if (s.run) want.push([`plot-${i}`, `<img src="${icons[(CROPS as Table<Crop>)[s.run.id]?.product] || ''}" alt="">`]); });
  if (F.tasks.pen) want.push(['pen', '🐄']);
  if (F.tasks.dairy) want.push(['dairy', '🧀']);
  if (F.tasks.hive) want.push(['hive', '🍯']);
  const ready = F.orders.some(o => canDeliver(o));
  if (ready) want.push(['board', '⛵✓']);
  const keep = new Set<string>();
  for (const [id, html] of want) {
    keep.add(id);
    let el = labelEls[id];
    if (!el) { el = labelEls[id] = document.createElement('span'); el.className = 'farm-tag'; els.labels.append(el); }
    if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
    const p = places[id];
    const s = stage.project(_v.set(p.anchor.x, (p.top || 1.6) + 0.4, p.anchor.z));
    el.hidden = !s.on;
    el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
  }
  for (const id of Object.keys(labelEls)) if (!keep.has(id)) { labelEls[id].remove(); delete labelEls[id]; }
}

function questPlace(): string | null | undefined {
  const q = quest();
  if (!q) return F.orders.some(canDeliver) ? 'board' : null;
  if (q.crop) {
    const i = F.plots.findIndex(s => s.run?.quest && s.run.id === q.crop);
    if (i >= 0) return `plot-${i}`;
    const free = F.plots.findIndex(s => !s.run);
    return free >= 0 ? `plot-${free}` : null;
  }
  if (q.task === 'cheese' && !F.tasks.dairy && (F.inv.milk || 0) < 2) return 'pen';
  return { cow: 'pen', cheese: 'dairy', bees: 'hive' }[q.task as 'cow' | 'cheese' | 'bees'];
}

// ---------- HUD, rewards, flying icons ----------

function updateHud() {
  els.coins.textContent = num(F.coins);
  const l = level(), a = LEVELS[l - 1] || 0, b = LEVELS[l] || a + 1;
  els.level.querySelector('b')!.textContent = num(l);
  els.level.querySelector<HTMLElement>('i span')!.style.width = `${Math.min(100, ((F.xp - a) / (b - a)) * 100)}%`;
  els.level.title = `مستوى المزرعة ${num(l)}`;
  const n = Object.values(F.inv).reduce((s, x) => s + x, 0);
  const inv = els.bar.querySelector('[data-bar="inv"] em');
  if (inv) inv.textContent = n ? num(n) : '';
  const ord = els.bar.querySelector('[data-bar="orders"] em');
  if (ord) ord.textContent = F.orders.some(canDeliver) ? '!' : '';
}

function setGoal(run?: Run) {
  const q = quest();
  let html;
  if (run) {
    const def = defOf(run);
    html = `<span>${run.kind === 'crop' ? `<img src="${icons[def.product] || ''}" alt="">` : '🔧'}</span><p><b>${def.name}</b> — الخطوة ${num(run.step + 1)} من ${num(def.steps.length)}${run.quest ? '' : ' • تدريب'}</p>`;
  } else if (q) {
    html = `<span>${q.icon}</span><p>مهمّة ${num(F.quest + 1)} من ${num(QUESTS.length)}: <b>${q.goal}</b></p>`;
  } else html = '<span>🌾</span><p><b>أنهيت كل المهمّات!</b> ازرع ولبِّ الطلبات وزيّن مزرعتك.</p>';
  if (els.goal.dataset.html !== html) { els.goal.innerHTML = html; els.goal.dataset.html = html; els.goal.classList.remove('is-new'); void els.goal.offsetWidth; els.goal.classList.add('is-new'); }
}

function gainXp(n: number, at?: THREE.Vector3) {
  const before = level();
  F.xp += n;
  if (at) floatText(`+${num(n)} ⭐`, at);
  updateHud();
  if (level() > before) {
    sfx.fanfare();
    F.coins += 20;
    updateHud();
    toast(`🎉 مستوى جديد للمزرعة: <b>${num(level())}</b>! هدية: 20 🪙`);
  }
}

function floatText(text: string, at: THREE.Vector3) {
  const s = stage.project(_v.set(at.x, 2.2, at.z));
  const el = document.createElement('span');
  el.className = 'farm-float';
  el.textContent = text;
  el.style.left = `${s.x}px`; el.style.top = `${s.y}px`;
  els.labels.append(el);
  setTimeout(() => el.remove(), 1300);
}

function flyProducts(id: string, n: number, at: THREE.Vector3) {
  const s = stage.project(_v.set(at.x, 1, at.z));
  const target = els.bar.querySelector('[data-bar="inv"]')!.getBoundingClientRect();
  const host = els.host.getBoundingClientRect();
  for (let i = 0; i < Math.min(n, 6); i++) {
    const img = document.createElement('img');
    img.className = 'farm-fly';
    img.src = icons[id] || '';
    img.alt = '';
    img.style.left = `${s.x + (i - 2) * 14}px`; img.style.top = `${s.y}px`;
    img.style.setProperty('--tx', `${target.left - host.left + target.width / 2 - s.x}px`);
    img.style.setProperty('--ty', `${target.top - host.top + target.height / 2 - s.y}px`);
    img.style.animationDelay = `${i * 0.09}s`;
    els.labels.append(img);
    setTimeout(() => sfx.star(i % 3), 500 + i * 90);
    img.addEventListener('animationend', () => { img.remove(); const b = els.bar.querySelector<HTMLElement>('[data-bar="inv"]')!; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
  }
  els.bar.hidden = false;
}

let toastTimer: number | undefined, laterToast: string | null = null;
function toast(html: string) {
  if (!els.modal.hidden || !els.pick.hidden) { laterToast = html; return; }   // after the card closes
  let t = els.screen.querySelector<HTMLElement>('.farm-toast');
  if (!t) { t = document.createElement('div'); t.className = 'farm-toast'; els.screen.append(t); }
  t.innerHTML = html;
  t.hidden = false;
  t.classList.remove('is-in'); void t.offsetWidth; t.classList.add('is-in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t!.hidden = true; }, 3600);
}

// ---------- Modals ----------

function openModal(html: string, wire?: (root: HTMLElement) => void, { keep = false }: { keep?: boolean } = {}) {
  els.modal.innerHTML = `<div class="fm-card-wrap" role="dialog" aria-modal="true">${keep ? '' : '<button class="fm-x" data-close aria-label="إغلاق">✕</button>'}${html}</div>`;
  els.modal.hidden = false;
  stage?.setEnabled(false);
  els.modal.onclick = e => { if ((!keep && e.target === els.modal) || (e.target as Element).closest('[data-close]')) { sfx.tap(); closeModal(); } };
  wire?.(els.modal);
  els.modal.querySelector('button')?.focus({ preventScroll: true });
}
function closeModal() {
  if (!els?.modal) return;
  els.modal.hidden = true;
  els.modal.innerHTML = '';
  stage?.setEnabled(true);
  if (laterToast) { const t = laterToast; laterToast = null; setTimeout(() => toast(t), 300); }
  if (selected && (places[selected].kind === 'barn' || places[selected].kind === 'board')) deselect();
}

async function questComplete(q: FarmQuest, def: FarmDef, res: ReturnType<typeof recordResult>) {
  const stars = res?.stars ?? 0;
  sfx.win();
  for (let i = 0; i < stars; i++) setTimeout(() => sfx.star(i), 600 + i * 260);
  const next = quest();
  await new Promise(resolve => {
    openModal(`
      <div class="fm-done">
        <div class="fm-done__rays" aria-hidden="true"></div>
        <p class="fm-kicker">مهمّة مكتملة!</p>
        <h3>${q.icon} ${q.title}</h3>
        <div class="fm-stars">${[0, 1, 2].map(i => `<span class="${i < stars ? 'is-on' : ''}" style="--i:${i}">★</span>`).join('')}</div>
        <div class="fm-learned"><b>📖 تعلّمنا من كتاب «${def.book}»:</b><ul>${def.learned.map(l => `<li>${l}</li>`).join('')}</ul></div>
        <p class="fm-chips"><span>+30 🪙</span><span>+40 ⭐</span>${res?.pearls ? `<span>+${num(res.pearls)} 🦪</span>` : ''}</p>
        ${next ? `<p class="fm-next">المهمّة التالية: <b>${next.icon} ${next.title}</b></p>` : '<p class="fm-next"><b>🎉 أنهيت كل مهمّات المزرعة!</b></p>'}
        <button class="btn btn--gold" data-close>تابِع</button>
      </div>`, root => { root.querySelector('[data-close]')!.addEventListener('click', () => setTimeout(resolve, 0)); }, { keep: true });
  });
  awardSticker('farm');
  if (next) { setGoal(); sayHelper(`المهمّة التالية: <b>${next.goal}</b>. اتبع السهم الذهبي! ✨`, 'cheer'); }
  else sayHelper('أنت مزارع ماهر! ازرع ما تحبّ، ولبِّ طلبات السفينة، وزيّن مزرعتك. 🌾', 'cheer');
}

function openQuests() {
  const topics = save.get().topics;
  const due = save.get().review || {};
  openModal(`
    <h3>📜 مهمّات المزرعة</h3>
    <ul class="fm-quests">${QUESTS.map((q, i) => {
      const done = i < F.quest, now = i === F.quest, open = now || (STAGING && !done);
      const st = topics[q.topic]?.stars || 0;
      const review = done && due[q.topic]?.due <= Date.now();
      return `<li class="fm-q ${done ? 'is-done' : now ? 'is-now' : open ? '' : 'is-locked'}">
        <span class="fm-q__icon">${done || open ? q.icon : '🔒'}</span>
        <span class="fm-q__text"><b>${q.title}</b><small>${done ? `${'★'.repeat(st)}${'☆'.repeat(3 - st)} • كتاب «${((CROPS as Table<Crop>)[q.crop as string] || (TASKS as Table<Task>)[q.task as string]).book}»` : open ? q.goal : 'تُفتح بعد المهمّة السابقة'}</small></span>
        ${done ? `<button class="btn btn--ghost fm-q__btn" data-review="${q.topic}">${review ? '🔁 حان وقت المراجعة' : '🔁 راجع'}</button>` : ''}
      </li>`;
    }).join('')}</ul>
    <div class="fm-row"><button class="btn btn--ghost" data-change-helper>🔄 غيّر المساعد</button><button class="btn btn--gold" data-close>حسناً</button></div>`, root => {
    root.addEventListener('click', e => {
      const r = (e.target as Element).closest<HTMLElement>('[data-review]');
      if (r) { sfx.tap(); closeModal(); stage.stop(); hooks.startLesson(r.dataset.review!); return; }
      if ((e.target as Element).closest('[data-change-helper]')) { sfx.tap(); closeModal(); chooseHelper(); }
    });
  });
}

function openInventory() {
  const items = Object.keys(PRODUCTS).filter(k => F.inv[k]);
  openModal(`
    <h3>🧺 المخزن</h3>
    ${items.length ? `<div class="fm-grid">${items.map(k => `<div class="fm-card fm-card--stock"><img src="${icons[k] || ''}" alt=""><b>${(PRODUCTS as Table<Product>)[k].name}</b><span>× ${num(F.inv[k])}</span></div>`).join('')}</div>`
    : '<p class="fm-sub">المخزن فارغ. احصد المحاصيل لتملأه!</p>'}
    <p class="fm-sub">نبيع منتجاتنا لأهل الجزيرة: انظر في <b>لوحة الطلبات</b> قرب الميناء.</p>
    <button class="btn btn--gold" data-close>حسناً</button>`);
}

// ---------- Orders (sold by ship) ----------

// What the farm knows how to make: the products of finished quests.
const available = () => new Set(QUESTS.slice(0, F.quest).map(q => ((CROPS as Table<Crop>)[q.crop as string] || (TASKS as Table<Task>)[q.task as string]).product));
function ensureOrders() {
  const made = available();
  let guard = 0;
  while (F.orders.length < 3 && guard++ < ORDERS.length * 2) {
    const o = (ORDERS as unknown as Order[])[F.orderSeq % ORDERS.length];
    F.orderSeq += 1;
    if (!Object.keys(o.want).every(k => made.has(k))) continue;
    if (F.orders.some(x => x.who === o.who)) continue;
    const coins = Object.entries(o.want).reduce((s, [k, n]) => s + (PRODUCTS as Table<Product>)[k].price * n, 0);
    F.orders.push({ ...o, coins, xp: Math.round(coins / 2) });
  }
  persist();
}
const canDeliver = (o: Order) => Object.entries(o.want).every(([k, n]) => (F.inv[k] || 0) >= n);

function openOrders() {
  ensureOrders();
  openModal(`
    <h3>⛵ طلبات سوق السبت</h3>
    <p class="fm-sub">السفينة تحمل منتجاتنا إلى ميناء أرواد. لكل طلب سعر وربح!</p>
    ${F.orders.length ? `<div class="fm-orders">${F.orders.map((o, i) => `
      <div class="fm-order ${canDeliver(o) ? 'is-ready' : ''}">
        <p class="fm-order__who"><span>${o.icon}</span> ${o.who}</p>
        <p class="fm-order__want">${Object.entries(o.want).map(([k, n]) => `<span class="${(F.inv[k] || 0) >= n ? 'is-have' : ''}"><img src="${icons[k] || ''}" alt="${(PRODUCTS as Table<Product>)[k].name}"> ${num(Math.min(F.inv[k] || 0, n))}/${num(n)}</span>`).join('')}</p>
        <p class="fm-order__pay">🪙 ${num(o.coins)} &nbsp; ⭐ ${num(o.xp)}</p>
        <button class="btn ${canDeliver(o) ? 'btn--gold' : 'btn--ghost'}" data-deliver="${i}" ${canDeliver(o) ? '' : 'disabled'}>سلِّم ⛵</button>
      </div>`).join('')}</div>` : '<p class="fm-sub">لا طلبات بعد. أنهِ مهمّة البطاطا أولاً، فيأتي أول زبون! 🥔</p>'}
    <button class="btn btn--ghost" data-close>إغلاق</button>`, root => {
    root.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLButtonElement>('[data-deliver]');
      if (!b || b.disabled) return;
      deliver(+b.dataset.deliver!);
    });
  });
}

function deliver(i: number) {
  const o = F.orders[i];
  if (!o || !canDeliver(o)) return;
  for (const [k, n] of Object.entries(o.want)) F.inv[k] -= n;
  F.coins += o.coins;
  F.orders.splice(i, 1);
  persist();
  sfx.win();
  closeModal();
  gainXp(o.xp, places.board.anchor);
  floatText(`+${num(o.coins)} 🪙`, places.board.anchor);
  sailAway();
  ensureOrders();
  updateHud();
  sayHelper(`أبحرت السفينة بطلب <b>${o.who}</b>! ربحنا ${num(o.coins)} 🪙. في الدرس الأول من الكتاب: نختار المنتج، ونحسب التكاليف والربح. 🧮`, 'cheer');
}

function sailAway() {
  if (!dhowObj) return;
  const home = dhowObj.userData.home, t0 = performance.now(), dur = TEST ? 60 : 5200;
  dhowObj.userData.sailing = true;
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / dur);
    const out = Math.sin(k * Math.PI);           // out and back
    dhowObj.position.set(home.x + out * 34, home.y, home.z + out * 22);
    dhowObj.rotation.y = Math.PI / 2 + 0.1 + (k > 0.5 ? Math.PI : 0) - 0.6;
    if (k < 1) requestAnimationFrame(tick);
    else { dhowObj.position.copy(home); dhowObj.rotation.y = Math.PI / 2 + 0.1; dhowObj.userData.sailing = false; }
  };
  requestAnimationFrame(tick);
}

// ---------- Decorations ----------

function openDecor() {
  openModal(`
    <h3>🌹 زيّن مزرعتك</h3>
    <p class="fm-sub">معك <b>${num(F.coins)} 🪙</b>. اكسب القطع الذهبية من طلبات السفينة.</p>
    <div class="fm-decor">${DECOR.map(d => {
      const have = F.decor.includes(d.id);
      return `<div class="fm-dec ${have ? 'is-have' : ''}"><span class="fm-dec__icon">${d.icon}</span><b>${d.name}</b>
        ${have ? `<small>${d.fact}</small>` : `<button class="btn ${F.coins >= d.cost ? 'btn--gold' : 'btn--ghost'}" data-buy="${d.id}" ${F.coins >= d.cost ? '' : 'disabled'}>🪙 ${num(d.cost)}</button>`}</div>`;
    }).join('')}</div>
    <button class="btn btn--ghost" data-close>إغلاق</button>`, root => {
    root.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLButtonElement>('[data-buy]');
      if (!b || b.disabled) return;
      const d = DECOR.find(x => x.id === b.dataset.buy)!;
      if (F.coins < d.cost) return;
      F.coins -= d.cost;
      F.decor.push(d.id);
      persist();
      sfx.fanfare();
      closeModal();
      const o = decorObjs[d.id];
      o.visible = true;
      const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
      stage.focus(c);
      stage.burst('spark', c.setY(1), 36);
      updateHud();
      sayHelper(`${d.icon} ${d.fact}`, 'cheer');
    });
  });
}

// ---------- Test hooks ----------

export function debug(): FarmDebug {
  return { F: JSON.parse(JSON.stringify(F || {})), selected, busy, quest: quest()?.id, place: questPlace() };
}
