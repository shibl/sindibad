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

1. [ ] Scaffold the real project structure: `index.html`, `style.css`,
   `app.js`, `plugins/`, `manifest.json`, `service-worker.js`. Move any
   reusable art/animation ideas out of `demos/*.html` into this structure
   — the demo files are throwaway concept sketches, not the base to build
   on directly.
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

(none yet — first session should add an entry here after testing whatever
it builds)
