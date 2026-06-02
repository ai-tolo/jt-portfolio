// Auth-gated proxy: reveal a project's .als (or a stem/export asset) in Finder
// on M3. Forwards to the engine's /projects/reveal-in-finder, which rewrites
// the path and POSTs the M3 file-server's /reveal (`open -R` selects the file;
// it does NOT launch Ableton). A 404 means the bytes aren't on M3 yet (e.g. a
// T7-resident project pre-consolidation) — the page degrades gracefully.
// Auth enforced upstream by middleware.

import type { APIRoute } from "astro";
import { revealProjectInFinder } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { project_asset_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const id =
    typeof payload.project_asset_id === "number" ? payload.project_asset_id : NaN;
  if (!Number.isFinite(id)) {
    return new Response(
      JSON.stringify({ error: "project_asset_id (number) required" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const result = await revealProjectInFinder(id);
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
