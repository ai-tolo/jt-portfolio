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
