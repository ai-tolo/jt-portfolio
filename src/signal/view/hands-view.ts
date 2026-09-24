// SIGNAL R1 · lane V3 · view/hands-view.ts — THE HANDS. New code (the portfolio's), built on the Studio's gestures and
// laws, each block naming its source below. Five strata:
//   the TOP STRIP   the etched wordmark · the amber tempo glass (drag) + TAP · the red master STOP
//   the PIANOHEAD   ◀ OCTAVE ▶ · ◀ KEY ▶ + the scale cap · the sapphire chord glass · CHORD · HOLD · ARPEGGIATOR + RATE LENGTH GROOVE
//   the RACK        eight chord pads (stamp what sounds, play, ⇧ clears)
//   the KEYBED      C2..C7 (stage-geometry.ts) with the letters where the hand currently sits + the bracket rail
//   the GATE ROW    Z GATE + RATE · SWING · the engraved badge · M DIVE + SPEED · DIST
// The look is R0's LOOK B (src/components/signal/look/LookB.astro); every recipe is src/styles/signal/material.css's; the
// stratum's own layout is src/styles/signal/hands.css.
//
// MOUNT: mountHandsView(root, inst) PREPENDS the top strip (.sgh-top) and APPENDS the hands block (.sgh-hands) to root,
// so root may be the device's strata column with the towers row already inside (top · towers · hands) or an empty box.
// dispose() removes both, every listener, the rAF and every timer, and lets go of anything a pointer still holds.
// PAINT: every gesture calls the instrument, never the DOM's own state. The harmony fields are painted from inst.state()
// on inst.onChange; the digits, the beat lamp, the stop lamp, the key lamps and the sounding pads from time.bpm() /
// time.running() / time.playhead() / keys.held() on a requestAnimationFrame (DOM touched only when something changed).
// KEYBOARD: the integrator's keymap drives the instrument; this view only REFLECTS keys (a cap pressed while its key is
// down, a held gate pad, the TAP lamp, the ✕ under Shift, a letter's key pressed) through ONE capture-phase window
// listener that never preventDefaults, never stops propagation and ignores ⌘/ctrl/alt and typing: display only.
import { ARP_DIVS, BPM_MAX, BPM_MIN, GATE_DIVS, KEYMAP } from '../types.ts';
import type { ArpDiv, GateDiv, HarmonyState, KeyAction, MountView, ScaleName } from '../types.ts';
import { clamp, el, makeKnob } from './controls.ts';
import type { Knob } from './controls.ts';
import { accent, cap, etch, glass, gpad, knob, screen } from './common.ts';
import { BLACKS, WHITES, keyBox, midiAtPct, spanOf } from './stage-geometry.ts';

// ── words the device prints (legends, never explanations) ─────────────────────────────────────────────────────────
/** from signal-studio-v6lib/src/engine/dsp.ts:9 (2a9e4a7): the KEY screen's sharps (play.ts:611-612 keySummary). */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALES: readonly ScaleName[] = ['major', 'minor', 'chrom'];
const SCALE_WORD: Record<ScaleName, string> = { major: 'MAJ', minor: 'MIN', chrom: 'FREE' };
const keySummary = (k: number, s: ScaleName): string => (s === 'chrom' ? 'FREE' : `${NOTE_NAMES[((k % 12) + 12) % 12]} ${SCALE_WORD[s]}`);
const OCT_MIN = -1, OCT_MAX = 1;   // types.ts Music.oct −1..+1: every letter stays on the C2..C7 stage (D §6)
const octText = (o: number): string => (o > 0 ? `+${o}` : o < 0 ? `−${-o}` : '0');
/** from signal-studio-v6lib/src/voices/note-name.ts:10-13 (2a9e4a7): the Studio's ONE octave convention (w29, the MODX and
 *  Ableton read it): middle C = MIDI 60 = C3, so the stage's first C (MIDI 36) is C1. */
const cName = (m: number): string => `C${Math.floor(m / 12) - 2}`;
const LEFT = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M7 2L3 5L7 8Z"/></svg>';
const RIGHT = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 2L7 5L3 8Z"/></svg>';
const CROSS = '<svg class="sgh-px" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4L12 12M12 4L4 12"/></svg>';

// ── the keys this view reflects, read off the frozen key table (types.ts KEYMAP) so a remap follows ────────────────
type NoteAct = Extract<KeyAction, { kind: 'note' }>;
const ENTRIES = Object.entries(KEYMAP) as Array<[string, KeyAction]>;
/** The 15 letters, the diatonic row first so a shared key is claimed by a white letter (play.ts:434-437). */
const NOTE_KEYS: Array<[string, NoteAct]> = ENTRIES.filter((e): e is [string, NoteAct] => e[1].kind === 'note')
  .sort((a, b) => Number(a[1].colour) - Number(b[1].colour));
