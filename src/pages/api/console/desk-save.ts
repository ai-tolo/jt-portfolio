// Persist (or reset) the tuned On-the-Desk plan. Auth-gated by middleware.
import type { APIRoute } from "astro";
import { writeSavedState, clearSavedState, type SavedWeek } from "../../../lib/desk-state";

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  if (body?.reset) {
    try {
      await clearSavedState();
      return json({ ok: true, reset: true });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "reset failed" }, 500);
    }
  }

  const weeks: SavedWeek[] = Array.isArray(body?.weeks) ? body.weeks : [];
  if (!weeks.length) return json({ error: "no weeks to save" }, 400);
  const weekKey = String(weeks[0]?.range ?? "").slice(0, 64);

  try {
    await writeSavedState({ weekKey, weeks, savedAt: new Date().toISOString() });
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "save failed" }, 500);
  }
};
