// SIGNAL · THE KEYBOARD (src/signal/keymap.ts · lane H · R1): window keys → the contract's KeyAction, by PHYSICAL key.
// Map: docs/signal-map/D-time-arp-chords.md §4 (the key table, the guards, the defect). Imports: ./types.ts only.
//
// from signal-studio-v6lib/src/views/instrument/index.ts:346-493 (2a9e4a7) — REWRITTEN on the contract's table:
//   - CAPTURE-phase keydown/keyup on the window (index.ts:491-492), so the page's keys reach the instrument first.
//   - owns(): nothing else owns the keys (no text field / select / contenteditable focused, no ⌘/ctrl/alt;
//     index.ts:375-386, 408-413). The Studio's visible/focused/overlay/bench guards belong to its shell: cut. Escape
//     is ALWAYS owned (the master stop must work from anywhere on the page).
//   - One action per physical press: `!e.repeat` on everything (index.ts:434-476).
//   - Space and the arrows preventDefault while owned, repeats included (index.ts:414-415, 480), so the page never
//     scrolls under the player's hands. Unmapped keys never reach it (they stay the page's).
//   - keyup releases by the CODE RECORDED AT KEYDOWN (`ourDown`, index.ts:417-419, 482-489), whoever owns the keys by
//     then. THE DEFECT NOT PORTED (D §4): the Studio matched notes by `e.key.toLowerCase()`, so an ⌥ pressed under a
//     held note turned the keyup's key into `å` and the note stuck until blur. Everything here is `e.code`, so the
//     printed letters stay physical on AZERTY / Dvorak too.
//   - window blur (index.ts:490) and a hidden tab: on = false for every code still down.
// The table itself is the contract's KEYMAP (types.ts), R3's TAUGHT SET: the letters · Space · B · Z (held) · M (held)
// · ←/→ · ↑/↓ · = · Esc. X C V N (HOLD, CHORD, ARP, the root lock) left the keyboard for on-screen toggles, and the
// pads row left the surface with Digit1–8: those codes are unmapped here and belong to the page.

import type { CreateKeymap, KeyAction, KeymapDeps } from './types.ts';
import { KEYMAP } from './types.ts';

/** Codes whose browser default (scrolling, find-as-you-type) the instrument suppresses while it owns the keys. */
export const PREVENT_CODES: ReadonlySet<string> = new Set([
  'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
]);

interface ElLike { tagName?: string; isContentEditable?: boolean }

const editable = (el: unknown): boolean => {
  if (!el || typeof el !== 'object') return false;
  const e = el as ElLike;
  const tag = typeof e.tagName === 'string' ? e.tagName.toUpperCase() : '';
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.isContentEditable === true;
};

/** index.ts:375-386, 412-413 — the page owns the keys unless a text field (or a select, or contenteditable) has focus
 *  or ⌘/ctrl/alt is down. The event's own target (through a shadow root) is checked as well as activeElement. */
export function defaultOwns(ev: KeyboardEvent, doc?: { activeElement?: unknown } | null): boolean {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return false;
  let first: unknown = null;
  try { first = typeof ev.composedPath === 'function' ? ev.composedPath()[0] : ev.target; } catch { first = ev.target; }
  if (editable(first)) return false;
  return !editable(doc ? doc.activeElement : null);
}

export function createKeymap(d: KeymapDeps): { attach(): void; detach(): void; down(): ReadonlyArray<string> } {
  const target = d.target;
  const doc = ((): Document | null => { try { return (target && target.document) || null; } catch { return null; } })();
  const ourDown = new Map<string, KeyAction>();   // code → the action its keydown fired (released by the same code)

  const owns = (e: KeyboardEvent): boolean => {
    if (e.code === 'Escape') return true;
    try { return d.owns ? !!d.owns(e) : defaultOwns(e, doc); } catch { return false; }
  };
  const fire = (a: KeyAction, on: boolean, shift: boolean, code: string): void => {
    try { d.onAction(a, on, shift, code); } catch (err) { console.warn('[signal/keymap] onAction threw', err); }
  };

  function onKeyDown(e: KeyboardEvent): void {
    const a = typeof e.code === 'string' && Object.prototype.hasOwnProperty.call(KEYMAP, e.code) ? KEYMAP[e.code] : null;
    if (!a) return;                                   // unmapped keys are the page's
    if (!owns(e)) return;
    if (PREVENT_CODES.has(e.code)) e.preventDefault();
    if (e.repeat || ourDown.has(e.code)) return;      // one action per physical press
    ourDown.set(e.code, a);
    fire(a, true, !!e.shiftKey, e.code);
  }
  function onKeyUp(e: KeyboardEvent): void {
    const a = ourDown.get(e.code);
    if (!a) return;                                   // not pressed while we owned the keys: not ours to release
    ourDown.delete(e.code);
    fire(a, false, !!e.shiftKey, e.code);
  }
  function releaseAll(): void {
    const held = Array.from(ourDown);
    ourDown.clear();
    for (const [code, a] of held) fire(a, false, false, code);
  }
  const onBlur = (): void => releaseAll();
  const onVisibility = (): void => { if (doc && doc.visibilityState === 'hidden') releaseAll(); };

  let attached = false;
  return {
    attach(): void {
      if (attached || !target) return;
      attached = true;
      target.addEventListener('keydown', onKeyDown, true);
      target.addEventListener('keyup', onKeyUp, true);
      target.addEventListener('blur', onBlur);
      if (doc) doc.addEventListener('visibilitychange', onVisibility);
    },
    detach(): void {
      if (!attached) return;
      attached = false;
      target.removeEventListener('keydown', onKeyDown, true);
      target.removeEventListener('keyup', onKeyUp, true);
      target.removeEventListener('blur', onBlur);
      if (doc) doc.removeEventListener('visibilitychange', onVisibility);
      releaseAll();                                   // a detached keymap leaves nothing held
    },
    down: () => Array.from(ourDown.keys()),
  };
}

createKeymap satisfies CreateKeymap;
