// Auth-gated proxy: warm the engine's opus disk cache for a long source ahead
// of playback (fired on Bucket card expand / hover). Forwards to the engine's
// POST /file/prewarm?path=<encoded>. Fire-and-forget — the engine returns
// immediately ({status: cached|warming|busy}) and transcodes in the background,
// so the next play hits a Range-seekable cached file. Auth enforced upstream by
// middleware. Best-effort: any failure is swallowed (playback still works on a
// cache miss), so the client never needs to handle the error.

import type { APIRoute } from "astro";
import { prewarmOpus } from "../../../lib/console-api";

export const POST: APIRoute = async ({ url }) => {
  const path = url.searchParams.get("path");
  if (!path) {
    return new Response(JSON.stringify({ error: "missing path" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await prewarmOpus(path);
  if (!result.ok) {
    // Prewarm is best-effort; report the status code but the client ignores it.
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
