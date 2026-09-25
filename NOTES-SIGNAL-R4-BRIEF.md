# SIGNAL R4 · THE RENDER ROUND

Jon made a render (docs/signal-map/r4-render.webp) of where the device goes next. HIS WORDS: it is "a very rough draft"
cut from screenshot slices, "the big ideas are mostly all there", and he wants the result "more intentionally crafted but
with the key takeaways gleaned from my feedback". So the render is the SOURCE OF THE TAKEAWAYS, not a layout to copy:
the takeaways (§A–§E) are the law; the exact positions, gaps and sizes in the render are not. Mold each module on its own
(its hierarchy, its real estate, what a first-timer's eye lands on), then compose the whole device as one view and
re-balance across modules until it reads as one instrument. Build round 4 on top of R3.3 (main 1754f4d): a relayout, not a
patch: when a stratum moves, the strata around it are re-balanced.

THE TAKEAWAYS, in one list: (1) the top strip goes; the device's top is the three module titles; (2) esc STOP at a top
corner; the power is a red flick switch; (3) the arpeggiator leaves the surface; (4) the KEY screen and the CHORD glass
live in the keys module's foot with HOLD · CHORD; (5) the octave group lives on the keybed's right flank; (6) the hands map
correlates to the physical keyboard (the letter rows, Z and M where they are on a keyboard, the knobs beside their keys);
(7) the three mixer rails stay on one line above the three feet (Jon: "keep the gain"); (8) everything else is R3.3.

## Read first
- Memory: `signal_portfolio_rebuild` (R0–R3.3: what shipped, the laws, the hosts), then `feedback_product_surface_context`,
  `feedback_no_ui_text_crutch`, `feedback_module_visual_qa`, `feedback_pace_ship_the_tool`, `feedback_surface_port_means_the_look`.
- Worktree `~/sites/jt-portfolio-signal`, branch `signal` = main 1754f4d. Preview: launch entry `signal-rebuild` →
  http://localhost:4636/signal. Gate: `node scripts/signal/gate.mjs --round r4` (add the r4 rows; keep r3 runnable).
  Notes: `NOTES-SIGNAL-R3-BRIEF.md` + `NOTES-SIGNAL-R3.md` (§1 the R3 composition, §4 residue); write `NOTES-SIGNAL-R4.md`.
- Files: contract `src/signal/types.ts` (KEYMAP, KEYCAP_ROWS, DEVICE_W, CTL: the hooks the gate reads), engine `src/signal/*.ts`,
  views `src/signal/view/{drums,bass,keys,hands}-view.ts` + `power.ts`, material `src/styles/signal/material.css` (the size
  floor + `.dormant`), keycaps `src/styles/signal/keycap.css`, the strata `src/components/signal/Signal.astro`, the power's
  dark + trace `src/styles/signal/power.css`, the two hosts `src/pages/signal.astro` and `src/components/studio/StudioOne.astro`
  (hazard file: anchored exact-string edits only; its `.live-signal .sgm .pwr` overrides at ~1542–1561 are written for a disc),
  the view suites `src/signal/view/{towers,keys-view}.test.mjs`, the probe `scripts/signal/gate.mjs`.

## Laws (R3's stand; restated)
1. The visitor's job is to have fun and make music with zero reading. Form, size, placement and state teach.
2. Product surface: visible hierarchy, every control's word legible (≥ 12 px), screen numerals ≥ 22 px, BPM the largest,
   the hands map drawn ON the surface as `.sg-key` keycaps that go `.pressed` / `.lit`. No tooltip, no caption as a fix.
3. Form encodes state: a control whose effect waits on another is `.dormant` until that control is on.
4. Nothing visual is protected except the look-B material and the engine. The device stays 1280 wide (DEVICE_W); the
   hosts zoom it by both axes. No phone version (the still + one line; re-render the still at the end).
5. Gate green → straight to Jon with screenshots (whole device, each module, one pressed state) + the :4636/signal URL
   + residue. A fixer runs only on a red gate. Jon is the reviewer. No re-framing of this brief.

## The spec (the render, read left to right, top to bottom; every item is a change from R3.3 unless it says "as today")

### A. The top strip dissolves
- No top strip stratum. Its parts go: `esc STOP` to the device's top-left corner (a keycap + the etched word, as today's
  form, red ink, `.lit` while anything runs); the OCTAVE group to the keybed (§E); the KEY screen and the CHORD glass into
  the keys module's foot (§C); the wordmark stays gone.
- MODULE TITLES: `DRUMS` · `KEYS` · `BASS` printed ABOVE each tower, centred, in the tower's own accent (orange · sapphire ·
  violet), 16 px: the hierarchy's first words. They are titles, not controls (no light, no press).

### B. The power is a SWITCH, not a disc (Jon: "more like a multiswitch power outlet where it's a red switch you flick")
- A red rocker/flick switch in the material (a plastic rocker on a 1-px-seamed housing; OFF = the rocker tilted one way,
  the red lamp dark; ON = tilted the other way with the red lamp lit; a click flicks it; `.lit` while booting/live), drawn
  in `src/signal/view/power.ts` + `power.css`. It keeps EVERY host hook: it IS `#pwr` (`.pwr`, aria-pressed), `#sgm[data-state]`
  standby → boot → live → powerdown, the boot sound at the press, the perimeter trace, the dark until power, the homepage's
  night, the scroll-out power-off. The host's disc overrides in StudioOne.astro (scale 1.5, the ember ring, the halo) are
  REWRITTEN for the switch (anchored edits: the standby must still read from across the room: the lamp glows red).
