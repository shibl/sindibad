// مدن الكيمياء — board game prototype for Unit 1 of the Grade 10 chemistry book.
import { fmt, ce } from './chem.js';
import { modal, info, toast, sleep, shuffle } from './ui.js';
import { UNIT, LESSONS, SETS, BOARD, POINTS, EXAMS, GAMES, LANDMARKS, STAGE_COST, CARDS, PROJECT } from './content-u1.js';
import { runMinigame, transitionsSVG, particlesSVG } from './minigames.js';
import * as W from './world.js';

const KEY = 'chem-cities-u1-v1';
const DEV = new URLSearchParams(location.search).has('dev');
const app = document.getElementById('app');

const SET = Object.fromEntries(SETS.map(s => [s.id, s]));
const TILE = Object.fromEntries(BOARD.filter(t => t.type === 'prop').map(t => [t.id, t]));
const PT = Object.fromEntries(POINTS.map(p => [p.id, p]));
POINTS.forEach(p => p.qs.forEach((q, i) => Object.assign(q, { id: `${p.id}.${i}`, pid: p.id, page: p.page })));
EXAMS.forEach(x => Object.assign(x, { lv: 3, exam: true }));
const tilePoints = id => POINTS.filter(p => p.tile === id);
const setPoints = sid => POINTS.filter(p => TILE[p.tile].set === sid);
const lessonSets = lid => SETS.filter(s => s.lesson === lid);

const LV = { 1: 'تذكّر', 2: 'فهم', 3: 'مسألة' };
const MOVES = [
  { n: 1, lv: 1, label: 'خطوة واحدة', q: 'سؤال تذكّر', reward: 10 },
  { n: 2, lv: 2, label: 'خطوتان', q: 'سؤال فهم', reward: 25 },
  { n: 3, lv: 3, label: 'ثلاث خطوات', q: 'مسألة', reward: 45 },
];
// Rewards are fixed and known in advance; nothing is ever lost on a wrong answer.
const R = { teach: 40, retry: 20, rent: 15, set: 150, salary: 100, goLand: 100, exam: 80, review: 40, rest: 30, streak: 50, challenge: 60, challengeAll: 150, game: 10, empty: 10 };
const PASS = 0.6;
const SPECIAL = {
  go: { icon: '🚩', name: 'انطلاق', about: `تحصل على ${R.salary} 🪙 كلّما مررت من هنا، و${R.goLand} 🪙 إضافية إذا وقفت عليه.` },
  rest: { icon: '☕', name: 'ركن «تعلّمت»', about: `ملخّص الكتاب («تعلّمت») لكلّ درس بدأته، و${R.rest} 🪙.` },
  review: { icon: '🔁', name: 'مراجعة', about: `سؤال عن فكرة تعلّمتها سابقاً — الفكرة الأضعف أولاً. +${R.review} 🪙.` },
  exam: { icon: '📝', name: 'سؤال امتحان', about: `سؤال من «أسئلة الوحدة» أو مسائل «أختبر نفسي». +${R.exam} 🪙.` },
  challenge: { icon: '🏆', name: 'تحدّي الوحدة', about: `ثلاثة أسئلة امتحان متتالية. كلّ صحيحة +${R.challenge} 🪙، والثلاث معاً +${R.challengeAll} 🪙 وبطاقة.` },
};

// ── state ──
const fresh = () => ({ v: 1, screen: 'map', coins: 300, pos: 0, turn: 0, laps: 0, streak: 0, best: 0, pts: {}, qs: {}, games: {}, exams: {}, marks: {}, cards: {}, intro: false, won: false, msg: '', step: 1 });
let S = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.v === 1) return { ...fresh(), ...s };
  } catch { /* storage unavailable */ }
  return fresh();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage unavailable */ }
}
const ps = id => (S.pts[id] ||= { m: false, weak: false, wrong: 0, seen: -1 });
const mastered = id => !!S.pts[id]?.m;
const masteredCount = () => POINTS.filter(p => mastered(p.id)).length;
const setDone = sid => setPoints(sid).every(p => mastered(p.id));
const lmPoints = lm => lm.sets.flatMap(setPoints);
const lmFrac = lm => lmPoints(lm).filter(p => mastered(p.id)).length / lmPoints(lm).length;
const gamePassed = id => !!S.games[id]?.done;
// Each exam question belongs to the landmark whose section holds its last prerequisite idea.
const lmExams = lm => EXAMS.filter(x => lm.sets.includes(TILE[PT[x.pre.at(-1)].tile].set));
const examSolved = x => S.exams[x.id] === true;
function stageReq(lm, n) {
  const need = n / 3;
  const frac = lmFrac(lm);
  const labs = n < 3 || lm.games.every(gamePassed);
  const exams = lmExams(lm);
  const solved = exams.filter(examSolved).length;
  const examsOk = n < 3 || solved === exams.length;
  return { need, frac, labs, exams: exams.length, solved, ok: frac >= need - 1e-9 && labs && examsOk };
}
const tileName = t => t.type === 'prop' ? t.name : (t.game ? GAMES[t.game].name : SPECIAL[t.type].name);

function addCoins(n) {
  if (!n) return;
  S.coins += n;
  if (n > 0 && S.screen === 'board') W.coinBurst(null, Math.min(12, 3 + Math.round(n / 20)));
  const el = document.getElementById('coins');
  if (!el) return;
  el.querySelector('b').textContent = fmtN(S.coins);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  const f = document.createElement('span');
  f.className = 'float';
  f.textContent = `${n > 0 ? '+' : ''}${n}`;
  el.append(f);
  setTimeout(() => f.remove(), 1200);
}

function updateHud() {
  const s = document.getElementById('streak');
  if (s) s.textContent = S.streak;
}

function answered(q, ok) {
  const rec = (S.qs[q.id] ||= { n: 0, ok: 0, last: -99 });
  rec.n++;
  if (ok) rec.ok++;
  rec.last = S.turn;
  if (q.exam) S.exams[q.id] = ok || S.exams[q.id] === true;
  if (q.pid) {
    const p = ps(q.pid);
    p.seen = S.turn;
    if (!ok) { p.wrong++; if (p.m) p.weak = true; } else p.weak = false;
  }
  if (ok) {
    S.streak++;
    S.best = Math.max(S.best, S.streak);
    if (S.streak % 3 === 0) {
      addCoins(R.streak);
      toast(`🔥 ${S.streak} إجابات صحيحة متتالية: +${R.streak} 🪙`, 'gold');
    }
  } else S.streak = 0;
  updateHud();
}

