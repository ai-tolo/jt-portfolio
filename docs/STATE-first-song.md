# STATE · first-song (Stream B · THE FIRST SONG)

Lane: worktree `~/sites/jt-portfolio-song` · branch `first-song` (off main 76c9ae0) · preview `first-song` :4638 (`~/.claude/launch.json`, cwd = the worktree, own node_modules).
Brief: `docs/PROMPT-finish-line.md` → STREAM B. Laws: THE INSTRUMENT is sacred (engine · scheduler · keymap · module layout · device geometry 1280×850 untouched); no audio in a live preview pane; headless probes muted; kill every headless Chrome.

## Gate
- BEFORE any edit: `node scripts/signal/gate.mjs --round r5 --port 4647 --cdp-port 9365 --scratch <scratchpad>` → ALL PASS, chromium · webkit · firefox, nothing leaked (log: scratch `gate-before.log`). (`--port 4647`: the default 4637 is the intake lane's preview.)
- AFTER the pick is built: run the same command again; it must be green.

## Built (the pick: THE DEVICE, 2026-10-05; Jon: "i don't like the tape version. so go the other direction but make it more visually appealing and professional in light of the whole instrument")
- `src/signal/take.ts` — `peaks(n)` (read-only; unused by the pick, kept: harmless) · `take.test.mjs` 21/21.
- `src/signal/view/export-view.ts` — THE CONTROL grew from usage: a glass SCREEN (the song's clock, 22 px amber over `song`; the KEY screen's recipe) + a taller CAP (38 px, 13 px word, held at 134 px so the head never reflows) in the head's export corner; dormant until the first sound, then the LED and the cap's inner glow breathe. Press: `printing` → THE PRINT (payoff.ts) → the download fires as the band leaves → the cap says `saved` (its LED flashes once; the clock owns the length) → THE EVIDENCE on the screen → `export`. First time on this device: localStorage `signal-first-song` (try/catch) → the screen prints `first` over `song` once among the facts. No dev switch (the tape and the sleeve were deleted after the pick).
- `src/signal/view/payoff.ts` — THE PRINT: `.sgx-print` on #sgm, the device and the switch for 1150 ms: one band of the keys' own light (an `i.sgx-band` housing inside the device, over the strata, clipped to the bezel; a 180 px `screen` gradient) crosses the chassis left → right; each module title brightens as it passes (`--sgx-t` 120 · 500 · 880 ms); the piano's white keys light in turn under it (`--sgx-i` × 34 ms); the rocker's red breathes once. THE EVIDENCE: after `saved` the screen prints `0:04 / saved` · `C maj / key` · `120 / bpm` (· `first / song` on a first-time device), 1.8 s each with the material's blink, then the clock comes back. Lighting only; nothing in the engine, the keymap, the views' effects or the geometry changes.
- `src/styles/signal/export.css` — the control + the print's recipes; reduced motion stills every animation.
- `src/components/signal/signal-card-copy.ts` — `story` cut to two paragraphs with the pitch (DRAFT); `first` kept as a DRAFT line (unused by the device direction; the screen says `first` instead).

## Verified
- Frames (scratch `song-print.mjs`): /signal/?mute=1&test=1 at 1440 day + night and 1100 day + night: alive → press → +260 band in (DRUMS lit) → +640 mid (KEYS) → +1000 out (BASS) → +1500 `0:03 / saved` → key → bpm → first → the clock; 0 console errors; scrollWidth == innerWidth; the device 1256×834 at 1440, 923×614 at 1100. Sheet `~/Documents/studio-build/first-song/print-sheet.png` (copy on ~/Desktop: first-song-the-print.png); frames `print-*.png`.
- WAV assertion (scratch `song-wav-assert.mjs`) 7/7: RIFF/WAVE · 2 ch · 16-bit · 48 kHz · bytes agree · the head's clock stopped on the file's length · −15 dBFS RMS · the file holds the played span + the take's 0.55 s pad/tail + the voice's own decay.
- The gate `--round r5` ALL PASS ×3 browsers BEFORE any edit and ALL PASS ×3 AFTER the build (chromium · webkit · firefox, 0 FAIL, nothing leaked; `node scripts/signal/gate.mjs --round r5 --port 4647 --cdp-port 9365 --scratch <scratchpad>`).
- The directions round that led here (the tape · the sleeve · the device, the 3-lens panel, Jon's pick) is in file memory `finish_line_round`.

## Open
- Nothing on this lane: Jon's hands on :4638/signal/ (power on, play, press export), then "push it". QA law: no audio in a live preview pane; `?mute=1` headless only.

## Ship (only on Jon's "push it", from the MAIN checkout)
git -C ~/sites/jt-portfolio branch backup/main-pre-$(date +%F) main
git -C ~/sites/jt-portfolio-song rebase main
git -C ~/sites/jt-portfolio fetch . first-song && git -C ~/sites/jt-portfolio merge --ff-only first-song && git -C ~/sites/jt-portfolio push
curl -s https://www.uxjon.com/signal/ | grep -c 'sgx-screen'   # the marker (in the bundle: curl the /_astro js if the markup is runtime-built)
