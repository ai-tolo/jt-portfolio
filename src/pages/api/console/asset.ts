// Asset streaming proxy. The browser hits /api/console/asset?path=<encoded>;
// this forwards to the M1 /file endpoint and streams the response back.
// Auth is enforced by middleware. Tailscale URL and absolute paths never
// leak past the Vercel function.
//
// Requires Build 1's /file endpoint on the M1. See tasks/m1-file-endpoint.py.
// Without it the M1 returns 404 and this proxy returns the same.

import type { APIRoute } from "astro";
import { streamAsset } from "../../../lib/console-api";

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

  const range = request.headers.get("range");

  let upstream: Response;
  try {
    upstream = await streamAsset(path, { range });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "unreachable", message: e instanceof Error ? e.message : "fetch failed" }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  if (upstream.status === 404) {
    return new Response(JSON.stringify({ error: "not found in catalog" }), {
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

  // Build response headers: forward what the M1 sent, plus our cache directive.
  const headers = new Headers();
  for (const [k, v] of upstream.headers) {
    if (FORWARD_HEADERS.has(k.toLowerCase())) headers.set(k, v);
  }
  headers.set("cache-control", "private, max-age=0, must-revalidate");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
};
