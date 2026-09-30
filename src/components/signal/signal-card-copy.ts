// SIGNAL · THE CARD'S WORDS (2026-09-30, the export round). The expandable card under the instrument, the work room's
// pattern: the name, the write-up, then HOW TO PLAY (the legend in ./signal-copy.ts, drawn as keycaps), UNDER THE HOOD
// (the engine, stage by stage) and WHERE IT CAME FROM. ⚠️ `story` and `from` are DRAFTS in Jon's voice, written for him
// to rewrite (the brief in ./signal-copy.ts was his own two lines; they are folded in). The hood rows are engine facts.
export type CardRow = { k: string; tool: string; html: string };

export const CARD = {
  title: "SIGNAL",
  // DRAFT — Jon rewrites
  story: [
    "Most people have never made a piece of music. Not because they can't. Because the first hour is all setup: the software, the account, the interface, the fear of the interface. I wanted the first hour to be the fun part.",
    "This is an instrument built from my studio. A drum machine, a 303-style bass, and a keyboard voiced with rips of my own synths. All of it is Web Audio, running in this page. Turn it on and play the letters. Hold a few and it finds you a chord.",
    "It listens the whole time. There is nothing to arm and nothing to name. When something happens that you like, press export and the song is yours: a WAV with the key and the tempo in its name, ready for whatever you make music in.",
    "The studio version of this prints stems into Ableton. This one prints a first song for anyone who has never had one.",
  ],
  howTitle: "how to play",
  hoodTitle: "under the hood",
  rows: [
    { k: "exit", tool: "one node", html: "Drums, keys and bass leave through one node: a sidechain, a high-pass, a soft stage, a limiter and a soft clamp, so nothing you do can clip the page." },
    { k: "time", tool: "lookahead", html: "A scheduler books every hit and note ahead of the audio clock, so the beat holds while the page does other things; measured under a four-times CPU throttle with no gaps." },
    { k: "voices", tool: "rips", html: "The keys are multisampled rips of my own synths, their loop seams re-baked at load so the codec can never click; the bass is a 303 model; the drums are a kit." },
    { k: "effects", tool: "worklets", html: "Drive, modulation, delay and reverb run as audio worklets on their own thread; the reverbs are impulse responses of real rooms." },
    { k: "stop", tool: "gate", html: "Escape closes a gate behind every voice: silence within about a tenth of a second, and the next note is never swallowed." },
    { k: "memory", tool: "IndexedDB", html: "What you set is saved in the browser as you go. A reload comes back armed and silent." },
    { k: "take", tool: "worklet", html: "A worklet on the exit keeps the last five minutes of what you play; export trims the silence either side and writes a 16-bit WAV." },
    { k: "safety", tool: "first gesture", html: "Nothing sounds before you touch it: the audio stays suspended until your first click or key, and a phone gets a picture instead." },
  ] as CardRow[],
  fromTitle: "where it came from",
  // DRAFT — Jon rewrites
  from: [
    "SIGNAL is cut from Signal Studio, the instrument I play at my desk: the same engine, with a PlayStation controller for hands, my hardware answering over MIDI, and stems printing straight into Ableton.",
    "The voices are rips. I built a ripper that plays my synths one note at a time into a library of loops, and a handful of those loops live on this site as unlisted files.",
  ],
};
