// SIGNAL · lane D · drum-pattern generator tests (pure).
// from signal-studio-v6lib/src/views/instrument/drum-pattern.test.mjs:1-95 (2a9e4a7) — ported; the asserts are the
// Studio's 38, one for one. The ONE change: the drift guard. The Studio parsed dsp.ts's PATTERNS from source (dsp.ts
// could not be node-imported); here PATTERNS lives in drum-pattern.ts beside SEEDS, so the guard imports both and
// asserts SEEDS === PATTERNS directly (same 5 asserts: the table has the 4 styles, each style's k/s/h match).
//   source ~/.nvm/nvm.sh && node src/signal/drum-pattern.test.mjs
import { generateDrumPattern, SEEDS, PATTERN_LANES, PATTERNS } from './drum-pattern.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const active = (row) => row.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);

// Drift-guard: SEEDS (the generator's own copy) must equal PATTERNS (the dsp.ts table, now in the same module),
// style by style.
console.log('\n[drift-guard] SEEDS === PATTERNS (dsp.ts:88-94, local copy)');
{
  ok('the 4 PATTERNS styles present', Object.keys(PATTERNS).sort().join() === 'back,break,floor,half', Object.keys(PATTERNS).join());
  for (const style of Object.keys(SEEDS)) {
    ok(`${style} k/s/h match PATTERNS`, JSON.stringify(SEEDS[style]) === JSON.stringify(PATTERNS[style]), `${JSON.stringify(SEEDS[style])} vs ${JSON.stringify(PATTERNS[style])}`);
  }
}

console.log('\n[shape] 6 lanes × 16 cells, cells 0..3');
{
  const g = generateDrumPattern(0.5, 0.3, 'back');
  ok('all 6 lanes present', PATTERN_LANES.every((l) => Array.isArray(g[l]) && g[l].length === 16));
  ok('cells in 0..3', PATTERN_LANES.every((l) => g[l].every((c) => c >= 0 && c <= 3)));
}

console.log('\n[base] the seed pattern seeds kick/snare');
{
  const g = generateDrumPattern(0.05, 0, 'break'); // low density → just the base
  ok('kick = break seed', active(g.kick).join() === '0,7,10', active(g.kick).join());
  ok('snare = break seed', active(g.snare).join() === '4,12,15', active(g.snare).join());
  ok('kick/snare accented (3)', g.kick[0] === 3 && g.snare[4] === 3);
}

console.log('\n[continuity] active steps mirror the auto engine at density d');
// replicate drumStepActive's mask and assert the generated grid's UNION of active lanes matches it.
function autoActive(P, st, d) {
  if (P.k.includes(st) || P.s.includes(st)) return true;
  if (d <= 0) return false;
  if (P.h.includes(st)) return true;
  if (d > 0.18 && st % 4 === 2 && !P.h.includes(st)) return true;
  if (d > 0.18 && (st === 4 || st === 12)) return true;
  if (d > 0.5 && st % 2 === 1) return true;
  if (d > 0.5 && (st === 6 || st === 14) && !P.s.includes(st)) return true;
  if (d > 0.62 && st % 2 === 1) return true;
  if (d > 0.62 && st === 14) return true;
  return false;
}
for (const style of ['floor', 'back', 'half', 'break']) {
  for (const d of [0, 0.1, 0.3, 0.6, 0.7, 1.0]) {
    const g = generateDrumPattern(d, 0, style); // groove 0 → velocity shaping off, active steps pure
    let matches = true, detail = '';
    for (let st = 0; st < 16; st++) {
      const genActive = PATTERN_LANES.some((l) => g[l][st] > 0);
      const auto = autoActive(SEEDS[style], st, d);
      if (genActive !== auto) { matches = false; detail = `${style} d=${d} st=${st} gen=${genActive} auto=${auto}`; break; }
    }
    ok(`continuity ${style} @ d=${d}`, matches, detail);
  }
}

console.log('\n[monotone] busier density → more active cells');
{
  let prev = -1, mono = true;
  for (let d = 0; d <= 1.0001; d += 0.1) {
    const g = generateDrumPattern(d, 0, 'back');
    const total = PATTERN_LANES.reduce((n, l) => n + active(g[l]).length, 0);
    if (total < prev) mono = false; prev = total;
  }
  ok('active-cell count is non-decreasing with density', mono);
}

console.log('\n[groove] velocity shaping, not density change');
{
  const g0 = generateDrumPattern(0.7, 0, 'back');
  const g1 = generateDrumPattern(0.7, 0.5, 'back');
  const cnt = (g) => PATTERN_LANES.reduce((n, l) => n + active(g[l]).length, 0);
  ok('groove keeps the same active steps (dynamics only)', cnt(g0) === cnt(g1), `${cnt(g0)} vs ${cnt(g1)}`);
  ok('groove ghosts some hats (lowers a velocity somewhere)', PATTERN_LANES.some((l) => g0[l].some((c, i) => c > g1[l][i])));
}

console.log('\n[deterministic] same knobs → same grid');
ok('reproducible', JSON.stringify(generateDrumPattern(0.55, 0.4, 'half')) === JSON.stringify(generateDrumPattern(0.55, 0.4, 'half')));

console.log(`\n${fail ? '✗' : '✓'} drum-pattern: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
