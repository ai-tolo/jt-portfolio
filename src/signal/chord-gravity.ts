// from signal-studio-v6lib/src/views/instrument/chord-gravity.ts:1-80 (2a9e4a7) — VERBATIM (SIGNAL R1, lane H). The only
// edit is this banner. Pure leaf, zero imports: the rack LEAN (nextWeight + degreeOf). Suite: chord-gravity.test.mjs (38).
//
// R4c — THE GRAVITY LAYER (pure leaf: zero imports, no RNG, no Date, no DOM; node-tested).
//
// Functional harmony as *suggestion weight only*. `nextWeight` answers "how strongly does chord A pull
// toward chord B in this mode?" using the classic transition table; the views turn that number into one
// step of idle ink — brighter/warmer, never louder, never reordered, never enforced. `keyContainment`
// answers "does this key's scale fully contain that chord?", which is what lights a wheel tick.
//
// Restraint is the law (§3.8): dark = off-map is the ENTIRE off-map vocabulary. A non-diatonic chord
// gets NO lean — it is never penalised, it simply has no pull to report. Everything is dark in FREE.

export type GravityMode = 'major' | 'minor' | 'chrom';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const mod12 = (n: number): number => ((n % 12) + 12) % 12;

// The strong next-moves per scale degree (0-indexed: 0=I … 6=vii°). Everything else in the key is a
// legal but moderate move; staying on the same chord is the weakest reading (it is not a "move").
const STRONG_MAJOR: number[][] = [
  [3, 4, 5], // I   → IV V vi
  [4],       // ii  → V
  [5, 3],    // iii → vi IV
  [4, 0, 1], // IV  → V I ii
  [0, 5],    // V   → I vi
  [1, 3, 4], // vi  → ii IV V
  [0],       // vii°→ I
];
const STRONG_MINOR: number[][] = [
  [3, 4, 5, 6], // i    → iv v VI VII
  [4],          // ii°  → v
  [5, 6],       // III  → VI VII
  [4, 0, 6],    // iv   → v i VII
  [0, 5],       // v    → i VI
  [3, 1, 6],    // VI   → iv ii° VII
  [2, 0],       // VII  → III i
];

const STRONG = 1;
const MODERATE = 0.45;
const SAME = 0.15;

/**
 * How strongly `fromDegree` pulls toward `toDegree` (both 0..6) in `mode` → 0..1.
 * chrom (no key field) and any out-of-range degree → 0: no gravity to report.
 */
export function nextWeight(fromDegree: number | null, toDegree: number | null, mode: GravityMode): number {
  if (mode === 'chrom') return 0;
  if (fromDegree == null || toDegree == null) return 0;
  if (!Number.isInteger(fromDegree) || !Number.isInteger(toDegree)) return 0;
  if (fromDegree < 0 || fromDegree > 6 || toDegree < 0 || toDegree > 6) return 0;
  if (fromDegree === toDegree) return SAME;
  const table = mode === 'minor' ? STRONG_MINOR : STRONG_MAJOR;
  return table[fromDegree].includes(toDegree) ? STRONG : MODERATE;
}

/**
 * What fraction of `padPcs` (pitch classes, any order/dupes) lies inside the key's scale → 0..1.
 * 1 = the key FULLY contains the chord (what lights a wheel tick). An empty chord → 0.
 * chrom has no scale field → 0 (gravity off everywhere).
 */
export function keyContainment(padPcs: number[], keyRoot: number, mode: GravityMode): number {
  if (mode === 'chrom' || !padPcs.length) return 0;
  const sc = mode === 'minor' ? MINOR_SCALE : MAJOR_SCALE;
  const kr = mod12(keyRoot);
  const uniq = [...new Set(padPcs.map(mod12))];
  let inside = 0;
  for (const pc of uniq) if (sc.includes(mod12(pc - kr))) inside++;
  return inside / uniq.length;
}

/**
 * The scale-degree index (0..6) of a chord root in a key, or null when the root is off-map (or chrom).
 * This is what turns a stamped pad into something the weight table can talk about.
 */
export function degreeOf(rootPc: number, keyRoot: number, mode: GravityMode): number | null {
  if (mode === 'chrom') return null;
  const sc = mode === 'minor' ? MINOR_SCALE : MAJOR_SCALE;
  const i = sc.indexOf(mod12(rootPc - keyRoot));
  return i < 0 ? null : i;
}
