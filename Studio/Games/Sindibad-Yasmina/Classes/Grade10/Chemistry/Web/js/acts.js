// Shared hand actions: scooping powder, pouring, lighting a burner, striking a match.
// Station groups sit at the world origin, so object positions are world positions.
import { THREE, V, E, moveTo, anim, wait, ease } from './engine.js';
import { snd } from './sound.js';
import { softTex } from './materials.js';

export const wp = (obj, local = V()) => obj.localToWorld(local.clone());
const Q = (x = 0, y = 0, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));

// Pose obj (rotation q) so that its local point `lp` lands on world point `target`.
// Returned in the parent's space (parents are only ever translated, never rotated).
function poseFor(obj, lp, target, q) {
  const w = target.clone().sub(lp.clone().applyQuaternion(q));
  return obj.parent ? obj.parent.worldToLocal(w) : w;
}
export async function bring(obj, lp, target, q, dur = 0.8, lift = 0.05) {
  await moveTo(obj, poseFor(obj, lp, target, q), dur, { rot: q, lift });
}

// Spatula: dip into `from` (world mouth point), carry a heap, tip it into `to`. onDrop fires as grains land.
export async function scoop({ spatula, heap, grains, from, to, floorY, onDrop, count = 28 }) {
  const g = spatula.group;
  const home = { p: g.position.clone(), q: g.quaternion.clone() };
  const tip = spatula.tip.position;
  const yaw = Math.atan2(to.x - from.x, to.z - from.z);
  const down = Q(-1.15, yaw + Math.PI, 0);
  await bring(g, tip, from.clone().add(V(0, 0.03, 0)), down, 0.75, 0.08);
  await bring(g, tip, from.clone().add(V(0, -0.025, 0)), down, 0.35, 0);
  snd.powder();
  heap.visible = true;
  const carry = Q(-0.12, yaw + Math.PI, 0);
  await bring(g, tip, from.clone().add(V(0, 0.06, 0)), carry, 0.4, 0);
  await bring(g, tip, to.clone().add(V(0, 0.03, 0)), carry, 0.8, 0.03);
  const dump = Q(-0.9, yaw + Math.PI, 0.5);
  await bring(g, tip, to.clone().add(V(0, 0.012, 0)), dump, 0.35, 0);
  heap.visible = false;
  snd.powder();
  grains.pour(wp(spatula.tip), floorY, count);
  setTimeout(() => onDrop?.(), 350);
  await wait(0.5);
  await moveTo(g, home.p, 0.8, { rot: home.q, lift: 0.06 });
}

// Pour from a bottle into a vessel. level(k) is called with 0→1 while the stream runs.
export async function pour({ bottle, to, stream, level, tilt = 1.75, side = 1, dur = 1.3 }) {
  const g = bottle.group;
  const home = { p: g.position.clone(), q: g.quaternion.clone() };
  const cap = bottle.cap, capHome = cap.position.clone();
  await moveTo(cap, capHome.clone().add(V(0, 0.03, 0)), 0.25);
  cap.visible = false;
  const mouth = V(0, bottle.mouthY, 0);
  const upright = new THREE.Quaternion();
  const above = to.clone().add(V(side * 0.05, 0.06, 0));
  await bring(g, mouth, above, upright, 0.7, 0.08);
  const tq = Q(0, 0, side * tilt);
  await bring(g, mouth, to.clone().add(V(side * 0.008, 0.012, 0)), tq, 0.55, 0);
  snd.pour();
  const end = to.clone().add(V(0, -0.04, 0));
  await anim(dur, k => {
    const m = wp(g, mouth);
    stream.set(m, end);
    level(k);
  }, ease.linear);
  stream.set(null);
  await bring(g, mouth, above, upright, 0.5, 0);
  await moveTo(g, home.p, 0.7, { rot: home.q, lift: 0.05 });
  cap.visible = true;
  await moveTo(cap, capHome, 0.25);
}

export async function lightBurner(b) {
  snd.ignite();
  b.flame.set(true);
  await anim(0.45, k => b.flame.setLevel(0.2 + 0.8 * k));
  b.lit = true;
  snd.hiss(true);
}
export async function offBurner(b) {
  await anim(0.3, k => b.flame.setLevel(1 - k));
  b.flame.set(false);
  b.lit = false;
  snd.hiss(false);
}

// Strike a match from its box and hold its head at a world point. Returns a function that puts it back.
export async function matchTo(mb, target, { hold = 0.8 } = {}) {
  const m = mb.match;
  const home = { p: m.position.clone(), q: m.quaternion.clone() };
  const parent = m.parent;
  const lift = parent.localToWorld(home.p.clone()).add(V(0, 0.06, 0.02));
  const q = Q(0.5, Math.PI, 0);
  // matches live in the box's space; convert targets into it
  const toLocal = w => parent.worldToLocal(w.clone());
  await moveTo(m, toLocal(lift), 0.4, { rot: q });
  snd.strike();
  mb.flame.set(true);
  mb.flame.setLevel(1);
  await wait(0.35);
  const head = mb.head.clone().applyQuaternion(q);
  await moveTo(m, toLocal(target).sub(head), 0.7, { rot: q, lift: 0.03 });
  await wait(hold);
  return async () => {
    await anim(0.2, k => mb.flame.setLevel(1 - k));
    mb.flame.set(false);
    await moveTo(m, home.p, 0.6, { rot: home.q, lift: 0.04 });
  };
}

// Flat heap of powder carried on the spatula blade.
export function heapOn(spatula, color) {
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
  h.scale.set(1.1, 0.45, 1.6);
  h.position.copy(spatula.tip.position).add(V(0, 0.001, 0.008));
  h.visible = false;
  spatula.group.add(h);
  return h;
}

export function flash(sc, at, color = 0xffd27a) {
  const m = new THREE.SpriteMaterial({ map: softTex(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const s = new THREE.Sprite(m);
  s.position.copy(at);
  s.renderOrder = 9;
  sc.add(s);
  return anim(0.45, (k, raw) => {
    s.scale.setScalar(0.02 + raw * 0.09);
    m.opacity = raw < 0.15 ? raw / 0.15 : 1 - (raw - 0.15) / 0.85;
  }, ease.linear).then(() => { sc.group.remove(s); m.dispose(); });
}

export { E };
