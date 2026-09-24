// music.ts (SIGNAL R1, lane H): key / scale / octave → MIDI. The Studio's music.test.mjs checks
// (signal-studio-v6lib/src/engine/music.test.mjs:1-73 @ 2a9e4a7) carried to MIDI, plus the letters, the colour row, A
// minor, FREE, the octave clamp and the press-time triads.
// Run: source ~/.nvm/nvm.sh && node src/signal/music.test.mjs
import {
  makeMusic, normMusic, centeredKey, baseMidi, snapOffset, stepOffset, triadOffsets, colourRow, colourOffset,
  midiForOffset, triadForOffset, triadForMidi, stepMidi, keySummary, tonicMidi, WHITE_OFFSETS, COLOUR_OFFSETS,
} from './music.ts';
import { KEYMAP } from './types.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const js = (a) => JSON.stringify(a);

const C = makeMusic();
const AMIN = makeMusic({ key: 9, scale: 'minor' });
const FREE = makeMusic({ scale: 'chrom' });
const WHITES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'];
const BLACKS = ['KeyW', 'KeyE', 'KeyT', 'KeyY', 'KeyU', 'KeyO'];
const letter = (m, code) => { const a = KEYMAP[code]; return midiForOffset(m, a.offset, a.colour); };
const row = (m, codes) => codes.map((c) => letter(m, c));

console.log('\n[music] the letters (the contract KEYMAP) in C major, oct 0');
ok('A S D F G H J K L = 60 62 64 65 67 69 71 72 74', eq(row(C, WHITES), [60, 62, 64, 65, 67, 69, 71, 72, 74]), js(row(C, WHITES)));
ok('the KEYMAP offsets are the Studio letters (play.ts:49-55)',
  eq(WHITES.map((c) => KEYMAP[c].offset), [...WHITE_OFFSETS]) && eq(BLACKS.map((c) => KEYMAP[c].offset), [...COLOUR_OFFSETS])
  && WHITES.every((c) => KEYMAP[c].colour === false) && BLACKS.every((c) => KEYMAP[c].colour === true));
ok('A is the tonic: C4 = 60 at oct 0', letter(C, 'KeyA') === 60 && tonicMidi(C) === 60);

console.log('\n[music] the COLOUR ROW (play.ts:416-433)');
ok('C major: W E T Y U = C♯ D♯ F♯ G♯ A♯, O = C♯5', eq(row(C, BLACKS), [61, 63, 66, 68, 70, 73]), js(row(C, BLACKS)));
ok('the row = the five pitch classes C major lacks, the sixth = the first + 12', eq(colourRow(C), [1, 3, 6, 8, 10, 13]));
ok('A minor: the row is A minor\'s own five (A♯ C♯ D♯ F♯ G♯) + A♯ an octave up', eq(row(AMIN, BLACKS), [58, 61, 63, 66, 68, 70]), js(row(AMIN, BLACKS)));
ok('the colour caps are NEVER snapped: every one is off the key', (() => {
  for (let k = 0; k < 12; k++) for (const s of ['major', 'minor']) {
    const m = makeMusic({ key: k, scale: s }), sc = s === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
    for (const c of BLACKS) { const n = letter(m, c); if (sc.includes((((n - tonicMidi(m)) % 12) + 12) % 12)) return false; }
  }
  return true;
})());
ok('the six caps are six distinct pitches ascending in every key', (() => {
  for (let k = 0; k < 12; k++) for (const s of ['major', 'minor']) {
    const r = row(makeMusic({ key: k, scale: s }), BLACKS);
    if (!r.every((n, i) => i === 0 || n > r[i - 1])) return false;
  }
  return true;
})());
ok('FREE has no colour row (null)', colourRow(FREE) === null);

console.log('\n[music] A minor');
ok('A S D F G H J K L = A3 B3 C4 D4 E4 F4 G4 A4 B4 (57 … 71)', eq(row(AMIN, WHITES), [57, 59, 60, 62, 64, 65, 67, 69, 71]), js(row(AMIN, WHITES)));
ok('the tonic sits a minor third BELOW middle C (centeredKey 9 = −3)', tonicMidi(AMIN) === 57);

