// UNDER THE HOOD (2026-09-30): the engineering under each object, stage by
// stage. Prints as a second card under each story. Jon-editable; the tools
// are named, the diary is not. `k` is the stage, `html` what happens in it.
export type SpecRow = { k: string; html: string };
export type Spec = { title: string; rows: SpecRow[] };

export const SPEC: Record<"watch" | "archive", Spec> = {
  watch: {
    title: "under the hood",
    rows: [
      {
        k: "capture",
        html: "A stock Apple Watch, nothing installed. Raise it, talk, tap stop. The memo syncs itself through iCloud.",
      },
      {
        k: "ingest",
        html: "A Mac that never sleeps checks for new memos every fifteen minutes and transcribes them on-device with Whisper (large-v3-turbo on the GPU, through MLX).",
      },
      {
        k: "parse",
        html: "Claude reads the transcript against one prompt with three fates. <b class=\"k\">EXECUTE</b> a complete instruction, done without asking. <b class=\"k\">SURFACE</b> a decision, which becomes a ticket. <b class=\"k\">STORE</b> a thought, kept as its transcript. It only executes above 0.8 confidence with every parameter present, and it errs toward fewer tickets.",
      },
      {
        k: "fallback",
        html: "If Claude is unreachable, the same schema runs on a local Llama 3.1 8B through Ollama: it never executes, its confidence is capped, and its tickets say so. A breaker trips after a timeout so the queue never stalls.",
      },
      {
        k: "execute",
        html: "Calendar events and reminders are written by a small signed applet with its own permissions. Every action is idempotent by hash, retried until it lands, and receipted.",
      },
      {
        k: "store",
        html: "One SQLite file: memos, tickets, full-text search over both. Nothing leaves the two machines.",
      },
      {
        k: "surface",
        html: "A phone web app on a private network: a queue of open tickets and a day-grouped log. A ticket can be saved, snoozed, or turned into a paste-ready prompt.",
      },
    ],
  },
  archive: {
    title: "under the hood",
    rows: [
      {
        k: "capture",
        html: "Voice memos, phone videos, sessions, old drives: every recording lands in one catalogue by content hash, so the same file on three devices is one row.",
      },
      {
        k: "transcribe",
        html: "Whisper (large-v3-turbo, on-device through MLX) turns every recording into text. A shortcut shows you a number; this writes the words down.",
      },
      {
        k: "read",
        html: "Claude reads the transcript and writes what a person would: a title, a one-line summary, the mood, tags, who and what gets named. A second pass hunts Whisper's hallucinations before they can become titles.",
      },
      {
        k: "analyze",
        html: "ffprobe and librosa measure the sound itself: duration, tempo by beat tracking, key from a chroma profile, how much is silence, how much changes. Each number is written onto the file's row, not shown once and forgotten.",
      },
      {
        k: "draw",
        html: "ffmpeg renders a waveform for every file, so a recording can be seen before it is played.",
      },
      {
        k: "store",
        html: "One SQLite catalogue in write-ahead mode. Tiers (fresh, library, archive) decide what stays warm. A nightly eight-stage sweep is idempotent, and loud when it fails.",
      },
      {
        k: "search",
        html: "One query runs across titles, summaries and transcripts. A word lands on recordings, then on the seconds inside one.",
      },
      {
        k: "reach",
        html: "The phone opens it over a private network from anywhere. A kept moment can be trimmed, sent to the studio, or shared.",
      },
    ],
  },
};
