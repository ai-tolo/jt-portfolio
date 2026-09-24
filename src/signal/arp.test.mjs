// arp.ts (SIGNAL R1, lane H): the held-note model, the arp step on the lattice, GROOVE, the gate row, DIVE — against a
// fake lattice (48 kHz, 120 bpm: a bar = 96000 frames, a 16th = 6000) and recording fakes for keys / bass / effects.
// Sources: signal-studio-v6lib/src/engine/core.ts:864-935, 947-978, 1217-1220, 1344-1398 (2a9e4a7).
// Run: source ~/.nvm/nvm.sh && node src/signal/arp.test.mjs
import {
  createArp, grooveHash, grooveHit, grooveShape, chordBlock, blockVel, pluckSec, makeHum,
  HITn, HITcA, HITcB, HITcC, CHORD_CYCLE,
} from './arp.ts';
import { createHarmony } from './harmony.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const js = (a) => JSON.stringify(a);

// ── the fake lattice: P/grid.ts's law (line i of perBar in bar j = origin + j·barFrames + round(i·barFrames/perBar))
function makeTime({ sr = 48000, bpm = 120, origin = 0, ctx = { currentTime: 0 } } = {}) {
  const barFrames = Math.round((240 * sr) / bpm);
  const lineFrame = (bar, i, perBar) => origin + bar * barFrames + Math.round((i * barFrames) / perBar);
  return {
    sr, barFrames,
    grid: () => ({ sr, barFrames, originFrame: origin }),
    nextLine(perBar, from = Math.round((ctx.currentTime + 0.02) * sr)) {   // lane T: default now + 20 ms
      for (let bar = Math.max(0, Math.floor((from - origin) / barFrames) - 1); ; bar++) {
        for (let i = 0; i < perBar; i++) { const f = lineFrame(bar, i, perBar); if (f >= from) return { frame: f, bar, i, perBar }; }
      }
    },
    booking: (bar, step) => ({ frame: lineFrame(bar, step, 16), bar, step }),
  };
}

function rig(o = {}) {
  const log = [];
  const keys = {
    noteOn: (id, midi, vel) => log.push(['on', id, midi, vel]),
    noteOff: (id) => log.push(['off', id]),
    hit: (midi, when, dur, vel) => log.push(['hit', midi, when, dur, vel]),
    bend: (...a) => log.push(['bend', ...a]),
    allOff: () => log.push(['allOff']),
    retune: (map) => log.push(['retune', map]),
  };
  const bass = { gesture: (...a) => log.push(['bgate', ...a]) };
  if (o.bassChop) bass.chop = (w, s) => log.push(['bchop', w, s]);
  const effects = { chop: (w, s) => log.push(['chop', w, s]), releaseGate: () => log.push(['release']) };
  const ctx = { currentTime: 0 };
  const time = makeTime({ ...o.time, ctx });
  const params = { div: '1/8', length: 0.5, groove: 0, chord: false, gateDiv: '1/16', gateSwing: 0, diveSpeed: 0.45, diveDist: 24, ...o.params };
  const arp = createArp({ keys, bass, effects, time, ctx, params: () => params, hum: () => 0 });
  const bookBars = (from, n) => { for (let bar = from; bar < from + n; bar++) for (let s = 0; s < 16; s++) arp.book(time.booking(bar, s)); };
  const of = (k) => log.filter((e) => e[0] === k);
  const clear = () => { log.length = 0; };
  return { arp, log, params, time, ctx, bookBars, of, clear };
}

