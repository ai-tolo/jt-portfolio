# D · TIME, THE ARP, THE CHORD MACHINE, THE KEYBOARD

`V/` = ~/sites/signal-studio-v6lib/src (v6-library @2a9e4a7) · `P/` = ~/sites/signal-studio-page/src/page (page @67b6b58) ·
`core.ts` = V/engine/core.ts · `eng/index.ts` = V/engine/index.ts (facade) · `inst/index.ts` = V/views/instrument/index.ts (the
window-key owner) · `play.ts` `chord-rack.ts` `time-strip.ts` = V/views/instrument/*. Leaf suites green today: music 17 · chord-name
80 · chord-edit 61 · stage 24 · gravity 38 · key-relations 52 · rack-store 28 · lookahead 16. MEASURED = scratch replicas
(`D-tempo-sim.mjs`, `D-window.mjs`, `D-colour-arp.mjs`). `→ contract` = a delta against src/signal/types.ts as frozen at R0.

## 1. Time

### 1.1 The core's clock (what the Studio runs)
- **Wake**: `clockTick()` = `tick()` + `setTimeout(clockTick, 25)` (core.ts:1412). **Second driver**: `createAudioHeartbeat`, a
  silent ConstantSourceNode re-armed from its own `ended` every 0.25 s, ticking only while the timer is set (core.ts:1418-1422,
  lookahead.ts:169-206). `tick()` books all due before now+horizon and nothing twice: two drivers, one schedule (lookahead.ts:165-167).
- **Horizon**: `createLookahead({min: 0.1})` (core.ts:1269; lookahead.ts:34) = `min(90, max(0.1, hiddenBase, 3·worstGap))`
  (137-140); hiddenBase 0.6 s for the first 8 s hidden, then 3 s (41-45, 121-125); worst gap decays ×0.96 per tick (47-49,
  128-135). Coming forward forgets the clock AND the gaps (RV7, 94-116); every clock start calls `restart()` (RV9, core.ts:1438),
  else a stop→start counted the silence as one wake and booked up to 90 s ahead (core.ts:1429-1435). Hidden tabs throttle timers
  to 1/s (1/min idle): the heartbeat is a media event outside that budget (lookahead.ts:4-31). Offline: 0.1 s, no listener (1255-1269).
- **wantsClock** = drums on ∨ arp on ∨ GATE held ∨ bass powered in PLUCK/SEQ (core.ts:1441). `clockEnsure` starts timer +
  heartbeat only when wanted (1436-1439); `clockStopIfIdle` clears the timer, sets **`transport0 = null`**, stops the heartbeat
  (1440). Callers: setBeat (1443-1447), setArp (929-930), the gate gesture (966).
- **transport0 is lazy; there is no play/stop transport.** The first `gridNext(step)` seats it at now+0.05; every later starter
  snaps to ITS OWN division's next line ≥ now+0.02 counted from it (core.ts:1271-1275). Drums join mid-bar on the right step,
  `drumStep = round((nextDrumT − transport0)/sd)` (1445). The last part leaving drops the origin.
- **Per-part float accumulators**: `nextDrumT += 60/tempo/4` (1300-1342), `nextArpT += step` (1351-1384), `gateNextT += dur`
  (1387-1398); bass pulses ride the drum loop while drums run (1337-1340), else their own with the W15 fast-forward (1399-1410).
- **Tempo**: `set('tempo')` only writes fx.tempo (1867); each loop's NEXT step reads it; transport0 is never re-anchored. Default
  96 (core.ts:250) → contract 120. UI: drag 0.5 BPM/px, clamp 20–220 (time-strip.ts:66-75); TAP `=` = mean of the last ≤5 taps,
  ≥2 taps, 2 s idle reset, `Date.now()` (time-strip.ts:81-98).
- **Swing hooks**: drum SWING delays the off-8th by swing·0.66·16th and odd 16ths by swing·0.5·16th, ±5 ms hum, kick never swung
  (1303-1304, 1319, 1323); arp GROOVE (§2.3); gate SWING alternates chops sd·(1±sw/3) (1394-1397).
- **MEASURED, tempo change flams**: replica of 1271-1275/1300-1301/1351: after 120→100 the arp lands 25 ms off the drums (29.6 ms
  at 120→97), running or started after the change; GROOVE's step index (1362) reads the stale origin (35.95 sixteenths, rounded).
- **Late steps are crammed, not skipped**: a stall longer than the horizon books past-time drum/arp hits, which Web Audio plays at
  once (a flurry); only the bass pulse fast-forwards (1400-1408); the G-mode arp clamps late notes to now+2 ms (1371).
- **Master stop reach**: `kill()` (1956-1966) releases held voices, clears the timer, calls `laneAllOff`, which reaches only
  ASSIGNED-kit voices (1150-1152); the baked kit drops its voice handle (1159). Booked baked hits and arp plucks inside the horizon
  still sound (≤0.1 s in front, ≤3 s hidden). `kill()` never stops the heartbeat (1963 vs 1422).

### 1.2 THE PAGE's lattice (the precedent)
- `FrameGrid {sr, barFrames, originFrame}`: ONE integer `barFrames`, bpm DERIVED 240·sr/barFrames, beats rounded inside the bar
  from its line, nothing accumulates (P/grid.ts:1-86); pure `gridFromBpm gridBpm barFrameOf barIndexAt nextBarFrame beatFrameOf
  nextBeat beatAt` (23-81). Tap: `estimateBpm` = median IOI of ≥3 taps (IOIs 60 ms–3 s) folded by octaves into 60..200 (92-134);
  the keeper keeps ≤8 taps, 2 s reset (P/time.ts:94-97, 317-328).
- A tempo change LANDS ON THE NEXT BEAT keeping bar + beat numbers: the new origin solves `beatFrameOf(new, at.bar, at.beat) ===
  at.frame` (P/time.ts:34-37, 292-301). Origin seated now+50 ms, re-seated at the first gesture (85, 491-497).
- The click is the scheduler template (P/click.ts): 25 ms `setInterval`, `createLookahead({min: 0.12})`, no heartbeat (it would
  touch ctx.destination, 19-24), gated on `ctx.state === 'running'` (131), a frame CURSOR over lattice lines, a line already
  past or within 4 ms of now SKIPPED, never crammed (45, 137), every booked voice TRACKED so `stop()` cancels future ones and ramps sounding
  ones (τ 4 ms, cut at 30 ms) (108-128, 183-199), `start()` = `look.restart()` + cancel-and-rebook from now+20 ms (163-181).
- Not the visitor's (cut): modes free/click/loop/record, adopt*/recordLost, planHandover (P/time.ts:1-68, 145-166, 364-489); notelog.ts.

