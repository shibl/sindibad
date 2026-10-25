# Studio website infrastructure

The static source is `../Web/`. The repository workflow assembles it at `Studio/Website/Web/`, separately from the curriculum games. Old `Studio/Web/` HTML links redirect to the corresponding new page. The old lab entry redirects to Grade 10 Chemistry.

Run `python3 Studio/Website/Web/serve.py` from the repository root for the owner to preview at `http://127.0.0.1:5321/Studio/Website/Web/home/`. The server exposes the repository's Studio tree, so the chemistry catalogue, game links and studio assets resolve across projects. Do not deploy only the website folder in isolation: publication also includes the Grade 10 Chemistry web folder.

Main retains full Grade 6 checks before publishing. Staging deploys immediately without Actions tests. The studio website itself retains the source-only/no-testing instruction in `../Web/AGENTS.md`.
