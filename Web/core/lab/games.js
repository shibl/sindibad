// Made from games.ts by tools/build.ts. Edit that file, then run: npm run build
// The science island's steps: «أتعلّم» (core/learn/explore.ts) with the
// island's pictures (views.js, views-machines.js), and the shared questions
// (core/learn/steps.ts).
//
//   runStep(step, host, ctx) → Promise<{ ok, total }>
import { makeRunStep, markSpot } from '../learn/steps.js';
import { VIEWS as BASE } from './views.js';
import { MACHINE_VIEWS } from './views-machines.js';
const VIEWS = { ...BASE, ...MACHINE_VIEWS };
const htmlOf = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, (step) => v.html(step)]));
// When a spot opens, the picture plays its part (markSpot), and the view may
// do more.
export const runStep = makeRunStep({
    views: htmlOf,
    exploreOpts: (step, ctx) => ({ onSpot: markSpot(step, ctx, (s, el, root) => VIEWS[step.view]?.spot?.(s, el, root, ctx)) }),
});
export const VIEW_NAMES = Object.keys(VIEWS);
