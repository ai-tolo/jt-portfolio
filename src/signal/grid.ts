// from signal-studio-page/src/page/grid.ts:1-134 (67b6b58) — VERBATIM except where marked [SIGNAL]:
//   · the import reads ./types.ts (FrameGrid, Line, BPM_MIN, BPM_MAX); CycleGrid left with toCycleGrid.
//   · toCycleGrid (P:83-86) and the header paragraph that explained it (P:14-16) are dropped: no leaf here
//     reads a CycleGrid (docs/signal-map/D-time-arp-chords.md §7).
//   · BPM_LO / BPM_HI are the contract's BPM_MIN / BPM_MAX (60 / 180; the page folded into 60..200).
//   · + THE LINES at the end (lineFrame, lineAtOrAfter, lineAtOrBefore, linesIn): new here, D §1.3.
//
// [PAGE · R1 · B] THE LATTICE — pure frame arithmetic for the one grid every page module shares.
//
// WHY INTEGER FRAMES. `240 * sr / bpm` is almost never a whole number (103.359 bpm at 48 kHz is
// 111 456.1… frames a bar), and rounding it separately for every loop length drifts: a 4-bar chip cut
// as round(4 * 111456.1) and a 1-bar chip as round(111456.1) disagree by a frame every few passes, and
// after an evening the two loops flam. So the lattice stores ONE integer `barFrames` and DERIVES its bpm
// (240 * sr / barFrames). A loop of k bars is then exactly k * barFrames frames, every bar line is
// originFrame + j * barFrames exactly, and nothing anywhere ever accumulates a float onset.
//
// WHY NO CLOCK HERE. Everything in this file is a function of (grid, frame) → frame. The TimeKeeper
// (time.ts) reads ctx.currentTime and the click (click.ts) books against it; the leaves, the gate and
// the node suite get the same answers without an AudioContext.

import type { FrameGrid, Line } from './types.ts';
import { BPM_MAX, BPM_MIN } from './types.ts';

/** 4/4 only (the house has no other meter; E-sheet-cycle.md's BEATS_PER_BAR audit). */
export const BEATS_PER_BAR = 4;

/** A lattice whose bar is the nearest whole number of frames to `bpm`. originFrame is ctx frames. */
export function gridFromBpm(bpm: number, sr: number, originFrame: number): FrameGrid {
  const b = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  return {
    sr,
    barFrames: Math.max(1, Math.round((240 * sr) / b)),
    originFrame: Math.round(originFrame),
  };
}

/** The lattice's true tempo — derived, never stored (it is what the frames actually play). */
export function gridBpm(g: FrameGrid): number {
  return (240 * g.sr) / g.barFrames;
}

/** Ctx frame of bar line j (any integer, negative = before the origin). */
export function barFrameOf(g: FrameGrid, j: number): number {
  return g.originFrame + j * g.barFrames;
}

/** The bar containing ctx frame f (a bar line belongs to the bar it starts). Integer division of two
 *  integers is exact in doubles far past any session length, so floor never lands one bar off. */
export function barIndexAt(g: FrameGrid, f: number): number {
  return Math.floor((f - g.originFrame) / g.barFrames);
}

/** First bar line at or after ctx frame f. */
export function nextBarFrame(g: FrameGrid, f: number): number {
  return barFrameOf(g, Math.ceil((f - g.originFrame) / g.barFrames));
}

/** Beat b (0..3) of bar j. Beats round INSIDE the bar, from the bar line — so a bar whose frames do not
 *  divide by four still starts exactly on its bar line, and beat rounding never accumulates. */
export function beatFrameOf(g: FrameGrid, j: number, b: number): number {
  return barFrameOf(g, j) + Math.round((b * g.barFrames) / BEATS_PER_BAR);
}

export interface BeatLine { frame: number; bar: number; beat: number }

/** First beat line at or after ctx frame f, with its bar and beat (beat 0 = the one, the accent). */
export function nextBeat(g: FrameGrid, f: number): BeatLine {
  const j = barIndexAt(g, f);
  for (let b = 0; b < BEATS_PER_BAR; b++) {
    const frame = beatFrameOf(g, j, b);
    if (frame >= f) return { frame, bar: j, beat: b };
  }
  return { frame: barFrameOf(g, j + 1), bar: j + 1, beat: 0 };
}

/** The beat line at or before ctx frame f (what is playing now: the view's bar/beat readout). */
export function beatAt(g: FrameGrid, f: number): BeatLine {
  const j = barIndexAt(g, f);
  let out: BeatLine = { frame: barFrameOf(g, j), bar: j, beat: 0 };
  for (let b = 1; b < BEATS_PER_BAR; b++) {
    const frame = beatFrameOf(g, j, b);
    if (frame <= f) out = { frame, bar: j, beat: b };
  }
  return out;
}

// [SIGNAL] toCycleGrid (P:83-86) dropped here.

// ─────────────────────────────────────────────────────────────── tap tempo
// Copied (not imported) from signal-studio-controller-station src/controller/pattern.ts:198-261:
// that module imports the station contract and its feel store, and the page imports leaves only.

/** Tap-tempo estimator bounds. FIRST GUESSES (the fold range is §D-2's own).
 *  [SIGNAL] the contract's tempo range (types.ts BPM_MIN..BPM_MAX = 60..180; the page had 60..200). */
export const BPM_LO = BPM_MIN;
export const BPM_HI = BPM_MAX;
export const MIN_TAPS = 3;
/** Adjacent-tap intervals outside this window are noise, not a beat: below
 *  60 ms is 1000 BPM of double-report, above 3 s is a player who stopped. */
export const IOI_MIN_MS = 60;
export const IOI_MAX_MS = 3000;

