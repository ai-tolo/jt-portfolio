// SIGNAL · THE CHORD RACK, DOM-FREE (src/signal/chords.ts · lane H · R1). Eight pads of absolute MIDI notes: STAMP what
// sounds onto an empty pad, play it back, ⇧ clears; the pad's chord ROOT pins the bass unless a hand pinned it. The
// Studio's rack is view code around a small model (docs/signal-map/D-time-arp-chords.md §5.2); this is the model, with
// no DOM, no store and no edit mode (the view paints it, the state document persists it). Imports: ./types.ts,
// ./chord-name.ts, ./chord-gravity.ts; the notes go out through the harmony's latch/arp machine (deps), so HOLD and ARP
// see a pad exactly as they see a key.
//
// from signal-studio-v6lib/src/views/instrument/chord-rack.ts:94-230 (2a9e4a7) — ADAPTED: tonesOf (ids c<slot>.<i>,
//   vel clamp(1·0.9, 0.05, 1) = 0.9: every stamp stores vels 1), the mono latch under HOLD (the previous pad released,
//   the same pad re-struck), the gate without HOLD (sounding until release), stamp (the sounding set, nearest-MIDI,
//   deduped, sorted; then onCapture → the machine's flushLatch, play.ts:258-271), clear (a ringing latched pad stops),
//   trigger (⇧ clears an occupied pad and is inert on an empty one; occupied → play; empty + sounding → stamp; empty +
//   silent → the Studio opened the key wheel: cut, D §7), syncBassRoot (R14a: the named ROOT at or just below the
//   lowest note; `ourPin` remembers the pin we wrote, so a manual pin or an armed capture is never overridden).
//   Additions: a latched pad that no longer sounds (HOLD off, ARP off, a flush) is not latched any more, so silence
//   unpins at the next sync (B §6 "silence unpins"); under HOLD a pad whose own tones still ring is released before it
//   is struck, so a re-strike always sounds (the core's toggle would have silenced it).
// from signal-studio-v6lib/src/views/instrument/chord-rack.ts:234-268 (2a9e4a7) — the face (label + degree re-derived
//   against the live key) and the LEAN (nextWeight from the last-lit pad's degree), as data for the view.
// from signal-studio-v6lib/src/views/instrument/chord-rack-store.ts:78-92 (2a9e4a7) — normalize(), the loader's guard,
//   on the contract's shape (Array<number[] | null>; a Studio RackPad {notes} is accepted too).

import type { Bass } from './types.ts';
import { nameChord } from './chord-name.ts';
import type { ChordCtx } from './chord-name.ts';
import { degreeOf, nextWeight } from './chord-gravity.ts';

export const RACK_SIZE = 8;
export type Rack = Array<number[] | null>;

export interface ChordsDeps {
  /** A pad tone down / up, through the harmony's latch/arp machine (chord-rack.ts:103). */
  noteOn(id: string, midi: number, vel: number): void;
  noteOff(id: string): void;
  /** Force one tone out, whatever HOLD says (chord-rack.ts:107's re-noteOn + noteOff toggle, as one call). */
  release(id: string): void;
  /** What sounds now, [id, midi]: the stamp's source and the stale-mono check (the Studio's eng.held()). */
  sounding(): ReadonlyArray<readonly [string, number]>;
  /** HOLD. */
  latch(): boolean;
  /** The live key, for naming (the root that pins the bass, the face, the lean). */
  ctx(): ChordCtx;
  bass: Pick<Bass, 'state' | 'set'>;
  /** R12.1: a stamp consumes the chord it captured (the harmony releases what is latched and no finger holds). */
  onCapture?(): void;
}

export interface PadFace { notes: number[]; label: string; degree: string | null; sel: boolean; lean: number; on: boolean }

export interface Chords {
  rack(): Rack;
  /** Replace the rack (a load): sounding pads are released first. Never throws. */
  load(r: unknown): void;
  trigger(i: number, shift?: boolean): void;
  release(i: number): void;
  clear(i: number): void;
  /** Stamp what sounds onto pad i (overwrites; trigger() only stamps an EMPTY pad). false when nothing sounds. */
  stamp(i: number): boolean;
  /** Every pad down (the master stop), our bass pin dropped. */
  releaseAll(): void;
  /** Reconcile after an outside change (HOLD/ARP toggled, a key travel): the mono ref and the bass pin. */
  sync(): void;
  lastLit(): number;
  /** The view's data for pad i (null when empty): label + degree against the live key, `.sel`, `--lean`, ringing. */
  face(i: number): PadFace | null;
  /** The pin this rack wrote into bass.root (null when the rack holds none). */
  pin(): number | null;
}

