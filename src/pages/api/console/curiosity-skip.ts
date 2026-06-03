// Auth-gated proxy: dismiss the current curiosity question without answering.
// Forwards to the M1 engine's POST /mix/curiosity/skip.

import type { APIRoute } from "astro";
import { skipCuriosity } from "../../../lib/console-api";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let payload: { insight_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const insightId =
    typeof payload.insight_id === "number" ? payload.insight_id : NaN;
  if (!Number.isFinite(insightId)) {
    return new Response(JSON.stringify({ error: "insight_id must be a number" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await skipCuriosity(insightId);
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
