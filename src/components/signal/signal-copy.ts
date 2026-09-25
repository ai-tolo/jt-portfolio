// SIGNAL · THE WORDS UNDER THE INSTRUMENT (R2, lane B). Jon edits this file. R3: UNMOUNTED (brief §E: the surface carries
// the teaching; Jon writes what goes beneath after the round) — kept on disk, Signal.astro no longer prints it.
//   LEGEND  the device's own chrome: the keys the page answers to, each with one lowercase word. It mirrors the key
//           table in src/signal/types.ts (KEYMAP): a remap there is a line here.
//   BRIEF   DRAFT, Jon's voice (first person, plain, no hype): what the instrument is and how to start. He rewrites it;
//           never polish it for him.

/** One chip: its keys drawn as small keycaps, then its word. `range` prints the first and the last key joined by a
 *  dash (A–L, 1–8); otherwise every key is its own cap. */
export interface LegendItem {
  keys: readonly string[];
  word: string;
  range?: boolean;
}

/** Two rows: the hand (notes, drums, bass and the switches), then the gestures, pads, moves, tempo and stop. The rows
 *  sit side by side where the room is wide enough and stack where it is not. */
export const LEGEND: ReadonlyArray<ReadonlyArray<LegendItem>> = [
  [
    { keys: ['A', 'L'], range: true, word: 'notes' },
    { keys: ['W', 'E', 'T', 'Y', 'U', 'O'], word: 'colour' },
    { keys: ['space'], word: 'drums' },
    { keys: ['B'], word: 'bass' },
  ],
  [
    { keys: ['Z'], word: 'gate (hold)' },
    { keys: ['M'], word: 'dive (hold)' },
    { keys: ['←', '→'], word: 'octave' },
    { keys: ['↑', '↓'], word: 'voice' },
    { keys: ['='], word: 'tap' },
    { keys: ['esc'], word: 'stop' },
  ],
];

/** The brief's handle (lowercase chrome). */
export const BRIEF_SUMMARY = 'about this instrument';

/** DRAFT (Jon edits): the brief, one string per paragraph. */
export const BRIEF: readonly string[] = [
  'A browser instrument made from my studio: a drum machine, a 303-style bass, and a keyboard voiced with rips of my own synths. All of it is Web Audio, running in this page.',
  'Press power, then play the letters on your keyboard.',
];
