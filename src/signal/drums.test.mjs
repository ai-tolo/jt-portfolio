// SIGNAL · lane D · drums.ts + kit.ts against a FAKE AudioContext (no audio anywhere): every AudioParam records its
// automation calls, every BufferSource records start/stop, currentTime is settable. What it pins: the defaults are
// the contract's; regenerate() is generateDrumPattern(density, 0.3, pattern); booking lands the right lanes on the
// right frames (FLOOR at .5); the swing law in frames (step 2 vs 3) and the kick never swings; the humanize bounds;
// stop() un-books a future voice and ramps a sounding one, zeroes the delay and closes the stop gate; the gate
// reopens on the next voice; the delay, TEXTURE, cover/low-cut and gain laws; the tracked-voice registry; kit.ts (R2: the
// six hits fetched from <root>/kit/<lane>.m4a, the shipped files checked byte for byte against the repo's DRUMKIT).
//   source ~/.nvm/nvm.sh && node src/signal/drums.test.mjs
import { createDrums, defaultDrumsState, patternSeq } from './drums.ts';
import { decodeKit, kitUrl, KIT_DIR, LANE_KIT_KEY } from './kit.ts';
import { generateDrumPattern } from './drum-pattern.ts';
import { DRUM_LANES, RIP_ROOT } from './types.ts';
import { DRUMKIT } from '../components/signal-drumkit.ts';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUB = join(dirname(fileURLToPath(import.meta.url)), '../../public');

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const SR = 48000;

// ─────────────────────────────────────────────────────────────── the fake
class Param {
  constructor(v) { this.value = v; this.calls = []; }
  setValueAtTime(v, t) { this.calls.push(['set', v, t]); this.value = v; return this; }
  setTargetAtTime(v, t, tau) { this.calls.push(['target', v, t, tau]); return this; }
  linearRampToValueAtTime(v, t) { this.calls.push(['ramp', v, t]); return this; }
  cancelScheduledValues(t) { this.calls.push(['cancel', t]); return this; }
  last(kind) { for (let i = this.calls.length - 1; i >= 0; i--) if (this.calls[i][0] === kind) return this.calls[i]; return null; }
  /** the value the automation is heading to (last target/set), else .value */
  aim() { const c = this.calls[this.calls.length - 1]; return c && (c[0] === 'target' || c[0] === 'set' || c[0] === 'ramp') ? c[1] : this.value; }
}
class Node {
  constructor(ctx, kind) { this.kind = kind; this.outs = []; this.disconnects = 0; ctx.nodes.push(this); }
  connect(n) { this.outs.push(n); return n; }
  disconnect() { this.disconnects++; this.outs = []; }
}
function fakeCtx() {
  const ctx = {
    sampleRate: SR, currentTime: 0, state: 'running', nodes: [], sources: [], decodes: [], failLanes: new Set(),
    createGain() { const n = new Node(ctx, 'gain'); n.gain = new Param(1); return n; },
    createBiquadFilter() { const n = new Node(ctx, 'biquad'); n.type = 'lowpass'; n.frequency = new Param(350); n.Q = new Param(1); n.gain = new Param(0); return n; },
    createWaveShaper() { const n = new Node(ctx, 'shaper'); n.curve = null; n.oversample = 'none'; return n; },
    createDelay(max) { const n = new Node(ctx, 'delay'); n.max = max; n.delayTime = new Param(0); return n; },
    createStereoPanner() { const n = new Node(ctx, 'pan'); n.pan = new Param(0); return n; },
    createDynamicsCompressor() {
      const n = new Node(ctx, 'comp');
      for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = new Param(0);
      return n;
    },
    createBufferSource() {
      const n = new Node(ctx, 'src');
      n.buffer = null; n.playbackRate = new Param(1); n.onended = null; n.startAt = null; n.stops = [];
      n.start = (when = 0) => { if (n.startAt !== null) throw new Error('started twice'); n.startAt = when; };
      n.stop = (when = 0) => { n.stops.push(when); };
      ctx.sources.push(n);
      return n;
    },
    decodeAudioData(ab) {
      ctx.decodes.push(ab);
      const bytes = new Uint8Array(ab);
      const i = ctx.decodes.length - 1;
      if (ctx.failLanes.has(i)) return Promise.reject(new Error('EncodingError'));
      return Promise.resolve({ duration: 0.5, length: 24000, sampleRate: SR, numberOfChannels: 2, bytes });
    },
  };
  return ctx;
}
function fakeKit() {
  const kit = {};
  for (const l of DRUM_LANES) kit[l] = { lane: l, duration: l === 'openhat' ? 1.6 : 0.5, length: 0, sampleRate: SR, numberOfChannels: 2 };
  return kit;
}
const laneOf = (kit, src) => DRUM_LANES.find((l) => kit[l] === src.buffer);
function rig(opts = {}) {
  const ctx = fakeCtx();
  const out = { ctx, duck: ctx.createGain(), drumsIn: ctx.createGain(), level: () => ({ peak: 0, rms: 0 }), muted: () => true, panic() {} };
  const ducks = [];
  const effects = { duckHit(when, sc, beat) { ducks.push([when, sc, beat]); } };
  const kit = opts.kit || fakeKit();
  let g = { sr: SR, barFrames: opts.barFrames || 96000, originFrame: opts.origin ?? 50400 };
  const time = opts.noTime ? undefined : { grid: () => g, bpm: () => (240 * SR) / g.barFrames };
  const drums = createDrums({ ctx, out, effects, kit, time });
  const biquads = ctx.nodes.filter((n) => n.kind === 'biquad');
  const gains = ctx.nodes.filter((n) => n.kind === 'gain');
  const delays = ctx.nodes.filter((n) => n.kind === 'delay');
  return {
    ctx, out, ducks, kit, drums, time, biquads, gains, delays,
    grid: () => g, setGrid: (next) => { g = next; },
    line: (bar, step) => g.originFrame + bar * g.barFrames + Math.round((step * g.barFrames) / 16),
    bookBar(bar = 0, steps = 16) { for (let s = 0; s < steps; s++) drums.book({ frame: this.line(bar, s), bar, step: s }); },
    // the chain's named nodes, by construction order (drums.ts builds them in the core's order)
    drumLP1: biquads[0], drumLPx: biquads.slice(1, 4), drumHP: biquads[4], drumHPx: biquads.slice(5, 8), texLP: biquads[8],
  };
}
const mapped = (d, p) => { const g = generateDrumPattern(d, 0.3, p); return { kick: g.kick, snare: g.snare, hat: g.hat, openhat: g.openhat, clap: g.clap, shaker: g.perc }; };
const realRandom = Math.random;
const withRandom = (v, fn) => { Math.random = () => v; try { return fn(); } finally { Math.random = realRandom; } };

