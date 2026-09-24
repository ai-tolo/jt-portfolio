// from signal-studio-v6lib/src/views/instrument/eq-response.ts:1-96 (2a9e4a7) — VERBATIM (SIGNAL R1, lane V1), with ONE port:
// source line 7 (`import { xToF, fToX, hpCascadeCorner, lpCascadeCorner, nodeQ, nodeDbFromQ } from '../../engine/dsp'`)
// is replaced by those six dsp.ts leaves (+ the clamp and FMIN/FMAX/FLR they read), copied below under their own banner.
// Browser-only at draw time: the first eqCurveDb() creates ONE OfflineAudioContext(1, 128, 48000) that is never started
// (getFrequencyResponse only reads biquad coefficients): silent, gesture-free, kept as the Studio wrote it.
// [W21 → W24] The module EQ curve — an Ableton-EQ8-style TWO-NODE filter: a LOW-CUT (high-pass ①) + a
// resonant HIGH-CUT (low-pass ②, with a slope cascade). W24: the curve is now GROUND TRUTH — it is the
// actual `BiquadFilterNode.getFrequencyResponse` of a filter chain built from the SAME dsp.ts laws the
// engine uses (resQFor/hpQFor/hpCascadeCorner/lpCascadeCorner), so the drawn curve is exactly what the
// audio does. There is no hand-derived analog-prototype model to drift from — edge/Nyquist artifacts
// die by construction (Web Audio's own bilinear-transform coefficients, at the engine's 48 kHz rate).
// ── the dsp.ts leaves eq-response.ts imported (line 7 of the source), COPIED here (no file is shared between lanes,
// the Studio tree is never imported). Module-local; line 9 below re-exports four of them, exactly as the Studio did. ──
// from signal-studio-v6lib/src/engine/dsp.ts:7 (2a9e4a7) — VERBATIM, minus `export`
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
// from signal-studio-v6lib/src/engine/dsp.ts:173-178 (2a9e4a7) — VERBATIM, minus `export`
// ── log-frequency mapping + filter response (used by the auto-filter) ──
const FMIN = 20,
  FMAX = 20000,
  FLR = Math.log(FMAX / FMIN);
const fToX = (f: number): number => Math.log(clamp(f, FMIN, FMAX) / FMIN) / FLR;
const xToF = (x: number): number => FMIN * Math.exp(clamp(x, 0, 1) * FLR);
// from signal-studio-v6lib/src/engine/dsp.ts:190-208 (2a9e4a7) — VERBATIM, minus `export`
// W24: the shared cascade-corner laws — ONE source for the engine (core.ts applyMotion/applyKeysEq/
// applyDrumEq/applyBassEq) AND the drawn EQ curve (views/instrument/eq-response.ts eqSpec). Both build
// the same biquad corners, so the curve — computed by getFrequencyResponse of these exact nodes — is
// exactly what the audio does; there is no second hand-drawn model to drift from.
// HP low-cut cascade pole i (0..2): rides 10 Hz (transparent) → the corner as the low-cut leaves OPEN
// (cf gate) and the slope engages (staggered eng). hpHz = xToF(hpFreq01); each pole's Q = -3.01 (flat
// Butterworth). At an open low-cut (hpFreq01 ≈ 0 → cf ≈ 0) every pole collapses to 10 Hz = transparent.
const hpCascadeCorner = (hpHz: number, hpFreq01: number, slope: number, i: number): number => {
  const cf = clamp((hpFreq01 - 0.02) / 0.08, 0, 1);
  const eng = clamp((slope - i / 3) * 3, 0, 1);
  return 10 * Math.pow((20 * Math.pow(hpHz / 20, eng)) / 10, cf);
};
// LP high-cut cascade pole i (0..2): rides 20 kHz (transparent) → baseHz as the slope engages. baseHz =
// xToF(cutoff01) for keys/bass, or the raw drumCover Hz for drums; each pole's Q = 0.707. At an open
// cutoff (baseHz ≈ 20 kHz) every pole stays at 20 kHz = transparent.
const lpCascadeCorner = (baseHz: number, slope: number, i: number): number => {
  const eng = clamp((slope - i / 3) * 3, 0, 1);
  return 20000 * Math.pow(baseHz / 20000, eng);
};
// from signal-studio-v6lib/src/engine/dsp.ts:215-220 (2a9e4a7) — VERBATIM, minus `export`
// W26: node dB → the primary EQ pole's Web-Audio Q (which it reads as the dB level at the corner). Web-Audio
// Q is in dB: −3.01 = maximally-flat Butterworth (no peak), 0 = already resonant (+1.25 dB). So a resting
// node (0 dB) must map to −3.01, not 0 — flat, no bump. This law is −3.01 at 0 and blends to 2× the node dB
// by |dB|≥3, so a resonant node sits at HALF the peak (the EQ8 "margin"). ± for peak/cut. nodeDbFromQ inverts.
const nodeQ = (db: number): number => 2 * db - 3.01 * (1 - Math.min(1, Math.abs(db) / 3));
const nodeDbFromQ = (q: number): number => (q >= 6 ? q / 2 : q >= -3.01 ? (q + 3.01) / 3.003 : q >= -6 ? (q + 3.01) / 0.997 : q / 2);
// ── end of the dsp.ts leaves ──

export { fToX, xToF, nodeQ, nodeDbFromQ };

