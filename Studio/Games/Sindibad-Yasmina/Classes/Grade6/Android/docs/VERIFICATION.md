# Native Android verification

## Version 0.7.0 science island build (#11)

Run from `Grade6/Android` with `ANDROID_HOME=/home/mx/Android/Sdk`:

```sh
node tools/import-quests.mjs science lab
node tools/import-quests.mjs music tunes
./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
./gradlew :app:assembleRelease
```

- The importer wrote only `islands/science-quests.json` (17 quests, 138 steps of 9 shared kinds, 10 places, 4 units, 6 stickers, 38 pictures with their parts). Rerunning the music import left `islands/music-quests.json` byte-for-byte unchanged, and no other island JSON changed in `git status`. No lesson wording changed: quest text and sticker facts are the web's verbatim, and a test fails if any HTML tag is left. The importer fix that keeps `truth: false` on true/false items changed no existing file (music has no true/false items).
- The local JVM suite passed 83 tests with zero failures and zero skipped (74 before). `ScienceQuestTest` (9 new): all 17 quests and 10 places decode and a scripted perfect run gives 3 stars on each; teaching before every graded step, each with a hint; partial scores (a missed choice, a label part missed once = 1/n lost); the reveal rule (hint on the first miss, glow from the second, each new part unlit); crystals and stickers given once per quest across double saves and replays, 17 crystals and 6 stickers at the end; old saves decode without stickers and a doubled sticker is refused; every `view`/`pic` a step names has a native painter and every spot it asks for has a touch box or pill inside the picture; only shared kinds and no HTML; the picture stage helpers. The music `QuestTest` (11) still passes unchanged.
- Debug lint completed with zero errors and 11 warnings, all of kinds that were already there (dependency and plugin versions, the ChromeOS ABI note); the new code adds none.
- The debug and unsigned release builds passed. `app-debug.apk` is 50,412,278 bytes (48.1 MiB). `app-release-unsigned.apk` is 17,910,131 bytes (17.1 MiB).
- No device, emulator or UI run happened. The island screen, the 38 pictures and their experiments, touch-target placement over the pictures, TalkBack labels, calm mode, sound, haptics and large text are verified only by source, JVM tests and build. They need the owner's phone check: play each science quest once, once more in calm mode, and once with TalkBack on a picture step.

## Version 0.6.0 music island build (#10)

Run from `Grade6/Android` with `ANDROID_HOME=/home/mx/Android/Sdk`:

```sh
node tools/import-quests.mjs music tunes
./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
./gradlew :app:assembleRelease
```

- The new importer wrote only `islands/music-quests.json` (10 quests, 93 steps of 14 kinds). Rerunning it gives the same bytes. Rerunning `tools/import-island.mjs` for music, science, social, art, english and farm left every existing JSON byte-for-byte unchanged in `git status`; the music review topics are unchanged. No lesson wording changed: the quests' text is the web's verbatim (`<b>` kept as `**bold**`), and a test fails if any HTML tag is left.
- The local JVM suite passed 74 tests with zero failures and zero skipped. `QuestTest` (11 new) covers: all ten quests and eight places decode, and a scripted run with the right answer at every step (the drum with exact tap times) finishes each with 3 stars; teaching before every graded step, each with a hint and an explanation; the web's partial scores (a missed melody, one missed rain drop, a quest of misses → 0 stars); the hint on the first miss and the glow on the second, disabled wrong options, the drum's tap-count notes and guide mode; the drum tolerance from the first tap (late start accepted, 0.32 vs 0.45 of a beat); the measure game and its undo; the shared kinds' scoring (twoway, sort, order, match, tf, label, choice, number), the tf fix line and guided «أتعلّم»; golden notes once per quest, saving a run twice changes nothing, pearls and best stars; a run round-trips through JSON and an old save decodes with the new fields' defaults; the importer's invariants (no unknown kind, no `label` without an island picture, every note, glass, rhythm, picture and sound named exists); the synth (no NaN, every sample within ±1, A4 = 440 Hz, C4 ≈ 261.63 Hz, sharps equal flats, the piano's strongest frequency is the note's own, a rhythm's cues are on its beats).
- Debug lint completed with zero errors and 13 warnings, all of kinds that were already there (dependency versions, the ChromeOS ABI note, `AutoboxingStateCreation` in `Sea3DMap.kt`); the new code adds none.
- The debug and unsigned release builds passed. `app-debug.apk` is 49,968,151 bytes (47.7 MiB). `app-release-unsigned.apk` is 17,760,978 bytes (16.9 MiB).
- No device, emulator or UI run happened. The island screen, the quest player, every game's layout at 320/360 dp, TalkBack labels, the sound (synth timbres, audio focus, ducking, release on stop), haptics, calm and large text are verified only by source, JVM tests and build. They need the owner's phone check: play each quest once with sound on and once with sound off, tap the drum game on a real touch screen, and rotate during a quest.

