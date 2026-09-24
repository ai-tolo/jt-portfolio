// SIGNAL · lane O · THE KEYS FX AND THEIR RETURNS, exactly as the Studio wires them (E-effects-out.md §6):
//
//   effects.input (the keys bus: unity, never written here; a solo may ride it)
//     → amp (the GATE: chop / releaseGate) → DRIVE (sig-sat) → post → keysGain (gain × (1 − mute), τ 20 ms)
//        ├─ dry ─────────────────────────────────────────────────────────────────────────→ glue
//        ├─ MOD  sig-mod (wet only, reads 0.5·(L+R)) → modMix (.9·mod, τ 30 ms) ──────────→ glue
//        ├─ DEL  dpre .9 → delL → delR (ping-pong: delR → damp LP 3200 Q −6.02 → dfb → delL),
//        │       delL → pan −.65, delR → pan +.65 → dmix (min(.6, .7·delay)) ─────────────→ glue
//        └─ REV  tap[slot] → conv[slot] (normalize off) → mount gain[slot] → rmix (.7·reverb) → glue
//   glue (DynamicsCompressor −15 dB, 4:1, 5 ms / 250 ms, knee 30) → glueMakeup 1.0 → out.duck
//
// from signal-studio-v6lib/src/engine/core.ts:269-352, 355-365, 529-590, 712-747, 1201-1220 (2a9e4a7) — ADAPTED:
//   • the keys delay is RE-TIMED ON EVERY apply(fx, bpm) (the Studio's tempo setter never re-timed it, E §3);
//     createDelay(2) and a 1.95 s clamp, so '1/4' keeps its sync down to 60 BPM.
//   • REV feeds only the SELECTED rung through per-rung input taps (E §4.4, a deviation flagged for Jon's ear): a slot
//     change crossfades the taps (τ 4 ms, exact at 20 ms); the outgoing rung keeps its output, rings its tail out and
//     PARKS (its convolver's output edge comes off) after its IR length; reverb < 0.001 closes every tap. At most one
//     convolver runs (two during a switch tail) against the Studio's four always fed. The mounts live in ir.ts.
//   • the MOD send hears the stereo sum and has a kill listener (fx-worklet.ts); TAPE no longer silences the left.
//   • hush() (the master stop) is the page's rack-pool law (signal-studio-page/src/page/rack-pool.ts:166-168, 231-236,
//     489-511, 67b6b58): modMix / dmix / rmix → 0 in 15 ms and dfb → 0, held max(the running rooms' IR length, 2 × the
//     delay time) + 20 ms, restored over 250 ms; it also cancels every booked duck and gate chop.
//   • NO WORKLET (an insecure origin: ctx.audioWorklet is undefined over http://<tailscale-ip>, E §0.5): DRIVE becomes a
//     WaveShaper with the Studio's driveCurve at 2× (the warm knee, sig-sat's input gain and measured makeup), MOD is
//     bypassed (no wet); apply() keeps working.
// The B11 idle park (an analyser poll that parks a silent room, woken from buildNote) is NOT ported: nothing in the
// contract calls effects before a keys voice starts, and a poll cannot be ahead of a sound. With reverb > 0 the one
// selected rung runs continuously (Chrome cannot see silence through a worklet's output).
//
// EXTRAS on the Effects object (additive; see the notes): mountFirst() for the integrator's wake(), setGain(gain, mute)
// for KeysState.gain/mute (the keysGain node is here, after DRIVE, before the sends: E §7).

import type { DelayDiv, DriveType, Effects, EffectsDeps, KeysState, ModMode, RevSize } from './types.ts';
import { ensureFxWorklet, modModeIndex, satFlavorIndex } from './fx-worklet.ts';
import { createIrSet, REV_SLOTS, type IrRung, type IrSet } from './ir.ts';

type Fx = KeysState['fx'];

/** Effects plus the two additive members the integrator needs. */
export interface SignalEffects extends Effects {
  /** Mount SM now (off the click path), then MED / HALL / VAST at idle. For wake(). Idempotent. */
  mountFirst(): void;
  /** KeysState.gain × (1 − mute) on keysGain (0..1.25; the footer's detent 0.8·1.25 = unity), τ 20 ms. */
  setGain(gain: number, mute: boolean): void;
}

