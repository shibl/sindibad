import { tr, lang } from './lab-locale.js';
// The school chemistry lab: room, bench, sink, fume hood, shelves, posters, lights.
import { THREE, E, V, BENCH } from './engine.js';
import { canvasTex, matte, plastic, metal, glass, FONT, hazardDiamond, rrect } from './materials.js';
import { mesh, M, bottle, RoundedBoxGeometry, display } from './kit.js';

export const ROOM = {
  benchX: [-1.75, 1.75], benchZ: [-0.6, 0.3],
  sink: { x: -1.38, z: -0.16, w: 0.42, d: 0.36 },
  tapMouth: V(), drain: V(),
  hood: { x: -2.42, z: -0.24, w: 1.08, top: 0.92 },
  parts: {},
};

function floorTex() {
  return canvasTex(1024, 1024, (g, w) => {
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const l = 205 + Math.floor(Math.random() * 12);
      g.fillStyle = `rgb(${l},${l + 2},${l + 4})`;
      g.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 500; k++) {
        const d = Math.random() * 40 - 20;
        g.fillStyle = `rgba(${l + d},${l + d},${l + d + 3},0.5)`;
        g.fillRect(i * s + Math.random() * s, j * s + Math.random() * s, 2, 2);
      }
    }
    g.strokeStyle = 'rgba(120,124,130,0.55)';
    g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, w); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  }, { repeat: [3.4, 3.4] });
}

function tileTex(cols = 8, rows = 4) {
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#b9bec4';
    g.fillRect(0, 0, w, h);
    const tw = w / cols, th = h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const l = 238 + Math.floor(Math.random() * 8);
      g.fillStyle = `rgb(${l},${l + 1},${l + 2})`;
      g.fillRect(i * tw + 3, j * th + 3, tw - 6, th - 6);
    }
  }, { repeat: [12, 1] });
}

// Periodic table poster.
const SYM = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
function cell(z) {
  if (z === 1) return [0, 0];
  if (z === 2) return [0, 17];
  const rows = [[3, 10, 1], [11, 18, 2], [19, 36, 3], [37, 54, 4], [55, 86, 5], [87, 118, 6]];
  for (const [a, b, p] of rows) {
    if (z < a || z > b) continue;
    const i = z - a;
    if (p <= 2) return [p, i < 2 ? i : i + 10];
    if (p <= 4) return [p, i];
    if (i < 2) return [p, i];
    if (i < 17) return [p + 3, i + 1];
    return [p, i - 14];
  }
}
function cat(z) {
  if ([3, 11, 19, 37, 55, 87].includes(z)) return 0;
  if ([4, 12, 20, 38, 56, 88].includes(z)) return 1;
  if (z >= 57 && z <= 71) return 8;
  if (z >= 89 && z <= 103) return 9;
  if ([2, 10, 18, 36, 54, 86, 118].includes(z)) return 7;
  if ([9, 17, 35, 53, 85, 117].includes(z)) return 6;
  if ([5, 14, 32, 33, 51, 52].includes(z)) return 4;
  if ([1, 6, 7, 8, 15, 16, 34].includes(z)) return 5;
  if ([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116].includes(z)) return 3;
  return 2;
}
const CAT = ['#e8a0a0', '#f0c49a', '#a9c6e8', '#b9d3c2', '#d6d39a', '#a8dcc8', '#f3e19a', '#c8b8ea', '#e8b8d8', '#d8b0c0'];
const CAT_AR = [tr('فلزات قلوية'), tr('فلزات قلوية ترابية'), tr('عناصر انتقالية'), tr('فلزات أخرى'), tr('أشباه فلزات'), tr('لافلزات'), tr('هالوجينات'), tr('غازات نبيلة'), tr('لانثانيدات'), tr('أكتينيدات')];