// Questions for move cards come only from ideas already learned; weak and unseen ones first.
function movePool(lv) {
  const pool = [];
  for (const p of POINTS) if (mastered(p.id)) for (const q of p.qs) if (q.lv === lv) pool.push(q);
  if (lv === 3) for (const x of EXAMS) if (x.pre.every(mastered)) pool.push(x);
  return pool;
}
function qScore(q) {
  const r = S.qs[q.id];
  const weak = q.pid && S.pts[q.pid]?.weak;
  const recent = r && S.turn - r.last < 4;
  return (weak ? -1000 : 0) + (r ? r.last : -500) + (recent ? 800 : 0);
}
const pickQs = (pool, n = 1) => [...pool].sort((a, b) => qScore(a) - qScore(b)).slice(0, n);

// ── question & teaching modals ──
function ask(q, { badge, reward = 0, note = '' } = {}) {
  return new Promise(res => {
    const c = q.c ?? 0;
    const list = q.a.map((t, j) => ({ t, ok: j === c }));
    const opts = q.keep ? list : shuffle(list);
    modal(`<div class="q-top"><span class="lv lv${q.lv}">${badge || LV[q.lv]}</span>${q.src ? `<span class="src">📘 ${q.src}</span>` : ''}${q.page ? `<span class="pg">الكتاب ص ${q.page}</span>` : ''}${reward ? `<span class="rw">+${reward} 🪙</span>` : ''}</div>
${note ? `<p class="q-note">${note}</p>` : ''}
<div class="q-text">${fmt(q.q)}</div>
<div class="opts${q.keep ? ' tf' : ''}">${opts.map((o, j) => `<button class="opt" data-j="${j}">${fmt(o.t)}</button>`).join('')}</div>
<div class="q-why" hidden></div>
<div class="m-foot" hidden><button class="btn primary">متابعة</button></div>`, {
      cls: 'qm',
      onOpen: (el, close) => {
        let done = false;
        if (DEV) el.querySelectorAll('.opt').forEach((x, j) => { if (opts[j].ok) x.dataset.right = '1'; });
        el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
          if (done) return;
          done = true;
          const ok = opts[+b.dataset.j].ok;
          el.querySelectorAll('.opt').forEach((x, j) => { x.disabled = true; if (opts[j].ok) x.classList.add('correct'); });
          if (!ok) b.classList.add('wrong');
          const w = el.querySelector('.q-why');
          w.innerHTML = `${ok ? '<b class="ok">✓ صحيح!</b>' : '<b class="no">✗ ليست هذه.</b>'} ${fmt(q.why || '')}${q.verify ? '<span class="verify">مفتاح الإجابة من إعداد اللعبة — يُراجَع مع المدرّس.</span>' : ''}`;
          w.hidden = false;
          if (ok && reward) addCoins(reward);
          answered(q, ok);
          const btn = el.querySelector('.m-foot button');
          btn.parentElement.hidden = false;
          btn.focus();
          btn.onclick = () => { close(); res(ok); };
        });
      },
    });
  });
}

function houseDots(tileId, activeId) {
  return `<span class="hd">${tilePoints(tileId).map(p => `<i class="${mastered(p.id) ? 'on' : ''}${p.id === activeId ? ' cur' : ''}"></i>`).join('')}</span>`;
}

function curveMini() {
  return `<svg class="mini" viewBox="0 0 260 120" aria-hidden="true"><line x1="20" y1="10" x2="20" y2="110" stroke="#334155" stroke-width="2"/><line x1="20" y1="110" x2="250" y2="110" stroke="#334155" stroke-width="2"/>
<polyline points="28,104 58,84 98,84 140,30 200,30 232,12" fill="none" stroke="#16a34a" stroke-width="4" stroke-linejoin="round"/>
<text x="62" y="78" class="ax">0°C · عتبة الانصهار</text><text x="134" y="24" class="ax">100°C · عتبة الغليان</text></svg>`;
}

function visHTML(v) {
  if (!v) return '';
  if (v.type === 'emoji') return `<div class="vis emoji" aria-hidden="true">${v.e}</div>`;
  if (v.type === 'particles' && v.kind === 'row') {
    const names = { solid: 'صلب', liquid: 'سائل', gas: 'غاز', plasma: 'بلازما' };
    return `<figure class="vis row">${Object.keys(names).map(k => `<div>${particlesSVG(k)}<span>${names[k]}</span></div>`).join('')}<figcaption>${v.cap}</figcaption></figure>`;
  }
  if (v.type === 'particles') return `<figure class="vis">${particlesSVG(v.kind)}<figcaption>${v.cap}</figcaption></figure>`;
  if (v.type === 'img') return `<figure class="vis img"><img src="${v.src}" alt="${v.cap}" onerror="this.closest('figure').remove()"><figcaption>${v.cap} · صورة من الكتاب</figcaption></figure>`;
  if (v.type === 'transitions') return `<figure class="vis wide">${transitionsSVG()}</figure>`;
  if (v.type === 'curve') return `<figure class="vis">${curveMini()}<figcaption>تغيّر درجة حرارة الماء مع الزمن عند التسخين</figcaption></figure>`;
  if (v.type === 'water') return `<div class="vis formula">${ce('H–H')}&nbsp; ${ce('H–H')} <span class="op">+</span> ${ce('O=O')} <span class="arr">→</span> ${ce('H–O–H')}&nbsp; ${ce('H–O–H')}</div>`;
  if (v.type === 'hi') return `<figure class="vis">${hiSVG()}<figcaption>الشكل 1 (قبل التسخين) — الشكل 2 (بعد التسخين)</figcaption></figure>`;
  if (v.type === 'lewis') return `<figure class="vis">${lewisSVG()}<figcaption>ينتقل إلكترونا المغنزيوم إلى الكبريت</figcaption></figure>`;
  return '';
}

