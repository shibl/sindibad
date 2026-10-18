// Question steps any island can use, after «أتعلّم» has taught the idea
// (core/learn/explore.js). Each draws into `host` and resolves with
// { ok, total }: total is 1 per step, ok the share of its parts right on the
// first try (so a slip in a five-line step costs a fifth, not the lot).
//
//   choice   q, options (options[0] is right), pic?
//   twoway   q, lines: [[sentence with ___, right, wrong]]
//   sort     q, bins: [{ id, label, icon }], items: [[text, bin, icon?]]
//   order    q, items (in the right order), icons?
//            (sort: the card can also be dragged into its bin)
//   match    q, pairs: [[left, right]] (in order)
//   tf       q, items: [[statement, true|false, fix?]]
//   number   q, answer, unit
//   label    q, view, ask: [[spot id, name]]
//
// Every one has a hint (said on the first miss; after the second the right
// answer glows) and an explanation (said when the step is done).
// ctx: { say(html, mood), sfx, signal }. opts: { views: { name: step => html } }.
// Test hook: what is right to tap next carries data-ok; «تابِع» carries
// data-next data-step.
//
// It also holds what every island's own games share: the step types,
// tracker() (a miss: the hint first, then the answer glows), finish() (the
// helper explains; «تابِع» moves on) and makeRunStep() (an island's runner).

import { num } from '../format.js';
import { explore, fitHits } from './explore.js';
import type { ExploreStep, ExploreOpts, Spot } from './explore.js';
import { burst } from '../../plugins/engines/kit.js';
import { later, shuffle, bump } from './util.js';

const ltr = (t: unknown) => /^[A-Za-z0-9/ .+×=−-]+$/.test(String(t));

// ---------- The step contract (every island) ----------

/** One step's score: total graded parts (1 for a question, 0 for «أتعلّم»), ok of them right on the first try. */
export interface StepResult { ok: number; total: number }
export type Resolve = (result: StepResult) => void;
export interface Sfx { tap(): void; tick?(): void; good(): void; bad(): void; [more: string]: unknown }
/** What a step gets from its island. */
export interface StepCtx {
  /** The helper says a line (html); mood: 'oops', 'think', 'cheer', 'happy'… */
  say(html: string, mood?: string): void;
  sfx: Sfx;
  /** Aborted when the child leaves the quest. */
  signal: AbortSignal;
  onSpot?(step: Step, spot: unknown): void;
}
/** Any step: «أتعلّم», a shared question, or an island's own game. */
export interface Step {
  kind: string;
  q?: string;
  hint?: string;
  explain?: string;
  view?: string;
  pic?: string;
  [more: string]: any;
}
/** A picture: step → svg/html. */
export type View = (step: any) => string;
export type StepFn<S extends Step = Step> = (step: S, host: HTMLElement, ctx: StepCtx, resolve: Resolve) => void;
export type RunStep = (step: Step, host: HTMLElement, ctx: StepCtx) => Promise<StepResult>;

// The shared questions.
export interface Choice extends Step { kind: 'choice'; q: string; options: string[] }
export interface TwoWay extends Step { kind: 'twoway'; lines: [string, string, string][] }
export interface Sort extends Step { kind: 'sort'; q: string; bins: { id: string; label: string; icon?: string }[]; items: [string, string, string?][] }
export interface Order extends Step { kind: 'order'; q: string; items: string[]; icons?: string[] }
export interface Match extends Step { kind: 'match'; q: string; pairs: [string, string][] }
export interface TrueFalse extends Step { kind: 'tf'; items: [string, boolean, string?][] }
export interface NumberStep extends Step { kind: 'number'; q: string; answer: number | string; unit?: string }
export interface Label extends Step { kind: 'label'; q: string; view: string; ask: [string, string][] }
export type Question = Choice | TwoWay | Sort | Order | Match | TrueFalse | NumberStep | Label;

// ---------- Shared by every island's games ----------

/** Counts the misses of a step: the first says the hint (or `line`), the next ones also make the answer glow (`reveal`). */
export function tracker(step: Step, ctx: StepCtx, reveal?: () => void) {
  let misses = 0;
  return {
    get misses() { return misses; },
    miss(el?: Element | null, line?: string) {
      misses += 1;
      ctx.sfx.bad();
      bump(el);
      if (misses === 1) ctx.say(line || step.hint || '', 'oops');
      else { ctx.say(`${step.hint} <b>انظر إلى ما يلمع ✨</b>`, 'think'); reveal?.(); }
    },
  };
}
// A right answer sparkles (+1 when it was right the first time).
const sparkle = (el: Element, first: boolean) => burst(el, first ? '+1' : '');

