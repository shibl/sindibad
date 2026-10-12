// The opening story: why we sail. Four illustrated panels, shown once after
// choosing a hero (replayable from "رحلتي"). Built from the game's own art.

import { shipSVG, hudhudSVG, cloudSVG, islandSVG, HEROES, g } from '../art/art.js';
import { save } from './save.js';
import { sfx } from './sound.js';

function panels(hero) {
  const name = HEROES[hero].name;
  return [
    {
      scene: 'night',
      art: `<div class="st-moon"></div><div class="st-ship">${shipSVG({ crew: [hero], hudhud: false })}</div>
            <div class="st-bird st-bird--fly">${hudhudSVG()}</div><div class="st-scroll">📜</div>`,
      text: `في ليلة هادئة على شاطئ أرواد، حطّ طائرٌ غريب على سفينة ${name}… كان <b>هُدهُد</b>، يحمل في منقاره رسالة.`,
    },
    {
      scene: 'scroll',
      art: `<div class="st-letter"><p>من الحكيم <b>لقمان</b></p><p>إلى ${g(hero, 'البحّار الشجاع', 'البحّارة الشجاعة')} ${name}:</p>
            <p>هبط <b>ضباب النسيان</b> على جزر المعرفة، فنسي أهلها ما كانوا يعرفون: الحروف والأرقام والعلوم وحكايات بلادهم.</p></div>`,
      text: 'قرأ هدهد الرسالة بصوت عالٍ، ثم نفش ريش تاجه قلقاً.',
    },
    {
      scene: 'fog',
      art: `<div class="st-isle st-isle--a">${islandSVG('letters')}</div><div class="st-isle st-isle--b">${islandSVG('numbers')}</div>
            <div class="st-isle st-isle--c">${islandSVG('citadel')}</div>
            <div class="st-fog">${cloudSVG()}${cloudSVG()}${cloudSVG()}${cloudSVG()}</div>`,
      text: 'الضباب لا يتبدّد بالريح… بل بالمعرفة. كلما ساعدتَ أهل جزيرة على التذكّر وتعلّمتَ معهم، انقشع الضباب عن جزيرة جديدة.',
    },
    {
      scene: 'dawn',
      art: `<div class="st-sun"></div><div class="st-ship st-ship--big">${shipSVG({ crew: [hero] })}</div>`,
      text: `وفي آخر الرحلة، ينتظر <b>كنز الحكمة</b> في جزيرة بعيدة. هل أنت ${g(hero, 'مستعد', 'مستعدة')} يا ${name}؟`,
      last: true,
    },
  ];
}

export function showStory(then) {
  const hero = save.get().hero || 'sindbad';
  const list = panels(hero);
  const el = document.getElementById('story');
  let i = 0;
  const draw = () => {
    const p = list[i];
    el.innerHTML = `
      <div class="story__panel story__panel--${p.scene}">${p.art}</div>
      <div class="story__caption">
        <p>${p.text}</p>
        <div class="story__nav">
          <button class="btn btn--ghost" data-st="skip">تخطَّ</button>
          <span class="story__dots">${list.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
          <button class="btn btn--gold" data-st="next">${p.last ? 'هيّا نُبحر! ⛵' : 'التالي ←'}</button>
        </div>
      </div>`;
    el.querySelector('[data-st="next"]').focus({ preventScroll: true });
  };
  el.onclick = e => {
    const b = e.target.closest('[data-st]');
    if (!b) return;
    sfx.tap();
    if (b.dataset.st === 'next' && i < list.length - 1) { i += 1; draw(); return; }
    el.hidden = true;
    save.update(s => { s.storySeen = true; });
    then?.();
  };
  el.hidden = false;
  draw();
}
