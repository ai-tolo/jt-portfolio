// OBJECTS — the words AROUND each object in the work room that are not in
// builds-copy.ts (Jon's locked script: the headline and the paragraphs come
// from there, unchanged). ⚠️ DRAFTS (written 2026-09-18 on Jon's "write the
// text for me, I'll edit later"): Jon owns every word here; edit freely.
// 2026-09-22 (Jon): the dek is NOT rendered any more — the room goes
// title → object; the strings stay here for the record.
// 2026-10-10 (THE SHEETS, Jon's "go"): each build's BAND = `title` + `dek`,
// above the object: what the thing is, for a stranger, before it plays. The
// locked hook (builds-copy.ts) now opens the story inside the sheet.
export const WATCH_COPY = {
  // the build's name, centred at the top of its card (Jon, 2026-09-30: the names were too small)
  title: "Intake",
  // DRAFT (2026-10-13), Jon owns the word: the build's kind, the one mono
  // word over its name (the sheet's eyebrow, .sheet-kind); the caption
  // already calls it "the program I built"
  kind: "program",
  // one line under the locked headline: what the object is, in his voice
  dek: "I talk to my watch. It comes back as a calendar event, an organized idea, or a prompt for Claude.",
  // the mono line under the module, true to the run it replays (capture 31
  // in intake.db: 3:52, seven tickets; the module shows the first two).
  // 2026-10-06 (Jon): the Harbor example was dropped — less charm, and its
  // calendar ticket contradicted the system (an actionable thing goes straight
  // to the calendar, no card); his own memo stays, typed at the faster pace.
  caption: "A real memo, 3:52 long, spoken into the watch. The program I built turned it into seven tickets; two are shown.",
};

// LIVE (Stream A, 2026-10-05): the words the watch's live mode prints — the
// control, the one privacy fact beside it, the states a stranger can land in,
// the face's own words. ⚠️ DRAFT: Jon owns every word here; edit freely.
// `{dur}` and `{n}` in `caption` are filled by the module (the memo's length;
// "2 tickets" / "1 ticket" / "nothing to file").
export const LIVE_COPY = {
  // 2026-10-13 (Jon: "'talk' feels too generic"): the control says what it
  // does. `talk` is the pill on the watch's screen beside Replay (cqw-sized,
  // so the short form); `talkHint` is the button in the row under the watch
  // after the run; `talkLabel` is both buttons' accessible name
  talk: "Your own voice",
  talkHint: "try it with your own voice",
  talkLabel: "Try it with your own voice: say your own things to do and watch them become tickets",
  // the row under the watch: at rest, then once the replay has landed
  hintRest: "tap to stop",
  replay: "replay",
  listening: "listening",
  privacy: "your voice goes to your browser's speech service, the words to Claude. this site keeps nothing.",
  asking: "allow the microphone, then talk.",
  noSpeech: "this browser has no speech service. type it, then tap stop.",
  denied: "the microphone was declined. type it, then tap stop.",
  empty: "nothing heard. try once more.",
  heard: "Heard",
  kept: "nothing kept",
  source: "your memo",
  local: "without Claude",
  preview: "a preview. nothing was added.",
  caption: "Your memo, {dur} long. {n}.",
};

export const ARCHIVE_COPY = {
  // one word, A and D capitalised: a riff on Pokédex
  title: "AudioDex",
  // DRAFT (2026-10-13), Jon owns the word: the build's kind, the one mono
  // word over its name (the sheet's eyebrow); the band's line already calls it an app
  kind: "app",
  // the band's line: what it is, first (DRAFT 2026-10-10, Jon edits; was
  // "Every recording I've made, read and named by what's inside it, and
  // searchable the way photos are.")
  dek: "An app that reads every recording I've made, names each one by what's inside it, and makes them searchable the way photos are.",
  // the mono line under the module. 2026-09-30 (Jon): the run is ART, an
  // example anyone gets, not a row from his library — the idea from three
  // summers ago, found by one word. DRAFT, his to edit.
  caption: "One word typed into the app I built: six recordings it had already named, then the twelve seconds inside one that match.",
};

// SIGNAL STUDIO (2026-10-13): the fourth sheet, its own room (#studio) after
// the play room. ⚠️ DRAFT words (written from the signal-map notes); Jon owns
// every word. The object is three screen recordings that do not exist yet:
// each capture with `src` null renders an HONEST PENDING SLOT (a hairline
// frame with its caption inside, never a fake frame). `src` names the file
// Jon will drop under public/; the host renders the video only when that
// file exists at build time (StudioOne's frontmatter checks it), so dropping
// the file in is the whole upload. 1280×720, muted, ≤30 s.
export type StudioCapture = {
  /** the file under public/ (e.g. "/builds/studio/radar.webm"), or null */
  src: string | null;
  /** optional still for the frame before the video plays, same rule as src */
  poster?: string | null;
  /** the placard under the frame and the dot's accessible name (DRAFT) */
  title: string;
  /** what the recording shows: inside the pending frame (unless it only repeats the title), the placard's second line once the video lands */
  caption: string;
};
export const STUDIO_COPY: {
  title: string;
  kind: string;
  dek: string;
  caption: string;
  captures: StudioCapture[];
} = {
  title: "Signal Studio",
  // the one mono word in the sheet's top-right corner (.sheet-kind)
  kind: "suite",
  // the band's line. DRAFT (round three, 2026-10-13: fewer words, what it
  // is, drawn from Jon's locked piece: it listens all the time, the room
  // lives in the laptop, a game controller plays it; the captures' titles
  // say the rest). Was: "A studio that lives in a browser tab: it records
  // everything you play, samples any instrument you own into keys, and
  // turns any sound on the laptop into a playable chip."
  dek: "A studio that lives in my laptop: always recording, played from a game controller.",
  // the mono line under the object. DRAFT (round three): says what the
  // frames are, not what each shows (the placards do). Was: "Three screen
  // recordings of the real thing, muted: the radar, a sound cropped and made
  // a chip, a synth sampled into keys."
  caption: "Screen recordings of the studio in use, muted.",
  captures: [
    // ⚑ Jon: what is the radar, in one line?
    { src: "/builds/studio/radar.webm", title: "the radar", caption: "the radar" },
    { src: "/builds/studio/chip.webm", title: "a sound made a chip", caption: "a sound cropped, run through the effects, dropped on a key" },
    { src: "/builds/studio/rip.webm", title: "a synth sampled into keys", caption: "a synth sampled into keys, every third semitone" },
  ],
};