console.log('\n[arp] the step: roots ascending, walked mod their count (core.ts:1352-1360)');
{
  const r = rig();
  r.arp.setArp(true);
  r.arp.noteOn('kG', 67, [67, 71, 74]); r.arp.noteOn('kC', 60, [60, 64, 67]); r.arp.noteOn('kE', 64, [64, 67, 71]);
  r.clear(); r.bookBars(0, 1);
  const h = r.of('hit');
  ok('pressed G C E, the arp plays C E G C E G C E (ascending by pitch, never press order)', js(h.map((e) => e[1])) === js([60, 64, 67, 60, 64, 67, 60, 64]), js(h.map((e) => e[1])));
  ok('1/8 at 120 bpm: eight plucks a bar, on every other 16th line (0, .25, .5 … s)', h.length === 8 && h.every((e, i) => near(e[2], i * 0.25)));
  ok('LENGTH .5: each pluck lives step·gate = .125 s, vel .9', h.every((e) => near(e[3], 0.125) && near(e[4], 0.9)));
  // a new note joins mid-walk: the index carries, mod the new count
  r.clear(); r.arp.book(r.time.booking(1, 0)); r.arp.book(r.time.booking(1, 1));   // the 9th pluck: idx 8 % 3 → G
  const before = r.of('hit').map((e) => e[1]);
  r.arp.noteOn('kD', 62, [62, 65, 69]);
  r.clear(); r.arp.book(r.time.booking(1, 2));
  ok('a note added mid-walk joins the walk: idx 9 mod the new count 4 → D (62)', js(before) === js([67]) && r.of('hit')[0][1] === 62, js([before, r.of('hit')]));
}
{
  const r = rig();
  r.arp.setArp(true);
  r.arp.noteOn('kC', 60); r.arp.noteOn('kE', 64);
  r.bookBars(0, 1);                 // 8 plucks: idx ends at 8
  r.arp.noteOff('kC'); r.arp.noteOff('kE');
  r.arp.book(r.time.booking(1, 0)); // nothing held → the index resets
  r.arp.noteOn('kE', 64); r.arp.noteOn('kC', 60);
  r.clear(); r.arp.book(r.time.booking(1, 2));
  ok('nothing held resets the walk: the next chord starts on its lowest note', r.of('hit').length === 1 && r.of('hit')[0][1] === 60, js(r.of('hit')));
}

console.log('\n[arp] RATE = the division\'s own lines inside each 16th (D §1.3)');
for (const [div, n] of [['1/4', 4], ['1/8', 8], ['1/8T', 12], ['1/16', 16], ['1/16T', 24], ['1/32', 32]]) {
  const r = rig({ params: { div } });
  r.arp.setArp(true); r.arp.noteOn('kC', 60);
  r.clear(); r.bookBars(0, 2);
  const frames = r.of('hit').map((e) => Math.round(e[2] * 48000));
  const want = []; for (let bar = 0; bar < 2; bar++) for (let i = 0; i < n; i++) want.push(bar * 96000 + Math.round((i * 96000) / n));
  ok(`${div}: ${n} lines a bar, each on the lattice, each booked once`, js(frames) === js(want), js(frames.slice(0, 6)));
}
{
  const r = rig({ params: { length: 1.3 } });
  r.arp.setArp(true); r.arp.noteOn('kC', 60); r.clear(); r.arp.book(r.time.booking(0, 0));
  ok('LENGTH 1.3: the pluck outlives its step (.25·1.3 = .325 s)', near(r.of('hit')[0][3], 0.325));
  r.params.length = 0.06; r.clear(); r.arp.book(r.time.booking(0, 2));
  ok('LENGTH .06: .015 s floors at the pluck\'s 18 ms (core.ts:850)', near(r.of('hit')[0][3], 0.018) && pluckSec(15) === 0.018);
}

