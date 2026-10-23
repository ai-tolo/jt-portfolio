# jt-portfolio — working rules

The live site is **uxjon.com** (the Studio redesign, shipped Aug 2026). For
CURRENT state, branch position, and open items read Claude's file memory
`finishable_reapproach_direction` FIRST (its "WHERE WE ARE" block is the
handoff); fuller history lives in `portfolio_studio_reapproach`, résumé
truth in `resume_experience`. This file is the repo-local contract every
session must follow.

## Branch + deploy model
- **main = production.** Vercel auto-deploys `origin/main`. Never commit to
  main directly; work on `studio-desk` (this worktree,
  `~/sites/jt-portfolio-studio`) and ship via fast-forward merge from the main
  checkout (`~/sites/jt-portfolio`), then verify uxjon.com actually serves the
  change before calling it shipped.
- Push to prod only when Jon says so.

## Verification norms (non-negotiable)
- Build gate: `source ~/.nvm/nvm.sh; npm run build > /tmp/build.log 2>&1; echo "exit: $?"`
  — judge ONLY the exit code; grepping the log for "error" gives false passes.
- Dev server: preview name `studio-desk`, port **4631**, or `studio-build`,
  port **4632** (both in the global launch.json — the second exists so
  parallel sessions never fight over one port; take whichever is free).
  Never run dev servers via plain Bash.
- Browser verification: the CDP harness at `~/studio-mocks/cdp.mjs`
  (`launch(port)` → `{cdp, ev, close}`; `ev` does NOT await promises;
  screenshots at `result.data`). Always headless and muted.
- **Never engage the instrument's audio in the live preview pane** (offscreen
  Chromium plays Web Audio aloud). Headless only.
- QA by LOOKING at screenshots (including below-the-fold pins), not just DOM
  numbers. Captures go to `~/Documents/studio-build/`.
- After any change, assert `scrollWidth <= viewport` at 375 and 1440 on the
  touched pages — horizontal overflow has been the most-recurring regression.
  On the homepage under 900px the scroller is `<main>`, not the document
  (2026-09-21): read `main.scrollWidth`, scroll with `main.scrollTo` /
  `main.scrollTop` (window.scrollTo silently no-ops), and keep touch
  emulation on.