// Drag `item` and drop it on one of `targets` (found under the finger):
// `drop(target)` then does what tapping that target would. A light tick
// each time the card comes over a target.
function dragTo(item: HTMLElement, targets: string, ctx: StepCtx, drop: (target: HTMLElement) => void) {
  let id: number | null = null, sx = 0, sy = 0, ghost: HTMLElement | null = null, over: HTMLElement | null = null;
  item.classList.add('lq-drag');
  const under = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>(targets) ?? null;
  item.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    id = e.pointerId; sx = e.clientX; sy = e.clientY;
    try { item.setPointerCapture(id); } catch { /* fine */ }
  });
  item.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    if (!ghost) {
      if (Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
      ghost = document.createElement('div');
      ghost.className = 'lq lq-ghost';
      ghost.append(item.cloneNode(true));
      document.body.append(ghost);
      item.classList.add('is-lifted');
      ctx.sfx.tick?.();
    }
    ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    const t = under(e.clientX, e.clientY);
    if (t !== over) { over?.classList.remove('is-over'); over = t; if (t) { t.classList.add('is-over'); ctx.sfx.tick?.(); } }
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    if (!ghost) return;
    ghost.remove(); ghost = null;
    item.classList.remove('is-lifted');
    const t = over;
    over?.classList.remove('is-over'); over = null;
    if (t) drop(t);
  };
  item.addEventListener('pointerup', end);
  item.addEventListener('pointercancel', end);
}

/**
 * The end of a step: the helper explains, the test hooks go, and «تابِع»
 * resolves. `ok` is the share right on the first try (a question counts 1),
 * or a whole result. opts.into: where the button goes (default: host);
 * opts.look: the class prefix of its row and button ('lq' → lq-foot, lq-next).
 */
export function finish(host: HTMLElement, step: Step, ctx: StepCtx, resolve: Resolve, ok: number | StepResult, { into = host, look = 'lq' }: { into?: Element; look?: string } = {}) {
  const result = typeof ok === 'number' ? { ok: Math.max(0, Math.min(1, ok)), total: 1 } : ok;
  if (step.explain) ctx.say(step.explain, result.ok >= result.total ? 'cheer' : 'happy');
  host.classList.add('is-solved');
  host.querySelectorAll('[data-ok], [data-step]').forEach(el => { el.removeAttribute('data-ok'); el.removeAttribute('data-step'); });
  const foot = document.createElement('div');
  foot.className = `${look}-foot`;
  foot.innerHTML = `<button class="btn btn--gold ${look}-next" data-next data-step>تابِع ◀</button>`;
  into.append(foot);
  const b = foot.querySelector('button')!;
  b.focus({ preventScroll: true });
  b.addEventListener('click', () => { ctx.sfx.tap(); resolve(result); }, { once: true });
}
type QOpts = { views: Record<string, View> };
const picHTML = (step: Step, views: Record<string, View>) => (step.pic && views[step.pic] ? `<div class="lq-pic">${views[step.pic](step)}</div>` : '');

