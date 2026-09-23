# G · STATE · BOOT · STOP · TESTS · THE GATE

Keys: `ix` = v6lib src/engine/index.ts · `core` = v6lib src/engine/core.ts · `vi` = v6lib src/views/instrument/index.ts · `vo`/`crs`/`cr` = v6lib src/views/instrument/{voices,chord-rack-store,chord-rack}.ts · `pg/x` = signal-studio-page
src/page/x.ts · `qa` = signal-studio-page/scripts/qa-page.mjs · `rv` = this repo scripts/signal/rip-verify.mjs · `pw` = ~/studio-mocks/pw/node_modules/playwright-core/lib/coreBundle.js · `C` = src/signal/types.ts. Other v6lib paths are
relative to src/.

## 0 · Port verdicts (where two implementations exist)
- STATE: port the facade's apply ORDER and old-save law (ix:377-425), not a store. The Studio never persists engine state across a reload: only tempo rides the project (main.ts:44, 72), and the knobs come back as defaults, then CANDID (§2).
  Law 4 has no Studio precedent; THE PAGE's db.ts is the one to adapt (§3).
- BOOT: THE PAGE (pg/main:225-256) over the Studio (main.ts:97-104, a bubble-phase resume with no readiness and no seat).
- STOP: pg/stop.ts nearly verbatim, plus pg/click.ts's booked-voice kill (pg/click:183-199). Not the shell's silenceAll (press tokens, the lamp, a last pass; shell/index.ts:97-160). Not vi.silence() (vi:559-566), which leaves booked
  house-kit hits and every FX tail ringing (§5).
- TESTS: the `*.test.mjs` pattern under Node 24 strip-types (§6); the browser OfflineAudioContext harnesses are cut.
- GATE: qa's in-page ear + kill discipline, and rv's Playwright child + WebKit shim, driven by Playwright (§8).

