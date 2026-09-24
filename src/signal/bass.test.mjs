// SIGNAL R1 · lane B · the bass against a FAKE AudioContext (no audio, no browser): the contract's defaults, the
// graph + every Q as written, the heat laws, the fold law, lowest-held + ROOT-LOCK, PULSE booking on the lattice
// (a two-bar walk), the hit law, SLIDE, the master stop, DIVE, GATE, set() validation.
// Run: source ~/.nvm/nvm.sh && node src/signal/bass.test.mjs   (exit 0 = green; prints `bass: N/N`)
import {
  createBass, defaultBassState, foldBass, mtof, bassLPf, bassDrv, bassSaw, bassSine, tauFromV, nodeQ, xToF,
  driveCurve,
} from './bass.ts';
import { generateBassPattern } from './bass-pattern.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const near = (a, b, eps = 1e-9) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= eps;
const canon = (x) => JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));

// ───────────────────────────── the fake Web Audio: params log their automation, nodes log their connections
class Param {
  constructor(v) { this.value = v; this.ev = []; }
  setValueAtTime(v, t) { this.ev.push({ k: 'set', v, t }); return this; }
  linearRampToValueAtTime(v, t) { this.ev.push({ k: 'lin', v, t }); return this; }
  exponentialRampToValueAtTime(v, t) { this.ev.push({ k: 'exp', v, t }); return this; }
  setTargetAtTime(v, t, tau) { this.ev.push({ k: 'target', v, t, tau }); return this; }
  cancelScheduledValues(t) { this.ev.push({ k: 'cancel', t }); return this; }
  last(k) { for (let i = this.ev.length - 1; i >= 0; i--) if (!k || this.ev[i].k === k) return this.ev[i]; return null; }
  all(k) { return this.ev.filter((e) => e.k === k); }
}
class Node {
  constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.outs = []; this.disconnected = false; ctx.nodes.push(this); }
  connect(dst) { this.outs.push(dst); return dst; }
  disconnect() { this.outs = []; this.disconnected = true; }
}
class Gain extends Node { constructor(c) { super(c, 'gain'); this.gain = new Param(1); } }
class Biquad extends Node { constructor(c) { super(c, 'biquad'); this.type = 'lowpass'; this.frequency = new Param(350); this.Q = new Param(1); this.detune = new Param(0); } }
class Shaper extends Node { constructor(c) { super(c, 'shaper'); this.curve = null; this.oversample = 'none'; } }
class Osc extends Node {
  constructor(c) { super(c, 'osc'); this.type = 'sine'; this.frequency = new Param(440); this.detune = new Param(0); this.startArg = null; this.stops = []; this.onended = null; c.oscs.push(this); }
  start(t) { this.startArg = t; }
  stop(t) { this.stops.push(t === undefined ? 0 : t); }
}
function makeCtx() {
  const c = { sampleRate: 48000, currentTime: 0, nodes: [], oscs: [] };
  c.createGain = () => new Gain(c);
  c.createBiquadFilter = () => new Biquad(c);
  c.createWaveShaper = () => new Shaper(c);
  c.createOscillator = () => new Osc(c);
  return c;
}
function rig(extra = {}) {
  const ctx = makeCtx();
  const duck = ctx.createGain(), drumsIn = ctx.createGain();
  const out = { ctx, duck, drumsIn, level: () => ({ peak: 0, rms: 0 }), muted: () => true, panic() {} };
  const bass = createBass({ ctx, out, effects: {}, ...extra });
  const drive = ctx.nodes.find((n) => n.kind === 'shaper' && n.oversample === '2x');
  const chain = []; for (let n = drive; n && chain.length < 24; n = n.outs[0]) { chain.push(n); if (n === duck) break; }
  const head = ctx.nodes.find((n) => n.outs.includes(drive));
  const lfo = ctx.oscs[0];
  return { ctx, out, bass, drive, chain, head, lfo, lfoAmt: lfo.outs[0], lp: chain[1], lp2: chain[2], gate: chain[12], gainNode: chain[13] };
}
// the lattice at 120 bpm, 48 k: a 16th = 6000 frames; bar 0 starts at frame 48000 (t = 1 s)
const line = (n, f16 = 6000, origin = 48000) => ({ frame: origin + n * f16, bar: Math.floor(n / 16), step: ((n % 16) + 16) % 16 });
// a hit's nodes (the per-hit oscs are the ones started with a time; voiceOscs makes them in BASS_OSCS order)
function hitsOf(ctx) {
  const os = ctx.oscs.filter((o) => typeof o.startArg === 'number');
  const res = [];
  for (let i = 0; i < os.length; i += 4) {
    const q = os.slice(i, i + 4); const f1 = q[0].outs[0].outs[0]; const f2 = f1.outs[0]; const env = f2 ? f2.outs[0] : null;
    res.push({ oscs: q, t: q[0].startArg, f1, f2, env });
  }
  return res;
}
const droneOscs = (ctx) => ctx.oscs.filter((o, i) => i > 0 && o.startArg === undefined && o.stops.length === 0);
const C1 = mtof(36);   // 65.406… Hz: where every C lands
const LEN120 = 0.225;  // the hit length at 120 bpm: min(clamp(.45·.5, .12, .4), .125·2·.9)

