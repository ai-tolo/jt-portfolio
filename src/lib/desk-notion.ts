// Notion read layer for The Desk surface.
// Reads the content plan from the Arcs DB + the current spine arc page body.
// Uses the same NOTION_TOKEN as the Diary surface and the build-time fetch.
//
// The two layers the Desk renders:
//   - On the Desk: the current + next calendar week, pulled from the spine
//     arc's 30-day calendar table. Concrete, near-term, Substack-first.
//   - The Spine: the arcs themselves (spine + planning + dormant) and the
//     beat outline. High-level, flexible, steerable.

import { Client } from "@notionhq/client";
import { readSavedState, type PieceStatus } from "./desk-state";

// Arcs database (data source) under Content Inbox in the Claude KB.
const ARCS_DATA_SOURCE = "8ca8c512-bb02-40d4-8afa-b88e08e8355d";

const TOKEN =
  (import.meta.env as Record<string, string | undefined>).NOTION_TOKEN ??
  process.env.NOTION_TOKEN;

if (!TOKEN) {
  throw new Error("NOTION_TOKEN is not set. Add it to .env at the project root.");
}

const notion = new Client({ auth: TOKEN });
// The data-source query surface is newer than the SDK's published types in
// some versions; access it loosely so the build doesn't depend on the exact
// typings. Runtime shape is verified.
const ds = (notion as any).dataSources;

export type Surface = "Substack" | "LinkedIn" | "IG" | "Portfolio" | "Kompoz";

export interface DeskArc {
  id: string;
  name: string;
  premise: string;
  status: string; // planning | spine | active | dormant | archived
  surfaces: string[];
  spineMonth: string | null;
  hookCount: number;
}

export interface DeskPiece {
  surface: Surface;
  lane: "Article" | "Notes" | "Post" | "Visual";
  text: string;
  draft?: string; // a saved draft body, persisted across reloads (Article lane)
  status?: PieceStatus; // undefined = not started; drafted = has a saved draft; shipped
}

export interface DeskWeek {
  label: string; // raw first cell, e.g. "1 (May 27 to Jun 2)"
  range: string; // the text inside the parens, e.g. "May 27 to Jun 2"
  beat: string; // e.g. "1. The chaos"
  current: boolean;
  pieces: DeskPiece[];
}

export interface DeskBeatHook {
  text: string;
  href: string | null;
}

export interface DeskBeat {
  title: string; // "Beat 1: The chaos..."
  premise: string;
  hooks: DeskBeatHook[];
  gap: boolean; // a beat with no hook ready yet
}

export interface DeskPlan {
  spine: DeskArc | null;
  otherArcs: DeskArc[];
  weeks: DeskWeek[];
  onTheDesk: DeskWeek[]; // current + next week
  beats: DeskBeat[];
  error: string | null;
}

function rich(arr: unknown): string {
  if (!Array.isArray(arr)) return "";
  return arr.map((r: any) => r?.plain_text ?? "").join("");
}

function firstHref(arr: unknown): string | null {
  if (!Array.isArray(arr)) return null;
  for (const r of arr as any[]) {
    if (r?.href) return r.href as string;
  }
  return null;
}

function mapArc(pg: any): DeskArc {
  const pr = pg.properties ?? {};
  return {
    id: pg.id,
    name: rich(pr.Name?.title),
    premise: rich(pr.Premise?.rich_text),
    status: pr.Status?.select?.name ?? "",
    surfaces: (pr.Surfaces?.multi_select ?? []).map((s: any) => s.name),
    spineMonth: pr["Spine Month"]?.date?.start ?? null,
    hookCount: (pr.Hooks?.relation ?? []).length,
  };
}

export async function getArcs(): Promise<DeskArc[]> {
  const res: any = await ds.query({ data_source_id: ARCS_DATA_SOURCE });
  return (res.results ?? []).map(mapArc);
}

// ── "Which week is now" helpers ────────────────────────────────────────────
const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Parse a week label like "1 (May 27 to Jun 2)" or "Spillover (Jun 24 to 30)".
// The right side may omit its month ("Jun 3 to 9"), inheriting the left month.
function parseWeekRange(label: string, year: number): { start: Date; end: Date } | null {
  const inner = label.match(/\(([^)]+)\)/)?.[1] ?? label;
  const parts = inner.split(/\s+to\s+/i);
  if (parts.length !== 2) return null;
  const left = parts[0].trim().split(/\s+/);
  const right = parts[1].trim().split(/\s+/);
  const lMon = MONTHS[(left[0] ?? "").slice(0, 3).toLowerCase()];
  const lDay = parseInt(left[1] ?? "", 10);
  let rMon: number | undefined;
  let rDay: number;
  if (right.length >= 2) {
    rMon = MONTHS[(right[0] ?? "").slice(0, 3).toLowerCase()];
    rDay = parseInt(right[1], 10);
  } else {
    rMon = lMon;
    rDay = parseInt(right[0], 10);
  }
  if (lMon == null || rMon == null || Number.isNaN(lDay) || Number.isNaN(rDay)) return null;
  const endYear = rMon < lMon ? year + 1 : year; // Dec→Jan rollover
  return {
    start: new Date(year, lMon, lDay, 0, 0, 0),
    end: new Date(endYear, rMon, rDay, 23, 59, 59),
  };
}

// Calendar columns → (surface, lane). Index 0 = Week, 1 = Beat.
const SURFACE_LANES: { idx: number; surface: Surface; lane: DeskPiece["lane"] }[] = [
  { idx: 2, surface: "Substack", lane: "Article" },
  { idx: 3, surface: "Substack", lane: "Notes" },
  { idx: 4, surface: "LinkedIn", lane: "Post" },
  { idx: 5, surface: "IG", lane: "Visual" },
];

