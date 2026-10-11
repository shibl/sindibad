// The sticker album (ألبوم الملصقات): six collectible stickers per island,
// each with a short true fact. Stickers come from helping villagers,
// chests, stepping-stone puzzles and monuments on each island; the treasure
// island's come from its quest, its monument and the four subject badges.

import { save } from './save.js';
import { sfx } from './sound.js';

export const STICKERS = {
  arabic: [
    ['jasmine', '🌸', 'الياسمين الدمشقي', 'زهرة دمشق البيضاء، يملأ عطرها البيوت القديمة في الصيف.'],
    ['qalam', '🪶', 'قلم القصب', 'يبري الخطّاط قلم القصب بسكّين صغيرة ليكتب الخطّ العربي الجميل.'],
    ['kufi', '📜', 'الخطّ الكوفي', 'من أقدم أنواع الخطّ العربي، حروفه مستقيمة وزواياه حادّة.'],
    ['jar', '🏺', 'جرّة الفخّار', 'صنع الناس الجرار من الطين منذ آلاف السنين لحفظ الماء والزيت.'],
    ['camel', '🐪', 'الجمل', 'يصبر الجمل أياماً دون ماء، ولذلك سُمّي «سفينة الصحراء».'],
    ['library', '📚', 'المكتبة الظاهرية', 'من أقدم مكتبات دمشق، تحفظ مخطوطات نادرة.'],
  ],
  math: [
    ['dolphin', '🐬', 'الدلفين', 'يتنفّس الدلفين الهواء، فهو من الثدييات لا من الأسماك.'],
    ['shell', '🐚', 'القوقعة الحلزونية', 'تلتفّ بعض القواقع في شكل حلزوني يتكرّر فيه النمط نفسه وهو يكبر.'],
    ['compass', '🧭', 'البوصلة', 'تشير إبرة البوصلة إلى الشمال لأنها تتأثّر بمغناطيسية الأرض.'],
    ['anchor', '⚓', 'المرساة', 'تثبّت المرساة السفينة في قاع البحر كي لا تجرفها الأمواج.'],
    ['lighthouse', '🗼', 'المنارة', 'يرشد ضوء المنارة السفن ليلاً بعيداً عن الصخور.'],
    ['digits', '🔢', 'الأرقام العربية', 'الأرقام 1 و2 و3 التي تُكتب في أوروبا وصلت إليها عبر العلماء العرب، ولذلك تُسمّى هناك «الأرقام العربية».'],
  ],
  science: [
    ['telescope', '🔭', 'التلسكوب', 'يجمع التلسكوب ضوء النجوم البعيدة فنراها أوضح.'],
    ['saturn', '🪐', 'كوكب زحل', 'لزحل حلقات جميلة من الجليد والصخور.'],
    ['butterfly', '🦋', 'الفراشة', 'تبدأ الفراشة حياتها يرقة، ثم شرنقة، ثم فراشة ملوّنة.'],
    ['sunflower', '🌻', 'دوّار الشمس', 'تتّجه براعم دوّار الشمس الصغيرة نحو الشمس وهي تنمو.'],
    ['bulb', '💡', 'المصباح', 'يضيء المصباح عندما تمرّ الكهرباء في دارة مغلقة.'],
    ['heart', '🫀', 'القلب', 'يضخّ القلب الدم إلى الجسم كلّه، وينبض نحو مئة ألف مرة كل يوم.'],
  ],
  social: [
    ['citadel', '🏰', 'قلعة حلب', 'من أقدم القلاع وأكبرها في العالم، تقف على تلّة وسط مدينة حلب.'],
    ['noria', '🎡', 'نواعير حماة', 'دواليب خشبية ضخمة ترفع ماء نهر العاصي منذ مئات السنين.'],
    ['bosra', '🏛️', 'مسرح بصرى', 'مسرح روماني كبير من الحجر الأسود في محافظة درعا.'],
    ['olive', '🫒', 'شجرة الزيتون', 'تعيش شجرة الزيتون مئات السنين، وزيتها من أشهر منتجات سوريا.'],
    ['horse', '🐎', 'الحصان العربي', 'من أقدم سلالات الخيل وأجملها، يشتهر بالسرعة والصبر.'],
    ['umayyad', '🕌', 'الجامع الأموي', 'في قلب دمشق القديمة، بُني قبل أكثر من ألف وثلاثمئة سنة.'],
  ],
  treasure: [
    ['turtle', '🐢', 'السلحفاة البحرية', 'تعود السلحفاة البحرية إلى الشاطئ الذي وُلدت فيه لتضع بيضها.'],
    ['coral', '🪸', 'المرجان', 'المرجان حيوانات صغيرة تبني بيوتاً صلبة تصير شِعاباً ملوّنة.'],
    ['octopus', '🐙', 'الأخطبوط', 'للأخطبوط ثمانية أذرع وثلاثة قلوب!'],
    ['idrisi', '🗺️', 'خريطة الإدريسي', 'رسم الجغرافي الإدريسي خريطة شهيرة للعالم قبل نحو تسعمئة سنة.'],
    ['polaris', '⭐', 'نجم القطب', 'يبقى نجم القطب في مكانه تقريباً، فكان البحّارة يهتدون به إلى الشمال.'],
    ['whale', '🐋', 'الحوت الأزرق', 'أكبر حيوان عاش على الأرض، وقلبه بحجم سيارة صغيرة.'],
  ],
};

