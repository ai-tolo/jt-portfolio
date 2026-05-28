// Auth-gated proxy: crown a variant as the cross-axis champion for a
// mix job, crown ORIGINAL (the source), or clear the current champion.
// The engine validates that a variant champion already won an axis;
// ORIGINAL crowns skip that and synchronously auto-spawn a make-more
// job for the same source, returning the spawned_job_id.

import type { APIRoute } from "astro";
import { setMixChampion, crownOriginal } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: {
    job_id?: unknown;
    variant_id?: unknown;
    is_original?: unknown;
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
  if (!Number.isFinite(jobId)) {
    return new Response(
      JSON.stringify({ error: "job_id must be a number" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const isOriginal = payload.is_original === true;
  const comment =
    typeof payload.comment === "string" ? payload.comment : null;

  // ORIGINAL crown branch: variant_id is ignored, the engine sets
  // champion_is_original=1 and spawns a make-more job.
  if (isOriginal) {
    const result = await crownOriginal(jobId, comment);
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
  }

  // Variant crown / clear branch: null clears the champion, a number sets it.
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

  const result = await setMixChampion(jobId, variantId, comment);
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