console.log('\n[arp] CHORD + ARP = a strummed block each step (core.ts:1356-1359)');
{
  const r = rig({ params: { chord: true } });
  r.arp.setArp(true); r.arp.noteOn('kC', 60, [60, 64, 67]);
  r.clear(); r.arp.book(r.time.booking(0, 0));
  const h = r.of('hit');
  ok('one root: its triad, ascending, 8 ms apart', js(h.map((e) => e[1])) === js([60, 64, 67]) && near(h[1][2] - h[0][2], 0.008) && near(h[2][2] - h[0][2], 0.016));
  ok('vel clamp(.92/√3, .32, .9) = .531', h.every((e) => near(e[4], 0.92 / Math.sqrt(3))));
  r.arp.noteOn('kS', 62, [62, 65, 69]);
  r.params.div = '1/32';
  r.clear(); r.arp.book(r.time.booking(0, 4));
  const b = r.of('hit').filter((e) => near(e[2] - 0.5, 0, 0.03));
  ok('two roots: the union of their triads, deduped, ascending', js(b.map((e) => e[1])) === js([60, 62, 64, 65, 67, 69]), js(b.map((e) => e[1])));
  ok('the strum caps at .45·step (1/32 at 120: 28.125 ms)', js(b.map((e) => Math.round((e[2] - 0.5) * 1e6) / 1e3)) === js([0, 8, 16, 24, 28.125, 28.125]), js(b.map((e) => e[2] - 0.5)));
  ok('six notes: vel .92/√6', b.every((e) => near(e[4], 0.92 / Math.sqrt(6))));
  ok('chordBlock dedupes exactly; blockVel clamps to .32..9', js(chordBlock([[60, 64, 67], [64, 67, 71]])) === js([60, 64, 67, 71]) && blockVel(1) === 0.9 && blockVel(100) === 0.32);
}
{
  const r = rig({ params: { chord: true } });
  r.arp.setArp(true);
  r.arp.noteOn('kKeyW', 61, [61, 65, 68]);    // C major's colour cap W = C♯, its press-time triad = C♯ major
  r.clear(); r.arp.book(r.time.booking(0, 0));
  ok('a colour cap\'s CARRIED triad is what arps (C♯ F G♯), never a re-snapped C major', js(r.of('hit').map((e) => e[1])) === js([61, 65, 68]), js(r.of('hit')));
  r.arp.noteOn('kKeyW~0', 65, [65]); r.arp.noteOn('kKeyW~1', 68, [68]);
  r.clear(); r.arp.book(r.time.booking(0, 2));
  ok('the \'~\' extensions never double the block (roots exclude them)', js(r.of('hit').map((e) => e[1])) === js([61, 65, 68]));
}

