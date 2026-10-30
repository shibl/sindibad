// Development-time extraction. No JS is shipped inside either native app.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCanvas, Canvas, ImageData, Path2D, GlobalFonts } from '@napi-rs/canvas';
import { Resvg } from '@resvg/resvg-js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as THREE from '../../../Web/vendor/three/three.module.min.js';
import * as art from '../../../Web/art/art.js';
import world from '../../../Web/worlds/grade6.js';
import type { Asset, Variant } from './manifest.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(root, '../..');
const entries: Asset[] = [];
const hash = (b: Buffer | string) => crypto.createHash('sha256').update(b).digest('hex');
for (const dir of ['svg', 'runtime/png', 'models', 'licenses']) await fs.mkdir(path.join(root, dir), { recursive: true });
// A canvas for texture baking only. No browser, window, renderer or game boot.
// The game's model code draws its textures on a canvas, as in the browser;
// here @napi-rs/canvas stands in for the browser's, hence the casts.
globalThis.document = {
  createElement(tag: string) {
    if (tag !== 'canvas') throw new Error(`Unexpected DOM dependency: ${tag}`);
    const canvas = createCanvas(1, 1);
    (canvas as unknown as HTMLCanvasElement).toBlob = (callback, type = 'image/png') => callback(new Blob([new Uint8Array(canvas.toBuffer(type as 'image/png'))], { type }));
    return canvas;
  },
} as unknown as Document;
globalThis.HTMLCanvasElement = Canvas as unknown as typeof HTMLCanvasElement;
globalThis.ImageData = ImageData as unknown as typeof globalThis.ImageData;
globalThis.Path2D = Path2D as unknown as typeof globalThis.Path2D;
// What GLTFExporter needs of FileReader, to read the baked textures.
globalThis.FileReader = class {
  declare result: ArrayBuffer | string;
  declare onloadend?: () => void;
  readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  readAsDataURL(blob: Blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
} as unknown as typeof FileReader;
const fontFiles: string[] = [];
for (const file of await fs.readdir(path.join(root, 'fonts'))) {
  if (file.endsWith('.ttf')) GlobalFonts.registerFromPath(path.join(root, 'fonts', file), 'Baloo Bhaijaan 2');
  if (file.endsWith('.ttf')) fontFiles.push(path.join(root, 'fonts', file));
}

async function writeAsset(file: string, bytes: Buffer | string): Promise<Variant> {
  await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(path.join(root, file), bytes);
  return { path: file, bytes: Buffer.byteLength(bytes), sha256: hash(bytes) };
}

async function svg(id: string, raw: string, { width = 720 } = {}) {
  // The web shares <defs> globally; each exported document must be independent.
  let body = raw.trim().replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
  body = body.replace(/(<svg[^>]*>)/, `$1<defs>${art.DEFS}</defs>`);
  // Overflow-visible web art needs a larger canvas to retain glow/whale spout.
  if (id === 'scenery/whale') body = body.replace('0 0 140 80', '-8 -22 156 110');
  if (id === 'objects/chest') body = body.replace('0 0 240 200', '-8 -128 256 336');
  if (id.startsWith('ships/')) body = body.replace('0 0 360 260', '-4 -6 378 270');
  body = body.split('\n').map((line: string) => line.trimEnd()).join('\n') + '\n';
  const vector = await writeAsset(`svg/${id}.svg`, body);
  // resvg correctly handles SVG stop-opacity; Skia's SVG path darkened faces.
  const rendered = new Resvg(body, { fitTo: { mode: 'width', value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Baloo Bhaijaan 2' },
  }).render();
  const w = rendered.width, h = rendered.height;
  const png = rendered.asPng();
  const raster = await writeAsset(`runtime/png/${id}.png`, png);
  entries.push({
    id, type: 'illustration', source: 'Web/art/art.js', variants: [vector, raster],
    width: w, height: h,
    animationHooks: [...new Set([...raw.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/)))].sort(),
    limitations: ['PNG is a static pose. SVG groups retain CSS animation hooks; native animation needs a separate adapter.'],
  });
}
for (const hero of ['sindbad', 'yasmina'] as const) await svg(`heroes/${hero}`, art.heroSVG(hero), { width: 600 });
await svg('heroes/hudhud', art.hudhudSVG(), { width: 480 });
await svg('ships/crew', art.shipSVG());
await svg('ships/empty', art.shipSVG({ crew: [], hudhud: false }));
for (const hero of ['sindbad', 'yasmina'] as const) await svg(`ships/${hero}`, art.shipSVG({ crew: [hero] }));
for (const kind of ['port', ...world.regions.map(r => r.art)]) await svg(`islands/${kind}`, art.islandSVG(kind), { width: 480 });
for (const [id, fn] of Object.entries({
  palm: art.palmSVG, skyline: art.skylineSVG, cloud: art.cloudSVG, gull: art.gullSVG,
  shore: art.shoreSVG, whale: art.whaleSVG,
})) await svg(`scenery/${id}`, fn());
await svg('objects/compass', art.compassSVG(), { width: 300 });
await svg('objects/chest', art.chestSVG());

// Normalize web-only materials to portable glTF PBR while retaining vertex colors.
// Procedural shaders / CSS motion are not portable assets; record those separately.
type Hooks = Record<string, string | string[]>;
type WebMaterial = THREE.Material & Record<string, unknown>;
function portable(rootObject: THREE.Object3D) {
  let serial = 0;
  const materials = new Map<THREE.Material, THREE.Material>();
  const hooks: Hooks = {};
  rootObject.traverse(obj => { obj.name ||= `part_${String(serial++).padStart(3, '0')}`; });
  rootObject.traverse(obj => {
    for (const [key, value] of Object.entries(obj.userData)) {
      if (isObject3D(value)) hooks[`${obj.name}.${key}`] = value.name;
      else if (Array.isArray(value) && value.length && value.every(isObject3D)) {
        hooks[`${obj.name}.${key}`] = value.map(x => x.name);
      }
    }
    // Web factories sometimes store live Object3D references/functions in userData.
    obj.userData = {};
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const convert = (m: THREE.Material) => {
      const done = materials.get(m);
      if (done) return done;
      const n: THREE.Material = (m as THREE.MeshBasicMaterial).isMeshBasicMaterial
        ? new THREE.MeshBasicMaterial()
        : new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      const from = m as WebMaterial, to = n as WebMaterial;
      for (const key of ['color', 'emissive']) if (from[key] && to[key]) (to[key] as THREE.Color).copy(from[key] as THREE.Color);
      for (const key of ['map', 'transparent', 'opacity', 'side', 'alphaTest', 'vertexColors', 'depthWrite']) to[key] = from[key];
      n.name = m.name || `material_${materials.size}`;
      materials.set(m, n);
      return n;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material);
  });
  return hooks;
}
const isObject3D = (x: unknown): x is THREE.Object3D => !!(x as THREE.Object3D | null)?.isObject3D;
function unwrap(value: unknown): THREE.Object3D {
  if (isObject3D(value)) return value;
  if ((value as THREE.BufferGeometry | null)?.isBufferGeometry) return new THREE.Mesh(value as THREE.BufferGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  for (const key of ['group', 'g', 'mesh', 'root']) { const part = (value as Record<string, unknown> | null)?.[key]; if (isObject3D(part)) return part; }
  throw new Error('Factory returned no exportable Object3D');
}
async function model(id: string, value: unknown, source: string, metadata = {}) {
  const object = unwrap(value);
  object.name = id.replaceAll('/', '_');
  const hooks = portable(object);
  // Retain stable node references from factory return objects (tails, wings, etc.).
  for (const [key, v] of Object.entries(value || {})) {
    if (isObject3D(v) && v !== object) hooks[key] = v.name;
    else if (Array.isArray(v) && v.length && v.every(isObject3D)) hooks[key] = v.map(x => x.name);
  }
  const scene = new THREE.Scene(); scene.name = id; scene.add(object);
  scene.updateMatrixWorld(true);
  const bytes = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false }) as ArrayBuffer);
  const variant = await writeAsset(`models/${id}.glb`, bytes);
  entries.push({ id, type: 'model', source, variants: [variant], coordinateSystem: 'right-handed, Y-up, +Z forward', units: 'metres (web model scale)', nodeHooks: hooks, ...metadata,
    limitations: ['Static geometry and named moving parts; runtime animation, physics, particles and custom shaders are separate native behavior.', 'Lambert surfaces mapped to roughness=1 PBR; lighting requires native tuning.'] });
}
const sea = await import('../../../Web/core/sea/models.js');
let seed = 1;
for (const kind of ['port', ...world.regions.map(r => r.art)]) {
  const v = sea.buildIsland(kind, seed++);
  // Merge animation arrays into the value object for named-node metadata.
  await model(`sea/${kind}`, { group: v.group, ...v.parts }, 'Web/core/sea/models.js');
}
for (const name of ['cloud', 'whale', 'gull'] as const) await model(`sea/${name}`, sea[name](), 'Web/core/sea/models.js');

