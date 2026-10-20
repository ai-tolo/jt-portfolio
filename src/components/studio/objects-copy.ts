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
  // 2026-10-19 (THE SORT, Jon: "the pitch now is a bit wider … it utilizes the two things I already use, voice memos
  // and iMessage, and puts it into pocketed pieces of information"): DRAFT in his words, his to rewrite. Was "I talk to
  // my watch. It comes back as a calendar event, an organized idea, or a prompt for Claude."
  dek: "No new app. A voice memo or a text to myself, sorted into pockets.",
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
  // 2026-10-15, round two (Jon: "as few texts as possible"): no caption under the object (the two phones say it)
  // and no line in his voice yet (the first draft read creepy; his words come from the next interview). The fold
  // is the hook, the hood strip, this one line, the whole story. ⚠️ DRAFT, his to rewrite.
  // 2026-10-15, the interview: Jon's words. The line under the hook answers "recording your family is the creepy
  // part" without arguing norms; the second opens the whole story. DRAFT, his to rewrite.
  said: "A camera takes you out of the moment. A voice memo doesn't.",
  whole: "When someone's gone, their voice is a different thing than their photo.",
  // the floor line, with its product half (Jon: songs, drafts, files that live on no service, one place on my phone)
  rule: "Every recording I own lands here first: songs, drafts, memos, the files no service holds. Intake and the Studio read from this.",
};

// SIGNAL STUDIO (2026-10-13; THE SURFACE, 2026-10-15): the fourth sheet, its
// own room (#studio) after the play room. Jon's thesis, his words: Ableton is
// the most advanced DAW ever and it still failed him, because a notebook has
// to open instantly, go where he goes, take any pen, and never ask to be set
// up. "Make ten thousand songs, keep ten." SIGNAL (two sheets up) is the small
// one; the Studio is SIGNAL on steroids. ⚠️ Every sentence here is a DRAFT in
// his voice (written 2026-10-15); Jon owns every word, edit freely. Spotify is
// never named on this sheet.
//
// THE OBJECT IS SIX MOMENTS (2026-10-15, round four): six 16:9 crops of the
// real Studio, each already in the state that makes its point, the rest
// dimmed (StudioMoments.astro; public/builds/studio/moment-<id>.webp). The
// `label` is the tab's word, the `line` prints while the moment shows, the
// `alt` describes the frame.
export type Moment = { id: string; label: string; line: string; alt: string };
// THE CIRCUMSTANCES: three capture frames, each titled by the PROBLEM with one
// line of answer. `src` names the file under public/ without its extension:
// the host keeps the first of .mp4 / .webm that exists at build time, so
// dropping the file in and rebuilding is the whole upload. With sound; a
// visible play key; plays on a press only. Until the file exists the frame is
// the honest empty one (its key drawn, dimmed, inert). Jon records these.
export type StudioCapture = {
  /** the file under public/, no extension (e.g. "/builds/studio/plane") */
  src: string;
  /** the placard's title: the problem, in his voice */
  problem: string;
  /** the one line of answer under it */
  answer: string;
};
export const STUDIO_COPY: {
  title: string;
  kind: string;
  dek: string;
  moments: Moment[];
  said: string;
  keep: string;
  captures: StudioCapture[];
} = {
  title: "Signal Studio",
  // the one mono word in the sheet's top-right corner (.sheet-kind)
  kind: "suite",
  // the band's line (DRAFT; 2026-10-15 Jon kept "SIGNAL on steroids" and cut the rest as "a weird sentence". 2026-10-19,
  // the co-partner interview: the rest is his own line from that night, "I'm one click away from sounds being made and
  // recorded". Every moment line below is from the same interview; the spine is
  // ~/signal-studio-ideation/positioning-2026-10-19.md. Jon: the landing sheet is the priority, "a higher probability
  // of being seen" than the study.)
  dek: "SIGNAL on steroids: one click away from sounds being made and recorded.",
  moments: [
    { id: "engines", label: "the engines", alt: "The three engines side by side: HOUSE on the drums, SYNTH on the keys, 303 on the bass, each with its own filter, pattern and effects.",
      line: "Drums, keys, bass. My synth through the drum engine, my bass through the synth engine: the ultimate consolidation." },
    { id: "effects", label: "the effects", alt: "The same three towers with everything dimmed except each engine's effects: drive, mod, delay and reverb on the drums, the keys and the bass at once.",
      line: "Every effect on every instrument, on one page, and one click changes all of them. Ableton makes you click a row, expand the rack and open a window." },
    { id: "take", label: "the take", alt: "The jam page's record: a waveform of everything played, with four bars selected between two handles.",
      line: "It was already listening. How much would you pay for every session you thought was recording and wasn't?" },
    { id: "chips", label: "the chips", alt: "The well under the keyboard holding three chips, RHODES, VOICE and RADIO, each with its waveform and its length in bars.",
      line: "Anything you're listening to: one click and it's a chip, on the bars, in its spot. Grab it, loop it, compartmentalize it." },
    { id: "radar", label: "the radar", alt: "The glass at the top reading 94 BPM and the key C minor, both in the radar's coral ink.",
      line: "Ableton doesn't even care about key. The radar hears the room and names the chord, the scale, the tempo, so I can join the friend who won't stay in one key." },
    { id: "hands", label: "the hands", alt: "The keyboard at the foot of the studio with the laptop's letter keys printed on the keys from A to L.",
      line: "Anything that can send MIDI immediately works. The controller is a luxury: my main things at my fingertips, eyes out the window." },
  ],
  // THE FOLD, under the locked hook: the line in his voice (.wk-said) and the one line beneath it
  said: "Ableton is for producing ideas that already happened. This is for making the idea exist.",
  keep: "Make ten thousand songs. Keep ten.",
  captures: [
    { src: "/builds/studio/plane", problem: "$3,000 of instruments in the bedroom. A laptop on the plane.", answer: "Every synth I own, sampled into keys once. The room travels." },
    { src: "/builds/studio/pianist", problem: "Your friend won't stay in one key.", answer: "The radar names the chord, the scale and the tempo. Play along, no math." },
    { src: "/builds/studio/window", problem: "The laptop's in the other room and you're looking out the window.", answer: "The controller: voices, drums in, drums out, the EQ under a thumb. Eyes stay on the window." },
  ],
};
