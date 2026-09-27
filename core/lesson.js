// Runs one topic plugin: sets up the lesson screen (title, progress rope,
// Hudhud's coaching bubble), hands the plugin its container and ctx, then
// records the result and shows the stars.

import { heroSVG, hudhudSVG, HEROES } from '../art/art.js';
import { save } from './save.js';
import { getTopic, starsFor } from './topics.js';
import { sfx } from './sound.js';
import { num } from './format.js';
import { shuffle, itemKey } from '../plugins/engines/kit.js';
import { canSpeak, speak, stopSpeaking } from './voice.js';

let show;        // showScreen from app.js
let current;     // { topic, abort, before }
let onDone;      // called when the student returns to the map

// Spaced review: after each play the topic comes back for review after
// 1, 3, 7, 14, 30 days — sooner if the result was weak.
const REVIEW_DAYS = [1, 3, 7, 14, 30];
const DAY = 24 * 60 * 60 * 1000;

export function initLesson({ showScreen, onReturn }) {
  document.getElementById('coach-say').addEventListener('click', () => {
    // Read the bubble, plus the question or lesson card on screen.
    const card = document.querySelector('#activity .learn__body, #activity .prompt');
    speak(`${document.getElementById('coach-bubble').innerHTML}. ${card ? card.innerHTML : ''}`);
  });
  show = showScreen;
  onDone = onReturn;
  document.querySelector('#screen-activity .guide__bird').innerHTML = hudhudSVG();
  document.getElementById('lesson-quit').addEventListener('click', quit);
  document.getElementById('result').addEventListener('click', e => {
    const b = e.target.closest('[data-result]');
    if (!b) return;
    sfx.tap();
    if (b.dataset.result === 'again') { const { before, host } = current; startLesson(current.topic.id, { host }); current.before = before; }
    else finish();
  });
}

function say(html, mood = 'happy') {
  stopSpeaking();
  document.getElementById('coach-say').hidden = !canSpeak();
  const bubble = document.getElementById('coach-bubble');
  const coach = bubble.closest('.coach');
  bubble.innerHTML = html;
  coach.dataset.mood = mood;
  bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
}

function progress(i, n) {
  const pct = n ? Math.min(100, (i / n) * 100) : 0;
  document.querySelector('.progress__fill').style.width = `${pct}%`;
  document.querySelector('.progress__ship').style.insetInlineStart = `calc(${pct}% - 18px)`;
  document.getElementById('q-count').textContent = n > 1 ? `${num(Math.min(i + 1, n))} / ${num(n)}` : '';
}

export function startLesson(topicId, opts = {}) {
  const topic = getTopic(topicId);
  if (!topic) return;
  current?.abort.abort();
  const abort = new AbortController();
  current = { topic, abort, before: save.get().topics[topicId]?.stars || 0, host: opts.host || null };

  // Who coaches this lesson: Hudhud, or the villager whose quest it is.
  const host = opts.host;
  document.querySelector('#screen-activity .guide__bird').innerHTML = host
    ? `<div class="coach__host">${host.portrait}<small>${host.name}</small></div>`
    : hudhudSVG();

  const hero = save.get().hero || 'sindbad';
  document.querySelector('.coach__hero').innerHTML = heroSVG(hero);
  const container = document.getElementById('activity');
  container.innerHTML = '';
  container.className = 'activity';
  document.getElementById('activity-title').textContent = `${topic.icon} ${topic.title}`;
  document.getElementById('screen-activity').dataset.subject = topic.region;
  document.querySelector('#screen-activity .combo')?.classList.remove('is-on');
  document.getElementById('result').hidden = true;
  progress(0, 1);
  show('activity');

  const ctx = {
    hero,
    heroName: HEROES[hero].name,
    say,
    progress,
    sfx,
    num,
    signal: abort.signal,
    // Adaptive practice: items this child missed before come back first
    // (up to half the lesson) until they are answered right first time.
    choose(list, n) {
      const missed = new Set(save.get().topics[topic.id]?.missed || []);
      const again = shuffle(list.filter(it => missed.has(itemKey(it)))).slice(0, Math.ceil(n / 2));
      const rest = shuffle(list.filter(it => !again.includes(it))).slice(0, n - again.length);
      return shuffle([...again, ...rest]);
    },
    mark(item, ok) {
      const key = itemKey(item);
      save.update(s => {
        const t = s.topics[topic.id] || (s.topics[topic.id] = { stars: 0, best: 0, plays: 0 });
        const m = (t.missed || []).filter(k => k !== key);
        if (!ok) m.push(key);
        t.missed = m.slice(-30);
      });
    },
  };
  const learnBtn = document.getElementById('learn-btn');
  learnBtn.hidden = !topic.learn?.length;
  learnBtn.onclick = () => { sfx.tap(); const b = current.before; startLesson(topic.id, { learn: true, host }); current.before = b; };

  const firstTime = !save.get().topics[topic.id];
  if (topic.learn?.length && (opts.learn || firstTime)) {
    showLearn(topic, container, abort.signal, () => practice(topic, container, ctx, abort), host);
  } else {
    practice(topic, container, ctx, abort);
  }
}

