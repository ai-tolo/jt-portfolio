// from signal-studio-v6lib/src/engine/core.ts:387-400,601,938-973,1217-1220,1337-1340,1487-1848 + src/engine/dsp.ts:7,115-124,
// 174-178,197-208,219 + src/views/instrument/bass.ts:27-30,124-128 (2a9e4a7) — a composite port; each block below names its lines.
// SIGNAL · THE BASS (src/signal/bass.ts · lane B · R1). The Studio's 303 CLASSIC synth and its drone, ported
// leaf-only from signal-studio-v6lib (branch v6-library @ 2a9e4a7): src/engine/core.ts (the voice, the chain,
// the laws), src/engine/dsp.ts (driveCurve, xToF, the cascade corners, nodeQ: local copies, NOTES-SIGNAL-R1
// §0) and src/views/instrument/bass.ts (the GLIDE dial ↔ τ law). Every ported block names its source lines in
// its own `// from …` banner. Map: docs/signal-map/B-bass.md (§10 = the port list). Contract: ./types.ts
// (Bass, BassState, BassDeps, CreateBass). Imports: ./types.ts and ./bass-pattern.ts, nothing else.
//
// THE CHAIN, built once (every Q exactly as the Studio wrote it; Web Audio reads a biquad Q in dB):
//   per hit  4 oscs → f1 LP (Q 6+8·heat) → f2 LP (Q −6.02) → env ───────────┐
//   drone    4 oscs → droneGain (0 → 0.2, τ .25 s) ─────────────────────────┤
//   bassSynthGain 1 → bassDrive (WaveShaper 2×) → bassLP (Q .7, detune ← LFO) → bassLP2 (Q −6.02) → bassOut .8
//   → ① bassHP (Q nodeQ(lowcutDb)) → bassHP2..4 (Q −3.01) → ② bassEqLP (Q nodeQ(cutDb)) → bassEqLP2..4 (Q −3.01)
//   → bassGate (the GATE chop) → bassGainNode (gain · (1 − mute)) → bassBus (solo) → out.duck
//   bassBus → exDrive → exShaper (4×) → exHP 140 Hz (Q −3.01) → exGain (the SUB exciter) → out.duck
//
// TIME. book(b) is the scheduler's hook: n = b.bar·16 + b.step; one pulse every eff = 2 sixteenths (PULSE,
// an 8th); SEQ plays seq[(n/2) mod 16] (the 16 cells are a TWO-BAR strip), PLUCK a plain hit, both at
// b.frame/sr, unswung (the kick's time); DRONE books nothing: the drone sounds while the bass is on. The
// Timekeeper is not the bass's: the integrator calls time.want('bass', on && mode !== 'drone').
// Every hit is TRACKED: stop() cancels the unstarted ones and ramps the sounding ones to 0 in 5 ms.
//
// BEYOND THE CONTRACT (additive: the object satisfies `Bass`, and createBass satisfies `CreateBass`):
//   bus            the bassBus GainNode. The integrator's SOLO writes its gain (E §7: solo on the bus nodes,
//                  mute on the gain nodes). The SUB exciter hangs off it, so a soloed-away bass loses both.
//   freq()         the folded target in Hz right now (the Studio's bassFreq): the root chip's note.
//   chop(when, stepSec) · releaseGate()   the frame-exact twin of effects.chop / effects.releaseGate for
//                  bassGate (the Studio books both chops at one `t`, core.ts:1395). gesture('gate', true, sd)
//                  carries no time and so infers one (see gesture); call bass.chop(when, sd) beside every
//                  effects.chop(when, sd) for exact chops. Once chop() is used, the run's on-calls stop chopping.
//   deps.time?     optional, the Timekeeper (only its bpm() is read; the same optional dep the drums take): the
//                  hit length law and the drone LFO read the tempo. Without it the bass measures the tempo from
//                  book()'s lattice lines (BPM_DEFAULT until the second line arrives).

import type { Bass, BassDeps, BassMode, BassState, BassStep, Booking, CreateBass, DrumVel, Timekeeper } from './types.ts';
import { BPM_DEFAULT } from './types.ts';
import { generateBassPattern } from './bass-pattern.ts';
import type { PatternStep } from './bass-pattern.ts';

// ───────────────────────────────────────────── the dsp.ts leaves (local copies: no file is shared between lanes)

// from signal-studio-v6lib/src/engine/dsp.ts:7 (2a9e4a7)
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

// from signal-studio-v6lib/src/engine/dsp.ts:115-124 (2a9e4a7) — VERBATIM
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

// from signal-studio-v6lib/src/engine/dsp.ts:174-178 (2a9e4a7) — xToF (fToX is the view's, not the voice's)
const FMIN = 20,
  FMAX = 20000,
  FLR = Math.log(FMAX / FMIN);
export const xToF = (x: number): number => FMIN * Math.exp(clamp(x, 0, 1) * FLR);

// from signal-studio-v6lib/src/engine/dsp.ts:197-208 (2a9e4a7) — the shared cascade-corner laws, VERBATIM
export const hpCascadeCorner = (hpHz: number, hpFreq01: number, slope: number, i: number): number => {
  const cf = clamp((hpFreq01 - 0.02) / 0.08, 0, 1);
  const eng = clamp((slope - i / 3) * 3, 0, 1);
  return 10 * Math.pow((20 * Math.pow(hpHz / 20, eng)) / 10, cf);
};
export const lpCascadeCorner = (baseHz: number, slope: number, i: number): number => {
  const eng = clamp((slope - i / 3) * 3, 0, 1);
  return 20000 * Math.pow(baseHz / 20000, eng);
};

// from signal-studio-v6lib/src/engine/dsp.ts:219 (2a9e4a7) — node dB → the primary pole's Web-Audio Q, VERBATIM
export const nodeQ = (db: number): number => 2 * db - 3.01 * (1 - Math.min(1, Math.abs(db) / 3));

// ───────────────────────────────────────────── the voice's laws (pure; exported for the node suite)

