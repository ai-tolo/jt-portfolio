// from signal-studio-v6lib/src/engine/chord-edit.test.mjs:1-111 (2a9e4a7) — the checks VERBATIM (SIGNAL R1, lane H). Edits: this banner, and
// the summary also prints `chord-edit: N/N` (NOTES-SIGNAL-R1 §0).
// Run: source ~/.nvm/nvm.sh && node src/signal/chord-edit.test.mjs
// Chord edit transforms (pure leaf). Node type-strips the .ts import.
//   node src/engine/chord-edit.test.mjs
import { voiceUp, voiceDown, recolor, reext, stepDiatonic,
  voiceLed, stackFrom, motionCost } from './chord-edit.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('\n[chord-edit] VOICE walk — reversible octave rotation');
ok('voiceUp lifts the lowest an octave', eq(voiceUp([60, 64, 67]), [64, 67, 72]), JSON.stringify(voiceUp([60, 64, 67])));
ok('voiceDown drops the highest an octave', eq(voiceDown([60, 64, 67]), [55, 60, 64]), JSON.stringify(voiceDown([60, 64, 67])));
ok('voiceDown∘voiceUp = identity (triad)', eq(voiceDown(voiceUp([60, 64, 67])), [60, 64, 67]));
ok('voiceUp∘voiceDown = identity (triad)', eq(voiceUp(voiceDown([60, 64, 67])), [60, 64, 67]));
ok('reversible for a 7th chord', eq(voiceDown(voiceUp([60, 64, 67, 70])), [60, 64, 67, 70]));
ok('reversible for a spread voicing', eq(voiceUp(voiceDown([55, 60, 64])), [55, 60, 64]));
ok('walk up 3 then down 3 = identity', eq(voiceDown(voiceDown(voiceDown(voiceUp(voiceUp(voiceUp([60, 64, 67])))))), [60, 64, 67]));

console.log('\n[chord-edit] COLOR — minimal-motion on the third axis');
ok('maj → min moves ONLY the third, by one semitone', eq(recolor([60, 64, 67], 'min'), [60, 63, 67]), JSON.stringify(recolor([60, 64, 67], 'min')));
ok('maj → sus4', eq(recolor([60, 64, 67], 'sus4'), [60, 65, 67]));
ok('maj → sus2', eq(recolor([60, 64, 67], 'sus2'), [60, 62, 67]));
ok('maj → dim (third AND fifth move)', eq(recolor([60, 64, 67], 'dim'), [60, 63, 66]));
ok('min → maj reverses', eq(recolor([60, 63, 67], 'maj'), [60, 64, 67]));
ok('recolor preserves register (root + fifth octaves untouched)', eq(recolor([48, 64, 67], 'min'), [48, 63, 67]));
ok('recolor a bare power chord (no third) is a no-op on the third', eq(recolor([60, 67], 'min'), [60, 67]));

console.log('\n[chord-edit] EXT — seventh/sixth axis, minimal-motion');
ok('none → 7 adds a ♭7 on top', eq(reext([60, 64, 67], '7'), [60, 64, 67, 70]), JSON.stringify(reext([60, 64, 67], '7')));
ok('7 → maj7 moves the seventh up one semitone', eq(reext([60, 64, 67, 70], 'maj7'), [60, 64, 67, 71]));
ok('maj7 → none removes the seventh', eq(reext([60, 64, 67, 71], 'none'), [60, 64, 67]));
ok('none → 6 adds a sixth', eq(reext([60, 64, 67], '6'), [60, 64, 67, 69]));
ok('none → 9 adds ♭7 + the 9th above', eq(reext([60, 64, 67], '9'), [60, 64, 67, 70, 74]), JSON.stringify(reext([60, 64, 67], '9')));

