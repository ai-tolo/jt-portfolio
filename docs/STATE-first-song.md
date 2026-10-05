# STATE · first-song (Stream B · THE FIRST SONG)

Lane: worktree `~/sites/jt-portfolio-song` · branch `first-song` (off main 76c9ae0) · preview `first-song` :4638 (`~/.claude/launch.json`, cwd = the worktree, own node_modules).
Brief: `docs/PROMPT-finish-line.md` → STREAM B. Laws: THE INSTRUMENT is sacred (engine · scheduler · keymap · module layout · device geometry 1280×850 untouched); no audio in a live preview pane; headless probes muted; kill every headless Chrome.

## Gate
- BEFORE any edit: `node scripts/signal/gate.mjs --round r5 --port 4647 --cdp-port 9365 --scratch <scratchpad>` → ALL PASS, chromium · webkit · firefox, nothing leaked (log: scratch `gate-before.log`). (`--port 4647`: the default 4637 is the intake lane's preview.)
- AFTER the pick is built: run the same command again; it must be green.

## Built (the directions round, 2026-10-05)
- `src/signal/take.ts` — `peaks(n)` (read-only; `peaksOf` pure) for the drawn waveform. `take.test.mjs` 21/21.
- `src/signal/view/export-view.ts` — THE CONTROL grew from usage: a glass SCREEN (the song's clock, 22 px amber over `song`; the KEY screen's recipe) + a taller CAP (38 px, 13 px word, held at 134 px wide so the head never reflows) in the head's export corner; dormant until the first sound, then the LED and the cap's inner glow breathe. Press: printing → the ceremony (payoff.ts) → the download fires as the object lands → the cap says `saved` (the clock owns the length) → export. First time on this device: localStorage `signal-first-song` (try/catch), marked when the object is SEEN. The `?dir=` dev switch (DEFAULT_DIR 0).
- `src/signal/view/payoff.ts` — the three directions: 1 THE TAPE (the LISTEN room's cassette assets, label printed with the name + waveform + the first line, the length in its window; a BUTTON: press and it plays the WAV back through a plain audio element, reels turning, the window counting; "in your downloads" on the label) · 2 THE SLEEVE (paper card; KILLED by the panel, on disk until the pick) · 3 THE DEVICE (lighting only: the piano's lamps sweep, the rocker breathes; after `saved` the screen prints key · bpm · `first/song` once, then the clock). The slot for 1/2 is a sibling after `.sgm`, zoomed with the device, 0 tall until the ceremony (the card glides down); a new power-on folds it.
- `src/styles/signal/export.css` — the control + the three directions' recipes.
- `src/components/signal/signal-card-copy.ts` — `story` cut to two paragraphs with the pitch (DRAFT); `first` = the first-time line (DRAFT): "That's your first song. It's in your downloads."

## Verified
- Render (scratch `song-dirs.mjs`): /signal/?mute=1&test=1&dir=N at 1440×1240, day + night: power → play → alive → press → mid → end → residue; every run downloaded a valid WAV (RIFF/WAVE · 2ch · 16-bit · 48 kHz · 3.9–4.0 s for a ~4 s play); 0 console errors. Shots `~/Documents/studio-build/first-song/dir*-*.png`; sheets `sheet-dir0..3.png`; the two for Jon: `pick-A-tape.png` · `pick-B-device.png` (copies on ~/Desktop as first-song-A-tape.png / first-song-B-device.png).
- 3-lens panel: Jon-eye 1 > 3 > 2 (kill 2: a night toast) · craft 1 > 2 > 3 (kill 3: a light show) · skeptic 2 > 3 > 1 (kill 1: inert cassette claiming "your tape") → the fixes applied: the tape plays and says "in your downloads"; the device keeps its residue on its own screen, no card line, no trace flare; the cap says `saved` alone.

## Open (Jon's pick)
- http://localhost:4638/signal/?dir=1 (A · THE TAPE) vs http://localhost:4638/signal/?dir=3 (B · THE DEVICE). After the pick: set DEFAULT_DIR, delete the other two from payoff.ts + export.css, the WAV assertion in a scripted play (header · 48 k · duration within 50 ms of the clock · non-silence), the gate green, QA at 1440 and 1100 day/night.

## Ship (only on Jon's "push it", from the MAIN checkout)
git -C ~/sites/jt-portfolio branch backup/main-pre-$(date +%F) main
git -C ~/sites/jt-portfolio-song rebase main
git -C ~/sites/jt-portfolio fetch . first-song && git -C ~/sites/jt-portfolio merge --ff-only first-song && git -C ~/sites/jt-portfolio push
curl -s https://www.uxjon.com/signal/ | grep -c 'sgx-screen'   # the marker (in the bundle: curl the /_astro js if the markup is runtime-built)