### 1.3 RECOMMEND: the page's lattice + one scheduler shaped like its click + the core's wantsClock law
Port P/grid.ts and V/engine/lookahead.ts verbatim; write time.ts new. The lattice cannot flam (every part's lines come from one
integer grid), tracked bookings make Law 5's master stop true at any horizon, the late-skip survives 4× CPU throttle without
bursts; the core's accumulators, lazy float origin and unbookable notes fail all three (§1.1). Keep from the core: the
wantsClock law, a joining part's own-division snap, the heartbeat (a 0-gain sink, silent under ?mute=1), the RV7/RV9 resets.
```ts
// grid.ts: P/grid.ts verbatim + beatFrameOf generalised to ANY division (triplets, 1/32), rounded from the bar line:
lineFrame(g, bar, i, perBar) = barFrameOf(g, bar) + Math.round(i * g.barFrames / perBar)
linesIn(g, perBar, from, to): { frame, bar, i }[]      // perBar 1/2→2 1/4→4 1/4T→6 1/8→8 1/8T→12 1/16→16 1/16T→24 1/32→32
// time.ts: the contract's Timekeeper plus two members
createTimekeeper(ctx, { bpm = BPM_DEFAULT, lead = 0.05, min = 0.12, tickMs = 25 }): Timekeeper & {
  want(part: 'drums' | 'bass' | 'arp' | 'gate', on: boolean): void; // core.ts:1441: 1st want seats now+lead; last drops origin
  nextLine(perBar: number, fromFrame?: number): number;              // core.ts:1271-1275: a part joins on its own line ≥ now+20 ms
}
tick():    !running || ctx.state !== 'running' → return; look.saw(now); to = nowF + horizon·sr;
           cursor < nowF + 4 ms → cursor = nowF + 4 ms (skip, P/click.ts:137); every 16th line in [cursor, to) → onStep;
           bar lines → onBar; cursor = to
setBpm(b): clamp BPM_MIN..BPM_MAX → barFrames'; at = nextBeat(grid, cursor)   // ≥ all already booked: nothing to cancel
           newGrid.origin = at.frame − beatFrameOf({barFrames', origin 0}, at.bar, at.beat)   // P/time.ts:292-301
           lines < at.frame still come from the old grid, ≥ at.frame from the new (a pending switch, not an instant one)
tap(tMs = performance.now()): P/time.ts:317-328, folded into 60..180 (>2:1, so foldBpm ends, P/grid.ts:124-125; 60..200 overshoots)
stop():    clear timer, heartbeat.stop(), look.restart(), wanted.clear(), cursor = null; every module's stop() cancels its
           tracked bookings with start > now and ramps the rest ≤30 ms (P/click.ts:183-199 is the template)
playhead(): beatAt / 16th of the frame at ctx.currentTime − (outputLatency || baseLatency || 0)
```
Sub-16th parts need no second scheduler: `Harmony.book(b)` books its division's lines in [b.frame, step+1's frame) via `linesIn`,
so the contract stands; GROOVE and drum SWING read (bar, step) off the lattice, so the stale index (core.ts:1362) goes.