export const TOTAL = Object.values(STICKERS).reduce((a, l) => a + l.length, 0);
export const owned = () => save.get().stickers || [];

// Give the next sticker from an island's set (if any are left) and show a
// little toast. Returns the sticker or null.
export function awardSticker(islandId) {
  const pool = STICKERS[islandId] || [];
  const have = owned();
  const next = pool.find(([id]) => !have.includes(id));
  if (!next) return null;
  save.update(s => { s.stickers = [...(s.stickers || []), next[0]]; });
  toast(next);
  return next;
}

let queue = [], showing = false;
function toast(st) {
  queue.push(st);
  if (!showing) showNext();
}
function showNext() {
  const st = queue.shift();
  if (!st) { showing = false; return; }
  showing = true;
  const el = document.createElement('div');
  el.className = 'sticker-toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="sticker sticker--new">${st[1]}</span><div><small>📒 ملصق جديد في ألبومك!</small><b>${st[2]}</b></div>`;
  document.body.append(el);
  setTimeout(() => sfx.star(2), 250);
  setTimeout(() => { el.classList.add('is-out'); setTimeout(() => { el.remove(); showNext(); }, 400); }, 3200);
}

// The album: a page per island, collected stickers in colour with their
// fact, missing ones as grey silhouettes.
export function openAlbum(regions) {
  const have = owned();
  const el = document.createElement('div');
  el.className = 'album';
  el.innerHTML = `
    <div class="album__book" role="dialog" aria-modal="true" aria-label="ألبوم الملصقات">
      <header><h3>📒 ألبوم الملصقات</h3><span>${num(have.length)} / ${num(TOTAL)}</span><button class="btn btn--round" data-close aria-label="إغلاق">✕</button></header>
      <div class="album__pages">
        ${regions.map(r => `
          <section class="album__page" style="--region:${r.color}">
            <h4>${r.name}</h4>
            <div class="album__grid">
              ${(STICKERS[r.id] || []).map(([id, icon, name, fact]) => have.includes(id)
                ? `<button class="album__slot is-have" data-fact="${fact}" data-name="${name}"><span class="sticker">${icon}</span><small>${name}</small></button>`
                : `<div class="album__slot"><span class="sticker sticker--missing">${icon}</span><small>؟؟؟</small></div>`).join('')}
            </div>
          </section>`).join('')}
      </div>
      <p class="album__fact" aria-live="polite">اضغط على ملصق لتقرأ معلومته. ساعد الناس، وافتح الصناديق، وحُلّ الألغاز لتجمع المزيد!</p>
    </div>`;
  document.body.append(el);
  el.onclick = e => {
    if (e.target === el || e.target.closest('[data-close]')) { sfx.tap(); el.remove(); return; }
    const s = e.target.closest('[data-fact]');
    if (s) {
      sfx.tap();
      el.querySelectorAll('.is-picked').forEach(x => x.classList.remove('is-picked'));
      s.classList.add('is-picked');
      el.querySelector('.album__fact').innerHTML = `<b>${s.dataset.name}:</b> ${s.dataset.fact}`;
    }
  };
}
const num = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
