// Server-only. Powers the Desk's re-interview loop by shelling out to the
// local Claude Code CLI using Jon's Max login (no API key). Runs where a
// logged-in `claude` binary exists (M3). NEVER imported by client code.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdirSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const execFileP = promisify(execFile);

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

function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

// Resolve the Claude Code binary. Prefer CLAUDE_BIN; then the standalone
// native install's launcher (the one that holds the Max login); then the
// newest native version directly. The desktop app bundle is intentionally
// not used: its headless calls report "not logged in".
function resolveClaudeBin(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const launcher = path.join(os.homedir(), ".local", "bin", "claude");
  if (existsSync(launcher)) return launcher;
  const nativeBase = path.join(os.homedir(), ".local", "share", "claude", "versions");
  try {
    const versions = readdirSync(nativeBase)
      .filter((v) => /^\d+\.\d+\.\d+/.test(v))
      .sort(cmpVersion);
    const latest = versions[versions.length - 1];
    if (latest) return path.join(nativeBase, latest);
  } catch { /* fall through */ }
  throw new Error("claude binary not found; set CLAUDE_BIN");
}

const VOICE = `Voice rules (hard, non-negotiable):
- Audience is high-craft cross-medium creators (designers, sound artists, music-tech inventors, magazine editors, Ableton-tier teams), NOT the AI-tech / productivity / growth / creator-economy crowd.
- No em dashes anywhere. Commas, periods, parentheses only.
- Casual, self-aware, emotionally honest, a little raw, occasionally witty. No corporate or motivational language. AI tooling is a detail, never the headline.
- Substack (Diary of a Soundbender) is the keystone. Quality and mindshare over volume.`;

// Fast model for the interview step (short output), quality model for the
// rewrite (voice is the whole point). Overridable via env.
const REACT_MODEL = process.env.DESK_REACT_MODEL || "haiku";
const REWRITE_MODEL = process.env.DESK_REWRITE_MODEL || "sonnet";

async function runClaude(prompt: string, model: string): Promise<string> {
  const bin = resolveClaudeBin();
  const { stdout } = await execFileP(
    bin,
    ["-p", prompt, "--model", model, "--strict-mcp-config"],
    { cwd: os.tmpdir(), maxBuffer: 8 * 1024 * 1024, timeout: 90_000 }
  );
  return stdout;
}

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

export async function tune(weeks: DeskWeek[], reaction: string, answers: string[] = []): Promise<TuneResult> {
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
    const parsed = extractJson(await runClaude(prompt, REACT_MODEL));
    return {
      questions: Array.isArray(parsed.questions) ? parsed.questions.map((q: any) => String(q)).slice(0, 2) : [],
      weeks: null,
      summary: null,
    };
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
  const parsed = extractJson(await runClaude(prompt, REWRITE_MODEL));
  return {
    questions: [],
    weeks: sanitizeWeeks(parsed.weeks),
    summary: typeof parsed.summary === "string" ? parsed.summary.replace(/—/g, ", ") : null,
  };
}
