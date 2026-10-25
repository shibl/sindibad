// Lab minigames. Each run resolves to { score, total }.
import { fmt, ce, bare } from './chem.js';
import { modal, shuffle, sleep } from './ui.js';
import { REDOX } from './content-u1.js';

// ?dev marks the right answer with data-right so automated play-throughs can drive the labs.
const DEV = new URLSearchParams(location.search).has('dev');
const mark = (els, pred) => { if (DEV) els.forEach((e, j) => e.toggleAttribute('data-right', pred(e, j))); };

export function runMinigame(id, g) {
  if (g.kind === 'sorter') return sorter(g);
  if (g.kind === 'transitions') return transitions(g);
  if (g.kind === 'curve') return curve(g);
  if (g.kind === 'redox') return redox(g);
  return Promise.resolve({ score: 0, total: 0 });
}

function head(g, extra = '') {
  return `<div class="mg-head"><span class="mg-icon">${g.icon}</span><div><h2>${g.name}</h2><span class="mg-src">من الكتاب: ص ${g.page}</span></div><span class="mg-prog">${extra}</span></div>
<p class="mg-intro">${fmt(g.intro)}</p>`;
}

function summary(el, g, score, total, misses, res, close) {
  const pct = total ? Math.round((score / total) * 100) : 0;
  el.innerHTML = `<div class="mg-head"><span class="mg-icon">${g.icon}</span><div><h2>${g.name}</h2><span class="mg-src">انتهى المختبر</span></div></div>
<div class="mg-score"><b>${score}</b><span>من ${total}</span><div class="bar"><i style="width:${pct}%"></i></div></div>
<p class="mg-coins">+${score * 10} 🪙</p>
${misses.length ? `<div class="mg-miss"><h3>راجع هذه:</h3><ul>${misses.map(m => `<li><b>${fmt(m.t)}</b> — ${fmt(m.why)}</li>`).join('')}</ul></div>` : '<p class="mg-perfect">إجابات كاملة! 🎉</p>'}
<div class="m-foot"><button class="btn primary" data-done>إنهاء</button></div>`;
  el.querySelector('[data-done]').onclick = () => { close(); res({ score, total }); };
}

// ── Sorting game: one card at a time, tap the right bin ──
function sorter(g) {
  return new Promise(res => {
    const items = shuffle(g.items).slice(0, g.n || g.items.length);
    let i = 0;
    let score = 0;
    let locked = false;
    const misses = [];
    modal(`${head(g)}
<div class="sorter">
  <div class="s-card"></div>
  <div class="s-why" hidden></div>
  <div class="s-bins n${g.bins.length}">${g.bins.map((b, j) => `<button class="s-bin bin${j}" data-j="${j}">${b}</button>`).join('')}</div>
  <div class="m-foot" hidden><button class="btn primary" data-next>التالي</button></div>
</div>`, {
      cls: 'mg',
      onOpen: (el, close) => {
        const card = el.querySelector('.s-card');
        const why = el.querySelector('.s-why');
        const bins = [...el.querySelectorAll('.s-bin')];
        const foot = el.querySelector('.m-foot');
        const prog = el.querySelector('.mg-prog');
        const show = () => {
          locked = false;
          prog.textContent = `${i + 1} / ${items.length}`;
          card.className = 's-card';
          void card.offsetWidth;
          card.classList.add('pop');
          card.innerHTML = fmt(items[i].t);
          why.hidden = true;
          foot.hidden = true;
          bins.forEach(b => { b.classList.remove('good', 'bad'); b.disabled = false; });
          mark(bins, (_, j) => j === items[i].b);
        };
        const next = () => {
          i++;
          if (i >= items.length) summary(el, g, score, items.length, misses, res, close);
          else show();
        };
        bins.forEach(b => b.onclick = () => {
          if (locked) return;
          locked = true;
          bins.forEach(x => { x.disabled = true; });
          const it = items[i];
          const j = +b.dataset.j;
          if (j === it.b) {
            score++;
            b.classList.add('good');
            card.classList.add('good');
            why.innerHTML = `✓ ${fmt(it.why)}`;
            why.className = 's-why good';
            why.hidden = false;
            setTimeout(next, 1100);
          } else {
            b.classList.add('bad');
            bins[it.b].classList.add('good');
            card.classList.add('bad');
            why.innerHTML = `الإجابة: <b>${g.bins[it.b]}</b> — ${fmt(it.why)}`;
            why.className = 's-why bad';
            why.hidden = false;
            misses.push(it);
            foot.hidden = false;
            foot.querySelector('[data-next]').onclick = next;
          }
        });
        show();
      },
    });
  });
}

