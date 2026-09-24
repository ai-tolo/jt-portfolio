// from signal-studio-v6lib/src/views/instrument/bass-pattern.test.mjs:1-34 (2a9e4a7) — the 16 checks VERBATIM (SIGNAL R1,
// lane B). Edits: this banner, and the summary line also prints `bass-pattern: N/N` (NOTES-SIGNAL-R1 §0).
// Run: source ~/.nvm/nvm.sh && node src/signal/bass-pattern.test.mjs
// w13 — the generative bass pattern (pure). node src/views/instrument/bass-pattern.test.mjs
import { euclid, generateBassPattern } from './bass-pattern.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const count = (a) => a.filter(Boolean).length;
const activeIdx = (cells) => cells.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);

console.log('\n[euclid] even distribution, step-0 anchored');
ok('euclid(4,16) = 4-on-the-floor', euclid(4, 16).map((b, i) => b ? i : '').filter((x) => x !== '').join() === '0,4,8,12');
ok('euclid(1,16) = just step 0', count(euclid(1, 16)) === 1 && euclid(1, 16)[0]);
ok('euclid(16,16) = all', count(euclid(16, 16)) === 16);
ok('euclid always hits step 0 (h>=1)', [1, 3, 5, 7, 11].every((h) => euclid(h, 16)[0]));
ok('euclid count matches hits', [1, 4, 5, 8, 13].every((h) => count(euclid(h, 16)) === h));
ok('euclid spread is even for 5 (no two hits adjacent-clustered)', (() => { const idx = euclid(5, 16).map((b, i) => b ? i : -1).filter((i) => i >= 0); const gaps = idx.map((v, i) => (idx[(i + 1) % idx.length] - v + 16) % 16); return Math.max(...gaps) - Math.min(...gaps) <= 1; })());

console.log('\n[pattern] density → note count');
ok('density 0 → 1 note (the root on step 0)', (() => { const c = generateBassPattern(0, 0); return activeIdx(c).join() === '0'; })());
ok('density 1 → 16 notes', count(generateBassPattern(1, 0)) === 16);
ok('density rises monotonically with note count', (() => { let prev = 0, mono = true; for (let d = 0; d <= 1.0001; d += 0.1) { const n = count(generateBassPattern(d, 0)); if (n < prev) mono = false; prev = n; } return mono; })());
ok('step 0 always the root downbeat (v3, base)', (() => { const c = generateBassPattern(0.7, 0.9); return c[0] && c[0].v === 3 && c[0].oct === 'base' && !c[0].slide; })());

console.log('\n[pattern] groove shaping');
ok('groove 0 → no slides, no sub octaves', (() => { const c = generateBassPattern(1, 0); return c.every((x) => !x || (!x.slide && x.oct === 'base')); })());
ok('groove high → introduces slides', (() => { const c = generateBassPattern(1, 0.9); return c.some((x) => x && x.slide); })());
ok('groove high → introduces ghost (v1) offbeats', (() => { const c = generateBassPattern(1, 0.9); return c.some((x) => x && x.v === 1); })());
ok('groove high → a sub-octave bounce appears', (() => { const c = generateBassPattern(1, 0.9); return c.some((x) => x && x.oct === 'sub'); })());

console.log('\n[pattern] deterministic');
ok('same (density,groove) → identical pattern', JSON.stringify(generateBassPattern(0.63, 0.44)) === JSON.stringify(generateBassPattern(0.63, 0.44)));
ok('clamps out-of-range inputs', (() => { const a = generateBassPattern(-1, 5), b = generateBassPattern(0, 1); return JSON.stringify(a) === JSON.stringify(b); })());

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}: ${pass} passed, ${fail} failed\n`);
console.log(`bass-pattern: ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
