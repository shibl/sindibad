# Native Android

Kotlin and Jetpack Compose, **Android 13 / API 33 minimum**, compile/target
API 37. No WebView, JavaScript runtime, HTML lesson rendering or transpiled
web game. Progress is tracked in [#3](https://github.com/shibl/sindibad/issues/3)
through real GitHub sub-issues assigned to `sam-a1a`.

This is an incremental native implementation; full website parity remains in the tracker.

## Grade 6 island travel

All nine islands can be visited in any order on the native map. Tap a destination in 3D to move the hero on its shore, then enter its lessons. The flat list opens the activities directly. Treasure is playable on a fresh profile and its certificate is awarded for passing the review.

The six subject ports cover 7 farm lessons, 10 music lessons, 17 science lessons, 25 Atlas lessons, 25 art lessons and 24 English units. The native app plays the farm's seven quests in a native scene with harvests and ship orders, the music island's ten quests with its piano, staff, rhythm, drum and glasses games, the science island's seventeen quests with their native experiment pictures, subject practice, a touch-selectable globe, saved paintings, offline English speech when a local voice is available, and a personal word book. The [tracker](https://github.com/shibl/sindibad/issues/3) records outstanding specialized activities and owner phone acceptance.

## Version 0.7: the science island's quests and experiments (#11)

- «جزيرة العلوم» is a native island screen (`ui/science/ScienceIsland.kt`) on
  the music island's pattern: the helper شرارة (a robot face; hello on the
  first visit, then «back» and the next quest), the ten places of the web
  island grouped under the book's four units (unit name and colour), each
  with its quests, stars, «ابدأ ▶» / «↻ العب مجدداً» / «🔁 راجع» and the
  golden arrow, the lighthouse (one crystal per quest finished once, 17 in
  all, saved per profile; the web's lab.ts lines), and the album's science
  page. The web's walkable 3D island, its lighthouse beam and its seesaw,
  crane and noria are not drawn; the places are cards.
- The seventeen quests (138 steps) come from `Web/worlds/grade6/lab.ts`
  through `node tools/import-quests.mjs science lab` into
  `islands/science-quests.json`, wording verbatim. They use only the shared
  kinds (explore, choice, sort, twoway, match, tf, number, label, order); the
  importer still fails on an unhandled kind. The importer also exports the
  units, the six science stickers (from `Web/core/stickers.ts`, facts
  verbatim) and, for each of the 38 pictures, its parts' touch boxes and
  name positions read from the web's own SVG markup. Each quest records its
  stars on the existing review topic `science-<quest>`. The importer now keeps
  `truth: false` on true/false items (it used to drop it; no music item was
  affected).
- **Native pictures and experiments** (`ui/science/ScienceViews.kt`,
  `MachineViews.kt`, `Pen.kt`): all 38 pictures (valley, food chain and web,
  pins and magnet, the spring scale, resultant force, friction, falling
  paper, work, the excretory organs, the filter, the kidney and skin
  sections, fingerprints, the ramp, wedge, screw, lever classes, pulleys,
  knob, steering wheels, the castle…) are hand-drawn in Compose Canvas in the
  web's 320 × 200 units; no PNG or WebView. A found part plays its
  experiment once, as the web's CSS does: the magnet pulls the pins, the
  scale reads 3N, w₁ + w₂ read 5N like w, the folded paper lands first, the
  work bars grow, the filter clears, the hammer drives the wedge, the lever
  lifts the book, the pulleys raise their weights, the wheels turn. Calm mode
  shows each end state at once; nothing is timed. Each part is a touch
  target of at least 48 dp with its spot name for TalkBack; guided steps let
  only the glowing part be tapped. Parts a picture does not draw become cards.
- `label` steps (paraglider, urinary system, truck ramp, claw hammer): only
  the asked parts can be tapped; a wrong one is a miss; each named part shows
  its name. TalkBack reads them as «جزء من الصورة n», since their names are
  the answers, so these four steps are hard to play by ear alone.
- The tracker now matches the web for every island: the first miss says the
  hint; the second and later misses light the answer; each new part starts
  unlit and its next miss lights it again. Before, a multi-part step (a piano
  melody, sorting, order, match, true/false) kept every later part lit after
  two misses; the gaps game still keeps its remaining gaps lit, as on the web.
- **Sticker album**: `Profile.stickers` (ordered, saved per profile, old
  saves decode empty, a doubled sticker is refused) is filled by
  `finishQuest` on a quest's first finish only; the result card shows
  «📒 ملصق جديد في ألبومك!» with the sticker's fact. `StickerBook` shows an
  island's page (owned in colour, tap for its fact; the rest «؟؟؟»); any
  island whose book lists `stickers` can use it.
- Not yet: the web's 3D island and lighthouse beam, the full album across
  islands, sounds for the experiments (only right/wrong/finish tones and a
  soft tap), and large text inside the pictures (their words scale with the
  picture, not with the large-text preference).

## Version 0.6: the music island's quests, synth and games (#10)

- «جزيرة الأنغام» is a native island screen (`ui/music/MusicIsland.kt`): the
  helper نغمة (hello on the first visit, then «back» and the next quest), the
  eight places of the web island (the giant piano, the theatre, the rhythm
  circle, the tempo tower, the notes cloud, the music library, the glasses
  wing, the harbour) as cards with their quests, stars, «ابدأ ▶» /
  «↻ العب مجدداً» and «🔁 راجع» (the quest's review lesson), the golden notes
  (one per quest finished once, saved per profile) and the sky song they
  make, and free play on the piano, the drum, the metronome and (once built)
  the glasses. The web's walkable 3D island is not drawn; its places are cards.
- The ten quests come from `Web/worlds/grade6/tunes.ts` through
  `tools/import-quests.mjs` into `islands/music-quests.json`, wording verbatim
  (`<b>` kept as bold). The review topics in `islands/music.json` are
  unchanged; a quest records its stars on the same topic.
- **A quest framework for every island** (`domain/quest`, pure Kotlin, and
  `ui/quest`): a sealed `Step` decoded by `kind` (strict: an unknown kind or
  field fails the import test), `StepMachine` with the web's tracker (first
  miss: the hint; second: the hint and the right answer glows), the web's
  scoring per kind (whole step, share of parts, or one per part), quest score
  Σok/Σtotal → `starsFor`, idempotent first-finish rewards, and a
  `QuestScreen` with «أتعلّم» discovery steps (guided spots, «✨ الخلاصة»,
  «فهمت! ◀»), «تابِع ◀» with the explanation after each step, step dots,
  the helper's line, exit with confirmation, and a result card. The run lives
  in `SavedStateHandle` (rotation and process death). Shared kinds are
  ready for the other islands: explore, learn, choice, twoway, sort (tap a
  bin), order, match, tf (with the fix line) and number (keypad). An island
  adds its own kinds and pictures through a `QuestKit`; the `label` step's
  pictures are an island's (`QuestKit.labelPicture`), so science, the atlas,
  English and art can be ported on the same player.
- All the music games are native Compose: the piano (keys, gaps, the
  whole/half step pattern), the grand staff drawn on a Canvas with both
  clefs (rain drops placed by tap or with ▲ ▼ «ضعها ✓» buttons; name the
  note), rhythm cards with notation, the drum, the measure, filling a glass
  and playing the glasses, and the «أتعلّم» pictures (keyboard, grand staff,
  notes, key signature, hymn of St John, tempo slider, measures, anacrusis,
  portraits, the five folk instruments and the singers redrawn from the web's
  SVG).
- **Synth** (`audio/Synth.kt`, pure, unit-tested; `audio/MusicEngine.kt`): the
  web's voices rebuilt in Kotlin and mixed live on one streaming AudioTrack:
  piano, water glasses, drums (dum, tak, riq, clap, metronome tick), the five
  folk instruments, the choir, a Longa run, a canon, rhythms and the
  metronome. Audio focus (ducks for others, stops on loss), a soft limiter
  (no clipping), released when the screen stops. With the sound off every
  sound still lights what it plays (keys, glasses, drum lights, beats), so
  every game stays playable. The lessons' practice keyboard uses it too.
- The drum keeps the web's tolerance (0.32 of a beat, 0.45 once the lights
  guide), measured from the child's own first tap, with no count-in and no
  time limit: «دوري!», then tap; it is judged at the last beat or at
  «✓ انتهيت».
