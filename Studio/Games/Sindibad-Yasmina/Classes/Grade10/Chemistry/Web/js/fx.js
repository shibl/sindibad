// Effects: flames, bubbles, steam and gas, falling powder, liquid streams.
import { THREE, E, V, onFrame } from './engine.js';
import { softTex } from './materials.js';

// ── flame: camera-facing quad with a procedural shader ──
const FLAME_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FLAME_FS = `
varying vec2 vUv;
uniform float uTime, uBend, uSpread, uI, uKind, uSeed;
uniform vec3 uInner, uOuter;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  float h = vUv.y;
  float x = vUv.x * 2.0 - 1.0;
  float n = noise(vec2(x * 2.0 + uSeed, h * 5.0 - uTime * 7.0));
  float n2 = noise(vec2(x * 6.0 - uSeed, h * 10.0 - uTime * 13.0));
  x -= uBend * h * h * 1.5 + (n - 0.5) * 0.16 * h * (1.0 + uSpread * 3.0);
  float prof = sqrt(clamp(h * 7.0, 0.0, 1.0)) * pow(max(1.0 - h, 0.0), 0.7) * (1.0 + uSpread * 1.3 * h);
  float edge = abs(x) / max(prof, 0.001);
  float body = 1.0 - smoothstep(0.5, 1.0, edge + (n2 - 0.5) * (0.12 + 0.5 * uSpread));
  float tip = 1.0 - smoothstep(0.78, 1.0, h + (n - 0.5) * 0.22);
  float a = body * tip;
  vec3 col;
  if (uKind > 0.5) {
    float core = (1.0 - smoothstep(0.0, 0.7, edge)) * smoothstep(0.08, 0.3, h) * (1.0 - smoothstep(0.45, 0.85, h));
    vec3 blue = vec3(0.18, 0.32, 1.0), orange = vec3(1.0, 0.42, 0.08), yellow = vec3(1.0, 0.86, 0.5);
    col = mix(blue, orange, smoothstep(0.02, 0.2, h));
    col = mix(col, yellow, core);
    a *= mix(0.45, 1.0, smoothstep(0.0, 0.18, h));
  } else {
    float ic = (1.0 - smoothstep(-0.05, 0.08, edge - 0.62 * (1.0 - h / 0.42))) * step(h, 0.42);
    col = mix(uOuter * 0.55, uInner * 1.5, ic);
    a = max(a * 0.75, ic * 0.9);
  }
  gl_FragColor = vec4(col * a * uI, a * uI);
}`;

const flames = new Set();
const _w = new THREE.Vector3(), _pq = new THREE.Quaternion(), _yq = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
// Flames stay upright in the world and turn to face the camera, whatever holds them.
onFrame(() => {
  for (const f of flames) {
    f.mat.uniforms.uTime.value = E.t;
    if (!f.mesh.parent || !f.mesh.visible) continue;
    f.mesh.getWorldPosition(_w);
    _yq.setFromAxisAngle(_up, Math.atan2(E.camera.position.x - _w.x, E.camera.position.z - _w.z));
    f.mesh.parent.getWorldQuaternion(_pq);
    f.mesh.quaternion.copy(_pq.invert().multiply(_yq));
    if (f.light) f.light.intensity = f.on ? f.lightI * (0.85 + 0.15 * Math.sin(E.t * 23 + f.seed) * Math.sin(E.t * 7)) * f.level : 0;
  }
});

export function flame({ h = 0.06, w = 0.024, kind = 'bunsen', light = null } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uBend: { value: 0 }, uSpread: { value: 0 }, uI: { value: 0 }, uKind: { value: kind === 'candle' ? 1 : 0 },
      uSeed: { value: Math.random() * 10 }, uInner: { value: new THREE.Color(0x3f7dff) }, uOuter: { value: new THREE.Color(0x8d9dff) },
    },
    vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(0, h / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 7;
  mesh.visible = false;
  mesh.raycast = () => {};
  const f = { mesh, mat, on: false, level: 1, light: null, lightI: 0, seed: Math.random() * 6 };
  if (light) {
    f.light = new THREE.PointLight(light.color, 0, light.dist ?? 0.8, 2);
    f.light.position.y = h * 0.5;
    f.lightI = light.intensity;
    mesh.add(f.light);
  }
  f.set = on => {
    f.on = on;
    mesh.visible = on;
    mat.uniforms.uI.value = on ? f.level : 0;
  };
  f.setLevel = l => { f.level = l; if (f.on) mat.uniforms.uI.value = l; };
  flames.add(f);
  f.dispose = () => flames.delete(f);
  return f;
}

// ── bubbles inside a vessel (local space of `parent`) ──
const bubbleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0, envMapIntensity: 2.2, clearcoat: 1, depthWrite: false });
bubbleMat.userData.shared = true;
const bubbleGeo = new THREE.SphereGeometry(1, 10, 8);
bubbleGeo.userData = {};

