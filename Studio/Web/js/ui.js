import { tr, lang } from './lab-locale.js';
// Interface: notebook panel, questions, chart, menu, report, toasts.
import { fmt } from './chem.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const DEV = new URLSearchParams(location.search).has('dev');

const P = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
export const ICON = {
  flask: `<svg viewBox="0 0 24 24" ${P}><path d="M9 3h6M10 3v6.2L4.6 18.4A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.6L14 9.2V3"/><path d="M7.2 15h9.6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" ${P}><path d="M5 12.5l4.2 4.2L19 7"/></svg>`,
  bulb: `<svg viewBox="0 0 24 24" ${P}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg>`,
  vol: `<svg viewBox="0 0 24 24" ${P}><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>`,
  mute: `<svg viewBox="0 0 24 24" ${P}><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>`,
  view: `<svg viewBox="0 0 24 24" ${P}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  list: `<svg viewBox="0 0 24 24" ${P}><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>`,
  speed: `<svg viewBox="0 0 24 24" ${P}><path d="M12 14l4-4"/><path d="M3.5 17a9 9 0 1 1 17 0"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" ${P}><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5v.5"/></svg>`,
  goggles: `<svg viewBox="0 0 24 24" ${P}><path d="M2 10.5c0-1.4 1.1-2.5 2.5-2.5h15c1.4 0 2.5 1.1 2.5 2.5v2.2c0 2-1.6 3.6-3.6 3.6-1.3 0-2.4-.7-3-1.8l-.6-1.1a1 1 0 0 0-1.7 0l-.6 1.1c-.6 1.1-1.7 1.8-3 1.8C3.6 16.3 2 14.7 2 12.7z"/></svg>`,
  glove: `<svg viewBox="0 0 24 24" ${P}><path d="M7 21v-4.5L4.2 12a1.6 1.6 0 0 1 2.7-1.7L8 12V5.5a1.5 1.5 0 0 1 3 0V11V4a1.5 1.5 0 0 1 3 0v7V5.5a1.5 1.5 0 0 1 3 0V14c0 2.7-1.2 4.4-2 5.2V21"/></svg>`,
  next: `<svg viewBox="0 0 24 24" ${P}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`,
  back: `<svg viewBox="0 0 24 24" ${P}><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  x: `<svg viewBox="0 0 24 24" ${P}><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  book: `<svg viewBox="0 0 24 24" ${P}><path d="M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2z"/><path d="M12 6.5v14"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" ${P}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
  print: `<svg viewBox="0 0 24 24" ${P}><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><path d="M7 14h10v7H7z"/></svg>`,
  redo: `<svg viewBox="0 0 24 24" ${P}><path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5"/><path d="M20 3.5v5h-5"/></svg>`,
  chev: `<svg viewBox="0 0 24 24" ${P}><path d="M6 9l6 6 6-6"/></svg>`,
};

// ── toasts ──
export function toast(html, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = (kind === 'warn' ? ICON.alert : kind === 'ok' ? ICON.check : '') + `<span>${fmt(html)}</span>`;
  $('#toasts').append(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, kind === 'warn' ? 5200 : 3400);
}

// ── top bar ──
export function bar({ exp = null, ppe = {}, muted = false } = {}) {
  $('#bar').innerHTML = tr(`
    <a class="brand" href="./products/the-curriculam/?lang=${lang}" aria-label="${lang === 'ar' ? 'المنهاج' : 'The Curriculam'}">
      <img class="studio-mark" src="assets/mark.svg" alt="" width="32" height="32">
      <div><b>${lang === 'ar' ? 'المنهاج' : 'The Curriculam'}</b><small>مختبر الكيمياء · ${lang === 'ar' ? 'الصف العاشر' : 'Grade 10'}</small></div>
    </a>
    <div class="crumb"><a class="grade-parent ghost" href="./products/the-curriculam/grade-10/?lang=${lang}">${lang === 'ar' ? 'الصف العاشر' : 'Grade 10'}</a><span class="sep">/</span><button class="ghost" data-act="menu" aria-label="${lang === 'ar' ? 'تجارب مختبر الكيمياء' : 'Chemistry lab experiments'}">${ICON.list}<span>مختبر الكيمياء</span></button>${exp ? `<span class="sep">/</span><span>${esc(exp.title)}</span>` : ''}</div>
    <div class="tools">
      <a class="lab-language" href="lab.html?lang=${lang === 'ar' ? 'en' : 'ar'}${exp ? `&experiment=${exp.id}` : ''}" lang="${lang === 'ar' ? 'en' : 'ar'}" title="${lang === 'ar' ? 'Switch to English (restarts the current experiment)' : 'Switch to Arabic (restarts the current experiment)'}">${lang === 'ar' ? 'English' : 'العربية'}</a>
      <span class="ppe ${ppe.goggles ? 'on' : ''}" title="النظارة الواقية">${ICON.goggles}</span>
      <span class="ppe ${ppe.gloves ? 'on' : ''}" title="القفازات">${ICON.glove}</span>
      <button class="icon" data-act="sound" title="الصوت">${muted ? ICON.mute : ICON.vol}</button>
    </div>`);
}

