import type { APIRoute } from "astro";
import { buildTunePrompt, type DeskWeek } from "../../../lib/desk-tune";
import { deskStartJob } from "../../../lib/console-api";

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// POST { weeks, reaction, answers? } -> { job_id, kind }
// Auth-gated by the portal middleware. Builds the Tune prompt and starts a
// streamed `claude` run on the M1 engine (Jon's Max login under launchd). The
// browser then polls /api/console/desk-job. If the M1 is asleep / offline the
// engine is unreachable and we say so plainly rather than looking broken.
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

  const { prompt, model, kind } = buildTunePrompt(weeks, reaction, answers);
  const res = await deskStartJob(prompt, model, kind);
  if (res.ok) return json({ job_id: res.data.job_id, kind: res.data.kind }, 200);

  // Graceful: distinguish "M1 not reachable" from "engine has no claude".
  if (res.error.kind === "unreachable") return json({ error: "m1-unreachable" }, 503);
  if (res.error.kind === "http" && res.error.status === 503) return json({ error: "claude-unavailable-here" }, 503);
  return json({ error: res.error.message || "tune failed to start" }, 502);
};
