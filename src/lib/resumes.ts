// Resume fetch layer. Reads the Resumes database in Notion, parses each row's
// Notion block content into a structured Resume AST, and exposes it for the
// /resume route and /resume/[slug] route.

import { Client, isFullPage, isFullBlock } from "@notionhq/client";
import type {
  PageObjectResponse,
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

const DATA_SOURCE_ID = "392b81d4-9427-4e35-8375-0be9d353a8bb";

const TOKEN =
  (import.meta.env as Record<string, string | undefined>).NOTION_TOKEN ??
  process.env.NOTION_TOKEN;

if (!TOKEN) {
  throw new Error("NOTION_TOKEN is not set.");
}

const notion = new Client({ auth: TOKEN });

export interface ResumeMeta {
  id: string;
  slug: string;
  name: string;
  tailoredFor: string | null;
  isDefault: boolean;
}

export interface ResumeAST extends ResumeMeta {
  header: {
    name: string;
    title: string;
    contact: string[];
  };
  preamble: string[]; // tailored-for callout text lines
  sections: ResumeSection[];
}

export type ResumeSection =
  | { kind: "summary"; title: string; paragraphs: RichTextItemResponse[][] }
  | { kind: "experience"; title: string; roles: Role[] }
  | { kind: "education"; title: string; schools: School[] }
  | { kind: "tools"; title: string; groups: ToolGroup[] }
  | { kind: "outside"; title: string; paragraphs: RichTextItemResponse[][] }
  | { kind: "generic"; title: string; blocks: BlockObjectResponse[] };

export interface Role {
  company: string;
  location?: string;
  title: string;
  dates: string;
  bullets: RichTextItemResponse[][];
}

export interface School {
  institution: string;
  location?: string;
  degree: string;
  dates: string;
  honors?: string;
}

export interface ToolGroup {
  category: string;
  items: string[];
}

// ─── Database queries ────────────────────────────────────────────────────────

function readText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as Record<string, unknown>;
  const rt = (p.rich_text ?? p.title) as
    | Array<{ plain_text?: string }>
    | undefined;
  return rt?.map((t) => t.plain_text ?? "").join("") ?? "";
}

function normalizeMeta(page: PageObjectResponse): ResumeMeta {
  const p = page.properties as Record<string, any>;
  return {
    id: page.id,
    slug: readText(p.Slug),
    name: readText(p.Name),
    tailoredFor: readText(p["Tailored For"]) || null,
    isDefault: p["Is Default"]?.checkbox === true,
  };
}

export async function getResumes(): Promise<ResumeMeta[]> {
  const res = await notion.dataSources.query({
    data_source_id: DATA_SOURCE_ID,
    filter: { property: "Status", select: { equals: "Active" } },
    sorts: [{ property: "Order", direction: "ascending" }],
  });
  return res.results.filter(isFullPage).map(normalizeMeta);
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

// ─── Parser ──────────────────────────────────────────────────────────────────

function plain(rt: RichTextItemResponse[]): string {
  return rt.map((t) => t.plain_text).join("");
}

function richOf(b: BlockObjectResponse): RichTextItemResponse[] {
  const x = b as any;
  return x[b.type]?.rich_text ?? [];
}

function isAllItalic(rt: RichTextItemResponse[]): boolean {
  return rt.length > 0 && rt.every((t) => t.annotations.italic);
}

function isAllBold(rt: RichTextItemResponse[]): boolean {
  return rt.length > 0 && rt.every((t) => t.annotations.bold);
}

function classifySection(title: string): ResumeSection["kind"] {
  const t = title.toLowerCase().trim();
  if (t === "summary") return "summary";
  if (t === "experience" || t.includes("professional experience")) return "experience";
  if (t === "education") return "education";
  if (t === "tools" || t === "toolbox" || t === "additional information" || t === "skills") return "tools";
  if (t === "outside" || t === "interests") return "outside";
  return "generic";
}

// Split a date/role line "Role · Dates" or "Role | Dates" into parts.
function splitRoleLine(s: string): { role: string; dates: string } {
  // Try " · ", " | ", " — ", " - "
  const seps = [" · ", " | ", " — ", " - "];
  for (const sep of seps) {
    const idx = s.lastIndexOf(sep);
    if (idx > 0) {
      return { role: s.slice(0, idx).trim(), dates: s.slice(idx + sep.length).trim() };
    }
  }
  return { role: s, dates: "" };
}

// Split institution line "Institution — Location" into parts.
function splitInstitutionLine(s: string): { institution: string; location?: string } {
  const m = s.match(/^(.*?)\s+[—–-]\s+(.+)$/);
  if (m) return { institution: m[1].trim(), location: m[2].trim() };
  return { institution: s };
}

// Walk blocks and build the structured AST.
function parseResume(meta: ResumeMeta, blocks: BlockObjectResponse[]): ResumeAST {
  // Default display name. Notion strips H1 from content when the page lives in
  // a database (the row's title property takes that slot), so we hardcode the
  // resume display name here and only override if an explicit H1 exists.
  let name = "Jonathan Tollefson";
  let title = "";
  const contact: string[] = [];
  const preamble: string[] = [];
  const sections: ResumeSection[] = [];

  let i = 0;

  // Top callouts (quote blocks) before content → preamble
  while (i < blocks.length && blocks[i].type === "quote") {
    preamble.push(plain((blocks[i] as any).quote.rich_text));
    i++;
  }

  // Optional H1 = name override (most variants won't have one)
  if (i < blocks.length && blocks[i].type === "heading_1") {
    name = plain((blocks[i] as any).heading_1.rich_text) || name;
    i++;
  }

  // Next bold paragraph = title; next plain paragraph = contact
  // Walk until we hit the first H2.
  while (i < blocks.length && blocks[i].type !== "heading_2") {
    const b = blocks[i];
    if (b.type === "paragraph") {
      const rt = b.paragraph.rich_text;
      if (rt.length > 0) {
        if (!title && isAllBold(rt)) {
          title = plain(rt);
        } else if (contact.length === 0) {
          // Split contact line by · or • or |
          contact.push(
            ...plain(rt)
              .split(/\s*[·•|]\s*/)
              .map((s) => s.trim())
              .filter(Boolean)
          );
        }
      }
    }
    i++;
  }

  // Now iterate sections
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type !== "heading_2") {
      i++;
      continue;
    }

    const sectionTitle = plain(b.heading_2.rich_text);
    const kind = classifySection(sectionTitle);
    i++;

    // Collect blocks until next H2
    const sectionBlocks: BlockObjectResponse[] = [];
    while (i < blocks.length && blocks[i].type !== "heading_2") {
      sectionBlocks.push(blocks[i]);
      i++;
    }

    sections.push(buildSection(kind, sectionTitle, sectionBlocks));
  }

  return {
    ...meta,
    header: { name, title, contact },
    preamble,
    sections,
  };
}

