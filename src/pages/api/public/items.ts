import type { APIRoute } from "astro";
import { publicItems } from "../../../lib/console-api";

export const GET: APIRoute = async ({ url }) => {
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const result = await publicItems(limit && Number.isFinite(limit) ? { limit } : undefined);
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result.data), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60",
    },
  });
};
