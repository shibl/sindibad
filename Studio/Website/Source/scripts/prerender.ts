// Fills the HTML shells Vite built in dist/ with each page's server-rendered markup, so the
// site reads fine before (or without) JavaScript and the client hydrates instead of rendering
// from scratch. Runs after `vite build --ssr src/entry-server.tsx` has written .ssr/.
import { readFile, rm, writeFile } from 'node:fs/promises'

const serverEntry = '../.ssr/entry-server.js'
const { render } = (await import(serverEntry)) as typeof import('../src/entry-server')

const pages = { en: 'dist/index.html', ar: 'dist/ar/index.html' }

for (const [lang, file] of Object.entries(pages)) {
  const shell = await readFile(file, 'utf8')
  const mount = '<div id="app"><!--ssr-html-->'
  if (!shell.includes(mount)) throw new Error(`${file} has no ${mount} marker`)
  const { head, html } = render(lang)
  // Replacer functions, so `$` sequences in the markup are inserted literally. The client
  // reads data-prerendered to decide between hydrating and rendering from scratch.
  await writeFile(
    file,
    shell
      .replace('<!--ssr-head-->', () => head)
      .replace(mount, () => `<div id="app" data-prerendered>${html}`),
  )
  console.log(`prerendered ${file}`)
}

await rm('.ssr', { recursive: true, force: true })
