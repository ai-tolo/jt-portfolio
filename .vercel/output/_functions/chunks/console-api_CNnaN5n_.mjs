const BASE = (() => {
  const fromAstro = "http://macbook-pro-tolo:8765";
  return fromAstro;
})();
const DEFAULT_TIMEOUT_MS = 5e3;
async function call(pathAndQuery, opts = {}) {
  const url = `${BASE}${pathAndQuery}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  opts.signal?.addEventListener("abort", () => controller.abort(), { once: true });
  let res;
  try {
    res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
  } catch (e) {
    return {
      ok: false,
      error: {
        kind: "unreachable",
        message: e instanceof Error ? e.message : "fetch failed"
      }
    };
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    return {
      ok: false,
      error: { kind: "http", status: res.status, message: res.statusText }
    };
  }
  try {
    return { ok: true, data: await res.json() };
  } catch (e) {
    return {
      ok: false,
      error: {
        kind: "parse",
        message: e instanceof Error ? e.message : "invalid JSON"
      }
    };
  }
}
function stats(opts) {
  return call("/stats", opts);
}
function search(q, opts) {
  const params = new URLSearchParams({ q });
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  return call(`/search?${params}`, opts);
}
function surprise(opts) {
  return call("/surprise", opts);
}
function projects(opts) {
  return call("/projects", opts);
}
function assetByPath(path, opts) {
  const params = new URLSearchParams({ path });
  return call(`/assets/by-path?${params}`, opts);
}
async function streamAsset(path, init = {}) {
  const params = new URLSearchParams({ path });
  const headers = {};
  if (init.range) headers.Range = init.range;
  return fetch(`${BASE}/file?${params}`, { headers, signal: init.signal });
}

export { assetByPath as a, surprise as b, search as c, stats as d, projects as p, streamAsset as s };
