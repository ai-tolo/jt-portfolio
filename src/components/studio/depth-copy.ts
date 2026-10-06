// UNDER THE HOOD (2026-09-30): the engineering under each object, stage by
// stage, printed INSIDE the story's card under the story (Jon: one
// expandable box). Jon-editable; the tools are named, the diary is not.
// `k` is the stage, `tool` what does it, `html` one sentence on what happens.
export type SpecRow = { k: string; tool: string; html: string };
export type Spec = { title: string; rows: SpecRow[] };

export const SPEC: Record<"watch" | "archive", Spec> = {
  watch: {
    title: "under the hood",
    rows: [
      { k: "capture", tool: "Apple Watch", html: "A stock watch, nothing added: one button starts a memo, and iCloud carries it to a Mac." },
      { k: "ingest", tool: "Whisper", html: "A Mac that never sleeps picks up new memos every fifteen minutes and transcribes them on-device (large-v3-turbo on the GPU, through MLX)." },
      { k: "parse", tool: "Claude", html: "One prompt decides what kind of thing was said: <b class=\"k\">EXECUTE</b> a complete instruction, <b class=\"k\">SURFACE</b> a task or an idea as a ticket, <b class=\"k\">STORE</b> a thought as its transcript. It executes only above 0.8 confidence and errs toward fewer tickets." },
      { k: "fallback", tool: "Llama 3.1", html: "If Claude is unreachable, a local 8B model runs the same schema: it never executes, its confidence is capped, and its tickets say so." },
      { k: "execute", tool: "applet", html: "Calendar events and reminders are written by a small signed applet with its own permissions; every action is idempotent by hash, retried, and receipted." },
      { k: "store", tool: "SQLite", html: "Memos, tickets, and full-text search over both, in one file that stays on my own computers." },
      { k: "surface", tool: "web app", html: "A queue of open tickets and a day-grouped log on the phone; a ticket can be saved, snoozed, or turned into a paste-ready prompt." },
    ],
  },
  archive: {
    title: "under the hood",
    rows: [
      { k: "capture", tool: "content hash", html: "Voice memos, phone videos, sessions, old drives: every recording lands in one library by content hash, so the same file on three devices is one row." },
      { k: "transcribe", tool: "Whisper", html: "Every recording becomes text, on-device (large-v3-turbo, through MLX)." },
      { k: "read", tool: "Claude", html: "A title, a one-line summary, the mood, tags, who and what gets named; a second pass hunts Whisper's hallucinations before they can become titles." },
      { k: "analyze", tool: "librosa", html: "Tempo by beat tracking, key from a chroma profile, how much is silence, how much changes; each number is written onto the file's row." },
      { k: "draw", tool: "ffmpeg", html: "A waveform for every file, so a recording can be seen before it is played." },
      { k: "store", tool: "SQLite", html: "One file with three tiers (fresh, library, archive); a nightly eight-stage sweep is idempotent and says so when it fails." },
      { k: "search", tool: "one query", html: "Across titles, summaries and transcripts: a word lands on recordings, then on the seconds inside one." },
      { k: "reach", tool: "Tailscale", html: "The phone opens it over a private network from anywhere; a kept moment can be trimmed or shared." },
    ],
  },
};
