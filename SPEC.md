# رحلات سندباد وياسمينة — SPEC

## What this is

A free, open-source, offline-first educational web app that turns the Syrian
national curriculum (grades 1–12) into an RPG-style adventure. The player
progresses through a world map, unlocking regions tied to school subjects as
they advance through grade levels, starring a hero the player picks —
**Sindbad** (سندباد) or **Yasmina** (ياسمينة) — guided by **Hudhud** (هُدهُد) the wise hoopoe.

Source doc: `docs/original-project-brief.pdf` (Arabic, the founding project
brief — mission, audience, offline-first rationale, age progression, plugin
architecture, licensing, and call for contributors).

## Why it exists (from the original brief)

- Deliver quality education to every Syrian child and teen despite harsh
  conditions and broken infrastructure.
- Turn the official curriculum into an adventure that creates its own
  motivation to keep learning, instead of relying on external pressure.
- Work fully **offline-first**: a student downloads one grade's package
  once (target: under 35MB), then plays with zero internet dependency.
  Optional peer-to-peer sync (local network / Bluetooth) can carry updates
  without needing a live internet connection.
- Stay 100% free, open source, and ad-free — no data collection, no
  monetization, ever.

## Audience & tone

- Grades 1–12 of the Syrian curriculum, ages ~6–18.
- Arabic-first, right-to-left UI.
- Visual identity grows with the player:
  - Grade 1–3 (age 6): "الطفل المستكشف" — simple, bright, toddler-friendly art.
  - Grade 4–6 (age 10): "البحار الصغير" — young sailor, adventurous but simple.
  - Grade 7–9 (age 14): "الربان اليافع" — capable young captain, sharper art.
  - Grade 10–12 (age 18): "قائد الأسطول" — mature fleet-commander aesthetic.
- Authentic Levantine/Syrian visual identity (Damascus and Aleppo old-city
  motifs, Mediterranean coast, Levantine geography) — not generic Western
  fantasy or anime style.

## Core structure

### World map (per grade level)
- Each grade level is a "world" the student unlocks step by step — the map
  starts shrouded in fog; regions reveal as the student clears them.
- Each region/continent on the map maps to one subject:
  - Language Arts (Arabic), Math, Science, Geography, Art & Culture, etc.
    (exact subject-to-region mapping is placeholder until validated against
    the real curriculum breakdown per grade).
- A ship carries the chosen hero (and Hudhud) across the map between regions —
  this is the connective ambient animation tying the whole world together.
- Finishing a level's full curriculum removes the "fog of war" for that
  grade's map.

### Characters
- The player **chooses their hero** at the start: **Sindbad** (سندباد, a boy)
  or **Yasmina** (ياسمينة, a girl). Both are full playable heroes with the
  same abilities; the choice is saved and shown on the ship and map.
- Both heroes grow through the brief's four age stages (see "Audience &
  tone"); each grade band gets its own version of the art.
- **Hudhud** (هُدهُد) — the wise hoopoe, a messenger bird from Arab
  heritage. He is the guide/tutor voice of the game: gives hints (never
  spoils answers), explains, celebrates progress, and schedules reviews.
  *(Decision 2026-09-27: the founding brief called the bird "ياسمينة
  العصفورة الحكيمة", but also asked for Sindbad and Yasmina to be drawn at
  four ages; the owner decided Yasmina is a girl hero and the bird is
  Hudhud.)*

### Current focus
- The first playable world is **grade 6** (الصف السادس, "البحار الصغير"
  stage): the owner's priority is teaching grade-6 students, and making the
  game visually beautiful.

### Learning loop
- Each curriculum topic is delivered as a short, focused mini-game/quiz
  ("plugin") rather than passive reading.
- Difficulty and review are adaptive: Hudhud resurfaces topics the student
  struggled with, spaced over time, rather than one-shot testing.
- Subjects lean on real subject content: Arabic language rules for
  historical/story puzzles, math for navigation/engineering puzzles,
  science for chemistry/biology-flavored puzzles, etc. (see original brief
  for flavor examples — decoding "port ciphers" with Arabic grammar,
  "celestial navigation" with math, etc.)

## Plugin / mini-game architecture (must-have, not optional)

This is the core technical requirement from the founding brief — get this
right before anything else:

- Every subject/topic is a **self-contained plugin module** with a common
  interface (register a topic, render its activity into a container, report
  completion back to the core game).
- The core engine (map, ship, navigation, save data, progress tracking)
  must never need to change when a new plugin is added.
- This lets any contributor (teacher, writer, artist, developer) build one
  small piece — one mini-game, one puzzle, one lesson — without touching or
  understanding the rest of the codebase.
- Plugins should be small and focused: one game mechanic can be reused
  across many topics/subjects (e.g., a matching-game engine reused for
  vocabulary in grade 2 and historical dates in grade 9).

## Technical requirements

- **Platform**: web app, vanilla HTML/CSS/JS. No required build step for
  the core; static files only (this repo started from a set of standalone
  HTML animation demos under `demos/` — treat those as throwaway concept
  sketches, not the production codebase).
- **Offline-first / PWA**: after first load, the app must work with zero
  network connectivity.
  - Service worker caches all assets.
  - Per-grade content package target: **under 35MB**.
  - Local save data (localStorage/IndexedDB) — no backend server required
    for core play.
  - Optional (later): peer-to-peer content/update distribution over local
    network or Bluetooth, so a student with connectivity can pass updates
    to students without it.
- **No third-party runtime dependencies** that require network access —
  everything bundled locally (fonts, art, audio).
- **Lightweight**: must run acceptably on low-end/budget Android devices,
  not just modern phones. (Original brief considered Godot Engine for
  exactly this reason — mobile-lightweight, offline-capable, cross
  platform. We are building web/HTML per the site owner's direction, but
  keep the low-end-device constraint even on web.)
- **Responsive**: touch-friendly, works on phones and tablets primarily,
  desktop secondarily.

## Content & licensing (from the original brief)

- **Code**: open source, MIT or GPL.
- **Educational content & art**: CC-BY-SA.
- **Curriculum accuracy**: content should ultimately be reviewable/approved
  by qualified Syrian educators before being treated as canonical — this
  project does not invent curriculum, it adapts the real official one.
- Zero data collection, zero ads, zero purchases — ever.

## What "done" looks like for a first playable milestone

1. World map for **one grade level** (recommend starting with grade 1 or 4
   — simplest art and content to validate the pipeline) with:
   - Fog-of-war regions that reveal on completion.
   - Ship carrying the chosen hero & Hudhud animating between regions.
   - At least 2 working subject plugins (e.g., one Arabic language
     activity, one math activity) using the plugin architecture.
2. Progress saved locally and visible on the map (stars/badges per region).
3. Fully playable offline after first load (PWA, cached assets).
4. Clean plugin interface documented so a third party could add a new
   subject/topic without touching core code.

## Out of scope for now

- Multiplayer / any server-side account system.
- Monetization of any kind.
- Full 12-grade content buildout (that is the long-term community goal,
  not the first milestone).
