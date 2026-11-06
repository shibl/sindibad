// Drives the real page in headless Chrome with the Mac's GPU, so WebGL runs as it does for a visitor.
//
//   bun scripts/about-shot.ts --id storybook --ps 0,0.5,1 --out /path/prefix
//
// --id <concept>      which concept to open (default original)
// --ps 0,0.5,1        scroll to these points of the section (0 top of the section, 1 its last screen) and shoot each
// --lang en|ar        language (default en)
// --w 1440 --h 900    viewport (default 1440x900)
// --dpr 1             device pixel ratio (default 1)
// --phone             a 390x844 touch phone at 3x
// --slowcpu 4         throttle the CPU by this factor, to feel a cheap phone
// --reduce            prefers-reduced-motion
// --pointer x,y       move the mouse here before each shot
// --click x,y         click here before each shot
// --eval "js"         run this in the page before each shot, and print the result
// --wait 2500         ms to wait after loading (default 2500)
// --settle 900        ms to wait after each scroll (default 900)
// --fps               measure frames per second over two seconds at each point
// --clean             hide the switcher and the top bar in the shots
// --url http://...    dev server (default http://127.0.0.1:5173)
// --act "js" --burst 16 --gap 150   after the shots, run this and capture frames this many ms apart, into one contact sheet
//
// Prints page errors, failed requests, the GPU in use, page weight and sideways overflow at the end.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const opt = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const phone = flag('phone')
const W = Number(opt('w', phone ? '390' : '1440'))
const H = Number(opt('h', phone ? '844' : '900'))
const DPR = Number(opt('dpr', phone ? '3' : '1'))
const id = opt('id', 'original')!
const lang = opt('lang', 'en')
const ps = (opt('ps', '0') as string).split(',').map(Number)
const out = opt('out', join(tmpdir(), `about-${id}`))!
const origin = opt('url', 'http://127.0.0.1:5173')!
const url = `${origin}${lang === 'ar' ? '/ar/' : '/'}?about=${id}`

const dir = mkdtempSync(join(tmpdir(), 'about-shot-'))
const port = 20000 + Math.floor(Math.random() * 20000)
const chrome = Bun.spawn(
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--headless=new', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl',
    '--autoplay-policy=no-user-gesture-required', '--mute-audio', `--remote-debugging-port=${port}`, `--window-size=${W},${H}`, '--hide-scrollbars', '--no-first-run',
    `--user-data-dir=${dir}`, 'about:blank'],
  { stderr: 'ignore', stdout: 'ignore' },
)
const finish = (code: number) => {
  chrome.kill()
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {}
  process.exit(code)
}
setTimeout(() => {
  console.error('timed out after 5 minutes')
  finish(2)
}, 300000)

let tabs: { type: string; webSocketDebuggerUrl: string }[] = []
for (let i = 0; i < 75 && !tabs.length; i++) {
  await Bun.sleep(200)
  try {
    tabs = ((await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as typeof tabs).filter(t => t.type === 'page')
  } catch {}
}
if (!tabs.length) {
  console.error('Chrome did not start')
  finish(2)
}
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl)
await new Promise(r => (ws.onopen = r))
let seq = 0
const pending = new Map<number, (v: any) => void>()
const errors: string[] = []
let bytes = 0
ws.onmessage = e => {
  const m = JSON.parse(String(e.data))
  if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 400))
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a: any) => a.value ?? a.description).join(' ').slice(0, 400))
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) errors.push(`${m.params.response.status} ${m.params.response.url}`)
  if (m.method === 'Network.dataReceived') bytes += m.params.encodedDataLength || m.params.dataLength
  pending.get(m.id)?.(m.result)
  pending.delete(m.id)
}
const send = (method: string, params: Record<string, unknown> = {}) =>
  new Promise<any>(r => {
    const i = ++seq
    pending.set(i, r)
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const ev = async (expression: string) => {
  const res = await send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression })
  return res.exceptionDetails ? `error: ${res.exceptionDetails.exception?.description}` : res.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: phone })
