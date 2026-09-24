// SIGNAL R1 · lane S · db.ts tests. New (the page's shelf.test.mjs fake-IDB idea, rewritten small for raw IndexedDB).
//   source ~/.nvm/nvm.sh && node src/signal/db.test.mjs
// Pure first: DEFAULT_STATE's shape against the field lists PARSED from types.ts (a drift guard: a contract edit that
// adds or drops a field fails here), the contract's defaults value by value, then mergeState over a null, garbage, a
// stale save, a foreign object, wrong array lengths, bad cells, out-of-range numbers, and the round trip that "loses
// nothing". Then the store: Node's missing IndexedDB, and a fake one for the cadence (250 ms after the FIRST change,
// the newest state wins, one in flight + ONE queued, flush now), the heal, versionchange, a failing open, pagehide.
import { readFileSync } from 'node:fs';
import { deepStrictEqual } from 'node:assert';
import { DRUM_LANES, KEYMAP } from './types.ts';
import { createStore, DEFAULT_STATE, defaultState, LOAD_TIMEOUT_MS, mergeState, SAVE_DELAY_MS } from './db.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const eq = (n, a, b) => { try { deepStrictEqual(a, b); ok(n, true); } catch (e) { ok(n, false, e.message.split('\n').slice(0, 14).join('\n')); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));
const D = DEFAULT_STATE;
void KEYMAP;

// ─────────────────────────────────────────────────────────────── types.ts, parsed (comments and strings respected)
const SRC = (() => {
  const s = readFileSync(new URL('./types.ts', import.meta.url), 'utf8');
  let out = '';
  for (let i = 0; i < s.length;) {
    const c = s[i], n = s[i + 1];
    if (c === '/' && n === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      out += s[i++];
      while (i < s.length && s[i] !== c) { if (s[i] === '\\') out += s[i++]; out += s[i++]; }
      out += s[i++] ?? '';
      continue;
    }
    out += c; i++;
  }
  return out;
})();
const INTERFACES = new Set([...SRC.matchAll(/export interface (\w+)/g)].map((m) => m[1]));
/** { field: { type, nested } } for one interface body starting at s[i] === '{'. */
function body(s, i) {
  const fields = {};
  i++;
  for (;;) {
    while (i < s.length && /[\s;,]/.test(s[i])) i++;
    if (s[i] === '}') return [fields, i + 1];
    const m = /^([A-Za-z_$][\w$]*)\??\s*:\s*/.exec(s.slice(i, i + 80));
    if (!m) throw new Error(`types.ts: cannot parse a member at «${s.slice(i, i + 40)}»`);
    i += m[0].length;
    const t0 = i;
    let nested = null;
    if (s[i] === '{') [nested, i] = body(s, i);
    for (let depth = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '=' && s[i + 1] === '>') { i++; continue; }
      if ('<([{'.includes(c)) depth++;
      else if ('>)]}'.includes(c)) { if (depth === 0) break; depth--; }
      else if ((c === ';' || c === ',') && depth === 0) break;
    }
    fields[m[1]] = { type: s.slice(t0, i).trim(), nested };
  }
}
function iface(name) {
  const m = new RegExp(`export interface ${name}\\b[^{]*\\{`).exec(SRC);
  if (!m) throw new Error(`types.ts: no interface ${name}`);
  return body(SRC, m.index + m[0].length - 1)[0];
}
/** Walk a value against an interface's fields: exact key sets, primitive types, named interfaces and arrays of them. */
function shape(v, fields, path, bad) {
  if (typeof v !== 'object' || v === null) { bad.push(`${path}: not an object`); return; }
  const want = Object.keys(fields).sort().join(), got = Object.keys(v).sort().join();
  if (want !== got) bad.push(`${path}: keys [${got}] ≠ contract [${want}]`);
  for (const [k, f] of Object.entries(fields)) {
    const x = v[k], p = `${path}.${k}`, t = f.type;
    if (f.nested) { shape(x, f.nested, p, bad); continue; }
    if (INTERFACES.has(t)) { shape(x, iface(t), p, bad); continue; }
    const arr = /^(\w+)\[\]$/.exec(t);
    if (arr && INTERFACES.has(arr[1])) {
      if (!Array.isArray(x)) bad.push(`${p}: not an array`); else x.forEach((it, i) => shape(it, iface(arr[1]), `${p}[${i}]`, bad));
      continue;
    }
    if (t === 'number' && typeof x !== 'number') bad.push(`${p}: ${typeof x}, contract number`);
    if (t === 'boolean' && typeof x !== 'boolean') bad.push(`${p}: ${typeof x}, contract boolean`);
    if (/^\d+$/.test(t) && x !== Number(t)) bad.push(`${p}: ${x}, contract ${t}`);
    if (t === 'number | null' && x !== null && typeof x !== 'number') bad.push(`${p}: ${typeof x}, contract number | null`);
  }
}
/** Every leaf path of a plain value (arrays by index). */
function leaves(v, path = [], out = []) {
  if (v !== null && typeof v === 'object') { for (const k of Object.keys(v)) leaves(v[k], [...path, k], out); } else out.push(path);
  return out;
}
const getAt = (o, p) => p.reduce((a, k) => a[k], o);
const setAt = (o, p, x) => { getAt(o, p.slice(0, -1))[p[p.length - 1]] = x; };
const keyPaths = (v, path = '', out = new Set()) => {
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) for (const k of Object.keys(v)) { out.add(`${path}.${k}`); keyPaths(v[k], `${path}.${k}`, out); }
  else if (Array.isArray(v)) v.forEach((x, i) => keyPaths(x, `${path}[]`, out));
  return out;
};

