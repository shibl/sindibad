// Structural equivalence for every cosmetic combination, without opening a game.
import fs from 'node:fs/promises';
import * as art from '../../../Web/art/art.js';
import { Resvg } from '@resvg/resvg-js';
import { captureMath, mathFiles } from './math-source.ts';
import type { MathCard, MathQuestion } from './math-source.ts';
import type { Asset, Manifest } from './manifest.ts';
const root = new URL('../', import.meta.url);
const manifest: Manifest = JSON.parse(await fs.readFile(new URL('manifest.json', root), 'utf8'));
const catalog = new Map<string, Asset>(manifest.assets.map(a => [a.id, a]));
const canonical = (raw: string) => raw.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, '');
const unwrap = (raw: string) => raw.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const layers = new Map<string, string>();
for (const a of manifest.assets.filter(a => a.id.startsWith('layers/ship/'))) {
  const raw = await fs.readFile(new URL(a.variants.find(v => v.path.endsWith('.svg'))!.path, root), 'utf8');
  layers.set(a.id.split('/').at(-1)!, unwrap(raw).replace(/<defs>[\s\S]*?<\/defs>/, '').replace(/<style>[\s\S]*?<\/style>/, ''));
  if (a.width !== 600 || a.height !== 429) throw new Error(`Layer alignment differs: ${a.id}`);
}
const sails = { original: null, rose: '#f6c3d3', sky: '#c4e6f7', stripes: 'stripes', gold: '#ffe08a' };
const flags = { original: null, green: '#2f8a5f', teal: '#1f9aa0', gold: '#f2c14e' };
const outfits = { original: null, teal: '#1f9aa0', purple: '#7a4ac2', green: '#2f8a5f', navy: '#2c3e7a' };
let count = 0;
for (const hero of ['sindbad', 'yasmina'] as const) for (const [sail, sailValue] of Object.entries(sails))
for (const [flag, flagValue] of Object.entries(flags)) for (const [outfit, outfitValue] of Object.entries(outfits))
for (const hat of ['original', 'flower', 'fez', 'grad', 'crown']) {
  art.setStyle({ sail: sailValue, flag: flagValue, outfit: outfitValue, hat: hat === 'original' ? null : hat });
  const original = canonical(unwrap(art.shipSVG({ crew: [hero] }).trim()));
  const composed = ['rigging', `sail-${sail}`, `flag-${flag}`, `${hero}-${outfit}`, `hudhud-${hat}`, 'hull'].map(id => layers.get(id)).join('');
  if (original !== canonical(composed)) throw new Error(`Cosmetic composition differs: ${hero}/${sail}/${flag}/${outfit}/${hat}`);
  count++;
  if (count === 1000) {
    // Optional inspection artifact outside the repository; this is artwork only.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -6 378 270"><defs>${art.DEFS}</defs>${composed}</svg>`;
    await fs.writeFile('/tmp/sindibad-cosmetics-check.png', new Resvg(svg, { fitTo: { mode: 'width', value: 720 } }).render().asPng());
  }
}
art.setStyle();
const diagrams: Record<string, string[]> = JSON.parse(await fs.readFile(new URL('lesson-diagrams.json', root), 'utf8'));
for (const ids of Object.values(diagrams)) for (const id of ids) if (!catalog.has(id)) throw new Error(`Missing diagram ${id}`);
for (const name of mathFiles) {
  const t = await captureMath(name);
  const original = [...t.learn, ...t.questions].reduce((n, item: Partial<MathCard> & MathQuestion) => n + [...(item.html || item.q || '').matchAll(/<svg\b/g)].length, 0);
  const exported = Object.entries(diagrams).filter(([key]) => key.startsWith(`${t.id}/`)).reduce((n, [,ids]) => n + ids.length, 0);
  if (original !== exported) throw new Error(`Missing source diagrams for ${t.id}`);
}
console.log(`Verified ${count} cosmetic compositions against original SVG geometry and every math lesson diagram.`);
