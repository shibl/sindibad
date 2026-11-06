// Builds all the geometry: the hardcover itself, modelled here so it can't drift from the rig, and the paper pieces from
// pieces.bin, extruded to a thickness of card. Everything is merged into one buffer and drawn in one call; a vertex's part index
// picks its transform from a uniform block.
import type { PieceMesh } from './assets'

export const BOOK = {
  W: 1, // page width
  H: 1.36, // page depth
  T: 0.19, // closed thickness
  Y0: 0.095, // height of the open pages
  board: 0.02,
  over: 0.024, // how far the boards overhang the pages
  hinge: 0.04, // where the boards start, measured from the gutter
  dip: 0.024, // how far the pages fall into the gutter
}

export const enum Mat {
  Front = 0, // printed face of a paper piece
  Back = 1,
  Edge = 2, // the cut edge of a piece
  Page = 3,
  Block = 4, // the sprayed edges of the page block
  Cover = 5, // outside of the top board: cloth and foil
  Cloth = 6, // other cloth
  Spine = 7,
  Ribbon = 8,
  Wire = 9,
  Leaf = 10, // the fold-out leaf that carries the words on a phone
  TurnFront = 11, // a turning page: the side it shows while it lies on the right
  TurnBack = 12, // and the side it shows once it has landed on the left
  TurnEdge = 13,
  Window = 14, // the chapter's page, with an arch cut through it
  DoorFront = 15,
  DoorBack = 16,
  ChapterTab = 17,
  DoorEdge = 18,
}

/** The arch cut through a chapter's page, in page widths: centre, half width, how far apart its two arcs' centres sit, springline and foot. */
export const ARCH = { cx: 0.53, a: 0.36, c: 0.18, zs: -0.04, zb: 0.46, layers: 3, depth: 0.03, inset: 0.026 }
/** Negative inside the arch. p is across the page from the gutter, then along it. */
export function archD(x: number, z: number, inset = 0) {
  const qx = Math.abs(x - ARCH.cx), qy = z - ARCH.zs
  const d = qy < 0 ? Math.hypot(qx + ARCH.c, qy) - (ARCH.a + ARCH.c) : qx - ARCH.a
  return Math.max(d, qy - (ARCH.zb - ARCH.zs)) + inset
}
/** The index tabs on the fore-edge: how far they stand out, how wide they are, and how far apart. */
export const INDEX = { out: 0.11, w: 0.18, pitch: 0.2, z0: -0.47 }

export class MeshBuilder {
  data: number[] = []
  index: number[] = []
  count = 0
  /** Position, normal, uv, part and material. */
  v(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number, part: number, mat: number) {
    this.data.push(x, y, z, nx, ny, nz, u, w, part, mat)
    return this.count++
  }
  quad(a: number, b: number, c: number, d: number) {
    this.index.push(a, b, c, a, c, d)
  }
  tri(a: number, b: number, c: number) {
    this.index.push(a, b, c)
  }
  /** 24 bytes a vertex: f32 position, i8 normal, u16 uv, u8 part, u8 material. */
  build() {
    const STRIDE = 24
    const buf = new ArrayBuffer(this.count * STRIDE)
    const f = new Float32Array(buf)
    const i8 = new Int8Array(buf)
    const u16 = new Uint16Array(buf)
    const u8 = new Uint8Array(buf)
    const d = this.data
    for (let i = 0, k = 0; i < this.count; i++, k += 10) {
      const o = i * STRIDE
      f[o / 4] = d[k]
      f[o / 4 + 1] = d[k + 1]
      f[o / 4 + 2] = d[k + 2]
      i8[o + 12] = Math.round(d[k + 3] * 127)
      i8[o + 13] = Math.round(d[k + 4] * 127)
      i8[o + 14] = Math.round(d[k + 5] * 127)
      u16[(o + 16) / 2] = Math.round(Math.max(0, Math.min(1, d[k + 6])) * 65535)
      u16[(o + 18) / 2] = Math.round(Math.max(0, Math.min(1, d[k + 7])) * 65535)
      u8[o + 20] = d[k + 8]
      u8[o + 21] = d[k + 9]
    }
    return { vertices: new Uint8Array(buf), indices: new Uint32Array(this.index), stride: STRIDE }
  }
}

