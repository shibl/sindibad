/** Original pixel art for the cartridge: the dhow, sea hazards, pickups, scenery and icons. */
import { BEAM, CLOUD, CLOUD2, CREAM, FAR, FARLINE, FILL, GLOW, HUD, INK, OBJ, OBJ2, PINK, sprite, glyph, type Sprite } from './gfx'

const KEY: Record<string, number> = {
  k: OBJ, f: FILL, h: OBJ2, p: PINK, c: CREAM, i: INK, u: HUD, F: FAR, x: FARLINE, g: GLOW, b: BEAM, C: CLOUD, D: CLOUD2,
}
const art = (rows: string[]) => sprite(rows, KEY)

function canvas(w: number, h: number) {
  const g: string[][] = []
  for (let y = 0; y < h; y++) g.push(new Array<string>(w).fill('.'))
  const set = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c }
  const span = (x0: number, x1: number, y: number, c: string) => { for (let x = x0; x <= x1; x++) set(x, y, c) }
  return { set, span, rows: () => g.map(r => r.join('')) }
}

// ---------------------------------------------------------------- the dhow (28 x 22, sails right)

export const DHOW_W = 28
export const DHOW_H = 22

function hull(c: ReturnType<typeof canvas>) {
  c.span(0, 1, 14, 'k')
  c.span(0, 2, 15, 'k'); c.span(25, 27, 15, 'k')
  c.span(0, 3, 16, 'k'); c.span(23, 26, 16, 'k')
  c.span(0, 25, 17, 'k')
  c.span(1, 24, 18, 'k'); c.span(3, 21, 18, 'h')
  c.span(1, 23, 19, 'k')
  c.span(2, 22, 20, 'k')
  c.span(4, 20, 21, 'k')
  // little windows along the hull
  c.set(5, 19, 'f'); c.set(9, 19, 'f'); c.set(13, 19, 'f'); c.set(17, 19, 'f')
}

function buildDhow(flag: number): Sprite {
  const c = canvas(DHOW_W, DHOW_H)
  const leech = [4, 4, 3, 3, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4]
  for (let r = 1; r <= 13; r++) {
    const L = leech[r], Y = 4 + r
    c.set(L, r, 'k'); c.span(L + 1, Y - 1, r, 'f'); c.set(Y, r, 'k')
  }
  c.set(4, 0, 'k')
  c.span(4, 18, 14, 'k')
  for (let r = 14; r <= 16; r++) c.set(4 + r, r, 'k') // yard runs down to the bow
  for (let r = 5; r <= 13; r++) c.set(10, r, 'h') // mast seen through the sail
  c.set(10, 15, 'k'); c.set(10, 16, 'k')
  // a seam across the sail for some shape
  for (let r = 6; r <= 13; r++) c.set(6 + Math.round((r - 6) * 0.25), r, r % 2 ? 'h' : 'f')
  hull(c)
  if (flag === 0) { c.span(1, 3, 0, 'p'); c.span(0, 1, 1, 'p') }
  else { c.span(0, 3, 0, 'p'); c.set(3, 1, 'p') }
  return art(c.rows())
}

function buildDhowFurled(flag: number): Sprite {
  const c = canvas(DHOW_W, DHOW_H)
  c.span(10, 10, 10, 'k')
  for (let r = 11; r <= 16; r++) c.set(10, r, 'k')
  c.span(2, 23, 13, 'k')
  c.span(2, 22, 14, 'f'); c.set(2, 14, 'k'); c.set(22, 14, 'k')
  c.span(3, 21, 15, 'k')
  c.set(7, 14, 'k'); c.set(15, 14, 'k'); c.set(19, 14, 'k')
  hull(c)
  if (flag === 0) { c.span(7, 9, 10, 'p'); c.span(6, 7, 11, 'p') }
  else { c.span(6, 9, 10, 'p'); c.set(9, 11, 'p') }
  return art(c.rows())
}

export const DHOW = [buildDhow(0), buildDhow(1)]
export const DHOW_FURLED = [buildDhowFurled(0), buildDhowFurled(1)]

