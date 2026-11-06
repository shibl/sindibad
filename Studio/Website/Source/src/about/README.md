# About section bake-off

Six full concepts for the section under the hero (`#about`), built side by side so the team can flip between them on
the local dev server and choose. Only one concept survives, so **each concept is self-contained** and easy to delete.
Everything here runs only in development and nothing is published.

**The book is the section.** Visitors see the storybook, and its index tabs are the only way to the other concepts: the page
turns, doors open, and the camera goes through into the chapter, which is already running behind the book. Inside a chapter the
only control is "Back to the book" (Esc does the same).

For review: `http://127.0.0.1:5173/?about=<id>` opens a concept directly, and H shows the old switcher bar (number keys 0 to 6).
Ids: `storybook`, `xray`, `lantern`, `phone`, `hoopoe`, `sail`. `original` is the old section, for comparison.

## The brief from the studio

"We want wow." "Everything high quality and professional." It has to look shipped by a top studio, not like a demo,
a tech test or a template. Judge your own work that harshly.

The site is Sindibad Studios, a new game studio in Dubai. Their first game, *Sindibad & Yasmina*, sails an archipelago
with Yasmina and her hoopoe guide (screenshots in `src/assets/img/`). The hero above this section already holds six
3D toys, each sitting beside text, so **your concept must not be another object in a box beside a paragraph**. It
should use the full width and feel like its own moment on the page.

### The text is fixed

Use the live text block the host gives you (`ctx.copy`, with `ctx.headline`, `ctx.body`, `ctx.cta`). The words come from
the page in both languages. Never reword, translate, copy or remove them, and never bake them into an image.

> Beautiful worlds, powered by research and grounded in play.
>
> A new game studio from Dubai. We make serious, beautiful games, and we build them to run on every phone, online or
> not. We are game developers, AI researchers and educators. We make games in Arabic and English for players
> worldwide, with a focus on the Gulf.
>
> [Work with us]

- It must be readable at every moment it's on screen (WCAG AA contrast against whatever is behind it), and a visitor
  must reach all of it without doing anything except scrolling.
- `ctx.mark` is the new pink mark (a strip of sun, sail, hull and wave that assembles into a small boat), already in
  `ctx.copy` above the headline. Keep it. Leave it automatic, or call `ctx.mark.set(p)` to tie it to your scene.
- Any extra words you add (a button, a label) need both English and good Arabic, kept in your concept. Don't invent
  claims or numbers about the studio. Facts you can use are in `src/content/en.ts` and `src/AContent.ts`.

### Brand

Ink `#004646`, dark `#013f3b`, pink `#fa2a6f`, blue `#d6ecf0`, mid blue `#badfe6`, paper `#f0efec`. Headings use
`var(--a-heading)` (Bricolage Grotesque), body uses `var(--a-body)` (Figtree), both with IBM Plex Sans Arabic for Arabic.
Pink is the accent, so don't overuse it. Your art can bring in more colour where it serves the world, like the hero's.

### Rights

All art must be original, made by you for this project. **Nothing from `src/assets/a/` except the fonts**: those
illustrations belong to another studio, and replacing them is one reason for this work. No stock art, no downloaded
models or textures. You may reuse this repo's own Blender work in `concepts/blender/` and `public/concepts/`.

## How a concept plugs in

```
src/about/<id>/index.ts            default-exports an AboutMount (see ../types.ts). Create this file LAST (see below).
src/about/<id>/*                   the rest of your code and CSS. Scope all CSS under #about[data-about='<id>'].
public/about/<id>/*                runtime assets. Load them with `${ctx.base}about/<id>/...`.
concepts/blender/about/<id>/*      Blender scripts and .blend files, so every asset can be regenerated.
```

**The switcher lights up as soon as `index.ts` exists**, and the studio may be looking at the page while you work. So keep
your entry somewhere else (for example `main.ts`) and add `index.ts` only once the concept renders properly with no errors.
Test before that with a temporary `index.ts` only if you must, and remove it straight away.

**Only touch files in your own three folders.** Six agents are working in this repo at once. Don't edit `src/A.tsx`,
`src/A.css`, `src/about/index.ts`, `src/about/about.css`, `mark.ts`, `types.ts`, the hero, `package.json`, or another
concept's folders. If you need a change to the host, say so in your final report and work around it. Don't add
dependencies; use raw WebGL2 and plain DOM, as `src/dubai3d.ts`, `src/portal/main.ts` and `src/portal/scene.ts` do.
Don't commit. Don't restart the dev server: it's the studio's, and it already serves your files.

The host resets `#about` to a plain full-width block and gives you an empty `ctx.stage`. `ctx.pin(n)` makes it a
scroll-pinned scene that sticks for `n` extra screens of scrolling. `ctx.frame(fn)` gives you a per-frame callback with scroll
progress, only while the section is near the screen. Move `ctx.copy` wherever you like: when your concept is switched away the
host puts it back and clears inline styles. Your cleanup must release everything else (see below).

