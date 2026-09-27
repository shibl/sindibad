// End-to-end test in a headless browser (Playwright + Chromium):
//   title → hero select → map → learn cards → a perfect lesson → stars
//   saved → reload keeps progress → the app still loads with the network
//   off → no console errors. Runs at phone and tablet sizes.
//
//   npm install      (once, installs Playwright)
//   npm test
//
// Uses the engines' test hook (window.__SINDBAD_TEST__) to find right answers.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = path || 'index.html';
  try {
    const body = await readFile(join(ROOT, file));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const URL_ = `http://localhost:${server.address().port}/`;

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures += 1; };

async function perfectLesson(p) {
  for (let step = 0; step < 150; step++) {
    if (await p.isVisible('#result:not([hidden])')) return true;
    if (await p.locator('[data-learn=next]').count()) { await p.click('[data-learn=next]'); continue; }
    const ok = p.locator('#activity .round:not(.is-solved) button[data-ok]');
    if (await ok.count()) { await ok.first().click(); await p.waitForTimeout(1250); continue; }
    const nl = p.locator('.round:not(.is-solved) .nl[data-ok]');
    if (await nl.count()) {
      const f = Number(await nl.getAttribute('data-ok'));
      const b = await nl.locator('svg').boundingBox();
      await p.mouse.click(b.x + b.width * (0.06 + f * 0.88), b.y + b.height * 0.6);
      await p.waitForTimeout(1250); continue;
    }
    const m = p.locator('.match__item:not(.is-done)[data-side=a]');
    if (await m.count()) {
      const idx = await m.first().getAttribute('data-pair');
      await m.first().click();
      await p.locator(`.match__item:not(.is-done)[data-side=b][data-pair="${idx}"]`).click();
      await p.waitForTimeout(300); continue;
    }
    await p.waitForTimeout(200);
  }
  return false;
}

const browser = await chromium.launch();
for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 1024, height: 768 }]]) {
  console.log(`— ${name}`);
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript(() => { window.__SINDBAD_TEST__ = true; });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push(e.message));

  await p.goto(URL_);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.click('text=ابدأ الرحلة');
  check(await p.isVisible('#screen-select'), 'start → character select');
  await p.click('[data-hero=yasmina]');
  await p.click('#select-go');
  check(await p.isVisible('#screen-map'), 'hero chosen → map');
  check(await p.locator('.isle--locked').count() === 4, 'four islands start under fog');

  await p.click('.isle[data-region=arabic]');
  await p.waitForSelector('.sheet.is-open', { timeout: 5000 });
  check(await p.locator('.topic-card').count() === 3, 'Arabic island lists 3 topics');
  await p.click('[data-topic=arabic-fael-mafool]');
  check(await p.locator('.learn').count() === 1, 'first play opens Hudhud\'s lesson');
  check(await perfectLesson(p), 'lesson played to the end');
  check((await p.locator('.rstar.is-on').count()) === 3, 'perfect play earns 3 stars');
  await p.click('[data-result=map]');
  await p.waitForTimeout(4500);
  check(await p.locator('.isle[data-region=math]:not(.isle--locked)').count() === 1, '3 stars lift the fog from the maths island');

  await p.reload();
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('sindbad.save.v1')));
  check(saved.hero === 'yasmina' && saved.topics['arabic-fael-mafool'].stars === 3, 'progress survives a reload');

  await ctx.setOffline(true);
  await p.reload();
  await p.waitForTimeout(600);
  check(await p.isVisible('.logo__big'), 'app loads with the network off');
  await p.click('#screen-title [data-go]');
  check(await p.locator('.isle').count() === 6, 'map works offline');
  check(errors.length === 0, `no console errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
}
await browser.close();
server.close();
if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall checks passed');
