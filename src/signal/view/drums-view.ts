// SIGNAL R1 · lane V1 · view/drums-view.ts: THE DRUMS TOWER, live (mountDrumsView = the contract's MountView). New code in
// the Studio's view pattern (DOM built in TS with el() + the material builders, every gesture bound to the instrument, the
// paint read back from inst.state()). Imports: ../types.ts, ./controls.ts, ./common.ts and this lane's own filter-curve.ts.
// Its sources:
//   · the picture: jt-portfolio-signal/src/components/signal/look/LookB.astro:75-121 (6392211), the R0 look-B mock's drums
//     tower (head, cover glass, the 6×16 LED grid, pattern seg, SWING·DENSITY, TEXTURE housing, SIDECHAIN, the DELAY
//     column, the footer), lifted and made live;
//   · the grammar: signal-studio-v6lib/src/views/instrument/rhythm.ts (2a9e4a7) — the step-tier law :51 + :193-196, the delay
//     divisions :54-56, the cover glass wiring :319-337 (+ its readout :321-322), the sidechain readout :342, the knob
//     ghosts :288-313, 340-368; module-header.ts:225-277 — the footer (M · S · the gain trim 1.25·v, detent + reset .8, its
//     dB readout :259-262).
// R3 · lane D (THE FIRST-TIMER ROUND, NOTES-SIGNAL-R3.md §1.3 DRUMS): the tower recomposed top to bottom — HEAD (the BPM
// glass, moved here from the top strip, drag AND type · the `=` keycap · the kit as an etched word) · the COVER glass ·
// THE GRID · the PATTERN seg · SWING DENSITY SIDECHAIN · THE DELAY UNIT (one raised housing, an activity lamp on the
// TIME division, FB + TIME dormant at MIX 0) · TEXTURE + TAPE/DRIVE · the footer rail (M · S · GAIN) · THE SPACE BAR (the
// drums' on/off, a real keycap). The tempo glass is ported from view/hands-view.ts:129-179 (R2, 76a02c7; the Studio's
// time-strip.ts:45-102) with its look from styles/signal/hands.css:24-38.
// Contract (src/signal/types.ts): DrumsState, Drums, SignalInstrument, MountView, CTL.drums. THE GRID IS THE TRUTH: every
// cell paints drums.state().seq; a click writes drums.setStep; the pattern seg + DENSITY regenerate (drums.regenerate()).
// PAINT: inst.onChange (and the view's own gestures) → one coalesced repaint per burst (a microtask) from inst.state(); the
// playhead column, the BPM digits, the beat lamp and the delay lamp on requestAnimationFrame (one frame loop).
// KEYBOARD: the integrator's keymap drives the instrument (Space = drums on/off, = = tap); this view only REFLECTS it: a
// keycap is .pressed while its key is down (display only), the SPACE bar lights from the state, `=` flashes per tap.
// No title=, no tooltips, no words that explain.
import { BPM_MAX, BPM_MIN, DRUM_LANES } from '../types.ts';
import type { DrumDelayDiv, DrumLane, DrumPatternName, DrumsState, DrumTexture, DrumVel, MountView, SignalState } from '../types.ts';
import { clamp, el, makeGhost, makeKnob, makeSeg } from './controls.ts';
import type { Knob } from './controls.ts';
import { cap, etch, glass, key, knob, led, rail, seg, tower } from './common.ts';
import { makeFilterCurve, xToF } from './filter-curve.ts';

/** The grid's six lane legends (the R0 mock's words, LookB.astro:13-18: OPEN, SHKR). */
const LANE_WORD: Record<DrumLane, string> = { kick: 'kick', snare: 'snare', hat: 'hat', openhat: 'open', clap: 'clap', shaker: 'shkr' };
const PATTERNS: readonly DrumPatternName[] = ['floor', 'back', 'half', 'break'];

