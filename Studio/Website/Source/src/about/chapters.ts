// The other worlds in the book: what each one is called, its colour, and its emblem. The book's index tabs, the page each tab
// opens to and the tabs at the side of the screen inside a chapter all read from here. Icons are one SVG path each, in a
// 100 by 100 box, filled with the even-odd rule.
export type ChapterWords = { title: string; short: string; nth: string; note: string }
export type Chapter = { id: string; color: string; icon: string; en: ChapterWords; ar: ChapterWords }

const feathers = [-74, -46, -18, 10, 38]
  .map(deg => {
    const a = (deg * Math.PI) / 180
    const f = (r: number, side: number) => {
      const x = 40 + Math.sin(a) * r + Math.cos(a) * side
      const y = 44 - Math.cos(a) * r + Math.sin(a) * side
      return `${x.toFixed(1)} ${y.toFixed(1)}`
    }
    return `M${f(0, -3)} Q${f(20, -6)} ${f(36, 0)} Q${f(20, 6)} ${f(0, 3)}Z`
  })
  .join('')

export const ICONS = {
  book: 'M50 24C40 16 24 14 8 18V80C24 76 40 78 50 86 60 78 76 76 92 80V18C76 14 60 16 50 24ZM48 30H52V78H48Z',
  lens: 'M42 10a32 32 0 1 0 0 64 32 32 0 0 0 0-64Zm0 11a21 21 0 1 1 0 42 21 21 0 0 1 0-42ZM66 62l-6 6 24 24a4.2 4.2 0 0 0 6-6 4.2 4.2 0 0 0 0-6Z',
  lantern:
    'M50 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM50 20C38 20 27 29 23 40H77C73 29 62 20 50 20ZM20 43H80V50H20ZM25 53H75L68 84H32ZM50 58C44 66 41 69 41 74A9 9 0 0 0 59 74C59 69 56 66 50 58ZM28 87H72V95H28Z',
  phone:
    'M32 5H68A9 9 0 0 1 77 14V86A9 9 0 0 1 68 95H32A9 9 0 0 1 23 86V14A9 9 0 0 1 32 5ZM31 17V77H69V17ZM45 83H55V88H45ZM34 55C40 48 44 48 50 55S60 62 66 55V73H34Z',
  hoopoe: `${feathers}M26 58a18 18 0 1 0 36 0 18 18 0 0 0-36 0ZM50 53a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8ZM60 52C74 53 88 61 97 74 84 67 72 64 60 64ZM29 70C27 84 36 95 50 96H64C57 88 57 79 60 71 50 78 38 78 29 70Z`,
  sail: 'M47 6C70 22 84 44 87 66H31C39 46 45 26 47 6ZM12 71H90C86 84 73 91 54 91H37C25 91 16 84 12 71Z',
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'xray',
    color: '#1b5f86',
    icon: ICONS.lens,
    en: { title: 'The Lens', short: 'The Lens', nth: 'Chapter one', note: 'Look under the world and see how it’s made.' },
    ar: { title: 'العدسة', short: 'العدسة', nth: 'الفصل الأول', note: 'انظر تحت العالم لترى كيف صُنع.' },
  },
  {
    id: 'lantern',
    color: '#96421c',
    icon: ICONS.lantern,
    en: { title: 'The Lantern', short: 'The Lantern', nth: 'Chapter two', note: 'One light, one wall and a world of shadows.' },
    ar: { title: 'الفانوس', short: 'الفانوس', nth: 'الفصل الثاني', note: 'ضوء واحد وجدار واحد وعالم من الظلال.' },
  },
  {
    id: 'phone',
    color: '#0a7a78',
    icon: ICONS.phone,
    en: { title: 'The Phone', short: 'The Phone', nth: 'Chapter three', note: 'A whole sea inside an old phone.' },
    ar: { title: 'الهاتف', short: 'الهاتف', nth: 'الفصل الثالث', note: 'بحر كامل داخل هاتف قديم.' },
  },
  {
    id: 'hoopoe',
    color: '#c4581e',
    icon: ICONS.hoopoe,
    en: { title: 'The Hoopoe', short: 'The Hoopoe', nth: 'Chapter four', note: 'The guide has landed on the page.' },
    ar: { title: 'الهدهد', short: 'الهدهد', nth: 'الفصل الرابع', note: 'حطّ الدليل على الصفحة.' },
  },
  {
    id: 'sail',
    color: '#d81f63',
    icon: ICONS.sail,
    en: { title: 'Set Sail', short: 'Set Sail', nth: 'Chapter five', note: 'One click and the sea is yours.' },
    ar: { title: 'أبحر', short: 'أبحر', nth: 'الفصل الخامس', note: 'نقرة واحدة والبحر لك.' },
  },
]

export const BOOK_WORDS = {
  en: { back: 'Back to the book', nav: 'Chapters in this book' },
  ar: { back: 'العودة إلى الكتاب', nav: 'فصول هذا الكتاب' },
}

export const chapterById = (id: string) => CHAPTERS.find(c => c.id === id)

/** A colour from the page as the renderer's linear light. */
export function linear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.pow(v / 255, 2.2)
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)]
}
