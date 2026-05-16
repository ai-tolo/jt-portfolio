// Astro middleware. Runs on every request that hits the Vercel function
// (i.e. non-prerendered routes). Public pages are prerendered to static
// HTML and never traverse middleware — so this only sees Portal pages
// and /api/console/* routes.
//
// Gates anything under /portal or /api/console (except the login surfaces)
// behind a valid session cookie. Reissues the cookie on each valid
// request to implement the 30-day sliding window.

import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE, issueSession, verifySession } from "./lib/session";

const PUBLIC_PORTAL_PATHS = new Set<string>([
  "/portal/login",
  "/portal/login/",
  "/api/console/login",
]);

function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_PORTAL_PATHS.has(pathname)) return false;
  return (
    pathname === "/portal" ||
    pathname === "/portal/" ||
    pathname.startsWith("/portal/") ||
    pathname.startsWith("/api/console/")
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect, request } = context;

  if (!isProtectedPath(url.pathname)) {
    return next();
  }

  const raw = cookies.get(SESSION_COOKIE)?.value;
  const session = verifySession(raw);

  if (!session) {
    // API routes return 401 JSON. Pages redirect to login with ?next=...
    if (url.pathname.startsWith("/api/console/")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const next = encodeURIComponent(url.pathname + url.search);
    return redirect(`/portal/login?next=${next}`, 302);
  }

  // Slide the session forward. Reissue cookie so an active user never times out.
  const fresh = issueSession();
  cookies.set(SESSION_COOKIE, fresh.value, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    expires: new Date(fresh.expiresMs),
  });

  // Add a noindex header for Portal pages, defense in depth alongside the
  // meta tag in PortalLayout.
  const response = await next();
  if (!url.pathname.startsWith("/api/")) {
    response.headers.set("x-robots-tag", "noindex, nofollow");
  }
  return response;
});
