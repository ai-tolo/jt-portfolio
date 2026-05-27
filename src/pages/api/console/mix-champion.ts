// Auth-gated proxy: crown a variant as the cross-axis champion for a
// mix job, or clear the current champion (variant_id=null). The engine
// validates that the variant is a winner of one of the job's axes.

import type { APIRoute } from "astro";
import { setMixChampion } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { job_id?: unknown; variant_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const jobId =
    typeof payload.job_id === "number" ? payload.job_id : NaN;
  if (!Number.isFinite(jobId)) {
    return new Response(
      JSON.stringify({ error: "job_id must be a number" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  // null clears the champion; a number sets it.
  const variantId =
    payload.variant_id === null
      ? null
      : typeof payload.variant_id === "number"
        ? payload.variant_id
        : undefined;
  if (variantId === undefined) {
    return new Response(
      JSON.stringify({ error: "variant_id must be a number or null" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const result = await setMixChampion(jobId, variantId);
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
