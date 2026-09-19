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

## Assets
| object | source | file | state |
|---|---|---|---|
| the Watch (Intake) | Claude Design, Jon | `src/components/IntakeWatch.astro` + `public/intake/watch-blank.png` (521×781, 1x) | LIVE in the room |
| object 2 | Jon designs | — | pending |
| object 3 | Jon designs | — | pending |
Make-list: a 2x export of watch-blank.png (1042×1562) for retina; the PNG is
soft above ~520px wide.

## Open
- The click schema (what clicking the watch does, what Jon says, how he explains it).
- Objects 2–3 (Console = the M1+T7 / library galaxy; Engineer = the phone-in-hand vote), per the job chat's layout Jon is not sold on.
- Ship at the end or when it makes sense.
