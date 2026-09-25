// SIGNAL · THE HARMONY (src/signal/harmony.ts · lane H · R1): the contract's Harmony, composed from this lane's leaves —
// music.ts (key/scale/octave → MIDI, the press-time triads), arp.ts (HOLD/ARP/the arp steps/the gate row on the lattice),
// chords.ts (the rack), chord-name.ts (the naming law). Map: docs/signal-map/D-time-arp-chords.md §2-§5. Imports:
// ./types.ts and this lane's files; keys, bass, time, effects and ctx arrive through createHarmony's deps.
//
// from signal-studio-v6lib/src/views/instrument/play.ts:195-209, 292-345, 352-358, 378-396, 580-589 (2a9e4a7) — ADAPTED
//   to MIDI ids and the contract's Harmony: the hand (press/release, the CHORD extensions, stage keys) and MOVE/octave.
// from signal-studio-v6lib/src/views/instrument/chord-rack.ts:109-138 (2a9e4a7) via chords.ts — the pads and the bass pin.
//
// THE HAND (play.ts:292-345 adapted). keyDown(id, midi, chord?) is one press: the note (and, under CHORD, its '~'
// extensions `id~0`, `id~1`) goes through the latch/arp machine, which sounds it on keys.noteOn or, with the arp
// running, pools it for the steps. Letters are 'k' ids: keyDown('k' + code, midiFor(offset, colour)); the triad is
// derived at PRESS TIME from the note and the key (music.ts triadForMidi = the colour rule: a note of the key → its
// diatonic triad, a colour cap → a major triad on itself, FREE → major) unless the caller passes one, and it rides
// with the note into the arp pool (the D §2.2 fix). Stage keys ('p' ids) sound their own pitch: never chorded, never
// moved (play.ts:352-358). keyUp releases the note and every extension its press started (play.ts:338-339).
// HOLD UNDER CHORD (R3, the contract's law above HarmonyState): with HOLD + CHORD a letter that starts a new chord first
// flushes the latch (machine.flushLatch: every held id no finger holds, the pool under ARP), so one chord rings at a
// time; tap-again, fingers, the pedal without CHORD and the pads under HOLD (chords.ts) are unchanged.
//
// MOVE (play.ts:195-209, 378-396, 589). ←/→ with a letter sounding (or held, or in the pool) walks it and its triad
// through the key: root = stepMidi(base, shift), extensions = the diatonic triad on the moved root, shift clamped ±14,
// re-pitched in place (keys.retune; the pool's next step reads it). A letter pressed while a chord is moved plays moved;
// the first press after silence resets the shift. With nothing sounding ←/→ steps the octave (−1..+1).
//
// BEYOND THE CONTRACT (additive; the object satisfies Harmony, createHarmony satisfies CreateHarmony):
//   sounding()      [id, midi] ascending: what sounds, the arp pool while the arp runs. keys.held() is EMPTY under ARP
//                   (the arp books one-shots), so the chord glass and the stamp read this.
//   shift()         the MOVE amount (the OCTAVE glass reads MOVE ±n while a chord is moved).
//   chordActive()   a letter sounds, is held or is pooled (←/→ = MOVE, else the octave).
//   pad(i)          the view's data for pad i: notes, label, degree, sel, lean, on (chords.ts PadFace).
//   onChange(cb)    state() changed inside (a stamp, a clear, a MOVE-less ←/→ octave, the master stop's switches).
//
// DIVE SPEED (R2). The machine (arp.ts) glides the keys with keys.bend(cents, dive.speedSec) — the contract's τ — and
// dives the bass with bass.gesture('dive', true, cents), which carries no τ. So the machine holds a bass whose dive-on
// adds dive.speedSec as a 4th argument (bass.ts: the fall's τ, a superset of the contract): the keys and the drone fall
// at the one SPEED; the way back stays the Studio's .07 on both (core.ts:969). The gate row + the exact chop pass through.

import type { Bass, Booking, CreateHarmony, GateDiv, Harmony, HarmonyDeps, HarmonyState, ArpDiv } from './types.ts';
import { ARP_DIVS, GATE_DIVS } from './types.ts';
import { MUSIC_DEFAULT, midiForOffset, normMusic, stepMidi, triadForMidi } from './music.ts';
import { createArp, LENGTH_MAX, LENGTH_MIN, VEL } from './arp.ts';
import type { ArpNote } from './arp.ts';
import { createChords, RACK_SIZE } from './chords.ts';
import type { PadFace } from './chords.ts';
import { nameChord } from './chord-name.ts';
import type { ChordCtx } from './chord-name.ts';

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const isArpDiv = (v: unknown): v is ArpDiv => (ARP_DIVS as readonly unknown[]).includes(v);
const isGateDiv = (v: unknown): v is GateDiv => (GATE_DIVS as readonly unknown[]).includes(v);

