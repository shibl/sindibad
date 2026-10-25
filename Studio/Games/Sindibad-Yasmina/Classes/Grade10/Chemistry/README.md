# Grade 10 Chemistry

[Web](Web/) contains the existing 3D Chemistry Lab, with seven experiments from Unit 1, *Matter and its transformations*. Its entry is `Web/lab.html`; `Web/index.html` forwards there with language/experiment parameters preserved.

- `Web/js/exp-a.js` and `exp-b.js`: unchanged experiment logic.
- `Web/js/catalogue.js`: the experiment catalogue also presented by the studio website.
- `Web/js/lab-en.json`: English translations of canonical Arabic textbook passages.
- `../Content/extracted/chemistry/`: source textbook transcription.
- `Archive/game-prototype/`: the rejected board prototype, retained only for reference.
- `Android/` and `iOS/`: reserved, no native app implemented.

The lab keeps `chem-lab-v1` saves and the existing language preference key. Product and grade navigation returns to the separate studio website. Read `../AGENTS.md`; this move has source review only for the lab, not runtime or visual verification.