function periodicTex() {
  return canvasTex(2048, 1180, (g, W, H) => {
    g.fillStyle = '#fbfaf6';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#16324f';
    g.fillRect(0, 0, W, 110);
    g.fillStyle = '#fff';
    g.font = `700 64px ${FONT}`;
    g.textAlign = 'center';
    g.direction = lang === 'ar' ? 'rtl' : 'ltr';
    g.fillText(tr('الجدول الدوري للعناصر'), W / 2, 78);
    const cs = 104, gap = 5, x0 = (W - 18 * (cs + gap)) / 2, y0 = 140;
    g.direction = 'ltr';
    for (let z = 1; z <= 118; z++) {
      const [r, c] = cell(z);
      const x = x0 + c * (cs + gap), y = y0 + r * (cs + gap) + (r >= 7 ? 26 : 0);
      g.fillStyle = CAT[cat(z)];
      rrect(g, x, y, cs, cs, 8);
      g.fill();
      g.fillStyle = '#1c2530';
      g.font = `500 22px ${FONT}`;
      g.textAlign = 'left';
      g.fillText(String(z), x + 8, y + 26);
      g.font = `700 46px ${FONT}`;
      g.textAlign = 'center';
      g.fillText(SYM[z - 1], x + cs / 2, y + 78);
    }
    // legend
    g.direction = lang === 'ar' ? 'rtl' : 'ltr';
    g.font = `500 26px ${FONT}`;
    CAT_AR.slice(0, 5).forEach((t, i) => { g.fillStyle = CAT[i]; g.fillRect(x0 + 3 * (cs + gap) + i * 220, y0 + 8, 30, 30); g.fillStyle = '#1c2530'; g.textAlign = 'right'; g.fillText(t, x0 + 3 * (cs + gap) + i * 220 + 210, y0 + 34); });
    CAT_AR.slice(5).forEach((t, i) => { g.fillStyle = CAT[i + 5]; g.fillRect(x0 + 3 * (cs + gap) + i * 220, y0 + 52, 30, 30); g.fillStyle = '#1c2530'; g.textAlign = 'right'; g.fillText(t, x0 + 3 * (cs + gap) + i * 220 + 210, y0 + 78); });
  });
}

function safetyTex() {
  return canvasTex(900, 1200, (g, W, H) => {
    g.fillStyle = '#fdfcf8';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#0f5132';
    g.fillRect(0, 0, W, 130);
    g.fillStyle = '#fff';
    g.font = `700 60px ${FONT}`;
    g.textAlign = 'center';
    g.direction = lang === 'ar' ? 'rtl' : 'ltr';
    g.fillText(tr('قواعد السلامة في المختبر'), W / 2, 88);
    const rules = [
      ['goggles', tr('ارتدِ النظارة الواقية والقفازات')],
      ['flame', tr('أبعد المواد القابلة للاشتعال عن اللهب')],
      ['toxic', tr('نفّذ التفاعلات التي تطلق غازات ضارّة في خزانة الغازات')],
      ['corrosive', tr('تعامل مع الحموض المركّزة بحذر')],
      ['volt', tr('لا تقترب من مصادر التوتّر العالي')],
    ];
    rules.forEach(([k, t], i) => {
      const y = 200 + i * 200;
      if (k === 'goggles') {
        g.fillStyle = '#1d5fbf';
        g.beginPath(); g.arc(W - 120, y + 50, 62, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff';
        rrect(g, W - 168, y + 32, 96, 40, 18); g.fill();
        g.fillStyle = '#1d5fbf';
        g.beginPath(); g.arc(W - 142, y + 52, 13, 0, Math.PI * 2); g.arc(W - 98, y + 52, 13, 0, Math.PI * 2); g.fill();
      } else if (k === 'volt') {
        g.save();
        g.translate(W - 120, y + 50);
        g.fillStyle = '#f7c600'; g.strokeStyle = '#111'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(0, -62); g.lineTo(66, 54); g.lineTo(-66, 54); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#111';
        g.beginPath(); g.moveTo(8, -30); g.lineTo(-16, 10); g.lineTo(0, 10); g.lineTo(-8, 42); g.lineTo(18, -2); g.lineTo(2, -2); g.closePath(); g.fill();
        g.restore();
      } else hazardDiamond(g, W - 120, y + 50, 92, k);
      g.fillStyle = '#1c2530';
      g.font = `600 38px ${FONT}`;
      g.textAlign = 'right';
      wrap(g, t, W - 220, y + 40, W - 270, 50);
    });
  });
}

function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  g.fillText(line, x, y);
}

function windowTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#cfe6fb');
    gr.addColorStop(0.65, '#eef6fd');
    gr.addColorStop(1, '#f4f1e6');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(160,190,170,0.55)';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(i * 64 + Math.random() * 30, h * 0.86, 40 + Math.random() * 40, 0, Math.PI * 2); g.fill(); }
  });
}

let clockTex, clockDraw;
function makeClock() {
  clockTex = canvasTex(256, 256, () => {});
  const c = clockTex.userData.canvas, g = c.getContext('2d');
  clockDraw = () => {
    const d = new Date(), w = 256;
    g.clearRect(0, 0, w, w);
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(w / 2, w / 2, 120, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#222';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 108 : 96;
      g.lineWidth = i % 5 ? 2 : 6;
      g.beginPath(); g.moveTo(w / 2 + Math.sin(a) * r0, w / 2 - Math.cos(a) * r0); g.lineTo(w / 2 + Math.sin(a) * 114, w / 2 - Math.cos(a) * 114); g.stroke();
    }
    const hand = (a, len, lw, col = '#111') => { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w / 2 + Math.sin(a) * len, w / 2 - Math.cos(a) * len); g.stroke(); };
    const m = d.getMinutes() + d.getSeconds() / 60, hh = (d.getHours() % 12) + m / 60;
    hand(hh / 12 * Math.PI * 2, 58, 9);
    hand(m / 60 * Math.PI * 2, 88, 6);
    hand(d.getSeconds() / 60 * Math.PI * 2, 96, 2, '#c1121f');
    clockTex.needsUpdate = true;
  };
  clockDraw();
  setInterval(clockDraw, 1000);
  return clockTex;
}