// ── Transitions map: name the 8 arrows, then pick the energy-gaining ones ──
const NODES = {
  plasma: { x: 320, y: 62, name: 'بلازما', c: '#c9f2c7' },
  gas: { x: 320, y: 212, name: 'غاز', c: '#fff1a8' },
  liquid: { x: 530, y: 372, name: 'سائل', c: '#bfe3ff' },
  solid: { x: 110, y: 372, name: 'صلب', c: '#ffd0e0' },
};
const EDGES = [
  { f: 'solid', t: 'liquid', n: 'انصهار', full: 'انصهار بالتسخين', heat: true },
  { f: 'liquid', t: 'solid', n: 'تجمّد', full: 'تجمد بالتبريد', heat: false },
  { f: 'liquid', t: 'gas', n: 'تبخّر', full: 'تبخر بالتسخين', heat: true },
  { f: 'gas', t: 'liquid', n: 'تميّع', full: 'تميع بالتبريد', heat: false },
  { f: 'solid', t: 'gas', n: 'تسامي', full: 'تسامي بالتسخين', heat: true },
  { f: 'gas', t: 'solid', n: 'تكاثف', full: 'تكاثف بالتبريد', heat: false },
  { f: 'gas', t: 'plasma', n: 'تأيين', full: 'تأيين', heat: true },
  { f: 'plasma', t: 'gas', n: 'إزالة الأيونات', full: 'إزالة الأيونات', heat: false },
];
const BW = 120;
const BH = 48;

function clip(c, d) {
  // point where a ray from box centre c along unit vector d leaves the box
  const tx = Math.abs(d.x) > 1e-6 ? BW / 2 / Math.abs(d.x) : Infinity;
  const ty = Math.abs(d.y) > 1e-6 ? BH / 2 / Math.abs(d.y) : Infinity;
  const t = Math.min(tx, ty) + 8;
  return { x: c.x + d.x * t, y: c.y + d.y * t };
}

function edgeGeom(e) {
  const A = NODES[e.f];
  const B = NODES[e.t];
  const len = Math.hypot(B.x - A.x, B.y - A.y);
  const d = { x: (B.x - A.x) / len, y: (B.y - A.y) / len };
  const n = { x: -d.y, y: d.x };
  const off = 13;
  const p1 = clip(A, d);
  const p2 = clip(B, { x: -d.x, y: -d.y });
  const s = { x: p1.x + n.x * off, y: p1.y + n.y * off };
  const t = { x: p2.x + n.x * off, y: p2.y + n.y * off };
  const m = { x: (s.x + t.x) / 2 + n.x * 30, y: (s.y + t.y) / 2 + n.y * 30 };
  return { s, t, m };
}

