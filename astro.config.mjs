// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Every page opts into static prerendering via `export const prerender = true`
// in its frontmatter, so the site builds to fully static HTML. `output: 'server'`
// with the Vercel adapter is retained (harmless with no on-demand routes) so a
// future dynamic route can be added without reconfiguring the build.
//
// https://astro.build/config
export default defineConfig({
  redirects: { '/signal': '/#signal' },
  site: 'https://uxjon.com',
  output: 'server',
  adapter: vercel(),
});
