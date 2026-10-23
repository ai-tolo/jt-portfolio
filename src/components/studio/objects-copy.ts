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
  // 2026-10-19, late (THE BOARD, Jon: "pockets should say tickets … a lot of your text feels stifled, long-winded,
  // literal"): DRAFT, his to rewrite; was "No new app. A voice memo or a text to myself, sorted into pockets."
  // 2026-10-20 (THE SEND: the sheet reads text first, memo second): DRAFT, his to rewrite; was "Memos and texts in.
  // Tickets out."
  // 2026-10-20, later (WHAT INTAKE REPLACED, branch intake-v3; Jon: "all of my notifications are turned off"): a third
  // beat, "Notifications off.", was added and withdrawn in the pile round (the brief keeps the two-beat line). DRAFT.
  // 2026-10-22, night (Jon: "'Texts and memos in. Tickets out.' could be better. 'I recently started texting myself
  // a lot and talking to my watch' is more engaging: funny, not self-explanatory (intrigue), sets the scene"): his
  // words; DRAFT only in that he may tune them. Was "Texts and memos in. Tickets out."
  dek: "I recently started texting myself a lot and talking to my watch.",
  // 2026-10-22 (THE SPINE, round seven of the catch-all): the sheet's own hook, the fold's line at rest, DRAFT in
  // Jon's voice, his to rewrite (his thesis: "a catch-all system that doesn't care about the location or medium of
  // how the information is getting into the system"; of the locked headline: "I don't think it's my best idea that
  // my calendar changed"). The locked headline stays in builds-copy.ts for the case study.
  // 2026-10-22, night (Jon of "It doesn't care how it got in.": "Batman coded. Something more like 'What would've
  // been 30+ clicks is now a one-sentence update', or something more real"): his words; DRAFT only in that he may
  // tune them.
  hook: "What would've been 30+ clicks is now a one-sentence update.",
  // 2026-10-19 (THE SORT round: the watch is live only, the wedding moved into the sort's sixth row): the caption
  // under the watch says what the live mode does, in LIVE_COPY's words ("a preview. nothing was added."). DRAFT, his
  // to rewrite. The history of the replay's caption, kept for the record:
  // the mono line under the module, true to the run it replays (capture 31
  // in intake.db: 3:52, seven tickets; the module shows the first two).
  // 2026-10-06 (Jon): the Harbor example was dropped — less charm, and its
  // calendar ticket contradicted the system (an actionable thing goes straight
  // to the calendar, no card); his own memo stays, typed at the faster pace.
  // 2026-10-15 (THE SKIM, round two): the watch replays THE WEDDING MEMO (src/data/intake-run.json; the Cinder
  // brain dump is kept beside it): one sentence on the couch, five things done on the calendar. DRAFT.
  // 2026-10-19, late (the record button; Jon: "every line short, benefit-led"): DRAFT, his to rewrite. Was "Say your
  // own things to do. They come back as tickets. A preview: nothing is added anywhere."
  // 2026-10-22 (THE CUT, round five of the catch-all; Jon: "the watch has redundant things … 'say a few things you
  // have to do' and then another text underneath"): the caption is DELETED; the watch's one line at rest is
  // LIVE_COPY.hintRest. Was "Say a few things you have to do. Tickets come out. Nothing is added anywhere."
};

// LIVE (Stream A, 2026-10-05): the words the watch's live mode prints — the
// control, the one privacy fact beside it, the states a stranger can land in,
// the face's own words. ⚠️ DRAFT: Jon owns every word here; edit freely.
export const LIVE_COPY = {
  // 2026-10-19, late (THE RECORD BUTTON, Jon: "why does it say try it with
  // your voice? … why isn't it just a big record button?"): the pill and its
  // words (`talk`, `talkLabel`) are gone with the face's `listening` mark,
  // `heard`, `kept`, `source` and the result's `caption`. The ring's
  // accessible name, the face's two words and the typed face's word are new,
  // DRAFTs, his to rewrite
  recLabel: "Record: say a few things you have to do",
  saved: "saved",
  nothing: "nothing to file",
  typeIt: "type it",
  // the foot under the watch at rest: the live hint, the watch's ONE line. DRAFT (2026-10-19), his to rewrite; was
  // "tap to stop" (the art run's). 2026-10-22 (THE CUT; Jon: "it should feel more lightweight, like 'try it
  // yourself'"): `try it`; was "say a few things you have to do."
  hintRest: "try it",
  privacy: "your voice goes to your browser's speech service, the words to Claude. this site keeps nothing.",
  asking: "allow the microphone, then talk.",
  noSpeech: "this browser has no speech service. type it, then tap stop.",
  denied: "the microphone was declined. type it, then tap stop.",
  empty: "nothing heard. try once more.",
  local: "without Claude",
  preview: "a preview. nothing was added.",
};

