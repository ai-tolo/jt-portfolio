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
  never invent or "round" these numbers.

## Copy + design laws
- Honesty first: no "live"/"the actual" labels over authored data; real
  numbers only; claims a skeptic can check. The naming law: **Finishable**
  with the Catalog / the Studio / the Engineer ("console", "bucket", "crown a
  king" are retired nouns in visible copy).
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
  keys still turn the chassis. The hub cores turn at 4.4s / 3s. Label colour
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
- Carousel.astro has two modes: `slide` (translate) and `dissolve`
  (slides stacked in one grid cell, crossfade + a 300ms top-down render
  with a scan on the arriving slide, `data-on` on the active slide, a
  `car:change` event). Both homepage rooms use `dissolve` (Jon,
  2026-09-09: sliding pictures went under the keycaps and broke the
  physical feel). The Visuals key measurer listens for `car:change`;
  `car:show` (detail.index) asks a chassis for a slide. In Visuals the
  dots sit ABOVE the painted picture (`--lk-top`, measured) and the
  placard sits right under it (Jon, 2026-09-09).
- Builds is THE LEDGER (round 3, 2026-09-02, Jon's pick from rendered
  directions): an index printed straight on the room ground, no panel or
  background anywhere, open or closed; rules run off the RIGHT edge of the
  page; one baseline per row. Its inks come from the section-local
  `--mx-ink`/`--mx-dim` pair on `.ledger` (day = `.one`'s --ink/--dim,
  night override = --night-ink/--night-dim) — never a hardcoded ink there
  (`.one` shadows the global --ink, so plain `var(--ink)` does NOT flip).
  Homepage nav is 🎹 (emoji-only chip, aria "play") · builds · audio ·
  🖼️ (emoji-only visuals stop); section ids stay work/soundlab/illustrations.
- ROOMS (2026-09-02, Jon: "each section has its own viewport"): the four
  homepage sections (`#play`, `#work`, `#soundlab`, `#illustrations`) carry
  `.room` — min-height 100svh (minus the 64px bar below 900px), flex-centered
  object, scroll-margin 0, rooms abut. At any room's framed position no
  neighbor is on screen (proof: scratch rooms-proof.mjs pattern — scroll
  each room to offsetTop and assert no other room intersects the visible
  viewport). Audio's dark `.gear` panel lives INSIDE its room as a
  panel-sized object; never make the panel itself viewport-tall. Adding a
  section = add `.room` and keep it abutting; section-to-section margins
  are gone by design.
- The instrument is FIT from the host (2026-09-02): `.live-signal` is
  1248px wide (= the sacred file's 1120px reference + its `.inner` 128px
  gutter), the host pins `.sgm`/`.device` to the reference at EVERY width
  and sets `--sig-zoom` from a ResizeObserver (min(the file's own height
  caps, wrapper content width ÷ 1120)). No horizontal scroller exists any
  more, so nothing clips the device shadow at any width. Verified 700 →
  1920 with zero module overflow and page scrollWidth == viewport. Never
  edit SignalMachine.astro for scaling; adjust the host fit instead.

## Build + deploy facts (2026-09-09 QA pass, shipped 0e66b18)
- `site` is `https://www.uxjon.com` (the apex 308-redirects to www). Every
  canonical / og:url / og:image / sitemap entry derives from `Astro.site`;
  never hardcode the apex (CSLayout used to; it is fixed).
- `@astrojs/sitemap` runs on build (excludes `/more` and the off-shelf
  momence page); `robots.txt` carries the Sitemap line.
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
- `src/pages/404.astro` is the site's 404 (away-page chrome); `/more` is the
  phone exhibit iframed into `#play` (noindex, root-absolute script path).
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
