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

Desktop duration is 160 frames / 5.33 seconds; mobile is 152 frames / 5.07 seconds. Scroll intent accelerates the timeline. There is no logo image and no Skip intro button. Escape completes the intro and reduced motion bypasses it. A session key prevents repeated intros on page navigation; anchor clicks and language switches stay in the current document. Cleanup restores scrolling and focusability, with a 6.5-second watchdog if animation fails.

## Hero autoplay

The reference bundle confirms a five-second hold and three reveal variants: 1.55, 1.5 and 1.75 seconds, with distinct two-segment cubic curves and rotation durations of .85, .7 and 1 second. `js/site-scenes.js` uses these timings and curves. The active progress dot widens and fills linearly. Playback pauses offscreen, in hidden tabs and while a keyboard-focused control is active. The three concept stills belong to the same product, so its title and CTA stay consistent. These are concept images, not gameplay video.

## Feedback recording and scrolling

All 739 frames of the user's `Screen Recording 2026-10-25 at 2.11.34 PM.mov` were extracted and reviewed on twelve consecutive-frame sheets. It records the old large hero heading, clipped black product heading, vertical scroll jumps over the gallery, and excessive empty space after the last card.

The source now removes those two oversized headings and the gallery's excess trailing padding. Lenis no longer excludes the entire gallery subtree: only horizontal gestures bypass it, through `data-lenis-prevent-horizontal`. Vertical scrolling stays on one controller. The last gallery position is calculated from its actual scroll extent. Homepage brand and section links scroll in place instead of reloading.

Festival people, testimonials, newsletter actions, tilted cards and Google product content were not added. The changes preserve the supplied product hierarchy and the user's ban on tilted cards.

## Review boundary

The supplied video was inspected; the website was edited and reviewed in source. No live browser/computer interaction, HTTP checks, builds, syntax checks, automated tests or runtime visual checks were performed, as instructed. This is an implemented reference blend, not a claim of pixel-identical or runtime-verified reproduction.
