import type { Content } from './types'

export const en: Content = {
  lang: 'en',
  brand: 'Sindibad Studios',
  tagline: 'Game studio, Dubai',
  nav: [
    { href: '#games', label: 'Games' },
    { href: '#technology', label: 'Technology' },
    { href: '#studio', label: 'Studio' },
    { href: '#contact', label: 'Contact' },
  ],
  altLang: { lang: 'ar', path: 'ar/', short: 'عربي', long: 'النسخة العربية' },
  designs: { label: 'Design', classic: 'Original', monolith: 'Monolith', mirage: 'Mirage', krafton: 'Krafton', supercell: 'Supercell', a: 'A', b: 'B', c: 'C' },
  eyebrow: 'A new game studio · Dubai',
  hero: {
    wordmark: 'Sindibad',
    makers: 'Makers of',
    statementLabel: '(00) Statement',
    statement:
      'A new game studio from Dubai. We make serious, beautiful games, and we build them to run on every phone, online or not.',
    headline: 'New legends from an old sea.',
    intro: 'Sindibad Studios makes games in Arabic and English, for players everywhere. Our first voyage is underway.',
    primary: 'Our first voyage',
    secondary: 'Work with us',
  },
  about: {
    title: 'Made in two languages, from day one.',
    body: 'We are game developers, AI researchers and educators. We make games in Arabic and English for players worldwide, with a focus on the Gulf.',
  },
  game: {
    label: 'Games',
    note: 'Title 01',
    voyage: 'The first voyage',
    figure: 'Fig.',
    title: 'Sindibad & Yasmina',
    body: 'Sail an archipelago with Yasmina and her hoopoe guide. Every island is a world to master, and the whole game fits on a low-cost phone with no internet.',
    facts: [
      ['Islands', '9'],
      ['Lessons', '128'],
      ['Size', '~4.4 MB'],
      ['Network', 'Fully offline'],
      ['Devices', 'Low-powered Android'],
      ['Language', 'Arabic, RTL'],
    ],
    shots: [
      { src: 'map', alt: 'The island map, where every island is a world', caption: 'The island map', short: 'The archipelago' },
      { src: 'lesson', alt: 'A puzzle with Yasmina and her hoopoe guide', caption: 'A puzzle with Yasmina and the hoopoe', short: 'Puzzles' },
      { src: 'dialogue', alt: 'A conversation in the harbour town', caption: 'Harbour-town dialogue', short: 'Stories' },
    ],
  },
  numbers: [
    { value: '3', label: 'Disciplines: games, AI research, education' },
    { value: '4', label: 'In-house AI systems' },
    { value: '5', label: 'Countries, one team' },
    { value: '2', label: 'Languages: Arabic and English' },
  ],
  technology: {
    label: 'Technology',
    note: 'Built in-house',
    craft: 'Our craft',
    title: 'The craft behind every game.',
    items: [
      {
        meta: 'T.01',
        title: 'Player gesture ID',
        body: 'Learns how each player touches the screen, so the game knows when the device has changed hands.',
      },
      {
        meta: 'T.02',
        title: 'Adaptive engine',
        body: 'Tunes difficulty and pacing to each player’s capacity, keeping them in flow: challenged, never overwhelmed.',
      },
      {
        meta: 'T.03',
        title: 'Player simulator',
        body: 'Simulated players of every age play each game thousands of times before a real one does.',
      },
      {
        meta: 'T.04',
        title: 'Memory research',
        body: 'The latest research on memory decides when each idea comes back, so it stays with the player.',
      },
      {
        meta: 'T.05',
        title: 'Real Voices',
        body: 'Every voice has a personality. We shape pacing, tone and emotion to sound natural and stay consistent from one line to the next.',
      },
    ],
  },
  studio: {
    label: 'Studio',
    note: 'Distributed · HQ Dubai',
    title: 'One team across five countries.',
    crew: 'The crew',
    crewTitle: 'Home port in Dubai. A crew across five countries.',
    hq: 'Dubai (HQ)',
    hqLong: 'Headquarters',
    locations: ['Dubai', 'Canada', 'United States', 'Lebanon', 'Syria'],
    steps: [
      { meta: 'Step 01', title: 'Discover', body: 'Your players, your goals, the devices they actually use.' },
      { meta: 'Step 02', title: 'Design', body: 'Designers and educators shape the path and the play.' },
      { meta: 'Step 03', title: 'Simulate', body: 'The simulator balances difficulty before launch.' },
      { meta: 'Step 04', title: 'Launch', body: 'We ship, pilot with real players, and keep improving.' },
    ],
  },
  contact: {
    label: 'Contact',
    note: 'New projects welcome',
    lead: 'Start a project, or just say hello.',
    title: 'Let’s build the next legend.',
    cta: 'Start a project',
    rows: [
      { meta: 'Email', value: 'hello@[your-domain]', placeholder: true },
      { meta: 'Phone / WhatsApp', value: '[number]', placeholder: true },
      { meta: 'Office', value: 'Dubai, United Arab Emirates' },
    ],
  },
}
