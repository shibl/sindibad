import { lang, setLanguage, siteUrl, assetUrl, labUrl, text } from './locale.js';
import { grades, areas } from './curriculum.js';
import { experiments } from './catalogue.js';
import { mountSiteMotion, playStudioSplash } from './site-motion.js';

const t = (en, ar) => lang === 'ar' ? ar : en;
const page = document.body.dataset.page || 'studio';
const gradeNumber = Number(document.body.dataset.grade || 1);
const grade = grades.find(item => item.number === gradeNumber) || grades[0];
const subjectId = new URLSearchParams(location.search).get('subject');
const selectedArea = areas.find(area => area.id === subjectId);
const productName = () => t('The Curriculam', 'المنهاج');
const studioName = () => t('Sindibad Studios', 'سندباد ستوديوز');
const gradeName = item => t(`Grade ${item.number}`, item.ar);
const studioSection = id => page === 'studio' ? `#${id}` : siteUrl('home', id);
const productUrl = () => siteUrl('products/the-curriculam/');
const curriculumUrl = () => siteUrl('products/the-curriculam/', 'curriculum');
const gradeUrl = number => siteUrl(`products/the-curriculam/grade-${number}/`);
const chemistryUrl = () => siteUrl('products/the-curriculam/grade-10/chemistry/');
const areaUrl = (number, id) => `${gradeUrl(number)}&subject=${id}`;
const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const arrow = `<span class="directional">${svg('<path d="M4 12h16m-6-6 6 6-6 6"/>')}</span>`;
const globe = svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>');
let experimentFilter = 'all';

function ribbon(className = '') {
  const paths = ['M-40 28H180Q400 28 400 248V540', 'M-40 72H180Q356 72 356 248V540', 'M-40 116H180Q312 116 312 248V540', 'M-40 160H180Q268 160 268 248V540'];
  return `<svg class="ribbon ${className}" viewBox="0 0 430 540" fill="none" aria-hidden="true">${paths.map((path, index) => `<path d="${path}" pathLength="1" stroke="currentColor" stroke-width="46"/><path d="${path}" pathLength="1" class="ribbon-colour ribbon-colour-${index}" stroke-width="42"/>`).join('')}</svg>`;
}
function gameGallery() {
  const views = [
    { file: 'game-workshop.png', title: t('The workshop', 'الورشة'), alt: t('Two adventurers exploring a brass mechanical puzzle in a Syrian courtyard workshop', 'مغامران يستكشفان لغزاً ميكانيكياً من النحاس في ورشة ضمن فناء سوري') },
    { file: 'game-world.png', title: t('The courtyard', 'الفناء'), alt: t('Two explorers and a geometric puzzle in an old Syrian city', 'مستكشفان ولغز هندسي في مدينة سورية قديمة') },
    { file: 'game-map.png', title: t('The world', 'عالم اللعبة'), alt: t('A connected adventure-game world of Syrian courtyards, waterways, workshops and an observatory', 'عالم لعبة مغامرات مترابط من الأفنية السورية والممرات المائية والورش ومرصد فلكي') },
  ];
  return `<div class="game-gallery" data-gallery data-gallery-arrival role="region" aria-label="${t('The Curriculam concept artwork', 'تصوّرات فنية للعبة المنهاج')}"><div class="gallery-backdrop" aria-hidden="true"><span></span><span></span></div><div class="gallery-track" data-lenis-prevent-horizontal id="world-gallery" tabindex="0" aria-label="${t('Game artwork. Scroll to see more.', 'رسومات اللعبة. مرّر لرؤية المزيد.')}">${views.map(view => `<figure class="gallery-slide" tabindex="0"><img src="${assetUrl(view.file)}" width="1448" height="1086" loading="lazy" alt="${view.alt}"><figcaption><span>${view.title}</span><span class="gallery-detail">${t('Concept art for The Curriculam', 'تصوّر فني للعبة المنهاج')}</span></figcaption></figure>`).join('')}</div><div class="gallery-controls"><span class="gallery-position" aria-live="polite"><bdi>01 / 03</bdi></span><span>${t('The Curriculam · Concept art', 'المنهاج · تصوّرات فنية')}</span><div class="arrow-controls"><button class="circle-button previous" data-gallery-step="-1" aria-controls="world-gallery" aria-label="${t('Previous artwork', 'الرسم السابق')}" disabled>${arrow}</button><button class="circle-button" data-gallery-step="1" aria-controls="world-gallery" aria-label="${t('Next artwork', 'الرسم التالي')}">${arrow}</button></div></div></div>`;
}