export const ARCHIVE_COPY = {
  // one word, A and D capitalised: a riff on Pokédex
  title: "AudioDex",
  // DRAFT (2026-10-13), Jon owns the word: the build's kind, the one mono word over its name (the sheet's eyebrow).
  // THE GROUND (2026-10-22): `foundation` (was "app"): the database Intake and the Studio stand on
  kind: "foundation",
  // the band's line: what it is, first. 2026-10-22, night (Jon of THE GROUND's "Every recording I own, transcribed by
  // Whisper, measured and named. Intake and the Studio stand on it.": "sucks. It should set the scene better than
  // trying to sound cool"). DRAFT from his brainstorm, two short sentences; his two lines, either his to swap in:
  //   "Computers are surprisingly effective at deciphering audio files. This audio database utilizes the information
  //    code can confidently extract (transcripts, bpm, key, waveform render, etc.)"
  //   "All the audio. But HD. And searchable."
  // Earlier: "An app that reads every recording I've made, names each one by what's inside it, and makes them
  // searchable the way photos are." (and before that "Every recording I've made, read and named by what's inside it,
  // and searchable the way photos are.")
  dek: "Computers are surprisingly good at listening. Every recording I own, transcribed, keyed and searchable.",
  // THE FLOOR LINE (2026-10-22, THE GROUND): the sheet's last line naming the sheets that read it. DRAFT, his to
  // rewrite: "Read by Intake above and the Studio below." Plain words since 2026-10-22, night (the links are gone)
  floor: { lead: "Read by ", up: "Intake", mid: " above and ", down: "the Studio", tail: " below." },
  // THE RECORD (2026-10-22): the sheet has no fold since THE GROUND, so these are no longer rendered. Kept as written:
  // 2026-10-15, the interview: Jon's words. The line under the hook answered "recording your family is the creepy
  // part" without arguing norms; the second opened the whole story; the third was the floor line under the hood strip.
  // said: "A camera takes you out of the moment. A voice memo doesn't.",
  // whole: "When someone's gone, their voice is a different thing than their photo.",
  // rule: "Every recording I own lands here first: songs, drafts, memos, the files no service holds. Intake and the Studio read from this.",
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
// THE THESIS (2026-10-23, Jon across two days: "it could all happen in Ableton, but not in this order … it's the lack
// of decisions I need to make at every level"; "commitment via constraint"): the sheet is the band → one FLIP clip
// with sound → five highlights, a real frame of the Studio beside one sentence each → the door to the show. No fold.
// `frame` names public/builds/studio/moment-<frame>.webp (`alt` describes it, the six moments' words); `caption` is
// the one mono line under a frame (the hands').
export type StudioHighlight = { frame: string; line: string; alt: string; caption?: string };
export const STUDIO_COPY: {
  title: string;
  kind: string;
  dek: string;
  highlights: StudioHighlight[];
  door: { handle: string; href: string; when: string };
  moments: Moment[];
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
  // dek: "SIGNAL on steroids: one click away from sounds being made and recorded.", (2026-10-19 → 2026-10-23)
  // 2026-10-23, the thesis (DRAFT, approved by Jon; one name across the sheet: Ableton, a word a stranger can look up)
  dek: "I stopped opening Ableton.",
  // THE HIGHLIGHTS (2026-10-23, DRAFT, every line approved by Jon): SIGNAL sits directly above, so nothing here
  // re-sells drums, bass, keys or always-recording; the engines frame is unused (the engines are SIGNAL's job)
  highlights: [
    { frame: "hands", line: "In one click it can sample any instrument you own, so you can take it anywhere.",
      alt: "The keyboard at the foot of the studio with the laptop's letter keys printed on the keys from A to L.",
      caption: "your laptop, a MIDI keyboard, a controller" },
    { frame: "radar", line: "Play any song and it detects the tempo and the key, whether it's a friend on guitar or a playlist on your computer.",
      alt: "The glass at the top reading 94 BPM and the key C minor, both in the radar's coral ink." },
    { frame: "chips", line: "Anything you play or run through it becomes a loop, and a chip is a loop you've committed to.",
      alt: "The well under the keyboard holding three chips, RHODES, VOICE and RADIO, each with its waveform and its length in bars." },
    { frame: "effects", line: "Fewer knobs than Ableton, on purpose.",
      alt: "The three towers with everything dimmed except each engine's effects: drive, mod, delay and reverb on the drums, the keys and the bass at once." },
    { frame: "take", line: "The loops you keep stack into a song, and the song prints as stems.",
      alt: "The jam page's record: a waveform of everything played, with four bars selected between two handles." },
  ],
  // THE DOOR (2026-10-23, DRAFT): the show, the sheet's only link
  door: { handle: "@tolo.fm", href: "https://www.instagram.com/tolo.fm", when: "Saturdays" },
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
  // THE RECORD (2026-10-23): the sheet has no fold since the thesis, so these are no longer rendered. Kept as written:
  // the fold under the locked hook, the line in his voice (.wk-said) and the one line beneath it
  // said: "Ableton is for producing ideas that already happened. This is for making the idea exist.",
  // keep: "Make ten thousand songs. Keep ten.",
  captures: [
    { src: "/builds/studio/plane", problem: "$3,000 of instruments in the bedroom. A laptop on the plane.", answer: "Every synth I own, sampled into keys once. The room travels." },
    { src: "/builds/studio/pianist", problem: "Your friend won't stay in one key.", answer: "The radar names the chord, the scale and the tempo. Play along, no math." },
    { src: "/builds/studio/window", problem: "The laptop's in the other room and you're looking out the window.", answer: "The controller: voices, drums in, drums out, the EQ under a thumb. Eyes stay on the window." },
  ],
};
