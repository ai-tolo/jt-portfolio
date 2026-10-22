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

export const CARD = {
  title: "SIGNAL",
  // DRAFT (2026-10-13), Jon owns the word: the build's kind, the one mono word over the card's title (the eyebrow);
  // the story's first sentence and the résumé ("browser instrument") already call it that
  kind: "instrument",
  // THE CUT (2026-10-22, Jon: "Claude built that, and that's stupid that I would say that before they even touched the
  // instrument"): at rest the card is how to play and ONE line, the dare. DRAFT in his voice, cut to one sentence from
  // his longer dare; his to extend.
  dare: "You can't play a wrong note.",
  // THE RECEIPT returns only when it is true: printed in the dare's slot the moment the export cap hands a WAV to the
  // browser (SignalCard's script). DRAFT, his words from the 2026-10-15 interview.
  receipt: "Your first song is in your downloads.",
  howTitle: "how to play",
  // THE RECORD (2026-10-22): no longer rendered; THE CUT took the story, under the hood and where it came from off the
  // card. Kept as written.
  // THE RECEIPT, THEN THE DARE (2026-10-15, the interview; Jon chose the receipt to lead: "the more dramatic sell").
  // story: [
  //   "Your first song is in your downloads. Pick a key: you can't play a wrong note, and neither can the bass. Space brings the drums, B brings the bass, and it was recording the whole time.",
  //   "Find the tempo and key of a song you love, set them, and play along with a band that follows you. The export button saves the take as a WAV. The full studio is one sheet down.",
  // ],
  // hoodTitle: "under the hood",
  // UNDER THE HOOD was ONE SENTENCE for the skeptic (2026-10-15). Engine facts from src/signal (time.ts, out.ts).
  // hood: "Drums and bass are booked 120 ms ahead on the audio clock, and the beat held for 20 seconds at a 4× CPU throttle without a dropout. Everything leaves through a limiter, so nothing clips.",
  // fromTitle: "where it came from",
  // from: [
  //   "Its engine comes from a larger instrument I built to make music at home.",
  //   "The keys play recordings of my own synths, sampled every three semitones with a tool I wrote.",
  // ],
};