// ───────────────────────────── defaults
console.log('\n[defaults] the contract\'s BassState');
{
  const { bass, ctx } = rig();
  const seq = generateBassPattern(0.5, 0.3).map((c) => (c ? { v: c.v, oct: c.oct, slide: c.slide } : { v: 0, oct: 'base', slide: false }));
  const expected = { on: false, mode: 'drone', seq, root: null, armed: false, heat: 0.5, weight: 0.5, glide: 0, density: 0.5, groove: 0.3, cut: 1, cutDb: 0, lowcut: 0, lowcutDb: 0, gain: 1, mute: false };
  ok('state() equals the contract defaults (drone, .5/.5/0, .5/.3, glass open, unity)', canon(bass.state()) === canon(expected), canon(bass.state()));
  const s = bass.state();
  ok('the boot line = generateBassPattern(.5, .3): 3 . 2 . 3 . 2 . 3 2 . 2 . 2 . 2, no slide, no sub',
    s.seq.map((c) => c.v).join('') === '3020302032020202' && s.seq.every((c) => !c.slide && c.oct === 'base'));
  s.seq[0].v = 0; s.heat = 9;
  ok('state() is a copy (mutating it moves nothing)', bass.state().seq[0].v === 3 && bass.state().heat === 0.5);
  const a = defaultBassState(); a.seq[0].v = 0;
  ok('defaultBassState() is fresh per call', defaultBassState().seq[0].v === 3);
  ok('boot: only the LFO oscillator exists (the drone is off) and the target is the Studio\'s 65.4 Hz', ctx.oscs.length === 1 && ctx.oscs[0].startArg === undefined && bass.freq() === 65.4);
}

// ───────────────────────────── the graph
console.log('\n[graph] the chain, every Q as written');
{
  const { bass, ctx, out, chain, head, lfo, lfoAmt, lp } = rig();
  const kinds = chain.map((n) => (n.kind === 'biquad' ? n.type : n.kind)).join(' ');
  ok('synthGain 1 → drive 2× → LP → LP2 → out .8 → ① HP ×4 → ② LP ×4 → gate → gain → bus → out.duck',
    head && head.kind === 'gain' && head.gain.value === 1 && chain[0].oversample === '2x' &&
    kinds === 'shaper lowpass lowpass gain highpass highpass highpass highpass lowpass lowpass lowpass lowpass gain gain gain gain' &&
    chain[3].gain.value === 0.8 && chain[14] === bass.bus && chain[15] === out.duck, kinds);
  ok('Q: bassLP .7 · bassLP2 −6.02 · HP2..4 −3.01 · EqLP2..4 −3.01',
    chain[1].Q.value === 0.7 && chain[2].Q.value === -6.02 && [5, 6, 7, 9, 10, 11].every((i) => chain[i].Q.value === -3.01));
  const exDrive = bass.bus.outs[1], exShaper = exDrive && exDrive.outs[0], exHP = exShaper && exShaper.outs[0], exGain = exHP && exHP.outs[0];
  ok('bus → out.duck + the SUB exciter: drive → shaper 4× (driveCurve .5) → HP 140 Hz Q −3.01 → gain → out.duck',
    bass.bus.outs.length === 2 && bass.bus.outs[0] === out.duck && exShaper.oversample === '4x' &&
    canon(Array.from(exShaper.curve)) === canon(Array.from(driveCurve(0.5))) && exHP.type === 'highpass' &&
    exHP.frequency.value === 140 && exHP.Q.value === -3.01 && exGain.outs[0] === out.duck);
  ok('SUB .5 → exciter gain (.5−.4)/.6·.5 = .0833', near(exGain.gain.last('target').v, (0.1 / 0.6) * 0.5));
  ok('the bass lands on out.duck only (never drumsIn)',
    ctx.nodes.filter((n) => n.outs.includes(out.duck)).length === 2 && !ctx.nodes.some((n) => n.outs.includes(out.drumsIn)));
  ok('LFO: sine → depth → bassLP.detune; boot rate 2·tempo/60 = 4, then tempo/60 = 2 (applyBassMove)',
    lfo.type === 'sine' && lfoAmt.outs[0] === lp.detune && lfo.frequency.value === 4 && near(lfo.frequency.last('target').v, 2));
  ok('boot MOVE (pluck .6·.3 = .18) in DRONE: wobble .18²·750 = 24.3¢, bassLP Q .7 + .18·1.3 = .934',
    near(lfoAmt.gain.last('target').v, 24.3) && near(lp.Q.last('target').v, 0.934));
  const eqLP = chain[8], hp = chain[4];
  ok('tone glass open at boot, pinned at t = 0: ② 20 kHz Q nodeQ(0) = −3.01, its poles 20 kHz; ① 20 Hz Q −3.01, its poles 10 Hz',
    near(eqLP.frequency.last('set').v, 20000, 1e-6) && eqLP.frequency.last('set').t === 0 && eqLP.Q.last('set').v === -3.01 &&
    [9, 10, 11].every((i) => near(chain[i].frequency.last('set').v, 20000)) &&
    near(hp.frequency.last('set').v, 20) && hp.Q.last('set').v === -3.01 && [5, 6, 7].every((i) => near(chain[i].frequency.last('set').v, 10)));
  ok('drive curve at boot = driveCurve(bassDrv(.5) = .1)', canon(Array.from(chain[0].curve)) === canon(Array.from(driveCurve(0.1))));
}

