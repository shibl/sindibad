// A development contact sheet: draws the bird from several angles or at several times of one clip. Not part of the site.
import { applyClip, parseClips, parseMesh, qaxis, qmul, Skeleton } from '../skeleton'
import { createRenderer } from '../renderer'

const q = new URLSearchParams(location.search)
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d)
const clipName = q.get('clip') ?? 'fold'
const size = num('size', 520)
const cols = num('cols', 4)
const scale = num('scale', 150)
const yaws = (q.get('yaws') ?? '-90,-55,-20,20,55,90,140,180').split(',').map(Number)
const ts = q.get('ts')?.split(',').map(Number)
const cy = num('cy', 1.0)
const cx = num('cx', 0)

const base = (import.meta as any).env.BASE_URL
const [meshBuf, clipBuf, atlas] = await Promise.all([
  fetch(`${base}about/hoopoe/hoopoe-mesh.bin?${Date.now()}`).then(r => r.arrayBuffer()),
  fetch(`${base}about/hoopoe/hoopoe-clips.bin?${Date.now()}`).then(r => r.arrayBuffer()),
  fetch(`${base}about/hoopoe/hoopoe-atlas.webp?${Date.now()}`).then(r => r.blob()).then(b => createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })),
])
const { head } = parseMesh(meshBuf)
const sk = new Skeleton(head.bones)
const clips = parseClips(clipBuf, sk.n)
const clip = clips.get(clipName)
if (!clip) throw new Error(`no clip ${clipName}: ${[...clips.keys()].join(', ')}`)

const g = document.getElementById('g')!
const views = ts ? ts.map(t => ({ yaw: yaws[0], t })) : yaws.map(y => ({ yaw: y, t: num('t', 0) }))
g.style.gridTemplateColumns = `repeat(${Math.min(cols, views.length)}, ${size}px)`

const canvas = document.createElement('canvas')
const R = createRenderer(canvas, size, num('pr', 1.5), meshBuf, atlas)
const root = sk.id('root')
const restRoot = sk.restR.slice(root * 4, root * 4 + 4)

const draw = (yaw: number, t: number) => {
  sk.reset()
  applyClip(sk, clip, t, 1)
  const qy = qaxis(0, 1, 0, (yaw * Math.PI) / 180)
  qmul(sk.R, root * 4, qy, 0, restRoot, 0)
  sk.T[root * 3] = cx
  sk.T[root * 3 + 1] = -cy
  sk.T[root * 3 + 2] = 0
  sk.solveWorld()
  sk.buildSkin()
  const eyes = new Float32Array(12)
  ;['eye.L', 'eye.R'].forEach((n, i) => {
    const e = sk.id(n)
    eyes.set(sk.WT.subarray(e * 3, e * 3 + 3), i * 3)
    const x = sk.WR[e * 4], y = sk.WR[e * 4 + 1], z = sk.WR[e * 4 + 2], w = sk.WR[e * 4 + 3]
    eyes.set([-2 * (x * z + y * w), -2 * (y * z - x * w), -(1 - 2 * (x * x + y * y))], 6 + i * 3)
  })
  R.render({
    eyes,
    skin: sk.skin,
    open: num('open', 0),
    scale,
    center: [cx, 1 - cy, 0],
    shadow: { offset: [0.03, -0.03], alpha: 0.2, blur: 1.6, blobs: [], blobAlpha: 0 },
  })
}
for (const v of views) {
  draw(v.yaw, v.t)
  const out = document.createElement('canvas')
  out.width = out.height = size
  const c = out.getContext('2d')!
  c.drawImage(canvas, 0, 0, size, size)
  g.append(out)
}
;(window as any).__done = true
