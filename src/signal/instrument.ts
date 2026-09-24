// SIGNAL · THE INSTRUMENT (src/signal/instrument.ts · the integrator, R1): the lanes' factories composed, mechanically.
// Contract: ./types.ts SignalInstrument. Every module is the lane's own; this file only builds, patches and keeps the
// laws no single lane owns.
//
//   keys.out → filter (the one low-pass, MOTION its only writer) → keysBus (the keys SOLO) → effects.input
//     → gate amp → DRIVE → keysGain (gain × mute) → dry + MOD + DEL + REV → glue → out.duck
//   bass → bassBus (the bass SOLO; the SUB exciter hangs off it) → out.duck
//   drums → stop gate → drumBus (the drums SOLO) → out.drumsIn
//   time.onStep(b) → drums.book(b) · bass.book(b) · harmony.book(b)   (three listeners, in that order: one module
//     throwing never stops the others, and the bass books its line before the harmony's gate reads it)
//
// THE WRAPPERS. The views and the keymap call the modules directly (inst.drums.set, inst.harmony.gesture,
// inst.time.setBpm, inst.keys.pick …), so `inst` hands out thin wrappers that forward to the lane's object, then
// keep the three laws no lane can keep alone:
//   · THE CLOCK WANTS (the Studio's wantsClock law, time.ts): drums on · bass on && mode ≠ drone · arp on · gate held.
//   · THE KEYS' FX ON EFFECTS: keys.set('fx'|'gain'|'mute') only STORE (lane K); effects.apply(fx, bpm) runs on every
//     fx change AND every bpm change (the keys delay re-times, E §3), effects.setGain(gain, mute) on every gain/mute.
//   · onChange: one call per task (a microtask), for the views' repaint and the store's save.
// The modules talk to each other through the RAW objects (the scheduler, the harmony's keys + effects); only the bass
// the harmony holds is the wrapper, so a pad's root pin (chords.ts → bass.set('root')) and an armed capture
// (bass.held) reach the store too.
//
// SOLO rides the three bus nodes (τ 5 ms), never the gain/mute nodes (E §7); while any solo is on, the kick's duck
// is skipped (the Studio's core.ts:1202: drums cannot see the solo, so their effects.duckHit is wrapped here).
// MASTER STOP: keys, harmony, bass, drums, effects.hush, time, out.panic, in that order; registered with stop.ts's
// silencer registry, whose capture-phase Escape listener sweeps it. The keys go FIRST: the harmony's stop releases its
// held ids through keys.noteOff, the MUSICAL release (90 ms), which takes them out of the sampler's voice map, so a
// keys.stop() after it found nothing to put down on its 30 ms ramp (measured: held notes −90 dBFS at 96 ms, not 36).
// WAKE: ctx.resume() on every call until the context RUNS (a non-activating key, Escape, rejects or waits: the next
// gesture tries again, signal-studio-page/src/page/main.ts:270-273), then effects.mountFirst() once.

import type {
  DrumLane, Keys, SignalInstrument, SignalState, Timekeeper, VoiceId,
} from './types.ts';
import { BPM_DEFAULT, DRUM_LANES, RIP_ROOT } from './types.ts';
import { createOut } from './out.ts';
import type { SignalOutNode } from './out.ts';
import { createEffects } from './effects.ts';
import type { SignalEffects } from './effects.ts';
import { createPageFilter } from './filter.ts';
import type { PageFilter } from './filter.ts';
import { createKeys } from './keys.ts';
import { createMotion } from './motion.ts';
import { decodeKit } from './kit.ts';
import { createDrums } from './drums.ts';
import type { SignalDrums } from './drums.ts';
import { createBass } from './bass.ts';
import type { SignalBass } from './bass.ts';
import { createTimekeeper } from './time.ts';
import { createHarmony } from './harmony.ts';
import { DEFAULT_STATE, mergeState } from './db.ts';
import { registerSilencer } from './stop.ts';

export type SignalHarmony = ReturnType<typeof createHarmony>;
type Solo = SignalState['solo'];

