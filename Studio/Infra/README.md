# Studio infrastructure

The static website is in `../Web/`; it has no build step.
The repository's existing `.github/workflows/site.yml` publishes the tracked
files, including `Studio/Web/`. Its existing main-branch checks and publishing
configuration are unchanged by this import.

For a dedicated studio host, use `Studio/Web` as the document root.
The homepage is `/home` (`home/index.html`). For local development, run
`python3 Studio/Web/serve.py` from the repository root and open
`http://127.0.0.1:5321/home`.

No separate infrastructure deployment has been configured here.