// ─────────────────────────────────────────────────────────────── defaults
console.log('\n[defaults] the contract\'s DrumsState defaults');
{
  const r = rig();
  const s = r.drums.state();
  const keys = ['on', 'pattern', 'seq', 'density', 'swing', 'cover', 'coverDb', 'lowcut', 'lowcutDb', 'texture', 'textureAmt', 'delay', 'sidechain', 'gain', 'mute'];
  ok('exactly the 15 DrumsState fields', JSON.stringify(Object.keys(s).sort()) === JSON.stringify(keys.slice().sort()), Object.keys(s).join());
  const { seq, ...rest } = s;
  const want = { on: false, pattern: 'floor', density: 0.5, swing: 0, cover: 1, coverDb: 0, lowcut: 0, lowcutDb: 0, texture: 'tape', textureAmt: 0, delay: { mix: 0, time: '1/8', feedback: 0.35 }, sidechain: 0.3, gain: 1, mute: false };
  ok('scalars: on false · floor · density .5 · swing 0 · cover 1/0 dB · low-cut 0/0 dB · tape 0 · delay 0 1/8 .35 · sc .3 · gain 1 · unmuted',
    JSON.stringify(rest) === JSON.stringify(Object.fromEntries(Object.keys(rest).map((k) => [k, want[k]]))), JSON.stringify(rest));
  ok('seq = generateDrumPattern(.5, .3, floor), perc → shaker', JSON.stringify(seq) === JSON.stringify(mapped(0.5, 'floor')));
  const on = (row) => row.map((c, i) => (c ? `${i}:${c}` : '')).filter(Boolean).join(' ');
  ok('FLOOR @ .5 = kick 0 4 8 12 (3) · hat 2 6 10 14 (2) · clap 4 12 (2) · nothing else',
    on(seq.kick) === '0:3 4:3 8:3 12:3' && on(seq.hat) === '2:2 6:2 10:2 14:2' && on(seq.clap) === '4:2 12:2' && !on(seq.snare) && !on(seq.openhat) && !on(seq.shaker),
    JSON.stringify(seq));
  ok('defaultDrumsState() equals a fresh state()', JSON.stringify(defaultDrumsState()) === JSON.stringify(s));
  ok('ready() with six decoded lanes', r.drums.ready() === true);
  ok('state() is a copy (mutating it changes nothing)', (() => { const c = r.drums.state(); c.seq.kick[1] = 3; c.delay.mix = 1; const d = r.drums.state(); return d.seq.kick[1] === 0 && d.delay.mix === 0; })());
}

console.log('\n[graph] the chain, the room, the delay, the exits');
{
  const r = rig();
  const bus = r.drums.bus;
  ok('bus (drumBus) → out.drumsIn, and nothing else', bus.outs.length === 1 && bus.outs[0] === r.out.drumsIn);
  const gate = r.gains.find((n) => n.outs.includes(bus));
  const gainNode = r.gains.find((n) => n.outs.includes(gate));
  ok('drumGainNode → stopGate → drumBus (one writer each: mute, stop, solo)', !!gate && !!gainNode && gate !== gainNode && gainNode !== bus, `${!!gate} ${!!gainNode}`);
  ok('② cover open at boot: LP1 20 kHz, Q −3.01 (nodeQ(0), pinned at t = 0)', near(r.drumLP1.frequency.value, 20000, 1e-6) && r.drumLP1.Q.last('set')?.[1] === -3.01, `${r.drumLP1.frequency.value} ${JSON.stringify(r.drumLP1.Q.calls)}`);
  ok('① low-cut open at boot: HP 20 Hz, its three poles parked at 10 Hz', near(r.drumHP.frequency.value, 20, 1e-9) && r.drumHPx.every((p) => near(p.frequency.aim(), 10, 1e-9)), r.drumHPx.map((p) => p.frequency.aim()).join());
  const roomMix = r.gains.find((n) => n.gain.value === 0.16);
  ok('the ROOM: six ER taps (0.1 s lines) + the 41 ms comb, mixed ×0.16 into drumGainNode', r.delays.filter((d) => d.max === 0.1).length === 6 && r.delays.some((d) => d.max === 0.2 && d.delayTime.value === 0.041) && !!roomMix && roomMix.outs[0] === gainNode);
  const dd = r.delays.filter((d) => d.max === 8);
  ok('the drums\' OWN delay: two 8 s lines at 1/8 (0.25 s at 120), return gated shut while off', dd.length === 2 && dd.every((d) => near(d.delayTime.value, 0.25)) && r.gains.filter((n) => n.outs.includes(gainNode) && n.gain.aim() === 0).length >= 1);
  const pans = r.ctx.nodes.filter((n) => n.kind === 'pan').map((n) => n.pan.value);
  ok('delay pans ∓0.6 + the room\'s six pans', pans.includes(-0.6) && pans.includes(0.6) && pans.length === 8, pans.join());
}

