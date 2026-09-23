# B · THE BASS — the Studio's bass, mapped for `src/signal/bass.ts`

Paths: **C** = signal-studio-v6lib/src/engine/core.ts (v6-library 2a9e4a7) · **F** = …/src/engine/index.ts · **D** = …/src/engine/dsp.ts ·
**BD** = …/src/engine/bass-determinism.ts · **V** = …/src/views/instrument/bass.ts · **P** = …/src/views/instrument/bass-pattern.ts ·
**S** = …/src/views/instrument/styles/bass.ts · **I** = …/src/views/instrument/index.ts · **R** = …/src/views/instrument/chord-rack.ts ·
**PL** = …/src/views/instrument/play.ts · **DOC** = ~/signal-studio-ideation/bass-reapproach.md · **PG** = signal-studio-page/src/page/
(branch page, 67b6b58) · **T** = jt-portfolio-signal/src/signal/types.ts. "(calc)" = computed in node from the cited formulas; nothing
here was measured in a browser.

## 0 · Which implementation to port
- ONE implementation exists: the synth in C. PG has no bass voice; its "bass" is hardware (MODX / Bass Station) read back as harmony
  analysis (PG notes-harmony.ts:1-14, PG record.ts:171). Port C's synth path. No bass rip exists (NOTES-SIGNAL-R0.md §4), so
  everything behind `bassSink` is inert and is cut.
- Reuse three PG shapes, not C's machinery: PG grid.ts:24-56 (the integer-frame lattice) replaces C's `gridNext`/`transport0`
  (C:1271-1275); PG stop.ts:43-49 (the silencer registry) is where `bass.stop()` hangs; PG filter.ts:39-100 (the one low-pass:
  dB-correct Butterworth Qs, a true bypass at p ≥ 0.995, PG types.ts:61-63) is the candidate for T's single `tone` (§7, §10).

## 1 · The graph (synth path; C builds all of it at construction)
```
PLUCK/SEQ, per note: 4×[osc→gain(role)] → f1 LP (Q 6+8·heat dB) → f2 LP (Q −6.02) → env ──┐   C:1695-1706, 1730-1740
DRONE:               4×[osc→gain(role)] → droneGain (0 → 0.2, τ 0.25 s) ──────────────────┤   C:1767-1774
                                                                                            ▼
bassSynthGain 1 → bassDrive (WaveShaper 2×) → bassLP (Q 0.7 dB, detune ← LFO) → bassLP2 (Q −6.02) → bassOut 0.8
  → bassHP (Q = bassHpRes) → HP2..4 (Q −3.01) → bassEqLP (Q = bassRes) → EqLP2..4 (Q −3.01)
  → bassGate (GATE chop) → bassGainNode (gain × (1−mute)) → bassBus (solo) → duck (kick sidechain) → preLimit
bassBus → exDrive → exShaper (driveCurve(0.5), 4×) → exHP 140 Hz (Q −3.01) → exGain (SUB upper half) → duck
```
- C:1487-1506 (head, drive, LP pair, LFO) · C:1548-1562 (out, EQ, low-cut) · C:1576-1584 (wiring, gate, gain, bus → duck) ·
  C:1647-1653 (exciter) · C:387-400 (gain node) · C:369, 608 (duck → preLimit). The bass has NO delay/reverb send: bassBus goes
  only to `duck` (C:1584); E0 took it off the keys glue (C:1581-1583).
- Every Q is the Web Audio corner Q, read in dB. The odd values (0.7, 6..14, −6.02) are the shipped voicing, left on purpose by W58
  (C:1494-1498, 1503, 1726-1731). Port the numbers as written.

## 2 · The 303 CLASSIC voice — `bassHit` (PLUCK and SEQ)
- Oscillators: `BASS_OSCS` = saw ×1 −11¢ · saw ×1 +11¢ · square ×1 · sine ×0.5 (the sub, an octave down) (C:1654). Levels
  `bassOscGain`: saw = bassSaw(heat), square = ½·bassSaw(heat), sub = bassSine(weight) (C:1655; laws C:1491-1492). CLASSIC is the
  only CHAR that shipped (DOC:410); per-note oscillators draw no rng (C:1691-1694).
