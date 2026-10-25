# Grade 10 instructions

Scope: `Studio/TheCurriculum/Classes/Grade10/`. The studio website is separate at `Studio/Website/Web/`.

The user explicitly said to design in source only and **not use computer/browser tools or run tests**. Do not run browser automation, screenshots, HTTP checks, builds, syntax checks, tests, or visual QA unless the user changes this instruction. Source reads and edits are allowed.

## Chemistry Lab goal
These constraints apply to the nested chemistry experience, not to the audience or scope of the whole website.
Students of the Syrian Grade 10 (Scientific track) learn the **chemistry book by playing**, not reading.
Everything in the game must match the book's content exactly. The audience is **high school (15–16)**:
mature, clean design, no childish cartoon style, no emoji icons, no gambling mechanics (no dice, loot boxes,
spin wheels or random rewards).


## Source layout

- `Content/extracted/`: word-for-word chemistry and physics textbook source. Chemistry Unit 1 is `Content/extracted/chemistry/lessons/U1-L1.md`, `U1-L2.md`, and `U1-Q.md`. Preserve page markers and canonical Arabic wording.
- `Chemistry/Web/`: current lab, plain ES modules and three.js r160. Its `lab.html` entry accepts `lang=en` or `lang=ar`, `experiment=ice`, and historical `dev`/`fast` hooks.
- `Chemistry/Archive/game-prototype/`: rejected board prototype. Preserve for reference; do not develop it further.
- Source PDFs stay local and out of Git.

`Chemistry/Web/js/main.js` owns the lab API. `exp-a.js` implements experiments 1–3; `exp-b.js` implements experiments 4–7. Engine, kit, materials, room, acts, effects, UI, formula and sound modules remain beside them. Keep the approved experiments unchanged when moving or linking files.

## Content and language rules

Text shown in the lab comes from the book. Steps not from the book use `{ t: '…', book: false }`. Suggested answers use `ours: true`. Preserve `[[formula]]` and `{{left-to-right text}}` markup. Wrap canonical Arabic with `tr()` and add faithful English entries to `Chemistry/Web/js/lab-en.json`; label translated textbook passages as translations.

English uses Google Sans Flex/LTR; Arabic uses Noto Sans Arabic/RTL. Keep the existing `sindibad-language` preference and `chem-lab-v1` saved results. Switching language restarts the active experiment. The display name remains The Curriculam / المنهاج.

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
  5. Then Units 2–4: read the matching `Content/extracted/chemistry/lessons/U*.md` and copy the book's wording.
- Commit small and often, and push to `main`.


## Commits

Use the user's Git identity, no Co-Authored-By trailers. Commit small changes and push to main when authorised. Do not spawn parallel agents without the owner's instruction.
