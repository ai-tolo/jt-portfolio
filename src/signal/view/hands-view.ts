// SIGNAL R1 · lane V3 · view/hands-view.ts — THE HANDS. New code (the portfolio's), built on the Studio's gestures and
// laws, each block naming its source below. R4 (THE RENDER ROUND, lane V, NOTES-SIGNAL-R4.md §1.4) draws two things:
//   the HEAD's STOP CORNER   `esc STOP` (the Escape keycap in red ink + the etched word), appended into the head's top-left
//                            corner (Signal.astro's static [data-corner="stop"]; the titles and THE SWITCH are not this
//                            view's: the two system controls stand at the two top corners)
//   the KEYBED (250)         the small piano C3..C7 (lights only: no letters, no names) 60 · the bracket rail 16 · the
//                            KEYCAP BLOCK 100, three columns: the dark left flank (empty: it keeps the letters centred) ·
//                            the LETTER ROWS (the colour row W E R T Y U I O over the home row A S D F G H J K L, in the
//                            laptop's stagger) · the OCTAVE group [←] 0 OCTAVE [→] in the dark right flank · THE Z/M LINE
//                            50: Z under the A/S seam and M under the J/K seam (where they stand on a keyboard), the gate
//                            pair (SWING · RATE) at the line's left end and the dive pair (SPEED · DIST) at its right end,
//                            each wired to its key by a thin amber hairline
// HISTORY. R3 (THE FIRST-TIMER ROUND, NOTES-SIGNAL-R3.md §1.3) made this view two strata (a top strip + the keybed) and
// moved the wordmark, the tempo glass + TAP, CHORD · HOLD · ARPEGGIATOR and the rack out of it. R3.2 (Jon, 2026-09-24:
// "i want the z and the m on the bottom left and right of the main keys") brought the Z and M keycaps back, and with them
// the reference-counted gesture wrapper around inst.harmony.gesture (R2's law); R3.3 ("i want them to be to the left and
// the right of the main keyboard, in the dark areas. with their controls.") stood them in the flanks with their knobs.
// R4 (Jon's render; the brief's §A + §E: "correlate to the physical keyboard"): THE TOP STRIP LEFT THIS VIEW — its KEY
// walk and CHORD glass are the keys tower's foot now (view/keys-view.ts), its power slot is Signal.astro's right corner,
// its octave group is the keybed's right flank, its `esc STOP` the head's left corner — and Z and M stand on their
// keyboard row under the letters, their knob pairs at the line's two ends.
// The look is R0's LOOK B; every recipe is src/styles/signal/material.css's, the keycap is keycap.css's (`key()` from
// common.ts); the keybed's own layout and the stop group's ink are src/styles/signal/hands.css.
//
// MOUNT: mountHandsView(root, inst) APPENDS the keybed block (.sgh-keybed) to root (the device's strata column: head ·
// towers · keybed) and the stop group (.sgh-stopgrp) into the head's stop corner (`.sig-head [data-corner="stop"]` under
// root; a missing corner = the group is prepended to root, never a throw). dispose() removes both, every listener and
// the rAF, and lets go of anything a pointer still holds.
// PAINT: every gesture calls the instrument, never the DOM's own state. The octave screen, the knobs and the colour rims
// are painted from inst.state() on inst.onChange; the stop lamp, the piano's lamps and the keycaps' lamps from
// time.running() / the harmony's sounding() on a requestAnimationFrame (DOM touched only when a signature changed).
// KEYBOARD: the integrator's keymap drives the instrument; this view only REFLECTS keys (a keycap goes .pressed while its
// key is down) through ONE capture-phase window listener that never preventDefaults, never stops propagation and ignores
// ⌘/ctrl/alt and typing: display only.
import { GATE_DIVS, KEYCAP_ROWS, KEYMAP } from '../types.ts';
import type { GateDiv, HarmonyState, KeyAction, MountView, ScaleName } from '../types.ts';
import { clamp, el, makeKnob } from './controls.ts';
import type { Knob } from './controls.ts';
import { accent, etch, key, knob, screen } from './common.ts';
import { BLACKS, WHITES, keyBox, midiAtPct, spanOf } from './stage-geometry.ts';