const THICK = 0.0052

/** Adds a piece, extruded. flip mirrors it in x, for a second use of the same art facing the other way. */
export function addPiece(m: MeshBuilder, mesh: PieceMesh, part: number, flip = false) {
  const { xy, tris, loops } = mesh
  const n = xy.length / 2
  const sx = flip ? -1 : 1
  const X = (i: number) => (sx * xy[i * 2]) / 8192
  const Y = (i: number) => xy[i * 2 + 1] / 8192
  const U = (i: number) => mesh.u0 + (xy[i * 2] / 8192) * mesh.ku
  const V = (i: number) => mesh.v0 - (xy[i * 2 + 1] / 8192) * mesh.kv
  const f0 = m.count
  for (let i = 0; i < n; i++) m.v(X(i), Y(i), THICK / 2, 0, 0, 1, U(i), V(i), part, Mat.Front)
  const b0 = m.count
  for (let i = 0; i < n; i++) m.v(X(i), Y(i), -THICK / 2, 0, 0, -1, mesh.back[0], mesh.back[1], part, Mat.Back)
  for (let t = 0; t < tris.length; t += 3) {
    m.tri(f0 + tris[t], f0 + tris[t + 1], f0 + tris[t + 2])
    m.tri(b0 + tris[t], b0 + tris[t + 2], b0 + tris[t + 1])
  }
  let at = 0
  for (const size of loops) {
    for (let i = 0; i < size; i++) {
      const a = at + i, b = at + ((i + 1) % size)
      const dx = X(b) - X(a), dy = Y(b) - Y(a)
      const l = Math.hypot(dx, dy) || 1
      const nx = (dy / l) * (flip ? -1 : 1), ny = (-dx / l) * (flip ? -1 : 1)
      const e = mesh.edge
      const v0 = m.v(X(a), Y(a), THICK / 2, nx, ny, 0, e[0], e[1], part, Mat.Edge)
      const v1 = m.v(X(b), Y(b), THICK / 2, nx, ny, 0, e[0], e[1], part, Mat.Edge)
      const v2 = m.v(X(b), Y(b), -THICK / 2, nx, ny, 0, e[0], e[1], part, Mat.Edge)
      const v3 = m.v(X(a), Y(a), -THICK / 2, nx, ny, 0, e[0], e[1], part, Mat.Edge)
      m.quad(v0, v1, v2, v3)
    }
    at += size
  }
}

/** A thin strip of card or wire, one unit tall, on its base. Width in page widths. */
export function addStrip(m: MeshBuilder, w: number, uv: [number, number], part: number, mat: number = Mat.Wire) {
  const t = THICK * 0.45
  const faces: [number, number, number][] = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0]]
  for (const [nx, , nz] of faces) {
    const ax = nz ? -w / 2 : (nx * w) / 2
    const az = nz ? (nz * t) / 2 : -t / 2
    const bx = nz ? w / 2 : (nx * w) / 2
    const bz = nz ? (nz * t) / 2 : t / 2
    const a = m.v(ax, 0, az, nx, 0, nz, uv[0], uv[1], part, mat)
    const b = m.v(bx, 0, bz, nx, 0, nz, uv[0], uv[1], part, mat)
    const c = m.v(bx, 1, bz, nx, 0, nz, uv[0], uv[1], part, mat)
    const d = m.v(ax, 1, az, nx, 0, nz, uv[0], uv[1], part, mat)
    m.quad(a, b, c, d)
  }
}