export function transitionsSVG(labels = EDGES.map(e => e.full), { colored = true } = {}) {
  const boxes = Object.entries(NODES).map(([k, v]) =>
    `<g><rect x="${v.x - BW / 2}" y="${v.y - BH / 2}" width="${BW}" height="${BH}" rx="12" fill="${v.c}" stroke="#334155" stroke-width="2"/><text x="${v.x}" y="${v.y + 7}" class="tn">${v.name}</text></g>`).join('');
  const edges = EDGES.map((e, i) => {
    const { s, t, m } = edgeGeom(e);
    const col = colored && labels[i] ? (e.heat ? '#ea580c' : '#2563eb') : '#64748b';
    return `<g class="edge" data-i="${i}">
<line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="${col}" stroke-width="3" marker-end="url(#ah${colored && labels[i] ? (e.heat ? 'h' : 'c') : 'n'})"/>
<line class="hit" x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="transparent" stroke-width="22"/>
<text x="${m.x}" y="${m.y + 5}" class="tl" fill="${col}">${labels[i] || '؟'}</text></g>`;
  }).join('');
  const mk = (id, c) => `<marker id="ah${id}" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`;
  return `<svg class="tsvg" viewBox="0 0 640 430" role="img" aria-label="مخطّط تحوّلات حالات المادة"><defs>${mk('h', '#ea580c')}${mk('c', '#2563eb')}${mk('n', '#64748b')}</defs>${edges}${boxes}</svg>`;
}

function transitions(g) {
  return new Promise(res => {
    const order = shuffle(EDGES.map((_, i) => i));
    const labels = EDGES.map(() => '');
    let k = 0;
    let score = 0;
    let tries = 0;
    const misses = [];
    modal(`${head(g)}<div class="tmap"><div class="t-stage"></div><p class="t-prompt"></p><div class="t-chips"></div><div class="m-foot" hidden><button class="btn primary" data-check>تحقّق</button></div></div>`, {
      cls: 'mg',
      onOpen: (el, close) => {
        const stage = el.querySelector('.t-stage');
        const prompt = el.querySelector('.t-prompt');
        const chips = el.querySelector('.t-chips');
        const foot = el.querySelector('.m-foot');
        const prog = el.querySelector('.mg-prog');
        const names = shuffle(EDGES.map(e => e.n));
        const draw = () => {
          stage.innerHTML = transitionsSVG(labels);
          const cur = order[k];
          if (cur !== undefined) stage.querySelector(`.edge[data-i="${cur}"]`)?.classList.add('active');
        };
        const ask = () => {
          if (k >= order.length) return phase2();
          prog.textContent = `${k + 1} / ${EDGES.length + 1}`;
          const e = EDGES[order[k]];
          tries = 0;
          draw();
          prompt.innerHTML = `ما اسم التحوّل من <b>${NODES[e.f].name}</b> إلى <b>${NODES[e.t].name}</b>؟ (السهم الوامض)`;
          mark([...chips.querySelectorAll('.chip')], c => c.dataset.n === e.n);
        };
        chips.innerHTML = names.map(n => `<button class="chip" data-n="${n}">${n}</button>`).join('');
        chips.querySelectorAll('.chip').forEach(c => c.onclick = () => {
          if (k >= order.length || c.disabled) return;
          const e = EDGES[order[k]];
          if (c.dataset.n === e.n) {
            if (tries === 0) score++;
            else misses.push({ t: `${NODES[e.f].name} ← ${NODES[e.t].name}`, why: e.full });
            labels[order[k]] = e.full;
            c.disabled = true;
            c.classList.add('used');
            k++;
            ask();
          } else {
            tries++;
            c.classList.remove('shake');
            void c.offsetWidth;
            c.classList.add('shake');
            prompt.innerHTML = `ليس «${c.dataset.n}». السهم من <b>${NODES[e.f].name}</b> إلى <b>${NODES[e.t].name}</b> — جرّب مجدّداً.`;
          }
        });
        const picked = new Set();
        const phase2 = () => {
          prog.textContent = `${EDGES.length + 1} / ${EDGES.length + 1}`;
          chips.innerHTML = '';
          stage.innerHTML = transitionsSVG(labels, { colored: false });
          prompt.innerHTML = 'أحدّدُ التحوّلات التي يتمّ فيها <b>اكتساب الطاقة</b>: اضغط على أسهمها، ثمّ «تحقّق».';
          stage.querySelectorAll('.edge').forEach(ed => ed.onclick = () => {
            const i = +ed.dataset.i;
            if (picked.has(i)) picked.delete(i); else picked.add(i);
            ed.classList.toggle('picked', picked.has(i));
          });
          mark([...stage.querySelectorAll('.edge')], ed => EDGES[+ed.dataset.i].heat);
          foot.hidden = false;
          foot.querySelector('[data-check]').onclick = () => {
            const want = EDGES.map((e, i) => e.heat ? i : -1).filter(i => i >= 0);
            const ok = want.length === picked.size && want.every(i => picked.has(i));
            if (ok) score++;
            else misses.push({ t: 'التحوّلات التي تكتسب فيها المادة طاقة', why: 'الانصهار والتبخّر والتسامي (بالتسخين) والتأيين.' });
            stage.innerHTML = transitionsSVG(labels);
            prompt.innerHTML = `${ok ? '✓ صحيح!' : 'الإجابة: الأسهم البرتقالية.'} <b>أستنتج: عندما تَكتسب دقائقُ المادة طاقةً تزداد حركتها الاهتزازية، وتضعف قوى الترابط بين دقائقها، فتنتقل المادة من حالة إلى أخرى.</b>`;
            foot.querySelector('[data-check]').textContent = 'متابعة';
            foot.querySelector('[data-check]').onclick = () => summary(el, g, score, EDGES.length + 1, misses, res, close);
          };
        };
        ask();
      },
    });
  });
}

