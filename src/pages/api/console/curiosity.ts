// Auth-gated proxy: the Engineer's current open curiosity question (or a
// synthesizing/none status). The page polls this until status is ready|none.
// Synthesis runs claude -p on M1; the engine GET returns immediately, so a
// short timeout is fine.

import type { APIRoute } from "astro";
import { getCuriosity } from "../../../lib/console-api";

export const prerender = false;

export const GET: APIRoute = async () => {
  const result = await getCuriosity({ timeoutMs: 8000 });
  if (!result.ok) {
    // Don't 500 the page surface — report a soft "none" so the card just stays
    // quiet when the engine is asleep/unreachable.
    if (result.error.kind === "unreachable") {
      return new Response(
        JSON.stringify({ status: "none", insight: null, detail: "m1-unreachable" }),
        { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } },
      );
    }
    const code = result.error.kind === "http" ? result.error.status : 502;
    return new Response(JSON.stringify({ error: result.error }), {
      status: code,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result.data), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
