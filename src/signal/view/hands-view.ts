// SIGNAL R1 · lane V3 · view/hands-view.ts — THE HANDS. New code (the portfolio's), built on the Studio's gestures and
// laws, each block naming its source below. R3 (THE FIRST-TIMER ROUND, lane V, NOTES-SIGNAL-R3.md §1.3 HANDS) recomposed
// it into two strata:
//   the TOP STRIP   [←] OCTAVE [→] · ◀ KEY ▶ SCALE · [the POWER slot] · the sapphire CHORD glass · [esc] stop
//   the KEYBED      the small piano C3..C7 (lights only: no letters, no names) · the bracket rail · the KEYCAP ROWS
//                   (the colour row W E R T Y U I O over the home row A S D F G H J K L, in the laptop's stagger)
// R3 LEFT THIS VIEW (other lanes draw them now): the wordmark + its lamp (gone), the tempo glass + TAP (the drums tower),
// CHORD · HOLD · ARPEGGIATOR + RATE LENGTH GROOVE and the whole gate row with its reference-counted gesture wrapper (the
// keys tower), the rack (dropped this round, §1.1), the pianohead as a stratum (its octave / key parts live in the strip).
// The look is R0's LOOK B; every recipe is src/styles/signal/material.css's, the keycap is keycap.css's (`key()` from
// common.ts); the strata's own layout is src/styles/signal/hands.css.
//
// MOUNT: mountHandsView(root, inst) PREPENDS the top strip (.sgh-top) and APPENDS the keybed block (.sgh-keybed) to root
// (the device's strata column: top · towers · keybed). dispose() removes both, every listener, the rAF and every timer,
// and lets go of anything a pointer still holds.
// [R2] The top strip carries an empty .sgh-power slot at the device's top middle: view/power.ts mounts the disc in it.
// PAINT: every gesture calls the instrument, never the DOM's own state. The octave / key screens and the colour rims are
// painted from inst.state() on inst.onChange; the stop lamp, the piano's lamps and the keycaps' lamps from
// time.running() / the harmony's sounding() on a requestAnimationFrame (DOM touched only when a signature changed).
// KEYBOARD: the integrator's keymap drives the instrument; this view only REFLECTS keys (a keycap goes .pressed while its
// key is down) through ONE capture-phase window listener that never preventDefaults, never stops propagation and ignores
// ⌘/ctrl/alt and typing: display only.
import { KEYCAP_ROWS, KEYMAP } from '../types.ts';
import type { HarmonyState, KeyAction, MountView, ScaleName } from '../types.ts';
import { clamp, el } from './controls.ts';
import { accent, cap, etch, glass, key, screen } from './common.ts';
import { BLACKS, WHITES, keyBox, midiAtPct, spanOf } from './stage-geometry.ts';

// ── words the device prints (legends, never explanations) ─────────────────────────────────────────────────────────
/** from signal-studio-v6lib/src/engine/dsp.ts:9 (2a9e4a7): the KEY screen's sharps (play.ts:611-612 keySummary). */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALES: readonly ScaleName[] = ['major', 'minor', 'chrom'];
const SCALE_WORD: Record<ScaleName, string> = { major: 'MAJ', minor: 'MIN', chrom: 'FREE' };
const keySummary = (k: number, s: ScaleName): string => (s === 'chrom' ? 'FREE' : `${NOTE_NAMES[((k % 12) + 12) % 12]} ${SCALE_WORD[s]}`);
const OCT_MIN = -1, OCT_MAX = 1;   // types.ts Music.oct −1..+1: every letter stays on the C3..C7 stage (D §6)
const octText = (o: number): string => (o > 0 ? `+${o}` : o < 0 ? `−${-o}` : '0');
/** from signal-studio-v6lib/src/voices/note-name.ts:10-13 (2a9e4a7): the Studio's ONE octave convention (w29, the MODX and
 *  Ableton read it): middle C = MIDI 60 = C3, so the stage's first C (MIDI 48) prints C2. */
