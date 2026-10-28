// The art island's steps: «أتعلّم» (core/learn/explore.js) with the
// island's pictures (views.js), the shared questions (core/learn/steps.js),
// and the island's own hands-on games, played with the fingers like the
// book's «أحاول» activities:
//
//   mix      pour paint pots into a bowl to make a colour
//            rounds: [{ want, from: [pot, pot], say? }], pots: [colour ids]
//   paint    pick a colour, tap the parts of a picture to colour them
//            view, palette: [colour ids], regions: { region id: colour id | tag }
//   vanish   perspective: find the vanishing point and the horizon, plant
//            trees from near (big) to far (small), colour the far mountain
//            tasks?: ['point', 'horizon', 'trees', 'far']
//   fold     origami: tap the right fold line, the paper folds
//            model: 'butterfly'
//   collage  pick a cut piece, glue it into its outline
//            view (its pieces: { id: { label, box } })
//   pattern  continue a rhythm of tiles
//            seq: [tile ids], hide: n (the last n are to find), extra?: [tile ids], look?: 'beads'
//   mirror   complete the other half of a symmetric picture
//            grid: [rows of the left half], colors: { char: colour }, base?: chars filled on both sides
//   gallery  tap the painting that answers each question
//            frames: [{ id, art }], ask: [[frame id, question, plate]]
//   press    make a sunken (pressed in) or raised (added on) effect on clay
//            tasks: [{ want: 'in' | 'on', tool, text }]
//   craft    use the right tool for each stage of a work; the picture changes
//            view, tools: [{ id, icon, label }], seq: [{ tool, text }]
//
// Each resolves { ok, total: 1 } (ok: the share right on the first try),
// has a hint (said on the first miss; after the second the right answer
// glows) and an explanation. Test hook, as in core/learn/steps.js: what is
// right to tap next carries data-ok, every useful tap data-step, and the
// «تابِع» button data-next data-step.

import { makeRunStep, tracker, finish } from '../learn/steps.js';
import { later, shuffle, bump } from '../learn/util.js';
import { VIEWS, PIECES, STAGES } from './views.js';
import type { ArtView, Piece, FoldStage } from './views.js';
import { ART, artSVG } from './art.js';
import { num } from '../format.js';
import type { StepCtx, Resolve, StepFn, View, RunStep } from '../learn/steps.js';
import type { Step } from '../../types/content.js';

// ---------- The island's own steps (see the list above) ----------

export interface MixStep extends Step {
  kind: 'mix';
  /** Each round: the colour to make, the two pots that make it, and what the helper says then. */
  rounds: { want: string; from: [string, string]; say?: string }[];
  /** The pots to pour from (colour ids; default red, yellow, blue, white). */
  pots?: string[];
}
export interface PaintStep extends Step {
  kind: 'paint';
  view: string;
  /** The colours to pick from (colour ids). */
  palette: string[];
  /** region id → the colour id it wants, or a tag of the colours that fit ('warm', 'light'…). */
  regions: Record<string, string>;
  /** Said when a part is tapped before a colour is picked. */
  pick?: string;
  /** Said when a part that keeps its colour is tapped. */
  keep?: string;
}
export interface VanishStep extends Step {
  kind: 'vanish';
  /** The tasks, in order (default all four). */
  tasks?: ('point' | 'horizon' | 'trees' | 'far')[];
}
export interface FoldStep extends Step {
  kind: 'fold';
  /** A key of STAGES (default 'butterfly'). */
  model?: string;
}
export interface CollageStep extends Step {
  kind: 'collage';
  /** The picture with the outlines; its pieces are PIECES[view]. */
  view: string;
}
export interface PatternStep extends Step {
  kind: 'pattern';
  /** The whole rhythm (keys of TILES). */
  seq: string[];
  /** The last n are to find (default 2). */
  hide?: number;
  /** More tiles to choose from. */
  extra?: string[];
  look?: 'beads';
}
export interface MirrorStep extends Step {
  kind: 'mirror';
  /** The left half: a string per row, a character per square ('.' is empty). */
  grid: string[];
  /** character → colour. */
  colors: Record<string, string>;
  /** Characters already filled on both sides. */
  base?: string;
}
export interface GalleryStep extends Step {
  kind: 'gallery';
  /** The paintings (art: a key of ART). */
  frames: { id: string; art: string }[];
  /** [frame id, question, plate shown under it once found]. */
  ask: [string, string, string?][];
}
export interface PressStep extends Step {
  kind: 'press';
  /** want: 'in' sunken (pressed in), 'on' raised (added on); tool: a key of MARKS. */
  tasks: { want: 'in' | 'on'; tool: string; text: string }[];
}
export interface CraftStep extends Step {
  kind: 'craft';
  view: string;
  tools: { id: string; icon: string; label: string }[];
  /** The stages: the right tool, the line, and what the helper says then. */
  seq: { tool: string; text: string; say?: string }[];
  /** The line once the work is done. */
  doneText?: string;
}

// What views.js holds (see there).

const mark = (el: Element | null | undefined, on: boolean) => { if (!el) return; el.toggleAttribute('data-ok', on); el.toggleAttribute('data-step', on); };

/** A paint: its colour, its name, and the tags a region can ask for. */
export interface Paint { c: string; name: string; icon?: string; tags: string[] }

// The colours of the island's paint pots and palettes.
export const COLORS: Record<string, Paint> = {
  red: { c: '#e8453c', name: 'الأحمر', tags: ['warm', 'pure', 'primary'] },
  yellow: { c: '#ffd23f', name: 'الأصفر', tags: ['warm', 'pure', 'primary'] },
  blue: { c: '#2f7fd6', name: 'الأزرق', tags: ['cold', 'pure', 'primary'] },
  orange: { c: '#f28c1a', name: 'البرتقاليّ', tags: ['warm', 'pure'] },
  green: { c: '#34b04a', name: 'الأخضر', tags: ['cold', 'pure'] },
  purple: { c: '#8a4fc9', name: 'البنفسجيّ', tags: ['cold', 'pure'] },
  white: { c: '#ffffff', name: 'الأبيض', tags: ['white', 'light'] },
  black: { c: '#1f1612', name: 'الأسود', tags: ['black', 'dark'] },
  lightblue: { c: '#a9d8ff', name: 'الأزرق الفاتح', tags: ['light', 'cold'] },
  darkblue: { c: '#1d3f8a', name: 'الأزرق الغامق', tags: ['dark', 'cold'] },
  lightgreen: { c: '#b8ec9e', name: 'الأخضر الفاتح', tags: ['light'] },
  darkgreen: { c: '#1f6a34', name: 'الأخضر الغامق', tags: ['dark'] },
  lightyellow: { c: '#fff2a8', name: 'الأصفر الفاتح', tags: ['light'] },
  brown: { c: '#6b4226', name: 'البنّيّ الغامق', tags: ['dark'] },
  pink: { c: '#ff9fc4', name: 'الورديّ', tags: ['light', 'warm'] },
  grey: { c: '#9a958c', name: 'الرماديّ الباهت', tags: ['dull'] },
  mud: { c: '#9a8466', name: 'البنّيّ الباهت', tags: ['dull'] },
  chisel: { c: '#b39a68', name: 'الإزميل', icon: '🔨', tags: ['carve'] },
};
const MIX: Record<string, string> = { 'red+yellow': 'orange', 'blue+yellow': 'green', 'blue+red': 'purple', 'blue+white': 'lightblue', 'green+white': 'lightgreen', 'red+white': 'pink', 'white+yellow': 'lightyellow', 'black+green': 'darkgreen', 'black+blue': 'darkblue' };
const MUD = '#8a6d4b';
const colorOf = (id: string) => COLORS[id]?.c || id;
const fits = (want: string, id: string) => want === id || (COLORS[id]?.tags || []).includes(want);

