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
  h.set('hold', true); h.set('chord', true);
  h.keyDown('kKeyA', 60); h.keyUp('kKeyA');
  h.keyDown('kKeyS', 62); h.keyUp('kKeyS');
  h.keyDown('kKeyS', 62); h.keyUp('kKeyS');   // tap-again: S released by us (the keys pass through non-empty)
  await Promise.resolve();
  ok('our own releases never make the model forget what still rings (A\'s chord stays)', js(h.sounding().map((e) => e[1])) === js([60, 64, 67]));
  keys.allOff();                              // the window blurred: lane K put every voice down itself
  await Promise.resolve();
  ok('the keys went silent on their own: the latched chord is forgotten', h.sounding().length === 0);
  log.length = 0;
  h.keyDown('kKeyA', 60);
  ok('…so the next tap on A SOUNDS (not a tap-again release of a silent note)', log.filter((e) => e[0] === 'on').length === 3 && h.sounding().length === 3, js(log));
  h.keyUp('kKeyA');
}

console.log(`\n[harmony] ${pass} passed, ${fail} failed`);
console.log(`harmony: ${pass}/${pass + fail}`);
if (fail) process.exit(1);
