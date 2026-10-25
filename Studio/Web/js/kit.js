import { tr, lang } from './lab-locale.js';
// Lab equipment built from primitives. Every builder returns { group, ... } with the parts experiments animate.
// Local origin is the object's base centre unless noted.
import { THREE, V } from './engine.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glass, liquidMat, metal, matte, plastic, rubber, canvasTex, labelTex, gradTex, FONT, drawFormula, rrect } from './materials.js';
import { flame } from './fx.js';

const v2 = (r, y) => new THREE.Vector2(r, y);
export const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => v2(Math.max(0, r), y)), seg);
const mesh = (geo, mat, { cast = true, receive = false, order } = {}) => {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (order !== undefined) m.renderOrder = order;
  return m;
};
const glassMesh = (geo, opts) => mesh(geo, glass(opts), { cast: false, order: 6 });

// Shared materials (not disposed with stations).
const shared = m => { m.userData.shared = true; return m; };
export const M = {
  chrome: shared(metal(0xd4d8dd, 0.22)),
  steel: shared(metal(0x9aa1a9, 0.42)),
  dark: shared(new THREE.MeshStandardMaterial({ color: 0x24272c, metalness: 0.55, roughness: 0.45 })),
  enamel: shared(plastic(0x2f3a48, 0.5)),
  cork: shared(matte(0xb08a5b, 0.9)),
  rubber: shared(rubber(0x3a2a26)),
  rubberGrey: shared(rubber(0x50555c)),
  wood: shared(matte(0xa77b4f, 0.65)),
  white: shared(plastic(0xf2f2ee, 0.5)),
  red: shared(plastic(0xb3261e, 0.4)),
  black: shared(plastic(0x15171a, 0.5)),
};

// ── liquids: lathe body clipped by a horizontal world plane, plus a surface disc ──
// profile: inner wall points [r, y] from the bottom centre upwards.
export function liquid(profile, { color = 0xbfe0ee, opacity = 0.55, level = 0, solid = false, rough = 0.06 } = {}) {
  const plane = new THREE.Plane(V(0, -1, 0), 0);
  const mk = op => {
    const m = solid
      ? new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, side: THREE.DoubleSide })
      : liquidMat(color, op);
    return m;
  };
  const mat = mk(opacity);
  mat.clippingPlanes = [plane];
  const body = mesh(lathe(profile, 40), mat, { cast: false, order: solid ? undefined : 2 });
  const capMat = mk(Math.min(0.95, opacity + 0.12));
  const cap = mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), capMat, { cast: false, order: solid ? undefined : 2 });
  const group = new THREE.Group();
  group.add(body, cap);
  const tmp = V();
  const L = {
    group, body, cap, level, profile, mats: [mat, capMat],
    radiusAt(h) {
      for (let i = 1; i < profile.length; i++) {
        const [r0, y0] = profile[i - 1], [r1, y1] = profile[i];
        if (h <= y1 && y1 > y0) return r0 + (r1 - r0) * ((h - y0) / (y1 - y0));
      }
      return profile.at(-1)[0];
    },
    set(h) {
      L.level = h;
      const show = h > profile[0][1] + 0.0004;
      group.visible = show;
      cap.position.y = h;
      cap.scale.setScalar(Math.max(0.0001, L.radiusAt(h) - 0.0002));
      return L;
    },
    color(c) { mat.color.set(c); capMat.color.set(c); if (!solid) { mat.emissive.set(c); capMat.emissive.set(c); } return L; },
    opacity(o) { if (!solid) { mat.opacity = o; capMat.opacity = Math.min(0.97, o + 0.12); } return L; },
    capOff() { cap.visible = false; return L; },
  };
  body.onBeforeRender = () => {
    tmp.set(0, L.level, 0);
    body.localToWorld(tmp);
    plane.constant = tmp.y;
  };
  L.set(level);
  return L;
}

