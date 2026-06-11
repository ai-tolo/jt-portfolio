// Auth-gated proxy: the next pathway round the Engineer wants judged (or a
// thinking/none status). The page polls this; the orchestrator runs on M1 and
// the engine GET returns immediately, so a short timeout is fine.

import type { APIRoute } from "astro";
import { getMixRound } from "../../../lib/console-api";

export const prerender = false;

export const GET: APIRoute = async () => {
  const result = await getMixRound({ timeoutMs: 8000 });
  if (!result.ok) {
    // Never 500 the surface: if the engine is asleep/unreachable, report a soft
    // "none" so the round card just stays quiet (mirrors curiosity.ts).
    if (result.error.kind === "unreachable") {
      return new Response(
        JSON.stringify({ status: "none", round: null, detail: "m1-unreachable" }),
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
