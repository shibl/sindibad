// The atlas island's steps: «أتعلّم» (core/learn/explore.ts) with the
// island's maps and timeline (views.js), and the shared questions
// (core/learn/steps.ts).
//
//   runStep(step, host, ctx) → Promise<{ ok, total }>

import { makeRunStep } from '../learn/steps.js';
import type { Picture, Step } from '../learn/steps.js';
import { ATLAS_VIEWS } from './views.js';

const VIEWS: Record<string, Picture> = ATLAS_VIEWS;
const htmlOf = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, (step: Step) => v.html(step)]));

export const runStep = makeRunStep({ views: htmlOf });
