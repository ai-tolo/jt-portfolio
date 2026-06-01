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
  BucketView,
  ExtractLoopResponse,
  LineageResponse,
  PendingPrintsResponse,
  PrintLinkResponse,
  PromoteCandidatesResponse,
  PromoteToLiveResponse,
  QualityStar,
  QualityStarResponse,
  RevealInFinderResponse,
  SplitStemsResponse,
  SplitStemsStatus,
  StemSplitMode,
  TopTagsResponse,
  CreateMixJobResponse,
  MixJobSummary,
  WinnersResponse,
  ChampionResponse,
  DismissResponse,
  PublishKingResponse,
  SoundsResponse,
  SoundsUpdateResponse,
  MixJobsListResponse,
  MixPairsResponse,
  MixJudgementResponse,
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

export interface StatusJob {
  name: string;
  pid: number | null;
  running: boolean;
  progress: [number, number] | null;
  log_mtime: number | null;
  /** Estimated seconds remaining for this job's current run. Null when the
   * engine hasn't seen ≥3 rows of forward progress yet (avoids nonsense
   * estimates right after a job starts or after an engine restart). */
  eta_seconds?: number | null;
}

/** Remote worker (e.g. M3 transcribe loop) reporting in via POST
 * /worker-status. Stale entries (>5 min since last heartbeat) are filtered
 * out engine-side. */
export interface StatusWorker {
  worker_id: string;
  rows_done: number;
  rows_total: number;
  current_row: string;
  eta_seconds: number | null;
  last_heartbeat_age_sec: number;
}

export interface StatusResponse {
  ts: number;
  jobs: StatusJob[];
  catalog: {
    total_user: number;
    transcribed: number;
    dup_flagged: number;
    orphan_flagged: number;
    display_named: number;
  };
  disk: {
    internal_pct_used: number | null;
    t7_pct_used: number | null;
  };
  /** Remote workers with a heartbeat in the last 5 min. Empty when none
   * are running. Always present on responses from engines that ship the
   * worker-status feature; older engines may omit it. */
  workers?: StatusWorker[];
}