console.log('\n[music] FREE (chrom): the plain chromatic row, nothing snaps');
ok('FREE in C: whites 60 62 64 65 67 69 71 72 74', eq(row(FREE, WHITES), [60, 62, 64, 65, 67, 69, 71, 72, 74]));
ok('FREE in C: blacks 61 63 66 68 70 73 (the offsets themselves)', eq(row(FREE, BLACKS), [61, 63, 66, 68, 70, 73]));
{
  const D = makeMusic({ key: 2, scale: 'chrom' });
  ok('FREE in D: the whole row rides up 2, chromatic', eq(row(D, WHITES), [62, 64, 66, 67, 69, 71, 73, 74, 76]) && eq(row(D, BLACKS), [63, 65, 68, 70, 72, 75]), js([row(D, WHITES), row(D, BLACKS)]));
  ok('FREE: a colour offset is the offset itself', colourOffset(D, 6) === 6);
}

console.log('\n[music] snapOffset ties DOWN, stepOffset walks the key (music.ts:24-64)');
ok('C major: offset 1 snaps to 0 (tie → down)', snapOffset(C, 1) === 0);
ok('C major: offset 6 snaps to 5 (tie → down)', snapOffset(C, 6) === 5);
ok('A minor: offset 4 snaps to 3', snapOffset(AMIN, 4) === 3);
ok('chrom never snaps', snapOffset(FREE, 6) === 6);
ok('stepOffset: C → D → E (+1, +2)', stepOffset(C, 0, 1) === 2 && stepOffset(C, 0, 2) === 4);
ok('stepOffset wraps the octave (B +1 = C an octave up)', stepOffset(C, 11, 1) === 12);
ok('stepOffset down from the tonic = the 7th below', stepOffset(C, 0, -1) === -1);
ok('stepOffset in chrom = semitones', stepOffset(FREE, 0, 3) === 3);
ok('triadOffsets: C major I = [0,4,7], ii = [2,5,9]', eq(triadOffsets(C, 0), [0, 4, 7]) && eq(triadOffsets(C, 2), [2, 5, 9]));
ok('triadOffsets in chrom = a major triad', eq(triadOffsets(FREE, 3), [3, 7, 10]));

console.log('\n[music] the octave: −1..+1, clamped');
ok('oct −1: A = 48', letter(makeMusic({ oct: -1 }), 'KeyA') === 48);
ok('oct +1: A = 72', letter(makeMusic({ oct: 1 }), 'KeyA') === 72);
ok('oct clamps at ±1 (the contract range)', makeMusic({ oct: 3 }).oct === 1 && makeMusic({ oct: -7 }).oct === -1);
ok('baseMidi = 60 + 12·oct', baseMidi(makeMusic({ oct: -1 })) === 48 && baseMidi(C) === 60);
ok('normMusic: key folds into 0..11, a bad scale keeps the previous', (() => {
  const m = normMusic({ key: -3, scale: 'dorian', oct: 0.4 }, AMIN);
  return m.key === 9 && m.scale === 'minor' && m.oct === 0;
})());
ok('every letter at every octave stays on the C2..C7 stage (36..96), colour row included', (() => {
  for (let k = 0; k < 12; k++) for (const s of ['major', 'minor', 'chrom']) for (let o = -1; o <= 1; o++) {
    const m = makeMusic({ key: k, scale: s, oct: o });
    for (const c of [...WHITES, ...BLACKS]) { const n = letter(m, c); if (n < 36 || n > 96) return false; }
  }
  return true;
})());