// ── words the device prints (legends, never explanations) ─────────────────────────────────────────────────────────
const OCT_MIN = -1, OCT_MAX = 1;   // types.ts Music.oct −1..+1: every letter stays on the C3..C7 stage (D §6)
const octText = (o: number): string => (o > 0 ? `+${o}` : o < 0 ? `−${-o}` : '0');
/** from signal-studio-v6lib/src/voices/note-name.ts:10-13 (2a9e4a7): the Studio's ONE octave convention (w29, the MODX and
 *  Ableton read it): middle C = MIDI 60 = C3, so the stage's first C (MIDI 48) prints C2. */
const cName = (m: number): string => `C${Math.floor(m / 12) - 2}`;

// ── the keys this view draws and reflects, read off the frozen key table (types.ts KEYMAP / KEYCAP_ROWS) ───────────
type NoteAct = Extract<KeyAction, { kind: 'note' }>;
const ENTRIES = Object.entries(KEYMAP) as Array<[string, KeyAction]>;
/** The 15 letters, the diatonic row first so a shared piano key is claimed by a white letter (play.ts:434-437). */
const NOTE_KEYS: Array<[string, NoteAct]> = ENTRIES.filter((e): e is [string, NoteAct] => e[1].kind === 'note')
  .sort((a, b) => Number(a[1].colour) - Number(b[1].colour));
const NOTE_OF = new Map<string, NoteAct>(NOTE_KEYS);
const codesOf = (kind: KeyAction['kind']): string[] => ENTRIES.filter(([, a]) => a.kind === kind).map(([c]) => c);
const OCT_DN = ENTRIES.find(([, a]) => a.kind === 'oct' && a.d < 0)?.[0] ?? 'ArrowLeft';
const OCT_UP = ENTRIES.find(([, a]) => a.kind === 'oct' && a.d > 0)?.[0] ?? 'ArrowRight';
const STOP_CODE = codesOf('stop')[0] ?? 'Escape';
const CAP_CODES: string[] = [...KEYCAP_ROWS.colour, ...KEYCAP_ROWS.home];
type GestureName = 'gate' | 'dive';
/** The two HELD gestures' keys, read off the KEYMAP (Z gate · M dive): [R4] each stands on the Z/M line under the letters. */
const GESTURE_CODE: Readonly<Record<GestureName, string>> = { gate: codesOf('gate')[0] ?? 'KeyZ', dive: codesOf('dive')[0] ?? 'KeyM' };
/** Each held gesture on the line: its cap's aria name, its surface hook (types.ts CTL.hands), the cap's place on the line
 *  (hands.css) and its knob pair's class. */
const GESTURE_CAP: Readonly<Record<GestureName, { name: string; ctl: string; cls: string; pair: string }>> = {
  gate: { name: 'Gate (hold)', ctl: 'keys-gate', cls: 'sgh-zkey', pair: 'sgh-gate' },
  dive: { name: 'Dive (hold)', ctl: 'keys-dive', cls: 'sgh-mkey', pair: 'sgh-dive' },
};
const GESTURE_CODES: string[] = [GESTURE_CODE.gate, GESTURE_CODE.dive];
const REFLECTED = new Set<string>([...CAP_CODES, ...GESTURE_CODES, OCT_DN, OCT_UP, STOP_CODE]);
const letterOf = (code: string): string => code.replace(/^Key/, '');

function setText(e: Element, s: string): void { if (e.textContent !== s) e.textContent = s; }

// ═══ from jt-portfolio-signal/src/signal/view/keys-view.ts:250-274 + 452-492 (R3.2, lane K's gesture row; itself R2's
// hands-view.ts:60-78 @ 76a02c7, the laws signal-studio-v6lib src/views/instrument/play.ts:818-883 @ 2a9e4a7): the gate's
// and the dive's knob laws + bindKnob, back in this view with their knobs in R3.3. COPIED, not imported (no import from
// another lane). ═══
const DIVE_T_MIN = 0.05, DIVE_T_MAX = 1.5;         // play.ts:866-875 SPEED: clockwise = faster (a shorter tau)
const DIVE_D_MIN = 2, DIVE_D_MAX = 36;             // play.ts:876-882 DIST in semitones
const stepV = (i: number, n: number): number => (n > 1 ? i / (n - 1) : 0);
const stepI = (v: number, n: number): number => clamp(Math.round(v * (n - 1)), 0, n - 1);
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
interface Law<T> {
  toV(x: T): number; fromV(v: number): T; same(a: T, b: T): boolean; text(x: T): string;
  write(x: T): void; dflt?: T; steps?: number;
}
interface Bound<T> { host: HTMLElement; sync(x: T): void }
/** makeKnob (controls.ts, the one drag law) bound to one field: the value legend follows the knob; state writes back
 *  only when the knob's own reading of the field differs (a quantized field never snaps a knob out of the hand). */