/** Tiny dhow used in the "press A to sail" prompt. */
export const MINI_DHOW = art([
  '..k........',
  '..kk.......',
  '..kfk......',
  '..kffk.....',
  '..kfffk....',
  '..kkkkkk...',
  'kk..k...kk.',
  'kkkkkkkkkkk',
  '.kkkkkkkkk.',
  '...kkkkk...',
])

// ---------------------------------------------------------------- hazards

export const ROCK_S = art([
  '.....kkk......',
  '....khhkk.....',
  '...khhkkkk....',
  '...khkkkkkk...',
  '..khkkkkkkkk..',
  '..khkkkkkkkkk.',
  '.khhkkkkkkkkk.',
  '.khkkkkkkkkkkk',
  'khkkkkkkkkkkkk',
  'kkkkkkkkkkkkkk',
  'kkkkkkkkkkkkkk',
  'kkkkkkkkkkkkkk',
])

export const ROCK_L = art([
  '.......kk.........',
  '......khkk........',
  '......khkkk.......',
  '.....khhkkk.......',
  '.....khkkkkk......',
  '....khhkkkkk.kk...',
  '....khkkkkkkkhkk..',
  '...khhkkkkkkkhkkk.',
  '...khkkkkkkkkkkkk.',
  '..khhkkkkkkkkkkkk.',
  '..khkkkkkkkkkkkkkk',
  '.khhkkkkkkkkkkkkkk',
  '.khkkkkkkkkkkkkkkk',
  'khhkkkkkkkkkkkkkkk',
  'khkkkkkkkkkkkkkkkk',
  'kkkkkkkkkkkkkkkkkk',
  'kkkkkkkkkkkkkkkkkk',
  'kkkkkkkkkkkkkkkkkk',
  'kkkkkkkkkkkkkkkkkk',
])

export const BOULDER = art([
  '...kkkk...',
  '.kkhhkkkk.',
  '.khhkkkkk.',
  'khhkkkkkkk',
  'khkkkkkkkk',
  'kkkkkkkkkk',
  'kkkkkkkkkk',
  '.kkkkkkkk.',
  '.kkkkkkkk.',
  '...kkkk...',
])

/** A big leaping fish, facing left. */
export const FISH = art([
  '.....kkkkk.......',
  '...kkkkkkkkk...kk',
  '..kkkkkkkkkkk.kkk',
  '.kfkkkkkkkkkkkkk.',
  'kkkkkkkkkkkkkkk..',
  '.kkffffffkkkkkkk.',
  '..kkffffkkkk.kkk.',
  '....kkkkk.....kk.',
])

/** Dorsal fin cutting the surface: the leaping fish's telegraph. */
export const FIN = art(['....kk', '...kkk', '..kkkk', '.kkkkh', 'kkkkhh'])

/** The Roc, a giant bird out of the old voyages, flying left. Three wing frames. */
function buildRoc(frame: number): Sprite {
  const c = canvas(26, 15)
  // body
  c.span(2, 3, 6, 'k')
  c.span(1, 16, 7, 'k'); c.set(2, 7, 'f')
  c.span(0, 1, 8, 'f'); c.span(2, 19, 8, 'k'); c.span(21, 22, 8, 'k')
  c.span(2, 22, 9, 'k')
  c.span(5, 15, 10, 'k'); c.span(18, 20, 10, 'k')
  if (frame === 0) {
    // wings up
    const rows: [number, number, number][] = [[0, 16, 18], [1, 14, 18], [2, 12, 17], [3, 11, 16], [4, 10, 15], [5, 9, 14], [6, 8, 13]]
    for (const [y, a, b] of rows) { c.span(a, b, y, 'k'); if (b - a > 2) c.set(a + 2, y, 'h') }
  } else if (frame === 1) {
    // wings level, swept back
    const rows: [number, number, number][] = [[4, 14, 24], [5, 10, 25], [6, 8, 22]]
    for (const [y, a, b] of rows) c.span(a, b, y, 'k')
    c.span(13, 22, 5, 'h')
  } else {
    // wings down
    const rows: [number, number, number][] = [[10, 8, 14], [11, 9, 15], [12, 10, 16], [13, 12, 17], [14, 14, 18]]
    for (const [y, a, b] of rows) { c.span(a, b, y, 'k'); if (b - a > 2) c.set(a + 2, y, 'h') }
  }
  return art(c.rows())
}
export const ROC = [buildRoc(0), buildRoc(1), buildRoc(2), buildRoc(1)]