const codesOf = (kind: KeyAction['kind']): string[] => ENTRIES.filter(([, a]) => a.kind === kind).map(([c]) => c);
const PAD_CODE = new Map<string, number>();
for (const [c, a] of ENTRIES) if (a.kind === 'pad') PAD_CODE.set(c, a.i);
const CODES = {
  gate: codesOf('gate'), dive: codesOf('dive'), tap: codesOf('tap'), stop: codesOf('stop'),
  hold: codesOf('hold'), chord: codesOf('chord'), arp: codesOf('arp'),
};
const REFLECTED = new Set<string>([...NOTE_KEYS.map(([c]) => c), ...PAD_CODE.keys(), ...Object.values(CODES).flat()]);

// ── the knob laws (from signal-studio-v6lib/src/views/instrument/play.ts, 2a9e4a7) ────────────────────────────────
const LEN_MIN = 0.06, LEN_SPAN = 1.24;             // play.ts:809-813 LENGTH = the Studio's arp gate 0.06..1.3, default .5
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
function setText(e: Element, s: string): void { if (e.textContent !== s) e.textContent = s; }
/** A chord label with the naming law's honest cluster dot drawn faint (play.ts:531-541). */
function setLabel(e: HTMLElement, label: string): void {
  if (label.endsWith('·')) {
    const head = label.slice(0, -1);
    if (e.firstChild?.textContent === head && e.lastElementChild?.classList.contains('sgh-dot')) return;
    e.textContent = head;
    const dot = el('span', 'sgh-dot'); dot.textContent = '·'; e.appendChild(dot);
  } else setText(e, label);
}