// from signal-studio-v6lib/src/engine/core.ts:1489-1492 (2a9e4a7) — the heat + SUB laws, VERBATIM
export const bassLPf = (v: number): number => { const c = 1 - clamp(v, 0, 1); return c <= 0.5 ? 3600 + (640 - 3600) * (c / 0.5) : 640 + (260 - 640) * ((c - 0.5) / 0.5); };
export const bassDrv = (v: number): number => { const c = 1 - clamp(v, 0, 1); return c <= 0.5 ? 0.62 + (0.1 - 0.62) * (c / 0.5) : 0.1 + (0.3 - 0.1) * ((c - 0.5) / 0.5); };
export const bassSaw = (v: number): number => { const c = 1 - clamp(v, 0, 1); return c <= 0.5 ? 0.5 + (0.18 - 0.5) * (c / 0.5) : 0.18 + (0.07 - 0.18) * ((c - 0.5) / 0.5); };
export const bassSine = (w: number): number => 0.45 + clamp(w, 0, 1) * 0.75;

// from signal-studio-v6lib/src/engine/core.ts:1654 (2a9e4a7) — CLASSIC: two saws ±11¢, a square, a sub sine an octave down
const BASS_OSCS: Array<[OscillatorType, number, number, string]> = [['sawtooth', 1, -11, 'saw'], ['sawtooth', 1, 11, 'saw'], ['square', 1, 0, 'sqr'], ['sine', 0.5, 0, 'sub']];
// from signal-studio-v6lib/src/engine/core.ts:1657 (2a9e4a7) — halve, then fold into 45..115 Hz, VERBATIM (callers pass f > 0)
export const foldBass = (f: number): number => { f = f / 2; while (f > 115) f /= 2; while (f < 45) f *= 2; return f; };
// from signal-studio-v6lib/src/engine/core.ts:1660, 1665-1666 (2a9e4a7)
const DRONE_LV = 0.2;
const VEL_PEAK: Record<number, number> = { 1: 0.35, 2: 0.75, 3: 1.0 };
const PULSE_MULT = [4, 3, 2, 1];

// from signal-studio-v6lib/src/views/instrument/bass.ts:27-30 (2a9e4a7) — the GLIDE dial ↔ τ (8..300 ms), VERBATIM
const GLIDE_MIN = 0.008;
const GLIDE_MAX = 0.30;
export const tauFromV = (v: number): number => GLIDE_MIN + v * (GLIDE_MAX - GLIDE_MIN);
export const vFromTau = (t: number): number => clamp((t - GLIDE_MIN) / (GLIDE_MAX - GLIDE_MIN), 0, 1);

/** MIDI → Hz (A4 = 440). The contract keeps the root as MIDI; it is folded at use: foldBass(mtof(m)). */
export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

// the tone glass's node ±dB range, from signal-studio-v6lib/src/views/instrument/filter-curve.ts:52 (2a9e4a7)
const DB_MIN = -24, DB_MAX = 18;

// the master stop (the port's law, P/click.ts:47-48's shape): a sounding hit reaches 0 in 5 ms, its oscillators
// stop 30 ms after the stop; the drone releases with τ 10 ms (the Studio's power-off .12 s is not the stop).
const KILL_RAMP = 0.005;
const KILL_STOP = 0.03;
const STOP_DRONE_TAU = 0.01;
const STOP_DRONE_CUT = 0.12;   // 12 τ: the drone oscillators stop once the release is below −100 dB

// ───────────────────────────────────────────── state

const REST = (): BassStep => ({ v: 0, oct: 'base', slide: false });
/** The Studio's cells (0 | {v 1..3, oct, slide}) → the contract's BassStep (v 0 = a rest). */
function fromPattern(cells: PatternStep[]): BassStep[] {
  return cells.map((c) => (c ? { v: c.v, oct: c.oct, slide: c.slide } : REST()));
}
/** One cell from anything (a BassStep, a Studio cell, a foreign save): never throws, never a hole. */
function normStep(c: unknown): BassStep {
  if (!c || typeof c !== 'object') return REST();
  const o = c as { v?: unknown; oct?: unknown; slide?: unknown };
  const n = Math.round(Number(o.v));
  return { v: (n >= 1 && n <= 3 ? n : 0) as DrumVel, oct: o.oct === 'sub' || o.oct === -1 ? 'sub' : 'base', slide: !!o.slide };
}

/** The contract's defaults (types.ts BassState): the Studio's boot line generateBassPattern(.5, .3) =
 *  `3 . 2 . 3 . 2 . 3 2 . 2 . 2 . 2`, the tone glass open, unity gain. */
export function defaultBassState(): BassState {
  return {
    on: false, mode: 'drone', seq: fromPattern(generateBassPattern(0.5, 0.3)), root: null, armed: false,
    heat: 0.5, weight: 0.5, glide: 0, density: 0.5, groove: 0.3,
    cut: 1, cutDb: 0, lowcut: 0, lowcutDb: 0, gain: 1, mute: false,
  };
}

/** Not in BassDeps (a contract gap, reported): the tempo. Pass the Timekeeper; the bass reads only its bpm(). */
export interface BassExtras { time?: Pick<Timekeeper, 'bpm'> }
export type SignalBass = Bass & {
  /** bassBus: the solo point (the integrator writes its gain, ramped). */
  bus: GainNode;
  /** The folded target in Hz (pinned root > lowest held > the last target). */
  freq(): number;
  /** The exact gate chop at `when` (the Studio's gateChop on bassGate): call it beside effects.chop. */
  chop(when: number, stepSec: number): void;
  /** bassGate back to 1 (cancel-and-hold, τ .03): call it beside effects.releaseGate. */
  releaseGate(): void;
};

/** One booked 303 hit: everything stop() needs to cancel it before it starts or ramp it while it sounds. */
interface Hit {
  t: number; len: number; atk: number;
  P: number; E: number;               // the env's peak and tail levels (for its value at any instant)
  oscs: OscillatorNode[]; env: GainNode; f1: BiquadFilterNode; f2: BiquadFilterNode;
  dead: boolean;                      // already ramped out by a stop: never touched again
}

/** The amp envelope bassHit books (core.ts:1721-1724), evaluated at `now` the way Web Audio renders it. */
function envAt(h: Hit, now: number): number {
  const x = now - h.t;
  if (x <= 0) return 0.0001;
  if (x < h.atk) return 0.0001 * Math.pow(h.P / 0.0001, x / h.atk);
  if (x < h.len) return h.P * Math.pow(h.E / h.P, (x - h.atk) / (h.len - h.atk));
  if (x < h.len + 0.02) return h.E * (1 - (x - h.len) / 0.02);
  return 0;
}

