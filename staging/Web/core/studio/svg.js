// Small helpers for the art island's pictures (views-1.js … views-3.js),
// as on the science island (core/lab/views.js).
//
//   svg(name, body, vb?)       the picture: <svg class="sv sv-<name>"> (viewBox 320 × 200)
//   spot(id, inner, box?)      a part to discover (data-spot), with a hit box [x, y, w, h]
//   region(id, d, fill?, extra?)  a part to colour (data-region): a path
//   slot(id, d, fill?, inner?) an outline a collage piece is glued into (data-slot)
//   stage(from, inner, until?) a part of a craft that shows from stage `from`
//   lab(x, y)                  where a found spot shows its name
//   txt(t, x, y), emo(ch, x, y, size)

export const INK = '#3b2414';
export const svg = (name, body, vb = '0 0 320 200') => `<svg class="sv sv-${name}" viewBox="${vb}" role="img" aria-label="صورة الدرس">${body}</svg>`;
export const hitR = (x, y, w, h, r = 10) => `<rect class="lx-hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
export const spot = (id, inner, box) => `<g data-spot="${id}">${box ? hitR(...box) : ''}${inner}</g>`;
export const region = (id, d, fill = '#fffaf0', extra = '') => `<path data-region="${id}" d="${d}" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round" ${extra}/>`;
// The piece's own look (`fill`: a colour or url(#pattern) defined in the
// picture, and `inner`: details drawn over it) shows once it is glued.
export const slot = (id, d, fill = '#fff', inner = '') => `<g class="sg-hole" data-slot="${id}"><path class="sg-hole__fill" d="${d}" fill="${fill}"/><g class="sg-hole__art">${inner}</g><path class="sg-hole__line" d="${d}"/></g>`;
export const stage = (from, inner, until) => `<g data-from="${from}"${until != null ? ` data-until="${until}"` : ''}>${inner}</g>`;
export const emo = (ch, x, y, s = 30, cls = '') => `<text class="sv-emo ${cls}" x="${x}" y="${y}" font-size="${s}">${ch}</text>`;
export const lab = (x, y, cls = '') => `<text class="lx-label sv-lab ${cls}" x="${x}" y="${y}"></text>`;
export const txt = (t, x, y, cls = '') => `<text class="sv-t ${cls}" x="${x}" y="${y}">${t}</text>`;
