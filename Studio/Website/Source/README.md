# Sindibad Studios website: design A

Design A of the Sindibad Studios website, as its own site, in English and Arabic (right-to-left).
It was moved out of [sindibad-studio-website](https://github.com/sam-a1a/sindibad-studio-website)
(commit 9f5a7c8), where it was one of eight designs behind the floating **Design** switcher.
This copy has no switcher: design A is the whole site.

Built with [Solid 2.0](https://v2.solidjs.com) (release candidate), Tailwind CSS v4 (for its base
reset) and [Lenis](https://lenis.darkroom.engineering) smooth scrolling, using [Bun](https://bun.sh)
and Vite.

```sh
bun install
bun run dev        # http://localhost:5173 (English) and /ar/ (Arabic)
bun run build      # type-check, build and prerender into dist/
bun run preview    # serve dist/
```

## How it fits together

- `index.html`, `ar/index.html`: one HTML shell per language, holding the `<head>` (title,
  description, Open Graph, hreflang). The page language comes from `<html lang>`.
- `src/A.tsx`, `src/A.css`: the design. `src/AContent.ts` holds its own copy (principles,
  insights, projects); the rest of the copy comes from `src/content/` (one file per language,
  typed by `types.ts`).
- `src/assets/a/`: design A's illustrations and fonts (Bricolage Grotesque and Figtree, SIL Open
  Font License). See `src/assets/a/README.md` for where the reference artwork came from and
  its rights.
- `src/assets/img/`: Sindibad & Yasmina screenshots. `src/assets/fonts/` and `src/fonts.css`:
  IBM Plex Sans Arabic for Arabic text.

`bun run build` prerenders both pages to static HTML (`src/entry-server.tsx` via
`scripts/prerender.ts`), so the content is in the page before any JavaScript runs;
`src/entry-client.tsx` then hydrates it and starts Lenis.

For a GitHub Pages project site, build with `BASE_PATH=/<repo>` so asset URLs include the repo
path (see `vite.config.ts`).
