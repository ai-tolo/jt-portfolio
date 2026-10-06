// SIGNAL · THE WORDS UNDER THE INSTRUMENT (R2, lane B). Jon edits this file. R3: UNMOUNTED under the device (brief §E: the
// surface carries the teaching); since 2026-10-06 its LEGEND is what the card's HOW TO PLAY diagram draws.
//   LEGEND  the keys the page answers to, grouped, each group with one lowercase word. It mirrors the key table in
//           src/signal/types.ts (KEYMAP): a remap there is a line here. ./HowToPlay.astro draws it as ONE keyboard
//           (2026-10-06, Jon: "a diagram with the view of a keyboard with color-coded highlighting for groups of
//           controls"): the geometry lives there, the words and the groups here; the build fails if a KEYMAP code is
//           missing from LEGEND or LEGEND names a code KEYMAP does not bind.
//   BRIEF   unmounted; it is the card's story (./signal-card-copy.ts), one source.

import { CARD } from "./signal-card-copy.ts";

/** The device's colour a group lights in (src/styles/signal/material.css): keys = sapphire (the notes and the two arrow
 *  pairs, which live in the KEYS tower and its keybed), drums = orange, bass = violet, hands = amber (Z, M and the
 *  tap), stop = red. */
export type LegendHue = "keys" | "drums" | "bass" | "hands" | "stop";

/** One group: its KEYMAP codes, how the keys are written in the narrow legend, its word, its colour. */
export interface LegendItem {
  id: string;
  codes: readonly string[];
  keys: string;
  word: string;
  hue: LegendHue;
}

/** In reading order (the narrow legend's order). W E T Y U O are the black keys between A–L: notes, like the rest. */
export const LEGEND: readonly LegendItem[] = [
  { id: "notes", hue: "keys", keys: "A–L · W E T Y U O", word: "notes",
    codes: ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "KeyW", "KeyE", "KeyT", "KeyY", "KeyU", "KeyO"] },
  { id: "drums", hue: "drums", keys: "space", word: "drums on/off", codes: ["Space"] },
  { id: "bass", hue: "bass", keys: "B", word: "bass on/off", codes: ["KeyB"] },
  { id: "gate", hue: "hands", keys: "Z", word: "gate (hold)", codes: ["KeyZ"] },
  { id: "dive", hue: "hands", keys: "M", word: "dive (hold)", codes: ["KeyM"] },
  { id: "octave", hue: "keys", keys: "← →", word: "octave", codes: ["ArrowLeft", "ArrowRight"] },
  { id: "sound", hue: "keys", keys: "↑ ↓", word: "sound of the notes", codes: ["ArrowUp", "ArrowDown"] },
  { id: "tap", hue: "hands", keys: "=", word: "tap tempo", codes: ["Equal"] },
  { id: "stop", hue: "stop", keys: "esc", word: "stop everything", codes: ["Escape"] },
];

/** The brief's handle (lowercase chrome). */
export const BRIEF_SUMMARY = "about this instrument";

/** The brief (unmounted): the card's story, so the two can never disagree. */
export const BRIEF: readonly string[] = CARD.story;