function hiSVG() {
  const mol = (x, y, a, b) => `<circle cx="${x}" cy="${y}" r="7" fill="${a}"/><circle cx="${x + 11}" cy="${y}" r="7" fill="${b}"/>`;
  const I = '#3b82f6';
  const H = '#e879f9';
  const p1 = [[20, 22], [70, 30], [120, 20], [30, 62], [85, 70], [130, 58], [25, 100], [75, 104], [125, 96], [52, 46], [105, 84], [140, 40]];
  const f1 = p1.map(([x, y], i) => mol(x, y, i % 2 ? H : I, i % 2 ? H : I)).join('');
  const f2 = p1.map(([x, y], i) => mol(x + 190, y, i % 3 === 2 ? H : (i % 3 ? H : I), i % 3 === 2 ? I : (i % 3 ? H : I))).join('');
  return `<svg class="mini" viewBox="0 0 360 124" aria-hidden="true"><rect x="6" y="6" width="160" height="112" rx="14" fill="#f8fafc" stroke="#94a3b8"/><rect x="194" y="6" width="160" height="112" rx="14" fill="#f8fafc" stroke="#94a3b8"/>${f1}${f2}
<text x="86" y="122" class="ax">I₂ و H₂</text><text x="274" y="122" class="ax">H₂ و I₂ و HI</text></svg>`;
}

function lewisSVG() {
  const d = (x, y) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#0f172a"/>`;
  return `<svg class="mini" viewBox="0 0 470 110" aria-hidden="true">
<text x="40" y="64" class="lw">Mg</text>${d(48, 34)}${d(60, 34)}
<path d="M62 30 Q110 0 150 32" fill="none" stroke="#ea580c" stroke-width="2.5" marker-end="url(#lwa)"/>
<defs><marker id="lwa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#ea580c"/></marker></defs>
<text x="94" y="64" class="lw">+</text>
<text x="150" y="64" class="lw">S</text>${d(158, 30)}${d(140, 54)}${d(178, 48)}${d(178, 60)}${d(152, 80)}${d(164, 80)}
<text x="205" y="64" class="lw">→</text>
<text x="250" y="64" class="lw">Mg</text><text x="290" y="46" class="lws">+2</text>
<text x="322" y="64" class="lw">+</text>
<text x="356" y="64" class="lw">[ S ]</text><text x="420" y="46" class="lws">−2</text>
${d(378, 28)}${d(388, 28)}${d(358, 50)}${d(358, 60)}${d(406, 50)}${d(406, 60)}${d(378, 80)}${d(388, 80)}</svg>`;
}

function teach(p, { k, n, again = false } = {}) {
  const t = TILE[p.tile];
  const s = SET[t.set];
  return info(`<div class="t-top" style="--set:${s.color}"><span class="t-set">${s.no} · ${s.title}</span><span class="pg">الكتاب ص ${p.page}</span></div>
<h2 class="t-title">${again ? 'اقرأ مرّة أخرى: ' : ''}${p.title}</h2>
${k ? `<div class="t-houses">${houseDots(t.id, p.id)}<span>فكرة ${k} من ${n} في «${t.name}»</span></div>` : ''}
${visHTML(p.vis)}
<div class="book" style="--set:${s.color}"><span class="book-label">${p.box}</span>${fmt(p.body)}</div>`, { cls: 'teach', btn: again ? 'جرّب سؤالاً آخر' : 'فهمت — اسألني' });
}

// ── landing on tiles ──
async function landProp(t) {
  const pts = tilePoints(t.id);
  const todo = pts.filter(p => !mastered(p.id));
  if (!todo.length) {
    const full = setDone(t.set);
    const rent = R.rent * pts.length * (full ? 2 : 1);
    addCoins(rent);
    S.msg = `«${t.name}» ملكك: إيراد +${rent} 🪙${full ? ' (المجموعة كاملة: إيراد مضاعف)' : ''}.`;
    toast(S.msg, 'gold');
    return;
  }
  let learned = 0;
  for (const p of todo) {
    await teach(p, { k: pts.indexOf(p) + 1, n: pts.length });
    const qs = [...p.qs].sort((a, b) => a.lv - b.lv);
    let ok = await ask(qs[0], { badge: 'سؤال تحقّق', reward: R.teach });
    if (!ok) {
      await teach(p, { again: true });
      ok = await ask(qs[1] || qs[0], { badge: 'محاولة ثانية', reward: R.retry });
    }
    if (ok) {
      Object.assign(ps(p.id), { m: true, at: S.turn, seen: S.turn });
      learned++;
      refresh();
      toast(`🏠 منزل جديد في «${t.name}»`, 'good');
    } else toast('لا بأس — ستعود إلى هذه الفكرة عندما تقف هنا مرّة أخرى.');
  }
  const count = learned === 1 ? 'فكرة جديدة' : learned === 2 ? 'فكرتين جديدتين' : `${learned} أفكار جديدة`;
  S.msg = learned ? `تعلّمت ${count} في «${t.name}».` : `لم تُتقن «${t.name}» بعد — عُد إليها لاحقاً.`;
  if (setDone(t.set) && !S.cards[`c-${t.set}`]) await completeSet(SET[t.set]);
}

async function completeSet(s) {
  S.cards[`c-${s.id}`] = true;
  addCoins(R.set);
  await info(`<div class="celebrate"><div class="big">🎉</div><h2>أتقنت مجموعة «${s.title}»</h2><p class="muted">القسم ${s.no} من الكتاب، ص ${s.pages}</p>${cardHTML(CARDS.find(c => c.id === `c-${s.id}`))}<p class="gold">+${R.set} 🪙 · وإيراد هذه المجموعة صار مضاعفاً</p></div>`, { btn: 'رائع!' });
}

async function landLab(t) {
  const g = GAMES[t.game];
  const missing = g.pre.filter(id => !mastered(id));
  if (missing.length) {
    const tiles = [...new Set(missing.map(id => TILE[PT[id].tile].name))];
    addCoins(R.empty);
    S.msg = `مختبر «${g.name}» مغلق حتى تتعلّم: ${tiles.map(x => `«${x}»`).join('، ')}.`;
    await info(`<h2>${g.icon} ${g.name}</h2><p>هذا المختبر يحتاج أن تتعلّم أولاً:</p><ul class="list">${tiles.map(x => `<li>${x}</li>`).join('')}</ul><p class="muted">خذ +${R.empty} 🪙 وعُد إليه لاحقاً.</p>`);
    return;
  }
  const rec = (S.games[t.game] ||= { done: false, best: 0, plays: 0 });
  const { score, total } = await runMinigame(t.game, g);
  const wasDone = rec.done;
  rec.plays++;
  rec.best = Math.max(rec.best, score);
  if (score / total >= PASS) rec.done = true;
  addCoins(score * R.game);
  S.msg = `«${g.name}»: ${score} من ${total}.${rec.done ? '' : ` تحتاج ${Math.ceil(total * PASS)} لتنجح في المختبر — جرّبه مرّة أخرى.`}`;
  if (rec.done && !wasDone) {
    const c = CARDS.find(x => x.id === `c-${t.game}`);
    S.cards[c.id] = true;
    await info(`<div class="celebrate"><div class="big">🃏</div><h2>نجحت في المختبر — بطاقة جديدة!</h2>${cardHTML(c)}</div>`, { btn: 'إلى الألبوم' });
  }
}

