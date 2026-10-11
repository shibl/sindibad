# رحلات سندباد وياسمينة — Sindbad & Yasmina's Journeys

A free, open-source, offline-first educational web app that turns the
Syrian national curriculum (grades 1–12) into an RPG-style adventure.

- **Project spec**: see [`SPEC.md`](./SPEC.md) — read this first.
- **Work queue**: see [`BACKLOG.md`](./BACKLOG.md) — the living backlog and
  playtest log; pick the top open item, implement, test, and append notes.
- **How to add or change things**: [`WORKFLOW.md`](./WORKFLOW.md).
- **Play it**: <https://shibl.github.io/sindibad/>
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

**Grade 6** (الصف السادس): pick Sindbad or Yasmina, sail a fog-covered
archipelago guided by Hudhud the hoopoe, and learn through 32 short
lessons — Arabic grammar, fractions/decimals/percent, angles, science,
and Syrian geography — each starting with an illustrated mini-lesson.
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
- `worlds/grade6.js` — the grade-6 islands, positions, unlock rules, badges.
- `plugins/` — topics and reusable game engines. **Adding a lesson:** see
  [`Web/plugins/README.md`](./Web/plugins/README.md).
- `art/art.js` — all art as inline SVG (heroes, Hudhud, dhow, islands…).
- `fonts/` — Baloo Bhaijaan 2 (SIL OFL), bundled for offline use.
- `manifest.json`, `service-worker.js`, `icons/` — PWA / offline support.
- `tools/`, `tests/` — maintainer scripts and tests (not shipped logic).

## Feedback and the improvement agent

- **Report a problem or idea**: open an issue and pick a form — bug, lesson
  mistake, or idea (Arabic and English).
- **Let the agent fix it**: a maintainer adds the `agent-ready` label. Claude
  works on it in a new branch, runs the tests, and replies with a link to
  open a pull request. Mention `@claude` in a comment to ask for changes.
  Its rules are in [`CLAUDE.md`](./CLAUDE.md).
- **Approve**: merging a pull request into `main` publishes the game, after
  the tests pass. Lesson changes also need a teacher's approval
  ([`.github/CODEOWNERS`](./.github/CODEOWNERS)).

## License

- Code: MIT or GPL (open source).
- Educational content & art: CC-BY-SA.
- No ads, no personal data, no monetization — ever.

## Status

First playable grade (6) complete; content is a draft awaiting educator review. See BACKLOG.md for the work queue.
