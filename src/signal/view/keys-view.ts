// SIGNAL R1 · lane V2 · view/keys-view.ts — THE KEYS TOWER: mountKeysView (types.ts MountView). The look is B (the R0 mock
// src/components/signal/look/LookB.astro:123-157 is the picture; its tower CSS is lifted into src/styles/signal/keys.css),
// the gestures are the Studio's (docs/signal-map/F-view.md §KEYS), the material is V0's (src/styles/signal/material.css,
// built with ./common.ts + ./controls.ts). Every ported block carries a banner naming its source. Imports: ../types.ts,
// ./controls.ts, ./common.ts only (types.ts: "Views … import ./types.ts, ./view/controls.ts, ./view/common.ts").
//
// R3 · lane K · THE FIRST-TIMER ROUND (NOTES-SIGNAL-R3.md §1.3 KEYS; brief §D) + R3.1 (Jon's call: the three modules'
// rails M · S · GAIN on ONE line across the device, the row above each module's foot; each foot is the thing the hands do).
// The tower, top to bottom (544 × 518 inside its 1 px border + 10 px padding, 8 apart; the body takes what the fixed rows
// leave, 222):
//   head     the VOICE seg spanning the row, its caps 16 px (RHODES PIANO PAD LEAD: the first thing seen), the picked one
//            lit, .loading while it loads · the ↑ ↓ keycaps (ArrowUp/Down: a click steps the voice as main.ts's 'voice'
//            action does, VOICES order, wrapping; .pressed while the arrow is down). The static KEYS cap is gone.
//   glass    THE ONE LOW-PASS: the 24 dB/oct Butterworth at filterHz(p), drawn from its maths (two RBJ biquads with the
//            linear pole Qs 0.5412 + 1.3066 at 48 k: what the audio does, no eq-response.ts); ONE node at the corner;
//            p ≥ FILTER_OPEN = a true bypass (the line flat at 0 dB, the node at the right edge); drag ANYWHERE = p,
//            relative, the full width = the full sweep (ew-resize); a tap-tap under 320 ms resets to 1 (open).
//            MOTION on (amount ≥ .005): a faint ghost node + a dashed ghost curve ride the LFO's own law (motion.ts) in
//            heard time, breathing between p and p·(1 − amount): the honest picture of the LFO's range
//   gesture  gate · RATE · SWING  |  dive · SPEED · DIST — the two held gestures' knobs, each group headed by its etched
//            name. [R3.2] (Jon's call: "i want the z and the m on the bottom left and right of the main keys") the Z and M
//            keycaps left this row for the keybed's bottom row (view/hands-view.ts), and the reference-counted gesture
//            wrapper around inst.harmony.gesture went with them: this tower no longer touches it. The row 56 → 48; the
//            8 px went to the body
//   body     the LFO deck: MOTION (amount; the chip reads OFF below .005, else the %) · RATE (stepped over LFO_DIVS, the
//            chip prints the division) · the four shape caps — RATE and the shapes .dormant while MOTION is OFF · the four
//            LCD towers DRIVE MOD DEL REV (makeFader: absolute, press/drag = 1 − y/h) over their flavour segs (+ the MOD
//            RATE ribbon, centre detent .5; the DEL divisions as note glyphs) → keys.set('fx', …)
//   rail     M (keys mute) · S (inst.setSolo('keys'); again = null) · GAIN (0..1.25; unity at .8 of the dial) — the
//            drums' and the bass' rail to the letter (view/drums-view.ts, view/bass-view.ts), so the three read as one.
//            [R3.1] it rose from the bottom to sit directly above the harmony row: its top at 518 − 44 − 8 − 36 = 430,
//            the drums' line (their rail over the 44 px SPACE bar) and the bass' (over the B bar)
//   harmony  [R3.1] THE FOOT, 44 (the keys' hands row, as the SPACE bar is the drums' and the B bar the bass'): HOLD ·
//            CHORD · ARP (on-screen toggles only since R3: .sg-cap + LED, written to the harmony, lit from the state) ·
//            RATE · LENGTH · GROOVE (the arp's knobs, .dormant while the arp is off) — moved from the hands' head in R3
//
// PAINT LAW: a gesture calls the instrument (inst.keys.* / inst.harmony.* / inst.setSolo), then repaints its own control at
// once from the state it wrote back; everything else is repainted from inst.state() on inst.onChange (coalesced to one
// paint per microtask, diffed: a drag's own echo writes nothing) — the keyboard's voice cycle, a load, another tower's solo.
// keys.ready() (the loading tense) and the MOTION ghost are read on requestAnimationFrame (cancelled in dispose).
// No title=, no tooltips: the words on the tower are its legends; values surface only in the controls' own transient
// ghosts (the Studio's value-ghost vocabulary).
import { ARP_DIVS, FILTER_MAX_HZ, FILTER_MIN_HZ, FILTER_OPEN, GATE_DIVS, LFO_DIVS, VOICES, VOICE_NAMES } from '../types.ts';
import type { ArpDiv, GateDiv, HarmonyState, KeysState, LfoDiv, LfoShape, MountView, SignalInstrument, SignalState, VoiceId } from '../types.ts';
import { clamp, el, makeFader, makeGhost, makeHSlider, makeKnob, makeSeg } from './controls.ts';
import type { Fader, HSlider, Knob, Seg } from './controls.ts';
import { accent, cap, etch, glass, key, knob, lcd, rail, seg, tower } from './common.ts';
import type { AccKey } from './common.ts';

// ─────────────────────────────────────────────────────────────── the one low-pass, as maths (pure; node-testable)

/** from jt-portfolio-signal/src/signal/filter.ts:42-46 (lane K; itself signal-studio-page/src/page/filter.ts @ 67b6b58):
 *  the 4th-order Butterworth pole pair as LINEAR Qs, 1/(2·cos(π/8)) = 0.5412 and 1/(2·cos(3π/8)) = 1.3066. */
export const BUTTER_Q: readonly [number, number] = [1 / (2 * Math.cos(Math.PI / 8)), 1 / (2 * Math.cos((3 * Math.PI) / 8))];
/** The rate the instrument runs at (NOTES-SIGNAL-R1 §1 BOOT: ctx {sampleRate: 48000}); the biquads' coefficients use it. */
export const CURVE_SR = 48000;
/** The MOTION knob reads OFF below this (from signal-studio-v6lib/src/views/instrument/shape.ts:215, 2a9e4a7; the same
 *  threshold motion.ts writes the filter from). */
export const MOTION_OFF = 0.005;

/** from jt-portfolio-signal/src/signal/filter.ts:57-65 (lane K, the page's law, verbatim): p → the corner,
 *  FILTER_MIN_HZ · (FILTER_MAX_HZ / FILTER_MIN_HZ)^p (a non-number reads as open, the safe end). */