const ask = (q: string | undefined) => `<p class="lq-ask">${q}</p>`;
const swatch = (id: string, extra = '') => { const c = COLORS[id]; return `<button class="sg-sw" data-c="${id}" style="--c:${c.c}" aria-label="${c.name}" ${extra}>${c.icon ? `<span class="sg-sw__icon">${c.icon}</span>` : '<i></i>'}<small>${c.name.replace('ال', '')}</small></button>`; };

// ---------------------------------------------------------------- mix
function mix(step: MixStep, host: HTMLElement, ctx: StepCtx, resolve: Resolve) {
  const rounds = step.rounds, pots = step.pots || ['red', 'yellow', 'blue', 'white'];
  host.innerHTML = `<div class="lq sg-mix">${ask(step.q)}
    <div class="sg-mix__goal"><span>اصنع</span><i class="sg-dot"></i><b></b><small class="sg-mix__n"></small></div>
    <div class="sg-mix__stage">
      <svg class="sg-bowl" viewBox="0 0 200 110" aria-hidden="true">
        <ellipse cx="100" cy="102" rx="70" ry="6" fill="rgba(0,0,0,.12)"/>
        <path d="M20 40 Q24 98 100 100 Q176 98 180 40Z" fill="#fff" stroke="#3b2414" stroke-width="4"/>
        <ellipse class="sg-bowl__paint" cx="100" cy="44" rx="74" ry="12" fill="#f3ead6"/>
        <path d="M20 40 Q24 98 100 100 Q176 98 180 40" fill="none" stroke="#3b2414" stroke-width="4"/>
        <ellipse cx="100" cy="40" rx="80" ry="14" fill="none" stroke="#3b2414" stroke-width="4"/>
        <path d="M44 64 Q60 86 92 90" fill="none" stroke="#f2c6d8" stroke-width="5" stroke-linecap="round"/>
        <g class="sg-bowl__drops"></g>
      </svg>
      <p class="sg-mix__sum" aria-live="polite"></p>
    </div>
    <div class="sg-pots">${pots.map(id => `<button class="sg-pot" data-pot="${id}" style="--c:${colorOf(id)}"><span class="sg-pot__jar"><i></i></span><small>${COLORS[id].name}</small></button>`).join('')}</div></div>`;
  const goal = host.querySelector('.sg-mix__goal')!, paint = host.querySelector('.sg-bowl__paint')!, sum = host.querySelector('.sg-mix__sum')!;
  const btns = [...host.querySelectorAll<HTMLButtonElement>('.sg-pot')];
  let r = 0, added: string[] = [], busy = false, missedRounds = 0, missedHere = false;
  const round = () => rounds[r];
  const tr = tracker(step, ctx, () => btns.forEach(b => b.classList.toggle('is-reveal', round().from.includes(b.dataset.pot!) && !added.includes(b.dataset.pot!))));
  const marks = () => btns.forEach(b => mark(b, !busy && round().from.includes(b.dataset.pot!) && !added.includes(b.dataset.pot!)));
  const show = () => {
    const want = COLORS[round().want];
    goal.querySelector<HTMLElement>('.sg-dot')!.style.background = want.c;
    goal.querySelector('b')!.textContent = want.name;
    goal.querySelector('.sg-mix__n')!.textContent = rounds.length > 1 ? `${num(r + 1)} / ${num(rounds.length)}` : '';
    bump(goal, 'is-pop');
    paint.setAttribute('fill', '#f3ead6');
    sum.textContent = '';
    added = []; missedHere = false;
    btns.forEach(b => b.classList.remove('is-reveal', 'is-used'));
    marks();
  };
  const pour = (id: string) => {
    const drop = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    drop.setAttribute('cx', String(70 + Math.random() * 60)); drop.setAttribute('cy', String(4)); drop.setAttribute('r', String(7));
    drop.setAttribute('fill', colorOf(id)); drop.classList.add('sg-drop');
    host.querySelector('.sg-bowl__drops')!.append(drop);
    later(() => drop.remove(), 600);
  };
  show();
  host.querySelector('.sg-pots')!.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.sg-pot');
    if (!b || busy || host.classList.contains('is-solved')) return;
    const id = b.dataset.pot!;
    if (added.includes(id)) return;
    pour(id);
    if (!round().from.includes(id)) {
      if (!missedHere) { missedHere = true; missedRounds += 1; }
      paint.setAttribute('fill', MUD);
      sum.textContent = `${[...added, id].map(x => COLORS[x].name).join(' + ')} = لون آخر 🤔`;
      busy = true; marks();
      tr.miss(b);
      later(() => { busy = false; added = []; paint.setAttribute('fill', '#f3ead6'); sum.textContent = ''; btns.forEach(x => x.classList.remove('is-used')); marks(); }, 1200);
      return;
    }
    ctx.sfx.tick!();
    added.push(id);
    b.classList.add('is-used');
    if (added.length < round().from.length) { paint.setAttribute('fill', colorOf(id)); marks(); return; }
    const key = [...added].sort().join('+'), made = MIX[key] || round().want;
    paint.setAttribute('fill', colorOf(made));
    sum.innerHTML = `${added.map(x => `<i style="--c:${colorOf(x)}"></i>${COLORS[x].name}`).join(' + ')} = <i style="--c:${colorOf(made)}"></i><b>${COLORS[made].name}</b>`;
    bump(host.querySelector('.sg-bowl'), 'is-pop');
    ctx.sfx.good();
    if (round().say) ctx.say(round().say!, 'cheer');
    busy = true; marks();
    later(() => {
      busy = false;
      r += 1;
      if (r < rounds.length) { show(); return; }
      finish(host, step, ctx, resolve, (rounds.length - missedRounds) / rounds.length);
    }, 1300);
  });
}

