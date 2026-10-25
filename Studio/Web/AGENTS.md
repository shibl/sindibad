# Instructions for coding agents (Codex, Claude, …)

Repo: `github.com/shibl/sindibad`. Scope: `Studio/Web/`. The studio website is separate from the existing game at the repository root `Web/`.

## Brand and navigation

The hierarchy is **Sindibad Studios → The Curriculam → the entire Syrian curriculum → Grades 1–12 → subjects → learning experiences**. The Curriculam (Arabic: المنهاج) is ONE of the studio’s products. The studio is not identical to this one game. Preserve the user’s product spelling, The Curriculam. The product covers ALL school years, not only Grade 10. All twelve grades must have equal prominence. Grade 10 Sciences → Chemistry Lab is one nested example, never the identity of the whole product. Routes: `/home`, `/products/the-curriculam/`, `/products/the-curriculam/#curriculum`, `/products/the-curriculam/grade-{1..12}/`, `/products/the-curriculam/grade-10/chemistry/`, and `/lab.html`. Preserve English and Arabic with the requested fonts.

The user explicitly said to design in source only and **not use computer/browser tools or run tests**. Do not run browser automation, screenshots, HTTP checks, builds, syntax checks, tests, or visual QA unless the user changes this instruction. Source reads and edits are allowed. Keep layouts straight: no tilted cards, rotated panels, decorative badges, or generic template filler. This is a GAME and a game studio website. Use game-world artwork in `assets/`, not classroom photography or school-desk still lifes. The user explicitly requires full-width layouts: no centred max-width page shells. Use edge-to-edge hero artwork and full-width sections with only modest inner padding. Keep body copy aligned to the reading edge, not centred.

The user supplied an 83.56-second recording of Flowfest and Google Labs and requested a frame-by-frame review. The review is in `design/reference-study.md`. Later instructions explicitly require the Google Labs splash and hero, including automatic slide changes: centre the hero title, subtitle, CTA and pagination over full-viewport art, with an overlay header. These explicit reference instructions supersede reading-edge alignment for the hero. Use the original shape paths, tracking curves and timings; only decorative masks/shapes rotate, never cards or artwork panels. The splash contains animated brand text, **no logo image and no Skip intro button**. Retain Escape and reduced-motion support. Play it once per session, never on header anchor navigation or language changes. Keep the orange strip below the hero; its copy describes The Curriculam and Grades 1–12. Local extraction and viewing of the supplied recordings were authorized; this did not authorize browser use or website testing.

## Website goal
Build the Sindibad Studios website and present The Curriculam as a game for the entire Syrian curriculum. Grade and subject pages belong beneath this broad product. Do not invent lesson inventories for subjects not yet implemented.

## Chemistry Lab goal
These constraints apply to the nested chemistry experience, not to the audience or scope of the whole website.
Students of the Syrian Grade 10 (Scientific track) learn the **chemistry book by playing**, not reading.
Everything in the game must match the book's content exactly. The audience is **high school (15–16)**:
mature, clean design, no childish cartoon style, no emoji icons, no gambling mechanics (no dice, loot boxes,
spin wheels or random rewards).

## Folders
| Path | What |
|---|---|
| `extracted/` | Word-for-word transcription of both books (source of truth). Chemistry Unit 1: `extracted/chemistry/lessons/U1-L1.md`, `U1-L2.md`, `U1-Q.md`. Page markers `<!-- page N -->`. |
| `game-prototype/` | Old Monopoly-style board prototype. **The user rejected its look. Do not develop it further.** |
| `./` | **Current website and nested 3D chemistry lab** (plain ES modules, no build step; lab uses three.js r160). |
| `*.pdf` | Source textbooks, kept out of git. |

## Run the lab
```
python3 serve.py
```
Open http://127.0.0.1:5321/home for the **Sindibad Studios** website. The lab is at `/lab.html?lang=en` or `/lab.html?lang=ar` (add `&dev` for test hooks). Direct experiment links use `&experiment=ice` etc. The local preview disables stale asset caches. English Google Sans Flex is bundled locally; Noto Sans Arabic is loaded from Google Fonts. Lenis is vendored locally.

## Website code map
- `js/site.js`, `css/site.css`: shared studio, product, grade, subject, and chemistry collection pages.
- `js/site-motion.js`: Lenis scrolling, anchor navigation, gallery controls, expandable rows and section entrances. This module does not load the game engine.
- `js/site-splash.js`, `js/splash-timeline.js`: reference SVG shape timeline and animated text tracking, with a cleanup watchdog to restore scrolling.
- `js/site-scenes.js`: five-second hero autoplay, progress pagination, three reveal curves, gallery entrances and footer shape interactions. Pause hero motion offscreen or when the document is hidden.
- `js/curriculum.js`: all twelve school years and broad learning areas. These areas are navigation groups, not a claim that every grade has an identical syllabus.
- `js/locale.js`: shared English/Arabic preference and RTL direction.
- `js/engine.js`: renderer, camera and OrbitControls, frame loop, picking, hint halo rings, HTML labels anchored to 3D,
  `anim`/`moveTo`/`fly`, and `scope()`. A scope groups everything one experiment adds, so it can all be removed together.
