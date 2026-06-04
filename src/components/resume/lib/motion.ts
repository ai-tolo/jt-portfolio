// Shared motion helpers for the living résumé proofs.
//
// Two guarantees that matter here:
//  1. prefers-reduced-motion always jumps straight to the final state.
//  2. Headless/inactive tabs throttle rAF + IntersectionObserver (see the
//     astro-gotchas memory #6), so every animated value has a setTimeout
//     final-value backstop. The visual easing runs in real browsers; the
//     backstop makes the end state deterministic for tests and for users whose
//     tab was backgrounded mid-animation.

export const prefersReduced = (): boolean =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Run `cb` exactly once when `el` is meaningfully on screen, OR when a `play`
 * CustomEvent is dispatched on it (used when a collapsed proof panel opens).
 * Returns a manual trigger you can call yourself.
 */
export function onPlay(
  el: Element,
  cb: () => void,
  opts: { threshold?: number } = {}
): () => void {
  const { threshold = 0.25 } = opts;
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cb();
  };

  el.addEventListener("play", run as EventListener);

  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io?.disconnect();
            run();
          }
        }
      },
      { threshold }
    );
    io.observe(el);
  } else {
    run();
  }

  // Headless backstop: if IO never fired but the node is laid out + in view,
  // play anyway so deterministic tests (and backgrounded tabs) still resolve.
  window.setTimeout(() => {
    if (done) return;
    const r = (el as HTMLElement).getBoundingClientRect();
    if (r.height > 1 && r.top < window.innerHeight && r.bottom > 0) run();
  }, 1400);

  return run;
}

interface CountOpts {
  from?: number;
  dur?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** easing on normalized t∈[0,1]; default easeOutCubic */
  ease?: (t: number) => number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Count an element's text from `from` to `to` with a guaranteed final value. */
export function countUp(el: Element, to: number, opts: CountOpts = {}): void {
  const {
    from = 0,
    dur = 1100,
    decimals = 0,
    prefix = "",
    suffix = "",
    ease = easeOutCubic,
  } = opts;
  const fmt = (v: number) =>
    prefix +
    v.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) +
    suffix;

  if (prefersReduced()) {
    el.textContent = fmt(to);
    return;
  }

  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = fmt(from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // Final-value backstop (covers throttled rAF).
  window.setTimeout(() => {
    el.textContent = fmt(to);
  }, dur + 140);
}