// A rounded board: plan outline with two rounded corners on the fore-edge side, bevelled all round.
function board(m: MeshBuilder, part: number, y0: number, y1: number, outer: 1 | -1, dir: number) {
  const { W, H, over, hinge } = BOOK
  const x0 = hinge, x1 = W + over, z0 = -H / 2 - over, z1 = H / 2 + over
  const r = 0.016, soft = 0.004, bev = 0.0032
  const out: { x: number; z: number; nx: number; nz: number }[] = []
  const corner = (cx: number, cz: number, a0: number, rad: number) => {
    const steps = rad > 0.01 ? 8 : 2
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((Math.PI / 2) * i) / steps
      out.push({ x: cx + rad * Math.cos(a), z: cz + rad * Math.sin(a), nx: Math.cos(a), nz: Math.sin(a) })
    }
  }
  corner(x1 - r, z1 - r, 0, r) // fore-edge, near
  corner(x0 + soft, z1 - soft, Math.PI / 2, soft)
  corner(x0 + soft, z0 + soft, Math.PI, soft)
  corner(x1 - r, z0 + r, -Math.PI / 2, r)
  const n = out.length
  const coverUV = (x: number, z: number): [number, number] => {
    const u = (x - x0) / (x1 - x0)
    return [dir > 0 ? u : 1 - u, (z - z0) / (z1 - z0)]
  }
  const ctr = { x: (x0 + x1) / 2, z: (z0 + z1) / 2 }
  // Rings from the top face down the side to the bottom face.
  const rows: { off: number; y: number; ny: number; ns: number; mat: number }[] = [
    { off: -bev, y: y1, ny: 1, ns: 0, mat: outer === 1 ? Mat.Cover : Mat.Cloth },
    { off: -bev * 0.3, y: y1 - bev * 0.3, ny: 0.72, ns: 0.72, mat: Mat.Cloth },
    { off: 0, y: y1 - bev, ny: 0, ns: 1, mat: Mat.Cloth },
    { off: 0, y: y0 + bev, ny: 0, ns: 1, mat: Mat.Cloth },
    { off: -bev * 0.3, y: y0 + bev * 0.3, ny: -0.72, ns: 0.72, mat: Mat.Cloth },
    { off: -bev, y: y0, ny: -1, ns: 0, mat: outer === -1 ? Mat.Cover : Mat.Cloth },
  ]
  const start: number[] = []
  for (const row of rows) {
    start.push(m.count)
    for (let i = 0; i < n; i++) {
      const p = out[i]
      const x = p.x + p.nx * row.off, z = p.z + p.nz * row.off
      const [u, v] = coverUV(x, z)
      m.v(x, row.y, z, p.nx * row.ns, row.ny, p.nz * row.ns, u, v, part, row.mat)
    }
  }
  for (let k = 0; k < rows.length - 1; k++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      m.quad(start[k] + i, start[k] + j, start[k + 1] + j, start[k + 1] + i)
    }
  }
  // Caps: the top face and the bottom, each with its own material.
  for (const [row, ny] of [[0, 1], [rows.length - 1, -1]] as const) {
    const [u, v] = coverUV(ctr.x, ctr.z)
    const mat = rows[row].mat
    const c = m.v(ctr.x, rows[row].y, ctr.z, 0, ny, 0, u, v, part, mat)
    const first = m.count
    for (let i = 0; i < n; i++) {
      const p = out[i]
      const x = p.x - p.nx * bev, z = p.z - p.nz * bev
      const [cu, cv] = coverUV(x, z)
      m.v(x, rows[row].y, z, 0, ny, 0, cu, cv, part, mat)
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      m.tri(c, first + i, first + j)
    }
  }
}

/** Height of the open page above the book's base at distance x from the gutter. */
export const pageY = (x: number) => BOOK.Y0 - BOOK.dip * Math.exp(-x / 0.03) - 0.0025 * Math.exp(-(1 - x) / 0.02)

