# C · THE KEYS VOICE AND THE SAMPLER (R0 code map)

**Sources (read-only):** `V` = ~/sites/signal-studio-v6lib/src/engine (v6-library @ 2a9e4a7) · `P` = ~/sites/signal-studio-page/src/page (page @ 67b6b58) · `C` = src/signal/types.ts (the frozen contract) · `L` = ~/SignalLibrary/voices/keys--Rd-2-Gallery/manifest.json.

**Short names:** `ms` = V/sampler/multisample.ts · `map` = V/sampler/multisample-map.ts · `zd` = V/sampler/zone-dsp.ts · `mock` = V/sampler/mock-sample-player.ts · `core` = V/core.ts · `vi` = V/../views/instrument/index.ts · `Pk` = P/keys.ts · `Pf` = P/filter.ts.

**Which implementation to port.** The four sampler leaves are byte-identical in both trees (`diff -q` finds no differences), and THE PAGE imports them straight from the engine (Pk:36-37). The choice only arises for three pieces: the filter (core vs Pf), the LFO (core only) and the loader (Pk only).

**Test status today:** multisample.test.mjs 98/98 · zone-dsp.test.mjs 160/160 · P/filter.test.mjs 56/56 (with the esbuild loader).

## 0. Verdicts
- **Port verbatim:** `ms`, `map`, `mock`, zd's rmsOver/peakOver/bakeLoopCrossfade, and `Pf`. Despite its name, `mock` is the Studio's REAL runtime player for built voices: vi:520 passes no `player`, so V/sampler/index.ts:98 falls back to it.
- **Bake the loop seam at load, never at rip time (§3).** The bake lives inside createMultisample.
- **Cut the morph synth as a fallback (§5).** If 'synth' stays on the voice seg (C:150), port a reduced fixed-blend version.
- **MOTION** is a JS control-rate writer of `p` into the verbatim filter: `p_eff = p_hand·(1 − amount·d)` (§6).
- **Contract conflicts (§8):** FILTER_OPEN is 0.985 in the contract but the page tests 0.995; loop points are 48 k samples (divide by 48000, never by ctx.sampleRate); Voice has no hit() and no bend(); the Studio has no 'tri' shape.

## 1. The sampler voice life cycle

**Build** — `createMultisample(zones, player, opts)` (ms:122), once per voice:
- **Output.** `out` is `opts.destination` or a new GainNode (ms:124). The instrument writes `out.gain = layerMix` itself (τ 20 ms: ms:162-166). Give each voice its own GainNode (Pk:184-185, 322-324); never pass the shared filter input.
- **Baked copies.** `playBufs` (ms:130) holds a baked COPY for each zone that passes loopValid and is not in 'decay' mode. Every other zone plays its raw buffer.
  - loopValid (ms:99-104): loopStart > 0, start < end, loopEnd ≤ duration, loop ≥ 50 ms.
  - bakedCopy (ms:106-120): createBuffer at the SOURCE rate, copy each channel, then bakeLoopCrossfade with `z.xfade`, or 30 ms.
- **Live re-level.** `playGains` (ms:139-159) sets each zone's gain from its own audio:
  - the loop RMS (sustain) or the 0–1.5 s RMS (decay) is brought to −14 dBFS;
  - the whole-buffer peak is capped at −6 dBFS;
  - the result is clamped to [0.4, 2.5];
  - a silent zone (RMS < 1e-4) keeps its stored `z.gain`. Otherwise the manifest gain is informational only (L stores 2.5 on all 21 zones).
- **Measured cost** (scratch `C-build-cost.mjs`, node, M3):
  - 21 Rd-2-shaped zones cut at loopEnd + 50 ms build in **3–6 ms of synchronous work**.
  - Decoded PCM is 13.4 MB mono or 26.8 MB stereo, held **twice** (raw + baked). The raw buffer stays referenced by `.zones` (ms:298) and is read for `.duration` (ms:188).

**Note on** — `noteOn(id, freq, when?, vel=1)` (ms:224-237):
- The start time is `t = max(when ?? now, now)`.
- If the same id is still ringing, it is choked with `stop(t, 0.025)` (228-229).
- The voice loops when `params.mode === 'loop'` (230). An un-looped voice deletes itself on `ended` (236).