## 2. The arpeggiator (core.ts; knobs in play.ts)

### 2.1 Divisions and the three knobs
| RATE (ARP_DIVS, dsp.ts:71-80) | 1/2 | 1/4 | 1/4T | **1/8** | 1/8T | 1/16 | 1/16T | 1/32 |
|---|---|---|---|---|---|---|---|---|
| `fx.arpDiv` = notes per beat | 0.5 | 1 | 1.5 | **2** (core.ts:250; knob idx 3, play.ts:804) | 3 | 4 | 6 | 8 |
- step = 60/tempo/arpDiv (core.ts:1345); RATE = an 8-detent stepped knob → `setParam('arpDiv')` (play.ts:797-808). → contract
  `ArpDiv` keeps 6 (no 1/2, no 1/4T).
- **LENGTH is not octaves or steps.** It is `fx.gate` = 0.06 + v·1.24 (0.06..1.3, default 0.5) (play.ts:809-813): each pluck lives
  step·gate (core.ts:1354), its staccato decay is 0.025 + gate·0.13 s (814), its release R·(0.05 + gate·0.9) (848). → contract
  `arp.length = octaves/steps 1..4` misreads it; the Studio arp has no octave range and no pattern choice. GROOVE 0..1 (play.ts:815,
  core.ts:1470): §2.3.

### 2.2 What a step does
- Roots = arpSet entries whose id has no `~`, **sorted by pitch, ascending** (core.ts:1352): always UP, never press order.
  `arpIdx % roots.length` walks them (1360), carries on across a new note (mod the new length), resets only when nothing is held
  (1383) or on ARP on (929). The grid runs on silently with nothing held, so a first key under ARP waits for the next line
  (≤250 ms at 1/8, 120 bpm).
- A step BOOKS both ends: `pluck(f, vel, lifeMs, when)` → `buildNote(…, when)` starts the oscillators at `when`, and
  `scheduleRelease(when + life)` books the fall (→0.0001, osc.stop at +R+0.12); no setTimeout (core.ts:831-838, 847-859; header
  11-12). A fed sample voice gets `hit(freq, t0, dur, vel)`, a fixed one-shot (856). → the port books `Voice.noteOn(id, midi,
  vel, when)` + `noteOff(id, when + life)`. Single-note vel 0.9 (1360).