export function buildRoom() {
  const S = E.scene;
  const room = new THREE.Group();
  S.add(room);
  const add = (o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); room.add(o); return o; };

  // lights
  const hemi = new THREE.HemisphereLight(0xeef2f7, 0x6f685d, 0.5);
  S.add(hemi);
  const key = new THREE.DirectionalLight(0xfff4e6, 1.7);
  key.position.set(1.4, 3.4, 2.4);
  key.target.position.set(-0.2, BENCH, -0.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 1.6, bottom: -1.6, near: 0.5, far: 7 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.012;
  S.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xdcebff, 0.35);
  fill.position.set(3, 2, 0.5);
  S.add(fill);
  ROOM.lights = { hemi, key, fill };

  // floor, walls, ceiling
  const floor = mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.55 }), { cast: false, receive: true });
  floor.rotation.x = -Math.PI / 2;
  add(floor, -0.4, 0, 1.2);
  const wallMat = matte(0xcfd5da, 0.92);
  const back = mesh(new THREE.PlaneGeometry(6.4, 2.95), wallMat, { cast: false, receive: true });
  add(back, -0.4, 1.475, -0.64);
  const left = mesh(new THREE.PlaneGeometry(5, 2.95), wallMat, { cast: false, receive: true });
  left.rotation.y = Math.PI / 2;
  add(left, -3.05, 1.475, 1.8);
  const right = mesh(new THREE.PlaneGeometry(5, 2.95), wallMat, { cast: false, receive: true });
  right.rotation.y = -Math.PI / 2;
  add(right, 2.3, 1.475, 1.8);
  const ceil = mesh(new THREE.PlaneGeometry(6.4, 5), matte(0xf3f4f5, 1), { cast: false });
  ceil.rotation.x = Math.PI / 2;
  add(ceil, -0.4, 2.95, 1.8);
  for (const [x, z] of [[-1.4, 0.3], [0.2, 0.3], [-1.4, 1.6], [0.2, 1.6]]) {
    const p = mesh(new THREE.PlaneGeometry(1.1, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }), { cast: false });
    p.rotation.x = Math.PI / 2;
    add(p, x, 2.94, z);
  }
  // splashback tiles behind the bench
  const tiles = mesh(new THREE.PlaneGeometry(3.5, 0.62), new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.25 }), { cast: false, receive: true });
  tiles.material.map.repeat.set(10, 1);
  add(tiles, 0, BENCH + 0.31, -0.635);
  const skirting = mesh(new THREE.BoxGeometry(6.4, 0.1, 0.012), matte(0x7b828a, 0.6), { cast: false });
  add(skirting, -0.4, 0.05, -0.632);

  // window on the right wall
  const win = mesh(new THREE.PlaneGeometry(2.0, 1.25), new THREE.MeshBasicMaterial({ map: windowTex(), toneMapped: false }), { cast: false });
  win.rotation.y = -Math.PI / 2;
  add(win, 2.295, 1.72, 0.7);
  const frameMat = matte(0xdfe2e5, 0.5);
  for (const [w, h, y, z] of [[2.08, 0.05, 2.36, 0.7], [2.08, 0.05, 1.08, 0.7], [0.05, 1.3, 1.72, -0.32], [0.05, 1.3, 1.72, 1.72], [0.035, 1.25, 1.72, 0.7], [2.0, 0.03, 1.72, 0.7]]) {
    const f = mesh(new THREE.BoxGeometry(0.04, h, w), frameMat, { cast: false });
    add(f, 2.28, y, z);
  }
  const sill = mesh(new THREE.BoxGeometry(0.16, 0.03, 2.1), matte(0xcfd3d7, 0.5));
  add(sill, 2.23, 1.05, 0.7);

  buildBench(room);
  buildSink(room);
  buildShelf(room);
  buildHood(room);
  buildPPE(room);

  // posters and clock
  const pt = mesh(new THREE.PlaneGeometry(1.48, 0.853), new THREE.MeshStandardMaterial({ map: periodicTex(), roughness: 0.55 }), { cast: false, receive: true });
  add(pt, -0.3, 1.98, -0.632);
  const sp = mesh(new THREE.PlaneGeometry(0.5, 0.667), new THREE.MeshStandardMaterial({ map: safetyTex(), roughness: 0.55 }), { cast: false, receive: true });
  add(sp, 1.18, 2.02, -0.632);
  const ck = mesh(new THREE.CircleGeometry(0.15, 48), new THREE.MeshStandardMaterial({ map: makeClock(), transparent: true, roughness: 0.4 }), { cast: false });
  add(ck, -1.42, 2.28, -0.628);
  const rim = mesh(new THREE.TorusGeometry(0.152, 0.008, 10, 48), matte(0x2b2f35, 0.4));
  add(rim, -1.42, 2.28, -0.626);
  ROOM.room = room;
  return room;
}

