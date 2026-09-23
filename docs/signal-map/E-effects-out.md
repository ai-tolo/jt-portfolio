# E · THE EFFECTS, THE EXIT, THE ASSETS

Reader E · R0 · 2026-09-23. Read-only on **v6** = `~/sites/signal-studio-v6lib` @2a9e4a7 and **page** = `~/sites/signal-studio-page` @67b6b58.
Cite keys: `core` v6 src/engine/core.ts · `fxw` v6 src/engine/fx-worklet.ts (`pfxw` = page copy: identical plus a `kill`
switch, lines shift +11…+46) · `irs` engine/ir-set.ts · `ird` engine/ir-default.ts · `fdnp` engine/fdn-plan.ts · `fo`
engine/final-out.ts · `dsp` engine/dsp.ts · `eidx` engine/index.ts · `efx` v6 views/instrument/effects.ts · `mh`
…/module-header.ts · `vidx` …/instrument/index.ts · `vr` v6 views/instrument/voice-rack.ts (`pvr` page copy) · `pout`
`prp` `pstop` = page src/page/{out,rack-pool,stop}.ts. core, ir-*, fdn-plan, final-out, dsp are byte-identical in both trees.
**sim** = WORKLET_SRC evaluated in node under a stub AudioWorkletProcessor (48 kHz, 128-frame blocks, 0.25-peak sines =
−15.05 dBFS RMS). **codec** = ffmpeg `aac_at` encode → ffmpeg decode, compared in node (EDC, octave energies, lag).

## 0 · Verdicts
1. Port the keys FX exactly as core wires them: DRIVE insert, MOD parallel wet, DEL + REV returns, all summing into the keys
   `glue` (§6). Code them as return objects with per-source send gains, so drums/bass can join later by moving ONE edge.
   The drums' delay + room stay inside the drum module (they are drum voicing, not the FX towers).
2. Two Studio bugs NOT to port: **TAPE silences the left channel** (sim: L = −∞ dB at drive 0.3/0.6/1.0; fix verified in sim,
   §1) and **the keys delay ignores a live tempo change** (§3).
3. REV assets: ird holds THREE IRs, not four (VAST falls back to HALL, irs:105): 480,000 base64 chars = 360,000 B PCM
   (file 483,164 B, 297,604 B gzip -9). Ship four stereo AAC-LC 96 kbps / 24 kHz `.m4a` instead: SM 7.9 KB · MED 15.7 ·
   HALL 29.1 · VAST (vvv_cathedral_vast cut at 4.0 s) 50.8 = **103.4 KB total, 7.9 KB before the first sound** (or 0 if SM
   mounts after the first note, the E1c way). Not mono (L/R correlation ≈ 0: a mono IR has no width). Not the FDN for R1 (§4.5).
4. Master: keep every stage (preLimit, masterHP, soft, limiter, clamp). Keep `glue` too: since E0 it is a keys stage, not a
   master stage (§5).
5. AudioWorklet is secure-context-only. Over `http://<tailscale-ip>:4636` `ctx.audioWorklet` is undefined, `ensureFxWorklet`
   resolves false and core's unconditional `new AudioWorkletNode(…'sig-sat')` throws (fxw:986-993; core:313-318; eidx:236-237):
   no sound at all. The port needs a fallback (WaveShaper `driveCurve` for DRIVE, bypass for MOD) or https/localhost for hands.