export function pToHz(p: number): number {
  const c = Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 1;
  return FILTER_MIN_HZ * (FILTER_MAX_HZ / FILTER_MIN_HZ) ** c;
}
/** Where a frequency sits across the glass (0..1): the axis the corner rides, so the node is at x = p. */
export const hzToX = (hz: number): number => Math.log(hz / FILTER_MIN_HZ) / Math.log(FILTER_MAX_HZ / FILTER_MIN_HZ);

/** |H(e^jω)| of ONE low-pass biquad at f (corner fc, LINEAR pole Q, rate sr): the RBJ cookbook section, which is exactly
 *  Web Audio's lowpass BiquadFilterNode (its Q param is in dB, α = sin ω0 / (2·10^(Q/20)); filter.ts writes 20·log10 of
 *  the linear Qs, so each of its two sections IS this one). */
export function lpBiquadMag(f: number, fc: number, q: number, sr = CURVE_SR): number {
  const w0 = (2 * Math.PI * fc) / sr, cw = Math.cos(w0), alpha = Math.sin(w0) / (2 * q);
  const b0 = (1 - cw) / 2, b1 = 1 - cw, b2 = b0, a0 = 1 + alpha, a1 = -2 * cw, a2 = 1 - alpha;
  const w = (2 * Math.PI * f) / sr, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
  const nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2);
  const dr = a0 + a1 * c1 + a2 * c2, di = -(a1 * s1 + a2 * s2);
  return Math.sqrt((nr * nr + ni * ni) / (dr * dr + di * di));
}
/** The 24 dB/oct Butterworth (both sections) at f, in dB: −3.01 at the corner, flat below it. */
export function butterDb(f: number, fc: number, sr = CURVE_SR): number {
  const m = lpBiquadMag(f, fc, BUTTER_Q[0], sr) * lpBiquadMag(f, fc, BUTTER_Q[1], sr);
  return 20 * Math.log10(Math.max(m, 1e-6));
}

// from signal-studio-v6lib/src/views/instrument/eq-response.ts:19-20 (2a9e4a7): the glass's dB axis (the Studio's
// module EQ glasses: +18 at the top, −30 at the bottom, 0 dB at y 75 of 200).
export const DB_TOP = 18;
export const DB_BOT = -30;
export const dbToY = (db: number, h = 200): number => ((DB_TOP - db) / (DB_TOP - DB_BOT)) * h;

/** The curve for position p on a W×H box: x = the glass fraction (the corner sits at x = p), y = dB. At or past
 *  FILTER_OPEN the filter is a TRUE bypass (filter.ts: the dry leg alone), so the line lies flat on 0 dB. Above the
 *  corner the slope only falls, so the line ENDS where it meets the floor (−30 dB) rather than running along the glass's
 *  bottom edge; a fill closes along the bottom from there. */
export function lowpassPath(p: number, W = 600, H = 200, N = 150): string {
  const pc = Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 1;
  const y0 = dbToY(0, H).toFixed(1);
  if (pc >= FILTER_OPEN) return `M0 ${y0}L${W} ${y0}`;
  const fc = Math.min(pToHz(pc), 0.49 * CURVE_SR);   // filter.ts:89-90 clamps the corner the same way (never binds at 48 k)
  let d = '';
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    const y = Math.min(H, Math.max(0, dbToY(butterDb(pToHz(x), fc), H)));
    d += (i ? 'L' : 'M') + (x * W).toFixed(1) + ' ' + y.toFixed(1);
    if (y >= H && x > pc) break;
  }
  return d;
}

/** The node's x across the glass (0..1): the corner, kept 2.5 % inside each edge so it never clips; open = the right edge. */
export const nodeX = (p: number): number => Math.min(0.975, Math.max(0.025, !Number.isFinite(p) || p >= FILTER_OPEN ? 1 : p));

// ═══ from jt-portfolio-signal/src/signal/motion.ts:33-57 (lane K; its law is signal-studio-v6lib src/engine/core.ts:636-690
// @ 2a9e4a7): the LFO's beats per cycle, its four shapes and p = pHand·(1 − amount·(1 − l)/2). COPIED, not imported
// (NOTES-SIGNAL-R1 §0: no module is shared between lanes): the ghost draws exactly the p MOTION writes. ═══
const DIV_BEATS: Readonly<Record<LfoDiv, number>> = {
  '1/1': 4, '1/2': 2, '1/4': 1, '1/4T': 2 / 3, '1/8': 0.5, '1/8T': 1 / 3, '1/16': 0.25, '1/16T': 1 / 6, '1/32': 0.125,
};
const LFO: Readonly<Record<LfoShape, (f: number) => number>> = {
  sine: (f) => Math.cos(2 * Math.PI * f),
  sawi: (f) => 1 - 2 * f,
  saw: (f) => 2 * f - 1,
  sqr: (f) => (f < 0.5 ? 1 : -1),
};
/** The p MOTION writes at `beats`: between pHand (the LFO at its top) and pHand·(1 − amount) (at its floor). */
export function motionGhostP(pHand: number, m: KeysState['motion'], beats: number): number {
  const b = DIV_BEATS[m.div] ?? DIV_BEATS['1/8'];
  const x = beats / b;
  const l = (LFO[m.shape] ?? LFO.sine)(x - Math.floor(x));
  return pHand * (1 - m.amount * ((1 - l) / 2));
}
// ═══ end motion.ts copy ═══

/** The LFO clock in HEARD time (what the ear is on, not what the scheduler booked): the lattice's playhead while the clock
 *  runs; else free-running at the tempo from the context clock, less its output latency (motion.ts:60-67 in heard time).
 *  With the context asleep (nothing sounds yet) the ghost still breathes on the page clock, to show the range. */
export function heardBeats(inst: Pick<SignalInstrument, 'ctx' | 'time'>, nowMs: number): number {
  const t = inst.time, ctx = inst.ctx;
  const bpm = Number.isFinite(t.bpm()) && t.bpm() > 0 ? t.bpm() : 120;
  if (ctx && ctx.state === 'running') {
    if (t.running()) { const ph = t.playhead(); return ph.bar * 4 + (ph.step + ph.phase) / 4; }
    const lat = ctx.outputLatency || ctx.baseLatency || 0;
    return ((ctx.currentTime - (Number.isFinite(lat) ? lat : 0)) * bpm) / 60;
  }
  return (nowMs / 1000) * (bpm / 60);
}

// ─────────────────────────────────────────────────────────────── the Studio's words, glyphs and laws for this tower

