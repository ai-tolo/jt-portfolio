// Shapes returned by the Build 1 (Engine) FastAPI on the M1 at :8765.
// Modeled from probing the live endpoints on 2026-05-15. Optional fields
// (bpm, key, content_type, reasons) are nullable because the catalog
// currently contains 0 audio-analyzed items — those fields populate once
// analysis runs, but the UI must handle null today.

export interface HealthResponse {
  ok: boolean;
  assets: number;
}

export interface StatsCategory {
  category: string;
  files: number;
  hours: number;
  gb: number;
}

export interface StatsResponse {
  by_category: StatsCategory[];
  analysis: {
    transcribed: number;
    audio: number;
    visual: number;
  };
  public: number;
  content_dedup: {
    hashed: number;
    total: number;
    duplicate_rows: number;
  };
  als_projects: number;
}

export interface Asset {
  path: string;
  category: string;
  filename: string;
  modified: string;
  summary: string | null;
  tags: string | null;
  bpm: number | null;
  key: string | null;
  content_type: string | null;
  // Added 2026-05-16 — post-analyze_audio columns the engine may return.
  // All optional so existing surfaces don't break if the engine omits them.
  duration_seconds?: number | null;
  mood?: string | null;
  silence_ratio?: number | null;
  loop_density?: number | null;
  spectral_novelty?: number | null;
  source_type?: string | null;
  /** Set in the engine when an item has been transcribed. */
  transcribed?: 0 | 1 | null;
  /** Curator-set flag; items with `public=1` show on the public /sounds route. */
  public?: 0 | 1 | null;
  /** How many .als projects reference this asset's filename. Computed by
   * the engine per request from `als_projects.sample_refs`. */
  project_count?: number | null;
  /** Curator-set friendly name. Lives alongside the real filename; the file
   * on disk is never renamed. UI falls back to filename when this is null. */
  display_name?: string | null;
}

export interface SearchResponse {
  query: string;
  results: Asset[];
}

export interface SurpriseItem extends Asset {
  /** Objective-signal reasons the picker surfaced this item.
   * Field name assumed from spec; verify when /surprise returns items. */
  reasons?: string[];
}

export interface SurpriseResponse {
  n: number;
  current: { bpm: number | null; key: string | null };
  items: SurpriseItem[];
}

export interface AlsProject {
  path: string;
  name: string;
  modified: string;
  tempo?: number | null;
  scenes?: number | null;
  tracks?: number | null;
  samples?: string[] | null;
}

export interface ProjectsResponse {
  projects: AlsProject[];
}

export interface InboxResponse {
  inbox: "auto" | "curated";
  items: Asset[];
}

export type ApiError =
  | { kind: "unreachable"; message: string }
  | { kind: "http"; status: number; message: string }
  | { kind: "parse"; message: string };

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

// ── Spec types for upcoming Rotation + Diary endpoints ─────────────────────
// These shapes match the engine spec in console-build/engine-api/new-endpoints.md.
// The M1 engine does not yet implement these endpoints. Types live here so the
// portfolio client is ready to drop in once the engine ships them.

export interface RotationPick {
  asset: Asset;
  /** Objective signals describing why the picker chose this item. */
  reasons: string[];
  /** Ranking score 0..1, exposed for transparency. */
  score: number;
  /** ISO date of the Monday that starts this rotation week. */
  weekOf: string;
  /** When the pick was computed. */
  pickedAt: string;
}

export interface RotationThisWeekResponse {
  pick: RotationPick | null;
  pinned: boolean;
  /** Present iff pick is null; explains why. */
  emptyReason?: string;
}

export interface RotationHistoryEntry {
  weekOf: string;
  pickedAt: string;
  asset: Asset;
  pinned: boolean;
}

export interface RotationHistoryResponse {
  entries: RotationHistoryEntry[];
}

export interface LyricCandidate {
  asset: Asset;
  fragment: string;
  startSeconds: number;
  endSeconds: number;
  /** Heuristic score 0..1, higher = more lyric-like. */
  score: number;
  /** Why the heuristic flagged the fragment. */
  reasons: string[];
  /** Stable ID for dismiss/accept tracking. */
  id: string;
}

export interface DiaryCandidatesResponse {
  candidates: LyricCandidate[];
}

export interface DiaryActionResponse {
  ok: boolean;
}

// ── Public-state items surface ─────────────────────────────────────────────
// Items the curator has flagged public expose on a public route on uxjon.com.
// Same infrastructure as the portal; gating happens at the proxy layer.

export interface PublicItem extends Asset {
  palette?: Array<{ r: number; g: number; b: number }> | null;
  contrast?: number | null;
  warmth?: number | null;
}

export interface PublicItemsResponse {
  items: PublicItem[];
  count: number;
}

export interface SetPublicResponse {
  path: string;
  public: boolean;
}
