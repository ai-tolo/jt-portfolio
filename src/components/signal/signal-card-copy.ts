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
  // THE FEELING (2026-10-22, late; Jon's razor: "not the safety. it's the feeling of having made something, easily,
  // instantly, tangibly"): at rest, under the device, THREE MOVES as the card's one block, then how to play. Jon's
  // content ("Space = Drums. A-L are the white keys. B = Bass (it follows whatever you're playing on the keys)"), the
  // `=` form his; DRAFT as set. One line on a wide sheet, a line each on a narrow one.
  moves: ["Space = drums.", "A–L = the white keys.", "B = bass, and it follows whatever you play."],
  // THE RECEIPT, printed in the moves' slot the moment the export cap hands a WAV to the browser (SignalCard's
  // script), for the rest of the visit. Jon's words, NOT draft.
  receipt: "Good or bad, you just made a demo.",
  // THE RECORD (2026-10-22, late): the dare of THE CUT and the receipt before Jon's.
  // dare: "You can't play a wrong note.",
  // receipt: "Your first song is in your downloads.",
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