console.log('\n[music] the Studio checks, in MIDI (music.test.mjs:8-70)');
ok('centeredKey: C 0 · F 5 · F♯ 6 · G −5 · A −3 · B −1', centeredKey(0) === 0 && centeredKey(5) === 5 && centeredKey(6) === 6 && centeredKey(7) === -5 && centeredKey(9) === -3 && centeredKey(11) === -1);
ok('every centered key is within ±6 semitones', [...Array(12).keys()].every((k) => Math.abs(centeredKey(k)) <= 6));
ok('centered ≡ key (mod 12)', [...Array(12).keys()].every((k) => ((centeredKey(k) % 12) + 12) % 12 === k));
ok('negative / out-of-range roots normalize', centeredKey(-5) === centeredKey(7) && centeredKey(19) === centeredKey(7));
ok('C → G moves −5 semitones (not +7)', midiForOffset(makeMusic({ key: 7 }), 0) - midiForOffset(C, 0) === -5);
ok('C → D moves +2', midiForOffset(makeMusic({ key: 2 }), 0) - midiForOffset(C, 0) === 2);
ok('no key travel exceeds a tritone', [...Array(12).keys()].every((k) => Math.abs(midiForOffset(makeMusic({ key: k }), 0) - 60) <= 6));
ok('offset → MIDI → offset round-trips to snapOffset (every key / scale / octave / offset −14..14)', (() => {
  for (const s of ['major', 'minor', 'chrom']) for (let k = 0; k < 12; k++) for (let o = -1; o <= 1; o++) {
    const m = makeMusic({ key: k, scale: s, oct: o });
    for (let off = -14; off <= 14; off++) if (midiForOffset(m, off) - baseMidi(m) - centeredKey(m.key) !== snapOffset(m, off)) return false;
  }
  return true;
})());

console.log('\n[music] the press-time triads (play.ts:316-323)');
ok('C major, A = C E G', eq(triadForOffset(C, 0), [60, 64, 67]));
ok('C major, S = D F A (ii)', eq(triadForOffset(C, 2), [62, 65, 69]));
ok('C major, J = B D F (vii°)', eq(triadForOffset(C, 11), [71, 74, 77]));
ok('C major, W (colour) = C♯ major (C♯ F G♯), NOT the snapped C', eq(triadForOffset(C, 1, true), [61, 65, 68]));
ok('A minor, A = A C E', eq(triadForOffset(AMIN, 0), [57, 60, 64]));
ok('A minor, W (colour A♯) = B♭ major, NOT Am', eq(triadForOffset(AMIN, 1, true), [58, 62, 65]));
ok('FREE: a major triad on any letter', eq(triadForOffset(FREE, 2), [62, 66, 69]) && eq(triadForOffset(FREE, 1, true), [61, 65, 68]));
ok('triadForMidi agrees with triadForOffset for every letter (12 keys × 3 scales × 3 octaves)', (() => {
  for (let k = 0; k < 12; k++) for (const s of ['major', 'minor', 'chrom']) for (let o = -1; o <= 1; o++) {
    const m = makeMusic({ key: k, scale: s, oct: o });
    for (const c of [...WHITES, ...BLACKS]) {
      const a = KEYMAP[c];
      if (!eq(triadForMidi(m, midiForOffset(m, a.offset, a.colour)), triadForOffset(m, a.offset, a.colour))) return false;
    }
  }
  return true;
})());
ok('triadForMidi: an off-key stage note gets a major triad on ITSELF', eq(triadForMidi(C, 66), [66, 70, 73]));

console.log('\n[music] MOVE (stepMidi) and the KEY summary');
ok('C major: C +1 = D, B +1 = C, C −1 = B', stepMidi(C, 60, 1) === 62 && stepMidi(C, 71, 1) === 72 && stepMidi(C, 60, -1) === 59);
ok('octave-invariant: C3 +2 = E3', stepMidi(C, 48, 2) === 52);
ok('an off-key note snaps down first (C♯ +1 = D)', stepMidi(C, 61, 1) === 62);
ok('FREE: MOVE is semitones', stepMidi(FREE, 60, 2) === 62);
ok('0 steps is identity (even off-key)', stepMidi(C, 61, 0) === 61);
ok('keySummary: C MAJ · A MIN · FREE', keySummary(C) === 'C MAJ' && keySummary(AMIN) === 'A MIN' && keySummary(FREE) === 'FREE');

console.log(`\n[music] ${pass} passed, ${fail} failed`);
console.log(`music: ${pass}/${pass + fail}`);
if (fail) process.exit(1);