// ─────────────────────────────────────────────────────────────── the laws (pure; the node suite reads them)

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** The keys delay's divisions in beats (core.ts:731: '4' 1 · '8' ½ · '8d' ¾ · '16' ¼). */
export const DELAY_BEATS: Readonly<Record<DelayDiv, number>> = { '1/4': 1, '1/8': 0.5, '1/8d': 0.75, '1/16': 0.25 };
/** The feedback boost per division, only while delay > 0 (core.ts:721). */
export const DELAY_FB_BOOST: Readonly<Record<DelayDiv, number>> = { '1/16': 0.14, '1/8': 0.05, '1/8d': 0.05, '1/4': 0 };
export const DELAY_MIN_SEC = 0.02;
export const DELAY_MAX_SEC = 1.95;             // createDelay(2): '1/4' stays in sync down to 60 BPM (E §3)

export function delayTimeSec(bpm: number, div: DelayDiv): number {
  const b = bpm > 0 && Number.isFinite(bpm) ? bpm : 120;
  return clamp((60 / b) * (DELAY_BEATS[div] ?? 0.5), DELAY_MIN_SEC, DELAY_MAX_SEC);
}

/** The one-fader law (core.ts:721-729): what apply() writes to the four wet gains. */
export function fxLevels(fx: Pick<Fx, 'delay' | 'delayDiv' | 'reverb' | 'mod'>): { dfb: number; dmix: number; rmix: number; modMix: number } {
  const delay = clamp(num(fx.delay, 0), 0, 1);
  const boost = delay > 0 ? (DELAY_FB_BOOST[fx.delayDiv] ?? 0) : 0;
  return {
    dfb: Math.min(0.75, delay * 0.6 + boost),
    dmix: Math.min(0.6, delay * 0.7),
    rmix: clamp(num(fx.reverb, 0), 0, 1) * 0.7,
    modMix: clamp(num(fx.mod, 0), 0, 1) * 0.9,
  };
}

/** The kick sidechain envelope (core.ts:1201-1216 → A-drums.md §5), or null below sc 0.01 (no duck). */
export function duckLaw(sidechain: number, beatSec: number):
  { floor: number; attack: number; attackTau: number; hold: number; releaseAt: number; releaseTau: number } | null {
  const sc = clamp(num(sidechain, 0), 0, 1);
  if (sc < 0.01) return null;
  const beat = beatSec > 0 && Number.isFinite(beatSec) ? beatSec : 0.5;
  const depth = Math.min(sc / 0.65, 1), hard = Math.max(0, (sc - 0.6) / 0.4);
  const floor = Math.max(0, 1 - depth * 0.9 - hard * 0.1);
  const attack = 0.012 - hard * 0.006;
  const hold = hard * beat * 0.14;
  return { floor, attack, attackTau: Math.max(0.004, attack / 3), hold, releaseAt: attack + hold,
    releaseTau: Math.min(beat * 0.34, 0.2) * (1 + hard * 4) };
}

/** The gate chop (core.ts:1217 → D §2.5): 1 → 0.06 in 12 ms, held to 0.55·sd, back to 1 by 0.9·sd. */
export const GATE_FLOOR = 0.06;
export const GATE_ATTACK = 0.012;
export const GATE_RELEASE_TAU = 0.03;          // releaseGate: cancel-and-hold, τ 30 ms back to 1 (core.ts:1218-1220)

/** The master stop's hold (rack-pool.ts: HUSH_RAMP, RESTORE_RAMP). */
export const HUSH_RAMP = 0.015;
export const HUSH_PAD = 0.02;
export const RESTORE_RAMP = 0.25;
export const DUCK_RESET_TAU = 0.05;            // beat off / kill: the duck back to 1 (core.ts:1446, 1964)
/** The REV taps: a slot change crossfades at τ 4 ms (core.ts:745's constant), pinned exact at 20 ms (E §4.4). */
export const TAP_TAU = 0.004;
export const TAP_FADE = 0.02;

export function hushHoldSec(roomSec: number, delaySec: number): number {
  return Math.max(Math.max(0, num(roomSec, 0)), 2 * Math.max(0, num(delaySec, 0))) + HUSH_PAD;
}

// from signal-studio-v6lib/src/engine/dsp.ts:115-124 (2a9e4a7) — VERBATIM (the fallback DRIVE's curve)
export function driveCurve(a: number) {
  const k = a * 55,
    n = 256,
    c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return c;
}