## Version 0.5.0 farm island build (#9)

Run from `Grade6/Android` with `ANDROID_HOME=/home/mx/Android/Sdk`:

```sh
node tools/import-island.mjs farm farm
./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
./gradlew :app:assembleRelease
```

- The importer regenerated only `islands/farm.json` and `islands/barn.json`. Rerunning the other regions (music, science, social, art, english) left their JSON byte-for-byte unchanged in `git status`. The farm review questions are unchanged.
- The local JVM suite passed 63 tests with zero failures and zero skipped. There are 14 new tests: `FarmPlayTest` (12) and `FarmLayoutTest` (2). They cover all seven quests in story order, the wrong-tool hint and second-miss reveal, the pick and dial tasks, action-driven stages including the three cotton rounds, helper bonuses, scoring with idempotent rewards and replay, quest unlocks, ship orders, decorations, old-save defaults, round-tripping a saved run, and the scene's touch targets at 320 dp.
- Debug lint completed with zero errors. The 11 warnings and 2 hints were already there: dependency versions, the ChromeOS ABI note and `AutoboxingStateCreation` in `Sea3DMap.kt`.
- The debug and unsigned release builds passed. `app-debug.apk` is 49,261,007 bytes (47.0 MiB). `app-release-unsigned.apk` is 17,366,083 bytes (16.6 MiB).
- No device, emulator or UI run happened. The farm scene, animations, TalkBack labels, calm mode, sound and haptics, and 320 dp layout are verified only by source, JVM tests and build. They still need the owner's phone check below.

## Version 0.4.0 PR build

The local JVM suite passed 49 tests. Debug lint completed with zero errors. Debug and unsigned release builds passed. Package inspection confirmed that both APKs contain the six offline curricula, farm inventory catalog and Atlas outlines. The packages are app-debug.apk (46.0 MiB) and app-release-unsigned.apk (16.4 MiB). The Grade 6 Android workflow produces a debug APK for the owner from each qualifying pull request.

## Owner acceptance for the island PRs

Use an ARM64 Android 13+ phone. On a fresh offline profile, visit Treasure first, leave before the review ends, and move between the eight other islands out of curriculum order. Repeat on an upgraded profile and compare earlier scores and rewards. Check the flat map and 3D landing, touch movement, system back, RTL, larger type, reduced motion and audio preferences.

