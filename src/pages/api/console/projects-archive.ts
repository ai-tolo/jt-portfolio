// Auth-gated proxy: archive / un-archive a project (als_projects.archived_at).
// Auth enforced upstream by middleware.

import type { APIRoute } from "astro";
import { archiveProject } from "../../../lib/console-api";

export const POST: APIRoute = async ({ request }) => {
  let payload: { project_asset_id?: unknown; archived?: unknown };
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
  const archived = payload.archived !== false; // default true
  if (!Number.isFinite(id)) {
    return new Response(
      JSON.stringify({ error: "project_asset_id (number) required" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const result = await archiveProject(id, archived);
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
