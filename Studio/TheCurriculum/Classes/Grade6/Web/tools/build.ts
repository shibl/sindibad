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

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIRS = ['art', 'core', 'plugins', 'worlds'];
// And the files at the top of Web/ (the app shell).
const TOP = ['app.ts'];
const TSC = join(ROOT, 'node_modules/typescript/bin/tsc');

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

const banner = (ts: string) => `// Made from ${basename(ts)} by tools/build.ts. Edit that file, then run: npm run build\n`;

// Compiles the game's TypeScript (tsconfig.game.json; it stops on a type
// error) and returns each .js file, by its path relative to Web/.
export function compile(): Map<string, string> {
  const out = mkdtempSync(join(tmpdir(), 'sindbad-build-'));
  try {
    execFileSync(process.execPath, [TSC, '-p', join(ROOT, 'tsconfig.game.json'), '--noEmit', 'false', '--noEmitOnError', '--outDir', out], { stdio: 'inherit' });
    return new Map(gameSources().map(ts => {
      const js = ts.replace(/\.ts$/, '.js');
      return [js, banner(ts) + readFileSync(join(out, js), 'utf8')];
    }));
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
