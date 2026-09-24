// from signal-studio-v6lib/src/engine/lookahead.ts:1-206 (2a9e4a7) — VERBATIM (no line changed below this banner).
// The timekeeper (time.ts) books with createLookahead({min: 0.12}) and drives the same tick from createAudioHeartbeat
// (docs/signal-map/D-time-arp-chords.md §1.3). ENGINE_LOOK_MIN / ROW_LOOK_MIN are the Studio's own numbers, kept for the suite.
//
// [W66 · R1c] THE HORIZON — how far ahead of the audio clock a scheduler books, sized by the wake
// regime the page is actually living in.
//
// THE DEFECT THIS EXISTS FOR. Every scheduler here is written the right way round: a timer decides
// WHEN to book, and `ctx.currentTime` decides when things SOUND. That is only true while the timer
// keeps its word. Chrome throttles timers in a hidden tab to one wake per second, and a hidden,
// muted, idle tab to one wake per MINUTE — and the engine booked 100 ms ahead on a 25 ms timer.
// Measured off the recording itself, not off bookkeeping: 75 hits in 38 s in front, then 145 hits in
// 145 s hidden with EVERY interval at exactly 1000 ms — one hit per timer wake and the rest of the
// bar simply gone — and in the once-a-minute regime a 39-second hole. The capture was bit-honest
// throughout; it recorded the collapse faithfully, which is worse than a bug, because the artifact
// is a stuttering jam he cannot tell from something he played.
//
// So: the horizon is not a constant. It is
//
//     max( the foreground minimum , what being hidden costs , three times the worst wake seen )
//
// clamped to a ceiling. In front nothing changes — the engine still books 100 ms ahead, so a knob
// still takes effect within a tenth of a second, which is the whole reason the number was small.
// Hidden, the horizon opens to cover the wake budget, because nobody is turning a knob in a tab
// they cannot see, and a booking made early is not a booking made wrong: Web Audio renders it at the
// sample it was promised.
//
// THREE TIMES THE WORST WAKE, and not two: the horizon must survive one wake being LATE, not merely
// arriving. The worst gap decays back toward the live one, so a page that comes forward tightens up
// again within a couple of seconds instead of carrying the night's worst moment all day.
//
// PAIRED WITH A HEARTBEAT. `createAudioHeartbeat` below drives the same tick from the AUDIO clock,
// which no timer budget can reach — so in practice the observed gap stays small and the horizon
// never has to open far. The two are belt and braces on purpose: the heartbeat keeps the regime
// good, and the horizon keeps the audio continuous for whatever regime is left.

/** Foreground horizon for the engine clock — unchanged from the constant it replaces. */
export const ENGINE_LOOK_MIN = 0.1;
/** …and for the song row player, likewise unchanged. */
export const ROW_LOOK_MIN = 0.2;
/** Nothing books further ahead than this, whatever the wake regime looks like. */
export const LOOK_MAX = 90;

/** How long a page must be hidden before the throttled-timer allowance applies. */
const HIDDEN_SETTLE_SEC = 8;
/** What a hidden page's horizon opens to once it has settled — three wakes of the 1 Hz budget. */
const HIDDEN_BASE_SEC = 3;
/** …and before it settles: enough to cover the transition itself without over-booking. */
const HIDDEN_EARLY_SEC = 0.6;
/** The worst observed wake is multiplied by this. */
const GAP_FACTOR = 3;
/** …and decays toward the live gap at this rate per observation, so a bad minute does not persist. */
const GAP_DECAY = 0.96;

export interface Lookahead {
  /** Record that a scheduling tick is happening NOW (audio-clock seconds). */
  saw(nowSec: number): void;
  /**
   * [W66 · R1 REVIEW · RV9] THE DRIVER HAS JUST STARTED — forget everything before it.
   *
   * A transport that is not running is not a wake regime. `saw()` measures the distance between
   * consecutive ticks, and a clock that STOPS and later STARTS puts the whole silent interval into
   * that measurement: press stop, wait five seconds, press play, and the first tick reports a
   * five-second "wake" that the horizon then multiplies by three. Every start must therefore say so.
   */
  restart(): void;
  /** The horizon to book to, in seconds. */
  horizon(): number;
  /** For harnesses: the worst wake gap currently being carried. */
  worstGap(): number;
  dispose(): void;
}

export interface LookaheadOpts {
  /** Foreground horizon. */
  min: number;
  /** Ceiling. */
  max?: number;
  /** Injected for the node suite; defaults to `document.visibilityState`. */
  hidden?: () => boolean;
  /** Injected for the node suite; defaults to `performance.now()/1000`. */
  wallSec?: () => number;
}

