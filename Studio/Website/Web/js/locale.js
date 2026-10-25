// One language preference for the website and its learning experiences.
export const LANGUAGE_KEY = 'sindibad-language';
const requested = new URLSearchParams(location.search).get('lang');
let saved;
try { saved = localStorage.getItem(LANGUAGE_KEY); } catch {}
export let lang = ['en', 'ar'].includes(requested) ? requested : saved === 'ar' ? 'ar' : 'en';
export function setLanguage(value) {
  lang = value === 'ar' ? 'ar' : 'en';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  try { localStorage.setItem(LANGUAGE_KEY, lang); } catch {}
}
setLanguage(lang);
export const text = value => typeof value === 'string' ? value : value[lang];
const base = new URL('../', import.meta.url);
export const assetUrl = path => new URL(`assets/${path}`, base).href;
export const siteUrl = (path = '', hash = '') => {
  const url = new URL(path || 'home', base);
  url.searchParams.set('lang', lang);
  if (hash) url.hash = hash;
  return url.href;
};
export const labUrl = id => {
  const url = new URL('../../Games/Sindibad-Yasmina/Classes/Grade10/Chemistry/Web/lab.html', base);
  url.searchParams.set('lang', lang);
  if (id) url.searchParams.set('experiment', id);
  return url.href;
};
