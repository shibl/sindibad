# Sindibad Studios website

The company website for Sindibad Studios. Plain static HTML and CSS, no build step.

- `index.html`: English page
- `ar/index.html`: Arabic page (right-to-left)
- `assets/`: shared stylesheet, logo, game screenshots and the bundled Baloo Bhaijaan 2 font (OFL, copied from `Web/fonts/`)

It is published with the rest of the repository by `.github/workflows/site.yml`, so it appears at
`https://shibl.github.io/sindibad/studio/` once merged to `main` (and at `/staging/studio/` from `staging`).
It is separate from the game: nothing in `Web/` loads it, and it is not part of the game's offline cache.

Still to fill in: contact email and phone (marked as placeholders in the contact section) and team names.
