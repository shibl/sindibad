// Reads pieces.bin, written by concepts/blender/about/storybook/build.py.
//
//   'SBK1', u32 piece count, u32 swatch count
//   each swatch: 12-byte name, f32 u, f32 v
//   each piece:  16-byte name, f32 u0, v0, ku, kv (uv = (u0 + x * ku, v0 - y * kv)), f32 back uv, f32 edge uv, f32 crease x,
//                u16 vertex count, u16 loop count, u16 triangle count, u16 pad,
//                u16 loop sizes (padded to 4 bytes), i16 x, y per vertex (page widths * 8192), u16 triangles (padded to 4 bytes)
// The first vertices are the outline's loops, in order; any others are interior points that let the piece bend.
export type PieceMesh = {
  name: string
  u0: number
  v0: number
  ku: number
  kv: number
  back: [number, number]
  edge: [number, number]
  crease: number
  xy: Int16Array
  loops: number[]
  tris: Uint16Array
  minX: number
  maxX: number
  minY: number
  maxY: number
}

const text = (b: Uint8Array) => {
  let s = ''
  for (const c of b) if (c) s += String.fromCharCode(c)
  return s
}

export function parsePieces(buffer: ArrayBuffer) {
  const dv = new DataView(buffer)
  if (text(new Uint8Array(buffer, 0, 4)) !== 'SBK1') throw new Error('storybook: pieces.bin has the wrong format')
  const pieceCount = dv.getUint32(4, true)
  const swatchCount = dv.getUint32(8, true)
  let at = 12
  const swatches: Record<string, [number, number]> = {}
  for (let i = 0; i < swatchCount; i++) {
    swatches[text(new Uint8Array(buffer, at, 12))] = [dv.getFloat32(at + 12, true), dv.getFloat32(at + 16, true)]
    at += 20
  }
  const pieces: Record<string, PieceMesh> = {}
  for (let i = 0; i < pieceCount; i++) {
    const name = text(new Uint8Array(buffer, at, 16))
    at += 16
    const f = (k: number) => dv.getFloat32(at + k * 4, true)
    const u0 = f(0), v0 = f(1), ku = f(2), kv = f(3)
    const back: [number, number] = [f(4), f(5)]
    const edge: [number, number] = [f(6), f(7)]
    const crease = f(8)
    at += 36
    const nv = dv.getUint16(at, true), nl = dv.getUint16(at + 2, true), nt = dv.getUint16(at + 4, true)
    at += 8
    const loops: number[] = []
    for (let k = 0; k < nl; k++) loops.push(dv.getUint16(at + k * 2, true))
    at += nl * 2
    if (at % 4) at += 4 - (at % 4)
    const xy = new Int16Array(buffer.slice(at, at + nv * 4))
    at += nv * 4
    const tris = new Uint16Array(buffer.slice(at, at + nt * 6))
    at += nt * 6
    if (at % 4) at += 4 - (at % 4)
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9
    for (let k = 0; k < nv; k++) {
      const x = xy[k * 2] / 8192, y = xy[k * 2 + 1] / 8192
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    pieces[name] = { name, u0, v0, ku, kv, back, edge, crease, xy, loops, tris, minX, maxX, minY, maxY }
  }
  return { pieces, swatches }
}
