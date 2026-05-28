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
  asset_id: number;
  path: string;
  filename: string;
  display_name?: string | null;
  bucket?: string | null;
  modified: string;
  last_modified: string;
  discarded_at?: string | null;
  tempo?: number | null;
  key_signature?: string | null;
  time_signature?: string | null;
  scene_names?: string[];
  track_names?: string[];
  sample_count?: number;
  sample_refs?: string[];
  samples?: string[];
  samples_truncated?: boolean;
  /** Absolute path to an auto-detected bounced render of this project,
   * or null if none was found. Engine walks the .als parent dir for any
   * audio file and picks the largest. Today only ~5/212 projects have
   * one — the rest will need an explicit bounce or manual path entry. */
  bounced_track_path?: string | null;
  /** How many catalog assets are linked to this project via Print Capture
   * (assets.print_of_project_id = this project's asset_id, non-discarded). */
  print_count?: number;
  /** Full metadata for prints attached to this project, sorted newest
   * first. Surfaces in the inline print player on the project card. */
  linked_prints?: LinkedPrint[];
  /** Prints from OTHER projects that this project samples — detected by
   * matching this project's sample_refs against known print filenames.
   * Creates the "Built from: [print of X]" chain that powers
   * mastering-pass and remix lineage. */
  built_from_prints?: BuiltFromPrint[];
}

export interface LinkedPrint {
  asset_id: number;
  path: string;
  filename: string;
  display_name?: string | null;
  modified?: string | null;
  duration_seconds?: number | null;
  waveform_path?: string | null;
}

export interface BuiltFromPrint {
  print_asset_id: number;
  print_filename: string;
  print_display_name?: string | null;
  source_project_asset_id: number;
  source_project_filename?: string | null;
}

export interface ProjectsResponse {
  projects: AlsProject[];
}

/** A .als project surfaced as a candidate parent for an unmatched print.
 *  Returned by /prints/pending for each pending row. */
export interface PrintProjectSuggestion {
  asset_id: number;
  filename: string;
  display_name?: string | null;
  modified?: string | null;
  tempo?: number | null;
}

/** A print awaiting curator confirmation. The M3 watcher noticed it in
 *  the iCloud inbox; the curator picks which .als it came from. */
export interface PendingPrint {
  path: string;
  filename: string;
  size_bytes: number;
  mtime: number;
  noticed_at: string;
  suggestions: PrintProjectSuggestion[];
  /** Engine clusters prints whose mtimes fall within 5min of each other
   *  into the same group_id. The UI shows a single "link all" gesture
   *  for groups of 2+ to handle iterate-and-bounce sessions cleanly. */
  group_id: number;
  group_size: number;
}

export interface PendingPrintsResponse {
  total: number;
  items: PendingPrint[];
}

