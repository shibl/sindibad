// Made from scene.ts by tools/build.ts. Edit that file, then run: npm run build
// The farm's 3D stage: renderer, camera, light, the render loop, touch
// controls (drag to look around, pinch or wheel to zoom, tap to pick), a
// few particle effects and the day–night "time-lapse" that shows weeks
// passing in a couple of seconds.
//
// Light enough for budget phones: one sun with a small shadow map (none in
// lite mode), merged meshes, capped pixel ratio, and the loop stops when the
// farm is not on screen or the app is in the background.
//
// The browser loads scene.js, made from this file by `npm run build`.
import * as THREE from '../../vendor/three/three.module.min.js';
import { wind, VC } from './models.js';
const TAP_MOVE = 10; // px: more than this is a drag, not a tap
const TAP_TIME = 450; // ms
const LOST_WAIT = 1000; // ms: a lost 3D view not given back by then is made anew
// Particles: little bursts of dirt, water, leaves, sparkles.
const KINDS = {
    dirt: { colors: ['#8a5a34', '#a36f42', '#6f4529'], size: 0.12, up: 3, spread: 2.2, grav: 9, life: 0.8 },
    water: { colors: ['#4cc3e0', '#8fe0f0', '#ffffff'], size: 0.07, up: -1, spread: 0.6, grav: 12, life: 0.7 },
    leaf: { colors: ['#4fae45', '#7ccf5a', '#3a8f3a'], size: 0.1, up: 3.5, spread: 2.4, grav: 7, life: 0.9 },
    spark: { colors: ['#fff3a0', '#ffd23f', '#ffffff'], size: 0.09, up: 4, spread: 2.6, grav: 4, life: 1.0 },
    fluff: { colors: ['#ffffff', '#f6f6f6'], size: 0.12, up: 2.5, spread: 1.6, grav: 2, life: 1.2 },
    salt: { colors: ['#ffffff', '#e8eef2'], size: 0.05, up: 0, spread: 0.5, grav: 8, life: 0.8 },
};
// Options (the music island uses them; the farm keeps the defaults): fov
// [portrait, landscape], the sky colour, the fog's near and far, the canvas's
// CSS class.
// A renderer for a 3D view. Some phones refuse the full look (smooth edges,
// the fast graphics chip): then try once more with the lightest one before
// giving up. `light` says which one it got (light: no shadows, pixel ratio 1).
export function newRenderer(lite, opts = {}) {
    if (!lite) {
        try {
            return { renderer: new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', ...opts }), light: false };
        }
        catch (err) {
            console.warn('3D: trying lighter settings', err);
        }
    }
    return { renderer: new THREE.WebGLRenderer({ antialias: false, ...opts }), light: true };
}
export function createStage(host, { lite = false, fov = [40, 32], sky = '#9fd9ee', fog = [90, 190], cls = 'farm-canvas' } = {}) {
    // The renderer can be made anew (see renew, below), so the code that runs
    // later always reads `renderer` and `canvas`, never a copy kept from here.
    let lostAt = 0;
    let renderer = makeRenderer();
    let canvas = renderer.domElement;
    host.prepend(canvas);
    const scene = new THREE.Scene();
    const SKY = new THREE.Color(sky);
    const background = SKY.clone();
    scene.background = background;
    const sceneFog = new THREE.Fog(SKY.clone(), fog[0], fog[1]);
    scene.fog = sceneFog;
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 400);
    // ---------- Light ----------
    const hemi = new THREE.HemisphereLight('#dff4ff', '#7a6a4a', 1.5);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
    sun.position.set(-18, 34, 22);
    sun.castShadow = !lite;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -30;
    sc.right = 30;
    sc.top = 26;
    sc.bottom = -26;
    sc.near = 5;
    sc.far = 90;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    const DAY = { hemi: 1.5, sun: 2.6, sky: SKY.clone(), sunColor: new THREE.Color('#fff1d6') };
    // ---------- Camera rig: a target on the ground, looked at from above ----------
    const rig = {
        target: new THREE.Vector3(0, 0, 2),
        goal: new THREE.Vector3(0, 0, 2),
        dist: 42, goalDist: 42,
        yaw: -0.5, // radians around Y
        pitch: 0.92, // radians down from the horizon
        vel: new THREE.Vector2(),
        bounds: { x: 20, zMin: -15, zMax: 17 },
        min: 14, max: 80,
    };
    function placeCamera() {
        const { target, dist, yaw, pitch } = rig;
        camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
        camera.lookAt(target);
    }
    // ---------- Size ----------
    let W = 1, H = 1;
    function resize() {
        const r = host.getBoundingClientRect();
        if (!r.width || !r.height)
            return;
        W = r.width;
        H = r.height;
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        // Narrow (portrait) screens: widen the view so the farm still fits.
        camera.fov = W < H ? fov[0] : fov[1];
        camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(host);
    // ---------- Picking ----------
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const clickables = [];
    function addClickable(obj, id) {
        obj.traverse(o => { o.userData.place = id; });
        clickables.push(obj);
    }
    function removeClickable(obj) {
        const i = clickables.indexOf(obj);
        if (i >= 0)
            clickables.splice(i, 1);
    }
    function pick(x, y) {
        const r = canvas.getBoundingClientRect();
        ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObjects(clickables, true).find(h => h.object.visible !== false && h.object.userData.place);
        return hit ? hit.object.userData.place : null;
    }
    // Where a world point is on screen (CSS px, relative to the host).
    const _p = new THREE.Vector3();
    function project(v) {
        _p.copy(v).project(camera);
        return { x: (_p.x + 1) / 2 * W, y: (1 - _p.y) / 2 * H, on: _p.z < 1 && Math.abs(_p.x) < 1.15 && Math.abs(_p.y) < 1.15 };
    }
    // ---------- Touch / mouse controls ----------
    // On the canvas (each new one too: see makeRenderer).
    const pointers = new Map();
    let tapStart = null, pinch = null, onTap = () => { }, enabled = true;
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const groundAt = (x, y, out) => {
        const r = canvas.getBoundingClientRect();
        ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        return raycaster.ray.intersectPlane(groundPlane, out);
    };
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    function down(e) {
        if (!enabled)
            return;
        canvas.setPointerCapture?.(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        rig.vel.set(0, 0);
        if (pointers.size === 1)
            tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
        else {
            tapStart = null;
            pinch = null;
        }
    }
    function move(e) {
        const p = pointers.get(e.pointerId);
        if (!p || !enabled)
            return;
        if (pointers.size === 1) {
            // Drag: keep the ground point under the finger.
            if (groundAt(p.x, p.y, a) && groundAt(e.clientX, e.clientY, b)) {
                const dx = a.x - b.x, dz = a.z - b.z;
                rig.goal.x += dx;
                rig.goal.z += dz;
                rig.target.x += dx;
                rig.target.z += dz;
                rig.vel.set(dx, dz);
            }
            if (tapStart && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > TAP_MOVE)
                tapStart = null;
        }
        else if (pointers.size === 2) {
            const [p1, p2] = [...pointers.values()];
            const d0 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            p.x = e.clientX;
            p.y = e.clientY;
            const [q1, q2] = [...pointers.values()];
            const d1 = Math.hypot(q1.x - q2.x, q1.y - q2.y);
            if (d0 > 0 && d1 > 0) {
                rig.goalDist = THREE.MathUtils.clamp(rig.goalDist * (d0 / d1), rig.min, rig.max);
                rig.dist = rig.goalDist;
            }
            return;
        }
        p.x = e.clientX;
        p.y = e.clientY;
    }
    function up(e) {
        if (!pointers.has(e.pointerId))
            return;
        pointers.delete(e.pointerId);
        if (tapStart && performance.now() - tapStart.t < TAP_TIME) {
            const id = pick(e.clientX, e.clientY);
            rig.vel.set(0, 0);
            onTap(id, e);
        }
        tapStart = null;
    }
    function wheel(e) {
        e.preventDefault();
        if (!enabled)
            return;
        rig.goalDist = THREE.MathUtils.clamp(rig.goalDist * Math.exp(e.deltaY * 0.0012), rig.min, rig.max);
    }
    // Smoothly move the camera to look at a point (and zoom).
    function focus(v, dist) {
        rig.goal.set(v.x, 0, v.z);
        if (dist)
            rig.goalDist = THREE.MathUtils.clamp(dist, rig.min, rig.max);
        rig.vel.set(0, 0);
    }
    // ---------- Particles: little bursts of dirt, water, leaves, sparkles ----------
    const MAX = lite ? 120 : 260;
    const pGeo = new THREE.IcosahedronGeometry(1, 0);
    const pMat = new THREE.MeshLambertMaterial({ vertexColors: false });
    const pMesh = new THREE.InstancedMesh(pGeo, pMat, MAX);
    pMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    pMesh.frustumCulled = false;
    scene.add(pMesh);
    const parts = [];
    const _c = new THREE.Color(), _d = new THREE.Object3D();
    function burst(kind, at, n = 14) {
        const k = KINDS[kind];
        for (let i = 0; i < n; i++) {
            if (parts.length >= MAX)
                parts.shift();
            parts.push({
                x: at.x + (Math.random() - 0.5) * (kind === 'water' ? 2.6 : 0.6), y: at.y + (kind === 'water' ? 1.6 + Math.random() * 0.8 : 0.2), z: at.z + (Math.random() - 0.5) * (kind === 'water' ? 2.6 : 0.6),
                vx: (Math.random() - 0.5) * k.spread, vy: k.up + Math.random() * 1.5, vz: (Math.random() - 0.5) * k.spread,
                t: 0, life: k.life * (0.7 + Math.random() * 0.6), s: k.size * (0.6 + Math.random() * 0.8), grav: k.grav,
                color: k.colors[i % k.colors.length],
            });
        }
    }
    function stepParticles(dt) {
        let n = 0;
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.t += dt;
            if (p.t >= p.life) {
                parts.splice(i, 1);
                continue;
            }
            p.vy -= p.grav * dt;
            p.x += p.vx * dt;
            p.y = Math.max(0.05, p.y + p.vy * dt);
            p.z += p.vz * dt;
        }
        for (const p of parts) {
            const s = p.s * (1 - (p.t / p.life) ** 3);
            _d.position.set(p.x, p.y, p.z);
            _d.scale.setScalar(s);
            _d.rotation.set(p.t * 4, p.t * 3, 0);
            _d.updateMatrix();
            pMesh.setMatrixAt(n, _d.matrix);
            pMesh.setColorAt(n, _c.set(p.color));
            n++;
        }
        pMesh.count = n;
        pMesh.instanceMatrix.needsUpdate = true;
        if (pMesh.instanceColor)
            pMesh.instanceColor.needsUpdate = true;
    }
    // ---------- Time-lapse: the sun sets and rises over and over ----------
    let lapse = null;
    const seaUniforms = [];
    function timelapse(seconds = 2.6, nights = 2) {
        // Real time, not frame time: on a slow phone it still lasts `seconds`.
        return new Promise(resolve => { lapse = { t0: performance.now(), dur: seconds, resolve, nights }; });
    }
    const NIGHT_SKY = new THREE.Color('#1d2a4f'), DUSK = new THREE.Color('#ffb36b'), MOON = new THREE.Color('#5a6cb0'), HEMI_DAY = hemi.color.clone();
    function stepLapse() {
        if (!lapse)
            return;
        const k = Math.min(1, (performance.now() - lapse.t0) / 1000 / lapse.dur);
        // darkness: 0 at day, 1 at midnight; `nights` dips during the lapse
        const dark = Math.max(0, Math.sin(k * Math.PI * lapse.nights)) ** 1.5 * 0.85;
        const ang = k * Math.PI * 2 * lapse.nights;
        sun.position.set(Math.cos(ang) * -30, 34 * Math.cos(ang * 0.5) ** 2 + 6, 22);
        hemi.intensity = DAY.hemi * (1 - dark * 0.75);
        hemi.color.copy(HEMI_DAY).lerp(MOON, dark);
        sun.intensity = DAY.sun * (1 - dark);
        sun.color.copy(DAY.sunColor).lerp(DUSK, Math.min(1, dark * 1.6) * (1 - dark));
        background.copy(DAY.sky).lerp(NIGHT_SKY, dark);
        sceneFog.color.copy(background);
        for (const u of seaUniforms)
            u.value = dark;
        if (k >= 1) {
            sun.position.set(-18, 34, 22);
            sun.intensity = DAY.sun;
            sun.color.copy(DAY.sunColor);
            hemi.intensity = DAY.hemi;
            hemi.color.copy(HEMI_DAY);
            background.copy(DAY.sky);
            sceneFog.color.copy(DAY.sky);
            for (const u of seaUniforms)
                u.value = 0;
            const r = lapse.resolve;
            lapse = null;
            r();
        }
    }
    // ---------- Loop ----------
    const frameFns = [];
    let running = false, last = 0, time = 0, raf = 0;
    function frame(now) {
        if (!running)
            return;
        raf = requestAnimationFrame(frame);
        if (document.hidden) {
            last = now;
            return;
        }
        if (lostAt && now - lostAt > LOST_WAIT)
            renew();
        const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
        last = now;
        time += dt;
        wind.value = time;
        // camera easing + a little glide after a flick
        if (!pointers.size && rig.vel.lengthSq() > 1e-5) {
            rig.goal.x += rig.vel.x;
            rig.goal.z += rig.vel.y;
            rig.vel.multiplyScalar(0.88);
        }
        rig.goal.x = THREE.MathUtils.clamp(rig.goal.x, -rig.bounds.x, rig.bounds.x);
        rig.goal.z = THREE.MathUtils.clamp(rig.goal.z, rig.bounds.zMin, rig.bounds.zMax);
        rig.target.lerp(rig.goal, 1 - Math.exp(-dt * 7));
        rig.dist += (rig.goalDist - rig.dist) * (1 - Math.exp(-dt * 6));
        placeCamera();
        stepLapse();
        stepParticles(dt);
        for (const f of frameFns)
            f(dt, time);
        renderer.render(scene, camera);
    }
    function start() {
        if (running)
            return;
        // Lost while the child was elsewhere: draw again straight away.
        if (renderer.getContext().isContextLost())
            renew();
        running = true;
        last = performance.now();
        resize();
        raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }
    // The child sailed away: give the 3D view (and the graphics memory behind
    // it) back to the phone, so it never holds one per island visited. The
    // scene stays; start() makes a new view for it, like after a lost one.
    function release() {
        stop();
        if (!renderer.getContext().isContextLost())
            renderer.forceContextLoss();
    }
    // ---------- When the 3D view is lost ----------
    // The browser can take the 3D drawing (the WebGL context) away from the
    // page: too many 3D views at once, low memory, a long time in the
    // background. If it gives it back, three.js carries on by itself. If not,
    // the island stayed white: instead, make a new renderer for the same scene
    // (three.js sends the models to it again by itself).
    function makeRenderer() {
        const { renderer: r, light } = newRenderer(lite, { preserveDrawingBuffer: !!window.__SINDBAD_TEST__ });
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, light ? 1 : 1.75));
        r.outputColorSpace = THREE.SRGBColorSpace;
        r.shadowMap.enabled = !light;
        r.shadowMap.type = THREE.PCFSoftShadowMap;
        const c = r.domElement;
        c.className = cls;
        c.setAttribute('aria-hidden', 'true');
        c.addEventListener('pointerdown', down);
        c.addEventListener('pointermove', move);
        c.addEventListener('pointerup', up);
        c.addEventListener('pointercancel', up);
        c.addEventListener('wheel', wheel, { passive: false });
        c.addEventListener('webglcontextlost', () => { lostAt = performance.now(); });
        c.addEventListener('webglcontextrestored', () => { lostAt = 0; });
        return r;
    }
    function renew() {
        lostAt = 0;
        let fresh;
        try {
            fresh = makeRenderer();
        }
        catch (err) {
            console.warn('3D: could not draw again', err);
            return;
        }
        const old = renderer;
        renderer = fresh;
        canvas = fresh.domElement;
        old.domElement.replaceWith(canvas);
        old.dispose();
        pointers.clear();
        tapStart = null;
        resize();
    }
    // Render small pictures of models (icons for menus), with a transparent
    // background, using a second tiny renderer that is thrown away after.
    function snapshots(list, size = 128) {
        const out = {};
        let r2;
        try {
            r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        }
        catch {
            return out;
        }
        r2.setPixelRatio(1);
        r2.setSize(size, size, false);
        r2.outputColorSpace = THREE.SRGBColorSpace;
        const s2 = new THREE.Scene();
        s2.add(new THREE.HemisphereLight('#ffffff', '#8a7a5a', 2.2));
        const l = new THREE.DirectionalLight('#ffffff', 2.2);
        l.position.set(2, 4, 5);
        s2.add(l);
        const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
        const box = new THREE.Box3(), c = new THREE.Vector3(), sz = new THREE.Vector3();
        for (const { id, object, yaw = 0.5, pitch = 0.35, pad = 1.15 } of list) {
            s2.add(object);
            object.rotation.y = yaw;
            box.setFromObject(object);
            box.getCenter(c);
            box.getSize(sz);
            const d = (Math.max(sz.x, sz.y, sz.z) * pad) / (2 * Math.tan((cam.fov * Math.PI) / 360));
            cam.position.set(c.x, c.y + Math.sin(pitch) * d, c.z + Math.cos(pitch) * d);
            cam.lookAt(c);
            r2.render(s2, cam);
            out[id] = r2.domElement.toDataURL('image/png');
            s2.remove(object);
        }
        r2.dispose();
        r2.forceContextLoss?.();
        return out;
    }
    return {
        THREE, scene, camera, rig, sun, hemi,
        get renderer() { return renderer; },
        get canvas() { return canvas; },
        addClickable, removeClickable, pick, project, focus, burst, timelapse, snapshots,
        seaNight: (u) => seaUniforms.push(u),
        onFrame: (f) => frameFns.push(f),
        onTap: (f) => { onTap = f; },
        setEnabled: (v) => { enabled = v; if (!v) {
            pointers.clear();
            tapStart = null;
        } },
        start, stop, release, resize,
        get time() { return time; },
        get lapsing() { return !!lapse; },
    };
}
export { VC };