- Pitch: base = bassTarget, × 2^(diveCents/1200) while DIVE is held, × 0.5 on a `sub` cell (C:1741). Start t, stop t+len+0.04 (C:1704).
- Length: len = min(clamp(0.45·beat, 0.12, 0.4), sixteenth·bassPulseSteps·0.9) (C:1715) → 225 ms at 120 bpm, 281 ms at 96 (calc).
- Level: vel = VEL_PEAK {1: .35, 2: .75, 3: 1.0} (C:1665); a PLUCK hit carries no step → vel 1 (C:1716); peak = vel·(accent ?
  accentScale : 1)·0.5 (C:1716); accentScale 1, its setter clamps 0..1.6 (C:1664, 1832).
- Amp env: 0.0001 at t → exp to max(0.02, peak) at t+atk → exp to 0.012·max(vel, 0.4) at t+len → linear to 0 at t+len+0.02
  (C:1721-1724); atk 6 ms accent / 45 ms slid / 14 ms plain (C:1720). No sustain: every hit is a pluck.
- Per-note filter pair, fresh per note so it never races the shared bassLP automation (C:1708-1710): f1 LP Q 6+8·heat, f2 LP
  Q −6.02 (C:1730-1731). Both: baseCut at t → linear to min(baseCut+envMod, 7000) at t+3 ms → setTarget back to baseCut, τ decayTau
  (C:1735-1739). baseCut = bassLPf(heat) (C:1732). envMod = (700+2600·heat)·(1.6 if accent)·(0.5 if slide)·moveEnvScale (C:1733);
  moveEnvScale = 0.6+0.9·pluck in PLUCK/SEQ (C:1547); decayTau = 0.06+0.34·(1−pluck) s (C:1734).
- At the view's boot values (heat .5, pluck .18): cutoff 640 Hz, sweep peak 2164 Hz plain / 3078 accent / 1402 slid, fall τ 339 ms (calc).
- Accent = v 3 only (C:1713): 6 ms attack and ×1.6 squelch; its loudness comes from VEL_PEAK alone while accentScale is 1.
- Slide (C:1742-1746): a slid cell after any earlier hit (lastBase > 0) ramps each osc LINEARLY from lastBase·mul to its target over
  clamp(bassGlideStore, 0.02, min(0.12, 0.6·len)) (C:1744, 1700); lastBase = this hit's base and is never reset (C:1656, 1746).
  A scoop, not legato: the previous note still ends at t+len+0.02 (C:1724); DOC's "extend the previous note's release" (DOC:192)
  never shipped.
- Cleanup: the first osc's `onended` disconnects f1, f2, env (C:1757). `counts.b++` per hit (C:1712).

| heat | bassLPf Hz | drive a (k = 55a) | saw level | f1 Q dB | envMod Hz |
|---|---|---|---|---|---|
| 0 | 260 | .30 | .07 | 6 | 700 |
| .25 | 450 | .20 | .125 | 8 | 1350 |
| .5 | 640 | .10 | .18 | 10 | 2000 |
| .75 | 2120 | .36 | .34 | 12 | 2650 |
| 1 | 3600 | .62 | .50 | 14 | 3300 |

Heat laws (C:1489-1492, 1730, 1733; calc); the drive is piecewise with its minimum at the .5 detent (C:1490; driveCurve D:115-124).
SUB: bassSine = 0.45+0.75·w (.825 at .5); exciter gain = clamp((w−.4)/.6)·0.5 (.083 at .5) (C:1492, 1811).

## 3 · The DRONE voice
- `droneOn`: the same four oscs at bassTarget·mul, each saw detuned ±11¢ + rng.range(−3, 3)¢ (C:1770-1771), levels bassOscGain
  (C:1772), into droneGain 0 → DRONE_LV 0.2, τ 0.25 s (C:1660, 1768, 1774).
- It sounds whenever the bass is ON in DRONE, keys or no keys: `bassSteady()` is a constant (C:1662) and `bassVoiced` (C:1661) is
  dead code. Held keys only steer its pitch: each `recomputeBass` glides all four oscs, setTargetAtTime(bassTarget·mul, now,
  bassGlideTau) (C:1676).
