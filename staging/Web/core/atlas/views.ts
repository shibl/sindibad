// The atlas island's pictures for «أتعلّم» and the questions: real maps
// drawn from the country outlines (worlds/atlas/shapes.js) and a timeline.
//
//   map       step.area: 'arab' | 'africa' | 'nile' | 'horn' | 'egypt' |
//             'libya' | 'maghreb' | 'syria'. The places named in step.spots,
//             step.ask (a label question) and step.mark (highlighted in a
//             choice picture) are drawn as spots: a country fills in, a river
//             glows, a city gets a dot, a sea gets its name.
//   timeline  step.events: [{ id, year, label }] on a line; negative = BC.
//
// Every spot's name shows once it is found (core/learn/explore.js).

import { SHAPES } from '../../worlds/atlas/shapes.js';
import type { Picture } from '../learn/steps.js';
import type { Spot, Step } from '../../types/content.js';

/** A point on the globe: [longitude, latitude] in degrees. */
type LonLat = [lon: number, lat: number];
/** A projected point as the SVG writes it: [x, y] to one decimal. */
type XY = [x: string, y: string];
type Project = (lon: number, lat: number) => XY;
/** A map's frame: [west, east, south, north] in degrees. */
type Box = [w: number, e: number, s: number, n: number];
type Offset = [dx: number, dy: number];
/** A map step: the area it shows, its places to discover or name, and places only marked. */
interface MapStep extends Step { area?: string; spots?: Spot[]; ask?: [string, string][]; mark?: string[] }
interface TimelineStep extends Step { spots?: Spot[]; events?: { id: string; year: number; label: string }[] }

