// UNDER THE HOOD (2026-09-30): the engineering under each object, stage by
// stage, printed INSIDE the story's card under the story (Jon: one
// expandable box). Jon-editable (DRAFT); the tools are named, the diary is not.
// `k` is the stage, `tool` what does it, `html` one sentence on what happens.
// `glyph` names a drawing in Schematic.astro (the stage's picture in the chain)
export type SpecRow = { k: string; tool: string; html: string; glyph?: string };
export type Spec = { title: string; rows: SpecRow[] };

// AudioDex's rows were retired 2026-10-15: its hood is ONE RECORDING, BEFORE AND AFTER (StudioOne, ARCHIVE_COPY.hood)
// SIGNAL STUDIO's rows were retired 2026-10-15: its sheet has no under-the-hood section; the surface is it (StudioSurface.astro)
export const SPEC: Record<"watch", Spec> = {
  watch: {
    title: "under the hood",
    rows: [
      { k: "capture", glyph: "watch", tool: "Apple Watch", html: "A stock watch, nothing added: one button starts a memo, and iCloud carries it to a Mac." },
      { k: "ingest", glyph: "laptop", tool: "Whisper", html: "A Mac that never sleeps picks up new memos every fifteen minutes and transcribes them on-device (large-v3-turbo on the GPU, through MLX)." },
      { k: "parse", glyph: "sparkle", tool: "Claude", html: "One prompt decides what kind of thing was said: <b class=\"k\">EXECUTE</b> a complete instruction, <b class=\"k\">SURFACE</b> a task or an idea as a ticket, <b class=\"k\">STORE</b> a thought as its transcript. It executes only above 0.8 confidence and errs toward fewer tickets." },
      { k: "fallback", glyph: "chip", tool: "Llama 3.1", html: "If Claude is unreachable, a local 8B model runs the same schema: it never executes, its confidence is capped, and its tickets say so." },
      { k: "execute", glyph: "bolt", tool: "applet", html: "Calendar events and reminders are written by a small signed applet with its own permissions; every action is idempotent by hash, retried, and receipted." },
      { k: "store", glyph: "db", tool: "SQLite", html: "Memos, tickets, and full-text search over both, in one file that stays on my own computers." },
      { k: "surface", glyph: "phone", tool: "web app", html: "A queue of open tickets and a day-grouped log on the phone; a ticket can be saved, snoozed, or turned into a paste-ready prompt." },
    ],
  },
};