console.log('\n[arp] GROOVE: the G mode, tables verbatim, (bar, step) off the Booking (core.ts:1361-1381)');
ok('the hash r2 (bar 0: s0 .769, s2 .243, s14 .935; bar 1 s0 .329)', grooveHash(0, 0) === 0.769 && grooveHash(0, 2) === 0.243 && grooveHash(0, 14) === 0.935 && grooveHash(1, 0) === 0.329);
{
  const r = rig({ params: { groove: 1 } });
  r.arp.setArp(true); r.arp.noteOn('kC', 60);
  r.clear(); r.bookBars(0, 1);
  const h = r.of('hit');
  const steps = h.map((e) => Math.floor((e[2] * 48000) / 6000));
  const want = HITn.map((v, s) => (v ? s : -1)).filter((s) => s >= 0);
  ok('single, 1/8: a hit on every HITn step (0 2 3 4 6 7 8 10 12 13 14)', js(steps) === js(want), js(steps));
  ok('s0: 8·A + (r2 − .5)·12·A = 11.228 ms after the line (538.9 frames)', near(h[0][2], 0.011228, 1e-12) && near(h[0][2] * 48000, 538.944, 1e-6), String(h[0][2]));
  ok('s2: SWn .1 · 125 ms + 8 + (.243 − .5)·12 = 17.416 ms', near(h[1][2] - 0.25, 0.017416, 1e-12), String(h[1][2] - 0.25));
  ok('s2: vel .9·VELn .55 = .495, life max(40, 62.5·LENn .7) = 43.75 ms', near(h[1][4], 0.495) && near(h[1][3], 0.04375));
  ok('s3: life floors at 40 ms (single)', near(h[2][3], 0.04));
  const g = grooveShape(2, 0, false, false, 0.5, 0.125, 62.5, 0);
  ok('A = .5: offset SWn·125·.65 + 4 + (r2 − .5)·6', near(g.offMs, 0.1 * 125 * 0.65 + 4 + (0.243 - 0.5) * 6));
}
{
  const r = rig({ params: { groove: 1, chord: true } });
  r.arp.setArp(true); r.arp.noteOn('kC', 60, [60, 64, 67]);
  r.clear(); r.bookBars(0, 8);
  const perBar = [];
  for (let bar = 0; bar < 8; bar++) {
    const s = new Set(r.of('hit').filter((e) => e[2] >= bar * 2 && e[2] < bar * 2 + 2).map((e) => Math.floor(((e[2] - bar * 2) * 48000) / 6000)));
    perBar.push([...s].sort((a, b) => a - b));
  }
  const pat = (t) => t.map((v, s) => (v ? s : -1)).filter((s) => s >= 0);
  const A = pat(HITcA), B = pat(HITcB), C = pat(HITcC);
  ok('the 8-bar chord cycle: A A B A A A B C', js(perBar) === js([A, A, B, A, A, A, B, C]), js(perBar));
  ok('CHORD_CYCLE is [0,0,1,0,0,0,1,2]', js(CHORD_CYCLE) === js([0, 0, 1, 0, 0, 0, 1, 2]));
  const s14 = r.of('hit').filter((e) => e[2] >= 14 * 0.125 && e[2] < 15 * 0.125);
  ok('chord s14: LEANc .4 would land 69.2 ms late → clamped to t + .45·16th = 56.25 ms', near(s14[0][2] - 14 * 0.125, 0.05625), String(s14[0][2] - 1.75));
  ok('chord s14: the strum still spreads upward from the clamped time', near(s14[1][2] - s14[0][2], 0.008));
}
{
  const hitsAt = (div) => { const r = rig({ params: { groove: 1, div } }); r.arp.setArp(true); r.arp.noteOn('kC', 60); r.bookBars(0, 1);
    return r.of('hit').map((e) => [Math.floor((e[2] * 48000) / 6000), e[4], e[3]]); };
  ok('1/4 under GROOVE: quarters only (s % 4 == 0)', js(hitsAt('1/4').map((e) => e[0])) === js([0, 4, 8, 12]));
  const h16 = hitsAt('1/16');
  ok('1/16 under GROOVE: the odd 16ths fill in as ghosts → all 16 steps', h16.length === 16);
  ok('a ghost: vel .9·.3 = .27, life max(40, 62.5·.55) = 40 ms', near(h16[1][1], 0.27) && near(h16[1][2], 0.04), js(h16[1]));
  ok('1/32 under GROOVE: every 16th', hitsAt('1/32').length === 16);
  ok('grooveHit: RATE ≤ 1/beat keeps only quarter hits', !grooveHit(2, 0, false, 1).hit && grooveHit(4, 0, false, 1).hit);
}
{
  let seen = 0;
  const hum = makeHum();
  const xs = Array.from({ length: 1000 }, () => hum());
  seen = xs.filter((x) => x >= -1 && x < 1).length;
  ok('hum(): the Studio\'s mulberry32 bi() stays in [−1, 1) and is deterministic', seen === 1000 && makeHum()() === xs[0]);
}

