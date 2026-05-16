// Auth-gated proxy: trash or restore an asset.
// Posts through to the M1 engine's POST /items/trashed.

import type { APIRoute } from "astro";
import { setItemTrashed } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { path?: unknown; trashed?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const path = typeof payload.path === "string" ? payload.path : "";
  if (!path) {
    return new Response(JSON.stringify({ error: "path required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (typeof payload.trashed !== "boolean") {
    return new Response(JSON.stringify({ error: "trashed must be boolean" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const result = await setItemTrashed(path, payload.trashed);
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
