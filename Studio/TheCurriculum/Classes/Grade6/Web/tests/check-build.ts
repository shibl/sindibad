// Fails if a game .js file made from TypeScript is out of date: someone
// changed the .ts without running `npm run build`, or edited the .js by hand
// (the change would be lost at the next build).

import { existsSync, readFileSync } from 'node:fs';
import { compile } from '../tools/build.ts';

const ROOT = new URL('..', import.meta.url);
const files = compile();
const stale = [...files].filter(([js, text]) => {
  const path = new URL(js, ROOT);
  return !existsSync(path) || readFileSync(path, 'utf8') !== text;
}).map(([js]) => js);
if (stale.length) {
  console.error(`✗ out of date: ${stale.join(', ')}. Edit the .ts file, then run: npm run build`);
  process.exit(1);
}
console.log(`✓ the game's .js files match their TypeScript (${files.size} files)`);