// One half of the page block. mirror=false is the bottom half, as it lies when closed; true is the top half.
function block(m: MeshBuilder, part: number, mirror: boolean) {
  const { W, H, Y0, board: b, hinge } = BOOK
  const Y = (y: number) => (mirror ? 2 * Y0 - y : y)
  const ny = mirror ? -1 : 1
  const z0 = -H / 2, z1 = H / 2
  // Columns across the page, close together near the gutter where it curves.
  const xs: number[] = [0]
  for (let i = 1; i <= 12; i++) xs.push(0.14 * (i / 12) ** 1.7)
  for (let i = 1; i <= 6; i++) xs.push(0.14 + ((W - 0.14 - 0.03) * i) / 6)
  for (let i = 1; i <= 4; i++) xs.push(W - 0.03 + (0.03 * i) / 4)
  const uvx = (x: number) => (mirror ? 0.5 + (1 - x / W) * 0.5 : (x / W) * 0.5)
  // The printed page
  const top: number[] = []
  for (const x of xs) {
    const e = 0.002
    const dy = (pageY(x + e) - pageY(Math.max(0, x - e))) / (x + e - Math.max(0, x - e))
    const l = Math.hypot(dy, 1)
    const a = m.v(x, Y(pageY(x)), z0, -dy / l, (ny * 1) / l, 0, uvx(x), 0, part, Mat.Page)
    const c = m.v(x, Y(pageY(x)), z1, -dy / l, (ny * 1) / l, 0, uvx(x), 1, part, Mat.Page)
    top.push(a, c)
  }
  for (let i = 0; i + 1 < xs.length; i++) {
    m.quad(top[i * 2], top[i * 2 + 1], top[i * 2 + 3], top[i * 2 + 2])
  }
  // The fore-edge
  const q = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, nx: number, nz: number, u0: number, u1: number, v0: number, v1: number) => {
    const a = m.v(ax, Y(ay), az, nx, 0, nz, u0, v0, part, Mat.Block)
    const c = m.v(bx, Y(by), bz, nx, 0, nz, u1, v1, part, Mat.Block)
    const d = m.v(bx, Y(ay), bz, nx, 0, nz, u1, v0, part, Mat.Block)
    const e = m.v(ax, Y(by), az, nx, 0, nz, u0, v1, part, Mat.Block)
    m.quad(a, d, c, e)
  }
  q(W, b, z1, W, pageY(W), z0, 1, 0, 0, 1.36, 0, 1)
  // Head and tail: follows the curve of the page, down to the board; the inner side slants in under the spine.
  for (const [z, nz] of [[z0, -1], [z1, 1]] as const) {
    for (let i = 0; i + 1 < xs.length; i++) {
      const xa = xs[i], xb = xs[i + 1]
      const low = (x: number) => (x < hinge ? pageY(0) + (b - pageY(0)) * (x / hinge) : b)
      const a = m.v(xa, Y(low(xa)), z, 0, 0, nz, xa, 0, part, Mat.Block)
      const c = m.v(xb, Y(low(xb)), z, 0, 0, nz, xb, 0, part, Mat.Block)
      const d = m.v(xb, Y(pageY(xb)), z, 0, 0, nz, xb, 1, part, Mat.Block)
      const e = m.v(xa, Y(pageY(xa)), z, 0, 0, nz, xa, 1, part, Mat.Block)
      m.quad(a, c, d, e)
    }
  }
}

export const LOWER = 0, UPPER = 1, SPINE = 2, RIBBON = 3, LEAF = 4, TURN = 5, TURNS = 3, WINDOW = 8, DOOR_NEAR = 9, DOOR_FAR = 10, CHAPTER_TAB = 11, CHAPTER_TABS = 5, FIRST_PIECE = 16

