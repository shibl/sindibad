# Plan: moving JavaScript to TypeScript

Analysis only. No source file was changed to produce it. Figures come from
`git ls-files` byte counts on branch `main` (2026-10-26), approximating what
GitHub linguist counts.

## Where the bytes are today

| bucket | JS bytes | files | note |
|---|---:|---:|---|
| Grade 6 generated `.js` (has a sibling `.ts`) | 2,617,346 | 65 | `content-en.js` alone is 1,660,337 |
| Grade 6 handwritten `.js` (core/, plugins/, worlds/, art/) | 1,984,128 | 83 | no `.ts` yet |
| Grade 6 `service-worker.js` | 6,751 | 1 | outside the build's folders |
| Grade 6 `tests/*.mjs`, `tools/*.mjs` | 107,144 | 4 | `e2e.mjs` is 81,735 |
| Other tooling (`Shared/Art/tools`, `Android/tools`, `Infra/Pages`) | 33,900 | 8 | `.mjs` scripts |
| Grade 10 Chemistry lab `Web/js` | 235,701 | 16 | no build step; source-only by owner |
| Grade 10 Chemistry `Archive/` | 229,632 | 6 | retired prototype |
| Studio website `Web/js` | 81,839 | 9 | out of scope (another agent) |
| `vendor/` (three.js copies, minified) | 3,317,454 | 9 | linguist already ignores `vendor/` by default |
| **JS total** | **8,613,895** | 201 | |
| **TS total** (67 game + 5 tools/tests, `.d.ts`) | **2,620,923** | 73 | matches GitHub's 2.6 MB |

Linguist-style JS, excluding `vendor/`: 8,613,895 - 3,317,454 = **5,296,441**.
GitHub reports 4.2 MB, so about 1.1 MB is already being dropped by something I
cannot reproduce offline (possibly the generated-file heuristics on very long
files such as `content-en.js`). Treat the projections as relative; re-check the
real numbers on GitHub after each phase (or with `github-linguist --breakdown`).

Key point: because the convention commits the generated `.js` beside each `.ts`,
**converting a file does not lower JS**. The `.ts` adds to TypeScript, and the
`.js` stays. Only Phase 0 (marking generated files) lowers JS. Conversions then
raise TS, and also stop a file from needing a generated-marking later only if
the marking list is kept complete.

## Evidence gathered (experiment, reverted)

I copied each of the 83 handwritten Grade 6 `.js` files to `.ts` and ran
`tsc -p tsconfig.game.json` (strict, `erasableSyntaxOnly`). Result, then reverted
(nothing committed):

* 38 files (1,154,181 bytes) type-check with **zero errors**, unchanged. They
  are the data-heavy files: all `worlds/grade6/**` content (atlas unit1-5,
  english block1-4, studio part1-3, lab, farm, math, arabic),
  `worlds/atlas/shapes`, `worlds/chapters`, `worlds/grade6`, most of
  `plugins/arabic` and `plugins/agriculture`, `plugins/index`,
  `plugins/review/treasure`. `npm run build` then regenerated 103 `.js` files
  fine (the only change to each `.js` is the "Made from" banner line, so
  behaviour is identical; the offline shell version changes).
* 29 files (164,657 bytes) have 1-30 errors each.
* `worlds/grade6/tunes.ts` (85,485): 6 errors.
* 15 files (579,805 bytes) have 39-302 errors each, about 2,200 of the 2,598
  total. Kinds across everything: TS7006 implicit-any parameter (913), TS2322
  type mismatch (875), TS2554 wrong argument count (297), TS7053 index
  signature (79), TS2339 missing property (52), TS18047 possibly-null (47),
  the rest under 40 each.

I did not get a full `npm test` run on a converted tree (the Playwright e2e run
takes over two minutes and I stopped it when the plan changed), so Phase 1
"verified" below means typecheck + build only so far.

## Phase 0: `.gitattributes` only

