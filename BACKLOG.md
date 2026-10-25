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
    ~~merge the live branch `claude/sharp-hawking-0380ax` into `main`~~
    (done 2026-10-12: `main` has everything); ~~set Pages source to
    "GitHub Actions"~~ (not needed: since 2026-10-12 the workflow
    publishes through the branch, only when tests pass; switching Pages
    to "GitHub Actions" now also needs `site.yml` updated). Still for the
    owner: protect `main` (passing `test` check) and lock the website
    branch `claude/sharp-hawking-0380ax` so only GitHub Actions can push
    to it. *On hold (2026-10-12, no outside feedback for now): the Claude
    GitHub App, the `ANTHROPIC_API_KEY` secret, the `agent-ready` and
    `lesson` labels, and a teacher in `CODEOWNERS`.*
24. [on hold — no outside feedback for now, 2026-10-12] Step 2 — in-game feedback and error reports: a Hudhud button on
    each question with fixed choices (السؤال خطأ / لم أفهم / صعب جداً /
    شيء لا يعمل); errors caught automatically with the game version;
    reports wait on the device and are sent when online; a small server
    (e.g. a Cloudflare Worker) blocks spam and keeps one GitHub issue per
    question with a counter. First update the "we collect nothing"
    promises (SPEC "Improving from feedback").
25. [on hold] Step 3 — anonymous learning stats and a weekly review agent:
    per-question counts (tries, chosen answer, mini-lesson opened, where
    kids quit, recall at review time); a plain weekly script sums them; a
    read-only review agent files issues with evidence, plus a weekly list
    of rejected feedback with reasons for the owner to skim.
26. [on hold] Step 4 — measure and earn autonomy: compare each changed question
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
29. [on hold — teacher review comes later] Teacher review of the four new lessons. «الزوايا» is new ground:
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

**Owner decision (2026-10-12): no outside feedback for now.** Feedback
comes only from the developers, in Claude Code sessions. Removed the
public issue forms (`.github/ISSUE_TEMPLATE/`) and the GitHub agent
workflow (`.github/workflows/claude.yml`); both are in git history for
later. CLAUDE.md, WORKFLOW.md, SPEC and the brief's status list updated;
items 24–26 and 29 are on hold.

**Staging and test-gated publishing (owner's request, same day).** Before,
the live site rebuilt whenever someone pushed to its branch, without
waiting for the tests. Now (`.github/workflows/site.yml`):
- Push to `staging` → tests → the staging copy at
  <https://shibl.github.io/sindibad/staging/>. Merge into `main` → tests
  → the live game. Nothing is published when tests fail.
- GitHub Pages still builds from `claude/sharp-hawking-0380ax` (changing
  that needs the owner); that branch is now the website branch, written
  only by the workflow. Each publish replaces only its own part (the top,
  or `staging/`), so a failing branch never reaches the site. Jekyll is
  off (`.nojekyll`): files are served as they are, as on a local server.
- Staging shares the website with the live game, so it keeps its own
  saves (`sindbad-staging.…`) and offline copy (`sindbad-staging-…`):
  `Web/core/env.js`. It wears a small pink «نسخة تجريبية» tag. Live
  players' saves and offline copy are unchanged.

**Tested**: `npm test` has a new "staging copy" section (own saves, own
offline copy, both offline copies side by side, the live game doesn't see
a child saved in staging). The publish steps were run against a local copy
of the repository: publishing main, then staging from an out-of-date
checkout (it catches up and retries), and an empty commit (refused, the
site is untouched). The resulting website, served locally, showed both
copies working side by side with no errors.

Then: each publish shows under Deployments on GitHub (`github-pages` for
the live game, a new `staging` environment for the staging copy) and turns
green only once GitHub Pages has rebuilt the website (it waits up to 10
minutes and fails if the build fails). Checked on GitHub: the workflow's
own push does start the Pages rebuild. Required checks on `main` and a
locked website branch still need the owner (item 23).

## Playtest notes — 2026-10-12 (the farm island)

Owner's request: a new island, «مزرعتي السعيدة», "like Hay Day", 3D and
high quality, mapped to the grade-6 agriculture book (159 pages, read in
full first; its four units summarised in the session), in Arabic, with a
helper the child chooses (a bee, a cow, a puppy, a kitty). "The kids must
understand the book away from boring reading: by playing."

**Built:**
- `core/farm/` — a 3D farm in three.js (r170, kept in `vendor/three/`,
  loaded only when the child sails there): an island with a beach and a
  shader sea, six fields, a red barn and silo, the Shami cow's pen, a
  dairy, beehives in a meadow, a windmill, an orders board and a trading
  dhow at the dock. Every model is made in code, merged into one mesh each.
  Drag to look around, pinch or wheel to zoom, tap to choose.
- Seven quests from the book, in order: potato, tomato (`أزرع خضرواتي`),
  the cow (`مزرعتي الصغيرة`), village cheese (`أصنع الجبن البلدي`), the
  beehive (`مصنع العسل` ١ and ٢), cotton (`الذهب الأبيض`), sugar beet
  (`الجذر العجيب`). The tool tray is the question; small choices check the
  book's facts (two-bud potato piece, planting depth and season, the
  thermometer at 85 °C then 42 °C, a balanced meal with one feed of each
  kind, find the queen, order the bee's life cycle, pick only red
  tomatoes). Weeks pass in a day–night time-lapse naming the book's
  durations; cotton is picked in three rounds, bottom bolls first.
