// Auth-gated proxy: ask the engine to suggest a friendly display name for
// an asset based on its catalog metadata. Read-only, no persistence.

import type { APIRoute } from "astro";
import { suggestName } from "../../../lib/console-api";

export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get("path");
  if (!path) {
    return new Response(JSON.stringify({ error: "missing path" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await suggestName(path);
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
