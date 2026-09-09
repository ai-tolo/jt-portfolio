// postbuild: make the Vercel adapter's immutable cache rule for /_astro/* actually apply.
//
// @astrojs/vercel writes `.vercel/output/config.json` with the
// `^/_astro/(.*)$ → cache-control: public, max-age=31536000, immutable` route
// placed AFTER `{ "handle": "filesystem" }`. Routes after the filesystem handler
// only run when no static file matched, so the rule never fires for the hashed
// files it names and every /_astro asset ships `max-age=0, must-revalidate`
// (measured on www.uxjon.com, 2026-09-09). Header routes with `continue: true`
// belong BEFORE the filesystem phase. This moves it there and does nothing else.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const path = new URL("../.vercel/output/config.json", import.meta.url);
if (!existsSync(path)) {
  console.log("[cache-headers] no .vercel/output/config.json; skipping");
  process.exit(0);
}
const config = JSON.parse(readFileSync(path, "utf8"));
const routes = config.routes ?? [];
const fsIndex = routes.findIndex((r) => r.handle === "filesystem");
const isAstroHeader = (r) =>
  typeof r.src === "string" && r.src.includes("/_astro/") && r.headers && r.continue === true;
const moved = routes.filter((r, i) => i > fsIndex && isAstroHeader(r));
if (fsIndex === -1 || moved.length === 0) {
  console.log("[cache-headers] nothing to reorder");
  process.exit(0);
}
const rest = routes.filter((r) => !moved.includes(r));
const newFs = rest.findIndex((r) => r.handle === "filesystem");
rest.splice(newFs, 0, ...moved);
config.routes = rest;
writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
console.log(`[cache-headers] moved ${moved.length} /_astro header route(s) above the filesystem handler`);
