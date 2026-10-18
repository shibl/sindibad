// Made from stickers.ts by tools/build.ts. Edit that file, then run: npm run build
// The sticker album (ألبوم الملصقات): six collectible stickers per island,
// each with a short true fact. Stickers come from helping villagers,
// chests, stepping-stone puzzles and monuments on each island; the treasure
// island's come from its quest, its monument and the four subject badges;
// the farm's, the music island's, the science island's, the atlas
// island's, the art island's and the English island's from their quests
// (core/farm/farm.js, core/tunes/tunes.js, core/lab/lab.js,
// core/atlas/atlas.js, core/studio/studio.js, core/english/english.js).
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
        ['newton', '🍎', 'إسحاق نيوتن', 'العالم الإنكليزي الذي سُمّيت باسمه واحدة قياس شدّة القوة: النيوتن (N).'],
        ['joule', '🔥', 'جيمس جول', 'العالم الإنكليزي الذي سُمّيت باسمه واحدة قياس العمل: الجول (J).'],
        ['kidney', '🫘', 'مشفى الكلية', 'تأسّس مشفى الكلية في سورية عام 1989، ويُعدّ الخميس الثاني من آذار يوم الكلى العالمي.'],
        ['fingerprint', '🖐️', 'البصمة', 'لكلّ إنسان بصمة أصابع خاصة به، تميّزه عن غيره وتُستخدم للتعرّف عليه.'],
        ['sumer', '🛞', 'عجلة سومر', 'يعود أصل العجلات إلى حضارة سومر القديمة في العراق، في الألفية الخامسة قبل الميلاد.'],
        ['krak', '🏰', 'قلعة الحصن', 'قلعة عظيمة على تلّة في سورية. كيف بناها الأجداد؟ بالسطوح المائلة والروافع والبكرات والأوتاد!'],
    ],
    social: [
        ['pyramids', '🔺', 'أهرامات الجيزة', 'شُيّدت أهرامات خوفو وخفرع ومنقرع قرب القاهرة قبوراً للملوك، وهي من عجائب الدنيا السبع.'],
        ['carthage', '⛵', 'قرطاجة', 'أسّس الفينيقيون قرطاجة في القرن الثامن قبل الميلاد، قرب مدينة تونس العاصمة اليوم.'],
        ['nile', '🌊', 'نهر النيل', 'النيل أطول أنهار العالم، ويصبّ في البحر المتوسط مشكّلاً الدلتا، من أخصب المناطق الزراعية في العالم.'],
        ['kairouan', '🕌', 'مدينة القيروان', 'أسّسها عقبة بن نافع الفهري سنة 50هـ / 670م، فصارت نموذجاً للمدينة العربية الإسلامية في شمالي أفريقيا.'],
        ['mukhtar', '🐎', 'عمر المختار', 'بطل عربي من ليبيا قاوم الاحتلال الإيطالي منذ عام 1911م، وأبى التنازل عن حقوق بلاده.'],
        ['andalus', '🌉', 'الأندلس', 'صارت الأندلس صلة الوصل بين شمالي أفريقيا وأوروبا، ونقلت مدارس الترجمة فيها العلوم من العربية إلى اللغات الأوروبية.'],
    ],
    farm: [
        ['damask-rose', '🌹', 'الوردة الشامية', 'الزهرة الوطنية للجمهورية العربية السورية، ومنها يُستخرج زيت الورد العطري.'],
        ['shami-cow', '🐄', 'البقرة الشامية', 'سلالة سورية قديمة من أبقار الحليب، تعطي 3000–4000 لتر من الحليب في الموسم.'],
        ['honeybee', '🐝', 'نحلة العسل', 'لتصنع نصف كيلو من العسل يزور النحل نحو مليوني زهرة!'],
        ['cotton', '☁️', 'القطن', 'يُسمّى «الذهب الأبيض»، وهو من أهم المحاصيل النقدية في سورية.'],
        ['sugar-beet', '🍬', 'الشوندر السكري', 'يُزرع في سورية في ثلاث عروات، فتعمل معامل السكر طوال السنة.'],
        ['silkworm', '🐛', 'دودة القزّ', 'لا تأكل إلا ورق التوت، وتغزل شرنقتها من خيط حرير طوله 800–1500 متر!'],
    ],
    music: [
        ['qabbani', '🎭', 'أبو خليل القبّاني', 'من أوائل من أنشؤوا المسرح العربي التمثيلي، وكان له أثر في إنشاء مسرح تمثيلي في دمشق.'],
        ['guido', '📜', 'غيدو الآريزي', 'سمّى درجات السلّم من أول حرفين في أشطر أنشودة قديمة: Ut Re Mi Fa Sol La.'],
        ['glasses', '🥛', 'آلة الأكواب', 'نصنعها من 8 أكواب فيها ماء بنسب مختلفة: كلما قلّ الماء في الكوب ارتفع صوته.'],
        ['sunbati', '🎶', 'رياض السنباطي', 'ملحّن مصري تميّز بتلحين القصيدة العربية، وبلغت مؤلفاته الغنائية 539 عملاً.'],
        ['panflute', '🪈', 'البان فلوت', 'آلة تطوّرت عن الناي، فيها من 20 إلى 30 قصبة متلاصقة.'],
        ['mendelssohn', '🎹', 'مندلسون', 'بدأ العزف على البيانو في السادسة، وقاد أوركسترا في العشرين.'],
    ],
    // The art island's (core/studio/): facts from the grade-6 art book.
    // Draft content, pending review by Syrian educators.
    art: [
        ['fatna', '🫖', 'فاطنة كبوري', 'فنّانة تشكيلية مغربية (1924–1989م)، من أبرز فنّاني الفنّ الفطريّ في العالم العربيّ، وأكثر ما يميّز رسومها العيون المفتوحة والألوان الصريحة.'],
        ['perspective', '🛣️', 'نقطة الفرار', 'في المنظور تلتقي خطوط الشارع في نقطة الفرار على خطّ الأفق: القريب كبير ولونه غامق، والبعيد صغير ولونه فاتح.'],
        ['palmyra', '🏛️', 'النحت التدمريّ', 'نفّذ النحّاتون التدمريون أكثر منحوتاتهم النافرة على الحجر الكلسيّ الطريّ الذي تغنى به الجبال القريبة من تدمر.'],
        ['mask', '🎭', 'القناع الإفريقيّ', 'القناع الإفريقيّ موجود منذ قديم الزمان، وله علاقة بالطقوس الدينية والاجتماعية، وأغلب الأقنعة مصنوعة من خشب الأشجار.'],
        ['origami', '🦋', 'فنّ طيّ الورق', 'بطيّ ورقة مربّعة خطوة بعد خطوة نصنع فراشة، ونعلّق الفراشات بسلك معدنيّ لنزيّن بها الصفّ.'],
        ['marwan', '🖼️', 'مروان قصّاب باشي', 'رسّام ونحّات سوريّ من دمشق (1934–2016م)، من الفنّانين السوريين العالميين، اقتنت أعماله أهمّ متاحف العالم.'],
    ],
    // The English island's (core/english/): ENGLISH-STICKERS
    // Facts from the grade-6 English book. Draft content, pending review by Syrian educators.
    english: [
        ['continents', '🌍', 'القارّات السبع', 'على الأرض سبع قارّات وخمسة محيطات، وروسيا أكبر بلد في العالم: جزء منها في أوروبا وجزء في آسيا.'],
        ['bosra', '🎭', 'مسرح بصرى', 'يأتي زوّار من أنحاء العالم إلى مسرح بصرى ومسرح قلعة حلب ليستمتعوا بالرقص والغناء والمسرحيات.'],
        ['bluewhale', '🐋', 'الحوت الأزرق', 'الحوت الأزرق أكبر حيوان على الأرض، طوله نحو 100 قدم، ويتنفّس الهواء من فتحة في أعلى رأسه.'],
        ['childday', '🧒', 'يوم الطفل العالمي', 'كتبت الأمم المتحدة حقوق الطفل في 20 تشرين الثاني 1989، فصار هذا اليوم يوم الطفل العالمي.'],
        ['palmyra', '🏛️', 'رحلة إلى تدمر', 'في كتاب الإنكليزية يخطّط طفل لعطلته فيقول: I\'m going to travel to Palmyra. وتدمر مدينة أثرية في البادية السورية.'],
        ['saturn', '🪐', 'زحل', 'زحل الكوكب السادس في المجموعة الشمسية، لونه أصفر وحوله حلقات جميلة، وله نحو 82 قمراً.'],
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
// little toast — or, with `id`, that sticker. Returns the sticker or null.
export function awardSticker(islandId, id = null) {
    const pool = STICKERS[islandId] || [];
    const have = owned();
    const next = pool.find(([sid]) => !have.includes(sid) && (!id || sid === id));
    if (!next)
        return null;
    save.update(s => { s.stickers = [...(s.stickers || []), next[0]]; });
    toast(next);
    return next;
}
let queue = [], showing = false;
function toast(st) {
    queue.push(st);
    if (!showing)
        showNext();
}
function showNext() {
    const st = queue.shift();
    if (!st) {
        showing = false;
        return;
    }
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
        if (e.target === el || e.target.closest('[data-close]')) {
            sfx.tap();
            el.remove();
            return;
        }
        const s = e.target.closest('[data-fact]');
        if (s) {
            sfx.tap();
            el.querySelectorAll('.is-picked').forEach(x => x.classList.remove('is-picked'));
            s.classList.add('is-picked');
            el.querySelector('.album__fact').innerHTML = `<b>${s.dataset.name}:</b> ${s.dataset.fact}`;
        }
    };
}
const num = (n) => String(n);
