import { a as assetByPath } from './console-api_CNnaN5n_.mjs';

const GET = async ({ url }) => {
  const path = url.searchParams.get("path");
  if (!path) {
    return new Response(JSON.stringify({ error: "missing path" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }
  const result = await assetByPath(path);
  if (!result.ok) {
    const status = result.error.kind === "http" ? result.error.status : 502;
    return new Response(JSON.stringify({ error: result.error }), {
      status,
      headers: { "content-type": "application/json" }
    });
  }
  return new Response(JSON.stringify(result.data), {
    headers: { "content-type": "application/json", "cache-control": "private, max-age=60" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
