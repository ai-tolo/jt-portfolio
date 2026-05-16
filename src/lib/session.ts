// Session cookie helpers for The Console (private /portal route).
//
// Format: base64url(JSON{exp:number}) + "." + base64url(HMAC-SHA256)
// HMAC keyed with CONSOLE_SESSION_SECRET (env var).
//
// 30-day sliding window: every authenticated request reissues a fresh
// cookie with exp = now + 30d so an actively-used session never times out.
// An idle session past 30d is rejected and the user redirected to login.

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "portal_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface SessionPayload {
  exp: number;
}

// process.env is checked first so Vercel's runtime values win in prod.
// import.meta.env is the dev fallback (Astro/Vite loads .env into it but
// does not populate process.env). The build-time-inlined import.meta.env
// values are a dead branch in prod since process.env is already populated.
const importMeta = import.meta.env as Record<string, string | undefined>;

function getSecret(): string {
  const secret = process.env.CONSOLE_SESSION_SECRET ?? importMeta.CONSOLE_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "CONSOLE_SESSION_SECRET is not set. Generate with `openssl rand -hex 32` and add to .env (local) and Vercel.",
    );
  }
  return secret;
}

function getPassword(): string {
  const pw = process.env.CONSOLE_PASSWORD ?? importMeta.CONSOLE_PASSWORD;
  if (!pw) {
    throw new Error(
      "CONSOLE_PASSWORD is not set. Add it to .env (local) and Vercel project env vars.",
    );
  }
  return pw;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payload: string, secret: string): string {
  return b64urlEncode(createHmac("sha256", secret).update(payload).digest());
}

export function issueSession(): { value: string; expiresMs: number } {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload: SessionPayload = { exp };
  const encoded = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(encoded, getSecret());
  return { value: `${encoded}.${sig}`, expiresMs: exp };
}

/** Returns the parsed payload if the cookie is valid and unexpired,
 * otherwise null. Constant-time signature comparison. */
export function verifySession(raw: string | undefined | null): SessionPayload | null {
  if (!raw || typeof raw !== "string" || !raw.includes(".")) return null;
  const [encoded, sig] = raw.split(".", 2);
  if (!encoded || !sig) return null;

  let expected: string;
  try {
    expected = sign(encoded, getSecret());
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(b64urlDecode(encoded).toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
  if (typeof payload?.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}

/** Constant-time password compare. Lengths-differ shortcut runs in
 * constant time relative to the longer input. */
export function passwordMatches(submitted: string): boolean {
  const expected = getPassword();
  const a = Buffer.from(submitted, "utf8");
  const b = Buffer.from(expected, "utf8");
  // Pad shorter buffer so timingSafeEqual won't throw on mismatched lengths;
  // record the length difference and let it dominate the result.
  const len = Math.max(a.length, b.length);
  const ap = Buffer.alloc(len);
  const bp = Buffer.alloc(len);
  a.copy(ap);
  b.copy(bp);
  const eq = timingSafeEqual(ap, bp);
  return eq && a.length === b.length;
}