// ---------------------------------------------------------------- pickups

export const STAR = art([
  '....p....',
  '....p....',
  '...ppp...',
  'ppppppppp',
  '.ppcpppp.',
  '..ppppp..',
  '..ppppp..',
  '.pp...pp.',
  '.p.....p.',
])

export const HEART = art([
  '.pp...pp.',
  'pcpp.pppp',
  'pcppppppp',
  'ppppppppp',
  '.ppppppp.',
  '..ppppp..',
  '...ppp...',
  '....p....',
])

export const HUD_HEART = art(['.pp.pp.', 'ppppppp', 'pcppppp', '.ppppp.', '..ppp..', '...p...'])
export const HUD_HEART_EMPTY = art(['.uu.uu.', 'u..u..u', 'u.....u', '.u...u.', '..u.u..', '...u...'])

// ---------------------------------------------------------------- scenery

export const PALM = art([
  '.FFF.FF..',
  'F..FFFFF.',
  '..FFF..FF',
  '.F..F...F',
  '....F....',
  '...F.....',
  '...F.....',
  '...F.....',
])

export const LIGHTHOUSE = art([
  '...F...',
  '..FFF..',
  '.FgggF.',
  '.FgggF.',
  'FFFFFFF',
  '.FFFFF.',
  '.xxxxx.',
  '.FFFFF.',
  '.FFFFF.',
  '.xxxxx.',
  '.FFFFF.',
  'FFFFFFF',
  'FFFFFFF',
  'xxxxxxx',
  'FFFFFFF',
  'FFFFFFF',
])

export const CLOUDS = [
  art([
    '.......CCCC...........',
    '.....CCCCCCCC..CCC....',
    '..CCCCCCCCCCCCCCCCCCC.',
    '.CCCCCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCCCCCC',
    '.DDDDDDDDDDDDDDDDDDDD.',
  ]),
  art([
    '....CCCC......',
    '..CCCCCCCCC...',
    '.CCCCCCCCCCCC.',
    'CCCCCCCCCCCCCC',
    '.DDDDDDDDDDDD.',
  ]),
]

// ---------------------------------------------------------------- icons (one colour)

export const BTN = glyph([
  '...#####...',
  '.#########.',
  '.#########.',
  '###########',
  '###########',
  '###########',
  '###########',
  '###########',
  '.#########.',
  '.#########.',
  '...#####...',
])
export const LETTER_A = glyph(['.###.', '#...#', '#####', '#...#', '#...#'])
export const LETTER_B = glyph(['####.', '#...#', '####.', '#...#', '####.'])
export const PLAY = glyph(['#....', '##...', '###..', '####.', '###..', '##...', '#....'])
export const REPLAY = glyph([
  '..####.#.',
  '.##..###.',
  '##...###.',
  '#........',
  '#.......#',
  '##.....##',
  '.##...##.',
  '..#####..',
])
export const SMILEY = glyph([
  '..#####..',
  '.#######.',
  '##.###.##',
  '##.###.##',
  '#########',
  '##.###.##',
  '###...###',
  '.#######.',
  '..#####..',
])
export const CROWN = glyph(['#...#...#', '##.###.##', '#########', '#########', '#.#.#.#.#', '#########'])
export const SPEAKER = glyph(['...#.', '..##.', '####.', '####.', '####.', '####.', '..##.', '...#.'])
export const WAVES = glyph(['.#..', '..#.', '#..#', '.#.#', '.#.#', '#..#', '..#.', '.#..'])
export const MUTE = glyph(['....', '#..#', '.##.', '.##.', '#..#', '....'])
export const ZED = glyph(['#####', '...#.', '..#..', '.#...', '#####'])
export const NOTE = glyph(['..###', '..#.#', '..#..', '..#..', '###..', '###..'])
export const BANG = glyph(['##', '##', '##', '##', '##', '..', '##'])
export const DOWN = glyph(['#######', '.#####.', '..###..', '...#...'])
export const SPARK = glyph(['..#..', '..#..', '##.##', '..#..', '..#..'])
export const SMALL_STAR = glyph(['..#..', '.###.', '#####', '.###.', '.#.#.'])

