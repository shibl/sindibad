# Native Android

Kotlin and Jetpack Compose, **Android 13 / API 33 minimum**, compile/target
API 37. No WebView, JavaScript runtime, HTML lesson rendering or transpiled
web game. Progress is tracked in [#3](https://github.com/shibl/sindibad/issues/3)
through real GitHub sub-issues assigned to `sam-a1a`.

This is an incremental native implementation; full website parity remains in the tracker.

## New in 0.3: the 3D sea (#8)

- The sea map is drawn in 3D with [Filament](https://github.com/google/filament)
  1.77.3 (Google's native renderer; no WebView): the port of Arwad and the
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
  `app/build.gradle.kts`), and native libraries ship for ARM phones only
  (arm64-v8a, armeabi-v7a). Debug APK: about 52 MB (was 38 MB).
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
  The certificate is earned after passing. **Treasure retains its Atlas-star
  prerequisite, so it is gated until that native island is implemented.**

Six specialized islands remain marked as coming soon. Native 3D, those
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
`tools/import-math.mjs` and `tools/import-review.mjs` preserve curriculum data
at development time; no JavaScript or HTML is bundled or interpreted in the app.
Divisibility generation and all interaction/scoring rules are native Kotlin. The source
web curriculum files were not edited.