export interface InstrumentDeps {
  ctx: AudioContext;
  /** ?mute=1: out.ts lands the clamp on a silent sink (level() keeps reading). */
  muted: boolean;
  ripRoot?: string;
  /** The saved keys filter position: the one low-pass is BORN there (a value from the first sample, lane K's note),
   *  not opened and glided shut at the first resume. load() still writes it. */
  filterP?: number;
  /** The voice to fetch at once (the saved one; the default when none): its fetch starts before the effects worklet
   *  and the kit are awaited, so the middle batch lands as early as it can. load() picks the same voice (one fetch). */
  voice?: VoiceId;
}

/** The contract's instrument plus what the lanes added and the page can use (additive). */
export interface SignalInstrumentX extends SignalInstrument {
  out: SignalOutNode;
  effects: SignalEffects;
  drums: SignalDrums;
  bass: SignalBass;
  harmony: SignalHarmony;
  /** the one low-pass (MOTION writes it once the context runs) */
  filter: PageFilter;
  /** the keys' solo point: after the filter, before effects.input */
  keysBus: GainNode;
  dispose(): void;
}

/** A bus solo's glide (E §7: ramped, never a step). */
export const SOLO_TAU = 0.005;
/** The bass stop gate: shut as the drums' (drums.ts KILL_TAU), open as the drums' (GATE_OPEN_TAU). */
export const STOP_TAU = 0.004;
export const OPEN_TAU = 0.002;

const isSolo = (s: unknown): s is NonNullable<Solo> => s === 'drums' || s === 'keys' || s === 'bass';

/** Stop a param's future at t and pin its value there (signal-studio-page/src/page/rack-pool.ts:231-236's law). */
function pin(p: AudioParam, t: number): void {
  const v = p.value;
  const c = p as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
  if (typeof c.cancelAndHoldAtTime === 'function') c.cancelAndHoldAtTime(t);
  else p.cancelScheduledValues(t);
  p.setValueAtTime(v, t);
}
/** A gain to v: exactly before the first rendered frame, a τ glide after it. */
function glideTo(ctx: BaseAudioContext, p: AudioParam, v: number, tau: number): void {
  const t = ctx.currentTime;
  if (t === 0) { p.cancelScheduledValues(0); p.setValueAtTime(v, 0); return; }
  pin(p, t);
  p.setTargetAtTime(v, t, tau);
}

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);

