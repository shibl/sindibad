# Sindibad Studios

The repository contains two projects under `Studio/`:

- [Sindibad & Yasmina](Studio/Games/Sindibad-Yasmina/README.md): class-based learning experiences for Grades 1–12.
- [Studio website](Studio/Website/README.md): the studio presentation, product catalogue, and its own platform directories.

```text
Studio/
├── Games/
│   └── Sindibad-Yasmina/
│       ├── Web/  Android/  iOS/  Infra/
│       └── Classes/
│           ├── Grade1/ … Grade5/
│           ├── Grade6/
│           │   ├── Web/  Android/  iOS/  Infra/
│           │   ├── Shared/Art/
│           │   └── docs/
│           ├── Grade7/ … Grade9/
│           ├── Grade10/
│           │   ├── Chemistry/
│           │   │   ├── Web/  Android/  iOS/  Infra/
│           │   │   └── Archive/game-prototype/
│           │   ├── Physics/
│           │   └── Content/extracted/
│           └── Grade11/  Grade12/
└── Website/
    └── Web/  Designs/  Android/  iOS/  Infra/
```

Grade folders that have no implementation are labelled as reserved. The platform indexes point to class-owned source; they do not duplicate the applications.

## Published game

- [Live game](https://shibl.github.io/sindibad/Web/)
- [Staging game](https://shibl.github.io/sindibad/staging/Web/)
- [Studio website](https://shibl.github.io/sindibad/Studio/Website/Web/home/)
- [Studio website design drafts](https://shibl.github.io/sindibad/studio/)

The game URLs, local saves, and offline-worker locations remain unchanged. The repository-wide workflow in `.github/workflows/site.yml` runs Grade 6 checks on main, then assembles the public files using `.github/scripts/prepare-pages.py`. Staging deploys without Actions tests. Existing `Studio/Web/` page links redirect to the new website and lab locations.

## Development

Run Grade 6 commands from `Studio/Games/Sindibad-Yasmina/Classes/Grade6/`; its [guide](Studio/Games/Sindibad-Yasmina/Classes/Grade6/CLAUDE.md) and [workflow](Studio/Games/Sindibad-Yasmina/Classes/Grade6/WORKFLOW.md) describe testing and publishing.

The studio website and Grade 10 lab retain the owner's source-only/no-testing instruction. Read their scoped agent guides before working on them. No native studio or Chemistry Lab apps are implemented yet.