// The places a map can show: countries (their ISO code), seas, rivers,
// mountains, deserts, cities and lines. Positions are [lon, lat].
const COUNTRY: Record<string, string> = {
  syria: '760', lebanon: '422', jordan: '400', palestine: '275', iraq: '368', saudi: '682', kuwait: '414', qatar: '634', uae: '784', oman: '512', yemen: '887',
  egypt: '818', sudan: '729', ssudan: '728', libya: '434', tunisia: '788', algeria: '012', morocco: '504', mauritania: '478', somalia: '706', djibouti: '262',
  eritrea: '232', ethiopia: '231', kenya: '404', uganda: '800', chad: '148', niger: '562', mali: '466', senegal: '686', nigeria: '566', car: '140',
  turkey: '792', iran: '364', spain: '724', italy: '380', greece: '300', portugal: '620', france: '250',
};
const DOT_COUNTRY: Record<string, LonLat> = { bahrain: [50.55, 26.05], comoros: [43.35, -11.7] };
const WATER: Record<string, LonLat> = {
  med: [18, 34.6], red: [38.2, 20.5], atlantic: [-21, 22], indian: [58, -4], aden: [48, 12.6], gulf: [51.6, 27.2],
  suez: [32.45, 30.6], babmandab: [43.4, 12.6], gibraltar: [-5.6, 35.95], nasser: [32.1, 22.7], victoria: [33, -1], tana: [37.3, 12],
};
// [lon, lat, half-width, half-height (degrees), rotation]
const LAKES: Record<string, [lon: number, lat: number, rx: number, ry: number, rot: number]> = { nasser: [32.1, 22.7, 0.9, 0.35, -40], victoria: [33, -1, 1.5, 1.3, 0], tana: [37.3, 12, 0.35, 0.3, 0] };
const RIVERS: Record<string, LonLat[]> = {
  whitenile: [[33.2, 0.45], [32.8, 1.5], [32.1, 3.6], [31.6, 4.85], [31.55, 6.2], [31.65, 9.5], [32.65, 13.2], [32.53, 15.6]],
  bluenile: [[37.38, 11.6], [38.0, 10.5], [37.5, 10.0], [36.0, 10.4], [35.0, 11.2], [34.38, 11.8], [33.6, 13.55], [33.5, 14.4], [32.53, 15.6]],
  nile: [[32.53, 15.6], [33.97, 17.7], [33.3, 19.5], [32.0, 18.6], [30.47, 19.2], [31.35, 21.8], [32.4, 23.2], [32.9, 24.1], [32.65, 25.7], [32.7, 26.15], [31.18, 27.2], [31.25, 30.05], [30.4, 31.45]],
  nile2: [[31.25, 30.05], [31.8, 31.45]],
};
const MOUNTAINS: Record<string, LonLat[]> = {
  atlas: [[-9.5, 30.5], [-7, 31.2], [-5, 32.5], [-2, 33.8], [1, 34.5], [4, 35.6], [7, 36], [9.5, 36.4]],
  ethiohigh: [[36.5, 8], [38, 9.5], [39.5, 11], [38.2, 13], [37.5, 11.2], [39.8, 8.5]],
  tibesti: [[17.5, 20.6], [18.6, 21.2], [19.4, 20.4]], ahaggar: [[4.8, 23], [5.6, 23.6], [6.4, 22.9]], akhdar: [[21, 32.5], [21.8, 32.7], [22.6, 32.6]],
};
const LAND: Record<string, LonLat> = { sahara: [9, 23.5], sinai: [33.8, 29.4], nubian: [33.2, 20.3], fezzan: [14, 26], delta: [31, 30.9], andalusia: [-4.6, 37.6] };
const CITY: Record<string, LonLat> = {
  cairo: [31.24, 30.04], alexandria: [29.92, 31.2], giza: [31.13, 29.98], luxor: [32.64, 25.69], aswan: [32.9, 24.09], khartoum: [32.53, 15.6], omdurman: [32.48, 15.65], portsudan: [37.22, 19.6],
  tripoli: [13.19, 32.89], benghazi: [20.07, 32.12], misrata: [15.09, 32.38], sabha: [14.43, 27.04], ghadames: [9.5, 30.13], tunis: [10.18, 36.8], carthage: [10.33, 36.85], kairouan: [10.1, 35.68],
  algiers: [3.06, 36.75], oran: [-0.63, 35.7], rabat: [-6.84, 34.02], fes: [-5, 34.03], marrakesh: [-8, 31.63], tangier: [-5.8, 35.77], nouakchott: [-15.98, 18.09], mogadishu: [45.34, 2.05],
  djibouticity: [43.15, 11.59], asmara: [38.93, 15.32], addis: [38.75, 9.03], damascus: [36.29, 33.51], mecca: [39.83, 21.42], cordoba: [-4.78, 37.89], granada: [-3.6, 37.18], seville: [-5.98, 37.39], toledo: [-4.02, 39.86],
};
// Where a place's name goes on a map whose frame leaves out its usual
// spot, or crowds it next to another.
const AT: Record<string, Record<string, LonLat>> = {
  africa: { atlantic: [-10, 1] },
  arab: { tunisia: [9.5, 33], med: [20, 35.2], morocco: [-5, 28] },
  eastafrica: { egypt: [28.6, 24.6] },
  syria: { turkey: [37.4, 37.6], iraq: [41.2, 33.2], jordan: [37, 31.7], lebanon: [35.95, 34.2], palestine: [35.1, 31.9] },
  egypt: { red: [34.9, 26.3], delta: [30.7, 31.2] },
  nile: { delta: [30.5, 31.25] },
  horn: { indian: [49, 3], red: [40.6, 16.4], aden: [49.5, 12.4] },
  libya: { med: [19.5, 33.8], akhdar: [23.2, 31.6], sahara: [11.5, 24] },
  maghreb: { med: [5.5, 38.2], atlantic: [-13, 31], sahara: [0, 25.5] },
  iberia: { gibraltar: [-5.45, 36.05], atlantic: [-10.2, 36.6], med: [2, 38.6], andalusia: [-4, 38.7] },
};
// Where a city's name goes from its dot when the place above is taken or
// off the map: [dx, dy] (the usual is just above).
const UNDER: Offset = [0, 14];
const OFF: Record<string, Record<string, Offset>> = { nile: { cairo: UNDER }, africa: { tripoli: UNDER }, libya: { misrata: UNDER }, maghreb: { kairouan: UNDER, carthage: [-26, 4], nouakchott: [26, 4] }, iberia: { tangier: UNDER } };
const LINES: Record<string, number> = { equator: 0, cancer: 23.44 };
const ARAB = new Set(['syria', 'lebanon', 'jordan', 'palestine', 'iraq', 'saudi', 'kuwait', 'qatar', 'uae', 'oman', 'yemen', 'egypt', 'sudan', 'libya', 'tunisia', 'algeria', 'morocco', 'mauritania', 'somalia', 'djibouti']);
export const FEATURES = new Set([...Object.keys(COUNTRY), ...Object.keys(DOT_COUNTRY), ...Object.keys(WATER), ...Object.keys(RIVERS).filter(r => r !== 'nile2'), ...Object.keys(MOUNTAINS), ...Object.keys(LAND), ...Object.keys(CITY), ...Object.keys(LINES)]);

