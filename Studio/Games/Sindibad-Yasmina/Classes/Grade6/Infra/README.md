# Grade 6 infrastructure

`Pages/` contains the existing public root redirect and legacy service-worker retirement script. The repository publication assembler copies them to the public root, and maps this class's `Web/` and `docs/` folders to `/Web/` and `/docs/`.

Public game addresses and storage keys are unchanged by the source reorganisation. Root-level CI/CD configuration remains in `.github/`; staging deploys without tests and main requires the full Grade 6 suite.
