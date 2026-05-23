// Auth-gated proxy: withdraw a recent mix judgement. Forwards to the
// engine's POST /mix/judgement/{id}/withdraw which hard-deletes the row.
// The Engineer UI exposes this via Cmd/Ctrl+Z within 5 seconds of a vote
// landing — gives the curator a graceful out for accidental commits.

import type { APIRoute } from "astro";
import { withdrawMixJudgement } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { judgement_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const id = typeof payload.judgement_id === "number" ? payload.judgement_id : NaN;
  if (!Number.isFinite(id)) {
    return new Response(
      JSON.stringify({ error: "judgement_id must be a number" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const result = await withdrawMixJudgement(id);
  if (!result.ok) {
    const status = result.error.kind === "http" ? result.error.status : 502;
    return new Response(JSON.stringify({ error: result.error }), {
      status,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result.data), {
    headers: { "content-type": "application/json" },
  });
};
