// SIGNAL · lane O · THE ONE EXIT. Everything the instrument makes leaves through here, and nothing else in
// src/signal touches ctx.destination. The Studio's master chain, stage for stage (E-effects-out.md §5):
//
//   keys glue → glueMakeup ─┐  (effects.ts)
//   bass + SUB exciter ─────┴→ duck ──┐              the kick sidechain; effects.duckHit books its envelope
//   drums ──────────────────→ drumsIn ┴→ preLimit .92 → masterHP 20 Hz (Q −3.01 dB) → soft tanh(1.12x) 2×
//     → limiter (−1.5 dB, knee 0, 20:1, 2 ms / 90 ms) → trim ¼ → clamp curve ─┬→ destination   (or the sink when muted)
//                                                                              └→ split → analyser L, analyser R → sink
//
// from signal-studio-v6lib/src/engine/core.ts:355-369, 585-611 (2a9e4a7) — the chain, ADAPTED: one exit, no voiceBus,
//   no masterTap, no LIFT (E §5 RECOMMEND); duck + drumsIn + preLimit are FORCED STEREO (2 / explicit / speakers, the
//   page's out.ts:152-158 law) so a mono source upstream is L = R and the level pair always reads two channels.
// from signal-studio-v6lib/src/engine/final-out.ts:77-127, 156-171 (2a9e4a7) — the clamp, VERBATIM, inline (one route:
//   the WeakMap multi-route layer is dropped, E §5).
// from signal-studio-page/src/page/out.ts:187-200, 365-371 (67b6b58) — the level pair, ADAPTED: read POST-clamp (what
//   leaves) and returned as linear { peak, rms }: rms over the whole ~85 ms window (4096 at 48 k: a steady meter), peak
//   over its latest ~21 ms (1024). Measured in headless Chrome, a master stop takes the output under −90 dBFS 76-96 ms
//   after it (the voices' 30 ms + the returns' 15 ms + the chain's own ring); an 85 ms peak window would only report
//   that at ~180 ms, past the gate's 150.
// DROPPED from the page (E §8): setSinkId, enumerateDevices, the getUserMedia label grant (a mic prompt for a visitor),
//   the alt route, the 4-channel wiring and the mix tap.
//
// MUTE (?mute=1): the clamp's output lands on a 0-gain SINK instead of the destination. The sink is always wired into
// the destination (the analysers hang on it too), so every engine keeps pulling the whole chain and level() keeps
// reading while nothing reaches the speakers.
//
// EXTRA (not in the frozen SignalOut, additive): `post` = the clamp's output node (post-clamp, pre-mute): a place for
// the test surface to hang a probe beside the analysers.

import type { OutDeps, SignalOut } from './types.ts';

// ─────────────────────────────────────────────────────────────── the clamp curve (final-out.ts, verbatim)
// from signal-studio-v6lib/src/engine/final-out.ts:77-127 (2a9e4a7) — VERBATIM

/** where the curve stops being the identity — 10^(−3/20), i.e. exactly −3.00 dBFS */
export const CLAMP_KNEE = 0.7079457843841379;
/** what it asymptotes to. Under `SAFE_PEAK` (0.966) on purpose: the monitor's ceiling may not be
 *  mistaken for the delivery's, and 0.995 is a DAC limit rather than a mastering decision. */
export const CLAMP_CEIL = 0.995;
/** the shaper's input domain, in real signal units: ±4.0 is ±12 dBFS of headroom over full scale */
export const CLAMP_DOMAIN = 4;
/** curve points. 8192 over ±4 is a step of ~0.001 — and in the linear region the step size does not
 *  matter at all, because the interpolation is exact there. */
export const CLAMP_POINTS = 8192;

/** The soft clamp, as a pure function of one sample. Exported so the suites can assert the shape
 *  without a WaveShaper, and so the curve below and the reference are the same arithmetic. */
export function clampSample(x: number): number {
  const a = Math.abs(x);
  if (a <= CLAMP_KNEE) return x;
  const r = CLAMP_CEIL - CLAMP_KNEE;
  const y = CLAMP_KNEE + r * Math.tanh((a - CLAMP_KNEE) / r);
  return x < 0 ? -y : y;
}

/** The WaveShaper curve: `clampSample` sampled over the shaper's own [−1, 1] input domain, which
 *  represents real values in [−CLAMP_DOMAIN, CLAMP_DOMAIN]. */
export function clampCurve(points = CLAMP_POINTS) {
  const n = Math.max(2, Math.floor(points));
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;          // the shaper's input, [−1, 1]
    c[i] = clampSample(u * CLAMP_DOMAIN);     // the value that input stands for
  }
  return c;
}

/**
 * WHAT A WAVESHAPER WOULD DO TO ONE SAMPLE, in arithmetic — the spec's own mapping: the input is
 * clamped to [−1, 1], scaled to a curve index, and read with LINEAR interpolation between the two
 * neighbouring points.
 */
export function shapeThrough(curve: ArrayLike<number>, x: number, domain = CLAMP_DOMAIN): number {
  const u = Math.max(-1, Math.min(1, x / domain));
  const n = curve.length;
  const pos = ((u + 1) / 2) * (n - 1);
  const i = Math.floor(pos);
  if (i >= n - 1) return curve[n - 1];
  const f = pos - i;
  return curve[i] * (1 - f) + curve[i + 1] * f;
}

// ─────────────────────────────────────────────────────────────── the soft stage
// from signal-studio-v6lib/src/engine/dsp.ts:151-159 (2a9e4a7) — VERBATIM
export function softCurve() {
  const n = 1024,
    c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * 1.12);
  }
  return c;
}

