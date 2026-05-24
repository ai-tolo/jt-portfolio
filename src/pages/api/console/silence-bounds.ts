// Auth-gated proxy: GET /buckets/silence-bounds?asset_id=N.
// Runs ffmpeg silencedetect on the source file and returns the inner
// non-silent range. Powers the "↹ Trim to content" button in the crop tab.

import type { APIRoute } from "astro";
import { getSilenceBounds } from "../../../lib/console-api";

export const GET: APIRoute = async ({ url }) => {
  const raw = url.searchParams.get("asset_id");
  const assetId = raw ? Number(raw) : NaN;
  if (!Number.isFinite(assetId)) {
    return new Response(JSON.stringify({ error: "asset_id must be a number" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await getSilenceBounds(assetId);
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