function buildBench(room) {
  const [x0, x1] = ROOM.benchX, [z0, z1] = ROOM.benchZ;
  const top = new THREE.MeshPhysicalMaterial({ color: 0x1b1d21, roughness: 0.34, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  top.userData.shared = true;
  const s = ROOM.sink;
  const th = 0.03, y = BENCH - th / 2;
  // top in pieces around the sink cut-out
  const piece = (ax, bx, az, bz) => {
    const m = mesh(new THREE.BoxGeometry(bx - ax, th, bz - az), top, { receive: true });
    m.position.set((ax + bx) / 2, y, (az + bz) / 2);
    room.add(m);
  };
  piece(x0, s.x - s.w / 2, z0, z1);
  piece(s.x + s.w / 2, x1, z0, z1);
  piece(s.x - s.w / 2, s.x + s.w / 2, z0, s.z - s.d / 2);
  piece(s.x - s.w / 2, s.x + s.w / 2, s.z + s.d / 2, z1);
  ROOM.benchTop = top;
  // cabinets
  const body = matte(0xb9c0c8, 0.6);
  const carcass = mesh(new THREE.BoxGeometry(x1 - x0 - 0.04, BENCH - th - 0.1, z1 - z0 - 0.06), body, { receive: true });
  carcass.position.set((x0 + x1) / 2, 0.1 + (BENCH - th - 0.1) / 2, (z0 + z1) / 2 - 0.03);
  room.add(carcass);
  const kick = mesh(new THREE.BoxGeometry(x1 - x0 - 0.06, 0.1, 0.02), matte(0x3a3f46, 0.7), { receive: true });
  kick.position.set((x0 + x1) / 2, 0.05, z1 - 0.1);
  room.add(kick);
  const door = plastic(0xc7ced6, 0.5);
  door.userData.shared = true;
  const n = 7, dw = (x1 - x0 - 0.04) / n;
  for (let i = 0; i < n; i++) {
    const cx = x0 + 0.02 + dw * (i + 0.5);
    const d = mesh(new RoundedBoxGeometry(dw - 0.008, BENCH - th - 0.13, 0.018, 2, 0.004), door, { receive: true });
    d.position.set(cx, 0.1 + (BENCH - th - 0.1) / 2, z1 - 0.03);
    room.add(d);
    const h = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 10), M.chrome);
    h.rotation.z = Math.PI / 2;
    h.position.set(cx, BENCH - th - 0.09, z1 - 0.012);
    room.add(h);
  }
  // gas taps along the back
  for (const x of [-0.95, -0.15, 0.55]) {
    const t = mesh(new RoundedBoxGeometry(0.03, 0.03, 0.02, 2, 0.004), M.chrome);
    t.position.set(x, BENCH + 0.015, z0 + 0.03);
    room.add(t);
  }
}

function buildSink(room) {
  const s = ROOM.sink;
  const steel = metal(0xb8bec5, 0.35);
  const depth = 0.2, yTop = BENCH;
  const basin = new THREE.Group();
  const wall = (w, h, d, x, y, z) => { const m = mesh(new THREE.BoxGeometry(w, h, d), steel, { receive: true }); m.position.set(x, y, z); basin.add(m); };
  wall(s.w, 0.008, s.d, 0, yTop - depth, 0);
  wall(0.008, depth, s.d, -s.w / 2, yTop - depth / 2, 0);
  wall(0.008, depth, s.d, s.w / 2, yTop - depth / 2, 0);
  wall(s.w, depth, 0.008, 0, yTop - depth / 2, -s.d / 2);
  wall(s.w, depth, 0.008, 0, yTop - depth / 2, s.d / 2);
  const drain = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.004, 24), M.dark);
  drain.position.set(0, yTop - depth + 0.006, 0.04);
  basin.add(drain);
  basin.position.set(s.x, 0, s.z);
  room.add(basin);
  ROOM.drain.set(s.x, yTop - depth + 0.01, s.z + 0.04);
  // gooseneck tap at the back edge
  const tap = new THREE.Group();
  const post = mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.22, 20), M.chrome);
  post.position.y = 0.11;
  tap.add(post);
  const arc = new THREE.CatmullRomCurve3([V(0, 0.22, 0), V(0, 0.29, 0.02), V(0, 0.3, 0.09), V(0, 0.25, 0.15), V(0, 0.2, 0.16)]);
  tap.add(mesh(new THREE.TubeGeometry(arc, 40, 0.009, 14), M.chrome));
  const nozzle = mesh(new THREE.CylinderGeometry(0.008, 0.007, 0.03, 14), M.chrome);
  nozzle.position.set(0, 0.19, 0.16);
  tap.add(nozzle);
  const knob = new THREE.Group();
  const kb = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 16), M.chrome);
  knob.add(kb);
  const lever = mesh(new RoundedBoxGeometry(0.07, 0.01, 0.014, 1, 0.004), plastic(0x2563eb, 0.4));
  lever.position.set(0.035, 0.012, 0);
  knob.add(lever);
  knob.position.set(0.05, 0.03, 0.0);
  tap.add(knob);
  tap.position.set(s.x, BENCH, s.z - s.d / 2 - 0.05);
  room.add(tap);
  ROOM.parts.tap = tap;
  ROOM.parts.tapLever = knob;
  ROOM.tapMouth.set(s.x, BENCH + 0.175, s.z - s.d / 2 - 0.05 + 0.16);
}

