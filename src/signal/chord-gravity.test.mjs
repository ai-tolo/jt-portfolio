// from signal-studio-v6lib/src/views/instrument/chord-gravity.test.mjs:1-73 (2a9e4a7) — the checks VERBATIM (SIGNAL R1, lane H). Edits: this banner, and
// the summary also prints `chord-gravity: N/N` (NOTES-SIGNAL-R1 §0).
// Run: source ~/.nvm/nvm.sh && node src/signal/chord-gravity.test.mjs
// R4c gravity law (pure leaf). Node type-strips the .ts import.
//   node src/views/instrument/chord-gravity.test.mjs
import { nextWeight, keyContainment, degreeOf } from './chord-gravity.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };

console.log('\n[gravity] nextWeight — the classic transitions read STRONG');
ok('I → V is strong', nextWeight(0, 4, 'major') === 1);
ok('I → IV is strong', nextWeight(0, 3, 'major') === 1);
ok('I → vi is strong', nextWeight(0, 5, 'major') === 1);
ok('ii → V is strong', nextWeight(1, 4, 'major') === 1);
ok('V → I is strong (the cadence)', nextWeight(4, 0, 'major') === 1);
ok('V → vi is strong (deceptive)', nextWeight(4, 5, 'major') === 1);
ok('vii° → I is strong', nextWeight(6, 0, 'major') === 1);
ok('vi → ii is strong', nextWeight(5, 1, 'major') === 1);
ok('IV → V is strong', nextWeight(3, 4, 'major') === 1);

console.log('\n[gravity] non-classic moves are MODERATE, never zero, never blocked');
ok('I → ii is moderate (legal, unhighlighted)', nextWeight(0, 1, 'major') === 0.45);
ok('V → ii is moderate', nextWeight(4, 1, 'major') === 0.45);
ok('every in-key move has SOME weight (nothing is blocked)', (() => {
  for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) if (!(nextWeight(a, b, 'major') > 0)) return false;
  return true;
})());
ok('staying put is the weakest reading', nextWeight(0, 0, 'major') === 0.15 && nextWeight(0, 0, 'major') < 0.45);

console.log('\n[gravity] minor mode has its own table');
ok('i → v strong', nextWeight(0, 4, 'minor') === 1);
ok('i → VII strong (minor-specific)', nextWeight(0, 6, 'minor') === 1);
ok('VII → III strong (minor-specific)', nextWeight(6, 2, 'minor') === 1);
ok('VII → I is NOT the major vii°→I rule', nextWeight(6, 0, 'minor') === 1 && nextWeight(6, 2, 'minor') === 1);
ok('major and minor tables genuinely differ', (() => {
  for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) if (nextWeight(a, b, 'major') !== nextWeight(a, b, 'minor')) return true;
  return false;
})());

console.log('\n[gravity] FREE/chrom + degenerate inputs report NO gravity');
ok('chrom → 0 for every pair', (() => {
  for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) if (nextWeight(a, b, 'chrom') !== 0) return false;
  return true;
})());
ok('null degrees → 0 (a non-diatonic pad has no pull, and no penalty)', nextWeight(null, 3, 'major') === 0 && nextWeight(2, null, 'major') === 0);
ok('out-of-range degrees → 0', nextWeight(-1, 3, 'major') === 0 && nextWeight(0, 9, 'major') === 0);
ok('weights are always within 0..1', (() => {
  for (const m of ['major', 'minor']) for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) { const w = nextWeight(a, b, m); if (!(w >= 0 && w <= 1)) return false; }
  return true;
})());

console.log('\n[gravity] keyContainment');
ok('C major fully contains a C triad', keyContainment([0, 4, 7], 0, 'major') === 1);
ok('C major fully contains Am7', keyContainment([9, 0, 4, 7], 0, 'major') === 1);
ok('C major does NOT fully contain a D major triad (F♯)', keyContainment([2, 6, 9], 0, 'major') < 1);
ok('…and reports the fraction honestly (2 of 3)', Math.abs(keyContainment([2, 6, 9], 0, 'major') - 2 / 3) < 1e-9);
ok('G major fully contains a D triad', keyContainment([2, 6, 9], 7, 'major') === 1);
ok('A minor fully contains an Am triad', keyContainment([9, 0, 4], 9, 'minor') === 1);
ok('octave-doubled / unsorted input is deduped', keyContainment([0, 4, 7, 0, 7], 0, 'major') === 1);
ok('chrom → 0 (no field to contain anything)', keyContainment([0, 4, 7], 0, 'chrom') === 0);
ok('empty chord → 0', keyContainment([], 0, 'major') === 0);

console.log('\n[gravity] degreeOf');
ok('C is I in C major', degreeOf(0, 0, 'major') === 0);
ok('G is V in C major', degreeOf(7, 0, 'major') === 4);
ok('A is vi in C major', degreeOf(9, 0, 'major') === 5);
ok('F♯ is off-map in C major → null', degreeOf(6, 0, 'major') === null);
ok('A is i in A minor', degreeOf(9, 9, 'minor') === 0);
ok('chrom → null', degreeOf(0, 0, 'chrom') === null);

console.log('\n[gravity] determinism');
ok('same input → same output', nextWeight(0, 4, 'major') === nextWeight(0, 4, 'major') && keyContainment([0, 4, 7], 0, 'major') === keyContainment([0, 4, 7], 0, 'major'));

console.log(`\n[gravity] ${pass} passed, ${fail} failed`);
console.log(`chord-gravity: ${pass}/${pass + fail}`);
if (fail) process.exit(1);
