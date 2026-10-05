// INTAKE, live (Stream A, 2026-10-05): the ONE result shape both parsers emit (the Claude endpoint in
// src/pages/api/intake.ts and the local rule-based fallback in ./intake-local.ts), and the validator the server
// runs over Claude's JSON before anything reaches a stranger's screen. Pure: no DOM, no fetch, erasable TS only
// (node runs it as-is for the fixture script, scripts/intake-fixtures.mjs).
//
// THE THREE FATES, as the real Intake parser routes a memo (memory: intake_system):
//   EXECUTE  a complete, dated instruction, zero judgement — a calendar add or a reminder with its day; only at
//            confidence ≥ 0.8 with the `when` filled. The live stage SHOWS what would happen and does nothing.
//   SURFACE  needs a human: a task to do, an idea to keep.
//   STORE    venting, reflection, humming: no ticket; the transcript is the record (here: nothing is kept at all).

export const INTAKE_MAX_CHARS = 1500;
export const INTAKE_MAX_TICKETS = 4;
export const INTAKE_MAX_ITEMS = 4;
export const INTAKE_EXECUTE_CONFIDENCE = 0.8;

export type Kind = 'task' | 'idea' | 'event' | 'reminder';
export type Verdict = 'execute' | 'surface' | 'store';
export type Source = 'claude' | 'local';

export interface Ticket {
  kind: Kind;
  title: string;
  items: string[];
  /** the day and time as spoken ("Friday morning", "Thursday 2:00 pm"); only events and reminders carry one */
  when?: string;
  /** EXECUTE: complete params at ≥ 0.8 — the stage prints a preview card and creates nothing */
  execute?: boolean;
}

export interface ParseResult {
  /** the words lit on the verdict row (one or two of the three) */
  verdicts: Verdict[];
  tickets: Ticket[];
  /** what was stored instead of ticketed (one line), or null */
  stored: string | null;
  source: Source;
}

const KINDS: ReadonlySet<string> = new Set(['task', 'idea', 'event', 'reminder']);
export const isKind = (k: unknown): k is Kind => typeof k === 'string' && KINDS.has(k);
export const isExecKind = (k: Kind): boolean => k === 'event' || k === 'reminder';

/** The verdict words a set of tickets lights: execute (any executing ticket), surface (any ticket that waits on a human), store (nothing filed). */
export function verdictsOf(tickets: ReadonlyArray<Ticket>): Verdict[] {
  const v: Verdict[] = [];
  if (tickets.some((t) => t.execute)) v.push('execute');
  if (tickets.some((t) => !t.execute)) v.push('surface');
  if (!v.length) v.push('store');
  return v;
}

const str = (x: unknown, max: number): string | null => {
  if (typeof x !== 'string') return null;
  const s = x.replace(/\s+/g, ' ').trim();
  return s.length && s.length <= max ? s : null;
};

/** Raw ticket as Claude is asked to write it (confidence instead of execute). */
export interface RawTicket { kind: string; title: string; items: string[]; when?: string | null; confidence?: number }

/** Validate a parser's JSON into a ParseResult. Anything malformed → null (the caller falls back). Strict on shape,
 *  lenient on length (long strings are cut, extra tickets dropped) so a slightly verbose model still lands. */
export function validateResult(x: unknown, source: Source): ParseResult | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as { tickets?: unknown; stored?: unknown };
  if (!Array.isArray(o.tickets)) return null;
  const tickets: Ticket[] = [];
  for (const raw of o.tickets.slice(0, INTAKE_MAX_TICKETS)) {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as RawTicket;
    if (!isKind(r.kind)) return null;
    const title = str(r.title, 80) ?? (typeof r.title === 'string' ? str(r.title.slice(0, 80), 80) : null);
    if (!title) return null;
    if (!Array.isArray(r.items)) return null;
    const items = r.items.map((i) => (typeof i === 'string' ? str(i.slice(0, 120), 120) : null)).filter((i): i is string => !!i).slice(0, INTAKE_MAX_ITEMS);
    if (!items.length) items.push(title);
    const when = r.when == null ? undefined : (str(String(r.when).slice(0, 60), 60) ?? undefined);
    const conf = typeof r.confidence === 'number' && Number.isFinite(r.confidence) ? r.confidence : 0;
    const execute = isExecKind(r.kind) && !!when && conf >= INTAKE_EXECUTE_CONFIDENCE;
    const t: Ticket = { kind: r.kind, title, items };
    if (when) t.when = when;
    if (execute) t.execute = true;
    tickets.push(t);
  }
  const stored = o.stored == null ? null : str(String(o.stored).slice(0, 160), 160);
  return { verdicts: verdictsOf(tickets), tickets, stored, source };
}
