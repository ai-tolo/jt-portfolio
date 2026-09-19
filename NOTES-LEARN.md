# LEARN — the story through objects (branch `learn`, worktree ~/sites/jt-portfolio-learn, preview `learn` :4633)

Jon, 2026-09-18: the matrix (the ledger of headline rows) is scrapped. The learn
room tells the builds through OBJECTS he designs in Claude Design; clicking an
object expands its story. Words stay locked in `src/components/studio/builds-copy.ts`.
Ship = fast-forward main from ~/sites/jt-portfolio on Jon's "push it".

## Change log
- R1 (2026-09-18): branch cut off main @ 2b8c0ae. Ledger markup + CSS + fold JS
  deleted from StudioOne.astro; `BUILD_MARKS` gone; `BUILDS` import kept (the
  nav's `has` reads it). New `<section class="learn room" id="work">` holds
  `<IntakeWatch class="obj obj-watch" />` at the room's left edge (the 1080
  column's edge, 14px gutter on phones), sized by room height
  (66svh desktop / 56svh phone at the 521:781 aspect). Component fix: the
  `class` prop used `{}` inside a quoted attribute (Astro never interpolates
  there) → `class:list`. Outfit font link added once in Layout.astro.
  Gate: build 0 · sw==vw at 1024 + 375 · night render looked at · 0 JS errors.

- R2 (2026-09-18): Jon's `intake-hero.zip` (Claude Design) installed whole:
  `src/components/IntakeHero.astro` + `src/data/intake-run.json` (memo
  "Cinder 32", verbatim transcript, verdict surface, 2 task tickets) replace
  the static watch in the room. At rest the watch is mid-recording; tap stop
  → saved face → transcript types (24 ms/word) → verdict → ticket stubs →
  both cards drop into the deck → replay. Host fit only: page inset dropped
  (watch starts AT the column edge), width = the 1080 column, watch column
  capped at min(521px, 76svh-tall). Integration edits to the module: the
  site's `html[data-night]` joined its explicit dark selectors and the OS
  prefers-color-scheme rule was dropped (the site is day until its switch).
  Fonts (Instrument Sans · JetBrains Mono · Outfit) load once from
  Layout.astro. `IntakeWatch.astro` stays in-tree, unused (the hero carries
  its own watch). Gate: build 0 · full run completes (s1→s6) · sw==vw ·
  fonts resolved.
- R3 (2026-09-18): nav word "learn" → WORK, and the room moves FIRST:
  work · play · look · listen (MARKS reordered; the section sits right after
  the hero because the rail reads document order). Phone keeps the exhibit
  last: work · look · listen · play (`.one` orders 1/2/3/5). Room class
  `.learn` → `.work`. Gate: build 0 · rail/DOM order verified · click "work"
  frames the room · sw==vw at 1274 + 375.
- R4 (2026-09-18, the LISTEN room, Jon): the deck starts EMPTY (slide 0 = a
  blank tape: unprinted label, dark window, inert button, dead rail); the
  title dropdown is retired for THE WALLET — a miniature tape at the
  placard's left (this tape, small; blank paper on the empty deck), one
  title-line tall. Press it → the tapes drop as a vertical strip of sleeves
  (recessed pocket, seams between, staggered unfold) hanging to the LEFT of
  the mini on desks ≥1160px (never over the tape; under the mini below
  that and on phones). Hover/focus a sleeve → its title + note print in the
  placard in the dim ink (data-preview). Press a sleeve → its mini flies
  into the slot, the deck prints the tape (car:show k+1), the tape is the
  play switch, arriving at ▷. Keyboard: pick opens INTO the strip
  (mouse press opens without moving focus), ↑/↓/Home/End/Enter/Esc/Tab.
  Dev stand-ins: 12 tapes in `astro dev` (SHELF_FILL=0 = prod truth).
  Mechanics lifted from the parked `audio-shelf` branch; form is Jon's new
  design. Gate: build 0 · rest/open/preview/choose verified · night ·
  375 · sw==vw · no leftover clones.
- R5 (2026-09-18): play's aurora ring removed from the rail (Jon: same as
  the rest); `ethereal` field + CSS deleted.
- 🚀 SHIPPED 2026-09-18 evening on Jon's "push it": main fast-forwarded
  2b8c0ae → d45460e → d052c58 from ~/sites/jt-portfolio, pushed; backup ref
  `backup/main-pre-2026-09-18b`. Live check on www.uxjon.com in the same
  session (see memory).

## Assets
| object | source | file | state |
|---|---|---|---|
| the Watch (Intake) | Claude Design, Jon | `src/components/IntakeHero.astro` + `src/data/intake-run.json` + `public/intake/watch-blank.png` (521×781, 1x); `IntakeWatch.astro` = static spare | LIVE in the room, runs on tap |
| object 2 | Jon designs | — | pending |
| object 3 | Jon designs | — | pending |
Make-list: a 2x export of watch-blank.png (1042×1562) for retina; the PNG is
soft above ~520px wide.