- Tone: the shared pair at bassLPf(heat) (C:1523-1530); bassLP.Q 0.7+1.3·pluck dB and an LFO on bassLP.detune, depth pluck²·750¢
  at tempo/60 Hz = one cycle per beat (C:1511, 1513) → at boot (pluck .18): 24¢, Q 0.93 (calc).
- Release, `droneOff`: droneGain → 0, τ 0.12 s; the oscs are stopped by a 500 ms setTimeout (C:1780-1786).

## 4 · The three modes — the held note vs the root
| | DRONE | PLUCK | SEQ |
|---|---|---|---|
| sounds | the 4-osc pad, continuous (C:1767-1774) | `bassHit(t)` every pulse: vel 1, no accent/slide/sub (C:1763-1765) | `bassSeqFire`: cells with v > 0 → `bassHit(v, oct, slide)` (C:1759-1762) |
| pitch | bassTarget, gliding live (C:1676) | bassTarget, read when the hit is BOOKED | bassTarget, ×0.5 on sub cells (C:1741) |
| clock | none; the clock may stop (C:1845) | the pulse grid (§5) | the pulse grid (§5) |
| shared LP pair | at bassLPf(heat) (C:1527) | opened to 16 kHz; the per-note pair squelches (C:1527) | as PLUCK |
| pluck (MOVE) | LFO wobble + Q (C:1511) | env depth + fall (C:1547, 1734); LFO zeroed (C:1512) | as PLUCK |
| GLIDE | the drone's pitch-glide τ (C:1819-1822) | the slide time (C:1744) | as PLUCK |
- Target resolution is the same in all three (§6): pinned root > lowest held > last note. PLUCK = root-only repeats by decision (DOC:409).
- `setBassMode` aliases 'off'/'snap' → drone with τ 8 ms and 'glide' → drone with the stored τ (C:1839-1840); it re-seats the pulse
  (offBassStep 0, gridNext) (C:1846) but never calls applyBassMove, so a DRONE LFO stays on bassLP.detune until the next apply()
  (C:1843; apply runs on every noteOn, C:732, 876). Inaudible with the pair at 16 kHz; the port applies it on mode change.

## 5 · bassSeq and time
- Cell: `0 | { v: 1..3, oct: 'base' | 'sub', slide? }` (C:1663; P:8); setBassStep writes 0..15 (C:1830). The engine's own default
  (0: v3; 4, 8, 12: v2) (C:1663) is overwritten at boot by the view's regenerate (V:123-128, 207).
- Rate: bassRate idx 0..3 → bassPulseSteps = PULSE_MULT[idx] = 4 | 3 | 2 | 1 sixteenths = 1/4 · dotted 1/8 · 1/8 · 1/16 (C:1666,
  1814), default 2 (C:1659). bassSeqMult ∈ {0.5, 1, 2}, anything else → 1 (C:1831). A pulse every eff = max(1, round(pulseSteps /
  mult)) sixteenths (C:1338, 1400). The shipped view writes neither: no control exists, and the dice that rolled them (F:491) lost its
  die in W30 (I:242-246) → eff = 2 unless an old save restores other values (F:387).
- Time, drums on: per drum sixteenth, if drumStep % eff == 0 → bassPulseFire(floor(drumStep/eff), t) at the UNSWUNG step time
  (C:1302, 1337-1340); swing and humanize (`tt`) belong to snare/hats (C:1303-1304). The bass is straight, like the kick.
- Time, drums off: a self-clock at interval sixteenth·eff from nextBassPulseT = gridNext(sixteenth·pulseSteps), with its own index
  offBassStep from 0 (C:1399-1410, 1795, 1846), fast-forwarded when stale (C:1405-1408). `wantsClock` counts a PLUCK/SEQ bass
  (C:1441): a lone bassline keeps the transport running.
- SEQ plays bassSeq[idx mod 16] (C:1760). ⇒ at eff 2 one cell is an 8th: the 16-cell strip is a TWO-BAR loop (the drum strip is
  one bar), and P's "quarter-note downbeat" `i % 4 == 0` (P:33) falls on half notes.
- Phase: the self-clock's cell 0 lands wherever gridNext lands, not on a bar line (C:1271-1275), and turning the drums on re-indexes
  from transport0 (C:1445), so step 0 can jump when the beat toggles. One lattice index (§10) removes both.