## 1 · SignalSnapshot (ix:33-79): default · range · verdict
Defaults are the core's construction values (core:247-255, 866, 949, 1187-1191, 1659-1670; engine/music.ts:17). Ranges are the set() clamps (core:1851-1925) unless noted. V = visitor state, K = a constant (not state), X = dropped.
| group | field = default [range] | verdict |
|---|---|---|
| keys LP | cutoff .48 [0,1] (CANDID→1, vi:121) · res 0 [−50,40 dB node] · keySlope 1 [0,1] | cutoff V (= `keys.filter`, the one LP); res, keySlope K |
| keys low-cut | keyHpFreq 0 · keyHpRes 0 · keyHpSlope 1 | K (open) |
| motion | amount 0 [0,1] (MOTION; 0 reads `OFF`, views/instrument/shape.ts:215) · shape 'sine' {sine,sawi,saw,sqr} (core:673) · syncDiv '8' ∈ 10 SYNCS (engine/dsp.ts:53-64) · rateMode 'sync' {sync,hz} (pinned sync, shape.ts:242) · rateHz 3 | amount, shape, syncDiv V; rateMode, rateHz K |
| synth morph | vx .5 · vy .82 [0,1] | K (only the SYNTH voice hears them) |
| keys FX | drive .6 (CANDID 0) · driveType 'warm' {warm,crunch,tape,fuzz} (engine/fx-worklet.ts:1005) · mod .85 (CANDID 0) · modMode 'chorus' {phaser,flanger,doubler,chorus} (fx-worklet.ts:1011; unknown→chorus, core:567) · modRate .5 [0,1] (.5 = detent) · delay 0 · delayDiv '8' {4,8,8d,16} (core:731) · reverb .22 (CANDID 0) · revSize 'small' {small,med,hall,vast} (engine/ir-set.ts:20; unknown→med, core:737) | V |
| time | tempo 96 (no clamp in core; the glass clamps 20–220, views/instrument/time-strip.ts:4; the Studio boots at the project's bpm) | V (`bpm`) |
| drums | beat false · pattern 'floor' {floor,back,half,break} (dsp.ts PATTERNS) · drumMode 'auto' {auto,seq} · drumSeq 6×16 cells 0..3, all 0 (core:1187-1191; lanes kick snare hat openhat clap **perc**, engine/drum-kit.ts:21) · swing 0 · density 0 · character 0 (TEXTURE amount) · drumTex 'tape' {tape,drive} · sidechain .3 [0,1] | V |
| drum glass | drumCover 20000 Hz (open; no clamp, core:1458) · drumRes 0 · drumSlope 1 · drumHpFreq 0 · drumHpRes 0 · drumHpSlope 1 | drumCover V (as a 0..1 position); rest K |
| drum delay | drumDelayMix 0 · drumDelayTime 1 [idx 0..4 → .25/.5/.75/1/2 beats, core:1082, 1109] · drumDelayFeedback .35 [0,1; ≤ .9 at the node] | V |
| bass | bass false · bassMode 'drone' {drone,pluck,seq} · bassSeq 16 × (0 \| {v 1..3, oct base\|sub, slide?}), default v3@0 and v2@4/8/12 (core:1663) · bassRoot null (Hz) · bassLock false · bassWeight .5 (SUB, views/instrument/bass.ts:151) · bassSlope 1 (INTENSITY, bass.ts:147) · bassGlide .12 [.008,.3] (core:1659, 1815) · bassCut 1 (tone) · bassPluck 0 (= GROOVE × .6, bass.ts:126) | V |
| bass consts | bassHeat .5 · bassRate 2 [idx 0..3 → PULSE_MULT 4/3/2/1, core:1666, 1814] · bassSeqMult 1 {.5,1,2} · bassRes 0 · bassHp* 0/0/1 | K (no control on the main view) |
| harmony | key 0 [0..11] · mode 'major' {major,minor,chrom} · oct 0 [−3,3] (ix:716) · chord false · arp false · latch false (HOLD) · arpDiv 2 ∈ ARP_DIVS .5..8 (dsp.ts:71-80) · gate .5 (the arp LENGTH, .06..1.3, views/instrument/play.ts:809-812) · groove 0 (the arp GROOVE) | V |
| gestures | diveDepth 24 st · diveTime .45 s [.02,2] (core:949, 1878-1879) | V (the DIST and SPEED dials) |
| mixer | drumGain / keysGain / bassGain 1 [0,1.25] · drumMute / keysMute / bassMute 0\|1 | V |
| dropped | voiceGain 1 · voiceMute 0 (the V2 vocal bus) · drumKit null (K1 user-kit refs) | X |

The Studio keeps these in the view, not in the snapshot, so a Studio reload loses them: bass DENSITY .5 and GROOVE .3 (bass.ts:139-143) · GATE RATE 1/16, one of {1/8, 1/8T, 1/16, 1/16T, 1/32} (play.ts:80-82, 849) · GATE SWING 0 (set at
core:1874, never snapshotted) · the chord rack (its own IndexedDB, crs) · the latched notes (only keyframes carry `held`, ix:95-100). The visitor carries all of them (§10).

## 2 · What the facade adds over the core; noteOn ids; the CANDID law
- The facade adds: a 48 kHz 'interactive' context with a three-step fallback (ix:231-233) · the fx worklet, awaited before makeCore (ix:236-237) · the MusicState it owns and emits (ix:714-716) · snapshot, applySnapshot and diceRandom
  (ix:348-505; the dice rolls its own rng and keeps the mixer, EQ, kit and grid) · the take log, an always-on rolling log and a keyframe every 1.5 s, kept 600 s (ix:196-206, 290-345, 724-725) · renderOffline (ix:510-) · the two-layer IR
  ladder, bundled then armed (ix:240-283) · the kit resolver, the tempo listeners, resume() (ix:718) · window.__signalEngine and __run*Tests (ix:727-735). The visitor keeps the apply order, the held-set mirror and key/scale/oct. It cuts the
  logs, keyframes, takeForRegion, renderOffline, IR arming, kit refs and window handles; the dice is optional.
- The applyTo ORDER (ix:377-425) is load-bearing: (1) music · (2) the scalars, skipped when missing · (3) gain, mute, drum-delay, voice and keySlope with EXPLICIT defaults (ix:398-408): a missing field loads neutral, never the live value ·
  (4) bassSeq · (5) setBassRoot, then armBassLock, then setBass (ix:417-418) · (6) drumMode + drumSeq before setBeat, so the beat re-enters in phase (ix:421-422) · (7) apply(), then the generators last (ix:423-424). Visitor `load(s)` =
  DEFAULT_STATE ⊕ the sanitized partial, always explicit; it never keeps "what the module holds".
- The held-set mirror (ix:306-323, 649-688): heldNotes is the SOUNDING set. Under latch, re-striking a sounding id toggles it off and noteOff keeps it; setArp(false) clears the set; setLatch(false) prunes to the physically-down ids under
  arp, else clears; onHeldChange fires synchronously. The chord readout and "stamp what you hold" read it.
- noteOn ids are namespaced by source, so two hands on one pitch are two voices: `'k'+letter`, plus `'k'+letter+'~'+i` for chord extensions (engine/keyboard.ts:34-41) · `'p'+midi` for the pointer keybed (play.ts:355) · `'m'+note` for MIDI
  (voices/midi-in-host.ts:72) · the pad tones (cr:103). vel is 0..1, default .9 (ix:117).
- CANDID (vi:116-122, 501-508, 1065). The core's boot values are voiced for the synth (cutoff .48, drive .6, reverb .22, mod .85), so the Studio opens a FRESH engine candid: filter open, FX at 0. It does this once per engine (a WeakSet,
  vi:75-77; a re-mount used to overwrite nine dialled values, W61·A1), and again on every keys or bass voice load (vi:1065). Visitor: bake candid into DEFAULT_STATE (keys.filter 1; drive, mod, delay, reverb 0) and never apply it to a loaded
  state. Recommend NOT applying it on a voice pick: the visitor's FX are theirs.