function bindKnob<T>(host: HTMLElement, init: T, law: Law<T>): Bound<T> {
  const kn = host.querySelector<HTMLElement>('.si-kn');
  const paint = (v: number): void => { if (kn) setText(kn, law.text(law.fromV(v))); };
  const k: Knob = makeKnob(host, law.toV(init), (v) => law.write(law.fromV(v)), paint,
    { dflt: law.dflt === undefined ? undefined : law.toV(law.dflt), steps: law.steps });
  return { host, sync(x) { if (!law.same(law.fromV(k.get()), x)) k.set(law.toV(x)); } };
}
// ═══ end keys-view.ts copy ═══

export const mountHandsView: MountView = (root, inst) => {
  const H = inst.harmony, T = inst.time, KEYS = inst.keys;
  const music = (): HarmonyState['music'] => H.state().music;
  const setMusic = (p: Partial<HarmonyState['music']>): void => {
    const cur = music(), next = { ...cur, ...p };
    if (next.key !== cur.key || next.scale !== cur.scale || next.oct !== cur.oct) H.set('music', next);
  };
  // the view's own memory: which drawn codes a finger holds (the keyboard, reflected), which keycaps a pointer holds,
  // and the lamp signature the frame compares against ('' = repaint on the next frame)
  const codesDown = new Set<string>();
  const ptrCodes = new Set<string>();
  let lampSig = '#';

  const ptrEnds = new Map<string, () => void>();   // code → its pointer's release (a lost window calls them)
  // a pointer on a keycap: .pressed while it holds (the keyboard's finger is the other holder); `down` acts on the
  // press, `up` on the release (lost capture, cancel and a lost window included)
  const ptrKey = (b: HTMLButtonElement, code: string, down: () => void, up: () => void = () => {}): void => {
    b.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (ptrCodes.has(code)) return;
      ptrCodes.add(code);
      try { b.setPointerCapture(e.pointerId); } catch { /* */ }
      down();
      paintKeysDown();
    });
    const end = (): void => { if (!ptrCodes.delete(code)) return; up(); paintKeysDown(); };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('lostpointercapture', end);
    ptrEnds.set(code, end);
  };

  // ═══ 1 · THE HEAD'S STOP CORNER ═══════════════════════════════════════════════════════════════════════════════════
  // the master STOP: the Escape keycap, red; lit while anything runs, acting on the press itself (a stop waits for
  // nothing). [R4] It stands in the head's top-left corner, its word etched beside it; THE SWITCH holds the other corner.
  const stopGrp = el('div', 'sgh-stopgrp');
  const stop = accent(key(STOP_CODE, 'esc', { name: 'Stop' }), 'stop'); stop.dataset.ctl = 'stop'; stop.classList.add('sgh-stop');
  stopGrp.append(stop, etch('stop', 'sgh-stopword'));
  ptrKey(stop, STOP_CODE, () => inst.stop());

  // ═══ 2 · THE KEYBED: the piano (lights) · the bracket rail · the keycap block · the Z/M line ═════════════════════════
  // from signal-studio-v6lib/src/views/instrument/play.ts:134-145, 346-376, 450-470 and keybed-locator.ts:27-72 (2a9e4a7):
  // ONE fixed keyboard (C3..C7 here) that never moves; the bracket under it says where the hand sits, and is itself a
  // control (click or drag = an octave jump, snapped). Every piano key plays its own pitch as 'p'+midi through the
  // harmony (so HOLD / CHORD see it), pointer-captured per key: no glissando. R3: no letters on the piano, no names:
  // the letters live on the keycaps below it, and the piano only LIGHTS what sounds.
  const keybed = el('div', 'sgh-keybed');
  const bed = el('div', 'sgh-bed'); bed.dataset.ctl = 'piano';
  const keysBox = el('div', 'sgh-keys');
  bed.append(keysBox);
  const keyEls = new Map<number, HTMLElement>();
  const fingers = new Set<number>();                // MIDI keys a pointer holds right now
  const makeKey = (m: number, black: boolean): void => {
    const b = keyBox(m);
    if (!b) return;
    const k = el('span', black ? 'sgh-b' : 'sgh-w');
    k.dataset.m = String(m);
    if (black) { k.style.left = `${b.left.toFixed(4)}%`; k.style.width = `${b.width.toFixed(4)}%`; }
    else { k.style.left = `calc(${b.left.toFixed(4)}% + 1px)`; k.style.width = `calc(${b.width.toFixed(4)}% - 2px)`; }
    if (m % 12 === 0) k.append(el('i', 'sgh-cdot'));
    k.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (fingers.has(m)) return;
      fingers.add(m);
      try { k.setPointerCapture(e.pointerId); } catch { /* */ }
      H.keyDown('p' + m, m);
      lampSig = '';
    });
    const up = (): void => { if (!fingers.delete(m)) return; H.keyUp('p' + m); lampSig = ''; };
    k.addEventListener('pointerup', up); k.addEventListener('pointercancel', up); k.addEventListener('lostpointercapture', up);
    k.addEventListener('pointerleave', (e) => { if (e.buttons) up(); });   // capture refused: leaving still lets go
    keyEls.set(m, k);
    keysBox.append(k);
  };
  for (const m of WHITES) makeKey(m, false);
  for (const m of BLACKS) makeKey(m, true);

  const rail = el('div', 'sgh-rail'); rail.dataset.ctl = 'rail';
  const railIn = el('div', 'sgh-railin');
  for (const m of WHITES) {
    if (m % 12 !== 0) continue;
    const b = keyBox(m)!;
    const t = el('b', 'sgh-oname');
    t.textContent = cName(m);
    t.style.left = `${(b.left + b.width / 2).toFixed(3)}%`;
    railIn.append(t);
  }
  const win = el('div', 'sgh-win');
  railIn.prepend(win);
  rail.append(railIn);

  // THE KEYCAP BLOCK (R3, brief §D; [R4] three columns: the dark left flank · the letter rows · the OCTAVE group in the
  // dark right flank). The letter rows are the laptop's two rows as real keycaps, the colour row half a cap to the right
  // of the home row (W over the A/S seam). A cap PLAYS its note (the same 'k'+code id the keyboard uses, so the harmony
  // sees one hand); R and I play nothing and stay dormant.
  const caps = el('div', 'sgh-caps'); caps.dataset.ctl = 'keycaps';
  const letters = el('div', 'sgh-letters');
  const capEls = new Map<string, HTMLButtonElement>();
  const capRow = (codes: readonly string[], cls: string): HTMLElement => {
    const row = el('div', `sgh-crow ${cls}`);
    for (const code of codes) {
      const a = NOTE_OF.get(code);
      const b = key(code, letterOf(code), { colour: a?.colour === true, dormant: !(code in KEYMAP) });
      accent(b, 'harmony');
      if (a) {
        const id = 'k' + code;
        ptrKey(b, code, () => { if (!codesDown.has(code)) H.keyDown(id, H.midiFor(a.offset, a.colour)); lampSig = ''; },
          () => { if (!codesDown.has(code)) H.keyUp(id); lampSig = ''; });
      }
      capEls.set(code, b);
      row.append(b);
    }
    return row;
  };
  letters.append(capRow(KEYCAP_ROWS.colour, 'sgh-colour'), capRow(KEYCAP_ROWS.home, 'sgh-home'));

  // [R4] THE RIGHT FLANK: the OCTAVE group (the top strip's until R3.3; the render's place, brief §E): its two keys, the
  // ← → the keymap teaches, either side of the octave screen, on the letter rows' centre line, 40 px from the letters.
  // OCTAVE ← → are literal (play.ts:590-600, R13c): they move the octave, never a sounding chord; the keyboard's ←/→ keep
  // the contextual transpose (the keymap's).
  const octDn = key(OCT_DN, '←', { name: 'Octave down' }); octDn.dataset.ctl = 'oct-'; octDn.classList.add('sgh-okey');
  const octScr = screen('0', 'octave', 'sgh-octscr'); octScr.dataset.ctl = 'octave';
  const octVal = octScr.querySelector('b')!;
  const octUp = key(OCT_UP, '→', { name: 'Octave up' }); octUp.dataset.ctl = 'oct+'; octUp.classList.add('sgh-okey');
  const octGrp = el('div', 'sgh-octgrp');
  octGrp.append(octDn, octScr, octUp);
  ptrKey(octDn, OCT_DN, () => setMusic({ oct: clamp(music().oct - 1, OCT_MIN, OCT_MAX) }));
  ptrKey(octUp, OCT_UP, () => setMusic({ oct: clamp(music().oct + 1, OCT_MIN, OCT_MAX) }));
  const flankR = el('div', 'sgh-flank sgh-fr');
  flankR.append(octGrp);
  caps.append(el('div', 'sgh-flank sgh-fl'), letters, flankR);   // the left flank stays empty: it keeps the letters centred

  // [R4] THE Z/M LINE (Jon's render; brief §E: "correlate to the physical keyboard"): under the letter rows the two HELD
  // keys stand where they are on a keyboard, Z under the A/S seam and M under the J/K seam, 44 px like the letters (they
  // are keys of the keyboard's own row), lit AMBER while held where a letter lights sapphire. Each gesture's two knobs sit
  // at the line's end on its side, wired to its key by a thin amber hairline that brightens while the key is held; the
  // gesture's name is etched over its pair. The knobs are R3.3's, the same laws and the same writes: RATE stepped over
  // GATE_DIVS · SWING 0..1 printed as a % · SPEED 0.05..1.5 s inverted (clockwise = faster) · DIST 2..36 semitones. A
  // drag writes H.set('gate' | 'dive'); the state paints them back on inst.onChange (paintState), and a drag's own echo
  // writes nothing. Everything on the line is absolutely placed from the letters' geometry (hands.css).
  const h0 = inst.state().harmony;
  const gateWrite = (p: Partial<HarmonyState['gate']>): void => {
    const g = H.state().gate, n = { ...g, ...p };
    if (n.div !== g.div || !near(n.swing, g.swing)) H.set('gate', n);
  };
  const diveWrite = (p: Partial<HarmonyState['dive']>): void => {
    const d = H.state().dive, n = { ...d, ...p };
    if (!near(n.speedSec, d.speedSec) || n.dist !== d.dist) H.set('dive', n);
  };
  const kgRate = knob('rate', { size: 'kx', side: true, steps: GATE_DIVS.length, value: h0.gate.div });
  const kgSwing = knob('swing', { size: 'kx', side: true, value: String(Math.round(h0.gate.swing * 100)) });
  const kdSpeed = knob('speed', { size: 'kx', side: true, value: h0.dive.speedSec.toFixed(2) });
  const kdDist = knob('dist', { size: 'kx', side: true, value: String(h0.dive.dist) });
  kgRate.dataset.ctl = 'gate-rate'; kgSwing.dataset.ctl = 'gate-swing'; kdSpeed.dataset.ctl = 'dive-speed'; kdDist.dataset.ctl = 'dive-dist';
  const bgRate = bindKnob<GateDiv>(kgRate, h0.gate.div, {
    toV: (d) => stepV(Math.max(0, GATE_DIVS.indexOf(d)), GATE_DIVS.length), fromV: (v) => GATE_DIVS[stepI(v, GATE_DIVS.length)],
    same: (a, b) => a === b, text: (d) => d, write: (div) => gateWrite({ div }), steps: GATE_DIVS.length,
  });
  const bgSwing = bindKnob<number>(kgSwing, h0.gate.swing, {
    toV: (w) => clamp(w, 0, 1), fromV: (v) => v, same: near, text: (w) => String(Math.round(w * 100)),
    write: (swing) => gateWrite({ swing }), dflt: 0,
  });
  const bdSpeed = bindKnob<number>(kdSpeed, h0.dive.speedSec, {
    toV: (t) => clamp((DIVE_T_MAX - t) / (DIVE_T_MAX - DIVE_T_MIN), 0, 1), fromV: (v) => DIVE_T_MAX - v * (DIVE_T_MAX - DIVE_T_MIN),
    same: near, text: (t) => t.toFixed(2), write: (speedSec) => diveWrite({ speedSec }), dflt: 0.45,
  });
  const bdDist = bindKnob<number>(kdDist, h0.dive.dist, {
    toV: (d) => clamp((d - DIVE_D_MIN) / (DIVE_D_MAX - DIVE_D_MIN), 0, 1), fromV: (v) => Math.round(DIVE_D_MIN + v * (DIVE_D_MAX - DIVE_D_MIN)),
    same: (a, b) => a === b, text: (d) => String(d), write: (dist) => diveWrite({ dist }), dflt: 24,
  });
  const line = el('div', 'sgh-line');
  const gestEls = new Map<GestureName, HTMLButtonElement>();
  const wireEls = new Map<GestureName, HTMLElement>();
  const holdKey = (g: GestureName): HTMLButtonElement => {
    const spec = GESTURE_CAP[g], code = GESTURE_CODE[g];
    const b = accent(key(code, letterOf(code), { name: spec.name }), 'gate');
    b.dataset.ctl = spec.ctl; b.classList.add(spec.cls);
    gestEls.set(g, b);
    return b;
  };
  // a pair reads from its key outward (the gate's RATE then SWING, the dive's SPEED then DIST), so the DOM runs left to
  // right as drawn: SWING · RATE on the gate's side, SPEED · DIST on the dive's; the gesture's name over the pair
  const pair = (g: GestureName, knobs: readonly HTMLElement[]): HTMLElement => {
    const p = accent(el('div', `sgh-pair ${GESTURE_CAP[g].pair}`), 'gate');
    p.append(etch(g, 'sgh-gword'), ...(g === 'gate' ? [...knobs].reverse() : knobs));
    return p;
  };
  const wire = (g: GestureName): HTMLElement => { const w = el('i', `sgh-wire ${g}`); wireEls.set(g, w); return w; };
  // the wires first: each key (and its oblique body) lies over its wire's end, as a keycap stands on the chassis
  line.append(wire('gate'), wire('dive'), pair('gate', [kgRate, kgSwing]), holdKey('gate'), holdKey('dive'), pair('dive', [kdSpeed, kdDist]));
  keybed.append(bed, rail, caps, line);

  // ═══ THE HELD GESTURES: Z gate · M dive (the Studio's play.ts:820-840 @ 2a9e4a7; R2's law, back here since R3.2) ════
  // A pointer hold on the cap is the gesture (captured: pointerdown → on; pointerup, cancel, lost capture and a lost
  // window → off). REFERENCE-COUNTED: the key (Z, M) and its cap are two HOLDERS of one gesture; it goes on with the first
  // holder and off with the last, so letting go of one while the other holds keeps it. The key's holds reach the harmony
  // through inst.harmony.gesture (main.ts routes the keymap's gate/dive there, the test surface's press() too), so while
  // this view is mounted that one method is the counter's key door: every call that is not this view's own cap is the
  // key. dispose() puts the method back. Every arrival re-asserts the gesture (idempotent downstream), so a holder that
  // arrives after a master stop dropped the gesture under another holder brings it back.
  // .pressed = its key is down or the pointer holds it (paintKeysDown); .lit = either holder holds the gesture ([R4] and
  // its hairline brightens with it).
  const rawGesture = H.gesture;
  const holders: Record<GestureName, Set<'key' | 'pad'>> = { gate: new Set(), dive: new Set() };
  const hold = (name: GestureName, who: 'key' | 'pad', on: boolean): void => {
    const set = holders[name];
    if (on) { set.add(who); rawGesture.call(H, name, true); }
    else if (set.delete(who) && set.size === 0) rawGesture.call(H, name, false);
    gestEls.get(name)?.classList.toggle('lit', set.size > 0);
    wireEls.get(name)?.classList.toggle('lit', set.size > 0);
  };
  H.gesture = (name, on) => hold(name, 'key', !!on);
  for (const [g, b] of gestEls) ptrKey(b, b.dataset.code ?? '', () => hold(g, 'pad', true), () => hold(g, 'pad', false));

  // the letters' notes: each of the 15 note keys asks the harmony which MIDI it plays now (music.ts's law, never
  // re-derived here); the diatonic row claims first; the colour row (the key's five outside notes, play.ts:416-433)
  // wears the warm rim in a key, on its piano keys AND on its keycaps, and is plain chromatic in FREE
  const letterMidi = new Map<string, number>();     // code → MIDI it plays now
  const handMidi = (): number[] => NOTE_KEYS.map(([, a]) => H.midiFor(a.offset, a.colour));
  const assignLetters = (scale: ScaleName): void => {
    letterMidi.clear();
    const claimed = new Set<number>(), colour = new Set<number>(), all: number[] = [];
    for (const [code, a] of NOTE_KEYS) {
      const m = H.midiFor(a.offset, a.colour);
      all.push(m); letterMidi.set(code, m);
      if (!keyEls.has(m) || claimed.has(m)) continue;
      claimed.add(m);
      if (a.colour && scale !== 'chrom') colour.add(m);
    }
    for (const [m, k] of keyEls) {
      k.classList.toggle('inbracket', claimed.has(m));
      k.classList.toggle('color', colour.has(m));
    }
    for (const [code, b] of capEls) b.classList.toggle('colour', NOTE_OF.get(code)?.colour === true && scale !== 'chrom');
    const span = spanOf(all);
    win.hidden = !span;
    if (span) { win.style.left = `${span.left.toFixed(3)}%`; win.style.width = `${span.width.toFixed(3)}%`; }
  };
  // the rail (keybed-locator.ts:54-72, verbatim law): the spot under the pointer pulls the bracket's low edge by whole
  // octaves, through the ordinary octave write, clamped to the stage's −1..+1
  let railDrag = false;
  const jumpTo = (clientX: number): void => {
    const r = railIn.getBoundingClientRect();
    if (!(r.width > 0)) return;
    const cur = handMidi();
    if (!cur.length) return;
    const target = midiAtPct(((clientX - r.left) / r.width) * 100);
    const d = Math.round((target - Math.min(...cur)) / 12);
    if (d !== 0) setMusic({ oct: clamp(music().oct + d, OCT_MIN, OCT_MAX) });
  };
  rail.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    railDrag = true;
    try { rail.setPointerCapture(e.pointerId); } catch { /* */ }
    jumpTo(e.clientX);
  });
  rail.addEventListener('pointermove', (e) => { if (railDrag) jumpTo(e.clientX); });
  const railEnd = (): void => { railDrag = false; };
  rail.addEventListener('pointerup', railEnd); rail.addEventListener('pointercancel', railEnd); rail.addEventListener('lostpointercapture', railEnd);

  // [R4] the stop group into the head's left corner (static markup in Signal.astro); without the corner it stands at the
  // top of the strata so the stop is never lost. The keybed closes the strata.
  const stopCorner = root.querySelector<HTMLElement>('.sig-head [data-corner="stop"]');
  if (stopCorner) stopCorner.append(stopGrp); else root.prepend(stopGrp);
  root.append(keybed);

  // ═══ PAINT FROM THE STATE (inst.onChange) ═════════════════════════════════════════════════════════════════════════
  let musicSig = '';
  const paintState = (): void => {
    const h = inst.state().harmony;
    setText(octVal, octText(h.music.oct));
    // the line's knobs (a drag's own echo reads what the knob holds, so it writes nothing back)
    bgRate.sync(h.gate.div); bgSwing.sync(h.gate.swing); bdSpeed.sync(h.dive.speedSec); bdDist.sync(h.dive.dist);
    const ms = `${h.music.key}|${h.music.scale}|${h.music.oct}`;
    if (ms !== musicSig) {
      musicSig = ms;
      assignLetters(h.music.scale);
      lampSig = '';
    }
  };
  const unsubChange = inst.onChange(paintState);

  // ═══ PAINT ON THE FRAME: the stop lamp, the piano's lamps, the keycaps' lamps ═════════════════════════════════════
  // what SOUNDS: the harmony's sounding() (a chord's extensions, a pool the keys' held set cannot see), else the keys'
  // held set (the contract's)
  const HS = H as unknown as { sounding?: () => ReadonlyArray<[string, number]> };
  const soundingNow = (): ReadonlyArray<[string, number]> => (typeof HS.sounding === 'function' ? HS.sounding() : KEYS.held());
  let stopLit = false;
  const paintLamps = (held: ReadonlyArray<[string, number]>): void => {
    const press = new Set<number>(fingers), latched = new Set<number>(), sounding = new Set<number>();
    const litCodes = new Set<string>();
    for (const [id, m] of held) {
      const hand = !id.includes('~');
      if (hand && id[0] === 'p') { (fingers.has(m) ? press : latched).add(m); continue; }
      if (hand && id[0] === 'k') {
        const code = id.slice(1); litCodes.add(code);
        (codesDown.has(code) || ptrCodes.has(code) ? press : latched).add(m); continue;
      }
      sounding.add(m);
    }
    // a letter under a finger whose note is not (yet) sounding: a voice still loading
    for (const code of [...codesDown, ...ptrCodes]) {
      if (litCodes.has(code)) continue;
      const m = letterMidi.get(code); if (m !== undefined) press.add(m);
    }
    for (const [m, k] of keyEls) {
      const p = press.has(m), l = !p && latched.has(m), s = !p && !l && sounding.has(m);
      k.classList.toggle('press', p); k.classList.toggle('latched', l); k.classList.toggle('sounding', s);
    }
    for (const [code, b] of capEls) b.classList.toggle('lit', litCodes.has(code));
  };
  let raf = 0;
  const frame = (): void => {
    raf = requestAnimationFrame(frame);
    const held = soundingNow();
    const live = T.running() || held.length > 0;
    if (live !== stopLit) { stopLit = live; stop.classList.toggle('lit', live); }
    let sig = '';
    for (const [id, m] of held) sig += `${id}:${m},`;
    sig += `|${[...fingers].join(',')}|${[...codesDown].join(',')}|${[...ptrCodes].join(',')}`;
    if (sig !== lampSig) { lampSig = sig; paintLamps(held); }
  };

  // ═══ THE KEYBOARD, REFLECTED (display only) ═══════════════════════════════════════════════════════════════════════
  // ONE window listener pair in the CAPTURE phase (it sees a key before anything can swallow it). It never
  // preventDefaults and never stops propagation; like the keymap's owns() it ignores ⌘/ctrl/alt and typing
  // (signal-studio-page/src/page/stop.ts:69-83's guards). It records which drawn codes are down (a keyup always clears,
  // whatever the modifiers) so each keycap can show its finger.
  const typing = (): boolean => {
    const a = document.activeElement as HTMLElement | null;
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
  };
  const reflectEls: Array<[HTMLElement, string]> = [[octDn, OCT_DN], [octUp, OCT_UP], [stop, STOP_CODE],
    ...[...capEls].map(([c, b]) => [b, c] as [HTMLElement, string]), ...[...gestEls.values()].map((b) => [b, b.dataset.code ?? ''] as [HTMLElement, string])];
  const paintKeysDown = (): void => {
    for (const [b, code] of reflectEls) b.classList.toggle('pressed', codesDown.has(code) || ptrCodes.has(code));
    lampSig = '';
  };
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing()) return;
    const code = e.code;
    if (!REFLECTED.has(code) || codesDown.has(code)) return;   // a repeat is the same finger
    codesDown.add(code);
    paintKeysDown();
  };
  const onKeyUp = (e: KeyboardEvent): void => { if (codesDown.delete(e.code)) paintKeysDown(); };
  // a lost window lets go of everything a pointer held here (the notes the keyboard holds are the keymap's: this only
  // keeps the view's own holds honest and says so to the harmony once)
  const letGo = (): void => {
    for (const m of [...fingers]) { fingers.delete(m); H.keyUp('p' + m); }
    for (const code of [...ptrCodes]) ptrEnds.get(code)?.();
    ptrCodes.clear(); railDrag = false;
  };
  const onBlur = (): void => { codesDown.clear(); letGo(); paintKeysDown(); };
  const onVis = (): void => { if (document.visibilityState === 'hidden') onBlur(); };
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVis);

  paintState();
  raf = requestAnimationFrame(frame);

  return {
    dispose(): void {
      cancelAnimationFrame(raf);
      unsubChange();
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      letGo();                   // a pointer still on Z / M lets go through the counter first (the key may still hold it)
      H.gesture = rawGesture;    // then the key's door goes back to the instrument
      stopGrp.remove(); keybed.remove();
    },
  };
};
