// Exports original lesson diagrams and composable cosmetic layers.
// Kotlin/Swift consume PNG/SVG files; none of this tooling is in an app.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import * as art from '../../../Web/art/art.js';
import { captureMath, mathFiles, plain } from './math-source.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
manifest.assets = manifest.assets.filter(a => a.collection !== 'learning');
const fonts = (await fs.readdir(path.join(root, 'fonts'))).filter(f => f.endsWith('.ttf')).map(f => path.join(root, 'fonts', f));
const css = await fs.readFile(new URL('../../../Web/style.css', import.meta.url), 'utf8');
// Inline the source visual styles, resolving the small set of CSS variables.
const styles = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(m => /\.(?:viz__|fig-t|helm__|fill__|nl__)/.test(m[1]) && !m[1].includes(':'))
  .map(m => `${m[1]}{${m[2]}}`).join('\n')
  .replace(/var\(--ink-soft\)/g, '#6b4a32').replace(/var\(--ink\)/g, '#3b2414')
  .replace(/var\(--gold\)/g, '#f2c14e').replace(/var\(--subj, var\(--rose\)\)/g, '#d0507e')
  .replace(/var\(--[^)]+\)/g, '#d0507e');

async function asset(id, svg, source, extra = {}) {
  svg = svg.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"')
    .replace(/(<svg[^>]*>)/, `$1<defs>${art.DEFS}</defs><style>${styles}</style>`);
  const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: 600 },
    font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Baloo Bhaijaan 2' } }).render();
  const variants = [];
  for (const [file, data] of [[`svg/${id}.svg`, Buffer.from(svg)], [`runtime/png/${id}.png`, rendered.asPng()]]) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), data);
    variants.push({ path: file, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') });
  }
  manifest.assets.push({ id, type: 'illustration', collection: 'learning', source,
    sourceSha256: crypto.createHash('sha256').update(await fs.readFile(path.resolve(root, '../..', source))).digest('hex'),
    width: rendered.width, height: rendered.height, variants, ...extra });
}

const diagrams = {};
for (const name of mathFiles) {
  const topic = await captureMath(name);
  for (const [section, items] of [['card', topic.learn], ['question', topic.questions]]) {
    for (const [index, item] of items.entries()) {
      const ids = [];
      for (const [i, match] of [...(item.html || item.q || '').matchAll(/<svg\b[\s\S]*?<\/svg>/g)].entries()) {
        const id = `lessons/${topic.id}/${section}-${index}-${i}`;
        await asset(id, match[0], `Web/plugins/math/${name}.js`,
          { description: plain(item.title || item.q), limitations: ['Labels are baked into the image; native text provides the accessible description.'] });
        ids.push(id);
      }
      if (ids.length) diagrams[`${topic.id}/${section}-${index}`] = ids;
    }
  }
}

// Capture a pure SVG emitted by an engine without mounting it. The first SVG
// ends execution before DOM event binding, timers, audio, or gameplay can run.
async function engineSvg(engine, item) {
  const source = await fs.readFile(new URL(`../../../Web/plugins/engines/${engine}.js`, import.meta.url), 'utf8');
  let captured;
  const stop = {};
  const context = vm.createContext({
    runRounds: options => options.renderRound(item, {}, { classList: { add() {} }, append() {} }),
    draw: (_, items) => items, TEST: false,
    frac: (n, d) => `${n}/${d}`,
    h: html => {
      const svg = html.match(/<svg\b[\s\S]*?<\/svg>/)?.[0];
      if (svg) { captured = svg; throw stop; }
      return {};
    },
  });
  vm.runInContext(source.replace(/^import .*;\s*$/gm, '').replace(/\bexport /g, '') +
    `;globalThis.render=${engine}({items:[{}]});`, context);
  try { context.render({}, () => {}, { num: n => String(n).replace(/-/g, '−') }); }
  catch (e) { if (e !== stop) throw e; }
  if (!captured) throw new Error(`No SVG captured from ${engine}`);
  return captured;
}
const lineSpecs = new Map();
for (const name of ['fractions-line', 'decimals', 'integers']) {
  for (const q of (await captureMath(name)).questions) {
    const key = `${q.min}_${q.max}_${q.ticks}`;
    if (!lineSpecs.has(key)) lineSpecs.set(key, q);
  }
}
for (const [key, q] of lineSpecs) {
  let raw = await engineSvg('numberline', q);
  const boat = raw.match(/<g class="nl__boat"[\s\S]*?<\/g>\s*<\/g>/)?.[0];
  if (!boat) throw new Error('Number-line boat changed');
  raw = raw.replace(boat, '');
  await asset(`controls/line/${key}`, raw, 'Web/plugins/engines/numberline.ts');
}
for (let degrees = 0; degrees <= 180; degrees += 5) {
  const radians = degrees * Math.PI / 180, x = 200 + Math.cos(radians) * 186, y = 206 - Math.sin(radians) * 186;
  let raw = await engineSvg('helm', { angle: degrees });
  raw = raw.replace('0 24 400 206', '0 0 400 250');
  raw = raw.replace('<line x1="200" y1="206" class="helm__course"/>', `<line x1="200" y1="206" x2="${x}" y2="${y}" class="helm__course"/>`)
    .replace('<g class="helm__ship">', `<g class="helm__ship" transform="translate(${200 + Math.cos(radians) * 36} ${206 - Math.sin(radians) * 36}) rotate(${-degrees})">`);
  await asset(`controls/helm/${degrees}`, raw, 'Web/plugins/engines/helm.ts');
}
const parts = new Set((await captureMath('equivalent')).questions.map(q => q.parts));
for (const n of parts) for (let level = 0; level <= n; level++) {
  let raw = await engineSvg('fill', { parts: n, answer: 0, q: '' });
  raw = raw.replace('0 0 352 262', '-8 -8 380 280');
  raw = raw.replace('<g class="fill__water">', `<g class="fill__water" transform="translate(0 ${-level * 226 / n})">`);
  await asset(`controls/fill/${n}-${level}`, raw, 'Web/plugins/engines/fill.ts');
}

