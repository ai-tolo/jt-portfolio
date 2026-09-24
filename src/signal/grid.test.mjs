// from signal-studio-page/src/page/grid.test.mjs:1-113 (67b6b58) — §1-4 ported (the integer lattice, the
// nextBarFrame edges, the beats, the tap fold). [SIGNAL] changes: toCycleGrid's two checks left with it; the fold's
// range is the contract's 60..180, so §4 adds the cases that tell 60..180 from the page's 60..200; the page's §5-6
// (its TimeKeeper + click) are time.test.mjs's business here; §5 THE LINES is new (lineFrame, lineAtOrAfter,
// lineAtOrBefore, linesIn: docs/signal-map/D-time-arp-chords.md §1.3).
//   source ~/.nvm/nvm.sh && node src/signal/grid.test.mjs
//
// The load-bearing claim is the first one: 1000 bars at 103.359 bpm / 48 kHz and every bar line is
// origin + j·barFrames to the frame, so a chip of k bars is k·barFrames and never drifts against the
// click or another chip. The float lattice it replaces is measured alongside, to show what is avoided.
import {
  gridFromBpm, gridBpm, barFrameOf, barIndexAt, nextBarFrame, beatFrameOf, nextBeat, beatAt,
  estimateBpm, foldBpm, BPM_LO, BPM_HI,
  lineFrame, lineAtOrAfter, lineAtOrBefore, linesIn,
} from './grid.ts';
import { BPM_MIN, BPM_MAX } from './types.ts';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  (cond ? pass++ : fail++);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
const SR = 48000;

// ── 1. the integer lattice: 1000 bars at 103.359 bpm, zero drift ────────────────────────────────
{
  const origin = 1234567;
  const g = gridFromBpm(103.359, SR, origin);
  ok('barFrames is an integer', Number.isInteger(g.barFrames), `barFrames=${g.barFrames}`);
  ok('barFrames is the nearest frame to 240·sr/bpm', g.barFrames === Math.round(240 * SR / 103.359));
  let exact = 0, idx = 0, loops = 0;
  for (let j = 0; j <= 1000; j++) {
    const f = barFrameOf(g, j);
    if (Number.isInteger(f) && f === origin + j * g.barFrames) exact++;
    if (barIndexAt(g, f) === j && barIndexAt(g, f - 1) === j - 1 && barIndexAt(g, f + g.barFrames - 1) === j) idx++;
  }
  ok('every bar line of 1000 is origin + j·barFrames exactly', exact === 1001, `${exact}/1001`);
  ok('barIndexAt: a bar line belongs to the bar it starts, the frame before to the one before', idx === 1001, `${idx}/1001`);
  // every k-bar loop laid end to end lands exactly on a bar line, for every k in 1..16
  for (let k = 1; k <= 16; k++) {
    const len = k * g.barFrames;
    const passes = Math.floor(1000 / k);
    if (origin + passes * len === barFrameOf(g, passes * k)) loops++;
  }
  ok('a loop of k bars (1..16) repeated over 1000 bars ends on a lattice bar line', loops === 16, `${loops}/16`);
  // what the float lattice does instead (the defect the integer bar exists for)
  const barF = 240 * SR / 103.359;
  const float4 = Math.round(4 * barF), float1 = Math.round(barF);
  const driftAfter1000 = Math.abs(250 * float4 - 1000 * float1);
  ok('the float lattice WOULD drift (a 4-bar and a 1-bar loop disagree after 1000 bars)', driftAfter1000 > 0, `${driftAfter1000} frames`);
  ok('the integer lattice does not (4·bf·250 === bf·1000)', 250 * 4 * g.barFrames === 1000 * g.barFrames);
  ok('gridBpm is derived from the frames (within 0.001 bpm of 103.359)', Math.abs(gridBpm(g) - 103.359) < 0.001, `${gridBpm(g)}`);
  ok('gridBpm is exactly 240·sr/barFrames', gridBpm(g) === 240 * SR / g.barFrames);
  // [SIGNAL] toCycleGrid's two checks (P:56-58) dropped with toCycleGrid.
  ok('gridFromBpm rounds the origin to a frame', gridFromBpm(100, SR, 10.6).originFrame === 11);
  ok('gridFromBpm(100) at 48 kHz = 115200 frames a bar, exactly 100 bpm', gridFromBpm(100, SR, 0).barFrames === 115200 && gridBpm(gridFromBpm(100, SR, 0)) === 100);
}