// from signal-studio-v6lib/src/views/instrument/shape.ts:26-32, 38-40 (2a9e4a7): the glass's log grid (majors at
// 100/1k/10k) and its three labels. PORT: the axis is the page filter's own (40 Hz..20 kHz = x 0..1, so the corner
// stands under the hand at x = p), not the Studio's 20 Hz..20 kHz.
const FGRID: ReadonlyArray<{ hz: number; maj: boolean }> = [
  { hz: 50, maj: false }, { hz: 100, maj: true }, { hz: 200, maj: false }, { hz: 500, maj: false },
  { hz: 1000, maj: true }, { hz: 2000, maj: false }, { hz: 5000, maj: false }, { hz: 10000, maj: true },
];
const FLABELS: ReadonlyArray<readonly [number, string]> = [[100, '100'], [1000, '1k'], [10000, '10k']];

// from signal-studio-v6lib/src/views/instrument/shape.ts:19-24 (2a9e4a7): the four wave glyphs (22 × 13).
const WAVE_ICONS: Readonly<Record<LfoShape, string>> = {
  sine: 'M1 6.5 Q5 1 9 6.5 T21 6.5',
  sawi: 'M1 2 L10 11 L10 2 L21 11',
  saw: 'M1 11 L10 2 L10 11 L21 2',
  sqr: 'M1 11 L1 2 L11 2 L11 11 L21 11 L21 2',
};
const LFO_SHAPES: readonly LfoShape[] = ['sine', 'sawi', 'saw', 'sqr'];

// from signal-studio-v6lib/src/views/instrument/effects.ts:16-22 (2a9e4a7): the DEL division note glyphs (glyph only;
// the long name rides aria-label, never a visible word). PORT: keyed by the contract's DelayDiv values.
const NOTE_GLYPH: Readonly<Record<string, string>> = {
  '1/16': '<svg width="11" height="16" viewBox="0 0 11 16" aria-hidden="true"><ellipse cx="3.4" cy="13" rx="3" ry="2.2"/><rect x="5.6" y="1" width="1.3" height="12"/><path d="M6.9 1 q3.4 1.6 3.4 4 q-1.8-1.4-3.4-1.5z"/><path d="M6.9 4.5 q3.4 1.6 3.4 4 q-1.8-1.4-3.4-1.5z"/></svg>',
  '1/8': '<svg width="11" height="16" viewBox="0 0 11 16" aria-hidden="true"><ellipse cx="3.4" cy="13" rx="3" ry="2.2"/><rect x="5.6" y="1" width="1.3" height="12"/><path d="M6.9 1 q3.4 1.8 3.4 4.6 q-1.8-1.5-3.4-1.7z"/></svg>',
  '1/8d': '<svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true"><ellipse cx="3.4" cy="13" rx="3" ry="2.2"/><rect x="5.6" y="1" width="1.3" height="12"/><path d="M6.9 1 q3.4 1.8 3.4 4.6 q-1.8-1.5-3.4-1.7z"/><circle cx="12" cy="13.4" r="1.4"/></svg>',
  '1/4': '<svg width="9" height="16" viewBox="0 0 9 16" aria-hidden="true"><ellipse cx="3.4" cy="13" rx="3" ry="2.2"/><rect x="5.6" y="1" width="1.3" height="12"/></svg>',
};
const DIV_LONG: Readonly<Record<string, string>> = { '1/16': '1/16 note', '1/8': '1/8 note', '1/8d': 'dotted 1/8', '1/4': '1/4 note' };

// from signal-studio-v6lib/src/views/instrument/effects.ts:62-67 (2a9e4a7): the four towers and their flavours (the legends
// are the Studio's). PORT: values are the contract's (types.ts DriveType · ModMode · DelayDiv · RevSize), the inks are
// look B's one green family (material --sg-drive/mod/delay/reverb), and the defaults come from the state, not the table.
type FxAmt = 'drive' | 'mod' | 'delay' | 'reverb';
type FxSub = 'driveType' | 'modMode' | 'delayDiv' | 'revSize';
interface FxDef { key: FxAmt; legend: string; acc: AccKey; sub: FxSub; opts: ReadonlyArray<readonly [string, string]> }
const FX: readonly FxDef[] = [
  { key: 'drive', legend: 'DRIVE', acc: 'drive', sub: 'driveType', opts: [['warm', 'WARM'], ['crunch', 'CRUNCH'], ['tape', 'TAPE'], ['fuzz', 'FUZZ']] },
  { key: 'mod', legend: 'MOD', acc: 'mod', sub: 'modMode', opts: [['phaser', 'PHS'], ['flanger', 'FLNG'], ['doubler', 'DBL'], ['chorus', 'CHRS']] },
  { key: 'delay', legend: 'DEL', acc: 'delay', sub: 'delayDiv', opts: [['1/4', '1/4'], ['1/8', '1/8'], ['1/8d', '1/8·'], ['1/16', '1/16']] },
  { key: 'reverb', legend: 'REV', acc: 'reverb', sub: 'revSize', opts: [['sm', 'SM'], ['med', 'MED'], ['hall', 'HALL'], ['vast', 'VAST']] },
];

/** from signal-studio-v6lib/src/views/instrument/effects.ts:133 (2a9e4a7): the MOD RATE multiplier (.5 = ×1, the recipe's own speed). */
export const modRateMult = (v: number): number => Math.pow(4, 2 * (v - 0.5));
/** The ribbon's centre detent: within ±6 % of .5 it lands on .5 (≈ ±4 px of the ribbon; the knob law's ±6 px window). */
export const MODRATE_DETENT = 0.06;
export const snapModRate = (v: number): number => (Math.abs(v - 0.5) < MODRATE_DETENT ? 0.5 : clamp(v, 0, 1));

/** from signal-studio-v6lib/src/views/instrument/module-header.ts:259-262 (2a9e4a7): the gain trim's ghost (dial 0..1 → ×1.25). */
export const gainFmt = (v: number): string => {
  const db = v <= 0.001 ? '−∞' : (20 * Math.log10(v * 1.25)).toFixed(1);
  return `GAIN ${db === '−∞' ? db : (Number(db) > 0 ? '+' : '') + db} dB`;
};
/** The footer trim (module-header.ts:253-270; keys.ts KEYS_GAIN_MAX): the dial's 0..1 ↔ keys.gain 0..1.25, unity at .8. */
export const GAIN_MAX = 1.25;
export const GAIN_UNITY = 0.8;
export const gainToV = (g: number): number => clamp(g / GAIN_MAX, 0, 1);
export const amtFmt = (v: number): string => (v < MOTION_OFF ? 'OFF' : String(Math.round(v * 100)));
export const divToV = (d: LfoDiv): number => Math.max(0, LFO_DIVS.indexOf(d)) / (LFO_DIVS.length - 1);
export const vToDiv = (v: number): LfoDiv => LFO_DIVS[clamp(Math.round(v * (LFO_DIVS.length - 1)), 0, LFO_DIVS.length - 1)];
/** The motion defaults (types.ts KeysState: 0 = OFF, '1/8'): what a double-click on MOTION / RATE returns to. */
const RATE_DFLT: LfoDiv = '1/8';