// ─────────────────────────────────────────────────────────────── the master constants (core.ts:366-368, 598)
export const PRE_LIMIT = 0.92;
export const MASTER_HP_HZ = 20;
export const MASTER_HP_Q = -3.01;            // dB (the W56 unit fix: Butterworth-flat, no 20 Hz bell)
export const LIMITER = { threshold: -1.5, knee: 0, ratio: 20, attack: 0.002, release: 0.09 } as const;

/** SignalOut plus the one additive member (see the header). */
export interface SignalOutNode extends SignalOut {
  /** The clamp's output: what leaves, post-clamp and pre-mute. */
  post: AudioNode;
}

/** Linear (0..1 full scale; dBFS = 20·log10(x)) RMS over the whole window of both channels, and the peak over its
 *  latest `peakSamples` (default: all of it). */
export function levelOf(l: ArrayLike<number>, r: ArrayLike<number>, peakSamples = Infinity): { peak: number; rms: number } {
  let peak = 0, s = 0;
  const n = Math.min(l.length, r.length);
  const from = Math.max(0, n - peakSamples);
  for (let i = 0; i < n; i++) {
    const a = l[i], b = r[i];
    s += a * a + b * b;
    if (i < from) continue;
    const m = Math.max(Math.abs(a), Math.abs(b));
    if (m > peak) peak = m;
  }
  const rms = n > 0 ? Math.sqrt(s / (2 * n)) : 0;
  return { peak: Number.isFinite(peak) ? peak : 0, rms: Number.isFinite(rms) ? rms : 0 };
}

export function createOut(d: OutDeps): SignalOutNode {
  const { ctx } = d;
  const isMuted = !!d.muted;
  const stereo = (g: GainNode): GainNode => {
    g.channelCount = 2;
    g.channelCountMode = 'explicit';
    g.channelInterpretation = 'speakers';
    return g;
  };

  const duck = stereo(ctx.createGain()); duck.gain.value = 1;
  const drumsIn = stereo(ctx.createGain()); drumsIn.gain.value = 1;
  const preLimit = stereo(ctx.createGain()); preLimit.gain.value = PRE_LIMIT;
  const masterHP = ctx.createBiquadFilter();
  masterHP.type = 'highpass'; masterHP.frequency.value = MASTER_HP_HZ; masterHP.Q.value = MASTER_HP_Q;
  const soft = ctx.createWaveShaper(); soft.curve = softCurve(); soft.oversample = '2x';
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = LIMITER.threshold; limiter.knee.value = LIMITER.knee; limiter.ratio.value = LIMITER.ratio;
  limiter.attack.value = LIMITER.attack; limiter.release.value = LIMITER.release;

  // The clamp (final-out.ts:159-172): into the shaper's own domain, the curve, no oversampling (the exact identity
  // below the knee). If a WaveShaper cannot be built the stage is a unity pass-through: an output guard may not be the
  // thing that stops the instrument making sound.
  const trim = ctx.createGain();
  trim.gain.value = 1 / CLAMP_DOMAIN;
  let post: AudioNode = trim;
  try {
    const shaper = ctx.createWaveShaper();
    shaper.curve = clampCurve();
    shaper.oversample = 'none';
    trim.connect(shaper);
    post = shaper;
  } catch {
    trim.gain.value = 1;
  }

  duck.connect(preLimit);
  drumsIn.connect(preLimit);
  preLimit.connect(masterHP);
  masterHP.connect(soft);
  soft.connect(limiter);
  limiter.connect(trim);

  // The sink: 0 gain, always into the destination, so every engine pulls the analysers (and, muted, the chain).
  const sink = ctx.createGain();
  sink.gain.value = 0;
  sink.connect(ctx.destination);

  // The level pair, post-clamp, per channel (a mono analyser would read a hard-panned source at half level), about
  // 100 ms of time-domain samples (4096 at 48 k) for the RMS; the peak reads the latest ~20 ms of them (1024).
  const fft = 2 ** Math.round(Math.log2(Math.max(256, ctx.sampleRate * 0.1)));
  const peakN = Math.min(fft, 2 ** Math.round(Math.log2(Math.max(128, ctx.sampleRate * 0.02))));
  const split = ctx.createChannelSplitter(2);
  const anL = ctx.createAnalyser();
  const anR = ctx.createAnalyser();
  anL.fftSize = fft;
  anR.fftSize = fft;
  const bufL = new Float32Array(fft);
  const bufR = new Float32Array(fft);
  const wireLevel = (): void => {
    post.connect(split);
    split.connect(anL, 0);
    split.connect(anR, 1);
    anL.connect(sink);
    anR.connect(sink);
  };
  wireLevel();
  post.connect(isMuted ? sink : ctx.destination);

  return {
    ctx,
    duck,
    drumsIn,
    post,
    level(): { peak: number; rms: number } {
      try {
        anL.getFloatTimeDomainData(bufL);
        anR.getFloatTimeDomainData(bufR);
      } catch {
        return { peak: 0, rms: 0 };
      }
      return levelOf(bufL, bufR, peakN);
    },
    muted: (): boolean => isMuted,
    panic(): void {
      // Nothing ramps here (the modules do). Re-assert the two guarantees: the analysers are wired and reading
      // (connect is idempotent), and a muted page reaches the speakers through nothing but the 0-gain sink.
      try {
        sink.gain.cancelScheduledValues(0);
        sink.gain.value = 0;
      } catch { /* a closed context */ }
      try { wireLevel(); } catch { /* a closed context */ }
      if (isMuted) {
        try { post.disconnect(ctx.destination); } catch { /* never was: the normal case */ }
        try { post.connect(sink); } catch { /* a closed context */ }
      }
    },
  };
}
