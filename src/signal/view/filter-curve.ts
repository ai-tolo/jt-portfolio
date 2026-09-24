// from signal-studio-v6lib/src/views/instrument/filter-curve.ts:1-117 (2a9e4a7) — VERBATIM (SIGNAL R1, lane V1). The one
// port: the two import specifiers name './eq-response.ts' (source lines 7 + 10 said './eq-response'). The dsp leaves
// (xToF, fToX, nodeQ, nodeDbFromQ + the cascade corners) arrive through eq-response.ts exactly as in the Studio, which
// re-exports them; they are copied there, where the Studio imported dsp.ts. Styled by src/styles/signal/material.css
// (.si-screen, .si-glass-tint, .si-afgrid, .si-affill, .si-afpath, .si-fnode, .si-fn-hp): no CSS lives here.
// [W21] The shared module EQ curve — an Ableton-EQ8-style TWO-NODE filter: a LOW-CUT (high-pass ①,
// left) + a resonant HIGH-CUT (low-pass ②, right). Both nodes drag in 2D (X = corner freq on the
// 20 Hz–20 kHz log axis, Y = resonance — up lifts a real peak at the corner). The curve is the actual
// computed frequency response (eq-response.ts) so it reads exactly like EQ8. Drums + bass use this;
// the keys glass (shape.ts) shares the same response law. Grammar: relative drag · SHIFT = ×0.1 fine
// (re-anchored on toggle) · double-tap a node = reset it to neutral. Dark-until-power via .si-fcurve CSS.
import { eqPath, dbToY, nodeQ, EQ_DB_TOP, EQ_DB_BOT, fToX, xToF, type EqParams } from './eq-response.ts';

export { fToX, xToF, nodeQ };
export { nodeDbFromQ } from './eq-response.ts';

export interface FilterCurve {
  el: HTMLElement;
  /** Repaint from engine state. hp/lp are 0..1 corner fractions; *Res 0..1; slope 0..1. */
  set(p: EqParams): void;
}