// ── Heating curve: heat distilled water step by step and read the graph (أسئلة الوحدة — رابعاً) ──
const PTS = { a: [70, 270], b: [130, 228], c: [220, 228], d: [320, 88], e: [450, 88], f: [510, 46] };
const SEGS = {
  ab: { from: 'a', to: 'b', state: 'solid', col: '#e879a8', temp: '−30 → 0' },
  bc: { from: 'b', to: 'c', state: 'mix1', col: '#a78bfa', temp: '0' },
  cd: { from: 'c', to: 'd', state: 'liquid', col: '#3b82f6', temp: '0 → 100' },
  de: { from: 'd', to: 'e', state: 'mix2', col: '#f59e0b', temp: '100' },
  ef: { from: 'e', to: 'f', state: 'gas', col: '#ef4444', temp: '100 →' },
};
const CURVE_STEPS = [
  { seg: 'ab', q: 'سخّنّا الجليد. ما الحالة الفيزيائية للماء من a إلى b؟', a: ['صلبة', 'صلبة وسائلة معاً', 'سائلة', 'غازية'], why: 'قبلَ بلوغ الدَّرجة 0°C الماء حالته صلبة (جليد).' },
  { seg: 'bc', q: 'من b إلى c تبقى درجة الحرارة ثابتة عند {{0°C}}. ما حالة الماء؟', a: ['صلبة وسائلة معاً', 'صلبة', 'سائلة', 'سائلة وغازية معاً'], why: 'عند بلوغ الدرجة 0°C يبدأ بالانصهار ويكون في الحالتين الصلبة والسائلة.' },
  { seg: 'bc', q: 'ماذا تُدعى المرحلة من b إلى c؟', a: ['عتبة الانصهار', 'عتبة الغليان', 'درجة الغليان', 'التكاثف'], why: 'الطاقة الحرارية تُضعف الترابط بين الدقائق، وتُدعى هذه الفترة بعتبة الانصهار.' },
  { seg: 'cd', q: 'من c إلى d ترتفع درجة الحرارة من {{0°C}} إلى {{100°C}}. ما حالة الماء؟', a: ['سائلة', 'صلبة', 'غازية', 'صلبة وسائلة معاً'], why: 'تبدأ درجة حرارة الماء السائل بالارتفاع تدريجياً حتى الدرجة 100°C.' },
  { seg: 'de', q: 'من d إلى e تبقى درجة الحرارة ثابتة عند {{100°C}}. ما حالة الماء؟', a: ['سائلة وغازية معاً', 'غازية', 'سائلة', 'صلبة وسائلة معاً'], why: 'يبدأ الماء بالتحوّل إلى الحالة البخارية، وتبقى درجة الحرارة ثابتة حتى يتبخّر بكامله.' },
  { seg: 'de', q: 'ماذا تُدعى المرحلة من d إلى e، ولماذا تثبت درجة الحرارة؟', a: ['عتبة الغليان: الطاقة تحطّم الترابط بين الدقائق', 'عتبة الانصهار: الطاقة تُضعف الترابط', 'عتبة الغليان: الطاقة ترفع درجة الحرارة', 'درجة التجمّد: الماء يفقد طاقة'], why: 'إنَّ الطاقة الحرارية تعملُ على تحطيم الترابط بين دقائق المادة… تُدعى هذه الفترة بعتبة الغليان.' },
  { seg: 'ef', q: 'ما الحالة الفيزيائية للماء من e إلى f؟', a: ['غازية', 'سائلة', 'سائلة وغازية معاً', 'بلازما'], why: 'بعد أن يتبخّر الماء بكامله ترتفع درجة حرارة البخار.' },
  { q: 'ما قيمة درجة تجمّد الماء المقطّر؟', a: ['{{0°C}}', '{{100°C}}', '{{−30°C}}', '{{4°C}}'], why: 'المرحلة b–c عند 0°C.' },
  { q: 'ما قيمة درجة غليان الماء المقطّر تحت ضغط جوي نظامي؟', a: ['{{100°C}}', '{{0°C}}', '{{90°C}}', '{{120°C}}'], why: 'المرحلة d–e عند 100°C.' },
  { q: 'حدّد الحالة الفيزيائية للماء المقطّر التي تكون فيها قوى الترابط بين دقائقها كبيرة جداً:', a: ['الصلبة (من a إلى b)', 'السائلة (من c إلى d)', 'الغازية (من e إلى f)', 'من d إلى e'], why: 'دقائق الحالة الصلبة أشدّ ترابطاً.' },
  { q: 'حدّد الحالة الفيزيائية للماء المقطّر التي تكون درجة حرارتها مرتفعة:', a: ['الغازية (من e إلى f)', 'الصلبة (من a إلى b)', 'السائلة (من c إلى d)', 'من b إلى c'], why: 'من e إلى f: بخار فوق 100°C.' },
  { q: 'درجة انصهار الصوديوم {{98°C}} ودرجة غليانه {{883°C}}. ما حالته عند {{98°C}}؟', a: ['صلبة وسائلة معاً (عتبة الانصهار)', 'صلبة', 'سائلة', 'غازية'], why: 'عند درجة الانصهار تكون المادة في الحالتين الصلبة والسائلة.' },
  { q: 'وما حالة الصوديوم عند {{883°C}}؟', a: ['سائلة وغازية معاً (عتبة الغليان)', 'غازية', 'سائلة', 'صلبة'], why: 'عند درجة الغليان تكون المادة في الحالتين السائلة والغازية.' },
];