// ── glassware ──
export function beaker({ r = 0.032, h = 0.09, t = 0.0016, grad = true } = {}) {
  const group = new THREE.Group();
  const pts = [[0, 0], [r - 0.003, 0], [r, 0.003], [r, h], [r + 0.0014, h + 0.0012], [r - t, h + 0.0006], [r - t, t + 0.003], [r - t - 0.003, t], [0, t]];
  const g = glassMesh(lathe(pts, 56));
  group.add(g);
  // pouring lip
  const lip = glassMesh(new THREE.TorusGeometry(0.004, 0.0012, 6, 12, Math.PI));
  lip.position.set(-r - 0.001, h, 0);
  lip.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  group.add(lip);
  if (grad) {
    const tex = gradTex(Math.round(h * 50));
    const gm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85 });
    const arc = 0.7;
    const gr = mesh(new THREE.CylinderGeometry(r + 0.0004, r + 0.0004, h * 0.78, 24, 1, true, 0.35 - arc / 2, arc), gm, { cast: false, order: 6 });
    gr.position.y = h * 0.47;
    group.add(gr);
  }
  const inR = r - t;
  const liq = liquid([[0, t], [inR - 0.003, t], [inR - 0.0004, t + 0.003], [inR - 0.0004, h]]);
  group.add(liq.group);
  return { group, liquid: liq, r, h, inR, bottom: t, mouth: h };
}

export function testTube({ r = 0.0085, L = 0.15, t = 0.0009 } = {}) {
  const group = new THREE.Group();
  const outer = [], inner = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI / 2;
    outer.push([r * Math.sin(a), r - r * Math.cos(a)]);
  }
  for (let i = 10; i >= 0; i--) {
    const a = (i / 10) * Math.PI / 2, ri = r - t;
    inner.push([ri * Math.sin(a), r - ri * Math.cos(a)]);
  }
  const prof = [...outer, [r, L], [r + 0.0011, L + 0.0006], [r - t, L + 0.0002], [r - t, r], ...inner.slice(1)];
  const g = glassMesh(lathe(prof, 32));
  group.add(g);
  const liqProf = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI / 2, ri = r - t - 0.0003;
    liqProf.push([ri * Math.sin(a), r - ri * Math.cos(a)]);
  }
  liqProf.push([r - t - 0.0003, L]);
  const liq = liquid(liqProf);
  group.add(liq.group);
  return { group, liquid: liq, liqProf, r, L, inR: r - t, bottom: t, mouth: L };
}

export function erlenmeyer({ R = 0.04, rn = 0.012, H = 0.13, hc = 0.085, t = 0.0016 } = {}) {
  const group = new THREE.Group();
  const out = [[0, 0], [R - 0.006, 0], [R, 0.006], [R - 0.002, 0.014], [rn + 0.003, hc], [rn, hc + 0.01], [rn, H], [rn + 0.0018, H + 0.0016]];
  const inn = out.slice(1, 7).map(([r, y]) => [r - t, y + (y < 0.01 ? t : 0)]).reverse();
  const g = glassMesh(lathe([...out, [rn - t, H + 0.0008], ...inn, [0, t]], 56));
  group.add(g);
  const prof = [[0, t], [R - 0.006 - t, t], [R - t - 0.0005, 0.006 + t * 0.5], [R - 0.002 - t, 0.014], [rn + 0.003 - t, hc], [rn - t, hc + 0.01], [rn - t, H]];
  const liq = liquid(prof);
  group.add(liq.group);
  return { group, liquid: liq, R, H, rn, mouth: H, bottom: t };
}

