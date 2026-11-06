// Captures the phone's game screen from the page's own shader, so what's baked into the frames matches what runs live.
//   bun concepts/blender/about/phone/dump-screen.ts <output.png> [http://127.0.0.1:5173]
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const out = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5173'
const dir = mkdtempSync(join(tmpdir(), 'phone-dump-'))
const port = 20000 + Math.floor(Math.random() * 20000)
const chrome = Bun.spawn(
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '--headless=new', '--mute-audio', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', `--remote-debugging-port=${port}`, '--window-size=800,800', '--no-first-run', `--user-data-dir=${dir}`, 'about:blank'],
  { stderr: 'ignore', stdout: 'ignore' },
)
const done = (code: number) => {
  chrome.kill()
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {}
  process.exit(code)
}
let tabs: { type: string; webSocketDebuggerUrl: string }[] = []
for (let i = 0; i < 75 && !tabs.length; i++) {
  await Bun.sleep(200)
  try {
    tabs = ((await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as typeof tabs).filter(t => t.type === 'page')
  } catch {}
}
if (!tabs.length) done(2)
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
await send('Page.navigate', { url: `${origin}/concepts/blender/about/phone/dump-screen.html` })
for (let i = 0; i < 60; i++) {
  await Bun.sleep(500)
  const res = await send('Runtime.evaluate', { returnByValue: true, expression: 'window.dump || ""' })
  const url: string = res.result?.value ?? ''
  if (url.startsWith('data:image/png')) {
    await Bun.write(out, Buffer.from(url.split(',')[1], 'base64'))
    console.log('wrote', out)
    ws.close()
    done(0)
  }
}
console.error('no dump')
done(1)
