// SIGNAL · lane O · THE KEYS' NONLINEAR PAIR, off the main thread: DRIVE = `sig-sat`, MOD = `sig-mod`.
// from signal-studio-page/src/engine/fx-worklet.ts:47-418 + 1025-1061 (67b6b58) — ADAPTED (E-effects-out.md §1, §2, §8).
// Lines 47-418 (the half-band, Half2x, ADAA, the four curves, SigSat, SigMod) are carried verbatim except the five
// blocks tagged [SIGNAL · E §n] inside WORKLET_SRC:
//   • TAPE wow: per-channel wowPos/wowPhase, phase step 2π·0.7/(2·sr), dly 64 + 34·sin, advanced on every call
//     (the page's shared state silenced the LEFT channel under TAPE: sim L = −∞ dB at drive .3/.6/1).
//   • TAPE makeup measured through the emphasis pair (the page ran TAPE +0.4/+1.7/+3.3 dB hot).
//   • SigMod reads 0.5·(L+R) (the page chorused the left alone) and installs its kill listener.
// Dropped (mic rack / test spike only): sig-voicegate, sig-microshift, sig-fdn, sig-unity (page 420-1022).
// Registration is the page's, verbatim: per BaseAudioContext in a WeakMap, a Blob-URL addModule, false when the
// context has no audioWorklet (an insecure origin): effects.ts then builds its WaveShaper fallback.
//
// THE DETERMINISM LAW the processors keep (page header, lines 28-44): no wall clock, no Math.random and no allocation
// inside process(); enum-ish controls are k-rate AudioParams (not port messages); every smoother SNAPS on the first
// block. The whole module is a template literal, so nothing inside WORKLET_SRC may hold a backtick or a dollar-brace.

/** The processor source, exported so the node suite (fx-worklet.test.mjs) runs the SAME text under a stub
 *  AudioWorkletProcessor that the browser registers. */
