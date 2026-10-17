// Globals the game's TypeScript files use (tsconfig.game.json).

interface Window {
  /** Set by the end-to-end test (tests/e2e.mjs): test hooks on, no waiting. */
  __SINDBAD_TEST__?: boolean;
}