console.log('\n[contract] DEFAULT_STATE against the field lists parsed from types.ts');
{
  const bad = [];
  shape(D, iface('SignalState'), 'state', bad);
  ok('every interface field present, no extra field, primitive types match (recursively)', bad.length === 0, bad.join(' · '));
  ok('the parse found the six state interfaces', ['SignalState', 'DrumsState', 'BassState', 'KeysState', 'HarmonyState', 'BassStep', 'Music'].every((n) => INTERFACES.has(n)));
  ok('drums.seq: exactly the six DRUM_LANES', Object.keys(D.drums.seq).join() === DRUM_LANES.join(), Object.keys(D.drums.seq).join());
  ok('drums.seq: 16 cells per lane', DRUM_LANES.every((l) => D.drums.seq[l].length === 16));
  ok('bass.seq: 16 cells', D.bass.seq.length === 16);
  ok('harmony.rack: 8 pads', D.harmony.rack.length === 8);
}

console.log('\n[defaults] the contract\'s value for every field');
{
  const rests = () => Array(16).fill(0);
  eq('DEFAULT_STATE is exactly the contract\'s defaults', clone(D), {
    v: 1, bpm: 120,
    drums: {
      on: false, pattern: 'floor',
      seq: { kick: rests(), snare: rests(), hat: rests(), openhat: rests(), clap: rests(), shaker: rests() },
      density: 0.5, swing: 0, cover: 1, coverDb: 0, lowcut: 0, lowcutDb: 0, texture: 'tape', textureAmt: 0,
      delay: { mix: 0, time: '1/8', feedback: 0.35 }, sidechain: 0.3, gain: 1, mute: false,
    },
    bass: {
      on: false, mode: 'drone', seq: Array.from({ length: 16 }, () => ({ v: 0, oct: 'base', slide: false })),
      root: null, armed: false, heat: 0.5, weight: 0.5, glide: 0, density: 0.5, groove: 0.3,
      cut: 1, cutDb: 0, lowcut: 0, lowcutDb: 0, gain: 1, mute: false,
    },
    keys: {
      voice: 'rhodes', filter: 1, motion: { amount: 0, shape: 'sine', div: '1/8' },
      fx: { drive: 0, driveType: 'warm', mod: 0, modMode: 'chorus', modRate: 0.5, delay: 0, delayDiv: '1/8', reverb: 0.22, revSize: 'sm' },
      gain: 1, mute: false,
    },
    harmony: {
      music: { key: 0, scale: 'major', oct: 0 }, chord: false, hold: false,
      arp: { on: false, div: '1/8', length: 0.5, groove: 0 }, rack: Array(8).fill(null),
      gate: { div: '1/16', swing: 0 }, dive: { speedSec: 0.45, dist: 24 },
    },
    solo: null,
  });
}

console.log('\n[frozen] DEFAULT_STATE cannot be changed; merges hand out fresh copies');
{
  const frozen = (v) => v === null || typeof v !== 'object' || (Object.isFrozen(v) && Object.values(v).every(frozen));
  ok('deep-frozen', frozen(D));
  let threw = false;
  try { D.drums.seq.kick[0] = 3; } catch { threw = true; }
  ok('a write into it throws (strict mode) and changes nothing', threw && D.drums.seq.kick[0] === 0);
  const m = mergeState(D, null);
  eq('mergeState(D, null) equals D', m, clone(D));
  ok('…and shares no object with it', m !== D && m.drums !== D.drums && m.drums.seq.kick !== D.drums.seq.kick
    && m.bass.seq[0] !== D.bass.seq[0] && m.harmony.rack !== D.harmony.rack && m.keys.fx !== D.keys.fx);
  m.drums.seq.kick[0] = 3; m.bass.seq[0].v = 3; m.harmony.rack[0] = [60]; m.keys.fx.reverb = 1;
  ok('…and is mutable, D untouched', !Object.isFrozen(m) && D.drums.seq.kick[0] === 0 && D.bass.seq[0].v === 0 && D.harmony.rack[0] === null);
  const f = defaultState();
  eq('defaultState() equals D', f, clone(D));
  ok('defaultState() is a fresh copy each call', f !== defaultState() && f.drums.seq.kick !== defaultState().drums.seq.kick);
}

console.log('\n[null + garbage] anything that is not an object loads as the defaults');
{
  for (const [label, x] of [['null', null], ['undefined', undefined], ['a number', 42], ['a string', '{"bpm":90}'],
    ['an array', [1, 2, 3]], ['true', true], ['NaN', NaN], ['a function', () => 1], ['a Date', new Date()]]) {
    eq(`${label} → defaults`, mergeState(D, x), clone(D));
  }
}

