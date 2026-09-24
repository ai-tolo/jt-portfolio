// SIGNAL · THE TIMEKEEPER, walked with numbers against a FAKE context (lane T; new here, shaped like
// signal-studio-page/src/page/grid.test.mjs §5-6 (67b6b58): a ctx whose clock the suite moves by hand).
//   source ~/.nvm/nvm.sh && node src/signal/time.test.mjs
//
// The fake ctx has a clock (currentTime, sampleRate 48000, state) and ONLY the heartbeat's two node kinds
// (createGain, createConstantSource, whose stop(t) fires `ended` when the suite moves the clock past t);
// any other node is recorded as a violation: the Timekeeper announces lines, the modules book the audio.
// The 25 ms timer is injected (opts.setTimer) and fired by hand, so every tick is the suite's.
import {
  createTimekeeper, TIME_SEAT_SEC, TIME_JOIN_SEC, TIME_LATE_SEC, TIME_HORIZON_SEC, TIME_TICK_MS, TAP_KEEP, TAP_RESET_MS,
  STEPS_PER_BAR,
} from './time.ts';
import { lineFrame, lineAtOrAfter, linesIn, beatFrameOf, barFrameOf, nextBeat } from './grid.ts';
import { BPM_DEFAULT, BPM_MIN, BPM_MAX } from './types.ts';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  (cond ? pass++ : fail++);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
const SR = 48000;
const SEAT = Math.round(TIME_SEAT_SEC * SR);        // 2400
const JOIN = Math.round(TIME_JOIN_SEC * SR);        // 960
const LATE = Math.round(TIME_LATE_SEC * SR);        // 192
const HORIZON = Math.round(TIME_HORIZON_SEC * SR);  // 5760
const PERBARS = [2, 4, 6, 8, 12, 16, 24, 32];
const flush = () => new Promise((r) => setImmediate(r));   // want()'s microtask tick runs before this resolves
const idx = (s) => s.bar * 16 + s.step;                     // a 16th's running count
const consecutive = (xs) => xs.every((s, k) => k === 0 || idx(s) === idx(xs[k - 1]) + 1);

function fakeCtx({ t = 10, state = 'running', sr = SR } = {}) {
  const pending = [];
  const made = { gains: [], sources: 0, violations: [] };
  const ctx = {
    currentTime: t, sampleRate: sr, state,
    destination: { isDestination: true },
    createGain() {
      const g = { gain: { value: 1 }, outs: [], gone: false,
        connect(n) { g.outs.push(n); return n; }, disconnect() { g.outs = []; g.gone = true; } };
      made.gains.push(g);
      return g;
    },
    createConstantSource() {
      made.sources++;
      const src = { offset: { value: 1 }, onended: null, outs: [],
        connect(n) { src.outs.push(n); return n; }, disconnect() { src.outs = []; },
        start() {}, stop(at) { pending.push({ at, src }); } };
      return src;
    },
    createBufferSource() { made.violations.push('createBufferSource'); throw new Error('the Timekeeper booked audio'); },
    createOscillator() { made.violations.push('createOscillator'); throw new Error('the Timekeeper booked audio'); },
    /** Move the audio clock to `to`; every pulse whose stop time has passed ends (the heartbeat's wake). */
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
    _made: made,
  };
  return ctx;
}

/** A hand-fired repeating timer (setInterval semantics). */
function fakeTimer() {
  const t = {
    live: new Map(), next: 1, sets: 0, clears: 0,
    setTimer(fn, ms) { const h = t.next++; t.live.set(h, { fn, ms }); t.sets++; return h; },
    clearTimer(h) { if (t.live.delete(h)) t.clears++; },
    fire() { for (const { fn } of [...t.live.values()]) fn(); },
    get count() { return t.live.size; },
  };
  return t;
}

/** A keeper on a fake ctx, with a recorder on onStep/onBar (each line's grid() read INSIDE the callback). */
function rig(o = {}) {
  const ctx = fakeCtx(o);
  const timer = fakeTimer();
  const tk = createTimekeeper({ ctx, bpm: o.bpm }, {
    setTimer: timer.setTimer, clearTimer: timer.clearTimer, heartbeat: o.heartbeat,
    hidden: o.hidden ?? (() => false), wallSec: o.wallSec ?? (() => ctx.currentTime),
  });
  const steps = [], bars = [], log = [];
  tk.onStep((b) => { steps.push({ ...b, at: ctx.currentTime, grid: tk.grid() }); log.push(`s${b.bar}.${b.step}`); });
  tk.onBar((bar, frame) => { bars.push({ bar, frame, grid: tk.grid() }); log.push(`b${bar}`); });
  /** Run the clock `seconds` on in `dt` wakes: the pulse's `ended` first, then the 25 ms timer, same instant. */
  const run = (seconds, dt = TIME_TICK_MS / 1000) => {
    const end = ctx.currentTime + seconds;
    while (ctx.currentTime < end - 1e-9) { ctx._advance(Math.min(end, ctx.currentTime + dt)); timer.fire(); }
  };
  return { ctx, timer, tk, steps, bars, log, run };
}

