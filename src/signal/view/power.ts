// SIGNAL R2 · lane B · view/power.ts — THE POWER. New code (the portfolio's): the old homepage machine's ceremony,
// rebuilt on the new device. The reference for every law below is junkyard/SignalMachine.astro (the instrument this one
// replaced, 2026-09-23); each block names its lines there.
//   the DISC   button.pwr#pwr in the top strip's middle (hands-view.ts's .sgh-power slot): a red ember at rest that
//              breathes while the device shows (.inview), green while it boots and plays. The host's .pwr overrides
//              (StudioOne: scale, the brighter ember) land on it unchanged.
//   the STATE  #sgm[data-state] standby → boot → live → powerdown → standby. The host WATCHES it (boot/live = the site
//              goes night) and clicks #pwr when the room scrolls away; nothing else talks to it. data-live="1" and
//              .device.live exist only while live. The look of each state is power.css's (the dark is lighting only).
//   the TRACE  the device's OUTER edge drawn from the top centre down both sides over 1380 ms, then a 1 px faint outline
//              while live, run back on power-off.
//   the SOUND  Jon's boot sound (public/s/59e8a3b3/boot.m4a: the old machine's inline AAC, byte for byte) AT THE PRESS,
//              gain .675 straight to the destination, never through the instrument's master; ?mute=1 → a 0-gain.
//   the DOOR   in standby the device answers nothing but the disc: its keys are the page's (guardKeys, installed before
//              the keymap), its controls take no pointer (power.css) and leave the tab order (inert, here).
import type { SignalInstrument } from '../types.ts';
import { KEYMAP } from '../types.ts';

export type PowerState = 'standby' | 'boot' | 'live' | 'powerdown';

/** SignalMachine.astro:2658 TRACEMS: the press → live (and the power-off press → standby). */
export const TRACE_MS = 1380;
/** The bulb-up: power.css fades the lit skin in over ≈ 500 ms with a stagger down the strata; this is how long its
 *  transitions own the device before the recipes' own (snappier) ones come back. */
export const BULB_MS = 950;
/** The old machine's boot sound, extracted (never re-encoded; the folder ships immutable). */
export const BOOT_URL = '/s/59e8a3b3/boot.m4a';
/** SignalMachine.astro:2633 bootPluck: −6.5 dBFS, 25 % under the 0.9 ship gain (Jon, 2026-06-15); ≤ 1, no limiter. */
export const BOOT_GAIN = 0.675;
/** SignalMachine.astro:2750: the ember breathes only while this much of the device shows. */
const INVIEW_RATIO = 0.25;
/** SignalMachine.astro:19 — the disc's glyph, verbatim. */
const GLYPH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 V11"/><path d="M6.6 6.8 a7.5 7.5 0 1 0 10.8 0"/></svg>';

const num = (v: number): string => String(Math.round(v * 100) / 100);

/** The outer edge as two open paths from the top centre, one down each side, meeting at the bottom centre
 *  (SignalMachine.astro:2598-2605, buildTrace): the stroke's centre `inset` inside the box, the corners concentric with
 *  the casing's radius. */
export function perimeter(w: number, h: number, radius: number, inset = 1): { l: string; r: string } {
  const x0 = inset, x1 = w - inset, y0 = inset, y1 = h - inset, cx = w / 2;
  const rr = Math.max(0, Math.min(radius - inset, (x1 - x0) / 2, (y1 - y0) / 2));
  const a = `A${num(rr)} ${num(rr)} 0 0`;
  return {
    r: `M${num(cx)} ${num(y0)} H${num(x1 - rr)} ${a} 1 ${num(x1)} ${num(y0 + rr)} V${num(y1 - rr)} ${a} 1 ${num(x1 - rr)} ${num(y1)} H${num(cx)}`,
    l: `M${num(cx)} ${num(y0)} H${num(x0 + rr)} ${a} 0 ${num(x0)} ${num(y0 + rr)} V${num(y1 - rr)} ${a} 0 ${num(x0 + rr)} ${num(y1)} H${num(cx)}`,
  };
}

/** THE DOOR, for the keyboard. Until the device is live its keys are the PAGE's: Space and the arrows scroll, the
 *  page's own listeners (they read `key`) get every key, and the instrument hears nothing. The keymap (main.ts, after
 *  the views) and the hands' reflection read `code` in a CAPTURE listener on the window, so this one must be added
 *  FIRST (call it before boot()): a mapped keydown has its `code` shadowed to '' on the event object itself, which
 *  those listeners take for an unmapped key and leave alone. Escape passes (the master stop works from anywhere, and
 *  sweeping a silent device costs nothing); a keyup always passes (the keymap releases only the codes it pressed).
 *  Returns its own removal. */
export function guardKeys(sgm: HTMLElement, target: Window = window): () => void {
  const onKey = (e: KeyboardEvent): void => {
    if (sgm.dataset.state === 'live') return;
    const code = e.code;
    if (!code || code === 'Escape' || !Object.prototype.hasOwnProperty.call(KEYMAP, code)) return;
    try { Object.defineProperty(e, 'code', { value: '', configurable: true }); } catch { /* a sealed event: let it be */ }
  };
  target.addEventListener('keydown', onKey, true);
  return (): void => target.removeEventListener('keydown', onKey, true);
}