export function addBook(m: MeshBuilder, dir: number) {
  const { H, T, over } = BOOK
  board(m, LOWER, 0, BOOK.board, -1, dir)
  board(m, UPPER, T - BOOK.board, T, 1, dir)
  block(m, LOWER, false)
  block(m, UPPER, true)
  // The spine: a strip whose curve is worked out in the vertex shader, across s (x) and along the book (z).
  const steps = 18
  const first = m.count
  for (let i = 0; i <= steps; i++) {
    const s = i / steps
    m.v(s, 0, -H / 2 - over, 0, 0, 0, s, 0, SPINE, Mat.Spine)
    m.v(s, 0, H / 2 + over, 0, 0, 0, s, 1, SPINE, Mat.Spine)
  }
  for (let i = 0; i < steps; i++) m.quad(first + i * 2, first + i * 2 + 1, first + i * 2 + 3, first + i * 2 + 2)
  // The ribbon: a strip following a curve from the vertex shader, s along its length, x across.
  const rs = 36
  const rf = m.count
  for (let i = 0; i <= rs; i++) {
    const s = i / rs
    m.v(s, 0, -0.5, 0, 0, 0, s, 0, RIBBON, Mat.Ribbon)
    m.v(s, 0, 0.5, 0, 0, 0, s, 1, RIBBON, Mat.Ribbon)
  }
  for (let i = 0; i < rs; i++) m.quad(rf + i * 2, rf + i * 2 + 1, rf + i * 2 + 3, rf + i * 2 + 2)
  // The fold-out leaf. Hinged along x at the origin and lying along -z, its printed side down.
  const { W } = BOOK
  const t = 0.005
  const L = H
  const leafV = (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number) => m.v(x, y, z, nx, ny, nz, u, w, LEAF, Mat.Leaf)
  const box = (ax: number, az: number, bx: number, bz: number, y: number, ny: number, flipU: boolean) => {
    const a = leafV(ax, y, az, 0, ny, 0, flipU ? 0.5 : 0.5, 0)
    const b = leafV(bx, y, az, 0, ny, 0, 1, 0)
    const c = leafV(bx, y, bz, 0, ny, 0, 1, 1)
    const d = leafV(ax, y, bz, 0, ny, 0, 0.5, 1)
    m.quad(a, b, c, d)
  }
  // Printed side: u across, v away from the hinge.
  box(0, 0, W, -L, -t / 2, -1, false)
  // Plain side, using a bare stretch of paper.
  for (const [ax, bx, nx] of [[0, 0, -1], [W, W, 1]] as const) {
    const a = leafV(ax, -t / 2, 0, nx, 0, 0, 0.75, 0.02)
    const b = leafV(ax, -t / 2, -L, nx, 0, 0, 0.75, 0.02)
    const c = leafV(bx, t / 2, -L, nx, 0, 0, 0.75, 0.02)
    const d = leafV(bx, t / 2, 0, nx, 0, 0, 0.75, 0.02)
    m.quad(a, b, c, d)
  }
  const e0 = leafV(0, -t / 2, -L, 0, 0, -1, 0.75, 0.02)
  const e1 = leafV(W, -t / 2, -L, 0, 0, -1, 0.75, 0.02)
  const e2 = leafV(W, t / 2, -L, 0, 0, -1, 0.75, 0.02)
  const e3 = leafV(0, t / 2, -L, 0, 0, -1, 0.75, 0.02)
  m.quad(e0, e1, e2, e3)
  // Its top: plain paper at home, and the world's picture while a chapter is out. The printed side only uses u from 0.5 up, so u under
  // 0.45 marks this side and carries its place across the sheet.
  const p0 = leafV(0, t / 2, 0, 0, 1, 0, 0, 0)
  const p1 = leafV(W, t / 2, 0, 0, 1, 0, 0.45, 0)
  const p2 = leafV(W, t / 2, -L, 0, 1, 0, 0.45, 1)
  const p3 = leafV(0, t / 2, -L, 0, 1, 0, 0, 1)
  m.quad(p0, p1, p2, p3)
}

// ------------------------------------------------------------------------------------------------- the book's chapters

const pageColumns = () => {
  const { W } = BOOK
  const xs: number[] = [0]
  for (let i = 1; i <= 12; i++) xs.push(0.14 * (i / 12) ** 1.7)
  for (let i = 1; i <= 6; i++) xs.push(0.14 + ((W - 0.14 - 0.03) * i) / 6)
  for (let i = 1; i <= 4; i++) xs.push(W - 0.03 + (0.03 * i) / 4)
  return xs
}
const pageNormal = (x: number) => {
  const e = 0.002
  const dy = (pageY(x + e) - pageY(Math.max(0, x - e))) / (x + e - Math.max(0, x - e))
  const l = Math.hypot(dy, 1)
  return [-dy / l, 1 / l] as const
}

/**
 * A page that can turn. It's bent in the vertex shader, so it's stored flat: x across it from the gutter, y as an offset from
 * the height of the hinge, z along the book. Its front lies exactly on the printed page, so nothing shows when it takes over.
 */
