// Guardian battles (تحدّي الحارس): once an island's monument is complete, its
// friendly guardian challenges the hero. Every right answer (first try)
// fires a star at the guardian's health bar; a wrong answer lets the
// guardian splash the hero, who loses a heart. Questions are a mixed
// review of the island's subject. Win → pearls; lose → try again anytime.

import { heroSVG } from '../art/art.js';
import { save } from './save.js';
import { sfx } from './sound.js';
import { num } from './format.js';
import { shuffle, burst, TEST } from '../plugins/engines/kit.js';
import { pool } from '../plugins/review/pools.js';
import { shake } from './fx.js';

export const GUARDIANS = {
  arabic: { name: 'حارس الحروف', color: '#8a5cd6', hat: 'quill' },
  math: { name: 'حارس الأرقام', color: '#e0564f', hat: 'horns' },
  science: { name: 'حارس النجوم', color: '#3aa76d', hat: 'antenna' },
  social: { name: 'حارس القلعة', color: '#d99a22', hat: 'helmet' },
  treasure: { name: 'حارس الكنز', color: '#1f9aa0', hat: 'crown' },
};

// A round, friendly monster: one blob body, big eyes, little arms, and a
// hat that tells the islands apart.
export function guardianSVG({ color, hat }, mood = 'ok') {
  const hats = {
    quill: `<path d="M118 34 Q150 -6 138 40 Q130 30 118 34Z" fill="#fff" stroke="#3b2414" stroke-width="4"/><path d="M118 34 L96 58" stroke="#3b2414" stroke-width="4"/>`,
    horns: `<path d="M62 52 Q50 18 76 34Z M138 52 Q150 18 124 34Z" fill="#fff3c4" stroke="#3b2414" stroke-width="4" stroke-linejoin="round"/>`,
    antenna: `<path d="M100 36 Q96 14 108 6" fill="none" stroke="#3b2414" stroke-width="4"/><circle cx="109" cy="6" r="8" fill="#ffd23f" stroke="#3b2414" stroke-width="4"/>`,
    helmet: `<path d="M56 60 Q100 6 144 60Z" fill="#c9ced6" stroke="#3b2414" stroke-width="4"/><path d="M100 20 L100 4" stroke="#c7373f" stroke-width="8" stroke-linecap="round"/>`,
    crown: `<path d="M66 48 L72 18 L88 36 L100 12 L112 36 L128 18 L134 48Z" fill="#ffd23f" stroke="#3b2414" stroke-width="4" stroke-linejoin="round"/>`,
  };
  const eyes = mood === 'hit'
    ? '<path d="M70 92 l16 10 M86 92 l-16 10 M114 92 l16 10 M130 92 l-16 10" stroke="#3b2414" stroke-width="5" stroke-linecap="round"/>'
    : mood === 'happy'
      ? '<path d="M68 100 Q78 88 88 100 M112 100 Q122 88 132 100" fill="none" stroke="#3b2414" stroke-width="5" stroke-linecap="round"/>'
      : '<circle cx="78" cy="96" r="14" fill="#fff" stroke="#3b2414" stroke-width="4"/><circle cx="122" cy="96" r="14" fill="#fff" stroke="#3b2414" stroke-width="4"/><circle cx="81" cy="98" r="6" fill="#3b2414"/><circle cx="119" cy="98" r="6" fill="#3b2414"/>';
  const mouth = mood === 'happy' || mood === 'ok'
    ? '<path d="M84 124 Q100 138 116 124" fill="none" stroke="#3b2414" stroke-width="5" stroke-linecap="round"/>'
    : '<ellipse cx="100" cy="128" rx="10" ry="8" fill="#3b2414"/>';
  return `<svg class="guardian-art" viewBox="0 0 200 200" aria-hidden="true">
    <ellipse cx="100" cy="188" rx="62" ry="10" fill="rgba(0,0,0,.18)"/>
    <path d="M40 150 Q20 130 34 118" fill="none" stroke="#3b2414" stroke-width="12" stroke-linecap="round"/><path d="M40 150 Q20 130 34 118" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
    <path d="M160 150 Q180 130 166 118" fill="none" stroke="#3b2414" stroke-width="12" stroke-linecap="round"/><path d="M160 150 Q180 130 166 118" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
    <path d="M44 120 Q40 44 100 44 Q160 44 156 120 Q160 176 132 182 L68 182 Q40 176 44 120Z" fill="${color}" stroke="#3b2414" stroke-width="5"/>
    <ellipse cx="82" cy="66" rx="22" ry="10" fill="rgba(255,255,255,.35)" transform="rotate(-20 82 66)"/>
    <circle cx="64" cy="118" r="9" fill="rgba(255,120,150,.45)"/><circle cx="136" cy="118" r="9" fill="rgba(255,120,150,.45)"/>
    ${eyes}${mouth}${hats[hat] || ''}
  </svg>`;
}

