// SIGNAL · lane K · filter.test.mjs — THE PAGE's filter suite, PORTED WHOLE: all 56 checks are the page's own, run
// against src/signal/filter.ts (verbatim) and src/signal/types.ts (FILTER_OPEN 0.995, 40 Hz .. 20 kHz). Its imports
// already named ./filter.ts and ./types.ts; here they resolve bare (the portfolio's filter.ts imports ./types.ts, so
// no loader). One block is new (the contract's createFilter, at the end).
//   source ~/.nvm/nvm.sh && node src/signal/filter.test.mjs      (exit 0 = green; prints filter: N/N)
// ═══ from signal-studio-page/src/page/filter.test.mjs:1-205 (67b6b58) — unchanged ═══
// THE PAGE · the one low-pass (src/page/filter.ts). The corner law, the bypass threshold, the slope
// proven through the Web Audio spec's OWN lowpass coefficient formula (so "24 dB/oct Butterworth"
// is a measurement of the Q pair the file ships, not a claim), and the graph law — built once,
// never re-patched, the bypass reached by ramps that land exactly — walked on a recording fake.
// The browser half (an OfflineAudioContext: p = 0.4 → highs down ≥ 30 dB, p = 1 → bit-identical)
// is the gate's (scripts/qa-page.mjs S3).
//   source ~/.nvm/nvm.sh; node --import ./src/capture/esbuild-loader.mjs src/page/filter.test.mjs
import {
  filterHz, isBypass, clampP, createPageFilter,
  BUTTERWORTH_Q, BUTTERWORTH_Q_DB, FILTER_TAU, BYPASS_FADE_SEC,
} from './filter.ts';
import { FILTER_OPEN, FILTER_MIN_HZ, FILTER_MAX_HZ } from './types.ts';

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${extra}`); }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const db = (x) => 20 * Math.log10(x);

// ── the spec's lowpass (Web Audio §BiquadFilterNode: Q in dB for lowpass) ──────────────────────
function lowpassCoefs(f0, qDb, sr) {
  const w0 = (2 * Math.PI * f0) / sr;
  const alpha = Math.sin(w0) / (2 * 10 ** (qDb / 20));
  const c = Math.cos(w0);
  return { b0: (1 - c) / 2, b1: 1 - c, b2: (1 - c) / 2, a0: 1 + alpha, a1: -2 * c, a2: 1 - alpha };
}
/** |H(e^jw)| of one biquad at f. */
function mag(k, f, sr) {
  const w = (2 * Math.PI * f) / sr;
  const re = (b0, b1, b2) => b0 + b1 * Math.cos(-w) + b2 * Math.cos(-2 * w);
  const im = (b0, b1, b2) => b1 * Math.sin(-w) + b2 * Math.sin(-2 * w);
  const nr = re(k.b0, k.b1, k.b2), ni = im(k.b0, k.b1, k.b2);
  const dr = re(k.a0, k.a1, k.a2), di = im(k.a0, k.a1, k.a2);
  return Math.hypot(nr, ni) / Math.hypot(dr, di);
}
/** The shipped cascade's gain at f for a corner fc. */
const cascade = (fc, f, sr = 48000, qs = BUTTERWORTH_Q_DB) =>
  qs.reduce((g, q) => g * mag(lowpassCoefs(fc, q, sr), f, sr), 1);

console.log('\n[filter] the corner law');
{
  ok('p = 0 → the 40 Hz floor', near(filterHz(0), FILTER_MIN_HZ, 1e-9) && FILTER_MIN_HZ === 40);
  ok('p = 1 → 20 kHz', near(filterHz(1), FILTER_MAX_HZ, 1e-6) && FILTER_MAX_HZ === 20000);
  ok('p = 0.5 → the geometric mean (exponential, not linear)', near(filterHz(0.5), Math.sqrt(40 * 20000), 1e-6), `${filterHz(0.5)}`);
  let mono = true;
  for (let i = 1; i <= 200; i++) if (!(filterHz(i / 200) > filterHz((i - 1) / 200))) mono = false;
  ok('strictly rising across the sweep', mono);
  ok('equal travel = equal octaves (0.1 of travel ≈ 0.9 oct)',
    near(Math.log2(filterHz(0.3) / filterHz(0.2)), Math.log2(500) / 10, 1e-9));
  ok('clamped outside 0..1', filterHz(-2) === filterHz(0) && filterHz(7) === filterHz(1));
  ok('a NaN reads as fully open (the safe end)', clampP(NaN) === 1 && filterHz(NaN) === filterHz(1));
  ok('p = 0.4 sits near 480 Hz', near(filterHz(0.4), 480.4, 1), `${filterHz(0.4).toFixed(1)}`);
}

console.log('\n[filter] the bypass threshold');
{
  ok('FILTER_OPEN is 0.995 (the contract)', FILTER_OPEN === 0.995);
  ok('0.994 still filters', isBypass(0.994) === false);
  ok('0.995 is the bypass', isBypass(0.995) === true);
  ok('1 is the bypass', isBypass(1) === true);
  ok('past 1 clamps into the bypass', isBypass(1.3) === true);
  ok('0 filters', isBypass(0) === false);
  ok('the corner just under the threshold is ~19.4 kHz (the legs nearly agree at the crossing)',
    near(filterHz(0.9949), 19400, 150), `${filterHz(0.9949).toFixed(0)}`);
}

console.log('\n[filter] the slope, through the spec\'s own coefficients');
{
  ok('Q pair is the 4th-order Butterworth pole pair', near(BUTTERWORTH_Q[0], 0.5412, 1e-4) && near(BUTTERWORTH_Q[1], 1.3066, 1e-4));
  ok('…written in dB as types.ts states (−5.33, +2.32)',
    near(BUTTERWORTH_Q_DB[0], -5.33, 0.01) && near(BUTTERWORTH_Q_DB[1], 2.32, 0.01), BUTTERWORTH_Q_DB.join(', '));
  const sr = 48000;
  for (const fc of [200, 1000, 4000]) {
    ok(`fc ${fc}: −3.01 dB at the corner`, near(db(cascade(fc, fc, sr)), -3.0103, 0.02), `${db(cascade(fc, fc, sr)).toFixed(3)}`);
    ok(`fc ${fc}: unity in the passband (fc/10)`, near(db(cascade(fc, fc / 10, sr)), 0, 0.01));
  }
  // An octave up is the analog −24.1 dB low in the band; toward Nyquist the bilinear map only ever
  // makes the digital section STEEPER (its zeros sit at Nyquist), never shallower.
  for (const fc of [200, 1000]) {
    ok(`fc ${fc}: ≈ −24 dB one octave up`, near(db(cascade(fc, 2 * fc, sr)), -24.1, 0.5), `${db(cascade(fc, 2 * fc, sr)).toFixed(2)}`);
  }
  ok('fc 4000: at least 24 dB down an octave up (steeper near Nyquist, never shallower)',
    db(cascade(4000, 8000, sr)) <= -24, `${db(cascade(4000, 8000, sr)).toFixed(2)}`);
  let peak = 0;
  for (let f = 5; f < 23900; f *= 1.01) peak = Math.max(peak, cascade(1000, f, sr));
  ok('maximally flat: the cascade never rises above 0 dB (no bump at the corner)', peak <= 1 + 1e-9, `${db(peak)}`);
  const slope = db(cascade(100, 800, sr)) - db(cascade(100, 1600, sr));
  ok('an octave well above the corner costs 24 dB (24 dB/oct)', near(slope, 24, 0.3), `${slope.toFixed(2)}`);
  ok('p = 0.4: 4 kHz is down far more than the gate\'s 30 dB', db(cascade(filterHz(0.4), 4000, sr)) < -60, `${db(cascade(filterHz(0.4), 4000, sr)).toFixed(1)}`);
  const raw = db(cascade(1000, 1000, sr, BUTTERWORTH_Q));
  ok('the trap it avoids: the linear Qs written raw would sit the corner PROUD (+1.8 dB)', near(raw, 1.85, 0.05), `${raw.toFixed(2)}`);
}

// ── a recording fake context: every connect/disconnect and every automation call ───────────────
function fakeCtx({ sr = 48000, hold = true } = {}) {
  const tally = { connects: 0, disconnects: 0 };
  const param = (v) => {
    const p = {
      value: v, ev: [],
      setTargetAtTime(x, t, tau) { this.ev.push(['target', x, t, tau]); return this; },
      linearRampToValueAtTime(x, t) { this.ev.push(['ramp', x, t]); return this; },
      cancelScheduledValues(t) { this.ev.push(['cancel', t]); return this; },
      setValueAtTime(x, t) { this.ev.push(['set', x, t]); return this; },
    };
    if (hold) p.cancelAndHoldAtTime = function (t) { this.ev.push(['hold', t]); return this; };
    return p;
  };
  const node = (kind) => ({
    kind, out: [],
    connect(n) { tally.connects++; this.out.push(n); return n; },
    disconnect() { tally.disconnects++; this.out = []; },
  });
  return {
    tally, sampleRate: sr, currentTime: 2.5,
    createGain() { const n = node('gain'); n.gain = param(1); return n; },
    createBiquadFilter() { const n = node('biquad'); n.type = 'peaking'; n.frequency = param(350); n.Q = param(1); return n; },
  };
}

console.log('\n[filter] the graph: two legs, built once');
{
  const ctx = fakeCtx();
  const f = createPageFilter(ctx);
  const [dry, bq1] = f.input.out;
  const bq2 = bq1.out[0], wet = bq2.out[0];
  ok('input fans to exactly two legs', f.input.out.length === 2 && dry.kind === 'gain' && bq1.kind === 'biquad');
  ok('dry leg → output', dry.out.length === 1 && dry.out[0] === f.output);
  ok('filtered leg: bq → bq → wet → output', bq2.kind === 'biquad' && wet.kind === 'gain' && wet.out[0] === f.output);
  ok('both biquads are lowpass with the Butterworth dB Qs',
    bq1.type === 'lowpass' && bq2.type === 'lowpass' && bq1.Q.value === BUTTERWORTH_Q_DB[0] && bq2.Q.value === BUTTERWORTH_Q_DB[1]);
  ok('default p0 = 1: born bypassed as VALUES (dry 1, wet 0, no automation)',
    f.get() === 1 && dry.gain.value === 1 && wet.gain.value === 0 && dry.gain.ev.length === 0 && wet.gain.ev.length === 0);
  ok('…input and output at unity (x·1 + y·0 is x to the bit)', f.input.gain.value === 1 && f.output.gain.value === 1);
  ok('hz() = Infinity when bypassed', f.hz() === Infinity);
  const wired = { ...ctx.tally };

  f.set(0.4);
  const t = ctx.currentTime;
  const last = (p) => p.ev[p.ev.length - 1];
  ok('set(0.4): both corners glide to filterHz(0.4) with τ 15 ms from now',
    [bq1, bq2].every((b) => { const e = last(b.frequency); return e[0] === 'target' && near(e[1], filterHz(0.4), 1e-9) && e[2] === t && e[3] === FILTER_TAU; }));
  // The PIN is load-bearing (R1 review): cancelAndHoldAtTime inserts nothing when no event follows t
  // (the Web Audio algorithm), so without an explicit set at t the ramp would start from the LAST
  // crossing's end and every crossing after the first would be an instant switch between the legs.
  ok('…the legs cross: hold, PIN (an explicit set at now, from the current value), then a LINEAR ramp over 10 ms landing exactly on 0 / 1',
    dry.gain.ev.map((e) => e[0]).join(',') === 'hold,set,ramp' && dry.gain.ev[1][1] === 1 && dry.gain.ev[1][2] === t
    && dry.gain.ev[2][1] === 0 && near(dry.gain.ev[2][2], t + BYPASS_FADE_SEC, 1e-12)
    && wet.gain.ev.map((e) => e[0]).join(',') === 'hold,set,ramp' && wet.gain.ev[1][1] === 0 && wet.gain.ev[2][1] === 1);
  ok('…hz() = filterHz(0.4), get() = 0.4', near(f.hz(), filterHz(0.4), 1e-9) && f.get() === 0.4);

  const before = dry.gain.ev.length;
  f.set(0.5); f.set(0.51); f.set(0.2);
  ok('moves under the threshold write only the corner (no leg fades)', dry.gain.ev.length === before && wet.gain.ev.length === before);
  ok('…each one a fresh glide target', last(bq1.frequency)[0] === 'target' && near(last(bq1.frequency)[1], filterHz(0.2), 1e-9));

  f.set(0.999);
  ok('crossing back up: the dry leg ramps to exactly 1, the filtered leg to exactly 0',
    last(dry.gain)[0] === 'ramp' && last(dry.gain)[1] === 1 && last(wet.gain)[1] === 0);
  ok('…bypassed: hz() = Infinity', f.hz() === Infinity);
  ok('…while bypassed the corners still follow the hand (≈ 20 k)', near(last(bq1.frequency)[1], filterHz(0.999), 1e-6));
  f.set(1);
  ok('staying in the bypass fades nothing', last(dry.gain)[1] === 1 && dry.gain.ev.filter((e) => e[0] === 'ramp').length === 2);

  const n = bq1.frequency.ev.length;
  f.set(NaN); f.set(Infinity);
  ok('a non-finite position moves nothing', bq1.frequency.ev.length === n && f.get() === 1);
  f.set(-3);
  ok('negative clamps to 0 (the floor)', f.get() === 0 && near(last(bq1.frequency)[1], 40, 1e-9));

  ok('NEVER RE-PATCHED: zero connects/disconnects across every set()',
    ctx.tally.connects === wired.connects && ctx.tally.disconnects === wired.disconnects, JSON.stringify(ctx.tally));

  f.dispose();
  ok('dispose takes every node out of the graph', ctx.tally.disconnects >= 6);
  const m = bq1.frequency.ev.length;
  f.set(0.3);
  ok('set() after dispose is inert', bq1.frequency.ev.length === m);
}

console.log('\n[filter] born closed, older engines, low rates');
{
  const ctx = fakeCtx();
  const f = createPageFilter(ctx, 0.4);
  const [dry, bq1] = f.input.out;
  const wet = bq1.out[0].out[0];
  ok('p0 = 0.4: filtered from the first sample (dry 0, wet 1, corner a value)',
    dry.gain.value === 0 && wet.gain.value === 1 && near(bq1.frequency.value, filterHz(0.4), 1e-9) && bq1.frequency.ev.length === 0);
  ok('…hz() = filterHz(0.4)', near(f.hz(), filterHz(0.4), 1e-9));

  const old = fakeCtx({ hold: false });
  const g = createPageFilter(old, 1);
  const d2 = g.input.out[0];
  g.set(0.3);
  ok('no cancelAndHoldAtTime: cancel + set-at-current + ramp instead',
    d2.gain.ev.map((e) => e[0]).join(',') === 'cancel,set,ramp' && d2.gain.ev[1][1] === 1 && d2.gain.ev[2][1] === 0);

  const lo = fakeCtx({ sr: 22050 });
  const h = createPageFilter(lo, 1);
  const b = h.input.out[1];
  ok('a low-rate context never gets a corner past Nyquist', b.frequency.value <= 22050 * 0.49 && b.frequency.value > 10000);
  h.set(0.98);
  ok('…nor a glide target past it', b.frequency.ev[b.frequency.ev.length - 1][1] <= 22050 * 0.49);
}

// ═══ lane K (new): the contract's factory — createFilter(ctx) is createPageFilter(ctx) born open ═══
import { createFilter } from './filter.ts';
console.log('\n[filter] the contract\'s factory (types.ts CreateFilter)');
{
  const ctx = fakeCtx();
  const f = createFilter(ctx);
  const [dry, bq1] = f.input.out;
  const wet = bq1.out[0].out[0];
  ok('createFilter(ctx) = the page filter born OPEN: dry 1, wet 0 as values, get() = 1',
    f.get() === 1 && dry.gain.value === 1 && wet.gain.value === 0 && dry.gain.ev.length === 0);
  ok('…the SignalFilter surface (set, get, input, output) plus the page\'s hz() + dispose()',
    ['set', 'get', 'hz', 'dispose'].every((k) => typeof f[k] === 'function') && f.input && f.output);
  f.set(0.4);
  ok('…and it filters like the page\'s (set(0.4) crosses into the filtered leg)', near(f.hz(), filterHz(0.4), 1e-9) && dry.gain.ev.at(-1)[1] === 0);
}

console.log(fail ? `\n${fail} FAILED, ${pass} passed` : `\nALL FILTER CHECKS PASSED  (${pass} passed)`);
console.log(`filter: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
