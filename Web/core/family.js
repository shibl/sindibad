// Family features: choosing who plays (several children per device), adding
// a child, and the parents' page (لوحة الأهل) behind a simple adult check.
// Everything stays on the device.

import { heroSVG, hudhudSVG, HEROES } from '../art/art.js';
import { save, profileList, activeProfile, profileSave, createProfile, switchProfile, deleteProfile } from './save.js';
import { allTopics } from './topics.js';
import { sfx } from './sound.js';
import { num } from './format.js';
import { streak, todayLessons, DAILY_GOAL } from './lesson.js';

let world, show;

export function initFamily({ worldDef, showScreen }) {
  world = worldDef;
  show = showScreen;
}

// ---------- Who is playing? ----------

export function renderWho(el) {
  const list = profileList();
  if (!list.length) { renderFirstName(el); return; }
  el.innerHTML = `
    <h3 class="who__title">مَن سيبحر اليوم؟</h3>
    <div class="who__grid">
      ${list.map(p => {
        const s = profileSave(p.id);
        const hero = s.hero || 'sindbad';
        const stars = Object.values(s.topics || {}).reduce((a, t) => a + (t.stars || 0), 0);
        return `<button class="who__card" data-who="${p.id}">
          <span class="who__face">${heroSVG(hero)}</span>
          <b>${p.name || HEROES[hero].name}</b>
          <small>★ ${num(stars)}</small>
        </button>`;
      }).join('')}
      <button class="who__card who__card--new" data-who="new"><span class="who__plus">＋</span><b>طفل جديد</b><small>ملف جديد</small></button>
    </div>
    <form class="who__form" id="who-form" hidden>
      <label for="child-name">ما اسمك؟</label>
      <input id="child-name" maxlength="20" autocomplete="off" placeholder="اكتب اسمك هنا" required>
      <button class="btn btn--gold" type="submit">التالي ←</button>
    </form>`;
  el.onclick = e => {
    const b = e.target.closest('[data-who]');
    if (!b) return;
    sfx.tap();
    if (b.dataset.who === 'new') {
      const f = el.querySelector('#who-form');
      f.hidden = false;
      f.querySelector('input').focus();
      return;
    }
    switchProfile(b.dataset.who);
    bootInto(profileSave(b.dataset.who).hero ? 'map' : 'select');
  };
  el.querySelector('#who-form').onsubmit = e => {
    e.preventDefault();
    const name = el.querySelector('#child-name').value.trim();
    if (!name) return;
    createProfile(name);
    bootInto('select');
  };
}

// A brand-new device: Hudhud asks the child's name straight away.
function renderFirstName(el) {
  el.innerHTML = `
    <div class="first-name">
      <div class="first-name__bird">${hudhudSVG()}</div>
      <p class="bubble first-name__bubble">أهلاً بك في الميناء! أنا <b>هُدهُد</b>. قبل أن نُبحر… <b>ما اسمك؟</b></p>
      <form class="first-name__form" id="who-form">
        <input id="child-name" maxlength="20" autocomplete="off" placeholder="اكتب اسمك هنا" required aria-label="اسمك">
        <button class="btn btn--gold btn--big" type="submit">هذا اسمي ←</button>
      </form>
    </div>`;
  const input = el.querySelector('#child-name');
  setTimeout(() => input.focus(), 300);
  el.querySelector('#who-form').onsubmit = e => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) { input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); return; }
    sfx.good();
    createProfile(name);
    bootInto('select');
  };
}

// Reload into a given screen (switching child reloads the whole game).
function bootInto(screen) {
  try { sessionStorage.setItem('sindbad.boot', screen); } catch { /* ignore */ }
  location.reload();
}

// ---------- Parents' page ----------

// A small adult check: one multiplication a 6th-grader could do, but written
// out in words so a quick tap-through is unlikely. (It's a speed bump, not a
// lock; the data never leaves the device anyway.)
const WORDS = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];

