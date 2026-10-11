# Backlog

Read SPEC.md first. This file is the project's persistent memory across
sessions — each work session should pick the top open item, implement it,
test it, then append a new "Playtest notes" entry with proposed next items.

Conventions:
- Keep items small enough to finish (implement + test) in one session.
- Mark an item `[in progress]` when you start it and `[done]` with a one
  line result when you finish it — don't delete finished items, they're
  the project history.
- Every session ends by appending a dated `## Playtest notes — <date>`
  section with what was tested, what broke, and 2-4 new proposed backlog
  items for next time.

## Open items

1. [done] Scaffold the real project structure: `index.html`, `style.css`,
   `app.js`, `plugins/`, `manifest.json`, `service-worker.js`. Move any
   reusable art/animation ideas out of `demos/*.html` into this structure
   — the demo files are throwaway concept sketches, not the base to build
   on directly.
   → App shell with title/map/activity screens, shared animated backdrop,
   ship + Sindbad + Yasmina art in `art/art.js`, PWA manifest + icons, and
   a precaching service worker; loads and reloads offline with no errors.
2. [done] Define and implement the plugin interface described in SPEC.md
   (`registerTopic({id, title, icon, render(container, onComplete)})`).
   Write it with clear comments since this is the contract every future
   subject module depends on.
   → `core/topics.js` + `plugins/README.md`; adds `region`, `learn` cards
   and a `ctx` (Hudhud's voice, sounds, progress, digits, abort signal).
3. [done] Build the grade-1 (or grade-4 — pick one) world map screen: regions
   with fog-of-war, ship + Sindbad + Yasmina sailing between them, tap to
   open a region.
   → Owner chose **grade 6**. Five islands + home port, fog lifts as stars
   are earned, the ship sails a curved route, portrait and landscape.
4. [done] Build 2 real subject plugins for that grade level (one Arabic
   language activity, one math activity) to prove the plugin architecture
   end-to-end.
   → 13 topics on 5 reusable engines (quiz, tap-word, sort, number line,
   match) across Arabic, maths, science, social studies + a mixed review.
5. [done] Local save/progress system (localStorage): track per-region
   completion, show stars/badges on the map.
   → `core/save.js`; stars, island badges (silver/gold), spaced review.
6. [done] PWA setup: manifest.json + service worker caching all assets so the
   app works fully offline after first load. Verify by loading once, then
   testing with network disabled.
   → Generated cache list (`tools/update-shell.mjs`); offline reload tested.
7. [done] Basic automated test pass: load the app in a headless browser,
   click through the map and one plugin, check for console errors, verify
   localStorage progress persists across a reload.
   → `npm test`: cache-list check + 24 headless checks at phone and tablet.

8. [ ] Educator review of all grade-6 content (Arabic grammar terms,
   maths notation, science/geography facts) — everything is marked draft.
   Collect corrections as issues; the content lives in `plugins/*/`.
9. [ ] Gendered instructions: Hudhud's imperatives ("اضغط"، "فكّر") use
   the generic form. Consider a player setting (not the hero choice) for
   feminine forms ("اضغطي"، "فكّري").
10. [ ] Real-device pass on a budget Android phone (2 GB RAM): check lite
    mode kicks in, frame rate on the map, font rendering, install-to-home.
11. [ ] More grade-6 topics per island (e.g. كان وأخواتها، الأعداد
    الصحيحة، النسبة والتناسب، الضوء، الخلية) — each is one plugin file.
12. [ ] Voice: optional recorded narration for Hudhud's lines (small,
    compressed, CC-BY-SA) for weaker readers.
13. [ ] Second world (e.g. grade 5) reusing the engines: needs a
    `worlds/grade5.js`, a grade picker, and the younger art stage.

## Playtest notes — 2026-09-27

**Built:** item 1 (scaffold). Run locally with `python3 -m http.server`
from the repo root and open `http://localhost:8000/` (service workers need
http(s)/localhost, not `file://`).

