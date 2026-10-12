# رحلات سندباد وياسمينة — Sindbad & Yasmina's Journeys

A free, open-source, offline-first educational web app that turns the
Syrian national curriculum (grades 1–12) into an RPG-style adventure.

- **Project spec**: see [`SPEC.md`](./SPEC.md) — read this first.
- **Work queue**: see [`BACKLOG.md`](./BACKLOG.md) — the living backlog and
  playtest log; pick the top open item, implement, test, and append notes.
- **How to add or change things**: [`WORKFLOW.md`](./WORKFLOW.md).
- **Play it**: <https://shibl.github.io/sindibad/> (the staging copy, for
  developers: <https://shibl.github.io/sindibad/staging/>)
- **About the project** (Arabic, for developers and founders): the
  project brief as a long-form web page — [`Web/about.html`](./Web/about.html), live at
  <https://shibl.github.io/sindibad/Web/about.html> (also linked as «ℹ️ عن
  المشروع» on the game's title screen).
- **Original project brief** (Arabic): [`docs/original-project-brief.md`](./docs/original-project-brief.md)
  (text, with a list of where the game stands) and the original
  [PDF](./docs/original-project-brief.pdf).
- **Concept demos** (throwaway animation sketches, not production code):
  [`Web/demos/`](./Web/demos/)

## What's playable now

**Twelve voyages, one per school grade** («خريطة الرحلات»), grouped by the
brief's four age stages. Voyage 6 is open; the other eleven are locked
until their worlds are built.

**Grade 6** (الصف السادس): pick Sindbad or Yasmina, sail a fog-covered
archipelago guided by Hudhud the hoopoe, and learn through 32 short
lessons — Arabic grammar, fractions/decimals/percent, angles, science,
and Syrian geography — each starting with an illustrated mini-lesson.

**The farm island** («مزرعتي السعيدة»), open from the start: a 3D farm
where the grade-6 agriculture book (التربية الزراعية) is played, not
read. Pick a helper (a bee, a cow, a puppy or a kitty), then plough,
plant, care for and harvest potatoes, tomatoes, cotton and sugar beet in
the book's order; feed and milk the Shami cow; make village cheese; open a
beehive. Seven quests, one per book lesson, each worth stars like any
lesson; harvests are sold to the ship for coins that buy decorations.