console.log('\n[stale save] an older shape: known fields kept, renamed or retired fields dropped, bad values defaulted');
{
  const s16 = (str) => [...str].map(Number);
  const stale = {
    v: 1, bpm: 96,
    drums: {
      on: true, mode: 'seq', pattern: 'back', character: 0.5, density: 0.7, swing: 0.2, cover: 0.8, texture: 'tape', textureAmt: 0.3,
      seq: {
        kick: s16('3000200030002000'), snare: s16('0000300000003000'), hat: s16('2020202020202020'),
        openhat: s16('0000000000000030'), clap: s16('0000000000000000'), perc: s16('1001001010010010'),
      },
      delay: { mix: 0.4, time: 2, feedback: 0.5 }, sidechain: 0.3, gain: 1, mute: false,
    },
    bass: {
      on: true, mode: 'seq', lock: true, intensity: 0.8, sub: 0.3, tone: 0.9, glide: 0.2, root: null, density: 0.5, groove: 0.3,
      seq: [{ v: 3, oct: 'base', slide: false }, 0, 0, 0, { v: 2, oct: 'sub', slide: true }, 0, 0, 0, { v: 2, oct: 'base', slide: false }, 0, 0, 0, { v: 2, oct: 'base', slide: false }, 0, 0, 0],
      gain: 1, mute: false,
    },
    keys: {
      voice: 'piano', filter: 0.6, motion: { on: true, amount: 0.3, shape: 'tri', div: '8' },
      fx: { drive: 0.2, driveType: 'crunch', mod: 0.1, modMode: 'chorus', modRate: 0.5, delay: 0.2, delayDiv: '8', reverb: 0.3, revSize: 'small' },
      gain: 1, mute: false,
    },
    solo: null,
  };
  const m = mergeState(D, stale);
  const want = clone(D);
  want.bpm = 96;
  Object.assign(want.drums, { on: true, pattern: 'back', density: 0.7, swing: 0.2, cover: 0.8, textureAmt: 0.3, delay: { mix: 0.4, time: '1/8', feedback: 0.5 } });
  Object.assign(want.drums.seq, { kick: stale.drums.seq.kick, snare: stale.drums.seq.snare, hat: stale.drums.seq.hat, openhat: stale.drums.seq.openhat, clap: stale.drums.seq.clap });
  Object.assign(want.bass, { on: true, mode: 'seq', glide: 0.2 });
  want.bass.seq[0] = { v: 3, oct: 'base', slide: false }; want.bass.seq[4] = { v: 2, oct: 'sub', slide: true };
  want.bass.seq[8] = { v: 2, oct: 'base', slide: false }; want.bass.seq[12] = { v: 2, oct: 'base', slide: false };
  Object.assign(want.keys, { voice: 'piano', filter: 0.6 });
  want.keys.motion.amount = 0.3;
  Object.assign(want.keys.fx, { drive: 0.2, driveType: 'crunch', mod: 0.1, delay: 0.2, reverb: 0.3 });
  eq('the whole merge, field by field', m, want);
  ok('the Studio lane `perc` is not our `shaker`: shaker loads as rests', m.drums.seq.shaker.every((c) => c === 0) && !('perc' in m.drums.seq));
  ok('retired fields dropped (drums.mode, character; bass.lock, intensity, sub, tone; motion.on)',
    !('mode' in m.drums) && !('character' in m.drums) && !('lock' in m.bass) && !('intensity' in m.bass) && !('tone' in m.bass) && !('on' in m.keys.motion));
  ok('Studio-format values fall to defaults: delay.time 2 → 1/8, shape tri → sine, div 8 → 1/8, revSize small → sm',
    m.drums.delay.time === '1/8' && m.keys.motion.shape === 'sine' && m.keys.motion.div === '1/8' && m.keys.fx.revSize === 'sm');
  ok('a Studio `0` bass cell loads as a rest step', m.bass.seq[1].v === 0 && m.bass.seq[1].oct === 'base');
  eq('the missing harmony loads whole from the defaults', m.harmony, clone(D.harmony));
}

console.log('\n[foreign] an object from somewhere else: nothing of it survives but what fits');
{
  const foreign = {
    id: 'state', name: 'my synth', version: 7, v: 7, tempo: 140, bpm: '120',
    drums: 'yes', bass: [1, 2, 3], harmony: null, solo: 'vocals',
    keys: { voice: 'synth', filter: '0.5', gain: true, extra: { deep: 1 }, fx: 'wet' },
  };
  const m = mergeState(D, foreign);
  eq('every field falls to its default', m, clone(D));
  ok('v is always 1', m.v === 1);
  eq('no unknown key anywhere (the deep key set is the defaults\')', [...keyPaths(m)].sort(), [...keyPaths(D)].sort());
}

