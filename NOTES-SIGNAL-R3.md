# SIGNAL · ROUND 3 · THE FIRST-TIMER ROUND (build notes, planner-owned; the brief is NOTES-SIGNAL-R3-BRIEF.md)

Branch `signal` (worktree `~/sites/jt-portfolio-signal`, merged on main 737fcf3). Hands `:4636/signal` (launch entry
`signal-rebuild`); gate `node scripts/signal/gate.mjs --round r3` (:4637). Nothing merges, nothing pushes this round.
Read the brief's Laws (1–6) and the contract `src/signal/types.ts` (KEYMAP · the HOLD-under-CHORD law · DEVICE_W · CTL)
before writing a line. Every lane: `source ~/.nvm/nvm.sh && node src/signal/<name>.test.mjs` is the unit; the build is
`npm run build > /tmp/r3-<lane>-build.log 2>&1; echo exit $?` (judge the exit code only). Scratch files go under
`/private/tmp/claude-501/-Users-tolo/01aca353-bee5-4b8e-827a-d0347efd41fe/scratchpad/r3-<lane>-*` (unique names: a same-named
scratch file silently replaces another lane's). Sound safety: never engage audio in a live preview pane; headless probes
only (`?mute=1`), and kill every headless browser you start (`pgrep -fl -- --headless` prints nothing of yours at the end).
Never `npm install` anything.

## 1. Decisions (taken; do not re-litigate — cite the line if you must deviate, and say so in your report)

### 1.1 The keymap and the pads
- KEYMAP (types.ts) = the taught set only: letters · Space · B · Z (held) · M (held) · ←/→ · ↑/↓ · = · Esc. X HOLD, C CHORD,
  V ARP, N LOCK are GONE from the keyboard: on-screen toggles only. Root lock keeps its padlock button.
- THE PADS ROW IS DROPPED this round, with the 1–8 keys (brief §F: the pads stay only if the Studio's key wheel comes along
  as a popover; the wheel is a ~900-line port with its own design under the size floor, and it would crowd the round, so:
  no wheel → no pads). The rack model (chords.ts), `harmony.rack` in the saved state and the pad tests stay in the engine
  untouched; the view simply does not draw them. Residue: "the key wheel as a popover + the pads row".
- HOLD under CHORD: the contract's law (types.ts, above HarmonyState). Test first (harmony.test.mjs), then the fix.

### 1.2 The device: 1280 wide, one view, zoomed from outside
- `DEVICE_W = 1280` (was 1120). Chassis padding 14 → content 1252. Strata, top to bottom, gap 8:
  1. TOP STRIP 48: `[← →] OCTAVE screen · KEY ◀ C MAJ ▶ SCALE` (left) · the POWER disc (centre; the host contract
     `#pwr` in `.sgh-power`, unchanged) · the CHORD glass (right of centre, wide) · `[esc] STOP` (right end).
     The wordmark is gone (brief §B). No pianohead stratum any more: its parts live here.
  2. TOWERS ROW 540: DRUMS 330 · KEYS 566 · BASS 330, gaps 13 (`.sig-towers` grid: 330px 566px 330px).
  3. THE KEYBED 174: the small PIANO (60, C3..C7 = 29 whites, no letters, no names: lights only) · the BRACKET RAIL (16,
     the octave window + C names; click/drag = octave, as today) · the KEYCAP ROWS (2 × 42 + 6: the colour row
     `W E R T Y U I O` over the home row `A S D F G H J K L` in the laptop stagger, R and I dormant).
  → device ≈ 808 tall. At 1440×900 the host zooms it to min(0.98·1282/1280, 800/808) = 0.98 → 1256 × 792 drawn.
- THE FIT (planner, this round, both hosts): zoom = min(0.98 · column ÷ DEVICE_W, (viewport height − reserve) ÷ device
  height), floor 0.25. /signal: reserve = the page's 100 px vertical padding; the homepage host: the room's padding.
  The old height-cap table is retired on both hosts. Every view is composed at 1280 with 1:1 px; never a media query.
- THE SIZE FLOOR (Law 5) is in the material (src/styles/signal/material.css, planner-owned this round): base font 11;
  `.sg-cap` 30 tall / 12 px; `.si-seg > button` 26 / 12 px (`.sm` 24, `.col` 22); `.si-kl` 12; `.si-kn` 13; `.sg-chip` 16;
  `.sg-screen` 40 tall, `> b` 22 px, `> small` 12; `.sg-etch` 12 (`.badge` 13); `.sg-lcd .si-fl` 12; knobs default 40
  (kx 30 · ks 34 · km 44 · kl 48 · kxl 60). Lay out against THESE. No word under 12 px anywhere on the device; no screen
  numeral under 22; BPM 32 (the largest).
- `.dormant` (material.css): a control whose effect waits on another control. Arc to steel, ink to 38 %, the LED off;
  still operable (turning it does not wake its parent). The pairs are the contract's (types.ts CTL comment).
- THE KEYCAP (`src/styles/signal/keycap.css`, planner-owned): `.sg-key` = the Visuals room's key material (StudioOne
  .look-band: an oblique 1-px-seamed body, the press collapses it) at 44 px, night carbon ink over the chassis. Modifiers:
  `.wide` (the SPACE bar, `width: 100%`), `.lg` (48: Z and M), `.sm` (36: ←→↑↓ = esc, if a row needs them smaller —
  prefer 44), `.tint` (the face carries `--acc` at rest: the SPACE bar orange, B violet), `.lit` (its function is ON: the
  face lights in `--acc`, the letter white), `.pressed` (down: the body collapses THE SAME FRAME), `.dormant`. The letter
  is the cap's textContent (`space`, `esc`, `A`, `←`); `data-code` carries the KEYMAP code. Views build it with
  `key(code, label, opts)` from `src/signal/view/common.ts` (planner adds it) and toggle `.pressed`/`.lit` themselves.
