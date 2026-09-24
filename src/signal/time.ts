// SIGNAL · THE TIMEKEEPER (lane T) — ONE scheduler on ONE integer-frame lattice. New here
// (docs/signal-map/D-time-arp-chords.md §1.3), assembled from three Studio sources, each block marked:
//   from signal-studio-page/src/page/click.ts:86-199 (67b6b58) — the scheduler: a 25 ms setInterval,
//     createLookahead({min: 0.12}), gated on ctx.state === 'running', a frame CURSOR over lattice lines, a
//     line already past or within 4 ms of now SKIPPED (never crammed), look.restart() on every start.
//   from signal-studio-page/src/page/time.ts:292-328 (67b6b58) — the retime (a tempo change lands on the
//     next beat keeping bar + beat) and the tap series (≤ 8 taps, a 2 s gap starts a new series).
//   from signal-studio-v6lib/src/engine/core.ts:1271-1275, 1412-1441 (2a9e4a7) — the wantsClock law (the
//     first want seats the origin now + 50 ms and starts the clock + the audio heartbeat; the last un-want
//     stops both and drops the origin) and a joining part's own-division snap (a line ≥ now + 20 ms).
//
// WHAT IT OWNS. When things happen, never what sounds: it announces every 16th line inside the horizon,
// once, in order (onStep; onBar at bar lines, just before that line's onStep), and the modules book their
// own voices in their book(b) and track them for their own stop(). The one node it ever makes is the
// heartbeat's silent pulse (a 0-gain sink on ctx.destination, lookahead.ts), started with the clock and
// stopped with it and by stop() (the core's kill() never stopped its pulse: core.ts:1422 vs 1963).
//
// THE LATTICE AS SEGMENTS. A seated lattice is a short list of grids, each in force from its `from` frame
// on (segs[0] from −∞). A tempo change pushes a grid from the next beat line at or after the CURSOR (the
// first line not yet announced), anchored so that beat keeps its bar and beat numbers (P/time.ts:297-298:
// origin = at.frame − beatFrameOf({barFrames', origin 0}, at.bar, at.beat)). Lines before that frame still
// come from the old grid: a PENDING switch, never an instant one, and nothing already announced moves.
// A second change before the cursor reaches the switch replaces it at the same beat (a tempo drag is one
// switch per beat, never a stack). Lines, nextLine() and the playhead all read the segment in force at
// their own frame, so the count runs on across a switch without a gap or a repeat.
//
// grid() is the lattice in force at the moment asked about: inside onStep / onBar, the announced line's
// (so book(b) and linesIn(time.grid(), …) see the grid b was cut from); anywhere else, now's (the MOTION
// LFO reads ctx time, C §6). Unseated, it is the target tempo seated at frame 0. bpm() is the TARGET (the
// last setBpm), derived 240·sr/barFrames: the tempo glass follows a drag at once, the lattice at the beat.

import type { Booking, CreateTimekeeper, FrameGrid, Line, Part, TimeDeps, Timekeeper } from './types.ts';
import { BPM_DEFAULT, BPM_MAX, BPM_MIN } from './types.ts';
import {
  beatFrameOf, estimateBpm, gridBpm, gridFromBpm, lineAtOrAfter, lineAtOrBefore, lineFrame, nextBeat,
} from './grid.ts';
import { createAudioHeartbeat, createLookahead } from './lookahead.ts';
import type { Heartbeat } from './lookahead.ts';