- **CHORD + ARP = a strummed BLOCK every step, not arpeggiated triad tones**: every root → `arpChordFn(rootF)` =
  `triadFreqsFromRoot(music, rootF)`, read LIVE (eng/index.ts:238; music.ts:74-79), union deduped within 0.5 Hz, sorted, each at
  clamp(0.92/√n, 0.32, 0.9), 8 ms apart upward, capped at 0.45·step (core.ts:1356-1359). The `~` filter keeps the keyboard's own
  chord extensions from doubling it (1352).
- **MEASURED defect, do not port**: `triadFreqsFromRoot` re-snaps the root, so a COLOUR-ROW key under ARP+CHORD arps the wrong
  chord: C♯ in C major gives a C major block (60 64 67) where plain CHORD plays C♯ major (61 65 68); B♭ in A minor gives Am.
  Fix: carry each held id's triad from press time (play.ts:321's colour rule); never re-derive it from Hz.

### 2.3 GROOVE (G mode, core.ts:1361-1381)
- On when groove > 0 AND an origin exists (1346). The arp then steps EVERY 16th whatever RATE says; RATE only thins or fills:
  arpDiv ≤1 → quarters only; ≥4 → odd 16ths added as ghosts (vel ≤0.3, len ≤0.55); ≥8 → every 16th (1366-1368). Triplet RATEs
  lose their triplets under GROOVE (1.5 and 3 → the straight template; 6 → the ghost fill).
- Tables verbatim: single HITn/SWn/VELn/LENn, chord HITcA/B/C + LEANc/VELc/LENc (1347-1350); chord variant per bar of an 8-bar
  cycle `[A,A,B,A,A,A,B,C][bar % 8]`; r2 = a bar/step hash (1363).
- offMs = (LEANc|SWn)[s]·16th·(0.3+0.7A) + (14 chord | 8 single)·A + (r2−0.5)·12·A, clamped to [now+2 ms, t+0.45·16th]
  (1370-1371); vel ×(1+(vBase−1)A)·(1+hum·0.05A); life = max(34|40 ms, life·(1+(lBase−1)A)) (1372-1375).

### 2.4 HOLD (the latch) and the ARP switch
- No arp: under HOLD a held id's second noteOn RELEASES it (tap-again, core.ts:875); noteOff is a no-op (890); HOLD off frees all (934).
- Arp: noteOn under HOLD toggles the id out of arpSet (872); noteOff drops it from arpSet only without HOLD (889); HOLD off keeps
  only notes still physically down (934). ARP on moves held voices into arpSet (929); ARP off clears arpSet AND held, keys under a
  finger included (930; mirrored play.ts:782-791).
- The facade mirrors this as the SOUNDING set `heldNotes` (eng/index.ts:317-323, 649-689), which the chord screen and the stamp
  read. Rack pads and the wheel audition are chord-MONO under HOLD (chord-rack.ts:147-152; play.ts:716-733); a latched tone is
  released by re-noteOn + noteOff (chord-rack.ts:107).

### 2.5 The gate row (booked beside the arp: contract `Harmony.book`)
- GATE (Z, hold) = `gesture('gate', on, rate)`; RATE detents 1/8 · 1/8T · **1/16** · 1/16T · 1/32 = 2 · 3 · 4 · 6 · 8 per beat
  (play.ts:80-84, 848-851) → contract `GateDiv` keeps 3. Each chop hits the keys amp (after the one low-pass, before drive:
  core.ts:530-532) and the bass gate: 1 → 0.06 in 12 ms, held to 0.55·sd, back to 1 by 0.9·sd (1217). SWING 0..1 alternates
  sd·(1+sw/3) / sd·(1−sw/3), up to 2:1 (1387-1398). A re-press or a RATE turn while held re-anchors (952; play.ts:849). Off =
  cancel-and-hold, τ 0.03 back to 1 (1218-1220). Drums are never gated.