// from signal-studio-v6lib/src/views/instrument/rhythm.ts:54-56 (2a9e4a7) — the drum delay's five divisions, ADAPTED to the
// contract's DrumDelayDiv names (the Studio kept an index 0..4; '1/8·' is printed, '1/8d' is stored). Default 1/8.
const DLY_DIVS: readonly DrumDelayDiv[] = ['1/16', '1/8', '1/8d', '1/4', '1/2'];
const DLY_WORD: Record<DrumDelayDiv, string> = { '1/16': '1/16', '1/8': '1/8', '1/8d': '1/8·', '1/4': '1/4', '1/2': '1/2' };
export const dlyToV = (d: DrumDelayDiv): number => Math.max(0, DLY_DIVS.indexOf(d)) / (DLY_DIVS.length - 1);
export const vToDly = (v: number): DrumDelayDiv => DLY_DIVS[Math.max(0, Math.min(DLY_DIVS.length - 1, Math.round(v * (DLY_DIVS.length - 1))))];

// from signal-studio-v6lib/src/views/instrument/rhythm.ts:51, 193-196 (2a9e4a7) — a plain click writes MID; Shift = ACCENT,
// Alt = GHOST; hitting the tier a cell already holds clears it (every gesture is its own undo).
const TIER_DEFAULT = 2, TIER_ACCENT = 3, TIER_GHOST = 1;
export function stepEdit(cur: DrumVel, e: { shiftKey: boolean; altKey: boolean }): DrumVel {
  const tier = e.shiftKey ? TIER_ACCENT : e.altKey ? TIER_GHOST : TIER_DEFAULT;
  return (cur === tier ? 0 : tier) as DrumVel;
}

// from signal-studio-v6lib/src/views/instrument/rhythm.ts:321-322 (2a9e4a7) — the cover readout, VERBATIM; the low-cut
// reads the same scale (OFF while the band is parked open: eq-response.ts eqSpec skips hpX ≤ .006).
export const coverFmtHz = (hz: number): string =>
  hz >= 11000 ? 'OPEN' : hz <= 70 ? 'MUFFLED' : hz >= 1000 ? (hz / 1000).toFixed(1) + 'k' : Math.round(hz) + 'Hz';
export const lowcutFmt = (x: number): string => {
  if (x <= 0.006) return 'OFF';
  const hz = xToF(x);
  return hz >= 1000 ? (hz / 1000).toFixed(1) + 'k' : Math.round(hz) + 'Hz';
};
export const dbFmt = (db: number): string => (Math.abs(db) < 0.5 ? '' : ` ${db > 0 ? '+' : '−'}${Math.abs(db).toFixed(0)} dB`);
// from signal-studio-v6lib/src/views/instrument/rhythm.ts:342 (2a9e4a7) — VERBATIM
const scFmt = (v: number): string => (v < 0.01 ? 'OFF' : Math.round(v * 100) + '%');
// from signal-studio-v6lib/src/views/instrument/module-header.ts:259-262 (2a9e4a7) — the gain trim's readout, VERBATIM
export const gainFmt = (v: number): string => {
  const db = v <= 0.001 ? '−∞' : (20 * Math.log10(v * 1.25)).toFixed(1);
  return `GAIN ${db === '−∞' ? db : (Number(db) > 0 ? '+' : '') + db} dB`;
};
const pct = (v: number): number => Math.round(v * 100);
/** The footer trim: the knob's 0..1 ↔ the module's gain 0..1.25; 0.8 = unity (module-header.ts:253-270). */
export const GAIN_UNITY = 0.8;
export const gainToV = (g: number): number => Math.max(0, Math.min(1, g / 1.25));
export const vToGain = (v: number): number => 1.25 * v;

/** A pad: a real <button> (a keyboard can reach it) that prints its own word; never a submit. */
export function pad(cls: string, word = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  if (word) b.textContent = word;
  return b;
}
/** Only the primary button presses a pad (a right-click opens nothing and writes nothing). */
export const primary = (e: PointerEvent): boolean => e.button === 0 || e.button === undefined;

/** THE KEYBOARD, REFLECTED (display only; new code, the guards of keymap.ts defaultOwns, lane H): a cap carrying
 *  data-code is .pressed while that key is down. It never preventDefaults and never stops propagation (the keymap acts);
 *  it ignores ⌘/ctrl/alt and a focused text field; a keyup always lets go; a lost window or a hidden tab lets go of all. */