- Helpers: chosen on the first visit (changeable from 📜). Tap the helper
  for a hint; after two wrong jobs it names the right one. Special moments:
  the bee pollinates tomato and cotton flowers (+2), the kitty chases a
  field mouse at the potato and beet harvests (+1), the puppy sniffs out
  weeds (+15 ⭐), the cow helper makes the Shami cow happy (+1 milk).
- Stars: each quest is a topic in `plugins/agriculture/` (region `farm`);
  the farm calls `recordResult()` (new in `core/lesson.js`). The topic's
  own lesson is a short quiz or sort that spaced review brings back.
- Barn, orders sold by ship (coins and farm levels), decorations bought
  with coins (Damask rose, jasmine arch, scarecrow, fountain, lanterns —
  each with a fact from the book), six farm stickers in the album.
- The sea map: the farm sits by the home port with its own short route
  (`from: 'home'` in `worlds/grade6.js`).

**Tested:** `npm test` has a farm section: data checks (every job is in
its tray, every choice has a right answer), choose a helper, a wrong job
explained, the tray and the helper's words fit a phone, the potato quest
played to the end (one wrong job → 2 stars), the next quest opens, an
order sold, a reload keeps the farm, and the farm loads offline. All seven
quests were also played automatically to three stars, and screenshots were
checked at 320×568, 360×740, 390×844 and 1024×768. The farm's test uses a
second Chromium allowed to draw WebGL in software (the test server has no
graphics card); the other tests keep the normal browser.

**Found / decided:**
- Size: the whole game is now about 1.6 MB (three.js is 0.66 MB, 0.17 MB
  zipped); the target is under 35 MB.
- In software-drawn WebGL the farm runs at ~10 fps; real phones draw with
  their graphics chip. Not yet tried on a real budget phone (item 10).
- The book has a few mistakes to avoid when more quests are added: it says
  amber comes from beehives; the roof rainwater numbers (p.45) don't add
  up; the Damask rose's planting months read "December and February".

**Next items:**
32. [ ] More farm quests from the book: the silage pit (feeds the cow),
    water harvesting (a rain tank for the fields), biogas (dung → gas for
    the dairy and fertiliser), the Damask rose and jasmine from cuttings,
    the greenhouse, apples and citrus, silkworms, apple vinegar, the plant
    doctor (pests and natural enemies), soil, propagation, organic farming,
    the ecological footprint. Each: a crop or task, a quest, a review topic.
33. [ ] Real-device check of the farm on a 2 GB Android phone: frame rate,
    memory, lite mode (no shadows), time to first load.
34. [ ] Give every helper a special moment in every quest (today the cow
    helper only shines in the cow quest).
35. [on hold — teacher review comes later] Teacher review of the farm's
    content (`worlds/grade6/farm.js`, `plugins/agriculture/`).

