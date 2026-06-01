// Auth-gated proxy: link (or unlink, with null) a source asset to its .als
// project. The manual link overrides the filename-similarity auto-suggestion.
// Auth enforced upstream by middleware.

import type { APIRoute } from "astro";
import { linkAssetProject } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { asset_id?: unknown; project_asset_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const assetId = typeof payload.asset_id === "number" ? payload.asset_id : NaN;
  if (!Number.isFinite(assetId)) {
    return new Response(JSON.stringify({ error: "asset_id (number) required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  // project_asset_id null clears the link; a number sets it.
  const projectId =
    typeof payload.project_asset_id === "number" ? payload.project_asset_id : null;
  const result = await linkAssetProject(assetId, projectId);
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
