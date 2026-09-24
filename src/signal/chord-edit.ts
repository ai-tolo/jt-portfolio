// from signal-studio-v6lib/src/engine/chord-edit.ts:1-168 (2a9e4a7) — VERBATIM (SIGNAL R1, lane H). The only edit is
// this banner. Pure leaf, zero imports (voiceUp/voiceDown, stepDiatonic, voiceLed; recolor/reext ride along unused).
// Suite: chord-edit.test.mjs (61).
//
// Chord edit transforms (M2b, §3.5) — a PURE LEAF beside chord-name: zero imports, no RNG, no Date,
// no DOM. Given a MIDI voicing, VOICE walks the register (reversible octave rotation), COLOR re-pitches
// the third axis, EXT sets the seventh/sixth axis. COLOR+EXT compose (Orchid grammar: min + 7 = m7).
// Transforms are MINIMAL-MOTION from the current voicing — they move the fewest notes and preserve the
// register spread (a third moves by a semitone or two; extensions ride on top). Deterministic.

export type Color = 'maj' | 'min' | 'sus2' | 'sus4' | 'dim';
export type Ext = 'none' | '6' | '7' | 'maj7' | '9';

export const COLORS: Color[] = ['maj', 'min', 'sus2', 'sus4', 'dim'];
export const EXTS: Ext[] = ['none', '6', '7', 'maj7', '9'];

// third + fifth intervals (semitones above the root) per color
const THIRD: Record<Color, number> = { maj: 4, min: 3, sus2: 2, sus4: 5, dim: 3 };
const FIFTH: Record<Color, number> = { maj: 7, min: 7, sus2: 7, sus4: 7, dim: 6 };
// the seventh/sixth-axis intervals per ext ('9' = ♭7 + the 9th an octave up)
const EXT_IVS: Record<Ext, number[]> = { none: [], '6': [9], '7': [10], maj7: [11], '9': [10, 14] };

const sortAsc = (a: number[]): number[] => [...a].sort((x, y) => x - y);
const ivOf = (n: number, root: number): number => (((n - root) % 12) + 12) % 12;

// R2c — the DIATONIC STEP law: move a whole voicing `dir` scale degrees through the current key
// (I → ii → iii …). Each voice walks to the next scale tone, so the chord's register and spread are
// preserved as closely as minimal motion allows (no octave collapse, no re-voicing). Off-scale notes
// snap to the nearest scale tone on the way. In chrom there is no degree field → a semitone shift.
// Scales are duplicated here deliberately: this file is a zero-import pure leaf (same posture as
// chord-name.ts).
const SCALE_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const SCALE_MINOR = [0, 2, 3, 5, 7, 8, 10];

export function stepDiatonic(notes: number[], keyRoot: number, mode: 'major' | 'minor' | 'chrom', dir: number): number[] {
  if (!notes.length || !dir) return sortAsc(notes);
  if (mode === 'chrom') return sortAsc(notes.map((n) => n + dir));
  const sc = mode === 'minor' ? SCALE_MINOR : SCALE_MAJOR;
  const kr = ((keyRoot % 12) + 12) % 12;
  return sortAsc(notes.map((n) => {
    const rel = n - kr;                       // semitones above the key tonic (any octave)
    const oct = Math.floor(rel / 12);
    const pc = ((rel % 12) + 12) % 12;
    // the note's scale-degree index; an off-scale note snaps DOWN to the nearest degree first
    let idx = sc.indexOf(pc);
    if (idx < 0) { idx = 0; for (let i = sc.length - 1; i >= 0; i--) if (sc[i] <= pc) { idx = i; break; } }
    const next = idx + dir;
    const nOct = oct + Math.floor(next / 7);
    const nPc = sc[((next % 7) + 7) % 7];
    return kr + nOct * 12 + nPc;
  }));
}

/** VOICE walk UP — lift the lowest note an octave (Orchid's voicing dial, one detent). Reversible. */
export function voiceUp(notes: number[]): number[] {
  if (notes.length < 1) return sortAsc(notes);
  const s = sortAsc(notes); s[0] += 12; return sortAsc(s);
}
/** VOICE walk DOWN — drop the highest note an octave. voiceDown∘voiceUp = identity (and vice-versa). */
export function voiceDown(notes: number[]): number[] {
  if (notes.length < 1) return sortAsc(notes);
  const s = sortAsc(notes); s[s.length - 1] -= 12; return sortAsc(s);
}

/** COLOR — minimal-motion re-pitch of the third (and the fifth, for dim). Existing third/fifth-slot
 *  notes move to the target interval in their own octave; root / seventh / extensions are untouched.
 *  A voicing with no third (e.g. a bare power chord) keeps its third absent — COLOR moves what exists. */
export function recolor(notes: number[], color: Color): number[] {
  if (!notes.length) return notes;
  const root = Math.min(...notes);
  const t3 = THIRD[color], t5 = FIFTH[color];
  return sortAsc(notes.map((n) => {
    const iv = ivOf(n, root);
    if (iv >= 2 && iv <= 5) return n + (t3 - iv); // the third slot
    if (iv >= 6 && iv <= 8) return n + (t5 - iv); // the fifth slot
    return n; // root / seventh / extensions
  }));
}