// ---------------------------------------------------------------- paint
function paint(step: PaintStep, host: HTMLElement, ctx: StepCtx, resolve: Resolve) {
  const view: ArtView | undefined = VIEWS[step.view];
  host.innerHTML = `<div class="lq sg-paint">${ask(step.q)}
    <div class="lq-pic sg-canvas">${view ? view.html(step) : ''}</div>
    <div class="sg-palette">${step.palette.map(id => swatch(id)).join('')}</div>
    <small class="lq-left sg-left"></small></div>`;
  const regs = [...host.querySelectorAll<SVGElement>('[data-region]')], sws = [...host.querySelectorAll<HTMLButtonElement>('.sg-sw')], left = host.querySelector('.sg-left')!;
  const want = (id: string) => step.regions[id];
  const todo = regs.filter(el => want(el.dataset.region!) != null);
  todo.forEach(el => el.classList.add('sg-reg--todo'));
  regs.forEach(el => { el.classList.add('sg-reg'); el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); });
  let sel: string | null = null;
  const missed = new Set<string>();
  const open = () => todo.filter(el => !el.classList.contains('is-done'));
  const marks = () => {
    const rest = open();
    const can = sel && rest.some(el => fits(want(el.dataset.region!), sel!));
    regs.forEach(el => mark(el, !!can && rest.includes(el) && fits(want(el.dataset.region!), sel!)));
    sws.forEach(b => mark(b, !can && rest.some(el => fits(want(el.dataset.region!), b.dataset.c!))));
    left.textContent = `${num(todo.length - rest.length)} / ${num(todo.length)}`;
  };
  const tr = tracker(step, ctx, () => {
    const el = open()[0]; if (!el) return;
    sws.forEach(b => b.classList.toggle('is-reveal', fits(want(el.dataset.region!), b.dataset.c!)));
    el.classList.add('is-reveal');
  });
  marks();
  host.querySelector('.sg-palette')!.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.sg-sw');
    if (!b || host.classList.contains('is-solved')) return;
    sel = b.dataset.c!;
    sws.forEach(x => x.classList.toggle('is-on', x === b));
    ctx.sfx.tick!();
    marks();
  });
  const tap = (el: SVGElement) => {
    if (host.classList.contains('is-solved') || el.classList.contains('is-done')) return;
    if (!sel) { bump(host.querySelector('.sg-palette'), 'is-nudge'); ctx.say(step.pick || 'اختر لوناً من الألوان أولاً 🎨'); return; }
    const w = want(el.dataset.region!);
    if (w == null || !fits(w, sel)) {
      missed.add(el.dataset.region!);
      tr.miss(el, w == null ? (step.keep || step.hint) : step.hint);
      return;
    }
    ctx.sfx.tap();
    el.style.fill = colorOf(sel);
    el.classList.add('is-done');
    el.classList.remove('is-reveal');
    sws.forEach(b => b.classList.remove('is-reveal'));
    bump(el, 'is-pop');
    if (!open().length) {
      marks();
      ctx.sfx.good();
      host.querySelector('.sg-canvas')!.classList.add('is-done');
      finish(host, step, ctx, resolve, (todo.length - Math.min(missed.size, todo.length)) / todo.length);
      return;
    }
    marks();
  };
  const pic = host.querySelector<HTMLElement>('.sg-canvas')!;
  pic.addEventListener('click', e => { const el = (e.target as Element).closest<SVGElement>('[data-region]'); if (el) tap(el); });
  pic.addEventListener('keydown', e => { const el = (e.target as Element).closest<SVGElement>('[data-region]'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tap(el); } });
}

