// Auth-gated proxy: POST /buckets/promote-crop.
// Promotes a crop-from-jam child to canonical: source moves to Trash and
// gets dup_of pointing back at the crop. Engine returns 409 with
// project_count when source is referenced by .als projects unless
// `force: true` is sent — the UI then re-asks the curator and retries.

import type { APIRoute } from "astro";
import { promoteCrop } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { crop_asset_id?: unknown; force?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const cropAssetId = typeof payload.crop_asset_id === "number" ? payload.crop_asset_id : NaN;
  if (!Number.isFinite(cropAssetId)) {
    return new Response(
      JSON.stringify({ error: "crop_asset_id must be a number" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const force = payload.force === true;
  const result = await promoteCrop(cropAssetId, force);
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
