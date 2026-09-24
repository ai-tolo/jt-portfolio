// BUILDS — the three story pieces (direction locked with Jon, 2026-08-31:
// the Archive / the Studio / the Watch; felt transformation, headline →
// continuous-read fold).
//
// ⭐ THE WORDS ARE LOCKED (copy chat delivery, installed 2026-08-31).
// Every headline and paragraph below is Jon-owned, verbatim — do not edit,
// polish, or "improve" a sentence. 2026-09-24: the watch and archive stories
// re-installed from Jon's Figma mockup (his rewrite), grammar lightly
// massaged with his permission; a story now carries a `hinge` line, a
// `list`, and a `break` where its second column starts. Media captions are Jon's cue lines from
// the script, split at its "→" beats into sequential slots.
//
// Media contract: assets live at public/builds/<piece-id>/… and land by
// filling `src` (film = mp4/webm, stills = webp/jpg, audio = mp3 + the
// house Transport). `src: null` renders an HONEST pending slot — the
// caption says what will live there and ships as the figcaption once the
// real thing lands. Never fake a frame.
export type BuildBlock =
  | { type: "p"; html: string; hinge?: boolean }
  | { type: "list"; items: string[] }
  | { type: "break" }
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
  // a piece with `href` is a DOOR, not a fold: the ledger renders its row
  // as a link to that page instead of an in-place read (2026-09-09)
  href?: string;
  draft: boolean;
  blocks: BuildBlock[];
}

export const BUILDS: BuildPiece[] = [
  {
    id: "archive",
    name: "the archive",
    draft: false,
    headline: 'Years of my life, trapped in files named "New Recording."',
    // paragraphs re-installed VERBATIM from Jon's chat text ("Script 2 (Archive)"), 2026-09-21
    blocks: [
      {
        type: "p",
        html: "A course I took in college called Sound Studies taught me how much of a moment lives in its sound, and I've been hitting record ever since.",
      },
      {
        type: "p",
        html: "My phone never caught on. Photos get faces, places, and search. Recordings get a date, a duration, and a name like New Recording 47. I had hundreds, spread across phones and laptops and drives: technically saved, practically gone. Every so often I'd open one by accident and be wrecked by how good it felt to be back there. Then a year would pass before I found another.",
      },
      { type: "break" },
      {
        type: "p",
        html: "So I built the library I kept expecting someone to sell me. Every recording gets listened to and named for what's in it. Every word is searchable, the way photos are. Every waveform is something I can see, trim, and keep.",
      },
      {
        // the last sentence stands alone (Jon, 2026-09-21)
        type: "p",
        html: "The quote, the laugh, the idea from three summers ago: seconds away.",
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
    // paragraphs re-installed VERBATIM from Jon's chat text ("Script 1 (Intake)"), 2026-09-21
    blocks: [
      {
        type: "p",
        html: "My best ideas show up while I'm doing something else. They arrive whole, in my own voice, and they don't care that I'm going 29 mph on my bike. Keeping one used to require some sort of context switch: grabbing my laptop, a pen, whatever was near, which meant leaving the place the idea was born.",
      },
      {
        // the hinge line: set in the Intake's red, "about" in italic (Jon's mockup, 2026-09-24)
        type: "p",
        hinge: true,
        html: "By the time I'd typed it, I had a note <em>about</em> an idea.",
      },
      {
        type: "p",
        html: "Now I click one button on my wrist and speak my mind freely. Ideas, calendar events, jokes: nothing is required of me. I have a sonic vacuum on my wrist with one analog switch that turns it on or off.",
      },
      {
        type: "p",
        html: "All of the hard work is handled by transcription. The program I built transcribes what I say and decides what kind of \"thing\" it is.",
      },
      { type: "break" },
      {
        type: "list",
        items: [
          "<b class=\"k\">TASK</b> something I need to do",
          "<b class=\"k\">IDEA</b> something I may want to archive or elaborate on later",
          "<b class=\"k\">EXECUTE</b> things obvious enough for the system to complete on its own, like adding a reminder or an event to my calendar",
        ],
      },
      {
        type: "p",
        html: "The craziest thing about this build is that I first scoured the market to buy a simple wearable microphone, with the goal of seamless transcription and access to the recordings.",
      },
      {
        type: "p",
        html: "Humane's AI Pin overheated, then its servers went dark. The Limitless Pendant came closest, until Meta bought it and stopped selling it. Bee records everything, which felt like surveillance with a summary. The Stream Ring has the right gesture and a ship date I'm still waiting on.",
      },
      {
        type: "p",
        html: "They all wanted to be a companion. I just wanted a button.",
      },
      {
        type: "p",
        html: "So I took an old Apple Watch, stripped it down to that one job, and built the rest in a weekend.",
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
  // THE CATALOG — row added 2026-09-09 on Jon's ask ("add it to the matrix
  // list on the main page and I'll flesh it out"). The headline is his own
  // title from /catalog (its Chapter job line); the row is a door to that
  // page, no fold. Jon will flesh the story out; `blocks` stays empty until
  // his words land.
  {
    id: "catalog",
    name: "the catalog",
    headline: "Know what you have.",
    href: "/catalog",
    draft: false,
    blocks: [],
  },
];
