import type { APIRoute } from "astro";
import { surprise } from "../../../lib/console-api";

export const GET: APIRoute = async () => {
  const result = await surprise();
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify(result.data), {
    headers: { "content-type": "application/json" },
  });
};