function segLen(s) {
  const [x1, y1] = PTS[s.from];
  const [x2, y2] = PTS[s.to];
  return Math.hypot(x2 - x1, y2 - y1);
}

function curveSVG(drawn) {
  const segs = Object.entries(SEGS).map(([k, s]) => {
    const [x1, y1] = PTS[s.from];
    const [x2, y2] = PTS[s.to];
    const L = segLen(s);
    return `<line class="seg seg-${k}${drawn.has(k) ? ' on' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s.col}" stroke-width="6" stroke-linecap="round" style="stroke-dasharray:${L};stroke-dashoffset:${drawn.has(k) ? 0 : L}"/>`;
  }).join('');
  const shown = new Set(['a']);
  drawn.forEach(k => { shown.add(SEGS[k].from); shown.add(SEGS[k].to); });
  const letters = [...shown].map(p => `<circle cx="${PTS[p][0]}" cy="${PTS[p][1]}" r="5" fill="#0f172a"/><text x="${PTS[p][0] - 4}" y="${PTS[p][1] - 12}" class="pl">${p}</text>`).join('');
  return `<svg class="csvg" viewBox="0 0 560 320" role="img" aria-label="منحنى تسخين الماء">
<line x1="60" y1="20" x2="60" y2="292" stroke="#334155" stroke-width="2"/><line x1="52" y1="292" x2="540" y2="292" stroke="#334155" stroke-width="2"/>
<line x1="60" y1="228" x2="540" y2="228" stroke="#94a3b8" stroke-dasharray="4 6"/><line x1="60" y1="88" x2="540" y2="88" stroke="#94a3b8" stroke-dasharray="4 6"/>
<text x="20" y="233" class="ax">0.0</text><text x="8" y="93" class="ax">100.0</text><text x="12" y="28" class="ax">t°C</text><text x="512" y="312" class="ax">t (s)</text>
${segs}${letters}</svg>`;
}

