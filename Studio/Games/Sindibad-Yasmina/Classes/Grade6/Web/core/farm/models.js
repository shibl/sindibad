// Made from models.ts by tools/build.ts. Edit that file, then run: npm run build
// The farm's 3D models, all made in code: no model or image files, so they
// cost nothing to download and work offline. Cartoon style to match the
// rest of the game: chunky shapes, saturated colours, big friendly eyes.
//
// Most models are many simple shapes merged into ONE mesh with per-vertex
// colours (Kit below), so each costs a single draw call on cheap phones.
// Parts that move (wings, tails, blades, heads) stay separate meshes.
//
// Units: 1 ≈ 1 metre. Y is up; models face +Z (towards the camera).
//
// The browser loads models.js, made from this file by `npm run build`.
import * as THREE from '../../vendor/three/three.module.min.js';
// ---------- Shared materials and textures ----------
// Wind: plants and grass sway a little (see `sway` below).
export const wind = { value: 0 };
export const VC = new THREE.MeshLambertMaterial({ vertexColors: true });
// Same, but sways in the wind (crops, grass, flowers). Taller parts sway more.
export const VC_SWAY = sway(new THREE.MeshLambertMaterial({ vertexColors: true }));
function sway(mat, amount = 0.07) {
    mat.onBeforeCompile = shader => {
        shader.uniforms.uWind = wind;
        shader.vertexShader = `uniform float uWind;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float phase = 0.0;
      #ifdef USE_INSTANCING
        phase = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.5;
      #endif
      float bend = max(transformed.y, 0.0);
      transformed.x += sin(uWind * 1.7 + phase) * ${amount.toFixed(3)} * bend * bend;
      transformed.z += cos(uWind * 1.3 + phase) * ${(amount * 0.6).toFixed(3)} * bend * bend;`);
    };
    return mat;
}
const C = (hex) => new THREE.Color(hex);
// A small canvas texture, drawn once.
function canvasTex(size, draw, repeat = 1) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    draw(g, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
    return t;
}
// Deterministic randomness, so the farm looks the same every visit.
export function rng(seed = 7) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function speckle(g, size, base, dots, n, rmin, rmax, seed) {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < n; i++) {
        g.fillStyle = dots[Math.floor(r() * dots.length)];
        g.globalAlpha = 0.35 + r() * 0.5;
        g.beginPath();
        g.arc(r() * size, r() * size, rmin + r() * (rmax - rmin), 0, Math.PI * 2);
        g.fill();
    }
    g.globalAlpha = 1;
}
// Filled by makeTextures(); empty until then.
export const TEX = {};
export function makeTextures() {
    if (TEX.grass)
        return TEX;
    TEX.grass = canvasTex(256, (g, s) => {
        speckle(g, s, '#79c85a', ['#6dbd4f', '#88d466', '#62b04a', '#93db6f'], 900, 2, 7, 3);
        const r = rng(9);
        g.strokeStyle = '#5ea844';
        g.lineWidth = 1.6;
        g.globalAlpha = 0.5;
        for (let i = 0; i < 160; i++) {
            const x = r() * s, y = r() * s;
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + (r() - 0.5) * 4, y - 5 - r() * 5);
            g.stroke();
        }
        g.globalAlpha = 1;
    });
    TEX.cliff = canvasTex(128, (g, s) => {
        g.fillStyle = '#b07a48';
        g.fillRect(0, 0, s, s);
        ['#9c693c', '#c38b55', '#8d5d34'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 40 + 10, s, 14); });
        speckle(g, 0, '#000', ['#7d5230'], 0, 1, 1, 1);
    });
    TEX.sand = canvasTex(256, (g, s) => speckle(g, s, '#f3d596', ['#e9c77e', '#fbe4ae', '#dcb46c', '#fff0c8'], 1400, 1, 3, 5));
    TEX.path = canvasTex(256, (g, s) => {
        speckle(g, s, '#e4c48c', ['#d4b07a', '#efd4a3', '#c9a46c'], 700, 1.5, 4, 8);
        const r = rng(4);
        for (let i = 0; i < 40; i++) {
            g.fillStyle = ['#cdbfa8', '#b9aa92', '#e6dccb'][i % 3];
            g.beginPath();
            g.ellipse(r() * s, r() * s, 3 + r() * 5, 2 + r() * 3, r() * 3, 0, Math.PI * 2);
            g.fill();
        }
    });
    const furrows = (base, ridge, dots, seed) => canvasTex(128, (g, s) => {
        speckle(g, s, base, dots, 300, 1, 3, seed);
        for (let i = 0; i < 5; i++) {
            const y = (i + 0.5) * (s / 5);
            const grd = g.createLinearGradient(0, y - 12, 0, y + 12);
            grd.addColorStop(0, 'rgba(0,0,0,0.25)');
            grd.addColorStop(0.45, ridge);
            grd.addColorStop(0.55, ridge);
            grd.addColorStop(1, 'rgba(0,0,0,0.25)');
            g.fillStyle = grd;
            g.fillRect(0, y - 12, s, 24);
        }
    });
    TEX.soil = furrows('#a36f42', 'rgba(205,150,100,0.55)', ['#8d5d36', '#b98352'], 11);
    TEX.soilRich = furrows('#6f4529', 'rgba(150,100,60,0.55)', ['#5a371f', '#86583a', '#9c7a3a'], 12);
    TEX.soilDry = canvasTex(128, (g, s) => {
        speckle(g, s, '#c9a070', ['#b98d5d', '#d8b386'], 200, 1, 3, 13);
        g.strokeStyle = 'rgba(110,70,40,.6)';
        g.lineWidth = 1.5;
        const r = rng(21);
        for (let i = 0; i < 14; i++) {
            let x = r() * s, y = r() * s;
            g.beginPath();
            g.moveTo(x, y);
            for (let k = 0; k < 4; k++) {
                x += (r() - 0.5) * 30;
                y += (r() - 0.5) * 30;
                g.lineTo(x, y);
            }
            g.stroke();
        }
    });
    TEX.unploughed = canvasTex(128, (g, s) => speckle(g, s, '#8fbf5a', ['#7eae4c', '#a2c96c', '#9a7a4c'], 500, 1, 4, 14));
    return TEX;
}
// ---------- Kit: merge many shapes into one coloured mesh ----------
const GEO = {
    sphere: new THREE.SphereGeometry(1, 18, 14),
    ball: new THREE.IcosahedronGeometry(1, 1), // chunky low-poly blob (leaves, bushes)
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
    cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
    cone: new THREE.ConeGeometry(1, 1, 16),
    cone4: new THREE.ConeGeometry(1, 1, 4),
    torus: new THREE.TorusGeometry(1, 0.18, 8, 24),
    hemi: new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
};
const rounded = new Map();
// A box with rounded edges (w × h × d, corner radius r), centred.
export function roundBox(w, h, d, r = 0.1) {
    const key = [w, h, d, r].join();
    const cached = rounded.get(key);
    if (cached)
        return cached;
    const s = new THREE.Shape();
    const x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
    s.moveTo(x, y);
    s.lineTo(x + ww, y);
    s.lineTo(x + ww, y + hh);
    s.lineTo(x, y + hh);
    s.lineTo(x, y);
    const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 4 });
    geo.center();
    geo.computeVertexNormals();
    rounded.set(key, geo);
    return geo;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export class Kit {
    parts = [];
    // add(geometry | GEO name, colour, { p: position, r: rotation (radians), s: scale })
    add(geo, color, { p = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}) {
        const base = typeof geo === 'string' ? GEO[geo] : geo;
        const g = base.index ? base.toNonIndexed() : base.clone();
        for (const name of Object.keys(g.attributes))
            if (name !== 'position' && name !== 'normal')
                g.deleteAttribute(name);
        const sc = typeof s === 'number' ? [s, s, s] : s;
        _m.compose(_v.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r[0], r[1], r[2])), _s.set(sc[0], sc[1], sc[2]));
        g.applyMatrix4(_m);
        const c = C(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            col[i * 3] = c.r;
            col[i * 3 + 1] = c.g;
            col[i * 3 + 2] = c.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        this.parts.push(g);
        return this;
    }
    // Cartoon eyes looking along +Z: white, pupil, a shine.
    eyes({ x = 0.14, y = 0, z = 0, r = 0.1, look = 0.5 } = {}) {
        for (const side of [-1, 1]) {
            this.add('sphere', '#ffffff', { p: [side * x, y, z], s: r });
            this.add('sphere', '#1f1612', { p: [side * x, y - r * 0.05, z + r * look], s: r * 0.62 });
            this.add('sphere', '#ffffff', { p: [side * x + r * 0.22, y + r * 0.28, z + r * (look + 0.5)], s: r * 0.2 });
        }
        return this;
    }
    geometry() {
        let count = 0;
        for (const g of this.parts)
            count += g.attributes.position.count;
        const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
        let o = 0;
        for (const g of this.parts) {
            pos.set(g.attributes.position.array, o);
            nor.set(g.attributes.normal.array, o);
            col.set(g.attributes.color.array, o);
            o += g.attributes.position.array.length;
            g.dispose();
        }
        this.parts = [];
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.computeBoundingSphere();
        return geo;
    }
    mesh(mat = VC, { shadow = true } = {}) {
        const m = new THREE.Mesh(this.geometry(), mat);
        m.castShadow = shadow;
        m.receiveShadow = true;
        return m;
    }
}
const kit = () => new Kit();
// ---------- The island ----------
function roundRectShape(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
}
// A flat slab lying on the ground (extruded upwards), top at y = top.
function slab(shape, thick, top, mats, bevel = 0.5) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, top - thick - bevel, 0);
    const m = new THREE.Mesh(geo, mats);
    m.receiveShadow = true;
    return m;
}
// Island size: the grass plateau is GRASS_W × GRASS_D, the beach a ring around it.
export const ISLAND = { w: 46, d: 36, r: 10, beach: 3.2 };
export function island() {
    makeTextures();
    const g = new THREE.Group();
    const scale = (t) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(1 / 6, 1 / 6); return c; };
    const sand = new THREE.MeshLambertMaterial({ map: scale(TEX.sand) });
    const beach = slab(roundRectShape(ISLAND.w + ISLAND.beach * 2, ISLAND.d + ISLAND.beach * 2, ISLAND.r + ISLAND.beach), 1.6, -0.25, sand, 0.9);
    g.add(beach);
    const grassMat = new THREE.MeshLambertMaterial({ map: scale(TEX.grass) });
    const cliff = TEX.cliff.clone();
    cliff.needsUpdate = true;
    cliff.repeat.set(1 / 3, 1 / 1.4);
    const top = slab(roundRectShape(ISLAND.w, ISLAND.d, ISLAND.r), 0.9, 0, [grassMat, new THREE.MeshLambertMaterial({ map: cliff })], 0.45);
    g.add(top);
    return g;
}
// Dirt paths: a list of [x1, z1, x2, z2, width] segments, lying on the grass.
export function paths(segments) {
    makeTextures();
    const t = TEX.path.clone();
    t.needsUpdate = true;
    t.repeat.set(1 / 4, 1 / 4);
    const mat = new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -2 });
    const g = new THREE.Group();
    for (const [x1, z1, x2, z2, w = 2.2] of segments) {
        const len = Math.hypot(x2 - x1, z2 - z1);
        const s = new THREE.Shape();
        // A stadium: a strip with round ends.
        s.absarc(0, 0, w / 2, Math.PI / 2, Math.PI * 1.5, false);
        s.lineTo(len, -w / 2);
        s.absarc(len, 0, w / 2, -Math.PI / 2, Math.PI / 2, false);
        s.lineTo(0, w / 2);
        const geo = new THREE.ShapeGeometry(s, 10);
        geo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x1, 0.02, z1);
        m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
        m.receiveShadow = true;
        g.add(m);
    }
    return g;
}
// The sea: one big plane with a small shader — shallow turquoise by the
// beach, deep blue further out, moving foam lines and glints.
export function sea() {
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: wind,
            uHalf: { value: new THREE.Vector2(ISLAND.w / 2 + ISLAND.beach, ISLAND.d / 2 + ISLAND.beach) },
            uR: { value: ISLAND.r + ISLAND.beach },
            uShallow: { value: C('#5fd6e0') },
            uDeep: { value: C('#1f7fb8') },
            uFar: { value: C('#9fd9ee') },
            uNight: { value: 0 },
        },
        vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
        fragmentShader: `
      uniform float uTime; uniform vec2 uHalf; uniform float uR;
      uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uFar; uniform float uNight;
      varying vec3 vWorld;
      float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 p = vWorld.xz;
        float d = sdRound(p, uHalf, uR);
        float t = uTime;
        float wob = sin(p.x * 0.35 + t * 0.9) * 0.35 + sin(p.y * 0.41 - t * 0.7) * 0.35;
        float dd = d + wob;
        vec3 col = mix(uShallow, uDeep, smoothstep(0.5, 14.0, dd));
        // foam: a bright band at the beach and two thin lines rolling in
        float foam = 1.0 - smoothstep(0.0, 0.9, dd);
        foam += (1.0 - smoothstep(0.0, 0.25, abs(fract(dd * 0.28 - t * 0.18) - 0.5) * 2.0 - 0.6)) * (1.0 - smoothstep(1.0, 6.0, dd)) * 0.55;
        col = mix(col, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.85);
        // glints
        vec2 cell = floor(p * 0.9);
        float g = step(0.985, hash(cell)) * (0.5 + 0.5 * sin(t * 3.0 + hash(cell + 3.1) * 6.28));
        col += g * 0.35 * (1.0 - uNight);
        // fade to the horizon haze
        float far = smoothstep(40.0, 160.0, length(p));
        col = mix(col, uFar, far);
        col *= mix(1.0, 0.35, uNight);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = -0.55;
    return m;
}
// ---------- Plots and crops ----------
export const PLOT = 3.6; // a plot is PLOT × PLOT
export function plotBase() {
    makeTextures();
    const g = new THREE.Group();
    const soilMat = new THREE.MeshLambertMaterial({ map: TEX.unploughed });
    const soil = new THREE.Mesh(roundBox(PLOT, 0.32, PLOT, 0.08), soilMat);
    soil.position.y = 0.16;
    soil.receiveShadow = true;
    g.add(soil);
    // A little log border, like a raised garden bed.
    const k = kit();
    const L = PLOT + 0.25;
    for (const [x, z, rot] of [[0, -L / 2, 0], [0, L / 2, 0], [-L / 2, 0, Math.PI / 2], [L / 2, 0, Math.PI / 2]]) {
        k.add('cyl', '#b5804b', { p: [x, 0.2, z], r: [0, rot, Math.PI / 2], s: [0.13, L + 0.2, 0.13] });
    }
    for (const [x, z] of [[-L / 2, -L / 2], [L / 2, -L / 2], [-L / 2, L / 2], [L / 2, L / 2]])
        k.add('cyl', '#9a6a3c', { p: [x, 0.26, z], s: [0.17, 0.5, 0.17] });
    g.add(k.mesh());
    g.userData.soil = soilMat;
    return g;
}
// Plant shapes per crop and stage. Each is one small coloured geometry that
// the plot draws 9 times (instanced).
const plantCache = new Map();
const LEAF = '#4fae45', LEAF_D = '#3a8f3a', LEAF_L = '#7ccf5a', STEM = '#5c9a3a';
function leafCluster(k, n, rad, y, size, colors, seed) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r();
        k.add('ball', colors[i % colors.length], { p: [Math.cos(a) * rad, y + r() * size * 0.6, Math.sin(a) * rad], s: [size, size * 0.75, size] });
    }
}
const PLANTS = {
    planted: () => kit().add('sphere', '#7a4f2d', { p: [0, 0.02, 0], s: [0.22, 0.09, 0.22] }).add('sphere', '#c9955b', { p: [0, 0.09, 0], s: 0.06 }),
    sprout: () => kit()
        .add('sphere', '#7a4f2d', { p: [0, 0.02, 0], s: [0.2, 0.07, 0.2] })
        .add('cyl', STEM, { p: [0, 0.12, 0], s: [0.025, 0.22, 0.025] })
        .add('sphere', LEAF_L, { p: [0.07, 0.24, 0], r: [0, 0, -0.6], s: [0.09, 0.035, 0.05] })
        .add('sphere', LEAF_L, { p: [-0.07, 0.24, 0], r: [0, 0, 0.6], s: [0.09, 0.035, 0.05] }),
    // Potato
    'potato:young': () => { const k = kit(); leafCluster(k, 4, 0.12, 0.2, 0.17, [LEAF, LEAF_L], 3); return k.add('cyl', STEM, { p: [0, 0.1, 0], s: [0.04, 0.2, 0.04] }); },
    'potato:grown': () => { const k = kit(); leafCluster(k, 6, 0.2, 0.32, 0.22, [LEAF, LEAF_D, LEAF_L], 4); leafCluster(k, 3, 0.08, 0.5, 0.18, [LEAF_L, LEAF], 5); k.add('sphere', '#f4f1ff', { p: [0.1, 0.62, 0.05], s: 0.05 }).add('sphere', '#f4f1ff', { p: [-0.12, 0.6, -0.04], s: 0.05 }); return k; },
    'potato:ripe': () => { const k = kit(); leafCluster(k, 6, 0.2, 0.26, 0.21, ['#c9c24a', '#b5a93c', '#d8cf62'], 4); leafCluster(k, 3, 0.08, 0.42, 0.16, ['#d8cf62', '#a99a3a'], 5); return k; },
    // Tomato
    'tomato:young': () => { const k = kit(); k.add('cyl', STEM, { p: [0, 0.18, 0], s: [0.035, 0.36, 0.035] }); leafCluster(k, 4, 0.1, 0.22, 0.13, [LEAF, LEAF_L], 6); return k; },
    'tomato:grown': () => { const k = kit(); k.add('cyl', STEM, { p: [0, 0.4, 0], s: [0.045, 0.8, 0.045] }); leafCluster(k, 5, 0.17, 0.3, 0.17, [LEAF, LEAF_D], 7); leafCluster(k, 4, 0.13, 0.62, 0.15, [LEAF_L, LEAF], 8); return k; },
    'tomato:flower': () => { const k = PLANTS['tomato:grown'](); [[0.16, 0.5, 0.1], [-0.14, 0.72, 0.06], [0.05, 0.84, -0.1], [-0.08, 0.42, 0.16]].forEach(p => k.add('sphere', '#ffd23f', { p, s: 0.055 })); return k; },
    'tomato:ripe': () => { const k = PLANTS['tomato:grown'](); [[0.2, 0.4, 0.12, '#e8402f'], [-0.18, 0.62, 0.1, '#e8402f'], [0.08, 0.76, 0.16, '#f0552f'], [-0.06, 0.36, -0.2, '#8fcf4a'], [0.18, 0.66, -0.1, '#e8402f']].forEach(([x, y, z, c]) => k.add('sphere', c, { p: [x, y, z], s: 0.1 })); return k; },
    // Cotton: a bush; bolls open from the bottom up (rounds 1–3)
    'cotton:young': () => { const k = kit(); k.add('cyl', '#7d6b3a', { p: [0, 0.15, 0], s: [0.035, 0.3, 0.035] }); leafCluster(k, 4, 0.12, 0.26, 0.14, [LEAF, LEAF_L], 9); return k; },
    'cotton:flower': () => { const k = cottonBush(); [[0.2, 0.42, 0.1], [-0.18, 0.62, 0.08], [0.06, 0.8, -0.12], [-0.12, 0.36, -0.16]].forEach(p => k.add('sphere', '#f6d6e6', { p, s: 0.07 }).add('sphere', '#fff2b0', { p: [p[0], p[1] + 0.04, p[2]], s: 0.03 })); return k; },
    'cotton:bolls': () => { const k = cottonBush(); BOLLS.forEach(([x, y, z]) => k.add('sphere', '#7cb342', { p: [x, y, z], s: 0.075 })); return k; },
    'cotton:open1': () => cottonOpen(1),
    'cotton:open2': () => cottonOpen(2),
    'cotton:open3': () => cottonOpen(3),
    // Sugar beet: a rosette of big leaves, the white root shows when ripe
    'beet:young': () => { const k = kit(); for (let i = 0; i < 4; i++) {
        const a = i * 1.6;
        k.add('sphere', LEAF_L, { p: [Math.cos(a) * 0.1, 0.16, Math.sin(a) * 0.1], r: [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8], s: [0.07, 0.17, 0.035] });
    } return k; },
    'beet:grown': () => beetRosette(['#3f9b3c', '#56b24a', '#2f8a3a'], 0.36),
    'beet:ripe': () => beetRosette(['#8fa83f', '#a5b24a', '#7d9a3a'], 0.28).add('sphere', '#f3ead8', { p: [0, 0.02, 0], s: [0.17, 0.12, 0.17] }),
    'beet:pulled': () => kit()
        .add('cone', '#f3ead8', { p: [0.05, 0.12, 0], r: [0, 0, Math.PI / 2 + 0.2], s: [0.15, 0.42, 0.15] })
        .add('sphere', '#f3ead8', { p: [-0.16, 0.13, 0], s: [0.16, 0.15, 0.16] })
        .add('sphere', LEAF, { p: [-0.32, 0.18, 0.05], r: [0, 0, 0.8], s: [0.08, 0.2, 0.05] })
        .add('sphere', LEAF_L, { p: [-0.3, 0.2, -0.08], r: [0.4, 0, 0.9], s: [0.08, 0.2, 0.05] }),
};
const BOLLS = [[0.2, 0.3, 0.12], [-0.2, 0.32, 0.06], [0.04, 0.28, -0.2], [0.17, 0.55, -0.06], [-0.15, 0.58, 0.14], [0.02, 0.62, 0.18], [0.1, 0.82, 0.04], [-0.08, 0.86, -0.06]];
function cottonBush() {
    const k = kit();
    k.add('cyl', '#7d6b3a', { p: [0, 0.4, 0], s: [0.04, 0.8, 0.04] });
    leafCluster(k, 5, 0.2, 0.3, 0.17, [LEAF_D, LEAF], 10);
    leafCluster(k, 4, 0.14, 0.62, 0.15, [LEAF, LEAF_L], 11);
    return k;
}
function cottonOpen(round) {
    const k = cottonBush();
    BOLLS.forEach(([x, y, z], i) => {
        const level = y < 0.4 ? 1 : y < 0.7 ? 2 : 3;
        if (level < round)
            k.add('sphere', '#8a6a3a', { p: [x, y, z], s: 0.05 }); // picked: an empty husk
        else if (level === round)
            for (let j = 0; j < 3; j++)
                k.add('sphere', '#ffffff', { p: [x + (j - 1) * 0.04, y + (j % 2) * 0.03, z], s: 0.08 });
        else
            k.add('sphere', '#7cb342', { p: [x, y, z], s: 0.075 });
    });
    return k;
}
function beetRosette(colors, size) {
    const k = kit();
    for (let i = 0; i < 7; i++) {
        const a = i * 0.9, tilt = 0.55 + (i % 2) * 0.25;
        k.add('cyl', '#d9cfa0', { p: [Math.cos(a) * 0.08, 0.12, Math.sin(a) * 0.08], r: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt], s: [0.02, 0.24, 0.02] });
        k.add('sphere', colors[i % colors.length], { p: [Math.cos(a) * 0.2, 0.28, Math.sin(a) * 0.2], r: [Math.sin(a) * tilt, a, -Math.cos(a) * tilt], s: [size * 0.32, size * 0.7, size * 0.12] });
    }
    return k;
}
export function plantGeometry(key) {
    if (!plantCache.has(key)) {
        const make = PLANTS[key] || PLANTS[key.split(':')[1]];
        plantCache.set(key, make ? make().geometry() : null);
    }
    return plantCache.get(key) ?? null;
}
// Weeds, soil mounds (hilling) and stakes, drawn instanced on a plot.
export const weedGeometry = () => { const k = kit(); for (let i = 0; i < 5; i++) {
    const a = i * 1.25;
    k.add('cone4', i % 2 ? '#3d7a2a' : '#56912f', { p: [Math.cos(a) * 0.06, 0.12, Math.sin(a) * 0.06], r: [Math.sin(a) * 0.5, a, -Math.cos(a) * 0.5], s: [0.05, 0.26, 0.05] });
} return k.geometry(); };
export const moundGeometry = () => kit().add('hemi', '#8a5a34', { s: [0.3, 0.16, 0.3] }).geometry();
export const stakeGeometry = () => kit().add('box', '#c89b62', { p: [0.16, 0.55, -0.12], s: [0.05, 1.1, 0.05] }).add('torus', '#e8d9a8', { p: [0.1, 0.62, -0.08], r: [Math.PI / 2, 0, 0], s: 0.07 }).geometry();
// ---------- Buildings ----------
export function barn() {
    const k = kit();
    const W = 6.4, D = 5, H = 3.2;
    k.add(roundBox(W, H, D, 0.12), '#d6463a', { p: [0, H / 2 + 0.05, 0] });
    // white trim on the corners and the base
    for (const x of [-W / 2, W / 2])
        for (const z of [-D / 2, D / 2])
            k.add('box', '#fdf6e9', { p: [x, H / 2, z], s: [0.26, H + 0.1, 0.26] });
    k.add('box', '#fdf6e9', { p: [0, 0.12, 0], s: [W + 0.1, 0.24, D + 0.1] });
    // a gambrel roof: the front shape, extruded back
    const roof = new THREE.Shape();
    roof.moveTo(-W / 2 - 0.45, 0);
    roof.lineTo(-W / 2 + 0.55, 1.5);
    roof.lineTo(0, 2.6);
    roof.lineTo(W / 2 - 0.55, 1.5);
    roof.lineTo(W / 2 + 0.45, 0);
    roof.lineTo(-W / 2 - 0.45, 0);
    const roofGeo = new THREE.ExtrudeGeometry(roof, { depth: D + 0.7, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 });
    roofGeo.translate(0, 0, -(D + 0.7) / 2);
    k.add(roofGeo, '#8c2f25', { p: [0, H + 0.02, 0] });
    const gable = new THREE.Shape();
    gable.moveTo(-W / 2 + 0.05, 0);
    gable.lineTo(-W / 2 + 0.6, 1.4);
    gable.lineTo(0, 2.4);
    gable.lineTo(W / 2 - 0.6, 1.4);
    gable.lineTo(W / 2 - 0.05, 0);
    gable.lineTo(-W / 2 + 0.05, 0);
    const gableGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.1, bevelEnabled: false });
    k.add(gableGeo, '#c73d32', { p: [0, H, D / 2 + 0.3] });
    // big doors with the white X, and the hay-loft window
    k.add('box', '#a8322a', { p: [0, 1.25, D / 2 + 0.07], s: [2.6, 2.4, 0.1] });
    k.add('box', '#fdf6e9', { p: [0, 1.25, D / 2 + 0.13], s: [2.8, 0.18, 0.06] });
    for (const sgn of [-1, 1])
        k.add('box', '#fdf6e9', { p: [0, 1.25, D / 2 + 0.14], r: [0, 0, sgn * 0.75], s: [3.3, 0.16, 0.05] });
    k.add('box', '#fdf6e9', { p: [0, 2.45, D / 2 + 0.13], s: [2.8, 0.16, 0.06] });
    k.add('box', '#fdf6e9', { p: [-1.3, 1.25, D / 2 + 0.13], s: [0.16, 2.5, 0.06] }).add('box', '#fdf6e9', { p: [1.3, 1.25, D / 2 + 0.13], s: [0.16, 2.5, 0.06] });
    k.add('box', '#fdf6e9', { p: [0, H + 1.05, D / 2 + 0.42], s: [1.3, 1.0, 0.1] });
    k.add('box', '#5a2a1c', { p: [0, H + 1.05, D / 2 + 0.47], s: [1.0, 0.75, 0.06] });
    // hay sticking out of the loft and a few bales by the door
    k.add('ball', '#f2cf5b', { p: [0, H + 0.82, D / 2 + 0.52], s: [0.42, 0.22, 0.12] });
    bale(k, -3.9, 0.45, 2.2, 0.3);
    bale(k, -4.0, 1.25, 2.0, -0.2);
    bale(k, 3.9, 0.45, 2.6, 0.1);
    return k.mesh();
}
function bale(k, x, y, z, rot) {
    k.add(roundBox(1.3, 0.8, 0.85, 0.12), '#f2cf5b', { p: [x, y, z], r: [0, rot, 0] });
    k.add('box', '#c9a43c', { p: [x, y, z], r: [0, rot, 0], s: [1.32, 0.82, 0.08] });
}
export function silo() {
    const k = kit();
    k.add('cyl', '#dfe7ea', { p: [0, 3, 0], s: [1.35, 6, 1.35] });
    for (const y of [1, 2.5, 4, 5.5])
        k.add('cyl', '#a9b8bf', { p: [0, y, 0], s: [1.4, 0.12, 1.4] });
    k.add('hemi', '#d6463a', { p: [0, 6, 0], s: [1.45, 1.1, 1.45] });
    k.add('sphere', '#fdf6e9', { p: [0, 7.1, 0], s: 0.2 });
    k.add('box', '#8a8a8a', { p: [0, 3, 1.38], s: [0.4, 5.6, 0.06] });
    return k.mesh();
}
export function dairy() {
    const k = kit();
    const W = 4.6, D = 3.8, H = 2.6;
    k.add(roundBox(W, H, D, 0.12), '#fff6e3', { p: [0, H / 2 + 0.05, 0] });
    k.add('box', '#3b8fc9', { p: [0, 0.15, 0], s: [W + 0.1, 0.3, D + 0.1] });
    const roof = new THREE.Shape();
    roof.moveTo(-W / 2 - 0.5, 0);
    roof.lineTo(0, 1.7);
    roof.lineTo(W / 2 + 0.5, 0);
    roof.lineTo(-W / 2 - 0.5, 0);
    const roofGeo = new THREE.ExtrudeGeometry(roof, { depth: D + 0.6, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 });
    roofGeo.translate(0, 0, -(D + 0.6) / 2);
    k.add(roofGeo, '#3b8fc9', { p: [0, H, 0] });
    k.add('box', '#6b3f1f', { p: [0.8, 1.0, D / 2 + 0.05], s: [1.0, 1.8, 0.1] });
    k.add('box', '#9ad7f2', { p: [-1.1, 1.5, D / 2 + 0.05], s: [1.0, 0.8, 0.08] });
    k.add('box', '#fdf6e9', { p: [-1.1, 1.5, D / 2 + 0.1], s: [1.1, 0.08, 0.04] }).add('box', '#fdf6e9', { p: [-1.1, 1.5, D / 2 + 0.1], s: [0.08, 0.9, 0.04] });
    // chimney and a sign with a round white village cheese
    k.add('box', '#c46b4a', { p: [1.3, H + 1.4, -0.6], s: [0.5, 1.2, 0.5] });
    k.add(roundBox(1.8, 0.9, 0.16, 0.06), '#b5804b', { p: [0, H + 0.75, D / 2 + 0.38] });
    k.add('cyl', '#fffaf0', { p: [-0.3, H + 0.75, D / 2 + 0.5], r: [Math.PI / 2, 0, 0], s: [0.32, 0.1, 0.32] });
    k.add('box', '#fffaf0', { p: [0.35, H + 0.72, D / 2 + 0.5], s: [0.45, 0.32, 0.1] });
    // milk churns
    for (const [x, z] of [[2.7, 1.4], [2.9, 0.6]]) {
        k.add('cyl', '#c9d3d8', { p: [x, 0.45, z], s: [0.28, 0.9, 0.28] }).add('cyl', '#9fb0b8', { p: [x, 0.98, z], s: [0.16, 0.18, 0.16] });
    }
    return k.mesh();
}
// The Syrian (Shami) cow: reddish brown, short horns. Head and tail move.
export function shamiCow() {
    const g = new THREE.Group();
    const body = kit();
    body.add(new THREE.CapsuleGeometry(0.55, 1.1, 6, 14), '#a65a2e', { p: [0, 1.05, 0], r: [Math.PI / 2, 0, 0] });
    body.add('sphere', '#c87a46', { p: [0, 0.82, 0], s: [0.5, 0.35, 0.8] });
    for (const [x, z] of [[-0.32, 0.5], [0.32, 0.5], [-0.32, -0.5], [0.32, -0.5]]) {
        body.add('cyl', '#94502a', { p: [x, 0.4, z], s: [0.13, 0.8, 0.13] });
        body.add('cyl', '#3b2414', { p: [x, 0.06, z], s: [0.15, 0.12, 0.15] });
    }
    body.add('sphere', '#f2a9b3', { p: [0, 0.62, -0.35], s: [0.22, 0.14, 0.2] });
    const bm = body.mesh();
    g.add(bm);
    const head = kit();
    head.add('sphere', '#a65a2e', { p: [0, 0, 0.1], s: [0.38, 0.36, 0.42] });
    head.add('sphere', '#f0c6a8', { p: [0, -0.12, 0.42], s: [0.3, 0.22, 0.2] });
    head.add('sphere', '#3b2414', { p: [-0.1, -0.1, 0.6], s: 0.04 }).add('sphere', '#3b2414', { p: [0.1, -0.1, 0.6], s: 0.04 });
    head.eyes({ x: 0.17, y: 0.1, z: 0.38, r: 0.075 });
    for (const sx of [-1, 1]) {
        head.add('sphere', '#94502a', { p: [sx * 0.42, 0.08, 0.02], r: [0, 0, sx * 0.4], s: [0.18, 0.08, 0.12] });
        head.add('cone', '#f3ead8', { p: [sx * 0.25, 0.36, 0], r: [0, 0, -sx * 0.6], s: [0.06, 0.22, 0.06] });
    }
    const hm = head.mesh();
    const neck = new THREE.Group();
    neck.position.set(0, 1.3, 0.85);
    neck.add(hm);
    g.add(neck);
    const tail = kit().add('cyl', '#94502a', { p: [0, -0.35, 0], s: [0.04, 0.7, 0.04] }).add('sphere', '#3b2414', { p: [0, -0.72, 0], s: [0.08, 0.13, 0.08] }).mesh();
    tail.position.set(0, 1.25, -1.1);
    g.add(tail);
    g.userData = { head: neck, tail };
    return g;
}
export function trough() {
    return kit()
        .add(roundBox(1.8, 0.45, 0.7, 0.08), '#9a6a3c', { p: [0, 0.4, 0] })
        .add('box', '#4cc3e0', { p: [0, 0.6, 0], s: [1.55, 0.04, 0.48] })
        .add('box', '#7a5130', { p: [-0.7, 0.15, 0], s: [0.15, 0.3, 0.6] }).add('box', '#7a5130', { p: [0.7, 0.15, 0], s: [0.15, 0.3, 0.6] })
        .mesh();
}
// A hay feeder for the cow; `food` shows when the meal is served.
export function feeder() {
    const g = new THREE.Group();
    g.add(kit().add(roundBox(1.4, 0.5, 0.8, 0.08), '#b5804b', { p: [0, 0.35, 0] }).add('box', '#6b4a2b', { p: [0, 0.58, 0], s: [1.2, 0.05, 0.6] }).mesh());
    const food = kit();
    food.add('ball', '#f2cf5b', { p: [-0.35, 0.65, 0], s: [0.28, 0.14, 0.22] });
    food.add('ball', '#6cbf4a', { p: [0.05, 0.66, 0], s: [0.26, 0.13, 0.22] });
    food.add('ball', '#e0b04a', { p: [0.38, 0.64, 0], s: [0.24, 0.12, 0.2] });
    const fm = food.mesh();
    fm.visible = false;
    g.add(fm);
    g.userData.food = fm;
    return g;
}
export function bucket() {
    const g = new THREE.Group();
    g.add(kit().add('cyl', '#c9d3d8', { p: [0, 0.25, 0], s: [0.28, 0.5, 0.28] }).add('cyl', '#ffffff', { p: [0, 0.48, 0], s: [0.25, 0.04, 0.25] }).add('torus', '#8a9aa2', { p: [0, 0.55, 0], r: [0, 0, 0], s: [0.28, 0.28, 0.28] }).mesh());
    return g;
}
// Fence posts and rails around a rectangle (minus a gate gap on one side).
export function fence(x1, z1, x2, z2, { gate = null } = {}) {
    const k = kit();
    const side = (ax, az, bx, bz) => {
        const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.4)), rot = -Math.atan2(bz - az, bx - ax);
        for (let i = 0; i <= n; i++) {
            const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
            if (gate && Math.hypot(x - gate[0], z - gate[1]) < 0.9)
                continue;
            k.add(roundBox(0.18, 0.95, 0.18, 0.05), '#fdf6e9', { p: [x, 0.47, z] });
        }
        for (const y of [0.4, 0.75]) {
            if (gate) {
                // split the rail around the gate
                const gx = gate[0], gz = gate[1];
                const tg = ((gx - ax) * (bx - ax) + (gz - az) * (bz - az)) / (len * len);
                if (tg > 0 && tg < 1 && Math.abs((bx - ax) * (gz - az) - (bz - az) * (gx - ax)) / len < 0.3) {
                    const g1 = Math.max(0, tg - 0.9 / len), g2 = Math.min(1, tg + 0.9 / len);
                    for (const [s0, s1] of [[0, g1], [g2, 1]]) {
                        if (s1 - s0 < 0.01)
                            continue;
                        const mx = ax + (bx - ax) * (s0 + s1) / 2, mz = az + (bz - az) * (s0 + s1) / 2;
                        k.add('box', '#fdf6e9', { p: [mx, y, mz], r: [0, rot, 0], s: [len * (s1 - s0), 0.1, 0.08] });
                    }
                    continue;
                }
            }
            k.add('box', '#fdf6e9', { p: [(ax + bx) / 2, y, (az + bz) / 2], r: [0, rot, 0], s: [len, 0.1, 0.08] });
        }
    };
    side(x1, z1, x2, z1);
    side(x2, z1, x2, z2);
    side(x2, z2, x1, z2);
    side(x1, z2, x1, z1);
    return k.mesh();
}
export function hive() {
    const k = kit();
    for (const [x, z] of [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.35], [0.4, 0.35]])
        k.add('box', '#8a5a32', { p: [x, 0.2, z], s: [0.1, 0.4, 0.1] });
    k.add(roundBox(1.2, 0.55, 1.0, 0.05), '#fff6d8', { p: [0, 0.68, 0] });
    k.add(roundBox(1.2, 0.5, 1.0, 0.05), '#ffd866', { p: [0, 1.2, 0] });
    k.add(roundBox(1.38, 0.16, 1.18, 0.05), '#f4f1e6', { p: [0, 1.53, 0] });
    k.add(roundBox(1.1, 0.08, 0.9, 0.03), '#e2d7bd', { p: [0, 1.64, 0] });
    // a honeycomb sign on the front
    for (const [x, y] of [[-0.12, 1.22], [0.12, 1.22], [0, 1.31], [0, 1.13]])
        k.add(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 6), '#f2a51a', { p: [x, y, 0.51], r: [Math.PI / 2, 0, 0] });
    k.add('box', '#3b2414', { p: [0, 0.48, 0.51], s: [0.5, 0.07, 0.04] });
    k.add('box', '#c89b62', { p: [0, 0.43, 0.6], s: [0.7, 0.05, 0.25] });
    return k.mesh();
}
// A tiny bee for swarms around the hives (instanced).
export const tinyBeeGeometry = () => kit().add('sphere', '#ffd23f', { s: [0.07, 0.06, 0.09] }).add('sphere', '#3b2414', { p: [0, 0, -0.02], s: [0.072, 0.062, 0.03] }).add('sphere', '#e8f6ff', { p: [0, 0.06, 0], s: [0.08, 0.02, 0.04] }).geometry();
export function waterTank() {
    const k = kit();
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]])
        k.add('box', '#8a5a32', { p: [x, 0.5, z], s: [0.16, 1, 0.16] });
    k.add('cyl', '#5aa7c9', { p: [0, 1.75, 0], s: [1.0, 1.5, 1.0] });
    k.add('cyl', '#4a8fb0', { p: [0, 2.55, 0], s: [1.05, 0.12, 1.05] });
    for (const y of [1.3, 2.1])
        k.add('cyl', '#3f7f9e', { p: [0, y, 0], s: [1.03, 0.06, 1.03] });
    k.add('cyl', '#9aa4a8', { p: [-1.1, 2.1, 0], r: [0, 0, Math.PI / 2], s: [0.09, 1.0, 0.09] });
    return k.mesh();
}
export function windmill() {
    const g = new THREE.Group();
    const k = kit();
    k.add('cyl', '#efe3c8', { p: [0, 2.4, 0], s: [1.0, 4.8, 1.0] });
    k.add(new THREE.CylinderGeometry(0.75, 1.2, 4.8, 16), '#f5ead2', { p: [0, 2.4, 0] });
    k.add('cone', '#c0532f', { p: [0, 5.4, 0], s: [1.15, 1.4, 1.15] });
    k.add('box', '#6b3f1f', { p: [0, 0.8, 1.05], s: [0.7, 1.3, 0.12] });
    k.add('box', '#9ad7f2', { p: [0, 3.2, 0.92], s: [0.5, 0.5, 0.08] });
    g.add(k.mesh());
    const blades = kit();
    blades.add('cyl', '#6b3f1f', { r: [Math.PI / 2, 0, 0], s: [0.18, 0.4, 0.18] });
    for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        blades.add('box', '#8a5a32', { p: [Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0.15], r: [0, 0, a], s: [2.8, 0.1, 0.06] });
        blades.add('box', '#fdf6e9', { p: [Math.cos(a) * 1.6 - Math.sin(a) * 0.28, Math.sin(a) * 1.6 + Math.cos(a) * 0.28, 0.18], r: [0, 0, a], s: [2.0, 0.5, 0.03] });
    }
    const bm = blades.mesh();
    bm.position.set(0, 4.7, 1.1);
    g.add(bm);
    g.userData.blades = bm;
    return g;
}
export function tree(kind = 'apple', seed = 1) {
    const r = rng(seed * 31 + 7);
    const k = kit();
    const h = kind === 'olive' ? 1.4 : 1.8;
    k.add(new THREE.CylinderGeometry(0.18, 0.3, h, 10), kind === 'olive' ? '#8b7d6b' : '#8a5a32', { p: [0, h / 2, 0] });
    const leaf = { apple: ['#4fae45', '#5cbb4c', '#3f9d3c'], lemon: ['#3f9d3c', '#4aa84a', '#358a36'], olive: ['#8fa88a', '#a3b89c', '#7d9a78'] }[kind];
    const top = h + 0.7;
    for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        k.add('ball', leaf[i % 3], { p: [Math.cos(a) * 0.75, top + r() * 0.5, Math.sin(a) * 0.75], s: 0.7 + r() * 0.25 });
    }
    k.add('ball', leaf[0], { p: [0, top + 0.75, 0], s: 0.95 });
    if (kind !== 'olive') {
        const fruit = kind === 'apple' ? '#e33b2e' : '#ffd84a';
        for (let i = 0; i < 9; i++) {
            const a = r() * Math.PI * 2, y = top + (r() - 0.3) * 1.2, rad = 1.05 + r() * 0.2;
            k.add('sphere', fruit, { p: [Math.cos(a) * rad, y, Math.sin(a) * rad], s: kind === 'apple' ? 0.15 : 0.13 });
        }
    }
    return k.mesh();
}
export function palm(seed = 1) {
    const r = rng(seed * 13 + 5);
    const k = kit();
    const curve = 0.15 + r() * 0.2;
    for (let i = 0; i < 6; i++)
        k.add(new THREE.CylinderGeometry(0.16, 0.2, 0.75, 8), i % 2 ? '#b48a55' : '#a07a48', { p: [i * curve * 0.4, 0.38 + i * 0.7, 0], r: [0, 0, -curve * 0.6] });
    const top = [6 * curve * 0.4 - 0.1, 4.4, 0];
    for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        k.add('sphere', i % 2 ? '#3f9d3c' : '#4fae45', { p: [top[0] + Math.cos(a) * 0.9, top[1] - 0.25, Math.sin(a) * 0.9], r: [Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5], s: [1.1, 0.08, 0.32] });
    }
    k.add('sphere', '#7a5130', { p: [top[0], top[1] - 0.3, 0.15], s: 0.17 }).add('sphere', '#7a5130', { p: [top[0] + 0.18, top[1] - 0.32, -0.08], s: 0.16 });
    return k.mesh();
}
export function rock(seed = 1, size = 0.6) {
    const r = rng(seed * 17 + 3);
    const k = kit();
    k.add(new THREE.DodecahedronGeometry(1, 0), '#b8b2a6', { p: [0, size * 0.4, 0], r: [r(), r() * 3, r()], s: [size, size * 0.7, size * 0.9] });
    k.add(new THREE.DodecahedronGeometry(1, 0), '#a49e92', { p: [size * 0.8, size * 0.25, size * 0.2], r: [r(), r(), r()], s: size * 0.5 });
    return k.mesh();
}
export function bush(seed = 1, color = '#4fae45') {
    const r = rng(seed * 11 + 1);
    const k = kit();
    for (let i = 0; i < 4; i++)
        k.add('ball', i % 2 ? color : '#3f9d3c', { p: [(r() - 0.5) * 0.9, 0.45 + r() * 0.2, (r() - 0.5) * 0.7], s: 0.45 + r() * 0.15 });
    return k.mesh();
}
// Flowers for instancing: a stem with a little round bloom.
export const flowerGeometry = (color) => kit()
    .add('cyl', '#4a9a3a', { p: [0, 0.18, 0], s: [0.02, 0.36, 0.02] })
    .add('sphere', '#4fae45', { p: [0.06, 0.12, 0], r: [0, 0, -0.7], s: [0.07, 0.025, 0.04] })
    .add('sphere', color, { p: [0, 0.4, 0], s: [0.1, 0.07, 0.1] })
    .add('sphere', '#ffe680', { p: [0, 0.45, 0], s: 0.035 })
    .geometry();
export const tuftGeometry = () => { const k = kit(); for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    k.add('cone4', i ? '#62b04a' : '#79c85a', { p: [Math.cos(a) * 0.05, 0.13, Math.sin(a) * 0.05], r: [Math.sin(a) * 0.3, a, -Math.cos(a) * 0.3], s: [0.05, 0.28, 0.05] });
} return k.geometry(); };
// The Damask rose — Syria's national flower — as a pink shrub.
export function roseBush(seed = 1) {
    const r = rng(seed * 5 + 9);
    const k = kit();
    for (let i = 0; i < 4; i++)
        k.add('ball', i % 2 ? '#3f8f3a' : '#4fa244', { p: [(r() - 0.5) * 0.8, 0.4 + r() * 0.25, (r() - 0.5) * 0.6], s: 0.38 + r() * 0.1 });
    for (let i = 0; i < 9; i++) {
        const a = r() * Math.PI * 2, y = 0.45 + r() * 0.45;
        k.add('sphere', i % 3 ? '#e86a9a' : '#f39cbd', { p: [Math.cos(a) * 0.5, y, Math.sin(a) * 0.42], s: 0.13 });
        k.add('sphere', '#c94a7a', { p: [Math.cos(a) * 0.56, y + 0.02, Math.sin(a) * 0.47], s: 0.06 });
    }
    return k.mesh();
}
// Local jasmine climbing an arch: evergreen, with small white flowers.
export function jasmineArch() {
    const k = kit();
    for (const x of [-1, 1])
        k.add('box', '#c89b62', { p: [x, 1.1, 0], s: [0.14, 2.2, 0.14] });
    const arc = new THREE.TorusGeometry(1, 0.08, 6, 16, Math.PI);
    k.add(arc, '#c89b62', { p: [0, 2.2, 0] });
    const r = rng(77);
    for (let i = 0; i < 22; i++) {
        const t = i / 21, a = Math.PI * t;
        const x = t < 0.25 ? -1 : t > 0.75 ? 1 : Math.cos(Math.PI - a) * 1.0;
        const y = t < 0.25 ? 0.3 + t * 7.5 : t > 0.75 ? 0.3 + (1 - t) * 7.5 : 2.2 + Math.sin(a) * 1.0;
        k.add('ball', i % 2 ? '#3f8f3a' : '#4fa244', { p: [x + (r() - 0.5) * 0.2, y, (r() - 0.5) * 0.2], s: 0.22 });
        if (i % 2 === 0)
            k.add('sphere', '#ffffff', { p: [x + (r() - 0.5) * 0.3, y + 0.12, 0.15], s: 0.07 });
    }
    return k.mesh();
}
export function fountain() {
    const k = kit();
    k.add('cyl', '#d9cfbf', { p: [0, 0.3, 0], s: [1.4, 0.6, 1.4] });
    k.add('cyl', '#5fc6dc', { p: [0, 0.58, 0], s: [1.25, 0.05, 1.25] });
    k.add('cyl', '#d9cfbf', { p: [0, 0.95, 0], s: [0.22, 1.1, 0.22] });
    k.add('cyl', '#d9cfbf', { p: [0, 1.5, 0], s: [0.6, 0.15, 0.6] });
    k.add('sphere', '#9fe3f0', { p: [0, 1.75, 0], s: [0.18, 0.3, 0.18] });
    return k.mesh();
}
export function lantern() {
    return kit()
        .add('cyl', '#3b3029', { p: [0, 1.0, 0], s: [0.06, 2.0, 0.06] })
        .add('box', '#3b3029', { p: [0.25, 2.0, 0], s: [0.55, 0.05, 0.05] })
        .add('cone', '#c98d1c', { p: [0.5, 1.83, 0], s: [0.18, 0.18, 0.18] })
        .add(new THREE.CylinderGeometry(0.14, 0.18, 0.32, 8), '#ffd27a', { p: [0.5, 1.6, 0] })
        .mesh();
}
export function scarecrow() {
    const k = kit();
    k.add('cyl', '#8a5a32', { p: [0, 1.0, 0], s: [0.07, 2.0, 0.07] });
    k.add('cyl', '#8a5a32', { p: [0, 1.5, 0], r: [0, 0, Math.PI / 2], s: [0.06, 1.6, 0.06] });
    k.add(roundBox(0.7, 0.7, 0.35, 0.1), '#3f7fbf', { p: [0, 1.35, 0] });
    k.add('sphere', '#f2cf5b', { p: [0, 2.0, 0], s: 0.3 });
    k.add('cyl', '#b5804b', { p: [0, 2.28, 0], s: [0.5, 0.05, 0.5] }).add('cyl', '#b5804b', { p: [0, 2.4, 0], s: [0.25, 0.25, 0.25] });
    k.add('sphere', '#3b2414', { p: [-0.1, 2.05, 0.27], s: 0.04 }).add('sphere', '#3b2414', { p: [0.1, 2.05, 0.27], s: 0.04 });
    k.add('sphere', '#e8402f', { p: [0, 1.95, 0.3], s: 0.05 });
    return k.mesh();
}
// ---------- The dock, the ship and the orders board ----------
export function dock() {
    const k = kit();
    for (let i = 0; i < 9; i++)
        k.add('box', i % 2 ? '#b98652' : '#c8955f', { p: [0, 0.28, i * 0.62], s: [2.2, 0.14, 0.56] });
    for (const z of [0.4, 2.6, 4.9])
        for (const x of [-1.05, 1.05])
            k.add('cyl', '#7a5130', { p: [x, -0.1, z], s: [0.14, 1.2, 0.14] });
    return k.mesh();
}
// The trading dhow that carries orders to market. Its sail can billow.
export function dhow() {
    const g = new THREE.Group();
    const k = kit();
    const hull = new THREE.Shape();
    hull.moveTo(-2.6, 0.6);
    hull.quadraticCurveTo(-2.2, -0.5, -0.8, -0.6);
    hull.lineTo(1.6, -0.6);
    hull.quadraticCurveTo(2.7, -0.3, 3.1, 0.9);
    hull.lineTo(-2.6, 0.6);
    const hg = new THREE.ExtrudeGeometry(hull, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.15, bevelSegments: 4 });
    hg.translate(0, 0, -0.7);
    k.add(hg, '#a0602e', { p: [0, 0.4, 0] });
    k.add('box', '#d9a066', { p: [0.2, 1.0, 0], s: [4.6, 0.12, 1.5] });
    k.add('box', '#f2c14e', { p: [0.2, 0.75, 0.96], s: [4.8, 0.1, 0.05] }).add('box', '#f2c14e', { p: [0.2, 0.75, -0.96], s: [4.8, 0.1, 0.05] });
    k.add('cyl', '#6b3f1f', { p: [0.2, 3.0, 0], s: [0.09, 4.0, 0.09] });
    for (const [x, z] of [[-1.2, 0.2], [-0.6, -0.3], [1.4, 0.2]])
        k.add(roundBox(0.6, 0.5, 0.5, 0.06), '#c8955f', { p: [x, 1.3, z] });
    g.add(k.mesh());
    const sailShape = new THREE.Shape();
    sailShape.moveTo(-1.9, 1.2);
    sailShape.quadraticCurveTo(0.3, 2.2, 2.4, 4.6);
    sailShape.quadraticCurveTo(0.6, 2.4, 1.6, 1.0);
    sailShape.lineTo(-1.9, 1.2);
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape, 12), new THREE.MeshLambertMaterial({ color: '#fbf1dc', side: THREE.DoubleSide }));
    sail.position.set(0.2, 0.4, 0.12);
    sail.castShadow = true;
    g.add(sail);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), new THREE.MeshLambertMaterial({ color: '#d0507e', side: THREE.DoubleSide }));
    flag.position.set(0.55, 5.0, 0);
    g.add(flag);
    g.userData = { sail, flag };
    return g;
}
export function ordersBoard() {
    const k = kit();
    for (const x of [-1.1, 1.1])
        k.add('cyl', '#7a5130', { p: [x, 1.0, 0], s: [0.1, 2.0, 0.1] });
    k.add(roundBox(2.6, 1.5, 0.15, 0.06), '#b5804b', { p: [0, 1.55, 0] });
    const roof = new THREE.Shape();
    roof.moveTo(-1.7, 0);
    roof.lineTo(0, 0.6);
    roof.lineTo(1.7, 0);
    roof.lineTo(-1.7, 0);
    const rg = new THREE.ExtrudeGeometry(roof, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
    rg.translate(0, 0, -0.35);
    k.add(rg, '#d6463a', { p: [0, 2.32, 0] });
    k.add('box', '#7a5130', { p: [0, 2.3, 0], s: [3.3, 0.08, 0.6] });
    for (const [x, y, c] of [[-0.75, 1.75, '#fffaf0'], [0, 1.55, '#fff2c4'], [0.75, 1.8, '#fffaf0'], [-0.4, 1.2, '#ffe1ea']])
        k.add('box', c, { p: [x, y, 0.1], r: [0, 0, (x - y) * 0.1], s: [0.55, 0.6, 0.02] });
    return k.mesh();
}
// Hudhud's little tractor, used for ploughing.
export function tractor() {
    const g = new THREE.Group();
    const k = kit();
    k.add(roundBox(1.3, 0.6, 0.8, 0.12), '#d6463a', { p: [0.2, 0.65, 0] });
    k.add(roundBox(0.6, 0.6, 0.75, 0.1), '#d6463a', { p: [-0.35, 1.1, 0] });
    k.add('box', '#9ad7f2', { p: [-0.35, 1.15, 0], s: [0.62, 0.36, 0.6] });
    k.add('cyl', '#3b3029', { p: [0.6, 1.15, 0.2], s: [0.06, 0.5, 0.06] });
    for (const z of [-0.45, 0.45]) {
        k.add('cyl', '#2d2622', { p: [-0.35, 0.45, z], r: [Math.PI / 2, 0, 0], s: [0.45, 0.25, 0.45] }).add('cyl', '#f2c14e', { p: [-0.35, 0.45, z * 1.06], r: [Math.PI / 2, 0, 0], s: [0.2, 0.25, 0.2] });
        k.add('cyl', '#2d2622', { p: [0.6, 0.3, z], r: [Math.PI / 2, 0, 0], s: [0.28, 0.2, 0.28] });
    }
    k.add('box', '#8a8a8a', { p: [-1.0, 0.35, 0], s: [0.5, 0.12, 0.9] });
    for (const z of [-0.3, 0, 0.3])
        k.add('cone', '#6b6b6b', { p: [-1.1, 0.15, z], r: [Math.PI, 0, 0], s: [0.07, 0.3, 0.07] });
    g.add(k.mesh());
    return g;
}
export function wateringCan() {
    return kit()
        .add('cyl', '#3fa7d6', { p: [0, 0.3, 0], s: [0.3, 0.55, 0.3] })
        .add('cyl', '#3fa7d6', { p: [0.42, 0.42, 0], r: [0, 0, -1.0], s: [0.06, 0.6, 0.06] })
        .add('cone', '#2f8fbf', { p: [0.68, 0.6, 0], r: [0, 0, -1.0], s: [0.1, 0.15, 0.1] })
        .add('torus', '#2f8fbf', { p: [-0.1, 0.65, 0], r: [0, 0, 0.2], s: [0.22, 0.22, 0.22] })
        .mesh();
}
export const PRODUCTS = {
    potato: () => kit().add('sphere', '#c9955b', { s: [0.42, 0.32, 0.34] }).add('sphere', '#b07d45', { p: [0.2, 0.08, 0.26], s: 0.05 }).add('sphere', '#b07d45', { p: [-0.18, -0.02, 0.28], s: 0.04 }).add('sphere', '#b07d45', { p: [0.02, 0.18, 0.24], s: 0.035 }),
    tomato: () => kit().add('sphere', '#e8402f', { s: [0.4, 0.34, 0.4] }).add('sphere', '#ff8a70', { p: [-0.14, 0.12, 0.26], s: 0.08 }).add(new THREE.ConeGeometry(0.18, 0.06, 5), '#3f9d3c', { p: [0, 0.34, 0] }).add('cyl', '#3f9d3c', { p: [0, 0.4, 0], s: [0.03, 0.1, 0.03] }),
    cotton: () => { const k = kit(); [[0, 0, 0], [0.22, -0.04, 0.1], [-0.22, -0.04, 0.08], [0.1, 0.18, 0.04], [-0.1, 0.18, 0.06], [0, 0.04, 0.24]].forEach(p => k.add('sphere', '#ffffff', { p, s: 0.2 })); return k.add('cone4', '#8a6a3a', { p: [0, -0.25, 0], r: [Math.PI, 0, 0], s: [0.25, 0.15, 0.25] }); },
    beet: () => kit().add('cone', '#f3ead8', { p: [0, -0.05, 0], r: [Math.PI, 0, 0], s: [0.26, 0.6, 0.26] }).add('sphere', '#f3ead8', { p: [0, 0.22, 0], s: [0.27, 0.15, 0.27] }).add('sphere', '#3f9d3c', { p: [0.08, 0.42, 0], r: [0, 0, -0.4], s: [0.08, 0.22, 0.05] }).add('sphere', '#56b24a', { p: [-0.08, 0.42, 0.03], r: [0, 0, 0.4], s: [0.08, 0.22, 0.05] }),
    milk: () => kit().add('cyl', '#ffffff', { p: [0, -0.05, 0], s: [0.24, 0.55, 0.24] }).add(new THREE.CylinderGeometry(0.1, 0.24, 0.2, 16), '#ffffff', { p: [0, 0.32, 0] }).add('cyl', '#3f8fd6', { p: [0, 0.46, 0], s: [0.11, 0.08, 0.11] }).add('cyl', '#3f8fd6', { p: [0, -0.02, 0], s: [0.245, 0.16, 0.245] }),
    cheese: () => kit().add(roundBox(0.7, 0.36, 0.5, 0.08), '#fffaf0').add('box', '#e9e2cf', { p: [0, 0.0, 0.252], s: [0.55, 0.05, 0.01] }).add('sphere', '#4fae45', { p: [0.2, 0.2, 0.1], s: [0.08, 0.02, 0.05] }),
    honey: () => kit().add('cyl', '#f2a51a', { p: [0, -0.06, 0], s: [0.3, 0.5, 0.3] }).add('cyl', '#ffcf5a', { p: [-0.12, -0.04, 0.2], s: [0.06, 0.32, 0.06] }).add('cyl', '#d6463a', { p: [0, 0.24, 0], s: [0.33, 0.1, 0.33] }).add('cyl', '#fdf6e9', { p: [0, 0.31, 0], s: [0.2, 0.04, 0.2] }),
};
export function product(id) {
    const m = PRODUCTS[id]().mesh();
    m.castShadow = true;
    return m;
}
export function helper(id) {
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const parts = {};
    if (id === 'bee') {
        const k = kit();
        k.add('sphere', '#ffd23f', { p: [0, 0.75, -0.12], s: [0.42, 0.4, 0.5] });
        k.add('torus', '#3b2414', { p: [0, 0.75, -0.18], s: [0.4, 0.4, 0.5] });
        k.add('torus', '#3b2414', { p: [0, 0.74, -0.42], s: [0.3, 0.3, 0.4] });
        k.add('cone', '#3b2414', { p: [0, 0.72, -0.66], r: [-Math.PI / 2, 0, 0], s: [0.07, 0.18, 0.07] });
        k.add('sphere', '#ffd23f', { p: [0, 1.12, 0.22], s: 0.38 });
        k.eyes({ x: 0.15, y: 1.18, z: 0.5, r: 0.11 });
        k.add('sphere', '#ff9aa8', { p: [-0.24, 1.04, 0.44], s: [0.07, 0.04, 0.03] }).add('sphere', '#ff9aa8', { p: [0.24, 1.04, 0.44], s: [0.07, 0.04, 0.03] });
        k.add(new THREE.TorusGeometry(0.07, 0.022, 6, 12, Math.PI), '#3b2414', { p: [0, 1.02, 0.56], r: [0, 0, Math.PI] });
        for (const sx of [-1, 1]) {
            k.add('cyl', '#3b2414', { p: [sx * 0.12, 1.55, 0.3], r: [0.3, 0, -sx * 0.35], s: [0.02, 0.32, 0.02] });
            k.add('sphere', '#3b2414', { p: [sx * 0.2, 1.7, 0.36], s: 0.06 });
            k.add('cyl', '#3b2414', { p: [sx * 0.16, 0.36, 0.0], s: [0.035, 0.22, 0.035] });
        }
        body.add(k.mesh());
        const wingMat = new THREE.MeshLambertMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.8 });
        parts.wings = [-1, 1].map(sx => {
            const w = new THREE.Mesh(GEO.sphere, wingMat);
            w.scale.set(0.34, 0.05, 0.2);
            w.position.set(sx * 0.42, 1.12, -0.12);
            const pivot = new THREE.Group();
            pivot.position.set(sx * 0.12, 0.05, 0);
            pivot.add(w);
            pivot.userData.side = sx;
            const holder = new THREE.Group();
            holder.add(pivot);
            body.add(holder);
            return pivot;
        });
        g.userData.fly = true;
        g.userData.height = 1.9;
    }
    else if (id === 'cow') {
        const k = kit();
        k.add(new THREE.CapsuleGeometry(0.36, 0.5, 6, 12), '#fffaf0', { p: [0, 0.62, -0.15], r: [Math.PI / 2, 0, 0] });
        k.add('sphere', '#7a4a2a', { p: [0.22, 0.75, -0.25], s: [0.2, 0.2, 0.26] }).add('sphere', '#7a4a2a', { p: [-0.25, 0.58, 0.02], s: [0.16, 0.16, 0.18] });
        for (const [x, z] of [[-0.2, 0.12], [0.2, 0.12], [-0.2, -0.42], [0.2, -0.42]]) {
            k.add('cyl', '#fffaf0', { p: [x, 0.22, z], s: [0.1, 0.42, 0.1] }).add('cyl', '#7a4a2a', { p: [x, 0.04, z], s: [0.11, 0.08, 0.11] });
        }
        k.add('sphere', '#fffaf0', { p: [0, 1.12, 0.32], s: [0.42, 0.38, 0.38] });
        k.add('sphere', '#7a4a2a', { p: [0.2, 1.3, 0.3], s: [0.16, 0.12, 0.16] });
        k.add('sphere', '#ffc2cc', { p: [0, 0.98, 0.62], s: [0.3, 0.2, 0.17] });
        k.add('sphere', '#e0909e', { p: [-0.1, 1.0, 0.77], s: 0.035 }).add('sphere', '#e0909e', { p: [0.1, 1.0, 0.77], s: 0.035 });
        k.eyes({ x: 0.17, y: 1.2, z: 0.62, r: 0.1 });
        for (const sx of [-1, 1])
            k.add('cone', '#f3e2b8', { p: [sx * 0.2, 1.5, 0.3], r: [0, 0, -sx * 0.5], s: [0.06, 0.18, 0.06] });
        k.add('torus', '#d0507e', { p: [0, 0.86, 0.36], r: [Math.PI / 2 + 0.3, 0, 0], s: [0.28, 0.28, 0.28] });
        k.add('sphere', '#f2c14e', { p: [0, 0.74, 0.58], s: 0.09 });
        body.add(k.mesh());
        parts.ears = [-1, 1].map(sx => {
            const e = kit().add('sphere', '#fffaf0', { p: [sx * 0.14, 0, 0], s: [0.16, 0.07, 0.1] }).add('sphere', '#ffc2cc', { p: [sx * 0.15, 0, 0.02], s: [0.1, 0.04, 0.06] }).mesh();
            e.position.set(sx * 0.36, 1.3, 0.3);
            e.userData.side = sx;
            body.add(e);
            return e;
        });
        const tail = kit().add('cyl', '#fffaf0', { p: [0, -0.18, 0], s: [0.03, 0.36, 0.03] }).add('sphere', '#7a4a2a', { p: [0, -0.38, 0], s: [0.06, 0.1, 0.06] }).mesh();
        tail.position.set(0, 0.8, -0.62);
        body.add(tail);
        parts.tail = tail;
        g.userData.height = 1.75;
    }
    else if (id === 'puppy') {
        const k = kit();
        k.add(new THREE.CapsuleGeometry(0.28, 0.4, 6, 12), '#d9a066', { p: [0, 0.52, -0.1], r: [Math.PI / 2, 0, 0] });
        k.add('sphere', '#f3d6a8', { p: [0, 0.45, 0.12], s: [0.2, 0.18, 0.2] });
        for (const [x, z] of [[-0.16, 0.12], [0.16, 0.12], [-0.16, -0.32], [0.16, -0.32]])
            k.add('cyl', '#d9a066', { p: [x, 0.18, z], s: [0.08, 0.36, 0.08] }).add('sphere', '#f3d6a8', { p: [x, 0.03, z + 0.03], s: [0.09, 0.06, 0.11] });
        k.add('sphere', '#d9a066', { p: [0, 1.0, 0.22], s: [0.4, 0.37, 0.37] });
        k.add('sphere', '#f3d6a8', { p: [0, 0.88, 0.5], s: [0.22, 0.16, 0.16] });
        k.add('sphere', '#2d2622', { p: [0, 0.95, 0.65], s: [0.07, 0.055, 0.05] });
        k.add('sphere', '#ff7b8a', { p: [0.05, 0.78, 0.6], r: [0.4, 0, 0], s: [0.06, 0.03, 0.08] });
        k.add('sphere', '#a86b3c', { p: [0.16, 1.18, 0.4], s: [0.1, 0.08, 0.05] });
        k.eyes({ x: 0.15, y: 1.07, z: 0.52, r: 0.095 });
        k.add('torus', '#3f8fd6', { p: [0, 0.74, 0.18], r: [Math.PI / 2 + 0.2, 0, 0], s: [0.26, 0.26, 0.26] });
        k.add('cyl', '#f2c14e', { p: [0, 0.64, 0.44], r: [Math.PI / 2, 0, 0], s: [0.07, 0.02, 0.07] });
        body.add(k.mesh());
        parts.ears = [-1, 1].map(sx => {
            const e = kit().add('sphere', '#a86b3c', { p: [0, -0.18, 0], s: [0.12, 0.24, 0.06] }).mesh();
            e.position.set(sx * 0.36, 1.18, 0.18);
            e.rotation.z = sx * 0.35;
            e.userData.side = sx;
            body.add(e);
            return e;
        });
        const tail = kit().add('cyl', '#d9a066', { p: [0, 0.16, 0], s: [0.045, 0.32, 0.045] }).add('sphere', '#f3d6a8', { p: [0, 0.34, 0], s: 0.07 }).mesh();
        tail.position.set(0, 0.62, -0.5);
        tail.rotation.x = -0.6;
        body.add(tail);
        parts.tail = tail;
        g.userData.height = 1.55;
    }
    else {
        // kitty
        const k = kit();
        k.add(new THREE.CapsuleGeometry(0.26, 0.38, 6, 12), '#f2a65a', { p: [0, 0.5, -0.12], r: [Math.PI / 2, 0, 0] });
        k.add('sphere', '#fff3e0', { p: [0, 0.45, 0.1], s: [0.18, 0.17, 0.18] });
        for (const z of [-0.22, 0, -0.42])
            k.add('torus', '#d9803a', { p: [0, 0.52, z], r: [0, 0, 0], s: [0.25, 0.25, 0.08] });
        for (const [x, z] of [[-0.14, 0.1], [0.14, 0.1], [-0.14, -0.32], [0.14, -0.32]])
            k.add('cyl', '#f2a65a', { p: [x, 0.17, z], s: [0.075, 0.34, 0.075] }).add('sphere', '#fff3e0', { p: [x, 0.03, z + 0.03], s: [0.08, 0.05, 0.1] });
        k.add('sphere', '#f2a65a', { p: [0, 0.98, 0.2], s: [0.4, 0.35, 0.34] });
        k.add('sphere', '#fff3e0', { p: [0, 0.88, 0.44], s: [0.2, 0.13, 0.12] });
        k.add('sphere', '#ff8fa3', { p: [0, 0.95, 0.56], s: [0.05, 0.035, 0.03] });
        for (const sx of [-1, 1]) {
            k.add('cone', '#f2a65a', { p: [sx * 0.24, 1.3, 0.18], r: [0, 0, -sx * 0.3], s: [0.13, 0.26, 0.1] });
            k.add('cone', '#ffb3c1', { p: [sx * 0.24, 1.28, 0.22], r: [0, 0, -sx * 0.3], s: [0.07, 0.16, 0.04] });
            for (const dy of [-0.03, 0.03])
                k.add('cyl', '#ffffff', { p: [sx * 0.3, 0.9 + dy, 0.48], r: [0, 0, Math.PI / 2 + sx * dy * 4], s: [0.008, 0.3, 0.008] });
            k.add('box', '#d9803a', { p: [sx * 0.12, 1.24, 0.42], r: [0, 0, sx * 0.2], s: [0.04, 0.1, 0.02] });
        }
        k.eyes({ x: 0.15, y: 1.04, z: 0.46, r: 0.1 });
        k.add('torus', '#d0507e', { p: [0, 0.72, 0.16], r: [Math.PI / 2 + 0.2, 0, 0], s: [0.24, 0.24, 0.24] });
        k.add('sphere', '#f2c14e', { p: [0, 0.64, 0.4], s: 0.06 });
        body.add(k.mesh());
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.25, -0.15), new THREE.Vector3(0, 0.55, -0.1), new THREE.Vector3(0, 0.7, 0.08)]);
        const tail = kit().add(new THREE.TubeGeometry(curve, 16, 0.055, 8, false), '#f2a65a').add('sphere', '#fff3e0', { p: [0, 0.7, 0.08], s: 0.07 }).mesh();
        tail.position.set(0, 0.5, -0.5);
        body.add(tail);
        parts.tail = tail;
        g.userData.height = 1.6;
    }
    g.traverse(o => { if (o.isMesh) {
        o.castShadow = true;
    } });
    g.userData.body = body;
    g.userData.parts = parts;
    return g;
}
// A soft round shadow blob (for things that fly above the ground).
export function blobShadow(r = 0.5) {
    const tex = canvasTex(64, (g, s) => {
        const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        grd.addColorStop(0, 'rgba(0,0,0,0.35)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, s, s);
    });
    tex.colorSpace = THREE.NoColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
}
// The ring that marks the selected place.
export function selectRing(r = 1) {
    const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.86, r, 48), new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.85, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
}
