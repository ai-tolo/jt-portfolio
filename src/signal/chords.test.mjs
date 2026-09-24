// chords.ts (SIGNAL R1, lane H): the DOM-free chord rack — stamp / play / clear / the mono latch / the bass pin — driven
// through the real latch/arp machine (arp.ts) with recording fakes for the keys and the bass.
// Sources: signal-studio-v6lib/src/views/instrument/chord-rack.ts:94-268, chord-rack-store.ts:78-92 (2a9e4a7).
// Run: source ~/.nvm/nvm.sh && node src/signal/chords.test.mjs
import { createChords, normalizeRack, RACK_SIZE } from './chords.ts';
import { createArp } from './arp.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const js = (a) => JSON.stringify(a);

function rig(o = {}) {
  const log = [];
  const keys = {
    noteOn: (id, midi, vel) => log.push(['on', id, midi, vel]), noteOff: (id) => log.push(['off', id]),
    hit: () => {}, bend: () => {}, allOff: () => log.push(['allOff']), retune: () => {},
  };
  const bs = { root: o.root ?? null, armed: !!o.armed };
  const bass = {
    state: () => ({ ...bs }),
    set: (k, v) => { log.push(['bset', k, v]); if (k === 'root') { bs.root = v; if (v != null) bs.armed = false; } if (k === 'armed') bs.armed = v; },
    gesture: () => {}, held: () => {},
  };
  const time = { grid: () => ({ sr: 48000, barFrames: 96000, originFrame: 0 }), nextLine: (p, f = 960) => ({ frame: f, bar: 0, i: 0, perBar: p }) };
  const params = { div: '1/8', length: 0.5, groove: 0, chord: false, gateDiv: '1/16', gateSwing: 0, diveSpeed: 0.45, diveDist: 24 };
  const arp = createArp({ keys, bass, effects: { chop() {}, releaseGate() {} }, time, ctx: { currentTime: 0 }, params: () => params });
  const music = { keyRoot: 0, scaleMode: 'major' };
  const chords = createChords({
    noteOn: (id, midi, vel) => arp.noteOn(id, midi, [midi], vel),
    noteOff: (id) => arp.noteOff(id),
    release: (id) => arp.release(id),
    sounding: () => arp.sounding(),
    latch: () => arp.latch(),
    ctx: () => ({ ...music }),
    bass,
    onCapture: () => arp.flushLatch(),
  }, o.rack);
  const of = (k) => log.filter((e) => e[0] === k);
  const clear = () => { log.length = 0; };
  const hold = (...notes) => notes.forEach((m) => arp.noteOn('p' + m, m, [m]));
  const lift = (...notes) => notes.forEach((m) => arp.noteOff('p' + m));
  return { chords, arp, log, of, clear, bs, music, hold, lift };
}
const R = (pads) => { const r = new Array(8).fill(null); pads.forEach((p, i) => { r[i] = p; }); return r; };

console.log('\n[chords] STAMP what sounds onto an empty pad (chord-rack.ts:168-185, 207-230)');
{
  const r = rig();
  r.chords.trigger(0);
  ok('an empty pad with nothing sounding does nothing (the Studio\'s key wheel is cut)', js(r.chords.rack()) === js(R([])) && r.log.length === 0);
  r.hold(67, 60, 64);
  r.chords.trigger(0);
  ok('empty + sounding → the pad takes the sounding notes, sorted', js(r.chords.rack()[0]) === js([60, 64, 67]));
  r.arp.noteOn('kA', 60, [60]);
  r.chords.trigger(1);
  ok('octave-doubled / duplicate notes collapse to one', js(r.chords.rack()[1]) === js([60, 64, 67]), js(r.chords.rack()[1]));
  r.lift(67, 60, 64); r.arp.noteOff('kA');
}
{
  const r = rig();
  r.arp.setLatch(true);
  r.hold(60, 64, 67); r.lift(64, 67);   // 60 still under a finger; 64 67 latched
  r.clear(); r.chords.trigger(0);
  ok('under HOLD a stamp CONSUMES what it captured: the latched notes go, the finger\'s note stays (R12.1)',
    js(r.chords.rack()[0]) === js([60, 64, 67]) && js(r.arp.sounding()) === js([['p60', 60]]) && js(r.of('off')) === js([['off', 'p64'], ['off', 'p67']]), js(r.log));
}

