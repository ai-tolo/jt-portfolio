// SIGNAL R1 · lane S · test-surface.ts — window.__signal, WHAT THE GATE READS (types.ts SignalTestSurface). New code
// (the Studio publishes window.__signalEngine and test runners; nothing of it carries over, G §2). Only exported: the
// integrator calls mountTestSurface when location.search has mute=1 or test=1, and nothing here runs on its own.
//
//   ready        drums.ready() && keys.ready(): the house kit and the current voice's first batch decoded
//   ctxState     instrument.ctx.state
//   level        instrument.out.level(): post-clamp peak and RMS, linear
//   firstSoundMs performance.now() at the FIRST GESTURE (the first press(code, true) or click() through this surface,
//                or a trusted pointerdown / keydown on the page, the gate's real click), then level() polled every
//                10 ms until rms > 0.001 (−60 dBFS): the difference in ms. null until then, and for good after 20 s of
//                silence. A key-up, Escape (not a user activation) or an unmapped key is not a gesture. RENDERED time:
//                the analysers read what left the graph, before the device's output latency.
//   glitches     the sig-glitch meter (glitch-worklet.ts) hung as a sink on `tap`; without a tap it hangs on nothing
//                and still counts render quanta. {blocks, gaps, maxGapMs} as the contract, plus an ADDITIVE `lagMs`
//                (render time lost to the wall clock while running): `gaps` never sees an underrun, `lagMs` does
//   press        KEYMAP[code] → onAction(action, on, shift, code), after instrument.wake() on a key-down (the page's own
//                order: its wake listener runs in the capture phase, then the keymap); an unmapped code does nothing.
//                `on` OMITTED = a TAP (down, then up, as a real key): NOTES-SIGNAL-R1 §4 writes the gate's calls as
//                press('Space') / press('Escape'), and the plain-JS gate would otherwise send a lone key-up
//   click        pointerdown + pointerup + click dispatched on the first match (bubbling, composed, at its centre,
//                pointerId 1, a mouse): through the real handlers; false when nothing matches
//   stop         instrument.stop(), the master stop
//
// DEVIATION from types.ts SurfaceDeps (asked for by the brief): the deps take an optional `tap?: AudioNode`, the node
// the meter hangs on (lane O exports it as `out.post`: post-clamp, pre-mute).

import { KEYMAP } from './types.ts';
import type { KeyAction, SignalTestSurface, SurfaceDeps } from './types.ts';
import { installGlitchMeter } from './glitch-worklet.ts';

export interface TestSurfaceDeps extends SurfaceDeps {
  /** What the glitch meter hangs on (a sink: nothing leaves it). */
  tap?: AudioNode;
}

// ─────────────────────────────────────────────────────────────── first sound: the arithmetic, clock injected

/** −60 dBFS as linear RMS: the first poll above it is the first sound. */
export const FIRST_SOUND_RMS = 0.001;
export const FIRST_SOUND_POLL_MS = 10;
/** Polling stops here: a first sound that never came stays null. */
export const FIRST_SOUND_GIVE_UP_MS = 20000;
/** A gesture's own timeStamp is trusted only this close to now (input-queue delay, not a stale or foreign clock). */
const STAMP_WINDOW_MS = 1000;

export interface SurfaceClock {
  now(): number;
  /** Call fn every `ms` until the returned cancel is called. */
  every(fn: () => void, ms: number): () => void;
}
const realClock: SurfaceClock = {
  now: () => performance.now(),
  every: (fn, ms) => { const id = setInterval(fn, ms); return () => clearInterval(id); },
};

export interface FirstSound {
  /** The first gesture, at `at` (a trusted event's timeStamp) or now. Later marks are ignored: false. */
  mark(at?: number): boolean;
  /** ms from the mark to the first poll that read rms > FIRST_SOUND_RMS; null before (or after giving up). */
  value(): number | null;
  dispose(): void;
}

export function createFirstSound(level: () => { rms: number }, clock: SurfaceClock = realClock): FirstSound {
  let t0: number | null = null;
  let ms: number | null = null;
  let cancel: (() => void) | null = null;
  const stop = (): void => { if (cancel) { const c = cancel; cancel = null; c(); } };
  const poll = (): void => {
    if (t0 === null || ms !== null) { stop(); return; }
    const now = clock.now();
    let rms = 0;
    try { rms = level().rms; } catch { rms = 0; }
    if (typeof rms === 'number' && rms > FIRST_SOUND_RMS) { ms = Math.max(0, now - t0); stop(); return; }
    if (now - t0 >= FIRST_SOUND_GIVE_UP_MS) stop();
  };
  return {
    mark(at?: number): boolean {
      if (t0 !== null) return false;
      const now = clock.now();
      t0 = typeof at === 'number' && Number.isFinite(at) && at <= now && now - at <= STAMP_WINDOW_MS ? at : now;
      cancel = clock.every(poll, FIRST_SOUND_POLL_MS);
      return true;
    },
    value: () => ms,
    dispose: stop,
  };
}