// ─────────────────────────────────────────────────────────────── regenerate
console.log('\n[regenerate] the grid is generateDrumPattern(density, 0.3, pattern)');
{
  const r = rig();
  for (const p of ['floor', 'back', 'half', 'break']) {
    let good = true, detail = '';
    for (const d of [0, 0.1, 0.18, 0.3, 0.5, 0.55, 0.62, 0.7, 1]) {
      r.drums.set('pattern', p);
      r.drums.set('density', d);
      if (JSON.stringify(r.drums.state().seq) !== JSON.stringify(mapped(d, p))) { good = false; detail = `${p} @ ${d}`; break; }
    }
    ok(`${p}: set('pattern') + set('density') regenerate the grid at every density`, good, detail);
  }
  r.drums.set('pattern', 'back'); r.drums.set('density', 0.7);
  r.drums.setStep('snare', 3, 3);
  ok('a hand edit is kept (setStep)', r.drums.state().seq.snare[3] === 3);
  r.drums.set('swing', 0.4);
  ok('…through other knobs', r.drums.state().seq.snare[3] === 3);
  r.drums.regenerate();
  ok('…until regenerate()', JSON.stringify(r.drums.state().seq) === JSON.stringify(mapped(0.7, 'back')));
  r.drums.setStep('snare', 16, 3); r.drums.setStep('perc', 1, 3); r.drums.setStep('hat', 1, 7);
  ok('setStep ignores i 16 and an unknown lane; a cell outside 1..3 clears', JSON.stringify(r.drums.state().seq) === JSON.stringify({ ...mapped(0.7, 'back'), hat: mapped(0.7, 'back').hat.map((c, i) => (i === 1 ? 0 : c)) }));
  r.drums.set('pattern', 'bogus');
  ok('an unknown pattern keeps the current one', r.drums.state().pattern === 'back');
  r.drums.set('pattern', 'half'); r.drums.set('density', 0.3);
  const saved = r.drums.state().seq; saved.kick[5] = 1;
  r.drums.set('seq', saved);
  ok('set(\'seq\') loads a saved grid verbatim', r.drums.state().seq.kick[5] === 1 && JSON.stringify(r.drums.state().seq.hat) === JSON.stringify(mapped(0.3, 'half').hat));
  r.drums.set('seq', { kick: [3, 'x', 9, 2.7], snare: 'nope' });
  const s2 = r.drums.state().seq;
  ok('a foreign seq sanitises: short rows pad with 0, bad cells clear, a missing/bad row keeps the grid', s2.kick.length === 16 && s2.kick.slice(0, 4).join() === '3,0,0,2' && JSON.stringify(s2.snare) === JSON.stringify(saved.snare) && JSON.stringify(s2.hat) === JSON.stringify(saved.hat));
  ok('patternSeq(d, p) is the exported form of the same law', JSON.stringify(patternSeq(0.62, 'break')) === JSON.stringify(mapped(0.62, 'break')));
}

// ─────────────────────────────────────────────────────────────── booking
console.log('\n[book] FLOOR @ .5 lands the right lanes on the right frames (humanize held at 0)');
withRandom(0.5, () => {
  const r = rig();
  r.ctx.currentTime = 1.0;
  r.bookBar(0);
  ok('nothing books while the drums are off', r.ctx.sources.length === 0 && r.ducks.length === 0);
  r.drums.set('on', true);
  r.bookBar(0);
  const hits = r.ctx.sources.map((s) => ({ lane: laneOf(r.kit, s), f: Math.round(s.startAt * SR), s }));
  const want = [];
  for (let st = 0; st < 16; st++) for (const l of DRUM_LANES) if (r.drums.state().seq[l][st]) want.push(`${l}@${r.line(0, st)}`);
  const got = hits.map((h) => `${h.lane}@${h.f}`);
  ok('lanes × frames = kick 0 4 8 12 · hat 2 6 10 14 · clap 4 12, in lane order per step', got.join() === want.join() && got.length === 10, got.join());
  ok('onsets are the lattice frames exactly (swing 0, jitter 0)', hits.every((h) => Math.abs(h.s.startAt * SR - h.f) < 1e-6));
  const gainOf = (h) => r.ctx.nodes.find((n) => n.kind === 'gain' && h.s.outs[0] === n).gain.value;
  const byLane = (l) => hits.filter((h) => h.lane === l).map(gainOf);
  ok('kick gain = tier 3 (1.0) × trim 1 × KITGAIN .5 = .5', byLane('kick').every((g) => near(g, 0.5)), byLane('kick').join());
  ok('hat gain = tier 2 (.8) × .34 × .5 = .136', byLane('hat').every((g) => near(g, 0.136)), byLane('hat').join());
  ok('clap gain = .8 × .72 × .5 = .288', byLane('clap').every((g) => near(g, 0.288)), byLane('clap').join());
  ok('rate 1 at humanize 0', hits.every((h) => h.s.playbackRate.value === 1));
  ok('every voice: source → its own gain → drumLP1 (the chain head)', hits.every((h) => h.s.outs.length === 1 && h.s.outs[0].outs[0] === r.drumLP1));
  ok('each voice stops at start + duration + 0.05 (sample-player drum default)', hits.every((h) => near(h.s.stops[0], h.s.startAt + 0.5 + 0.05)));
  ok('duckHit per kick, at the kick\'s line, depth .3, beat .5 s', r.ducks.length === 4 && r.ducks.every((d, i) => near(d[0], r.line(0, i * 4) / SR) && d[1] === 0.3 && near(d[2], 0.5)), JSON.stringify(r.ducks));
  const n = r.ctx.sources.length;
  r.drums.set('mute', true); r.bookBar(1);
  ok('muted: the voices still book (the gain node mutes them) but kicks do not pump', r.ctx.sources.length === n + 10 && r.ducks.length === 4);
  r.drums.set('mute', false); r.drums.set('sidechain', 0.005); r.bookBar(2);
  ok('sidechain < 1 %: no pump', r.ducks.length === 4);
  r.drums.set('sidechain', 0.6); r.drums.setStep('kick', 1, 1); r.drums.book({ frame: r.line(3, 1), bar: 3, step: 1 });
  ok('a GHOST kick pumps too, straight, with the depth it carries', r.ducks.length === 5 && near(r.ducks[4][0], r.line(3, 1) / SR) && r.ducks[4][1] === 0.6);
});