// ---------------------------------------------------------------- vanish
function vanish(step: VanishStep, host: HTMLElement, ctx: StepCtx, resolve: Resolve) {
  const tasks = step.tasks || ['point', 'horizon', 'trees', 'far'];
  const F = [160, 78];
  const tree = (x: number, y: number, h: number, cls = '') => `<g class="sg-tree ${cls}" transform="translate(${x} ${y}) scale(${h / 60})"><rect x="-3" y="-26" width="6" height="26" fill="#8a5a34"/><circle cy="-38" r="17" fill="#2f8a3f"/><circle cx="-9" cy="-30" r="10" fill="#3f9a4e"/><circle cx="9" cy="-31" r="10" fill="#47a556"/></g>`;
  const slots = [[64, 196, 60], [100, 156, 36], [127, 120, 19]];
  host.innerHTML = `<div class="lq sg-vanish">${ask(step.q)}
    <p class="lq-find sg-task">👆 <b></b></p>
    <div class="lq-pic"><svg class="sv sg-street" viewBox="0 0 320 210" role="img" aria-label="شارع">
      <rect class="sg-bg" width="320" height="210" fill="#cfeeff"/>
      <path class="sg-mount" d="M190 78 L232 46 L262 62 L292 40 L320 58 V78Z" fill="#c9d4e8"/>
      <rect class="sg-bg" y="78" width="320" height="132" fill="#a6d98b"/>
      <path d="M160 78 L300 210 H20Z" fill="#f3e2bd"/><path d="M160 78 L262 210 H58Z" fill="#4a4f5a"/>
      <path d="M160 78 L161 84 L163 96 L166 116 L170 146 L176 190 L178 210 H172 L168 186 L163 146 L161 116 L160 96Z" fill="#fff" opacity=".9"/>
      ${[[250, 170, 40], [214, 124, 24], [192, 100, 13]].map(([x, y, h]) => `<g><rect x="${x - 1.5}" y="${y - h * 2}" width="3" height="${h * 2}" fill="#4d434c"/><circle cx="${x}" cy="${y - h * 2}" r="${h * 0.16}" fill="#ffd36b"/></g>`).join('')}
      <g class="sg-guides"><path d="M58 210 L160 78 M262 210 L160 78 M20 210 L160 78 M300 210 L160 78 M64 140 L160 78 M250 90 L160 78"/></g>
      <g class="sg-hz" hidden>${[40, 78, 132].map(y => `<g class="sg-hline" data-y="${y}"><line x1="0" x2="320" y1="${y}" y2="${y}"/><rect x="0" y="${y - 10}" width="320" height="20" fill="transparent"/></g>`).join('')}</g>
      <g class="sg-trees">${slots.map(([x, y, h], i) => `<g class="sg-slot" data-slot="${i}"><ellipse cx="${x}" cy="${y}" rx="${h * 0.42}" ry="${h * 0.12}"/><g class="sg-slot__tree" hidden>${tree(x, y, h)}</g></g>`).join('')}</g>
      <g class="sg-f" data-f><circle cx="${F[0]}" cy="${F[1]}" r="20" fill="transparent"/><circle class="sg-f__dot" cx="${F[0]}" cy="${F[1]}" r="5"/><text class="sv-lab" x="${F[0]}" y="${F[1] - 10}"></text></g>
    </svg></div>
    <div class="sg-tools"></div></div>`;
  const task = host.querySelector('.sg-task b')!, tools = host.querySelector('.sg-tools')!, svg = host.querySelector('svg')!;
  const f = host.querySelector('[data-f]')!, hz = host.querySelector('.sg-hz')!, slotEls = [...host.querySelectorAll('.sg-slot')];
  const parts = tasks.reduce((n, t) => n + (t === 'trees' ? 3 : 1), 0);
  let t = 0, sub = 0, missedParts = 0, missedHere = false;
  const tr = tracker(step, ctx, () => host.querySelector('[data-ok]')?.classList.add('is-reveal'));
  const fail = (el: Element) => { if (!missedHere) { missedHere = true; missedParts += 1; } tr.miss(el); };
  const done = () => { missedHere = false; ctx.sfx.tap(); };
  const next = () => {
    t += 1; sub = 0; missedHere = false;
    if (t >= tasks.length) { ctx.sfx.good(); finish(host, step, ctx, resolve, (parts - missedParts) / parts); return; }
    show();
  };
  const show = () => {
    host.querySelectorAll('[data-ok]').forEach(el => mark(el, false));
    tools.innerHTML = '';
    const k = tasks[t];
    if (k === 'point') { task.textContent = 'أين تلتقي خطوط الشارع؟ اضغط عليها'; mark(f, true); }
    if (k === 'horizon') { task.textContent = 'اضغط على خطّ الأفق'; hz.removeAttribute('hidden'); host.querySelectorAll<SVGElement>('.sg-hline').forEach(l => mark(l, +l.dataset.y! === F[1])); }
    if (k === 'trees') {
      task.textContent = sub === 0 ? 'ازرع شجرة قريبة منك' : sub === 1 ? 'ازرع شجرة أبعد' : 'ازرع شجرة بعيدة قرب نقطة الفرار';
      slotEls.forEach((s, i) => s.classList.toggle('is-now', i === sub));
      const sizes = shuffle<[number, string, number]>([[0, 'كبيرة', 46], [1, 'متوسّطة', 30], [2, 'صغيرة', 16]]);
      tools.innerHTML = sizes.map(([i, name, h]) => `<button class="sg-tool" data-size="${i}"><svg viewBox="-24 -60 48 62" width="44" height="56">${tree(0, 0, h)}</svg><small>${name}</small></button>`).join('');
      tools.querySelectorAll<HTMLButtonElement>('[data-size]').forEach(b => mark(b, +b.dataset.size! === sub));
    }
    if (k === 'far') {
      task.textContent = 'لوّن الجبل البعيد: البعيد فاتح';
      tools.innerHTML = shuffle(['darkblue', 'lightblue']).map(id => swatch(id)).join('');
      tools.querySelectorAll<HTMLButtonElement>('.sg-sw').forEach(b => mark(b, b.dataset.c === 'lightblue'));
      host.querySelector('.sg-mount')!.classList.add('is-now');
    }
    bump(task, 'is-pop');
  };
  svg.addEventListener('click', e => {
    if (host.classList.contains('is-solved')) return;
    const k = tasks[t];
    if (k === 'point') {
      if ((e.target as Element).closest('[data-f]')) {
        done(); svg.classList.add('is-f'); f.querySelector('text')!.textContent = 'نقطة الفرار';
        ctx.say('هنا تلتقي خطوط الشارع كلّها: <b>نقطة الفرار</b>. 🎯', 'cheer');
        next();
      } else if ((e.target as Element).closest('svg')) {
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        const m = svg.getScreenCTM(); const p = m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', String(p.x)); dot.setAttribute('cy', String(p.y)); dot.setAttribute('r', String(5)); dot.setAttribute('class', 'sg-miss');
        svg.append(dot); later(() => dot.remove(), 900);
        fail(svg);
      }
    } else if (k === 'horizon') {
      const l = (e.target as Element).closest<SVGElement>('.sg-hline');
      if (!l) return;
      if (+l.dataset.y! !== F[1]) { fail(l); return; }
      done(); l.classList.add('is-right'); hz.querySelectorAll('.sg-hline:not(.is-right)').forEach(x => x.remove());
      ctx.say('خطّ الأفق يمرّ بنقطة الفرار، على مستوى عين الناظر. 👁️');
      next();
    }
  });
  tools.addEventListener('click', e => {
    if (host.classList.contains('is-solved')) return;
    const k = tasks[t];
    if (k === 'trees') {
      const b = (e.target as Element).closest<HTMLButtonElement>('[data-size]'); if (!b) return;
      if (+b.dataset.size! !== sub) { fail(b); return; }
      done(); const s = slotEls[sub]; s.classList.remove('is-now'); s.classList.add('is-done'); s.querySelector('.sg-slot__tree')!.removeAttribute('hidden');
      sub += 1;
      if (sub < 3) { missedHere = false; show(); return; }
      ctx.say('القريب كبير، والبعيد صغير. 🌳🌲🌱');
      next();
    } else if (k === 'far') {
      const b = (e.target as Element).closest<HTMLButtonElement>('.sg-sw'); if (!b) return;
      if (b.dataset.c !== 'lightblue') { fail(b); return; }
      done(); host.querySelector('.sg-mount')!.setAttribute('fill', COLORS.lightblue.c); host.querySelector('.sg-mount')!.classList.remove('is-now');
      next();
    }
  });
  show();
}