export interface PrintLinkResponse {
  ok: boolean;
  print_asset_id: number;
  project_asset_id: number;
  print_path: string;
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

// ── Build 3 successor: Buckets ─────────────────────────────────────────────
// Spec: triage surface that lets the curator assign every catalog row to one
// of four buckets (Voice Memos / Loops / Songs / Trash) plus a default Inbox
// bin. The engine columns referenced here (bucket, quality_star,
// waveform_path, parent_id, discarded_at) ship with M1 Task A; the UI is
// scaffolded against mocks first so it can iterate while the engine work
// proceeds in parallel.

/** Curator-assigned bucket — the per-row state set via the BucketCard
 *  action bar. Vocabulary matches the Category heuristic chips so the
 *  triage actions speak the same language as the browse filters. The
 *  prior `voice_memo / loop / song` values were renamed to `field /
 *  loops / tracks` on 2026-05-18; existing rows were migrated server-side. */
export type BucketName = "inbox" | "jam" | "loops" | "field" | "tracks" | "trash";

/** URL view of the Buckets page: all assignable buckets plus the
 *  unified `"all"` view. */
export type BucketView = BucketName | "all";

/** User-facing filter taxonomy (replaced the prior Source + content_type
 *  + Stars chips on 2026-05-17 evening; see Notion: Console (Build)). */
export type BucketCategory = "all" | "jam" | "loops" | "field" | "tracks" | "other";

/** Legacy SOURCE enum kept for type compat on BucketAsset.source_type;
 *  no longer a user-facing filter. */
export type BucketSource = "voice_memo" | "jam" | "video_extract" | "other";

export type QualityStar = 0 | 1 | 2 | 3;

export type BucketSort =
  | "recent"
  | "oldest"
  | "longest"
  | "shortest"
  | "most-used"
  | "least-used"
  | "bpm-asc"
  | "bpm-desc"
  | "silence-desc"
  | "kudos";

export interface BucketAsset {
  /** Stable engine row id. Required for assignment/lineage POSTs. */
  asset_id: number;
  /** Absolute path on the M1 catalog volume. */
  path: string;
  display_name: string | null;
  /** Null is treated as Inbox by the UI. */
  bucket: BucketName | null;
  quality_star: QualityStar;
  /** Public-relative path to the pre-generated waveform PNG, or null. */
  waveform_path: string | null;
  /** Engine row id of the parent asset (a voice memo or video this row was
   *  extracted from). Null for top-level rows. */
  parent_id: number | null;
  source_type: BucketSource | null;
  duration_seconds: number | null;
  bpm: number | null;
  key: string | null;
  tags: string | null;
  /** ISO timestamp when the curator moved this row to the trash bucket. */
  discarded_at: string | null;
  /** Absolute path on M1 to the normalized WAV in
   *  `_Soundbending/loops/`. Set after a successful promote-to-live. */
  live_loop_path?: string | null;
  /** Basename of `path` — included in the response so the rename
   *  handler can fall back to it when display_name is null. */
  filename?: string | null;
  /** Curator-set flag; mirrors `Asset.public`. Drives the public toggle. */
  public?: 0 | 1 | null;
  /** librosa-classified or curator-set; used for the content_type filter. */
  content_type?: string | null;
  /** Whisper/LLM-derived one-liner if present. */
  summary?: string | null;
  /** Count of `als_projects.sample_refs` matching this filename. */
  project_count?: number | null;
  /** Rowid of the canonical row when this is a duplicate; NULL if
   *  unique or canonical. Set by `scripts/find_duplicates.py`. */
  dup_of?: number | null;
  /** Total rows sharing this row's `content_sha1`, including this row.
   *  Surfaced on the DUP badge so curators see group size before trashing
   *  ("DUP (4)" instead of an unannotated "DUP"). */
  dup_count?: number | null;
  /** SHA1 of file contents. Engine computes during ingest; same value
   *  across copies on different drives. */
  content_sha1?: string | null;
  /** 1 if `scripts/find_orphans.py` flagged this as a safe-to-trash
   *  candidate (not referenced in any project, never auditioned, no
   *  curator classification). */
  orphan_candidate?: 0 | 1 | null;
  /** ISO timestamp the asset file was last modified. Surfaced by the
   *  engine so the bucket card can show its temporal anchor without a
   *  filename-parse fallback. */
  modified?: string | null;
  /** Librosa-derived. Available on listing responses where the row has
   *  been analyzed; null otherwise. Used in the expanded panel's Tech row
   *  to give long-form rows something to show when summary is empty. */
  loop_density?: number | null;
  silence_ratio?: number | null;
  /** Parent-row fields populated when this row has parent_id !== null and
   *  came through the bucket listing endpoint (engine LEFT JOINs to the
   *  parent's row). Drives:
   *    - date inheritance: extracted-from-video children show the parent's
   *      modified instead of the extraction timestamp
   *    - rich lineage chip: parent name + bucket + duration shown inline
   *      without needing to fetch /buckets/lineage first
   *    - clickable navigation back to the parent's bucket page. */
  parent_modified?: string | null;
  parent_filename?: string | null;
  parent_display_name?: string | null;
  parent_bucket?: BucketName | null;
  parent_duration_seconds?: number | null;
  parent_category?: string | null;
  /** Print Capture: rowid of the .als project this asset was printed
   *  from, null if this isn't a print. Drives the "Print of [project]"
   *  lineage chip on BucketCard. */
  print_of_project_id?: number | null;
  /** Resolved alongside print_of_project_id on listing endpoints — the
   *  project's filename + display_name, surfaced so the chip can render
   *  the parent name without a follow-up fetch. */
  print_of_filename?: string | null;
  print_of_display_name?: string | null;
}

export interface PromoteToLiveResponse {
  asset_id: number;
  live_loop_path: string;
  wav_path: string;
  /** Always null in Phase 1 (.wav-only). Phase 2 will populate once we have
   *  an authoritative .alc template from Live's Save-as-Audio-Clip. */
  alc_path: string | null;
  normalized: boolean;
  sourcestem: string;
  filename: string;
}

export interface BucketsListFilters {
  sort?: BucketSort;
  /** Free-text search across path, filename, display_name, tags. */
  q?: string;
  /** Single Category filter (replaces Source + Type chips). */
  category?: BucketCategory;
  /** Comma-separated tag tokens; AND semantics (each must match). */
  tags?: string;
  /** Pin this asset_id at the top of the inner sort so it's guaranteed
   *  inside the LIMIT 200 window. Used when arriving via ↗ Open-in-Buckets
   *  links from Winners cards / lineage chips so the scroll-target row
   *  is always in the rendered DOM. */
  focus?: number;
}

export interface TopTag {
  tag: string;
  count: number;
}

export interface TopTagsResponse {
  bucket: BucketName | "all";
  category: BucketCategory | "";
  total_rows_with_tags: number;
  tags: TopTag[];
}

export interface BucketsListResponse {
  bucket: BucketName;
  total: number;
  items: BucketAsset[];
}

export interface PromoteCandidatesResponse {
  total_candidates: number;
  returned: number;
  items: BucketAsset[];
}

export interface BucketAssignResponse {
  asset_id: number;
  bucket: BucketName;
}

export interface QualityStarResponse {
  asset_id: number;
  quality_star: QualityStar;
}

export interface LineageResponse {
  asset_id: number;
  parent: BucketAsset | null;
  children: BucketAsset[];
}

// ── Jam slicer (extract-loop) ─────────────────────────────────────────────
// Engine carves a [start_sec, end_sec] region of a source asset into a new
// row via ffmpeg loudnorm, inserted with parent_id=<source> and
// category='extracted-from-jam' so the BucketCard lineage chip chains back
// to the jam. Engine endpoint: POST /buckets/extract-loop.

export interface ExtractLoopResponse {
  ok: true;
  new_asset_id: number;
  output_path: string;
  duration_sec: number;
}

// ── Stem splitter (Demucs) ────────────────────────────────────────────────
// POST kicks off a background Demucs job and returns a job_id immediately;
// the UI then polls /buckets/split-stems/{job_id} every 5s. On done, the
// engine has already inserted the new stem rows with parent_id=<source>
// and content_type in {'drums','bass','vocals','other'} — siblings show via
// the existing lineage chip + dup-group surfaces.

export type StemSplitMode = "2" | "4";

export interface SplitStemsResponse {
  ok: true;
  job_id: number;
}

export type SplitStemsJobStatus = "running" | "done" | "failed";

export interface SplitStemsStatus {
  job_id: number;
  status: SplitStemsJobStatus;
  /** 0..1, set by the worker as it progresses through Demucs stages. */
  progress?: number;
  /** Set when status='failed'. */
  error?: string;
  /** Set when status='done' — rowids of the new sibling asset rows. */
  stem_asset_ids?: number[];
}

export interface RevealInFinderResponse {
  asset_id: number;
  ok: boolean;
  /** Engine returns the absolute path it asked Finder to reveal, for
   *  display in the UI. */
  revealed_path: string | null;
}

// ── Engineer (Build 5) ────────────────────────────────────────────────────
// Mix-agent lifecycle: curator clicks "Send to Engineer" on a Bucket card,
// engine inserts a mix_jobs row, the engineer-worker daemon on M1 picks it
// up, ensures stems exist (or falls back to single-file mastering), renders
// six variants along three taste axes (focal, space, dynamics), and writes
// variant assets + mix_variants rows. The Engineer page polls /mix/jobs
// and surfaces 'ready' jobs as A/B pairs via /mix/pairs.

export type MixJobStatus =
  | "pending"
  | "splitting_stems"
  | "rendering"
  | "ready"
  | "complete"
  | "noop_complete"
  | "error";

export type MixAxis = "focal" | "space" | "dynamics";
export type MixPole =
  | "forward_bright"
  | "recessed_warm"
  | "punchy_dry"
  | "spacious_wet"
  | "modern_compressed"
  | "vintage_open";

export interface MixJobSummary {
  id: number;
  source_asset_id: number;
  source_filename: string | null;
  source_display_name: string | null;
  status: MixJobStatus;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  variant_count: number;
  judgement_count: number;
}

export interface MixJobsListResponse {
  total: number;
  items: MixJobSummary[];
}

export interface CreateMixJobResponse {
  ok: true;
  job_id: number;
  status: MixJobStatus;
}

export interface MixMove {
  type: string;
  reasoning?: string;
  freq_hz?: number;
  q?: number;
  gain_db?: number;
  threshold_db?: number;
  ratio?: number;
  attack_ms?: number;
  release_ms?: number;
  room_size?: number;
  damping?: number;
  wet_level?: number;
  dry_level?: number;
  delay_seconds?: number;
  feedback?: number;
  mix?: number;
  drive_db?: number;
  position?: number;
  width?: number;
}

export interface MixStemPlan {
  role: string;
  moves: MixMove[];
  level_offset_db?: number;
}

export interface MixRelationship {
  type: string;
  trigger_stem?: string;
  target_stem?: string;
  amount_db?: number;
  threshold_db?: number;
  release_ms?: number;
  reasoning?: string;
}

export interface MixBusPlan {
  moves: MixMove[];
  target_lufs: number;
}

export interface MixPlan {
  philosophy_summary: string;
  stems: Record<string, MixStemPlan>;
  relationships: MixRelationship[];
  bus: MixBusPlan;
}

export interface TranslationTargetReport {
  target: string;
  band_db: Record<string, number>;
  band_delta_db: Record<string, number>;
  stereo_width: number;
  flags: string[];
}

export interface TranslationReport {
  reference: { band_db: Record<string, number>; stereo_width: number };
  targets: TranslationTargetReport[];
  summary_flags: string[];
}

export interface MixVariantSummary {
  id: number;
  job_id: number;
  asset_id: number | null;
  axis: MixAxis;
  pole: MixPole;
  asset_path: string | null;
  asset_filename: string | null;
  duration_seconds: number | null;
  plan: MixPlan | null;
  translation: TranslationReport | null;
  /** Map of stem_name → absolute path of the soloed-stem wav. Lets the
   *  curator audition each processed stem alone for diagnostic listening. */
  stem_files: Record<string, string> | null;
}

export interface MixPairItem {
  job_id: number;
  job_source_display: string | null;
  source_asset_id: number;
  source_waveform_sha1: string | null;
  source_duration_seconds: number | null;
  /** Path of the source asset on disk. Lets the UI offer an ORIGINAL
   *  solo pill that plays the unprocessed source for A/B-vs-original
   *  comparison. */
  source_audio_path: string | null;
  axis: MixAxis;
  variant_a: MixVariantSummary;
  variant_b: MixVariantSummary;
}

export interface MixPairsResponse {
  total: number;
  items: MixPairItem[];
}

export interface MixJudgementResponse {
  ok: true;
  judgement_id: number;
}

// ── Winners (Phase 3, 2026-05-27) ──────────────────────────────────────────
/** A winning variant for a single axis on a given job. When is_original=true,
 *  the curator voted ORIGINAL over both variants for this axis; variant_id /
 *  asset fields are null and color is the literal string "ORIGINAL". */
export interface WinnerVariant {
  variant_id: number | null;
  axis: MixAxis;
  pole: string;
  /** Stable color label per pole ("Mist", "Sienna", "Citrine", etc.).
   *  Computed server-side from the pole string. Use this as the
   *  user-facing label instead of the raw pole text. Equals "ORIGINAL"
   *  when is_original is true. */
  color: string;
  asset_id: number | null;
  asset_path: string | null;
  asset_filename: string | null;
  duration_seconds: number | null;
  decided_at: string | null;
  /** True when the curator voted ORIGINAL over both variants for this
   *  axis. Phase 5, 2026-05-27. */
  is_original: boolean;
}

/** All winners for a single mix job, plus optional cross-axis champion. */
export interface WinnersJob {
  job_id: number;
  source_asset_id: number;
  source_filename: string | null;
  source_display_name: string | null;
  source_waveform_sha1: string | null;
  source_duration_seconds: number | null;
  source_audio_path: string | null;
  started_at: string;
  finished_at: string | null;
  /** 1 through 3; how many axes have a recorded winner. */
  axes_decided: number;
  /** Always ordered focal → space → dynamics. Missing axes are absent. */
  winners: WinnerVariant[];
  /** The curator's cross-axis "this one's the strongest" pick, or null. */
  champion_variant_id: number | null;
  /** True when the curator crowned ORIGINAL — declaring the unprocessed
   *  source beats every variant. Mutually exclusive with
   *  champion_variant_id. Phase 5, 2026-05-27. */
  champion_is_original: boolean;
  /** Curator-typed feedback captured at the moment of crowning. */
  champion_comment: string | null;
  /** Whether the king variant's asset is flagged public=1 (visible on
   *  the Sounds page). null until a king is crowned. */
  king_is_public: boolean | null;
  /** In-flight successor job for the same source, if one is currently
   *  rendering. Surfaces a "Rendering N/6" badge on the card so the
   *  curator sees that "Make more mixes" is being worked on. */
  in_flight_job_id: number | null;
  in_flight_status: "pending" | "splitting_stems" | "rendering" | null;
  in_flight_variants_done: number | null;
  in_flight_variants_expected: number;
}

export interface WinnersResponse {
  total: number;
  items: WinnersJob[];
}

export interface ChampionResponse {
  ok: true;
  job_id: number;
  champion_variant_id: number | null;
  /** True when ORIGINAL was crowned. Phase 5, 2026-05-27. */
  champion_is_original: boolean;
  /** Set when crowning ORIGINAL auto-spawned a make-more job for the same
   *  source. Null on variant-king crowns and on clears. */
  spawned_job_id: number | null;
}

export interface DismissResponse {
  ok: true;
  job_id: number;
  dismissed_at: string | null;
}

export interface PublishKingResponse {
  ok: true;
  job_id: number;
  asset_id: number | null;
  public: number;
  collection: string | null;
}

// ── Sounds (curator-side staging surface, 2026-05-27) ──────────────────────
export interface SoundsItem {
  asset_id: number;
  path: string;
  filename: string;
  display_name: string | null;
  duration_seconds: number | null;
  collection: string | null;
  waveform_sha1: string | null;
  /** Lineage back to a mix job when this asset is a king variant. */
  job_id: number | null;
  source_display_name: string | null;
}

export interface SoundsResponse {
  total: number;
  /** Distinct collection labels in display order (group headers). */
  collections: string[];
  items: SoundsItem[];
}

export interface SoundsUpdateResponse {
  ok: true;
  asset_id: number;
  public: number;
  collection: string | null;
}
