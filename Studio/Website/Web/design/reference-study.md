# Flowfest and Google Labs — recording study

Source: the user's `Screen Recording 2026-10-25 at 1.08.11 PM.mov` (the original filename has a narrow no-break space before PM).

The recording is 3420 × 2214, 83.560 seconds, and contains 4,735 frames. All frames were extracted without frame-rate resampling. Every frame was reviewed in order on 74 consecutive-frame sheets, with timestamps and 64 frames per sheet (63 on the last sheet). Nine additional larger frames were extracted for readable layout details. The extraction, timestamp file and sheets are local, ignored artifacts in `.preview/reference-2026-10-25/`; they are not website assets.

## Observed sequence

| Recording time | Reference | Observed composition and behaviour |
| --- | --- | --- |
| 0–2.2s | Flowfest | Cream hero; black outlined display type; orange, yellow and pink pipes enter from the edges; sticky navigation. |
| 2.2–6.4s | Flowfest reload | Blank paper, small marker, drawn colour bands, then staged headline and artwork arrival. |
| 9.3–14.5s | Flowfest scroll | Hero images give way to an orange separator and a black about section. Colour bands visually connect the sections. |
| 15–18.3s | Flowfest speakers | Portraits on solid colour panels, strong boundaries, selective overlap. |
| 18.4–23.2s | Flowfest activities | Full-width stacked colour rows; pointer hover reveals an image near the row. |
| 24.3–29s | Flowfest lower page | Scroll-stacked testimonials, FAQ, pink CTA and illustrated footer. |
| 30–35.7s | Flowfest FAQ | Scroll back; an orange folder-like row opens into a cream answer panel and closes with a short height transition. |
| 36–43.6s | Flowfest return | Navigation moves back through the sections to the hero. |
| 43.68–44.9s | Google Labs | Existing full-width feature with a large image and sparse navigation. |
| 44.9–49.8s | Google Labs reload | Warm blank page; small centred animated text. Yellow clover above left, blue circle at right, pink rounded hexagon at left, green rounded rectangle below right. Shapes grow and rotate, then withdraw as the label fades. A central rounded-hexagon aperture rotates and expands into the feature. |
| 49.8–58.9s | Google Labs features | Full-viewport artwork; centred title, subtitle and CTA; overlay navigation; centred bottom arrows and progress dots. Slides advance automatically as well as on click. A rotating, expanding mask reveals the next upright image. |
| 59.1–61.7s | Google Labs discovery | Scroll reveals a spacious horizontal gallery. Cards enter, with clipped neighbours, image-led content, small arrows and rounded category controls. |
| 62.4–70.8s | Google Labs gallery | Arrow navigation shifts the cards. Preview media changes inside a card; category controls show dark hover states. |
| 71–74.8s | Google Labs about | Short statement followed by a second gallery of tall dark product cards. Titles remain near the bottom; supporting text appears on hover. |
| 75–78.9s | Google Labs footer | Large solid geometric shapes above an oversized wordmark. Shapes respond to the pointer with movement. |
| 79–83.56s | Google Labs return | Rapid scroll back to the hero, then the feature remains in view. |

## Implemented blend

- Studio hero: full-viewport game artwork, centred **The Curriculam** title/subtitle/CTA, overlay navigation, automatic five-second slide timer, expanding progress dot and three reveal variants. No oversized Sindibad heading above the hero. The orange strip below it remains, with the product name, Grades 1–12 and a game link.
- Product section: warm paper, two-column introduction to **The Curriculam**, then a three-image concept-art gallery with visible adjacent artwork, large background shapes and small circular controls. The giant black “Our products” heading was removed. The three images show one product, not three invented products.
- Product page: panoramic game-world artwork, five coloured expandable subject rows, a twelve-grade grid, and folder-like question panels.
- Footer: large straight geometric shapes and a viewport-spanning Sindibad wordmark.
- Motion: Lenis vertical scrolling, smooth hover states, upright gallery entrances lasting 1.8 seconds, native horizontal scrolling with snap, expanding disclosure panels, and falling/pointer-reactive footer shapes. Hero and splash masks rotate as the reference requires; artwork and cards stay upright.
- Content: studio → one product → the whole Syrian curriculum → Grades 1–12 → subject → experience. Chemistry remains nested under Grade 10 Sciences. The availability answer identifies the seven implemented experiments without inventing other playable lessons.
- Locale: locally bundled Google Sans Flex variable font for English; Noto Sans Arabic and RTL for Arabic. Body copy follows the reading edge. The splash and hero are centred because later instructions explicitly request the Google compositions.

