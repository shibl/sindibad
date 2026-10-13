// The atlas island's steps: «أتعلّم» (core/learn/explore.js) with the
// island's maps and timeline (views.js), and the shared questions
// (core/learn/steps.js).
//
//   runStep(step, host, ctx) → Promise<{ ok, total }>

import { explore } from '../learn/explore.js';
import { runQuestion } from '../learn/steps.js';
import { ATLAS_VIEWS as VIEWS } from './views.js';

const htmlOf = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, step => v.html(step)]));

function onSpot(step, ctx) {
  return (s, el, host) => {
    const root = host.querySelector('.lx-view > *');
    if (root && root.contains(el)) { root.classList.add(`st-${s.id}`); root.dataset.st = s.id; }
    ctx.onSpot?.(step, s);
  };
}

export function runStep(step, host, ctx) {
  return new Promise(resolve => {
    if (step.kind === 'explore') explore(step, host, ctx, resolve, { views: htmlOf, onSpot: onSpot(step, ctx) });
    else runQuestion(step, host, ctx, resolve, { views: htmlOf });
  });
}