// ─────────────────────────────────────────────────────────────── the synthetic hand

/** An action that can be the first gesture: mapped, and not the master stop (Escape is never a user activation).
 *  The trusted listener also skips repeats and ⌘/ctrl/alt chords. */
const gestureAction = (a: KeyAction | undefined): boolean => !!a && a.kind !== 'stop';
/** KEYMAP's own entry for a code (never an inherited name: `constructor` is not a key). */
const actionFor = (code: string): KeyAction | undefined =>
  (Object.prototype.hasOwnProperty.call(KEYMAP, code) ? KEYMAP[code] : undefined);

function pointer(type: string, init: PointerEventInit): Event {
  return typeof PointerEvent === 'function' ? new PointerEvent(type, init) : new MouseEvent(type, init);
}

/** pointerdown + pointerup + click on `el`, at its centre, as a primary mouse button (through the real handlers). */
export function dispatchClick(el: Element): void {
  const r = el.getBoundingClientRect();
  const at: MouseEventInit = {
    bubbles: true, cancelable: true, composed: true,
    clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
    button: 0,
  };
  const ptr: PointerEventInit = { ...at, pointerId: 1, pointerType: 'mouse', isPrimary: true, width: 1, height: 1 };
  el.dispatchEvent(pointer('pointerdown', { ...ptr, buttons: 1, pressure: 0.5 }));
  el.dispatchEvent(pointer('pointerup', { ...ptr, buttons: 0, pressure: 0 }));
  el.dispatchEvent(new MouseEvent('click', { ...at, buttons: 0, detail: 1 }));
}

// ─────────────────────────────────────────────────────────────── window.__signal

/** Build the surface, publish it as window.__signal, and resolve it (never rejects: the meter falls back to its stub). */
export async function mountTestSurface(d: TestSurfaceDeps): Promise<SignalTestSurface> {
  const inst = d.instrument;
  const meter = await installGlitchMeter(inst.ctx, d.tap ?? null);
  const first = createFirstSound(() => inst.out.level());
  const wake = (): void => {
    try { void inst.wake().catch(() => { /* the page reports its own wake failures */ }); } catch { /* ditto */ }
  };

  // The gate's trusted input (a real click on a key, a real key) is a first gesture too: capture phase, before the
  // page's handlers, stamped with the event's own time (which includes the input queue's delay).
  const onTrusted = (e: Event): void => {
    if (!e.isTrusted) return;
    if (e.type === 'keydown') {
      const k = e as KeyboardEvent;
      if (k.repeat || k.metaKey || k.ctrlKey || k.altKey || !gestureAction(actionFor(k.code))) return;
    } else if ((e as PointerEvent).button !== 0) return;
    first.mark(e.timeStamp);
  };
  if (typeof addEventListener === 'function') {
    addEventListener('pointerdown', onTrusted, true);
    addEventListener('keydown', onTrusted, true);
  }

  const surface: SignalTestSurface = {
    ready: () => { try { return !!(inst.drums.ready() && inst.keys.ready()); } catch { return false; } },
    ctxState: () => inst.ctx.state,
    level: () => inst.out.level(),
    firstSoundMs: () => first.value(),
    glitches: () => meter.read(),
    state: () => inst.state(),
    press(code: string, on?: boolean, shift?: boolean): void {
      const a = actionFor(code);
      if (!a) return;
      for (const edge of on === undefined ? [true, false] : [!!on]) {
        if (edge && gestureAction(a)) { first.mark(); wake(); }
        d.onAction(a, edge, !!shift, code);
      }
    },
    click(selector: string): boolean {
      if (typeof document === 'undefined') return false;
      let el: Element | null = null;
      try { el = document.querySelector(selector); } catch { return false; }   // a malformed selector
      if (!el) return false;
      first.mark();
      wake();
      dispatchClick(el);
      return true;
    },
    stop: () => inst.stop(),
    instrument: inst,
  };
  try { (globalThis as unknown as { __signal?: SignalTestSurface }).__signal = surface; } catch { /* frozen global */ }
  return surface;
}
