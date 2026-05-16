import { timingSafeEqual, createHmac } from 'node:crypto';

const SESSION_COOKIE = "portal_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
function getSecret() {
  const fromAstro = "66ca8227541cbbf16742c63a85134e9b191110b2f73f52393c4b99b87d675092";
  const secret = fromAstro;
  return secret;
}
function getPassword() {
  const fromAstro = "dev";
  const pw = fromAstro;
  return pw;
}
function b64urlEncode(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - s.length % 4);
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}
function sign(payload, secret) {
  return b64urlEncode(createHmac("sha256", secret).update(payload).digest());
}
function issueSession() {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = { exp };
  const encoded = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(encoded, getSecret());
  return { value: `${encoded}.${sig}`, expiresMs: exp };
}
function verifySession(raw) {
  if (!raw || typeof raw !== "string" || !raw.includes(".")) return null;
  const [encoded, sig] = raw.split(".", 2);
  if (!encoded || !sig) return null;
  let expected;
  try {
    expected = sign(encoded, getSecret());
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(b64urlDecode(encoded).toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload?.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}
function passwordMatches(submitted) {
  const expected = getPassword();
  const a = Buffer.from(submitted, "utf8");
  const b = Buffer.from(expected, "utf8");
  const len = Math.max(a.length, b.length);
  const ap = Buffer.alloc(len);
  const bp = Buffer.alloc(len);
  a.copy(ap);
  b.copy(bp);
  const eq = timingSafeEqual(ap, bp);
  return eq && a.length === b.length;
}

export { SESSION_COOKIE as S, issueSession as i, passwordMatches as p, verifySession as v };
