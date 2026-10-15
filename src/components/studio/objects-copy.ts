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
  // 2026-10-15 (THE SKIM, round two): the watch replays THE WEDDING MEMO (src/data/intake-run.json; the Cinder
  // brain dump is kept beside it): one sentence on the couch, five things done on the calendar. DRAFT.
  caption: "One memo, 0:31, spoken into the watch from the couch. Five things happened on the calendar; two are shown.",
};

// LIVE (Stream A, 2026-10-05): the words the watch's live mode prints — the
// control, the one privacy fact beside it, the states a stranger can land in,
// the face's own words. ⚠️ DRAFT: Jon owns every word here; edit freely.
// `{dur}` and `{n}` in `caption` are filled by the module (the memo's length;
// "2 tickets" / "1 ticket" / "nothing to file").
export const LIVE_COPY = {
  // 2026-10-13 (Jon: "'talk' feels too generic"): the control says what it
  // does. Round four, the same day (Jon: "one replay, one talk"): `talk` is
  // the ONE live pill, on the watch's screen once the run has landed (cqw-
  // sized, floored at 12px, one line); `talkHint` is only the "nothing
  // heard" retry in the row under the watch; `talkLabel` is both buttons'
  // accessible name
  talk: "Try it with your voice",
  talkHint: "try it with your voice",
  talkLabel: "Try it with your own voice: say your own things to do and watch them become tickets",
  // the foot under the watch: the hint at rest; the replay pill (the phone's,
  // word for word) once the run has landed
  hintRest: "tap to stop",
  replay: "Replay",
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
  // example anyone gets, not a row from his library. 2026-10-15: THE
  // THANKSGIVING SCENE (src/data/archive-run.json). DRAFT, his to edit.
  caption: "One word typed into the app I built: every Thanksgiving it had already named, then the twelve seconds inside one.",
  // ── THE FOLD (2026-10-15, the Intake sheet's anatomy): the hook (locked, builds-copy.ts) → `said`, Jon's own line
  // → `why`, the one explaining line → under the hood as ONE RECORDING, BEFORE AND AFTER → `rule` → the whole
  // story. ⚠️ DRAFT words, every one Jon's to rewrite. The recording is invented (no real names, no real file).
  said: "I start a voice memo and I'm back at Thanksgiving dinner. The nieces and nephews are five years younger.",
  why: "A voice memo is the only candid camera. Nothing ever let you find what you caught.",
  rule: "Every recording I own lands here first. Intake and the Studio read from this.",
  hood: {
    // the left side: the row the phone keeps (the stock Voice Memos row)
    before: { label: "what the phone saved", name: "New Recording 47", date: "Nov 25", len: "14:02", note: "A number, a date, a length." },
    // the right side: the same file as AudioDex's row; `k` = the stage that wrote it, printed in the sheet's accent
    after: {
      label: "what AudioDex wrote",
      heard: { at: "9:31", line: "…and the dog. happy thanksgiving. can we eat now?" },
      title: "Thanksgiving, the kids say grace",
      tags: ["dinner", "grace", "laughing"],
      people: "the kids",
      mood: "giddy",
      room: "the dining room",
      len: "14:02",
      // a dinner has no tempo and no key: these stay blank on purpose
      bpm: "",
      key: "",
      found: ["thanksgiving", "grace", "the kids"],
    },
    // the smaller row under it: a song gets the blanks filled
    song: { title: "porch guitar, the good chorus", len: "6:12", bpm: "92 bpm", key: "D minor" },
    songNote: "A dinner has no tempo. A song gets one.",
  },
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
    // the radar (Jon, 2026-10-13): a button that opens a microphone, listens to the room without feedback and shows
    // the chords being played, the scale they belong to and the tempo, so the studio can jam with whoever is playing
    // out loud. DRAFT caption, his to edit
    { src: "/builds/studio/radar.webm", title: "the radar", caption: "a microphone listens to the room and names the chords, the scale and the tempo" },
    { src: "/builds/studio/chip.webm", title: "a sound made a chip", caption: "a sound cropped, run through the effects, dropped on a key" },
    { src: "/builds/studio/rip.webm", title: "a synth sampled into keys", caption: "a synth sampled into keys, every third semitone" },
  ],
};
