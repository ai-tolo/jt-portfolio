// SIGNAL · R2 lane A · instrument.test.mjs — the integrator's R2 laws on a FAKE AudioContext (no audio, no browser): every
// lane's real factory is composed by the real createInstrument; the fake answers any create*() with a recording node.
//   (1) THE KIT AS FILES: the instrument fetches the six hits from ITS rip root (<ripRoot>/kit/<lane>.m4a), drums.ready()
//   (2) ARMED AND SILENT: load() of a document saved with the beat, the bass, ARP and HOLD on brings back everything EXCEPT
//       those four switches (off; no clock wanted); state() still reports a switch the visitor turns on (the store saves it)
//   (3) THE STOP GATE: the master stop shuts out.stopGate and books its reopen; wake() finds it shut and opens it at once
//   source ~/.nvm/nvm.sh && node src/signal/instrument.test.mjs      (exit 0 = green; prints `instrument: N/N`)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInstrument } from './instrument.ts';
import { DRUM_LANES, RIP_ROOT } from './types.ts';
import { STOP_GATE_HOLD, STOP_GATE_OPEN } from './out.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const js = (a) => JSON.stringify(a);
const flush = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

// ─────────────────────────────────────────────────────────────── the fake: any create*() → a recording node
function param(v) {
  const p = { value: v, ev: [] };
  for (const k of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'setValueCurveAtTime',
    'cancelScheduledValues', 'cancelAndHoldAtTime']) p[k] = (...a) => { p.ev.push([k, ...a]); return p; };
  return p;
}
const PARAMS = { gain: 1, frequency: 350, Q: 1, detune: 0, delayTime: 0, pan: 0, playbackRate: 1, offset: 1,
  threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 };
function fakeCtx() {
  const nodes = [];
  const node = (kind) => {
    const n = { kind, outs: [], channelCount: 2, channelCountMode: 'max', channelInterpretation: 'speakers', curve: null, oversample: 'none',
      buffer: null, loop: false, loopStart: 0, loopEnd: 0, normalize: true, type: 'lowpass', fftSize: 2048, frequencyBinCount: 1024, onended: null };
    for (const [k, v] of Object.entries(PARAMS)) n[k] = param(v);
    n.connect = (d) => { n.outs.push(d); return d; };
    n.disconnect = () => { n.outs = []; };
    n.start = () => {}; n.stop = () => {};
    n.setPeriodicWave = () => {};
    n.getFloatTimeDomainData = (b) => b.fill(0);
    n.getByteTimeDomainData = (b) => b.fill(128);
    n.getFloatFrequencyData = (b) => b.fill(-100);
    n.getFrequencyResponse = (f, m, ph) => { m.fill(1); ph.fill(0); };
    n.addEventListener = () => {}; n.removeEventListener = () => {};
    nodes.push(n);
    return n;
  };
  const base = {
    sampleRate: 48000, currentTime: 0, state: 'suspended', baseLatency: 0.005, outputLatency: 0.01, nodes, resumes: 0,
    destination: node('destination'),
    listeners: new Set(),
    addEventListener(t, fn) { if (t === 'statechange') base.listeners.add(fn); },
    removeEventListener(t, fn) { base.listeners.delete(fn); },
    resume() { base.resumes++; base.state = 'running'; for (const fn of base.listeners) fn(); return Promise.resolve(); },
    suspend() { base.state = 'suspended'; return Promise.resolve(); },
    createBuffer(ch, len, sr) {
      const data = Array.from({ length: ch }, () => new Float32Array(len));
      return { numberOfChannels: ch, length: len, sampleRate: sr, duration: len / sr, getChannelData: (c) => data[c], copyToChannel() {} };
    },
    decodeAudioData(ab) {
      const u8 = new Uint8Array(ab);
      if (String.fromCharCode(...u8.slice(4, 8)) !== 'ftyp') return Promise.reject(new Error('EncodingError'));
      return Promise.resolve(base.createBuffer(2, 24000, 48000));
    },
  };
  return new Proxy(base, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === 'string' && k.startsWith('create')) return () => node(k.slice(6));
      return undefined;
    },
  });
}

