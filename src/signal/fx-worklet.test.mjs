// fx-worklet.test.mjs — lane O · the node sim of E (E-effects-out.md §1, §2): WORKLET_SRC evaluated under a stub
// AudioWorkletProcessor at 48 kHz in 128-frame blocks, fed 0.25-peak sines (−15.05 dBFS RMS), identical L and R.
//   node src/signal/fx-worklet.test.mjs   (exit 0 = green; prints `fx-worklet: N/N`)
import {
  WORKLET_SRC, ensureFxWorklet, SAT_FLAVORS, MOD_MODES, satFlavorIndex, modModeIndex,
} from './fx-worklet.ts';

let pass = 0, total = 0;
const fails = [];
function ok(cond, name, detail = '') {
  total++;
  if (cond) pass++;
  else { fails.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

// ─── the stub scope
const SR = 48000;
const reg = {};
class AWP { constructor() { this.port = { onmessage: null, postMessage() {} }; } }
new Function('AudioWorkletProcessor', 'registerProcessor', 'sampleRate', WORKLET_SRC)(AWP, (n, c) => { reg[n] = c; }, SR);

ok(Object.keys(reg).sort().join(',') === 'sig-mod,sig-sat', 'exactly sig-sat and sig-mod register', Object.keys(reg).join(','));
ok(!WORKLET_SRC.includes('sig-voicegate') && !WORKLET_SRC.includes('sig-fdn') && !WORKLET_SRC.includes('sig-unity')
  && !WORKLET_SRC.includes('sig-microshift'), 'voicegate / microshift / fdn / unity are dropped');

/** Run a processor for `seconds`, the same input on `nIn` channels (or per-channel fns), k-rate params. */
function run(name, params, seconds, input, nIn = 2) {
  const P = new reg[name]();
  const fr = 128, B = Math.ceil((seconds * SR) / fr);
  const L = new Float32Array(B * fr), R = new Float32Array(B * fr);
  const fns = Array.isArray(input) ? input : Array.from({ length: nIn }, () => input);
  let t = 0, alive = true;
  for (let b = 0; b < B; b++) {
    const ins = fns.map(() => new Float32Array(fr));
    for (let i = 0; i < fr; i++) fns.forEach((f, c) => { ins[c][i] = f(t + i); });
    const out = [new Float32Array(fr), new Float32Array(fr)];
    const pp = {};
    for (const k in params) pp[k] = new Float32Array([params[k]]);
    alive = P.process([ins], [out], pp) && alive;
    L.set(out[0], b * fr); R.set(out[1], b * fr);
    t += fr;
  }
  return { L, R, P, alive };
}
const rms = (a, from = 0) => { let s = 0; for (let i = from; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / (a.length - from)); };
const dB = (x) => 20 * Math.log10(x);
const sine = (f, A) => (n) => A * Math.sin((2 * Math.PI * f * n) / SR);
const IN_DB = dB(0.25 / Math.SQRT2);                       // −15.05 dBFS
const FROM = 4800;                                          // skip 100 ms of settling (E's sim window)
const identical = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };

// ─── sig-sat: every flavour at drive .3 / .6 / 1 — level within ±0.2 dB of the input, L ≡ R
for (const flavor of SAT_FLAVORS) {
  for (const drive of [0.3, 0.6, 1]) {
    const { L, R } = run('sig-sat', { drive, flavor: satFlavorIndex(flavor) }, 1, sine(220, 0.25));
    const lDb = dB(rms(L, FROM)), rDb = dB(rms(R, FROM));
    ok(identical(L, R), `sig-sat ${flavor} @${drive}: L ≡ R bit-identical`);
    ok(Math.abs(lDb - IN_DB) <= 0.2 && Math.abs(rDb - IN_DB) <= 0.2, `sig-sat ${flavor} @${drive}: level within ±0.2 dB of the input`,
      `L ${(lDb - IN_DB).toFixed(3)} dB, R ${(rDb - IN_DB).toFixed(3)} dB`);
  }
}

// TAPE, the E §1 regression itself: the left channel carries the signal (the page's copy: L = −∞ dB)
{
  const { L } = run('sig-sat', { drive: 0.6, flavor: 2 }, 0.5, sine(220, 0.25));
  ok(rms(L, FROM) > 0.1, 'sig-sat tape @0.6: the left channel is not silent', `L rms ${rms(L, FROM).toFixed(4)}`);
}
// TAPE with a MONO input (one input channel, two outputs): both outputs read it, L ≡ R
{
  const { L, R } = run('sig-sat', { drive: 1, flavor: 2 }, 0.5, [sine(330, 0.25)]);
  ok(identical(L, R) && rms(L, FROM) > 0.1, 'sig-sat tape @1, mono input: L ≡ R and sounding');
}

// drive 0 is a WIRE through the oversampler: an impulse comes out 30 samples late, whole
{
  const { L, R } = run('sig-sat', { drive: 0, flavor: 0 }, 0.01, (n) => (n === 100 ? 1 : 0));
  let pk = 0, at = 0;
  for (let i = 0; i < L.length; i++) if (Math.abs(L[i]) > pk) { pk = Math.abs(L[i]); at = i; }
  ok(at - 100 === 30, 'sig-sat drive 0: latency 30 samples (0.625 ms at 48 k)', `peak at +${at - 100}`);
  ok(pk > 0.9 && pk < 1.1, 'sig-sat drive 0: the impulse passes whole', `peak ${pk.toFixed(4)}`);
  ok(identical(L, R), 'sig-sat drive 0: L ≡ R');
}
// drive 0 passes a sine at unity (the wire is level-true)
{
  const { L } = run('sig-sat', { drive: 0, flavor: 2 }, 0.5, sine(1000, 0.25));
  ok(Math.abs(dB(rms(L, FROM)) - IN_DB) < 0.01, 'sig-sat drive 0: a 1 kHz sine passes at unity (±0.01 dB)', `${(dB(rms(L, FROM)) - IN_DB).toFixed(4)} dB`);
}

// the kill listener: a node told {kill:true} stops being active
{
  const P = new reg['sig-sat']();
  P.port.onmessage({ data: { kill: true } });
  const out = [new Float32Array(128), new Float32Array(128)];
  ok(P.process([[new Float32Array(128)]], [out], { drive: new Float32Array([0]), flavor: new Float32Array([0]) }) === false,
    'sig-sat: kill → process() returns false');
}
{
  const P = new reg['sig-mod']();
  ok(typeof P.port.onmessage === 'function', 'sig-mod installs its kill listener (the page never did)');
  P.port.onmessage({ data: { kill: true } });
  const out = [new Float32Array(128), new Float32Array(128)];
  ok(P.process([[new Float32Array(128)]], [out], { mode: new Float32Array([3]), rate: new Float32Array([0.5]) }) === false,
    'sig-mod: kill → process() returns false');
}

// ─── sig-mod: the send is read as 0.5·(L+R)
for (const mode of MOD_MODES) {
  const m = modModeIndex(mode);
  const s = sine(440, 0.25), z = () => 0;
  const left = run('sig-mod', { mode: m, rate: 0.5 }, 0.5, [s, z]);
  const right = run('sig-mod', { mode: m, rate: 0.5 }, 0.5, [z, s]);
  const both = run('sig-mod', { mode: m, rate: 0.5 }, 0.5, [s, s]);
  ok(identical(left.L, right.L) && identical(left.R, right.R), `sig-mod ${mode}: a left-only and a right-only source are the same send`);
  let err = 0;
  for (let i = 0; i < both.L.length; i++) err = Math.max(err, Math.abs(both.L[i] - 2 * left.L[i]), Math.abs(both.R[i] - 2 * left.R[i]));
  ok(err < 1e-6, `sig-mod ${mode}: L = R = s is exactly twice the one-sided send (0.5·(L+R))`, `max err ${err.toExponential(2)}`);
}
// the wet levels E measured at the detent (chorus −2.7, phaser −0.7, flanger −0.3, doubler 0 dB vs the input), ±0.5 dB
{
  const want = { phaser: -0.7, flanger: -0.3, doubler: 0, chorus: -2.7 };
  for (const mode of MOD_MODES) {
    const { L, R } = run('sig-mod', { mode: modModeIndex(mode), rate: 0.5 }, 2, sine(440, 0.25));
    const l = dB(rms(L, 9600)) - IN_DB, r = dB(rms(R, 9600)) - IN_DB;
    ok(Math.abs(l - want[mode]) <= 0.5 && Math.abs(r - want[mode]) <= 0.5, `sig-mod ${mode}: wet level ≈ E's ${want[mode]} dB (±0.5)`,
      `L ${l.toFixed(2)} R ${r.toFixed(2)}`);
  }
}
// RATE 0.5 is the detent (×1); the processors stay finite at the ends of the knob
{
  let finite = true;
  for (const mode of MOD_MODES) for (const rate of [0, 1]) {
    const { L, R } = run('sig-mod', { mode: modModeIndex(mode), rate }, 0.3, sine(440, 0.25));
    for (let i = 0; i < L.length; i++) if (!Number.isFinite(L[i]) || !Number.isFinite(R[i])) { finite = false; break; }
  }
  ok(finite, 'sig-mod: every mode stays finite at RATE 0 and 1');
}

// ─── the enums, in the segs' own order
ok(satFlavorIndex('warm') === 0 && satFlavorIndex('crunch') === 1 && satFlavorIndex('tape') === 2 && satFlavorIndex('fuzz') === 3
  && satFlavorIndex('nope') === 0, 'satFlavorIndex: warm crunch tape fuzz = 0..3, unknown → warm');
ok(modModeIndex('phaser') === 0 && modModeIndex('flanger') === 1 && modModeIndex('doubler') === 2 && modModeIndex('chorus') === 3
  && modModeIndex('nope') === 3, 'modModeIndex: phaser flanger doubler chorus = 0..3, unknown → chorus');

// ─── registration: per context, a Blob URL, false without audioWorklet
{
  const bare = {};
  ok((await ensureFxWorklet(bare)) === false, 'ensureFxWorklet: no audioWorklet → false (the fallback)');
  let calls = 0, lastUrl = '';
  const mk = () => ({ audioWorklet: { addModule: (u) => { calls++; lastUrl = u; return Promise.resolve(); } } });
  const a = mk(), b = mk();
  const p1 = ensureFxWorklet(a), p2 = ensureFxWorklet(a);
  ok(p1 === p2, 'ensureFxWorklet: one promise per context');
  ok((await p1) === true && calls === 1, 'ensureFxWorklet: addModule once, resolves true');
  ok(lastUrl.startsWith('blob:'), 'ensureFxWorklet: a Blob URL', lastUrl.slice(0, 12));
  await ensureFxWorklet(b);
  ok(calls === 2, 'ensureFxWorklet: a second context registers again');
  const bad = { audioWorklet: { addModule: () => Promise.reject(new Error('refused')) } };
  const warn = console.warn; console.warn = () => {};
  const r = await ensureFxWorklet(bad);
  console.warn = warn;
  ok(r === false, 'ensureFxWorklet: a refused addModule resolves false, never rejects');
}

console.log(`fx-worklet: ${pass}/${total}`);
if (pass !== total) { console.log(fails.map((f) => `  - ${f}`).join('\n')); process.exit(1); }
