// The sea map in 3D, a preview on the staging copy (core/map.ts decides when
// to show it). The same islands, routes, fog and ship as the flat map, drawn
// with three.js and made in code (./models.js). The islands' names stay HTML
// labels on top (map.ts), so they stay crisp and screen readers find them.
//
// Light enough for budget phones: merged meshes, no shadows in lite mode,
// and the loop sleeps whenever the map is not on screen.

import * as THREE from '../../vendor/three/three.module.min.js';
import { wind, dhow } from '../farm/models.js';
import { newRenderer } from '../farm/scene.js';
import * as M from './models.js';
import { mapTopInset } from '../map.js';
import type { MapWorld } from '../map.js';

/** An island's rectangle on screen (CSS px in the map), for its label. */
export interface Rect { x: number; y: number; w: number; h: number }

/** What the map shows (map.ts render3D). */
export interface SeaState {
  /** body[data-time]: 'day', 'sunset' or 'night'. */
  time: string;
  /** Each island: open, and under fog (truthy). */
  regions: { id: string; open: boolean; fog: boolean | null }[];
  /** The island Hudhud suggests next (the golden ring). */
  next?: string | null;
  /** Where the ship is moored: 'home' or an island's id. */
  at: string;
  hero: string;
  /** Changes when the hero's outfit changes (art/art.js styleKey). */
  styleKey: string;
  style?: SailStyle;
}

/** The ship's sail ('stripes' or a colour) and flag colour from the pearl shop. */
export interface SailStyle { sail?: string | null; flag?: string | null }

/** Test hook (window.__sea in tests). */
export interface SeaDebug { yaw: number; dist: number; ship: number[]; at: string; fog: string[]; next: string | null; calls: number }

/** The 3D sea, as map.ts uses it. */
export interface Sea {
  canvas: HTMLCanvasElement;
  /** Put the canvas in `host` (once) and start the loop. */
  mount(host: HTMLElement): void;
  start(): void;
  stop(): void;
  update(state: SeaState): void;
  /** Sail the ship from one island to another; resolves when moored. */
  sail(fromId: string, toId: string): Promise<void>;
  /** The clouds part over an island; resolves when they are gone. */
  reveal(id: string): Promise<void>;
  rects(): Record<string, Rect>;
  /** Called with each island's rectangle whenever the view moves. */
  onLayout(f: (rects: Record<string, Rect>) => void): void;
  relayout(): void;
  readonly sailing: boolean;
  look(id: string, dist: number, dpitch?: number, dyaw?: number): void;
  debug(): SeaDebug;
}

/** A time of day's colours and light. */
interface Look {
  sky: string; deep: string; shallow: string;
  /** Sky colour, ground colour, intensity. */
  hemi: [string, string, number];
  /** Colour, intensity. */
  sun: [string, number];
  sunDir: [number, number, number];
  night: number;
}

type BasicMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

/** An island's moving parts (./models.js parts()). */
interface Parts {
  flags: THREE.Object3D[];
  spin: { obj: THREE.Object3D; axis: 'x' | 'y' | 'z'; speed: number }[];
  /** Pivots, each holding a beam mesh. */
  beams: THREE.Object3D[];
  smoke: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>[];
  bob: THREE.Object3D[];
  glow: THREE.Sprite[];
  lights: THREE.Mesh[];
  /** The letters island: the letters' height, circle and characters. */
  letters?: { y: number; r: number; chars: string[] };
}

/** An island as ./models.js builds it, and what the sea keeps on it. */
interface Isle {
  group: THREE.Group;
  landmark: THREE.Group;
  parts: Parts;
  seed: number;
  /** The letters island's floating letters. */
  letters?: THREE.Sprite[];
  /** The clouds over it, while it is under fog. */
  fog?: THREE.Group | null;
  /** 1 or -1: mirrored so the ship moors on the open-sea side (fit()). */
  side: number;
  /** Where the ship moors. */
  berth: THREE.Vector3;
  /** Time into the little "pop" after the fog lifts. */
  pop?: number;
}

/** The ship on its way: the curve, when it set off, how long it takes. */
interface Voyage { curve: THREE.QuadraticBezierCurve3; t0: number; dur: number; resolve: () => void; to: string }
interface ShipState { heading: number; sailing: Voyage | null; at: string; speed: number; facing: number }
interface Spark { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number; life: number; s: number; grav: number; color: string }
interface BurstOptions { n?: number; colors?: string[]; up?: number; spread?: number; size?: number; grav?: number; life?: number }
interface Cam { yaw: number; pitch: number; dist: number; target: THREE.Vector3; dyaw: number; dpitch: number; hold?: boolean }
interface Drag { x: number; y: number; yaw: number; pitch: number; id: number }
interface Reveal { id: string; t0: number; swapped: boolean; resolve: () => void }

// Map positions (worlds/grade6.js, in % of the map) → world units: y% runs
// up the voyage (SZ), x% across it, spread to suit the screen (arrange()).
const SZ = 0.75;
const BIG = 1.25;           // islands are drawn this much bigger than their models
const RR = M.R * BIG;       // an island's radius on the map
const MAX_ISLES = 12;
const MAX_DOTS = 700;
const TOP = 5 * BIG;   // height of the tallest landmark, for framing

