// The contract between the About section's host (index.ts) and each concept (<id>/index.ts).

export type AboutMark = {
  /** The new pink mark, already inside `copy`, above the headline. */
  el: SVGSVGElement
  /** 0 is the strip of four shapes, 1 is the assembled boat. Turns off the automatic behaviour. */
  set: (p: number) => void
}

export type AboutCtx = {
  /** The #about section. The host has reset its layout to a full-width block. */
  section: HTMLElement
  /** An empty full-width element inside the section. It belongs to the concept. */
  stage: HTMLElement
  /** The live text block: mark, h2, p and the CTA. Style or move it, but never copy, reword or remove it. */
  copy: HTMLElement
  headline: HTMLHeadingElement
  body: HTMLParagraphElement
  cta: HTMLAnchorElement
  mark: AboutMark
  lang: 'en' | 'ar'
  rtl: boolean
  /** The visitor prefers reduced motion. Show a composed, static version. */
  reduce: boolean
  /** Coarse pointer and narrow screen, so no hover and less GPU. */
  touch: boolean
  /** Aborted when the concept is switched away. Pass it to every listener and fetch. */
  signal: AbortSignal
  /** Vite's base path, ending in a slash. Prefix every public asset with it. */
  base: string
  /**
   * Make the section a scroll-pinned scene: the stage sticks to the viewport for `length` extra
   * viewport heights of scrolling. Without this the section keeps its natural height.
   */
  pin: (length: number) => void
  /**
   * Run `fn` on every animation frame while the section is near the screen. `p` runs 0 to 1 across
   * the pin, or across the section passing through the viewport when it isn't pinned. `dt` is in
   * seconds and capped, so a background tab can't cause a jump.
   */
  frame: (fn: (p: number, dt: number) => void) => void
  /** Only for the book, the concept that holds the others. */
  chapters?: {
    go: (id: string) => void
    preload: (id: string) => void
    register: (api: BookApi) => void
    /** Mounted out of sight, as the reader arrived straight in a chapter. The words aren't the book's until it's visited. */
    parked: boolean
  }
}

/** What the host hands the book for a trip into a chapter. */
export type BookTrip = {
  /** The chapter's stage, already behind the book. The book moves it a little as the camera falls toward it. */
  stage: HTMLElement
  /** Settles once the chapter has drawn. The doors stay shut until then. */
  ready: Promise<unknown>
  /** The doors are starting to open, so the chapter should start moving. */
  opening: () => void
}

/** The book can carry the reader into the other concepts. The host drives these; the book's tabs call `ctx.chapters.go`. */
export type BookApi = {
  /** Leaves a picture of the words on the page, so the real ones can go ahead to the chapter. Call it before anything moves them. */
  lend: () => void
  /** From the open book into a chapter. Resolves once the camera is through the doors. */
  depart: (id: string, trip: BookTrip) => Promise<void>
  /** From a chapter back to the open book. `release` runs once the doors have shut, with where the page should scroll to. */
  back: (id: string, stage: HTMLElement, release: (p: number) => void) => Promise<void>
  /** From one chapter through the book to another. `release` swaps the chapters once the doors have shut. */
  hop: (from: string, stage: HTMLElement, to: string, release: () => BookTrip) => Promise<void>
  /** Puts the book where it would be with this chapter open, without showing it. */
  park: (id: string) => void
}

/** Each concept's index.ts default-exports one of these. It may return a cleanup. */
export type AboutMount = (ctx: AboutCtx) => void | (() => void) | Promise<void | (() => void)>
