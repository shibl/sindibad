import { lang, siteUrl } from './locale.js';
const arabic = lang === 'ar';
document.title = arabic ? 'مختبر الكيمياء · المنهاج' : 'Chemistry Lab · The Curriculam';
document.querySelector('.boot b').textContent = arabic ? 'المنهاج' : 'The Curriculam';
try {
  const { boot } = await import('./main.js');
  await boot();
} catch (error) {
  console.error('The chemistry lab could not start.', error);
  document.querySelector('.boot').innerHTML = `<div class="boot-error"><b>${arabic ? 'تعذّر فتح المختبر' : 'The lab could not open'}</b><p>${arabic ? 'أعد تحميل الصفحة أو استخدم متصفّحاً يدعم الرسومات ثلاثية الأبعاد.' : 'Reload the page or use a browser with 3D graphics support.'}</p><a href="${siteUrl()}">${arabic ? 'العودة إلى سندباد ستوديوز' : 'Back to Sindibad Studios'}</a></div>`;
}