function addTurningPage(m: MeshBuilder, part: number) {
  const { W, H, Y0 } = BOOK
  const xs = pageColumns()
  const t = 0.0016, back = -0.0014
  const z0 = -H / 2, z1 = H / 2
  const face = (off: number, flip: number, mat: number, uv: (x: number) => number) => {
    const row: number[] = []
    for (const x of xs) {
      const [nx, ny] = pageNormal(x)
      const y = pageY(x) - Y0 + off
      row.push(m.v(x, y, z0, nx * flip, ny * flip, 0, uv(x), 0, part, mat), m.v(x, y, z1, nx * flip, ny * flip, 0, uv(x), 1, part, mat))
    }
    for (let i = 0; i + 1 < xs.length; i++) m.quad(row[i * 2], row[i * 2 + 1], row[i * 2 + 3], row[i * 2 + 2])
  }
  face(t, 1, Mat.TurnFront, x => (x / W) * 0.5)
  face(back, -1, Mat.TurnBack, x => x / W)
  // The cut edges of the sheet.
  const edge = (ax: number, az: number, bx: number, bz: number, nx: number, nz: number) => {
    const ya = pageY(ax) - Y0, yb = pageY(bx) - Y0
    const a = m.v(ax, ya + t, az, nx, 0, nz, 0, 0, part, Mat.TurnEdge)
    const b = m.v(bx, yb + t, bz, nx, 0, nz, 0, 0, part, Mat.TurnEdge)
    const c = m.v(bx, yb + back, bz, nx, 0, nz, 0, 0, part, Mat.TurnEdge)
    const d = m.v(ax, ya + back, az, nx, 0, nz, 0, 0, part, Mat.TurnEdge)
    m.quad(a, b, c, d)
  }
  edge(W, z0, W, z1, 1, 0)
  for (let i = 0; i + 1 < xs.length; i++) {
    edge(xs[i], z0, xs[i + 1], z0, 0, -1)
    edge(xs[i], z1, xs[i + 1], z1, 0, 1)
  }
}

/** The chapter's page: printed around the arch, and see-through inside it. */
function addWindowPage(m: MeshBuilder, part: number) {
  const { W, H } = BOOK
  const xs = pageColumns()
  const z0 = -H / 2, z1 = H / 2
  const row: number[] = []
  for (const x of xs) {
    const [nx, ny] = pageNormal(x)
    const y = pageY(x) + 0.0008
    row.push(m.v(x, y, z0, nx, ny, 0, x / W, 0, part, Mat.Window), m.v(x, y, z1, nx, ny, 0, x / W, 1, part, Mat.Window))
  }
  for (let i = 0; i + 1 < xs.length; i++) m.quad(row[i * 2], row[i * 2 + 1], row[i * 2 + 3], row[i * 2 + 2])
}

/** One of the arch's two doors, hinged at the arch's side. Its print is the page's own, so shut it looks like one sheet. side: 1 is the door away from the gutter. */
function addDoor(m: MeshBuilder, part: number, side: 1 | -1) {
  const { W, H } = BOOK
  const { cx, a, c, zs, zb } = ARCH
  const R = a + c
  const top = Math.sqrt(R * R - c * c)
  const seam = -0.0007
  const out: [number, number][] = [[cx + side * a, zb]]
  const steps = 24
  const a0 = Math.PI, a1 = Math.PI - Math.atan2(top, c)
  for (let i = 0; i <= steps; i++) {
    // From the springline to the apex, along the arc centred on the far side of the arch.
    const t = a0 + ((a1 - a0) * i) / steps
    const cosT = Math.cos(t), sinT = Math.sin(t)
    out.push([cx - side * c - side * cosT * R, zs - Math.abs(sinT) * R])
  }
  out.push([cx + side * seam, zs - top], [cx + side * seam, zb])
  const hx = cx + side * a
  const th = 0.0052
  const uv = (x: number, z: number): [number, number] => [x / W, (z + H / 2) / H]
  const cap = (y: number, ny: number, mat: number) => {
    const first = m.count
    for (const [x, z] of out) {
      const [u, w] = uv(x, z)
      m.v(x - hx, y, z, 0, ny, 0, u, w, part, mat)
    }
    for (let i = 1; i + 1 < out.length; i++) m.tri(first, first + i, first + i + 1)
  }
  cap(th / 2, 1, Mat.DoorFront)
  cap(-th / 2, -1, Mat.DoorBack)
  for (let i = 0; i < out.length; i++) {
    const [ax, az] = out[i], [bx, bz] = out[(i + 1) % out.length]
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1
    const nx = (dz / l) * side, nz = (-dx / l) * side
    const p = m.v(ax - hx, th / 2, az, nx, 0, nz, 0, 0, part, Mat.DoorEdge)
    const q = m.v(bx - hx, th / 2, bz, nx, 0, nz, 0, 0, part, Mat.DoorEdge)
    const r = m.v(bx - hx, -th / 2, bz, nx, 0, nz, 0, 0, part, Mat.DoorEdge)
    const s = m.v(ax - hx, -th / 2, az, nx, 0, nz, 0, 0, part, Mat.DoorEdge)
    m.quad(p, q, r, s)
  }
}

