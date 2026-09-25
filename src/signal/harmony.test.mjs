// harmony.ts (SIGNAL R1, lane H): the contract's Harmony composed — the hand (letters, CHORD extensions, stage keys),
// HOLD's tap-again, the bass hearing what sounds, the naming law, MOVE (←/→), the pads through the rack, state/set
// normalisation and the master stop — against recording fakes for keys / bass / effects and a fake lattice.
// Run: source ~/.nvm/nvm.sh && node src/signal/harmony.test.mjs
import { createHarmony, defaultHarmonyState } from './harmony.ts';
import { KEYMAP } from './types.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const js = (a) => JSON.stringify(a);

function rig(o = {}) {
  const log = [];
  const keys = {
    noteOn: (id, midi, vel) => log.push(['on', id, midi, vel]), noteOff: (id) => log.push(['off', id]),
    hit: (m, w, d, v) => log.push(['hit', m, w, d, v]), bend: (...a) => log.push(['bend', ...a]),
    allOff: () => log.push(['allOff']), retune: (map) => log.push(['retune', map]), held: () => [],
  };
  const bs = { root: o.root ?? null, armed: false };
  const bass = {
    held: (n) => log.push(['bheld', n]), gesture: (...a) => log.push(['bgest', ...a]),
    state: () => ({ ...bs }), set: (k, v) => { log.push(['bset', k, v]); if (k === 'root') bs.root = v; },
    ...(o.chop ? { chop: (w, sd) => log.push(['bchop', w, sd]) } : {}),   // lane B's exact chop (the real bass has it)
  };
  const effects = { chop: (w, s) => log.push(['chop', w, s]), releaseGate: () => log.push(['release']) };
  const ctx = { currentTime: 0 };
  const lineFrame = (bar, i, p) => bar * 96000 + Math.round((i * 96000) / p);
  const time = {
    grid: () => ({ sr: 48000, barFrames: 96000, originFrame: 0 }),
    nextLine(p, f = Math.round((ctx.currentTime + 0.02) * 48000)) {   // lane T: default now + 20 ms
      for (let bar = Math.max(0, Math.floor(f / 96000) - 1); ; bar++) for (let i = 0; i < p; i++) { const x = lineFrame(bar, i, p); if (x >= f) return { frame: x, bar, i, perBar: p }; }
    },
  };
  const h = createHarmony({ keys, bass, time, effects, ctx });
  const of = (k) => log.filter((e) => e[0] === k);
  const clear = () => { log.length = 0; };
  const letter = (code) => ['k' + code, h.midiFor(KEYMAP[code].offset, KEYMAP[code].colour)];
  const down = (code) => { const [id, m] = letter(code); h.keyDown(id, m); };
  const up = (code) => h.keyUp('k' + code);
  return { h, log, of, clear, bs, down, up, letter, booking: (bar, step) => ({ frame: lineFrame(bar, step, 16), bar, step }) };
}