Things on the page to design around:

- The top bar is fixed, 128px tall on desktop, and hides on scrolling down and shows on scrolling up. Don't place
  essential content where it would be covered for long.
- The hero's bottom edge is rounded, and its pink scroll button and carousel arrows hang about 30px below it, over the
  top of your section. Your first frame has to look deliberate with them there.
- Below you comes a white area and the "What we do" card rail. Above you is the blue hero. Your edges have to meet them
  cleanly. `.a-space` leaves 140px under the section; override it if your design needs to.
- `#contact` is the CTA's target. Smooth scrolling is Lenis, and sticky positioning works with it.

## Quality bar: all of this is required

**Art.** One clear idea, a strong composition at every scroll position, considered lighting, believable materials,
real depth, and animation with anticipation, weight and settle. No placeholder geometry, programmer colours, default
Blender look, visible banding, aliasing, popping or stretched textures. Make a real art pass after the first version
works, then critique your own screenshots and go again. Expect at least three rounds.

**Layout.** It should look composed at 1440x900, 1920x1080, 1280x720, and a 390x844 phone. The phone layout is designed,
not a shrunken desktop. No sideways overflow, and no text clipped or colliding at any size.

**Arabic.** `/ar/` is right-to-left and its headline is longer, so test it for real. Layout mirrors properly, and text or
letterforms inside art must never appear mirrored.

**Performance.** 60fps on this Mac at 1440x900 and smooth at `--slowcpu 4`. Cap DPR at 2, and lower on touch screens. Stop
all rendering when the section is off screen (`ctx.frame` does this for you). Keep to your weight budget, measured by adding
up the files in `public/about/<id>/`. Compress images: Blender can write WebP directly (`file_format = 'WEBP'`, see
`concepts/blender/claw-sign.py`). Show something composed immediately (a poster or solid colour), then fade in. Nothing
may pop in late.

**Robustness.**
- Never hijack scrolling: no preventDefault on wheel, and on touch keep `touch-action: pan-y` so the page still scrolls.
- `ctx.reduce` gets a composed, mostly static version. No WebGL2 gets a good still image, not a blank area.
- Handle resizing, loading the page already scrolled into the section, and switching away and back repeatedly with no leaks
  and no errors. Cleanup removes listeners (pass `ctx.signal`), stops audio, and frees GL with `WEBGL_lose_context`.
- CTA and any controls work by keyboard with visible focus. Decorative canvases get `aria-hidden`; meaningful art gets
  a label in both languages. No alert, confirm or prompt dialogs.

## Tools

**Screenshots and checks:** `bun scripts/about-shot.ts`. It drives real Chrome with the real GPU, without touching the
studio's browser. Read the header of that file for its options. Read every PNG you produce. A claim you haven't looked at
doesn't count. Typical run:

```sh
bun scripts/about-shot.ts --id <id> --ps 0,0.25,0.5,0.75,1 --fps --out <your scratch dir>/en
bun scripts/about-shot.ts --id <id> --lang ar --ps 0,0.5,1 --out <your scratch dir>/ar
bun scripts/about-shot.ts --id <id> --phone --ps 0,0.5,1 --out <your scratch dir>/phone
bun scripts/about-shot.ts --id <id> --reduce --ps 0 --out <your scratch dir>/reduce
```

Node isn't on this Mac, so use `bun`. Type-check with `bun node_modules/.bin/tsc --noEmit -p .` (`bunx` isn't installed here); errors in your own folder must be zero. Errors
elsewhere aren't yours.

**Blender 5.2** runs headless: `/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P script.py`. The
Blender window on this Mac is the studio's, so don't use the Blender MCP tools or open anything in it. Script your models, so
every asset can be regenerated. `concepts/blender/dubai/render.py` shows how to turn on Cycles with Metal. Its bundled
Python has numpy; the system Python has neither numpy nor PIL.

**Sharing the machine** (M5 Pro, 18 cores, 48 GB): other concepts are rendering too. Run one Blender at a time, under
`nice -n 10`, in the background for anything long. Draft at low samples and small sizes, and do finals with denoising at no
more than about 256 samples unless you can show it needs more.

Put drafts and screenshots in your scratch directory, not in the repo. Don't leave temp files in `public/`.

## Finished means

You've looked at screenshots of every state above and they hold up, the checks report no errors and no overflow, and
`index.ts` exists. Your final report gives: what you built and where the wow is; the paths of your best screenshots;
weight in MB; measured fps; how to regenerate the assets; and anything still weak, stated plainly. Don't describe something
as working or polished unless you saw it.