/** An index tab: a card with two rounded corners that slides out of the page block. index picks its cell of the emblem sheet. */
function addIndexTab(m: MeshBuilder, part: number, index: number, dir: number) {
  const { out: L, w } = INDEX
  const tuck = 0.1, r = 0.03, th = 0.0058
  const outline: [number, number][] = [[-tuck, -w / 2]]
  const arc = (cx: number, cz: number, from: number) => {
    for (let i = 0; i <= 8; i++) {
      const a = from + (Math.PI / 2) * (i / 8)
      outline.push([cx + r * Math.cos(a), cz + r * Math.sin(a)])
    }
  }
  arc(L - r, -w / 2 + r, -Math.PI / 2)
  arc(L - r, w / 2 - r, 0)
  outline.push([-tuck, w / 2])
  const cell = (x: number, z: number): [number, number] => {
    const cu = Math.max(0, Math.min(1, x / L))
    return [(index + (dir > 0 ? cu : 1 - cu)) / CHAPTER_TABS, (z + w / 2) / w]
  }
  const cap = (y: number, ny: number) => {
    const c = cell(L / 2 - tuck / 2, 0)
    const centre = m.v(L / 2 - tuck / 2, y, 0, 0, ny, 0, c[0], c[1], part, Mat.ChapterTab)
    const first = m.count
    for (const [x, z] of outline) {
      const [u, v] = ny > 0 ? cell(x, z) : [0, 0]
      m.v(x, y, z, 0, ny, 0, u, v, part, Mat.ChapterTab)
    }
    for (let i = 0; i < outline.length; i++) m.tri(centre, first + i, first + ((i + 1) % outline.length))
  }
  cap(th / 2, 1)
  cap(-th / 2, -1)
  for (let i = 0; i < outline.length; i++) {
    const [ax, az] = outline[i], [bx, bz] = outline[(i + 1) % outline.length]
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1
    const nx = dz / l, nz = -dx / l
    const p = m.v(ax, th / 2, az, nx, 0, nz, 0, 0, part, Mat.ChapterTab)
    const q = m.v(bx, th / 2, bz, nx, 0, nz, 0, 0, part, Mat.ChapterTab)
    const s = m.v(bx, -th / 2, bz, nx, 0, nz, 0, 0, part, Mat.ChapterTab)
    const t = m.v(ax, -th / 2, az, nx, 0, nz, 0, 0, part, Mat.ChapterTab)
    m.quad(p, q, s, t)
  }
}

export function addChapters(m: MeshBuilder, dir: number) {
  for (let i = 0; i < TURNS; i++) addTurningPage(m, TURN + i)
  addWindowPage(m, WINDOW)
  addDoor(m, DOOR_NEAR, -1)
  addDoor(m, DOOR_FAR, 1)
  for (let i = 0; i < CHAPTER_TABS; i++) addIndexTab(m, CHAPTER_TAB + i, i, dir)
}
