# Workflow — adding or changing something in the game

The steps to follow for every new feature, lesson or fix, for people and
for agents. Read it together with [`CLAUDE.md`](./CLAUDE.md) (agent rules),
[`SPEC.md`](./SPEC.md) (the design) and [`BACKLOG.md`](./BACKLOG.md) (the
work queue).

## 1. Before you start: check the brief

Open [`docs/original-project-brief.md`](./docs/original-project-brief.md),
the founding brief. Check the idea against it:

- **Mission**: a free path through the Syrian curriculum, where fun and
  discovery make kids want to learn, not pressure.
- **Limits**: works fully offline; light enough for cheap Android phones
  (2 GB memory); no personal data; no ads, no purchases.
- **Identity**: Syrian/Levantine look and Arabic first. Nothing that looks
  foreign or generic.

If the idea goes against the brief, stop and ask the owner. Then check
SPEC.md and BACKLOG.md: is it already planned, already done, or decided
against?

### Current owner decisions

- 2026-10-12: no new **online** or **time-based** features for now (no
  daily timers, no countdowns, nothing that needs the internet to play).
- **Fun but fair**: pearls and rewards never buy answers or skip learning.
  No guilt messages ("your streak will die!"). No random prize boxes.
- "Too hard" → improve the teaching (hint, mini-lesson, example). Keep the
  question's difficulty (CLAUDE.md).

## 2. While you build

- **Use the plugin system.** A new lesson is one file in a topic folder
  under `plugins/`. A new kind of play is one engine in `plugins/engines/`.
  The core (`core/`) should not change when content is added. Guide:
  [`plugins/README.md`](./plugins/README.md).
- **Lesson content is draft until a teacher approves it.** Say "Draft
  content, pending review by Syrian educators" at the top of the file.
  Every lesson change needs a teacher's approval before it goes live.
- **Match the game.** Same cartoon style, the colour tokens in `style.css`,
  the bundled font, Arabic-Indic digits through `num()`, right-to-left.
- **Arabic text**: check that the counted noun agrees with the number
  (٣ دراهم، ١٥ درهماً، ٢٠٠ درهم). Use the generic imperative (اضغط، فكّر).
  Hints point to the rule; they never give the answer away.
- **Small phones first.** Most players have 360-px-wide Android phones.
  The question and its main buttons must be visible without scrolling at
  360×740 and 320×568.
- **Offline**: no network requests, no files from other sites. After
  adding or changing a file the game loads, run `node tools/update-shell.mjs`.

## 3. Test

- `npm test` must pass.
- A new engine needs a test hook: tag the right answer with `data-ok`, and
  each useful tap with `data-step` if it takes several taps (see
  `plugins/engines/kit.js`). Add the new lesson to the test in
  `tests/e2e.mjs`.
- Play it yourself on a local server before shipping (step 5).

## 4. Update the docs (every time)

| file | what to update |
|---|---|
| `README.md` | "What's playable now": number of lessons, kinds of play, anything new a player can do. "Layout" if folders changed. |
| `docs/original-project-brief.md` | Keep the brief's own text as it is: it is the founding record. Update the **«أين وصلت اللعبة؟»** list at the end when a part of the brief is done, or when the game departs from it (and why). |
| `BACKLOG.md` | Mark items done; add a dated "Playtest notes" section: what was built, what was tested, what broke, 2–4 next items. |
| `SPEC.md` | Only when the design or a rule changes. Write the decision and its date. |
| `plugins/README.md` | When you add an engine or a visuals helper. |
| `about.html` | When the numbers it quotes change (lessons, islands). |

## 5. Preview, then ship

1. Run a local server from the repo root: `python3 -m http.server 8000`,
   then open <http://localhost:8000/>. If you see an old version, reload
   once more: the offline cache updates in the background.
2. Commit only the files of this change; never sweep in unrelated local
   edits.
3. For work from a GitHub issue, write the pull request with the headings
   in CLAUDE.md (Problem, Evidence, Change, Tested, Lesson content changed).
4. Merging into `main` publishes the game once BACKLOG item 23 is set
   up; until then the live site is built from the branch
   `claude/sharp-hawking-0380ax`. Lesson changes also need a teacher's
   approval.

## 6. More rules

To be chosen with the owner.