// ── notebook panel ──
export function openPanel(exp) {
  const el = $('#panel');
  el.hidden = false;
  el.innerHTML = tr(`
    <div class="p-head">
      <div class="eyebrow"><span class="sec">${esc(exp.section)}</span><span>${esc(exp.title)}</span><span class="pg">${ICON.book} ص ${esc(exp.page)}</span></div>
      <h2>${esc(exp.subtitle)}</h2>
      <div class="prog"><i style="width:0%"></i></div>
      <button class="sheet-toggle" data-act="sheet" aria-label="عرض الدفتر">${ICON.chev}</button>
    </div>
    <div class="p-body">
      <section class="task" id="task"></section>
      <section class="data" id="data" hidden></section>
      <details class="blk" open>
        <summary>الخطوات <small>${ICON.book} ${lang === 'ar' ? '= نصّ الكتاب' : '= textbook translation'}</small></summary>
        <ol class="steps">${exp.steps.map(s => (typeof s === 'string' ? { t: s, book: true } : s)).map((s, i) => `<li data-i="${i}" class="${s.book ? 'bk' : ''}"><span class="n">${i + 1}</span><span class="t">${fmt(s.t)}</span></li>`).join('')}</ol>
      </details>
      <details class="blk">
        <summary>أدوات التجربة</summary>
        <div class="chips">${exp.tools.map(t => `<span>${fmt(t)}</span>`).join('')}</div>
      </details>
      <details class="blk" open id="logblk" hidden>
        <summary>ملاحظاتي <small id="logn"></small></summary>
        <ul class="log" id="log"></ul>
      </details>
    </div>`);
  return el;
}
export function closePanel() { const el = $('#panel'); el.hidden = true; el.innerHTML = ''; }

export function setStep(i, total) {
  $$('#panel .steps li').forEach(li => {
    const k = +li.dataset.i;
    li.classList.toggle('done', k < i);
    li.classList.toggle('now', k === i);
  });
  const bar = $('#panel .prog i');
  if (bar) bar.style.width = `${Math.round((i / total) * 100)}%`;
}
export function finishSteps() {
  $$('#panel .steps li').forEach(li => { li.classList.add('done'); li.classList.remove('now'); });
  const bar = $('#panel .prog i');
  if (bar) bar.style.width = '100%';
}

export function log(html) {
  const blk = $('#logblk');
  if (!blk) return;
  blk.hidden = false;
  const li = document.createElement('li');
  li.innerHTML = fmt(html);
  $('#log').append(li);
  $('#logn').textContent = $$('#log li').length;
}

const task = () => $('#task');

