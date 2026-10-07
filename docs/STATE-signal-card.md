# STATE · SIGNAL's card (lane S, branch `signal-card`, preview :4641)

Mission (Jon, 2026-10-06): HOW TO PLAY becomes ONE keyboard diagram (colour-coded groups, on-diagram labels; A–L and
W E T Y U O are all notes); the card's words stand alone for a stranger. Prompt: `docs/PROMPT-signal-card.md` (main
checkout, untracked). Owns `src/components/signal/**` + this file only; never `src/signal/**` or StudioOne.astro.


## SHIPPED 2026-10-06 (with lanes R and F)
main fast-forwarded to `ship/2026-10-06` (all three lanes replayed on main 7139908). Jon: "ship. i can edit later":
the DRAFT words went out as written; the controller / MIDI hardware / Ableton lines stay cut ("cool").

## Built (off main 7139908)
- `ecf648a` THE DIAGRAM. `src/components/signal/HowToPlay.astro` (new): inline SVG (viewBox 984 × 336, u = 50), a US
  keyboard with true stagger, only the rows that matter. Groups, in the device's palette (material.css) re-lit for
  paper and the night card:
  - notes · sapphire (`--sg-sapphire`, the KEYS tower): A–L pale keys + 1 px line, W E T Y U O solid deep keys between
    them (each straddles a home-row seam; R and I hairline ghosts with their letter at 30 %: the piano's 2–3 grouping);
    ← → `octave` and ↑ ↓ `sound of the notes` wear the same sapphire (they are the keys' controls).
  - drums on/off · orange (`--sg-drums`): the space bar, pale fill + 2 px rim.
  - bass on/off · violet (`--sg-bass` / `--sg-bass-lit`): B, pale fill + 2 px rim.
  - gate (hold) · dive (hold) · tap tempo · amber (`--sg-amber`, what Z, M and the = cap light in): hollow, 2 px.
  - stop everything · red (`--sg-red`, the head's `esc STOP`): esc, hollow, 2 px.
  Warm hues spread to 24° / 48° / 72° (red / orange / amber) so they never read as one; greyscale separates every group
  by structure (fill vs hollow, 1 vs 2 px, pale vs deep) plus its label. Labels sit on the picture beside their keys
  (JetBrains Mono 11 px, the card's label face) at a card ≥ 900 px; narrower, a legend list stands under the picture;
  < 480 the picture is a colour map beside the list. `role="img"` + a `<desc>` that reads the whole map. Nothing in it
  is focusable, hoverable or sounding.
  `signal-copy.ts` LEGEND is its data (groups: KEYMAP codes, legend key names, word, hue); the build throws if KEYMAP
  and LEGEND disagree or a bound key is not drawn. BRIEF = the card's story (one source).
  `SignalCard.astro`: the keycap legend + its CSS out, `<HowToPlay />` in. NIGHT FIX: on the homepage `.one` pins
  `--ink` to its day value, so the card's words went dark on dark whenever the site went night (the instrument's power
  does that, live on uxjon.com today); `--sc-ink` now follows `--night-ink` at night (falls back to `--ink` on /signal).
- `bd7adcc` THE WORDS (DRAFTS, Jon edits): story · first · from rewritten for a stranger; hood rows cut and re-checked
  against src/signal (effects, time and exit corrected; safety row dropped). See signal-card-copy.ts's header.

## Verified (headless Chrome, `--mute-audio`, `?mute=1`; keys never pressed; `#sgm` stayed `standby` throughout)
- Build exit 0 (after each commit). Built homepage and /signal carry `class="kd-svg"`.
- `/` at 1440 · 1280 · 1024 and `/signal` at 1440, day + night: the card opens and closes on a real click
  (aria-expanded true → false), 0 console errors, `scrollWidth == viewport` (document and main).
- 375 with touch emulation, day + night, `/` and `/signal`: no sideways scroll, 0 errors; the card is not mounted by
  design (the play room and /signal's card host hide under 900 px / coarse pointer). Forced visible on /signal at 375
  the diagram + legend still read and nothing overflows (shot below).
- `git diff --stat main -- src/signal src/components/studio/StudioOne.astro CLAUDE.md src/lib` is empty.
- Visible words on the open card: 435 → 312 (story 107 → 43 · how to play 33 → 52, key letters counted, 18 label
  words · hood 222 → 181 · from 72 → 35). Frequency pass: only drums ×5 and bass ×5 (the parts' names, each a
  different fact) and play ×3 repeat.

## Open
- Jon's words: story, first, from are DRAFTS. `first` is still unmounted (nothing reads CARD.first).
- Not checkable in this repo, so cut from `from` (Jon may restore): the PlayStation controller, the MIDI hardware,
  stems into Ableton.

## Links
- Preview (Mac): http://localhost:4641/#play (the card sits under the instrument; the chevron at its foot opens it)
  and http://localhost:4641/signal
- Shots: `~/Desktop/signal-card-{before,after}-*.png`, `~/Desktop/signal-card-contact-sheet.png`
- Branch: https://github.com/ai-tolo/jt-portfolio/tree/signal-card (no PR opened; Mac lane)

## Ship recipe (Jon's Mac, on his word "push it")
```
cd ~/sites/jt-portfolio && git fetch origin
git branch backup/main-pre-signal-card main
git -C ~/sites/jt-portfolio-signal-card rebase main        # only if main moved; resolve nothing outside src/components/signal
git merge --ff-only signal-card                            # from the MAIN checkout
source ~/.nvm/nvm.sh; npm run build > /tmp/build.log 2>&1; echo "exit: $?"   # judge the exit code only
git push origin main
curl -s https://www.uxjon.com/ | grep -c 'kd-svg'          # ≥ 1 once Vercel has deployed
```
Marker: the diagram's root `kd-svg` (also the SVG title "How to play SIGNAL from a computer keyboard").
