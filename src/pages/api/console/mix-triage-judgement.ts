// Auth-gated proxy: record a blind, loudness-matched king-triage decision (of N
// crowned kings for one source, which the curator kept). Forwards to the engine's
// /mix/triage-judgement. The UI posts this BEST-EFFORT — it still uncrowns the
// losers itself via /mix/champion — so a not-yet-built engine route fails quietly
// (the page treats any non-2xx as "noted later") without blocking the prune.

import type { APIRoute } from "astro";
import { postTriageJudgement } from "../../../lib/console-api";

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

  const sourceAssetId = typeof p.source_asset_id === "number" ? p.source_asset_id : NaN;
  const keptJobId = typeof p.kept_job_id === "number" ? p.kept_job_id : NaN;
  const presentedOrder = typeof p.presented_order === "string" ? p.presented_order : "";
  if (![sourceAssetId, keptJobId].every(Number.isFinite) || !presentedOrder) {
    return new Response(
      JSON.stringify({ error: "source_asset_id, kept_job_id, presented_order required" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  const result = await postTriageJudgement({
    source_asset_id: sourceAssetId,
    kept_job_id: keptJobId,
    presented_order: presentedOrder,
    chosen_slot: typeof p.chosen_slot === "number" ? p.chosen_slot : 0,
    blind: p.blind === true,
    loudness_matched: p.loudness_matched === true,
    matched_target_lufs: numOrNull(p.matched_target_lufs),
    rater_id: typeof p.rater_id === "string" ? p.rater_id : "jon",
    is_author: p.is_author !== false,
  });

  if (!result.ok) {
    // Soft-fail: the engine route may not exist yet. Report a non-2xx the UI
    // already ignores, but never 500 the surface.
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
