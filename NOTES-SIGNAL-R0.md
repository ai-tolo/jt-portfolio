# SIGNAL · THE PORTFOLIO REBUILD · ROUND 0 (2026-09-23)

Branch `signal` (worktree `~/sites/jt-portfolio-signal`, off main c0456d7). Page `/signal`. Hands `:4636`
(launch entry `signal-rebuild`). Nothing merges, nothing pushes. The homepage keeps the old instrument.

## 1. What the Studio's main view is made of (:4400, v6-library 2a9e4a7, screenshot docs/signal-map/studio-1440.png)

Left to right, top to bottom, at 1440×900:

- **Shell** (not the instrument): a sidebar (PROJECTS, LIBRARY → FRESH takes), a top bar (date · bpm, the
  `signal | song` tabs, ARM + input device picker, mic + mute). The instrument fills the rest.
- **Three towers** on one row, each a lit module on the carbon chassis, each with the same grammar:
  a header pill (DRUMS / KEYS / BASS in the module's colour: yellow / cyan / violet), a name slot
  (the loaded voice: `SYNTH`, or a sample/kit slot), a small "load" keycap, then a **glass screen**
  with a filter/EQ curve and draggable nodes (drums: cover filter; keys: the low-pass + low-cut;
  bass: tone), then the module's controls, then a footer `M · S · gain`.
  - **DRUMS**: tempo glass `120 BPM` + `TAP`; pattern seg `FLOOR · BACK · HALF · BREAK` + the
    grid glyph (the 6×16 step strip lives inline under it when opened); knobs SWING · DENSITY;
    TEXTURE knob + `TAPE · DRIVE` seg; DELAY column (MIX · FB · TIME 1/8); SIDECHAIN knob.
  - **KEYS**: MOTION knob + `OFF` chip + RATE `1/8` (the LFO on the filter) + four LFO shapes;
    four FX towers DRIVE · MOD · DEL · REV, each a tall LCD meter (a fader) with a flavour seg
    beneath (WARM/CRUNCH/TAPE/FUZZ · PHS/FLNG/DBL/CHRS + RATE · note values · SM/MED/HALL/VAST).
  - **BASS**: modes seg `DRONE · PLUCK · SEQ` + a ROOT-LOCK padlock + the root `C1`; the 16-step
    bar strip (steps light only when they sound); DENSITY · GROOVE; INTENSITY · SUB · GLIDE knobs.
- **Hands row**: `◀ 0 ▶ OCTAVE` · `C MAJ KEY` · the chord readout glass · `CHORD` · `HOLD` ·
  `ARPEGGIATOR` + RATE · LENGTH · GROOVE knobs.
- **Chord rack**: 8 pads (Digits 1–8): stamp what you hold, tap to play it back.
- **Keybed**: C1–C7, the QWERTY letters printed on the playable octave (A S D F G H J K L white,
  W E T Y U O black), a bracket under the mapped span.
- **Gate row**: `GATE Z` · RATE 1/16 · SWING · (engraved S I G N A L) · `M DIVE` · SPEED · DIST.

## 2. What transfers to a visitor, and what does not

TRANSFERS (the instrument): the three towers with their controls; the drum pattern + step strip; the
bass modes + 16-step seq + root lock; the keys voice with the one low-pass and MOTION; the four FX
towers (as returns); the hands row (octave, key, chord, hold, arp + its three knobs); the chord rack;
the keybed with letters; the gate row (gate divisions, dive). The colour grammar (yellow drums, cyan
keys, violet bass, amber tempo, sapphire harmony). Master stop (Esc).

DOES NOT TRANSFER, and why:
- The shell: sidebar, projects, library, `song` tab. A visitor has no library and no projects.
- Capture: ARM, input device picker, the mic, the meter, line-in, LIVE. No mic by default (Law 2:
  a static page, mic only by prompt later). Always-on capture and takes are the Studio's product,
  not a visitor's toy.
- Voice bus / vocals, the voice rack, MLS calibration, output device picker (setSinkId), the
  4-channel L-8 routing. One stereo exit.
- The "load" slots (drag a sample onto a tower), saved voices, the voice panel, rendering from
  hardware (the SL73/MODX rip flow), the MIDI-in indicator (WebMIDI is a later-round door).
- Offline determinism (event log, keyframes, stems, goldens). Nothing is rendered offline; the gate
  measures live output instead.
- IR SPACES from ~/SignalLibrary (six 24-bit IRs). The reverb ships a small bundled IR set or a
  synthetic one under budget (reader E sizes the four bundled defaults; 483 KB base64 as-is).

## 3. The five laws (from Jon's brief) — repeated here so authors code against them
1. Leaves only under `src/signal/`: sampler, scheduler, drums, bass, chord machine, the one filter,
   effects returns. Never the Studio's shell/capture/store/views; no runtime import from the Studio.
2. Static Vercel page. Mouse/trackpad + computer keyboard. WebMIDI/Gamepad later, after one click.
   Phone = a still + one line.
3. About five rips on unlisted static paths; first sound <200 ms after the first click; <3 MB
   before the first sound; each voice lazy on pick, <1.5 MB; loop points survive the codec; Safari
   decodes it.
4. Zero setup, nothing hidden, no tutorial. IndexedDB save/reload loses nothing.
5. Headless gate every round (?mute=1; kill the probes): Chrome + Safari(WebKit) + Firefox boot,
   first sound on first click, no dropouts at 4× CPU throttle, master stop kills everything,
   screenshots at 1440 and 1024 pinned below the fold.

## 4. The rips (proposal; keep rolling with these unless Jon swaps)
Source: `~/SignalLibrary/voices/` (12 MODX keys rips, 48 k/24-bit stereo WAV, 21 zones every 3 st,
C0–C5). No bass rip exists on disk → the bass is the Studio's own synth (0 bytes).
| role | pick | zones | note |
|---|---|---|---|
| keys | Rd 2 Gallery (Rhodes) | 21 sustain, loops ≤4.2 s | the default voice: the one that loads before the first click |
| piano | CFX Moody | 20 sustain + 1 decay | |
| pad | Warm Back | 21 sustain, loops ≤6.4 s | |
| lead | Lead Feedbacker | 21 sustain, ~6.1 s | |
| bass | the engine's 303 (CLASSIC) | – | no rip on disk |
| drums | the house kit (signal-drumkit.ts, 6 lanes AAC) | – | already in both repos |
Encoding: mono AAC-LC (aac_at) ~96 kbps in .m4a, each zone cut at loopEnd + a tail copied from the
loop start (a codec shift of a few hundred samples then lands inside the loop, not on a cliff),
loop points re-expressed in decoded samples with a runtime onset check. Estimated: Rhodes ~0.9 MB,
pad ~1.3 MB (17 zones), lead ~1.2 MB (17 zones), piano ~0.9 MB. Unlisted paths under
`public/s/<8-hex>/`.

## 5. Round plan
- **R0** (this): brief · contract `src/signal/types.ts` · rip picks · contact sheet on /signal
  (three looks, same anatomy) · code map `docs/signal-map/`.
- **R1**: the instrument playable — drums, bass, keys from keyboard + mouse, the rips sounding, a loop
  you can build and hear (drum steps + bass seq + held chord/arp), master stop, save/reload.
- **R2+**: feel and look, WebMIDI + pad doors, cross-browser performance, the swap plan.

## 6. The anatomy the contact sheet mocks share (so Jon compares MATERIAL, not layout)
The device is 1120 px wide (the host scales it; never scale inside). Top to bottom:
1. TOP STRIP (40 px): wordmark `SIGNAL` left · tempo glass `120 BPM` + `TAP` centre-left · red
   `STOP` keycap right.
2. TOWERS ROW (three modules; widths ≈ 300 · 496 · 300 with 12 px gaps, ≈ 520 px tall):
   DRUMS (kit name `HOUSE`; glass with the cover-filter curve; the 6×16 step grid with lane names
   KICK SNARE HAT OPEN CLAP SHKR and a playhead column; SWING · DENSITY; pattern seg FLOOR BACK
   HALF BREAK; TEXTURE seg TAPE DRIVE + knob; DELAY MIX FB TIME; SIDECHAIN; footer M S gain) ·
   KEYS (voice seg RHODES PIANO PAD LEAD SYNTH; glass with the one low-pass and its node; MOTION knob
   + OFF chip + RATE 1/8 + 4 shape glyphs; four FX towers DRIVE MOD DEL REV with flavour segs;
   footer) · BASS (`SYNTH`; glass with the tone curve; modes DRONE PLUCK SEQ + padlock + `C1`; the
   16-step bar strip; DENSITY · GROOVE; INTENSITY · SUB · GLIDE; footer).
3. HANDS ROW (44 px): `◀ 0 ▶ OCTAVE` · `C MAJ KEY` · chord readout glass (`Cmaj7`) · CHORD · HOLD ·
   ARPEGGIATOR + RATE LENGTH GROOVE.
4. CHORD RACK (36 px): 8 pads numbered 1–8, one lit with a degree chip.
5. KEYBED (100 px): C2–C6, letters on the mapped octave, the bracket under it.
6. GATE ROW (44 px): `GATE Z` · RATE 1/16 · SWING · engraved `S I G N A L` · `M DIVE` · SPEED · DIST.
Fonts: the site's IBM Plex Mono for chrome; Orbitron for the tempo digits is allowed (the site has it).
