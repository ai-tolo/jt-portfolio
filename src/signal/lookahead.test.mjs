// from signal-studio-v6lib/src/engine/lookahead.test.mjs:1-154 + lookahead-review.test.mjs:1-175 (2a9e4a7) —
// the two suites VERBATIM in one file (lane T owns one suite file): part 1 = lookahead.test.mjs (16), part 2 =
// lookahead-review.test.mjs (19). [SIGNAL] joins, and nothing else: ONE pass/fail/ok (part 1's; the review's own
// copy, lines 19-23, is the same law), ONE import (the review's dynamic import, lines 16-17, is the static one
// below: lookahead.ts reads `document` only when createLookahead runs, so the stub installed at part 2 is seen
// exactly as before), and the summary prints `lookahead: N/N`.
//   source ~/.nvm/nvm.sh && node src/signal/lookahead.test.mjs
//
// ═════════════════════════════════════════════════════════════ part 1 · lookahead.test.mjs:1-151
// [W66 · R1c] THE TRANSPORT SURVIVES THE BACKGROUND — the horizon and the pulse, in isolation.
//
// THE DEFECT, measured off the RECORDING rather than off bookkeeping. Foreground control: 75 drum
// hits in 37.94 s, inter-onset 443–500 ms, no holes. Armed and hidden for 150 s: 145 hits in
// 144.55 s and EVERY interval ~1000 ms (789–1013, nearly all 995–1005) — one hit per timer wake,
// the rest of the bar gone. Idle and hidden: 1 hit/s for ~55 s, then the recorded lane's last
// interval is 39,000 ms followed by nothing. Throughout, `snapshot().beat` was true, the topbar jam
// lamp was lit, and the analyser read a healthy 0.28–0.34 RMS, so no meter could catch it. The
// engine booked 100 ms ahead on a 25 ms timer against a wake budget of 1 s or 60 s.
//
//   source ~/.nvm/nvm.sh; node --import ./src/capture/esbuild-loader.mjs src/engine/lookahead.test.mjs
import { createLookahead, createAudioHeartbeat, ENGINE_LOOK_MIN, ROW_LOOK_MIN, LOOK_MAX } from './lookahead.ts';

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${extra}`); }
}
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

console.log('\nR1c — the horizon');
{
  // IN FRONT, NOTHING MOVES. The whole reason the number was small is that a knob has to take
  // effect within a tenth of a second, and it still does.
  let wall = 0;
  const look = createLookahead({ min: ENGINE_LOOK_MIN, hidden: () => false, wallSec: () => wall });
  for (let i = 0; i < 200; i++) { look.saw(i * 0.025); wall += 0.025; }
  ok('a visible page books exactly what it always booked', near(look.horizon(), ENGINE_LOOK_MIN),
    `${look.horizon()}`);
  ok('…and carries no worst-case baggage', look.worstGap() < 0.05, `${look.worstGap()}`);
  look.dispose();
}
{
  // HIDDEN, AND THEN SETTLED. The 1 Hz budget is covered three times over before a single wake has
  // been missed — the horizon opens on the FACT of being hidden, not on the first hole.
  let wall = 0, isHidden = true;
  const look = createLookahead({ min: ENGINE_LOOK_MIN, hidden: () => isHidden, wallSec: () => wall });
  look.saw(0);
  ok('the moment it hides it books more than 0.1 s', look.horizon() > ENGINE_LOOK_MIN, `${look.horizon()}`);
  wall = 20;
  ok('…and once settled it covers three wakes of the 1 Hz budget', look.horizon() >= 3, `${look.horizon()}`);
  isHidden = false;
  ok('coming forward tightens it straight back up', near(look.horizon(), ENGINE_LOOK_MIN), `${look.horizon()}`);
  look.dispose();
}
{
  // THE ONCE-A-MINUTE REGIME. Wakes 60 s apart: the horizon has to cover the NEXT one with margin,
  // because a wake that is merely late is the same hole as a wake that never comes.
  let wall = 0;
  const look = createLookahead({ min: ENGINE_LOOK_MIN, hidden: () => true, wallSec: () => wall });
  let t = 0;
  for (let i = 0; i < 4; i++) { look.saw(t); t += 60; wall += 60; }
  ok('a 60 s wake gap opens a horizon that outlasts the next one', look.horizon() > 60,
    `${look.horizon().toFixed(1)} s`);
  ok('…and never past the ceiling', look.horizon() <= LOOK_MAX, `${look.horizon()}`);
  // …and it decays once the wakes come back, so one bad minute is not carried all night
  for (let i = 0; i < 400; i++) { t += 0.025; look.saw(t); }
  ok('…and it decays back as the wakes return', look.horizon() < 4,
    `${look.horizon().toFixed(3)} (gap ${look.worstGap().toFixed(3)})`);
  look.dispose();
}
{
  // THE ROW PLAYER'S OWN FLOOR, unchanged in front. bg-row measured 101 of 170 background seconds
  // silent with `rowRunning()` true and the stop cap lit; in front it is a 0.2 s booking and stays one.
  let wall = 0;
  const look = createLookahead({ min: ROW_LOOK_MIN, hidden: () => false, wallSec: () => wall });
  for (let i = 0; i < 60; i++) { look.saw(i * 0.05); wall += 0.05; }
  ok('the row player books its own 0.2 s in front', near(look.horizon(), ROW_LOOK_MIN), `${look.horizon()}`);
  look.dispose();
}
{
  // A NON-FINITE CLOCK READING must never poison the horizon (an engine that has not started yet).
  const look = createLookahead({ min: ENGINE_LOOK_MIN, hidden: () => false, wallSec: () => 0 });
  look.saw(NaN); look.saw(0); look.saw(Infinity); look.saw(0.05);
  ok('a nonsense clock reading is ignored rather than believed',
    Number.isFinite(look.horizon()) && look.horizon() <= LOOK_MAX, `${look.horizon()}`);
  look.dispose();
}

console.log('\nR1c — the audio-clock pulse');
{
  /** an AudioContext just real enough: a clock, a gain, and constant sources that honour stop(). */
  function fakeCtx() {
    const pending = [];
    const ctx = {
      currentTime: 0,
      createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
      createConstantSource: () => {
        const src = {
          offset: { value: 1 }, onended: null,
          connect() {}, disconnect() {},
          start() {},
          stop(at) { pending.push({ at, src }); },
        };
        return src;
      },
      destination: {},
      _advance(to) {
        ctx.currentTime = to;
        for (;;) {
          const i = pending.findIndex((p) => p.at <= ctx.currentTime);
          if (i < 0) break;
          const [p] = pending.splice(i, 1);
          if (typeof p.src.onended === 'function') p.src.onended();
        }
      },
      _armed: () => pending.length,
    };
    return ctx;
  }
  const ctx = fakeCtx();
  let beats = 0;
  const hb = createAudioHeartbeat(ctx, () => { beats++; }, 0.25);
  ok('the pulse arms itself immediately', ctx._armed() === 1, `${ctx._armed()}`);
  for (let t = 0.25; t <= 5.0001; t += 0.25) ctx._advance(t);
  ok('it beats once per interval on the AUDIO clock', beats === 20, `${beats}`);
  ok('…and re-arms every time', ctx._armed() === 1, `${ctx._armed()}`);
  hb.stop();
  const at = beats;
  for (let t = 5.25; t <= 7; t += 0.25) ctx._advance(t);
  ok('stopping it stops it', beats === at, `${beats} vs ${at}`);
}
{
  // A CALLBACK THAT THROWS must not stop the pulse — the scheduler is the thing that fails, and a
  // scheduler that fails once and is never woken again is the defect this exists to prevent.
  const pending = [];
  const ctx = {
    currentTime: 0,
    createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    createConstantSource: () => ({
      offset: { value: 1 }, onended: null, connect() {}, disconnect() {}, start() {},
      stop(at) { pending.push({ at, src: this }); },
    }),
    destination: {},
  };
  let beats = 0;
  createAudioHeartbeat(ctx, () => { beats++; throw new Error('scheduler blew up'); }, 0.25);
  for (let k = 0; k < 5; k++) {
    ctx.currentTime += 0.25;
    const p = pending.shift();
    if (p && typeof p.src.onended === 'function') p.src.onended();
  }
  ok('a throwing scheduler does not kill the pulse', beats === 5, `${beats}`);
}
{
  // AN ENGINE THAT REFUSES THE NODE (an offline/limited context) degrades to no heartbeat, never a throw.
  const ctx = { currentTime: 0, createGain() { throw new Error('no'); }, createConstantSource() { throw new Error('no'); }, destination: {} };
  let threw = false;
  try { createAudioHeartbeat(ctx, () => {}, 0.25).stop(); } catch { threw = true; }
  ok('a context that refuses the node simply has no pulse', threw === false);
}

// ═════════════════════════════════════════════════════════════ part 2 · lookahead-review.test.mjs:1-14, 24-172
// [W66 · R1 REVIEW] R1c re-attacked: what the horizon does on the way BACK, which is the half the
// suite did not measure. The claim under test is the one the module leads with — "In front it is
// exactly 0.1 s (engine) / 0.2 s (row) … the whole reason those numbers were small is that a knob
// has to answer within a tenth of a second, and it still does."

// a document stub, so `visibilitychange` is a real transition rather than an injected boolean
let visibility = 'visible';
const listeners = new Set();
globalThis.document = {
  get visibilityState() { return visibility; },
  addEventListener(t, cb) { if (t === 'visibilitychange') listeners.add(cb); },
  removeEventListener(t, cb) { if (t === 'visibilitychange') listeners.delete(cb); },
};
const setVis = (v) => { visibility = v; for (const cb of [...listeners]) cb(); };

// [SIGNAL] lines 16-17 (`await import('./lookahead.ts')`) and 19-23 (pass/fail/ok) are part 1's, above.

let wall = 0;
const mk = (min = ENGINE_LOOK_MIN) => createLookahead({ min, wallSec: () => wall });

console.log('\n§1 — in front, nothing changed');
{
  visibility = 'visible'; wall = 0;
  const l = mk();
  let t = 0;
  for (let i = 0; i < 200; i++) { t += 0.025; wall = t; l.saw(t); }
  ok('the engine horizon is exactly 0.1 s', l.horizon() === ENGINE_LOOK_MIN, `${l.horizon()}`);
  const r = mk(ROW_LOOK_MIN);
  let u = 0;
  for (let i = 0; i < 200; i++) { u += 0.05; wall = u; r.saw(u); }
  ok('the row horizon is exactly 0.2 s', r.horizon() === ROW_LOOK_MIN, `${r.horizon()}`);
  l.dispose(); r.dispose();
}

console.log('\n§2 — hidden: it opens, and it covers the wake that is about to be late');
{
  visibility = 'visible'; wall = 0;
  const l = mk();
  let t = 0;
  for (let i = 0; i < 40; i++) { t += 0.025; wall = t; l.saw(t); }
  setVis('hidden');
  ok('the first hidden wake already books past a 1 Hz budget-ish transition', l.horizon() >= 0.6,
    `${l.horizon()}`);
  // ten seconds of the once-a-second regime
  for (let i = 0; i < 10; i++) { t += 1; wall = t; l.saw(t); }
  ok('settled hidden, the horizon covers three late wakes', l.horizon() >= 3, `${l.horizon()}`);
  // …and the once-a-minute regime
  for (let i = 0; i < 3; i++) { t += 60; wall = t; l.saw(t); }
  ok('a 60 s wake is covered with margin', l.horizon() >= 60, `${l.horizon()}`);
  ok('…and never past the ceiling', l.horizon() <= LOOK_MAX, `${l.horizon()}`);
  l.dispose();
}

console.log('\n§3 — THE WAY BACK: a knob has to answer within a tenth of a second');
{
  visibility = 'visible'; wall = 0;
  const l = mk();
  let t = 0;
  for (let i = 0; i < 40; i++) { t += 0.025; wall = t; l.saw(t); }
  setVis('hidden');
  for (let i = 0; i < 3; i++) { t += 60; wall = t; l.saw(t); } // the once-a-minute regime
  const parked = l.horizon();
  setVis('visible');
  t += 0.025; wall = t; l.saw(t);   // the very first foreground wake after coming back
  ok('the horizon is 0.1 s on the FIRST wake after coming forward',
    l.horizon() === ENGINE_LOOK_MIN,
    `parked at ${parked.toFixed(1)}s, still ${l.horizon().toFixed(1)}s on return — every note inside`
    + ' that window is already booked and cannot be unbooked, so the faceplate is deaf for it');
  // …and how long it takes to come back, if it does not reset
  let ticks = 0;
  while (l.horizon() > ENGINE_LOOK_MIN + 1e-9 && ticks < 100000) { t += 0.025; wall = t; l.saw(t); ticks++; }
  console.log(`      (it takes ${ticks} foreground wakes ≈ ${(ticks * 0.025).toFixed(2)} s to tighten up)`);
  ok('…and it does tighten up eventually', ticks < 100000, `${ticks}`);
  l.dispose();
}

console.log('\n§3b — RV9: A TRANSPORT THAT WAS NOT RUNNING IS NOT A WAKE REGIME');
{
  /* THE ONE THAT BROKE THE STOP. `saw()` measures tick-to-tick distance, and a clock that STOPS
   * ticks not at all — so the first tick after a restart put the whole silence into the
   * measurement. Press stop, wait five seconds, press play: a five-second "wake", the horizon opens
   * to three times it, and the transport books up to a minute and a half of drums in advance.
   * Booked notes cannot be unbooked, so the NEXT stop takes the lamp dark and leaves the room
   * playing — measured in a real browser at room = 0.62 RMS after the master stop, and never quiet
   * again for the rest of the run (qa-lane-k's ten "silence the room" checks: green at v6-library,
   * red at this lane's tip, green again with `restart`). */
  visibility = 'visible'; wall = 0;
  const l = mk();
  let t = 0;
  for (let i = 0; i < 40; i++) { t += 0.025; wall = t; l.saw(t); }
  ok('running, in front: 0.1 s', l.horizon() === ENGINE_LOOK_MIN, `${l.horizon()}`);
  // …the transport stops for five seconds, and then he presses play
  t += 5; wall = t;
  l.restart();
  l.saw(t);
  ok('the first tick after a restart is not a five-second wake', l.horizon() === ENGINE_LOOK_MIN,
    `${l.horizon()} — the stop's own silence became the horizon, so the next stop could not stop`);
  ok('…and the worst gap starts over with it', l.worstGap() === 0, `${l.worstGap()}`);
  for (let i = 0; i < 10; i++) { t += 0.025; wall = t; l.saw(t); }
  ok('…and it stays 0.1 s as the transport runs on', l.horizon() === ENGINE_LOOK_MIN, `${l.horizon()}`);
  // and WITHOUT the restart, which is the defect, stated as an arithmetic fact
  const bad = mk();
  let u = 0;
  for (let i = 0; i < 40; i++) { u += 0.025; wall = u; bad.saw(u); }
  u += 5; wall = u; bad.saw(u);
  ok('(the defect, for the record: an unannounced restart books 15 s ahead)',
    Math.abs(bad.horizon() - 15) < 1e-9, `${bad.horizon()}`);
  l.dispose(); bad.dispose();
}

