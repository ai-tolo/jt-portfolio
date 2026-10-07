// THE LIGHTS (Jon, 2026-10-07): when a hand changes the room's light (the
// instrument's power switch, the night toggle, Esc), the switch is the
// light's source: lights OFF, the light pulls back into the switch and the
// dark is what's left; lights ON, the light pours out of it again. A circle
// on where the hand was, ~half a second, then it's done.
// Snappy first: any change no hand made in the last moment (powering off by
// scrolling away, the page's first paint) stays instant, as do reduced
// motion, a hidden tab, a browser without view transitions, and a change
// that lands while another reveal is still running. The page's own state
// flips at once either way; only the picture of it is animated.

const WINDOW_MS = 900; // a change this soon after a press counts as the press's

let hand = { t: -Infinity, x: NaN, y: NaN };
addEventListener("pointerdown", (e) => { hand = { t: performance.now(), x: e.clientX, y: e.clientY }; }, { capture: true, passive: true });
addEventListener("keydown", () => { hand = { t: performance.now(), x: NaN, y: NaN }; }, { capture: true, passive: true });

let running = false;
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Set the room's night to `on`: `apply` writes the state; `from` is where a
 *  key press spreads from (the switch it acted on) when no pointer did. */
export function setNight(on: boolean, apply: () => void, from?: Element | null) {
  const changes = document.documentElement.hasAttribute("data-night") !== on;
  const fresh = performance.now() - hand.t < WINDOW_MS;
  const vt = (document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } }).startViewTransition;
  if (!changes || !fresh || running || !vt || still() || document.visibilityState !== "visible") {
    apply();
    return;
  }
  // the origin: the pointer that pressed, else the switch's centre, else the screen's
  let { x, y } = hand;
  if (Number.isNaN(x)) {
    const r = from?.getBoundingClientRect();
    x = r && r.width ? r.left + r.width / 2 : innerWidth / 2;
    y = r && r.height ? r.top + r.height / 2 : innerHeight / 2;
  }
  hand = { t: -Infinity, x: NaN, y: NaN }; // one press, one reveal
  running = true;
  // the whole motion is the stylesheet's (tokens.css, keyed on html[data-lights]):
  // it exists the moment the transition's layers do, so no frame ever shows the
  // wrong one. Here only the circle's centre and full radius are handed over.
  const root = document.documentElement;
  root.style.setProperty("--lights-x", `${x}px`);
  root.style.setProperty("--lights-y", `${y}px`);
  root.style.setProperty("--lights-max", `${Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)))}px`);
  root.dataset.lights = on ? "off" : "on";
  const t = vt.call(document, apply);
  t.finished.catch(() => {}).finally(() => {
    running = false;
    delete root.dataset.lights;
    for (const p of ["--lights-x", "--lights-y", "--lights-max"]) root.style.removeProperty(p);
  });
}
