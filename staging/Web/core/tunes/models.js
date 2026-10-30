// Made from models.ts by tools/build.ts. Edit that file, then run: npm run build
// The music island's 3D models, all made in code (no model or image files):
// a tall toy-diorama island with terraces, a winding path and eight
// landmarks, each on its own raised base — the giant grand piano, the glass
// pavilion, the drum circle, the metronome tower, the cloud over the grand
// staff, the music library, the basalt theatre (after Bosra's) and the
// harbour of world instruments — plus puffy trees, tiny people, festival
// bunting, note lanterns, the helper «نغمة» and the book's note-car.
//
// Like the farm (core/farm/models.js, whose Kit this reuses), most models are
// many simple shapes merged into one mesh with vertex colours: one draw call
// each on budget phones. Units: 1 ≈ 1 metre; Y is up; the camera looks from +Z.
//
// The browser loads models.js, made from this file by `npm run build`.
import * as THREE from '../../vendor/three/three.module.min.js';
import { Kit, VC, rng, roundBox, dhow } from '../farm/models.js';
const kit = () => new Kit();
const C = (h) => new THREE.Color(h);
// Low-poly spheres for the many small things (trees, bushes, people), so a
// whole forest stays light on budget phones.
const LO = new THREE.SphereGeometry(1, 10, 7), TINY = new THREE.SphereGeometry(1, 7, 5);
export const PAL = {
    grass: '#a5d66c', grassB: '#9bd068', grassC: '#93ca62',
    cliff: '#eebd82', cliffDark: '#cf8f58', sand: '#f8dfa6', sandSide: '#e9c584',
    path: '#f7e9c8', pathEdge: '#e4cc9c',
    cream: '#f6ead2', stone: '#e9d6b4', ablaq: '#4d434c', basalt: '#5d5862', basaltTop: '#7a747f',
    wood: '#a8703f', woodLight: '#c99863', gold: '#f2c14e', red: '#d23b52', curtain: '#c8324a',
    teal: '#2fb3a8', pink: '#ec79a8', purple: '#8a63c9', orange: '#f28c3a', blue: '#3f8fd6', ink: '#3b2414',
};
export const NOTE_COLORS = ['#e8453c', '#f28c3a', '#f6c632', '#4fbf5a', '#2fb3a8', '#3f8fd6', '#8a63c9', '#e8453c'];
// ---------- Ground: terraces, path, ramps ----------
// Three levels of ground, stepping up towards the back of the island.
export const LEVELS = [{ top: 0.9, z: [-36, 35] }, { top: 2.1, z: [-36, 14] }, { top: 3.3, z: [-36, -12] }];
export function levelAt(z) { return z < -12 ? 3.3 : z < 14 ? 2.1 : 0.9; }
// Height along the path, with ramps where it climbs a terrace.
const RAMPS = [[17.6, 14, 0.9, 2.1], [-8.2, -12, 2.1, 3.3]];
export function pathY(z) {
    for (const [z0, z1, y0, y1] of RAMPS)
        if (z <= z0 && z >= z1) {
            const t = (z0 - z) / (z0 - z1);
            return y0 + (y1 - y0) * t * t * (3 - 2 * t);
        }
    return levelAt(z);
}
// A rounded, gently wobbly outline (a superellipse), as a Shape whose y is
// world −z (slabs are laid flat with rotateX(−π/2)).
function outline(cx, cz, hx, hz, { n = 5, wob = 0.5, seed = 1, pts = 120 } = {}) {
    const s = new THREE.Shape();
    for (let i = 0; i <= pts; i++) {
        const t = (i / pts) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
        const w = 1 + (wob / Math.max(hx, hz)) * (Math.sin(t * 5 + seed) * 0.6 + Math.sin(t * 9 + seed * 2.1) * 0.4);
        const x = cx + hx * Math.sign(c) * Math.abs(c) ** (2 / n) * w, z = cz + hz * Math.sign(sn) * Math.abs(sn) ** (2 / n) * w;
        if (i)
            s.lineTo(x, -z);
        else
            s.moveTo(x, -z);
    }
    return s;
}
// A flat slab with its top at `top`: grass on top, a sandstone cliff (darker
// at the foot) on the sides.
function slab(shape, { top, depth, bevel = 0.35, cap, side, sideDark }) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, top - depth - bevel, 0);
    g.deleteAttribute('uv');
    const ng = g.index ? g.toNonIndexed() : g;
    if (ng !== g)
        g.dispose();
    const pos = ng.attributes.position, nor = ng.attributes.normal, col = new Float32Array(pos.count * 3);
    const cTop = C(cap), cSide = C(side), cDark = C(sideDark || side), tmp = new THREE.Color();
    const bottom = top - depth - bevel * 2;
    for (let i = 0; i < pos.count; i++) {
        const up = nor.getY(i) > 0.6;
        if (up)
            tmp.copy(cTop);
        else
            tmp.copy(cDark).lerp(cSide, Math.min(1, Math.max(0, (pos.getY(i) - bottom) / (top - bottom))));
        col[i * 3] = tmp.r;
        col[i * 3 + 1] = tmp.g;
        col[i * 3 + 2] = tmp.b;
    }
    ng.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return ng;
}
export const ISLE = { cx: 0, cz: -0.5, hx: 18.5, hz: 39 };
export function terrain() {
    const k = kit();
    k.parts.push(slab(outline(ISLE.cx, ISLE.cz, ISLE.hx, ISLE.hz, { n: 4, wob: 0.9, seed: 2 }), { top: 0.35, depth: 1.2, bevel: 0.6, cap: PAL.sand, side: PAL.sandSide }));
    k.parts.push(slab(outline(0, -0.5, 15.6, 35.6, { n: 5, wob: 0.8, seed: 4 }), { top: 0.9, depth: 0.5, cap: PAL.grass, side: PAL.cliff, sideDark: PAL.cliffDark }));
    k.parts.push(slab(outline(0, -11, 15.1, 25, { n: 6, wob: 0.6, seed: 6 }), { top: 2.1, depth: 1.1, cap: PAL.grassB, side: PAL.cliff, sideDark: PAL.cliffDark }));
    k.parts.push(slab(outline(0, -24, 14.4, 12, { n: 6, wob: 0.5, seed: 8 }), { top: 3.3, depth: 1.1, cap: PAL.grassC, side: PAL.cliff, sideDark: PAL.cliffDark }));
    const m = k.mesh();
    m.castShadow = false;
    return m;
}
// The winding path: a ribbon with a darker edge, following the terraces.
export const PATH_POINTS = [[14, 30.5], [7, 27], [1.5, 23], [0.8, 18.5], [1, 13.5], [1.4, 8], [0.4, 2], [0.8, -3.5], [1.2, -8.5], [1, -12.5], [0, -17.5], [0.8, -22.5], [0.2, -26]];
export function pathCurve() {
    return new THREE.CatmullRomCurve3(PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, pathY(z), z)), false, 'centripetal');
}
export function pathRibbon(curve, w = 2.8) {
    const N = 260, pos = [], col = [], nor = [];
    const edge = C(PAL.pathEdge), mid = C(PAL.path);
    const ring = [];
    for (let i = 0; i <= N; i++) {
        const p = curve.getPointAt(i / N), t = curve.getTangentAt(i / N);
        const nx = -t.z, nz = t.x, l = Math.hypot(nx, nz) || 1;
        const y = pathY(p.z) + 0.04;
        ring.push([-w / 2, -w / 2 + 0.28, w / 2 - 0.28, w / 2].map(o => [p.x + (nx / l) * o, y, p.z + (nz / l) * o]));
    }
    const cols = [edge, mid, mid, edge];
    for (let i = 0; i < N; i++)
        for (let j = 0; j < 3; j++) {
            const a = ring[i][j], b = ring[i][j + 1], c = ring[i + 1][j], d = ring[i + 1][j + 1];
            for (const [v, cc] of [[a, cols[j]], [b, cols[j + 1]], [c, cols[j]], [b, cols[j + 1]], [d, cols[j + 1]], [c, cols[j]]]) {
                pos.push(...v);
                col.push(cc.r, cc.g, cc.b);
                nor.push(0, 1, 0);
            }
        }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.receiveShadow = true;
    // ramps: a sloped block under each climb
    const k = kit();
    for (const [z0, z1, y0, y1] of RAMPS) {
        const zm = (z0 + z1) / 2, near = curve.getPoints(80).reduce((b, p) => (Math.abs(p.z - zm) < Math.abs(b.z - zm) ? p : b));
        const len = Math.hypot(z0 - z1, y1 - y0), ang = Math.atan2(y1 - y0, z0 - z1);
        k.add('box', PAL.cliff, { p: [near.x, (y0 + y1) / 2 - 0.55, zm], r: [ang, 0, 0], s: [w + 0.4, 1, len + 0.2] });
        for (const sx of [-1, 1])
            for (let i = 0; i < 4; i++)
                k.add('box', PAL.woodLight, { p: [near.x + sx * (w / 2 + 0.25), y0 + (y1 - y0) * (i / 3) + 0.35, z0 - (z0 - z1) * (i / 3)], s: [0.12, 0.7, 0.12] });
    }
    const ramps = k.mesh();
    const g2 = new THREE.Group();
    g2.add(m, ramps);
    return g2;
}
// ---------- Shared bits ----------
// Place a ready-coloured geometry (from Kit.geometry()) into another kit.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function put(k, geo, x, y, z, ry = 0, s = 1) {
    const g = geo.clone();
    g.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(s, s, s)));
    k.parts.push(g);
}
function plinth(k, { r, w, d, h = 0.55, top = PAL.cream, side = PAL.stone, trim = PAL.gold, steps = true, seg = 28 }) {
    if (r) {
        k.add(new THREE.CylinderGeometry(r, r + 0.15, h, seg), side, { p: [0, h / 2, 0] });
        k.add(new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.1, seg), trim, { p: [0, h - 0.02, 0] });
        k.add(new THREE.CylinderGeometry(r - 0.05, r - 0.05, 0.06, seg), top, { p: [0, h + 0.05, 0] });
    }
    else if (w !== undefined && d !== undefined) {
        k.add(roundBox(w, h, d, 0.08), side, { p: [0, h / 2, 0] });
        k.add(roundBox(w + 0.14, 0.1, d + 0.14, 0.04), trim, { p: [0, h - 0.02, 0] });
        k.add(roundBox(w - 0.1, 0.06, d - 0.1, 0.03), top, { p: [0, h + 0.05, 0] });
    }
    if (steps) {
        const front = r || d / 2;
        for (let i = 0; i < 2; i++)
            k.add(roundBox(2.2 - i * 0.4, h / 2, 0.42, 0.04), i ? top : side, { p: [0, (h / 2) * (i + 0.5) - 0.02, front + 0.32 - i * 0.3] });
    }
    return h + 0.08;
}
// ---------- Little things: trees, bushes, people, lamps, bunting ----------
export function treeGeo(kind = 0, seed = 1) {
    const r = rng(seed * 29 + 3), k = kit();
    const leaves = [['#7cc35a', '#6ab44c', '#8fd06a'], ['#f39a3c', '#f6b24a', '#e8842e'], ['#f29ac0', '#f7b6d2', '#e984b0'], ['#5fae4a', '#4f9e40', '#72c05a']][kind % 4];
    const h = 0.9 + r() * 0.4;
    k.add(new THREE.CylinderGeometry(0.12, 0.18, h, 8), '#9a6a3c', { p: [0, h / 2, 0] });
    k.add(LO, leaves[0], { p: [0, h + 0.75, 0], s: 0.95 });
    k.add(LO, leaves[1], { p: [0.5, h + 0.45, 0.25], s: 0.62 });
    k.add(LO, leaves[2], { p: [-0.45, h + 0.5, -0.2], s: 0.6 });
    if (kind === 1)
        for (let i = 0; i < 6; i++) {
            const a = r() * 6.28;
            k.add(LO, '#e8453c', { p: [Math.cos(a) * 0.9, h + 0.4 + r() * 0.8, Math.sin(a) * 0.9], s: 0.11 });
        }
    return k.geometry();
}
export function bushGeo(seed = 1, color = '#6ab44c') {
    const r = rng(seed * 11 + 1), k = kit();
    for (let i = 0; i < 3; i++)
        k.add(LO, i % 2 ? color : '#5aa244', { p: [(r() - 0.5) * 0.7, 0.32 + r() * 0.12, (r() - 0.5) * 0.5], s: 0.34 + r() * 0.1 });
    if (seed % 3 === 0)
        for (let i = 0; i < 4; i++)
            k.add(LO, ['#ffffff', '#ffd23f', '#ec79a8'][seed % 3 ? 1 : i % 3], { p: [(r() - 0.5) * 0.8, 0.55 + r() * 0.15, (r() - 0.5) * 0.6], s: 0.07 });
    return k.geometry();
}
export function rockGeo(seed = 1, size = 0.5) {
    const r = rng(seed * 17 + 3), k = kit();
    k.add(new THREE.DodecahedronGeometry(1, 0), '#c9bfae', { p: [0, size * 0.4, 0], r: [r(), r() * 3, r()], s: [size, size * 0.7, size * 0.9] });
    return k.geometry();
}
const SKIN = ['#f6c9a0', '#e8b48a', '#c98f62', '#a86f48', '#f3d2b3'];
const CLOTH = ['#ec79a8', '#3f8fd6', '#f2c14e', '#4fbf5a', '#8a63c9', '#f28c3a', '#2fb3a8', '#e8453c', '#ffffff'];
// A tiny person (about 1 m), standing or sitting, facing +Z.
export function personGeo(seed = 1, { sit = false, prop = null } = {}) {
    const r = rng(seed * 37 + 11), k = kit();
    const skin = SKIN[Math.floor(r() * SKIN.length)], shirt = CLOTH[Math.floor(r() * CLOTH.length)], pants = ['#3b4a7a', '#5a3a22', '#2d2a35', '#6b7a8a'][Math.floor(r() * 4)];
    const scarf = r() < 0.3, hair = ['#3b2414', '#1f1612', '#7a4a2a', '#c98a3a'][Math.floor(r() * 4)];
    if (sit) {
        for (const sx of [-1, 1]) {
            k.add('cyl', pants, { p: [sx * 0.09, 0.42, 0.14], r: [Math.PI / 2, 0, 0], s: [0.07, 0.3, 0.07] });
            k.add('cyl', pants, { p: [sx * 0.09, 0.22, 0.29], s: [0.065, 0.42, 0.065] });
        }
    }
    else
        for (const sx of [-1, 1])
            k.add('cyl', pants, { p: [sx * 0.09, 0.22, 0], s: [0.07, 0.44, 0.07] });
    const by = sit ? 0.62 : 0.6;
    k.add(new THREE.CapsuleGeometry(0.16, 0.18, 4, 10), shirt, { p: [0, by, 0] });
    for (const sx of [-1, 1])
        k.add('cyl', shirt, { p: [sx * 0.2, by + 0.02, 0.04], r: [0.5, 0, sx * 0.25], s: [0.05, 0.28, 0.05] });
    k.add(TINY, skin, { p: [0, by + 0.36, 0], s: 0.16 });
    if (scarf)
        k.add(TINY, ['#ec79a8', '#8a63c9', '#2fb3a8', '#f28c3a'][Math.floor(r() * 4)], { p: [0, by + 0.39, -0.02], s: [0.18, 0.18, 0.17] });
    else
        k.add(TINY, hair, { p: [0, by + 0.42, -0.03], s: [0.165, 0.12, 0.16] });
    k.add(TINY, '#2a1a10', { p: [-0.055, by + 0.37, 0.145], s: 0.022 }).add('sphere', '#2a1a10', { p: [0.055, by + 0.37, 0.145], s: 0.022 });
    if (prop === 'drum')
        k.add(new THREE.CylinderGeometry(0.13, 0.08, 0.3, 10), '#d9894a', { p: [0, by - 0.12, 0.24], r: [0.3, 0, 0] });
    if (prop === 'book')
        k.add('box', '#fff8e8', { p: [0, by + 0.05, 0.2], r: [-0.4, 0, 0], s: [0.24, 0.16, 0.03] });
    if (prop === 'violin')
        k.add(TINY, '#a8562a', { p: [0.12, by + 0.2, 0.12], s: [0.09, 0.05, 0.16] });
    return k.geometry();
}
// A lamp post with a glowing lantern shaped like a musical note.
export function lampGeo(color = '#f2c14e') {
    const k = kit();
    k.add('cyl', '#4d434c', { p: [0, 1.1, 0], s: [0.06, 2.2, 0.06] });
    k.add('cyl', '#4d434c', { p: [0, 0.08, 0], s: [0.18, 0.16, 0.18] });
    k.add('box', '#4d434c', { p: [0.22, 2.15, 0], s: [0.5, 0.05, 0.05] });
    return k.geometry();
}
// A musical note (eighth note) made of shapes: head, stem, flag.
export function noteGeo(color, { s = 1, flag = true } = {}) {
    const k = kit();
    k.add('sphere', color, { p: [0, 0.18 * s, 0], r: [0, 0, 0.45], s: [0.24 * s, 0.17 * s, 0.14 * s] });
    k.add('cyl', color, { p: [0.19 * s, 0.62 * s, 0], s: [0.035 * s, 0.86 * s, 0.035 * s] });
    if (flag)
        k.add(new THREE.TorusGeometry(0.22 * s, 0.035 * s, 6, 12, Math.PI * 0.75), color, { p: [0.4 * s, 0.9 * s, 0], r: [0, 0, Math.PI * 0.55] });
    return k.geometry();
}
// Festival bunting: a sagging string of little triangle flags between two poles.
export function bunting(a, b, seed = 1) {
    const k = kit(), r = rng(seed);
    for (const p of [a, b])
        k.add('cyl', '#9a6a3c', { p: [p[0], p[1] + 1.3, p[2]], s: [0.07, 2.6, 0.07] });
    const n = 12;
    for (let i = 0; i <= n; i++) {
        const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t + 2.5 - Math.sin(t * Math.PI) * 0.55;
        if (i < n)
            k.add('box', '#fff8e8', { p: [x + (b[0] - a[0]) / n / 2, y + 0.02, z + (b[2] - a[2]) / n / 2], r: [0, -Math.atan2(b[2] - a[2], b[0] - a[0]), 0], s: [Math.hypot(b[0] - a[0], b[2] - a[2]) / n, 0.02, 0.02] });
        if (i > 0 && i < n) {
            const tri = new THREE.ConeGeometry(0.18, 0.36, 3);
            tri.rotateX(Math.PI);
            k.add(tri, NOTE_COLORS[Math.floor(r() * 7)], { p: [x, y - 0.17, z], r: [0, -Math.atan2(b[2] - a[2], b[0] - a[0]) + Math.PI / 6, 0], s: [1, 1, 0.25] });
        }
    }
    return k.mesh();
}
// A soft glow sprite texture.
let glowTex = null;
export function glowTexture() {
    if (glowTex)
        return glowTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
    return glowTex;
}
export function glow(color, size = 1.6, opacity = 0.75) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity }));
    s.scale.set(size, size, 1);
    return s;
}
// A floating ♪ / ♫ picture, for notes that rise from the places.
const noteTex = {};
export function noteSprite(color = '#8a63c9', ch = '♪') {
    const key = color + ch;
    if (!noteTex[key]) {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d');
        g.font = 'bold 52px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 7;
        g.strokeStyle = '#fff';
        g.strokeText(ch, 32, 34);
        g.fillStyle = color;
        g.fillText(ch, 32, 34);
        noteTex[key] = new THREE.CanvasTexture(c);
        noteTex[key].colorSpace = THREE.SRGBColorSpace;
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex[key], transparent: true, depthWrite: false }));
    s.scale.set(0.8, 0.8, 1);
    return s;
}
// ---------- 1. The giant grand piano ----------
const PIANO_BLACK = new THREE.MeshPhongMaterial({ color: '#2a2531', specular: '#ffffff', shininess: 70 });
const KEY_WHITE = new THREE.MeshLambertMaterial({ color: '#fffaf0' });
const KEY_BLACK = new THREE.MeshPhongMaterial({ color: '#1f1b24', specular: '#888888', shininess: 60 });
function pianoShape() {
    // Seen from above, the keyboard along y = 0; the tail at the back (y > 0 → world −z).
    const s = new THREE.Shape();
    s.moveTo(-3, 0);
    s.lineTo(3, 0);
    s.lineTo(3, 1.0);
    s.bezierCurveTo(3, 3.0, 0.7, 3.3, 0.4, 5.2);
    s.bezierCurveTo(0.15, 6.8, -1.2, 7.3, -2.1, 7.1);
    s.quadraticCurveTo(-3, 6.9, -3, 6.0);
    s.lineTo(-3, 0);
    return s;
}
export const WHITE_KEYS = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
export const BLACK_KEYS = [['C#4', 1], ['D#4', 2], ['F#4', 4], ['G#4', 5], ['A#4', 6]];
export function grandPiano() {
    const g = new THREE.Group();
    const k = kit();
    const top = plinth(k, { r: 5.2, top: '#fbf3e3', side: '#e9cfa6', trim: PAL.gold });
    // musical-staff mosaic on the base: five thin lines around the front
    for (let i = 0; i < 5; i++)
        k.add(new THREE.TorusGeometry(4.3 - i * 0.12, 0.018, 4, 48, Math.PI * 0.9), '#d8b98a', { p: [0, top + 0.01, 0], r: [-Math.PI / 2, 0, Math.PI * 0.05] });
    g.add(k.mesh());
    const P = new THREE.Group();
    P.position.set(0, top, 0);
    g.add(P);
    const legH = 1.25, caseH = 1.0, z0 = 2.6; // keyboard front edge at z = z0
    const shape = pianoShape();
    const caseGeo = new THREE.ExtrudeGeometry(shape, { depth: caseH, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 14 });
    caseGeo.rotateX(-Math.PI / 2);
    const body = new THREE.Mesh(caseGeo, PIANO_BLACK);
    body.position.set(0, legH, z0 - 0.9);
    body.castShadow = true;
    P.add(body);
    // golden harp and strings, seen under the open lid
    const kk = kit();
    const inner = new THREE.ShapeGeometry(pianoShape(), 10);
    inner.rotateX(-Math.PI / 2);
    kk.add(inner, '#e6b54a', { p: [0, legH + caseH - 0.05, z0 - 0.9], s: [0.9, 1, 0.9] });
    for (let i = 0; i < 17; i++) {
        const x = -2.6 + i * 0.33, L = 0.85 * (7.0 - ((x + 3) * 5.8) / 6) - 0.4;
        kk.add('box', '#fff1c4', { p: [x, legH + caseH + 0.01, z0 - 0.9 - 0.3 - L / 2], s: [0.025, 0.02, L] });
    }
    kk.add('box', '#2a2531', { p: [0, legH + 0.8, z0 - 0.03], s: [6.2, 0.4, 1.75] }); // keybed
    for (const x of [-3.15, 3.15])
        kk.add(roundBox(0.3, 0.6, 1.75, 0.05), '#2a2531', { p: [x, legH + 1.05, z0 - 0.03] });
    kk.add('box', '#2a2531', { p: [0, legH + 1.05, z0 - 0.95], s: [6.2, 0.35, 0.18] }); // fallboard
    kk.add('box', PAL.gold, { p: [0, legH + 1.08, z0 - 0.85], s: [1.0, 0.06, 0.02] });
    for (const [x, z] of [[-2.7, z0 - 0.8], [2.6, z0 - 0.8], [-1.6, z0 - 6.6]]) {
        kk.add(new THREE.CylinderGeometry(0.22, 0.15, legH, 10), '#2a2531', { p: [x, legH / 2, z] });
        kk.add('sphere', PAL.gold, { p: [x, 0.1, z], s: 0.14 });
    }
    // pedals
    kk.add('box', '#2a2531', { p: [0, 0.55, z0 - 1.6], s: [0.25, 1.1, 0.25] });
    kk.add('box', '#2a2531', { p: [0, 0.12, z0 - 1.45], s: [0.9, 0.18, 0.4] });
    for (const x of [-0.25, 0, 0.25])
        kk.add('box', PAL.gold, { p: [x, 0.16, z0 - 1.15], s: [0.1, 0.05, 0.35] });
    // music stand with a sheet of music
    kk.add('box', '#2a2531', { p: [0, legH + 1.55, z0 - 1.25], r: [-0.25, 0, 0], s: [2.2, 0.9, 0.08] });
    kk.add('box', '#fffaf0', { p: [0, legH + 1.56, z0 - 1.2], r: [-0.25, 0, 0], s: [1.9, 0.72, 0.02] });
    for (let i = 0; i < 4; i++)
        kk.add('box', '#3b2414', { p: [0, legH + 1.33 + i * 0.13, z0 - 1.17 + i * 0.03], r: [-0.25, 0, 0], s: [1.7, 0.012, 0.012] });
    // the bench
    kk.add(roundBox(2.4, 0.3, 0.9, 0.1), '#d23b52', { p: [0, 0.95, z0 + 1.6] });
    kk.add('box', '#2a2531', { p: [0, 0.4, z0 + 1.6], s: [2.2, 0.8, 0.7] });
    // lid prop stick
    kk.add('cyl', '#2a2531', { p: [1.6, legH + caseH + 1.1, z0 - 3.4], r: [0, 0, -0.32], s: [0.05, 2.4, 0.05] });
    const deco = kk.mesh();
    P.add(deco);
    // the lid, propped open along the straight side
    const lidGeo = new THREE.ExtrudeGeometry(pianoShape(), { depth: 0.1, bevelEnabled: false, curveSegments: 14 });
    lidGeo.rotateX(-Math.PI / 2);
    lidGeo.translate(3, 0, 0);
    const lid = new THREE.Mesh(lidGeo, PIANO_BLACK);
    lid.position.set(-3, legH + caseH + 0.06, z0 - 0.9);
    lid.rotation.z = 0.62;
    lid.castShadow = true;
    P.add(lid);
    // keys: each its own mesh, so a tapped key goes down
    const keys = {};
    const kw = 6 / 8, ky = legH + 1.12, kz = z0 + 0.05;
    const capGeo = new THREE.BoxGeometry(kw - 0.06, 0.24, 1.5);
    WHITE_KEYS.forEach((n, i) => {
        const m = new THREE.Mesh(capGeo, KEY_WHITE);
        m.position.set(-3 + kw * (i + 0.5), ky, kz);
        m.castShadow = true;
        m.receiveShadow = true;
        const dot = new THREE.Mesh(new THREE.BoxGeometry(kw - 0.2, 0.06, 0.06), new THREE.MeshLambertMaterial({ color: NOTE_COLORS[i] }));
        dot.position.set(0, 0.0, 0.76);
        m.add(dot);
        m.userData = { note: n, y: ky };
        P.add(m);
        keys[n] = m;
    });
    const bGeo = new THREE.BoxGeometry(kw * 0.56, 0.3, 0.95);
    for (const [n, at] of BLACK_KEYS) {
        const m = new THREE.Mesh(bGeo, KEY_BLACK);
        m.position.set(-3 + kw * at, ky + 0.2, kz - 0.28);
        m.castShadow = true;
        m.userData = { note: n, y: ky + 0.2 };
        P.add(m);
        keys[n] = m;
    }
    g.userData = { keys, height: 5.6, body, lid, piano: P };
    return g;
}
// ---------- 2. The glass pavilion ----------
const GLASS_MAT = new THREE.MeshPhongMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.38, shininess: 100, specular: '#ffffff', depthWrite: false });
export function glassPavilion(levels) {
    const g = new THREE.Group();
    const k = kit();
    const top = plinth(k, { r: 3.9, seg: 6, top: '#fbf3e3', side: '#bfe3dc', trim: PAL.gold });
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6, x = Math.cos(a) * 3.1, z = Math.sin(a) * 3.1;
        k.add(new THREE.CylinderGeometry(0.17, 0.2, 3.3, 10), '#fffaf0', { p: [x, top + 1.65, z] });
        k.add('box', PAL.gold, { p: [x, top + 3.35, z], s: [0.5, 0.18, 0.5] });
        k.add('box', '#fffaf0', { p: [x, top + 0.1, z], s: [0.5, 0.2, 0.5] });
    }
    k.add(new THREE.CylinderGeometry(3.7, 3.7, 0.35, 6), '#fffaf0', { p: [0, top + 3.6, 0], r: [0, Math.PI / 6, 0] });
    k.add(new THREE.CylinderGeometry(3.8, 3.8, 0.12, 6), PAL.gold, { p: [0, top + 3.42, 0], r: [0, Math.PI / 6, 0] });
    // scalloped eave
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        k.add('sphere', '#2fb3a8', { p: [Math.cos(a) * 3.55, top + 3.38, Math.sin(a) * 3.55], s: [0.32, 0.22, 0.32] });
    }
    k.add(new THREE.SphereGeometry(3.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#2fb3a8', { p: [0, top + 3.75, 0], s: [1, 0.72, 1] });
    k.add('sphere', PAL.gold, { p: [0, top + 6.0, 0], s: 0.28 });
    k.add('cyl', PAL.gold, { p: [0, top + 6.4, 0], s: [0.05, 0.6, 0.05] });
    // the round table with a cloth
    k.add(new THREE.CylinderGeometry(1.7, 1.7, 0.12, 28), '#ec79a8', { p: [0, top + 1.05, 0] });
    k.add(new THREE.CylinderGeometry(1.75, 1.85, 0.5, 28, 1, true), '#f7b6d2', { p: [0, top + 0.78, 0] });
    k.add('cyl', '#c99863', { p: [0, top + 0.5, 0], s: [0.2, 1.0, 0.2] });
    k.add('box', '#d9dfe6', { p: [0.9, top + 1.13, 0.9], r: [0, 0.6, 0], s: [0.08, 0.04, 0.7] }); // the spoon
    g.add(k.mesh());
    // eight glasses in an arc, with water at the book's levels
    const glasses = {}, waters = {};
    const shell = new THREE.CylinderGeometry(0.2, 0.16, 0.62, 14, 1, true);
    levels.forEach((lv, i) => {
        const a = Math.PI * (0.92 - i * 0.12), x = Math.cos(a) * 1.25, z = Math.sin(a) * 1.25 * 0.85 + 0.2;
        const gl = new THREE.Mesh(shell, GLASS_MAT);
        gl.position.set(x, top + 1.42, z);
        gl.renderOrder = 2;
        const water = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.15, 1, 14), new THREE.MeshLambertMaterial({ color: lv.color, emissive: lv.color, emissiveIntensity: 0.25 }));
        water.userData.full = 0.56;
        gl.add(water);
        gl.userData = { id: lv.id, base: top + 1.42 };
        g.add(gl);
        glasses[lv.id] = gl;
        waters[lv.id] = water;
    });
    g.userData = { glasses, waters, height: 7.2 };
    return g;
}
// Set a glass's water level (0…1).
export function setWater(water, level) {
    const h = Math.max(0.001, water.userData.full * level);
    water.scale.set(1, h, 1);
    water.position.y = -0.29 + h / 2;
    water.visible = level > 0.01;
}
// ---------- 3. The drum circle ----------
function darbukaGeo(scale = 1) {
    // a goblet drum: a lathe profile, banded in mother-of-pearl colours
    const prof = [[0, 0], [0.95, 0], [1.0, 0.12], [0.62, 0.55], [0.42, 1.05], [0.48, 1.45], [0.9, 1.95], [1.18, 2.45], [1.28, 2.75], [1.3, 2.9], [0, 2.9]].map(([x, y]) => new THREE.Vector2(x * scale, y * scale));
    const lathe = new THREE.LatheGeometry(prof, 28);
    const g = lathe.toNonIndexed();
    lathe.dispose();
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i += 3) {
        const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 / scale;
        const a = Math.atan2(pos.getZ(i), pos.getX(i));
        const band = Math.floor(y * 3.2);
        if (y > 2.88)
            c.set('#f3e3c3');
        else if (band % 2 === 0)
            c.set(Math.floor((a + Math.PI) * 4.5) % 2 ? '#fbf3e3' : '#3b2f6b');
        else
            c.set(band % 4 === 1 ? '#f2c14e' : '#8a63c9');
        for (let j = 0; j < 3; j++) {
            col[(i + j) * 3] = c.r;
            col[(i + j) * 3 + 1] = c.g;
            col[(i + j) * 3 + 2] = c.b;
        }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
}
export function drumCircle() {
    const g = new THREE.Group();
    const k = kit();
    const top = plinth(k, { r: 4.6, top: '#f6e2bd', side: '#e3bf8a', trim: '#d0507e', h: 0.35 });
    // a mosaic ring
    for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        k.add('box', NOTE_COLORS[i % 7], { p: [Math.cos(a) * 3.9, top + 0.02, Math.sin(a) * 3.9], r: [0, -a, 0], s: [0.5, 0.04, 0.25] });
    }
    // the fire pit
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        k.add('sphere', '#a9a196', { p: [Math.cos(a) * 0.75, top + 0.15, Math.sin(a) * 0.75 + 0.8], s: [0.26, 0.2, 0.22] });
    }
    for (let i = 0; i < 3; i++)
        k.add('cyl', '#7a4a2a', { p: [0, top + 0.18, 0.8], r: [Math.PI / 2, (i / 3) * Math.PI, 0], s: [0.09, 1.0, 0.09] });
    // log seats with musicians
    const seats = [[-2.6, 1.7, 0.9], [2.6, 1.7, -0.9], [-2.9, -0.6, 1.3], [2.9, -0.6, -1.3]];
    seats.forEach(([x, z, ry], i) => {
        k.add('cyl', '#9a6a3c', { p: [x, top + 0.25, z], r: [0, 0, Math.PI / 2], s: [0.28, 1.5, 0.28] }).add('cyl', '#c99863', { p: [x + 0.76, top + 0.25, z], r: [0, 0, Math.PI / 2], s: [0.26, 0.02, 0.26] });
        put(k, personGeo(40 + i, { sit: true, prop: 'drum' }), x, top + 0.05, z, ry + Math.PI * (x > 0 ? -0.5 : 0.5) * 0.8, 1);
    });
    // the daf (frame drum) leaning, and a triangle on a stand
    k.add(new THREE.CylinderGeometry(0.75, 0.75, 0.16, 24, 1, true), '#c99863', { p: [3.3, top + 0.8, 1.9], r: [1.2, 0.4, 0] });
    k.add(new THREE.CylinderGeometry(0.72, 0.72, 0.02, 24), '#f3e3c3', { p: [3.3, top + 0.8, 1.9], r: [1.2, 0.4, 0] });
    k.add('cyl', '#4d434c', { p: [-3.4, top + 0.8, -1.9], s: [0.04, 1.6, 0.04] });
    k.add(new THREE.TorusGeometry(0.32, 0.03, 4, 3), '#d9dfe6', { p: [-3.4, top + 1.3, -1.7], r: [0, 0, Math.PI / 2] });
    g.add(k.mesh());
    const drum = new THREE.Mesh(darbukaGeo(1.2), VC);
    drum.position.set(0, top, -2.0);
    drum.castShadow = true;
    drum.receiveShadow = true;
    g.add(drum);
    // the flames: three cones that flicker, and a glow
    const flames = [['#ff7a2a', 0.42, 1.0], ['#ffb23a', 0.3, 0.8], ['#fff1a0', 0.16, 0.55]].map(([c, r, h]) => {
        const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
        f.position.set(0, top + 0.3 + h / 2, 0.8);
        f.userData.h = h;
        g.add(f);
        return f;
    });
    const fireGlow = glow('#ffb04a', 3.4, 0.7);
    fireGlow.position.set(0, top + 0.8, 0.8);
    g.add(fireGlow);
    g.userData = { drum, flames, fireGlow, height: 5.0 };
    return g;
}
// ---------- 4. The metronome tower, with a little race track ----------
export const TRACK = { rx: 4.9, rz: 3.5 };
export function metronomeTower() {
    const g = new THREE.Group();
    const k = kit();
    // the race track: a dark oval with white dashes, and a chequered line
    for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2, a2 = ((i + 1) / 64) * Math.PI * 2;
        const x = Math.cos(a) * TRACK.rx, z = Math.sin(a) * TRACK.rz, x2 = Math.cos(a2) * TRACK.rx, z2 = Math.sin(a2) * TRACK.rz;
        const len = Math.hypot(x2 - x, z2 - z), ang = -Math.atan2(z2 - z, x2 - x);
        k.add('box', '#6a6470', { p: [(x + x2) / 2, 0.06, (z + z2) / 2], r: [0, ang, 0], s: [len + 0.05, 0.08, 1.3] });
        if (i % 2 === 0)
            k.add('box', '#ffffff', { p: [(x + x2) / 2, 0.11, (z + z2) / 2], r: [0, ang, 0], s: [len * 0.6, 0.02, 0.08] });
        k.add('box', i % 2 ? '#e8453c' : '#ffffff', { p: [Math.cos(a) * (TRACK.rx + 0.75), 0.1, Math.sin(a) * (TRACK.rz + 0.75)], r: [0, ang, 0], s: [len + 0.05, 0.18, 0.18] });
    }
    for (let i = 0; i < 6; i++)
        k.add('box', i % 2 ? '#222' : '#fff', { p: [TRACK.rx - 0.55 + (i % 3) * 0.4, 0.12, 0.2 * (i < 3 ? 1 : -1)], s: [0.4, 0.02, 0.4] });
    const top = plinth(k, { w: 4.2, d: 4.2, top: '#fbf3e3', side: '#e9cfa6', trim: PAL.gold });
    // the metronome: a wooden pyramid with a cream face
    const pyr = new THREE.CylinderGeometry(0.42, 1.75, 5.2, 4, 1);
    pyr.rotateY(Math.PI / 4);
    k.add(pyr, '#b77a45', { p: [0, top + 2.6 + 0.35, 0] });
    k.add(roundBox(3.0, 0.7, 3.0, 0.1), '#8d5a32', { p: [0, top + 0.35, 0] });
    // the cream face plate, leaning back with the pyramid's front face
    const yb = top + 0.35, TILT = Math.atan2((1.75 - 0.42) * Math.SQRT1_2, 5.2);
    const apo = (y) => (1.75 - ((1.75 - 0.42) * (y - yb)) / 5.2) * Math.SQRT1_2;
    k.add('box', '#fbf3e3', { p: [0, yb + 2.5, apo(yb + 2.5) + 0.03], r: [-TILT, 0, 0], s: [0.95, 4.0, 0.05] });
    for (let i = 0; i < 9; i++) {
        const y = yb + 1.4 + i * 0.3;
        k.add('box', i % 2 ? '#3b2414' : PAL.red, { p: [0.28, y, apo(y) + 0.07], r: [-TILT, 0, 0], s: [0.24, 0.035, 0.02] });
    }
    k.add('cyl', PAL.gold, { p: [1.25, top + 1.4, 0.4], r: [0, 0, Math.PI / 2], s: [0.12, 0.4, 0.12] }); // the winding key
    k.add('sphere', PAL.gold, { p: [0, top + 5.75, 0], s: 0.22 });
    // the chequered flag
    k.add('cyl', '#4d434c', { p: [TRACK.rx + 1.3, 1.3, 0.9], s: [0.05, 2.6, 0.05] });
    for (let i = 0; i < 6; i++)
        k.add('box', (i + Math.floor(i / 3)) % 2 ? '#222' : '#fff', { p: [TRACK.rx + 1.55 + (i % 3) * 0.2, 2.4 - Math.floor(i / 3) * 0.2, 0.9], s: [0.2, 0.2, 0.02] });
    g.add(k.mesh());
    // the pendulum swings from the bottom of the face
    const tilt = new THREE.Group();
    tilt.position.set(0, yb + 0.9, apo(yb + 0.9) + 0.14);
    tilt.rotation.x = -TILT;
    const pend = new THREE.Group();
    tilt.add(pend);
    const rod = kit().add('box', PAL.gold, { p: [0, 1.6, 0], s: [0.08, 3.2, 0.06] }).add(new THREE.CylinderGeometry(0.16, 0.3, 0.42, 4), PAL.gold, { p: [0, 2.2, 0.02], r: [0, Math.PI / 4, 0] }).mesh();
    pend.add(rod);
    g.add(tilt);
    g.userData = { pend, height: 6.4 };
    return g;
}
// The book's mascot: an orange note on wheels (see the lesson headers).
export function noteCar() {
    const g = new THREE.Group();
    const k = kit();
    // facing +Z (the way it drives): the note head is the car, the stem and
    // flag rise from the back
    k.add('sphere', '#f6a23a', { p: [0, 0.5, 0], s: [0.44, 0.36, 0.64] });
    k.add('cyl', '#f6a23a', { p: [0, 1.25, -0.44], s: [0.09, 1.5, 0.09] });
    k.add(new THREE.TorusGeometry(0.42, 0.09, 8, 16, Math.PI * 0.8), '#f6a23a', { p: [0, 1.9, -0.06], r: [0, Math.PI / 2, Math.PI * 0.62] });
    k.eyes({ x: 0.16, y: 0.64, z: 0.5, r: 0.1, look: 0.4 });
    for (const [x, z] of [[-0.4, 0.36], [0.4, 0.36], [-0.4, -0.36], [0.4, -0.36]]) {
        k.add('cyl', '#2a2531', { p: [x, 0.2, z], r: [0, 0, Math.PI / 2], s: [0.2, 0.12, 0.2] });
        k.add('cyl', PAL.gold, { p: [x * 1.08, 0.2, z], r: [0, 0, Math.PI / 2], s: [0.08, 0.13, 0.08] });
    }
    g.add(k.mesh());
    return g;
}
// ---------- 5. The cloud over the grand staff ----------
function clefCurve(pts, scale, ox, oy) {
    return new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(ox + x * scale, oy + y * scale, 0)));
}
export function staffCloud() {
    const g = new THREE.Group();
    const k = kit();
    const top = plinth(k, { w: 8.4, d: 3.6, top: '#fbf3e3', side: '#e9cfa6', trim: PAL.gold });
    const L = 6.8, y0 = top + 0.75, gap = 0.32;
    const ys = [];
    for (let i = 0; i < 5; i++)
        ys.push(y0 + i * gap);
    const mid = y0 + 5 * gap;
    for (let i = 0; i < 5; i++)
        ys.push(mid + gap + i * gap);
    for (const x of [-L / 2 - 0.3, L / 2 + 0.3]) {
        k.add(roundBox(0.45, ys[9] - top + 0.7, 0.45, 0.06), '#fffaf0', { p: [x, top + (ys[9] - top + 0.7) / 2, 0] });
        k.add('sphere', PAL.gold, { p: [x, ys[9] + 0.55, 0], s: 0.22 });
    }
    for (const y of ys)
        k.add('cyl', PAL.gold, { p: [0, y, 0], r: [0, 0, Math.PI / 2], s: [0.05, L + 0.6, 0.05] });
    for (let i = 0; i < 9; i++)
        k.add('cyl', '#f7d98a', { p: [-L / 2 + 0.9 + i * 0.7, mid, 0], r: [0, 0, Math.PI / 2], s: [0.025, 0.4, 0.025] }); // middle C's dashed line
    // a treble clef (red) and a bass clef (yellow) as bent tubes, like the book's
    const treble = clefCurve([[0.2, -1.6], [-0.3, -1.4], [-0.1, -1.0], [0.25, -1.3], [0.3, -0.5], [0.15, 1.2], [0.0, 2.3], [0.45, 2.6], [0.4, 1.8], [-0.5, 0.9], [-0.6, 0.1], [0.0, -0.45], [0.55, -0.1], [0.4, 0.45], [-0.05, 0.4]], 0.62, -L / 2 + 0.45, ys[6]);
    k.add(new THREE.TubeGeometry(treble, 90, 0.085, 8, false), '#d23b52');
    const bass = clefCurve([[-0.35, 0.2], [-0.1, 0.55], [0.4, 0.45], [0.5, 0.0], [0.2, -0.55], [-0.45, -0.95]], 0.7, -L / 2 + 0.55, ys[3]);
    k.add(new THREE.TubeGeometry(bass, 40, 0.09, 8, false), '#f2b631');
    k.add('sphere', '#f2b631', { p: [-L / 2 + 0.31, ys[3] + 0.14, 0], s: 0.12 });
    k.add('sphere', '#f2b631', { p: [-L / 2 + 1.1, ys[3] + 0.3, 0], s: 0.07 }).add('sphere', '#f2b631', { p: [-L / 2 + 1.1, ys[3] - 0.0, 0], s: 0.07 });
    // a little garden bed that drinks the rain
    for (let i = 0; i < 7; i++)
        k.add('sphere', i % 2 ? '#ec79a8' : '#f6c632', { p: [-3 + i, top + 0.2, 1.35], s: 0.14 });
    g.add(k.mesh());
    // the cloud
    const ck = kit();
    [[0, 0, 0, 1.2], [1.1, -0.15, 0.2, 0.9], [-1.1, -0.2, 0.1, 0.95], [0.5, 0.45, -0.2, 0.85], [-0.5, 0.4, 0.2, 0.8], [1.9, -0.35, 0, 0.6], [-1.9, -0.35, 0, 0.62]].forEach(([x, y, z, s]) => ck.add('sphere', '#ffffff', { p: [x, y, z], s }));
    ck.eyes({ x: 0.35, y: 0.05, z: 1.1, r: 0.16, look: 0.4 });
    ck.add(new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI), '#3b2414', { p: [0, -0.25, 1.15], r: [0, 0, Math.PI] });
    const cloud = new THREE.Mesh(ck.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#d8e4f4', emissiveIntensity: 0.45 }));
    cloud.position.set(1.0, ys[9] + 2.6, 0.4);
    cloud.castShadow = true;
    g.add(cloud);
    // note heads sitting on the staff (placed ones are added by the game)
    const notes = new THREE.Group();
    g.add(notes);
    g.userData = { cloud, notes, lineY: (d) => mid + d * (gap / 2), height: 7.4, x0: -L / 2 + 1.6 };
    return g;
}
export function staffNote(color) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshLambertMaterial({ color }));
    m.scale.set(1.15, 0.85, 0.7);
    m.castShadow = true;
    return m;
}
// ---------- 6. The music library ----------
export function musicLibrary() {
    const g = new THREE.Group();
    const k = kit();
    const top = plinth(k, { w: 6.8, d: 5.4, top: '#fbf3e3', side: '#e9cfa6', trim: PAL.gold });
    const W = 4.8, D = 3.4, H = 4.0;
    // stone walls with Damascene ablaq bands
    k.add(roundBox(W, H, D, 0.08), PAL.cream, { p: [0, top + H / 2, -0.4] });
    for (let i = 0; i < 5; i++)
        k.add('box', PAL.ablaq, { p: [0, top + 0.5 + i * 0.75, -0.4], s: [W + 0.02, 0.22, D + 0.02] });
    // arched door and windows with books inside
    const arch = (x, y, w, h, color) => {
        k.add('box', color, { p: [x, y + (h - w / 2) / 2, D / 2 - 0.38], s: [w, h - w / 2, 0.06] });
        k.add('cyl', color, { p: [x, y + h - w / 2, D / 2 - 0.38], r: [Math.PI / 2, 0, 0], s: [w / 2, 0.06, w / 2] });
    };
    k.add('box', PAL.cream, { p: [0, top + 1.0, D / 2 - 0.38], s: [1.5, 2.0, 0.04] });
    arch(0, top, 1.15, 2.1, '#1f7f78');
    k.add('sphere', PAL.gold, { p: [0.35, top + 1.0, D / 2 - 0.33], s: 0.06 });
    for (const x of [-1.6, 1.6]) {
        arch(x, top + 0.9, 0.9, 1.3, '#5a3a22');
        for (let i = 0; i < 5; i++)
            k.add('box', NOTE_COLORS[(i + (x > 0 ? 2 : 0)) % 7], { p: [x - 0.3 + i * 0.15, top + 1.12, D / 2 - 0.33], s: [0.11, 0.38, 0.05] });
        k.add('box', '#c99863', { p: [x, top + 0.92, D / 2 - 0.32], s: [0.9, 0.05, 0.08] });
        arch(x, top + 2.7, 0.8, 1.1, '#5a3a22');
        k.add('box', '#fffaf0', { p: [x, top + 2.95, D / 2 - 0.33], s: [0.6, 0.03, 0.04] });
    }
    // a wooden mashrabiya balcony over the door
    k.add(roundBox(1.6, 1.0, 0.6, 0.05), '#9a6a3c', { p: [0, top + 3.0, D / 2 - 0.05] });
    for (let i = 0; i < 6; i++)
        k.add('box', '#c99863', { p: [-0.62 + i * 0.25, top + 3.0, D / 2 + 0.26], s: [0.05, 0.8, 0.03] });
    for (let i = 0; i < 3; i++)
        k.add('box', '#c99863', { p: [0, top + 2.7 + i * 0.3, D / 2 + 0.26], s: [1.45, 0.04, 0.03] });
    // roof, a teal dome with a golden note on top
    k.add(roundBox(W + 0.4, 0.3, D + 0.4, 0.08), PAL.stone, { p: [0, top + H + 0.12, -0.4] });
    for (let i = 0; i < 12; i++)
        k.add('box', PAL.cream, { p: [-W / 2 + 0.2 + i * (W - 0.4) / 11, top + H + 0.4, D / 2 - 0.25], s: [0.22, 0.28, 0.22] });
    k.add(new THREE.CylinderGeometry(1.25, 1.25, 0.5, 20), PAL.cream, { p: [0, top + H + 0.5, -0.5] });
    k.add(new THREE.SphereGeometry(1.25, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#2fb3a8', { p: [0, top + H + 0.75, -0.5], s: [1, 1.15, 1] });
    // a lectern with the open manuscript (Guido's hymn, red lines)
    k.add('box', '#7a4a2a', { p: [-2.4, top + 0.55, 2.0], s: [0.18, 1.1, 0.18] });
    k.add('box', '#7a4a2a', { p: [-2.4, top + 1.12, 2.05], r: [-0.5, 0, 0], s: [1.3, 0.08, 0.9] });
    for (const sx of [-1, 1])
        k.add('box', '#fbf3dc', { p: [-2.4 + sx * 0.3, top + 1.2, 2.06], r: [-0.5, 0, sx * 0.08], s: [0.56, 0.04, 0.78] });
    for (let i = 0; i < 4; i++)
        k.add('box', '#d23b52', { p: [-2.4, top + 1.12 + i * 0.13, 2.27 - i * 0.07], r: [-0.5, 0, 0], s: [1.05, 0.03, 0.015] });
    // a cart of books and records
    k.add(roundBox(1.4, 0.7, 0.7, 0.05), '#c99863', { p: [2.4, top + 0.55, 2.0] });
    for (let i = 0; i < 7; i++)
        k.add('box', NOTE_COLORS[i], { p: [1.85 + i * 0.18, top + 1.08, 2.0], s: [0.13, 0.36, 0.5] });
    for (const x of [1.9, 2.9])
        k.add('cyl', '#2a2531', { p: [x, top + 0.18, 2.35], r: [Math.PI / 2, 0, 0], s: [0.15, 0.05, 0.15] });
    g.add(k.mesh());
    // the golden note on the dome
    const note = new THREE.Mesh(noteGeo(PAL.gold, { s: 1.0 }), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#a07a10', emissiveIntensity: 0.5 }));
    note.position.set(-0.2, top + H + 2.05, -0.5);
    g.add(note);
    g.userData = { note, height: 7.6 };
    return g;
}
// ---------- 7. The theatre (black basalt, after the theatre of Bosra) ----------
export function theatre() {
    const g = new THREE.Group();
    const k = kit();
    // the cavea: half-rings of seats rising towards the camera
    const R0 = 2.6, step = 0.62, rise = 0.42, tiers = 7;
    for (let i = 0; i < tiers; i++) {
        const r1 = R0 + i * step, r2 = r1 + step;
        const s = new THREE.Shape();
        s.absarc(0, 0, r2, Math.PI, Math.PI * 2, false);
        s.absarc(0, 0, r1, Math.PI * 2, Math.PI, true);
        const geo = new THREE.ExtrudeGeometry(s, { depth: (i + 1) * rise, bevelEnabled: false, curveSegments: 20 });
        geo.rotateX(-Math.PI / 2);
        k.add(geo, i % 2 ? PAL.basalt : '#67626c');
        k.add(new THREE.TorusGeometry(r1 + 0.04, 0.035, 4, 40, Math.PI), PAL.basaltTop, { p: [0, (i + 1) * rise + 0.01, 0], r: [-Math.PI / 2, 0, Math.PI] });
    }
    // aisles
    for (const a of [Math.PI * 0.33, Math.PI * 0.67])
        for (let i = 0; i < tiers; i++) {
            const r = R0 + (i + 0.5) * step;
            k.add('box', '#8a8490', { p: [Math.cos(a) * r, (i + 1) * rise + 0.02, Math.sin(a) * r], r: [0, -a + Math.PI / 2, 0], s: [0.5, 0.04, step] });
        }
    // the orchestra floor and the stage
    k.add(new THREE.CylinderGeometry(R0, R0, 0.12, 30, 1, false, -Math.PI / 2, Math.PI), '#d9cfbf', { p: [0, 0.06, 0] });
    k.add(roundBox(9.2, 0.7, 2.6, 0.06), '#77717c', { p: [0, 0.35, -1.6] });
    k.add(roundBox(9.0, 0.08, 2.5, 0.03), '#c99863', { p: [0, 0.74, -1.6] });
    // the scaenae frons: a two-storey wall of columns and arches
    const fz = -3.0;
    k.add(roundBox(9.6, 4.6, 0.7, 0.06), PAL.basalt, { p: [0, 0.7 + 2.3, fz] });
    for (let row = 0; row < 2; row++)
        for (let i = 0; i < 8; i++) {
            const x = -4.2 + i * 1.2, y = 0.7 + row * 2.2;
            k.add(new THREE.CylinderGeometry(0.12, 0.14, 1.9, 10), '#f4ecdc', { p: [x, y + 0.95, fz + 0.48] });
            k.add('box', '#f4ecdc', { p: [x, y + 1.95, fz + 0.48], s: [0.36, 0.14, 0.3] });
        }
    k.add('box', '#f4ecdc', { p: [0, 0.7 + 2.15, fz + 0.5], s: [9.4, 0.16, 0.4] });
    k.add('box', '#f4ecdc', { p: [0, 0.7 + 4.35, fz + 0.5], s: [9.4, 0.2, 0.4] });
    for (const x of [-2.4, 2.4]) {
        k.add('box', '#2a2531', { p: [x, 0.7 + 0.85, fz + 0.37], s: [0.8, 1.7, 0.05] });
        k.add('cyl', '#2a2531', { p: [x, 0.7 + 1.7, fz + 0.37], r: [Math.PI / 2, 0, 0], s: [0.4, 0.05, 0.4] });
    }
    // the central arch with a red curtain
    k.add('box', '#2a2531', { p: [0, 0.7 + 1.05, fz + 0.37], s: [1.9, 2.1, 0.05] });
    for (let i = 0; i < 9; i++)
        k.add(new THREE.CylinderGeometry(0.13, 0.13, 2.05, 8), i % 2 ? '#c8324a' : '#e04a62', { p: [-0.85 + i * 0.21, 0.7 + 1.02, fz + 0.42] });
    k.add(roundBox(2.2, 0.28, 0.3, 0.05), PAL.gold, { p: [0, 0.7 + 2.2, fz + 0.45] });
    // the two masks of the theatre over the arch
    for (const [x, smile] of [[-0.42, 1], [0.42, -1]]) {
        k.add('sphere', smile > 0 ? PAL.gold : '#ec79a8', { p: [x, 0.7 + 3.2, fz + 0.5], s: [0.38, 0.44, 0.12] });
        k.add('sphere', '#2a2531', { p: [x - 0.12, 0.7 + 3.3, fz + 0.58], s: 0.06 }).add('sphere', '#2a2531', { p: [x + 0.12, 0.7 + 3.3, fz + 0.58], s: 0.06 });
        k.add(new THREE.TorusGeometry(0.14, 0.035, 4, 10, Math.PI), '#2a2531', { p: [x, 0.7 + 3.07 + (smile > 0 ? 0 : -0.08), fz + 0.6], r: [0, 0, smile > 0 ? Math.PI : 0] });
    }
    // spotlights on poles
    for (const sx of [-1, 1]) {
        k.add('cyl', '#4d434c', { p: [sx * 5.1, 1.6, 0.6], s: [0.07, 3.2, 0.07] });
        k.add('cyl', '#2a2531', { p: [sx * 4.9, 3.2, 0.5], r: [0.6, 0, sx * -0.6], s: [0.26, 0.5, 0.26] });
    }
    // an audience on the seats
    const r = rng(5);
    for (let i = 0; i < 26; i++) {
        const tier = 1 + Math.floor(r() * (tiers - 1)), a = Math.PI + 0.25 + r() * (Math.PI - 0.5);
        if (Math.abs(a - Math.PI * 1.33) < 0.08 || Math.abs(a - Math.PI * 1.67) < 0.08)
            continue;
        const rad = R0 + (tier + 0.45) * step, x = Math.cos(a) * rad, z = -Math.sin(a) * rad;
        put(k, personGeo(70 + i, { sit: true }), x, (tier + 1) * rise - 0.42 * 0.85, z, Math.atan2(-x, -1.6 - z), 0.85);
    }
    g.add(k.mesh());
    // light cones from the spotlights, onto the stage
    const beams = [-1, 1].map(sx => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4.2, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        cone.position.set(sx * 3.3, 2.3, -0.4);
        cone.rotation.set(-0.35, 0, sx * -0.75);
        g.add(cone);
        return cone;
    });
    // the performer on the stage
    const singer = new THREE.Mesh(personGeo(9, { prop: 'book' }), VC);
    singer.position.set(0, 0.78, -1.3);
    singer.scale.setScalar(1.25);
    singer.castShadow = true;
    g.add(singer);
    g.userData = { beams, singer, height: 6.2 };
    return g;
}
// ---------- 8. The harbour of world instruments ----------
export function harbor() {
    const g = new THREE.Group();
    const k = kit();
    // the pier, out over the sea to the east
    for (let i = 0; i < 16; i++)
        k.add('box', i % 2 ? '#b98652' : '#c8955f', { p: [2.6 + i * 0.6, 0.35, 0.6], s: [0.56, 0.14, 2.4] });
    for (let i = 0; i < 5; i++)
        for (const z of [-0.5, 1.7])
            k.add('cyl', '#7a5130', { p: [3 + i * 2.1, -0.2, z], s: [0.14, 1.3, 0.14] });
    // a little harbour house with a striped awning
    k.add(roundBox(3.2, 2.4, 2.4, 0.08), '#fbf1dc', { p: [-0.6, 0.9 + 1.2, -0.6] });
    k.add(new THREE.CylinderGeometry(0.01, 2.6, 1.3, 4), '#2fb3a8', { p: [-0.6, 0.9 + 3.05, -0.6], r: [0, Math.PI / 4, 0], s: [1, 1, 0.78] });
    for (let i = 0; i < 6; i++)
        k.add('box', i % 2 ? '#ffffff' : '#d23b52', { p: [-1.85 + i * 0.5, 0.9 + 2.15, 0.85], r: [0.45, 0, 0], s: [0.5, 0.06, 0.9] });
    k.add('box', '#1f7f78', { p: [-0.6, 0.9 + 0.75, 0.62], s: [0.8, 1.5, 0.05] });
    k.add('box', '#9fe0ff', { p: [0.55, 0.9 + 1.4, 0.62], s: [0.6, 0.6, 0.05] });
    k.add(roundBox(1.4, 0.5, 0.12, 0.04), '#c99863', { p: [-0.6, 0.9 + 3.6, 0.3] });
    // crates of instruments: a balalaika, a pan flute, a harmonica
    for (const [x, z, s] of [[2.0, 1.9, 0.8], [2.9, 2.0, 0.7], [2.4, 1.2, 0.7], [-2.7, 1.2, 0.8]])
        k.add(roundBox(s, s, s, 0.05), '#d9a066', { p: [x, 0.9 + s / 2, z] }).add('box', '#a8703f', { p: [x, 0.9 + s / 2, z + s / 2 + 0.01], s: [s * 0.9, 0.08, 0.02] });
    const tri = new THREE.ConeGeometry(0.42, 0.6, 3);
    tri.rotateZ(Math.PI);
    k.add(tri, '#d9894a', { p: [2.0, 0.9 + 0.8 + 0.3, 1.9], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.3] });
    k.add('box', '#8a5a34', { p: [2.0, 0.9 + 1.3, 1.9], s: [0.08, 0.9, 0.05] });
    for (let i = 0; i < 6; i++)
        k.add('cyl', '#e8c27a', { p: [2.65 + i * 0.1, 0.9 + 0.7 + 0.32 - i * 0.03, 2.05], s: [0.045, 0.6 - i * 0.06, 0.045] });
    k.add('box', '#c9d3dc', { p: [-2.7, 0.9 + 0.9, 1.2], s: [0.6, 0.16, 0.22] });
    // barrels and a lamp
    for (const [x, z] of [[1.2, -1.7], [1.7, -1.2]])
        k.add(new THREE.CylinderGeometry(0.32, 0.36, 0.8, 12), '#9a6a3c', { p: [x, 0.9 + 0.4, z] });
    g.add(k.mesh());
    // two ships at the pier, with different sails
    const ships = [[6.5, 2.9, '#fbf1dc'], [10.5, -1.7, '#ffd9a0']].map(([x, z, sail], i) => {
        const d = dhow();
        d.scale.setScalar(0.62);
        d.position.set(x, -0.25, z);
        d.rotation.y = i ? 0.1 : Math.PI + 0.1;
        d.userData.sail.material = d.userData.sail.material.clone();
        d.userData.sail.material.color.set(sail);
        d.userData.flag.material = d.userData.flag.material.clone();
        d.userData.flag.material.color.set(i ? '#2fb3a8' : '#8a63c9');
        d.userData.baseY = -0.25;
        d.userData.phase = i * 1.7;
        g.add(d);
        return d;
    });
    g.userData = { ships, height: 4.8 };
    return g;
}
// The rainbow-staff gate at the start of the path: five coloured arcs (the
// book's rainbow), with a place for each golden note.
export function rainbowGate() {
    const g = new THREE.Group();
    const k = kit();
    const cols = ['#ec79a8', '#f28c3a', '#f6c632', '#4fbf5a', '#3f8fd6'];
    cols.forEach((c, i) => k.add(new THREE.TorusGeometry(2.7 + i * 0.3, 0.15, 8, 40, Math.PI), c, { p: [0, 0.6, 0] }));
    for (const x of [-3.6, 3.6]) {
        k.add(roundBox(1.1, 1.0, 0.9, 0.1), PAL.cream, { p: [x, 0.5, 0] });
        k.add(roundBox(1.2, 0.12, 1.0, 0.04), PAL.gold, { p: [x, 1.02, 0] });
    }
    const m = k.mesh();
    g.add(m);
    const slots = [];
    for (let i = 0; i < 10; i++) {
        const a = Math.PI * (0.9 - i * (0.8 / 9)), r = 3.3;
        const n = new THREE.Mesh(noteGeo('#f2c14e', { s: 0.55 }), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#c99a20', emissiveIntensity: 0.6 }));
        n.position.set(Math.cos(a) * r - 0.1, 0.6 + Math.sin(a) * r - 0.2, 0.25);
        n.visible = false;
        g.add(n);
        slots.push(n);
    }
    g.userData = { slots };
    return g;
}
// ---------- The helper «نغمة»: a purple note with a face ----------
export function helperNote() {
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const k = kit();
    k.add('sphere', '#8a63c9', { p: [0, 0.62, 0], r: [0, 0, 0.35], s: [0.62, 0.48, 0.5] });
    k.add('cyl', '#8a63c9', { p: [0.5, 1.45, 0], s: [0.08, 1.7, 0.08] });
    k.eyes({ x: 0.17, y: 0.72, z: 0.42, r: 0.12, look: 0.4 });
    k.add('sphere', '#ff9aa8', { p: [-0.32, 0.55, 0.38], s: [0.08, 0.05, 0.03] }).add('sphere', '#ff9aa8', { p: [0.32, 0.55, 0.38], s: [0.08, 0.05, 0.03] });
    k.add(new THREE.TorusGeometry(0.1, 0.03, 6, 12, Math.PI), '#3b2414', { p: [0, 0.52, 0.47], r: [0, 0, Math.PI] });
    for (const sx of [-1, 1])
        k.add('sphere', '#f2c14e', { p: [sx * 0.24, 0.12, 0.1], s: [0.13, 0.08, 0.18] });
    body.add(k.mesh());
    const flag = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.075, 8, 16, Math.PI * 0.75), new THREE.MeshLambertMaterial({ color: '#8a63c9' }));
    flag.position.set(0.88, 2.15, 0);
    flag.rotation.z = Math.PI * 0.6;
    flag.castShadow = true;
    body.add(flag);
    g.traverse(o => { if (o.isMesh)
        o.castShadow = true; });
    g.userData = { body, flag, height: 2.6 };
    return g;
}
// A selection ring under a place, and a bobbing golden arrow over the next one.
export function selectRing(r = 1) {
    const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.9, r, 56), new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.9, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
}
export function beaconArrow() {
    const k = kit();
    k.add('cone', '#ffd23f', { p: [0, 0, 0], r: [Math.PI, 0, 0], s: [0.55, 0.8, 0.55] });
    k.add('cyl', '#ffd23f', { p: [0, 0.65, 0], s: [0.22, 0.6, 0.22] });
    const m = new THREE.Mesh(k.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#c99a00', emissiveIntensity: 0.55 }));
    return m;
}
