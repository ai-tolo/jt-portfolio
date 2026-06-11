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
    chose_original?: unknown;
    axis?: unknown;
    comment?: unknown;
    rater_id?: unknown;
    is_author?: unknown;
    blind?: unknown;
    loudness_matched?: unknown;
    matched_target_lufs?: unknown;
    presented_order?: unknown;
    chosen_slot?: unknown;
    codec?: unknown;
    catch_trial?: unknown;
    catch_correct?: unknown;
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
  const choseOriginal = payload.chose_original === true;
  const axis = typeof payload.axis === "string" ? payload.axis : null;
  const comment = typeof payload.comment === "string" ? payload.comment : null;
  // Phase A rigor fields (pass-through; the M1 endpoint accepts + records them).
  const raterId = typeof payload.rater_id === "string" ? payload.rater_id : null;
  const isAuthor = payload.is_author === true;
  const blind = payload.blind === true;
  const loudnessMatched = payload.loudness_matched === true;
  const matchedTargetLufs =
    typeof payload.matched_target_lufs === "number" ? payload.matched_target_lufs : null;
  const presentedOrder =
    typeof payload.presented_order === "string" ? payload.presented_order : null;
  const chosenSlot =
    typeof payload.chosen_slot === "number" ? payload.chosen_slot : null;
  const codec = typeof payload.codec === "string" ? payload.codec : null;
  const catchTrial = payload.catch_trial === true;
  const catchCorrect =
    typeof payload.catch_correct === "boolean" ? payload.catch_correct : null;

  const result = await postMixJudgement({
    job_id: jobId,
    variant_a_id: aId,
    variant_b_id: bId,
    chosen_variant_id: chosen,
    chose_original: choseOriginal,
    axis,
    comment,
    rater_id: raterId,
    is_author: isAuthor,
    blind,
    loudness_matched: loudnessMatched,
    matched_target_lufs: matchedTargetLufs,
    presented_order: presentedOrder,
    chosen_slot: chosenSlot,
    codec,
    catch_trial: catchTrial,
    catch_correct: catchCorrect,
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