// ───────────────────────────── the laws
console.log('\n[laws] heat · SUB · GLIDE (core.ts:1489-1492, bass.ts:27-30)');
{
  const H = [0, 0.25, 0.5, 0.75, 1];
  ok('bassLPf 260 · 450 · 640 · 2120 · 3600 Hz', H.map(bassLPf).every((v, i) => near(v, [260, 450, 640, 2120, 3600][i], 1e-9)));
  ok('bassDrv .30 · .20 · .10 · .36 · .62 (minimum at the .5 detent)', H.map(bassDrv).every((v, i) => near(v, [0.3, 0.2, 0.1, 0.36, 0.62][i], 1e-12)));
  ok('bassSaw .07 · .125 · .18 · .34 · .50', H.map(bassSaw).every((v, i) => near(v, [0.07, 0.125, 0.18, 0.34, 0.5][i], 1e-12)));
  ok('bassSine(.5) = .825 · GLIDE τ 8 ms at 0, 300 ms at 1', near(bassSine(0.5), 0.825) && near(tauFromV(0), 0.008) && near(tauFromV(1), 0.3));
}

// ───────────────────────────── the fold
console.log('\n[fold] halve, then 45..115 Hz: every C lands on 65.41 Hz');
{
  const cs = []; for (let m = 0; m <= 120; m += 12) cs.push(m);
  ok('every C (MIDI 0..120) → 65.41 Hz', cs.every((m) => near(foldBass(mtof(m)), C1, 1e-9) && foldBass(mtof(m)).toFixed(2) === '65.41'));
  let inWin = true; for (let m = 0; m <= 127; m++) { const f = foldBass(mtof(m)); if (!(f >= 45 && f <= 115)) inWin = false; }
  ok('every MIDI 0..127 folds into 45..115 Hz', inWin);
  const { bass } = rig();
  ok('held([C2..C7]) → freq() 65.41 each', [36, 48, 60, 72, 84, 96].every((m) => { bass.held([m]); return near(bass.freq(), C1); }));
  bass.held([45]); const a2 = bass.freq(); bass.held([57]); const a3 = bass.freq(); bass.held([69]); const a4 = bass.freq();
  ok('A lands on 55 or 110 Hz by octave (the window is wider than an octave)', near(a2, 55) && near(a3, 110) && near(a4, 110));
  const r = rig(); r.bass.held([62]); r.bass.set('mode', 'pluck'); r.bass.set('on', true); r.bass.book(line(0));
  const [h] = hitsOf(r.ctx); const D = foldBass(mtof(62));
  ok('a PLUCK hit sits on the folded target: saws ∓11¢ + square at 73.42 Hz, the sub sine at 36.71',
    near(h.oscs[0].frequency.value, D) && h.oscs[0].detune.value === -11 && h.oscs[1].detune.value === 11 &&
    h.oscs[2].type === 'square' && near(h.oscs[2].frequency.value, D) && h.oscs[3].type === 'sine' && near(h.oscs[3].frequency.value, D / 2));
}

// ───────────────────────────── follow + lock
console.log('\n[pitch] lowest held · stay after release · ROOT-LOCK (armed + pinned)');
{
  const { bass } = rig();
  bass.held([67, 60, 64]);
  ok('the lowest held note wins, whatever the order', near(bass.freq(), C1));
  bass.held([57]); bass.held([]); bass.held([]);
  ok('after a release the bass stays on the last target (B #8), not a chord\'s fifth', near(bass.freq(), 110));
  bass.held([50, 'x', NaN, undefined]); const d3 = foldBass(mtof(50)); bass.held(undefined);
  ok('held() ignores garbage and a missing list (= nothing held: stay)', near(bass.freq(), d3));
}
{
  const { bass } = rig();
  bass.held([]); bass.set('armed', true);
  ok('arming with nothing held stays armed, root null', bass.state().armed === true && bass.state().root === null);
  bass.held([]);
  ok('a call with no onset leaves the lock armed', bass.state().armed === true && bass.state().root === null);
  bass.held([64, 62]);
  ok('armed + an onset pins the LOWEST note (MIDI) and disarms', bass.state().root === 62 && bass.state().armed === false && near(bass.freq(), foldBass(mtof(62))));
  bass.held([57]); bass.held([40, 57]); bass.held([]);
  ok('a pinned root outranks every held note, folded at use', near(bass.freq(), foldBass(mtof(62))) && bass.state().root === 62);
}
{
  const { bass } = rig();
  bass.held([65, 60]); bass.set('armed', true);
  ok('arming with keys down pins the lowest at once (armBassLock = an onset)', bass.state().root === 60 && bass.state().armed === false);
}
{
  const { bass } = rig();
  bass.held([]); bass.set('armed', true); bass.set('root', 62);
  ok('set(root, m) pins and disarms', bass.state().root === 62 && bass.state().armed === false && near(bass.freq(), foldBass(mtof(62))));
  bass.set('armed', true);   // nothing held → armed, root kept? no: arming never unpins; the view unpins first
  bass.set('root', null);
  ok('set(root, null) unpins and leaves armed alone', bass.state().root === null && bass.state().armed === true);
  bass.held([57]);
  ok('…and the next onset is captured', bass.state().root === 57 && bass.state().armed === false);
  bass.set('root', null);
  ok('unpinned, the target returns to the lowest held note', near(bass.freq(), 110) && bass.state().root === null);
  bass.set('root', 'x');
  ok('a non-number root is ignored', bass.state().root === null);
  bass.set('root', 38);
  ok('the root is kept as MIDI and folded at use (38 → 73.42 Hz)', bass.state().root === 38 && near(bass.freq(), foldBass(mtof(38))));
}
{
  const { bass, ctx } = rig();
  ctx.currentTime = 0.5; bass.set('on', true);
  const ds = droneOscs(ctx);
  ok('ON in DRONE starts the four drone oscillators on the target (65.4 Hz, the sub at half)',
    ds.length === 4 && ds.every((o) => near(o.frequency.value, 65.4 * o._mul)) && ds[3]._mul === 0.5);
  bass.held([57]);
  ok('a new target glides every drone osc with the GLIDE τ (8 ms at 0)', ds.every((o) => { const e = o.frequency.last('target'); return near(e.v, 110 * o._mul) && near(e.tau, 0.008) && e.t === 0.5; }));
  bass.set('glide', 1);
  ok('GLIDE 1 re-glides the drone live with τ 300 ms', ds.every((o) => near(o.frequency.last('target').tau, 0.3)));
  bass.held([45]);
  ok('…and the next move uses it', ds.every((o) => { const e = o.frequency.last('target'); return near(e.v, 55 * o._mul) && near(e.tau, 0.3); }));
  ok('the drone\'s saws carry ±11¢ ± 3¢ (the uniform draw), square + sub 0', ds[0]._bd >= -14 && ds[0]._bd <= -8 && ds[1]._bd >= 8 && ds[1]._bd <= 14 && ds[2]._bd === 0 && ds[3]._bd === 0);
}