## Requested splash

`js/site-splash.js` evaluates the reference's original 30 fps desktop/mobile transform keyframes from `js/splash-timeline.js`. The shape geometry, colours, parent transforms and easing data were inspected in the public Google Labs bundle `https://labs.google/main-UXSONREC.js` (2026-10-25). No Google wordmark artwork is included. The original glyph-position curves drive tracking on Sindibad's own text in Google Sans Flex; Arabic keeps each word joined. The reference motion is glyph tracking, not an invented weight oscillation.

Desktop duration is 160 frames / 5.33 seconds; mobile is 152 frames / 5.07 seconds. Scroll intent accelerates the timeline. There is no logo image and no Skip intro button. Escape completes the intro and reduced motion bypasses it. It plays on the first visit and on every refresh of the home page (owner decision, 2026-10-26); a refresh returns to the hero. A session key skips it when arriving from another page of the site, and back/forward, section links, anchor clicks and language switches never play it. Cleanup restores scrolling and focusability, with a 6.5-second watchdog if animation fails.

## Hero autoplay

The reference bundle confirms a five-second hold and three reveal variants: 1.55, 1.5 and 1.75 seconds, with distinct two-segment cubic curves and rotation durations of .85, .7 and 1 second. `js/site-scenes.js` uses these timings and curves. The active progress dot widens and fills linearly. Playback pauses offscreen, in hidden tabs and while a keyboard-focused control is active. The three concept stills belong to the same product, so its title and CTA stay consistent. These are concept images, not gameplay video.

## Feedback recording and scrolling

All 739 frames of the user's `Screen Recording 2026-10-25 at 2.11.34 PM.mov` were extracted and reviewed on twelve consecutive-frame sheets. It records the old large hero heading, clipped black product heading, vertical scroll jumps over the gallery, and excessive empty space after the last card.

The source now removes those two oversized headings and the gallery's excess trailing padding. Lenis no longer excludes the entire gallery subtree: only horizontal gestures bypass it, through `data-lenis-prevent-horizontal`. Vertical scrolling stays on one controller. The last gallery position is calculated from its actual scroll extent. Homepage brand and section links scroll in place instead of reloading.

Festival people, testimonials, newsletter actions, tilted cards and Google product content were not added. The changes preserve the supplied product hierarchy and the user's ban on tilted cards.

## 2026-10-26 refinement

The recording was reviewed again: the whole 83.56 seconds at 6 fps (501 frames on 21 sheets), and every animated passage at 30 fps (Flowfest intro 2.4–6.6s, Google Labs splash 44.8–50s, hero mask reveals 52.3–54.2s, gallery arrival 59.5–62.6s, footer shapes 77.3–79.3s). The owner asked to keep the splash and the hero exactly as they were, and to keep Google Sans Flex and Noto Sans Arabic.

The rule for the blend: Google Labs sets the calm paper layout, the full-viewport hero, the spacious gallery and the footer; Flowfest sets the personality. Foreground objects (cards, stickers, panels, footer shapes) carry an ink outline; atmospheric background blobs do not.