const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag: string, attrs: Record<string, string | number>): Element {
  const e = document.createElementNS(SVGNS, tag);
  for (const k of Object.keys(attrs)) if (attrs[k] !== '') e.setAttribute(k, String(attrs[k]));
  return e;
}
const waveSvg = (s: LfoShape): string => `<svg viewBox="0 0 22 13" aria-hidden="true"><path d="${WAVE_ICONS[s]}"/></svg>`;

// ═══ from signal-studio-v6lib/src/views/instrument/shape.ts:199-207 (2a9e4a7): the LCD refresh blink — a discrete glass-text
// change blinks the chip for 70 ms, burst-guarded at 150 ms so a ride can't strobe. PORT: the material's .sg-t-blink tense
// (material.css sg-blink) instead of the Studio's .blink, and the guard stamp in a WeakMap instead of an expando. ═══
const lastBlink = new WeakMap<HTMLElement, number>();
function lcdWrite(elm: HTMLElement, txt: string): void {
  if (elm.textContent === txt) return;
  elm.textContent = txt;
  const now = performance.now();
  if (now - (lastBlink.get(elm) ?? -1e9) < 150) return;
  lastBlink.set(elm, now);
  elm.classList.remove('sg-t-blink'); void elm.offsetWidth; elm.classList.add('sg-t-blink');
}

// ═══ from signal-studio-v6lib/src/views/instrument/shape.ts:115-122 (2a9e4a7): coalesce pointermoves to one apply per
// animation frame; flush() commits the last move on pointerup; live() drops a frame that lands after the drag ended. ═══
function rafDrag(apply: (e: PointerEvent) => void, live: () => boolean): { move: (e: PointerEvent) => void; flush: () => void; cancel: () => void } {
  let id = 0, last: PointerEvent | null = null;
  const run = (): void => { id = 0; const ev = last; last = null; if (ev && live()) apply(ev); };
  return {
    move: (e) => { last = e; if (!id) id = requestAnimationFrame(run); },
    flush: () => { if (id) { cancelAnimationFrame(id); id = 0; } const ev = last; last = null; if (ev && live()) apply(ev); },
    cancel: () => { if (id) { cancelAnimationFrame(id); id = 0; } last = null; },
  };
}

const setK = (k: Knob, v: number): void => { if (Math.abs(k.get() - v) > 1e-6) k.set(v); };
const readSolo = (s: SignalState['solo'] | undefined): SignalState['solo'] => (s === 'drums' || s === 'keys' || s === 'bass' ? s : null);

// ═══ from jt-portfolio-signal/src/signal/view/hands-view.ts:60-78 (R2, 76a02c7; its laws are signal-studio-v6lib
// src/views/instrument/play.ts:797-816, 866-882 @ 2a9e4a7): the gesture row's and the arp's knob laws + bindKnob, moved
// here with the controls in R3 (lane V drops them from the hands). COPIED, not imported (no import from another lane). ═══
const LEN_MIN = 0.06, LEN_SPAN = 1.24;             // play.ts:809-813 LENGTH = the Studio's arp gate 0.06..1.3, default .5
const DIVE_T_MIN = 0.05, DIVE_T_MAX = 1.5;         // play.ts:866-875 SPEED: clockwise = faster (a shorter tau)
const DIVE_D_MIN = 2, DIVE_D_MAX = 36;             // play.ts:876-882 DIST in semitones
const stepV = (i: number, n: number): number => (n > 1 ? i / (n - 1) : 0);
const stepI = (v: number, n: number): number => clamp(Math.round(v * (n - 1)), 0, n - 1);
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
function setText(e: Element, s: string): void { if (e.textContent !== s) e.textContent = s; }
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
// ═══ end hands-view.ts copy ═══

