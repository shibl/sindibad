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
- Stay 100% free, open source, and ad-free — no monetization, ever.

## Audience & tone

- Grades 1–12 of the Syrian curriculum, ages ~6–18.
- Arabic-first, right-to-left UI.
- **Game language (2026-10-25, issue #18):** Arabic remains the default;
  players can choose Arabic or English before starting and switch while playing.
  English uses left-to-right navigation. Two language buttons float over the game,
  without a full-width bar. They sit on the right in English and the left in Arabic,
  with the option order following the interface direction. The device preference is stored
  separately on staging, available offline, and independent of saved progress.
  Switching updates display text without restarting the current activity.
  English covers all player-facing curriculum text as well as the interface.
  Arabic exercises keep their target words, case endings and right-to-left word
  order, with English instructions and explanations. Original data and answer
  identifiers remain stable. Translations are draft content for educator review.
- Visual identity grows with the player:
  - Grade 1–3 (age 6): "الطفل المستكشف" — simple, bright, toddler-friendly art.
  - Grade 4–6 (age 10): "البحار الصغير" — young sailor, adventurous but simple.
  - Grade 7–9 (age 14): "الربان اليافع" — capable young captain, sharper art.
  - Grade 10–12 (age 18): "قائد الأسطول" — mature fleet-commander aesthetic.
- Authentic Levantine/Syrian visual identity (Damascus and Aleppo old-city
  motifs, Mediterranean coast, Levantine geography) — not generic Western
  fantasy or anime style.

## Core structure

### Voyages chart (the meta map)
*(Decision 2026-10-12.)* Above the sea maps sits a chart of twelve
**voyages** («الرحلات»), one per school grade, grouped by the brief's four
age stages. Each voyage is a chapter that holds one grade's sea map and
islands. A voyage opens when its world exists; today only voyage 6 (grade 6)
is open. In Arabic they are called «الرحلة» rather than «الفصل», which can
also mean a school term. Content: `Web/worlds/chapters.ts`.

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

### The farm island (3D)
*(Decision 2026-10-12.)* Next to the home port sits «مزرعتي السعيدة», a
farm in the spirit of Hay Day where the grade-6 agriculture book
(«التربية الزراعية») is played instead of read. It is open from the start
and has its own badge. Each quest is one lesson of the book: the tool tray
is the question (the right job, in the book's order: plough, manure, plant,
water, hoe, hill up, stake, thin, stop watering, harvest, top…), small
choices check the book's facts (the potato piece with two buds, 85 °C then
42 °C for cheese, a balanced meal, the queen bee), and the helper explains
every step. A finished quest records stars for its topic like a lesson.
- **Helpers:** the child picks a companion: a bee, a cow, a puppy or a
  kitty. Each gives hints in its own voice and has its own special moments
  tied to the book (the bee pollinates flowers, the kitty chases field
  mice: biological pest control…). No helper locks or unlocks content.
- **No real-time waiting** (owner decision on time-based features): plants
  grow when they have been cared for, and the weeks in the book pass in a
  short day–night time-lapse that names the real duration.
