// Made from models.ts by tools/build.ts. Edit that file, then run: npm run build
// The science island's 3D models, all made in code (no model or image
// files): bright limestone terraces stepping up to a castle on a hill, a
// turquoise sea, and one landmark per place — the tree of life, the pond, the
// forces arena with its giant spring scale, the three friction slopes, the
// farm yard with the horse and cart, the glass body dome with its kidneys,
// the skin pavilion, the builders' ramp, the machines square with the noria,
// and قلعة الحصن. Plus the lighthouse whose crystals light up, one per
// finished lesson, and the helper «شرارة», a little lab robot.
//
// Like the music island (core/tunes/models.js, whose small things this
// reuses), most models are many shapes merged into one vertex-coloured mesh.
// Units: 1 ≈ 1 metre; Y is up; the camera looks from +Z.
//
// The browser loads models.js, made from this file by `npm run build`.
import * as THREE from '../../vendor/three/three.module.min.js';
import { Kit, VC, roundBox } from '../farm/models.js';
import { treeGeo, bushGeo, rockGeo, personGeo, put, glow } from '../tunes/models.js';
import { makeGround } from '../isle/ground.js';
import { plinth as basePlinth, animalGeo, beaconArrow, selectRing, sparkSprite, lampGeo } from '../isle/kit.js';
export { treeGeo, bushGeo, rockGeo, personGeo, put, glow, animalGeo, beaconArrow, selectRing, sparkSprite, lampGeo };
const kit = () => new Kit();
const C = (h) => new THREE.Color(h);
const LO = new THREE.SphereGeometry(1, 12, 8);
export const PAL = {
    grass: '#9fd779', grassB: '#93cf6c', grassC: '#88c763', grassD: '#7fbf5c',
    cliff: '#f4ead8', cliffDark: '#d9c7a6', sand: '#fbe6b4', sandSide: '#ecd197',
    path: '#fbf6ec', pathEdge: '#e2d4ba',
    stone: '#e9dcc2', stoneDark: '#c9b48a', white: '#fbfbf8', glass: '#bfeaff',
    wood: '#a8703f', woodLight: '#c99863', ink: '#3b2414', gold: '#f2c14e',
};
export const UNIT_COLORS = { 1: '#4fbf5a', 2: '#f28c3a', 3: '#e8537a', 4: '#3f8fd6' };
// ---------- Ground (core/isle/ground.js) ----------
const G = makeGround({
    isle: { cx: 0, cz: -6.5, hx: 19, hz: 45 },
    // four levels stepping up towards the castle hill at the back
    levels: [[0.9, Infinity], [2.1, 12], [3.3, -12], [4.6, -38]],
    slabs: [
        [0, -6.5, 16, 41.6, 5, 0.8, 5, 0.9, 0.5, PAL.grass],
        [0, -17, 15.4, 29, 6, 0.6, 7, 2.1, 1.1, PAL.grassB],
        [0, -30, 14.8, 18, 6, 0.5, 9, 3.3, 1.1, PAL.grassC],
        [0.5, -43.5, 9.5, 5.6, 4, 0.4, 11, 4.6, 1.2, PAL.grassD],
    ],
    ramps: [[15.2, 11.6, 0.9, 2.1], [-8.6, -12.2, 2.1, 3.3], [-34.6, -38.4, 3.3, 4.6]],
    path: [[14, 32.5], [8.5, 29.5], [2.5, 26], [0.6, 20.5], [1, 15], [0.8, 10], [0.2, 4], [0.8, -2], [0.4, -8], [0.8, -12.5], [0.2, -17.5], [0.8, -23], [0.2, -28.5], [0.6, -33], [0.8, -37.5], [0.8, -40.2]],
    pal: { sand: PAL.sand, sandSide: PAL.sandSide, cliff: PAL.cliff, cliffDark: PAL.cliffDark, path: PAL.path, pathEdge: PAL.pathEdge, post: PAL.white },
});
export const { ISLE, levelAt, pathY, terrain, pathCurve, pathRibbon } = G;
const plinth = (k, unit, opts) => basePlinth(k, UNIT_COLORS[unit] || PAL.gold, opts);
const mat = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
const mesh = (geo, m) => { const x = new THREE.Mesh(geo, m); x.castShadow = true; return x; };
// ---------- Landmarks (each: a Group with userData.height and parts to animate) ----------
// Unit 1 · The forest: a giant tree of life on a green plinth, with its
// animals (the food chains of the book).
export function forest() {
    const g = new THREE.Group(), k = kit();
    const h = plinth(k, 1, { r: 5.2, top: '#a5d878' });
    k.add(new THREE.CylinderGeometry(0.5, 0.85, 4, 10), '#8a5a34', { p: [-0.6, h + 2, -0.8] });
    for (const [x, z, ry] of [[0.6, 0, 0.5], [-1.6, -0.3, 2.4], [-0.4, -1.8, 4]])
        k.add(new THREE.CylinderGeometry(0.2, 0.32, 1.4, 6), '#8a5a34', { p: [-0.6 + x * 0.6, h + 0.3, -0.8 + z * 0.6], r: [0.9, ry, 0] });
    const leaves = [['#5fae4a', 0, 5.2, 0, 2.1], ['#6fbf55', 1.3, 4.6, 0.4, 1.4], ['#57a646', -1.4, 4.8, -0.2, 1.5], ['#7cc35a', 0.2, 6.3, -0.4, 1.3], ['#4f9e40', -0.6, 4.4, 1.2, 1.2]];
    for (const [c, x, y, z, s] of leaves)
        k.add(LO, c, { p: [-0.6 + x, h + y, -0.8 + z], s });
    for (let i = 0; i < 10; i++) {
        const a = i * 0.7;
        k.add(LO, '#e8453c', { p: [-0.6 + Math.cos(a) * 1.9, h + 4.6 + (i % 3) * 0.5, -0.8 + Math.sin(a) * 1.6], s: 0.14 });
    }
    // mushrooms (the decomposers), a hollow log, berries
    for (const [x, z, s] of [[2.6, 1.8, 1], [3.1, 1.2, 0.7], [2.2, 2.6, 0.6]]) {
        k.add('cyl', '#fff6e0', { p: [x, h + 0.18 * s, z], s: [0.08 * s, 0.36 * s, 0.08 * s] });
        k.add('hemi', '#e8453c', { p: [x, h + 0.34 * s, z], s: [0.26 * s, 0.2 * s, 0.26 * s] });
    }
    k.add('cyl', '#9a6a3c', { p: [-3, h + 0.35, 2.4], r: [0, 0.3, Math.PI / 2], s: [0.35, 2, 0.35] });
    k.add('cyl', '#5a3a22', { p: [-2.02, h + 0.35, 2.69], r: [0, 0.3, Math.PI / 2], s: [0.24, 0.05, 0.24] });
    put(k, bushGeo(3, '#6ab44c'), 3.2, h, -1.4, 0, 1.1);
    put(k, bushGeo(6, '#5aa244'), -3.6, h, -1.8, 1, 1.2);
    // the food chain on the ground: grass → rabbit, fox; an owl on a branch; a deer
    put(k, animalGeo('rabbit'), 1.4, h, 2.8, 0.4, 1.5);
    put(k, animalGeo('fox'), -1.6, h, 3.3, 2.6, 1.4);
    put(k, animalGeo('deer'), 3.4, h, -0.2, -0.8, 1.3);
    put(k, animalGeo('owl'), 0.7, h + 3.7, -0.3, 0.2, 1.4);
    const m = k.mesh();
    g.add(m);
    const bird = mesh(animalGeo('robin'), VC);
    bird.scale.setScalar(1.6);
    g.add(bird);
    g.userData = { height: h + 7, bird };
    return g;
}
// Unit 1 · The pond: water with lily pads, ducks, a frog, reeds and a little
// jetty; ecosystems in balance.
export function pond() {
    const g = new THREE.Group(), k = kit();
    const h = plinth(k, 1, { r: 5, top: '#a5d878' });
    k.add(new THREE.CylinderGeometry(3.6, 3.7, 0.3, 40), '#7fa86a', { p: [0, h - 0.05, -0.2] });
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        k.add(new THREE.DodecahedronGeometry(1, 0), '#d9cfbd', { p: [Math.cos(a) * 3.75, h + 0.08, -0.2 + Math.sin(a) * 3.75], r: [i, i * 2, 0], s: [0.38, 0.22, 0.32] });
    }
    for (const [x, z] of [[1.2, 0.4], [-1.4, -1], [0.3, -1.8], [-0.6, 1.5]]) {
        k.add('cyl', '#4fae45', { p: [x, h + 0.14, z - 0.2], s: [0.4, 0.02, 0.4] });
    }
    k.add(LO, '#ec79a8', { p: [1.2, h + 0.2, 0.2], s: [0.12, 0.08, 0.12] });
    for (let i = 0; i < 9; i++) {
        const a = 2.4 + i * 0.12;
        k.add('cyl', i % 2 ? '#6a9a3a' : '#7aaa4a', { p: [Math.cos(a) * 3.2, h + 0.6, -0.2 + Math.sin(a) * 3.2], r: [0, 0, (i % 3 - 1) * 0.1], s: [0.035, 1.2, 0.035] });
        k.add('cyl', '#7a4a2a', { p: [Math.cos(a) * 3.2, h + 1.25, -0.2 + Math.sin(a) * 3.2], s: [0.06, 0.24, 0.06] });
    }
    k.add('box', PAL.woodLight, { p: [2.9, h + 0.32, 1.9], r: [0, -0.7, 0], s: [0.9, 0.1, 2.2] });
    for (const [x, z] of [[2.4, 1.3], [3.4, 2.5]])
        k.add('cyl', PAL.wood, { p: [x, h + 0.1, z], s: [0.08, 0.5, 0.08] });
    put(k, animalGeo('frog'), -1.4, h + 0.15, -1.2, 0.6, 1.6);
    put(k, treeGeo(3, 5), -3.6, h, -2.4, 0, 1.1);
    const m = k.mesh();
    g.add(m);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.45, 0.06, 40), new THREE.MeshPhongMaterial({ color: '#4fc3e8', transparent: true, opacity: 0.85, shininess: 90, specular: '#ffffff' }));
    water.position.set(0, h + 0.13, -0.2);
    g.add(water);
    const ducks = [0, 1, 2].map(i => { const d = mesh(animalGeo('duck'), VC); d.scale.setScalar(1.6); d.userData = { a: i * 2.1, r: 1.6 + i * 0.5, y: h + 0.14 }; g.add(d); return d; });
    g.userData = { height: h + 2.6, ducks, water };
    return g;
}
// Unit 2 · The forces arena: a giant spring scale whose weight bobs, a
// horseshoe magnet with pins, and a tug of war.
export function arena() {
    const g = new THREE.Group(), k = kit();
    const h = plinth(k, 2, { w: 9, d: 7.6 });
    // the frame of the spring scale tower
    for (const x of [-3.2, -1])
        k.add('box', '#7a858d', { p: [x, h + 2.6, -2.2], s: [0.24, 5.2, 0.24] });
    k.add('box', '#7a858d', { p: [-2.1, h + 5.2, -2.2], s: [2.6, 0.26, 0.4] });
    k.add('cyl', '#3f8fd6', { p: [-2.1, h + 4.3, -2.2], s: [0.38, 1.4, 0.38] });
    // the horseshoe magnet and its pins
    const mg = new THREE.TorusGeometry(0.75, 0.26, 10, 24, Math.PI);
    k.add(mg, '#e8453c', { p: [2.4, h + 1.6, -2], r: [0, 0, Math.PI] });
    for (const s of [-1, 1]) {
        k.add('box', '#e8453c', { p: [2.4 + s * 0.75, h + 0.95, -2], s: [0.52, 1.3, 0.52] });
        k.add('box', '#eaeaea', { p: [2.4 + s * 0.75, h + 0.3, -2], s: [0.53, 0.3, 0.53] });
    }
    for (let i = 0; i < 7; i++)
        k.add('cyl', ['#e8453c', '#3f8fd6', '#f2c14e', '#4fbf5a'][i % 4], { p: [1.7 + i * 0.22, h + 0.08, -0.9 - (i % 2) * 0.2], r: [Math.PI / 2, 0, 0.3 * i], s: [0.04, 0.32, 0.04] });
    // tug of war: a rope and two teams
    k.add('cyl', '#e8d39a', { p: [0.4, h + 0.6, 1.6], r: [0, 0, Math.PI / 2], s: [0.05, 6, 0.05] });
    k.add('box', '#e8453c', { p: [0.4, h + 0.6, 1.6], s: [0.12, 0.3, 0.12] });
    for (let i = 0; i < 3; i++) {
        put(k, personGeo(40 + i), -1.5 - i * 0.8, h, 1.9, Math.PI / 2 - 0.15, 1);
        put(k, personGeo(50 + i), 2.3 + i * 0.8, h, 1.3, -Math.PI / 2 - 0.15, 1);
    }
    g.add(k.mesh());
    // the bobbing parts: the spring and the weight under it
    const springM = mesh(new THREE.TorusKnotGeometry(0.3, 0.05, 64, 6, 1, 12), mat('#c2cad2'));
    springM.scale.set(1, 3.2, 1);
    springM.position.set(-2.1, h + 2.9, -2.2);
    g.add(springM);
    const wt = mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.8, 8), mat('#3b3640'));
    wt.position.set(-2.1, h + 1.8, -2.2);
    g.add(wt);
    g.userData = { height: h + 6, spring: springM, weight: wt, baseY: h };
    return g;
}
// Unit 2 · The friction slopes: three lanes (glass, wood, felt) with blocks
// that slide down, and a snowy ski slope with a skier.
export function slopes() {
    const g = new THREE.Group(), k = kit();
    const h = plinth(k, 2, { w: 8.4, d: 7.4 });
    k.add(roundBox(6.6, 2.4, 1.6, 0.1), PAL.stone, { p: [0, h + 1.2, -2.8] });
    const lanes = [['#bdeee4', -2], ['#c99863', 0], ['#9c78d4', 2]];
    for (const [c, x] of lanes) {
        k.add('box', c, { p: [x, h + 1.2, -0.4], r: [-0.42, 0, 0], s: [1.6, 0.16, 5.4] });
        k.add('box', PAL.white, { p: [x - 0.85, h + 1.3, -0.4], r: [-0.42, 0, 0], s: [0.1, 0.3, 5.4] });
    }
    k.add('box', PAL.white, { p: [2.85, h + 1.3, -0.4], r: [-0.42, 0, 0], s: [0.1, 0.3, 5.4] });
    // the snowy ski slope at the side
    k.add(new THREE.ConeGeometry(1.8, 2.8, 5), '#ffffff', { p: [3.4, h + 1.4, -2.9], r: [0, 0.4, 0] });
    k.add(new THREE.ConeGeometry(0.9, 1.4, 5), '#eef6ff', { p: [2.6, h + 0.7, -3.3], r: [0, 1, 0] });
    g.add(k.mesh());
    const blocks = lanes.map(([, x], i) => { const b = mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), mat('#a9b3bc')); b.userData = { x, i, t: i * 0.3 }; g.add(b); return b; });
    const skier = mesh(personGeo(61), VC);
    skier.scale.setScalar(0.7);
    g.add(skier);
    g.userData = { height: h + 3.4, blocks, skier, baseY: h };
    return g;
}
// Unit 2 · The farm yard (work): the horse and cart of the book, a
// wheelbarrow, a big rock and a haystack.
export function yard() {
    const g = new THREE.Group(), k = kit();
    const h = plinth(k, 2, { w: 8, d: 7 });
    // the cart with vegetables
    k.add(roundBox(2.2, 0.5, 1.4, 0.06), PAL.woodLight, { p: [0, h + 0.9, 0] });
    for (const s of [-1, 1])
        k.add('cyl', PAL.wood, { p: [0, h + 0.55, s * 0.78], r: [Math.PI / 2, 0, 0], s: [0.5, 0.12, 0.5] });
    for (let i = 0; i < 9; i++)
        k.add(LO, ['#5aa244', '#f28c3a', '#e8453c', '#f2c14e'][i % 4], { p: [-0.8 + (i % 5) * 0.4, h + 1.25, -0.3 + Math.floor(i / 5) * 0.5], s: 0.2 });
    k.add('box', PAL.wood, { p: [1.7, h + 0.85, 0], s: [1.6, 0.08, 0.08] });
    // a wheelbarrow, a rock, a haystack
    k.add('box', '#e8453c', { p: [-2.4, h + 0.6, 2.2], r: [0, 0.4, 0.1], s: [1, 0.4, 0.7] });
    k.add('cyl', '#3b3640', { p: [-2.9, h + 0.25, 1.9], r: [Math.PI / 2, 0, 0.4], s: [0.25, 0.08, 0.25] });
    k.add(new THREE.DodecahedronGeometry(1, 0), '#9aa5ad', { p: [2.6, h + 0.7, 2], r: [0.3, 0.6, 0], s: [0.9, 0.7, 0.8] });
    k.add('hemi', '#f2c14e', { p: [-2.6, h, -2.2], s: [1.1, 1.2, 1.1] });
    put(k, personGeo(70), 3.4, h, 2.2, -2.4, 1);
    put(k, personGeo(71), -1.2, h, 2.8, 0.2, 1);
    g.add(k.mesh());
    const horse = mesh(animalGeo('horse'), VC);
    horse.position.set(2.8, h, 0);
    horse.rotation.y = Math.PI / 2;
    g.add(horse);
    g.userData = { height: h + 2.2, horse, baseY: h };
    return g;
}
// Unit 3 · The body dome: a glass dome over a glowing urinary system —
// kidneys, ureters, bladder — on a white pedestal.
export function bodyDome() {
    const g = new THREE.Group(), k = kit();
    const h = plinth(k, 3, { r: 5 });
    k.add(new THREE.CylinderGeometry(1.4, 1.6, 0.8, 24), PAL.white, { p: [0, h + 0.4, -0.4] });
    k.add('torus', UNIT_COLORS[3], { p: [0, h + 0.05, -0.4], r: [Math.PI / 2, 0, 0], s: [4.2, 4.2, 1.2] });
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        k.add('cyl', PAL.white, { p: [Math.cos(a) * 4.1, h + 1.6, -0.4 + Math.sin(a) * 4.1], s: [0.12, 3.2, 0.12] });
    }
    g.add(k.mesh());
    const organ = new THREE.Group();
    const red = new THREE.MeshPhongMaterial({ color: '#b33a3a', emissive: '#5a0f14', shininess: 60 });
    for (const s of [-1, 1]) {
        const kid = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), red);
        kid.scale.set(0.75, 1.1, 0.55);
        kid.position.set(s * 0.75, s < 0 ? 1.95 : 2.1, 0);
        kid.castShadow = true;
        organ.add(kid);
        const ur = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.55, 1.75, 0.05), new THREE.Vector3(s * 0.4, 1.3, 0.1), new THREE.Vector3(s * 0.15, 0.9, 0.1)]), 16, 0.05, 6), mat('#f2d16a'));
        organ.add(ur);
    }
    const blad = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), new THREE.MeshPhongMaterial({ color: '#f29ac0', emissive: '#5a1f34', shininess: 50 }));
    blad.scale.set(1.1, 0.8, 0.9);
    blad.position.set(0, 0.78, 0.1);
    organ.add(blad);
    organ.position.set(0, h + 0.7, -0.4);
    g.add(organ);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#d6f4ff', transparent: true, opacity: 0.22, shininess: 120, specular: '#ffffff', depthWrite: false, side: THREE.DoubleSide }));
    dome.position.set(0, h + 3.2 - 3.2, -0.4);
    dome.scale.y = 0.92;
    g.add(dome);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.09, 6, 48), mat(PAL.white));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, h + 3.2, -0.4);
    g.add(ring);
    g.userData = { height: h + 4.4, organ, bladder: blad };
    return g;
}
// Unit 3 · The skin pavilion: a giant block of skin (the book's diagram) with
// hairs, and a giant fingerprint on a stand.
export function skinPavilion() {
    const g = new THREE.Group(), k = kit();
    const h = plinth(k, 3, { w: 8.4, d: 7 });
    const x0 = -1.2, z0 = -1.4;
    k.add(roundBox(3.6, 0.8, 2.6, 0.06), '#f7d36a', { p: [x0, h + 0.4, z0] });
    k.add(roundBox(3.6, 1.4, 2.6, 0.06), '#f8c6c6', { p: [x0, h + 1.5, z0] });
    k.add(roundBox(3.6, 0.45, 2.6, 0.06), '#f3b48a', { p: [x0, h + 2.42, z0] });
    for (let i = 0; i < 6; i++)
        k.add('cyl', '#3b2414', { p: [x0 - 1.3 + (i % 3) * 1.2, h + 3.1, z0 - 0.7 + Math.floor(i / 3) * 1.3], r: [(i % 2 - 0.5) * 0.4, 0, (i % 3 - 1) * 0.3], s: [0.05, 1.3, 0.05] });
    // the cut face: vessels, a sweat gland
    k.add('box', '#e8453c', { p: [x0, h + 1.1, z0 + 1.31], s: [3.4, 0.08, 0.02] });
    k.add('box', '#3f8fd6', { p: [x0, h + 0.95, z0 + 1.31], s: [3.4, 0.08, 0.02] });
    k.add('torus', '#d0507e', { p: [x0 + 0.9, h + 1.5, z0 + 1.32], s: [0.18, 0.18, 0.3] });
    // the fingerprint stand
    k.add('cyl', PAL.white, { p: [2.6, h + 0.9, -0.6], s: [0.14, 1.8, 0.14] });
    g.add(k.mesh());
    const fp = new THREE.Group();
    for (let i = 1; i <= 6; i++) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(i * 0.13, 0.025, 4, 32, Math.PI * (i % 2 ? 1.8 : 2)), mat('#6a3fb0'));
        r.rotation.z = i * 0.5;
        fp.add(r);
    }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), mat('#fbf4ff'));
    disc.position.z = -0.03;
    fp.add(disc);
    fp.position.set(2.6, h + 2.4, -0.6);
    fp.rotation.y = -0.4;
    g.add(fp);
    g.userData = { height: h + 4.2, print: fp };
    return g;
}
// Unit 4 · The builders' ramp: a long ramp up to a platform with a barrel
// that rolls up, stone blocks, a wedge in a split rock and a giant screw.
export function builders() {
    const g = new THREE.Group(), k = kit();
    const h = plinth(k, 4, { w: 8.6, d: 7.2 });
    k.add(roundBox(2.4, 1.8, 2.2, 0.08), PAL.stone, { p: [-2.6, h + 0.9, -1.6] });
    k.add('box', PAL.woodLight, { p: [0.4, h + 0.95, -1.6], r: [0, 0, 0.32], s: [4.4, 0.14, 1.4] });
    for (let i = 0; i < 4; i++)
        k.add(roundBox(0.8, 0.6, 0.8, 0.04), i % 2 ? PAL.stone : PAL.stoneDark, { p: [-2.9 + (i % 2) * 0.9, h + 2.1 + Math.floor(i / 2) * 0.6, -1.6 + (i % 2) * 0.1] });
    // split rock and wedge
    for (const s of [-1, 1])
        k.add(new THREE.DodecahedronGeometry(1, 0), '#a9b3bc', { p: [2.6 + s * 0.42, h + 0.5, 1.8], r: [0.2, s, 0], s: [0.5, 0.55, 0.7] });
    k.add(new THREE.ConeGeometry(0.28, 0.9, 4), '#7a858d', { p: [2.6, h + 1.2, 1.8], r: [Math.PI, 0, 0] });
    // a giant screw sculpture
    k.add('cyl', '#c2cad2', { p: [-2.8, h + 1.7, 1.8], s: [0.36, 3, 0.36] });
    k.add('cyl', '#c2cad2', { p: [-2.8, h + 3.3, 1.8], s: [0.75, 0.3, 0.75] });
    for (let i = 0; i < 8; i++)
        k.add('torus', '#a9b3bc', { p: [-2.8, h + 0.6 + i * 0.32, 1.8], r: [Math.PI / 2 - 0.12, 0, 0], s: [0.4, 0.4, 0.6] });
    k.add(new THREE.ConeGeometry(0.36, 0.5, 12), '#c2cad2', { p: [-2.8, h + 0.1, 1.8], r: [Math.PI, 0, 0] });
    put(k, personGeo(80), 2.4, h, -0.2, -0.6, 1);
    g.add(k.mesh());
    const barrel = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 14), mat('#b8723a'));
    barrel.rotation.x = Math.PI / 2;
    g.add(barrel);
    g.userData = { height: h + 3.8, barrel, baseY: h };
    return g;
}
// Unit 4 · The machines square: a seesaw lever, a crane with pulleys, a well
// with a pulley, and a noria (wheel and axle) turning in its channel.
export function machines() {
    const g = new THREE.Group(), k = kit();
    const h = plinth(k, 4, { w: 9.4, d: 7.6 });
    // the seesaw's fulcrum and a rock at one end (the beam rocks)
    k.add(new THREE.ConeGeometry(0.5, 0.7, 3), '#2fb3a8', { p: [-2.4, h + 0.35, 2] });
    // the crane
    k.add('box', '#f2c14e', { p: [2.8, h + 2.6, -2.4], s: [0.3, 5.2, 0.3] });
    k.add('box', '#f2c14e', { p: [1.6, h + 5.1, -2.4], s: [3.2, 0.26, 0.3] });
    k.add('cyl', '#3b3640', { p: [0.3, h + 4.9, -2.4], r: [Math.PI / 2, 0, 0], s: [0.24, 0.14, 0.24] });
    // the well
    k.add(new THREE.CylinderGeometry(0.8, 0.85, 0.8, 18, 1, true), '#c9b48a', { p: [0.4, h + 0.4, 2.2] });
    for (const s of [-1, 1])
        k.add('box', PAL.wood, { p: [0.4 + s * 0.8, h + 1.2, 2.2], s: [0.12, 1.6, 0.12] });
    k.add('box', PAL.wood, { p: [0.4, h + 2, 2.2], s: [1.8, 0.12, 0.12] });
    k.add('cyl', '#7a858d', { p: [0.4, h + 1.82, 2.2], r: [0, 0, Math.PI / 2], s: [0.18, 0.1, 0.18] });
    // the noria's channel and pillars
    k.add('box', '#7fc4e8', { p: [-2.6, h + 0.08, -2.6], s: [3.6, 0.1, 1.2] });
    for (const s of [-1, 1])
        k.add('box', PAL.stone, { p: [-2.6, h + 1.3, -2.6 + s * 0.7], s: [0.4, 2.6, 0.24] });
    g.add(k.mesh());
    const beam = new THREE.Group();
    const bk = kit();
    bk.add('box', PAL.woodLight, { s: [3.4, 0.14, 0.36] });
    bk.add(new THREE.DodecahedronGeometry(1, 0), '#9aa5ad', { p: [1.4, 0.32, 0], s: 0.32 });
    bk.add('box', '#e8453c', { p: [-1.5, 0.2, 0], s: [0.2, 0.26, 0.3] });
    beam.add(mesh(bk.geometry(), VC));
    beam.position.set(-2.4, h + 0.76, 2);
    g.add(beam);
    const hook = new THREE.Group();
    const rope = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), mat('#3b2414'));
    rope.position.y = 0.5;
    hook.add(rope);
    const crate = mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), mat('#c99863'));
    crate.position.y = -0.3;
    hook.add(crate);
    hook.position.set(0.3, h + 4.8, -2.4);
    g.add(hook);
    const bucket = mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 10), mat('#3f8fd6'));
    bucket.position.set(0.4, h + 1.2, 2.2);
    g.add(bucket);
    // The noria stands in its channel: the wheel turns about an axle along Z.
    const noria = new THREE.Group();
    const nk = kit();
    nk.add('torus', PAL.wood, { s: [1.25, 1.25, 1.4] });
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        nk.add('box', PAL.woodLight, { p: [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0], r: [0, 0, a + Math.PI / 2], s: [0.08, 1.24, 0.1] });
        nk.add('box', '#7a5130', { p: [Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0], r: [0, 0, a], s: [0.16, 0.22, 0.5] });
    }
    nk.add('cyl', '#5a3a22', { r: [Math.PI / 2, 0, 0], s: [0.14, 1.5, 0.14] });
    noria.add(mesh(nk.geometry(), VC));
    noria.position.set(-2.6, h + 1.5, -2.6);
    g.add(noria);
    g.userData = { height: h + 5.6, beam, hook, rope, bucket, noria, baseY: h };
    return g;
}
// Unit 4 · قلعة الحصن on the hill: concentric walls, round towers, a gate.
export function castle() {
    const g = new THREE.Group(), k = kit();
    const s1 = '#e3d2ab', s2 = '#d4bf92', s3 = '#c4ac7c';
    const h = 0.1;
    // outer wall ring with towers
    const ring = (r, wh, n, col, tr) => {
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2, x1 = Math.cos(a) * r, z1 = Math.sin(a) * r * 0.75, x2 = Math.cos(b) * r, z2 = Math.sin(b) * r * 0.75;
            const len = Math.hypot(x2 - x1, z2 - z1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
            if (!(i === Math.round(n * 0.25) && r > 4))
                k.add('box', col, { p: [mx, h + wh / 2, mz], r: [0, -Math.atan2(z2 - z1, x2 - x1), 0], s: [len + 0.1, wh, 0.55] });
            k.add(new THREE.CylinderGeometry(tr, tr * 1.12, wh + 0.9, 14), col, { p: [x1, h + (wh + 0.9) / 2, z1] });
            for (let j = 0; j < 6; j++) {
                const c = (j / 6) * Math.PI * 2;
                k.add('box', col, { p: [x1 + Math.cos(c) * tr * 0.9, h + wh + 1.05, z1 + Math.sin(c) * tr * 0.9], s: [0.24, 0.3, 0.24] });
            }
        }
    };
    ring(5.6, 1.8, 8, s2, 0.6);
    ring(3, 3, 6, s1, 0.75);
    k.add(roundBox(3.4, 3.6, 2.6, 0.06), s1, { p: [0, h + 1.8, -0.4] });
    k.add(new THREE.CylinderGeometry(0.9, 1, 5, 14), s1, { p: [-0.6, h + 2.5, -1.4] });
    k.add(new THREE.CylinderGeometry(1, 0.95, 0.3, 14), s3, { p: [-0.6, h + 5.1, -1.4] });
    k.add('box', '#6b4a2a', { p: [0, h + 0.7, 4.22], s: [1, 1.4, 0.3] });
    k.add('hemi', '#6b4a2a', { p: [0, h + 1.4, 4.22], s: [0.5, 0.4, 0.2] });
    const m = k.mesh();
    g.add(m);
    g.userData = { height: 6.4 };
    return g;
}
// The lighthouse of science at the harbour: a white and blue tower; its
// lantern holds one crystal per quest, lit as quests are finished.
export function lighthouse(n = 17) {
    const g = new THREE.Group(), k = kit();
    k.add(new THREE.CylinderGeometry(1.6, 1.8, 0.6, 20), PAL.stone, { p: [0, 0.3, 0] });
    for (let i = 0; i < 5; i++)
        k.add(new THREE.CylinderGeometry(1.2 - i * 0.1, 1.28 - i * 0.1, 1.2, 20), i % 2 ? '#3f8fd6' : PAL.white, { p: [0, 1.2 + i * 1.2, 0] });
    k.add(new THREE.CylinderGeometry(1.15, 1.15, 0.2, 20), '#3b3640', { p: [0, 6.7, 0] });
    k.add(new THREE.ConeGeometry(1.05, 1, 20), '#e8453c', { p: [0, 8.6, 0] });
    k.add('box', '#6b4a2a', { p: [0, 1.1, 1.22], s: [0.5, 0.9, 0.08] });
    g.add(k.mesh());
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.4, 20, 1, true), new THREE.MeshPhongMaterial({ color: '#d6f4ff', transparent: true, opacity: 0.35, shininess: 120, side: THREE.DoubleSide, depthWrite: false }));
    glass.position.y = 7.5;
    g.add(glass);
    const crystals = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, c = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshLambertMaterial({ color: '#8fa3b0', emissive: '#000000' }));
        c.position.set(Math.cos(a) * 0.55, 7.2 + (i % 2) * 0.45, Math.sin(a) * 0.55);
        g.add(c);
        crystals.push(c);
    }
    const lamp = glow('#fff2b0', 3.4, 0.0);
    lamp.position.y = 7.5;
    g.add(lamp);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.4, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }));
    beam.rotation.z = Math.PI / 2;
    beam.position.set(7, 7.5, 0);
    const beamPivot = new THREE.Group();
    beamPivot.position.y = 0;
    beamPivot.add(beam);
    g.add(beamPivot);
    g.userData = { height: 9.4, crystals, lamp, beam, beamPivot };
    return g;
}
// ---------- The helper «شرارة»: a little round lab robot ----------
export function helperBot() {
    const g = new THREE.Group(), k = kit();
    k.add(LO, '#fbfbf8', { p: [0, 0.42, 0], s: [0.42, 0.4, 0.4] });
    k.add(LO, '#2fb3a8', { p: [0, 0.5, 0.22], s: [0.3, 0.2, 0.22] });
    k.eyes({ x: 0.11, y: 0.5, z: 0.4, r: 0.07, look: 0.4 });
    k.add('torus', '#2fb3a8', { p: [0, 0.2, 0], r: [Math.PI / 2, 0, 0], s: [0.38, 0.38, 0.5] });
    for (const s of [-1, 1]) {
        k.add('cyl', '#9aa5ad', { p: [s * 0.46, 0.38, 0], r: [0, 0, s * 0.9], s: [0.04, 0.24, 0.04] });
        k.add(LO, '#f28c3a', { p: [s * 0.56, 0.3, 0], s: 0.07 });
    }
    k.add('cyl', '#9aa5ad', { p: [0, 0.92, 0], s: [0.025, 0.28, 0.025] });
    k.add('cyl', '#3b3640', { p: [0, 0.03, 0], s: [0.2, 0.06, 0.2] });
    const body = mesh(k.geometry(), VC);
    g.add(body);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshLambertMaterial({ color: '#fff2a8', emissive: '#ffd23f', emissiveIntensity: 0.9 }));
    bulb.position.y = 1.1;
    g.add(bulb);
    const shine = glow('#ffe066', 0.7, 0.8);
    shine.position.y = 1.1;
    g.add(shine);
    g.userData = { bulb, shine };
    return g;
}
