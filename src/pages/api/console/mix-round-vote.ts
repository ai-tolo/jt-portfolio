// Auth-gated proxy: record a blind pathway-round vote. Forwards the
// generalized take-based body to the engine's /mix/judgement (the same training
// sink as the legacy A/B path — the engine dispatches on round_id). The legacy
// mix-judgement.ts proxy is left untouched so the old decision-grade path keeps
// working byte-for-byte; this is the N-take-friendly sibling.

import type { APIRoute } from "astro";
import { postRoundVote } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let p: Record<string, unknown>;
  try {
    p = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const roundId = typeof p.round_id === "string" ? p.round_id : "";
  // Don't adjudicate pathway_type against a frozen client enum — the engine is
  // the source of truth and dispatches on round_id, so a new pathway must not
  // brick voting until a redeploy. Require a non-empty string only. (review L2)
  const pathway = typeof p.pathway_type === "string" ? p.pathway_type : "";
  const sourceAssetId =
    typeof p.source_asset_id === "number" ? p.source_asset_id : NaN;
  const presentedOrder =
    typeof p.presented_order === "string" ? p.presented_order : "";
  if (!roundId || !pathway || !Number.isFinite(sourceAssetId)) {
    return new Response(
      JSON.stringify({ error: "round_id, pathway_type, source_asset_id required" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const isSkip = p.is_skip === true;
  const chosenTakeId =
    typeof p.chosen_take_id === "string" ? p.chosen_take_id : null;
  // A non-skip vote must name the winning take. A skip names none.
  if (!isSkip && !chosenTakeId) {
    return new Response(JSON.stringify({ error: "chosen_take_id required unless is_skip" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  const result = await postRoundVote({
    round_id: roundId,
    pathway_type: pathway,
    source_asset_id: sourceAssetId,
    presented_order: presentedOrder,
    chosen_take_id: chosenTakeId,
    is_skip: isSkip,
    blind: p.blind === true,
    loudness_matched: p.loudness_matched === true,
    matched_target_lufs: numOrNull(p.matched_target_lufs),
    chosen_slot: numOrNull(p.chosen_slot),
    comment: typeof p.comment === "string" ? p.comment : null,
    rater_id: typeof p.rater_id === "string" ? p.rater_id : "jon",
    is_author: p.is_author !== false,
    codec: typeof p.codec === "string" ? p.codec : "opus",
    variant_a_id: numOrNull(p.variant_a_id),
    variant_b_id: numOrNull(p.variant_b_id),
    chosen_variant_id: numOrNull(p.chosen_variant_id),
    chose_original: p.chose_original === true,
    // Optional best-worst signal: the weakest take, if the curator marked one.
    worst_take_id: typeof p.worst_take_id === "string" ? p.worst_take_id : null,
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
