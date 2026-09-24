// postbuild: make the Vercel adapter's immutable cache rule for /_astro/* actually apply.
//
// @astrojs/vercel writes `.vercel/output/config.json` with the
// `^/_astro/(.*)$ → cache-control: public, max-age=31536000, immutable` route
// placed AFTER `{ "handle": "filesystem" }`. Routes after the filesystem handler
// only run when no static file matched, so the rule never fires for the hashed
// files it names and every /_astro asset ships `max-age=0, must-revalidate`
// (measured on www.uxjon.com, 2026-09-09). Header routes with `continue: true`
// belong BEFORE the filesystem phase. This moves it there.
//
// Then it ADDS the same rule for the instrument's unlisted folder (SIGNAL, 2026-09-23): the rips, the kit,
// the IRs and the boot sound live in public/s/<8hex>/ (RIP_ROOT in src/signal/types.ts) and a file there
// never changes under its folder name (re-encoding mints a new 8-hex folder). Only the hex folders: anything
// else under /s/ (the /signal page's phone still) keeps the default revalidation.
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
if (fsIndex === -1) {
  console.log("[cache-headers] no filesystem handler; nothing to do");
  process.exit(0);
}
const rest = routes.filter((r) => !moved.includes(r));
const newFs = rest.findIndex((r) => r.handle === "filesystem");
rest.splice(newFs, 0, ...moved);
console.log(
  moved.length
    ? `[cache-headers] moved ${moved.length} /_astro header route(s) above the filesystem handler`
    : "[cache-headers] nothing to reorder"
);

// the unlisted folder: immutable, above the filesystem handler, once
const SIG_SRC = "^/s/[0-9a-f]{8}/(.*)$";
const added = !rest.some((r) => r.src === SIG_SRC);
if (added) {
  rest.splice(rest.findIndex((r) => r.handle === "filesystem"), 0, {
    src: SIG_SRC,
    headers: { "cache-control": "public, max-age=31536000, immutable" },
    continue: true,
  });
  console.log("[cache-headers] added the /s/<8hex>/ immutable header route above the filesystem handler");
}
if (!moved.length && !added) process.exit(0);
config.routes = rest;
writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
