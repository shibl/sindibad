// Fails if a game .js file made from TypeScript is out of date: someone
// changed the .ts without running `npm run build`, or edited the .js by hand
// (the change would be lost at the next build).

import { existsSync, readFileSync } from 'node:fs';
import { compile } from '../tools/build.ts';
import { ATTRIBUTES_PATH, renderAttributes } from '../tools/attributes.ts';

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

// The root .gitattributes lists the generated .js files (tools/attributes.ts).
if (!existsSync(ATTRIBUTES_PATH) || readFileSync(ATTRIBUTES_PATH, 'utf8') !== renderAttributes()) {
  console.error('✗ .gitattributes is out of date. Run: npm run build');
  process.exit(1);
}
console.log('✓ .gitattributes lists the generated .js files');
