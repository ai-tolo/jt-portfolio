// Server-only. Builds the prompts for the Desk's re-interview loop ("Tune this
// week") and draft-on-request, and parses the model's output back into the
// board shape. The model itself runs as `claude -p` on the M1 engine under
// launchd (Jon's Max login via the keychain, no API key) — see
// src/lib/console-api.ts deskStartJob/deskPollJob and the engine router at
// tasks/m1-desk-endpoint.py. This module is pure string-in / string-out so the
// same prompts and parsing run identically in local dev and on Vercel; the
// only thing that changed when Tune/Draft went live on the deployed site is
// WHERE the model runs, not the voice. NEVER imported by client code.

export interface DeskPiece {
  surface: string; // Substack | LinkedIn | IG
  lane: string; // Article | Notes | Post | Visual
  text: string;
}
export interface DeskWeek {
  when: string; // "this week" | "next week"
  range: string;
  beat: string;
  pieces: DeskPiece[];
}
export interface TuneResult {
  questions: string[];
  weeks: DeskWeek[] | null;
  summary: string | null;
}

export type TuneKind = "tune-question" | "tune-rewrite";
export type DeskKind = TuneKind | "draft";

const VOICE = `Voice rules (hard, non-negotiable):
- Audience is high-craft cross-medium creators (designers, sound artists, music-tech inventors, magazine editors, Ableton-tier teams), NOT the AI-tech / productivity / growth / creator-economy crowd.
- No em dashes anywhere. Commas, periods, parentheses only.
- Casual, self-aware, emotionally honest, a little raw, occasionally witty. No corporate or motivational language. AI tooling is a detail, never the headline.
- Substack (Diary of a Soundbender) is the keystone. Quality and mindshare over volume.`;

// Fast model for the interview step (short output), quality model for the
// rewrite and draft (voice is the whole point). Overridable via env.
const REACT_MODEL = process.env.DESK_REACT_MODEL || "haiku";
const REWRITE_MODEL = process.env.DESK_REWRITE_MODEL || "sonnet";

const PERSONA = `You are a sharp, calm content strategist helping a craft-forward creator (Jon, who publishes as Tolo) plan the next two weeks of posts. You behave like a great magazine editor running a planning crit, not a productivity bot. You understand long-form authentic narrative, ADHD working patterns, and craft-forward audiences.`;

function extractJson(s: string): any {
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : s;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON found in model output");
  return JSON.parse(body.slice(start, end + 1));
}

function sanitizePieces(pieces: any): DeskPiece[] {
  if (!Array.isArray(pieces)) return [];
  return pieces
    .map((p) => ({
      surface: String(p?.surface ?? "").slice(0, 24),
      lane: String(p?.lane ?? "").slice(0, 24),
      text: String(p?.text ?? "").replace(/—/g, ", ").slice(0, 400),
    }))
    .filter((p) => p.text.trim());
}

function sanitizeWeeks(weeks: any): DeskWeek[] | null {
  if (!Array.isArray(weeks)) return null;
  return weeks.map((w) => ({
    when: String(w?.when ?? "").slice(0, 24),
    range: String(w?.range ?? "").slice(0, 48),
    beat: String(w?.beat ?? "").slice(0, 120),
    pieces: sanitizePieces(w?.pieces),
  }));
}