console.log('\n[chord-edit] COLOR + EXT compose (Orchid grammar)');
ok('min + 7 = m7 ([0,3,7,10])', eq(reext(recolor([60, 64, 67], 'min'), '7'), [60, 63, 67, 70]));
ok('maj + maj7 = maj7 ([0,4,7,11])', eq(reext(recolor([60, 64, 67], 'maj'), 'maj7'), [60, 64, 67, 71]));
ok('order-independent for third vs seventh', eq(recolor(reext([60, 64, 67], '7'), 'min'), reext(recolor([60, 64, 67], 'min'), '7')));

console.log('\n[chord-edit] R2c stepDiatonic — walk the whole chord through the key');
{
  const C = [60, 64, 67]; // C major triad in C major
  ok('C → ii (Dm) one degree up', eq(stepDiatonic(C, 0, 'major', 1), [62, 65, 69]), JSON.stringify(stepDiatonic(C, 0, 'major', 1)));
  ok('C → vii° one degree DOWN (wraps octave correctly)', eq(stepDiatonic(C, 0, 'major', -1), [59, 62, 65]), JSON.stringify(stepDiatonic(C, 0, 'major', -1)));
  ok('two steps up = iii (Em)', eq(stepDiatonic(C, 0, 'major', 2), [64, 67, 71]));
  ok('up then down is identity', eq(stepDiatonic(stepDiatonic(C, 0, 'major', 1), 0, 'major', -1), C));
  ok('7 steps up = the same chord an octave higher', eq(stepDiatonic(C, 0, 'major', 7), C.map((n) => n + 12)));
  ok('preserves voice count + spread (no collapse)', stepDiatonic([48, 64, 67, 72], 0, 'major', 1).length === 4);
  ok('spread is preserved within a semitone or two', (() => { const a = [48, 64, 67, 72], b = stepDiatonic(a, 0, 'major', 1); return Math.abs((b[3] - b[0]) - (a[3] - a[0])) <= 2; })());
  ok('works in another key (G major: G→Am)', eq(stepDiatonic([67, 71, 74], 7, 'major', 1), [69, 72, 76]), JSON.stringify(stepDiatonic([67, 71, 74], 7, 'major', 1)));
  ok('minor key: Am → Bdim', eq(stepDiatonic([57, 60, 64], 9, 'minor', 1), [59, 62, 65]), JSON.stringify(stepDiatonic([57, 60, 64], 9, 'minor', 1)));
  ok('chrom = a plain semitone shift', eq(stepDiatonic(C, 0, 'chrom', 1), [61, 65, 68]));
  ok('off-scale notes snap to a scale tone', stepDiatonic([61], 0, 'major', 1).length === 1);
  ok('dir 0 / empty are inert', eq(stepDiatonic(C, 0, 'major', 0), C) && eq(stepDiatonic([], 0, 'major', 1), []));
}

console.log('\n[chord-edit] determinism (no RNG / no Date)');
ok('same input → same output', eq(recolor([60, 64, 67], 'dim'), recolor([60, 64, 67], 'dim')));
ok('empty voicing is inert', eq(voiceUp([]), []) && eq(recolor([], 'min'), []) && eq(reext([], '7'), []));

// ── R13b — VOICE-LED PLACEMENT ──────────────────────────────────────────────────────────────────
const pcsOf = v => [...new Set(v.map(n => ((n % 12) + 12) % 12))].sort((a, b) => a - b);
const asc = v => v.every((n, i) => i === 0 || n > v[i - 1]);

console.log('\n[chord-edit] R13b — stackFrom / motionCost');
ok('stackFrom builds an ascending voicing', asc(stackFrom(60, [0, 4, 7])) && JSON.stringify(stackFrom(60, [0, 4, 7])) === '[60,64,67]');
ok('stackFrom off a non-root bass gives the inversion', JSON.stringify(stackFrom(64, [0, 4, 7])) === '[64,67,72]', JSON.stringify(stackFrom(64, [0, 4, 7])));
ok('stackFrom never repeats a pitch class', new Set(stackFrom(55, [0, 4, 7]).map(n => n % 12)).size === 3);
ok('motionCost is 0 for identical voicings', motionCost([60, 64, 67], [60, 64, 67]) === 0);
ok('motionCost grows with distance', motionCost([60, 64, 67], [61, 65, 68]) < motionCost([60, 64, 67], [72, 76, 79]));
ok('motionCost is symmetric', motionCost([60, 64, 67], [59, 62, 67]) === motionCost([59, 62, 67], [60, 64, 67]));
ok('a collapsed cluster cannot score zero (the symmetric half earns its keep)', motionCost([60, 64, 67], [60, 61, 62]) > 0);