function buildShelf(room) {
  const g = new THREE.Group();
  const x0 = 0.62, x1 = 1.68, z = -0.52, d = 0.16;
  const wood = matte(0xe5e1da, 0.6);
  for (const x of [x0, x1]) {
    const up = mesh(new THREE.BoxGeometry(0.02, 0.62, d), wood);
    up.position.set(x, BENCH + 0.31, z);
    g.add(up);
  }
  const levels = [BENCH + 0.02, BENCH + 0.31, BENCH + 0.61];
  for (const y of levels) {
    const sh = mesh(new THREE.BoxGeometry(x1 - x0 + 0.02, 0.016, d), wood, { receive: true });
    sh.position.set((x0 + x1) / 2, y, z);
    g.add(sh);
  }
  const stock = [
    [tr('كبريتات النحاس II'), 'CuSO4', null, '#1d4ed8', { color: 0x2b6cd9, opacity: 0.75 }],
    [tr('ماء مقطّر'), 'H2O', null, '#0e7490', { color: 0xd8ecf5, opacity: 0.3 }],
    [tr('هيدروكسيد الصوديوم'), 'NaOH', 'corrosive', '#7c2d12', { color: 0xf1f1ee, opacity: 0.35 }],
    [tr('حمض الكبريت الممدّد'), 'H2SO4', 'corrosive', '#991b1b', { color: 0xe9f1f4, opacity: 0.3 }],
    [tr('نترات الفضة'), 'AgNO3', 'oxidizer', '#4b5563', null, true],
    [tr('كلوريد الصوديوم'), 'NaCl', null, '#166534', { color: 0xf8f8f8, solid: true }],
    [tr('كبريتات الحديد II'), 'FeSO4', null, '#3f6212', { color: 0xb7d7a8, solid: true }],
    [tr('الإيثانول'), 'C2H5OH', 'flame', '#b45309', { color: 0xeaf2f5, opacity: 0.3 }],
    [tr('زهر الكبريت'), 'S', 'flame', '#a16207', { color: 0xe6c935, solid: true }],
    [tr('شرائط المغنزيوم'), 'Mg', 'flame', '#525252', null],
    [tr('يود'), 'I2', 'toxic', '#5b21b6', { color: 0x3b1f4a, solid: true }, true],
    [tr('نترات الرصاص'), 'Pb(NO3)2', 'toxic', '#374151', { color: 0xf6f6f4, solid: true }],
  ];
  stock.forEach(([name, f, hz, col, content, amber], i) => {
    const row = i < 6 ? 0 : 1;
    const k = row ? i - 6 : i;
    const wide = content?.solid;
    const b = bottle({ name, formula: f, hazard: hz, color: col, kind: wide ? 'wide' : 'narrow', amber: !!amber, content, contentLevel: 0.45 + (i % 3) * 0.12 });
    b.group.position.set(x0 + 0.1 + k * 0.17, levels[row] + 0.008, z + 0.01);
    b.group.rotation.y = (Math.random() - 0.5) * 0.25;
    b.group.scale.setScalar(0.92);
    g.add(b.group);
  });
  room.add(g);
}

