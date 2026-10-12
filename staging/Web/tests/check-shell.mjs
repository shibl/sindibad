// Fails if service-worker.js's offline file list is stale — i.e. someone
// added or changed a file without running `node tools/update-shell.mjs`.
// A stale list means that file would be missing when playing offline.

import { readFileSync } from 'node:fs';
import { shellFiles, shellVersion, renderShell } from '../tools/update-shell.mjs';

const sw = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const files = shellFiles();
if (renderShell(sw, files, shellVersion(files)) !== sw) {
  console.error('✗ service-worker.js is out of date. Run: node tools/update-shell.mjs');
  process.exit(1);
}
console.log(`✓ offline file list up to date (${files.length} files)`);
