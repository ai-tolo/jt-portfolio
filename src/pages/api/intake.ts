// INTAKE, live · THE ENDPOINT (Stream A, 2026-10-05). One serverless function on the site: a stranger's spoken words
// in, tickets out, through the Claude API with a prompt that mirrors the real Intake parser (three fates, note voice,
// execute only at ≥ 0.8 with complete params, pretend-detection honoured). Strict JSON out, validated here
// (src/lib/intake-schema.ts); anything malformed, slow, over budget or keyless answers with `fallback: true` and the
// browser runs its own local parse (src/lib/intake-local.ts) under a `local parse` chip. Never silent.
//
// GUARDS: same-origin only · the text capped at INTAKE_MAX_CHARS · max_tokens 800 · a 9 s upstream budget for the
// exchange and the call together (Vercel's function budget is 10 s on Hobby) · no storage, no logs of content (a
// status word at most) · Cache-Control: no-store.
// THE CREDENTIAL (2026-10-06, Jon: workload identity federation, no stored key): in production the function trades
// Vercel's own OIDC token (the `x-vercel-oidc-token` request header: RS256, iss https://oidc.vercel.com/tolo-ai, a
// two-hour life, no jti) for a short-lived Anthropic token at POST /v1/oauth/token (RFC 7523 jwt-bearer) under the
// federation rule named by ANTHROPIC_FEDERATION_RULE_ID + ANTHROPIC_ORGANIZATION_ID + ANTHROPIC_SERVICE_ACCOUNT_ID
// (+ ANTHROPIC_WORKSPACE_ID only if the rule spans workspaces). Those are IDs, not secrets; they live in Vercel's
// environment so they stay out of this public repo. The minted token is cached per warm instance until 60 s before it
// expires. ANTHROPIC_API_KEY still works where there is no OIDC token (local development). Spend is capped by the
// workspace's prepaid credit.
import type { APIRoute } from 'astro';
import { INTAKE_MAX_CHARS, validateResult } from '../../lib/intake-schema.ts';

export const prerender = false;

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 800;
const UPSTREAM_MS = 9000;

const SYSTEM = `You are the Intake parser. A person spoke a voice memo into a watch; the user message is the transcript, nothing more. Turn it into tickets.

Three fates, judged per distinct thing said:
- EXECUTE: a complete, dated instruction with zero judgement needed. A calendar add with a day and a time, or a reminder with a day. kind "event" or "reminder", "when" filled with the day and time as spoken, confidence 0.8 or above. If the day (or, for an event, the time) is missing, it is not complete: keep the kind, leave "when" null, confidence below 0.8.
- SURFACE: something a human must decide or do. kind "task" (a thing to do) or "idea" (a what-if, a maybe, a wondering, a keep-thinking-about).
- STORE: venting, reflection, humming, music, thinking out loud with nothing asked for. No ticket at all; describe it in "stored" in one short line.

Rules:
- Err toward FEWER tickets. One ticket per distinct thing, never one per sentence; a thing and its details are one ticket. At most 4 tickets.
- Never invent a detail, a date, or a time that was not spoken.
- If the person says they are pretending, testing, or that it should be ignored: no tickets, "stored" says so.
- Titles in note voice: subjectless, imperative or a noun phrase, 8 words or fewer. Never "I", "you", "the speaker", "he wants".
- Items: 1 to 4 atomic points in the same voice, each one fact from the memo (what, where, why, when). The title is not repeated as an item.
- "when": the day and time as spoken, title-cased ("Friday morning", "Thursday 2:00 pm", "Tomorrow noon"), or null.

Output ONLY this JSON object, no prose, no code fence:
{"tickets":[{"kind":"task|idea|event|reminder","title":"","items":[""],"when":null,"confidence":0.0}],"stored":null}

Example 1. Transcript: "Remind me Friday morning to pick up the dry cleaning, and I should finally email Sam back about the weekend."
{"tickets":[{"kind":"reminder","title":"Pick up the dry cleaning","items":["Friday morning"],"when":"Friday morning","confidence":0.95},{"kind":"task","title":"Email Sam back","items":["About the weekend"],"when":null,"confidence":0.9}],"stored":null}

Example 2. Transcript: "Honestly today was rough, nothing landed, I just needed to say it."
{"tickets":[],"stored":"A rough day, said out loud. Nothing asked for."}`;

