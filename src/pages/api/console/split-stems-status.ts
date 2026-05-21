// Auth-gated proxy: poll a Demucs stem-splitting job's status by job_id.
// Forwards to the M1 engine's GET /buckets/split-stems/{job_id}. The UI
// hits this every 5s while a split is running; on status='done' the
// engine returns the new stem_asset_ids (already inserted into the
// assets table with parent_id pointing back to the source row).
//
// Auth enforced upstream by middleware.

import type { APIRoute } from "astro";
import { getSplitStemsStatus } from "../../../lib/console-api";

export const GET: APIRoute = async ({ url }) => {
  const raw = url.searchParams.get("job_id") ?? "";
  const jobId = Number(raw);
  if (!Number.isFinite(jobId) || jobId <= 0 || !Number.isInteger(jobId)) {
    return new Response(JSON.stringify({ error: "job_id query param required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const result = await getSplitStemsStatus(jobId);
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