console.log('\n[swing] frames = round(swing·0.66·barFrames/16) on 2/6/10/14, ·0.5 on odd steps; the kick never swings');
withRandom(0.5, () => {
  const B = Math.round((240 * SR) / 97); // 118 763: a bar whose 16th is not a whole frame (7 422.69)
  for (const sw of [1, 0.5]) {
    const r = rig({ barFrames: B, origin: 50000 });
    r.ctx.currentTime = 1.0;
    r.drums.set('on', true);
    r.drums.set('swing', sw);
    r.drums.set('seq', { kick: [0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], snare: [], hat: new Array(16).fill(2), openhat: [], clap: [], shaker: [] });
    r.bookBar(0, 8);
    const hat = r.ctx.sources.filter((s) => laneOf(r.kit, s) === 'hat');
    const kick = r.ctx.sources.filter((s) => laneOf(r.kit, s) === 'kick');
    const off = (s, st) => Math.round(s.startAt * SR) - r.line(0, st);
    const e2 = Math.round(sw * 0.66 * (B / 16)), e3 = Math.round(sw * 0.5 * (B / 16));
    ok(`swing ${sw}: step 2 (an "and") lands ${e2} frames late`, off(hat[2], 2) === e2 && off(hat[6], 6) === e2, `${off(hat[2], 2)} ${off(hat[6], 6)}`);
    ok(`swing ${sw}: step 3 (an odd 16th) lands ${e3} frames late`, off(hat[3], 3) === e3 && off(hat[1], 1) === e3 && off(hat[5], 5) === e3, `${off(hat[3], 3)}`);
    ok(`swing ${sw}: steps 0 and 4 never move`, off(hat[0], 0) === 0 && off(hat[4], 4) === 0);
    ok(`swing ${sw}: the kick on 2 and 3 fires on the line (straight), and ducks there`, off(kick[0], 2) === 0 && off(kick[1], 3) === 0 && near(r.ducks[0][0], r.line(0, 2) / SR) && near(r.ducks[1][0], r.line(0, 3) / SR));
  }
});

console.log('\n[humanize] vel ±8 %, rate ±1.2 %, gain ±5 %, one ±5 ms jitter per step, the kick unjittered');
{
  for (const [rv, sign] of [[0, -1], [1 - 1e-12, 1]]) {
    withRandom(rv, () => {
      const r = rig();
      r.ctx.currentTime = 1.0;
      r.drums.set('on', true);
      r.drums.set('seq', { kick: [3], snare: [], hat: [2], openhat: [], clap: [], shaker: [] });
      r.drums.book({ frame: r.line(0, 0), bar: 0, step: 0 });
      const [k, h] = r.ctx.sources;
      const bi = rv * 2 - 1;
      const g = (s) => s.outs[0].gain.value;
      ok(`bi ${sign > 0 ? '+1' : '−1'}: hat onset = line ${sign > 0 ? '+' : '−'} 5 ms, kick on the line`, near(h.startAt, r.line(0, 0) / SR + bi * 0.005, 1e-9) && near(k.startAt, r.line(0, 0) / SR, 1e-12), `${h.startAt} ${k.startAt}`);
      ok(`bi ${sign > 0 ? '+1' : '−1'}: hat gain = .8·(1+.08bi) · .34 · .5 · (1+.05bi), rate 1+.012bi`, near(g(h), 0.8 * (1 + 0.08 * bi) * 0.34 * 0.5 * (1 + 0.05 * bi)) && near(h.playbackRate.value, 1 + 0.012 * bi), `${g(h)} ${h.playbackRate.value}`);
    });
  }
}