## 3 · IndexedDB: the patterns, and the visitor store
- Studio view stores (vo:74-91, crs:54-72): a lazy `import('idb')`, so the file has zero static imports and type-strips under Node (vo:79-81) · `openDB(name, 1)` with a create-if-missing upgrade · an injectable backend plus a memoryBackend
  that structuredClones on read and write (vo:114-127, crs:152-164) · failures degrade to empty and never throw (vo:93-112; a read that THREW returns empty-but-present, so a blocked IDB cannot trigger the one-time adoption, crs:128-132) · a
  per-store serial chain for every mutation (vo:165-172, crs:175) · an update-only read-modify-write that cannot resurrect a deleted row (vo:155-158).
- HYDRATE RACES: the rack's mutation counter, where a user write during the load wins and the loaded slots are dropped (cr:85, 366-374) · the adoption re-reads INSIDE the write's turn and stands down if a stamp landed meanwhile
  (crs:188-199) · project saves coalesce, the latest wins, and waiters resolve on commit (store/index.ts:118-122).
- THE PAGE (pg/db): its own 'signal-page' v2 (chips, audio, takes; keyPath id; pg/db:35-42) · the upgrade only CREATES missing stores (pg/db:69-73) · openVerified heals a store-less DB one version up and survives the VersionError that
  follows (pg/db:75-113) · `blocking` closes and drops the handle, so a gate can delete the DB under a live page (pg/db:94-97) · openPageDb never rejects, and run() turns a failure into one warning and a neutral answer (pg/db:125-157) · the
  small state is ONE localStorage JSON, read synchronously before the first await (pg/db:200-213); it needs a `v:1` envelope, else null, then each field is sanitized on its own (pg/db:232-311) · saves land 300 ms after the FIRST unsaved
  change (not reset by later ones), and at once on pagehide, hidden and flush() (pg/main:383-397, 894-910).
- THE VISITOR STORE (proposal): C's `signal-portfolio` v1, one store `state` (keyPath id), ONE row `{id:'current', v:1, savedAt, state}` (~4 KB; no PCM, so the page's two-store split has no job). About 40 lines of raw IndexedDB with the
  page's heal, blocking-close and never-reject; the portfolio has no `idb` dependency (package.json:15-26). Saves: 250 ms after the first change + pagehide + hidden + flush(), on one serial chain. NO save before hydrate completes (else the
  first debounced save of defaults overwrites the row), and an edit during hydrate wins (the mutation counter). An IDB transaction opened in pagehide is not guaranteed to commit, so pagehide also writes the same JSON synchronously to
  localStorage `sig.pending`; boot prefers it when its savedAt is newer, then clears it. Boot fetches the SAVED voice INSTEAD of the default, never both, or the 3 MB budget breaks.

## 4 · Boot
- STUDIO: createEngine at app start (main.ts:12), a 48 k 'interactive' context suspended by the autoplay policy. The house kit starts decoding in makeCore, fire-and-forget on the suspended context (core:1113 → dsp.ts:237-251). The first
  pointerdown or keydown resumes it, once, in the bubble phase (main.ts:97-104).
- THE PAGE (pg/main:9-40, 225-256, 894-933): (1) the context on boot's first line (pg/main:232) · (2) the wake listeners BEFORE any await, capture phase on window, so they run before the hand turns the key into an intent (pg/main:240-256) ·
  (3) wake() calls ctx.resume() synchronously inside the gesture; the lattice and the shelf seat only once the context RUNS (statechange or resume().then) · (4) Escape is not a user activation, so the listeners stay until a resume succeeds
  (pg/main:37-40, 250-253) · (5) a context already running seats at the end of boot (pg/main:931-933). The default voice's zones are fetched and decoded before the gesture (pg/keys:309-323), and `voiceReady()` is the door's readiness
  (pg/main:908). The click books only while running: a suspended context would pile the hits up at resume (pg/click:25-26, 131).
- LATENCY: out.latencySec() = baseLatency + outputLatency (pg/out:360-364), and heard time = ctx.currentTime − latency (pg/main:359-361). Still unsettled: whether outputLatency already includes the render buffer (NOTES-PAGE-R1.md:79).
- FIRST SOUND: a pressed note starts "now" (not booked on the lattice) in the same event that called resume(), so it plays as the device starts: latency = resume + output. No measured number exists; qa S2 only asserts a rise above .002
  within 2 s (qa:2562-2576).
