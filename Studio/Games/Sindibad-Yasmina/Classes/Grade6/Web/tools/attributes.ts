// Writes the repository's root .gitattributes so GitHub's language bar counts
// handwritten code only: each game .js made from a .ts (tools/build.ts) is
// marked linguist-generated, vendored libraries linguist-vendored, and the
// retired Grade 10 Chemistry prototype is left out of the statistics.
// Patterns cannot test for a sibling .ts, so the generated files are listed
// one by one. `npm run build` runs this; tests/check-build.ts fails if the
// file on disk differs.   node tools/attributes.ts

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { gameSources } from './build.ts';

// Web/ is Studio/Games/Sindibad-Yasmina/Classes/Grade6/Web; the repository root is seven levels up from tools/.
export const ATTRIBUTES_PATH = fileURLToPath(new URL('../../../../../../../.gitattributes', import.meta.url));
const WEB = 'Studio/Games/Sindibad-Yasmina/Classes/Grade6/Web';

export function renderAttributes(sources: string[] = gameSources()): string {
  const generated = sources.map(ts => `${WEB}/${ts.replace(/\.ts$/, '.js')} linguist-generated=true`);
  return [
    '# Written by Studio/Games/Sindibad-Yasmina/Classes/Grade6/Web/tools/attributes.ts',
    '# (npm run build). Do not edit by hand: tests/check-build.ts fails if it is stale.',
    '',
    '# Vendored libraries: not our code.',
    '**/vendor/** linguist-vendored=true',
    '**/three.module*.js linguist-vendored=true',
    '**/lenis.mjs linguist-vendored=true',
    '',
    '# Retired Grade 10 Chemistry prototype: left out of the language statistics.',
    'Studio/Games/Sindibad-Yasmina/Classes/Grade10/Chemistry/Archive/** linguist-detectable=false',
    '',
    '# Game .js files made from a .ts by tools/build.ts.',
    ...generated,
    '',
  ].join('\n');
}

if (process.argv[1] && relative(process.argv[1], fileURLToPath(import.meta.url)) === '') {
  const text = renderAttributes();
  if (!existsSync(ATTRIBUTES_PATH) || readFileSync(ATTRIBUTES_PATH, 'utf8') !== text) {
    writeFileSync(ATTRIBUTES_PATH, text);
    console.log('wrote .gitattributes');
  }
  console.log(`attributes: ${gameSources().length} generated files listed`);
}