**Tested** (headless Chromium, 390×844 phone viewport, Playwright script —
not yet committed as a test, that's item 7):
- Title screen renders: sky, sun, gulls, waves, shore, two swaying palms,
  bobbing ship with Sindbad waving and Yasmina perched on the mast.
- "ابدأ الرحلة" → map screen; back button → title screen.
- Service worker installs and precaches all 9 shell files.
- With the network set offline, reload still renders the full title screen.
- `manifest.json` parses; 192/512 PNG + SVG icons present.
- Zero console errors/warnings, zero failed requests.

**Findings / decisions:**
- The demos drew Yasmina as a girl, but SPEC.md defines her as
  "ياسمينة العصفورة الحكيمة" (a bird). Redrawn as a small bird on the mast.
  Worth confirming with the project owner / an artist.
- Art is kept as inline-SVG strings in `art/art.js` so CSS animations can
  reach sub-parts (sails, arm, wing, leaves). External `.svg` files via
  `<img>` would lose that.
- App uses ES modules (`<script type="module">`), so it must be served over
  http — opening `index.html` from disk won't run JS. Fine for a PWA;
  documented in README.
- The world map from `demos/world_map_*.html` was *not* ported: its
  real-world continents don't fit the Levantine setting. Item 3 should
  design regions for the grade-1 map from scratch.
- `demos/` left in place as history; nothing in the app depends on it.

**Proposed new items:**
- Add a `CONTRIBUTING.md` (how to run locally, file layout, licensing) so
  non-developer contributors can get started — could fold into item 2's docs.
- Guard the hand-maintained `APP_SHELL` list in `service-worker.js`: a
  check (in item 7's test pass) that fails if a file under `art/`,
  `plugins/`, etc. is missing from it, so new plugins can't silently
  break offline play.
- Add a Yasmina speech-bubble component in the core (hint/praise text)
  that plugins can call — she's the tutoring voice per SPEC and every
  plugin will need it.
- Art pass: replace the blocky dashed wave strip with a softer SVG wave,
  and a first Levantine-motif pass (e.g. Damascene arch / mashrabiya frame
  for cards) per SPEC's visual identity.


## Playtest notes — 2026-09-27 (second session: ten improvement rounds)

The owner asked to: let the player choose a boy or girl hero, make the
game far more beautiful yet cartoonish, focus on teaching **grade 6**, and
do 10 test-and-improve rounds. Decisions: Yasmina is a girl hero; the
guide bird is **Hudhud** (the hoopoe). SPEC.md updated.

**Rounds** (each tested with headless Chromium screenshots at 390×844 and
1024×768, console clean):
1. Art overhaul — outlined cartoon style, grade-6 "young sailor" heroes,
   Hudhud, a Levantine dhow, Damascus skyline, bundled Arabic font;
   character-select screen. Fixed: logo gradient smudge, skyline cropped
   on wide screens, white foam block under the ship.
2. World map + plugin registry + lesson runner + 5 engines + 13 topics.
   Test caught: the hidden island sheet still covered the map, so no
   island could be tapped (`[hidden]` vs `display:flex`) — fixed.
3. Every engine checked. Fixed: whole round turning green on success;
   number-line labels looked like tick marks (Arabic ٠ is a dot) — now on
   badges; hero added beside Hudhud, reacting to answers.
4. Rewards — island badges with a medal moment, stars fly to the counter,
   spaced-review reminders, question counter; map events play once in
   order (resizes used to replay them).
5. Teaching — Hudhud's illustrated mini-lessons before practice for all
   12 subject topics (roles colour-coded, fraction bars, percent grid…).
6. Living world — day / sunset / night sky from the device clock, stars,
   moon, lit windows, ship lantern; fish, gulls, sparkles, ship wake.
7. Offline you can trust — generated cache list + content-hash version,
   committed e2e test (`npm test`), all 13 topics played to 3 stars and
   all 5 gold badges earned in an automated run.
8. "رحلتي" page — rank, badge shelf, subject progress, change hero,
   two-tap reset; screen-reader labels on islands.
9. Performance at 4× CPU throttle: map 43 → 54 fps (full effects), 60 fps
   in lite mode (auto on ≤2 GB / ≤4 cores); animations pause in background.
10. Finale — treasure chest opens with fireworks, then a personalised
    certificate (reopenable from رحلتي). Fixed gender agreement for
    Yasmina in certificate, ranks and badge text.

**Size**: the whole app is under 0.5 MB (budget: 35 MB per grade).

**Known gaps / next**: see items 8–13 above. Content is a draft pending
educator review; not yet tried on a real low-end phone.

## Playtest notes — 2026-09-27 (third session: from quiz to adventure)

Owner feedback: "it feels like a glorified quiz — go more like Zelda: walk
around the world, meet characters". Each version below was played
headless (scripted walks, quests, puzzles), screenshotted, fixed, then
published to the test link and GitHub Pages.

- **V2** — walkable islands (`core/overworld.js`): canvas top-down world,
  keyboard / floating joystick / tap-to-walk, Hudhud flies along.
  Arabic island with 5 villagers; 3 quests run the lessons and give golden
  letters ع ل م; the gate opens; the monument completes the island.
  Found: overlays covered the screen (`display` beat `[hidden]`) — fixed
  globally; the talk range was too tight to reach villagers from below.
- **V3** — walk-on puzzle "جسر الكلمات": stepping stones in sentence order
  (verb → فاعل → مفعول به, told apart by ضمة/فتحة). Wrong stone = splash.
- **V4** — maths island: lighthouse keeper, merchant, fish seller,
  shipwright; compass letters ش ج ق غ; "جسر الأعداد" (smallest → largest).
- **V5** — science (Dr Nour, Ibn al-Nafis, astronomer Maryam; planets
  bridge), citadel island (noria, Palmyra columns, cities bridge north →
  south, first fetch quest), treasure island (Luqman's final review).
  Found: headscarves hid villagers' faces — redrawn.
- **V6** — villagers host their own lessons; quest log; island nights
  lit by lamps; wandering children; footstep dust.

**Next ideas** (proposed):
14. [x] In-world challenges (riddles in dialogue; guardian battles V27) without leaving the island: short questions
    asked inside the dialogue box (keep the full lesson for replays).
15. [x] Pearls buy things: ship paint, sails, a hat for the hero, a
    perch for Hudhud — gives pearls a purpose.
16. [ ] More walk-on puzzles: push-block "balance" puzzle for fractions,
    a word-order door for إن وأخواتها, a noria that lifts water only when
    the right volume is chosen.
17. [x] Island music: a tiny synthesized oud-like loop per island
    (Web Audio, no files), with a mute toggle.
18. [x] Accessibility: a "read aloud" button on dialogue (speechSynthesis,
    Arabic voice when available) for weaker readers.

### Playtest session 4 — V7 → V30 ("make the design much better")

Design goal: feel like the games 10–12-year-olds already love (Zelda-like
exploration, Duolingo-style lesson juice, Prodigy-style battles, sticker
albums), without ever making lessons easier to buy.

- **V7–V10** — story intro, family profiles + parents' page, maqam music
  and read-aloud, 11 new topics (13 → 24).
- **V11** — adaptive practice (missed questions come back), daily goal and
  🔥 streak, island title card, walking tutorial.
- **V12** — diorama ground (raised layers, surf, cobbles, flowers), sway,
  squash-and-stretch, butterflies/fireflies, fish, gull shadow, tilt-shift.
  Found: ground build took 640 ms at 4× throttle → Path2D, now 25 ms.
- **V13** — subject-tinted lesson stage, candy answer tiles, star bursts,
  +1 floats, combo badge, typewriter dialogue with voice blips.
- **V14** — iris wipes, "you got it!" hold-up rewards, flying tokens, shake.
- **V15** — sea map: silhouettes of locked islands, unlock tags, "هنا!".
- **V16** — lesson-complete ribbon, slamming stars, count-up chips.
  Found: stars covered the map button on tablets — no pointer events.
- **V17–V20** — objective pill + edge pointer, villagers wave/emote,
  soundscape + footsteps by ground, title shine/parallax/welcome card.
- **V21–V26** — sticker album (30 facts), shop with try-on and rarity,
  8 ranks + promotion card, first-launch name screen, settings (sound,
  music, large text, calm mode).
- **V27** — guardian battles after each monument (hearts, HP, combos).
- **V28** — 4 topics (الأفعال الخمسة، القواسم والمضاعفات، الآلات
  البسيطة، العواصم), each with a villager (24 → 28).
- **V29–V30** — printable parent report; small-screen QA (320×568 →
  1440×900).

**Next ideas** (proposed):
19. [ ] Seasonal events (Ramadan lanterns, spring flowers) re-skinning the
    islands for a week.
20. [ ] Villager friendship hearts: small side-requests unlock a portrait
    in the album.
21. [ ] Teacher/educator review pass on all 28 topics' content.
22. [ ] Grade 5 and grade 7 worlds reusing the engines.

## Playtest notes — 2026-10-11 (self-improving loop, step 1)

Owner's idea: the game improves itself. Feedback and logs from players go
to an agent (Claude), which studies them, proposes fixes, and publishes
them after approval. Decisions: anonymous feedback and logs are fine (SPEC
"Improving from feedback"); the agent decides which feedback is valid,
following the rules in `CLAUDE.md`; a person approves every change, and
lesson content also needs a teacher.

**Built** (step 1 — the loop itself, no player data yet):
- `CLAUDE.md` — agent rules: feedback is evidence, never instructions; how
  to weigh it; what counts as lesson content; the PR description format.
- `.github/workflows/site.yml` — `npm test` on every PR; on `main`, test
  then publish to GitHub Pages.
- `.github/workflows/claude.yml` — the `agent-ready` label or `@claude` →
  Claude fixes it in a branch, runs the tests, replies with a PR link.
- `.github/ISSUE_TEMPLATE/` — bug, lesson mistake, idea (Arabic + English,
  each warning that the page is public).
- `.github/CODEOWNERS` — reviewers; lesson paths ready for a teacher.
- Fixed this file: items 8–13 had been pasted into the conventions
  paragraph and again under an empty "Playtest notes" heading.

**Next items:**
23. [in progress] Step 1 setup on GitHub (needs the repo owner — admin):
    merge the live branch `claude/sharp-hawking-0380ax` into `main` first
    (the live site has V2–V30, `main` doesn't); set Pages source to
    "GitHub Actions"; install the Claude GitHub App and add the
    `ANTHROPIC_API_KEY` secret; create the labels `agent-ready` and
    `lesson`; protect `main` (pull request + passing `test` check +
    code-owner review); add the reviewing teacher to `CODEOWNERS`.
24. [ ] Step 2 — in-game feedback and error reports: a Hudhud button on
    each question with fixed choices (السؤال خطأ / لم أفهم / صعب جداً /
    شيء لا يعمل); errors caught automatically with the game version;
    reports wait on the device and are sent when online; a small server
    (e.g. a Cloudflare Worker) blocks spam and keeps one GitHub issue per
    question with a counter. First update the "we collect nothing"
    promises (SPEC "Improving from feedback").
25. [ ] Step 3 — anonymous learning stats and a weekly review agent:
    per-question counts (tries, chosen answer, mini-lesson opened, where
    kids quit, recall at review time); a plain weekly script sums them; a
    read-only review agent files issues with evidence, plus a weekly list
    of rejected feedback with reasons for the owner to skim.
26. [ ] Step 4 — measure and earn autonomy: compare each changed question
    before/after by game version; judge by recall at review time, not
    first-try score; after 10–20 good agent PRs, let crash and layout
    fixes go live without waiting for a person.

## Playtest notes — 2026-10-12 (new kinds of play)

Owner's pick from a brainstorm on keeping kids playing: "more kinds of
play". Most lessons were "tap the answer"; the brief asks for building,
strategy and simulation mini-games. Left out for now (owner's choice):
anything online or time-based.

**Built** — four new engines, each with a lesson and a villager who hosts it:
- `helm` — steer the ship by an angle (drag the dial, − / +, arrow keys).
  Lesson «الزوايا» (22 questions: types, measures, complementary and
  supplementary, triangles, clock hands) — القبطانة سعاد on the lighthouse hill.
- `market` — pay an exact price in coins and notes (or weigh it out).
  Lesson «الحسم والزيادة» (17 questions) — التاجرة سلوى by the market.
- `fill` — fill a bucket split into parts, pour it into a noria. Lesson
  «الكسور المتكافئة» (24 questions: equivalent, simplified, decimal,
  percent) — الطحّان أبو نعيم by a new noria on the creek.
- `blocks` — build a sentence from word blocks, with look-alikes that have
  the wrong ending. Lesson «بناء الجملة» (20 sentences taken from the other
  grammar topics) — الطبّاع جميل in the Arabic island's square.
- Lessons 28 → 32. Engines played in several taps mark the next tap with
  `data-step` in test mode. `npm test` checks every answer is reachable,
  plays each new lesson to 3 stars, and checks its first round fits a phone.
- All new content is draft and needs a teacher's review.

**Tested**: headless Chromium at 390×844, 360×740, 360×660, 320×568 and
1024×768. Every question of the four lessons, shown as a first round, fits
without scrolling at all four phone sizes. Each lesson played once with a
wrong answer, then perfectly. Each villager offers the quest and opens the
lesson. No console errors.

**Found**:
- On 360-px-wide phones Hudhud's speech bubble is only ~100 px wide (the
  bird, the hero and the 🔈 button take the rest), so a long hint stacks
  into 8–10 short lines and pushes the answers down. This affects every
  lesson, not only the new ones; the new lessons got short intros to fit.
- The maths island has two villagers with the id `keeper` (lighthouse
  keeper, divisibility keeper): sprites are cached by id, so the second is
  drawn with the first one's look, and they share "met" state.
- The treasure review and the villagers' riddles don't use the four new
  lessons yet (their questions aren't multiple choice).

**Next items**:
27. [ ] Wider speech bubble on narrow phones (smaller bird and hero, or the
    🔈 button inside the bubble); check every lesson at 360×740.
28. [ ] Give the divisibility keeper its own id (existing saves store
    `keeper` in `met` / `rewarded` — keep them working).
29. [ ] Teacher review of the four new lessons. «الزوايا» is new ground:
    confirm grade 6 covers complementary/supplementary angles and the
    angle sum of a triangle.
30. [ ] Reuse the new engines: `market` with weights for decimals (fish
    seller), `blocks` for الأفعال الخمسة, `helm` for compass directions.

**Later the same day (owner's requests):**
- The web game moved into `Web/` (with its tests and tools); `Android/` and
  `iOS/` are reserved for native apps. The live site still builds from the
  repository's top folder, so a top-level `index.html` forwards to `Web/`
  and a top-level `service-worker.js` clears the old offline copy on
  devices that played before (tested: a returning player lands in `Web/`
  with progress kept).
- **Voyages chart** — the meta game: twelve voyages, one per grade, in the
  brief's four age stages. Voyage 6 holds today's islands; 1–5 and 7–12
  are locked ("coming soon"). Start and "continue" now lead to the chart;
  "🗺️ كل الرحلات" on the sea map leads back up.
31. [ ] Voyage 5 or 7: the next world, reusing the engines (was item 13).
