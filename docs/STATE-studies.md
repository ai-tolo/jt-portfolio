# STATE · studies (Stream C · THE CASE STUDIES)

Lane: worktree `~/sites/jt-portfolio-studies` · branch `studies` (off main 76c9ae0) · preview `studies` :4639 (`~/.claude/launch.json`, cwd = the worktree, own node_modules).
Brief: `docs/PROMPT-finish-line.md` → STREAM C. Rules: lead with one live object; second person; headings are moments; no stat grid, one number set apart; half the words or fewer (counted); one UNDER THE HOOD fold; art not reality; day/night via html[data-night]; CSLayout keeps the rail + floor; og stays /og-tape.png; Momence untouched.

## Built (CHS, the gate page, 2026-10-05)
- `src/components/case-study/CSLayout.astro` — a `material="room"` prop: loads the work room's three faces (Instrument Sans · JetBrains Mono · Outfit) and puts `.room-cs` on the body; the older studies are untouched by default.
- `src/components/case-study/room/Room.astro` — the frame: the room's tokens (--rm-ink/dim/paper/card/line, the faces, --sp-* scale, the 36rem measure) on the body, day + night; the 1080 column; the mono label + the Outfit hook; `.rm-object` / `.rm-cap` / `.rm-number` / `.rm-read` / `.rm-m`. Paragraphs INHERIT (the older route's `.cs-main p` ink leaked into the objects' bubbles at night).
- `src/components/case-study/room/RoomStory.astro` — the story card (the homepage's .wk-story recipe): the name centred at 2.125rem, the read in two columns with moment headings, UNDER THE HOOD as a spine inside the same card, the fold on the lower edge.
- `src/components/case-study/room/chs-tokens.css` — THE SYSTEM's token contract (`.chs` → --sys-*; `.chs[data-sys="dark"]` flips them). Both objects paint only from these.
- `src/components/case-study/room/ChsTool.astro` (Opus lane) — the LEAD OBJECT: the docs assistant as one product: a window with a role rail (Sales · GTM · Finance · Ops; tablist, arrow keys), the idle screen = the comprehension gap (what it can do · what people ask · pick a role), a pick → the starters (hover · pressed · running · done) → a run (sent · thinking · streaming · tail). 520 tall on desks (inner scroll), chips on phones. Data = the old ChsRolePicker's ROLES, verbatim (ART).
- `src/components/case-study/room/ChsSystem.astro` (Opus lane) — THE SYSTEM: nine token swatches printing their COMPUTED values, faces · radii · row · type scale, six component tiles in their states with a doc card each (name · purpose · states), adopted by (names only), and the light/dark switch that writes `data-sys` on `.chs` so every component on the page flips. The "used in" lines were cut (invented surface names).
- `src/pages/case-studies/chs.astro` — rewritten on the frame: label · hook · THE TOOL (+ caption) · the one number (0 back-channel pings) · THE SYSTEM (+ caption) · the story card (four moments, second person) with the hood (platform · research · surface · design · measure · role; true facts, Jon's own dates).
- `scripts/cs-words.mjs` — visible words on a served page.

## Verified
- Build `npm run build` exit 0. Renders (scratch `cs-render.mjs`): 1440 day + night and 375 touch, hands on the objects (a role, a starter, the dark flip, the story fold): 0 console errors, scrollWidth == innerWidth; page 2910 tall at 1440. Shots `~/Documents/studio-build/studies/chs-*.png`, sheets `contact-chs-1..3.png`.
- WORDS (visible, served): before 1142 → after 962 total; the prose (outside the two objects) ≈ 870 → 420; the tool 300, the system 242 (new object).
- Fonts loaded: Instrument Sans · JetBrains Mono · Outfit · IBM Plex Mono.

## Open (Jon's gate)
- Jon reacts at the pad: http://localhost:4639/case-studies/chs/ — then Crediverso (CrediversoNavSwot → the bilingual onboarding as the object; the 40 → 25 % as a before/after) and Raylu (the component set, not the timeline) in the same frame; then Finishable re-chromed (its objects kept, the prose between them halved); then the résumé's `.r-studies` row checked against the new pages; then the per-page QA + counts (Crediverso 1493 · Raylu 1159 · Finishable 1161 before).
- The caption lines and the four moment blocks are DRAFT words for Jon.

## Ship (only on Jon's "push it", from the MAIN checkout, after the other three pages land)
git -C ~/sites/jt-portfolio branch backup/main-pre-$(date +%F) main
git -C ~/sites/jt-portfolio-studies rebase main
git -C ~/sites/jt-portfolio fetch . studies && git -C ~/sites/jt-portfolio merge --ff-only studies && git -C ~/sites/jt-portfolio push
curl -s https://www.uxjon.com/case-studies/chs/ | grep -c 'chs-tool'   # the marker