// Round-bottom (distillation) flask with an optional side arm. Origin at the bottom of the sphere.
export function rbFlask({ R = 0.045, rn = 0.012, neck = 0.095, t = 0.0016, arm = null } = {}) {
  const group = new THREE.Group();
  const th = Math.acos(rn / R);
  const yj = R + R * Math.sin(th);
  const outer = [], inner = [];
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + (i / 24) * (Math.PI / 2 + th);
    outer.push([R * Math.cos(a), R + R * Math.sin(a)]);
  }
  const Ri = R - t;
  for (let i = 24; i >= 0; i--) {
    const a = -Math.PI / 2 + (i / 24) * (Math.PI / 2 + th);
    inner.push([Ri * Math.cos(a), R + Ri * Math.sin(a)]);
  }
  const top = yj + neck;
  const prof = [...outer, [rn, top], [rn + 0.0016, top + 0.0012], [rn - t, top + 0.0006], [rn - t, yj], ...inner.slice(1)];
  group.add(glassMesh(lathe(prof, 56)));
  const lp = [];
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + (i / 24) * (Math.PI / 2 + th);
    lp.push([(Ri - 0.0004) * Math.cos(a), R + (Ri - 0.0004) * Math.sin(a)]);
  }
  lp.push([rn - t - 0.0004, top]);
  const liq = liquid(lp);
  group.add(liq.group);
  const out = { group, liquid: liq, R, rn, yj, top, mouth: top };
  if (arm) {
    // side arm leaves the neck at height arm.y, pointing along local -x, tilted down by arm.angle
    const a = arm.angle ?? 0.35, len = arm.len ?? 0.08, ra = arm.r ?? 0.0045;
    const dir = V(-Math.cos(a), -Math.sin(a), 0);
    const start = V(-rn * 0.6, arm.y, 0), end = start.clone().addScaledVector(dir, len);
    const tube = glassMesh(new THREE.CylinderGeometry(ra, ra, len, 20, 1, true));
    tube.position.copy(start).add(end).multiplyScalar(0.5);
    tube.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().negate());
    group.add(tube);
    out.armEnd = end;
    out.armDir = dir;
  }
  return out;
}

// Liebig condenser along local +x, centred at the origin. Low end is -x (where water comes in).
export function condenser({ L = 0.36, rIn = 0.0055, rOut = 0.016 } = {}) {
  const group = new THREE.Group();
  const rotX = g => g.rotateZ(Math.PI / 2);
  group.add(glassMesh(rotX(new THREE.CylinderGeometry(rIn, rIn, L + 0.1, 20, 1, true))));
  group.add(glassMesh(rotX(new THREE.CylinderGeometry(rOut, rOut, L, 36, 1, true))));
  for (const s of [-1, 1]) {
    const end = glassMesh(new THREE.RingGeometry(rIn, rOut, 36));
    end.rotation.y = Math.PI / 2;
    end.position.x = s * L / 2;
    group.add(end);
  }
  // ports: low end points down, high end points up
  const port = (x, up) => {
    const p = glassMesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.026, 14, 1, true));
    p.position.set(x, (up ? 1 : -1) * (rOut + 0.011), 0);
    group.add(p);
    const tip = new THREE.Object3D();
    tip.position.set(x, (up ? 1 : -1) * (rOut + 0.024), 0);
    group.add(tip);
    return tip;
  };
  const lowPort = port(-L / 2 + 0.03, false), highPort = port(L / 2 - 0.03, true);
  // jacket water (fills from the low end; level in world y)
  const jp = [[0, -L / 2], [rOut - 0.0012, -L / 2], [rOut - 0.0012, L / 2]];
  const water = liquid(jp, { color: 0xbfe0f2, opacity: 0.38 });
  water.capOff();
  water.group.rotation.z = -Math.PI / 2;
  group.add(water.group);
  return { group, L, rIn, rOut, lowPort, highPort, water };
}