const GRID_HZ = [100, 1000, 10000];
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export function makeFilterCurve(opts: {
  accentVar?: string;
  onHp?: (x01: number, res01: number) => void; // node ① high-pass corner + resonance
  onLp?: (x01: number, res01: number) => void; // node ② low-pass cutoff + resonance
  onHpSlope?: (slope01: number) => void;        // ① low-cut slope (Shift-drag ①)
  onLpSlope?: (slope01: number) => void;        // ② low-pass slope (Shift-drag ②)
  resetHpX?: number;                            // neutral corner for ① (default 0 = open/20 Hz)
  resetLpX?: number;                            // neutral cutoff for ② (default 1 = open/20 kHz)
  resetLpSlope?: number;                        // neutral ② slope (default 0.5; drums passes its 0.33 cover)
} = {}): FilterCurve {
  const acc = opts.accentVar ?? 'var(--curve)';
  const wrap = document.createElement('div');
  wrap.className = 'si-screen si-glass-tint si-fcurve';
  wrap.style.setProperty('--fc', acc);
  const grid = GRID_HZ.map((hz) => `<line x1="${(fToX(hz) * 600).toFixed(0)}" y1="0" x2="${(fToX(hz) * 600).toFixed(0)}" y2="200" class="maj"></line>`).join('');
  const hpX0 = opts.resetHpX ?? 0, lpX0 = opts.resetLpX ?? 1;
  wrap.innerHTML =
    `<svg viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true">` +
      `<g class="si-afgrid">${grid}<line x1="0" y1="75" x2="600" y2="75" class="zero"></line></g>` + // W21: 0 dB = dbToY(0,200)=75
      `<path class="si-affill" d=""></path>` +
      `<path class="si-afpath" d=""></path>` +
    `</svg>` +
    `<span class="si-fnode si-fn-hp" aria-hidden="true"></span>` +
    `<span class="si-fnode si-fn-lp" aria-hidden="true"></span>`;
  const lineP = wrap.querySelector<SVGPathElement>('.si-afpath')!;
  const fillP = wrap.querySelector<SVGPathElement>('.si-affill')!;
  const hpEl = wrap.querySelector<HTMLElement>('.si-fn-hp')!;
  const lpEl = wrap.querySelector<HTMLElement>('.si-fn-lp')!;

  const HP_SLOPE0 = 1;                                  // W23: low-cut defaults to EQ8 "x4" (48 dB/oct)
  const LP_SLOPE0 = opts.resetLpSlope ?? 0.5;           // ② slope reset target (drums passes its 0.33 cover)
  const DB_SPAN = EQ_DB_TOP - EQ_DB_BOT, DB_MAX = 18, DB_MIN = -24; // node ±dB range (the vertical drag)
  const clampDb = (v: number): number => Math.max(DB_MIN, Math.min(DB_MAX, v));
  // [W26] p.hpRes/p.lpRes hold the NODE's dB (the height under the cursor); the drawn + engine Q = 2× that
  // — the resonant peak overshoots to twice the node (the EQ8-measured "margin"). See eq-response.ts.
  const p: EqParams = { hpX: hpX0, hpRes: 0, hpSlope: HP_SLOPE0, lpX: lpX0, lpRes: 0, slope: LP_SLOPE0 };
  const dbTop = (db: number): string => `${((dbToY(db, 200) / 200) * 100).toFixed(1)}%`;
  const draw = (): void => {
    const d = eqPath(600, 200, { ...p, hpRes: nodeQ(p.hpRes), lpRes: nodeQ(p.lpRes) }); // node dB → primary Q (flat at 0, margin above)
    lineP.setAttribute('d', d);
    fillP.setAttribute('d', d + ' L600 200 L0 200 Z');
    // node X clamped to [2.5,97.5]% (grabbable at the edge); node Y = its own dB (half the peak) — the cursor.
    hpEl.style.left = `${Math.max(2.5, p.hpX * 100).toFixed(1)}%`; hpEl.style.top = dbTop(p.hpRes);
    lpEl.style.left = `${Math.min(97.5, p.lpX * 100).toFixed(1)}%`; lpEl.style.top = dbTop(p.lpRes);
  };
  draw();

  // ── W22/W23 node grammar: plain drag = X (corner) / Y (resonance) · SHIFT-drag = the node's SLOPE
  // steepness · double-tap = reset. SHIFT direction follows the curve's SHAPE (W23, Jon): drag TOWARD the
  // passband = steeper, TOWARD the stopband = more gradual. So the ① low-cut (skirt to the left) steepens
  // dragging RIGHT (slopeDir +1); the ② low-pass (skirt to the right) steepens dragging LEFT (slopeDir −1).
  // Re-anchors on Shift toggle so it never jumps. ──
  interface SlopeCtl { get: () => number; set: (v: number) => void; }
  const bind = (el: HTMLElement, getX: () => number, getRes: () => number, apply: (x: number, res: number) => void, reset: () => void, slopeCtl?: SlopeCtl, slopeDir = 1): void => {
    el.classList.add('si-fn-live');
    let ax = 0, ay = 0, bx = 0, br = 0, bs = 0, shiftMode = false, lastTap = 0, downT = 0, moved = false;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (lastTap && e.timeStamp - lastTap < 320) { lastTap = 0; reset(); return; }
      try { el.setPointerCapture(e.pointerId); } catch { /* */ }
      ax = e.clientX; ay = e.clientY; bx = getX(); br = getRes(); bs = slopeCtl ? slopeCtl.get() : 0; shiftMode = e.shiftKey; downT = e.timeStamp; moved = false;
      const r = wrap.getBoundingClientRect();
      const applyMove = (ev: PointerEvent): void => {
        if (ev.shiftKey !== shiftMode) { shiftMode = ev.shiftKey; ax = ev.clientX; ay = ev.clientY; bx = getX(); br = getRes(); bs = slopeCtl ? slopeCtl.get() : 0; }
        if (Math.abs(ev.clientX - ax) > 2 || Math.abs(ev.clientY - ay) > 2) moved = true;
        if (shiftMode && slopeCtl) slopeCtl.set(clamp01(bs + slopeDir * (ev.clientX - ax) / r.width)); // SHIFT-drag = slope (dir per node)
        else apply(clamp01(bx + (ev.clientX - ax) / r.width), clampDb(br - (ev.clientY - ay) / r.height * DB_SPAN)); // up = peak, down = cut (node ±dB)
      };
      // W24 #1: coalesce pointermoves to one apply+draw per animation frame; flush the last move on release.
      let raf = 0, lastEv: PointerEvent | null = null;
      const runFrame = (): void => { raf = 0; const ev = lastEv; lastEv = null; if (ev) applyMove(ev); };
      const mv = (ev: PointerEvent): void => { lastEv = ev; if (!raf) raf = requestAnimationFrame(runFrame); };
      const up = (): void => { if (raf) { cancelAnimationFrame(raf); raf = 0; } if (lastEv) { applyMove(lastEv); lastEv = null; } lastTap = moved ? 0 : downT; el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  };
  if (opts.onHp) {
    wrap.classList.add('si-fcurve-live');
    bind(hpEl, () => p.hpX, () => p.hpRes,
      (x, res) => { p.hpX = x; p.hpRes = res; draw(); opts.onHp!(x, res); },
      () => { p.hpX = hpX0; p.hpRes = 0; p.hpSlope = HP_SLOPE0; draw(); opts.onHp!(hpX0, 0); opts.onHpSlope?.(HP_SLOPE0); },
      opts.onHpSlope ? { get: () => p.hpSlope, set: (v) => { p.hpSlope = v; draw(); opts.onHpSlope!(v); } } : undefined);
  }
  if (opts.onLp) {
    wrap.classList.add('si-fcurve-live');
    bind(lpEl, () => p.lpX, () => p.lpRes,
      (x, res) => { p.lpX = x; p.lpRes = res; draw(); opts.onLp!(x, res); },
      () => { p.lpX = lpX0; p.lpRes = 0; p.slope = LP_SLOPE0; draw(); opts.onLp!(lpX0, 0); opts.onLpSlope?.(LP_SLOPE0); },
      opts.onLpSlope ? { get: () => p.slope, set: (v) => { p.slope = v; draw(); opts.onLpSlope!(v); } } : undefined,
      -1); // ② low-pass: drag LEFT = steeper, RIGHT = more gradual (W23 shape-matched direction)
  }

  return {
    el: wrap,
    set(o) { p.hpX = clamp01(o.hpX); p.hpRes = clampDb(o.hpRes); p.hpSlope = clamp01(o.hpSlope); p.lpX = clamp01(o.lpX); p.lpRes = clampDb(o.lpRes); p.slope = clamp01(o.slope); draw(); }, // o.hpRes/o.lpRes = node ±dB
  };
}
