// Auth-gated proxy: promote a bucket=loop asset into Live's browser.
// Calls promoteToLive() which proxies to M1 /buckets/promote-to-live.
// Pipeline (M1-side): copy source -> normalize loudness to -14 LUFS ->
// write to ~/Library/Mobile Documents/com~apple~CloudDocs/_Soundbending/loops/
// -> update assets.live_loop_path. Auth enforced upstream by middleware.

import type { APIRoute } from "astro";
import { promoteToLive } from "../../../lib/console-api";

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
  const assetId = typeof payload.asset_id === "number" ? payload.asset_id : NaN;
  if (!Number.isFinite(assetId)) {
    return new Response(JSON.stringify({ error: "asset_id must be a number" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const result = await promoteToLive(assetId);
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