- THE VISITOR ORDER (proposal): (1) the phone / coarse-pointer gate: nothing boots, no context, no fetch · (2) read ?mute / ?test · (3) the context · (4) the wake listeners · (5) in parallel: the IDB read, the worklet modules, fetch +
  decode of the kit and the saved or default voice (middle octaves first) · (6) the graph and the modules · (7) load(state), generators last · (8) mount the view · (9) `ready` · (10) the first gesture: resume, seat the timekeeper at now +
  50 ms (pg/time:85), start the schedulers if a generator is on. Option for the planner: the 0-byte SYNTH voice sounds until the rip decodes, so a click before `ready` still sounds.

## 5 · Master stop
- THE PAGE (pg/stop:1-79): a Set registry; insertion order is sweep order, each silencer runs in its own try over a snapshot, and re-entry is dropped (pg/stop:39-59) · ONE window keydown, CAPTURE phase, installed at module evaluation, so
  nothing can swallow it (pg/stop:22-26, 77-79) · guards: e.repeat, meta/ctrl/alt, a focused text field (pg/stop:61-75) · matched by code OR key, so a synthetic KeyboardEvent works (pg/stop:34-35); never preventDefault. Registered order
  (pg/main:537-545): click off · audition discard · chips · keys.allOff (every sampler voice on a 30 ms ramp; engine/sampler/multisample.ts:284-294; pg/keys:644-651) · takes · mic mute · racks.silence (the wet cut in 15 ms and held for the
  tail; pg/main:67-72) · the reseat mark. Booked voices: future ones are cancelled and never start; sounding ones get τ 4 ms and stop at +30 ms (pg/click:14-17, 47-48, 183-199).
- STUDIO: Escape → silenceAll, only while roomLive (shell/index.ts:660-676) → vi.silence(): generators off, solo cleared, hands released, knobs and patterns kept (vi:559-566). It does NOT stop the booked house-kit hits (the baked path keeps
  no voice, core:1157-1159; setBeat(false) stops only user-kit lane voices, core:1150-1152, 1443-1447) or the keys FX tails. RV9: a restarted clock once booked 90 s of drums that Escape could not unbook (core:1427-1440; lookahead.ts:34-38).
- THE VISITOR LAW: stop() = (1) time.stop() → (2) each module's stop(): cancel the bookings, ramp what sounds (τ 4 ms, stop at +30 ms), turn off the generators, HOLD, arp, gate and dive, release the latched notes → (3) out.panic(): delay
  feedback and both return gains to 0 in 15 ms; after the ramp, swap in fresh Convolver and Delay nodes so no old tail resurfaces at the next play. Do it now, while silent: a Convolver re-partitions its IR on assignment, about 35 ms per
  second of IR (ix:258-260) → (4) saveSoon. Window blur releases held keys but is not a stop (F-view.md:95).

## 6 · Tests: how they run
- Node v24.15.0 (`source ~/.nvm/nvm.sh`), plain ESM `*.test.mjs` beside the leaf, a hand-rolled ok()/pass/fail and `process.exit(fail ? 1 : 0)` (engine/lookahead.test.mjs:14-18, 154). No framework, no package script
  (signal-studio-page/package.json:6-10).
- engine/chord-name.test.mjs runs bare (`node file`, its line 2): Node 24 strips the types of `./chord-name.ts` → 80 passed, 0.05 s. engine/lookahead.test.mjs is documented with the loader (line 11) but runs bare too → 16 passed. Its mock
  is a hand-rolled context: a clock, gains, and ConstantSources whose stop() queues onended, driven by `_advance` (lookahead.test.mjs:83-109).
- pg/shelf.test.mjs needs `--import ./src/capture/esbuild-loader.mjs`. Bare, it fails with ERR_MODULE_NOT_FOUND on the extensionless `'./filter'`; with the loader, 155 passed in 1.6 s. The loader appends `.ts` to extensionless specifiers
  and transpiles with esbuild (capture/esbuild-loader.mjs:1-31); pg/time.test.mjs is the same (time.test.mjs:22-24). Its mocks: a fake AudioParam implementing the Web Audio automation algorithm, including Chrome's cancelAndHoldAtTime ·
  nodes with edge sets (graph reachability) · Sources that record start/stop (shelf.test.mjs:60-124) · fakeDb (126-140) · a fake IndexedDB just big enough for idb 8 (721-780).
- mock-sample-player.ts is NOT a mock. It is the real minimal SamplePlayer (a fresh BufferSource per voice, 3/4 ms fades; engine/sampler/mock-sample-player.ts:1-15) that the page's rips play on (pg/keys:37, 323). engine/test-harness.ts and
  engine/sampler/test-harness.ts are browser-only OfflineAudioContext suites (headers :1-9 and :1-7, run via window.__run*Tests / test.html) → cut.
