# SIGNAL · ROUND 4 · THE RENDER ROUND (build notes, planner-owned; the brief is NOTES-SIGNAL-R4-BRIEF.md)

Branch `signal` (worktree `~/sites/jt-portfolio-signal`, on main 1754f4d = R3.3). Hands `:4636/signal` (launch entry
`signal-rebuild`, the astro dev server: HMR serves every lane's edit); gate `node scripts/signal/gate.mjs --round r4` (:4637).
Nothing merges, nothing pushes this round. Jon's render `docs/signal-map/r4-render.webp` is THE SOURCE OF THE TAKEAWAYS
(the brief's §A–§E), never a layout to measure against. Read the brief's Laws and the contract `src/signal/types.ts` (the
R4 block above DEVICE_H · CTL) before writing a line. Every lane: `source ~/.nvm/nvm.sh && node src/signal/view/<suite>.test.mjs`
is the unit; NO `npm run build` in a lane (the builds would clobber one dist/; the integrator builds once). Screenshots:
the planner's probe `<scratchpad>/r4-shot.mjs` (headless muted Playwright Chromium against :4636, powers the device by a
trusted click on #pwr, `--sel`, `--keys`, `--space`, `--full`, kills its browser in finally): use it, never write your own.
Scratch files: `<scratchpad>/r4-<lane>-*` (unique names). Sound safety: never engage audio in a live preview pane; headless
only (`?mute=1`); `pgrep -fl -- --headless` prints nothing of yours at the end. Never `npm install` anything.

## 1. Decisions (taken; do not re-litigate — cite the line if you must deviate, and say so in your report)

### 1.1 The strata (Signal.astro, planner-done): head 44 · towers 540 · keybed 250 → the device 882 tall (DEVICE_H)
- The top strip is GONE. `.sig-head` (44, static markup in Signal.astro) is a 330 · 566 · 330 grid (13 px gaps, the
  towers' columns) with `align-items: end`: the three `.sg-title` words (`DRUMS` `KEYS` `BASS`, material.css's recipe: 16 px
  mono, .22em, each in its tower's accent, `data-ctl="title-drums|keys|bass"`, pointer-events none) centred over their
  towers, resting 4 px above the head's floor (≈ 12 px above the tower's edge). Two absolutely placed corners:
  `[data-corner="stop"]` (left, `.sig-cl`, a 44-tall flex row) that the HANDS view fills with `esc STOP`, and
  `.sgh-power[data-corner="power"]` (right, `.sig-cr`) that power.ts fills with THE SWITCH. The corners never move a title.
- The towers row is R3.3's (540). The keybed is 250: the piano 60 · 8 · the rail 16 · 8 · the keycap block 100 · 8 · the
  Z/M line 50 (44 keys + the 6 px body). At 1440 × 900 the height binds: /signal's padding is 24/32 (PAGE_V 56) → zoom ≈
  0.957 (≈ 96 % of the column; the gate's 1440 floor is 0.93). The homepage host keeps its 60 px reserve.
- The dark + the stagger (power.css, lane P): the head takes the top strip's place (`.sig-head` where `.sgh-top` was); the
  titles grey to an engraving in standby (`color: #3b434e; text-shadow: none`).

### 1.2 THE SWITCH (lane P: view/power.ts + power.css + StudioOne.astro's `.pwr` block)
- `#pwr` is a `button.pwr` (id, class, `aria-label="Power"`, `aria-pressed`) exactly as today; it is appended to the
  `.sgh-power` slot (now the head's right corner; `sgm.querySelector('.sgh-power')` as today, the fallback the device).
  EVERY law of today's power.ts stays byte-for-byte in behaviour: `#sgm[data-state]` standby → boot → live → powerdown →
  standby, `data-live`, `.device.live`, the seal (inert), the boot sound AT THE PRESS, the trace draw/settle/retract, the
  key door (guardKeys), the `.inview` breathing + the one `.flare`, pagehide/pageshow snap, `press()`, dispose. Only the
  DOM inside the button and its CSS change. The console.warn text says "the switch".
- THE FORM (Jon: "more like a multiswitch power outlet where it's a red switch you flick"): the button is the HOUSING, a
  68 × 30 px recessed dark well (1 px seams, radius 6, the material's dark glass ground `--sg-glassbg`-ish, an inset
  shadow), holding `span.pwr-rocker`: a 56 × 20 px RED PLASTIC rocker (radius 4) that pivots about its vertical centre
  line — drawn as a horizontal rocker whose LEFT half or RIGHT half is pressed in. Fake the tilt (no layout: lighting +
  a transform on the rocker only): `transform: perspective(140px) rotateY(+12deg)` at rest (OFF: the right half pushed
  in, the left half proud, a highlight on the proud edge, a shadow under the pushed edge inside the well) and
  `rotateY(−12deg)` while `.lit` (ON: the left half in, the right half proud), a 110 ms ease-out flick. Inside the rocker
  `i.pwr-lamp`, the lamp window (a 22 × 8 px rounded slit on the rocker's centre line, or the whole rocker's red glowing
  from within — your call, shown in the shot): OFF = dull translucent red plastic (#6e1f1c → #4a1412, the lamp dark);
  ON (`.lit`, i.e. boot + live) = LIT RED from within (#ff5a4a core, #ffd0c6 hot centre, a red inset glow), steady. The
  ⏻ glyph (GLYPH, today's svg) prints small (10 px) and etched on the housing's face beside the rocker's ON end (or on the
  proud half of the rocker — one place, legible). Distinct from every keycap and cap on the device: red, a rocker, in a
  well.
- STANDBY must read from across the room (the host's 2026-09-21 law, kept): the rocker keeps a faint red ember (the
  material of the plastic itself) plus TODAY's breathing halo `::after` (opacity-only, `.inview`, `sgm-breathe`, the
  one `.flare`) re-centred on the rocker (inset −14px around the housing); boot + live = no halo, the lamp lit steady.
  The trace stays green (the perimeter line is the device's, not the switch's).
- power.css: replace the disc block (`.sgm .pwr` and its ::before/::after/svg/path rules, the standby/lit/live rules) with
  the switch's; DELETE the old `.sig .sgh-power { position: absolute; left: 50% … }` slot rule (Signal.astro places the
  corner now) and give the slot only `display: flex; align-items: center; height: 44px`. Keep
  `.sgm:is([data-state="boot"], [data-state="powerdown"]) .pwr { pointer-events: none }`, the trace rules, THE DARK rules
  (every one) and the fades; in the stagger replace `.sgh-top` with `.sig-head`; add the titles' standby grey (§1.1).
- StudioOne.astro (HAZARD FILE: anchored exact-string edits only, and PRINT that every replace matched — a silent
  no-match shipped a real bug once): the block at ~1536–1561 (`.live-signal :global(.sgm .pwr) { transform: scale(1.5) …`
  through the `::after` rule) is REWRITTEN for the switch: no scale (the switch is 68 × 30 already: `transform: none`),
  and the standby overrides re-targeted at the rocker/lamp/halo selectors you define, brighter than the file's own (the
  2026-09-21 values' spirit: the lamp's red plainly visible, the halo wider and stronger), every override gated on
  `.device:not(.live)` and `.pwr:not(.lit)`. Update the comment above it (the disc → the switch). Touch nothing else.
- Proof: `r4-shot.mjs --sel '.sig-head' --out r4-P-head-on.png` (the switch ON, lit) and a standby shot: run the probe
  with `--url 'http://localhost:4636/signal/?mute=1&standby=1'`? No such flag exists — instead take the standby shot with
  your own 20-line variant `r4-P-standby.mjs` that does NOT click #pwr (copy the probe, drop the click). LOOK at both.
  Also assert in the report: `#pwr` hit-testable (elementFromPoint at its centre is the button or inside it), a trusted
  click → boot → live, a second click → powerdown → standby.

### 1.3 THE KEYS TOWER's foot (lane K: view/keys-view.ts + keys.css + keys-view.test.mjs)
- THE ARP LEAVES THE SURFACE: delete the ARP cap, RATE · LENGTH · GROOVE, their laws (arpWrite, bRate/bLen/bGroove,
  LEN_MIN/LEN_SPAN, the ARP_DIVS import). The engine keeps harmony.arp untouched; this tower never writes it.
- THE FOOT `.kv-harm` (44, the tower's last row, the keys' hands row; its rail `.kv-foot` 36 stays directly above it —
  Jon: "keep the gain"; the rail's top stays on the drums'/bass' line at 430): left to right inside 544 px —
  1. THE CHORD GLASS `data-ctl="chord-glass"`: `accent(glass('glow kv-chord dim'), 'harmony')` with `b.kv-clabel` (the
     name, 22 px, sapphire ink, `.sg-t-blink` on a new name) over `small.kv-cdeg` (the degree, 12 px, `.on` when on the
     map); the SETTLE LAW copied from view/hands-view.ts:399-439 (the 90 ms settle, the 70 ms blink burst-guarded 150 ms,
     `.dim` = the last name held after release, a key/scale change respells at once; what SOUNDS = harmony.sounding() if
     present else keys.held(); it listens to keys.onHeldChange AND the frame's pool signature — carry the rAF signature
     check, or subscribe to onHeldChange + respell on music change: the frame you already run (paintLoading) can carry the
     pool signature). Width: `flex: 1 1 150px; min-width: 140px; max-width: 190px; height: 44px`; the recipes of
     hands.css:32-42 (`.sgh-chord .sgh-clabel .sgh-cdeg .sgh-dot .dim`) copied into keys.css under the kv- names.
  2. `HOLD` · `CHORD`: the two `.sg-cap.kv-tog` toggles exactly as today (led, acc harmony, data-ctl hold / chord, a click
     writes H.set, lit + aria-pressed from the state), 8 apart, 10 px after the glass.
  3. a `sg-vdiv` hairline (`.kv-hdiv`, margin 8px 0) — the foot's two halves.
  4. THE KEY WALK `.kv-keygrp` (gap 5): `◀` cap (`cap('', {icon: LEFT, cls: 'kv-arrow', name: 'Key down'})`, data-ctl
     `key-`, 30 × 30, radius 7, the 11 px glyph) · THE KEY SCREEN `screen('C MAJ', 'key', 'kv-keyscr')` (data-ctl `key`,
     min-width 100, height 44, the numeral 22 px amber, `white-space: nowrap`) · `▶` (data-ctl `key+`) · the `SCALE` cap
     (`cap('scale', {cls: 'kv-scale'})`, data-ctl `scale`, 30 tall, padding 0 12px, margin-left 4). Laws copied from
     hands-view.ts:40-51 + 188-194: NOTE_NAMES, SCALES, SCALE_WORD, keySummary (`C MAJ` / `C# MIN` / `FREE`); ◀ ▶ walk the
     12 keys (`(key + 11) % 12`, `(key + 1) % 12`), SCALE cycles major → minor → chrom, all through
     `H.set('music', {...cur, key|scale})` only when changed; the screen prints from inst.state() on paint.
  THE NUMBERS THAT FIT 544 (use these, not the ones above where they differ): the glass `flex: 1 1 140px; min-width:
  140px; max-width: 170px` · gap 6 · HOLD (≈ 64) · 8 · CHORD (≈ 72) · 6 · the hairline (margin 6px 0) · 6 · ◀ 30 · 4 ·
  the KEY screen min-width 100 · 4 · ▶ 30 · 6 · SCALE (≈ 60) = 540. The row is `display:flex; align-items:center; gap: 0`
  with those margins explicit (or `gap: 6px` and the two 8/4 px gaps as margins). NOTHING may drop under the 12 px
  floor. A keycap never appears in this foot (no code is taught for the key walk).
- Nothing else in the tower changes (head · glass · body · rail as R3.3). The body stays 278.
- keys-view.test.mjs: the children list (`kv-head | … | sg-rail kv-foot | kv-harm`), the foot's hooks in order
  (`chord-glass hold chord key- key key+ scale`), NO arp hook anywhere (`arp`, `arp-rate`, `arp-length`, `arp-groove`
  absent; the tower never calls harmony.set('arp')), the KEY walk (◀ from C → B (11), ▶ back to C; SCALE major → minor →
  chrom → major; the screen prints `C MAJ` → `C MIN` → `FREE`), the chord glass (`.dim` at rest; the stub's held set
  [60,64,67,71] → after the settle the label prints the stub's name (its harmony.name knows Cmaj7 · I) and `.dim` lifts;
  empty again → `.dim` returns, the name stays), the hooks list = the contract's CTL.keys in tower order, the words list.
  Green: `keys-view: N/N`.
- Proof: `r4-shot.mjs --sel '[data-slot="keys"]' --out r4-K-keys.png` (and one with `--keys KeyA,KeyD,KeyG` so the glass
  names the chord). LOOK at it: the foot on one line, nothing wrapped, the rail still on the 430 line.

### 1.4 THE HANDS (lane V: view/hands-view.ts + hands.css)
- THE TOP STRIP IS GONE from this view: no `.sgh-top`, no `.sgh-tl/-tr`, no key group, no chord glass, no power slot (the
  chord glass + the KEY walk are lane K's now: delete NOTE_NAMES/SCALES/keySummary/LEFT/RIGHT/setLabel and the settle code
  from this file; keep octText, cName). `esc STOP` STAYS this view's: build `.sgh-stopgrp` (the `esc` keycap
  `accent(key('Escape','esc',{name:'Stop'}),'stop')` + `etch('stop','sgh-stopword')`, data-ctl `stop`, ptrKey → inst.stop(),
  `.lit` while anything runs, reflected on Escape — all as today) and APPEND it into the head's left corner:
  `root.querySelector('.sig-head [data-corner="stop"]')` (root is the strata; fall back to `root.prepend(stopGrp)` if the
  corner is missing — never throw). hands.css: the key's margin 0 inside `.sgh-stopgrp` (the row is 44; the 6 px body
  falls into the strata gap), `.sgh-stop` / `.sgh-stopword` as today. dispose() removes the group.
- THE KEYBED `.sgh-keybed` (250): `.sgh-bed` 60 · `.sgh-rail` 16 · `.sgh-caps` 100 · `.sgh-line` 50, gap 8, as a column.
- `.sgh-caps` (data-ctl keycaps): three columns `minmax(0,1fr) auto minmax(0,1fr)`: the LEFT flank `.sgh-flank.sgh-fl`
  EMPTY (dark; it stays in the DOM so the letters stay centred), the LETTER ROWS `.sgh-letters` exactly as today (428
  wide, the colour row over the home row, 44 caps, 4 gaps, the colour row 24 px right), the RIGHT flank
  `.sgh-flank.sgh-fr` holding THE OCTAVE GROUP `.sgh-octgrp` (data-ctl-less wrapper): `[←]` (`key(OCT_DN,'←',{name:'Octave
  down'})`, data-ctl `oct-`, class sgh-okey) · the OCTAVE screen (`screen('0','octave','sgh-octscr')`, data-ctl `octave`,
  min-width 74, 44 tall, the numeral 22 px) · `[→]` (`oct+`), gap 8, vertically centred on the letter rows (the flank is
  `display:flex; align-items:center; padding-bottom: 4px` like R3.3's), its left edge 40 px from the letters (padding-left
  40). The ← → keycaps act by pointer (ptrKey → setMusic oct ∓ 1, clamped −1..+1) and reflect ArrowLeft/Right as today.
- THE Z/M LINE `.sgh-line` (position relative; height 44; margin-bottom 6; the 1252 content width): everything absolutely
  placed from the letters' geometry (the home row starts at x = (1252 − 428) / 2 = 412; a cap is 44, the pitch 48):
  · Z = `accent(key('KeyZ','Z',{name:'Gate (hold)'}),'gate')`, data-ctl `keys-gate`, 44 (NOT lg: it is a keyboard key on
    the keyboard's own row), its centre under the A/S seam: `left: 436px` (seam 458 − 22). M likewise, data-ctl
    `keys-dive`, under the J/K seam: `left: 724px` (seam 746 − 22). Both `.lit` AMBER while held (the gesture's --acc
    'gate' = amber, keycap.css lights it), `.pressed` while down, the reference-counted hold (key + pad = two holders of
    one gesture, `H.gesture` wrapped as today) UNCHANGED.
  · THE GATE PAIR `.sgh-pair.sgh-gate` (data-ctl-less wrapper; `position:absolute; top:0; height:44; display:flex;
    align-items:center; gap:14px`): reading from Z outward, `RATE` (the stepped .side kx knob over GATE_DIVS, data-ctl
    `gate-rate`) then `SWING` (data-ctl `gate-swing`) — so in DOM order SWING · RATE, the pair RIGHT-aligned to end 96 px
    left of Z's face: `right: calc(1252px − 436px + 96px)` = `right: 912px`. Its word `gate` etched (`.sgh-gword`, 12 px,
    the amber-mixed ink of R3.3) centred ABOVE the pair, `bottom: calc(100% + 6px)`.
  · THE DIVE PAIR `.sgh-pair.sgh-dive`: from M outward `SPEED` (`dive-speed`) then `DIST` (`dive-dist`), LEFT-aligned 96 px
    right of M's face: `left: calc(724px + 44px + 96px)` = `left: 864px`; `dive` etched above it.
  · THE HAIRLINES `.sgh-wire` (one per pair, an `i`, absolute, `top: 22px; height: 1px`, amber at 45 %
    `color-mix(in srgb, var(--sg-amber) 45%, transparent)`, no glow): the gate's from the pair's right edge to Z's left
    face (`left: 340px; width: 96px`), the dive's from M's right face to the pair's left edge (`left: 768px; width: 96px`).
    The wire lights to 85 % while its key is `.lit` (a sibling selector or a class the hold toggles: `.sgh-line.gate-on
    .sgh-wire.gate` — your call, one rule).
  · The knob laws (bindKnob, GateDiv steps, SWING 0..1 as %, SPEED inverted 0.05..1.5 s, DIST 2..36) and the paint-back
    on inst.onChange are today's, byte for byte. The `.sgh-gknobs .si-knob.side.si-stepped .si-kn { min-width: 5.3ch }`
    rule keeps a turn from moving a dial.
- The piano, the rail, the letters' colour rims, the lamps (press / latched / sounding), the keyboard reflection, letGo,
  dispose: as today. REFLECTED = the caps + Z + M + ←/→ + Escape (unchanged set).
- hands.css: rewrite the header comment (R4 geometry), delete the top-strip section (§1), keep §2 with the new block +
  line rules; the chord/key/arrow/scale rules LEAVE this sheet (lane K has them).
- Proof: `r4-shot.mjs --sel '.sgh-keybed' --out r4-V-keybed.png`, `--keys KeyZ,KeyA --out r4-V-keybed-held.png`, and
  `--sel '.sig-head' --out r4-V-head.png`. LOOK: Z under A/S, M under J/K, the wires level with the keys' centres, the
  pairs not colliding with the octave group above the dive pair (the `dive` word sits in the ~24 px between them), the
  esc in the corner with `stop` beside it.

### 1.5 THE GATE (lane G: scripts/signal/gate.mjs, `--round r4`; r0–r3 stay runnable)
`legR4` = `legR2({...k, r3: true, r4: true})`; every change below is gated on `k.r4` (or `R4` at module scope), so
`--round r3` runs exactly as before on R3 code. Add an R4 paragraph to the file's header comment.
1. POWER: the row `power · the disc: top middle, hit` becomes, under r4, `power · the switch: hit-testable, toggles the
   state` = `sb.pwr && sb.hit` and the switch's centre inside the device's box (any place); the detail prints where it
   stands (`x px from the device's right edge, y px under its top`). The trusted-click → boot → live rows, the boot-sound
   row, the dark ≤ 55 % row, the power-off row: unchanged.
2. THE LOOP: `LOOP(how)` gets a third mode `"chord"` (r4): drums (Space) + bass (KeyB, mode seq) + C E G held (KeyA KeyD
   KeyG) with NO arp: the row `loop · 4 bars > −60 dBFS` passes on `rms > RMS_MIN && drums && bass && mode === 'seq' &&
   held === 3` and its detail says `chord (3 held) · arp OFF`. The throttle row (Chromium 20 s at 4×) rides the same loop.
   r3 keeps `"click"` (its fallback `harmony.set('arp')` still works on R4 code, where no arp cap exists).
3. DORMANT: `R4_DORMANT` = R3's list minus the three arp selectors; `DORM_WAKE` under r4 runs without the "arp on" group.
4. KEYCAPS: unchanged (R3_TAUGHT; Z and M once each — they stand on the line now).
5. SIZE FLOOR: the BPM rivals read `.sg-screen > b, .sgh-clabel, .kv-clabel` (both names: r3 code has the first, r4 the
   second). Words/numerals unchanged.
6. HOLD rows, KEYMAP rows, FIT rows (1440: 93–99.5 %, clear of the rail; 1024: clearance), RELOAD (armed and silent),
   STOP, PHONE, HOME: unchanged.
7. MODULE SHOTS (Chromium, r4): `mods` = drums, keys, bass, `head` (`.sig-head`; r3 keeps `top` `.sgh-top`), `keybed`
   (`.sgh-keybed`), and `switch` (`#pwr` — the selector prefix `.sig ` works: `.sig #pwr`). The pressed shot unchanged
   (KeyA + KeyZ held, the drums on).
8. NEW ROW `titles · three, over their towers, in their inks` (r4, in moduleShotRows or its own section after the size
   floor): the three `[data-ctl="title-drums|keys|bass"]` exist and are visible, textContent `DRUMS` `KEYS` `BASS`, each
   one's horizontal centre within 3 px of its `[data-slot=…]` box's centre, its bottom above the slot's top, computed
   font-size ≥ 16 px, and the three computed colours pairwise different. Detail: each title's centre offset + colour.
9. The still row, the console-errors row, KILL discipline: as today. `--round r4 --only chromium` must run end to end on
   the R3.3 tree (rows red where the views have not landed yet is fine; the rows must EXIST and judge the right things).
Also update the `--round` usage line and the R2 comment's "disc" words where they describe r4 behaviour.

## 2. Lanes and file ownership (parallel; one author each; writes ONLY its files)
| lane | model | owns (writes ONLY these) | reads | proof |
|---|---|---|---|---|
| P power | Opus | `src/signal/view/power.ts`, `src/styles/signal/power.css`, `src/components/studio/StudioOne.astro` (ONLY the `.pwr` block ~1536–1561 + its comment; anchored exact-string edits, each match printed) | §1.1–1.2, Signal.astro (the corner), material.css, today's power.ts/css | the two head shots (on / standby), looked at; the click facts |
| K keys | Opus | `src/signal/view/keys-view.ts`, `src/styles/signal/keys.css`, `src/signal/view/keys-view.test.mjs` | §1.3, hands-view.ts (the code to copy), hands.css:12-48 (the recipes to copy), common.ts, material.css, stub-instrument.ts | keys-view suite green; the keys shot looked at |
| V hands | Opus | `src/signal/view/hands-view.ts`, `src/styles/signal/hands.css` | §1.4, Signal.astro, keycap.css, common.ts, today's hands-view/css | the keybed + head shots looked at; `node --check`-level sanity (the file is TS: run `npx tsc --noEmit -p .` only if it already passes on the tree — else skip) |
| G gate | Opus | `scripts/signal/gate.mjs` | §1.5, today's gate, types.ts CTL | `node scripts/signal/gate.mjs --round r4 --only chromium` runs to its end (a red row is fine) |
| I integrator + look + judge | Fable | `types.ts`, `main.ts`, `Signal.astro`, `signal.astro`, `material.css`, `keycap.css`, `CLAUDE.md`, `NOTES-SIGNAL-R4.md`, `public/s/signal-still.webp`, the host fit if needed | everything | build · every suite · the gate green in three browsers · the look pass with the render open |

Lane rules: (1) every gesture calls the instrument, every paint reads `inst.state()` on `inst.onChange` (+ rAF for lamps),
exactly as today's views; (2) the material is the recipe, your sheet is the layout (unlayered, wins); (3) keep today's
data-ctl hooks and the contract's (types.ts CTL) — the gate reads them; (4) no new dependency, no import from another
lane's files (common.ts, controls.ts, types.ts, stage-geometry.ts are shared reads; COPY with a banner, never import);
(5) a view lane's proof is a LOOKED-AT screenshot from the planner's probe; (6) report in ≤ 25 lines: what you built,
the numbers you deviated from and why, the suite line, the shot paths, and `pgrep -fl -- --headless` empty.

## 3. The gate: see §1.5 (`node scripts/signal/gate.mjs --round r4`; r0–r3 stay runnable)

## 4. What shipped + residue (the planner, 2026-09-25 00:xx)
BUILT (branch `signal`, on main 1754f4d): the head (esc STOP · DRUMS KEYS BASS · the switch) replaces the top strip; the
switch (power.ts/css, the host's `.pwr` block rewritten); the keys' foot = the chord glass · HOLD · CHORD · ◀ KEY ▶ SCALE,
the arp off the surface (the engine keeps it, it loads off in main.ts); the keybed = the letter rows + the OCTAVE group in
the right flank + the Z/M line (Z under A/S, M under J/K, the pairs wired to their keys); the device 1280 × 882; the still
re-rendered (960 × 662). Suites: 28 green (keys-view 76, towers 56, surface 116, harmony 78). Gate r4: see the line below.
Shots: ~/Desktop/signal-r4/ (device · head · drums · keys · bass · keybed · switch off/on at 4× · pressed A+Z+drums ·
standby · the Z/M pair: R3.3's flanks over R4's line) and ~/Documents/studio-build/signal-r4/gate/.
GATE r4 GREEN 2026-09-25 00:2x (build exit 0; Chromium · WebKit · Firefox; 237 PASS / 0 FAIL / 0 HUNG; KILL PASS): the switch
hit-testable at 46 px from the device's right edge / 35 under its top, trusted click → boot → live ≤ 1.42 s; standby 35–37 %
of live; first sound 25–27 ms after a trusted KeyA; the loop (drums · bass seq · a held C E G, arp OFF) −7.6…−8.9 dBFS after
4 bars, 0 gaps; the titles +0.0 px off their towers' centres, 7.6 px above, 16 px, three inks; 103 words ≥ 12 px, 3 numerals
≥ 22, BPM 32 the largest (the chord label 22 next); fit 1440 = 95.54 % of the column (zoom 0.9569), 52.6 px clear of the rail;
reload armed and silent; stop < −90 dBFS; the module shots (head · drums · keys · bass · keybed · switch) + the pressed
state; the phone still; the homepage night on power / day on scroll-away. Table: ~/Documents/studio-build/signal-r4/gate/.

Residue (for Jon; nothing here blocks the round):
1. THE Z/M PLACEMENT IS HIS PICK: the render's bottom line is built (Z under the A/S seam, M under J/K, the knob pairs at
   the line's ends wired by a hairline); the pair picture puts R3.3's flanks (Z · RATE · SWING left, M · SPEED · DIST
   right) over it. If he picks the flanks back, the OCTAVE group needs a home (the left flank is free): one lane.
2. The keybed's LEFT flank is empty (the render's own asymmetry: the octave group sits right). A candidate for whatever
   comes next, or the octave group mirrors to the left if the flanks return.
3. The device is 882 tall (was 832): at 1440 × 900 the height binds (zoom 0.957 = 95.5 % of the column; /signal's padding
   24/32); the homepage host lands ≈ 95 % too. On a taller screen the width binds at 98 %.
4. THE SWITCH is 68 × 30 in the head's right corner: dull red plastic + the breathing halo in standby (the host brightens
   it), lit red from within while on (a power strip's law: red = on; the old disc's green-while-live is gone; the trace
   stays green). In standby the esc key reads as a plain key so the switch is the one red thing.
5. The chord glass in the keys' foot is 140–170 wide: a name longer than ~9 characters (`C#m(add9)/E`) clips at its right
   edge; the 22 px floor forbids shrinking it. Wider only by taking width from the KEY walk.
6. The titles are static words in Signal.astro (never controls); the dark greys them to an engraving.
7. The arp: `harmony.arp` stays in the state and the saved row; a saved "on" loads OFF (main.ts) and nothing on the surface
   turns it on. `--round r3` still runs on this tree (its loop falls back to `harmony.set('arp')`).
8. No TypeScript compiler is installed in the worktree (none may be installed): the views are checked by the build's
   parse (esbuild) and by the browser, not by tsc. As in R3.
9. The gate's `switch` module shot has a 1 KB floor (a 65 × 29 control is ≈ 2 KB); the r4 table widens its name column.
10. The homepage host (StudioOne) was touched in ONE block only (the `.pwr` overrides, 1 match printed); its fit's
    offsetHeight fallback still says 808 (harmless: the real height is measured).