## THE LAUNDRY LIST (Jon, 2026-09-18 late; NOT executed yet, he is collecting)
1. Vertical spacing BETWEEN THE ROOMS (work / play / look / listen) — they abut
   today; a gap (~20vh) between rooms; spy + comet follow (measured at runtime).
2. Watch context: headline (locked) above the module, DRAFT dek under it
   ("I talk to my watch. It comes back as a calendar event, an organized idea,
   or a prompt for Claude, inside a small system I own that never changes
   unless I change it."), DRAFT caption after the run ("A real memo, and the
   tickets it became."), the four locked paragraphs beneath. Truth item: the
   face's "0:07" / "Cinder 32" are Claude Design placeholders → pull the real
   memo id + duration from intake.db on the M1 into intake-run.json.
3. Archive object (build 2): Jon runs the Claude Design prompt (phone, Voice
   Memos list at rest, search → results → moment → kept); I mine
   archive-run.json from inventory.db and wire it like the watch.
4. NO EMOJIS in the nav: rail + phone bar = words only (work · play · look · listen).
5. Résumé link STICKS on the homepage (always visible): the hero corner
   (dot · minneapolis, mn · résumé) becomes fixed top-right; phone bar gets résumé.

## LIST EXECUTED (2026-09-18 late, Jon: "go"; committed on `learn`, NOT pushed)
- (1) rooms: 138px of ground between rooms at 768 tall (`.one > .room`
  margin-top clamp(96px, 18vh, 200px)); verified all four gaps equal, sw==vw.
- (2) watch context: locked headline + DRAFT dek above the module, DRAFT
  caption + four locked paragraphs beneath (`objects-copy.ts`). TRUTH: the
  memo is capture 31 in intake.db, 3:51.6 long (JSON now says 3:52), seven
  tickets (module shows two → caption says so); "Cinder 32" = Intake's real
  alias (`source_identity(31)`), so the id stands.
- (3) archive data MINED into `src/data/archive-run.json` (true rows: 266
  voice memos 2022–2026 in a 24,597-asset library; the Voice Memos app's own
  titles as the rest list; query "laugh" → 8 hits with the library's own
  sentence per hit; the moment = the vocal-room laughter, 120 peaks via
  ffmpeg on the M1; trim null (transcripts carry no timestamps), src null).
  Module = Jon's Claude Design prompt (handed over); I wire it when the zip lands.
- (4) nav words only; the phone bar's moon/sun = drawn glyphs.
- (5) résumé corner fixed on desks; résumé item in the phone bar.

## R6 (2026-09-18 late): the ARCHIVE lands + rail flush right
- `archive-hero.zip` (Jon, Claude Design) installed whole: `ArchiveHero.astro`,
  `public/archive/phone-blank.png` (864×1760, screen cut to alpha). Wired as
  object two under the watch with `story={false}`; the room frames it with the
  locked archive headline + DRAFT dek/caption (objects-copy.ts) + the four
  locked paragraphs. `.wk + .wk` carries the room gap between objects.
- Data: my mined `archive-run.json` replaced the placeholders. The module
  destructures `moment.trim`, so a real trim was derived on the M1: loudest
  8 s by RMS (2:40–2:48 of the 5:15 "wyd vocal room" recording), window
  2:23–3:05, 80 peaks. Rest-list dates fixed to LOCAL time (the Core Data
  epoch read as UTC put two late-night memos on the next day). Play stays
  dimmed (`src` null) until Jon says a clip plays.
- Jon's cut: the watch dek loses "inside a small system I own…".
- Rail words justify RIGHT (flex-end, 14px off the rail's edge).
- Gate: build 0 · run stage 6 (8 results, kept 8s, 2:40 to 2:48, play
  aria-disabled) · 12 rest rows · phone 375 sw==vw (module 361 wide at 14px).
- R7 (2026-09-18 late): the watch's four paragraphs re-installed VERBATIM
  from Jon's chat text (builds-copy.ts; headline + dek unchanged). Build 0,
  words present in dist.
- R8 (2026-09-19): the archive's four paragraphs re-installed VERBATIM from
  Jon's chat text (builds-copy.ts; headline unchanged). Build 0.

## Open
- The click is BUILT (the module). Open: where the locked story words print (under the run, per the module README: "put the prose directly under it"), and whether the verdict/tickets match what Intake actually did with Cinder 32 (`verdict` assumed surface).
- Objects 2–3 (Console = the M1+T7 / library galaxy; Engineer = the phone-in-hand vote), per the job chat's layout Jon is not sold on.
- Ship at the end or when it makes sense.