**startVoice** (ms:179-222):
- It picks the zone with chooseZoneRate (185).
- It sets `loop = spec.loop && zone.mode ≠ 'decay'` (193). A held voice gets no duration, so it is open-ended (203-206).
- It calls `player.play` with `{buffer: playBufs[i], when: t, offset: 0, rate: pick.rate·bendMult, gain: clamp01(vel)·playGain, pan, loop, loopStart: z.loopStart ?? 0, loopEnd: z.loopEnd ?? bufDur, fadeOut (hit only), destination: out}` (207-220).
- It never passes `fadeIn`, so every attack is 3 ms (mock:14, 93).

**The player** (mock:43-190):
- Each voice gets a fresh BufferSource and GainNode (44-45). A StereoPanner is added only when |pan| > 1e-3 (77-83).
- `playbackRate.value = rate` (56-57). loop, loopStart and loopEnd are set before start (63-74).
- **Open-ended:** gain ramps 0 → vel over 3 ms, then holds flat (99-101).
- **Fixed-length:** ramp in, hold, then fade out to end at `when + dur/rate`. If too short, the envelope becomes a triangle. The source also gets `stop(naturalEnd + 10 ms)` (102-116).

**Decay zones (W16)** differ from sustain zones:
- No loop and no bake (ms:130, 193).
- No duration: the source ends when its content runs out. Because that end is rate-aware, a DIVE stretches the ring-out like tape (194-202). The intake's edge fade makes the end silent.
- noteOff still damps them (243).
- Their level is measured over 0–1.5 s (151-152).

**Note off (the click-free law).** `noteOff(id, when?)` (ms:239-244) acts only in instrument mode 'loop'; a one-shot rings out. It calls `stop(when, params.release)` and drops the id at once. The release is 0.09 s for keys and 0.13 s for bass (vi:1198, 1202; Pk:45).

`stop(at, releaseSec)` (mock:129-177) has four rules:
1. **Tighten-only.** The pending end is seeded with the natural end (Infinity for loops). A later-or-equal end is a no-op, so a choke can never un-choke (122, 134-139).
2. **Immediate stop** (t ≤ now + 5 ms): `cancelScheduledValues(t)`, then `setValueAtTime(v0 = current gain, t)`. This anchor is load-bearing: `cancelAndHoldAtTime` alone SNAPS about 6 dB here, and that snap was the w18 key-up pop (153-167).
3. **Future stop:** `cancelAndHoldAtTime(t)`, or cancel + set if it is absent (168-173). Then a linear ramp to 0 at `t + release`, and `src.stop(end + 5 ms)` (174-175).
4. **The source keeps looping through the release.** The baked wrap forces x[e−1] = x[s−1], so it is continuous at any phase (143-146). w17.8's `loop = false` forward-played the unconditioned x[e−1]→x[e] edge and popped; its regression test is T8 (V/voice-verify.ts:289-307).

**Other stop times:** retrigger 25 ms (ms:229) · allOff 30 ms (ms:290, 293) · hit fadeOut = hitFade, .018 keys and .028 bass (ms:250) · the 4 ms declick, only when no release is passed (mock:15, 136).

**allOff(when?, keepIds?)** (ms:284-295) stops every held voice except keepIds (the bass '__drone'), plus every hit, with `stop(when, 0.03)`. Silence arrives in 30 ms or less; sources end at +35 ms.
- `dispose()` runs allOff, then disconnects `out` only if the instrument created it (308-311). A caller-owned destination is the caller's to disconnect; Pk does it 150 ms later, after the ramp (Pk:330-336).
- **Hazard:** a looping voice never ends on its own, so a lost keyup means a note forever. The portfolio keymap must call allOff on `blur` and `visibilitychange`; the contract has no such hook (C:173-183).

## 2. The createMultisample API and zone selection