// ── 1. the tempo: the lattice's bar is a whole number of frames, the bpm derived from it ──────────────
{
  const { tk } = rig();
  ok('the default is 120 bpm = 96000 frames a bar at 48 kHz', tk.bpm() === BPM_DEFAULT && tk.grid().barFrames === 96000);
  ok('not running before any part wants the clock', tk.running() === false);
  ok('a construction bpm out of range clamps (300 → 180, 10 → 60); junk is the default',
    rig({ bpm: 300 }).tk.bpm() === BPM_MAX && rig({ bpm: 10 }).tk.bpm() === BPM_MIN && rig({ bpm: NaN }).tk.bpm() === 120 && rig({ bpm: -3 }).tk.bpm() === 120);
  tk.setBpm(121);
  ok('setBpm(121) = the nearest whole-frame bar (95207) and bpm() is DERIVED from it', tk.grid().barFrames === 95207 && tk.bpm() === 240 * SR / 95207, `${tk.bpm()}`);
  ok('a derived bpm fed back (a save → a reload) lands on the same frames', rig({ bpm: tk.bpm() }).tk.grid().barFrames === 95207);
  tk.setBpm(500);
  ok('setBpm clamps high to 180 (64000 frames)', tk.bpm() === 180 && tk.grid().barFrames === 64000);
  tk.setBpm(59.9);
  ok('…and low to 60 (192000 frames)', tk.bpm() === 60 && tk.grid().barFrames === 192000);
  tk.setBpm(NaN); tk.setBpm(0); tk.setBpm(-5); tk.setBpm(Infinity);
  ok('NaN, 0, a negative and Infinity are not tempos: ignored', tk.bpm() === 60);
  const odd = createTimekeeper({ ctx: fakeCtx({ sr: 44101 }), bpm: 180 }, { setTimer: () => 1, clearTimer: () => {}, heartbeat: false });
  ok('at an odd rate (44101) the derived bpm still never leaves 60..180 (58802 frames, not 58801)',
    odd.bpm() <= 180 && odd.bpm() > 179.99 && odd.grid().barFrames === 58802, `${odd.bpm()}`);
}

// ── 2. want / un-want: the core's wantsClock law ───────────────────────────────────────────────────────
{
  const r = rig({ t: 10 });
  const { ctx, timer, tk, steps } = r;
  tk.want('drums', true);
  const g = tk.grid();
  ok('the first want: running, ONE repeating timer at 25 ms', tk.running() && timer.count === 1 && [...timer.live.values()][0].ms === 25);
  ok('…the origin seated now + 50 ms, at the tempo', g.originFrame === 10 * SR + SEAT && g.barFrames === 96000);
  const sink = ctx._made.gains[0];
  ok('…the heartbeat armed: ONE 0-gain sink on ctx.destination and one silent pulse in flight',
    ctx._made.gains.length === 1 && sink.gain.value === 0 && sink.outs.length === 1 && sink.outs[0] === ctx.destination && ctx._armed() === 1);
  ok('the origin line is not announced inside want() itself', steps.length === 0);
  await flush();
  ok('…it is announced before the caller\'s task ends (a microtask): bar 0 step 0 at the origin',
    steps.length === 1 && steps[0].frame === g.originFrame && steps[0].bar === 0 && steps[0].step === 0);
  tk.want('drums', true); tk.want('bass', true);
  ok('the same want again, or another part\'s: nothing re-seated, nothing restarted',
    tk.grid().originFrame === g.originFrame && timer.sets === 1 && ctx._made.gains.length === 1);
  tk.want('drums', false);
  ok('an un-want while another part still wants the clock keeps it', tk.running() && timer.count === 1);
  tk.want('arp', false);
  ok('un-wanting a part that never wanted is a no-op', tk.running() && timer.count === 1);
  r.run(0.5);
  const n = steps.length;
  tk.want('bass', false);
  ok('the LAST un-want stops it: not running, the timer cleared, the pulse\'s sink off the destination',
    !tk.running() && timer.count === 0 && timer.clears === 1 && sink.gone === true);
  r.run(1.5);
  ok('…and nothing is announced after it (neither the timer nor the pulse wakes it)', steps.length === n);
  ok('…the origin dropped: grid() is the tempo at frame 0, the playhead at rest',
    tk.grid().originFrame === 0 && tk.grid().barFrames === 96000 && JSON.stringify(tk.playhead()) === '{"bar":0,"step":0,"phase":0}');
  ctx._advance(20);
  tk.want('gate', true);
  await flush();
  ok('a want after that seats a NEW origin (now + 50 ms) and counts from bar 0 again',
    tk.grid().originFrame === 20 * SR + SEAT && steps.at(-1).frame === 20 * SR + SEAT && steps.at(-1).bar === 0 && steps.at(-1).step === 0);
  ok('each seating makes its own pulse (2 sinks so far, the first one gone)', ctx._made.gains.length === 2 && ctx._made.gains[0].gone && !ctx._made.gains[1].gone);
  tk.stop();
}
{
  // THE ORDER OF want() AND A MODULE'S OWN on-STATE DOES NOT MATTER (the microtask): the downbeat books.
  const { tk } = rig({ t: 3, heartbeat: false });
  let drumsOn = false;
  const booked = [];
  tk.onStep((b) => { if (drumsOn) booked.push(b); });
  tk.want('drums', true);
  drumsOn = true;                 // the instrument flips the module on AFTER want(), in the same task
  await flush();
  ok('want() first, the module\'s set(on) second, same task: the downbeat still books', booked.length === 1 && booked[0].bar === 0 && booked[0].step === 0);
  tk.stop();
}