async function landExam() {
  const pool = EXAMS.filter(x => x.pre.every(mastered));
  if (!pool.length) {
    addCoins(R.empty);
    S.msg = `لا يوجد سؤال امتحان متاح بعد — تعلّم المزيد. +${R.empty} 🪙`;
    toast(S.msg);
    return;
  }
  const open = pool.filter(x => S.exams[x.id] !== true);
  const [q] = pickQs(open.length ? open : pool);
  const ok = await ask(q, { badge: 'سؤال امتحان', reward: R.exam });
  S.msg = ok ? `سؤال امتحان صحيح: +${R.exam} 🪙` : 'سيعود إليك سؤال الامتحان هذا لاحقاً.';
}

async function landReview() {
  const learned = POINTS.filter(p => mastered(p.id));
  if (!learned.length) {
    addCoins(R.empty);
    S.msg = `لا يوجد ما تراجعه بعد. +${R.empty} 🪙`;
    toast(S.msg);
    return;
  }
  const p = [...learned].sort((a, b) => (ps(b.id).weak - ps(a.id).weak) || (ps(a.id).seen - ps(b.id).seen))[0];
  const weak = ps(p.id).weak;
  const [q] = pickQs(p.qs);
  const ok = await ask(q, { badge: 'مراجعة', reward: R.review, note: `🔁 مراجعة «${p.title}»${weak ? ' — فكرة تحتاج تقوية' : ''}` });
  if (!ok) await teach(p, { again: true });
  S.msg = ok ? `مراجعة ناجحة: +${R.review} 🪙` : `راجعت «${p.title}» من جديد.`;
}

async function landRest() {
  addCoins(R.rest);
  const ls = LESSONS.filter(l => lessonSets(l.id).some(s => setPoints(s.id).some(p => mastered(p.id))));
  await info(`<h2>☕ ركن «تعلّمت»</h2><p class="muted">ملخّص الكتاب لكلّ درس بدأته · +${R.rest} 🪙</p>
${ls.length ? ls.map(l => `<div class="learned"><h3>تعلّمت — الدرس ${l.no}: ${l.title}</h3><ul>${l.learned.map(x => `<li>${fmt(x)}</li>`).join('')}</ul><p class="research"><b>أبحث أكثر:</b> ${l.research.join(' · ')}</p></div>`).join('') : '<p>تعلّم أوّل فكرة لتظهر ملخّصاتها هنا.</p>'}`, { cls: 'wide' });
  S.msg = `استراحة في ركن «تعلّمت»: +${R.rest} 🪙`;
}

async function landChallenge() {
  const pool = [...EXAMS.filter(x => x.pre.every(mastered)), ...POINTS.filter(p => mastered(p.id)).flatMap(p => p.qs.filter(q => q.lv === 3))];
  if (pool.length < 3) {
    addCoins(R.empty);
    S.msg = `تحدّي الوحدة يحتاج 3 مسائل متاحة على الأقل — تعلّم المزيد. +${R.empty} 🪙`;
    toast(S.msg);
    return;
  }
  await info(`<h2>🏆 تحدّي الوحدة</h2><p>ثلاث مسائل من مستوى الامتحان. كلّ إجابة صحيحة +${R.challenge} 🪙، والثلاث معاً +${R.challengeAll} 🪙 وبطاقة «بطل التحدّي».</p>`, { btn: 'ابدأ التحدّي' });
  let right = 0;
  const picks = pickQs(pool, 3);
  for (const [i, q] of picks.entries()) if (await ask(q, { badge: `تحدّي ${i + 1} من 3`, reward: R.challenge })) right++;
  if (right === 3) {
    addCoins(R.challengeAll);
    if (!S.cards['c-ch']) {
      S.cards['c-ch'] = true;
      await info(`<div class="celebrate"><div class="big">🏆</div><h2>3 من 3!</h2>${cardHTML(CARDS.find(c => c.id === 'c-ch'))}<p class="gold">+${R.challengeAll} 🪙</p></div>`);
    }
  }
  S.msg = `تحدّي الوحدة: ${right} من 3.`;
}

const RIBBON = { prop: 'تعلّم!', lab: 'مختبر!', biglab: 'مختبر!', exam: 'امتحان!', review: 'مراجعة!', rest: 'استراحة!', challenge: 'تحدٍّ!', go: 'انطلاق!' };

// Big red ribbon banner, as on the Monopoly GO event screens.
function ribbon(text, sub = '') {
  const r = document.createElement('div');
  r.className = 'ribbon';
  r.innerHTML = `<span>${text}</span>${sub ? `<small>${sub}</small>` : ''}`;
  document.body.append(r);
  setTimeout(() => r.classList.add('out'), 700);
  setTimeout(() => r.remove(), 1150);
}

async function land() {
  const t = BOARD[S.pos];
  ribbon(RIBBON[t.type] || '', tileName(t));
  await sleep(950);
  if (t.type === 'prop') return landProp(t);
  if (t.type === 'lab' || t.type === 'biglab') return landLab(t);
  if (t.type === 'exam') return landExam();
  if (t.type === 'review') return landReview();
  if (t.type === 'rest') return landRest();
  if (t.type === 'challenge') return landChallenge();
  if (t.type === 'go') {
    addCoins(R.goLand);
    S.msg = `وقفت على الانطلاق: +${R.goLand} 🪙 إضافية.`;
  }
}

// ── turn: pick steps, answer, move ──
let busy = false;
if (DEV) Object.assign(window, { __busy: () => busy, __tiles: () => BOARD.map(tileData), __state: () => S });

async function onGo() {
  if (busy) return;
  busy = true;
  W.highlight(null);
  const m = MOVES[S.step - 1];
  const pool = movePool(m.lv);
  if (pool.length) {
    const ok = await ask(pickQs(pool)[0], { badge: `${m.q} · ${m.label}`, reward: m.reward });
    if (!ok) {
      S.turn++;
      S.msg = 'لم تتحرّك هذه المرّة. اقرأ الشرح، ثمّ انطلق من جديد.';
      save();
      busy = false;
      refresh();
      return;
    }
  }
  app.classList.add('moving');
  await walk(m.n);
  app.classList.remove('moving');
  await land();
  S.turn++;
  save();
  busy = false;
  refresh();
}

