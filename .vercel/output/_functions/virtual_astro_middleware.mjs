import { d as defineMiddleware, ae as sequence } from './chunks/params-and-props_C-Av644s.mjs';
import 'piccolore';
import 'clsx';
import { S as SESSION_COOKIE, v as verifySession, i as issueSession } from './chunks/session_B4-jQS-C.mjs';

const PUBLIC_PORTAL_PATHS = /* @__PURE__ */ new Set([
  "/portal/login",
  "/portal/login/",
  "/api/console/login"
]);
function isProtectedPath(pathname) {
  if (PUBLIC_PORTAL_PATHS.has(pathname)) return false;
  return pathname === "/portal" || pathname === "/portal/" || pathname.startsWith("/portal/") || pathname.startsWith("/api/console/");
}
const onRequest$1 = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect, request } = context;
  if (!isProtectedPath(url.pathname)) {
    return next();
  }
  const raw = cookies.get(SESSION_COOKIE)?.value;
  const session = verifySession(raw);
  if (!session) {
    if (url.pathname.startsWith("/api/console/")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" }
      });
    }
    const next2 = encodeURIComponent(url.pathname + url.search);
    return redirect(`/portal/login?next=${next2}`, 302);
  }
  const fresh = issueSession();
  cookies.set(SESSION_COOKIE, fresh.value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(fresh.expiresMs)
  });
  const response = await next();
  if (!url.pathname.startsWith("/api/")) {
    response.headers.set("x-robots-tag", "noindex, nofollow");
  }
  return response;
});

const onRequest = sequence(
	
	onRequest$1
	
);

export { onRequest };
