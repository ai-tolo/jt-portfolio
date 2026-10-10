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
  talk: "Talk",
  listening: "listening",
  privacy: "your voice goes to your browser's speech service, the words to Claude. this site keeps nothing.",
  asking: "allow the microphone, then talk.",
  noSpeech: "this browser has no speech service. type it, then tap stop.",
  denied: "the microphone was declined. type it, then tap stop.",
  empty: "nothing heard. tap talk to try again.",
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
  // the band's line: what it is, first (DRAFT 2026-10-10, Jon edits; was
  // "Every recording I've made, read and named by what's inside it, and
  // searchable the way photos are.")
  dek: "An app that reads every recording I've made, names each one by what's inside it, and makes them searchable the way photos are.",
  // the mono line under the module. 2026-09-30 (Jon): the run is ART, an
  // example anyone gets, not a row from his library — the idea from three
  // summers ago, found by one word. DRAFT, his to edit.
  caption: "One word typed into the app I built: six recordings it had already named, then the twelve seconds inside one that match.",
};

// THE BANDS (2026-10-10): SIGNAL's title over the instrument — the name,
// then one line saying what it is. ⚠️ DRAFT: Jon owns every word. (Look and
// listen keep no band: Jon, 2026-10-10, "i didn't ask that music / drawings
// get titles or changed".)
export const BANDS = {
  play: { name: "SIGNAL", what: "An instrument that runs in this web page, played from your computer keyboard." },
};
