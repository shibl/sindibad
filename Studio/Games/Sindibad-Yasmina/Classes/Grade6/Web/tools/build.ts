// Makes the game's .js files from their TypeScript. The browser loads plain
// JavaScript (playing or previewing the game needs no build step), so each
// x.ts in the game's folders is compiled to x.js next to it, and both are
// committed. Run after changing a .ts file:   npm run build
// (it also updates the offline file list). tests/check-build.ts fails if a
// .js is out of date or was edited by hand.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shellFiles, shellVersion, renderShell } from './update-shell.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIRS = ['art', 'core', 'plugins', 'worlds'];
// And the files at the top of Web/ (the app shell).
const TOP = ['app.ts'];
const TSC = join(ROOT, 'node_modules/typescript/bin/tsc');
// The service worker: its own scope and types (tsconfig.sw.json). Its .js
// also carries the offline file list and version (tools/update-shell.ts).
const SW = 'service-worker.ts';
// The site's old-copy cleanup worker, published at its top folder
// (Infra/Pages; its own tsconfig.json there).
const LEGACY_SW = '../Infra/Pages/service-worker.ts';

function walk(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap(name => {
    const rel = `${dir}/${name}`;
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : name.endsWith('.ts') && !name.endsWith('.d.ts') ? [rel] : [];
  });
}

// The game's TypeScript files, relative to Web/.
export function gameSources(): string[] {
  return [...TOP.filter(f => existsSync(join(ROOT, f))), ...DIRS.flatMap(walk)].sort();
}

// Every .ts file the build makes a .js from: the game's and the service worker.
export function builtSources(): string[] {
  return [...gameSources(), SW, LEGACY_SW];
}

const banner = (ts: string) => `// Made from ${basename(ts)} by tools/build.ts. Edit that file, then run: npm run build\n`;

// Compiles the game's TypeScript (tsconfig.game.json; it stops on a type
// error) and returns each .js file, by its path relative to Web/.
export function compile(): Map<string, string> {
  const out = mkdtempSync(join(tmpdir(), 'sindbad-build-'));
  try {
    execFileSync(process.execPath, [TSC, '-p', join(ROOT, 'tsconfig.game.json'), '--noEmit', 'false', '--noEmitOnError', '--outDir', out], { stdio: 'inherit' });
    execFileSync(process.execPath, [TSC, '-p', join(ROOT, 'tsconfig.sw.json'), '--noEmit', 'false', '--noEmitOnError', '--outDir', out], { stdio: 'inherit' });
    const files = new Map(gameSources().map(ts => {
      const js = ts.replace(/\.ts$/, '.js');
      return [js, banner(ts) + readFileSync(join(out, js), 'utf8')];
    }));
    // The worker with the current offline list, as update-shell.ts writes it.
    const shell = shellFiles();
    files.set('service-worker.js', renderShell(banner(SW) + readFileSync(join(out, 'service-worker.js'), 'utf8'), shell, shellVersion(shell)));
    const legacy = join(out, 'legacy');
    execFileSync(process.execPath, [TSC, '-p', join(ROOT, '../Infra/Pages/tsconfig.json'), '--noEmit', 'false', '--noEmitOnError', '--outDir', legacy], { stdio: 'inherit' });
    files.set(LEGACY_SW.replace(/\.ts$/, '.js'), banner(LEGACY_SW) + readFileSync(join(legacy, 'service-worker.js'), 'utf8'));
    return files;
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

if (process.argv[1] && relative(process.argv[1], fileURLToPath(import.meta.url)) === '') {
  const files = compile();
  for (const [js, text] of files) {
    const path = join(ROOT, js);
    if (existsSync(path) && readFileSync(path, 'utf8') === text) continue;
    writeFileSync(path, text);
    console.log(`wrote ${js}`);
  }
  console.log(`build: ${files.size} files from TypeScript`);
}