- `js/materials.js`: Fresnel glass, liquids, canvas textures (labels, hazard pictograms, graduations).
- `js/kit.js`: equipment builders: beaker, test tube, Erlenmeyer, round-bottom flask with side arm, Liebig condenser,
  thermometer, Bunsen burner, tripod and gauze, stand with clamps, rack, bottles and jars, spatula, matches, candle,
  stopper, glass tube, hose, cable, digital display. Also `liquid(profile)`, a lathe clipped by a horizontal plane with `set(level)`.
- `js/fx.js`: flame shader, bubbles, sprite emitter (steam and gases), falling grains, liquid stream.
- `js/acts.js`: hand actions: `scoop`, `pour`, `lightBurner`/`offBurner`, `matchTo`, `flash`.
- `js/room.js`: the lab room: bench, sink and tap, fume hood (fan switch and sash), shelf of reagents, periodic table,
  safety poster, clock, goggles and gloves (PPE).
- `js/ui.js`: notebook panel (task card, questions, book quotes, steps, tools, observation log), SVG live chart, dock
  (speed ×1/×4/×10, toggles), experiment menu, lab report.
- `js/main.js`: runner and the **`lab` API** that experiments script against:
  - `lab.do(text, keys, {wrong, unsafe, kicker})` waits for a click on a 3D object.
  - `lab.ask({q, opts, right, why, kicker, ours})`: `right` is an index, or an array for multi-select.
  - `lab.book({title, page, html})`, `lab.watch(text)`, `lab.log(html)`, `lab.step(i)`.
  - `lab.until(fn)`, `lab.wait(s)`, `lab.simWait(s)`.
  - `lab.chart({...})`, `lab.sim(on)`, `lab.fly(view)`, `lab.toggle({...})`, `lab.cleanup(fn)`.
  - Scoring covers first-try answers, wrong clicks, hints and safety violations. Results are saved in localStorage `chem-lab-v1`.
- `js/exp-a.js`: experiments 1–3: plasma (p. 8), heating ice / heating curve (pp. 11–12), simple distillation (p. 13).
- `js/exp-b.js`: experiments 4–7: Cu + conc. HNO₃ in the fume hood (p. 19), Fe + HCl with H₂ pop test (pp. 19–20),
  I₂ + H₂ reversible reaction with a molecule view (pp. 20–21), CuO + C with limewater (pp. 21–22).
- Markup in any text: `[[Fe + 2HCl -> FeCl2 + H2]]` renders a formula (`<=>` reversible, `->[Δ]` heated);
  `{{66000 V}}` is a left-to-right run.

## Historical lab status (before the current no-testing instruction)
- The lab runs. All 7 experiments play end to end in headless Chrome (`?dev&fast`, auto-answering) with **no console
  errors**. The menu, notebook panel, questions, live charts and lab report all work.
- `?fast` is for slow test machines (software WebGL): it lets the frame clock jump so real-time waits keep pace.
- Earlier lab backlog, deferred while the user requests website design only:
  1. Review every experiment visually at 1440×900 and fix what looks wrong:
     - glass and liquid visibility;
     - objects floating or intersecting;
     - the camera framing each set-up, beside the notebook panel on the right;
     - the hose and cable paths;
     - the delivery tube in `redox`.
  2. Phone layout (≤860px): the notebook becomes a bottom sheet. Check that the 3D stays usable above it.
  3. Performance on a mid-range laptop and phone. If needed, lower the shadow map size or pixel ratio.
  4. Add the remaining Unit 1 content that is not an experiment, such as the Mg + S electron-transfer idea (p. 22–23)
     and the unit questions (`U1-Q.md`), as short in-lab question rounds.
  5. Then Units 2–4: read the matching `extracted/chemistry/lessons/U*.md` and copy the book's wording.
- Commit small and often, and push to `main`.

## Rules
- Text shown inside the chemistry lab comes from the book. Steps not from the book use `{ t: '…', book: false }`. Answers written for
  the game use `ours: true`, which shows "suggested answer, not book text".
- The website is **Sindibad Studios**, in English and Arabic. English uses Google Sans Flex and LTR; Arabic uses Noto Sans Arabic and RTL. Shared language preference: `js/locale.js`. Keep the original Arabic lab text canonical; wrap it with `tr()` and add faithful English translations to `js/lab-en.json`. Label translated textbook passages as translations. Keep the homepage separate from the 3D lab so it does not load WebGL. Do not replace the approved experiments when editing the website.
- Commits: never add `Co-Authored-By` trailers. Use the user's git identity.
- Don't spawn many parallel sub-agents (the user hit usage limits that way).