const KINDS: { [K in Question['kind']]: (step: Extract<Question, { kind: K }>, host: HTMLElement, ctx: StepCtx, resolve: Resolve, opts: QOpts) => void } = {
  choice(step, host, ctx, resolve, { views }) {
    const opts = shuffle(step.options.map((t, i) => ({ t, ok: i === 0 })));
    host.innerHTML = `<div class="lq"><p class="lq-ask">${step.q}</p>${picHTML(step, views)}
      <div class="lq-opts">${opts.map(o => `<button class="lq-opt" ${o.ok ? 'data-ok' : ''}><span ${ltr(o.t) ? 'dir="ltr"' : ''}>${o.t}</span></button>`).join('')}</div></div>`;
    const right = host.querySelector('[data-ok]')!;
    const tr = tracker(step, ctx, () => right.classList.add('is-reveal'));
    host.querySelector('.lq-opts')!.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLButtonElement>('.lq-opt');
      if (!b || host.classList.contains('is-solved')) return;
      if (!('ok' in b.dataset)) { b.disabled = true; tr.miss(b); return; }
      b.classList.add('is-right');
      ctx.sfx.good();
      sparkle(b, !tr.misses);
      finish(host, step, ctx, resolve, tr.misses ? 0 : 1);
    });
  },

  // The book's «أستنتج»: a sentence with a blank, and two words to choose from.
  twoway(step, host, ctx, resolve) {
    const lines = step.lines;
    host.innerHTML = `<div class="lq"><p class="lq-ask">${step.q || 'اختر الكلمة الصحيحة'}</p>
      <ol class="lq-lines">${lines.map(([s]) => `<li>${s.replace('___', '<span class="lq-slot">…</span>')}</li>`).join('')}</ol>
      <div class="lq-opts lq-opts--two"></div></div>`;
    const lis = [...host.querySelectorAll('.lq-lines li')], box = host.querySelector('.lq-opts')!;
    let i = 0, missed = 0, missedHere = false;
    const tr = tracker(step, ctx, () => box.querySelector('[data-ok]')?.classList.add('is-reveal'));
    const show = () => {
      lis.forEach((li, k) => { li.classList.toggle('is-now', k === i); });
      const [, right, wrong] = lines[i];
      box.innerHTML = shuffle([right, wrong]).map(w => `<button class="lq-opt" ${w === right ? 'data-ok' : ''}>${w}</button>`).join('');
      missedHere = false;
      lis[i].scrollIntoView?.({ block: 'nearest' });
    };
    show();
    box.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLButtonElement>('.lq-opt');
      if (!b || host.classList.contains('is-solved')) return;
      if (!('ok' in b.dataset)) { b.disabled = true; if (!missedHere) { missedHere = true; missed += 1; } tr.miss(b); return; }
      ctx.sfx.tap();
      const slot = lis[i].querySelector('.lq-slot')!;
      slot.textContent = lines[i][1];
      slot.classList.add('is-filled');
      sparkle(slot, !missedHere);
      lis[i].classList.add('is-done');
      i += 1;
      if (i < lines.length) { show(); return; }
      lis.forEach(li => li.classList.remove('is-now'));
      box.remove();
      ctx.sfx.good();
      finish(host, step, ctx, resolve, (lines.length - missed) / lines.length);
    });
  },

  // One item at a time; tap the bin it belongs in.
  sort(step, host, ctx, resolve) {
    const items = shuffle(step.items);
    host.innerHTML = `<div class="lq"><p class="lq-ask">${step.q}</p>
      <div class="lq-tray"><div class="lq-item"></div><small class="lq-left"></small></div>
      <div class="lq-bins" style="--n:${step.bins.length}">${step.bins.map(b => `<button class="lq-bin" data-bin="${b.id}"><span class="lq-bin__head">${b.icon || ''} ${b.label}</span><span class="lq-bin__in"></span></button>`).join('')}</div></div>`;
    const item = host.querySelector<HTMLElement>('.lq-item')!, left = host.querySelector('.lq-left')!, bins = [...host.querySelectorAll<HTMLElement>('.lq-bin')];
    let i = 0, missed = 0, missedHere = false;
    const tr = tracker(step, ctx, () => bins.find(b => b.dataset.bin === items[i][1])?.classList.add('is-reveal'));
    const show = () => {
      const [t, , icon] = items[i];
      item.innerHTML = `${icon ? `<span class="lq-item__icon">${icon}</span>` : ''}<b>${t}</b>`;
      bump(item, 'is-pop');
      left.textContent = `${num(items.length - i)} بطاقات باقية`;
      bins.forEach(b => { b.toggleAttribute('data-ok', b.dataset.bin === items[i][1]); b.classList.remove('is-reveal'); });
      missedHere = false;
    };
    show();
    dragTo(item, '.lq-bin', ctx, b => b.click());
    host.querySelector('.lq-bins')!.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLElement>('.lq-bin');
      if (!b || host.classList.contains('is-solved')) return;
      if (b.dataset.bin !== items[i][1]) { if (!missedHere) { missedHere = true; missed += 1; } tr.miss(b); return; }
      ctx.sfx.tap();
      const [t, , icon] = items[i];
      b.querySelector('.lq-bin__in')!.insertAdjacentHTML('beforeend', `<i title="${t}">${icon || '•'}</i>`);
      bump(b, 'is-got');
      sparkle(b, !missedHere);
      i += 1;
      if (i < items.length) { show(); return; }
      host.querySelector('.lq-tray')!.remove();
      bins.forEach(x => x.removeAttribute('data-ok'));
      ctx.sfx.good();
      finish(host, step, ctx, resolve, (items.length - missed) / items.length);
    });
  },

  order(step, host, ctx, resolve) {
    const items = step.items.map((t, k) => ({ t, k, icon: step.icons?.[k] }));
    host.innerHTML = `<div class="lq"><p class="lq-ask">${step.q}</p>
      <div class="lq-seq">${items.map(() => '<span class="lq-seq__slot"></span>').join('<i class="lq-seq__arrow">←</i>')}</div>
      <div class="lq-opts lq-opts--grid">${shuffle(items).map(o => `<button class="lq-opt" data-k="${o.k}">${o.icon ? `<span class="lq-opt__icon">${o.icon}</span>` : ''}<span>${o.t}</span></button>`).join('')}</div></div>`;
    const btns = [...host.querySelectorAll<HTMLButtonElement>('.lq-opt')], slots = [...host.querySelectorAll('.lq-seq__slot')];
    let i = 0;
    const mark = () => btns.forEach(b => { b.toggleAttribute('data-ok', +b.dataset.k! === i); b.classList.remove('is-reveal'); });
    const tr = tracker(step, ctx, () => btns.find(b => +b.dataset.k! === i)?.classList.add('is-reveal'));
    mark();
    host.querySelector('.lq-opts')!.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLButtonElement>('.lq-opt');
      if (!b || b.disabled || host.classList.contains('is-solved')) return;
      if (+b.dataset.k! !== i) { tr.miss(b); return; }
      ctx.sfx.tap();
      const it = items[i];
      slots[i].innerHTML = `${it.icon ? `<b>${it.icon}</b>` : ''}<small>${it.t}</small>`;
      slots[i].classList.add('is-filled');
      sparkle(slots[i], false);
      b.disabled = true; b.classList.add('is-used');
      i += 1;
      if (i < items.length) { mark(); return; }
      btns.forEach(x => x.removeAttribute('data-ok'));
      ctx.sfx.good();
      finish(host, step, ctx, resolve, tr.misses ? Math.max(0, 1 - tr.misses / items.length) : 1);
    });
  },

  // The left phrases in order; tap the right phrase that goes with the
  // glowing one.
  match(step, host, ctx, resolve) {
    const pairs = step.pairs;
    const rights = shuffle(pairs.map(([, r], k) => ({ r, k })));
    host.innerHTML = `<div class="lq"><p class="lq-ask">${step.q}</p>
      <div class="lq-match"><ol class="lq-match__l">${pairs.map(([l]) => `<li>${l}</li>`).join('')}</ol>
      <div class="lq-match__r">${rights.map(o => `<button class="lq-opt" data-k="${o.k}">${o.r}</button>`).join('')}</div></div></div>`;
    const ls = [...host.querySelectorAll('.lq-match__l li')], rs = [...host.querySelectorAll<HTMLButtonElement>('.lq-match__r .lq-opt')];
    let i = 0, missed = 0, missedHere = false;
    const mark = () => {
      ls.forEach((li, k) => li.classList.toggle('is-now', k === i));
      rs.forEach(b => { b.toggleAttribute('data-ok', +b.dataset.k! === i); b.classList.remove('is-reveal'); });
      missedHere = false;
    };
    const tr = tracker(step, ctx, () => rs.find(b => +b.dataset.k! === i)?.classList.add('is-reveal'));
    mark();
    host.querySelector('.lq-match__r')!.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLButtonElement>('.lq-opt');
      if (!b || b.disabled || host.classList.contains('is-solved')) return;
      if (+b.dataset.k! !== i) { if (!missedHere) { missedHere = true; missed += 1; } tr.miss(b); return; }
      ctx.sfx.tap();
      ls[i].classList.add('is-done');
      ls[i].insertAdjacentHTML('beforeend', `<b class="lq-match__got">${pairs[i][1]}</b>`);
      sparkle(ls[i], !missedHere);
      b.disabled = true; b.classList.add('is-used');
      i += 1;
      if (i < pairs.length) { mark(); return; }
      ls.forEach(li => li.classList.remove('is-now'));
      host.querySelector('.lq-match__r')!.remove();
      ctx.sfx.good();
      finish(host, step, ctx, resolve, (pairs.length - missed) / pairs.length);
    });
  },

  // True or false, one statement at a time; a false one shows its fix.
  tf(step, host, ctx, resolve) {
    const items = step.items;
    host.innerHTML = `<div class="lq"><p class="lq-ask">${step.q || 'صح أم خطأ؟'}</p>
      <div class="lq-tf"><p class="lq-tf__s"></p><p class="lq-tf__fix" hidden></p></div>
      <div class="lq-opts lq-opts--two"><button class="lq-opt lq-opt--yes" data-v="1">✓ صح</button><button class="lq-opt lq-opt--no" data-v="0">✗ خطأ</button></div>
      <small class="lq-left"></small></div>`;
    const s = host.querySelector('.lq-tf__s')!, fix = host.querySelector<HTMLElement>('.lq-tf__fix')!, btns = [...host.querySelectorAll<HTMLButtonElement>('[data-v]')], left = host.querySelector('.lq-left')!;
    let i = 0, missed = 0, missedHere = false, busy = false;
    const show = () => {
      s.innerHTML = items[i][0];
      fix.hidden = true;
      bump(s.parentElement, 'is-pop');
      btns.forEach(b => { b.disabled = false; b.toggleAttribute('data-ok', b.dataset.v === (items[i][1] ? '1' : '0')); b.classList.remove('is-reveal', 'is-right'); });
      left.textContent = `${num(i + 1)} / ${num(items.length)}`;
      missedHere = false;
    };
    const tr = tracker(step, ctx, () => btns.find(b => 'ok' in b.dataset)?.classList.add('is-reveal'));
    show();
    host.querySelector('.lq-opts')!.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLButtonElement>('.lq-opt');
      if (!b || busy || host.classList.contains('is-solved')) return;
      if (!('ok' in b.dataset)) { b.disabled = true; if (!missedHere) { missedHere = true; missed += 1; } tr.miss(b); return; }
      ctx.sfx.tap();
      b.classList.add('is-right');
      sparkle(b, !missedHere);
      btns.forEach(x => x.removeAttribute('data-ok'));
      const [, truth, correction] = items[i];
      if (!truth && correction) { fix.innerHTML = `✏️ ${correction}`; fix.hidden = false; }
      busy = true;
      later(() => {
        busy = false;
        i += 1;
        if (i < items.length) { show(); return; }
        host.querySelector('.lq-opts')!.remove();
        ctx.sfx.good();
        finish(host, step, ctx, resolve, (items.length - missed) / items.length);
      }, !truth && correction ? 1900 : 700);
    });
  },

  // Type a number on a keypad.
  number(step, host, ctx, resolve) {
    const want = String(step.answer);
    host.innerHTML = `<div class="lq"><p class="lq-ask">${step.q}</p>
      <div class="lq-num" dir="ltr"><output class="lq-num__out">?</output>${step.unit ? `<b class="lq-num__unit">${step.unit}</b>` : ''}</div>
      <div class="lq-pad" dir="ltr">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map(k => `<button class="lq-key${k === '✓' ? ' lq-key--go' : ''}" data-key="${k}" ${k === '✓' ? 'aria-label="تحقّق"' : k === '⌫' ? 'aria-label="امسح"' : ''}>${k}</button>`).join('')}</div></div>`;
    const out = host.querySelector<HTMLElement>('.lq-num__out')!, keys = [...host.querySelectorAll<HTMLButtonElement>('.lq-key')];
    let typed = '';
    const mark = () => {
      const need = want.startsWith(typed) ? (typed.length < want.length ? want[typed.length] : '✓') : '⌫';
      keys.forEach(k => k.toggleAttribute('data-ok', k.dataset.key === need));
      out.textContent = typed || '?';
    };
    const tr = tracker(step, ctx, () => { out.classList.add('is-reveal'); out.dataset.want = want; });
    mark();
    host.querySelector('.lq-pad')!.addEventListener('click', e => {
      const k = (e.target as Element).closest<HTMLElement>('.lq-key');
      if (!k || host.classList.contains('is-solved')) return;
      const key = k.dataset.key!;
      if (key === '✓') ctx.sfx.tap(); else (ctx.sfx.tick || ctx.sfx.tap)();
      if (key === '⌫') typed = typed.slice(0, -1);
      else if (key === '✓') {
        if (!typed) return;
        if (typed !== want) { tr.miss(out); typed = ''; mark(); return; }
        keys.forEach(x => { x.removeAttribute('data-ok'); x.disabled = true; });
        out.classList.add('is-right');
        ctx.sfx.good();
        sparkle(out, !tr.misses);
        finish(host, step, ctx, resolve, tr.misses ? 0 : 1);
        return;
      } else if (typed.length < 7) typed += key;
      mark();
    });
  },

  // Tap the named parts on a picture.
  label(step, host, ctx, resolve, { views }) {
    host.innerHTML = `<div class="lq"><p class="lq-ask">${step.q}</p><p class="lq-find">👆 <b></b></p>
      <div class="lq-pic lq-pic--label">${views[step.view]?.(step) || ''}</div></div>`;
    fitHits(host);
    const find = host.querySelector('.lq-find b')!;
    const spots = new Map(step.ask.map(([id]) => [id, host.querySelector<HTMLElement>(`[data-spot="${CSS.escape(id)}"]`)]));
    spots.forEach(el => { if (el) { el.classList.add('lq-hit'); if (el.tagName !== 'BUTTON') { el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); } } });
    let i = 0, missed = 0, missedHere = false;
    const mark = () => {
      find.textContent = step.ask[i][1];
      bump(find, 'is-pop');
      spots.forEach((el, id) => el?.toggleAttribute('data-ok', id === step.ask[i][0]));
      missedHere = false;
    };
    const tr = tracker(step, ctx, () => spots.get(step.ask[i][0])?.classList.add('is-reveal'));
    mark();
    const pick = (el: HTMLElement) => {
      if (host.classList.contains('is-solved')) return;
      const id = el.dataset.spot;
      if (el.classList.contains('is-found')) return;
      if (id !== step.ask[i][0]) { if (!missedHere) { missedHere = true; missed += 1; } tr.miss(el); return; }
      ctx.sfx.tap();
      el.classList.add('is-found');
      sparkle(el, !missedHere);
      el.classList.remove('is-reveal');
      el.removeAttribute('data-ok');
      const lab = el.querySelector('.lx-label');
      if (lab) lab.textContent = step.ask[i][1];
      i += 1;
      if (i < step.ask.length) { mark(); return; }
      host.querySelector('.lq-find')!.remove();
      ctx.sfx.good();
      finish(host, step, ctx, resolve, (step.ask.length - missed) / step.ask.length);
    };
    const pic = host.querySelector<HTMLElement>('.lq-pic')!;
    pic.addEventListener('click', e => { const el = (e.target as Element).closest<HTMLElement>('.lq-hit'); if (el) pick(el); });
    pic.addEventListener('keydown', e => { const el = (e.target as Element).closest<HTMLElement>('.lq-hit'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(el); } });
  },
};