export function renderParentGate(el) {
  const a = 3 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 7);
  el.innerHTML = `
    <div class="gate">
      <h3>🔒 للأهل فقط</h3>
      <p>للدخول إلى لوحة الأهل، اكتب ناتج: <b>${WORDS[a]} × ${WORDS[b]}</b></p>
      <form id="gate-form"><input id="gate-answer" inputmode="numeric" autocomplete="off" aria-label="الناتج" dir="ltr">
      <button class="btn btn--gold" type="submit">دخول</button></form>
      <p class="gate__err" hidden>ليس صحيحاً، حاول مرة أخرى.</p>
    </div>`;
  el.querySelector('#gate-form').onsubmit = e => {
    e.preventDefault();
    const v = el.querySelector('#gate-answer').value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    if (Number(v) === a * b) { sfx.good(); renderParents(el); }
    else { sfx.bad(); el.querySelector('.gate__err').hidden = false; }
  };
  el.querySelector('#gate-answer').focus();
}

const minutes = sec => Math.round((sec || 0) / 60);
const dateAr = t => new Date(t).toLocaleDateString('ar-SY', { weekday: 'long', day: 'numeric', month: 'long' });

export function renderParents(el) {
  const s = save.get();
  const prof = activeProfile();
  const hero = s.hero || 'sindbad';
  const child = prof?.name || HEROES[hero].name;
  const topics = allTopics().filter(t => world.regions.some(r => r.id === t.region));
  const rec = id => (s.topics[id]?.plays ? s.topics[id] : null);
  const mastered = topics.filter(t => (rec(t.id)?.stars || 0) >= 3);
  const started = topics.filter(t => rec(t.id));
  const weak = topics.filter(t => rec(t.id) && (rec(t.id).best || 0) < 0.7);
  const due = topics.filter(t => s.review?.[t.id]?.due <= Date.now());
  const missedTotal = topics.reduce((a, t) => a + (s.topics[t.id]?.missed?.length || 0), 0);

  // Last 7 days of play, oldest first.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return { label: d.toLocaleDateString('ar-SY', { weekday: 'short' }), min: minutes((s.days || {})[key]) };
  });
  const maxMin = Math.max(10, ...days.map(d => d.min));
  const week = days.reduce((a, d) => a + d.min, 0);

  const recent = topics.filter(t => rec(t.id)?.last).sort((a, b) => rec(b.id).last - rec(a.id).last).slice(0, 5);

  el.innerHTML = `
    <div class="parents">
      <header class="parents__head">
        <div class="parents__face">${heroSVG(hero)}</div>
        <div><h3>لوحة الأهل — ${child}</h3><p>الصف السادس • كل البيانات محفوظة على هذا الجهاز فقط</p></div>
      </header>
      <p class="print-only">تقرير رحلات سندباد وياسمينة — ${new Date().toLocaleDateString('ar-SY', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <section class="p-tiles">
        <div class="p-tile"><b>${num(week)}</b><small>دقيقة لعب هذا الأسبوع</small></div>
        <div class="p-tile"><b>${num(mastered.length)}<i>/${num(topics.length)}</i></b><small>دروس أُتقنت (★★★)</small></div>
        <div class="p-tile"><b>${num(started.length)}</b><small>دروس بدأها</small></div>
        <div class="p-tile ${due.length ? 'p-tile--warn' : ''}"><b>${num(due.length)}</b><small>مراجعات مستحقة</small></div>
        <div class="p-tile"><b>🔥 ${num(streak(s))}</b><small>أيام متتالية • اليوم ${num(todayLessons(s))}/${num(DAILY_GOAL)} دروس</small></div>
        <div class="p-tile"><b>${num(missedTotal)}</b><small>أسئلة أخطأ فيها ويعيد التدرّب عليها</small></div>
      </section>

      <section>
        <h4>وقت اللعب (آخر ٧ أيام)</h4>
        <div class="p-week" role="img" aria-label="دقائق اللعب في آخر سبعة أيام">
          ${days.map(d => `<div class="p-day"><span class="p-bar" style="height:${Math.max(4, (d.min / maxMin) * 100)}%"><em>${d.min ? num(d.min) : ''}</em></span><small>${d.label}</small></div>`).join('')}
        </div>
      </section>

      <section>
        <h4>التقدّم في كل مادة</h4>
        ${world.regions.map(r => {
          const list = topics.filter(t => t.region === r.id);
          return `<details class="p-subject" style="--region:${r.color}">
            <summary><b>${r.subject}</b><span class="p-stars">${list.map(t => '★'.repeat(rec(t.id)?.stars || 0) + '☆'.repeat(3 - (rec(t.id)?.stars || 0))).join(' ')}</span></summary>
            <table class="p-table"><thead><tr><th>الدرس</th><th>النجوم</th><th>أفضل نتيجة</th><th>مرات</th><th>للمراجعة</th></tr></thead><tbody>
            ${list.map(t => { const x = rec(t.id); return `<tr><td>${t.icon} ${t.title}</td><td>${x ? '★'.repeat(x.stars) || '—' : '—'}</td><td>${x ? `${num(Math.round((x.best || 0) * 100))}٪` : 'لم يبدأ'}</td><td>${num(x?.plays || 0)}</td><td>${x?.missed?.length ? num(x.missed.length) : '—'}</td></tr>`; }).join('')}
            </tbody></table>
          </details>`;
        }).join('')}
      </section>

      <section>
        <h4>يحتاج دعماً</h4>
        ${weak.length ? `<ul class="p-list">${weak.map(t => `<li><b>${t.icon} ${t.title}</b> — أفضل نتيجة ${num(Math.round((rec(t.id).best || 0) * 100))}٪.
          <small>فكرة للبيت: ${t.learn?.[0] ? `اطلبوا من ${child} شرح «${t.learn[0].title}» بمثال من حياتكم اليومية.` : 'العبوا الدرس معاً مرة أخرى.'}</small></li>`).join('')}</ul>`
          : `<p class="p-empty">${started.length ? 'رائع! لا توجد دروس ضعيفة حتى الآن.' : 'لم يبدأ أي درس بعد.'}</p>`}
      </section>

      <section>
        <h4>آخر ما تعلّمه</h4>
        ${recent.length ? `<ul class="p-list">${recent.map(t => `<li><b>${t.icon} ${t.title}</b> <small>${dateAr(rec(t.id).last)}</small></li>`).join('')}</ul>` : '<p class="p-empty">—</p>'}
      </section>

      <section class="p-tips">
        <h4>كيف تساعدون في البيت؟</h4>
        <ul>
          <li>عشرون دقيقة في اليوم أفضل من ساعتين مرة في الأسبوع؛ المراجعة المتباعدة تُثبّت المعلومة.</li>
          <li>اسألوا عن الحكاية: «ماذا طلب منك الخطّاط؟» — الشرح بصوت عالٍ يرسّخ التعلّم.</li>
          <li>المحتوى مسودّة تعليمية تنتظر مراجعة معلّمين سوريين؛ نرحّب بملاحظاتكم.</li>
        </ul>
      </section>

      <section class="p-danger">
        <h4>إدارة الملفات</h4>
        <div class="p-actions">
          <button class="btn btn--gold" data-p="print">🖨️ طباعة التقرير</button>
          <button class="btn btn--ghost" data-p="switch">👨‍👩‍👧 تبديل اللاعب</button>
          <button class="btn btn--ghost btn--danger" data-p="delete">🗑️ حذف ملف ${child}</button>
        </div>
      </section>
    </div>`;
  el.onclick = e => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    sfx.tap();
    if (b.dataset.p === 'switch') show('who');
    if (b.dataset.p === 'print') {
      // Open every subject table so the printout is complete.
      el.querySelectorAll('details').forEach(d => { d.open = true; });
      window.print();
    }
    if (b.dataset.p === 'delete') {
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = `⚠️ اضغط مرة أخرى لحذف ${child} نهائياً`; return; }
      deleteProfile(activeProfile()?.id);
      location.reload();
    }
  };
}
