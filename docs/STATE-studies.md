# STATE · studies (Stream C · THE CASE STUDIES)

Lane: worktree `~/sites/jt-portfolio-studies` · branch `studies` (off main 76c9ae0; the cloud run of 2026-10-06 added four commits on top of the approved CHS commit 5f79039) · preview `studies` :4639 (`~/.claude/launch.json`, cwd = the worktree, own node_modules).
Brief: `docs/PROMPT-finish-line.md` → STREAM C, then `docs/PROMPT-case-studies-CLOUD.md` (the rest of the stream, run in a cloud session). Rules: lead with one live object; second person; headings are moments; no stat grid, one number set apart; half the words or fewer (counted); one UNDER THE HOOD fold; art not reality; day/night via html[data-night]; CSLayout keeps the rail + floor; og stays /og-tape.png; Momence untouched.

## Where Jon looks (the DRAFT PR's Vercel preview; never merge the PR)
- PR: https://github.com/ai-tolo/jt-portfolio/pull/5 (DRAFT, `studies` → `main`, "do not merge"; it exists so Vercel builds a preview of every push).
- Preview base: https://jt-portfolio-git-studies-tolo-ai.vercel.app (the Vercel bot's link on the PR; the deployment status on the head commit reads success).
  - /case-studies/chs/ · /case-studies/crediverso/ (+ `?dir=2`) · /case-studies/raylu/ (+ `?dir=2`) · /case-studies/the-console/ · /resume/ (the `.r-studies` row)
- Shots: branch `studies-shots` (never merged), `shots/<page>/` — four full-page renders, the hands, one `contact-<page>.png` each; `shots/before/` holds main's three old pages.

## Built
### The frame (CHS, 2026-10-05; the flow-back 2026-10-06)
- `src/components/case-study/CSLayout.astro` — `material="room"` loads the work room's three faces and puts `.room-cs` on the body; the older studies are untouched by default (Momence still runs on the old material).
- `src/components/case-study/room/Room.astro` — the frame: the room's tokens (--rm-ink/dim/paper/card/line, the faces, --sp-* scale, the 36rem measure) on the body, day + night; the 1080 column; the mono label + the Outfit hook; `.rm-object` / `.rm-cap` / `.rm-number` / `.rm-read` / `.rm-m`. 2026-10-06: the paragraph reset is `:where()`-wrapped at two classes of specificity and the frame's rules are scoped (`.rm .rm-label`, `.rm .rm-number`, `.rm .rm-read p + p`); before that the reset silently beat them on every page (the label rendered 16px in the sans, the number lost its 48px margins). A wide number wraps under its words ≤520px.
- `src/components/case-study/room/RoomStory.astro` — the story card: the name centred at 2.125rem, the read in two columns with moment headings, UNDER THE HOOD as a spine inside the same card, the fold on the lower edge. 2026-10-06: `.rs .rs-p` / `.rs .rs-step-p` (same specificity fix).
- `scripts/cs-words.mjs` — visible words on a served page.

### CHS (approved by Jon at the pad, 2026-10-06: "looks a lot more in line with the rest of the site")
- `room/chs-tokens.css` + `room/ChsTool.astro` (the lead object: the docs assistant, role rail → starters → a run) + `room/ChsSystem.astro` (THE SYSTEM: nine live tokens, six components in their states, the light/dark switch) + `pages/case-studies/chs.astro`.
- Unchanged this round except what the frame fix changed on every page (the label's face and size, the number's margins). Its captions and four moments stay DRAFT for Jon.

