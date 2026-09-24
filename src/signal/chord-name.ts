// from signal-studio-v6lib/src/engine/chord-name.ts:1-265 (2a9e4a7) — VERBATIM (SIGNAL R1, lane H). The only edit is
// this banner. Pure leaf, zero imports: harmony.ts names what sounds through nameChord (Harmony.name), chords.ts
// reads the root for the bass pin. Suite: chord-name.test.mjs (80).
//
// The naming law — names the currently-sounding pitch-class set, live. A PURE LEAF: zero imports,
// no RNG, no Date, no DOM. Same (midi set + ctx) → same name, always. Node-tested like music.ts
// (chord-name.test.mjs). The CHORD SCREEN (play.ts) subscribes to engine.held() and feeds nearest-MIDI
// here; the name it returns SNAPS onto the glass (never tweens).
//
// Boundary with src/voices/note-name.ts: note-name owns ABSOLUTE note+octave labels (60 = "C3"); this
// leaf owns PITCH-CLASS spelling only (no octave digits ever in a chord label — a "C" is the pitch class,
// not C3). The two never merge, and this file deliberately does NOT import note-name (different convention:
// octave labels vs. key-spelled pitch classes). Its pitch spelling follows the KEY signature, not a fixed
// sharp table.
//
// Three disambiguators, per the live-naming research (Logic removed live naming for flicker; the fix is
// determinism, not smoothing): (1) the BASS note decides inversions → slash labels; (2) the KEY spells
// accidentals and breaks pitch-class ties (Am7 vs C6); (3) the caller debounces the set (the 90ms settle
// window in play.ts) so a strummed chord coalesces before it is named here.

export interface ChordName {
  /** the display label — pitch-class spelling only, no octave digits (e.g. "Am7", "G/B", "C·"). */
  label: string;
  /** the chosen root pitch class 0..11, or null for an empty set. */
  root: number | null;
  /** the matched quality key ('maj','m7','dim7',… ; 'note'/'dyad'/'cluster'/'none' for degenerates). */
  quality: string;
  /** pitch class of the lowest MIDI note (what is in the bass), or null for an empty set. */
  bassPc: number | null;
  /** roman numeral when the named chord is diatonic to ctx ('vi','V7','ii°'), else null.
   *  The null IS the off-map signal — no other off-map state exists (§3.8). */
  degree: string | null;
}

export interface ChordCtx {
  keyRoot: number; // 0..11
  scaleMode: 'major' | 'minor' | 'chrom';
}

// ── spelling: pitch class → letter name, key-signature aware ──
const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
// chrom spelling: fifths-nearest to C (deterministic). D♭/E♭/A♭/B♭ are nearer as flats; F♯ wins the
// tritone tie by convention. This is the single fixed chromatic spelling in the absence of a key.
const CHROM_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
// major keys spelled with flats (by tonic pitch class): F B♭ E♭ A♭ D♭ G♭. The rest (C, and the sharp
// majors G D A E B, plus F♯/C♯ which we read as G♭/D♭) use sharps. Minor keys inherit their relative
// major's signature.
const FLAT_MAJORS = new Set([5, 10, 3, 8, 1, 6]);

const mod12 = (n: number): number => ((n % 12) + 12) % 12;

function useFlats(ctx: ChordCtx): boolean {
  if (ctx.scaleMode === 'chrom') return false; // chrom uses CHROM_NAMES directly
  const majorRoot = ctx.scaleMode === 'minor' ? mod12(ctx.keyRoot + 3) : mod12(ctx.keyRoot);
  return FLAT_MAJORS.has(majorRoot);
}

/** R6 — the keybed prints note names through this same law (key signature in a key, fifths-nearest in
 *  chrom), so a key face and a chord label can never disagree about how a pitch is spelled. */
export function spellPitchClass(pc: number, ctx: ChordCtx): string { return spell(pc, ctx); }

function spell(pc: number, ctx: ChordCtx): string {
  const p = mod12(pc);
  if (ctx.scaleMode === 'chrom') return CHROM_NAMES[p];
  return (useFlats(ctx) ? FLAT_NAMES : SHARP_NAMES)[p];
}

