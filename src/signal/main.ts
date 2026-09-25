// SIGNAL · THE BOOT (src/signal/main.ts · the integrator, R1). boot(root) turns the device's static markup
// (src/components/signal/Signal.astro) into the instrument:
//
//   the context, SUSPENDED ─▶ the store's row ─▶ createInstrument (the saved voice's fetch starts inside it, the kit
//   decodes on the suspended context) ─▶ instrument.load(row) ─▶ the four views ─▶ the keymap ─▶ the store follows
//   onChange ─▶ (?mute=1 | ?test=1) window.__signal
//
// SOUND SAFETY (types.ts): nothing sounds before the first gesture. A new context reports 'suspended' even where
// autoplay is allowed, then STARTS on its own tens of ms later (measured: the page in Playwright Chromium, 76 ms; a
// saved "drums on" played the beat on load at −9 dBFS), so it is suspended at once, whatever it reports, and never
// awaited (WebKit holds that promise while the context has not started). The first
// pointerdown/keydown anywhere on the window resumes it, in the CAPTURE phase and registered BEFORE the keymap, so
// the resume is asked for before the same key becomes a note; a note pressed before the voice's first batch lands
// waits in the keys' pending set and sounds when it lands if still held (lane K). The listeners stay: Escape is not
// a user activation (its resume is refused and the next gesture asks again), and an OS may suspend a context later.
// THE BUDGET (G §3): the SAVED voice is fetched, never the default first; the kit (in the bundle) and the voice's
// middle batch decode before the first click; ready() = both.
// THE MASTER STOP: stop.ts's capture-phase Escape listener sweeps the silencer registry (the instrument registered
// its stop()); the keymap's Escape arrives as {kind:'stop'} too, so a key the listener already swept is not swept
// twice, while the test surface's synthetic press (no event) still stops.
// from signal-studio-page/src/page/main.ts:245-275 (67b6b58) — makeContext + the first-gesture law, ADAPTED.

import type { KeyAction, SignalTestSurface } from './types.ts';
import { DB_NAME, DB_VERSION, RIP_ROOT, VOICES } from './types.ts';
import { createStore, DEFAULT_STATE, mergeState } from './db.ts';
import { createInstrument } from './instrument.ts';
import type { SignalInstrumentX } from './instrument.ts';
import { createKeymap } from './keymap.ts';
import { silenceAll } from './stop.ts';
import { mountTestSurface } from './test-surface.ts';
import { mountDrumsView } from './view/drums-view.ts';
import { mountKeysView } from './view/keys-view.ts';
import { mountBassView } from './view/bass-view.ts';
import { mountHandsView } from './view/hands-view.ts';

export const SAMPLE_RATE = 48000;

/** from signal-studio-page/src/page/main.ts:245-249 (67b6b58) — VERBATIM shape: 48 k interactive, else what the
 *  browser allows. */
function makeContext(): AudioContext {
  try { return new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: 'interactive' }); }
  catch { try { return new AudioContext({ latencyHint: 'interactive' }); } catch { return new AudioContext(); } }
}

/** Focus is in a field that takes typed text (stop.ts's own guard, so the double-sweep check agrees with it). */
function typing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

export interface Booted {
  instrument: SignalInstrumentX;
  surface: SignalTestSurface | null;
  dispose(): void;
}

