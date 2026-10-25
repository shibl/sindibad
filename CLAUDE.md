# Repository guide

The owner approved this layout on 2026-10-25: separate `Studio/Website` and `Studio/Games/Sindibad-Yasmina` projects, with curriculum experiences grouped under `Classes/Grade1` through `Grade12`.

- Grade 6 game: read `Studio/Games/Sindibad-Yasmina/Classes/Grade6/CLAUDE.md`, `WORKFLOW.md`, `SPEC.md`, and `BACKLOG.md`. Run its commands from the Grade 6 directory.
- Studio website: read `Studio/Website/Web/AGENTS.md`.
- Grade 10 Chemistry Lab and textbook sources: read `Studio/Games/Sindibad-Yasmina/Classes/Grade10/AGENTS.md`. The website and Grade 10 retain the owner's source-only instruction: no browser use, builds, or app tests.
- Preserve unrelated worktrees and native app work. Native clients stay native; do not replace them with WebViews.
- Repository automation lives in `.github/`. Main requires passing Grade 6 checks; staging deploys automatically without Actions tests. Never push the website branch directly.
- Source moves must preserve the public `/Web/` and `/staging/Web/` game paths, saves, and offline caches through the publication mapping.
- Keep shared art beside Grade 6's platforms so its existing relative imports and native asset paths remain valid.
- Do not claim device or visual verification from source, build, or CI results alone.