console.log('\n[harmony] the hand: letters, CHORD, stage keys (play.ts:292-358)');
{
  const r = rig();
  r.down('KeyA');
  ok('a letter sounds its note at vel .9 (keys.noteOn(\'kKeyA\', 60, .9))', js(r.of('on')) === js([['on', 'kKeyA', 60, 0.9]]));
  r.up('KeyA');
  ok('its keyup releases it', js(r.of('off')) === js([['off', 'kKeyA']]));
  r.h.set('chord', true); r.clear();
  r.down('KeyS');
  ok('CHORD: S adds its diatonic triad as kKeyS~0 / kKeyS~1 (D F A)', js(r.of('on').map((e) => [e[1], e[2]])) === js([['kKeyS', 62], ['kKeyS~0', 65], ['kKeyS~1', 69]]));
  r.h.set('chord', false);
  r.up('KeyS');
  ok('CHORD switched off mid-hold: the keyup still releases the extensions its press started', js(r.of('off').map((e) => e[1])) === js(['kKeyS', 'kKeyS~0', 'kKeyS~1']));
  r.h.set('chord', true); r.clear();
  r.down('KeyW');
  ok('CHORD on a colour cap: a MAJOR triad on its own note (C♯ F G♯), never the snapped C', js(r.of('on').map((e) => e[2])) === js([61, 65, 68]));
  r.up('KeyW'); r.clear();
  r.h.keyDown('p66', 66);
  ok('a stage key (p<midi>) sounds its own pitch and is never chorded', js(r.of('on')) === js([['on', 'p66', 66, 0.9]]));
  r.h.keyUp('p66'); r.clear();
  r.h.keyDown('kKeyD', 64, [64, 67, 71, 74]);
  ok('a caller-given chord is used as given (root first): E G B D', js(r.of('on').map((e) => e[2])) === js([64, 67, 71, 74]));
  r.h.keyUp('kKeyD');
}
{
  const r = rig();
  r.h.set('chord', true); r.h.set('hold', true);
  r.down('KeyA'); r.up('KeyA');
  ok('HOLD + CHORD: the chord rings after the keyup', js(r.h.sounding().map((e) => e[1])) === js([60, 64, 67]));
  r.clear(); r.down('KeyA');
  ok('tap again: the root AND its extensions are released, none restarted', r.h.sounding().length === 0 && js(r.of('off').map((e) => e[1]).sort()) === js(['kKeyA', 'kKeyA~0', 'kKeyA~1']) && r.of('on').length === 0, js(r.log));
  r.up('KeyA');
}

