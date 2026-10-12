// End-to-end test in a headless browser (Playwright + Chromium):
//   title → hero select → map → go ashore on the Arabic island → walk →
//   talk to the calligrapher → his quest's lesson, played perfectly → a
//   golden letter → back to sea: the fog lifts → reload keeps progress →
//   the app (and the island) still load with the network off → no errors. Runs at phone and tablet sizes.
//   Then: every island map is walkable, and the newer kinds of play (steer,
//   pay, fill, build) can be played to three stars and fit a phone screen.
//   The farm island (3D): choose a helper, play the potato quest to three
//   stars, sell to the ship, keep it all after a reload, and play offline.
//   The music island (3D): its quests are well formed, the piano lesson and
//   the rhythm lesson (with the drum) play to the end, golden notes, reload,
//   offline.
//   The 3D sea map (a staging preview): fog, labels, the flat/3D button,
//   sailing ashore, the fog lifting, offline; the live game keeps the flat map.
//   A new version shows up by itself for players who already have the game,
//   and the game falls silent in another tab.
//   And the staging copy (under /staging/) keeps its own saves and offline copy.
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

let nextVersion = null;
const server = createServer(async (req, res) => {
  // /staging/… serves the same files, like the staging copy on the website.
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '').replace(/^staging[/\\]/, '');
  const file = path || 'index.html';
  try {
    let body = await readFile(join(ROOT, file));
    // Tests can publish a "new version": same files, another version number.
    if (file === 'service-worker.js' && nextVersion) body = String(body).replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${nextVersion}';`);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const URL_ = `http://localhost:${server.address().port}/`;

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures += 1; };

async function perfectLesson(p) {
  for (let step = 0; step < 800; step++) {   // the helm can take ~36 small turns a question
    if (await p.isVisible('#result:not([hidden])')) return true;
    if (await p.locator('[data-learn=next]').count()) { await p.click('[data-learn=next]'); continue; }
    const ok = p.locator('#activity .round:not(.is-solved) button[data-ok]');
    if (await ok.count()) { await ok.first().click(); await p.waitForTimeout(1250); continue; }
    // Engines played in several taps (turn the helm, add a coin…) mark each step.
    const st = p.locator('#activity .round:not(.is-solved) [data-step]');
    if (await st.count()) { await st.first().click(); await p.waitForTimeout(30); continue; }
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
  check(await p.isVisible('#screen-chapters'), 'story skipped → the voyages chart');
  check(await p.locator('.voyage').count() === 12 && await p.locator('.voyage--locked').count() === 11, '12 voyages (one per grade); only grade 6 is open');
  await p.click('.voyage[data-grade="3"]');
  check(await p.isVisible('.chart__note:not([hidden])') && await p.isVisible('#screen-chapters'), 'a locked voyage says "coming soon" and stays put');
  await p.click('.voyage--open');
  await p.waitForSelector('#screen-map[data-active]', { timeout: 5000 });
  check(true, 'voyage 6 → the grade-6 sea map');
  await p.click('.map-voyages');
  await p.waitForSelector('#screen-chapters[data-active]', { timeout: 5000 });
  await p.click('.voyage--open');
  await p.waitForSelector('#screen-map[data-active]', { timeout: 5000 });
  check(true, 'the sea map leads back up to the voyages chart');
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
  await p.click('.voyage--open');
  await p.waitForSelector('#screen-map[data-active]', { timeout: 5000 });
  check(await p.locator('.isle').count() === (await import('../worlds/grade6.js')).default.regions.length + 1, 'map works offline');
  await p.click('.isle[data-region=arabic]');
  await p.waitForSelector('#screen-island[data-active]', { timeout: 6000 });
  check(true, 'the island works offline');
  check(errors.length === 0, `no console errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
}

// Every island's map: a closed gate really keeps the hero out, and there is
// no area the hero can only reach by squeezing through a gap barely wider
// than itself (it gets stuck there). Explores every spot the hero can stand
// on a fine grid, with the engine's own collision.
{
  console.log('— island maps');
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await ctx.addInitScript(() => { window.__SINDBAD_TEST__ = true; });
  const p = await ctx.newPage();
  await p.goto(URL_);
  await p.click('text=ابدأ الرحلة');
  await p.fill('#child-name', 'سارة');
  await p.click('#who-form [type=submit]');
  await p.waitForSelector('#screen-select[data-active]', { timeout: 5000 });
  await p.click('[data-hero=sindbad]');
  await p.click('#select-go');
  await p.click('[data-st=skip]');
  await p.click('.voyage--open');
  await p.waitForSelector('#screen-map[data-active]', { timeout: 5000 });
  await p.click('.isle[data-region=arabic]');
  await p.waitForSelector('#screen-island[data-active]', { timeout: 6000 });
  const maps = await p.evaluate(async () => {
    const STEP = 0.05;  // grid spacing, in tiles
    const PAD = 0.1;    // a gap must leave this much room on each side
    const SMALL = 0.1;  // squeeze-only nooks up to this area (tiles²) can't trap anyone
    const { enterIsland, debugFits } = await import('/core/overworld.js');
    const world = (await import('/worlds/grade6.js')).default;
    const out = [];
    for (const { id } of world.regions.filter(r => !r.kind)) {
      const def = (await import(`/worlds/grade6/${id}.js`)).default;
      enterIsland(def, world.regions.find(r => r.id === id));
      const nx = Math.round(def.tiles[0].length / STEP), ny = Math.round(def.tiles.length / STEP);
      const cell = (x, y) => Math.floor(y / STEP) * nx + Math.floor(x / STEP);
      const free = pad => Uint8Array.from({ length: nx * ny }, (_, k) => debugFits((k % nx + 0.5) * STEP, (Math.floor(k / nx) + 0.5) * STEP, pad));
      const reach = (ok, from) => {
        const seen = new Uint8Array(nx * ny), todo = ok[from] ? [from] : [];
        if (todo.length) seen[from] = 1;
        while (todo.length) {
          const k = todo.pop(), i = k % nx;
          for (const n of [i > 0 && k - 1, i < nx - 1 && k + 1, k - nx, k + nx]) if (n !== false && ok[n] && !seen[n]) { seen[n] = 1; todo.push(n); }
        }
        return seen;
      };
      const roomy = free(PAD), anywhere = reach(free(0), cell(...def.spawn)), comfortably = reach(roomy, cell(...def.spawn));
      const gates = def.objects.filter(o => o.kind === 'gate')
        .map(o => ({ at: o.at.join(','), passable: !!anywhere[cell(o.at[0], o.at[1] - o.block[1] - 0.6)] }));
      let squeezed = 0, near = null;
      for (let k = 0; k < nx * ny; k++) if (anywhere[k] && roomy[k] && !comfortably[k]) { squeezed += 1; near ??= `${((k % nx) * STEP).toFixed(1)},${(Math.floor(k / nx) * STEP).toFixed(1)}`; }
      out.push({ id, gates, squeezedArea: squeezed * STEP * STEP, near, small: SMALL });
    }
    return out;
  });
  for (const m of maps) {
    for (const g of m.gates) check(!g.passable, `${m.id}: the closed gate at ${g.at} keeps the hero out`);
    check(m.squeezedArea <= m.small, `${m.id}: nowhere the hero can only squeeze into${m.squeezedArea > m.small ? ` (${m.squeezedArea.toFixed(2)} tiles², e.g. near ${m.near})` : ''}`);
  }
  await ctx.close();
}
// The newer kinds of play: every answer can be reached with the controls the
// engine offers, each lesson can be played to three stars, and the first
// round fits a phone screen without scrolling.
{
  console.log('— new kinds of play');
  const { ITEMS: ANGLES } = await import('../plugins/math/angles.js');
  const { ITEMS: MARKET } = await import('../plugins/math/market.js');
  const { ITEMS: FILL } = await import('../plugins/math/equivalent.js');
  const { ITEMS: BUILD } = await import('../plugins/arabic/build.js');
  const { change } = await import('../plugins/engines/market.js');
  const on5 = a => Number.isInteger(a / 5) && a >= 0 && a <= 180;
  check(ANGLES.every(it => (it.range ? on5(it.show) && it.show >= it.range[0] && it.show <= it.range[1] : on5(it.angle))), 'angles: every answer is on the helm (0–180, steps of 5)');
  check(MARKET.every(it => it.target > 0 && change(it.target, [100, 50, 20, 10, 5, 1])), 'market: every price can be paid exactly');
  check(FILL.every(it => Number.isInteger(it.answer) && it.answer > 0 && it.answer <= it.parts), 'equivalent fractions: every answer fits its bucket');
  check(BUILD.every(it => it.words.length === it.slots.length && it.extra.every(x => !it.words.includes(x))), 'build: one slot per word, look-alikes differ from the words');

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { window.__SINDBAD_TEST__ = true; });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL_);
  await p.click('text=ابدأ الرحلة');
  await p.fill('#child-name', 'سارة');
  await p.click('#who-form [type=submit]');
  await p.waitForSelector('#screen-select[data-active]', { timeout: 5000 });
  await p.click('[data-hero=yasmina]');
  await p.click('#select-go');
  await p.click('[data-st=skip]');
  for (const id of ['math-angles', 'math-market', 'math-equivalent', 'arabic-build', 'farm-cow', 'farm-cheese']) {
    await p.evaluate(id => import('/core/lesson.js').then(m => m.startLesson(id)), id);
    await p.waitForSelector('#screen-activity[data-active]', { timeout: 5000 });
    while (await p.locator('[data-learn=next]').count()) await p.click('[data-learn=next]');
    await p.waitForSelector('#activity .round', { timeout: 5000 });
    await p.waitForTimeout(500);
    const fits = await p.evaluate(() => { const a = document.getElementById('activity'); return a.scrollHeight <= a.clientHeight + 2; });
    check(fits, `${id}: the first round fits a phone screen`);
    const played = await perfectLesson(p);
    check(played && (await p.locator('.rstar.is-on').count()) === 3, `${id}: played perfectly → 3 stars`);
    await p.click('[data-result=map]');
  }
  check(errors.length === 0, `no console errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
}

// The farm island: a 3D farm where the agriculture book is played.
{
  console.log('— farm island');
  const { CROPS, TASKS, QUESTS } = await import('../worlds/grade6/farm.js');
  const tools = Object.keys((await import('../worlds/grade6/farm.js')).TOOLS);
  const all = [...Object.values(CROPS), ...Object.values(TASKS)];
  check(all.every(d => d.steps.every(st => [].concat(st.do).every(t => tools.includes(t) && d.tools.includes(t)))), 'farm: every step\'s job is in its tool tray');
  check(all.every(d => d.steps.every(st => !st.pick || (st.pick.type === 'dial' ? st.pick.target >= st.pick.min && st.pick.target <= st.pick.max : st.pick.type === 'order' || st.pick.type === 'oneEach' || st.pick.options.some(o => o.ok)))), 'farm: every choice has a right answer');
  check(QUESTS.every(q => (q.crop ? CROPS[q.crop] : TASKS[q.task])), 'farm: every quest has its crop or task');

  // The farm needs WebGL. On a machine without a graphics card (like the
  // test server) Chromium may draw it in software only if allowed to.
  const gl = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await gl.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { window.__SINDBAD_TEST__ = true; });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL_);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.click('text=ابدأ الرحلة');
  await p.fill('#child-name', 'سارة');
  await p.click('#who-form [type=submit]');
  await p.waitForSelector('#screen-select[data-active]', { timeout: 5000 });
  await p.click('[data-hero=yasmina]');
  await p.click('#select-go');
  await p.click('[data-st=skip]');
  await p.click('.voyage--open');
  await p.waitForSelector('#screen-map[data-active]', { timeout: 5000 });
  check(await p.locator('.isle[data-region=farm]:not(.isle--locked)').count() === 1, 'the farm island is open from the start');
  await p.click('.isle[data-region=farm]');
  await p.waitForSelector('#screen-farm[data-active]', { timeout: 20000 });
  check(await p.locator('#farm-stage canvas').count() === 1, 'sailing to the farm opens the 3D farm');
  await p.waitForSelector('#farm-modal [data-helper]', { timeout: 10000 });
  check(await p.locator('#farm-modal [data-helper]').count() === 4, 'four helpers to choose from');
  await p.click('#farm-modal [data-helper][data-ok]');
  const farm = () => p.evaluate(() => window.__farm());
  check((await farm()).F.helper === 'kitty', 'the chosen helper is saved');
  const place = id => p.locator(`#farm-places [data-place="${id}"]`).dispatchEvent('click');
  await place((await farm()).place);
  await p.waitForSelector('#farm-tray:not([hidden]) [data-tool]', { timeout: 5000 });
  await p.click('#farm-tray [data-tool=harvest]');
  let s = await farm();
  const plot = s.F.plots.find(x => x.run);
  check(plot?.run.step === 0 && (await p.textContent('#farm-say .bubble')).length > 10, 'a wrong job: the helper explains, the field waits');
  const fits = await p.evaluate(() => {
    const b = document.querySelector('#farm-say .bubble').getBoundingClientRect(), t = document.getElementById('farm-tray').getBoundingClientRect();
    return b.bottom <= t.top + 1 && t.bottom <= innerHeight + 1;
  });
  check(fits, 'the tool tray and the helper\'s words fit a phone screen');
  // Play on: the right job, the right choice. One wrong job was made, so two stars.
  let done = false;
  for (let i = 0; i < 300 && !done; i++) {
    if (await p.isVisible('#farm-modal .fm-done')) { done = true; break; }
    const ok = p.locator('#farm-pick:not([hidden]) [data-ok], #farm-pick:not([hidden]) [data-step]');
    if (await ok.count()) { await ok.first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(60); continue; }
    const tool = p.locator('#farm-tray:not([hidden]):not(.is-busy) [data-tool][data-ok]');
    if (await tool.count()) { await tool.first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(80); continue; }
    await p.waitForTimeout(120);
  }
  check(done, 'the potato quest can be played to the end');
  const stars = await p.evaluate(() => JSON.parse(localStorage.getItem('sindbad.save.v1')).topics['farm-potato']?.stars);
  check(stars === 2, `one wrong job, then all right: 2 stars (got ${stars})`);
  await p.click('#farm-modal [data-close]');
  s = await farm();
  check(s.quest === 'tomato' && s.F.inv.potato >= 6, 'harvest in the barn; the next quest opens');
  await p.click('[data-bar=orders]');
  const before = s.F.coins;
  await p.click('#farm-modal [data-deliver]:not([disabled])');
  s = await farm();
  check(s.F.coins > before && s.F.inv.potato < 6, 'an order sold by ship earns coins');
  await p.reload();
  await p.waitForTimeout(500);
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('sindbad.save.v1')).world.farm);
  check(kept.helper === 'kitty' && kept.quest === 1, 'the farm survives a reload');
  await ctx.setOffline(true);
  await p.reload();
  await p.waitForTimeout(600);
  await p.click('#screen-title [data-go]');
  await p.click('.voyage--open');
  await p.waitForSelector('#screen-map[data-active]', { timeout: 5000 });
  await p.click('.isle[data-region=farm]');
  await p.waitForSelector('#screen-farm[data-active]', { timeout: 20000 });
  check(await p.locator('#farm-stage canvas').count() === 1 && !(await p.isVisible('#farm-modal [data-helper]')), 'the farm works offline, with its helper');
  check(errors.length === 0, `no console errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
  await gl.close();
}

// The music island: a 3D toy island where the music book is played.
{
  console.log('— music island');
  const { QUESTS, STATIONS, GLASSES, reviewOf } = await import('../worlds/grade6/tunes.js');
  const glassIds = GLASSES.map(g => g.id);
  const piano = n => /^(C|C#|D|D#|E|F|F#|G|G#|A|A#|B)4$|^C5$/.test(n);
  const okStep = s => ({
    learn: () => !!s.title && !!s.html,
    choice: () => s.options.length >= 2 && new Set(s.options).size === s.options.length && (!s.art || s.art.length === s.options.length),
    keys: () => s.play.length > 0 && s.play.every(piano),
    gaps: () => true, pattern: () => true,
    staff: () => s.drops.every(([n]) => /^[A-G][2-5]$/.test(n)),
    name: () => /^[A-G][2-5]$/.test(s.note) && s.options.length >= 2,
    order: () => s.items.length >= 3 && new Set(s.items).size === s.items.length && (!s.sound || s.sound.length === s.items.length),
    rhythm: () => !s.others.includes(s.pattern), drum: () => !!s.pattern,
    measure: () => s.given.reduce((b, t) => b + ({ w: 4, h: 2 }[t] || 1), 0) < s.beats,
    sort: () => s.items.every(([, b]) => s.bins.some(x => x.id === b)),
    fill: () => glassIds.includes(s.glass) && s.n > 0 && s.n <= s.d,
    glasses: () => s.play.every(g => glassIds.includes(g)),
  }[s.kind]?.() && (s.kind === 'learn' || !!s.hint));
  check(QUESTS.every(q => STATIONS[q.station] && q.steps.every(okStep)), 'music: every step is well formed (notes on the piano, a right answer, a hint)');
  check(QUESTS.every(q => reviewOf(q.id).length >= 6) && new Set(QUESTS.map(q => q.topic)).size === QUESTS.length, 'music: every quest has a review quiz of 6+ questions');

  const gl = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await gl.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { window.__SINDBAD_TEST__ = true; });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL_);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.click('text=ابدأ الرحلة');
  await p.fill('#child-name', 'سارة');
  await p.click('#who-form [type=submit]');
  await p.waitForSelector('#screen-select[data-active]', { timeout: 5000 });
  await p.click('[data-hero=yasmina]');
  await p.click('#select-go');
  await p.click('[data-st=skip]');
  await p.click('.voyage--open');
  await p.waitForSelector('#screen-map[data-active]', { timeout: 5000 });
  check(await p.locator('.isle[data-region=music]:not(.isle--locked)').count() === 1, 'the music island is open from the start');
  await p.click('.isle[data-region=music]');
  await p.waitForSelector('#screen-tunes[data-active]', { timeout: 20000 });
  check(await p.locator('#tunes-stage canvas').count() === 1, 'sailing there opens the 3D music island');
  await p.waitForTimeout(800);
  const tunes = () => p.evaluate(() => window.__tunes());
  let s = await tunes();
  check(s.places.length === 8 && s.next === 'scale' && (await p.textContent('#tunes-say .bubble')).includes('نغمة'), 'eight places; the helper «نغمة» says hello; the piano lesson comes first');
  check(await p.locator('.tn-tag:not([hidden])').count() >= 2, 'name tags float over the places');
  await p.locator('#tunes-places [data-place=piano]').dispatchEvent('click');
  check(await p.locator('#tunes-modal [data-start]').count() === 2, 'the giant piano holds two lessons');
  await p.click('#tunes-modal [data-start="scale"]');
  await p.waitForSelector('#tunes-panel:not([hidden]) .tn-step', { timeout: 5000 });
  await p.click('#tunes-panel [data-next]');
  // A wrong key: the helper explains, the step waits.
  await p.click('#tunes-panel .tn-key[data-note="G4"]');
  s = await tunes();
  check(s.step === 1 && (await p.textContent('#tunes-say .bubble')).includes('ابدأ من دو'), 'a wrong key: the helper gives a hint, the step waits');
  const fits = await p.evaluate(() => { const r = document.querySelector('.tn-sheet').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; });
  check(fits, 'the lesson card fits a phone screen');
  const play = async () => {
    for (let guard = 0; guard < 400; guard++) {
      if (await p.isVisible('#tunes-modal .fm-done')) return true;
      const next = p.locator('#tunes-panel [data-next]');
      if (await next.count()) { await next.first().click(); continue; }
      const turn = p.locator('#tunes-panel [data-turn]:not([disabled])');
      if (await turn.count() && await p.locator('#tunes-panel .tn-drum[disabled]').count()) { await turn.click(); await p.waitForTimeout(100); continue; }
      const drum = p.locator('#tunes-panel .tn-drum:not([disabled])');
      if (await drum.count()) { const n = +(await drum.getAttribute('data-taps')); for (let i = 0; i < n; i++) { await drum.click(); await p.waitForTimeout(70); } await p.waitForTimeout(150); continue; }
      const ok = p.locator('#tunes-panel [data-ok]');
      if (await ok.count()) { await ok.first().click(); continue; }
      await p.waitForTimeout(80);
    }
    return false;
  };
  check(await play(), 'the scale lesson can be played to the end');
  const stars = id => p.evaluate(t => JSON.parse(localStorage.getItem('sindbad.save.v1')).topics[t]?.stars, id);
  check(await stars('music-scale') === 2, `one wrong key, then all right: 2 stars (got ${await stars('music-scale')})`);
  await p.click('#tunes-modal [data-close]');
  s = await tunes();
  check(s.T.done.scale && s.next === 'stage' && (await p.textContent('#tunes-notes')) === '1', 'a golden note for the rainbow gate; the theatre is next');
  // The drum circle: hear a rhythm, pick its card, tap it back on the drum.
  await p.evaluate(() => window.__tunesDo('debugStart', 'rhythm'));
  await p.waitForSelector('#tunes-panel:not([hidden]) .tn-step', { timeout: 5000 });
  check(await play() && await stars('music-rhythm') === 3, 'the rhythm lesson (cards, the drum, measures) played perfectly: 3 stars');
  await p.click('#tunes-modal [data-close]');
  await p.reload();
  await p.waitForTimeout(500);
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('sindbad.save.v1')).world.tunes);
  check(kept.done.scale && kept.done.rhythm, 'the island survives a reload');
  await ctx.setOffline(true);
  await p.reload();
  await p.waitForTimeout(600);
  await p.click('#screen-title [data-go]');
  await p.click('.voyage--open');
  await p.waitForSelector('#screen-map[data-active]', { timeout: 5000 });
  await p.click('.isle[data-region=music]');
  await p.waitForSelector('#screen-tunes[data-active]', { timeout: 20000 });
  check(await p.locator('#tunes-stage canvas').count() === 1 && (await p.textContent('#tunes-notes')) === '2', 'the music island works offline, with its golden notes');
  check(errors.length === 0, `no console errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
  await gl.close();
}

