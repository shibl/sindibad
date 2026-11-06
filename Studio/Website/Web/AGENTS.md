# Legacy Studio website routes

Scope: `Studio/Website/Web/`.

The owner requested replacing the old Studio website with Design A from
`sam-a1a/sindibad-studio-design-a` on 2026-11-06. This directory now contains only
compatibility redirects. Do not restore the old site or design switcher.

The exact imported source is in `../Source/`; the generated site is in
`../Designs/Web/` and publishes at `/studio/`. Read `../README.md`.
Keep old page URLs working, preserve query strings and fragments, and send
`?lang=ar` visits to the Arabic version. The publication script owns the lab
redirect; the playable Chemistry Lab remains under the Grade 10 game.

Retain the owner's source-only rule here: no browser tools, HTTP checks,
builds, tests, or visual QA unless requested. Use the user's Git identity,
do not add Co-Authored-By trailers, and do not spawn agents unless requested.