/** The MOVE shift's reach (play.ts:382). */
export const SHIFT_MAX = 14;
/** DIVE's ranges (play.ts:866): SPEED 0.05..1.5 s, DIST 2..36 st. */
export const DIVE_SPEED_MIN = 0.05, DIVE_SPEED_MAX = 1.5, DIVE_DIST_MIN = 2, DIVE_DIST_MAX = 36;

export function defaultHarmonyState(): HarmonyState {
  return {
    music: { ...MUSIC_DEFAULT },
    chord: false,
    hold: false,
    arp: { on: false, div: '1/8', length: 0.5, groove: 0 },
    rack: new Array(RACK_SIZE).fill(null),
    gate: { div: '1/16', swing: 0 },
    dive: { speedSec: 0.45, dist: 24 },
  };
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {});

function normArp(v: unknown, prev: HarmonyState['arp']): HarmonyState['arp'] {
  const o = obj(v);
  return {
    on: typeof o.on === 'boolean' ? o.on : prev.on,
    div: isArpDiv(o.div) ? o.div : prev.div,
    length: clamp(num(o.length, prev.length), LENGTH_MIN, LENGTH_MAX),
    groove: clamp(num(o.groove, prev.groove), 0, 1),
  };
}
function normGate(v: unknown, prev: HarmonyState['gate']): HarmonyState['gate'] {
  const o = obj(v);
  return { div: isGateDiv(o.div) ? o.div : prev.div, swing: clamp(num(o.swing, prev.swing), 0, 1) };
}
function normDive(v: unknown, prev: HarmonyState['dive']): HarmonyState['dive'] {
  const o = obj(v);
  return {
    speedSec: clamp(num(o.speedSec, prev.speedSec), DIVE_SPEED_MIN, DIVE_SPEED_MAX),
    dist: clamp(num(o.dist, prev.dist), DIVE_DIST_MIN, DIVE_DIST_MAX),
  };
}

/** A letter's press: its base note (unmoved) and the chord it was pressed with (root first). */
interface Letter { base: number; chord0: number[] }