// ───────────────────────────── PULSE booking
console.log('\n[pulse] PULSE 2 sixteenths on the lattice: a two-bar walk of the 16 cells');
{
  const { bass, ctx } = rig();
  bass.set('mode', 'seq'); bass.set('on', true);
  for (let n = 0; n < 32; n++) bass.book(line(n));
  const hs = hitsOf(ctx);
  const want = [0, 4, 8, 12, 16, 18, 22, 26, 30];   // n = 2i for the cells with v > 0 (i = 0 2 4 6 8 9 11 13 15)
  ok('SEQ: 9 hits over two bars, only on even 16ths, at b.frame/sr', hs.length === 9 && hs.every((h, i) => near(h.t, (48000 + want[i] * 6000) / 48000)), hs.map((h) => h.t).join());
  bass.book(line(32)); bass.book(line(33));
  const h32 = hitsOf(ctx)[9];
  ok('n = 32 (bar 2) plays cell 0 again: the 16 cells are a two-bar strip', hitsOf(ctx).length === 10 && near(h32.env.gain.all('exp')[0].v, 0.5));
  const peaks = hs.map((h) => h.env.gain.all('exp')[0].v);
  ok('cells 8 (v3) and 9 (v2) land on n 16 (bar 1, step 0) and n 18', near(peaks[4], 0.5) && near(peaks[5], 0.375));
  bass.set('seq', Array.from({ length: 16 }, () => ({ v: 2, oct: 'base', slide: false })));
  const before = hitsOf(ctx).length; for (let n = 35; n < 48; n += 2) bass.book(line(n));
  ok('odd 16ths never fire, even with every cell set', hitsOf(ctx).length === before);
}
{
  const { bass, ctx } = rig();
  bass.set('mode', 'pluck'); bass.set('on', true);
  for (let n = 0; n < 16; n++) bass.book(line(n));
  const hs = hitsOf(ctx);
  ok('PLUCK: a plain hit every pulse (8 per bar), vel 1 → peak .5, attack 14 ms',
    hs.length === 8 && hs.every((h) => { const e = h.env.gain.all('exp')[0]; return near(e.v, 0.5) && near(e.t - h.t, 0.014); }));
  const r = rig(); r.bass.set('on', true); for (let n = 0; n < 16; n++) r.bass.book(line(n));
  const r2 = rig(); r2.bass.set('mode', 'seq'); for (let n = 0; n < 16; n++) r2.bass.book(line(n));
  ok('DRONE books nothing; OFF books nothing', hitsOf(r.ctx).length === 0 && hitsOf(r2.ctx).length === 0);
}
{
  const { bass, ctx } = rig();
  bass.set('mode', 'seq'); bass.set('on', true);
  bass.set('seq', [{ v: 3, oct: 'base', slide: false }, { v: 2, oct: 'base', slide: false }, { v: 1, oct: 'base', slide: false }]);
  bass.book(line(0)); bass.book(line(2)); bass.book(line(4));
  const [a, b, c] = hitsOf(ctx);
  const env = (h) => h.env.gain.ev;
  ok('accent v3: .0001 → .5 in 6 ms → .012 at t + len → 0 at + 20 ms (len .225 at 120 bpm)',
    canon(env(a)) === canon([{ k: 'set', v: 0.0001, t: a.t }, { k: 'exp', v: 0.5, t: a.t + 0.006 }, { k: 'exp', v: 0.012, t: a.t + LEN120 }, { k: 'lin', v: 0, t: a.t + LEN120 + 0.02 }]), canon(env(a)));
  ok('v2 → .375 in 14 ms, tail .009; v1 → .175, tail .012·.4', near(env(b)[1].v, 0.375) && near(env(b)[1].t - b.t, 0.014) && near(env(b)[2].v, 0.009) &&
    near(env(c)[1].v, 0.175) && near(env(c)[2].v, 0.012 * 0.4));
  ok('oscs start at t, stop at t + len + 40 ms', a.oscs.every((o) => near(o.startArg, a.t) && o.stops.length === 1 && near(o.stops[0], a.t + LEN120 + 0.04)));
  ok('per-osc levels: saw .18 · square .09 · sub .825 (heat .5, SUB .5)',
    [0.18, 0.18, 0.09, 0.825].every((v, i) => near(a.oscs[i].outs[0].gain.value, v)));
  const fl = (h) => h.f1.frequency.ev;
  ok('filter pair: f1 Q 6 + 8·heat = 10, f2 Q −6.02', a.f1.Q.value === 10 && a.f2.Q.value === -6.02 && a.f1.type === 'lowpass' && a.f2.type === 'lowpass');
  ok('squelch: 640 → 2164 Hz (plain) in 3 ms, back with τ .3388; accent 3078; f2 the same sweep',
    near(fl(b)[0].v, 640) && near(fl(b)[1].v, 640 + 2000 * (0.6 + 0.18 * 0.9)) && near(fl(b)[1].t - b.t, 0.003) &&
    near(fl(b)[2].tau, 0.06 + 0.82 * 0.34) && near(fl(a)[1].v, 640 + 2000 * 1.6 * 0.762) && canon(b.f2.frequency.ev) === canon(fl(b)));
}
{
  const { bass, ctx } = rig();
  bass.held([60]); bass.set('mode', 'seq'); bass.set('on', true);
  bass.set('seq', [{ v: 2, oct: 'sub', slide: false }]);
  bass.book(line(0)); const [h] = hitsOf(ctx);
  ok('a sub cell plays an octave down (saws at target/2, the sub sine at target/4)', near(h.oscs[0].frequency.value, C1 / 2) && near(h.oscs[3].frequency.value, C1 / 4));
}
{
  const r = rig(); r.bass.set('mode', 'pluck'); r.bass.set('on', true);
  r.bass.book(line(0, 7500)); r.bass.book(line(2, 7500));
  const [a, b] = hitsOf(r.ctx); const len = (h) => h.env.gain.all('exp')[1].t - h.t;
  ok('no Timekeeper: the first line uses 120 (len .225), then the lattice spacing (7500 frames = 96 bpm → .28125)', near(len(a), 0.225) && near(len(b), 0.28125));
  const g = rig({ time: { bpm: () => 96 } }); g.bass.set('mode', 'pluck'); g.bass.set('on', true); g.bass.book(line(0, 7500));
  ok('deps.time (the Timekeeper\'s bpm) wins from the first line', near(len(hitsOf(g.ctx)[0]), 0.28125));
  const q = rig(); q.bass.book(line(0, 7500)); q.bass.book(line(1, 7500));
  ok('the lattice\'s tempo re-times the drone LFO (96 bpm → 1.6 Hz)', near(q.lfo.frequency.last('target').v, 1.6));
}