// ═══ from jt-portfolio-signal/src/signal/view/drums-view.ts:81-112 (R3 lane D's reflectKeys, COPIED: no import from another
// lane): a keycap goes .pressed while its key is down. ONE capture-phase window pair; never preventDefaults, never stops
// propagation; ignores ⌘/ctrl/alt and typing (the keymap's owns()); a lost window lets go. Display only. ═══
function reflectKeys(caps: ReadonlyArray<HTMLElement>): () => void {
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
// ═══ end drums-view.ts copy ═══

// ─────────────────────────────────────────────────────────────── the tower

export const mountKeysView: MountView = (root, inst) => {
  const K = inst.keys, H = inst.harmony;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const after = (key: string, ms: number, fn: () => void): void => {
    const prev = timers.get(key); if (prev) clearTimeout(prev);
    timers.set(key, setTimeout(() => { timers.delete(key); fn(); }, ms));
  };
  const s0 = inst.state();
  const k0 = s0.keys, h0 = s0.harmony;
  let pHand = k0.filter;                           // the hand's p (keys.state().filter), as the glass last drew it
  let motion = k0.motion;                          // what the frame's ghost rides (kept by paint)
  const T = tower('keys', 'kv-tower');
  // a cap acts on its click; a mouse click hands focus back so Space and Enter stay the page's (hands-view.ts onClick)
  const onClick = (b: HTMLElement, fn: () => void): void => {
    b.addEventListener('click', (e) => { fn(); if ((e as MouseEvent).detail) (b as HTMLElement).blur?.(); });
  };

  // ── 1 · the head: the VOICE seg + the ↑ ↓ keycaps ──────────────────────────────────────────────────────────────
  const head = el('div', 'kv-head');
  const voices = seg(VOICES.map((v) => [v, VOICE_NAMES[v]] as const), k0.voice, 'kv-voices');
  voices.dataset.ctl = 'keys-voice';   // stable hooks for the test surface's click(selector), as the hands' data-ctl
  const voiceBtns = Array.from(voices.querySelectorAll<HTMLElement>('button[data-v]'));
  let picked: string = k0.voice, loadingShown: string | null = null;
  const paintLoading = (): void => {
    let ready = true;
    try { ready = K.ready(); } catch { /* a broken ready() reads as settled */ }
    const want = ready ? null : picked;
    if (want === loadingShown) return;
    loadingShown = want;
    voiceBtns.forEach((b) => b.classList.toggle('loading', want !== null && b.dataset.v === want));
  };
  const pickVoice = (v: VoiceId): void => {
    picked = v;
    try { void Promise.resolve(K.pick(v)).catch(() => { /* pick never rejects (keys.ts); belt and braces */ }); } catch { /* */ }
    paint();
  };
  const voiceSeg: Seg = makeSeg(voices, (v) => pickVoice(v as VoiceId));
  // ↑ ↓: the keymap's 'voice' action (src/signal/main.ts: VOICES order from the current voice, wrapping), by pointer
  const vUp = key('ArrowUp', '↑', { sm: true, name: 'Voice up' });
  const vDn = key('ArrowDown', '↓', { sm: true, name: 'Voice down' });
  vUp.dataset.ctl = 'keys-voice-up'; vDn.dataset.ctl = 'keys-voice-down';
  const stepVoice = (d: 1 | -1): void => {
    const i = Math.max(0, VOICES.indexOf(K.state().voice));
    pickVoice(VOICES[(i + d + VOICES.length) % VOICES.length]);
  };
  onClick(vUp, () => stepVoice(1));
  onClick(vDn, () => stepVoice(-1));
  const vKeys = el('div', 'kv-vkeys');
  vKeys.append(vUp, vDn);
  head.append(voices, vKeys);
  const offKeys = reflectKeys([vUp, vDn]);

  // ── 2 · the one low-pass glass ─────────────────────────────────────────────────────────────────────────────────
  const scr = glass('tint sg-ew kv-filter');
  scr.dataset.ctl = 'keys-filter';
  const svg = svgEl('svg', { viewBox: '0 0 600 200', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  const grid = svgEl('g', { class: 'si-afgrid' });
  const Y0 = dbToY(0, 200);
  for (const g of FGRID) {
    const x = (hzToX(g.hz) * 600).toFixed(1);
    grid.appendChild(svgEl('line', { class: g.maj ? 'maj' : '', x1: x, y1: 0, x2: x, y2: 200 }));
  }
  grid.appendChild(svgEl('line', { class: 'zero', x1: 0, y1: Y0, x2: 600, y2: Y0 }));
  const fillP = svgEl('path', { class: 'si-affill', d: '' });
  const ghostP = svgEl('path', { class: 'kv-ghostpath', d: '', visibility: 'hidden' });
  const lineP = svgEl('path', { class: 'si-afpath', d: '' });
  svg.appendChild(grid); svg.appendChild(fillP); svg.appendChild(ghostP); svg.appendChild(lineP);
  scr.appendChild(svg);
  for (const [hz, t] of FLABELS) {
    const lab = el('span', 'kv-fq');
    lab.textContent = t;
    lab.style.left = (hzToX(hz) * 100).toFixed(2) + '%';
    scr.appendChild(lab);
  }
  // the node stands where the slope's asymptotes meet (the corner on the 0 dB line), as the Studio's glass seats its
  // node at the resonance it carries: the page's filter has none, so 0 dB.
  const ghostNode = el('span', 'sg-node kv-lp kv-gnode');
  const node = el('span', 'sg-node kv-lp');
  ghostNode.hidden = true;
  ghostNode.style.top = node.style.top = ((Y0 / 200) * 100).toFixed(2) + '%';
  scr.append(ghostNode, node);

  let drawnP = NaN;                                // the p the curve last drew (NaN = never)
  const drawFilter = (): void => {
    if (pHand === drawnP) return;
    drawnP = pHand;
    const d = lowpassPath(pHand);
    lineP.setAttribute('d', d);
    fillP.setAttribute('d', d + 'L600 200L0 200Z');
    node.style.left = (nodeX(pHand) * 100).toFixed(2) + '%';
  };
  let ghostAt = NaN;                               // the ghost's last drawn p (NaN = hidden)
  const drawGhost = (gp: number | null): void => {
    if (gp === null) {
      if (Number.isNaN(ghostAt)) return;
      ghostAt = NaN; ghostNode.hidden = true; ghostP.setAttribute('visibility', 'hidden');
      return;
    }
    if (Math.abs(gp - ghostAt) < 2e-4) return;
    const was = ghostAt;
    ghostAt = gp;
    ghostNode.style.left = (nodeX(gp) * 100).toFixed(2) + '%';
    ghostP.setAttribute('d', lowpassPath(gp));
    if (Number.isNaN(was)) { ghostNode.hidden = false; ghostP.setAttribute('visibility', 'visible'); }
  };
  drawFilter();

  // ═══ from signal-studio-v6lib/src/views/instrument/shape.ts:124-157 (2a9e4a7): the glass drag — relative anchor (no jump,
  // the full width = the full sweep), one apply per frame, a tap then a tap within 320 ms = reset. PORT: X only (the page's
  // filter has no resonance and no slope, so Y and Shift are gone); the reset is p = 1 (open, a true bypass); apply =
  // keys.set('filter', p) — MOTION (motion.ts) is the only writer of the filter itself. ═══
  let anchorX = 0, anchorY = 0, baseP = 1, lastTap = 0, downTime = 0, moved = false;
  const setP = (p: number): void => {
    pHand = p;
    K.set('filter', p);
    const back = K.state().filter;                 // what the module kept (keys.ts clamps)
    if (Number.isFinite(back)) pHand = back;
    drawFilter();
  };
  const applyDelta = (e: PointerEvent): void => {
    const r = scr.getBoundingClientRect();
    if (Math.abs(e.clientX - anchorX) > 2 || Math.abs(e.clientY - anchorY) > 2) moved = true;
    setP(clamp(baseP + (e.clientX - anchorX) / (r.width || 1), 0, 1));
  };
  const cutRaf = rafDrag(applyDelta, () => !!scr.dataset.drag);
  scr.addEventListener('pointerdown', (e) => {
    if (lastTap && e.timeStamp - lastTap < 320) { lastTap = 0; setP(1); return; }
    scr.dataset.drag = '1';
    anchorX = e.clientX; anchorY = e.clientY; baseP = pHand; downTime = e.timeStamp; moved = false;
    try { scr.setPointerCapture(e.pointerId); } catch { /* */ }
  });
  scr.addEventListener('pointermove', (e) => { if (scr.dataset.drag) cutRaf.move(e); });
  const endGlass = (): void => { if (scr.dataset.drag) { cutRaf.flush(); lastTap = moved ? 0 : downTime; scr.dataset.drag = ''; } };
  scr.addEventListener('pointerup', endGlass);
  scr.addEventListener('pointercancel', endGlass);
  // ═══ end shape.ts port ═══

  // ── 3 · THE GESTURE ROW: gate · RATE · SWING | dive · SPEED · DIST ─────────────────────────────────────────────────
  // ═══ from jt-portfolio-signal/src/signal/view/hands-view.ts:385-457 (R2, 76a02c7; the Studio's play.ts:146-163, 818-883
  // @ 2a9e4a7): the gate row. PORT (R3): the wordmark badge is gone, the words `gate` / `dive` are the gestures' names.
  // [R3.2] the Z and M keycaps (and the gesture wrapper that let their pointer holds count with the keys) moved to the
  // keybed's bottom row in view/hands-view.ts: here the two knob groups stay, each headed by its etched name. ═══
  const gest = accent(el('div', 'kv-gest'), 'gate');
  const kgRate = knob('rate', { size: 'kx', side: true, steps: GATE_DIVS.length, value: h0.gate.div });
  const kgSwing = knob('swing', { size: 'kx', side: true, value: String(Math.round(h0.gate.swing * 100)) });
  const kdSpeed = knob('speed', { size: 'kx', side: true, value: h0.dive.speedSec.toFixed(2) });
  const kdDist = knob('dist', { size: 'kx', side: true, value: String(h0.dive.dist) });
  kgRate.dataset.ctl = 'gate-rate'; kgSwing.dataset.ctl = 'gate-swing'; kdSpeed.dataset.ctl = 'dive-speed'; kdDist.dataset.ctl = 'dive-dist';
  const gl = el('div', 'kv-ggrp');
  gl.append(etch('gate', 'kv-gword'), kgRate, kgSwing);
  const gr = el('div', 'kv-ggrp');
  gr.append(etch('dive', 'kv-gword'), kdSpeed, kdDist);
  gest.append(gl, el('i', 'sg-vdiv kv-gdiv'), gr);
  const gateWrite = (p: Partial<HarmonyState['gate']>): void => {
    const g = H.state().gate, n = { ...g, ...p };
    if (n.div !== g.div || !near(n.swing, g.swing)) H.set('gate', n);
  };
  const diveWrite = (p: Partial<HarmonyState['dive']>): void => {
    const d = H.state().dive, n = { ...d, ...p };
    if (!near(n.speedSec, d.speedSec) || n.dist !== d.dist) H.set('dive', n);
  };
  const bgRate = bindKnob<GateDiv>(kgRate, h0.gate.div, {
    toV: (d) => stepV(Math.max(0, GATE_DIVS.indexOf(d)), GATE_DIVS.length), fromV: (v) => GATE_DIVS[stepI(v, GATE_DIVS.length)],
    same: (a, b) => a === b, text: (d) => d, write: (div) => gateWrite({ div }), steps: GATE_DIVS.length,
  });
  const bgSwing = bindKnob<number>(kgSwing, h0.gate.swing, {
    toV: (s) => clamp(s, 0, 1), fromV: (v) => v, same: near, text: (s) => String(Math.round(s * 100)),
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
  // ═══ end hands-view.ts gate-row port ═══

  // ── 4 · the body: the LFO deck + the four FX towers ────────────────────────────────────────────────────────────
  const body = el('div', 'kv-body');
  const lfo = el('div', 'sg-deck kv-lfo');
  const setMotion = (patch: Partial<KeysState['motion']>): void => {
    K.set('motion', { ...K.state().motion, ...patch });
    motion = K.state().motion;
  };

  // ═══ from signal-studio-v6lib/src/views/instrument/shape.ts:209-227, 243-277, 302-310 (2a9e4a7): MOTION (amount, dbl-click
  // = 0, OFF below .005, the value ghost), RATE in SYNC mode (a stepped switch over the divisions, the chip blinks on a
  // change), the four wave keycaps. PORT: RATE has no Hz face (the contract's motion.div is a division only, so the chip is
  // not a toggle); 9 detents = LFO_DIVS, dbl-click = 1/8 (the default, as the drums' TIME); look B's arcs (the LFO deck
  // amber) and the deck from LookB.astro:137-143. [R3] RATE + the shapes are .dormant while MOTION is OFF (Law 3). ═══
  const amtHost = knob('motion', { size: 'kxl', value: amtFmt(k0.motion.amount), chip: true, cls: 'kv-motion' });
  const amtNum = amtHost.querySelector<HTMLElement>('.si-kn')!;
  amtHost.dataset.ctl = 'keys-motion';
  const amtKnob = makeKnob(amtHost, k0.motion.amount,
    (v) => { if (v !== K.state().motion.amount) setMotion({ amount: v }); },
    (v) => { amtNum.textContent = amtFmt(v); },
    { dflt: 0, ghost: makeGhost(amtHost), label: (v) => `MOTION ${amtFmt(v)}` });

  const rateHost = knob('rate', { size: 'km', steps: LFO_DIVS.length, value: k0.motion.div, chip: true, cls: 'kv-rate' });
  const rateNum = rateHost.querySelector<HTMLElement>('.si-kn')!;
  rateHost.dataset.ctl = 'keys-rate';
  const rateKnob = makeKnob(rateHost, divToV(k0.motion.div),
    (v) => { const d = vToDiv(v); if (d !== K.state().motion.div) setMotion({ div: d }); },
    (v) => lcdWrite(rateNum, vToDiv(v)),
    { steps: LFO_DIVS.length, dflt: divToV(RATE_DFLT), ghost: makeGhost(rateHost), label: (v) => `RATE ${vToDiv(v)}` });

  const shapes = el('div', 'kv-shapes');
  shapes.dataset.ctl = 'keys-shape';
  const shapeBtns = LFO_SHAPES.map((sh) => {
    const b = cap('', { led: true, icon: waveSvg(sh), name: sh, acc: 'gate', cls: 'kv-shape' });
    b.dataset.v = sh;
    b.addEventListener('click', () => { setMotion({ shape: sh }); lightShape(motion.shape); });
    shapes.appendChild(b);
    return b;
  });
  let litShape = '';
  const lightShape = (v: LfoShape): void => {
    if (v === litShape) return;
    litShape = v;
    shapeBtns.forEach((b) => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  };
  lightShape(k0.motion.shape);
  const lfoKnobs = el('div', 'kv-lfoknobs');
  lfoKnobs.append(amtHost, rateHost);
  lfo.append(lfoKnobs, shapes);
  // ═══ end shape.ts port ═══

  // ═══ from signal-studio-v6lib/src/views/instrument/effects.ts:88-138 (2a9e4a7): the four LCD faders (absolute), the
  // phosphor fall on a PROGRAMMATIC downward set (cleared by a pointerdown so a drag never lags the hand), the flavour
  // segs, the MOD RATE ribbon (makeHSlider) and its value ghost. PORT: the ribbon's centre detent (.5, ±6 %) is enforced
  // here (makeHSlider has none); the ghost stays on the MOD card as the Studio hung it, seated INSIDE the card's legend band
  // by keys.css (the Studio's sat above the card, where the card's overflow clipped it); the DEL long-name ghost is dropped
  // (it named a glyph: a word that explains) and the long name rides aria-label; the REV IR slot strip is not a visitor
  // surface (F-view.md §i). [R3] each column is a real box (a subgrid column) carrying its data-ctl. ═══
  const fxEl = el('div', 'kv-fx');
  const setFx = (patch: Partial<KeysState['fx']>): void => { K.set('fx', { ...K.state().fx, ...patch }); };
  const faders = {} as Record<FxAmt, Fader>;
  const cards = {} as Record<FxAmt, HTMLElement>;
  const subs = {} as Record<FxSub, Seg>;
  let rateSlider: HSlider | null = null;
  for (const f of FX) {
    const col = accent(el('div', 'kv-fxcol'), f.acc);
    col.dataset.key = f.key;
    col.dataset.ctl = `keys-fx-${f.key}`;
    const card = lcd(f.legend);
    card.dataset.key = f.key;
    card.addEventListener('pointerdown', () => card.classList.remove('si-fall'));   // before makeFader's own: no fall on the grab
    faders[f.key] = makeFader(card, k0.fx[f.key], (v) => setFx({ [f.key]: v } as Partial<KeysState['fx']>));
    cards[f.key] = card;
    const sub = seg(f.opts, String(k0.fx[f.sub]), 'col kv-sub');
    if (f.key === 'delay') {
      sub.classList.add('kv-glyph');
      sub.querySelectorAll<HTMLElement>('button[data-v]').forEach((b) => {
        const v = b.dataset.v ?? '';
        b.innerHTML = NOTE_GLYPH[v] ?? '';
        b.setAttribute('aria-label', DIV_LONG[v] ?? v);
      });
    }
    subs[f.sub] = makeSeg(sub, (v) => setFx({ [f.sub]: v } as Partial<KeysState['fx']>));
    if (f.key === 'mod') {
      // from signal-studio-v6lib/src/views/instrument/effects.ts:36-43 (2a9e4a7): the MOD RATE ribbon inside MOD's seg,
      // with its engraved detent mark and its etched cap (the one caption form alone cannot carry).
      const blk = el('div', 'kv-modrate');
      const track = el('div', 'si-strack kv-mrtrack');
      track.dataset.ctl = 'keys-modrate';
      track.append(el('span', 'kv-mrdetent'), el('span', 'si-sfill'), el('span', 'si-shandle'));
      blk.append(track, etch('rate', 'kv-mrcap'));
      sub.appendChild(blk);
      const g = makeGhost(card);
      rateSlider = makeHSlider(track, k0.fx.modRate, (v) => {
        const nv = snapModRate(v);
        if (nv !== v) rateSlider?.set(nv);
        g.show(`×${modRateMult(nv).toFixed(2)}`);
        after('modrate', 700, () => g.hide());
        if (nv !== K.state().fx.modRate) setFx({ modRate: nv });
      });
    }
    col.append(card, sub);
    fxEl.appendChild(col);
  }
  const fxShown = {} as Record<FxAmt, number>;
  const setFall = (k: FxAmt, v: number): void => {
    const card = cards[k], prev = fxShown[k];
    if (prev !== undefined && Math.abs(v - prev) < 1e-9) return;
    if (!card.dataset.drag) card.classList.toggle('si-fall', prev !== undefined && v < prev - 0.001);
    fxShown[k] = v;
    faders[k].set(v);
  };
  // ═══ end effects.ts port ═══
  body.append(lfo, fxEl);

  // ── 5 · THE RAIL: M · S · GAIN, directly above the foot (R3.1: its top on the drums' line, 430) ────────────────────
  // ═══ from signal-studio-v6lib/src/views/instrument/module-header.ts:225-277 (2a9e4a7) + index.ts:651-658: the footer —
  // M (the module's mute latch), S (solo, radio-exclusive, again = clear), the gain trim (dial 0..1 → 0..1.25, unity .8:
  // detent + dbl-click, the dB ghost). PORT: look B's rail + square caps (LookB.astro:153-156) and the drums' + bass' footer
  // to the letter (view/drums-view.ts): a plain arc, the unity tick engraved, glinting only while the hand holds the
  // trim in its detent; the keys' DRY tag dropped (a word that explains); the tower dims while another module is soloed. ═══
  const foot = rail('kv-foot');
  const mBtn = cap('m', { cls: 'sq warn' });
  const sBtn = cap('s', { cls: 'sq' });
  mBtn.dataset.ctl = 'keys-mute'; sBtn.dataset.ctl = 'keys-solo';
  mBtn.addEventListener('click', () => { K.set('mute', !K.state().mute); paint(); });
  sBtn.addEventListener('click', () => { inst.setSolo(readSolo(inst.state().solo) === 'keys' ? null : 'keys'); paint(); });
  const gainHost = knob('gain', { size: 'kx', side: true, tick: GAIN_UNITY });
  const gainTick = gainHost.querySelector<HTMLElement>('.si-tick');
  gainHost.dataset.ctl = 'keys-gain';
  const gainKnob = makeKnob(gainHost, gainToV(k0.gain), (v) => K.set('gain', v * GAIN_MAX), undefined, {
    dflt: GAIN_UNITY, detents: [GAIN_UNITY], ghost: makeGhost(gainHost), label: gainFmt,
    onRender: (v) => { gainTick?.classList.toggle('hot', gainHost.classList.contains('grip') && Math.abs(v - GAIN_UNITY) < 0.004); },
  });
  const unglint = (): void => { gainTick?.classList.remove('hot'); };
  gainHost.addEventListener('pointerup', unglint);
  gainHost.addEventListener('pointercancel', unglint);
  foot.append(mBtn, sBtn, el('i', 'sg-fdiv'), gainHost);
  // ═══ end module-header.ts port ═══

  // ── 6 · THE HARMONY ROW, the foot (R3.1): HOLD · CHORD · ARP + RATE · LENGTH · GROOVE ──────────────────────────────
  // ═══ from jt-portfolio-signal/src/signal/view/hands-view.ts:196-243 (R2, 76a02c7; the Studio's play.ts:762-816 @ 2a9e4a7):
  // the latches write the harmony, their lit state is painted back from the state; RATE (stepped over ARP_DIVS) · LENGTH
  // (0.06..1.3) · GROOVE (0..1). PORT (R3): on-screen toggles only (X C V left the keyboard); the arp knobs carry the
  // material's .dormant while the arp is off (they went steel before). ═══
  const harm = accent(el('div', 'kv-harm'), 'harmony');
  const holdTog = cap('hold', { led: true, acc: 'harmony', cls: 'kv-tog' }); holdTog.dataset.ctl = 'hold';
  const chordTog = cap('chord', { led: true, acc: 'harmony', cls: 'kv-tog' }); chordTog.dataset.ctl = 'chord';
  const arpTog = cap('arp', { led: true, acc: 'harmony', cls: 'kv-tog' }); arpTog.dataset.ctl = 'arp';
  onClick(holdTog, () => H.set('hold', !H.state().hold));
  onClick(chordTog, () => H.set('chord', !H.state().chord));
  onClick(arpTog, () => { const a = H.state().arp; H.set('arp', { ...a, on: !a.on }); });
  const kRate = knob('rate', { size: 'kx', side: true, steps: ARP_DIVS.length, value: h0.arp.div });
  const kLen = knob('length', { size: 'kx', side: true, value: h0.arp.length.toFixed(2) });
  const kGroove = knob('groove', { size: 'kx', side: true, value: h0.arp.groove.toFixed(2) });
  kRate.dataset.ctl = 'arp-rate'; kLen.dataset.ctl = 'arp-length'; kGroove.dataset.ctl = 'arp-groove';
  const togs = el('div', 'kv-togs');
  togs.append(holdTog, chordTog, arpTog);
  const arpK = el('div', 'kv-arpk');
  arpK.append(kRate, kLen, kGroove);
  harm.append(togs, el('i', 'sg-vdiv kv-hdiv'), arpK);
  const arpWrite = (p: Partial<HarmonyState['arp']>): void => {
    const a = H.state().arp, n = { ...a, ...p };
    if (n.div !== a.div || !near(n.length, a.length) || !near(n.groove, a.groove)) H.set('arp', n);
  };
  const bRate = bindKnob<ArpDiv>(kRate, h0.arp.div, {
    toV: (d) => stepV(Math.max(0, ARP_DIVS.indexOf(d)), ARP_DIVS.length), fromV: (v) => ARP_DIVS[stepI(v, ARP_DIVS.length)],
    same: (a, b) => a === b, text: (d) => d, write: (div) => arpWrite({ div }), steps: ARP_DIVS.length,
  });
  const bLen = bindKnob<number>(kLen, h0.arp.length, {
    toV: (l) => clamp((l - LEN_MIN) / LEN_SPAN, 0, 1), fromV: (v) => LEN_MIN + v * LEN_SPAN,
    same: near, text: (l) => l.toFixed(2), write: (length) => arpWrite({ length }), dflt: 0.5,
  });
  const bGroove = bindKnob<number>(kGroove, h0.arp.groove, {
    toV: (g) => clamp(g, 0, 1), fromV: (v) => v, same: near, text: (g) => g.toFixed(2), write: (groove) => arpWrite({ groove }), dflt: 0,
  });
  // ═══ end hands-view.ts harmony port ═══

  T.append(head, scr, gest, body, foot, harm);
  root.appendChild(T);

  // ── PAINT: everything from the instrument's state (inst.state()), diffed: only what changed is written ─────────────
  let dead = false, queued = false;
  let lastMute: boolean | undefined, lastSolo: SignalState['solo'] | undefined, lastMOff: boolean | undefined;
  let harmSig = '';
  function paint(): void {
    queued = false;
    if (dead) return;
    let S: SignalState;
    try { S = inst.state(); } catch { return; }
    const k = S.keys;
    if (!k) return;
    if (k.voice !== voiceSeg.get()) voiceSeg.set(k.voice);
    picked = k.voice;
    paintLoading();
    if (Number.isFinite(k.filter) && k.filter !== pHand) { pHand = k.filter; drawFilter(); }
    motion = k.motion;
    setK(amtKnob, k.motion.amount);
    setK(rateKnob, divToV(k.motion.div));
    lightShape(k.motion.shape);
    const mOff = !(k.motion.amount >= MOTION_OFF);
    if (mOff !== lastMOff) { lastMOff = mOff; rateHost.classList.toggle('dormant', mOff); shapes.classList.toggle('dormant', mOff); }
    for (const f of FX) {
      setFall(f.key, k.fx[f.key]);
      const sv = String(k.fx[f.sub]);
      if (subs[f.sub].get() !== sv) subs[f.sub].set(sv);
    }
    if (rateSlider && Math.abs(rateSlider.get() - k.fx.modRate) > 1e-9) rateSlider.set(k.fx.modRate);
    if (k.mute !== lastMute) { lastMute = k.mute; mBtn.classList.toggle('on', k.mute); mBtn.setAttribute('aria-pressed', String(k.mute)); }
    const so = readSolo(S.solo);
    if (so !== lastSolo) {
      lastSolo = so;
      sBtn.classList.toggle('on', so === 'keys'); sBtn.setAttribute('aria-pressed', String(so === 'keys'));
      T.classList.toggle('solo-dim', so !== null && so !== 'keys');
    }
    setK(gainKnob, gainToV(k.gain));
    const h = S.harmony;
    if (h) {
      const sig = `${h.hold}|${h.chord}|${h.arp.on}`;
      if (sig !== harmSig) {
        harmSig = sig;
        for (const [b, on] of [[holdTog, h.hold], [chordTog, h.chord], [arpTog, h.arp.on]] as Array<[HTMLElement, boolean]>) {
          b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
        }
        for (const kn of [kRate, kLen, kGroove]) kn.classList.toggle('dormant', !h.arp.on);   // Law 3: they wait on ARP
      }
      bRate.sync(h.arp.div); bLen.sync(h.arp.length); bGroove.sync(h.arp.groove);
      bgRate.sync(h.gate.div); bgSwing.sync(h.gate.swing); bdSpeed.sync(h.dive.speedSec); bdDist.sync(h.dive.dist);
    }
  }
  const schedule = (): void => { if (!queued && !dead) { queued = true; queueMicrotask(paint); } };
  const offChange = inst.onChange(schedule);
  paint();

  // ── the frame: keys.ready() (the loading tense) + the MOTION ghost, in heard time ──────────────────────────────
  let raf = 0;
  const frame = (now: number): void => {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    paintLoading();
    const m = motion;
    if (m && m.amount >= MOTION_OFF) {
      let beats = 0;
      try { beats = heardBeats(inst, now); } catch { beats = (now / 1000) * 2; }
      drawGhost(motionGhostP(pHand, m, beats));
    } else drawGhost(null);
  };
  raf = requestAnimationFrame(frame);

  return {
    dispose(): void {
      if (dead) return;
      dead = true;
      cancelAnimationFrame(raf);
      cutRaf.cancel();
      offChange();
      offKeys();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      T.remove();
    },
  };
};
