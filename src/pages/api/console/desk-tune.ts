import type { APIRoute } from "astro";
import { tune, type DeskWeek } from "../../../lib/desk-tune";

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// POST { weeks, reaction, answers? } -> { questions, weeks, summary }
// Gated by the portal middleware (lives under /api/console/). Runs Claude
// locally via the Max login; only functional where the claude binary exists.
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const weeks: DeskWeek[] = Array.isArray(body?.weeks) ? body.weeks : [];
  const reaction = String(body?.reaction ?? "").slice(0, 2000);
  const answers: string[] = Array.isArray(body?.answers) ? body.answers.map((a: any) => String(a)) : [];

  if (!reaction.trim() && !answers.some((a) => a.trim())) {
    return json({ error: "say what is off about the week first" }, 400);
  }

  try {
    const result = await tune(weeks, reaction, answers);
    return json(result, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "tune failed";
    // Surface the not-logged-in case clearly so the UI can prompt a login.
    const notLoggedIn = /not logged in|\/login/i.test(msg);
    return json({ error: notLoggedIn ? "claude-not-logged-in" : msg }, notLoggedIn ? 503 : 500);
  }
};