export async function createInstrument(d: InstrumentDeps): Promise<SignalInstrumentX> {
  const { ctx } = d;
  const ripRoot = d.ripRoot ?? RIP_ROOT;
  const warn = (what: string, e: unknown): void => { try { console.warn(`[signal] ${what}`, e); } catch { /* */ } };

  // the house kit decodes (a suspended context decodes) while the effects worklet registers
  const kitP = decodeKit(ctx);

  // ── the exit, the keys' front half, the clock ──────────────────────────────────────────────────────────
  const out = createOut({ ctx, muted: !!d.muted });
  const filter = createPageFilter(ctx, typeof d.filterP === 'number' && Number.isFinite(d.filterP) ? d.filterP : 1);
  const rawKeys = createKeys({ ctx, ripRoot });
  if (d.voice) void rawKeys.pick(d.voice);        // never rejects (lane K)
  rawKeys.out.connect(filter.input);
  const keysBus = ctx.createGain();
  keysBus.gain.value = 1;
  filter.output.connect(keysBus);
  const rawTime = createTimekeeper({ ctx, bpm: BPM_DEFAULT });
  const motion = createMotion({ keys: rawKeys, time: rawTime, filter, ctx });

  // ── the keys' back half: FX + returns → out.duck (never rejects: the fallback drives without a worklet) ──
  const effects = await createEffects({ ctx, out, ripRoot });
  keysBus.connect(effects.input);

  // ── onChange: once per task ────────────────────────────────────────────────────────────────────────────
  const listeners = new Set<() => void>();
  let queued = false;
  const changed = (): void => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      for (const cb of Array.from(listeners)) { try { cb(); } catch (e) { warn('an onChange listener threw', e); } }
    });
  };

  // ── drums, bass ────────────────────────────────────────────────────────────────────────────────────────
  let solo: Solo = null;
  const drumsFx: SignalEffects = {
    ...effects,
    duckHit(when: number, sidechain: number, beatSec: number): void {
      if (solo) return;                           // core.ts:1202 — no pump while anything is soloed
      effects.duckHit(when, sidechain, beatSec);
    },
  };
  const kit = await kitP;
  const rawDrums = createDrums({ ctx, out, effects: drumsFx, kit, time: rawTime });
  // THE BASS'S STOP GATE (the drums keep theirs inside drums.ts, after their filters). The bass's tone chain ends in
  // ① + its cascade, an 8-pole high-pass at 10-20 Hz (lowcut 0), which keeps ringing for 200+ ms after the voices are
  // cut (measured: master stop → −90 dBFS in 215-258 ms with the bass alone, against the contract's 150). Everything
  // the bass sends to out.duck (bassBus and the SUB exciter) passes this one node: the master stop closes it (τ 4 ms,
  // the drums' KILL_TAU) and the bass's next power-on opens it.
  const bassStop = ctx.createGain();
  bassStop.gain.value = 1;
  bassStop.connect(out.duck);
  const rawBass = createBass({ ctx, out: { ...out, duck: bassStop }, effects, time: rawTime });
  let bassGateShut = false;
  const shutBass = (): void => {
    bassGateShut = true;
    const t = ctx.currentTime;
    try { pin(bassStop.gain, t); bassStop.gain.setTargetAtTime(0, t, STOP_TAU); } catch (e) { warn('the bass stop gate', e); }
  };
  const openBass = (): void => {
    if (!bassGateShut) return;
    bassGateShut = false;
    const t = ctx.currentTime;
    try { pin(bassStop.gain, t); bassStop.gain.setTargetAtTime(1, t, OPEN_TAU); } catch (e) { warn('the bass stop gate', e); }
  };

  // ── the laws the wrappers keep ─────────────────────────────────────────────────────────────────────────
  let gateHeld = false;
  const bassWants = (): boolean => { const s = rawBass.state(); return s.on && s.mode !== 'drone'; };
  const applyFx = (): void => { try { effects.apply(rawKeys.state().fx, rawTime.bpm()); } catch (e) { warn('effects.apply failed', e); } };
  const applyGain = (): void => { const s = rawKeys.state(); try { effects.setGain(s.gain, s.mute); } catch (e) { warn('effects.setGain failed', e); } };
  const retime = (): void => { applyFx(); changed(); };

  const drums: SignalDrums = {
    ...rawDrums,
    set(k, v) {
      rawDrums.set(k, v);
      if (k === 'on') rawTime.want('drums', rawDrums.state().on);
      changed();
    },
    setStep(lane, i, v) { rawDrums.setStep(lane, i, v); changed(); },
    regenerate() { rawDrums.regenerate(); changed(); },
    stop() { rawDrums.stop(); rawTime.want('drums', false); changed(); },
  };

  const bass: SignalBass = {
    ...rawBass,
    set(k, v) {
      if (k === 'on' && v === true) openBass();   // the stop gate opens before the drone starts
      rawBass.set(k, v);
      if (k === 'on' || k === 'mode') rawTime.want('bass', bassWants());
      changed();
    },
    setStep(i, s) { rawBass.setStep(i, s); changed(); },
    regenerate() { rawBass.regenerate(); changed(); },
    held(notes) {
      const armed = rawBass.state().armed;        // an armed lock pins on an onset: that is a saved change
      rawBass.held(notes);
      if (armed) changed();
    },
    stop() { rawBass.stop(); shutBass(); rawTime.want('bass', false); changed(); },
  };

  const keys: Keys = {
    ...rawKeys,
    set(k, v) {
      if (k === 'voice') { void keys.pick(v as VoiceId); return; }   // keys.set('voice') is pick(): keep its promise
      rawKeys.set(k, v);
      if (k === 'fx') applyFx();
      else if (k === 'gain' || k === 'mute') applyGain();
      changed();
    },
    pick(v) {
      const p = rawKeys.pick(v);                  // never rejects (lane K)
      changed();
      return p.then(() => { changed(); });        // the voice lands (or reverts): the seg + the store follow
    },
  };

  // the harmony holds the WRAPPED bass (a pad's root pin, an armed capture: saved changes) and the raw keys/time/effects
  const rawHarmony = createHarmony({ keys: rawKeys, bass, time: rawTime, effects, ctx });
  rawHarmony.onChange(() => { rawTime.want('arp', rawHarmony.state().arp.on); changed(); });
  const harmony: SignalHarmony = {
    ...rawHarmony,
    set(k, v) {
      rawHarmony.set(k, v);
      if (k === 'arp') rawTime.want('arp', rawHarmony.state().arp.on);
      changed();
    },
    gesture(name, on) {
      rawHarmony.gesture(name, on);
      if (name === 'gate') { gateHeld = !!on; rawTime.want('gate', gateHeld); }
    },
    stop() {
      rawHarmony.stop();
      gateHeld = false;
      rawTime.want('arp', false);
      rawTime.want('gate', false);
      changed();
    },
  };

  const time: Timekeeper = {
    ...rawTime,
    setBpm(bpm) { const was = rawTime.bpm(); rawTime.setBpm(bpm); if (rawTime.bpm() !== was) retime(); },
    tap(nowMs) { const was = rawTime.bpm(); rawTime.tap(nowMs); if (rawTime.bpm() !== was) retime(); },
    stop() { rawTime.stop(); gateHeld = false; changed(); },
  };

  // ── the scheduler's hook: one listener per module, in the booking order ────────────────────────────────
  const offs = [
    rawTime.onStep((b) => rawDrums.book(b)),
    rawTime.onStep((b) => rawBass.book(b)),
    rawTime.onStep((b) => rawHarmony.book(b)),
  ];

  // ── solo ───────────────────────────────────────────────────────────────────────────────────────────────
  const soloNodes: Array<[NonNullable<Solo>, GainNode]> = [['drums', rawDrums.bus], ['keys', keysBus], ['bass', rawBass.bus]];
  function setSolo(s: Solo): void {
    solo = isSolo(s) ? s : null;
    for (const [name, node] of soloNodes) {
      try { glideTo(ctx, node.gain, solo === null || solo === name ? 1 : 0, SOLO_TAU); } catch (e) { warn('solo', e); }
    }
    changed();
  }

  // ── wake: the first gesture ────────────────────────────────────────────────────────────────────────────
  let mounted = false;
  const settle = (): void => {
    if (mounted || ctx.state !== 'running') return;
    mounted = true;
    try { effects.mountFirst(); } catch (e) { warn('the rooms could not mount', e); }
  };
  function wake(): Promise<void> {
    if (ctx.state === 'running') { settle(); return Promise.resolve(); }
    let p: Promise<void>;
    try { p = ctx.resume(); } catch (e) { warn('resume threw', e); return Promise.resolve(); }
    return p.then(settle, () => { /* not an activation (Escape): the next gesture tries again */ });
  }
  const onState = (): void => { settle(); };
  try { ctx.addEventListener('statechange', onState); } catch { /* */ }

  // ── the master stop ────────────────────────────────────────────────────────────────────────────────────
  function stop(): void {
    const step = (what: string, fn: () => void): void => { try { fn(); } catch (e) { warn(`stop: ${what}`, e); } };
    step('keys', () => rawKeys.stop());         // every voice down on a 30 ms ramp, booked plucks un-booked, the dive dropped
    step('harmony', () => rawHarmony.stop());   // pool cleared, hold + arp off, pads released, gate + dive back (its
                                                // noteOffs find the keys already down: nothing re-releases at 90 ms)
    step('bass', () => rawBass.stop());         // the drone τ 10 ms, booked hits cancelled, sounding hits 5 ms
    step('bass gate', shutBass);                // … and its 10-20 Hz high-pass tail shut off behind them
    step('drums', () => rawDrums.stop());       // booked hits cancelled, sounding τ 4 ms, the stop gate shut
    step('effects', () => effects.hush());      // the returns 15 ms, booked ducks + chops cancelled
    gateHeld = false;
    step('time', () => rawTime.stop());         // scheduler off, every want dropped, the origin gone
    step('out', () => out.panic());
    changed();
  }
  const unregister = registerSilencer(stop);

  // ── the state document ─────────────────────────────────────────────────────────────────────────────────
  function state(): SignalState {
    return {
      v: 1,
      bpm: rawTime.bpm(),
      drums: rawDrums.state(),
      bass: rawBass.state(),
      keys: rawKeys.state(),
      harmony: rawHarmony.state(),
      solo,
    };
  }

  /** A saved (or foreign, or partial) document, field by field over the defaults (db.ts mergeState), then every module's
   *  set() for every field. A grid or a strip the document does not carry is REGENERATED (a fresh install: DEFAULT_STATE's
   *  are all rests); a saved all-rest grid is the visitor's and stays. */
  function load(s: Partial<SignalState>): void {
    const raw = obj(s) ?? {};
    const st = mergeState(DEFAULT_STATE, raw);
    const rd = obj(raw.drums), rb = obj(raw.bass);
    const hasGrid = !!rd && !!obj(rd.seq);
    const hasStrip = !!rb && Array.isArray(rb.seq);

    rawTime.setBpm(st.bpm);

    // drums: pattern + density regenerate the grid, so they go BEFORE it; `on` last
    const D = st.drums;
    rawDrums.set('pattern', D.pattern);
    rawDrums.set('density', D.density);
    if (hasGrid) {
      for (const lane of DRUM_LANES as readonly DrumLane[]) {
        const row = D.seq[lane];
        for (let i = 0; i < 16; i++) rawDrums.setStep(lane, i, row[i] ?? 0);
      }
    }
    rawDrums.set('swing', D.swing);
    rawDrums.set('cover', D.cover); rawDrums.set('coverDb', D.coverDb);
    rawDrums.set('lowcut', D.lowcut); rawDrums.set('lowcutDb', D.lowcutDb);
    rawDrums.set('texture', D.texture); rawDrums.set('textureAmt', D.textureAmt);
    rawDrums.set('delay', D.delay);
    rawDrums.set('sidechain', D.sidechain);
    rawDrums.set('gain', D.gain); rawDrums.set('mute', D.mute);
    rawDrums.set('on', D.on);

    // bass: density + groove only store; the strip, the mode, the lock (root before armed: a root disarms); `on` last
    const B = st.bass;
    rawBass.set('density', B.density);
    rawBass.set('groove', B.groove);
    if (hasStrip) for (let i = 0; i < 16; i++) rawBass.setStep(i, B.seq[i]);
    else rawBass.regenerate();
    rawBass.set('mode', B.mode);
    rawBass.set('root', B.root);
    rawBass.set('armed', B.armed);
    rawBass.set('heat', B.heat); rawBass.set('weight', B.weight); rawBass.set('glide', B.glide);
    rawBass.set('cut', B.cut); rawBass.set('cutDb', B.cutDb);
    rawBass.set('lowcut', B.lowcut); rawBass.set('lowcutDb', B.lowcutDb);
    rawBass.set('gain', B.gain); rawBass.set('mute', B.mute);
    if (B.on) openBass();
    rawBass.set('on', B.on);

    // keys: the hand's filter (MOTION carries it into the filter once the context runs), motion, fx, gain; the voice
    const K = st.keys;
    rawKeys.set('filter', K.filter);
    if (ctx.state !== 'running' && Math.abs(filter.get() - K.filter) > 1e-6) filter.set(K.filter);
    rawKeys.set('motion', K.motion);
    rawKeys.set('fx', K.fx);
    rawKeys.set('gain', K.gain);
    rawKeys.set('mute', K.mute);
    applyGain();
    void keys.pick(K.voice);                      // the saved voice, never the default first (G §3: the budget)

    // harmony: HOLD before ARP (the latch law reads it), the rack, the gate row, the dive
    const H = st.harmony;
    rawHarmony.set('music', H.music);
    rawHarmony.set('chord', H.chord);
    rawHarmony.set('hold', H.hold);
    rawHarmony.set('arp', H.arp);
    rawHarmony.set('rack', H.rack);
    rawHarmony.set('gate', H.gate);
    rawHarmony.set('dive', H.dive);

    setSolo(st.solo);
    applyFx();                                    // fx at the loaded bpm (the delay's time)
    rawTime.want('drums', rawDrums.state().on);
    rawTime.want('bass', bassWants());
    rawTime.want('arp', rawHarmony.state().arp.on);
    changed();
  }

  // the defaults on the nodes before any load (a page that never loads still sounds as the contract says)
  applyFx();
  applyGain();

  const inst: SignalInstrumentX = {
    ctx,
    time,
    out,
    effects,
    drums,
    bass,
    keys,
    harmony,
    filter,
    keysBus,
    wake,
    stop,
    setSolo,
    state,
    load,
    onChange(cb: () => void): () => void {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
    dispose(): void {
      stop();
      unregister();
      for (const off of offs) off();
      motion.dispose();
      try { ctx.removeEventListener('statechange', onState); } catch { /* */ }
      listeners.clear();
    },
  };
  return inst;
}