// Hudhud's mini-lesson: a few illustrated cards, then practice.
function showLearn(topic, container, signal, then, host) {
  let i = 0;
  const cards = topic.learn;
  progress(0, 1);
  document.getElementById('q-count').textContent = '📖';
  const draw = () => {
    if (signal.aborted) return;
    const c = cards[i];
    const last = i === cards.length - 1;
    container.innerHTML = `
      <div class="learn">
        <div class="learn__dots" aria-hidden="true">${cards.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <p class="learn__kicker">📖 تعلّم مع ${host ? host.name : 'هدهد'}</p>
        <h3 class="learn__title">${c.title}</h3>
        <div class="learn__body">${c.html}</div>
        <div class="learn__nav">
          ${i > 0 ? '<button class="btn btn--ghost" data-learn="prev">→ السابق</button>' : ''}
          <button class="btn btn--gold" data-learn="next">${last ? 'هيّا نتدرّب! ⚓' : 'التالي ←'}</button>
        </div>
      </div>`;
    say(c.say || '', 'happy');
    container.querySelector('[data-learn="next"]').focus({ preventScroll: true });
  };
  container.onclick = e => {
    const b = e.target.closest('[data-learn]');
    if (!b) return;
    sfx.tap();
    if (b.dataset.learn === 'prev') { i -= 1; draw(); return; }
    if (i < cards.length - 1) { i += 1; draw(); return; }
    container.onclick = null;
    then();
  };
  draw();
}

function practice(topic, container, ctx, abort) {
  container.innerHTML = '';
  container.onclick = null;
  say(topic.blurb || 'هيّا نبدأ!', 'happy');
  let completed = false;
  const onComplete = result => {
    if (completed || abort.signal.aborted) return;
    completed = true;
    record(topic, result);
    showResult(topic, result, ctx.hero);
  };
  try {
    topic.render(container, onComplete, ctx);
  } catch (err) {
    console.error(`Topic ${topic.id} failed to render`, err);
    container.innerHTML = '<p class="oops">عذراً، هذا الدرس لم يعمل. عُد إلى الخريطة وجرّب درساً آخر.</p>';
  }
}

let lastPearls = 0;
let goalHit = false;
export const DAILY_GOAL = 3;
const GOAL_BONUS = 10;
const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

// Consecutive days with at least one lesson, ending today (or yesterday, so
// the streak isn't shown as lost before the child has played today).
export function streak(s = save.get()) {
  const d = s.daily || {};
  let n = 0;
  let t = Date.now();
  if (!d[dayKey(t)]) t -= DAY;
  while (d[dayKey(t)]) { n += 1; t -= DAY; }
  return n;
}
export const todayLessons = (s = save.get()) => (s.daily || {})[dayKey()] || 0;