export function reflectKeys(caps: ReadonlyArray<HTMLElement>, onDown?: (code: string, e: KeyboardEvent) => void): () => void {
  const W = typeof window !== 'undefined' ? window : null;
  if (!W) return () => {};
  const byCode = new Map<string, HTMLElement>();
  for (const c of caps) if (c.dataset.code) byCode.set(c.dataset.code, c);
  const down = new Set<string>();
  const typing = (): boolean => {
    const a = document.activeElement as HTMLElement | null;
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable === true);
  };
  const show = (code: string): void => { byCode.get(code)?.classList.toggle('pressed', down.has(code)); };
  const onKey = (e: KeyboardEvent): void => {
    if (!byCode.has(e.code) || down.has(e.code)) return;   // a repeat is the same finger
    if (e.metaKey || e.ctrlKey || e.altKey || typing()) return;
    down.add(e.code);
    show(e.code);
    onDown?.(e.code, e);                                   // [R3] a view's display-only echo (the `=` cap's tap flash)
  };
  const onUp = (e: KeyboardEvent): void => { if (down.delete(e.code)) show(e.code); };
  const letGo = (): void => { for (const c of [...down]) { down.delete(c); show(c); } };
  const onVis = (): void => { if (document.visibilityState === 'hidden') letGo(); };
  W.addEventListener('keydown', onKey, true);
  W.addEventListener('keyup', onUp, true);
  W.addEventListener('blur', letGo);
  document.addEventListener?.('visibilitychange', onVis);
  return () => {
    W.removeEventListener('keydown', onKey, true);
    W.removeEventListener('keyup', onUp, true);
    W.removeEventListener('blur', letGo);
    document.removeEventListener?.('visibilitychange', onVis);
    letGo();
  };
}

/** [R3] The delay's TIME division in BEATS (the activity lamp's clock): 1/16 = .25 · 1/8 = .5 · 1/8d = .75 · 1/4 = 1 · 1/2 = 2. */
export const DLY_BEATS: Record<DrumDelayDiv, number> = { '1/16': 0.25, '1/8': 0.5, '1/8d': 0.75, '1/4': 1, '1/2': 2 };
/** [R3] The playhead in beats, HEARD time (time.playhead(): bar · 16th step · phase through that 16th). */
export const phBeats = (p: { bar: number; step: number; phase: number }): number => p.bar * 4 + (p.step + p.phase) / 4;
/** [R3] The delay is heard at all (MIX ≥ .01): below it FB and TIME are dormant and the lamp stays dark. */
export const DLY_AUDIBLE = 0.01;
/** [R3] A typed tempo: digits only, rounded, clamped; null = nothing to commit (the field is left as it was). */
export function typedBpm(s: string): number | null {
  const d = String(s).replace(/[^0-9.]/g, '');
  if (!d) return null;
  const n = Number(d);
  return Number.isFinite(n) ? clamp(Math.round(n), BPM_MIN, BPM_MAX) : null;
}
/** [R3] A plain click on the tempo glass (it TYPES) vs a drag (it slides): a release within 250 ms and under 3 px. */
export const CLICK_MS = 250, CLICK_PX = 3;