const AREAS: Record<string, Box> = {
  arab: [-18, 61, 0, 39], africa: [-19, 53, -36, 40], med: [-2, 38, 28, 42], nile: [23, 43, -3, 32], horn: [32, 52, -5, 19], egypt: [24, 37, 21.5, 32],
  eastafrica: [22, 52, -3, 33], libya: [8, 27, 18, 34.5], maghreb: [-18, 13.5, 16, 41], syria: [34, 43, 31, 38], mashriq: [24, 47, 20, 39], iberia: [-13, 4, 34, 44],
};
const ISO_TO_KEY = Object.fromEntries(Object.entries(COUNTRY).map(([k, v]) => [v, k]));

function projector(area: string) {
  let [w0, e0, s0, n0] = AREAS[area] || AREAS.arab;
  const mid = ((s0 + n0) / 2) * Math.PI / 180, kx = Math.cos(mid);
  const W = 320;
  let H = (W * (n0 - s0)) / ((e0 - w0) * kx);
  if (H > 300) { const lon = ((n0 - s0) / kx) * (W / 300); const c = (w0 + e0) / 2; w0 = c - lon / 2; e0 = c + lon / 2; H = 300; }
  if (H < 190) { const lat = (190 / W) * (e0 - w0) * kx; const c = (s0 + n0) / 2; s0 = c - lat / 2; n0 = c + lat / 2; H = 190; }
  const sx = W / (e0 - w0), sy = H / (n0 - s0);
  const P: Project = (lon, lat) => [((lon - w0) * sx).toFixed(1), ((n0 - lat) * sy).toFixed(1)];
  const box: Box = [w0, e0, s0, n0];
  return { P, W, H: Math.round(H), box };
}
// A ring of a country's outline: [lon×10, lat×10, …] (worlds/atlas/shapes.ts).
const ringPath = (ring: number[], P: Project): string => { let d = ''; for (let i = 0; i < ring.length; i += 2) { const [x, y] = P(ring[i] / 10, ring[i + 1] / 10); d += `${i ? 'L' : 'M'}${x} ${y}`; } return `${d}Z`; };
function bboxOf(rings: number[][]): Box { let w = 1e9, e = -1e9, s = 1e9, n = -1e9; for (const r of rings) for (let i = 0; i < r.length; i += 2) { w = Math.min(w, r[i]); e = Math.max(e, r[i]); s = Math.min(s, r[i + 1]); n = Math.max(n, r[i + 1]); } return [w / 10, e / 10, s / 10, n / 10]; }
const BBOX = Object.fromEntries(Object.entries(SHAPES).map(([id, r]) => [id, bboxOf(r)]));
// The middle of a country's biggest ring, for its name.
function centre(iso: string): LonLat | null {
  const rings = SHAPES[iso]; if (!rings) return null;
  let best = rings[0];
  for (const r of rings) if (r.length > best.length) best = r;
  let x = 0, y = 0;
  for (let i = 0; i < best.length; i += 2) { x += best[i]; y += best[i + 1]; }
  const n = best.length / 2;
  return [x / n / 10, y / n / 10];
}
const NUDGE: Record<string, Offset> = { morocco: [1.5, 1.5], somalia: [-1.5, 1], norway: [0, -4], egypt: [0, -0.5], iraq: [0, 0.5], saudi: [0, 0.6], libya: [0, -1], algeria: [0, -1], mauritania: [1, 0], sudan: [0, 0.5] };

