# SIGNAL · ROUND 5 · THE COMPARTMENT ROUND (build notes, planner-owned; Jon's mock is docs/signal-map/r5-mock.webp)

Branch `signal` (worktree `~/sites/jt-portfolio-signal`), on R4 = 69b3ab9. Hands `:4636/signal` (the astro dev server: HMR serves
every lane's edit); gate `node scripts/signal/gate.mjs --round r5` (:4637). Nothing merges, nothing pushes this round.
JON'S WORDS (2026-09-25, with the mock): "a ROUGH. MOCK. UP. i'm trying to visually compartmentalize a bit better, and unclog some
of the clutter. i don't think the key needs large arrow buttons, i think it confuses the octave/chord slider function with the
real arrow keys. i'd rather it be where you just click the screen to cycle through the scales, then maybe a maj / min toggle on
the side of it." → the proposal he approved ("yes, go"; MAJ/MIN only: "i was using images so i only had MAJ available"):
THE MOCK IS THE SOURCE OF THE TAKEAWAYS, not a layout to measure. Read the contract `src/signal/types.ts` (the R5 block above
DEVICE_H · CTL) before writing a line. Every lane: `source ~/.nvm/nvm.sh && node src/signal/view/<suite>.test.mjs` is the unit; NO
`npm run build` in a lane (the integrator builds once; the gate lane's own run builds). Screenshots: the planner's probes in
`<scratchpad>` = /private/tmp/claude-501/-Users-tolo/e621129c-3c52-41e4-a99e-b7399ab6ac5c/scratchpad/: `r4-shot.mjs` (a fitted
shot: `--sel`, `--keys`, `--space`, `--full`) and `r4-I-look.mjs` (1:1: pins --sig-zoom 1; `--mods`, `--standby`, `--keys`,
`--space`); both power the device by a trusted click on #pwr and kill their browser in finally. Use them, never write your own.
Scratch files: `<scratchpad>/r5-<lane>-*`. Sound safety: never engage audio in a live preview pane; headless only (`?mute=1`);
`pgrep -fl -- --headless` prints nothing of yours at the end. Never `npm install` anything.

## 1. Decisions (taken; do not re-litigate — cite the line if you must deviate, and say so in your report)

### 1.1 The head, the towers: R4's. Only the keys' foot and the keybed change. The device gets shorter (≈ 850, measured at the end).

### 1.2 THE KEYS' FOOT is the chord's (lane K: keys-view.ts + keys.css + keys-view.test.mjs)
- `.kv-harm` (44, the tower's last row, under the rail as R4): `CHORD` cap at the LEFT end (data-ctl `chord`) · THE CHORD GLASS
  centred, wide (`flex: 1 1 auto; min-width: 0` — it takes the whole middle; data-ctl `chord-glass`; the settle/blink/dim law
  as R4; the name 22 px, the degree 12 px) · `HOLD` cap at the RIGHT end (data-ctl `hold`). Gaps 12. DOM + CTL order:
  `chord chord-glass hold`. The caps are R4's `.kv-tog` (led, acc harmony, a click writes H.set, lit + aria-pressed from the
  state). THE KEY WALK LEAVES THIS TOWER: delete ◀ ▶ SCALE, the KEY screen, keySummary/NOTE_NAMES/SCALES/LEFT/RIGHT, the
  `.kv-keygrp .kv-arrow .kv-keyscr .kv-scale .kv-hdiv` rules; nothing in this tower writes harmony.music any more.
- keys-view.test.mjs: the foot's hooks in order (`chord chord-glass hold`), no `key`/`key-`/`key+`/`scale` hook anywhere in the
  tower, the tower never calls H.set('music'); the chord glass tests as R4 (dim at rest, names the stub's held set after the
  settle, dim returns on silence, the name stays); the hooks list = CTL.keys in tower order; the words list. `keys-view: N/N`.
- Proof: `r4-shot.mjs --sel '[data-slot="keys"]' --out <scratchpad>/r5-K-keys.png` and `--keys KeyA,KeyD,KeyG --out
  <scratchpad>/r5-K-keys-chord.png`. LOOK: CHORD left, the glass wide with the name centred, HOLD right, the rail on its line.

### 1.3 THE KEYBED (lane V: hands-view.ts + hands.css) — the mock's compartments, in the material
- `.sgh-keybed` = the piano `.sgh-bed` 60 · gap 8 · THE RAIL 12 · gap 8 · THE BLOCK `.sgh-caps` (≈ 130). Column, `gap: 8px`.
- THE RAIL `.sgh-rail` (data-ctl `rail`, 12 tall): the WINDOW LINE ALONE — no housing (transparent), NO C names (`.sgh-oname`
  and cName go), the window `.sgh-win` = a 3 px sapphire line (radius 1.5, `top: 4.5px; height: 3px`, the sapphire at 85 % +
  a 6 px soft glow, its two ends 1 px brighter) placed at the letters' span as today (assignLetters → win.style.left/width);
  the drag law (jumpTo, capture, ew-resize) UNCHANGED — the rail's 12 px is the drag target, the line is what shows.
- THE BLOCK `.sgh-caps` (data-ctl `keycaps`): `position: relative; height: 130px` on the 1252 content width; everything inside
  absolutely placed from the tray:
  · THE TRAY `.sgh-tray`: the two letter rows (`.sgh-letters` exactly as R4: 428 wide, the colour row 24 px right, 44 caps, 4
    gaps, 8 between the rows) in a RECESSED WELL in the keycaps' own grey: `padding: 8px 10px 4px; border-radius: 10px;
    background: linear-gradient(180deg, rgba(0,0,0,.30), rgba(0,0,0,.14)); box-shadow: inset 0 1px 4px rgba(0,0,0,.6), inset
    0 0 0 1px rgba(0,0,0,.65), 0 1px 0 rgba(255,255,255,.045)` (a `.sg-deck` reading, no colour: a key well, not a highlight);
    448 × 108 (8 + 44 + 8 + 44 + 4), centred: `left: 402px; top: 0`.
  · THE KEY BLOCK `.sgh-keyblk` (top-LEFT, on the colour row's line: `position:absolute; left:0; top:30px; transform:
    translateY(-50%); display:flex; align-items:center; gap:10px`): THE KEY SCREEN `screen('C','key','sgh-keyscr')` (data-ctl
    `key`, `sg-ns` cursor, min-width 74, height 44, the root 22 px amber over `key` 12 px; prints NOTE_NAMES[music.key] —
    `C` `C#` `D` … (the sharps, the Studio's spelling), NEVER the scale word) — THE GESTURE (the BPM glass's law, drums-view.ts
    :158-180 is the reference: pointer capture, relative to the press, no jump): a plain click (release within 3 px of the
    press) = the NEXT key ((key + 1) % 12); a vertical drag = walks the key one step per 14 px, UP = higher (+1), down = lower,
    from the key at the press (quantized; the state written only when the step changes; a drag's own echo writes nothing).
    Beside it THE SCALE TOGGLE `seg([['major','MAJ'],['minor','MIN']], scale, 'col sm sgh-scl')` (data-ctl `scale` on the seg;
    `button[data-v]` 22 tall, 12 px words; makeSeg → H.set('music', {...cur, scale}); painted from the state: the chosen one
    `.on` + aria-pressed; if the state ever holds 'chrom' neither is on). No ◀ ▶: an arrow-shaped cap is a real key here.
  · THE OCTAVE GROUP `.sgh-octgrp` (top-RIGHT, the same line: `position:absolute; right:0; top:30px; transform:
    translateY(-50%)`): `[←]` `0 OCTAVE` `[→]` exactly R4's (oct- · octave · oct+, gap 8, the keys act + reflect as today).
  · Z and M `.sgh-zkey` / `.sgh-mkey`: R4's keys (44, data-ctl keys-gate / keys-dive, amber `.lit` while held, the
    reference-counted hold UNCHANGED), just OUTSIDE the tray, A BOTTOM-ROW STEP LOWER than the home row: `top: 80px` (the home
    row's top 60 + 20); Z's right face 24 px from the tray's left edge: `left: 334px`; M's left face 24 px from the tray's
    right edge: `left: 874px`. `gate` / `dive` etched (`.sgh-gword`, R4's ink) centred OVER each key: `bottom: calc(100% +
    6px)` of the key (wrap the key + its word in `.sgh-gkey` so the word positions from the key).
  · THE KNOB PAIRS outboard, vertically centred on Z / M (`top: 102px; transform: translateY(-50%)`): the gate pair
    `.sgh-pair.sgh-gate` right-aligned 20 px left of Z (`right: calc(1252px − 334px + 20px)` = `right: 938px`), DOM order
    SWING · RATE (RATE nearest Z); the dive pair `.sgh-pair.sgh-dive` `left: 938px` (20 px right of M's face), SPEED · DIST.
    The knobs are R4's (.side kx, the laws + bindKnob + paint-back byte for byte; the stepped `.si-kn` min-width rule).
  · NO hairlines (`.sgh-wire` goes): adjacency joins each key to its pair.
- The piano (lights only, the colour rims, press/latched/sounding), the letters' colour rims, the keyboard reflection, letGo,
  dispose, `esc STOP` into the head's corner: R4's, unchanged. REFLECTED set unchanged.
- hands-view.ts: the KEY block's code (NOTE_NAMES, the click/drag gesture, the seg) is NEW here (the R4 keys-view had the
  ◀ ▶ walk: do not copy its caps; copy nothing but NOTE_NAMES). hands.css: rewrite the header comment (R5 geometry), replace
  the R4 line/wire rules with the block rules above.
- Proof: `r4-I-look.mjs --out <scratchpad>/r5-V-look.png --mods` (1:1; LOOK at r5-V-look-keybed.png and the whole device),
  `r4-shot.mjs --sel '.sgh-keybed' --keys KeyZ,KeyA --out <scratchpad>/r5-V-keybed-held.png`. Then a 30-line Playwright check
  (`r5-V-facts.mjs`, muted, killed in finally) that clicks `[data-ctl="key"]` → music.key 0 → 1 and the screen prints `C#`;
  drags it 30 px down → key back to 11 → the screen `B`; clicks `[data-ctl="scale"] [data-v="minor"]` → scale 'minor',
  aria-pressed; that no `[data-ctl="key-"]`/`[data-ctl="key+"]` exists on the device; `pgrep` empty at the end.

### 1.4 THE GATE (lane G: gate.mjs, `--round r5`; r0–r4 stay runnable) = r4's leg + these, gated on `k.r5` / `R5`:
1. `key · click steps, drag walks` (in the R3 sections' slot, after the keycaps rows): read music.key (k0); a trusted
   `page.mouse.click` on `[data-ctl="key"]`'s centre → music.key = (k0 + 1) % 12 within 150 ms and the screen's `b` prints
   the sharp name of it (NOTE_NAMES in the gate); then a trusted vertical drag on the screen (mouse.move to its centre, down,
   move 30 px DOWN in 3 steps, up) → music.key = (k0 + 1 − 2 + 12) % 12 (two steps back at 14 px/step: judge ≥ 1 step back
   and the screen matches the state); restore k0 via `instrument.harmony.set('music', …)`. Detail: k0 → after click → after
   drag, the screen's text each time.
2. `scale · MAJ / MIN toggle`: `[data-ctl="scale"] button[data-v="major"].on` at the default; `click('[data-ctl="scale"]
   button[data-v="minor"]')` → music.scale 'minor', aria-pressed flips, the letters' colour rims re-assign (the `.sgh-w.color`
   set changes); back to major; and NO `[data-ctl="key-"]`, `[data-ctl="key+"]` on the device, no `.sg-cap` inside
   `[data-ctl="keycaps"]` prints an arrow glyph.
3. `rail · the window line, no names`: `.sgh-rail` has NO `.sgh-oname`; `.sgh-win` is visible with width > 0 inside the rail.
4. The foot row `keys foot · CHORD · glass · HOLD`: `[data-slot="keys"] .kv-harm > [data-ctl]` in order `chord chord-glass
   hold`, the glass wider than each cap.
5. Everything else r4's: the switch, the titles, the loop (chord, arp OFF), dormant, keycaps (Z and M once), the size floor
   (rivals unchanged), hold rows (they click hold/chord: still there), fit, reload, stop, phone, home, the module shots (head ·
   drums · keys · bass · keybed · switch), the pressed shot, the still. The usage line + an R5 header paragraph.
`--round r5 --only chromium` must run to its end on the tree as the other lanes land (reds fine; a throw is your bug).

## 2. Lanes (parallel; one author each; writes ONLY its files)
| lane | model | owns | proof |
|---|---|---|---|
| K keys | Opus | keys-view.ts · keys.css · keys-view.test.mjs | suite green; the keys shots looked at |
| V hands | Opus | hands-view.ts · hands.css | the 1:1 keybed + device shots looked at; r5-V-facts |
| G gate | Opus | scripts/signal/gate.mjs | `--round r5 --only chromium` runs to its end |
| I | Fable | types.ts · main.ts · power.css · Signal.astro · signal.astro · material.css · CLAUDE.md · this file · the still | build · suites · the gate ×3 · the look pass |
Lane rules as R4's (§2 of NOTES-SIGNAL-R4.md): the instrument is the truth, the material is the recipe, keep the hooks, copy
with a banner never import across lanes, a LOOKED-AT screenshot is the proof, report ≤ 25 lines.

## 3. What shipped + residue (the planner, 2026-09-25)
BUILT (branch `signal`, on R4 69b3ab9): the keys' foot is the chord's (CHORD · the glass wide and centred · HOLD); the KEY walk
moved to the keybed's top-left block (the KEY screen: a click steps the key, a vertical drag walks it, 14 px a step; MAJ · MIN
as a column seg beside it; no arrow caps; FREE off the surface, a saved FREE loads as major in main.ts); the octave group
top-right on the same line; the letter rows in a recessed tray (448 × 112); Z and M just outside it a bottom-row step lower
(top 80; Z at 334, M at 874) with `gate` / `dive` over them and their knob pairs outboard (the gate pair ends at 314, the dive
pair starts at 938); no hairlines; the rail is the window line alone (no C names). The device is 1280 × 850 (DEVICE_H); at
1440 × 900 the WIDTH binds again (zoom 0.9815 = 98 % of the column; /signal's padding stays 24/32). The still re-rendered at
960 × 638. Suites: 28 green (keys-view 76, towers 56, surface 116). Shots: ~/Desktop/signal-r5/ and
~/Documents/studio-build/signal-r5/gate/. Lanes: 3 Opus agents (K keys · V hands · G gate) in parallel on the dev server; the
planner did the contract, main.ts, power.css, CLAUDE.md, the look pass (the tray's floor 4 → 8 so the home row's key bodies sit
in the well; the MAJ · MIN seg 55 → 50 tall so it stands 3 px proud of the screen), the still, the gate run.
GATE r5 GREEN 2026-09-25 (build exit 0; Chromium · WebKit · Firefox): the full three-browser run had ONE red row, Firefox's
`keycaps · press lights` (the A keycap's .lit stayed past the 155 ms window after a trusted key-up; its key-down had also
taken 62 ms against R4's 16: Firefox's rAF was slow in that run); the Firefox leg re-run alone against the same dist:
83/83 PASS (the release at 50 ms). Every other row passed first time: the switch hit-testable top-right; the KEY screen
click → C#, a 30 px drag → B (2 steps back); MAJ → MIN re-rims the piano; the rail holds no text, the window 381 × 3 px;
the foot chord · glass (369) · hold; the titles +0.0 px; the loop (chord, arp OFF) −8…−9 dBFS; the size floor; fit 1440 =
98.00 % of the column (zoom 0.9815, the width binds again); reload armed and silent; stop < −90 dBFS; the module + pressed
shots; the still; the homepage rows. Table: ~/Documents/studio-build/signal-r5/gate/. KILL PASS on every run.

Residue (for Jon; nothing here blocks the round):
1. The KEY screen's drag walks one key per 14 px; the click steps forward. The BPM glass (drag AND type) is the precedent;
   the KEY screen does not take typing (a letter typed into it would be a note).
2. FREE (chromatic) is reachable only through the state now; the letters follow the key's scale. If a chromatic mode is
   ever wanted back on the surface, it is a third cap in the scale column.
3. The chord glass is 376 wide in the foot: the longest names fit; a name is centred.
4. The dev server on :4636 died mid-round (an earlier chat's launch, not this one's); it was restarted through the launch
   entry `signal-rebuild` — the lanes' shots waited ~15 min for it. Nothing in the tree depends on it.
5. The homepage host: untouched this round (its `.pwr` block is R4's; its fit measures the height).
6. Firefox's keycap lamps ran 50–60 ms behind the key this session (R4 measured ~15): the gate's 150 ms window for the
   lamp's release is tight there; one run measured it late. Not a code change; the row is timing-sensitive by design.
