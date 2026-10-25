// Made from globe.ts by tools/build.ts. Edit that file, then run: npm run build
// The atlas globe: a 3D Earth to spin with a finger. Tap a country and its
// atlas card opens — flag, name, capital, currency, what its name and its
// flag mean, its resources, a fact. Two little games: «أين تقع؟» (find the
// country on the globe) and «علم مَن هذا؟» (whose flag is it?).
//
// The countries are drawn on a texture from worlds/atlas/shapes.js (Natural
// Earth); their cards come from worlds/atlas/countries.js.
//
//   openGlobe(host, { onClose, say, sfx, visited }) → { close }
//
// The browser loads globe.js, made from this file by `npm run build`.
import * as THREE from '../../vendor/three/three.module.min.js';
import { SHAPES } from '../../worlds/atlas/shapes.js';
import { COUNTRIES, SMALL, CONTINENTS } from '../../worlds/atlas/countries.js';
import { num } from '../format.js';
const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
const ALL = { ...COUNTRIES, ...SMALL };
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
} return b; };
const FULL = Object.keys(ALL).filter(id => ALL[id].flag);
const ARAB = FULL.filter(id => ALL[id].arab);
const PAL = { africa: '#f3d9a2', asia: '#f7e6b0', europe: '#d8e7c2', namerica: '#cfe0ef', samerica: '#e6d4ec', oceania: '#f3cfc0', antarctica: '#f4f4f4' };
const ARAB_FILL = '#ffcf6b';
// Each ring with its longitudes unwrapped (no jump at ±180), and its box.
const RINGS = {};
for (const [id, rings] of Object.entries(SHAPES)) {
    RINGS[id] = rings.map(r => {
        const pts = [];
        let prev = null;
        for (let i = 0; i < r.length; i += 2) {
            let lon = r[i] / 10;
            const lat = r[i + 1] / 10;
            if (prev !== null) {
                while (lon - prev > 180)
                    lon -= 360;
                while (prev - lon > 180)
                    lon += 360;
            }
            pts.push([lon, lat]);
            prev = lon;
        }
        let w = 1e9, e = -1e9, s = 1e9, n = -1e9;
        for (const [x, y] of pts) {
            w = Math.min(w, x);
            e = Math.max(e, x);
            s = Math.min(s, y);
            n = Math.max(n, y);
        }
        return { pts, box: [w, e, s, n] };
    });
}
function inRing(lon, lat, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
            inside = !inside;
    }
    return inside;
}
function countryAt(lon, lat) {
    for (const [id, rings] of Object.entries(RINGS)) {
        for (const { pts, box } of rings)
            for (const L of [lon, lon - 360, lon + 360]) {
                if (L < box[0] || L > box[1] || lat < box[2] || lat > box[3])
                    continue;
                if (inRing(L, lat, pts))
                    return id;
            }
    }
    // the small countries the map has no shape for: the nearest dot
    let best = null, bd = 2.2;
    for (const [id, c] of Object.entries(SMALL)) {
        const d = Math.hypot(c.lon - lon, c.lat - lat);
        if (d < bd) {
            bd = d;
            best = id;
        }
    }
    return best;
}
const nameOf = (id) => ALL[id]?.ar || '';
export function openGlobe(host, { onClose, say, sfx, visited = new Set(), onVisit }) {
    const lite = document.body.classList.contains('lite');
    host.innerHTML = `<div class="gl" role="dialog" aria-label="الكرة الأرضية">
    <div class="gl-stage"></div>
    <div class="gl-tags"></div>
    <header class="gl-top"><button class="btn btn--round gl-x" aria-label="إغلاق">✕</button><h2>🌍 أطلس العالم</h2>
      <span class="hud-pill gl-count" title="الدول العربية التي زرتها">🛂 <b>${num([...visited].filter(id => ALL[id]?.arab).length)}</b><small> من ${num(ARAB.length)}</small></span></header>
    <div class="gl-modes"><button class="gl-mode is-on" data-mode="explore">🔎 أستكشف</button><button class="gl-mode" data-mode="find">📍 أين تقع؟</button><button class="gl-mode" data-mode="flag">🚩 علم مَن هذا؟</button></div>
    <p class="gl-ask" hidden></p>
    <div class="gl-card" hidden></div>
    <p class="gl-hint">👆 اسحب لتدير الأرض، واضغط على دولة لتفتح بطاقتها</p>
  </div>`;
    const $ = (s) => host.querySelector(s);
    const stageEl = $('.gl-stage'), card = $('.gl-card'), ask = $('.gl-ask'), tags = $('.gl-tags');
    // ---------- the Earth ----------
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: true });
    }
    catch {
        stageEl.innerHTML = '<p class="gl-nogl">جهازك لا يرسم الكرة الأرضية ثلاثية الأبعاد.</p>';
    }
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 3.6);
    const earth = new THREE.Group();
    scene.add(earth);
    const W = lite ? 1024 : 2048, H = W / 2;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g2 = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, lite ? 48 : 96, lite ? 32 : 64), new THREE.MeshPhongMaterial({ map: tex, shininess: 14, specular: '#333a44' }));
    earth.add(globe);
    // a soft blue halo of air around the Earth
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.09, 48, 32), new THREE.ShaderMaterial({
        side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying vec3 vN; void main(){ float k = pow(0.72 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(0.45, 0.75, 1.0, 1.0) * k; }',
    }));
    scene.add(halo);
    scene.add(new THREE.HemisphereLight('#ffffff', '#6a7a90', 1.5));
    const sun = new THREE.DirectionalLight('#fff6e0', 1.6);
    sun.position.set(-3, 2, 4);
    scene.add(sun);
    // stars
    const sp = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(30 + Math.random() * 20);
        sp.set([v.x, v.y, v.z], i * 3);
    }
    const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: '#ffffff', size: 0.12, sizeAttenuation: true }));
    scene.add(stars);
    const X = (lon) => ((lon + 180) / 360) * W, Y = (lat) => ((90 - lat) / 180) * H;
    function paint(sel = null, mark = null) {
        const grd = g2.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#2b6fb3');
        grd.addColorStop(0.5, '#3f9bd6');
        grd.addColorStop(1, '#2b6fb3');
        g2.fillStyle = grd;
        g2.fillRect(0, 0, W, H);
        g2.strokeStyle = 'rgba(255,255,255,.14)';
        g2.lineWidth = 1;
        for (let lon = -180; lon <= 180; lon += 30) {
            g2.beginPath();
            g2.moveTo(X(lon), 0);
            g2.lineTo(X(lon), H);
            g2.stroke();
        }
        for (let lat = -60; lat <= 60; lat += 30) {
            g2.beginPath();
            g2.moveTo(0, Y(lat));
            g2.lineTo(W, Y(lat));
            g2.stroke();
        }
        g2.strokeStyle = 'rgba(255,230,120,.45)';
        g2.setLineDash([8, 6]);
        g2.beginPath();
        g2.moveTo(0, Y(0));
        g2.lineTo(W, Y(0));
        g2.stroke();
        g2.setLineDash([]);
        for (const [id, rings] of Object.entries(RINGS)) {
            const c = ALL[id];
            const fill = id === sel ? '#ff7a3c' : id === mark ? '#ffe36b' : c?.arab ? ARAB_FILL : PAL[c?.continent] || '#e9e4d8';
            g2.fillStyle = fill;
            g2.strokeStyle = id === sel ? '#7a2a0a' : 'rgba(80,70,50,.55)';
            g2.lineWidth = id === sel ? 3 : 1.1;
            for (const off of [-W, 0, W])
                for (const { pts } of rings) {
                    g2.beginPath();
                    pts.forEach(([lon, lat], i) => { const x = X(lon) + off, y = Y(lat); if (i)
                        g2.lineTo(x, y);
                    else
                        g2.moveTo(x, y); });
                    g2.closePath();
                    g2.fill();
                    g2.stroke();
                }
        }
        for (const [id, c] of Object.entries(SMALL)) {
            g2.beginPath();
            g2.arc(X(c.lon), Y(c.lat), id === sel ? 9 : 6, 0, Math.PI * 2);
            g2.fillStyle = id === sel ? '#ff7a3c' : c.arab ? ARAB_FILL : '#e9e4d8';
            g2.fill();
            g2.strokeStyle = '#5a4a30';
            g2.lineWidth = 1.5;
            g2.stroke();
        }
        tex.needsUpdate = true;
    }
    paint();
    if (renderer) {
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.5 : 2));
        stageEl.append(renderer.domElement);
    }
    // ---------- turning and tapping ----------
    let yaw = -0.6, pitch = 0.35, vy = 0, vp = 0, dist = 3.6, goal = null, dragging = false, moved = 0, last = null, auto = true;
    const pointers = new Map();
    const onDown = (e) => { pointers.set(e.pointerId, [e.clientX, e.clientY]); dragging = true; moved = 0; last = [e.clientX, e.clientY]; vy = vp = 0; goal = null; auto = false; stageEl.setPointerCapture?.(e.pointerId); };
    const onMove = (e) => {
        if (!pointers.has(e.pointerId))
            return;
        const prevPts = [...pointers.values()];
        pointers.set(e.pointerId, [e.clientX, e.clientY]);
        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()], [c, d] = prevPts;
            const d1 = Math.hypot(a[0] - b[0], a[1] - b[1]), d0 = Math.hypot(c[0] - d[0], c[1] - d[1]);
            if (d0 > 0)
                dist = Math.min(4.6, Math.max(1.7, dist * (d0 / d1)));
            moved += 20;
            return;
        }
        const dx = e.clientX - last[0], dy = e.clientY - last[1];
        last = [e.clientX, e.clientY];
        moved += Math.abs(dx) + Math.abs(dy);
        const k = 0.005 * (dist / 3.6);
        vy = dx * k;
        vp = dy * k;
        yaw += vy;
        pitch = Math.max(-1.3, Math.min(1.3, pitch + vp));
    };
    const onUp = (e) => {
        pointers.delete(e.pointerId);
        if (pointers.size)
            return;
        dragging = false;
        if (moved < 8)
            pick(e.clientX, e.clientY);
    };
    stageEl.addEventListener('pointerdown', onDown);
    stageEl.addEventListener('pointermove', onMove);
    stageEl.addEventListener('pointerup', onUp);
    stageEl.addEventListener('pointercancel', onUp);
    stageEl.addEventListener('wheel', (e) => { e.preventDefault(); dist = Math.min(4.6, Math.max(1.7, dist * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(cx, cy) {
        const r = renderer.domElement.getBoundingClientRect();
        ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObject(globe)[0];
        if (!hit)
            return;
        const lon = hit.uv.x * 360 - 180, lat = hit.uv.y * 180 - 90;
        const id = countryAt(lon, lat);
        if (id)
            choose(id);
    }
    // Turn the globe so a point faces the camera.
    function face(lon, lat) {
        goal = { yaw: -(lon * Math.PI) / 180 - Math.PI / 2, pitch: (lat * Math.PI) / 180 };
        const two = Math.PI * 2;
        while (goal.yaw - yaw > Math.PI)
            goal.yaw -= two;
        while (yaw - goal.yaw > Math.PI)
            goal.yaw += two;
        auto = false;
    }
    // ---------- the atlas card ----------
    let mode = 'explore', round = null, score = 0, tries = 0;
    function cardHTML(id) {
        const c = ALL[id];
        if (!c)
            return '';
        if (!c.flag)
            return `<div class="gl-card__head"><b>${c.ar}</b><small>${CONTINENTS[c.continent] || ''}${c.capital ? ` • العاصمة: ${c.capital}` : ''}</small></div><button class="gl-card__x" aria-label="إغلاق">✕</button>`;
        const row = (icon, k, v) => (v ? `<div class="gl-row"><span>${icon}</span><div><small>${k}</small><p>${v}</p></div></div>` : '');
        return `<button class="gl-card__x" aria-label="إغلاق">✕</button>
      <div class="gl-card__head"><span class="gl-flag">${c.flag.svg}</span><div><b>${c.ar}</b><small>${c.official || ''}</small></div></div>
      <div class="gl-facts">
        ${row('🏛️', 'العاصمة', c.capital)}${row('🌍', 'القارّة', CONTINENTS[c.continent])}
        ${row('💰', 'العملة', c.currency ? `${c.currency.ar} <span dir="ltr" class="gl-code">${c.currency.code}</span>` : '')}${row('🗣️', 'اللغة', c.language)}
        ${row('📛', 'معنى الاسم', c.nameMeaning)}${row('🚩', 'معنى العلم', c.flagMeaning)}
        ${row('⛏️', 'من مواردها', (c.resources || []).join('، '))}${row('💡', 'هل تعلم؟', c.fact)}
      </div>`;
    }
    function showCard(id) {
        card.innerHTML = cardHTML(id);
        card.hidden = false;
        card.classList.remove('is-pop');
        void card.offsetWidth;
        card.classList.add('is-pop');
        card.querySelector('.gl-card__x')?.addEventListener('click', () => { sfx.tap(); card.hidden = true; paint(); selected = null; layout(); });
        layout();
    }
    let selected = null;
    function choose(id) {
        sfx.tap();
        if (mode === 'find' && round) {
            if (id === round.id) {
                score += tries ? 0 : 1;
                win(`أحسنت! هذه <b>${nameOf(id)}</b>. 📍`);
                selected = id;
                paint(id);
                showCard(id);
                visit(id);
            }
            else {
                tries += 1;
                sfx.bad?.();
                say(`هذه <b>${nameOf(id)}</b>. ابحث عن <b>${nameOf(round.id)}</b>! ${tries > 1 ? 'انظر إلى ما يلمع ✨' : ''}`, 'oops');
                paint(null, tries > 1 ? round.id : null);
                if (tries > 1)
                    face(ALL[round.id].lon, ALL[round.id].lat);
            }
            return;
        }
        if (mode === 'flag')
            return;
        selected = id;
        paint(id);
        const c = ALL[id];
        if (c) {
            face(c.lon ?? 0, c.lat ?? 0);
            showCard(id);
            visit(id);
        }
    }
    function visit(id) {
        if (visited.has(id))
            return;
        visited.add(id);
        onVisit?.(id);
        $('.gl-count b').textContent = num([...visited].filter(x => ALL[x]?.arab).length);
    }
    // ---------- the two games ----------
    function newRound() {
        tries = 0;
        card.hidden = true;
        selected = null;
        paint();
        const pool = shuffle(ARAB.concat(shuffle(FULL.filter(id => !ALL[id].arab)).slice(0, 10)));
        const id = pool[0];
        if (mode === 'find') {
            round = { id };
            ask.innerHTML = `📍 أين تقع <b>${nameOf(id)}</b>؟ <small>اضغط عليها على الكرة الأرضية</small> <span class="gl-score">⭐ ${num(score)}</span>`;
            ask.dataset.answer = id;
        }
        else {
            const opts = shuffle([id, ...shuffle(FULL.filter(x => x !== id)).slice(0, 2)]);
            round = { id, opts };
            ask.innerHTML = `<span class="gl-flag gl-flag--big">${ALL[id].flag.svg}</span><span>🚩 علم مَن هذا؟ <span class="gl-score">⭐ ${num(score)}</span></span>
        <span class="gl-opts">${opts.map(o => `<button class="gl-opt" data-id="${o}" ${o === id ? 'data-ok' : ''}>${nameOf(o)}</button>`).join('')}</span>`;
        }
        ask.hidden = false;
        layout();
    }
    function win(html) {
        sfx.good?.();
        say(html, 'cheer');
        round = null;
        ask.innerHTML = `${ask.innerHTML.split('<span class="gl-score">')[0]} <button class="btn btn--gold gl-next" data-next>التالي ◀</button>`;
    }
    ask.addEventListener('click', e => {
        const n = e.target.closest('[data-next]');
        if (n) {
            sfx.tap();
            newRound();
            return;
        }
        const o = e.target.closest('.gl-opt');
        if (!o || !round)
            return;
        if (o.dataset.id === round.id) {
            score += tries ? 0 : 1;
            const c = ALL[round.id];
            paint(round.id);
            face(c.lon, c.lat);
            showCard(round.id);
            visit(round.id);
            win(`نعم! هذا علم <b>${nameOf(round.id)}</b>. 🚩`);
        }
        else {
            tries += 1;
            o.disabled = true;
            sfx.bad?.();
            say(`ليس علم ${nameOf(o.dataset.id)}. انظر إلى الألوان والرموز جيداً!`, 'oops');
        }
    });
    host.querySelector('.gl-modes').addEventListener('click', e => {
        const b = e.target.closest('.gl-mode');
        if (!b)
            return;
        sfx.tap();
        mode = b.dataset.mode;
        host.querySelectorAll('.gl-mode').forEach(x => x.classList.toggle('is-on', x === b));
        $('.gl-hint').hidden = mode !== 'explore';
        if (mode === 'explore') {
            ask.hidden = true;
            round = null;
            paint(selected);
            layout();
            return;
        }
        score = 0;
        newRound();
    });
    // The globe sits in the middle of the space the buttons, the question and
    // the card leave free, so the chosen country is never under the card.
    let viewY = 0, viewGoal = 0, vw = 1, vh = 1;
    function layout() {
        const bottomOf = (el) => el.offsetTop + el.offsetHeight;
        let top = bottomOf($('.gl-modes'));
        if (!ask.hidden)
            top = Math.max(top, bottomOf(ask));
        const bottom = card.hidden ? vh : card.offsetTop;
        viewGoal = vh / 2 - (top + bottom) / 2;
        if (TEST) {
            viewY = viewGoal;
            setView();
        }
    }
    function setView() {
        camera.setViewOffset(vw, vh, 0, viewY, vw, vh);
    }
    // ---------- every frame ----------
    let raf = 0, lastT = performance.now();
    const _q = new THREE.Vector3();
    const tagFor = {};
    function frame(now) {
        const dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;
        if (goal) {
            yaw += (goal.yaw - yaw) * (1 - Math.exp(-dt * 5));
            pitch += (goal.pitch - pitch) * (1 - Math.exp(-dt * 5));
            if (Math.abs(goal.yaw - yaw) + Math.abs(goal.pitch - pitch) < 0.002)
                goal = null;
        }
        else if (!dragging) {
            yaw += vy;
            pitch = Math.max(-1.3, Math.min(1.3, pitch + vp));
            vy *= 0.93;
            vp *= 0.93;
            if (auto)
                yaw += dt * 0.08;
        }
        earth.rotation.set(pitch, yaw, 0, 'XYZ');
        camera.position.z += (dist - camera.position.z) * (1 - Math.exp(-dt * 8));
        if (Math.abs(viewGoal - viewY) > 0.5) {
            viewY += (viewGoal - viewY) * (1 - Math.exp(-dt * 6));
            setView();
        }
        stars.rotation.y = yaw * 0.1;
        // the name of the chosen country (and the Arab countries when close), pinned on the globe
        const show = new Set(selected ? [selected] : []);
        if (dist < 2.6 && mode === 'explore')
            ARAB.forEach(id => show.add(id));
        for (const [id, el] of Object.entries(tagFor))
            if (!show.has(id)) {
                el.remove();
                delete tagFor[id];
            }
        const r = renderer?.domElement.getBoundingClientRect();
        for (const id of show) {
            const c = ALL[id];
            if (!c || c.lat == null || !r)
                continue;
            const phi = ((c.lon + 180) * Math.PI) / 180, th = ((90 - c.lat) * Math.PI) / 180;
            _q.set(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th)).multiplyScalar(1.01);
            earth.localToWorld(_q);
            const facing = _q.clone().normalize().dot(camera.position.clone().normalize()) > 0.2;
            _q.project(camera);
            let el = tagFor[id];
            if (!el) {
                el = tagFor[id] = document.createElement('span');
                el.className = `gl-tag${id === selected ? ' is-sel' : ''}`;
                el.textContent = c.ar;
                tags.append(el);
            }
            el.classList.toggle('is-sel', id === selected);
            el.hidden = !facing;
            el.style.transform = `translate(${((_q.x + 1) / 2) * r.width}px, ${((1 - _q.y) / 2) * r.height}px) translate(-50%, -120%)`;
        }
        if (renderer)
            renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
    }
    function resize() {
        if (!renderer)
            return;
        const w = stageEl.clientWidth || innerWidth, h = stageEl.clientHeight || innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = w < h ? 42 : 32;
        vw = w;
        vh = h;
        layout();
        viewY = viewGoal;
        setView();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(stageEl);
    resize();
    raf = requestAnimationFrame(frame);
    face(36, 28); // start over the Arab world
    if (TEST) {
        yaw = goal.yaw;
        pitch = goal.pitch;
        goal = null;
    }
    function close() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        renderer?.dispose();
        // Give the 3D view back now, not whenever the page is cleaned up: a phone
        // allows only a few at once, and the oldest one (an island's) is lost.
        renderer?.forceContextLoss();
        globe.geometry.dispose();
        globe.material.dispose();
        tex.dispose();
        host.innerHTML = '';
        host.hidden = true;
    }
    $('.gl-x').addEventListener('click', () => { sfx.tap(); close(); onClose?.(); });
    host.hidden = false;
    return { close, choose, debug: () => ({ mode, selected, round: round?.id || null, score, visited: [...visited] }) };
}