/** The no-worklet DRIVE: driveCurve at a = 9·drive²/55 is the warm knee ((1 + 9k)x/(1 + 9k|x|), k = drive², sig-sat's
 *  fWarm and the pre-worklet engine's own warm curve); the input gain (1 + 2·drive) and the makeup (a 0.25 sine
 *  through the curve, in = out RMS) are sig-sat's, so DRIVE pushes into saturation, not louder. drive 0 = no curve. */
export function fallbackDrive(drive: number): { gi: number; a: number; mk: number } {
  const d = clamp(num(drive, 0), 0, 1);
  if (d < 1e-4) return { gi: 1, a: 0, mk: 1 };
  const K = 9 * d * d, gi = 1 + 2 * d, Ar = 0.25;
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const x = Math.max(-1, Math.min(1, gi * Ar * Math.sin((2 * Math.PI * i) / 64)));   // the shaper clamps to ±1
    const v = ((1 + K) * x) / (1 + K * Math.abs(x));
    s += v * v;
  }
  const outRms = Math.sqrt(s / 64);
  return { gi, a: K / 55, mk: outRms > 1e-9 ? Ar / Math.SQRT2 / outRms : 1 };
}

const DRIVE_TYPES: readonly DriveType[] = ['warm', 'crunch', 'tape', 'fuzz'];
const MOD_MODES: readonly ModMode[] = ['phaser', 'flanger', 'doubler', 'chorus'];

/** Unknown or out-of-range values from an old save land on the contract's defaults, never a throw. */
export function sanitizeFx(fx: Partial<Fx> | null | undefined): Fx {
  const f = fx ?? {};
  return {
    drive: clamp(num(f.drive, 0), 0, 1),
    driveType: DRIVE_TYPES.includes(f.driveType as DriveType) ? (f.driveType as DriveType) : 'warm',
    mod: clamp(num(f.mod, 0), 0, 1),
    modMode: MOD_MODES.includes(f.modMode as ModMode) ? (f.modMode as ModMode) : 'chorus',
    modRate: clamp(num(f.modRate, 0.5), 0, 1),
    delay: clamp(num(f.delay, 0), 0, 1),
    delayDiv: f.delayDiv && f.delayDiv in DELAY_BEATS ? f.delayDiv : '1/8',
    reverb: clamp(num(f.reverb, 0.22), 0, 1),
    revSize: REV_SLOTS.includes(f.revSize as RevSize) ? (f.revSize as RevSize) : 'sm',
  };
}

/** Stop a param's future at `t` and pin its value there, so the ramp booked next starts AT t.
 *  from signal-studio-page/src/page/rack-pool.ts:231-236 (67b6b58) — VERBATIM */
function pin(p: AudioParam, t: number): void {
  const v = p.value;
  if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(t);
  else p.cancelScheduledValues(t);
  p.setValueAtTime(v, t);
}

/** The applyModuleGain law (core.ts:388-398): before the first rendered frame pin exactly, after it glide. */
function glide(ctx: BaseAudioContext, p: AudioParam, v: number, tau: number): void {
  if (!Number.isFinite(v)) return;
  const t = ctx.currentTime;
  if (t === 0) { p.cancelScheduledValues(0); p.setValueAtTime(v, 0); return; }
  p.setTargetAtTime(v, t, tau);
}

const warn = (...a: unknown[]): void => { try { console.warn('[signal-fx]', ...a); } catch { /* no console */ } };
const WORKLET_WAIT_MS = 4000;

// ─────────────────────────────────────────────────────────────── the factory

/** Resolves once the worklet is registered or the fallback chosen; NEVER rejects. IRs load lazily (ir.ts). */
export async function createEffects(d: EffectsDeps): Promise<SignalEffects> {
  let ok = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    ok = await Promise.race([
      ensureFxWorklet(d.ctx),
      new Promise<boolean>((r) => { timer = setTimeout(() => r(false), WORKLET_WAIT_MS); }),
    ]);
  } catch { ok = false; }
  if (timer) clearTimeout(timer);
  try {
    return build(d, ok);
  } catch (e) {
    warn('the keys chain could not be built; the keys go dry to the duck', e);
    return wire(d);
  }
}