// ───────────────────────────────────────────── the factory

export function createBass(d: BassDeps & BassExtras): SignalBass {
  const { ctx, out } = d;
  const sr = ctx.sampleRate;
  const st: BassState = defaultBassState();

  // TEMPO. The Studio reads fx.tempo; the port reads the Timekeeper's bpm() when the integrator passes `time`, else
  // the lattice spacing book() measured, else BPM_DEFAULT.
  let bookedBpm: number | null = null, lfoBpm = 0;
  let prevLine: { n: number; frame: number } | null = null;
  function tempo(): number {
    let g = NaN;
    try { g = d.time ? Number(d.time.bpm()) : NaN; } catch { g = NaN; }
    if (g > 0 && Number.isFinite(g)) return g;
    return bookedBpm ?? BPM_DEFAULT;
  }

  // The Studio's engine params this voice reads (names from core.ts:249-252), mirrored from `st` by set().
  // bassSlope / bassHpSlope stay at their W24 default 1 (EQ8 "x4"): the contract's INTENSITY is heat (B #3).
  const fx = {
    bassHeat: st.heat, bassWeight: st.weight, bassPluck: 0,
    bassCut: st.cut, bassRes: nodeQ(st.cutDb), bassSlope: 1,
    bassHpFreq: st.lowcut, bassHpRes: nodeQ(st.lowcutDb), bassHpSlope: 1,
    bassGain: st.gain, bassMute: 0,
    get tempo(): number { return tempo(); },
  };

  // from signal-studio-v6lib/src/engine/core.ts:387-400 (2a9e4a7) — the module GAIN×MUTE node + its law, VERBATIM
  const bassGainNode = ctx.createGain(); bassGainNode.gain.value = 1;
  function applyModuleGain(node: GainNode, gain: number, mute: number): void {
    const v = clamp(gain, 0, 1.25) * (1 - (mute ? 1 : 0));
    const t = ctx.currentTime;
    if (t === 0) { node.gain.setValueAtTime(v, 0); return; }
    node.gain.setTargetAtTime(v, t, 0.02);
  }
  const applyBassGain = (): void => applyModuleGain(bassGainNode, fx.bassGain, fx.bassMute);
  // from signal-studio-v6lib/src/engine/core.ts:601 (2a9e4a7) — the bus (solo)
  const bassBus = ctx.createGain(); bassBus.gain.value = 1;

  // from signal-studio-v6lib/src/engine/core.ts:1487-1506 (2a9e4a7) — the head, the drive, the LP pair, the LFO.
  // W58 (the Studio's own note): bassLP's Q .7 (.7 → 2.0 with DRONE depth) and f1's Q 6..14 are the SHIPPED
  // voicing in their dB reading; bassLP2 / f2 −6.02 = 20·log10(0.5), the written intent. Ported as written.
  const bassSynthGain = ctx.createGain(); bassSynthGain.gain.value = 1;
  const bassDrive = ctx.createWaveShaper(); bassDrive.oversample = '2x';
  bassDrive.curve = driveCurve(bassDrv(fx.bassHeat));
  const bassLP = ctx.createBiquadFilter(); bassLP.type = 'lowpass'; bassLP.frequency.value = bassLPf(fx.bassHeat); bassLP.Q.value = 0.7;
  const bassLP2 = ctx.createBiquadFilter(); bassLP2.type = 'lowpass'; bassLP2.frequency.value = bassLPf(fx.bassHeat); bassLP2.Q.value = -6.02;
  const bassLfo = ctx.createOscillator(); bassLfo.type = 'sine'; bassLfo.frequency.value = (fx.tempo / 60) * 2;
  const bassLfoAmt = ctx.createGain(); bassLfoAmt.gain.value = 0;
  bassLfo.connect(bassLfoAmt); bassLfoAmt.connect(bassLP.detune); bassLfo.start();

  // from signal-studio-v6lib/src/engine/core.ts:1507-1514 (2a9e4a7) — applyBassMove, VERBATIM (+ lfoBpm, the port's
  // note of which tempo the LFO last took, so book() can re-time it when the lattice's tempo moves)
  function applyBassMove(): void {
    if (!bassLfoAmt) return; const d = clamp(fx.bassPluck, 0, 1), t = ctx.currentTime;
    // DRONE: MOVE is the shared-filter LFO wobble. PLUCK/SEQ: the LFO is ZEROED; there MOVE drives the per-note
    // filter-env depth + decay via moveEnvScale()/decayTau.
    if (bassMode === 'drone') { bassLfoAmt.gain.setTargetAtTime(d * d * 750, t, 0.07); bassLP.Q.setTargetAtTime(0.7 + d * 1.3, t, 0.07); }
    else { bassLfoAmt.gain.setTargetAtTime(0, t, 0.07); bassLP.Q.setTargetAtTime(0.7, t, 0.07); }
    bassLfo.frequency.setTargetAtTime(Math.max(0.05, fx.tempo / 60), t, 0.1);
    lfoBpm = fx.tempo;
  }
  // from signal-studio-v6lib/src/engine/core.ts:1523-1530 (2a9e4a7) — applyBassFilter, the SYNTH branch (no sink)
  function applyBassFilter(): void {
    const t = ctx.currentTime;
    const c = bassMode === 'drone' ? bassLPf(fx.bassHeat) : 16000;
    bassLP.frequency.setTargetAtTime(c, t, 0.04);
    bassLP2.frequency.setTargetAtTime(c, t, 0.04);
  }
  // from signal-studio-v6lib/src/engine/core.ts:1534-1543 (2a9e4a7) — the drive law, the SYNTH branch (C:1542)
  function applyBassDriveLaw(): void {
    bassDrive.curve = driveCurve(bassDrv(fx.bassHeat));
  }
  // from signal-studio-v6lib/src/engine/core.ts:1547 (2a9e4a7) — VERBATIM
  function moveEnvScale(): number { return bassMode === 'drone' ? 1 : 0.6 + clamp(fx.bassPluck, 0, 1) * 0.9; }

  // from signal-studio-v6lib/src/engine/core.ts:1548-1575 (2a9e4a7) — bassOut, the ② EQ low-pass (bassEqLP + 3 slope
  // poles), the ① low-cut (bassHP + 3 slope poles) and applyBassEq, VERBATIM (Q = the node's dB through nodeQ)
  const bassOut = ctx.createGain(); bassOut.gain.value = 0.8;
  const bassEqLP = ctx.createBiquadFilter(); bassEqLP.type = 'lowpass'; bassEqLP.frequency.value = xToF(fx.bassCut); bassEqLP.Q.value = fx.bassRes;
  const bassEqLP2 = ctx.createBiquadFilter(); bassEqLP2.type = 'lowpass'; bassEqLP2.Q.value = -3.01; bassEqLP2.frequency.value = 20000;
  const bassEqLP3 = ctx.createBiquadFilter(); bassEqLP3.type = 'lowpass'; bassEqLP3.Q.value = -3.01; bassEqLP3.frequency.value = 20000;
  const bassEqLP4 = ctx.createBiquadFilter(); bassEqLP4.type = 'lowpass'; bassEqLP4.Q.value = -3.01; bassEqLP4.frequency.value = 20000;
  const bassEqLPx = [bassEqLP2, bassEqLP3, bassEqLP4];
  const bassHP = ctx.createBiquadFilter(); bassHP.type = 'highpass'; bassHP.frequency.value = xToF(fx.bassHpFreq); bassHP.Q.value = fx.bassHpRes;
  const bassHP2 = ctx.createBiquadFilter(); bassHP2.type = 'highpass'; bassHP2.Q.value = -3.01; bassHP2.frequency.value = 20;
  const bassHP3 = ctx.createBiquadFilter(); bassHP3.type = 'highpass'; bassHP3.Q.value = -3.01; bassHP3.frequency.value = 20;
  const bassHP4 = ctx.createBiquadFilter(); bassHP4.type = 'highpass'; bassHP4.Q.value = -3.01; bassHP4.frequency.value = 20;
  const bassHPx = [bassHP2, bassHP3, bassHP4];
  function applyBassEq(): void {
    const t = ctx.currentTime;
    const baseHz = xToF(fx.bassCut);
    const hpHz = xToF(fx.bassHpFreq), hpQ = fx.bassHpRes;
    { for (let i = 0; i < bassHPx.length; i++) { const f = hpCascadeCorner(hpHz, fx.bassHpFreq, fx.bassHpSlope, i); if (t === 0) bassHPx[i].frequency.setValueAtTime(f, 0); else bassHPx[i].frequency.setTargetAtTime(f, t, 0.04); } }
    if (t === 0) { bassEqLP.frequency.setValueAtTime(baseHz, 0); bassEqLP.Q.setValueAtTime(fx.bassRes, 0); bassHP.frequency.setValueAtTime(hpHz, 0); bassHP.Q.setValueAtTime(hpQ, 0); }
    else { bassEqLP.frequency.setTargetAtTime(baseHz, t, 0.04); bassEqLP.Q.setTargetAtTime(fx.bassRes, t, 0.05); bassHP.frequency.setTargetAtTime(hpHz, t, 0.04); bassHP.Q.setTargetAtTime(hpQ, t, 0.05); }
    for (let i = 0; i < bassEqLPx.length; i++) {
      const hz = lpCascadeCorner(baseHz, fx.bassSlope, i);
      if (t === 0) bassEqLPx[i].frequency.setValueAtTime(hz, 0);
      else bassEqLPx[i].frequency.setTargetAtTime(hz, t, 0.04);
    }
  }

  // from signal-studio-v6lib/src/engine/core.ts:1576-1584 (2a9e4a7) — the gate, the wiring, bassBus → duck (E0: the
  // bass lands on the kick sidechain `duck`, never on the keys glue)
  const bassGate = ctx.createGain(); bassGate.gain.value = 1;
  bassSynthGain.connect(bassDrive); bassDrive.connect(bassLP); bassLP.connect(bassLP2); bassLP2.connect(bassOut);
  bassOut.connect(bassHP); bassHP.connect(bassHP2); bassHP2.connect(bassHP3); bassHP3.connect(bassHP4); bassHP4.connect(bassEqLP); bassEqLP.connect(bassEqLP2); bassEqLP2.connect(bassEqLP3); bassEqLP3.connect(bassEqLP4); bassEqLP4.connect(bassGate);
  bassGate.connect(bassGainNode); bassGainNode.connect(bassBus); bassBus.connect(out.duck);

  // from signal-studio-v6lib/src/engine/core.ts:1647-1653 (2a9e4a7) — the SUB harmonic exciter, a parallel send off
  // bassBus: soft-clip → highpass 140 Hz (keep only the regenerated harmonics) → exGain → duck. VERBATIM.
  const exDrive = ctx.createGain();
  const exShaper = ctx.createWaveShaper(); exShaper.oversample = '4x'; exShaper.curve = driveCurve(0.5);
  const exHP = ctx.createBiquadFilter(); exHP.type = 'highpass'; exHP.frequency.value = 140; exHP.Q.value = -3.01;
  const exGain = ctx.createGain(); exGain.gain.value = 0;
  bassBus.connect(exDrive); exDrive.connect(exShaper); exShaper.connect(exHP); exHP.connect(exGain); exGain.connect(out.duck);

  // from signal-studio-v6lib/src/engine/core.ts:1655 (2a9e4a7) — VERBATIM
  const bassOscGain = (role: string): number => (role === 'sub' ? bassSine(fx.bassWeight) : role === 'sqr' ? bassSaw(fx.bassHeat) * 0.5 : bassSaw(fx.bassHeat));
  // from signal-studio-v6lib/src/engine/core.ts:1656, 1658-1659, 1662, 1664 (2a9e4a7) — the voice's locals. No RATE,
  // seq-mult or accent control ships (B §7 table), so those three are constants at the Studio's defaults.
  let bassTarget = 65.4, lastBase = 0;   // lastBase = the previous bassHit pitch, for SLIDE portamento (never reset)
  let droneParts: Array<{ o: OscillatorNode; g: GainNode; role: string }> | null = null, droneGain: GainNode | null = null;
  let bassMode: BassMode = 'drone', bassGlideTau = 0.008, bassGlideStore = 0.12;
  const bassPulseSteps = PULSE_MULT[2], bassSeqMult = 1, accentScale = 1;
  const bassSteady = (): number => DRONE_LV;
  // from signal-studio-v6lib/src/engine/core.ts:938, 949 (2a9e4a7) — DIVE: the held flag, the depth (−2400¢ = two
  // octaves), the fall τ .45 s (the return is the literal .07 in dive())
  let diving = false, diveCents = -2400;
  const diveTau = 0.45;
  // the port's pitch input: the MIDI notes held() last received (the candidates), and the previous call's (onsets)
  let cands: number[] = [], prevHeld: number[] = [];
  const hits = new Set<Hit>();

  // from signal-studio-v6lib/src/engine/core.ts:1671-1676 (2a9e4a7), ADAPTED: the candidates are the MIDI notes
  // held() received (the arp pool while the arp runs: the caller's choice), the root is MIDI folded at use, and
  // with nothing held the bass STAYS on its last target (B #8) where the Studio fell to foldBass(lastNoteF).
  function recomputeBass(onset?: boolean): void {
    const c = cands;
    if (st.root != null) bassTarget = foldBass(mtof(st.root));
    else if (c.length) { const lo = Math.min(...c); bassTarget = foldBass(mtof(lo)); if (st.armed && onset) { st.root = lo; st.armed = false; } }
    if (droneParts) droneParts.forEach((p) => p.o.frequency.setTargetAtTime(bassTarget * ((p.o as OscillatorNode & { _mul?: number })._mul || 1), ctx.currentTime, bassGlideTau));
  }
  // from signal-studio-v6lib/src/engine/core.ts:1689-1690 (2a9e4a7), ADAPTED to a MIDI root: a root pins and
  // disarms; null unpins and leaves `armed` alone; arming recomputes as an onset (keys down → pinned at once).
  function setBassRoot(m: number | null): void { st.root = typeof m === 'number' && Number.isFinite(m) ? clamp(m, 0, 127) : null; if (st.root != null) st.armed = false; recomputeBass(); }
  function armBassLock(on: boolean): void { st.armed = !!on; recomputeBass(!!on); }

  // from signal-studio-v6lib/src/engine/core.ts:1695-1707 (2a9e4a7) — voiceOscs, VERBATIM minus the `_bd` tag
  // (a hit never dives once it sounds; only the drone reads _bd)
  function voiceOscs(base: number, head: AudioNode, t: number, len: number, glideFrom = 0, glideTau = 0.06): OscillatorNode[] {
    const oscs: OscillatorNode[] = [];
    BASS_OSCS.forEach((s) => {
      const o = ctx.createOscillator(); o.type = s[0]; const f0 = base * s[1];
      // SLIDE: glide each osc from the previous note's pitch (in its own octave) instead of jumping.
      if (glideFrom > 0) { o.frequency.setValueAtTime(glideFrom * s[1], t); o.frequency.linearRampToValueAtTime(f0, t + glideTau); }
      else o.frequency.value = f0;
      o.detune.value = s[2];
      const g = ctx.createGain(); g.gain.value = bassOscGain(s[3]);
      o.connect(g); g.connect(head); o.start(t); o.stop(t + len + 0.04); oscs.push(o);
    });
    return oscs;
  }

  function tidy(h: Hit): void {
    try { h.f1.disconnect(); } catch { /* */ } try { h.f2.disconnect(); } catch { /* */ } try { h.env.disconnect(); } catch { /* */ }
  }

  // from signal-studio-v6lib/src/engine/core.ts:1711-1746 + 1757 (2a9e4a7) — bassHit, the 303-articulated per-note
  // voice, VERBATIM minus counts.b and the sample sink (C:1747-1755); DIVE reads the gesture flag. The port adds
  // the TRACKING (the Hit record) so stop() can reach every booked voice.
  function bassHit(t: number, step?: { velocity: number; octave: string; slide?: boolean }): void {
    const accent = !!(step && step.velocity === 3);
    const slide = !!(step && step.slide);
    const len = Math.min(clamp((60 / fx.tempo) * 0.45, 0.12, 0.4), (60 / fx.tempo / 4) * bassPulseSteps * 0.9);
    const vel = step ? VEL_PEAK[step.velocity] || 0.75 : 1, peak = vel * (accent ? accentScale : 1) * 0.5;
    // amp env: accent tightens the attack, a SLID note softens it; 0.0001 floor, never exp→0 (click-safe)
    const env = ctx.createGain();
    const atk = accent ? 0.006 : slide ? 0.045 : 0.014;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(Math.max(0.02, peak), t + atk);
    env.gain.exponentialRampToValueAtTime(0.012 * Math.max(vel, 0.4), t + len);
    env.gain.linearRampToValueAtTime(0, t + len + 0.02);
    // the per-note 303 filter pair: f1 carries the resonance; both sweep up fast, then fall (the squelch)
    const f1 = ctx.createBiquadFilter(); f1.type = 'lowpass'; f1.Q.value = 6 + fx.bassHeat * 8;
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.Q.value = -6.02;
    const baseCut = bassLPf(fx.bassHeat);
    const envMod = (700 + fx.bassHeat * 2600) * (accent ? 1.6 : 1.0) * (slide ? 0.5 : 1.0) * moveEnvScale(); // slid = gentler re-squelch
    const decayTau = 0.06 + (1 - clamp(fx.bassPluck, 0, 1)) * 0.34; // 60..400 ms; MOVE shapes the fall
    for (const fp of [f1.frequency, f2.frequency]) {
      fp.setValueAtTime(baseCut, t);
      fp.linearRampToValueAtTime(Math.min(baseCut + envMod, 7000), t + 0.003); // fast attack to peak
      fp.setTargetAtTime(baseCut, t + 0.003, decayTau);                        // RC-style fall = the squelch
    }
    f1.connect(f2); f2.connect(env); env.connect(bassSynthGain);
    let base = diving ? bassTarget * Math.pow(2, diveCents / 1200) : bassTarget; if (step && step.octave === 'sub') base *= 0.5;
    // SLIDE = conditional portamento: glide from the previous note over the GLIDE time (clamped to fit the note);
    // a non-slid note jumps. lastBase > 0 guards the cold start (the first note never glides).
    const glideTau = slide && lastBase > 0 ? clamp(bassGlideStore, 0.02, Math.min(0.12, len * 0.6)) : 0;
    const oscs = voiceOscs(base, f1, t, len, glideTau > 0 ? lastBase : 0, glideTau || 0.06);
    lastBase = base;
    const h: Hit = { t, len, atk, P: Math.max(0.02, peak), E: 0.012 * Math.max(vel, 0.4), oscs, env, f1, f2, dead: false };
    hits.add(h);
    // tidy the per-note filter nodes once the voice rings out (env already silent → click-free disconnect)
    if (oscs[0]) oscs[0].onended = (): void => { hits.delete(h); tidy(h); };
  }
  // from signal-studio-v6lib/src/engine/core.ts:1759-1766 (2a9e4a7) — VERBATIM (a cell with v 0 is a rest)
  function bassSeqFire(seqIdx: number, t: number): void {
    seqIdx = ((seqIdx % 16) + 16) % 16; const cell = st.seq[seqIdx];
    if (cell && cell.v) bassHit(t, { velocity: cell.v, octave: cell.oct, slide: cell.slide });
  }
  // PLUCK = a root-only repeat (no pattern, no accent/slide). SEQ = the 16-cell bassSeq.
  function bassPulseFire(idx: number, t: number): void {
    if (bassMode === 'seq') bassSeqFire(idx, t); else bassHit(t);
  }

  // from signal-studio-v6lib/src/engine/core.ts:1767-1774 (2a9e4a7) — droneOn, VERBATIM minus the sink (C:1778);
  // rng.range(−3, 3) → Math.random (the drone draws its ±3¢ from any uniform source, B §10)
  function droneOn(): void {
    if (droneParts) return; droneGain = ctx.createGain(); droneGain.gain.value = 0; droneGain.connect(bassSynthGain);
    droneParts = BASS_OSCS.map((s) => {
      const o = ctx.createOscillator(); o.type = s[0]; o.frequency.value = bassTarget * s[1]; (o as OscillatorNode & { _mul?: number })._mul = s[1];
      const det = s[2] + (s[3] === 'saw' ? Math.random() * 6 - 3 : 0); o.detune.value = det + (diving ? diveCents : 0); (o as OscillatorNode & { _bd?: number })._bd = det;
      const g = ctx.createGain(); g.gain.value = bassOscGain(s[3]); o.connect(g); g.connect(droneGain!); o.start(); return { o, g, role: s[3] };
    });
    droneGain.gain.setTargetAtTime(bassSteady(), ctx.currentTime, 0.25);
  }
  // from signal-studio-v6lib/src/engine/core.ts:1780-1786 (2a9e4a7) — droneOff, minus the sink (C:1781). The
  // oscillators stop on the audio clock (the Studio's own offline branch, C:1785) instead of a 500 ms setTimeout;
  // the master stop passes τ .01 (STOP_DRONE_TAU) instead of the power-off .12.
  function droneOff(tau = 0.12, stopAfter = 0.6): void {
    if (!droneParts) return; const ps = droneParts, g = droneGain!; droneParts = null; droneGain = null;
    const t = ctx.currentTime; g.gain.setTargetAtTime(0, t, tau);
    ps.forEach((p) => { try { p.o.stop(t + stopAfter); } catch { /* */ } });
    if (ps[0]) ps[0].o.onended = (): void => { try { g.disconnect(); } catch { /* */ } };
  }

  /** A hit that has not started never plays (stop before its start time) and leaves the graph (P/click.ts:103-106). */
  function cancelHit(h: Hit): void {
    hits.delete(h); h.dead = true;
    for (const o of h.oscs) { o.onended = null; try { o.stop(); } catch { /* */ } }
    tidy(h);
  }
  /** A sounding hit: from its envelope's value now, a straight line to 0 in 5 ms; the oscillators stop at +30 ms. */
  function killHit(h: Hit, now: number): void {
    h.dead = true;
    const g = h.env.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(envAt(h, now), now);
    g.linearRampToValueAtTime(0, now + KILL_RAMP);
    const end = Math.min(h.t + h.len + 0.04, now + KILL_STOP);
    for (const o of h.oscs) { try { o.stop(end); } catch { /* */ } }
  }
  /** Leaving the pulse modes (power off, → DRONE): the hits booked ahead are cancelled, the sounding ones ring. */
  function cancelPending(): void {
    const now = ctx.currentTime;
    for (const h of [...hits]) if (!h.dead && h.t > now) cancelHit(h);
  }

  // from signal-studio-v6lib/src/engine/core.ts:1787-1801 (2a9e4a7) — setBass, the SYNTH half (the clock lines are
  // the integrator's time.want; the sink hand-over is cut). Power off also cancels the hits booked ahead.
  function setBass(on: boolean): void {
    st.on = on;
    if (on) { if (bassMode === 'pluck' || bassMode === 'seq') droneOff(); else droneOn(); }
    else { droneOff(); cancelPending(); }
  }
  // from signal-studio-v6lib/src/engine/core.ts:1802-1813 (2a9e4a7) — setBassHeat / setBassWeight / setBassPluck,
  // VERBATIM (the synth laws; applyBassFilter + applyBassDriveLaw are the synth branches above)
  function setBassHeat(v: number): void {
    fx.bassHeat = clamp(v, 0, 1); const t = ctx.currentTime;
    applyBassFilter(); applyBassDriveLaw();
    if (droneParts) droneParts.forEach((p) => { if (p.role === 'saw' || p.role === 'sqr') p.g.gain.setTargetAtTime(bassOscGain(p.role), t, 0.05); });
  }
  function setBassWeight(w: number): void {
    fx.bassWeight = clamp(w, 0, 1); const t = ctx.currentTime;
    if (droneParts) droneParts.forEach((p) => { if (p.role === 'sub') p.g.gain.setTargetAtTime(bassSine(fx.bassWeight), t, 0.05); });
    // SUB upper-half also blends in the harmonic exciter (phone translation): low SUB = clean sub only.
    exGain.gain.setTargetAtTime(clamp((fx.bassWeight - 0.4) / 0.6, 0, 1) * 0.5, t, 0.05);
  }
  function setBassPluck(v: number): void { fx.bassPluck = clamp(v, 0, 1); applyBassMove(); }
  // from signal-studio-v6lib/src/engine/core.ts:1815-1823 (2a9e4a7) — setBassGlide, minus the sink (C:1824-1827)
  function setBassGlide(tau: number): void {
    bassGlideStore = clamp(tau, 0.008, 0.3);
    // DRONE: GLIDE is the drone pitch-glide τ (apply live). PLUCK/SEQ: bassGlideStore is the SLIDE time.
    if (bassMode === 'drone') {
      bassGlideTau = bassGlideStore;
      if (droneParts) droneParts.forEach((p) => p.o.frequency.setTargetAtTime(bassTarget * ((p.o as OscillatorNode & { _mul?: number })._mul || 1), ctx.currentTime, bassGlideTau));
    }
  }
  // from signal-studio-v6lib/src/engine/core.ts:1836-1848 (2a9e4a7) — setBassMode, minus the clock lines (the
  // integrator's time.want). The port also runs applyBassMove on a mode change (B §4: the Studio left a DRONE LFO
  // on bassLP.detune until the next apply) and cancels the pulse hits booked ahead when it enters DRONE.
  function setBassMode(mode: string): void {
    if (mode === 'off' || mode === 'snap') { bassGlideTau = 0.008; mode = 'drone'; }
    else if (mode === 'glide' || mode === 'drone') { bassGlideTau = bassGlideStore; mode = 'drone'; }
    if (mode !== 'drone' && mode !== 'pluck' && mode !== 'seq') return;
    const was = bassMode;
    bassMode = mode as BassMode; st.mode = bassMode;
    applyBassFilter(); // narrow the shared poles for DRONE / open them wide for PLUCK/SEQ
    applyBassMove();
    if (!st.on) return;
    if (mode === 'drone') { if (!droneParts) droneOn(); if (was !== 'drone') cancelPending(); }
    else droneOff();
    recomputeBass();
  }

  // from signal-studio-v6lib/src/engine/core.ts:1217 (2a9e4a7) — gateChop, VERBATIM: 1 → .06 in 12 ms, held to .55·sd,
  // back to 1 by .9·sd
  function gateChop(p: AudioParam, t: number, sd: number): void { p.setValueAtTime(1, t); p.linearRampToValueAtTime(0.06, t + 0.012); p.setValueAtTime(0.06, t + sd * 0.55); p.linearRampToValueAtTime(1, t + sd * 0.9); }
  let gateRun: { when: number; sd: number } | null = null;   // the last chop booked in this run (the chain)
  let gateExact = false;                                     // chop() was used this run: it owns the timing
  let lastLineT = -1;                                        // the latest lattice line book() saw (seconds)
  function chopAt(when: number, sd: number): void {
    bassGate.gain.cancelScheduledValues(when);   // one chop per line: a second booking of a line replaces the first
    gateChop(bassGate.gain, when, sd);
    gateRun = { when, sd };
  }
  function chop(when: number, stepSec: number): void {
    if (!(stepSec > 0) || !Number.isFinite(stepSec) || !Number.isFinite(when)) return;
    gateExact = true;
    chopAt(Math.max(when, ctx.currentTime), stepSec);
  }
  // from signal-studio-v6lib/src/engine/core.ts:1218-1220 (2a9e4a7) — releaseGate, the bassGate half, VERBATIM
  function releaseGate(): void {
    const t = ctx.currentTime;
    [bassGate.gain].forEach((g) => { const cah = g as AudioParam & { cancelAndHoldAtTime?: (t: number) => void }; if (cah.cancelAndHoldAtTime) cah.cancelAndHoldAtTime(t); else g.cancelScheduledValues(t); g.setTargetAtTime(1, t, 0.03); });
    gateRun = null; gateExact = false;
  }

  // from signal-studio-v6lib/src/engine/core.ts:968-973 (2a9e4a7) — DIVE's drone half (bendCents is 0: no continuous
  // bend in the port). A sounding hit does not dive; a hit booked mid-dive starts bent (bassHit reads `diving`).
  function dive(on: boolean, cents?: number): void {
    // core.ts:1878: a dive always goes down (diveCents = −|depth|)
    if (typeof cents === 'number' && Number.isFinite(cents) && cents !== 0) diveCents = -Math.abs(cents);
    if (diving === on) return;
    diving = on; const t = ctx.currentTime;
    const tau = on ? diveTau : 0.07;
    const diveOff = on ? diveCents : 0;
    if (droneParts) droneParts.forEach((p) => { const bd = (p.o as OscillatorNode & { _bd?: number })._bd || 0; p.o.detune.setTargetAtTime(bd + diveOff, t, tau); });
  }

  // ───────────────────────────────────────────── the contract

  function state(): BassState { return { ...st, seq: st.seq.map((c) => ({ ...c })) }; }

  function set<K extends keyof BassState>(k: K, v: BassState[K]): void {
    const x: unknown = v;
    const n = typeof x === 'number' && Number.isFinite(x) ? x : null;   // a non-number never moves a knob
    switch (k) {
      case 'on': setBass(!!x); break;
      case 'mode': if (typeof x === 'string') setBassMode(x); break;
      case 'seq': if (Array.isArray(x)) st.seq = Array.from({ length: 16 }, (_, i) => normStep(x[i])); break;
      case 'root': if (x === null) setBassRoot(null); else if (n != null) setBassRoot(n); break;
      case 'armed': armBassLock(!!x); break;
      case 'heat': if (n != null) { st.heat = clamp(n, 0, 1); setBassHeat(st.heat); } break;
      case 'weight': if (n != null) { st.weight = clamp(n, 0, 1); setBassWeight(st.weight); } break;
      case 'glide': if (n != null) { st.glide = clamp(n, 0, 1); setBassGlide(tauFromV(st.glide)); } break;
      case 'density': if (n != null) st.density = clamp(n, 0, 1); break;
      case 'groove': if (n != null) { st.groove = clamp(n, 0, 1); setBassPluck(st.groove * 0.6); } break;
      case 'cut': if (n != null) { st.cut = clamp(n, 0, 1); fx.bassCut = st.cut; applyBassEq(); } break;
      case 'cutDb': if (n != null) { st.cutDb = clamp(n, DB_MIN, DB_MAX); fx.bassRes = clamp(nodeQ(st.cutDb), -50, 40); applyBassEq(); } break;
      case 'lowcut': if (n != null) { st.lowcut = clamp(n, 0, 1); fx.bassHpFreq = st.lowcut; applyBassEq(); } break;
      case 'lowcutDb': if (n != null) { st.lowcutDb = clamp(n, DB_MIN, DB_MAX); fx.bassHpRes = clamp(nodeQ(st.lowcutDb), -50, 40); applyBassEq(); } break;
      case 'gain': if (n != null) { st.gain = clamp(n, 0, 1.25); fx.bassGain = st.gain; applyBassGain(); } break;
      case 'mute': st.mute = !!x; fx.bassMute = st.mute ? 1 : 0; applyBassGain(); break;
    }
  }

  // from signal-studio-v6lib/src/engine/core.ts:1830 (2a9e4a7) — setBassStep: 0..15 only
  function setStep(i: number, s: BassStep): void { i = i | 0; if (i < 0 || i > 15) return; st.seq[i] = normStep(s); }

  // from signal-studio-v6lib/src/views/instrument/bass.ts:124-128 (2a9e4a7) — regenerate: the 16 cells from DENSITY +
  // GROOVE, and GROOVE folds in MOVE (pluck = 0.6·groove). set('density'|'groove') only store (groove re-applies the
  // pluck law); the view calls regenerate() after a knob move, so a load (density, groove, seq) keeps its seq.
  function regenerate(): void {
    st.seq = fromPattern(generateBassPattern(st.density, st.groove));
    setBassPluck(st.groove * 0.6);
  }

  function held(notes: number[]): void {
    const next = (Array.isArray(notes) ? notes : []).filter((m) => typeof m === 'number' && Number.isFinite(m));
    const onset = next.some((m) => !prevHeld.includes(m));   // a note absent from the previous call
    prevHeld = next.slice(); cands = next.slice();
    recomputeBass(onset);
  }

  // gesture('gate', true, stepSec): ONE chop of stepSec (call it beside effects.chop). It carries no time, so the
  // chop lands on the chain (the previous chop of this run + its length, while that is still ahead), else on
  // the latest lattice line book() saw (call bass.book(b) before harmony.book(b)), else 10 ms from now.
  // chop(when, stepSec) is the exact form. gesture('gate', false) = releaseGate(). gesture('dive', on, cents).
  function gesture(name: 'gate' | 'dive', on: boolean, arg?: number): void {
    if (name === 'dive') { dive(!!on, arg); return; }
    if (name !== 'gate') return;
    if (!on) { releaseGate(); return; }
    if (gateExact) return;
    const sd = typeof arg === 'number' && arg > 0 && Number.isFinite(arg) ? arg : gateRun ? gateRun.sd : 0;
    if (!(sd > 0)) return;
    const now = ctx.currentTime, lead = 0.002;
    const chained = gateRun ? gateRun.when + gateRun.sd : -1;
    const when = chained >= now + lead ? chained : lastLineT >= now + lead ? lastLineT : now + 0.01;
    chopAt(when, sd);
  }

  function book(b: Booking): void {
    const n = b.bar * 16 + b.step, t = b.frame / sr;
    // the lattice's tempo (15·sr per 16th-frame), for when no Timekeeper is wired
    if (prevLine && n > prevLine.n && n - prevLine.n <= 16 && b.frame > prevLine.frame) {
      const bpm = (15 * sr * (n - prevLine.n)) / (b.frame - prevLine.frame);
      if (bpm >= 20 && bpm <= 400) bookedBpm = bpm;
    }
    prevLine = { n, frame: b.frame };
    lastLineT = t;
    const now = ctx.currentTime;
    if (Math.abs(fx.tempo - lfoBpm) > 0.25) { lfoBpm = fx.tempo; bassLfo.frequency.setTargetAtTime(Math.max(0.05, fx.tempo / 60), now, 0.1); }
    for (const h of hits) if (h.t + h.len + 1 < now) { hits.delete(h); tidy(h); }   // a voice whose onended never came
    if (!st.on || (bassMode !== 'pluck' && bassMode !== 'seq')) return;
    // from signal-studio-v6lib/src/engine/core.ts:1337-1340 (2a9e4a7), ADAPTED to the lattice: the one index n
    // replaces drumStep / offBassStep / nextBassPulseT (B §5-§10); the bass is straight, like the kick
    const eff = Math.max(1, Math.round(bassPulseSteps / bassSeqMult));
    if (n % eff === 0) bassPulseFire(Math.floor(n / eff), t);
  }

  // The master stop: power off, the drone down with τ 10 ms, every booked hit cancelled, every sounding one ramped
  // to 0 in 5 ms (its oscillators stopped 30 ms on), the gate opened, the dive dropped. Root, lock, pattern and
  // knobs stay (the Studio's silence, instrument/index.ts:559-568).
  function stop(): void {
    const now = ctx.currentTime;
    st.on = false;
    droneOff(STOP_DRONE_TAU, STOP_DRONE_CUT);
    for (const h of [...hits]) { if (h.dead) continue; if (h.t > now) cancelHit(h); else killHit(h, now); }
    releaseGate();
    diving = false;
    prevHeld = []; cands = [];
  }

  // boot: the state's laws on the fresh nodes (the Studio's view writes the same at its boot, bass.ts:207)
  applyBassEq();                   // pins the tone nodes at t = 0 (C:1568)
  applyBassGain();
  setBassWeight(st.weight);        // the SUB exciter from the state (.083 at .5)
  setBassGlide(tauFromV(st.glide));
  setBassPluck(st.groove * 0.6);   // → applyBassMove: the LFO leaves its boot rate (2·tempo/60) for tempo/60

  return { state, set, setStep, regenerate, held, gesture, book, stop, bus: bassBus, freq: () => bassTarget, chop, releaseGate };
}

// the factory against the contract's signature (a compile-time check; erased to a no-op statement)
createBass satisfies CreateBass;