console.log('\n[harmony] HOLD under CHORD: one chord at a time (R3)');
{
  // the note log only (on/off, in order): what keys heard
  const notes = (r) => r.log.filter((e) => e[0] === 'on' || e[0] === 'off').map((e) => (e[0] === 'on' ? ['on', e[1], e[2]] : ['off', e[1]]));
  const snd = (r) => js(r.h.sounding().map((e) => e[0]).sort());
  const ids = (id) => [id, `${id}~0`, `${id}~1`];
  const C = [['on', 'kKeyA', 60], ['on', 'kKeyA~0', 64], ['on', 'kKeyA~1', 67]];
  const F = [['on', 'kKeyF', 65], ['on', 'kKeyF~0', 69], ['on', 'kKeyF~1', 72]];
  const offs = (id) => ids(id).map((x) => ['off', x]);

  // (a) a new chord SWITCHES
  const r = rig();
  r.h.set('hold', true); r.h.set('chord', true); r.clear();
  r.down('KeyA'); r.up('KeyA');
  ok('(a) hold + chord: tap A → the C triad rings, nothing off', js(notes(r)) === js(C) && snd(r) === js(ids('kKeyA').sort()), js(notes(r)));
  r.clear(); r.down('KeyF');
  ok('(a) down F → EXACTLY C\'s three go off, then F\'s three come on', js(notes(r)) === js([...offs('kKeyA'), ...F]), js(notes(r)));
  ok('(a) sounding() = F\'s triad only', js(r.h.sounding().map((e) => e[1])) === js([65, 69, 72]) && snd(r) === js(ids('kKeyF').sort()), js(r.h.sounding()));
  r.clear(); r.up('KeyF');
  ok('(a) up F → nothing off (the hold owns F now)', notes(r).length === 0, js(notes(r)));
  ok('(a) …300 ms later F still rings (nothing happens on time)', js(r.h.sounding().map((e) => e[1])) === js([65, 69, 72]) && r.h.state().hold);

  // (b) tap-again releases it
  r.clear(); r.down('KeyF'); r.up('KeyF');
  ok('(b) tap F again → F\'s three go off, nothing comes on, silence', js(notes(r)) === js(offs('kKeyF')) && r.h.sounding().length === 0, js(notes(r)));
}
{
  // (c) keys a finger holds are the finger's
  const notes = (r) => r.log.filter((e) => e[0] === 'on' || e[0] === 'off').map((e) => (e[0] === 'on' ? ['on', e[1], e[2]] : ['off', e[1]]));
  const r = rig();
  r.h.set('hold', true); r.h.set('chord', true); r.clear();
  r.down('KeyA');
  r.clear(); r.down('KeyD');
  ok('(c) A held by a finger, down D → nothing goes off, D\'s triad (E G B) comes on',
    js(notes(r)) === js([['on', 'kKeyD', 64], ['on', 'kKeyD~0', 67], ['on', 'kKeyD~1', 71]]), js(notes(r)));
  r.clear(); r.up('KeyA'); r.up('KeyD');
  ok('(c) up A, up D → nothing off (the pedal now owns both)', notes(r).length === 0 && r.h.sounding().length === 6, js(notes(r)));
  r.clear(); r.down('KeyG');
  const off = notes(r).filter((e) => e[0] === 'off').map((e) => e[1]).sort();
  ok('(c) down G → A\'s AND D\'s ids go off, then G\'s come on (G B D)',
    js(off) === js(['kKeyA', 'kKeyA~0', 'kKeyA~1', 'kKeyD', 'kKeyD~0', 'kKeyD~1'])
    && js(notes(r).filter((e) => e[0] === 'on')) === js([['on', 'kKeyG', 67], ['on', 'kKeyG~0', 71], ['on', 'kKeyG~1', 74]])
    && notes(r).findIndex((e) => e[0] === 'on') === 6, js(notes(r)));
  ok('(c) sounding() = G\'s triad only', js(r.h.sounding().map((e) => e[1])) === js([67, 71, 74]), js(r.h.sounding()));
  r.up('KeyG');
}
{
  // (d) HOLD without CHORD: the sustain pedal (stacks; tap-again releases only that note)
  const notes = (r) => r.log.filter((e) => e[0] === 'on' || e[0] === 'off').map((e) => (e[0] === 'on' ? ['on', e[1], e[2]] : ['off', e[1]]));
  const r = rig();
  r.h.set('hold', true); r.clear();
  r.down('KeyA'); r.up('KeyA'); r.down('KeyD'); r.up('KeyD');
  ok('(d) hold, chord off: tap A, tap D → both ring, nothing off', js(notes(r)) === js([['on', 'kKeyA', 60], ['on', 'kKeyD', 64]])
    && js(r.h.sounding().map((e) => e[1])) === js([60, 64]), js(notes(r)));
  r.clear(); r.down('KeyA'); r.up('KeyA');
  ok('(d) tap A again → only A goes off; D rings', js(notes(r)) === js([['off', 'kKeyA']]) && js(r.h.sounding().map((e) => e[1])) === js([64]), js(notes(r)));
}
{
  // (e) ARP + HOLD + CHORD: the same law on the pool
  const r = rig();
  r.h.set('hold', true); r.h.set('chord', true); r.h.set('arp', { ...r.h.state().arp, on: true }); r.clear();
  r.down('KeyA'); r.up('KeyA');
  const pool = () => js(r.h.sounding().map((e) => e[0]).sort());
  ok('(e) arp + hold + chord: tap A → the pool holds A\'s ids', pool() === js(['kKeyA', 'kKeyA~0', 'kKeyA~1']), pool());
  r.down('KeyF'); r.up('KeyF');
  ok('(e) tap F → the pool holds F\'s ids only', pool() === js(['kKeyF', 'kKeyF~0', 'kKeyF~1']), pool());
  ok('(e) no keys.noteOn for pool ids (the arp books plucks)', r.of('on').length === 0, js(r.of('on')));
  r.h.book(r.booking(0, 0));
  ok('(e) the next step strums F\'s block (65 69 72), not C\'s', js([...new Set(r.of('hit').map((e) => e[1]))].sort((a, b) => a - b)) === js([65, 69, 72]), js(r.of('hit')));
}
{
  // (f) stage keys under hold + chord: a pedal (never chorded, never switched by another stage key); a letter chord
  // pressed after them releases them (they are the hold's)
  const notes = (r) => r.log.filter((e) => e[0] === 'on' || e[0] === 'off').map((e) => (e[0] === 'on' ? ['on', e[1], e[2]] : ['off', e[1]]));
  const r = rig();
  r.h.set('hold', true); r.h.set('chord', true); r.clear();
  r.h.keyDown('p60', 60); r.h.keyUp('p60'); r.h.keyDown('p62', 62); r.h.keyUp('p62');
  ok('(f) stage keys p60, p62 under hold + chord: both ring, unchorded, nothing off', js(notes(r)) === js([['on', 'p60', 60], ['on', 'p62', 62]])
    && js(r.h.sounding().map((e) => e[0])) === js(['p60', 'p62']), js(notes(r)));
  r.clear(); r.down('KeyF'); r.up('KeyF');
  ok('(f) a letter chord after them releases both stage keys, then F\'s triad rings',
    js(notes(r)) === js([['off', 'p60'], ['off', 'p62'], ['on', 'kKeyF', 65], ['on', 'kKeyF~0', 69], ['on', 'kKeyF~1', 72]])
    && js(r.h.sounding().map((e) => e[1])) === js([65, 69, 72]), js(notes(r)));
  // (g) HOLD off releases everything
  r.h.keyDown('p50', 50); r.h.keyUp('p50');
  r.clear(); r.h.set('hold', false);
  ok('(g) hold off → every ringing id goes off (F\'s three + p50), silence',
    js(r.of('off').map((e) => e[1]).sort()) === js(['kKeyF', 'kKeyF~0', 'kKeyF~1', 'p50']) && r.h.sounding().length === 0, js(r.log));
}
{
  // a switch un-pins a pad the flush silenced (the rack's stale mono ref reconciled), and a pad under HOLD still
  // re-strikes as before
  const r = rig();
  r.h.set('hold', true); r.h.set('chord', true);
  r.h.set('rack', [[62, 65, 69]]);
  r.h.trigger(0); r.h.release(0);
  ok('pad under HOLD: its tones ring and it pins the bass to D (62)', js(r.h.sounding().map((e) => e[0])) === js(['c0.0', 'c0.1', 'c0.2']) && r.bs.root === 62);
  r.clear(); r.down('KeyF'); r.up('KeyF');
  ok('a letter chord after it: the pad\'s tones (the hold\'s) release, F rings, the pad\'s pin is dropped',
    js(r.of('off').map((e) => e[1])) === js(['c0.0', 'c0.1', 'c0.2']) && js(r.h.sounding().map((e) => e[1])) === js([65, 69, 72])
    && r.bs.root === null && !r.h.pad(0).on, js(r.log));
  r.clear(); r.h.trigger(0);
  ok('the pad pressed again re-strikes (the rack\'s mono latch, unchanged: F stays, the pad rings, re-pinned)',
    js(r.of('on').map((e) => e[1])) === js(['c0.0', 'c0.1', 'c0.2']) && r.bs.root === 62, js(r.log));
  r.h.release(0);
}

