// Which tests a push or pull request needs, as the job list of the "checks"
// matrix in .github/workflows/site.yml (one job per entry, side by side).
//
// A grade is tested when its own files changed: any file in
// Studio/Games/*/Classes/<Grade>/ except its native apps (Android/, iOS/)
// and Markdown notes. A change to .github/ tests every grade. Website,
// Grade 10 and notes-only changes need no game tests.
//
// A grade takes part when its Web/package.json has a "test" script. With
// "test:fast" and tests/e2e-groups.json (Grade 6), it runs as one job for
// the fast checks plus one job per group of browser tests (E2E_PARTS);
// otherwise as one "npm test" job.
//
//   node .github/scripts/test-plan.mjs <base commit> <head commit>
//   (no base, or a base git doesn't know: test every grade)
//
// Writes matrix=… and any=true|false to $GITHUB_OUTPUT (or prints them).

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [base = '', head = 'HEAD'] = process.argv.slice(2);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

let changed = null;   // null: test everything
if (base && !/^0+$/.test(base)) {
  try { changed = git('diff', '--name-only', `${base}...${head}`).split('\n').filter(Boolean); }
  catch { console.log(`Cannot compare with ${base}: testing every grade.`); }
}

const grades = [];
for (const game of readdirSync('Studio/Games')) {
  const classes = join('Studio/Games', game, 'Classes');
  if (!existsSync(classes)) continue;
  for (const grade of readdirSync(classes).sort()) {
    const pkg = join(classes, grade, 'Web/package.json');
    if (!existsSync(pkg) || !JSON.parse(readFileSync(pkg, 'utf8')).scripts?.test) continue;
    grades.push({ name: grade, root: join(classes, grade), dir: join(classes, grade, 'Web') });
  }
}

const touches = g => changed === null
  || changed.some(f => f.startsWith('.github/'))
  || changed.some(f => f.startsWith(`${g.root}/`) && !/^(Android|iOS)\//.test(f.slice(g.root.length + 1)) && !f.endsWith('.md'));

const include = [];
for (const g of grades.filter(touches)) {
  const scripts = JSON.parse(readFileSync(join(g.dir, 'package.json'), 'utf8')).scripts;
  const groups = join(g.dir, 'tests/e2e-groups.json');
  if (scripts['test:fast'] && existsSync(groups)) {
    include.push({ name: `${g.name}: fast checks`, dir: g.dir, run: 'npm run test:fast', parts: '' });
    for (const group of JSON.parse(readFileSync(groups, 'utf8')))
      include.push({ name: `${g.name}: ${group.join(', ')}`, dir: g.dir, run: 'npm run test:e2e', parts: group.join(',') });
  } else {
    include.push({ name: `${g.name}: npm test`, dir: g.dir, run: 'npm test', parts: '' });
  }
}

console.log(changed === null ? 'Testing every grade.' : `${changed.length} file(s) changed.`);
console.log(include.length ? include.map(j => `  ${j.name}`).join('\n') : 'No game tests needed.');
const out = `matrix=${JSON.stringify({ include })}\nany=${include.length > 0}\n`;
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, out); else process.stdout.write(out);