function emptyCell(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t === "" || t === "(none)" || t === "(none planned)" || t === "—";
}

function listChildren(blockId: string): Promise<any> {
  return notion.blocks.children.list({ block_id: blockId, page_size: 100 });
}

async function parseSpineBody(spine: DeskArc): Promise<{ weeks: DeskWeek[]; beats: DeskBeat[] }> {
  const res = await listChildren(spine.id);
  const blocks: any[] = (res as any).results ?? [];
  const year = spine.spineMonth
    ? new Date(spine.spineMonth).getFullYear()
    : new Date().getFullYear();

  // ── Calendar table → weeks ──
  const weeks: DeskWeek[] = [];
  const table = blocks.find((b) => b.type === "table");
  if (table) {
    const rowsRes = await listChildren(table.id);
    const rows: any[] = ((rowsRes as any).results ?? []).filter((r: any) => r.type === "table_row");
    for (let i = 1; i < rows.length; i++) {
      const cells: string[] = rows[i].table_row.cells.map((c: any) => rich(c));
      const label = cells[0] ?? "";
      const pieces: DeskPiece[] = [];
      for (const sl of SURFACE_LANES) {
        const text = cells[sl.idx] ?? "";
        if (!emptyCell(text)) pieces.push({ surface: sl.surface, lane: sl.lane, text: text.trim() });
      }
      weeks.push({
        label,
        range: label.match(/\(([^)]+)\)/)?.[1] ?? label,
        beat: cells[1] ?? "",
        current: false,
        pieces,
      });
    }
    const today = new Date();
    let marked = false;
    for (const w of weeks) {
      const r = parseWeekRange(w.label, year);
      if (r && today >= r.start && today <= r.end) {
        w.current = true;
        marked = true;
      }
    }
    if (!marked && weeks.length) weeks[0].current = true;
  }

  // ── Beat sections → beats ──
  const beats: DeskBeat[] = [];
  let cur: DeskBeat | null = null;
  let inHooks = false;
  for (const b of blocks) {
    if (b.type === "heading_3") {
      const t = rich(b.heading_3.rich_text);
      if (/^beat\b/i.test(t)) {
        cur = { title: t, premise: "", hooks: [], gap: false };
        beats.push(cur);
        inHooks = false;
      }
      continue;
    }
    if (b.type === "heading_2") {
      cur = null;
      inHooks = false;
      continue;
    }
    if (!cur) continue;
    if (b.type === "paragraph") {
      const t = rich(b.paragraph.rich_text);
      if (/^hooks ready/i.test(t)) {
        inHooks = true;
        if (/gap/i.test(t)) cur.gap = true;
      } else if (!inHooks && t.trim() && !cur.premise) {
        cur.premise = t.trim();
      }
    } else if (b.type === "bulleted_list_item") {
      const t = rich(b.bulleted_list_item.rich_text);
      if (t.trim()) cur.hooks.push({ text: t.trim(), href: firstHref(b.bulleted_list_item.rich_text) });
    }
  }
  for (const bt of beats) if (bt.hooks.length === 0) bt.gap = true;

  return { weeks, beats };
}

function pickOnTheDesk(weeks: DeskWeek[]): DeskWeek[] {
  if (!weeks.length) return [];
  const idx = weeks.findIndex((w) => w.current);
  const start = idx >= 0 ? idx : 0;
  return weeks.slice(start, start + 2);
}

export async function getDeskPlan(): Promise<DeskPlan> {
  let arcs: DeskArc[];
  try {
    arcs = await getArcs();
  } catch (e) {
    return {
      spine: null, otherArcs: [], weeks: [], onTheDesk: [], beats: [],
      error: e instanceof Error ? e.message : "arcs fetch failed",
    };
  }

  const spine = arcs.find((a) => a.status === "spine") ?? null;
  const ORDER: Record<string, number> = { spine: 0, active: 1, planning: 2, dormant: 3, archived: 9 };
  const otherArcs = arcs
    .filter((a) => a.id !== spine?.id && a.status !== "archived")
    .sort((a, b) => (ORDER[a.status] ?? 5) - (ORDER[b.status] ?? 5));

  let weeks: DeskWeek[] = [];
  let beats: DeskBeat[] = [];
  if (spine) {
    try {
      const parsed = await parseSpineBody(spine);
      weeks = parsed.weeks;
      beats = parsed.beats;
    } catch (e) {
      return {
        spine, otherArcs, weeks: [], onTheDesk: [], beats: [],
        error: e instanceof Error ? e.message : "spine parse failed",
      };
    }
  }

  let onTheDesk = pickOnTheDesk(weeks);
  // Prefer a saved (tuned) plan for the current week if one exists; a stale
  // save (week has since advanced) is ignored and the arc default is used.
  // Note: the weekKey === currentKey gate means a saved draft intentionally
  // resets when the week rolls over (it belongs to that week's pieces).
  try {
    const saved = await readSavedState();
    const currentKey = onTheDesk[0]?.range ?? null;
    if (saved && saved.weeks?.length && saved.weekKey && currentKey && saved.weekKey === currentKey) {
      onTheDesk = saved.weeks.map((w) => ({
        label: w.when ?? "",
        range: w.range ?? "",
        beat: w.beat ?? "",
        current: /this week/i.test(w.when ?? ""),
        pieces: (w.pieces ?? []).map((p) => ({
          surface: p.surface as Surface,
          lane: p.lane as DeskPiece["lane"],
          text: p.text,
          draft: p.draft,
          status: p.status,
        })),
      }));
    }
  } catch {
    /* fall back to the arc-derived plan */
  }
  return { spine, otherArcs, weeks, onTheDesk, beats, error: null };
}
