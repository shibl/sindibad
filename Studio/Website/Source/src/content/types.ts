export type Lang = 'en' | 'ar'

export interface Item {
  meta: string
  title: string
  body: string
}

export interface Shot {
  src: 'map' | 'lesson' | 'dialogue'
  alt: string
  /** Full caption (Monolith) and one-word caption (Mirage). */
  caption: string
  short: string
}

/**
 * All copy for one language. Both designs read the same facts; where they phrase a heading
 * differently, the Monolith wording comes first and the Mirage one is named after it.
 */
export interface Content {
  lang: Lang
  brand: string
  tagline: string
  nav: { href: `#${string}`; label: string }[]
  /** The other language's page, relative to the site root. */
  altLang: { lang: Lang; path: string; short: string; long: string }
  designs: { label: string; classic: string; monolith: string; mirage: string; krafton: string; supercell: string; a: string; b: string; c: string }
  eyebrow: string
  hero: {
    wordmark: string
    /** "Makers of", before the game's title. */
    makers: string
    statementLabel: string
    statement: string
    headline: string
    intro: string
    primary: string
    secondary: string
  }
  /** Mirage's side-by-side block, shown in both languages on every page. */
  about: { title: string; body: string }
  game: {
    label: string
    note: string
    voyage: string
    /** Label before a figure number, e.g. "Fig.". */
    figure: string
    title: string
    body: string
    facts: [name: string, value: string][]
    shots: Shot[]
  }
  numbers: { value: string; label: string }[]
  technology: { label: string; note: string; craft: string; title: string; items: Item[] }
  studio: {
    label: string
    note: string
    title: string
    crew: string
    crewTitle: string
    hq: string
    hqLong: string
    locations: string[]
    steps: Item[]
  }
  contact: {
    label: string
    note: string
    lead: string
    title: string
    cta: string
    /** `placeholder` marks details still to be filled in. */
    rows: { meta: string; value: string; placeholder?: boolean; ltr?: boolean }[]
  }
}
