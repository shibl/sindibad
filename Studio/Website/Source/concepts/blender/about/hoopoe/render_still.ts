// Renders the still used when WebGL2 isn't available, through the real renderer, so it always matches the live bird.
//   bun concepts/blender/about/hoopoe/render_still.ts public/about/hoopoe/hoopoe-still.webp
// Needs the dev server running. Muted, and doesn't touch the studio's browser.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const out = process.argv[2]
const dir = mkdtempSync(join(tmpdir(), 'hoopoe-still-'))
const port = 20000 + Math.floor(Math.random() * 20000)
const chrome = Bun.spawn(
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--headless=new', '--mute-audio', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl',
    `--remote-debugging-port=${port}`, '--window-size=900,900', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${dir}`, 'about:blank'],
  { stderr: 'ignore', stdout: 'ignore' },
)
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
await send('Page.navigate', { url: 'http://127.0.0.1:5173/src/about/hoopoe/dev/viewer.html?clip=fold&cols=1&size=768&scale=192&pr=2&cy=1&cx=0&yaws=55' })
await Bun.sleep(2500)
const res = await send('Runtime.evaluate', { returnByValue: true, expression: `document.querySelector('#g canvas').toDataURL('image/webp', 0.86)` })
await Bun.write(out, Buffer.from(String(res.result.value).split(',')[1], 'base64'))
console.log('wrote', out, Math.round(Bun.file(out).size / 1024), 'KB')
ws.close()
chrome.kill()
try {
  rmSync(dir, { recursive: true, force: true })
} catch {}
process.exit(0)
