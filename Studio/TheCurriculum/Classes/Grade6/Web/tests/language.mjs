// Language changes must preserve the running activity and the original teaching
// content, work offline, and keep staging preferences separate from production.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://local').pathname.replace(/^\/(staging\/)?/, '') || 'index.html';
  try { const body = await readFile(join(root, path)); res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--mute-audio'] });
const errors = [];
const shots = process.env.LANGUAGE_SCREENSHOTS;
if (shots) await mkdir(shots, { recursive: true });
const check = (value, label) => { assert.ok(value, label); console.log(`✓ ${label}`); };
async function ready(p) { await p.waitForFunction(() => typeof window.__lesson === 'function'); }
async function choose(p, lang) {
  await p.click(`[data-language="${lang}"]`);
  await p.waitForFunction(lang => document.documentElement.lang === lang, lang);
}
async function snapshot(p, name) { if (shots) await p.screenshot({ path: join(shots, `${name}.png`) }); }
async function fit(p, selector) {
  return p.locator(selector).evaluateAll(els => els.length > 0 && els.every(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.x >= -1 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1;
  }));
}
try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 1024, height: 768 }]) {
    const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { window.__SINDBAD_TEST__ = true; });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(url); await ready(p);
    check(await p.locator('html').getAttribute('lang') === 'ar', `${viewport.width}: Arabic is the default`);
    await choose(p, 'en');
    check(await p.locator('html').getAttribute('dir') === 'ltr', 'English uses LTR');
    check(await p.locator('#screen-title [data-go=who]').textContent() === 'Start journey', 'English start button');
    check(await fit(p, '[data-language], #screen-title [data-go=who]'), 'language and start buttons fit the viewport');
    await snapshot(p, `title-en-${viewport.width}`);

    await p.click('#screen-title [data-go=who]');
    const input = p.locator('#child-name');
    check(await input.getAttribute('placeholder') === 'Type your name here', 'dynamic form and placeholder are translated');
    // Deliberately use a translation key as the synthetic profile name.
    await input.fill('اللغة');
    await choose(p, 'ar');
    check(await input.inputValue() === 'اللغة', 'switching preserves typed input');
    check(await input.getAttribute('placeholder') === 'اكتب اسمك هنا', 'Arabic placeholder restored');
    await choose(p, 'en');
    await p.click('#who-form [type=submit]');
    await p.waitForSelector('#screen-select[data-active]');
    check(await p.locator('html').getAttribute('lang') === 'en', 'language survives profile creation and reload');
    await p.click('[data-hero=yasmina]');
    await choose(p, 'ar');
    await choose(p, 'en');
    check(await p.locator('[data-hero=yasmina]').getAttribute('aria-checked') === 'true', 'hero choice survives switching');
    await snapshot(p, `hero-en-${viewport.width}`);
    check(await fit(p, '#select-go'), 'hero selection button fits');
    await p.click('#select-go');
    await p.click('[data-st=next]');
    await choose(p, 'ar');
    await choose(p, 'en');
    check(await p.locator('.story__panel--scroll').isVisible(), 'story stays on its current panel');
    await p.click('[data-st=skip]');
    await p.click('.voyage--open');
    await p.waitForSelector('#screen-map[data-active]');
    await p.click('#mute-btn');
    check((await p.locator('#settings-title').textContent()).includes('Settings'), 'settings translate when opened during play');
    await choose(p, 'ar');
    check((await p.locator('#settings-title').textContent()).includes('الإعدادات'), 'open settings switch back without closing');
    await choose(p, 'en');
    await p.click('.settings [data-close]');
    await p.click('#hero-btn');
    check(await p.locator('.journey__hero h3').textContent() === 'اللغة', 'player names are never translated');
    await p.click('#screen-journey [data-go=map]');

    // Use a multi-step activity; check the DOM identity and partial input, not
    // just a screenshot of the initial question.
    await p.evaluate(() => window.__lesson('math-equivalent'));
    while (await p.locator('[data-learn=next]').count()) await p.click('[data-learn=next]');
    await p.waitForSelector('.fill');
    check((await p.locator('#activity .prompt').textContent()).includes('Fill the bucket'), 'math question is translated');
    await p.locator('.fill [data-step]').first().click();
    const before = await p.locator('#activity').innerHTML();
    await p.evaluate(() => {
      window.languageActivity = document.querySelector('.fill');
      window.languageProgress = () => {
        // Play time continues independently while switching languages.
        const { time, days, ...progress } = JSON.parse(localStorage.getItem('sindbad.save.v1'));
        return JSON.stringify(progress);
      };
      window.languageSave = window.languageProgress();
    });
    await choose(p, 'ar');
    check(await p.evaluate(() => window.languageActivity === document.querySelector('.fill')), 'switch preserves the actual activity instance');
    await choose(p, 'en');
    check(await p.locator('#activity').innerHTML() === before, 'partial activity state survives a round trip');
    check(await p.evaluate(() => window.languageSave === window.languageProgress()), 'switch does not change saved progress');
    await snapshot(p, `activity-en-${viewport.width}`);
    check(await fit(p, '.fill .btn'), 'activity controls fit the viewport');
    await p.click('#lesson-quit');
    await p.evaluate(() => window.__lesson('arabic-fael-mafool'));
    const content = await p.locator('.learn__body').innerHTML();
    await choose(p, 'ar');
    await choose(p, 'en');
    check(await p.locator('.learn__body').innerHTML() === content, 'Arabic lesson survives a language round trip');
    check(await p.locator('#activity').getAttribute('dir') === 'ltr', 'English guidance uses LTR');
    check((await p.locator('.learn__body').textContent()).includes('verbal sentence'), 'Arabic lesson guidance is translated');
    check((await p.locator('.role b').first().textContent()).includes('كتبَ'), 'Arabic teaching examples retain their letters and endings');
    check(await p.locator('.role b').first().getAttribute('lang') === 'ar', 'Arabic examples retain their language for assistive reading');
    check(await p.locator('.roles').first().getAttribute('dir') === 'rtl', 'Arabic example word order stays RTL');
    check(await fit(p, '[data-learn=next]'), 'English lesson navigation stays visible on small screens');
    await snapshot(p, `arabic-guidance-en-${viewport.width}`);
    await p.click('#lesson-quit');
    await p.evaluate(() => window.__lesson('sci-hunters'));
    while (await p.locator('[data-learn=next]').count()) await p.click('[data-learn=next]');
    await p.waitForSelector('#activity .choice[data-ok]');
    check(!/[\u0621-\u064a]/.test(await p.locator('#activity').textContent()), 'science question and choices are fully English');
    const correct = p.locator('#activity .choice[data-ok]').first();
    await correct.click();
    check(await correct.evaluate(el => el.classList.contains('is-right')), 'translated answer retains the original answer key');
    await p.click('#lesson-quit');
    await p.evaluate(() => navigator.serviceWorker.ready);
    // Wait until the offline cache actually contains the English catalogue.
    await p.waitForFunction(async () => !!(await caches.match(new URL('core/i18n/en.js', location.href))));
    await ctx.setOffline(true);
    await p.reload(); await ready(p);
    check(await p.locator('html').getAttribute('lang') === 'en', 'English persists and loads offline');
    await choose(p, 'ar');
    check(await p.locator('html').getAttribute('dir') === 'rtl', 'offline switch restores RTL');
    await ctx.setOffline(false);
    await choose(p, 'en');
    await p.goto(url + 'staging/'); await ready(p);
    check(await p.locator('html').getAttribute('lang') === 'ar', 'staging has its own language preference');
    await choose(p, 'en');
    await p.reload(); await ready(p);
    await p.waitForFunction(() => document.documentElement.lang === 'en');
    check(await p.locator('html').getAttribute('lang') === 'en', 'staging preference persists');
    check((await p.title()).startsWith('🧪'), 'staging title stays marked after switching');
    await choose(p, 'ar');
    await p.goto(url); await ready(p);
    check(await p.locator('html').getAttribute('lang') === 'en', 'staging language does not affect production');
    await p.goto(url + 'about.html');
    await p.waitForFunction(() => document.documentElement.lang === 'en');
    check(await p.locator('main').evaluate(root => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('[translate=no]') && /[\u0621-\u064a]/.test(walker.currentNode.data)) return false;
      return true;
    }), 'About page content is fully English');
    check(await p.locator('.shot img').first().getAttribute('alt') === 'Start screen', 'image alternative text is translated');
    check(await fit(p, '[data-language]'), 'About page language controls fit');
    await snapshot(p, `about-en-${viewport.width}`);
    if (viewport.width === 360) {
      await p.goto(url + 'staging/'); await ready(p);
      await choose(p, 'en');
      await p.evaluate(async () => {
        const { save } = await import('./core/save.js');
        save.update(s => { s.hero = 'yasmina'; s.storySeen = true; });
      });
      await p.reload(); await ready(p);
      await p.click('#screen-title [data-go]');
      await p.click('.voyage--open');
      await p.click('.isle[data-region=science]');
      await p.waitForSelector('#screen-lab[data-active]');
      await p.evaluate(() => window.__labDo('debugStart', 'hunters'));
      await p.waitForSelector('#lab-panel .tn-step');
      await p.locator('#lab-panel [data-spot][data-ok]').first().click();
      const found = await p.locator('#lab-panel .is-found').count();
      check(found > 0, '3D lesson has partial exploration progress');
      await p.evaluate(() => { window.languageCanvas = document.querySelector('#lab-stage canvas'); });
      const quest = await p.evaluate(() => window.__lab());
      await choose(p, 'ar');
      await choose(p, 'en');
      const after = await p.evaluate(() => window.__lab());
      check(after.quest === quest.quest && after.step === quest.step, 'language switch preserves the running 3D quest and step');
      check(await p.locator('#lab-panel .is-found').count() === found, '3D exploration progress is retained');
      check(await p.evaluate(() => window.languageCanvas === document.querySelector('#lab-stage canvas')), '3D renderer is not recreated');
      check(await p.locator('#lab-panel .tn-step').getAttribute('dir') === 'ltr', '3D teaching content follows the chosen language');
      check((await p.locator('#lab-panel .lx-chip').textContent()).includes("Let's learn"), 'shared 3D lesson controls translate');
      check(!/[\u0621-\u064a]/.test(await p.locator('#lab-panel').textContent()), '3D science guidance, diagram and discovery text are fully English');
      await snapshot(p, 'science-en-360');
    }
    await ctx.close();
  }
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    window.__SINDBAD_TEST__ = true;
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(url); await ready(p);
  await choose(p, 'en');
  check(await p.locator('html').getAttribute('lang') === 'en', 'language switch works when storage is unavailable');
  await ctx.close();
  const speechContext = await browser.newContext();
  await speechContext.addInitScript(() => {
    window.spoken = [];
    window.speechCancelled = 0;
    Object.defineProperty(window, 'speechSynthesis', { value: {
      getVoices: () => [{ lang: 'ar-SY', localService: true }, { lang: 'en-GB', localService: true }],
      addEventListener() {},
      cancel() { window.speechCancelled++; },
      speak(u) { window.spoken.push({ text: u.text, lang: u.lang }); },
    } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text; } } });
  });
  const speechPage = await speechContext.newPage();
  speechPage.on('pageerror', e => errors.push(e.message));
  await speechPage.goto(url);
  await choose(speechPage, 'en');
  const spoken = await speechPage.evaluate(async () => {
    const { speak } = await import('./core/voice.js');
    speak('Start journey');
    speak('الفعل'); // Arabic lesson text must not become an English UI label.
    speak('Hello', 'en');
    return window.spoken;
  });
  assert.deepEqual(spoken, [{ text: 'Start journey', lang: 'en-GB' }, { text: 'الفعل', lang: 'ar-SY' }, { text: 'Hello', lang: 'en-GB' }]);
  console.log('✓ speech uses the displayed language and preserves Arabic learning words');
  const cancelled = await speechPage.evaluate(() => window.speechCancelled);
  await choose(speechPage, 'ar');
  check(await speechPage.evaluate(() => window.speechCancelled) > cancelled, 'switching cancels speech in the previous language');
  await speechContext.close();
  assert.deepEqual(errors, [], 'no browser errors');
  console.log('Language checks passed.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
