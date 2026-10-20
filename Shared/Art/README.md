# Shared artwork

Reusable artwork for the website, Kotlin Android and future Swift iOS app.
The catalog contains **234 illustrations and control states** (standalone SVG plus
PNG), **110 GLB models**, the existing launcher icon and **four TTF font
subsets**. [`manifest.json`](manifest.json) records asset IDs, source paths,
SHA-256 hashes, dimensions, formats, node hooks and portability limits.

The current web art generators remain the authoring source. Maintainer
tools invoke those generators **during export only**. Native apps consume
the exported files and never execute those JavaScript modules. The web
runtime and its cache list have not been changed.

## Files and consumers

| Path | Role |
| --- | --- |
| `svg/` | Independent vector documents, with all gradient definitions embedded |
| `runtime/png/` | Transparent native-ready raster versions |
| `runtime/launcher.png` | Existing website launcher artwork |
| `fonts/` | Existing WOFF2 fonts losslessly repackaged as TTF |
| `models/` | Portable, embedded-texture GLB geometry |
| `manifest.json` | Stable IDs, provenance and validation hashes |
| `licenses/`, `runtime/licenses/` | Original font and Three.js attribution |
| `tools/` | Reproducible developer-only exporters and validator |
| `derived/usdz/` | Generated Swift/RealityKit packages; ignored in git |

Examples of stable IDs: `heroes/yasmina`, `ships/sindbad`,
`islands/letters`, `sea/letters`, `farm/shamiCow`, `lab/castle`.

Android's Gradle build references `runtime/` directly and generates
resources from `fonts/` and the original icon. Swift can bundle the same
PNG/TTF files, and generated USDZ packages for RealityKit. The source GLB
stays shared; USDZ is a derived format, not a second set of authored models.

## Regenerate

From the repository root (Node 22.18+ and Python/uv):

```sh
uv run --with fonttools==4.67.0 --with brotli==1.2.0 Shared/Art/tools/fonts.py
npm ci --prefix Shared/Art/tools
npm run export --prefix Shared/Art/tools
npm run check --prefix Shared/Art/tools
# Only refresh learning/controls/cosmetics, keeping existing GLBs:
npm run export:learning --prefix Shared/Art/tools
```

The exporter does not boot the website, open a browser, create a WebGL
renderer or launch the Android game. Three.js **0.170.0** deliberately
matches the existing web geometry generators. This is development tooling,
not an Android dependency.

SVGs are rasterized by resvg so gradient transparency and facial shading
remain correct. The N-API canvas is used only for procedural model
textures. Font licenses are copied without alteration.

## Native learning assets and cosmetic layers

The learning extraction adds 37 original math lesson/question diagrams,
116 control states (number lines, angle steering and fraction-fill levels),
15 guardian expressions, 15 standalone cosmetic portraits and 26 ship layers.
`lesson-diagrams.json` maps curriculum cards/questions to stable asset IDs.
The Kotlin app uses these files directly; Swift can bundle the same catalog.
Input, scoring and state changes stay native.

Ship layers share the same canvas and painter order: rigging, sail, flag,
hero, Hudhud, hull. This represents **1,000 combinations** without exporting
1,000 full ship pictures. `check-learning.mjs` verifies every combination's
SVG geometry against the original authoring factory. It also checks every
SVG diagram in all eleven math topics is represented. The extractions retain
source hashes; fixed five-degree helm poses and bucket levels are exported
states, not a runtime JavaScript renderer.

## USDZ for Swift

Verified using Blender **5.2.1 LTS**, in a separate background process:

```sh
"/Applications/Blender.app/Contents/MacOS/Blender" \
  --background --factory-startup --python-exit-code 1 \
  --python Shared/Art/tools/export_usdz.py -- sea/letters farm/shamiCow
```

This creates `derived/usdz/sea/letters.usdz` and
`derived/usdz/farm/shamiCow.usdz`. Pass other manifest model IDs as needed.
The command imports the shared GLB, then exports USDZ with materials and
textures. Swift rendering/RealityKit visual parity has **not** been
verified; no iOS app has been built.

## What is portable, and what still needs work

- Model geometry, transforms, vertex colors and baked textures are shared.
  Coordinates are right-handed, Y-up, +Z forward; the factory scale is
  retained.
- Moving meshes keep stable names; exposed factory and `userData` object
  references are recorded as `nodeHooks`. Native gameplay can move the
  same tail, head, piano key or windmill blade without rebuilding its art.
- Lambert materials become roughness-1 PBR surfaces. Lights, postprocessing,
  additive glow, shadows and transparent surfaces need native rendering
  review. A successful GLB validation is not visual parity.
- SVG group classes survive as animation hooks. PNGs are static poses;
  CSS animation curves, shader wind/water, particles, billboards, runtime
  scene layout and interaction code are not baked animation clips.
- This is the primary hero/ship/scenery/map artwork and major island
  landmark catalog. All math lesson SVG diagrams and the full ship cosmetic combinations are
  extracted. Diagrams for the other subject islands, other dynamic objects,
  world-globe data and continuous animation clips are **not yet fully extracted**. Follow
  [#16](https://github.com/shibl/sindibad/issues/16) for the remaining work.
- An entire grade should not blindly bundle every model: this initial,
  uncompressed authoring catalog is much larger than the procedural web
  source. Native delivery needs selective packaging/mesh optimization as
  each island is implemented.

## Attribution

Original artwork: [shibl/sindibad](https://github.com/shibl/sindibad),
declared CC-BY-SA by the repository (no version specified there).
This extraction retains that declaration; it does not relicense the art.
Baloo Bhaijaan 2 is SIL OFL. Three.js is MIT. The exported native app
includes the original font license and displays project attribution.
