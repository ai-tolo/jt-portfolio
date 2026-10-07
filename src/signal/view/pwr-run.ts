// SIGNAL · view/pwr-run.ts — THE RUN (2026-10-07). Jon: "a more tron like border trace effect that changes speed
// dynamically … accelerate decelerate, and vary as though it's like an aerial view of a vehicle ripping around a
// circuit"; then: keep the long streak and the smooth flow of the first (CSS) cut; then: "more tron and electronic …
// just make a cool gradient and have it animate in a satisfying way".
//
// The circuit is the switch housing's border: a rounded rect 4 px outside the well (svg.pwr-run, 104 × 52 at 1:1,
// printed by power.ts, pathLength 100). A small car sim drives it ONCE, at mount, into one long loop of ~20 s: it
// accelerates down the straights, brakes for each corner from far enough out to make it, carries a different speed
// through every corner on every lap, and each lap has a mood (a cruise, a push, a hot lap, an easy one); the throttle
// and the brake roll on and off, so the flow never jerks. The loop starts and ends on the line at the same speed and a whole
// number of laps apart, so it repeats seamlessly, and it is long enough that nobody hears the rhythm.
//
// The browser plays it (Web Animations on stroke-dashoffset, one animation per trail segment, all started together):
// no script runs per frame, nothing lays out, the repaint is the 104 × 52 svg. It plays only while the device shows
// (.inview), the switch is off (standby) and the tab is visible; reduced motion never builds it (power.css lights the
// circuit steady instead).
//
// The trail: one constant-width ribbon a third of a lap long (a light cycle's wall, not a flame), its colour running
// head → tail from white-hot cyan through electric blue and violet to magenta.

/** The circuit in svg px (= the path in power.ts: M52 2 H93 A9 … Z), clockwise from the top centre. */
const STRAIGHT_H = 82;            // the top and bottom straights (11 → 93)
const STRAIGHT_V = 30;            // the short sides (11 → 41)
const ARC = (Math.PI / 2) * 9;    // each corner: a quarter circle, r 9
const LAP = 2 * STRAIGHT_H + 2 * STRAIGHT_V + 4 * ARC;   // ≈ 280.5
const CORNERS: ReadonlyArray<[number, number]> = (() => {
  const out: Array<[number, number]> = [];
  let s = STRAIGHT_H / 2;
  for (const run of [STRAIGHT_V, STRAIGHT_H, STRAIGHT_V, STRAIGHT_H / 2]) {
    out.push([s, s + ARC]);
    s += ARC + run;
  }
  return out;
})();

/** The trail (Jon, after a tapered warm cut read as fire: "more tron and electronic … a cool gradient"): ONE ribbon of
 *  constant width, cut into SEGS equal dashes so its colour can run head → tail along the path: white-hot cyan, cyan,
 *  electric blue, indigo, violet, magenta, the last few fading out. [ink, opacity], head first. */