Play a farm tool sequence, a musical scale, a science activity and a geography lesson. Rotate the globe and find a country. Save and reopen a painting and bookmark an English word. Switch profiles, rotate the device and restart offline. Verify profile isolation and progress persistence. Record the device, OS, PR commit and observations in [#15](https://github.com/shibl/sindibad/issues/15).

## Historical verification — 2026-10-20

This record distinguishes build/JVM/static evidence from runtime evidence.
The owner explicitly reserved playing the game on a phone for later.
Nothing below claims Android UI, phone performance or full website parity.

## Automated checks

- `:app:testDebugUnitTest`: 42 tests, zero failures.
  Covers all eight Arabic topic sessions and 149 bank entries, mandatory
  teaching, retries, scoring thresholds, sentence order/endings, restoration,
  adaptive question selection, best-score preservation, idempotent rewards,
  prerequisite unlocks, corrupt/future saves, concurrent DataStore writes
  and closing/reopening persistent storage. The expanded suite covers all 11
  math topics (167 bank entries), 201 seeds of division/GCD/LCM questions,
  numeric range acceptance, negative/improper values, payment restoration,
  all referenced control/diagram assets, guardian wins/losses/idempotent rewards,
  all 15 cosmetics, concurrent duplicate purchases, six-subject treasure review,
  certificate gating and migration from the original profile format.
- `:app:lintDebug`: zero errors and zero warnings, including explicit
  Android 12+ backup exclusions. All final Gradle tasks also passed through
  the checked-in `./gradlew` with the verified distribution checksum.
- `:app:assembleDebug`: installable debug APK, 37.92 MiB (includes debug tooling).
  APK inspection confirms min SDK 33, target SDK 37, 234 shared PNGs, four
  TTF fonts, no internet permission, no HTML/JS/TS runtime assets and no
  unused GLB catalog bundled into the initial app. `apksigner verify`
  also passed for the debug APK.
- `:app:assembleRelease`: optimized unsigned APK (8.82 MiB); production signing is
  intentionally not configured.
- Shared-art validator: 344 entries, SHA-256/size checks, standalone SVG
  gradient references, no executable SVG content, embedded GLB textures,
  valid moving-node references. Khronos glTF validator: zero errors/warnings.
- USDZ conversion: `sea/letters` and `farm/shamiCow` exported with Blender
  5.2.1 LTS; both USDZ ZIP archives passed integrity checks. Swift/RealityKit loading remains unverified.
- Static inspection of exported Yasmina artwork found a Skia gradient
  opacity problem. Rasterization moved to resvg; the corrected PNG was
  inspected. No Android screen was opened.
- Shared learning extraction: every math lesson SVG is accounted for. All
  1,000 ship cosmetic combinations reconstruct the original SVG geometry from
  26 shared layers. Exported helm, waterwheel, geometry and composite ship
  artwork were inspected as static files. This is not app/UI verification.
- All 234 PNGs in the debug APK match the final shared files byte-for-byte.
  Package version is 0.2.0 (2), minSdk 33 / targetSdk 37; debug signing verifies.

The website's full `npm test` suite includes browser gameplay, so it was
not run under the owner's no-launch instruction. No web runtime, content
or generated `.js` files were edited.

## Owner's later phone checklist

1. Install the debug APK on Android 13 or newer.
2. Pick each hero; create/switch two local profiles and check isolation.
3. Enter voyage 6 and the Arabic island. Verify RTL, diacritics and art at
   normal and large system font sizes.
4. Complete teaching cards before answering. Review teaching during a
   question, try wrong answers twice, and try every activity type.
5. Finish/replay a lesson: best stars remain, new stars award pearls only
   once. Restart the app and check persisted progress.
6. Rotate/background during teaching and a sentence-building question;
   verify restored state. Check system back and save-failure behavior.
7. Test mute, vibration and reduced movement, TalkBack, large text,
   navigation bars and small-screen scrolling.
8. Earn two Arabic stars, enter math and test the line, dial, coin tray and
   waterwheel using touch, slider accessibility actions and the step buttons.
   Check negative numbers, improper fractions and accepted angle ranges.
9. Use review, complete a guardian challenge, buy/equip/reset cosmetics, switch
   profiles and reopen. Verify purchases and rewards are isolated and durable.
10. Treasure must stay behind its original Atlas prerequisite. Full journey
    acceptance needs the remaining native islands; do not bypass their locks.
11. Enable airplane mode. All current content should remain available.

Do not interpret the coming-soon islands as completed ports. Native 3D,
all remaining subjects and complete phone acceptance remain tracked in
[#3](https://github.com/shibl/sindibad/issues/3).

## 0.3: the 3D sea — 2026-10-29

- `:app:testDebugUnitTest`: 47 tests, zero failures, including five for the
  sea layout (`SeaLayoutTest`): every island and landmark on screen at
  three phone sizes and a landscape tablet, islands kept apart, taps finding
  the right island, every island placed, and positions equal to
  `Web/worlds/grade6.ts`.
- `:app:lintDebug`: passed (lint aborts on error). `:app:assembleDebug`:
  about 47 MB, with the 13 sea models and Filament's 64-bit ARM libraries.
- Not verified here: no emulator could run in the build container (no
  hardware virtualisation), so the 3D drawing itself was first seen on the
  owner's phone. Nothing above claims how it looks or performs on a device.