// Day, sunset and night follow the device clock (body[data-time], app.js).
const LOOKS: Record<string, Look> = {
  day: { sky: '#a6dcef', deep: '#2794c6', shallow: '#6fe0e6', hemi: ['#e4f6ff', '#8a7a5a', 1.55], sun: ['#fff4e0', 2.5], sunDir: [-0.55, 0.75, 0.4], night: 0 },
  sunset: { sky: '#f6c6a4', deep: '#2f7aaa', shallow: '#74cfd2', hemi: ['#ffe8d6', '#5a6a8a', 1.45], sun: ['#ffc896', 2.2], sunDir: [-0.85, 0.4, -0.15], night: 0.3 },
  night: { sky: '#16223f', deep: '#0e2b52', shallow: '#256f8a', hemi: ['#7c8fd6', '#2a2a4a', 1.7], sun: ['#b9cbff', 1.3], sunDir: [0.4, 0.8, -0.4], night: 1 },
};

export function createSea(world: MapWorld, { lite = false }: { lite?: boolean } = {}): Sea {
  const { renderer, light } = newRenderer(lite, { preserveDrawingBuffer: !!window.__SINDBAD_TEST__ });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, light ? 1 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !light;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'sea-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(LOOKS.day.sky);
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 700);

  // ---------- Where everything is ----------
  const ids = ['home', ...world.regions.map(r => r.id)];
  const kindOf: Record<string, string> = { home: world.home.art };
  world.regions.forEach(r => { kindOf[r.id] = r.art; });
  const mapPos: Record<string, number[]> = { home: world.home.pos };
  world.regions.forEach(r => { mapPos[r.id] = r.pos; });
  const P: Record<string, THREE.Vector3> = {};
  ids.forEach(id => { P[id] = new THREE.Vector3(); });
  const center = new THREE.Vector3(), size = new THREE.Vector3();
  const spanX = Math.max(1, ...ids.map(id => mapPos[id][0])) - Math.min(...ids.map(id => mapPos[id][0]));
  const spanZ = (Math.max(...ids.map(id => mapPos[id][1])) - Math.min(...ids.map(id => mapPos[id][1]))) * SZ;

  // ---------- Light ----------
  const hemi = new THREE.HemisphereLight('#dff4ff', '#7a6a4a', 1.5);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
  sun.castShadow = !lite;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { near: 1, far: 220 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  scene.add(hemi, sun, sun.target);

  // ---------- The sea ----------
  const isleU = Array.from({ length: MAX_ISLES }, () => new THREE.Vector4(0, 0, 0, 0));
  const seaU = {
    uTime: wind, uIsles: { value: isleU }, uR: { value: M.R }, uK: { value: BIG }, uYaw: { value: new THREE.Vector2(1, 0) },
    uDeep: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() }, uFar: { value: new THREE.Color() },
    uCenter: { value: new THREE.Vector2() }, uNight: { value: 0 },
  };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShaderMaterial({
    uniforms: seaU,
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      #define MAX ${MAX_ISLES}
      uniform float uTime; uniform vec4 uIsles[MAX]; uniform float uR; uniform float uK; uniform vec2 uYaw;
      uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFar; uniform vec2 uCenter; uniform float uNight;
      varying vec3 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      // Same outline as models.js bumps(): keep in step.
      float bumps(float t, float s) { return 1.0 + 0.09 * sin(3.0 * t + s) + 0.054 * sin(5.0 * t + s * 2.3) + 0.027 * sin(2.0 * t + s * 3.7); }
      float isleDist(vec2 p) {
        float d = 1e4;
        for (int i = 0; i < MAX; i++) {
          vec4 s = uIsles[i];
          if (s.w == 0.0) continue;
          vec2 q = p - s.xy;
          // into the island's own frame: undo the turn, then the mirror
          vec2 l = vec2(q.x * uYaw.x - q.y * uYaw.y, q.x * uYaw.y + q.y * uYaw.x);
          l.x *= s.w;
          float t = atan(-l.y, l.x);
          d = min(d, length(q) - uK * ((uR - 0.5) * bumps(t, s.z) + 0.5));
        }
        return d;
      }
      void main() {
        vec2 p = vWorld.xz;
        float t = uTime;
        float d = isleDist(p);
        float wob = sin(p.x * 0.5 + t * 0.9) * 0.25 + sin(p.y * 0.43 - t * 0.7) * 0.25;
        float dd = d + wob;
        // deep water with slow light and dark patches
        float n = noise(p * 0.05 + vec2(t * 0.01, -t * 0.008));
        vec3 deep = uDeep * (0.92 + 0.16 * n);
        vec3 col = mix(uShallow, deep, smoothstep(0.2, 6.5, dd));
        // foam at the beach and lines rolling in
        float foam = 1.0 - smoothstep(0.0, 0.55, dd);
        foam += (1.0 - smoothstep(0.0, 0.22, abs(fract(dd * 0.33 - t * 0.2) - 0.5) * 2.0 - 0.6)) * (1.0 - smoothstep(0.6, 4.0, dd)) * 0.5;
        col = mix(col, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.85);
        // little wave marks, like the flat map's, upright on screen
        vec2 cp = vec2(p.x * uYaw.x - p.y * uYaw.y, p.x * uYaw.y + p.y * uYaw.x);
        vec2 q = cp * 0.2 + vec2(t * 0.03, t * 0.018);
        vec2 cell = floor(q);
        vec2 f = fract(q) - 0.5 + (vec2(hash(cell + 1.7), hash(cell + 4.1)) - 0.5) * 0.4;
        vec2 c = f - vec2(0.0, 0.08);
        float arc = abs(length(c) - 0.17);
        float mark = (1.0 - smoothstep(0.012, 0.03, arc)) * step(c.y, -0.06) * step(0.45, hash(cell));
        col = mix(col, vec3(1.0), mark * 0.32 * smoothstep(2.5, 6.0, dd));
        // glints
        vec2 gc = floor(p * 0.8), gf = fract(p * 0.8) - 0.5;
        float g = step(0.972, hash(gc)) * (1.0 - smoothstep(0.04, 0.14, length(gf))) * (0.5 + 0.5 * sin(t * 3.0 + hash(gc + 3.1) * 6.28));
        col += g * mix(0.6, 0.35, uNight) * smoothstep(1.0, 3.0, dd);
        // fade into the haze at the horizon
        col = mix(col, uFar, smoothstep(70.0, 190.0, length(p - uCenter)));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);

  // ---------- Islands ----------
  const isles: Record<string, Isle> = {};
  ids.forEach((id, i) => {
    const seed = 1.7 + i * 2.31;
    const built = M.buildIsland(kindOf[id], seed) as unknown as Isle;
    built.seed = seed;
    built.group.traverse(o => { if ((o as THREE.Mesh).isMesh) o.userData.mat = (o as THREE.Mesh).material; });
    // floating letters for the letters island
    if (built.parts.letters) {
      built.letters = built.parts.letters.chars.map(ch => { const s = M.letterSprite(ch); built.landmark.add(s); return s; });
    }
    scene.add(built.group);
    isles[id] = built;
    isleU[i].set(0, 0, seed, 1);
  });

  // ---------- Routes: dotted lines on the water ----------
  let routes: { id: string; pts: THREE.Vector3[] }[] = [];
  function buildRoutes() {
    routes = [];
    let prev = 'home';
    for (const r of world.regions) {
      const a = P[r.from || prev], b = P[r.id];
      if (!r.from) prev = r.id;
      const mid = new THREE.Vector3((a.x + b.x) / 2 + (b.z - a.z) * 0.18, 0, (a.z + b.z) / 2 - (b.x - a.x) * 0.18);
      const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
      const pts = curve.getSpacedPoints(Math.ceil(curve.getLength() / 1.15))
        .filter(pt => ids.every(id => pt.distanceTo(P[id]) > RR + 0.7));
      routes.push({ id: r.id, pts });
    }
  }
  const dots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' }), MAX_DOTS);
  dots.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_DOTS * 3), 3);
  dots.count = 0;
  scene.add(dots);
  const dotOpen: (THREE.Vector3 | null)[] = [];

  // ---------- The ship, the hero and Hudhud ----------
  const ship = new THREE.Group();
  const boat = dhow();
  boat.scale.setScalar(0.78);
  ship.add(boat);
  const lanternMat = new THREE.MeshBasicMaterial({ color: '#ffe08a', toneMapped: false });
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lanternMat);
  lantern.position.set(-1.95, 1.3, 0);
  ship.add(lantern);
  const lanternGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.glowTexture(), color: '#ffcf6a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  lanternGlow.scale.set(2.2, 2.2, 1);
  lanternGlow.position.copy(lantern.position);
  ship.add(lanternGlow);
  ship.rotation.y = Math.PI;
  scene.add(ship);
  let crew: THREE.Sprite[] = [], crewKey = '', sailKey = '';
  const shipState: ShipState = { heading: Math.PI, sailing: null, at: 'home', speed: 0, facing: Math.PI };

  function setCrew(hero: string, key: string) {
    if (crewKey === `${hero}|${key}`) return;
    crewKey = `${hero}|${key}`;
    crew.forEach(s => { s.material.map!.dispose(); s.material.dispose(); ship.remove(s); });
    const h = M.artSprite(hero, 1.9);
    h.position.set(-0.45, 0.84, 0.2);
    const bird = M.artSprite('hudhud', 0.85);
    bird.position.set(2.0, 0.98, 0);
    crew = [h, bird];
    ship.add(h, bird);
  }
  function setSail({ sail, flag }: SailStyle) {
    if (sailKey === `${sail}|${flag}`) return;
    sailKey = `${sail}|${flag}`;
    const s: THREE.MeshLambertMaterial = boat.userData.sail.material;
    if (sail === 'stripes') {
      if (!s.map) {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d')!;
        g.fillStyle = '#fbf1dc'; g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#c7373f';
        for (let i = -64; i < 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 80, 64); g.lineTo(i + 64, 64); g.fill(); }
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(0.6, 0.6);
        s.map = tex;
      }
      s.color.set('#ffffff');
    } else {
      if (s.map) { s.map.dispose(); s.map = null; }
      s.color.set(sail || '#fbf1dc');
    }
    s.needsUpdate = true;
    boat.userData.flag.material.color.set(flag || '#d0507e');
  }

  // Wake: foam rings left behind while sailing.
  const WAKE = lite ? 24 : 48;
  const wake = new THREE.InstancedMesh(new THREE.RingGeometry(0.55, 0.8, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }), WAKE);
  wake.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(WAKE * 3), 3);
  wake.frustumCulled = false;
  wake.count = 0;
  scene.add(wake);
  const wakes: { x: number; z: number; t: number }[] = [];
  let wakeTimer = 0;

  // ---------- Beacon: a golden ring round the island to try next ----------
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RR + 0.8, 0.12, 6, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, depthWrite: false }));
  ring.position.y = 0.08;
  ring.visible = false;
  scene.add(ring);

  // ---------- Fog: clouds over the islands still to discover ----------
  // Islands under fog show as a misty silhouette, like on the flat map.
  const SIL = new THREE.MeshLambertMaterial({ color: '#6f8ea2', emissive: '#4f6d80', emissiveIntensity: 0.7 });
  const CLOUDS = [[-2.4, 0.9, 1.3, 1.0], [2.3, 0.8, 1.0, 1.05], [0.1, 1.0, 2.6, 0.95], [-1.8, 1.3, -1.7, 0.95], [2.0, 1.2, -1.6, 0.9], [0.5, 2.6, 0.6, 0.7]];
  function setFog(id: string, on: boolean | null) {
    on = !!on;
    const it = isles[id];
    if (!!it.fog === on) return;
    if (on) {
      it.fog = new THREE.Group();
      CLOUDS.forEach(([x, y, z, s], i) => { const c = M.cloud(i + it.seed * 3, s); c.position.set(x, y, z); c.userData.home = c.position.clone(); it.fog!.add(c); });
      it.fog.position.copy(P[id]);
      it.fog.rotation.y = cam.yaw;
      it.fog.scale.setScalar(BIG);
      scene.add(it.fog);
    } else {
      scene.remove(it.fog!);
      it.fog!.traverse(o => (o as THREE.Mesh).geometry?.dispose());
      it.fog = null;
    }
    it.group.traverse(o => { if ((o as THREE.Mesh).isMesh && o.userData.mat) (o as THREE.Mesh).material = on ? SIL : o.userData.mat; });
    const bits = [...it.parts.beams, ...it.parts.smoke, ...it.parts.glow, ...(it.letters || [])];
    bits.forEach(b => { b.visible = !on; });
  }

  // ---------- Whale and gulls ----------
  const whale = M.whale();
  scene.add(whale);
  const whaleAt = new THREE.Vector3();
  const gulls = [0, 1, 2].map(i => { const gl = M.gull(); gl.userData.phase = i * 2.1; gl.userData.r = 9 + i * 3.5; scene.add(gl); return gl; });

  // ---------- Particles: sparkles and splashes ----------
  const PMAX = lite ? 80 : 160;
  const pMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ toneMapped: false }), PMAX);
  pMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PMAX * 3), 3);
  pMesh.frustumCulled = false;
  pMesh.count = 0;
  scene.add(pMesh);
  const sparks: Spark[] = [];
  const _c = new THREE.Color(), _d = new THREE.Object3D();
  function burst(at: THREE.Vector3, { n = 24, colors = ['#fff3a0', '#ffd23f', '#ffffff'], up = 5, spread = 4, size = 0.14, grav = 5, life = 1.3 }: BurstOptions = {}) {
    for (let i = 0; i < n; i++) {
      if (sparks.length >= PMAX) sparks.shift();
      sparks.push({ x: at.x + (Math.random() - 0.5) * 1.5, y: at.y, z: at.z + (Math.random() - 0.5) * 1.5, vx: (Math.random() - 0.5) * spread, vy: up * (0.5 + Math.random()), vz: (Math.random() - 0.5) * spread, t: 0, life: life * (0.6 + Math.random() * 0.6), s: size * (0.6 + Math.random() * 0.8), grav, color: colors[i % colors.length] });
    }
  }

  // ---------- Camera ----------
  const cam: Cam = { yaw: 0, pitch: 1, dist: 80, target: new THREE.Vector3(), dyaw: 0, dpitch: 0 };
  const right = new THREE.Vector3(), toward = new THREE.Vector3();
  let W = 1, H = 1, moved = true;
  function place(dist = cam.dist) {
    const yaw = cam.yaw + cam.dyaw, pitch = cam.pitch + cam.dpitch;
    camera.position.set(
      cam.target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      cam.target.y + Math.sin(pitch) * dist,
      cam.target.z + Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    camera.lookAt(cam.target);
    camera.updateMatrixWorld();
  }
  const _p = new THREE.Vector3();
  function project(v: THREE.Vector3) {
    _p.copy(v).project(camera);
    return { x: (_p.x + 1) / 2 * W, y: (1 - _p.y) / 2 * H, z: _p.z };
  }
  // Points that must fit on screen: each island's edge and its landmark's top.
  function framePoints() {
    const out: THREE.Vector3[] = [];
    for (const id of ids) {
      const c = P[id];
      out.push(c.clone().addScaledVector(right, RR), c.clone().addScaledVector(right, -RR), c.clone().addScaledVector(toward, RR), c.clone().addScaledVector(toward, -RR), c.clone().setY(TOP));
    }
    return out;
  }
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function groundAt(x: number, y: number) {
    ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  }

  // Frame the whole voyage. Portrait screens look up the map from the home
  // port; wide screens turn it so the voyage runs right → left (RTL).
  // Place the islands for this screen: spread across so the voyage fills it,
  // as the flat map does (it stretches x% and y% to the screen).
  let spread = 0, lastState: SeaState | null = null;
  function arrange(sx: number) {
    sx = Math.round(sx * 100) / 100;
    if (sx === spread) return;
    spread = sx;
    const box = new THREE.Box3();
    ids.forEach((id, i) => {
      const [x, y] = mapPos[id];
      P[id].set((x - 50) * sx, 0, (y - 50) * SZ);
      box.expandByPoint(P[id]);
      isles[id].group.position.copy(P[id]);
      isles[id].fog?.position.copy(P[id]);
      isleU[i].x = P[id].x; isleU[i].y = P[id].z;
    });
    box.getCenter(center); box.getSize(size);
    seaU.uCenter.value.set(center.x, center.z);
    const half = Math.hypot(size.x, size.z) / 2 + RR + 3;
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half });
    sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.copy(center);
    sun.position.copy(center).addScaledVector(sunDir, 90);
    whaleAt.set((24 - 50) * sx, 0, (55 - 50) * SZ);
    buildRoutes();
    if (lastState) paintRoutes(lastState);
    if (beaconId) ring.position.set(P[beaconId].x, 0.08, P[beaconId].z);
  }

  function fit() {
    const portrait = H >= W * 0.9;
    cam.yaw = portrait ? -0.14 : -Math.PI / 2 + 0.12;
    cam.pitch = portrait ? 0.98 : 0.86;
    camera.fov = portrait ? 40 : 34;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    // How wide to spread the islands: match the screen's shape (a little
    // narrower, to leave room for the labels at the sides).
    const aspect = (W - 28) / (H * 0.8), lift = Math.sin(cam.pitch), across = 2 * RR;
    const sx = portrait ? (aspect * (spanZ + across) * lift * 0.85 - across) / spanX
      : ((spanZ + across) / (aspect * lift) * 0.9 - across) / spanX;
    arrange(THREE.MathUtils.clamp(sx, 0.4, 1.1));
    right.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    toward.set(Math.sin(cam.yaw), 0, Math.cos(cam.yaw));
    seaU.uYaw.value.set(Math.cos(cam.yaw), Math.sin(cam.yaw));
    // Each island turns to face the camera, and moors the ship on its open-sea side.
    ids.forEach((id, i) => {
      const it = isles[id];
      it.side = P[id].clone().sub(center).dot(right) > 0 ? -1 : 1;
      it.group.rotation.y = cam.yaw;
      it.group.scale.set(it.side * BIG, BIG, BIG);
      it.berth = P[id].clone().addScaledVector(right, it.side * (RR + 2.3)).addScaledVector(toward, 0.9);
      isleU[i].w = it.side;
      if (it.fog) it.fog.rotation.y = cam.yaw;
    });
    // The top bar floats over the sea: keep the islands below its buttons.
    const host = canvas.parentElement, inset = host ? mapTopInset(host) : 0;
    const safe = { l: 14, r: W - 14, t: Math.max(Math.min(70, H * 0.12), inset + 8), b: H - Math.min(56, H * 0.1) };
    const pts = framePoints();
    const bounds = () => {
      const b = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity, ok: true };
      for (const v of pts) { const s = project(v); if (s.z > 1) b.ok = false; b.l = Math.min(b.l, s.x); b.r = Math.max(b.r, s.x); b.t = Math.min(b.t, s.y); b.b = Math.max(b.b, s.y); }
      return b;
    };
    cam.target.copy(center);
    for (let it = 0; it < 4; it++) {
      let lo = 8, hi = 500;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        place(mid);
        const b = bounds();
        if (b.ok && b.l >= safe.l && b.r <= safe.r && b.t >= safe.t && b.b <= safe.b) hi = mid; else lo = mid;
      }
      cam.dist = hi;
      place();
      const b = bounds();
      const from = groundAt((b.l + b.r) / 2, (b.t + b.b) / 2), to = groundAt((safe.l + safe.r) / 2, (safe.t + safe.b) / 2);
      if (!from || !to) break;
      cam.target.add(from.sub(to));
      cam.target.y = 0;
    }
    place();
    if (!shipState.sailing) moor(shipState.at);
    moved = true;
  }

  function resize() {
    const host = canvas.parentElement;
    if (!host) return;
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width; H = r.height;
    renderer.setSize(W, H, false);
    fit();
  }
  const ro = new ResizeObserver(() => resize());

  // Drag to tilt the view a little; it eases back when you let go.
  let drag: Drag | null = null;
  canvas.addEventListener('pointerdown', e => {
    if (document.body.classList.contains('calm')) return;
    drag = { x: e.clientX, y: e.clientY, yaw: cam.dyaw, pitch: cam.dpitch, id: e.pointerId };
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    cam.dyaw = THREE.MathUtils.clamp(drag.yaw - (e.clientX - drag.x) * 0.004, -0.45, 0.45);
    cam.dpitch = THREE.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * 0.003, -0.25, 0.12);
    moved = true;
  });
  const release = (e: PointerEvent) => { if (drag && e.pointerId === drag.id) drag = null; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // ---------- Ship moves ----------
  function moor(id: string) {
    shipState.at = id;
    shipState.heading = cam.yaw + shipState.facing;
    const b = isles[id]?.berth;
    if (b) ship.position.set(b.x, 0, b.z);
  }
  function sail(fromId: string, toId: string) {
    return new Promise<void>(resolve => {
      const a = isles[fromId].berth.clone(), b = isles[toId].berth.clone();
      const mid = new THREE.Vector3((a.x + b.x) / 2 + (b.z - a.z) * 0.18, 0, (a.z + b.z) / 2 - (b.x - a.x) * 0.18);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const dur = Math.min(2800, 800 + curve.getLength() * 70);
      shipState.sailing = { curve, t0: performance.now(), dur, resolve, to: toId };
    });
  }

  // ---------- Reveal: the clouds part, the colours come back ----------
  const reveals: Reveal[] = [];
  function reveal(id: string) {
    const it = isles[id];
    if (!it.fog) return Promise.resolve();
    return new Promise<void>(resolve => reveals.push({ id, t0: performance.now(), swapped: false, resolve }));
  }

  // ---------- Time of day ----------
  let lookName = '';
  const sunDir = new THREE.Vector3();
  function setLook(name: string) {
    const L = LOOKS[name] || LOOKS.day;
    if (lookName === name) return;
    lookName = name;
    (scene.background as THREE.Color).set(L.sky);
    hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2];
    sun.color.set(L.sun[0]); sun.intensity = L.sun[1];
    sunDir.set(...L.sunDir).normalize();
    sun.position.copy(center).addScaledVector(sunDir, 90);
    seaU.uDeep.value.set(L.deep); seaU.uShallow.value.set(L.shallow); seaU.uFar.value.set(L.sky);
    seaU.uNight.value = L.night;
    lanternGlow.material.opacity = L.night * 0.9;
    for (const id of ids) for (const b of isles[id].parts.beams) (b.children[0] as BasicMesh).material.opacity = 0.12 + L.night * 0.25;
  }

  // ---------- State from the map (map.ts) ----------
  let beaconId: string | null = null;
  function update(state: SeaState) {
    setLook(state.time);
    for (const r of state.regions) setFog(r.id, r.fog);
    lastState = state;
    paintRoutes(state);
    beaconId = state.next || null;
    ring.visible = !!beaconId;
    if (beaconId) ring.position.set(P[beaconId].x, 0.08, P[beaconId].z);
    setCrew(state.hero, state.styleKey);
    setSail(state.style || {});
    if (!shipState.sailing) moor(isles[state.at] ? state.at : 'home');
  }
  // Route dots: bright where the island is open.
  function paintRoutes(state: SeaState) {
    let n = 0;
    for (const route of routes) {
      const open = state.regions.find(r => r.id === route.id)?.open;
      for (const pt of route.pts) {
        if (n >= MAX_DOTS) break;
        _d.position.set(pt.x, 0.04, pt.z); _d.rotation.set(0, 0, 0); _d.scale.setScalar(open ? 1 : 0.7); _d.updateMatrix();
        dots.setMatrixAt(n, _d.matrix);
        dots.setColorAt(n, _c.set(open ? '#fff6d0' : '#cfe6f0'));
        dotOpen[n] = open ? pt : null;
        n++;
      }
    }
    dots.count = n;
    dotOpen.length = n;
    dots.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
  }

  // Each island's rectangle on screen (CSS px in the map), for the labels.
  function rects() {
    const out: Record<string, Rect> = {};
    for (const id of ids) {
      const c = P[id];
      const pts = [c.clone().addScaledVector(right, RR), c.clone().addScaledVector(right, -RR), c.clone().addScaledVector(toward, RR * 0.9), c.clone().setY(TOP - 0.6)].map(project);
      out[id] = {
        x: Math.min(...pts.map(p => p.x)), y: Math.min(...pts.map(p => p.y)),
        w: Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x)),
        h: Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y)),
      };
    }
    return out;
  }

  // ---------- Loop ----------
  let running = false, raf = 0, last = 0, time = 0, onLayout: (rects: Record<string, Rect>) => void = () => {};
  const isActive = () => canvas.isConnected && document.body.dataset.screen === 'map';
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const _tan = new THREE.Vector3();

  function frame(now: number) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    if (!isActive()) { stop(); return; }
    if (lite && now - last < 30) return;   // budget phones: about 30 frames a second
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    time += dt;
    wind.value = time;

    // camera eases back after a drag
    if (!drag && !cam.hold && (Math.abs(cam.dyaw) > 1e-4 || Math.abs(cam.dpitch) > 1e-4)) {
      const k = Math.exp(-dt * 3);
      cam.dyaw *= k; cam.dpitch *= k;
      if (Math.abs(cam.dyaw) < 1e-4) cam.dyaw = 0;
      if (Math.abs(cam.dpitch) < 1e-4) cam.dpitch = 0;
      moved = true;
    }
    if (moved) { place(); onLayout(rects()); moved = false; }

    // ship: sail along the route, or bob at its berth
    const sl = shipState.sailing;
    if (sl) {
      const k = Math.min(1, (now - sl.t0) / sl.dur), e = ease(k);
      sl.curve.getPoint(e, ship.position);
      sl.curve.getTangent(Math.min(0.999, Math.max(0.001, e)), _tan);
      shipState.heading = Math.atan2(-_tan.z, _tan.x);
      shipState.speed = Math.sin(k * Math.PI);
      wakeTimer -= dt;
      if (wakeTimer <= 0 && shipState.speed > 0.15) {
        wakeTimer = 0.09;
        if (wakes.length >= WAKE) wakes.shift();
        wakes.push({ x: ship.position.x - _tan.x * 1.8, z: ship.position.z - _tan.z * 1.8, t: 0 });
      }
      if (k >= 1) {
        shipState.sailing = null; shipState.speed = 0;
        // moored: turn side-on to the camera, still facing the way it sailed
        shipState.facing = _tan.dot(right) >= 0 ? 0 : Math.PI;
        moor(sl.to); sl.resolve();
      }
    }
    let turn = shipState.heading - ship.rotation.y;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    ship.rotation.y += turn * (1 - Math.exp(-dt * 6));
    ship.position.y = Math.sin(time * 1.6) * 0.08 - 0.05;
    boat.rotation.x = Math.sin(time * 1.3) * 0.05 + shipState.speed * 0.06;
    boat.rotation.z = Math.sin(time * 1.1 + 1) * 0.03;
    boat.userData.flag.rotation.y = Math.sin(time * 6) * 0.35;
    lanternMat.color.setScalar(0.85 + Math.sin(time * 7) * 0.08).multiply(_c.set('#ffe08a'));
    // wake rings spread and fade
    for (let i = wakes.length - 1; i >= 0; i--) { wakes[i].t += dt; if (wakes[i].t > 1.4) wakes.splice(i, 1); }
    wakes.forEach((w, i) => {
      const s = 0.5 + w.t * 1.3;
      _d.position.set(w.x, 0.03, w.z); _d.rotation.set(0, 0, 0); _d.scale.set(s, 1, s); _d.updateMatrix();
      wake.setMatrixAt(i, _d.matrix);
      wake.setColorAt(i, _c.set('#ffffff').lerp(seaU.uDeep.value, Math.min(1, w.t / 1.4)));
    });
    wake.count = wakes.length;
    wake.instanceMatrix.needsUpdate = true;
    if (wake.instanceColor) wake.instanceColor.needsUpdate = true;

    // islands' moving parts
    for (const id of ids) {
      const it = isles[id], p = it.parts;
      p.flags.forEach(f => { f.rotation.y = Math.sin(time * 5 + it.seed) * 0.4; });
      p.spin.forEach(s => { s.obj.rotation[s.axis] += s.speed * dt; });
      p.beams.forEach(b => { b.rotation.y = time * 0.8; });
      p.glow.forEach(g => { const s = 3.4 + Math.sin(time * 2) * 0.35; g.scale.set(s, s, 1); });
      p.smoke.forEach(s => {
        const k = (time * 0.28 + s.userData.phase) % 1;
        s.position.copy(s.userData.from).add(_tan.set(k * 0.9, k * 2.4, -k * 0.3));
        s.scale.setScalar(0.4 + k * 1.1);
        s.material.opacity = Math.sin(k * Math.PI) * 0.85;
      });
      if (it.letters) it.letters.forEach((s, i) => {
        const a = time * 0.5 + (i / it.letters!.length) * Math.PI * 2;
        s.position.set(Math.cos(a) * it.parts.letters!.r, it.parts.letters!.y + Math.sin(time * 1.5 + i) * 0.25, Math.sin(a) * it.parts.letters!.r);
      });
      if (it.fog) it.fog.children.forEach((c, i) => {
        c.position.x = c.userData.home.x + Math.sin(time * 0.5 + i * 1.7) * 0.3;
        c.position.y = c.userData.home.y + Math.sin(time * 0.7 + i) * 0.12;
      });
    }

    // fog lifting
    for (let i = reveals.length - 1; i >= 0; i--) {
      const rv = reveals[i], it = isles[rv.id];
      const k = Math.min(1, (now - rv.t0) / 1400);
      if (it.fog) it.fog.children.forEach(c => {
        const out = c.userData.home.clone().setY(0).normalize();
        c.position.copy(c.userData.home).addScaledVector(out, k * k * 7).setY(c.userData.home.y + k * 2);
        c.scale.setScalar(Math.max(0.01, 1 - k * k));
      });
      if (k > 0.45 && !rv.swapped) {
        rv.swapped = true;
        it.group.traverse(o => { if ((o as THREE.Mesh).isMesh && o.userData.mat) (o as THREE.Mesh).material = o.userData.mat; });
        [...it.parts.beams, ...it.parts.smoke, ...it.parts.glow, ...(it.letters || [])].forEach(b => { b.visible = true; });
        it.pop = 0;
        burst(new THREE.Vector3(P[rv.id].x, 2, P[rv.id].z), { n: 40 });
      }
      if (k >= 1) {
        scene.remove(it.fog!);
        it.fog!.traverse(o => (o as THREE.Mesh).geometry?.dispose());
        it.fog = null;
        reveals.splice(i, 1);
        rv.resolve();
      }
    }
    for (const id of ids) {
      const it = isles[id];
      if (it.pop === undefined) continue;
      it.pop += dt;
      const k = Math.min(1, it.pop / 0.8);
      const s = 1 + Math.sin(k * Math.PI) * 0.12 * (1 - k);
      it.group.scale.set(s * it.side * BIG, s * BIG, s * BIG);
      if (k >= 1) { it.group.scale.set(it.side * BIG, BIG, BIG); delete it.pop; }
    }

    // the beacon ring breathes; open routes shimmer
    if (ring.visible) {
      const k = (time * 0.6) % 1;
      ring.scale.setScalar(0.92 + k * 0.18);
      ring.material.opacity = 0.9 * (1 - k);
    }
    for (let i = 0; i < dotOpen.length; i++) {
      const pt = dotOpen[i];
      if (!pt) continue;
      const s = 1 + Math.max(0, Math.sin(time * 3 - i * 0.5)) * 0.35;
      _d.position.set(pt.x, 0.04, pt.z); _d.rotation.set(0, 0, 0); _d.scale.set(s, 1, s); _d.updateMatrix();
      dots.setMatrixAt(i, _d.matrix);
    }
    dots.instanceMatrix.needsUpdate = true;

    // the whale surfaces now and then, and blows
    {
      const k = (time / 16) % 1;
      const up = k < 0.12 ? k / 0.12 : k < 0.55 ? 1 : k < 0.68 ? 1 - (k - 0.55) / 0.13 : 0;
      whale.visible = up > 0;
      whale.position.copy(whaleAt).addScaledVector(right, (k - 0.3) * 6).setY(-1.1 + up * 1.05);
      whale.rotation.y = cam.yaw;
      whale.rotation.z = (k < 0.12 ? 0.25 : k > 0.55 ? -0.3 : 0) * up;
      if (Math.abs(k - 0.25) < dt / 16) burst(whale.position.clone().add(_tan.set(0.4, 0.8, 0)), { n: 18, colors: ['#ffffff', '#dff6ff'], up: 6, spread: 1.4, size: 0.1, grav: 9, life: 1 });
    }
    gulls.forEach(gl => {
      const a = time * 0.25 + gl.userData.phase;
      gl.position.set(center.x + Math.cos(a) * gl.userData.r, 8 + Math.sin(a * 2) * 0.6, center.z + Math.sin(a) * gl.userData.r * 1.6);
      gl.rotation.y = Math.atan2(-Math.cos(a) * 1.6, -Math.sin(a));
      gl.userData.wings.forEach((w: THREE.Object3D, i: number) => { w.rotation.x = Math.sin(time * 9 + gl.userData.phase) * 0.5 * (i ? 1 : -1); });
    });

    // particles
    let n = 0;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.t += dt;
      if (s.t >= s.life) { sparks.splice(i, 1); continue; }
      s.vy -= s.grav * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    }
    for (const s of sparks) {
      _d.position.set(s.x, s.y, s.z); _d.rotation.set(s.t * 4, s.t * 3, 0); _d.scale.setScalar(s.s * (1 - (s.t / s.life) ** 2)); _d.updateMatrix();
      pMesh.setMatrixAt(n, _d.matrix);
      pMesh.setColorAt(n, _c.set(s.color));
      n++;
    }
    pMesh.count = n;
    pMesh.instanceMatrix.needsUpdate = true;
    if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;

    renderer.render(scene, camera);
  }

  function start() { if (running || !canvas.isConnected) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function mount(host: HTMLElement) {
    if (canvas.parentElement !== host) { ro.disconnect(); host.prepend(canvas); ro.observe(host); }
    resize();
    start();
  }

  setLook('day');
  return {
    canvas, mount, start, stop, update, sail, reveal, rects,
    onLayout: f => { onLayout = f; moved = true; },
    relayout: () => { moved = true; },
    get sailing() { return !!shipState.sailing; },
    // test hooks (window.__sea in tests): look closely at a place
    look: (id, dist, dpitch = 0, dyaw = 0) => { cam.target.set(P[id].x, 0, P[id].z); cam.dist = dist; cam.dpitch = dpitch; cam.dyaw = dyaw; cam.hold = true; place(); moved = true; },
    // test hook (window.__sea in tests)
    debug: () => ({ yaw: cam.yaw, dist: cam.dist, ship: ship.position.toArray(), at: shipState.at, fog: ids.filter(id => isles[id].fog), next: beaconId, calls: renderer.info.render.calls }),
  };
}