- Class names that survive KEEP their names (power.css's dark rules key on them): `.sgh-top .sgh-power .sgh-stop
  .sgh-tempo(→ now in drums, keep the class) .sgh-bpm .sgh-pls .sgh-keybed .sgh-bed .sgh-keys .sgh-w .sgh-b .sgh-q(gone)
  .sgh-nn(gone) .sgh-rail .sgh-railin .sgh-win .sgh-oname .sgh-chord .sgh-clabel .sgh-cdeg .sgh-octscr .sgh-keyscr .sgh-arrow
  .sgh-scale · .sd-* · .sb-* · .kv-*`. New parts get new names under the same prefix. The planner rewrites power.css's
  dark + stagger rules for the new strata after the lanes land.
- Words on the device are LEGENDS (a control's own name, a value, a key), never explanations. No `title=`, no tooltips.

### 1.3 The modules (each lane composes its own box; the planner rebalances across them in the look pass)
DRUMS (330 × 540 outer → 310 × 520 inside the tower's 10 px padding), top to bottom:
- HEAD 56: the BPM screen at the top-left (`.sgh-tempo` moved here, `data-ctl="drums-bpm"`): a big amber glass, the
  Orbitron digits 32 px, the beat lamp, `bpm` small; DRAG (0.5 bpm/px, as today) AND TYPE: a plain click (no drag) turns
  the digits into a text field (inputmode numeric; Enter/blur commits, clamped BPM_MIN..BPM_MAX; Esc cancels; while it has
  focus the keymap cedes the keys by its own owns() rule). Beside it the `=` keycap (`key('Equal','=')`, `data-ctl="drums-tap"`,
  .pressed on = down, a 90 ms .lit per tap). At the right end: the kit as an ETCHED word (`house kit`, `.sg-etch`): the
  dead `house` glass is gone.
- the COVER glass (44): keep it (filter-curve.ts as today), the value ghost.
- THE GRID (≈110): 6 × 16 as today, lane words 12 px (the lane pad auditions), the playhead column.
- the PATTERN seg (28): FLOOR BACK HALF BREAK.
- a KNOB ROW (60): SWING · DENSITY · SIDECHAIN.
- THE DELAY UNIT (60, `data-ctl="drums-delay"`): ONE raised housing (`.sg-raised`) reading `delay` (etched) with MIX · FB ·
  TIME in a row and an activity lamp: the lamp blinks on every line of the TIME division (heard time, the lattice) while
  the drums run and mix ≥ 0.01; at mix 0 the lamp is dark and FB + TIME carry `.dormant`.
- a ROW (32): the TEXTURE knob + its TAPE/DRIVE seg (left) | the footer's M · S · GAIN (right) — the footer rail rises here.
- THE SPACE BAR (44): `key('Space', 'space', { wide: true, tint: 'drums' })`, `data-ctl="drums-power"`, the full tower
  width at the bottom: the drums' on/off (click toggles), `.lit` while drums run, `.pressed` while Space is down.
KEYS (566 × 540 → 546 × 520):
- HEAD 44: the VOICE seg spanning the row, its caps 16 px (`rhodes piano pad lead`: the first thing seen), the picked one
  lit, `.loading` while it loads; at the right end the `↑` and `↓` keycaps (`keys-voice-up`/`-down`, ArrowUp/Down).
- the FILTER glass (84): the one low-pass + MOTION's ghost, as today.
- THE GESTURE ROW (56): `[Z] gate · RATE · SWING` (left group) … `[M] dive · SPEED · DIST` (right group). Z and M are
  `key('KeyZ','Z',{lg:true})` / `key('KeyM','M',{lg:true})` with `data-ctl="keys-gate"` / `"keys-dive"`: HOLD gestures —
  pointer hold = the gesture (reference-counted with the key, as today's hands-view), `.pressed` + `.lit` while held.
  Their knobs are `.side` knobs (dial + caption/value at the right).
- THE BODY (≈190): the LFO deck (MOTION knob 60 + its chip · RATE stepped + chip · the four shape caps) at the left,
  160 wide; the four FX towers DRIVE MOD DEL REV (LCD faders + flavour segs + the MOD RATE ribbon) filling the rest.
  MOTION gates RATE + the shapes: `.dormant` on `keys-rate` + `keys-shape` below MOTION_OFF.
- THE HARMONY ROW (46): `HOLD · CHORD · ARP` as `.sg-cap` toggles with LEDs (`data-ctl` hold/chord/arp; the material's
  on-screen-toggle form, distinct from the keycaps) then `RATE · LENGTH · GROOVE` (.side knobs, `arp-*`), all three
  `.dormant` while ARP is off.
- FOOT 36: M · S · GAIN on the rail.
BASS (330 × 540 → 310 × 520):
- HEAD 56: `key('KeyB','B',{lg:true, tint:'bass'})` (`data-ctl="bass-power"`: click toggles, `.lit` while on, `.pressed`
  while B is down) at the left; the ROOT display beside it (`data-ctl="bass-root"`, a 22 px amber numeral: the note the
  bass is on — lit when a lock pins it, dim while it follows); at the right the voice as an ETCHED word (`303`).
- the TONE glass (44), as today.
- the MODE ROW (32): DRONE PLUCK SEQ + the padlock (`bass-lock`; armed pulses, pinned lit; no shortcut).
- THE STRIP (≈150): 16 wells under glass, the playhead, `.dormant` (and today's `.idle`) unless SEQ.
- KNOB ROW (60): DENSITY · GROOVE · KNOB ROW (60): INTENSITY · SUB · GLIDE.
- FOOT 36: M · S · GAIN.
HANDS (view/hands-view.ts: the top strip + the keybed block; NO pianohead, NO rack, NO gate row):
- TOP STRIP 48 (`.sgh-top`, prepended to the strata as today): `[←][→]` keycaps (`oct-`/`oct+`, ArrowLeft/Right; a click
  does the literal octave, as today's ◀ ▶) + the OCTAVE screen (22 px numeral) · `◀ C MAJ ▶ SCALE` (as today, 12 px caps,
  the screen's numeral 22) · the POWER slot `.sgh-power` (absolute at the centre, unchanged) · the CHORD glass (right of
  centre: 22 px name, the degree under it, the settle law as today) · `key('Escape','esc')` + the word `stop` as the
  master STOP at the right end (`data-ctl="stop"`, red ink, `.lit` while anything runs).
- THE KEYBED (`.sgh-keybed`, appended as today): the piano `.sgh-bed` (60 tall; whites 48 wide at 1252 = 29 × 43.2, blacks
  .62 × on the seam; `.press` / `.latched` / `.sounding` lit states as today; pointerdown plays `p<midi>`; NO letters, NO
  names, the C-dots may stay) · the rail `.sgh-rail` (16) · the KEYCAP ROWS `.sgh-caps` (`data-ctl="keycaps"`): the
  colour row then the home row (types.ts KEYCAP_ROWS), 44 px caps, 4 px gaps, the colour row offset half a cap to the
  right of the home row (the laptop's stagger), centred under the piano. Each cap: `key(code, letter)`, `.pressed` while
  its key is down (keyboard or pointer), `.lit` while the note it plays sounds (keys.held ids `k<code>`), the colour-row
  caps carry the amber rim in a key (as the black keys did), R and I `.dormant`. A pointerdown on a cap plays its note
  through `H.keyDown('k'+code, H.midiFor(offset, colour))` and pointerup releases it (the cap is a real control).
  The bond: press a key on the laptop → its cap goes down + lights, the piano key it plays lights, the chord glass names it.

### 1.4 Underneath the device
The legend and the DRAFT brief are UNMOUNTED (brief §E): Signal.astro no longer prints them; `signal-copy.ts` stays on disk
(its LEGEND now mirrors the R3 KEYMAP). Nothing beneath the device this round.

## 2. Lanes and file ownership (parallel; one author each; writes ONLY its files)
| lane | model | owns (writes ONLY these) | reads | tests / proof |
|---|---|---|---|---|
| H hold + keys | Opus | `src/signal/arp.ts`, `harmony.ts`, `chords.ts` (only if the seam needs it), `harmony.test.mjs`, `arp.test.mjs`, `chords.test.mjs`, `keymap.test.mjs`, `instrument.test.mjs`, `surface.test.mjs` | types.ts (the law), docs/signal-map/D §2.4, §4 | the HOLD-under-CHORD block in harmony.test.mjs written FIRST (red), then green; every other suite green; no X/C/V/N/Digit in any test |
| D drums | Opus | `src/signal/view/drums-view.ts`, `src/styles/signal/drums.css` | §1.3 DRUMS, common.ts (`key()`), controls.ts, material.css, keycap.css, today's drums-view + hands-view (the tempo glass code to move) | a headless render of /signal/?mute=1 with the tower pinned: a PNG of the tower (scratch), the row list in the report |
| B bass | Opus | `src/signal/view/bass-view.ts`, `src/styles/signal/bass.css` | §1.3 BASS, common.ts, keycap.css, today's bass-view | same |
| K keys | Opus | `src/signal/view/keys-view.ts`, `src/styles/signal/keys.css` | §1.3 KEYS, common.ts, keycap.css, today's keys-view + hands-view (the gate row + the harmony toggles to move) | same |
| V hands | Opus | `src/signal/view/hands-view.ts`, `src/styles/signal/hands.css`, `src/signal/view/stage-geometry.test.mjs` (the 29-white stage) | §1.3 HANDS, common.ts, keycap.css, today's hands-view, stage-geometry.ts | same |
| G gate | Opus | `scripts/signal/gate.mjs` | §3, today's gate (R2's leg), types.ts CTL | `node scripts/signal/gate.mjs --round r3 --only chromium` runs (red rows allowed until the views land; the rows must EXIST and judge the right things) |
| I integrator + look + judge | Fable | `types.ts`, `main.ts`, `view/common.ts`, `Signal.astro`, `signal.astro`, `material.css`, `keycap.css`, `power.css`, `power.ts` (if the slot moves), `StudioOne.astro` (the host fit), `signal-copy.ts`, `NOTES-SIGNAL-R3.md`, `CLAUDE.md`, `public/s/signal-still.webp` | everything | build · every suite · the gate green in three browsers · screenshots looked at |

Lane rules: (1) every gesture calls the instrument, every paint reads `inst.state()` on `inst.onChange` (+ rAF for
playheads/levels), exactly as today's views; (2) the material is the recipe, your sheet is the layout (unlayered, wins);
(3) keep today's data-ctl hooks and add the contract's (types.ts CTL) — the gate reads them; (4) no new dependency, no
import from another lane's files (common.ts, controls.ts, filter-curve.ts, eq-response.ts, stage-geometry.ts, types.ts are
shared reads); (5) a view lane's proof is a LOOKED-AT screenshot of its tower at 1:1 (the planner's `r3-shot.mjs` in the
scratchpad renders /signal/?mute=1 powered, pins a selector, and writes a PNG — use it, do not write your own probe).

## 3. The gate (R3 = R2's leg + these rows; `--round r3`; the R2 rows keep running: power first, first sound, loop,
throttle, stop, reload, power off, phone, home)
1. `keymap · no X C V N, no digits`: `press('KeyX')`, `press('KeyC')`, `press('KeyV')`, `press('KeyN')`, `press('Digit1')`
   through the surface change nothing (hold, chord, arp.on, bass.armed, the rack, keys.held() all as before), and no
   `.sg-key[data-code]` on the device carries those codes.
2. `hold under chord · a new chord switches`: hold + chord on via `click('[data-ctl="hold"]')` / `click('[data-ctl="chord"]')`
   (their aria-pressed flips), `press('KeyA')` (a tap) → `instrument.harmony.sounding()` = the C triad (60 64 67) ringing
   with no key down; `press('KeyF')` (a tap) → exactly the F triad (65 69 72): the C triad is gone, and it still rings 300 ms
   later; hold off (click) → nothing sounds. Then `hold under chord · pedal without chord`: chord off, hold on, taps A then
   D → both notes ring; tap A again → only D rings.
3. `dormant · present in DOM` at the defaults: `[data-ctl="drums-fb"].dormant`, `[data-ctl="drums-time"].dormant`,
   `[data-ctl="keys-rate"].dormant`, `[data-ctl="keys-shape"].dormant`, `[data-ctl="arp-rate"].dormant` (+ length, groove),
   `[data-ctl="bass-strip"].dormant`, both `.sg-key[data-code="KeyR"].dormant` and `KeyI`; then `dormant · wakes`:
   `instrument.drums.set('delay', {mix:.5,…})` → drums-fb not dormant; `keys.set('motion', {amount:.5,…})` → keys-rate awake;
   `harmony.set('arp', {on:true,…})` → arp-rate awake; `bass.set('mode','seq')` → the strip awake (restore each after).
4. `keycaps · the taught set drawn`: one `.sg-key[data-code]` for every KEYMAP code (Space, KeyA..KeyL, KeyW..KeyO, KeyB,
   KeyZ, KeyM, ArrowLeft/Right/Up/Down, Equal, Escape); `keycaps · press lights`: a trusted `keyboard.down('KeyA')` →
   `[data-code="KeyA"].pressed` and `.lit` within 100 ms, and a `.sgh-w.press` piano key; up → both gone; `press('Space')`
   → `[data-code="Space"].lit` while drums run; `keyboard.down('KeyZ')` → `[data-code="KeyZ"].pressed.lit`.
5. `size floor`: the computed font-size of every visible `.sg-cap, .si-seg > button, .si-kl, .si-kn, .sg-etch, .sg-key,
   .sg-screen > small, .sg-lcd .si-fl` inside `.sig` is ≥ 12 px (report the smallest with its selector); every visible
   `.sg-screen > b` ≥ 22 px; `[data-ctl="drums-bpm"] b` (the BPM digits) has the largest font-size of all `.sg-screen > b`
   and `.sgh-clabel`.
6. `fit 1440 · 97–99 % of the column, clear of the rail`: at 1440×900 the device's drawn width ÷ the page's content width
   (innerWidth − the rail's width (`.away-rail` or the page's padding-left) − the page's right padding) is between 0.96 and
   0.995, and the device's left edge − the rail's right edge ≥ 1 % of that width; at 1024×768 only the clearance row
   (the height binds there). The R2 `shot <w> · no sideways scroll` rows stay.
7. Shots (Chromium; looked at by the planner): the whole device at 1440×900 powered (`chromium-1440.png`, as today), each
   module clipped to its box (`chromium-mod-drums.png`, `-keys`, `-bass`, `-top`, `-keybed`), one pressed state
   (`chromium-pressed.png`: KeyA + KeyZ held, Space on, the shot taken while held), the phone still.
KILL discipline as today (children, browsers, the shim; the last line proves nothing survives).

## 4. Residue (filled by the planner at the end)
