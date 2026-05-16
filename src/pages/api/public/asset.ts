// Public asset streaming proxy. Validates that the requested path is
// flagged public=1 in the catalog before forwarding to the M1 /file
// endpoint. Without the public check, this would be an open bypass
// around the portal auth — any asset path could be streamed by anyone.

import type { APIRoute } from "astro";
import { assetByPath, streamAsset } from "../../../lib/console-api";

const FORWARD_HEADERS = new Set([
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "last-modified",
]);

export const GET: APIRoute = async ({ request, url }) => {
  const path = url.searchParams.get("path");
  if (!path) {
    return new Response(JSON.stringify({ error: "missing path" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const meta = await assetByPath(path);
  if (!meta.ok) {
    if (meta.error.kind === "http" && meta.error.status === 404) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "upstream error" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const isPublic = (meta.data as { public?: number }).public === 1;
  if (!isPublic) {
    return new Response(JSON.stringify({ error: "not public" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const range = request.headers.get("range");
  let upstream: Response;
  try {
    upstream = await streamAsset(path, { range });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "unreachable",
        message: e instanceof Error ? e.message : "fetch failed",
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  if (upstream.status === 404) {
    return new Response(JSON.stringify({ error: "not found on disk" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  if (!upstream.ok && upstream.status !== 206 && upstream.status !== 416) {
    return new Response(
      JSON.stringify({ error: "upstream error", status: upstream.status }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  const headers = new Headers();
  for (const [k, v] of upstream.headers) {
    if (FORWARD_HEADERS.has(k.toLowerCase())) headers.set(k, v);
  }
  headers.set("cache-control", "public, max-age=3600");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
};