/** The booking timer (P/click.ts:38 CLICK_TICK_MS). */
export const TIME_TICK_MS = 25;
/** The foreground horizon (P/click.ts:39 CLICK_HORIZON_SEC; the contract's "look-ahead ≥ 120 ms"). */
export const TIME_HORIZON_SEC = 0.12;
/** The first want seats the origin this far ahead (core.ts:1272, P/time.ts:85 TIME_LEAD_SEC). */
export const TIME_SEAT_SEC = 0.05;
/** A joining part's first line is at least this far ahead (core.ts:1273; P/click.ts:42 CLICK_LEAD_SEC). */
export const TIME_JOIN_SEC = 0.02;
/** A line this close to now (or already past) when a tick finds it is skipped (P/click.ts:45 LATE_SEC). */
export const TIME_LATE_SEC = 0.004;
/** The 16th lines the scheduler announces. */
export const STEPS_PER_BAR = 16;
/** A tap further than this after the last one starts a new series (P/time.ts:94). */
export const TAP_RESET_MS = 2000;
/** The median runs over at most this many taps (P/time.ts:97). */
export const TAP_KEEP = 8;
/** An old segment is dropped once its successor began this long ago (no heard frame reads it any more). */
const SEG_KEEP_SEC = 1;
/** The most lines one tick announces: a 90 s horizon (LOOK_MAX) at 180 bpm is 1080 16ths; this only stops a
 *  corrupt lattice from spinning the main thread (the cursor keeps the rest for the next tick). */
const TICK_GUARD = 8192;

/** For the node suite (and a page that wants no pulse); the page passes none of these. */
export interface TimekeeperOpts {
  /** A REPEATING timer (setInterval semantics). The suite captures the tick and drives it by hand. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** The audio-clock heartbeat (lookahead.ts createAudioHeartbeat). Default on. */
  heartbeat?: boolean;
  /** Passed through to createLookahead. */
  hidden?: () => boolean;
  wallSec?: () => number;
}

interface Seg { from: number; grid: FrameGrid }

