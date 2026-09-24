// SIGNAL R1 · lane V1 · view/bass-view.ts: THE BASS TOWER, live (mountBassView = the contract's MountView). New code in the
// Studio's view pattern (DOM built in TS with el() + the material builders, every gesture bound to the instrument, the paint
// read back from inst.state()). Imports: ../types.ts, ./controls.ts, ./common.ts and this lane's own filter-curve.ts +
// drums-view.ts (the helpers both towers share: the gain trim, the glass readouts, the pad, the keyboard reflection).
// Its sources:
//   · the picture: jt-portfolio-signal/src/components/signal/look/LookB.astro:159-188 (6392211), the R0 look-B mock's bass
//     tower (head, tone glass, DRONE PLUCK SEQ + the padlock + the note, the 16 bars under glass, the five knobs, footer);
//   · the grammar: signal-studio-v6lib/src/views/instrument/bass.ts (2a9e4a7) — the GLIDE dial ↔ τ law :27-30, the nudge
//     :129-136, DENSITY/GROOVE regenerate :124-143, the knob ghosts :139-154, the padlock toggle :171-195 (armed → pulses,
//     pinned → lit, a press while either → unpin + disarm), the tone glass :84-98; src/voices/note-name.ts:8-13 +
//     bass.ts:38-43 — the chip's note names (Ableton/Yamaha octave: MIDI 36 = C1); src/engine/core.ts:1657 — foldBass (the
//     root is MIDI, folded to 45..115 Hz where it sounds, contract BassState.root).
// NEW (B §10 "REWRITE", B §11 #7): a sub cell draws a mark; a PLAYHEAD walks the strip at the bass's own rate, one cell per
// 8th (PULSE 2 sixteenths: cell = floor((bar·16 + step) / 2) mod 16), while the bass plays SEQ and the clock runs.
// INTENSITY = heat (B §11 #3), SUB = weight, GLIDE = glide (0..1; the ghost prints τ). The chip shows the note the bass is
// on: the pinned root (lit), else the lowest held key (dim), else the last one it followed (B §11 #8), folded as it sounds.
// PAINT: inst.onChange (and the view's own gestures) → one coalesced repaint per burst (a microtask); the playhead + the
// followed note on requestAnimationFrame. KEYBOARD: B (power) and N (the padlock) are the integrator's keymap's; the caps
// are .pressed while their key is down (display only) and light from the state. No title=, no tooltips.
import type { BassMode, BassState, BassStep, DrumVel, MountView, SignalState } from '../types.ts';
import { el, makeGhost, makeKnob, makeSeg } from './controls.ts';
import type { Knob } from './controls.ts';
import { cap, knob, rail, screen, seg, tower } from './common.ts';
import { makeFilterCurve, xToF } from './filter-curve.ts';
import { GAIN_UNITY, coverFmtHz, dbFmt, gainFmt, gainToV, lowcutFmt, pad, primary, reflectKeys, vToGain } from './drums-view.ts';

const MODES: readonly BassMode[] = ['drone', 'pluck', 'seq'];

// from signal-studio-v6lib/src/views/instrument/bass.ts:27-29 (2a9e4a7) — VERBATIM (the dial's 0..1 → the glide τ in s)
const GLIDE_MIN = 0.008;
const GLIDE_MAX = 0.30;
const tauFromV = (v: number): number => GLIDE_MIN + v * (GLIDE_MAX - GLIDE_MIN);

// from signal-studio-v6lib/src/voices/note-name.ts:8-13 (2a9e4a7) — VERBATIM (MIDI 60 = "C3", so MIDI 36 = "C1")
export const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function noteLabel(m: number): string {
  return `${PITCH_CLASSES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 2}`;
}
// from signal-studio-v6lib/src/engine/core.ts:1657 (2a9e4a7) — foldBass, VERBATIM; then bass.ts:39-43's Hz → name, ADAPTED
// to a MIDI input (mtof → fold → nearest MIDI → noteLabel, '#' printed as '♯').
const foldBass = (f: number): number => { f = f / 2; while (f > 115) f /= 2; while (f < 45) f *= 2; return f; };
export const foldMidi = (m: number): number => Math.round(69 + 12 * Math.log2(foldBass(440 * Math.pow(2, (m - 69) / 12)) / 440));
export const bassNoteName = (m: number): string => noteLabel(foldMidi(m)).replace('#', '♯');

