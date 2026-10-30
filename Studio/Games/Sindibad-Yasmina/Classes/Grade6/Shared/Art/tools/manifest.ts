// The shape of ../manifest.json: export.ts and export-learning.ts write it,
// check.ts and check-learning.ts read it. Types only.

/** One file of an asset: an SVG, a PNG or a GLB, with its size and hash. */
export interface Variant { path: string; bytes: number; sha256: string }

/** An illustration or a 3D model, and where it comes from in the game. */
export interface Asset {
  id: string;
  type: string;
  collection?: string;
  source?: string;
  sourceSha256?: string;
  width?: number;
  height?: number;
  variants: Variant[];
  /** A model's named moving parts, which the native apps animate. */
  nodeHooks?: Record<string, string | string[]>;
  [more: string]: unknown;
}

export interface Manifest {
  schemaVersion: number;
  sourceCommit: string;
  license: string;
  assets: Asset[];
  /** Exports that failed; the check refuses a manifest with any. */
  pending: { id: string; reason: string }[];
  [more: string]: unknown;
}