console.log('\n[chords] PLAY: ids c<pad>.<i>, vel .9, gated until release (chord-rack.ts:94-97, 141-165)');
{
  const r = rig({ rack: R([[60, 64, 67]]) });
  r.chords.trigger(0);
  ok('an occupied pad plays its notes as c0.0 c0.1 c0.2 at vel .9', js(r.of('on')) === js([['on', 'c0.0', 60, 0.9], ['on', 'c0.1', 64, 0.9], ['on', 'c0.2', 67, 0.9]]));
  ok('playing never writes a pad (FROZEN)', js(r.chords.rack()[0]) === js([60, 64, 67]));
  r.clear(); r.chords.release(0);
  ok('without HOLD it is gated: release lets go of every tone', js(r.of('off')) === js([['off', 'c0.0'], ['off', 'c0.1'], ['off', 'c0.2']]) && r.arp.sounding().length === 0);
  r.clear(); r.chords.release(0); r.chords.release(5);
  ok('releasing a pad that is not down does nothing', r.log.length === 0);
  r.hold(72, 76);
  r.chords.trigger(0);
  ok('an OCCUPIED pad plays even while something sounds (only an empty pad stamps)', js(r.chords.rack()[0]) === js([60, 64, 67]) && r.arp.sounding().some(([id]) => id === 'c0.0'));
}

console.log('\n[chords] HOLD = chord-MONO: the previous pad released, the same pad re-struck (chord-rack.ts:148-152)');
{
  const r = rig({ rack: R([[60, 64, 67], [62, 65, 69]]) });
  r.arp.setLatch(true);
  r.chords.trigger(0); r.chords.release(0);
  ok('HOLD: a released pad keeps ringing', js(r.arp.sounding().map((e) => e[0])) === js(['c0.0', 'c0.1', 'c0.2']));
  r.clear(); r.chords.trigger(1);
  ok('the next pad takes over: pad 0 released, pad 1 sounds', js(r.of('off').map((e) => e[1])) === js(['c0.0', 'c0.1', 'c0.2']) && js(r.arp.sounding().map((e) => e[0])) === js(['c1.0', 'c1.1', 'c1.2']));
  r.chords.release(1);
  r.clear(); r.chords.trigger(1);
  ok('the same pad again is RE-STRUCK (off then on), never toggled silent', js(r.log.map((e) => e[0] + ':' + e[1])) === js(['off:c1.0', 'off:c1.1', 'off:c1.2', 'on:c1.0', 'on:c1.1', 'on:c1.2']) && r.arp.sounding().length === 3, js(r.log));
}
{
  const r = rig({ rack: R([[60, 64, 67]]) });
  r.arp.setArp(true); r.arp.setLatch(true);
  r.chords.trigger(0); r.chords.release(0);
  r.chords.trigger(0);
  ok('ARP + HOLD: a re-struck pad stays in the pool (the core\'s toggle would have emptied it)', r.arp.sounding().length === 3);
}

console.log('\n[chords] ⇧ CLEARS (chord-rack.ts:197-204, 219-224)');
{
  const r = rig({ rack: R([[60, 64, 67], [62, 65, 69]]) });
  r.arp.setLatch(true);
  r.chords.trigger(1);
  r.clear(); r.chords.trigger(1, true);
  ok('⇧ on an occupied pad clears it, and a ringing latched pad stops', r.chords.rack()[1] === null && r.arp.sounding().length === 0 && r.of('off').length === 3);
  r.clear(); r.chords.trigger(3, true);
  ok('⇧ on an empty pad is inert (never a stamp)', r.chords.rack()[3] === null && r.log.length === 0);
  r.hold(50);
  r.chords.trigger(3, true);
  ok('⇧ never stamps even with something sounding', r.chords.rack()[3] === null);
}

