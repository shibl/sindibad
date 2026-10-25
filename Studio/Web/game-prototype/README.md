# مدن الكيمياء — Unit 1 prototype

A 3D board-and-city game modelled on Monopoly GO (**without dice**) that teaches Unit 1 of the Grade 10 chemistry book,
«المادة وتحوّلاتها», pp. 5–30. A student who plays it through meets every idea, activity and question in the unit.

The look follows Monopoly GO's screens:
- a thick-tiled 3D board seen at a tilted angle, with the camera following the piece and swinging round at the corners;
- a big red «انطلق!» button;
- red ribbon banners;
- houses and hotels appearing on tiles;
- a floating-island city to build (the «ابنِ!» screen);
- an «استكشف!» map of unit islands;
- gold-framed cards.

All art is our own, made from 3D primitives in three.js. Nothing is taken from the game.

## Run it

```
python3 -m http.server 5320 --directory "Grade 10 Textbooks/game-prototype"
```

Open <http://localhost:5320>. It is plain HTML/JS modules with no build step. three.js r160 is vendored in `vendor/`, so it needs
internet only for the Google Fonts (it falls back to system Arabic fonts). Progress is saved in the browser (`localStorage`); ↺ in the top bar resets it.

`http://localhost:5320/?dev` adds a test panel (coins, master all ideas, pass all labs, jump to any tile).

## How the book becomes the game

| Book | Game |
|---|---|
| Unit 1 | One board + one city («مدينة المادة») |
| 8 sections (1-1 … 4-1, 1-2 … 4-2) | 8 colour sets on the board |
| 47 ideas (definitions, results, experiments, إضاءة/إثراء boxes) | 19 property tiles; each idea is one "house". First landing shows the book's text, then a check question |
| Activities (نشاط) and experiments | 6 lab minigames: states sorter, transitions map, heating curve, physical-vs-chemical, complete-vs-reversible, redox lab |
| أختبر نفسي, أسئلة الوحدة, تفكير ناقد | 129 idea questions + 20 exam questions (exam tiles, the challenge corner, 3-step move cards) |
| تعلّمت summaries, أبحث أكثر | ☕ corner |
| Unit project (pp. 27–28) | Shown when the city is finished |

The 📚 «المنهج» screen lists every idea with its page and status. It is the checklist that nothing was skipped.

## No gambling, by design

- **No dice.** You pick 1, 2 or 3 steps, then press «انطلق!». 1 step = recall question, 2 = understanding,
  3 = problem. A right answer moves you exactly that far, and the destination tile glows before you go, so you choose
  where to land.
- **Wrong answers never cost anything.** You stay put and read the explanation.
- **No multipliers, loot boxes, wheels, timers or energy.** Every reward is a fixed, visible amount, and every album
  card has one stated way to earn it.
- **Coins alone can't finish the unit.** Each landmark stage needs coins *and* mastery of its sections, and the last stage
  also needs its labs passed.

## Files

- `js/content-u1.js`: all unit content: ideas, questions, minigame data, exams, landmarks, cards. Teach-card text is the
  book's wording (from `extracted/chemistry/lessons/U1-*.md`). Blocks marked `ours` and all answer keys were written for the game.
- `js/game.js`: turns, teaching, HUD, city rules, album, curriculum map.
- `js/world.js`: the three 3D scenes. These are the board, which has a following camera, houses, hotels and board
  life; the city island, where landmarks are built in stages; and the unit map.
- `js/minigames.js`: the six labs.
- `js/chem.js`: formula renderer (`[[Fe + 2HCl -> FeCl2 + H2]]`).
- `img/u1/`: four figures cropped from the book PDF.

## Answer keys to check with a teacher

The book prints no answers. These keys need more than the book's text to settle, so they are flagged in the game
(`verify: true`):

- Unit Q6: why hydrogen is collected over water.
- Self-test VII: separating copper powder, iron filings and salt (magnet, then dissolve and filter).
- Self-test III, classification: sodium bicarbonate in sweets, pickling fruit, curdling milk (all chemical).
- Unit Q5, complete vs reversible: NaCl + AgNO₃ (complete), acetic acid ionisation (reversible), carbonic acid
  decomposition (reversible), HBr + Cl₂ (complete).