* **Goal**: stop generated and vendored JS being counted. No code change.
* **Files**: new root `.gitattributes`:
  * `linguist-generated` for every `.js` that has a sibling `.ts` in
    `Studio/Games/Sindibad-Yasmina/Classes/Grade6/Web/` (65 files today; this
    is `app.js`, `core/**`, `plugins/**` generated ones). Patterns cannot test
    for a sibling, so the list must be explicit. Add a small script
    (`tools/` in Grade 6, TypeScript) that writes the block, and a check in
    `tests/check-build.ts` that fails when the block is stale, so later phases
    cannot forget.
  * `linguist-vendored` for `**/vendor/**`, `three.module*.js`, any Lenis copy
    (explicit even though linguist's default already covers `vendor/`).
  * `linguist-detectable=false` (or `linguist-vendored`) for
    `Studio/Games/Sindibad-Yasmina/Classes/Grade10/Chemistry/Archive/**`
    (229,632 JS, retired, not worth converting).
  * Do not use `linguist-generated` on handwritten files.
* **Bytes leaving JS**: 2,617,346 (generated) + 229,632 (Archive) = **2,846,978**.
  Vendor 3,317,454 already excluded by default; no further change.
* **Risk**: very low; only repo-language statistics and diff collapsing on
  GitHub change. Collapsed diffs for generated files is a side effect to tell
  reviewers about.
* **Depends on**: nothing.
* **Verify**: `git check-attr -a <path>` on samples from each pattern; a small
  script that applies the rules and totals bytes; after pushing, read the
  language bar on GitHub (linguist caches, can take a few minutes).
* **After**: JS 2,449,463 | TS 2,620,761.

## Phase 1: Grade 6 data-only files (clean set)

* **Goal**: convert the files that need no annotations at all.
* **Files** (38; rename `.js` to `.ts`, run `npm run build`): everything under
  `worlds/grade6/**` content (`atlas/unit1-5`, `english/block1-4`+`kit`,
  `studio/part1-3`, `lab/body forces life machines`, `farm`, `math`, `arabic`),
  `worlds/atlas/shapes`, `worlds/chapters`, `worlds/grade6`,
  `plugins/index`, `plugins/review/treasure`, `plugins/arabic/{fael-mafool,
  inna,kana,mubtada-khabar,plurals,tenses}`, `plugins/agriculture/{bees,beet,
  cheese,cotton,cow,potato,tomato}`.
  The big generated data files (`core/i18n/content-en.js` 1.66 MB, `en.js`)
  are **already** `.ts`; they are handled by Phase 0, not here.
* **Bytes leaving JS (after Phase 0 listing)**: 1,154,181 handwritten JS bytes
  become generated JS, so JS **drops 1,154,181** only once the new generated
  `.js` are added to the Phase 0 list; TS gains the same amount.
* **Risk**: low. Lesson wording is untouched (rename only); the generated `.js`
  is the same text plus one banner line. Watch for the offline shell version and
  `tests/check-content.ts` (reads these files).
* **Depends on**: Phase 0 (otherwise the numbers do not move).
* **Verify**: `npm --prefix .../Grade6/Web test` (typecheck, check-build,
  check-shell, check-content, language checks, Playwright e2e); diff each
  regenerated `.js` against the old one (banner only); content diff empty.
* **After**: JS 1,295,282 | TS 3,774,942.

## Phase 2: Grade 6 logic modules, by folder in dependency order

Annotate parameters and fix real mismatches. These files need hand work;
do them in leaf-first order so each folder's types are available to the next.
A shared `types/` file for scene/model helper types will cut the TS7006 noise
(most implicit-any parameters are small helpers like `(cx, cy, r)` in drawing
code and `(mat, shader)` in three.js setup). Do not use `any` as a blanket.

* **2a, low-error files** (30 files, 250,142 bytes, 1-30 errors each):
  `worlds/grade6/tunes` (85,485, 6 errors), `art/art` (29), `art/sprites` (23),
  `core/lab/views-machines` (24), `worlds/grade6/english` (15),
  `plugins/arabic/build` (7), `plugins/math/*` (13 files; `divisibility` 18),
  `plugins/review/pools` (11), `plugins/{social,music,english,science,art}/reviews`,
  `worlds/grade6/{studio,lab,atlas}.ts` indexes, `core/studio/{views,svg}`.
  Risk low-medium. Verify: `npm test`, plus a play-through of the touched topic
  (math plugins have e2e coverage in `tests/e2e.mjs`).
* **2b, heavy files** (15 files, 579,805 bytes, 39-302 errors each), in this
  order: `core/studio/art` and `models`, `core/studio/views-1..3`;
  `core/farm/models`; `core/english/models` then `views`; `core/tunes/models`;
  `core/sea/models`; `core/atlas/models` then `views`; `core/lab/models` then
  `views`; `worlds/atlas/countries` (97,200, 115 errors, mostly object-shape
  and tuple-length errors from untyped data: define a `Country` type).
  Risk medium: three.js mesh/builder helpers and the 297 argument-count errors
  (JS tolerates missing/extra arguments, TS does not) need case-by-case review;
  fix with optional parameters or defaults only where the JS already behaves
  that way. No behavioural edits allowed.
  Depends on 2a for `art/` and `core/isle` types. Verify: `npm test`; run the
  affected island on a local server (`npm run serve`), since models are visual
  and the e2e run only checks flow.
* **Bytes**: 2a 250,142 + 2b 579,805 = 829,947 JS bytes leave JS, assuming
  each new generated `.js` is added to Phase 0's list.
* **After 2a**: JS 1,045,140 | TS 4,025,084. **After 2b**: JS 465,335 | TS 4,604,889.
  (Add roughly 1-3 percent to TS for annotations.)

## Phase 3: tests, tools, service worker, other scripts

* **Files**: `Grade6/Web/tests/{e2e,language,check-language-content}.mjs`,
  `tools/make-world.mjs` (107,144 total); `Grade6/Web/service-worker.js` (6,751,
  outside the build's folders, so extend `tools/build.ts` or leave it);
  `Grade6/Shared/Art/tools/*.mjs`, `Grade6/Android/tools/*.mjs`,
  `Infra/Pages/service-worker.js` (33,900).
* **Approach**: node runs `.ts` directly by type stripping (22.18+), as the
  existing `tests/check-*.ts` already do, so no generated copies are needed:
  rename to `.ts`, fix imports to name `.ts`, update `package.json` and any
  workflow that calls them by `.mjs` name (`.github/` and the Android build).
  `e2e.mjs` is one 81 KB Playwright script that drives the page via
  `page.evaluate` strings; type only the Node side.
* **Bytes leaving JS**: 147,795 (all real, since nothing generated is left
  behind). **After**: JS 317,540 | TS 4,752,684.
* **Risk**: low-medium: CI workflows and the Android Gradle tasks invoke these
  files by name. **Depends on**: none technically; do after Phase 2 so shared
  types exist. **Verify**: `npm test`, `npm run check --prefix Shared/Art/tools`,
  Android JVM tests that import the scripts, and a CI dry run on a branch.
* The service worker also changes the offline cache list; check
  `tests/check-shell.ts` and test offline once.

## Phase 4: Grade 10 Chemistry lab (plan only)

* **Files**: `Grade10/Chemistry/Web/js/*.js` (16 files, 235,701; `exp-a`,
  `exp-b`, `kit`, `room`, `ui`, `engine`, `main`, ...). The `vendor/` three.js
  copy is already excluded.
* **Needs first**: a build step copying Grade 6's (`tools/build.ts`,
  `tsconfig.game.json`, `check-build.ts`) plus types for three.js. Today it has
  none and the owner wants Grade 10 source-only (no builds, browser or app
  tests), so I did not touch it. Do this only after the owner lifts that.
* **Bytes**: 235,701. **After**: JS 81,839 | TS 4,988,385. Generated copies would
  need adding to `.gitattributes` too.
* **Risk**: medium (no tests today). **Verify**: build check, typecheck, then the
  owner opening the lab on their device.

## Phase 5: Studio website `Web/js` (note only)

* 9 files, 81,839 bytes (`site.js` 29 KB, `splash-timeline.js` 23 KB, ...). No
  build step today. Another agent is redesigning the site; not inspected and
  not to be touched. Revisit after the redesign lands. A build step would follow
  the same pattern, and the website branch is published by a workflow, so check
  that first.
* **After**: JS 0 | TS about 5,070,224.

## Summary

| after phase | JS bytes | TS bytes |
|---|---:|---:|
| today (local estimate, vendor excluded) | 5,296,441 | 2,620,761 |
| 0: `.gitattributes` | 2,449,463 | 2,620,761 |
| 1: Grade 6 data files | 1,295,282 | 3,774,942 |
| 2a/2b: Grade 6 logic | 1,045,140 / 465,335 | 4,025,084 / 4,604,889 |
| 3: tests, tools, scripts | 317,540 | 4,752,684 |
| 4: Grade 10 lab | 81,839 | 4,988,385 |
| 5: website | 0 | about 5,070,224 |

Recommended order for value per risk: 0, then 1, then 2a; stop there and
re-measure on GitHub (JS about 1.0 MB). Phase 2b and 3 are the next step if
the owner wants JS near zero in the Grade 6 game.