console.log('\n[chords] THE BASS PIN: the chord ROOT at or below its lowest note, never over a hand (chord-rack.ts:109-138, B §6)');
{
  const r = rig({ rack: R([[64, 67, 72], [57, 60, 64], [60, 64, 67]]) });
  r.chords.trigger(0);
  ok('C/E (64 67 72) pins the bass to C at or below E4 → 60, not the lowest note E', r.bs.root === 60 && r.chords.pin() === 60);
  r.chords.release(0);
  ok('release (silence) unpins', r.bs.root === null && r.chords.pin() === null && js(r.of('bset').at(-1)) === js(['bset', 'root', null]));
  r.chords.trigger(1);
  ok('Am (57 60 64) → A 57', r.bs.root === 57);
  r.chords.trigger(2);
  ok('a second gated pad: the last one down pins (C 60)', r.bs.root === 60);
  r.chords.release(2);
  ok('…releasing it falls back to the pad still down (A 57)', r.bs.root === 57);
  r.chords.release(1);
  ok('…and the last release unpins', r.bs.root === null);
}
{
  const r = rig({ rack: R([[60, 64, 67]]), root: 43 });
  r.chords.trigger(0); r.chords.release(0);
  ok('a MANUAL pin (the padlock) is never overridden, never unpinned', r.bs.root === 43 && r.of('bset').length === 0);
}
{
  const r = rig({ rack: R([[60, 64, 67]]), armed: true });
  r.chords.trigger(0);
  ok('an ARMED capture: the rack keeps its hands off', r.of('bset').length === 0 && r.bs.armed);
}
{
  const r = rig({ rack: R([[60, 64, 67]]) });
  r.arp.setLatch(true);
  r.chords.trigger(0); r.chords.release(0);
  ok('HOLD: the latched pad keeps the pin after its release', r.bs.root === 60);
  r.arp.setLatch(false); r.chords.sync();
  ok('HOLD off silences it → sync() unpins (silence unpins)', r.bs.root === null && r.arp.sounding().length === 0);
}
{
  const r = rig({ rack: R([[57, 60, 64, 67]]) });
  r.chords.trigger(0);
  ok('C6/A in C major: the KEY names it C → the pin is C at or below A3 (48)', r.bs.root === 48);
  r.music.keyRoot = 9; r.music.scaleMode = 'minor'; r.chords.sync();
  ok('travel to A minor: the same notes read Am7 → re-pinned to A (57)', r.bs.root === 57);
}

console.log('\n[chords] the face, the lean, load, releaseAll');
{
  const r = rig({ rack: R([[60, 64, 67], [55, 59, 62], [62, 65, 69], [61, 65, 68]]) });
  ok('a face names against the live key: C / I', js([r.chords.face(0).label, r.chords.face(0).degree]) === js(['C', 'I']));
  ok('an off-key chord keeps its name and has no degree (C♯, null: dark is the only off-map signal)', r.chords.face(3).label === 'C♯' && r.chords.face(3).degree === null, js(r.chords.face(3)));
  ok('an empty pad has no face', r.chords.face(5) === null);
  r.chords.trigger(0);
  ok('after pad 0 (I): V leans STRONG (1), ii leans moderate (.45), the lit pad none', r.chords.face(1).lean === 1 && r.chords.face(2).lean === 0.45 && r.chords.face(0).lean === 0 && r.chords.face(0).sel && r.chords.face(0).on);
  ok('an off-key pad has no pull (0), never a penalty', r.chords.face(3).lean === 0);
  r.chords.load([[48, 52, 55]]);
  ok('load releases what sounds first, then replaces the rack', r.arp.sounding().length === 0 && js(r.chords.rack()) === js(R([[48, 52, 55]])) && r.chords.lastLit() === -1);
  r.arp.setLatch(true); r.chords.trigger(0);
  r.chords.releaseAll();
  ok('releaseAll: every pad down, the rack\'s pin dropped', r.arp.sounding().length === 0 && r.bs.root === null && r.chords.pin() === null);
}

console.log('\n[chords] normalizeRack (chord-rack-store.ts:78-92)');
ok('junk → eight empty pads', js(normalizeRack('nope')) === js(R([])) && normalizeRack(null).length === RACK_SIZE);
ok('notes become integers 0..127, non-numbers dropped, an empty pad is null', js(normalizeRack([[60.4, 'x', 64, 300], [], [NaN]])) === js(R([[60, 64, 127]])));
ok('a Studio RackPad {notes} is accepted; more than eight pads are cut', js(normalizeRack([{ notes: [60, 64] }, ...new Array(9).fill([1])])) === js([[60, 64], [1], [1], [1], [1], [1], [1], [1]]));
ok('the rack out is a copy (the caller cannot write a pad)', (() => { const r = rig({ rack: R([[60]]) }); const x = r.chords.rack(); x[0].push(99); x[1] = [1]; return js(r.chords.rack()) === js(R([[60]])); })());

console.log(`\n[chords] ${pass} passed, ${fail} failed`);
console.log(`chords: ${pass}/${pass + fail}`);
if (fail) process.exit(1);
