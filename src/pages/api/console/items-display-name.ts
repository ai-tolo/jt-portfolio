// Auth-gated proxy: sets or clears the friendly display_name on an asset.
// Posts through to the M1 engine's POST /items/display-name.

import type { APIRoute } from "astro";
import { setDisplayName } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { path?: unknown; display_name?: unknown };
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

  const raw = payload.display_name;
  let name: string | null;
  if (raw === null || raw === undefined) name = null;
  else if (typeof raw === "string") name = raw;
  else {
    return new Response(JSON.stringify({ error: "display_name must be string or null" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const result = await setDisplayName(path, name);
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
