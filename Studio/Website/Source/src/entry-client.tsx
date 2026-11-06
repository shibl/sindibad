// IBM Plex Sans Arabic (Arabic script only) is declared in fonts.css; design A's own Latin
// faces are declared in A.css.
import './fonts.css'
import './styles.css'

import { hydrate, render } from '@solidjs/web'
import Lenis from 'lenis'
import App from './App'
import { contentFor } from './content'

const root = document.getElementById('app')!
const app = () => <App content={contentFor(document.documentElement.lang)} />

// Built pages arrive prerendered (scripts/prerender.ts), so they hydrate. The dev server serves
// a bare shell, which renders from scratch.
if (!import.meta.env.DEV && 'prerendered' in root.dataset) {
  hydrate(app, root)
} else {
  root.textContent = ''
  render(app, root)
}
delete root.dataset.prerendered

// Smooth scrolling, including in-page anchor links. Lenis falls back to native scrolling
// when the visitor prefers reduced motion.
const lenis = new Lenis({ autoRaf: true, anchors: true })

// The hero's 3D art carousel (hero-concepts branch).
import('./concepts')

// The About storybook and its chapters are available in both development and production.
import('./about').then(about => about.useLenis(lenis))
