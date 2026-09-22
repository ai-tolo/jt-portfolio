/* ============================================================================
 * AECore — shared audio-exhibit core (identical inline copy in both exhibits)
 *
 * Provides the validated BS.1770-4 meter math (matches ffmpeg ebur128 within
 * ~0.05 LU on real masters), a proper lookahead brickwall limiter (used live
 * via AudioWorklet AND offline on rendered buffers — single source of truth),
 * the iOS audio-unlock plumbing, an offline mastering-chain renderer (host.bake),
 * and a blind, loudness-matched A/B player.
 *
 * Exposes window.AECore = { createHost, meter:{...}, LIMITER_SRC, ... }.
 * ========================================================================== */
(function () {
  'use strict';

  // ======================================================================
  // 1. METER MATH  (ported verbatim from the ffmpeg-validated meter.mjs)
  // ======================================================================

  function kWeightCoeffs(fs) {
    // Stage 1: pre-filter high-shelf. Stage 2: RLB high-pass.
    // Coefficients recomputed for the ACTUAL sample rate (libebur128 method),
    // so they are correct at 44.1k as well as 48k.
    let f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
    let K = Math.tan(Math.PI * f0 / fs);
    const Vh = Math.pow(10.0, G / 20.0);
    const Vb = Math.pow(Vh, 0.4996667741545416);
    let a0 = 1.0 + K / Q + K * K;
    const s1 = {
      b0: (Vh + Vb * K / Q + K * K) / a0,
      b1: 2.0 * (K * K - Vh) / a0,
      b2: (Vh - Vb * K / Q + K * K) / a0,
      a1: 2.0 * (K * K - 1.0) / a0,
      a2: (1.0 - K / Q + K * K) / a0,
    };
    f0 = 38.13547087602444; Q = 0.5003270373238773;
    K = Math.tan(Math.PI * f0 / fs);
    a0 = 1.0 + K / Q + K * K;
    const s2 = {
      b0: 1.0, b1: -2.0, b2: 1.0,
      a1: 2.0 * (K * K - 1.0) / a0,
      a2: (1.0 - K / Q + K * K) / a0,
    };
    return [s1, s2];
  }

  function applyBiquad(x, c) {
    const { b0, b1, b2, a1, a2 } = c;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const x0 = x[i];
      const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x0; y2 = y1; y1 = y0;
      x[i] = y0;
    }
    return x;
  }

  function kWeight(channel, fs) {
    const [s1, s2] = kWeightCoeffs(fs);
    const out = new Float64Array(channel.length);
    for (let i = 0; i < channel.length; i++) out[i] = channel[i];
    applyBiquad(out, s1);
    applyBiquad(out, s2);
    return out;
  }

  function channelWeights(nch) {
    if (nch === 1) return [1.0];
    if (nch === 2) return [1.0, 1.0];
    const w = new Array(nch).fill(1.0);
    if (nch >= 5) { w[3] = 1.41; w[4] = 1.41; }
    return w;
  }

  // BS.1770-4 gated integrated loudness.
  function integratedLufs(channels, fs) {
    const nch = channels.length, G = channelWeights(nch);
    const weighted = channels.map((c) => kWeight(c, fs));
    const N = weighted[0].length;
    const blockLen = Math.round(0.4 * fs), step = Math.round(0.1 * fs);
    if (N < blockLen) return -Infinity;
    const nBlocks = Math.floor((N - blockLen) / step) + 1;
    const blockMS = [], blockL = new Float64Array(nBlocks);
    for (let j = 0; j < nBlocks; j++) {
      const start = j * step, ms = new Float64Array(nch);
      for (let ch = 0; ch < nch; ch++) {
        const w = weighted[ch]; let acc = 0;
        for (let i = start; i < start + blockLen; i++) acc += w[i] * w[i];
        ms[ch] = acc / blockLen;
      }
      blockMS.push(ms);
      let sum = 0; for (let ch = 0; ch < nch; ch++) sum += G[ch] * ms[ch];
      blockL[j] = sum > 0 ? -0.691 + 10 * Math.log10(sum) : -Infinity;
    }
    const absGate = -70.0, absKept = [];
    for (let j = 0; j < nBlocks; j++) if (blockL[j] >= absGate) absKept.push(j);
    if (!absKept.length) return -Infinity;
    const meanMS = new Float64Array(nch);
    for (const j of absKept) for (let ch = 0; ch < nch; ch++) meanMS[ch] += blockMS[j][ch];
    for (let ch = 0; ch < nch; ch++) meanMS[ch] /= absKept.length;
    let sumRel = 0; for (let ch = 0; ch < nch; ch++) sumRel += G[ch] * meanMS[ch];
    const relGate = -0.691 + 10 * Math.log10(sumRel) - 10.0;
    const meanMS2 = new Float64Array(nch); let count = 0;
    for (let j = 0; j < nBlocks; j++) {
      if (blockL[j] >= relGate && blockL[j] >= absGate) {
        for (let ch = 0; ch < nch; ch++) meanMS2[ch] += blockMS[j][ch];
        count++;
      }
    }
    if (!count) return -Infinity;
    for (let ch = 0; ch < nch; ch++) meanMS2[ch] /= count;
    let sumFinal = 0; for (let ch = 0; ch < nch; ch++) sumFinal += G[ch] * meanMS2[ch];
    return -0.691 + 10 * Math.log10(sumFinal);
  }

  // Ungated window loudness (400 ms = momentary, 3 s = short-term). For live meters.
  // Pre-K-weighted? No — weight here. For speed on tiny windows it's fine.
  function windowLoudness(channels, fs) {
    const nch = channels.length, G = channelWeights(nch);
    let sum = 0;
    for (let ch = 0; ch < nch; ch++) {
      const w = kWeight(channels[ch], fs); let acc = 0;
      for (let i = 0; i < w.length; i++) acc += w[i] * w[i];
      sum += G[ch] * (acc / w.length);
    }
    return sum > 0 ? -0.691 + 10 * Math.log10(sum) : -Infinity;
  }

  // 4x-oversampled true peak (dBTP) via polyphase windowed-sinc interpolation.
  let _tp = null;
  function buildPolyphase(L, tapsPerPhase) {
    const N = L * tapsPerPhase, center = (N - 1) / 2, h = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const x = (i - center) / L;
      const s = x === 0 ? 1.0 : Math.sin(Math.PI * x) / (Math.PI * x);
      const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)) +
                0.08 * Math.cos((4 * Math.PI * i) / (N - 1));
      h[i] = s * w;
    }
    const phases = [];
    for (let p = 0; p < L; p++) {
      const sub = []; for (let m = p; m < N; m += L) sub.push(h[m]);
      let sum = 0; for (const v of sub) sum += v;
      for (let k = 0; k < sub.length; k++) sub[k] /= sum;
      phases.push(sub);
    }
    return { L, phases, tapsPerPhase: phases[0].length };
  }
  function truePeakDbtp(channels, fs) {
    const L = 4;
    if (!_tp) _tp = buildPolyphase(L, 12);
    const { phases, tapsPerPhase } = _tp; let peak = 0;
    for (const ch of channels) {
      const n = ch.length;
      for (let i = 0; i < n; i++) {
        const a = Math.abs(ch[i]); if (a > peak) peak = a;
        for (let p = 1; p < L; p++) {
          const sub = phases[p]; let acc = 0;
          const base = i - (tapsPerPhase >> 1) + 1;
          for (let k = 0; k < tapsPerPhase; k++) {
            const idx = base + k;
            if (idx >= 0 && idx < n) acc += sub[k] * ch[idx];
          }
          const m = Math.abs(acc); if (m > peak) peak = m;
        }
      }
    }
    return peak > 0 ? 20 * Math.log10(peak) : -Infinity;
  }

  function crest(channels) {
    let peak = 0, sumsq = 0, n = 0;
    for (const ch of channels) {
      for (let i = 0; i < ch.length; i++) {
        const a = Math.abs(ch[i]); if (a > peak) peak = a;
        sumsq += ch[i] * ch[i]; n++;
      }
    }
    const rms = Math.sqrt(sumsq / n);
    const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    return { peakDb, rmsDb, crestDb: peakDb - rmsDb, crestRatio: rms > 0 ? peak / rms : Infinity };
  }

  function buffChannels(buf) {
    const chs = [];
    for (let c = 0; c < buf.numberOfChannels; c++) chs.push(buf.getChannelData(c));
    if (chs.length === 1) chs.push(chs[0]); // treat mono as dual for weighting parity
    return chs;
  }

  // ======================================================================
  // 2. LOOKAHEAD BRICKWALL LIMITER  (single source — page JS + worklet)
  // ======================================================================
  // Stereo-linked, true lookahead (gain reduced before the peak arrives via a
  // monotonic-deque sliding max over the lookahead window), program-dependent
  // release (deeper reduction releases slower to avoid pumping). Sample-domain
  // ceiling; inter-sample overs are intentionally allowed so the true-peak
  // meter can reveal them when pushed — that's part of the Loud Wars lesson.
  const LIMITER_SRC = `
class LookaheadLimiter {
  constructor(sampleRate, opts) {
    opts = opts || {};
    this.sr = sampleRate;
    this.ceiling = Math.pow(10, (opts.ceilingDb != null ? opts.ceilingDb : -1.0) / 20);
    this.la = Math.max(1, Math.round((opts.lookaheadMs != null ? opts.lookaheadMs : 2.0) * sampleRate / 1000));
    this.holdSamples = Math.round((opts.holdMs != null ? opts.holdMs : 3.0) * sampleRate / 1000);
    this.relFast = Math.exp(-1 / ((opts.relFastMs != null ? opts.relFastMs : 60) * sampleRate / 1000));
    this.relSlow = Math.exp(-1 / ((opts.relSlowMs != null ? opts.relSlowMs : 320) * sampleRate / 1000));
    this.dL = new Float32Array(this.la);
    this.dR = new Float32Array(this.la);
    this.dpos = 0;
    this.gain = 1;
    this.hold = 0;
    this.lastGR = 0;          // for telemetry (gain reduction in dB)
    // monotonic-decreasing RING deque of [absIndex, peak]; front = window max.
    // Window = the la+1 samples [n-la, n] (the lookahead region for the sample
    // about to be output, which is input[n-la]).
    this.cap = this.la + 2;
    this.dqIdx = new Int32Array(this.cap);
    this.dqVal = new Float32Array(this.cap);
    this.head = 0; this.tail = 0; this.count = 0;
    this.n = 0;
  }
  _pushPeak(peak) {
    // pop smaller-or-equal from back (maintain monotonic decrease)
    while (this.count > 0) {
      const back = (this.tail - 1 + this.cap) % this.cap;
      if (this.dqVal[back] <= peak) { this.tail = back; this.count--; } else break;
    }
    this.dqIdx[this.tail] = this.n;
    this.dqVal[this.tail] = peak;
    this.tail = (this.tail + 1) % this.cap; this.count++;
    // drop front samples that have fallen out of the [n-la, n] window
    while (this.count > 0 && this.dqIdx[this.head] < this.n - this.la) {
      this.head = (this.head + 1) % this.cap; this.count--;
    }
    return this.dqVal[this.head]; // current windowed max
  }
  // process one stereo sample pair, write result into out[0],out[1]
  processSample(l, r, out) {
    const peak = Math.max(Math.abs(l), Math.abs(r));
    const wmax = this._pushPeak(peak);
    const target = wmax > this.ceiling ? this.ceiling / wmax : 1;
    if (target < this.gain) {
      this.gain = target;            // attack: lookahead lets us snap on a quiet sample
      this.hold = this.holdSamples;
    } else if (this.hold > 0) {
      this.hold--;
    } else {
      // program-dependent release: deeper GR -> slower coefficient
      const grDb = -20 * Math.log10(this.gain || 1e-9);
      const t = Math.min(1, grDb / 6);
      const coef = this.relFast + (this.relSlow - this.relFast) * t;
      this.gain = target + (this.gain - target) * coef;
    }
    this.lastGR = -20 * Math.log10(this.gain || 1e-9);
    // delayed output
    const oL = this.dL[this.dpos], oR = this.dR[this.dpos];
    this.dL[this.dpos] = l; this.dR[this.dpos] = r;
    this.dpos = (this.dpos + 1) % this.la;
    this.n++;
    out[0] = oL * this.gain;
    out[1] = oR * this.gain;
  }
}`;
  // page-side class (single source of truth, shared with the worklet string)
  const LookaheadLimiter = new Function(LIMITER_SRC + '\nreturn LookaheadLimiter;')();

  // Apply the limiter to a rendered AudioBuffer, returning a NEW AudioBuffer.
  function limitBuffer(ctx, buf, opts) {
    const lim = new LookaheadLimiter(buf.sampleRate, opts);
    const n = buf.length;
    const L = buf.getChannelData(0);
    const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
    const out = ctx.createBuffer(2, n, buf.sampleRate);
    const oL = out.getChannelData(0), oR = out.getChannelData(1);
    const tmp = [0, 0];
    for (let i = 0; i < n; i++) {
      lim.processSample(L[i], R[i], tmp);
      oL[i] = tmp[0]; oR[i] = tmp[1];
    }
    return out;
  }

  // ======================================================================
  // 3. WORKLET (live limiter + post-limiter telemetry to main thread)
  // ======================================================================
  function workletSource() {
    return LIMITER_SRC + `
class LimiterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() { return []; }
  constructor(opts) {
    super();
    const o = (opts && opts.processorOptions) || {};
    this.lim = new LookaheadLimiter(sampleRate, o);
    this.bypass = false;
    this.grPeak = 0;
    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === 'set' && d.limiter) this.lim = new LookaheadLimiter(sampleRate, d.limiter);
      if (d.type === 'bypass') this.bypass = !!d.value;
    };
    this.frame = 0;
  }
  process(inputs, outputs) {
    const inp = inputs[0], out = outputs[0];
    if (!inp || inp.length === 0) return true;
    const inL = inp[0], inR = inp.length > 1 ? inp[1] : inp[0];
    const outL = out[0], outR = out.length > 1 ? out[1] : out[0];
    const tmp = [0, 0];
    const N = outL.length;
    for (let i = 0; i < N; i++) {
      if (this.bypass) { outL[i] = inL[i]; if (outR !== outL) outR[i] = inR[i]; continue; }
      this.lim.processSample(inL[i], inR[i], tmp);
      outL[i] = tmp[0];
      if (outR !== outL) outR[i] = tmp[1];
      if (this.lim.lastGR > this.grPeak) this.grPeak = this.lim.lastGR;
    }
    // report gain reduction ~ every block
    this.frame++;
    this.port.postMessage({ gr: this.grPeak });
    this.grPeak = 0;
    return true;
  }
}
registerProcessor('ae-limiter', LimiterProcessor);
`;
  }

  // ======================================================================
  // 4. iOS unlock helpers
  // ======================================================================
  function silentWavDataUri(seconds, amp, sr) {
    sr = sr || 44100;
    const n = Math.floor(seconds * sr);
    const bytes = 44 + n * 2;
    const ab = new ArrayBuffer(bytes);
    const dv = new DataView(ab);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); dv.setUint32(4, bytes - 8, true); ws(8, 'WAVE');
    ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true);
    dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    ws(36, 'data'); dv.setUint32(40, n * 2, true);
    // near-silent dithered tone so iOS treats it as active media playback
    const a = Math.max(1, Math.round((amp || 0.00025) * 32767));
    for (let i = 0; i < n; i++) {
      const v = Math.round(Math.sin(i * 0.02) * a);
      dv.setInt16(44 + i * 2, v, true);
    }
    let bin = '';
    const u8 = new Uint8Array(ab);
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return 'data:audio/wav;base64,' + btoa(bin);
  }

  // ======================================================================
  // 5. HOST factory
  // ======================================================================
  async function createHost(opts) {
    opts = opts || {};
    const AC = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AC();
    const sr = audioCtx.sampleRate;

    const master = audioCtx.createGain();
    master.gain.value = opts.masterGain != null ? opts.masterGain : 0.9;
    master.connect(audioCtx.destination);

    // load worklet module
    let workletReady = false;
    try {
      const blob = new Blob([workletSource()], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await audioCtx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      workletReady = true;
    } catch (e) { console.warn('worklet load failed', e); }

    // decode assets
    const assets = {};
    const urls = opts.assetUrls || {};
    await Promise.all(Object.keys(urls).map(async (name) => {
      try {
        const res = await fetch(urls[name]);
        const ab = await res.arrayBuffer();
        assets[name] = await audioCtx.decodeAudioData(ab);
      } catch (e) { console.warn('asset load failed: ' + name, e); }
    }));

    // iOS keepalive
    let keepSrc = null, mediaEl = null;
    function unlock() {
      if (audioCtx.state !== 'running') audioCtx.resume();
      if (!keepSrc) {
        const b = audioCtx.createBuffer(1, sr, sr); // 1s of zeros
        keepSrc = audioCtx.createBufferSource();
        keepSrc.buffer = b; keepSrc.loop = true;
        keepSrc.connect(audioCtx.destination);
        try { keepSrc.start(); } catch (e) {}
      }
      if (!mediaEl) {
        mediaEl = new Audio();
        mediaEl.src = silentWavDataUri(1.0, 0.0003, 44100);
        mediaEl.loop = true; mediaEl.playsInline = true; mediaEl.setAttribute('playsinline', '');
        mediaEl.volume = 1.0;
        mediaEl.play().catch(() => {});
      }
    }

    function lufs(buf) { return integratedLufs(buffChannels(buf), buf.sampleRate); }
    function matchGain(buf, targetLufs) {
      const l = lufs(buf);
      if (!isFinite(l)) return 1;
      return Math.pow(10, (targetLufs - l) / 20);
    }
    function asset(name) { return assets[name] || null; }

    async function bake(buildGraph, seconds) {
      const len = Math.max(1, Math.ceil(seconds * sr));
      const oc = new OfflineAudioContext(2, len, sr);
      // worklet available offline too (some exhibits limit inside the graph)
      try {
        const blob = new Blob([workletSource()], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await oc.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
      } catch (e) {}
      await buildGraph(oc);
      return await oc.startRendering();
    }

    function makeLimiterNode(limiterOpts) {
      if (!workletReady) return null;
      return new AudioWorkletNode(audioCtx, 'ae-limiter', {
        numberOfInputs: 1, numberOfOutputs: 1,
        outputChannelCount: [2],
        processorOptions: limiterOpts || {},
      });
    }

    function bufferFrom(channels, length) {
      const buf = audioCtx.createBuffer(channels.length, length, sr);
      for (let c = 0; c < channels.length; c++) buf.copyToChannel(channels[c], c);
      return buf;
    }

    function destroy() {
      try { if (keepSrc) keepSrc.stop(); } catch (e) {}
      keepSrc = null;
      if (mediaEl) { try { mediaEl.pause(); } catch (e) {} mediaEl.src = ''; mediaEl = null; }
      try { audioCtx.close(); } catch (e) {}
    }

    return {
      audioCtx, master, sampleRate: sr, workletReady,
      bake, lufs, matchGain, asset, assets,
      unlock, destroy, makeLimiterNode, bufferFrom,
      limitBuffer: (buf, o) => limitBuffer(audioCtx, buf, o),
    };
  }

  // ======================================================================
  // 6. BLIND, loudness-matched A/B player
  // ======================================================================
  // Two buffers played in lock-step through matched gains; a selector picks
  // which is audible. Position-matched instant switching. Slot order randomized;
  // mapping hidden until choose().
  function createBlindAB(host, bufX, bufY, targetLufs, seed) {
    const ctx = host.audioCtx;
    const gX = host.matchGain(bufX, targetLufs);
    const gY = host.matchGain(bufY, targetLufs);
    // randomize which buffer sits in slot 1 vs 2
    const rnd = seed != null ? mulberry32(seed)() : Math.random();
    const flip = rnd < 0.5;
    const slot1 = flip ? { buf: bufY, g: gY, id: 'Y' } : { buf: bufX, g: gX, id: 'X' };
    const slot2 = flip ? { buf: bufX, g: gX, id: 'X' } : { buf: bufY, g: gY, id: 'Y' };

    let s1, s2, gain1, gain2, sel = 1, playing = false, startedAt = 0, offset = 0;

    function build() {
      s1 = ctx.createBufferSource(); s1.buffer = slot1.buf; s1.loop = true;
      s2 = ctx.createBufferSource(); s2.buffer = slot2.buf; s2.loop = true;
      gain1 = ctx.createGain(); gain2 = ctx.createGain();
      gain1.gain.value = slot1.g * (sel === 1 ? 1 : 0);
      gain2.gain.value = slot2.g * (sel === 2 ? 1 : 0);
      s1.connect(gain1).connect(host.master);
      s2.connect(gain2).connect(host.master);
    }
    function play() {
      if (playing) return;
      build();
      const t = ctx.currentTime + 0.02;
      s1.start(t, offset % slot1.buf.duration);
      s2.start(t, offset % slot2.buf.duration);
      startedAt = t; playing = true;
    }
    function select(s) {
      sel = s;
      if (!playing) return;
      const t = ctx.currentTime;
      const tc = 0.012;
      gain1.gain.setTargetAtTime(slot1.g * (sel === 1 ? 1 : 0), t, tc);
      gain2.gain.setTargetAtTime(slot2.g * (sel === 2 ? 1 : 0), t, tc);
    }
    function stop() {
      if (!playing) return;
      offset += ctx.currentTime - startedAt;
      try { s1.stop(); s2.stop(); } catch (e) {}
      playing = false;
    }
    function whichIs(slotNo) { return slotNo === 1 ? slot1.id : slot2.id; }
    return {
      play, stop, select,
      get selected() { return sel; },
      get isPlaying() { return playing; },
      gains: { X: gX, Y: gY },
      // reveal which logical buffer (X/Y) is in each slot
      slot1Id: slot1.id, slot2Id: slot2.id, whichIs,
    };
  }

  // ======================================================================
  // 7. Waveshaper curves (soft-knee clipper / saturator) — used live + offline
  // ======================================================================
  // Soft-knee clipper: linear below (clipCeil-knee), smooth parabolic knee,
  // caps at clipCeil. Validated to give the loudness-war curve (clean at rest,
  // LUFS climbs while crest collapses as drive increases).
  function softClipCurve(clipCeil, knee, n) {
    n = n || 8192; clipCeil = clipCeil != null ? clipCeil : 1.0; knee = knee != null ? knee : 0.18;
    const curve = new Float32Array(n);
    const k = clipCeil - knee;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1; // -1..1
      const a = Math.abs(x);
      let y;
      if (a <= k) y = a;
      else if (a >= clipCeil + knee) y = clipCeil;
      else { const tt = a - k; y = a - (tt * tt) / (4 * knee); if (y > clipCeil) y = clipCeil; }
      curve[i] = Math.sign(x) * y;
    }
    return curve;
  }

  // tanh saturator curve with drive (harmonic excitement) for Overfit's genome.
  function satCurve(drive, n) {
    n = n || 8192; drive = Math.max(0.0001, drive);
    const curve = new Float32Array(n);
    const norm = Math.tanh(drive); // so curve(±1) ~ ±1
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(drive * x) / norm;
    }
    return curve;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.AECore = {
    createHost, createBlindAB,
    meter: { integratedLufs, windowLoudness, truePeakDbtp, crest, kWeight, buffChannels },
    LookaheadLimiter, limitBuffer, mulberry32,
    softClipCurve, satCurve,
    LIMITER_SRC,
  };
})();