## 1 · DRIVE = `sig-sat` (keys insert)
Graph `…keysLP4 → ampTrem → shaper(sig-sat) → post → keysGainNode` (core:531-537); built unconditionally, `outputChannelCount [2]` (core:313-320).
| | |
|---|---|
| params | `drive` 0..1 (def 0), `flavor` 0..3 = warm · crunch · tape · fuzz (def 0), both k-rate (fxw:150-158; enum fxw:1005-1009) |
| staging | k = drive² (fxw:223); input gain gi = 1 + drive·{fuzz 8, crunch 3, warm/tape 2} (fxw:180); warm (1+9k)x/(1+9k·abs x); crunch asymmetric kp 22k / kn 9k; tape tanh(gx)/tanh g, g = 1+5k; fuzz hard clip at gain 1+26k (fxw:125-146, 191-197) |
| makeup | measured per (flavor, drive): in/out RMS of a 0.25-amplitude sine through the curve, recomputed only on change (fxw:176-189), applied after shaping (fxw:240-241) |
| anti-alias | first-order ADAA, EPS 1e-5 → midpoint fallback (fxw:117-122, 266-271), inside 2× oversampling: 61-tap Blackman half-band, both polyphases DC-normalised (fxw:57-80, 83-114) |
| latency | 30 samples at 1× = 0.625 ms @48 k (sim impulse), the same at drive 0, which is a wire that still runs the oversampler (fxw:234-238). The "14 samples" in fxw:47-50 is the 29-tap design the file replaced (fxw:54-56) |
| smoothing | drive: setTargetAtTime τ 20 ms (core:717-719) + a per-block 20 ms one-pole in the processor (fxw:216-219); flavour = hard switch (core:719; fxw:221) |
| extras | crunch DC blocker r 0.9985 ≈ 11.5 Hz (fxw:244-249); tape pre/de-emphasis 0.35 (fxw:263, 275) + wow line (fxw:278-288) |
| defaults | engine drive 0.6 warm (core:249, 251); tower def 0.6, seg WARM CRUNCH TAPE FUZZ (efx:63) |