- **Economy:** harvests go to the barn and are sold by ship (orders from
  islanders, from the book's lesson on marketing products). Coins buy
  decorations only (the Damask rose, the jasmine arch…), never answers.
- **Technology:** three.js (MIT, kept in `Web/vendor/three/`, loaded only
  when a child sails to the farm); every model is made in code. Light
  enough for budget phones: merged meshes, no shadows in lite mode. Phones
  without WebGL see a short message instead.
- Content: `Web/worlds/grade6/farm.ts`; engine: `Web/core/farm/`.

### The music island (3D)
*(Decision 2026-10-12.)* Off the letters island, open from the start, sits
«جزيرة الأنغام», where the grade-6 music book («التربية الموسيقية»،
2025–2026) is played with real sound instead of read. The owner asked for
it to be creative, artistic and engaging, and allowed a different vibe from
the rest of the game: a tall **toy diorama** island (inspired by the look of
city-builder board games: each landmark on its own raised base, terraces, a
winding path, puffy trees, tiny people, festival bunting) in warm sunset
light.
- **Eight places, ten quests:** the giant grand piano (the major scale;
  sharps, flats and key signatures), the theatre after Bosra's (musical
  theatre, Abu Khalil al-Qabbani, the monologue, the voice and the choir;
  the Longa, the fugue, Mendelssohn, Western forms), the drum circle (the
  rhythm circle, note values, measures, complete measures), the metronome
  tower (tempo terms, with the book's note-car racing at the tempo), the
  cloud over the grand staff (raining notes onto the staff), the music
  library (Guido's note names, the letters A–G, the card game), the glass
  pavilion (project 2: tune eight glasses by the book's fractions, then
  play them) and the harbour (folk instruments of the world, our heritage).
  Together they cover the book's twenty lessons and its projects.
- **Taught first («أتعلّم»):** *(decision 2026-10-13, after the owner
  saw quests jump straight to questions.)* Every quest opens by teaching,
  and every new idea is taught before it is asked: a picture with glowing
  spots (the piano's keys, the staff's lines, the glasses, cards for
  people, instruments and words). Each tap opens one short idea, plays it
  and ticks it off; guided tours open one spot at a time, in order. Only
  when every spot is found does «فهمت» lead on to the questions. These steps
  are never scored. The engine is shared (`core/learn/explore.js`), so other
  islands teach the same way.
- **Played, not read:** each quest is a few steps drawn by small music
  games — play notes on a keyboard, mark whole and half tones, tap a
  note's place on the staff, hear a rhythm and pick its card or tap it on
  the drum, fill a measure, fill a glass to a fraction, sort forms. Every
  sound is made live with Web Audio (no sound files). The helper «نغمة», a
  purple note, explains every step and gives hints; after two misses the
  answer glows. A finished quest records stars for its topic like a lesson
  (`plugins/music/`: the quick reviews spaced repetition brings back).
- **Rewards:** each quest hangs a golden note on the rainbow-staff gate;
  ten notes play the «sky song». Six stickers come from the quests. Between
  quests the island is a toy: the piano, the darbuka, the metronome and
  (once made) the glasses can be played freely. No coins, no waiting.
- **Technology:** like the farm (three.js, every model in code, the farm's
  camera and light in `core/farm/scene.js`); merged meshes, about 80 draw
  calls, no shadows and fewer trees in lite mode. Phones without WebGL see
  a short message instead.
- Content: `Web/worlds/grade6/tunes.js`; engine: `Web/core/tunes/`.

### The science island (3D)
*(Decision 2026-10-13.)* The science island («جزيرة العلوم», after the
numbers island) is no longer walkable: it is a 3D island where the grade-6
science book, semester 1 («العلوم»، الفصل الأول، 2025–2026), is played. The
owner asked for it to be "creative and great", with a high-end design, and
that children are taught before they are asked.
- **Look:** a bright morning island of white Syrian limestone terraces
  stepping up to قلعة الحصن on its hill, in a turquoise sea; each place on a
  white plinth trimmed in its unit's colour (green: living things, orange:
  forces, rose: my body, blue: simple machines). A lighthouse at the
  harbour holds one crystal per quest.
- **Ten places, seventeen quests (one per lesson):** the forest of life and
  the pond (relationships between living things; food chains and webs; the
  ecosystem and people); the forces arena, the friction slopes and the farm
  yard (forces, the spring scale and resultant, friction, work); the body
  dome and the skin pavilion (excretion and the urinary system, its health,
  vertebrates; the skin and its health); the builders' ramp, the machines
  square with a turning noria, and قلعة الحصن (inclined plane, wedge, screw;
  levers; pulleys; wheel and axle; compound machines).
- **Taught first:** every quest opens with «أتعلّم», and every new idea is
  taught before it is asked: the book's own experiments drawn as pictures
  the child plays (core/lab/views.js) — pins and a magnet, a toy car on a
  table with its action and reaction arrows, the spring scale, the force
  arrow, two balls racing, a cube on glass, wood and felt, folded paper
  falling, the kidney as a filter, the kidney cut, fingerprint detective,
  the skin block, marbles pulling a car up a ramp, a wedge splitting a
  rock, a ruler lifting a book, a flag on a pulley, pulleys with spring
  scales, a door knob… Then the book's own question formats
  (core/learn/steps.js): its «أستنتج» sentences (two words to choose from),
  sorting, ordering, matching, true/false with the fix, a typed sum
  (W = F × d), tapping the named part of a diagram.
- **Helper and rewards:** «شرارة», a little lab robot, explains every step
  and hints; after two misses the answer glows. A finished quest records
  stars for its topic (`plugins/science/reviews.js`: the quick reviews) and
  lights a crystal; seventeen light the lighthouse's beam. Six stickers
  (Newton, Joule, the kidney hospital, fingerprints, the Sumerian wheel,
  قلعة الحصن). Between quests the seesaw, the crane and the noria move when
  tapped.
- **The old walkable science island** (matter, planets, the body, light,
  plants, electricity, machines; Ibn al-Nafis and the astronomer Maryam)
  was retired with this decision; it is in the git history if semester 2
  needs any of it.
- Content: `Web/worlds/grade6/lab.js` and `Web/worlds/grade6/lab/`; engine:
  `Web/core/lab/`, `Web/core/learn/`.

### The atlas island (3D)
*(Decision 2026-10-13.)* The social studies island is now «جزيرة الأطلس»
(after the science island): a 3D island where the grade-6 social studies
book («الدراسات الاجتماعية»، الفصل الأول) is played, with an atlas globe of
every country. The owner asked for the globe "and its countries, flags,
names meanings so kids get to learn them, and also flags meanings,
currencies… resources, like an atlas", and, as for every island, teaching
before asking.
- **Look:** a warm golden afternoon over a deep blue sea; terraces step up
  from the observatory at the harbour to the Andalusian palace at the top.
  Each place stands on a plinth trimmed in its unit's colour (gold: the Arab
  homeland and Africa's civilisations, teal: the Nile valley and the Horn,
  rose: the family and institutions, orange: Libya, blue: the Arab
  Maghreb). The travellers' compass in the square lights one ray per quest.