// Thermometer: glass rod with a red spirit column and a printed scale. Origin at the bulb tip.
export function thermometer({ L = 0.26, min = -40, max = 120 } = {}) {
  const group = new THREE.Group();
  const r = 0.0032;
  const rod = glassMesh(new THREE.CylinderGeometry(r, r, L, 18));
  rod.position.y = L / 2 + 0.006;
  group.add(rod);
  const top = glassMesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  top.position.y = L + 0.006;
  group.add(top);
  const bulb = mesh(new THREE.CapsuleGeometry(0.0026, 0.009, 6, 14), new THREE.MeshStandardMaterial({ color: 0xc81e1e, emissive: 0x5a0000, roughness: 0.3 }), { cast: false });
  bulb.position.y = 0.0075;
  group.add(bulb);
  group.add(glassMesh(new THREE.CapsuleGeometry(0.0036, 0.009, 6, 16)).translateY(0.0075));
  const colMat = new THREE.MeshStandardMaterial({ color: 0xd42020, emissive: 0x700000, roughness: 0.3 });
  const col = mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 1, 8), colMat, { cast: false });
  group.add(col);
  // printed scale strip
  const y0 = 0.03, y1 = L - 0.01;
  const tex = canvasTex(64, 1024, (g, w, h) => {
    g.fillStyle = '#f4f4f0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#111';
    g.font = `600 15px ${FONT}`;
    g.textAlign = 'left';
    for (let T = min; T <= max; T += 2) {
      const y = h - ((T - min) / (max - min)) * h;
      const major = T % 10 === 0;
      g.fillRect(0, y - (major ? 1.5 : 0.75), major ? 26 : 14, major ? 3 : 1.5);
      if (major) g.fillText(String(T), 30, y + 5);
    }
  });
  const strip = mesh(new THREE.PlaneGeometry(0.0042, y1 - y0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), { cast: false });
  strip.position.set(0, (y0 + y1) / 2, -0.0015);
  group.add(strip);
  const T = { group, value: 20, L };
  T.set = v => {
    T.value = v;
    const k = Math.max(0, Math.min(1, (v - min) / (max - min)));
    const top = y0 + k * (y1 - y0);
    const len = Math.max(0.001, top - 0.012);
    col.scale.y = len;
    col.position.y = 0.012 + len / 2;
  };
  T.set(20);
  T.topLocal = V(0, L + 0.02, 0);
  return T;
}

// ── heat ──
export function bunsen({ hose = V(-0.16, 0, -0.26) } = {}) {
  const group = new THREE.Group();
  const base = mesh(lathe([[0, 0], [0.038, 0], [0.04, 0.004], [0.036, 0.011], [0.012, 0.016], [0.008, 0.02], [0, 0.02]], 40), M.dark);
  group.add(base);
  const barrel = mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.115, 24), M.chrome);
  barrel.position.y = 0.075;
  group.add(barrel);
  const collar = mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.016, 24), M.steel);
  collar.position.y = 0.032;
  group.add(collar);
  const holes = mesh(new THREE.CylinderGeometry(0.0087, 0.0087, 0.005, 24), M.dark);
  holes.position.y = 0.032;
  group.add(holes);
  const inlet = mesh(new THREE.CylinderGeometry(0.0035, 0.004, 0.03, 12), M.chrome);
  inlet.rotation.z = Math.PI / 2;
  inlet.position.set(-0.026, 0.012, 0);
  group.add(inlet);
  const curve = new THREE.CatmullRomCurve3([V(-0.04, 0.012, 0), V(-0.08, 0.004, 0), hose.clone().multiplyScalar(0.6).setY(0.004), hose.clone().setY(0.006)]);
  group.add(mesh(new THREE.TubeGeometry(curve, 48, 0.0045, 10), shared(new THREE.MeshStandardMaterial({ color: 0xc8742d, roughness: 0.55 }))));
  const tap = mesh(new RoundedBoxGeometry(0.03, 0.03, 0.02, 2, 0.004), M.chrome);
  tap.position.copy(hose).setY(0.015);
  group.add(tap);
  const fl = flame({ h: 0.055, w: 0.026, kind: 'bunsen' });
  fl.mesh.position.y = 0.1325;
  group.add(fl.mesh);
  return { group, flame: fl, top: 0.1325, lit: false };
}

