// from signal-studio-v6lib/src/views/instrument/stage-geometry.ts:1-92 (2a9e4a7) — VERBATIM (SIGNAL R1, lane V3), with ONE
// port: the two range constants (source lines 15-16, `STAGE_LO = 24` C1 · `STAGE_HI = 96` C7) are no longer declared here;
// they come from the frozen contract (src/signal/types.ts: STAGE_LO 48 · STAGE_HI 96 since R3, C3..C7, 29 whites, docs/signal-map/D §6)
// and are re-exported under the same names, so every consumer of this module reads the same range the harmony lane plays.
// The RANGE paragraph below is the Studio's own text about ITS C1–C7 stage (43 whites); the arithmetic is range-agnostic.
// Zero DOM, zero RNG; node-tested (stage-geometry.test.mjs beside this file).
import { STAGE_LO, STAGE_HI } from '../types.ts';
export { STAGE_LO, STAGE_HI };

// R14c — THE CHORD STAGE's geometry (pure leaf: zero imports, no RNG, no DOM; node-tested).
//
// One coordinate system, shared by the PIANO and the BRACKET RAIL beneath it, so the two can never
// drift out of alignment by hand-editing one of them. Everything is expressed as a percentage of the
// stage's width, laid out the way a real keyboard is: the WHITE keys tile the width evenly and the
// black keys straddle the seams between them.
//
// RANGE — C1…C7 (MIDI 24…96), six octaves, 43 white keys.
//   Why not the full 88: at the ~1130px the instrument has, 88 keys give 21.5px whites and ~13px
//   blacks — narrow enough that the black keys start to fidget and a printed note name stops fitting.
//   C1–C7 buys ~24% more key width, and it costs nothing real: the QWERTY board reaches MIDI 24 at
//   octOff −3 and the rack's voicings live between roughly MIDI 40 and 84, so A0–B0 and C♯7–C8 are
//   range no voicing in this instrument ever visits. Notes outside the range simply do not lamp.


const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const mod12 = (n: number): number => ((n % 12) + 12) % 12;

export const isWhite = (midi: number): boolean => WHITE_PCS.includes(mod12(midi));
export const inStage = (midi: number): boolean => midi >= STAGE_LO && midi <= STAGE_HI;

/** every white key of the stage, ascending — the tiling the whole layout is measured against. */
export const WHITES: number[] = (() => {
  const out: number[] = [];
  for (let m = STAGE_LO; m <= STAGE_HI; m++) if (isWhite(m)) out.push(m);
  return out;
})();

/** every black key of the stage, ascending. */
export const BLACKS: number[] = (() => {
  const out: number[] = [];
  for (let m = STAGE_LO; m <= STAGE_HI; m++) if (!isWhite(m)) out.push(m);
  return out;
})();

export const WHITE_COUNT = WHITES.length;
/** a white key's width, as a percentage of the stage. */
export const WHITE_W = 100 / WHITE_COUNT;
/** a black key is narrower and straddles the seam between two whites. */
export const BLACK_W = WHITE_W * 0.62;

const whiteIndex = new Map<number, number>(WHITES.map((m, i) => [m, i]));

export interface KeyBox { left: number; width: number; black: boolean }

/**
 * Where a MIDI note sits on the stage, in percent. Whites tile; a black key is centred on the seam
 * ABOVE its lower white neighbour (a black key's midi-1 is always a white key, by construction of the
 * 12-tone layout), which is exactly how a real keyboard is cut.
 */
export function keyBox(midi: number): KeyBox | null {
  if (!inStage(midi)) return null;
  if (isWhite(midi)) {
    const i = whiteIndex.get(midi);
    if (i == null) return null;
    return { left: i * WHITE_W, width: WHITE_W, black: false };
  }
  const below = whiteIndex.get(midi - 1);
  if (below == null) return null;
  return { left: (below + 1) * WHITE_W - BLACK_W / 2, width: BLACK_W, black: true };
}

/** the centre of a key, in percent — what the bracket rail measures its span from. */
export function keyCentre(midi: number): number | null {
  const b = keyBox(midi);
  return b ? b.left + b.width / 2 : null;
}

/**
 * The span a set of notes occupies, in percent — `null` when none of them are on the stage. Used by the
 * BRACKET to show where the QWERTY keys currently sit, and clamped to the stage so a partly-out-of-range
 * span still reports the part you can see.
 */
export function spanOf(notes: number[]): { left: number; width: number } | null {
  const on = notes.filter(inStage);
  if (!on.length) return null;
  let lo = Infinity, hi = -Infinity;
  for (const m of on) {
    const b = keyBox(m)!;
    lo = Math.min(lo, b.left);
    hi = Math.max(hi, b.left + b.width);
  }
  return { left: lo, width: Math.max(0.4, hi - lo) };
}

/** The MIDI note nearest a percentage position — the bracket rail's click-to-jump inverse. */
export function midiAtPct(pct: number): number {
  const i = Math.max(0, Math.min(WHITE_COUNT - 1, Math.floor((pct / 100) * WHITE_COUNT)));
  return WHITES[i];
}
