# plugins/

Every subject topic (one mini-game, one quiz, one lesson) lives here as a
self-contained plugin. The core game (`app.js`) must never need to change
when a plugin is added — see "Plugin / mini-game architecture" in
[`SPEC.md`](../SPEC.md).

The plugin contract — `registerTopic({ id, title, icon, render(container, onComplete) })`
— is defined in BACKLOG item 2. Until then this folder is intentionally empty.

Conventions (to be finalised with item 2):

- One folder per plugin, e.g. `plugins/arabic-letters/`, with its own
  `index.js` and any assets it needs.
- Plugins bundle everything locally (no network fetches), keep assets small,
  and must be added to `APP_SHELL` in `service-worker.js` to work offline.
- Code: MIT/GPL. Content & art: CC-BY-SA.
