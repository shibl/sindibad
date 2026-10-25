// Atlas cards for the globe: tap a country and its card opens with the flag,
// the name, the capital, the currency, what the name means, what the flag
// means and the main resources. Keys are the ISO 3166-1 numeric codes of the
// Natural Earth 1:110m polygons (world-atlas 2.0.2), as in shapes.js.
//
// Draft content, pending review by Syrian educators. CC-BY-SA.
//
// Tiers:
//   COUNTRIES  full cards (tier A) for the 22 members of the Arab League, the
//              African countries this grade's book studies or names as
//              neighbours, and the major world countries; a short card
//              (tier B: ar, capital, continent, lat, lon) for every other
//              polygon. `territory: true` + `note` mark polygons that are not
//              independent countries (Greenland, Puerto Rico, …); `capital`
//              is null where there is none (Antarctica, the French Southern
//              Lands).
//   SMALL      full cards for Arab League members with no 110m polygon
//              (Bahrain, Comoros), drawn as a dot at lat/lon.
//
// Map decisions (the game follows the maps of the Syrian textbook):
//   - Palestine ('275') covers the whole of historic Palestine: the polygon
//     '376' gets no entry and is merged into Palestine. No currency is given
//     for Palestine (it has no currency of its own today).
//   - Western Sahara ('732') gets no entry: it is drawn as part of Morocco.
//   - Taiwan ('158') gets no entry: it is merged with China.
//   - The polygons with no id are merged too: Somaliland with Somalia ('706'),
//     N. Cyprus with Cyprus ('196'), Kosovo with Serbia ('688').
//   - South Sudan ('728') is its own country, separate from Sudan ('729').
//   - Arab League members have `arab: true`.
//
// lat/lon is a point inside the country's polygon (for the label and the
// camera). Flags are simplified drawings in a 300×200 box whatever their real
// ratio: no text, no images, no outside links; emblems are reduced to simple
// shapes. Western digits only.

// ---- flag drawing helpers ----------------------------------------------