console.log('\n[harmony] the bass hears what sounds, ascending (core.ts:1671-1672)');
{
  const r = rig();
  r.h.set('chord', true);
  r.down('KeyG');
  ok('one call per press, the whole triad ascending', js(r.of('bheld')) === js([['bheld', [67, 71, 74]]]));
  r.down('KeyA');
  ok('a second key: every sounding note, ascending', js(r.of('bheld').at(-1)) === js(['bheld', [60, 64, 67, 67, 71, 74]]));
  r.h.set('arp', { ...r.h.state().arp, on: true });
  r.up('KeyG');
  ok('with the arp running the bass hears the POOL', js(r.of('bheld').at(-1)) === js(['bheld', [60, 64, 67]]));
  r.up('KeyA');
  ok('…and silence when the pool empties', js(r.of('bheld').at(-1)) === js(['bheld', []]));
}

console.log('\n[harmony] name(): the naming law with the key context (chord-name.ts)');
{
  const r = rig();
  ok('C major: C E G → C, I', js(r.h.name([60, 64, 67])) === js({ label: 'C', degree: 'I' }));
  ok('C major: A C E → Am, vi', js(r.h.name([57, 60, 64])) === js({ label: 'Am', degree: 'vi' }));
  r.h.set('music', { key: 9, scale: 'minor', oct: 0 });
  ok('A minor: A C E → Am, i', js(r.h.name([57, 60, 64])) === js({ label: 'Am', degree: 'i' }));
  r.h.set('music', { key: 0, scale: 'chrom', oct: 0 });
  ok('FREE: no degree (null)', r.h.name([60, 64, 67]).degree === null);
  ok('nothing sounding → empty label', r.h.name([]).label === '');
}