const cName = (m: number): string => `C${Math.floor(m / 12) - 2}`;
const LEFT = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M7 2L3 5L7 8Z"/></svg>';
const RIGHT = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 2L7 5L3 8Z"/></svg>';

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
const REFLECTED = new Set<string>([...CAP_CODES, OCT_DN, OCT_UP, STOP_CODE]);
const letterOf = (code: string): string => code.replace(/^Key/, '');

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
  // the view's own memory: which drawn codes a finger holds (the keyboard, reflected), which keycaps a pointer holds,
  // and the lamp signature the frame compares against ('' = repaint on the next frame)
  const codesDown = new Set<string>();
  const ptrCodes = new Set<string>();
  let lampSig = '#';

  // a cap acts on its click (an arrow, the scale); a mouse click hands focus back so Space and Enter stay the page's
  const onClick = (b: HTMLButtonElement, fn: () => void): void => {
    b.addEventListener('click', (e) => { fn(); if (e.detail) b.blur(); });
  };
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

  // ═══ 1 · THE TOP STRIP ═══════════════════════════════════════════════════════════════════════════════════════════
  // left: the octave (its two keys, the ← → the keymap teaches) and the key (◀ glass ▶ + the scale cap), from the old
  // pianohead (play.ts:104-133); centre: the POWER slot; right of centre: the chord glass; right end: the master stop.
  const top = el('div', 'sgh-top');
  const left = el('div', 'sgh-tl');
  const octDn = key(OCT_DN, '←', { name: 'Octave down' }); octDn.dataset.ctl = 'oct-'; octDn.classList.add('sgh-okey');
  const octScr = screen('0', 'octave', 'sgh-octscr'); octScr.dataset.ctl = 'octave';
  const octVal = octScr.querySelector('b')!;
  const octUp = key(OCT_UP, '→', { name: 'Octave up' }); octUp.dataset.ctl = 'oct+'; octUp.classList.add('sgh-okey');
  const octGrp = el('div', 'sgh-octgrp');
  octGrp.append(octDn, octScr, octUp);
  const keyDn = cap('', { icon: LEFT, cls: 'sgh-arrow', name: 'Key down' }); keyDn.dataset.ctl = 'key-';
  const keyScr = screen('C MAJ', 'key', 'sgh-keyscr'); keyScr.dataset.ctl = 'key';
  const keyVal = keyScr.querySelector('b')!;
  const keyUp = cap('', { icon: RIGHT, cls: 'sgh-arrow', name: 'Key up' }); keyUp.dataset.ctl = 'key+';
  const scaleCap = cap('scale', { cls: 'sgh-scale' }); scaleCap.dataset.ctl = 'scale';   // a fixed legend: the screen shows the state
  const keyGrp = el('div', 'sgh-keygrp');
  keyGrp.append(keyDn, keyScr, keyUp, scaleCap);
  left.append(octGrp, keyGrp);
  // [R2] the POWER slot: the device's top middle (power.css places it, view/power.ts fills it); absolutely placed, so the
  // strip's columns never move
  const powerSlot = el('div', 'sgh-power');
  // the chord glass (play.ts:120, 513-569): the name of what sounds, the degree under it, dark when off the map
  const right = el('div', 'sgh-tr');
  const chordGl = accent(glass('glow sgh-chord dim'), 'harmony'); chordGl.dataset.ctl = 'chord-glass';
  const clabel = el('b', 'sgh-clabel');
  const cdeg = el('small', 'sgh-cdeg');
  chordGl.append(clabel, cdeg);
  // the master STOP: the Escape keycap, red; lit while anything runs, acting on the press itself (a stop waits for nothing)
  const stopGrp = el('div', 'sgh-stopgrp');
  const stop = accent(key(STOP_CODE, 'esc', { name: 'Stop' }), 'stop'); stop.dataset.ctl = 'stop'; stop.classList.add('sgh-stop');
  stopGrp.append(stop, etch('stop', 'sgh-stopword'));
  right.append(chordGl, stopGrp);
  top.append(left, powerSlot, right);

  // OCTAVE ← → are literal (play.ts:590-600, R13c): they move the octave, never a sounding chord; the keyboard's ←/→ keep
  // the contextual transpose (the keymap's). KEY ◀ ▶ walk the 12 keys; the scale cap cycles MAJ → MIN → FREE.
  ptrKey(octDn, OCT_DN, () => setMusic({ oct: clamp(music().oct - 1, OCT_MIN, OCT_MAX) }));
  ptrKey(octUp, OCT_UP, () => setMusic({ oct: clamp(music().oct + 1, OCT_MIN, OCT_MAX) }));
  onClick(keyDn, () => setMusic({ key: (music().key + 11) % 12 }));
  onClick(keyUp, () => setMusic({ key: (music().key + 1) % 12 }));
  onClick(scaleCap, () => { const s = music().scale; setMusic({ scale: SCALES[(SCALES.indexOf(s) + 1) % SCALES.length] }); });
  ptrKey(stop, STOP_CODE, () => inst.stop());

  // ═══ 2 · THE KEYBED: the piano (lights) · the bracket rail · the keycap rows ═══════════════════════════════════════
  // from signal-studio-v6lib/src/views/instrument/play.ts:134-145, 346-376, 450-470 and keybed-locator.ts:27-72 (2a9e4a7):
  // ONE fixed keyboard (C3..C7 here) that never moves; the bracket under it says where the hand sits, and is itself a
  // control (click or drag = an octave jump, snapped). Every piano key plays its own pitch as 'p'+midi through the
  // harmony (so HOLD / CHORD / ARP see it), pointer-captured per key: no glissando. R3: no letters on the piano, no names:
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

  // THE KEYCAP ROWS (R3, brief §D): the laptop's two rows as real keycaps, the colour row half a cap to the right of the
  // home row (W over the A/S seam). A cap PLAYS its note (the same 'k'+code id the keyboard uses, so the harmony sees one
  // hand); R and I play nothing and stay dormant.
  const caps = el('div', 'sgh-caps'); caps.dataset.ctl = 'keycaps';
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
  caps.append(capRow(KEYCAP_ROWS.colour, 'sgh-colour'), capRow(KEYCAP_ROWS.home, 'sgh-home'));
  keybed.append(bed, rail, caps);

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

  root.prepend(top);
  root.append(keybed);

  // ═══ THE CHORD GLASS: the settle law (from signal-studio-v6lib/src/views/instrument/play.ts:513-569, 2a9e4a7) ═══════
  // A held-set change arms a 90 ms settle; the name is taken once the set has held still that long (a strum names
  // once). A new name SNAPS and blinks 70 ms (burst-guarded 150 ms); on silence the last name holds DIM; a key or
  // scale change respells at once.
  const SETTLE_MS = 90, BLINK_GUARD_MS = 150;
  let settleT: ReturnType<typeof setTimeout> | null = null;
  let lastBlink = -Infinity, shownLabel = '', shownDeg = '', lastMidi: number[] = [];
  // what SOUNDS: the harmony's sounding() (the arp pool while the arp runs, where keys.held() is empty because the arp
  // books one-shots), else the keys' held set (the contract's)
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
  let musicSig = '';
  const paintState = (): void => {
    const h = inst.state().harmony;
    setText(octVal, octText(h.music.oct));
    setText(keyVal, keySummary(h.music.key, h.music.scale));
    const ms = `${h.music.key}|${h.music.scale}|${h.music.oct}`;
    if (ms !== musicSig) {
      const spell = musicSig !== '' && musicSig.split('|').slice(0, 2).join('|') !== `${h.music.key}|${h.music.scale}`;
      musicSig = ms;
      assignLetters(h.music.scale);
      if (spell) respell();
      lampSig = '';
    }
  };
  const unsubChange = inst.onChange(paintState);

  // ═══ PAINT ON THE FRAME: the stop lamp, the piano's lamps, the keycaps' lamps ═════════════════════════════════════
  let chordSig = '', stopLit = false;
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
    // a letter under a finger whose note is not (yet) sounding: the arp's pool, a voice still loading
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
    let hsig = '';
    for (const [, m] of held) hsig += `${m},`;
    if (hsig !== chordSig) { chordSig = hsig; onHeld(); }   // a pool change settles the chord glass too
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
  const reflectEls: Array<[HTMLElement, string]> = [[octDn, OCT_DN], [octUp, OCT_UP], [stop, STOP_CODE], ...[...capEls].map(([c, b]) => [b, c] as [HTMLElement, string])];
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
      top.remove(); keybed.remove();
    },
  };
};
