// Poll a streamed Desk job (Tune or Draft) running on the M1 engine.
// Auth-gated by middleware. While the job runs, returns the growing `text` so
// the browser can show the draft / rewrite appearing. On done, finalizes the
// raw model output into the shape the board needs (questions, revised weeks, or
// a clean draft). Each call is short, so nothing depends on Vercel's function
// duration limit.
import type { APIRoute } from "astro";
import { deskPollJob } from "../../../lib/console-api";
import { finalizeTune, finalizeDraft } from "../../../lib/desk-tune";

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// Map an engine job error string to a stable UI code the client knows how to
// phrase. Unknown errors pass through (already short + human-ish).
function mapJobError(raw: string | null): string {
  const s = (raw || "").toLowerCase();
  if (s.includes("not logged in") || s.includes("not-logged-in")) return "claude-not-logged-in";
  if (s.includes("timeout")) return "claude-timeout";
  return raw || "tune failed";
}

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "missing id" }, 400);

  const res = await deskPollJob(id);
  if (!res.ok) {
    if (res.error.kind === "unreachable") return json({ status: "error", error: "m1-unreachable" }, 200);
    if (res.error.kind === "http" && res.error.status === 404) return json({ status: "error", error: "job-expired" }, 200);
    return json({ status: "error", error: res.error.message || "poll failed" }, 200);
  }

  const j = res.data;
  if (j.status === "running") {
    return json({ status: "running", kind: j.kind, text: j.text, elapsed: j.elapsed });
  }
  if (j.status === "error") {
    return json({ status: "error", kind: j.kind, error: mapJobError(j.error) });
  }

  // status === "done": finalize by kind.
  try {
    if (j.kind === "draft") {
      return json({ status: "done", kind: j.kind, draft: finalizeDraft(j.text) });
    }
    const result = finalizeTune(j.kind, j.text);
    if (j.kind === "tune-question") {
      return json({ status: "done", kind: j.kind, questions: result.questions });
    }
    // tune-rewrite
    if (!result.weeks || !result.weeks.length) {
      return json({ status: "error", kind: j.kind, error: "empty-rewrite" });
    }
    return json({ status: "done", kind: j.kind, weeks: result.weeks, summary: result.summary });
  } catch {
    // The model returned something we couldn't parse into the board shape.
    return json({ status: "error", kind: j.kind, error: "parse" });
  }
};