console.log('\n[harmony] ←/→: a sounding chord MOVES through the key, else the octave (play.ts:195-209, 378-396)');
{
  const r = rig();
  r.h.set('chord', true);
  r.down('KeyA');
  r.clear(); r.h.transpose(1);
  ok('C E G → D F A in place (keys.retune)', js(r.of('retune')[0][1]) === js({ kKeyA: 62, 'kKeyA~0': 65, 'kKeyA~1': 69 }) && r.h.shift() === 1);
  r.h.transpose(1);
  ok('again → E G B (the triad re-derived on the moved root)', js(r.h.sounding().map((e) => e[1])) === js([64, 67, 71]));
  ok('the octave did not move while a chord was moved', r.h.state().music.oct === 0);
  r.clear(); r.down('KeyD');
  ok('a letter pressed while moved plays moved (the D key is E; +2 = G: G B D)', js(r.of('on').map((e) => e[2])) === js([67, 71, 74]), js(r.of('on')));
  r.up('KeyA'); r.up('KeyD');
  ok('silence: ←/→ is the octave again', (r.h.transpose(1), r.h.state().music.oct === 1) && r.h.shift() === 2);
  r.clear(); r.down('KeyA');
  ok('the first press after silence starts unmoved (shift reset)', r.h.shift() === 0 && js(r.of('on').map((e) => e[2])) === js([72, 76, 79]));
  r.up('KeyA');
  r.h.transpose(1);
  ok('the octave clamps at +1', r.h.state().music.oct === 1);
  r.h.transpose(-1); r.h.transpose(-1); r.h.transpose(-1);
  ok('…and at −1', r.h.state().music.oct === -1);
}
{
  const r = rig();
  r.down('KeyA');
  for (let i = 0; i < 20; i++) r.h.transpose(1);
  ok('MOVE clamps at +14', r.h.shift() === 14);
  r.up('KeyA');
}
{
  const r = rig();
  r.h.set('arp', { ...r.h.state().arp, on: true });
  r.down('KeyA');
  r.h.transpose(1);
  r.h.book(r.booking(0, 0));
  ok('under ARP a MOVE re-pitches the pool: the next step plays the moved note (D 62)', r.of('hit').at(-1)[1] === 62);
}

console.log('\n[harmony] the pads through the rack (trigger / release / stamp / pin)');
{
  const r = rig();
  let changes = 0; r.h.onChange(() => { changes++; });
  r.h.set('chord', true);
  r.down('KeyA');
  changes = 0;
  r.h.trigger(2);
  ok('an empty pad + a sounding chord = a stamp (state().rack[2] = C E G)', js(r.h.state().rack[2]) === js([60, 64, 67]) && changes === 1);
  r.up('KeyA'); r.clear();
  r.h.trigger(2);
  ok('the pad plays c2.* and pins the bass to its root C (60)', js(r.of('on').map((e) => e[1])) === js(['c2.0', 'c2.1', 'c2.2']) && r.bs.root === 60);
  ok('its face: C / I, lit + selected', (() => { const f = r.h.pad(2); return f.label === 'C' && f.degree === 'I' && f.sel && f.on; })());
  r.h.release(2);
  ok('release: the tones stop, the pin goes', r.h.sounding().length === 0 && r.bs.root === null);
  r.h.trigger(2, true);
  ok('⇧: cleared (and state() says so)', r.h.state().rack[2] === null);
}