// ───────────────────────────── SLIDE
console.log('\n[slide] a slid cell ramps from the previous base');
{
  const { bass, ctx } = rig();
  bass.set('mode', 'seq'); bass.set('on', true);
  bass.set('seq', [{ v: 2, oct: 'base', slide: true }, { v: 2, oct: 'base', slide: true }, { v: 2, oct: 'base', slide: true }]);
  bass.held([60]); bass.book(line(0));
  bass.held([62]); bass.book(line(2));
  const [a, b] = hitsOf(ctx); const D = foldBass(mtof(62));
  ok('the first hit never glides (lastBase 0): its oscs jump', a.oscs.every((o) => o.frequency.ev.length === 0 && near(o.frequency.value, C1 * [1, 1, 1, 0.5][a.oscs.indexOf(o)])));
  ok('the slid hit ramps each osc linearly from the previous base (in its own octave) over 20 ms (GLIDE 0 → clamp .02)',
    b.oscs.every((o, i) => { const m = [1, 1, 1, 0.5][i]; const [s0, s1] = o.frequency.ev; return s0.k === 'set' && near(s0.v, C1 * m) && near(s0.t, b.t) && s1.k === 'lin' && near(s1.v, D * m) && near(s1.t, b.t + 0.02); }));
  ok('a slid hit softens: attack 45 ms, squelch halved (640 → 1402 Hz)', near(b.env.gain.all('exp')[0].t - b.t, 0.045) && near(b.f1.frequency.ev[1].v, 640 + 2000 * 0.5 * 0.762));
  bass.set('glide', 1); bass.held([57]); bass.book(line(4));
  const c = hitsOf(ctx)[2];
  ok('GLIDE 1 (τ .3) → the slide takes min(.12, .6·len) = .12 s from the last base', near(c.oscs[0].frequency.ev[0].v, D) && near(c.oscs[0].frequency.ev[1].t - c.t, 0.12));
}

