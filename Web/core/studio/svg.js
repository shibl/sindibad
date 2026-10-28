// Made from svg.ts by tools/build.ts. Edit that file, then run: npm run build
// Small helpers for the art island's pictures (views-1.js … views-3.js):
// the shared ones (core/learn/svg.ts: svg, spot, hitR, lab, txt, emo, INK)
// and the art island's own parts:
//
//   region(id, d, fill?, extra?)  a part to colour (data-region): a path
//   slot(id, d, fill?, inner?) an outline a collage piece is glued into (data-slot)
//   stage(from, inner, until?) a part of a craft that shows from stage `from`
import { INK } from '../learn/svg.js';
export { INK, svg, hitR, spot, emo, lab, txt } from '../learn/svg.js';
export const region = (id, d, fill = '#fffaf0', extra = '') => `<path data-region="${id}" d="${d}" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round" ${extra}/>`;
// The piece's own look (`fill`: a colour or url(#pattern) defined in the
// picture, and `inner`: details drawn over it) shows once it is glued.
export const slot = (id, d, fill = '#fff', inner = '') => `<g class="sg-hole" data-slot="${id}"><path class="sg-hole__fill" d="${d}" fill="${fill}"/><g class="sg-hole__art">${inner}</g><path class="sg-hole__line" d="${d}"/></g>`;
export const stage = (from, inner, until) => `<g data-from="${from}"${until != null ? ` data-until="${until}"` : ''}>${inner}</g>`;