const STOPS: ReadonlyArray<readonly [number, number, number]> = [
  [232, 253, 255], [95, 240, 255], [58, 160, 255], [106, 92, 255], [177, 77, 255], [255, 79, 216],
];
export const SEGS = 12;
const LENGTH = 36;                // the ribbon, in path units (100 = a lap)
const mix = (t: number): string => {
  const x = t * (STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(x)), f = x - i;
  const c = STOPS[i].map((v, j) => Math.round(v + (STOPS[i + 1][j] - v) * f));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
export const TRAIL: ReadonlyArray<readonly [string, number]> = Array.from({ length: SEGS }, (_, k) => {
  const t = k / (SEGS - 1);
  return [mix(t), k < SEGS - 4 ? 1 : 1 - (k - (SEGS - 5)) / 5] as const;
});
const OVERLAP = 0.15;             // each dash runs this far into the one ahead (butt caps: no seam, no bead)

const U = 100 / LAP;              // px → path units
const V_LINE = 170;               // px/s: every loop crosses the line at this speed (the seam)
const STEP = 1 / 120;             // the sim's step (s)
const SAMPLE = 1 / 40;            // a keyframe every this many seconds (the browser interpolates between)
const rand = (a: number, b: number): number => a + Math.random() * (b - a);

type Mood = { top: number; accel: number; brake: number; corner: number[] };
/** A lap's character: mostly a quick lap, sometimes a hot one, now and then an easy one; every corner its own speed. */
const moodOf = (): Mood => {
  const r = Math.random();
  const p = r < 0.1 ? rand(0.62, 0.72) : r > 0.8 ? rand(1.1, 1.2) : rand(0.86, 1.02);   // easy · hot · cruise/push
  return {
    top: 320 * p,
    accel: 460 * p,
    brake: 720,
    corner: CORNERS.map(() => rand(100, 150) * Math.min(1.1, p + 0.1)),
  };
};

/** One loop: [time (s), head position (path units, cumulative)] pairs, from the line at V_LINE back to it at V_LINE. */
function drive(laps: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [[0, 0]];
  let s = 0, v = V_LINE, t = 0, lap = 0, nextSample = SAMPLE, a = 0;
  let mood = moodOf();
  while (lap < laps && t < 120) {                     // (a guard: a loop is ~20 s)
    let limit = mood.top;
    for (let i = 0; i < CORNERS.length; i++) {
      const [entry, exit] = CORNERS[i];
      const vc = mood.corner[i];
      if (s >= entry && s < exit) { limit = Math.min(limit, vc); continue; }
      const d = (entry - s + LAP) % LAP;
      limit = Math.min(limit, Math.sqrt(vc * vc + 2 * mood.brake * d));
    }
    if (lap === laps - 1) limit = Math.min(limit, Math.sqrt(V_LINE * V_LINE + 2 * mood.brake * (LAP - s)));   // home at V_LINE
    // the throttle and the brake roll on and off over ~110 ms (no jerks), so a corner's speed is met, never snapped to
    const want = v < limit ? Math.min(mood.accel, (limit - v) / STEP) : -Math.min(mood.brake * 1.1, (v - limit) / STEP);
    a += (want - a) * Math.min(1, STEP * 9);
    v = Math.max(0, v + a * STEP);
    if (v > limit && a >= 0) v = limit;
    s += v * STEP;
    t += STEP;
    if (s >= LAP) { s -= LAP; lap++; mood = moodOf(); }
    if (t >= nextSample && lap < laps) { pts.push([t, (lap * LAP + s) * U]); nextSample += SAMPLE; }
  }
  // the seam: end exactly on the line, a whole number of laps on
  const end = laps * 100;
  const [tl, pl] = pts[pts.length - 1];
  pts.push([tl + Math.max(0.004, (end - pl) / (V_LINE * U)), end]);
  return pts;
}

export function mountRun(sgm: HTMLElement, pwr: HTMLElement, reduce: MediaQueryList): () => void {
  const segs = Array.from(pwr.querySelectorAll<SVGPathElement>('.pwr-run-seg')).reverse();   // printed tail first
  if (segs.length !== SEGS || typeof segs[0]?.animate !== 'function') return () => {};

  let anims: Animation[] = [];
  const build = (): void => {
    const pts = drive(12);
    const dur = pts[pts.length - 1][0] * 1000;
    let back = 0;                                     // how far behind the head this dash's back end sits
    anims = segs.map((seg, k) => {
      const front = back - (k ? OVERLAP : 0);         // its front, nudged into the dash ahead
      back += LENGTH / SEGS;
      const dash = back - front;
      seg.style.strokeDasharray = `${dash.toFixed(2)} ${(100 - dash).toFixed(2)}`;
      const tail = back;
      const frames: Keyframe[] = pts.map(([t, p]) => ({ offset: (t * 1000) / dur, strokeDashoffset: (tail - p).toFixed(2) }));
      frames[0].offset = 0;
      frames[frames.length - 1].offset = 1;
      return seg.animate(frames, { duration: dur, iterations: Infinity, easing: 'linear' });
    });
    const at = Math.random() * dur;                   // each page load joins the loop somewhere new
    for (const an of anims) { an.pause(); an.currentTime = at; }
  };

  const running = (): boolean => sgm.classList.contains('inview') && sgm.dataset.state === 'standby'
    && document.visibilityState === 'visible' && !reduce.matches;
  const sync = (): void => {
    if (!running()) { for (const an of anims) an.pause(); return; }
    if (!anims.length) build();
    for (const an of anims) an.play();               // played together in one task: they share a start time
  };
  const mo = new MutationObserver(sync);
  mo.observe(sgm, { attributes: true, attributeFilter: ['class', 'data-state'] });
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener?.('change', sync);
  sync();

  return (): void => {
    mo.disconnect();
    document.removeEventListener('visibilitychange', sync);
    reduce.removeEventListener?.('change', sync);
    for (const an of anims) an.cancel();
    anims = [];
  };
}
