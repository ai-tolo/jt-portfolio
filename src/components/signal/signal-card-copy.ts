// SIGNAL · THE CARD'S WORDS (2026-09-30, the export round). The expandable card under the instrument, the work room's
// pattern: the name, the write-up, then HOW TO PLAY (./HowToPlay.astro, a keyboard diagram drawn from the LEGEND in
// ./signal-copy.ts), UNDER THE HOOD (the engine, stage by stage) and WHERE IT CAME FROM. ⚠️ `story`, `first` and `from`
// are DRAFTS in Jon's voice, written for him to rewrite. The hood rows are engine facts: keep each one true to src/signal.
// 2026-10-06 (Jon: "throughout the site there are instances of referring to things an outside user has no context to"):
// rewritten for a stranger who has seen nothing else of the site; the first sentence says what SIGNAL is. Cut: "under the
// keys is my studio", "rips", Signal Studio by name, the PlayStation controller and the MIDI hardware (the studio's
// inputs have moved on, and nothing here can show them), Ableton, the unlisted files. Hood: the effects row said all
// four effects were worklets (only drive and modulation are; delay is DelayNodes, the reverb a ConvolverNode), the
// time row said every note is booked ahead (the hand-played keys are not), "one node" was a chain, "real rooms" could
// not be checked; the safety row left (autoplay is the browser's, and its phone half is never read here: the card is
// desk-only). Visible words on the open card 435 → 312 (story 107 → 43 · how to play 33 → 52, its key letters counted;
// 18 of them are label words · hood 222 → 181 · from 72 → 35).
export type CardRow = { k: string; tool: string; html: string };

export const CARD = {
  title: "SIGNAL",
  // DRAFT — Jon rewrites. The closed card shows these two paragraphs: what it is, how to start, what it makes.
  story: [
    "SIGNAL is an instrument that runs in this web page, played from your computer keyboard: drums, keys and bass. The red switch at its top right turns it on.",
    "It records while you play. The export button saves the take as a WAV.",
  ],
  // DRAFT — the one line a first-timer sees with their file (unmounted: nothing reads it yet)
  first: "Your first song is in your downloads.",
  howTitle: "how to play",
  hoodTitle: "under the hood",
  rows: [
    { k: "output", tool: "one chain", html: "Everything leaves through a high-pass, soft saturation, a limiter and a clamp, so nothing clips." },
    { k: "time", tool: "lookahead", html: "Drums and bass are booked 120 ms ahead on the audio clock, further in a hidden tab; the beat held for 20 seconds at a 4× CPU throttle without a dropout." },
    { k: "voices", tool: "samples", html: "Each key plays the nearest recorded note, repitched, its loop seam crossfaded after decoding so the AAC does not click. The bass is a 303-style synth; the drums are six one-shots." },
    { k: "effects", tool: "worklets", html: "Drive and modulation run on the audio thread, the drive oversampled 2× with antiderivative anti-aliasing; the reverb is a convolver with four impulse responses." },
    { k: "stop", tool: "ramp", html: "Escape ramps every voice down and shuts the output: under −90 dBFS within 100 ms, open again for the next note." },
    { k: "memory", tool: "IndexedDB", html: "Every setting is saved as you go and restored on reload, with the drums and bass off so nothing plays by itself." },
    { k: "take", tool: "worklet", html: "The output's last five minutes are kept; export trims the silence at both ends and writes a 16-bit WAV." },
  ] as CardRow[],
  fromTitle: "where it came from",
  // DRAFT — Jon rewrites
  from: [
    "Its engine comes from a larger instrument I built to make music at home.",
    "The keys play recordings of my own synths, sampled every three semitones with a tool I wrote.",
  ],
};