// ─────────────────────────────────────────────────────────────── stop
console.log('\n[stop] future voices un-booked, sounding ones ramped τ 4 ms + cut at 30 ms, delay zeroed, gate closed');
withRandom(0.5, () => {
  const r = rig();
  r.ctx.currentTime = 1.0;
  r.drums.set('on', true);
  r.drums.set('delay', { mix: 0.4, time: '1/8', feedback: 0.5 });
  r.bookBar(0);
  const now = (r.line(0, 4) + 100) / SR; // just after step 4: 0 and 4 sounding, 2 sounding, 6.. future
  r.ctx.currentTime = now;
  const nowF = Math.round(now * SR);
  const before = r.ctx.sources.map((s) => ({ s, started: Math.round(s.startAt * SR) <= nowF }));
  r.drums.stop();
  const future = before.filter((b) => !b.started).map((b) => b.s), sounding = before.filter((b) => b.started).map((b) => b.s);
  ok('the bar split as expected (4 sounding: kick 0, hat 2, kick 4, clap 4 · 6 future)', sounding.length === 4 && future.length === 6, `${sounding.length}/${future.length}`);
  ok('an unstarted booking is cancelled: onended dropped, stop() before its start, out of the graph', future.every((s) => s.onended === null && s.stops[s.stops.length - 1] === 0 && s.disconnects > 0));
  ok('a started one is ramped: cancel(now) then setTarget(0, now, .004) on its gain', sounding.every((s) => { const c = s.outs.length ? s.outs[0].gain.calls : []; return c.length >= 2 && c[c.length - 2][0] === 'cancel' && c[c.length - 1][0] === 'target' && c[c.length - 1][1] === 0 && near(c[c.length - 1][2], now) && c[c.length - 1][3] === 0.004; }));
  ok('…and its source cut at now + 30 ms', sounding.every((s) => near(s.stops[s.stops.length - 1], now + 0.03)));
  const ddMix = r.gains.find((n) => n.gain.calls.some((c) => c[0] === 'target' && c[1] === 0.4));
  const ddFb = r.gains.find((n) => n.gain.calls.some((c) => c[0] === 'target' && c[1] === 0.5));
  ok('the drums\' delay: return + feedback → 0 on τ 4 ms', !!ddMix && !!ddFb && [ddMix, ddFb].every((n) => { const t = n.gain.last('target'); return t[1] === 0 && t[3] === 0.004 && n.gain.last('cancel')[1] === now; }));
  const gate = r.gains.find((n) => n.outs.includes(r.drums.bus));
  ok('the stop gate closes: setTarget(0, now, .004) (−90 dB by +42 ms, so the room comb cannot ring)', gate.gain.last('target')[1] === 0 && gate.gain.last('target')[3] === 0.004);
  ok('stop() turns the drums off (the Studio\'s kill turns the beat off)', r.drums.state().on === false);
  const n = r.ctx.sources.length;
  r.bookBar(1);
  ok('…so the next lines book nothing', r.ctx.sources.length === n);
  r.ctx.currentTime = now + 0.5;
  r.drums.hit('snare');
  ok('a pad hit after the stop reopens the gate (setTarget(1, now, .002)) and sounds', gate.gain.last('target')[1] === 1 && gate.gain.last('target')[3] === 0.002 && r.ctx.sources.length === n + 1);
  r.drums.stop();
  r.ctx.currentTime = now + 1;
  r.drums.set('on', true);
  const t0 = gate.gain.calls.length;
  r.bookBar(3);
  ok('…and so does the next booking once the drums are back on', gate.gain.calls.length === t0 + 2 && gate.gain.last('target')[1] === 1 && r.ctx.sources.length > n + 1);
  const ddMixAfter = ddMix.gain.last('target');
  ok('the delay return rings again on set(\'on\', true)', ddMixAfter[1] === 0.4);
});

console.log('\n[off] set(\'on\', false): the future un-booked, the sounding left to ring, the delay gated, the duck reset');
withRandom(0.5, () => {
  const r = rig();
  r.ctx.currentTime = 1.0;
  r.drums.set('on', true);
  r.bookBar(0);
  r.ctx.currentTime = (r.line(0, 4) + 100) / SR;
  r.drums.set('on', false);
  const nowF = Math.round(r.ctx.currentTime * SR);
  const future = r.ctx.sources.filter((s) => Math.round(s.startAt * SR) > nowF), sounding = r.ctx.sources.filter((s) => Math.round(s.startAt * SR) <= nowF);
  ok('future voices cancelled', future.length === 6 && future.every((s) => s.onended === null && s.disconnects > 0));
  ok('sounding voices untouched (they ring out: no ramp, no early stop)', sounding.every((s) => s.stops.length === 1 && s.outs[0].gain.calls.length === 0));
  const duck = r.out.duck.gain;
  ok('the duck returns to 1 (cancel + setTarget(1, now, .05), S core.ts:1446): cancelled kicks do not pump', duck.calls.length === 2 && duck.calls[0][0] === 'cancel' && duck.calls[1][1] === 1 && duck.calls[1][3] === 0.05);
  r.drums.set('on', false);
  ok('…once (already off: nothing more)', duck.calls.length === 2);
  r.drums.set('sidechain', 0);
  ok('sidechain to 0 resets the duck too (S core.ts:1468, τ .04)', duck.calls.length === 4 && duck.calls[3][3] === 0.04);
});

// ─────────────────────────────────────────────────────────────── hit
console.log('\n[hit] a pad: now + 10 ms, the grid\'s gain law, no pump');
withRandom(0.5, () => {
  const r = rig();
  r.ctx.currentTime = 2.0;
  r.drums.hit('kick');
  r.drums.hit('snare', 0.8);
  r.drums.hit('perc');
  const [k, s] = r.ctx.sources;
  ok('two voices (an unknown lane plays nothing)', r.ctx.sources.length === 2);
  ok('kick at now + 10 ms, gain 1 × 1 × .5', near(k.startAt, 2.01) && near(k.outs[0].gain.value, 0.5));
  ok('snare vel .8: gain .8 × .92 × .5', near(s.outs[0].gain.value, 0.8 * 0.92 * 0.5));
  ok('a pad kick does not pump', r.ducks.length === 0);
});