console.log('\n[arp] HOLD and ARP, the laws exactly (D §2.4; core.ts:869-935)');
{
  const r = rig();
  ok('no arp: a note sounds on keys.noteOn (vel .9)', r.arp.noteOn('kA', 60) === 'on' && js(r.of('on')[0]) === js(['on', 'kA', 60, 0.9]));
  r.arp.noteOff('kA');
  ok('no arp, no HOLD: noteOff releases', r.of('off').length === 1 && r.arp.sounding().length === 0);
  ok('no HOLD: a repeat of a sounding id is ignored', r.arp.noteOn('kB', 62) === 'on' && r.arp.noteOn('kB', 62) === 'none');
}
{
  const r = rig();
  r.arp.setLatch(true);
  r.arp.noteOn('kA', 60); r.arp.noteOff('kA');
  ok('HOLD: noteOff is a no-op, the note rings (core.ts:890)', r.of('off').length === 0 && js(r.arp.sounding()) === js([['kA', 60]]));
  ok('HOLD: tapping it again RELEASES it (core.ts:875)', r.arp.noteOn('kA', 60) === 'off' && r.of('off').length === 1 && r.arp.sounding().length === 0);
  r.arp.noteOff('kA');
  r.arp.noteOn('kS', 62);             // under a finger
  r.arp.noteOn('kD', 64); r.arp.noteOff('kD');   // latched
  r.clear(); r.arp.setLatch(false);
  ok('HOLD off frees EVERY voice, even one under a finger (core.ts:934)', r.arp.sounding().length === 0 && r.of('off').length === 2 && r.of('allOff').length === 1);
}
{
  const r = rig();
  r.arp.noteOn('kA', 60, [60, 64, 67]); r.arp.noteOn('kD', 64, [64, 67, 71]);
  r.clear(); r.arp.setArp(true);
  ok('ARP on MOVES the sounding voices into the pool (their held voices released)', r.of('off').length === 2 && js(r.arp.sounding()) === js([['kA', 60], ['kD', 64]]) && r.of('allOff').length === 1);
  r.arp.noteOff('kD');
  ok('ARP, no HOLD: noteOff drops the id from the pool (core.ts:889)', js(r.arp.sounding()) === js([['kA', 60]]));
  r.clear(); r.arp.setArp(false);
  ok('ARP off clears the pool AND held, a key under a finger included (core.ts:930)', r.arp.sounding().length === 0 && r.of('allOff').length === 1);
  r.arp.noteOff('kA');
  ok('…and that key\'s later keyup has nothing left to release', r.of('off').length === 0);
}
{
  const r = rig();
  r.arp.setArp(true); r.arp.setLatch(true);
  r.arp.noteOn('kA', 60); r.arp.noteOff('kA');
  ok('ARP + HOLD: a released key stays in the pool', js(r.arp.sounding()) === js([['kA', 60]]));
  ok('ARP + HOLD: noteOn toggles it OUT of the pool (core.ts:872)', r.arp.noteOn('kA', 60) === 'off' && r.arp.sounding().length === 0);
  r.arp.noteOff('kA');
  r.arp.noteOn('kS', 62);                          // held by a finger
  r.arp.noteOn('kD', 64); r.arp.noteOff('kD');     // latched only
  r.arp.setLatch(false);
  ok('HOLD off under ARP keeps only what a finger still holds (core.ts:934)', js(r.arp.sounding()) === js([['kS', 62]]));
}
{
  const r = rig();
  r.arp.setLatch(true);
  r.arp.noteOn('kA', 60); r.arp.noteOff('kA');   // latched, no finger
  r.arp.noteOn('kS', 62);                        // under a finger
  r.clear(); r.arp.flushLatch();
  ok('flushLatch (a stamp consumes it): the latched note goes, the finger\'s stays', js(r.arp.sounding()) === js([['kS', 62]]) && js(r.of('off')) === js([['off', 'kA']]));
}
{
  const r = rig();
  r.arp.noteOn('kA', 60); r.arp.noteOn('kA~0', 64);
  r.clear(); r.arp.retune({ kA: { midi: 62, triad: [62, 65, 69] }, 'kA~0': { midi: 65, triad: [65] } });
  ok('retune: held voices glide in place through keys.retune', js(r.of('retune')[0][1]) === js({ kA: 62, 'kA~0': 65 }) && js(r.arp.sounding()) === js([['kA', 62], ['kA~0', 65]]));
}

