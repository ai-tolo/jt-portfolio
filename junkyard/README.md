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
