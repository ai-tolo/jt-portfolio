// SIGNAL · lane D · THE DRUM PATTERN GENERATOR (pure, no RNG) + the seed table it mirrors.
// from signal-studio-v6lib/src/views/instrument/drum-pattern.ts:1-71 (2a9e4a7) — VERBATIM, lines 1-71 below.
// from signal-studio-v6lib/src/engine/dsp.ts:88-94 (2a9e4a7) — PATTERNS, VERBATIM, appended at the end.
// Port notes (lane D, R1): the Studio kept PATTERNS in dsp.ts (an engine module a pure leaf could not import) and
// guarded the duplicate SEEDS against it by parsing dsp.ts from source. Here both tables live in THIS file, and
// drum-pattern.test.mjs asserts SEEDS === PATTERNS directly. The lane key stays the Studio's `perc`; drums.ts maps
// it to the contract's `shaker` (types.ts DRUM_LANES) when it writes the grid.
// ─────────────────────────────────────────────────────────────── verbatim from here (drum-pattern.ts:1-71)
// P2 DRUM PATTERN — the generative drum grid (the bass-pattern.ts sibling): DENSITY sets how busy,
// GROOVE shapes the feel, STYLE picks the seed (floor/back/half/break). PURE + DETERMINISTIC — no RNG,
// so the same knobs always give the same grid, and it's node-testable. rhythm.ts writes the result
// through the existing setDrumStep API; nothing here touches the engine.
//
// Leaf module (zero runtime imports) so Node type-strips it directly for the test. The four seed tables
// are DUPLICATED from dsp.ts's PATTERNS as local constants (the engine can't be imported into a pure
// leaf); the node test imports BOTH modules and asserts SEEDS === PATTERNS — a drift-guard that keeps
// single-source truth without giving the leaf an engine import.
//
// MODE CONTINUITY BY CONSTRUCTION: the ACTIVE steps at density d exactly mirror the auto engine's
// drumStepActive (same thresholds — 0.18 hat/clap · 0.5 16ths/ghost-snare · 0.62 perc/openhat), so a
// generated grid at density d sounds like auto mode at density d. Cell VALUES (0..3 ghost/mid/accent)
// approximate the auto ACCENT/crossfade contour.

export type DrumCell = 0 | 1 | 2 | 3;
export type DrumLane = 'kick' | 'snare' | 'hat' | 'openhat' | 'clap' | 'perc';
export const PATTERN_LANES: readonly DrumLane[] = ['kick', 'snare', 'hat', 'openhat', 'clap', 'perc'] as const;
export type PatternStyle = 'floor' | 'back' | 'half' | 'break';

const STEPS = 16;
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

// Duplicated from dsp.ts PATTERNS (drift-guarded by the node test).
export const SEEDS: Record<PatternStyle, { k: number[]; s: number[]; h: number[] }> = {
  floor: { k: [0, 4, 8, 12], s: [], h: [2, 6, 10, 14] },
  back: { k: [0, 8, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
  half: { k: [0], s: [8], h: [0, 4, 8, 12, 14] },
  break: { k: [0, 7, 10], s: [4, 12, 15], h: [2, 6, 8, 14] },
};

function zeros(): DrumCell[] { return new Array<DrumCell>(STEPS).fill(0); }

/** density 0..1 + groove 0..1 + style → a 6-lane × 16-cell grid whose active steps mirror the auto
 *  engine at the same density. Deterministic (no RNG). */
export function generateDrumPattern(density: number, groove: number, style: PatternStyle): Record<DrumLane, DrumCell[]> {
  const d = clamp01(density), g = clamp01(groove);
  const P = SEEDS[style] || SEEDS.floor;
  const grid: Record<DrumLane, DrumCell[]> = { kick: zeros(), snare: zeros(), hat: zeros(), openhat: zeros(), clap: zeros(), perc: zeros() };

  // base pattern — kick + snare accented (always active, like drumStepActive's P.k/P.s).
  for (const st of P.k) grid.kick[st] = 3;
  for (const st of P.s) grid.snare[st] = 3;
  // hats appear once density > 0 (auto: hbase = d/0.18 gates the pattern hats). Mid velocity.
  if (d > 0) for (const st of P.h) grid.hat[st] = 2;
  // d8 tier (auto d > 0.18): an extra hat on the &-of-beat (st%4==2, off the pattern) + a clap on 4/12.
  if (d > 0.18) {
    for (let st = 2; st < STEPS; st += 4) if (!P.h.includes(st)) grid.hat[st] = 2;
    grid.clap[4] = 2; grid.clap[12] = 2;
  }
  // d16 tier (auto d > 0.5): offbeat 16th hats (ghost) + ghost snares on 6/14.
  if (d > 0.5) {
    for (let st = 1; st < STEPS; st += 2) if (grid.hat[st] === 0) grid.hat[st] = 1;
    if (!P.s.includes(6)) grid.snare[6] = 1;
    if (!P.s.includes(14)) grid.snare[14] = 1;
  }
  // dpc tier (auto d > 0.62): offbeat perc + an openhat on 14.
  if (d > 0.62) {
    for (let st = 1; st < STEPS; st += 2) if (grid.perc[st] === 0) grid.perc[st] = 1;
    grid.openhat[14] = 2;
  }

  // GROOVE shapes dynamics (not density): ghost the weak &-of-beat hats (the 8th-note "ands" at
  // st%4==2, the d8 mid hats), and push a late openhat as the feel opens up. Velocity-only — the
  // active steps (mode continuity) are unchanged.
  if (g > 0.35) for (let st = 2; st < STEPS; st += 4) if (grid.hat[st] === 2) grid.hat[st] = 1; // &-of hats ghosted
  if (g > 0.6 && grid.openhat[14] === 0) grid.openhat[14] = 2; // a late openhat push
  if (g > 0.8 && grid.snare[14] === 1) grid.snare[14] = 2; // a ghost-snare lift at high groove

  return grid;
}

// ─────────────────────────────────────────────────────────────── verbatim (dsp.ts:88-94, 2a9e4a7)
// 16-step drum patterns (4/4, 16ths): k=kick s=snare h=hat
export const PATTERNS: Record<string, { k: number[]; s: number[]; h: number[] }> = {
  floor: { k: [0, 4, 8, 12], s: [], h: [2, 6, 10, 14] },
  back: { k: [0, 8, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
  half: { k: [0], s: [8], h: [0, 4, 8, 12, 14] },
  break: { k: [0, 7, 10], s: [4, 12, 15], h: [2, 6, 8, 14] },
};
