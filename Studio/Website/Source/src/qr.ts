// Draws a QR code as an SVG, with the portal slide's look: rounded bars, pink eyes and a little arch in a clearing in the middle.
// It's drawn in the page so the code always holds this site's real address, on the final domain or on a test server.
// Level Q can lose about a quarter of its data, and that margin pays for the arch and the rounded modules.
const VERSIONS: Record<number, { blocks: number[]; ec: number }> = {
  3: { blocks: [17, 17], ec: 18 },
  4: { blocks: [24, 24], ec: 26 },
  5: { blocks: [15, 15, 16, 16], ec: 18 },
  6: { blocks: [19, 19, 19, 19], ec: 24 },
}
const INK = '#004646', EYE = '#d6125a', PLATE = '#fff8ea'

const EXP = new Uint8Array(512), LOG = new Uint8Array(256)
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = EXP[i + 255] = x
  LOG[x] = i
  x = (x << 1) ^ (x & 128 ? 0x11d : 0)
}
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0)
function ecWords(data: number[], n: number) {
  let gen = [1]
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(gen.length + 1).fill(0)
    gen.forEach((c, j) => {
      next[j] ^= c
      next[j + 1] ^= mul(c, EXP[i])
    })
    gen = next
  }
  const rem = new Array<number>(n).fill(0)
  for (const d of data) {
    const f = d ^ rem.shift()!
    rem.push(0)
    for (let i = 0; i < n; i++) rem[i] ^= mul(gen[i + 1], f)
  }
  return rem
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_, y) => y % 2 === 0,
  x => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => ((y >> 1) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
]

function matrix(text: string) {
  const bytes = [...new TextEncoder().encode(text)]
  const version = [3, 4, 5, 6].find(v => VERSIONS[v].blocks.reduce((a, b) => a + b) >= bytes.length + 2)
  if (!version) throw new Error('This address is too long for the QR code.')
  const { blocks: lengths, ec } = VERSIONS[version]
  const size = 17 + version * 4
  const dataWords = lengths.reduce((a, b) => a + b)

  const bits: number[] = []
  const push = (v: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1)
  }
  push(4, 4)
  push(bytes.length, 8)
  for (const b of bytes) push(b, 8)
  push(0, Math.min(4, dataWords * 8 - bits.length))
  while (bits.length % 8) bits.push(0)
  const words: number[] = []
  for (let i = 0; i < bits.length; i += 8) words.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  for (let pad = 0xec; words.length < dataWords; pad ^= 0xec ^ 0x11) words.push(pad)

  let at = 0
  const blocks = lengths.map(n => words.slice(at, (at += n)))
  const checks = blocks.map(b => ecWords(b, ec))
  const stream: number[] = []
  for (let i = 0; i < Math.max(...lengths); i++) for (const b of blocks) if (i < b.length) stream.push(b[i])
  for (let i = 0; i < ec; i++) for (const c of checks) stream.push(c[i])

  const grid = () => Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const base = grid(), fixed = grid()
  const put = (x: number, y: number, on: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    base[y][x] = on
    fixed[y][x] = true
  }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy))
        put(cx + dx, cy + dy, d !== 2 && d !== 4)
      }
    }
  }
  const al = size - 7
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) put(al + dx, al + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
  for (let i = 8; i < size - 8; i++) {
    put(i, 6, i % 2 === 0)
    put(6, i, i % 2 === 0)
  }
  const format = (mask: number) => {
    const d = (3 << 3) | mask // 3 means level Q.
    let r = d
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >> 9) & 1 ? 0x537 : 0)
    return ((d << 10) | (r & 0x3ff)) ^ 0x5412
  }
  const putFormat = (m: boolean[][], f: number) => {
    const bit = (i: number) => ((f >> i) & 1) === 1
    const set = (x: number, y: number, on: boolean) => {
      m[y][x] = on
      fixed[y][x] = true
    }
    for (let i = 0; i <= 5; i++) set(8, i, bit(i))
    set(8, 7, bit(6))
    set(8, 8, bit(7))
    set(7, 8, bit(8))
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i))
    set(8, size - 8, true) // The one module that is always dark.
  }
  putFormat(base, 0)

  const placed = grid()
  let i = 0, up = true
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right--
    for (let v = 0; v < size; v++) {
      const y = up ? size - 1 - v : v
      for (let x = right; x >= right - 1; x--) {
        if (fixed[y][x]) continue
        placed[y][x] = i < stream.length * 8 && ((stream[i >> 3] >> (7 - (i & 7))) & 1) === 1
        i++
      }
    }
    up = !up
  }

  const build = (k: number) => {
    const m = base.map((r, y) => r.map((on, x) => (fixed[y][x] ? on : placed[y][x] !== MASKS[k](x, y))))
    putFormat(m, format(k))
    return m
  }
  const penalty = (m: boolean[][]) => {
    let s = 0
    for (const l of [...m, ...m[0].map((_, x) => m.map(r => r[x]))]) {
      let run = 1
      for (let n = 1; n <= l.length; n++) {
        if (n < l.length && l[n] === l[n - 1]) run++
        else {
          if (run >= 5) s += run - 2
          run = 1
        }
      }
      const t = l.map(b => (b ? '1' : '0')).join('')
      for (const p of ['10111010000', '00001011101']) for (let n = t.indexOf(p); n >= 0; n = t.indexOf(p, n + 1)) s += 40
    }
    let dark = 0
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (m[y][x]) dark++
        if (y && x && m[y][x] === m[y - 1][x] && m[y][x] === m[y][x - 1] && m[y][x] === m[y - 1][x - 1]) s += 3
      }
    }
    return s + Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10
  }
  let best = build(0), bestScore = penalty(best)
  for (let k = 1; k < 8; k++) {
    const m = build(k), score = penalty(m)
    if (score < bestScore) {
      best = m
      bestScore = score
    }
  }
  return best
}

