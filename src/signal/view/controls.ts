// from signal-studio-v6lib/src/views/instrument/controls.ts:1-324 (2a9e4a7) — VERBATIM (SIGNAL R1, lane V0), with ONE
// port: makeSeg (source lines 306-324) reads `button[data-v]` caps instead of `b[data-v]` (a <b> takes no focus and no
// keyboard press), and its light() mirrors `.on` into aria-pressed. Zero imports; class names unchanged (si-*): the
// material (src/styles/signal/material.css) styles this DOM directly. Everything else is the Studio's text, byte for byte.
// [Stream E] Reusable instrument controls — the tactile primitives the faceplate is
// built from, faithful to SignalMachine.astro's interaction model:
//   • knob   — vertical pointer drag (160px = full 0..1 swing), conic-gradient arc fill
//   • fader   — vertical LCD meter tower (drag = value, high at top)
//   • hslider — horizontal track (cutoff / sidechain) with a formatted readout
//   • seg     — segmented one-of-N selector (pattern / scale / drive-type / …)
//
// Every control exposes `set(v)` that updates the VISUAL only (no onChange) so the
// orchestrator can reflect engine snapshots (dice / applySnapshot) back onto the UI
// without re-driving the engine. Pointer gating (dark-until-power) is handled in CSS via
// `#signal-instrument:not([data-live="1"])`, so handlers stay simple.

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** Tiny DOM helper. */
export function el(tag: string, cls?: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

export interface Knob {
  set(v: number): void;
  get(): number;
  /**
   * AES-R3 (additive, optional): swap the step quantization at RUNTIME — pass N>1 for a stepped
   * body, 0/undefined for continuous. Needed by the RATE sync⇄Hz mode toggle (shape.ts), where
   * ONE knob is a 5-step switch in sync mode and a continuous log dial in Hz mode. Purely the
   * quantize law — the visual re-clothe (.si-stepped class, tick ring) stays with the region.
   * Existing callers never call this; omitting it keeps the classic fixed-steps behavior.
   */
  setSteps?(n?: number): void;
}

/** A transient value chip (`.si-ghost`) — the shared readout that surfaces only under the hand. */
export interface Ghost {
  /** show + set the text (gesture start). */
  show(txt: string): void;
  /** update text without re-triggering the fade timer (mid-gesture). */
  move(txt: string): void;
  /** begin the ~600ms fade-out (gesture end). */
  hide(): void;
}

/**
 * Mount a value-ghost chip inside `host` (any positioned control container, e.g. a `.si-knob`).
 * Returns a {show, move, hide} hook. The chip is `.si-ghost` (styled in chrome.ts): absolute,
 * tabular-nums, radial glass; opacity 0→1 on show, fades .6s after hide. AES-FOUNDATION §2 idea 3
 * (the value ghost) — one transient readout per control, no standing numerics.
 */
export function makeGhost(host: HTMLElement): Ghost {
  const g = el('div', 'si-ghost');
  host.appendChild(g);
  let t: ReturnType<typeof setTimeout> | null = null;
  return {
    show(txt) { g.textContent = txt; g.classList.remove('fade'); g.classList.add('on'); if (t) { clearTimeout(t); t = null; } },
    move(txt) { g.textContent = txt; },
    hide() { g.classList.remove('on'); g.classList.add('fade'); if (t) clearTimeout(t); t = setTimeout(() => g.classList.remove('fade'), 650); },
  };
}

/**
 * Options for {@link makeKnob} — the AES-FOUNDATION "one drag law" surface (§2 idea 6 · knob-lab).
 * All optional; omitting them yields the classic knob (160px swing, no detents, no reset, no ghost).
 */
export interface KnobOpts {
  /** double-click resets to this value (semantic default). Omit to disable reset (e.g. TEMPO — BPM-king). */
  dflt?: number;
  /** escapable ±6px musical anchors (0..1): drag snaps within the window, passes through beyond it. */
  detents?: number[];
  /** stepped/quantized control: drag snaps to N discrete steps with a mechanical settle. */
  steps?: number;
  /** ghost readout hook: makeKnob shows `label(v)` on drag/wheel/dblclick and hides on release. */
  ghost?: Ghost;
  /** formats the ghost text (NAME + value). Required for the ghost to show anything meaningful. */
  label?: (v: number) => string;
  /** called after value CHANGES on a re-render (e.g. to write .anch --a0/--a1 or toggle a hot tick). */
  onRender?: (v: number) => void;
}

/** ±6px escapable detent window, in the 160px swing's value units (matches knob-lab DET_W). */
const DET_W = 6 / 160;
/** wheel step: one notch = 2px of swing; below this we ignore the tiny inertial-scroll residue. */
const WHEEL_STEP = 2 / 160;
/** min ms between wheel steps — throttles trackpad inertial momentum so it can't creep the value. */
const WHEEL_GAP = 55;

/**
 * A rotary knob. `host` must contain `.si-dial`. Vertical drag up = increase.
 *
 * `paint(v)` (optional, 4th arg — UNCHANGED signature) renders any value readout text; called on
 * every visual update. `opts` (optional, 5th arg) adds the AES-FOUNDATION one drag law:
 *   • 160px full swing (SACRED) + per-element pointer capture; Shift (re-read each move) = ×8 fine.
 *   • double-click = reset to opts.dflt (omit for TEMPO-style controls that must not reset).
 *   • escapable ±6px detents at opts.detents (snap inside the window, pass through outside).
 *   • opts.steps = quantize to N steps (stepped-switch body) with the CSS 90ms settle.
 *   • wheel support with an inertial-scroll guard (tiny deltas below one notch are dropped).
 *   • opts.ghost/label = the transient value chip shows on gesture, hides on release.
 * NO getBoundingClientRect — the drag stays rect-free (SACRED; the deferred zero-hitch refactor
 * explicitly must not touch this). set()/get()/onChange contract unchanged.
 */
export function makeKnob(
  host: HTMLElement,
  init: number,
  onChange: (v: number) => void,
  paint?: (v: number) => void,
  opts: KnobOpts = {},
): Knob {
  let v = clamp(init, 0, 1);
  const dial = host.querySelector<HTMLElement>('.si-dial')!;
  // AES-R3: `let` (was const) — setSteps() swaps the quantize law at runtime (RATE sync⇄Hz).
  let steps = opts.steps && opts.steps > 1 ? opts.steps : 0;
  const quant = (x: number): number => steps ? Math.round(x * (steps - 1)) / (steps - 1) : x;
  const snap = (x: number): number => {
    if (!opts.detents) return x;
    for (const d of opts.detents) if (Math.abs(x - d) < DET_W) return d;
    return x;
  };
  const render = (): void => {
    dial.style.setProperty('--v', v.toFixed(3));
    if (paint) paint(v);
    if (opts.onRender) opts.onRender(v);
  };
  render();

  // `raw` tracks the unquantized drag position for stepped knobs so the hand can cross a step
  // boundary smoothly; `v` is the committed (quantized/snapped) value the engine + arc see.
  let sy = 0;
  let sv = 0;
  let raw = v;
  const commit = (nv: number, viaGhost = true): void => {
    v = quant(snap(clamp(nv, 0, 1)));
    render();
    onChange(v);
    if (viaGhost && opts.ghost && opts.label) opts.ghost.move(opts.label(v));
  };
  host.addEventListener('pointerdown', (e) => {
    host.dataset.drag = '1';
    host.classList.add('grip');
    sy = e.clientY;
    sv = v;
    raw = v;
    if (opts.ghost && opts.label) opts.ghost.show(opts.label(v));
    try { host.setPointerCapture(e.pointerId); } catch { /* */ }
  });
  host.addEventListener('pointermove', (e) => {
    if (!host.dataset.drag) return;
    const div = e.shiftKey ? 1280 : 160; // Shift re-read every move = ×8 fine
    raw = clamp(sv + (sy - e.clientY) / div, 0, 1);
    commit(raw);
  });
  const end = (): void => {
    if (!host.dataset.drag) return;
    host.dataset.drag = '';
    host.classList.remove('grip');
    if (opts.ghost) opts.ghost.hide();
  };
  host.addEventListener('pointerup', end);
  host.addEventListener('pointercancel', end);

  if (opts.dflt != null) {
    host.addEventListener('dblclick', () => {
      sv = opts.dflt!;
      raw = opts.dflt!;
      if (opts.ghost && opts.label) opts.ghost.show(opts.label(opts.dflt!));
      commit(opts.dflt!);
      if (opts.ghost) opts.ghost.hide();
    });
  }

  // wheel: one notch per WHEEL_STEP. Inertial-scroll GUARD (reviewer catch): trackpads keep emitting
  // decaying wheel events after the finger lifts, which would creep the value on its own. We throttle
  // to one step per WHEEL_GAP and drop sub-pixel residue — momentum can't run the knob away.
  let lastWheel = 0;
  host.addEventListener('wheel', (e) => {
    // [W66 · R4a · REVIEW] THE RESIDUE IS DROPPED, NOT PASSED ON. This early return used to fall
    // on the floor, because the tower body was `overflow: hidden` and nothing downstream could act
    // on a wheel event. R4a made that body scroll, and the floor became a scroller: MEASURED at a
    // 743px viewport (his full-screen window with a bookmarks bar, where the drums tower is 84px
    // over), a single trackpad flick over a knob ends with nine sub-pixel momentum events and the
    // tower has moved 6px — the knob drifting out from under the finger that just turned it. The
    // knob owns the wheel over its own face at every delta; dropping the residue is what "momentum
    // can't run the knob away" was always supposed to mean.
    //
    // A HORIZONTAL SWIPE IS STILL SOMEBODY ELSE'S. `#instr-host` pans sideways below ~1150px
    // (shell/index.ts) and that is the width axis's own answer, so a gesture that is really
    // horizontal is passed through even over a knob — only a wheel that is sub-pixel on BOTH axes
    // is the decaying tail this guard exists for.
    if (Math.abs(e.deltaY) < 1) { if (Math.abs(e.deltaX) < 1) e.preventDefault(); return; } // sub-pixel residue
    e.preventDefault();
    const now = e.timeStamp;
    if (now - lastWheel < WHEEL_GAP) return; // throttle: caps inertial creep to a controlled cadence
    lastWheel = now;
    const step = e.shiftKey ? WHEEL_STEP / 8 : WHEEL_STEP;
    sv = v;
    raw = clamp(v - Math.sign(e.deltaY) * step, 0, 1);
    if (opts.ghost && opts.label) opts.ghost.show(opts.label(v));
    commit(raw);
    if (opts.ghost) opts.ghost.hide();
  }, { passive: false });

  return {
    set: (nv) => { v = quant(clamp(nv, 0, 1)); render(); },
    get: () => v,
    // runtime quantize swap (AES-R3, see Knob interface) — visual-only concern; never fires onChange.
    setSteps: (n) => { steps = n && n > 1 ? n : 0; },
  };
}

export interface Fader {
  set(v: number): void;
  get(): number;
}

/**
 * A vertical LCD meter fader. `host` must contain `.si-fill` and `.si-pc`. Value is high
 * at the top of the track (a normal fader). Drag anywhere on the tower to set.
 */
export function makeFader(host: HTMLElement, init: number, onChange: (v: number) => void): Fader {
  let v = clamp(init, 0, 1);
  const fill = host.querySelector<HTMLElement>('.si-fill')!;
  const pc = host.querySelector<HTMLElement>('.si-pc')!;
  const render = (): void => {
    fill.style.height = (v * 100).toFixed(1) + '%';
    fill.classList.toggle('mt', v <= 0.004);
    pc.textContent = String(Math.round(v * 100));
  };
  render();

  const at = (e: PointerEvent): void => {
    const r = host.getBoundingClientRect();
    v = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
    render();
    onChange(v);
  };
  host.addEventListener('pointerdown', (e) => {
    host.dataset.drag = '1';
    at(e);
    try { host.setPointerCapture(e.pointerId); } catch { /* */ }
  });
  host.addEventListener('pointermove', (e) => { if (host.dataset.drag) at(e); });
  const end = (): void => { host.dataset.drag = ''; };
  host.addEventListener('pointerup', end);
  host.addEventListener('pointercancel', end);

  return {
    set: (nv) => { v = clamp(nv, 0, 1); render(); },
    get: () => v,
  };
}

export interface HSlider {
  set(v: number): void;
  get(): number;
}

/**
 * A horizontal slider. `host` must contain `.si-sfill` and `.si-shandle`; an optional
 * `.si-sval` shows formatted text via `fmt`. Drag along the track to set 0..1.
 */
export function makeHSlider(
  host: HTMLElement,
  init: number,
  onChange: (v: number) => void,
  fmt?: (v: number) => string,
): HSlider {
  let v = clamp(init, 0, 1);
  const fill = host.querySelector<HTMLElement>('.si-sfill')!;
  const handle = host.querySelector<HTMLElement>('.si-shandle')!;
  const val = host.querySelector<HTMLElement>('.si-sval');
  const render = (): void => {
    fill.style.width = (v * 100).toFixed(1) + '%';
    handle.style.left = (v * 100).toFixed(1) + '%';
    if (val && fmt) val.textContent = fmt(v);
  };
  render();

  const at = (e: PointerEvent): void => {
    const r = host.getBoundingClientRect();
    v = clamp((e.clientX - r.left) / r.width, 0, 1);
    render();
    onChange(v);
  };
  host.addEventListener('pointerdown', (e) => {
    host.dataset.drag = '1';
    at(e);
    try { host.setPointerCapture(e.pointerId); } catch { /* */ }
  });
  host.addEventListener('pointermove', (e) => { if (host.dataset.drag) at(e); });
  const end = (): void => { host.dataset.drag = ''; };
  host.addEventListener('pointerup', end);
  host.addEventListener('pointercancel', end);

  return {
    set: (nv) => { v = clamp(nv, 0, 1); render(); },
    get: () => v,
  };
}

export interface Seg {
  set(value: string): void;
  get(): string;
}

/** A segmented one-of-N selector. `host` contains `button[data-v]` children (PORT: was `b[data-v]`). */
export function makeSeg(host: HTMLElement, onPick: (value: string) => void): Seg {
  const opts = Array.from(host.querySelectorAll<HTMLElement>('button[data-v]'));
  let cur = opts.find((b) => b.classList.contains('on'))?.dataset.v ?? opts[0]?.dataset.v ?? '';
  const light = (value: string): void => {
    opts.forEach((b) => { b.classList.toggle('on', b.dataset.v === value); b.setAttribute('aria-pressed', String(b.dataset.v === value)); }); // PORT: + aria-pressed
  };
  opts.forEach((b) => {
    b.addEventListener('click', () => {
      cur = b.dataset.v!;
      light(cur);
      onPick(cur);
    });
  });
  return {
    set: (value) => { cur = value; light(value); },
    get: () => cur,
  };
}
