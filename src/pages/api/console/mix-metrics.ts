// Auth-gated proxy: the footer metric — how often the curator's master beats
// raw across tracks + the trend, plus a soft round counter. Polled by the
// persistent footer; degrades to a quiet null when the engine is asleep.

import type { APIRoute } from "astro";
import { getMixMetrics } from "../../../lib/console-api";

export const prerender = false;

export const GET: APIRoute = async () => {
  const result = await getMixMetrics({ timeoutMs: 6000 });
  if (!result.ok) {
    if (result.error.kind === "unreachable") {
      return new Response(JSON.stringify({ unavailable: true }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }
    const code = result.error.kind === "http" ? result.error.status : 502;
    return new Response(JSON.stringify({ error: result.error }), {
      status: code,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result.data), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