**Later the same day (owner's report):** on staging the farm didn't show:
the browser kept showing the old offline copy. Two fixes:
- A new version now replaces the old one by itself: the service worker
  downloads the new files straight from the server (`cache: 'reload'`; the
  browser's own 10-minute cache could hand it the previous version's
  files), and the page reloads when the new version takes over — only on
  the title screen, the voyages chart or the sea map, never mid-lesson
  (`app.js`). Players who still run an older copy see the new one after one
  more reload; from then on it is automatic.
- Sound kept playing in another tab: all game sound (music, sea, effects)
  now pauses when the game is in the background and resumes on return
  (`core/sound.js`), and read-aloud stops.
`npm test` checks both: a new version reloads the title screen and
replaces the old offline copy; switching tabs silences the game.

## Playtest notes — 2026-10-12 (a 3D sea map, to compare)

The owner asked whether grade 6 needs a new theme. Recommendation: keep
the sea voyage story and update the look, starting with the sea map. A 3D
sea map is now on the staging copy (SPEC: "The 3D sea map (preview)"), with
a "2D / 3D" button to compare it with the flat map; the live game is
unchanged.

**What it is:** a turquoise sea with shallows, foam and little wave marks;
seven islands with their landmarks made in 3D (the farm reuses the farm
island's models); dotted routes; clouds and misty silhouettes over locked
islands, which part when the fog lifts; the dhow with the hero and Hudhud
on deck (their usual drawings) and a wake when it sails; a golden ring on
the island to try next; a whale, gulls, the lighthouse beam, volcano smoke,
the windmill. Day, sunset and night. Drag to tilt the view; it eases back.

**Checked:** screenshots at 360×640, 390×844 and 1024×768, day, sunset and
night; sailing ashore and back; the fog lifting; every island open; offline.
`npm test` covers it (with `?map=3d`) and checks the live game keeps the
flat map. About 100 draw calls; not yet tried on a real budget phone.

**Next items:**
36. [ ] Decide: 3D sea or flat map for the live game (owner, after trying
    staging on a phone). If 3D: make it the default, keep the flat map as
    the fallback, and check item 37 first.
37. [ ] Real-device check of the 3D sea on a 2 GB Android phone (with item
    33): frame rate, battery, memory with the farm open too.
38. [ ] If 3D stays: bring the walkable islands' look closer to it (they
    are drawn in 2D today), one island at a time.


## Playtest notes — 2026-10-12 (the music island, and the digits 1 2 3)

The owner asked for a music island made from the grade-6 music book
(«التربية الموسيقية»، 72 pages, read in full), "very creative, engaging and
artistic", allowed a different vibe, and showed a toy-diorama city-builder
board as the look to aim for. Built: «جزيرة الأنغام» (SPEC: "The music
island (3D)"), open from the start, a side trip from the letters island.
The owner also asked that all numbers be written 1 2 3, not ١ ٢ ٣: done in
the whole game (SPEC: "Numbers: the digits 1 2 3").

**What it is:** a tall toy island in sunset light: terraces, a winding path
with note lanterns and bunting, puffy trees, people walking, and eight
places on raised bases — the giant grand piano (its keys play), the glass
pavilion, the drum circle round a fire with a big darbuka, the metronome
tower with the book's orange note-car racing round its track, the cloud
raining onto a grand-staff sculpture with red and yellow clefs, the
Damascene music library, the black-basalt theatre with its audience and
spotlights, and the harbour of world instruments. Ten quests (all twenty
lessons and the projects), played with small music games and real sounds
made in code: keys, whole/half tones, the staff, rhythm cards, the drum,
measures, sorting forms, filling glasses by fractions and playing them.
The helper «نغمة» explains every step. Golden notes on a rainbow gate; ten
make the «sky song». Six stickers, one per matching quest.

**Digits:** `num()` now writes 1 2 3 (and a dot for decimals); every
hard-coded ١٢٣ in the game's code and content was rewritten (417 places:
the maths and farm lessons, the about page, dates via `ar-SY-u-nu-latn`,
`٪` → `%`). The parents' gate still accepts either kind of typed digit.
The questions themselves did not change, only how their numbers look.

**Checked:** read every page of the book; screenshots of every kind of step
at 390×844 and the island at 1024×768; all ten quests played to three
stars by script with no console errors; the flat map and the 3D sea show
the new island. `npm test` has a music-island section (well-formed quests,
the piano lesson with a wrong key → 2 stars, the rhythm lesson with the
drum → 3 stars, golden notes, reload, offline). About 80 draw calls
(70 in lite mode); not yet tried on a real budget phone.

**Next items:**
39. [ ] Real-device check of the music island on a 2 GB Android phone (with
    items 33 and 37): frame rate, sound timing of the drum step.
40. [ ] Sing along: the book's songs could get their melodies on the piano
    (their lyrics belong to their poets: ask the developers before adding
    any words).
41. [ ] A free-play «concert» mode: record a short tune on the piano or the
    glasses and play it back on the theatre stage.
42. [on hold — teacher review comes later] Teacher review of the music
    island's content (draft, from the book).

## Playtest notes — 2026-10-13 (teach before asking: «أتعلّم»)

The owner played the music island and said it moved to the quiz straight
away: "we should teach the kids before we make them solve things… in an
interactive nice way". The quests did open with a card, but a card is
reading, not teaching.

**Built:** a shared teaching step, «أتعلّم» (`core/learn/explore.js`; SPEC:
"The music island (3D)" → "Taught first"). A picture with glowing spots;
each tap opens one small idea (a title and a sentence), plays it, lights
it (keys light, the 3D piano presses, the glasses ring, the note-car races)
and ticks it off. Guided tours open one spot at a time with a bouncing 👆.
Only when every spot is found does «فهمت» lead on, and the questions
follow. Never scored. Every one of the 22 old teaching cards in the
ten music quests is now a discovery: walking up the piano key by key,
counting the black keys, measuring each whole / half tone, the parts of
musical theatre on a dark stage, portrait cards for al-Qabbani, al-Sunbati
and Mendelssohn, the voice range, solo vs choir by ear, ♯ ♭ ♮ shown on the
piano, the key signature, note lengths you hear held, measures and
anacrusis, the grand staff part by part and note by note, a tempo slider
that finds Largo → Presto, the world's instruments by sound, Guido's
manuscript line by line, the letters A–G, and the eight glasses. Lesson
dots show teaching steps as blue squares.

Also: the drum step no longer cuts off a child who starts late (time's
up only after the rhythm could have ended), which was failing CI on the
slow test machine.

**Checked:** all ten quests played to three stars by script, no console
errors; screenshots of every discovery step at 390×844 (fixed: a black
key that jumped out of the piano while glowing, a key-signature picture
too small to read). `npm test` checks every quest opens with «أتعلّم» and
walks the piano tour (no skipping, one key at a time).

## Playtest notes — 2026-10-13 (the science island)

The owner gave the grade-6 science book, semester 1 (120 pages, read in
full, page by page, by four readers working in parallel) and asked for the
science island to be "creative and great", "high end", and to teach before
it asks. Built: «جزيرة العلوم» as a 3D island (SPEC: "The science island
(3D)"); the old walkable science island and its seven topics were retired.

**What it is:** ten places in four districts (one per unit), seventeen
quests (one per lesson), 46 «أتعلّم» teaching steps drawn from the book's
experiments, and the book's own question formats (the shared
`core/learn/steps.js`, ready for other islands). A lighthouse lights one
crystal per quest; «شرارة» the lab robot helps.

**Content choices to check with educators** (all draft):
- Habit cards (urinary health): the book's «المشروبات الكحولية والغازية
  بكثرة» became «المشروبات الغازية بكثرة» for young players.
- Left out as unclear in the book: the fishing rod and the oar as lever
  examples; "the rope is not a part of the pulley"; the football question
  of worksheet 2 (no option fits); the relationship clock (worksheet 1).
- The dust-card experiment shows example results (the book prints none):
  "the yard card was the dirtiest in our experiment".
- A few facts not printed in the book were added to explain: «المقذرة»
  glossed as "an opening at the end of the body"; birds have no bladder
  "to stay light" was not used as a fact, only the book's "adaptation".

**Checked:** all seventeen quests played to three stars by script, no
console errors; screenshots of every teaching step at 390×844 (fixed:
parts hidden under other parts, a ramp picture that went blank, a knob
that spun away, overlapping labels, arrows too short, text written
backwards). `npm test` has a science-island section: well-formed quests,
every view and part exists, teaching first, three quests played (one with
a wrong sum → 2 stars), crystals, reload, offline. About 34 draw calls.

**Next items:**
43. [ ] Real-device check of the science island on a 2 GB Android phone.
44. [ ] Semester 2 of the science book, when the owner shares it: more
    quests on the same island (or a second district).
45. [ ] Richer animals and people in the forest and pond (they are simple
    toys now); a skier on the friction slopes that really slides.
46. [on hold — teacher review comes later] Teacher review of the science
    island's content (draft, from the book).

## Playtest notes — 2026-10-13 (the atlas island)

The owner gave the grade-6 social studies book, semester 1, and asked for
its island to "include the globe and its countries, flags, names meanings
so kids get to learn them, and also flags meanings, currencies… resources,
like an atlas", teaching before asking. Built: «جزيرة الأطلس» as a 3D island
(SPEC: "The atlas island (3D)"); the old walkable social studies island and
its five topics were retired. The science island and the atlas island now
share one engine (`core/isle/`).

**What it is:** thirteen places in five districts (one per unit),
twenty-five quests, 100 «أتعلّم» teaching steps (maps drawn from the real
shapes of the world, timelines, cards), the shared questions, and the atlas
globe: 170 countries to tap, 71 with a full card (flag drawn in code,
capital, currency, language, the meaning of the name and of the flag,
resources, a fact), and two games. «سهيل» the star explorer helps; the
travellers' compass lights one ray per quest; six new stickers.

**Map decisions (to confirm with the developers):** as in the Syrian
textbook, Palestine is drawn whole and Western Sahara as part of Morocco;
Somaliland is drawn with Somalia, northern Cyprus with Cyprus, Kosovo with
Serbia, Taiwan with China. The book's "usurped lands" lists are not quizzed.

**Content choices to check with educators** (all draft):
- Left out: the usurped-lands map, the Iraq box and its question, the
  colonialism line, the "Islamic system" legitimacy text; Carthage's
  religion and wine imports; the Roman canal (the book's 117 BC date looks
  wrong); "who won at Kadesh"; the terms of the peace of Alexandria (the
  book doesn't give them); the Ceuta and Melilla box; unit 5 lesson 5 (not
  in the PDF); open projects and "in your opinion" questions; the routes of
  map 7.
- Shown but not quizzed (unclear in the book): 7% (only the main text's 5%
  is used), the day of Omar al-Mukhtar's death (only 1931), Zuhayr's date
  (65هـ), and "Algeria is first in Arab oil and gas".
- Added to explain (not printed in the book): the Suez Canal shortens the
  way from Europe to Asia; Herodotus's "gift of the Nile"; why mountain
  terraces work; examples of rights and duties; minerals, oil and gas don't
  renew; «رابح» means exports exceed imports; Gibraltar links two seas;
  al-Aqsa is in Jerusalem; Cartagena is not Carthage; Iberia is in
  south-west Europe; Libya spans 33 − 19 = 14 degrees of latitude (read off
  the book's map).
- The atlas cards (not from the book): Syria's currency after the new
  pound (name and code SYP); what the three stars of Syria's flag stand for
  (the card only describes them); Cyprus under Asia and Russia under Europe
  (as Natural Earth); capitals that recently changed (Indonesia, Burundi,
  Bolivia, Sri Lanka, Equatorial Guinea); the official languages of Mali
  and Niger; Iran's currency; religious meanings in the flags of Jordan,
  Bahrain, Morocco and Pakistan. Palestine's card shows no currency.

**Checked:** all twenty-five quests played to three stars by script, no
console errors; every map and timeline drawn with all its places found and
looked at (fixed: names cut off at the edges, names on top of each other,
seas off the map, a country's name hidden under its neighbour, timelines
with the date and the name swapped); a checker for overlapping names runs
over every map. The globe: a tapped country turns to the free space above
its card; the flag game. `npm test` has an atlas section: well-formed
quests, every map place exists, teaching first, two quests played, the
globe's card and flag game, reload, offline. About 27–42 draw calls.

**Next items:**
47. [ ] The developers confirm the map decisions above.
48. [ ] Real-device check of the atlas island and the globe on a 2 GB
    Android phone (the globe's texture is 2048×1024, 1024×512 in lite mode).
49. [ ] Semester 2 of the social studies book, when the owner shares it.
50. [ ] Full cards for more countries (102 show only their name, continent
    and capital).
51. [on hold — teacher review comes later] Teacher review of the atlas
    island's content and the country cards (draft).

## Playtest notes — 2026-10-13 (every island open on staging)

**Owner's request:** "on staging make everything opened, like the islands
opened." On the staging copy (`STAGING` in `core/env.js`) everything is
open from the start:
- every island: no fog, no stars needed, no fog-lifting scene (`core/map.js`);
- the gates on the walkable islands (`core/overworld.js`);
- every farm task and crop, played as practice that still earns stars; the
  farm's own story still moves one task at a time (`core/farm/farm.js`).

The live game is unchanged. The other grades' voyages stay "coming soon"
(they have no lessons yet). The lessons on the music, science and atlas
islands were already all open.

**Tested:** `npm test`: the staging section now checks that every island
on the staging map is open; the first section still checks that the live
game starts with four islands under fog and that closed gates keep the hero
out. By hand in a test browser: on staging, 0 islands under fog, the maths
island's gate open, 0 of 7 farm tasks locked; on the live copy, 4, closed,
6 of 7.

## Notes — 2026-10-17 (tools and tests start moving to TypeScript)

**Developers' request:** start moving the code from JavaScript to
TypeScript, easiest parts first, without breaking anything.

The game has no build step, and that stays: the browser loads plain `.js`,
and the service worker caches it. So this round moves only the maintainer
code that runs in Node, which runs `.ts` files as they are (it strips the
types; Node 22.18+):
- `tools/update-shell.mjs` → `tools/update-shell.ts`;
- `tests/check-shell.mjs` → `tests/check-shell.ts`;
- `tsconfig.json` and `npm run typecheck` (TypeScript 7.0.2, strict). It
  allows only what Node can strip (`erasableSyntaxOnly`), and runs first in
  `npm test`, so the tests on GitHub check the types too.

No game file changed: `service-worker.js` and its version are the same, so
players download nothing new.

**Tested:** with the types stripped, both files are the same code as before.
`node tools/update-shell.ts` rewrites `service-worker.js` byte for byte;
`check-shell.ts` still fails on a stale file list, and `tsc` on a type
error. `npm test` passes.

**Next:**

52. [ ] `tools/make-world.mjs` → `.ts`, with the next change to the atlas
    shapes: its output names the script in `worlds/atlas/shapes.js`, a game
    file, so renaming it alone would make every player download the game
    again. (The comment in `service-worker.js` that still said
    `update-shell.mjs`: fixed 2026-10-17, with the farm fix.)
53. [ ] `tests/e2e.mjs` → `.ts` (types for Playwright come with it; the test
    hooks on `window` need a small declaration file).
54. [done 2026-10-17: `.ts` sources, `.js` made by `npm run build`, see the
    next notes] The game's own code: decide with the developers how. Either check
    the plain `.js` with TypeScript (`// @ts-check` and JSDoc types, no build
    step, no change to what players download), or write `.ts` and add a
    build step (a bigger change: local preview, the offline file list and
    publishing would all need it). The first is the safe start, beginning
    with small modules that use no DOM (`core/format.js`, `core/ranks.js`).

## Notes — 2026-10-17 (the farm went white; the first game files in TypeScript)

**Bug (from a developer's phone):** the farm island showed only its buttons
on a white screen, with a small broken-picture icon in the corner.

**Why:** a phone's browser lets a page keep only a few 3D views (WebGL
contexts) at once, and takes away the oldest when there are too many. The
atlas globe made a new 3D view each time it opened and never gave it back
(`renderer.dispose()` does not free it). So after opening the globe a few
times, the farm, usually the oldest, lost its 3D view, and nothing drew it
again. Reproduced in Chrome on an Android emulator (2 GB): the farm went
white after opening the globe 7 times (15 times in desktop Chrome).

**Fix:**
- The globe gives its 3D view back when it closes (`forceContextLoss`).
- The 3D islands (farm, music, science, atlas: `createStage`) watch for a
  lost 3D view. If the browser gives it back, three.js carries on. If not
  (within a second, or when the child comes back), they make a new renderer
  for the same scene, with the same touch controls.

**TypeScript:** the developers asked for the fix in TypeScript, so the
game's first TypeScript files arrive with it: `core/farm/scene.ts` and
`core/atlas/globe.ts`. The browser still loads plain `.js` (no build step to
play or preview): `npm run build` (`tools/build.ts`, `tsconfig.game.json`)
makes `scene.js` and `globe.js` from them, and `tests/check-build.ts` fails
if a `.js` no longer matches its `.ts`. Types for three.js come from
`@types/three` 0.170 (`vendor/three/three.module.min.d.ts`). Apart from the
fix, the code is the same: compiled the same way, the old and new files
differ only by the fix.

**Tested:**
- `npm test`: two new checks, a farm whose 3D view is taken away draws
  again by itself, and closing the globe gives its 3D view back.
- Desktop Chrome (phone size) and Chrome 133 on an Android 16 emulator
  (2 GB, Mac GPU): the globe opened 12–25 times and the farm keeps its 3D
  view; a farm whose 3D view is taken away draws again, whether the child
  is on it or comes back to it, and can still be dragged and tapped.
- On the emulator, normal play with the old and the new code showed no
  GPU-process crashes. One run of the long check had one emulator
  GPU-process crash, and the game recovered from it (all later checks
  passed). Not chased further.

**Next:**

55. [ ] Real-phone check on a 2 GB Android phone: open the globe 10 times,
    then the farm, the music and science islands; nothing goes white.
56. [ ] The 3D sea map (staging only, `core/sea/sea.js`) has its own
    renderer without this recovery: give it the same (or reuse
    `createStage`).
57. [ ] More game files to TypeScript, smallest first (`core/format.js`,
    `core/ranks.js`), with `npm run build`.

## Playtest notes — 2026-10-18 (the art and English islands; the game on a phone)

Built:
- **«جزيرة الألوان»** (core/studio/): the whole grade-6 art book, 25 quests,
  one per lesson in the book's order, at fifteen places on a 3D island. Ten
  hands-on games play the book's «أحاول» (mix, paint, vanish, fold,
  collage, pattern, mirror, gallery, press, craft); the gallery at the
  harbour hangs one painting per finished quest; «مرسمي» (easel.ts) for
  free drawing with mirror and mandala symmetry; six stickers.
- **«جزيرة Hello»** (core/english/): the English book, 24 quests (twenty
  units, four revisions), a seaside town of twelve places, ten games, the
  word book with flash cards.
- **On a phone**: vibrations (core/haptics.ts) for touches, right and wrong
  answers and rewards, with their own switch in ⚙️; touch rings, hold to
  hear, the back button, drag-to-sort, sparkles on right answers.
- **TypeScript**: sound, settings, voice, haptics, touch and the easel.

Tested: every art quest played to full marks at 360×740 and 320×568
(scratch harness), the e2e suite (art and English islands added).
Broke on the way: the perspective game's horizon and trees never showed on
a real phone (SVG `<g>` has no `.hidden`), found by a writer and fixed.

Next:
- Teacher review of the art and English content (draft).
- The `turkey` painting (lesson 19) reads poorly on its light ground.
- Two more children's paintings for lesson 24's gallery.
- Lesson 8's clay mask (p. 28) is not played yet.

## Playtest notes — 2026-10-25 (Arabic / English mode, #18)

- Added a persistent **العربية / English** choice before starting and during
  play. Arabic is the default; English changes navigation to LTR. The device
  preference is stored separately for staging and production and cached offline.
- Added an offline English catalogue for the app shell, island and lesson
  navigation, settings, parents, story, shop, rewards, the About page and all
  curriculum display text: questions, hints, explanations, facts and dialogue.
  Original source questions and answer identifiers stay unchanged. English
  guidance preserves the target words and endings of Arabic exercises.
- Language changes update text and accessible labels in place. They preserve
  current questions, partial answers, 3D scenes, hero choice and saved progress.
  Player names are escaped and explicitly excluded from translation.
- Regression coverage: 320×568, 360×740 and tablet; first-run and returning
  players; both switch directions; a partially filled fraction bucket; original
  Arabic exercises; in-progress 3D exploration; reload, offline, storage failure
  and staging isolation. Full existing end-to-end suite is also required.
- Fixed during visual checks: long English hero controls overflowed at 320 px,
  title links overlapped the logo, and a tall settings card covered its close
  button. Compact layout and scrollable settings keep these controls reachable.
- Long English lesson cards now scroll their explanations while keeping the
  Next button visible. Translation review corrected anatomy, force/lever and
  grammar terms, protected mathematical signs and values, and distinguished
  the answer “No” from the solfège note “La”.
- Fixed a shared island-test retry race exposed during the full run: a click could
  advance the lesson before Playwright returned, then the retry waited for an
  answer that had already been removed. Retries now retain the original element;
  completion, score and persistence assertions are unchanged.

Next:
- Confirm the interface wording and layout on the developer's real phone.
- Educator review of the English curriculum wording (draft); see translation notes.


## Playtest notes — 2026-10-25 (developer feedback on #18)

- Removed the visible Language / اللغة label from the game and About page;
  only العربية and English remain. The accessible group labels are retained.
- Corrected English names throughout the map, dialogue, review introductions
  and About page: Number Island → Numbers Island, Letter Island → Letters
  Island, Colour/Color Island → Colours Island, Melody/Song Island → Melodies
  Island. The corresponding “island of …” variants use the same names.
- Corrected the two Numbers Island completion messages from “The island of
  numbers has completed!” to “You completed Numbers Island!”
- Fixed the English map controls: Voyages stays at the start edge and the
  2D/3D toggle moves to the opposite edge, preserving the Arabic arrangement.
- Validation: typecheck, generated files, offline manifest, content and language
  suites passed. Browser checks passed at 320, 360 and 1440 px: both languages,
  plural map labels, separate click targets in 2D and 3D, Voyages navigation,
  and the two language buttons on the game and About page. Main's workflow
  runs the full gameplay suite before publication.
- Staging Actions tests are paused at the owner's request; automatic staging
  deployment remains enabled and publishes immediately. Main still requires
  passing tests. The duplicate local full run was stopped after the focused
  checks passed.

Next:
- Developer playtest of the published main version.
- Educator review of the draft English curriculum.

### Language selector placement (2026-10-25)

- The language buttons sit at the end of the top bar: right in English, left
  in Arabic. Their order follows LTR/RTL, while each language name keeps its
  own text direction. The About page uses the same placement.
- Browser checks passed at 320, 360 and 1440 px for placement, order and
  viewport fit in both languages on the game and About page.

### Floating language controls (2026-10-25)

- Removed the solid full-width language strip. The two buttons float directly
  over the scene, with a light translucent background on the inactive button.
- The title no longer reserves the strip's height. Small screens keep the logo
  below the floating controls; existing gameplay HUD spacing remains intact.
- Verified a transparent, content-width overlay with no logo overlap at 320,
  360 and 1440 px in both languages. The language browser suite passed,
  including partial answers, 3D exploration, offline use and settings access.


## Studio website import — 2026-10-25

- Replaced the former `studio/` site with the requested `Studio/Web`,
  `Studio/Android`, `Studio/iOS`, and `Studio/Infra` layout. Website source
  lives directly in `Studio/Web`; there is no repository redirect wrapper.
- Imported the bilingual Sindibad Studios website and The Curriculam pages,
  including all twelve grade routes and the seven-experiment Chemistry Lab.
  The existing grade-6 game and root native applications are unchanged.
- Hero code includes automatic five-second slides, progress pagination and
  shaped reveals. The splash uses reference vector keyframes and animated
  text tracking. Vertical scrolling uses Lenis, with native horizontal
  scrolling in the gallery.
- Source review only: the owner explicitly prohibited browser use, builds,
  HTTP checks, syntax checks and tests. No runtime or visual pass is claimed.
- Next: owner review of the intro/hero and scrolling; future studio native
  app and infrastructure work belongs in its corresponding directory.
