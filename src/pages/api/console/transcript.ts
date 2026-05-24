// Auth-gated proxy: GET /buckets/transcript?asset_id=N.
// Returns the on-disk mlx-whisper transcript (plain text + timestamped
// segments) for any transcribed asset. Backs the "show transcript"
// disclosure in BucketCard's expanded panel.

import type { APIRoute } from "astro";
import { getTranscript } from "../../../lib/console-api";

export const GET: APIRoute = async ({ url }) => {
  const raw = url.searchParams.get("asset_id");
  const assetId = raw ? Number(raw) : NaN;
  if (!Number.isFinite(assetId)) {
    return new Response(JSON.stringify({ error: "asset_id must be a number" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await getTranscript(assetId);
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