// Each island's model factories, by name. A factory takes no argument (or
// only optional ones), except the glass pavilion, built below as the game does.
type Factories = Record<string, (() => unknown) | undefined>;
const factories: Record<string, string[]> = {
  farm: ['barn', 'silo', 'dairy', 'shamiCow', 'trough', 'feeder', 'bucket', 'hive', 'waterTank', 'windmill', 'tree', 'palm', 'rock', 'bush', 'roseBush', 'jasmineArch', 'fountain', 'lantern', 'scarecrow', 'dock', 'dhow', 'ordersBoard', 'tractor', 'wateringCan'],
  tunes: ['terrain', 'grandPiano', 'glassPavilion', 'drumCircle', 'metronomeTower', 'noteCar', 'staffCloud', 'musicLibrary', 'theatre', 'harbor', 'rainbowGate', 'helperNote'],
  lab: ['terrain', 'forest', 'pond', 'arena', 'slopes', 'yard', 'bodyDome', 'skinPavilion', 'builders', 'machines', 'castle', 'lighthouse', 'helperBot'],
  atlas: ['terrain', 'observatory', 'pyramids', 'carthage', 'statePalace', 'nileValley', 'fustat', 'hornPort', 'familyHouse', 'institutions', 'oasis', 'heroesGarden', 'atlasMountains', 'andalusPalace', 'travellersCompass', 'helperStar'],
  studio: ['terrain', 'circlesSquare', 'fatnaHouse', 'perspectiveStreet', 'cubistStudio', 'palmyra', 'africanVillage', 'noria', 'cardboardWorkshop', 'realistStudio', 'mandalaGarden', 'damasceneHouse', 'ideasHouse', 'linesWall', 'craftsMarket', 'artistsGallery', 'helperBrush'],
  english: ['terrain', 'harbour', 'theatre', 'aquarium', 'arts', 'hospital', 'park', 'farm', 'souq', 'garden', 'school', 'square', 'space', 'helloSign', 'helperParrot'],
};
// The glass pavilion as the game builds it (core/tunes/tunes.ts): each glass
// with its id and colour, its water at the book's level (all lessons done).
async function glassPavilion(mod: typeof import('../../../Web/core/tunes/models.js')) {
  const { GLASSES, GLASS_COLORS } = await import('../../../Web/worlds/grade6/tunes.js');
  const g = mod.glassPavilion(GLASSES.map(x => ({ id: x.id, color: GLASS_COLORS[x.id] })));
  for (const x of GLASSES) mod.setWater(g.userData.waters[x.id], x.n / x.d);
  return g;
}
const failures: { id: string; reason: string }[] = [];
for (const [island, names] of Object.entries(factories)) {
  const mod = await import(`../../../Web/core/${island}/models.js`);
  for (const name of names) {
    try { await model(`${island}/${name}`, name === 'glassPavilion' ? await glassPavilion(mod) : (mod as Factories)[name]!(), `Web/core/${island}/models.js`); }
    catch (error) { failures.push({ id: `${island}/${name}`, reason: (error as Error).message }); }
  }
}
const manifest = {
  schemaVersion: 1,
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  license: 'Project artwork: CC-BY-SA as declared by repository; fonts: SIL OFL; exporter tooling: MIT dependencies.',
  assets: entries,
  pending: failures,
};
await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await fs.copyFile(path.join(repo, 'Web/vendor/three/LICENSE'), path.join(root, 'licenses/Three-MIT.txt'));
await fs.copyFile(path.join(repo, 'Web/icons/icon-512.png'), path.join(root, 'runtime/launcher.png'));
await fs.mkdir(path.join(root, 'runtime/licenses'), { recursive: true });
await fs.copyFile(path.join(root, 'licenses/Baloo-OFL.txt'), path.join(root, 'runtime/licenses/Baloo-OFL.txt'));
console.log(`Exported ${entries.filter(x => x.type === 'illustration').length} illustrations and ${entries.filter(x => x.type === 'model').length} models.`);
if (failures.length) { console.log('Pending factories:', failures); process.exitCode = 1; }
