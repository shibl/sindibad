// Draws everything that's printed or stamped on the book, as vector art rasterised by Chrome, so Arabic is shaped properly by a
// real text engine: the foil and blind stamping on both covers, and the printing on the two pages.
//   bun concepts/blender/about/storybook/prints.ts <scratch dir>
// Then textures.py turns these PNGs into the WebP files the page loads.
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const OUT = process.argv[2]
const ROOT = join(import.meta.dir, '../../../..')
const b64 = (p: string) => readFileSync(join(ROOT, p)).toString('base64')
const FONTS = `
@font-face { font-family: 'Bric'; src: url(data:font/woff2;base64,${b64('src/assets/a/bricolage-grotesque.woff2')}) format('woff2'); font-weight: 200 800; }
@font-face { font-family: 'Plex'; src: url(data:font/woff2;base64,${b64('node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff2')}) format('woff2'); font-weight: 700; }
`

const dir = mkdtempSync(join(tmpdir(), 'sb-prints-'))
const port = 20000 + Math.floor(Math.random() * 20000)
const chrome = Bun.spawn(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--headless=new', '--mute-audio', `--remote-debugging-port=${port}`, '--hide-scrollbars', '--no-first-run', `--user-data-dir=${dir}`, 'about:blank'], { stderr: 'ignore', stdout: 'ignore' })
// Chrome must never outlive this script: not on an exception, a signal or a hang.
const stopChrome = () => {
  try { chrome.kill() } catch {}
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}
process.on('exit', stopChrome)
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(sig, () => process.exit(130))
process.on('uncaughtException', e => { console.error(String(e)); process.exit(1) })
process.on('unhandledRejection', e => { console.error(String(e)); process.exit(1) })
setTimeout(() => { console.error('timed out'); process.exit(2) }, 120000)
let tabs: { type: string; webSocketDebuggerUrl: string }[] = []
for (let i = 0; i < 75 && !tabs.length; i++) {
  await Bun.sleep(200)
  try {
    tabs = ((await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as typeof tabs).filter(t => t.type === 'page')
  } catch {}
}
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl)
await new Promise(r => (ws.onopen = r))
let seq = 0
const pending = new Map<number, (v: any) => void>()
ws.onmessage = e => {
  const m = JSON.parse(String(e.data))
  pending.get(m.id)?.(m.result)
  pending.delete(m.id)
}
const send = (method: string, params: Record<string, unknown> = {}) =>
  new Promise<any>(r => {
    const i = ++seq
    pending.set(i, r)
    ws.send(JSON.stringify({ id: i, method, params }))
  })
await send('Page.enable')
await send('Runtime.enable')

async function render(name: string, svg: string, vw: number, vh: number, pxW: number, pxH: number, bg = '#000') {
  await send('Emulation.setDeviceMetricsOverride', { width: pxW, height: pxH, deviceScaleFactor: 1, mobile: false })
  const html = `<!doctype html><html><head><style>${FONTS} html,body{margin:0;background:${bg};overflow:hidden} svg{display:block;width:${pxW}px;height:${pxH}px} text{font-family:Bric,Plex}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}">${svg}</svg></body></html>`
  const { frameId } = (await send('Page.getFrameTree')).frameTree.frame.id ? { frameId: (await send('Page.getFrameTree')).frameTree.frame.id } : { frameId: '' }
  await send('Page.setDocumentContent', { frameId, html })
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => new Promise(r => setTimeout(r, 200)))', awaitPromise: true })
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  await Bun.write(join(OUT, `${name}.png`), Buffer.from(shot.data, 'base64'))
  console.log('wrote', name)
}

