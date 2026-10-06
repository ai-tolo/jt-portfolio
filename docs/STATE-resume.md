# STATE · lane R · the résumé, readable

Branch `resume` (worktree `~/sites/jt-portfolio-resume`, off main 7139908), preview `resume` on :4640
(`npx astro dev --port 4640 --host`, registered in `~/.claude/launch.json`). Brief: `docs/PROMPT-resume-read.md`
in the main checkout (untracked). This lane owns `src/lib/resume-print.ts`, `src/pages/resume/**`,
`src/components/resume/**`, `public/jonathan-tollefson-resume.pdf` and this file; nothing else.

## Built
- **Step 1, THE TEXT** (2026-10-06): `resume-print.ts` rewritten under the writing law. PDF 608 → 462 words,
  prose 483 → 359, one page with ~120 pt to spare at true print width. Marks re-keyed: the judge tab now sits
  on the mastering agent's bullet 2 (the evidence clause). The contact link points at www.uxjon.com.

## Verified
- Build exit 0. PDF: 1 page, headings in order, links mailto / tel / www.uxjon.com / the-console, no tab
  words in the text, no em dashes, no spurious spaces.

## Open
- Jon's edits to the sheet's text (the block in the lane report, section 5).
- Step 2: two screen directions behind `?dir=`. Step 3: the four proofs re-clothed. Step 4: integration + QA.

## Links
- Résumé (this Mac): http://localhost:4640/resume/ · on the tailnet: http://100.89.96.67:4640/resume/
- The PDF: http://localhost:4640/jonathan-tollefson-resume.pdf

## Ship (from Jon's Mac, on his word)
1. Build gate in the lane: `source ~/.nvm/nvm.sh; npm run build > /tmp/build.log 2>&1; echo "exit: $?"`.
2. Backup ref, then rebase the lane on main:
   `git -C ~/sites/jt-portfolio fetch origin && git -C ~/sites/jt-portfolio branch backup/main-pre-<DATE> origin/main`
   `git -C ~/sites/jt-portfolio-resume rebase origin/main` (the lane maps are disjoint, so it is clean).
3. Fast-forward from the MAIN checkout and push:
   `git -C ~/sites/jt-portfolio merge --ff-only resume && git -C ~/sites/jt-portfolio push origin main`
4. Live check (gently, Vercel's checkpoint trips on rapid curls):
   `curl -sL https://www.uxjon.com/resume/ | grep -c "A pipeline I wrote alone"` → 1.
