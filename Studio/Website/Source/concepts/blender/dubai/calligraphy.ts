// Draws the Museum of the Future's window script into a texture: bun calligraphy.ts <out.webp>
// A stylised stand-in for the real building, whose windows spell out poems by Sheikh Mohammed in Mattar bin Lahej's hand. This
// one writes "the future" and "Museum of the Future" in the Thuluth style, big words with smaller ones tucked between them.
// The texture is lightly blurred so the page can cut it at any distance and get a clean, rounded edge.
const out = process.argv[2]
const port = 9476
const chrome = Bun.spawn(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--headless=new', `--remote-debugging-port=${port}`, '--window-size=1200,800',
  `--user-data-dir=/tmp/chrome-calli-${port}`, 'about:blank'], { stderr: 'ignore', stdout: 'ignore' })
let tabs: any[] = []
for (let i = 0; i < 50 && !tabs.length; i++) { await Bun.sleep(200); try { tabs = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter((t: any) => t.type === 'page') } catch {} }
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl)
await new Promise(r => (ws.onopen = r))
let id = 0
const pend = new Map<number, any>()
ws.onmessage = e => { const m = JSON.parse(String(e.data)); pend.get(m.id)?.(m.result); pend.delete(m.id) }
const send = (method: string, params: any = {}) => new Promise<any>(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const script = String.raw`(async () => {
  const W = 4096, H = 1600, SS = 2
  const FONT = '"Diwan Thuluth"'
  await document.fonts.load('100px ' + FONT, 'المستقبل')
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const c = document.createElement('canvas'); c.width = W * SS; c.height = H * SS
  const g = c.getContext('2d')
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height)
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'
  const BIG = ['المستقبل', 'متحف المستقبل', 'المستقبل', 'دبي المستقبل']
  const SMALL = ['المستقبل', 'متحف', 'دبي', 'المستقبل لمن', 'غد', 'حلم', 'نور', 'أمل']
  const PW = W * SS / 2, PH = H * SS / 2
  for (let py = 0; py < 2; py++) for (let px = 0; px < 2; px++) {
    g.save()
    g.beginPath(); g.rect(px * PW, py * PH, PW, PH); g.clip()
    g.translate(px * PW, py * PH)
    // Smaller script first, in a loose grid so the words sit side by side like a composed page. Each clears a thin margin
    // round itself as it goes down, so strokes pass in front of each other without tangling.
    const NX = 11, NY = 5
    for (let i = 0; i < NX * NY; i++) {
      const s = PH * (.14 + rnd() * .2)
      g.save()
      g.translate((i % NX + .5 + (rnd() - .5) * .8) / NX * PW, (Math.floor(i / NX) + .5 + (rnd() - .5) * .8) / NY * PH)
      g.rotate((rnd() - .5) * .5)
      g.font = s + 'px ' + FONT
      const t = SMALL[Math.floor(rnd() * SMALL.length)]
      g.strokeStyle = '#000'; g.lineJoin = 'round'; g.lineWidth = PH * .022
      g.strokeText(t, 0, 0)
      g.fillStyle = '#fff'
      g.fillText(t, 0, 0)
      g.restore()
    }
    // The big words clear a margin round themselves, then go on top.
    const words = [[.5, .55, 1.02, BIG[(px + py * 2) % 4], (rnd() - .5) * .1], [.12, .26, .5, BIG[(px + py + 1) % 4], -.2], [.88, .8, .5, BIG[(px * 2 + py + 2) % 4], .18]]
    for (const pass of [0, 1]) for (const [x, y, s, t, r] of words) {
      g.save()
      g.translate(x * PW, y * PH)
      g.rotate(r)
      g.font = s * PH + 'px ' + FONT
      // Long words squeezed to the patch, as a calligrapher would stack them.
      const m = g.measureText(t).width
      if (m > PW * .92) g.scale(PW * .92 / m, 1)
      if (pass === 0) {
        g.strokeStyle = '#000'; g.lineJoin = 'round'; g.lineWidth = PH * .06
        g.strokeText(t, 0, 0)
      } else {
        g.fillStyle = '#fff'
        g.fillText(t, 0, 0)
      }
      g.restore()
    }
    g.restore()
  }
  const o = document.createElement('canvas'); o.width = W; o.height = H
  const q = o.getContext('2d')
  q.filter = 'blur(1.7px)'
  q.drawImage(c, 0, 0, W, H)
  return { url: o.toDataURL('image/webp', .84), ok: document.fonts.check('100px ' + FONT, 'المستقبل') }
})()`
await send('Page.enable'); await send('Runtime.enable')
await send('Page.navigate', { url: 'about:blank' }); await Bun.sleep(300)
const res = await send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: script })
if (res.exceptionDetails) console.log(JSON.stringify(res.exceptionDetails).slice(0, 400))
const v = res.result.value
console.log('font ok', v.ok, 'bytes', Math.round(v.url.length * .75))
await Bun.write(out, Buffer.from(v.url.split(',')[1], 'base64'))
ws.close(); chrome.kill(); process.exit(0)