// ── 3. booking: every 16th line once, in order, on the lattice, inside the horizon ─────────────────────
{
  const r = rig({ t: 10 });
  const { ctx, tk, steps, bars, log } = r;
  tk.want('drums', true);
  await flush();
  r.run(8.3);                     // four bars at 120 and a little
  const g = tk.grid();
  ok('four bars announced: 64 lines by bar 4 (and the horizon\'s worth beyond)', steps.filter((s) => s.bar < 4).length === 64 && steps.length >= 64);
  ok('every line exactly once, in order: 0.0 … 0.15, 1.0 … — no gap, no repeat', steps.every((s, k) => s.bar === Math.floor(k / 16) && s.step === k % 16));
  ok('every line IS its lattice frame: origin + bar·bf + round(step·bf/16)', steps.every((s) => s.frame === lineFrame(g, s.bar, s.step, 16)));
  ok('frames strictly increase (no line twice)', steps.every((s, k) => k === 0 || s.frame > steps[k - 1].frame) && new Set(steps.map((s) => s.frame)).size === steps.length);
  ok('each line is announced ≥ 4 ms and < the horizon (120 ms) ahead of its frame',
    steps.every((s) => { const lead = s.frame - Math.round(s.at * SR); return lead >= LATE && lead < HORIZON; }),
    `leads ${Math.min(...steps.map((s) => s.frame - Math.round(s.at * SR)))}..${Math.max(...steps.map((s) => s.frame - Math.round(s.at * SR)))} frames`);
  ok('onBar at every bar line (bar, its frame), once each', bars.length === Math.floor(idx(steps.at(-1)) / 16) + 1 && bars.every((b, k) => b.bar === k && b.frame === barFrameOf(g, k)));
  ok('…just before that line\'s onStep', log.every((e, k) => !e.startsWith('b') || log[k + 1] === `s${e.slice(1)}.0`));
  ok('the steps are 16 per bar (STEPS_PER_BAR) and a beat is 4 of them', STEPS_PER_BAR === 16 && steps.filter((s) => s.step % 4 === 0).every((s) => s.frame === beatFrameOf(g, s.bar, s.step / 4)));
  const n = steps.length;
  for (let k = 0; k < 10; k++) r.timer.fire();
  ok('NO DOUBLE BOOKING: ten more timer wakes at the same instant announce nothing', steps.length === n);
  ctx._advance(ctx.currentTime); r.timer.fire();
  ok('…nor the pulse and the timer waking together', steps.length === n);
  r.run(0.001);
  ok('…and a wake 1 ms later announces only what its horizon newly reaches (≤ 1 line)', steps.length - n <= 1 && consecutive(steps));
  // two listeners see the same lines in the same order; an unsubscribe is honoured
  const other = [];
  const off = tk.onStep((b) => other.push(idx(b)));
  const from = steps.length;
  r.run(1);
  ok('a second listener sees the same lines, in the same order', JSON.stringify(other) === JSON.stringify(steps.slice(from).map(idx)));
  off();
  const m = other.length;
  r.run(1);
  ok('its unsubscribe is honoured', other.length === m && steps.length > from + m);
  tk.stop();
}

// ── 4. LATE LINES ARE SKIPPED, NEVER CRAMMED ────────────────────────────────────────────────────────────
{
  const r = rig({ t: 10, heartbeat: false });
  const { ctx, tk, steps } = r;
  tk.want('drums', true);
  await flush();
  r.run(1);
  const g = tk.grid();
  const last = steps.at(-1);
  const n = steps.length;
  ctx.currentTime += 1.3;         // a stall: 1.3 s with no wake at all
  r.timer.fire();
  const nowF = Math.round(ctx.currentTime * SR);
  const after = steps.slice(n);
  const first = lineAtOrAfter(g, 16, nowF + LATE);
  ok('after a stall nothing is announced in the past or within 4 ms of now', after.length > 0 && after.every((s) => s.frame >= nowF + LATE));
  ok('the first line after it is the first 16th at or after now + 4 ms', after[0].frame === first.frame && after[0].bar === first.bar && after[0].step === first.i);
  const missed = idx(after[0]) - idx(last) - 1;
  const expect = linesIn(g, 16, last.frame + 1, nowF + LATE).length;
  ok('the lines the stall covered are skipped outright (never announced late)', missed === expect && missed >= 9, `${missed} skipped`);
  ok('…and from there the count runs on, one line at a time', consecutive(after));
  // the 4 ms edge, both sides
  r.run(0.5);
  const c1 = lineAtOrAfter(g, 16, steps.at(-1).frame + 1);   // the first line not yet announced
  ctx.currentTime = (c1.frame - Math.round(0.003 * SR)) / SR; // that line is 3 ms away
  r.timer.fire();
  ok('a line 3 ms from now is skipped', !steps.some((s) => s.frame === c1.frame) && steps.at(-1).frame > c1.frame);
  r.run(0.5);
  const c2 = lineAtOrAfter(g, 16, steps.at(-1).frame + 1);
  ctx.currentTime = (c2.frame - Math.round(0.005 * SR)) / SR; // 5 ms away
  r.timer.fire();
  ok('a line 5 ms from now is still announced', steps.some((s) => s.frame === c2.frame));
  tk.stop();
}

