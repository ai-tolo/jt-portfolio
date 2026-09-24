// SIGNAL · lane K · THE ONE LOW-PASS. THE PAGE's filter, VERBATIM (C §6-7; NOTES-SIGNAL-R1 §1 KEYS: FILTER_OPEN 0.995,
// the page's own value, which its 56 tests pin). keys.out → filter.input, filter.output → effects.input (the integrator
// wires both); MOTION (motion.ts) is the only writer of p once the instrument runs.
// ═══ from signal-studio-page/src/page/filter.ts:1-149 (67b6b58) — line 36 (its import of ./types) repointed to ./types.ts ═══
// THE PAGE · THE ONE LOW-PASS (scope C). The FILTER move's sound: the same slope on the live voice
// and on every chip, fully open = a TRUE bypass.
//
// ── THE SLOPE ─────────────────────────────────────────────────────────────────────────────────
// 24 dB/oct Butterworth = two cascaded 2nd-order low-passes whose linear Qs are the 4th-order
// Butterworth pole pair, 1/(2·cos(π/8)) = 0.5412 and 1/(2·cos(3π/8)) = 1.3066. The Web Audio spec
// reads a LOWPASS biquad's Q in DECIBELS (α = sin ω0 / (2·10^(Q/20))), so the params get
// 20·log10 of those: −5.33 dB and +2.32 dB. Written in raw, 0.5412 and 1.3066 would be read as
// dB (linear 1.06 and 1.16) and the corner would sit +1.8 dB PROUD instead of −3.01 dB on a flat
// top; filter.test.mjs walks the spec's own coefficient formula to prove the pair is maximally
// flat, −3.01 dB at the corner, −24 dB an octave up.
//
// ── THE BYPASS, WHICH IS A SECOND LEG AND NOT A HIGH CORNER ───────────────────────────────────
// A low-pass at 20 kHz is not transparent: a 4th-order section at 20 k still turns phase and sags
// the top octave, and a chip held "fully open" would be a different sound from the dry take it was
// cut from (Law 5: nothing applied twice, nothing applied at all when nothing is dialled). So the
// graph is built ONCE as two legs summed at the output —
//
//     input ─┬─ bq1 ─ bq2 ─ wet ─┬─ output
//            └──────── dry ──────┘
//
// — and p >= FILTER_OPEN is dry 1 / wet 0, EXACTLY: gains written as values at construction and
// reached by LINEAR ramps (which land on their end value and hold it) rather than setTargetAtTime
// (which only approaches it). x·1 + y·0 is x to the bit, which is what the gate's offline render
// asserts. Crossing FILTER_OPEN is a 10 ms linear crossfade between the legs: near the threshold the
// corner is ~19.4 kHz, the two legs are nearly the same signal, and a linear fade of correlated
// signals keeps the level.
//
// ── NEVER RE-PATCHED, NEVER ZIPPERED ─────────────────────────────────────────────────────────
// set() only writes automation: setTargetAtTime (τ 15 ms) on both biquads' frequency, every call —
// a trackpad sweep lands dozens of targets a second and each one starts from wherever the last one
// had got to — and the leg crossfade only when the bypass state flips. No connect/disconnect after
// construction (the suite counts them). While bypassed the biquads keep following p, so leaving the
// bypass starts from a corner near where the hand is rather than from the last closed position.

import { FILTER_MAX_HZ, FILTER_MIN_HZ, FILTER_OPEN, type CreateFilter, type FilterHz } from './types.ts';

/** The 4th-order Butterworth pole pair, as LINEAR Qs. */
export const BUTTERWORTH_Q: readonly [number, number] = [
  1 / (2 * Math.cos(Math.PI / 8)),       // 0.5411961
  1 / (2 * Math.cos((3 * Math.PI) / 8)), // 1.3065630
];
/** …as the Web Audio lowpass wants them: dB (−5.333, +2.323). */
export const BUTTERWORTH_Q_DB: readonly [number, number] = [
  20 * Math.log10(BUTTERWORTH_Q[0]),
  20 * Math.log10(BUTTERWORTH_Q[1]),
];
/** The corner's glide under a moving hand (setTargetAtTime time constant, seconds). */
export const FILTER_TAU = 0.015;
/** The dry ↔ filtered crossfade when p crosses FILTER_OPEN (seconds, linear). */
export const BYPASS_FADE_SEC = 0.01;

/** p clamped to 0..1 (a non-number reads as fully open: the safe, transparent end). */
export function clampP(p: number): number {
  return Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 1;
}