function record(topic, { correct, total }) {
  const stars = starsFor({ correct, total });
  save.update(s => {
    const prev = s.topics[topic.id] || { stars: 0, best: 0, plays: 0 };
    // Every new star is worth 5 pearls for the shop.
    lastPearls = Math.max(0, stars - prev.stars) * 5;
    s.pearls = (s.pearls || 0) + lastPearls;
    s.topics[topic.id] = {
      missed: prev.missed || [],
      stars: Math.max(prev.stars, stars),
      best: Math.max(prev.best, total ? correct / total : 0),
      plays: prev.plays + 1,
      last: Date.now(),
      history: [...(prev.history || []), { t: Date.now(), pct: total ? correct / total : 0 }].slice(-10),
    };
    // Daily goal: three lessons a day earns a bonus.
    const today = dayKey();
    s.daily = { ...(s.daily || {}), [today]: ((s.daily || {})[today] || 0) + 1 };
    goalHit = s.daily[today] === DAILY_GOAL;
    if (goalHit) s.pearls += GOAL_BONUS;
    const r = s.review[topic.id] || { box: 0 };
    const box = stars >= 3 ? Math.min(r.box + 1, REVIEW_DAYS.length - 1) : stars >= 2 ? r.box : 0;
    s.review[topic.id] = { box, due: Date.now() + REVIEW_DAYS[box] * DAY };
  });
}

const HEADLINES = ['محاولة شجاعة', 'جيد', 'أحسنت', 'مذهل'];
const LINES = [
  'لا بأس! كل بحّار عظيم تاه مرة. راجع تلميحاتي وحاول مجدداً.',
  'بداية طيبة! حاول مرة أخرى لتجمع نجوماً أكثر.',
  'رائع! بقيت نجمة واحدة… هل تستطيع الحصول عليها؟',
  'مدهش! أتقنت هذا الدرس تماماً. سأذكّرك بمراجعته بعد أيام كي لا يُنسى.',
];

function showResult(topic, result, hero) {
  const stars = starsFor(result);
  progress(1, 1);
  const el = document.getElementById('result');
  const confetti = stars >= 2 ? Array.from({ length: 36 }, (_, i) =>
    `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.12}s;--c:${['#f2c14e', '#d0507e', '#1f9aa0', '#2f8a5f', '#fff'][i % 5]};--r:${(i * 53) % 360}deg"></i>`).join('') : '';
  el.innerHTML = `
    <div class="confetti" aria-hidden="true">${confetti}</div>
    <div class="result__card" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div class="result__hero">${heroSVG(hero)}</div>
      <h3 id="result-title">${HEADLINES[stars]} يا ${HEROES[hero].name}!</h3>
      <div class="result__stars">
        ${[0, 1, 2].map(i => `<span class="rstar ${i < stars ? 'is-on' : ''}" style="--i:${i}">★</span>`).join('')}
      </div>
      <p class="result__score">أجبت صحيحاً من المحاولة الأولى عن <b>${num(result.correct)}</b> من <b>${num(result.total)}</b></p>
      <p class="result__line">${LINES[stars]}</p>
      ${lastPearls ? `<p class="result__pearls">+${num(lastPearls)} 🦪 لؤلؤة للسوق</p>` : ''}
      ${goalHit ? `<p class="result__goal">🎯 أنجزت هدف اليوم: ${num(DAILY_GOAL)} دروس!<br><small>مكافأة ${num(GOAL_BONUS)} لآلئ 🦪 — 🔥 ${num(streak())} ${streak() > 1 ? 'أيام متتالية' : 'يوم'}</small></p>` : ''}
      <div class="actions">
        <button class="btn btn--ghost" data-result="again">مرة أخرى</button>
        <button class="btn btn--gold" data-result="map">إلى الخريطة</button>
      </div>
    </div>`;
  el.hidden = false;
  el.classList.toggle('is-great', stars >= 2);
  say(LINES[stars], stars >= 2 ? 'cheer' : 'think');
  if (stars >= 1) sfx.win(); else sfx.bad();
  for (let i = 0; i < stars; i++) setTimeout(() => sfx.star(i), 500 + i * 280);
  el.querySelector('[data-result="map"]').focus({ preventScroll: true });
}

function quit() {
  sfx.tap();
  current?.abort.abort();
  finish();
}

function finish() {
  document.getElementById('result').hidden = true;
  document.getElementById('activity').innerHTML = '';
  const { topic, before } = current;
  const gained = (save.get().topics[topic.id]?.stars || 0) - before;
  onDone({ topic, gained });
}