// ---------------------------------------------------------------- fold
function fold(step: FoldStep, host: HTMLElement, ctx: StepCtx, resolve: Resolve) {
  const stages: FoldStage[] = STAGES[step.model || 'butterfly'];
  host.innerHTML = `<div class="lq sg-fold">${ask(step.q)}
    <p class="lq-find sg-task">👆 <b></b></p>
    <div class="lq-pic"><svg class="sv sg-paper" viewBox="0 0 200 200" role="img" aria-label="ورقة"><g class="sg-paper__sheet"></g><g class="sg-paper__lines"></g></svg></div>
    <div class="sg-steps"></div></div>`;
  const sheet = host.querySelector('.sg-paper__sheet')!, lines = host.querySelector('.sg-paper__lines')!, task = host.querySelector('.sg-task b')!;
  const dots = host.querySelector('.sg-steps')!;
  dots.innerHTML = stages.filter(s => s.lines).map(() => '<i></i>').join('');
  let i = 0, missed = 0, missedHere = false, busy = false;
  const n = stages.filter(s => s.lines).length;
  const tr = tracker(step, ctx, () => lines.querySelector('[data-ok]')?.classList.add('is-reveal'));
  const show = () => {
    const st = stages[i];
    sheet.innerHTML = st.sheet;
    lines.innerHTML = st.lines ? shuffle(st.lines).map(l => `<g class="sg-fl" ${l.ok ? 'data-ok data-step' : ''}><path class="sg-fl__l" d="${l.d}"/><path class="sg-fl__hit" d="${l.d}"/></g>`).join('') : '';
    task.innerHTML = st.say;
    bump(task, 'is-pop');
    [...dots.children].forEach((d, k) => { d.classList.toggle('is-on', k < i); d.classList.toggle('is-now', k === i); });
    missedHere = false;
  };
  show();
  lines.addEventListener('click', e => {
    const l = (e.target as Element).closest<SVGElement>('.sg-fl');
    if (!l || busy || host.classList.contains('is-solved')) return;
    if (!('ok' in l.dataset)) { if (!missedHere) { missedHere = true; missed += 1; } tr.miss(l); return; }
    ctx.sfx.tick!();
    busy = true;
    l.classList.add('is-right');
    host.querySelector('.sg-paper')!.classList.add('is-folding');
    later(() => {
      host.querySelector('.sg-paper')!.classList.remove('is-folding');
      busy = false;
      i += 1;
      show();
      if (!stages[i].lines) {
        host.querySelector('.sg-paper')!.classList.add('is-done');
        [...dots.children].forEach(d => { d.classList.add('is-on'); d.classList.remove('is-now'); });
        ctx.sfx.good();
        finish(host, step, ctx, resolve, (n - missed) / n);
      }
    }, 650);
  });
}

// ---------------------------------------------------------------- collage
function collage(step: CollageStep, host: HTMLElement, ctx: StepCtx, resolve: Resolve) {
  const view: ArtView = VIEWS[step.view], pieces: Record<string, Piece> = PIECES[step.view];
  const ids = Object.keys(pieces);
  host.innerHTML = `<div class="lq sg-collage">${ask(step.q)}
    <div class="lq-pic sg-board">${view.html(step)}</div>
    <div class="sg-tray">${shuffle(ids).map(id => { const p = pieces[id]; return `<button class="sg-piece" data-piece="${id}"><svg viewBox="${p.box.join(' ')}" aria-hidden="true">${p.art}</svg><small>${p.label}</small></button>`; }).join('')}</div></div>`;
  const slots = new Map<string, SVGElement>([...host.querySelectorAll<SVGElement>('[data-slot]')].map(el => [el.dataset.slot!, el]));
  const btns = [...host.querySelectorAll<HTMLButtonElement>('.sg-piece')];
  slots.forEach(el => { el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); });
  let sel: string | null = null, missed = new Set<string>();
  const left = () => btns.filter(b => !b.disabled);
  const marks = () => {
    btns.forEach(b => mark(b, !sel && !b.disabled));
    slots.forEach((el, id) => mark(el, !!sel && id === sel && !el.classList.contains('is-done')));
    slots.forEach((el, id) => el.classList.toggle('is-target', !!sel && !el.classList.contains('is-done')));
  };
  const tr = tracker(step, ctx, () => { if (sel) slots.get(sel)?.classList.add('is-reveal'); });
  marks();
  host.querySelector('.sg-tray')!.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.sg-piece');
    if (!b || b.disabled || host.classList.contains('is-solved')) return;
    sel = b.dataset.piece!;
    btns.forEach(x => x.classList.toggle('is-on', x === b));
    ctx.sfx.tick!();
    marks();
  });
  const put = (el: SVGElement) => {
    if (host.classList.contains('is-solved') || el.classList.contains('is-done')) return;
    if (!sel) { bump(host.querySelector('.sg-tray'), 'is-nudge'); ctx.say('اختر قطعة من الأسفل أولاً ✂️'); return; }
    if (el.dataset.slot !== sel) { missed.add(sel); tr.miss(el); return; }
    ctx.sfx.tap();
    el.classList.add('is-done');
    el.classList.remove('is-reveal');
    bump(el, 'is-pop');
    const b = btns.find(x => x.dataset.piece === sel)!;
    b.disabled = true; b.classList.remove('is-on'); b.classList.add('is-used');
    if (pieces[sel].say) ctx.say(pieces[sel].say!);
    sel = null;
    if (!left().length) {
      marks();
      ctx.sfx.good();
      host.querySelector('.sg-board')!.classList.add('is-done');
      finish(host, step, ctx, resolve, (ids.length - missed.size) / ids.length);
      return;
    }
    marks();
  };
  const board = host.querySelector<HTMLElement>('.sg-board')!;
  board.addEventListener('click', e => { const el = (e.target as Element).closest<SVGElement>('[data-slot]'); if (el) put(el); });
  board.addEventListener('keydown', e => { const el = (e.target as Element).closest<SVGElement>('[data-slot]'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); put(el); } });
}