export const WORKLET_SRC = `
// ── the half-band, and why it is 29 taps ────────────────────────────────────────────────────────
// A 29-tap half-band has a group delay of 14 samples at 2×, i.e. EXACTLY 7 at 1× per filter and 14
// for the up/down pair. An integer delay is not an aesthetic preference: it means the oversampler
// can be crossed into and out of (drive 0 is a wire) with the signal merely delayed, never
// resampled onto a different phase — no click at the boundary, and no golden moving because a
// buffer's energy landed a half sample early.
// N ≡ 1 (mod 4) is the constraint: it makes (N−1)/2 EVEN, i.e. a whole number of 1× samples.
// 61 rather than 29 because 29 Blackman taps droop ~0.04 dB by 16 kHz — audible as a dulled top on
// a chain that is supposed to be transparent at DRIVE 0. 61 puts the transition entirely above the
// band and costs 30 multiplies a sample.
const HB_N = 61, HB_MID = 30, HB_ODD = 30;   // odd taps: k = 1,3,…,59 → 30 of them
function hbTaps() {
  const h = new Float64Array(HB_N);
  for (let k = 0; k < HB_N; k++) {
    const n = k - HB_MID;
    // ideal half-band: 0.5·sinc(n/2) — zero at every even n but the centre
    const ideal = n === 0 ? 0.5 : (n % 2 === 0 ? 0 : Math.sin(Math.PI * n / 2) / (Math.PI * n));
    // Blackman window (−58 dB sidelobes; the stopband is what keeps the 2× fold-back inaudible)
    const w = 0.42 - 0.5 * Math.cos(2 * Math.PI * k / (HB_N - 1)) + 0.08 * Math.cos(4 * Math.PI * k / (HB_N - 1));
    h[k] = ideal * w;
  }
  // Both polyphase branches must have EXACTLY unity DC gain, or the two 2× phases sit at different
  // levels and the oversampler itself becomes a 24 kHz buzz. Pin the centre and normalise the odds.
  h[HB_MID] = 0.5;
  let sOdd = 0;
  for (let k = 1; k < HB_N; k += 2) sOdd += h[k];
  const g = 0.5 / sOdd;
  for (let k = 1; k < HB_N; k += 2) h[k] *= g;
  return h;
}
const HB = hbTaps();
// the odd taps, gathered: o[j] = h[2j+1]
const HB_O = new Float64Array(HB_ODD);
for (let j = 0; j < HB_ODD; j++) HB_O[j] = HB[2 * j + 1];

/** 2× up/down for ONE channel. Zero allocation after construction. */
class Half2x {
  constructor() {
    this.uHist = new Float64Array(128); this.uPos = 0;         // 1× input history (upsampler)
    this.dHist = new Float64Array(128); this.dPos = 0;         // 2× input history (downsampler)
    this.two = new Float64Array(2);
  }
  /** one input sample → two oversampled samples in this.two */
  up(x) {
    const H = this.uHist;
    this.uPos = (this.uPos + 1) & 127;
    H[this.uPos] = x;
    // phase 0 is the centre tap alone: 2 · 0.5 · x[n − (N−1)/4]
    this.two[0] = H[(this.uPos - HB_MID / 2) & 127];
    let a = 0;
    for (let j = 0; j < HB_ODD; j++) a += HB_O[j] * H[(this.uPos - j) & 127];
    this.two[1] = 2 * a;
    return this.two;
  }
  /** two oversampled samples → one output sample */
  down(y0, y1) {
    const H = this.dHist;
    this.dPos = (this.dPos + 1) & 127; H[this.dPos] = y0;
    this.dPos = (this.dPos + 1) & 127; H[this.dPos] = y1;
    // The decimation phase is v[2n] — the sample y0 just landed on, NOT y1. Anchoring on dPos
    // (y1) instead shifts the even/odd split by one and the two polyphase branches stop being
    // each other's complement: the filter still "works", it just is not a half-band any more.
    const q = (this.dPos - 1) & 127;
    // y[n] = 0.5·v[2n−HB_MID] + Σ o[j]·v[2n−(2j+1)]
    let a = 0.5 * H[(q - HB_MID) & 127];
    for (let j = 0; j < HB_ODD; j++) a += HB_O[j] * H[(q - (2 * j + 1)) & 127];
    return a;
  }
}

// ── ADAA (first-order antiderivative anti-aliasing) ─────────────────────────────────────────────
// y[n] = (F(x[n]) − F(x[n−1])) / (x[n] − x[n−1]).  As x[n] → x[n−1] that is 0/0, and the naive
// guard (just use f(x)) is audibly wrong on sustained tones — the ill-conditioned branch takes the
// MIDPOINT, which is the limit of the expression. The epsilon is generous (1e-5) because the
// division amplifies float error long before it actually divides by zero.
const ADAA_EPS = 1e-5;

// warm / crunch's shared family: f(x) = (1+k)x / (1 + k|x|)
function fWarm(x, k) { return ((1 + k) * x) / (1 + k * Math.abs(x)); }
function FWarm(x, k) {
  if (k < 1e-9) return 0.5 * x * x;
  const a = Math.abs(x);
  return (1 + k) * (a / k - Math.log1p(k * a) / (k * k));
}
function fCrunchP(x, kp, kn) { return x >= 0 ? ((1 + kp) * x) / (1 + kp * x) : ((1 + kn) * x) / (1 - kn * x); }
function FCrunch(x, kp, kn) {
  const k = x >= 0 ? kp : kn;
  if (k < 1e-9) return 0.5 * x * x;
  const a = Math.abs(x);
  return (1 + k) * (a / k - Math.log1p(k * a) / (k * k));
}
// fuzz: an honest hard clip. ADAA is what makes hard clipping legitimate at 48 k at all.
function fFuzz(x, g) { const v = x * g; return v > 1 ? 1 : v < -1 ? -1 : v; }
function FFuzz(x, g) { const a = Math.abs(x); return a <= 1 / g ? 0.5 * g * x * x : a - 0.5 / g; }
// tape: soft saturation with an exactly-invertible emphasis pair around it (the ChowDSP
// decomposition) — the emphasis is what makes tape sound like tape rather than like a soft clip.
function fTape(x, g) { return Math.tanh(g * x) / Math.tanh(g); }
function FTape(x, g) {
  // ln(cosh z) computed without overflowing: |z| + log1p(e^(−2|z|)) − ln2
  const z = Math.abs(g * x);
  return (z + Math.log1p(Math.exp(-2 * z)) - 0.6931471805599453) / (g * Math.tanh(g));
}

class SigSat extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'drive', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      // An enum as a number, deliberately: 0 warm · 1 crunch · 2 tape · 3 fuzz. See the header —
      // a port message is not sample-accurate and an offline render would not reproduce.
      { name: 'flavor', defaultValue: 0, minValue: 0, maxValue: 3, automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    /* [F3 · C] A PROCESSOR THAT CAN BE PUT DOWN. Every process() in this file ends in
     * "return true", which makes the node a permanently ACTIVE source: Chrome may never collect it,
     * disconnected or not. MEASURED: ten voice racks built and disposed on their own left 40 of 40
     * worklet nodes reachable after four forced GCs — and F3 builds a rack every time a chip is
     * opened (~2.4 MB of FDN delay line each). The "kill" message is posted by exactly one caller,
     * voice-rack.ts's dispose(), on a rack nothing will ever use again; there is no path on which a
     * live node is told this, and a node told it stays dead by design.
     * (No backticks in here: this whole module is a template literal.) */
    this._dead = false;
    this.port.onmessage = (e) => { if (e && e.data && e.data.kill) this._dead = true; };
    this.hb = [new Half2x(), new Half2x()];
    this.x1 = [0, 0];        // ADAA memory (per channel, at 2×)
    this.F1 = [0, 0];
    this.dcX = [0, 0]; this.dcY = [0, 0];   // crunch's DC blocker
    this.pre = [0, 0]; this.de = [0, 0];    // tape emphasis pair
    this.wowBuf = [new Float64Array(256), new Float64Array(256)];
    // [SIGNAL · E §1] the wow line's write position and LFO phase are PER CHANNEL. The page kept ONE of
    // each, advanced only on the last channel, while process() is channel-outer: channel 0 wrote a whole
    // block into one slot and read 4..124 slots behind it, i.e. zeros, so TAPE silenced the left.
    this.wowPos = [0, 0];
    this.wowPhase = [0, 0];
    this.dSm = 0; this.fSm = 0; this.primed = false;
    this.mkDrive = -1; this.mkFlavor = -1; this.mk = 1; this.gi = 1;
  }

  /** The MEASURED makeup (§3.3, the Richard law): the gain that makes a -9 dBFS sine come out at
   *  the level it went in, for THIS curve at THIS drive. Recomputed only when the pair moves, by
   *  integrating the curve over one cycle — measured, not a magic constant per flavor. */
  remeasure(flavor, drive) {
    if (drive === this.mkDrive && flavor === this.mkFlavor) return;
    this.mkDrive = drive; this.mkFlavor = flavor;
    const k = drive * drive;
    this.gi = 1 + drive * (flavor === 3 ? 8 : flavor === 1 ? 3 : 2);
    const Ar = 0.25; // ≈ −12 dBFS — MEASURED against the keys stem, see the note in NOTES-E2
    let s = 0;
    if (flavor === 2) {
      // [SIGNAL · E §1] TAPE is measured THROUGH its emphasis pair, as shape() runs it: pre-emphasis
      // (x - 0.35 x[n-1]) into the curve, de-emphasis (y + 0.35 y[n-1]) out. The pair is linear-inverse,
      // but the curve between them sees the emphasised signal (about 0.65x across the band), so a makeup
      // measured on the bare curve over-corrects: the page ran TAPE +0.38/+1.69/+3.27 dB hot at drive
      // 0.3/0.6/1. Three cycles settle the pair; the fourth is measured. No allocation.
      let xp = 0, dp = 0;
      for (let i = 0; i < 256; i++) {
        const x = Ar * Math.sin((2 * Math.PI * i) / 64);
        const p = x - 0.35 * xp; xp = x;
        const d = this.curve(p, k, flavor) + 0.35 * dp; dp = d;
        if (i >= 192) s += d * d;
      }
    } else {
      for (let i = 0; i < 64; i++) {
        const v = this.curve(Ar * Math.sin((2 * Math.PI * i) / 64), k, flavor);
        s += v * v;
      }
    }
    const outRms = Math.sqrt(s / 64);
    const inRms = Ar / Math.SQRT2;
    this.mk = outRms > 1e-9 ? inRms / outRms : 1;
  }
  curve(x, k, flavor) {
    const xi = x * this.gi;
    if (flavor === 1) return fCrunchP(xi, k * 22, k * 9);
    if (flavor === 2) return fTape(xi, 1 + k * 5);
    if (flavor === 3) return fFuzz(xi, 1 + k * 26);
    return fWarm(xi, k * 9);
  }
  anti(x, k, flavor) {
    const xi = x * this.gi;
    if (flavor === 1) return FCrunch(xi, k * 22, k * 9) / this.gi;
    if (flavor === 2) return FTape(xi, 1 + k * 5) / this.gi;
    if (flavor === 3) return FFuzz(xi, 1 + k * 26) / this.gi;
    return FWarm(xi, k * 9) / this.gi;
  }

  process(inputs, outputs, params) {
    const inp = inputs[0], out = outputs[0];
    if (this._dead) return false;                 // [F3 · C] see the constructor
    if (!out) return true;
    const nCh = out.length, frames = out[0].length;
    const dP = params.drive, fP = params.flavor;
    // A k-rate param still arrives as a length-1 OR length-128 array depending on automation; read
    // both shapes rather than assuming (§4.1).
    const dRaw = dP.length > 1 ? dP[frames - 1] : dP[0];
    const fRaw = fP.length > 1 ? fP[frames - 1] : fP[0];
    if (!this.primed) { this.dSm = dRaw; this.fSm = fRaw; this.primed = true; }
    // 20 ms one-pole on drive so a knob drag cannot step the curve; flavor is a hard switch (a
    // crossfade between two saturators is a third saturator nobody asked for).
    const a = Math.exp(-1 / (0.02 * sampleRate / frames));
    this.dSm = a * this.dSm + (1 - a) * dRaw;
    const drive = this.dSm < 1e-4 ? 0 : this.dSm;
    const flavor = Math.round(fRaw);
    this.remeasure(flavor, drive);
    const k = drive * drive;
    const mk = this.mk;

    for (let c = 0; c < nCh; c++) {
      const src = (inp && inp[c]) || (inp && inp[0]);
      const dst = out[c];
      const hb = this.hb[c] || (this.hb[c] = new Half2x());
      if (!src) { for (let i = 0; i < frames; i++) dst[i] = 0; continue; }
      for (let i = 0; i < frames; i++) {
        const two = hb.up(src[i]);
        let y0, y1;
        if (drive === 0) {
          // DRIVE at zero is a WIRE. The oversampler still runs (so the 14-sample delay is
          // constant either side of the boundary and crossing it cannot click), but nothing is
          // shaped — which is also why every pre-E2 golden holds.
          y0 = two[0]; y1 = two[1];
        } else {
          y0 = this.shape(c, two[0], k, flavor) * mk;
          y1 = this.shape(c, two[1], k, flavor) * mk;
        }
        let v = hb.down(y0, y1);
        if (drive > 0 && flavor === 1) {
          // crunch is asymmetric BY DESIGN (that is the character); the DC it makes is not, and
          // left in it eats headroom at the limiter. One pole at ~12 Hz, inside the processor.
          const r = 0.9985;
          const y = v - this.dcX[c] + r * this.dcY[c];
          this.dcX[c] = v; this.dcY[c] = y; v = y;
        }
        dst[i] = v;
      }
    }
    return true;
  }

  /** One oversampled sample through the ADAA'd curve, plus tape's emphasis + wow. */
  shape(c, x, k, flavor) {
    let xin = x;
    if (flavor === 2) {
      // pre-emphasis (exactly inverted after the curve): tilt the highs INTO the saturation, then
      // tilt them back — the reason tape compresses the top end instead of dulling it.
      const p = xin - 0.35 * this.pre[c];
      this.pre[c] = xin;
      xin = p;
    }
    const x0 = this.x1[c], F0 = this.F1[c];
    const F = this.anti(xin, k, flavor);
    const d = xin - x0;
    let y;
    if (d > ADAA_EPS || d < -ADAA_EPS) y = (F - F0) / d;
    else y = this.curve(0.5 * (xin + x0), k, flavor);
    this.x1[c] = xin; this.F1[c] = F;
    if (flavor === 2) {
      const dy = y + 0.35 * this.de[c];
      this.de[c] = dy;
      y = dy;
      // WOW: a ±0.35 ms wobble at 0.7 Hz through a short interpolated line. Deterministic — an
      // LFO, never noise — and the one thing that separates "tape" from "a soft clip".
      // [SIGNAL · E §1] per channel, advanced on EVERY call. shape() runs at 2x, so the phase steps
      // 2 pi 0.7 / (2 sampleRate) and the swing is +-34 samples at 2x = +-0.35 ms, the figure above.
      const buf = this.wowBuf[c];
      const wp = this.wowPos[c];
      buf[wp & 255] = y;
      let ph = this.wowPhase[c] + (2 * Math.PI * 0.7) / (2 * sampleRate);
      if (ph > 2 * Math.PI) ph -= 2 * Math.PI;
      this.wowPhase[c] = ph;
      const dly = 64 + 34 * Math.sin(ph);
      const rp = (wp - dly + 512) % 256;
      const i0 = Math.floor(rp), fr = rp - i0;
      y = buf[i0 & 255] * (1 - fr) + buf[(i0 + 1) & 255] * fr;
      this.wowPos[c] = (wp + 1) & 255;
    }
    return y;
  }
}
registerProcessor('sig-sat', SigSat);

// ── sig-mod ─────────────────────────────────────────────────────────────────────────────────────
// Four algorithms that were previously one stereo delay pair pretending to be four things. The
// output is WET ONLY — the wet LEVEL stays on core's modMix gain, exactly where it was, so the
// one-knob law and the snapshot are untouched.
const MOD_LEN = 4096;      // 85 ms at 48 k — more than any recipe needs
class SigMod extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      // 0 phaser · 1 flanger · 2 doubler · 3 chorus (the seg's own order)
      { name: 'mode', defaultValue: 3, minValue: 0, maxValue: 3, automationRate: 'k-rate' },
      // decision #8's deviation: RATE scales the recipe's tuned speed, 0.25× … 4×, unity at 0.5.
      { name: 'rate', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    // [SIGNAL · E §2] the kill listener: process() below checks _dead, but the page's copy never
    // installed the listener that sets it (SigSat's, above, is the same two lines).
    this._dead = false;
    this.port.onmessage = (e) => { if (e && e.data && e.data.kill) this._dead = true; };
    this.buf = [new Float64Array(MOD_LEN), new Float64Array(MOD_LEN)];
    this.wp = 0;
    this.ph = 0;                      // the shared LFO accumulator, in radians
    this.ph2 = 0;                     // the doubler's second, incommensurate drift
    this.ap = [];                     // 6 first-order allpass states × 2 channels
    for (let c = 0; c < 2; c++) { const row = []; for (let s = 0; s < 6; s++) row.push({ x1: 0, y1: 0 }); this.ap.push(row); }
    this.fb = [0, 0];
    this.rSm = 0.5; this.primed = false;
  }
  /** 3rd-order Lagrange read — the interpolation is the difference between a chorus and a comb
   *  filter with a stutter in it. */
  read(c, delay) {
    const b = this.buf[c];
    const rp = this.wp - delay + MOD_LEN;
    const i = Math.floor(rp), f = rp - i;
    const m1 = b[(i - 1) % MOD_LEN], p0 = b[i % MOD_LEN], p1 = b[(i + 1) % MOD_LEN], p2 = b[(i + 2) % MOD_LEN];
    const c0 = -f * (f - 1) * (f - 2) / 6, c1 = (f * f - 1) * (f - 2) / 2;
    const c2 = -f * (f + 1) * (f - 2) / 2, c3 = f * (f * f - 1) / 6;
    return c0 * m1 + c1 * p0 + c2 * p1 + c3 * p2;
  }
  process(inputs, outputs, params) {
    const inp = inputs[0], out = outputs[0];
    if (this._dead) return false;                 // [F3 · C] see the constructor
    if (!out) return true;
    const frames = out[0].length, sr = sampleRate;
    const mP = params.mode, rP = params.rate;
    const mode = Math.round(mP.length > 1 ? mP[frames - 1] : mP[0]);
    const rRaw = rP.length > 1 ? rP[frames - 1] : rP[0];
    if (!this.primed) { this.rSm = rRaw; this.primed = true; }
    const sa = Math.exp(-1 / (0.03 * sr / frames));
    this.rSm = sa * this.rSm + (1 - sa) * rRaw;
    const mult = Math.pow(4, 2 * (this.rSm - 0.5));   // 0.25× … 4×, exactly 1 at the detent
    const L = out[0], R = out[1] || out[0];
    // [SIGNAL · E §2] the send is read as 0.5 (L + R): the page read inputs[0][0] only, so a stereo
    // source was chorused from its left alone (and under the old TAPE bug, from silence).
    const inL = (inp && inp[0]) || null, inR = (inp && inp[1]) || null;

    // the tuned recipes — unchanged in spirit from MODES, rebuilt as real algorithms
    const baseHz = mode === 0 ? 0.35 : mode === 1 ? 0.4 : mode === 2 ? 0.09 : 0.6;
    const w = (2 * Math.PI * baseHz * mult) / sr;

    for (let i = 0; i < frames; i++) {
      const x = inL ? (inR ? 0.5 * (inL[i] + inR[i]) : inL[i]) : 0;
      this.ph += w; if (this.ph > 2 * Math.PI) this.ph -= 2 * Math.PI;
      this.ph2 += w * 1.317; if (this.ph2 > 2 * Math.PI) this.ph2 -= 2 * Math.PI;
      let l = 0, r = 0;
      if (mode === 0) {
        // PHASER — six staggered first-order allpasses swept EXPONENTIALLY (a linear sweep is why
        // the old one sounded like it was scanning rather than breathing), gentle feedback.
        const f0 = 200 * Math.pow(11, 0.5 + 0.5 * Math.sin(this.ph));   // 200 Hz … 2.2 kHz
        for (let c = 0; c < 2; c++) {
          const det = c === 0 ? 1 : 1.12;                                // a little stereo stagger
          let v = x + 0.3 * this.fb[c];
          for (let s = 0; s < 6; s++) {
            const fc = f0 * det * (1 + 0.22 * s);                        // staggered, not stacked
            const t = Math.tan(Math.PI * Math.min(0.49, fc / sr));
            const a1 = (t - 1) / (t + 1);
            const st = this.ap[c][s];
            const y = a1 * v + st.x1 - a1 * st.y1;
            st.x1 = v; st.y1 = y; v = y;
          }
          this.fb[c] = v;
          if (c === 0) l = v; else r = v;
        }
      } else {
        this.buf[0][this.wp] = x + (mode === 1 ? 0.45 * this.fb[0] : 0);
        this.buf[1][this.wp] = this.buf[0][this.wp];
        if (mode === 1) {
          // FLANGER — one short interpolated tap, real feedback, a contoured (not sinusoidal)
          // sweep so the through-zero region does not rush.
          const s = 0.5 - 0.5 * Math.cos(this.ph);
          const d = (0.0004 + 0.0035 * s * s) * sr;
          const v = this.read(0, d);
          this.fb[0] = v;
          l = v; r = this.read(1, d * 1.06);
        } else if (mode === 2) {
          // DOUBLER — two voices at ~22/27 ms drifting on INDEPENDENT slow LFOs. Two static taps
          // would be a comb filter; the drift is the whole illusion of a second take.
          const d1 = (0.022 + 0.0011 * Math.sin(this.ph)) * sr;
          const d2 = (0.027 + 0.0013 * Math.sin(this.ph2 + 1.9)) * sr;
          l = this.read(0, d1); r = this.read(1, d2);
        } else {
          // CHORUS — three voices at 14/18/22 ms on a quadrature-spread LFO, panned wide/centre/
          // wide. Three is the smallest number that stops it sounding like a detune.
          const dep = 0.0014 * sr;
          const v1 = this.read(0, 0.014 * sr + dep * Math.sin(this.ph));
          const v2 = this.read(0, 0.018 * sr + dep * Math.sin(this.ph + 2.0944));
          const v3 = this.read(1, 0.022 * sr + dep * Math.sin(this.ph + 4.1888));
          l = 0.62 * v1 + 0.38 * v2;
          r = 0.62 * v3 + 0.38 * v2;
        }
        this.wp = (this.wp + 1) % MOD_LEN;
      }
      L[i] = l; R[i] = r;
    }
    return true;
  }
}
registerProcessor('sig-mod', SigMod);
`;

