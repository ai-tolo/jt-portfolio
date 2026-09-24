// from signal-studio-v6lib/src/engine/chord-name.test.mjs:1-129 (2a9e4a7) — the checks VERBATIM (SIGNAL R1, lane H). Edits: this banner, and
// the summary also prints `chord-name: N/N` (NOTES-SIGNAL-R1 §0).
// Run: source ~/.nvm/nvm.sh && node src/signal/chord-name.test.mjs
// The naming law (pure leaf). Node type-strips the .ts import.
//   node src/engine/chord-name.test.mjs
import { nameChord } from './chord-name.ts';

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${extra}`); }
}
const CMAJ = { keyRoot: 0, scaleMode: 'major' };
const AMIN = { keyRoot: 9, scaleMode: 'minor' };
const DMAJ = { keyRoot: 2, scaleMode: 'major' };
const DbMAJ = { keyRoot: 1, scaleMode: 'major' };
const CHROM = { keyRoot: 0, scaleMode: 'chrom' };
// MIDI helper: C4=60
const eq = (r, label) => r.label === label;

console.log('\n[chord-name] triad qualities (root position, C major)');
ok('maj → C', eq(nameChord([60, 64, 67], CMAJ), 'C'), JSON.stringify(nameChord([60, 64, 67], CMAJ)));
ok('min → Cm (key C minor)', eq(nameChord([60, 63, 67], { keyRoot: 0, scaleMode: 'minor' }), 'Cm'), nameChord([60, 63, 67], { keyRoot: 0, scaleMode: 'minor' }).label);
ok('dim → B° (Bdim, C major)', eq(nameChord([59, 62, 65], CMAJ), 'B°'), nameChord([59, 62, 65], CMAJ).label);
ok('aug → C+', eq(nameChord([60, 64, 68], CMAJ), 'C+'), nameChord([60, 64, 68], CMAJ).label);
ok('sus2 → Csus2', eq(nameChord([60, 62, 67], CMAJ), 'Csus2'), nameChord([60, 62, 67], CMAJ).label);
ok('sus4 → Csus4', eq(nameChord([60, 65, 67], CMAJ), 'Csus4'), nameChord([60, 65, 67], CMAJ).label);
ok('5 power → C5', eq(nameChord([60, 67], CMAJ), 'C5'), nameChord([60, 67], CMAJ).label);
ok('power quality tag is "5"', nameChord([60, 67], CMAJ).quality === '5');

console.log('\n[chord-name] four/five-note qualities');
ok('6 → C6', eq(nameChord([60, 64, 67, 69], CMAJ), 'C6'), nameChord([60, 64, 67, 69], CMAJ).label);
ok('m6 → Cm6', eq(nameChord([60, 63, 67, 69], CMAJ), 'Cm6'), nameChord([60, 63, 67, 69], CMAJ).label);
ok('dom7 → C7', eq(nameChord([60, 64, 67, 70], CMAJ), 'C7'), nameChord([60, 64, 67, 70], CMAJ).label);
ok('maj7 → Cmaj7', eq(nameChord([60, 64, 67, 71], CMAJ), 'Cmaj7'), nameChord([60, 64, 67, 71], CMAJ).label);
ok('m7 → Cm7 (key C minor)', eq(nameChord([60, 63, 67, 70], { keyRoot: 0, scaleMode: 'minor' }), 'Cm7'), nameChord([60, 63, 67, 70], { keyRoot: 0, scaleMode: 'minor' }).label);
ok('m7♭5 → Bm7♭5', eq(nameChord([59, 62, 65, 69], CMAJ), 'Bm7♭5'), nameChord([59, 62, 65, 69], CMAJ).label);
ok('dim7 → C°7', eq(nameChord([60, 63, 66, 69], CMAJ), 'C°7'), nameChord([60, 63, 66, 69], CMAJ).label);
ok('add9 → Cadd9', eq(nameChord([60, 62, 64, 67], CMAJ), 'Cadd9'), nameChord([60, 62, 64, 67], CMAJ).label);
ok('m(add9) → Cm(add9)', eq(nameChord([60, 62, 63, 67], CMAJ), 'Cm(add9)'), nameChord([60, 62, 63, 67], CMAJ).label);
ok('9 → C9', eq(nameChord([60, 62, 64, 67, 70], CMAJ), 'C9'), nameChord([60, 62, 64, 67, 70], CMAJ).label);
ok('m9 → Cm9', eq(nameChord([60, 62, 63, 67, 70], CMAJ), 'Cm9'), nameChord([60, 62, 63, 67, 70], CMAJ).label);

console.log('\n[chord-name] the bass decides inversions (slash labels)');
ok('C/E first inversion', eq(nameChord([64, 67, 72], CMAJ), 'C/E'), nameChord([64, 67, 72], CMAJ).label);
ok('C/G second inversion', eq(nameChord([67, 72, 76], CMAJ), 'C/G'), nameChord([67, 72, 76], CMAJ).label);
ok('G/B (the doc example)', eq(nameChord([59, 62, 67], CMAJ), 'G/B'), nameChord([59, 62, 67], CMAJ).label);
ok('inversion keeps the root (C/E root=C)', nameChord([64, 67, 72], CMAJ).root === 0);
ok('inversion keeps the degree (C/E is still I)', nameChord([64, 67, 72], CMAJ).degree === 'I');
ok('bassPc reports the low note (C/E bass=E)', nameChord([64, 67, 72], CMAJ).bassPc === 4);
ok('root-position triad has no slash', nameChord([60, 64, 67], CMAJ).label.indexOf('/') < 0);

console.log('\n[chord-name] the C6 / Am7 tie resolves by KEY (both ways, identical MIDI)');
const tie = [57, 60, 64, 67]; // A3 C4 E4 G4 — bass A
ok('C major → reads as C (C6/A)', nameChord(tie, CMAJ).root === 0, JSON.stringify(nameChord(tie, CMAJ)));
ok('C major label C6/A', eq(nameChord(tie, CMAJ), 'C6/A'), nameChord(tie, CMAJ).label);
ok('A minor → reads as A (Am7)', nameChord(tie, AMIN).root === 9, JSON.stringify(nameChord(tie, AMIN)));
ok('A minor label Am7', eq(nameChord(tie, AMIN), 'Am7'), nameChord(tie, AMIN).label);
ok('C6 root position (bass C) → C6', eq(nameChord([60, 64, 67, 69], CMAJ), 'C6'), nameChord([60, 64, 67, 69], CMAJ).label);
ok('Am7 root position (bass A, spread voicing) → Am7', eq(nameChord([57, 67, 72, 76], AMIN), 'Am7'), nameChord([57, 67, 72, 76], AMIN).label);

console.log('\n[chord-name] the key spells accidentals (both directions)');
ok('D major names F♯ (F♯m = iii)', eq(nameChord([66, 69, 73], DMAJ), 'F♯m'), nameChord([66, 69, 73], DMAJ).label);
ok('D♭ major names G♭ (G♭ = IV)', eq(nameChord([66, 70, 73], DbMAJ), 'G♭'), nameChord([66, 70, 73], DbMAJ).label);
ok('sharp key: A major names C♯m', eq(nameChord([61, 64, 68], { keyRoot: 9, scaleMode: 'major' }), 'C♯m'), nameChord([61, 64, 68], { keyRoot: 9, scaleMode: 'major' }).label);
ok('flat key: E♭ major names A♭', eq(nameChord([68, 72, 75], { keyRoot: 3, scaleMode: 'major' }), 'A♭'), nameChord([68, 72, 75], { keyRoot: 3, scaleMode: 'major' }).label);

console.log('\n[chord-name] degrees — roman when diatonic, null off-map');
ok('Am in C major → vi', nameChord([57, 60, 64], CMAJ).degree === 'vi', nameChord([57, 60, 64], CMAJ).degree);
ok('G7 in C major → V7', nameChord([55, 59, 62, 65], CMAJ).degree === 'V7', nameChord([55, 59, 62, 65], CMAJ).degree);
ok('Bdim in A minor → ii°', nameChord([59, 62, 65], AMIN).degree === 'ii°', nameChord([59, 62, 65], AMIN).degree);
ok('C in C major → I', nameChord([60, 64, 67], CMAJ).degree === 'I');
ok('Dm in C major → ii', nameChord([62, 65, 69], CMAJ).degree === 'ii', nameChord([62, 65, 69], CMAJ).degree);
ok('Cmaj7 in C major → Imaj7', nameChord([60, 64, 67, 71], CMAJ).degree === 'Imaj7', nameChord([60, 64, 67, 71], CMAJ).degree);
ok('off-key D major in C major → degree null', nameChord([62, 66, 69], CMAJ).degree === null, String(nameChord([62, 66, 69], CMAJ).degree));
ok('off-key chord still names the chord (D)', eq(nameChord([62, 66, 69], CMAJ), 'D'));
ok('dim7 not diatonic in major → degree null', nameChord([60, 63, 66, 69], CMAJ).degree === null);

console.log('\n[chord-name] degenerate sets are honest');
ok('empty set → empty label, null root', (() => { const r = nameChord([], CMAJ); return r.label === '' && r.root === null && r.bassPc === null && r.degree === null; })());
ok('one note → the note name (E)', eq(nameChord([64], CMAJ), 'E') && nameChord([64], CMAJ).quality === 'note');
ok('one note degree is null', nameChord([64], CMAJ).degree === null);
ok('dyad m3 → C+m3 (the doc example)', eq(nameChord([60, 63], CMAJ), 'C+m3'), nameChord([60, 63], CMAJ).label);
ok('dyad M3 → C+M3', eq(nameChord([60, 64], CMAJ), 'C+M3'), nameChord([60, 64], CMAJ).label);
ok('dyad names from the bass up (E+m6 for E3/C4)', eq(nameChord([64, 72], CMAJ), 'E+m6'), nameChord([64, 72], CMAJ).label);
ok('dyad quality tag is "dyad"', nameChord([60, 64], CMAJ).quality === 'dyad');
ok('dyad degree is null', nameChord([60, 63], CMAJ).degree === null);
ok('cluster {C,C♯,D} → C· (dim dot)', eq(nameChord([60, 61, 62], CMAJ), 'C·'), nameChord([60, 61, 62], CMAJ).label);
ok('cluster quality tag is "cluster"', nameChord([60, 61, 62], CMAJ).quality === 'cluster');
ok('cluster degree is null', nameChord([60, 61, 62], CMAJ).degree === null);

console.log('\n[chord-name] beyond the table → nearest STEM, never a fabricated name');
const cmaj9 = nameChord([60, 64, 67, 71, 74], CMAJ); // Cmaj9 — not in the v1 table
ok('Cmaj9 → the maj stem "C"', cmaj9.label === 'C', cmaj9.label);
ok('stem quality is "maj"', cmaj9.quality === 'maj');
ok('stem keeps a diatonic degree (I)', cmaj9.degree === 'I');

console.log('\n[chord-name] chrom — deterministic fifths-nearest spelling, no degrees');
ok('chrom D♭ major triad → D♭', eq(nameChord([61, 65, 68], CHROM), 'D♭'), nameChord([61, 65, 68], CHROM).label);
ok('chrom E major triad → E', eq(nameChord([64, 68, 71], CHROM), 'E'), nameChord([64, 68, 71], CHROM).label);
ok('chrom A♭ spelled flat (not G♯)', eq(nameChord([68, 72, 75], CHROM), 'A♭'), nameChord([68, 72, 75], CHROM).label);
ok('chrom prefers the bass root (Am7 not C6)', eq(nameChord(tie, CHROM), 'Am7'), nameChord(tie, CHROM).label);
ok('chrom degree always null', nameChord([64, 68, 71], CHROM).degree === null);

console.log('\n[chord-name] F3 — added-sixth degree is a plain roman (no figured-bass "I6")');
ok('C6 in C major → degree I (not I6)', nameChord([60, 64, 67, 69], CMAJ).degree === 'I', String(nameChord([60, 64, 67, 69], CMAJ).degree));
ok('Dm6 in C major → degree ii (not ii6)', nameChord([62, 65, 69, 71], CMAJ).degree === 'ii', String(nameChord([62, 65, 69, 71], CMAJ).degree));
ok('the C6 label still carries the 6', eq(nameChord([60, 64, 67, 69], CMAJ), 'C6'));

console.log('\n[chord-name] F4 — inner tones spell relative to the ROOT (cross-key slashes)');
const FMAJ = { keyRoot: 5, scaleMode: 'major' }; // flat key
const GMAJ = { keyRoot: 7, scaleMode: 'major' }; // sharp key
ok('A/C♯ in a FLAT key: third stays C♯, not D♭', eq(nameChord([61, 64, 69], FMAJ), 'A/C♯'), nameChord([61, 64, 69], FMAJ).label);
ok('F7/E♭ in a SHARP key: ♭7 stays E♭, not D♯', eq(nameChord([63, 65, 69, 72], GMAJ), 'F7/E♭'), nameChord([63, 65, 69, 72], GMAJ).label);
ok('sharp-key slash unaffected: G/B (still B)', eq(nameChord([59, 62, 67], CMAJ), 'G/B'));
ok('flat-key root spelling still follows ctx (G♭ in D♭ major)', eq(nameChord([66, 70, 73], DbMAJ), 'G♭'));

console.log('\n[chord-name] F6 — a bare 4th is a dyad, not an inverted power chord');
ok('P4 dyad {C,F} → C+P4 (not F5/C)', eq(nameChord([60, 65], CMAJ), 'C+P4'), nameChord([60, 65], CMAJ).label);
ok('P4 dyad quality tag is dyad', nameChord([60, 65], CMAJ).quality === 'dyad');
ok('fifth-in-bass {G,C} → G+P4 dyad (not C5/G)', eq(nameChord([55, 60], CMAJ), 'G+P4'), nameChord([55, 60], CMAJ).label);
ok('P5 power still reads root-position → C5', eq(nameChord([60, 67], CMAJ), 'C5'));
ok('power with octave doubling {C,G,C} → C5', eq(nameChord([48, 55, 60], CMAJ), 'C5'), nameChord([48, 55, 60], CMAJ).label);
ok('P8 octave collapses to the note C (no P8 dyad)', eq(nameChord([60, 72], CMAJ), 'C') && nameChord([60, 72], CMAJ).quality === 'note');

console.log('\n[chord-name] determinism + octave/order invariance');
ok('same input → same output', JSON.stringify(nameChord([60, 64, 67], CMAJ)) === JSON.stringify(nameChord([60, 64, 67], CMAJ)));
ok('note order irrelevant (except bass)', eq(nameChord([67, 60, 64], CMAJ), 'C'));
ok('doubled octaves collapse', eq(nameChord([60, 64, 67, 72, 76], CMAJ), 'C'));

console.log(`\n[chord-name] ${pass} passed, ${fail} failed`);
console.log(`chord-name: ${pass}/${pass + fail}`);
if (fail) process.exit(1);
