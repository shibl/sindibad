# Backlog

Read SPEC.md first. This file is the project's persistent memory across
sessions — each work session should pick the top open item, implement it,
test it, then append a new "Playtest notes" entry with proposed next items.

Conventions:
- Keep items small enough to finish (implement + test) in one session.
- Mark an item `[in progress]` when you start it and `[done]` with a one
  line result when you finish it — don't delete finished items, they're
  the project history.
- Every session ends by appending a dated `8. [ ] Educator review of all grade-6 content (Arabic grammar terms,
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

## Playtest notes — <date>`
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

## Playtest notes

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
14. [ ] In-world challenges without leaving the island: short questions
    asked inside the dialogue box (keep the full lesson for replays).
15. [ ] Pearls buy things: ship paint, sails, a hat for the hero, a
    perch for Hudhud — gives pearls a purpose.
16. [ ] More walk-on puzzles: push-block "balance" puzzle for fractions,
    a word-order door for إن وأخواتها, a noria that lifts water only when
    the right volume is chosen.
17. [ ] Island music: a tiny synthesized oud-like loop per island
    (Web Audio, no files), with a mute toggle.
18. [ ] Accessibility: a "read aloud" button on dialogue (speechSynthesis,
    Arabic voice when available) for weaker readers.
