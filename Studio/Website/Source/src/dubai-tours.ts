// The fly-ins, one for each bubble on the map. Each is a camera path round its landmark, the facts it tells on the way,
// and what the big counter shows. Rows are: progress 0 to 1, compass bearing of the camera from the landmark, distance,
// height, the height it looks at, how far the subject sits off centre, and optionally how freely the camera looks where it's
// flying (0 at the subject, 1 straight ahead) and by how much it turns from there. Distances are in units of 100 m.
// The first row is always replaced by wherever the camera really is when the flight starts.
const LL = (lat: number, lon: number): [number, number] => [((lon - 55.27436) * Math.cos((25.19716 * Math.PI) / 180) * 111320) / 100, ((lat - 25.19716) * 110574) / 100]

const WORLD = LL(25.2245, 55.174)

export type TourRide = { p: number; z: number; time: number }
export type Meter = { name: string; big: string; small: string; bar: number }
export type Tour = {
  id: string
  center: [number, number]
  keys: number[][]
  rate: number
  orbit: number
  /** The fountain's show turns up while this tour plays. */
  show?: boolean
  /** How far the sea deepens to a rich blue on this tour, 0 to 1. */
  deep?: number
  /** Where buildings stand close: the final circling swings this many degrees either way rather than going right round. */
  sway?: number
  /** Keep north at the top of the picture as the tour arrives. */
  north?: boolean
  /** Names laid over the landmark from a point of the tour: x, y and height in the city's units, English, Arabic. */
  labels?: { from: number; at: [number, number, number, string, string][] }
  /** Facts: the progress they appear at, English, Arabic. */
  facts: [number, string, string][]
  meter: (r: TourRide, ar: boolean, num: (n: number) => string) => Meter
}
const unit = (n: string, m: string, ar: boolean) => (ar ? `${n} ${m}` : `${n} ${m}`)

const levelAt = (h: number) => {
  const K = [[0, 0], [452, 124], [555, 148], [585, 163]]
  for (let i = 1; i < K.length; i++) if (h <= K[i][0]) return Math.round(K[i - 1][1] + ((h - K[i - 1][0]) / (K[i][0] - K[i - 1][0])) * (K[i][1] - K[i - 1][1]))
  return 163
}