export const mountHandsView: MountView = (root, inst) => {
  const H = inst.harmony, T = inst.time, KEYS = inst.keys;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t;
  };
  const drop = (t: ReturnType<typeof setTimeout> | null): void => { if (t) { clearTimeout(t); timers.delete(t); } };
  const music = (): HarmonyState['music'] => H.state().music;
  const setMusic = (p: Partial<HarmonyState['music']>): void => {
    const cur = music(), next = { ...cur, ...p };
    if (next.key !== cur.key || next.scale !== cur.scale || next.oct !== cur.oct) H.set('music', next);
  };
  const s0 = inst.state();
  // the view's own memory: which mapped codes a finger holds (the keyboard, reflected), which caps a pointer holds,
  // and the key-lamp signature the frame compares against ('' = repaint on the next frame)
  const codesDown = new Set<string>();
  const ptrCaps = new Set<HTMLElement>();
  let lampSig = '#';

  // a cap acts on its click (a latch, an arrow); a mouse click hands focus back so Space and Enter stay the page's
  const onClick = (b: HTMLButtonElement, fn: () => void): void => {
    b.addEventListener('click', (e) => { fn(); if (e.detail) b.blur(); });
  };
  // a momentary cap (TAP, STOP) acts on the press itself; .pressed is its travel while a pointer holds it
  const onPress = (b: HTMLButtonElement, fn: (e: PointerEvent | null) => void): void => {
    b.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      ptrCaps.add(b); b.classList.add('pressed');
      try { b.setPointerCapture(e.pointerId); } catch { /* */ }
      fn(e);
    });
    const up = (): void => { if (ptrCaps.delete(b)) paintKeysDown(); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('click', (e) => { if (e.detail === 0) fn(null); });   // Enter/Space on a focused cap
  };

  // ═══ 1 · THE TOP STRIP ═══════════════════════════════════════════════════════════════════════════════════════════
  // The Studio has no top strip (F-view §TOP): the tempo glass and TAP lift from time-strip.ts:45-102 (they lived in the
  // drums tower), the master stop replaces the shell's jam lamp (shell/index.ts:302, 323-340). Its three columns are the
  // towers' three, so the tempo sits over the keys tower and STOP ends where the bass tower ends.
  const top = el('div', 'sgh-top');
  const mark = el('div', 'sgh-mark');
  const lamp = el('i', 'sgh-lamp');                 // the power lamp: dark until the context runs (the first gesture)
  mark.append(lamp, etch('signal', 'sgh-word'));
  const tempoCl = el('div', 'sgh-tempocl');
  const tempo = glass('sgh-tempo sg-ns');
  tempo.dataset.ctl = 'tempo';   // no role=slider: the glass is a pointer surface (the arrows are the keymap's), its digits read as text
  const pls = el('i', 'sgh-pls');                   // the beat lamp: the first 16th of every beat while the clock runs
  const digits = el('b', 'sgh-bpm');
  const dbox = [el('i'), el('i'), el('i')];         // Orbitron's digits are proportional ('1' = .39 em): one fixed box each
  digits.append(...dbox);
  const bpmWord = el('small'); bpmWord.textContent = 'bpm';
  tempo.append(pls, digits, bpmWord);
  const tap = cap('tap', { led: true, key: '=', acc: 'tempo', cls: 'sgh-tap' });
  tap.dataset.ctl = 'tap';
  const tapLed = tap.querySelector<HTMLElement>('.sg-led')!;
  tempoCl.append(tempo, tap);
  const stop = cap('stop', { cls: 'red sgh-stop', key: 'esc', icon: '<i class="sgh-sq" aria-hidden="true"></i>' });
  stop.dataset.ctl = 'stop';
  top.append(mark, tempoCl, stop);

  // the tempo glass: vertical drag 0.5 BPM/px from the value under the finger (time-strip.ts:62-78), pointer capture,
  // no reset. The digits read time.bpm() on the frame, so they follow the drag at once (time.ts: bpm() = the target).
  let tDrag = false, tY = 0, tBpm = 0;
  tempo.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    tDrag = true; tY = e.clientY; tBpm = T.bpm();
    try { tempo.setPointerCapture(e.pointerId); } catch { /* */ }
  });
  tempo.addEventListener('pointermove', (e) => {
    if (!tDrag) return;
    const n = Math.round(clamp(tBpm + (tY - e.clientY) * 0.5, BPM_MIN, BPM_MAX));
    if (n !== Math.round(T.bpm())) T.setBpm(n);
  });
  const tEnd = (): void => { tDrag = false; };
  tempo.addEventListener('pointerup', tEnd); tempo.addEventListener('pointercancel', tEnd); tempo.addEventListener('lostpointercapture', tEnd);

  // TAP: time.tap() at the press (the event's own clock), its LED lit 90 ms per tap (time-strip.ts:86-98)
  let tapT: ReturnType<typeof setTimeout> | null = null;
  const tapLamp = (): void => { tapLed.classList.add('on'); drop(tapT); tapT = later(() => { tapLed.classList.remove('on'); tapT = null; }, 90); };
  onPress(tap, (e) => { T.tap(e ? e.timeStamp : undefined); tapLamp(); });
  // STOP: the master stop, on the press (a stop waits for nothing)
  onPress(stop, () => { inst.stop(); });

  // ═══ 2 · THE PIANOHEAD ═══════════════════════════════════════════════════════════════════════════════════════════
  // from signal-studio-v6lib/src/views/instrument/play.ts:104-133 (2a9e4a7): octave · key · chord screen · CHORD · HOLD ·
  // ARPEGGIATOR · RATE LENGTH GROOVE, one recessed bar. The Studio's key WHEEL (key-wheel.ts, play.ts:634-758) is not a
  // visitor's; the KEY glass walks the 12 keys with ◀ ▶ and a small cap cycles MAJ → MIN → FREE (F-view §i).
  const head = el('div', 'sgh-head sg-housing');
  const octDn = cap('', { icon: LEFT, cls: 'sgh-arrow', name: 'Octave down' }); octDn.dataset.ctl = 'oct-';
  const octScr = screen('0', 'octave', 'sgh-octscr');
  const octVal = octScr.querySelector('b')!;
  const octUp = cap('', { icon: RIGHT, cls: 'sgh-arrow', name: 'Octave up' }); octUp.dataset.ctl = 'oct+';
  const keyDn = cap('', { icon: LEFT, cls: 'sgh-arrow', name: 'Key down' }); keyDn.dataset.ctl = 'key-';
  const keyScr = screen('C MAJ', 'key', 'sgh-keyscr');
  const keyVal = keyScr.querySelector('b')!;
  const keyUp = cap('', { icon: RIGHT, cls: 'sgh-arrow', name: 'Key up' }); keyUp.dataset.ctl = 'key+';
  const scaleCap = cap('scale', { cls: 'sgh-scale' }); scaleCap.dataset.ctl = 'scale';   // a fixed legend: the screen shows the state
  // the chord glass (play.ts:120, 513-569): the name of what sounds, the degree under it, dark when off the map
  const chordGl = accent(glass('glow sgh-chord dim'), 'harmony');
  const clabel = el('b', 'sgh-clabel');
  const cdeg = el('small', 'sgh-cdeg');
  chordGl.append(clabel, cdeg);
  const chordCap = cap('chord', { led: true, acc: 'harmony', cls: 'sgh-tog' }); chordCap.dataset.ctl = 'chord';
  const holdCap = cap('hold', { led: true, acc: 'harmony', cls: 'sgh-tog' }); holdCap.dataset.ctl = 'hold';
  const arpCap = cap('arpeggiator', { led: true, acc: 'harmony', cls: 'sgh-tog' }); arpCap.dataset.ctl = 'arp';
  const arpGrp = accent(el('div', 'sgh-arp'), 'harmony');
  const kRate = knob('rate', { size: 'kx', side: true, steps: ARP_DIVS.length, value: s0.harmony.arp.div });
  const kLen = knob('length', { size: 'kx', side: true, value: s0.harmony.arp.length.toFixed(2) });
  const kGroove = knob('groove', { size: 'kx', side: true, value: s0.harmony.arp.groove.toFixed(2) });
  kRate.dataset.ctl = 'arp-rate'; kLen.dataset.ctl = 'arp-length'; kGroove.dataset.ctl = 'arp-groove';
  arpGrp.append(kRate, kLen, kGroove);
  head.append(
    octDn, octScr, octUp, el('i', 'sg-vdiv sgh-vdiv'),
    keyDn, keyScr, keyUp, scaleCap,
    chordGl,
    chordCap, holdCap, el('i', 'sg-vdiv sgh-vdiv'),
    arpCap, arpGrp,
  );

  // OCTAVE ◀ ▶ are literal (play.ts:590-600, R13c): they move the octave, never a sounding chord; the keyboard's ←/→
  // keep the contextual transpose (the keymap's). KEY ◀ ▶ walk the 12 keys; the scale cap cycles MAJ → MIN → FREE.
  onClick(octDn, () => setMusic({ oct: clamp(music().oct - 1, OCT_MIN, OCT_MAX) }));
  onClick(octUp, () => setMusic({ oct: clamp(music().oct + 1, OCT_MIN, OCT_MAX) }));
  onClick(keyDn, () => setMusic({ key: (music().key + 11) % 12 }));
  onClick(keyUp, () => setMusic({ key: (music().key + 1) % 12 }));
  onClick(scaleCap, () => { const s = music().scale; setMusic({ scale: SCALES[(SCALES.indexOf(s) + 1) % SCALES.length] }); });
  // the latches (play.ts:762-791): the cap writes the harmony; its lit state is painted back from the state
  onClick(chordCap, () => H.set('chord', !H.state().chord));
  onClick(holdCap, () => H.set('hold', !H.state().hold));
  onClick(arpCap, () => { const a = H.state().arp; H.set('arp', { ...a, on: !a.on }); });
  // RATE (stepped over ARP_DIVS) · LENGTH (0.06..1.3) · GROOVE (0..1): play.ts:797-816
  const arpWrite = (p: Partial<HarmonyState['arp']>): void => {
    const a = H.state().arp, n = { ...a, ...p };
    if (n.div !== a.div || !near(n.length, a.length) || !near(n.groove, a.groove)) H.set('arp', n);
  };
  const bRate = bindKnob<ArpDiv>(kRate, s0.harmony.arp.div, {
    toV: (d) => stepV(Math.max(0, ARP_DIVS.indexOf(d)), ARP_DIVS.length), fromV: (v) => ARP_DIVS[stepI(v, ARP_DIVS.length)],
    same: (a, b) => a === b, text: (d) => d, write: (div) => arpWrite({ div }), steps: ARP_DIVS.length,
  });
  const bLen = bindKnob<number>(kLen, s0.harmony.arp.length, {
    toV: (l) => clamp((l - LEN_MIN) / LEN_SPAN, 0, 1), fromV: (v) => LEN_MIN + v * LEN_SPAN,
    same: near, text: (l) => l.toFixed(2), write: (length) => arpWrite({ length }), dflt: 0.5,
  });
  const bGroove = bindKnob<number>(kGroove, s0.harmony.arp.groove, {
    toV: (g) => clamp(g, 0, 1), fromV: (v) => v, same: near, text: (g) => g.toFixed(2), write: (groove) => arpWrite({ groove }), dflt: 0,
  });

  // ═══ 3 · THE RACK ═════════════════════════════════════════════════════════════════════════════════════════════════
  // from signal-studio-v6lib/src/views/instrument/chord-rack.ts:64-81, 207-230 (2a9e4a7): eight pads. A press TRIGGERS
  // (an occupied pad plays, gated until release; an empty pad with something sounding STAMPS it; ⇧ clears), the release
  // RELEASES. The face: the number engraved, the chord's name and degree (re-derived against the live key on every
  // paint, chord-rack.ts:234-244), .on while its notes sound, .sel on the last one played, a 150 ms flash on a stamp.
  const rack = accent(el('div', 'sgh-rack'), 'harmony');
  interface PadEls { pad: HTMLButtonElement; label: HTMLElement; deg: HTMLElement }
  const pads: PadEls[] = [];
  const padHeld = new Set<number>();
  for (let i = 0; i < 8; i++) {
    const pad = document.createElement('button');
    pad.type = 'button'; pad.className = 'sgh-pad'; pad.tabIndex = -1; pad.dataset.pad = String(i);
    const num = el('em', 'sgh-pnum'); num.textContent = String(i + 1);
    const label = el('b', 'sgh-plabel');
    const deg = el('i', 'sgh-pdeg');
    pad.append(num, label, deg);
    pad.insertAdjacentHTML('beforeend', CROSS);
    pad.append(el('i', 'sg-led'));
    pad.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (padHeld.has(i)) return;
      padHeld.add(i);
      try { pad.setPointerCapture(e.pointerId); } catch { /* */ }
      H.trigger(i, e.shiftKey);
    });
    const up = (): void => { if (padHeld.delete(i)) H.release(i); };
    pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); pad.addEventListener('lostpointercapture', up);
    pads.push({ pad, label, deg });
    rack.append(pad);
  }

  // ═══ 4 · THE KEYBED + THE BRACKET RAIL ═══════════════════════════════════════════════════════════════════════════
  // from signal-studio-v6lib/src/views/instrument/play.ts:134-145, 346-376, 450-470 and keybed-locator.ts:27-72 (2a9e4a7):
  // ONE fixed keyboard (C2..C7 here) that never moves; the letters print on the keys the hand currently drives; the
  // bracket under it says where, and is itself a control (click or drag = an octave jump, snapped). Every key plays its
  // own pitch as 'p'+midi through the harmony (so HOLD / CHORD / ARP see it), pointer-captured per key: no glissando.
  const bedWrap = el('div', 'sgh-keybed');
  const bed = el('div', 'sgh-bed');
  const keysBox = el('div', 'sgh-keys');
  bed.append(keysBox);
  interface KeyEls { el: HTMLElement; q: HTMLElement; nn: HTMLElement }
  const keyEls = new Map<number, KeyEls>();
  const fingers = new Set<number>();                // MIDI keys a pointer holds right now
  const makeKey = (m: number, black: boolean): void => {
    const b = keyBox(m);
    if (!b) return;
    const k = el('span', black ? 'sgh-b' : 'sgh-w');
    k.dataset.m = String(m);
    if (black) { k.style.left = `${b.left.toFixed(4)}%`; k.style.width = `${b.width.toFixed(4)}%`; }
    else { k.style.left = `calc(${b.left.toFixed(4)}% + 1px)`; k.style.width = `calc(${b.width.toFixed(4)}% - 2px)`; }
    const q = el('b', 'sgh-q'), nn = el('small', 'sgh-nn');
    k.append(q, nn);
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
    keyEls.set(m, { el: k, q, nn });
    keysBox.append(k);
  };
  for (const m of WHITES) makeKey(m, false);
  for (const m of BLACKS) makeKey(m, true);
  const rail = el('div', 'sgh-rail');
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
  railIn.append(win);
  rail.append(railIn);
  bedWrap.append(bed, rail);

  // the letters: each of the 15 note keys asks the harmony which MIDI it plays now (music.ts's law, never re-derived
  // here); the diatonic row claims first; the colour row (the key's five outside notes, play.ts:416-433) wears the warm
  // rim in a key and is plain chromatic in FREE
  const letterMidi = new Map<string, number>();     // code → MIDI it plays now
  const handMidi = (): number[] => NOTE_KEYS.map(([, a]) => H.midiFor(a.offset, a.colour));
  const assignLetters = (scale: ScaleName): void => {
    letterMidi.clear();
    const qOf = new Map<number, string>(), colour = new Set<number>(), all: number[] = [];
    for (const [code, a] of NOTE_KEYS) {
      const m = H.midiFor(a.offset, a.colour);
      all.push(m); letterMidi.set(code, m);
      if (!keyEls.has(m) || qOf.has(m)) continue;
      qOf.set(m, code.replace(/^Key/, ''));
      if (a.colour && scale !== 'chrom') colour.add(m);
    }
    for (const [m, k] of keyEls) {
      const q = qOf.get(m);
      setText(k.q, q ?? '');
      k.el.classList.toggle('inbracket', q !== undefined);
      k.el.classList.toggle('color', colour.has(m));
      if (q) k.el.dataset.q = q; else delete k.el.dataset.q;
    }
    const span = spanOf(all);
    win.hidden = !span;
    if (span) { win.style.left = `${span.left.toFixed(3)}%`; win.style.width = `${span.width.toFixed(3)}%`; }
  };
  // a lit key prints its name: the harmony's naming law for one note (chord-name: "1 → the note name", spelled by the
  // key signature), sharps when a name is not to be had
  const relabel = (): void => {
    for (const [m, k] of keyEls) setText(k.nn, H.name([m]).label || NOTE_NAMES[m % 12]);
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

  // ═══ 5 · THE GATE ROW ═════════════════════════════════════════════════════════════════════════════════════════════
  // from signal-studio-v6lib/src/views/instrument/play.ts:146-163, 818-883 (2a9e4a7): the elastomer Z pad (GATE, held)
  // with RATE (stepped GATE_DIVS) · SWING, the engraved badge, the M pad (DIVE, held) with SPEED (inverted) · DIST.
  const gateRow = accent(el('div', 'sgh-gate sg-housing'), 'gate');
  const gz = gpad('z'); gz.dataset.code = 'KeyZ'; gz.setAttribute('aria-label', 'Gate');
  const gm = gpad('m', 'dive'); gm.dataset.code = 'KeyM'; gm.setAttribute('aria-label', 'Dive');
  const kgRate = knob('rate', { size: 'ks', side: true, steps: GATE_DIVS.length, value: s0.harmony.gate.div });
  const kgSwing = knob('swing', { size: 'ks', side: true, value: String(Math.round(s0.harmony.gate.swing * 100)) });
  const kdSpeed = knob('speed', { size: 'ks', side: true, value: s0.harmony.dive.speedSec.toFixed(2) });
  const kdDist = knob('dist', { size: 'ks', side: true, value: String(s0.harmony.dive.dist) });
  kgRate.dataset.ctl = 'gate-rate'; kgSwing.dataset.ctl = 'gate-swing'; kdSpeed.dataset.ctl = 'dive-speed'; kdDist.dataset.ctl = 'dive-dist';
  const gl = el('div', 'sgh-ggrp');
  gl.append(etch('gate', 'sgh-gword'), gz, kgRate, kgSwing);
  const gr = el('div', 'sgh-ggrp');
  gr.append(gm, etch('dive', 'sgh-gword'), kdSpeed, kdDist);
  gateRow.append(gl, etch('signal', 'badge sgh-badge'), gr);

  // the held gestures (play.ts:820-840): a pointer hold is the gesture; the lit pad is pointer OR its key
  const ptrGesture = { gate: false, dive: false };
  const holdPad = (name: 'gate' | 'dive', pad: HTMLButtonElement): void => {
    pad.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (ptrGesture[name]) return;
      ptrGesture[name] = true;
      try { pad.setPointerCapture(e.pointerId); } catch { /* */ }
      H.gesture(name, true);
      paintKeysDown();
    });
    const up = (): void => { if (!ptrGesture[name]) return; ptrGesture[name] = false; H.gesture(name, false); paintKeysDown(); };
    pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); pad.addEventListener('lostpointercapture', up);
  };
  holdPad('gate', gz);
  holdPad('dive', gm);
  const gateWrite = (p: Partial<HarmonyState['gate']>): void => {
    const g = H.state().gate, n = { ...g, ...p };
    if (n.div !== g.div || !near(n.swing, g.swing)) H.set('gate', n);
  };
  const diveWrite = (p: Partial<HarmonyState['dive']>): void => {
    const d = H.state().dive, n = { ...d, ...p };
    if (!near(n.speedSec, d.speedSec) || n.dist !== d.dist) H.set('dive', n);
  };
  const bgRate = bindKnob<GateDiv>(kgRate, s0.harmony.gate.div, {
    toV: (d) => stepV(Math.max(0, GATE_DIVS.indexOf(d)), GATE_DIVS.length), fromV: (v) => GATE_DIVS[stepI(v, GATE_DIVS.length)],
    same: (a, b) => a === b, text: (d) => d, write: (div) => gateWrite({ div }), steps: GATE_DIVS.length,
  });
  const bgSwing = bindKnob<number>(kgSwing, s0.harmony.gate.swing, {
    toV: (s) => clamp(s, 0, 1), fromV: (v) => v, same: near, text: (s) => String(Math.round(s * 100)),
    write: (swing) => gateWrite({ swing }), dflt: 0,
  });
  const bdSpeed = bindKnob<number>(kdSpeed, s0.harmony.dive.speedSec, {
    toV: (t) => clamp((DIVE_T_MAX - t) / (DIVE_T_MAX - DIVE_T_MIN), 0, 1), fromV: (v) => DIVE_T_MAX - v * (DIVE_T_MAX - DIVE_T_MIN),
    same: near, text: (t) => t.toFixed(2), write: (speedSec) => diveWrite({ speedSec }), dflt: 0.45,
  });
  const bdDist = bindKnob<number>(kdDist, s0.harmony.dive.dist, {
    toV: (d) => clamp((d - DIVE_D_MIN) / (DIVE_D_MAX - DIVE_D_MIN), 0, 1), fromV: (v) => Math.round(DIVE_D_MIN + v * (DIVE_D_MAX - DIVE_D_MIN)),
    same: (a, b) => a === b, text: (d) => String(d), write: (dist) => diveWrite({ dist }), dflt: 24,
  });

  const hands = el('div', 'sgh-hands');
  hands.append(head, rack, bedWrap, gateRow);
  root.prepend(top);
  root.append(hands);

  // ═══ THE CHORD GLASS: the settle law (from signal-studio-v6lib/src/views/instrument/play.ts:513-569, 2a9e4a7) ═══════
  // A held-set change arms a 90 ms settle; the name is taken once the set has held still that long (a strum names
  // once). A new name SNAPS and blinks 70 ms (burst-guarded 150 ms); on silence the last name holds DIM; a key or
  // scale change respells at once. Nearest-MIDI is the keys' own MIDI here (the contract's held() carries it).
  const SETTLE_MS = 90, BLINK_GUARD_MS = 150;
  let settleT: ReturnType<typeof setTimeout> | null = null;
  let lastBlink = -Infinity, shownLabel = '', shownDeg = '', lastMidi: number[] = [];
  // [integrator R1] what SOUNDS: the harmony's sounding() when the instance has it (lane H: the arp pool while the arp
  // runs, where keys.held() is empty because the arp books one-shots), else the keys' held set (the contract's)
  const HS = H as unknown as { sounding?: () => ReadonlyArray<[string, number]> };
  const soundingNow = (): ReadonlyArray<[string, number]> => (typeof HS.sounding === 'function' ? HS.sounding() : KEYS.held());
  const heldMidi = (): number[] => soundingNow().map(([, m]) => m);
  const blinkChord = (): void => {
    const now = performance.now();
    if (now - lastBlink < BLINK_GUARD_MS) return;
    lastBlink = now;
    for (const e of [clabel, cdeg]) { e.classList.remove('sg-t-blink'); void e.offsetWidth; e.classList.add('sg-t-blink'); }
  };
  const showChord = (midi: number[], dim: boolean): void => {
    if (!midi.length) return;
    const r = H.name(midi);
    chordGl.classList.toggle('dim', dim);
    if (r.label !== shownLabel || (r.degree ?? '') !== shownDeg) {
      setLabel(clabel, r.label);
      setText(cdeg, r.degree ?? '');
      cdeg.classList.toggle('on', !!r.degree);
      shownLabel = r.label; shownDeg = r.degree ?? '';
      if (!dim) blinkChord();
    }
  };
  const settleChord = (): void => {
    settleT = null;
    const m = heldMidi();
    if (m.length) { lastMidi = m; showChord(m, false); } else chordGl.classList.add('dim');
  };
  const onHeld = (): void => { drop(settleT); settleT = later(settleChord, SETTLE_MS); };
  const respell = (): void => {
    const m = heldMidi();
    if (m.length) { lastMidi = m; showChord(m, false); } else if (lastMidi.length) showChord(lastMidi, true);
  };
  const unsubHeld = KEYS.onHeldChange(onHeld);

  // ═══ PAINT FROM THE STATE (inst.onChange) ═════════════════════════════════════════════════════════════════════════
  let musicSig = '', rackSig = '', selPad = -1, prevRack: boolean[] = [];
  const paintRackFaces = (rk: HarmonyState['rack'], stamped: Set<number>): void => {
    rk.forEach((notes, i) => {
      const p = pads[i];
      if (!p) return;
      const full = !!notes && notes.length > 0;
      p.pad.classList.toggle('full', full);
      if (full) {
        const r = H.name(notes);
        setLabel(p.label, r.label);
        setText(p.deg, r.degree ?? '');
        p.deg.classList.toggle('on', !!r.degree);
      } else { setText(p.label, ''); setText(p.deg, ''); p.deg.classList.remove('on'); }
      if (stamped.has(i)) {
        p.pad.classList.remove('flash'); void p.pad.offsetWidth; p.pad.classList.add('flash');
        later(() => p.pad.classList.remove('flash'), 160);
      }
    });
  };
  const paintState = (): void => {
    const h = inst.state().harmony;
    setText(octVal, octText(h.music.oct));
    setText(keyVal, keySummary(h.music.key, h.music.scale));
    for (const [b, on] of [[chordCap, h.chord], [holdCap, h.hold], [arpCap, h.arp.on]] as Array<[HTMLElement, boolean]>) {
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    }
    for (const k of [kRate, kLen, kGroove]) k.classList.toggle('steel', !h.arp.on);   // steel until the arp runs
    bRate.sync(h.arp.div); bLen.sync(h.arp.length); bGroove.sync(h.arp.groove);
    bgRate.sync(h.gate.div); bgSwing.sync(h.gate.swing); bdSpeed.sync(h.dive.speedSec); bdDist.sync(h.dive.dist);
    const ms = `${h.music.key}|${h.music.scale}|${h.music.oct}`;
    if (ms !== musicSig) {
      const spell = musicSig !== '' && musicSig.split('|').slice(0, 2).join('|') !== `${h.music.key}|${h.music.scale}`;
      if (musicSig === '' || spell) relabel();
      musicSig = ms;
      assignLetters(h.music.scale);
      if (spell) respell();
      lampSig = '';
    }
    const rs = JSON.stringify(h.rack) + ms;
    if (rs !== rackSig) {
      const stamped = new Set<number>();
      if (rackSig !== '') h.rack.forEach((n, i) => { if (n && n.length && !prevRack[i]) stamped.add(i); });
      rackSig = rs;
      prevRack = h.rack.map((n) => !!n && n.length > 0);
      paintRackFaces(h.rack, stamped);
    }
  };
  const unsubChange = inst.onChange(paintState);

  // ═══ PAINT ON THE FRAME: the digits, the lamps, the key lamps, the sounding pads ═══════════════════════════════════
  let shownBpm = -1, padsOnPrev = new Set<number>(), chordSig = '';
  const paintDigits = (n: number): void => {
    const s = String(n).padStart(dbox.length, ' ');
    dbox.forEach((d, i) => setText(d, s[i] === ' ' ? '' : s[i]));
  };
  const paintLamps = (held: ReadonlyArray<[string, number]>): void => {
    const press = new Set<number>(fingers), latched = new Set<number>(), sounding = new Set<number>(), padsOn = new Set<number>();
    const handCodes = new Set<string>();
    for (const [id, m] of held) {
      const hand = !id.includes('~');
      if (hand && id[0] === 'p') { (fingers.has(m) ? press : latched).add(m); continue; }
      if (hand && id[0] === 'k') {
        const code = id.slice(1); handCodes.add(code);
        (codesDown.has(code) ? press : latched).add(m); continue;
      }
      if (id[0] === 'c') { const i = parseInt(id.slice(1), 10); if (i >= 0 && i < pads.length) padsOn.add(i); }
      sounding.add(m);
    }
    // a letter under a finger whose note is not (yet) sounding: the arp's pool, a voice still loading
    for (const code of codesDown) { if (handCodes.has(code)) continue; const m = letterMidi.get(code); if (m !== undefined) press.add(m); }
    for (const [m, k] of keyEls) {
      const p = press.has(m), l = !p && latched.has(m), s = !p && !l && sounding.has(m);
      k.el.classList.toggle('press', p); k.el.classList.toggle('latched', l); k.el.classList.toggle('sounding', s);
    }
    for (const i of padsOn) if (!padsOnPrev.has(i)) selPad = i;   // .sel = the last pad that began to sound
    padsOnPrev = padsOn;
    pads.forEach((p, i) => { p.pad.classList.toggle('on', padsOn.has(i)); p.pad.classList.toggle('sel', i === selPad); });
  };
  let raf = 0;
  const frame = (): void => {
    raf = requestAnimationFrame(frame);
    const bpm = Math.round(T.bpm());
    if (bpm !== shownBpm) { shownBpm = bpm; paintDigits(bpm); }
    const running = T.running();
    const held = soundingNow();
    let hsig = '';
    for (const [, m] of held) hsig += `${m},`;
    if (hsig !== chordSig) { chordSig = hsig; onHeld(); }   // [integrator R1] a pool change settles the chord glass too
    pls.classList.toggle('on', running && T.playhead().step % 4 === 0);
    stop.classList.toggle('live', running || held.length > 0);
    lamp.classList.toggle('on', inst.ctx.state === 'running');
    let sig = '';
    for (const [id, m] of held) sig += `${id}:${m},`;
    sig += `|${[...fingers].join(',')}|${[...codesDown].join(',')}`;
    if (sig !== lampSig) { lampSig = sig; paintLamps(held); }
  };

  // ═══ THE KEYBOARD, REFLECTED (display only) ═══════════════════════════════════════════════════════════════════════
  // ONE window listener pair in the CAPTURE phase (it sees a key before anything can swallow it). It never
  // preventDefaults and never stops propagation; like the keymap's owns() it ignores ⌘/ctrl/alt and typing
  // (signal-studio-page/src/page/stop.ts:69-83's guards). It records which mapped codes are down (a keyup always
  // clears, whatever the modifiers) so the caps, the gate pads and the letters' keys can show a finger.
  let shift = false;
  const typing = (): boolean => {
    const a = document.activeElement as HTMLElement | null;
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
  };
  const capKeys: Array<[HTMLElement, string[]]> = [[tap, CODES.tap], [stop, CODES.stop], [holdCap, CODES.hold], [chordCap, CODES.chord], [arpCap, CODES.arp]];
  const setShift = (on: boolean): void => { if (on !== shift) { shift = on; rack.classList.toggle('shift', on); } };
  const paintKeysDown = (): void => {
    const any = (codes: string[]): boolean => codes.some((c) => codesDown.has(c));
    for (const [b, codes] of capKeys) b.classList.toggle('pressed', ptrCaps.has(b) || any(codes));
    gz.classList.toggle('on', ptrGesture.gate || any(CODES.gate));
    gm.classList.toggle('on', ptrGesture.dive || any(CODES.dive));
    const padKeys = new Set<number>();
    for (const c of codesDown) { const i = PAD_CODE.get(c); if (i !== undefined) padKeys.add(i); }
    pads.forEach((p, i) => p.pad.classList.toggle('pressed', padKeys.has(i)));
    lampSig = '';
  };
  // a Shift key's own event names the modifier by its code (a synthetic event may carry no shiftKey); any other key's
  // event reports it in shiftKey
  const isShift = (code: string): boolean => code === 'ShiftLeft' || code === 'ShiftRight';
  const onKeyDown = (e: KeyboardEvent): void => {
    setShift(isShift(e.code) || e.shiftKey);
    if (e.metaKey || e.ctrlKey || e.altKey || typing()) return;
    const code = e.code;
    if (!REFLECTED.has(code) || codesDown.has(code)) return;   // a repeat is the same finger
    codesDown.add(code);
    if (CODES.tap.includes(code) && !e.repeat) tapLamp();
    paintKeysDown();
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    setShift(!isShift(e.code) && e.shiftKey);
    if (codesDown.delete(e.code)) paintKeysDown();
  };
  // a lost window lets go of everything a finger or a pointer held here (the notes themselves are the keymap's and
  // the keys module's: this only keeps the view's own holds honest and says so to the harmony once)
  const letGo = (): void => {
    for (const m of [...fingers]) { fingers.delete(m); H.keyUp('p' + m); }
    for (const i of [...padHeld]) { padHeld.delete(i); H.release(i); }
    for (const name of ['gate', 'dive'] as const) if (ptrGesture[name]) { ptrGesture[name] = false; H.gesture(name, false); }
    ptrCaps.clear(); tDrag = false; railDrag = false;
  };
  const onBlur = (): void => { codesDown.clear(); setShift(false); letGo(); paintKeysDown(); };
  const onVis = (): void => { if (document.visibilityState === 'hidden') onBlur(); };
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVis);

  paintState();
  if (soundingNow().length) onHeld();
  raf = requestAnimationFrame(frame);

  return {
    dispose(): void {
      cancelAnimationFrame(raf);
      for (const t of timers) clearTimeout(t);
      timers.clear();
      unsubChange(); unsubHeld();
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      letGo();
      top.remove(); hands.remove();
    },
  };
};
