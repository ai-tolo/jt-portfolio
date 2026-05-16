import { s as streamAsset } from './console-api_CNnaN5n_.mjs';

const FORWARD_HEADERS = /* @__PURE__ */ new Set([
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "last-modified"
]);
const GET = async ({ request, url }) => {
  const path = url.searchParams.get("path");
  if (!path) {
    return new Response(JSON.stringify({ error: "missing path" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }
  const range = request.headers.get("range");
  let upstream;
  try {
    upstream = await streamAsset(path, { range });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "unreachable", message: e instanceof Error ? e.message : "fetch failed" }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
  if (upstream.status === 404) {
    return new Response(JSON.stringify({ error: "not found in catalog" }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  }
  if (!upstream.ok && upstream.status !== 206 && upstream.status !== 416) {
    return new Response(
      JSON.stringify({ error: "upstream error", status: upstream.status }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
  const headers = new Headers();
  for (const [k, v] of upstream.headers) {
    if (FORWARD_HEADERS.has(k.toLowerCase())) headers.set(k, v);
  }
  headers.set("cache-control", "private, max-age=0, must-revalidate");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
