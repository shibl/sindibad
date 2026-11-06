# Studio website publishing

Design A's editable source is in `../Source/`. Its generated site is in
`../Designs/Web/` and the existing repository workflow publishes it at `/studio/`.
The build is generated in an upstream checkout with `BASE_PATH=/sindibad/studio`.
See [the build guide](../Designs/README.md) for provenance and update instructions.

`../Web/` contains redirects for the previous website URLs. The publication script
also preserves historical `Studio/Web/` aliases and redirects the old lab entry
to the separate Grade 10 Chemistry project. The game's `/Web/` and `/staging/Web/`
paths, saves, and service workers remain unchanged.

Push source and build updates to `main`; the existing workflow runs the required
checks and publishes. Do not push directly to its Pages branch. The source-only
instruction for website work in this repository remains in effect.