// area(): { x, z, r, y0, y1 } in parent space — bubbles start near (x, y0, z) within r and burst at y1.
export function bubbles(parent, { n = 40, size = 0.0016, speed = 0.05, area }) {
  const mesh = new THREE.InstancedMesh(bubbleGeo.clone(), bubbleMat, n);
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  parent.add(mesh);
  const P = Array.from({ length: n }, () => ({ x: 0, y: -1, z: 0, v: 0, s: 0, live: false, ph: Math.random() * 6 }));
  const B = { mesh, rate: 0, size };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const off = onFrame(dt => {
    const a = area();
    P.forEach((p, i) => {
      if (!p.live) {
        if (B.rate > 0 && Math.random() < B.rate * dt * 6) {
          const ang = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * a.r;
          Object.assign(p, { x: a.x + Math.cos(ang) * rr, z: a.z + Math.sin(ang) * rr, y: a.y0, v: speed * (0.6 + Math.random() * 0.8), s: B.size * (0.5 + Math.random()), live: true });
        }
      } else {
        p.y += p.v * dt;
        p.x += Math.sin(E.t * 9 + p.ph) * 0.004 * dt;
        if (p.y >= a.y1) p.live = false;
      }
      const s = p.live ? p.s * (1 + (p.y - a.y0) * 4) : 0;
      m4.compose(ps.set(p.x, p.y, p.z), q, sc.setScalar(s));
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  B.dispose = () => { off(); parent.remove(mesh); mesh.geometry.dispose(); };
  return B;
}

// ── sprite emitter in world space: steam, coloured gases, smoke ──
export function emitter(sc, { n = 40, color = 0xffffff, opacity = 0.35, size = [0.02, 0.08], life = 2.5, rise = 0.06, spread = 0.01, origin, drift = () => V(), blending = THREE.NormalBlending }) {
  const tex = softTex();
  const P = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: 0, depthWrite: false, blending });
    m.userData.shared = false;
    const s = new THREE.Sprite(m);
    s.visible = false;
    s.renderOrder = 8;
    s.raycast = () => {};
    sc.add(s);
    P.push({ s, age: 0, life: 1, live: false, v: V() });
  }
  const Em = { rate: 0, color: new THREE.Color(color), opacity };
  let acc = 0;
  sc.onFrame(dt => {
    acc += Em.rate * dt;
    for (const p of P) {
      if (!p.live && acc >= 1) {
        acc -= 1;
        const o = origin();
        p.s.position.set(o.x + (Math.random() - 0.5) * spread, o.y, o.z + (Math.random() - 0.5) * spread);
        p.v.set((Math.random() - 0.5) * rise * 0.25, rise * (0.7 + Math.random() * 0.6), (Math.random() - 0.5) * rise * 0.25);
        p.age = 0;
        p.life = life * (0.7 + Math.random() * 0.6);
        p.live = true;
        p.s.visible = true;
        p.s.material.color.copy(Em.color);
        p.s.material.rotation = Math.random() * 6.28;
      }
      if (!p.live) continue;
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) { p.live = false; p.s.visible = false; continue; }
      const d = drift(p.s.position, k);
      p.s.position.addScaledVector(p.v, dt).addScaledVector(d, dt);
      const sz = size[0] + (size[1] - size[0]) * k;
      p.s.scale.set(sz, sz, 1);
      p.s.material.opacity = Em.opacity * Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k * 0.3);
    }
    if (acc > 3) acc = 3;
  });
  return Em;
}

// ── falling grains (powder from a spatula) ──
export function grains(sc, { n = 60, color = 0x333333, size = 0.0012 }) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  sc.add(mesh);
  const P = Array.from({ length: n }, () => ({ p: V(), v: V(), live: false, floor: 0 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  sc.onFrame(dt => {
    P.forEach((g, i) => {
      if (g.live) {
        g.v.y -= 9.8 * dt * 0.35;
        g.p.addScaledVector(g.v, dt);
        if (g.p.y < g.floor) g.live = false;
      }
      q.setFromAxisAngle(V(0.3, 1, 0.2).normalize(), i);
      m4.compose(g.p, q, s.setScalar(g.live ? size * (0.6 + (i % 5) * 0.2) : 0));
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return {
    pour(from, floorY, count = 30, spread = 0.004) {
      let k = 0;
      for (const g of P) {
        if (g.live || k >= count) continue;
        g.p.set(from.x + (Math.random() - 0.5) * spread, from.y + Math.random() * 0.004 + k * 0.0009, from.z + (Math.random() - 0.5) * spread);
        g.v.set((Math.random() - 0.5) * 0.02, -0.02 - Math.random() * 0.05, (Math.random() - 0.5) * 0.02);
        g.floor = floorY;
        g.live = true;
        k++;
      }
    },
    setColor(c) { mat.color.setHex(c); },
  };
}

// ── a liquid stream between two world points ──
export function stream(sc, color = 0xdfeff7, opacity = 0.55, r = 0.0018) {
  const mat = new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false });
  const geo = new THREE.CylinderGeometry(r, r * 0.8, 1, 10, 1, true);
  geo.translate(0, -0.5, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  mesh.renderOrder = 4;
  mesh.raycast = () => {};
  sc.add(mesh);
  const up = V(0, 1, 0), d = V();
  return {
    mesh,
    set(a, b) {
      if (!a) { mesh.visible = false; return; }
      mesh.visible = true;
      mesh.position.copy(a);
      d.subVectors(a, b);
      const len = d.length();
      mesh.scale.set(1, len, 1);
      mesh.quaternion.setFromUnitVectors(up, d.normalize());
    },
    color(c) { mat.color.set(c); },
  };
}