// [W26] EQ8 resonant-filter model — the two nodes are a low-cut (①) + a high-cut (④, LFO-swept), each a
// real filter whose corner RESONANCE = the node's height. Web Audio maps a lo/hi-pass Q.value DIRECTLY to
// the dB level at the corner (verified: Q +6 → +6 dB peak, Q −6 → −6 dB dip, Q 0 → flat), so the node's
// vertical drag sets the primary pole's Q to its target dB and the node lands exactly under the cursor —
// UP = a resonant peak, DOWN = a dip/cut, 0 = flat. hpDb/lpDb are that ±dB (−18..18). hpX/lpX = corners;
// hpSlope/slope = roll-off steepness (Shift). The extra cascade poles give the slope, riding at 0 dB.
export interface EqParams { hpX: number; hpRes: number; hpSlope: number; lpX: number; lpRes: number; slope: number; }

export const EQ_DB_TOP = 18, EQ_DB_BOT = -30;
export const dbToY = (db: number, h: number): number => ((EQ_DB_TOP - db) / (EQ_DB_TOP - EQ_DB_BOT)) * h;

// nodeQ / nodeDbFromQ (the node-dB ↔ primary-pole-Q "margin" law) live in dsp.ts, re-exported above so the
// UI drag code + the engine dice share one source. hpRes/lpRes in EqParams carry the resulting Q.

// ── The biquad spec = exactly what the engine builds. The PRIMARY pole carries the resonance (Q = the node's
// Web-Audio Q from nodeQ). The 3 staggered slope poles ride at Q −3.01 = Butterworth-FLAT (Web-Audio Q is
// dB, so −3.01 = Q_linear 0.707, no corner peak) — pure roll-off, no honk. ──
export interface BiquadSpec { type: 'highpass' | 'lowpass'; freq: number; q: number; }
const FLAT_Q = -3.01; // Butterworth (Q_linear 0.707) — a slope pole with no corner peak
export function eqSpec(p: EqParams): BiquadSpec[] {
  const specs: BiquadSpec[] = [];
  // ① LOW-CUT (high-pass): primary pole Q = the node's Q + 3 flat slope poles. Skipped when the corner is
  // parked fully open (hpX≈0) → the band is OFF and draws dead-flat, like EQ8. (hpRes here is the Q, ≈−3.01 at rest.)
  if (p.hpX > 0.006) {
    const hpHz = xToF(p.hpX);
    specs.push({ type: 'highpass', freq: hpHz, q: p.hpRes });
    for (let i = 0; i < 3; i++) specs.push({ type: 'highpass', freq: hpCascadeCorner(hpHz, p.hpX, p.hpSlope, i), q: FLAT_Q });
  }
  // ④ HIGH-CUT (low-pass): primary pole Q = the node's Q + 3 flat slope poles. Skipped when parked fully open.
  if (p.lpX < 0.994) {
    const lpHz = xToF(p.lpX);
    specs.push({ type: 'lowpass', freq: lpHz, q: p.lpRes });
    for (let i = 0; i < 3; i++) specs.push({ type: 'lowpass', freq: lpCascadeCorner(lpHz, p.slope, i), q: FLAT_Q });
  }
  return specs;
}

// ── Ground-truth magnitude via getFrequencyResponse. A lazily-created OfflineAudioContext hosts a
// reusable biquad pool (never started, never connected — getFrequencyResponse only queries coefficients).
// 48 kHz matches the engine so the near-Nyquist response is identical to the render. Browser-only. ──
let _ctx: OfflineAudioContext | null = null;
const _pool: BiquadFilterNode[] = [];
const _ensure = (): OfflineAudioContext => (_ctx ??= new OfflineAudioContext(1, 128, 48000));

// Composite dB across `freqsHz` (Hz, ascending). Writes into `out` (reused across draws) if provided.
export function eqCurveDb(freqsHz: Float32Array<ArrayBuffer>, p: EqParams, out?: Float64Array): Float64Array {
  const ctx = _ensure();
  const specs = eqSpec(p);
  const N = freqsHz.length;
  const mag = out && out.length === N ? out : new Float64Array(N);
  mag.fill(1);
  const m = new Float32Array(N), ph = new Float32Array(N);
  for (let s = 0; s < specs.length; s++) {
    let b = _pool[s];
    if (!b) { b = ctx.createBiquadFilter(); _pool[s] = b; }
    b.type = specs[s].type; b.frequency.value = specs[s].freq; b.Q.value = specs[s].q;
    b.getFrequencyResponse(freqsHz, m, ph);
    for (let i = 0; i < N; i++) mag[i] *= m[i];
  }
  for (let i = 0; i < N; i++) mag[i] = 20 * Math.log10(Math.max(mag[i], 1e-5));
  return mag;
}

// Sample the response into an SVG polyline over a 0..W × 0..H viewBox. N+1 log-spaced points (x = the
// glass fraction i/N → xToF gives the log-Hz axis, so this is log-spaced in Hz), clamped to the box.
let _freqs = new Float32Array(0), _freqN = -1;
let _db = new Float64Array(0);
export function eqPath(W: number, H: number, p: EqParams, N = 128): string {
  if (_freqN !== N) { _freqs = new Float32Array(N + 1); for (let i = 0; i <= N; i++) _freqs[i] = xToF(i / N); _freqN = N; _db = new Float64Array(N + 1); }
  const db = eqCurveDb(_freqs, p, _db);
  let d = '';
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * W;
    const y = Math.max(0, Math.min(H, dbToY(db[i], H)));
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return d;
}

// A node rides the true response at its own corner (so it sits ON the resonant peak, EQ8-style).
const _one = new Float32Array(1), _oneOut = new Float64Array(1);
export const nodeY = (cornerX01: number, p: EqParams, H: number): number => {
  _one[0] = xToF(cornerX01);
  const db = eqCurveDb(_one, p, _oneOut)[0];
  return Math.max(0, Math.min(H, dbToY(db, H)));
};