## Sacred / hazard files
- THE INSTRUMENT is `src/components/signal/Signal.astro` + `src/signal/*`
  (SIGNAL, 2026-09-23). The old `SignalMachine.astro` is RETIRED to
  `junkyard/` (never import it back). The contract is `src/signal/types.ts`
  (planner-owned), the code map `docs/signal-map/`, the gate
  `scripts/signal/gate.mjs`. The unlisted assets `public/s/<8hex>/` (rips,
  kit, IRs, boot sound) ship `immutable` (the postbuild adds the header):
  never change a file in place; re-encoding = a new 8-hex folder name.
  The HOST hooks StudioOne relies on (keep them on both sides):
  `#sgm[data-state]` standby → boot → live → powerdown (SINCE 2026-10-13 the
  site NEVER goes night on power: the rail/bar switch is the lights' only
  source, and the casing goes GRAPHITE only under `html[data-night]`
  (material.css): a live device by day stands on SILVER, with the words on
  the bare casing inked for it in power.css's "THE SILVER BY DAY" block;
  the host clicks `#pwr` only once SIGNAL's WHOLE SHEET (`.sc`: the device
  AND how to play) has left the viewport: its intersection ratio under
  0.08 for 160 ms (2026-10-22, Jon: "loosen it so they can see the
  directions and not have to restart it"; the 35 %-of-the-screen rule
  powered off a reader scrolling to how to play); anywhere inside the
  sheet it never does),
  `#pwr` (the power switch since R4, 92 × 40 since 2026-10-07; the host's
  `.pwr` overrides light it; in standby THE RUN laps its border: a
  cool-gradient ribbon, src/signal/view/pwr-run.ts precomputes a ~20 s
  car-sim loop the browser plays via Web Animations — never a per-frame
  script, never a style write per frame),
  `.sgm .device` (the 1280px box — `DEVICE_W` in types.ts since R3,
  2026-09-24 — the host zooms with `--sig-zoom` from BOTH axes: 98% of the
  column, or the room's height ÷ the device's height; since round four the
  fit measures `.sig-desktop`'s content box, the width `.sgm`'s parent had). The anchor/spy target stays the HOST `#play`. R3 laws: the
  taught keymap only (letters · Space · B · Z · M · arrows · = · Esc; HOLD,
  CHORD and the root lock are on-screen toggles), every taught key drawn
  as a `.sg-key` keycap (keycap.css) that goes `.pressed`/`.lit`, the size
  floor (no control word under 12px, no screen numeral under 22px, BPM the
  largest), `.dormant` on a control whose effect waits on another, nothing
  printed beneath the device (signal-copy.ts is unmounted, Jon writes it).
  R4 (2026-09-24, Jon's render): its top is THE HEAD (Signal.astro, static):
  `esc STOP` in the left corner (beside it since 2026-10-07 the round `?`
  key, `[data-corner="help"][data-awake]`: it and the ? key scroll to
  `[data-write-up]` = the HOW TO PLAY section under the device inside
  SIGNAL's one sheet (round four), and answer in standby too; the ? glyph
  is centred on the key's top face: `.sgh-help` padding 0, hands.css), the
  three module TITLES over their towers in
  their accents (words, never controls), and `#pwr` = a RED ROCKER SWITCH in
  the right corner (the disc is gone; every host hook kept: the host's `.pwr`
  block in StudioOne is written for the switch). THE BOW (2026-10-06, Jon's
  pick): the head is TWO LINES (72): the system row (esc STOP · THE SONG on
  the device's spine — the song's clock screen + the export cap as ONE UNIT in
  a dark well, 134 × 38 each, export.css — · the switch), then the titles'
  line; the device is 1280 × 878 (`DEVICE_H`); the still is 1280/878. THE ARPEGGIATOR IS OFF THE SURFACE (no ARP cap,
  no arp knobs; the engine keeps it, it loads off in main.ts).
  R5 (2026-09-25, Jon's second mock, docs/signal-map/r5-mock.webp): the keys'
  foot is the chord's (CHORD · the glass wide and centred · HOLD); the KEY
  walk lives in the keybed's top-left block (the KEY screen: a click steps
  the key, a vertical drag walks it; a MAJ · MIN toggle beside it; no arrow
  caps anywhere but the real ← → keys; FREE is off the surface, a saved FREE
  loads as major in main.ts); the octave group top-right on the same line;
  the letter rows sit in a recessed tray; Z and M stand just outside it a
  bottom-row step lower with their knob pairs outboard, no hairlines; the
  rail is the window line alone (no C names).
  Sound safety still applies: never engage its audio in a live preview pane;
  probe headless with `--mute-audio` (`?mute=1`) and kill every headless
  Chrome you start (a leaked `--headless` blocks Jon's own Chrome).
- `src/components/studio/builds-copy.ts` holds **JON'S LOCKED WORDS**
  (installed verbatim from his copy chat, 2026-08-31): never edit, polish,
  or reflow a sentence. Structure/media `src` fields may change; prose may
  not. (2026-10-06, at his word: the Archive's "I had hundreds" now reads
  "I had thousands".) The ledes in `src/lib/case-links.ts` are no longer
  canon: Jon had them rewritten plainly on 2026-10-06 (what each study
  holds); they are DRAFT for him.
- `src/components/studio/StudioOne.astro`: python start..end splicing has
  repeatedly eaten neighboring blocks. Use anchored exact-string edits, and
  verify every scripted replace actually matched (a silent no-match shipped a
  real bug once). Its nav trio (spy highlight, word map, comet bead) shares
  one source of truth (`getDocIds()` + `fyOf()`); never let them diverge, and
  remember layout order is width-dependent (mobile flex order).

## Résumé subsystem
- `src/lib/resume-print.ts` is the ONLY résumé prose source. The old
  Notion-driven screen résumé is retired; do not resurrect it.
- `/resume` is the annotated sheet: marks + proofs are screen-only; the
  print/ATS contract in `PrintResume.astro` must never regress (verify with
  print emulation + pypdf: exactly 1 page, clean text extraction).
- ON SCREEN the sheet is re-set in the work room's material (Jon's pick,
  2026-10-06: "direction b but don't round the corners"): Instrument Sans
  body, JetBrains Mono labels in a left column, Outfit names, hairlines at
  18 % ink, no red, one white card (night #1c1c1f), SQUARE, no shadows —
  the pages beneath, the study tabs and the proof panels too. Those rules
  live in PrintResume.astro inside `@media screen`, after the print rules
  at equal weight; print keeps the Geist sheet. IBM Plex Mono stays loaded
  on /resume for the sitewide rail and floor only.
- The proofs sit on the room's ground (no dark slab): `.proof-panel` hands
  each module `--pf-ink/-dim/-ground/-card/-line/-soft` and the three faces,
  day and night; one accent hue per module; each tab's panel follows it in
  the DOM. MARKS (2026-10-06): agent → mastering agent bullet 0, judge →
  bullet 2 (the evidence clause), signal → the instrument's bullet 0,
  parser → CHS bullet 1, crediverso → Crediverso bullet 1 (since
  2026-10-23: "the revised main flow", the flow whose V1 nav call it
  walks; the sheet has no bullet naming the nav itself).
- THE CREDIVERSO WALKTHROUGH (2026-10-23, Jon: "what if we snag the
  Crediverso UI walkthrough (or a mini-ish version of it) as an expandable
  module on the résumé"): the fifth proof, `proof-crediverso`
  (`ProofCrediverso.astro` = `<CvDoor mini />`). CvDoor's `mini` prop
  renders the two phones, the shared stepper and EN · ES and OMITS the
  gate (lock, tie, what tipped it) and the matrix; `data-mini` holds the
  ≤1100 unit (the phone above its steps, the two side by side) at any
  viewport, pins the unit's rows to the top (`align-content: start`:
  after's five steps had seated its phone 24px low) and keeps the status
  in its own two-line slot (`flex: 1 1 0`, min-height 3em: the longest
  step's words had dropped it to a row of its own, +44px), so walking the
  seven steps never changes the panel's height (1011 at 1440). The two
  stack under 620 of the panel (`container: cv-host` on the panel). /resume
  imports `cv-tokens.css` (the phone keeps Crediverso's own colors, day
  and night) and maps the door's `--rm-ink/-dim/-paper/-sans/-mono/
  -display/-measure` onto the panel's `--pf-*` in ONE rule on
  `.proof-panel[data-proof-panel="crediverso"]`. No words of its own; the
  mark's accessible name is "walk it", the panel's label "The Crediverso
  nav, before and after". Like every proof it is desk-only (the panels are
  `display: none` under 900) and never prints. The case-study page passes
  nothing and is unchanged.
- After ANY résumé content change, regenerate
  `public/jonathan-tollefson-resume.pdf` (headless `Page.printToPDF` of
  /resume with `preferCSSPageSize`, then pypdf page-count check). Fit is
  measured at TRUE print width (~710px content), not screen width.
- Proof numbers come from `src/lib/judge-ledger.json`, a dated snapshot of
  the real harness DB (`~/automation/data/inventory.db` on the M1:
  `mix_judgements` / `mix_jobs` / `mix_variants`). Refresh by re-querying;
  never invent or "round" these numbers. The sheet's evidence clause
  IMPORTS them inside resume-print.ts (votes, originals kept, date range);
  never type them into the prose.
- Names on the sheet (Jon, 2026-09-21): each build leads with a plain
  descriptor ("AI mastering agent", "Audio catalog and search", "Browser
  instrument"). Finishable / the Engineer / the Catalog / SIGNAL never
  appear on the résumé; the naming law below is for the site's surfaces,
  not the sheet. The reader is a cold design/engineering lead who will not
  click: every bullet stands without the site.
- Org names do NOT link (2026-09-21). The one bare URL line under the
  mastering agent (uxjon.com/case-studies/the-console) is the sheet's only
  link and the ONLY link to a study left anywhere on the site. The
  screen-only studies row under the sheet (`.r-studies`) is GONE since
  2026-10-23 (THE STUDIES STEP BACK, see THE SITE IS THREE THINGS).
- Contact: phone is print-only (its separator hides with it); no LinkedIn on
  the sheet (the actions row and the floor carry the icon). The proof marks
  key on `data-pr-org` strings + bullet indexes in `MARKS`; re-check them
  after any rewording or the tabs silently detach.

## Copy + design laws
- US SPELLING on every visitor-readable string (2026-10-22, Jon: "I've
  been seeing some euro-spellings popping up lately, 'colour' and other
  examples"): color, center(ed), gray, labeled, canceled, catalog, behavior,
  analyze, practice (verb), and the rest. Check dist/ after a build (text
  and visible attributes); comments, identifiers and tests are out of
  scope; a British spelling in builds-copy.ts's locked prose is reported,
  never edited.
- THE GLOSS (2026-10-23, Jon: "for any specific product like Ableton, or
  any niche word, acronym, etc. on the site (there can't be that many) …
  hovering on the word makes a definition/explanation appear"): ONE list in
  `src/lib/gloss.ts` (`{ word, line }`, at most TEN, every line one
  sentence in Jon's register, DRAFT): Ableton · stems · chip · MIDI ·
  Whisper · take · WAV · BPM · Claude. The word carries the mark, NO
  glyph: `<Gloss w="…">` renders `button.gl` (inline, the text's own
  face, size, case and ink; a 1px DOTTED underline in the dim ink at 60 %,
  offset 0.18em; cursor help; NEVER the accent: it is not a link). Its line
  floats in ONE fixed paper pop for the page (`.gl-pop`, `src/styles/
  gloss.css`: the paper #fff / night #1c1c1f, the 14 % hairline, 12px
  corners, Instrument Sans 0.875rem/1.45, 28ch, 8px under the word, above
  when there is no room), so it NEVER moves the page. Behavior
  (`src/lib/gloss-client.ts`, one script, delegated on the document): a
  hover on a fine pointer shows it after 120 ms and hides it on leave; a
  click or a tap opens and PINS it (a second tap on the word, a tap
  elsewhere, Esc or a scroll past 80px closes it; inside 80 it rides with
  the word); keyboard focus shows it; one open at a time; reduced motion =
  no fade. Each button's `aria-describedby` points at a hidden span with
  its line (the client writes them once); the pop is `aria-hidden`. Copy
  strings stay PLAIN TEXT: `<Glossed text={…} mark={[…]} />` marks the
  first whole-word occurrence of each named word, and a named word missing
  from the text FAILS THE BUILD; a script that writes its own markup uses
  `glossButton()` (the watch). Gloss.astro prints its `<script>` before
  the button, flush (a newline between them printed a space after the
  word). MARKED on the homepage: the Studio sheet (Ableton in the dek and
  the effects row, MIDI in the hands caption, chip, stems; `HL_GLOSS` in
  StudioOne names each row's words; the hands row's "take" is the verb and
  stays plain) and the watch's live lines (Claude: the privacy line under
  the cards, the listening hint, the "without Claude" chip). NEVER the
  hero, the rail, chrome, the instrument's own surface (its BPM, its export
  cap) or the drawn app tiles ("Claude ✦"). NOT MARKED YET, Jon's call:
  /resume (Claude, Whisper, takes, WAV, Ableton, chip) and the case studies
  (signal-studio: Ableton, take, chip, stems, MIDI, WAV; the-console: take,
  Ableton, stems, Whisper, Claude; momence: "take-home"); Whisper, WAV and
  BPM have no homepage occurrence today.
- Honesty first: no "live"/"the actual" labels over authored data; real
  numbers only; claims a skeptic can check. The naming law: **Finishable**
  with the Catalog / the Studio / the Engineer ("console", "bucket", "crown a
  king" are retired nouns in visible copy); the résumé sheet is the one
  exception (plain descriptors, see "Résumé subsystem").
- Voice: plain, understated, first-person, lowercase chrome, no em dashes in
  résumé/application copy. Jon-voiced surfaces (hero lines, ledes, bio) are
  HIS: draft only when asked, flag as DRAFT, never committee-polish.
- Chrome (the rail, the floor) is quiet IBM Plex Mono. Pages in the work
  room's material (the four studies, /resume) set their words in the room's
  three faces (the studies read `--rm-*`; `--cs-mono` is the older
  material's, Momence only).
- Night mode: `html[data-night]`, ONE source since 2026-10-13 (Jon: "allow
  the user to control that"): the manual switch. The instrument's power no
  longer touches the page's lighting (`nightPower` is deleted).
- The GEAR family is GONE from the homepage (round 3e, 2026-09-02): no
  dark panels remain; the instrument is the only dark object in the room
  (the cassette, 2026-09-09, is the named exception: a photographed
  object of Jon's own, not a panel or a card).
- AUDIO is THE CASSETTE (2026-09-09, Jon's mock + his cut tape render V3;
  supersedes the field recorder's cover window and key strip): the
  placard ABOVE (mono title, the note, on the column's left edge), then
  the tape centred (`.cs`, a `<button>` and a size container, ~half the
  viewport wide up to 760px, height-capped by `--cs-reserve`):
  `public/studio/tape-shell-*.webp` is Jon's render with the label area,
  both hub circles and the display rectangle cut to alpha, painted LAST
  over `.cs-label` (the tape's colour), the two hubs (`.cs-hub` still
  base + `.cs-reel` turning core — `tape-hub-*` / `tape-core-*`, both cut
  from the ORIGINAL uncut render at r150 / r97 about the hub's true
  centre, 628.0,568.3 / 1501.5,568.7, a circle fit to the ring's inner
  edge — and placed at the holes) and `.cs-screen` (the recessed
  pane in the window: an outlined play mark at rest, the running counter
  while playing — Jon's Game-Boy window; type in cqw); then the rail
  alone, exactly the tape's width; then the chassis dots. The tape IS the
  play switch: its button clicks the Transport's own hidden toggle (its
  counter is hidden too and mirrored into the screen and into the
  slider's aria-valuetext); `.ls[data-playing]` turns the cores, shows
  the counter and seats the tape 2px. No lamp: the display is the live
  signal. No keys, no dots: the TITLE is the shelf's menu (`.ls-pick`
  button → `.ls-menu` listbox, one option per tape with its label
  colour as a chip; choosing dispatches `car:show`); swipe and arrow
  keys still turn the chassis. Both hub cores turn at 4.4s. Label colour
  = `tapeTint()` in the frontmatter: FNV hash of the title → oklch hue
  (L .76 day / .66 night), then every tape's hue is relaxed around the
  circle together (≥ min(24°, ~(360−16)/n) between tapes, 8° clear of the
  ember hue, pinned oklch `tint`s are fixed anchors) — order-independent,
  no duplicates; any CSS `tint` is honoured, `cover` prints on the label.
  Materials are value steps of ink over `--bg` via color-mix; every seam
  1px. Inks come from the section-local `--au-ink`/`--au-dim` pair on
  `.au` (night override), same law as the ledger; the tints ride inline
  on `.ls` and `.cs-label` reads `--cs-tint` by day and `--cs-tint-night`
  at night (an inline custom property can't be re-declared by a
  stylesheet rule on that element). Transport.astro is untouched: its
  parts are re-laid from StudioOne with `#soundlab` specificity and
  `display: contents` on `.tp`. Never scrub in a circle; never bring back
  a dark card by day; never scale the tape by editing the PNG — the
  cut-out geometry (hub holes: centres 630.5,570 / 1507,570, radius 133;
  display 814..1318 × 437..703, of 2132 × 1305) is baked into the
  `.cs-hub`/`.cs-reel`/`.cs-screen` percentages. The turn animation runs
  always and is paused at rest (a pause holds the angle).
  ROUND FOUR (2026-10-13): the TRACK's height follows the SHOWN slide
  (script after the wallet's `car:change`, eased 260ms): the blank deck has
  NO placard reserve (mini → tape → rail, tight: the tape 54px under the
  mini at 1440), takes the tapes' shared height the moment a hand opens its
  wallet or a preview prints (the first settle's peek alone moves nothing),
  so choosing a tape is a pure crossfade and between loaded tapes the tape
  and rail still hold one y.
  2026-09-18 (Jon): the deck starts EMPTY — slide 0 is a blank tape
  (`.ls-blank`: unprinted label, dark window, inert button, dead rail) and
  `count = tracks + 1`. The title dropdown is RETIRED for THE WALLET: a
  miniature tape (`.wl-pick > .mini`, the shell over dark plastic over the
  tint at the label geometry) at the placard's left, one title-line tall;
  pressing it drops `.wl-strip` (sleeves, one mini each) to the LEFT of
  the mini on desks ≥1160px, under it below that; hover/focus previews a
  tape's words in the placard (`data-preview`); a press flies the mini
  into the slot and `car:show`s slide k+1. `.wl-strip[hidden]` must keep
  `display: none` (the strip's own display rule beats the attribute).
  The wallet holds exactly the manifest's tapes in every environment (the
  dev-only stand-in fill was removed 2026-09-22).
  THE VOLUME (2026-10-07, Jon: a standard vertical slider right of the tape,
  perpendicular to the timeline): `.ls-vol` on every slide, a 120px fader
  standing on the rail's line ~62px right of the tape (3px track, ink below a
  13px round thumb); one level for all tapes (audio.volume = level², kept in
  localStorage `uxj-tape-vol`); drag/click or arrows/Page/Home/End; no wheel;
  pointer focus is dropped on release (never preventDefault its pointerdown:
  that froze the site's cursor dot, which follows mousemove); hidden < 900px
  and where a page can't set volume (iOS → `.au[data-novol]`). A first cut
  ran the tape's full height: "wayyyy too long".
- Carousel.astro has two modes: `slide` (translate) and `dissolve`
  (slides stacked in one grid cell, crossfade + a 300ms top-down render
  with a scan on the arriving slide, `data-on` on the active slide, a
  `car:change` event). Both homepage rooms use `dissolve` (Jon,
  2026-09-09: sliding pictures went under the keycaps and broke the
  physical feel). The Visuals key measurer listens for `car:change`;
  `car:show` (detail.index) asks a chassis for a slide. In Visuals the
  dots sit ABOVE the painted picture (`--lk-top`, measured) and the
  placard sits right under it (Jon, 2026-09-09).
- THE SHEETS + BANDS (2026-10-10, Jon: titles above the items, each module
  in one sheet that expands, for a first-time visitor). The two builds open
  with a BAND = name (Outfit 3.25rem; 2.5rem under 900) + one line saying
  what it is (`.band` / `.band-name` / `.band-what`; copy = `objects-copy.ts`
  title + dek per build, DRAFT), CENTRED on the sheet's centre line (Jon:
  "signal is centered, the others are to the left"); the fold's hook is
  centred too, and the phone and watch stand CENTRED in their 44cqw columns
  (the left axis belonged to the retired top-left hook). NO OTHER ROOM GETS A BAND: SIGNAL, look and
  listen stay untouched (Jon: "i didn't ask that music / drawings get titles
  or changed"; "i don't like the signal heading at all"). Each build is ONE
  SHEET (`.wk` = the old story card's white/hairline/28px): band → object +
  run + caption → the fold (hairline → the locked hook `.wk-lede` AND its
  said line `.wk-said`, BOTH ALWAYS VISIBLE, outside the clip (Jon,
  2026-10-13: "the subtitle visible, with the arrow allowing the
  expansion"; 2026-10-19: "the previews don't make a lot of sense … part
  of a quote, but then not the subtext": the headline and the line that
  answers it, one two-line thought, the said line 12 over the handle) →
  the chevron `.wk-more` at the sheet's lower edge; everything after the
  said line sits in `.wk-story-clip` at height 0 and `inert` until the
  chevron opens it, no faded peek, nothing opens it by itself. ONE CLICK
  (2026-10-19, Jon: "if they are going to be expandable, it should just be
  one click"): the chevron opens the WHOLE fold, the evidence and the
  locked paragraphs together, and closes it all; the label-button
  `[data-whole]` and its hidden body are retired. ONE FOLD ANATOMY on every
  sheet that still folds (Intake alone since 2026-10-23; AudioDex has NO
  fold since THE GROUND, 2026-10-22, the Studio none since THE THESIS,
  2026-10-23): at rest the hook ALONE and the chevron; open,
  said (the clip's first block, `.wk-story-clip > .wk-said`, one rule for
  both) → [the evidence] → the floor line `.wk-rule` (0.9375rem / 1rem
  wide, centred, 62ch, ink). THE WHOLE STORY is on NO sheet since
  2026-10-22 (the Studio's left with THE CUT; the column splitter and
  `.wk-story-body` / `.wk-p.hinge` / `.wk-list` / `.wk-whole-lead` are
  deleted; the locked paragraphs stay in builds-copy.ts). The gaps are ONE set of numbers, set at the shared rules in
  StudioOne and never per sheet: said → the clip's first block 36 (44 on
  a wide sheet: 12 + the first block's 24 / 32), every hairline inside the
  fold 24 / 32 under the block above it, evidence → the floor line 36,
  label → columns 24 (the 2026-10-19 audit: every computed style equal
  across the three at 1440 and 375, day and night). The comet re-measures
  on the body's height change, so the fold never misaligns the bead). One sheet rhythm: pad 56 (`--sheet-pad`, 20 under 900) ·
  name→line 14 · band→object 56 · object→fold 56 · fold top 48; sheets
  `--room-gap` apart (round three: ONE GAP for the whole homepage, see
  ROOMS). AudioDex comes FIRST (the first rail mark names the object
  "work" centres). The modules no longer get a `head` slot, so the host
  re-applies the Archive's rail-centred-on-the-phone rule (Jon, 2026-09-24)
  itself.
  ONE ANATOMY + THE KIND WORD (2026-10-13; Jon's round two: the numbered
  readout "build 01 / 04" was ugly, "leave just the descriptor"): the
  three builds' sheets AND the fourth read as modules of one system; the
  HUD feel comes from consistency and chrome, NEVER from material (paper
  stays paper, no dark panels, no glow). The shared sheet lives in
  `src/styles/sheet.css` (`.sheet` = fill, 14% hairline, 28px/20px corners,
  `--sheet-pad`, inks `--sheet-ink/-dim` that follow `--night-*`, a named
  container `sheet`; `.sheet-kind`, `.sheet-sec` (12% hairline above every
  section), `.sheet-t` (the label face, lowercase), `.sheet-cols/-col/-p`,
  `.sheet-step*`), imported by StudioOne (the `.wk.sheet` articles) AND
  SignalCard (`.sc` is a `.sheet` too, on the homepage and /signal;
  HowToPlay's container queries measure the sheet's CONTENT box, thresholds
  787/367). Each sheet sets only `--sheet-acc` (archive #b9701a · watch
  #ff6b4a · signal sapphire · studio #2a5bd7). THE KIND WORD (2026-10-13 round three, Jon: "on the right side"): one
  mono word in each sheet's TOP-RIGHT corner (`.sheet-kind`, absolute,
  top 23px / right `--sheet-pad`, 15px on phones; `.sheet` is
  `position: relative`; the label face, dim):
  `foundation` (AudioDex, since THE GROUND; was `app`) · `program` ·
  `instrument` (above SignalCard's `.sc-title`) · `suite`; DRAFT `kind` fields in objects-copy.ts / signal-card-copy.ts,
  Jon's words. No numbers anywhere on the sheets (`build-order.ts` is the
  rail's ordered list only). SIGNAL still gets NO band.
  THE FOURTH SHEET, SIGNAL STUDIO (2026-10-13, Jon: "loop that in"): its
  own room `#studio` (`.room`, shown on PHONES too: captures, not the
  instrument; phone `order: 1`, after the work sheets by document order)
  after `#play` and before `#illustrations`, one `.wk.sheet#build-studio`.
  THE THESIS (2026-10-23, Jon across two days: "it could all happen in
  Ableton, but not in this order … it's the lack of decisions I need to
  make at every level"; "a sketch, not a lab"; "commitment via
  constraint"; the older sheet was "a rough draft from long ago"): kind
  `suite` → band ("Signal Studio" + the dek "I stopped opening Ableton.")
  → THE OBJECT = ONE 16:9 FLIP CLIP (`.st-clip`, the content's width, the
  band's 56 above): `public/builds/studio/flip.mp4` by `fs.existsSync`
  (`FLIP` in StudioOne's frontmatter), WITH SOUND, the drawn 64px key on
  the frame, plays on a press only, pauses on the next, pauses when the
  frame leaves the viewport; undated, no caption, no placard; until the
  file exists the HONEST EMPTY FRAME (1px outline in the dim ink at 18 %,
  square, the key dimmed, disabled, nothing written on it). Jon drops in a
  favorite clip when he has one (no dependency on the show being current)
  → FIVE HIGHLIGHTS (`.st-hl`, a list with no marks; every row a
  `.sheet-sec`, its hairline above, the first 56 under the clip): a real
  frame of the Studio (`public/builds/studio/moment-<frame>.webp`, the
  sheet's inner 14px corner + the 14 % hairline) LEFT and ONE sentence
  RIGHT in the said line's face (Outfit 400, 1.25rem / 1.5rem) on a wide
  sheet (≥ 820: 11fr / 9fr, 48 apart, centred on each other; NEVER
  alternating sides), frame then sentence under 820: hands ("In one click
  it can sample any instrument you own, so you can take it anywhere.",
  its one mono caption under the frame "your laptop, a MIDI keyboard, a
  controller") · radar ("Play any song and it detects the tempo and the
  key, whether it's a friend on guitar or a playlist on your computer.")
  · chips ("Anything you play or run through it becomes a loop, and a chip
  is a loop you've committed to.") · effects ("Fewer knobs than Ableton,
  on purpose."; one name across the sheet: Ableton, never "DAW") · take
  ("The loops you keep stack into a song, and the song prints as stems.");
  the engines frame is unused (the engines are SIGNAL's job; SIGNAL sits
  directly above, so nothing here re-sells drums, bass, keys or
  always-recording) → THE DOOR (`.st-door`, 56 under the last row, the
  label face, centred, NOT lowercased): "@tolo.fm · Saturdays", the handle
  the sheet's ONLY link (https://www.instagram.com/tolo.fm, `_blank`,
  noopener; the accent mixed 80 % toward the ink by day, 50 % at night, a
  1px underline). NO FOLD: `#build-studio` pads its own foot (AudioDex's
  rule); the hook, the said line, the keep line, the chevron and the whole
  story left (the locked piece "Making music was never the hard part."
  stays in builds-copy.ts; `said` / `keep` commented in objects-copy.ts).
  RETIRED to junkyard/: `StudioMoments.astro` (the six tabbed moments) and
  `StudioCircumstances.astro` (the circumstances row, kept with its
  chassis CSS, the studio keycap rules and its script); the strings stay
  commented in `STUDIO_COPY`. Every line is DRAFT, approved by Jon
  (`STUDIO_COPY.dek / highlights / door`). 1410 → 2678 tall at 1440,
  1790 → 2056 at 375. Spotify is deliberately NOT named anywhere on the
  sheet (capturing a streaming service's audio breaks its terms).
  THE SKIM (2026-10-15, the round that began with Jon: "the current scripting
  feels too long to hold anyone's interest … the under the hood area feels
  tiny, wordy, no images or actual understanding … everyone has tiktok
  brains"; a first pass of three beats + a drawn icon chain + a counts
  readout was rejected as "AI slop" and is retired). THE LAWS: the modules
  are A MOVIE: manufacture the most dramatic version (real DNA is enough;
  never ask whether a scene is real); every word and mark must be helpful
  or enjoyable; a number earns its place only when it settles a doubt the
  reader has at that moment; nothing in an open fold may move the page
  (a pressed line prints in a slot reserved to the tallest). THE ORDER:
  Intake → AudioDex → SIGNAL → Studio (Jon: "a better hook"; AudioDex is
  the floor Intake stands on, the Studio is SIGNAL on steroids;
  `build-order.ts` + the rail's NAV). THE HERO LINER IS GONE. Each sheet's
  open fold is its own scene and ends on THE WHOLE STORY (the locked
  script under a plain label, opened by the same one click since
  2026-10-19): INTAKE = THE SPINE (round seven of the catch-all, 2026-10-22; Jon's
  thesis: "a catch-all system that doesn't care about the location or
  medium of how the information is getting into the system"; of the
  locked headline: "I don't think it's my best idea that my calendar
  changed"): the sheet's three jobs are the catch-all (any way in), the
  watch (right now, you: `try it`) and the fold (WHAT COMES OUT: one
  breath, five changes, against what that would have cost by hand). THE
  HOOK at rest is the sheet's own, `WATCH_COPY.hook` in objects-copy.ts
  (since 2026-10-22, night, Jon's words: `What would've been 30+ clicks is
  now a one-sentence update.`; was `It doesn't care how it got in.`, his
  "Batman coded"), printed in `.wk-lede` instead
  of the locked headline, which stays in builds-copy.ts for the case study
  (the other sheets keep their locked headlines). At rest the hook ALONE
  and the chevron (THE CUT, round five, Jon: "the bottom section is still
  tons of words … what's actually necessary here?"). OPEN, in order: the
  sentence once (`.wk-said`, the clip's first block, Intake only; SHORT
  since round six, `proof.said` in intake-run.json, DRAFT, the real
  transcript kept beside it) → TWO DRAWN MODULES (`IntakeProof.astro`,
  the pair 640 wide, side by side ≥ 820 of the sheet, stacked under, one
  shared height; no screenshots, the `.vs` figures and their webp files'
  use are gone): `by hand` = what the sentence costs in the Calendar app,
  a PILE of four New Event sheets in iOS's grammar on the paper in the
  sheet's DIM ink (`.form`, 208 wide, 9.5px, each `--k` × 12px down and
  right, the last on top: Cancel · New Event · Add, Title, Location,
  All-day with its toggle, Starts, Ends, Repeat Never, Alert None, the
  four titles and the real times, the Ends an hour after, DRAFT) and the
  Delete Event confirmation for the wedding over the pile's lower right
  (`.confirm`: iOS's action sheet, `Delete Event` in #ff3b30, the one
  colour on the pile, Cancel; no name line, so the top form's Starts and
  Ends read), static, the pile's box 224 tall;
  `Intake` = Fri · Sat · Sun of March 2027 in the catch-all's calendar
  grammar (the letters, the numerals, the bars in the Intake red,
  `--bar-*` day and night, the week's min-height 150); WHEN THE FOLD
  OPENS the week plays (a MutationObserver on `.wk-story[data-open]`, the
  fold's own mechanics untouched): the wedding bar across the three days
  leaves (opacity + 6px lift, 400 ms), a 600 ms hold, then the four bars
  arrive 220 ms apart (delays 1000 / 1220 / 1440 / 1660 ms, the month's
  pop); closing resets it (`.still`); reduced motion = the after state at
  once → NOTHING ELSE: the whole-story section left this sheet in round
  seven (the locked paragraphs stay in builds-copy.ts, untouched), as did
  the `0:31 · from the wrist` fact and round six's Siri module
  (junkyard/IntakeSiri.astro); under the hood (`IntakeClock.astro`,
  junkyard/) and the one-match rule were cut in round five. The words at
  rest on the whole sheet: the kind word, the name, the dek (6), `try it`
  (2), the hook (7). The Studio's fold took the same cut on 2026-10-22
  and the whole fold left with THE THESIS (2026-10-23, see THE FOURTH
  SHEET);
  AUDIODEX = THE GROUND (2026-10-22, Jon: "the heart of so many other
  things I've built: the database is required and a prerequisite to have
  something like Intake"): the SHORTEST sheet, NO FOLD: kind `foundation`
  → band (AudioDex + the DRAFT dek, since 2026-10-22, night, from Jon's
  brainstorm (his two lines in the comment): "Computers are surprisingly
  good at listening. Every recording I own, transcribed, keyed and
  searchable."; THE GROUND's "…transcribed by Whisper, measured and named.
  Intake and the Studio stand on it." he called "trying to sound cool")
  → AudioDexDoor unchanged (the one beat: the ground knows what
  a recording is, not what it's called) → ONE floor line `.adx-floor`
  (.wk-rule's size, centred, object → it 56, the sheet's pad under it;
  `#build-archive` pads its own bottom, having no handle): "Read by Intake
  above and the Studio below." (DRAFT, `ARCHIVE_COPY.floor`), the two names
  PLAIN WORDS in the line's own face since 2026-10-22, night (Jon: "this is
  consumed top to bottom; it doesn't make sense to jump backwards or skip
  the SIGNAL instrument"; the links, their amber and underline are gone;
  never link a sheet to a sheet). The hook, the
  said line, the `.adh` strip (markup and CSS DELETED) and the whole story
  left; `ARCHIVE_COPY.said/whole/rule` stay commented as the record, the
  locked paragraphs in builds-copy.ts for a case study. 1185 → 1014 tall
  at 1440 (1591 → 1365 at 375); the STUDIO = THE THESIS (2026-10-23: the
  band, one FLIP clip with sound, five highlight rows, the door to
  @tolo.fm, no fold; see THE FOURTH SHEET; the six moments, the
  circumstances row and THE CUT's fold are in junkyard/ or commented);
  SIGNAL's card = THE CUT (2026-10-22, Jon of the
  receipt: "that's stupid that I would say that before they even touched
  the instrument"): kind word · SIGNAL → the device → how to play → ONE
  line, `.sc-line`: the dare "You can't play a wrong note." (DRAFT,
  `CARD.dare`) at rest; THE RECEIPT "Your first song is in your
  downloads." (`CARD.receipt`) replaces it in the SAME grid cell (nothing
  moves) only once true: the instrument emits no event, so SignalCard's
  script watches the static `[data-corner="export"]` for the cap
  (`[data-ctl="export"]`) taking `.saved`, which export-view.ts sets in the
  tick it hands the WAV to the browser; then `data-printed` on `.sc`, the
  line `role="status"`, the sapphire mixed 56 % toward the ink by day
  (5.1:1), bare at night; it stays for the visit. The story, under the
  hood and where it came from left (strings commented in
  signal-card-copy.ts; signal-copy.ts's unmounted BRIEF reads the dare).
  1727 → 1348 tall at 1440. THE FEELING (2026-10-22, late; Jon's razor:
  "not the safety. it's the feeling of having made something, easily,
  instantly, tangibly"; register: bold, sincere or funny, matter-of-fact,
  never literal, serious, dramatic): the dare LEFT (commented in
  signal-card-copy.ts) and `.sc-line` moved ABOVE how to play, right under
  the device (the stage's 56 above it, 32 to the hairline): kind word ·
  SIGNAL → the device → THE MOVES `CARD.moves` "Space = drums. A–L = the
  white keys. B = bass, and it follows whatever you play." (Jon's content,
  the `=` form his, DRAFT as set; the display face at 1rem, one line on a
  wide sheet, a line each under 620 of the sheet) → how to play, nothing
  else. THE RECEIPT in the moves' slot is Jon's line, NOT draft: "Good or
  bad, you just made a demo." (same `.saved` watch, accent, role=status,
  stays the visit). THE FILE: export-view.ts's `songName()` returns
  `SONG_FILE` = "UXJON.COM CHANGED MY LIFE.wav" for every song (was
  `signal-<day>-<key>-<mode>-<bpm>bpm.wav`; its arguments and SongInfo
  kept, the screen's evidence still prints length · key · tempo); neither
  types.ts nor the gate pins the name. Every
  DRAFT line lives in objects-copy.ts / signal-card-copy.ts, Jon's to
  rewrite; the hoods never print his real rows.
- THE CATCH-ALL + THE RECORD BUTTON (2026-10-21, branch `intake-v4`, fresh
  eyes after five attempts in two days; Jon on the pile, the fifth: "The
  view of the calendar isn't good enough to be relevant. I don't know why
  we need the phone to be on the right side as well. There's too many
  other notifications with extra words that feel irrelevant and hard to
  navigate through. And the subtext saying tap what's yours is stupid and
  weird." then "I need fresh eyes to take all of this and take another
  swing"). THE LAWS the five teach, all held at once: INTAKE IS THE HERO
  (the stranger sees Intake's own interface, the product Jon built, never
  Apple's apps as the object); Intake need not sit in a phone frame; ONE
  LIVED MOMENT with a before and an after, moved by the visitor's presses
  one at a time; ONLY WHAT MATTERS ON SCREEN (noise felt, never read; no
  filler notifications with words); A CALENDAR ONLY AS A REAL, LEGIBLE
  VIEW or not at all; NO INSTRUCTION TEXT, ever (the rims say what can be
  pressed; "tap what's yours" is the line never to write again); keep the
  memo whose words arrive in sequence; THE SIRI TEST. Intake's surface is
  the real app at /intake (intake_web.py: the STREAM, a feed of cards on a
  dark ground, each with its source spine, age, the phone glyph, the kind's
  chip or the receipt's green ✓ and compact line, the X, the tiles Claude ✦
  · Zzzz · Add to…; ROWS; LOG). The Intake sheet reads kind `program` →
  band ("Intake" + the dek, Jon's words since 2026-10-22, night: "I
  recently started texting myself a lot and talking to my watch."; was
  "Texts and memos in. Tickets out.") → THE
  CATCH-ALL → THE WATCH → the fold exactly as `fold` left it. THE SORT, THE
  BOARD, THE SEND and THE PILE are RETIRED to junkyard/ (IntakeSort,
  IntakeBoard, IntakeThread, IntakePile and their json); their images live
  in `public/intake/board/`. The storyboard is `docs/STORYBOARD-intake-v4.md`.
  THE CATCH-ALL = `IntakeCatchAll.astro` + `src/data/intake-catchall.json`
  (every line DRAFT; the save-the-date capture 49, Theo & June invented;
  the Marketplace line capture 53's; the Thundercat receipt real; the memo
  capture 32 with the name swapped to Nico; "boots lena" invented): TWO
  COLUMNS THE PHONE'S HEIGHT, all in one screen at 1440 × 900 (beneath, the
  month's rows fell under the fold: the stranger never saw it turn):
  `grid-template-columns: minmax(0, --pw) minmax(0, 1fr)`, `--pw` from the
  host `--ica-w: min(32cqw, 70svh · 864/1760)` (309 × 630 at 1440 × 900),
  `--ph` = the phone's height written out, `--ica-gap: 24px` (the
  photographed body's buttons stand outside its column; 20 overlapped the
  panel). LEFT, THE LOCK SCREEN as it was (a drawn wallpaper, light by day,
  dark under `html[data-night]`; the date, the thin clock; drawn in iOS's
  grammar with drawn app icons, never Apple's): FIVE pills and NOTHING
  ELSE (his notifications are off; the noise is the five shapes in one
  grey glass, nothing done), each BREATHING (the touch rim + light on every
  `.ntf`, the house keyframe, change all or none) and each a `<button>`
  press: Messages · Jon · Photo (the save-the-date thumb) · Messages · Jon ·
  Screenshot (the concert email) · Messages · Jon · the Marketplace line ·
  Intake · Memo saved · 0:18 (the wrist glyph on the accent) · Messages ·
  Jon · "boots lena" (1:41 AM). RIGHT, INTAKE, ONE COLUMN (round four,
  2026-10-22, Jon: "the outline for the Intake cards is kind of weird, the
  rounding is weird … the calendar and the Intake cards in the same
  column, in two rows"; round two's phone-silhouette outline read as a
  third phone and is gone): `.ica-intake`, a flex column `height: --ph`,
  the width the two columns had, two frames in the calendar's outline
  (`--cm-line` 1px, radius 16, `--cm-ground`), 16px apart. TOP, THE
  CARDS' WINDOW `.ica-app`: `flex: none`, `height: calc(3 × 5.714em +
  2 × 0.5714em + 2em + 2px)` = three one-line cards (284 at 1440),
  reserved from the first paint; the feed inside is absolute, padded 1em,
  `overflow: hidden`, its foot a mask fade (`calc(100% − 2.6em)` →
  `calc(100% − 0.5em)`); a landing PREPENDS its card (the real Stream,
  newest first) and the feed slides down by the card's height (WAAPI,
  360 ms; the arc lands at the window's top); past the third the older
  cards are under the fade. Four cards' height did not fit beside the
  month (the month's rows need ~46px for a bar). Each card is THE REAL
  INTAKE CARD (round three, 2026-10-22, Jon: round two's "look a bit
  unprofessional and lack identity"), intake_web.py's article.ticket:
  the 3px LEFT SPINE in the source's colour (`src` in the json: thread =
  the Messages pill's green #34c759, wrist = the sheet's ember #ff6b4a;
  the watch's live cards wear the wrist's too, `SRC` in IntakeHero: one
  hue per source for the whole sheet), 12px radius, the 1px line, the META
  ROW on top (the age as the lock screen showed it · the kind's chip,
  uppercase, EVENT · IDEA · TASK · REMINDER in the app's KIND_COLORS
  #d9a845 / #8fbf6f / #e0a35b / #d9a845 · on a receipt the green ✓), the
  TITLE in the system face (-apple-system, system-ui; 650, receipts 600),
  one line under it (a receipt's "where · when" faint; an open card's
  `what` at the muted ink, the 44px thumb right of the text on the
  Marketplace card only); no X, tiles, verb buttons or header. THE
  PALETTE: by day the app's dark palette translated to the paper (`--tk-*`
  on `.ica-app`: surface = the sheet's white, line = the ink at 14 %,
  muted / faint = the ink at 66 / 58 %, the chips mixed 62 % toward the
  ink as the watch's are, 4.8:1 on white, the ✓ #79a465); by night the
  app's own palette AS IS (#1c1f1b · #2e332c · #eaece5 · #9ca294 ·
  #767c6f · #8fbf6f, the chips' colours bare), so the column IS the app.
  THE SCALE: the card is set in em on ONE size on `.ica-app`,
  `clamp(11px, 4.53cqw, 14px)` (14 at 1440: titles 14 / receipts 13,
  lines 12 / 11.5, the row 10.5, the chip 9.5, padding 10 14 9, gap 8;
  12.5px on a middling sheet so the month keeps its rows; 13.8 at 375). A
  receipt sits at .85. The SIX stand in the flow at opacity 0 from the
  first paint. BOTTOM, THE MONTH (`.cm`, `flex: 1`): his calendar as the
  iPhone draws a month, taking what the window leaves (rows ~49px at 1440,
  `grid-auto-rows: minmax(0, 1fr)`): one `.cm-page` per month a landing
  needs (today's first; `--p` on `[data-cal]` slides the track 520 ms
  eased), each the month's name, the weekday letters, a grid of whole
  weeks, the other months' days dim, today (2026-10-20, pinned: an
  exhibit) white in the red ring; a bar (`.cm-bar[data-bar]`, Intake red /
  Idea yellow from the board's `--cal-*`, 10.5px, top 28, the TITLE ALONE
  on one line cut with an ellipsis at every width since round four: the
  time `<i>` is in the markup and `display: none`) lights 120 ms before the
  slide ends, or 200 ms after a landing on the month already
  shown.THE PRESS (the runline fills in the foot for its own length): the
  pill LIFTS (scale 1.03) and OPENS the way iOS opens a notification
  (`[data-more]` to its scrollHeight, 320 ms: the photo, the screenshot,
  the listing full width in the pill; the others step back to 0.3 under
  `.busy`), HOLDS 600 ms so you see it, then a clone flies inside a
  `.flyer` wrap (a container the phone's width, so the pill's cqw hold) on
  a WAAPI curve to the card's rect (500 ms, shrinking into it, never
  growing; the card `.in` at 72 %, the clone fading at the end), its slot
  closes (320 ms, inline height → 0); a dated landing pages the month 300
  ms after. The photo ≈ 2.3 s end to end; "boots lena" has nothing to open
  (lift 160 → fly) ≈ 0.9 s. THE MEMO: the pill opens into `.mstrip` (300
  ms): the wave in the sheet's accent (the watch's bars), the clock 0:00 →
  0:18 pacing to the play, the words typed IN SEQUENCE one per 140 ms (20
  words, 2.8 s); then its two tickets fly from the strip 300 ms apart (the
  receipt "Call Nico" · "Reminder · Sun 3 PM", the open "Make the résumé
  sticky on the homepage") and the month takes Sunday the 25th; ≈ 5.4 s
  (round four, Jon: 400 ms a word "still takes way too long": `data-pace`
  140, the twenty words in 2.8 s, the clock 0:00 → 0:18 over the same).
  THE SLOT FOR SOUND: `public/intake/memo-nico.m4a` (existsSync at build
  time): absent, typing only; present, an `<audio>` plays on the press and
  the words pace to its length. Jon records it. ANY ORDER; a press during
  a press is ignored; after the fifth the lock screen is the date and the
  clock alone, Replay (the house pill) puts everything back in one step
  (`.still` kills the transitions, the cards return to their resting
  order, the month to page 0). THE COUNT (2026-10-22, the outside read:
  the wedding "slides under the fade" read as gone): `.ica-more` = "+ N
  more" (the watch's line: mono 0.6875rem, the muted ink, on the window's
  paper) centered in the window's fade, outside the masked feed, counting
  the landed cards whose top is under the fade (`tally()` on each `.in`
  and on Replay); chosen over pinning, since a landing is prepended at the
  top and always in view. The foot is ONE SLOT, runline · Replay, NO
  HINT. A MIDDLING SHEET (620–899 of the module, a 1024 desk): the phone
  at 40cqw, Intake's column beside it as on a wide sheet (588 tall; the
  cards at 12.5px, the rows 47). NARROW (< 620): the lock screen 82cqw
  centred, the cards' window under it at the sheet's width, the month
  under that at its own height (54px rows). Reduced motion:
  no opening, no arc, no paging, no typing; a press shows the card and the
  bar at once. One sheet height through every press (round four: 1440:
  2058; 375's main 9182 before and after). One polite live region says each press in one
  sentence, then "Everything sorted. The phone is quiet." Probe: the
  scratch catchall-qa.mjs pattern (headless, muted, 1440 day / night, 375
  touch, two orders; captures in `~/Documents/studio-build/catchall/`).
  Pane gotcha: a 1440 emulation screenshots a ~0.78-scale crop, and a
  hidden pane throttles nested timers, so timing is read from the headless
  probe; the dev server's toolbar answers 504 "Outdated Optimize Dep" after
  a build in the same folder until the preview is restarted.
  THE LAW AMENDMENT (2026-10-19, late): A SIGNBOARD MAY TURN BY ITSELF; A
  RUN, A MACHINE AT WORK, STARTS ONLY ON A PRESS. "Nothing presses itself"
  still governs the watch, the phones and the Studio's captures.
  THE WATCH IS A RECORD BUTTON (`IntakeHero.astro`, rewritten; Jon: "why
  isn't it just a big record button? A red record button is Voice
  Memos"): at rest the face is INTAKE and ONE RED RECORD RING (a thin light
  ring, the #FF3B30 disc, 56 % of the screen, its red light on the
  touch-breathe keyframe), nothing to read. Press (`data-state` asking →
  listening): the ring steps down to 34 %, the disc becomes the stop
  square, the clock counts up, the wave moves, the heard words print at the
  face's foot; no speech service or a declined microphone = typing ("type
  it" on the face, the field under the watch in the caption's cell, which
  holds the taller's height). Press again: saved (the check, "saved"), the
  runline from the stop until the parse answers (eased toward 90 %, full
  on the answer); the tickets slide out BESIDE the watch (a wide sheet:
  the column is the watch's height, the cards that fit stand, the rest are
  "+ N more"; under it on a narrow sheet) as Stream cards, an executed one
  a receipt with the green check and "Reminders · Friday morning", the
  rest the kind's chip and their points (a point that repeats the title is
  dropped), a local parse its "without Claude" chip; under them "a preview.
  nothing was added." and the privacy line. SAVED_MS 2,000 later the face
  is the ring again; the cards stay until the next press. No ticket:
  "nothing to file" on the face for 2,000 ms, no card. Nothing heard: back
  to the ring, the hint says so. DELETED: the run column, its nodes and
  spine, the fly, the talk pill, Replay, the stages s1–s6, the result's
  caption, the host's face overrides in StudioOne. The foot reserves three
  lines of hint (the typed hint moved the fold 16px); the hint at rest is
  `try it` since 2026-10-22 (THE CUT; was "say a few things you have to
  do."), the watch's only line, no caption under it. On a desk nothing
  below the watch moves through a typed run or a nothing run (day and
  night); on a phone the cards land under the watch and push the fold down
  (504px for three cards), nothing above them moves. The live pipeline
  (`api/intake.ts`, `intake-local.ts`, the schema) is untouched, except
  THE DATED TAIL (2026-10-22, the outside read typed "…and dentist Thursday
  at 2" and got one card; keyless, every typed run is the local parse):
  `intake-local.ts` splits a clause at a comma / "and" before a short
  phrase carrying its own day AND time (DATED_TAIL, only if the left side
  is already something) or after one (DATED_HEAD, only if a fresh ask
  follows, never "put that on the calendar"), and a bare day-and-time
  phrase of ≤ 8 words is an event. `node scripts/intake-fixtures.mjs`
  stays 12/12.
- WORK is OBJECTS (2026-09-18; the ledger/matrix is DEAD): the room holds
  Jon's Claude Design modules, one per build, framed by words — the locked
  headline from builds-copy.ts above (the DRAFT dek under it was removed
  2026-09-22: title → object), the module, a DRAFT caption from
  `src/components/studio/objects-copy.ts` (Jon-editable), the locked
  paragraphs beneath. At rest each module shows only its title, its greyed
  nodes and the object: a node's words arrive with its stage (2026-09-22). (SUPERSEDED 2026-10-19 for
  Intake: its object is THE SEND, the record-button watch beneath it; see THE SEND above.) Object one = the Intake
  hero (`IntakeHero.astro` + `src/data/intake-run.json`; its memo cue
  "Cinder 32" is Intake's real alias for capture 31, length 3:52, seven
  tickets of which the module shows two). It is Jon's REAL memo BY CHOICE
  (2026-10-06: "i like the reality and authenticity of it, do not change"):
  the art-not-diary rule covers the Archive, not the watch, and its "Zzzz"
  button stays. Object two = the Archive
  (`ArchiveHero.astro` with `story={false}` — the room frames it with the
  locked words — + `src/data/archive-run.json`). 2026-09-30 (Jon): the
  run is ART, an example anyone gets, never a row from his library — the
  "chorus" run (the idea from three summers ago, a porch guitar take);
  the phone leaves the recorder for a HOME SCREEN (`face-home`, stage
  class `home`, the AudioDex tile pressed) and the library opens as an
  app scaling out of the tile; the moment view lists what each tool
  assigned (`moment.assigned`); `src` null so play stays dimmed.
  SUPERSEDED 2026-10-15 (round two, Jon: "a side by side, more like
  Crediverso … as few texts as possible"): AudioDex's object is
  `AudioDexDoor.astro` + `src/data/audiodex-scene.json` (ArchiveHero and
  archive-run.json are in junkyard/; IntakeHero's "change both or neither"
  twins — the replay pill, the foot, touch-breathe — now live in
  AudioDexDoor). TWO PHONES, ONE WORD: Voice Memos (the files as numbers)
  beside AudioDex (the same files named); a press on either types
  `thanksgiving` into both; Voice Memos answers No Results, AudioDex finds
  the memo and the song it became, opens the memo and it PLAYS: the REAL
  first 18 s of the Thanksgiving A Capella tape (Jon's pick; the word is
  never said in it), cut to `public/archive/thanksgiving.m4a` (existsSync
  slot: gone = the key drawn, dimmed, inert), its Whisper lines lighting as
  said. Its last row links down to the music room and the host loads that
  tape (`[data-tape-jump]` → land the room, settle, `car:show`). No caption,
  no rail; the fold was the hook → ONE STRIP (heard · measured · named ·
  drawn · linked) → the floor line → the whole story, all GONE since THE
  GROUND (2026-10-22: no fold, one floor line; see THE SKIM).
  UNDER THE HOOD: a `.wk-spec` ledger card under each story card, rows
  from `src/components/studio/depth-copy.ts` (Jon-editable; the tools
  and stages of the real M1 systems, never his content).
  Objects stack in `.objects` with the room gap between them
  (`.wk + .wk`). Inks come from the section-local
  `--mx-ink`/`--mx-dim` pair on `.work` (day = `.one`'s --ink/--dim, night
  override = --night-ink/--night-dim) — never a hardcoded ink there
  (`.one` shadows the global --ink, so plain `var(--ink)` does NOT flip).
  PRESENTATION PASS (2026-09-21, branch `polish/builds-pass`): the room's
  type is the modules' own three faces and no fourth — Instrument Sans
  body 1rem/1.6 on a 36rem measure (~64ch), JetBrains Mono captions
  0.75rem/0.04em and labels 0.6875rem/0.12em/500 lowercase (the hints,
  the run + rail labels, replay), Outfit 500 hooks 1.75rem (1.5rem
  ≤720px) — on one 4/8 scale (`--sp-*` on `.work`: hook→dek 12 ·
  dek→object 32 · object→caption 24 · caption→read 48 · ¶ 16; the phone
  gutter is 14px both sides). Both modules share ONE grid, in container
  units of the module (`container-name: hero`): object column
  `minmax(0, 44cqw)`, 6cqw gutter, 48px rows (since 2026-09-22 the Archive's
  object column is the RIGHT one — `'rail phone'`, both dot columns on the
  module's centre line (50cqw), the phone starting at 56cqw, height-capped
  by the host, its rail MIRRORING the watch's run beside it: dots on the
  phone's side one gutter away, words running left, right-aligned; stacked
  it reads left-to-right again). THE ARCHIVE'S WORDS (round 2, 2026-09-22):
  the title over the phone on its left edge (56cqw); the caption and the
  story beneath, left-aligned from the dots' left edge (50cqw − 5px) to the
  module's right edge — the watch's width. Node/dot
  10px on a 1px line
  with the text 32px in; collapse under 820px of MODULE width; stacked,
  the watch is 70cqw and the phone 80cqw, centred. The host caps both
  devices on desks only (the cap lives inside the ≥820 container query;
  unscoped it shrank the stacked phone): since 2026-10-07 (Jon: "too in
  your face") the watch 51.3svh at 67.5% of its column and the phone 63svh
  (the old 68.4/76; 57 was "a bit too small"). The OBJECTS shrink, never the
  words: the run beside the watch stays full size, and the face's cqw words
  are set back up from the host ("Cinder 32 · 3:52" bigger + 600, INTAKE
  5.6cqw, the saved face's check 25cqw centred between INTAKE and "Saved",
  its line through the check's centre). NEVER
  `zoom` or scale the run: zoomed, its reserve re-rounded every frame and
  walked the whole page a pixel up and down. THE TOUCH SIGNAL (2026-09-22) is ONE vocabulary on both
  objects: `::after` the blue→purple gradient edge (masked ring / rim),
  `::before` its light (the watch's outward, the phone's inward), both on
  `touch-breathe` 2s ease-in-out 0.45↔1 — an EXACT COPY of the keyframe in
  each module, change both or neither; hover = still + full, `.s1` = off,
  reduced motion = still at 0.75; no halo, no ping. The mono CAPTIONS are HIDDEN AT REST since 2026-10-13 (Jon: the watch's
  "A real memo…" not at default state; the phone's hidden too for
  consistency: `.wk:has(.intake-hero:not(.s6), .archive-hero:not(.s6))
  .wk-cap` keeps its space) and fade in with the colour flash when the run
  lands (`wk-cap-in`); the watch's stood at rest again from 2026-10-19
  (live only) and is DELETED since 2026-10-22 (THE CUT: `WATCH_COPY.caption`
  and its slot are gone; the watch's one line at rest is `LIVE_COPY.hintRest`
  = `try it`, DRAFT). THE WATCH AT REST (round four, Jon: "2× replay and talk buttons";
  SUPERSEDED 2026-10-19, late: the record button, no pill, no Replay, see THE SEND):
  the foot under the watch is the PHONE's slot (`.foot`, one grid cell):
  `tap to stop` at rest, then after the run ONE `Replay` pill identical to
  ArchiveHero's (`.replay`, ink pill, 0.72rem mono, 16px under the object,
  fades in at s6 + 2.6s; "change both or neither"); the live control is ONE
  pill on the watch FACE at its foot, `Try it with your voice` (floored at
  12px, the mic glyph hidden under a 190px screen), hidden at rest; the
  row's `.hint-talk` survives only as the "nothing heard" retry. "YOU'RE
  WATCHING" (2026-10-19, Jon: some visitors thought they had to click
  along; "a super minimalistic progress bar … you're watching something
  play out"; he judges whether it distracts): ONE hairline `.runline` in
  the same `.foot` slot on the watch AND the phones, an EXACT COPY of its
  CSS in IntakeHero and AudioDexDoor (the sort wore it for one round),
  change both or neither: the hint at rest, from the
  press until the run lands the line, then Replay on its own delay. 1.5px,
  96 wide on desks / 72 on phones, the track the sheet ink at 14 %, the
  fill the hint's own recipe growing left → right LINEARLY over the run's
  planned length from the script's own numbers (the watch t3 + 1150 =
  6186 ms, the phones the accumulated t = 7210 ms); in 200ms on the press
  (`[data-running]` on the module), out 400 at the landing; `hero:finish`
  jumps it to full and fades it; Replay restarts it; the live-only watch
  (2026-10-19) runs it from the stop until the parse answers; never under reduced motion (none at all). Not a control:
  `aria-hidden`, no pointer, no label. THE HINTS
  (`tap the list` · `tap to stop`) stand in each build's accent (`--sheet-acc`
  mixed toward the sheet ink until ≥4.5:1, day and night) at 600. The phone types at 180ms a letter
  (`--char` + `CHAR_MS`, was 300) with its stage waits trimmed to match
  (press → s6 ≈ 11.7s, was 17.3s). Beside the watch the run column RESERVES its stage-six height
  (`--run-final`, measured by IntakeHero's script under a motion-free
  `measuring` class, re-measured on fonts/resize) so the words under the
  module never move while it runs; stacked, no reservation (the watch's
  run column is gone since 2026-10-19, late: see THE SEND). The rail's
  comet re-measures its knots on any body height change (ResizeObserver).
  The instrument's intro line (`.sgm-intro`) is hidden from the host. The
  watch PNG's transparent frame (70/68/67/61 px of 521×781) is trimmed in
  IntakeHero with proportional negative margins (ratios of the visible
  383×653) so the visible watch sits on the axis and rhythm — never edit
  the PNG. Lesson: a grid item with `margin: 0 auto` and no intrinsic
  width shrink-wraps to its text (the 64px phone watch) — size it.
  Homepage nav (2026-10-13, Jon's round two: "redesign is the move"; the
  four verbs work · play · look · listen, the two labelled groups and the
  numerals are all RETIRED): the desktop rail is WORDS ALONE, one face
  (IBM Plex Mono 0.8125rem/600/0.06em lowercase, ink #26241f day / #b4bdcb
  night since round eight), right-aligned
  on one x, one
  even column (no words, no glyphs, no numerals, no line since round seven): the builds by name (audiodex → #build-archive ·
  intake → #build-watch · signal → #play · studio → #build-studio), then
  the rooms renamed illustrations (→ #illustrations) and music (→ #soundlab;
  "music" not "audio": "audio" collided with AudioDex and the role line).
  Rows 44px with five EQUAL 30px gaps, NO divider since round seven (Jon:
  "distracting … let them figure it out"), the lit pill 11px radius; the
  JT MARK at the rail's head since 2026-10-15 (`.rail-jt`, absolute at
  top 22 so the column and the comet's knots never move: the favicon's
  letterforms in the rail's ink, gradient on hover, href "/" — the same
  object AwayRail wears); the
  column is centred above the RÉSUMÉ PILL and the night switch; 148px rail
  since round eight (Jon: "scale down 5–10%"; 160 in rounds six–seven), its
  paper a step LIGHTER than the ground (#fbfaf7 day / #161b24 night) with a
  firmer edge (26% / 22%) so it reads as the page's outline; `--railw`
  follows (tokens.css --railw is 148 sitewide since 2026-10-15; to keep the sheets at
  1080 and the device fit identical the sheets' minimum gutter is 20px and
  `.sig-desktop`'s side padding is `clamp(8px, calc(6vw - 72px), 24px)`).
  RÉSUMÉ IS A BUTTON AT THE RAIL'S FOOT (round six, Jon: a floating corner
  "breaks the laws of the design system"; bottom, not top: "I'm more proud of
  the stuff on the landing page than anything on the résumé"): `a.rail-cv`
  `résumé↗` (`data-for="end"`), an EMBER button CENTRED at the rail's foot
  (round ten: Jon reverted round nine's right-aligned rectangle, "I liked
  everything about the previous version more"; the corners halfway between
  the pill and the rectangle: radius 12): `var(--ember)` fill, white word,
  the rail's mono 13px/600, a 34px box, padding 0 14; hover a deeper ember;
  LIT = a paper + ember ring; the night switch is centred beneath it as
  before. Its centre on `--cv-foot` (102px above
  the rail's bottom, on `.one`: ONE value shared by the pill, the comet
  track's foot and the end room's floor row), above the switch's hairline;
  The phone bar's `résumé` wears the same ember pill (`.mbar-pill`). THE CORNER IS
  GONE on every size (markup, CSS, the hush observer, the ≤1320px disc and
  sheet.css's matching kind-word drop: the kind word is at top 23 at every
  desk width again). `MARKS` = the rooms (`id`, `has`; `SHOW` decides what
  renders; `studio` is a room too); `NAV` = two blocks of entries that the
  rail, the bar (`BAR`: the builds collapse to one word `builds` → #work
  with `data-holds` naming every build id) and the spy read: one list,
  never two. A rail or bar row whose `data-for` target is missing from the
  page is hidden at runtime (never a dead link). `getDocIds()` reads the
  rendered `[data-for]` targets (sheets AND rooms) sorted by on-screen top,
  `fyOf()` reads each row's centre on the comet track. THE COMET LAW (round
  six, Jon: "it makes things so much more simple"): a reference line at the
  viewport's vertical centre (phones: `main`'s centre); the target that SPANS
  the line is active: its row lit and the bead EXACTLY on its knot; in the
  ground between two targets p = (line − bottom_i) ÷ (top_i+1 − bottom_i),
  the bead rides between the two knots and the lit item flips with
  HYSTERESIS (p 0.55 going down, 0.45 going up; round seven, Jon: a
  "hiccup" flashing back to the previous section: two mechanisms were
  reproduced under stress, ±1px jitter at a gap's midpoint and content
  growing above the line mid-scroll, and both are closed: within a scroll
  the state only moves the way the page moves, the true state settles
  after 160ms without a scroll event, no `scrollend` listener). THE TRACK
  RUNS FROM THE HERO TO RÉSUMÉ: the hero is a virtual first target whose
  knot is the track's TOP (bead at the top, nothing lit, at scroll 0); the
  end room `#end` is the last target whose knot is the RÉSUMÉ BUTTON (it
  lights with its ring; the phone bar's pill likewise). THE ENDS (round ten, Jon: the comet "exists upon loading … moves down in
  correlation to the scroll until you get to audiodex"; at the end "the full
  length shows the gradient and the comet has shot off the screen"): THE
  START: while the line is above the first target, s = pos ÷ (pos + the
  distance left until the first target's top meets the line), so the bead
  leaves the track's top with the first pixel of scroll and arrives on
  audiodex's knot exactly as audiodex takes the line, nothing lit on the
  way (never hidden at the top). THE TRACK IS THE RAIL'S FULL HEIGHT (round eleven, Jon: "the gradient
  isn't filling to the top and bottom"): `.comet` runs `top: 0; bottom: 0`,
  behind the button and the switch; the knots are fractions of it (the
  last, the button's centre, ≈ 0.887 at 900 tall). THE END: `update()` writes
  `data-comet="top" | "mid" | "end"` on `.rail`; at `end` (the bead on the
  last knot) the fill runs on to the track's foot (`.comet-fill` clip 0,
  eased 460ms: the full gradient edge to edge) and the bead keeps going,
  eased down past the foot (`top: 100% + 72px`) and fades out: the SHOT;
  the button stays lit with its ring; the bead is back the moment the page
  scrolls up. The eased `top` applies in the `end` state only (eased on the
  way, it trailed the scroll).
  A target at its framed position counts as active even if too short to
  reach the line (never fires today). `locate()` + one rAF-coalesced
  `update()` on capture-phase scroll; knots cached by `measure()` on load,
  resize and a ResizeObserver on body and `.one`; the old IntersectionObserver
  spy, `buildAnchors` and the scroll→y map are gone. Containment and
  `data-holds` still light the bar's `builds`;
  the sheets carry `scroll-margin-top: 24px` on desks. `src/lib/
  build-order.ts` (`BUILD_ORDER`, `buildNo()`) is the one ordered list of
  the builds. Phone bar: builds · illustrations · music · résumé · moon,
  0.7rem (0.02em tracking under 360px), nothing wraps. The hero has NO
  corner since round six (résumé is the rail's pill, the bar's pill and the
  end room's title). Section ids stay
  work/play/studio/soundlab/illustrations.
  THE LINE (2026-10-22, Jon's words, final, NOT draft; he turned down a
  dramatic version as "trying to be Batman"): "My job doesn't pay me to
  build these. But I use them every day." Since 2026-10-22, night (Jon:
  "too much text on the landing screen … in its own view beneath the
  arrows, almost like how résumé on the bottom has its own real estate, so
  that when they see it, it's all they're seeing. Think about what's all
  visible at any one moment and be intentional") it is NOT in the hero
  (the hero is the name, the role line and the cue, as before it): it is
  its OWN ROOM `section.room.line#line` right after the hero, a full
  viewport (100svh; minus the bar on phones, `order: 0` there), the
  sentence ALONE on the page's center line in the end room's title face
  (`.line-say`: Outfit 500 40px / 28px on phones, line-height 1.2,
  −0.02em, 22ch, balanced, the ink; `--night-ink` at night), the one room
  gap above and below. NOT a rail target (no NAV row, no BUILD_ORDER, no
  `[data-for]`): the comet crosses it as ground between the hero's knot and
  intake's, nothing lit. Framed it is the only thing on screen (900 tall
  at 1440 × 900, 752 at 375). Inline in StudioOne.
  THE HERO (2026-10-13, round two: Jon: "the down arrow with builds is
  enough by itself"): a full viewport (`min-height: 100svh`, the standard
  `.one > .room` gap to the first room; the round-one PEEK and the second
  résumé link are gone) with ONE cue link `↓ builds` (`.cue`, 0.8125rem since round four) ~44px
  above its foot on desks and 28px above the bar on phones, in the label
  face; since round five its ARROW (`.cue-arrow`) is 1.55em, 700, and bobs
  4px on a 2.2s ease (still under reduced motion); the word does not move. NOTHING PRESSES ITSELF (Jon: "I'd rather they have to be
  clicked"; amended 2026-10-19, late: a signboard may turn by itself, a run,
  a machine at work, starts only on a press; see THE SEND): the watch and the phone run only from a visitor's press, the
  page never scrolls by itself after a run starts, and a run never opens
  a sheet's fold (the self-run, the phone-row trigger, the follow/glide and
  the run-opens-the-story code are deleted; `firstSettle` survives for the
  wallet alone).
- ROOMS (2026-09-02, Jon: "each section has its own viewport"): the four
  homepage sections (`#play`, `#work`, `#soundlab`, `#illustrations`) carry
  `.room` — min-height 100svh (minus the 64px bar below 900px), flex-centered
  object, scroll-margin 0. Since 2026-09-18 (Jon: "spacing between the
  modules") the rooms NO LONGER ABUT: `.one > .room { margin-top:
  var(--room-gap) }` (`--room-gap: clamp(124px, 23vh, 258px)` on `.one`,
  +15% in round eight; was 108/20vh/224 after +12% in round five, 96/18vh/200
  before;
  2026-10-13: the ONE gap that `.one > .room`, `.wk + .wk` and the floor's
  margin read; since round four EVERY room is content-sized — `.room` has
  no min-height, no centring padding; the look room pads only the dots'
  24.35px above the picture, the music room's foot is its rail's hairline,
  the floor has no top padding, the look track follows the shown slide's
  height (`lkFit`, eased 260ms) — so the visible ink-to-ink distance down
  the whole page is this one value, ~180px at 1440, ~162 on phones (the end
  room, a full viewport, is the one exception by design); a framed
  room may show its neighbour beneath it (the 2026-09-02 "own viewport"
  law is RETIRED, Jon: "get it done properly")) puts ground between them — declared on the
  column's child on purpose, because `.work`, `.live-signal` and
  `.look-band` set their own `margin` shorthand and would zero a plain
  `.room` margin. At any room's framed position no
  neighbor is on screen (proof: scratch rooms-proof.mjs pattern — scroll
  each room to offsetTop and assert no other room intersects the visible
  viewport). Audio's dark `.gear` panel lives INSIDE its room as a
  panel-sized object; never make the panel itself viewport-tall. Adding a
  section = add `.room` and keep it abutting; section-to-section margins
  are gone by design.
- PHONE SCROLL MODEL (2026-09-21, Jon: the pinned bar lifted with iOS's
  document rubber-band; `overscroll-behavior` on html/body did not stop it
  on the real phone): under 900px the document is frozen (`html, body {
  height: 100%; min-height: 0; overflow: hidden }` — body's global
  `min-height: 100vh` is the iOS LARGE viewport and must be zeroed) and
  `<main>` is the scroll container (`height: 100%; overflow-y: auto;
  overscroll-behavior-y: contain; scroll-behavior: smooth` under
  no-preference), all `@media screen` so print keeps a flowing document.
  The block lives in `src/pages/index.astro`. `.one` stays the untouched
  flex column with its `order` rules and custom properties; `.mbar` stays a
  fixed DESCENDANT of the scroller and is viewport-pinned only while main,
  .one and body carry NO transform / filter / backdrop-filter /
  perspective / contain / will-change. Consequences to expect, not fix:
  Safari's toolbar never collapses (the visible height is the small
  viewport for the whole visit), scroll position is not restored on
  reload/back on phones, and rotating across 900px lands at the top. Script
  side: the spy's settle listeners are capture-phase on `document` (element
  scroll events do not bubble to window); the lazy exhibit iframe observer
  roots on `main` when it scrolls. Desks (≥900px) keep the document
  scroller: the rail, the comet and keyboard scrolling are untouched.
- The instrument is FIT from the host (2026-09-02; R3 2026-09-24):
  `.live-signal` is 1360px wide max, the host pins `.sgm`/`.device` to the
  1280px reference at EVERY width and sets `--sig-zoom` from ResizeObservers
  on the wrapper AND the device: min(0.98 · wrapper content width ÷ 1280,
  (innerHeight − the room's padding) ÷ the device's own height). The old
  height-cap table is gone. No horizontal scroller exists, so nothing clips
  the device shadow at any width. Never scale inside the device; adjust
  the host fit instead.
  AT REST THE DEVICE IS 70% (2026-10-13, Jon: "very in your face … scaled
  down outside of use; powering it up scales it up"): the host-owned
  `.sig-stage` carries `transform: scale(0.7)` (origin 50% 0) plus
  `margin-bottom: calc(var(--sig-air) + var(--sig-h) * -0.3)` while `#sgm`
  is standby/powerdown, keyed in CSS with `:has()`, both on one 400ms ease
  (instant under reduced motion); powered it is `transform: none` and the
  device's zoom is the untouched full fit (1224.6 wide at 1440×900).
  `--sig-h` is written by the fit only.
  SIGNAL IS ONE SHEET (round four, Jon: "the white sheet goes underneath the
  instrument so it feels like one thing, expanded or not"): `SignalCard`'s
  `part="around"` renders ONE `.sheet` (1080 like the others): kind word ·
  SIGNAL → the device stage (`--sig-air` 56px above and below, the sheet's
  own rhythm, not the room gap; the title's own margin is 0 there since
  THE CUT, 2026-10-22) → the moves / the receipt (THE FEELING, see THE
  SKIM) → how to play (`[data-write-up]`, scroll-margin 32). The powered
  device OVERHANGS the sheet's sides (72px each at 1440; Jon: "I'm fine with
  it jumping off the screen"; everything up to `.live-signal` is `overflow:
  visible`, `.sgm` is `width: max-content`, the document never widens). If
  the overhang reads wrong, Jon's fallback: widen ALL the sheets' paper to
  match, never their text. `/signal` keeps `part="all"` under the device.
  THE ARROWS (round six, Jon: "multiple arrows drawn ON THE PAPER pointing at
  the power button, almost like concentric rays … doodling arrows around the
  power button"; "3 is great"; round five's single pointer landed on the
  casing and is gone): `.sig-point`, ONE host-owned inline SVG inside
  `.sig-stage` after `<Signal />` whose viewBox IS device space (the switch's
  centre at 1214,36): three ember hand-drawn rays, `g[data-ray]` above ·
  upright · right, wobbly shafts + open uneven heads, round caps, 3–3.5
  device px, lengths ~99 / ~125 / ~91, converging on the switch; every head
  stops ~10 device px OUTSIDE the casing's metal (material.css's −10px
  inset): NOTHING is drawn on the instrument. Placed and sized in device px
  × `--sig-zoom` (left 50% + 540·z, top −122·z, 100·z × 202·z) so it rides
  the rest scale and points true at every width; strokes stay inside device
  x ≤ 1386 / y ≥ −122 (on the paper even at the fit's cap, clear of the
  story). The SVG's BOX ends at the device's right edge on purpose and the
  strokes past it paint as `overflow: visible`: a box past x 1280 widened
  the document once the device powered up. Fades (opacity, 400ms) once
  `#sgm` leaves standby. Never inside `.sgm`. Probe: qa arrows-check.
- THE FLOOR is ONE object sitewide (2026-09-21, Jon's reference shot):
  `src/components/studio/SiteFloor.astro` = the email + the LinkedIn mark,
  centred, nothing else (the city and the résumé link are gone from every
  floor; the rail / bottom bar carry résumé). ON THE HOMEPAGE (round six)
  the floor sits inside THE END ROOM `section.room.end#end`, the page's
  last room: a FULL VIEWPORT (100svh; 100svh − the bar on phones) with its
  `a.end-cv` `résumé↗` → /resume in the band-name face (Outfit 500,
  52px; 40 on phones, −0.02em, the site ink, hover = dim, night =
  `--night-ink`; the glyph 0.6em/300 raised 0.42em), 24px, then
  `<SiteFloor />`; on DESKS (round seven option B, corrected in round eight:
  "I didn't ask you to move the title") the TITLE stays CENTRED in the
  viewport and only the floor row is pinned to the room's foot at
  `--cv-foot`, the same height as the rail's résumé pill, so the floor and
  the pill read as one line across the page at the page's end; on phones
  the stack stays centred. The one gap stands above it (Jon: "the footer happens too
  early" → this is the dead space); no `[data-end]` sentinel; `#end` IS a
  nav target (its knot is the pill).
  Pages own placement only (margins, hairline, max-width, order) through
  `:global(.floor)` in a scoped block, or a plain `.floor` inside a
  `<style is:global>` block (`:global()` is NOT compiled there and the
  rule silently dies: /resume, 2026-09-21), and hand in inks through
  `--floor-ink` / `--floor-dim` / `--floor-hot`. Never re-inline a footer.
  The four room studies wrap it in `case-study/room/RoomFloor.astro`
  (2026-10-07): a hairline on the room's text column, the four studies in
  the résumé's order (the current one dim, not a link), the floor beneath.
  Case-study write-ups (RoomStory) and SIGNAL's card never fold (Jon,
  2026-10-06/07: a reader there is already interested).
- CASE-STUDY OBJECTS NEVER TRAP THE PAGE'S SCROLL (2026-10-07, Jon: "scrolling
  isn't working when i click in the chs module … ensure nowhere else"): no
  `overscroll-behavior: contain` on an inner scroller (ChsTool's thread and
  RySet's view had it); Room.astro drops focus after any MOUSE click inside a
  study (detail > 0; text fields and keyboard activation keep focus), so
  Space / arrows / Page keys scroll again; TheBench's keys engage on hover or
  on KEYBOARD focus only (:focus-visible), its take keys are `touch-action:
  pan-y` with pointercancel ending the press. Probe: click each module, then
  wheel over it, Space, ArrowDown, and assert scrollY moved.
- Every study object has a NIGHT: CHS's --sys-* follow `html[data-night]`
  unless ChsSystem's switch wrote `data-sys` (the site's switch clears it);
  Raylu's --ry-* flip in ry-tokens.css and the lasso's white prototype screen
  is inverted with its hues turned back (invert .93 + hue-rotate 180°).
- The homepage has NO corner since 2026-10-13 round six (résumé = the rail's
  foot pill, the phone bar's pill, and the end room's title). The "back to selected work" end-line is retired from
  every case study (dead link); the rail carries every exit. AwayRail is
  ONE INSTRUMENT with the homepage rail since 2026-10-15 (Jon: the
  chips/glyphs "no longer feel fitting"): the JT mark (the favicon's
  letterforms in the rail's ink, gradient on hover) on TOP as the way
  home, then the ROOM'S ONE PLACE as a plain word in the homepage rail's
  exact row (134×44, flush right): résumé ALONE (the studies' block and
  its 60px beat left on 2026-10-23 with THE STUDIES STEP BACK; AwayRail
  no longer reads case-links.ts). The `current` prop lights it IN THE
  EMBER on /resume (Jon: "match the color from the homepage for
  continuity" — `.aw-res`, both temperatures); a study opened directly
  passes its slug and lights nothing. The switch at the foot; NO
  ember button on away pages (home's pill exists as the recruiter's
  shortcut TO the résumé). No comet on the away rail (offered, Jon
  passed: "idk if we need the comet"); the studies keep CSProgress. The-console is UNROUTED (Momence pattern: page live,
  reached only from the sheet's evidence line; a dedicated Signal Studio
  study is the planned replacement). Phone bar: JT · résumé ember pill
  (lit ring on /resume) · moon — its dedicated refinement round is still
  owed. In AwayRail the breakpoint blocks come FIRST, so display and
  auto-margins live in rules AFTER the base resets (three cascade bugs
  shipped the other way, 2026-10-15).


## Build + deploy facts (2026-09-09 QA pass, shipped 0e66b18)
- `site` is `https://www.uxjon.com` (the apex 308-redirects to www). Every
  canonical / og:url / og:image / sitemap entry derives from `Astro.site`;
  never hardcode the apex (CSLayout used to; it is fixed).
- `@astrojs/sitemap` runs on build (excludes every `/case-studies/` page
  since 2026-10-23; momence alone before that): `/`, `/resume`, `/signal`;
  `robots.txt` carries the Sitemap line.
- FIRST SETTLE (branch `discover`, 2026-09-23, Jon: "guarantee it's seen
  by a speedrunner"): when an object settles in view (≥60% visible, scroll
  at rest, a short beat) it takes its own first step ONCE per page load
  (in-memory keys; sessionStorage was tried and made a reload never show it
  again), and any hand takes it back. A pointer MOVING over the object makes
  the beat WAIT (re-checked every 300ms while in view), never cancel. One helper in StudioOne's script,
  `firstSettle(el, {ratio, grace, ok, fire, leave})`. SINCE 2026-10-13 it
  serves the WALLET ONLY: the watch's and the phone's self-run, the phone's
  run-row trigger and the follow-down-main are deleted (Jon: the visitor
  in the driver's seat); the modules' `hero:finish` / `hero:reset`
  listeners and `[data-ghost]` styles remain in IntakeHero/ArchiveHero,
  unfired. The WALLET: the blank tape is a real button that opens the same strip
  (`data-blank-tape`, aria-controls wl-strip-0; both controls' aria-expanded
  stay in sync); its first settle seats the mini and opens the strip, which
  folds back after 2.4s under 1160px and stays open above. The audio
  Carousel is `keys={false}`: no arrows, no swipe, never steals ←/→.
- THE STACK (/resume) is GONE since 2026-10-23 (THE STUDIES STEP BACK):
  the under-sheets (`.r-stack`), the wordless study tabs (`.r-stack-tab`),
  the `data-riffle` rise, the phones' snap onto the studies and their CSS
  are deleted; the résumé is ONE SQUARE SHEET on the ground (the proof
  marks and panels unchanged, `.sheet-wrap` keeps `isolation: isolate`),
  the floor under it. The PDF was regenerated (1 page, its text
  identical). Blank-tape hover lifts the mini 8px with a ground shadow
  over 220ms.
- THE SITE IS THREE THINGS (Jon, 2026-09-22): the homepage, the résumé, and
  the case studies under it. THE STUDIES STEP BACK (2026-10-23, Jon: "I'd
  rather just cut the case studies for now"): the Momence way, UNLINKED,
  NOT DELETED: every /case-studies/* page, `src/lib/case-links.ts`, the
  study components and their assets stay in the tree, untouched, live at
  their URLs, no redirects; nothing links to them (no résumé row, no stack
  tabs, no AwayRail block, out of the sitemap) except the sheet's bare
  the-console URL line (the print contract). Check after a build:
  `grep -r 'case-studies/' dist/client --include=index.html` finds only
  that line and the study pages' own canonical / og tags. The Catalog + Judge doors, the /writing posts
  and the /more phone exhibit are in `junkyard/` (not built, not imported,
  not in the sitemap; their URLs redirect in astro.config.mjs). Never route
  them back or spend context on them unless Jon asks.
- `postbuild` = `scripts/vercel-cache-headers.mjs`: the Vercel adapter emits
  the `/_astro` immutable cache rule AFTER `{ handle: filesystem }`, where it
  never fires; the script moves it above. Verify after a deploy with
  `curl -I https://www.uxjon.com/_astro/<hashed>.css` → `max-age=31536000,
  immutable`.
- The Notion image sync is NOT wired to predev/prebuild any more (nothing
  reachable reads Notion; `npm run sync-images` still exists by hand).
  `@notionhq/client` is a devDependency.
- `inlineStylesheets: 'auto'` with a CSS-only `assetsInlineLimit` function;
  a plain numeric limit base64-inlines fontsource woff2 subsets into the
  homepage sheet (131 KB → 249 KB). Keep it a function.
- `src/pages/404.astro` is the site's 404 (away-page chrome). The play room
  is `display: none` on phones (≤899px) and on any screen without a fine
  pointer, "03 signal" leaves the rail with it (its whole `li`), and
  `getDocIds()` counts only targets that are laid out (`offsetParent`). Never bring an
  instrument back to phones (see memory signal_mobile_halo).
- PHONES (round 3, 2026-09-22): the hero is one left-aligned stack on the
  rooms' 14px gutter (the liner's right alignment is a desk gesture; the
  role line balances); the work room lands title + object + hint on one
  screen at 375×812 and 390×844 (the phone at 80cqw is the largest that
  still fits with its hint — keep it); the wallet's mini is 80px wide on
  phones (the room's only control); the bar's words are 0.7rem. The run
  column does NOT reserve its final height stacked (the desk's `--run-final`
  is inside the ≥820 container query) — a reservation would be ~850px of
  blank ground on a phone. (The watch has no run column since 2026-10-19,
  late; its cards land under it on a phone and push the fold down.)
- Case-study images are WebP on the page; `ogImage=` stays on `cover.png`
  (share scrapers). Any new case-study art lands as webp.
- Media seeking needs a Range-capable static server: python's
  `http.server` serves no byte ranges, so every seek lands at 0 there
  (a probe artifact, not a site bug). Serve `dist/client` with the range
  server pattern (scratch `range-server.mjs`, 2026-09-09) for playback
  probes.
- Phone verification MUST enable touch emulation
  (`Emulation.setTouchEmulationEnabled`) — the instrument gates on
  `pointer: fine`; a narrow viewport alone renders a state no phone gets.
- The flagship's round count reads `judge-ledger.json` (`blind.rounds`);
  never type the number by hand.
