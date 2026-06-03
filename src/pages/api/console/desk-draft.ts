// Draft a single post on request. Auth-gated by middleware. Runs Claude locally.
import type { APIRoute } from "astro";
import { draftPost } from "../../../lib/desk-tune";

export const prerender = false;

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
  const piece = body?.piece;
  const ctx = body?.ctx || {};
  if (!piece || !piece.text) return json({ error: "nothing to draft" }, 400);

  try {
    const draft = await draftPost(
      { surface: String(piece.surface || ""), lane: String(piece.lane || ""), text: String(piece.text || "").slice(0, 600) },
      { beat: String(ctx.beat || ""), when: String(ctx.when || "") }
    );
    return json({ draft });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "draft failed";
    if (/binary not found|ENOENT/i.test(msg)) return json({ error: "claude-unavailable-here" }, 503);
    if (/not logged in|\/login/i.test(msg)) return json({ error: "claude-not-logged-in" }, 503);
    return json({ error: msg }, 500);
  }
};