console.log('\n[lengths] arrays of the wrong length load as their default, the rest of the object stays');
{
  const s = clone(D);
  s.drums.seq.kick = Array(15).fill(3);
  s.drums.seq.snare = Array(17).fill(2);
  s.drums.seq.hat = Array(16).fill(1);
  s.bass.seq = Array.from({ length: 8 }, () => ({ v: 3, oct: 'sub', slide: true }));
  s.harmony.rack = [[60, 64, 67], null, null, null, null, null, null];
  s.drums.density = 0.9;
  const m = mergeState(D, s);
  ok('kick of 15 cells → rests', m.drums.seq.kick.length === 16 && m.drums.seq.kick.every((c) => c === 0));
  ok('snare of 17 cells → rests', m.drums.seq.snare.length === 16 && m.drums.seq.snare.every((c) => c === 0));
  ok('hat of 16 cells kept', m.drums.seq.hat.every((c) => c === 1));
  ok('bass strip of 8 → 16 rests', m.bass.seq.length === 16 && m.bass.seq.every((st) => st.v === 0));
  ok('rack of 7 → 8 empty pads', m.harmony.rack.length === 8 && m.harmony.rack.every((p) => p === null));
  ok('a neighbour field survives (drums.density .9)', m.drums.density === 0.9);
  const s2 = clone(D);
  s2.bass.seq = Array.from({ length: 32 }, () => ({ v: 3, oct: 'base', slide: false }));
  s2.harmony.rack = Array(9).fill([60]);
  const m2 = mergeState(D, s2);
  ok('bass strip of 32 → 16 rests; rack of 9 → 8 empty', m2.bass.seq.length === 16 && m2.bass.seq.every((st) => st.v === 0)
    && m2.harmony.rack.length === 8 && m2.harmony.rack.every((p) => p === null));
  const s3 = clone(D);
  s3.drums.seq = [[1, 2, 3]];
  ok('drums.seq as an array (not a record) → six lanes of rests', DRUM_LANES.every((l) => mergeState(D, s3).drums.seq[l].join('') === '0'.repeat(16)));
}

console.log('\n[cells] each cell, step field and pad note on its own');
{
  const s = clone(D);
  s.drums.seq.kick = [4, -1, 1.5, '2', null, undefined, NaN, 3, 2, 1, 0, true, {}, [], 2, 3];
  s.bass.seq[0] = { v: 2, oct: 'weird', slide: 'yes' };
  s.bass.seq[1] = { v: 5, oct: 'sub', slide: true };
  s.bass.seq[2] = 'x';
  s.bass.seq[3] = { v: 1, oct: 'sub', slide: true, extra: 9 };
  s.harmony.rack = [[60, 64, 67], [60, 'x', 64, 60, 128, -1, 59.6], [], ['a'], 'C', null, [127, 0], { 0: 60 }];
  const m = mergeState(D, s);
  eq('drum cells: only 0..3 integers survive, the rest are rests', m.drums.seq.kick, [0, 0, 0, 0, 0, 0, 0, 3, 2, 1, 0, 0, 0, 0, 2, 3]);
  eq('a step keeps its good fields: {v 2, oct weird, slide "yes"} → {2, base, false}', m.bass.seq[0], { v: 2, oct: 'base', slide: false });
  eq('v 5 → rest, the rest of the step kept', m.bass.seq[1], { v: 0, oct: 'sub', slide: true });
  eq('a non-object step → rest', m.bass.seq[2], { v: 0, oct: 'base', slide: false });
  eq('an extra key in a step is dropped', m.bass.seq[3], { v: 1, oct: 'sub', slide: true });
  eq('rack: good pads kept; bad notes, repeats and out-of-range dropped (59.6 rounds to 60, a repeat); empty → null',
    m.harmony.rack, [[60, 64, 67], [60, 64], null, null, null, null, [127, 0], null]);
}

console.log('\n[ranges] numbers clamp to the contract\'s ranges; non-finite numbers are the default');
{
  const at = (mut) => { const s = clone(D); mut(s); return mergeState(D, s); };
  ok('bpm 500 → 180, 10 → 60, 97.5 kept', at((s) => { s.bpm = 500; }).bpm === 180 && at((s) => { s.bpm = 10; }).bpm === 60 && at((s) => { s.bpm = 97.5; }).bpm === 97.5);
  ok('bpm NaN / Infinity / −Infinity → 120', [NaN, Infinity, -Infinity].every((b) => at((s) => { s.bpm = b; }).bpm === 120));
  ok('filter 2 → 1, −1 → 0', at((s) => { s.keys.filter = 2; }).keys.filter === 1 && at((s) => { s.keys.filter = -1; }).keys.filter === 0);
  ok('gain 0..1.25 (drums 3 → 1.25, bass −1 → 0, keys 1.1 kept)', at((s) => { s.drums.gain = 3; }).drums.gain === 1.25
    && at((s) => { s.bass.gain = -1; }).bass.gain === 0 && at((s) => { s.keys.gain = 1.1; }).keys.gain === 1.1);
  ok('resonance −24..+18 dB (coverDb 30 → 18, bass lowcutDb −40 → −24)', at((s) => { s.drums.coverDb = 30; }).drums.coverDb === 18
    && at((s) => { s.bass.lowcutDb = -40; }).bass.lowcutDb === -24);
  ok('arp LENGTH .06..1.3', at((s) => { s.harmony.arp.length = 0; }).harmony.arp.length === 0.06 && at((s) => { s.harmony.arp.length = 5; }).harmony.arp.length === 1.3);
  ok('dive SPEED .05..1.5 s, DIST 2..36 st', at((s) => { s.harmony.dive = { speedSec: 0, dist: 100 }; }).harmony.dive.speedSec === 0.05
    && at((s) => { s.harmony.dive = { speedSec: 9, dist: 0 }; }).harmony.dive.dist === 2);
  const k = (v) => at((s) => { s.harmony.music.key = v; }).harmony.music.key;
  const o = (v) => at((s) => { s.harmony.music.oct = v; }).harmony.music.oct;
  ok('key: an integer 0..11 (13 → 11, 4.4 → 4, −3 → 0)', k(13) === 11 && k(4.4) === 4 && k(-3) === 0);
  ok('oct: an integer −1..+1 (3 → 1, −0.6 → −1, −0.4 → +0 not −0)', o(3) === 1 && o(-0.6) === -1 && Object.is(o(-0.4), 0));
  const r = (v) => at((s) => { s.bass.root = v; }).bass.root;
  ok('bass.root: MIDI kept (36), rounded (59.7 → 60); 128, −1, "60" → null; null stays null',
    r(36) === 36 && r(59.7) === 60 && r(128) === null && r(-1) === null && r('60') === null && r(null) === null);
  const so = (v) => at((s) => { s.solo = v; }).solo;
  ok('solo: drums/keys/bass kept, "vocals" → null', so('drums') === 'drums' && so('keys') === 'keys' && so('bass') === 'bass' && so('vocals') === null);
}