async function walk(n) {
  for (let i = 0; i < n; i++) {
    S.pos = (S.pos + 1) % BOARD.length;
    await W.hopTo(S.pos);
    if (S.pos === 0) {
      S.laps++;
      addCoins(R.salary);
      toast(`🚩 مررت بالانطلاق: +${R.salary} 🪙`, 'gold');
    }
  }
  await sleep(120);
}

// ── city ──
const stars = st => [1, 2, 3].map(i => `<i class="${i <= st ? 'on' : ''}">★</i>`).join('');
function canBuild(lm) {
  const st = S.marks[lm.id] || 0;
  return st < 3 && stageReq(lm, st + 1).ok && S.coins >= STAGE_COST[st];
}
function whyNot(lm) {
  const st = S.marks[lm.id] || 0;
  if (st >= 3) return '';
  const r = stageReq(lm, st + 1);
  if (r.frac < r.need - 1e-9) return `أتقن ${Math.round(r.need * 100)}% من أفكار هذا المعلم (الآن ${Math.round(r.frac * 100)}%).`;
  if (!r.labs) return `انجح في ${lm.games.filter(g => !gamePassed(g)).map(g => `«${GAMES[g].name}»`).join(' و')}.`;
  if (!r.ok) return `أجب عن أسئلة الامتحان الخاصة بهذا المعلم: بقي ${r.exams - r.solved} من ${r.exams}. تجدها في مربّعات 📝، وبطاقة الخطوات الثلاث، و«تحدّي الوحدة».`;
  if (S.coins < STAGE_COST[st]) return `تحتاج ${fmtN(STAGE_COST[st] - S.coins)} 🪙 إضافية.`;
  return '';
}

function openLandmark(id) {
  const lm = LANDMARKS.find(l => l.id === id);
  const st = S.marks[id] || 0;
  const cost = STAGE_COST[st];
  const why = whyNot(lm);
  modal(`<div class="lm-modal"><div class="m-ribbon" style="--c:${lm.color}">${lm.name}</div><div class="stars big">${stars(st)}</div>
<p class="muted">يُبنى بإتقان أقسام الكتاب: ${lm.sets.map(s => `<b style="color:${SET[s].color}">${SET[s].no} ${SET[s].title}</b>`).join('، ')}</p>
<ol class="stages">${[1, 2, 3].map(n => { const q = stageReq(lm, n); return `<li class="${n <= st ? 'done' : ''}"><b>المرحلة ${n}</b><span>${STAGE_COST[n - 1]} 🪙 + إتقان ${Math.round(q.need * 100)}% من الأفكار${n === 3 ? ` + النجاح في ${lm.games.map(g => `«${GAMES[g].name}»`).join(' و')}${q.exams ? ` + أسئلة الامتحان (${q.solved}/${q.exams})` : ''}` : ''}</span>${n <= st ? '<em>✓</em>' : ''}</li>`; }).join('')}</ol>
<p>إتقانك لأفكار هذا المعلم: <b>${Math.round(lmFrac(lm) * 100)}%</b></p>
${why ? `<p class="why-not">${why}</p>` : ''}
<div class="m-foot">${st < 3 ? `<button class="btn go" data-build ${why ? 'disabled' : ''}>🔨 ابنِ المرحلة ${st + 1} — ${fmtN(cost)} 🪙</button>` : ''}<button class="btn" data-close>إغلاق</button></div></div>`, {
    dismissable: true,
    cls: 'narrow',
    onOpen: (el, close) => {
      el.querySelector('[data-build]')?.addEventListener('click', async () => {
        S.coins -= cost;
        S.marks[id] = st + 1;
        save();
        close();
        if (S.screen !== 'city') { S.screen = 'city'; render(); await sleep(500); }
        render();
        ribbon('ابنِ!', `${lm.name} · المرحلة ${st + 1} من 3`);
        await W.setStage(id, st + 1, true);
        render();
        if (!S.won && LANDMARKS.every(l => (S.marks[l.id] || 0) >= 3)) {
          await sleep(700);
          await win();
        }
      });
    },
  });
}


async function win() {
  S.won = true;
  S.cards['c-city'] = true;
  save();
  await info(`<div class="celebrate"><div class="big">🏙️</div><h2>بنيت «${UNIT.city}» كاملة!</h2><p>أتقنت كلّ أفكار ${UNIT.no}: ${UNIT.title} (الكتاب ص ${UNIT.pages}).</p>${cardHTML(CARDS.find(c => c.id === 'c-city'))}
<div class="project"><h3>📋 ${PROJECT.title} <span class="muted">ص ${PROJECT.pages}</span></h3><p>${PROJECT.intro}</p><p><b>هدف المشروع:</b> ${PROJECT.goal}</p><p><b>التخطيط:</b></p><ul>${PROJECT.plan.map(x => `<li>${x}</li>`).join('')}</ul><p><b>التنفيذ:</b> ${PROJECT.run}</p><p><b>التقويم:</b> ${PROJECT.eval}</p></div>
<p class="muted">الوحدة الثانية «المدارات الذرّية والجدول الدوري» قريباً.</p></div>`, { cls: 'wide', btn: 'إلى الخريطة' });
  S.screen = 'map';
  save();
  render();
}

// ── album, syllabus, help ──
function cardHTML(c) {
  const got = !!S.cards[c.id];
  const icon = c.kind === 'set' ? '🏘️' : c.kind === 'fact' ? '🔬' : '🏆';
  return `<div class="card k-${c.kind}${got ? '' : ' locked'}" style="--c:${c.color}"><div class="card-top">${got ? icon : '🔒'}</div><b>${c.title}</b><p>${got ? fmt(c.text) : c.how}</p></div>`;
}

function openAlbum() {
  const n = CARDS.filter(c => S.cards[c.id]).length;
  modal(`<h2>🃏 الألبوم <span class="muted">${n} من ${CARDS.length}</span></h2><p class="muted">كلّ بطاقة لها طريقة واحدة معروفة للحصول عليها — لا صناديق عشوائية.</p>
<div class="album">${CARDS.map(cardHTML).join('')}</div><div class="m-foot"><button class="btn" data-close>إغلاق</button></div>`, { dismissable: true, cls: 'wide' });
}

