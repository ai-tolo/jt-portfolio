// SIGNAL · THE ARP, THE LATCH, THE GATE, THE DIVE (src/signal/arp.ts · lane H · R1). The Studio core's held-note model
// and its three tick loops (arp, gate) moved off the core's float accumulators onto THE LATTICE: every event is BOOKED
// inside the step the Timekeeper announces, at a line of its own division. Map: docs/signal-map/D-time-arp-chords.md
// §2 (the arp, HOLD, the gate row) and §7 (the port row). Imports: ./types.ts only; the keys, the bass, the effects
// and the clock arrive as instances (createArp's deps), so the suite drives it with fakes.
//
// from signal-studio-v6lib/src/engine/core.ts:864-935 (2a9e4a7) — THE HELD-NOTE MODEL, the laws exactly (D §2.4):
//   no arp: a held id's second noteOn under HOLD RELEASES it (tap-again, 875); noteOff under HOLD is a no-op (890);
//   HOLD off frees every voice, even under a finger (934). arp: noteOn under HOLD toggles the id out of the pool (872);
//   noteOff drops it only without HOLD (889); HOLD off keeps only notes still physically down (934). ARP on MOVES the
//   sounding voices into the pool (929); ARP off clears the pool AND every voice, keys under a finger included (930).
//   ADAPTED: ids carry MIDI + the TRIAD CARRIED FROM PRESS TIME (never re-derived from pitch: the D §2.2 defect);
//   `fingers` is the facade's physDown (engine/index.ts:317-323), so HOLD-off-under-ARP prunes to what a finger holds.
//   ARP on and GATE on join at their own next line ≥ now + 20 ms inside the window already announced (the core's
//   gridNext at the press, core.ts:929/965), so neither waits out the horizon; the gate's SWING pairs follow the
//   lattice (even lines long) where the core reset its pair count per press.
// from signal-studio-v6lib/src/engine/core.ts:1344-1386 (2a9e4a7) — THE ARP STEP: roots = pool ids without '~', sorted
//   ascending by pitch; arpIdx walks them mod their count and resets only when nothing is held; CHORD + ARP = a strummed
//   BLOCK every step (the roots' triads, deduped, ascending, 8 ms apart capped at .45·step, vel clamp(.92/√n, .32, .9));
//   LENGTH = the Studio's `gate` 0.06..1.3: each pluck lives step·gate; GROOVE = the G mode, its tables VERBATIM,
//   reading (bar, step) off the Booking instead of the core's stale float origin (core.ts:1362, D §1.3).
// from signal-studio-v6lib/src/engine/core.ts:847-851 (2a9e4a7) — pluck(): a booked one-shot of max(18 ms, life) →
//   keys.hit(midi, when, durSec, vel) (C §2: the fed sample voice's hit()).
// from signal-studio-v6lib/src/engine/core.ts:950-978, 1217-1220, 1387-1398 (2a9e4a7) — THE GATE ROW: each chop books
//   effects.chop + the bass's gate, SWING alternating sd·(1 ± sw/3); release = releaseGate on both; DIVE = every voice
//   glides −dist·100 cents (τ SPEED down, .07 back) through keys.bend and bass.gesture('dive').
// from signal-studio-v6lib/src/engine/prng.ts:36-49 (2a9e4a7) — mulberry32 for hum() (core.ts:244 hum = rng.bi()).
//
// BEYOND THE CONTRACT, used only when the instance offers it (feature-detected, never required):
//   keys.bend(cents, tauSec)   lane K's optional τ: DIVE SPEED reaches the keys. The contract's bend(cents) has no τ.
//   bass.chop(when, stepSec)   lane B's frame-exact gate chop; the contract's gesture('gate', true, sd) carries no time.

import type { ArpDiv, Bass, Booking, Effects, GateDiv, Keys, Line, Timekeeper } from './types.ts';

// ─────────────────────────────────────────────────────────────── divisions