export function createLookahead(opts: LookaheadOpts): Lookahead {
  const min = opts.min;
  const max = opts.max ?? LOOK_MAX;
  const hidden = opts.hidden ?? ((): boolean =>
    typeof document !== 'undefined' && document.visibilityState === 'hidden');
  const wall = opts.wallSec ?? ((): number =>
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000);

  let last: number | null = null;
  let gapMax = 0;
  let hiddenSince: number | null = hidden() ? wall() : null;
  let disposed = false;

  const onVis = (): void => {
    if (disposed) return;
    if (hidden()) { if (hiddenSince == null) hiddenSince = wall(); }
    else {
      hiddenSince = null;
      // Coming forward, the gap that is about to be measured is the whole time away; it is not a
      // wake regime, it is the return. Forget the clock so it is never counted as one.
      last = null;
      /* [W66 · R1 REVIEW · RV7] …AND FORGET THE GAPS, WHICH BELONG TO THE OTHER REGIME.
       *
       * `gapMax` only ever decays ON AN OBSERVATION, so the worst wake of the background stretch
       * came forward with the page and set the horizon for the first seconds in front. Measured
       * against the once-a-minute regime: parked at the 90 s ceiling, still 90 s on the FIRST
       * foreground wake, and 184 wakes — 4.6 s — before it was 0.1 s again. Every note inside that
       * window is already booked and a booked note cannot be unbooked, so the faceplate was deaf
       * for up to a minute and a half exactly when he came back to it, which is the one promise
       * this module makes at the top of the file. A gap measured while hidden describes the hidden
       * wake budget; in front there is no wake budget, and the very next observation would prove it
       * anyway. So the return starts the measurement over, and re-opens from the FIRST foreground
       * gap if the foreground ever gives it one. */
      gapMax = 0;
    }
  };
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', onVis);
  }

  const hiddenBase = (): number => {
    if (!hidden()) return 0;
    if (hiddenSince == null) hiddenSince = wall();
    return wall() - hiddenSince >= HIDDEN_SETTLE_SEC ? HIDDEN_BASE_SEC : HIDDEN_EARLY_SEC;
  };

  return {
    saw(nowSec) {
      if (!Number.isFinite(nowSec)) return;
      if (last != null) {
        const gap = Math.max(0, nowSec - last);
        gapMax = Math.max(gap, gapMax * GAP_DECAY);
      }
      last = nowSec;
    },
    restart() { last = null; gapMax = 0; },
    horizon() {
      const want = Math.max(min, hiddenBase(), gapMax * GAP_FACTOR);
      return Math.min(max, want);
    },
    worstGap: () => gapMax,
    dispose() {
      disposed = true;
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', onVis);
      }
    },
  };
}

// ── the heartbeat ────────────────────────────────────────────────────────────────────────────────

export interface Heartbeat { stop(): void; beats(): number }

/**
 * A pulse on the AUDIO clock, for schedulers that must not miss a wake.
 *
 * `setTimeout` is the thing being throttled, so the fix cannot be another `setTimeout`. This arms a
 * silent `ConstantSourceNode` for `intervalSec` and re-arms it from its own `ended` event: the stop
 * time is scheduled on `ctx.currentTime`, the rendering thread honours it exactly, and `ended` is a
 * media event rather than a timer, so no background wake budget applies to it. One node per pulse,
 * offset 0, through a muted gain — audibly and measurably nothing (the room's own analyser reads it
 * as zero, which is the law this whole app is built on).
 *
 * It is ADDITIVE to the existing timer, never a replacement: `tick()` is idempotent (it books
 * everything due before `now + horizon` and nothing twice), so two drivers calling it is two chances
 * to be on time rather than two schedules.
 */
export function createAudioHeartbeat(ctx: BaseAudioContext, cb: () => void, intervalSec = 0.25): Heartbeat {
  let stopped = false;
  let n = 0;
  let sink: GainNode | null = null;
  try {
    sink = ctx.createGain();
    sink.gain.value = 0;
    sink.connect(ctx.destination);
  } catch { sink = null; }

  const arm = (): void => {
    if (stopped) return;
    let src: ConstantSourceNode;
    try { src = ctx.createConstantSource(); } catch { return; }
    try {
      src.offset.value = 0;
      if (sink) src.connect(sink);
      src.onended = (): void => {
        try { src.disconnect(); } catch { /* */ }
        if (stopped) return;
        n++;
        try { cb(); } catch { /* a scheduler throwing must not stop the pulse */ }
        arm();
      };
      src.start();
      src.stop(ctx.currentTime + Math.max(0.02, intervalSec));
    } catch { /* an engine that refuses the node simply has no heartbeat */ }
  };
  arm();

  return {
    stop() {
      stopped = true;
      if (sink) { try { sink.disconnect(); } catch { /* */ } sink = null; }
    },
    beats: () => n,
  };
}