function buildHood(room) {
  const h = ROOM.hood;
  const g = new THREE.Group();
  const white = plastic(0xeef0f2, 0.5);
  const inner = matte(0xd5d9de, 0.7);
  const w = h.w, d = 0.78, z0 = -0.62, zf = z0 + d, y0 = BENCH, top = 2.3;
  const box = (W, H, D, x, y, z, m) => { const o = mesh(new THREE.BoxGeometry(W, H, D), m, { receive: true }); o.position.set(x, y, z); g.add(o); return o; };
  // base cabinet + work surface
  box(w, BENCH - 0.1, d - 0.04, 0, 0.1 + (BENCH - 0.1) / 2, z0 + d / 2 - 0.02, matte(0xd9dde2, 0.6));
  box(w + 0.02, 0.03, d, 0, BENCH - 0.015, z0 + d / 2, ROOM.benchTop);
  // shell
  box(0.05, top - y0, d, -w / 2 + 0.025, y0 + (top - y0) / 2, z0 + d / 2, white);
  box(0.05, top - y0, d, w / 2 - 0.025, y0 + (top - y0) / 2, z0 + d / 2, white);
  box(w, 0.05, d, 0, top, z0 + d / 2, white);
  box(w - 0.1, top - y0, 0.02, 0, y0 + (top - y0) / 2, z0 + 0.01, inner);
  box(w, 0.3, 0.04, 0, top - 0.15, zf - 0.02, white);
  // label on the fascia
  const tex = canvasTex(1024, 256, (c, W, H) => {
    c.fillStyle = '#eef0f2';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#16324f';
    c.font = `700 92px ${FONT}`;
    c.textAlign = 'center';
    c.direction = lang === 'ar' ? 'rtl' : 'ltr';
    c.fillText(tr('خزانة الغازات'), W / 2, H / 2 + 32);
  });
  const lab = mesh(new THREE.PlaneGeometry(w * 0.8, 0.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), { cast: false });
  lab.position.set(0, top - 0.15, zf + 0.0015);
  g.add(lab);
  // interior light strip
  const strip = mesh(new THREE.PlaneGeometry(w - 0.2, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff }), { cast: false });
  strip.rotation.x = Math.PI / 2;
  strip.position.set(0, top - 0.32, z0 + d / 2);
  g.add(strip);
  const lamp = new THREE.PointLight(0xffffff, 0.6, 2.2, 2);
  lamp.position.set(0, top - 0.42, z0 + d / 2);
  g.add(lamp);
  // exhaust slot
  const slot = mesh(new THREE.BoxGeometry(w - 0.16, 0.04, 0.01), matte(0x1d2024, 0.8), { cast: false });
  slot.position.set(0, top - 0.42, z0 + 0.03);
  g.add(slot);
  // sliding glass sash in a frame
  const sash = new THREE.Group();
  const pane = mesh(new THREE.PlaneGeometry(w - 0.1, 0.7), glass({ base: 0.07, edge: 0.4 }), { cast: false, order: 6 });
  sash.add(pane);
  const fm = M.steel;
  for (const [W, H, x, y] of [[w - 0.08, 0.035, 0, -0.35], [w - 0.08, 0.02, 0, 0.35], [0.02, 0.72, -(w - 0.1) / 2, 0], [0.02, 0.72, (w - 0.1) / 2, 0]]) {
    const f = mesh(new THREE.BoxGeometry(W, H, 0.02), fm);
    f.position.set(x, y, 0);
    sash.add(f);
  }
  const handle = mesh(new THREE.CylinderGeometry(0.008, 0.008, w * 0.6, 12), M.chrome);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, -0.33, 0.03);
  sash.add(handle);
  sash.position.set(0, 1.62, zf - 0.05);
  g.add(sash);
  // fan switch panel on the right post
  const panel = new THREE.Group();
  const pb = mesh(new RoundedBoxGeometry(0.09, 0.14, 0.02, 2, 0.004), plastic(0x2b3036, 0.4));
  panel.add(pb);
  const sw = mesh(new RoundedBoxGeometry(0.03, 0.05, 0.014, 2, 0.004), plastic(0xe9ecef, 0.4));
  sw.position.set(0, 0.015, 0.012);
  panel.add(sw);
  const led = mesh(new THREE.SphereGeometry(0.0055, 12, 8), new THREE.MeshBasicMaterial({ color: 0x3a3f45 }), { cast: false });
  led.position.set(0, -0.04, 0.012);
  panel.add(led);
  const disp = display(0.06, 0.02, { color: '#7CFFB2', bg: '#0b1410' });
  disp.mesh.position.set(0, 0.055, 0.0105);
  disp.set('0.0 m/s');
  panel.add(disp.mesh);
  panel.position.set(w / 2 - 0.025, 1.3, zf + 0.012);
  g.add(panel);
  g.position.set(h.x, 0, 0);
  room.add(g);
  ROOM.parts.hood = g;
  ROOM.parts.sash = sash;
  ROOM.parts.fan = { panel, sw, led, disp, on: false };
  ROOM.hood.surface = BENCH;
  ROOM.hood.center = V(h.x, BENCH, z0 + d / 2 - 0.05);
}