// ── 2. nextBarFrame edges ─────────────────────────────────────────────────────────────────────────
{
  const g = { sr: SR, barFrames: 111456, originFrame: 500000 };
  ok('nextBarFrame on a bar line is that bar line', nextBarFrame(g, 500000 + 3 * 111456) === 500000 + 3 * 111456);
  ok('nextBarFrame one frame past a bar line is the next one', nextBarFrame(g, 500001) === 500000 + 111456);
  ok('nextBarFrame one frame before a bar line is that bar line', nextBarFrame(g, 500000 + 111455) === 500000 + 111456);
  ok('nextBarFrame on the origin is the origin', nextBarFrame(g, 500000) === 500000);
  ok('nextBarFrame before the origin walks back in whole bars', nextBarFrame(g, 500000 - 111456 - 5) === 500000 - 111456);
  ok('nextBarFrame at frame 0 (origin far ahead) is a lattice line ≥ 0',
    (() => { const f = nextBarFrame(g, 0); return f >= 0 && f < 111456 && (f - 500000) % 111456 === 0; })());
  ok('barIndexAt before the origin is negative', barIndexAt(g, 499999) === -1 && barIndexAt(g, 500000 - 111456) === -1 && barIndexAt(g, 500000 - 111457) === -2);
  const late = { sr: SR, barFrames: 111456, originFrame: 48000 * 3600 * 20 }; // 20 h in: still exact
  ok('nextBarFrame is exact 20 hours in', nextBarFrame(late, late.originFrame + 7 * 111456 + 1) === late.originFrame + 8 * 111456);
}

// ── 3. beats: rounding inside the bar, nextBeat / beatAt edges ────────────────────────────────────
{
  const g = { sr: SR, barFrames: 111457, originFrame: 1000 }; // not divisible by 4
  ok('beat 0 is the bar line', beatFrameOf(g, 5, 0) === barFrameOf(g, 5));
  ok('beats are whole frames rounded inside the bar', [1, 2, 3].every((b) => beatFrameOf(g, 5, b) === barFrameOf(g, 5) + Math.round(b * 111457 / 4)));
  ok('beat rounding never accumulates (bar 1000 beat 3 = its bar line + round(3·bf/4))',
    beatFrameOf(g, 1000, 3) === 1000 + 1000 * 111457 + Math.round(3 * 111457 / 4));
  const b1 = beatFrameOf(g, 2, 1);
  let nb = nextBeat(g, b1);
  ok('nextBeat on a beat line is that beat', nb.frame === b1 && nb.bar === 2 && nb.beat === 1);
  nb = nextBeat(g, b1 + 1);
  ok('nextBeat one past a beat is the next beat', nb.frame === beatFrameOf(g, 2, 2) && nb.beat === 2);
  nb = nextBeat(g, beatFrameOf(g, 2, 3) + 1);
  ok('nextBeat past beat 4 is the next bar line, accent', nb.frame === barFrameOf(g, 3) && nb.bar === 3 && nb.beat === 0);
  nb = nextBeat(g, -50000);
  ok('nextBeat before the origin lands on the lattice (bar -1, beat 4)', nb.bar === -1 && nb.beat === 3 && nb.frame === beatFrameOf(g, -1, 3));
  nb = nextBeat(g, 1);
  ok('nextBeat after bar -1\'s last beat is the origin, accent', nb.bar === 0 && nb.beat === 0 && nb.frame === 1000);
  const ba = beatAt(g, beatFrameOf(g, 7, 2) + 10);
  ok('beatAt returns the beat that is playing', ba.bar === 7 && ba.beat === 2 && ba.frame === beatFrameOf(g, 7, 2));
  const bb = beatAt(g, barFrameOf(g, 7) - 1);
  ok('beatAt one frame before a bar line is beat 4 of the bar before', bb.bar === 6 && bb.beat === 3);
}