export const mountDrumsView: MountView = (root, inst) => {
  const d0 = inst.state().drums;
  const drums = inst.drums, T = inst.time;
  // the repaint: one per burst, from the instrument's state. A gesture asks for it too (the instrument's onChange is the
  // law; this only makes sure the hand that just pressed sees its press even before the echo lands).
  let dead = false, queued = false;
  let paint: () => void = () => {};
  const schedule = (): void => { if (!queued && !dead) { queued = true; queueMicrotask(() => paint()); } };
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t;
  };
  const ctl = <E extends HTMLElement>(e: E, name: string): E => { e.dataset.ctl = name; return e; };

  // ── the shell: the tower in the drums accent ──
  const T_ = tower('drums', 'sd-tower');

  // ═══ 1 · THE HEAD: the BPM glass (drag AND type) · the `=` keycap (tap) · the kit, etched ═══════════════════════════
  // from view/hands-view.ts:136-145 (R2, 76a02c7): the amber tempo glass, its beat lamp, the digits in fixed boxes
  // (Orbitron's digits are proportional: '1' = .39 em), the `bpm` word. Moved here from the top strip (brief §B).
  const head = el('div', 'sd-head');
  const tempo = ctl(glass('sgh-tempo sd-bpm sg-ns'), 'drums-bpm');
  const pls = el('i', 'sgh-pls');                   // the beat lamp: the first 16th of every beat while the clock runs
  const digits = el('b', 'sgh-bpm');
  const dbox = [el('i'), el('i'), el('i')];
  digits.append(...dbox);
  const bpmWord = el('small'); bpmWord.textContent = 'bpm';
  // [R3] TYPE: a plain click lays a text field over the digits (numeric keypad on a touch device; digits only). Its focus
  // makes the keymap cede the keys (keymap.ts defaultOwns: a focused INPUT owns them).
  const field = document.createElement('input');
  field.className = 'sd-bpmin';
  field.type = 'text';
  field.setAttribute('inputmode', 'numeric');
  field.setAttribute('pattern', '[0-9]*');
  field.setAttribute('maxlength', '3');
  field.setAttribute('autocomplete', 'off');
  field.setAttribute('spellcheck', 'false');
  field.setAttribute('aria-label', 'Tempo in bpm');
  field.hidden = true;
  tempo.append(pls, digits, bpmWord, field);

  const tap = ctl(key('Equal', '=', { name: 'Tap tempo' }), 'drums-tap');
  tap.classList.add('sd-tap');
  const kit = etch('house kit', 'sd-kit');
  head.append(tempo, tap, kit);

  // the tempo glass DRAG: vertical 0.5 BPM/px from the value under the finger (hands-view.ts:157-171, time-strip.ts:62-78),
  // pointer capture, no reset. [R3] It slides only once the finger has travelled CLICK_PX (a click is for typing).
  let tDown = false, tDrag = false, tX = 0, tY = 0, tT = 0, tBpm = 0, editing = false, cancelEdit = false, shownBpm = -1;
  const openEdit = (): void => {
    if (editing || dead) return;
    editing = true; cancelEdit = false;
    field.value = String(Math.round(T.bpm()));
    field.hidden = false;
    tempo.classList.add('typing');
    try { field.focus({ preventScroll: true }); field.select(); } catch { /* */ }
  };
  const closeEdit = (): void => {
    if (!editing) return;
    editing = false;
    if (!cancelEdit) { const n = typedBpm(field.value); if (n !== null && n !== Math.round(T.bpm())) T.setBpm(n); }
    field.hidden = true;
    tempo.classList.remove('typing');
    shownBpm = -1;                                   // the digits repaint on the next frame
  };
  field.addEventListener('focus', () => { try { field.select(); } catch { /* */ } });
  field.addEventListener('input', () => { const v = field.value.replace(/[^0-9]/g, '').slice(0, 3); if (v !== field.value) field.value = v; });
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); field.blur(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit = true; field.blur(); }
  });
  field.addEventListener('blur', closeEdit);
  tempo.addEventListener('pointerdown', (e) => {
    if (e.target === field || e.button !== 0) return;
    e.preventDefault();
    if (editing) { field.blur(); return; }             // a press beside the open field commits it
    tDown = true; tDrag = false; tX = e.clientX; tY = e.clientY; tT = e.timeStamp; tBpm = T.bpm();
    try { tempo.setPointerCapture(e.pointerId); } catch { /* */ }
  });
  tempo.addEventListener('pointermove', (e) => {
    if (!tDown) return;
    if (!tDrag && Math.hypot(e.clientX - tX, e.clientY - tY) < CLICK_PX) return;
    tDrag = true;
    const n = Math.round(clamp(tBpm + (tY - e.clientY) * 0.5, BPM_MIN, BPM_MAX));
    if (n !== Math.round(T.bpm())) T.setBpm(n);
  });
  tempo.addEventListener('pointerup', (e) => {
    if (!tDown) return;
    tDown = false;
    const click = !tDrag && e.timeStamp - tT < CLICK_MS && Math.hypot(e.clientX - tX, e.clientY - tY) < CLICK_PX;
    tDrag = false;
    if (click) openEdit();
  });
  const tEnd = (): void => { tDown = false; tDrag = false; };
  tempo.addEventListener('pointercancel', tEnd);

  // TAP: time.tap() at the press (the event's own clock), the cap lit 90 ms per tap (hands-view.ts:173-176,
  // time-strip.ts:86-98). A keyboard `=` taps through the keymap; the reflection flashes the cap the same.
  let tapT: ReturnType<typeof setTimeout> | null = null;
  const tapFlash = (): void => {
    tap.classList.add('lit');
    if (tapT) { clearTimeout(tapT); timers.delete(tapT); }
    tapT = later(() => { tap.classList.remove('lit'); tapT = null; }, 90);
  };
  tap.addEventListener('pointerdown', (e) => { if (!primary(e)) return; T.tap(e.timeStamp); tapFlash(); });
  tap.addEventListener('click', (e) => { if (e.detail === 0) { T.tap(e.timeStamp); tapFlash(); } });   // a click with no pointer

  // ═══ 2 · the cover glass: ① low-cut (lowcut / lowcutDb) + ② cover (cover / coverDb), filter-curve.ts verbatim ═══════
  const eqHost = ctl(el('div', 'sd-eqhost'), 'drums-cover');
  const eqGhost = makeGhost(eqHost);
  // what the curve last drew: a node drag draws inside filter-curve.ts, so the repaint that follows the set() is skipped
  const eq = { lowcut: d0.lowcut, lowcutDb: d0.lowcutDb, cover: d0.cover, coverDb: d0.coverDb };
  const curve = makeFilterCurve({
    accentVar: 'var(--sg-drums)',
    resetHpX: 0, resetLpX: 1, resetLpSlope: 1,   // the drums' ② slope is the Studio's 1 (rhythm.ts:325, 329)
    onHp: (x, db) => { eq.lowcut = x; eq.lowcutDb = db; drums.set('lowcut', x); drums.set('lowcutDb', db); eqGhost.show(`LOW-CUT ${lowcutFmt(x)}${dbFmt(db)}`); schedule(); },
    onLp: (x, db) => { eq.cover = x; eq.coverDb = db; drums.set('cover', x); drums.set('coverDb', db); eqGhost.show(`COVER ${coverFmtHz(xToF(x))}${dbFmt(db)}`); schedule(); },
  });
  const drawEq = (): void => curve.set({ hpX: eq.lowcut, hpRes: eq.lowcutDb, hpSlope: 1, lpX: eq.cover, lpRes: eq.coverDb, slope: 1 });
  drawEq();
  eqHost.appendChild(curve.el);
  eqHost.addEventListener('pointerup', () => eqGhost.hide());
  eqHost.addEventListener('pointercancel', () => eqGhost.hide());

  // ═══ 3 · THE GRID: six lanes × sixteen cells under glass; the lane word is a pad that auditions its lane ═════════════
  const grid = ctl(el('div', 'sg-glass tint sd-grid'), 'drums-grid');
  const cells: HTMLButtonElement[][] = [];
  const tiers: number[][] = [];
  const flashT = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  const flash = (b: HTMLElement): void => {   // the pad lights on the press and lets go 150 ms later
    b.classList.add('hit');
    const t = flashT.get(b);
    if (t) clearTimeout(t);
    flashT.set(b, setTimeout(() => { b.classList.remove('hit'); flashT.delete(b); }, 150));
  };
  DRUM_LANES.forEach((lane) => {
    const row = el('div', 'sd-lane');
    const p = pad('sd-pad', LANE_WORD[lane]);
    p.dataset.lane = lane;
    p.addEventListener('pointerdown', (e) => { if (!primary(e)) return; drums.hit(lane); flash(p); });
    row.appendChild(p);
    const lcells: HTMLButtonElement[] = [];
    for (let i = 0; i < 16; i++) {
      const c = pad(i > 0 && i % 4 === 0 ? 'sd-cell beat' : 'sd-cell');
      c.tabIndex = -1;
      c.setAttribute('aria-label', `${LANE_WORD[lane]} ${i + 1}`);
      c.addEventListener('pointerdown', (e) => {
        if (!primary(e)) return;
        const cur = (drums.state().seq[lane][i] ?? 0) as DrumVel;
        drums.setStep(lane, i, stepEdit(cur, e));
        schedule();
      });
      row.appendChild(c);
      lcells.push(c);
    }
    cells.push(lcells);
    tiers.push(new Array<number>(16).fill(-1));
    grid.appendChild(row);
  });

  // ═══ 4 · the pattern seg: a pick regenerates the grid (the same pick again re-seeds it, clearing hand edits) ═════════
  const patEl = ctl(seg(PATTERNS, d0.pattern, 'sm sd-pat'), 'drums-pattern');
  const patSeg = makeSeg(patEl, (v) => { drums.set('pattern', v as DrumPatternName); drums.regenerate(); schedule(); });

  const set = <K extends keyof DrumsState>(k: K, v: DrumsState[K]): void => { drums.set(k, v); schedule(); };
  const setDelay = (patch: Partial<DrumsState['delay']>): void => set('delay', { ...drums.state().delay, ...patch });

  // ═══ 5 · THE KNOB ROW: SWING · DENSITY · SIDECHAIN ═══════════════════════════════════════════════════════════════════
  const swingEl = ctl(knob('swing'), 'drums-swing'), densEl = ctl(knob('density'), 'drums-density'), scEl = ctl(knob('sidechain'), 'drums-sidechain');
  const krow = el('div', 'sd-krow');
  krow.append(swingEl, densEl, scEl);

  // ═══ 6 · THE DELAY UNIT: one raised housing — `delay` etched + its activity lamp · MIX · FB · TIME ════════════════════
  const dly = ctl(el('div', 'sg-raised sd-delay'), 'drums-delay');
  const dname = el('div', 'sd-dname');
  const dcap = etch('delay', 'sd-dcap');
  const dlamp = led();
  dlamp.classList.add('sd-dlamp');
  dname.append(dcap, dlamp);
  const mixEl = ctl(knob('mix', { size: 'ks' }), 'drums-mix'), fbEl = ctl(knob('fb', { size: 'ks' }), 'drums-fb');
  const timeEl = ctl(knob('time', { size: 'ks', side: true, steps: DLY_DIVS.length, value: DLY_WORD[d0.delay.time], chip: true, cls: 'steel' }), 'drums-time');
  const chip = timeEl.querySelector<HTMLElement>('.si-kn')!;
  dly.append(dname, mixEl, fbEl, timeEl);

  // ═══ 7 · TEXTURE + its TAPE/DRIVE seg ════════════════════════════════════════════════════════════════════════════════
  const texRow = el('div', 'sd-tex');
  const texEl = ctl(knob('texture', { size: 'kx', side: true }), 'drums-texture');
  const texSegEl = ctl(seg(['tape', 'drive'], d0.texture, 'sm sd-texseg'), 'drums-texseg');
  texRow.append(texEl, texSegEl);

  const K: Record<string, Knob> = {
    swing: makeKnob(swingEl, d0.swing, (v) => set('swing', v), undefined,
      { dflt: 0, ghost: makeGhost(swingEl), label: (v) => `SWING ${pct(v)}` }),
    density: makeKnob(densEl, d0.density, (v) => { drums.set('density', v); drums.regenerate(); schedule(); }, undefined,
      { dflt: 0.5, ghost: makeGhost(densEl), label: (v) => `DENSITY ${pct(v)}` }),
    texture: makeKnob(texEl, d0.textureAmt, (v) => set('textureAmt', v), undefined,
      { dflt: 0, ghost: makeGhost(texEl), label: (v) => `TEXTURE ${v < 0.01 ? 'OFF' : pct(v)}` }),
    sidechain: makeKnob(scEl, d0.sidechain, (v) => set('sidechain', v), undefined,
      { dflt: 0.3, ghost: makeGhost(scEl), label: (v) => `SIDECHAIN ${scFmt(v)}` }),
    mix: makeKnob(mixEl, d0.delay.mix, (v) => setDelay({ mix: v }), undefined,
      { dflt: 0, ghost: makeGhost(mixEl), label: (v) => `DELAY MIX ${pct(v)}` }),
    fb: makeKnob(fbEl, d0.delay.feedback, (v) => setDelay({ feedback: v }), undefined,
      { dflt: 0.35, ghost: makeGhost(fbEl), label: (v) => `FEEDBACK ${pct(v)}` }),
    // the stepped TIME switch (rhythm.ts:358-368): five detents, the amber chip is its readout; no ghost, no reset (as the Studio)
    time: makeKnob(timeEl, dlyToV(d0.delay.time), (v) => setDelay({ time: vToDly(v) }), (v) => { chip.textContent = DLY_WORD[vToDly(v)]; },
      { steps: DLY_DIVS.length }),
  };
  const texSeg = makeSeg(texSegEl, (v) => set('texture', v as DrumTexture));

  // ═══ 8 · the footer rail: M · S · the gain trim (the three towers' one form) ═════════════════════════════════════════
  const foot = rail('sd-foot');
  const mBtn = ctl(cap('m', { cls: 'sq warn' }), 'drums-mute');
  const sBtn = ctl(cap('s', { cls: 'sq' }), 'drums-solo');
  mBtn.addEventListener('click', () => set('mute', !drums.state().mute));
  sBtn.addEventListener('click', () => { inst.setSolo(inst.state().solo === 'drums' ? null : 'drums'); schedule(); });
  const gainEl = ctl(knob('gain', { size: 'kx', side: true, tick: GAIN_UNITY }), 'drums-gain');
  const gainTick = gainEl.querySelector<HTMLElement>('.si-tick');
  const gain = makeKnob(gainEl, gainToV(d0.gain), (v) => set('gain', vToGain(v)), undefined, {
    dflt: GAIN_UNITY, detents: [GAIN_UNITY], ghost: makeGhost(gainEl), label: gainFmt,
    // the unity tick is ENGRAVED (module-header.ts's .si-utick): it glints only while the hand holds the trim in its detent
    onRender: (v) => { gainTick?.classList.toggle('hot', gainEl.classList.contains('grip') && Math.abs(v - GAIN_UNITY) < 0.004); },
  });
  const unglint = (): void => { gainTick?.classList.remove('hot'); };
  gainEl.addEventListener('pointerup', unglint);
  gainEl.addEventListener('pointercancel', unglint);
  foot.append(mBtn, sBtn, el('i', 'sg-fdiv'), gainEl);

  // ═══ 9 · THE SPACE BAR: the drums' on/off, a real keycap the tower's full width, the biggest orange thing here ═══════
  const pow = ctl(key('Space', 'space', { wide: true, tint: 'drums', name: 'Drums on/off' }), 'drums-power');
  pow.classList.add('sd-pow');
  pow.addEventListener('click', () => { drums.set('on', !drums.state().on); schedule(); });

  T_.append(head, eqHost, grid, patEl, krow, dly, texRow, foot, pow);
  root.appendChild(T_);

  // ── PAINT: from the instrument's state, diffed (a drag's own echo is a no-op) ──
  let on = d0.on, mix = d0.delay.mix, div = DLY_BEATS[d0.delay.time] ?? 0.5;
  let dormant: boolean | undefined;
  const setK = (k: Knob, v: number): void => { if (Math.abs(k.get() - v) > 1e-6) k.set(v); };
  const paintCells = (seq: DrumsState['seq']): void => {
    DRUM_LANES.forEach((lane, li) => {
      const row = seq[lane] ?? [];
      for (let i = 0; i < 16; i++) {
        const v = row[i] ?? 0;
        if (tiers[li][i] === v) continue;
        tiers[li][i] = v;
        const c = cells[li][i];
        c.classList.toggle('v1', v === 1);
        c.classList.toggle('v2', v === 2);
        c.classList.toggle('v3', v === 3);
      }
    });
  };
  let lastSolo: SignalState['solo'] | undefined;
  paint = (): void => {
    queued = false;
    if (dead) return;
    const S = inst.state();
    const d = S.drums;
    on = d.on;
    pow.classList.toggle('lit', d.on);
    pow.classList.toggle('on', d.on);
    pow.setAttribute('aria-pressed', String(d.on));
    T_.classList.toggle('is-on', d.on);
    if (d.lowcut !== eq.lowcut || d.lowcutDb !== eq.lowcutDb || d.cover !== eq.cover || d.coverDb !== eq.coverDb) {
      eq.lowcut = d.lowcut; eq.lowcutDb = d.lowcutDb; eq.cover = d.cover; eq.coverDb = d.coverDb;
      drawEq();
    }
    paintCells(d.seq);
    if (patSeg.get() !== d.pattern) patSeg.set(d.pattern);
    if (texSeg.get() !== d.texture) texSeg.set(d.texture);
    setK(K.swing, d.swing);
    setK(K.density, d.density);
    setK(K.texture, d.textureAmt);
    setK(K.sidechain, d.sidechain);
    setK(K.mix, d.delay.mix);
    setK(K.fb, d.delay.feedback);
    setK(K.time, dlyToV(d.delay.time));
    setK(gain, gainToV(d.gain));
    mix = d.delay.mix;
    div = DLY_BEATS[d.delay.time] ?? 0.5;
    const dz = mix < DLY_AUDIBLE;                    // Law 3: FB + TIME wait on MIX
    if (dz !== dormant) {
      dormant = dz;
      fbEl.classList.toggle('dormant', dz);
      timeEl.classList.toggle('dormant', dz);
      dly.classList.toggle('quiet', dz);
    }
    mBtn.classList.toggle('on', d.mute);
    mBtn.setAttribute('aria-pressed', String(d.mute));
    if (S.solo !== lastSolo) {
      lastSolo = S.solo;
      sBtn.classList.toggle('on', S.solo === 'drums');
      sBtn.setAttribute('aria-pressed', String(S.solo === 'drums'));
      T_.classList.toggle('solo-dim', S.solo != null && S.solo !== 'drums');
    }
  };
  const offChange = inst.onChange(schedule);
  paint();
  const offKeys = reflectKeys([pow, tap], (code) => { if (code === 'Equal') tapFlash(); });

  // ═══ THE FRAME: the playhead column, the BPM digits + the beat lamp, the delay's activity lamp ═══════════════════════
  let ph = -1, raf = 0, lampLine = NaN, lampOff = 0, lampLit = false, plsOn = false;
  const paintDigits = (n: number): void => {   // hands-view.ts:558-561: right-aligned in the three fixed boxes
    const s = String(n).padStart(dbox.length, ' ');
    dbox.forEach((d, i) => { const c = s[i] === ' ' ? '' : s[i]; if (d.textContent !== c) d.textContent = c; });
  };
  const frame = (now: number): void => {
    raf = requestAnimationFrame(frame);
    const running = T.running();
    const bpm = Math.round(T.bpm());
    if (bpm !== shownBpm) { shownBpm = bpm; paintDigits(bpm); }
    const p = running ? T.playhead() : null;
    const beat = !!p && p.step % 4 === 0;
    if (beat !== plsOn) { plsOn = beat; pls.classList.toggle('on', beat); }
    // the playhead column, under the step being heard, while the drums play
    const step = on && p ? p.step : -1;
    const s = step >= 0 && step < 16 ? step : -1;
    if (s !== ph) {
      for (const lc of cells) {
        if (ph >= 0) lc[ph].classList.remove('ph');
        if (s >= 0) lc[s].classList.add('ph');
      }
      ph = s;
    }
    // the delay lamp: ≈60 ms on every line of the TIME division, heard time, while the drums run and the delay is heard
    let lit = false;
    if (on && p && mix >= DLY_AUDIBLE) {
      const line = Math.floor(phBeats(p) / div);
      if (line !== lampLine) { if (!Number.isNaN(lampLine)) lampOff = now + 60; lampLine = line; }   // the first line seen only arms it
      lit = now < lampOff;
    } else { lampLine = NaN; lampOff = 0; }
    if (lit !== lampLit) { lampLit = lit; dlamp.classList.toggle('on', lit); }
  };
  raf = requestAnimationFrame(frame);

  return {
    dispose(): void {
      dead = true;
      cancelAnimationFrame(raf);
      offChange();
      offKeys();
      flashT.forEach((t) => clearTimeout(t));
      flashT.clear();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      if (editing) { cancelEdit = true; closeEdit(); }
      T_.remove();
    },
  };
};