// A state with every field off its default (and valid): the save a visitor who touched everything would leave.
const X = (() => {
  const s = clone(D);
  s.bpm = 97.5; s.solo = 'keys';
  Object.assign(s.drums, { on: true, pattern: 'break', density: 0.8, swing: 0.25, cover: 0.6, coverDb: 6, lowcut: 0.1, lowcutDb: -3,
    texture: 'drive', textureAmt: 0.4, delay: { mix: 0.3, time: '1/8d', feedback: 0.6 }, sidechain: 0.7, gain: 0.9, mute: true });
  DRUM_LANES.forEach((l, j) => { s.drums.seq[l] = Array.from({ length: 16 }, (_, i) => (i * 7 + j * 3) % 4); });
  Object.assign(s.bass, { on: true, mode: 'seq', root: 45, armed: false, heat: 0.7, weight: 0.2, glide: 0.4, density: 0.6, groove: 0.1,
    cut: 0.7, cutDb: 3, lowcut: 0.2, lowcutDb: -6, gain: 1.1, mute: true });
  s.bass.seq = Array.from({ length: 16 }, (_, i) => ({ v: i % 4, oct: i % 3 ? 'base' : 'sub', slide: i % 5 === 0 }));
  Object.assign(s.keys, { voice: 'pad', filter: 0.4, gain: 0.8, mute: true, motion: { amount: 0.5, shape: 'sawi', div: '1/16T' },
    fx: { drive: 0.3, driveType: 'fuzz', mod: 0.6, modMode: 'phaser', modRate: 0.8, delay: 0.25, delayDiv: '1/8d', reverb: 0.5, revSize: 'vast' } });
  s.harmony = { music: { key: 7, scale: 'minor', oct: -1 }, chord: true, hold: true, arp: { on: true, div: '1/16T', length: 0.9, groove: 0.4 },
    rack: [[48, 55, 60, 64], null, [50, 57, 62], null, null, null, null, [36]], gate: { div: '1/32', swing: 0.3 }, dive: { speedSec: 1.2, dist: 12 } };
  return s;
})();

console.log('\n[round trip] a state with every field moved loads back EXACTLY (Law 4: loses nothing)');
{
  // Two leaves cannot move here: `v` is always 1, and `armed` is the padlock's OTHER state (a pinned root is disarmed,
  // B #2), so it round-trips on its own below.
  const fixed = new Set(['v', 'bass.armed']);
  const bad = leaves(X).filter((p) => !p.includes('seq') && !p.includes('rack') && !fixed.has(p.join('.'))
    && JSON.stringify(getAt(X, p)) === JSON.stringify(getAt(D, p)));
  ok('the fixture moves every scalar off its default (but v and the padlock\'s other state)', bad.length === 0, bad.map((p) => p.join('.')).join(' '));
  const armed = clone(D); armed.bass.armed = true;
  eq('armed (the padlock waiting, root null) round-trips', mergeState(D, armed), armed);
  eq('mergeState(D, X) = X', mergeState(D, X), X);
  eq('through JSON = X', mergeState(D, JSON.parse(JSON.stringify(X))), X);
  eq('through a structured clone (what IndexedDB does) = X', mergeState(D, structuredClone(X)), X);
  eq('the row shape {id, v, ...state} = X (id dropped)', mergeState(D, { ...X, id: 'state', v: 1 }), X);
}