// ─────────────────────────────────────────────────────────────── delay · texture · eq · gain
console.log('\n[delay] the drums\' own delay: five divisions, fb ≤ .9, gated by on, re-timed with the tempo');
{
  const r = rig();
  r.ctx.currentTime = 1.0;
  const [ddL, ddR] = r.delays.filter((d) => d.max === 8);
  const ddMix = r.gains.find((n) => n.outs.length === 1 && r.ctx.nodes.some((x) => x.kind === 'pan' && x.outs.includes(n)));
  const ddFb = r.gains.find((n) => n.outs.includes(ddL) && n.gain.value === 0); // ddPre (gain 1) feeds ddL too
  r.drums.set('delay', { mix: 0.5, time: '1/4', feedback: 0.95 });
  ok('off: return and feedback held at 0; time 1/4 = 0.5 s at 120', ddMix.gain.aim() === 0 && ddFb.gain.aim() === 0 && near(ddL.delayTime.aim(), 0.5) && near(ddR.delayTime.aim(), 0.5));
  r.drums.set('on', true);
  ok('on: return .5, feedback clamped to .9', ddMix.gain.aim() === 0.5 && ddFb.gain.aim() === 0.9);
  const divs = { '1/16': 0.25, '1/8': 0.5, '1/8d': 0.75, '1/4': 1, '1/2': 2 };
  ok('the five divisions: 60/bpm × .25 .5 .75 1 2 beats', Object.entries(divs).every(([name, beats]) => { r.drums.set('delay', { mix: 0.5, time: name, feedback: 0.3 }); return near(ddL.delayTime.aim(), 0.5 * beats); }));
  r.drums.set('delay', { mix: 0.5, time: 'bogus', feedback: 'x' });
  ok('a bad division / feedback keeps the current ones', r.drums.state().delay.time === '1/2' && r.drums.state().delay.feedback === 0.3);
  r.drums.set('delay', { mix: 0.5, time: '1/4', feedback: 0.3 });
  r.setGrid({ sr: SR, barFrames: 128000, originFrame: 50400 }); // 90 BPM
  withRandom(0.5, () => r.drums.book({ frame: r.line(0, 0), bar: 0, step: 0 }));
  ok('a tempo change re-times it at the next booking (60/90 s at 1/4)', near(ddL.delayTime.aim(), 60 / 90) && near(ddR.delayTime.aim(), 60 / 90));
  ok('…and the kick\'s duck reads the new beat (0.667 s)', near(r.ducks[r.ducks.length - 1][2], 60 / 90));
}

console.log('\n[texture] TAPE/DRIVE: wet 0.7v + 0.9v², LP 17000 − 6500v, trim 1/(1 + 0.45v); off below 0.01');
{
  const r = rig();
  r.ctx.currentTime = 1.0;
  const shaper = r.ctx.nodes.filter((n) => n.kind === 'shaper').find((n) => n.oversample === '4x');
  const trim = r.gains.find((n) => n.gain.calls.some((c) => c[0] === 'target' && c[1] === 1 && c[3] === 0.03) && n.outs.length === 3);
  const wet = r.gains.find((n) => n.outs[0] === shaper);
  r.drums.set('textureAmt', 0.6);
  ok('v .6: wet .744, texLP 13 100 Hz, trim 1/1.27', near(wet.gain.aim(), 0.7 * 0.6 + 0.9 * 0.36) && near(r.texLP.frequency.aim(), 13100) && near(trim.gain.aim(), 1 / 1.27), `${wet.gain.aim()} ${r.texLP.frequency.aim()} ${trim && trim.gain.aim()}`);
  const tape = shaper.curve;
  ok('a 512-point curve, 4× oversampled', tape && tape.length === 512 && shaper.oversample === '4x');
  r.drums.set('texture', 'drive');
  ok('DRIVE swaps the curve (the asymmetric rational)', shaper.curve !== tape && shaper.curve.length === 512 && Math.abs(shaper.curve[383]) - Math.abs(shaper.curve[128]) > 0.05);
  r.drums.set('textureAmt', 1);
  ok('v 1: wet capped 1.5, LP 10 500', near(wet.gain.aim(), 1.5) && near(r.texLP.frequency.aim(), 10500));
  r.drums.set('textureAmt', 0.005);
  ok('below 0.01: no curve, wet 0, LP 18 kHz', shaper.curve === null && wet.gain.aim() === 0 && r.texLP.frequency.aim() === 18000);
}

console.log('\n[eq] ② cover = xToF(x) with Q nodeQ(dB); ① low-cut = xToF(x), its poles by hpCascadeCorner');
{
  const r = rig();
  r.ctx.currentTime = 1.0;
  const f5 = 20 * Math.sqrt(1000); // xToF(.5) = 632.46 Hz
  r.drums.set('cover', 0.5); r.drums.set('coverDb', 6);
  ok('cover .5: LP1 + its three slope poles at 632.46 Hz (slope 1 = all engaged)', near(r.drumLP1.frequency.aim(), f5, 1e-9) && r.drumLPx.every((p) => near(p.frequency.aim(), f5, 1e-9)));
  ok('coverDb 6 → Q = nodeQ(6) = 12 dB', r.drumLP1.Q.aim() === 12);
  r.drums.set('coverDb', 1.5);
  ok('coverDb 1.5 → nodeQ blends: 3 − 3.01·0.5', near(r.drumLP1.Q.aim(), 3 - 3.01 * 0.5));
  r.drums.set('coverDb', 99);
  ok('coverDb clamps to +18 (Q 36)', r.drums.state().coverDb === 18 && r.drumLP1.Q.aim() === 36);
  r.drums.set('lowcut', 0.5); r.drums.set('lowcutDb', -6);
  ok('low-cut .5: HP + poles at 632.46 Hz, Q nodeQ(−6) = −12', near(r.drumHP.frequency.aim(), f5, 1e-9) && r.drumHPx.every((p) => near(p.frequency.aim(), f5, 1e-6)) && r.drumHP.Q.aim() === -12);
  r.drums.set('lowcut', 0.06);
  const hp06 = 20 * Math.pow(1000, 0.06), cf = 0.5;
  ok('low-cut .06: the poles half-engaged (10·(hp/10)^0.5)', r.drumHPx.every((p) => near(p.frequency.aim(), 10 * Math.pow(hp06 / 10, cf), 1e-9)));
  ok('every EQ move glides τ 30 ms', r.drumLP1.frequency.last('target')[3] === 0.03 && r.drumHP.frequency.last('target')[3] === 0.03);
}

