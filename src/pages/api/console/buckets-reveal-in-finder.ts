// Auth-gated proxy: reveal a Bucket asset's file in Finder on M3. Forwards to
// the engine's /buckets/reveal-in-finder (path rewrite → M3 file-server /reveal,
// `open -R`). A non-200 means the bytes aren't reachable on M3 (iCloud/T7 not
// materialized) — the card surfaces the error inline. Auth enforced upstream by
// middleware.

import type { APIRoute } from "astro";
import { revealInFinder } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { asset_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const id = typeof payload.asset_id === "number" ? payload.asset_id : NaN;
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: "asset_id (number) required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await revealInFinder(id);
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
