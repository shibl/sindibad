// Runs one topic plugin: sets up the lesson screen (title, progress rope,
// Hudhud's coaching bubble), hands the plugin its container and ctx, then
// records the result and shows the stars.

import { heroSVG, hudhudSVG, HEROES } from '../art/art.js';
import { save } from './save.js';
import { getTopic, starsFor } from './topics.js';
import { sfx } from './sound.js';
import { num } from './format.js';

let show;        // showScreen from app.js
let current;     // { topic, abort }
let onDone;      // called when the student returns to the map

// Spaced review: after each play the topic comes back for review after
// 1, 3, 7, 14, 30 days — sooner if the result was weak.
const REVIEW_DAYS = [1, 3, 7, 14, 30];
const DAY = 24 * 60 * 60 * 1000;

export function initLesson({ showScreen, onReturn }) {
  show = showScreen;
  onDone = onReturn;
  document.querySelector('#screen-activity .guide__bird').innerHTML = hudhudSVG();
  document.getElementById('lesson-quit').addEventListener('click', quit);
  document.getElementById('result').addEventListener('click', e => {
    const b = e.target.closest('[data-result]');
    if (!b) return;
    sfx.tap();
    if (b.dataset.result === 'again') startLesson(current.topic.id);
    else finish();
  });
}

function say(html, mood = 'happy') {
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
}

export function startLesson(topicId) {
  const topic = getTopic(topicId);
  if (!topic) return;
  current?.abort.abort();
  const abort = new AbortController();
  current = { topic, abort };

  const hero = save.get().hero || 'sindbad';
  document.querySelector('.coach__hero').innerHTML = heroSVG(hero);
  const container = document.getElementById('activity');
  container.innerHTML = '';
  container.className = 'activity';
  document.getElementById('activity-title').textContent = `${topic.icon} ${topic.title}`;
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
  };
  say(topic.blurb ? `${topic.blurb}` : 'هيّا نبدأ!', 'happy');

  let completed = false;
  const onComplete = result => {
    if (completed || abort.signal.aborted) return;
    completed = true;
    record(topic, result);
    showResult(topic, result, hero);
  };
  try {
    topic.render(container, onComplete, ctx);
  } catch (err) {
    console.error(`Topic ${topic.id} failed to render`, err);
    container.innerHTML = '<p class="oops">عذراً، هذا الدرس لم يعمل. عُد إلى الخريطة وجرّب درساً آخر.</p>';
  }
}

function record(topic, { correct, total }) {
  const stars = starsFor({ correct, total });
  save.update(s => {
    const prev = s.topics[topic.id] || { stars: 0, best: 0, plays: 0 };
    s.topics[topic.id] = {
      stars: Math.max(prev.stars, stars),
      best: Math.max(prev.best, total ? correct / total : 0),
      plays: prev.plays + 1,
      last: Date.now(),
    };
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
  onDone();
}