console.log('\n[gain] gain × (1 − mute) on drumGainNode, τ 20 ms, clamped 0..1.25');
{
  const r = rig();
  const gate = r.gains.find((n) => n.outs.includes(r.drums.bus));
  const gainNode = r.gains.find((n) => n.outs.includes(gate));
  ok('at t = 0 the value is pinned (setValueAtTime(1, 0))', gainNode.gain.last('set')?.[1] === 1 && gainNode.gain.last('set')?.[2] === 0);
  r.ctx.currentTime = 3;
  r.drums.set('gain', 0.5);
  ok('gain .5 → setTarget(.5, now, .02)', JSON.stringify(gainNode.gain.last('target')) === JSON.stringify(['target', 0.5, 3, 0.02]));
  r.drums.set('mute', true);
  ok('mute → 0', gainNode.gain.last('target')[1] === 0);
  r.drums.set('mute', false); r.drums.set('gain', 2);
  ok('gain 2 clamps to 1.25', r.drums.state().gain === 1.25 && gainNode.gain.last('target')[1] === 1.25);
  ok('mute and gain never touch the solo bus or the stop gate', r.drums.bus.gain.calls.length === 0 && gate.gain.calls.length === 0);
}

// ─────────────────────────────────────────────────────────────── registry
console.log('\n[registry] a voice leaves on \'ended\'; a context that never fires it is swept');
withRandom(0.5, () => {
  const r = rig();
  r.ctx.currentTime = 1.0;
  r.drums.set('on', true);
  r.drums.book({ frame: r.line(0, 0), bar: 0, step: 0 });
  const k = r.ctx.sources[0];
  k.onended();
  ok('onended releases it (source + gain disconnected)', k.disconnects === 1 && k.outs.length === 0);
  const g = r.ctx.nodes.find((n) => n.kind === 'gain' && n.gain.value === 0.5 && n.disconnects === 1);
  r.ctx.currentTime = r.line(0, 0) / SR + 0.001;
  r.drums.stop();
  ok('…and a later stop() no longer touches it', !!g && g.gain.calls.length === 0 && k.stops.length === 1);
  r.drums.set('on', true);
  r.drums.book({ frame: r.line(1, 0), bar: 1, step: 0 });
  const k2 = r.ctx.sources[r.ctx.sources.length - 1];
  r.ctx.currentTime = r.line(1, 0) / SR + 0.55 + 1.01; // past its end + 1 s, no 'ended' ever fired
  r.drums.book({ frame: r.line(2, 0), bar: 2, step: 0 });
  ok('a voice past its end + 1 s with no \'ended\' is released by the next booking', k2.disconnects === 1);
});

// ─────────────────────────────────────────────────────────────── no Timekeeper
console.log('\n[no time] without the Timekeeper the bar is learned from two consecutive lines (120 before that)');
withRandom(0.5, () => {
  const B = Math.round((240 * SR) / 97);
  const r = rig({ noTime: true, barFrames: B, origin: 60000 });
  r.ctx.currentTime = 1.0;
  r.drums.set('on', true);
  r.drums.set('swing', 1);
  r.drums.set('seq', { kick: [3], snare: [], hat: new Array(16).fill(2), openhat: [], clap: [], shaker: [] });
  r.drums.book({ frame: r.line(0, 0), bar: 0, step: 0 });
  ok('first line: the kick\'s beat falls back to 120 BPM (0.5 s)', near(r.ducks[0][2], 0.5));
  for (let s = 1; s < 4; s++) r.drums.book({ frame: r.line(0, s), bar: 0, step: s });
  const hats = r.ctx.sources.filter((s) => laneOf(r.kit, s) === 'hat');
  const off3 = Math.round(hats[3].startAt * SR) - r.line(0, 3), e3 = Math.round(0.5 * (B / 16));
  ok('by step 3 the swing is within a frame of the exact law', Math.abs(off3 - e3) <= 1, `${off3} vs ${e3}`);
});