/**
 * THE TAP TEMPO'S GUESS — a pure IOI fold. Median of the adjacent tap intervals, because a median
 * survives the one tap a human puts in the wrong place; folded by octaves into BPM_LO..BPM_HI
 * ([SIGNAL] 60..180 here, 60..200 on the page), because a
 * player tapping eighths and a player tapping quarters mean the same tempo. Fewer than three taps is
 * not evidence: with no reading the lattice keeps the tempo it is already turning at.
 */
export function estimateBpm(taps: readonly number[]): number | null {
  if (!Array.isArray(taps) || taps.length < MIN_TAPS) return null;
  const iois: number[] = [];
  for (let i = 1; i < taps.length; i++) {
    const d = taps[i] - taps[i - 1];
    if (!Number.isFinite(d)) continue;
    if (d < IOI_MIN_MS || d > IOI_MAX_MS) continue;
    iois.push(d);
  }
  if (iois.length < MIN_TAPS - 1) return null;
  iois.sort((a, b) => a - b);
  const n = iois.length;
  const med = n % 2 ? iois[(n - 1) / 2] : (iois[n / 2 - 1] + iois[n / 2]) / 2;
  if (!(med > 0)) return null;
  return foldBpm(60000 / med);
}

/** Fold a raw BPM into BPM_LO..BPM_HI by octaves ([SIGNAL] 60..180, was 60..200). The range spans more
 *  than 2:1, so the fold always terminates inside it for any positive input. */
export function foldBpm(bpm: number): number | null {
  if (!Number.isFinite(bpm) || bpm <= 0) return null;
  let b = bpm;
  let guard = 24;
  while (b < BPM_LO && guard-- > 0) b *= 2;
  while (b > BPM_HI && guard-- > 0) b /= 2;
  if (!(b >= BPM_LO && b <= BPM_HI)) return null;
  return Math.round(b);
}

// ─────────────────────────────────────────────────────────────── [SIGNAL] THE LINES (new here, D §1.3)
// beatFrameOf generalised to ANY division. Line i of `perBar` lines in bar j is its bar line plus
// round(i · barFrames / perBar): rounded INSIDE the bar, from the bar line, exactly as the beats are. So
// every division starts each bar on the bar line, nothing accumulates across bars, and two divisions'
// lines that meet in time meet to the frame (the quotient i·barFrames/perBar is the same real number, and
// a correctly rounded division of an exact integer lands on the same double): a 16th on a beat IS that
// beat, a 1/8T line on a beat IS that beat. perBar per division:
//   1/2 → 2 · 1/4 → 4 · 1/4T → 6 · 1/8 → 8 · 1/8T → 12 · 1/16 → 16 · 1/16T → 24 · 1/32 → 32.

/** Ctx frame of line i of `perBar` lines in bar j. i runs 0..perBar; i = perBar is the next bar line. */
export function lineFrame(g: FrameGrid, bar: number, i: number, perBar: number): number {
  return barFrameOf(g, bar) + Math.round((i * g.barFrames) / perBar);
}

/** The first line of `perBar` at or after ctx frame f (0 ≤ i < perBar). */
export function lineAtOrAfter(g: FrameGrid, perBar: number, f: number): Line {
  const j = barIndexAt(g, f);
  const d = f - barFrameOf(g, j);
  // Start one below the estimate: every line two or more below it is at least 2·barFrames/perBar − ½
  // frames before f, so nothing at or after f is ever stepped over.
  for (let i = Math.max(0, Math.floor((d * perBar) / g.barFrames) - 1); i < perBar; i++) {
    const frame = lineFrame(g, j, i, perBar);
    if (frame >= f) return { frame, bar: j, i, perBar };
  }
  return { frame: barFrameOf(g, j + 1), bar: j + 1, i: 0, perBar };
}

/** The line of `perBar` at or before ctx frame f (the one sounding at f). */
export function lineAtOrBefore(g: FrameGrid, perBar: number, f: number): Line {
  const j = barIndexAt(g, f);
  const d = f - barFrameOf(g, j);
  // Start one above the estimate: every line two or more above it is past f (the mirror of the above).
  for (let i = Math.min(perBar - 1, Math.floor((d * perBar) / g.barFrames) + 1); i > 0; i--) {
    const frame = lineFrame(g, j, i, perBar);
    if (frame <= f) return { frame, bar: j, i, perBar };
  }
  return { frame: barFrameOf(g, j), bar: j, i: 0, perBar };
}

/** Every line of `perBar` in [fromFrame, toFrame), in order. `Harmony.book(b)` asks for its division's
 *  lines inside one 16th: linesIn(g, n, b.frame, lineFrame(g, b.bar, b.step + 1, 16)); the 16 windows
 *  of a bar partition that bar's lines exactly. A perBar that is not a whole number ≥ 1, or a window
 *  that is empty or not finite, has no lines. */
export function linesIn(g: FrameGrid, perBar: number, fromFrame: number, toFrame: number): Line[] {
  const out: Line[] = [];
  if (!Number.isInteger(perBar) || perBar < 1 || !(g.barFrames >= 1)) return out;
  if (!Number.isFinite(fromFrame) || !Number.isFinite(toFrame) || !(toFrame > fromFrame)) return out;
  let l = lineAtOrAfter(g, perBar, fromFrame);
  while (l.frame < toFrame) {
    out.push(l);
    const i = l.i + 1;
    l = i < perBar
      ? { frame: lineFrame(g, l.bar, i, perBar), bar: l.bar, i, perBar }
      : { frame: barFrameOf(g, l.bar + 1), bar: l.bar + 1, i: 0, perBar };
  }
  return out;
}
