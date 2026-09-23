# SIGNAL · ROUND 1 · THE INSTRUMENT PLAYABLE (build brief, planner-owned)

Read `src/signal/types.ts` (the frozen contract) and your lane's doc(s) in `docs/signal-map/` before writing a line.
Branch `signal`, worktree `~/sites/jt-portfolio-signal`. Hands `:4636` (`signal-rebuild`), gate `:4637`. Nothing merges,
nothing pushes. Scratch files: `/private/tmp/claude-501/-Users-tolo/a1c7365a-3a62-4cf9-a768-e8fc57dd9bca/scratchpad/r1-<lane>-*`.

## 0. Laws (short form; NOTES-SIGNAL-R0.md §3 has the long one)
1. Leaves only under `src/signal/`; every ported leaf carries a banner `// from <repo>/<path>:<lines> (<commit>)`; no import
   from the Studio trees, ever. 2. Static page, mouse + keyboard. 3. Rips on the unlisted path (`RIP_ROOT`), first sound < 200 ms
   after the first click, < 3 MB before it, each voice < 1.5 MB, lazy on pick. 4. Nothing hidden, no setup, no tutorial; the
   grid is the truth; IndexedDB save/reload loses nothing. 5. Headless gate (Chromium + WebKit + Firefox); kill every probe.
- ERASABLE TS ONLY (types, interfaces, `as const`; no enums/namespaces/parameter properties): `node x.test.mjs` imports the
  `.ts` files directly on node 24 (no loader; proven on types.ts). Tests live beside the module: `src/signal/<name>.test.mjs`,
  run with `source ~/.nvm/nvm.sh && node src/signal/<name>.test.mjs`, exit 0 = green, print `<name>: N/N`.
- No file is shared between lanes. If two lanes need the same 5-line helper (xToF, nodeQ…), each keeps its own copy in its
  own file; the integrator may dedupe later. The only shared imports are `./types.ts` and the leaves named in your scope.
- Never touch: `src/components/SignalMachine.astro`, `src/components/studio/*`, `src/pages/index.astro`, the other lanes' files.
- Sound safety while you work: never engage audio in the live preview pane; probe with headless Chrome `--mute-audio` and kill
  it (`chrome.kill()` in a finally); before you finish, `pgrep -fl -- '--headless' | grep r1-<lane>` prints nothing.

## 1. Decisions taken from the maps (do not re-litigate; cite the doc if you must deviate, and say so in your report)
- TIME = THE PAGE's lattice (grid.ts verbatim + `lineFrame/linesIn`), `lookahead.ts` verbatim, ONE scheduler shaped like
  the page's click (25 ms timer, horizon ≥ 120 ms, late lines skipped, every booking tracked) + the core's wantsClock law
  (D §1.3). Tempo change lands on the next beat keeping the count. BPM 60..180, default 120.