// ─────────────────────────────────────────────────────────────── kit.ts
// R2 (lane A): THE KIT AS FILES. decodeKit fetches <root>/kit/<lane>.m4a (scripts/signal/kit-extract.mjs wrote them byte
// for byte from the repo's DRUMKIT); a fake fetch serves the six shipped files from public/ through fs.
console.log('\n[kit] decodeKit: six lanes fetched from <root>/kit/<lane>.m4a, keyed by DRUM_LANES; never rejects');
{
  const KIT_FILES = Object.fromEntries(DRUM_LANES.map((l) => [l, readFileSync(join(PUB, RIP_ROOT, KIT_DIR, `${l}.m4a`))]));
  const fetched = [];
  const serve = (routes, { throwFor = null } = {}) => (u) => {
    fetched.push(u);
    if (throwFor && u.includes(throwFor)) return Promise.reject(new TypeError('Failed to fetch'));
    const b = routes[u];
    if (!b) return Promise.resolve({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) });
    return Promise.resolve({ ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) });
  };
  const routesAt = (root) => Object.fromEntries(DRUM_LANES.map((l) => [`${root}/${KIT_DIR}/${l}.m4a`, KIT_FILES[l]]));
  const warned = [];
  const realWarn = console.warn, realFetch = globalThis.fetch;
  console.warn = (...a) => { warned.push(a.join(' ')); };
  try {
    globalThis.fetch = serve(routesAt(RIP_ROOT));
    const ctx = fakeCtx();
    const kit = await decodeKit(ctx);
    ok('six lanes, in DRUM_LANES order', JSON.stringify(Object.keys(kit)) === JSON.stringify([...DRUM_LANES]) && ctx.decodes.length === 6);
    ok('one fetch per lane: RIP_ROOT + "/kit/<lane>.m4a" (= kitUrl), the unlisted path', JSON.stringify(fetched) === JSON.stringify(DRUM_LANES.map((l) => `${RIP_ROOT}/kit/${l}.m4a`))
      && DRUM_LANES.every((l) => kitUrl(l) === `${RIP_ROOT}/kit/${l}.m4a`), JSON.stringify(fetched));
    ok('each payload is an MP4 (bytes 4..8 = "ftyp", brand M4A)', DRUM_LANES.every((l) => String.fromCharCode(...kit[l].bytes.slice(4, 11)) === 'ftypM4A'));
    ok('every file is DRUMKIT[LANE_KIT_KEY[lane]], byte for byte (the extractor\'s copy of the Studio kit)',
      DRUM_LANES.every((l) => Buffer.from(DRUMKIT[LANE_KIT_KEY[l]], 'base64').equals(KIT_FILES[l]) && Buffer.from(kit[l].bytes).equals(KIT_FILES[l])));
    ok('shaker decodes the shaker file (the Studio\'s perc lane)', LANE_KIT_KEY.shaker === 'shaker' && kit.shaker.bytes.length === atob(DRUMKIT.shaker).length && kit.shaker.bytes[100] === atob(DRUMKIT.shaker).charCodeAt(100));
    ok('every lane gets its own fresh buffer (decodeAudioData detaches)', new Set(ctx.decodes).size === 6);
    ok('a whole kit warns nothing', warned.length === 0, warned.join(' | '));

    fetched.length = 0;
    globalThis.fetch = serve(routesAt('/x/y'));
    const k2 = await decodeKit(fakeCtx(), '/x/y/');
    ok('a custom root (the instrument\'s ripRoot) is honoured; a trailing slash is ignored', Object.keys(k2).length === 6 && fetched.every((u) => u.startsWith('/x/y/kit/')) && kitUrl('kick', '/x/y//') === '/x/y/kit/kick.m4a');

    // openhat's file is not an m4a (a broken deploy, an HTML 200): its decode rejects; snare 404s; the rest resolve
    const routes = routesAt(RIP_ROOT);
    routes[`${RIP_ROOT}/kit/openhat.m4a`] = Buffer.from('<!doctype html><p>not found</p>');
    delete routes[`${RIP_ROOT}/kit/snare.m4a`];
    globalThis.fetch = serve(routes);
    const ctx2 = fakeCtx();
    const decode = ctx2.decodeAudioData;
    ctx2.decodeAudioData = (ab) => (String.fromCharCode(...new Uint8Array(ab).slice(4, 8)) === 'ftyp' ? decode(ab) : Promise.reject(new Error('EncodingError')));
    warned.length = 0;
    const partial = await decodeKit(ctx2);
    ok('a lane that fails to decode (openhat) or 404s (snare) is left out; the rest resolve', !partial.openhat && !partial.snare && Object.keys(partial).length === 4);
    ok('…and one warning names them', warned.length === 1 && /openhat/.test(warned[0]) && /snare/.test(warned[0]), warned.join(' | '));

    globalThis.fetch = serve(routesAt(RIP_ROOT), { throwFor: 'kick' });
    const k3 = await decodeKit(fakeCtx());
    ok('a fetch that rejects (offline) loses that lane only', !k3.kick && Object.keys(k3).length === 5);
    delete globalThis.fetch;
    let threw = false, k4 = null;
    try { k4 = await decodeKit(fakeCtx()); } catch { threw = true; }
    ok('no fetch at all: resolves an empty kit, never rejects', !threw && k4 && Object.keys(k4).length === 0);

    withRandom(0.5, () => {
      const out = { ctx: ctx2, duck: ctx2.createGain(), drumsIn: ctx2.createGain(), level: () => ({ peak: 0, rms: 0 }), muted: () => true, panic() {} };
      const d = createDrums({ ctx: ctx2, out, effects: { duckHit() {} }, kit: partial });
      ctx2.currentTime = 1;
      d.set('on', true);
      d.setStep('openhat', 0, 3);
      let threw2 = false;
      try { d.book({ frame: 50000, bar: 0, step: 0 }); d.hit('openhat'); } catch { threw2 = true; }
      ok('drums on a partial kit: ready() false, the missing lane books nothing, nothing throws', d.ready() === false && !threw2 && !ctx2.sources.some((s) => s.buffer === undefined || s.buffer === null));
    });
  } finally {
    console.warn = realWarn;
    if (realFetch) globalThis.fetch = realFetch; else delete globalThis.fetch;
  }
}

console.log(`\n${fail ? '✗' : '✓'} drums: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