// the network: the six shipped kit files under the root the instrument is given; everything else 404s (the voices and the
// rooms fail softly: their lanes never reject — this suite is about the integrator's laws, not the rips)
const PUB = join(dirname(fileURLToPath(import.meta.url)), '../../public');
const KIT = Object.fromEntries(DRUM_LANES.map((l) => [l, readFileSync(join(PUB, RIP_ROOT, 'kit', `${l}.m4a`))]));
const fetched = [];
function serveKitAt(root) {
  globalThis.fetch = (u) => {
    fetched.push(String(u));
    const m = new RegExp(`^${root.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}/kit/([a-z]+)\\.m4a$`).exec(String(u));
    const b = m && KIT[m[1]];
    if (!b) return Promise.resolve({ ok: false, status: 404, json: async () => null, arrayBuffer: async () => new ArrayBuffer(0) });
    return Promise.resolve({ ok: true, status: 200, json: async () => null, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) });
  };
}
const warns = [];
const realWarn = console.warn;
console.warn = (...a) => { warns.push(a.map(String).join(' ')); };

// ─────────────────────────────────────────────────────────────── 1 · the kit from the instrument's own rip root
console.log('\n[instrument] R2 · the kit as files, from the instrument\'s rip root');
const ROOT = '/s/test-root';
serveKitAt(ROOT);
const ctx = fakeCtx();
const inst = await createInstrument({ ctx, muted: true, ripRoot: ROOT });
{
  const kitUrls = fetched.filter((u) => u.includes('/kit/'));
  ok('the six hits are fetched from <ripRoot>/kit/<lane>.m4a (the instrument\'s root, not a constant)',
    js(kitUrls) === js(DRUM_LANES.map((l) => `${ROOT}/kit/${l}.m4a`)), js(kitUrls));
  ok('…all six decode: drums.ready()', inst.drums.ready() === true);
  ok('the stop gate is built, open, nothing booked', !!inst.out.stopGate && inst.out.closed() === false && inst.out.stopGate.gain.ev.length === 0);
}

// ─────────────────────────────────────────────────────────────── 2 · a reload is armed and silent
console.log('\n[instrument] R2 · load(): armed and silent — everything saved comes back except the four switches');
{
  const saved = inst.state();
  saved.bpm = 100;
  saved.drums = { ...saved.drums, on: true, pattern: 'back', swing: 0.4, gain: 0.9 };
  saved.bass = { ...saved.bass, on: true, mode: 'seq', heat: 0.8, root: 40 };
  saved.harmony = { ...saved.harmony, hold: true, chord: true, arp: { on: true, div: '1/16', length: 0.8, groove: 0.5 },
    dive: { speedSec: 0.9, dist: 12 }, rack: [[60, 64, 67], null, null, null, null, null, null, null] };
  saved.keys = { ...saved.keys, filter: 0.6 };
  saved.solo = 'keys';
  let changes = 0;
  const off = inst.onChange(() => { changes++; });
  inst.load(JSON.parse(js(saved)));
  await flush();
  const s = inst.state();
  ok('drums.on, bass.on, harmony.arp.on, harmony.hold load OFF', s.drums.on === false && s.bass.on === false && s.harmony.arp.on === false && s.harmony.hold === false,
    js({ d: s.drums.on, b: s.bass.on, a: s.harmony.arp.on, h: s.harmony.hold }));
  ok('…and nothing wants the clock: the scheduler stays off', inst.time.running() === false);
  ok('everything else comes back: bpm, the drums\' pattern + swing + gain, the bass\'s mode + heat + pinned root',
    Math.abs(s.bpm - 100) < 1e-9 && s.drums.pattern === 'back' && Math.abs(s.drums.swing - 0.4) < 1e-9 && Math.abs(s.drums.gain - 0.9) < 1e-9
    && s.bass.mode === 'seq' && Math.abs(s.bass.heat - 0.8) < 1e-9 && s.bass.root === 40, js({ bpm: s.bpm, p: s.drums.pattern, m: s.bass.mode, r: s.bass.root }));
  ok('…the harmony\'s CHORD, the arp\'s div / length / groove, the dive dials, the rack; the keys\' filter; the solo',
    s.harmony.chord === true && js(s.harmony.arp) === js({ on: false, div: '1/16', length: 0.8, groove: 0.5 })
    && js(s.harmony.dive) === js({ speedSec: 0.9, dist: 12 }) && js(s.harmony.rack[0]) === js([60, 64, 67])
    && Math.abs(s.keys.filter - 0.6) < 1e-9 && s.solo === 'keys', js({ arp: s.harmony.arp, dive: s.harmony.dive, solo: s.solo }));
  ok('load() tells the views + the store once it is done (onChange)', changes >= 1);
  inst.drums.set('on', true);
  inst.harmony.set('arp', { ...inst.harmony.state().arp, on: true });
  const s2 = inst.state();
  ok('state() still reports the live switches the visitor turns on (the store saves them; only load() ignores them)',
    s2.drums.on === true && s2.harmony.arp.on === true && inst.time.running() === true);
  inst.stop();
  off();
  const s3 = inst.state();
  ok('the master stop puts them down again', s3.drums.on === false && s3.harmony.arp.on === false && inst.time.running() === false);
}

