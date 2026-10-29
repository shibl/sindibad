// Globals the game's TypeScript files use (tsconfig.game.json).

interface Navigator {
  /** The device's memory in GB (Chrome on Android): lite mode on weak phones. */
  deviceMemory?: number;
}

interface Window {
  /** Set by the end-to-end test (tests/e2e.mjs): test hooks on, no waiting. */
  __SINDBAD_TEST__?: boolean;
  /** Set by index.html on phones without WebGL 2: three.js r162 is loaded. */
  __SINDBAD_WEBGL1__?: boolean;
  /** Older Safari's name for AudioContext. */
  webkitAudioContext?: typeof AudioContext;
}
