# Studio website design drafts

Five candidate designs for the Sindibad Studios website on one page, with a switcher at the bottom of the screen, for sharing and collecting feedback. The Original design is the default.

- Live: <https://shibl.github.io/sindibad/studio/> (Arabic: <https://shibl.github.io/sindibad/studio/ar/>)
- One design: add `?design=classic`, `monolith`, `mirage`, `krafton` or `supercell` to the link.

`Web/` is a build, not source. The source is [sam-a1a/sindibad-studio-website](https://github.com/sam-a1a/sindibad-studio-website) (Solid, Tailwind, Bun). Do not edit `Web/` by hand: run `bun run deploy` in that repository, which builds the site and commits it here on `main`. Once the main checks pass, `.github/scripts/prepare-pages.py` publishes `Web/` at `studio/`.