const HP = 100, HEARTS = 3, HIT = 20, BIG_HIT = 30;

export function startBattle({ island, subject, onEnd }) {
  const g = GUARDIANS[island] || GUARDIANS.arabic;
  const hero = save.get().hero || 'sindbad';
  const questions = shuffle(pool(subject)).slice(0, 14);
  let hp = HP, hearts = HEARTS, i = 0, streak = 0, locked = false;

  const el = document.createElement('div');
  el.className = 'battle';
  el.style.setProperty('--g', g.color);
  el.innerHTML = `
    <div class="battle__arena">
      <div class="battle__boss">
        <div class="battle__bar"><b>${g.name}</b><span class="hpbar"><i></i></span></div>
        <div class="battle__guardian">${guardianSVG(g)}</div>
      </div>
      <div class="battle__hero">
        <div class="battle__heroart">${heroSVG(hero)}</div>
        <div class="battle__hearts" aria-label="القلوب"></div>
      </div>
    </div>
    <div class="battle__panel"><div class="battle__q"></div></div>
    <button class="btn btn--round battle__quit" aria-label="انسحاب">✕</button>`;
  document.body.append(el);
  const $ = sel => el.querySelector(sel);
  const drawHearts = () => { $('.battle__hearts').innerHTML = Array.from({ length: HEARTS }, (_, k) => `<span class="${k < hearts ? '' : 'is-lost'}">❤</span>`).join(''); };
  const drawHp = () => { $('.hpbar i').style.width = `${(hp / HP) * 100}%`; };
  const face = mood => { $('.battle__guardian').innerHTML = guardianSVG(g, mood); };
  drawHearts(); drawHp();
  $('.battle__quit').onclick = () => { sfx.tap(); end(null); };

  // Opening line.
  const intro = document.createElement('div');
  intro.className = 'battle__intro';
  intro.innerHTML = `<b>⚔️ ${g.name} يتحدّاك!</b><small>أجب صحيحاً لتُطلق النجوم. عندك ${num(HEARTS)} قلوب.</small>`;
  $('.battle__panel').prepend(intro);
  sfx.fanfare();
  setTimeout(() => { intro.remove(); ask(); }, TEST ? 0 : 1600);

  function ask() {
    if (i >= questions.length) { end(hp <= 0); return; }
    const q = questions[i];
    const opts = shuffle(q.options.map((html, k) => ({ html, ok: k === q.answer })));
    locked = false;
    $('.battle__q').innerHTML = `
      <p class="prompt">${q.q}</p>
      <div class="choices ${opts.some(o => o.html.replace(/<[^>]*>/g, '').length > 22) ? 'choices--wide' : ''}">
        ${opts.map((o, k) => `<button class="choice" data-k="${k}" ${TEST && o.ok ? 'data-ok' : ''}>${o.html}</button>`).join('')}
      </div>
      <p class="battle__explain" hidden></p>`;
    $('.battle__q').onclick = e => {
      const b = e.target.closest('[data-k]');
      if (!b || locked) return;
      locked = true;
      const o = opts[+b.dataset.k];
      if (o.ok) hit(b); else miss(b, q, opts);
    };
  }

  function hit(btn) {
    btn.classList.add('is-right');
    streak += 1;
    const dmg = streak >= 3 ? BIG_HIT : HIT;
    sfx.good();
    // A star flies from the hero to the guardian.
    const from = $('.battle__heroart').getBoundingClientRect(), to = $('.battle__guardian').getBoundingClientRect();
    const star = document.createElement('i');
    star.className = 'battle__shot';
    star.textContent = streak >= 3 ? '🌟' : '⭐';
    star.style.cssText = `left:${from.left + from.width * 0.7}px;top:${from.top + from.height * 0.3}px;--dx:${to.left + to.width / 2 - (from.left + from.width * 0.7)}px;--dy:${to.top + to.height / 2 - (from.top + from.height * 0.3)}px`;
    document.body.append(star);
    setTimeout(() => {
      star.remove();
      hp = Math.max(0, hp - dmg);
      drawHp();
      face('hit');
      shake($('.battle__guardian'), 1);
      burst($('.battle__guardian'), '');
      floatText($('.battle__guardian'), `-${num(dmg)}${streak >= 3 ? ' ضربة قوية!' : ''}`, '#fff');
      sfx.star(Math.min(streak, 4));
      setTimeout(() => { face('ok'); if (hp <= 0) end(true); else { i += 1; ask(); } }, TEST ? 0 : 900);
    }, TEST ? 0 : 450);
  }

  function miss(btn, q, opts) {
    btn.classList.add('is-wrong');
    streak = 0;
    sfx.bad();
    [...$('.battle__q .choices').children].forEach((b, k) => { if (opts[k].ok) b.classList.add('is-right'); });
    const ex = $('.battle__explain');
    ex.hidden = false;
    ex.innerHTML = q.explain || 'لا بأس! تذكّر الإجابة الصحيحة.';
    // The guardian splashes the hero.
    $('.battle__guardian').classList.add('is-lunge');
    setTimeout(() => {
      $('.battle__guardian').classList.remove('is-lunge');
      hearts -= 1;
      drawHearts();
      shake($('.battle__hero'), 1.2);
      floatText($('.battle__heroart'), '💦', '#fff');
    }, TEST ? 0 : 350);
    const next = document.createElement('button');
    next.className = 'btn btn--gold battle__next';
    next.textContent = 'التالي ←';
    next.onclick = () => { sfx.tap(); if (hearts <= 0) end(false); else { i += 1; ask(); } };
    $('.battle__q').append(next);
  }

  function floatText(target, text, color) {
    const r = target.getBoundingClientRect();
    const f = document.createElement('b');
    f.className = 'float-plus';
    f.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height * 0.2}px;color:${color}`;
    f.textContent = text;
    document.body.append(f);
    f.addEventListener('animationend', () => f.remove(), { once: true });
  }

  function end(won) {
    if (won === null) { el.remove(); onEnd(null); return; }
    const first = won && !(save.get().guardians || []).includes(island);
    const prize = won ? (first ? 20 : 5) : 0;
    if (won) save.update(s => { s.pearls = (s.pearls || 0) + prize; s.guardians = [...new Set([...(s.guardians || []), island])]; });
    face(won ? 'happy' : 'ok');
    if (won) sfx.win(); else sfx.bad();
    $('.battle__panel').innerHTML = `
      <div class="battle__end">
        <h3>${won ? `🏆 انتصرت على ${g.name}!` : `${g.name} ينتظرك!`}</h3>
        <p>${won ? `قال الحارس: «أنت ${hero === 'yasmina' ? 'بحّارة' : 'بحّار'} حكيم حقاً!» ${prize ? `+${num(prize)} 🦪` : ''}` : 'نفدت القلوب هذه المرة. راجع الدروس ثم عُد لتتحدّاه من جديد!'}</p>
        <div class="actions">
          ${won ? '' : '<button class="btn btn--ghost" data-again>حاول مجدداً</button>'}
          <button class="btn btn--gold" data-done>${won ? 'رائع!' : 'لاحقاً'}</button>
        </div>
      </div>`;
    if (won) burst($('.battle__guardian'), '');
    $('.battle__panel').onclick = e => {
      if (e.target.closest('[data-done]')) { sfx.tap(); el.remove(); onEnd(won); }
      if (e.target.closest('[data-again]')) { sfx.tap(); el.remove(); startBattle({ island, subject, onEnd }); }
    };
  }
}