function build(d: EffectsDeps, workletOk: boolean): SignalEffects {
  const { ctx, out } = d;
  const duck = out.duck.gain;

  // ── the insert: gate amp → DRIVE → post
  const input = ctx.createGain(); input.gain.value = 1;
  const amp = ctx.createGain(); amp.gain.value = 1;
  const post = ctx.createGain(); post.gain.value = 1;
  input.connect(amp);

  let sat: AudioWorkletNode | null = null;
  let sigMod: AudioWorkletNode | null = null;
  if (workletOk) {
    try {
      sat = new AudioWorkletNode(ctx, 'sig-sat', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
      sigMod = new AudioWorkletNode(ctx, 'sig-mod', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
    } catch (e) {
      warn('the worklet registered but its nodes would not build; the fallback drives', e);
      try { sat?.disconnect(); } catch { /* */ }
      sat = null; sigMod = null;
    }
  }
  const satDrive = sat ? sat.parameters.get('drive') ?? null : null;
  const satFlavor = sat ? sat.parameters.get('flavor') ?? null : null;
  const modModeP = sigMod ? sigMod.parameters.get('mode') ?? null : null;
  const modRateP = sigMod ? sigMod.parameters.get('rate') ?? null : null;

  // the fallback insert: preGain (sig-sat's input gain) → WaveShaper(driveCurve) 2× → post (the makeup)
  let fbPre: GainNode | null = null;
  let fbShaper: WaveShaperNode | null = null;
  if (sat) {
    amp.connect(sat);
    sat.connect(post);
  } else {
    fbPre = ctx.createGain(); fbPre.gain.value = 1;
    fbShaper = ctx.createWaveShaper(); fbShaper.curve = null; fbShaper.oversample = '2x';
    amp.connect(fbPre); fbPre.connect(fbShaper); fbShaper.connect(post);
  }

  const keysGain = ctx.createGain(); keysGain.gain.value = 1;
  post.connect(keysGain);

  // ── the glue: keys dry + the three returns, then the makeup, then the duck
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -15; glue.ratio.value = 4; glue.attack.value = 0.005; glue.release.value = 0.25;
  const glueMakeup = ctx.createGain(); glueMakeup.gain.value = 1.0;       // GLUE_MAKEUP, measured unity (core.ts:56-68)
  keysGain.connect(glue);
  glue.connect(glueMakeup);
  glueMakeup.connect(out.duck);

  // ── MOD: parallel, wet only
  let modMix: GainNode | null = null;
  if (sigMod) {
    modMix = ctx.createGain(); modMix.gain.value = 0;
    keysGain.connect(sigMod); sigMod.connect(modMix); modMix.connect(glue);
  }

  // ── DELAY: the ping-pong return (core.ts:322-328, 539-543)
  const dpre = ctx.createGain(); dpre.gain.value = 0.9;
  const delL = ctx.createDelay(2), delR = ctx.createDelay(2);
  delL.delayTime.value = 0.25; delR.delayTime.value = 0.25;
  const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 3200; damp.Q.value = -6.02;
  const dfb = ctx.createGain(); dfb.gain.value = 0;
  const dmix = ctx.createGain(); dmix.gain.value = 0;
  keysGain.connect(dpre); dpre.connect(delL); delL.connect(delR);
  const panL = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
  const panR = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
  if (panL && panR) {
    panL.pan.value = -0.65; panR.pan.value = 0.65;
    delL.connect(panL); panL.connect(dmix); delR.connect(panR); panR.connect(dmix);
  } else { delL.connect(dmix); delR.connect(dmix); }
  delR.connect(damp); damp.connect(dfb); dfb.connect(delL);
  dmix.connect(glue);

  // ── REVERB: four rungs, each tap → conv → mount gain → rmix; only the selected tap open (E §4.4)
  const rmix = ctx.createGain(); rmix.gain.value = 0;
  rmix.connect(glue);
  interface Rung extends IrRung { slot: RevSize; tap: GainNode; parked: boolean; parkTimer: ReturnType<typeof setTimeout> | null }
  const rungs = {} as Record<RevSize, Rung>;
  for (const slot of REV_SLOTS) {
    const tap = ctx.createGain(); tap.gain.value = 0;
    const conv = ctx.createConvolver();
    conv.normalize = false;                                   // BEFORE any .buffer (core.ts:340-352): the set owns level
    const g = ctx.createGain(); g.gain.value = 1;
    keysGain.connect(tap); tap.connect(conv); g.connect(rmix);
    rungs[slot] = { slot, tap, conv, out: g, parked: true, parkTimer: null };   // parked: conv → g comes on when fed
  }
  const irSet: IrSet = createIrSet({ ctx, ripRoot: d.ripRoot, rungs });

  let fed: RevSize | null = null;
  function unpark(r: Rung): void {
    if (r.parkTimer) { clearTimeout(r.parkTimer); r.parkTimer = null; }
    if (!r.parked) return;
    r.parked = false;
    try { r.conv.connect(r.out); } catch { /* already */ }
  }
  function parkLater(r: Rung): void {
    if (r.parkTimer) clearTimeout(r.parkTimer);
    const sec = TAP_FADE + irSet.seconds(r.slot) + 0.02;
    r.parkTimer = setTimeout(() => {
      r.parkTimer = null;
      if (fed === r.slot || r.parked) return;
      r.parked = true;
      try { r.conv.disconnect(r.out); } catch { /* already out */ }
    }, sec * 1000);
  }
  function tapTo(p: AudioParam, v: number): void {
    const t = ctx.currentTime;
    if (t === 0) { p.cancelScheduledValues(0); p.setValueAtTime(v, 0); return; }
    pin(p, t);
    p.setTargetAtTime(v, t, TAP_TAU);
    p.setValueAtTime(v, t + TAP_FADE);                        // exact from here: a closed tap feeds true zeros
  }
  function feed(slot: RevSize | null): void {
    if (slot === fed) return;
    if (fed) { const r = rungs[fed]; tapTo(r.tap.gain, 0); parkLater(r); }
    fed = slot;
    if (slot) {
      const r = rungs[slot];
      unpark(r);
      tapTo(r.tap.gain, 1);
      irSet.want(slot);                                       // a rung picked before it is mounted mounts now
    }
  }
  /** The longest IR still ringing: every rung whose output edge is on (the fed one + any outgoing tail). */
  function roomSec(): number {
    let s = 0;
    for (const slot of REV_SLOTS) if (!rungs[slot].parked) s = Math.max(s, irSet.seconds(slot));
    return s;
  }

  // ── state + the writers
  let last: Fx | null = null;
  let lastDelaySec = delayTimeSec(120, '1/8');
  let curDrive = -1, curType = '', curMode = '';
  let hushed = false;
  let restoreTimer: ReturnType<typeof setTimeout> | null = null;

  function writeLevels(fx: Fx): void {
    const L = fxLevels(fx);
    glide(ctx, dfb.gain, L.dfb, 0.02);
    glide(ctx, dmix.gain, L.dmix, 0.05);
    glide(ctx, rmix.gain, L.rmix, 0.02);
    if (modMix) glide(ctx, modMix.gain, L.modMix, 0.03);
  }

  function applyDrive(fx: Fx): void {
    if (fx.drive === curDrive && fx.driveType === curType) return;
    const t = ctx.currentTime;
    if (satDrive && satFlavor) {
      if (t === 0) { satDrive.cancelScheduledValues(0); satDrive.setValueAtTime(fx.drive, 0); satFlavor.setValueAtTime(satFlavorIndex(fx.driveType), 0); }
      else { satDrive.setTargetAtTime(fx.drive, t, 0.02); satFlavor.setValueAtTime(satFlavorIndex(fx.driveType), t); }
    } else if (fbPre && fbShaper) {
      const law = fallbackDrive(fx.drive);
      glide(ctx, fbPre.gain, law.gi, 0.02);
      glide(ctx, post.gain, law.mk, 0.02);
      fbShaper.curve = law.a > 0 ? driveCurve(law.a) : null;   // rebuilt only on change (flavour: warm only here)
    }
    curDrive = fx.drive; curType = fx.driveType;
  }

  function applyMod(fx: Fx): void {
    if (!modModeP || !modRateP) return;
    const t = ctx.currentTime;
    if (fx.modMode !== curMode) {
      // a mode is a switch, not a fade (core.ts:568-572)
      if (t === 0) { modModeP.cancelScheduledValues(0); modModeP.setValueAtTime(modModeIndex(fx.modMode), 0); }
      else modModeP.setValueAtTime(modModeIndex(fx.modMode), t);
      curMode = fx.modMode;
    }
    glide(ctx, modRateP, fx.modRate, 0.05);
  }

  function apply(fxIn: KeysState['fx'], bpm: number): void {
    const fx = sanitizeFx(fxIn);
    last = fx;
    applyDrive(fx);
    applyMod(fx);
    if (!hushed) writeLevels(fx);                             // a hush holds the returns; restore() writes `last`
    // the delay follows the tempo on EVERY apply (E §3: the Studio's tempo setter never re-timed it)
    lastDelaySec = delayTimeSec(bpm, fx.delayDiv);
    glide(ctx, delL.delayTime, lastDelaySec, 0.03);
    glide(ctx, delR.delayTime, lastDelaySec, 0.03);
    feed(fx.reverb >= 0.001 ? fx.revSize : null);
    if (fx.reverb > 0) irSet.mountFirst();
  }

  function releaseGate(): void {
    const t = ctx.currentTime;
    pin(amp.gain, t);
    amp.gain.setTargetAtTime(1, t, GATE_RELEASE_TAU);
  }

  function restore(): void {
    restoreTimer = null;
    hushed = false;
    if (!last) return;
    const L = fxLevels(last);
    const t = ctx.currentTime;
    const up = (p: AudioParam, v: number): void => { pin(p, t); p.linearRampToValueAtTime(v, t + RESTORE_RAMP); };
    up(dfb.gain, L.dfb); up(dmix.gain, L.dmix); up(rmix.gain, L.rmix);
    if (modMix) up(modMix.gain, L.modMix);
  }

  const api: SignalEffects = {
    input,
    apply,
    duckHit(when: number, sidechain: number, beatSec: number): void {
      const law = duckLaw(sidechain, beatSec);
      if (!law || !Number.isFinite(when)) return;
      const t = Math.max(0, when);
      duck.cancelScheduledValues(t);
      duck.setTargetAtTime(law.floor, t, law.attackTau);
      duck.setTargetAtTime(1, t + law.releaseAt, law.releaseTau);
    },
    hush(): void {
      const t = ctx.currentTime;
      const down = (p: AudioParam): void => { pin(p, t); p.linearRampToValueAtTime(0, t + HUSH_RAMP); };
      down(dmix.gain); down(rmix.gain); down(dfb.gain);
      if (modMix) down(modMix.gain);
      // every booked kick un-booked, the duck home (τ 50 ms); every booked chop un-booked, the amp home
      pin(duck, t);
      duck.setTargetAtTime(1, t, DUCK_RESET_TAU);
      releaseGate();
      hushed = true;
      if (restoreTimer) clearTimeout(restoreTimer);
      restoreTimer = setTimeout(restore, (HUSH_RAMP + hushHoldSec(roomSec(), lastDelaySec)) * 1000);
    },
    chop(when: number, stepSec: number): void {
      // from core.ts:1217 gateChop — VERBATIM arithmetic
      if (!Number.isFinite(when) || !(stepSec > 0)) return;
      const p = amp.gain, t = Math.max(0, when), sd = stepSec;
      p.setValueAtTime(1, t);
      p.linearRampToValueAtTime(GATE_FLOOR, t + GATE_ATTACK);
      p.setValueAtTime(GATE_FLOOR, t + sd * 0.55);
      p.linearRampToValueAtTime(1, t + sd * 0.9);
    },
    releaseGate,
    worklet: (): 'ready' | 'fallback' => (sat ? 'ready' : 'fallback'),
    irs: () => irSet.assets(),
    mountFirst: (): void => irSet.mountFirst(),
    setGain(gain: number, mute: boolean): void {
      glide(ctx, keysGain.gain, clamp(num(gain, 1), 0, 1.25) * (mute ? 0 : 1), 0.02);
    },
  };
  irSet.prefetch();
  return api;
}

/** The last resort (a graph that would not build): the keys go dry to the duck, the duck still pumps and hushes. */
function wire(d: EffectsDeps): SignalEffects {
  const { ctx, out } = d;
  const input = ctx.createGain();
  try { input.connect(out.duck); } catch { /* nothing more to try */ }
  const duck = out.duck.gain;
  return {
    input,
    apply: (): void => {},
    duckHit(when: number, sidechain: number, beatSec: number): void {
      const law = duckLaw(sidechain, beatSec);
      if (!law || !Number.isFinite(when)) return;
      const t = Math.max(0, when);
      duck.cancelScheduledValues(t);
      duck.setTargetAtTime(law.floor, t, law.attackTau);
      duck.setTargetAtTime(1, t + law.releaseAt, law.releaseTau);
    },
    hush(): void { const t = ctx.currentTime; pin(duck, t); duck.setTargetAtTime(1, t, DUCK_RESET_TAU); },
    chop: (): void => {},
    releaseGate: (): void => {},
    worklet: (): 'ready' | 'fallback' => 'fallback',
    irs: () => [],
    mountFirst: (): void => {},
    setGain(gain: number, mute: boolean): void { glide(ctx, input.gain, clamp(num(gain, 1), 0, 1.25) * (mute ? 0 : 1), 0.02); },
  };
}