sim levels: warm/crunch/fuzz come out within ±0.1 dB of the input at drive 0.3/0.6/1.0 (DRIVE pushes into saturation, not
louder: fxw:9-10). **TAPE: L silent (−∞), R +0.38/+1.69/+3.27 dB hot.** Root cause: ONE `wowPos`/`wowPhase` for both channels
(fxw:167-168), advanced only on the last channel (fxw:288), while process() is channel-outer (fxw:226-253): channel 0 writes a
whole block into one slot (wowPos moves 256 per block, so it is the same slot forever) and reads 4–124 slots back = zeros.
**Fix (sim: L ≡ R bit-identical at every drive):** `wowPos`/`wowPhase` per channel, phase step 2π·0.7/(2·sampleRate) (shape()
runs at 2×), `dly = 64 + 34·sin` (±0.35 ms at 2×, the comment's own figure, fxw:278-279), `wowPos[c]++` on every call. Then
measure tape's makeup through shape() (the emphasis pair is what makes it +1.7 dB hot at 0.6). Knock-on in the Studio today:
under TAPE the MOD send is silent too (it reads channel 0 only, §2) and the REV/DEL inputs are right-only.

## 2 · MOD = `sig-mod` (keys, parallel wet)
Graph `keysGainNode → sigMod → modMix → glue`, WET ONLY, the dry never passes it (core:549-565); level `modMix = 0.9·mod`, τ 30 ms (core:566-575, 729).
- params `mode` 0 phaser · 1 flanger · 2 doubler · 3 chorus (def 3), `rate` 0..1 (def 0.5), k-rate (fxw:300-309); enum order =
  the seg's PHS FLNG DBL CHRS (fxw:1011-1015; efx:64).
- RATE multiplies the recipe's own speed by 4^(2(r−0.5)) = 0.25×…4×, exactly 1 at the 0.5 detent, smoothed τ 30 ms/block
  (fxw:339-341; core:576-581); the ribbon's ghost prints ×mult (efx:133-137). Base speeds phaser 0.35 Hz · flanger 0.4 ·
  doubler 0.09 · chorus 0.6 (fxw:346).
- PHASER: 6 first-order allpasses, exponential sweep 200 Hz…2.2 kHz (f0 = 200·11^(0.5+0.5 sin)), stagger ×(1+0.22 s), R ×1.12, fb 0.3 (fxw:354-372).
- FLANGER: one Lagrange tap 0.4–3.9 ms on a squared raised-cosine sweep, fb 0.45, R tap ×1.06 (fxw:373-382).
- DOUBLER: 22 ± 1.1 ms (L), 27 ± 1.3 ms (R) on two incommensurate LFOs (phase ×1.317, +1.9 rad) (fxw:352, 383-387).
- CHORUS: 3 voices 14/18/22 ms ± 1.4 ms at 120°; L = .62 v1 + .38 v2, R = .62 v3 + .38 v2 (fxw:388-397). 3rd-order Lagrange,
  4096-sample line = 85 ms (fxw:299, 320-330).
- Defaults mod 0.85 · chorus · rate 0.5 (core:251; efx:64). sim wet vs input: chorus −2.7 dB, phaser −0.7, flanger −0.3,
  doubler 0 → the default chorus wet sits ≈ −5 dB under the dry. Jon's voicing; keep.
- Port fixes: it reads `inputs[0][0]` only (fxw:343) → feed 0.5·(L+R) so a stereo source is not chorused from the left alone;
  pfxw checks `_dead` in SigMod.process (pfxw:344) but never installs the `kill` listener (pfxw:311-330) → add it.

## 3 · DELAY (keys return; the drums own a second one)
Keys graph (core:322-328, 539-543): `keysGainNode → dpre 0.9 → delL → delR`; `delL → pan −0.65 → dmix`, `delR → pan +0.65 → dmix`;
feedback `delR → damp (LP 3200 Hz, Q −6.02 dB) → dfb → delL` (serial L→R, fed back R→L = ping-pong); `dmix → glue`. DelayNodes max 1.2 s.
- ONE fader drives both: feedback `dfb = min(0.75, 0.6·delay + boost)`, boost {'16' 0.14, '8' 0.05, '8d' 0.05, '4' 0} only when
  delay > 0; return `dmix = min(0.6, 0.7·delay)`; τ 20/50 ms (core:722-724). THROW gesture pins 0.85/0.55 (core:723-724, 966).
- Divisions '4' '8' '8d' '16' = 1, ½, ¾, ¼ beat (core:731); seg 1/4 1/8 1/8· 1/16, default '8', fader default 0 (efx:65;
  core:249). Time = clamp(beat·mult, 0.02, 0.98) s with a τ 30 ms glide (core:725, 731): '4' loses sync below 61.2 BPM →
  port with `createDelay(2)` and clamp 1.95 s.
- **Tempo bug:** `set('tempo')` calls applyMotion/applyBassMove/applyDrumDelay but not applyFx (core:1867), and `delayTime()` is
  read only inside applyFx (core:725). A live TAP leaves the keys echoes on the old grid until an FX knob moves (only snapshot
  loads call `apply()`, eidx:423). Port: re-time the delay inside the tempo setter.
- DRUM DELAY (drum module; stays there): its own aux off drumTrim (pre-gain) → ddPre → ddL → ddR (max 8 s), pans ∓0.6, damp
  3200 Hz Q −6.02, fb ≤ 0.9, return ddMix → drumGainNode (core:1068-1101); index 0..4 = ['1/16','1/8','1/8.','1/4','1/2'] =
  [¼,½,¾,1,2] beats (core:101-104, 1082); defaults mix 0 · '1/8' · fb 0.35 (core:254); wet + fb gated by `fx.beat`, so the tail
  dies on stop, and it follows tempo (core:1102-1107, 1867).
- vr's delay is the mic's (fb cap 0.55, 0.35 on speakers, vr:99-100) and still carries the pre-W26 linear Q constants (hp 0.707
  vr:237, damp 0.5 vr:311: the unit bug core fixed, core:324). Do not port it.

## 4 · REV = SPACES (keys return)
### 4.1 graph, switching, mounting, parking
- Four engraved slots small · med · hall · vast (irs:20), one ConvolverNode each, `normalize = false` set BEFORE `.buffer`
  (core:340-352): level is owned by the asset set, not by Chrome's undefined normalisation (core:329-336).
- All four are fed all the time: `keysGainNode → irConv[s] → irGain[s] → rmix → glue` (core:546-547), exactly one irGain at 1
  (core:351). Return `rmix = 0.7·reverb`, τ 20 ms (core:339, 726). Defaults reverb 0.22 · 'small' (core:249; efx:66).
- Slot change = crossfade of already-running convolvers, setTargetAtTime τ 4 ms (≈ 12 ms), never a buffer swap; the outgoing
  tail rings as it fades, "walking between rooms" (core:733-747). Mount = `setIrSlot`: slot gain pinned to 0, assign, ease back
  τ 6 ms after 20 ms (core:749-780). The live core boots with EMPTY convolvers and mounts the bundled ladder when it decodes
  (eidx:241-283). A `.buffer` assign stalls Chrome's main thread ≈ 35 ms per IR-second (irs:11-12; core:234; eidx:259).
- B11 park (live only): an AnalyserNode leaf on keysGainNode (fftSize 2048), a 250 ms poll, floor 1e-5 = −100 dBFS
  (core:453-505); a rung whose send has been silent longer than its tail is disconnected, the poll retires when all are down,
  and `wakeSpaces()` at the top of `buildNote` reconnects before any keys voice exists (core:462-497, 791-796). Why: four
  stereo-IR convolvers = 8 Chrome convolution threads; parking saved 8.8 of 14.6 % of a core (core:402-429).
- Tail law `tailSecFor = max(IR s, {1.5, 2.5, 4, 6}) + 1 s`, grow-only for golden integrity (irs:111-124). No goldens here →
  park after the IR's own length.

### 4.2 what ird actually holds (stereo 16-bit LE PCM @ 24 kHz as base64; decoded + OfflineAudioContext-resampled, irs:27-90)
| id → slot | cut from | s | frames | PCM B | b64 chars | onset | E-gain @48 k | L/R corr | EDC −20 / −40 dB |
|---|---|---|---|---|---|---|---|---|---|
| room → SM | vvv_room_small (0.722 s) | 0.45 | 10,800 | 43,200 | 57,600 | 2.1 ms | +13.7 dB | −0.02 | 0.28 / 0.35 s |
| chamber → MED | vvv_chamber_medium (1.641 s) | 1.10 | 26,400 | 105,600 | 140,800 | 8.7 ms | +13.4 dB | +0.01 | 0.55 / 0.94 s |
| hall → HALL **and** VAST | vvv_concerthall_large (3.870 s) | 2.20 | 52,800 | 211,200 | 281,600 | 27.3 ms | +17.0 dB | 0.00 | 1.06 / 2.01 s |

(ird:1-26 header, 46-55 entries; `mapSlots` vast → 'vast' | 'cathedral' | 'hall' lands on hall, irs:93-107.) E-gain =
sqrt(Σh²) after the 2× resample. The ladder is HOT: every print sidecar in `~/SignalLibrary/ir/*.json` carries
set_gain_linear 9.5641 (+19.6 dB), and the keys REV level law 0.7·reverb runs on the ladder at that level (the E1a set-gain law,
core:333-336), so the keys ladder is never
"unprinted" (pvr:251-258 unprints the MIC rack only). REV level moves with the ctx rate by 10·log10(rate/48000) dB (normalize off).

### 4.3 budget (sizes in KB = 1000 B)
| encoding | SM | MED | HALL | VAST 4.0 s | total | note |
|---|---|---|---|---|---|---|
| ird as JS | – | – | – | (= HALL) | 483 / 298 gz | parsed and atob'd on the main thread |
| 16-bit stereo WAV 24 k, gzip | 31.8 | 75.5 | 152.2 | – | 259.5 (3) | |
| FLAC stereo 24 k | 34.7 | 68.3 | 116.8 | – | 219.8 (3) | lossless |
| 16-bit MONO 24 k raw / FLAC | 21.6 / 21.0 | 52.8 / 36.9 | 105.6 / 59.8 | – | – | **rejected: corr ≈ 0, mono = no width** |
| Opus 64 k webm | 4.2 | 8.3 | 16.3 | – | 28.8 (3) | Safari decodeAudioData support is version-dependent |
| **AAC-LC 96 k stereo .m4a** | **7.9** | **15.7** | **29.1** | **50.8** | **103.4** | recommended |
| AAC-LC 64 k stereo | 5.5 | 10.7 | 19.7 | 34.2 | 70.1 | octave error up to ±0.8 dB |

codec at 96 k, all four: EDC −10/−20/−30/−40 dB points within 7 ms of the source; octave energies 62 Hz–8 kHz within
±0.3 dB (8–12 kHz +0.2…+0.7); broadband energy within 0.13 dB; decode onset lag 0 (ffmpeg trims the priming via the edit
list); waveform SNR only 8–16 dB, which a diffuse tail does not reveal. Decoded length +1.2–1.4 k padding frames: trim to the stored length.
**RECOMMEND:** `public/s/<8-hex>/{sm,med,hall,vast}.m4a`, stereo AAC-LC 96 kbps at 24 kHz. SM/MED/HALL re-encoded from the
exact ird cuts; VAST = vvv_cathedral_vast cut at 4.0 s with the bundle's 120 ms exponential taper: its EDC there is −36.0 dB,
the same truncation depth the bundle accepted for HALL at 2.2 s (−35.9 dB); same print lane, same set gain, no trim (E-gain
+14.1 dB, onset 3.1 ms). Load: fetch all four at idle after first paint; decode with the live ctx's `decodeAudioData`
(resamples to its rate); mount SM right after the first note is scheduled (setIrSlot is silent by construction), then MED /
HALL / VAST one per requestIdleCallback (≈ 16 / 39 / 77 / 140 ms of Chrome main thread each), never on a click path; a rung
picked before it is mounted mounts then. Onset check: store each file's known onset and shift the decoded buffer so its first
sample above peak·1e-2 lands there (a decoder that kept the 2112-sample priming would add 88 ms of pre-delay).

### 4.4 CPU policy (a deviation: flag for Jon's ear)
Feed only the SELECTED rung: a per-rung input tap switched with the rack-pool fork crossfade (FORK_FADE 20 ms, prp:158,
426-457); the outgoing rung keeps its output at unity, rings its tail out, then parks after its IR length; reverb < 0.001
closes every tap. At rest 0 running convolvers, playing 1 (2 during a switch tail), against core's 4 always fed. A switch
then sounds like "new notes in the new room, old notes finish in the old" (prp:32-35) instead of "both rooms hold the history" (core:733-736).

### 4.5 the FDN (`fdnp` + `sig-fdn`) is not R1's REV
fdnp is only the dial→unit map for `sig-fdn` (longest line 80–2000 ms exponential, fb ≤ 0.98, mod 0.05–4 Hz with depth ∝ 1/rate
holding 7 cents) (fdnp:22-85). `sig-fdn` is the voice rack's 5th rung WASH: 8 modulated lines (primes 23…211), a seeded
orthogonal matrix, greyhole topology, Dattorro input diffusers, damping 10,990 Hz / low-cut 40 Hz, FDN_OUT 8.75 to sit beside
the hot sagittarius print (fxw:590-660, 678-959); defaults 895 ms, fb 0.588 → RT60 6.45 s (vr:121-130). Zero asset bytes, but
22.3 KB raw / 5.9 KB min of worklet, ≈ 2.4 MB of delay memory per instance (vr:606), per-sample JS on the audio thread, and
a different sound from the keys ladder. A later-round WASH door.

## 5 · The master chain, in order (core:355-369, 598-634; fo:78-171)
| stage | constants | cite |
|---|---|---|
| keys `glue` (keys dry + MOD/DEL/REV returns only, since E0) | DynamicsCompressor thr −15 dB, ratio 4, atk 5 ms, rel 250 ms, knee left at the 30 dB default | core:355-364, 538-547, 565 |
| `glueMakeup` | 1.0, measured (keys RMS rises monotonically with DRIVE; no deficit to make up) | core:56-68, 365 |
| `duck` (kick sidechain on keys + bass + SUB exciter) | depth = min(sc/0.65, 1), hard = max(0, (sc−0.6)/0.4), floor = 1 − 0.9·depth − 0.1·hard, attack 12 − 6·hard ms, hold 0.14·hard beat, release τ min(0.34 beat, 0.2 s)·(1+4·hard); sc default 0.3 → −4.7 dB | core:1201-1216, 250, 1584, 1653 |
| drums join | drumBus → preLimit, bypassing glue and duck | core:608 |
| `preLimit` | 0.92 (−0.72 dB) | core:366 |
| `masterHP` | high-pass 20 Hz, Q −3.01 dB (the W56 thud fix); the LIFT gesture sweeps it to 900 Hz / Q 1.25 | core:585-598, 954-963 |
| `soft` | WaveShaper tanh(1.12x), 1024 points, 2×; input clamps to ±1, so the ceiling is tanh 1.12 = 0.8076 (−1.86 dBFS); small-signal +0.98 dB | core:367; dsp:151-159 |
| `limiter` | thr −1.5 dB, knee 0, ratio 20, atk 2 ms, rel 90 ms; its input already sits ≤ −1.86 dBFS, so it only catches the 2× overshoot | core:368 |
| `masterTap` → `finalOut` | trim ¼ → WaveShaper `clampCurve` (8192 points over ±4; the identity up to 0.708 = −3 dBFS, then tanh toward 0.995), oversample none; one per ctx | core:603, 611, 634; fo:78-111, 156-171 |

Compressor facts (the WebKit/Blink kernel all three engines share): a static makeup (1/curve(0 dBFS))^0.6 → glue ≈ +0.7 dB,
drumGlue ≈ +0.6, limiter +0.86; and a fixed ≈ 6 ms lookahead per compressor, so keys (glue + limiter) and drums (drumGlue +
limiter) run ≈ 6 ms behind bass (limiter only) today. Clamp in → out: −3 → −3.00, −1.5 → −1.59, −1 → −1.21, 0 → −0.64,
≥ +6 → −0.04 dBFS. Engine peak ≈ 0.8076 × 1.1034 = 0.891 (−1.0 dBFS) → −1.21 after the clamp.
**RECOMMEND:** keep all of it; every stage is one native node (the cost lives in the convolvers and worklets). Keep `glue` in the
keys module: it is the keys' voice, and removing it moves keys level ≈ 0.7 dB, their dynamics, and their timing by 6 ms. Keep
the clamp: one route now, but it is what guards the soft stage's overshoot at the DAC. Drop `voiceBus` (core:527, 610), the
finalOut WeakMap multi-route layer (fo:145-178 → one inline clamp), and LIFT/THROW unless a later round shows them.

## 6 · Send/return model for the visitor
Studio: every FX is the keys' (the four towers live in KEYS: efx:62-67, the screenshot); the drums carry their own delay + room
glue (core:1027-1101); bass has none, by design. The keys rips enter at keysSampleBus → keysBus (core:280-282), so a Rhodes rip
gets DRIVE 0.6 warm + chorus 0.85 + REV 0.22 SM by default, exactly as the synth does. Proposed graph; R1 wires only the keys
sends, the other send gains exist at 0 and are not exposed (Law 4: nothing hidden):
```
KEYS  voices→keysBus/arpBus→inG .9→[HP×4 → LP×4: the one filter]→ampTrem→DRIVE sig-sat→post→keysGain(M·gain)
        ├─ dry ───────────────────────────────────────────────────────────→ glue→glueMakeup→duck ─┐
        ├─ MOD sig-mod → modMix(.9·mod) ──────────────────────────────────→ glue                   │
        ├─ send.del.keys(1) → DEL dpre .9 → ping-pong → dmix(min(.6, .7·del)) → glue              │
        └─ send.rev.keys(1) → REV tap[slot] → conv[slot] → rmix(.7·rev) → glue                    │
BASS  …bassGate→bassGain(M·gain)→bassBus→duck; bassBus→SUB exciter→duck; send.rev.bass(0) ─────────┤
DRUMS …drumGlue→warm→drumTrim→drumGain(+own delay ddMix +room .16)→drumBus; send.rev.drums(0) ─────┤
                                        duck + drumBus → preLimit .92 → masterHP → soft → limiter → out
```
- R1 = the Studio bit-for-bit for the keys (levels on the returns, returns into glue, so tails are glued and ducked).
- The day a drum/bass REV send becomes visible: move the returns' output from glue to a new `fxSum → duck` join (NEVER glue:
  a drum hit would drive the keys compressor, the pumping E0 removed, core:356-364), and move the REV level from `rmix` onto the
  per-source sends (otherwise one return fader rides every module). The drum delay stays the drums' (its tower has MIX/FB/TIME).
