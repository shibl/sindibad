// The part of gltf-validator (Khronos, no bundled types) that check.ts uses.
declare module 'gltf-validator' {
  interface Report { issues: { numErrors: number; numWarnings: number; [more: string]: unknown } }
  const validator: {
    validateBytes(data: Uint8Array, options?: { uri?: string; maxIssues?: number }): Promise<Report>;
  };
  export default validator;
}
