// Notion read/write layer for The Diary surface.
// Reads from and appends to Jon's Thoughts / Lyrics page in the Claude KB.
// Uses the same NOTION_TOKEN as the build-time case-studies fetch.

import { Client, isFullBlock } from "@notionhq/client";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

// Thoughts / Lyrics page under the Claude KB tree.
const DIARY_PAGE_ID = "361ed8d4-704f-8096-ae6a-d6a31f05d2dc";

const TOKEN =
  (import.meta.env as Record<string, string | undefined>).NOTION_TOKEN ??
  process.env.NOTION_TOKEN;

if (!TOKEN) {
  throw new Error("NOTION_TOKEN is not set. Add it to .env at the project root.");
}

const notion = new Client({ auth: TOKEN });

export interface DiaryEntry {
  id: string;
  text: string;
  createdAt: string;
}

function readBlockText(block: BlockObjectResponse): string {
  const t = (block as any).type;
  const data = (block as any)[t];
  const rt = data?.rich_text;
  if (!Array.isArray(rt)) return "";
  return rt.map((r: { plain_text?: string }) => r.plain_text ?? "").join("");
}

export async function getRecentEntries(limit = 25): Promise<DiaryEntry[]> {
  const all: BlockObjectResponse[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: DIARY_PAGE_ID,
      start_cursor: cursor,
    });
    for (const b of res.results) {
      if (isFullBlock(b)) all.push(b);
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  const withText = all
    .map((b) => ({
      id: b.id,
      text: readBlockText(b),
      createdAt: b.created_time,
    }))
    .filter((e) => e.text.trim().length > 0);

  return withText.reverse().slice(0, limit);
}

export async function appendEntry(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  await notion.blocks.children.append({
    block_id: DIARY_PAGE_ID,
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: trimmed },
            },
          ],
        },
      },
    ],
  });
}
