// Auth-gated proxy: enqueue a mix job for an asset. Calls createMixJob()
// which forwards to the M1 engine's POST /mix/jobs/create. The engine
// inserts a mix_jobs row in 'pending' status; the engineer-worker daemon
// on M1 picks it up on its next 30s poll.
//
// Phase 2: optional retry_axis + feedback_text + parent_job_id let the
// curator queue a focused retry that responds to free-text feedback.

import type { APIRoute } from "astro";
import { createMixJob } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: {
    source_asset_id?: unknown;
    retry_axis?: unknown;
    feedback_text?: unknown;
    parent_job_id?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const assetId =
    typeof payload.source_asset_id === "number" ? payload.source_asset_id : NaN;
  if (!Number.isFinite(assetId)) {
    return new Response(
      JSON.stringify({ error: "source_asset_id must be a number" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const retryAxis =
    typeof payload.retry_axis === "string" && payload.retry_axis
      ? payload.retry_axis
      : null;
  const feedbackText =
    typeof payload.feedback_text === "string" && payload.feedback_text
      ? payload.feedback_text
      : null;
  const parentJobId =
    typeof payload.parent_job_id === "number" ? payload.parent_job_id : null;

  const result = await createMixJob(assetId, {
    retry_axis: retryAxis,
    feedback_text: feedbackText,
    parent_job_id: parentJobId,
  });
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