function mapHTML(step: MapStep): string {
  const area = step.area || 'arab';
  const { P, W, H, box } = projector(area);
  const [w0, e0, s0, n0] = box;
  const want = new Set([...(step.spots || []).map(s => s.id), ...(step.ask || []).map(a => a[0])]);
  const mark = new Set(step.mark || []);
  const inView = (bb: Box) => bb[1] >= w0 - 2 && bb[0] <= e0 + 2 && bb[3] >= s0 - 2 && bb[2] <= n0 + 2;
  let land = '', spots = '', marks = '', over = '';
  const countries: [size: number, svg: string][] = [];
  // Coordinates come from P as strings (or are worked out as numbers).
  const lab = (x: number | string, y: number | string, cls = '') => `<text class="lx-label sv-lab ${cls}" x="${x}" y="${y}"></text>`;
  // a finger-sized tap area round a small place
  const hit = (x: number | string, y: number | string, r = 13) => `<circle class="lx-hit" cx="${x}" cy="${y}" r="${r}"/>`;
  for (const [iso, rings] of Object.entries(SHAPES)) {
    if (!inView(BBOX[iso])) continue;
    const key = ISO_TO_KEY[iso], d = rings.map(r => ringPath(r, P)).join('');
    const cls = `mp-land${key && ARAB.has(key) ? ' mp-arab' : ''}${mark.has(key) ? ' mp-mark' : ''}`;
    if (key && want.has(key)) {
      // (Every country with a key has a shape, so a centre.)
      const c = centre(iso)!, nd = NUDGE[key] || [0, 0], [lx, ly] = P(...(AT[area]?.[key] || [c[0] + nd[0], c[1] + nd[1]]));
      const [bw, be, bs, bn] = BBOX[iso];
      countries.push([(be - bw) * (bn - bs), `<g data-spot="${key}" class="mp-country"><path class="${cls}" d="${d}"/>${lab(lx, ly, 'mp-name')}</g>`]);
    } else land += `<path class="${cls}" d="${d}"/>`;
  }
  // the big countries first, so a small one and its name sit on top
  spots += countries.sort((a, b) => b[0] - a[0]).map(c => c[1]).join('');
  for (const [k, [lon, lat]] of Object.entries(DOT_COUNTRY)) {
    if (!want.has(k) && !mark.has(k)) continue;
    const [x, y] = P(lon, lat);
    const g = `<circle class="mp-dot mp-arab" cx="${x}" cy="${y}" r="4"/>`;
    if (want.has(k)) spots += `<g data-spot="${k}">${g}${lab(x, +y - 8)}${hit(x, y)}</g>`; else marks += g;
  }
  for (const [k, lat] of Object.entries(LINES)) {
    if (lat < s0 || lat > n0 || (!want.has(k) && !mark.has(k))) continue;
    const [, y] = P(w0, lat), body = `<line class="mp-line" x1="0" x2="${W}" y1="${y}" y2="${y}"/>`;
    if (want.has(k)) over += `<g data-spot="${k}">${body}${lab(W - 46, +y - 5)}<rect class="lx-hit" x="0" y="${+y - 8}" width="${W}" height="16"/></g>`; else over += body;
  }
  for (const [k, [lon, lat, rx, ry, rot]] of Object.entries(LAKES)) {
    const [x, y] = P(lon, lat), [x2] = P(lon + rx, lat), [, y2] = P(lon, lat - ry);
    if (+x < -20 || +x > W + 20 || +y < -20 || +y > H + 20) continue;
    const e = `<ellipse class="mp-lake" cx="${x}" cy="${y}" rx="${Math.max(2.5, +x2 - +x)}" ry="${Math.max(2, +y2 - +y)}" transform="rotate(${rot} ${x} ${y})"/>`;
    if (want.has(k)) spots += `<g data-spot="${k}">${e}${lab(x, +y + 14)}${hit(x, y)}</g>`; else land += e;
  }
  for (const [k, pts] of Object.entries(MOUNTAINS)) {
    const near = pts.some(([lon, lat]) => lon >= w0 && lon <= e0 && lat >= s0 && lat <= n0);
    if (!near || (!want.has(k) && !mark.has(k) && !['atlas', 'ethiohigh'].includes(k))) continue;
    const peaks = pts.map(([lon, lat]) => { const [x, y] = P(lon, lat); return `<path class="mp-peak" d="M${+x - 5} ${+y + 4}L${x} ${+y - 5}L${+x + 5} ${+y + 4}Z"/>`; }).join('');
    const [cx, cy] = P(...pts[Math.floor(pts.length / 2)]), [lx, ly] = AT[area]?.[k] ? P(...AT[area][k]) : [cx, +cy + 16];
    if (want.has(k)) over += `<g data-spot="${k}">${peaks}${lab(lx, ly)}<rect class="lx-hit" x="${+cx - 13}" y="${+cy - 13}" width="26" height="26" rx="8"/></g>`; else over += peaks;
  }
  const line = (pts: LonLat[]) => pts.map(([lon, lat], i) => { const [x, y] = P(lon, lat); return `${i ? 'L' : 'M'}${x} ${y}`; }).join('');
  for (const [k, pts] of Object.entries(RIVERS)) {
    const body = `<path class="mp-river${mark.has(k) ? ' mp-mark' : ''}" d="${line(pts)}"/>`;
    const key = k === 'nile2' ? 'nile' : k;
    if (want.has(key) && k !== 'nile2') {
      const [x, y] = P(...pts[Math.floor(pts.length / 2)]), more = k === 'nile' ? [RIVERS.nile2] : [];
      over += `<g data-spot="${key}" class="mp-riv">${body}${more.map(m => `<path class="mp-river" d="${line(m)}"/>`).join('')}${lab(+x + 14, y)}${[pts, ...more].map(m => `<path class="mp-hitline" d="${line(m)}"/>`).join('')}</g>`;
    }
    else if (k !== 'nile2' || !want.has('nile')) over += body;
  }
  for (const [k, at] of Object.entries(LAND)) {
    if (!want.has(k)) continue;
    const [x, y] = P(...(AT[area]?.[k] || at));
    over += `<g data-spot="${k}"><circle class="mp-area" cx="${x}" cy="${y}" r="12"/>${lab(x, +y + 4, 'mp-area__t')}${hit(x, y, 16)}</g>`;
  }
  for (const [k, at] of Object.entries(WATER)) {
    if (LAKES[k] || !want.has(k)) continue;
    const [x, y] = P(...(AT[area]?.[k] || at));
    over += `<g data-spot="${k}"><circle class="mp-sea" cx="${x}" cy="${y}" r="10"/>${lab(x, +y + 4, 'mp-sea__t')}${hit(x, y, 15)}</g>`;
  }
  for (const [k, [lon, lat]] of Object.entries(CITY)) {
    if (!want.has(k) && !mark.has(k)) continue;
    const [x, y] = P(lon, lat), dot = `<circle class="mp-city${mark.has(k) ? ' mp-mark' : ''}" cx="${x}" cy="${y}" r="3.2"/>`;
    const [ox, oy] = OFF[area]?.[k] || [0, -7];
    if (want.has(k)) over += `<g data-spot="${k}">${dot}${lab(+x + ox, +y + oy)}${hit(x, y)}</g>`; else marks += dot;
  }
  return `<svg class="sv sv-map sv-map--${area}" viewBox="0 0 ${W} ${H}" role="img" aria-label="خريطة"><rect class="mp-sea-bg" width="${W}" height="${H}"/>${land}${spots}${marks}${over}<text class="mp-north" x="${W - 12}" y="18">ش</text><path class="mp-north__a" d="M${W - 12} 22 l-4 9 4 -3 4 3z"/></svg>`;
}