export function status(opts?: FetchOpts) {
  return call<StatusResponse>("/status", opts);
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

/** Prints noticed by the M3 watcher (com.tolo.prints-watcher) that have
 *  not yet been linked to a specific .als project. Returned with top-3
 *  recent .als suggestions per row. */
export function getPendingPrints(opts?: FetchOpts) {
  return call<PendingPrintsResponse>("/prints/pending", opts);
}

export function linkPrint(path: string, project_asset_id: number) {
  return _post<PrintLinkResponse>("/prints/link", { path, project_asset_id });
}

export function unlinkPrint(asset_id: number) {
  return _post<{ ok: boolean; asset_id: number }>("/prints/unlink", { asset_id });
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
  init: { range?: string | null; variant?: string | null; signal?: AbortSignal } = {},
): Promise<Response> {
  const params = new URLSearchParams({ path });
  if (init.variant) params.set("variant", init.variant);
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

/** Stream a pre-generated mel-spectrogram PNG. The engine's
 * `/spectrogram/<sha1>.png` endpoint serves files from
 * `~/automation/data/spectrograms/` (rendered by
 * `scripts/generate_spectrograms.py`). Returns 404 for rows whose spectrogram
 * hasn't been generated yet (~25% as of 2026-05-21); the caller forwards
 * that and BucketCard's `<img onerror>` hides the surrounding details. */
export async function streamSpectrogram(
  sha1: string,
  init: { signal?: AbortSignal } = {},
): Promise<Response> {
  return fetch(`${BASE}/spectrogram/${sha1}.png`, {
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

export async function setItemTags(
  path: string,
  tags: string[],
  opts: FetchOpts = {},
): Promise<ApiResult<{ path: string; tags: string | null }>> {
  return _post(`/items/tags`, { path, tags }, opts);
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
  bucket: BucketView,
  filters: BucketsListFilters = {},
): Promise<ApiResult<BucketsListResponse>> {
  const params = new URLSearchParams({ bucket });
  if (filters.sort && filters.sort !== "recent") params.set("sort", filters.sort);
  if (filters.q) params.set("q", filters.q);
  if (filters.category && filters.category !== "all") params.set("category", filters.category);
  if (filters.tags) params.set("tags", filters.tags);
  if (filters.focus) params.set("focus", String(filters.focus));
  if (filters.duration_min !== undefined) params.set("duration_min", String(filters.duration_min));
  if (filters.duration_max !== undefined) params.set("duration_max", String(filters.duration_max));
  if (filters.offset) params.set("offset", String(filters.offset));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  return call<BucketsListResponse>(`/buckets?${params}`);
}

/** Ranked list of loops ready for promote-to-Live. Engine ranks by a
 *  composite score: BPM + key set, 1.5–8s duration, high loop_density.
 *  Already-promoted rows (live_loop_path set) are excluded server-side. */
export async function getPromoteCandidates(
  limit = 100,
): Promise<ApiResult<PromoteCandidatesResponse>> {
  const params = new URLSearchParams({ limit: String(limit) });
  return call<PromoteCandidatesResponse>(`/buckets/promote-candidates?${params}`);
}

/** Top N tags by frequency for the current bucket+category view. The set
 *  is computed BEFORE the active tag filter is applied so the chip strip
 *  remains stable as the curator AND-narrows. */
export async function getTopTags(
  bucket: BucketView,
  category?: string,
  limit = 10,
): Promise<ApiResult<TopTagsResponse>> {
  const params = new URLSearchParams({ bucket, limit: String(limit) });
  if (category && category !== "all") params.set("category", category);
  return call<TopTagsResponse>(`/buckets/top-tags?${params}`);
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

/** Increment kudos on an asset by 1. Returns the new total. */
export async function bumpKudos(
  asset_id: number,
): Promise<ApiResult<{ asset_id: number; kudos: number }>> {
  return _post<{ asset_id: number; kudos: number }>("/buckets/kudos", {
    asset_id,
  });
}

export async function getLineage(
  asset_id: number,
): Promise<ApiResult<LineageResponse>> {
  const params = new URLSearchParams({ asset_id: String(asset_id) });
  return call<LineageResponse>(`/buckets/lineage?${params}`);
}

export interface DupGroupResponse {
  asset_id: number;
  content_sha1: string | null;
  siblings: (BucketAsset & { is_canonical?: boolean })[];
}

export async function getDupGroup(
  asset_id: number,
): Promise<ApiResult<DupGroupResponse>> {
  const params = new URLSearchParams({ asset_id: String(asset_id) });
  return call<DupGroupResponse>(`/buckets/dup-group?${params}`);
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

/** Carve a [start_sec, end_sec] region of a source jam into a new loop row
 *  via the engine's ffmpeg loudnorm pipeline. New row carries
 *  parent_id=<source asset_id> + category='extracted-from-jam' so the
 *  lineage chip on the resulting card points back to the jam. Bumped
 *  timeout to 30s since ffmpeg can be slow on long source files / first
 *  iCloud fetch. */
export async function extractLoop(
  asset_id: number,
  start_sec: number,
  end_sec: number,
  label?: string,
): Promise<ApiResult<ExtractLoopResponse>> {
  const body: Record<string, unknown> = { asset_id, start_sec, end_sec };
  if (label) body.label = label;
  return _post<ExtractLoopResponse>("/buckets/extract-loop", body, {
    timeoutMs: 30_000,
  });
}

export interface SilenceBoundsResponse {
  asset_id: number;
  start_sec: number;
  end_sec: number;
  source_duration: number;
  silence_ratio: number;
  detected: boolean;
  ranges?: [number, number][];
  reason?: string;
}

/** ffmpeg silencedetect on the source file; returns inner non-silent bounds.
 *  Powers the "↹ Trim to content" button in the crop tab. ~1-3s call. */
export async function getSilenceBounds(
  asset_id: number,
): Promise<ApiResult<SilenceBoundsResponse>> {
  return call<SilenceBoundsResponse>(
    `/buckets/silence-bounds?asset_id=${asset_id}`,
    { timeoutMs: 95_000 },
  );
}

export interface TranscriptSegment {
  start: number | null;
  end: number | null;
  text: string;
}

export interface TranscriptResponse {
  asset_id: number;
  text: string;
  segments: TranscriptSegment[];
  char_count: number;
  source: "json" | "txt";
}

/** Read the on-disk mlx-whisper transcript for an asset. Lazy-loaded
 *  by the BucketCard's "show transcript" disclosure. 404 when the row
 *  was never transcribed (or transcripts dir not mounted, e.g. T7
 *  unplugged). */
export async function getTranscript(
  asset_id: number,
): Promise<ApiResult<TranscriptResponse>> {
  return call<TranscriptResponse>(
    `/buckets/transcript?asset_id=${asset_id}`,
    { timeoutMs: 15_000 },
  );
}

export interface PromoteCropResponse {
  ok: boolean;
  crop_asset_id: number;
  source_asset_id: number;
  project_refs: number;
}

/** Promote an extracted-from-jam child to canonical: source moves to Trash,
 *  source.dup_of = crop.rowid so the dup-group view stays queryable.
 *  Engine refuses (409) when source is referenced by .als projects unless
 *  force=true. */
export async function promoteCrop(
  crop_asset_id: number,
  force: boolean = false,
): Promise<ApiResult<PromoteCropResponse>> {
  return _post<PromoteCropResponse>("/buckets/promote-crop", {
    crop_asset_id,
    force,
  });
}

/** Kick off a Demucs stem-splitting job. Engine spawns the worker via
 *  subprocess.Popen and returns a job_id immediately; the UI then polls
 *  via getSplitStemsStatus() every 5s. */
export async function splitStems(
  asset_id: number,
  mode: StemSplitMode,
): Promise<ApiResult<SplitStemsResponse>> {
  return _post<SplitStemsResponse>("/buckets/split-stems", { asset_id, mode });
}

/** Poll a stem-splitting job's status. On status='done' the response
 *  includes the new stem_asset_ids (already inserted into the assets table
 *  with parent_id pointing back to the source row). */
export async function getSplitStemsStatus(
  job_id: number,
): Promise<ApiResult<SplitStemsStatus>> {
  const params = new URLSearchParams({ job_id: String(job_id) });
  return call<SplitStemsStatus>(`/buckets/split-stems/${job_id}?${params}`);
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

// ── Engineer (Build 5) ────────────────────────────────────────────────────
/** List recent mix jobs (newest first). */
export async function listMixJobs(
  limit = 50,
): Promise<ApiResult<MixJobsListResponse>> {
  const params = new URLSearchParams({ limit: String(limit) });
  return call<MixJobsListResponse>(`/mix/jobs?${params}`);
}

/** Enqueue a new mix job for the given asset. Returns immediately with
 *  job_id; the engineer-worker daemon picks it up on its next poll.
 *
 *  Phase 2: pass retry_axis + feedback_text to queue a focused retry that
 *  re-renders just that axis's two poles with the curator's notes baked
 *  into the planner prompt. parent_job_id is bookkeeping only. */
export async function createMixJob(
  source_asset_id: number,
  opts: {
    retry_axis?: string | null;
    feedback_text?: string | null;
    parent_job_id?: number | null;
  } = {},
): Promise<ApiResult<CreateMixJobResponse>> {
  const body: Record<string, unknown> = { source_asset_id };
  if (opts.retry_axis) body.retry_axis = opts.retry_axis;
  if (opts.feedback_text) body.feedback_text = opts.feedback_text;
  if (opts.parent_job_id) body.parent_job_id = opts.parent_job_id;
  return _post<CreateMixJobResponse>("/mix/jobs/create", body);
}

export async function getMixJob(
  job_id: number,
): Promise<ApiResult<MixJobSummary>> {
  return call<MixJobSummary>(`/mix/jobs/${job_id}`);
}

/** Next A/B pairs awaiting judgement, across all 'ready' jobs. */
export async function listMixPairs(
  limit = 10,
): Promise<ApiResult<MixPairsResponse>> {
  const params = new URLSearchParams({ limit: String(limit) });
  return call<MixPairsResponse>(`/mix/pairs?${params}`);
}

export async function postMixJudgement(body: {
  job_id: number;
  variant_a_id: number;
  variant_b_id: number;
  chosen_variant_id: number | null;
  /** True when ORIGINAL beat both variants for this axis. chosen_variant_id
   *  must be null in the same request. Phase 5, 2026-05-27. */
  chose_original?: boolean;
  axis?: string | null;
  comment?: string | null;
}): Promise<ApiResult<MixJudgementResponse>> {
  return _post<MixJudgementResponse>("/mix/judgement", body);
}

/** Undo a recent judgement by hard-deleting the row. Surfaced as a
 *  5-second Cmd/Ctrl+Z window in the Engineer UI. */
export async function withdrawMixJudgement(
  judgement_id: number,
): Promise<ApiResult<{ ok: true; withdrawn_id: number }>> {
  return _post<{ ok: true; withdrawn_id: number }>(
    `/mix/judgement/${judgement_id}/withdraw`,
    {},
  );
}

/** Per-job winners surface. include_partial=true returns jobs with 1-2
 *  decided axes alongside fully decided 3-of-3 jobs. */
export async function listMixWinners(
  opts: { include_partial?: boolean; limit?: number } = {},
): Promise<ApiResult<WinnersResponse>> {
  const params = new URLSearchParams({
    include_partial: String(opts.include_partial ?? true),
    limit: String(opts.limit ?? 50),
  });
  return call<WinnersResponse>(`/mix/winners?${params}`);
}

/** Crown a winner as the cross-axis champion for a job. Pass
 *  variant_id=null to clear. The variant must already be a winner of
 *  one of the job's axes. Optional `comment` captures curator feedback
 *  the planner can use on future "Make more mixes" jobs. */
export async function setMixChampion(
  job_id: number,
  variant_id: number | null,
  comment?: string | null,
): Promise<ApiResult<ChampionResponse>> {
  const body: Record<string, unknown> = { job_id, variant_id };
  if (comment && comment.trim()) body.comment = comment.trim();
  return _post<ChampionResponse>("/mix/champion", body);
}

/** Crown ORIGINAL (the unprocessed source) as the king for a job —
 *  declaring the source beats every variant. The engine sets
 *  mix_jobs.champion_is_original=1 and synchronously spawns a fresh
 *  make-more job for the same source, returning its job_id in
 *  spawned_job_id. Phase 5, 2026-05-27. */
export async function crownOriginal(
  job_id: number,
  comment?: string | null,
): Promise<ApiResult<ChampionResponse>> {
  const body: Record<string, unknown> = {
    job_id,
    variant_id: null,
    is_original: true,
  };
  if (comment && comment.trim()) body.comment = comment.trim();
  return _post<ChampionResponse>("/mix/champion", body);
}

/** Soft-hide a mix job from the Winners surface. Pass dismissed=false
 *  to un-dismiss. Variants + judgements + king pick stay intact. */
export async function dismissMixJob(
  job_id: number,
  dismissed = true,
): Promise<ApiResult<DismissResponse>> {
  return _post<DismissResponse>("/mix/dismiss", { job_id, dismissed });
}

/** Flip `public` on the king variant's asset for a job. Optional
 *  `collection` sets the Sounds-grouping label on the same row. */
export async function publishMixKing(
  job_id: number,
  publish: boolean,
  collection?: string | null,
): Promise<ApiResult<PublishKingResponse>> {
  const body: Record<string, unknown> = { job_id, publish };
  if (collection !== undefined) body.collection = collection;
  return _post<PublishKingResponse>("/mix/publish-king", body);
}

// ── Sounds (curator staging surface) ─────────────────────────────────────
/** Curator-side listing of all public-flagged assets, with lineage to
 *  the king variant's source track + collection grouping. */
export async function listSounds(): Promise<ApiResult<SoundsResponse>> {
  return call<SoundsResponse>("/sounds/list");
}

/** Update collection label or flip public on a Sounds asset. Pass
 *  collection="" to clear the grouping label. */
export async function updateSoundsAsset(
  asset_id: number,
  opts: { public?: boolean; collection?: string | null } = {},
): Promise<ApiResult<SoundsUpdateResponse>> {
  const body: Record<string, unknown> = { asset_id };
  if (opts.public !== undefined) body.public = opts.public;
  if (opts.collection !== undefined) body.collection = opts.collection;
  return _post<SoundsUpdateResponse>("/sounds/update", body);
}
