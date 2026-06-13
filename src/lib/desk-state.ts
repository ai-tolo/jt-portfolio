// Read/write the saved On-the-Desk plan to the Desk State Notion page, so a
// tune persists across reloads and shows on the deployed view. Server-only.
import { Client } from "@notionhq/client";

const DESK_STATE_PAGE = "374ed8d4-704f-81d7-985f-f564df0852dd";

const TOKEN =
  (import.meta.env as Record<string, string | undefined>).NOTION_TOKEN ?? process.env.NOTION_TOKEN;

const notion = new Client({ auth: TOKEN });

export type PieceStatus = "drafting" | "drafted" | "shipped";
export interface SavedPiece { surface: string; lane: string; text: string; draft?: string; status?: PieceStatus }
export interface SavedWeek { when: string; range: string; beat: string; pieces: SavedPiece[] }
export interface SavedDeskState {
  weekKey: string | null; // the current week's range, so a stale save is ignored
  weeks: SavedWeek[];
  savedAt: string | null;
}

function rich(arr: unknown): string {
  if (!Array.isArray(arr)) return "";
  return (arr as any[]).map((r) => r?.plain_text ?? "").join("");
}

async function findCodeBlock(): Promise<{ id: string; text: string } | null> {
  const res: any = await notion.blocks.children.list({ block_id: DESK_STATE_PAGE, page_size: 50 });
  for (const b of res.results) {
    if (b.type === "code") return { id: b.id, text: rich(b.code?.rich_text) };
  }
  return null;
}

export async function readSavedState(): Promise<SavedDeskState | null> {
  try {
    const block = await findCodeBlock();
    if (!block || !block.text.trim()) return null;
    const parsed = JSON.parse(block.text);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      weekKey: parsed.weekKey ?? null,
      weeks: Array.isArray(parsed.weeks) ? parsed.weeks : [],
      savedAt: parsed.savedAt ?? null,
    };
  } catch {
    return null;
  }
}

// Notion caps a single rich_text item at 2000 chars; chunk to be safe.
function chunk(s: string, n = 1900): { type: "text"; text: { content: string } }[] {
  const out: { type: "text"; text: { content: string } }[] = [];
  for (let i = 0; i < s.length; i += n) out.push({ type: "text", text: { content: s.slice(i, i + n) } });
  return out.length ? out : [{ type: "text", text: { content: "" } }];
}

export async function writeSavedState(state: SavedDeskState): Promise<void> {
  const rich_text = chunk(JSON.stringify(state));
  const block = await findCodeBlock();
  if (block) {
    await notion.blocks.update({ block_id: block.id, code: { rich_text } } as any);
  } else {
    await notion.blocks.children.append({
      block_id: DESK_STATE_PAGE,
      children: [{ object: "block", type: "code", code: { language: "json", rich_text } } as any],
    });
  }
}

export async function clearSavedState(): Promise<void> {
  await writeSavedState({ weekKey: null, weeks: [], savedAt: null });
}
