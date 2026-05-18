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
  RotationThisWeekResponse,
  RotationHistoryResponse,
  DiaryCandidatesResponse,
  PublicItemsResponse,
  SetPublicResponse,
  BucketAsset,
  BucketAssignResponse,
  BucketName,
  BucketsListFilters,
  BucketsListResponse,
  LineageResponse,
  PromoteToLiveResponse,
  QualityStar,
  QualityStarResponse,
  RevealInFinderResponse,
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

export type BrowseSort = "recent" | "oldest" | "longest" | "shortest" | "most-used";

export interface BrowseResponse {
  sort: BrowseSort;
  total: number;
  offset: number;
  results: Asset[];
}

export function browse(opts?: FetchOpts & {
  sort?: BrowseSort;
  limit?: number;
  offset?: number;
  category?: string;
  content_type?: string;
  public_only?: boolean;
}) {
  const params = new URLSearchParams();
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts?.offset !== undefined) params.set("offset", String(opts.offset));
  if (opts?.category && opts.category !== "all") params.set("category", opts.category);
  if (opts?.content_type && opts.content_type !== "all") params.set("content_type", opts.content_type);
  if (opts?.public_only) params.set("public_only", "true");
  const qs = params.toString();
  return call<BrowseResponse>(qs ? `/browse?${qs}` : "/browse", opts);
}

export function surprise(opts?: FetchOpts & { mark?: boolean; n?: number }) {
  const params = new URLSearchParams();
  if (opts?.n !== undefined) params.set("n", String(opts.n));
  if (opts?.mark === false) params.set("mark", "false");
  const qs = params.toString();
  return call<SurpriseResponse>(qs ? `/surprise?${qs}` : "/surprise", opts);
}

export function rotationThisWeek(opts?: FetchOpts) {
  return call<RotationThisWeekResponse>("/rotation/this-week", opts);
}

export function rotationHistory(opts?: FetchOpts & { limit?: number }) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return call<RotationHistoryResponse>(
    qs ? `/rotation/history?${qs}` : "/rotation/history",
    opts,
  );
}

export function diaryCandidates(opts?: FetchOpts & { limit?: number; minScore?: number }) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.minScore !== undefined) params.set("min_score", String(opts.minScore));
  const qs = params.toString();
  return call<DiaryCandidatesResponse>(
    qs ? `/diary/candidates?${qs}` : "/diary/candidates",
    opts,
  );
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

/** Stream a pre-generated waveform PNG. The engine's `/waveform/<sha1>.png`
 * endpoint serves files from `~/automation/data/waveforms/` on M1 (generated
 * by `~/automation/sweeper/`). Returns 404 when the PNG doesn't exist
 * (sweeper hasn't reached that file yet, or it's TCC-blocked, or the file
 * type isn't renderable); the caller forwards that to the browser and
 * BucketCard's `<img onerror>` falls back to a placeholder. */
export async function streamWaveform(
  sha1: string,
  init: { signal?: AbortSignal } = {},
): Promise<Response> {
  return fetch(`${BASE}/waveform/${sha1}.png`, {
    headers: { ...authHeaders() },
    signal: init.signal,
  });
}

export function publicItems(opts?: FetchOpts & { limit?: number }) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return call<PublicItemsResponse>(qs ? `/public?${qs}` : "/public", opts);
}

export async function setDisplayName(
  path: string,
  displayName: string | null,
  opts: FetchOpts = {},
): Promise<ApiResult<{ path: string; display_name: string | null }>> {
  return _post(`/items/display-name`, { path, display_name: displayName }, opts);
}

export async function setItemTrashed(
  path: string,
  trashed: boolean,
  opts: FetchOpts = {},
): Promise<ApiResult<{ path: string; trashed: boolean }>> {
  return _post(`/items/trashed`, { path, trashed }, opts);
}

export interface TrashResponse {
  total: number;
  offset: number;
  items: (Asset & { trashed_at: string })[];
}

export function trashList(opts?: FetchOpts & { limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts?.offset !== undefined) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return call<TrashResponse>(qs ? `/trash?${qs}` : "/trash", opts);
}

export function suggestName(path: string, opts?: FetchOpts) {
  const params = new URLSearchParams({ path });
  return call<{ path: string; suggested: string }>(
    `/items/suggest-name?${params}`,
    opts,
  );
}

export type StaleSort = "recent" | "oldest";

export interface StaleResponse {
  total: number;
  offset: number;
  sort: StaleSort;
  items: Asset[];
}

export function staleList(opts?: FetchOpts & {
  sort?: StaleSort;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts?.offset !== undefined) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return call<StaleResponse>(qs ? `/stale?${qs}` : "/stale", opts);
}

async function _post<T>(
  pathAndQuery: string,
  body: unknown,
  opts: FetchOpts = {},
): Promise<ApiResult<T>> {
  const url = `${BASE}${pathAndQuery}`;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  opts.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(body),
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

// ── Build 3 successor: Buckets (LIVE) ─────────────────────────────────────
// Wired to the M1 engine's /buckets/* routes (deployed 2026-05-17 evening).
// `waveform_path` values are engine-side filenames like `<sha1>.png`; the
// BucketCard formats them through `/api/console/waveform?sha1=<sha>` when
// rendering (see waveformSrc() in BucketCard.astro).

export async function getBucketsList(
  bucket: BucketName,
  filters: BucketsListFilters = {},
): Promise<ApiResult<BucketsListResponse>> {
  const params = new URLSearchParams({ bucket });
  if (filters.sort && filters.sort !== "recent") params.set("sort", filters.sort);
  if (filters.q) params.set("q", filters.q);
  if (filters.category && filters.category !== "all") params.set("category", filters.category);
  return call<BucketsListResponse>(`/buckets?${params}`);
}

export async function setBucket(
  asset_id: number,
  bucket: BucketName,
): Promise<ApiResult<BucketAssignResponse>> {
  return _post<BucketAssignResponse>("/buckets/assign", { asset_id, bucket });
}

export async function setQualityStar(
  asset_id: number,
  stars: QualityStar,
): Promise<ApiResult<QualityStarResponse>> {
  return _post<QualityStarResponse>("/buckets/quality-star", {
    asset_id,
    quality_star: stars,
  });
}

export async function getLineage(
  asset_id: number,
): Promise<ApiResult<LineageResponse>> {
  const params = new URLSearchParams({ asset_id: String(asset_id) });
  return call<LineageResponse>(`/buckets/lineage?${params}`);
}

export async function revealInFinder(
  asset_id: number,
): Promise<ApiResult<RevealInFinderResponse>> {
  return _post<RevealInFinderResponse>("/buckets/reveal-in-finder", { asset_id });
}

/** Promote a bucket=loop row into Live's browser. Loudnorm pass plus a
 *  small file write can take a few seconds; default _post timeout (5s) is
 *  too short for longer source files, so we bump to 90s here. */
export async function promoteToLive(
  asset_id: number,
): Promise<ApiResult<PromoteToLiveResponse>> {
  return _post<PromoteToLiveResponse>(
    "/buckets/promote-to-live",
    { asset_id },
    { timeoutMs: 90_000 },
  );
}

export async function setItemPublic(
  path: string,
  isPublic: boolean,
  opts: FetchOpts = {},
): Promise<ApiResult<SetPublicResponse>> {
  const url = `${BASE}/items/public`;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  opts.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ path, public: isPublic }),
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
    return { ok: true, data: (await res.json()) as SetPublicResponse };
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
