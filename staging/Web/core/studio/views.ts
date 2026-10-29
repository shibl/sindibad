// The art island's pictures, drawn in code (SVG), for «أتعلّم»
// (core/learn/explore.js), the shared questions (core/learn/steps.js) and
// the island's own games (games.js). Each part of the book has its file:
// views-1.js (lessons 1–8), views-2.js (lessons 9–16), views-3.js
// (lessons 17–25). This one gathers them.
//
//   VIEWS[name]  = { html(step) → '<svg …>' }
//                  parts to discover carry data-spot="<id>" (explore,
//                  label), parts to colour data-region="<id>" (paint),
//                  outlines to fill data-slot="<piece id>" (collage), and
//                  the stages of a work data-from="<n>" / data-until="<n>"
//                  (craft: shown from stage n, hidden from stage n).
//   PIECES[view] = { piece id: { label, box: [x, y, w, h], art: svg inner, say? } }
//                  the cut pieces of a collage view
//   STAGES[model] = [{ sheet: svg inner, lines?: [{ d, ok? }], say }]
//                  the folds of an origami model; the last stage has no lines

import * as P1 from './views-1.js';
import * as P2 from './views-2.js';
import * as P3 from './views-3.js';
import type { Step } from '../../types/content.js';

/** A picture: its SVG for a step. */
export interface ArtView { html(step: Step): string }
/** A collage piece: its name, its place on the picture [x, y, w, h], its look (svg inner). */
export interface Piece { label: string; box: number[]; art: string; say?: string }
/** One fold of an origami model: the sheet, the fold lines (the right one marked `ok`), what the helper says. */
export interface FoldStage { sheet: string; lines?: { d: string; ok?: boolean }[]; say: string }

/** What each part of the book's pictures exports. */
interface Part {
  VIEWS?: Record<string, ArtView>;
  PIECES?: Record<string, Record<string, Piece>>;
  STAGES?: Record<string, FoldStage[]>;
}
const parts: Part[] = [P1, P2, P3];
// One record from the parts (a later part's entry wins, as with Object.assign).
const merged = <T>(of: (p: Part) => Record<string, T> | undefined): Record<string, T> =>
  Object.fromEntries(parts.flatMap(p => Object.entries(of(p) ?? {})));

export const VIEWS = merged(p => p.VIEWS);
export const PIECES = merged(p => p.PIECES);
export const STAGES = merged(p => p.STAGES);