console.log('\n[arp] the GATE (core.ts:1387-1398 → effects.chop + the bass gate)');
{
  const r = rig({ bassChop: true });
  r.arp.gesture('gate', true);
  r.clear(); r.bookBars(0, 1);
  const c = r.of('chop');
  ok('1/16 at 120 bpm: a chop on every 16th line, each .125 s', c.length === 16 && c.every((e, i) => near(e[1], i * 0.125) && near(e[2], 0.125)));
  ok('the bass is chopped at the same instants (its exact chop), and hears the gesture', js(r.of('bchop')) === js(c.map((e) => ['bchop', e[1], e[2]])) && r.of('bgate').length === 16 && r.of('bgate').every((e) => e[1] === 'gate' && e[2] === true));
  r.params.gateSwing = 0.6;
  r.clear(); r.bookBars(1, 1);
  const s = r.of('chop');
  ok('SWING .6: even lines long (sd·1.2), odd lines late by sd·.2 and short (sd·.8)',
    near(s[0][1], 2) && near(s[0][2], 0.15) && near(s[1][1], 2.125 + 0.025) && near(s[1][2], 0.1));
  ok('…and each chop ends exactly where the next begins (the average stays sd)', s.every((e, i) => i === 0 || near(s[i - 1][1] + s[i - 1][2], e[1])));
  r.params.gateSwing = 0; r.params.gateDiv = '1/8T';
  r.clear(); r.bookBars(2, 1);
  const t = r.of('chop');
  ok('1/8T: twelve chops a bar on the triplet lines inside the steps', t.length === 12 && t.every((e, i) => near(e[1], 4 + (Math.round((i * 96000) / 12) / 48000))));
  r.clear(); r.arp.gesture('gate', false);
  ok('release: effects.releaseGate + the bass gate off', js(r.log) === js([['release'], ['bgate', 'gate', false]]));
  r.clear(); r.bookBars(3, 1);
  ok('released: nothing more is chopped', r.of('chop').length === 0);
}
{
  const r = rig();
  r.arp.gesture('gate', true);
  r.clear(); r.arp.book(r.time.booking(0, 0));
  ok('a contract-only bass (no chop) still hears gesture(\'gate\', true, sd) per chop', js(r.of('bgate')) === js([['bgate', 'gate', true, 0.125]]));
}

console.log('\n[arp] DIVE (core.ts:968-977)');
{
  const r = rig();
  r.arp.gesture('dive', true);
  ok('on: keys bend −dist·100 cents with τ = SPEED; the bass dives the same depth', js(r.log) === js([['bend', -2400, 0.45], ['bgate', 'dive', true, -2400]]), js(r.log));
  r.arp.gesture('dive', true);
  ok('idempotent while held', r.of('bend').length === 1);
  r.clear(); r.arp.gesture('dive', false);
  ok('off: back to 0 on the keys\' own τ; the bass comes back', js(r.log) === js([['bend', 0], ['bgate', 'dive', false]]), js(r.log));
  r.params.diveDist = 12; r.params.diveSpeed = 0.2;
  r.clear(); r.arp.gesture('dive', true);
  ok('DIST 12, SPEED .2 → bend(−1200, .2)', js(r.of('bend')[0]) === js(['bend', -1200, 0.2]));
}

console.log('\n[arp] the master stop');
{
  const r = rig();
  r.arp.setLatch(true); r.arp.noteOn('kA', 60); r.arp.noteOff('kA'); r.arp.noteOn('kS', 62);
  r.arp.gesture('gate', true); r.arp.gesture('dive', true);
  r.clear(); r.arp.stop();
  ok('stop: every voice released, HOLD + ARP off, the gate released, DIVE back',
    r.arp.sounding().length === 0 && r.of('off').length === 2 && !r.arp.latch() && !r.arp.arpOn() && !r.arp.gate() && !r.arp.dive()
    && r.of('release').length === 1 && js(r.of('bend')) === js([['bend', 0]]));
  r.clear(); r.bookBars(0, 1);
  ok('after stop nothing is booked', r.log.length === 0);
}

