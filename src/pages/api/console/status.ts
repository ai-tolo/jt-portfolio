// Auth-gated proxy: live M1 state for the Portal StatusBar widget.
// Polled by the widget every ~15s when the tab is visible.

import type { APIRoute } from "astro";
import { status } from "../../../lib/console-api";

export const GET: APIRoute = async () => {
  // Long timeout: the engine's /status caches for 60s but a cold call
  // (after engine restart) can hang on macOS launchctl for ~60s. The widget
  // polls every 15s; better to wait than 502 the first call.
  const result = await status({ timeoutMs: 15000 });
  if (!result.ok) {
    const code = result.error.kind === "http" ? result.error.status : 502;
    return new Response(
      JSON.stringify({ error: result.error }),
      { status: code, headers: { "content-type": "application/json" } },
    );
  }
  return new Response(JSON.stringify(result.data), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
};