- Accessibility: keys are ≥ 48 dp wide (the piano scrolls sideways on a narrow
  phone; black keys are about 32 dp wide), every key, glass, gap and spot is
  a labelled button, the staff has big buttons as well as taps, the helper's
  line is a polite live region, and haptics follow the profile.
- Not yet: the web's 3D island and its animations, music stickers (the
  album arrived in 0.7 for science), and the web's room echo on sounds.

## Version 0.5: the farm island played in a native scene (#9)

- «مزرعتي السعيدة» is now an illustrated 2D scene drawn with Jetpack Compose
  Canvas (`ui/farm/`): six fields, the barn and silo, the Shami cow's pen with
  its feeder, trough and milk bucket, the dairy with its pot and thermometer,
  three beehives, the orders board and the dock with the shared dhow PNG, and
  the decorations once bought. Crops at every growth stage, weeds, earthed-up
  mounds, stakes, the cow, bees, helpers and the choice pictures (potato
  pieces with buds, red/green tomatoes, queen/drone/worker bees) are native
  vector drawings. Places sit in `FarmLayout` (pure Kotlin, scene units), so a
  later 3D island (#8) can reuse the same place ids.
- The seven quests are played in the scene as on the web: tap the field or the
  place, then pick the job from the tool tray. A wrong tool is explained
  (later / already done / not part of this crop, or the book's own word); the
  second miss names the step's hint and makes the right tool glow. The small
  choices are all native: one answer, find the queen, pick only the red
  tomatoes, put the bee's life cycle in order, a balanced meal with one feed of
  each kind, and the 85 °C / 42 °C thermometer. Plants change stage after the
  right jobs; the book's weeks pass as captions (and a short dusk when motion
  is on), never as waiting. Cotton is picked in three rounds.
- The harvest goes to the barn (with the chosen helper's gift: bee +2 at
  flowering, kitty +1 at the potato and beet harvests, cow +1 milk, puppy +15
  experience), then the quest's quick review follows. Stars = share right first
  try over the jobs and the review questions (`starsFor`). The story's first
  finish gives +30 coins and opens the next quest; replaying a quest on
  another plot is practice: its products again, stars kept at the best, no
  second story reward (as on the web). Cheese uses two milks.
- Helper choice on the first visit (changeable from the quests list), with the
  helper's portrait, name and words beside the scene; tap it for the step's
  hint. Orders board with three orders in the book's order (only for products
  the farm can make), filled from the barn for coins; decorations bought with
  coins appear in the scene. Coins and decorations never change lessons,
  answers or access.
