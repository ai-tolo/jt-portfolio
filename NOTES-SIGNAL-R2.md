# SIGNAL · ROUND 2 · TIGHTEN + POWER + THE SWAP (Jon, 2026-09-23 night: "it's basically perfect")

Jon's calls: (1) do the tightening; (2) the swap keeps the CURRENT instrument's idea: a glowing POWER button in the
top middle, everything DARK until power, the activation trace around the OUTER perimeter only, the boot sound, and
power-off when it scrolls out of view (the site goes night while powered, as today); (3) tutorial-esque info: a key
legend + an expandable brief beneath the instrument; (4) get it on the live site and push it. No WebMIDI, no gamepad.

## Lanes (parallel; one author each; files owned)
- **A tighten (engine):** `src/signal/out.ts` (a stop gate AFTER the master high-pass, closed by panic() in 5 ms,
  reopened at +130 ms), `instrument.ts` (load(): the on flags come back OFF — drums.on, bass.on, harmony.arp.on, hold —
  a reload is armed and silent; wake() reopens the gate), `kit.ts` (+ `scripts/signal/kit-extract.mjs` → the six hits as
  static `public/s/59e8a3b3/kit/<lane>.m4a`, fetched at boot; no base64 in the bundle), `keys.ts` + `sampler.ts`
  (bend(cents, tauSec?) per the contract), `bass.ts` (dive honours the speed), `harmony.ts` (passes dive.speedSec), tests.
- **B power + hands + info (view):** `src/signal/view/power.ts` + `src/styles/signal/power.css` (the standby skin, the
  power disc, the perimeter trace, the boot sound, data-state/data-live), `hands-view.ts` (POWER in the top strip's
  middle; Z/M gesture reference-counting), `src/components/signal/Signal.astro` (the host-compatible root `#sgm[data-state]
  > .device.sig.sig-device`, the legend + the `<details>` brief beneath), `src/components/signal/signal-copy.ts` (DRAFT
  words, Jon-editable), `src/pages/signal.astro` (anything the new root needs), `public/s/59e8a3b3/boot.m4a`.
- **C swap + production:** `src/components/studio/StudioOne.astro` (mount `<Signal />`; the watcher and fit stay; drop the
  old a11y patches), `junkyard/` (the old SignalMachine.astro + the five signal-*-lab/test pages), `scripts/vercel-cache-
  headers.mjs` (`/s/` immutable), `CLAUDE.md` (the sacred-file section rewritten for the new instrument).
- **Gate:** `scripts/signal/gate.mjs --round r2` (power first; standby is dark; power-off; the homepage scroll-out).
- Then the planner: look, merge `signal` → `main`, push, verify www.uxjon.com.

## The host contract (what StudioOne already expects; B builds to it, C keeps it)
`#sgm[data-state]` standby → boot → live → powerdown → standby (boot/on/live = the site goes night); `#pwr` = the power
toggle (the host clicks it when the room is < 35 % visible); `.sgm > .device` is the 1120 px box the host zooms with
`--sig-zoom`; the host's `.pwr` overrides (scale 1.5, the red standby glow, `.lit` while booting, `.device.live` green).
Power-on: the boot sound fires AT THE PRESS (Jon's law), the context resumes on that gesture, the trace draws the outer
perimeter (1380 ms), then the instrument bulbs up (data-live="1"). Power-off: master stop + the trace runs back + dark.
Dark-until-power is LIGHTING only (never geometry). Escape stays the master stop; power is the disc.
