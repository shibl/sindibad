# Published Studio website — Design A

`Web/` is the generated Design A site, replacing all previous design drafts.
Do not edit generated files by hand.

- English: https://shibl.github.io/sindibad/studio/
- Arabic: https://shibl.github.io/sindibad/studio/ar/
- Portal: `/studio/portal/` and `/studio/ar/portal/` under the repository base.
- Source snapshot: [`../Source/`](../Source/), upstream commit `dd6cf8a52aad92d33af93fce054218587f7e6651`.

For this import, `BASE_PATH=/sindibad/studio bun run build` ran in a separate
checkout of the upstream source repository, then its `dist/` replaced `Web/`.
Future upstream imports must update the source snapshot and generated build together.
The old multi-design repository's `bun run deploy` must no longer target this folder.

Commit changes to `main`; `.github/workflows/site.yml` checks the publication layout
and publishes this directory at `studio/` using `.github/scripts/prepare-pages.py`.
Never push directly to the Pages publishing branch.
