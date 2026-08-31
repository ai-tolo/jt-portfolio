// BUILDS — the three story pieces (direction locked with Jon, 2026-08-31:
// the Archive / the Studio / the Watch; felt transformation, headline →
// continuous-read fold).
//
// ⭐ THE WORDS ARE LOCKED (copy chat delivery, installed 2026-08-31).
// Every headline and paragraph below is Jon-owned, verbatim — do not edit,
// polish, or "improve" a sentence. Media captions are Jon's cue lines from
// the script, split at its "→" beats into sequential slots.
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
  dek?: string;
  draft: boolean;
  blocks: BuildBlock[];
}

export const BUILDS: BuildPiece[] = [
  {
    id: "archive",
    name: "the archive",
    draft: false,
    headline: 'Years of my life, trapped in files named "New Recording."',
    blocks: [
      {
        type: "p",
        html: "I document with sound. Where other people reach for the camera, I hit record: ideas hummed into a phone, songs starting in parking lots, laughter I didn't want to lose. Audio is how I remember.",
      },
      {
        type: "p",
        html: "The problem is that our tech treats sound like a second-class memory. Photos get faces, places, search. Recordings get a timestamp and a duration. Mine piled up for years across phones, laptops, and drives: hundreds of moments, technically saved, practically gone. Every so often I'd stumble into one and be wrecked by how good it felt to be back there. Then I wouldn't find another one for a year.",
      },
      {
        type: "p",
        html: "So I built the library I wished existed. Every recording read and named by what's actually inside it. Transcripts I can search the way everyone else searches their photos. Waveforms I can see, touch, trim, keep. The quote, the laugh, the idea from three summers ago: seconds away now.",
      },
      {
        type: "p",
        html: "The archive stopped being storage. It became a place I go.",
      },
      {
        type: "media",
        kind: "stills",
        src: null,
        caption: "the stock Voice Memos list, deadpan",
      },
      {
        type: "media",
        kind: "film",
        src: null,
        caption: 'the real library, a search for "laugh" landing',
      },
      {
        type: "media",
        kind: "film",
        src: null,
        caption: "a waveform trimmed to a single moment",
      },
    ],
  },
  {
    id: "studio",
    name: "the studio",
    draft: false,
    headline: "Making music was never the hard part.",
    blocks: [
      {
        type: "p",
        html: "I have a room full of instruments I love and a computer that can pretend to be any instrument on earth. The hard part was everything between playing and keeping: the laptop that needs charging, the DAW that needs updating, the channels that need arming, the project that needs a name before the idea even exists. I have ADHD. My favorite thing in the world came wrapped in exactly the kind of bureaucracy my brain refuses to run.",
      },
      {
        type: "p",
        html: "I spent years engineering my way around it. One master power switch. Cable runs planned like plumbing. A studio tuned so nothing could interrupt. The friction always found a way back in, because the paradigm was the problem: every setup on earth still assumed creation happens at a desk, after a checklist.",
      },
      {
        type: "p",
        html: "So I changed what a studio is. Mine listens all the time: there is no record button to forget. My hardware got distilled into the laptop: the studio plays each instrument over MIDI and keeps its voice, so the whole room travels with me. And the interface isn't a screen anymore. It's a PlayStation controller, bought new for exactly this: the most fun way of making music I could bring into the world. Drums play like a fighting game. One button grabs the four bars I just loved. And when it's true, I hold the trigger and the song prints itself into stems, named right, ready for Ableton.",
      },
      {
        type: "p",
        html: "Now the couch is a studio. The ocean is a studio. The music happens wherever I am, and the machine keeps every second of it. All the hard parts got automated away. The part that's left is the part I love.",
      },
      {
        type: "media",
        kind: "stills",
        src: null,
        caption: "the arming ritual shown flat",
      },
      {
        type: "media",
        kind: "stills",
        src: null,
        caption: "a night's capture strip",
      },
      {
        type: "media",
        kind: "film",
        src: null,
        caption: "the moment cards, tappable",
      },
      {
        type: "media",
        kind: "film",
        src: null,
        caption: "THE FILM: thumbs on the pad, hardware answering, the folder printing",
      },
    ],
  },
  {
    id: "watch",
    name: "the watch",
    draft: false,
    headline: "My best ideas never survived the walk to the computer.",
    blocks: [
      {
        type: "p",
        html: "Ideas don't wait until you're at a desk. Mine show up on the couch, at the window, halfway through a walk: fully formed, in my own voice, ready to go. Capturing one used to mean killing the moment it came from. Sit down. Open a screen. Fight voice-to-text. Shrink the thought into a note, clean up the note, and only then tell the machine what to do. Half my ideas didn't survive the trip.",
      },
      {
        type: "p",
        html: "Now I talk to my watch. That's the whole gesture. I stay where the thought found me and say it while it's still alive. A system I own catches it, understands it, and files it into what it wanted to be: a task, a calendar event, a change to make. By the time I sit back down, my thinking is already work.",
      },
      {
        type: "p",
        html: "The device I needed famously doesn't exist to buy. I looked: rings on preorder, mics that die by lunch, wearables that fail one simple sentence: record when I say record, keep what I said. Building it myself took a weekend, because the hard parts (the transcription, the server, the understanding) were already mine, humming in a closet.",
      },
      {
        type: "p",
        html: "The distance between thinking something and it happening has collapsed to the length of a sentence. This very page was partly built that way.",
      },
      {
        type: "media",
        kind: "film",
        src: null,
        caption: "THE FILM: you mid-room, wrist up, hard cut to the ticket and calendar event materializing",
      },
      {
        type: "media",
        kind: "stills",
        src: null,
        caption: "the pipe in one quiet diagram-breath",
      },
    ],
  },
];
