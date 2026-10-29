# Native Android verification — 2026-10-20

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
