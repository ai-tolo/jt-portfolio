# A · THE DRUMS — Signal Studio → `src/signal/drums.ts`

Sources, read-only. `S` = /Users/tolo/sites/signal-studio-v6lib (v6-library 2a9e4a7): `core` src/engine/core.ts ·
`dsp` src/engine/dsp.ts · `kit` src/engine/drum-kit.ts · `sp` src/engine/sample-player.ts · `la` src/engine/lookahead.ts ·
`det` src/engine/drum-determinism.ts · `rhy` src/views/instrument/rhythm.ts · `pat` src/views/instrument/drum-pattern.ts ·
`lstrip` src/views/instrument/drum-lane-strip.ts · `idx` src/views/instrument/index.ts · `tstrip` src/views/instrument/time-strip.ts ·
`mh` src/views/instrument/module-header.ts. `P` = /Users/tolo/sites/signal-studio-page (branch page 67b6b58): `pg/grid`
`pg/click` `pg/time` `pg/stop` = src/page/*.ts. `C` = this repo's contract, src/signal/types.ts.

## 0. Verdict
- SOUND: port the core's drum graph and step body (core:998-1110, 1113-1216, 1311-1334, 1451-1480). The page branch has no
  drum machine to reuse, only a kick+hat metronome (pg/click:1-8).
- TIME: port the PAGE's lattice + booked-voice registry (pg/grid whole, pg/click:54-200, pg/time:291-301), not the core's
  float accumulator (core:1293-1342). §7 says why; the short reason is that the core cannot master-stop the house kit.
- No rip needed: src/components/signal-drumkit.ts here is `cmp`-identical to S/src/engine/signal-drumkit.ts (90,719 B, §9).
- First impression: at the default DENSITY 0, FLOOR plays four kicks and nothing else (core:251, 1323-1326). Tempo: the
  core defaults to 96 (core:250); the Studio shows 120 from project.bpm (S/src/main.ts:44,72; S/src/mock/data.ts:54); C:31 = 120.

## 1. Signal chain (every lane shares it; a lane differs only by buffer + trim)
```
BufferSource(kitBuf[LANE_BAKED_KEY[lane]], rate r) → Gain g (constant, no fade)             sp:103-123 · core:1126
 → drumLP1 LP f=drumCover Hz, Q=drumRes (dB) → drumLP2/3/4 LP Q −3.01  (② cover + slope)     core:998-1005, 1019
 → drumHP  HP f=xToF(drumHpFreq), Q=drumHpRes (dB) → drumHP2/3/4 HP Q −3.01 (① low-cut)    core:1007-1011, 1020
 → ┬ drumDry ×1 ─────────────────────────────────┐                                         core:1012, 1021
   └ drumWet ×w → texShaper (4x) → texLP Q −6.02 ─┴→ drumGlue comp → drumWarm tanh(1.18x) 2x core:1013-1017, 1022, 1025
 → drumTrim ×1/(1+0.45·texAmt) → drumGainNode ×gain·(1−mute) → drumBus                     core:1018, 1025, 385-398
 drumTrim ┬→ ROOM: 6 ER taps → Σ → comb 41 ms (LP 3.6 kHz, fb .33) → LP 5.2 kHz → soft 2x → ×0.16 → drumGainNode
          │                                                                                core:1037-1066
          └→ DELAY: ddPre → ddL → ddR, pans −.6/+.6 → ddMix → drumGainNode; ddR → LP 3.2 kHz → ddFb → ddL
                                                                                           core:1085-1101
drumBus → preLimit ×0.92 → masterHP 20 Hz Q −3.01 → soft tanh(1.12x) 2x → limiter −1.5 dB 20:1 2/90 ms
        → masterTap → finalOut (live)                                   core:366-368, 598, 608, 611, 634
```
- Drums bypass the keys `glue` AND the sidechain `duck`: drumBus → preLimit directly (core:605-608). Room + delay return sum
  at drumGainNode, so GAIN/MUTE ride dry + room + echoes together; the delay SEND is pre-gain (core:1095-1101).
- Per hit: `g = vel × LANE_BAKED_TRIM[lane] × KITGAIN 0.5 × (1 + bi·0.05)`, `r = 1 + bi·0.012`, bi ∈ [−1,1) (core:1113,
  1121-1123). Stop booked at `when + buf.duration + 0.05` (sp:167-190).
- drumGlue −8 dB, knee 12, 1.8:1, 6/150 ms (core:1016). Room taps [s, gain, pan]: [.0083 .52 −.45] [.0137 .43 .55]
  [.0193 .35 −.30] [.0251 .29 .40] [.0317 .23 −.20] [.0397 .18 .28] (core:1041-1044); always on, no control.
- Lanes in fixed order (kit:20-31): kick 1.0 · snare .92 · hat .34 · openhat .42 · clap .72 · perc→`shaker` .4. C:73 calls
  the sixth lane `shaker`: rename it, keep the trim.

## 2. The pattern engine
AUTO (core:1323-1334). Per step st 0..15: acc = ACCENT[st] (core:1181), vh = 1 + bi·0.08 (core:1304), d = density.

| lane | fires when | velocity |
|---|---|---|
| kick | st ∈ P.k | 0.96·vh, at the unswung t, + duckHit(t) |
| snare | st ∈ P.s | (0.85 + 0.15·acc)·vh |
| hat | st ∈ P.h and d > 0 | (0.45 + 0.55·acc)·hbase·vh, hbase = clamp(d/0.18) |
| hat | d > .18, st%4 = 2, st ∉ P.h | (0.3 + 0.2·acc)·d8·vh, d8 = clamp((d−.18)/.32) |
| clap | d > .18, st ∈ {4,12} | 0.4·d8·vh |
| hat | d > .5, st odd | 0.26·d16·vh, d16 = clamp((d−.5)/.3) |
| snare | d > .5, st ∈ {6,14} and ∉ P.s | 0.16·d16·vh |
| shaker (perc) | d > .62, st odd | 0.28·dpc·vh, dpc = clamp((d−.62)/.38) |
| openhat | d > .62, st = 14 | 0.5·dpc·vh |

- PATTERNS (dsp:89-94): floor k[0,4,8,12] s[] h[2,6,10,14] · back k[0,8,10] s[4,12] h[0,2,…,14] · half k[0] s[8]
  h[0,4,8,12,14] · break k[0,7,10] s[4,12,15] h[2,6,8,14]. ACCENT = [1,.5,.72,.5,.92,.5,.72,.5,.9,.5,.72,.5,.94,.5,.78,.55].
- Gains, humanize off (scratch A-auto-grid.mjs): every kick 0.48; FLOOR d .5 = kick ×4, hats .14 on 2/6/10/14, claps .14 on
  4/12. d 1 adds odd hats .04, ghost snares .07 on 6/14, shaker .06 on odds, openhat .10 on 14, where a closed hat also
  sounds and the house kit never chokes (§4).
- SEQ (core:1311-1321): fixed lane order kick, snare, hat, openhat, clap, perc; vel = SEQ_TIER[cell]·vh, SEQ_TIER =
  [0, .45, .8, 1] (core:1192), so kick gain = .5 accent / .4 mid / .225 ghost. The kick fires straight at t and ducks for
  ANY kick cell, ghost included; other lanes fire at tt (swung). DENSITY is ignored in seq (core:1314).
- GENERATOR `generateDrumPattern(density, groove, style)` (pat:36-71), pure, no RNG. Tiers: kick/snare 3 on P.k/P.s;
  d>0 hats 2 on P.h; d>.18 &-hats 2 + claps 4/12 = 2; d>.5 odd hats 1 + ghost snares 6/14 = 1; d>.62 odd shaker 1 +
  openhat 14 = 2. Its active steps equal auto's at the same d by construction (pat:11-14), so the view can paint AUTO from
  `generateDrumPattern(d, 0, pattern)`; `drumStepActive` (core:1280-1292, chop sink only) is cut.
- GROOVE (pat:66-68): >.35 ghosts the &-hats, >.6 adds openhat 14, >.8 lifts snare 14. The Studio passes a constant
  genGroove 0.3 (rhy:144), so drum groove is INERT there, and the tower has no GROOVE knob (rhy:87-125). The core's
  `fx.groove` is the ARP's groove, not the drums' (core:1346, 1470).
THE STUDIO'S VIEW GRAMMAR (rhy):
- ⊞ toggles SEQ; FLOOR/BACK/HALF/BREAK exit SEQ and set the auto pattern + generator style (rhy:274-282). First SEQ entry on
  an empty grid seeds `generateDrumPattern(0.5, 0.3, style)` (rhy:144, 266-272). In SEQ, DENSITY regenerates the grid and
  erases hand edits (rhy:303-305); genDensity is view-local and never saved, so a reload loses it (rhy:144, 386-389).
- The strip is NOT a 6×16 grid: a 6-pad lane row + ONE 16-bar strip for the selected lane (rhy:89-100, 150-170); the
  96-cell modal was retired on purpose (rhy:150-155). Bar heights 7/32/64/100 % by tier (rhy:48); beat mark every 4
  (rhy:168). `lstrip` is the K2 drag-a-sample-onto-a-lane overlay, not the step strip: cut.
- Edit: click = MID 2, Shift = ACCENT 3, Alt = GHOST 1; the tier a cell already holds clears it (rhy:51, 191-196).
- Tap-record: a lane pad always auditions; while SEQ rolls it also writes MID (Shift ACCENT) at
  `round((currentTime − (outputLatency ‖ baseLatency) − transport0)/stepDur) mod 16` (rhy:213-236). A step already inside
  the 100 ms horizon is booked, so the write sounds next pass (rhy:229-234).
- Audition (idx:851-866) plays at trim × 0.9; a grid accent plays at trim × 0.5. Pads are +5.1 dB hotter than the loop
  they record, so port `hit()` with the grid's gain law.
- Playhead: rAF, snaps per step, same stepNow (rhy:245-256). Keys: Space = drums on/off (idx:440), `=` = TAP (idx:464);
  no QWERTY drum pads (the letters are notes).

## 3. Swing and the step clock
- Swing (core:1303): the 8th "ands" (st%4 = 2: 2/6/10/14) move `swing·0.66·stepDur` late, odd 16ths `swing·0.5·stepDur`,
  and 0/4/8/12 never move. Units: fractions of a 16th, stepDur = 60/bpm/4 s. At 120 BPM, swing 1 = +82.5/+62.5 ms and
  swing .5 = +41.3/+31.3 ms.
- The KICK never swings: it fires at t (core:1319, 1323), so in BREAK the kicks on 7/10 stay straight while the hats
  swing. Every other lane fires at `tt = t + sw + bi·0.005` (±5 ms jitter, core:1304).
- Knob: engine default 0 (core:251); the knob starts at 0, but its double-click reset + detent are 0.5 and its arc is
  drawn as a deviation from 0.5 (rhy:293-299), so a reset lands swung. Page: reset to 0 unless Jon says otherwise.
- Core step time: clock start seats `transport0 = now + 0.05`; the first step is the first grid time ≥ now + 0.02
  (core:1271-1275); `drumStep = round((nextDrumT − transport0)/sd)`, so drums join a running grid in phase (core:1445).
  Each step books `t = nextDrumT`, then `nextDrumT += 60/fx.tempo/4` (core:1300-1302, 1341): a float ACCUMULATOR re-reading
  tempo per tick. transport0 is never re-anchored on a tempo change (only set at core:1272, cleared at 1440 and 1965).
- Lattice form for the port (C:13-17): step k of bar j at `originFrame + j·barFrames + round(k·barFrames/16)`; swing =
  `round(swing·0.66·barFrames/16)` frames (·0.5 for odd steps); the jitter stays in seconds.

## 4. The choke
- The choke exists ONLY for user-kit (K1) lanes: per-lane retrigger `prev.stop(t, 0.03)` and hat → openhat
  `oh.stop(t, 0.03)` (core:1141-1149, 1161). Stops only tighten: the earliest end wins (sp:201-227).
- The house kit NEVER chokes: the baked branch discards its voice (core:1159). Studio parity = no choke; the 1.6 s openhat
  rings under the next closed hats. Once the page tracks every voice (needed for stop, §7), hat→openhat is a 3-line switch;
  it is Jon's ear call, never shipped silently.

## 5. Cover, TEXTURE, DELAY, SIDECHAIN
COVER (node ②) + LOW-CUT (node ①): a 2-node EQ8-style glass, ① left = low-cut HP, ② right = cover LP (rhy:323-333).
- ② LP: drumCover in Hz, no engine clamp (core:1887). The view writes `xToF(x) = 20·1000^x` Hz, x 0..1 (rhy:332;
  dsp:174-178), τ 30 ms (core:1458). Readout: OPEN ≥11 kHz, MUFFLED ≤70 Hz (rhy:321-323).
- ② resonance: Q = drumRes in dB, clamped −50..40 (core:1888); the glass sends `nodeQ(nodeDb)`, node dB −24..+18 (dsp:219;
  S/src/views/instrument/filter-curve.ts:52).
- ② slope: drumSlope 0..1 engages LP2/3/4 a third at a time, corner `20000·(cover/20000)^eng` (dsp:205-208;
  core:1451-1457). Default 1 = 48 dB/oct once closed (core:250); core:1000's "0.33 default" is stale, and only rhy:391's
  sync fallback still says 0.33.
- ① HP: drumHpFreq 0..1 → xToF (core:1007, 1463). Open = 20 Hz, with the slope poles parked at 10 Hz until x > 0.02 and
  fully engaged by x ≥ 0.1 (`hpCascadeCorner`, dsp:197-201). drumHpSlope 1; Q = drumHpRes in dB (core:1889-1891).
- CONTRACT GAP: C:86 carries only `cover` (0..1). Either keep ① at its transparent default and leave it off the page, or
  add `lowcut` + `coverRes` to DrumsState (the mocks draw a two-node glass).
TEXTURE (`character` + `drumTex`) is a PARALLEL wet path; the dry path stays ×1 (core:1012-1013, 1021-1022).
- Amount v (core:1473-1479): wet `clamp(0.7v + 0.9v², 0, 1.5)`, texLP `clamp(17000 − 6500v, 9000, 17000)` Hz, drumTrim
  `1/(1 + 0.45v)`; below 0.01 the curve is null, wet 0, LP 18 kHz. v .3/.6/1 → wet .29/.74/1.5, LP 15.05k/13.1k/10.5k,
  trim .88/.79/.69.
- Curves: 512 points, k = a², oversample 4x, rebuilt only on change (core:1014, 1472-1475; dsp:133-149). `tape` (anything
  but 'drive') = tanh((x + 0.16a·x²)·(1 + 3.4a + 5a²)), where x² adds even order; `drive` = an asymmetric rational with
  kp = 7k + 12k², kn = 3k + 5k².
- C:87 has `'off'|'tape'|'drive'`, but the Studio has no 'off' flavour: off = amount < 0.01, and the seg shows only TAPE
  and DRIVE (rhy:109).
DELAY is the drums' OWN stereo delay, independent of the keys' shared delay (core:1067-1079).
- Time = `clamp(60/bpm · DIV, 0.02, 7.9)` s, DIV = [.25, .5, .75, 1, 2] beats (1/16, 1/8, 1/8·, 1/4, 1/2), default index
  1 = 1/8 (core:1082, 1093); glides τ 30 ms (core:1104).
- Echoes: L at dt, R at 2dt, then each pair ×fb (ddL→ddR serial; ddR → LP 3.2 kHz Q −6.02 → ddFb → ddL, core:1086-1100).
- Gated by the beat: wet = on ? mix : 0 (τ 30 ms), fb = on ? min(fb, .9) : 0 (τ 40 ms) (core:1102-1107). Pads auditioned
  while stopped play dry; the tail dies on stop.
- CONTRACT GAP: C:62 routes effects to SHARED returns and C:200 DelayDiv lacks 1/2. Shared routing would give drum echoes
  the keys' division and feedback and duck them wherever the shared return ducks. Keep this 9-node delay in drums.ts
  with its own DelayDiv table.
SIDECHAIN (`duckHit`, core:1201-1216) has no detector: each kick books an envelope on the `duck` gain, which carries keys
(glue → glueMakeup → duck), bassBus and the SUB exciter (core:608, 1584, 1653). Drums never duck.
- depth = min(sc/.65, 1), hard = max(0, (sc − .6)/.4), floor = max(0, 1 − .9·depth − .1·hard). Attack τ = max(4 ms, atk/3)
  with atk = 12 − 6·hard ms; hold = hard·beat·0.14; release τ = min(.34·beat, .2 s)·(1 + 4·hard) from t + atk + hold.
- At 120 BPM: sc .3 (default) → floor .585 (−4.7 dB), release τ 170 ms from +12 ms; sc .6 → .169 (−15.4 dB); sc 1 → 0
  (silence), release τ 850 ms from +76 ms.
- No duck when sc < 0.01, when drums are MUTED, or during any solo; GAIN 0 still pumps (core:1202-1210). Kick velocity is
  ignored. Beat off and kill reset the duck to 1 at τ 50 ms (core:1446, 1964).
- CONTRACT GAP: C:58-69 exposes no duck node. Add `out.duck: GainNode` (keys + bass through it, drums straight to master)
  or have drums call `onKick(frame)`. On a tempo change or stop, cancel duck automation after `from` along with the
  voices, or cancelled kicks still pump.

## 6. Defaults (every one)
| param | Studio default | where |
|---|---|---|
| tempo | 96 engine / 120 project / C 120, range 60–180 | core:250 · S/src/main.ts:44 · C:29-31 |
| on / pattern / mode / seq | false / 'floor' / 'auto' / all 0 | core:249, 1187-1191 |
| density · swing · sidechain | 0 · 0 (knob reset 0.5) · 0.3 | core:250-251 · rhy:293-307, 343 |
| TEXTURE amount / flavour | 0 / 'tape' | core:251 · rhy:311 |
| cover · res · low-cut · res · slopes | 20000 Hz · 0 · 0 · 0 · 1 and 1 | core:250 |
| delay mix / time / feedback | 0 / idx 1 (1/8) / 0.35 | core:254 · rhy:352-365 |
| gain / mute | 1 (footer knob 0.8 × 1.25) / 0 | core:252 · mh:16-17, 253-265 |
| KITGAIN · humanize | 0.5 · time ±5 ms, vel ±8 %, rate ±1.2 %, gain ±5 % | core:1113, 1122-1123, 1304 |
| room · generator | mix 0.16 · genDensity 0.5, genGroove 0.3 | core:1063 · rhy:143-144 |
| TAP / tempo drag | 2 s idle, mean of last 5, ≥2 taps · 0.5 BPM/px, 20–220 | tstrip:62-97 |
| clock | 25 ms timer, look 0.1 s, heartbeat 0.25 s, start +50 ms | core:1412 · la:34, 169 · core:1272 |

## 7. Scheduling: the core vs the page lattice → port the page's
THE CORE: `clockTick` runs tick() every 25 ms (core:1412), plus a silent ConstantSource heartbeat every 0.25 s
(la:169-206; core:1417-1421). LOOK = `createLookahead({min: 0.1})` = max(0.1, hidden 0.6/3 s, 3× the worst wake gap),
capped at 90 s (la:34-47, 137-140; core:1269, 1297-1298). `wantsClock` = beat ‖ arp ‖ gate ‖ bass pluck/seq (core:1441);
`processReleases` is a no-op (core:2007). Bass pulses ride inside the drum loop while the beat is on (core:1337-1340) and
on their own anchor when it is off (core:1399-1410).
WHY THE PAGE'S LATTICE (pg/grid, pg/click, pg/time):
1. Integer frames, never accumulated: one `barFrames`, bpm derived (pg/grid:1-8, 24-36). The core accumulates
   `nextDrumT += stepDur` (core:1341).
2. Every booked voice is tracked, so stop and tempo change can un-book (pg/click:14-17, 101-106, 183-200). The core cannot:
   baked hits are discarded (core:1159) and `laneAllOff` sees only K1 voices (core:1150-1152), so `kill()` (core:1956-1966)
   leaves up to LOOK of booked hits AND every ringing sample (openhat 1.6 s) sounding. That fails Law 5 and C:102.
3. Late ticks SKIP (LATE_SEC 4 ms, pg/click:45, 137). The core's `while (nextDrumT < now + LOOK)` fires every overdue step
   at once (core:1301): a burst after a stall, the failure mode a 4× throttle can provoke.
4. A tempo change re-anchors at the next beat and keeps the bar/beat count (pg/time:291-301; C:43). The core never
   re-anchors, so after a change the strip's playhead and tap-record step drift: 120 → 100 BPM after 2 bars, drums on
   step 0, `stepNow` says 11 (scratch A-auto-grid.mjs).
5. One `onStep` feeds drums and bass (C:48-50), replacing the core's coupling.
KEEP FROM THE CORE: the step BODY (§2-3) and all of `lookahead.ts` (pure; 16/16 node tests pass).
- The heartbeat is optional; pg/click skipped it only because the page forbade destination edges (pg/click:19-23). If kept,
  stop it on master stop: the core's `kill()` never calls `heartbeatStop` (core:1422 runs only from core:1440, behind
  `if (clockT…)`), so the pulse outlives a kill.
- Gate booking on `ctx.state === 'running'` (pg/click:25-26, 131), or bookings made on a suspended context pile up at
  resume. Master-stop precedent: a Set of silencers swept by one capture-phase Escape listener (pg/stop:39-79).

## 8. Port list → `src/signal/drums.ts` (+ `drum-pattern.ts`, shared dsp)
LIFT VERBATIM
- dsp: 89-94 PATTERNS · 133-149 drumTexCurve · 151-159 softCurve · 161-169 warmCurve · 174-178 FMIN/xToF/fToX · 197-208
  hpCascadeCorner/lpCascadeCorner · 219-220 nodeQ/nodeDbFromQ · 229-235 b64ToArrayBuffer.
- kit:20-31: lanes + LANE_BAKED_KEY + LANE_BAKED_TRIM (rename `perc` → `shaker`; values unchanged).
- core: 998-1025 chain · 1037-1066 room · 1082-1110 delay + applyDrumDelay + setters · 385-398 applyModuleGain (drums only)
  · 1181 ACCENT · 1192-1199 SEQ_TIER/setDrumStep/setDrumMode/seqActive · 1451-1480 setDrumLpCascade/setCover/applyDrumEq/
  setSidechain/setSwing/setDensity/applyDrumTex/setCharacter · 1141-1149 chokeLane (parked, §4) · 1201-1216 duckHit minus
  the soloBus line, with `duck` injected (§5).
- pat whole + S/src/views/instrument/drum-pattern.test.mjs (38/38 pass); its dsp drift-guard can go once PATTERNS lives in
  one file. For the timekeeper author: la whole + test, and P/src/page/grid.ts whole + grid.test.mjs.
REWRITE
- playSample (core:1118-1132): `rng.bi()` → `Math.random()*2−1`; `sampler.play({when, dest: drumLP1, gain, rate})`
  (sp:97-190); register {frame, endFrame, voice} and drop it on `ended` (pg/click:108-128).
- laneFire, kick…perc (core:1157-1180): baked path only, no counts.
- tick's drum branch (core:1299-1342) → `book({frame, bar, step})`: t = frame/sr, stepDur = barFrames/16/sr, swing + jitter
  as core:1303-1304, auto and seq branches verbatim. Drop drumSink (1305-1310), the bass pulse (1337-1340) and
  `drumStep++/nextDrumT`.
- setBeat (core:1443-1448) → `set('on')`: keep the delay gating and duck reset; start/stop belong to the Timekeeper.
- stop(): cancel unstarted voices; ramp sounding ones τ 4 ms and cut at +30 ms (pg/click:183-200); zero ddMix/ddFb; cancel
  duck automation; ramp a `stopGate` after drumGainNode to 0 so neither the room comb (fb .33, ~250 ms to −60 dB) nor the
  delay line can ring, and reopen it on the next start.
- hit(lane, vel = 1): now + 10 ms like idx:851-866, but with the grid's gain law (§2).
- Kit: `decodeKitReady` for ONE live ctx at boot (decodeAudioData works suspended); drums exist only after all six decode
  (pg/click:63-65). The core's fire-and-forget decode drops early hits silently (core:1113, 1119).
- Tap-record/playhead read `time.playhead()` (C:52-53), not transport0 (rhy:216-222). If S stays, ramp it: the core flips
  `drumBus.gain.value` 0/1 instantly (core:1979, 1988).
CUT
- Chop kit / DrumSampleSource: core:1225-1233, 1280-1292, 1305-1310, 1446 (`allOff`), 1958; S/src/engine/sampler/types.ts:79-86;
  sampler/chop-kit.ts.
- K1 user kit + keyframed kit refs: core:1134-1140, the assigned branch of 1157-1172, setDrumKit, drumKitRef; kit:33-103.
  K2: lstrip whole.
- Determinism/offline: prng seeding, `manualClock`, det whole, test-harness goldens, `neutralizeModuleGains`
  (core:1919-1922), `counts`/`drumCounts` (core:1112, 1175-1177, 2016), 'dstep'/'dmode' emits (S/src/engine/index.ts:581-582,
  691-692).
- Capture/exports: the `buses.drums` tap and `drumIn` (core:1996-2000); the tower's load slot. The dormant `fill` gesture
  (core:967; no view caller).
- Core clock: clockTick/clockEnsure/clockStopIfIdle/wantsClock/gridNext/processReleases (core:1269-1275, 1412-1441, 2007).
  decodeKit's per-context WeakMap (dsp:226-253): there is one context.

## 9. The kit asset (no rip; already here)
- `DRUMKIT` = 6 base64 AAC-LC `.m4a` (ftyp M4A, Apple-encoded, 44.1 kHz stereo; S/src/engine/signal-drumkit.ts:3-9):
  90,392 base64 chars → 67,790 B. Raw B / s: kick 7,208 / .50 · snare 7,058 / .50 · hat 8,756 / .50 · openhat 26,289 /
  1.60 · clap 9,060 / .50 · shaker 9,419 / .40 (decoded + afinfo, scratch A-kit-*.m4a).
- Priming: no `edts/elst` box; iTunSMPB says 2112 priming, 414 padding, 22,050 valid (kick). ffmpeg (Chrome's decoder
  family) and CoreAudio (Safari) both drop the priming: first |x| > 0.02 at kick 374/374, snare 200/200, hat 399/400.
  Firefox is unmeasured. Gate: decode `kick` in all three, assert onset ≈ 374 ± 64 samples at 44.1 kHz (≈ 407 at 48 k).
- Decoded onsets (|x| > 0.01) land 4–12 ms after start() (snare 200, clap 182, kick 374, openhat 369, hat 388, shaker 526):
  drums sound a few ms behind the synths on the same step. Studio parity; a trim offset is a taste call.
- Already live on uxjon.com: src/components/signal-drumkit.ts, imported at SignalMachine.astro:1209 and decoded at :1279.
  Budget: 90.7 KB as JS or 67.8 KB as six static files, both far under 3 MB and decoded before the first click.

## 10. Risks the port must carry
- Law 5: the core cannot silence the house kit (§7.2); the page must, via voice tracking + a stop gate.
- Level: auditions play +5.1 dB over the loop (§2); use one gain law for `hit()` and `book()`.
- Phantom pumps: duck events for cancelled kicks (§5). Tempo drift in the strip (§7.4) goes away with the lattice; keep
  the heard-time offset (outputLatency ‖ baseLatency).
- Firefox lacks `cancelAndHoldAtTime`; sp:222-224 falls back to reading `out.gain.value`, which is safe for drum voices
  (constant gain).
- Law 4: persist every DrumsState field, including the generator density the Studio drops (rhy:144).
