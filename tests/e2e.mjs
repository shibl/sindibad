// End-to-end test in a headless browser (Playwright + Chromium):
//   title → hero select → map → go ashore on the Arabic island → walk →
//   talk to the calligrapher → his quest's lesson, played perfectly → a
//   golden letter → back to sea: the fog lifts → reload keeps progress →
//   the app (and the island) still load with the network off → no errors. Runs at phone and tablet sizes.
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
  check(await p.isVisible('#screen-who'), 'start → who is playing?');
  check(await p.isVisible('#child-name'), 'a new device asks the child\'s name straight away');
  await p.fill('#child-name', 'سارة');
  await p.click('#who-form [type=submit]');
  await p.waitForSelector('#screen-select[data-active]', { timeout: 5000 });
  check(true, 'new child named → character select');
  await p.click('[data-hero=yasmina]');
  await p.click('#select-go');
  check(await p.isVisible('#story'), 'hero chosen → the opening story');
  await p.click('[data-st=skip]');
  check(await p.isVisible('#screen-map'), 'story skipped → map');
  check(await p.locator('.isle--locked').count() === 4, 'four islands start under fog');

  await p.click('.isle[data-region=arabic]');
  await p.waitForSelector('#screen-island[data-active]', { timeout: 6000 });
  check(true, 'sailing to the Arabic island goes ashore');
  const pos = () => p.evaluate(() => window.__island());
  const start = await pos();
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(700); await p.keyboard.up('ArrowUp');
  check((await pos()).y < start.y - 0.5, 'the hero walks with the arrow keys');
  // Walk to the calligrapher by the gate and accept his quest.
  async function walkTo(x, y) {
    for (let i = 0; i < 120; i++) {
      const s = await pos(); const dx = x - s.x, dy = y - s.y;
      if (Math.hypot(dx, dy) < 0.4) return;
      const keys = [];
      if (Math.abs(dx) > 0.25) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      if (Math.abs(dy) > 0.25) keys.push(dy > 0 ? 'ArrowDown' : 'ArrowUp');
      for (const k of keys) await p.keyboard.down(k);
      await p.waitForTimeout(120);
      for (const k of keys) await p.keyboard.up(k);
    }
  }
  await walkTo(13.1, 19.6); await walkTo(13.1, 13.2); await walkTo(15.9, 12.5);
  await p.keyboard.press('Space');
  await p.waitForSelector('#dialog:not([hidden])', { timeout: 3000 });
  check(true, 'talking to a villager opens a dialogue');
  for (let i = 0; i < 6 && !(await p.locator('#dialog [data-choice]').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(200); }
  await p.click('#dialog [data-choice="0"]');
  await p.waitForSelector('#screen-activity[data-active]', { timeout: 3000 });
  check(await p.locator('.learn').count() === 1, 'the quest opens Hudhud\'s lesson');
  check(await perfectLesson(p), 'lesson played to the end');
  check((await p.locator('.rstar.is-on').count()) === 3, 'perfect play earns 3 stars');
  await p.click('[data-result=map]');
  await p.waitForSelector('#screen-island[data-active]', { timeout: 3000 });
  await p.waitForSelector('#dialog:not([hidden])', { timeout: 3000 });
  for (let i = 0; i < 6 && await p.isVisible('#dialog'); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  check(await p.isVisible('#item-popup'), 'the villager hands over a golden letter');
  check((await pos()).letters.includes('م'), 'the letter is saved (and opens the gate)');
  await p.click('#item-popup');
  await p.click('#island-leave');
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
  await p.click('.isle[data-region=arabic]');
  await p.waitForSelector('#screen-island[data-active]', { timeout: 6000 });
  check(true, 'the island works offline');
  check(errors.length === 0, `no console errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
}
await browser.close();
server.close();
if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall checks passed');