export async function boot(root: HTMLElement): Promise<Booted | null> {
  const q = new URLSearchParams(location.search);
  const muted = q.get('mute') === '1';
  const test = muted || q.get('test') === '1';

  // ── the context, suspended ────────────────────────────────────────────────────────────────────────────
  const ctx = makeContext();
  try { void ctx.suspend().catch(() => { /* a closed context */ }); } catch { /* */ }

  // ── the first gesture (capture, before the keymap) ───────────────────────────────────────────────────
  let inst: SignalInstrumentX | null = null;
  const wake = (): void => {
    if (ctx.state === 'running') return;
    if (inst) { void inst.wake(); return; }
    try { void ctx.resume().catch(() => { /* not an activation: the next gesture asks again */ }); } catch { /* */ }
  };
  // stop.ts sweeps a real Escape in ITS capture listener (installed at import, so before this one); remember that
  // this very press was swept, for the keymap's {kind:'stop'} that follows it in the same dispatch
  let swept = false;
  const onKeyCapture = (e: KeyboardEvent): void => {
    if ((e.code === 'Escape' || e.key === 'Escape') && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey && !typing()) {
      swept = true;
      setTimeout(() => { swept = false; }, 0);
    }
    wake();
  };
  window.addEventListener('pointerdown', wake, true);
  window.addEventListener('keydown', onKeyCapture, true);

  // ── the visitor's row, the instrument, the load ──────────────────────────────────────────────────────
  const store = createStore({ name: DB_NAME, version: DB_VERSION });
  const saved = await store.load();                       // the raw row minus its id, or null (≤ 3 s, never throws)
  const initial = mergeState(DEFAULT_STATE, saved);
  try {
    inst = await createInstrument({ ctx, muted, ripRoot: RIP_ROOT, filterP: initial.keys.filter, voice: initial.keys.voice });
  } catch (e) {
    console.error('[signal] the instrument could not be built', e);
    return null;
  }
  const I = inst;
  void I.keys.pick(initial.keys.voice);                   // the saved voice (the default when none): the fetch begun above
  I.load(saved ?? {});                                    // field by field; a missing grid or strip is regenerated
  {                                                       // R4: the arp left the surface; a saved "on" never plays (it loads OFF)
    const arp = I.harmony.state().arp;
    if (arp.on) I.harmony.set('arp', { ...arp, on: false });
    const m = I.harmony.state().music;                    // R5: FREE (chromatic) left the surface; a saved FREE loads as major
    if (m.scale === 'chrom') I.harmony.set('music', { ...m, scale: 'major' });
  }
  if (ctx.state === 'running') void I.wake();             // a gesture that came during the build

  // ── the four views ───────────────────────────────────────────────────────────────────────────────────
  const strata = root.querySelector<HTMLElement>('[data-strata]') ?? root;
  const slot = (name: string): HTMLElement | null => root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
  const views: Array<{ dispose(): void }> = [];
  const mount = (name: string, host: HTMLElement | null, fn: (r: HTMLElement, i: SignalInstrumentX) => { dispose(): void }): void => {
    if (!host) { console.warn(`[signal] no slot for the ${name} view`); return; }
    try { views.push(fn(host, I)); } catch (e) { console.error(`[signal] the ${name} view could not mount`, e); }
  };
  mount('drums', slot('drums'), mountDrumsView);
  mount('keys', slot('keys'), mountKeysView);
  mount('bass', slot('bass'), mountBassView);
  mount('hands', strata, mountHandsView);
  root.dataset.booted = '1';

  // ── the keyboard: KeyAction → the instrument ─────────────────────────────────────────────────────────
  // R3: the taught set only (types.ts KEYMAP). HOLD · CHORD · ARP · the root lock are on-screen toggles (the views write
  // the harmony / the bass directly); the pads left the surface with Digit1–8.
  function onAction(a: KeyAction, on: boolean, _shift: boolean, code: string): void {
    const H = I.harmony;
    switch (a.kind) {
      case 'note': {
        const id = 'k' + code;                            // keyup releases by the code recorded at keydown (keymap.ts)
        if (on) H.keyDown(id, H.midiFor(a.offset, a.colour));
        else H.keyUp(id);
        return;
      }
      case 'gate':
      case 'dive':
        H.gesture(a.kind, on);                            // held: on at keydown, off at keyup (and on blur)
        return;
      case 'oct':
        if (on) H.transpose(a.d);                         // a sounding chord moves; else the octave
        return;
      case 'voice': {
        if (!on) return;
        const cur = I.keys.state().voice;
        const i = Math.max(0, VOICES.indexOf(cur));
        void I.keys.pick(VOICES[(i + a.d + VOICES.length) % VOICES.length]);
        return;
      }
      case 'beat': if (on) I.drums.set('on', !I.drums.state().on); return;
      case 'bass': if (on) I.bass.set('on', !I.bass.state().on); return;
      case 'tap': if (on) I.time.tap(); return;
      case 'stop': if (on && !swept) silenceAll(); return;
    }
  }
  const keymap = createKeymap({ target: window, onAction });
  keymap.attach();

  // ── the store follows every change, from here on (never before the load: G §3) ──────────────────────
  const offSave = I.onChange(() => { store.save(I.state()); });
  const onHide = (): void => { void store.flush(); };
  window.addEventListener('pagehide', onHide);

  // ── the gate's surface ───────────────────────────────────────────────────────────────────────────────
  let surface: SignalTestSurface | null = null;
  if (test) {
    try { surface = await mountTestSurface({ instrument: I, onAction, tap: I.out.post }); }
    catch (e) { console.error('[signal] the test surface could not mount', e); }
  }

  return {
    instrument: I,
    surface,
    dispose(): void {
      keymap.detach();
      window.removeEventListener('pointerdown', wake, true);
      window.removeEventListener('keydown', onKeyCapture, true);
      window.removeEventListener('pagehide', onHide);
      offSave();
      for (const v of views.splice(0)) { try { v.dispose(); } catch { /* */ } }
      I.dispose();
    },
  };
}
