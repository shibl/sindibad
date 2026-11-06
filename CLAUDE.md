# Repository guide

The owner approved this layout on 2026-10-25: separate `Studio/Website` and `Studio/Games/Sindibad-Yasmina` projects, with curriculum experiences grouped under `Classes/Grade1` through `Grade12`.

- Grade 6 game: read `Studio/Games/Sindibad-Yasmina/Classes/Grade6/CLAUDE.md`, `WORKFLOW.md`, `SPEC.md`, and `BACKLOG.md`. Run its commands from the Grade 6 directory.
- Studio website: Design A source is in `Studio/Website/Source/`; read `Studio/Website/README.md`. The old site was replaced on 2026-11-06. `Studio/Website/Web/` contains only legacy redirects; read its `AGENTS.md` before changing those.
- Published Studio website: `Studio/Website/Designs/Web/` is the Design A build published at `/studio/`. Never edit it by hand; see `Studio/Website/Designs/README.md`. The former design drafts and switcher have been removed.
- Grade 10 Chemistry Lab and textbook sources: read `Studio/Games/Sindibad-Yasmina/Classes/Grade10/AGENTS.md`; its source-only/no-testing instruction remains in effect. On 2026-11-06 the owner authorized tested Studio CI/CD to the VPS: the Studio build, deployment tests, and HTTP health verification in `.github/workflows/vps.yml` are authorized. See `deploy/vps/README.md`.
- Preserve unrelated worktrees and native app work. Native clients stay native; do not replace them with WebViews.
- Repository automation lives in `.github/`. Main requires passing Grade 6 checks; staging deploys automatically without Actions tests. Never push the website branch directly.
- Source moves must preserve the public `/Web/` and `/staging/Web/` game paths, saves, and offline caches through the publication mapping.
- Keep shared art beside Grade 6's platforms so its existing relative imports and native asset paths remain valid.
- Do not claim device or visual verification from source, build, or CI results alone.