- Generator (P: pure, zero imports; its node test passes 16/16): hits = max(1, round(1+15·density)) spread by `((i·h) % 16) < h`,
  step 0 forced (P:14-28); v 3 on i%4==0 else 2 (P:34); groove > .35 → odd steps v1 (P:35); groove > .65 → beats off i%8==0 drop to
  v2 (P:36); groove > .5 → a non-beat step after an active one slides (P:38); groove > .75 → i%8==4 goes `sub` (P:39).
  Boot (.5, .3) = `3 . 2 . 3 . 2 . 3 2 . 2 . 2 . 2`: 9 notes, no ghost, slide or sub (calc).
- The view regenerates all 16 cells on every DENSITY/GROOVE move and sets bassPluck = 0.6·groove (V:124-128); clicking a bar nudges
  v 0→1→2→3→0, keeping oct/slide, until the next knob turn (V:129-136). No hand control for slide or sub. This inline strip
  supersedes DOC's popover grid (DOC:412; V:1-13).
- Strip grammar, lit only when it sounds: the pattern area is `.idle` (opacity .12, desaturated, no pointer) unless mode = SEQ
  (V:161-164, S:34); a bar is `.on` only when v > 0, height = velocity 7/32/64/100 % (V:46, 113-121, S:40), accent brighter (S:41),
  an under-tick every 4th bar (V:108, S:43), slide = a small → over the bar (S:45); bass OFF with SEQ selected recedes to .5 (S:35);
  an unpowered instrument keeps the heights and drops the glow (S:47-48). `.sub` is toggled (V:119) but has no style: a sub cell is
  invisible. No playhead on the bass strip (the view's only rAF paints the pitch chip, V:197-205).

## 6 · Pitch: follow, fold, ROOT-LOCK, ownership
- `recomputeBass(onset)` (C:1671-1686): candidates = the arp pool while the arp runs, else every held or latched key (C:1672).
  Pinned → foldBass(bassRoot) (C:1673); else foldBass(min(candidates)), the LOWEST held note, and if armed and this call is an
  onset, bassRoot = min(candidates) and disarm (C:1674); else foldBass(lastNoteF) (C:1675).
- Onsets: noteOn → recomputeBass(true) (C:873, 877); releases, latch/arp toggles and ←/→ retune → recomputeBass() (C:872, 875, 889,
  891, 929-934, 1941). Under HOLD a noteOff is a no-op, so the bass stays on the lowest latched key (C:890).
- lastNoteF is the last noteOn, not the last lowest (C:870). CHORD mode sends the root, then the 3rd and 5th (PL:316-323), so once
  a chord key is released an unlocked bass falls to the chord's FIFTH (read from the code, not heard).
- foldBass: halve, then ÷2 while > 115 Hz, ×2 while < 45 Hz (C:1657) → 45-115 Hz (MIDI ≈ 29.5-45.8). Every C lands on 65.41 Hz =
  MIDI 36, printed `C1` by the Studio's note names (C3 = 60, src/voices/note-name.ts:11-12; the chip in studio-1440.png). The window
  is wider than an octave, so A lands on 55 or 110 Hz depending on the octave played (calc).
- ROOT-LOCK API: setBassRoot(f): f > 0 pins and disarms; null unpins and leaves `armed` alone (C:1689). armBassLock(on) sets armed
  and calls recomputeBass(on), so arming with keys down pins the lowest at once (C:1690).
- The view's toggle: pinned or armed → unpin + disarm; else arm (V:174-181); key N (I:455). The padlock is lit while armed or
  pinned and pulses while armed (V:192-193, S:24-27); the chip = noteName(bassFreq), lit only when pinned (V:186-194, S:29-30).
- The chord rack pins too (R14a, R:109-138): playing a pad sets bassRoot to the chord's named root at or just below its lowest
  note, so an inversion keeps its root in the bass; silence unpins; it never overrides a manual pin or an armed capture (`ourPin`,
  R:124-127, 137). This is part of the chord machine as shipped.
- Keyboard mode / ownership law (W15/W16) is SINK-ONLY. A mounted bass sample has three claimants: per-key voices, `'__drone'`,
  pattern hits. Module OFF → the keyboard owns it (per-key noteOn/noteOff, arp plucks via `hit`) (C:860, 885, 893). Module ON, not
  soloed → the mode owns it: DRONE `'__drone'` (C:1778), PLUCK/SEQ bassHit's `sink.hit` (C:1752-1755). Module ON and SOLOED →
  keyboard mode (C:908): the drone voice released, pattern hits paused, per-key voices started (C:909-925); power flips and solo
  flips hand over (C:1787-1801, 1977-1991). The synth never obeys this law: with no sink, bass OFF is silence and the keyboard
  only steers pitch. No bass rip ships, so the whole law is cut.

## 7 · Tone EQ, and which knob sets what
- Tone chain after bassOut (C:1549-1575, 1580): ① low-cut = bassHP at xToF(bassHpFreq) (20 Hz-20 kHz log, D:174-178), Q =
  bassHpRes, + HP2..4 engaged by bassHpSlope via hpCascadeCorner (all at 10 Hz while open) (C:1558-1562, 1567; D:197-201).
  ② low-pass = bassEqLP at xToF(bassCut), Q = bassRes, + EqLP2..4 (Q −3.01) via lpCascadeCorner (at 20 kHz while the cut is open)
  (C:1552-1556, 1570-1574; D:205-208).
- The glass's node Y is ±dB (−24..+18, src/views/instrument/filter-curve.ts:52), mapped through nodeQ (D:219) before it reaches
  bassRes/bassHpRes (V:93, 95); the engine clamps res to −50..40 and x to 0..1 (C:1899-1904). Double-tap resets a node;
  Shift-drag on ② = the slope (V:92, 96).

| control | param | law / default | where |
|---|---|---|---|
| INTENSITY | bassSlope (② roll-off, 1→4 poles) | direct 0..1, default 1 | V:146-148; C:1901; C:86-88 |
| SUB | bassWeight | sub 0.45+0.75·w; exciter above .4; default .5 | V:151-152; C:1807-1812 |
| GLIDE | bassGlide τ | 0.008+0.292·v s (8-300 ms), label in ms | V:27-30, 153-154; C:1815-1829 |
| GROOVE | bassPluck (= 0.6·groove) + the pattern | default .3 → pluck .18 | V:126, 142-143 |
| DENSITY | the pattern only | default .5 | V:139-140 |
| tone node ② | bassCut, bassRes | open (1, 0) | V:95 |
| tone node ① | bassHpFreq, bassHpRes (+ Slope on Shift) | open (0, 0, 1) | V:93-94 |
| (none) | bassHeat | stays .5 (dice or an old save only; the die is unmounted) | F:387, 489; I:242-246 |
| (none) | bassRate · bassSeqMult · accent | stay 2 · 1 · 1 | C:1659, 1664 |
- INTENSITY is inert at the default open tone: with bassCut 1 the slope poles sit at 20 kHz whatever the slope (D:205-208,
  C:1571). DOC made INTENSITY the heat macro, "the single more-acid axis" (DOC:60, 222); W20 #5 re-bound it to the EQ slope
  (C:86-88). MOVE left the view, folded into GROOVE (V:10, 126).

## 8 · Every default
- fx (C:249-252): bass false · bassHeat .5 · bassWeight .5 · bassPluck 0 · bassCut 1 · bassRes 0 · bassSlope 1 · bassHpFreq 0 ·
  bassHpRes 0 · bassHpSlope 1 · tempo 96 · bassGain 1 · bassMute 0.
- locals (C:1656-1670): bassTarget 65.4 · lastNoteF 261.63 · lastBase 0 · bassMode 'drone' · bassGlideTau .008 · bassPulseSteps 2 ·
  bassGlideStore .12 · DRONE_LV .2 · bassSeqMult 1 · accentScale 1 · VEL_PEAK · PULSE_MULT [4, 3, 2, 1] · bassRoot null · armed false.
- nodes: bassSynthGain 1 (C:1487) · drive driveCurve(0.1), 2× (C:1488, 1493) · bassLP 640 Hz, Q .7 (C:1499) · bassLP2 640, Q −6.02
  (C:1503) · LFO at 2·tempo/60 until the first apply, then tempo/60, depth 0 (C:1504-1506, 1513) · bassOut .8 (C:1548) · bassEqLP
  20 kHz, Q 0 · slope poles 20 kHz / 20 Hz, Q −3.01 (C:1552-1561) · bassGate 1 (C:1576) · exShaper 4×, exHP 140 Hz, exGain 0
  (C:1647-1650).
- view: density .5 · groove .3 (V:102) → bassPluck .18 written at boot (V:126, 207) · INTENSITY 1 (V:147) · SUB .5 (V:151) ·
  GLIDE dial default 0 (V:153), but the first sync paints vFromTau(.12) = .384 (V:221; the getter returns bassGlideStore, C:2011)
  while the drone's live glide stays 8 ms until a mode press or a GLIDE move (C:1659, 1840) · mode drone (V:157) · tone nodes open
  (V:88) · sync's bassSlope fallback .5 (V:217) disagrees with W24's 1.
- Boot sound with the bass switched on (B, I:445): a DRONE on 65.41 Hz ("C1") with no key down (C:1656, 1767). T's bpm default is
  120 (T:31); C's is 96 (C:250).

## 9 · What the bass touches outside itself (T's `Bass` has no door for most of it)
- GATE: every gate step chops bassGate along with the keys (C:1395; gateChop C:1217); releaseGate restores it (C:1218-1220).
- DIVE: the drone's detune glides by diveCents (−2400¢, τ .45 s on / .07 s off) (C:949, 969-973); hits booked during a dive start
  pre-dived (C:1741); a hit already sounding does not dive.
- Duck: bassBus feeds `duck`, the kick sidechain shared with the keys (C:1584, 608); duckHit skips while soloed or with drums muted
  (C:1201-1209).
- Gain/mute: gain 0..1.25 × (1 − mute), τ 20 ms (C:389-400). Solo zeroes the other buses (C:1977-1990).
- Master stop: the Studio's Escape runs instrument.silence() → setBass(false) (I:559-568): droneOff (τ .12 s) and the clock stops;
  hits booked inside the look-ahead (≥ 0.1 s, src/engine/lookahead.ts:34) ring out up to len+0.04 s. Root, lock, pattern and knobs
  survive. kill() (C:1956-1967) also clears root and armed, but it is not the master stop. T wants ≤ 30 ms.
- Save/restore: scalars in order (bassGlide before bassMode) → the 16 steps → setBassRoot → armBassLock → apply → setBass
  (F:383-424); snapshot fields F:52-57, 359-364. DENSITY/GROOVE live only in the view (V:102) and are never saved, so a restore
  repaints them at .5/.3 over a restored pattern.

## 10 · Port list for `src/signal/bass.ts`
VERBATIM (copy; name the source lines in the file header):
- P whole (euclid, generateBassPattern) + its node test → `src/signal/bass-pattern.ts`.
- Laws C:1489-1492 · BASS_OSCS + bassOscGain C:1654-1655 · foldBass C:1657 · VEL_PEAK, PULSE_MULT C:1665-1666 · moveEnvScale
  C:1547 · voiceOscs C:1695-1706 (drop `_bd`) · bassHit C:1711-1746 + 1757 (drop 1747-1755) · bassSeqFire/bassPulseFire
  C:1759-1766 · droneOn/droneOff C:1767-1786 (drop 1778, 1781; rng → any uniform ±3¢) · applyBassMove C:1507-1514 ·
  applyBassFilter's synth branch C:1527 · the drive law's synth branch C:1542 · the exciter C:1647-1653 · setBassHeat/Weight/
  Pluck/Glide C:1802-1829 (drop 1824-1827) · setBassMode C:1836-1848 · recomputeBass/setBassRoot/armBassLock C:1671-1690
  (drop 1677-1685) · driveCurve D:115-124 · xToF D:174-178 · the cascade laws D:197-208 and nodeQ D:219 if the Studio EQ stays.
  Every Q number exactly as written.
ADAPT:
- Scheduling → `book(b)`: n = b.bar·16 + b.step; eff = max(1, round(pulseSteps/mult)) = 2; if n % eff == 0 → SEQ cell (n/eff) mod
  16, or a PLUCK hit, at b.frame / sr, unswung. Replaces C:1337-1340, 1399-1410, gridNext, nextBassPulseT, offBassStep. The
  Timekeeper must run while the bass is on in PLUCK/SEQ (C:1441).
- Pitch in → `held(midi[])` from the keys (the arp pool while the arp runs); onset = a note absent from the previous call; root
  stored as MIDI (T:114) and folded at use.
- `stop()` → on = false; drone gain to 0 in ≤ 10 ms; every live hit: cancel its env, ramp to 0 in ≤ 5 ms, osc.stop(now + 0.03).
  Root, lock and pattern stay (the Studio's silence, I:559-568).
- Tone → T's single `tone`: either the Studio's ② alone (bassEqLP + slope poles) or PG filter.ts at the same seat (after bassOut,
  C:1580). ① low-cut and its three poles go unless the glass keeps two nodes.
- Persist density/groove (T:117). GLIDE dial ↔ τ via V:27-30 verbatim.
REWRITE: the tower view (mode seg, padlock, chip, strip, DENSITY/GROOVE, INTENSITY/SUB/GLIDE, the tone glass) in the site's
material, with a visible sub mark and a playhead at the bass's own rate.
CUT: bassSink, BassSampleSource (src/engine/sampler/types.ts:125-142), bassSampleBus/bassSampleIn, sampleHeat and the sink drive
law, applyBassDuck, setBassLayerMix, bassLayerMix (C:1522, 1534-1541, 1586-1641, 2000, 2003); keyboard mode and every `bassSink`
guard (C:860, 875, 885, 893, 899-925, 1682-1685, 1752-1755, 1778, 1781, 1794, 1799, 1824-1827); capture, CATCH and the load slot
(I:173-176); emit logging 'bass'/'bstep'/'brt'/'blk' (F:674-694) and the offline dispatch (F:573-584); the manualClock branch
(C:1784-1785); BD whole (its goldens bind the Studio's master chain, BD:77, 115); dice (F:489-491); the apply() on every noteOn
(C:876); CHAR FM/REESE (never shipped, DOC:410); `bassVoiced` (dead, C:1661).

## 11 · Contract deltas (T vs the Studio) and calls for the judge
1. T `BassStep.oct` is −1|0|1; the Studio has 'base'|'sub' (C:1663, P:8): sub → −1, base → 0; +1 has no Studio precedent.
2. T `root` is MIDI; the Studio pins raw Hz and folds at use (C:1670, 1673). T `lock` must mean ARMED (the Studio saves
   bassLock = rootLockArmed, F:363); pinned = root ≠ null. The padlock needs both states (V:184-195).
3. T `intensity`: the Studio binds the ② slope, inert at the open default (§7). Recommend heat (DOC:222): audible in every mode,
   and its .5 detent is today's sound.
4. T `tone` is one number; the Studio's glass has two nodes plus resonance and slopes (V:84-97).
5. T's KeyAction has no ROOT-LOCK; the Studio binds KeyN (I:455) → add `{ kind: 'lock' }`.
6. T's Bass lacks three inputs: the gate's param (C:1395), dive (C:973, 1741), and an output that lands on the shared duck, not
   out.master (C:1584).
7. Rate: keep eff 2 (a two-bar strip, the Studio's sound) or go to 1/16 (one bar, lines up with the drum strip, P's comments come
   true, the line doubles in speed). Recommend eff 2 for R1 parity, with a playhead that shows the two-bar walk.
8. After a release the Studio falls back to the last noteOn, a chord's fifth (C:870, 1675; PL:316-323). Recommend staying on the
   last target (the last lowest).
9. The chord rack's R14a pin (R:109-138) must reach `bass.set('root')` without taking over a manual lock.
10. A `sub` cell puts the sub sine at target/4 = 11-29 Hz (C:1654 × C:1741): below laptop speakers, and it spends headroom. On a
    laptop the bass is heard through the saws and the SUB exciter (C:1811).
11. Cost: 11 nodes per hit (C:1697-1704, 1719-1731) and two oversampled shapers that always run (C:1488, 1648); the Studio never
    parks the bass chain (the W63 idle park, C:402-412, covers the convolvers). Unmeasured at 4× throttle.