// ── 5. GATED ON ctx.state === 'running' (and a start nobody heard starts on its one) ────────────────────
{
  const r = rig({ t: 0, state: 'suspended' });
  const { ctx, tk, steps } = r;
  tk.want('drums', true);
  await flush();
  const origin = tk.grid().originFrame;
  r.timer.fire(); r.timer.fire();
  ok('suspended: running() but nothing announced (bookings would pile up at resume)', tk.running() && steps.length === 0 && origin === SEAT);
  ctx.state = 'running';
  ctx.currentTime = 0.01;
  r.timer.fire();
  ok('running: the first wake announces bar 0 step 0 at the seated origin', steps.length >= 1 && steps[0].frame === origin && idx(steps[0]) === 0);
  tk.stop();
}
{
  const r = rig({ t: 0, state: 'suspended' });
  const { ctx, tk, steps } = r;
  tk.want('drums', true);
  await flush();
  ctx.state = 'running';
  ctx.currentTime = 0.12;          // the device took 120 ms to start: the seated origin (50 ms) is already past
  r.timer.fire();
  ok('a FRESH origin found late is re-seated now + 50 ms and starts on its one (not skipped into the bar)',
    steps[0].bar === 0 && steps[0].step === 0 && steps[0].frame === Math.round(0.12 * SR) + SEAT && tk.grid().originFrame === steps[0].frame);
  ok('…and the playhead counts from the re-seated one', (() => { ctx.currentTime = (steps[0].frame + 7000) / SR; const p = tk.playhead(); return p.bar === 0 && p.step === 1; })());
  tk.stop();
}

// ── 6. nextLine: a joining part starts on its own division's line, in phase ─────────────────────────────
{
  const r = rig({ t: 10 });
  const { ctx, tk, steps } = r;
  const l0 = tk.nextLine(16);
  ok('unseated: nextLine is the origin the next want would seat (now + 50 ms, bar 0, i 0)', l0.frame === 10 * SR + SEAT && l0.bar === 0 && l0.i === 0 && l0.perBar === 16);
  tk.want('arp', true);
  await flush();
  ok('right after the first want every division\'s next line is the origin itself',
    PERBARS.every((n) => { const l = tk.nextLine(n); return l.frame === tk.grid().originFrame && l.bar === 0 && l.i === 0 && l.perBar === n; }));
  r.run(3.7);
  const g = tk.grid();
  const nowF = Math.round(ctx.currentTime * SR);
  let good = 0;
  for (const n of PERBARS) {
    const l = tk.nextLine(n);
    if (l.frame >= nowF + JOIN && linesIn(g, n, nowF + JOIN, l.frame).length === 0 && l.frame === lineFrame(g, l.bar, l.i, n) && l.perBar === n) good++;
  }
  ok('mid-run, every division: the FIRST of its lines at or after now + 20 ms, on the running lattice', good === PERBARS.length, `${good}/${PERBARS.length}`);
  const l16 = tk.nextLine(16);
  r.run(0.4);
  ok('…in phase with what already runs: its 16th is the very line onStep announces at that frame',
    steps.some((s) => s.frame === l16.frame && s.bar === l16.bar && s.step === l16.i));
  const f = lineFrame(g, 9, 5, 12);
  ok('nextLine(perBar, fromFrame): on a line → that line; one frame past → the next', tk.nextLine(12, f).i === 5 && tk.nextLine(12, f).bar === 9 && tk.nextLine(12, f + 1).i === 6);
  ok('a nonsense perBar is read as 16ths (never a throw)', tk.nextLine(NaN).perBar === 16 && tk.nextLine(0).perBar === 16 && tk.nextLine(-2).perBar === 16);
  tk.stop();
}

