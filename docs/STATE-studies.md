# STATE · studies (Stream C · THE CASE STUDIES)

Lane: worktree `~/sites/jt-portfolio-studies` · branch `studies` (off main 76c9ae0; the cloud run of 2026-10-06 added four commits on top of the approved CHS commit 5f79039) · preview `studies` :4639 (`~/.claude/launch.json`, cwd = the worktree, own node_modules).
Brief: `docs/PROMPT-finish-line.md` → STREAM C, then `docs/PROMPT-case-studies-CLOUD.md` (the rest of the stream, run in a cloud session). Rules: lead with one live object; second person; headings are moments; no stat grid, one number set apart; half the words or fewer (counted); one UNDER THE HOOD fold; art not reality; day/night via html[data-night]; CSLayout keeps the rail + floor; og stays /og-tape.png; Momence untouched.

## Where Jon looks (the DRAFT PR's Vercel preview; never merge the PR)
- PR: https://github.com/ai-tolo/jt-portfolio/pull/6 (DRAFT, `studies` → `main`, "DO NOT MERGE", opened 2026-10-06 for round 2; #5 closed as merged when main fast-forwarded to `studies` on the first ship).
- Preview base: https://jt-portfolio-git-studies-tolo-ai.vercel.app (the Vercel bot's link on the PR; the deployment status on the head commit reads success).
  - /case-studies/chs/ · /case-studies/crediverso/ · /case-studies/raylu/ · /case-studies/the-console/ · /resume/ (the `.r-studies` row)
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
- THE FORM (Jon's pick, 2026-10-06, of two directions rendered for him): **TWO PHONES** on one shared stepper (the after phone reaches `sent` at 5 while before needs 6 and 7; stacked on phones with the stepper sticky above the bottom bar). The root carries `data-dir="2"`; the one-phone direction's rules and the `?dir=` switch were deleted (the script's dir branch stays).
- `pages/case-studies/crediverso.astro` — label · hook · THE DOOR (+ caption) · the one number (40 → 25 %) · the story card (four DRAFT moments) with the hood. `CrediversoNavSwot.astro` stays on disk, unimported.

### Raylu (2026-10-06, cloud run)
- `room/RySet.astro` — THE SET, the lead object: the file the founders carried in, as a design-tool window in the room's material (`room/ry-tokens.css`: `.ry` → `--ry-*`, accent #258c79 sampled from the whale cover): a mono bar `raylu — workspace.fig` and five page tabs with their `<date> · added by me` stamps from RayluFigmaTimeline's SECTIONS, verbatim. Each page is a canvas of its components: brand (the whale, the wordmark, six sampled swatches printing their values, the tone chips as toggles) · competitive (the 2×2 rebuilt with its six names at their --qx/--qy, selectable, a side label) · strategy (the slide, three statement rows) · wireframes (the sketch beside the same-afternoon frame, the two-path entry as options) · hi-fi (six of the product's primitives drawn in their states, the ChsSystem recipe: nav item · slider · dropdown · slice pill · thumbnail · button). 520 tall on desks with an inner scroll; a chip strip on phones. Hooks `window.__ry = { page, pick, state }`.
- THE FORM (Jon's pick, 2026-10-06): **THE SHEET**: all five pages stacked, the names and stamps as margin labels, no tabs, no inner scroll (the set is 2312px tall at 1440, 4026 at 375). The root carries `data-dir="2"`; the `?dir=` switch was deleted (the tab markup stays as the margin labels; the base rules under the `[data-dir="2"]` block are its skeleton).
- `room/RyLasso.astro` — the lasso moved out of the page with its behaviour, seed (20231004), CLUSTERS and geometry unchanged (drag a box / Enter slices `vehicle · 47 images`, Escape clears, the SSR-resolved slice), re-clothed: the dark Figma chrome, cursors and presence are gone; the screenshot sits in a paper frame with a hairline. Hooks `window.__ryLasso = { slice, clear }`.
- `pages/case-studies/raylu.astro` — label · hook · THE SET (+ caption) · $4M set apart (the caveat lives in the story) · the lasso (+ caption) · the story card (four DRAFT moments) with the hood. `RayluFigmaTimeline.astro` stays on disk, unimported.

### Finishable (2026-10-06, cloud run; FOCUSED the same day on Jon's reaction: "the modules feel a bit gimmicky, as though we've just been keeping stuff around because it's there")
- `pages/case-studies/the-console.astro` — ONE object leads: THE BENCH (the blind round; its own caption is the figure's caption, restyled in the room's caption face), then the ledger's own number set apart (`chose_original / votes` · rounds · one rater, read from `judge-ledger.json`), then THE RECORD (Finale: the memo against the master, the whole side), then the story card: four moments (the question · the catalog · the studio · the blind round) with the hood (the catalog's and the studio's real counts). The deaths line stays under the hook. ChaosToBuckets, StudioChapter, TasteLoop and EngineDial are unmounted (on disk, importable; the Studio's `#engineer` anchor now points at the bench figure). The two objects keep their skins; the page hands them the room's mono and its sans. "louder always wins" dropped from the deaths line (a killed claim).
- The first cloud pass (07e473f) kept all six objects on the frame; Jon called it unfocused; this is cut 1 of the three offered (one object, the bench).

## Verified (2026-10-06, headless + muted, playwright; 375 with touch emulation)
- Build `npm run build` exit 0 on the focused Finishable (after e8ed8c1).
- Every page at 1440 and 375, day and night: `scrollWidth == innerWidth`, 0 console errors, fonts Instrument Sans · JetBrains Mono · Outfit (+ the chrome's IBM Plex Mono). Hands at 1440 day: CHS (a role, a starter to `done`, the dark flip, the fold) · Crediverso (ES, after to step 3, both flows walked, the tie, `ship after`, the matrix, the fold) · Raylu (`page('hifi')`, `pick('Galileo')`, the lasso slice to `vehicle · 47 images`, the fold) · Finishable (see below). Momence 1440 day + night: 0 errors, untouched (669 words, as before).
- The résumé's `.r-studies` row: the four names with the canon ledes, linking to each slug; unchanged and reads right.
- WORDS (`scripts/cs-words.mjs`, served page; the prose split by a DOM count of everything outside `.rm-object`):

| page | before | after | the objects | the story card | the prose between |
|---|---|---|---|---|---|
| CHS | 1142 | 962 | 543 | 352 | 18 |
| Crediverso | 1493 | 741 | 392 | 265 | 27 |
| Raylu | 1159 | 579 | 252 | 275 | 26 |
| Finishable | 1161 | 603 | 159 (the bench, the record) | 387 | 57 (was 338) |

Finishable's hands: the bench's take 2 + `r` reveal (keys only, no play), the finale's after tab, the fold. 0 errors, no overflow at 375 and 1440, day and night.

## Open (Jon's gate)
- Every Jon-voiced line is DRAFT (`// DRAFT (Jon edits)` in the four pages): the hooks, the captions, the number lines, the four moments per page, the hood rows.
- Two art details to keep or drop: Raylu's open dropdown lists t-SNE and PCA (generic algorithm names, not on the old page); Crediverso's "Open app" step lights Log In on the launch screen.
- The cloud VM could not fetch the Vercel preview (its network policy blocks `*.vercel.app`); the links above were verified by the deployment status on the PR, not by a 200 from the VM.

## Ship
SHIPPED 2026-10-06 from the cloud session on Jon's "push to live": `origin/main` fast-forwarded to `studies` (backup ref `backup/main-pre-2026-10-06` pushed first). The recipe below stays for the next round, from the MAIN checkout on the Mac:
git -C ~/sites/jt-portfolio branch backup/main-pre-$(date +%F) main
git -C ~/sites/jt-portfolio-studies rebase main
git -C ~/sites/jt-portfolio fetch . studies && git -C ~/sites/jt-portfolio merge --ff-only studies && git -C ~/sites/jt-portfolio push
curl -s https://www.uxjon.com/case-studies/chs/ | grep -c 'chs-tool'
curl -s https://www.uxjon.com/case-studies/crediverso/ | grep -c 'data-cv'
curl -s https://www.uxjon.com/case-studies/raylu/ | grep -c 'data-ry-set'
curl -s https://www.uxjon.com/case-studies/the-console/ | grep -c 'fn-deaths'

## Round 2 · THE WORDS THAT STAND ALONE (lane F, 2026-10-06)
Brief: `~/sites/jt-portfolio/docs/PROMPT-words-stand-alone.md` (in the main checkout, untracked; Jon: "everything on the site needs to be able to be digestable on its own without other context … is it a website? is it an app? a program?"). Lanes in parallel: R résumé (`resume` :4640), S SIGNAL's card (`signal-card` :4641); this lane wrote only src/pages/case-studies/**, src/components/case-study/**, src/components/studio/*-copy.ts and this file. Preview :4639 (a dev server from an earlier chat was already serving this worktree; reused).

### The method
- THE LEDGER (scratch, not committed): every visible string on the four studies, their objects' runtime strings and the work room's copy files (724 extracted + runtime rows), each with the test it fails; a judge marked each KEEP / FIX / CUT and wrote the fixes; this session applied them with exact-once string replacement and overrode a handful where the judge overclaimed (listed in the report). Finishable and the homepage were judged by Fable; CHS, Crediverso and Raylu by Opus after the Fable limit hit.
- Verdicts: Finishable 42 / 34 / 2 · CHS 186 / 21 / 6 · Crediverso 131 / 15 / 6 · Raylu 87 / 13 / 9 · work room 64 / 13 / 1 (KEEP / FIX / CUT).

### Built
- Every page's first screen says what the thing is, once, in the hook: Finishable "three programs I built and run on my own computer to finish my songs" (the list under it names catalog · studio · engineer, class `fn-deaths` kept); CHS "I design the internal AI platform at CHS, a 10,000-person farm cooperative"; Crediverso "I led onboarding design for Crediverso, a bilingual iOS banking app built around family"; Raylu "I designed the Figma file Raylu, an ML-tooling startup, carried into its seed pitch meetings". The work room's two captions say whose program / app it is.
- Jon's two named lines are gone: "Found in a junk drawer. Played like a band. Judged blind. Finished." (cut with its quiet line) and "Then keep listening: the whole side." (the record's caption now says what it is and what the hand does; the button reads "play the whole song · 3:31").
- False or self-contradicting lines fixed: Finishable "one of them untouched" (the bench's three takes are three masters, none untouched); the bench caption's killed "the loudest one always wins"; Crediverso "the tap-count is on your side" (Split is 7, Combined 5); Raylu's "$4M … with this file in the room"; CHS "the team's reflex was more docs. Mine was the opposite" beside a docs assistant; the work room's watch hood ("nothing installed … tap stop") against the story's one button.
- THE RECORD (Finale.astro) re-clothed: Space Grotesk gone; every `--cs-*` → `--rm-*`; the ← button and the full-song label in `--rm-mono`; the two `.fin-line` paragraphs and their rules deleted. TheBench wears `--rm-sans` / `--rm-mono` itself (Geist gone), its dark-skin tokens are renamed `--tb-*`, the ▶ button and the kbd caps no longer fall back to Arial / UA monospace; the page's `.fin-cs { --cs-mono }` and `:is(.tb, .fin-line)` overrides are gone. The bench's tag and reveal lines are this page's: `ROUND` in the-console.astro overrides round3 (lib/finishable.ts untouched). "crown" → "pick" everywhere the bench speaks.
- Behaviour unchanged on every object (the hands below).

### Verified (headless + muted, 375 with touch emulation)
- Build exit 0 after every page. Every touched page at 1440 + 375, day + night: scrollWidth ≤ viewport, 0 console errors. Fonts from the DOM on all four studies: Instrument Sans · JetBrains Mono · Outfit + the chrome's IBM Plex Mono (Finishable had Arial + UA monospace before). Hands (1440 day): Finishable bench keys 2 + r (reveal line reads the new refs), the record's after tab, the fold · CHS a role, a starter to done, the dark flip, the fold · Crediverso ES, both flows walked, the tie, ship after, the fold · Raylu page hifi + pick Galileo, the lasso to `vehicle · 47 images`, the fold. Momence and every frozen file untouched (`git diff origin/main...studies` lists only lane files).
- WORDS (`scripts/cs-words.mjs`, served page): CHS 962 → 822 · Crediverso 741 → 595 · Raylu 579 → 491 · Finishable 603 → 521 · homepage 2111 → 2108 · Momence 669 (unchanged).
- Shots: `~/Desktop/words-<page>-<w>-<day|night>.png`, `words-contact-<page>.png`, `words-the-console-before-after.png`, `words-home-work-1440-day.png`.

### Open (Jon's gate)
- Every line above is DRAFT (`DRAFT (Jon edits)` in the four pages, objects-copy.ts, depth-copy.ts).
- builds-copy.ts (Jon's locked story) was judged and NOT edited; the judge found no line that is false or unreadable alone, only taste.
- Calls to keep or reverse: Finishable's five bin counts cut (they summed to 9,815 of 20,279 with no source for the rest); "Claude in the loop" kept (only Jon can say where); Crediverso's 79% / 81% cut (the old page never said of whom); CHS's design and measure hood rows cut (the measure is the number line); Raylu's brand / market / strategy hood rows cut (each repeated the file's page above it).

## Ship (round 2)
From the MAIN checkout on the Mac, on Jon's word:
git -C ~/sites/jt-portfolio branch backup/main-pre-$(date +%F)-words main
git -C ~/sites/jt-portfolio-studies fetch origin && git -C ~/sites/jt-portfolio-studies rebase origin/main
git -C ~/sites/jt-portfolio fetch . studies && git -C ~/sites/jt-portfolio merge --ff-only studies && git -C ~/sites/jt-portfolio push
curl -s https://www.uxjon.com/case-studies/chs/ | grep -c 'chs-tool'
curl -s https://www.uxjon.com/case-studies/crediverso/ | grep -c 'data-cv'
curl -s https://www.uxjon.com/case-studies/raylu/ | grep -c 'data-ry-set'
curl -s https://www.uxjon.com/case-studies/the-console/ | grep -c 'fn-deaths'
curl -s https://www.uxjon.com/case-studies/the-console/ | grep -c 'play the whole song'