function buildPPE(room) {
  // safety goggles
  const gog = new THREE.Group();
  const band = mesh(new THREE.TorusGeometry(0.06, 0.004, 8, 40, Math.PI * 1.15), rubber2());
  band.rotation.set(Math.PI / 2, 0, -Math.PI * 0.075 + Math.PI);
  band.position.y = 0.022;
  gog.add(band);
  const lens = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.045, 40, 1, true, -0.75, 1.5), glass({ base: 0.12, edge: 0.6, tint: 0x0d1a22 }), { cast: false, order: 6 });
  lens.position.set(0, 0.024, -0.035);
  gog.add(lens);
  const rim = mesh(new THREE.TorusGeometry(0.075, 0.003, 6, 40, 1.5), rubber2());
  rim.rotation.set(Math.PI / 2, 0, Math.PI / 2 - 0.75);
  rim.position.set(0, 0.002, -0.035);
  gog.add(rim);
  const rim2 = rim.clone();
  rim2.position.y = 0.046;
  gog.add(rim2);
  gog.position.set(0.95, BENCH, 0.14);
  gog.rotation.y = 0.35;
  room.add(gog);
  // glove box
  const tex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#f3f6f8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2563eb';
    g.fillRect(0, 0, w, 54);
    g.fillStyle = '#fff';
    g.font = `700 40px ${FONT}`;
    g.textAlign = 'center';
    g.direction = lang === 'ar' ? 'rtl' : 'ltr';
    g.fillText(tr('قفازات واقية'), w / 2, 40);
    g.fillStyle = '#1c2530';
    g.font = `600 56px ${FONT}`;
    g.direction = 'ltr';
    g.fillText('NITRILE  M', w / 2, 150);
    g.fillStyle = '#2563eb';
    rrect(g, w * 0.3, 175, w * 0.4, 50, 25);
    g.fill();
  });
  const boxM = [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), plastic(0xf3f6f8), plastic(0x2563eb), plastic(0xf3f6f8), plastic(0xf3f6f8), plastic(0xf3f6f8)];
  const gb = mesh(new RoundedBoxGeometry(0.13, 0.065, 0.24, 2, 0.004), boxM);
  gb.rotation.y = -Math.PI / 2 + 0.2;
  const gloves = new THREE.Group();
  gb.position.y = 0.0325;
  gloves.add(gb);
  const tuft = mesh(new THREE.SphereGeometry(0.022, 12, 8), plastic(0x3b82f6, 0.6));
  tuft.scale.set(1.4, 0.5, 1);
  tuft.position.y = 0.068;
  gloves.add(tuft);
  gloves.position.set(1.28, BENCH, 0.06);
  room.add(gloves);
  ROOM.parts.goggles = gog;
  ROOM.parts.gloves = gloves;
}
const rubber2 = () => new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