const f = (n) => Math.round(n * 10) / 10;
const svg = (body) => `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const flag = (colors, body) => ({ colors, svg: svg(body) });
const field = (c) => `<rect width="300" height="200" fill="${c}"/>`;
const rect = (x, y, w, h, c) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${c}"/>`;
const circle = (cx, cy, r, c) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${c}"/>`;
const ring = (cx, cy, r, c, w) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
const poly = (pts, c) => `<polygon points="${pts}" fill="${c}"/>`;
const path = (d, c) => `<path d="${d}" fill="${c}"/>`;
const line = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
// Round dots (a zero-length stroke with round caps), e.g. the stars of the USA.
const dots = (pts, c, w) => `<path d="${pts.map(([x, y]) => `M${f(x)},${f(y)}h0`).join('')}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;

// Bands of colour; `ws` gives relative widths. Each band runs to the far edge
// and the next one covers the rest, so no hairline gaps show.
function stripes(cs, ws, vertical) {
  ws = ws || cs.map(() => 1);
  const total = ws.reduce((a, b) => a + b, 0), size = vertical ? 300 : 200;
  let pos = 0;
  return cs.map((c, i) => {
    const s = vertical ? rect(pos, 0, 300 - pos, 200, c) : rect(0, pos, 300, 200 - pos, c);
    pos += size * ws[i] / total;
    return s;
  }).join('');
}
const hbars = (cs, ws) => stripes(cs, ws, false);
const vbars = (cs, ws) => stripes(cs, ws, true);
// Every other one of n equal horizontal stripes (the 2nd, 4th, …) in colour c.
function altStripes(n, c) {
  let d = '';
  for (let i = 1; i < n; i += 2) d += `M0,${f((i + 0.5) * 200 / n)}h300`;
  return line(d, c, f(200 / n));
}

// A star with n points (k = inner radius / outer radius), first point at angle a0.
// Small stars use whole numbers, to keep the svg short.
function star(cx, cy, r, c, n = 5, k = 0.382, a0 = -90) {
  const pts = [], g = r < 20 ? Math.round : f;
  for (let i = 0; i < 2 * n; i++) {
    const a = (a0 + i * 180 / n) * Math.PI / 180, rr = i % 2 ? r * k : r;
    pts.push(`${g(cx + rr * Math.cos(a))},${g(cy + rr * Math.sin(a))}`);
  }
  return poly(pts.join(' '), c);
}
// A star with a white border (New Zealand).
const edgedStar = (cx, cy, r, c) => star(cx, cy, r, c).replace('/>', ' stroke="#fff" stroke-width="4"/>');
// The outline of a five-pointed star (Morocco, Ethiopia).
function pentagram(cx, cy, r, c, w) {
  const pts = [0, 2, 4, 1, 3].map((i) => {
    const a = (-90 + 72 * i) * Math.PI / 180;
    return `${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`;
  });
  return `<polygon points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`;
}
// A crescent: the circle (cx, cy, R) minus the circle of radius r moved by
// (dx, dy). Drawn as one path, so it sits on any background.
function crescent(cx, cy, R, dx, dy, r, c) {
  const d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
  const a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(R * R - a * a);
  const mx = cx + a * ux, my = cy + a * uy;
  const p1 = [mx - h * uy, my + h * ux], p2 = [mx + h * uy, my - h * ux];
  const far = [cx - R * ux, cy - R * uy], near = [cx + (d - r) * ux, cy + (d - r) * uy];
  const turn = (o, p, q) => ((p[0] - o[0]) * (q[1] - p[1]) - (p[1] - o[1]) * (q[0] - p[0])) > 0 ? 1 : 0;
  const pt = (p) => `${f(p[0])},${f(p[1])}`;
  return path(`M${pt(p1)}A${R},${R} 0 ${a > 0 ? 1 : 0},${turn(p1, far, p2)} ${pt(p2)}` +
    `A${r},${r} 0 ${d - a < 0 ? 1 : 0},${turn(p2, near, p1)} ${pt(p1)}Z`, c);
}
// The serrated edge of Bahrain and Qatar: colour c to the right of x, n teeth.
function teeth(x, depth, n, c) {
  let p = `300,0 ${x},0`;
  for (let i = 0; i < n; i++) p += ` ${f(x + depth)},${f((i + 0.5) * 200 / n)} ${x},${f((i + 1) * 200 / n)}`;
  return poly(`${p} 300,200`, c);
}
// One trigram of the Korean flag: three black bars, each whole (0) or broken (1).
function trigram(cx, cy, rot, bars) {
  const d = bars.map((b, i) => {
    const y = cy - 16 + i * 12;
    return b ? `M${cx - 25},${y}h22v8h-22zM${cx + 3},${y}h22v8h-22z` : `M${cx - 25},${y}h50v8h-50z`;
  }).join('');
  return `<path transform="rotate(${rot} ${cx} ${cy})" d="${d}" fill="#000"/>`;
}
// The Union Jack, filling the 300×200 box.
// The thin red diagonals are offset from the white ones (counterchanged).
function unionJack() {
  let red = '';
  for (const [px, py] of [[0, 0], [300, 0], [300, 200], [0, 200]]) {
    const dx = px - 150, dy = py - 100, l = Math.hypot(dx, dy), nx = Math.round(dy / l * 10), ny = Math.round(-dx / l * 10);
    red += `M150,100L${px},${py}l${nx},${ny}L${150 + nx},${100 + ny}z`;
  }
  return field('#012169') + line('M0,0L300,200M300,0L0,200', '#fff', 30) + path(red, '#c8102e') +
    line('M150,0V200M0,100H300', '#fff', 50) + line('M150,0V200M0,100H300', '#c8102e', 30);
}
// The Union Jack in the top-left quarter (Australia, New Zealand); the inner
// svg clips it to its box.
const jackCanton = () => `<svg width="150" height="100" viewBox="0 0 300 200">${unionJack()}</svg>`;

function usaFlag() {
  const st = [];
  for (let j = 0; j < 9; j++) for (let k = 0; k < (j % 2 ? 5 : 6); k++) st.push([(j % 2 ? 20 : 10) + k * 20, 10.77 * (j + 1)]);
  return field('#b22234') + altStripes(13, '#fff') + rect(0, 0, 120, 107.7, '#3c3b6e') + dots(st, '#fff', 6);
}
function chinaFlag() {
  return field('#ee1c25') + star(50, 50, 30, '#ffde00') + [[100, 20], [120, 40], [120, 70], [100, 90]]
    .map(([x, y]) => star(x, y, 10, '#ffde00', 5, 0.382, Math.atan2(50 - y, 50 - x) * 180 / Math.PI)).join('');
}
function indiaFlag() {
  let d = '';
  for (let i = 0; i < 12; i++) {
    const a = i * 15 * Math.PI / 180, x = 26 * Math.cos(a), y = 26 * Math.sin(a);
    d += `M${f(150 + x)},${f(100 + y)}L${f(150 - x)},${f(100 - y)}`;
  }
  return hbars(['#ff9933', '#fff', '#138808']) + ring(150, 100, 26, '#000080', 3) + line(d, '#000080', 1.5) + circle(150, 100, 4, '#000080');
}
function koreaFlag() {
  return field('#fff') + '<g transform="rotate(33.7 150 100)">' +
    path('M100,100a50,50 0 0,1 100,0z', '#cd2e3a') + path('M100,100a50,50 0 0,0 100,0z', '#0047a0') +
    circle(125, 100, 25, '#cd2e3a') + circle(175, 100, 25, '#0047a0') + '</g>' +
    trigram(71, 47, -56.3, [0, 0, 0]) + trigram(229, 153, -56.3, [1, 1, 1]) +
    trigram(229, 47, 56.3, [1, 0, 1]) + trigram(71, 153, 56.3, [0, 1, 0]);
}
function kazakhFlag() {
  let d = '';
  for (let y = 10; y < 190; y += 20) d += `M24,${y}l7,10l-7,10l-7,-10z`;
  return field('#00afca') + star(162, 82, 36, '#fec50c', 32, 0.8) + circle(162, 82, 26, '#00afca') + circle(162, 82, 22, '#fec50c') +
    path('M100,132q35,-22 62,-4q27,-18 62,4q-28,-6 -62,12q-34,-18 -62,-12z', '#fec50c') + path(d, '#fec50c');
}
function venezuelaFlag() {
  let s = '';
  for (let i = 0; i < 8; i++) {
    const a = (-160 + i * 20) * Math.PI / 180;
    s += star(150 + 52 * Math.cos(a), 128 + 52 * Math.sin(a), 7, '#fff');
  }
  return hbars(['#ffcc00', '#00247d', '#cf142b']) + s;
}
const MAPLE = '150,35 162,58 176,52 170,88 190,70 196,80 215,76 206,100 214,106 178,134 182,148 153,143 154,172 146,172 147,143 118,148 122,134 86,106 94,100 85,76 104,80 110,70 130,88 124,52 138,58';

// ---- data ----------------------------------------------------------------

export const CONTINENTS = { asia: 'آسيا', africa: 'أفريقيا', europe: 'أوروبا', namerica: 'أمريكا الشمالية', samerica: 'أمريكا الجنوبية', oceania: 'أوقيانوسيا', antarctica: 'القارة القطبية الجنوبية' };

export const COUNTRIES = {
  // ===== Tier A: the Arab League =====
  '760': {
    ar: 'سورية', official: 'الجمهورية العربية السورية', capital: 'دمشق', continent: 'asia', arab: true,
    currency: { ar: 'الليرة السورية', code: 'SYP' },
    language: 'العربية',
    nameMeaning: 'يُرجَّح أنّ اسم «سورية» جاء من اسم «آشور» القديم، وقد أطلقه الإغريق على هذه البلاد قبل أكثر من ألفي عام.',
    flag: flag(['#007a3d', '#ffffff', '#000000', '#ce1126'], hbars(['#007a3d', '#fff', '#000']) + star(85, 100, 20, '#ce1126') + star(150, 100, 20, '#ce1126') + star(215, 100, 20, '#ce1126')),
    flagMeaning: 'هو علم الاستقلال الذي رُفع أول مرة في ثلاثينيات القرن العشرين. ألوانه الأخضر والأبيض والأسود من ألوان علم الثورة العربية، وعلى الشريط الأبيض ثلاث نجوم حمراء.',
    resources: ['القمح', 'القطن', 'الزيتون', 'الفستق الحلبي', 'الفوسفات'],
    fact: 'في أوغاريت قرب اللاذقية عُثر على رُقيم طيني صغير عليه واحدة من أقدم الأبجديات في العالم.',
    lat: 35.1, lon: 38.4,
  },
  '422': {
    ar: 'لبنان', official: 'الجمهورية اللبنانية', capital: 'بيروت', continent: 'asia', arab: true,
    currency: { ar: 'الليرة اللبنانية', code: 'LBP' },
    language: 'العربية',
    nameMeaning: 'اسم «لبنان» من جذر سامي قديم معناه «الأبيض»، نسبةً إلى الثلج الذي يكسو قمم جباله.',
    flag: flag(['#ed1c24', '#ffffff', '#00a651'], hbars(['#ed1c24', '#fff', '#ed1c24'], [1, 2, 1]) + poly('150,45 120,75 135,75 105,100 128,100 95,128 140,128 140,150 160,150 160,128 205,128 172,100 195,100 165,75 180,75', '#00a651')),
    flagMeaning: 'الأحمر رمز التضحية، والأبيض رمز السلام والثلج، وفي الوسط شجرة الأرز الخضراء رمز الخلود والصمود.',
    resources: ['التفاح', 'الحمضيات', 'الزيتون', 'العنب', 'السياحة'],
    fact: 'مدينة جبيل في لبنان من أقدم المدن المأهولة في العالم، وفيها وُجدت من أقدم نقوش الأبجدية الفينيقية.',
    lat: 33.9, lon: 35.9,
  },
  '400': {
    ar: 'الأردن', official: 'المملكة الأردنية الهاشمية', capital: 'عمّان', continent: 'asia', arab: true,
    currency: { ar: 'الدينار الأردني', code: 'JOD' },
    language: 'العربية',
    nameMeaning: 'سُمّيت البلاد باسم نهر الأردن، ويُرجَّح أنّ اسم النهر معناه «المنحدر»، لأنه ينحدر جنوباً نحو البحر الميت.',
    flag: flag(['#000000', '#ffffff', '#007a3d', '#ce1126'], hbars(['#000', '#fff', '#007a3d']) + poly('0,0 150,100 0,200', '#ce1126') + star(50, 100, 17, '#fff', 7, 0.5)),
    flagMeaning: 'ألوانه مأخوذة من علم الثورة العربية الكبرى، وفي المثلث الأحمر نجمة بيضاء لها سبعة رؤوس ترمز إلى آيات سورة الفاتحة السبع.',
    resources: ['الفوسفات', 'البوتاس', 'الخضار', 'السياحة'],
    fact: 'في الأردن مدينة البتراء المنحوتة في الصخر الوردي، وهي من عجائب الدنيا السبع الجديدة.',
    lat: 30.7, lon: 36.4,
  },
  '275': {
    ar: 'فلسطين', official: 'دولة فلسطين', capital: 'القدس', continent: 'asia', arab: true,
    language: 'العربية',
    nameMeaning: 'يعود اسم فلسطين إلى قوم قدماء سكنوا ساحلها الجنوبي يُسمَّون «الفلستيين»، ثم أطلق الإغريق والرومان الاسم على البلاد كلها.',
    flag: flag(['#000000', '#ffffff', '#009736', '#ce1126'], hbars(['#000', '#fff', '#009736']) + poly('0,0 100,100 0,200', '#ce1126')),
    flagMeaning: 'ألوانه الأربعة مأخوذة من علم الثورة العربية الكبرى عام 1916، ويُقال إنّ كل لون منها يرمز إلى عهد من عهود التاريخ العربي.',
    resources: ['الزيتون وزيته', 'البرتقال', 'العنب', 'التمر', 'حجر البناء'],
    fact: 'مدينة أريحا في فلسطين من أقدم المدن في العالم، وهي أيضاً من أخفض المدن عن سطح البحر.',
    lat: 32, lon: 35.3,
  },
  '368': {
    ar: 'العراق', official: 'جمهورية العراق', capital: 'بغداد', continent: 'asia', arab: true,
    currency: { ar: 'الدينار العراقي', code: 'IQD' },
    language: 'العربية والكردية',
    nameMeaning: 'يُرجَّح أنّ كلمة «العراق» تعني في العربية «الشاطئ» أو «الضفة»، لأنّ أرضه تمتد على ضفاف دجلة والفرات. ويرى آخرون أنها من اسم مدينة «أوروك» القديمة.',
    flag: flag(['#ce1126', '#ffffff', '#000000', '#007a3d'], hbars(['#ce1126', '#fff', '#000']) + path('M110,84h80v8h-80zM118,92h8v22h-8zM146,92h8v22h-8zM174,92h8v22h-8zM110,114h80v6h-80z', '#007a3d')),
    flagMeaning: 'ألوانه الأحمر والأبيض والأسود من الألوان العربية، وفي وسطه عبارة «الله أكبر» مكتوبة باللون الأخضر.',
    resources: ['النفط', 'الغاز الطبيعي', 'التمر', 'القمح'],
    fact: 'في جنوب العراق ظهرت الكتابة المسمارية، وهي من أقدم أنواع الكتابة في العالم.',
    lat: 33.1, lon: 43.1,
  },
  '682': {
    ar: 'السعودية', official: 'المملكة العربية السعودية', capital: 'الرياض', continent: 'asia', arab: true,
    currency: { ar: 'الريال السعودي', code: 'SAR' },
    language: 'العربية',
    nameMeaning: 'سُمّيت المملكة نسبةً إلى الأسرة الحاكمة «آل سعود»، و«العربية» نسبةً إلى شبه الجزيرة العربية التي تشغل معظمها.',
    flag: flag(['#006c35', '#ffffff'], field('#006c35') + poly('68,140 82,135 215,135 215,145 82,145', '#fff') + rect(215, 128, 5, 24, '#fff') + rect(220, 136, 18, 8, '#fff') + circle(240, 140, 5, '#fff')),
    flagMeaning: 'علم أخضر كُتبت عليه الشهادتان باللون الأبيض، وتحتهما سيف يرمز إلى القوة والعدل.',
    resources: ['النفط', 'الغاز الطبيعي', 'البتروكيماويات', 'التمر'],
    fact: 'لا يجري في السعودية أي نهر دائم، وفيها صحراء الربع الخالي، وهي من أكبر الصحاري الرملية في العالم.',
    lat: 23.5, lon: 44.8,
  },
  '414': {
    ar: 'الكويت', official: 'دولة الكويت', capital: 'مدينة الكويت', continent: 'asia', arab: true,
    currency: { ar: 'الدينار الكويتي', code: 'KWD' },
    language: 'العربية',
    nameMeaning: '«الكويت» تصغير لكلمة «الكوت»، وهو الحصن أو البيت الكبير المبني قرب الماء.',
    flag: flag(['#007a3d', '#ffffff', '#ce1126', '#000000'], hbars(['#007a3d', '#fff', '#ce1126']) + poly('0,0 75,66.7 75,133.3 0,200', '#000')),
    flagMeaning: 'ألوانه هي الألوان العربية الأربعة، ويربطها الكويتيون ببيت شعر قديم: الأخضر للأرض الخصبة، والأبيض للأعمال الطيبة، والأحمر والأسود لشجاعة المدافعين عن الوطن.',
    resources: ['النفط', 'الغاز الطبيعي', 'البتروكيماويات', 'السمك'],
    fact: 'قبل اكتشاف النفط عاش كثير من أهل الكويت من الغوص بحثاً عن اللؤلؤ ومن التجارة بالسفن الشراعية.',
    lat: 29.5, lon: 47.6,
  },
  '634': {
    ar: 'قطر', official: 'دولة قطر', capital: 'الدوحة', continent: 'asia', arab: true,
    currency: { ar: 'الريال القطري', code: 'QAR' },
    language: 'العربية',
    nameMeaning: 'أصل الاسم غير مؤكد، ويُرجَّح أنه قديم جداً، فقد ذكر جغرافيون قدماء بلدة اسمها «قطارا» في هذه المنطقة.',
    flag: flag(['#ffffff', '#8a1538'], field('#fff') + teeth(90, 22, 9, '#8a1538')),
    flagMeaning: 'الأبيض رمز السلام، واللون العنّابي (الأحمر الداكن) هو لون قطر المميّز، ويفصل بينهما خط مسنّن له تسعة رؤوس.',
    resources: ['الغاز الطبيعي', 'النفط', 'البتروكيماويات', 'السمك'],
    fact: 'قطر شبه جزيرة يحيط بها البحر من ثلاث جهات، ولها حدود برية مع السعودية وحدها.',
    lat: 25.4, lon: 51.2,
  },
  '784': {
    ar: 'الإمارات', official: 'دولة الإمارات العربية المتحدة', capital: 'أبوظبي', continent: 'asia', arab: true,
    currency: { ar: 'الدرهم الإماراتي', code: 'AED' },
    language: 'العربية',
    nameMeaning: 'سُمّيت كذلك لأنها اتحاد من سبع إمارات عربية، منها أبوظبي ودبي والشارقة.',
    flag: flag(['#00843d', '#ffffff', '#000000', '#ef3340'], hbars(['#00843d', '#fff', '#000']) + rect(0, 0, 75, 200, '#ef3340')),
    flagMeaning: 'ألوانه هي الألوان العربية الأربعة، ويُقال إنّ الأخضر للخير والنماء، والأبيض للسلام، والأسود للقوة، والأحمر للتضحية.',
    resources: ['النفط', 'الغاز الطبيعي', 'التجارة', 'السياحة', 'التمر'],
    fact: 'في دبي جزيرة صناعية كبيرة بُنيت في البحر على شكل نخلة.',
    lat: 23.4, lon: 54.4,
  },
  '512': {
    ar: 'عُمان', official: 'سلطنة عُمان', capital: 'مسقط', continent: 'asia', arab: true,
    currency: { ar: 'الريال العُماني', code: 'OMR' },
    language: 'العربية',
    nameMeaning: 'أصل الاسم غير مؤكد، ويُرجَّح أنه من كلمة عربية قديمة معناها «المقيم» أو «المستقر في المكان».',
    flag: flag(['#ffffff', '#db161b', '#008000'], hbars(['#fff', '#db161b', '#008000']) + rect(0, 0, 75, 200, '#db161b') + line('M16,16L54,54M54,16L16,54', '#fff', 4) + poly('35,10 40,17 38,52 32,52 30,17', '#fff')),
    flagMeaning: 'الأبيض رمز السلام، والأحمر رمز الدفاع عن الوطن، والأخضر رمز الخصب والجبل الأخضر، وفي الزاوية شعار البلاد: خنجر عُماني وسيفان.',
    resources: ['النفط', 'الغاز الطبيعي', 'التمر', 'السمك', 'اللبان'],
    fact: 'تشتهر عُمان بشجرة اللبان التي يُستخرج منها بخور طيّب الرائحة منذ آلاف السنين.',
    lat: 22.2, lon: 57.5,
  },
  '887': {
    ar: 'اليمن', official: 'الجمهورية اليمنية', capital: 'صنعاء', continent: 'asia', arab: true,
    currency: { ar: 'الريال اليمني', code: 'YER' },
    language: 'العربية',
    nameMeaning: 'يُرجَّح أنّ الاسم من «اليُمن» أي البركة والخير، أو لأنّ العرب كانوا يسمّون جهة الجنوب «اليمين»، واليمن في جنوب الجزيرة العربية.',
    flag: flag(['#ce1126', '#ffffff', '#000000'], hbars(['#ce1126', '#fff', '#000'])),
    flagMeaning: 'الأحمر رمز التضحية والوحدة، والأبيض رمز المستقبل المشرق، والأسود رمز الماضي الصعب الذي مضى.',
    resources: ['البن', 'العسل', 'السمك', 'النفط والغاز'],
    fact: 'من ميناء المخا في اليمن انتشرت القهوة إلى العالم، ولذلك يُسمّى نوع من القهوة «موكا».',
    lat: 15.3, lon: 45,
  },
  '818': {
    ar: 'مصر', official: 'جمهورية مصر العربية', capital: 'القاهرة', continent: 'africa', arab: true,
    currency: { ar: 'الجنيه المصري', code: 'EGP' },
    language: 'العربية',
    nameMeaning: 'كلمة «مصر» في العربية تعني البلد أو المدينة الكبيرة، ويُرجَّح أنّ أصلها كلمة سامية قديمة معناها «الحدّ» أو «الحصن».',
    flag: flag(['#ce1126', '#ffffff', '#000000', '#c09300'], hbars(['#ce1126', '#fff', '#000']) + poly('118,82 150,96 182,82 176,112 150,122 124,112', '#c09300') + circle(150, 82, 8, '#c09300') + poly('141,120 159,120 155,131 145,131', '#c09300')),
    flagMeaning: 'الأحمر رمز التضحية، والأبيض رمز السلام، والأسود رمز انتهاء عهد الظلم، وفي الوسط نسر صلاح الدين الذهبي.',
    resources: ['القطن', 'الغاز الطبيعي والنفط', 'قناة السويس', 'السياحة', 'الأرز'],
    fact: 'في الجيزة قرب القاهرة الهرم الأكبر، وهو الوحيد الباقي من عجائب الدنيا السبع القديمة.',
    lat: 25.9, lon: 29.4,
  },
  '729': {
    ar: 'السودان', official: 'جمهورية السودان', capital: 'الخرطوم', continent: 'africa', arab: true,
    currency: { ar: 'الجنيه السوداني', code: 'SDG' },
    language: 'العربية',
    nameMeaning: 'الاسم مأخوذ من عبارة «بلاد السودان» التي أطلقها الجغرافيون العرب قديماً على البلاد الواقعة جنوب الصحراء الكبرى، نسبةً إلى لون بشرة أهلها.',
    flag: flag(['#d21034', '#ffffff', '#000000', '#007229'], hbars(['#d21034', '#fff', '#000']) + poly('0,0 100,100 0,200', '#007229')),
    flagMeaning: 'ألوانه من الألوان العربية: الأحمر للتضحية، والأبيض للسلام، والأسود لاسم السودان، والأخضر للخير والزراعة.',
    resources: ['الصمغ العربي', 'القطن', 'الذهب', 'السمسم', 'الماشية'],
    fact: 'في الخرطوم يلتقي النيل الأبيض بالنيل الأزرق ليكوّنا معاً نهر النيل.',
    lat: 16.7, lon: 29.4,
  },
  '434': {
    ar: 'ليبيا', official: 'دولة ليبيا', capital: 'طرابلس', continent: 'africa', arab: true,
    currency: { ar: 'الدينار الليبي', code: 'LYD' },
    language: 'العربية',
    nameMeaning: 'اسم قديم جداً، أطلقه المصريون القدماء ثم الإغريق على قبائل «الليبو» التي سكنت غرب مصر.',
    flag: flag(['#e70013', '#000000', '#239e46', '#ffffff'], hbars(['#e70013', '#000', '#239e46'], [1, 2, 1]) + crescent(143, 100, 30, 9, 0, 25, '#fff') + star(172, 100, 13, '#fff', 5, 0.382, 180)),
    flagMeaning: 'هو علم الاستقلال الذي رُفع عام 1951، وكل لون من ألوانه الثلاثة يرمز إلى إقليم من أقاليم ليبيا التاريخية، وفي الوسط هلال ونجمة بيضاء.',
    resources: ['النفط', 'الغاز الطبيعي', 'التمر', 'الزيتون'],
    fact: 'معظم أرض ليبيا صحراء، وعلى ساحلها آثار مدينة لبدة الكبرى الرومانية.',
    lat: 27.4, lon: 14.4,
  },
  '788': {
    ar: 'تونس', official: 'الجمهورية التونسية', capital: 'تونس', continent: 'africa', arab: true,
    currency: { ar: 'الدينار التونسي', code: 'TND' },
    language: 'العربية',
    nameMeaning: 'سُمّيت البلاد باسم عاصمتها تونس، وهي مدينة قديمة جداً، ويرى بعضهم أنّ اسمها من «الأُنس» أي الألفة والراحة.',
    flag: flag(['#e70013', '#ffffff'], field('#e70013') + circle(150, 100, 50, '#fff') + crescent(146, 100, 36, 9, 0, 29, '#e70013') + star(162, 100, 20, '#e70013', 5, 0.382, 180)),
    flagMeaning: 'الأحمر رمز التضحية، والدائرة البيضاء رمز السلام، والهلال والنجمة الحمراوان رمز الوحدة.',
    resources: ['زيت الزيتون', 'التمر', 'الفوسفات', 'السمك', 'السياحة'],
    fact: 'تونس من أكبر منتجي زيت الزيتون في العالم، وفيها آثار مدينة قرطاج القديمة.',
    lat: 33.8, lon: 9,
  },
  '012': {
    ar: 'الجزائر', official: 'الجمهورية الجزائرية الديمقراطية الشعبية', capital: 'الجزائر', continent: 'africa', arab: true,
    currency: { ar: 'الدينار الجزائري', code: 'DZD' },
    language: 'العربية والأمازيغية',
    nameMeaning: 'سُمّيت البلاد باسم عاصمتها، وسُمّيت المدينة «الجزائر» لجزر صغيرة كانت أمام ساحلها.',
    flag: flag(['#006233', '#ffffff', '#d21034'], vbars(['#006233', '#fff']) + crescent(155, 100, 50, 12, 0, 41, '#d21034') + star(188, 100, 22, '#d21034', 5, 0.382, 180)),
    flagMeaning: 'الأخضر رمز الطبيعة والخير، والأبيض رمز السلام، والهلال والنجمة الحمراوان يذكّران بالتضحية من أجل الحرية.',
    resources: ['الغاز الطبيعي', 'النفط', 'التمر', 'الحديد'],
    fact: 'الجزائر أكبر دولة في أفريقيا مساحةً، ومعظم أرضها جزء من الصحراء الكبرى.',
    lat: 27.5, lon: 2.7,
  },
  '504': {
    ar: 'المغرب', official: 'المملكة المغربية', capital: 'الرباط', continent: 'africa', arab: true,
    currency: { ar: 'الدرهم المغربي', code: 'MAD' },
    language: 'العربية والأمازيغية',
    nameMeaning: '«المغرب» معناه مكان غروب الشمس، لأنه أبعد البلاد العربية نحو الغرب.',
    flag: flag(['#c1272d', '#006233'], field('#c1272d') + pentagram(150, 104, 48, '#006233', 7)),
    flagMeaning: 'الأحمر لون تاريخي للمغرب، وفي وسطه نجمة خضراء خماسية ترمز إلى أركان الإسلام الخمسة.',
    resources: ['الفوسفات', 'الحمضيات', 'الزيتون', 'السمك', 'السياحة'],
    fact: 'في مدينة فاس جامعة القرويين، وهي من أقدم الجامعات في العالم، وقد أسستها امرأة اسمها فاطمة الفهرية.',
    lat: 31.7, lon: -6.8,
  },
  '478': {
    ar: 'موريتانيا', official: 'الجمهورية الإسلامية الموريتانية', capital: 'نواكشوط', continent: 'africa', arab: true,
    currency: { ar: 'الأوقية', code: 'MRU' },
    language: 'العربية',
    nameMeaning: 'الاسم من «موريطانيا» القديمة، أي «بلاد المور»، وهو اسم أطلقه الرومان على سكان شمال غرب أفريقيا.',
    flag: flag(['#006233', '#ffc400', '#d01c1f'], field('#006233') + rect(0, 0, 300, 30, '#d01c1f') + rect(0, 170, 300, 30, '#d01c1f') + crescent(150, 98, 48, 0, -14, 46, '#ffc400') + star(150, 72, 15, '#ffc400')),
    flagMeaning: 'الأخضر رمز الأمل، والهلال والنجمة رمز الإسلام ولونهما الذهبي لون رمال الصحراء، والشريطان الأحمران يكرّمان من ضحّوا من أجل الاستقلال.',
    resources: ['خام الحديد', 'السمك', 'الذهب', 'النحاس', 'الماشية'],
    fact: 'تُلقّب موريتانيا «بلاد المليون شاعر» لكثرة الشعراء فيها وحبّ أهلها للشعر.',
    lat: 19.2, lon: -9.8,
  },
  '706': {
    ar: 'الصومال', official: 'جمهورية الصومال الفيدرالية', capital: 'مقديشو', continent: 'africa', arab: true,
    currency: { ar: 'الشلن الصومالي', code: 'SOS' },
    language: 'الصومالية والعربية',
    nameMeaning: 'أصل الاسم غير مؤكد، فيُقال إنه من عبارة صومالية معناها «اذهب واحلب» دلالةً على الكرم وكثرة المواشي، ويُرجعه آخرون إلى جدّ قديم اسمه «سامالي».',
    flag: flag(['#4189dd', '#ffffff'], field('#4189dd') + star(150, 104, 40, '#fff')),
    flagMeaning: 'الأزرق لون السماء والمحيط، والنجمة البيضاء ذات الرؤوس الخمسة في الوسط رمز الوحدة والحرية.',
    resources: ['الإبل والماشية', 'الموز', 'السمك', 'اللبان'],
    fact: 'للصومال أطول ساحل في البر الرئيسي لقارة أفريقيا.',
    lat: 2.5, lon: 43,
  },
  '262': {
    ar: 'جيبوتي', official: 'جمهورية جيبوتي', capital: 'جيبوتي', continent: 'africa', arab: true,
    currency: { ar: 'الفرنك الجيبوتي', code: 'DJF' },
    language: 'العربية والفرنسية',
    nameMeaning: 'سُمّيت البلاد باسم عاصمتها، وأصل الاسم غير مؤكد، ويُرجّح بعضهم أنه من كلمة بلغة العفر معناها «الطبق».',
    flag: flag(['#6ab2e7', '#12ad2b', '#ffffff', '#d7141a'], hbars(['#6ab2e7', '#12ad2b']) + poly('0,0 130,100 0,200', '#fff') + star(45, 100, 17, '#d7141a')),
    flagMeaning: 'الأزرق للبحر والسماء، والأخضر للأرض، والمثلث الأبيض للسلام، والنجمة الحمراء للوحدة.',
    resources: ['الميناء والتجارة', 'الملح', 'الماشية', 'السمك'],
    fact: 'في جيبوتي بحيرة عسل، وهي أخفض مكان في أفريقيا، ومياهها شديدة الملوحة.',
    lat: 11.5, lon: 42.2,
  },

  // ===== Tier A: Africa (the book's countries and neighbours) =====
  '231': {
    ar: 'إثيوبيا', official: 'جمهورية إثيوبيا الديمقراطية الفيدرالية', capital: 'أديس أبابا', continent: 'africa',
    currency: { ar: 'البِر الإثيوبي', code: 'ETB' },
    language: 'الأمهرية ولغات أخرى',
    nameMeaning: 'الاسم إغريقي قديم معناه «الوجوه التي لوّحتها الشمس»، وكان العرب قديماً يسمّون هذه البلاد «الحبشة».',
    flag: flag(['#078930', '#fcdd09', '#da121a', '#0f47af'], hbars(['#078930', '#fcdd09', '#da121a']) + circle(150, 100, 45, '#0f47af') + pentagram(150, 103, 34, '#fcdd09', 4)),
    flagMeaning: 'الأخضر رمز الأرض الخصبة، والأصفر رمز الأمل، والأحمر رمز التضحية، والنجمة على الدائرة الزرقاء رمز الوحدة بين شعوبها.',
    resources: ['البن', 'الماشية', 'الزهور', 'السمسم'],
    fact: 'من بحيرة تانا في إثيوبيا يخرج النيل الأزرق، ومن هضبة إثيوبيا تأتي معظم مياه نهر النيل.',
    lat: 8.6, lon: 38.3,
  },
  '232': {
    ar: 'إريتريا', official: 'دولة إريتريا', capital: 'أسمرة', continent: 'africa',
    currency: { ar: 'الناكفا الإريترية', code: 'ERN' },
    language: 'التغرينية والعربية والإنجليزية',
    nameMeaning: 'الاسم من «البحر الإريتري»، وهو الاسم الإغريقي القديم للبحر الأحمر، ومعناه «البحر الأحمر».',
    flag: flag(['#12ad2b', '#4189dd', '#ea0437', '#ffc726'], hbars(['#12ad2b', '#4189dd']) + poly('0,0 300,100 0,200', '#ea0437') + ring(70, 100, 26, '#ffc726', 5) + line('M70,128V84', '#ffc726', 5)),
    flagMeaning: 'الأخضر رمز الزراعة، والأزرق رمز البحر، والأحمر رمز التضحية من أجل الاستقلال، وغصن الزيتون الذهبي رمز السلام.',
    resources: ['الذهب', 'النحاس', 'السمك', 'الماشية'],
    fact: 'تطلّ إريتريا على البحر الأحمر، وعاصمتها أسمرة مسجّلة في التراث العالمي لجمال مبانيها.',
    lat: 16.1, lon: 37.9,
  },
  '728': {
    ar: 'جنوب السودان', official: 'جمهورية جنوب السودان', capital: 'جوبا', continent: 'africa',
    currency: { ar: 'الجنيه الجنوب سوداني', code: 'SSP' },
    language: 'الإنجليزية ولغات محلية',
    nameMeaning: 'سُمّيت كذلك لأنها كانت الجزء الجنوبي من السودان، ثم صارت دولة مستقلة عام 2011.',
    flag: flag(['#000000', '#da121a', '#078930', '#ffffff', '#0f47af', '#fcdd09'], hbars(['#000', '#fff', '#da121a', '#fff', '#078930'], [6, 1, 6, 1, 6]) + poly('0,0 130,100 0,200', '#0f47af') + star(42, 100, 22, '#fcdd09')),
    flagMeaning: 'الأسود لأهل البلاد، والأحمر للتضحية، والأخضر للأرض، والأبيض للسلام، والمثلث الأزرق لمياه النيل، والنجمة الذهبية للوحدة.',
    resources: ['النفط', 'الماشية', 'الأخشاب', 'السمك'],
    fact: 'في جنوب السودان مستنقعات واسعة تُسمّى «السُّدّ» يجري فيها النيل الأبيض، وهي من أكبر الأراضي الرطبة في العالم.',
    lat: 7.1, lon: 30.4,
  },
  '404': {
    ar: 'كينيا', official: 'جمهورية كينيا', capital: 'نيروبي', continent: 'africa',
    currency: { ar: 'الشلن الكيني', code: 'KES' },
    language: 'السواحيلية والإنجليزية',
    nameMeaning: 'سُمّيت باسم جبل كينيا، أعلى جبالها، ويُرجَّح أنّ اسم الجبل في لغات أهل المنطقة معناه «الجبل المضيء» لأنّ الثلج يلمع على قمته.',
    flag: flag(['#000000', '#bb0000', '#006600', '#ffffff'], hbars(['#000', '#fff', '#bb0000', '#fff', '#006600'], [6, 1, 6, 1, 6]) + line('M112,42L188,158M188,42L112,158', '#fff', 4) + path('M150,48a25,52 0 0,1 0,104a25,52 0 0,1 0,-104z', '#000') + path('M150,48a15,52 0 0,1 0,104a15,52 0 0,1 0,-104z', '#bb0000') + path('M150,78a5,22 0 0,1 0,44a5,22 0 0,1 0,-44z', '#fff')),
    flagMeaning: 'الأسود لشعب كينيا، والأحمر للتضحية في سبيل الاستقلال، والأخضر للأرض والزراعة، والأبيض للسلام، والدرع والرمحان للدفاع عن الحرية.',
    resources: ['الشاي', 'البن', 'الزهور', 'السياحة'],
    fact: 'يمرّ خط الاستواء في وسط كينيا، وفي محمياتها تعيش الأسود والفيلة والزرافات.',
    lat: 0.4, lon: 37.8,
  },
  '800': {
    ar: 'أوغندا', official: 'جمهورية أوغندا', capital: 'كمبالا', continent: 'africa',
    currency: { ar: 'الشلن الأوغندي', code: 'UGX' },
    language: 'الإنجليزية والسواحيلية',
    nameMeaning: 'الاسم مأخوذ من «بوغندا»، وهي مملكة قديمة في وسط البلاد.',
    flag: flag(['#000000', '#fcdc04', '#d90000', '#ffffff'], hbars(['#000', '#fcdc04', '#d90000', '#000', '#fcdc04', '#d90000']) + circle(150, 100, 32, '#fff') + path('M140,126l6,-30q2,-12 12,-14l8,4l-8,3q-4,2 -4,10l2,27z', '#9ca69c') + circle(156, 80, 3, '#d90000')),
    flagMeaning: 'الأسود لشعوب أفريقيا، والأصفر لشمسها، والأحمر للأخوّة، وفي الوسط طائر الكركي المتوّج رمز أوغندا.',
    resources: ['البن', 'الشاي', 'السمك', 'الموز'],
    fact: 'تطلّ أوغندا على بحيرة فكتوريا، أكبر بحيرات أفريقيا، ومنها يخرج النيل الأبيض.',
    lat: 2, lon: 33,
  },
  '148': {
    ar: 'تشاد', official: 'جمهورية تشاد', capital: 'نجامينا', continent: 'africa',
    currency: { ar: 'فرنك وسط أفريقيا', code: 'XAF' },
    language: 'العربية والفرنسية',
    nameMeaning: 'سُمّيت باسم بحيرة تشاد، وكلمة «تشاد» في إحدى لغات المنطقة معناها «البحيرة» أو «الماء الواسع».',
    flag: flag(['#002664', '#fecb00', '#c60c30'], vbars(['#002664', '#fecb00', '#c60c30'])),
    flagMeaning: 'الأزرق للسماء والماء والأمل، والأصفر للشمس والصحراء، والأحمر للتضحية والوحدة.',
    resources: ['النفط', 'القطن', 'الماشية', 'الصمغ العربي'],
    fact: 'في شمال تشاد جبال تيبستي، وفيها أعلى قمة في الصحراء الكبرى.',
    lat: 17.4, lon: 19.3,
  },
  '562': {
    ar: 'النيجر', official: 'جمهورية النيجر', capital: 'نيامي', continent: 'africa',
    currency: { ar: 'فرنك غرب أفريقيا', code: 'XOF' },
    language: 'الهوسا والفرنسية',
    nameMeaning: 'سُمّيت باسم نهر النيجر، ويُرجَّح أنّ اسم النهر من عبارة بلغة الطوارق معناها «نهر الأنهار».',
    flag: flag(['#e05206', '#ffffff', '#0db02b'], hbars(['#e05206', '#fff', '#0db02b']) + circle(150, 100, 18, '#e05206')),
    flagMeaning: 'البرتقالي للصحراء في الشمال، والأبيض للنقاء والأمل، والأخضر للأرض الخصبة في الجنوب، والدائرة البرتقالية في الوسط رمز الشمس.',
    resources: ['اليورانيوم', 'النفط', 'الماشية', 'البصل'],
    fact: 'معظم أرض النيجر جزء من الصحراء الكبرى، ويجري نهر النيجر في جنوبها الغربي.',
    lat: 17.4, lon: 10,
  },
  '466': {
    ar: 'مالي', official: 'جمهورية مالي', capital: 'باماكو', continent: 'africa',
    currency: { ar: 'فرنك غرب أفريقيا', code: 'XOF' },
    language: 'البمبارا ولغات وطنية أخرى',
    nameMeaning: 'سُمّيت باسم «إمبراطورية مالي» القديمة، ويُرجَّح أنّ كلمة «مالي» تعني «فرس النهر» في لغة البمبارا.',
    flag: flag(['#14b53a', '#fcd116', '#ce1126'], vbars(['#14b53a', '#fcd116', '#ce1126'])),
    flagMeaning: 'الأخضر للأرض الخصبة، والأصفر للثروات والذهب، والأحمر للتضحية.',
    resources: ['الذهب', 'القطن', 'الماشية', 'الأرز'],
    fact: 'في مدينة تمبكتو مكتبات قديمة تحفظ آلاف المخطوطات العربية النادرة.',
    lat: 18.6, lon: -1.9,
  },
  '686': {
    ar: 'السنغال', official: 'جمهورية السنغال', capital: 'داكار', continent: 'africa',
    currency: { ar: 'فرنك غرب أفريقيا', code: 'XOF' },
    language: 'الفرنسية والولوفية',
    nameMeaning: 'سُمّيت باسم نهر السنغال، ويُرجَّح أنّ اسم النهر يعود إلى قبيلة «صنهاجة» الأمازيغية.',
    flag: flag(['#00853f', '#fdef42', '#e31b23'], vbars(['#00853f', '#fdef42', '#e31b23']) + star(150, 104, 26, '#00853f')),
    flagMeaning: 'الأخضر للأمل، والأصفر للثروة، والأحمر للتضحية، والنجمة الخضراء في الوسط للوحدة.',
    resources: ['السمك', 'الفول السوداني', 'الفوسفات', 'النفط والغاز'],
    fact: 'تقع داكار، عاصمة السنغال، عند أبعد نقطة نحو الغرب في البر الأفريقي.',
    lat: 15.2, lon: -14.9,
  },
  '566': {
    ar: 'نيجيريا', official: 'جمهورية نيجيريا الاتحادية', capital: 'أبوجا', continent: 'africa',
    currency: { ar: 'النايرا النيجيرية', code: 'NGN' },
    language: 'الإنجليزية',
    nameMeaning: 'سُمّيت باسم نهر النيجر الذي يجري في أرضها.',
    flag: flag(['#008751', '#ffffff'], vbars(['#008751', '#fff', '#008751'])),
    flagMeaning: 'الأخضر للغابات والزراعة، والأبيض للسلام والوحدة.',
    resources: ['النفط', 'الغاز الطبيعي', 'الكاكاو', 'الفول السوداني'],
    fact: 'نيجيريا أكبر دول أفريقيا من حيث عدد السكان.',
    lat: 9.5, lon: 7.3,
  },
  '140': {
    ar: 'أفريقيا الوسطى', official: 'جمهورية أفريقيا الوسطى', capital: 'بانغي', continent: 'africa',
    currency: { ar: 'فرنك وسط أفريقيا', code: 'XAF' },
    language: 'السانغو والفرنسية',
    nameMeaning: 'سُمّيت كذلك لأنها تقع في وسط قارة أفريقيا.',
    flag: flag(['#003082', '#ffffff', '#289728', '#ffce00', '#d21034'], hbars(['#003082', '#fff', '#289728', '#ffce00']) + rect(125, 0, 50, 200, '#d21034') + star(40, 25, 18, '#ffce00')),
    flagMeaning: 'يجمع ألوان أفريقيا مع الأزرق والأبيض، ويربط بينها شريط أحمر رمزاً للوحدة، والنجمة الصفراء رمز الاستقلال والأمل.',
    resources: ['الماس', 'الذهب', 'الأخشاب', 'القطن', 'البن'],
    fact: 'تغطي الغابات الاستوائية جنوب البلاد، وتعيش فيها الغوريلا والفيلة.',
    lat: 6.9, lon: 21.6,
  },
  '834': {
    ar: 'تنزانيا', official: 'جمهورية تنزانيا المتحدة', capital: 'دودوما', continent: 'africa',
    currency: { ar: 'الشلن التنزاني', code: 'TZS' },
    language: 'السواحيلية والإنجليزية',
    nameMeaning: 'اسم مركّب من «تنجانيقا» و«زنجبار»، وهما البلدان اللذان اتحدا عام 1964.',
    flag: flag(['#1eb53a', '#00a3dd', '#fcd116', '#000000'], field('#1eb53a') + poly('300,0 300,200 0,200', '#00a3dd') + line('M0,200L300,0', '#fcd116', 64) + line('M0,200L300,0', '#000', 44)),
    flagMeaning: 'الأخضر للأرض، والأزرق للبحيرات والمحيط، والأسود للشعب، والأصفر لثروات الأرض.',
    resources: ['الذهب', 'البن', 'القرنفل', 'الشاي', 'السياحة'],
    fact: 'في تنزانيا جبل كليمنجارو، أعلى جبل في أفريقيا، وعلى قمته ثلج رغم قربه من خط الاستواء.',
    lat: -5.5, lon: 34,
  },
  '180': {
    ar: 'الكونغو الديمقراطية', official: 'جمهورية الكونغو الديمقراطية', capital: 'كينشاسا', continent: 'africa',
    currency: { ar: 'الفرنك الكونغولي', code: 'CDF' },
    language: 'الفرنسية',
    nameMeaning: 'سُمّيت باسم نهر الكونغو، والاسم يعود إلى مملكة «كونغو» القديمة التي قامت عند مصبّ النهر.',
    flag: flag(['#007fff', '#ce1021', '#f7d618'], field('#007fff') + line('M0,200L300,0', '#f7d618', 56) + line('M0,200L300,0', '#ce1021', 40) + star(55, 45, 30, '#f7d618')),
    flagMeaning: 'الأزرق للسلام، والأحمر للتضحية، والأصفر للثروة، والنجمة الصفراء لمستقبل مشرق.',
    resources: ['النحاس', 'الكوبالت', 'الماس', 'الذهب', 'الأخشاب'],
    fact: 'نهر الكونغو من أعمق أنهار العالم، ويجري وسط غابات استوائية كثيفة.',
    lat: -1.7, lon: 23.3,
  },
  '710': {
    ar: 'جنوب أفريقيا', official: 'جمهورية جنوب أفريقيا', capital: 'بريتوريا', continent: 'africa',
    currency: { ar: 'الراند', code: 'ZAR' },
    language: 'لغات رسمية كثيرة، منها الزولو والإنجليزية',
    nameMeaning: 'سُمّيت كذلك لأنها تقع في أقصى جنوب قارة أفريقيا.',
    flag: flag(['#de3831', '#002395', '#007a4d', '#ffffff', '#ffb612', '#000000'], rect(0, 0, 300, 100, '#de3831') + rect(0, 100, 300, 100, '#002395') + line('M0,0L130,100H300M0,200L130,100', '#fff', 66) + line('M0,0L130,100H300M0,200L130,100', '#007a4d', 40) + poly('0,25 97,100 0,175', '#ffb612') + poly('0,42 75,100 0,158', '#000')),
    flagMeaning: 'ألوانه الستة تجمع شعوب البلاد، وشكل الحرف Y الأخضر يرمز إلى طرق مختلفة تلتقي لتسير معاً في طريق واحد.',
    resources: ['الذهب', 'الماس', 'البلاتين', 'الفحم', 'الفواكه'],
    fact: 'لجنوب أفريقيا ثلاث عواصم: بريتوريا وكيب تاون وبلومفونتين.',
    lat: -30.4, lon: 23.1,
  },

  // ===== Tier A: major world countries =====
  '792': {
    ar: 'تركيا', official: 'جمهورية تركيا', capital: 'أنقرة', continent: 'asia',
    currency: { ar: 'الليرة التركية', code: 'TRY' },
    language: 'التركية',
    nameMeaning: 'معناه «أرض الأتراك».',
    flag: flag(['#e30a17', '#ffffff'], field('#e30a17') + crescent(110, 100, 50, 12.5, 0, 40, '#fff') + star(163, 100, 20, '#fff', 5, 0.382, 180)),
    flagMeaning: 'علم أحمر عليه هلال ونجمة بيضاوان، وهما رمزان قديمان ظهرا أيضاً في أعلام الدولة العثمانية.',
    resources: ['البندق', 'القمح', 'القطن', 'المنسوجات', 'السياحة'],
    fact: 'مدينة إسطنبول مبنية على قارّتين، آسيا وأوروبا، ويفصل بينهما مضيق البوسفور.',
    lat: 39.4, lon: 34.1,
  },
  '364': {
    ar: 'إيران', official: 'جمهورية إيران الإسلامية', capital: 'طهران', continent: 'asia',
    currency: { ar: 'الريال الإيراني', code: 'IRR' },
    language: 'الفارسية',
    nameMeaning: 'معناه «أرض الآريين»، وهو اسم قديم أطلقه أهلها على بلادهم.',
    flag: flag(['#239f40', '#ffffff', '#da0000'], hbars(['#239f40', '#fff', '#da0000']) + path('M150,78c-4,8-4,36 0,44c4-8,4-36 0-44zM138,82c-14,10-14,30 4,40c-10-12-10-28-4-40zM162,82c14,10 14,30-4,40c10-12 10-28 4-40z', '#da0000')),
    flagMeaning: 'الأخضر رمز النماء، والأبيض رمز السلام، والأحمر رمز الشجاعة، وفي الوسط شعار البلاد باللون الأحمر.',
    resources: ['النفط', 'الغاز الطبيعي', 'الفستق', 'الزعفران', 'السجاد'],
    fact: 'إيران أكبر منتج للزعفران في العالم، وتشتهر بسجّادها المصنوع باليد.',
    lat: 32.4, lon: 55,
  },
  '586': {
    ar: 'باكستان', official: 'جمهورية باكستان الإسلامية', capital: 'إسلام آباد', continent: 'asia',
    currency: { ar: 'الروبية الباكستانية', code: 'PKR' },
    language: 'الأردية والإنجليزية',
    nameMeaning: 'معناه بالأردية والفارسية «أرض الطاهرين».',
    flag: flag(['#01411c', '#ffffff'], field('#01411c') + rect(0, 0, 75, 200, '#fff') + crescent(187, 104, 52, 14, -10, 46, '#fff') + star(214, 80, 16, '#fff', 5, 0.382, -50)),
    flagMeaning: 'الأخضر رمز الأغلبية المسلمة، والشريط الأبيض رمز الأقليات، والهلال رمز التقدّم، والنجمة رمز النور والمعرفة.',
    resources: ['القطن', 'الأرز', 'القمح', 'المنسوجات'],
    fact: 'في شمال باكستان جبل «كي 2»، ثاني أعلى جبل في العالم.',
    lat: 27.7, lon: 67,
  },
  '356': {
    ar: 'الهند', official: 'جمهورية الهند', capital: 'نيودلهي', continent: 'asia',
    currency: { ar: 'الروبية الهندية', code: 'INR' },
    language: 'الهندية والإنجليزية ولغات كثيرة',
    nameMeaning: 'سُمّيت باسم نهر السند، فقد سمّى القدماء البلاد الواقعة وراء هذا النهر «الهند».',
    flag: flag(['#ff9933', '#ffffff', '#138808', '#000080'], indiaFlag()),
    flagMeaning: 'الزعفراني رمز الشجاعة، والأبيض رمز السلام والحقيقة، والأخضر رمز الخصب، والعجلة الزرقاء في الوسط رمز الحركة والتقدّم.',
    resources: ['الأرز', 'الشاي', 'القطن', 'التوابل', 'البرمجيات'],
    fact: 'في مدينة آغرا بالهند يقع تاج محل، وهو مبنى من الرخام الأبيض من عجائب الدنيا السبع الجديدة.',
    lat: 22.5, lon: 79.1,
  },
  '156': {
    ar: 'الصين', official: 'جمهورية الصين الشعبية', capital: 'بكين', continent: 'asia',
    currency: { ar: 'اليوان الصيني', code: 'CNY' },
    language: 'الصينية',
    nameMeaning: 'يُرجَّح أنّ الاسم جاء من أسرة «تشين» التي وحّدت البلاد قبل أكثر من ألفي عام.',
    flag: flag(['#ee1c25', '#ffde00'], chinaFlag()),
    flagMeaning: 'الأحمر لونه الأساسي، والنجمة الذهبية الكبيرة رمز القيادة، والنجوم الأربع الصغيرة حولها رمز وحدة الشعب.',
    resources: ['الأرز', 'الشاي', 'الفحم', 'الحرير', 'الأجهزة الإلكترونية'],
    fact: 'يمتد سور الصين العظيم آلاف الكيلومترات، وقد بُني على مدى قرون طويلة.',
    lat: 32.8, lon: 108,
  },
  '392': {
    ar: 'اليابان', official: 'اليابان', capital: 'طوكيو', continent: 'asia',
    currency: { ar: 'الين الياباني', code: 'JPY' },
    language: 'اليابانية',
    nameMeaning: 'اسمها باليابانية «نيهون» ومعناه «منبع الشمس»، ولذلك تُلقّب «بلاد الشمس المشرقة».',
    flag: flag(['#ffffff', '#bc002d'], field('#fff') + circle(150, 100, 60, '#bc002d')),
    flagMeaning: 'الدائرة الحمراء تمثّل الشمس، والأبيض رمز النقاء والصدق.',
    resources: ['السمك', 'الأرز', 'السيارات', 'الأجهزة الإلكترونية'],
    fact: 'تتكوّن اليابان من آلاف الجزر، وفيها جبل فوجي، وهو بركان شهير تكسو قمته الثلوج.',
    lat: 36.1, lon: 139,
  },
  '410': {
    ar: 'كوريا الجنوبية', official: 'جمهورية كوريا', capital: 'سيول', continent: 'asia',
    currency: { ar: 'الوون الكوري الجنوبي', code: 'KRW' },
    language: 'الكورية',
    nameMeaning: 'يعود اسم «كوريا» إلى مملكة «كوريو» القديمة، ويُرجَّح أنّ معناه «العالي الجميل».',
    flag: flag(['#ffffff', '#cd2e3a', '#0047a0', '#000000'], koreaFlag()),
    flagMeaning: 'الأبيض رمز السلام والنقاء، والدائرة الحمراء والزرقاء رمز التوازن في الطبيعة، والرموز السوداء الأربعة تمثّل السماء والأرض والماء والنار.',
    resources: ['الأجهزة الإلكترونية', 'السيارات', 'السفن', 'الأرز'],
    fact: 'للغة الكورية أبجدية خاصة اسمها «هانغول»، اختُرعت قبل أكثر من 500 عام لتسهيل القراءة على الناس.',
    lat: 36.1, lon: 128,
  },
  '360': {
    ar: 'إندونيسيا', official: 'جمهورية إندونيسيا', capital: 'جاكرتا', continent: 'asia',
    currency: { ar: 'الروبية الإندونيسية', code: 'IDR' },
    language: 'الإندونيسية',
    nameMeaning: 'اسم إغريقي الأصل معناه «جزر الهند».',
    flag: flag(['#ce1126', '#ffffff'], hbars(['#ce1126', '#fff'])),
    flagMeaning: 'الأحمر رمز الشجاعة، والأبيض رمز النقاء.',
    resources: ['زيت النخيل', 'المطاط', 'الفحم', 'الغاز الطبيعي', 'البن'],
    fact: 'إندونيسيا أكبر دولة أرخبيلية في العالم، وتتكوّن من آلاف الجزر.',
    lat: -1, lon: 114.3,
  },
  '458': {
    ar: 'ماليزيا', official: 'ماليزيا', capital: 'كوالالمبور', continent: 'asia',
    currency: { ar: 'الرينغيت الماليزي', code: 'MYR' },
    language: 'الملايوية',
    nameMeaning: 'معناه «أرض الملايو»، وهم أهل شبه جزيرة الملايو.',
    flag: flag(['#cc0001', '#ffffff', '#010066', '#ffcc00'], field('#cc0001') + altStripes(14, '#fff') + rect(0, 0, 150, 114.3, '#010066') + crescent(52, 57, 36, 10, 0, 30, '#ffcc00') + star(102, 57, 30, '#ffcc00', 14, 0.5)),
    flagMeaning: 'الخطوط الأربعة عشر والنجمة ذات الرؤوس الأربعة عشر ترمز إلى ولايات البلاد وحكومتها الاتحادية، والهلال رمز الإسلام.',
    resources: ['زيت النخيل', 'المطاط', 'النفط', 'القصدير', 'الأجهزة الإلكترونية'],
    fact: 'في كوالالمبور برجا بتروناس التوأمان، وهما من أشهر ناطحات السحاب في العالم.',
    lat: 3.8, lon: 102.2,
  },
  '643': {
    ar: 'روسيا', official: 'الاتحاد الروسي', capital: 'موسكو', continent: 'europe',
    currency: { ar: 'الروبل الروسي', code: 'RUB' },
    language: 'الروسية',
    nameMeaning: 'يعود الاسم إلى قوم قدماء يُسمَّون «الروس»، أسّسوا دولة في شرق أوروبا قبل أكثر من ألف عام.',
    flag: flag(['#ffffff', '#0039a6', '#d52b1e'], hbars(['#fff', '#0039a6', '#d52b1e'])),
    flagMeaning: 'ليس لألوانه معنى رسمي، ويُقال إنّ الأبيض للنقاء، والأزرق للإخلاص، والأحمر للشجاعة.',
    resources: ['النفط', 'الغاز الطبيعي', 'القمح', 'الأخشاب', 'الفحم'],
    fact: 'روسيا أكبر دولة في العالم مساحةً، وتمتد في قارتين: أوروبا وآسيا.',
    lat: 57.6, lon: 109.3,
  },
  '398': {
    ar: 'كازاخستان', official: 'جمهورية كازاخستان', capital: 'أستانا', continent: 'asia',
    currency: { ar: 'التينغي الكازاخستاني', code: 'KZT' },
    language: 'الكازاخية والروسية',
    nameMeaning: 'معناه «أرض الكازاخ»، ويُرجَّح أنّ كلمة «كازاخ» تعني «الحرّ المتنقّل».',
    flag: flag(['#00afca', '#fec50c'], kazakhFlag()),
    flagMeaning: 'الأزرق رمز السماء الصافية والسلام، والشمس الذهبية رمز الحياة، والنسر رمز الحرية، والزخرفة على الجانب من الفن الكازاخي التقليدي.',
    resources: ['النفط', 'الغاز الطبيعي', 'القمح', 'اليورانيوم', 'الفحم'],
    fact: 'كازاخستان أكبر دولة في العالم لا تطلّ على أي محيط.',
    lat: 48.4, lon: 69.8,
  },
  '826': {
    ar: 'المملكة المتحدة', official: 'المملكة المتحدة لبريطانيا العظمى وأيرلندا الشمالية', capital: 'لندن', continent: 'europe',
    currency: { ar: 'الجنيه الإسترليني', code: 'GBP' },
    language: 'الإنجليزية',
    nameMeaning: 'سُمّيت «المتحدة» لأنها تجمع أربعة بلدان: إنجلترا واسكتلندا وويلز وأيرلندا الشمالية، وتُسمّى أيضاً «بريطانيا».',
    flag: flag(['#012169', '#ffffff', '#c8102e'], unionJack()),
    flagMeaning: 'يُسمّى «علم الاتحاد»، وهو يجمع ثلاثة صلبان: الأحمر لإنجلترا، والأبيض المائل لاسكتلندا، والأحمر المائل لأيرلندا.',
    resources: ['النفط والغاز', 'الخدمات المصرفية', 'الأدوية', 'السياحة'],
    fact: 'في لندن ساعة «بيغ بن» الشهيرة، وفيها أقدم قطار أنفاق في العالم.',
    lat: 52.3, lon: -1.6,
  },
  '250': {
    ar: 'فرنسا', official: 'الجمهورية الفرنسية', capital: 'باريس', continent: 'europe',
    currency: { ar: 'اليورو', code: 'EUR' },
    language: 'الفرنسية',
    nameMeaning: 'معناه «أرض الفرنجة»، وهم قبائل جرمانية سكنت البلاد قديماً.',
    flag: flag(['#002395', '#ffffff', '#ed2939'], vbars(['#002395', '#fff', '#ed2939'])),
    flagMeaning: 'الأزرق والأحمر لونا مدينة باريس، والأبيض لون الملوك قديماً، ويُقال إنّ ألوانه ترمز إلى الحرية والمساواة والأخوّة.',
    resources: ['القمح', 'الطائرات', 'العطور', 'الأجبان', 'السياحة'],
    fact: 'فرنسا من أكثر بلاد العالم استقبالاً للسيّاح، وفي باريس برج إيفل المصنوع من الحديد.',
    lat: 47.4, lon: 2.2,
  },
  '276': {
    ar: 'ألمانيا', official: 'جمهورية ألمانيا الاتحادية', capital: 'برلين', continent: 'europe',
    currency: { ar: 'اليورو', code: 'EUR' },
    language: 'الألمانية',
    nameMeaning: 'اسم «ألمانيا» مأخوذ من قبائل «الألمان» القديمة، أما أهلها فيسمّونها «دويتشلاند» أي «أرض الشعب».',
    flag: flag(['#000000', '#dd0000', '#ffce00'], hbars(['#000', '#dd0000', '#ffce00'])),
    flagMeaning: 'ألوانه الأسود والأحمر والذهبي تعود إلى القرن التاسع عشر، وترمز إلى الوحدة والحرية.',
    resources: ['السيارات', 'الآلات', 'المواد الكيميائية', 'الفحم'],
    fact: 'في ألمانيا صُنعت أول سيارة حديثة تعمل بمحرّك بنزين.',
    lat: 52, lon: 10.3,
  },
  '380': {
    ar: 'إيطاليا', official: 'الجمهورية الإيطالية', capital: 'روما', continent: 'europe',
    currency: { ar: 'اليورو', code: 'EUR' },
    language: 'الإيطالية',
    nameMeaning: 'يُرجَّح أنّ الاسم معناه «أرض العجول»، وكان يُطلق قديماً على جنوب البلاد ثم صار اسماً لها كلها.',
    flag: flag(['#009246', '#ffffff', '#ce2b37'], vbars(['#009246', '#fff', '#ce2b37'])),
    flagMeaning: 'يُقال إنّ الأخضر رمز السهول والأمل، والأبيض رمز ثلوج جبال الألب، والأحمر رمز التضحية.',
    resources: ['الزيتون وزيته', 'القمح والمعكرونة', 'الأزياء', 'السيارات', 'السياحة'],
    fact: 'تشبه إيطاليا على الخريطة جزمة طويلة، وفيها برج بيزا المائل.',
    lat: 42.8, lon: 12.6,
  },
  '724': {
    ar: 'إسبانيا', official: 'مملكة إسبانيا', capital: 'مدريد', continent: 'europe',
    currency: { ar: 'اليورو', code: 'EUR' },
    language: 'الإسبانية',
    nameMeaning: 'يعود الاسم إلى «هسبانيا»، وهو الاسم الروماني لشبه الجزيرة، وكان العرب يسمّون جزءاً كبيراً منها «الأندلس».',
    flag: flag(['#aa151b', '#f1bf00'], hbars(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]) + rect(68, 76, 30, 42, '#aa151b') + rect(74, 82, 18, 30, '#f1bf00') + rect(80, 88, 6, 18, '#aa151b')),
    flagMeaning: 'الأحمر والأصفر من ألوان ممالك إسبانية قديمة، وعلى الشريط الأصفر شعار المملكة.',
    resources: ['زيت الزيتون', 'البرتقال', 'السيارات', 'السياحة'],
    fact: 'إسبانيا أكبر منتج لزيت الزيتون في العالم، وفي غرناطة قصر الحمراء من آثار الأندلس.',
    lat: 39.4, lon: -3.7,
  },
  '620': {
    ar: 'البرتغال', official: 'الجمهورية البرتغالية', capital: 'لشبونة', continent: 'europe',
    currency: { ar: 'اليورو', code: 'EUR' },
    language: 'البرتغالية',
    nameMeaning: 'سُمّيت باسم مدينة قديمة اسمها «بورتوس كالي»، أي «ميناء كالي».',
    flag: flag(['#006600', '#ff0000', '#ffcc00'], vbars(['#006600', '#ff0000'], [2, 3]) + ring(120, 100, 36, '#ffcc00', 7) + rect(104, 80, 32, 40, '#ff0000') + rect(110, 86, 20, 28, '#fff') + rect(116, 93, 8, 14, '#003399')),
    flagMeaning: 'الأخضر رمز الأمل، والأحمر رمز الشجاعة، والكرة الذهبية تذكّر برحلات البحّارة البرتغاليين حول العالم.',
    resources: ['الفلين', 'السمك', 'الزيتون', 'السياحة'],
    fact: 'البرتغال أكبر منتج للفلين في العالم، والفلين لحاء شجرة بلوط يُقشَر دون قطعها.',
    lat: 39, lon: -8.4,
  },
  '300': {
    ar: 'اليونان', official: 'الجمهورية الهيلينية', capital: 'أثينا', continent: 'europe',
    currency: { ar: 'اليورو', code: 'EUR' },
    language: 'اليونانية',
    nameMeaning: 'اسم «اليونان» في العربية مأخوذ من «أيونيا»، وهي منطقة يونانية قديمة، أما أهلها فيسمّونها «هيلاس».',
    flag: flag(['#0d5eaf', '#ffffff'], field('#0d5eaf') + altStripes(9, '#fff') + rect(0, 0, 111.1, 111.1, '#0d5eaf') + rect(44.4, 0, 22.2, 111.1, '#fff') + rect(0, 44.4, 111.1, 22.2, '#fff')),
    flagMeaning: 'الأزرق والأبيض لونا البحر والسماء والأمواج، وفي الزاوية صليب أبيض.',
    resources: ['الزيتون', 'السياحة', 'السفن والنقل البحري', 'السمك'],
    fact: 'في اليونان آلاف الجزر، وفيها بدأت الألعاب الأولمبية في العصور القديمة.',
    lat: 39.5, lon: 21.6,
  },
  '196': {
    ar: 'قبرص', official: 'جمهورية قبرص', capital: 'نيقوسيا', continent: 'asia',
    currency: { ar: 'اليورو', code: 'EUR' },
    language: 'اليونانية والتركية',
    nameMeaning: 'أصل الاسم قديم وغير مؤكد، وقد اشتهرت الجزيرة قديماً بالنحاس حتى صار اسم النحاس في اللاتينية مأخوذاً من اسمها.',
    flag: flag(['#ffffff', '#d57800', '#4e5b31'], field('#fff') + poly('92,108 110,92 140,88 165,82 200,70 228,54 212,76 192,90 196,106 175,113 150,118 120,122 100,118', '#d57800') + line('M104,136Q128,156 150,150M196,136Q172,156 150,150', '#4e5b31', 6)),
    flagMeaning: 'الأبيض رمز السلام، وعليه خريطة الجزيرة بلون النحاس، وتحتها غصنا زيتون رمز السلام بين سكانها.',
    resources: ['السياحة', 'الحمضيات', 'البطاطا', 'جبنة الحلّوم'],
    fact: 'قبرص ثالث أكبر جزيرة في البحر المتوسط، وهي قريبة جداً من الساحل السوري.',
    lat: 34.8, lon: 33,
  },
  '528': {
    ar: 'هولندا', official: 'مملكة هولندا', capital: 'أمستردام', continent: 'europe',
    currency: { ar: 'اليورو', code: 'EUR' },
    language: 'الهولندية',
    nameMeaning: 'اسمها الرسمي «نيذرلاند» ومعناه «الأراضي المنخفضة»، لأنّ جزءاً كبيراً منها أخفض من سطح البحر.',
    flag: flag(['#ae1c28', '#ffffff', '#21468b'], hbars(['#ae1c28', '#fff', '#21468b'])),
    flagMeaning: 'يعود إلى علم أمير قديم كان برتقالياً وأبيض وأزرق، ثم صار البرتقالي أحمر، وما زال البرتقالي لوناً محبوباً عند الهولنديين.',
    resources: ['الزهور', 'الأجبان', 'الخضار', 'الغاز الطبيعي'],
    fact: 'يبني الهولنديون السدود وطواحين الهواء منذ قرون ليحموا أرضهم من مياه البحر.',
    lat: 52.6, lon: 5.7,
  },
  '752': {
    ar: 'السويد', official: 'مملكة السويد', capital: 'ستوكهولم', continent: 'europe',
    currency: { ar: 'الكرونة السويدية', code: 'SEK' },
    language: 'السويدية',
    nameMeaning: 'معناه «أرض السويديين»، وهم قوم قدماء سكنوا البلاد.',
    flag: flag(['#006aa7', '#fecc00'], field('#006aa7') + rect(93.8, 0, 37.5, 200, '#fecc00') + rect(0, 80, 300, 40, '#fecc00')),
    flagMeaning: 'الأزرق والأصفر من شعار السويد القديم، والصليب على شكل «الصليب الشمالي» الذي تشترك فيه بلاد الشمال.',
    resources: ['الحديد', 'الأخشاب', 'الورق', 'السيارات'],
    fact: 'في شمال السويد لا تغيب الشمس تقريباً في بعض أيام الصيف.',
    lat: 65, lon: 17.7,
  },
  '578': {
    ar: 'النرويج', official: 'مملكة النرويج', capital: 'أوسلو', continent: 'europe',
    currency: { ar: 'الكرونة النرويجية', code: 'NOK' },
    language: 'النرويجية',
    nameMeaning: 'معناه «الطريق نحو الشمال»، أي الطريق البحري على طول ساحلها.',
    flag: flag(['#ba0c2f', '#ffffff', '#00205b'], field('#ba0c2f') + rect(81.8, 0, 54.6, 200, '#fff') + rect(0, 75, 300, 50, '#fff') + rect(95.5, 0, 27.3, 200, '#00205b') + rect(0, 87.5, 300, 25, '#00205b')),
    flagMeaning: 'ألوانه الأحمر والأبيض والأزرق رمز للحرية، والصليب الشمالي يربطه بجيرانه في الشمال.',
    resources: ['النفط', 'الغاز الطبيعي', 'السمك', 'الطاقة الكهرمائية'],
    fact: 'على ساحل النرويج خلجان طويلة ضيقة بين الجبال تُسمّى «الفيوردات».',
    lat: 61, lon: 8.8,
  },
  '804': {
    ar: 'أوكرانيا', official: 'أوكرانيا', capital: 'كييف', continent: 'europe',
    currency: { ar: 'الهريفنيا الأوكرانية', code: 'UAH' },
    language: 'الأوكرانية',
    nameMeaning: 'يُرجَّح أنّ الاسم معناه «الأرض الحدودية» أو «البلاد» في اللغات السلافية القديمة.',
    flag: flag(['#0057b7', '#ffd700'], hbars(['#0057b7', '#ffd700'])),
    flagMeaning: 'الأزرق لون السماء الصافية، والأصفر لون حقول القمح الذهبية.',
    resources: ['القمح', 'الذرة', 'زيت دوّار الشمس', 'الحديد'],
    fact: 'أوكرانيا من أكبر منتجي زيت دوّار الشمس في العالم، وتربتها السوداء خصبة جداً.',
    lat: 49.1, lon: 32.3,
  },
  '840': {
    ar: 'الولايات المتحدة', official: 'الولايات المتحدة الأمريكية', capital: 'واشنطن', continent: 'namerica',
    currency: { ar: 'الدولار الأمريكي', code: 'USD' },
    language: 'الإنجليزية',
    nameMeaning: 'سُمّيت كذلك لأنها اتحاد من خمسين ولاية، واسم «أمريكا» مأخوذ من اسم البحّار الإيطالي أمريكو فسبوتشي.',
    flag: flag(['#b22234', '#ffffff', '#3c3b6e'], usaFlag()),
    flagMeaning: 'الخطوط الثلاثة عشر ترمز إلى الولايات الأولى، والنجوم الخمسون في الزاوية الزرقاء ترمز إلى ولاياتها اليوم.',
    resources: ['النفط', 'الغاز الطبيعي', 'القمح', 'الذرة', 'التكنولوجيا'],
    fact: 'في الولايات المتحدة «الأخدود العظيم» (غراند كانيون)، وقد حفره نهر كولورادو على مدى ملايين السنين.',
    lat: 39.1, lon: -97.6,
  },
  '124': {
    ar: 'كندا', official: 'كندا', capital: 'أوتاوا', continent: 'namerica',
    currency: { ar: 'الدولار الكندي', code: 'CAD' },
    language: 'الإنجليزية والفرنسية',
    nameMeaning: 'يُرجَّح أنّ الاسم من كلمة «كاناتا» في لغة بعض السكان الأصليين، ومعناها «القرية».',
    flag: flag(['#d52b1e', '#ffffff'], vbars(['#d52b1e', '#fff', '#d52b1e'], [1, 2, 1]) + poly(MAPLE, '#d52b1e')),
    flagMeaning: 'ورقة القيقب الحمراء رمز كندا وغاباتها، والأحمر والأبيض لوناها الوطنيان.',
    resources: ['النفط', 'الأخشاب', 'القمح', 'السمك', 'شراب القيقب'],
    fact: 'كندا ثاني أكبر دولة في العالم مساحةً، ولها أطول ساحل في العالم.',
    lat: 58.3, lon: -113.2,
  },
  '484': {
    ar: 'المكسيك', official: 'الولايات المتحدة المكسيكية', capital: 'مدينة مكسيكو', continent: 'namerica',
    currency: { ar: 'البيزو المكسيكي', code: 'MXN' },
    language: 'الإسبانية',
    nameMeaning: 'سُمّيت باسم عاصمتها، والاسم يعود إلى «المكسيكا»، وهم شعب الأزتيك الذين أسّسوا المدينة قديماً.',
    flag: flag(['#006847', '#ffffff', '#ce1126', '#8b5a2b'], vbars(['#006847', '#fff', '#ce1126']) + line('M126,104a24,24 0 0,0 48,0', '#3a7d44', 5) + rect(147, 106, 6, 16, '#3a7d44') + circle(150, 96, 14, '#8b5a2b') + circle(158, 80, 6, '#8b5a2b')),
    flagMeaning: 'الأخضر رمز الأمل، والأبيض رمز الوحدة، والأحمر رمز التضحية، وفي الوسط نسر يقف على صبّار، من حكاية قديمة عن تأسيس العاصمة.',
    resources: ['النفط', 'الفضة', 'الذرة', 'الأفوكادو', 'السيارات'],
    fact: 'من المكسيك انتشرت زراعة الذرة إلى العالم، وفيها أهرامات قديمة بناها شعوبها الأوائل.',
    lat: 23.6, lon: -101.9,
  },
  '076': {
    ar: 'البرازيل', official: 'جمهورية البرازيل الاتحادية', capital: 'برازيليا', continent: 'samerica',
    currency: { ar: 'الريال البرازيلي', code: 'BRL' },
    language: 'البرتغالية',
    nameMeaning: 'سُمّيت باسم شجرة «خشب البرازيل» ذات الخشب الأحمر كالجمر، وكان يُصنع منه صباغ أحمر.',
    flag: flag(['#009c3b', '#ffdf00', '#002776', '#ffffff'], field('#009c3b') + poly('25,100 150,17 275,100 150,183', '#ffdf00') + circle(150, 100, 52, '#002776') + line('M102,93q52,-17 96,13', '#fff', 7) + dots([[130, 120], [150, 128], [166, 116], [140, 140], [176, 132], [120, 108], [186, 114]], '#fff', 4)),
    flagMeaning: 'الأخضر رمز الغابات، والأصفر رمز الذهب والثروة، والدائرة الزرقاء سماء ليلية مرصّعة بالنجوم.',
    resources: ['البن', 'قصب السكر', 'فول الصويا', 'الحديد', 'اللحوم'],
    fact: 'في البرازيل معظم غابات الأمازون، أكبر غابة مطيرة في العالم.',
    lat: -11.7, lon: -49.1,
  },
  '032': {
    ar: 'الأرجنتين', official: 'جمهورية الأرجنتين', capital: 'بوينس آيرس', continent: 'samerica',
    currency: { ar: 'البيزو الأرجنتيني', code: 'ARS' },
    language: 'الإسبانية',
    nameMeaning: 'من كلمة لاتينية معناها «الفضة»، لأنّ المستكشفين الأوائل ظنّوا أنّ في أرضها جبالاً من الفضة.',
    flag: flag(['#74acdf', '#ffffff', '#f6b40e'], hbars(['#74acdf', '#fff', '#74acdf']) + star(150, 100, 26, '#f6b40e', 16, 0.6) + circle(150, 100, 13, '#f6b40e')),
    flagMeaning: 'الأزرق الفاتح والأبيض لونا السماء والغيوم، والشمس الذهبية في الوسط تُسمّى «شمس مايو» رمز الحرية.',
    resources: ['القمح', 'اللحوم', 'فول الصويا', 'الذرة', 'الليثيوم'],
    fact: 'في الأرجنتين جبل أكونكاغوا، أعلى جبل في الأمريكيتين.',
    lat: -30.2, lon: -63.9,
  },
  '152': {
    ar: 'تشيلي', official: 'جمهورية تشيلي', capital: 'سانتياغو', continent: 'samerica',
    currency: { ar: 'البيزو التشيلي', code: 'CLP' },
    language: 'الإسبانية',
    nameMeaning: 'أصل الاسم غير مؤكد، ويُرجَّح أنه من كلمة بلغة السكان الأصليين معناها «حيث تنتهي الأرض».',
    flag: flag(['#ffffff', '#d52b1e', '#0039a6'], hbars(['#fff', '#d52b1e']) + rect(0, 0, 100, 100, '#0039a6') + star(50, 50, 25, '#fff')),
    flagMeaning: 'الأزرق للسماء، والأبيض لثلوج جبال الأنديز، والأحمر للتضحية، والنجمة البيضاء رمز الهداية.',
    resources: ['النحاس', 'الليثيوم', 'السمك', 'العنب والفواكه'],
    fact: 'تشيلي من أطول دول العالم وأضيقها، وفيها صحراء أتاكاما، وهي من أجفّ الأماكن على الأرض.',
    lat: -30.5, lon: -70.8,
  },
  '604': {
    ar: 'البيرو', official: 'جمهورية البيرو', capital: 'ليما', continent: 'samerica',
    currency: { ar: 'السول البيروفي', code: 'PEN' },
    language: 'الإسبانية والكيتشوا',
    nameMeaning: 'يُرجَّح أنّ الاسم من «بيرو»، وهو اسم زعيم محلي التقى به المستكشفون الإسبان في أول رحلاتهم نحو الجنوب.',
    flag: flag(['#d91023', '#ffffff'], vbars(['#d91023', '#fff', '#d91023'])),
    flagMeaning: 'الأحمر رمز التضحية، والأبيض رمز السلام.',
    resources: ['النحاس', 'الذهب', 'الفضة', 'السمك', 'البطاطا'],
    fact: 'في جبال البيرو مدينة ماتشو بيتشو الأثرية، ومن البيرو انتشرت زراعة البطاطا إلى العالم.',
    lat: -13.1, lon: -72.9,
  },
  '170': {
    ar: 'كولومبيا', official: 'جمهورية كولومبيا', capital: 'بوغوتا', continent: 'samerica',
    currency: { ar: 'البيزو الكولومبي', code: 'COP' },
    language: 'الإسبانية',
    nameMeaning: 'سُمّيت تكريماً للبحّار كريستوفر كولومبوس.',
    flag: flag(['#fcd116', '#003893', '#ce1126'], hbars(['#fcd116', '#003893', '#ce1126'], [2, 1, 1])),
    flagMeaning: 'الأصفر رمز ثروات الأرض والذهب، والأزرق رمز البحار، والأحمر رمز التضحية من أجل الاستقلال.',
    resources: ['البن', 'النفط', 'الفحم', 'الزمرّد', 'الزهور'],
    fact: 'كولومبيا الدولة الوحيدة في أمريكا الجنوبية التي تطلّ على المحيط الهادئ والبحر الكاريبي معاً.',
    lat: 3.4, lon: -73.3,
  },
  '862': {
    ar: 'فنزويلا', official: 'جمهورية فنزويلا البوليفارية', capital: 'كاراكاس', continent: 'samerica',
    currency: { ar: 'البوليفار الفنزويلي', code: 'VES' },
    language: 'الإسبانية',
    nameMeaning: 'معناه «فينيسيا الصغيرة»، لأنّ المستكشفين رأوا بيوتاً على أعمدة فوق الماء فذكّرتهم بمدينة البندقية (فينيسيا).',
    flag: flag(['#ffcc00', '#00247d', '#cf142b', '#ffffff'], venezuelaFlag()),
    flagMeaning: 'الأصفر رمز ثروات الأرض، والأزرق رمز البحر، والأحمر رمز التضحية، والنجوم الثماني رمز مقاطعات البلاد.',
    resources: ['النفط', 'الغاز الطبيعي', 'الحديد', 'الذهب', 'الكاكاو'],
    fact: 'في فنزويلا شلّال «أنجل»، أعلى شلّال في العالم.',
    lat: 7.1, lon: -64.2,
  },
  '192': {
    ar: 'كوبا', official: 'جمهورية كوبا', capital: 'هافانا', continent: 'namerica',
    currency: { ar: 'البيزو الكوبي', code: 'CUP' },
    language: 'الإسبانية',
    nameMeaning: 'يُرجَّح أنّ الاسم من لغة السكان الأصليين، ومعناه «الأرض الخصبة الواسعة».',
    flag: flag(['#002a8f', '#ffffff', '#cf142b'], hbars(['#002a8f', '#fff', '#002a8f', '#fff', '#002a8f']) + poly('0,0 173,100 0,200', '#cf142b') + star(58, 100, 26, '#fff')),
    flagMeaning: 'الخطوط الزرقاء الثلاثة ترمز إلى أقاليم البلاد قديماً، والأبيض رمز النقاء، والمثلث الأحمر رمز التضحية، والنجمة البيضاء رمز الحرية.',
    resources: ['قصب السكر', 'التبغ', 'النيكل', 'السياحة'],
    fact: 'كوبا أكبر جزيرة في البحر الكاريبي.',
    lat: 20.6, lon: -76.4,
  },
  '036': {
    ar: 'أستراليا', official: 'كومنولث أستراليا', capital: 'كانبيرا', continent: 'oceania',
    currency: { ar: 'الدولار الأسترالي', code: 'AUD' },
    language: 'الإنجليزية',
    nameMeaning: 'من كلمة لاتينية معناها «الأرض الجنوبية».',
    flag: flag(['#012169', '#ffffff', '#c8102e'], field('#012169') + jackCanton() + star(75, 150, 26, '#fff', 7, 0.45) + star(225, 168, 12, '#fff', 7, 0.45) + star(186, 95, 12, '#fff', 7, 0.45) + star(225, 36, 12, '#fff', 7, 0.45) + star(258, 82, 10, '#fff', 7, 0.45) + star(240, 118, 6, '#fff')),
    flagMeaning: 'في الزاوية علم المملكة المتحدة، وتحته نجمة كبيرة سباعية ترمز إلى ولايات الاتحاد، وعلى اليمين نجوم «الصليب الجنوبي» التي تُرى في سماء الجنوب.',
    resources: ['الحديد', 'الفحم', 'الذهب', 'الصوف', 'القمح'],
    fact: 'أستراليا جزيرة كبيرة جداً تُسمّى «القارة الجزيرة»، ويعيش فيها الكنغر والكوالا اللذان لا يعيشان طبيعياً في أي مكان آخر.',
    lat: -23.1, lon: 132.1,
  },
  '554': {
    ar: 'نيوزيلندا', official: 'نيوزيلندا', capital: 'ولنغتون', continent: 'oceania',
    currency: { ar: 'الدولار النيوزيلندي', code: 'NZD' },
    language: 'الإنجليزية والماورية',
    nameMeaning: 'سمّاها رسّامو خرائط هولنديون باسم إقليم «زيلاند» في هولندا ومعناه «أرض البحر»، ويسمّيها الماوريون «أوتياروا» أي «أرض السحابة البيضاء الطويلة».',
    flag: flag(['#012169', '#ffffff', '#c8102e'], field('#012169') + jackCanton() + [[225, 165, 13], [190, 95, 11], [225, 40, 11], [258, 82, 9]].map(([x, y, r]) => edgedStar(x, y, r, '#c8102e')).join('')),
    flagMeaning: 'في الزاوية علم المملكة المتحدة، والنجوم الحمراء الأربع هي مجموعة «الصليب الجنوبي» في سماء الجنوب.',
    resources: ['الصوف', 'الحليب ومشتقاته', 'اللحوم', 'الكيوي', 'السياحة'],
    fact: 'في نيوزيلندا طائر الكيوي الذي لا يطير، وقد صار رمزاً للبلاد.',
    lat: -43.5, lon: 171,
  },

  // ===== Tier B: every other polygon =====
  // Asia
  '004': { ar: 'أفغانستان', capital: 'كابل', continent: 'asia', lat: 34.1, lon: 66.6 },
  '031': { ar: 'أذربيجان', capital: 'باكو', continent: 'asia', lat: 40.3, lon: 47.2 },
  '050': { ar: 'بنغلاديش', capital: 'دكا', continent: 'asia', lat: 24, lon: 90 },
  '051': { ar: 'أرمينيا', capital: 'يريفان', continent: 'asia', lat: 40.6, lon: 44.6 },
  '064': { ar: 'بوتان', capital: 'تيمفو', continent: 'asia', lat: 27.5, lon: 90.1 },
  '096': { ar: 'بروناي', capital: 'بندر سري بكاوان', continent: 'asia', lat: 4.7, lon: 115 },
  '104': { ar: 'ميانمار', capital: 'نايبيداو', continent: 'asia', lat: 21.5, lon: 96 },
  '116': { ar: 'كمبوديا', capital: 'بنوم بنه', continent: 'asia', lat: 12.6, lon: 104.4 },
  '144': { ar: 'سريلانكا', capital: 'سري جاياواردنابورا كوتي', continent: 'asia', lat: 7.4, lon: 80.8 },
  '268': { ar: 'جورجيا', capital: 'تبليسي', continent: 'asia', lat: 42.3, lon: 42.6 },
  '408': { ar: 'كوريا الشمالية', capital: 'بيونغ يانغ', continent: 'asia', lat: 40.1, lon: 126.4 },
  '417': { ar: 'قيرغيزستان', capital: 'بيشكيك', continent: 'asia', lat: 41.7, lon: 74.9 },
  '418': { ar: 'لاوس', capital: 'فيينتيان', continent: 'asia', lat: 19.6, lon: 102.6 },
  '496': { ar: 'منغوليا', capital: 'أولان باتور', continent: 'asia', lat: 46.1, lon: 104.7 },
  '524': { ar: 'نيبال', capital: 'كاتماندو', continent: 'asia', lat: 29.2, lon: 81.8 },
  '608': { ar: 'الفلبين', capital: 'مانيلا', continent: 'asia', lat: 17, lon: 121.4 },
  '626': { ar: 'تيمور الشرقية', capital: 'ديلي', continent: 'asia', lat: -8.9, lon: 125.4 },
  '704': { ar: 'فيتنام', capital: 'هانوي', continent: 'asia', lat: 21.8, lon: 105.3 },
  '762': { ar: 'طاجيكستان', capital: 'دوشنبه', continent: 'asia', lat: 38.4, lon: 72.7 },
  '764': { ar: 'تايلاند', capital: 'بانكوك', continent: 'asia', lat: 15.5, lon: 101.3 },
  '795': { ar: 'تركمانستان', capital: 'عشق آباد', continent: 'asia', lat: 39.7, lon: 58.7 },
  '860': { ar: 'أوزبكستان', capital: 'طشقند', continent: 'asia', lat: 42, lon: 63.8 },
  // Africa
  '024': { ar: 'أنغولا', capital: 'لواندا', continent: 'africa', lat: -13.2, lon: 17.7 },
  '072': { ar: 'بوتسوانا', capital: 'غابورون', continent: 'africa', lat: -22, lon: 24.2 },
  '108': { ar: 'بوروندي', capital: 'غيتيغا', continent: 'africa', lat: -3.4, lon: 29.9 },
  '120': { ar: 'الكاميرون', capital: 'ياوندي', continent: 'africa', lat: 4.6, lon: 12.2 },
  '178': { ar: 'الكونغو', capital: 'برازافيل', continent: 'africa', lat: 0.1, lon: 15.8 },
  '204': { ar: 'بنين', capital: 'بورتو نوفو', continent: 'africa', lat: 10.5, lon: 2.4 },
  '226': { ar: 'غينيا الاستوائية', capital: 'مالابو', continent: 'africa', lat: 1.7, lon: 10.3 },
  '266': { ar: 'الغابون', capital: 'ليبرفيل', continent: 'africa', lat: -0.8, lon: 10.9 },
  '270': { ar: 'غامبيا', capital: 'بانجول', continent: 'africa', lat: 13.4, lon: -16 },
  '288': { ar: 'غانا', capital: 'أكرا', continent: 'africa', lat: 6.9, lon: -1.2 },
  '324': { ar: 'غينيا', capital: 'كوناكري', continent: 'africa', lat: 10.6, lon: -9.9 },
  '384': { ar: 'ساحل العاج', capital: 'ياموسوكرو', continent: 'africa', lat: 7.5, lon: -5.6 },
  '426': { ar: 'ليسوتو', capital: 'ماسيرو', continent: 'africa', lat: -29.5, lon: 28.3 },
  '430': { ar: 'ليبيريا', capital: 'مونروفيا', continent: 'africa', lat: 7, lon: -10.2 },
  '450': { ar: 'مدغشقر', capital: 'أنتاناناريفو', continent: 'africa', lat: -18.2, lon: 46.7 },
  '454': { ar: 'مالاوي', capital: 'ليلونغوي', continent: 'africa', lat: -13.3, lon: 33.7 },
  '508': { ar: 'موزمبيق', capital: 'مابوتو', continent: 'africa', lat: -13.9, lon: 38.1 },
  '516': { ar: 'ناميبيا', capital: 'ويندهوك', continent: 'africa', lat: -20.4, lon: 17 },
  '624': { ar: 'غينيا بيساو', capital: 'بيساو', continent: 'africa', lat: 12, lon: -15.2 },
  '646': { ar: 'رواندا', capital: 'كيغالي', continent: 'africa', lat: -1.8, lon: 30.2 },
  '694': { ar: 'سيراليون', capital: 'فريتاون', continent: 'africa', lat: 8.5, lon: -11.9 },
  '716': { ar: 'زيمبابوي', capital: 'هراري', continent: 'africa', lat: -18.8, lon: 29.9 },
  '748': { ar: 'إسواتيني', capital: 'مباباني', continent: 'africa', lat: -26.5, lon: 31.4 },
  '768': { ar: 'توغو', capital: 'لومي', continent: 'africa', lat: 8.9, lon: 1.1 },
  '854': { ar: 'بوركينا فاسو', capital: 'واغادوغو', continent: 'africa', lat: 12.8, lon: -1 },
  '894': { ar: 'زامبيا', capital: 'لوساكا', continent: 'africa', lat: -14.7, lon: 26.2 },
  // Europe
  '008': { ar: 'ألبانيا', capital: 'تيرانا', continent: 'europe', lat: 40.7, lon: 20.1 },
  '040': { ar: 'النمسا', capital: 'فيينا', continent: 'europe', lat: 47.6, lon: 14.5 },
  '056': { ar: 'بلجيكا', capital: 'بروكسل', continent: 'europe', lat: 50.7, lon: 4.7 },
  '070': { ar: 'البوسنة والهرسك', capital: 'سراييفو', continent: 'europe', lat: 44.2, lon: 17.9 },
  '100': { ar: 'بلغاريا', capital: 'صوفيا', continent: 'europe', lat: 42.6, lon: 25.1 },
  '112': { ar: 'بيلاروسيا', capital: 'مينسك', continent: 'europe', lat: 53.4, lon: 28.3 },
  '191': { ar: 'كرواتيا', capital: 'زغرب', continent: 'europe', lat: 45.8, lon: 16.5 },
  '203': { ar: 'التشيك', capital: 'براغ', continent: 'europe', lat: 50, lon: 14.6 },
  '208': { ar: 'الدنمارك', capital: 'كوبنهاغن', continent: 'europe', lat: 56.4, lon: 9.3 },
  '233': { ar: 'إستونيا', capital: 'تالين', continent: 'europe', lat: 58.8, lon: 25.8 },
  '246': { ar: 'فنلندا', capital: 'هلسنكي', continent: 'europe', lat: 62.6, lon: 26 },
  '348': { ar: 'المجر', capital: 'بودابست', continent: 'europe', lat: 47.2, lon: 20 },
  '352': { ar: 'آيسلندا', capital: 'ريكيافيك', continent: 'europe', lat: 64.8, lon: -18.7 },
  '372': { ar: 'أيرلندا', capital: 'دبلن', continent: 'europe', lat: 53.2, lon: -7.7 },
  '428': { ar: 'لاتفيا', capital: 'ريغا', continent: 'europe', lat: 56.7, lon: 26.4 },
  '440': { ar: 'ليتوانيا', capital: 'فيلنيوس', continent: 'europe', lat: 55.3, lon: 24.3 },
  '442': { ar: 'لوكسمبورغ', capital: 'لوكسمبورغ', continent: 'europe', lat: 49.6, lon: 5.9 },
  '498': { ar: 'مولدوفا', capital: 'كيشيناو', continent: 'europe', lat: 47.6, lon: 28.3 },
  '499': { ar: 'الجبل الأسود', capital: 'بودغوريتسا', continent: 'europe', lat: 42.9, lon: 19.2 },
  '616': { ar: 'بولندا', capital: 'وارسو', continent: 'europe', lat: 52.2, lon: 19.6 },
  '642': { ar: 'رومانيا', capital: 'بوخارست', continent: 'europe', lat: 45.8, lon: 25 },
  '688': { ar: 'صربيا', capital: 'بلغراد', continent: 'europe', lat: 44.1, lon: 20.8 },
  '703': { ar: 'سلوفاكيا', capital: 'براتيسلافا', continent: 'europe', lat: 48.8, lon: 19 },
  '705': { ar: 'سلوفينيا', capital: 'ليوبليانا', continent: 'europe', lat: 46, lon: 14.9 },
  '756': { ar: 'سويسرا', capital: 'برن', continent: 'europe', lat: 46.7, lon: 7.5 },
  '807': { ar: 'مقدونيا الشمالية', capital: 'سكوبيه', continent: 'europe', lat: 41.6, lon: 21.5 },
  // North America (with Central America and the Caribbean)
  '044': { ar: 'جزر البهاما', capital: 'ناساو', continent: 'namerica', lat: 24.7, lon: -78 },
  '084': { ar: 'بليز', capital: 'بلموبان', continent: 'namerica', lat: 17.4, lon: -88.7 },
  '188': { ar: 'كوستاريكا', capital: 'سان خوسيه', continent: 'namerica', lat: 10.1, lon: -84 },
  '214': { ar: 'الدومينيكان', capital: 'سانتو دومينغو', continent: 'namerica', lat: 19.1, lon: -70.9 },
  '222': { ar: 'السلفادور', capital: 'سان سلفادور', continent: 'namerica', lat: 13.9, lon: -89.2 },
  '304': { ar: 'غرينلاند', capital: 'نوك', continent: 'namerica', lat: 76.2, lon: -39.8, territory: true, note: 'جزيرة كبيرة تتبع الدنمارك' },
  '320': { ar: 'غواتيمالا', capital: 'مدينة غواتيمالا', continent: 'namerica', lat: 15, lon: -90.5 },
  '332': { ar: 'هايتي', capital: 'بورت أو برنس', continent: 'namerica', lat: 19.3, lon: -72.2 },
  '340': { ar: 'هندوراس', capital: 'تيغوسيغالبا', continent: 'namerica', lat: 14.7, lon: -87.2 },
  '388': { ar: 'جامايكا', capital: 'كينغستون', continent: 'namerica', lat: 18.1, lon: -77.3 },
  '558': { ar: 'نيكاراغوا', capital: 'ماناغوا', continent: 'namerica', lat: 12.6, lon: -85.1 },
  '591': { ar: 'بنما', capital: 'مدينة بنما', continent: 'namerica', lat: 8.3, lon: -81 },
  '630': { ar: 'بورتوريكو', capital: 'سان خوان', continent: 'namerica', lat: 18.2, lon: -66.9, territory: true, note: 'جزيرة تتبع الولايات المتحدة' },
  '780': { ar: 'ترينيداد وتوباغو', capital: 'بورت أوف سبين', continent: 'namerica', lat: 10.5, lon: -61.3 },
  // South America
  '068': { ar: 'بوليفيا', capital: 'سوكري', continent: 'samerica', lat: -16.7, lon: -64.7 },
  '218': { ar: 'الإكوادور', capital: 'كيتو', continent: 'samerica', lat: -1.2, lon: -78.4 },
  '238': { ar: 'جزر فوكلاند (مالفيناس)', capital: 'ستانلي', continent: 'samerica', lat: -51.6, lon: -58.5, territory: true, note: 'جزر في جنوب المحيط الأطلسي' },
  '328': { ar: 'غيانا', capital: 'جورج تاون', continent: 'samerica', lat: 5.6, lon: -58.9 },
  '600': { ar: 'الباراغواي', capital: 'أسونسيون', continent: 'samerica', lat: -21.6, lon: -60.2 },
  '740': { ar: 'سورينام', capital: 'باراماريبو', continent: 'samerica', lat: 4.2, lon: -56 },
  '858': { ar: 'الأوروغواي', capital: 'مونتيفيديو', continent: 'samerica', lat: -32.9, lon: -56 },
  // Oceania
  '090': { ar: 'جزر سليمان', capital: 'هونيارا', continent: 'oceania', lat: -8, lon: 159.2 },
  '242': { ar: 'فيجي', capital: 'سوفا', continent: 'oceania', lat: -16.4, lon: 178.2 },
  '540': { ar: 'كاليدونيا الجديدة', capital: 'نوميا', continent: 'oceania', lat: -21, lon: 165.2, territory: true, note: 'جزر تتبع فرنسا' },
  '548': { ar: 'فانواتو', capital: 'بورت فيلا', continent: 'oceania', lat: -15.3, lon: 166.9 },
  '598': { ar: 'بابوا غينيا الجديدة', capital: 'بورت مورسبي', continent: 'oceania', lat: -5.8, lon: 143.3 },
  // Antarctica and the far south (Kerguelen Islands, in the south of the Indian Ocean)
  '010': { ar: 'القارة القطبية الجنوبية', capital: null, continent: 'antarctica', lat: -75.8, lon: 110.7, territory: true, note: 'قارة متجمدة لا تتبع أي دولة، فيها محطات للعلماء' },
  '260': { ar: 'الأراضي الفرنسية الجنوبية', capital: null, continent: 'antarctica', lat: -49.3, lon: 69.4, territory: true, note: 'جزر نائية تتبع فرنسا' },
};

// Arab League members with no polygon on the 1:110m map: drawn as a dot.
export const SMALL = {
  '048': {
    ar: 'البحرين', official: 'مملكة البحرين', capital: 'المنامة', continent: 'asia', arab: true,
    currency: { ar: 'الدينار البحريني', code: 'BHD' },
    language: 'العربية',
    nameMeaning: '«البحرين» مثنّى «بحر»، ويُقال إنها سُمّيت كذلك لأنّ فيها ينابيع ماء عذب تخرج وسط ماء البحر المالح.',
    flag: flag(['#ffffff', '#ce1126'], field('#fff') + teeth(75, 35, 5, '#ce1126')),
    flagMeaning: 'الأبيض رمز السلام، والأحمر لون تقليدي في أعلام الخليج، والرؤوس البيضاء الخمسة ترمز إلى أركان الإسلام الخمسة.',
    resources: ['النفط', 'الغاز الطبيعي', 'الألمنيوم', 'اللؤلؤ'],
    fact: 'البحرين مجموعة من الجزر أكبرها جزيرة البحرين، ويربطها بالسعودية جسر طويل فوق البحر.',
    lat: 26.07, lon: 50.55,
  },
  '174': {
    ar: 'جزر القمر', official: 'اتحاد جزر القمر', capital: 'موروني', continent: 'africa', arab: true,
    currency: { ar: 'الفرنك القمري', code: 'KMF' },
    language: 'القمرية والعربية والفرنسية',
    nameMeaning: 'الاسم عربي، ويُرجَّح أنّ البحّارة العرب هم من سمّوها «جزر القمر».',
    flag: flag(['#ffd100', '#ffffff', '#ce1126', '#3a75c4', '#3d8e33'], hbars(['#ffd100', '#fff', '#ce1126', '#3a75c4']) + poly('0,0 130,100 0,200', '#3d8e33') + crescent(40, 100, 30, 10, 0, 26, '#fff') + [76, 92, 108, 124].map((y) => star(62, y, 6, '#fff')).join('')),
    flagMeaning: 'الأشرطة الأربعة والنجوم الأربع ترمز إلى الجزر الرئيسية الأربع، والهلال الأبيض على المثلث الأخضر رمز الإسلام.',
    resources: ['الفانيليا', 'القرنفل', 'زهرة اليلنغ يلنغ', 'السمك'],
    fact: 'تُلقّب جزر القمر «جزر العطور» لكثرة النباتات العطرية فيها، مثل زهرة اليلنغ يلنغ.',
    lat: -11.7, lon: 43.3,
  },
};
