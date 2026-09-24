// SIGNAL · MUSIC (src/signal/music.ts · lane H · R1): key, scale, octave → MIDI. Pure, DOM-free; imports only the
// contract's types. Map: docs/signal-map/D-time-arp-chords.md §3 (the law) and §7 (the port row).
//
// from signal-studio-v6lib/src/engine/music.ts:1-79 (2a9e4a7) — ADAPTED to MIDI: the contract's voices take MIDI, not
//   Hz, so baseC (261.63·2^oct Hz) is MIDI 60 + 12·oct and freqForOffset is midiForOffset. snapOffset, centeredKey,
//   stepOffset and triadOffsets keep the Studio's bodies, reading the contract's field names (key, scale, oct).
//   triadFreqsFromRoot is NOT ported: it re-derives a triad from a pitch and re-snaps the root, which is the D §2.2
//   defect (a colour key under ARP + CHORD arped the wrong chord). The triad is computed ONCE, at press time
//   (triadForOffset / triadForMidi), and carried by whoever holds the note.
// from signal-studio-v6lib/src/engine/dsp.ts:9, 96-99 (2a9e4a7) — NOTE_NAMES and SCALES, inline (no import).
// from signal-studio-v6lib/src/views/instrument/play.ts:49-55 (2a9e4a7) — the letter offsets (whites, blacks).
// from signal-studio-v6lib/src/views/instrument/play.ts:416-433 (2a9e4a7) — THE COLOUR ROW: in a key the black row
//   plays the five pitch classes the scale lacks, in order, the sixth cap = the first + 12, UNSNAPPED; in FREE it is
//   the plain chromatic row.
// from signal-studio-v6lib/src/views/instrument/play.ts:317-323 (2a9e4a7) — CHORD: a letter sounds its diatonic triad,
//   a colour cap a plain major triad (a diatonic triad would have to snap the borrowed root away).
// from signal-studio-v6lib/src/views/instrument/play.ts:611-612 (2a9e4a7) — the KEY summary ("C MAJ" / "A MIN" / "FREE").
//
// The octave range is the contract's −1..+1 (C2..C7 holds every letter, D §6), not the Studio's −3..3.

import type { Music, ScaleName } from './types.ts';

// from signal-studio-v6lib/src/engine/dsp.ts:9 (2a9e4a7)
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// from signal-studio-v6lib/src/engine/dsp.ts:96-99 (2a9e4a7) — chrom has no scale (no snap)
export const SCALES: Readonly<Record<'major' | 'minor', readonly number[]>> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

export const SCALE_NAMES: readonly ScaleName[] = ['major', 'minor', 'chrom'];
export const OCT_MIN = -1;
export const OCT_MAX = 1;
/** MIDI of the letters' C at oct 0 (the Studio's baseC 261.63 Hz = middle C). */
export const MIDI_C = 60;

// from signal-studio-v6lib/src/views/instrument/play.ts:49-55 (2a9e4a7) — A S D F G H J K L, then W E T Y U O
export const WHITE_OFFSETS: readonly number[] = [0, 2, 4, 5, 7, 9, 11, 12, 14];
export const COLOUR_OFFSETS: readonly number[] = [1, 3, 6, 8, 10, 13];

export const MUSIC_DEFAULT: Readonly<Music> = { key: 0, scale: 'major', oct: 0 };

const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const isScale = (s: unknown): s is ScaleName => s === 'major' || s === 'minor' || s === 'chrom';

/** A Music from anything: key → 0..11, scale one of the three, oct → an integer in −1..+1; a bad field keeps `prev`'s. */
export function normMusic(m: unknown, prev: Readonly<Music> = MUSIC_DEFAULT): Music {
  const o = (m && typeof m === 'object' ? m : {}) as Partial<Record<keyof Music, unknown>>;
  const key = typeof o.key === 'number' && Number.isFinite(o.key) ? mod12(Math.round(o.key)) : prev.key;
  const scale = isScale(o.scale) ? o.scale : prev.scale;
  const oct = typeof o.oct === 'number' && Number.isFinite(o.oct)
    ? Math.min(OCT_MAX, Math.max(OCT_MIN, Math.round(o.oct))) : prev.oct;
  return { key, scale, oct };
}

// from signal-studio-v6lib/src/engine/music.ts:16-18 (2a9e4a7) — makeMusic, on the contract's fields
export function makeMusic(init?: Partial<Music>): Music {
  return normMusic({ ...MUSIC_DEFAULT, ...init });
}

// from signal-studio-v6lib/src/engine/music.ts:20-22 (2a9e4a7) — baseC = 261.63·2^oct Hz = MIDI 60 + 12·oct
export function baseMidi(m: Music): number {
  return MIDI_C + 12 * m.oct;
}

// from signal-studio-v6lib/src/engine/music.ts:24-32 (2a9e4a7) — the nearest scale tone, ties DOWN
export function snapOffset(m: Music, o: number): number {
  if (m.scale === 'chrom') return o;
  const sc = SCALES[m.scale] || SCALES.major;
  for (let d = 0; d <= 6; d++) {
    if (sc.includes((((o - d) % 12) + 12) % 12)) return o - d;
    if (sc.includes((((o + d) % 12) + 12) % 12)) return o + d;
  }
  return o;
}

