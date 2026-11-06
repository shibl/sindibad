import solid from '@solidjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages serves project sites under /<repo>/, which the deploy workflow passes in
// BASE_PATH (empty for a custom domain). URLs stay absolute so the prerendered HTML and the
// client bundle agree on every asset path.
const base = `${process.env.BASE_PATH ?? ''}/`.replace(/\/+$/, '/')

export default defineConfig(({ isSsrBuild }) => ({
  base,
  // `ssr: true` compiles hydratable client code plus a server build for scripts/prerender.ts.
  plugins: [solid({ ssr: true }), tailwindcss()],
  define: { __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()) },
  build: isSsrBuild
    ? { outDir: '.ssr', emptyOutDir: true }
    : { rolldownOptions: { input: { en: 'index.html', ar: 'ar/index.html', portal: 'portal/index.html', portalAr: 'ar/portal/index.html' } } },
  // Bundle Solid into the server build rather than resolving it again at prerender time.
  ssr: { noExternal: true },
}))