// The ship has painter-ordered authoring sections. Export them on one identical
// padded canvas so every combination can be composed without redrawing anything.
const wrapShip = body => `<svg viewBox="-4 -6 378 270">${body}</svg>`;
const ship = () => art.shipSVG({ crew: ['sindbad'], hudhud: true });
const section = (raw, start, end) => {
  const a = raw.indexOf(start), b = raw.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`Authoring section changed: ${start}`);
  return raw.slice(a + start.length, b);
};
art.setStyle();
await asset('layers/ship/rigging', wrapShip(section(ship(), '<!-- rigging -->', '<!-- lateen sail -->')), 'Web/art/art.js');
await asset('layers/ship/hull', wrapShip(section(ship(), '<!-- hull -->', '</svg>')), 'Web/art/art.js');
const sails = { original: null, rose: '#f6c3d3', sky: '#c4e6f7', stripes: 'stripes', gold: '#ffe08a' };
const flags = { original: null, green: '#2f8a5f', teal: '#1f9aa0', gold: '#f2c14e' };
const outfits = { original: null, teal: '#1f9aa0', purple: '#7a4ac2', green: '#2f8a5f', navy: '#2c3e7a' };
for (const [key, value] of Object.entries(sails)) {
  art.setStyle({ sail: value });
  await asset(`layers/ship/sail-${key}`, wrapShip(section(ship(), '<!-- lateen sail -->', '<g class="flag">')), 'Web/art/art.js');
}
for (const [key, value] of Object.entries(flags)) {
  art.setStyle({ flag: value });
  await asset(`layers/ship/flag-${key}`, wrapShip('<g class="flag">' + section(ship(), '<g class="flag">', '<!-- crew -->')), 'Web/art/art.js');
}
for (const hero of ['sindbad', 'yasmina']) for (const [key, value] of Object.entries(outfits)) {
  art.setStyle({ outfit: value });
  const raw = art.shipSVG({ crew: [hero], hudhud: false });
  await asset(`layers/ship/${hero}-${key}`, wrapShip(section(raw, '<!-- crew -->', '<!-- hull -->')), 'Web/art/art.js');
  await asset(`cosmetics/${hero}/${key}`, art.heroSVG(hero), 'Web/art/art.js');
}
for (const hat of ['original', 'flower', 'fez', 'grad', 'crown']) {
  art.setStyle({ hat: hat === 'original' ? null : hat });
  const raw = art.shipSVG({ crew: [], hudhud: true });
  await asset(`layers/ship/hudhud-${hat}`, wrapShip(section(raw, '<!-- crew -->', '<!-- hull -->')), 'Web/art/art.js');
  // The crown/graduation hat extends above the original SVG.
  await asset(`cosmetics/hudhud/${hat}`, art.hudhudSVG().replace('0 0 160 140', '-8 -20 176 166'), 'Web/art/art.js');
}
art.setStyle();

// Isolate only the pure original guardian factory; do not import battle runtime.
const battle = await fs.readFile(new URL('../../../Web/core/battle.js', import.meta.url), 'utf8');
const pure = battle.slice(battle.indexOf('export const GUARDIANS'), battle.indexOf('const HP ='))
  .replace(/\bexport /g, '');
const context = vm.createContext({});
vm.runInContext(pure + ';globalThis.output={GUARDIANS,guardianSVG};', context);
for (const [name, guardian] of Object.entries(context.output.GUARDIANS)) {
  for (const mood of ['ok', 'hit', 'happy']) {
    await asset(`guardians/${name}/${mood}`, context.output.guardianSVG(guardian, mood), 'Web/core/battle.ts');
  }
}
await fs.writeFile(path.join(root, 'lesson-diagrams.json'), JSON.stringify(diagrams, null, 2) + '\n');
await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Exported ${manifest.assets.filter(a => a.collection === 'learning').length} shared diagrams, cosmetic layers and guardian poses.`);
