// The rendered frames: fetched coarse to fine so scrubbing has something to show from the start, decoded off the main thread around the
// playhead, kept in a small window so memory stays bounded, whichever way the visitor is scrolling.

export class FrameStore {
  private blobs: (Blob | null)[]
  private bitmaps = new Map<number, ImageBitmap>()
  private decoding = new Set<number>()
  private order: number[] = []
  private fetching = 0
  private next = 0
  private center = 0
  private dir = 1
  private dead = false
  bytes = 0
  loaded = 0
  onReady?: () => void

  constructor(
    private url: (i: number) => string,
    private count: number,
    private keep: number,
    private signal: AbortSignal,
    private concurrency = 4,
  ) {
    this.blobs = new Array(count).fill(null)
    // First frames first, then a coarse pass, then fill in.
    const seen = new Set<number>()
    const add = (i: number) => {
      if (i >= 0 && i < count && !seen.has(i)) {
        seen.add(i)
        this.order.push(i)
      }
    }
    for (let i = 0; i < 4; i++) add(i)
    for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < count; i += step) add(i)
    add(count - 1)
    this.pump()
    signal.addEventListener('abort', () => this.dispose())
  }

  private pump() {
    while (!this.dead && this.fetching < this.concurrency && this.next < this.order.length) {
      const i = this.order[this.next++]
      this.fetching++
      fetch(this.url(i), { signal: this.signal })
        .then(r => {
          if (!r.ok) throw new Error(`frame ${i}: ${r.status}`)
          return r.blob()
        })
        .then(b => {
          this.blobs[i] = b
          this.bytes += b.size
          this.loaded++
          this.tick()
        })
        .catch(() => {})
        .finally(() => {
          this.fetching--
          this.pump()
        })
    }
  }

  /** Tell the store where the playhead is. */
  seek(center: number, dir: number) {
    this.center = center
    if (dir) this.dir = dir > 0 ? 1 : -1
    this.tick()
  }

  private tick() {
    if (this.dead) return
    // Decode outward from the playhead, favouring the way it's heading.
    const c = Math.round(this.center)
    const wanted: number[] = [c]
    for (let d = 1; d <= this.keep; d++) {
      wanted.push(c + d * this.dir)
      if (d <= this.keep / 2) wanted.push(c - d * this.dir)
    }
    let running = this.decoding.size
    for (const i of wanted) {
      if (running >= 3) break
      if (i < 0 || i >= this.count) continue
      if (this.bitmaps.has(i) || this.decoding.has(i)) continue
      const blob = this.blobs[i]
      if (!blob) continue
      running++
      this.decoding.add(i)
      createImageBitmap(blob, { premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' })
        .then(bm => {
          this.decoding.delete(i)
          if (this.dead) {
            bm.close()
            return
          }
          this.bitmaps.set(i, bm)
          this.evict()
          this.onReady?.()
          this.tick()
        })
        .catch(() => this.decoding.delete(i))
    }
  }

  private evict() {
    if (this.bitmaps.size <= this.keep + 2) return
    let far = -1
    let dist = -1
    for (const i of this.bitmaps.keys()) {
      const d = Math.abs(i - this.center)
      if (d > dist) {
        dist = d
        far = i
      }
    }
    if (far >= 0 && dist > 2) {
      this.bitmaps.get(far)!.close()
      this.bitmaps.delete(far)
    }
  }

  get(i: number) {
    return this.bitmaps.get(i) ?? null
  }

  /** The decoded frame closest to i, for showing something while the exact one is on its way. */
  nearest(i: number) {
    let best = -1
    let dist = 1e9
    for (const k of this.bitmaps.keys()) {
      const d = Math.abs(k - i)
      if (d < dist) {
        dist = d
        best = k
      }
    }
    return best
  }

  get done() {
    return this.loaded >= this.count
  }

  dispose() {
    this.dead = true
    for (const bm of this.bitmaps.values()) bm.close()
    this.bitmaps.clear()
    this.blobs.length = 0
  }
}
