// The science island's steps: «أتعلّم» (core/learn/explore.js) with the
// island's pictures (views.js, views-machines.js), and the shared questions
// (core/learn/steps.js).
//
//   runStep(step, host, ctx) → Promise<{ ok, total }>

import { explore } from '../learn/explore.js';
import { runQuestion } from '../learn/steps.js';
import { VIEWS as BASE } from './views.js';
import { MACHINE_VIEWS } from './views-machines.js';

const VIEWS = { ...BASE, ...MACHINE_VIEWS };
const htmlOf = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, step => v.html(step)]));

// When a spot opens, the picture plays its part: its root gets `st-<id>`
// (kept) and data-st="<id>" (the latest), and the view may do more.
function onSpot(step, ctx) {
  return (s, el, host) => {
    const root = host.querySelector('.lx-view > *');
    if (root && root.contains(el)) { root.classList.add(`st-${s.id}`); root.dataset.st = s.id; }
    VIEWS[step.view]?.spot?.(s, el, root, ctx);
    ctx.onSpot?.(step, s);
  };
}

export function runStep(step, host, ctx) {
  return new Promise(resolve => {
    if (step.kind === 'explore') explore(step, host, ctx, resolve, { views: htmlOf, onSpot: onSpot(step, ctx) });
    else runQuestion(step, host, ctx, resolve, { views: htmlOf });
  });
}
export const VIEW_NAMES = Object.keys(VIEWS);