// ---------------------------------------------------------------- pattern
const bead = (c: string) => `<circle cx="20" cy="20" r="14" fill="${c}" stroke="#3b2414" stroke-width="2.5"/><circle cx="15" cy="15" r="4" fill="#fff" opacity=".6"/>`;
const sq = (a: string, b: string, flip?: number) => `<rect width="40" height="40" fill="${a}"/><path d="${flip ? 'M0 0 H40 L0 40Z' : 'M40 0 V40 H0Z'}" fill="${b}"/>`;
export const TILES: Record<string, string> = {
  'b-red': bead('#e8453c'), 'b-yellow': bead('#ffd23f'), 'b-blue': bead('#2f7fd6'), 'b-green': bead('#34b04a'), 'b-white': bead('#ffffff'), 'b-black': bead('#1f1612'), 'b-orange': bead('#f28c1a'),
  'tr-ry': sq('#e8453c', '#ffd23f'), 'tr-by': sq('#2f7fd6', '#ffd23f', 1), 'tr-gk': sq('#34b04a', '#1f1612'), 'tr-rb': sq('#e8453c', '#2f7fd6', 1), 'tr-yk': sq('#ffd23f', '#1f1612', 1),
  zig: '<rect width="40" height="40" fill="#fff"/><path d="M0 28 L10 12 L20 28 L30 12 L40 28" fill="none" stroke="#1f1612" stroke-width="4"/>',
  wave: '<rect width="40" height="40" fill="#fff"/><path d="M0 20 Q10 8 20 20 T40 20" fill="none" stroke="#1f1612" stroke-width="4"/>',
  stripes: '<rect width="40" height="40" fill="#fff"/><path d="M8 4 V36 M20 4 V36 M32 4 V36" stroke="#1f1612" stroke-width="4"/>',
  dots: '<rect width="40" height="40" fill="#fff"/><circle cx="11" cy="11" r="5" fill="#1f1612"/><circle cx="29" cy="11" r="5" fill="#1f1612"/><circle cx="11" cy="29" r="5" fill="#1f1612"/><circle cx="29" cy="29" r="5" fill="#1f1612"/>',
  rings: '<rect width="40" height="40" fill="#fff"/><circle cx="20" cy="20" r="14" fill="none" stroke="#1f1612" stroke-width="3.5"/><circle cx="20" cy="20" r="6" fill="none" stroke="#1f1612" stroke-width="3.5"/>',
  checker: '<rect width="40" height="40" fill="#fff"/><rect width="20" height="20" fill="#1f1612"/><rect x="20" y="20" width="20" height="20" fill="#1f1612"/>',
  red: '<rect width="40" height="40" fill="#e8453c"/>',
  petal: '<rect width="40" height="40" fill="#fff7e6"/><path d="M20 4 Q34 20 20 36 Q6 20 20 4Z" fill="#f28c1a"/><path d="M20 10 Q27 20 20 30 Q13 20 20 10Z" fill="#ffd23f"/>',
  dot: '<rect width="40" height="40" fill="#fff7e6"/><circle cx="20" cy="20" r="8" fill="#2fb3a8"/><circle cx="20" cy="20" r="3" fill="#fff"/>',
  leaf: '<rect width="40" height="40" fill="#fff7e6"/><path d="M8 32 Q8 8 32 8 Q32 32 8 32Z" fill="#34b04a"/><path d="M10 30 L28 12" stroke="#1f6a34" stroke-width="2"/>',
  tri: '<rect width="40" height="40" fill="#fff7e6"/><path d="M20 6 L34 32 H6Z" fill="#8a4fc9"/>',
  'st-k': '<rect width="40" height="40" fill="#3b3640"/>', 'st-w': '<rect width="40" height="40" fill="#f3e6c8"/>', 'st-y': '<rect width="40" height="40" fill="#e0b860"/>',
  'x-red': '<rect width="40" height="40" fill="#fff8ec"/><path d="M8 8 L32 32 M32 8 L8 32" stroke="#c7373f" stroke-width="5" stroke-linecap="round"/>',
  'x-green': '<rect width="40" height="40" fill="#fff8ec"/><path d="M8 8 L32 32 M32 8 L8 32" stroke="#2f8a3f" stroke-width="5" stroke-linecap="round"/>',
  diamond: '<rect width="40" height="40" fill="#fff8ec"/><path d="M20 5 L34 20 L20 35 L6 20Z" fill="#c7373f"/><path d="M20 13 L27 20 L20 27 L13 20Z" fill="#ffd23f"/>',
};
const tileSVG = (id: string) => `<svg viewBox="0 0 40 40" aria-hidden="true">${TILES[id] || ''}</svg>`;
function pattern(step: PatternStep, host: HTMLElement, ctx: StepCtx, resolve: Resolve) {
  const seq = step.seq, hide = step.hide || 2, start = seq.length - hide;
  const opts = shuffle([...new Set([...seq, ...(step.extra || [])])]);
  host.innerHTML = `<div class="lq sg-pattern${step.look ? ` sg-pattern--${step.look}` : ''}">${ask(step.q)}
    <div class="sg-row">${seq.map((id, k) => `<span class="sg-tile${k >= start ? ' sg-tile--blank' : ''}">${k >= start ? '<b>?</b>' : tileSVG(id)}</span>`).join('')}</div>
    <div class="sg-opts">${opts.map(id => `<button class="sg-opt" data-tile="${id}">${tileSVG(id)}</button>`).join('')}</div></div>`;
  const cells = [...host.querySelectorAll('.sg-tile')], btns = [...host.querySelectorAll<HTMLButtonElement>('.sg-opt')];
  let i = start, missed = 0, missedHere = false;
  const marks = () => {
    cells.forEach((c, k) => c.classList.toggle('is-now', k === i));
    btns.forEach(b => { mark(b, b.dataset.tile === seq[i]); b.classList.remove('is-reveal'); });
    missedHere = false;
  };
  const tr = tracker(step, ctx, () => btns.find(b => b.dataset.tile === seq[i])?.classList.add('is-reveal'));
  marks();
  host.querySelector('.sg-opts')!.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.sg-opt');
    if (!b || host.classList.contains('is-solved')) return;
    if (b.dataset.tile !== seq[i]) { if (!missedHere) { missedHere = true; missed += 1; } tr.miss(b); return; }
    ctx.sfx.tap();
    cells[i].innerHTML = tileSVG(seq[i]);
    cells[i].classList.remove('sg-tile--blank');
    bump(cells[i], 'is-pop');
    i += 1;
    if (i < seq.length) { marks(); return; }
    cells.forEach(c => c.classList.remove('is-now'));
    btns.forEach(x => mark(x, false));
    host.querySelector('.sg-row')!.classList.add('is-done');
    ctx.sfx.good();
    finish(host, step, ctx, resolve, (hide - missed) / hide);
  });
}

// ---------------------------------------------------------------- mirror
function mirror(step: MirrorStep, host: HTMLElement, ctx: StepCtx, resolve: Resolve) {
  const half = step.grid, H = half.length, Wh = half[0].length, W = Wh * 2;
  const base = step.base || '';
  const col = (ch: string) => step.colors[ch] || 'transparent';
  let cells = '';
  const targets: string[] = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const left = c < Wh, ch = left ? half[r][c] : half[r][W - 1 - c];
    if (left || ch === '.' || base.includes(ch)) cells += `<span class="sg-cell${left ? ' sg-cell--given' : ''}" style="--c:${ch === '.' ? 'transparent' : col(ch)}"></span>`;
    else { targets.push(`${r}-${c}`); cells += `<button class="sg-cell sg-cell--todo" data-cell="${r}-${c}" data-ch="${ch}" aria-label="مربّع"></button>`; }
  }
  for (let r = 0; r < H; r++) for (let c = Wh; c < W; c++) {
    const ch = half[r][W - 1 - c];
    if (ch === '.') cells = cells; // empty on both sides: a wrong tap there
  }
  host.innerHTML = `<div class="lq sg-mirror">${ask(step.q)}
    <div class="sg-grid" style="--w:${W};--h:${H}">${cells}<i class="sg-grid__axis" aria-hidden="true"></i></div>
    <small class="lq-left sg-left"></small></div>`;
  // Empty cells on the right side are buttons too (a tap there is a slip).
  const grid = host.querySelector<HTMLElement>('.sg-grid')!;
  [...grid.children as HTMLCollectionOf<HTMLElement>].forEach((el, k) => {
    const r = Math.floor(k / W), c = k % W;
    if (el.tagName === 'SPAN' && c >= Wh && !el.style.getPropertyValue('--c').includes('#')) { el.setAttribute('data-empty', ''); el.setAttribute('role', 'button'); }
  });
  const todo = [...host.querySelectorAll<HTMLButtonElement>('.sg-cell--todo')], left = host.querySelector('.sg-left')!;
  let misses = 0;
  const marks = () => { todo.forEach(b => mark(b, !b.classList.contains('is-done'))); left.textContent = `${num(todo.filter(b => b.classList.contains('is-done')).length)} / ${num(todo.length)}`; };
  const tr = tracker(step, ctx, () => todo.find(b => !b.classList.contains('is-done'))?.classList.add('is-reveal'));
  marks();
  grid.addEventListener('click', e => {
    if (host.classList.contains('is-solved')) return;
    const b = (e.target as Element).closest<HTMLButtonElement>('.sg-cell--todo');
    if (b) {
      if (b.classList.contains('is-done')) return;
      ctx.sfx.tick!();
      b.style.setProperty('--c', col(b.dataset.ch!));
      b.classList.add('is-done'); b.classList.remove('is-reveal');
      bump(b, 'is-pop');
      marks();
      if (todo.every(x => x.classList.contains('is-done'))) {
        grid.classList.add('is-done');
        ctx.sfx.good();
        finish(host, step, ctx, resolve, Math.max(0, 1 - misses / todo.length));
      }
      return;
    }
    const empty = (e.target as Element).closest('[data-empty]');
    if (empty) { misses += 1; tr.miss(empty); }
  });
}