function buildSection(
  kind: ResumeSection["kind"],
  title: string,
  blocks: BlockObjectResponse[]
): ResumeSection {
  if (kind === "summary" || kind === "outside") {
    const paragraphs: RichTextItemResponse[][] = [];
    for (const b of blocks) {
      if (b.type === "paragraph" && b.paragraph.rich_text.length > 0) {
        paragraphs.push(b.paragraph.rich_text);
      }
    }
    return { kind, title, paragraphs };
  }

  if (kind === "experience") {
    const roles: Role[] = [];
    let current: Role | null = null;
    for (const b of blocks) {
      if (b.type === "heading_3") {
        if (current) roles.push(current);
        const companyLine = plain(b.heading_3.rich_text);
        const splitInst = splitInstitutionLine(companyLine);
        current = {
          company: splitInst.institution,
          location: splitInst.location,
          title: "",
          dates: "",
          bullets: [],
        };
      } else if (b.type === "paragraph") {
        const rt = b.paragraph.rich_text;
        if (current && rt.length > 0 && isAllItalic(rt)) {
          const { role, dates } = splitRoleLine(plain(rt));
          current.title = role;
          current.dates = dates;
        }
      } else if (b.type === "bulleted_list_item") {
        if (current) current.bullets.push(b.bulleted_list_item.rich_text);
      }
    }
    if (current) roles.push(current);
    return { kind, title, roles };
  }

  if (kind === "education") {
    const schools: School[] = [];
    let current: School | null = null;
    for (const b of blocks) {
      if (b.type === "heading_3") {
        if (current) schools.push(current);
        const line = plain(b.heading_3.rich_text);
        const split = splitInstitutionLine(line);
        current = {
          institution: split.institution,
          location: split.location,
          degree: "",
          dates: "",
        };
      } else if (b.type === "paragraph") {
        const rt = b.paragraph.rich_text;
        if (!current || rt.length === 0) continue;
        if (isAllItalic(rt)) {
          const { role, dates } = splitRoleLine(plain(rt));
          current.degree = role;
          current.dates = dates;
        } else {
          current.honors = (current.honors ? current.honors + " " : "") + plain(rt);
        }
      }
    }
    if (current) schools.push(current);
    return { kind, title, schools };
  }

  if (kind === "tools") {
    const groups: ToolGroup[] = [];
    for (const b of blocks) {
      if (b.type === "paragraph") {
        const rt = b.paragraph.rich_text;
        if (rt.length === 0) continue;
        // Look for "**Category**: items" pattern
        const firstBold = rt[0];
        if (firstBold.annotations.bold) {
          const category = firstBold.plain_text.replace(/[:：]\s*$/, "");
          // Rest of text after the bold = items
          const rest = rt.slice(1).map((t) => t.plain_text).join("").replace(/^[:：]\s*/, "");
          const items = rest.split(/\s*,\s*/).filter(Boolean);
          groups.push({ category, items });
        }
      }
    }
    return { kind, title, groups };
  }

  return { kind: "generic", title, blocks };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getResumeBySlug(slug: string): Promise<ResumeAST | null> {
  const all = await getResumes();
  const meta = all.find((r) => r.slug === slug);
  if (!meta) return null;
  const blocks = await getAllBlocks(meta.id);
  return parseResume(meta, blocks);
}

export async function getDefaultResume(): Promise<ResumeAST | null> {
  const all = await getResumes();
  const meta = all.find((r) => r.isDefault) ?? all[0];
  if (!meta) return null;
  const blocks = await getAllBlocks(meta.id);
  return parseResume(meta, blocks);
}
