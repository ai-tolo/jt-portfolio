// Pre-build step. Walks every Published case study in Notion, finds image
// blocks that are Notion-hosted (signed URLs that expire), and downloads
// them to /public/case-studies/[slug]/notion-[block-id].[ext].
//
// The renderer in src/lib/notion.ts rewrites those block URLs to the same
// local path so the deployed HTML points at the downloaded copy. End result:
// drag an image into a Notion case study body, run `publish`, image appears
// inline at the right position on the site.
//
// External image URLs (Notion's "embed by URL" option) are left alone.

import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client, isFullPage, isFullBlock } from "@notionhq/client";

// Load .env for local runs. On Vercel, env vars are already in process.env.
if (existsSync(".env")) {
  const data = readFileSync(".env", "utf-8");
  for (const line of data.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const DATA_SOURCE_ID = "e3863918-725e-4a5b-8968-ff133155c443";
const TOKEN = process.env.NOTION_TOKEN;

if (!TOKEN) {
  console.error("[sync-notion-images] NOTION_TOKEN not set. Skipping.");
  process.exit(0); // exit clean so build doesn't fail
}

const notion = new Client({ auth: TOKEN });

// Notion URL → file extension. Falls back to png if the URL is opaque.
function extFromUrl(url) {
  try {
    const p = new URL(url).pathname;
    const m = p.match(/\.([a-z0-9]{2,5})$/i);
    if (m) return m[1].toLowerCase();
  } catch {}
  return "png";
}

function notionImageFilename(blockId, ext) {
  return `notion-${blockId.replace(/-/g, "")}.${ext}`;
}

function readText(prop) {
  if (!prop) return "";
  const rt = prop.rich_text ?? prop.title ?? [];
  return rt.map((t) => t.plain_text ?? "").join("");
}

async function fetchAllBlocks(pageId) {
  const all = [];
  let cursor = undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });
    for (const b of res.results) if (isFullBlock(b)) all.push(b);
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return all;
}

async function downloadTo(url, destPath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.writeFile(destPath, buf);
  return buf.length;
}

async function main() {
  console.log("[sync-notion-images] Starting…");
  const res = await notion.dataSources.query({
    data_source_id: DATA_SOURCE_ID,
    filter: { property: "Status", select: { equals: "Published" } },
  });

  const studies = res.results.filter(isFullPage);
  console.log(`[sync-notion-images] ${studies.length} case studies`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const page of studies) {
    const slug = readText(page.properties.Slug);
    if (!slug) continue;

    const dir = path.join("public", "case-studies", slug);

    // ── Cover image (page property "Cover") ────────────────────────────────
    // Notion lets you set a Cover via the file-upload control or via
    // external URL. File-type covers have signed URLs that expire (~1 hr),
    // so we download them to /public/case-studies/[slug]/cover.[ext].
    const coverFile = page.properties.Cover?.files?.[0];
    if (coverFile?.file?.url) {
      await fs.mkdir(dir, { recursive: true });
      const url = coverFile.file.url;
      const ext = extFromUrl(url);
      const filename = `cover.${ext}`;
      const destPath = path.join(dir, filename);
      try {
        const bytes = await downloadTo(url, destPath);
        console.log(`  ${slug}/${filename}  ${(bytes / 1024).toFixed(1)} KB  [cover]`);
        downloaded++;
      } catch (err) {
        console.error(`  ${slug}/${filename}  FAILED [cover]: ${err.message}`);
        failed++;
      }
    }

    // ── Inline images (image blocks in the page body) ──────────────────────
    const blocks = await fetchAllBlocks(page.id);
    const images = blocks.filter(
      (b) => b.type === "image" && b.image.type === "file"
    );

    if (images.length === 0) continue;

    await fs.mkdir(dir, { recursive: true });

    for (const block of images) {
      const url = block.image.file.url;
      const ext = extFromUrl(url);
      const filename = notionImageFilename(block.id, ext);
      const destPath = path.join(dir, filename);

      try {
        const bytes = await downloadTo(url, destPath);
        console.log(`  ${slug}/${filename}  ${(bytes / 1024).toFixed(1)} KB`);
        downloaded++;
      } catch (err) {
        console.error(`  ${slug}/${filename}  FAILED: ${err.message}`);
        failed++;
      }
    }
  }

  console.log(
    `[sync-notion-images] Done. ${downloaded} downloaded, ${failed} failed.`
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[sync-notion-images] Fatal:", err);
  process.exit(1);
});
