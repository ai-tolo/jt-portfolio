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
// Contract (src/signal/types.ts): DrumsState, Drums, SignalInstrument, MountView. THE GRID IS THE TRUTH: every cell paints
// drums.state().seq; a click writes drums.setStep; the pattern seg + DENSITY regenerate (drums.regenerate()).
// PAINT: inst.onChange (and the view's own gestures) → one coalesced repaint per burst (a microtask) from inst.state(); the
// playhead column from time.playhead() on requestAnimationFrame while drums.on and time.running().
// KEYBOARD: the integrator's keymap drives the instrument (Space = drums on/off); this view only REFLECTS it: the DRUMS cap
// is .pressed while Space is down (display only), and lights from the state. No title=, no tooltips, no words that explain.
import { DRUM_LANES } from '../types.ts';
import type { DrumDelayDiv, DrumLane, DrumPatternName, DrumsState, DrumTexture, DrumVel, MountView, SignalState } from '../types.ts';
import { el, makeGhost, makeKnob, makeSeg } from './controls.ts';
import type { Knob } from './controls.ts';
import { cap, knob, rail, screen, seg, tower } from './common.ts';
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
export function reflectKeys(caps: ReadonlyArray<HTMLElement>): () => void {
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
  const onDown = (e: KeyboardEvent): void => {
    if (!byCode.has(e.code) || down.has(e.code)) return;   // a repeat is the same finger
    if (e.metaKey || e.ctrlKey || e.altKey || typing()) return;
    down.add(e.code);
    show(e.code);
  };
  const onUp = (e: KeyboardEvent): void => { if (down.delete(e.code)) show(e.code); };
  const letGo = (): void => { for (const c of [...down]) { down.delete(c); show(c); } };
  const onVis = (): void => { if (document.visibilityState === 'hidden') letGo(); };
  W.addEventListener('keydown', onDown, true);
  W.addEventListener('keyup', onUp, true);
  W.addEventListener('blur', letGo);
  document.addEventListener?.('visibilitychange', onVis);
  return () => {
    W.removeEventListener('keydown', onDown, true);
    W.removeEventListener('keyup', onUp, true);
    W.removeEventListener('blur', letGo);
    document.removeEventListener?.('visibilitychange', onVis);
    letGo();
  };
}

export const mountDrumsView: MountView = (root, inst) => {
  const d0 = inst.state().drums;
  const drums = inst.drums;
  // the repaint: one per burst, from the instrument's state. A gesture asks for it too (the instrument's onChange is the
  // law; this only makes sure the hand that just pressed sees its press even before the echo lands).
  let dead = false, queued = false;
  let paint: () => void = () => {};
  const schedule = (): void => { if (!queued && !dead) { queued = true; queueMicrotask(() => paint()); } };

  // ── the shell: the tower in the drums accent ──
  const T = tower('drums', 'sd-tower');

  // ── the header rail: the power cap (Space) + the kit's name glass (static, lit, no picker) ──
  const head = el('div', 'sd-head');
  const pow = cap('drums', { led: true, cls: 'sd-pow' });
  pow.dataset.code = 'Space';
  pow.addEventListener('click', () => { drums.set('on', !drums.state().on); schedule(); });
  head.append(pow, screen('house', 'kit', 'row tint sd-name'));

  // ── the cover glass: ① low-cut (lowcut / lowcutDb) + ② cover (cover / coverDb), filter-curve.ts verbatim ──
  const eqHost = el('div', 'sd-eqhost');
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

  // ── THE GRID: six lanes × sixteen cells under glass; the lane word is a pad that auditions its lane ──
  const grid = el('div', 'sg-glass tint sd-grid');
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

  // ── the pattern seg: a pick regenerates the grid (the same pick again re-seeds it, clearing hand edits) ──
  const patEl = seg(PATTERNS, d0.pattern, 'sd-pat');
  const patSeg = makeSeg(patEl, (v) => { drums.set('pattern', v as DrumPatternName); drums.regenerate(); schedule(); });

  // ── the body: [SWING · DENSITY / TEXTURE housing / SIDECHAIN] | hairline | [DELAY: MIX · FB · TIME] ──
  const body = el('div', 'sd-body');
  const left = el('div', 'sd-left');
  const swingEl = knob('swing'), densEl = knob('density');
  const row1 = el('div', 'sd-krow');
  row1.append(swingEl, densEl);
  const texEl = knob('texture', { size: 'ks' });
  const texSegEl = seg(['tape', 'drive'], d0.texture, 'sm sd-texseg');
  const tex = el('div', 'sg-raised sd-tex');
  tex.append(texEl, texSegEl);
  const scEl = knob('sidechain', { size: 'kl' });
  const row3 = el('div', 'sd-krow');
  row3.append(scEl);
  left.append(row1, tex, row3);

  const dly = el('div', 'sd-delay');
  const dcap = el('span', 'sd-dcap');
  dcap.textContent = 'delay';
  const mixEl = knob('mix', { size: 'ks' }), fbEl = knob('fb', { size: 'ks' });
  const timeEl = knob('time', { size: 'ks', steps: DLY_DIVS.length, value: DLY_WORD[d0.delay.time], chip: true, cls: 'steel' });
  const chip = timeEl.querySelector<HTMLElement>('.si-kn')!;
  dly.append(dcap, mixEl, fbEl, timeEl);
  body.append(left, el('i', 'sg-vdiv'), dly);

  const set = <K extends keyof DrumsState>(k: K, v: DrumsState[K]): void => { drums.set(k, v); schedule(); };
  const setDelay = (patch: Partial<DrumsState['delay']>): void => set('delay', { ...drums.state().delay, ...patch });
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

  // ── the footer rail: M · S · the gain trim ──
  const foot = rail('sd-foot');
  const mBtn = cap('m', { cls: 'sq warn' });
  const sBtn = cap('s', { cls: 'sq' });
  mBtn.addEventListener('click', () => set('mute', !drums.state().mute));
  sBtn.addEventListener('click', () => { inst.setSolo(inst.state().solo === 'drums' ? null : 'drums'); schedule(); });
  const gainEl = knob('gain', { size: 'kx', side: true, tick: GAIN_UNITY });
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

  T.append(head, eqHost, grid, patEl, body, foot);
  root.appendChild(T);

  // ── PAINT: from the instrument's state, diffed (a drag's own echo is a no-op) ──
  let on = d0.on;
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
    pow.classList.toggle('on', d.on);
    pow.setAttribute('aria-pressed', String(d.on));
    T.classList.toggle('is-on', d.on);
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
    mBtn.classList.toggle('on', d.mute);
    mBtn.setAttribute('aria-pressed', String(d.mute));
    if (S.solo !== lastSolo) {
      lastSolo = S.solo;
      sBtn.classList.toggle('on', S.solo === 'drums');
      sBtn.setAttribute('aria-pressed', String(S.solo === 'drums'));
      T.classList.toggle('solo-dim', S.solo != null && S.solo !== 'drums');
    }
  };
  const offChange = inst.onChange(schedule);
  paint();
  const offKeys = reflectKeys([pow]);

  // ── THE PLAYHEAD: the column under the step being heard, while the drums play ──
  let ph = -1, raf = 0;
  const frame = (): void => {
    raf = requestAnimationFrame(frame);
    const step = on && inst.time.running() ? inst.time.playhead().step : -1;
    const s = step >= 0 && step < 16 ? step : -1;
    if (s === ph) return;
    for (const lc of cells) {
      if (ph >= 0) lc[ph].classList.remove('ph');
      if (s >= 0) lc[s].classList.add('ph');
    }
    ph = s;
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
      T.remove();
    },
  };
};
