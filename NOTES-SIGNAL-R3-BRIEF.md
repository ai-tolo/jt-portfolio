# SIGNAL R3 · THE FIRST-TIMER ROUND

Build round 3 of the portfolio SIGNAL instrument. This is a relayout of every module plus one behaviour fix. It is not a patch. When something moves, everything moves. Be strategic about the whole thing: mold each module intentionally on its own (its hierarchy, its real estate, what a first-timer's eye lands on), then compose the whole device as one view and re-balance across modules until it reads as one instrument.

## Read first
- Memory: `signal_portfolio_rebuild` (the whole R0–R2 state), then `feedback_product_surface_context`, `feedback_no_ui_text_crutch`, `feedback_module_visual_qa`, `feedback_pace_ship_the_tool`, `feedback_surface_port_means_the_look`.
- Worktree `~/sites/jt-portfolio-signal`, branch `signal` @ 76a02c7 (already in main). Main has moved to 737fcf3 (work-room rounds). Merge main into `signal` before anything else.
- Preview: launch entry `signal-rebuild` → http://localhost:4636/signal. Gate: `node scripts/signal/gate.mjs --round r3` (add the r3 rows). Notes: `NOTES-SIGNAL-R0.md`, `R1`, `R2`; write `NOTES-SIGNAL-R3.md`.
- Files: contract `src/signal/types.ts` (KEYMAP), engine `src/signal/*.ts`, views `src/signal/view/*.ts`, material `src/styles/signal/material.css`, page `src/components/signal/Signal.astro`, copy `src/components/signal/signal-copy.ts`, code map `docs/signal-map/{A..G}.md`.
- Keycap reference: the Visuals room's keys in the main checkout, `~/sites/jt-portfolio/src/components/studio/StudioOne.astro` from line 2176 (`.look-band`: 61px cap, oblique 7×9 body, 1px seams, press collapses the body, day paper / night carbon). That recipe is the keycap material for this round, scaled as needed.

## Laws
1. The visitor's job is to have fun and make music with zero reading. They arrive knowing nothing.
2. Product surface (Jon's law from THE PAGE, 2026-09-23): visible hierarchy, every control's word legible, the hands map drawn ON the surface as real keycaps that light when pressed. A tooltip or caption is never the fix for an unclear control. Form, size, placement and state do the teaching.
3. Form encodes state. A control whose effect depends on another control goes visibly dormant until that control is on.
4. Nothing visual is protected except the look-B material and the engine underneath. Every module's real estate is composed fresh. The instrument may grow to about 97–99% of the page's content width (a 1–3% margin so it never touches the nav's scroll rail). No phone version; the still + one line stays.
5. Size floor: no control word smaller than 12px, no screen numeral smaller than 22px, BPM is the largest numeral on the device. Key words and buttons that a hand needs must be readable at arm's length at 1440 wide.
6. Gate green → straight to Jon with screenshots of the whole device and each module. QA by LOOKING, not only DOM geometry. A fixer runs only on a red gate. Jon is the reviewer.

## The keymap (taught set, everything else on screen)
Remove X (hold), C (chord), V (arp), N (root lock) from the keyboard entirely. Hold, chord, arp and root lock are on-screen toggles only (root lock already is one; it just loses its shortcut).

Keep and TEACH on the surface:
- `space` drums on/off
- `A S D F G H J K` white notes, `W E T Y U O` black notes (laptop stagger)
- `B` bass on/off
- `Z` gate (hold) and `M` dive (hold): the ONLY two live FX
- `1–8` pads, `Shift` clears (only if pads stay, see §F)
- `← →` octave, `↑ ↓` voice, `=` tap, `esc` stop (kept, secondary)

## The spec

### A. Bug: HOLD under CHORD
Current: with HOLD on and CHORD on, each new chord stacks on the held one. Wanted: a new chord SWITCHES. The held chord releases, the new one takes over the hold, and holding persists. HOLD without CHORD stacks like a sustain pedal (tap-again release stays). HOLD off releases everything held. Write the test before the fix (arp.ts latch machine + chords.ts mono latch is the suspected seam; the code map D §4 has the key table history). The fix must not change what a pad does under HOLD.

### B. Drums module
- BPM at the top-left of the instrument, associated with drums, a big screen, drag and type to set. The SIGNAL wordmark is gone.
- A large orange SPACE bar drawn as a keycap across the full bottom of the drum module, reading `space`, lit while the drums run, pressed-state on key down. It is the on/off. M/S and gain move up to make room.
- The `house` kit screen is a dead field. It becomes an etched readout that cannot be mistaken for a control, or it goes. Only one kit exists.
- The delay (MIX · FB · TIME) reads as one unit with visible activity. At MIX zero, FB and TIME are dormant. A first-timer who turns MIX must see what it belongs to.

### C. Bass module
- The `synth` voice screen is a dead field. Same rule as `house`.
- `B` drawn on the module as a real keycap, the on/off, lit while the bass runs.
- The root display shows when a pad pins the root so "bass follows the pads" is visible without words.

### D. Keys module
- Voice names (rhodes · piano · pad · lead) are big enough to be the first thing seen on the module.
- The keybed becomes two layers: a row of computer keycaps in the Visuals material in laptop stagger (`W E T Y U O` above `A S D F G H J K`), and a small piano above it that lights the sounding notes. No letters on the piano keys. The goal is an explicit visual bond between the visitor's laptop keyboard and what they see. It does not have to be fancy.
- MOTION gates RATE and SHAPE visibly. Below MOTION_OFF they are dormant; above it they wake.
- `Z` and `M` drawn as keycaps in their own class (hold gestures, not toggles), placed with the filter and dive they drive, distinct in form from every on/off.
- HOLD · CHORD · ARP · root lock are on-screen toggles only, placed where the module's layout wants them. Root lock keeps its existing button and loses the `N` shortcut.

### E. Beneath the instrument
Remove the legend and the DRAFT brief from the page for this round (unmount, keep `signal-copy.ts` on disk). The surface carries the teaching. Jon will write what goes beneath after this round.

### F. Pads
Keep the pads row if the Studio's key wheel (cut in R1, D §7) can open as a popover on an empty-pad tap and cost no permanent real estate. If it crowds the keys module or the keycap row, drop the pads row and the 1–8 keys this round and say so.

## Process
- One round, built live, not a mock. Workflow lanes on Opus for well-specified authoring (views, tests, the hold fix against its test); the integrator, the look pass and the final judge on Fable.
- Contract first: add the new KEYMAP and the HOLD-under-CHORD law to `src/signal/types.ts` and NOTES-SIGNAL-R3.md §1 before any lane starts.
- Gate r3 adds: no X/C/V/N handlers, HOLD-under-CHORD switch test, dormant states present in DOM, no sideways scroll at 1440/1024 with the wider device, the 1–3% margin against the nav rail, phone still.
- End with screenshots (whole device, each module, one pressed state) sent to Jon, the preview URL, and a residue list. No fixer on green. No re-framing of this brief.