// F4 — spell a CHORD TONE (the slash bass) relative to the chosen root's LETTER, so it never lands on
// the wrong side of the key: A major's third stays C♯ (not D♭) even when the ctx key is flat; a dom7's
// ♭7 stays B♭ (not A♯) even when the ctx key is sharp. The letter = the root's letter + the interval's
// diatonic step; the accidental then bends that letter's natural to the target pitch class. The ROOT
// itself still spells from the ctx key (the doc's "the key spells accidentals"); only inner tones need
// this relative pass. Deterministic, pure.
const LETTER_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11]; // the natural pitch class of each letter
// interval semitones (0..11) → diatonic letter-steps above the root, for the chord tones the v1 table
// produces: ♭2/9→2nd, ♭3/3→3rd, 4→4th, ♭5/5/♯5→5th, 6→6th, ♭7/7→7th.
const LETTER_STEP = [0, 1, 1, 2, 2, 3, 4, 4, 4, 5, 6, 6];
function spellChordTone(pc: number, root: number, ctx: ChordCtx): string {
  const rootName = spell(root, ctx);
  const rootLetterIdx = LETTER_ORDER.indexOf(rootName[0]);
  if (rootLetterIdx < 0) return spell(pc, ctx); // defensive — root has no letter head
  const letterIdx = (rootLetterIdx + LETTER_STEP[mod12(pc - root)]) % 7;
  let acc = mod12(pc - LETTER_PC[letterIdx]); if (acc > 6) acc -= 12; // → −6..+5 (chord tones land −2..+2)
  return LETTER_ORDER[letterIdx] + (acc > 0 ? '♯'.repeat(acc) : acc < 0 ? '♭'.repeat(-acc) : '');
}

// ── the quality table: EXACT interval-set (semitones from root) → { key, suffix }. Ordered widest-first
// only for readability; matching is exact-set, so order does not affect correctness. Beyond this table we
// fall to the nearest triad STEM, then to an honest cluster — never a fabricated jazz name (§3.1). ──
interface QualityDef { key: string; ivals: number[]; suffix: string; }
const QUALITIES: QualityDef[] = [
  { key: '9', ivals: [0, 2, 4, 7, 10], suffix: '9' },
  { key: 'm9', ivals: [0, 2, 3, 7, 10], suffix: 'm9' },
  { key: '6', ivals: [0, 4, 7, 9], suffix: '6' },
  { key: 'm6', ivals: [0, 3, 7, 9], suffix: 'm6' },
  { key: '7', ivals: [0, 4, 7, 10], suffix: '7' },
  { key: 'maj7', ivals: [0, 4, 7, 11], suffix: 'maj7' },
  { key: 'm7', ivals: [0, 3, 7, 10], suffix: 'm7' },
  { key: 'm7♭5', ivals: [0, 3, 6, 10], suffix: 'm7♭5' },
  { key: 'dim7', ivals: [0, 3, 6, 9], suffix: '°7' },
  { key: 'add9', ivals: [0, 2, 4, 7], suffix: 'add9' },
  { key: 'm(add9)', ivals: [0, 2, 3, 7], suffix: 'm(add9)' },
  { key: 'maj', ivals: [0, 4, 7], suffix: '' },
  { key: 'min', ivals: [0, 3, 7], suffix: 'm' },
  { key: 'dim', ivals: [0, 3, 6], suffix: '°' },
  { key: 'aug', ivals: [0, 4, 8], suffix: '+' },
  { key: 'sus2', ivals: [0, 2, 7], suffix: 'sus2' },
  { key: 'sus4', ivals: [0, 5, 7], suffix: 'sus4' },
  { key: '5', ivals: [0, 7], suffix: '5' },
];
// interval-set → 12-bit mask (bit i set = semitone i present, relative to root)
const maskOf = (ivals: number[]): number => ivals.reduce((m, i) => m | (1 << mod12(i)), 0);
const QUAL_BY_MASK = new Map<number, QualityDef>();
for (const q of QUALITIES) QUAL_BY_MASK.set(maskOf(q.ivals), q);

// core triads for the STEM fallback (a set that contains one of these but matches no exact quality is
// named by the triad stem — "no pretense", never a fabricated extension name).
const CORE_TRIADS: Array<{ key: string; mask: number; suffix: string }> = [
  { key: 'maj', mask: maskOf([0, 4, 7]), suffix: '' },
  { key: 'min', mask: maskOf([0, 3, 7]), suffix: 'm' },
  { key: 'dim', mask: maskOf([0, 3, 6]), suffix: '°' },
  { key: 'aug', mask: maskOf([0, 4, 8]), suffix: '+' },
];

