// Pre-warm the engine's claude runtime. Called fire-and-forget when the Desk
// page loads so the first Tune/Draft is the fast warm path. Auth-gated by
// middleware. Best-effort: any failure is swallowed (the page never depends on
// it; the engine also self-warms via com.jont.desk-warm).
import type { APIRoute } from "astro";
import { deskWarm } from "../../../lib/console-api";

export const prerender = false;

export const POST: APIRoute = async () => {
  const res = await deskWarm();
  const body = res.ok ? res.data : { ok: false };
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
};