export function createTimekeeper(d: TimeDeps, opts: TimekeeperOpts = {}): Timekeeper {
  const ctx = d.ctx;
  const sr = ctx.sampleRate;
  const seatF = Math.round(TIME_SEAT_SEC * sr);
  const joinF = Math.round(TIME_JOIN_SEC * sr);
  const lateF = Math.round(TIME_LATE_SEC * sr);
  // The bar lengths the tempo range allows, so a derived bpm never leaves BPM_MIN..BPM_MAX at any rate.
  const minBarF = Math.ceil((240 * sr) / BPM_MAX);
  const maxBarF = Math.floor((240 * sr) / BPM_MIN);
  const setTimer = opts.setTimer ?? ((fn: () => void, ms: number): unknown => setInterval(fn, ms));
  const clearTimer = opts.clearTimer ?? ((h: unknown): void => { clearInterval(h as ReturnType<typeof setInterval>); });
  const look = createLookahead({ min: TIME_HORIZON_SEC, hidden: opts.hidden, wallSec: opts.wallSec });

  /** Bar frames for a bpm: clamped to the range, gridFromBpm's rounding, kept inside the range's frames. */
  const framesFor = (bpm: number): number => {
    const b = Math.min(BPM_MAX, Math.max(BPM_MIN, bpm));
    return Math.min(maxBarF, Math.max(minBarF, gridFromBpm(b, sr, 0).barFrames));
  };

  const bpm0 = d.bpm;
  let target = framesFor(typeof bpm0 === 'number' && Number.isFinite(bpm0) && bpm0 > 0 ? bpm0 : BPM_DEFAULT);
  let segs: Seg[] = [];                 // [] = unseated; segs[0].from = −∞; a seg with from ≥ cursor.frame is pending
  let cursor: Line | null = null;       // the first 16th line not yet announced
  let seatFrame = 0;                    // bar 0, step 0 of this seating
  let fresh = false;                    // seated and nothing announced yet
  let gen = 0;                          // bumps on every seat and unseat (an announce in flight checks it)
  let ticking = false;
  let announcing: number | null = null; // the frame being announced: grid() answers for it
  let timer: unknown = null;
  let beat: Heartbeat | null = null;
  let taps: number[] = [];
  const wanted = new Set<Part>();
  const stepFns = new Set<(b: Booking) => void>();
  const barFns = new Set<(bar: number, frame: number) => void>();

  const nowFrame = (): number => Math.round(ctx.currentTime * sr);
  const copy = (g: FrameGrid): FrameGrid => ({ sr: g.sr, barFrames: g.barFrames, originFrame: g.originFrame });
  /** The segment in force at frame f (the last whose `from` ≤ f). Seated only. */
  const segAt = (f: number): number => {
    let k = segs.length - 1;
    while (k > 0 && segs[k].from > f) k--;
    return k;
  };
  /** The first line of perBar at or after f on the lattice as it stands: a line the grid in force at f
   *  would place at or past the next segment's start belongs to that segment instead. Seated only. */
  const lineFrom = (perBar: number, f: number): Line => {
    let k = segAt(f);
    let at = f;
    for (;;) {
      const l = lineAtOrAfter(segs[k].grid, perBar, at);
      const next = segs[k + 1];
      if (!next || l.frame < next.from) return l;
      k++;
      at = next.from;
    }
  };

  // ── seating: the core's wantsClock law (core.ts:1271-1275, 1436-1441) ───────────────────────────────
  const seat = (): void => {
    const origin = nowFrame() + seatF;
    segs = [{ from: -Infinity, grid: { sr, barFrames: target, originFrame: origin } }];
    cursor = { frame: origin, bar: 0, i: 0, perBar: STEPS_PER_BAR };
    seatFrame = origin;
    fresh = true;
    gen++;
  };
  const startClock = (): void => {
    look.restart(); // RV9 (core.ts:1427-1438): a stopped clock's silence is not a wake gap
    if (timer == null) timer = setTimer(tick, TIME_TICK_MS);
    if (!beat && opts.heartbeat !== false) beat = createAudioHeartbeat(ctx, () => { if (timer != null) tick(); });
    // The origin's own line is announced before the caller's task ends: `set('on')` and `want()` may come in
    // either order and the downbeat still books (a timer's first wake would be 25 ms of the 50 ms lead).
    queueMicrotask(tick);
  };
  const stopClock = (): void => {
    if (timer != null) { clearTimer(timer); timer = null; }
    if (beat) { beat.stop(); beat = null; }
    look.restart();
    segs = [];
    cursor = null;
    fresh = false;
    gen++;
  };

  // ── the scheduler: shaped like P/click.ts:130-154 ────────────────────────────────────────────────────
  const announce = (l: Line): void => {
    const g0 = gen;
    announcing = l.frame;
    try {
      if (l.i === 0) {
        for (const fn of Array.from(barFns)) {
          if (gen !== g0) return; // a listener stopped the clock: nothing more is announced from this line
          try { fn(l.bar, l.frame); } catch { /* one module throwing must not stop the lattice */ }
        }
      }
      for (const fn of Array.from(stepFns)) {
        if (gen !== g0) return;
        try { fn({ frame: l.frame, bar: l.bar, step: l.i }); } catch { /* … nor the other modules */ }
      }
    } finally {
      announcing = null;
    }
  };

  function tick(): void {
    if (ticking || !cursor || !segs.length || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    look.saw(now);
    const nowF = Math.round(now * sr);
    const endF = nowF + Math.round(look.horizon() * sr);
    if (cursor.frame < nowF + lateF) {
      // A start nobody has heard yet (seated while the context was suspended, or a first wake that came
      // late) starts on its one, 50 ms from now; anything later SKIPS the lines it missed, never crams them.
      if (fresh) seat();
      else cursor = lineFrom(STEPS_PER_BAR, nowF + lateF);
    }
    ticking = true;
    try {
      let guard = TICK_GUARD;
      while (cursor && cursor.frame < endF && guard-- > 0) {
        const line: Line = cursor;
        cursor = lineFrom(STEPS_PER_BAR, line.frame + 1); // advanced first: a listener's setBpm lands past it
        fresh = false;
        announce(line);
      }
    } finally {
      ticking = false;
    }
    // A segment no heard frame can read any more is dropped; the oldest kept one reaches back to −∞.
    if (segs.length > 1 && segs[1].from <= nowF - SEG_KEEP_SEC * sr) {
      while (segs.length > 1 && segs[1].from <= nowF - SEG_KEEP_SEC * sr) segs.shift();
      segs[0] = { from: -Infinity, grid: segs[0].grid };
    }
  }

  // ── tempo: P/time.ts:292-301 (retime) and 317-328 (tap) ────────────────────────────────────────────────
  function setBpm(bpm: number): void {
    if (!Number.isFinite(bpm) || bpm <= 0) return;
    const bf = framesFor(bpm);
    target = bf;
    if (!cursor || !segs.length) return;
    // A switch no line has left from yet is replaced (the same beat: no beat line lies between the cursor
    // and it), or simply withdrawn when the tempo comes back to the grid in force.
    while (segs.length > 1 && segs[segs.length - 1].from >= cursor.frame) segs.pop();
    const cur = segs[segs.length - 1].grid;
    if (bf === cur.barFrames) return;
    const at = nextBeat(cur, cursor.frame); // ≥ everything already announced: nothing to cancel
    // Solve beatFrameOf(next, at.bar, at.beat) === at.frame for the origin (the same rounding the lattice
    // uses everywhere, so the landing beat is exact to the frame).
    const offset = beatFrameOf({ sr, barFrames: bf, originFrame: 0 }, at.bar, at.beat);
    segs.push({ from: at.frame, grid: { sr, barFrames: bf, originFrame: at.frame - offset } });
  }

  function tap(nowMs?: number): void {
    const tMs = nowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (!Number.isFinite(tMs)) return;
    const last = taps.length ? taps[taps.length - 1] : null;
    if (last != null && (tMs - last > TAP_RESET_MS || tMs <= last)) taps = [];
    taps.push(tMs);
    if (taps.length > TAP_KEEP) taps = taps.slice(-TAP_KEEP);
    const est = estimateBpm(taps); // median IOI of ≥ 3 taps, folded into 60..180 (grid.ts)
    if (est == null) return;
    setBpm(est);
  }

  // ── the playhead, in HEARD time (D §1.3) ───────────────────────────────────────────────────────────────
  function playhead(): { bar: number; step: number; phase: number } {
    if (!segs.length) return { bar: 0, step: 0, phase: 0 };
    const lat = ctx.outputLatency || ctx.baseLatency || 0;
    const f = (ctx.currentTime - (Number.isFinite(lat) ? lat : 0)) * sr;
    if (!(f >= seatFrame)) return { bar: 0, step: 0, phase: 0 };
    const g = segs[segAt(f)].grid;
    const l = lineAtOrBefore(g, STEPS_PER_BAR, f);
    const next = lineFrame(g, l.bar, l.i + 1, STEPS_PER_BAR);
    const phase = next > l.frame ? Math.min(1, Math.max(0, (f - l.frame) / (next - l.frame))) : 0;
    return { bar: l.bar, step: l.i, phase };
  }

  const tk: Timekeeper = {
    grid(): FrameGrid {
      if (!segs.length) return { sr, barFrames: target, originFrame: 0 };
      return copy(segs[segAt(announcing ?? nowFrame())].grid);
    },
    bpm: () => gridBpm({ sr, barFrames: target, originFrame: 0 }),
    setBpm,
    tap,
    running: () => wanted.size > 0,
    want(part: Part, on: boolean): void {
      if (on) {
        if (wanted.has(part)) return;
        wanted.add(part);
        if (wanted.size === 1) { seat(); startClock(); }
        return;
      }
      if (!wanted.delete(part)) return;
      if (wanted.size === 0) stopClock();
    },
    nextLine(perBar: number, fromFrame?: number): Line {
      const n = Number.isFinite(perBar) && perBar >= 1 ? Math.round(perBar) : STEPS_PER_BAR;
      const nowF = nowFrame();
      const f = fromFrame != null && Number.isFinite(fromFrame) ? fromFrame : nowF + joinF;
      // Unseated: the lattice the next want would seat now (its origin is the first line ≥ now + 20 ms).
      if (!segs.length) return lineAtOrAfter({ sr, barFrames: target, originFrame: nowF + seatF }, n, f);
      return lineFrom(n, f);
    },
    onStep(fn: (b: Booking) => void): () => void {
      stepFns.add(fn);
      return () => { stepFns.delete(fn); };
    },
    onBar(fn: (bar: number, frame: number) => void): () => void {
      barFns.add(fn);
      return () => { barFns.delete(fn); };
    },
    playhead,
    stop(): void {
      wanted.clear();
      stopClock();
    },
  };
  return tk;
}

createTimekeeper satisfies CreateTimekeeper;