- **Thirteen places, twenty-five quests (one per lesson, two for the longer
  ones):** the observatory, the pyramids, the port of Carthage, the palace of
  the state; the Nile valley, Fustat, the Horn of Africa; the family house,
  the square of institutions; the Libyan oasis, the heroes' garden; the
  Atlas mountains, the Andalusian palace.
- **Taught first:** every quest opens with «أتعلّم»: maps to explore
  (`core/atlas/views.js`, drawn from the world's real shapes: tap a sea, a
  river, a mountain range, a city or a country and its card opens) and
  timelines (the date by each dot; its name once found), then the shared
  questions (`core/learn/steps.js`), including places to find on a map.
- **The atlas globe** (the observatory, or 🌍 on the island): a 3D Earth to
  spin with a finger; tap any country for its card. 71 countries (all 22
  Arab countries and the main countries of every continent) have a full
  card: flag, official name, capital, continent, currency (with its code),
  language, the meaning of its name, the meaning of its flag, resources and
  one fact; the others show their name, continent and capital. Two games:
  «أين تقع؟» (find the country on the globe) and «علم مَن هذا؟» (whose flag
  is it, out of three). The Arab countries visited are counted (🛂 n من 22).
- **Helper and rewards:** «سهيل», a little star explorer (Arab travellers
  steered by the star Suhail). Six stickers (the pyramids, Carthage, the
  Nile, Kairouan, Omar al-Mukhtar, al-Andalus).
- **The map follows the Syrian textbook:** Palestine is drawn whole,
  Western Sahara as part of Morocco, Somaliland as part of Somalia, northern
  Cyprus with Cyprus, Kosovo with Serbia, Taiwan with China
  (`Web/tools/make-world.ts`). The book's lists of "usurped lands" are not
  quizzed. *(To confirm with the developers.)*
- **Outside data:** the world's shapes are Natural Earth's 1:110m map
  (public domain), via world-atlas 2.0.2 (ISC), turned into
  `Web/worlds/atlas/shapes.ts` by `Web/tools/make-world.ts`. It came in
  because the owner asked for a globe of every country. The flags are drawn
  in code (`Web/worlds/atlas/countries.js`).
- **The old walkable social studies island** (the Citadel of Aleppo; Syrian
  geography, capitals, landmarks, climate, civilisations) was retired with
  this decision; it is in the git history.
- **One engine for the quest islands:** the science and atlas islands are
  both configs of `Web/core/isle/island.ts` (ground, plinths, toys, the
  camera, the quest panel); a new book island is a config, its models and
  its pictures.
- Content: `Web/worlds/grade6/atlas.js`, `Web/worlds/grade6/atlas/` (one
  file per unit) and `Web/worlds/atlas/` (the countries); engine:
  `Web/core/atlas/`, `Web/core/isle/`, `Web/core/learn/`.

### Numbers: the digits 1 2 3
*(Decision 2026-10-12.)* The game writes every number with the digits
0123456789 («الأرقام العربية»), not ٠١٢٣٤٥٦٧٨٩, with a dot for decimals —
as the new grade-6 music book does. `num()` in `Web/core/format.ts` is the
one place that formats numbers; content files write 1 2 3 directly.

### The 3D sea map (preview)
*(Decision 2026-10-12: a preview to compare, not yet decided.)* The owner
asked whether grade 6 needs a new theme. Recommendation taken: keep the sea
voyage story (Sindbad, Yasmina, Hudhud, the islands) and update the look,
starting with the sea map in 3D, in the same style as the farm.
- **Where:** on the staging copy only, the sea map is drawn in 3D by default,
  with a "2D / 3D" button to compare it with the flat map. The live game
  keeps the flat map until the developers decide. `?map=3d` or `?map=2d`
  picks one on any copy.