interface Tone { id: string; midi: number; vel: number }

const mod12 = (n: number): number => ((n % 12) + 12) % 12;

/** from chord-rack-store.ts:78-92 — 8 slots; a pad = its finite notes as integers 0..127, never empty (else null). */
export function normalizeRack(r: unknown): Rack {
  const out: Rack = new Array(RACK_SIZE).fill(null);
  if (!Array.isArray(r)) return out;
  for (let i = 0; i < RACK_SIZE; i++) {
    const p: unknown = r[i];
    const src: unknown = Array.isArray(p) ? p : p && typeof p === 'object' ? (p as { notes?: unknown }).notes : null;
    if (!Array.isArray(src)) continue;
    const notes = src.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)).map((n) => Math.min(127, Math.max(0, Math.round(n))));
    if (notes.length) out[i] = notes;
  }
  return out;
}

export function createChords(d: ChordsDeps, init?: unknown): Chords {
  const slots: Rack = normalizeRack(init);
  let lastLit = -1;
  // mono-latch tracking (HOLD on): the latched pad + the exact tones it fired; gated pads (HOLD off): slot → tones
  let latched: { slot: number; tones: Tone[] } | null = null;
  const gated = new Map<number, Tone[]>();
  let ourPin: number | null = null;

  const valid = (i: number): boolean => Number.isInteger(i) && i >= 0 && i < RACK_SIZE;
  // from chord-rack.ts:94-97
  const tonesOf = (slot: number): Tone[] => {
    const p = slots[slot]; if (!p) return [];
    return p.map((m, i) => ({ id: `c${slot}.${i}`, midi: m, vel: Math.max(0.05, Math.min(1, 1 * 0.9)) }));
  };
  const liveIds = (): Set<string> => { const s = new Set<string>(); for (const [id] of d.sounding()) s.add(id); return s; };
  const soundTones = (tones: Tone[]): void => tones.forEach((t) => d.noteOn(t.id, t.midi, t.vel));
  const releaseTones = (tones: Tone[]): void => tones.forEach((t) => d.release(t.id));

  // chord-rack.ts:146-147 — a stale mono ref (HOLD toggled off, the latched pad silenced elsewhere) is dropped
  function reconcile(): void {
    if (!latched) return;
    if (!d.latch()) { latched = null; return; }
    const live = liveIds();
    if (!latched.tones.some((t) => live.has(t.id))) latched = null;
  }

  // ── R14a — THE BASS FOLLOWS THE CHORD'S ROOT, NOT ITS LOWEST NOTE (chord-rack.ts:109-138) ──
  // AND IT NEVER FIGHTS A MANUAL PIN. We remember the value we set: if the bass's root is anything else, a human put it
  // there (the padlock / N) and the rack keeps its hands off entirely.
  function syncBassRoot(): void {
    reconcile();
    const bs = d.bass.state();
    if (bs.armed) { ourPin = null; return; }                       // the user is arming a capture
    const cur = bs.root;
    if (cur != null && cur !== ourPin) { ourPin = null; return; }  // a MANUAL pin owns the bass
    const unpin = (): void => { if (ourPin != null) { d.bass.set('root', null); ourPin = null; } };
    const slot = latched ? latched.slot : (gated.size ? Array.from(gated.keys())[gated.size - 1] : -1);
    const p = slot >= 0 ? slots[slot] : null;
    if (!p || !p.length) { unpin(); return; }
    const rootPc = nameChord(p, d.ctx()).root;
    if (rootPc == null) { unpin(); return; }                       // unnameable cluster → let it follow
    const low = Math.min(...p);
    const rootMidi = low - mod12(low - rootPc);                    // the root at or just below the chord
    if (rootMidi !== ourPin) { d.bass.set('root', rootMidi); ourPin = rootMidi; }
  }

  // ── playback (chord-rack.ts:141-165) ──
  function playPad(slot: number): void {
    const tones = tonesOf(slot); if (!tones.length) return;
    lastLit = slot;
    reconcile();
    if (d.latch()) {
      // HOLD: mono at the chord level — release the previous pad first (same pad ⇒ re-strike), then latch
      if (latched) releaseTones(latched.tones);
      const live = liveIds();
      releaseTones(tones.filter((t) => live.has(t.id)));           // a still-ringing copy of THIS pad: re-strike, never toggle
      soundTones(tones);
      latched = { slot, tones };
    } else {
      soundTones(tones);
      gated.set(slot, tones);
    }
    syncBassRoot();
  }
  function releasePad(slot: number): void {
    const tones = gated.get(slot);
    if (tones) { tones.forEach((t) => d.noteOff(t.id)); gated.delete(slot); syncBassRoot(); return; }
    // a HELD-then-released pad under HOLD: noteOff each so the finger lifts while the latch keeps the ring
    if (d.latch() && latched && latched.slot === slot) latched.tones.forEach((t) => d.noteOff(t.id));
  }

  // ── capture (chord-rack.ts:168-185) ──
  function stamp(slot: number): boolean {
    if (!valid(slot)) return false;
    const set = new Set<number>();
    for (const [, m] of d.sounding()) if (Number.isFinite(m)) set.add(Math.round(m));
    const notes = Array.from(set).sort((a, b) => a - b);
    if (!notes.length) return false;
    slots[slot] = notes;
    lastLit = slot;
    // R12.1 — CAPTURING A CHORD ENDS IT: only what is latched is released; a key still under a finger is never touched
    d.onCapture?.();
    syncBassRoot();
    return true;
  }

  // chord-rack.ts:197-204
  function clearPad(slot: number): void {
    if (!valid(slot) || !slots[slot]) return;
    if (latched && latched.slot === slot) { releaseTones(latched.tones); latched = null; }   // stop a ringing pad on clear
    slots[slot] = null;
    if (lastLit === slot) lastLit = -1;
    syncBassRoot();
  }

  // ── the gesture router — pointer + digit share it (chord-rack.ts:207-230, EDIT cut) ──
  function trigger(slot: number, shift = false): void {
    if (!valid(slot)) return;
    const occupied = !!slots[slot];
    if (shift) { if (occupied) clearPad(slot); return; }             // ⇧ ALWAYS clears; inert on an empty pad
    if (occupied) { playPad(slot); return; }
    if (d.sounding().length > 0) stamp(slot);                         // empty + sounding → stamp what you hold
    // empty + silent: the Studio opened the key wheel here (R4b); the wheel is cut (D §7), so nothing happens
  }

  function releaseAll(): void {
    if (latched) releaseTones(latched.tones);
    latched = null;
    for (const tones of gated.values()) releaseTones(tones);
    gated.clear();
    syncBassRoot();
  }

  function load(r: unknown): void {
    releaseAll();
    const next = normalizeRack(r);
    for (let i = 0; i < RACK_SIZE; i++) slots[i] = next[i];
    lastLit = -1;
  }

  // chord-rack.ts:252-258 — a pad's scale degree (0..6) in the live key, null off-map / in FREE
  const padDegree = (slot: number): number | null => {
    const p = slots[slot]; if (!p) return null;
    const c = d.ctx();
    if (c.scaleMode === 'chrom') return null;
    const root = nameChord(p, c).root;
    return root == null ? null : degreeOf(root, c.keyRoot, c.scaleMode);
  };

  function face(i: number): PadFace | null {
    if (!valid(i) || !slots[i]) return null;
    const notes = slots[i]!.slice();
    const c = d.ctx();
    const nm = nameChord(notes, c);                                  // re-derived live (chord-rack.ts:240)
    const from = lastLit >= 0 && slots[lastLit] ? padDegree(lastLit) : null;
    const lean = from == null || i === lastLit ? 0 : nextWeight(from, padDegree(i), c.scaleMode);   // chord-rack.ts:263
    const on = (latched != null && latched.slot === i) || gated.has(i);
    return { notes, label: nm.label, degree: nm.degree, sel: i === lastLit, lean, on };
  }

  return {
    rack: () => slots.map((p) => (p ? p.slice() : null)),
    load,
    trigger,
    release: (i) => { if (valid(i)) releasePad(i); },
    clear: clearPad,
    stamp,
    releaseAll,
    sync: syncBassRoot,
    lastLit: () => lastLit,
    face,
    pin: () => ourPin,
  };
}
