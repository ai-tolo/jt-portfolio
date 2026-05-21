// Auth-gated proxy: link a pending print to a specific .als project.
// Calls linkPrint() which forwards to M1 /prints/link. Engine sets
// assets.print_of_project_id on the print's catalog row (creating a
// stub row if the file hasn't been crawled yet) and removes the pending
// entry. Auth enforced upstream by middleware.

import type { APIRoute } from "astro";
import { linkPrint } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { path?: unknown; project_asset_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const path = typeof payload.path === "string" ? payload.path : "";
  const projectId =
    typeof payload.project_asset_id === "number" ? payload.project_asset_id : NaN;
  if (!path || !Number.isFinite(projectId)) {
    return new Response(
      JSON.stringify({ error: "path (string) and project_asset_id (number) required" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const result = await linkPrint(path, projectId);
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