function openSyllabus() {
  const icon = p => (mastered(p.id) ? (S.pts[p.id].weak ? '⚠️' : '✅') : '⬜');
  const m = masteredCount();
  const exDone = EXAMS.filter(x => S.exams[x.id] === true).length;
  const gDone = Object.keys(GAMES).filter(gamePassed).length;
  modal(`<h2>📚 خريطة المنهج — ${UNIT.no}: ${UNIT.title}</h2>
<p class="muted">كلّ فكرة من الكتاب لها مكان في اللعبة. ✅ متقنة · ⚠️ تحتاج تقوية · ⬜ لم تُتعلّم بعد</p>
<div class="sy-sum"><span>🏠 الأفكار <b>${m}/${POINTS.length}</b></span><span>🧪 المختبرات <b>${gDone}/${Object.keys(GAMES).length}</b></span><span>📝 أسئلة الامتحان <b>${exDone}/${EXAMS.length}</b></span></div>
${LESSONS.map(l => `<section class="sy-lesson"><h3>الدرس ${l.no}: ${l.title} <span class="muted">ص ${l.pages}</span></h3>
${lessonSets(l.id).map(s => `<div class="sy-set" style="--set:${s.color}"><h4>${s.no} ${s.title} <span class="muted">ص ${s.pages}</span></h4><ul>${setPoints(s.id).map(p => `<li><span>${icon(p)}</span>${p.title}<em>ص ${p.page} · «${TILE[p.tile].name}»</em></li>`).join('')}</ul></div>`).join('')}</section>`).join('')}
<section class="sy-lesson"><h3>المختبرات</h3><ul class="sy-flat">${Object.entries(GAMES).map(([id, g]) => `<li><span>${gamePassed(id) ? '✅' : '⬜'}</span>${g.icon} ${g.name}<em>ص ${g.page}${S.games[id] ? ` · أفضل نتيجة ${S.games[id].best}` : ''}</em></li>`).join('')}</ul></section>
<section class="sy-lesson"><h3>أسئلة الامتحان</h3><ul class="sy-flat">${EXAMS.map(x => `<li><span>${S.exams[x.id] === true ? '✅' : S.exams[x.id] === false ? '⚠️' : '⬜'}</span>${x.src}<em>ص ${x.page}</em></li>`).join('')}</ul></section>
<section class="sy-lesson"><h3>خارج اللعبة</h3><ul class="sy-flat"><li><span>📋</span>${PROJECT.title}<em>ص ${PROJECT.pages} — يظهر عند إكمال المدينة</em></li>${LESSONS.map(l => `<li><span>🔎</span>أبحث أكثر — الدرس ${l.no}<em>يظهر في ركن «تعلّمت»</em></li>`).join('')}</ul></section>
<div class="m-foot"><button class="btn" data-close>إغلاق</button></div>`, { dismissable: true, cls: 'wide' });
}

const HELP = `<h2>❓ كيف ألعب</h2><ol class="help">
<li><b>اختر عدد الخطوات ثمّ اضغط «انطلق!»:</b> خطوة واحدة (سؤال تذكّر)، أو خطوتان (سؤال فهم)، أو ثلاث خطوات (مسألة). الإجابة الصحيحة تحرّكك بالضبط هذا العدد. لا نرد ولا حظّ: المربّع الذي ستصل إليه يلمع قبل أن تنطلق.</li>
<li><b>الخطأ لا يُخسرك شيئاً:</b> تبقى مكانك وتقرأ الشرح، ثمّ تنطلق من جديد.</li>
<li><b>المربّعات الملوّنة أفكار من الكتاب.</b> أوّل مرّة تقف عليها تقرأ نصّ الكتاب ثمّ تُجيب سؤال تحقّق؛ كلّ فكرة تتقنها تبني بيتاً أخضر على المربّع، والمربّع المكتمل يصير فندقاً أحمر.</li>
<li><b>كلّ لون قسم من الكتاب.</b> أتقن المجموعة كلّها لتأخذ بطاقة ويتضاعف إيرادها.</li>
<li><b>🧪 المختبرات</b> ألعاب قصيرة من أنشطة الكتاب. <b>📝</b> أسئلة امتحان. <b>🔁</b> مراجعة لأضعف فكرة. <b>☕</b> ملخّص «تعلّمت».</li>
<li><b>🏙️ المدينة:</b> النقود تبني المعالم، لكنّ كلّ معلم يحتاج أيضاً <u>إتقان</u> أقسامه — الإتقان لا يُشترى. المرحلة الأخيرة تحتاج مختبراته وأسئلة الامتحان الخاصة به.</li>
<li><b>🔥 السلسلة:</b> كلّ 3 إجابات صحيحة متتالية = +${R.streak} 🪙.</li></ol>`;

// ── screens: a 3D scene under an HTML HUD ──
const fmtN = n => Number(n).toLocaleString('en-US');
let overview = false;
const scenes = {};