**API:** `{zones, out, params (getter), setParams(patch), noteOn(id, freq, when?, vel=1), noteOff(id, when?), hit(freq, when, durSec, vel=1), retune(id, freq, when?, tau?) → boolean, bend(cents, tau?), allOff(when?, keepIds?), dispose()}` (ms:75-82, 297-312).
- **Params** (53-73): `{tune 0, pan 0, layerMix 1, mode 'loop'|'oneshot', decay 1, release 0.1, hitFade 0.02}`. The Studio's keys mount: layerMix 1, mode 'loop', release .09, hitFade .018 (vi:1198).
- **Zone** (31-51): `{buffer, rootMidi, loKey?, hiKey?, loVel?, hiVel?, loopStart?, loopEnd? (SECONDS), mode?, xfade?, gain?}`.
- **retune** glides within the SAME zone (262-269).
- **bend** glides every held voice off its baseRate, τ .45 going down and .07 coming back (274-282). New voices start pre-bent (203, 212). Hits are never bent live.

**Zone selection** (map:1-88, pure, no imports):
- **selectZoneIndex** (29-41): the zone whose explicit `loKey..hiKey` contains the note wins. Otherwise the nearest root wins, with ties going to the lower root.
- **rateForRoot** (44-47): `(freq/mtof(root))·2^(tune/12)`. There is no sample-rate term.
- **selectZoneVel** (58-77): runs only when some zone has loVel/hiVel. It picks the band that contains `round(vel·127)`, or the nearest edge, as a hard switch, then selects by pitch inside that band. Single-layer voices skip it (60-61).
- **chooseZoneRate** (83-88): `round(freqToMidi)` picks the zone; the rate comes from that zone's root.

**Rd-2 in practice:**
- Roots run 24..84, every 3 st. Each zone covers root ± 1; the edges cover 0..25 and 83..127 (L zones[0], zones[20]).
- So from 24 to 85 the repitch is at most 1 st. Below that, zone 24 is used; above it, zone 84.
- No pick has velocity bands. The rips that do are Chorus-Dist, FM-Saw-Pad, Rd-Stage and Wr-Tremolo-Amp.
- The visitor's velocity is a constant. The Studio core's default is 0.9 (core:869, passed at 880). Pk floors MIDI velocity at 0.05 (Pk:47, 481).
- **Octave naming.** The Studio uses Yamaha octave names, where 60 = C3 (V/../voices/note-name.ts:2-11). The rips' roots are therefore "C0–C5" in the Studio and C1–C6 in scientific pitch.
- **Top-end risk.** With oct −2..2 (C:196), a key can sit 2 octaves above the top root. That plays at rate 4, and buffer playback has no anti-alias filter, so it aliases.

