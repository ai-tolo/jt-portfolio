# junkyard

Retired pages and their parts (Jon, 2026-09-22: "throw them in the junkyard
so they don't waste day-to-day context"). Nothing here is built, routed,
imported or in the sitemap; the old URLs redirect (astro.config.mjs).

- pages/catalog.astro, FileTransform.astro — the Catalog door (/catalog)
- pages/judge.astro — the Judge door (/judge); TheBench + lib/finishable stay in src (the flagship uses them)
- pages/writing/[slug].astro, writing-manifest.json, public/writing — the three posts (/writing/…)
- public/more — the phone exhibit (/more), once iframed into the play room
- SignalMachine.astro — the old homepage instrument (retired 2026-09-23, SIGNAL R2);
  the play room mounts src/components/signal/Signal.astro now. Its drum kit import
  (./signal-drumkit) does not resolve from here: it is a record, not a part

The site is the homepage, the résumé, and the case studies under it.
- ArchiveHero.astro, archive-run.json — the one-phone AudioDex run (the chorus, then the Thanksgiving
  dinner); retired 2026-10-15 for AudioDexDoor.astro (two phones, one word). Its import of
  ../data/archive-run.json no longer resolves from here: a record, not a part
- IntakeSort.astro, intake-sort.json — THE SORT (2026-10-19): seven circumstances and where each landed, run as one
  factory from a press; retired the same night for IntakeBoard.astro (Jon: "a good first swing … it's weird that I
  have to click to get these to show up"). Its three images moved to public/intake/board/; its imports no longer
  resolve from here: a record, not a part
- IntakeBoard.astro, intake-board.json — THE BOARD (2026-10-19, late): four scenes turning by themselves like a departures
  board, the thread panel left and the Intake card right; retired 2026-10-20 for IntakeThread.astro, THE SEND (Jon: "it's
  too many things at once. there needs to be a before and after … you're just patchworking at this point"). Its images
  stay in public/intake/board/ (the send uses two of them); its imports no longer resolve from here: a record, not a part
- IntakeThread.astro, intake-thread.json — THE SEND (2026-10-20): two phones, Messages with a save-the-date photo in
  the composer beside Calendar; the press sent it and the day took the wedding ten months out; retired the same day
  for IntakeStream.astro, WHAT INTAKE REPLACED (Jon: "it's imessage screenshots and calendar screenshots. where is
  intake? it should be a different vision"). Its images stay in public/intake/board/ (the stream uses all three); its
  imports no longer resolve from here: a record, not a part
- IntakePile.astro, intake-pile.json — THE PILE, SORTED BY HAND (2026-10-20, intake-v3 round two): the lock screen's
  dozen notifications beside Intake in a second phone, five presses, a ribbon of days beneath, the memo typed as
  spoken; retired 2026-10-21 for IntakeCatchAll.astro, THE CATCH-ALL (Jon: "the view of the calendar isn't good
  enough to be relevant … why we need the phone on the right side as well … too many other notifications … tap
  what's yours is stupid and weird"). Its images stay in public/intake/board/ (the catch-all uses all three); its
  imports no longer resolve from here: a record, not a part
- IntakeClock.astro — UNDER THE HOOD AS ONE LINE OF TIME (2026-10-15, the skim): the Intake fold's timeline of the
  wedding memo; retired 2026-10-22 (THE CUT, round five of the catch-all; Jon: "under the hood, the whole timeline,
  the whole story: what's actually necessary here?"). Cut with the one-match rule paragraph, not moved; its import
  no longer resolves from here: a record, not a part
- IntakeSiri.astro — THE SIRI MODULE (2026-10-22, round six of the catch-all): the orb and Siri's real reply to the
  wedding sentence, drawn on the paper; retired the same day in round seven (THE SPINE; Jon's thesis: "a catch-all
  system that doesn't care about the location or medium of how the information is getting into the system"): the
  fold's second answer is BY HAND, the pile of New Event sheets, beside Intake's week. A record, not a part
- StudioMoments.astro — SIX MOMENTS OF THE REAL STUDIO (2026-10-15, the Studio sheet's round four): six tabs over six
  16:9 crops of the Studio, each with its line; retired 2026-10-23 with THE THESIS (Jon: "it's the lack of decisions I
  need to make at every level"; "commitment via constraint"): the sheet is one FLIP clip and five highlight rows, five
  of the six crops beside one sentence each (the engines' is unused, SIGNAL's job). The crops stay in
  public/builds/studio/; its strings are commented in objects-copy.ts. A record, not a part
- StudioCircumstances.astro — THE CIRCUMSTANCES (2026-10-15, round five): the Studio sheet's row of three capture
  frames (plane · pianist · window), problem + answer, with sound from a drawn key; it lived inline in StudioOne.astro
  and is kept here as it was (markup, frontmatter, the look room's chassis CSS it stood on, the keycaps' studio rules,
  its script). Retired 2026-10-23 with THE THESIS; the files never landed. A record, not a part
