// Auth-gated proxy: assign an asset to a bucket.
// Today calls the mocked setBucket(); when Task E ships swap the import for
// the real call. Auth is enforced upstream by src/middleware.ts.

import type { APIRoute } from "astro";
import { setBucket } from "../../../lib/console-api";
import type { BucketName } from "../../../lib/console-types";

const VALID_BUCKETS: BucketName[] = ["inbox", "voice_memo", "loop", "song", "trash"];

export const POST: APIRoute = async ({ request }) => {
  let payload: { asset_id?: unknown; bucket?: unknown };
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
  if (typeof payload.bucket !== "string" || !VALID_BUCKETS.includes(payload.bucket as BucketName)) {
    return new Response(JSON.stringify({ error: "bucket must be one of " + VALID_BUCKETS.join(", ") }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const result = await setBucket(assetId, payload.bucket as BucketName);
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