**The seam the hands must drive** (the Studio's own calls):
- noteOn (core:880) and noteOff (892).
- The arp: `pluck → hit(freq, t0, dur, vel)`, with `dur = max(.018, life/1000)` (850, 856).
- ←/→ on held notes: `retune` (1936-1954).
- DIVE: `bend(bendCents + diveCents, tau)` — −2400 cents, .45 s fall, .07 s return (949, 969-977).
- Arp, latch and kill: `allOff` (926-935, 1960).

## 3. The loop crossfade: at load, not at rip time
- **The WAVs on disk are the stored capture.** backup.ts writes `encodeWav24(getAudio(audioId))` (V/../voices/backup.ts:342-346).
  - The bake runs on a COPY at mount: "the INPUT buffer is never mutated" (ms:90-96, 130).
  - Recall re-analyzes and persists only points, gain and mode, then mounts the raw buffer (vi:1147, 1169, 1177).
- **analyzeZone** (zd:271-360) is the rip-time and recall-time loop finder. It refines the period from the known root, then takes the longest clean loop of up to 3.5 s, anchored past 40 % of the zone, with the lowest seam cost.
  - The rips arrive with points: every Rd-2 zone has loopStart, loopEnd and mode. `xfade` is null in every rip on disk.
- **bakeLoopCrossfade** (zd:385-411) blends the last `fade` samples before loopEnd toward the material just before loopStart, so x[e−1] lands exactly on x[s−1].
  - `fade = min(xfade || 30 ms, half the loop, s)`.
  - If ρ ≥ 0.5 the blend is linear, because equal-power would swell +3 dB on phase-aligned loops. Otherwise it is equal-power (392-410).
  - It does nothing when s < 16 or e > length (389).
- **DECISION: the page needs the bake, and a verbatim createMultisample already does it. The encoder must NOT bake.**
  - A second bake compounds, because it re-reads its own output region.
  - A lossy codec breaks a sample-exact seam, while a bake after decodeAudioData conditions whatever the decoder produced.
- **What the encoder does instead:**
  - Every sustain zone must pass loopValid (ms:99-104).
  - Each sustain file is cut at loopEnd plus a tail, because nothing after loopEnd is ever heard. Held voices wrap, the release keeps looping (mock:141-152), and hit() reads at most `durSec·bendMult` of buffer from 0 (ms:206). Every Rd-2 loopEnd is at least 1.87 s.
  - Decay zones ship whole.
- **Audio that must ship after the cut at loopEnd + 50 ms** (scratch, kept of full): Rd-2 69.9 of 120.7 s · CFX 84.4 of 111.2 s · Warm Back 129.7 of 148.4 s · Lead 122.6 of 127.8 s.

## 4. A 44.1 k context (or any other rate)
- **decodeAudioData resamples to `ctx.sampleRate`.** So `buffer.sampleRate === ctx.sampleRate` and `length ≈ frames·sr/48000`.
- **The sampler makes no ctx.sampleRate assumption:**
  - Loop points are in seconds, on the source node (mock:66-73) and on the zone.
  - bakedCopy uses `src.sampleRate` (ms:108) and rounds s and e at that rate (zd:387-388).
  - playGains index with `z.buffer.sampleRate` (ms:148-152).
  - rateForRoot has no rate term (map:44-47).
- **The contract stores INTEGER samples at 48 k (C:145).** keys.ts converts with `/48000` (the manifest's `sr`), never with `/buffer.sampleRate`. Then it applies the onset shift, `Δ = firstIndex(|x|>0.02, decoded ch0)/buffer.sampleRate − onset/48000`, adding Δ to both points. If |Δ| > 0.1 s, it warns and ignores the shift.
- **At 44.1 k, a whole 48 k sample lands within ±0.5 frame.** That is harmless: the baked wrap is continuous at any phase (mock:143-146).
- **Edge case:** loopValid's `loopEnd ≤ duration` (ms:102) can fail by less than one sample at the end of a resampled file, leaving a naked, unbaked loop. The encoder's tail after loopEnd removes this risk.
- **Rate assumptions elsewhere:** Pf clamps its corner to `0.49·ctx.sampleRate` (Pf:83-86). core.setIrSlot refuses an IR recorded at a different rate (core:767-770; reader E).
- **Memory scales with the rate:** ×0.92 at 44.1 k, ×2 on a 96 k interface.

## 5. The keys SYNTH voice
- **Graph.** buildNote (core:791-846) blends the two VOICES definitions nearest the morph point (nearest2, 781-785).
  - Each definition has 1–3 oscillators (sine/triangle/saw/square), each with its own octave, detune and a random ±4 cents.
  - They pass through a gain of `w/√n`, then an optional biquad at `hz·bright` (80–16 kHz), into the per-note `grp` (797-812). An extra oscillator is added when `wide > 0.6`.
  - Downstream (269-282, 530-538): `synthKeysGain → keysBus → inG .9 → keyHP①×4 → moveFilt → keysLP2-4 → ampTrem → sig-sat (DRIVE) → post → keysGainNode → glue + sends`. The low-pass sits before the drive.
- **Envelope** (813-815): `A = def.a` (3–30 ms), `R = clamp(def.r, .14, .9)`, `PEAK = .2·vel`, `SUS = .7·PEAK`. It reaches PEAK at A + 6 ms and SUS at A + .16 s (plucks: .025 + gate·.13).
- **Release** (822-829): `cancelAndHold` at now + 15 ms. The FUTURE time is deliberate: that is the case where hold is correct (mock:161-163). Then a linear ramp to 0 over R, and the oscillators stop at +R + 50 ms.
- **MAXV 16** (790). The 17th voice steals, in this order: the first voice neither released nor held, else the first not released, else index 0 (840-843). The stolen voice gets a musical release, never a hard cut.
- **In the Studio a mounted voice does NOT stop the synth.** buildNote still runs on every noteOn (877). The duck only mutes it: VOICE_MIX 1 gives synth level 1 − mix = 0 (vi:889; core:1241-1245). That is CPU spent on silence.
- **VERDICT: cut it as a fallback.** Boot order already guarantees the first click: the kit and the default voice decode while the context is suspended (C:19-21). A key pressed before `ready` starts when the first batch lands, if it is still held (§7).
- **If 'synth' stays on the seg (C:150), port only the default sound.**
  - The default morph point (vx .5, vy .82: core:248) is SONAR .678 + TIDE .322 (scratch `C-nearest2.mjs`), at bright .70 and wide .5, so there is no extra oscillator.
  - Per note: sine f + sine f/2 into a low-pass at 1262 Hz (q .5), plus triangle f + sine f/2 into a low-pass at 701 Hz (q .6). A 12 ms, R .9 s, MAXV 16 with the steal.
  - Cut VOICES, nearest2, vx/vy, rng, ampTrem and scheduleRelease.
  - Master stop needs a 30 ms ramp, because `kill()` releases over R, up to .9 s (core:1957).

## 6. MOTION: the LFO and the one low-pass

**The Studio** (core:636-690) runs the LFO at audio rate, in cents.
- **Signal path:**
  - `lfo` is a free-running OscillatorNode, started at boot (637, 665).
  - It feeds `slew1 → slew2`, lowpass filters at Q −5.19 dB (W56: 654-656). Their corner (676) is `clamp(hz·8, 10, 60)` for sine, `clamp(hz·10, 20, 90)` for saw and sawi, and `clamp(hz·14, 40, 140)` for sqr.
  - Then `+ lfoBias(−1) → filtAmt → moveFilt.detune`. The same signal reaches `keysLP2..4.detune` through `keysLPdet[i]`, whose gain is each pole's engagement (657-661).
- **Depth:** `filtAmt.gain = amount·600·log2(max(baseHz,20)/20)`, with `baseHz = xToF(cutoff) = 20·1000^cutoff` (678-681; V/dsp.ts:174-178).
  - With `d = (1 − l)/2`, the corner becomes `baseHz·(20/baseHz)^(amount·d)`. The LFO only CLOSES the filter from the hand's corner; at amount 1 its bottom reaches the 20 Hz floor.
  - In the x-domain that is `x_eff = x·(1 − amount·d)`.
  - The view boots at cutoff 1, res 0, keySlope 1 (vi:121). At amount 0 the whole LFO is multiplied out (651-653).
- **Rate** (667-670):
  - hz mode: `clamp(rateHz, .05, 12)`.
  - sync mode: `tempo/60/b`, with b from SYNCS: 10 detents, 1/1 (b = 4) … 1/8 (.5) … 1/32, triplets included (V/dsp.ts:53-63).
  - Defaults: sync 1/8 and 3 Hz (248). The rate glides with τ 40 ms (675).
- **Shapes** (673-674): sine; saw, a rising sawtooth; sawi, a PeriodicWave with imag = 1/k, i.e. a FALLING ramp (663-664); and sqr. The glyphs match (V/../views/instrument/shape.ts:19-24).
- **Controls:** the MOTION knob writes amount 0..1 and shows 'OFF' below .005 (shape.ts:215-226). RATE steps through SYNCS; its chip toggles sync ⇄ hz, with `hz = .05·240^v` (242-250).
- **Not part of the one low-pass, so all cut:** res (the Q dB on moveFilt), keySlope (1–4 poles), and the low-cut ① with its three poles (284-311, 694-711).

**THE PAGE filter** (Pf:1-149, verbatim):
- The corner is `40·500^p` (60-61). It is a true 24 dB/oct Butterworth, with Q −5.33 and +2.32 dB (39-47).
- It is built once and never re-patched (109-115).
- `set(p)` moves both biquads with setTargetAtTime at now, τ 15 ms (122-127).
- Crossing FILTER_OPEN crossfades the dry and wet legs linearly over 10 ms (128-133, 73-80). A NaN is ignored (123).
- There is no `when` and no detune or mod input: the biquads are private to the closure (97-103).

**R1 wiring: the LFO writes p; filter.ts stays verbatim.**
```ts
const DIV_BEATS = { '1': 4, '1/2': 2, '1/4': 1, '1/8': 0.5, '1/16': 0.25 };            // SYNCS b (V/dsp.ts:53-63)
const L = { sine: (f) => Math.cos(2*Math.PI*f), sawi: (f) => 1 - 2*f, saw: (f) => 2*f - 1, sqr: (f) => (f < .5 ? 1 : -1) };
function motionTick() {                  // setInterval 16 ms while motion.on && amount ≥ .005 && ctx.state === 'running'
  const g = time.grid();                 // ctx time, NOT playhead() (heard time): the filter automates in ctx time
  const beats = time.running() ? (ctx.currentTime*g.sr - g.originFrame) * 4 / g.barFrames : ctx.currentTime*bpm/60;
  const d = (1 - L[shape](frac(beats / DIV_BEATS[div]))) / 2;                           // 0 = hand's corner, 1 = floor
  filter.set(pHand * (1 - amount * d));  // the core:660/681 law in the page's p domain (floor 40 Hz, not 20)
}
// hand move → pHand (written directly when motion is off) · motion off → filter.set(pHand) once
// master stop leaves pHand + motion alone (Pk:507-509: stop silences, it does not re-voice)
```

**What changes versus the Studio:**
- **Phase.** The LFO phase comes from the lattice, so a 1/8 sweep lands on the 8ths. The Studio syncs only the rate; its phase has drifted since boot (core:665).
- **Asymmetric smoothing.** The filter's τ of 15 ms works in Hz, not cents. Large steps therefore snap open but slide closed over 3–5τ.
  - That suits sawi, which pumps: a slow close, then a snap open.
  - It softens the closing edges of saw and sqr compared with the Studio's 10–140 Hz slew.
- **Depth.** Deep, fast sweeps fall short of the floor. For a 9-octave sweep at 8 Hz, `τ·(ln f)′ = 2.4`; it stays at .6 or below only at 2 Hz or slower.
- **Bypass flips.** With pHand ≥ FILTER_OPEN, every cycle crosses the bypass twice. The 10 ms crossfade between nearly identical legs makes this benign by design (Pf:22-27).
- **Hidden tabs.** The timer cadence there is the browser's; MOTION may step audibly, but nothing breaks.
- **Display.** The glass draws the same p_eff the LFO writes.
- **If R2's ear wants crisp squares or deep, fast sweeps,** the only route is audio-rate detune on the two biquads. That needs one additive export in filter.ts, a deliberate break from verbatim.

## 7. Port list

**src/signal/sampler.ts** is one module, with a banner per source so it can be diffed against the Studio.
- **Verbatim:**
  - V/sampler/types.ts:18-71 (SamplePlayOpts, SampleVoice, SamplePlayer) and 91-114 (KeysSampleSource)
  - `map`, the whole file (1-88)
  - from `zd`: rmsOver (58-65), peakOver (71-76), DEFAULT_XFADE_SEC (362) and bakeLoopCrossfade (385-411)
  - `mock` (14-192), exported as `createSamplePlayer`
  - `ms` (31-313), with its imports repointed. Keep the `.ts` specifiers so node can type-strip it (ms:24-25).
- **Dropped from types.ts:** the Material import (14), DrumSampleSource (79-86) and PadParams/RepitchParams (149-189). BassSampleSource (125-142) is already structurally satisfied (V/sampler/index.ts:93-96); keep it only if a bass rip ships.
- **Rip-encoder only, never shipped** (used only if a zone lacks points): analyzeZone, classifyEnvelope, refinePeriod, sustainSpan, isClipped, fadeEdges, loopCrossfadeSec.
- **Cut:**
  - V/sample-player.ts `makeSamplePlayer` (81-233): the drum path's player, with a different API (`play(buf, {dest})`). The drums reader decides.
  - sampler/index.ts: its mount* functions need engine seams.
  - pitch.ts: the rips carry their roots.
  - repitch-keys, chop-kit, slices, grid, mock-material, test-harness.
- **Tests:**
  - multisample.test.mjs (98 checks), repointed.
  - The bake blocks from zone-dsp.test.mjs (254-316).
  - voice-verify T1–T4 and T8, as the gate's OfflineAudioContext click check: `maxDelta < max(.08, 3·attackΔ)` (V/voice-verify.ts:62-66, 305).

**src/signal/keys.ts** adapts Pk; about 300 of its 673 lines survive.
- **Keep:**
  - The guarded manifest → specs parse (Pk:84-113), re-typed to C:135-148, with loop seconds = samples/48000 + onset Δ.
  - pool(6) fetch → decodeAudioData per zone (151-158, 301-321). A failed zone is skipped with one warning; if none load, it throws.
  - A per-voice GainNode → `createMultisample(zones, createSamplePlayer(ctx), {destination: gain, params: {layerMix 1, mode 'loop', release .09, hitFade .018}})` (45, 322-324).
  - The owner map, so a voice swap never cuts a held note (455, 463-487).
  - drop = dispose, then disconnect 150 ms later (330-336).
  - Master stop calls every resident's `ms.allOff()` first (644-652).
  - The guard law (27-29) and dry → filter → wet (198-203).
- **New:**
  - **Middle-first loading (C:176).** Sort the specs by |root − the centre of the mapped octave|. Build the first ~7 zones (±10 st) and swap that in, then rebuild over all zones and swap again. The zone set is fixed at construction (ms:130, 147), and the owner map carries held notes across both swaps.
  - A key pressed before `ready` waits in a pending set and starts when the first batch lands, if still held.
  - Residents: the current voice, plus any voice still ringing (TAIL_MS 300: 53, 380).
  - MOTION (§6), and the 'synth' voice if kept (§5).
- **Cut:**
  - Web MIDI, the sustain machine, the expression router and the note log (128-137, 495-595, 33, 204). These return with the R2 WebMIDI door.
  - The shelf, refresh, orderShelf, learnNames and neighbour prefetch (115-124, 250-274, 286-299, 389-422). There are five fixed voices, lazy on pick (C:176).

**src/signal/filter.ts** is Pf:1-149 verbatim. Only its import (Pf:36) changes, to `./types`. It satisfies SignalFilter structurally (C:191), since a missing `when` parameter is still assignable. filter.test.mjs (56 checks) needs `.ts` specifiers or the esbuild loader.

## 8. Conflicts with the frozen contract, and risks
1. **FILTER_OPEN:** C:189 sets 0.985, but Pf takes 0.995 from P/types.ts:61. filter.test.mjs asserts 0.995 at lines 59, 61 and 65 ("~19.4 kHz at the crossing"). Verbatim means 0.995; at 0.985 the corner at the crossing is 18.2 kHz.
2. **SignalFilter.set(p, when?) (C:191): R1 must ignore `when`.**
   - Booking p ahead fights the hand: a hand move lands at now, behind points already booked.
   - Pf's `fade()` reads `param.value` NOW even for a future t, which is the trap mock:161-163 describes.
3. **Units:** RipZone loop points are 48 k samples (C:145); the sampler wants seconds (ms:34-36). Convert as in §4.
4. **Voice (C:154-161) has no hit(), bend() or retune().**
   - hit() is the Studio arp's path. It needs no id and has its own 18 ms fade (core:856; ms:247-254).
   - bend() is DIVE, on the gate row's M key (core:976).
   - retune() handles ←/→ on held notes (core:1936-1954).
   - An arp built from noteOn/noteOff pairs rings 90 ms tails and needs unique ids, because a repeated id chokes at 25 ms (ms:229).
5. **Motion shapes and rates:** motion.shape 'tri' (C:166) is not a Studio shape; the Studio has sine, sawi, saw and sqr (core:673-674; shape.ts:19-24). LfoDiv (C:199) also drops the triplets, 1/32 and hz mode (V/dsp.ts:53-63; core:667-670).
6. **CFX Moody mixes modes:** 20 sustain zones and 1 decay zone (root 63, 3.88 s). Keys 62–64 will ring out while their neighbours hold. Force one mode per voice at encode, or pick another piano.
7. **Memory:** sustain zones keep their PCM twice (raw + baked). A mono Rd-2 at 48 k is about 27 MB, so keep resident only the current voice plus whatever is still ringing.
8. **Firefox has no cancelAndHoldAtTime** (per MDN). A future stop takes the cancel + set fallback (mock:170-172), which reads v0 NOW. That is exact on a flat sustain, and can step only for a stop booked inside a note's first 3 ms.
