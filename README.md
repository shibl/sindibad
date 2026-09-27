# رحلات سندباد وياسمينة — Sindbad & Yasmina's Journeys

A free, open-source, offline-first educational web app that turns the
Syrian national curriculum (grades 1–12) into an RPG-style adventure.

- **Project spec**: see [`SPEC.md`](./SPEC.md) — read this first.
- **Work queue**: see [`BACKLOG.md`](./BACKLOG.md) — the living backlog and
  playtest log; pick the top open item, implement, test, and append notes.
- **Original project brief** (Arabic): [`docs/original-project-brief.pdf`](./docs/original-project-brief.pdf)
- **Concept demos** (throwaway animation sketches, not production code):
  [`demos/`](./demos/)

## Running locally

No build step. Serve the repo root over http and open it in a browser:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

(Opening `index.html` directly from disk won't work: the app uses ES
modules and a service worker, which both need http(s) or localhost.)

## Layout

- `index.html`, `style.css`, `app.js` — core app shell (screens, navigation, backdrop).
- `art/` — shared inline-SVG art (ship, Sindbad, Yasmina, palms).
- `plugins/` — self-contained subject/topic plugins (see `plugins/README.md`).
- `manifest.json`, `service-worker.js`, `icons/` — PWA / offline support.

## License

- Code: MIT or GPL (open source).
- Educational content & art: CC-BY-SA.
- No ads, no data collection, no monetization — ever.

## Status

Scaffold in place (app shell, art, PWA). See BACKLOG.md for the current work queue.
