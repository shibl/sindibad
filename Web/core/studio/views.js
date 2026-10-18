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

const parts = [P1, P2, P3];
export const VIEWS = Object.assign({}, ...parts.map(p => p.VIEWS || {}));
export const PIECES = Object.assign({}, ...parts.map(p => p.PIECES || {}));
export const STAGES = Object.assign({}, ...parts.map(p => p.STAGES || {}));