// ── 4. tap tempo (the station's cases) ────────────────────────────────────────────────────────────
{
  const taps = (bpm, n, jit = 0) => Array.from({ length: n }, (_, i) => i * 60000 / bpm + (i % 2 ? jit : -jit));
  ok('4 taps at 100 → 100', estimateBpm(taps(100, 4)) === 100);
  ok('240 folds to 120', estimateBpm(taps(240, 4)) === 120);
  ok('±15 ms jitter at 92 → 92', estimateBpm(taps(92, 5, 15)) === 92, `${estimateBpm(taps(92, 5, 15))}`);
  ok('2 taps is not evidence → null', estimateBpm(taps(100, 2)) === null);
  ok('3 taps settle', estimateBpm(taps(100, 3)) === 100);
  ok('a stray tap is outvoted by the median', estimateBpm([0, 600, 1200, 1500, 2100, 2700]) === 100);
  ok('foldBpm(50) → 100, foldBpm(0) → null, foldBpm(NaN) → null', foldBpm(50) === 100 && foldBpm(0) === null && foldBpm(NaN) === null);
  ok('intervals over 3 s are a player who stopped', estimateBpm([0, 4000, 8000, 12000]) === null);
  // [SIGNAL] the contract's fold range, 60..180
  ok('[SIGNAL] the fold range IS the contract\'s tempo range (60..180)', BPM_LO === BPM_MIN && BPM_HI === BPM_MAX && BPM_LO === 60 && BPM_HI === 180);
  ok('[SIGNAL] 190 folds to 95 (the page would have kept 190)', estimateBpm(taps(190, 4)) === 95, `${estimateBpm(taps(190, 4))}`);
  ok('[SIGNAL] 200 folds to 100 (the page would have kept 200)', estimateBpm(taps(200, 4)) === 100, `${estimateBpm(taps(200, 4))}`);
  ok('[SIGNAL] the range\'s own ends stay: 60 → 60, 180 → 180', foldBpm(60) === 60 && foldBpm(180) === 180);
  ok('[SIGNAL] 181 halves to 90.5 → 91; 59 doubles to 118; 30 → 60; 360 → 180',
    foldBpm(181) === 91 && foldBpm(59) === 118 && foldBpm(30) === 60 && foldBpm(360) === 180);
  let inside = 0;
  for (let b = 1; b <= 2000; b++) { const f = foldBpm(b); if (f !== null && f >= 60 && f <= 180) inside++; }
  ok('[SIGNAL] every whole bpm 1..2000 folds INSIDE 60..180 (the range is wider than 2:1)', inside === 2000, `${inside}/2000`);
}