export function tripod({ h = 0.2, r = 0.05, gauze = true } = {}) {
  const group = new THREE.Group();
  const ring = mesh(new THREE.TorusGeometry(r, 0.003, 8, 40), M.dark);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = h;
  group.add(ring);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const top = V(Math.cos(a) * r, h, Math.sin(a) * r), bot = V(Math.cos(a) * r * 1.45, 0, Math.sin(a) * r * 1.45);
    const len = top.distanceTo(bot);
    const leg = mesh(new THREE.CylinderGeometry(0.003, 0.003, len, 8), M.dark);
    leg.position.copy(top).add(bot).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(V(0, 1, 0), top.clone().sub(bot).normalize());
    group.add(leg);
  }
  if (gauze) {
    const tex = canvasTex(256, 256, (g, w) => {
      g.fillStyle = '#5d6168';
      g.fillRect(0, 0, w, w);
      g.strokeStyle = '#8c9199';
      g.lineWidth = 1.4;
      for (let i = 0; i < w; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, w); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w * 0.33);
      gr.addColorStop(0, '#e8e4dc');
      gr.addColorStop(0.85, '#d6d1c7');
      gr.addColorStop(1, 'rgba(214,209,199,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(w / 2, w / 2, w * 0.33, 0, Math.PI * 2);
      g.fill();
    });
    const gz = mesh(new THREE.BoxGeometry(0.13, 0.0016, 0.13), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.2 }), { receive: true });
    gz.position.y = h + 0.0035;
    group.add(gz);
  }
  return { group, top: gauze ? h + 0.0045 : h };
}

// Retort stand with clamps. Rod at local (0, 0, -0.07).
export function stand({ h = 0.5, rodZ = -0.07 } = {}) {
  const group = new THREE.Group();
  const base = mesh(new RoundedBoxGeometry(0.15, 0.014, 0.22, 2, 0.004), M.enamel, { receive: true });
  base.position.y = 0.007;
  group.add(base);
  const rod = mesh(new THREE.CylinderGeometry(0.0055, 0.0055, h, 18), M.chrome);
  rod.position.set(0, h / 2 + 0.01, rodZ);
  group.add(rod);
  const S = { group, rodZ };
  // clamp(y, reach, yaw): boss head on the rod and an arm reaching along +z (before yaw). Returns { group, tip }.
  S.clamp = (y, reach = 0.1, yaw = 0, jaw = 0.012) => {
    const c = new THREE.Group();
    c.position.set(0, y, rodZ);
    c.rotation.y = yaw;
    const boss = mesh(new RoundedBoxGeometry(0.022, 0.022, 0.022, 2, 0.003), M.steel);
    c.add(boss);
    const screw = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 10), M.chrome);
    screw.rotation.z = Math.PI / 2;
    screw.position.x = 0.018;
    c.add(screw);
    // arm stops at a yoke behind the object; two jaws wrap round it
    const back = Math.max(0.02, reach + 0.004 - jaw - 0.007);
    const arm = mesh(new THREE.CylinderGeometry(0.0042, 0.0042, back, 12), M.chrome);
    arm.rotation.x = Math.PI / 2;
    arm.position.z = back / 2;
    c.add(arm);
    const yoke = mesh(new RoundedBoxGeometry(2 * jaw + 0.014, 0.008, 0.007, 1, 0.002), M.steel);
    yoke.position.z = back;
    c.add(yoke);
    const jd = jaw + 0.016;
    for (const s of [-1, 1]) {
      const j = mesh(new RoundedBoxGeometry(0.005, 0.014, jd, 1, 0.0018), M.steel);
      j.position.set(s * (jaw + 0.0045), 0, back + jd / 2);
      c.add(j);
      const pad = mesh(new THREE.BoxGeometry(0.002, 0.012, Math.max(0.008, jaw * 1.3)), M.cork);
      pad.position.set(s * (jaw + 0.001), 0, reach + 0.004);
      c.add(pad);
    }
    const tip = new THREE.Object3D();
    tip.position.z = reach + 0.004;
    c.add(tip);
    group.add(c);
    return { group: c, tip };
  };
  return S;
}

