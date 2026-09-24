// SIGNAL · lane K · MOTION. The keys LFO as a control-rate writer of p into the one low-pass (filter.ts stays
// verbatim: the page's filter has no detune or mod input, C §6).
//
// ═══ from docs/signal-map/C-keys-sampler.md §6 "R1 wiring" — the Studio's law (signal-studio-v6lib
// src/engine/core.ts:636-690, 2a9e4a7: filtAmt = amount·600·log2(base/20) cents, i.e. x_eff = x·(1 − amount·d)
// with d = (1 − l)/2) carried into the page's p domain (floor 40 Hz, not 20) ═══
//
//   every 16 ms, while the context RUNS:
//     motion on  (amount ≥ .005):  filter.set(pHand · (1 − amount · d)),  d = (1 − L[shape](frac(beats / DIV))) / 2
//     motion off:                  filter.set(pHand) once when it turns off, then again only when pHand moves
//
// ONE WRITER. keys.state().filter is the HAND's p (keys.set('filter') only stores it); this timer is the only thing
// that writes the filter once the instrument runs, on or off, so the hand and the LFO never fight over the
// biquads. The cost of that: with MOTION off a hand move reaches the filter on the next tick (≤ 16 ms, then the
// filter's own τ 15 ms). While the context is suspended nothing is written (a frozen clock would stack the glides
// up for the first note); the first running tick writes the hand's p. For a saved corner that is right from the
// very first sample, build the filter with createPageFilter(ctx, p) (filter.ts) instead of createFilter.
//
// PHASE comes from the lattice (ctx time, not heard time: the filter automates in ctx time), so a 1/8 sweep lands
// on the 8ths; with the clock stopped it free-runs at the tempo. d = 0 is the hand's corner (the LFO only CLOSES
// the filter, as the Studio's): the sine is open ON the beat, sawi closes slowly and snaps open (it pumps), saw
// snaps shut and opens, sqr is open for the first half of each cycle. Master stop leaves pHand and MOTION alone
// (P/keys.ts:507-509: stop silences, it does not re-voice). Hidden tabs throttle the timer: MOTION may step
// audibly there, nothing breaks (C §6).

import type { CreateMotion, KeysState, LfoDiv, LfoShape, MotionDeps, Timekeeper } from './types.ts';

export const MOTION_TICK_MS = 16;
/** The MOTION knob reads OFF below this (views/instrument/shape.ts:215-226). */
export const MOTION_OFF = 0.005;

/** Beats per LFO cycle for each RATE detent (the Studio's SYNCS b, signal-studio-v6lib src/engine/dsp.ts:53-63). */
export const DIV_BEATS: Readonly<Record<LfoDiv, number>> = {
  '1/1': 4, '1/2': 2, '1/4': 1, '1/4T': 2 / 3, '1/8': 0.5, '1/8T': 1 / 3, '1/16': 0.25, '1/16T': 1 / 6, '1/32': 0.125,
};

/** The four shapes as l(f) in −1..1 over one cycle (core.ts:663-674; sawi = the FALLING ramp). */
export const LFO: Readonly<Record<LfoShape, (f: number) => number>> = {
  sine: (f) => Math.cos(2 * Math.PI * f),
  sawi: (f) => 1 - 2 * f,
  saw: (f) => 2 * f - 1,
  sqr: (f) => (f < 0.5 ? 1 : -1),
};

const frac = (x: number): number => x - Math.floor(x);

/** How far the LFO has closed the filter at `beats`: 0 = the hand's corner, 1 = the floor. */
export function lfoDepth(shape: LfoShape, div: LfoDiv, beats: number): number {
  const b = DIV_BEATS[div] ?? DIV_BEATS['1/8'];
  const l = (LFO[shape] ?? LFO.sine)(frac(beats / b));
  return (1 - l) / 2;
}

/** The p MOTION writes: the core:660/681 law in the page's p domain. */
export function motionP(pHand: number, motion: KeysState['motion'], beats: number): number {
  return pHand * (1 - motion.amount * lfoDepth(motion.shape, motion.div, beats));
}

/** The LFO's clock in beats: the lattice while the clock runs (a bar = 4 beats), else free-running at the tempo. */
export function lfoBeats(time: Timekeeper, ctx: BaseAudioContext): number {
  if (time.running()) {
    const g = time.grid();
    if (g && g.barFrames > 0 && g.sr > 0) return ((ctx.currentTime * g.sr - g.originFrame) * 4) / g.barFrames;
  }
  const bpm = time.bpm();
  return (ctx.currentTime * (Number.isFinite(bpm) && bpm > 0 ? bpm : 120)) / 60;
}

export const createMotion: CreateMotion = ({ keys, time, filter, ctx }: MotionDeps) => {
  let disposed = false;
  let moving = false;          // the last write was an LFO value (so turning MOTION off owes one write of pHand)
  let lastHand = NaN;          // the pHand last written with MOTION off (NaN: nothing written yet)
  let warned = false;

  const tick = (): void => {
    if (disposed || ctx.state !== 'running') return;
    try {
      const s = keys.state();
      const pHand = s.filter;
      if (!Number.isFinite(pHand)) return;
      if (s.motion && s.motion.amount >= MOTION_OFF) {
        filter.set(motionP(pHand, s.motion, lfoBeats(time, ctx)));
        moving = true;
      } else if (moving || pHand !== lastHand) {
        filter.set(pHand);
        moving = false;
        lastHand = pHand;
      }
    } catch (e) {
      if (!warned) { warned = true; console.warn('[signal/motion] tick failed (MOTION keeps trying)', e); }
    }
  };

  const timer = setInterval(tick, MOTION_TICK_MS);
  tick();
  return {
    dispose(): void {
      if (disposed) return;
      disposed = true;
      clearInterval(timer);
    },
  };
};
