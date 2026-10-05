# STATE · intake-live (Stream A · INTAKE, live)

Lane: worktree `~/sites/jt-portfolio-intake` · branch `intake-live` (off main 76c9ae0) · preview `intake-live` :4637 (`~/.claude/launch.json`, cwd = the worktree, own node_modules).
Brief: `docs/PROMPT-finish-line.md` → STREAM A. Laws: inputs open on the stranger's click only; no UI-text crutch; the stage keeps its geometry; StudioOne is a hazard file (untouched this lane so far).

## Built
- `src/data/intake-run.json` — the canned replay is a universal ART example now (Stream D3): "Harbor 12", 0:41, three everyday things → one calendar add (execute) + two tasks. `verdicts` lights two words. Caption in objects-copy.ts redrafted (DRAFT).
- `src/components/studio/objects-copy.ts` — `LIVE_COPY` (DRAFT, Jon's): talk · listening · the privacy sentence · asking / typed / noSpeech / denied / empty · heard · kept · source · local · preview · caption template.
- `src/components/IntakeHero.astro` — LIVE MODE: a `talk` control (the hint at rest, a pill beside Replay at the end frame) → SpeechRecognition on the click (interim results type into the transcript row; the face counts down from 1:30; 1,500-char cap) → stop → heard → `/api/intake` (10 s) or the local parse (chip) → verdict → stubs → cards → "nothing kept". Firefox / declined mic → typed mode (the transcript box is the input; ⌘⏎ or stop runs it). Dev switch `?state=idle|asking|denied|typed|listening|transcribing|parsing|result|local|down|empty|toolong` + `window.__intakeLive` (DEV only; dropped from production bundles).
- `src/lib/intake-schema.ts` — the result shape + `validateResult` (both parsers emit it).
- `src/lib/intake-local.ts` — the rule-based fallback (clauses → cues → note-voice tickets; pretend → none).
- `src/pages/api/intake.ts` — `prerender = false`; same-origin, 1,500 chars, Haiku 4.5 pinned, max_tokens 800, 9 s upstream timeout, strict JSON validated, `fallback: true` on no key / timeout / malformed; no content logged.
- `src/data/intake-fixtures.json` + `scripts/intake-fixtures.mjs` — 12 memos, expected fates; `node scripts/intake-fixtures.mjs [--endpoint http://localhost:4637/api/intake --runs 2]`.

## Verified (2026-10-05)
- Local parser: fixtures 12/12 (`node scripts/intake-fixtures.mjs`). The Claude run of the same fixtures waits on the key (`--endpoint`).
- Build gate `npm run build` exit 0; `window.__intakeLive` / `?state=` absent from the production bundle; the function builds to `.vercel/output/_functions/chunks/intake_*.mjs`.
- Endpoint guards on the dev server: no key → 503 `{fallback:true}` · foreign Origin → 403 · GET → 405.
- PILOT (scratch `intake-pilot.mjs`, headless Chrome, a mocked SpeechRecognition typing a three-item memo): the transcript types live (2 → 205 chars over ~3 s), stop → Heard → local parse → execute + surface lit → 3 cards (task · reminder with its preview line · idea), `local parse` chips, the caption; the words under the run moved 0 px at 1440 (the reserve floors at the art run's height and only grows); 0 console errors; scrollWidth == innerWidth. Phone (390×844, touch): same flow, PASS (no reserve on phones by design).
- STATES (scratch `intake-states.mjs`): rest · idle · asking · denied · typed · listening · transcribing · parsing · result · local · empty · toolong rendered at 1440 day (+ night: listening/result/typed) and 375 touch (idle/listening/typed/result/local): every state holds its mode, 0 errors, no sideways scroll. Shots: `~/Documents/studio-build/intake-live/state-*.png`, `pilot-*.png`, `phone-*.png`, contact sheets `contact-desk.png` / `contact-night-phone.png`.
- Guard: the live stage sets `s2` at the press, which the host's first-settle reads as "spent" (its own stop press can no longer end a stranger's session).
- Not verified here: a real microphone + real Chrome/Safari/iPhone speech (Jon's hands); Firefox typed path only by the state switch.

## Open
- ANTHROPIC_API_KEY: Jon pastes it in Vercel (production + preview) and in this lane's `.env`; until then the stage runs on the local parse with the chip. Claude fixture run needs the key.
- Jon feels the pilot at the pad: http://localhost:4637/#work

## Ship (only on Jon's "push it", from the MAIN checkout)
git -C ~/sites/jt-portfolio branch backup/main-pre-$(date +%F) main
git -C ~/sites/jt-portfolio-intake rebase main   # if main moved
git -C ~/sites/jt-portfolio fetch . intake-live && git -C ~/sites/jt-portfolio merge --ff-only intake-live && git -C ~/sites/jt-portfolio push
curl -s https://www.uxjon.com/ | grep -c 'data-talk'   # the marker