// ---------------------------------------------------------------- gallery
function gallery(step: GalleryStep, host: HTMLElement, ctx: StepCtx, resolve: Resolve) {
  const frames = shuffle(step.frames);
  host.innerHTML = `<div class="lq sg-gallery">${ask(step.q)}
    <p class="lq-find">👆 <b></b></p>
    <div class="sg-wall" style="--n:${frames.length}">${frames.map(fr => `<button class="sg-frame" data-frame="${fr.id}"><span class="sg-frame__pic">${artSVG(fr.art)}</span><small class="sg-frame__plate"></small></button>`).join('')}</div></div>`;
  const find = host.querySelector('.lq-find b')!, btns = [...host.querySelectorAll<HTMLButtonElement>('.sg-frame')];
  let i = 0, missed = 0, missedHere = false;
  const marks = () => {
    find.innerHTML = step.ask[i][1];
    bump(find, 'is-pop');
    btns.forEach(b => { mark(b, b.dataset.frame === step.ask[i][0]); b.classList.remove('is-reveal'); });
    missedHere = false;
  };
  const tr = tracker(step, ctx, () => btns.find(b => b.dataset.frame === step.ask[i][0])?.classList.add('is-reveal'));
  marks();
  host.querySelector('.sg-wall')!.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.sg-frame');
    if (!b || host.classList.contains('is-solved')) return;
    if (b.dataset.frame !== step.ask[i][0]) { if (!missedHere) { missedHere = true; missed += 1; } tr.miss(b); return; }
    ctx.sfx.tap();
    const plate = b.querySelector('.sg-frame__plate')!;
    plate.innerHTML = step.ask[i][2] || '✓';
    b.classList.add('is-found');
    bump(b, 'is-pop');
    i += 1;
    if (i < step.ask.length) { marks(); return; }
    host.querySelector('.lq-find')!.remove();
    btns.forEach(x => mark(x, false));
    ctx.sfx.good();
    finish(host, step, ctx, resolve, (step.ask.length - missed) / step.ask.length);
  });
}

// ---------------------------------------------------------------- press
const MARKS: Record<string, string> = {
  leaf: 'M-10 6 Q-10 -10 10 -10 Q10 6 -10 6Z M-8 4 L8 -8',
  flower: 'M0 -9a4 4 0 1 1 0.1 0Z M8 -2a4 4 0 1 1 0.1 0Z M5 8a4 4 0 1 1 0.1 0Z M-5 8a4 4 0 1 1 0.1 0Z M-8 -2a4 4 0 1 1 0.1 0Z M0 0a3 3 0 1 1 0.1 0Z',
  finger: 'M-6 -9 Q0 -13 6 -9 L6 9 Q0 13 -6 9Z',
  lace: 'M-12 0a3 3 0 1 1 0.1 0Z M-4 0a3 3 0 1 1 0.1 0Z M4 0a3 3 0 1 1 0.1 0Z M12 0a3 3 0 1 1 0.1 0Z M-8 -6a2 2 0 1 1 0.1 0Z M0 -6a2 2 0 1 1 0.1 0Z M8 -6a2 2 0 1 1 0.1 0Z',
  coil: 'M-10 0 a10 10 0 1 0 20 0 a7 7 0 1 0 -14 0 a4 4 0 1 0 8 0',
  dots: 'M-8 -6a2.6 2.6 0 1 1 0.1 0Z M0 -6a2.6 2.6 0 1 1 0.1 0Z M8 -6a2.6 2.6 0 1 1 0.1 0Z M-4 2a2.6 2.6 0 1 1 0.1 0Z M4 2a2.6 2.6 0 1 1 0.1 0Z M0 9a2.6 2.6 0 1 1 0.1 0Z',
  stamp: 'M0 -11 L3 -3 L11 -3 L5 2 L7 10 L0 5 L-7 10 L-5 2 L-11 -3 L-3 -3Z',
};
const TOOL_ICON: Record<string, string> = { leaf: '🍃', flower: '🌸', finger: '👆', lace: '🧵', coil: '🌀', dots: '⚪', stamp: '⭐' };
function press(step: PressStep, host: HTMLElement, ctx: StepCtx, resolve: Resolve) {
  const tasks = step.tasks, spots = [[56, 52], [126, 50], [196, 54], [264, 50], [90, 112], [230, 112]];
  host.innerHTML = `<div class="lq sg-press">${ask(step.q)}
    <p class="lq-find sg-task"><span class="sg-press__tool"></span> <b></b></p>
    <div class="lq-pic"><svg class="sv sg-slab" viewBox="0 0 320 160" role="img" aria-label="لوح صلصال">
      <defs><filter id="sg-sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.6" dy="2.2" stdDeviation="1.2" flood-color="#6b5432" flood-opacity=".55"/></filter>
      <filter id="sg-in" x="-30%" y="-30%" width="160%" height="160%"><feOffset dx="-1.4" dy="-1.8"/><feGaussianBlur stdDeviation="1"/><feComposite operator="out" in="SourceGraphic"/><feComponentTransfer><feFuncA type="linear" slope=".8"/></feComponentTransfer><feFlood flood-color="#5a4426"/><feComposite operator="in" in2="SourceGraphic"/><feComposite operator="over" in2="SourceGraphic"/></filter></defs>
      <rect x="10" y="10" width="300" height="140" rx="22" fill="#cdb48c"/><rect x="16" y="14" width="288" height="128" rx="18" fill="#dcc6a0"/>
      <g class="sg-marks"></g></svg></div>
    <div class="sg-acts"><button class="sg-act" data-act="in"><span>⬇️</span><b>أضغطه في السطح</b><small>تأثير غائر</small></button><button class="sg-act" data-act="on"><span>⬆️</span><b>أُلصقه فوق السطح</b><small>تأثير نافر</small></button></div></div>`;
  const task = host.querySelector('.sg-task b')!, tool = host.querySelector('.sg-press__tool')!, marksG = host.querySelector('.sg-marks')!;
  const acts = [...host.querySelectorAll<HTMLButtonElement>('.sg-act')];
  let i = 0, missed = 0, missedHere = false, busy = false;
  const show = () => {
    task.innerHTML = tasks[i].text;
    tool.textContent = TOOL_ICON[tasks[i].tool] || '✋';
    bump(task.parentElement, 'is-pop');
    acts.forEach(b => { mark(b, b.dataset.act === tasks[i].want); b.classList.remove('is-reveal'); });
    missedHere = false;
  };
  const tr = tracker(step, ctx, () => acts.find(b => b.dataset.act === tasks[i].want)?.classList.add('is-reveal'));
  show();
  host.querySelector('.sg-acts')!.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.sg-act');
    if (!b || busy || host.classList.contains('is-solved')) return;
    if (b.dataset.act !== tasks[i].want) { if (!missedHere) { missedHere = true; missed += 1; } tr.miss(b); return; }
    ctx.sfx.tap();
    const [x, y] = spots[i % spots.length], d = MARKS[tasks[i].tool] || MARKS.finger, inward = tasks[i].want === 'in';
    marksG.insertAdjacentHTML('beforeend', `<g class="sg-mark sg-mark--${inward ? 'in' : 'on'}" transform="translate(${x} ${y}) scale(1.5)">
      <path d="${d}" fill="${inward ? '#b09872' : '#efe0c2'}" stroke="${inward ? '#8a7450' : '#fff6e2'}" stroke-width="${tasks[i].tool === 'coil' ? 3.4 : 0.8}" ${tasks[i].tool === 'coil' ? 'fill-opacity="0"' : ''} filter="url(#${inward ? 'sg-in' : 'sg-sh'})"/>
      <text class="sg-mark__t" y="22">${inward ? 'غائر' : 'نافر'}</text></g>`);
    busy = true;
    acts.forEach(x2 => mark(x2, false));
    later(() => {
      busy = false;
      i += 1;
      if (i < tasks.length) { show(); return; }
      ctx.sfx.good();
      finish(host, step, ctx, resolve, (tasks.length - missed) / tasks.length);
    }, 500);
  });
}