// from signal-studio-v6lib/src/engine/music.ts:34-44 (2a9e4a7) — R1-f2 REGISTER-STABLE TRAVEL — anchor the key root to
// the NEAREST octave rather than always transposing UP from C. keyRoot 0..11 names a pitch class; as a raw exponent it
// lifted the whole keyboard by up to +11 semitones, so travelling C→G climbed +7 (a near-octave jump) instead of the
// −5 a player expects. Centering maps 7..11 → −5..−1, so every travel is the SHORTEST move and the hands stay in
// register. Pitch classes are unchanged (centered ≡ keyRoot mod 12), so note names, snapping and chord naming are
// untouched.
export function centeredKey(k: number): number {
  const kr = ((k % 12) + 12) % 12;
  return kr > 6 ? kr - 12 : kr;
}

/** The letters' tonic in MIDI: offset 0 of the row (baseC + the centred key). */
export function tonicMidi(m: Music): number {
  return baseMidi(m) + centeredKey(m.key);
}

// from signal-studio-v6lib/src/engine/music.ts:50-64 (2a9e4a7) — shift an offset by N diatonic scale degrees (stay in
// key); semitones in chrom
export function stepOffset(m: Music, o: number, steps: number): number {
  if (!steps) return o;
  if (m.scale === 'chrom') return o + steps;
  const sc = SCALES[m.scale] || SCALES.major,
    sn = snapOffset(m, o),
    pc = ((sn % 12) + 12) % 12,
    oct = Math.floor(sn / 12);
  let deg = sc.indexOf(pc);
  if (deg < 0) deg = 0;
  const idx = oct * sc.length + deg + steps,
    no = Math.floor(idx / sc.length),
    nd = ((idx % sc.length) + sc.length) % sc.length;
  return sc[nd] + 12 * no;
}

// from signal-studio-v6lib/src/engine/music.ts:66-70 (2a9e4a7) — diatonic triad offsets for a pressed offset (root +
// 3rd + 5th); fixed major triad in chrom
export function triadOffsets(m: Music, off: number): number[] {
  if (m.scale === 'chrom') return [off, off + 4, off + 7];
  return [off, stepOffset(m, off, 2), stepOffset(m, off, 4)];
}

// from signal-studio-v6lib/src/views/instrument/play.ts:416-428 (2a9e4a7) — THE COLOUR ROW. The caps are CHROMATIC BY
// CONSTRUCTION (they bypass snapOffset). Five notes, six caps: the last one repeats the first an octave up, so the row
// still spans the hand. null in FREE, where the whole board is already chromatic.
export function colourRow(m: Music): number[] | null {
  if (m.scale === 'chrom') return null;
  const sc = SCALES[m.scale] || SCALES.major;
  const out: number[] = [];
  for (let i = 1; i < 12; i++) if (!sc.includes(i)) out.push(i);   // the five notes outside the key
  const row = COLOUR_OFFSETS.map((_, i) => (i < 5 ? out[i] : out[0] + 12));
  return row.every((o) => Number.isFinite(o)) ? row : null;
}

/** A colour cap's sounding offset: its slot in the colour row (W E T Y U O = 1 3 6 8 10 13), unsnapped; in FREE (or an
 *  offset that is not a cap's) the offset itself, chromatic. */
export function colourOffset(m: Music, offset: number): number {
  const row = colourRow(m);
  const i = COLOUR_OFFSETS.indexOf(offset);
  return row && i >= 0 ? row[i] : offset;
}

/** THE LETTERS' PITCH (D §3): 60 + 12·oct + (colour ? the colour-row offset, unsnapped : snap(offset)) + centeredKey(key).
 *  play.ts:429-435 (colorFreq / freqOfQ) in MIDI. */
export function midiForOffset(m: Music, offset: number, colour = false): number {
  return baseMidi(m) + (colour ? colourOffset(m, offset) : snapOffset(m, offset)) + centeredKey(m.key);
}

/** The chord a letter sounds under CHORD, as MIDI with the root first (play.ts:316-323): a white letter's diatonic triad
 *  on its snapped root; a colour cap's plain major triad on its unsnapped root; FREE: a major triad (triadOffsets). */
export function triadForOffset(m: Music, offset: number, colour = false): number[] {
  const kb = tonicMidi(m);
  if (colour) { const c = colourOffset(m, offset); return [kb + c, kb + c + 4, kb + c + 7]; }
  const t = triadOffsets(m, offset);
  return [kb + snapOffset(m, offset), kb + t[1], kb + t[2]];
}

/** The press-time triad of ANY note (a stage key, a caller that passes no chord): a note of the key → its diatonic
 *  triad; a note off the key → a plain major triad on it (the colour rule, never snapped); FREE → a major triad.
 *  Agrees with triadForOffset for every letter (music.test.mjs pins it). */
export function triadForMidi(m: Music, midi: number): number[] {
  if (m.scale === 'chrom') return [midi, midi + 4, midi + 7];
  const kb = tonicMidi(m), off = midi - kb;
  const sc = SCALES[m.scale] || SCALES.major;
  if (!sc.includes(mod12(off))) return [midi, midi + 4, midi + 7];
  return [midi, kb + stepOffset(m, off, 2), kb + stepOffset(m, off, 4)];
}

/** ←/→ on a sounding chord (the MOVE law, play.ts:380-396 on MIDI): a note moved `steps` scale degrees through the key
 *  (stepOffset: an off-key note snaps first, ties down); semitones in FREE. Octave-invariant in the tonic. */
export function stepMidi(m: Music, midi: number, steps: number): number {
  if (!steps) return midi;
  const kb = tonicMidi(m);
  return kb + stepOffset(m, midi - kb, steps);
}

// from signal-studio-v6lib/src/views/instrument/play.ts:611-612 (2a9e4a7) — the KEY glass's summary
export function keySummary(m: Music): string {
  return m.scale === 'chrom' ? 'FREE' : NOTE_NAMES[mod12(m.key)] + (m.scale === 'minor' ? ' MIN' : ' MAJ');
}
