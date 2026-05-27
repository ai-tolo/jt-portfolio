// Auth-gated proxy: update a public asset's collection or public flag
// from /portal/sounds. Forwards to engine POST /sounds/update.

import type { APIRoute } from "astro";
import { updateSoundsAsset } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: {
    asset_id?: unknown;
    public?: unknown;
    collection?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const assetId =
    typeof payload.asset_id === "number" ? payload.asset_id : NaN;
  if (!Number.isFinite(assetId)) {
    return new Response(
      JSON.stringify({ error: "asset_id must be a number" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const opts: { public?: boolean; collection?: string | null } = {};
  if (typeof payload.public === "boolean") opts.public = payload.public;
  if (typeof payload.collection === "string") {
    opts.collection = payload.collection;
  } else if (payload.collection === null) {
    opts.collection = null;
  }

  const result = await updateSoundsAsset(assetId, opts);
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
