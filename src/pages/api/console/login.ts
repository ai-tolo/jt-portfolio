import type { APIRoute } from "astro";
import { SESSION_COOKIE, issueSession, passwordMatches } from "../../../lib/session";

// Only allow same-origin internal paths as redirect destinations. Anything
// else falls back to /portal so a malicious ?next=https://evil.com can't
// hijack the flow.
function safeNext(raw: string | null): string {
  if (!raw) return "/portal";
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/portal";
    if (!decoded.startsWith("/portal")) return "/portal";
    return decoded;
  } catch {
    return "/portal";
  }
}

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  let password = "";
  let nextRaw: string | null = null;
  try {
    const form = await request.formData();
    password = String(form.get("password") ?? "");
    nextRaw = form.get("next") ? String(form.get("next")) : null;
  } catch {
    // bad form body, fall through to a generic error
  }

  if (!password || !passwordMatches(password)) {
    const next = nextRaw ? `&next=${encodeURIComponent(nextRaw)}` : "";
    return redirect(`/portal/login?error=1${next}`, 303);
  }

  const session = issueSession();
  cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresMs),
  });

  return redirect(safeNext(nextRaw), 303);
};