console.log('\n[harmony] set() normalises; state() is the machine\'s truth');
{
  const r = rig();
  ok('defaults: C major oct 0 · CHORD/HOLD off · arp 1/8 .5 0 · gate 1/16 0 · dive .45 24 · 8 empty pads', js(r.h.state()) === js(defaultHarmonyState()));
  r.h.set('arp', { on: false, div: '1/5', length: 9, groove: -1 });
  ok('a bad division keeps the old one; LENGTH clamps to 1.3, GROOVE to 0', js(r.h.state().arp) === js({ on: false, div: '1/8', length: 1.3, groove: 0 }));
  r.h.set('dive', { speedSec: 0.01, dist: 99 });
  ok('DIVE clamps: SPEED ≥ .05, DIST ≤ 36', js(r.h.state().dive) === js({ speedSec: 0.05, dist: 36 }));
  r.h.set('gate', { div: '1/16T', swing: 2 });
  ok('GATE: a valid division lands, SWING clamps to 1', js(r.h.state().gate) === js({ div: '1/16T', swing: 1 }));
  r.h.set('music', { key: 14, scale: 'minor', oct: 5 });
  ok('music: key folds, oct clamps to +1', js(r.h.state().music) === js({ key: 2, scale: 'minor', oct: 1 }));
  r.h.set('rack', [[60, 64, 67], 'x', null, [1.6]]);
  ok('the rack loads through the store guard', js(r.h.state().rack) === js([[60, 64, 67], null, null, [2], null, null, null, null]));
  r.h.set('hold', true); r.h.set('arp', { ...r.h.state().arp, on: true });
  ok('HOLD and ARP land in state()', r.h.state().hold && r.h.state().arp.on);
  ok('midiFor: the letters through music.ts (D minor oct +1: A = 74)', r.h.midiFor(0, false) === 74);
}

console.log('\n[harmony] the gate row + the master stop');
{
  const r = rig();
  r.h.gesture('gate', true);
  r.h.book(r.booking(0, 0));
  ok('gesture(\'gate\') + book(): a chop on this step', r.of('chop').length === 1);
  r.h.gesture('dive', true);
  ok('gesture(\'dive\'): keys bend −2400 with τ .45', js(r.of('bend')[0]) === js(['bend', -2400, 0.45]));
  ok('[R2] …and the bass dives the same depth at the same SPEED (τ .45, its 4th argument)',
    js(r.of('bgest').filter((e) => e[1] === 'dive')) === js([['bgest', 'dive', true, -2400, 0.45]]), js(r.of('bgest')));
  r.h.set('hold', true); r.h.set('chord', true);
  r.h.set('rack', [[60, 64, 67]]);
  r.down('KeyA'); r.up('KeyA'); r.h.trigger(0);
  r.h.set('arp', { ...r.h.state().arp, on: true });
  let changes = 0; r.h.onChange(() => { changes++; });
  r.clear(); r.h.stop();
  const s = r.h.state();
  ok('stop: nothing sounds, HOLD + ARP off, the pads down, the rack\'s pin dropped', r.h.sounding().length === 0 && !s.hold && !s.arp.on && r.bs.root === null, js(s));
  ok('stop: the gate released and DIVE returned', r.of('release').length === 1 && js(r.of('bend')) === js([['bend', 0]]));
  ok('stop: the bass hears silence, the view hears a change', js(r.of('bheld').at(-1)) === js(['bheld', []]) && changes >= 1);
  ok('stop keeps the rack and the knobs', js(s.rack[0]) === js([60, 64, 67]) && s.chord === true);
}

