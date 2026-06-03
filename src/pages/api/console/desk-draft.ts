// Draft a single post on request. Auth-gated by middleware. Starts a streamed
// `claude` run on the M1 engine and returns a job_id the browser polls via
// /api/console/desk-job (so the draft appears as it is written).
import type { APIRoute } from "astro";
import { buildDraftPrompt } from "../../../lib/desk-tune";
import { deskStartJob } from "../../../lib/console-api";

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

  const { prompt, model, kind } = buildDraftPrompt(
    { surface: String(piece.surface || ""), lane: String(piece.lane || ""), text: String(piece.text || "").slice(0, 600) },
    { beat: String(ctx.beat || ""), when: String(ctx.when || "") },
  );
  const res = await deskStartJob(prompt, model, kind);
  if (res.ok) return json({ job_id: res.data.job_id, kind: res.data.kind }, 200);

  if (res.error.kind === "unreachable") return json({ error: "m1-unreachable" }, 503);
  if (res.error.kind === "http" && res.error.status === 503) return json({ error: "claude-unavailable-here" }, 503);
  return json({ error: res.error.message || "draft failed to start" }, 502);
};
