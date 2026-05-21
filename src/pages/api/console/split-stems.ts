// Auth-gated proxy: kick off a Demucs stem-splitting job for an asset.
// Calls splitStems() which proxies to the M1 engine's POST /buckets/
// split-stems. Engine spawns scripts/split_stems.py via subprocess.Popen
// (fire-and-forget) and returns a job_id immediately; the UI then polls
// /buckets/split-stems/{job_id} every 5s to track progress.
//
// Modes: "2" → vocals + instrumental; "4" → drums + bass + vocals + other.
// Auth enforced upstream by middleware.

import type { APIRoute } from "astro";
import { splitStems } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { asset_id?: unknown; mode?: unknown };
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
  const mode = payload.mode === "2" || payload.mode === "4" ? payload.mode : null;
  if (!mode) {
    return new Response(JSON.stringify({ error: 'mode must be "2" or "4"' }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const result = await splitStems(assetId, mode);
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