- For src/signal: Astro's strict tsconfig allows `.ts` specifiers with verbatimModuleSyntax (node_modules/astro/tsconfigs/base.json:10, 14), so leaves import `./x.ts` and every test runs bare. Keep to strip-only syntax (no enum, namespace
  or parameter properties). Copy the loader into scripts/signal only as a fallback (esbuild 0.27.7 is in the worktree). Stop semantics are node-testable on the shelf-style fake graph: after stop(), every booked Source has a stop ≤ now + 30 ms.

## 7 · qa-page.mjs: what carries over
- LAUNCH (qa:2173-2190): real Chrome (qa:251) with `--headless=new --mute-audio --autoplay-policy=no-user-gesture-required`, the fake-media flags, the background-throttling opt-outs, a mkdtemp profile, detached. The visitor gate must NOT
  pass the autoplay flag: it hides the very resume the gate measures.
- `?mute=1` does not exist in src/page (grep): THE PAGE relied on --mute-audio alone. Neither Studio tree throttles the CPU; the only precedent is ~/studio-mocks/probe.mjs:35 (an LCP probe).
- IN-PAGE INSTRUMENTS, via Page.addScriptToEvaluateOnNewDocument (qa:612-731): a load token per document (qa:614) · a stubbed HMR socket · a fake MIDIAccess · the INDEPENDENT EAR, AudioNode.prototype.connect/disconnect patched so anything
  that reaches a realtime destination passes a Gain + Analyser first (qa:676-731).
- MEASURES (qa:952-996): rise = the door's level crossing LOUD .002 · fall = both ears under QUIET .0005 · stop = a synthetic Escape, then quietAt ≤ STOP_MS 150 and worstAfter < QUIET for the rest of 1 s (qa:295-301, 2787-2830); the 150
  exists because out's analyser window is 4096 frames ≈ 85 ms (pg/out:189) · reload = every field off its default, flush, reload, compare field by field plus a PCM hash (qa:2857-2906) · console errors from Log / Runtime events, the favicon
  excluded (qa:2059-2071). Everything is timed IN the page, never across CDP (qa:93-98).
- KILL (qa:413-470): processes spawn detached and are SIGKILLed as groups on exit, SIGINT, SIGTERM, SIGHUP, uncaughtException and unhandledRejection; stragglers are found by `pgrep -f` on the unique profile path; the last line proves that
  pgrep empty. Never a global pkill.
- NOTES-b11.md:89-91: CDP `Input.dispatchKeyEvent` under --headless=new starves the renderer's LOADING queue for tens of seconds (fetches stall; mouse dispatch wedged in B9). That is why qa dispatches synthetic KeyboardEvents (qa:93-98).

## 8 · THE R1 GATE (design, not built): `node scripts/signal/gate.mjs [--only=…] [--port=4638] [--keep]`
### 8.1 Processes
- THE PARENT: (1) leak preflight → (2) `npm run build`, judged by the exit code only (CLAUDE.md) → (3) serve dist/client; /signal is prerendered (src/pages/signal.astro `prerender = true`; astro.config.mjs output 'server') → (4) one CHILD
  per browser (`--leg=<b>`, detached, JSON lines on stdout) → (5) the verdict table → (6) the KILL line.