console.log('\n[chord-edit] R13b — voiceLed picks the smoothest inversion');
{
  const from = [60, 64, 67];                       // C major, root position
  const am = voiceLed([9, 0, 4], from, 60);        // A minor
  ok('A minor after C keeps two common tones in place', JSON.stringify(am) === '[64,69,72]' || motionCost(from, am) <= 4, JSON.stringify(am));
  ok('…and it is a TRUE inversion of the chord asked for', JSON.stringify(pcsOf(am)) === '[0,4,9]', JSON.stringify(pcsOf(am)));
  ok('…and it is a real ascending voicing', asc(am));
  const f = voiceLed([5, 9, 0], from, 60);
  ok('F after C moves less than root-position F would', motionCost(from, f) <= motionCost(from, [65, 69, 72]), motionCost(from, f) + ' vs ' + motionCost(from, [65, 69, 72]));
  ok('…still a true F triad', JSON.stringify(pcsOf(f)) === '[0,5,9]', JSON.stringify(pcsOf(f)));
}
{
  // the load-bearing claim: nothing else beats what voiceLed returned
  const from = [60, 64, 67];
  for (const pcs of [[9, 0, 4], [5, 9, 0], [7, 11, 2], [2, 5, 9], [4, 8, 11], [1, 5, 8]]) {
    const got = voiceLed(pcs, from, 60);
    let bestAlt = Infinity;
    for (const bass of [...Array(49).keys()].map(i => i + 36)) {
      if (!pcs.map(pc => ((pc % 12) + 12) % 12).includes(((bass % 12) + 12) % 12)) continue;
      bestAlt = Math.min(bestAlt, motionCost(from, stackFrom(bass, pcs)));
    }
    ok(`[${pcs}] — no alternative voicing moves less`, motionCost(from, got) <= bestAlt + 1e-9,
      motionCost(from, got) + ' vs best ' + bestAlt);
  }
}
ok('deterministic: same inputs → identical voicing', JSON.stringify(voiceLed([9, 0, 4], [60, 64, 67], 60)) === JSON.stringify(voiceLed([9, 0, 4], [60, 64, 67], 60)));
ok('every output is a true inversion of the chord asked for',
  [[0, 4, 7], [9, 0, 4], [6, 10, 1], [2, 5, 9]].every(pcs => JSON.stringify(pcsOf(voiceLed(pcs, [60, 64, 67], 60))) === JSON.stringify([...pcs].map(x => x % 12).sort((a, b) => a - b))));
ok('no reference → the chord lands near the given centre, not in the mud',
  (() => { const v = voiceLed([0, 4, 7], [], 60); return v[0] >= 48 && v[0] <= 72; })(), JSON.stringify(voiceLed([0, 4, 7], [], 60)));
ok('a LOW reference is followed down (register tracks the progression)',
  voiceLed([5, 9, 0], [48, 52, 55], 60)[0] < voiceLed([5, 9, 0], [72, 76, 79], 60)[0]);
ok('a four-note reference still resolves', voiceLed([9, 0, 4], [60, 64, 67, 71], 60).length === 3);
ok('an empty chord returns nothing', voiceLed([], [60, 64, 67], 60).length === 0);
ok('output never escapes a playable range', [[0,4,7],[6,10,1]].every(pcs => { const v = voiceLed(pcs, [88, 92, 95], 60); return v[v.length - 1] <= 96; }));

console.log(`\n[chord-edit] ${pass} passed, ${fail} failed`);
console.log(`chord-edit: ${pass}/${pass + fail}`);
if (fail) process.exit(1);
