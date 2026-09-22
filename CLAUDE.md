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
- `src/components/SignalMachine.astro` is **SACRED**: observe it (its root is
  `section#sgm` inside `.sig-desktop`; page-level anchor/spy target is the
  HOST `#play`), style it only from outside, never edit it.
- `src/components/studio/builds-copy.ts` holds **JON'S LOCKED WORDS**
  (installed verbatim from his copy chat, 2026-08-31): never edit, polish,
  or reflow a sentence. Structure/media `src` fields may change; prose may
  not. Same rule for the ledes in `src/lib/case-links.ts` (canon).
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
- Org names do NOT link (2026-09-21). The case studies sit in a screen-only
  row under the sheet (`.r-studies` in resume/index.astro: the flagship plus
  the three canon ledes from case-links.ts). The one bare URL line under the
  mastering agent is the sheet's only link.
- Contact: phone is print-only (its separator hides with it); no LinkedIn on
  the sheet (the actions row and the floor carry the icon). The proof marks
  key on `data-pr-org` strings + bullet indexes in `MARKS`; re-check them
  after any rewording or the tabs silently detach.

## Copy + design laws
- Honesty first: no "live"/"the actual" labels over authored data; real
  numbers only; claims a skeptic can check. The naming law: **Finishable**
  with the Catalog / the Studio / the Engineer ("console", "bucket", "crown a
  king" are retired nouns in visible copy); the résumé sheet is the one
  exception (plain descriptors, see "Résumé subsystem").
- Voice: plain, understated, first-person, lowercase chrome, no em dashes in
  résumé/application copy. Jon-voiced surfaces (hero lines, ledes, bio) are
  HIS: draft only when asked, flag as DRAFT, never committee-polish.
- Chrome is quiet IBM Plex Mono; case studies use the `--cs-mono` token.
- Night mode: `html[data-night]`, two sources (manual switch OR instrument
  power). Dark-until-power is lighting only.
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
- Carousel.astro has two modes: `slide` (translate) and `dissolve`
  (slides stacked in one grid cell, crossfade + a 300ms top-down render
  with a scan on the arriving slide, `data-on` on the active slide, a
  `car:change` event). Both homepage rooms use `dissolve` (Jon,
  2026-09-09: sliding pictures went under the keycaps and broke the
  physical feel). The Visuals key measurer listens for `car:change`;
  `car:show` (detail.index) asks a chassis for a slide. In Visuals the
  dots sit ABOVE the painted picture (`--lk-top`, measured) and the
  placard sits right under it (Jon, 2026-09-09).
- WORK is OBJECTS (2026-09-18; the ledger/matrix is DEAD): the room holds
  Jon's Claude Design modules, one per build, framed by words — the locked
  headline from builds-copy.ts above (the DRAFT dek under it was removed
  2026-09-22: title → object), the module, a DRAFT caption from
  `src/components/studio/objects-copy.ts` (Jon-editable), the locked
  paragraphs beneath. At rest each module shows only its title, its greyed
  nodes and the object: a node's words arrive with its stage (2026-09-22). Object one = the Intake
  hero (`IntakeHero.astro` + `src/data/intake-run.json`; its memo cue
  "Cinder 32" is Intake's real alias for capture 31, length 3:52, seven
  tickets of which the module shows two). Object two = the Archive
  (`ArchiveHero.astro` with `story={false}` — the room frames it with the
  locked words — + `src/data/archive-run.json`, mined TRUE from the M1:
  Voice Memos' own titles at rest, the "laugh" search's eight real hits,
  the kept trim = the loudest 8 s of the opened recording by RMS, a
  17 s window each side, 80 peaks; `src` null so play stays dimmed).
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
  devices at 76svh on desks only (the cap lives inside the ≥820 container
  query; unscoped it shrank the stacked phone) so they stand the same height
  under the lamp. THE TOUCH SIGNAL (2026-09-22) is ONE vocabulary on both
  objects: `::after` the blue→purple gradient edge (masked ring / rim),
  `::before` its light (the watch's outward, the phone's inward), both on
  `touch-breathe` 2s ease-in-out 0.45↔1 — an EXACT COPY of the keyframe in
  each module, change both or neither; hover = still + full, `.s1` = off,
  reduced motion = still at 0.75; no halo, no ping. The mono CAPTIONS arrive
  with the run (`.wk:has(.intake-hero.s1, .archive-hero.s1)`), space held
  at rest. Beside the watch the run column RESERVES its stage-six height
  (`--run-final`, measured by IntakeHero's script under a motion-free
  `measuring` class, re-measured on fonts/resize) so the words under the
  module never move while it runs; stacked, no reservation. The rail's
  comet re-measures its knots on any body height change (ResizeObserver).
  The instrument's intro line (`.sgm-intro`) is hidden from the host. The
  watch PNG's transparent frame (70/68/67/61 px of 521×781) is trimmed in
  IntakeHero with proportional negative margins (ratios of the visible
  383×653) so the visible watch sits on the axis and rhythm — never edit
  the PNG. Lesson: a grid item with `margin: 0 auto` and no intrinsic
  width shrink-wraps to its text (the 64px phone watch) — size it.
  Homepage nav: work · play · look · listen, no emojis; since 2026-09-21
  the desktop rail sets a small inline Lucide glyph (hammer · keyboard ·
  eye · headphones; paths in `ICONS`, no package; 1.1em, stroke 1.5,
  square caps, miter joins, one fixed slot) before each word, labels
  left-aligned; the phone bar stays words-only (its night switch draws the
  rail's sun/moon glyphs); the #work room comes first; the hero corner
  (dot · minneapolis, mn · résumé) is `position: fixed` on desks so the
  résumé is always one click away, and the phone bar carries a résumé
  item. Section ids stay work/soundlab/illustrations.
- ROOMS (2026-09-02, Jon: "each section has its own viewport"): the four
  homepage sections (`#play`, `#work`, `#soundlab`, `#illustrations`) carry
  `.room` — min-height 100svh (minus the 64px bar below 900px), flex-centered
  object, scroll-margin 0. Since 2026-09-18 (Jon: "spacing between the
  modules") the rooms NO LONGER ABUT: `.one > .room { margin-top:
  clamp(96px, 18vh, 200px) }` puts ground between them — declared on the
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
- The instrument is FIT from the host (2026-09-02): `.live-signal` is
  1248px wide (= the sacred file's 1120px reference + its `.inner` 128px
  gutter), the host pins `.sgm`/`.device` to the reference at EVERY width
  and sets `--sig-zoom` from a ResizeObserver (min(the file's own height
  caps, wrapper content width ÷ 1120)). No horizontal scroller exists any
  more, so nothing clips the device shadow at any width. Verified 700 →
  1920 with zero module overflow and page scrollWidth == viewport. Never
  edit SignalMachine.astro for scaling; adjust the host fit instead.
- THE FLOOR is ONE object sitewide (2026-09-21, Jon's reference shot):
  `src/components/studio/SiteFloor.astro` = the email + the LinkedIn mark,
  centred, nothing else (the city and the résumé link are gone from every
  floor; the rail / bottom bar and the homepage corner carry résumé).
  Pages own placement only (margins, hairline, max-width, order) through
  `:global(.floor)` in a scoped block, or a plain `.floor` inside a
  `<style is:global>` block (`:global()` is NOT compiled there and the
  rule silently dies: /resume, 2026-09-21), and hand in inks through
  `--floor-ink` / `--floor-dim` / `--floor-hot`. Never re-inline a footer.
- The homepage corner (top right) is the résumé link alone with its ember
  bead; no city. The "back to selected work" end-line is retired from
  every case study (dead link); the rail carries every exit. AwayRail
  order on case studies: the house chip on TOP, 🡐 résumé MID-RAIL (auto
  margins split the column), the switch at the foot; phone bar ⌂ · 🡐
  résumé · moon. /resume uses the SAME house chip on top (`home="house"`)
  and nothing else above the switch. The homepage rail's items read word
  THEN glyph, flush right inside one 94px block, so the glyphs stand in a
  single column (Jon, 2026-09-21).


## Build + deploy facts (2026-09-09 QA pass, shipped 0e66b18)
- `site` is `https://www.uxjon.com` (the apex 308-redirects to www). Every
  canonical / og:url / og:image / sitemap entry derives from `Astro.site`;
  never hardcode the apex (CSLayout used to; it is fixed).
- `@astrojs/sitemap` runs on build (excludes the off-shelf momence page);
  `robots.txt` carries the Sitemap line.
- THE SITE IS THREE THINGS (Jon, 2026-09-22): the homepage, the résumé, and
  the case studies under it. The Catalog + Judge doors, the /writing posts
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
  pointer, "play" leaves the bar and the rail with it, and `getDocIds()`
  counts only rooms that are laid out (`offsetParent`). Never bring an
  instrument back to phones (see memory signal_mobile_halo).
- PHONES (round 3, 2026-09-22): the hero is one left-aligned stack on the
  rooms' 14px gutter (the liner's right alignment is a desk gesture; the
  role line balances); the work room lands title + object + hint on one
  screen at 375×812 and 390×844 (the phone at 80cqw is the largest that
  still fits with its hint — keep it); the wallet's mini is 80px wide on
  phones (the room's only control); the bar's words are 0.7rem. The run
  column does NOT reserve its final height stacked (the desk's `--run-final`
  is inside the ≥820 container query) — a reservation would be ~850px of
  blank ground on a phone.
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