- THE SERVER: Node http on 127.0.0.1:<port>. Never :4636 (Jon's hands); refuse a port that already answers. `/signal` → `signal/index.html`; MIME types include .m4a audio/mp4, .js text/javascript, .json, .woff2, .svg; `no-store`. It logs
  `{t: Date.now(), path, bytes}` at every response end, so the budgets are server-side, identical for all three browsers, and uncompressed (≥ what Vercel serves).
- THE BROWSERS: Playwright 1.63 via `import {chromium, webkit, firefox, devices} from '/Users/tolo/studio-mocks/pw/node_modules/playwright/index.mjs'`. chromium: headless defaults to chrome-headless-shell 1243 (pw:43375). That is old
  headless, not NOTES-b11's --headless=new, and it is Chrome for Testing, an app bundle separate from Jon's Chrome, so a leak cannot block his. webkit: the frozen macOS-14 build 2251, driven through rv's pipe shim that renames
  `PushAPIEnabled` (rv:10-12, 76-104). That is the cause of "hung on first launch": the build rejects the setting and newPage() never resolves. firefox: `firefoxUserPrefs: {'media.volume_scale': '0.0'}`.
- MUTE: Playwright mutes ONLY headless Chromium (`--mute-audio`, pw:43342). WebKit and Firefox play aloud unless the page mutes itself, so `?mute=1` is the load-bearing guard, and a leg ABORTS before any input if `__signal.muted !== true`.
- CLOCKS: the parent owns them (rv:178-200). Limits: launch 30 s (webkit 45), each step 30 s (also raced inside the child), each leg 240 s (chromium 300). On expiry: SIGKILL the child group, the ms-playwright pids that were not there at
  preflight (rv:129-131) and the shim marker, then print `SKIP <browser>: hung at <step> (stderr tail)` and go on. Exit 0 = all PASS · 1 = any FAIL or a leak · 2 = passes plus a SKIPPED webkit/firefox leg (incomplete, never a pass). A
  Chromium SKIP is a FAIL: it alone carries the throttle.
### 8.2 The in-page instruments (?mute=1 / ?test=1 only; the probe module is never fetched otherwise)
- The out graph: master → tap → {AnalyserNode 2048, AudioWorkletNode 'sig-probe'}, and master → muteGain(0) → destination. The probe also feeds muteGain, so every engine pulls it. level() reads the tap, pre-mute (C:65).
- 'sig-probe' computes per render quantum: peak, rms and hf = mean((x[n]−x[n−1])²). `arm` (from wake) → it posts the first frame with peak > 1e-3. `quiet` (from stop) → it posts the first frame after which peak stays < .0005 for 1 s.
  STALLS: lag = Date.now() − (wall0 + (currentFrame − f0)/sr·1000). Date is ECMAScript and exists in AudioWorkletGlobalScope; `performance` is not guaranteed there. The baseline is the rolling minimum over 2 s, and a stall is when lag − baseline exceeds
  baseLatency·1000 + 1.5·128/sr·1000 (≈ 9 ms with a 256-frame device buffer): an underrun leaves the render permanently behind the wall clock.
- Frame → time: `ctx.getOutputTimestamp()` maps a context time to performance time AT THE OUTPUT (heard). Without it, the fallback is performance.now() when the probe's message arrives: an upper bound, flagged `via:'message'`. The gesture
  mark is the wake listener's `e.timeStamp`, which includes input-queue delay (same clock as performance.now()).
- THE SCHEDULER LOG: every booking records {gen, frame, atFrame = round(ctx.currentTime·sr)} · late = frame − atFrame < 128 · expected = the 16th steps of each running generator inside the window · booked = the bookings made in it.
- SPIKE (click): a quantum whose hf exceeds 250× the median of the last 64 quanta, with no booked or pressed onset within ±2 quanta. R1 reports spikes and gates them at a threshold frozen after the first clean run.
### 8.3 Steps and assertions (per leg; T is Chromium only; M is gated in Chromium and reported in WebKit)
- **B · boot.** A fresh context at 1440×900, DPR 1, opens `/signal?mute=1`; an init script counts AudioContext constructions and stamps a load token. Assert: `muted` true (else ABORT) · `ready` within 10 s · the context 'suspended' before
  the gesture (reported per browser) · #sig-device and `[data-sig=keybed]` visible, with 49 `[data-midi]` keys (C2–C6, F-view.md:104) · `matchMedia('(pointer: fine)')` holds (Playwright forces a fine pointer in headless Chromium, pw:43343)
  · 0 pageerror and 0 console.error.
- **F · first sound.** The ONLY trusted input before any measurement is `page.mouse.click` on the C4 key's centre. Assert: firstSoundMs (heard) ≤ **200** (the rendered value reported too) · the context 'running' within 1 s · bytes served
  before the first sound (server log, t < timeOrigin + marks.firstSound) ≤ **3 MB** · no voice folder requested except the default or saved one. **F′**, in a fresh context: a trusted Escape first, then a trusted click → it still sounds
  (Escape must not spend the wake).
- **L · the loop**, built through `__signal.press` (synthetic, so no fetch follows a trusted key): drums on · bass SEQ on · CHORD + HOLD + ARP on a 3-note chord · delay and reverb returns up via load() · level().rms > .002 after 2 s · an
  unthrottled 10 s window, glitches reported (every browser).
- **T · 4× throttle (Chromium).** `cdp = await context.newCDPSession(page)`; `cdp.send('Emulation.setCPUThrottlingRate', {rate: 4})`; glitches(true); a node-side sleep of 20 s; read; rate back to 1. GATE: stalls 0 · late 0 · booked ===
  expected per generator · spikes 0. Report maxStallMs and the longtasks count (PerformanceObserver 'longtask').
- **X · master stop.** The loop plays with a held note and a reverb tail; a synthetic Escape on window (pg/stop matches the key). Assert: quiet (probe) ≤ **100 ms**, then < .0005 for 1 s · voices() {sounding 0, booked 0} at +150 ms · every
  generator, HOLD and arp off in state() · held() empty. The leg's LAST input is one trusted Escape (the real key path); nothing is timed after it.
- **P · persistence.** Move ≥ 12 things off their default: 3 drum cells, pattern, swing, voice → pad (lazy: its folder is requested only now, ≤ **1.5 MB**), filter, MOTION, bpm, bass SEQ + one step + LOCK, oct, key, CHORD, HOLD, arp rate,
  rack pad 3, gate rate, dive dials. Then flush() → S0 = state() plus the IDB row read in the page → reload → `ready` → deepEqual(S0, state()), and the row equals state(). **P2:** one more edit, then a reload within 50 ms and no flush →
  still equal (the pagehide path). **P3:** a garbage row → DEFAULT_STATE, no throw, ≤ 1 warning. **P4:** a `v:1` row missing `harmony` → harmony defaults, the rest restored. **P5:** after P's reload, boot fetched pad, not rhodes.
- **S · shots (every browser).** 1440×900 and 1024×768 viewport shots; when the keybed's bottom is below innerHeight, scrollIntoView and take a second `-pin` shot; one `-live` shot at 1440 with the loop playing. Assert
  `documentElement.scrollWidth ≤ innerWidth` and the device box inside the viewport width. Files go to ~/Documents/studio-build/signal/R1-<browser>-<w>[-pin|-live].png; the paths are printed, and the planner LOOKS at every one before the
  report.
- **M · phone.** `devices['iPhone 13']` (isMobile + hasTouch; touch emulation flips the pointer to coarse, per the CLAUDE.md phone rule) opens `/signal?mute=1`. Assert: the still and its one line visible, #sig-device not displayed · 0
  AudioContext constructions · no request under `/s/` · scrollWidth ≤ 390. Shot: R1-<browser>-phone.png.
- **K · the kill line** (§8.4).
### 8.4 Kill on exit
- PREFLIGHT: `pgrep -fl -- --headless` and `pgrep -f ms-playwright` first (memory: a leaked --headless probe blocks Jon's Chrome). Record pwBefore and never touch those pids. A child races `browser.close()` against 5 s, then exits.
- On every exit path (exit, SIGINT, SIGTERM, SIGHUP, uncaughtException, unhandledRejection; qa:462-470), the parent SIGKILLs the child groups and the new ms-playwright pids, runs `pkill -9 -f -- <shim marker>` (rv:136), and closes the
  server (closeAllConnections). The last line reads `KILL PASS · new ms-playwright pids: none · shim: none · new --headless: none`; otherwise KILL FAIL and exit 1.
### 8.5 Hazards the design already answers
- Trusted input happens only where the law needs an activation (F, F′, the last Escape). NOTES-b11 measured the starvation under --headless=new, not the headless shell, but the gate does not bet on that.
- A CPU throttle slows the main thread (the timers and the scheduler: what drops notes in a Web Audio app). Whether it reaches the AudioWorklet render thread is unverified, so `stalls` may read 0 by construction; `late`/`expected` are the
  load-bearing half.
- AAC in Playwright's Chromium: chromium-1243 is "Google Chrome for Testing.app" (~/Library/Caches/ms-playwright), and its decode is unverified here (no browser was launched). A failure shows as B's `ready` failing loudly. Fallbacks:
  `channel:'chromium'` (new headless: the starvation risk) or `channel:'chrome'` (Jon's Chrome: the leak risk); the integrator decides with the numbers.
- Playwright's Chromium disables background timer throttling and the bfcache (pw:34856-34878); hidden tabs go unexercised.

## 9 · window.__signal: the test surface (published only under ?mute=1 or ?test=1; ?test=1 = unmuted, for Jon's ear)
```ts
export interface SignalTestSurface {
  v: 1;
  muted: boolean;                               // ?mute=1 took: destination behind a 0-gain. Read BEFORE any input.
  booted: boolean;                              // instrument built (false on a phone / coarse pointer: nothing boots)
  ready: boolean;                               // kit + the default-or-saved voice decoded
  ctx: AudioContext;                            // .state .currentTime .sampleRate .baseLatency: read, never driven
  marks: { ready: number | null; gesture: number | null; firstSound: number | null; stop: number | null; quiet: number | null }; // performance.now() ms
  firstSoundMs: number | null;                  // firstSound − gesture, HEARD (getOutputTimestamp)
  firstSoundVia: 'timestamp' | 'message' | null;
  latency(): number;                            // baseLatency + outputLatency, s (pg/out:360-364)
  level(): { peak: number; rms: number };       // pre-mute tap
  glitches(reset?: boolean): { windowMs: number; quanta: number; stalls: number; maxStallMs: number;
    late: number; booked: number; expected: number; spikes: number; longtasks: number };
  voices(): { sounding: number; booked: number }; // every tracked AudioScheduledSourceNode across modules
  held(): number[];                             // MIDI sounding, HOLD included
  state(): SignalState;
  load(s: Partial<SignalState>): void;          // DEFAULT_STATE ⊕ sanitized s; generators last (ix:423-424)
  flush(): Promise<void>;                       // save now; resolves on the transaction's complete
  press(code: string, on: boolean): void;       // the real keymap; synthetic, so NOT a user activation
  stop(): void;                                 // the same sweep as Escape
  warnings: string[];                           // guarded failures (a zone, IDB unavailable, …)
}
```
Against C:266-275: `ctxState` becomes `ctx.state`; glitches() gains stalls, late, booked, expected and spikes; new are muted, booted, marks, voices, held, load, flush and warnings. DOM hooks the gate needs: `#sig-device`,
`[data-sig=keybed]` with `[data-midi]` on every key, `[data-sig=phone]`.

## 10 · Proposed SignalState (from §1; replaces C:242-249)
```ts
export interface SignalState {
  v: 1;
  bpm: number;                                  // C 60–180 (the Studio glass: 20–220)
  drums: { on: boolean; mode: 'auto' | 'seq'; pattern: 'floor' | 'back' | 'half' | 'break';
    seq: Record<DrumLane, (0 | 1 | 2 | 3)[]>;   // 6 × 16
    swing: number; density: number;             // 0 / 0
    cover: number;                              // 0..1, 1 = open (the Studio: 20000 Hz)
    texture: 'tape' | 'drive'; textureAmt: number; // no 'off' in the Studio: amount 0 is off
    delay: { mix: number; time: 0 | 1 | 2 | 3 | 4; feedback: number }; // 0 · 1 (= 1/8) · .35
    sidechain: number;                          // .3
    gain: number; mute: boolean };
  bass: { on: boolean; mode: 'drone' | 'pluck' | 'seq';
    seq: Array<0 | { v: 1 | 2 | 3; oct: 'base' | 'sub'; slide: boolean }>; // v3@0, v2@4/8/12
    root: number | null; lock: boolean;
    intensity: number; sub: number; glide: number; // bassSlope 1 · bassWeight .5 · bassGlide .12 s
    density: number; groove: number;            // .5 / .3, view-owned in the Studio
    tone: number; gain: number; mute: boolean }; // bassCut 1
  keys: { voice: VoiceId; filter: number;       // 1 = open (CANDID)
    motion: { amount: number; shape: 'sine' | 'sawi' | 'saw' | 'sqr'; div: string }; // amount 0 = OFF; div ∈ SYNCS
    fx: { drive: number; driveType: 'warm' | 'crunch' | 'tape' | 'fuzz'; mod: number;
      modMode: 'phaser' | 'flanger' | 'doubler' | 'chorus'; modRate: number;
      delay: number; delayDiv: '4' | '8' | '8d' | '16'; reverb: number; revSize: 'small' | 'med' | 'hall' | 'vast' };
    gain: number; mute: boolean };
  harmony: { key: number; scale: 'major' | 'minor' | 'chrom'; oct: number; // oct −3..3
    chord: boolean; hold: boolean;
    held: number[];                             // the LATCHED set under HOLD; silent until the first gesture
    arp: { on: boolean; div: number; length: number; groove: number }; // div ∈ ARP_DIVS (2 = 1/8); length = LEN .06–1.3, .5
    gate: { div: 2 | 3 | 4 | 6 | 8; swing: number }; // the Z gesture itself is never saved
    dive: { depth: number; time: number };      // 24 st · .45 s
    rack: Array<{ notes: number[]; vels: number[] } | null> }; // 8
}
```
Diffs vs the draft C: motion.on is redundant (amount 0 is OFF, shape.ts:215) · shape 'tri' does not exist; the Studio's is 'sawi' (core:673) · revSize 'sm' → 'small' (ir-set.ts:20) · LfoDiv holds 5 of the 10 SYNCS · ArpDiv lacks 1/2 and
1/4T (dsp.ts:71-80) · GateDiv lacks 1/16T and 1/32 (play.ts:80-82) · arp.length is the note LENGTH (play.ts:809-812), not octaves · drums texture 'off' does not exist · the lane key is 'perc' in the Studio (drum-kit.ts:21); SHKR is only its
label · gate.on is a held gesture, never state · scale drops 'chrom' · oct is −3..3 in the Studio, not −2..2 · rack lacks vels (crs:19-24 also keeps a label and capturedKey) · new: harmony.held, harmony.dive, bass density/groove. P assumes
the generator `on` flags and the latched set are restored, so the loop comes back on the first touch: that is what "loses nothing" means (§11).

## 11 · Open, for the planner
- On reload, restore the generator `on` flags and the latched set, so the loop resumes on the first touch (recommended; P's equality assumes it)? Or come back stopped?
- CANDID on a voice pick? The Studio applies it (vi:1065). Recommended: no.
- A click before `ready`: sound the 0-byte SYNTH until the rip decodes, or stay silent?
- The gate's Chromium binary: the headless shell (the default) unless B's AAC decode fails; then `channel:'chromium'` or `'chrome'`?
- The localStorage `sig.pending` mirror on pagehide: is it acceptable under Law 4, which says "in IndexedDB"?