/** Lines per BEAT (the Studio's fx.arpDiv, dsp.ts:71-80; the gate's GATE_RATES, play.ts:80-82). */
export const ARP_PER_BEAT: Readonly<Record<ArpDiv, number>> = { '1/4': 1, '1/8': 2, '1/8T': 3, '1/16': 4, '1/16T': 6, '1/32': 8 };
export const GATE_PER_BEAT: Readonly<Record<GateDiv, number>> = { '1/8': 2, '1/8T': 3, '1/16': 4, '1/16T': 6, '1/32': 8 };
/** LENGTH's range: the Studio's fx.gate, clamp(0.06, 1.3) (core.ts:1354; play.ts:809). */
export const LENGTH_MIN = 0.06;
export const LENGTH_MAX = 1.3;
/** The Studio's keyboard velocity (core.ts:869) and the arp's single-note velocity (core.ts:1360). */
export const VEL = 0.9;

// ─────────────────────────────────────────────────────────────── the G-mode tables

// from signal-studio-v6lib/src/engine/core.ts:1347-1350 (2a9e4a7) — VERBATIM
export const HITn = [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0], SWn = [0, 0, 0.1, 0.16, 0, 0, 0.1, 0.16, 0, 0, 0.1, 0, 0, 0.08, 0.1, 0],
  VELn = [1.0, 1, 0.55, 0.42, 1.0, 1, 0.62, 0.45, 0.95, 1, 0.58, 1, 1.0, 0.5, 0.66, 1], LENn = [1.05, 1, 0.7, 0.62, 1.1, 1, 0.72, 0.62, 0.95, 1, 0.7, 1, 1.1, 0.66, 0.72, 1];
export const HITcA = [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0], HITcB = [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0], HITcC = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0],
  LEANc = [0, 0, 0, 0.2, 0, 0, 0.3, 0, 0, 0, 0.25, 0.35, 0, 0, 0.4, 0], VELc = [1, 1, 1, 0.85, 1, 1, 1.0, 1, 1, 1, 0.78, 0.55, 1, 1, 0.92, 1], LENc = [1, 1, 1, 0.58, 1, 1, 0.7, 1, 1, 1, 0.82, 0.5, 1, 1, 0.8, 1];
/** from core.ts:1363 — the chord variant per bar of an 8-bar cycle: A A B A A A B C (0 = A, 1 = B, 2 = C). */
export const CHORD_CYCLE = [0, 0, 1, 0, 0, 0, 1, 2];

// from signal-studio-v6lib/src/engine/dsp.ts:7 (2a9e4a7)
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

// ─────────────────────────────────────────────────────────────── pure laws

/** from core.ts:1363 — the bar/step hash r2 ∈ [0, 1) that jitters a G-mode hit (verbatim arithmetic). */
export function grooveHash(bar: number, s: number): number {
  const hsh = (((bar * 16 + s) >>> 0) * 2654435761) >>> 0;
  return (((hsh ^ 0x9e3779b9) >>> 0) % 1000) / 1000;
}

/** from core.ts:1363-1368 — does G mode sound on 16th `s` of `bar` (RATE thins or fills: ≤1 per beat → quarters only,
 *  ≥4 → odd 16ths added as ghosts, ≥8 → every 16th). `ghost` = a RATE-added ghost (vel ≤ .3, len ≤ .55). */
export function grooveHit(s: number, bar: number, chord: boolean, perBeat: number): { hit: boolean; ghost: boolean } {
  const sel = CHORD_CYCLE[((bar % 8) + 8) % 8];
  const HIT = chord ? (sel === 1 ? HITcB : sel === 2 ? HITcC : HITcA) : HITn, dv = perBeat;
  let hit = HIT[s] === 1, ghost16 = false;
  if (dv <= 1) hit = hit && s % 4 === 0;
  if (dv >= 4 && !hit) { hit = s % 2 === 1; ghost16 = true; }
  if (dv >= 8 && !hit) { hit = true; ghost16 = true; }
  return { hit, ghost: ghost16 };
}