function curve(g) {
  return new Promise(res => {
    const drawn = new Set();
    let k = 0;
    let score = 0;
    const misses = [];
    modal(`${head(g)}<div class="curve"><div class="c-graph"></div><div class="c-side"><div class="c-temp">🌡️ <span>−30°C</span></div><div class="c-state"></div></div></div>
<div class="c-q"></div>`, {
      cls: 'mg',
      onOpen: (el, close) => {
        const graph = el.querySelector('.c-graph');
        const qbox = el.querySelector('.c-q');
        const temp = el.querySelector('.c-temp span');
        const stateBox = el.querySelector('.c-state');
        const prog = el.querySelector('.mg-prog');
        graph.innerHTML = curveSVG(drawn);
        const step = () => {
          if (k >= CURVE_STEPS.length) return summary(el, g, score, CURVE_STEPS.length, misses, res, close);
          prog.textContent = `${k + 1} / ${CURVE_STEPS.length}`;
          const s = CURVE_STEPS[k];
          if (s.seg && !drawn.has(s.seg)) {
            qbox.innerHTML = `<button class="btn heat">🔥 سخّن</button>`;
            qbox.querySelector('.heat').onclick = async () => {
              drawn.add(s.seg);
              const line = graph.querySelector(`.seg-${s.seg}`);
              line.classList.add('on');
              line.style.strokeDashoffset = 0;
              temp.textContent = `${SEGS[s.seg].temp}°C`;
              stateBox.innerHTML = particlesSVG(SEGS[s.seg].state);
              await sleep(700);
              graph.innerHTML = curveSVG(drawn);
              ask(s);
            };
          } else ask(s);
        };
        const ask = s => {
          const opts = shuffle(s.a.map((t, j) => ({ t, ok: j === 0 })));
          qbox.innerHTML = `<p class="q-text">${fmt(s.q)}</p><div class="opts">${opts.map((o, j) => `<button class="opt" data-j="${j}">${fmt(o.t)}</button>`).join('')}</div><div class="q-why" hidden></div><div class="m-foot" hidden><button class="btn primary">التالي</button></div>`;
          let done = false;
          mark([...qbox.querySelectorAll('.opt')], (_, j) => opts[j].ok);
          qbox.querySelectorAll('.opt').forEach(b => b.onclick = () => {
            if (done) return;
            done = true;
            const o = opts[+b.dataset.j];
            qbox.querySelectorAll('.opt').forEach((x, j) => { x.disabled = true; if (opts[j].ok) x.classList.add('correct'); });
            if (o.ok) score++;
            else { b.classList.add('wrong'); misses.push({ t: s.q, why: s.why }); }
            const w = qbox.querySelector('.q-why');
            w.innerHTML = fmt(s.why);
            w.hidden = false;
            const f = qbox.querySelector('.m-foot');
            f.hidden = false;
            f.querySelector('button').onclick = () => { k++; step(); };
          });
        };
        step();
      },
    });
  });
}