// the two scales (mirrors engine/dsp.ts SCALES — intentionally duplicated to keep this a zero-import leaf)
const SCALE_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const SCALE_MINOR = [0, 2, 3, 5, 7, 8, 10];
const scaleFor = (mode: ChordCtx['scaleMode']): number[] | null =>
  mode === 'major' ? SCALE_MAJOR : mode === 'minor' ? SCALE_MINOR : null;

// dyad interval marks (from the bass upward). Perfect fifths never reach here (matched as a power chord);
// everything else names the raw interval honestly rather than guessing an absent third.
const DYAD_MARK: Record<number, string> = {
  0: '8ve', 1: 'm2', 2: 'M2', 3: 'm3', 4: 'M3', 5: 'P4', 6: 'TT', 8: 'm6', 9: 'M6', 10: 'm7', 11: 'M7',
};

// roman numerals by scale-degree index (0..6)
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const UPPER_QUALITIES = new Set(['maj', 'aug', '6', '7', 'maj7', '9', 'add9', 'sus2', 'sus4', '5']);
const DIM_QUALITIES = new Set(['dim', 'dim7', 'm7♭5']);

// The degree: roman numeral iff every pitch class is diatonic to ctx AND the root sits on a scale degree.
// Non-diatonic (any accidental) or chrom → null (the sole off-map signal).
function degreeFor(pcs: number[], root: number, quality: string, ctx: ChordCtx): string | null {
  const scale = scaleFor(ctx.scaleMode);
  if (!scale) return null;
  for (const pc of pcs) if (!scale.includes(mod12(pc - ctx.keyRoot))) return null;
  const deg = scale.indexOf(mod12(root - ctx.keyRoot));
  if (deg < 0) return null;
  let r = ROMAN[deg];
  if (!UPPER_QUALITIES.has(quality)) r = r.toLowerCase();
  // quality decoration on the roman (vi, V7, ii°, viø7…)
  if (DIM_QUALITIES.has(quality)) r += quality === 'dim' ? '°' : quality === 'dim7' ? '°7' : 'ø7';
  else if (quality === '7' || quality === 'm7') r += '7';
  else if (quality === 'maj7') r += 'maj7';
  // F3 — added-sixth chords render a PLAIN roman (I / i, not "I6"): "I6" collides with figured-bass
  // first-inversion notation. The label already carries the "6" (e.g. "C6"); the degree stays clean.
  else if (quality === '9' || quality === 'm9') r += '9';
  else if (quality === 'add9' || quality === 'm(add9)') r += 'add9';
  else if (quality === 'sus2') r += 'sus2';
  else if (quality === 'sus4') r += 'sus4';
  return r;
}

// Score a candidate root reading, key-first: the KEY chooses the ROOT of a genuine pitch-class tie
// (C6 vs Am7 resolve to the tonic reading in ctx), the bass only nudges. The bass decides the SLASH
// separately, downstream. Higher = better; ties break to the lowest pitch class (deterministic).
function scoreRoot(root: number, pcs: number[], ctx: ChordCtx, bassPc: number): number {
  const scale = scaleFor(ctx.scaleMode);
  let s = 0;
  if (ctx.scaleMode === 'chrom') {
    if (root === bassPc) s += 1000; // no key → the root-position (bass = root) reading
    if (root === mod12(ctx.keyRoot)) s += 10;
  } else {
    if (root === mod12(ctx.keyRoot)) s += 1000; // the tonic reading wins a true tie
    if (scale && pcs.every((pc) => scale.includes(mod12(pc - ctx.keyRoot)))) s += 100; // diatonic chord
    if (root === bassPc) s += 10; // the bass supports this root
  }
  return s;
}

/**
 * Name the sounding pitch-class set. `midi` is any list of MIDI note numbers (dupes/octaves fine, order
 * irrelevant except that the LOWEST decides the bass). `ctx` is the live key + scale. Deterministic.
 */
