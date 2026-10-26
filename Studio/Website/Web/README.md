# Website source location

The studio website is now at `Studio/Website/Web/`. The playable Chemistry Lab, experiment modules, Three.js dependencies, textbook transcriptions and archived prototype have moved to `Studio/Games/Sindibad-Yasmina/Classes/Grade10/`. See [Grade 10](../../Games/Sindibad-Yasmina/Classes/Grade10/README.md) for their current locations. Existing descriptions below document the product and design; lab implementation paths are relative to the Chemistry `Web/` directory.

# Sindibad Studios

**Sindibad Studios** creates games and interactive products. **The Curriculam** (Arabic: **المنهاج**) is one of its products: a bilingual game for the **entire Syrian curriculum, Grades 1–12**. The studio homepage presents the studio and a products section. The Curriculam has its own product page, every school year, and the learning areas within each grade.

The Chemistry Lab is one learning experience within Grade 10 Sciences. It contains seven experiments from Unit 1, *Matter and its transformations*. Other grade and subject pages have navigation and honest empty states; their game experiences have not yet been implemented.

## Run locally

```sh
python3 serve.py
```

Open **http://127.0.0.1:5321/Studio/Website/Web/home/**. The preview server disables asset caching. There is no install or build step.

- Studio: `/home`.
- The Curriculam: `/products/the-curriculam/`.
- All twelve grades: `/products/the-curriculam/#curriculum`.
- A school year: `/products/the-curriculam/grade-1/` through `/products/the-curriculam/grade-12/`.
- A learning area: `/products/the-curriculam/grade-10/?lang=en&subject=sciences`.
- Chemistry collection: `/products/the-curriculam/grade-10/chemistry/`.
- The 3D Chemistry Lab: `/lab.html?lang=en` or `/lab.html?lang=ar`.
- A direct experiment: `/lab.html?lang=en&experiment=ice`.
- Arabic studio: `/home?lang=ar`.

The language switch remembers its choice across pages. English uses the bundled **Google Sans Flex** variable font; Arabic uses **Noto Sans Arabic** from Google Fonts, with RTL layout. Lenis and the 3D dependencies are vendored locally.

## Source

| Path | Purpose |
|---|---|
| `home/index.html` | Sindibad Studios home; the root entry forwards to `/home`. |
| `products/the-curriculam/index.html` | Product page and full curriculum navigation. |
| `products/the-curriculam/grade-{1..12}/index.html` | Each grade and its learning areas. |
| `products/the-curriculam/grade-10/chemistry/index.html` | Chemistry Lab introduction and experiment collection. |
| `js/site.js`, `css/site.css` | Shared website presentation, bilingual content, responsive layouts. |
| `js/site-motion.js` | Lenis smooth scroll, anchors, artwork gallery controls, expandable rows and section entrances. |
| `js/site-splash.js`, `js/splash-timeline.js` | Reference splash shapes, keyframes and text tracking. |
| `js/site-scenes.js` | Automatic hero transitions, progress pagination, gallery arrivals and footer shape motion. |
| `js/curriculum.js` | All twelve grades and broad navigation areas. |
| `js/locale.js` | Language preference, document language and direction, shared links. |
| `js/catalogue.js` | Re-exports the class-owned catalogue for the studio presentation. |
| `../../Games/Sindibad-Yasmina/Classes/Grade10/Chemistry/Web/lab.html` | Separate 3D lab entry point. |
| `../../Games/Sindibad-Yasmina/Classes/Grade10/Chemistry/Web/js/lab-locale.js`, `lab-en.json` | English translations of the canonical Arabic lab. |
| `../../Games/Sindibad-Yasmina/Classes/Grade10/Chemistry/Web/js/exp-a.js`, `exp-b.js` | Experiment logic and original Arabic textbook wording. |
| `assets/` | Studio mark and three generated game-world images; the image and prompt index is `game-art.md`. |
| `design/reference-study.md` | Complete recording review, reference timings, and the design decisions drawn from both sites. |
| `../../Games/Sindibad-Yasmina/Classes/Grade10/Content/extracted/` | Word-for-word chemistry and physics textbook transcriptions. |
| `../../Games/Sindibad-Yasmina/Classes/Grade10/Chemistry/Archive/game-prototype/` | Retired prototype, kept for reference. |

Pages use the full viewport width, with edge-to-edge game artwork and modest inner padding. There is no centred max-width page shell. The former `/sindibad-yasmina/` pages remain aliases for existing links; navigation now uses `/products/the-curriculam/`. The product spelling follows the user’s name, **The Curriculam**.

The 2026-10-25 design combines Flowfest's warm paper, ink outlines and colour bands with the Google Labs intro, full-viewport hero and spacious image browsing. The splash uses the reference's vector paths, transform keyframes and text-tracking curves, with Sindibad text in the requested font. Its timeline lasts 5.33 seconds on desktop and 5.07 seconds on mobile; scroll intent accelerates it. There is no logo image or Skip intro control. Escape ends it, reduced motion bypasses it, and it plays on the first visit and on every refresh of the home page, but not when arriving from another page, going back or forward, following a section link or changing language.

The 2026-10-26 refinement keeps the splash, hero and fonts, and adds Flowfest's stickers, moving orange band, dark studio section with colour bars and pink panel, Google's white gallery cards over large shapes, rounded display type from Google Sans Flex's own axes, and a physics pile of outlined shapes in the footer. See `design/reference-study.md`.

The hero centres The Curriculam title, subtitle and CTA over game concept art, with an overlay header and bottom progress pagination. It advances automatically after five seconds using three shaped reveal variants. Autoplay pauses offscreen, in a hidden tab or for keyboard focus. The orange curriculum strip remains below it. Lenis controls vertical scrolling; the gallery retains native horizontal scrolling without bypassing Lenis for vertical gestures. Gallery cards enter upright, disclosure panels expand, and footer shapes react to the pointer. The twelve-grade grid gives every school year equal space.

The broad learning areas are navigation groups, not a statement that each grade has the same syllabus. The new website does not load WebGL until the lab is opened.

Arabic textbook wording is canonical; English textbook excerpts are labelled as translations. Switching language in an active experiment restarts it. Completed results remain in the browser's `chem-lab-v1` localStorage record. Existing developer hooks use `&dev&fast` on lab URLs.

The website redesign is source-only at the user's request: no browser use, builds, or testing. Historical lab checks do not verify the new website design.

The source textbook PDFs stay local and are not included in Git.
