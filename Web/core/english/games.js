// The English island's steps (worlds/grade6/english.js lists the kinds):
// «أتعلّم» (core/learn/explore.js) shaped as the unit's words, the book's
// grammar box or a reading; the shared questions (core/learn/steps.js); and
// the island's own hands-on games: listen, picture, build, spell, verb,
// memory, odd, rank, adjorder and chat.
//
//   runStep(step, host, ctx) → Promise<{ ok, total }>
//
// English always reads left to right inside the right-to-left game: the
// games draw it in dir="ltr" boxes, and the shared questions get their
// direction set by fixDir() as they draw. Each English answer is read aloud
// once it is right (core/voice.js), when the phone has an English voice;
// without one, a listening game shows the word instead.
//
// Test hook (as in core/learn/steps.js): what is right to tap next carries
// data-ok (and data-step in the games played in several taps); «تابِع»
// carries data-next data-step. ok = the share right on the first try.

import { explore } from '../learn/explore.js';
import { runQuestion } from '../learn/steps.js';
import { canSpeak, speak } from '../voice.js';
import { num } from '../format.js';
import { save } from '../save.js';
import { EN_VIEWS, picHTML, isPicture, escAttr } from './views.js';
import { QUESTS } from '../../worlds/grade6/english.js';

const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
const later = (fn, ms) => setTimeout(fn, TEST ? 0 : ms);
const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bump = (el, cls = 'is-shake') => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const strip = h => String(h).replace(/<[^>]*>/g, '');
const LATIN = /[A-Za-z]/g, ARABIC = /[؀-ۿ]/g;
export const isEnglish = t => { const s = strip(t); const l = (s.match(LATIN) || []).length; return l > 0 && l >= (s.match(ARABIC) || []).length * 2; };
const EN = t => `<bdi class="en" dir="ltr" lang="en">${t}</bdi>`;

// ---------- Voice ----------
export const hasVoice = () => canSpeak('en');
export const sayEn = t => { if (t && canSpeak('en')) speak(strip(t).replace(/\*/g, ''), 'en'); };

// ---------- The words met so far (the word book, words.js) ----------
function markSeen(step) {
  const q = QUESTS.find(x => x.steps.includes(step));
  if (!q) return;
  save.update(s => {
    const e = ((s.world ||= {}).english ||= {});
    if (!(e.seen ||= []).includes(q.id)) e.seen.push(q.id);
  });
}

// ---------- Shared bits ----------
function tracker(step, ctx, reveal) {
  let misses = 0;
  return {
    get misses() { return misses; },
    miss(el) {
      misses += 1;
      ctx.sfx.bad();
      bump(el);
      if (misses === 1) ctx.say(step.hint, 'oops');
      else { ctx.say(`${step.hint} <b>انظر إلى ما يلمع ✨</b>`, 'think'); reveal?.(); }
    },
  };
}
function finish(host, step, ctx, resolve, ok) {
  if (step.explain) ctx.say(step.explain, ok >= 1 ? 'cheer' : 'happy');
  host.classList.add('is-solved');
  host.querySelectorAll('[data-ok]').forEach(x => x.removeAttribute('data-ok'));
  host.querySelectorAll('[data-step]').forEach(x => x.removeAttribute('data-step'));
  const foot = document.createElement('div');
  foot.className = 'lq-foot';
  foot.innerHTML = '<button class="btn btn--gold lq-next" data-next data-step>تابِع ◀</button>';
  host.firstElementChild.append(foot);
  const b = foot.querySelector('button');
  b.focus({ preventScroll: true });
  b.addEventListener('click', () => { ctx.sfx.tap(); resolve({ ok: Math.max(0, Math.min(1, ok)), total: 1 }); }, { once: true });
}
const ask = (step, fallback) => `<p class="lq-ask">${step.q || fallback}</p>`;
const left = (i, n) => `${num(i + 1)} / ${num(n)}`;
// Rounds: each counts as right if it had no slip.
function rounds(n) {
  let missed = 0, here = false;
  return { slip() { if (!here) { here = true; missed += 1; } }, next() { here = false; }, get ok() { return (n - missed) / n; } };
}

// ---------- «أتعلّم» ----------
const VIEW_HTML = Object.fromEntries(Object.entries(EN_VIEWS).map(([k, v]) => [k, step => v.html(step)]));
const mark = (sentence, word) => {
  const w = word.toLowerCase().replace(/^(the|a|an|to) /, '');
  const stem = w.length > 4 ? w.replace(/(s|es|ing|ed|y)$/, '') : w;
  const re = new RegExp(`\\b(${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z]*)`, 'i');
  return sentence.replace(re, '<mark>$1</mark>');
};
const sayBtn = text => (hasVoice() ? `<button class="en-say" data-say="${escAttr(strip(text))}" aria-label="استمع">🔊</button>` : '');