- DIVE (M, hold): every keys oscillator, the bass drone and both sample sinks glide down DIST semitones with τ = SPEED and back
  with τ 0.07 (core.ts:948-976); a voice born mid-dive starts bent (809). Knobs SPEED 0.05–1.5 s (dial inverted: clockwise =
  faster) and DIST 2–36 st, defaults 0.45 s / 24 st (play.ts:866-883; core.ts:1878-1879).

## 3. music.ts: key, scale, octave → pitch (V/engine/music.ts; pure, imports SCALES from dsp.ts)
- `MusicState {keyRoot 0..11, scaleMode 'major'|'minor'|'chrom', octOff, chordMode}` (9-18); octave clamp −3..3 (eng/index.ts:716;
  play.ts:581) → contract `Music.oct −2..2` and `ScaleName 'maj'|'min'` (no FREE; see §6 for what the range costs).
- 12 keys C..B: NOTE_NAMES sharps (dsp.ts:9) for the KEY screen `C MAJ` / `A MIN` / `FREE` (play.ts:611-612); key faces and chord
  labels spell through chord-name's key-signature law instead (play.ts:492-507). Scales: major 0 2 4 5 7 9 11, natural minor
  0 2 3 5 7 8 10 (dsp.ts:96-99); chrom = no snap.
- `baseC = 261.63·2^oct` (20-22) = MIDI 60 + 12·oct; `snapOffset` → nearest scale tone, ties DOWN (24-32); `centeredKey` maps
  keys 7..11 to −5..−1 so key travel is the shortest move (34-44); `freqForOffset` (46-48); `stepOffset` = N diatonic degrees
  (51-64); `triadOffsets` = diatonic triad, chrom → major (67-70); `triadFreqsFromRoot` = its inverse for the arp (74-79).
- The letters: whites A S D F G H J K L = offsets 0 2 4 5 7 9 11 12 14, which snap to scale degrees 1–9 of any key and mode
  (A = the tonic); blacks W E T Y U O = 1 3 6 8 10 13 (play.ts:49-55). In a key the black row is the **COLOUR ROW**: the five
  pitch classes the scale lacks, in order, the sixth cap = the first +12, chromatic (no snap) (play.ts:416-433); in FREE it is the
  plain chromatic row. The port's `midiForOffset` = 60 + 12·oct + snap(off) + centeredKey(key) (colour row: off unsnapped),
  since the contract's voices take MIDI, not Hz.
- CHORD on a letter adds ids `k<q>~0`, `k<q>~1` = its diatonic triad; on a colour key a plain major triad (play.ts:317-323). Stage
  keys outside the bracket play `p<midi>`, never chorded (play.ts:352-358).

