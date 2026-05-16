// Workbench reads queue items from localStorage (paths only). It needs the
// summary / tags / category for each one. This proxy is auth-gated and
// fetches /assets/by-path on the M1 to round out the metadata.

import type { APIRoute } from "astro";
import { assetByPath } from "../../../lib/console-api";

export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get("path");
  if (!path) {
    return new Response(JSON.stringify({ error: "missing path" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await assetByPath(path);
  if (!result.ok) {
    const status = result.error.kind === "http" ? result.error.status : 502;
    return new Response(JSON.stringify({ error: result.error }), {
      status,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result.data), {
    headers: { "content-type": "application/json", "cache-control": "private, max-age=60" },
  });
};