console.log('\n§4 — the pulse');
{
  // a context stub: schedule `stop(t)` and fire `ended` when the fake clock passes it
  const pend = [];
  let now = 0;
  const ctx = {
    get currentTime() { return now; },
    destination: {},
    createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    createConstantSource: () => {
      const node = {
        offset: { value: 0 }, onended: null,
        connect() {}, disconnect() {},
        start() {}, stop(t) { pend.push({ t, node }); },
      };
      return node;
    },
  };
  const beat = createAudioHeartbeat(ctx, () => {}, 0.25);
  const advance = (dt) => {
    now += dt;
    for (const p of [...pend]) if (p.t <= now) { pend.splice(pend.indexOf(p), 1); p.node.onended?.(); }
  };
  for (let i = 0; i < 40; i++) advance(0.25);
  ok('the pulse re-arms from its own ended event', beat.beats() === 40, `${beat.beats()}`);
  ok('exactly one node is in flight at a time', pend.length === 1, `${pend.length}`);
  beat.stop();
  const at = beat.beats();
  for (let i = 0; i < 10; i++) advance(0.25);
  ok('…and stops when told', beat.beats() === at, `${at} → ${beat.beats()}`);
  ok('…leaving nothing armed', pend.length === 0, `${pend.length}`);
}
{
  // a scheduler that throws must not kill the pulse
  const pend = [];
  let now = 0;
  const ctx = {
    get currentTime() { return now; }, destination: {},
    createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    createConstantSource: () => ({ offset: { value: 0 }, onended: null, connect() {}, disconnect() {}, start() {}, stop(t) { pend.push({ t, node: this }); } }),
  };
  // `this` in the object literal's stop() is the node, which is what we want
  const beat = createAudioHeartbeat(ctx, () => { throw new Error('scheduler blew up'); }, 0.25);
  const advance = (dt) => { now += dt; for (const p of [...pend]) if (p.t <= now) { pend.splice(pend.indexOf(p), 1); p.node.onended?.(); } };
  for (let i = 0; i < 5; i++) advance(0.25);
  ok('a throwing scheduler does not stop the pulse', beat.beats() === 5, `${beat.beats()}`);
  beat.stop();
}
{
  // an engine that refuses the node simply has no heartbeat, and does not throw
  const ctx = { currentTime: 0, destination: {}, createGain: () => { throw new Error('no'); }, createConstantSource: () => { throw new Error('no'); } };
  let threw = false;
  try { const b = createAudioHeartbeat(ctx, () => {}, 0.25); b.stop(); } catch { threw = true; }
  ok('a context that refuses the nodes is survivable', !threw);
}

// [SIGNAL] the summary (lookahead.test.mjs:153-154 + lookahead-review.test.mjs:174-175, one line each way)
console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}  ${pass} passed, ${fail} failed`);
console.log(`lookahead: ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
