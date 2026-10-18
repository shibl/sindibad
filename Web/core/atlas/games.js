// The atlas island's steps: «أتعلّم» (core/learn/explore.js) with the
// island's maps and timeline (views.js), and the shared questions
// (core/learn/steps.js).
//
//   runStep(step, host, ctx) → Promise<{ ok, total }>

import { makeRunStep } from '../learn/steps.js';
import { ATLAS_VIEWS as VIEWS } from './views.js';

const htmlOf = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, step => v.html(step)]));

export const runStep = makeRunStep({ views: htmlOf });
