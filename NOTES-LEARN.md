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

## Open
- The click is BUILT (the module). Open: where the locked story words print (under the run, per the module README: "put the prose directly under it"), and whether the verdict/tickets match what Intake actually did with Cinder 32 (`verdict` assumed surface).
- Objects 2–3 (Console = the M1+T7 / library galaxy; Engineer = the phone-in-hand vote), per the job chat's layout Jon is not sold on.
- Ship at the end or when it makes sense.
