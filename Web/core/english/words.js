// «دفتر كلماتي» — the child's English word book (HUD 📖 on the English
// island). Every word met so far — from the quests the child has opened or
// finished — grouped by unit, with its picture, its Arabic meaning, a
// sentence from the book and its sound (core/voice.js; without an English
// voice the sentence still shows). And a small flash-card game: a picture
// and its Arabic meaning, three English words, pick the right one.
//
//   openWords(host, { say, sfx, onClose }) → { close, debug }
//
// Kept in save.world.english: seen (quest ids opened), best (the longest
// run of right cards).
// Test hook: the right card carries data-ok.

import { save } from '../save.js';
import { num } from '../format.js';
import { QUESTS, UNITS, BLOCKS, wordsOf } from '../../worlds/grade6/english.js';
import { picHTML, escAttr } from './views.js';
import { sayEn, hasVoice } from './games.js';

const TEST = typeof window !== 'undefined' && !!window.__SINDBAD_TEST__;
const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const EN = t => `<bdi class="en" dir="ltr" lang="en">${t}</bdi>`;
const bump = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

const store = () => save.get().world?.english || {};
// The quests met so far, in the book's order, and their words (each word once).
export function metWords() {
  const st = store(), seen = new Set([...(st.seen || []), ...Object.keys(st.done || {})]);
  const have = new Set(), groups = [];
  for (const q of QUESTS) {
    if (!seen.has(q.id)) continue;
    const words = wordsOf(q).filter(([w]) => { const k = w.toLowerCase(); if (have.has(k)) return false; have.add(k); return true; });
    if (words.length) groups.push({ q, words });
  }
  return groups;
}
const colorOf = q => (typeof q.unit === 'number' ? UNITS[q.unit]?.color : BLOCKS[Number(String(q.unit).slice(1))]?.color) || '#2f6fd0';

export function openWords(host, { say, sfx, onClose }) {
  let mode = 'list', streak = 0, card = null, answered = 0;
  const groups = metWords(), all = groups.flatMap(g => g.words);
  host.innerHTML = `<div class="en-book" role="dialog" aria-label="دفتر كلماتي">
    <header class="en-book__head"><span class="en-book__icon">📖</span><h3>دفتر كلماتي</h3><small>${num(all.length)} ${all.length > 10 ? 'كلمة' : all.length > 2 ? 'كلمات' : 'كلمة'}</small><button class="gl-x en-book__x" data-close aria-label="إغلاق">✕</button></header>
    <nav class="en-book__tabs"><button class="is-on" data-mode="list">📚 كلماتي</button><button data-mode="cards" ${all.length < 4 ? 'disabled' : ''}>🃏 لعبة البطاقات</button></nav>
    <div class="en-book__body"></div>
    <p class="en-book__detail" aria-live="polite" hidden></p></div>`;
  host.hidden = false;
  const body = host.querySelector('.en-book__body'), detail = host.querySelector('.en-book__detail');

  function list() {
    detail.hidden = true;
    if (!groups.length) { body.innerHTML = '<p class="en-book__empty">🦜 دفترك ينتظر كلماته! ابدأ أول درس في <b>ميناء البلدان</b> 🚢 لتمتلئ صفحاته.</p>'; return; }
    body.innerHTML = groups.map(({ q, words }) => `<section class="en-book__unit" style="--unit:${colorOf(q)}">
      <h4><span>${q.icon}</span> ${EN(q.book[0])}</h4>
      <div class="en-words">${words.map(([w, ar, pic, ex]) => `<button class="en-word" data-say="${escAttr(w)}" data-w="${escAttr(w)}" data-ex="${escAttr(ex)}" data-ar="${escAttr(ar)}">${picHTML(pic, 'en-word__pic')}<bdi class="en-word__en" dir="ltr" lang="en">${w}</bdi><small>${ar}</small></button>`).join('')}</div>
    </section>`).join('');
  }

  function nextCard() {
    const pool = shuffle(all);
    card = pool[0];
    const opts = shuffle([card, ...pool.slice(1).filter(w => w[0] !== card[0]).slice(0, 2)]);
    const best = store().best || 0;
    body.innerHTML = `<div class="en-flash">
      <p class="en-flash__score">🔥 ${num(streak)} <small>أفضل سلسلة: ${num(best)}</small></p>
      <div class="en-flash__card">${picHTML(card[2], 'en-flash__pic')}<b>${card[1]}</b></div>
      <p class="en-flash__ask">ما الكلمة بالإنكليزية؟</p>
      <div class="en-flash__opts" dir="ltr" lang="en">${opts.map(([w]) => `<button class="en-flash__opt" data-say="${escAttr(w)}" ${w === card[0] ? 'data-ok' : ''}>${w}</button>`).join('')}</div></div>`;
  }

  function show(m) {
    mode = m;
    host.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('is-on', b.dataset.mode === m));
    if (m === 'cards') { streak = 0; nextCard(); say?.('انظر إلى الصورة والمعنى، واختر الكلمة الإنكليزية! 🃏'); } else list();
  }
  show('list');

  host.onclick = e => {
    if (e.target.closest('[data-close]')) { sfx.tap(); close(); return; }
    const tab = e.target.closest('[data-mode]');
    if (tab && !tab.disabled) { sfx.tap(); show(tab.dataset.mode); return; }
    const w = e.target.closest('.en-word');
    if (w) {
      sfx.tick();
      host.querySelectorAll('.en-word.is-on').forEach(x => x.classList.remove('is-on'));
      w.classList.add('is-on');
      detail.innerHTML = `${EN(`<b>${w.dataset.w}</b>`)} — ${w.dataset.ar}<br>${EN(w.dataset.ex)}${hasVoice() ? ' 🔊' : ''}`;
      detail.hidden = false;
      bump(detail, 'is-pop');
      sayEn(`${w.dataset.w}. ${w.dataset.ex}`);
      return;
    }
    const o = e.target.closest('.en-flash__opt');
    if (o && !o.disabled && body.querySelector('.en-flash:not(.is-done)')) {
      if (!('ok' in o.dataset)) {
        sfx.bad(); o.disabled = true; bump(o, 'is-shake'); streak = 0;
        body.querySelector('[data-ok]')?.classList.add('is-reveal');
        body.querySelector('.en-flash__score').firstChild.textContent = `🔥 ${num(streak)} `;
        return;
      }
      o.classList.add('is-right');
      body.querySelector('.en-flash').classList.add('is-done');
      sayEn(card[0]);
      streak += 1; answered += 1;
      if (streak > (store().best || 0)) save.update(s => { ((s.world ||= {}).english ||= {}).best = streak; });
      sfx.good();
      setTimeout(() => { if (mode === 'cards' && host.isConnected && !host.hidden) nextCard(); }, TEST ? 0 : 900);
    }
  };

  function close() {
    host.hidden = true;
    host.innerHTML = '';
    host.onclick = null;
    onClose?.();
  }
  return { close, debug: () => ({ mode, words: all.length, streak, answered }) };
}