if (phone) await send('Emulation.setTouchEmulationEnabled', { enabled: true })
if (flag('reduce')) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
if (opt('slowcpu')) await send('Emulation.setCPUThrottlingRate', { rate: Number(opt('slowcpu')) })
// Stop other people's edits reloading the page mid-shot.
await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.WebSocket = function () { return { addEventListener() {}, removeEventListener() {}, close() {}, send() {} } }' })
await send('Page.navigate', { url })
await Bun.sleep(Number(opt('wait', '2500')))
if (flag('clean')) await ev(`document.head.append(Object.assign(document.createElement('style'), { textContent: '.about-switch,.a-header{display:none!important}' }))`)

const point = (name: string) => opt(name)?.split(',').map(Number)
const settle = Number(opt('settle', '900'))
const fps = `new Promise(res => { let n = 0; const t0 = performance.now(); const f = t => { n++; t - t0 < 2000 ? requestAnimationFrame(f) : res(Math.round(n / ((t - t0) / 1000))) }; requestAnimationFrame(f) })`
for (const p of ps) {
  await ev(`(() => { const s = document.querySelector('#about').getBoundingClientRect(); const top = s.top + scrollY; window.scrollTo({ top: top + ${p} * Math.max(0, s.height - innerHeight), behavior: 'instant' }) })()`)
  await Bun.sleep(settle)
  const move = point('pointer')
  if (move) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: move[0], y: move[1] })
    await Bun.sleep(350)
  }
  const click = point('click')
  if (click) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: click[0], y: click[1] })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: click[0], y: click[1], button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: click[0], y: click[1], button: 'left', clickCount: 1 })
    await Bun.sleep(600)
  }
  const js = opt('eval')
  if (js) console.log('eval', JSON.stringify(await ev(js)))
  if (flag('fps')) console.log(`p=${p} fps`, await ev(fps))
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  const file = ps.length > 1 ? `${out}-${p}.png` : `${out}.png`
  await Bun.write(file, Buffer.from(shot.data, 'base64'))
  console.log('wrote', file)
}

const burst = Number(opt('burst', '0'))
if (burst) {
  const act = opt('act')
  if (act) console.log('act', JSON.stringify(await ev(act)))
  const gap = Number(opt('gap', '150'))
  const frames: { t: number; data: string }[] = []
  const t0 = performance.now()
  for (let i = 0; i < burst; i++) {
    const at = t0 + i * gap
    const wait = at - performance.now()
    if (wait > 0) await Bun.sleep(wait)
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 })
    frames.push({ t: performance.now() - t0, data: shot.data })
  }
  const cols = Number(opt('cols', phone ? '8' : '4'))
  const cw = phone ? 220 : 480, ch = Math.round((cw * H) / W)
  const sheet = `(async () => {
    const list = ${JSON.stringify(frames.map(f => ({ t: Math.round(f.t), src: 'data:image/jpeg;base64,' + f.data })))};
    const c = document.createElement('canvas');
    c.width = ${cols} * ${cw};
    c.height = Math.ceil(list.length / ${cols}) * ${ch};
    const g = c.getContext('2d');
    g.font = '600 14px sans-serif';
    for (let i = 0; i < list.length; i++) {
      const im = new Image(); im.src = list[i].src; await im.decode();
      const x = (i % ${cols}) * ${cw}, y = Math.floor(i / ${cols}) * ${ch};
      g.drawImage(im, x, y, ${cw}, ${ch});
      g.fillStyle = '#000'; g.fillRect(x, y, 56, 20);
      g.fillStyle = '#fff'; g.fillText(list[i].t + 'ms', x + 4, y + 15);
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.strokeRect(x, y, ${cw}, ${ch});
    }
    return c.toDataURL('image/png').split(',')[1];
  })()`
  const png = await ev(sheet)
  await Bun.write(`${out}-sheet.png`, Buffer.from(String(png), 'base64'))
  console.log('wrote', `${out}-sheet.png`, frames.map(f => Math.round(f.t)).join(' '))
}

console.log('gpu', await ev(`(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return g ? (e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'webgl2') : 'none' })()`))
console.log('sideways overflow', await ev(`document.documentElement.scrollWidth > innerWidth`))
console.log('section height', await ev(`document.querySelector('#about').getBoundingClientRect().height`))
console.log('downloaded', `${(bytes / 1048576).toFixed(1)} MB (development build, includes the whole page)`)
console.log('errors', errors.length ? JSON.stringify(errors, null, 1) : 'none')
ws.close()
finish(0)