- One master, one exit (§5, §8).

## 7 · Mute, solo, stop
- Module gain = gain × (1 − mute), gain 0..1.25, τ 20 ms, pinned exactly at t = 0 (core:371-398, 1919-1926); the footer knob
  sends 1.25·v with its detent at 0.8 = unity (mh:263-270); M toggles `${role}Mute` (mh:243-249).
- Placement: drumGainNode sums dry + own delay + room, so drum mute cuts the echoes too (core:372-376, 1025, 1065, 1101);
  keysGainNode sits BEFORE the MOD/DEL/REV sends, so keys mute lets the DEL/REV tails ring out (core:533-537); bassGainNode
  after bassGate, before the SUB exciter (core:380-382, 1584, 1653).
- Duck exceptions: muted drums do not pump, drum gain 0 still pumps, any solo stops the pump (core:1202-1210).
- Solo in the view: a radio, a second click clears, the others dim (vidx:644-658). In the engine it writes `.value` 0/1 on
  keysBus + arpBus (pre-FX), bassBus, drumBus (post-chain) (core:1977-1992): an instant step (a click on held sound); keys soloed
  away still ring their tails, drums soloed away lose their echoes at once. Port: the same split (solo on the bus nodes, mute on
  the gain nodes; two writers never share a node, core:521-524), ramped τ 5 ms.