## 4. The key table (inst/index.ts:426-493; the shell's Escape; play.ts)
| key (Studio match) | action | engine / view call | lines |
|---|---|---|---|
| A S D F G H J K L (`e.key`) | note: scale degrees 1–9 (§3) | `play.keyDown(q)` → `noteOn('k'+q, freqForOffset)` (+ `~0 ~1` under CHORD) | inst/index.ts:474-477; play.ts:292-330 |
| W E T Y U O (`e.key`) | COLOUR ROW in a key; chromatic 1 3 6 8 10 13 in FREE | same, `colorFreq` | play.ts:53-55, 416-433 |
| same letters, keyup | release (a no-op under HOLD) | `play.keyUp` → `noteOff` | inst/index.ts:486-487; play.ts:331-345 |
| Digit1–8 | pad: play · stamp what sounds (empty pad) · open the key wheel (empty + silent); keyup releases a gated pad | `chordRack.trigger(i, false)` / `release(i)` | inst/index.ts:452, 485; chord-rack.ts:207-230 |
| ⇧ + Digit1–8 | clear that pad (inert on an empty one) | `trigger(i, true)` | same |
| ShiftLeft/Right | stamped pads show a drawn ✕ while held | `chordRack.setShift` | inst/index.ts:429, 483 |
| Space | drums on/off | `rhythm.toggleBeat` → `setBeat` | inst/index.ts:440 |
| KeyB | bass on/off | `bass.toggleBass` | inst/index.ts:445 |
| KeyN | bass ROOT-LOCK | `bass.toggleRootLock` | inst/index.ts:455 |
| Equal `=` | TAP tempo | `timeStrip.tapTempo` | inst/index.ts:464 |
| ArrowLeft/Right | a chord sounding → diatonic transpose ±1 (screen reads MOVE, clamp ±14, retune in place); else octave ±1; in EDIT walk the voicing | `play.arrow` / `chordRack.walkVoicing` | inst/index.ts:470-472; play.ts:197-210, 380-393, 589 |
| ArrowUp/Down | cycle the KEYS saved voice (↑ = −1); in EDIT step the pad a degree | `cycleKeysVoice` / `stepDegree` | inst/index.ts:432-436 |
| KeyZ (hold) | GATE (§2.5) | `eng.gesture('gate', on, rate)` | inst/index.ts:473, 484; play.ts:75-84, 827-835 |
| KeyM (hold) | DIVE (§2.5) | `eng.gesture('dive', on)` | same |
| Escape | master stop (the shell's own listener, registered first, only while the room is live, does NOT stop propagation) + close the wheel / leave EDIT | `silenceAll` → every silencer; `exitEdit`, `play.escape` | V/shell/index.ts:660-677; inst/index.ts:438 |
| window blur | release every note, gesture, pad | `onBlur` | inst/index.ts:490 |
- **Pointer-only in the Studio**: CHORD, HOLD, ARPEGGIATOR (play.ts:772-791), every knob, the KEY wheel. Space is drums on the
  signal page and the master stop elsewhere (V/shell/index.ts:667).
- **Free keys**: Q R I P X C V · Digit0 Digit9 · Minus Backquote BracketLeft/Right Backslash Semicolon Quote Comma Period Slash ·
  Tab Enter Backspace (Digit3 and KeyI freed in W13, inst/index.ts:456-457; X and C freed when the Z/X/C gate pads became Z,
  play.ts:73-78).
- **Guards**: `owns()` = visible ∧ focused (pointer last landed in the instrument, default true) ∧ no text field / select /
  contenteditable ∧ no overlay ∧ no ⌘/ctrl/alt (inst/index.ts:346-372, 375-386, 408-413); every owned key is swallowed even when
  unmapped, Space and arrows preventDefault (479-480); `!e.repeat` on every toggle; keyup releases what `ourDown` holds even after
  focus moved (482-489).
- **Defect, do not port**: notes match `e.key.toLowerCase()` on down AND up (475, 486) while everything else matches `e.code`; an
  ⌥ pressed under a held note turns keyup's key into `å` and the note sticks until blur. The contract's e.code table, releasing
  by the code recorded at keydown, fixes it and keeps the printed letters physical on AZERTY / Dvorak.
- → contract `KeyAction`: (a) lacks `tap` (=), `lock` (N), `voice` (↑/↓) and pad-clear (⇧): add them or drop them on purpose;
  (b) has hold/chord/arp keys the Studio never had: proposal **X = HOLD, C = CHORD, V = ARP**, on the bottom row beside Z GATE,
  B BASS, N LOCK, M DIVE (all free; never Q R I P, which sit between note keys); (c) `oct` as a literal octave matches the
  on-screen ◀▶, which R13c made literal (play.ts:590-600); the contextual MOVE transpose can wait for the feel round.

## 5. The chord machine
### 5.1 The naming law (V/engine/chord-name.ts; zero imports → VERBATIM)
- API: `nameChord(midi: number[], ctx: {keyRoot, scaleMode: 'major'|'minor'|'chrom'}): {label, root, quality, bassPc, degree}`
  (17-34, 183-257) and `spellPitchClass(pc, ctx)` (57). There is no `name(notes, key?)`: the contract's `name(n)` =
  `nameChord(n, ctx).label`, `degree(n)` = `.degree`, with maj→major, min→minor.
- Law: dedupe to pitch classes, the LOWEST MIDI note is the bass; 0 notes → `''`; 1 → the note name; else an exact interval-set
  match over 18 qualities (89-108) with every pc tried as root, scored key-first (tonic +1000, diatonic +100, bass = root +10;
  chrom: bass = root +1000) (165-178); a power chord only with the root in the bass (204-205); the slash bass spelled from the
  root's letter (76-83); 2 notes, no chord → an honest dyad `C+M3` (230-235); ≥3 → the nearest triad stem, else a cluster `C·`
  (237-257). Spelling: key signature (flat majors F B♭ E♭ A♭ D♭ G♭; a minor uses its relative major), FREE = fifths-nearest
  (37-63). The degree is a roman numeral only when every pc is diatonic and the root sits on a degree, cased and decorated by
  quality (vi, V7, ii°, viiø7); null IS the off-map signal (142-161).
- The CHORD SCREEN names `held()` as nearest-MIDI after a 90 ms settle, blink-guarded 150 ms, and holds the last name DIM on
  silence (play.ts:513-563).

### 5.2 The rack (chord-rack.ts: 8 pads; view code around a small model)
- `trigger(slot, shift)` (207-230): leaves EDIT first (a tap on the edited pad just finishes); ⇧ clears an occupied pad; occupied
  → `playPad`; empty + something sounding → `stamp`; empty + silent → `onEmptyTap` (opens the wheel).
- `stamp` (168-186): `held()` → nearest-MIDI set, sorted; vels all 1 (176); label by `nameChord`; `capturedKey`; persist; then
  `onCapture` → `play.flushLatch` releases everything latched except keys under a finger, so the next stamp is not a merge
  (play.ts:258-276).
- `playPad` (141-157): ids `c<slot>.<i>` (no `~`, so ARP arpeggiates a pad, core.ts:1352), vel clamp(vel·0.9, 0.05, 1) (94-97);
  under HOLD chord-mono (the previous pad released, the same pad re-struck), else gated until release (159-166); `onFocusNotes` →
  `jumpToCover` octave-jumps the window to reach the top note unless a key is down (play.ts:278-290); `syncBassRoot` pins the
  bass to the chord's ROOT, not its lowest note, and never over a manual pin (114-138).
- Face: the degree chip = `nameChord(...).degree` re-derived against the live key on every paint (234-244). LEAN: the other
  pads' `--lean` = `nextWeight(degree of the last-lit pad → theirs)` (chord-gravity.ts:46-54; chord-rack.ts:252-268).
  key-relations.ts feeds only the KEY wheel (FIFTHS, chordAt, wedgeChords, dimSatellite), not the chips.
- Edit: the M2b cluster is gone (R7b, 76-81; `editPad` 274 is dead code, `syncCluster` a stub 272). What lives: drag a pad
  vertically = voicing walk `voiceUp`/`voiceDown` per 24 px (382, 387-398); sideways = move to an EMPTY pad, ⌥ = duplicate
  (400-418); dblclick = EDIT: the keyboard toggles notes (`toggleNote` keeps ≥1, 336-341), ↑/↓ `stepDiatonic`, ←/→ walk,
  Esc/tap exits (301-323, 452, 490-491).
- Store (chord-rack-store.ts): IndexedDB `signal-studio-chordrack` v1, store `racks`, keyPath `projectId`, ONE row `{projectId:
  'global', slots: (RackPad|null)×8, savedAt}`, `RackPad = {notes: int[], vels: number[], label, capturedKey: {keyRoot,
  scaleMode}}` (19-35, 54-76); writes debounced 200 ms, serialized, flushed on dispose (chord-rack.ts:347-363; store 172-207).
  The per-day legacy adoption (99-123, 177-198) and the `idb` dynamic import (66-75) are Studio history. Contract `rack:
  Array<number[]|null>` is lossless in practice (vels always 1, labels re-derived, capturedKey never read); keep `normalize()`
  (78-92) as the loader's guard.

## 6. The keybed (V/views/instrument/stage-geometry.ts; zero imports → VERBATIM, retarget the range)
- `STAGE_LO 24` (C1) · `STAGE_HI 96` (C7) (15-16); `WHITES` 43 / `BLACKS` (25-36); `WHITE_W = 100/43 = 2.3256 %`, `BLACK_W =
  0.62·WHITE_W = 1.4419 %` (38-42). `keyBox`: white left = i·WHITE_W; every black CENTRED on the seam above its lower white,
  (below+1)·WHITE_W − BLACK_W/2 (53-63; a real keyboard offsets C♯/D♯, so this is a look choice); `keyCentre`, `spanOf` (clamped,
  ≥0.4 %), `midiAtPct` (65-92). Its test pins 43 whites (stage-geometry.test.mjs:8); retarget it with the range.
- Letters print on the keys the window drives (`.si-ql`, play.ts:450-470); the bracket = `spanOf(qwertyNotes)`
  (keybed-locator.ts:41-48); dragging or clicking the rail octave-jumps through `setOct` (54-72). View: rewrite in a few lines.
- **MEASURED range** (12 keys × maj/min, colour row included): window MIDI per octave −3 19..44 · −2 31..56 · −1 43..68 · 0 55..80
  · +1 67..92 · +2 79..104. The anatomy's C2–C6 (36..84, 29 whites, 38.6 px at 1120) holds the whole window only at oct −1..0;
  C2–C7 (36 whites, 31 px) holds −1..+1; C1–C7 (43, 26 px) holds −2..+1. Contract oct −2..2 overshoots all three: take oct −1..+1
  on C2–C7, or keep C2–C6 and accept unlit letters at +1 (`inStage` drops them, stage-geometry.ts:13).

## 7. Port list
| target | source | verdict | notes |
|---|---|---|---|
| `src/signal/grid.ts` | P/grid.ts:1-134 | verbatim + `lineFrame`/`linesIn` | drop `toCycleGrid`; BPM_LO/HI → 60/180 |
| `src/signal/lookahead.ts` | V/engine/lookahead.ts:1-206 | verbatim | with lookahead(-review).test.mjs |
| `src/signal/time.ts` | new: P/click.ts:86-199 tick/stop · P/time.ts:292-328 retime/tap · core.ts:1271-1275, 1436-1441 | rewrite | §1.3 API; one mode; tracked bookings |
| `src/signal/music.ts` | V/engine/music.ts:1-79 · dsp.ts:9, 96-99 · play.ts:49-55, 416-433 | adapt | inline SCALES; add `midiForOffset`, `colourRow`, the letter offsets; oct clamp; maj/min map |
| `src/signal/arp.ts` | core.ts:847-935 held/latch/arpSet, 1344-1386 arp, 948-976 + 1217-1220 + 1387-1398 gate/dive | adapt (pure) | tables verbatim; book on the lattice; triads from press time (§2.2) |
| `src/signal/chord-name.ts` | V/engine/chord-name.ts | verbatim | 80-case suite comes along |
| `src/signal/chord-edit.ts` | V/engine/chord-edit.ts | verbatim | voiceUp/Down, stepDiatonic, voiceLed; recolor/reext unused |
| `src/signal/chord-gravity.ts` | V/views/instrument/chord-gravity.ts | verbatim | nextWeight, degreeOf (the lean) |
| `src/signal/chords.ts` | chord-rack.ts:94-230, 347-370 · play.ts:258-290, 513-563 | rewrite | a DOM-free rack model (trigger/stamp/play/release/clear, mono latch, bass root pin) + the settle law |
| `src/signal/stage-geometry.ts` | V/views/instrument/stage-geometry.ts | verbatim | STAGE_LO/HI per §6 |
| `src/signal/keymap.ts` | inst/index.ts:346-493 · play.ts:49-55, 75-84 | rewrite | e.code table, `ourDown` by code, blur release, owns() without the overlay/bench parts |
- **Cut**: key-wheel.ts (498) + chord-shop.ts (388) + key-relations.ts until a wheel returns · engine/keyboard.ts · keybed-locator.ts
  (rewrite) · the store's adoption + `idb` · time-strip.ts · P/notelog.ts · P/time.ts's modes/handover · `editPad` · offline paths.