// ───────────────────────────── the master stop
console.log('\n[stop] cancel the booked, ramp the sounding ≤ 5 ms, drone τ 10 ms');
{
  const { bass, ctx } = rig();
  bass.set('mode', 'seq'); bass.set('on', true);
  bass.book(line(0));            // t = 1.0 (accent): sounding at 1.1
  bass.book(line(16));           // t = 2.0 (cell 8, accent): not started at 1.1
  const [a, b] = hitsOf(ctx);
  ctx.currentTime = 1.1; bass.stop();
  ok('an unstarted hit is cancelled: every osc stopped at 0 (before its start), onended cleared, its nodes gone',
    b.oscs.every((o) => o.stops[o.stops.length - 1] === 0 && o.onended === null) && b.f1.disconnected && b.f2.disconnected && b.env.disconnected);
  const ev = a.env.gain.ev, i = ev.findIndex((e) => e.k === 'cancel');
  const v = 0.5 * Math.pow(0.012 / 0.5, (0.1 - 0.006) / (LEN120 - 0.006));
  ok('a sounding hit: cancel at now, hold its envelope\'s value now, straight to 0 in 5 ms',
    i > 0 && ev[i].t === 1.1 && ev[i + 1].k === 'set' && near(ev[i + 1].v, v, 1e-12) && ev[i + 1].t === 1.1 && ev[i + 2].k === 'lin' && ev[i + 2].v === 0 && near(ev[i + 2].t, 1.105) && ev.length === i + 3);
  ok('…and its oscillators stop 30 ms on', a.oscs.every((o) => near(o.stops[o.stops.length - 1], 1.13)));
  const n = a.env.gain.ev.length; ctx.currentTime = 1.102; bass.stop();
  ok('a second stop never re-opens a dying hit', a.env.gain.ev.length === n);
  ok('stop() powers off; nothing books after it', bass.state().on === false && (bass.book(line(32)), hitsOf(ctx).length === 2));
}
{
  const { bass, ctx } = rig();
  ctx.currentTime = 0.5; bass.set('on', true); bass.set('root', 62); bass.set('heat', 0.7); bass.setStep(3, { v: 1, oct: 'sub', slide: true });
  const ds = droneOscs(ctx), droneGain = ds[0].outs[0].outs[0];
  ok('the drone fades in through its own gain (0 → .2, τ .25 s)', droneGain.gain.value === 0 && canon(droneGain.gain.last('target')) === canon({ k: 'target', v: 0.2, t: 0.5, tau: 0.25 }));
  ctx.currentTime = 1; bass.stop();
  ok('stop(): the drone falls with τ 10 ms and its oscillators stop 120 ms on', canon(droneGain.gain.last('target')) === canon({ k: 'target', v: 0, t: 1, tau: 0.01 }) && ds.every((o) => near(o.stops[0], 1.12)));
  const s = bass.state();
  ok('root, lock, pattern and knobs survive the stop', s.on === false && s.root === 62 && s.heat === 0.7 && canon(s.seq[3]) === canon({ v: 1, oct: 'sub', slide: true }));
}
{
  const { bass, ctx } = rig();
  bass.set('mode', 'seq'); bass.set('on', true);
  bass.book(line(0)); bass.book(line(8));   // t 1.0 and 1.5
  const [a, b] = hitsOf(ctx);
  ctx.currentTime = 1.05; bass.set('on', false);
  ok('power off cancels the hit booked ahead but lets the sounding one ring', b.oscs.every((o) => o.stops.at(-1) === 0) && a.oscs.every((o) => o.stops.length === 1) && !a.env.gain.ev.some((e) => e.k === 'cancel'));
  const r = rig(); r.bass.set('mode', 'seq'); r.bass.set('on', true); r.bass.book(line(8)); r.ctx.currentTime = 1.05;
  const [x] = hitsOf(r.ctx); r.bass.set('mode', 'drone');
  ok('SEQ → DRONE cancels the booked hits and starts the drone', x.oscs.every((o) => o.stops.at(-1) === 0) && droneOscs(r.ctx).length === 4);
  const p = rig(); p.bass.set('mode', 'seq'); p.bass.set('on', true); p.bass.book(line(8)); p.ctx.currentTime = 1.05;
  const [y] = hitsOf(p.ctx); p.bass.set('mode', 'pluck');
  ok('SEQ → PLUCK keeps what is booked (both are pulse modes)', y.oscs.every((o) => o.stops.length === 1));
}

