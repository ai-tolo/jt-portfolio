import { p as passwordMatches, i as issueSession, S as SESSION_COOKIE } from './session_B4-jQS-C.mjs';

function safeNext(raw) {
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
const POST = async ({ request, cookies, redirect, url }) => {
  let password = "";
  let nextRaw = null;
  try {
    const form = await request.formData();
    password = String(form.get("password") ?? "");
    nextRaw = form.get("next") ? String(form.get("next")) : null;
  } catch {
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
    expires: new Date(session.expiresMs)
  });
  return redirect(safeNext(nextRaw), 303);
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