- DRUMS: the 6×16 grid is the truth (no auto/seq split; A §2's generator regenerates it); house kit = `src/components/signal-drumkit.ts`
  (already in the repo, byte-identical to the Studio's), decoded on the live ctx at boot; lanes kick snare hat openhat clap
  shaker (= the Studio's perc, trim .4); house kit never chokes (A §4); the drums' OWN delay (A §5, 5 divisions) and room
  stay inside drums.ts; sidechain = `effects.duckHit` per kick (A §5); default density .5, swing 0 (reset 0), sidechain .3.
- BASS: the 303 CLASSIC synth (B §2-3), modes drone/pluck/seq, PULSE 2 sixteenths (a two-bar strip; B #7), root as MIDI folded
  to 45..115 Hz at use, `armed` + `root` = the padlock's two states (B #2), INTENSITY = heat (B #3), oct 'base'|'sub',
  a `sub` cell keeps the Studio's ×0.5 (B #10 noted, not changed), after a release stay on the last target (B #8), bass out →
  `out.duck` + the SUB exciter; gate + dive reach it via `gesture()`.
- KEYS: sampler leaves verbatim (C §7: multisample-map, bakeLoopCrossfade, mock-sample-player as the real player,
  createMultisample), the bake at LOAD (C §3), loop seconds = samples/48000 with shift 0 as the law (onset = sanity only),
  middle-first loading (C §7 New), residents = current voice + ringing tails, no synth voice (C §5: four rips), MOTION =
  a control-rate writer of p into the verbatim filter (C §6 code), FILTER_OPEN 0.995, release .09 / hitFade .018,
  velocity constant 0.9 from the keyboard, `allOff` on blur + visibilitychange.
- EFFECTS: the keys FX exactly (E §6 graph): DRIVE insert (sig-sat, TAPE wow fix E §1), MOD parallel wet (stereo-summed
  input, kill listener), DELAY + REV returns into the keys glue → glueMakeup → duck; the four IRs as stereo AAC-LC 96 kbps
  24 kHz `.m4a` under `public/s/59e8a3b3/ir/{sm,med,hall,vast}.m4a` (E §4.3 recipe: SM/MED/HALL = the bundle's exact cuts
  of vvv_room_small / vvv_chamber_medium / vvv_concerthall_large at 0.45 / 1.10 / 2.20 s; VAST = vvv_cathedral_vast cut at
  4.0 s with a 120 ms exponential taper; the sources are `~/SignalLibrary/ir/*.wav`, the set gain 9.5641 as printed — measure
  E-gain against ir-default.ts's numbers, +13.7/+13.4/+17.0 dB at 48 k), mounted SM first after the first note, the rest at
  idle; ONLY the selected rung fed (E §4.4); a worklet-less fallback (E §0.5). Master chain stage for stage (E §5) incl. the
  clamp; mute on the gain nodes, solo on the bus nodes, both ramped (E §7). Delay re-timed on every bpm change (E §3 bug).
- HARMONY: music.ts adapted to MIDI (D §3), chord-name/chord-edit/chord-gravity verbatim, the arp booked on the lattice with
  triads carried from press time (D §2.2 defect fixed), LENGTH = the Studio's `gate` 0.06..1.3, GROOVE tables verbatim, HOLD
  = the latch law (D §2.4), the gate chop + DIVE (D §2.5), the rack model DOM-free (D §5.2; pads pin the bass root),
  stage C2..C7 with oct −1..+1 (D §6), the key table in types.ts (X HOLD · C CHORD · V ARP added; letters by e.code; keyup by
  the code recorded at keydown; blur releases everything).
- STATE: one JSON document in IndexedDB `signal-portfolio` (page db.ts pattern, G), saved 250 ms after any change, loaded
  field by field with defaults; the rack rides inside it (no second store).
- BOOT: ctx `{sampleRate: 48000, latencyHint: 'interactive'}` in a try/catch, created suspended at load; kit + rhodes first
  batch fetched + decoded before the first gesture; the first pointerdown/keydown on the instrument = `wake()`; a note key
  pressed before `ready()` waits and sounds when the batch lands if still held.
- VIEW: the look Jon picks from the R0 contact sheet (filled in below by the planner); `controls.ts` (the one drag law),
  `stage-geometry.ts`, `filter-curve.ts` + `eq-response.ts` verbatim (F Port choices); `<style is:global>` under one root id,
  `data-live="1"` on the root, `[hidden]` reset, cursors restored (F Astro hazards); no text as a UI fix; no `title=`.

## 2. Lanes and file ownership (parallel; each lane = one author, one report)
| lane | owns (writes ONLY these) | ports (read) | tests |
|---|---|---|---|
| T time | `src/signal/grid.ts`, `lookahead.ts`, `time.ts` | D §1, P/grid.ts, V/engine/lookahead.ts, P/click.ts | grid.test.mjs, lookahead.test.mjs, time.test.mjs (a fake ctx clock: bookings, late-skip, next-beat retime, tap) |
| O out+effects | `src/signal/out.ts`, `effects.ts`, `fx-worklet.ts`, `stop.ts`, `ir.ts`, `scripts/signal/ir-encode.mjs`, `public/s/59e8a3b3/ir/*` | E, P/out.ts, P/stop.ts, V/engine/fx-worklet.ts, final-out.ts, ir-set.ts | fx-worklet.test.mjs (the node sim: TAPE L=R, levels), out.test.mjs (clamp curve), ir encode log |
| D drums | `src/signal/drums.ts`, `drum-pattern.ts`, `kit.ts` | A, V/engine/core.ts drums, dsp.ts, drum-kit.ts, sample-player.ts, views/instrument/drum-pattern.ts | drum-pattern.test.mjs (38 + drift guard), drums.test.mjs (a mock ctx: booking law, swing frames, stop kills) |
| B bass | `src/signal/bass.ts`, `bass-pattern.ts` | B, V/engine/core.ts bass, views/instrument/bass-pattern.ts | bass-pattern.test.mjs (16), bass.test.mjs (mock ctx: modes, fold, lock, pulse booking, stop) |
| K keys | `src/signal/sampler.ts`, `keys.ts`, `filter.ts`, `motion.ts` | C, V/engine/sampler/*, P/keys.ts, P/filter.ts | multisample.test.mjs (98), zone-bake tests, filter.test.mjs (56), keys.test.mjs (manifest parse, middle-first order, seam click check on a synthetic loop) |
| H harmony | `src/signal/music.ts`, `arp.ts`, `chord-name.ts`, `chord-edit.ts`, `chord-gravity.ts`, `chords.ts`, `stage-geometry.ts`, `keymap.ts` | D, V/engine/{music,chord-name,chord-edit}.ts, views/instrument/{chord-gravity,chord-rack,stage-geometry,play}.ts | chord-name (80), chord-edit (61), gravity (38), stage (24), music.test.mjs, arp.test.mjs (booking order, groove tables, triads from press time), chords.test.mjs (stamp/play/clear/mono), keymap.test.mjs |
| S store+surface | `src/signal/db.ts`, `test-surface.ts`, `glitch-worklet.ts` | G, P/db.ts | db.test.mjs (fake IDB or node's absence: pure merge/defaults), surface: a unit test of firstSound/glitch math |
| V1 view chassis+drums+bass | `src/components/signal/SignalChassis.astro`?? — see §3 (filled in after the look is picked) | F | screenshots |
| V2 view keys tower | §3 | F | screenshots |
| V3 view hands (top strip, pianohead, rack, keybed, gate row) | §3 | F | screenshots |
| I integrator | `src/signal/instrument.ts`, `main.ts`, `src/components/signal/Signal.astro`, `src/pages/signal.astro` (replaces the contact sheet with the instrument; keeps `?look=` only if trivial), `public/s/signal-still.webp` | everything | build, node suites, hands on :4636 |
| G gate | `scripts/signal/gate.mjs`, `serve-dist.mjs` (extend) | G | the gate itself |
| R reviewer-fixer | any file, minimal diffs, one pass | the whole diff | re-run suites + gate |

## 3. The view — LOOK B (carbon · glass · keycaps), the planner's best guess until Jon picks
The reference is `src/components/signal/look/LookB.astro` (the R0 mock: 253 lines of markup + 243 of CSS, tokens `--lb-*`
on `.look-b`), plus `docs/signal-map/F-view.md` for every Studio gesture and state the mock does not show. The live view
BUILDS ITS DOM IN TS (the Studio's pattern: `el()` + innerHTML; controls.ts creates knobs/segs/faders with `si-*` class
names), so the material CSS styles controls.ts's DOM directly. Architecture:
- `src/styles/signal/material.css` (V0): the look-B material as reusable recipes on ONE root `.sig` (rename `--lb-*` →
  `--sg-*`): the chassis (`.sig-device`), tower shell + header rail + footer, the glass screen (`.sg-glass`, tint variants
  per module via `--acc`), the keycap (`.sg-cap`: face, 4 px wall, press = translateY(2px) same-frame, `.on` latch, the
  corner LED), the knob (`.si-knob .si-dial` conic ring-arc with `--v`, the static cap, `.si-ptr`, `.si-kl/.si-kn` captions,
  `.si-ghost`, `.si-stepped` flag, `.si-tick`), the seg (`.si-seg > button`), the LCD tower (`.sg-lcd` card + `.si-fill`),
  the elastomer gate pad, the engraved `.sg-etch`, the lamp/tense keyframes, `[hidden]{display:none!important}`, cursors
  restored (ns-resize on knobs, ew-resize on the glass, grab on nodes). No per-stratum layout here.
- `src/signal/view/controls.ts` (V0): the Studio's controls.ts VERBATIM (324 lines, zero imports: `el`, `makeKnob`,
  `makeSeg` (ported to `<button>`), `makeFader`, the one drag law) + `src/signal/view/common.ts` (V0): `cap()`, `led()`,
  `glass()`, `screen()` builders and the `--acc` token names, ≤ 120 lines. V0 also writes `src/signal/view/controls.test.mjs`
  (the drag maths: 160 px = full swing, Shift ×8, detents ±6 px, steps) with a DOM stub.
- V1 `src/signal/view/drums-view.ts` + `bass-view.ts` + `src/styles/signal/drums.css` + `bass.css`: the two towers from
  the mock, live: power cap (Space/B), kit/voice name glass, the two-node cover/tone glass (filter-curve.ts + eq-response.ts
  verbatim in `src/signal/view/filter-curve.ts`, `eq-response.ts` — V1 owns these copies), the 6×16 grid (click = MID 2,
  Shift = ACCENT 3, Alt = GHOST 1, same tier clears; the playhead column from time.playhead(); lane name = a pad that
  auditions `drums.hit`), SWING/DENSITY, pattern seg, TEXTURE, DELAY column, SIDECHAIN, footer M·S·gain (gain knob: 1.25·v,
  detent .8); bass: mode seg, padlock (armed pulses, pinned lit) + root chip, the 16-bar strip (click cycles v; a `sub`
  cell shows a mark; a playhead at the bass's own rate), DENSITY/GROOVE, INTENSITY/SUB/GLIDE, footer.
- V2 `src/signal/view/keys-view.ts` + `src/styles/signal/keys.css`: the keys tower: voice seg (RHODES PIANO PAD LEAD; ↑/↓;
  the picked voice lit while it loads = a `.loading` tense), the one-low-pass glass (drag anywhere = p; the node draws at
  the MOTION-written p; no ① node, no res: the page's filter has none), MOTION knob (OFF < .005) + RATE stepped (LFO_DIVS)
  + the four shape caps, the four LCD towers (absolute faders) + flavour segs (+ the MOD RATE ribbon), footer.
- V3 `src/signal/view/hands-view.ts` + `src/styles/signal/hands.css`: the top strip (wordmark `SIGNAL` etched, the amber
  tempo glass with drag 0.5 BPM/px + TAP cap with its LED, the red STOP cap), the pianohead (◀ 0 ▶ OCTAVE, KEY glass with
  ◀ ▶ through the 12 keys + a MAJ/MIN/FREE cap, the sapphire chord glass fed by harmony.name(keys.held()) with the 90 ms
  settle + dim-after-release, CHORD · HOLD · ARPEGGIATOR caps with LEDs, RATE/LENGTH/GROOVE knobs), the 8 pads (number,
  label, degree chip, `.sel`, shift = ✕), the keybed (stage-geometry.ts verbatim copy in `src/signal/view/stage-geometry.ts`
  — V3 owns it; C2..C7; letters at the top of the mapped keys, lit states press/latched/sounding; pointerdown plays
  `p<midi>` through harmony.keyDown), the bracket rail (click/drag = octave), the gate row (Z pad + RATE/SWING, the etched
  badge, M pad + SPEED/DIST).
- Every view paints from `inst.state()` on `inst.onChange` and from `time.playhead()` + `keys.held()` on rAF; every
  gesture calls the instrument (never the DOM's own state). No `title=`, no tooltips, no words that explain.

## 4. The gate (R1 assertions; the gate author implements them against SignalTestSurface)
Per browser (Chromium, WebKit, Firefox; `?mute=1`): (1) boots: no console errors, `.sig-device` rendered, `__signal.ready()`
within 8 s; (2) first sound: `press('KeyA', true)` → `firstSoundMs() < 200`; (3) the loop: `press('Space')` (drums on),
`press('KeyB')` (bass on, mode seq via state), hold a chord + `press('KeyV')` (arp): after 4 bars `level().rms > −40 dBFS`,
and in Chromium at `Emulation.setCPUThrottlingRate 4` over 20 s `glitches().gaps === 0`; (4) master stop: `press('Escape')`
→ `level().peak < −90 dBFS` within 150 ms and no booked voice remains (`glitches().blocks` keeps counting, rms stays 0);
(5) save/reload: change three things, reload, `state()` equals; (6) screenshots at 1440×900 and 1024×768 + the keybed row
pinned; (7) phone 390×844 + touch: the still + one line, the device hidden. Exit non-zero on any failure; print a table.
Kill discipline: every browser + server closed in finally + on SIGINT; the last line proves `pgrep` finds nothing of yours.