// ───────────────────────────── gestures
console.log('\n[gestures] DIVE (drone detune, booked hits bent) · GATE (bassGate chops)');
{
  const { bass, ctx } = rig();
  ctx.currentTime = 0.5; bass.set('on', true);
  const ds = droneOscs(ctx);
  bass.gesture('dive', true, 1200);
  ok('dive: every drone osc glides to its base detune − 1200¢ (a dive is always down) with τ .45 s',
    ds.every((o) => { const e = o.detune.last('target'); return near(e.v, o._bd - 1200) && e.tau === 0.45 && e.t === 0.5; }));
  bass.gesture('dive', true, 1200); const n = ds[0].detune.ev.length;
  ok('a repeated dive-on is a no-op', ds[0].detune.ev.length === n);
  bass.gesture('dive', false);
  ok('release: back to the base detune with τ .07 s', ds.every((o) => { const e = o.detune.last('target'); return near(e.v, o._bd) && e.tau === 0.07; }));
  const r = rig(); r.bass.gesture('dive', true, -1200); r.bass.set('on', true);
  ok('a drone started mid-dive starts bent', droneOscs(r.ctx).every((o) => near(o.detune.value, o._bd - 1200)));
  // [R2] DIVE SPEED reaches the bass: the 4th argument is the fall's τ (core.ts:1879's diveTime), the return stays .07
  const q = rig(); q.ctx.currentTime = 0.5; q.bass.set('on', true);
  const qs = droneOscs(q.ctx), fall = () => qs.map((o) => o.detune.last('target').tau);
  q.bass.gesture('dive', true, -2400, 1.5);
  ok('[R2] dive with a τ (DIVE SPEED 1.5 s, the dial\'s slow end): every drone osc falls with τ 1.5, to −2400¢',
    fall().every((t) => t === 1.5) && qs.every((o) => near(o.detune.last('target').v, o._bd - 2400)), JSON.stringify(fall()));
  q.bass.gesture('dive', false);
  ok('[R2] …and comes back on the literal .07, whatever the speed', fall().every((t) => t === 0.07));
  q.bass.gesture('dive', true, -2400);
  ok('[R2] the speed holds until the next one (the Studio\'s parameter): a 3-argument dive falls with 1.5 again', fall().every((t) => t === 1.5));
  q.bass.gesture('dive', false); q.bass.gesture('dive', true, -2400, 9);
  const hi = fall()[0]; q.bass.gesture('dive', false); q.bass.gesture('dive', true, -2400, 0.001);
  ok('[R2] the τ is clamped as the Studio\'s diveTime: .02..2 s', hi === 2 && fall().every((t) => t === 0.02), `${hi} ${fall()[0]}`);
  q.bass.gesture('dive', false); q.bass.gesture('dive', true, -2400, NaN);
  ok('[R2] a non-number τ is ignored (the last one stands)', fall().every((t) => t === 0.02));
  const p = rig(); p.bass.held([60]); p.bass.set('mode', 'pluck'); p.bass.set('on', true);
  p.bass.gesture('dive', true); p.bass.book(line(0)); p.bass.gesture('dive', false); p.bass.book(line(2));
  const [a, b] = hitsOf(p.ctx);
  ok('a hit booked mid-dive starts bent (default −2400¢ = two octaves down); after the dive, unbent',
    near(a.oscs[0].frequency.value, C1 / 4) && near(b.oscs[0].frequency.value, C1));
}
{
  const { bass, ctx, gate } = rig();
  ctx.currentTime = 1.9; bass.book(line(8));    // the latest lattice line: t = 2.0 (bar 0, step 8)
  bass.gesture('gate', true, 0.125);
  const chop = (t, sd) => [{ k: 'cancel', t }, { k: 'set', v: 1, t }, { k: 'lin', v: 0.06, t: t + 0.012 }, { k: 'set', v: 0.06, t: t + sd * 0.55 }, { k: 'lin', v: 1, t: t + sd * 0.9 }];
  ok('gate: one chop on the latest lattice line: 1 → .06 in 12 ms, held to .55·sd, back to 1 by .9·sd', canon(gate.gain.ev) === canon(chop(2, 0.125)), canon(gate.gain.ev));
  bass.gesture('gate', true, 0.125);
  ok('the next call chains at + sd (2.125)', canon(gate.gain.ev.slice(5)) === canon(chop(2.125, 0.125)));
  ctx.currentTime = 1.95; bass.gesture('gate', false);
  ok('gate off: cancel (no cancelAndHold here) + τ .03 back to 1', canon(gate.gain.ev.slice(-2)) === canon([{ k: 'cancel', t: 1.95 }, { k: 'target', v: 1, t: 1.95, tau: 0.03 }]));
  bass.chop(3, 0.1); const m = gate.gain.ev.length;
  ok('chop(when, sd) books exactly at `when`', canon(gate.gain.ev.slice(-5)) === canon(chop(3, 0.1)));
  bass.gesture('gate', true, 0.1);
  ok('after an exact chop, the run\'s gesture on-calls add nothing', gate.gain.ev.length === m);
  bass.releaseGate(); ctx.currentTime = 1.96; bass.gesture('gate', true, 0.1);
  ok('releaseGate() ends the run: the next on-call chops again (latest line 2.0)', canon(gate.gain.ev.slice(-5)) === canon(chop(2, 0.1)));
  const h = rig(); h.gate.gain.cancelAndHoldAtTime = function (t) { this.ev.push({ k: 'hold', t }); return this; };
  h.ctx.currentTime = 0.3; h.bass.gesture('gate', false);
  ok('releaseGate uses cancelAndHoldAtTime where the browser has it', canon(h.gate.gain.ev) === canon([{ k: 'hold', t: 0.3 }, { k: 'target', v: 1, t: 0.3, tau: 0.03 }]));
  const s = rig(); s.bass.set('on', true); s.ctx.currentTime = 0.2; s.bass.gesture('gate', true, 0.125); s.bass.stop();
  ok('stop() opens the gate', canon(s.gate.gain.ev.slice(-2)) === canon([{ k: 'cancel', t: 0.2 }, { k: 'target', v: 1, t: 0.2, tau: 0.03 }]));
}

