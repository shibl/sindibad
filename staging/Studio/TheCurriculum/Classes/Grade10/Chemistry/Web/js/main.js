import { tr, lang } from './lab-locale.js';
// Boot, experiment runner and the `lab` API that experiments script against.
import { THREE, E, V, init, fly, setInset, setHint, pickName, scope, onFrame, screenOf, moveTo } from './engine.js';
import { buildRoom, ROOM } from './room.js';
import * as UI from './ui.js';
import { snd } from './sound.js';
import { plasma, ice, distill } from './exp-a.js';
import { copper, iron, iodine, redox } from './exp-b.js';

const EXPS = [plasma, ice, distill, copper, iron, iodine, redox];
const KEY = 'chem-lab-v1';
const ABORT = Symbol('abort');
const MENU_VIEW = { pos: [1.25, 1.85, 2.3], target: [-0.65, 1.1, -0.4] };
const PPE_VIEW = { pos: [1.12, 1.3, 0.62], target: [1.1, 0.96, 0.06] };

let results = {};
try { results = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
const saveResults = () => { try { localStorage.setItem(KEY, JSON.stringify(results)); } catch {} };

const ppe = { goggles: false, gloves: false };
let cur = null;        // running experiment context
let pending = null;    // { keys:Set, resolve, opts, misses }
let menuDrift = null;

const v3 = a => V(...a);
// Experiment views are written close-up; pull the camera back so the whole set-up fits beside the notebook.
const far = (v, k = 1.3) => { const t = v3(v.target), p = v3(v.pos); return { pos: t.clone().add(p.sub(t).multiplyScalar(k)).toArray(), target: v.target }; };

// ── picking ──
E.onPick = key => {
  snd.unlock();
  if (!pending) return;
  const p = pending;
  if (p.keys.has(key)) {
    pending = null;
    setHint(null);
    snd.click();
    cur.R.picks++;
    p.resolve(key);
    return;
  }
  const unsafe = p.opts.unsafe?.[key];
  const wrong = p.opts.wrong?.[key];
  if (unsafe) {
    cur.R.safety++;
    cur.R.safetyNotes.push(unsafe);
    UI.toast(unsafe, 'warn');
    snd.bad();
  } else {
    cur.R.mistakes++;
    UI.toast(wrong || tr(`«${pickName(key)}» ليس ما تحتاجه في هذه الخطوة.`), 'bad');
    snd.bad();
  }
  if (++p.misses >= 2) setHint([...p.keys]);
};

function makeLab(exp, sc, o) {
  const R = { picks: 0, mistakes: 0, hints: 0, safety: 0, safetyNotes: [], qTotal: 0, qRight: 0, log: [] };
  let aborted = false, abortFn;
  const abortP = new Promise((_, rej) => { abortFn = () => rej(ABORT); });
  abortP.catch(() => {});
  const cleanups = [];
  const guard = p => Promise.race([p, abortP]);
  const view = { cur: exp.view };
  const lab = {
    sc, o, R, exp,
    get aborted() { return aborted; },
    abort() { aborted = true; if (pending) pending = null; setHint(null); abortFn(); },
    cleanup(fn) { cleanups.push(fn); },
    runCleanups() { cleanups.splice(0).forEach(f => { try { f(); } catch (e) { console.error(e); } }); },
    step(i) { UI.setStep(i, exp.steps.length); },
    do(text, keys, opts = {}) {
      const ks = new Set([].concat(keys));
      UI.doCard({ kicker: opts.kicker || tr('الخطوة التالية'), text });
      return guard(new Promise(resolve => { pending = { keys: ks, resolve, opts, misses: 0 }; }));
    },
    watch(text, live) { UI.watchCard({ text, live }); },
    async ask(q) {
      const qq = q.ours ? { ...q, why: (q.why || '') + tr('<small class="ours">إجابة مقترحة للّعبة، ليست من نصّ الكتاب.</small>') } : q;
      E.paused = true;
      R.qTotal++;
      const r = await guard(UI.askCard(qq, { onWrong: () => snd.bad(), onRight: () => snd.ok() }));
      E.paused = false;
      if (r.first) R.qRight++;
      return r;
    },
    book(b) { E.paused = true; return guard(UI.bookCard(b)).then(() => { E.paused = false; }); },
    log(html) { R.log.push(html); UI.log(html); },
    wait(s) { let t = 0; return guard(new Promise(res => { const off = sc.onFrame(dt => { t += dt; if (t >= s) { off(); res(); } }); })); },
    simWait(s) { let t = 0; return guard(new Promise(res => { const off = sc.onFrame((dt, sdt) => { t += sdt; if (t >= s) { off(); res(); } }); })); },
    until(fn) { return guard(new Promise(res => { if (fn()) return res(); const off = sc.onFrame(() => { if (fn()) { off(); res(); } }); })); },
    chart(opts) { lab._chart = UI.chart(opts); return lab._chart; },
    sim(on) { lab._sim = on; dockFor(lab); },
    fly(v, dur = 1.4) { const f = far(v); return guard(fly(v3(f.pos), v3(f.target), dur)); },
    setView(v) { view.cur = v; },
    get view() { return view.cur; },
    toggles: [],
    toggle({ id, label, icon = 'eye', text }) {
      const t = { id, label, icon, on: false, onChange: null, first: null };
      lab.toggles.push(t);
      dockFor(lab);
      UI.doCard({ kicker: tr('الخطوة التالية'), text, hint: false });
      return guard(new Promise(res => { t.first = () => res(t); }));
    },
  };
  return lab;
}

function dockFor(lab) {
  const extra = lab.toggles.map(t => `<button class="tog ${t.on ? 'on' : ''}" data-toggle="${t.id}">${UI.ICON[t.icon]}<span>${t.label}</span></button>`).join('');
  UI.dock({ speed: lab._sim ? E.speed : null, extra });
}

// ── experiment lifecycle ──
async function start(id) {
  const exp = EXPS.find(e => e.id === id);
  if (!exp) return;
  stop();
  stopMenuDrift();
  UI.clearScreen();
  const sc = scope();
  const o = exp.build(sc);
  const lab = makeLab(exp, sc, o);
  cur = { exp, sc, o, lab, R: lab.R };
  renderBar();
  UI.openPanel(exp);
  layout();
  dockFor(lab);
  try {
    if (!ppe.goggles || !ppe.gloves) await wearPPE(lab);
    await lab.fly(exp.view, 1.5);
    await exp.run(lab, o);
    UI.finishSteps();
    finish(lab);
  } catch (e) {
    if (e !== ABORT) { console.error(e); UI.toast(tr('حدث خطأ في التجربة.'), 'warn'); }
  }
}

async function wearPPE(lab) {
  const sc = lab.sc;
  await lab.fly(PPE_VIEW, 1.4);
  if (!ppe.goggles) {
    sc.pickable(ROOM.parts.goggles, 'goggles', tr('نظارة واقية'));
    await lab.do(tr('قبل أن تبدأ: ارتدِ النظارة الواقية.'), 'goggles', { kicker: tr('السلامة أولاً') });
    const g = ROOM.parts.goggles;
    await moveTo(g, E.camera.position.clone().add(V(0, -0.05, -0.12)), 0.6);
    g.visible = false;
    ppe.goggles = true;
    renderBar();
  }
  if (!ppe.gloves) {
    sc.pickable(ROOM.parts.gloves, 'gloves', tr('قفازات واقية'));
    await lab.do(tr('ارتدِ القفازات الواقية.'), 'gloves', { kicker: tr('السلامة أولاً') });
    snd.place();
    ppe.gloves = true;
    renderBar();
  }
  lab.R.picks -= 2;
}

function stop() {
  if (!cur) return;
  cur.lab.abort();
  cur.lab.runCleanups();
  cur.sc.dispose();
  snd.stopAll();
  E.paused = false;
  E.speed = 4;
  cur = null;
  pending = null;
  UI.closePanel();
  UI.hideDock();
  setInset(0, 0);
}

function finish(lab) {
  const R = lab.R;
  const q = R.qTotal ? R.qRight / R.qTotal : 1;
  const a = R.picks ? R.picks / (R.picks + R.mistakes + R.hints * 0.5) : 1;
  const s = Math.max(0, 1 - R.safety * 0.34);
  R.score = Math.round(100 * (0.45 * q + 0.35 * a + 0.2 * s));
  const prev = results[lab.exp.id];
  results[lab.exp.id] = { best: Math.max(prev?.best || 0, R.score), last: R.score, at: Date.now() };
  saveResults();
  snd.done();
  const i = EXPS.indexOf(lab.exp);
  const chartSvg = lab._chart ? lab._chart.svg() : '';
  setTimeout(() => {
    UI.report(lab.exp, R, { chartSvg, hasNext: i < EXPS.length - 1 });
    document.body.classList.add('reporting');
  }, 500);
}

function showMenu() {
  stop();
  document.body.classList.remove('reporting');
  renderBar();
  UI.menu(EXPS, results);
  if (window.innerWidth > 860) setInset(Math.min(560, window.innerWidth - 24) + 24, 0);
  fly(v3(MENU_VIEW.pos), v3(MENU_VIEW.target), 1.6).then(startMenuDrift);
}
function startMenuDrift() {
  stopMenuDrift();
  const base = v3(MENU_VIEW.pos), t0 = E.t;
  menuDrift = onFrame(() => {
    if (cur) return;
    const k = (E.t - t0) * 0.06;
    E.camera.position.set(base.x + Math.sin(k) * 0.25, base.y + Math.sin(k * 0.7) * 0.03, base.z + Math.cos(k) * 0.06);
  });
}
function stopMenuDrift() { if (menuDrift) { menuDrift(); menuDrift = null; } }

function renderBar() { UI.bar({ exp: cur?.exp, ppe, muted: snd.muted }); }

function layout() {
  const p = document.getElementById('panel');
  if (p.hidden) { setInset(0, 0); return; }
  const r = p.getBoundingClientRect();
  if (window.innerWidth > 860) setInset(r.width + 24, 0);
  else setInset(0, Math.min(r.height, window.innerHeight * 0.5));
}
window.addEventListener('resize', () => requestAnimationFrame(layout));

// ── clicks on the interface ──
document.addEventListener('click', e => {
  snd.unlock();
  const b = e.target.closest('[data-act],[data-exp],[data-speed],[data-toggle]');
  if (!b) return;
  if (b.dataset.exp) return void start(b.dataset.exp);
  if (b.dataset.speed) {
    E.speed = +b.dataset.speed;
    if (cur) dockFor(cur.lab);
    return;
  }
  if (b.dataset.toggle && cur) {
    const t = cur.lab.toggles.find(x => x.id === b.dataset.toggle);
    t.on = !t.on;
    if (t.first) { const f = t.first; t.first = null; f(); }
    t.onChange?.(t.on);
    dockFor(cur.lab);
    return;
  }
  const act = b.dataset.act;
  if (act === 'menu') showMenu();
  else if (act === 'sound') { snd.toggle(); renderBar(); }
  else if (act === 'hint' && pending && cur) { cur.R.hints++; setHint([...pending.keys]); }
  else if (act === 'view' && cur) { const v = far(cur.lab.view); fly(v3(v.pos), v3(v.target), 1.0); }
  else if (act === 'redo' && cur) start(cur.exp.id);
  else if (act === 'next' && cur) { const i = EXPS.indexOf(cur.exp); start(EXPS[i + 1].id); }
  else if (act === 'print') window.print();
  else if (act === 'sheet') document.getElementById('panel').classList.toggle('open');
  if (act === 'redo' || act === 'next' || act === 'menu') document.body.classList.remove('reporting');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && cur && document.body.classList.contains('reporting')) showMenu(); });

// ── boot ──
export async function boot() {
  const family = lang === 'ar' ? 'Noto Sans Arabic' : 'Google Sans Flex';
  const fonts = Promise.all(['400', '600', '700'].map(w => document.fonts.load(`${w} 40px "${family}"`)));
  await Promise.race([fonts.catch(() => {}), new Promise(r => setTimeout(r, 2500))]);
  init(document.getElementById('gl'));
  buildRoom();
  E.camera.position.copy(v3(MENU_VIEW.pos));
  E.controls.target.copy(v3(MENU_VIEW.target));
  document.body.classList.add('ready');
  const selected = new URLSearchParams(location.search).get('experiment');
  if (EXPS.some(exp => exp.id === selected)) void start(selected);
  else showMenu();
  if (UI.DEV) {
    window.__lab = {
      expect: () => (pending ? [...pending.keys] : []),
      pick: k => E.onPick(k),
      screenOf,
      speed: s => { E.speed = s; },
      state: () => cur && { id: cur.exp.id, R: cur.R },
      exps: EXPS.map(e => e.id),
      cur: () => cur,
      start,
    };
  }
}

void THREE;
