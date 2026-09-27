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
2. [ ] Define and implement the plugin interface described in SPEC.md
   (`registerTopic({id, title, icon, render(container, onComplete)})`).
   Write it with clear comments since this is the contract every future
   subject module depends on.
3. [ ] Build the grade-1 (or grade-4 — pick one) world map screen: regions
   with fog-of-war, ship + Sindbad + Yasmina sailing between them, tap to
   open a region.
4. [ ] Build 2 real subject plugins for that grade level (one Arabic
   language activity, one math activity) to prove the plugin architecture
   end-to-end.
5. [ ] Local save/progress system (localStorage): track per-region
   completion, show stars/badges on the map.
6. [ ] PWA setup: manifest.json + service worker caching all assets so the
   app works fully offline after first load. Verify by loading once, then
   testing with network disabled.
7. [ ] Basic automated test pass: load the app in a headless browser,
   click through the map and one plugin, check for console errors, verify
   localStorage progress persists across a reload.

## Playtest notes

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