/** The code as SVG markup. */
export function qrSvg(text: string) {
  const m = matrix(text)
  const size = m.length, Q = 4, whole = size + 2 * Q
  const EYES = [[0, 0], [size - 7, 0], [0, size - 7]]
  const inEye = (x: number, y: number) => EYES.some(([ex, ey]) => x >= ex && x < ex + 7 && y >= ey && y < ey + 7)
  const al = size - 7
  const inAlign = (x: number, y: number) => Math.abs(x - al) <= 2 && Math.abs(y - al) <= 2
  // The arch sits in a clearing: 9 wide on the larger codes, 7 on the smallest, under 10% of the code either way.
  const half = size < 33 ? 3 : 4, mid = (size - 1) / 2
  const inArch = (x: number, y: number) => Math.abs(x - mid) <= half && Math.abs(y - mid) <= half
  // Each run along a row is one rounded bar, drawn as a thin box with a thick rounded stroke.
  let bars = ''
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = (a: number) => a < size && m[y][a] && !inEye(a, y) && !inAlign(a, y) && !inArch(a, y)
      if (!on(x)) continue
      let n = 1
      while (on(x + n)) n++
      const w = +(n - 0.6).toFixed(1)
      bars += `M${x + Q + 0.3} ${y + Q + 0.3}h${w}v.4h-${w}z`
      x += n - 1
    }
  }
  const eye = ([x, y]: number[]) =>
    `<rect x="${x + Q + 0.5}" y="${y + Q + 0.5}" width="6" height="6" rx="1.7" fill="none" stroke="${INK}"/>` +
    `<rect x="${x + Q + 2}" y="${y + Q + 2}" width="3" height="3" rx=".9" fill="${EYE}"/>`
  const ax = al - 2 + Q, ay = al - 2 + Q
  const k = half / 4
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${whole} ${whole}">` +
    `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d3fc4"/><stop offset=".6" stop-color="#f58ac0"/><stop offset="1" stop-color="#c8707f"/></linearGradient></defs>` +
    `<rect width="${whole}" height="${whole}" rx="2.6" fill="${PLATE}"/>` +
    `<path d="${bars}" fill="${INK}" stroke="${INK}" stroke-width=".6" stroke-linejoin="round"/>` +
    EYES.map(eye).join('') +
    `<rect x="${ax + 0.5}" y="${ay + 0.5}" width="4" height="4" rx="1.1" fill="none" stroke="${INK}"/><rect x="${ax + 2}" y="${ay + 2}" width="1" height="1" fill="${EYE}"/>` +
    `<g transform="translate(${mid + 0.5 + Q} ${mid + 0.5 + Q}) scale(${k})">` +
    `<path d="M-3.6 3.5V-.2a3.6 3.6 0 0 1 7.2 0V3.5z" fill="#1aa394" stroke="${INK}" stroke-width=".28"/>` +
    `<path d="M-2.2 3.5V-.2a2.2 2.2 0 0 1 4.4 0V3.5z" fill="url(#w)" stroke="#f5c542" stroke-width=".42"/>` +
    `<rect x="-4.2" y="3.4" width="8.4" height="1" rx=".35" fill="#ffd9c7" stroke="${INK}" stroke-width=".22"/>` +
    `<circle cx=".3" cy="1.1" r=".95" fill="#ffe6ef"/></g></svg>`
}

/** The code as an image address, ready for an <img>. */
export const qrImage = (text: string) => `data:image/svg+xml,${encodeURIComponent(qrSvg(text))}`

/** The portal page, for a link on this site. */
export const portalPath = (ar: boolean) => `${import.meta.env.BASE_URL}${ar ? 'ar/' : ''}portal/`

/** The portal page for a phone to open. A phone can't reach this computer's localhost, so there it's the final domain. */
export function portalForPhone(ar: boolean) {
  const h = location.hostname
  const local = h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
  return local ? `https://sindibad.studio/${ar ? 'ar/' : ''}portal/` : location.origin + portalPath(ar)
}
