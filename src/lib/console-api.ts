// Server-only fetch helpers for the Build 1 (Engine) M1 API.
// Imported by /api/console/* routes and by Portal page frontmatter.
// MUST NOT be imported into any client-side script: doing so would
// leak the Tailscale base URL into the browser bundle.

import type {
  ApiResult,
  Asset,
  HealthResponse,
  InboxResponse,
  ProjectsResponse,
  SearchResponse,
  StatsResponse,
  SurpriseResponse,
} from "./console-types";

// process.env is checked first so Vercel's runtime env vars always win in
// prod. import.meta.env is the dev fallback (Astro/Vite loads .env into it,
// but does not populate process.env). The build-time-inlined import.meta.env
// values are a dead branch in prod since process.env is already populated.
const importMeta = import.meta.env as Record<string, string | undefined>;
const BASE =
  process.env.CONSOLE_API_BASE ?? importMeta.CONSOLE_API_BASE ?? "http://macbook-pro-tolo:8765";
const API_KEY =
  process.env.CONSOLE_API_KEY ?? importMeta.CONSOLE_API_KEY ?? "";

const DEFAULT_TIMEOUT_MS = 5_000;

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

function authHeaders(): Record<string, string> {
  return API_KEY ? { authorization: `Bearer ${API_KEY}` } : {};
}

async function call<T>(pathAndQuery: string, opts: FetchOpts = {}): Promise<ApiResult<T>> {
  const url = `${BASE}${pathAndQuery}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  // Forward an external abort signal if provided.
  opts.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", ...authHeaders() },
    });
  } catch (e) {
    return {
      ok: false,
      error: {
        kind: "unreachable",
        message: e instanceof Error ? e.message : "fetch failed",
      },
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    return {
      ok: false,
      error: { kind: "http", status: res.status, message: res.statusText },
    };
  }

  try {
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    return {
      ok: false,
      error: {
        kind: "parse",
        message: e instanceof Error ? e.message : "invalid JSON",
      },
    };
  }
}

export function getApiBase(): string {
  return BASE;
}

export function health(opts?: FetchOpts) {
  return call<HealthResponse>("/health", opts);
}

export function stats(opts?: FetchOpts) {
  return call<StatsResponse>("/stats", opts);
}

export function search(q: string, opts?: FetchOpts & { limit?: number; offset?: number }) {
  const params = new URLSearchParams({ q });
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  return call<SearchResponse>(`/search?${params}`, opts);
}

export function surprise(opts?: FetchOpts) {
  return call<SurpriseResponse>("/surprise", opts);
}

export function projects(opts?: FetchOpts) {
  return call<ProjectsResponse>("/projects", opts);
}

export function inboxAuto(opts?: FetchOpts) {
  return call<InboxResponse>("/inbox/auto", opts);
}

export function inboxCurated(opts?: FetchOpts) {
  return call<InboxResponse>("/inbox/curated", opts);
}

export function assetByPath(path: string, opts?: FetchOpts) {
  const params = new URLSearchParams({ path });
  return call<Asset>(`/assets/by-path?${params}`, opts);
}

/** Stream a catalog file. Returns the raw Response so the caller can
 * forward Content-Type, Content-Length, Content-Range to the browser.
 * Caller must enforce auth before calling this. */
export async function streamAsset(
  path: string,
  init: { range?: string | null; signal?: AbortSignal } = {},
): Promise<Response> {
  const params = new URLSearchParams({ path });
  const headers: Record<string, string> = { ...authHeaders() };
  if (init.range) headers.Range = init.range;
  return fetch(`${BASE}/file?${params}`, { headers, signal: init.signal });
}