// ── Redox lab: tap the reducing agent, then the oxidising agent, then pick the oxidation half-equation ──
function redox(g) {
  return new Promise(res => {
    const rounds = REDOX;
    let r = 0;
    let stepN = 0;
    let score = 0;
    let miss = false;
    const misses = [];
    modal(`${head(g)}<div class="rx"><div class="rx-label"></div><div class="rx-eq"></div><p class="rx-prompt"></p><div class="rx-opts"></div><div class="m-foot" hidden><button class="btn primary">التالي</button></div></div>`, {
      cls: 'mg',
      onOpen: (el, close) => {
        const label = el.querySelector('.rx-label');
        const eq = el.querySelector('.rx-eq');
        const prompt = el.querySelector('.rx-prompt');
        const opts = el.querySelector('.rx-opts');
        const foot = el.querySelector('.m-foot');
        const prog = el.querySelector('.mg-prog');
        const total = rounds.length * 3;
        const credit = (what, why) => {
          if (!miss) score++;
          else misses.push({ t: `${rounds[r].label}: ${what}`, why });
          miss = false;
        };
        const round = () => {
          if (r >= rounds.length) return summary(el, g, score, total, misses, res, close);
          const x = rounds[r];
          stepN = 0;
          miss = false;
          prog.textContent = `${r + 1} / ${rounds.length}`;
          label.innerHTML = `${x.label} <span class="mg-src">ص ${x.page}</span>`;
          eq.innerHTML = `${x.lhs.map(s => `<button class="sp" data-s="${s}">${ce(s)}</button>`).join('<span class="op">+</span>')}<span class="arr">→</span>${x.rhs.map(s => `<span class="sp prod">${ce(s)}</span>`).join('<span class="op">+</span>')}`;
          eq.dir = 'ltr';
          opts.innerHTML = '';
          foot.hidden = true;
          prompt.innerHTML = '① اضغط على <b>العامل المُرجِع</b> (العنصر الذي يفقد الإلكترونات).';
          eq.querySelectorAll('button.sp').forEach(b => b.onclick = () => pick(b));
          mark([...eq.querySelectorAll('button.sp')], b => b.dataset.s === x.red);
        };
        const pick = b => {
          const x = rounds[r];
          const want = stepN === 0 ? x.red : stepN === 1 ? x.ox : null;
          if (!want || b.classList.contains('red') || b.classList.contains('ox')) return;
          if (b.dataset.s === want) {
            b.classList.add(stepN === 0 ? 'red' : 'ox');
            b.insertAdjacentHTML('beforeend', `<small>${stepN === 0 ? 'مُرجِع · يتأكسد' : 'مُؤكسِد · يُرجَع'}</small>`);
            credit(stepN === 0 ? 'العامل المُرجِع' : 'العامل المُؤكسِد', stepN === 0 ? `${bare(x.red)} يفقد الإلكترونات.` : `${bare(x.ox)} يكسب الإلكترونات.`);
            stepN++;
            mark([...eq.querySelectorAll('button.sp')], s => stepN === 1 && s.dataset.s === x.ox);
            if (stepN === 1) prompt.innerHTML = '② اضغط على <b>العامل المُؤكسِد</b> (العنصر الذي يكسب الإلكترونات).';
            else halfStep();
          } else {
            miss = true;
            b.classList.remove('shake');
            void b.offsetWidth;
            b.classList.add('shake');
            prompt.innerHTML += ' <span class="hint">ليس هذا — تذكّر: المُرجِع يفقد الإلكترونات فتزداد شحنته.</span>';
          }
        };
        const halfStep = () => {
          const x = rounds[r];
          prompt.innerHTML = '③ اختر <b>نصف معادلة الأكسدة</b> (فقدان إلكترونات):';
          const list = shuffle(x.half.map((h, j) => ({ h, ok: j === 0 })));
          opts.innerHTML = list.map((o, j) => `<button class="opt" data-j="${j}">${ce(o.h)}</button>`).join('');
          mark([...opts.querySelectorAll('.opt')], (_, j) => list[j].ok);
          opts.querySelectorAll('.opt').forEach(b => b.onclick = () => {
            const o = list[+b.dataset.j];
            if (b.disabled) return;
            if (o.ok) {
              opts.querySelectorAll('.opt').forEach(z => { z.disabled = true; });
              b.classList.add('correct');
              credit('نصف معادلة الأكسدة', ce(x.half[0]));
              prompt.innerHTML = `✓ ${ce(x.half[0])} <span class="small">(أكسدة)</span> — و ${ce(x.half[1])} <span class="small">(إرجاع)</span>`;
              eq.classList.add('flow');
              foot.hidden = false;
              foot.querySelector('button').onclick = () => { eq.classList.remove('flow'); r++; round(); };
            } else {
              miss = true;
              b.classList.add('wrong');
              b.disabled = true;
            }
          });
        };
        round();
      },
    });
  });
}