/** from core.ts:1370-1375 — one G-mode hit's shape: its offset after the line (ms, before the clamp), its velocity
 *  multiplier and its life (ms). `hum` is the core's hum() draw (bipolar −1..1), taken only for a hit. */
export function grooveShape(s: number, bar: number, chord: boolean, ghost: boolean, A: number, sixteenthSec: number,
  lifeMs: number, hum: number): { offMs: number; vMul: number; lifeMs: number } {
  const r2 = grooveHash(bar, s);
  const offMs = (chord ? LEANc[s] : SWn[s]) * sixteenthSec * 1000 * (0.3 + 0.7 * A) + (chord ? 14 : 8) * A + (r2 - 0.5) * 2 * A * 6;
  let vBase = chord ? VELc[s] : VELn[s]; if (ghost) vBase = Math.min(vBase, 0.3);
  const vMul = (1 + (vBase - 1) * A) * (1 + hum * 0.05 * A);
  let lBase = chord ? LENc[s] : LENn[s]; if (ghost) lBase = Math.min(lBase, 0.55);
  const grooveLife = Math.max(chord ? 34 : 40, lifeMs * (1 + (lBase - 1) * A));
  return { offMs, vMul, lifeMs: grooveLife };
}

/** from core.ts:1357 — CHORD + ARP: the union of the roots' carried triads, deduped (the core dedupes within 0.5 Hz;
 *  MIDI is exact), ascending. */
export function chordBlock(triads: ReadonlyArray<ReadonlyArray<number>>): number[] {
  const block: number[] = [];
  for (const t of triads) for (const n of t) if (Number.isFinite(n) && n > 0 && !block.includes(n)) block.push(n);
  return block.sort((a, b) => a - b);
}

/** from core.ts:1358 — the block's per-note velocity. */
export function blockVel(n: number): number {
  return clamp(0.92 / Math.sqrt(n || 1), 0.32, 0.9);
}

/** from core.ts:850 — a pluck's booked length in seconds (≥ 18 ms). */
export function pluckSec(lifeMs: number): number {
  return Math.max(0.018, (lifeMs || 150) / 1000);
}

// from signal-studio-v6lib/src/engine/prng.ts:36-49 (2a9e4a7) — mulberry32; bi() = next()·2 − 1 (the core's hum())
export function makeHum(seed = 0x9e3779b9): () => number {
  let s = seed >>> 0;
  const next = (): number => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => next() * 2 - 1;
}

// ─────────────────────────────────────────────────────────────── the machine

/** A held note: its MIDI and the chord CARRIED FROM PRESS TIME (root first; [midi] when it has none). */
export interface ArpNote { midi: number; triad: number[] }

/** What the machine reads at book/gesture time (the harmony's state). */
export interface ArpParams {
  div: ArpDiv;
  length: number;        // LENGTH 0.06..1.3 (the Studio's `gate`)
  groove: number;        // 0..1 (0 = straight RATE lines)
  chord: boolean;        // CHORD: the arp strums each root's triad as a block
  gateDiv: GateDiv;
  gateSwing: number;     // 0..1
  diveSpeed: number;     // s: τ of the fall
  diveDist: number;      // semitones
}

export interface ArpDeps {
  keys: Pick<Keys, 'noteOn' | 'noteOff' | 'hit' | 'bend' | 'allOff' | 'retune'>;
  bass: Pick<Bass, 'gesture'>;
  effects: Pick<Effects, 'chop' | 'releaseGate'>;
  time: Pick<Timekeeper, 'grid' | 'nextLine'>;
  ctx: { readonly currentTime: number };
  params(): ArpParams;
  /** hum(): a bipolar draw −1..1 per G-mode hit (default: mulberry32 at the Studio's seed). */
  hum?: () => number;
  /** The sounding set changed (the harmony tells the bass). */
  onChange?: () => void;
}

export type NoteOnResult = 'on' | 'off' | 'none';

