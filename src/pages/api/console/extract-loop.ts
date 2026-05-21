// Auth-gated proxy: extract a [start, end] region of a source asset into
// a new loop row. Calls extractLoop() which proxies to the M1 engine's
// POST /buckets/extract-loop. Engine-side (Stream A): ffmpeg -ss start
// -to end -af loudnorm=I=-16 -c:a pcm_s16le → _Soundbending/loops/
// extracted/<source_stem>_<start>-<end>s.wav + INSERT new assets row with
// parent_id=<source>, category='extracted-from-jam', bucket='loops'.
//
// Auth enforced upstream by middleware. The endpoint is permissive on
// label since the engine can default it; we forward whatever the UI sends.

import type { APIRoute } from "astro";
import { extractLoop } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { asset_id?: unknown; start_sec?: unknown; end_sec?: unknown; label?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const assetId = typeof payload.asset_id === "number" ? payload.asset_id : NaN;
  const startSec = typeof payload.start_sec === "number" ? payload.start_sec : NaN;
  const endSec = typeof payload.end_sec === "number" ? payload.end_sec : NaN;
  if (!Number.isFinite(assetId)) {
    return new Response(JSON.stringify({ error: "asset_id must be a number" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || startSec >= endSec) {
    return new Response(
      JSON.stringify({ error: "start_sec / end_sec must be numbers with start < end" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const label = typeof payload.label === "string" ? payload.label : undefined;

  const result = await extractLoop(assetId, startSec, endSec, label);
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
