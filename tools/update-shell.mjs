// Regenerates the offline file list (APP_SHELL) and CACHE_VERSION in
// service-worker.js from the files on disk. Run after adding or changing
// any app file:   node tools/update-shell.mjs
// (No build step for the app itself — this only edits one list.)

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TOP = ['index.html', 'style.css', 'app.js', 'manifest.json'];
const DIRS = { art: /\.js$/, core: /\.js$/, plugins: /\.js$/, worlds: /\.js$/, fonts: /\.woff2$/, icons: /\.(png|svg)$/ };

function walk(dir, re) {
  return readdirSync(join(ROOT, dir)).flatMap(name => {
    const rel = `${dir}/${name}`;
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel, re) : re.test(name) ? [rel] : [];
  });
}

export function shellFiles() {
  return [...TOP, ...Object.entries(DIRS).flatMap(([d, re]) => walk(d, re).sort())];
}

export function shellVersion(files) {
  const h = createHash('sha1');
  for (const f of files) h.update(f).update(readFileSync(join(ROOT, f)));
  return h.digest('hex').slice(0, 10);
}

export function renderShell(sw, files, version) {
  const list = ['./', ...files].map(f => `  '${f}',`).join('\n');
  return sw
    .replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${version}';`)
    .replace(/\/\/ <app-shell>[\s\S]*?\/\/ <\/app-shell>/, `// <app-shell>\n${list}\n  // </app-shell>`);
}

if (process.argv[1] && relative(process.argv[1], fileURLToPath(import.meta.url)) === '') {
  const files = shellFiles();
  const swPath = join(ROOT, 'service-worker.js');
  const out = renderShell(readFileSync(swPath, 'utf8'), files, shellVersion(files));
  writeFileSync(swPath, out);
  console.log(`service-worker.js: ${files.length} files, version ${shellVersion(files)}`);
}
