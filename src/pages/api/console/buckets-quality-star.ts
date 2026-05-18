// Auth-gated proxy: set quality_star on an asset.
// Today calls the mocked setQualityStar(); swap when Task E ships.

import type { APIRoute } from "astro";
import { setQualityStar } from "../../../lib/console-api";
import type { QualityStar } from "../../../lib/console-types";

export const POST: APIRoute = async ({ request }) => {
  let payload: { asset_id?: unknown; quality_star?: unknown };
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
    return new Response(JSON.stringify({ error: "asset_id must be a number" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const stars = payload.quality_star;
  if (stars !== 0 && stars !== 1 && stars !== 2 && stars !== 3) {
    return new Response(JSON.stringify({ error: "quality_star must be 0, 1, 2, or 3" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const result = await setQualityStar(assetId, stars as QualityStar);
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