export function rack({ n = 4, gap = 0.032 } = {}) {
  const group = new THREE.Group();
  const w = n * gap + 0.02;
  const tex = canvasTex(512, 96, (g, W, H) => {
    g.fillStyle = '#b48759';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(90,55,25,${0.05 + Math.random() * 0.08})`; g.beginPath(); g.moveTo(0, Math.random() * H); g.lineTo(W, Math.random() * H); g.stroke(); }
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) * gap + 0.01) / w * W;
      g.fillStyle = '#2b1d10';
      g.beginPath();
      g.ellipse(x, H / 2, 0.0098 / w * W, H * 0.24, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  const top = mesh(new THREE.BoxGeometry(w, 0.008, 0.04), [M.wood, M.wood, topMat, M.wood, M.wood, M.wood], { receive: true });
  top.position.y = 0.07;
  group.add(top);
  const bot = mesh(new THREE.BoxGeometry(w, 0.008, 0.04), M.wood, { receive: true });
  bot.position.y = 0.004;
  group.add(bot);
  for (const s of [-1, 1]) {
    const side = mesh(new THREE.BoxGeometry(0.008, 0.074, 0.04), M.wood);
    side.position.set(s * (w / 2 - 0.004), 0.037, 0);
    group.add(side);
  }
  const slot = i => V(-w / 2 + 0.01 + (i + 0.5) * gap, 0.009, 0);
  return { group, slot, w };
}

// ── bottles and jars with labels ──
export function bottle({ name, formula = '', hazard = null, kind = 'narrow', amber = false, color = '#0f766e', content = null, contentLevel = 0.6, cap = 0x22262b } = {}) {
  const group = new THREE.Group();
  const wide = kind === 'wide';
  const R = wide ? 0.03 : 0.028, H = wide ? 0.07 : 0.095, rn = wide ? 0.024 : 0.011, neck = wide ? 0.012 : 0.022;
  const sh = wide ? 0.008 : 0.022;
  const out = [[0, 0], [R - 0.004, 0], [R, 0.004], [R, H], [rn + 0.003, H + sh], [rn, H + sh + 0.004], [rn, H + sh + neck]];
  const t = 0.002;
  const inn = out.slice(1).map(([r, y]) => [r - t, y + (y < 0.005 ? t : 0)]).reverse();
  const gm = mesh(lathe([...out, ...inn, [0, t]], 48), glass(amber ? { tint: 0x4a2208, base: 0.42, edge: 0.4 } : { base: 0.06 }), { cast: false, order: 6 });
  group.add(gm);
  const capY = H + sh + neck;
  const capM = mesh(wide ? new THREE.CylinderGeometry(rn + 0.003, rn + 0.003, 0.016, 36) : new THREE.CylinderGeometry(rn + 0.0025, rn + 0.0025, 0.02, 32), plastic(cap, 0.45));
  capM.position.y = capY + (wide ? 0.006 : 0.008);
  group.add(capM);
  if (content !== null) {
    const prof = [[0, t], [R - t - 0.004, t], [R - t - 0.0005, t + 0.004], [R - t - 0.0005, H]];
    const solid = content.solid;
    const L = liquid(prof, { color: content.color, opacity: content.opacity ?? 0.5, solid, rough: 0.95 });
    L.set(t + H * contentLevel);
    group.add(L.group);
    if (solid && content.map) L.mats.forEach(m => { m.map = content.map; });
  }
  const tex = labelTex({ name, formula, hazard, color });
  const lab = mesh(new THREE.CylinderGeometry(R + 0.0006, R + 0.0006, H * 0.62, 40, 1, true, -0.95, 1.9), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), { cast: false });
  lab.position.y = H * 0.5;
  group.add(lab);
  return { group, H: capY, cap: capM, mouthY: capY, R };
}

// Grainy powder texture (iron filings, copper oxide, charcoal…).
export function powderTex(base, speck, n = 1600) {
  return canvasTex(256, 256, (g, w) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, w);
    for (let i = 0; i < n; i++) {
      g.fillStyle = speck[i % speck.length];
      const s = 1 + Math.random() * 2.4;
      g.fillRect(Math.random() * w, Math.random() * w, s, s);
    }
  }, { repeat: [2, 2] });
}

export function spatula() {
  const group = new THREE.Group();
  const blade = mesh(new RoundedBoxGeometry(0.012, 0.0012, 0.04, 1, 0.0005), M.chrome);
  blade.position.z = -0.075;
  group.add(blade);
  const rod = mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.11, 8), M.chrome);
  rod.rotation.x = Math.PI / 2;
  group.add(rod);
  const tipEnd = new THREE.Object3D();
  tipEnd.position.set(0, 0.002, -0.088);
  group.add(tipEnd);
  return { group, tip: tipEnd };
}

export function matchbox() {
  const group = new THREE.Group();
  const tex = canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#1f4e79';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4c542';
    g.font = `700 46px ${FONT}`;
    g.textAlign = 'center';
    g.direction = lang === 'ar' ? 'rtl' : 'ltr';
    g.fillText(tr('ثقاب'), w / 2, h / 2 + 16);
  });
  const box = mesh(new RoundedBoxGeometry(0.052, 0.016, 0.036, 2, 0.002), [matte(0x6b4a2e), matte(0x6b4a2e), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), matte(0x1f4e79), matte(0x1f4e79), matte(0x1f4e79)]);
  box.position.y = 0.008;
  group.add(box);
  const match = new THREE.Group();
  const stick = mesh(new THREE.BoxGeometry(0.0024, 0.0024, 0.05), matte(0xe3c28f));
  match.add(stick);
  const head = mesh(new THREE.SphereGeometry(0.0021, 10, 8), matte(0x9b1c1c));
  head.scale.set(1, 1, 1.5);
  head.position.z = -0.026;
  match.add(head);
  const fl = flame({ h: 0.022, w: 0.012, kind: 'candle' });
  fl.mesh.position.z = -0.027;
  match.add(fl.mesh);
  match.position.set(0, 0.018, 0);
  group.add(match);
  return { group, match, flame: fl, head: V(0, 0, -0.027) };
}

export function candle() {
  const group = new THREE.Group();
  const dish = mesh(lathe([[0, 0], [0.026, 0], [0.028, 0.006], [0.026, 0.007], [0.024, 0.002], [0, 0.002]], 40), M.steel);
  group.add(dish);
  const wax = mesh(lathe([[0, 0.002], [0.0105, 0.002], [0.0105, 0.058], [0.0095, 0.061], [0.003, 0.0595], [0, 0.0595]], 40), new THREE.MeshPhysicalMaterial({ color: 0xf6f1e4, roughness: 0.55, sheen: 0.4, transmission: 0, thickness: 0.01 }));
  group.add(wax);
  const wick = mesh(new THREE.CylinderGeometry(0.0006, 0.0006, 0.008, 6), matte(0x1d1a17));
  wick.position.y = 0.063;
  wick.rotation.z = 0.15;
  group.add(wick);
  const fl = flame({ h: 0.042, w: 0.018, kind: 'candle', light: { color: 0xff9a3c, intensity: 0.22, dist: 1.2 } });
  fl.mesh.position.y = 0.064;
  group.add(fl.mesh);
  return { group, flame: fl, top: 0.064 };
}

// Ice cube mesh (shared geometry/material).
const iceMat = shared(new THREE.MeshPhysicalMaterial({ color: 0xeaf5ff, transparent: true, opacity: 0.72, roughness: 0.12, envMapIntensity: 1.8, clearcoat: 1, depthWrite: false }));
const iceGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.18);
iceGeo.userData.shared = true;
export function iceCube(s = 0.016) {
  const m = new THREE.Mesh(iceGeo, iceMat);
  m.scale.setScalar(s);
  m.renderOrder = 3;
  m.castShadow = false;
  return m;
}

// Low glass dish (crystallising dish).
export function dish({ r = 0.05, h = 0.03 } = {}) {
  const group = new THREE.Group();
  const t = 0.0018;
  group.add(glassMesh(lathe([[0, 0], [r - 0.003, 0], [r, 0.003], [r, h], [r + 0.0012, h + 0.001], [r - t, h], [r - t, t + 0.002], [r - t - 0.002, t], [0, t]], 56)));
  return { group, r, h, bottom: t };
}

// Rubber stopper. Origin at its bottom.
export function stopper({ r0 = 0.0072, r1 = 0.0094, h = 0.017, holes = 1 } = {}) {
  const g = mesh(new THREE.CylinderGeometry(r1, r0, h, 24), M.rubber);
  g.position.y = h / 2;
  const group = new THREE.Group();
  group.add(g);
  void holes;
  return { group, h };
}

// Glass tube along a path of points (local).
export function glassTube(points, r = 0.0028) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1);
  const m = glassMesh(new THREE.TubeGeometry(curve, 80, r, 12));
  return { mesh: m, curve };
}

export function hoseMesh(points, r = 0.0042, color = 0xd08a3c) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
  return mesh(new THREE.TubeGeometry(curve, 90, r, 10), new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, transparent: true, opacity: 0.88, clearcoat: 0.4 }));
}

export function cable(points, color) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
  return mesh(new THREE.TubeGeometry(curve, 80, 0.0022, 8), plastic(color, 0.5));
}

// Small digital display drawn on a canvas.
export function display(w = 0.05, h = 0.022, { color = '#ff5a3a', bg = '#120d0c' } = {}) {
  const tex = canvasTex(256, 112, () => {});
  const c = tex.userData.canvas, g = c.getContext('2d');
  const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), { cast: false });
  let last = null;
  return {
    mesh: m,
    set(text) {
      if (text === last) return;
      last = text;
      g.fillStyle = bg;
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = color;
      g.font = `600 72px "IBM Plex Mono", ui-monospace, monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, c.width / 2, c.height / 2 + 4);
      tex.needsUpdate = true;
    },
  };
}

