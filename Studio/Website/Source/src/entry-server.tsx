import { generateHydrationScript, renderToString } from '@solidjs/web'
import App from './App'
import { contentFor } from './content'

/** Renders one language's page to HTML at build time; see scripts/prerender.ts. */
export function render(lang: string) {
  return {
    head: generateHydrationScript(),
    html: renderToString(() => <App content={contentFor(lang)} />),
  }
}
