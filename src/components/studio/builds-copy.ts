// BUILDS — the three story pieces (direction locked with Jon, 2026-08-31:
// the Archive / the Studio / the Watch; felt transformation, headline →
// continuous read).
//
// ⚠️ EVERY WORD IN THIS FILE IS DRAFT. The real copy is being locked in a
// separate chat; it lands by replacing the strings below — the layout in
// StudioOne.astro reads whatever is here, any paragraph count, any length.
// Flip `draft: false` per piece once Jon's words are in; the visible
// "draft copy" chip keys off that flag alone.
//
// Media contract: assets live at public/builds/<piece-id>/… and land by
// filling `src` (film = mp4/webm, stills = webp/jpg, audio = mp3 + the
// house Transport). `src: null` renders an HONEST pending slot — the
// caption says what will live there and ships as the figcaption once the
// real thing lands. Never fake a frame.
export type BuildBlock =
  | { type: "p"; html: string }
  | {
      type: "media";
      kind: "film" | "stills" | "audio";
      src: string | null;
      poster?: string;
      alt?: string;
      caption: string;
    };

export interface BuildPiece {
  id: string;
  name: string;
  headline: string;
  dek: string;
  draft: boolean;
  blocks: BuildBlock[];
}

export const BUILDS: BuildPiece[] = [
  {
    id: "archive",
    name: "the archive",
    draft: true,
    headline: "Everything I ever recorded, and no way to hear it.",
    dek: "Voice memos, song fragments, a family dinner — and the library that finally made them touchable.",
    blocks: [
      {
        type: "p",
        html: "For years I recorded everything — song fragments hummed into the phone, friends laughing at dinner, ideas talked out on walks. The memos piled up in a list that only ever grew downward, one gray row at a time, named by date and nothing else.",
      },
      {
        type: "media",
        kind: "stills",
        src: null,
        caption: "the stock Voice Memos list, scrolled deadpan — the problem in the tech everyone already knows",
      },
      {
        type: "p",
        html: "Finding one again was rare enough to feel like an event. We document our lives in photographs and know exactly how to wander back through them; nobody teaches you to wander through sound. Pressing record at a family dinner still reads as intrusive where a camera doesn't. So the recordings held the parts of life a photo can't — voices, timing, the room itself — and stayed unreachable.",
      },
      {
        type: "p",
        html: "The library changed the physics. Every moment is searchable now; a quote or a laugh is at my fingertips in seconds. Waveforms make the sound touchable — you can see the shape of a joke land. Trim a moment out, favorite it, drop it on a soundboard and play it back like an instrument.",
      },
      {
        type: "media",
        kind: "film",
        src: null,
        caption: "the library in hand — scrubbing a waveform, pulling a favorite moment out by feel",
      },
    ],
  },
  {
    id: "studio",
    name: "the studio",
    draft: true,
    headline: "Making music was joy. Recording it was bureaucracy.",
    dek: "Years of out-engineering the room, defeated by a battery icon — until the instruments moved inside the laptop.",
    blocks: [
      {
        type: "p",
        html: "I spent years out-engineering my own studio. A master switch so the whole room woke at once; surge strips zip-tied under the desk; every cable labeled at both ends. The instruments were always ready.",
      },
      {
        type: "p",
        html: "The computer never was. Recording meant a prerequisite chain — battery, updates, arming the track, naming the file — and by the end of it the performance I'd walked in with was gone. I have ADHD; the friction wasn't an inconvenience, it was a wall. The music was joy. The recording was bureaucracy.",
      },
      {
        type: "media",
        kind: "stills",
        src: null,
        caption: "the arming ritual, step by step — the checklist a song had to survive",
      },
      {
        type: "p",
        html: "The shift wasn't a better checklist. Resampling and automation distilled the physical instruments into the laptop — the whole room, its sounds and its habits, folded into something that opens in one motion.",
      },
      {
        type: "p",
        html: "Then I bought the newest PlayStation controller, on purpose, to be the instrument's front panel — because the coolest, easiest, most fun way to make music should feel like play. Now creation happens anywhere the couch is, or the ocean, or an airplane seat. It isn't convenience; it's universe-building, with the technology finally out of the way.",
      },
      {
        type: "media",
        kind: "film",
        src: null,
        caption: "hands on the controller — a jam moving, couch-lit",
      },
      {
        type: "p",
        html: "It ends where the old studio never did: hold the trigger and the stems print. Songs get finished. Albums are possible.",
      },
    ],
  },
  {
    id: "watch",
    name: "the watch",
    draft: true,
    headline: "Ideas were born on the couch and died on the way to the computer.",
    dek: "Speak anywhere; the thought lands as a ticket, a calendar hold, a change — context intact.",
    blocks: [
      {
        type: "p",
        html: "Ideas used to die in transit. Born on the couch, they had to survive the trip — wake a screen, fight voice-to-text, hold three other thoughts in line, clean up the mess afterward — and most didn't. The distance between thinking a thing and it counting was the whole problem.",
      },
      {
        type: "p",
        html: "Now I speak where the thought happens. A sentence into the watch becomes a ticket, a calendar hold, a change to a system — with its context still attached. Nothing asks me to stop being wherever I am. (The watch itself is a small saga: hardware that wasn't for sale, worn anyway.) The state never breaks; the flow keeps.",
      },
      {
        type: "media",
        kind: "film",
        src: null,
        caption: "the watch film — a thought spoken mid-walk, landing as a ticket",
      },
    ],
  },
];
