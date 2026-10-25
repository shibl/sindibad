# Curriculum infrastructure

The repository workflow is `../../../../.github/workflows/site.yml`. Main runs the Grade 6 suite from `../Classes/Grade6/Web/`; staging publishes immediately without Actions tests.

The publication assembler maps Grade 6 `Web/` to the existing public `/Web/` path and its docs to `/docs/`. The root redirect and old-worker retirement files live in `../Classes/Grade6/Infra/Pages/`. Staging uses the same layout below `/staging/`, preserving its separate saves and caches.

The Grade 10 lab is published at `Studio/Games/Sindibad-Yasmina/Classes/Grade10/Chemistry/Web/`. Its studio product/grade links point to `Studio/Website/Web/`.
