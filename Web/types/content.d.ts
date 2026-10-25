// What an island's lessons are written as (worlds/grade6/<island>.js and its
// parts): the types the game's TypeScript (core/learn/, core/isle/) and the
// content check (tests/check-content.ts) share. Plain data, no browser types.

/** «أتعلّم»: one thing to discover, a part of the picture or a card. */
export interface Spot {
  id: string;
  title: string;
  text: string;
  icon?: string;
  /** A small picture for the card and the note (a key of the island's art). */
  art?: string;
  /** The name shown on the part once found (else a short title). */
  label?: string;
  /** What the helper says when it opens. */
  say?: string;
  /** Anything an island's own code needs (a note to play, a place on a map…). */
  [more: string]: unknown;
}

/** Any step: «أتعلّم», a shared question, or an island's own game. */
export interface Step {
  kind: string;
  /** The question (html). */
  q?: string;
  /** Said on the first miss (a pointer to the rule, never the answer). */
  hint?: string;
  /** Said when the step is done. */
  explain?: string;
  /** A picture the step draws (a key of the island's views). */
  view?: string;
  /** A picture above a question. */
  pic?: string;
  /** What the helper says as the step opens. */
  say?: string;
  [more: string]: any;
}

/** «أتعلّم» (core/learn/explore.ts): a picture with glowing spots, or cards. */
export interface ExploreStep extends Step {
  kind: 'explore';
  title: string;
  spots: Spot[];
  /** One spot at a time, in order. */
  guided?: boolean;
  cols?: number;
  theme?: string;
  /** The helper's last line, and a short recap (html). */
  done?: string;
  sum?: string;
  /** The line under the picture (default: «اضغط على كل ما يلمع لتكتشفه»). */
  tap?: string;
}

// The questions any island can use (core/learn/steps.ts).
export interface Choice extends Step { kind: 'choice'; q: string; /** options[0] is right */ options: string[] }
export interface TwoWay extends Step { kind: 'twoway'; /** [sentence with ___, right, wrong] */ lines: [string, string, string][] }
export interface Sort extends Step { kind: 'sort'; q: string; bins: { id: string; label: string; icon?: string }[]; /** [text, bin, icon?] */ items: [string, string, string?][] }
export interface Order extends Step { kind: 'order'; q: string; /** in the right order */ items: string[]; icons?: string[] }
export interface Match extends Step { kind: 'match'; q: string; /** [left, right], in order */ pairs: [string, string][] }
export interface TrueFalse extends Step { kind: 'tf'; /** [statement, true?, the fix if false] */ items: [string, boolean, string?][] }
export interface NumberStep extends Step { kind: 'number'; q: string; answer: number | string; unit?: string }
export interface Label extends Step { kind: 'label'; q: string; view: string; /** [spot id, name] */ ask: [string, string][] }
export type Question = Choice | TwoWay | Sort | Order | Match | TrueFalse | NumberStep | Label;

/** A quick review question (the island's plugins/<topic>/reviews.js). */
export interface Review { q: string; /** options[0] is right */ options: string[]; hint: string; explain: string }

/** One lesson of the book, played at a place on the island. */
export interface Quest {
  id: string;
  /** Where its stars are kept, and its quick review ('art-circles'…). */
  topic: string;
  /** The place (a key of STATIONS). */
  station: string;
  icon: string;
  title: string;
  goal: string;
  /** The book's pages or headings it follows. */
  book: string[];
  steps: Step[];
  review: Review[];
  /** «تعلّمنا من كتاب …»: two or three lines. */
  learned: string[];
  /** The sticker the first finish gives. */
  sticker?: string;
  [more: string]: unknown;
}

export interface Station {
  name: string;
  icon: string;
  /** A key of UNITS. */
  unit: number | string;
  /** A button on the place's card (the island's extras.action(id)). */
  action?: string;
  [more: string]: unknown;
}

export interface Unit { name: string; color: string; [more: string]: unknown }

/** The island's helper. */
export interface Helper {
  name: string;
  /** The voice's pitch (the little blips as it talks). */
  pitch: number;
  /** The first visit's line, and the start of the line on every visit after. */
  hello: string;
  back: string;
  [more: string]: unknown;
}

/** An island's book: worlds/grade6/<island>.js. */
export interface IslandContent {
  HELPER: Helper;
  STATIONS: Record<string, Station>;
  UNITS: Record<string, Unit>;
  QUESTS: Quest[];
}