function mix(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => Math.round(((n >> s) & 255) * amt + 255 * (1 - amt));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
const TILE_BG = { lab: '#efe6ff', biglab: '#efe6ff', exam: '#ffe8ee', review: '#e2f3ff', go: '#fff1c1', rest: '#fff1c1', challenge: '#fff1c1' };
const TILE_BODY = { lab: '#d9c9ff', biglab: '#d9c9ff', exam: '#ffc9d6', review: '#c3e4fb', go: '#ffe08a', rest: '#ffe08a', challenge: '#ffe08a' };
function tileData(t, i) {
  if (t.type === 'prop') {
    const pts = tilePoints(t.id);
    const m = pts.filter(p => mastered(p.id)).length;
    const own = m === pts.length;
    return { kind: 'prop', name: t.name, color: SET[t.set].color, bg: own ? mix(SET[t.set].color, 0.22) : '#eaf7fa', body: '#cfe8ee', total: pts.length, mastered: m, owned: own, sub: `${SET[t.set].no} · ص ${pts[0].page}` };
  }
  const g = t.game && GAMES[t.game];
  const ex = t.type === 'exam' || t.type === 'challenge';
  return {
    kind: t.type, name: g ? g.name : SPECIAL[t.type].name, icon: g ? g.icon : SPECIAL[t.type].icon, corner: i % 8 === 0,
    bg: TILE_BG[t.type], body: TILE_BODY[t.type], shut: g ? !g.pre.every(mastered) : false,
    sub: ex ? `${EXAMS.filter(examSolved).length}/${EXAMS.length}` : g && gamePassed(t.game) ? '✓ ناجح' : '', subColor: g && gamePassed(t.game) ? '#16a34a' : '#9f1239',
  };
}
const syncTiles = () => BOARD.forEach((t, i) => W.setTile(i, tileData(t, i)));

function topHud(left) {
  const cards = CARDS.filter(c => S.cards[c.id]).length;
  return `<header class="hud-top">
<div class="hud-side">${left}</div>
<div class="money" id="coins"><span class="coin">ك</span><b>${fmtN(S.coins)}</b></div>
<div class="hud-side end"><span class="chip" title="إجابات صحيحة متتالية">🔥 <b id="streak">${S.streak}</b></span><span class="chip" title="الأفكار المتقنة">🏠 <b>${masteredCount()}/${POINTS.length}</b></span><span class="chip" title="البطاقات">🃏 <b>${cards}/${CARDS.length}</b></span></div>
</header>`;
}
function dock(active) {
  const can = LANDMARKS.some(canBuild);
  const item = (a, icon, lbl) => `<button class="dk${active === a ? ' on' : ''}" data-act="${a}"><span>${icon}</span><small>${lbl}</small>${a === 'city' && can ? '<em class="dot"></em>' : ''}</button>`;
  return `<nav class="dock">${item('board', '♟️', 'اللوح')}${item('city', '🏙️', 'المدينة')}${item('album', '🃏', 'الألبوم')}${item('syllabus', '📚', 'المنهج')}${item('help', '❓', 'كيف ألعب')}</nav>`;
}

function boardHud() {
  const m = MOVES[S.step - 1];
  const free = !movePool(m.lv).length;
  const dest = BOARD[(S.pos + m.n) % BOARD.length];
  return `${topHud(`<button class="round" data-act="map" title="الخريطة">🗺️</button><button class="round${overview ? ' on' : ''}" data-act="view" title="عرض اللوح كاملاً">🔍</button>`)}
<div class="msg">${S.msg || 'اختر عدد الخطوات ثمّ اضغط «انطلق!». الإجابة الصحيحة تحرّكك.'}</div>
<div class="go-area">
  <div class="steps">${MOVES.map(x => `<button class="step lv${x.lv}${S.step === x.n ? ' on' : ''}" data-step="${x.n}"><b>${x.n}</b><small>${x.q}</small></button>`).join('')}</div>
  <button class="go-btn" id="go"><span class="go-t">انطلق!</span><span class="go-s">${m.label} · ${free ? 'بلا سؤال الآن' : `${m.q} · +${m.reward} 🪙`}</span></button>
  <div class="dest">تصل إلى: <b>${tileName(dest)}</b></div>
</div>
${dock('board')}`;
}

function lmCard(lm) {
  const st = S.marks[lm.id] || 0;
  const r = st < 3 ? stageReq(lm, st + 1) : null;
  let tag = '<span class="tag ok">✓ مكتمل</span>';
  if (r) tag = r.ok ? `<span class="tag${S.coins >= STAGE_COST[st] ? ' can' : ''}">🔨 ${fmtN(STAGE_COST[st])} 🪙</span>` : r.frac < r.need - 1e-9 ? `<span class="tag">🔒 ${Math.round(r.frac * 100)}%</span>` : !r.labs ? '<span class="tag">🔒 🧪 مختبر</span>' : `<span class="tag">🔒 📝 ${r.solved}/${r.exams}</span>`;
  return `<button class="lm-card${canBuild(lm) ? ' can' : ''}" data-lm="${lm.id}" style="--c:${lm.color}"><b>${lm.name}</b><span class="stars">${stars(st)}</span><span class="bar"><i style="width:${Math.round(lmFrac(lm) * 100)}%"></i></span>${tag}</button>`;
}
function cityHud() {
  return `${topHud('<button class="round" data-act="board" title="اللوح">♟️</button><button class="round" data-act="map" title="الخريطة">🗺️</button>')}
<div class="banner">ابنِ!</div>
<div class="sub">${UNIT.city} — كلّ معلم يُبنى بالنقود <u>و</u>إتقان أقسامه من الكتاب</div>
<div class="lm-cards">${LANDMARKS.map(lmCard).join('')}</div>
${dock('city')}`;
}
function mapHud() {
  const m = masteredCount();
  return `${topHud('')}
<div class="banner">استكشف!</div>
<div class="sub">كلّ جزيرة وحدة من كتاب الكيمياء — الصف العاشر العلمي</div>
<div class="map-card"><b>🏙️ ${UNIT.city}</b><span>${UNIT.no}: ${UNIT.title} · الكتاب ص ${UNIT.pages}</span><span class="bar"><i style="width:${(m / POINTS.length) * 100}%"></i></span><span>${m}/${POINTS.length} فكرة</span><button class="btn go big" data-go>${S.turn ? 'تابع اللعب' : 'ابدأ'} ←</button></div>
<nav class="dock">${['album', 'syllabus', 'help', 'reset'].map(a => `<button class="dk" data-act="${a}"><span>${{ album: '🃏', syllabus: '📚', help: '❓', reset: '↺' }[a]}</span><small>${{ album: 'الألبوم', syllabus: 'المنهج', help: 'كيف ألعب', reset: 'من جديد' }[a]}</small></button>`).join('')}</nav>`;
}

function render() {
  if (S.screen === 'board') {
    W.show(scenes.board);
    W.setOverview(overview);
    app.innerHTML = boardHud();
    W.highlight(busy ? null : (S.pos + S.step) % BOARD.length);
  } else if (S.screen === 'city') {
    W.show(scenes.city);
    app.innerHTML = cityHud();
  } else {
    scenes.map = W.buildMap(UNITS, LANDMARKS, S.marks);
    W.show(scenes.map);
    app.innerHTML = mapHud();
  }
  app.dataset.screen = S.screen;
  if (DEV) app.insertAdjacentHTML('beforeend', devPanel());
  bind();
}
function refresh() {
  syncTiles();
  if (S.screen !== 'map') render();
}

function bind() {
  app.querySelectorAll('[data-act]').forEach(b => b.onclick = () => act(b.dataset.act));
  app.querySelectorAll('[data-step]').forEach(b => b.onclick = () => { if (busy) return; S.step = +b.dataset.step; save(); render(); });
  app.querySelector('#go')?.addEventListener('click', onGo);
  app.querySelectorAll('[data-lm]').forEach(b => b.onclick = () => openLandmark(b.dataset.lm));
  app.querySelector('[data-go]')?.addEventListener('click', enterBoard);
  if (DEV) bindDev();
}
function goScreen(s) {
  if (busy) return;
  S.screen = s;
  save();
  render();
}
function act(a) {
  if (a === 'map' || a === 'board' || a === 'city') return goScreen(a);
  if (a === 'view') { overview = !overview; render(); return; }
  if (a === 'album') return openAlbum();
  if (a === 'syllabus') return openSyllabus();
  if (a === 'help') return modal(`${HELP}<div class="m-foot"><button class="btn" data-close>إغلاق</button></div>`, { dismissable: true, cls: 'wide' });
  if (a === 'reset') {
    modal('<h2>ابدأ من جديد؟</h2><p>سيُمسح كلّ تقدّمك في هذه الوحدة على هذا الجهاز.</p><div class="m-foot"><button class="btn danger" data-yes>نعم، امسح</button><button class="btn" data-close>إلغاء</button></div>', {
      dismissable: true,
      cls: 'narrow',
      onOpen: (el, close) => el.querySelector('[data-yes]').onclick = () => { S = fresh(); save(); close(); buildScenes(); render(); },
    });
  }
}
async function enterBoard() {
  goScreen('board');
  if (!S.intro) {
    S.intro = true;
    save();
    await info(`<div class="m-ribbon">${UNIT.city}</div><p><b>${UNIT.no}: ${UNIT.title}</b> — الكتاب ص ${UNIT.pages}</p><h3>الأهداف العامة للوحدة:</h3><ul class="list">${UNIT.goals.map(g => `<li>${g}</li>`).join('')}</ul>${HELP}`, { cls: 'wide', btn: 'لنبدأ!' });
  }
}
function onPick(u) {
  if (busy || document.querySelector('.overlay')) return;
  if (u.kind === 'tile') openTile(u.i);
  if (u.kind === 'lm') openLandmark(u.id);
  if (u.kind === 'unit' && u.i === 0) enterBoard();
}

function openTile(i) {
  const t = BOARD[i];
  if (t.type === 'prop') {
    const s = SET[t.set];
    modal(`<div class="t-top" style="--set:${s.color}"><span class="t-set">${s.no} · ${s.title}</span></div><h2>${t.name}</h2>
<ul class="tile-pts">${tilePoints(t.id).map(p => `<li class="${mastered(p.id) ? 'on' : ''}"><span>${mastered(p.id) ? '🏠' : '⬜'}</span>${p.title}<em>ص ${p.page}</em></li>`).join('')}</ul>
<p class="muted">قف هنا لتتعلّم الأفكار التي لم تُتقنها بعد. بعد إتقانها كلّها تحصل على إيراد كلّما وقفت عليها.</p>
<div class="m-foot"><button class="btn" data-close>إغلاق</button></div>`, { dismissable: true, cls: 'narrow' });
    return;
  }
  const g = t.game && GAMES[t.game];
  const body = g
    ? `<p>${fmt(g.intro)}</p><p class="muted">من الكتاب: ص ${g.page} · كلّ إجابة صحيحة +${R.game} 🪙 · النجاح ${Math.round(PASS * 100)}% يعطي بطاقة.</p>${g.pre.every(mastered) ? '<p class="ok">✓ مفتوح</p>' : `<p>يُفتح بعد تعلّم: ${[...new Set(g.pre.filter(id => !mastered(id)).map(id => `«${TILE[PT[id].tile].name}»`))].join('، ')}</p>`}`
    : `<p>${SPECIAL[t.type].about}</p>`;
  modal(`<h2>${g ? g.icon : SPECIAL[t.type].icon} ${g ? g.name : SPECIAL[t.type].name}</h2>${body}<div class="m-foot"><button class="btn" data-close>إغلاق</button></div>`, { dismissable: true, cls: 'narrow' });
}

const UNITS = [
  { no: 'الوحدة الأولى', t: UNIT.title, city: UNIT.city, icon: '🧊', pages: '5–30', open: true },
  { no: 'الوحدة الثانية', t: 'المدارات الذرّية والجدول الدوري', city: 'مدينة الذرّة', icon: '⚛️', pages: '31–72' },
  { no: 'الوحدة الثالثة', t: 'الجزيئات والروابط الكيميائية', city: 'مدينة الروابط', icon: '🔗', pages: '73–112' },
  { no: 'الوحدة الرابعة', t: 'كيمياء العناصر', city: 'مدينة العناصر', icon: '🏭', pages: '113–156' },
];


// ── dev helpers (?dev) ──
function devPanel() {
  return `<details class="dev"><summary>dev</summary><button data-dev="coins">+1000 🪙</button><button data-dev="half">أتقن النصف</button><button data-dev="all">أتقن الكلّ</button><button data-dev="labs">انجح بالمختبرات</button><button data-dev="exams">حلّ الامتحان</button><select data-dev="pos">${BOARD.map((t, i) => `<option value="${i}" ${i === S.pos ? 'selected' : ''}>${i} ${tileName(t)}</option>`).join('')}</select></details>`;
}
function bindDev() {
  const d = app.querySelector('.dev');
  d.querySelectorAll('button').forEach(b => b.onclick = () => {
    const k = b.dataset.dev;
    if (k === 'coins') S.coins += 1000;
    if (k === 'half') POINTS.slice(0, Math.ceil(POINTS.length / 2)).forEach(p => { ps(p.id).m = true; });
    if (k === 'all') POINTS.forEach(p => { ps(p.id).m = true; });
    if (k === 'labs') Object.keys(GAMES).forEach(g => { S.games[g] = { done: true, best: 0, plays: 1 }; });
    if (k === 'exams') EXAMS.forEach(x => { S.exams[x.id] = true; });
    save();
    refresh();
  });
  d.querySelector('select').onchange = e => { S.pos = +e.target.value; W.placeToken(S.pos); save(); render(); };
}

function buildScenes() {
  scenes.board = W.buildBoard(BOARD.map(tileData), S.pos);
  scenes.city = W.buildCity(LANDMARKS, S.marks);
}

async function start() {
  const fonts = Promise.all([document.fonts.load('800 40px "Baloo Bhaijaan 2"'), document.fonts.load('40px "Lalezar"')]);
  await Promise.race([fonts.catch(() => {}), sleep(3000)]);
  W.initWorld(document.getElementById('scene'), onPick);
  buildScenes();
  render();
  document.body.classList.add('ready');
}
start();
