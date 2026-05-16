import { b as surprise } from './console-api_CNnaN5n_.mjs';

const GET = async () => {
  const result = await surprise();
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 502,
      headers: { "content-type": "application/json" }
    });
  }
  return new Response(JSON.stringify(result.data), {
    headers: { "content-type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