// ─────────────────────────────────────────────────────────────── registration
// from signal-studio-page/src/engine/fx-worklet.ts:1025-1061 (67b6b58) — VERBATIM (types on the enum helpers only)

// Registration is PER CONTEXT. A module-level promise (the tap's shape) resolves once for the live
// context and then answers "ready" for every OfflineAudioContext that never loaded it — which
// fails as `InvalidStateError: unknown processor` at the worst possible moment, inside a render.
const _byCtx = new WeakMap<BaseAudioContext, Promise<boolean>>();

/** Load `signal-fx` into this context. Resolves false only if the browser has no AudioWorklet at
 *  all — in which case effects.ts takes its fallback (a WaveShaper DRIVE, MOD bypassed). */
export function ensureFxWorklet(ctx: BaseAudioContext): Promise<boolean> {
  const hit = _byCtx.get(ctx);
  if (hit) return hit;
  const anyCtx = ctx as BaseAudioContext & { audioWorklet?: AudioWorklet };
  if (!anyCtx.audioWorklet) {
    const p = Promise.resolve(false);
    _byCtx.set(ctx, p);
    return p;
  }
  const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }));
  const p = anyCtx.audioWorklet
    .addModule(url)
    .then(() => { URL.revokeObjectURL(url); return true; })
    .catch((e) => { URL.revokeObjectURL(url); console.warn('[signal-fx] addModule failed', e); return false; });
  _byCtx.set(ctx, p);
  return p;
}

/** The flavor enum, as the AudioParam sees it. Kept beside the processor that reads it. */
export const SAT_FLAVORS = ['warm', 'crunch', 'tape', 'fuzz'] as const;
export const satFlavorIndex = (name: string): number => {
  const i = (SAT_FLAVORS as readonly string[]).indexOf(name);
  return i < 0 ? 0 : i;
};
/** The mod-mode enum, in the seg's own order. */
export const MOD_MODES = ['phaser', 'flanger', 'doubler', 'chorus'] as const;
export const modModeIndex = (name: string): number => {
  const i = (MOD_MODES as readonly string[]).indexOf(name);
  return i < 0 ? 3 : i;
};
