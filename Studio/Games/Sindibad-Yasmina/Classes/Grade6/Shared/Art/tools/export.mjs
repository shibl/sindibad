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

const root = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(root, '../..');
const entries = [];
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
for (const dir of ['svg', 'runtime/png', 'models', 'licenses']) await fs.mkdir(path.join(root, dir), { recursive: true });
// A canvas for texture baking only. No browser, window, renderer or game boot.
globalThis.document = {
  createElement(tag) {
    if (tag !== 'canvas') throw new Error(`Unexpected DOM dependency: ${tag}`);
    const canvas = createCanvas(1, 1);
    canvas.toBlob = (callback, type = 'image/png') => callback(new Blob([canvas.toBuffer(type)], { type }));
    return canvas;
  },
};
globalThis.HTMLCanvasElement = Canvas;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};
const fontFiles = [];
for (const file of await fs.readdir(path.join(root, 'fonts'))) {
  if (file.endsWith('.ttf')) GlobalFonts.registerFromPath(path.join(root, 'fonts', file), 'Baloo Bhaijaan 2');
  if (file.endsWith('.ttf')) fontFiles.push(path.join(root, 'fonts', file));
}

async function writeAsset(file, bytes) {
  await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(path.join(root, file), bytes);
  return { path: file, bytes: Buffer.byteLength(bytes), sha256: hash(bytes) };
}

async function svg(id, raw, { width = 720 } = {}) {
  // The web shares <defs> globally; each exported document must be independent.
  let body = raw.trim().replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
  body = body.replace(/(<svg[^>]*>)/, `$1<defs>${art.DEFS}</defs>`);
  // Overflow-visible web art needs a larger canvas to retain glow/whale spout.
  if (id === 'scenery/whale') body = body.replace('0 0 140 80', '-8 -22 156 110');
  if (id === 'objects/chest') body = body.replace('0 0 240 200', '-8 -128 256 336');
  if (id.startsWith('ships/')) body = body.replace('0 0 360 260', '-4 -6 378 270');
  body = body.split('\n').map(line => line.trimEnd()).join('\n') + '\n';
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
for (const hero of ['sindbad', 'yasmina']) await svg(`heroes/${hero}`, art.heroSVG(hero), { width: 600 });
await svg('heroes/hudhud', art.hudhudSVG(), { width: 480 });
await svg('ships/crew', art.shipSVG());
await svg('ships/empty', art.shipSVG({ crew: [], hudhud: false }));
for (const hero of ['sindbad', 'yasmina']) await svg(`ships/${hero}`, art.shipSVG({ crew: [hero] }));
for (const kind of ['port', ...world.regions.map(r => r.art)]) await svg(`islands/${kind}`, art.islandSVG(kind), { width: 480 });
for (const [id, fn] of Object.entries({
  palm: art.palmSVG, skyline: art.skylineSVG, cloud: art.cloudSVG, gull: art.gullSVG,
  shore: art.shoreSVG, whale: art.whaleSVG,
})) await svg(`scenery/${id}`, fn());
await svg('objects/compass', art.compassSVG(), { width: 300 });
await svg('objects/chest', art.chestSVG());

// Normalize web-only materials to portable glTF PBR while retaining vertex colors.
// Procedural shaders / CSS motion are not portable assets; record those separately.
function portable(rootObject) {
  let serial = 0;
  const materials = new Map();
  const hooks = {};
  rootObject.traverse(obj => { obj.name ||= `part_${String(serial++).padStart(3, '0')}`; });
  rootObject.traverse(obj => {
    for (const [key, value] of Object.entries(obj.userData)) {
      if (value?.isObject3D) hooks[`${obj.name}.${key}`] = value.name;
      else if (Array.isArray(value) && value.length && value.every(x => x?.isObject3D)) {
        hooks[`${obj.name}.${key}`] = value.map(x => x.name);
      }
    }
    // Web factories sometimes store live Object3D references/functions in userData.
    obj.userData = {};
    if (!obj.isMesh) return;
    const convert = m => {
      if (materials.has(m)) return materials.get(m);
      const n = m.isMeshBasicMaterial
        ? new THREE.MeshBasicMaterial()
        : new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
      for (const key of ['color', 'emissive']) if (m[key] && n[key]) n[key].copy(m[key]);
      for (const key of ['map', 'transparent', 'opacity', 'side', 'alphaTest', 'vertexColors', 'depthWrite']) n[key] = m[key];
      n.name = m.name || `material_${materials.size}`;
      materials.set(m, n);
      return n;
    };
    obj.material = Array.isArray(obj.material) ? obj.material.map(convert) : convert(obj.material);
  });
  return hooks;
}
function unwrap(value) {
  if (value?.isObject3D) return value;
  if (value?.isBufferGeometry) return new THREE.Mesh(value, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  for (const key of ['group', 'g', 'mesh', 'root']) if (value?.[key]?.isObject3D) return value[key];
  throw new Error('Factory returned no exportable Object3D');
}
async function model(id, value, source, metadata = {}) {
  const object = unwrap(value);
  object.name = id.replaceAll('/', '_');
  const hooks = portable(object);
  // Retain stable node references from factory return objects (tails, wings, etc.).
  for (const [key, v] of Object.entries(value || {})) {
    if (v?.isObject3D && v !== object) hooks[key] = v.name;
    else if (Array.isArray(v) && v.length && v.every(x => x?.isObject3D)) hooks[key] = v.map(x => x.name);
  }
  const scene = new THREE.Scene(); scene.name = id; scene.add(object);
  scene.updateMatrixWorld(true);
  const bytes = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false }));
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
for (const name of ['cloud', 'whale', 'gull']) await model(`sea/${name}`, sea[name](), 'Web/core/sea/models.js');