// Particle pictures used by teach cards and the curve lab.
export function particlesSVG(kind) {
  let seed = { solid: 1, liquid: 7, gas: 13, plasma: 29, mix1: 3, mix2: 5 }[kind] || 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const dots = [];
  if (kind === 'solid') {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) dots.push([28 + c * 21, 30 + r * 21, '#3b82f6']);
  } else if (kind === 'liquid') {
    for (let i = 0; i < 18; i++) dots.push([22 + (i % 6) * 22 + rnd() * 8, 52 + Math.floor(i / 6) * 19 + rnd() * 6, '#3b82f6']);
  } else if (kind === 'gas') {
    for (let i = 0; i < 9; i++) dots.push([18 + rnd() * 124, 16 + rnd() * 82, '#3b82f6']);
  } else if (kind === 'plasma') {
    for (let i = 0; i < 10; i++) dots.push([18 + rnd() * 124, 16 + rnd() * 82, i % 2 ? '#a855f7' : '#3b82f6', i % 2 ? '−' : '+']);
  } else if (kind === 'mix1') {
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) dots.push([28 + c * 21, 72 + r * 21, '#3b82f6']);
    for (let i = 0; i < 8; i++) dots.push([22 + i * 16 + rnd() * 5, 30 + rnd() * 18, '#60a5fa']);
  } else if (kind === 'mix2') {
    for (let i = 0; i < 10; i++) dots.push([22 + (i % 5) * 26 + rnd() * 8, 72 + Math.floor(i / 5) * 18 + rnd() * 5, '#3b82f6']);
    for (let i = 0; i < 5; i++) dots.push([18 + rnd() * 124, 12 + rnd() * 34, '#60a5fa']);
  }
  const body = dots.map(([x, y, c, s]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" fill="${c}"/>${s ? `<text x="${x.toFixed(1)}" y="${(y + 4.5).toFixed(1)}" class="pc">${s}</text>` : ''}`).join('');
  const frame = kind === 'liquid' || kind === 'mix1' || kind === 'mix2'
    ? '<path d="M10 30 V108 H150 V30" fill="none" stroke="#94a3b8" stroke-width="3"/>'
    : '<rect x="4" y="4" width="152" height="106" rx="12" fill="none" stroke="#cbd5e1" stroke-width="2"/>';
  return `<svg class="psvg" viewBox="0 0 160 114" aria-hidden="true">${frame}${body}</svg>`;
}