/** The corner for a position: FILTER_MIN_HZ · (FILTER_MAX_HZ / FILTER_MIN_HZ)^p, so equal thumb
 *  travel is equal musical distance (one full sweep = log2(500) ≈ 9 octaves). */
export const filterHz: FilterHz = (p: number): number =>
  FILTER_MIN_HZ * (FILTER_MAX_HZ / FILTER_MIN_HZ) ** clampP(p);

/** At or past FILTER_OPEN the biquads are out of the signal path (the dry leg carries it alone). */
export function isBypass(p: number): boolean {
  return clampP(p) >= FILTER_OPEN;
}

/** Jump-free move of a gain to v: pin wherever the param is now (mid-fade included), then a
 *  linear ramp that ENDS EXACTLY on v — the bypass depends on landing on 1 and 0, not near them.
 *  The pin is an explicit setValueAtTime: cancelAndHoldAtTime alone inserts nothing when no event
 *  follows t, and the ramp would then start from the LAST crossing's end — every crossing after the
 *  first became an instant switch between the legs instead of a 10 ms crossfade. */
function fade(param: AudioParam, v: number, t: number): void {
  const p = param as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
  const now = param.value;
  if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(t);
  else param.cancelScheduledValues(t);
  param.setValueAtTime(now, t);
  param.linearRampToValueAtTime(v, t + BYPASS_FADE_SEC);
}

export function createPageFilter(ctx: BaseAudioContext, p0 = 1): PageFilter {
  // The biquad frequency param is nominally bounded by Nyquist; 20 kHz is under it at 44.1/48 k,
  // but an offline check at a lower rate must not be handed an out-of-range corner.
  const nyq = ctx.sampleRate * 0.49;
  const corner = (p: number): number => Math.min(filterHz(p), nyq);

  let pos = clampP(p0);
  let bypassed = isBypass(pos);

  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  input.gain.value = 1;
  output.gain.value = 1;
  const bqs = BUTTERWORTH_Q_DB.map((qDb) => {
    const b = ctx.createBiquadFilter();
    b.type = 'lowpass';
    b.Q.value = qDb;
    b.frequency.value = corner(pos);   // a value, not a glide: the first sample is already right
    return b;
  });
  // The starting state as VALUES — a filter born open is bit-transparent from its first sample,
  // and one born at p = 0.4 is fully filtered from its first sample (no leak through a fade-in).
  dry.gain.value = bypassed ? 1 : 0;
  wet.gain.value = bypassed ? 0 : 1;

  // The one patch, for the filter's whole life.
  input.connect(dry);
  dry.connect(output);
  input.connect(bqs[0]);
  bqs[0].connect(bqs[1]);
  bqs[1].connect(wet);
  wet.connect(output);

  let disposed = false;

  return {
    input,
    output,
    set(p: number): void {
      if (disposed || !Number.isFinite(p)) return;   // a NaN from a bad delta must not move anything
      pos = clampP(p);
      const t = ctx.currentTime;
      const hz = corner(pos);
      for (const b of bqs) b.frequency.setTargetAtTime(hz, t, FILTER_TAU);
      const by = isBypass(pos);
      if (by !== bypassed) {
        bypassed = by;
        fade(dry.gain, by ? 1 : 0, t);
        fade(wet.gain, by ? 0 : 1, t);
      }
    },
    get(): number {
      return pos;
    },
    hz(): number {
      return bypassed ? Infinity : filterHz(pos);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const n of [input, dry, wet, output, ...bqs]) {
        try { n.disconnect(); } catch { /* already out of the graph */ }
      }
    },
  };
}

// ═══ from signal-studio-page/src/page/types.ts:67-77 (67b6b58) — the page's return type, kept beside its filter ═══
export interface PageFilter {
  readonly input: AudioNode;
  readonly output: AudioNode;
  /** Ramp to p (setTargetAtTime tau 0.015 on both biquads' frequency; the bypass crossfade when crossing
   *  FILTER_OPEN). Never re-patches the graph, never zippers under a trackpad sweep. */
  set(p: number): void;
  get(): number;
  /** The effective corner in Hz, Infinity when bypassed (the gate reads it). */
  hz(): number;
  dispose(): void;
}

// ═══ lane K (new): the contract's factory (types.ts CreateFilter). Born open (p0 = 1, a true bypass). A PageFilter
// satisfies SignalFilter structurally; hz() and dispose() ride along. To have a saved corner from the very first
// sample (a value, not a 15 ms glide at resume), call createPageFilter(ctx, p) with the loaded keys.filter instead. ═══
export const createFilter: CreateFilter = (ctx) => createPageFilter(ctx);