// ───────────────────────────── set()
console.log('\n[set] laws on the nodes, garbage ignored');
{
  const { bass } = rig();
  bass.set('heat', NaN); bass.set('mode', 'nope'); bass.set('glide', -1);
  ok('garbage never moves a knob (NaN heat, unknown mode), ranges clamp (glide −1 → 0)', bass.state().heat === 0.5 && bass.state().mode === 'drone' && bass.state().glide === 0);
  bass.set('heat', 2); bass.set('gain', 3); bass.set('cutDb', -40); bass.set('lowcutDb', 40);
  ok('heat → 1, gain → 1.25, node dB → −24..+18 (the glass\'s range)', bass.state().heat === 1 && bass.state().gain === 1.25 && bass.state().cutDb === -24 && bass.state().lowcutDb === 18);
  bass.set('seq', [0, { v: 3, oct: 'sub', slide: 1 }, { v: 7 }, null, { v: 2, oct: -1 }]);
  const s = bass.state().seq;
  ok('set(seq) normalizes Studio cells and foreign saves into 16 BassSteps',
    s.length === 16 && canon(s[0]) === canon({ v: 0, oct: 'base', slide: false }) && canon(s[1]) === canon({ v: 3, oct: 'sub', slide: true }) &&
    s[2].v === 0 && s[3].v === 0 && s[4].oct === 'sub' && s.slice(5).every((c) => c.v === 0));
  bass.setStep(16, { v: 2, oct: 'base', slide: false }); bass.setStep(-1, { v: 2, oct: 'base', slide: false }); bass.setStep(5, { v: 2, oct: 'base', slide: false });
  ok('setStep writes 0..15 only', bass.state().seq[5].v === 2 && bass.state().seq.length === 16);
}
{
  const { bass, ctx } = rig();
  bass.set('groove', 0.9);
  ok('set(groove) keeps the pattern (the view calls regenerate)', bass.state().seq.map((c) => c.v).join('') === '3020302032020202');
  bass.set('density', 1); bass.regenerate();
  const want = generateBassPattern(1, 0.9).map((c) => (c ? { v: c.v, oct: c.oct, slide: c.slide } : { v: 0, oct: 'base', slide: false }));
  ok('regenerate() = generateBassPattern(density, groove)', canon(bass.state().seq) === canon(want));
  bass.set('mode', 'pluck'); bass.set('on', true); bass.book(line(0));
  const [h] = hitsOf(ctx), f = h.f1.frequency.ev;
  ok('pluck = .6·groove (.54): squelch 640 + 2000·(.6 + .54·.9), fall τ .06 + .46·.34', near(f[1].v, 640 + 2000 * (0.6 + 0.54 * 0.9)) && near(f[2].tau, 0.06 + 0.46 * 0.34));
}
{
  const { bass, ctx, chain, lp, lp2, lfoAmt } = rig();
  ctx.currentTime = 0.5; bass.set('on', true); const ds = droneOscs(ctx);
  bass.set('heat', 1);
  ok('heat 1: drive curve driveCurve(.62), the drone\'s shared pair → 3600 Hz, saws .5 / square .25',
    canon(Array.from(chain[0].curve)) === canon(Array.from(driveCurve(0.62))) && lp.frequency.last('target').v === 3600 && lp2.frequency.last('target').v === 3600 &&
    near(ds[0].outs[0].gain.last('target').v, 0.5) && near(ds[2].outs[0].gain.last('target').v, 0.25));
  bass.set('weight', 1);
  ok('SUB 1: the drone sub sine 1.2, the exciter .5', near(ds[3].outs[0].gain.last('target').v, 1.2) && near(bass.bus.outs[1].outs[0].outs[0].outs[0].gain.last('target').v, 0.5));
  bass.set('heat', 0.5); bass.set('mode', 'seq');
  ok('SEQ opens the shared pair to 16 kHz, zeroes the wobble, bassLP Q .7', lp.frequency.last('target').v === 16000 && lp2.frequency.last('target').v === 16000 && lfoAmt.gain.last('target').v === 0 && lp.Q.last('target').v === 0.7);
  bass.set('mode', 'drone');
  ok('DRONE narrows it back to bassLPf(heat) and restores the wobble', lp.frequency.last('target').v === 640 && near(lfoAmt.gain.last('target').v, 24.3));
}
{
  const { bass, ctx, chain, gainNode } = rig();
  bass.set('gain', 0.5);
  ok('gain at t = 0 is pinned (setValueAtTime)', canon(gainNode.gain.last()) === canon({ k: 'set', v: 0.5, t: 0 }));
  ctx.currentTime = 1; bass.set('mute', true);
  ok('mute: the gain node → 0 with τ 20 ms (the bus is left to the solo)', canon(gainNode.gain.last()) === canon({ k: 'target', v: 0, t: 1, tau: 0.02 }) && bass.bus.gain.ev.length === 0);
  bass.set('mute', false);
  ok('unmute restores the gain', near(gainNode.gain.last().v, 0.5));
  bass.set('cut', 0.5); bass.set('cutDb', 6); bass.set('lowcut', 0.5);
  const x5 = xToF(0.5);
  ok('② cut .5 → bassEqLP and its three slope poles at xToF(.5) = 632 Hz; cutDb 6 → Q nodeQ(6) = 12',
    near(chain[8].frequency.last('target').v, x5) && [9, 10, 11].every((i) => near(chain[i].frequency.last('target').v, x5)) && near(chain[8].Q.last('target').v, nodeQ(6)) && nodeQ(6) === 12);
  ok('① lowcut .5 → bassHP and its three poles at 632 Hz', near(chain[4].frequency.last('target').v, x5) && [5, 6, 7].every((i) => near(chain[i].frequency.last('target').v, x5, 1e-6)));
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}: ${pass} passed, ${fail} failed\n`);
console.log(`bass: ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