// ─────────────────────────────────────────────────────────────── 3 · the stop gate: shut by the stop, opened by wake()
console.log('\n[instrument] R2 · the master stop shuts the exit\'s stop gate; wake() never resumes into it');
{
  const g = inst.out.stopGate.gain;
  const booked = g.ev.map((e) => e[0]);
  ok('stop() → out.panic(): the gate pinned, 0 in 5 ms, the reopen booked (+130 ms, 20 ms)',
    inst.out.closed() === true && js(booked) === js(['cancelAndHoldAtTime', 'setValueAtTime', 'linearRampToValueAtTime', 'setValueAtTime', 'linearRampToValueAtTime'])
    && Math.abs(g.ev.at(-1)[2] - (STOP_GATE_HOLD + STOP_GATE_OPEN)) < 1e-9, js(g.ev));
  ok('the context never ran (suspended at 0): the gate stays shut until a gesture', ctx.state === 'suspended' && inst.out.closed() === true);
  const n = g.ev.length;
  await inst.wake();
  const opened = g.ev.slice(n);
  ok('wake(): the gate opens at once (pinned at now, linear to 1 over 20 ms), then the context resumes',
    inst.out.closed() === false && js(opened.map((e) => e[0])) === js(['cancelAndHoldAtTime', 'setValueAtTime', 'linearRampToValueAtTime'])
    && opened.at(-1)[1] === 1 && Math.abs(opened.at(-1)[2] - STOP_GATE_OPEN) < 1e-9 && ctx.state === 'running' && ctx.resumes === 1, js(opened));
  const m = g.ev.length;
  await inst.wake();
  ok('wake() on an open gate and a running context: nothing booked, no second resume', g.ev.length === m && ctx.resumes === 1);
  // a stop while running: the reopen is booked and wake() (not called by main.ts while running) is not needed
  ctx.currentTime = 3;
  inst.stop();
  ok('a stop on a running context: shut now, open again by itself at +150 ms', inst.out.closed() === true
    && (ctx.currentTime = 3 + STOP_GATE_HOLD + STOP_GATE_OPEN, inst.out.closed() === false));
}

inst.dispose();
console.warn = realWarn;
const unexpected = warns.filter((w) => !/did not load|could not|failed|404|left out|rooms|ir/i.test(w));
ok('no unexpected warning', unexpected.length === 0, unexpected.join(' | '));
console.log(`\n${fail ? '✗' : '✓'} instrument: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
