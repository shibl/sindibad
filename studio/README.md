# Sindibad Studios website

The company website for Sindibad Studios. Plain static HTML and CSS, no build step.

- `index.html`: English page
- `ar/index.html`: Arabic page (right-to-left)
- `assets/`: shared stylesheet, favicon, game screenshots and self-hosted fonts (Inter, JetBrains Mono, IBM Plex Sans Arabic; all SIL Open Font License, from Google Fonts)

It is published with the rest of the repository by `.github/workflows/site.yml`, so it appears at
`https://shibl.github.io/sindibad/studio/` once merged to `main` (and at `/staging/studio/` from `staging`).
It is separate from the game: nothing in `Web/` loads it, and it is not part of the game's offline cache.

Still to fill in: contact email and phone (marked as placeholders in the contact section) and team names.
