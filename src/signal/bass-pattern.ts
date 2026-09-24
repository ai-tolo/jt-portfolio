// from signal-studio-v6lib/src/views/instrument/bass-pattern.ts:1-43 (2a9e4a7) — VERBATIM (SIGNAL R1, lane B).
// The only edit is this banner. Pure, zero imports: the generator bass.ts's regenerate() calls.
//
// w13 BASS PATTERN — the generative bassline (Jon's reinvention): DENSITY sets how many notes (evenly
// spread), GROOVE shapes the feel (accents, ghost offbeats, slides, the odd sub-octave bounce). PURE and
// DETERMINISTIC — no RNG, so the same knobs always give the same line, and it's node-testable. bass.ts
// writes the result through the existing setBassStep API; nothing here touches the engine.
//
// Leaf module (zero imports) so Node type-strips it directly for the test.

export type PatternStep = 0 | { v: 1 | 2 | 3; oct: 'base' | 'sub'; slide: boolean };

const STEPS = 16;

/** Even (Euclidean) distribution: place `hits` notes across `steps` as evenly as possible, always with
 *  a hit on step 0 (the downbeat root). `((i*h) % steps) < h` is the closed-form even spread. */
export function euclid(hits: number, steps: number): boolean[] {
  const h = Math.max(0, Math.min(steps, Math.round(hits)));
  const out = new Array<boolean>(steps).fill(false);
  for (let i = 0; i < steps; i++) out[i] = ((i * h) % steps) < h;
  return out;
}

/** density 0..1 → 1..16 notes (Euclidean); groove 0..1 → accents / ghosted offbeats / slides / a sub
 *  octave bounce. Deterministic: same (density, groove) → same pattern. Step 0 is always the root. */
export function generateBassPattern(density: number, groove: number): PatternStep[] {
  const d = Math.max(0, Math.min(1, density));
  const g = Math.max(0, Math.min(1, groove));
  const hits = Math.max(1, Math.round(1 + d * (STEPS - 1))); // 1..16
  const active = euclid(hits, STEPS);
  active[0] = true; // belt-and-braces: the downbeat root always sounds

  const cells: PatternStep[] = new Array(STEPS).fill(0) as PatternStep[];
  for (let i = 0; i < STEPS; i++) {
    if (!active[i]) continue;
    const beat = i % 4 === 0;                 // a quarter-note downbeat
    let v: 1 | 2 | 3 = beat ? 3 : 2;           // downbeats accented, offbeats mid
    if (g > 0.35 && !beat && i % 2 === 1) v = 1;      // ghost the weak &-of-beat notes as groove opens up
    if (g > 0.65 && beat && i % 8 !== 0) v = 2;       // pull some downbeats back (syncopated feel)
    // a note that follows an adjacent active step can slide into it — a walking feel, groove makes it likely
    const slide = g > 0.5 && !beat && active[(i - 1 + STEPS) % STEPS];
    const oct: 'base' | 'sub' = (g > 0.75 && i % 8 === 4) ? 'sub' : 'base'; // the 2-and drops an octave (bounce)
    cells[i] = { v, oct, slide };
  }
  return cells;
}
