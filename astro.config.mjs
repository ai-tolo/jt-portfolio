// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Public pages opt into static prerendering via `export const prerender = true`
// in their frontmatter. The Portal (private) routes and /api/console/* routes
// stay server-rendered so they can read cookies and proxy to the M1 brain.
//
// https://astro.build/config
export default defineConfig({
  site: 'https://uxjon.com',
  output: 'server',
  adapter: vercel(),
});
