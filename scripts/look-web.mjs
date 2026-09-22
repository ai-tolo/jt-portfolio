#!/usr/bin/env node
// The look room's pictures as the SITE serves them: web resolution (≤ 1200px
// wide, the carousel never paints wider) with Jon's ownership inside every
// file — EXIF Artist / Copyright / ImageDescription and XMP dc:creator /
// dc:rights / dc:title / xmpRights:Marked, written by exiftool (libvips's own
// WebP EXIF chunk carries a non-standard header that ffprobe rejects).
// Masters live OFF the site (~/Documents/studio-build/look-masters-*).
//   node scripts/look-web.mjs --from <masters dir>     every webp there → public/look
//   node scripts/look-web.mjs public/look/new.webp     one file, in place (a fresh drop)
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
sharp.cache(false);
const MAX_W = 1200, QUALITY = 82, ARTIST = "Jonathan Tollefson", OUT = "public/look";
const manifest = JSON.parse(fs.readFileSync("src/components/studio/rooms/illustrations-manifest.json", "utf8"));
const byFile = new Map(manifest.items.map((it) => [path.basename(it.src), it]));
const args = process.argv.slice(2);
const fromIdx = args.indexOf("--from");
const src = fromIdx >= 0 ? args[fromIdx + 1] : null;
const files = src
  ? fs.readdirSync(src).filter((f) => f.endsWith(".webp")).map((f) => path.join(src, f))
  : args.length ? args : fs.readdirSync(OUT).filter((f) => f.endsWith(".webp")).map((f) => path.join(OUT, f));
for (const file of files) {
  const name = path.basename(file);
  const it = byFile.get(name);
  const title = it?.title ?? path.basename(name, ".webp");
  const year = it?.year ? `${it.year} ` : "";
  const rights = `© ${year}${ARTIST}. All rights reserved.`;
  const before = await sharp(file).metadata();
  const out = path.join(OUT, name);
  const tmp = out + ".tmp";
  await sharp(file).resize({ width: MAX_W, withoutEnlargement: true }).webp({ quality: QUALITY, effort: 5 }).toFile(tmp);
  fs.renameSync(tmp, out);
  execFileSync("exiftool", [
    "-overwrite_original", "-q",
    `-EXIF:Artist=${ARTIST}`, `-EXIF:Copyright=${rights}`, `-EXIF:ImageDescription=${title} — ${ARTIST}`,
    `-XMP-dc:Creator=${ARTIST}`, `-XMP-dc:Rights=${rights}`, `-XMP-dc:Title=${title}`,
    "-XMP-xmpRights:Marked=True", "-XMP-xmpRights:WebStatement=https://www.uxjon.com/",
    out,
  ]);
  const after = await sharp(out).metadata();
  console.log(`${name.padEnd(26)} ${before.width}x${before.height} → ${after.width}x${after.height}  ${(fs.statSync(out).size / 1024).toFixed(0)}K  "${title}" ${year.trim()}`);
}