- Placement: Jon does not care. The render straddles the chassis's top edge, centre; the recommended place is the top-right
  corner of the device, opposite `esc STOP` (the two system controls at the two top corners), inside the chassis. The
  builder picks one and shows it; the gate's "the disc: top middle" row becomes "the switch: hit-testable, toggles the
  state" wherever it stands.

### C. The keys module's foot: CHORD glass · HOLD · CHORD · KEY (the arpeggiator is GONE)
- The ARPEGGIATOR leaves the surface: no ARP cap, no RATE · LENGTH · GROOVE. The engine keeps its arp (harmony.arp stays in
  the state, loads off, is never switched on by the surface). Remove `arp`, `arp-rate`, `arp-length`, `arp-groove` from CTL.
- The keys' foot row (44): the CHORD glass at the left (the chord's name 22 px + its degree under it, the settle/dim law as
  today; `data-ctl="chord-glass"`), then `HOLD` · `CHORD` (the `.sg-cap` toggles as today), then the KEY screen (`C MAJ` 22 px
  over `key`, `data-ctl="key"`) with its ◀ ▶ caps and the SCALE cap (the render shows the screen alone; the walk needs its
  caps: keep them small beside it). The keys' M · S · GAIN rail stays (Jon, 2026-09-24: "keep the gain, my mistake"): the
  three modules' rails on one line above the three feet, as R3.1.
- With the gesture row (R3.3) and the arp row gone, the FX cards and the LFO deck take the height (as the render shows).

### D. Drums and bass: as today
- DRUMS: BPM screen (drag + type) + `=` + `house kit`, cover, the grid, pattern, SWING DENSITY SIDECHAIN, the DELAY unit with
  its lamp, TEXTURE, M · S · GAIN, the space bar. BASS: `303`, tone, DRONE PLUCK SEQ + padlock + ROOT screen, the strip, the
  knobs, M · S · GAIN, the B bar. The three rails stay on one line; the three feet are the hands' rows.

### E. The keybed: the piano, the rail, the letter rows, the OCTAVE group, the Z/M line
- The piano (lights only) + the bracket rail as today; the two letter rows centred as today.
- The OCTAVE group `[←] 0 OCTAVE [→]` moves to the keybed, in the dark flank to the RIGHT of the letter rows, centred on
  them (the render's place; ArrowLeft/ArrowRight keycaps + the 22 px screen).
- Z and M with their controls: the render draws a bottom line under the letter rows — SWING · RATE at the far left, Z under
  the letters' left, M under the letters' right, SPEED · DIST at the far right, each knob pair joined to its key by a thin
  amber hairline. Jon is NOT sold on the Z/M placement; the goal he named is "correlate to the physical keyboard". So: the
  keys stand where they are on a keyboard (Z under the A/S seam, M under the J/K seam: R3.2's positions), the knob pairs sit
  at the line's two ends with the drawn hairline to their key (the render's idea), and the look pass shows Jon this against
  R3.3's flanks (Z · RATE · SWING left, M · SPEED · DIST right) in one screenshot pair: he picks. Whichever stands, Z and M
  light amber while held, `gate` / `dive` etched by their knobs.
- Nothing prints beneath the device (signal-copy.ts stays unmounted).

### F. The contract and the gate
- Contract first (types.ts): CTL loses the arp hooks and the top-strip hooks that moved (the hooks keep their names: `key`,
  `key-`, `key+`, `scale`, `chord-glass`, `oct-`, `oct+`, `octave`, `stop`, `keys-gate`, `gate-rate`, `gate-swing`, `keys-dive`,
  `dive-speed`, `dive-dist`) and gains `power` (the switch) and `title-drums/keys/bass`; NOTES-SIGNAL-R4.md §1 before any lane.
- Gate r4 = r3's leg with: the switch row (hit-testable anywhere, a trusted click → boot → live; the dark ≤ 55 % of live
  still), the loop row holding a CHORD instead of the arp (drums + bass seq + a held C E G: rms > −60 dBFS after 4 bars),
  the dormant rows without the arp knobs, the keycap rows unchanged (Z and M once, wherever they stand), the fit rows as
  today, the module shots + the titles in them, the still.

## Process
- One round, built live. Contract first (planner, Fable), then Opus lanes for the well-specified authoring: P power
  (view/power.ts + power.css + the StudioOne `.pwr` overrides), K keys (keys-view.ts + keys.css + keys-view.test.mjs), V hands
  (hands-view.ts + hands.css: the octave group, the Z/M line), T titles + strata (Signal.astro + the drums/bass title hooks
  in drums-view.ts / bass-view.ts / towers.test.mjs), G gate; the integrator (Fable) composes, runs the look pass with Jon's
  render open beside the device, re-balances, re-renders the still, gates, and reports. No fixer on green.
- The shared probe: `<scratchpad>/r3-shot.mjs` from the R3 chat is gone with that scratchpad; write the same 60-line probe once
  (headless muted Playwright Chromium, power via a trusted click on `#pwr`, `--keys`, `--sel`, `--full`, kill in finally) and
  hand it to every lane. Kill every headless browser you start; never engage audio in the live preview pane.
- The look pass is the round's craft: the integrator composes with Jon's render open beside the live device, keeps the
  takeaways, and lets the material and the size floor decide the rest; nothing in the render is precise enough to be
  measured against. Screenshots first, then the numbers.
- End with screenshots (whole device, each module, the switch off/on, one pressed state), the preview URL, and a residue list.
