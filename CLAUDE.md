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
  dark panels remain; the instrument is the only dark object in the room.
- AUDIO is THE FIELD RECORDER (round 3e, Jon's pick from three rendered
  players after a research sweep): art first (a real cover fills
  `.ls-cover`; an honest ordinal sits in the empty window until then), the
  placard under it, then ONE machine row — abutting keys (prev · PLAY ·
  next, play the one heavy mass), a hairline rule with a 1px tick as the
  seek (no fill), a recessed mono counter. Materials are value steps of
  ink over `--bg` via color-mix; every seam 1px; ONE lamp (ember) only on
  the live key. Inks come from the section-local `--au-ink`/`--au-dim`
  pair on `.au` (night override), same law as the ledger. Transport.astro
  is untouched: its parts are re-laid from StudioOne with `#soundlab`
  specificity and `display: contents` on `.tp`; the deck's `.ls-key`
  buttons drive the Carousel's own prev/next (disabled with one track).
  Never scrub in a circle; never bring back a dark card by day.
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