export interface Arp {
  /** A key/pad/stage note down. 'on' = it sounds (or joined the pool), 'off' = HOLD's tap-again released it,
   *  'none' = ignored (a repeat of a sounding id without HOLD). */
  noteOn(id: string, midi: number, triad?: ReadonlyArray<number>, vel?: number): NoteOnResult;
  noteOff(id: string): void;
  /** Force one id out (a latched pad yielding, chord-rack.ts:107): out of the pool, its voice released. */
  release(id: string): void;
  /** ←/→ MOVE: re-pitch sounding ids in place (keys.retune for held voices; the pool's next step reads the new note). */
  retune(map: Readonly<Record<string, ArpNote>>): void;
  setArp(on: boolean): void;
  setLatch(on: boolean): void;
  arpOn(): boolean;
  latch(): boolean;
  /** The SOUNDING set, [id, midi] ascending: the pool while the arp runs, else every held voice (HOLD included). */
  sounding(): Array<[string, number]>;
  has(id: string): boolean;
  isDown(id: string): boolean;
  /** Ids a finger holds (between noteOn and noteOff). */
  down(): string[];
  /** R12.1 (play.ts:258-271): a stamp consumes what it captured: every latched id no finger holds is released. */
  flushLatch(): void;
  /** The keys went silent without us (their own allOff on blur / a hidden tab / the master stop): forget the held
   *  voices, latched ones included, without sending a noteOff. The pool (a pattern, not a voice) stays. */
  forget(): void;
  /** The scheduler's hook: the arp's own lines + the gate's chops inside [b.frame, the next 16th). */
  book(b: Booking): void;
  gesture(name: 'gate' | 'dive', on: boolean): void;
  gate(): boolean;
  dive(): boolean;
  /** Master stop: pool cleared, every voice released, HOLD and ARP off (core.ts:1957), gate released, DIVE back. */
  stop(): void;
}

const cleanTriad = (t: ReadonlyArray<number> | undefined, midi: number): number[] => {
  const out = Array.isArray(t) ? t.filter((n) => Number.isFinite(n)) : [];
  return out.length ? out : [midi];
};