- A run in progress (step, tools done, misses, the open choice, review answers)
  is part of the saved profile and written after every action, so it survives
  rotation, process death and a cold restart. Older saves decode with defaults.
- Accessibility: every place is a real button over the canvas with a spoken
  description (what grows there, its stage, the step), tools and choice
  options are labelled buttons (≥ 48 dp), calm mode stops the idle motion and
  the action effects, the screen scrolls and wraps at 320 dp.
- Not yet: the 3D walkable farm (#8), farm levels beyond a number, stickers,
  helper voices (pitch), and the web's ship sailing animation after a sale.

## Version 0.3: the 3D sea (#8)

- The sea map is drawn in 3D with [Filament](https://github.com/google/filament)
  1.77.3 (Google's native 3D engine for Android, called from Kotlin; no
  WebView, no three.js): the port of Arwad and the
  nine islands from the shared GLB models, the ship rocking at the port,
  gulls circling, and clouds with dimmed colours over the islands still to
  discover. The water is a native grid coloured by distance to the beaches,
  as the web sea's shader does. Island positions follow `Web/worlds/grade6.ts`
  (a unit test keeps them in step); the layout and camera math is pure Kotlin
  in `ui/sea/SeaLayout.kt`, so it is unit-tested.
- Island names and stars are Compose text placed over the 3D view; a tap on an
  island or its name opens it, with the same unlock rules as before.
- A **2D** button switches to the flat island list; phones that cannot draw
  in 3D get it automatically. Calm mode stills the ship and the gulls.
- Only the 13 models the sea needs are bundled (`copySharedModels` in
  `app/build.gradle.kts`), and native libraries ship for 64-bit ARM phones only
  (arm64-v8a). Debug APK: about 47 MB (was 38 MB).
- Not yet: islands to walk on in 3D, night and sunset looks, the whale.

## Available in 0.2

- Sindbad/Yasmina selection and independent local profiles.
- The twelve voyages (only grade 6 has content), a map using the original
  island artwork, eight Arabic topics, and eleven mathematics topics.
- All **149 Arabic question-bank entries**, with the web's 7–9 questions
  per run: select a word, sort into categories, multiple choice, and build
  a sentence with the correct word endings.
- Teaching before assessment, returning to teaching during a question,
  hints, two-attempt feedback, first-attempt scoring, stars, fair pearl
  rewards and missed-question prioritization.
- Atomic DataStore saves; best scores and rewards survive replay. Sessions
  and navigation survive Android saved-state restoration. Completed
  progress survives a cold restart; unfinished sessions are not yet a
  durable resume feature after force-stop.
- Arabic RTL, the bundled Baloo font, larger text, reduced movement,
  native answer sounds and haptics, lifecycle cleanup and system back.

- Mathematics: 156 fixed bank entries plus 11 seeded divisibility/GCD/LCM
  questions per generated bank (167 entries total). Native number-line controls,
  a ship's angle dial, removable market payments, fraction filling at the
  waterwheel, and quizzes preserve the original worked examples.
- Targeted review prioritizes previously missed questions and weaker lessons.
  Arabic and math guardians unlock after earning a star in every subject lesson;
  their hearts, streaks and rewards survive saved-session restoration.
- All 15 pearl cosmetics can be previewed, bought once, equipped and reset.
  The ship combines original shared layers, including the hero outfit and
  Hudhud's hat. Purchases never change lesson access or scores.
- A ten-question treasure review samples Arabic, math, science, social studies,
  art and English (including 710 existing review questions from the latter four).
  The certificate is earned after passing. Treasure is available from the first voyage.

In 0.2 six specialized islands were marked as coming soon. Native 3D, those
subject games, stickers, scheduled review and the full family dashboard
remain in the tracker. Review in this slice has no timers or daily pressure.
Since 0.3 the map is a 3D sea (above); the island screens themselves are not 3D yet.

## Shared artwork

[`../Shared/Art/`](../Shared/Art/README.md) owns the exported asset catalog:
234 SVG/PNG illustrations and interaction states, 110 GLB models, four TTF fonts and attribution.
Gradle reads PNGs directly from its `runtime/` directory and generates
Android font/icon resources from the same files. Original art is reused through native controls and shared bitmap layers. Only the assets needed by this slice are bundled; the 3D catalog
is not copied wholesale into the APK.

The same art can be used from Swift. The shared folder includes a tested
GLB-to-USDZ conversion command for RealityKit.

## Build without launching

Open this directory as a Gradle project in Android Studio, or:

```sh
cd Android
# Set JAVA_HOME to a JDK supported by Gradle (JDK 17+; verified with JBR 25).
# Set ANDROID_HOME, or add sdk.dir to ignored local.properties.
./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

The checked-in wrapper is Gradle **9.8.2**, with its official distribution
SHA-256. `assembleDebug` creates the installable, debug-signed APK at
`app/build/outputs/apk/debug/app-debug.apk`. It does not install or launch
anything. `:app:assembleRelease` creates an optimized **unsigned** release
APK; production signing is not configured.

The owner reserved all phone/UI playtesting for later. No emulator,
instrumentation test, game launch, browser gameplay or device install was
performed for this handoff. See [verification](docs/VERIFICATION.md).

## Pinned stable versions

Verified on **2026-10-20** against Google Maven, Maven Central and Gradle's
release service; exact coordinates are in `gradle/libs.versions.toml`.

| Dependency | Version |
| --- | --- |
| Android Gradle plugin | 9.4.1 |
| Android SDK Build Tools | 37.0.0 |
| Gradle | 9.8.2 |
| Kotlin / Compose compiler / serialization plugin | 2.4.21 |
| Compose BOM | 2026.09.00 |
| Compose UI, foundation, runtime, animation | 1.12.1 through the BOM |
| Material 3 | 1.4.0 through the BOM |
| Activity Compose | 1.13.0 |
| Lifecycle | 2.11.0 |
| DataStore | 1.2.1 |
| Coroutines | 1.11.0 |
| Kotlin serialization JSON | 1.12.0 |
| JUnit Jupiter / platform | 6.1.3 |
| Filament / gltfio | 1.77.3 |

AGP's built-in Kotlin is enabled; the Compose and serialization plugins
resolve the Kotlin compiler at the catalog version. No legacy
`org.jetbrains.kotlin.android` plugin is applied.

Sources: [AGP compatibility](https://developer.android.com/build/releases/agp-9-4-0-release-notes),
[AndroidX stable releases](https://developer.android.com/jetpack/androidx/versions),
[Kotlin releases](https://kotlinlang.org/docs/releases.html),
[Gradle current release metadata](https://services.gradle.org/versions/current).

## Layout

- `app/.../domain/`: immutable game/session rules; no Android dependencies.
- `app/.../content/`: native typed curriculum definitions.
- `app/.../data/`: versioned, atomic DataStore persistence.
- `app/.../ui/`: Compose screens and a bounded bitmap cache for shared art.
- `GameViewModel`: navigation/session restoration and repository operations.
- `app/src/test/`: scoring/session and real DataStore persistence tests.

No internet permission, accounts, telemetry, advertising or purchases.
Cloud backup and OS device transfer are disabled for local profiles.
Content remains **draft, pending review by Syrian educators**. Question
wording, answers, hints and rules come from the existing web banks;
HTML teaching cards become native text, labeled word tiles and exported
illustrations. Geometry measurements also have native text for TalkBack.
`tools/import-math.ts` and `tools/import-review.ts` preserve curriculum data
at development time; no JavaScript or HTML is bundled or interpreted in the app.
Divisibility generation and all interaction/scoring rules are native Kotlin. The source
web curriculum files were not edited.