// ---------------------------------------------------------------------------------------------------------------- ornament
const star8 = (cx: number, cy: number, r: number, rot = 0, sharp = 0.7654) => {
  const pts: string[] = []
  const inner = r * sharp
  for (let i = 0; i < 16; i++) {
    const a = rot + (Math.PI * i) / 8
    const rr = i % 2 ? inner : r
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`)
  }
  return `<polygon points="${pts.join(' ')}"/>`
}
const lobes = (cx: number, cy: number, r0: number, r1: number, n: number) => {
  const pts: string[] = []
  for (let i = 0; i < 2 * n; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2
    const rr = i % 2 ? r1 : r0
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}
// The studio's mark assembled into its boat, sailing in the reading direction.
const boat = (cx: number, cy: number, s: number, flip: boolean) => `
<g transform="translate(${cx} ${cy}) scale(${flip ? -s : s} ${s}) translate(-30 -24)">
  <circle cx="47" cy="9" r="5.1"/>
  <g transform="translate(24 14)"><path d="M-9 10.5 L-9 -10.5 C2 -8.5 9 -1 10.5 10.5 Z"/></g>
  <g transform="translate(23 32) scale(1.02)"><path d="M-17 -6 C-11 1 11 1 17 -6 C16 5 8 9 0 9 C-8 9 -16 5 -17 -6 Z"/></g>
  <g transform="translate(23 45) scale(1.2 .5)"><path d="M-15 2.5 C-10 -6 -5 -6 0 0 S10 6 15 -2.5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g>
</g>`

// The cover is 984 x 1408 of a page's 1000, drawn at 1000 x 1431. The left 60 are the hinge groove (the right, for Arabic).
const CW = 1000, CH = 1431
function coverFoil(ar: boolean) {
  const gl = ar ? 40 : 96 // left of the frame
  const gr = ar ? 904 : 960
  const fx = (gl + gr) / 2
  const top = 56, bot = CH - 56
  let s = `<g fill="none" stroke="#fff">`
  s += `<rect x="${gl}" y="${top}" width="${gr - gl}" height="${bot - top}" stroke-width="7"/>`
  s += `<rect x="${gl + 13}" y="${top + 13}" width="${gr - gl - 26}" height="${bot - top - 26}" stroke-width="2.2"/>`
  s += `<rect x="${gl + 62}" y="${top + 62}" width="${gr - gl - 124}" height="${bot - top - 124}" stroke-width="2.2"/>`
  s += `<rect x="${gl + 72}" y="${top + 72}" width="${gr - gl - 144}" height="${bot - top - 144}" stroke-width="5"/>`
  s += `</g><g fill="#fff">`
  // The border band: stars with lozenges between them.
  const band = 37.5
  const nx = Math.round((gr - gl - 76) / 62)
  const ny = Math.round((bot - top - 76) / 62)
  const dxx = (gr - gl - 76) / nx, dyy = (bot - top - 76) / ny
  for (let i = 0; i <= nx; i++) {
    const x = gl + 38 + i * dxx
    for (const y of [top + band, bot - band]) {
      s += star8(x, y, 21, 0, 0.56)
      if (i < nx) s += `<polygon points="${x + dxx / 2 - 8},${y} ${x + dxx / 2},${y - 5} ${x + dxx / 2 + 8},${y} ${x + dxx / 2},${y + 5}"/>`
    }
  }
  for (let i = 1; i < ny; i++) {
    const y = top + 38 + i * dyy
    for (const x of [gl + band, gr - band]) s += star8(x, y, 21, 0, 0.56)
  }
  for (let i = 0; i < ny; i++) {
    const y = top + 38 + (i + 0.5) * dyy
    for (const x of [gl + band, gr - band]) s += `<polygon points="${x},${y - 8} ${x + 5},${y} ${x},${y + 8} ${x - 5},${y}"/>`
  }
  // The medallion
  const my = 590
  s += `</g>`
  s += `<polygon points="${lobes(fx, my, 268, 236, 24)}" fill="#fff"/>`
  s += `<polygon points="${lobes(fx, my, 258, 228, 24)}" fill="#000"/>`
  s += `<circle cx="${fx}" cy="${my}" r="212" fill="none" stroke="#fff" stroke-width="5"/>`
  s += `<circle cx="${fx}" cy="${my}" r="200" fill="none" stroke="#fff" stroke-width="1.8"/>`
  let ticks = ''
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    const r0 = 186, r1 = i % 2 ? 176 : 164
    ticks += `<line x1="${fx + r0 * Math.cos(a)}" y1="${my + r0 * Math.sin(a)}" x2="${fx + r1 * Math.cos(a)}" y2="${my + r1 * Math.sin(a)}"/>`
  }
  s += `<g stroke="#fff" stroke-width="3.2" stroke-linecap="round">${ticks}</g>`
  s += `<g fill="#fff">${boat(fx, my + 2, 5.6, ar)}</g>`
  // The title
  const y1 = my + 410
  if (ar) {
    s += `<g fill="#fff" text-anchor="middle" font-family="Plex" font-weight="700" direction="rtl">`
    s += `<text x="${fx}" y="${y1 + 18}" font-size="108" style="font-family:Plex">رحلات سندباد</text>`
    s += `<text x="${fx}" y="${y1 + 152}" font-size="108" style="font-family:Plex">وياسمينة</text>`
    s += `</g>`
  } else {
    s += `<g fill="#fff" text-anchor="middle" font-weight="700" letter-spacing="-2">`
    s += `<text x="${fx}" y="${y1 + 12}" font-size="118" style="font-family:Bric">Sindibad</text>`
    s += `<text x="${fx}" y="${y1 + 136}" font-size="118" style="font-family:Bric">&amp; Yasmina</text>`
    s += `</g>`
  }
  // A small flourish over the title
  s += `<g fill="#fff">${star8(fx, my + 306, 13)}<rect x="${fx - 150}" y="${my + 304.5}" width="120" height="3"/><rect x="${fx + 30}" y="${my + 304.5}" width="120" height="3"/></g>`
  return s
}

function coverBlind(ar: boolean) {
  const gl = ar ? 40 : 96
  const gr = ar ? 904 : 960
  const fx = (gl + gr) / 2
  const top = 56, bot = CH - 56
  const my = 590
  // A lattice of stars pressed into the field, clear of the medallion and the title.
  let s = `<defs><clipPath id="c"><rect x="${gl + 80}" y="${top + 80}" width="${gr - gl - 160}" height="${bot - top - 160}"/></clipPath>
  <mask id="m"><rect width="1000" height="1431" fill="#fff"/><circle cx="${fx}" cy="${my}" r="292" fill="#000"/><rect x="${gl + 60}" y="${my + 298}" width="${gr - gl - 120}" height="300" fill="#000"/></mask></defs>`
  // Filled stars with lozenges between them: pressed solid, they read as a pattern in the cloth rather than as scratches.
  s += `<g clip-path="url(#c)" mask="url(#m)" fill="#fff">`
  const r = 26, step = 86
  for (let j = -1; j < 19; j++) {
    for (let i = -1; i < 13; i++) {
      const x = fx + (i - 5.5) * step, y = my + (j - 8.5) * step
      s += star8(x, y, r, 0, 0.56)
      s += `<polygon points="${x + step / 2 - 9},${y + step / 2} ${x + step / 2},${y + step / 2 - 9} ${x + step / 2 + 9},${y + step / 2} ${x + step / 2},${y + step / 2 + 9}"/>`
    }
  }
  s += `</g>`
  return s
}

// The pages: 2000 x 1360, 1000 to a page. The world's page on the left of the image and the words' page on the right.
const PW = 2000, PH = 1360
function pagesArt() {
  const INK = '#0b5d63'
  let s = `<defs>
    <radialGradient id="sea" cx=".52" cy=".52" r=".72"><stop offset="0" stop-color="#d2e9e6"/><stop offset=".6" stop-color="#e2eee4"/><stop offset="1" stop-color="#f4ecdc"/></radialGradient>
    <pattern id="ticks" width="120" height="70" patternUnits="userSpaceOnUse" patternTransform="rotate(-3)">
      <path d="M8 22 q10 -8 20 0 t20 0 M70 58 q10 -8 20 0 t20 0" fill="none" stroke="${INK}" stroke-opacity=".14" stroke-width="2.4" stroke-linecap="round"/>
    </pattern></defs>`
  s += `<rect width="${PW}" height="${PH}" fill="#f4ecdc"/>`
  // The world's page is a sea chart.
  s += `<rect x="0" y="0" width="1000" height="${PH}" fill="url(#sea)"/>`
  s += `<rect x="0" y="0" width="1000" height="${PH}" fill="url(#ticks)"/>`
  const cx = 640, cy = 760
  let lines = ''
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2
    lines += `<line x1="${cx}" y1="${cy}" x2="${cx + 1800 * Math.cos(a)}" y2="${cy + 1800 * Math.sin(a)}"/>`
  }
  s += `<g stroke="${INK}" stroke-opacity=".10" stroke-width="1.6" clip-path="url(#cw)">${lines}</g>`
  s += `<clipPath id="cw"><rect x="0" y="0" width="1000" height="${PH}"/></clipPath>`
  // The route, in dashes: from the gutter to the far corner.
  s += `<path d="M 80 1240 C 240 1120 180 900 420 860 S 760 640 860 420 S 700 190 600 120" fill="none" stroke="#fa2a6f" stroke-opacity=".55" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 20"/>`
  // The compass rose
  const rose = (x: number, y: number, r: number) => {
    let g = `<g transform="translate(${x} ${y})">`
    g += `<circle r="${r * 0.72}" fill="none" stroke="${INK}" stroke-opacity=".45" stroke-width="3"/><circle r="${r * 0.66}" fill="none" stroke="${INK}" stroke-opacity=".45" stroke-width="1.4"/>`
    for (let i = 0; i < 8; i++) {
      const a = (i * 45 * Math.PI) / 180
      const L = i % 2 ? r * 0.62 : r
      const w = i % 2 ? r * 0.07 : r * 0.1
      const ca = Math.cos(a), sa = Math.sin(a)
      g += `<polygon points="${L * ca},${L * sa} ${-sa * w},${ca * w} 0,0" fill="${INK}" fill-opacity=".62"/>`
      g += `<polygon points="${L * ca},${L * sa} ${sa * w},${-ca * w} 0,0" fill="#e0b24e" fill-opacity=".9"/>`
    }
    return g + `<circle r="${r * 0.07}" fill="#fa2a6f"/></g>`
  }
  s += rose(860, 1210, 96)
  s += `<rect x="24" y="24" width="${1000 - 48}" height="${PH - 48}" fill="none" stroke="${INK}" stroke-opacity=".4" stroke-width="2.4"/>`
  s += `<rect x="34" y="34" width="${1000 - 68}" height="${PH - 68}" fill="none" stroke="${INK}" stroke-opacity=".22" stroke-width="1.2"/>`
  // The words' page: only a fine frame and some stars, printed in teal and gold. The words themselves are live HTML.
  const X0 = 1000
  s += `<g fill="none" stroke="${INK}">`
  s += `<rect x="${X0 + 44}" y="44" width="${1000 - 88 - 60}" height="${PH - 88}" stroke-opacity=".5" stroke-width="2.6"/>`
  s += `<rect x="${X0 + 54}" y="54" width="${1000 - 108 - 60}" height="${PH - 108}" stroke-opacity=".28" stroke-width="1.2"/>`
  s += `</g>`
  const cxp = X0 + 44 + (1000 - 88 - 60) / 2
  // Corner stars
  for (const [x, y] of [[X0 + 49, 49], [X0 + 1000 - 49 - 60, 49], [X0 + 49, PH - 49], [X0 + 1000 - 49 - 60, PH - 49]]) {
    s += `<g fill="#f4ecdc" stroke="${INK}" stroke-opacity=".7" stroke-width="2">${star8(x, y, 18)}</g><g fill="#e0b24e">${star8(x, y, 9)}</g>`
  }
  // Head ornament
  s += `<g fill="#e0b24e">${star8(cxp, 49, 11)}</g>`
  s += `<g fill="#e0b24e">${star8(cxp, PH - 49, 11)}</g>`
  return s
}

await render('foil-en', coverFoil(false), CW, CH, 1400, 2003)
await render('foil-ar', coverFoil(true), CW, CH, 1400, 2003)
await render('blind-en', coverBlind(false), CW, CH, 1400, 2003)
await render('blind-ar', coverBlind(true), CW, CH, 1400, 2003)
await render('pages', pagesArt(), PW, PH, 2000, 1360, '#f4ecdc')
ws.close()
chrome.kill()
rmSync(dir, { recursive: true, force: true })
process.exit(0)