**The music island** («جزيرة الأنغام»), open from the start: a 3D toy
island where the grade-6 music book (التربية الموسيقية) is played with
real sounds. Eight places along a winding path — a giant grand piano, a
glass pavilion, a drum circle round a fire, a metronome tower with the
book's note-car racing round it, a cloud raining notes onto the grand
staff, a music library, a black-basalt theatre (after Bosra's) and a
harbour of world instruments. Ten quests cover all twenty lessons and the
projects: play the major scale, find the half tones, sharps and flats,
key signatures, rain notes onto the staff, hear a rhythm and tap it back
on the drum, fill measures, tempo terms, the Longa and the fugue, the
monologue and the choir, Guido's note names and the letters A–G, folk
instruments of the world, and tuning eight water glasses by the book's
fractions before playing them. The helper «نغمة» (a purple note) explains
every step; each quest hangs a golden note on the rainbow gate, and ten
notes play the «sky song». Between quests the piano, the darbuka, the
metronome and (once made) the glasses can be played freely.

All numbers in the game are written with the digits 1 2 3 (owner decision
2026-10-12).
Lessons are played in different ways: multiple choice, sorting, sailing
a number line, steering the ship by an angle, paying at the market,
filling a waterwheel's buckets, and building sentences from word blocks.
Stars lift the fog, islands award badges, finished topics come back for
spaced review, and the treasure island ends with a certificate. Works
fully offline after the first visit; progress stays on the device.

## Running locally

No build step. Serve the repo root over http and open it in a browser:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/  (it forwards to the game in Web/)
```

(Opening `Web/index.html` directly from disk won't work: the app uses ES
modules and a service worker, which both need http(s) or localhost.)

Handy URL switches: `?time=day|sunset|night` (sky), `?lite=1|0` (force
low-end mode on/off).

## Tests

```sh
cd Web
npm install   # once — installs Playwright for the headless tests
npm test      # offline cache-list check + end-to-end play-through
```

After adding or changing any file, run `node tools/update-shell.mjs` (in
`Web/`) so the service worker caches it for offline play (the test fails
otherwise).

## Publishing

- Push to `staging` → tests → the staging copy at
  <https://shibl.github.io/sindibad/staging/> (marked «نسخة تجريبية»,
  with its own saves).
- Merge into `main` → tests → the live game.

Nothing is published when tests fail. Each publish shows under
Deployments on GitHub (`github-pages` = live, `staging`). Details: step 5 of
[`WORKFLOW.md`](./WORKFLOW.md) and `.github/workflows/site.yml`.

## Layout

- `Web/` — the game (a web app that also installs to the home screen).
  Everything below lives in it.
- `Android/`, `iOS/` — reserved for future native apps; not started.
- `docs/` — the original brief (PDF and Markdown) and screenshots.
- `index.html`, `service-worker.js` (top level) — only forward the live
  site to `Web/` and clear old offline copies from before the move.

Inside `Web/`:

- `index.html`, `style.css`, `app.js` — app shell: screens, backdrop, boot.
- `about.html` — the project brief as a long-form page for developers and
  founders (self-contained; light/dark; IBM Plex Sans Arabic with system
  fallback offline).
- `core/` — the engine: map, lesson runner, topic registry, save data,
  sounds, journey page, finale. Never changes when content is added.
- `worlds/chapters.js` — the twelve voyages (one per grade) and the four
  age stages; `core/chapters.js` draws the voyages chart.
- `worlds/grade6.js` — the grade-6 islands, positions, unlock rules, badges.
- `core/farm/` — the 3D farm island (`farm.js` game, `scene.js` camera and
  light, `models.js` every model, made in code); its content (crops, steps,
  helpers, quests, orders) is `worlds/grade6/farm.js`, its quick reviews
  `plugins/agriculture/`.
- `core/sea/` — the 3D sea map, a preview on the staging copy (`sea.js` the
  sea, ship, fog and camera; `models.js` the islands' landmarks, made in
  code). `core/map.js` picks it or the flat map; both share the island labels.
- `core/learn/explore.js` — «أتعلّم», the teaching step every 3D island
  quest opens with: a picture with glowing spots, each tap opens one idea;
  the questions come when every spot is found. Islands give it their own
  pictures (the music island's are in `core/tunes/games.js`).
- `core/tunes/` — the 3D music island (`tunes.js` game, `games.js` the
  little games each quest step is played with, `synth.js` the instruments,
  made with Web Audio, `models.js` every model, made in code); its content
  (stations, quests, steps) is `worlds/grade6/tunes.js`, its quick reviews
  `plugins/music/`. It reuses the farm's camera and light (`core/farm/scene.js`).
- `vendor/three/` — three.js r170 (MIT), kept in the game so the farm, the
  music island and the 3D sea work offline. Loaded only when a child sails
  to one of them (or, on staging, when the 3D sea map is on).
- `plugins/` — topics and reusable game engines. **Adding a lesson:** see
  [`Web/plugins/README.md`](./Web/plugins/README.md).
- `art/art.js` — all art as inline SVG (heroes, Hudhud, dhow, islands…).
- `fonts/` — Baloo Bhaijaan 2 (SIL OFL), bundled for offline use.
- `manifest.json`, `service-worker.js`, `icons/` — PWA / offline support.
- `tools/`, `tests/` — maintainer scripts and tests (not shipped logic).

## Feedback

For now, feedback comes only from the developers, given to Claude in Claude
Code sessions; there are no public feedback forms. The agent's rules are in
[`CLAUDE.md`](./CLAUDE.md), the steps for every change in
[`WORKFLOW.md`](./WORKFLOW.md). Every pull request is tested
(`.github/workflows/site.yml`).

## License

- Code: MIT or GPL (open source).
- Educational content & art: CC-BY-SA.
- No ads, no personal data, no monetization — ever.

## Status

First playable grade (6) complete; content is a draft awaiting educator review. See BACKLOG.md for the work queue.
