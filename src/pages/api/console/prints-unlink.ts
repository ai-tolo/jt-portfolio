// Auth-gated proxy: remove a print's link to its parent project.
// Calls unlinkPrint() which forwards to M1 /prints/unlink. The catalog
// row stays; only assets.print_of_project_id is cleared. Auth enforced
// upstream by middleware.

import type { APIRoute } from "astro";
import { unlinkPrint } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { asset_id?: unknown };
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

  const result = await unlinkPrint(assetId);
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
