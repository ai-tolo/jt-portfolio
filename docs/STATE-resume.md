# STATE · lane R · the résumé, readable

Branch `resume` (worktree `~/sites/jt-portfolio-resume`, off main 7139908), preview `resume` on :4640
(`npx astro dev --port 4640 --host`, registered in `~/.claude/launch.json`). Brief: `docs/PROMPT-resume-read.md`
in the main checkout (untracked). This lane owns `src/lib/resume-print.ts`, `src/pages/resume/**`,
`src/components/resume/**`, `public/jonathan-tollefson-resume.pdf` and this file; nothing else.
Model note: the whole lane ran on Opus 5.5 (the session's model from the start); no subagent wrote prose.

## Built
- **Step 1, THE TEXT** (2d50477): `resume-print.ts` rewritten under the writing law. PDF 608 → 462 words, prose
  483 → 359. The judge tab re-keyed to the mastering agent's bullet 2 (the evidence clause). The contact link
  points at www.uxjon.com.
- **Step 2, THE DESIGN** (38e89c4): two screen directions behind `?dir=` (an inline script sets `html[data-rdir]`
  before the sheet parses; default `a`). A = the printed sheet kept (its screen gutter is the PDF's 0.48in, so lines
  wrap as printed). B = the sheet re-set on screen in the work room's material, all of it in PrintResume.astro under
  `html[data-rdir="b"]` inside `@media screen` (role label over the name in Outfit, section labels in a left mono
  column, Instrument Sans on a 36rem measure, hairlines at 18 % ink, one white card with 28px corners). Shared: the
  actions row, the case-study row and the floor in the room's three faces on one sheet width and gutter
  (`--sheet-w`, `--sheet-pad`); IBM Plex Mono is gone from the page. Print rhythm: more air between sections and
  entries than inside them; PDF one page, ~23pt spare.
- **Step 3, THE PROOFS** (bbf73f6): `.proof-panel` is no longer a dark slab; the room's ground shows through the
  parted paper and the panel hands every module a token contract (`--pf-ink/-dim/-ground/-card/-line/-soft`,
  `--pf-sans/-mono/-display`, day and night). One accent hue per module (green #178650 / #4cc38a for the agent and the
  ledger, blue #2a62d9 or #2961d7 / #7aa2ff for the parser and the keys). Each tab sits right before its own panel in
  the DOM. Words 409 → 234 (agent 69 → 55, ledger 236 → 102, parser 70 → 53, keys 34 → 24).

## Verified (2026-10-06, on the built site served from dist/client)
- Build exit 0. Headless at 1440 and 375 (touch), day and night, both directions: scrollWidth = viewport, 0
  console errors, each proof opens on a click and closes on Esc, every panel on the room's ground, the keyboard path
  (Enter opens, Tab lands inside the open proof, Esc closes).
- PDF: 1 page, ~23pt spare, headings in order, links mailto / tel / www.uxjon.com / the-console, no tab words, no
  em dashes, no spurious spaces; public/jonathan-tollefson-resume.pdf matches the build.

## Open
- Jon's pick between `?dir=a` and `?dir=b`. If A: delete the `html[data-rdir="b"]` blocks (PrintResume.astro's
  "?dir=b" section, index.astro's "?dir=b" paper block). If B: make those rules unconditional (drop the
  `html[data-rdir="b"]` prefix) and set B's `--sheet-w` / `--sheet-pad` as the defaults. Either way delete the inline
  `?dir=` script, then rebuild, re-run the QA pass and reprint the PDF.
- Jon's edits to the sheet's text (the block in the lane report).
- Raylu's descriptor: the sheet says "an AI chat platform" (Jon's June master); raylu.astro says "an ML-tooling
  startup". Jon knows which is true.

## Links
- Résumé (this Mac): http://localhost:4640/resume/ · on the tailnet: http://100.89.96.67:4640/resume/
- Direction A: http://100.89.96.67:4640/resume/?dir=a · direction B: http://100.89.96.67:4640/resume/?dir=b
- The PDF: http://100.89.96.67:4640/jonathan-tollefson-resume.pdf
- Contact sheets: ~/Desktop/resume-before-after.png · resume-before.png · resume-dir-a.png · resume-dir-b.png
- Captures: ~/Documents/studio-build/resume-read-2026-10-06/ (before/, text/, design/, after/)

## Ship (from Jon's Mac, on his word)
1. Build gate in the lane: `source ~/.nvm/nvm.sh; npm run build > /tmp/build.log 2>&1; echo "exit: $?"`.
2. Backup ref, then rebase the lane on main:
   `git -C ~/sites/jt-portfolio fetch origin && git -C ~/sites/jt-portfolio branch backup/main-pre-<DATE> origin/main`
   `git -C ~/sites/jt-portfolio-resume rebase origin/main` (the lane maps are disjoint, so it is clean).
3. Fast-forward from the MAIN checkout and push:
   `git -C ~/sites/jt-portfolio merge --ff-only resume && git -C ~/sites/jt-portfolio push origin main`
4. Live check (gently, Vercel's checkpoint trips on rapid curls):
   `curl -sL https://www.uxjon.com/resume/ | grep -c "A pipeline I wrote alone"` → 1.