function brand() {
  return `<a class="brand" href="${page === 'studio' ? '#top' : siteUrl()}" aria-label="${studioName()}"><img src="${assetUrl('mark.svg')}" width="35" height="35" alt=""><span>${t('Sindibad', 'سندباد')}<small>${t('Studios', 'ستوديوز')}</small></span></a>`;
}
function header() {
  return `<a class="skip-link" href="#main">${t('Skip to content', 'انتقل إلى المحتوى')}</a><header class="site-header" id="top"><div class="container header-inner">${brand()}<nav id="navigation" class="main-nav" aria-label="${t('Main navigation', 'التنقّل الرئيسي')}"><a href="${studioSection('products')}">${t('Products', 'المنتجات')}</a><a href="${productUrl()}" ${page === 'product' ? 'aria-current="page"' : ''}>${productName()}</a><a href="${studioSection('about')}">${t('The studio', 'الستوديو')}</a></nav><div class="header-actions"><button class="language-button" id="language-switch" lang="${lang === 'ar' ? 'en' : 'ar'}" aria-label="${t('Switch to Arabic', 'Switch to English')}">${globe}${t('العربية', 'English')}</button><a class="header-cta" href="${page === 'studio' ? '#products' : curriculumUrl()}">${page === 'studio' ? t('Explore products', 'استكشف المنتجات') : t('Browse grades', 'تصفّح الصفوف')}${arrow}</a><button class="menu-button" aria-label="${t('Open navigation', 'افتح قائمة التنقّل')}" aria-controls="navigation" aria-expanded="false">${svg('<path d="M4 7h16M4 12h16M4 17h16"/>')}</button></div></div></header>`;
}
function footer() {
  return `<footer class="site-footer"><div class="footer-play-shapes" aria-hidden="true"><span class="shape-arch"></span><span class="shape-circle"></span><span class="shape-square"></span><span class="shape-lines"><i></i><i></i><i></i></span></div><div class="container footer-main">${brand()}<div class="footer-product"><span>${t('Products', 'المنتجات')}</span><a href="${productUrl()}">${productName()}</a><a href="${curriculumUrl()}">${t('The Syrian curriculum · Grades 1–12', 'المنهاج السوري · من الأول إلى الثاني عشر')}</a></div><div class="footer-note"><a href="${studioSection('about')}">${t('About the studio', 'عن الستوديو')}</a><a href="#top">${t('Back to top', 'إلى الأعلى')} ↑</a></div></div><div class="container footer-wordmark" aria-hidden="true">${studioName()}</div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} ${studioName()}</span></div></footer>`;
}
function breadcrumb(items) {
  return `<nav class="container breadcrumbs" aria-label="${t('Breadcrumb', 'مسار التصفّح')}">${items.map(([name, href], index) => `${index ? '<span aria-hidden="true">/</span>' : ''}${href ? `<a href="${href}">${name}</a>` : `<span aria-current="page">${name}</span>`}`).join('')}</nav>`;
}
function curriculumSection() {
  return `<section class="curriculum-section section container" id="curriculum" aria-labelledby="curriculum-title"><div class="section-heading" data-reveal><div><p class="eyebrow">${t('THE SYRIAN CURRICULUM', 'المنهاج السوري')}</p><h2 id="curriculum-title">${t('Choose your grade.', 'اختر صفّك.')}</h2></div><p>${t('All twelve school years, in one game. Choose your grade to find its subjects and game experiences.', 'السنوات الدراسية الاثنتا عشرة في لعبة واحدة. اختر صفّك للوصول إلى مواده وتجارب اللعبة فيه.')}</p></div><div class="grade-grid">${grades.map(item => `<a class="grade-link" href="${gradeUrl(item.number)}" data-reveal><span class="grade-numeral" aria-hidden="true">${String(item.number).padStart(2, '0')}</span><span class="grade-label">${gradeName(item)}</span><span class="grade-arrow">${arrow}</span></a>`).join('')}</div><div class="section-foot"><span>${t('The Curriculam · A Sindibad Studios product', 'المنهاج · أحد منتجات سندباد ستوديوز')}</span><span>${t('Grades 1–12', 'من الصف الأول إلى الثاني عشر')}</span></div></section>`;
}
function learningAreas() {
  return `<section class="learning-areas" id="learning-areas" aria-labelledby="areas-title"><div class="areas-heading container" data-reveal><p class="eyebrow">${productName()}</p><h2 id="areas-title">${t('Explore the<br>curriculum.', 'استكشف<br>المنهاج.')}</h2><p>${t('Find a subject. Choose a school year. See where it takes you.', 'اختر مجالاً، ثم صفّك الدراسي، واكتشف ما ينتظرك.')}</p></div><div class="area-list">${areas.map(area => `<article class="area-item" data-reveal data-area="${area.id}"><h3><button class="area-toggle" id="area-toggle-${area.id}" data-disclosure="area-panel-${area.id}" aria-expanded="false" aria-controls="area-panel-${area.id}"><span class="area-index">${area.number}</span><span>${t(area.en, area.ar)}</span><span class="disclosure-sign" aria-hidden="true"></span></button></h3><div class="disclosure-panel" id="area-panel-${area.id}" role="region" aria-labelledby="area-toggle-${area.id}" inert><div><div class="area-panel-content"><span class="area-symbol" aria-hidden="true" dir="ltr">${t(area.mark, area.arMark)}</span><div><p>${text(area.description)}</p><span class="area-prompt">${t('Choose your grade', 'اختر صفّك')}</span><div class="area-grade-links">${grades.map(item => `<a href="${areaUrl(item.number, area.id)}" aria-label="${gradeName(item)} · ${t(area.en, area.ar)}">${item.number}</a>`).join('')}</div></div></div></div></div></article>`).join('')}</div></section>`;
}
function productQuestions() {
  const questions = [
    [t('Which school years does The Curriculam cover?', 'ما الصفوف التي يشملها المنهاج؟'), t('The Curriculam is a game for the entire Syrian curriculum, from Grade 1 to Grade 12. Every school year has its own subjects and game experiences.', 'المنهاج لعبة للمنهاج السوري بأكمله، من الصف الأول إلى الثاني عشر. لكلّ عام دراسي مواده وتجارب اللعبة الخاصة به.')],
    [t('What can I play now?', 'ما الذي يمكنني لعبه الآن؟'), t('The Chemistry Lab in Grade 10 Sciences currently has seven playable experiments from Unit 1. The other grade and subject pages are ready to browse; their game experiences are still to come.', 'يتضمّن مختبر الكيمياء ضمن علوم الصف العاشر حالياً سبع تجارب قابلة للعب من الوحدة الأولى. يمكنك تصفّح صفحات الصفوف والموادّ الأخرى، وستُضاف تجارب اللعبة الخاصة بها لاحقاً.')],
    [t('Can I use Arabic or English?', 'هل يمكنني استخدام العربية أو الإنجليزية؟'), t('Yes. Use the language switch at the top of the page. Your choice follows you through the website and into the lab.', 'نعم. استخدم زرّ اللغة أعلى الصفحة. يبقى اختيارك محفوظاً أثناء تنقّلك في الموقع وعند دخول المختبر.')],
  ];
  return `<section class="product-questions section container" aria-labelledby="questions-title"><div data-reveal><p class="eyebrow">${t('A FEW USEFUL THINGS', 'قبل أن تبدأ')}</p><h2 id="questions-title">${t('Before<br>you play.', 'قبل<br>أن تلعب.')}</h2><a class="text-link" href="${curriculumUrl()}">${t('Explore all grades', 'استكشف جميع الصفوف')}${arrow}</a></div><div class="question-list">${questions.map(([question, answer], index) => `<article class="question-item" data-reveal><h3><button class="question-toggle" id="question-toggle-${index}" data-disclosure="question-panel-${index}" aria-expanded="false" aria-controls="question-panel-${index}"><span>${question}</span><span class="disclosure-sign" aria-hidden="true"></span></button></h3><div class="disclosure-panel" id="question-panel-${index}" role="region" aria-labelledby="question-toggle-${index}" inert><div><p>${answer}</p></div></div></article>`).join('')}</div></section>`;
}
function gameHero(product = false) {
  if (!product) return `<section class="studio-hero" aria-labelledby="game-title"><div class="studio-stage" data-feature><div class="studio-hero-art" data-scroll-scene><div class="feature-images">${[
    ['game-world.png', t('Two adventurers solving a geometric puzzle in a Syrian courtyard', 'مغامران يحلّان لغزاً هندسياً في فناء سوري')],
    ['game-workshop.png', t('The adventurers exploring a brass mechanical workshop', 'المغامران يستكشفان ورشة ميكانيكية من النحاس')],
    ['game-map.png', t('The game world, with courtyards, waterways and an observatory', 'عالم اللعبة بأفنيته وقنواته المائية ومرصده الفلكي')],
  ].map(([file, alt], index) => `<div class="feature-image ${index === 0 ? 'is-active' : ''}" data-feature-image="${index}" ${index ? 'aria-hidden="true"' : ''}><img src="${assetUrl(file)}" width="1942" height="810" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} alt="${alt}"></div>`).join('')}</div><div class="hero-art-caption"><div><h1 id="game-title">${productName()}</h1><p>${t('The Syrian curriculum, in a game.', 'المنهاج السوري، في لعبة.')}</p><a class="button" href="${productUrl()}">${t('Explore the game', 'استكشف اللعبة')}</a></div><div class="feature-controls"><button class="circle-button previous" data-feature-step="-1" aria-label="${t('Previous scene', 'المشهد السابق')}">${svg('<path d="m14 6-6 6 6 6"/>')}</button><div class="feature-pagination" aria-label="${t('Hero scenes', 'مشاهد الواجهة')}">${[0,1,2].map(index => `<button class="feature-dot ${index === 0 ? 'is-active' : ''}" data-feature-index="${index}" aria-label="${t(`Show scene ${index + 1}`, `اعرض المشهد ${index + 1}`)}" aria-current="${index === 0 ? 'true' : 'false'}"><span></span></button>`).join('')}</div><button class="circle-button" data-feature-step="1" aria-label="${t('Next scene', 'المشهد التالي')}">${svg('<path d="m10 6 6 6-6 6"/>')}</button></div></div></div></div><div class="studio-strip container"><span>${productName()}</span><span>${t('Syrian curriculum · Grades 1–12', 'المنهاج السوري · من الصف الأول إلى الثاني عشر')}</span><a href="${productUrl()}">${t('Explore the game', 'استكشف اللعبة')}${arrow}</a></div></section>`;
  return `<section class="game-hero" aria-labelledby="game-title"><div class="game-hero-art"><img src="${assetUrl('game-map.png')}" width="1942" height="810" fetchpriority="high" alt="${t('Concept art of the Syrian-inspired adventure world of The Curriculam', 'تصوّر فني لعالم مغامرات المنهاج المستوحى من سورية')}"></div><div class="game-hero-copy"><p class="eyebrow">${t('A PRODUCT BY SINDIBAD STUDIOS', 'أحد منتجات سندباد ستوديوز')}</p><h1 id="game-title">${t('The<br>Curriculam', 'المنهاج')}</h1><p class="hero-subtitle">${t('The whole Syrian curriculum.<br>A world to play through.', 'المنهاج السوري بأكمله.<br>عالم تتعلّمه باللعب.')}</p><div class="hero-actions"><a class="button" href="#curriculum">${t('Choose your grade', 'اختر صفّك')}${arrow}</a><a class="text-link" href="#learning-areas">${t('Explore the subjects', 'استكشف الموادّ')}${arrow}</a></div></div><div class="game-hero-footer"><span>${t('THE WHOLE SYRIAN CURRICULUM', 'المنهاج السوري بأكمله')}</span><span>${t('Grades 1–12', 'من الصف الأول إلى الثاني عشر')}</span></div></section>`;
}
function studioPage() {
  return `${header()}<main id="main">${gameHero()}<section class="studio-products section" id="products" aria-labelledby="products-title"><article class="product-spotlight"><div class="product-feature-copy container"><div data-reveal><p class="eyebrow">${t('THE SYRIAN CURRICULUM', 'المنهاج السوري')}</p><h2 id="products-title">${productName()}</h2></div><div data-reveal><p class="large-copy">${t('A game for every school year.', 'لعبة لكلّ عام دراسي.')}</p><p class="body-copy">${t('Explore the Syrian curriculum from Grade 1 to Grade 12. Choose your year, find a subject, and enter its world.', 'استكشف المنهاج السوري من الصف الأول إلى الثاني عشر. اختر صفّك، ثم مادّتك، وادخل عالمها.')}</p><a class="button" href="${productUrl()}">${t('Explore The Curriculam', 'استكشف المنهاج')}${arrow}</a></div></div>${gameGallery()}</article></section><section class="studio-about section container" id="about"><div data-reveal><p class="eyebrow">${t('THE STUDIO', 'الستوديو')}</p><h2>${t('Sindibad<br>Studios.', 'سندباد<br>ستوديوز.')}</h2>${ribbon('about-ribbon')}</div><div data-reveal><p class="large-copy">${t('We make games. The Curriculam is one of them.', 'نصنع ألعاباً. والمنهاج واحدة منها.')}</p><p class="body-copy">${t('The Curriculam brings the Syrian curriculum into a game, across all twelve school years. Each grade leads to its subjects and the experiences within them.', 'تقدّم المنهاج تجربة لعب للمنهاج السوري عبر سنواته الدراسية الاثنتي عشرة. يقودك كلّ صفّ إلى مواده والتجارب المرتبطة بها.')}</p><a class="text-link" href="${productUrl()}">${t('The Curriculam', 'المنهاج')}${arrow}</a></div></section></main>${footer()}`;
}
function productPage() {
  return `${header()}<main id="main">${gameHero(true)}<section class="game-description section container"><div data-reveal><p class="eyebrow">${productName()}</p><h2>${t('Every school year.<br>Part of the adventure.', 'لكلّ صفّ<br>مكان في اللعبة.')}</h2></div><div data-reveal><p class="large-copy">${t('A game for the entire Syrian curriculum, from your first school year to your last.', 'لعبة للمنهاج السوري بأكمله، من عامك الدراسي الأول إلى الأخير.')}</p><p class="body-copy">${t('Choose a grade, find a subject, and step into its game experiences. Every school year has a place here.', 'اختر صفّاً، ثم مادّة، وادخل تجاربها في اللعبة. لكلّ عام دراسي مكانه هنا.')}</p></div></section>${learningAreas()}${curriculumSection()}${productQuestions()}</main>${footer()}`;
}
function gradeNavigation() {
  return `<nav class="grade-navigation" aria-label="${t('School grades', 'الصفوف الدراسية')}"><span>${t('Grade', 'الصفّ')}</span>${grades.map(item => `<a href="${gradeUrl(item.number)}" aria-label="${gradeName(item)}" ${item.number === grade.number ? 'aria-current="page"' : ''}>${item.number}</a>`).join('')}</nav>`;
}
function gradePage() {
  const trail = [[studioName(), siteUrl()], [productName(), productUrl()], [t('Syrian curriculum', 'المنهاج السوري'), curriculumUrl()], [gradeName(grade), selectedArea ? gradeUrl(grade.number) : null]];
  if (selectedArea) trail.push([t(selectedArea.en, selectedArea.ar), null]);
  const heading = selectedArea ? t(selectedArea.en, selectedArea.ar) : gradeName(grade);
  return `${header()}<main id="main">${breadcrumb(trail)}<section class="grade-intro container"><p class="eyebrow">${productName()} · ${selectedArea ? gradeName(grade) : t('THE SYRIAN CURRICULUM', 'المنهاج السوري')}</p><h1>${heading}</h1><p>${selectedArea ? text(selectedArea.description) : t('Choose a learning area and explore the subjects within your school year.', 'اختر مجال التعلّم واستكشف الموادّ ضمن عامك الدراسي.')}</p>${gradeNavigation()}</section>
    ${selectedArea ? areaPageContent() : `<section class="container grade-areas"><div class="small-section-heading"><h2>${t('Learning areas', 'مجالات التعلّم')}</h2><span>${gradeName(grade)}</span></div>${areas.map(area => `<a class="subject-row" href="${areaUrl(grade.number, area.id)}"><span class="subject-mark" dir="${area.id === 'languages' && lang === 'ar' ? 'rtl' : 'ltr'}" aria-hidden="true">${t(area.mark, area.arMark)}</span><div><h3>${t(area.en, area.ar)}</h3><p>${text(area.description)}</p></div>${arrow}</a>`).join('')}</section>`}
    <section class="container grade-return"><a class="text-link" href="${curriculumUrl()}">${t('Browse all twelve grades', 'تصفّح الصفوف الاثني عشر')}${arrow}</a></section></main>${footer()}`;
}
function areaPageContent() {
  const chemistry = grade.number === 10 && selectedArea.id === 'sciences';
  if (chemistry) return `<section class="container subject-library"><div class="small-section-heading"><h2>${t('Game experiences', 'تجارب اللعبة')}</h2><span>${t('Grade 10 · Sciences', 'الصف العاشر · العلوم')}</span></div><a class="experience-feature" href="${chemistryUrl()}"><div class="experience-photo"><img src="${assetUrl('chemistry-hero.png')}" width="1448" height="1086" loading="lazy" alt="${t('Glassware in the Chemistry Lab', 'أوعية زجاجية في مختبر الكيمياء')}"></div><div class="experience-copy"><p class="eyebrow">${t('CHEMISTRY', 'الكيمياء')}</p><h3>${t('Chemistry Lab', 'مختبر الكيمياء')}</h3><p>${t('Unit 1: Matter and its transformations. Explore seven virtual experiments from the Grade 10 chemistry book.', 'الوحدة الأولى: المادة وتحوّلاتها. استكشف سبع تجارب افتراضية من كتاب الكيمياء للصف العاشر.')}</p><span class="text-link">${t('Explore this experience', 'استكشف هذه التجربة')}${arrow}</span></div></a></section>`;
  return `<section class="container subject-library"><div class="small-section-heading"><h2>${t('Game experiences', 'تجارب اللعبة')}</h2><span>${gradeName(grade)}</span></div><div class="library-empty">${svg('<path d="M4 5h16v15H4zM8 2v6m8-6v6M8 12h8m-8 4h5"/>')}<h3>${t('No game experiences added yet.', 'لم تُضَف تجارب للعبة بعد.')}</h3><p>${t('This subject’s game experiences will appear here.', 'ستظهر تجارب اللعبة الخاصة بهذه المادّة هنا.')}</p><a class="text-link" href="${gradeUrl(grade.number)}">${t('Back to learning areas', 'العودة إلى مجالات التعلّم')}${arrow}</a></div></section>`;
}
function chemistryPage() {
  return `${header()}<main id="main">${breadcrumb([[studioName(), siteUrl()], [productName(), productUrl()], [t('Syrian curriculum', 'المنهاج السوري'), curriculumUrl()], [t('Grade 10', 'الصف العاشر'), gradeUrl(10)], [t('Sciences', 'العلوم'), areaUrl(10, 'sciences')], [t('Chemistry Lab', 'مختبر الكيمياء'), null]])}<section class="chemistry-intro container"><div><p class="eyebrow">${t('GRADE 10 · CHEMISTRY', 'الصف العاشر · الكيمياء')}</p><h1>${t('Chemistry<br>Lab.', 'مختبر<br>الكيمياء.')}</h1><p class="hero-subtitle">${t('Unit 1: Matter and its transformations.', 'الوحدة الأولى: المادة وتحوّلاتها.')}</p><p class="body-copy">${t('Prepare your equipment, observe what happens, and draw your own conclusions. Seven experiments from your chemistry book, in an interactive virtual laboratory.', 'جهّز أدواتك، وراقب ما يحدث، وتوصّل إلى استنتاجك. سبع تجارب من كتاب الكيمياء في مختبر افتراضي تفاعلي.')}</p><a class="button" href="${labUrl()}">${t('Enter the lab', 'ادخل المختبر')}${arrow}</a></div><img src="${assetUrl('chemistry-hero.png')}" width="1448" height="1086" alt="${t('Chemistry glassware', 'أوعية مختبر الكيمياء')}"></section><section class="container section experiment-section"><div class="section-heading"><div><p class="eyebrow">${t('THE EXPERIMENTS', 'التجارب')}</p><h2>${t('Choose an experiment.', 'اختر تجربة.')}</h2></div><p>${t('Each experiment is connected to its original lesson and textbook pages.', 'ترتبط كلّ تجربة بدرسها الأصلي وصفحاته في الكتاب.')}</p></div><div class="experiment-filters" role="group" aria-label="${t('Filter experiments', 'تصفية التجارب')}">${[['all', t('All experiments', 'كلّ التجارب')], ['matter', t('States of matter', 'حالات المادة')], ['reactions', t('Chemical reactions', 'التفاعلات الكيميائية')]].map(([id, label]) => `<button data-filter="${id}" aria-pressed="${experimentFilter === id}" aria-controls="experiment-list">${label}</button>`).join('')}</div><div id="experiment-list"></div><p class="experiment-count" id="experiment-count" role="status" aria-live="polite"></p></section></main>${footer()}`;
}
function renderExperiments() {
  const list = document.getElementById('experiment-list');
  if (!list) return;
  const matching = experiments.filter(item => experimentFilter === 'all' || item.group === experimentFilter);
  list.innerHTML = matching.map(item => `<a class="experiment-row" href="${labUrl(item.id)}"><span class="experiment-number">${String(experiments.indexOf(item) + 1).padStart(2, '0')}</span><div><span class="experiment-topic">${text(item.topic)}</span><h3>${text(item.title)}</h3><p>${text(item.description)}</p></div><span class="experiment-page">${t('Textbook p.', 'صفحة الكتاب')} <bdi>${item.page}</bdi></span>${arrow}</a>`).join('');
  document.getElementById('experiment-count').textContent = t(`${matching.length} experiments`, `${matching.length} تجارب`);
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === experimentFilter)));
}
function render() {
  let title = studioName();
  if (page === 'product') title = `${productName()} | ${studioName()}`;
  if (page === 'grade') title = `${selectedArea ? t(selectedArea.en, selectedArea.ar) + ' · ' : ''}${gradeName(grade)} | ${productName()}`;
  if (page === 'chemistry') title = `${t('Chemistry Lab · Grade 10', 'مختبر الكيمياء · الصف العاشر')} | ${productName()}`;
  document.title = title;
  document.querySelector('meta[name="description"]').content = page === 'studio' ? t('Sindibad Studios. Discover The Curriculam, a game for the entire Syrian curriculum.', 'سندباد ستوديوز. تعرّف إلى المنهاج، لعبة للمنهاج السوري بأكمله.') : t('The Curriculam, a product by Sindibad Studios. A game for the whole Syrian curriculum, from Grade 1 to Grade 12, in English and Arabic.', 'المنهاج، أحد منتجات سندباد ستوديوز. لعبة للمنهاج السوري بأكمله، من الصف الأول إلى الثاني عشر، بالعربية والإنجليزية.');
  const views = { studio: studioPage, product: productPage, grade: gradePage, chemistry: chemistryPage };
  document.getElementById('website').innerHTML = (views[page] || studioPage)();
  renderExperiments();
  mountSiteMotion();
}
render();
if (page === 'studio') playStudioSplash(lang);
else document.documentElement.classList.add('site-ready');
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button?.id === 'language-switch') {
    setLanguage(lang === 'en' ? 'ar' : 'en');
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
    render();
    document.getElementById('language-switch').focus({ preventScroll: true });
  }
  if (button?.dataset.filter) { experimentFilter = button.dataset.filter; renderExperiments(); }
  if (button?.classList.contains('menu-button')) {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.getElementById('navigation').classList.toggle('open', open);
  }
  if (event.target.closest('.main-nav a')) {
    document.getElementById('navigation').classList.remove('open');
    document.querySelector('.menu-button').setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const nav = document.getElementById('navigation');
  if (nav.classList.contains('open')) {
    nav.classList.remove('open');
    const button = document.querySelector('.menu-button');
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  }
});