export function createArp(d: ArpDeps): Arp {
  const { keys, bass, effects, time, ctx } = d;
  const hum = d.hum ?? makeHum();
  const bendX = keys as unknown as { bend(cents: number, tauSec?: number): void };
  const bassX = bass as unknown as { chop?: (when: number, stepSec: number) => void };

  // ── held-note model (core.ts:864-866) ──
  const voices = new Map<string, ArpNote & { vel: number }>();   // non-arp: the sounding sustained voices (the core's held)
  const pool = new Map<string, ArpNote>();                        // the arp's set (the core's arpSet)
  const fingers = new Set<string>();                               // ids between noteOn and noteOff (the facade's physDown)
  let arpOn = false, latch = false, arpIdx = 0;
  let gateOn = false, diveOn = false;

  const changed = (): void => { try { d.onChange?.(); } catch { /* the bass must never break a key */ } };

  // from core.ts:869-886 — noteOn
  function noteOn(id: string, midi: number, triad?: ReadonlyArray<number>, vel = VEL): NoteOnResult {
    if (typeof id !== 'string' || !Number.isFinite(midi)) return 'none';
    const note: ArpNote = { midi, triad: cleanTriad(triad, midi) };
    fingers.add(id);
    if (arpOn) {
      if (latch && pool.has(id)) { pool.delete(id); changed(); return 'off'; }   // core.ts:872 — tap-again toggles out
      pool.set(id, note); changed(); return 'on';                                // core.ts:873
    }
    if (voices.has(id)) {                                                        // core.ts:875
      if (!latch) return 'none';
      voices.delete(id); keys.noteOff(id); changed(); return 'off';
    }
    voices.set(id, { ...note, vel });                                            // core.ts:877, 880
    keys.noteOn(id, midi, vel);
    changed();
    return 'on';
  }

  // from core.ts:887-894 — noteOff
  function noteOff(id: string): void {
    fingers.delete(id);
    if (arpOn) { if (!latch && pool.delete(id)) changed(); return; }             // core.ts:889
    if (latch && voices.has(id)) return;                                         // core.ts:890 — latched: keeps ringing
    if (voices.delete(id)) { keys.noteOff(id); changed(); }                      // core.ts:891-892
  }

  function release(id: string): void {
    let ch = pool.delete(id);
    if (voices.delete(id)) { keys.noteOff(id); ch = true; }
    if (ch) changed();
  }

  // from core.ts:1936-1941 — retune: the pool's note moves (the next step reads it), a held voice glides in place
  function retune(map: Readonly<Record<string, ArpNote>>): void {
    const glide: Record<string, number> = {};
    let ch = false, any = false;
    for (const id of Object.keys(map)) {
      const n = map[id];
      if (!n || !Number.isFinite(n.midi)) continue;
      const note: ArpNote = { midi: n.midi, triad: cleanTriad(n.triad, n.midi) };
      if (pool.has(id)) { pool.set(id, note); ch = true; }
      const v = voices.get(id);
      if (v) { voices.set(id, { ...note, vel: v.vel }); glide[id] = n.midi; ch = any = true; }
    }
    if (any) keys.retune(glide);
    if (ch) changed();
  }

  // from core.ts:926-931 — setArp
  function setArp(on: boolean): void {
    if (on && !arpOn) {
      for (const [id, v] of voices) { keys.noteOff(id); pool.set(id, { midi: v.midi, triad: v.triad }); }
      voices.clear();
      arpOn = true; arpIdx = 0;
      keys.allOff();
      arpCatchUp();
      changed();
    } else if (!on && arpOn) {
      arpOn = false; pool.clear();
      for (const id of voices.keys()) keys.noteOff(id);
      voices.clear();
      keys.allOff();   // the plucks already booked inside the horizon go with it (core.ts:930 keysSink.allOff)
      changed();
    }
  }

  // from core.ts:932-935 — setLatch
  function setLatch(on: boolean): void {
    if (latch === on) return;   // the core re-ran HOLD-off's release on a no-op write; a toggle is the only writer here
    latch = on;
    if (on) return;
    if (arpOn) { for (const id of Array.from(pool.keys())) if (!fingers.has(id)) pool.delete(id); }
    else { for (const id of voices.keys()) keys.noteOff(id); voices.clear(); keys.allOff(); }
    changed();
  }

  function sounding(): Array<[string, number]> {
    const src: Map<string, ArpNote> = arpOn ? pool : voices;
    return Array.from(src, ([id, n]): [string, number] => [id, n.midi]).sort((a, b) => a[1] - b[1]);
  }

  function flushLatch(): void {
    if (!latch) return;
    for (const id of Array.from((arpOn ? pool : voices).keys())) if (!fingers.has(id)) release(id);
  }

  function forget(): void {
    if (!voices.size) return;
    voices.clear();
    changed();
  }

  // ── booking on the lattice ──
  const lines = (perBar: number, from: number, end: number, fn: (l: Line) => void): void => {
    let f = from;
    for (let guard = 0; guard < 64; guard++) {
      const l = time.nextLine(perBar, f);
      if (!l || !(l.frame >= f) || l.frame >= end) return;
      fn(l);
      f = l.frame + 1;
    }
  };
  const pluck = (midi: number, vel: number, lifeMs: number, when: number): void => {
    keys.hit(midi, when, pluckSec(lifeMs), vel);
  };
  const roots = (): ArpNote[] =>
    Array.from(pool, ([id, n]) => ({ id, n })).filter((e) => e.id.indexOf('~') < 0).map((e) => e.n).sort((a, b) => a.midi - b.midi);

  // from core.ts:1361-1381 — G mode: a step EVERY 16th whatever RATE says (the lattice always has an origin), on the
  // 16th line at `frame`, step `s` of `bar`
  function grooveStep(frame: number, bar: number, step: number, p: ArpParams, sr: number, barSec: number): void {
    const rs = roots();
    if (!rs.length) { arpIdx = 0; return; }
    const perBeat = ARP_PER_BEAT[p.div] ?? 2;
    const A = clamp(Number.isFinite(p.groove) ? p.groove : 0, 0, 1);
    const six = barSec / 16, t = frame / sr, s = ((step % 16) + 16) % 16;
    const life = six * 1000 * gateOf(p);
    const { hit, ghost } = grooveHit(s, bar, p.chord, perBeat);
    if (!hit) return;
    const g = grooveShape(s, bar, p.chord, ghost, A, six, life, hum());
    const when = clamp(t + g.offMs / 1000, ctx.currentTime + 0.002, t + 0.45 * six);
    if (p.chord) {
      const block = chordBlock(rs.map((r) => r.triad)), cv = blockVel(block.length);
      block.forEach((n, bi) => pluck(n, clamp(cv * g.vMul, 0.06, 1), g.lifeMs, when + Math.min(bi * 0.008, six * 0.45)));
    } else { const r = rs[arpIdx % rs.length]; pluck(r.midi, clamp(VEL * g.vMul, 0.06, 1), g.lifeMs, when); arpIdx++; }
  }

  // from core.ts:1351-1360, 1383 — RATE: every line of the arp's own division in [from, end)
  function rateLines(from: number, end: number, p: ArpParams, sr: number, barSec: number): void {
    const perBar = (ARP_PER_BEAT[p.div] ?? 2) * 4, stepSec = barSec / perBar, life = stepSec * 1000 * gateOf(p);
    lines(perBar, from, end, (l) => {
      const rs = roots();
      if (!rs.length) { arpIdx = 0; return; }
      const t = l.frame / sr;
      if (p.chord) {
        const block = chordBlock(rs.map((r) => r.triad)), cv = blockVel(block.length);
        block.forEach((n, bi) => pluck(n, cv, life, t + Math.min(bi * 0.008, stepSec * 0.45)));
      } else { const r = rs[arpIdx % rs.length]; pluck(r.midi, VEL, life, t); arpIdx++; }
    });
  }

  const gateOf = (p: ArpParams): number => clamp(Number.isFinite(p.length) ? p.length : 0.5, LENGTH_MIN, LENGTH_MAX);
  const grooving = (p: ArpParams): boolean => Number.isFinite(p.groove) && p.groove > 0;

  // from core.ts:1387-1398 — the gate: a chop on each line of its division; SWING alternates the interval long/short
  // around sd (the average stays sd). The pair phase is the LATTICE's (even lines long), not reset per press.
  function bookGate(b: Booking, end: number, p: ArpParams, sr: number, barSec: number): void {
    const perBar = (GATE_PER_BEAT[p.gateDiv] ?? 4) * 4, sd = barSec / perBar;
    const sw = clamp(Number.isFinite(p.gateSwing) ? p.gateSwing : 0, 0, 1);
    lines(perBar, b.frame, end, (l) => {
      const odd = (l.i & 1) === 1;
      const when = l.frame / sr + (odd ? (sd * sw) / 3 : 0);
      const dur = sd * (odd ? 1 - sw / 3 : 1 + sw / 3);
      effects.chop(when, dur);
      if (typeof bassX.chop === 'function') bassX.chop(when, dur);   // exact (lane B); the gesture below then no-ops
      bass.gesture('gate', true, dur);
    });
  }

  // The end of the window the scheduler has announced so far, and the grid it was cut from: a gate pressed mid-horizon
  // books the lines already announced (from its own next line ≥ now + 20 ms), as the core re-seated its gate clock at
  // the press (core.ts:965 gridNext); without it the first chop would wait out the whole horizon (≥ 120 ms).
  let announced: { end: number; sr: number; barFrames: number; originFrame: number } | null = null;

  function book(b: Booking): void {
    const g = time.grid();
    const sr = g.sr, barSec = g.barFrames / sr;
    if (!(sr > 0) || !(barSec > 0)) return;
    let end = time.nextLine(16, b.frame + 1).frame;
    if (!(end > b.frame)) end = b.frame + Math.round(g.barFrames / 16);
    announced = { end, sr, barFrames: g.barFrames, originFrame: g.originFrame };
    if (!arpOn && !gateOn) return;
    const p = d.params();
    if (arpOn) { if (grooving(p)) grooveStep(b.frame, b.bar, b.step, p, sr, barSec); else rateLines(b.frame, end, p, sr, barSec); }
    if (gateOn) bookGate(b, end, p, sr, barSec);
  }

  /** The announced window still ahead of now + 20 ms, on the grid in force (null when re-seated or retimed since). */
  function ahead(): { g: { sr: number; barFrames: number }; end: number } | null {
    const a = announced;
    if (!a) return null;
    const g = time.grid();
    if (g.sr !== a.sr || g.barFrames !== a.barFrames || g.originFrame !== a.originFrame) return null;
    if (!(a.end > ctx.currentTime * g.sr)) return null;
    return { g, end: a.end };
  }

  // ARP on joins at its own next line ≥ now + 20 ms (core.ts:929 nextArpT = gridNext(step)), not a horizon later
  function arpCatchUp(): void {
    const w = ahead();
    if (!w) return;
    const p = d.params(), sr = w.g.sr, barSec = w.g.barFrames / sr;
    if (!grooving(p)) { const first = time.nextLine((ARP_PER_BEAT[p.div] ?? 2) * 4); if (first) rateLines(first.frame, w.end, p, sr, barSec); return; }
    lines(16, time.nextLine(16).frame, w.end, (l) => grooveStep(l.frame, l.bar, l.i, p, sr, barSec));
  }

  function gateCatchUp(): void {
    const w = ahead();
    if (!w) return;
    const p = d.params();
    const first = time.nextLine((GATE_PER_BEAT[p.gateDiv] ?? 4) * 4);   // its own line ≥ now + 20 ms
    if (first && first.frame < w.end) bookGate({ frame: first.frame, bar: first.bar, step: 0 }, w.end, p, w.g.sr, w.g.barFrames / w.g.sr);
  }

  // from core.ts:950-978 — the gate + DIVE gestures
  function gesture(name: 'gate' | 'dive', on: boolean): void {
    on = !!on;
    if (name === 'gate') {
      if (gateOn === on) return;   // a re-press re-anchored the core's float clock (952); the lattice has none
      gateOn = on;
      if (on) gateCatchUp();
      else { effects.releaseGate(); bass.gesture('gate', false); }
      return;
    }
    if (name !== 'dive' || diveOn === on) return;
    diveOn = on;
    if (on) {
      const p = d.params();
      const cents = -Math.abs(Number.isFinite(p.diveDist) ? p.diveDist : 24) * 100;
      bendX.bend(cents, Number.isFinite(p.diveSpeed) ? p.diveSpeed : 0.45);
      bass.gesture('dive', true, cents);
    } else {
      keys.bend(0);   // back with the keys' own τ .07 (core.ts:969)
      bass.gesture('dive', false);
    }
  }

  function stop(): void {
    pool.clear();
    for (const id of voices.keys()) keys.noteOff(id);
    voices.clear();
    fingers.clear();
    arpOn = false; latch = false; arpIdx = 0;
    gesture('gate', false);
    gesture('dive', false);
    announced = null;            // the master stop drops the clock (time.stop): nothing announced is left to catch up
    changed();
  }

  return {
    noteOn, noteOff, release, retune, setArp, setLatch,
    arpOn: () => arpOn,
    latch: () => latch,
    sounding,
    has: (id) => (arpOn ? pool : voices).has(id),
    isDown: (id) => fingers.has(id),
    down: () => Array.from(fingers),
    flushLatch,
    forget,
    book,
    gesture,
    gate: () => gateOn,
    dive: () => diveOn,
    stop,
  };
}
