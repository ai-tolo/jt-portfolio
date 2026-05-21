// Auth-gated proxy: replace an asset's tag list. The BucketCard's
// combined Tags section uses this for both × (remove a tag) and + (add).
// UI sends the full updated list each call; engine normalizes + persists.

import type { APIRoute } from "astro";
import { setItemTags } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const path = (body as { path?: unknown })?.path;
  const tags = (body as { tags?: unknown })?.tags;
  if (typeof path !== "string" || !path) {
    return new Response(JSON.stringify({ error: "path required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
    return new Response(JSON.stringify({ error: "tags must be an array of strings" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await setItemTags(path, tags as string[]);
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