// Panel with printed text (e.g. equipment front panels, warning plates).
export function plate(w, h, draw, px = 512) {
  const tex = canvasTex(px, Math.round(px * h / w), draw);
  return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), { cast: false });
}

export function warningSign(g, x, y, s, text) {
  g.save();
  g.translate(x, y);
  g.fillStyle = '#f7c600';
  g.strokeStyle = '#111';
  g.lineWidth = s * 0.07;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(0, -s * 0.5);
  g.lineTo(s * 0.55, s * 0.45);
  g.lineTo(-s * 0.55, s * 0.45);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#111';
  g.beginPath();
  g.moveTo(s * 0.06, -s * 0.24);
  g.lineTo(-s * 0.12, s * 0.08);
  g.lineTo(0, s * 0.08);
  g.lineTo(-s * 0.06, s * 0.34);
  g.lineTo(s * 0.13, -s * 0.02);
  g.lineTo(s * 0.01, -s * 0.02);
  g.closePath();
  g.fill();
  if (text) {
    g.fillStyle = '#c1121f';
    g.font = `700 ${s * 0.2}px ${FONT}`;
    g.textAlign = 'center';
    g.direction = lang === 'ar' ? 'rtl' : 'ltr';
    g.fillText(text, 0, s * 0.72);
  }
  g.restore();
}

export { mesh, glassMesh, RoundedBoxGeometry, drawFormula, rrect };
