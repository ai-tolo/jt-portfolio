// Auth-gated proxy: skip the current round without voting. The next /mix/round
// GET surfaces a different comparison. Mirrors curiosity-skip.ts.

import type { APIRoute } from "astro";
import { skipMixRound } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { round_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const roundId =
    typeof payload.round_id === "string" && payload.round_id.trim()
      ? payload.round_id
      : null;
  if (!roundId) {
    return new Response(JSON.stringify({ error: "round_id required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await skipMixRound(roundId);
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
