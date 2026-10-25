// Made from svg.ts by tools/build.ts. Edit that file, then run: npm run build
// Small helpers for the pictures the islands draw in SVG for «أتعلّم» and
// the questions (explore.ts, steps.ts): the science island's experiments
// (core/lab/views.js), the art island's pictures (core/studio/svg.js adds
// its own parts to paint, glue and build).
//
//   svg(name, body, vb?)     the picture: <svg class="sv sv-<name>"> (viewBox 320 × 200)
//   spot(id, inner, box?)    a part to discover (data-spot), with a hit box [x, y, w, h]
//   hitR(x, y, w, h, r?)     that hit box (explore.ts grows it to cover the part)
//   lab(x, y)                where a found spot shows its name
//   txt(t, x, y), emo(ch, x, y, size)
/** The ink of every outline. */
export const INK = '#3b2414';
export const svg = (name, body, vb = '0 0 320 200') => `<svg class="sv sv-${name}" viewBox="${vb}" role="img" aria-label="صورة الدرس">${body}</svg>`;
export const hitR = (x, y, w, h, r = 10) => `<rect class="lx-hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
export const spot = (id, inner, box) => `<g data-spot="${id}">${box ? hitR(...box) : ''}${inner}</g>`;
export const emo = (ch, x, y, s = 30, cls = '') => `<text class="sv-emo ${cls}" x="${x}" y="${y}" font-size="${s}">${ch}</text>`;
export const lab = (x, y, cls = '') => `<text class="lx-label sv-lab ${cls}" x="${x}" y="${y}"></text>`;
export const txt = (t, x, y, cls = '') => `<text class="sv-t ${cls}" x="${x}" y="${y}">${t}</text>`;