function timelineHTML(step: TimelineStep): string {
  // Events in time order, evenly spaced (dates far apart and dates close
  // together both stay readable); earlier on the right, as Arabic reads.
  const ev = [...(step.events || [])].sort((a, b) => a.year - b.year);
  const gap = ev.length > 1 ? 250 / (ev.length - 1) : 0;
  // a label's middle, moved in from the edges so it isn't cut off
  const inside = (x: number, text: string, size: number) => { const half = Math.min(70, (text || '').length * size * 0.28); return Math.max(6 + half, Math.min(314 - half, x)).toFixed(1); };
  const nameOf = (e: { id: string }) => { const s = (step.spots || []).find(x => x.id === e.id); return s?.label ?? (s && s.title.length <= 16 ? s.title : ''); };
  const parts = ev.map((e, i) => {
    const px = (285 - i * gap).toFixed(1), up = i % 2 === 0, ty = up ? 58 : 142;
    return `<g data-spot="${e.id}"><rect class="lx-hit" x="${+px - 26}" y="${up ? 34 : 104}" width="52" height="62" rx="10"/><line class="tl-stem" x1="${px}" x2="${px}" y1="100" y2="${up ? 70 : 130}"/><circle class="tl-dot" cx="${px}" cy="100" r="7"/>
      <text class="sv-t tl-year" x="${inside(+px, e.label, 11)}" y="${up ? 84 : 122}">${e.label}</text><text class="lx-label sv-lab tl-name" x="${inside(+px, nameOf(e), 12)}" y="${ty}"></text></g>`;
  }).join('');
  return `<svg class="sv sv-timeline" viewBox="0 0 320 190" role="img" aria-label="خطّ زمني"><rect width="320" height="190" rx="16" fill="#fbf4e6"/>
    <line class="tl-line" x1="14" x2="306" y1="100" y2="100"/><path class="tl-arrow" d="M8 100 l10 -6 v12z"/>${parts}</svg>`;
}

export const ATLAS_VIEWS: Record<string, Picture> = { map: { html: mapHTML }, timeline: { html: timelineHTML } };