function exploreStep(step, host, ctx, resolve) {
  const art = {};
  let s = step, tap;
  if (step.words) {
    markSeen(step);
    const spots = step.words.map(([w, ar, pic, ex], i) => {
      const id = step.view ? w.toLowerCase().replace(/^the /, '') : `w${i}`;
      const picture = /^(art:|p:)/.test(pic) ? { art: pic } : { icon: pic };
      if (picture.art) art[pic] = picHTML(pic).replace(/^<span[^>]*>|<\/span>$/g, '');
      return { id, ...picture, label: EN(w), title: `${EN(w)} <span class="en-ar">${ar}</span>`, text: `<span class="en-ex">${EN(mark(ex, w))}</span>${sayBtn(`${w}. ${ex}`)}`, en: `${w}. ${ex}` };
    });
    s = { ...step, spots, cols: step.cols || 3 };
    tap = hasVoice() ? 'اضغط على كل بطاقة لتسمع الكلمة وتراها في جملة من الكتاب 🔊' : 'اضغط على كل بطاقة لترى معناها وجملتها من الكتاب';
  } else if (step.rule) {
    s = { ...step, view: 'rule', spots: step.rule.rows.map(([e, ar], i) => ({ id: `r${i}`, title: EN(e), text: `${ar}${sayBtn(e)}`, en: e })) };
    tap = 'اضغط على كل جملة من جمل الكتاب لتفهم القاعدة';
  } else if (step.read) {
    const words = [...step.read.text.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
    s = { ...step, view: 'read', spots: words.map((w, i) => ({ id: `g${i}`, title: EN(w), text: `${step.read.gloss[w]}${sayBtn(w)}`, en: w })) };
    tap = 'اقرأ، واضغط على كل كلمة ملوّنة لتعرف معناها';
  }
  explore({ ...s, tap: step.tap || tap }, host, ctx, resolve, {
    views: VIEW_HTML, art,
    onSpot: (spot, el) => { el.classList.add('is-heard'); sayEn(spot.en); ctx.onSpot?.(step, spot); },
  });
  if (step.read && hasVoice()) {
    const b = document.createElement('button');
    b.className = 'en-say en-say--all';
    b.dataset.say = strip(step.read.text.replace(/[[\]]/g, ''));
    b.textContent = '🔊 اقرأ لي النص';
    host.querySelector('.lx-view')?.append(b);
  }
  host.addEventListener('click', e => { const b = e.target.closest('.en-say'); if (b) { e.stopPropagation(); sayEn(b.dataset.say); } }, true);
}

// ---------- The shared questions, in English ----------
const DIR_SEL = '.lq-opt, .lq-lines li, .lq-tf__s, .lq-tf__fix, .lq-item b, .lq-match__l li, .lq-match__got, .lq-seq__slot small, .lq-bin__head, .lq-find b';
export function fixDir(root) {
  for (const el of root.querySelectorAll(DIR_SEL)) {
    if (isEnglish(el.textContent)) { if (el.dir !== 'ltr') { el.dir = 'ltr'; el.lang = 'en'; } } else if (el.hasAttribute('dir')) { el.removeAttribute('dir'); el.removeAttribute('lang'); }
  }
}
function watchShared(host) {
  let queued = false;
  const fix = () => { queued = false; fixDir(host); };
  const obs = new MutationObserver(list => {
    if (!queued) { queued = true; requestAnimationFrame(fix); }
    for (const m of list) {
      const t = m.target;
      if (m.type === 'attributes' && t.classList) {
        const had = cls => (m.oldValue || '').split(' ').includes(cls);
        if (t.classList.contains('is-right') && !had('is-right')) {
          const tf = t.closest('.lq')?.querySelector('.lq-tf__s');
          if (tf) setTimeout(() => { const fx = host.querySelector('.lq-tf__fix:not([hidden])'); const txt = fx ? fx.textContent.replace('✏️', '') : tf.textContent; if (isEnglish(txt)) sayEn(txt); }, 0);
          else if (isEnglish(t.textContent)) sayEn(t.textContent);
        }
        if (t.classList.contains('lq-slot') && t.classList.contains('is-filled') && !had('is-filled')) { const li = t.closest('li'); if (li && isEnglish(li.textContent)) sayEn(li.textContent); }
      } else if (m.type === 'childList') {
        for (const n of m.addedNodes) if (n.classList?.contains('lq-match__got')) { const li = n.closest('li'); if (li && isEnglish(li.textContent)) sayEn(li.textContent); }
      }
    }
    if (!host.isConnected) obs.disconnect();
  });
  obs.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  requestAnimationFrame(fix);
}

// ---------- listen · picture: hear (or read) a word, tap its picture; or the other way ----------
function pick(step, host, ctx, resolve) {
  const mode = step.kind === 'listen' ? 'listen' : step.mode === 'word' ? 'word' : 'pic';
  const voice = mode === 'listen' && hasVoice();
  const list = shuffle(step.items).slice(0, Math.min(step.ask || 5, step.items.length));
  const nOpts = Math.min(step.opts || 4, step.items.length);
  const fallback = mode === 'word' ? 'انظر إلى الصورة، ثم اضغط على الكلمة الصحيحة' : voice ? 'استمع، ثم اضغط على الصورة الصحيحة 🔊' : 'اقرأ، ثم اضغط على الصورة الصحيحة 👀';
  host.innerHTML = `<div class="lq en-pick en-pick--${mode}">${ask(step, fallback)}
    <div class="en-prompt"></div><div class="en-opts"></div><small class="lq-left"></small></div>`;
  const prompt = host.querySelector('.en-prompt'), box = host.querySelector('.en-opts'), count = host.querySelector('.lq-left');
  let i = 0;
  const r = rounds(list.length);
  const tr = tracker(step, ctx, () => box.querySelector('[data-ok]')?.classList.add('is-reveal'));
  const show = () => {
    const [word, pic] = list[i];
    const opts = shuffle([list[i], ...shuffle(step.items.filter(x => x !== list[i])).slice(0, nOpts - 1)]);
    if (mode === 'word') prompt.innerHTML = `<div class="en-prompt__pic">${picHTML(pic)}</div>`;
    else if (voice) prompt.innerHTML = `<button class="en-ear" aria-label="استمع مرة أخرى">🔊</button><bdi class="en-heard" dir="ltr" lang="en" hidden>${word}</bdi>`;
    else prompt.innerHTML = `<bdi class="en-heard en-heard--show" dir="ltr" lang="en">${word}</bdi>`;
    box.className = `en-opts en-opts--${mode === 'word' ? 'word' : 'pic'}${opts.length > 4 ? ' is-many' : ''}`;
    box.innerHTML = opts.map(([w, p]) => mode === 'word'
      ? `<button class="en-opt en-opt--word" dir="ltr" lang="en" data-say="${escAttr(w)}" ${w === word ? 'data-ok' : ''}>${w}</button>`
      : `<button class="en-opt en-opt--pic" ${w === word ? 'data-ok' : ''} aria-label="صورة">${picHTML(p)}<bdi class="en-opt__w" dir="ltr" lang="en"></bdi></button>`).join('');
    count.textContent = left(i, list.length);
    r.next();
    bump(prompt, 'is-pop');
    if (voice) later(() => sayEn(word), 250);
  };
  show();
  prompt.addEventListener('click', e => { if (e.target.closest('.en-ear')) { ctx.sfx.tick(); sayEn(list[i][0]); } });
  box.addEventListener('click', e => {
    const b = e.target.closest('.en-opt');
    if (!b || b.disabled || host.classList.contains('is-solved') || box.classList.contains('is-busy')) return;
    if (!('ok' in b.dataset)) { b.disabled = true; r.slip(); tr.miss(b); return; }
    const [word] = list[i];
    b.classList.add('is-right');
    b.removeAttribute('data-ok');
    const w = b.querySelector('.en-opt__w'); if (w) w.textContent = word;
    const heard = prompt.querySelector('.en-heard'); if (heard) heard.hidden = false;
    sayEn(word);
    i += 1;
    if (i < list.length) { ctx.sfx.tap(); box.classList.add('is-busy'); later(() => { box.classList.remove('is-busy'); show(); }, 900); return; }
    ctx.sfx.good();
    finish(host, step, ctx, resolve, r.ok);
  });
}

// ---------- build: tap the tiles in order, left to right ----------
function build(step, host, ctx, resolve) {
  const items = step.items;
  host.innerHTML = `<div class="lq en-build">${ask(step, 'اضغط على الكلمات بالترتيب لتبني جملة الكتاب')}
    <div class="en-build__line" dir="ltr" lang="en"></div><p class="en-build__ar"></p>
    <div class="en-tiles" dir="ltr" lang="en"></div><small class="lq-left"></small></div>`;
  const line = host.querySelector('.en-build__line'), arEl = host.querySelector('.en-build__ar'), box = host.querySelector('.en-tiles'), count = host.querySelector('.lq-left');
  let k = 0, pos = 0, tiles = [];
  const r = rounds(items.length);
  const tr = tracker(step, ctx, () => box.querySelector('[data-ok]')?.classList.add('is-reveal'));
  const markNext = () => {
    const btns = [...box.querySelectorAll('.en-tile:not(.is-used)')];
    btns.forEach(b => { b.removeAttribute('data-ok'); b.removeAttribute('data-step'); b.classList.remove('is-reveal'); });
    const want = btns.find(b => b.dataset.t === tiles[pos]);
    if (want) { want.setAttribute('data-ok', ''); want.setAttribute('data-step', ''); }
  };
  const show = () => {
    const it = items[k];
    tiles = it.tiles || it.en.split(' ');
    pos = 0;
    let order = shuffle(tiles.map((t, j) => j));
    for (let g = 0; g < 8 && tiles.length > 2 && order.every((j, n) => tiles[j] === tiles[n]); g++) order = shuffle(order);
    line.innerHTML = tiles.map(() => '<i class="en-build__ghost"></i>').join('');
    line.classList.remove('is-done');
    arEl.textContent = ''; arEl.hidden = true;
    box.innerHTML = order.map(j => `<button class="en-tile" data-t="${escAttr(tiles[j])}" data-say="${escAttr(tiles[j])}">${tiles[j]}</button>`).join('');
    count.textContent = left(k, items.length);
    r.next();
    markNext();
  };
  show();
  box.addEventListener('click', e => {
    const b = e.target.closest('.en-tile');
    if (!b || b.classList.contains('is-used') || host.classList.contains('is-solved') || box.classList.contains('is-busy')) return;
    if (b.dataset.t !== tiles[pos]) { r.slip(); tr.miss(b); return; }
    ctx.sfx.tick();
    b.classList.add('is-used'); b.disabled = true;
    const ghost = line.querySelector('.en-build__ghost');
    const span = document.createElement('span');
    span.className = 'en-built';
    span.textContent = tiles[pos];
    ghost.replaceWith(span);
    if (pos) span.before(' ');
    pos += 1;
    if (pos < tiles.length) { markNext(); return; }
    line.classList.add('is-done');
    const it = items[k];
    if (it.ar) { arEl.textContent = it.ar; arEl.hidden = false; }
    sayEn(it.en);
    ctx.sfx.good();
    k += 1;
    if (k < items.length) { box.classList.add('is-busy'); later(() => { box.classList.remove('is-busy'); show(); }, 1400); return; }
    finish(host, step, ctx, resolve, r.ok);
  });
}

// ---------- spell: tap the letters ----------
const ABC = 'abcdefghijklmnopqrstuvwxyz';
function spell(step, host, ctx, resolve) {
  const items = step.items;
  host.innerHTML = `<div class="lq en-spell">${ask(step, 'اضغط على الحروف بالترتيب لتكتب الكلمة')}
    <div class="en-spell__clue"></div><div class="en-slots" dir="ltr" lang="en"></div>
    <div class="en-letters" dir="ltr" lang="en"></div><small class="lq-left"></small></div>`;
  const clue = host.querySelector('.en-spell__clue'), slots = host.querySelector('.en-slots'), box = host.querySelector('.en-letters'), count = host.querySelector('.lq-left');
  let k = 0, pos = 0, word = '';
  const r = rounds(items.length);
  const tr = tracker(step, ctx, () => box.querySelector('[data-ok]')?.classList.add('is-reveal'));
  const markNext = () => {
    const btns = [...box.querySelectorAll('.en-letter:not(.is-used)')];
    btns.forEach(b => { b.removeAttribute('data-ok'); b.removeAttribute('data-step'); b.classList.remove('is-reveal'); });
    const want = btns.find(b => b.dataset.l === word[pos]);
    if (want) { want.setAttribute('data-ok', ''); want.setAttribute('data-step', ''); }
  };
  const show = () => {
    const it = items[k];
    word = it.en; pos = 0;
    clue.innerHTML = `${it.pic ? picHTML(it.pic) : ''}${it.show ? `<bdi class="en-spell__show" dir="ltr" lang="en">${it.show}</bdi>` : ''}${it.ar ? `<span class="en-spell__ar">${it.ar}</span>` : ''}`;
    const extra = [];
    for (let g = 0; extra.length < (step.extra ?? 2) && g < 50; g++) { const c = ABC[Math.floor(Math.random() * 26)]; if (!word.includes(c) && !extra.includes(c)) extra.push(c); }
    slots.innerHTML = [...word].map(() => '<span class="en-slot"></span>').join('');
    slots.classList.remove('is-done');
    box.innerHTML = shuffle([...word, ...extra]).map(c => `<button class="en-letter" data-l="${c}">${c}</button>`).join('');
    count.textContent = left(k, items.length);
    r.next();
    bump(clue, 'is-pop');
    markNext();
  };
  show();
  box.addEventListener('click', e => {
    const b = e.target.closest('.en-letter');
    if (!b || b.classList.contains('is-used') || host.classList.contains('is-solved') || box.classList.contains('is-busy')) return;
    if (b.dataset.l !== word[pos]) { r.slip(); tr.miss(b); return; }
    ctx.sfx.tick();
    b.classList.add('is-used'); b.disabled = true;
    const slot = slots.children[pos];
    slot.textContent = word[pos]; slot.classList.add('is-filled');
    pos += 1;
    if (pos < word.length) { markNext(); return; }
    slots.classList.add('is-done');
    sayEn(word);
    ctx.sfx.good();
    k += 1;
    if (k < items.length) { box.classList.add('is-busy'); later(() => { box.classList.remove('is-busy'); show(); }, 1100); return; }
    finish(host, step, ctx, resolve, r.ok);
  });
}

// ---------- verb: the right form in the gap (the time clue glows) ----------
const sentenceHTML = (t, base) => t.replace(/\*([^*]+)\*/g, '<mark class="en-clue">$1</mark>').replace('___', `<span class="en-gap">${base ? `<i>${base}</i>` : '…'}</span>`);
function verb(step, host, ctx, resolve) {
  const lines = step.lines;
  host.innerHTML = `<div class="lq en-verb">${ask(step, 'اختر الكلمة الصحيحة للفراغ')}
    <div class="en-sent" dir="ltr" lang="en"></div><div class="en-forms" dir="ltr" lang="en"></div><small class="lq-left"></small></div>`;
  const sent = host.querySelector('.en-sent'), box = host.querySelector('.en-forms'), count = host.querySelector('.lq-left');
  let i = 0;
  const r = rounds(lines.length);
  const tr = tracker(step, ctx, () => box.querySelector('[data-ok]')?.classList.add('is-reveal'));
  const show = () => {
    const [t, base, right, wrong] = lines[i];
    sent.innerHTML = sentenceHTML(t, base);
    sent.classList.remove('is-done');
    box.innerHTML = shuffle([right, ...wrong]).map(w => `<button class="en-form" data-say="${escAttr(w)}" ${w === right ? 'data-ok' : ''}>${w}</button>`).join('');
    count.textContent = left(i, lines.length);
    r.next();
    bump(sent, 'is-pop');
  };
  show();
  box.addEventListener('click', e => {
    const b = e.target.closest('.en-form');
    if (!b || b.disabled || host.classList.contains('is-solved') || box.classList.contains('is-busy')) return;
    if (!('ok' in b.dataset)) { b.disabled = true; r.slip(); tr.miss(b); return; }
    const [t, , right] = lines[i];
    b.classList.add('is-right'); b.removeAttribute('data-ok');
    const gap = sent.querySelector('.en-gap');
    gap.textContent = right; gap.classList.add('is-filled');
    sent.classList.add('is-done');
    sayEn(t.replace('___', right));
    i += 1;
    if (i < lines.length) { ctx.sfx.tap(); box.classList.add('is-busy'); later(() => { box.classList.remove('is-busy'); show(); }, 1100); return; }
    ctx.sfx.good();
    finish(host, step, ctx, resolve, r.ok);
  });
}

// ---------- memory: flip two cards that belong together ----------
function faceHTML(t, side) {
  if (side === 'b' && isPicture(t)) return picHTML(t);
  return isEnglish(t) ? EN(t) : `<span class="en-ar">${t}</span>`;
}
function memory(step, host, ctx, resolve) {
  const pairs = step.pairs;
  const cards = shuffle(pairs.flatMap(([a, b], k) => [{ k, side: 'a', t: a }, { k, side: 'b', t: b }]));
  host.innerHTML = `<div class="lq en-memory">${ask(step, 'اقلب بطاقتين في كل مرة، وابحث عن كل بطاقتين تتّفقان')}
    <div class="en-cards" style="--n:${cards.length}">${cards.map((c, i) => `<button class="en-card" data-i="${i}" data-say="${escAttr(isEnglish(c.t) ? c.t : '')}" aria-label="بطاقة"><span class="en-card__back">?</span><span class="en-card__face">${faceHTML(c.t, c.side)}</span></button>`).join('')}</div>
    <small class="lq-left"></small></div>`;
  const els = [...host.querySelectorAll('.en-card')], count = host.querySelector('.lq-left');
  const seen = new Set(), matched = new Set();
  let open = null, busy = false, slips = 0;
  const partner = i => cards.findIndex((c, j) => j !== i && c.k === cards[i].k);
  const markNext = () => {
    els.forEach(e => { e.removeAttribute('data-ok'); e.removeAttribute('data-step'); });
    const target = open != null ? partner(open) : cards.findIndex((c, i) => !matched.has(i));
    if (target >= 0) { els[target].setAttribute('data-ok', ''); els[target].setAttribute('data-step', ''); }
    count.textContent = `${num(matched.size / 2)} / ${num(pairs.length)} ✓`;
  };
  markNext();
  host.querySelector('.en-cards').addEventListener('click', e => {
    const b = e.target.closest('.en-card');
    if (!b || busy || host.classList.contains('is-solved')) return;
    const i = +b.dataset.i;
    if (matched.has(i) || i === open) return;
    ctx.sfx.tick();
    b.classList.add('is-open');
    if (open == null) { open = i; seen.add(i); markNext(); return; }
    const a = open; open = null;
    if (cards[a].k === cards[i].k) {
      matched.add(a); matched.add(i);
      els[a].classList.add('is-matched'); b.classList.add('is-matched');
      seen.add(i);
      const word = cards[a].side === 'a' ? cards[a].t : cards[i].t;
      sayEn(isEnglish(word) ? word : '');
      if (matched.size === cards.length) { ctx.sfx.good(); markNext(); finish(host, step, ctx, resolve, (pairs.length - slips) / pairs.length); return; }
      ctx.sfx.tap();
      markNext();
      return;
    }
    // A slip only when the right card had already been seen.
    if (seen.has(partner(a)) || seen.has(partner(i))) { slips += 1; if (slips === 1) ctx.say(step.hint, 'oops'); }
    seen.add(i);
    busy = true;
    els.forEach(x => x.removeAttribute('data-ok'));
    later(() => { els[a].classList.remove('is-open'); b.classList.remove('is-open'); busy = false; markNext(); }, 950);
  });
}

// ---------- odd: tap the word that does not belong ----------
function odd(step, host, ctx, resolve) {
  const rows = step.rows;
  host.innerHTML = `<div class="lq en-odd">${ask(step, 'اضغط على الكلمة الغريبة عن المجموعة')}
    <div class="en-odd__row" dir="ltr" lang="en"></div><p class="en-odd__why" hidden></p><small class="lq-left"></small></div>`;
  const row = host.querySelector('.en-odd__row'), why = host.querySelector('.en-odd__why'), count = host.querySelector('.lq-left');
  let i = 0;
  const r = rounds(rows.length);
  const tr = tracker(step, ctx, () => row.querySelector('[data-ok]')?.classList.add('is-reveal'));
  const show = () => {
    const [words, oddOne] = rows[i];
    row.innerHTML = shuffle(words).map(w => `<button class="en-oddw" data-say="${escAttr(w)}" ${w === oddOne ? 'data-ok' : ''}>${w}</button>`).join('');
    why.hidden = true;
    count.textContent = left(i, rows.length);
    r.next();
    bump(row, 'is-pop');
  };
  show();
  row.addEventListener('click', e => {
    const b = e.target.closest('.en-oddw');
    if (!b || b.disabled || host.classList.contains('is-solved') || row.classList.contains('is-busy')) return;
    if (!('ok' in b.dataset)) { b.disabled = true; r.slip(); tr.miss(b); return; }
    b.classList.add('is-odd'); b.removeAttribute('data-ok');
    row.querySelectorAll('.en-oddw:not(.is-odd)').forEach(x => x.classList.add('is-kept'));
    why.innerHTML = `✏️ ${rows[i][2]}`; why.hidden = false;
    sayEn(rows[i][1]);
    i += 1;
    if (i < rows.length) { ctx.sfx.tap(); row.classList.add('is-busy'); later(() => { row.classList.remove('is-busy'); show(); }, 1800); return; }
    ctx.sfx.good();
    finish(host, step, ctx, resolve, r.ok);
  });
}

// ---------- rank: tap them in order ----------
function rank(step, host, ctx, resolve) {
  const items = step.items.map((it, k) => ({ ...it, k }));
  host.innerHTML = `<div class="lq en-rank">${ask(step, 'اضغط بالترتيب')}
    <div class="en-rank__ends" dir="ltr" lang="en"><span>1 · ${step.ends[0]}</span><span>${num(items.length)} · ${step.ends[1]}</span></div>
    <ol class="en-rank__line" dir="ltr" lang="en">${items.map(() => '<li class="en-rank__slot"></li>').join('')}</ol>
    <div class="en-rank__pool" dir="ltr" lang="en">${shuffle(items).map(it => `<button class="en-rank__it" data-k="${it.k}" data-say="${escAttr(it.en)}">${it.pic ? picHTML(it.pic) : ''}<b>${it.en}</b></button>`).join('')}</div></div>`;
  const btns = [...host.querySelectorAll('.en-rank__it')], slots = [...host.querySelectorAll('.en-rank__slot')];
  let i = 0;
  const markNext = () => btns.forEach(b => { const on = +b.dataset.k === i; b.toggleAttribute('data-ok', on); b.toggleAttribute('data-step', on); b.classList.remove('is-reveal'); });
  const tr = tracker(step, ctx, () => btns.find(b => +b.dataset.k === i)?.classList.add('is-reveal'));
  markNext();
  host.querySelector('.en-rank__pool').addEventListener('click', e => {
    const b = e.target.closest('.en-rank__it');
    if (!b || b.disabled || host.classList.contains('is-solved')) return;
    if (+b.dataset.k !== i) { tr.miss(b); return; }
    ctx.sfx.tick();
    const it = items[i];
    slots[i].innerHTML = `${it.pic ? picHTML(it.pic) : ''}<small>${it.en}</small>`;
    slots[i].classList.add('is-filled');
    b.disabled = true; b.classList.add('is-used');
    sayEn(it.en);
    i += 1;
    if (i < items.length) { markNext(); return; }
    ctx.sfx.good();
    finish(host, step, ctx, resolve, tr.misses ? Math.max(0, 1 - tr.misses / items.length) : 1);
  });
}

// ---------- adjorder: the book's order of adjectives ----------
export const ADJ_CATS = {
  opinion: ['nice', 'lovely', 'pretty', 'clever', 'beautiful', 'smart', 'funny', 'elegant', 'cute', 'serious', 'kind', 'honest', 'friendly', 'great', 'amazing', 'strange', 'interesting', 'delicious', 'wonderful'],
  size: ['big', 'tall', 'short', 'medium-height', 'small', 'long', 'large', 'huge', 'little', 'tiny'],
  shape: ['fat', 'slim', 'thin', 'square', 'plump', 'round', 'well-built'],
  age: ['young', 'old', 'new', 'middle-aged', 'ancient', 'modern'],
  colour: ['blond', 'blonde', 'brown', 'white', 'red', 'black', 'blue', 'green', 'grey', 'yellow', 'orange', 'pink', 'dark', 'purple', 'golden'],
};
const CAT_AR = { opinion: 'رأي', size: 'حجم', shape: 'شكل', age: 'عمر', colour: 'لون' };
const catOf = w => Object.keys(ADJ_CATS).find(c => ADJ_CATS[c].includes(w.toLowerCase())) || 'opinion';
function adjorder(step, host, ctx, resolve) {
  const items = step.items;
  host.innerHTML = `<div class="lq en-adj">${ask(step, 'ضع الصفات بالترتيب الذي يعلّمه الكتاب')}
    <div class="en-adj__key" dir="ltr" lang="en">${Object.keys(CAT_AR).map(c => `<span class="en-cat en-cat--${c}">${c}<small>${CAT_AR[c]}</small></span>`).join('<i>›</i>')}</div>
    <div class="en-sent en-adj__sent" dir="ltr" lang="en"></div><p class="en-build__ar"></p>
    <div class="en-tiles" dir="ltr" lang="en"></div><small class="lq-left"></small></div>`;
  const sent = host.querySelector('.en-adj__sent'), arEl = host.querySelector('.en-build__ar'), box = host.querySelector('.en-tiles'), count = host.querySelector('.lq-left');
  let k = 0, pos = 0, adjs = [], cats = [];
  const r = rounds(items.length);
  const tr = tracker(step, ctx, () => box.querySelector('[data-ok]')?.classList.add('is-reveal'));
  const markNext = () => box.querySelectorAll('.en-tile').forEach(b => { const on = !b.classList.contains('is-used') && b.dataset.t === adjs[pos]; b.toggleAttribute('data-ok', on); b.toggleAttribute('data-step', on); b.classList.remove('is-reveal'); });
  const show = () => {
    const it = items[k];
    adjs = it.adjs; cats = it.cats || adjs.map(catOf); pos = 0;
    sent.innerHTML = `${it.before} ${adjs.map(() => '<span class="en-gap"></span>').join(' ')} ${it.noun}`;
    sent.classList.remove('is-done');
    arEl.hidden = true;
    let order = shuffle(adjs.map((a, j) => j));
    for (let g = 0; g < 8 && order.every((j, n) => j === n); g++) order = shuffle(order);
    box.innerHTML = order.map(j => `<button class="en-tile en-tile--cat en-cat--${cats[j]}" data-t="${escAttr(adjs[j])}" data-say="${escAttr(adjs[j])}">${adjs[j]}<small>${cats[j]}</small></button>`).join('');
    count.textContent = left(k, items.length);
    r.next();
    markNext();
  };
  show();
  box.addEventListener('click', e => {
    const b = e.target.closest('.en-tile');
    if (!b || b.classList.contains('is-used') || host.classList.contains('is-solved') || box.classList.contains('is-busy')) return;
    if (b.dataset.t !== adjs[pos]) { r.slip(); tr.miss(b); return; }
    ctx.sfx.tick();
    b.classList.add('is-used'); b.disabled = true;
    const gap = sent.querySelectorAll('.en-gap')[pos];
    gap.textContent = adjs[pos]; gap.className = `en-gap is-filled en-cat--${cats[pos]}`;
    pos += 1;
    if (pos < adjs.length) { markNext(); return; }
    const it = items[k];
    sent.classList.add('is-done');
    if (it.ar) { arEl.textContent = it.ar; arEl.hidden = false; }
    sayEn(`${it.before} ${adjs.join(' ')} ${it.noun}`);
    ctx.sfx.good();
    k += 1;
    if (k < items.length) { box.classList.add('is-busy'); later(() => { box.classList.remove('is-busy'); show(); }, 1400); return; }
    finish(host, step, ctx, resolve, r.ok);
  });
}

// ---------- chat: a conversation from the book ----------
function chat(step, host, ctx, resolve) {
  const who = step.who, lines = step.lines;
  const me = lines.find(l => Array.isArray(l[1]))?.[0] || 'B';
  host.innerHTML = `<div class="lq en-chat">${ask(step, `أكمل المحادثة: أنت ${who[me][1]} <bdi>${who[me][0]}</bdi>. اختر ما تقوله.`)}
    <div class="en-chat__log" dir="ltr" lang="en"></div><div class="en-chat__opts" dir="ltr" lang="en"></div></div>`;
  const log = host.querySelector('.en-chat__log'), box = host.querySelector('.en-chat__opts');
  const picks = lines.filter(l => Array.isArray(l[1])).length;
  let i = 0;
  const r = rounds(picks);
  const tr = tracker(step, ctx, () => box.querySelector('[data-ok]')?.classList.add('is-reveal'));
  const bubble = (side, text) => {
    const [name, face] = who[side];
    const el = document.createElement('div');
    el.className = `en-bub en-bub--${side === me ? 'me' : 'them'}`;
    el.innerHTML = `<span class="en-bub__face">${face}</span><div class="en-bub__body" data-say="${escAttr(text)}"><b>${name}</b><p>${text}</p></div>`;
    log.append(el);
    log.scrollTop = log.scrollHeight;
    el.scrollIntoView?.({ block: 'nearest' });
  };
  const step1 = () => {
    if (i >= lines.length) { ctx.sfx.good(); finish(host, step, ctx, resolve, r.ok); return; }
    const [side, text] = lines[i];
    if (!Array.isArray(text)) { bubble(side, text); sayEn(text); i += 1; later(step1, 700); return; }
    r.next();
    box.innerHTML = shuffle(text).map(t => `<button class="en-reply" data-say="${escAttr(t)}" ${t === text[0] ? 'data-ok' : ''}>${t}</button>`).join('');
    box.hidden = false;
  };
  box.addEventListener('click', e => {
    const b = e.target.closest('.en-reply');
    if (!b || b.disabled || host.classList.contains('is-solved')) return;
    if (!('ok' in b.dataset)) { b.disabled = true; r.slip(); tr.miss(b); return; }
    const [side, text] = lines[i];
    box.innerHTML = ''; box.hidden = true;
    bubble(side, text[0]);
    sayEn(text[0]);
    ctx.sfx.tap();
    i += 1;
    later(step1, 600);
  });
  step1();
}

const GAMES = { listen: pick, picture: pick, build, spell, verb, memory, odd, rank, adjorder, chat };
export const GAME_KINDS = Object.keys(GAMES);

export function runStep(step, host, ctx) {
  return new Promise(resolve => {
    host.classList.add('en-step');
    if (step.kind === 'explore') { exploreStep(step, host, ctx, resolve); return; }
    const game = GAMES[step.kind];
    if (game) { game(step, host, ctx, resolve); return; }
    watchShared(host);
    runQuestion(step, host, ctx, resolve, { views: VIEW_HTML });
  });
}
