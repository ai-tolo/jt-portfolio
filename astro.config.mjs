// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// Every page opts into static prerendering via `export const prerender = true`
// in its frontmatter, so the site builds to fully static HTML. `output: 'server'`
// with the Vercel adapter is retained (harmless with no on-demand routes) so a
// future dynamic route can be added without reconfiguring the build.
//
// `site` is the www host on purpose: Vercel 308-redirects the apex to www, so
// every canonical / og:url / og:image / sitemap entry must name www or they
// point at a redirect (2026-09-09 QA audit).
//
// https://astro.build/config
export default defineConfig({
  redirects: {
    '/signal': '/#play',
    // the doors and the orphans went to the junkyard (2026-09-22); links
    // already out in the world land on the story or the homepage
    '/catalog': '/case-studies/the-console',
    '/judge': '/case-studies/the-console',
    '/more': '/',
    '/writing/pushin-paper': '/',
    '/writing/sound': '/',
    '/writing/32-in-minneapolis-83-in-dakar': '/',
  },
  site: 'https://www.uxjon.com',
  output: 'server',
  adapter: vercel(),
  integrations: [
    sitemap({
      // momence is deliberately off-shelf: live at its URL, not advertised.
      filter: (page) => !page.includes('/case-studies/momence'),
    }),
  ],
  build: {
    // Inline the small per-page stylesheets (the 4.8 KB global sheet,
    // AwayRail, CSLayout) instead of a second render-blocking request.
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      // Raise the inlining threshold for STYLESHEETS ONLY. A plain number here
      // also base64-inlines every small woff2 subset the fontsource CSS
      // references, which doubled the homepage stylesheet (131 KB → 249 KB)
      // when tried; `undefined` keeps Vite's default for everything else.
      assetsInlineLimit: (file, content) =>
        file.endsWith('.css') ? content.byteLength < 8192 : undefined,
    },
  },
});