// ── 7. THE TEMPO CHANGE LANDS ON THE NEXT BEAT, KEEPING THE COUNT ───────────────────────────────────────
{
  const r = rig({ t: 10, heartbeat: false });
  const { ctx, tk, steps } = r;
  tk.want('drums', true);
  await flush();
  r.run(3.33);
  const old = tk.grid();
  const n = steps.length;
  const cursor = lineAtOrAfter(old, 16, steps.at(-1).frame + 1);   // the first line not yet announced
  const at = nextBeat(old, cursor.frame);
  const before = JSON.stringify(steps.map((s) => [s.frame, s.bar, s.step]));
  tk.setBpm(100);
  ok('bpm() follows at once (the tempo glass): exactly 100', tk.bpm() === 100);
  ok('grid() at now is still the old lattice: the switch is PENDING', tk.grid().barFrames === 96000 && tk.grid().originFrame === old.originFrame);
  ok('the landing beat is at or after the first unannounced line (nothing booked needs cancelling)', at.frame >= cursor.frame && at.frame > steps.at(-1).frame);
  // …the cursor passes the landing while now has not reached it: grid() still answers for NOW
  ctx.currentTime = (at.frame - Math.round(0.06 * SR)) / SR;
  r.timer.fire();
  ok('once the cursor has passed the landing but now has not, grid() is still the old lattice', steps.some((s) => s.frame >= at.frame) && tk.grid().barFrames === 96000);
  r.run(3);
  ok('grid() is the new lattice once now is past the landing', tk.grid().barFrames === 115200);
  const after = steps.slice(n);
  const pre = after.filter((s) => s.frame < at.frame);
  const post = after.filter((s) => s.frame >= at.frame);
  ok('nothing announced before the change moved', JSON.stringify(steps.slice(0, n).map((s) => [s.frame, s.bar, s.step])) === before);
  ok('lines before the landing still come from the old lattice (and grid() inside onStep says so)',
    pre.every((s) => s.frame === lineFrame(old, s.bar, s.step, 16) && s.grid.barFrames === 96000 && s.grid.originFrame === old.originFrame));
  ok('the landing line IS that beat: the same frame, the same bar, the same beat (step = beat·4)',
    post[0].frame === at.frame && post[0].bar === at.bar && post[0].step === at.beat * 4, `bar ${at.bar} beat ${at.beat}`);
  const ng = post[0].grid;
  ok('the new lattice is 100 bpm and passes through that beat to the frame: beatFrameOf(new, bar, beat) = at',
    ng.barFrames === 115200 && beatFrameOf(ng, at.bar, at.beat) === at.frame && ng.originFrame === at.frame - beatFrameOf({ sr: SR, barFrames: 115200, originFrame: 0 }, at.bar, at.beat));
  ok('every line from the landing on is the new lattice\'s, 7200 frames apart',
    post.every((s) => s.frame === lineFrame(ng, s.bar, s.step, 16) && s.grid.barFrames === 115200) && post.every((s, k) => k === 0 || s.frame - post[k - 1].frame === 7200));
  ok('THE COUNT RUNS ON across the switch: no gap, no repeat', consecutive(steps) && steps.every((s, k) => k === 0 || s.frame > steps[k - 1].frame));
  ok('onBar after the switch sits on the new lattice\'s bar lines', r.bars.filter((b) => b.frame > at.frame).every((b) => b.frame === barFrameOf(ng, b.bar)));
  tk.stop();
}
{
  // A DRAG: ten changes before the cursor reaches the switch are ONE switch, at the same beat, at the last tempo.
  const r = rig({ t: 10, heartbeat: false });
  const { tk, steps } = r;
  tk.want('drums', true);
  await flush();
  r.run(2.21);
  const old = tk.grid();
  const n = steps.length;
  const at = nextBeat(old, lineAtOrAfter(old, 16, steps.at(-1).frame + 1).frame);
  for (let b = 121; b <= 130; b++) tk.setBpm(b);
  r.run(2);
  const post = steps.slice(n).filter((s) => s.frame >= at.frame);
  const kinds = new Set(steps.slice(n).map((s) => s.grid.barFrames));
  ok('a drag before the landing is one switch at the same beat, straight to the last tempo',
    post[0].frame === at.frame && kinds.size === 2 && kinds.has(96000) && kinds.has(Math.round(240 * SR / 130)) && tk.bpm() === 240 * SR / Math.round(240 * SR / 130));
  ok('…and the count ran on through it', consecutive(steps));
  // …and a change that comes back to the grid in force before the landing is no switch at all
  const m = steps.length;
  const g2 = post[0].grid;
  tk.setBpm(90);
  tk.setBpm(130);
  r.run(2);
  ok('there and back before the landing: no switch, the lines stay on the lattice in force',
    steps.slice(m).every((s) => s.grid.barFrames === g2.barFrames && s.grid.originFrame === g2.originFrame && s.frame === lineFrame(g2, s.bar, s.step, 16)) && consecutive(steps));
  tk.setBpm(130.0000001);
  ok('a bpm that rounds to the same bar is no switch either', steps.length > m && (r.run(1), steps.slice(m).every((s) => s.grid.barFrames === g2.barFrames)));
  tk.stop();
}
{
  // A BIG JUMP, THEN ANOTHER, with the cursor one 16th past a beat: the second change must replace the pending
  // switch against the lattice IN FORCE (120), never against the pending one (180), whose beats extrapolated back
  // put a phantom beat BEFORE the landing (at − 16000 frames, after the cursor at at − 18000).
  const r = rig({ t: 10, heartbeat: false });
  const { ctx, tk, steps } = r;
  tk.want('drums', true);
  await flush();
  r.run(1);
  while (steps.at(-1).step % 4 !== 0) { ctx.currentTime += 0.001; r.timer.fire(); }
  const old = tk.grid();
  const cursor = lineAtOrAfter(old, 16, steps.at(-1).frame + 1);
  const at = nextBeat(old, cursor.frame);
  const n = steps.length;
  tk.setBpm(180);
  tk.setBpm(170);
  r.run(2);
  const after = steps.slice(n);
  const pre = after.filter((s) => s.frame < at.frame), post = after.filter((s) => s.frame >= at.frame);
  ok('a jump then another before the landing (cursor a 16th past a beat): lines up to the landing stay on 120',
    cursor.i % 4 === 1 && at.frame - cursor.frame === 18000 && pre.length === 3 && pre.every((s) => s.grid.barFrames === 96000 && s.frame === lineFrame(old, s.bar, s.step, 16)));
  ok('…and ONE switch lands on that beat at 170, the count kept',
    post[0].frame === at.frame && post[0].bar === at.bar && post[0].step === at.beat * 4 && post.every((s) => s.grid.barFrames === Math.round(240 * SR / 170)) && consecutive(steps));
  tk.stop();
}
{
  // A SLOW DRAG over four seconds (a change every 50 ms, 90 → 170) with the arp listening in every division:
  // the 16ths run on, every switch lands on a beat, and each division's lines partition time (no line
  // twice, none lost, its own count running on) — the arp reads linesIn(time.grid(), n, b.frame, next 16th).
  const r = rig({ t: 10, heartbeat: false });
  const { tk, steps } = r;
  const arp = Object.fromEntries(PERBARS.map((n) => [n, []]));
  tk.onStep((b) => {
    const g = tk.grid();
    for (const n of PERBARS) arp[n].push(...linesIn(g, n, b.frame, lineFrame(g, b.bar, b.step + 1, 16)).map((l) => ({ ...l, g })));
  });
  tk.want('arp', true);
  await flush();
  r.run(0.5);
  let bpm = 90;
  for (let k = 0; k < 80; k++) { tk.setBpm(bpm); bpm += 1; r.run(0.05); }
  r.run(1);
  const switches = steps.filter((s, k) => k > 0 && (s.grid.barFrames !== steps[k - 1].grid.barFrames || s.grid.originFrame !== steps[k - 1].grid.originFrame));
  ok('a slow drag: the 16ths run on, no gap, no repeat, frames rising', consecutive(steps) && steps.every((s, k) => k === 0 || s.frame > steps[k - 1].frame));
  ok('…every switch landed ON A BEAT (step 0, 4, 8, 12), at the beat of both lattices',
    switches.length >= 5 && switches.every((s) => s.step % 4 === 0 && s.frame === beatFrameOf(s.grid, s.bar, s.step / 4)), `${switches.length} switches`);
  ok('…at most one switch per beat (a drag never stacks switches)', switches.every((s, k) => k === 0 || idx(s) - idx(switches[k - 1]) >= 4));
  let good = 0;
  for (const n of PERBARS) {
    const ls = arp[n];
    const rising = ls.every((l, k) => k === 0 || l.frame > ls[k - 1].frame);
    const counting = ls.every((l, k) => k === 0 || l.bar * n + l.i === ls[k - 1].bar * n + ls[k - 1].i + 1);
    const onGrid = ls.every((l) => l.frame === lineFrame(l.g, l.bar, l.i, n));
    const fromOne = ls.length >= n && ls[0].bar === 0 && ls[0].i === 0;   // from the origin on, a bar's worth at least
    if (rising && counting && onGrid && fromOne) good++;
  }
  ok('…and every arp division\'s lines partition time across the switches (none twice, none lost, counting on)', good === PERBARS.length, `${good}/${PERBARS.length}`);
  tk.stop();
}
{
  // setBpm unseated: only the tempo; the next want seats at it.
  const r = rig({ t: 5, heartbeat: false });
  r.tk.setBpm(150);
  r.tk.want('bass', true);
  await flush();
  ok('setBpm while stopped: the next want seats at the new tempo', r.tk.grid().barFrames === 76800 && r.steps[0].grid.barFrames === 76800 && idx(r.steps[0]) === 0);
  r.tk.stop();
}