### Crediverso (2026-10-06, cloud run)
- `room/CvDoor.astro` — THE DOOR, the lead object: the bilingual app as one phone (`room/cv-tokens.css`: `.cv` → `--cv-*`, night under `html[data-night] .cv`, accent #5b54d6), EN · ES on every string (`<span lang>` pairs; the hidden language aria-hidden; the two canonical pairs from the old page verbatim), the "send your cousin $200" flow walked as before (`a family tab`, Split, 7 taps) and after (`family on the home`, Combined, 5 taps) from CrediversoNavSwot's own `SCENARIO_TAPS`, each tap lighting its control on the screen it happens on (launch → home → family → card → Move Money → the cousin → $200 → sent). The tie is the old gate, behaviour kept: both flows walked → "which one would you ship?" → `what tipped it` branched on the pick, verbatim (em dashes made commas/periods); the SWOT matrix verbatim in a `<details>` fold. Status line aria-live. Hooks `window.__cv = { lang, flow, step, ship }`.
- Two directions behind `?dir=` (an inline script writes `data-dir` before paint): **1 ONE PHONE (the default, the panel's pick)** · 2 TWO PHONES on one shared stepper (the after phone reaches `sent` at 5 while before needs 6 and 7). The dir-2 rules sit in one `[data-dir="2"]` block plus one `if` in the script: deleting the loser is one block.
- `pages/case-studies/crediverso.astro` — label · hook · THE DOOR (+ caption) · the one number (40 → 25 %) · the story card (four DRAFT moments) with the hood. `CrediversoNavSwot.astro` stays on disk, unimported.

### Raylu (2026-10-06, cloud run)
- `room/RySet.astro` — THE SET, the lead object: the file the founders carried in, as a design-tool window in the room's material (`room/ry-tokens.css`: `.ry` → `--ry-*`, accent #258c79 sampled from the whale cover): a mono bar `raylu — workspace.fig` and five page tabs with their `<date> · added by me` stamps from RayluFigmaTimeline's SECTIONS, verbatim. Each page is a canvas of its components: brand (the whale, the wordmark, six sampled swatches printing their values, the tone chips as toggles) · competitive (the 2×2 rebuilt with its six names at their --qx/--qy, selectable, a side label) · strategy (the slide, three statement rows) · wireframes (the sketch beside the same-afternoon frame, the two-path entry as options) · hi-fi (six of the product's primitives drawn in their states, the ChsSystem recipe: nav item · slider · dropdown · slice pill · thumbnail · button). 520 tall on desks with an inner scroll; a chip strip on phones. Hooks `window.__ry = { page, pick, state }`.
- Two directions behind `?dir=`: **1 PAGES (the default, the panel's pick)** · 2 THE SHEET (all five pages stacked, margin labels, no inner scroll; 2312px tall at 1440). The dir-2 rules sit in one marked block.
- `room/RyLasso.astro` — the lasso moved out of the page with its behaviour, seed (20231004), CLUSTERS and geometry unchanged (drag a box / Enter slices `vehicle · 47 images`, Escape clears, the SSR-resolved slice), re-clothed: the dark Figma chrome, cursors and presence are gone; the screenshot sits in a paper frame with a hairline. Hooks `window.__ryLasso = { slice, clear }`.
- `pages/case-studies/raylu.astro` — label · hook · THE SET (+ caption) · $4M set apart (the caveat lives in the story) · the lasso (+ caption) · the story card (four DRAFT moments) with the hood. `RayluFigmaTimeline.astro` stays on disk, unimported.

### Finishable (2026-10-06, cloud run)
- `pages/case-studies/the-console.astro` — on the Room frame: label · hook · the three deaths in one line · chapter marks in the room's faces (`.fn-ch`: the mono `01 · the catalog`, the Outfit job, a sans tagline) · each object on the paper with a mono caption · the story card (four DRAFT moments) with the hood. Every object kept with its behaviour: ChaosToBuckets · StudioChapter · TheBench + TasteLoop · EngineDial · Finale; the round count still read from `judge-ledger.json`. The objects are product surfaces and keep their skins; the page hands them the room's mono (`--cs-mono: var(--rm-mono)`) and maps their display face to the room's sans (`.fin-cs :is(.sx-direction, .sx-tower-name, …)`), un-bleeds the Studio (`.fin-cs .sx.cs-bleed`) and hangs the Studio's lines and the Finale on the column's left edge. "louder always wins" dropped from the deaths line (a killed claim). FinHero, Chapter, CSShortVersion stay on disk, unimported here.

## Verified (2026-10-06, headless + muted, playwright; 375 with touch emulation)
- Build `npm run build` exit 0 on e8ed8c1.
- Every page at 1440 and 375, day and night: `scrollWidth == innerWidth`, 0 console errors, fonts Instrument Sans · JetBrains Mono · Outfit (+ the chrome's IBM Plex Mono). Hands at 1440 day: CHS (a role, a starter to `done`, the dark flip, the fold) · Crediverso (ES, after to step 3, both flows walked, the tie, `ship after`, the matrix, the fold) · Raylu (`page('hifi')`, `pick('Galileo')`, the lasso slice to `vehicle · 47 images`, the fold) · Finishable (the catalog's `__ctb.setProgress(1)` to its real counts, the dial to DO MORE with four modules lit, the finale's after tab, the fold). Momence 1440 day + night: 0 errors, untouched (669 words, as before).
- The résumé's `.r-studies` row: the four names with the canon ledes, linking to each slug; unchanged and reads right.
- WORDS (`scripts/cs-words.mjs`, served page; the prose split by a DOM count of everything outside `.rm-object`):

| page | before | after | the objects | the story card | the prose between |
|---|---|---|---|---|---|
| CHS | 1142 | 962 | 543 | 352 | 18 |
| Crediverso | 1493 | 741 | 392 | 265 | 27 |
| Raylu | 1159 | 579 | 252 | 275 | 26 |
| Finishable | 1161 | 1392 | 823 (five kept objects, their words locked) | 372 | 143 (was 338) |

Finishable's total is above its before because the kept objects alone carry 823 words; the prose between the objects is halved (338 → 143) and the story card replaced the hero + the short version.

## Open (Jon's gate)
- Jon picks the direction per page (the panel defaulted both to dir 1): Crediverso `?dir=2` (two phones) and Raylu `?dir=2` (the sheet) are live on the preview. On his pick, delete the losing `[data-dir="2"]` block (or make dir 2 the default) and the inline `?dir=` script.
- Every Jon-voiced line is DRAFT (`// DRAFT (Jon edits)` in the four pages): the hooks, the captions, the number lines, the four moments per page, the hood rows.
- Two art details to keep or drop: Raylu's open dropdown lists t-SNE and PCA (generic algorithm names, not on the old page); Crediverso's "Open app" step lights Log In on the launch screen.
- The cloud VM could not fetch the Vercel preview (its network policy blocks `*.vercel.app`); the links above were verified by the deployment status on the PR, not by a 200 from the VM.

## Ship (only on Jon's "push it", from the MAIN checkout, after Jon's reaction)
git -C ~/sites/jt-portfolio branch backup/main-pre-$(date +%F) main
git -C ~/sites/jt-portfolio-studies rebase main
git -C ~/sites/jt-portfolio fetch . studies && git -C ~/sites/jt-portfolio merge --ff-only studies && git -C ~/sites/jt-portfolio push
curl -s https://www.uxjon.com/case-studies/chs/ | grep -c 'chs-tool'
curl -s https://www.uxjon.com/case-studies/crediverso/ | grep -c 'data-cv'
curl -s https://www.uxjon.com/case-studies/raylu/ | grep -c 'data-ry-set'
curl -s https://www.uxjon.com/case-studies/the-console/ | grep -c 'fn-deaths'