console.log('\n[harmony] R2 · DIVE SPEED reaches the keys AND the bass (one τ down; the Studio\'s .07 back) · the gate row passes through');
{
  const r = rig();
  r.h.set('dive', { speedSec: 1.5, dist: 12 });
  r.clear();
  r.h.gesture('dive', true);
  ok('[R2] SPEED 1.5 (the dial\'s slow end), DIST 12: keys.bend(−1200, 1.5) and bass.gesture(dive, on, −1200, 1.5)',
    js(r.of('bend')) === js([['bend', -1200, 1.5]]) && js(r.of('bgest')) === js([['bgest', 'dive', true, -1200, 1.5]]), js(r.log));
  r.clear();
  r.h.gesture('dive', false);
  ok('[R2] release: keys.bend(0) and the bass\'s dive-off carry no τ (both come back on their .07)',
    js(r.of('bend')) === js([['bend', 0]]) && js(r.of('bgest')) === js([['bgest', 'dive', false]]), js(r.log));
  r.h.set('dive', { speedSec: 0.05, dist: 36 });
  r.clear(); r.h.gesture('dive', true);
  ok('[R2] SPEED .05 (the fast end), DIST 36: both fall at .05', js(r.of('bend')) === js([['bend', -3600, 0.05]])
    && js(r.of('bgest')) === js([['bgest', 'dive', true, -3600, 0.05]]), js(r.log));
  r.h.gesture('dive', false);
  r.clear();
  r.h.gesture('gate', true); r.h.book(r.booking(0, 0));
  ok('[R2] the gate row still reaches the bass: a bass without chop gets gesture(gate, on, sd) beside effects.chop',
    r.of('chop').length === 1 && r.of('bchop').length === 0 && r.of('bgest').some((e) => e[1] === 'gate' && e[2] === true && e[3] === r.of('chop')[0][2]), js(r.log));
  const c = rig({ chop: true });
  c.h.gesture('gate', true); c.h.book(c.booking(0, 0));
  const [ch] = c.of('chop'), [bc] = c.of('bchop');
  ok('[R2] …and a bass WITH chop gets its exact chop at effects.chop\'s time + length (lane B\'s frame-exact twin)',
    !!ch && !!bc && bc[1] === ch[1] && bc[2] === ch[2], js(c.log));
}

console.log('\n[harmony] the keys went silent on their own (blur / hidden / stop: keys.allOff) → the model forgets');
{
  // a keys fake with a real held set + onHeldChange, like lane K's
  const held = new Map(); const cbs = new Set(); const log = [];
  const emit = () => cbs.forEach((cb) => cb([...held]));
  const keys = {
    noteOn: (id, m) => { log.push(['on', id]); held.set(id, m); emit(); },
    noteOff: (id) => { log.push(['off', id]); if (held.delete(id)) emit(); },
    hit() {}, bend() {}, retune() {}, held: () => [...held],
    allOff: () => { const had = held.size > 0; held.clear(); if (had) emit(); },
    onHeldChange: (cb) => { cbs.add(cb); return () => cbs.delete(cb); },
  };
  const bass = { held() {}, gesture() {}, state: () => ({ root: null, armed: false }), set() {} };
  const time = { grid: () => ({ sr: 48000, barFrames: 96000, originFrame: 0 }), nextLine: (p, f = 960) => ({ frame: f, bar: 0, i: 0, perBar: p }) };
  const h = createHarmony({ keys, bass, time, effects: { chop() {}, releaseGate() {} }, ctx: { currentTime: 0 } });
  h.set('hold', true);                        // the pedal (R3: HOLD + CHORD switches, so the stack is chord-off)
  h.keyDown('kKeyA', 60); h.keyUp('kKeyA');
  h.keyDown('kKeyS', 62); h.keyUp('kKeyS');
  h.keyDown('kKeyS', 62); h.keyUp('kKeyS');   // tap-again: S released by us (the keys pass through non-empty)
  await Promise.resolve();
  ok('our own releases never make the model forget what still rings (A stays)', js(h.sounding().map((e) => e[1])) === js([60]));
  keys.allOff();                              // the window blurred: lane K put every voice down itself
  await Promise.resolve();
  ok('the keys went silent on their own: the latched note is forgotten', h.sounding().length === 0);
  h.set('chord', true);
  log.length = 0;
  h.keyDown('kKeyA', 60);
  ok('…so the next tap on A SOUNDS (not a tap-again release of a silent note)', log.filter((e) => e[0] === 'on').length === 3 && h.sounding().length === 3, js(log));
  h.keyUp('kKeyA');
}

console.log(`\n[harmony] ${pass} passed, ${fail} failed`);
console.log(`harmony: ${pass}/${pass + fail}`);
if (fail) process.exit(1);