console.log('\n[arp] a press mid-horizon joins at its own next line ≥ now + 20 ms (core.ts:929, 965: gridNext at the press)');
{
  const r = rig({ bassChop: true });
  for (let s = 0; s < 3; s++) r.arp.book(r.time.booking(0, s));   // announced through step 2: the window ends at 18000
  r.clear(); r.arp.gesture('gate', true);
  ok('GATE at t = 0 with three 16ths announced: their lines ≥ 20 ms chop at once (.125, .25 s)', js(r.of('chop').map((e) => e[1])) === js([0.125, 0.25]) && r.of('bchop').length === 2, js(r.of('chop')));
  r.clear(); r.arp.book(r.time.booking(0, 3));
  ok('…then the scheduler takes over at the window\'s end, nothing chopped twice', js(r.of('chop').map((e) => e[1])) === js([0.375]));
}
{
  const r = rig();
  for (let s = 0; s < 4; s++) r.arp.book(r.time.booking(0, s));   // the window ends at 24000 (.5 s)
  r.arp.noteOn('kC', 60);
  r.clear(); r.arp.setArp(true);
  ok('ARP on over a held note: its first 1/8 line ≥ 20 ms inside the window plucks at once (.25 s)', js(r.of('hit').map((e) => e[2])) === js([0.25]), js(r.of('hit')));
  r.clear(); r.arp.book(r.time.booking(0, 4));
  ok('…then the scheduler (.5 s), nothing twice', js(r.of('hit').map((e) => e[2])) === js([0.5]));
}
{
  const r = rig({ params: { groove: 1 } });
  for (let s = 0; s < 4; s++) r.arp.book(r.time.booking(0, s));
  r.arp.noteOn('kC', 60);
  r.clear(); r.arp.setArp(true);
  ok('…under GROOVE the catch-up walks the announced 16ths (s1 rests, s2 and s3 hit)', js(r.of('hit').map((e) => Math.floor((e[2] * 48000) / 6000))) === js([2, 3]), js(r.of('hit')));
}
{
  const r = rig();
  for (let s = 0; s < 4; s++) r.arp.book(r.time.booking(0, s));
  r.ctx.currentTime = 0.6;                                          // the announced window is behind now
  r.clear(); r.arp.gesture('gate', true);
  ok('a window already behind now books nothing (the scheduler starts the gate)', r.of('chop').length === 0);
  r.arp.gesture('gate', false); r.arp.stop();
  r.ctx.currentTime = 0; r.clear(); r.arp.gesture('gate', true);
  ok('after the master stop nothing announced is caught up', r.of('chop').length === 0);
}

console.log('\n[arp] through the harmony: a colour cap under ARP + CHORD arps ITS triad (the D §2.2 fix)');
{
  const log = [];
  const time = makeTime();
  const keys = { noteOn: () => {}, noteOff: () => {}, hit: (m, w) => log.push([m, w]), bend: () => {}, allOff: () => {}, retune: () => {}, held: () => [] };
  let root = null;
  const bass = { held: () => {}, gesture: () => {}, state: () => ({ root, armed: false }), set: (k, v) => { if (k === 'root') root = v; } };
  const effects = { chop: () => {}, releaseGate: () => {} };
  const h = createHarmony({ keys, bass, time, effects, ctx: { currentTime: 0 } });
  h.set('chord', true); h.set('arp', { ...h.state().arp, on: true });
  h.keyDown('kKeyW', h.midiFor(1, true));
  h.book(time.booking(0, 0));
  ok('C major: W = C♯ → the block is C♯ F G♯ (61 65 68), not C E G', js(log.map((e) => e[0])) === js([61, 65, 68]), js(log));
  h.keyUp('kKeyW');
  h.set('music', { key: 9, scale: 'minor', oct: 0 });
  log.length = 0;
  h.keyDown('kKeyW', h.midiFor(1, true));
  h.book(time.booking(0, 2));
  ok('A minor: W = B♭ → B♭ D F (58 62 65), not A minor', js(log.map((e) => e[0])) === js([58, 62, 65]), js(log));
  h.keyUp('kKeyW'); log.length = 0;
  h.keyDown('kKeyA', h.midiFor(0, false));
  h.book(time.booking(0, 4));
  ok('A minor: A = its diatonic triad A C E (57 60 64)', js(log.map((e) => e[0])) === js([57, 60, 64]), js(log));
}

console.log(`\n[arp] ${pass} passed, ${fail} failed`);
console.log(`arp: ${pass}/${pass + fail}`);
if (fail) process.exit(1);
