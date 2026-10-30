// What the browser tests read and set on the page's `window`, inside
// page.evaluate() and addInitScript() callbacks. The game's test hooks are
// typed from the game's own functions (app.ts sets them when
// window.__SINDBAD_TEST__ is on), so a test that reads a field the game no
// longer has fails the type check.

import type { startLesson } from '../core/lesson.js';
import type { debugState, debugBlocked, debugPlace } from '../core/overworld.js';
import type { debugSea, debugSeaLook } from '../core/map.js';
import type * as Farm from '../core/farm/farm.js';
import type * as Tunes from '../core/tunes/tunes.js';
import type * as Lab from '../core/lab/lab.js';
import type * as Atlas from '../core/atlas/atlas.js';
import type * as Studio from '../core/studio/studio.js';
import type * as English from '../core/english/english.js';
import type { createStage } from '../core/farm/scene.js';

/** A 3D island's state: __farm() and the like. */
type Debug<M extends { debug(): unknown }> = () => Promise<ReturnType<M['debug']>>;
/** Calls one of a 3D island's functions: __labDo('debugStart', 'measure'). */
type Do<M> = <K extends keyof M>(fn: K, ...args: M[K] extends (...a: infer A) => unknown ? A : never) => Promise<unknown>;

declare global {
  interface Window {
    __lesson: typeof startLesson;
    __island: typeof debugState;
    __blocked: typeof debugBlocked;
    __place: typeof debugPlace;
    __sea: typeof debugSea;
    __seaLook: typeof debugSeaLook;
    __farm: Debug<typeof Farm>;
    __farmDo: Do<typeof Farm>;
    __tunes: Debug<typeof Tunes>;
    __tunesDo: Do<typeof Tunes>;
    __lab: Debug<typeof Lab>;
    __labDo: Do<typeof Lab>;
    __atlas: Debug<typeof Atlas>;
    __atlasDo: Do<typeof Atlas>;
    __studio: Debug<typeof Studio>;
    __studioDo: Do<typeof Studio>;
    __english: Debug<typeof English>;
    __englishDo: Do<typeof English>;
    /** core/farm/farm.ts, in test mode: the farm's 3D stage. */
    __farmStage?: ReturnType<typeof createStage>;

    // Set by the tests themselves.
    /** e2e: how many touch rings appeared. */
    __rings: number;
    /** e2e: the globe's canvas, kept to see its 3D view given back. */
    __globeCanvas: HTMLCanvasElement | null;
    /** e2e: still there after a reload? */
    __before?: boolean;
    /** language: the activity element, kept across a language switch. */
    languageActivity: Element | null;
    /** language: the lesson's progress, as text. */
    languageProgress: () => string;
    languageSave: string;
    /** language: the 3D canvas, kept across a language switch. */
    languageCanvas: Element | null;
    /** language: what the fake speech synthesis said, and how often it was cancelled. */
    spoken: { text: string; lang: string }[];
    speechCancelled: number;
  }
}
