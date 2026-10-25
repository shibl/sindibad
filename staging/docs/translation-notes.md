# Arabic and English game text

Issue [#18](https://github.com/shibl/sindibad/issues/18) adds a device-wide
language choice before play and during any activity. Arabic is the default.
The English catalogue covers the current web game's interface, story,
questions, choices, hints, explanations, lesson cards, island dialogue,
educational facts and About page. It is bundled in the offline cache.

The original Arabic curriculum remains the source of truth. Display text is
updated in place; no question is regenerated and no answer key, saved ID,
score, profile name or 3D scene is changed by switching language. Arabic
practice words, grammatical endings and word order remain Arabic; the
surrounding teaching guidance is English. Explicit English practice speech
continues to use an English voice.

## Editing a translation

- `Web/core/i18n/en.ts`: interface and navigation.
- `Web/core/i18n/content-en.ts`: curriculum display phrases.
- `Web/core/i18n/arabic-en.ts`: Arabic teaching guidance and literal examples.
- `Web/core/i18n/math-en.ts`: mathematics guidance and formulas.

Each entry puts the Arabic source beside its English translation, providing a
before/after review map. Preserve every numbered/named placeholder, number,
unit and formula. Arabic examples enclosed in guillemets remain literal when
a placeholder is substituted. Short terms may need subject-specific wording
(for example, a grammatical verb versus an action force).

Run `npm --prefix Web run build` after editing TypeScript; commit the generated
JavaScript and offline cache manifest. `npm --prefix Web test` checks catalogue
coverage, distinct translated choices, placeholders, both directions of live
switching, progress, offline persistence, speech and the existing game suite.

## Review status

**Draft content, pending review by Syrian educators.** Interface wording and
Arabic/math guidance were authored for this change. Other curriculum drafts
were generated locally with
[Helsinki-NLP/opus-mt-tc-big-ar-en](https://huggingface.co/Helsinki-NLP/opus-mt-tc-big-ar-en),
then corrected for terminology, variables, numerical ranges and ambiguous
answer choices. The biology and simple-machine glossaries also received a
terminology pass. The coverage check validates every current curriculum
display fragment and checks that translated answer choices stay distinct;
focused regressions protect formulas, anatomy terms, Arabic examples and
the different meanings of “لا” (No / the music note La).
No translation service or model runs in the shipped game.
This is not a claim of a complete educator review of every translated lesson.
