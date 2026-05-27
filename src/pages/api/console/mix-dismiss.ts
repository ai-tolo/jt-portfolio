// Auth-gated proxy: soft-hide a mix job from the Winners surface.
// Sets mix_jobs.dismissed_at via the engine. Variants + judgements +
// king pick stay intact for the planner's training signal.

import type { APIRoute } from "astro";
import { dismissMixJob } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { job_id?: unknown; dismissed?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const jobId = typeof payload.job_id === "number" ? payload.job_id : NaN;
  if (!Number.isFinite(jobId)) {
    return new Response(
      JSON.stringify({ error: "job_id must be a number" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const dismissed =
    typeof payload.dismissed === "boolean" ? payload.dismissed : true;

  const result = await dismissMixJob(jobId, dismissed);
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