// ── 5. [SIGNAL] THE LINES — beatFrameOf generalised to any division ──────────────────────────────
const PERBARS = [2, 4, 6, 8, 12, 16, 24, 32];   // 1/2 1/4 1/4T 1/8 1/8T 1/16 1/16T 1/32
{
  const g = { sr: SR, barFrames: 111457, originFrame: 1000 };   // divides by none of 2, 3, 4
  let bars = 0, ends = 0, beats = 0, meet = 0, meetN = 0, far = 0, ints = 0;
  for (let j = -3; j <= 40; j++) {
    for (const n of PERBARS) {
      if (lineFrame(g, j, 0, n) === barFrameOf(g, j)) bars++;
      if (lineFrame(g, j, n, n) === barFrameOf(g, j + 1)) ends++;
      for (let i = 0; i <= n; i++) if (Number.isInteger(lineFrame(g, j, i, n))) ints++;
    }
    for (let b = 0; b < 4; b++) if (lineFrame(g, j, 4 * b, 16) === beatFrameOf(g, j, b)) beats++;
    // two divisions whose lines meet in time meet to the frame
    for (const n1 of PERBARS) for (const n2 of PERBARS) for (let i1 = 0; i1 <= n1; i1++) {
      if ((i1 * n2) % n1 !== 0) continue;
      meetN++;
      if (lineFrame(g, j, i1, n1) === lineFrame(g, j, (i1 * n2) / n1, n2)) meet++;
    }
  }
  const J = 44 * PERBARS.length;
  ok('line 0 of every division is the bar line (44 bars × 8 divisions, bars −3..40)', bars === J, `${bars}/${J}`);
  ok('line perBar is the next bar line', ends === J, `${ends}/${J}`);
  ok('every line is a whole frame', ints === 44 * PERBARS.reduce((s, n) => s + n + 1, 0));
  ok('a 16th on a beat IS that beat, to the frame (lineFrame(4b, 16) = beatFrameOf(b))', beats === 44 * 4, `${beats}/${44 * 4}`);
  ok('lines of two divisions that meet in time meet to the frame (1/8T line 3 = beat 1, 1/32 line 8 = beat 1 …)', meet === meetN, `${meet}/${meetN}`);
  for (const n of PERBARS) for (let i = 0; i < n; i++) {
    if (lineFrame(g, 100000, i, n) === 1000 + 100000 * 111457 + Math.round(i * 111457 / n)) far++;
  }
  ok('lines never accumulate: bar 100000\'s lines are its bar line + round(i·bf/n)', far === PERBARS.reduce((s, n) => s + n, 0));
  ok('1/8T line 3 is beat 1 and 1/4T line 3 is beat 2, exactly',
    lineFrame(g, 9, 3, 12) === beatFrameOf(g, 9, 1) && lineFrame(g, 9, 3, 6) === beatFrameOf(g, 9, 2));
}
{
  // linesIn: 64 bars of every division, and the lattice at other rates / tempos
  const grids = [
    { sr: SR, barFrames: 111457, originFrame: 1000 },
    { sr: SR, barFrames: 64000, originFrame: 48000 * 7 },          // 180 bpm at 48 k
    { sr: SR, barFrames: 192000, originFrame: -12345 },            // 60 bpm, an origin before frame 0
    { sr: 44100, barFrames: 88200, originFrame: 4410 },            // 120 bpm at 44.1 k
    { sr: SR, barFrames: 95207, originFrame: 3 },                  // 121 bpm: 95206.6 rounded
  ];
  for (const g of grids) {
    let good = 0;
    for (const n of PERBARS) {
      const ls = linesIn(g, n, barFrameOf(g, 0), barFrameOf(g, 64));
      const countOk = ls.length === 64 * n;
      const orderOk = ls.every((l, k) => k === 0 || l.frame > ls[k - 1].frame);
      const onLattice = ls.every((l) => l.frame === lineFrame(g, l.bar, l.i, n) && l.perBar === n && l.i >= 0 && l.i < n);
      const inSequence = ls.every((l, k) => l.bar === Math.floor(k / n) && l.i === k % n);
      if (countOk && orderOk && onLattice && inSequence) good++;
    }
    ok(`linesIn: 64 bars × every division, in order, on the lattice, in sequence (bf ${g.barFrames} @ ${g.sr})`, good === PERBARS.length, `${good}/${PERBARS.length}`);
  }
}
{
  const g = { sr: SR, barFrames: 111457, originFrame: 1000 };
  const f0 = lineFrame(g, 3, 5, 16), f1 = lineFrame(g, 3, 9, 16);
  const ls = linesIn(g, 16, f0, f1);
  ok('linesIn keeps a line exactly at `from` and drops the one exactly at `to`',
    ls.length === 4 && ls[0].frame === f0 && ls[0].i === 5 && ls[3].i === 8 && ls.every((l) => l.frame < f1));
  ok('linesIn one frame either side moves each end by one line',
    linesIn(g, 16, f0 + 1, f1).length === 3 && linesIn(g, 16, f0, f1 + 1).length === 5);
  ok('linesIn: an empty or reversed window has no lines', linesIn(g, 16, f0, f0).length === 0 && linesIn(g, 16, f1, f0).length === 0);
  ok('linesIn: a perBar that is not a whole number ≥ 1 has no lines',
    [0, -4, 1.5, NaN, Infinity].every((n) => linesIn(g, n, f0, f1).length === 0));
  ok('linesIn: a window that is not finite has no lines (never an endless loop)',
    linesIn(g, 16, f0, Infinity).length === 0 && linesIn(g, 16, -Infinity, f1).length === 0 && linesIn(g, 16, NaN, f1).length === 0);
  const pre = linesIn(g, 4, g.originFrame - g.barFrames, g.originFrame);
  ok('linesIn before the origin: bar −1\'s four beats', pre.length === 4 && pre.every((l, k) => l.bar === -1 && l.i === k && l.frame === beatFrameOf(g, -1, k)));
  const across = linesIn(g, 6, lineFrame(g, 2, 5, 6) - 1, lineFrame(g, 3, 1, 6) + 1);
  ok('linesIn across a bar line wraps i to 0 and the bar to the next',
    across.length === 3 && across[0].bar === 2 && across[0].i === 5 && across[1].bar === 3 && across[1].i === 0 && across[2].i === 1);
}
{
  // THE ARP WINDOW (Harmony.book): the 16 one-step windows of a bar partition that bar's lines exactly, for
  // every division — no line twice, none lost, at any tempo.
  const grids = [{ sr: SR, barFrames: 111457, originFrame: 1000 }, { sr: SR, barFrames: 64000, originFrame: 0 }, { sr: SR, barFrames: 192001, originFrame: 77 }];
  let good = 0, total = 0;
  for (const g of grids) for (const n of PERBARS) for (let j = -1; j < 6; j++) {
    total++;
    const whole = linesIn(g, n, barFrameOf(g, j), barFrameOf(g, j + 1));
    const parts = [];
    for (let s = 0; s < 16; s++) parts.push(...linesIn(g, n, lineFrame(g, j, s, 16), lineFrame(g, j, s + 1, 16)));
    if (whole.length === n && JSON.stringify(parts) === JSON.stringify(whole)) good++;
  }
  ok('the 16 one-step windows of a bar partition its lines exactly (3 tempos × 8 divisions × 7 bars)', good === total, `${good}/${total}`);
}
{
  // lineAtOrAfter / lineAtOrBefore against brute force: random frames and every line ±1
  const brute = (g, n, f, after) => {
    const j = barIndexAt(g, f);
    let best = null;
    for (let b = j - 1; b <= j + 1; b++) for (let i = 0; i < n; i++) {
      const fr = lineFrame(g, b, i, n);
      if (after ? fr >= f && (!best || fr < best.frame) : fr <= f && (!best || fr > best.frame)) best = { frame: fr, bar: b, i, perBar: n };
    }
    return best;
  };
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const same = (a, b) => a && b && a.frame === b.frame && a.bar === b.bar && a.i === b.i && a.perBar === b.perBar;
  let good = 0, total = 0;
  for (const g of [{ sr: SR, barFrames: 111457, originFrame: 1000 }, { sr: SR, barFrames: 64000, originFrame: -500 }, { sr: 44100, barFrames: 88201, originFrame: 99 }]) {
    const frames = [];
    for (let k = 0; k < 300; k++) frames.push(Math.floor(g.originFrame + (rnd() * 40 - 5) * g.barFrames));
    for (const n of PERBARS) for (let i = 0; i <= n; i++) { const fr = lineFrame(g, 2, i, n); frames.push(fr - 1, fr, fr + 1); }
    frames.push(g.originFrame - 0.5, g.originFrame + 0.25);   // fractional frames (a heard time)
    for (const n of PERBARS) for (const f of frames) {
      total += 2;
      if (same(lineAtOrAfter(g, n, f), brute(g, n, f, true))) good++;
      if (same(lineAtOrBefore(g, n, f), brute(g, n, f, false))) good++;
    }
  }
  ok('lineAtOrAfter / lineAtOrBefore agree with brute force (random frames, every line ±1, fractions)', good === total, `${good}/${total}`);
  const g = { sr: SR, barFrames: 111457, originFrame: 1000 };
  const on = lineFrame(g, 4, 7, 12);
  ok('on a line, at-or-after and at-or-before are both that line',
    lineAtOrAfter(g, 12, on).i === 7 && lineAtOrBefore(g, 12, on).i === 7 && lineAtOrAfter(g, 12, on).frame === on);
  ok('one frame past the last line of a bar, at-or-after is the next bar line (i 0)',
    (() => { const l = lineAtOrAfter(g, 16, lineFrame(g, 4, 15, 16) + 1); return l.bar === 5 && l.i === 0 && l.frame === barFrameOf(g, 5); })());
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log(`grid: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