// ── Tune (the re-interview loop) ────────────────────────────────────────────
// Two steps. With no answers yet, ask 1-2 Socratic questions (fast model).
// Once answered, rewrite the two weeks (quality model). The caller starts an
// engine job with the returned {prompt, model, kind}, then finalizes the
// streamed text with finalizeTune(kind, text).
export function buildTunePrompt(
  weeks: DeskWeek[],
  reaction: string,
  answers: string[] = [],
): { prompt: string; model: string; kind: TuneKind } {
  const hasAnswers = answers.some((a) => a && a.trim());
  const planJson = JSON.stringify({ weeks }, null, 2);

  // Step 1 — interview. Fast model, short output, mirror his words.
  if (!hasAnswers) {
    const prompt = `${PERSONA}

${VOICE}

CURRENT TWO-WEEK PLAN (JSON):
${planJson}

JON'S REACTION TO THIS PLAN:
"${reaction}"

Ask him 1 or 2 SHORT open questions that let you rewrite the plan to match what he actually wants. One idea per question, mirror his own words, never a wall of text. Do NOT rewrite the plan yet. Return ONLY this JSON: {"questions": ["...", "..."]}. No prose, no em dashes.`;
    return { prompt, model: REACT_MODEL, kind: "tune-question" };
  }

  // Step 2 — rewrite. Quality model, voice carries the weight.
  const prompt = `${PERSONA}

${VOICE}

CURRENT TWO-WEEK PLAN (JSON):
${planJson}

JON'S REACTION TO THIS PLAN:
"${reaction}"

HE ANSWERED YOUR QUESTIONS:
${answers.map((a, i) => `${i + 1}. ${a}`).join("\n")}

Now REWRITE the two-week plan to reflect what he actually wants. Keep the exact same JSON shape (weeks, each with when/range/beat and pieces of {surface, lane, text}). Substack stays the spine. You may change, drop, add, reorder, or re-voice pieces. Each piece "text" is the real hook or title in his voice, ready to read. Return ONLY this JSON: {"weeks": [ ...the full revised weeks... ], "summary": "one calm sentence on what you changed and why"}. No prose before or after, no em dashes anywhere including inside the plan text.`;
  return { prompt, model: REWRITE_MODEL, kind: "tune-rewrite" };
}

// Parse the streamed model output back into the board shape.
export function finalizeTune(kind: string, text: string): TuneResult {
  const parsed = extractJson(text);
  if (kind === "tune-question") {
    return {
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.map((q: any) => String(q)).slice(0, 2)
        : [],
      weeks: null,
      summary: null,
    };
  }
  return {
    questions: [],
    weeks: sanitizeWeeks(parsed.weeks),
    summary: typeof parsed.summary === "string" ? parsed.summary.replace(/—/g, ", ") : null,
  };
}

// ── Draft a single post on request, in Jon's voice, shaped by its surface. ──
export function buildDraftPrompt(
  piece: { surface: string; lane: string; text: string },
  ctx: { beat: string; when: string },
): { prompt: string; model: string; kind: "draft" } {
  let guidance: string;
  if (piece.surface === "Substack" && piece.lane === "Article") {
    guidance = `Write the full Substack post for Diary of a Soundbender. Open on a specific, concrete moment or anecdote, then open it into the broader idea. Demonstrate, do not just describe. Put an audio cue at the very top as [AUDIO: what plays here]. Use a [VISUAL: ...] cue once, where a handwritten or physical image would land. At most one or two declarative aphorisms, each load-bearing. 450 to 800 words. Put the title on the first line.`;
  } else if (piece.surface === "Substack") {
    guidance = `Write a single Substack Note: 2 to 4 sentences, a distilled observation in his voice. No title.`;
  } else if (piece.surface === "LinkedIn") {
    guidance = `Write a first-person LinkedIn post, concrete and tactical, building technical credibility for a music-tech and design audience without sounding like a productivity influencer. End with a genuine question. 110 to 200 words.`;
  } else if (piece.surface === "IG") {
    guidance = `Write an Instagram carousel: a one-line hook, then 4 to 6 slides (each a single short line, labelled Slide 1, Slide 2, and so on), then a caption. Visual and craft-forward.`;
  } else {
    guidance = `Write the piece in his voice, ready to post.`;
  }
  const prompt = `${PERSONA}

${VOICE}

This piece sits in the week themed "${ctx.beat}" (${ctx.when}). The planned hook or title is:
"${piece.text}"

${guidance}

Write it as if it is going out under his name. Output ONLY the draft itself: no preamble, no commentary, no surrounding quotes. No em dashes anywhere.`;
  return { prompt, model: REWRITE_MODEL, kind: "draft" };
}

export function finalizeDraft(out: string): string {
  return out.replace(/—/g, ", ").replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
}