console.log('\n[field by field] each leaf of X made bad ALONE: that leaf alone falls back');
{
  const paths = leaves(X).filter((p) => p[0] !== 'harmony' || p[1] !== 'rack');
  const wrong = [];
  for (const p of paths) {
    if (p[0] === 'v') continue;
    const s = clone(X); setAt(s, p, { bad: true });
    const want = clone(X); setAt(want, p, getAt(D, p));
    try { deepStrictEqual(mergeState(D, s), want); } catch { wrong.push(p.join('.')); }
  }
  ok(`all ${paths.length - 1} leaves are independent (bad → its default, every other field kept)`, wrong.length === 0, wrong.slice(0, 8).join(' '));
}

console.log('\n[idempotent + hygiene]');
{
  const junk = { bpm: 'x', drums: { seq: { kick: [9] }, gain: 7 }, keys: { voice: 'lead', fx: { reverb: 3 } }, harmony: { rack: 'none', music: { key: 5.5 } } };
  const once = mergeState(D, junk);
  eq('merging a merge changes nothing', mergeState(D, once), once);
  const polluted = JSON.parse('{"__proto__": {"polluted": true}, "bpm": 100, "drums": {"__proto__": {"on": true}}}');
  const m = mergeState(D, polluted);
  ok('a "__proto__" key pollutes nothing and is not read', ({}).polluted === undefined && m.bpm === 100 && m.drums.on === false && !('polluted' in m));
  const deepFreeze = (v) => { if (v && typeof v === 'object') { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
  const input = deepFreeze(clone(X));
  let threw = null;
  try { mergeState(D, input); } catch (e) { threw = e; }
  ok('the saved object is never written to (a deep-frozen input merges fine)', threw === null, String(threw));
  const trap = { get bpm() { throw new Error('boom'); }, drums: { get on() { throw new Error('boom'); } } };
  let threw2 = null, got;
  try { got = mergeState(D, trap); } catch (e) { threw2 = e; }
  ok('a throwing getter (a foreign object handed in directly) never throws: its fields are the defaults',
    threw2 === null && got.bpm === 120 && got.drums.on === false, String(threw2));
}

// ─────────────────────────────────────────────────────────────── the store
const warns = [];
const realWarn = console.warn;
console.warn = (...a) => { warns.push(a.map(String).join(' ')); };

console.log('\n[store · no IndexedDB] Node: load null, saves dropped, flush resolves, one warning');
{
  const st = createStore({ name: 'signal-portfolio', version: 1 });
  ok('load() → null', (await st.load()) === null);
  let threw = null;
  try { st.save(defaultState()); st.save(X); } catch (e) { threw = e; }
  ok('save() never throws', threw === null);
  const t = performance.now();
  await st.flush();
  ok('flush() resolves at once', performance.now() - t < 50);
  ok('exactly one warning', warns.length === 1, JSON.stringify(warns));
}

/** A fake IndexedDB, just enough for db.ts: versioned opens with upgradeneeded, versionchange to open connections,
 *  VersionError below the current version, per-database FIFO transactions that land `delay` ms after they open. */
function fakeIDB({ failOpen = false, silentOpen = false } = {}) {
  const dbs = new Map();
  const log = { opens: [], errors: [], rw: 0, commits: 0, writes: [] };
  const cfg = { writeDelay: 5 };
  const err = (name) => Object.assign(new Error(name), { name });
  function makeDb(name, rec) {
    const db = {
      name, closed: false, onversionchange: null, onclose: null,
      get version() { return rec.version; },
      objectStoreNames: { contains: (n) => rec.stores.has(n) },
      createObjectStore(n) { rec.stores.set(n, new Map()); return {}; },
      close() { db.closed = true; rec.conns.delete(db); },
      transaction(storeName, mode) {
        if (db.closed) throw err('InvalidStateError');
        if (!rec.stores.has(storeName)) throw err('NotFoundError');
        const store = rec.stores.get(storeName);
        const ops = [];
        const tx = {
          oncomplete: null, onabort: null, error: null,
          objectStore: () => ({
            get(key) { const r = { result: undefined, error: null }; ops.push(() => { r.result = structuredClone(store.get(key)); }); return r; },
            put(row) {
              const copy = structuredClone(row);
              ops.push(() => { store.set(copy.id, copy); log.writes.push({ at: performance.now(), row: copy }); });
              return {};
            },
          }),
          commit() { log.commits++; },
        };
        if (mode === 'readwrite') log.rw++;
        const delay = mode === 'readwrite' ? cfg.writeDelay : 1;
        rec.chain = rec.chain.then(() => sleep(delay)).then(() => { for (const op of ops) op(); tx.oncomplete?.({}); });
        return tx;
      },
    };
    rec.conns.add(db);
    return db;
  }
  const factory = {
    open(name, version) {
      const req = { result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
      log.opens.push({ name, version });
      if (silentOpen) return req;
      setTimeout(() => {
        if (failOpen) { req.error = err('UnknownError'); log.errors.push('UnknownError'); req.onerror?.({}); return; }
        let rec = dbs.get(name);
        const want = version === undefined ? (rec ? rec.version : 1) : version;
        if (rec && want < rec.version) { req.error = err('VersionError'); log.errors.push('VersionError'); req.onerror?.({}); return; }
        if (!rec) { rec = { version: 0, stores: new Map(), conns: new Set(), chain: Promise.resolve() }; dbs.set(name, rec); }
        if (want > rec.version) {
          for (const c of [...rec.conns]) c.onversionchange?.({});
          rec.version = want;
          req.result = makeDb(name, rec);
          req.onupgradeneeded?.({});
        } else {
          req.result = makeDb(name, rec);
        }
        req.onsuccess?.({});
      }, 0);
      return req;
    },
  };
  /** A database created at `version` with no stores (a devtools poke: indexedDB.open(name)). */
  const seedEmpty = (name, version) => dbs.set(name, { version, stores: new Map(), conns: new Set(), chain: Promise.resolve() });
  /** Close every connection WITHOUT telling it (a connection that died under the page). */
  const killConns = (name) => { for (const c of [...(dbs.get(name)?.conns ?? [])]) c.close(); };
  return { factory, dbs, log, cfg, seedEmpty, killConns };
}
const S = (n) => { const s = defaultState(); s.bpm = 100 + n; return s; };

console.log('\n[store · cadence] 250 ms after the FIRST change, the newest wins, one in flight + ONE queued, flush now');
{
  const idb = fakeIDB();
  globalThis.indexedDB = idb.factory;
  const st = createStore({ name: 'cad', version: 1 });
  ok('a fresh database loads null', (await st.load()) === null);
  ok('…created at v1 with the one store', idb.dbs.get('cad').version === 1 && idb.dbs.get('cad').stores.has('state'));
  const t0 = performance.now();
  st.save(S(1)); await sleep(100); st.save(S(2)); await sleep(100); st.save(S(3));
  await sleep(25);
  ok('no write before 250 ms', idb.log.writes.length === 0 && idb.log.rw === 0, `${idb.log.writes.length}`);
  await sleep(110);
  ok('one write for three saves', idb.log.writes.length === 1 && idb.log.rw === 1, `${idb.log.writes.length}/${idb.log.rw}`);
  const w = idb.log.writes[0];
  ok('it carries the NEWEST state (bpm 103)', w?.row.bpm === 103, `${w?.row.bpm}`);
  const dt = (w?.at ?? 0) - t0;
  ok(`it landed ${SAVE_DELAY_MS} ms after the FIRST save, not the last (${dt.toFixed(0)} ms)`, dt >= SAVE_DELAY_MS - 5 && dt < SAVE_DELAY_MS + 90);
  ok('the row is {id: "state", v: 1, ...state}', w?.row.id === 'state' && w?.row.v === 1 && w?.row.drums && w?.row.harmony);
  ok('the transaction was committed explicitly (a pagehide write cannot wait for the next task)', idb.log.commits >= 1);

  idb.cfg.writeDelay = 150;
  const t1 = performance.now();
  st.save(S(4));
  await sleep(300);                                   // t≈300: S4 opened at ≈250, lands at ≈400
  st.save(S(5)); st.save(S(6));
  await sleep(60);                                    // t≈360: still in flight
  ok('saves during a write open no second transaction', idb.log.rw === 2, `rw ${idb.log.rw}`);
  await sleep(90);                                    // t≈450: S4 landed; the ONE queued write is armed for ≈650
  ok('the in-flight write landed with S4', idb.log.writes.length === 2 && idb.log.writes[1].row.bpm === 104);
  ok('the queued write waits its own 250 ms (no back-to-back writes)', idb.log.rw === 2, `rw ${idb.log.rw}`);
  await sleep(420);                                   // t≈870: the queued write opened ≈650, landed ≈800
  ok('exactly ONE more write for the two saves made in flight', idb.log.rw === 3 && idb.log.writes.length === 3, `rw ${idb.log.rw} w ${idb.log.writes.length}`);
  ok('…carrying the newest (S6)', idb.log.writes[2]?.row.bpm === 106);
  void t1;

  idb.cfg.writeDelay = 5;
  st.save(S(7));
  const t2 = performance.now();
  await st.flush();
  ok(`flush() writes at once (${(performance.now() - t2).toFixed(0)} ms) and resolves on commit`, performance.now() - t2 < 120 && idb.log.writes.at(-1).row.bpm === 107);
  const n = idb.log.rw;
  await sleep(SAVE_DELAY_MS + 60);
  ok('the flushed save\'s timer is gone (no second write)', idb.log.rw === n);

  idb.cfg.writeDelay = 100;
  st.save(S(8)); await sleep(SAVE_DELAY_MS + 20);   // S8 in flight
  st.save(S(9));
  await st.flush();
  ok('flush() during a write waits for it, then writes the newer save', idb.log.writes.at(-1).row.bpm === 109
    && idb.log.writes.at(-2).row.bpm === 108);
  const t3 = performance.now();
  await st.flush();
  ok('flush() with nothing pending resolves at once', performance.now() - t3 < 20);

  idb.cfg.writeDelay = 5;
  const again = createStore({ name: 'cad', version: 1 });   // the next page load
  const row = await again.load();
  ok('load() returns the row without its id', row && !('id' in row) && row.v === 1);
  eq('…and it merges back to the last saved state', mergeState(D, row), S(9));

  idb.killConns('cad');                                  // the connection dies without an event
  again.save(S(10));
  await again.flush();
  ok('a dead connection is dropped and the write retried on a fresh one', idb.log.writes.at(-1).row.bpm === 110);
  ok('no warning on the way', warns.length === 1, JSON.stringify(warns.slice(1)));
}

console.log('\n[store · heal] a store-less database is healed one version up; later boots open it without a VersionError');
{
  const idb = fakeIDB();
  globalThis.indexedDB = idb.factory;
  idb.seedEmpty('heal', 1);
  const st = createStore({ name: 'heal', version: 1 });
  ok('load() on a store-less database → null', (await st.load()) === null);
  ok('healed: v2 with the store', idb.dbs.get('heal').version === 2 && idb.dbs.get('heal').stores.has('state'));
  st.save(S(11)); await st.flush();
  const next = createStore({ name: 'heal', version: 1 });
  eq('the next boot reads it back', mergeState(D, await next.load()), S(11));
  ok('no VersionError on the way', !idb.log.errors.includes('VersionError'), idb.log.errors.join());

  const opens = idb.log.opens.length;
  idb.factory.open('heal', 3);                            // another tab (or the gate) upgrades or deletes
  await sleep(20);
  ok('our connections closed on versionchange (the upgrade was not blocked)', idb.dbs.get('heal').conns.size === 1 && idb.dbs.get('heal').version === 3);
  next.save(S(12)); await next.flush();
  ok('the next write reopened and landed', idb.log.opens.length > opens + 1 && idb.log.writes.at(-1).row.bpm === 112);
  ok('still no warning', warns.length === 1, JSON.stringify(warns.slice(1)));
}

console.log('\n[store · refusal] an open that fails: load null, saves dropped, ONE warning, nothing throws');
{
  warns.length = 0;
  const idb = fakeIDB({ failOpen: true });
  globalThis.indexedDB = idb.factory;
  const st = createStore({ name: 'nope', version: 1 });
  ok('load() → null', (await st.load()) === null);
  st.save(S(1)); st.save(S(2));
  await st.flush();
  st.save(S(3));
  await st.flush();
  ok('flush() resolves', true);
  ok('one warning for the lot', warns.length === 1, JSON.stringify(warns));
  ok('no second open attempt per call (the handle remembers the refusal)', idb.log.opens.length === 1, `${idb.log.opens.length}`);
}

console.log('\n[store · silence] an open that never answers: load() gives up with null');
{
  warns.length = 0;
  const idb = fakeIDB({ silentOpen: true });
  globalThis.indexedDB = idb.factory;
  const st = createStore({ name: 'hang', version: 1 });
  ok(`LOAD_TIMEOUT_MS is a few seconds (${LOAD_TIMEOUT_MS})`, LOAD_TIMEOUT_MS >= 1000 && LOAD_TIMEOUT_MS <= 5000);
  const t = performance.now();
  const got = await st.load();
  const dt = performance.now() - t;
  ok(`null after ${dt.toFixed(0)} ms, one warning`, got === null && dt >= LOAD_TIMEOUT_MS - 20 && dt < LOAD_TIMEOUT_MS + 300 && warns.length === 1);
}

console.log('\n[store · pagehide + hidden] a pending save starts its write IN the event, no 250 ms wait');
{
  warns.length = 0;
  const idb = fakeIDB();
  globalThis.indexedDB = idb.factory;
  const win = {}, doc = {};
  globalThis.addEventListener = (t, fn) => { (win[t] ??= []).push(fn); };
  globalThis.document = { visibilityState: 'visible', addEventListener: (t, fn) => { (doc[t] ??= []).push(fn); } };
  const st = createStore({ name: 'hide', version: 1 });
  await st.load();
  ok('listens for pagehide and visibilitychange', win.pagehide?.length === 1 && doc.visibilitychange?.length === 1);
  win.pagehide[0]({});
  ok('pagehide with nothing pending writes nothing', idb.log.rw === 0);
  st.save(S(13));
  win.pagehide[0]({});
  ok('pagehide: the transaction opens synchronously, inside the event', idb.log.rw === 1);
  await sleep(20);
  ok('…and lands', idb.log.writes.at(-1)?.row.bpm === 113);
  st.save(S(14));
  globalThis.document.visibilityState = 'hidden';
  doc.visibilitychange[0]({});
  ok('hidden: the same', idb.log.rw === 2);
  idb.cfg.writeDelay = 80;
  st.save(S(15)); await sleep(SAVE_DELAY_MS + 10);     // S15 in flight
  st.save(S(16));
  win.pagehide[0]({});
  ok('pagehide during a write opens the next one at once (IndexedDB keeps them in order)', idb.log.rw === 4);
  await sleep(200);
  ok('…and the newest lands last', idb.log.writes.at(-1)?.row.bpm === 116 && idb.log.writes.at(-2)?.row.bpm === 115);
  delete globalThis.addEventListener;
  delete globalThis.document;
  ok('no warning', warns.length === 0, JSON.stringify(warns));
}

console.warn = realWarn;
delete globalThis.indexedDB;
console.log(`\n${fail ? '✗' : '✓'} db: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