- Stop today: `kill()` releases held voices over their musical release (R 0.14–0.9 s, core:813, 822-826), turns beat, bass, arp,
  latch off, all sinks off, resets gestures, clears the clock, returns duck to 1 and gates the drum delay (core:1956-1966). It
  never touches dfb/dmix/rmix/modMix: keys echoes (fb ≤ 0.75) and the IR ring on. Visitor master stop = pstop's registry and
  capture-phase Escape (pstop:39-79, verbatim) sweeping: kill() with a hard ≤ 15 ms voice release, then the rack-pool hush on
  the returns: dmix/rmix/modMix → 0 in 15 ms and dfb → 0, held for max(mounted rung length, 2 × delay time: the two lines run in series) + 20 ms, then applyFx
  restores over 250 ms (prp:166-168, 231-236, 489-511). A note played inside the hold is heard dry until the room returns.
  Gate: output below −90 dBFS within 150 ms of Escape, read on out.ts's level analysers.

## 8 · Port list
| target | from | verdict | size |
|---|---|---|---|
| src/signal/fx-worklet.ts | pfxw:46-418 (half-band, Half2x, ADAA, curves, SigSat, SigMod) + pfxw:1025-1061 (per-ctx WeakMap, Blob-URL addModule, enums) | ADAPT: TAPE wow fix, tape makeup, SigMod stereo input + kill listener; drop voicegate, microshift, fdn (mic rack only) and unity (test spike) | 17.8 KB raw (6.6 KB gz) as an inline string; 6.3 KB (2.6 KB gz) if pre-minified. The whole module: 51.8 raw / 15.9 min / 5.5 gz |
| src/signal/effects.ts | core:269-352, 355-365, 402-505, 529-590, 712-780, 796 | ADAPT: keys FX + returns + park + rung taps + tempo re-time + hush/restore; a loader for the four m4a with the onset check (replaces irs:27-90); the no-worklet fallback | ≈ 350 lines TS, ≈ 5 KB min (est.) |
| src/signal/out.ts | core:366-369, 598-611; fo:78-111; pout:149-177, 184-196, 365-371 | ADAPT: master chain + inline clamp + forced-stereo `main` + level analysers; drop setSinkId, enumerateDevices, the getUserMedia label grant (pout:296-304: a mic prompt for a visitor), the alt route, 4-channel wiring and the mix tap | ≈ 120 lines, ≈ 1.5 KB min (est.) |
| src/signal/stop.ts | pstop:1-79 | VERBATIM | 4.9 KB source, ≈ 0.5 KB min |
| softCurve | dsp:151-159 | VERBATIM | < 0.2 KB |
| ird + irs decode/resample | ird; irs:27-70 | CUT (four m4a replace them) | −298 KB gz |
| rack-pool | prp | CUT; reuse `pin()`, HUSH/RESTORE, the fork fade | – |
| voice-rack, fdn-plan, sig-fdn | vr, pvr, fdnp | CUT (mic-only; unprint must never touch the keys ladder) | – |

Contract fields (core:82-104, 249-254; efx:62-67): drive 0..1 (0.6) · driveType warm|crunch|tape|fuzz (warm) · mod 0..1 (0.85) ·
modMode phaser|flanger|doubler|chorus (chorus) · modRate 0..1 (0.5 = ×1) · delay 0..1 (0) · delayDiv 4|8|8d|16 (8) · reverb 0..1
(0.22) · revSize small|med|hall|vast (small) · {drum,keys,bass}Gain 0..1.25 (1) · {drum,keys,bass}Mute 0|1 (0) · solo: one of
drums|keys|bass or none · drumDelayMix 0..1 (0) · drumDelayTime 0..4 (1 = 1/8) · drumDelayFeedback 0..1 (0.35, ≤ 0.9 at the
node) · sidechain 0..1 (0.3). IR asset manifest per rung: {url, seconds, onsetMs, bytes}.