export const TOURS: Record<string, Tour> = {
  burj_khalifa: {
    id: 'burj_khalifa',
    center: [0, 0],
    rate: 0.055,
    orbit: 1.6,
    keys: [
      [0, 0, 0, 0, 0, 0],
      [0.1, 156, 10.5, 3.4, 1.6, 0],
      [0.2, 178, 3.7, 0.45, 2.9, 0.1],
      [0.3, 205, 2.8, 0.95, 3.4, 0.16],
      [0.46, 300, 2.05, 2.7, 3.9, 0.18],
      [0.6, 405, 1.55, 4.2, 5.2, 0.18],
      [0.74, 515, 0.95, 5.75, 6.55, 0.2],
      [0.86, 615, 0.62, 7.45, 8.05, 0.2],
      [0.93, 690, 1.3, 9.0, 8.0, 0.08],
      [1, 770, 6.6, 12.8, 1.2, 0],
    ],
    facts: [
      [0.15, 'Burj Khalifa. The tallest building in the world, opened on 4 January 2010.', 'برج خليفة. أطول مبنى في العالم، افتُتح في 4 يناير 2010.'],
      [0.37, 'Its three-lobed shape was inspired by the Hymenocallis flower.', 'شكله الثلاثي مستوحى من زهرة الهايمنوكاليس.'],
      [0.5, 'The three wings step back as it climbs, which is what keeps it so stable.', 'تتراجع أجنحته الثلاثة كلما ارتفع، وهذا ما يمنحه ثباته.'],
      [0.62, 'Levels 124 and 125: the At the Top observation decks.', 'الطابقان 124 و125: منصّتا المراقبة At the Top.'],
      [0.71, 'Level 148: the At the Top SKY deck.', 'الطابق 148: منصّة At the Top SKY.'],
      [0.76, 'Past the last floor, the spire carries on alone.', 'بعد آخر طابق، يكمل البرج صعوده بقمّته المدبّبة.'],
      [0.985, '828 metres. And all of Dubai below you.', '828 متراً. ودبي كلها تحتك.'],
    ],
    meter(r, ar, num) {
      const h = r.p < 0.2 ? 0 : Math.max(0, Math.min(((r.z - 0.5) / 7.78) * 828, 828))
      const m = Math.round(h)
      return { name: m > 590 ? (ar ? 'القمّة' : 'Spire') : ar ? 'الطابق' : 'Level', big: num(levelAt(m)), small: unit(num(m), ar ? 'م' : 'm', ar), bar: m / 828 }
    },
  },
  fountain: {
    id: 'fountain',
    center: [1.35, -2.05],
    rate: 0.055,
    orbit: 2.2,
    sway: 6,
    show: true,
    // Up the lake's south arm with the tower ahead, low over the water, straight through the wall of jets, up over it, then a long
    // swing round to the view everyone comes for.
    keys: [
      [0, 0, 0, 0, 0, 0],
      [0.14, 178, 8, 3, 0.7, 0],
      [0.27, 182, 3.4, 0.5, 0.5, 0.05],
      [0.36, 205, 2.2, 0.3, 0.36, 0.07],
      [0.43, 232, 1.4, 0.14, 0.26, 0.06],
      [0.48, 232, 0.62, 0.13, 0.32, 0.04, 0.25, 0],
      [0.52, 228, -0.08, 0.16, 0.42, 0, 1, 0],
      [0.59, 225, -0.72, 0.46, 0.6, 0, 0.85, 100],
      [0.67, 240, -1.15, 0.98, 0.5, 0, 0.1, 180],
      [0.8, 285, -1.85, 0.9, 0.55, 0, 0, 180],
      [0.91, 340, -2.4, 0.6, 0.8, -0.05, 0, 180],
      [1, 370, -2.4, 0.32, 0.92, -0.1, 0, 180],
    ],
    facts: [
      [0.17, 'The Dubai Fountain, on a 30-acre lake at the foot of Burj Khalifa.', 'نافورة دبي، على بحيرة مساحتها 30 فداناً عند قاعدة برج خليفة.'],
      [0.33, 'About 275 metres from end to end.', 'طولها نحو 275 متراً من طرف إلى طرف.'],
      [0.62, 'Its jets throw water as high as 140 metres.', 'تقذف نوافيرها المياه حتى ارتفاع 140 متراً.'],
      [0.9, 'Designed by WET Design, who also made the Bellagio’s fountains in Las Vegas.', 'صمّمتها شركة WET Design، صاحبة نوافير بيلاجيو في لاس فيغاس.'],
    ],
    meter(r, ar, num) {
      const q = Math.min(r.p / 0.5, 1)
      const m = Math.round((70 + 70 * Math.pow(Math.sin(r.time * 1.05) * 0.5 + 0.5, 1.4)) * q)
      return { name: ar ? 'ارتفاع الماء' : 'Water height', big: num(m), small: ar ? 'متراً' : 'metres', bar: m / 140 }
    },
  },
  future: {
    id: 'future',
    center: LL(25.21925, 55.28173),
    rate: 0.062,
    orbit: 2.4,
    sway: 26,
    // In from the sea side over Sheikh Zayed Road, straight through the ring, then round to look back at it close up.
    keys: [
      [0, 0, 0, 0, 0, 0],
      [0.17, 300, 8.5, 2.5, 0.55, 0.06],
      [0.3, 312, 4.6, 1.2, 0.5, 0.12],
      [0.42, 320, 2.3, 0.62, 0.48, 0.17, 0.1, 0],
      [0.5, 325, 1.15, 0.47, 0.46, 0, 0.7, 0],
      [0.56, 325, 0.1, 0.46, 0.46, 0, 1, 0],
      [0.6, 325, -0.8, 0.48, 0.46, 0, 0.95, 50],
      [0.66, 325, -1.45, 0.58, 0.5, 0, 0.35, 165],
      [0.74, 318, -1.85, 0.68, 0.5, -0.12, 0, 180],
      [0.88, 300, -1.9, 0.72, 0.5, -0.14, 0, 180],
      [1, 282, -1.9, 0.7, 0.47, -0.14, 0, 180],
    ],
    facts: [
      [0.25, 'The Museum of the Future, 77 metres tall, opened on 22 February 2022.', 'متحف المستقبل، بارتفاع 77 متراً، افتُتح في 22 فبراير 2022.'],
      [0.56, 'Seven floors wrapped around an elliptical void. Right through the middle.', 'سبعة طوابق تلتفّ حول فراغ بيضاوي. مباشرة عبر قلبه.'],
      [0.76, 'Stainless steel and glass, with windows shaped by Arabic calligraphy.', 'فولاذ مقاوم للصدأ وزجاج، ونوافذ تشكّلها الخطوط العربية.'],
      [0.96, 'The script is by the artist Mattar bin Lahej. Designed by Killa Design.', 'الخط للفنان مطر بن لاحج، والتصميم لشركة Killa Design.'],
    ],
    meter(r, ar, num) {
      const q = Math.max(0, Math.min((r.p - 0.15) / 0.6, 1))
      return { name: ar ? 'الارتفاع' : 'Height', big: num(Math.round(77 * q)), small: ar ? 'متراً' : 'metres', bar: q }
    },
  },
  la_mer: {
    id: 'la_mer',
    // The beach itself, with Burj Khalifa on the skyline behind it just as it stands from the real sand.
    center: [-18.3, 33.7],
    rate: 0.062,
    orbit: 2,
    sway: 14,
    deep: 0.3,
    keys: [
      [0, 0, 0, 0, 0, 0],
      [0.2, 300, 11, 3.2, 0.3, 0],
      [0.36, 322, 5.6, 0.95, 0.2, 0.05],
      [0.52, 328, 3.2, 0.34, 0.18, 0.08],
      [0.68, 345, 1.75, 0.17, 0.16, 0.12],
      [0.82, 388, 1.3, 0.2, 0.14, 0.1],
      [0.92, 366, 2.05, 0.62, 0.2, 0.1],
      [1, 338, 2.7, 0.32, 0.3, 0.1],
    ],
    facts: [
      [0.24, 'La Mer, on the Jumeirah 1 shoreline.', 'لا مير، على شاطئ جميرا 1.'],
      [0.56, 'Built by Meraas, with its first phase opening in October 2017.', 'من تطوير مِراس، وافتُتحت مرحلتها الأولى في أكتوبر 2017.'],
      [0.84, 'About 2.5 kilometres of white sand.', 'نحو 2.5 كيلومتر من الرمال البيضاء.'],
    ],
    meter(r, ar, num) {
      const q = Math.max(0, Math.min((r.p - 0.2) / 0.7, 1))
      return { name: ar ? 'الشاطئ' : 'Beach', big: num(Math.round(q * 25) / 10), small: ar ? 'كيلومتر' : 'kilometres', bar: q }
    },
  },
  world: {
    id: 'world',
    center: WORLD,
    rate: 0.06,
    orbit: 1.1,
    sway: 5,
    deep: 1,
    north: true,
    // It's laid out with north at the top, so the flight ends looking down from due south, and the map reads as a map.
    keys: [
      [0, 0, 0, 0, 0, 0],
      [0.22, 128, 66, 24, 0, 0],
      [0.48, 150, 42, 56, 0, 0.15],
      [0.72, 172, 22, 96, 0, 0.5],
      [1, 180, 14, 124, 0, 1],
    ],
    labels: {
      from: 0.74,
      // Placed by the islands' names on OpenStreetMap: Ontario, Ecuador, Ireland, Sudan, India and their neighbours.
      at: [
        [WORLD[0] - 28, WORLD[1] - 13, 0.1, 'North America', 'أمريكا الشمالية'],
        [WORLD[0] - 9, WORLD[1] - 25, 0.1, 'South America', 'أمريكا الجنوبية'],
        [WORLD[0] - 13, WORLD[1] + 1, 0.1, 'Europe', 'أوروبا'],
        [WORLD[0] + 0, WORLD[1] - 8, 0.1, 'Africa', 'أفريقيا'],
        [WORLD[0] + 3, WORLD[1] + 14, 0.1, 'Asia', 'آسيا'],
      ],
    },
    facts: [
      [0.26, 'The World: islands built in the shape of a world map.', 'العالم: جزر شُيّدت على شكل خريطة العالم.'],
      [0.52, 'About 4 kilometres off Dubai’s shore, 9 kilometres long and 6 wide.', 'على بعد نحو 4 كيلومترات من الشاطئ، بطول 9 كيلومترات وعرض 6.'],
      [0.8, 'Built by Nakheel, with reclamation finished in 2008.', 'من تطوير نخيل، واكتمل استصلاحها في 2008.'],
    ],
    meter(r, ar, num) {
      const q = Math.max(0, Math.min((r.p - 0.2) / 0.72, 1))
      return { name: ar ? 'الجزر' : 'Islands', big: num(Math.round(300 * q)), small: ar ? 'جزيرة تقريباً' : 'or so', bar: q }
    },
  },
}