- Typography: looser heading and wordmark tracking (the letters touched). Display titles use Google Sans Flex's own `ROND` and weight axes for Flowfest's chunky, rounded headings. Font motion: revealed titles start at weight 500 and `ROND` 0 and round up to 800 and 100; Noto Sans Arabic animates weight only.
- Hero: unchanged apart from a Flowfest-style date pill, here the studio mark and “A Sindibad Studios game · Grades 1–12”.
- Orange strip: Flowfest's moving band (The Curriculam, the whole Syrian curriculum, Grades 1–12, Arabic & English), paused on hover, static with reduced motion, with the “Explore the game” link kept at its end.
- Products: the title takes an orange “Grades 1–12” sticker. The gallery uses Google's white cards (image, title, one line, tag) over the splash's own blue circle and a green hexagon, which move and turn with scroll. Cards stay upright.
- The studio: Flowfest's dark section, with six stepped colour bars hanging from the top that lengthen as the section scrolls in.
- New pink panel before the footer (Flowfest's ticket panel): bands in the top corner that draw with the scroll, every time: in as the panel arrives (complete once its middle reaches the middle of the screen) and back out when scrolling up. The studio page links to the grades; the product page links to the Chemistry Lab, the one playable experience.
- Footer reveal (2026-10-26, from Olivier Larose's sticky-footer tutorial, method 1): the footer is a slot with `clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%)` holding a `position: fixed; bottom: 0` panel of the same height, min(820px, viewport minus the header); 600px on phones. The page lifts away to reveal it, wordmark first. Style from the tutorial: slate `#4E4E5A`, white text, uppercase headings at 50% white, two link columns (Products: The Curriculam; Studio: About), a giant wordmark (line-height .8) with the copyright at its end. The pile drops once a third of the footer is revealed, because the observer watches the slot, not the fixed panel.
- The whole site is unselectable (`user-select: none` on the root), and the footer has no Back to top link.
- Gallery arrival is scroll-linked: each card's offset and opacity follow the gallery's position (settled once its top is 40% up the screen) instead of a 1.8-second timer, and hover lifts wait until Lenis stops scrolling. The timer kept cards moving after the scroll had stopped, and a card under the cursor lifted mid-scroll.
- Footer: Google Labs' pile. Nine shapes from the splash geometry appear one by one inside the area when the footer is reached and fall, then settle (squares and hexagons tip onto a flat side). Open space above the pile and a ceiling keep a lifted or tossed shape in view. A shape can be picked up with a mouse or finger, carried, and released or gently tossed (capped at 900 px/s); a tap is a small hop; only a quick swipe nudges the others. Computation stops once everything is still. With reduced motion they are placed at rest without animation.

The gallery arrows step by each card's real position, so Back works from the last card, whose start edge cannot reach the track's start; arrows stay centred inside round buttons on hover.

The 2026-10-26 pass was checked with local headless Chromium screenshots at 1440 × 900 and 390 × 844, in English and Arabic, with the owner's permission for this pass: home, product, Grade 10 Sciences and Chemistry pages, the footer pile under pointer, tap and reduced motion, and a language switch. No console errors were reported. The standing source-only rule in `AGENTS.md` is unchanged.

## Kalam (2026-10-26)

Kalam, the studio's second product, joins the home products section after The Curriculam's gallery, the header navigation and the footer, and has its own page at `/products/kalam/`. There is no Kalam artwork yet, so the visual is a labelled illustration scene of a Telltale moment, built in HTML and CSS rather than as a picture: letterboxed night, a stranger's line, four timed answers in the language being learnt with a gloss in the reader's language, and the corner notice (“They will remember that.”, “They noticed your tone.”, “They noticed your silence.”). English readers see the Arabic-learning version and Arabic readers the English one. The timer shrinks from both ends over seven seconds, silence is chosen when it runs out, and the moment resets after 3.2 seconds; it pauses offscreen and in hidden tabs, keys 1–4 answer, and reduced motion removes the timer. A second, yellow band for Kalam sits under the orange Curriculam band on the home page and runs the opposite way, ending in “Explore Kalam”. The page has a cinematic hero whose letterbox bars close in, the scene, four play principles, the two learning directions, an honest “first story is in production” poster, and a pink panel back to The Curriculam. No story titles, characters or lessons were invented.

## Multi-product hero (2026-10-26)

The owner asked for Google Labs' multi-product hero, measured again from the recording (51 s and 53 s): one product per slide with a regular-weight centred title at about 7% of the viewport width, one line, a light pill with no arrow, and the arrows and progress pagination about 7% of the screen height above the bottom. The reveal mask expands from the centre carrying the incoming slide's art and words together, with the outgoing slide still visible around it. The hero now has two slides, The Curriculam (game-world art) and Kalam, five seconds each, with the Pink hexagon and Green rounded-square masks. Each slide carries its own shade, so the mask brings it in too. Kalam's slide is a night scene with upright pieces of its interface at the edges (the notice, the stranger's line and timer, the four answers, Hello / مرحبا), after the floating instruments of Google's Flow Music slide; the cards stay upright because of the no-tilt rule. The Flowfest label pill above the title was removed, since Google's slides have none. Hidden slides are `inert`.

## Review boundary

The supplied video was inspected; the website was edited and reviewed in source. No live browser/computer interaction, HTTP checks, builds, syntax checks, automated tests or runtime visual checks were performed, as instructed. This is an implemented reference blend, not a claim of pixel-identical or runtime-verified reproduction.