// ── 8. TAP: the median of the last ≤ 8 taps within 2 s, folded into 60..180 ────────────────────────────
{
  const { tk } = rig({ heartbeat: false });
  const series = (bpm, count, t0) => { for (let i = 0; i < count; i++) tk.tap(t0 + i * 60000 / bpm); };
  tk.tap(1000); tk.tap(1600);
  ok('two taps change nothing', tk.bpm() === 120);
  tk.tap(2200);
  ok('the third settles: 600 ms → 100 bpm', tk.bpm() === 100);
  series(50, 4, 10000);
  ok('taps at 50 fold up to 100', tk.bpm() === 100);
  series(190, 4, 20000);
  ok('taps at 190 fold DOWN to 95 (the fold is 60..180; bpm() derived from its whole-frame bar, 95.0001)',
    tk.grid().barFrames === Math.round(240 * SR / 95) && Math.round(tk.bpm()) === 95, `${tk.bpm()}`);
  series(240, 4, 30000);
  ok('taps at 240 → 120', tk.bpm() === 120);
  series(45, 4, 40000);
  ok('taps at 45 → 90', tk.bpm() === 90);
  tk.tap(50000); tk.tap(50600); tk.tap(53100); tk.tap(53700);
  ok('a gap over 2 s starts a new series (two taps after it are not yet evidence)', tk.bpm() === 90 && TAP_RESET_MS === 2000);
  tk.tap(54300);
  ok('…the third of the new series settles (600 ms → 100)', tk.bpm() === 100);
  tk.tap(54000); tk.tap(54500); tk.tap(55000);
  ok('a tap earlier than the last starts a new series too', tk.bpm() === 120);
  // ≤ 8 taps: 8 at 600 ms then 4 at 500 ms → the median of the LAST 8 (7 IOIs: 3 × 600, 4 × 500) is 500 → 120.
  // Over all 12 it would be 600 → 100.
  const t0 = 70000;
  for (let i = 0; i < 8; i++) tk.tap(t0 + i * 600);
  for (let i = 1; i <= 4; i++) tk.tap(t0 + 7 * 600 + i * 500);
  ok('the median runs over the last 8 taps only (TAP_KEEP) → 120, not the 12-tap 100', TAP_KEEP === 8 && tk.bpm() === 120);
  let threw = false;
  try { tk.tap(); tk.tap(NaN); } catch { threw = true; }
  ok('tap() with no time (performance.now) or a junk time never throws', !threw);
}
{
  // a tap while running IS a setBpm: it lands on the next beat keeping the count
  const r = rig({ t: 10, heartbeat: false });
  const { tk, steps } = r;
  tk.want('drums', true);
  await flush();
  r.run(1.5);
  tk.tap(100000); tk.tap(100500); tk.tap(101000);
  ok('three taps at 500 ms while running: bpm() 120 → 120 (no switch)', tk.bpm() === 120);
  // four more at 750 ms: the medians run 500 → 625 (96 bpm) → 750 (80 bpm) → 750, all before the cursor moves
  tk.tap(101750); tk.tap(102500); tk.tap(103250); tk.tap(104000);
  r.run(2);
  const sws = steps.filter((s, k) => k > 0 && s.grid.barFrames !== steps[k - 1].grid.barFrames);
  ok('taps settling on a new tempo (the median of 500/750 ms → 750 = 80 bpm) land ONE switch on a beat, the count kept',
    tk.bpm() === 80 && sws.length === 1 && sws[0].grid.barFrames === 144000 && sws[0].step % 4 === 0 && consecutive(steps), `${tk.bpm()} bpm, ${sws.length} switches`);
  tk.stop();
}

