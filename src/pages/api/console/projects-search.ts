// Auth-gated proxy: search .als projects by name. Powers the prompt-driven
// "link / change project" picker on Engineer Winners cards. GET so the
// client can call it directly; auth enforced upstream by middleware.

import type { APIRoute } from "astro";
import { searchProjects } from "../../../lib/console-api";

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return new Response(JSON.stringify({ projects: [] }), {
      headers: { "content-type": "application/json" },
    });
  }
  const result = await searchProjects(q);
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
