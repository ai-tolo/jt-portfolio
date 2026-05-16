// Curator-only proxy that toggles the public flag on a catalog item.
// Auth-gated by the portal middleware (session cookie required).
// Forwards to the M1 engine's POST /items/public with the bearer key.

import type { APIRoute } from "astro";
import { setItemPublic } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { path?: unknown; public?: unknown };
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
  if (typeof payload.public !== "boolean") {
    return new Response(JSON.stringify({ error: "public must be boolean" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const result = await setItemPublic(path, payload.public);
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