export interface PowerHandle {
  state(): PowerState;
  /** The disc's own press (what a click does): standby → on; live or booting → off; a power-down finishes first. */
  press(): void;
  dispose(): void;
}

/** Mount the power on the booted instrument: the disc into the top strip's .sgh-power slot, the states on `sgm`. */
export function mountPower(sgm: HTMLElement, inst: SignalInstrument): PowerHandle {
  const device = sgm.querySelector<HTMLElement>('.device') ?? sgm;
  const svg = sgm.querySelector<SVGSVGElement>('.sgm-trace');
  const paths = svg ? Array.from(svg.querySelectorAll<SVGPathElement>('path')) : [];
  const trL = svg?.querySelector<SVGPathElement>('.tr-l') ?? null;
  const trR = svg?.querySelector<SVGPathElement>('.tr-r') ?? null;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ctx = inst.ctx;

  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t;
  };
  const drop = (t: ReturnType<typeof setTimeout> | null): null => { if (t) { clearTimeout(t); timers.delete(t); } return null; };

  // ── the disc ─────────────────────────────────────────────────────────────────────────────────────────────────
  const pwr = document.createElement('button');
  pwr.type = 'button';
  pwr.className = 'pwr';
  pwr.id = 'pwr';
  pwr.setAttribute('aria-label', 'Power');
  pwr.setAttribute('aria-pressed', 'false');
  pwr.innerHTML = GLYPH;
  const slot = sgm.querySelector<HTMLElement>('.sgh-power');
  if (!slot) console.warn('[signal/power] no .sgh-power slot: the disc sits on the device');
  (slot ?? device).appendChild(pwr);

  // ── the state ────────────────────────────────────────────────────────────────────────────────────────────────
  let st: PowerState = 'standby';
  let step: ReturnType<typeof setTimeout> | null = null;     // boot → live, powerdown → standby
  let bulbT: ReturnType<typeof setTimeout> | null = null;
  const setState = (s: PowerState): void => { st = s; sgm.dataset.state = s; };
  const setLive = (on: boolean): void => {
    device.classList.toggle('live', on);
    for (const e of [sgm, device]) { if (on) e.dataset.live = '1'; else delete e.dataset.live; }
  };
  // the rest of the device leaves the tab order and the accessibility tree until it is live: every sibling of every
  // box between the disc and the device (the top strip's wordmark, tempo and STOP; the towers; the hands) goes inert
  const seal = (dark: boolean): void => {
    for (let n: HTMLElement | null = pwr; n && n !== device; n = n.parentElement) {
      const p: HTMLElement | null = n.parentElement;
      if (!p) break;
      for (const s of Array.from(p.children)) if (s !== n && s instanceof HTMLElement) s.inert = dark;
    }
  };

  // ── the boot sound: fetched + decoded now (decodeAudioData works on the suspended context), played at the press ──
  let bootBuf: AudioBuffer | null = null;
  let bootWanted = false;
  let alive = true;
  const muted = (): boolean => { try { return inst.out.muted(); } catch { return false; } };
  const playBoot = (): void => {
    if (!bootBuf) { bootWanted = true; return; }                 // a press before the decode: it plays on landing
    bootWanted = false;
    try {
      const src = ctx.createBufferSource();
      src.buffer = bootBuf;
      const g = ctx.createGain();
      g.gain.value = muted() ? 0 : BOOT_GAIN;
      src.connect(g);
      g.connect(ctx.destination);                                 // straight out: the master never sees it
      src.onended = (): void => { try { src.disconnect(); g.disconnect(); } catch { /* */ } };
      src.start();                                                // the context resumes in this same gesture
    } catch (e) { console.warn('[signal/power] the boot sound could not play', e); }
  };
  void fetch(BOOT_URL)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((b) => ctx.decodeAudioData(b))
    .then((buf) => {
      if (!alive) return;
      bootBuf = buf;
      if (bootWanted && st === 'boot') playBoot();                // late, but still booting: the sound still belongs
      bootWanted = false;
    })
    .catch((e) => console.warn('[signal/power] the boot sound could not load', e));

  // ── the trace (SignalMachine.astro:2598-2621, 2678-2694) ─────────────────────────────────────────────────────
  // The svg covers the device's grid cell (power.css), so a viewBox in the device's OWN pixels (offset size, computed
  // radius: both unzoomed) lands on its edge at any host zoom.
  let lens: number[] = [];
  const geometry = (): boolean => {
    if (!svg || !trL || !trR) return false;
    const w = device.offsetWidth, h = device.offsetHeight;
    if (!(w > 0 && h > 0)) return false;
    const g = perimeter(w, h, parseFloat(getComputedStyle(device).borderTopLeftRadius) || 0);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    trL.setAttribute('d', g.l);
    trR.setAttribute('d', g.r);
    lens = paths.map((p) => p.getTotalLength());
    return true;
  };
  const place = (drawn: boolean, animate: boolean): void => {
    paths.forEach((p, i) => {
      p.style.transition = animate ? '' : 'none';
      p.style.strokeDasharray = String(lens[i]);
      p.style.strokeDashoffset = drawn ? '0' : String(lens[i]);
    });
  };
  const traceDraw = (): void => {
    if (!svg || !geometry()) return;
    svg.classList.remove('settled');
    svg.classList.add('drawing');                                 // full brightness while it draws
    place(false, false);
    void svg.getBoundingClientRect();                             // commit the undrawn start
    place(true, !reduce.matches);
  };
  const traceSettle = (): void => {
    if (!svg) return;
    svg.classList.remove('drawing');
    svg.classList.add('settled');                                 // the faint 1 px outline that stays while live
    if (geometry()) place(true, false);                           // re-fit to the device's final box
  };
  // run back from wherever the line is (settled, or still drawing when the press came during the boot): the dash
  // transitions from its current offset, so the line withdraws the way it came, at the look it has
  const traceRetract = (): void => {
    if (!svg || !lens.length) return;
    paths.forEach((p, i) => { p.style.transition = reduce.matches ? 'none' : ''; p.style.strokeDashoffset = String(lens[i]); });
  };
  const traceClear = (): void => { svg?.classList.remove('drawing', 'settled'); };
  let fitT: ReturnType<typeof setTimeout> | null = null;
  const refit = (): void => { fitT = null; if (svg?.classList.contains('settled') && geometry()) place(true, false); };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { fitT = drop(fitT); fitT = later(refit, 100); }) : null;
  ro?.observe(device);

  // ── the sequences (SignalMachine.astro:2714-2734) ────────────────────────────────────────────────────────────
  const powerOn = (): void => {
    step = drop(step);
    setState('boot');
    pwr.classList.add('lit');
    pwr.setAttribute('aria-pressed', 'true');
    try { void inst.wake().catch(() => { /* not an activation: the next press asks again */ }); } catch { /* */ }
    playBoot();                                                   // AT THE PRESS (Jon's law), never after the trace
    traceDraw();
    step = later(goLive, TRACE_MS);
  };
  const goLive = (): void => {
    step = null;
    bulbT = drop(bulbT);
    sgm.classList.add('bulb');                                    // with the state, in one style change: the fade-in
    setLive(true);
    seal(false);
    setState('live');
    traceSettle();
    bulbT = later(() => { bulbT = null; sgm.classList.remove('bulb'); }, BULB_MS);
  };
  const powerOff = (): void => {
    step = drop(step);
    bulbT = drop(bulbT);
    sgm.classList.remove('bulb');
    setState('powerdown');                                        // the site's light returns at the press (the host)
    pwr.classList.remove('lit');
    pwr.setAttribute('aria-pressed', 'false');
    seal(true);
    try { inst.stop(); } catch (e) { console.warn('[signal/power] the stop threw', e); }
    traceRetract();
    step = later(goStandby, TRACE_MS);
  };
  const goStandby = (): void => {
    step = null;
    setLive(false);
    setState('standby');
    traceClear();
  };
  /** At once, no ceremony: a page leaving (or coming back from the back-forward cache) never keeps a lit device. */
  const snapStandby = (): void => {
    if (st === 'standby') return;
    step = drop(step);
    bulbT = drop(bulbT);
    sgm.classList.remove('bulb');
    try { inst.stop(); } catch { /* */ }
    pwr.classList.remove('lit');
    pwr.setAttribute('aria-pressed', 'false');
    seal(true);
    setLive(false);
    setState('standby');
    paths.forEach((p, i) => { p.style.transition = 'none'; if (lens[i]) p.style.strokeDashoffset = String(lens[i]); });
    traceClear();
  };

  const press = (): void => {
    if (st === 'standby') powerOn();
    else if (st === 'live' || st === 'boot') powerOff();          // booting: the host's scroll-away turns it back
    // powerdown: the line is running back; the disc answers again at standby
  };
  pwr.addEventListener('click', press);

  // ── the ember breathes only while the device shows; the first sight flares it once (SignalMachine.astro:2748-2753) ──
  let flared = false;
  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        const seen = e.isIntersecting && e.intersectionRatio >= INVIEW_RATIO;
        sgm.classList.toggle('inview', seen);
        if (seen && !flared) {
          flared = true;
          pwr.classList.add('flare');
          later(() => pwr.classList.remove('flare'), 950);
        }
      }
    }, { threshold: [0, INVIEW_RATIO] })
    : null;
  io?.observe(device);

  const onHide = (): void => snapStandby();
  const onShow = (e: PageTransitionEvent): void => { if (e.persisted) snapStandby(); };
  window.addEventListener('pagehide', onHide);
  window.addEventListener('pageshow', onShow);

  // start from a clean standby whatever the markup said
  setLive(false);
  seal(true);
  setState('standby');

  return {
    state: () => st,
    press,
    dispose(): void {
      alive = false;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('pageshow', onShow);
      pwr.removeEventListener('click', press);
      seal(false);
      pwr.remove();
    },
  };
}
