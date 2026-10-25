# Instructions for coding agents (Codex, Claude, …)

Repo: `github.com/shibl/sindibad`. Scope: `Studio/Website/Web/`. The studio website is separate from the games under `Studio/TheCurriculum/Classes/`.

## Brand and navigation

The hierarchy is **Sindibad Studios → The Curriculam → the entire Syrian curriculum → Grades 1–12 → subjects → learning experiences**. The Curriculam (Arabic: المنهاج) is ONE of the studio’s products. The studio is not identical to this one game. Preserve the user’s product spelling, The Curriculam. The product covers ALL school years, not only Grade 10. All twelve grades must have equal prominence. Grade 10 Sciences → Chemistry Lab is one nested example, never the identity of the whole product. Routes: `/home`, `/products/the-curriculam/`, `/products/the-curriculam/#curriculum`, `/products/the-curriculam/grade-{1..12}/`, `/products/the-curriculam/grade-10/chemistry/`, and `/lab.html`. Preserve English and Arabic with the requested fonts.

The user explicitly said to design in source only and **not use computer/browser tools or run tests**. Do not run browser automation, screenshots, HTTP checks, builds, syntax checks, tests, or visual QA unless the user changes this instruction. Source reads and edits are allowed. Keep layouts straight: no tilted cards, rotated panels, decorative badges, or generic template filler. This is a GAME and a game studio website. Use game-world artwork in `assets/`, not classroom photography or school-desk still lifes. The user explicitly requires full-width layouts: no centred max-width page shells. Use edge-to-edge hero artwork and full-width sections with only modest inner padding. Keep body copy aligned to the reading edge, not centred.

The user supplied an 83.56-second recording of Flowfest and Google Labs and requested a frame-by-frame review. The review is in `design/reference-study.md`. Later instructions explicitly require the Google Labs splash and hero, including automatic slide changes: centre the hero title, subtitle, CTA and pagination over full-viewport art, with an overlay header. These explicit reference instructions supersede reading-edge alignment for the hero. Use the original shape paths, tracking curves and timings; only decorative masks/shapes rotate, never cards or artwork panels. The splash contains animated brand text, **no logo image and no Skip intro button**. Retain Escape and reduced-motion support. Play it once per session, never on header anchor navigation or language changes. Keep the orange strip below the hero; its copy describes The Curriculam and Grades 1–12. Local extraction and viewing of the supplied recordings were authorized; this did not authorize browser use or website testing.

## Website goal
Build the Sindibad Studios website and present The Curriculam as a game for the entire Syrian curriculum. Grade and subject pages belong beneath this broad product. Do not invent lesson inventories for subjects not yet implemented.

## Source ownership after the class split

The studio website's home, products, grades, chemistry introduction, artwork, typography, splash and hero remain here. The playable Chemistry Lab belongs to `Studio/TheCurriculum/Classes/Grade10/Chemistry/Web/`; its instructions are in the Grade10 AGENTS.md. The website imports the lab's data-only experiment catalogue and links to its entry through `js/locale.js`. Do not move the actual lab back into the website.

`js/site.js`, `site-motion.js`, `site-splash.js`, `splash-timeline.js`, `site-scenes.js`, `curriculum.js`, and `locale.js` remain the website modules. Lenis remains under `vendor/lenis/`. The website does not load WebGL.

Run the source preview with `python3 serve.py`; it serves the repository so sibling-project links resolve. The canonical home is `/Studio/Website/Web/home/`. Historical `/home` preview links redirect there. This run instruction does not lift the source-only/no-testing rule.

Use the user's Git identity; do not add Co-Authored-By trailers. Commit small changes and push to main when authorised. Do not spawn parallel agents without the owner's instruction.