// ---------------------------------------------------------------- craft
function craft(step: CraftStep, host: HTMLElement, ctx: StepCtx, resolve: Resolve) {
  const view: ArtView = VIEWS[step.view];
  host.innerHTML = `<div class="lq sg-craft">${ask(step.q)}
    <p class="lq-find sg-task">👆 <b></b></p>
    <div class="lq-pic sg-work">${view.html(step)}</div>
    <div class="sg-tools sg-tools--craft">${shuffle(step.tools).map(t => `<button class="sg-tool" data-tool="${t.id}"><span>${t.icon}</span><small>${t.label}</small></button>`).join('')}</div>
    <div class="sg-steps">${step.seq.map(() => '<i></i>').join('')}</div></div>`;
  const task = host.querySelector('.sg-task b')!, work = host.querySelector<SVGSVGElement>('.sg-work > svg'), btns = [...host.querySelectorAll<HTMLButtonElement>('.sg-tool')], dots = [...host.querySelectorAll('.sg-steps i')];
  let i = 0, missed = 0, missedHere = false;
  const stage = () => {
    work?.querySelectorAll<SVGElement>('[data-from]').forEach(el => { el.style.display = +el.dataset.from! <= i ? '' : 'none'; });
    work?.querySelectorAll<SVGElement>('[data-until]').forEach(el => { if (+el.dataset.until! <= i) el.style.display = 'none'; });
    if (work) work.dataset.st = String(i);
  };
  const show = () => {
    task.innerHTML = step.seq[i].text;
    bump(task, 'is-pop');
    btns.forEach(b => { mark(b, b.dataset.tool === step.seq[i].tool); b.classList.remove('is-reveal'); });
    dots.forEach((d, k) => { d.classList.toggle('is-on', k < i); d.classList.toggle('is-now', k === i); });
    missedHere = false;
  };
  const tr = tracker(step, ctx, () => btns.find(b => b.dataset.tool === step.seq[i].tool)?.classList.add('is-reveal'));
  stage(); show();
  host.querySelector('.sg-tools')!.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.sg-tool');
    if (!b || host.classList.contains('is-solved')) return;
    if (b.dataset.tool !== step.seq[i].tool) { if (!missedHere) { missedHere = true; missed += 1; } tr.miss(b); return; }
    ctx.sfx.tap();
    bump(b, 'is-pop');
    if (step.seq[i].say) ctx.say(step.seq[i].say!);
    i += 1;
    stage();
    if (i < step.seq.length) { show(); return; }
    dots.forEach(d => { d.classList.add('is-on'); d.classList.remove('is-now'); });
    task.innerHTML = step.doneText || '✨ تمّ العمل!';
    btns.forEach(x => mark(x, false));
    ctx.sfx.good();
    finish(host, step, ctx, resolve, (step.seq.length - missed) / step.seq.length);
  });
}

export const KINDS: {
  mix: StepFn<MixStep>; paint: StepFn<PaintStep>; vanish: StepFn<VanishStep>; fold: StepFn<FoldStep>; collage: StepFn<CollageStep>;
  pattern: StepFn<PatternStep>; mirror: StepFn<MirrorStep>; gallery: StepFn<GalleryStep>; press: StepFn<PressStep>; craft: StepFn<CraftStep>;
} = { mix, paint, vanish, fold, collage, pattern, mirror, gallery, press, craft };

// The pictures as functions of a step, for «أتعلّم» and the shared questions
// (a `pic` or a `label` view); and every little painting, for cards.
const htmlOf: Record<string, View> = Object.fromEntries(Object.entries<ArtView>(VIEWS).map(([k, v]) => [k, (st: Step) => v.html(st)]));
htmlOf.art = (st: Step) => `<div class="sg-pic">${artSVG(st.art)}</div>`;
let ARTS: Record<string, string> | null = null;
const arts = () => (ARTS ||= Object.fromEntries(Object.keys(ART).map(k => [k, artSVG(k)])));

export const runStep: RunStep = makeRunStep({ games: KINDS, views: htmlOf, exploreOpts: () => ({ art: arts() }) });
export const CUSTOM_KINDS: string[] = Object.keys(KINDS);
export const VIEW_NAMES: string[] = Object.keys(htmlOf);