/** EXT — set the seventh/sixth axis, minimal-motion. An existing seventh moves to the target interval
 *  (same octave); a fresh one is added just above the top (preserving spread); 'none' removes it. */
export function reext(notes: number[], ext: Ext): number[] {
  if (!notes.length) return notes;
  const root = Math.min(...notes);
  const targets = EXT_IVS[ext];
  const sevenths = sortAsc(notes.filter((n) => { const iv = ivOf(n, root); return iv >= 9 && iv <= 11; }));
  const others = notes.filter((n) => { const iv = ivOf(n, root); return !(iv >= 9 && iv <= 11); });
  if (!targets.length) return sortAsc(others);
  const out = [...others];
  const topBase = others.length ? Math.max(...others) : root;
  targets.forEach((tiv, i) => {
    if (i < sevenths.length && tiv < 12) {
      // move an existing seventh to the target interval, keeping its octave register (minimal motion)
      const oct = Math.floor((sevenths[i] - root) / 12);
      out.push(root + oct * 12 + tiv);
    } else {
      // add: the lowest octave of the target interval that sits above the current top
      let p = root + tiv; while (p <= topBase) p += 12; out.push(p);
    }
  });
  return sortAsc(out);
}

// ── R13b — VOICE-LED PLACEMENT ───────────────────────────────────────────────────────────────────
// Jon: shop candidates "often sound out of place, or would sound much better with an inversion". They
// did: every candidate auditioned as a ROOT-POSITION triad stacked off the board's lowest note, so a
// vi after a I leapt a sixth for no reason, and at a low octave the whole thing landed in the mud.
//
// A chord is a set of pitch classes; WHICH inversion and WHICH register you play it in is the musical
// decision, and it has a right answer once you know what you are coming FROM. `voiceLed` makes that
// decision: of every inversion of the candidate at every reachable register, return the one whose
// voices move the fewest semitones from the reference voicing. That is the same smoothness question
// `chord-shop.voiceLeadingCost` asks in pitch-class space, asked here in absolute MIDI so it can
// answer with an actual voicing.
//
// The cost is SYMMETRIC — every candidate note's distance to its nearest reference note PLUS every
// reference note's distance to its nearest candidate note. The second half is not decoration: without
// it a voicing that crushes all three notes next to one reference note scores a perfect zero.

const MIN_MIDI = 24, MAX_MIDI = 96;
const mod12e = (n: number): number => ((n % 12) + 12) % 12;
const mean = (a: number[]): number => a.reduce((s, x) => s + x, 0) / a.length;

/** Stack a chord's pitch classes upward from a given bass note — the one placement law, shared. */
export function stackFrom(bass: number, pcs: number[]): number[] {
  const uniq = [...new Set(pcs.map(mod12e))];
  const bassPc = mod12e(bass);
  const rest = uniq.filter((pc) => pc !== bassPc).sort((a, b) => mod12e(a - bassPc) - mod12e(b - bassPc));
  const out = [bass];
  let prev = bass;
  for (const pc of rest) {
    let n = prev + mod12e(pc - prev);
    if (n === prev) n += 12;
    out.push(n); prev = n;
  }
  return out;
}

/** Total voice movement between two voicings, symmetric so a collapsed cluster cannot score zero. */
export function motionCost(from: number[], to: number[]): number {
  if (!from.length || !to.length) return Infinity;
  const near = (x: number, set: number[]): number => Math.min(...set.map((y) => Math.abs(x - y)));
  return to.reduce((s, x) => s + near(x, from), 0) + from.reduce((s, x) => s + near(x, to), 0);
}

/**
 * The best-sounding form of `pcs` given the voicing you are coming FROM.
 * With no reference, centre the chord on `center` instead (root position near a sensible register).
 * Deterministic: ties break on register proximity, then on the lower bass.
 */
export function voiceLed(pcs: number[], from: number[], center = 60): number[] {
  const uniq = [...new Set(pcs.map(mod12e))];
  if (!uniq.length) return [];
  const ref = from.length ? [...from].sort((a, b) => a - b) : null;
  const anchor = ref ? ref[0] : center;
  let best: number[] | null = null, bestCost = Infinity, bestReg = Infinity;
  for (let d = -14; d <= 14; d++) {
    const bass = anchor + d;
    if (bass < MIN_MIDI || bass > MAX_MIDI) continue;
    if (!uniq.includes(mod12e(bass))) continue;          // the bass must be a tone OF this chord
    const v = stackFrom(bass, uniq);
    if (v[v.length - 1] > MAX_MIDI) continue;
    const cost = ref ? motionCost(ref, v) : 0;
    const reg = Math.abs(mean(v) - (ref ? mean(ref) : center));
    if (cost < bestCost - 1e-9
      || (Math.abs(cost - bestCost) < 1e-9 && (reg < bestReg - 1e-9
        || (Math.abs(reg - bestReg) < 1e-9 && best != null && v[0] < best[0])))) {
      best = v; bestCost = cost; bestReg = reg;
    }
  }
  return best ?? stackFrom(center + mod12e(uniq[0] - center), uniq);
}
