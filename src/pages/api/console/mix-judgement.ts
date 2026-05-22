// Auth-gated proxy: record an A/B judgement. Calls postMixJudgement()
// which forwards to the M1 engine's POST /mix/judgement.

import type { APIRoute } from "astro";
import { postMixJudgement } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: {
    job_id?: unknown;
    variant_a_id?: unknown;
    variant_b_id?: unknown;
    chosen_variant_id?: unknown;
    axis?: unknown;
    comment?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const jobId = typeof payload.job_id === "number" ? payload.job_id : NaN;
  const aId =
    typeof payload.variant_a_id === "number" ? payload.variant_a_id : NaN;
  const bId =
    typeof payload.variant_b_id === "number" ? payload.variant_b_id : NaN;
  if (![jobId, aId, bId].every(Number.isFinite)) {
    return new Response(
      JSON.stringify({
        error: "job_id, variant_a_id, variant_b_id must be numbers",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const chosen =
    payload.chosen_variant_id === null
      ? null
      : typeof payload.chosen_variant_id === "number"
        ? payload.chosen_variant_id
        : null;
  const axis = typeof payload.axis === "string" ? payload.axis : null;
  const comment = typeof payload.comment === "string" ? payload.comment : null;

  const result = await postMixJudgement({
    job_id: jobId,
    variant_a_id: aId,
    variant_b_id: bId,
    chosen_variant_id: chosen,
    axis,
    comment,
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