/** The strip: bar height by velocity tier (the R0 mock's four heights, LookB.astro:23), and the cell the bass is on. */
export const BAR_H = ['0%', '44%', '72%', '100%'] as const;
export const bassCell = (bar: number, step: number): number => ((Math.floor((bar * 16 + step) / 2) % 16) + 16) % 16;
/** from signal-studio-v6lib/src/views/instrument/bass.ts:129-136 (2a9e4a7), ADAPTED to the contract's BassStep (a rest is
 *  v 0, not the Studio's bare 0) — the nudge: velocity 0→1→2→3→0, the cell keeps its octave and its slide. */
export const nudge = (c: BassStep | undefined): BassStep =>
  ({ v: (((c?.v ?? 0) + 1) % 4) as DrumVel, oct: c?.oct === 'sub' ? 'sub' : 'base', slide: !!c?.slide });

const pct = (v: number): number => Math.round(v * 100);

// the padlock (the R0 mock's glyph, LookB.astro:174): an outlined shackle over a body; lit when pinned, pulsing when armed
const LOCK = '<svg viewBox="0 0 14 16" aria-hidden="true"><rect x="2.5" y="7" width="9" height="7.5" rx="1.5"></rect><path d="M4.5 7V5a2.5 2.5 0 0 1 5 0v2"></path></svg>';

