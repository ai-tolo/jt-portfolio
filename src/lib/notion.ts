// Notion fetch layer. Pulls published case studies + their block content at
// build time. The data-source ID is hard-coded because there is exactly one
// Case Studies database. NOTION_TOKEN comes from .env via Vite/Astro at
// build time (read via process.env so it works in Node static-generation).

import { Client, isFullPage, isFullBlock } from "@notionhq/client";
import type {
  PageObjectResponse,
  BlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

const DATA_SOURCE_ID = "e3863918-725e-4a5b-8968-ff133155c443";

// Astro exposes .env via import.meta.env (dev + build). process.env is the
// fallback for environments that only populate Node globals (e.g. CI runners).
const TOKEN =
  (import.meta.env as Record<string, string | undefined>).NOTION_TOKEN ??
  process.env.NOTION_TOKEN;

if (!TOKEN) {
  throw new Error(
    "NOTION_TOKEN is not set. Add it to .env at the project root."
  );
}

const notion = new Client({ auth: TOKEN });

export interface CaseStudyMeta {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  outcome: string;
  role: string;
  timeline: string;
  order: number;
  tags: string[];
  tools: string[];
  cover: string | null;
}

export interface CaseStudy extends CaseStudyMeta {
  blocks: BlockObjectResponse[];
}

// Read concatenated plain_text out of a Notion rich_text / title array.
function readRichText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as Record<string, unknown>;
  const rt = (p.rich_text ?? p.title) as Array<{ plain_text?: string }> | undefined;
  if (!rt) return "";
  return rt.map((t) => t.plain_text ?? "").join("");
}

function normalizePage(page: PageObjectResponse): CaseStudyMeta {
  // Notion's TS types for properties are a discriminated union; the `any`
  // here keeps the access concise. Each property is read defensively.
  const p = page.properties as Record<string, any>;
  return {
    id: page.id,
    slug: readRichText(p.Slug),
    name: readRichText(p.Name),
    subtitle: readRichText(p.Subtitle),
    outcome: readRichText(p.Outcome),
    role: readRichText(p.Role),
    timeline: readRichText(p.Timeline),
    order: typeof p.Order?.number === "number" ? p.Order.number : 999,
    tags: Array.isArray(p.Tags?.multi_select)
      ? p.Tags.multi_select.map((t: { name: string }) => t.name)
      : [],
    tools: Array.isArray(p.Tools?.multi_select)
      ? p.Tools.multi_select.map((t: { name: string }) => t.name)
      : [],
    cover:
      p.Cover?.files?.[0]?.file?.url ??
      p.Cover?.files?.[0]?.external?.url ??
      null,
  };
}

export async function getCaseStudies(): Promise<CaseStudyMeta[]> {
  const res = await notion.dataSources.query({
    data_source_id: DATA_SOURCE_ID,
    filter: { property: "Status", select: { equals: "Published" } },
    sorts: [{ property: "Order", direction: "ascending" }],
  });
  return res.results.filter(isFullPage).map(normalizePage);
}

async function getAllBlocks(pageId: string): Promise<BlockObjectResponse[]> {
  const all: BlockObjectResponse[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });
    for (const b of res.results) {
      if (isFullBlock(b)) all.push(b);
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return all;
}

export async function getCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  const all = await getCaseStudies();
  const meta = all.find((c) => c.slug === slug);
  if (!meta) return null;
  const blocks = await getAllBlocks(meta.id);
  return { ...meta, blocks };
}