export function nameChord(midi: number[], ctx: ChordCtx): ChordName {
  // dedupe to pitch classes; track the lowest MIDI note for the bass
  const pcSet = new Set<number>();
  let bassMidi = Infinity;
  for (const n of midi) {
    if (!Number.isFinite(n)) continue;
    pcSet.add(mod12(n));
    if (n < bassMidi) bassMidi = n;
  }
  const pcs = [...pcSet].sort((a, b) => a - b);

  // 0 notes — empty. The screen holds its last name DIM and never asks us; this is the honest null.
  if (pcs.length === 0) return { label: '', root: null, quality: 'none', bassPc: null, degree: null };

  const bassPc = mod12(bassMidi);

  // 1 note — the note name.
  if (pcs.length === 1) {
    return { label: spell(pcs[0], ctx), root: pcs[0], quality: 'note', bassPc, degree: null };
  }

  // exact interval-set match: try every pitch class as a candidate root, keep the exact-quality hits.
  const setMask = pcs.reduce((m, pc) => m | (1 << pc), 0);
  const matches: Array<{ root: number; def: QualityDef }> = [];
  for (const root of pcs) {
    const rel = mod12Mask(setMask, root);
    const def = QUAL_BY_MASK.get(rel);
    if (!def) continue;
    // F6 — the power chord '5' only reads when the bass IS the root (a fifth built UP from the bass). A
    // bare perfect FOURTH is NOT an inverted power chord — it falls through to the honest dyad branch.
    if (def.key === '5' && root !== bassPc) continue;
    matches.push({ root, def });
  }

  if (matches.length) {
    matches.sort((a, b) => {
      const sd = scoreRoot(b.root, pcs, ctx, bassPc) - scoreRoot(a.root, pcs, ctx, bassPc);
      if (sd !== 0) return sd;
      return a.root - b.root; // deterministic final tiebreak
    });
    const { root, def } = matches[0];
    const degree = degreeFor(pcs, root, def.key, ctx);
    const slash = bassPc !== root ? '/' + spellChordTone(bassPc, root, ctx) : ''; // F4 — inner-tone spelling relative to the root
    return { label: spell(root, ctx) + def.suffix + slash, root, quality: def.key, bassPc, degree };
  }

  // 2 notes, no chord — an honest dyad: bass note + the raw interval above it (no invented third).
  if (pcs.length === 2) {
    const iv = mod12(pcs[1] - bassPc) || mod12(pcs[0] - bassPc);
    const mark = DYAD_MARK[iv] ?? 'M2';
    return { label: spell(bassPc, ctx) + '+' + mark, root: bassPc, quality: 'dyad', bassPc, degree: null };
  }

  // 3+ notes beyond the table → the nearest triad STEM if the set contains one, else an honest cluster.
  const stems: Array<{ root: number; key: string; suffix: string }> = [];
  for (const root of pcs) {
    const rel = mod12Mask(setMask, root);
    for (const t of CORE_TRIADS) if ((rel & t.mask) === t.mask) stems.push({ root, key: t.key, suffix: t.suffix });
  }
  if (stems.length) {
    stems.sort((a, b) => {
      const sd = scoreRoot(b.root, pcs, ctx, bassPc) - scoreRoot(a.root, pcs, ctx, bassPc);
      if (sd !== 0) return sd;
      return a.root - b.root;
    });
    const { root, key, suffix } = stems[0];
    const degree = degreeFor(pcs, root, key, ctx);
    const slash = bassPc !== root ? '/' + spellChordTone(bassPc, root, ctx) : ''; // F4 — inner-tone spelling relative to the root
    return { label: spell(root, ctx) + suffix + slash, root, quality: key, bassPc, degree };
  }

  // an unnamed cluster — the root pitch + a dim `·`. A readout that sometimes says "I don't name this"
  // is more trusted than one that lies. `·` renders dim in the glass (view concern).
  return { label: spell(bassPc, ctx) + '·', root: bassPc, quality: 'cluster', bassPc, degree: null };
}

// rotate a 12-bit pitch-class mask so `root` becomes bit 0 (interval-set relative to the root).
function mod12Mask(mask: number, root: number): number {
  let out = 0;
  for (let pc = 0; pc < 12; pc++) if (mask & (1 << pc)) out |= 1 << mod12(pc - root);
  return out;
}