export function createHarmony(d: HarmonyDeps): Harmony & {
  sounding(): Array<[string, number]>;
  shift(): number;
  chordActive(): boolean;
  pad(i: number): PadFace | null;
  onChange(cb: () => void): () => void;
} {
  const { keys, bass } = d;
  const st = defaultHarmonyState();
  let shift = 0;
  const letters = new Map<string, Letter>();   // 'k' id → its press (MOVE re-derives from it)
  const exts = new Map<string, string[]>();    // id → the '~' extension ids its press started (released on keyUp)
  const changeCbs = new Set<() => void>();
  const emit = (): void => { for (const cb of Array.from(changeCbs)) { try { cb(); } catch { /* a listener never breaks a key */ } } };

  // ── the bass hears what sounds, once per operation (core.ts:1671-1672: the arp pool while the arp runs) ──
  let dirty = false, lastSent = '';
  const flush = (): void => {
    if (!dirty) return;
    dirty = false;
    const notes = machine.sounding().map(([, m]) => m).sort((a, b) => a - b);
    const key = notes.join(',');
    if (key === lastSent) return;
    lastSent = key;
    try { bass.held(notes); } catch { /* */ }
  };

  // DIVE SPEED reaches the bass (the header's R2 note): the machine's bass = the real one, with the fall's τ on dive-on
  type BassX = Bass & { gesture(name: 'gate' | 'dive', on: boolean, arg?: number, tauSec?: number): void; chop?: (when: number, stepSec: number) => void };
  const bassX = bass as BassX;
  const arpBass = {
    gesture(name: 'gate' | 'dive', on: boolean, arg?: number): void {
      if (name === 'dive' && on) bassX.gesture(name, on, arg, st.dive.speedSec);
      else if (arg === undefined) bassX.gesture(name, on);   // passed through exactly as the machine sent it
      else bassX.gesture(name, on, arg);
    },
    chop(when: number, stepSec: number): void { if (typeof bassX.chop === 'function') bassX.chop(when, stepSec); },
  };

  const machine = createArp({
    keys, bass: arpBass, effects: d.effects, time: d.time, ctx: d.ctx,
    params: () => ({
      div: st.arp.div, length: st.arp.length, groove: st.arp.groove, chord: st.chord,
      gateDiv: st.gate.div, gateSwing: st.gate.swing, diveSpeed: st.dive.speedSec, diveDist: st.dive.dist,
    }),
    onChange: () => { dirty = true; },
  });

  const chordCtx = (): ChordCtx => ({ keyRoot: st.music.key, scaleMode: st.music.scale });

  const chords = createChords({
    noteOn: (id, midi, vel) => { machine.noteOn(id, midi, triadForMidi(st.music, midi), vel); },
    noteOff: (id) => machine.noteOff(id),
    release: (id) => machine.release(id),
    sounding: () => machine.sounding(),
    latch: () => machine.latch(),
    ctx: chordCtx,
    bass,
    onCapture: () => machine.flushLatch(),
  });

  // The keys put every voice down on their own (blur, a hidden tab, the master stop: keys.allOff) and report an empty
  // held set. Once this task's own work is done (a microtask: our own releases also pass through empty), a model that
  // still holds voices while the keys hold none is stale — HOLD's latched notes are silent — so it forgets them, and a
  // tap on a latched key sounds again instead of "releasing" a note nobody hears.
  if (typeof keys.onHeldChange === 'function') {
    keys.onHeldChange((held) => {
      if (held.length) return;
      queueMicrotask(() => {
        if (keys.held().length || machine.arpOn() || !machine.sounding().length) return;
        machine.forget();
        chords.sync();
        flush();
      });
    });
  }

  const isLetter = (id: string): boolean => id.charCodeAt(0) === 107;   // 'k'
  function chordActive(): boolean {
    for (const [id] of machine.sounding()) if (isLetter(id)) return true;
    for (const id of machine.down()) if (isLetter(id)) return true;
    return false;
  }

  /** The chord a letter plays at `s` MOVE steps: the root walked through the key, the triad re-derived on it, any
   *  note beyond the triad walked alone (play.ts:387-389). s = 0 → the press-time chord. */
  function movedChord(l: Letter, s: number): number[] {
    if (!s) return l.chord0.slice();
    const m = st.music, root = clamp(stepMidi(m, l.base, s), 0, 127), t = triadForMidi(m, root);
    return l.chord0.map((n, k) => (k === 0 ? root : clamp(k <= 2 ? t[k] : stepMidi(m, n, s), 0, 127)));
  }

  /** The chord param → root first: the caller's notes minus one occurrence of the root, in order. */
  function chordFrom(midi: number, chord: number[] | undefined): number[] | null {
    if (!Array.isArray(chord)) return null;
    const rest = chord.filter((n) => Number.isFinite(n));
    const at = rest.indexOf(midi);
    if (at >= 0) rest.splice(at, 1);
    return [midi, ...rest];
  }

  function keyDown(id: string, midi: number, chord?: number[]): void {
    if (typeof id !== 'string' || !id || !Number.isFinite(midi)) return;
    const letter = isLetter(id);
    // HOLD UNDER CHORD (R3, types.ts above HarmonyState): a letter that starts a NEW chord (not ringing, not under a
    // finger) SWITCHES — everything the hold owns (latched ids no finger holds: letters + their '~' ids, stage keys, pad
    // tones; the pool under ARP) releases first, then this chord takes over the hold. Tap-again (a ringing id) keeps the
    // toggle path below; HOLD without CHORD stacks as before.
    if (letter && st.chord && machine.latch() && !machine.has(id) && !machine.isDown(id)) {
      machine.flushLatch();
      for (const k of Array.from(exts.keys())) if (!machine.has(k) && !machine.isDown(k)) exts.delete(k);
      for (const k of Array.from(letters.keys())) if (!machine.has(k) && !machine.isDown(k)) letters.delete(k);
      chords.sync();                           // a pad the flush silenced is not latched any more: its bass pin drops
    }
    if (letter && !chordActive()) shift = 0;   // a FRESH chord starts unmoved (play.ts:303-307)
    const chord0 = chordFrom(midi, chord) ?? triadForMidi(st.music, midi);
    let notes = chord0;
    if (letter) { const l: Letter = { base: midi, chord0 }; letters.set(id, l); notes = movedChord(l, shift); }
    const res = machine.noteOn(id, notes[0], notes, VEL);
    // CHORD adds the extensions as their own ids (play.ts:317-324); stage keys are never chorded (play.ts:352-358)
    const chorded = st.chord && id.charCodeAt(0) !== 112 && id.indexOf('~') < 0;   // 'p'
    if (chorded && res === 'on') {
      const ids: string[] = [];
      notes.slice(1).forEach((n, k) => { const eid = `${id}~${k}`; machine.noteOn(eid, n, [n], VEL); ids.push(eid); });
      exts.set(id, ids);
    } else if (res === 'off') {
      // HOLD's tap-again released the root: its extensions go with it, and none is started
      for (const eid of exts.get(id) ?? []) machine.release(eid);
      exts.delete(id);
    }
    flush();
  }

  function keyUp(id: string): void {
    if (typeof id !== 'string') return;
    machine.noteOff(id);
    const ids = exts.get(id);
    if (ids && !machine.has(id)) exts.delete(id);   // keep the record while HOLD rings it (tap-again releases them)
    for (const eid of ids ?? []) machine.noteOff(eid);
    flush();
  }

  function retuneLetters(): void {
    const map: Record<string, ArpNote> = {};
    for (const [id, l] of letters) {
      const eids = exts.get(id) ?? [];
      if (!machine.has(id) && !eids.some((e) => machine.has(e))) continue;
      const notes = movedChord(l, shift);
      map[id] = { midi: notes[0], triad: notes };
      eids.forEach((eid, k) => { const n = notes[k + 1]; if (n != null) map[eid] = { midi: n, triad: [n] }; });
    }
    machine.retune(map);
  }

  function transpose(dir: -1 | 1): void {
    const dd = dir < 0 ? -1 : 1;
    if (chordActive()) {
      const next = clamp(shift + dd, -SHIFT_MAX, SHIFT_MAX);
      if (next === shift) return;
      shift = next;
      retuneLetters();
      flush();
      emit();
      return;
    }
    const m = normMusic({ ...st.music, oct: st.music.oct + dd }, st.music);
    if (m.oct === st.music.oct) return;
    st.music = m;
    emit();
  }

  function set<K extends keyof HarmonyState>(k: K, v: HarmonyState[K]): void {
    const x: unknown = v;
    switch (k) {
      case 'music': st.music = normMusic(x, st.music); chords.sync(); break;   // a key travel can rename a pad's root
      case 'chord': if (typeof x === 'boolean') st.chord = x; break;
      case 'hold': if (typeof x === 'boolean') { machine.setLatch(x); chords.sync(); } break;
      case 'arp': st.arp = normArp(x, st.arp); machine.setArp(st.arp.on); chords.sync(); break;
      case 'rack': chords.load(x); break;
      case 'gate': st.gate = normGate(x, st.gate); break;
      case 'dive': st.dive = normDive(x, st.dive); break;
      default: return;
    }
    flush();
    emit();
  }

  function state(): HarmonyState {
    return {
      music: { ...st.music },
      chord: st.chord,
      hold: machine.latch(),
      arp: { ...st.arp, on: machine.arpOn() },
      rack: chords.rack(),
      gate: { ...st.gate },
      dive: { ...st.dive },
    };
  }

  function stop(): void {
    chords.releaseAll();   // pads released; the rack's bass pin dropped
    machine.stop();        // pool cleared, every held id noteOff, HOLD + ARP off, the gate released, DIVE returned
    st.arp = { ...st.arp, on: false };
    letters.clear(); exts.clear(); shift = 0;
    dirty = true; flush();
    emit();
  }

  const harmony = {
    state,
    set,
    midiFor: (offset: number, colour: boolean): number => midiForOffset(st.music, offset, !!colour),
    name(notes: number[]): { label: string; degree: string | null } {
      const r = nameChord(Array.isArray(notes) ? notes : [], chordCtx());
      return { label: r.label, degree: r.degree };
    },
    trigger(i: number, clear = false): void {
      const before = JSON.stringify(chords.rack());
      chords.trigger(i, !!clear);
      flush();
      if (JSON.stringify(chords.rack()) !== before) emit();
    },
    release(i: number): void { chords.release(i); flush(); },
    keyDown,
    keyUp,
    book(b: Booking): void { machine.book(b); },
    gesture(name: 'gate' | 'dive', on: boolean): void { machine.gesture(name, !!on); },
    transpose,
    stop,
    sounding: () => machine.sounding(),
    shift: () => shift,
    chordActive,
    pad: (i: number) => chords.face(i),
    onChange(cb: () => void): () => void { changeCbs.add(cb); return () => { changeCbs.delete(cb); }; },
  };
  return harmony;
}

createHarmony satisfies CreateHarmony;