// The 3D sea map: a preview on the staging copy (?map=3d shows it here too).
// The live game keeps the flat map.
{
  console.log('— 3D sea map');
  const gl = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await gl.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { window.__SINDBAD_TEST__ = true; });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push(e.message));
  const toMap = async () => {
    await p.click('#screen-title [data-go]');
    await p.click('.voyage--open');
    await p.waitForSelector('#screen-map[data-active]', { timeout: 5000 });
    await p.waitForSelector('#map .sea-canvas', { timeout: 15000 });
    await p.waitForTimeout(600);
  };
  await p.goto(`${URL_}?map=3d`);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.click('text=ابدأ الرحلة');
  await p.fill('#child-name', 'سارة');
  await p.click('#who-form [type=submit]');
  await p.waitForSelector('#screen-select[data-active]', { timeout: 5000 });
  await p.click('[data-hero=sindbad]');
  await p.click('#select-go');
  await p.click('[data-st=skip]');
  await p.click('.voyage--open');
  await p.waitForSelector('#screen-map[data-active]', { timeout: 5000 });
  await p.waitForSelector('#map .sea-canvas', { timeout: 15000 });
  await p.waitForTimeout(600);
  const sea = () => p.evaluate(() => window.__sea());
  let s = await sea();
  check(s?.fog.length === 4 && s.next === 'arabic', 'the 3D sea: fog over the four locked islands, the letters island first');
  const boxes = await p.evaluate(() => {
    const m = document.getElementById('map').getBoundingClientRect();
    return [...document.querySelectorAll('#map .isle')].map(b => { const r = b.getBoundingClientRect(); return r.width > 40 && r.left >= m.left - 1 && r.right <= m.right + 1 && r.top >= m.top - 1 && r.bottom <= m.bottom + 1; });
  });
  const ISLES = (await import('../worlds/grade6.js')).default.regions.length + 1;
  check(boxes.length === ISLES && boxes.every(Boolean), 'every island has its label and tap area on screen');
  await p.click('#map-view');
  check(await p.locator('#map .sea-canvas').count() === 0 && await p.locator('#map .isle__art').count() === ISLES, 'the button switches to the flat map…');
  await p.click('#map-view');
  await p.waitForSelector('#map .sea-canvas', { timeout: 5000 });
  check(await p.locator('#map .isle__art').count() === 0, '…and back to the 3D sea');
  await p.click('.isle[data-region=math]');
  await p.waitForTimeout(400);
  check(await p.isVisible('#map-toast') && (await sea()).at === 'home', 'a foggy island explains how to open it; the ship stays');
  await p.click('.isle[data-region=arabic]');
  await p.waitForSelector('#screen-island[data-active]', { timeout: 10000 });
  check(true, 'tapping an island sails there and goes ashore');
  await p.click('#island-leave');
  await p.waitForSelector('#map .sea-canvas', { timeout: 10000 });
  check((await sea()).at === 'arabic', 'back at sea, the ship waits by the letters island');
  // Stars on the letters island: the fog lifts from the numbers island.
  await p.evaluate(async () => {
    const { save } = await import('./core/save.js');
    const { topicsIn } = await import('./core/topics.js');
    save.update(v => { v.topics[topicsIn('arabic')[0].id] = { stars: 3, best: 1, plays: 1 }; });
  });
  await p.click('.map-voyages');
  await p.click('.voyage--open');
  await p.waitForTimeout(4500);
  s = await sea();
  check(!s.fog.includes('math') && await p.locator('.isle[data-region=math]:not(.isle--locked)').count() === 1, 'stars earned: the fog lifts from the numbers island');
  await ctx.setOffline(true);
  await p.reload();
  await p.waitForTimeout(600);
  await toMap();
  check((await sea())?.fog.length === 3, 'the 3D sea works offline and remembers the open islands');
  await ctx.setOffline(false);
  await p.goto(URL_);
  await p.waitForTimeout(600);
  await p.click('#screen-title [data-go]');
  await p.click('.voyage--open');
  await p.waitForSelector('#screen-map[data-active]', { timeout: 5000 });
  await p.waitForTimeout(1200);
  check(await p.locator('#map .sea-canvas').count() === 0 && await p.isHidden('#map-view'), 'the live game keeps the flat map (no 3D button)');
  check(errors.length === 0, `no console errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
  await gl.close();
}

// A new version reaches players who already have the game: it shows up by
// itself (a reload between activities), not only after closing the tab.
// And the game falls silent in the background.
console.log('— updates and background');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL_);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload();
  await p.waitForFunction(() => !!navigator.serviceWorker.controller);
  const oldCaches = await p.evaluate(() => caches.keys());
  nextVersion = 'next-version';   // the website now has a new version
  await p.evaluate(() => { window.__before = true; });
  const reloaded = p.waitForEvent('load', { timeout: 15000 }).then(() => true, () => false);
  await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
  check(await reloaded && !(await p.evaluate(() => window.__before)), 'a new version reloads the title screen by itself');
  const now = await p.evaluate(() => caches.keys());
  check(now.length === 1 && now[0].endsWith('next-version') && !oldCaches.includes(now[0]), 'the old offline copy is replaced by the new one');
  nextVersion = null;

  // Background: pretend the child switched to another tab.
  await p.click('text=ابدأ الرحلة');   // a tap allows sound
  const state = () => p.evaluate(() => import('/core/sound.js').then(m => m.ac()?.state));
  const setHidden = h => p.evaluate(h => { Object.defineProperty(document, 'hidden', { value: h, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  await p.waitForTimeout(300);
  check(await state() === 'running', 'sound plays while the game is in front');
  await setHidden(true);
  await p.waitForTimeout(600);   // the music keeps ticking in the background
  check(await state() === 'suspended', 'switching tabs silences the game');
  await setHidden(false);
  await p.waitForTimeout(300);
  check(await state() === 'running', 'coming back brings the sound back');
  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
}

// The staging copy shares the website with the live game, under /staging/.
console.log('— staging copy');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  const stored = () => p.evaluate(async () => ({ keys: Object.keys(localStorage), caches: await caches.keys() }));

  await p.goto(`${URL_}staging/`);
  await p.evaluate(() => navigator.serviceWorker.ready);
  check(await p.evaluate(() => document.documentElement.dataset.env) === 'staging', 'staging wears its ribbon');
  await p.click('text=ابدأ الرحلة');
  await p.fill('#child-name', 'سارة');
  await p.click('#who-form [type=submit]');
  await p.waitForSelector('#screen-select[data-active]', { timeout: 5000 });
  let s = await stored();
  check(s.keys.length > 0 && s.keys.every(k => k.startsWith('sindbad-staging.')), 'staging keeps its own saves');
  check(s.caches.length === 1 && s.caches[0].startsWith('sindbad-staging-'), 'staging keeps its own offline copy');

  await p.goto(URL_);
  await p.evaluate(() => navigator.serviceWorker.ready);
  check(await p.evaluate(() => !document.documentElement.dataset.env), 'the live game has no ribbon');
  await p.click('text=ابدأ الرحلة');
  check(await p.isVisible('#child-name'), 'the live game doesn\'t see the child saved in staging');
  s = await stored();
  check(s.caches.some(k => k.startsWith('sindbad-web-')) && s.caches.some(k => k.startsWith('sindbad-staging-')), 'the live and staging offline copies stay side by side');
  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
}

await browser.close();
server.close();
if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall checks passed');