// ── 9. THE PLAYHEAD, in heard time ─────────────────────────────────────────────────────────────────────
{
  const r = rig({ t: 10, heartbeat: false });
  const { ctx, tk, steps } = r;
  ok('unseated: the playhead is at rest', JSON.stringify(tk.playhead()) === '{"bar":0,"step":0,"phase":0}');
  tk.want('drums', true);
  await flush();
  const g = tk.grid();
  const heard = lineFrame(g, 2, 5, 16) + 3000;            // half-way through bar 2's sixth 16th
  ctx.outputLatency = 0.02;
  ctx.currentTime = heard / SR + 0.02;
  let p = tk.playhead();
  ok('HEARD time = ctx − outputLatency: bar 2, step 5, phase .5', p.bar === 2 && p.step === 5 && Math.abs(p.phase - 0.5) < 1e-9, JSON.stringify(p));
  ctx.outputLatency = 0; ctx.baseLatency = 0.01;
  ctx.currentTime = heard / SR + 0.01;
  p = tk.playhead();
  ok('no outputLatency → baseLatency', p.bar === 2 && p.step === 5 && Math.abs(p.phase - 0.5) < 1e-9);
  delete ctx.outputLatency; delete ctx.baseLatency;
  ctx.currentTime = heard / SR;
  p = tk.playhead();
  ok('neither → 0', p.bar === 2 && p.step === 5 && Math.abs(p.phase - 0.5) < 1e-9);
  ctx.currentTime = (lineFrame(g, 3, 0, 16) - 60) / SR;
  p = tk.playhead();
  ok('just before a bar line: the last 16th of the bar before, phase → 1', p.bar === 2 && p.step === 15 && p.phase > 0.98 && p.phase < 1);
  ctx.currentTime = (g.originFrame - 500) / SR;
  ok('before the origin (the 50 ms lead-in): at rest on the one', JSON.stringify(tk.playhead()) === '{"bar":0,"step":0,"phase":0}');
  // across a tempo switch: heard frames before the landing read the old lattice, after it the new one
  ctx.currentTime = 11;
  r.run(1);
  const at = nextBeat(g, lineAtOrAfter(g, 16, steps.at(-1).frame + 1).frame);
  tk.setBpm(80);
  r.run(Math.max(0, at.frame / SR - ctx.currentTime) + 0.2);
  const ng = steps.find((s) => s.frame === at.frame).grid;
  ctx.currentTime = (at.frame - 100) / SR;
  const a = tk.playhead();
  ctx.currentTime = (at.frame + 100) / SR;
  const b = tk.playhead();
  ok('across a switch: 100 frames before the landing is the old lattice\'s last 16th, 100 after is the landing beat',
    a.bar * 16 + a.step === at.bar * 16 + at.beat * 4 - 1 && a.phase > 0.98 && b.bar === at.bar && b.step === at.beat * 4 && Math.abs(b.phase - 100 / (ng.barFrames / 16)) < 1e-3,
    `${JSON.stringify(a)} ${JSON.stringify(b)}`);
  tk.stop();
}

// ── 10. stop(): the timer, the wants, the cursor and the origin ───────────────────────────────────────
{
  const r = rig({ t: 10 });
  const { ctx, timer, tk, steps } = r;
  tk.want('drums', true); tk.want('arp', true); tk.want('gate', true);
  await flush();
  r.run(1);
  const sink = ctx._made.gains.at(-1);
  tk.stop();
  ok('stop: not running, the timer cleared, the pulse stopped (its sink off the destination)', !tk.running() && timer.count === 0 && sink.gone);
  const n = steps.length;
  r.run(2);
  ok('stop: nothing more is announced — no timer, no pulse', steps.length === n);
  ok('stop: the tempo is kept', tk.bpm() === 120);
  ok('stop: the origin dropped (grid at frame 0, playhead at rest)', tk.grid().originFrame === 0 && JSON.stringify(tk.playhead()) === '{"bar":0,"step":0,"phase":0}');
  tk.want('drums', false);
  ok('stop cleared every want: a later un-want is a no-op', !tk.running() && timer.count === 0);
  tk.want('bass', true);
  await flush();
  ok('after stop one want seats a fresh origin (now + 50 ms) and counts from bar 0', tk.grid().originFrame === Math.round(ctx.currentTime * SR) + SEAT && idx(steps.at(-1)) === 0);
  ok('the listeners survive a stop (the modules stay subscribed)', steps.length === n + 1);
  // RV9: a stopped clock's silence is not a wake gap
  r.run(1);
  tk.stop();
  ctx._advance(ctx.currentTime + 5);
  const m = steps.length;
  tk.want('drums', true);
  await flush();
  ok('RV9: five silent seconds after a stop, the first tick books one line, not 15 s of them', steps.length - m === 1);
  tk.stop();
  tk.stop();
  ok('stop twice is harmless', !tk.running());
}

