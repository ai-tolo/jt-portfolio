// Zero-effort capture from the Desk. Appends a seed to the Idea Compost page
// in the Claude KB (the existing raw-idea inbox). Auth-gated by middleware.
import type { APIRoute } from "astro";
import { Client } from "@notionhq/client";

export const prerender = false;

const TOKEN =
  (import.meta.env as Record<string, string | undefined>).NOTION_TOKEN ?? process.env.NOTION_TOKEN;

// Idea Compost: "raw seeds, no gate, one toggle per seed."
const IDEA_COMPOST = "360ed8d4704f811092cbcfd0669eda9e";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const text = String(body?.text ?? "").replace(/—/g, ", ").trim().slice(0, 2000);
  if (!text) return json({ error: "say something first" }, 400);
  // Optional provenance label (e.g. "from the Figma cover note"); defaults to
  // the Desk so the existing web capture bar is unaffected.
  const source = (String(body?.source ?? "").replace(/—/g, ", ").trim().slice(0, 200)) || "captured from the Desk";
  if (!TOKEN) return json({ error: "NOTION_TOKEN not set" }, 500);

  try {
    const notion = new Client({ auth: TOKEN });
    await notion.blocks.children.append({
      block_id: IDEA_COMPOST,
      children: [
        {
          object: "block",
          type: "toggle",
          toggle: {
            rich_text: [{ type: "text", text: { content: text } }],
            children: [
              {
                object: "block",
                type: "paragraph",
                paragraph: { rich_text: [{ type: "text", text: { content: source } }] },
              },
            ],
          },
        },
      ],
    });
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "capture failed" }, 500);
  }
};
