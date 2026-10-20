import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import validator from 'gltf-validator';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
if (manifest.pending.length) throw new Error(`Unresolved exports: ${JSON.stringify(manifest.pending)}`);
const ids = new Set();
let warnings = 0;
for (const asset of manifest.assets) {
  if (ids.has(asset.id)) throw new Error(`Duplicate asset ${asset.id}`);
  ids.add(asset.id);
  for (const variant of asset.variants) {
    const bytes = await fs.readFile(path.join(root, variant.path));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== variant.sha256) throw new Error(`Asset changed: ${variant.path}`);
    if (bytes.length !== variant.bytes) throw new Error(`Length mismatch: ${variant.path}`);
    if (variant.path.endsWith('.glb')) {
      const report = await validator.validateBytes(new Uint8Array(bytes), { uri: variant.path, maxIssues: 20 });
      if (report.issues.numErrors) throw new Error(`${variant.path}: ${JSON.stringify(report.issues)}`);
      warnings += report.issues.numWarnings;
      const jsonLength = bytes.readUInt32LE(12);
      const data = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
      if (!data.meshes?.length || !data.nodes?.length) throw new Error(`Empty model: ${variant.path}`);
      if ((data.images || []).some(x => x.uri && !x.uri.startsWith('data:'))) throw new Error(`External texture: ${variant.path}`);
      const nodes = new Set(data.nodes.map(n => n.name));
      for (const hook of Object.values(asset.nodeHooks || {})) {
        for (const name of Array.isArray(hook) ? hook : [hook]) if (!nodes.has(name)) throw new Error(`Missing hook ${name}: ${asset.id}`);
      }
    } else if (variant.path.endsWith('.svg')) {
      const svg = bytes.toString();
      for (const [, reference] of svg.matchAll(/url\(#([^)]+)\)/g)) {
        if (!svg.includes(`id="${reference}"`)) throw new Error(`Missing SVG definition ${reference}: ${asset.id}`);
      }
      if (/<script\b|<foreignObject\b/i.test(svg)) throw new Error(`Executable content: ${asset.id}`);
    }
  }
}
console.log(`Validated ${ids.size} shared assets, SHA-256 hashes, embedded SVG definitions and GLB structures; ${warnings} glTF warnings.`);
