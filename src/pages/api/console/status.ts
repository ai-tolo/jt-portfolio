// Auth-gated proxy: live M1 state for the Portal StatusBar widget.
// Polled by the widget every ~15s when the tab is visible.

import type { APIRoute } from "astro";
import { status } from "../../../lib/console-api";

export const GET: APIRoute = async () => {
  const result = await status({ timeoutMs: 4000 });
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