const factories = {
  farm: ['barn', 'silo', 'dairy', 'shamiCow', 'trough', 'feeder', 'bucket', 'hive', 'waterTank', 'windmill', 'tree', 'palm', 'rock', 'bush', 'roseBush', 'jasmineArch', 'fountain', 'lantern', 'scarecrow', 'dock', 'dhow', 'ordersBoard', 'tractor', 'wateringCan'],
  tunes: ['terrain', 'grandPiano', 'glassPavilion', 'drumCircle', 'metronomeTower', 'noteCar', 'staffCloud', 'musicLibrary', 'theatre', 'harbor', 'rainbowGate', 'helperNote'],
  lab: ['terrain', 'forest', 'pond', 'arena', 'slopes', 'yard', 'bodyDome', 'skinPavilion', 'builders', 'machines', 'castle', 'lighthouse', 'helperBot'],
  atlas: ['terrain', 'observatory', 'pyramids', 'carthage', 'statePalace', 'nileValley', 'fustat', 'hornPort', 'familyHouse', 'institutions', 'oasis', 'heroesGarden', 'atlasMountains', 'andalusPalace', 'travellersCompass', 'helperStar'],
  studio: ['terrain', 'circlesSquare', 'fatnaHouse', 'perspectiveStreet', 'cubistStudio', 'palmyra', 'africanVillage', 'noria', 'cardboardWorkshop', 'realistStudio', 'mandalaGarden', 'damasceneHouse', 'ideasHouse', 'linesWall', 'craftsMarket', 'artistsGallery', 'helperBrush'],
  english: ['terrain', 'harbour', 'theatre', 'aquarium', 'arts', 'hospital', 'park', 'farm', 'souq', 'garden', 'school', 'square', 'space', 'helloSign', 'helperParrot'],
};
// The glass pavilion as the game builds it (core/tunes/tunes.ts): each glass
// with its id and colour, its water at the book's level (all lessons done).
async function glassPavilion(mod) {
  const { GLASSES, GLASS_COLORS } = await import('../../../Web/worlds/grade6/tunes.js');
  const g = mod.glassPavilion(GLASSES.map(x => ({ id: x.id, color: GLASS_COLORS[x.id] })));
  for (const x of GLASSES) mod.setWater(g.userData.waters[x.id], x.n / x.d);
  return g;
}
const failures = [];
for (const [island, names] of Object.entries(factories)) {
  const mod = await import(`../../../Web/core/${island}/models.js`);
  for (const name of names) {
    try { await model(`${island}/${name}`, name === 'glassPavilion' ? await glassPavilion(mod) : mod[name](), `Web/core/${island}/models.js`); }
    catch (error) { failures.push({ id: `${island}/${name}`, reason: error.message }); }
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