// ── 11. THE HEARTBEAT keeps the lattice announced when the timer does not wake ───────────────────────
{
  const r = rig({ t: 10 });
  const { ctx, tk, steps } = r;
  tk.want('drums', true);
  await flush();
  for (let t = 10.25; t <= 16.001; t += 0.25) ctx._advance(t);   // only the audio clock's pulse wakes
  const late = steps.filter((s) => s.frame >= 11 * SR);
  ok('the pulse alone (every 250 ms) keeps every 16th announced once the horizon has opened to 3 wakes',
    late.length >= 40 && consecutive(late), `${late.length} lines`);
  ok('…never in the past, never twice', steps.every((s) => s.frame >= Math.round(s.at * SR) + LATE) && steps.every((s, k) => k === 0 || s.frame > steps[k - 1].frame));
  tk.stop();
}
{
  // hidden: the horizon opens (lookahead.ts); coming forward never re-announces and never skips
  let isHidden = true;
  const r = rig({ t: 10, heartbeat: false, hidden: () => isHidden });
  const { tk, steps } = r;
  tk.want('drums', true);
  await flush();
  ok('hidden: the first tick books past the 1 Hz budget (≥ 0.5 s of lines at once)', steps.length >= 4 && steps.at(-1).frame - 10 * SR >= 0.5 * SR, `${steps.length} lines`);
  isHidden = false;
  r.run(2);
  ok('coming forward: nothing re-announced, nothing skipped', consecutive(steps) && steps.every((s, k) => k === 0 || s.frame > steps[k - 1].frame));
  tk.stop();
}

// ── 12. listeners: a throw, an un-want, a setBpm and a stop from INSIDE the announcement ─────────────
{
  const r = rig({ t: 10, heartbeat: false });
  const { tk, steps } = r;
  const seen = [];
  tk.onStep(() => { throw new Error('a module blew up'); });
  tk.onStep((b) => seen.push(idx(b)));
  tk.want('drums', true);
  await flush();
  r.run(1);
  ok('a listener that throws stops neither the others nor the lattice', seen.length === steps.length && seen.length >= 8 && consecutive(steps));
  tk.stop();
}
{
  const r = rig({ t: 10, heartbeat: false });
  const { tk, steps } = r;
  let armed = false;
  tk.onStep((b) => { if (armed && b.step === 6) tk.want('drums', false); });
  tk.want('drums', true);
  await flush();
  r.run(0.3);
  armed = true;
  r.run(2);
  const stopAt = steps.findIndex((s, k) => k > 0 && s.step === 6 && steps.slice(0, k).some((x) => x.at > 0));
  ok('the last un-want from inside onStep ends the announcement there (no line after it)', !tk.running() && steps.at(-1).step === 6 && stopAt === steps.length - 1);
}
{
  const r = rig({ t: 10, heartbeat: false });
  const { tk, steps } = r;
  let fired = false;
  tk.onStep((b) => { if (!fired && b.bar === 1 && b.step === 2) { fired = true; tk.setBpm(150); } });
  tk.want('drums', true);
  await flush();
  r.run(3);
  const sw = steps.find((s, k) => k > 0 && s.grid.barFrames !== steps[k - 1].grid.barFrames);
  ok('a setBpm from inside onStep lands on the next beat PAST the line being announced (bar 1 beat 1)',
    sw && sw.bar === 1 && sw.step === 4 && sw.grid.barFrames === 76800 && consecutive(steps));
  tk.stop();
}
{
  const r = rig({ t: 10, heartbeat: false });
  const { tk, steps, bars } = r;
  let stopOnBar = false;
  tk.onBar((bar) => { if (stopOnBar && bar === 1) tk.stop(); });
  tk.want('drums', true);
  await flush();
  stopOnBar = true;
  r.run(3);
  ok('a stop() from inside onBar: that line\'s onStep is never announced, nothing after it',
    !tk.running() && bars.at(-1).bar === 1 && steps.at(-1).bar === 0 && steps.at(-1).step === 15);
}

// ── 13. the Timekeeper books no audio of its own ────────────────────────────────────────────────────────
{
  const r = rig({ t: 10 });
  const { ctx, tk } = r;
  for (let k = 0; k < 3; k++) { tk.want('drums', true); await flush(); r.run(2); tk.stop(); r.run(0.5); }
  ok('no node but the pulse\'s: three seatings made 3 sinks (all 0-gain, all on the destination, all gone) and no source of sound',
    ctx._made.violations.length === 0 && ctx._made.gains.length === 3 && ctx._made.gains.every((g) => g.gain.value === 0 && g.gone) && ctx._made.sources > 0);
  const quiet = rig({ t: 10, heartbeat: false });
  quiet.tk.want('drums', true);
  await flush();
  quiet.run(1);
  ok('heartbeat: false makes no node at all', quiet.ctx._made.gains.length === 0 && quiet.ctx._made.sources === 0 && quiet.steps.length >= 8);
  quiet.tk.stop();
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log(`time: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
