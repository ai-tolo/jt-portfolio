// out.test.mjs — lane O · the exit and the effects, in node.
//   §1 the clamp curve against E-effects-out.md §5's table · §2 the soft stage · §3 the duck envelope at 120 BPM (A §5)
//   §4 createOut on a mock context (the chain stage for stage, forced stereo, mute, level, panic; R2: the stop gate's
//      bookings — panic closes it in 5 ms and books the reopen at +130 ms, open() for wake())
//   §5 createEffects on a mock context, both paths (worklet / fallback): the graph, apply's laws, the delay re-timed on
//      every bpm, duckHit's bookings, chop / releaseGate, hush + restore, setGain, the REV taps + parking
//   §6 ir.ts: the onset shift, the manifest, the silent mount law · §7 the shipped ir.json against its files
//   node src/signal/out.test.mjs   (exit 0 = green; prints `out: N/N`)
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLAMP_KNEE, CLAMP_CEIL, CLAMP_DOMAIN, CLAMP_POINTS, clampSample, clampCurve, shapeThrough, softCurve, levelOf, createOut,
  PRE_LIMIT, STOP_GATE_CLOSE, STOP_GATE_HOLD, STOP_GATE_OPEN,
} from './out.ts';
import {
  createEffects, duckLaw, fxLevels, delayTimeSec, fallbackDrive, driveCurve, sanitizeFx, hushHoldSec, HUSH_RAMP, TAP_FADE,
} from './effects.ts';
import { prepIr, onsetIndex, parseIrManifest, createIrSet, REV_SLOTS } from './ir.ts';
import { RIP_ROOT } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
let pass = 0, total = 0;
const fails = [];
function ok(cond, name, detail = '') {
  total++;
  if (cond) pass++;
  else { fails.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const dB = (x) => 20 * Math.log10(x);
const fromDb = (d) => 10 ** (d / 20);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ═══ §1 the clamp (E §5: −3 → −3.00, −1.5 → −1.59, −1 → −1.21, 0 → −0.64, ≥ +6 → −0.04 dBFS)
{
  const table = [[-3, -3.0], [-1.5, -1.59], [-1, -1.21], [0, -0.64], [6, -0.04], [12, -0.04]];
  const curve = clampCurve();
  ok(curve.length === CLAMP_POINTS && CLAMP_POINTS === 8192 && CLAMP_DOMAIN === 4, 'clamp: 8192 points over ±4');
  ok(near(CLAMP_KNEE, 10 ** (-3 / 20), 1e-15) && CLAMP_CEIL === 0.995, 'clamp: knee = −3.00 dBFS exactly, ceiling 0.995');
  for (const [inDb, outDb] of table) {
    const x = fromDb(inDb);
    const pure = dB(clampSample(x)), shaped = dB(shapeThrough(curve, x));
    ok(near(pure, outDb, 0.005 + (inDb >= 6 ? 0.005 : 0)), `clamp: ${inDb} dBFS → ${outDb} (clampSample)`, `${pure.toFixed(4)}`);
    ok(near(shaped, outDb, 0.01), `clamp: ${inDb} dBFS → ${outDb} (through the 8192-point curve, the WaveShaper model)`, `${shaped.toFixed(4)}`);
    ok(near(shapeThrough(curve, -x), -shapeThrough(curve, x), 1e-6), `clamp: odd at ${inDb} dBFS`);
  }
  let worst = 0;
  for (let i = 0; i <= 20000; i++) {
    const x = -CLAMP_KNEE + (2 * CLAMP_KNEE * i) / 20000;
    worst = Math.max(worst, Math.abs(shapeThrough(curve, x) - x));
  }
  ok(worst < 1e-6, 'clamp: the identity under the knee (the WaveShaper model, ±1e-6)', worst.toExponential(2));
  let mono = true, prev = -Infinity;
  for (let i = 0; i < curve.length; i++) { if (curve[i] < prev) { mono = false; break; } prev = curve[i]; }
  ok(mono && Math.max(...curve) <= Math.fround(CLAMP_CEIL) && Math.min(...curve) >= -Math.fround(CLAMP_CEIL), 'clamp: monotone, inside ±0.995 everywhere (float32)');
  ok(near(dB(shapeThrough(curve, 100)), dB(clampSample(4)), 1e-6), 'clamp: beyond ±4 the shaper clamps to the last point');
}

// ═══ §2 the soft stage (dsp.ts:151-159: tanh(1.12x), 1024 points; ceiling −1.86 dBFS, small-signal +0.98 dB)
{
  const c = softCurve();
  ok(c.length === 1024, 'soft: 1024 points');
  ok(near(c[1023], Math.tanh(1.12), 1e-7) && near(dB(c[1023]), -1.857, 0.005), 'soft: the ceiling tanh(1.12) = 0.8076 (−1.86 dBFS)', dB(c[1023]).toFixed(3));
  const slope = (c[512] - c[511]) / (2 / 1023);
  ok(near(slope, 1.12, 0.001) && near(dB(slope), 0.984, 0.01), 'soft: small-signal gain 1.12 (+0.98 dB)', slope.toFixed(4));
  ok(near(dB(PRE_LIMIT), -0.724, 0.001), 'preLimit 0.92 = −0.72 dB');
}

// ═══ §3 the duck at 120 BPM (A-drums.md §5; beat = 0.5 s)
{
  const beat = 0.5;
  const d3 = duckLaw(0.3, beat), d6 = duckLaw(0.6, beat), d10 = duckLaw(1, beat), d8 = duckLaw(0.8, beat);
  ok(near(d3.floor, 0.584615, 1e-6) && near(dB(d3.floor), -4.66, 0.01), 'duck sc .3 (default): floor .585 = −4.7 dB', `${d3.floor.toFixed(4)} ${dB(d3.floor).toFixed(2)} dB`);
  ok(near(d3.attack, 0.012, 1e-12) && near(d3.attackTau, 0.004, 1e-12) && d3.hold === 0, 'duck sc .3: attack 12 ms (τ 4 ms), no hold');
  ok(near(d3.releaseAt, 0.012, 1e-12) && near(d3.releaseTau, 0.17, 1e-12), 'duck sc .3: release τ 170 ms from +12 ms');
  ok(near(d6.floor, 0.169231, 1e-6) && near(dB(d6.floor), -15.43, 0.01), 'duck sc .6: floor .169 = −15.4 dB', dB(d6.floor).toFixed(2));
  ok(near(d6.releaseTau, 0.17, 1e-12) && near(d6.releaseAt, 0.012, 1e-12), 'duck sc .6: still soft (hard 0): τ 170 ms from +12 ms');
  ok(d10.floor === 0, 'duck sc 1: floor 0 (silence)');
  ok(near(d10.attack, 0.006, 1e-12) && near(d10.attackTau, 0.004, 1e-12) && near(d10.hold, 0.07, 1e-12), 'duck sc 1: attack 6 ms (τ ≥ 4 ms), hold 0.14 beat = 70 ms');
  ok(near(d10.releaseAt, 0.076, 1e-12) && near(d10.releaseTau, 0.85, 1e-12), 'duck sc 1: release τ 850 ms from +76 ms');
  ok(near(d8.floor, 0.05, 1e-12) && near(d8.releaseAt, 0.009 + 0.035, 1e-12) && near(d8.releaseTau, 0.51, 1e-12), 'duck sc .8: hard .5 → floor .05, τ 510 ms from +44 ms');
  ok(duckLaw(0.009, beat) === null && duckLaw(0, beat) === null, 'duck: below sc 0.01 nothing is booked');
  ok(near(duckLaw(0.3, 60 / 90).releaseTau, 0.2, 1e-12), 'duck sc .3 at 90 BPM: τ capped at 200 ms');
}

// ═══ the mock context
class MParam {
  constructor(v) { this.value = v; this.ev = []; }
  setValueAtTime(v, t) { this.ev.push({ k: 'set', v, t }); return this; }
  linearRampToValueAtTime(v, t) { this.ev.push({ k: 'lin', v, t }); return this; }
  setTargetAtTime(v, t, tau) { this.ev.push({ k: 'target', v, t, tau }); return this; }
  cancelScheduledValues(t) { this.ev.push({ k: 'cancel', t }); return this; }
  cancelAndHoldAtTime(t) { this.ev.push({ k: 'hold', t }); return this; }
  last(k) { for (let i = this.ev.length - 1; i >= 0; i--) if (!k || this.ev[i].k === k) return this.ev[i]; return null; }
  clear() { this.ev = []; }
}
class MNode {
  constructor(ctx, kind, props = {}) { this.ctx = ctx; this.kind = kind; this.outs = []; Object.assign(this, props); ctx.nodes.push(this); }
  connect(dst, o = 0, i = 0) { if (!this.outs.some((e) => e.dst === dst && e.o === o && e.i === i)) this.outs.push({ dst, o, i }); return dst; }
  disconnect(dst) {
    if (dst === undefined) { this.outs = []; return; }
    const n = this.outs.length;
    this.outs = this.outs.filter((e) => e.dst !== dst);
    if (this.outs.length === n) throw new Error('InvalidAccessError: not connected');
  }
}
function mkBuffer(ch, len, rate) {
  const data = Array.from({ length: ch }, () => new Float32Array(len));
  return { numberOfChannels: ch, length: len, sampleRate: rate, duration: len / rate, getChannelData: (c) => data[c] };
}
function mockCtx({ sr = 48000, worklet = false, brokenComp = false } = {}) {
  const ctx = { sampleRate: sr, currentTime: 0, nodes: [] };
  ctx.destination = new MNode(ctx, 'destination');
  const gain = () => new MNode(ctx, 'gain', { gain: new MParam(1), channelCount: 2, channelCountMode: 'max', channelInterpretation: 'speakers' });
  ctx.createGain = gain;
  ctx.createBiquadFilter = () => new MNode(ctx, 'biquad', { type: 'lowpass', frequency: new MParam(350), Q: new MParam(1) });
  ctx.createWaveShaper = () => new MNode(ctx, 'shaper', { curve: null, oversample: 'none' });
  ctx.createDynamicsCompressor = () => {
    if (brokenComp) throw new Error('no compressor here');
    return new MNode(ctx, 'comp', { threshold: new MParam(-24), knee: new MParam(30), ratio: new MParam(12), attack: new MParam(0.003), release: new MParam(0.25) });
  };
  ctx.createDelay = (max) => new MNode(ctx, 'delay', { max, delayTime: new MParam(0) });
  ctx.createStereoPanner = () => new MNode(ctx, 'panner', { pan: new MParam(0) });
  ctx.createConvolver = () => new MNode(ctx, 'conv', { normalize: true, buffer: null });
  ctx.createAnalyser = () => {
    const n = new MNode(ctx, 'analyser', { fftSize: 2048, data: null });
    n.getFloatTimeDomainData = (buf) => { buf.fill(0); if (n.data) buf.set(n.data.subarray(0, buf.length)); };
    return n;
  };
  ctx.createChannelSplitter = (k) => new MNode(ctx, 'splitter', { k });
  ctx.createBuffer = (ch, len, rate) => mkBuffer(ch, len, rate);
  // the fake "m4a": a JSON description the fake decoder turns into a buffer with a click at `at`
  ctx.decodeAudioData = (ab) => {
    const info = JSON.parse(new TextDecoder().decode(ab));
    const b = mkBuffer(2, info.len, sr);
    b.getChannelData(0)[info.at] = 0.9;
    b.getChannelData(1)[info.at + 2] = -0.5;
    b.getChannelData(0)[info.at + 100] = 0.3;
    return Promise.resolve(b);
  };
  if (worklet) ctx.audioWorklet = { addModule: () => Promise.resolve() };
  return ctx;
}
globalThis.AudioWorkletNode = class extends MNode {
  constructor(ctx, name, opts) {
    super(ctx, `worklet:${name}`, { opts });
    this.port = { postMessage() {} };
    const P = name === 'sig-sat' ? { drive: new MParam(0), flavor: new MParam(0) } : { mode: new MParam(3), rate: new MParam(0.5) };
    this.parameters = new Map(Object.entries(P));
  }
};
const edge = (a, b) => !!a && !!b && a.outs.some((e) => e.dst === b);
const into = (ctx, b) => ctx.nodes.filter((n) => edge(n, b));
const kinds = (ctx, k) => ctx.nodes.filter((n) => n.kind === k);

// the shipped manifest, served by a fake fetch; each m4a "decodes" with the AAC priming KEPT (+4224 frames at 48 k)
const IR_DIR = join(REPO, 'public', RIP_ROOT.replace(/^\//, ''), 'ir');
const IR_JSON = JSON.parse(readFileSync(join(IR_DIR, 'ir.json'), 'utf8'));
const PRIMING = 4224;
const fetched = [];
function fakeFetch(url) {
  fetched.push(url);
  if (url.endsWith('/ir.json')) return Promise.resolve({ ok: true, json: async () => IR_JSON, arrayBuffer: async () => new ArrayBuffer(0) });
  const a = IR_JSON.find((x) => x.url === url);
  if (!a) return Promise.resolve({ ok: false, status: 404, json: async () => null, arrayBuffer: async () => new ArrayBuffer(0) });
  const at = Math.round((a.onsetMs / 1000) * 48000) + PRIMING;
  const body = new TextEncoder().encode(JSON.stringify({ at, len: Math.round(a.seconds * 48000) + PRIMING + 1400 }));
  return Promise.resolve({ ok: true, json: async () => null, arrayBuffer: async () => body.buffer });
}
globalThis.fetch = fakeFetch;
globalThis.requestIdleCallback = (fn) => setTimeout(fn, 1);
// ir.ts warns when a decoder kept the priming (the fake one always does): collect, do not print
const warned = [];
const realWarn = console.warn;
console.warn = (...a) => { warned.push(a.join(' ')); };

// ═══ §4 createOut
{
  const ctx = mockCtx();
  const out = createOut({ ctx, muted: false });
  const pre = into(ctx, kinds(ctx, 'biquad')[0])[0];
  const hp = kinds(ctx, 'biquad')[0];
  const [soft, clampSh] = kinds(ctx, 'shaper');
  const lim = kinds(ctx, 'comp')[0];
  const trim = into(ctx, clampSh)[0];
  ok(edge(out.duck, pre) && edge(out.drumsIn, pre) && pre.gain.value === 0.92, 'out: duck + drumsIn land on preLimit 0.92');
  ok(hp.type === 'highpass' && hp.frequency.value === 20 && hp.Q.value === -3.01 && edge(pre, hp) && edge(hp, soft), 'out: masterHP 20 Hz, Q −3.01 dB');
  const gate = out.stopGate;
  ok(soft.oversample === '2x' && soft.curve.length === 1024 && near(soft.curve[1023], Math.tanh(1.12), 1e-7) && edge(soft, gate), 'out: soft tanh(1.12x) at 2×');
  ok(gate && gate.kind === 'gain' && gate.gain.value === 1 && gate.gain.ev.length === 0 && edge(gate, lim) && !edge(soft, lim) && !edge(hp, lim)
    && out.closed() === false, '[R2] out: the stop gate sits AFTER masterHP + soft, BEFORE the limiter; open at 1, nothing booked');
  ok(lim.threshold.value === -1.5 && lim.knee.value === 0 && lim.ratio.value === 20 && lim.attack.value === 0.002 && lim.release.value === 0.09,
    'out: limiter −1.5 dB · knee 0 · 20:1 · 2 ms / 90 ms');
  ok(edge(lim, trim) && trim.gain.value === 0.25 && edge(trim, clampSh) && clampSh.oversample === 'none' && clampSh.curve.length === 8192,
    'out: trim ¼ → the clamp curve (8192, no oversampling)');
  ok(edge(clampSh, ctx.destination) && out.post === clampSh, 'out: the clamp → the destination (unmuted); post = the clamp');
  ok([out.duck, out.drumsIn, pre].every((g) => g.channelCount === 2 && g.channelCountMode === 'explicit' && g.channelInterpretation === 'speakers'),
    'out: duck, drumsIn, preLimit forced stereo (2 / explicit / speakers)');
  const [anL, anR] = kinds(ctx, 'analyser');
  const split = kinds(ctx, 'splitter')[0];
  const sink = into(ctx, ctx.destination).find((n) => n.kind === 'gain');
  ok(edge(clampSh, split) && split.outs.some((e) => e.dst === anL && e.o === 0) && split.outs.some((e) => e.dst === anR && e.o === 1),
    'out: the level pair hangs POST-clamp, one analyser per channel');
  ok(anL.fftSize === 4096 && sink && sink.gain.value === 0 && edge(anL, sink) && edge(anR, sink), 'out: 4096-sample windows, pulled through a 0-gain sink');
  anL.data = new Float32Array(4096).map((_, i) => 0.5 * Math.sin((2 * Math.PI * 1000 * i) / 48000));
  anR.data = new Float32Array(4096).map((_, i) => -0.25 * Math.sin((2 * Math.PI * 1000 * i) / 48000));
  const lv = out.level();
  ok(near(lv.peak, 0.5, 2e-3) && near(lv.rms, Math.sqrt((0.125 + 0.03125) / 2), 2e-3), 'out: level() = linear peak + RMS over both channels',
    `${lv.peak.toFixed(4)} ${lv.rms.toFixed(4)}`);
  ok(out.muted() === false && out.ctx === ctx, 'out: muted() false, ctx carried');
  const lv0 = levelOf(new Float32Array(8), new Float32Array(8));
  ok(lv0.peak === 0 && lv0.rms === 0, 'out: levelOf silence = 0, 0');
  // the peak reads the latest 1024 samples only (a stop shows within ~21 ms); the RMS the whole 4096
  anL.data = new Float32Array(4096); anR.data = new Float32Array(4096);
  anL.data[4096 - 1025] = 0.9; anR.data[4096 - 1024] = 0.2;
  const lv2 = out.level();
  ok(near(lv2.peak, 0.2, 1e-6) && near(lv2.rms, Math.sqrt((0.81 + 0.04) / 8192), 1e-9), 'out: peak over the latest 1024 samples, RMS over all 4096',
    `${lv2.peak} ${lv2.rms}`);
}
{
  const ctx = mockCtx();
  const out = createOut({ ctx, muted: true });
  const clampSh = kinds(ctx, 'shaper')[1];
  const sink = into(ctx, ctx.destination).find((n) => n.kind === 'gain');
  ok(!edge(clampSh, ctx.destination) && edge(clampSh, sink) && sink.gain.value === 0 && out.muted() === true,
    'out muted: the clamp lands on the 0-gain sink, never the destination');
  sink.gain.value = 1;                        // something tampered with it
  out.panic();
  ok(sink.gain.value === 0 && !edge(clampSh, ctx.destination) && edge(clampSh, sink), 'out muted: panic() re-pins the sink at 0 and keeps the route');
  const [anL] = kinds(ctx, 'analyser');
  anL.data = new Float32Array(4096).fill(0.1);
  ok(near(out.level().peak, 0.1, 1e-6), 'out muted: level() still reads');
}

// ═══ §4b THE STOP GATE (R2): panic() pins its value, 0 in 5 ms, the reopen booked at +130 ms (linear to 1 over 20 ms)
{
  const evNear = (got, want) => got.length === want.length && want.every((w, i) => got[i].k === w.k
    && (w.t === undefined || near(got[i].t, w.t, 1e-9)) && (w.v === undefined || near(got[i].v, w.v, 1e-9)));
  const show = (ev) => ev.map((e) => `${e.k}${e.v !== undefined ? ` ${+e.v.toFixed(4)}` : ''}@${+e.t.toFixed(4)}`).join(' · ');
  ok(STOP_GATE_CLOSE === 0.005 && STOP_GATE_HOLD === 0.13 && STOP_GATE_OPEN === 0.02, '[R2] stop gate: close 5 ms, hold 130 ms, reopen 20 ms');
  const ctx = mockCtx();
  const out = createOut({ ctx, muted: false });
  const g = out.stopGate.gain;
  out.open();
  ok(g.ev.length === 0 && out.closed() === false, '[R2] open() on an open gate books nothing');
  ctx.currentTime = 2;
  out.panic();
  ok(evNear(g.ev, [{ k: 'hold', t: 2 }, { k: 'set', v: 1, t: 2 }, { k: 'lin', v: 0, t: 2.005 }, { k: 'set', v: 0, t: 2.13 }, { k: 'lin', v: 1, t: 2.15 }]),
    '[R2] panic(): pin (cancelAndHold + its value) → 0 in 5 ms → held → the reopen booked at +130 ms, linear to 1 by +150 ms', show(g.ev));
  const shut = [2, 2.004, 2.1, 2.1499].map((t) => { ctx.currentTime = t; return out.closed(); });
  ctx.currentTime = 2.15;
  ok(shut.every(Boolean) && out.closed() === false, '[R2] closed() from the panic until the reopen reaches 1 (+150 ms), then open');
  // a second stop inside the hold: re-pinned (at the held 0) and re-booked from ITS time
  ctx.currentTime = 2.05; g.value = 0; g.clear();
  out.panic();
  ok(evNear(g.ev, [{ k: 'hold', t: 2.05 }, { k: 'set', v: 0, t: 2.05 }, { k: 'lin', v: 0, t: 2.055 }, { k: 'set', v: 0, t: 2.18 }, { k: 'lin', v: 1, t: 2.2 }])
    && out.closed(), '[R2] a repeated panic re-pins and re-books the reopen from its own time', show(g.ev));
  // open(): wake() on a shut gate — back to 1 over 20 ms from now, the booked reopen cancelled (the hold cancels it)
  ctx.currentTime = 2.07; g.clear();
  out.open();
  ok(evNear(g.ev, [{ k: 'hold', t: 2.07 }, { k: 'set', v: 0, t: 2.07 }, { k: 'lin', v: 1, t: 2.09 }]) && out.closed() === false,
    '[R2] open() while shut: pin at now (cancelling the booked reopen) → linear to 1 in 20 ms; closed() false', show(g.ev));
  g.clear(); out.open();
  ok(g.ev.length === 0, '[R2] open() again: a no-op');
  // an engine without cancelAndHoldAtTime (Firefox): cancelScheduledValues + the value
  const ctx2 = mockCtx();
  const out2 = createOut({ ctx: ctx2, muted: true });
  const g2 = out2.stopGate.gain;
  g2.cancelAndHoldAtTime = undefined;
  ctx2.currentTime = 1;
  out2.panic();
  ok(evNear(g2.ev, [{ k: 'cancel', t: 1 }, { k: 'set', v: 1, t: 1 }, { k: 'lin', v: 0, t: 1.005 }, { k: 'set', v: 0, t: 1.13 }, { k: 'lin', v: 1, t: 1.15 }]),
    '[R2] no cancelAndHoldAtTime (Firefox): cancel + set, the same bookings; a MUTED page shuts it too', show(g2.ev));
  // a suspended context never ran (t = 0): a stop before the first gesture books from 0, and wake's open() undoes it
  const ctx3 = mockCtx();
  const out3 = createOut({ ctx: ctx3, muted: false });
  out3.panic();
  const shut0 = out3.closed();
  out3.open();
  const g3 = out3.stopGate.gain;
  ok(shut0 && !out3.closed() && evNear(g3.ev.slice(-3), [{ k: 'hold', t: 0 }, { k: 'set', v: 1, t: 0 }, { k: 'lin', v: 1, t: 0.02 }]),
    '[R2] a stop on a context frozen at 0 stays shut until wake(): open() takes it back to 1', show(g3.ev));
}

// ═══ §5 createEffects
const settle = (ms = 30) => sleep(ms);
function effectsGraph(ctx) {
  const glue = kinds(ctx, 'comp').find((c) => c.threshold.value === -15);
  const makeup = glue.outs[0].dst;
  const convs = kinds(ctx, 'conv');
  const taps = convs.map((c) => into(ctx, c)[0]);
  const rmix = kinds(ctx, 'gain').find((g) => edge(g, glue) && into(ctx, g).filter((n) => n.kind === 'gain').length === 4);
  const mountGains = into(ctx, rmix);
  const panners = kinds(ctx, 'panner');
  const dmix = panners.length ? panners[0].outs[0].dst : null;
  const damp = kinds(ctx, 'biquad').find((b) => b.frequency.value === 3200);
  const dfb = damp.outs[0].dst;
  const [delL, delR] = kinds(ctx, 'delay');
  const keysGain = into(ctx, glue).find((n) => n.kind === 'gain' && edge(n, into(ctx, delL).find((x) => x.kind === 'gain' && x.gain.value === 0.9)));
  const dpre = into(ctx, delL).find((x) => x.kind === 'gain' && x.gain.value === 0.9);
  const modMix = into(ctx, glue).find((n) => n !== keysGain && n !== rmix && n !== dmix && n.kind === 'gain');
  return { glue, makeup, convs, taps, rmix, mountGains, dmix, damp, dfb, delL, delR, keysGain, dpre, modMix };
}
const DEFAULT_FX = { drive: 0, driveType: 'warm', mod: 0, modMode: 'chorus', modRate: 0.5, delay: 0, delayDiv: '1/8', reverb: 0.22, revSize: 'sm' };

// — the fallback path (no audioWorklet: an insecure origin)
{
  fetched.length = 0;
  const ctx = mockCtx();
  const out = createOut({ ctx, muted: true });
  const fx = await createEffects({ ctx, out, ripRoot: RIP_ROOT });
  ok(fx.worklet() === 'fallback', 'effects fallback: worklet() = "fallback" without ctx.audioWorklet');
  const G = effectsGraph(ctx);
  const amp = fx.input.outs[0].dst;
  const fbPre = amp.outs[0].dst;
  const fbShaper = fbPre.outs[0].dst;
  const post = fbShaper.outs[0].dst;
  ok(fx.input.kind === 'gain' && fx.input.gain.value === 1 && amp.kind === 'gain' && fbPre.kind === 'gain' && fbShaper.kind === 'shaper'
    && fbShaper.oversample === '2x' && fbShaper.curve === null, 'effects fallback: input → gate amp → preGain → WaveShaper (2×, no curve at drive 0) → post');
  ok(edge(post, G.keysGain) && edge(G.keysGain, G.glue) && edge(G.glue, G.makeup) && G.makeup.gain.value === 1 && edge(G.makeup, out.duck),
    'effects: post → keysGain → glue → glueMakeup 1.0 → out.duck');
  ok(G.glue.threshold.value === -15 && G.glue.ratio.value === 4 && G.glue.attack.value === 0.005 && G.glue.release.value === 0.25
    && G.glue.knee.value === 30, 'effects: glue −15 dB · 4:1 · 5 ms / 250 ms · knee 30 (the default)');
  ok(G.modMix === undefined || G.modMix === null, 'effects fallback: MOD bypassed (no wet into the glue)');
  ok(edge(G.keysGain, G.dpre) && G.dpre.gain.value === 0.9 && edge(G.dpre, G.delL) && edge(G.delL, G.delR) && G.delL.max === 2 && G.delR.max === 2,
    'effects: the delay: keysGain → dpre .9 → delL → delR, createDelay(2)');
  const [pL, pR] = kinds(ctx, 'panner');
  ok(edge(G.delL, pL) && edge(G.delR, pR) && pL.pan.value === -0.65 && pR.pan.value === 0.65 && edge(pL, G.dmix) && edge(pR, G.dmix) && edge(G.dmix, G.glue),
    'effects: ping-pong pans ∓.65 into dmix → glue');
  ok(edge(G.delR, G.damp) && G.damp.type === 'lowpass' && G.damp.Q.value === -6.02 && edge(G.damp, G.dfb) && edge(G.dfb, G.delL),
    'effects: feedback delR → damp (LP 3200, Q −6.02) → dfb → delL');
  ok(G.convs.length === 4 && G.convs.every((c) => c.normalize === false) && G.taps.every((t) => edge(G.keysGain, t) && t.gain.value === 0),
    'effects: four convolvers, normalize off, each behind its own closed tap');
  ok(G.mountGains.length === 4 && edge(G.rmix, G.glue) && G.convs.every((c) => c.outs.length === 0), 'effects: rungs → rmix → glue; every rung parked at build');

  // apply at t = 0 (a suspended context): values PINNED, no ramps
  fx.apply({ ...DEFAULT_FX }, 120);
  const sm = 0;
  ok(G.rmix.gain.last().k === 'set' && near(G.rmix.gain.last().v, 0.154, 1e-12) && G.rmix.gain.last().t === 0, 'apply @t=0: rmix pinned to .7·.22 = .154');
  ok(G.taps[sm].gain.last().k === 'set' && G.taps[sm].gain.last().v === 1 && edge(G.convs[sm], G.mountGains[sm]),
    'apply: reverb .22 SM → the SM tap open, its rung unparked');
  ok(G.convs.slice(1).every((c) => c.outs.length === 0), 'apply: MED / HALL / VAST stay parked (only the selected rung is fed)');
  ok(near(G.delL.delayTime.last().v, 0.25, 1e-12) && near(G.delR.delayTime.last().v, 0.25, 1e-12), 'apply: the delay at 120 BPM · 1/8 = 250 ms');

  // the rooms mount: SM first (after its decode lands), then MED / HALL / VAST at idle; the priming is shifted out
  await settle(150);
  const bySlot = Object.fromEntries(REV_SLOTS.map((s, i) => [s, G.convs[i]]));
  ok(REV_SLOTS.every((s) => bySlot[s].buffer), 'mount: all four rungs mounted (SM, then the idle chain)', REV_SLOTS.map((s) => `${s}:${!!bySlot[s].buffer}`).join(' '));
  const smA = IR_JSON.find((a) => a.slot === 'sm');
  const smBuf = bySlot.sm.buffer;
  ok(smBuf && smBuf.length === Math.round(smA.seconds * 48000), 'mount: SM trimmed to its stored length (0.45 s = 21600 frames)', smBuf && smBuf.length);
  ok(smBuf && onsetIndex([smBuf.getChannelData(0), smBuf.getChannelData(1)]) === Math.round((smA.onsetMs / 1000) * 48000),
    'mount: the decoder\'s 4224-frame priming shifted out: the onset lands on ir.json\'s');
  ok(fetched[0] === `${RIP_ROOT}/ir/ir.json` && fetched[1] === `${RIP_ROOT}/ir/sm.m4a`, 'mount: ir.json first, then sm.m4a', fetched.slice(0, 2).join(' '));
  const ev = G.mountGains[0].gain.ev;
  ok(ev.some((e) => e.k === 'set' && e.v === 0) && ev[ev.length - 1].k === 'set' && ev[ev.length - 1].v === 1, 'mount @t=0: the rung gain pinned 0, then pinned 1 (setIrSlot)');
  const irs = fx.irs();
  ok(irs.length === 4 && irs.every((a) => a.mounted) && irs[0].url === `${RIP_ROOT}/ir/sm.m4a`, 'irs(): four assets, mounted, absolute urls');

  // live time from here
  ctx.currentTime = 10;
  G.rmix.gain.clear(); G.dfb.gain.clear(); G.dmix.gain.clear(); G.delL.delayTime.clear();
  fx.apply({ ...DEFAULT_FX, delay: 0.5, delayDiv: '1/16', reverb: 0.6 }, 120);
  const L = fxLevels({ delay: 0.5, delayDiv: '1/16', reverb: 0.6, mod: 0 });
  ok(near(L.dfb, Math.min(0.75, 0.3 + 0.14), 1e-12) && near(L.dmix, 0.35, 1e-12) && near(L.rmix, 0.42, 1e-12), 'fxLevels: dfb .44 (boost 1/16 .14), dmix .35, rmix .42');
  const tg = (p) => p.last('target');
  ok(near(tg(G.dfb.gain).v, 0.44, 1e-12) && tg(G.dfb.gain).tau === 0.02 && tg(G.dfb.gain).t === 10, 'apply @t>0: dfb glides τ 20 ms');
  ok(near(tg(G.dmix.gain).v, 0.35, 1e-12) && tg(G.dmix.gain).tau === 0.05, 'apply: dmix glides τ 50 ms');
  ok(near(tg(G.rmix.gain).v, 0.42, 1e-12) && tg(G.rmix.gain).tau === 0.02, 'apply: rmix = .7·reverb, τ 20 ms');
  ok(near(tg(G.delL.delayTime).v, 0.125, 1e-12) && tg(G.delL.delayTime).tau === 0.03, 'apply: 1/16 at 120 = 125 ms, glide τ 30 ms');
  G.delL.delayTime.clear();
  fx.apply({ ...DEFAULT_FX, delay: 0.5, delayDiv: '1/16', reverb: 0.6 }, 90);
  ok(near(tg(G.delL.delayTime).v, (60 / 90) * 0.25, 1e-12) && near(tg(G.delR.delayTime).v, (60 / 90) * 0.25, 1e-12),
    'apply: the SAME fx at a new bpm re-times the delay (E §3\'s bug, fixed)');
  ok(near(fxLevels({ delay: 1, delayDiv: '1/16', reverb: 1, mod: 1 }).dfb, 0.74, 1e-12) && near(fxLevels({ delay: 1, delayDiv: '1/8', reverb: 1, mod: 1 }).dfb, 0.65, 1e-12)
    && near(fxLevels({ delay: 1, delayDiv: '1/4', reverb: 0, mod: 0 }).dmix, 0.6, 1e-12) && near(fxLevels({ delay: 0.9, delayDiv: '1/4', reverb: 0, mod: 0 }).dmix, 0.6, 1e-12)
    && fxLevels({ delay: 0, delayDiv: '1/16', reverb: 0, mod: 0 }).dfb === 0, 'fxLevels: full delay = dfb .74 (1/16) / .65 (1/8), dmix capped .6, no boost at delay 0');
  ok(near(delayTimeSec(60, '1/4'), 1, 1e-12) && delayTimeSec(20, '1/4') === 1.95 && delayTimeSec(400, '1/16') === 0.0375
    && delayTimeSec(NaN, '1/8') === 0.25, 'delayTimeSec: 1/4 at 60 = 1 s (in sync), clamp .02..1.95, NaN bpm → 120');

  // DRIVE, the fallback law
  fx.apply({ ...DEFAULT_FX, drive: 0.6 }, 120);
  const law = fallbackDrive(0.6);
  ok(near(law.gi, 2.2, 1e-12) && near(law.a, (9 * 0.36) / 55, 1e-12), 'fallbackDrive .6: input gain 2.2, driveCurve a = 9·.36/55 (the warm knee)');
  ok(fbShaper.curve && fbShaper.curve.length === 256 && fbShaper.curve.every((v, i) => v === driveCurve(law.a)[i]), 'apply: the fallback shaper takes driveCurve(a)');
  ok(near(tg(fbPre.gain).v, 2.2, 1e-12) && near(tg(post.gain).v, law.mk, 1e-12), 'apply: preGain = gi, post = the measured makeup');
  for (const d of [0.3, 0.6, 1]) {
    const f = fallbackDrive(d), K = 9 * d * d;
    let s = 0;
    for (let i = 0; i < 4096; i++) { const x = Math.max(-1, Math.min(1, f.gi * 0.25 * Math.sin((2 * Math.PI * i) / 64))); const v = ((1 + K) * x) / (1 + K * Math.abs(x)) * f.mk; s += v * v; }
    ok(near(dB(Math.sqrt(s / 4096)), dB(0.25 / Math.SQRT2), 0.01), `fallbackDrive ${d}: level-true at the measuring sine (±0.01 dB)`);
  }
  fx.apply({ ...DEFAULT_FX, drive: 0 }, 120);
  ok(fbShaper.curve === null && fallbackDrive(0).mk === 1, 'apply: drive 0 → the fallback shaper holds no curve (a wire)');

  // duckHit: the Studio's envelope on out.duck
  const duck = out.duck.gain;
  duck.clear();
  fx.duckHit(11, 0.3, 0.5);
  ok(duck.ev.length === 3 && duck.ev[0].k === 'cancel' && duck.ev[0].t === 11
    && duck.ev[1].k === 'target' && near(duck.ev[1].v, 0.584615, 1e-6) && duck.ev[1].t === 11 && duck.ev[1].tau === 0.004
    && duck.ev[2].k === 'target' && duck.ev[2].v === 1 && near(duck.ev[2].t, 11.012, 1e-12) && near(duck.ev[2].tau, 0.17, 1e-12),
    'duckHit(11, .3, .5): cancel ≥ 11 · target .585 τ 4 ms · back to 1 from 11.012, τ 170 ms', JSON.stringify(duck.ev));
  duck.clear();
  fx.duckHit(12, 0.005, 0.5);
  ok(duck.ev.length === 0, 'duckHit below sc 0.01 books nothing');

  // chop + releaseGate on the gate amp
  amp.gain.clear();
  fx.chop(12, 0.125);
  const c = amp.gain.ev;
  ok(c.length === 4 && c[0].k === 'set' && c[0].v === 1 && c[0].t === 12 && c[1].k === 'lin' && c[1].v === 0.06 && near(c[1].t, 12.012, 1e-12)
    && c[2].k === 'set' && c[2].v === 0.06 && near(c[2].t, 12 + 0.125 * 0.55, 1e-12) && c[3].k === 'lin' && c[3].v === 1 && near(c[3].t, 12 + 0.125 * 0.9, 1e-12),
    'chop(12, .125): 1 → .06 in 12 ms, held to .55·sd, back to 1 by .9·sd');
  amp.gain.clear();
  fx.releaseGate();
  ok(amp.gain.ev[0].k === 'hold' && amp.gain.ev[0].t === 10 && amp.gain.last().k === 'target' && amp.gain.last().v === 1 && amp.gain.last().tau === 0.03,
    'releaseGate: cancel-and-hold at now, τ 30 ms back to 1');

  // setGain: gain × (1 − mute), clamped 0..1.25, τ 20 ms
  fx.setGain(0.8, false);
  ok(near(tg(G.keysGain.gain).v, 0.8, 1e-12) && tg(G.keysGain.gain).tau === 0.02, 'setGain(.8): keysGain → .8, τ 20 ms');
  fx.setGain(0.8, true);
  ok(tg(G.keysGain.gain).v === 0, 'setGain(.8, mute): keysGain → 0 (the returns keep ringing: the tails are after it)');
  fx.setGain(3, false);
  ok(tg(G.keysGain.gain).v === 1.25, 'setGain(3): clamped to 1.25');

  // the REV taps: a slot change crossfades τ 4 ms (exact at 20 ms); the outgoing rung rings out, then parks
  const spy = [];
  const realST = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms, ...a) => { spy.push(ms); return realST(fn, ms, ...a); };
  G.taps[0].gain.clear(); G.taps[1].gain.clear();
  fx.apply({ ...DEFAULT_FX, reverb: 0.6, revSize: 'med' }, 120);
  globalThis.setTimeout = realST;
  const t0 = G.taps[0].gain.ev, t1 = G.taps[1].gain.ev;
  ok(t0.some((e) => e.k === 'target' && e.v === 0 && e.t === 10 && e.tau === 0.004) && t0.some((e) => e.k === 'set' && e.v === 0 && near(e.t, 10 + TAP_FADE, 1e-12)),
    'slot SM → MED: the SM tap closes τ 4 ms, exact 0 at +20 ms');
  ok(t1.some((e) => e.k === 'target' && e.v === 1 && e.tau === 0.004) && t1.some((e) => e.k === 'set' && e.v === 1 && near(e.t, 10 + TAP_FADE, 1e-12))
    && edge(G.convs[1], G.mountGains[1]), 'slot SM → MED: the MED tap opens, its rung unparked');
  ok(edge(G.convs[0], G.mountGains[0]), 'slot SM → MED: the SM rung still rings (its output stays on)');
  ok(spy.some((ms) => near(ms, (TAP_FADE + 0.45 + 0.02) * 1000, 1e-6)), 'slot SM → MED: SM parks after 20 ms + its 0.45 s IR + 20 ms', spy.join(','));

  // hush: the returns to 0 in 15 ms, the duck + gate un-booked, held for the running rooms' tail (or 2 × the delay)
  const hushSpy = [];
  globalThis.setTimeout = (fn, ms, ...a) => { hushSpy.push({ fn, ms }); return realST(() => {}, 0); };
  for (const p of [G.dmix.gain, G.rmix.gain, G.dfb.gain, duck, amp.gain]) p.clear();
  ctx.currentTime = 10.1;
  fx.hush();
  globalThis.setTimeout = realST;
  const downTo0 = (p) => p.ev.some((e) => e.k === 'hold' && e.t === 10.1) && p.last().k === 'lin' && p.last().v === 0 && near(p.last().t, 10.1 + HUSH_RAMP, 1e-12);
  ok(downTo0(G.dmix.gain) && downTo0(G.rmix.gain) && downTo0(G.dfb.gain), 'hush: dmix, rmix, dfb → 0 in 15 ms (from a held value)');
  ok(duck.ev[0].k === 'hold' && duck.last().k === 'target' && duck.last().v === 1 && duck.last().tau === 0.05, 'hush: every booked duck cancelled, back to 1 at τ 50 ms');
  ok(amp.gain.last().k === 'target' && amp.gain.last().v === 1, 'hush: the gate released (booked chops cancelled)');
  const restoreAt = hushSpy.find((h) => h.ms > 100);
  const wantHold = HUSH_RAMP + hushHoldSec(1.1, (60 / 120) * 0.5);           // SM (.45) still ringing, MED (1.1) fed: 1.1 s
  ok(restoreAt && near(restoreAt.ms, wantHold * 1000, 1e-6), 'hush: held max(the running rooms\' IR, 2 × delay) + 20 ms', `${restoreAt && restoreAt.ms} vs ${wantHold * 1000}`);
  ok(near(hushHoldSec(0.45, 0.5), 1.02, 1e-12) && near(hushHoldSec(2.2, 0.25), 2.22, 1e-12), 'hushHoldSec: max(room, 2·delay) + 20 ms');
  // an FX move during the hold does not un-hush; restore writes the latest fx over 250 ms
  G.rmix.gain.clear();
  fx.apply({ ...DEFAULT_FX, reverb: 0.4, revSize: 'med' }, 120);
  ok(!G.rmix.gain.ev.some((e) => e.k === 'target'), 'hush: an apply() inside the hold leaves the returns down');
  ctx.currentTime = 11.5;
  restoreAt.fn();
  ok(G.rmix.gain.last().k === 'lin' && near(G.rmix.gain.last().v, 0.28, 1e-12) && near(G.rmix.gain.last().t, 11.75, 1e-12),
    'restore: rmix back to the latest .7·.4 over 250 ms');
  ok(G.dfb.gain.last().k === 'lin' && G.dfb.gain.last().v === 0 && G.dmix.gain.last().k === 'lin', 'restore: dfb / dmix back to their law (delay 0 → 0)');

  // the parked SM: wait its 490 ms out
  await sleep(560);
  ok(G.convs[0].outs.length === 0 && edge(G.convs[1], G.mountGains[1]), 'park: the SM rung\'s output edge is off; MED (fed) stays');
  // reverb below 0.001 closes every tap
  G.taps[1].gain.clear();
  ctx.currentTime = 12;
  fx.apply({ ...DEFAULT_FX, reverb: 0 }, 120);
  ok(G.taps.every((t) => t.gain.last() === null || t.gain.last().v === 0), 'reverb 0: every tap closed');
  // sanitize: junk from an old save lands on the defaults
  const s = sanitizeFx({ drive: 7, driveType: 'crush', mod: NaN, modMode: 'wah', delayDiv: '1/2', revSize: 'small', reverb: -1 });
  ok(s.drive === 1 && s.driveType === 'warm' && s.mod === 0 && s.modMode === 'chorus' && s.delayDiv === '1/8' && s.revSize === 'sm' && s.reverb === 0,
    'sanitizeFx: out-of-range and unknown values → the contract\'s defaults');
}

// — the worklet path
{
  const ctx = mockCtx({ worklet: true });
  const out = createOut({ ctx, muted: true });
  const fx = await createEffects({ ctx, out, ripRoot: RIP_ROOT });
  ok(fx.worklet() === 'ready', 'effects worklet: worklet() = "ready"');
  const sat = kinds(ctx, 'worklet:sig-sat')[0], mod = kinds(ctx, 'worklet:sig-mod')[0];
  const amp = fx.input.outs[0].dst;
  const G = effectsGraph(ctx);
  ok(sat && edge(amp, sat) && sat.opts.outputChannelCount[0] === 2 && edge(sat, sat.outs[0].dst) && edge(sat.outs[0].dst, G.keysGain),
    'effects worklet: amp → sig-sat (2 ch out) → post → keysGain');
  ok(mod && edge(G.keysGain, mod) && edge(mod, G.modMix) && edge(G.modMix, G.glue) && !edge(mod, G.glue), 'effects worklet: keysGain → sig-mod → modMix → glue (wet only)');
  ctx.currentTime = 5;
  fx.apply({ ...DEFAULT_FX, drive: 0.6, driveType: 'tape', mod: 0.85, modMode: 'phaser', modRate: 0.7 }, 120);
  const drive = sat.parameters.get('drive'), flavor = sat.parameters.get('flavor');
  ok(drive.last('target').v === 0.6 && drive.last('target').tau === 0.02 && flavor.last('set').v === 2 && flavor.last('set').t === 5,
    'apply: sig-sat drive glides τ 20 ms, flavour switches hard (tape = 2)');
  ok(mod.parameters.get('mode').last('set').v === 0 && mod.parameters.get('rate').last('target').v === 0.7 && mod.parameters.get('rate').last('target').tau === 0.05,
    'apply: sig-mod mode switches (phaser = 0), rate glides τ 50 ms');
  ok(near(G.modMix.gain.last('target').v, 0.765, 1e-12) && G.modMix.gain.last('target').tau === 0.03, 'apply: modMix = .9·mod, τ 30 ms');
  G.modMix.gain.clear();
  fx.hush();
  ok(G.modMix.gain.last().k === 'lin' && G.modMix.gain.last().v === 0, 'hush: modMix → 0 too');
}

// — never rejects: a graph that will not build leaves the keys dry into the duck
{
  const ctx = mockCtx({ brokenComp: true });
  const warn = console.warn; console.warn = () => {};
  let threw = false, fx = null;
  try {
    const out = { ctx, duck: new MNode(ctx, 'gain', { gain: new MParam(1) }), drumsIn: null, level: () => ({ peak: 0, rms: 0 }), muted: () => true, panic() {} };
    fx = await createEffects({ ctx, out, ripRoot: RIP_ROOT });
    ok(edge(fx.input, out.duck) && fx.worklet() === 'fallback', 'effects: a failed build still resolves (keys dry → duck)');
    fx.apply({ ...DEFAULT_FX }, 120); fx.hush(); fx.chop(1, 0.1); fx.releaseGate(); fx.mountFirst();
  } catch { threw = true; }
  console.warn = warn;
  ok(!threw && fx, 'effects: createEffects never rejects');
}

// ═══ §6 ir.ts
{
  // the priming kept: +4224 frames → shifted back; the length trimmed
  const len = 21600 + 4224 + 1400, at = 100 + 4224;
  const Lc = new Float32Array(len), Rc = new Float32Array(len);
  Lc[at] = 1; Rc[at + 5] = 0.4; Lc[at - 50] = 0.009;             // below 1 % of the peak: not the onset
  const p = prepIr([Lc, Rc], 48000, { seconds: 0.45, onsetMs: 100 / 48 });
  ok(p.shift === 4224 && p.length === 21600 && p.chans[0][100] === 1 && p.chans[1][105] === Math.fround(0.4) && p.chans[0].length === 21600,
    'prepIr: a kept priming (4224 frames) is shifted out; the length trimmed to the stored 21600');
  const early = new Float32Array(1000); early[10] = 1;
  const q = prepIr([early], 48000, { seconds: 0.01, onsetMs: 1 });
  ok(q.shift === -38 && q.chans[0][48] === 1 && q.chans[0][0] === 0 && q.length === 480, 'prepIr: an early onset is padded (shift < 0)');
  ok(onsetIndex([new Float32Array(10)]) === 0, 'onsetIndex: silence → 0');
  const m = parseIrManifest([
    { slot: 'sm', url: 'sm.m4a', seconds: 0.45, onsetMs: 2, bytes: 1 },
    { slot: 'sm', url: 'dup.m4a', seconds: 1, onsetMs: 0, bytes: 1 },
    { slot: 'room', url: 'x.m4a', seconds: 1, onsetMs: 0, bytes: 1 },
    { slot: 'hall', url: '/abs/hall.m4a', seconds: 'x', onsetMs: 0, bytes: 1 },
    { slot: 'vast', url: 'https://cdn.example/vast.m4a', seconds: 4, onsetMs: 1.5, bytes: 9 },
  ], '/s/abc/ir/');
  ok(m.length === 2 && m[0].url === '/s/abc/ir/sm.m4a' && m[1].url === 'https://cdn.example/vast.m4a', 'parseIrManifest: relative urls resolved, junk and duplicates dropped');
  ok(parseIrManifest(null, '/').length === 0 && parseIrManifest({ irs: [{ slot: 'med', seconds: 1.1, onsetMs: 8 }] }, '/r/').length === 1,
    'parseIrManifest: null → [], {irs: [...]} accepted, a missing url → <slot>.m4a');

  // the silent mount law at t > 0, and want() skipping the idle waits
  const ctx = mockCtx();
  ctx.currentTime = 3;
  const rungs = {};
  for (const s of REV_SLOTS) rungs[s] = { conv: ctx.createConvolver(), out: ctx.createGain() };
  const idleQ = [];
  const set = createIrSet({ ctx, ripRoot: RIP_ROOT, rungs, fetch: fakeFetch, idle: (fn) => idleQ.push(fn) });
  set.want('hall');
  await settle(30);
  const g = rungs.hall.out.gain.ev;
  ok(rungs.hall.conv.buffer && g[0].k === 'cancel' && g[0].t === 3 && g[1].k === 'set' && g[1].v === 0 && g[1].t === 3
    && g[2].k === 'target' && g[2].v === 1 && near(g[2].t, 3.02, 1e-12) && g[2].tau === 0.006,
    'mount @t>0: gain pinned 0 → the buffer → eased back τ 6 ms after 20 ms (setIrSlot)');
  ok(set.mounted('hall') && near(set.seconds('hall'), 2.2, 1e-9) && !set.mounted('sm') && idleQ.length === 0, 'want(hall): mounted now, no idle wait, nothing else touched');
  set.mountFirst();
  await settle(30);
  ok(set.mounted('sm') && !set.mounted('med'), 'mountFirst: SM mounts on its own (a macrotask), MED waits for idle');
  let guard = 0;
  while (!set.mounted('vast') && guard++ < 20) { const fns = idleQ.splice(0); fns.forEach((f) => f()); await settle(10); }
  ok(set.mounted('med') && set.mounted('vast'), 'mountFirst: MED / HALL / VAST mount through the idle queue');
  ok(set.assets().length === 4 && set.assets().every((a) => a.mounted), 'assets(): all four known and mounted');
}

// ═══ §7 the shipped rooms: ir.json against its files (E §4.3: four stereo AAC-LC .m4a, ≤ 130 KB)
{
  const want = { sm: 0.45, med: 1.1, hall: 2.2, vast: 4 };
  ok(IR_JSON.length === 4 && REV_SLOTS.every((s, i) => IR_JSON[i].slot === s), 'ir.json: sm med hall vast, in ladder order');
  let totalBytes = 0, okAll = true;
  for (const a of IR_JSON) {
    const file = join(IR_DIR, `${a.slot}.m4a`);
    const size = statSync(file).size;
    totalBytes += size;
    const head = readFileSync(file).subarray(0, 64);
    const isMp4 = head.toString('latin1', 4, 8) === 'ftyp';
    const moovFirst = readFileSync(file).indexOf('moov') < readFileSync(file).indexOf('mdat');
    if (size !== a.bytes || a.url !== `${RIP_ROOT}/ir/${a.slot}.m4a` || a.seconds !== want[a.slot] || !(a.onsetMs >= 0 && a.onsetMs < 40) || !isMp4 || !moovFirst) {
      okAll = false; console.log('   ', a, size, isMp4, moovFirst);
    }
  }
  ok(okAll, 'ir.json: bytes = the files, urls under RIP_ROOT, seconds .45/1.1/2.2/4, sane onsets, MP4 with moov first (faststart)');
  ok(totalBytes <= 130_000, 'ir: four rooms ≤ 130 KB', `${totalBytes} B`);
}

ok(warned.some((w) => w.includes('[signal-ir] sm onset shifted by 4224')), 'ir: a kept priming is reported (console.warn)');
console.warn = realWarn;
console.log(`out: ${pass}/${total}`);
if (pass !== total) { console.log(fails.map((f) => `  - ${f}`).join('\n')); process.exit(1); }
process.exit(0);