export const mountBassView: MountView = (root, inst) => {
  const b0 = inst.state().bass;
  const bass = inst.bass;
  let dead = false, queued = false;
  let paint: () => void = () => {};
  const schedule = (): void => { if (!queued && !dead) { queued = true; queueMicrotask(() => paint()); } };
  const set = <K extends keyof BassState>(k: K, v: BassState[K]): void => { bass.set(k, v); schedule(); };

  const T = tower('bass', 'sb-tower');

  // ── the header rail: the power cap (B) + the voice's name glass (static, lit) ──
  const head = el('div', 'sb-head');
  const pow = cap('bass', { led: true, cls: 'sb-pow' });
  pow.dataset.code = 'KeyB';
  pow.addEventListener('click', () => set('on', !bass.state().on));
  head.append(pow, screen('synth', 'voice', 'row tint sb-name'));

  // ── the tone glass: ① low-cut (lowcut / lowcutDb) + ② tone (cut / cutDb), filter-curve.ts verbatim ──
  const eqHost = el('div', 'sb-eqhost');
  const eqGhost = makeGhost(eqHost);
  const eq = { lowcut: b0.lowcut, lowcutDb: b0.lowcutDb, cut: b0.cut, cutDb: b0.cutDb };
  const curve = makeFilterCurve({
    accentVar: 'var(--sg-bass-lit)',
    resetHpX: 0, resetLpX: 1, resetLpSlope: 1,   // the bass's slopes stay the Studio's W24 default 1 (bass.ts:88, 92)
    onHp: (x, db) => { eq.lowcut = x; eq.lowcutDb = db; bass.set('lowcut', x); bass.set('lowcutDb', db); eqGhost.show(`LOW-CUT ${lowcutFmt(x)}${dbFmt(db)}`); schedule(); },
    onLp: (x, db) => { eq.cut = x; eq.cutDb = db; bass.set('cut', x); bass.set('cutDb', db); eqGhost.show(`TONE ${coverFmtHz(xToF(x))}${dbFmt(db)}`); schedule(); },
  });
  const drawEq = (): void => curve.set({ hpX: eq.lowcut, hpRes: eq.lowcutDb, hpSlope: 1, lpX: eq.cut, lpRes: eq.cutDb, slope: 1 });
  drawEq();
  eqHost.appendChild(curve.el);
  eqHost.addEventListener('pointerup', () => eqGhost.hide());
  eqHost.addEventListener('pointercancel', () => eqGhost.hide());

  // ── the mode row: DRONE PLUCK SEQ · the padlock (N) · the note it is on ──
  const modeRow = el('div', 'sb-mode');
  const modeEl = seg(MODES, b0.mode, 'sb-modes');
  const modeSeg = makeSeg(modeEl, (v) => set('mode', v as BassMode));
  const pin = cap('', { led: true, cls: 'sb-pin', icon: LOCK, name: 'root lock' });
  pin.dataset.code = 'KeyN';
  pin.addEventListener('click', () => {
    const b = bass.state();
    if (b.root != null || b.armed) { bass.set('armed', false); bass.set('root', null); }   // unpin + disarm
    else bass.set('armed', true);                                                         // arm: the next onset pins
    schedule();
  });
  const note = el('span', 'sb-note');
  modeRow.append(modeEl, pin, note);

  // ── the strip: sixteen bars under glass (one per 8th: a two-bar line), lit only in SEQ ──
  const strip = el('div', 'sg-glass tint sb-bars');
  const bars: HTMLButtonElement[] = [];
  const fills: HTMLElement[] = [];
  const painted: string[] = new Array<string>(16).fill('');
  for (let i = 0; i < 16; i++) {
    const b = pad(i % 4 === 0 ? 'sb-bar dn' : 'sb-bar');
    b.tabIndex = -1;
    b.setAttribute('aria-label', `step ${i + 1}`);
    const f = el('i', 'sb-bv');
    b.appendChild(f);
    b.addEventListener('pointerdown', (e) => { if (!primary(e)) return; bass.setStep(i, nudge(bass.state().seq[i])); schedule(); });
    strip.appendChild(b);
    bars.push(b);
    fills.push(f);
  }

  // ── the knobs: DENSITY · GROOVE (regenerate the strip), INTENSITY · SUB · GLIDE ──
  const knobs = el('div', 'sb-knobs');
  const densEl = knob('density', { size: 'km' }), grooveEl = knob('groove', { size: 'km' });
  const intEl = knob('intensity', { size: 'km' }), subEl = knob('sub', { size: 'km' }), glideEl = knob('glide', { size: 'km' });
  const r1 = el('div', 'sb-krow'), r2 = el('div', 'sb-krow');
  r1.append(densEl, grooveEl);
  r2.append(intEl, subEl, glideEl);
  knobs.append(r1, r2);
  const K: Record<string, Knob> = {
    density: makeKnob(densEl, b0.density, (v) => { bass.set('density', v); bass.regenerate(); schedule(); }, undefined,
      { dflt: 0.5, ghost: makeGhost(densEl), label: (v) => `DENSITY ${pct(v)}` }),
    groove: makeKnob(grooveEl, b0.groove, (v) => { bass.set('groove', v); bass.regenerate(); schedule(); }, undefined,
      { dflt: 0.3, ghost: makeGhost(grooveEl), label: (v) => `GROOVE ${pct(v)}` }),
    heat: makeKnob(intEl, b0.heat, (v) => set('heat', v), undefined,
      { dflt: 0.5, ghost: makeGhost(intEl), label: (v) => `INTENSITY ${pct(v)}` }),
    weight: makeKnob(subEl, b0.weight, (v) => set('weight', v), undefined,
      { dflt: 0.5, ghost: makeGhost(subEl), label: (v) => `SUB ${pct(v)}` }),
    glide: makeKnob(glideEl, b0.glide, (v) => set('glide', v), undefined,
      { dflt: 0, ghost: makeGhost(glideEl), label: (v) => `GLIDE ${Math.round(tauFromV(v) * 1000)}MS` }),
  };

  // ── the footer rail: M · S · the gain trim ──
  const foot = rail('sb-foot');
  const mBtn = cap('m', { cls: 'sq warn' });
  const sBtn = cap('s', { cls: 'sq' });
  mBtn.addEventListener('click', () => set('mute', !bass.state().mute));
  sBtn.addEventListener('click', () => { inst.setSolo(inst.state().solo === 'bass' ? null : 'bass'); schedule(); });
  const gainEl = knob('gain', { size: 'kx', side: true, tick: GAIN_UNITY });
  const gainTick = gainEl.querySelector<HTMLElement>('.si-tick');
  const gain = makeKnob(gainEl, gainToV(b0.gain), (v) => set('gain', vToGain(v)), undefined, {
    dflt: GAIN_UNITY, detents: [GAIN_UNITY], ghost: makeGhost(gainEl), label: gainFmt,
    // the unity tick is ENGRAVED (module-header.ts's .si-utick): it glints only while the hand holds the trim in its detent
    onRender: (v) => { gainTick?.classList.toggle('hot', gainEl.classList.contains('grip') && Math.abs(v - GAIN_UNITY) < 0.004); },
  });
  const unglint = (): void => { gainTick?.classList.remove('hot'); };
  gainEl.addEventListener('pointerup', unglint);
  gainEl.addEventListener('pointercancel', unglint);
  foot.append(mBtn, sBtn, el('i', 'sg-fdiv'), gainEl);

  T.append(head, eqHost, modeRow, strip, knobs, foot);
  root.appendChild(T);

  // ── PAINT ──
  let st: BassState = b0;
  let follow = 36;         // the note the bass last followed: 65.4 Hz = C1 at boot (core.ts bassTarget)
  let noteKey = '';
  // what the bass follows = what SOUNDS: the harmony's sounding() (the arp pool while the arp runs, when keys.held() is
  // empty: the arp books one-shots) when the instance has it, else the held keys
  const HS = (inst.harmony ?? {}) as unknown as { sounding?: () => ReadonlyArray<[string, number]> };
  const soundingNow = (): ReadonlyArray<[string, number]> => (typeof HS.sounding === 'function' ? HS.sounding() : inst.keys.held());
  const setK = (k: Knob, v: number): void => { if (Math.abs(k.get() - v) > 1e-6) k.set(v); };
  const paintNote = (): void => {
    const pinned = st.root != null && !st.armed;
    let m: number;
    if (st.root != null) m = st.root;
    else {
      let lo = Infinity;
      for (const [, midi] of soundingNow()) if (midi < lo) lo = midi;
      if (lo !== Infinity) follow = lo;
      m = follow;
    }
    const key = `${pinned ? 'p' : 'f'}|${m}`;
    if (key === noteKey) return;
    noteKey = key;
    note.textContent = bassNoteName(m);
    note.classList.toggle('lit', pinned);
  };
  const paintBars = (seq: BassStep[]): void => {
    for (let i = 0; i < 16; i++) {
      const c = seq[i];
      const v = c ? c.v : 0;
      const sub = !!c && c.oct === 'sub' && v > 0, slide = !!c && c.slide && v > 0;
      const key = `${v}${sub ? 's' : ''}${slide ? '>' : ''}`;
      if (painted[i] === key) continue;
      painted[i] = key;
      const b = bars[i];
      b.classList.toggle('on', v > 0);
      b.classList.toggle('v1', v === 1);
      b.classList.toggle('v3', v === 3);
      b.classList.toggle('sub', sub);
      b.classList.toggle('slide', slide);
      fills[i].style.height = BAR_H[v] ?? '0%';
    }
  };
  let lastSolo: SignalState['solo'] | undefined;
  paint = (): void => {
    queued = false;
    if (dead) return;
    const S = inst.state();
    const b = S.bass;
    st = b;
    pow.classList.toggle('on', b.on);
    pow.setAttribute('aria-pressed', String(b.on));
    T.classList.toggle('is-on', b.on);
    if (b.lowcut !== eq.lowcut || b.lowcutDb !== eq.lowcutDb || b.cut !== eq.cut || b.cutDb !== eq.cutDb) {
      eq.lowcut = b.lowcut; eq.lowcutDb = b.lowcutDb; eq.cut = b.cut; eq.cutDb = b.cutDb;
      drawEq();
    }
    if (modeSeg.get() !== b.mode) modeSeg.set(b.mode);
    strip.classList.toggle('idle', b.mode !== 'seq');
    pin.classList.toggle('on', b.armed || b.root != null);
    pin.classList.toggle('arm', b.armed);
    pin.setAttribute('aria-pressed', String(b.armed || b.root != null));
    paintNote();
    paintBars(b.seq);
    setK(K.density, b.density);
    setK(K.groove, b.groove);
    setK(K.heat, b.heat);
    setK(K.weight, b.weight);
    setK(K.glide, b.glide);
    setK(gain, gainToV(b.gain));
    mBtn.classList.toggle('on', b.mute);
    mBtn.setAttribute('aria-pressed', String(b.mute));
    if (S.solo !== lastSolo) {
      lastSolo = S.solo;
      sBtn.classList.toggle('on', S.solo === 'bass');
      sBtn.setAttribute('aria-pressed', String(S.solo === 'bass'));
      T.classList.toggle('solo-dim', S.solo != null && S.solo !== 'bass');
    }
  };
  const offChange = inst.onChange(schedule);
  paint();
  const offKeys = reflectKeys([pow, pin]);

  // ── rAF: the playhead (one cell per 8th while the bass plays SEQ on a running clock) + the followed note ──
  let ph = -1, raf = 0, tNote = 0;
  const frame = (t: number): void => {
    raf = requestAnimationFrame(frame);
    let cell = -1;
    if (st.on && st.mode === 'seq' && inst.time.running()) {
      const p = inst.time.playhead();
      cell = bassCell(p.bar, p.step);
    }
    if (cell !== ph) {
      if (ph >= 0) bars[ph].classList.remove('ph');
      if (cell >= 0) bars[cell].classList.add('ph');
      ph = cell;
    }
    if (st.root == null && t - tNote >= 33) { tNote = t; paintNote(); }   // ≤ 30 fps, as the Studio's chip (bass.ts:197-205)
  };
  raf = requestAnimationFrame(frame);

  return {
    dispose(): void {
      dead = true;
      cancelAnimationFrame(raf);
      offChange();
      offKeys();
      T.remove();
    },
  };
};