export const QUESTION_KINDS = Object.keys(KINDS);
export function runQuestion(step: Step, host: HTMLElement, ctx: StepCtx, resolve: Resolve, opts: Partial<QOpts> = {}) {
  const fn = KINDS[step.kind as Question['kind']] as StepFn<any> & ((...a: [Step, HTMLElement, StepCtx, Resolve, QOpts]) => void) | undefined;
  if (!fn) { resolve({ ok: 0, total: 0 }); return; }
  fn(step, host, ctx, resolve, { views: {}, ...opts });
}

/**
 * «أتعلّم»'s usual onSpot: when a spot opens, the picture plays its part (its
 * root gets `st-<id>`, kept, and data-st="<id>", the latest), then `also`
 * (a view's own reaction), then the island's ctx.onSpot.
 */
export function markSpot(step: Step, ctx: StepCtx, also?: (spot: Spot, el: HTMLElement, root: HTMLElement | null) => void) {
  return (s: Spot, el: HTMLElement, host: HTMLElement) => {
    const root = host.querySelector<HTMLElement>('.lx-view > *');
    if (root && root.contains(el)) { root.classList.add(`st-${s.id}`); root.dataset.st = s.id; }
    also?.(s, el, root);
    ctx.onSpot?.(step, s);
  };
}

/**
 * An island's runStep(step, host, ctx) → Promise<{ ok, total }>: its own
 * games first (by kind), then «أتعلّم» (explore.ts, given the island's
 * pictures, markSpot, and exploreOpts(step, ctx)), then the shared questions
 * above. beforeQuestion(host) runs before a shared question draws.
 */
export function makeRunStep({ games = {}, views = {}, exploreOpts, beforeQuestion }: {
  games?: Record<string, StepFn<any>>;
  views?: Record<string, View>;
  exploreOpts?: (step: ExploreStep, ctx: StepCtx) => ExploreOpts;
  beforeQuestion?: (host: HTMLElement) => void;
}): RunStep {
  return (step, host, ctx) => new Promise(resolve => {
    const game = games[step.kind];
    if (game) game(step, host, ctx, resolve);
    else if (step.kind === 'explore') explore(step as ExploreStep, host, ctx, resolve, { views, onSpot: markSpot(step, ctx), ...exploreOpts?.(step as ExploreStep, ctx) });
    else { beforeQuestion?.(host); runQuestion(step, host, ctx, resolve, { views }); }
  });
}