const env = (name: string): string => String(import.meta.env[name] || process.env[name] || '').trim();

/** the minted federation token, per warm instance */
let minted: { token: string; until: number } | null = null;

/** The request's Claude credential as headers: a federated bearer token when federation is configured and Vercel
 *  handed this request its OIDC token, else the API key, else null (the caller falls back). Never logs a token. */
const credential = async (request: Request, signal: AbortSignal): Promise<Record<string, string> | null> => {
  const rule = env('ANTHROPIC_FEDERATION_RULE_ID');
  const org = env('ANTHROPIC_ORGANIZATION_ID');
  const account = env('ANTHROPIC_SERVICE_ACCOUNT_ID');
  const workspace = env('ANTHROPIC_WORKSPACE_ID');
  const assertion = request.headers.get('x-vercel-oidc-token') || '';
  if (rule && org && account && assertion) {
    if (minted && Date.now() < minted.until) return { authorization: `Bearer ${minted.token}` };
    try {
      const r = await fetch('https://api.anthropic.com/v1/oauth/token', {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion,
          federation_rule_id: rule,
          organization_id: org,
          service_account_id: account,
          ...(workspace ? { workspace_id: workspace } : {}),
        }),
      });
      if (r.ok) {
        const d = (await r.json()) as { access_token?: string; expires_in?: number };
        if (d.access_token) {
          minted = { token: d.access_token, until: Date.now() + Math.max(0, (Number(d.expires_in) || 0) - 60) * 1000 };
          return { authorization: `Bearer ${d.access_token}` };
        }
      }
      console.warn('[intake] exchange', r.status);                  // the status word only
    } catch (e) {
      console.warn('[intake] exchange', (e as Error)?.name === 'AbortError' ? 'timeout' : 'failed');
    }
  }
  const key = env('ANTHROPIC_API_KEY');
  return key ? { 'x-api-key': key } : null;
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const sameOrigin = (request: Request): boolean => {
  const site = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (origin && origin !== site) return false;
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
  return true;
};

/** Claude's text, with a stray code fence or a leading sentence stripped, parsed as JSON (or null). */
const parseJson = (text: string): unknown => {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
};

export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return json({ error: 'origin' }, 403);
  let text = '';
  try {
    const body = (await request.json()) as { text?: unknown };
    text = typeof body?.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : '';
  } catch { return json({ error: 'body' }, 400); }
  if (!text) return json({ error: 'empty' }, 400);
  if (text.length > INTAKE_MAX_CHARS) return json({ error: 'long', fallback: true }, 413);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), UPSTREAM_MS);
  try {
    const auth = await credential(request, ac.signal);
    if (!auth) return json({ error: 'no key', fallback: true }, 503);
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ac.signal,
      headers: { 'content-type': 'application/json', ...auth, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        system: SYSTEM,
        messages: [{ role: 'user', content: text }],
      }),
    });
    if (!r.ok) {
      console.warn('[intake] upstream', r.status);                 // the status word only: never the words spoken
      return json({ error: 'upstream', fallback: true }, 502);
    }
    const data = (await r.json()) as { content?: Array<{ type: string; text?: string }> };
    const out = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
    const result = validateResult(parseJson(out), 'claude');
    if (!result) { console.warn('[intake] malformed'); return json({ error: 'malformed', fallback: true }, 502); }
    return json(result);
  } catch (e) {
    console.warn('[intake]', (e as Error)?.name === 'AbortError' ? 'timeout' : 'failed');
    return json({ error: 'failed', fallback: true }, 502);
  } finally {
    clearTimeout(timer);
  }
};

export const GET: APIRoute = () => json({ error: 'method' }, 405);