export function doCard({ kicker, text, hint = true }) {
  task().className = 'task do';
  task().innerHTML = `<span class="kicker">${esc(kicker)}</span><p>${fmt(text)}</p>${hint ? tr(`<button class="ghost sm" data-act="hint">${ICON.bulb}<span>تلميح</span></button>`) : ''}`;
  pulse();
}
export function watchCard({ kicker = tr('لاحظ'), text, live = '' }) {
  task().className = 'task watch';
  task().innerHTML = `<span class="kicker"><i class="dot"></i>${esc(kicker)}</span><p>${fmt(text)}</p>${live ? `<div class="live">${live}</div>` : ''}`;
}
export function setLive(html) { const l = $('#task .live'); if (l) l.innerHTML = html; }
function pulse() { const t = task(); t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse'); }

// Book quote card; resolves when the student continues.
export function bookCard({ title = tr('من الكتاب'), page, html, kind = 'book', cta = tr('متابعة') }) {
  return new Promise(res => {
    task().className = `task note ${kind}`;
    task().innerHTML = `
      <blockquote class="book"><span class="src">${ICON.book}${esc(title)}${page ? tr(` · ص ${esc(page)}`) : ''}${lang === 'en' ? ' · English translation' : ''}</span>${fmt(html)}</blockquote>
      <button class="btn primary" data-next>${esc(cta)} ${ICON.next}</button>`;
    pulse();
    $('[data-next]', task()).onclick = () => res();
  });
}

// Question card. Returns a promise of { first: boolean } once answered correctly.
export function askCard(q, { onWrong, onRight } = {}) {
  return new Promise(res => {
    const multi = Array.isArray(q.right);
    const right = new Set([].concat(q.right));
    const order = q.keep ? q.opts.map((_, i) => i) : shuffle(q.opts.map((_, i) => i));
    task().className = 'task ask';
    task().innerHTML = tr(`
      <span class="kicker">${esc(q.kicker || (multi ? 'سؤال · اختر كلّ الإجابات الصحيحة' : 'سؤال'))}</span>
      <p class="q">${fmt(q.q)}</p>
      <div class="opts ${multi ? 'multi' : ''}">${order.map(i => `<button class="opt" data-i="${i}" ${DEV && right.has(i) ? 'data-right' : ''}><span class="box"></span><span>${fmt(q.opts[i])}</span></button>`).join('')}</div>
      ${multi ? `<button class="btn primary" data-check disabled>تحقّق</button>` : ''}
      <div class="fb" hidden></div>
      <button class="btn primary" data-next hidden>متابعة ${ICON.next}</button>`);
    pulse();
    const T = task();
    let first = true, solved = false;
    const fb = $('.fb', T), next = $('[data-next]', T);
    const show = (html, kind) => { fb.hidden = false; fb.className = 'fb ' + kind; fb.innerHTML = fmt(html); };
    const win = () => {
      solved = true;
      $$('.opt', T).forEach(b => { b.disabled = true; if (right.has(+b.dataset.i)) b.classList.add('right'); });
      show((first ? tr('<b>صحيح.</b> ') : tr('<b>أحسنت.</b> ')) + (q.why || ''), 'good');
      $('[data-check]', T)?.remove();
      next.hidden = false;
      onRight?.(first);
      next.onclick = () => res({ first });
      if (DEV) next.dataset.dev = '1';
    };
    if (!multi) {
      $$('.opt', T).forEach(b => b.onclick = () => {
        if (solved) return;
        const i = +b.dataset.i;
        if (right.has(i)) return win();
        first = false;
        b.classList.add('wrong');
        b.disabled = true;
        show(q.fb?.[i] || q.hint || tr('ليست هذه الإجابة. راجع ما لاحظته وحاول مجدداً.'), 'bad');
        onWrong?.();
      });
    } else {
      const chk = $('[data-check]', T);
      $$('.opt', T).forEach(b => b.onclick = () => {
        if (solved) return;
        b.classList.toggle('sel');
        b.classList.remove('wrong', 'miss');
        chk.disabled = !$$('.opt.sel', T).length;
      });
      chk.onclick = () => {
        const sel = new Set($$('.opt.sel', T).map(b => +b.dataset.i));
        const ok = sel.size === right.size && [...sel].every(i => right.has(i));
        if (ok) return win();
        first = false;
        const extra = [...sel].filter(i => !right.has(i)).length;
        const missing = [...right].filter(i => !sel.has(i)).length;
        $$('.opt.sel', T).forEach(b => { if (!right.has(+b.dataset.i)) b.classList.add('wrong'); });
        show(extra && missing ? tr('بعض اختياراتك غير صحيحة، وفاتك بعض الإجابات.') : extra ? tr('بعض اختياراتك غير صحيحة.') : tr(`فاتك ${missing === 1 ? 'اختيار صحيح' : 'بعض الاختيارات الصحيحة'}.`), 'bad');
        onWrong?.();
      };
    }
  });
}

export function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

// ── live chart (SVG) ──
export function chart({ title, x = tr('الزمن (s)'), y = 't (°C)', yMin, yMax, yStep, xMax = 60, color = '#2dd4bf' }) {
  const el = $('#data');
  el.hidden = false;
  const W = 340, H = 190, L = 40, R = 10, T = 14, B = 30;
  el.innerHTML = `<div class="d-head"><b>${esc(title)}</b><span class="d-val" id="dval"></span></div><svg viewBox="0 0 ${W} ${H}" class="chart" dir="ltr"></svg>`;
  const svg = $('svg', el);
  const pts = [];
  const tags = [];
  let xm = xMax;
  const sx = v => L + (v / xm) * (W - L - R);
  const sy = v => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
  const draw = () => {
    let g = '';
    for (let v = yMin; v <= yMax + 1e-6; v += yStep) {
      g += `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" class="grid ${v === 0 ? 'zero' : ''}"/><text x="${L - 6}" y="${sy(v) + 4}" class="tick" text-anchor="end">${v}</text>`;
    }
    const xs = niceStep(xm);
    for (let v = 0; v <= xm + 1e-6; v += xs) g += `<text x="${sx(v)}" y="${H - B + 16}" class="tick" text-anchor="middle">${Math.round(v)}</text>`;
    g += `<text x="${W - R}" y="${H - 4}" class="axis" text-anchor="end">${esc(x)}</text><text x="${L - 34}" y="${T - 3}" class="axis">${esc(y)}</text>`;
    for (const t of tags) {
      g += `<rect x="${sx(t.x0)}" y="${sy(t.y) - 15}" width="${Math.max(2, sx(t.x1) - sx(t.x0))}" height="30" class="band ${t.cls || ''}"/>`;
      if (t.text) g += `<text x="${(sx(t.x0) + sx(t.x1)) / 2}" y="${sy(t.y) - 20}" class="tag" text-anchor="middle" direction="rtl">${esc(t.text)}</text>`;
    }
    if (pts.length > 1) g += `<polyline points="${pts.map(([a, b]) => `${sx(a).toFixed(1)},${sy(b).toFixed(1)}`).join(' ')}" class="line" style="stroke:${color}"/>`;
    if (pts.length) { const [a, b] = pts.at(-1); g += `<circle cx="${sx(a)}" cy="${sy(b)}" r="3.5" class="head" style="fill:${color}"/>`; }
    svg.innerHTML = g;
  };
  let last = 0;
  draw();
  return {
    push(a, b, force = false) {
      pts.push([a, b]);
      if (a > xm * 0.96) { xm = Math.ceil((a * 1.35) / 10) * 10; force = true; }
      const now = performance.now();
      if (force || now - last > 120) { last = now; draw(); }
    },
    val(html) { const v = $('#dval'); if (v) v.innerHTML = html; },
    tag(x0, x1, yv, text, cls) { tags.push({ x0, x1, y: yv, text, cls }); draw(); },
    retag(i, text) { if (tags[i]) { tags[i].text = text; tags[i].cls = 'named'; draw(); } },
    svg: () => svg.outerHTML,
    points: pts,
    redraw: draw,
  };
}
function niceStep(m) { for (const s of [5, 10, 20, 30, 60, 120, 300, 600]) if (m / s <= 6) return s; return 1200; }

// ── dock: simulation speed, view, hint ──
export function dock({ speed = null, view = true, extra = '' } = {}) {
  const el = $('#dock');
  el.hidden = false;
  el.innerHTML = `
    ${speed !== null ? tr(`<div class="seg" role="group" aria-label="سرعة المحاكاة">${ICON.speed}${[1, 4, 10].map(s => `<button data-speed="${s}" class="${s === speed ? 'on' : ''}">×${s}</button>`).join('')}</div>`) : ''}
    ${extra}
    ${view ? tr(`<button class="icon" data-act="view" title="إعادة ضبط المنظر">${ICON.view}</button>`) : ''}`;
}
export function hideDock() { $('#dock').hidden = true; }

// ── menu ──
export function menu(exps, results) {
  const done = exps.filter(e => results[e.id]).length;
  $('#screen').innerHTML = tr(`
    <div class="menu">
      <div class="m-intro">
        <span class="eyebrow">الوحدة الأولى · المادة وتحوّلاتها</span>
        <h1>مختبر الكيمياء الافتراضي</h1>
        <p>نفّذ تجارب الكتاب بنفسك خطوةً خطوة: جهّز الأدوات، راقب ما يحدث، سجّل ملاحظاتك، ثمّ استنتج. كلّ نصّ وسؤال مأخوذ من كتاب الكيمياء للصف العاشر العلمي.</p>
        <div class="m-stat"><b>${done}</b><span>من ${exps.length} تجارب مكتملة</span><div class="prog"><i style="width:${Math.round(done / exps.length * 100)}%"></i></div></div>
      </div>
      <ol class="m-list">
        ${exps.map((e, i) => {
          const r = results[e.id];
          return `<li><button class="m-item ${r ? 'done' : ''}" data-exp="${e.id}">
            <span class="num">${String(i + 1).padStart(2, '0')}</span>
            <span class="main"><span class="sec">${esc(e.section)} · ص ${esc(e.page)}</span><b>${esc(e.subtitle)}</b><small>${esc(e.title)} · ${esc(e.tag)}</small></span>
            <span class="score">${r ? `<b>${r.best}%</b><small>أفضل نتيجة</small>` : `<span class="go">ابدأ ${ICON.next}</span>`}</span>
          </button></li>`;
        }).join('')}
      </ol>
    </div>`);
}
export function clearScreen() { $('#screen').innerHTML = ''; }

// ── report ──
export function report(exp, R, { chartSvg = '', hasNext = true } = {}) {
  const grade = R.score >= 90 ? tr('ممتاز') : R.score >= 75 ? tr('جيّد جداً') : R.score >= 60 ? tr('جيّد') : tr('تحتاج إلى مراجعة');
  $('#screen').innerHTML = tr(`
    <div class="report-wrap">
      <article class="report">
        <header>
          <span class="eyebrow">تقرير التجربة · ${esc(exp.section)} ${esc(exp.title)} · ص ${esc(exp.page)}</span>
          <h1>${esc(exp.subtitle)}</h1>
          <div class="score-row">
            <div class="big"><b>${R.score}</b><span>%</span><small>${grade}</small></div>
            <dl>
              <div><dt>الأسئلة</dt><dd>${R.qRight} / ${R.qTotal} <small>من المحاولة الأولى</small></dd></div>
              <div><dt>الخطوات العملية</dt><dd>${R.picks} خطوة · ${R.mistakes} ${R.mistakes === 1 ? 'خطأ' : 'أخطاء'}</dd></div>
              <div><dt>السلامة</dt><dd class="${R.safety ? 'bad' : 'good'}">${R.safety ? `${R.safety} ${R.safety === 1 ? 'مخالفة' : 'مخالفات'}` : 'لا مخالفات'}</dd></div>
              <div><dt>التلميحات</dt><dd>${R.hints}</dd></div>
            </dl>
          </div>
        </header>
        ${chartSvg ? `<section><h3>البيانات</h3><div class="r-chart">${chartSvg}</div></section>` : ''}
        <section><h3>الملاحظات</h3><ul class="r-list">${R.log.map(l => `<li>${fmt(l)}</li>`).join('')}</ul></section>
        <section><h3>الاستنتاج <small>${lang === 'ar' ? 'من الكتاب' : 'English translation of the textbook'}</small></h3>${exp.result.map(r => `<blockquote class="book">${fmt(r)}</blockquote>`).join('')}</section>
        ${R.safetyNotes.length ? `<section><h3>ملاحظات السلامة</h3><ul class="r-list warn">${R.safetyNotes.map(l => `<li>${fmt(l)}</li>`).join('')}</ul></section>` : ''}
        <footer>
          <button class="btn" data-act="menu">${ICON.list} التجارب</button>
          <button class="btn" data-act="print">${ICON.print} طباعة</button>
          <button class="btn" data-act="redo">${ICON.redo} أعد التجربة</button>
          ${hasNext ? `<button class="btn primary" data-act="next">التجربة التالية ${ICON.next}</button>` : ''}
        </footer>
      </article>
    </div>`);
}