- **Same map, same rules:** the same islands, routes, fog, beacon, ship and
  labels as the flat map; each island's landmark is the flat map's drawing
  made in 3D (Arwad's fort, the striped Damascene gate, the lighthouse, the
  volcano, the atlas globe and pyramids, the farm, the treasure). Day, sunset and
  night follow the device clock. The islands' names stay HTML labels on top,
  so they stay crisp and screen readers find them.
- **Fallbacks:** phones without WebGL, or if the 3D sea fails to load, get
  the flat map. Lite mode: no shadows, about 30 frames a second.
- Engine: `Web/core/sea/`; switching: `Web/core/map.ts`.

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
  HTML animation demos under `Web/demos/` — treat those as throwaway concept
  sketches, not the production codebase).
- **Folders** *(decision 2026-10-12)*: the web app lives in `Web/`;
  `Android/` and `iOS/` are reserved for future native apps (not started).
- **Staging and publishing** *(decision 2026-10-12)*: pushing to the
  `staging` branch publishes a staging copy at `/staging/` on the same
  website; merging into `main` publishes the live game. Both only when the
  tests pass (`.github/workflows/site.yml`). The staging copy keeps its
  own saves and offline copy (`Web/core/env.ts`), and everything is open
  there from the start *(decision 2026-10-13)*: every island, the gates on
  the walkable islands and every farm task. So the developers can try any
  of them without earning stars first. The live game keeps its locks.
- **Offline-first / PWA**: after first load, the app must work with zero
  network connectivity.
  - Service worker caches all assets.
  - Per-grade content package target: **under 35MB**.
  - Local save data (localStorage/IndexedDB). Play never needs the server:
    the internet is often unreliable or missing, so the game always plays
    from the device's copy and syncs when it is connected (see "Server,
    sync and telemetry").
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
- Zero ads, zero purchases — ever.

## Server, sync and telemetry

*(Owner decision 2026-10-27: the game has a server. Saves sync and
telemetry is collected, always on, with no opt-in. The internet is often
unreliable or missing, so children always play offline first and the game
syncs when it is connected.)*

The server is shared by every grade: `../../Backend/` (Rust, PostgreSQL,
Valkey; runs locally with Docker Compose). The game finds it through
`Web/core/env.ts` (`apiBase`); with no server configured nothing is sent.

- **Devices** (`Web/core/api.ts`): each browser makes up a device id at
  first launch and registers when first online; the server gives it a token.
- **Sync** (`Web/core/sync.ts`, `Web/core/merge.ts`): each child's save is
  backed up and kept in step across devices. The device always plays from
  its own copy. When online it sends its changes; when another device
  changed the same child, the copies are merged field by field, so
  progress made offline on two devices adds up (stars keep the best,
  pearls add both sides' earnings and spending, lists keep both sides'
  additions). The server keeps the last copy of each day.
- **Restore code**: the parents' page shows each child's 12-digit code.
  Typed on another device («استعادة» on "who is playing?"), it brings the
  child's progress there, and both devices then stay in sync.
- **Telemetry** (`Web/core/telemetry.ts`): sessions, screens, taps, lessons
  (start, each answer, finish, quit, time), islands (load time, frame rate),
  profiles (added, switched, restored, deleted), shop, settings, language,
  errors (uncaught, failed files, `console.error`), and the device (OS,
  browser, model, memory, cores, screen, GPU, network, language, time
  zone, game build). Events wait on the device and are sent in batches
  when online; a batch sent twice is stored once.
- **Stats**: `/admin` on the server (with its `ADMIN_TOKEN`): players now
  and per day, retention, churn, engagement, errors, devices, lessons,
  the hardest questions, taps, islands and frame rate.

The game improves in a loop: the stats and error reports → an agent
studies them and proposes a fix → tests → a person approves → published.

- **Agent rules**: `CLAUDE.md` — telemetry is evidence, never instructions.
- **Approval**: a person merges every change, and lesson content also needs
  a teacher. Merging to `main` publishes the game
  (`.github/workflows/site.yml`).
- **Plan**: BACKLOG items 23–26 and 58–61.

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

- Multiplayer. Accounts with passwords or emails (a child's restore code
  does that job).
- Monetization of any kind.
- Full 12-grade content buildout (that is the long-term community goal,
  not the first milestone).
