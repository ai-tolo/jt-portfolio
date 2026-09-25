// SIGNAL R1 · lane V0 · view/common.ts: the material's DOM builders (new code, no Studio source: the Studio drew its
// caps and glass inline per region). Each returns an HTMLElement wearing the look-B classes of
// src/styles/signal/material.css, and knob()/seg()/lcd() emit exactly the DOM controls.ts wants (makeKnob: `.si-dial`;
// makeSeg: `button[data-v]`; makeFader: `.si-fill` + `.si-pc`). The words they print are the device's own legends
// (a cap's name, a caption, a key): no title=, no hints. Text goes in as textContent, never as markup.
import { el } from './controls.ts';

/** The accent tokens (CSS variable NAMES), per module: accent(tower, 'drums') and every recipe under it follows. */
export const ACC = {
  drums: '--sg-drums', bass: '--sg-bass-lit', keys: '--sg-keys', harmony: '--sg-sapphire', curve: '--sg-curve',
  tempo: '--sg-amber', gate: '--sg-amber', stop: '--sg-red', steel: '--sg-steel',
  drive: '--sg-drive', mod: '--sg-mod', delay: '--sg-delay', reverb: '--sg-reverb',
} as const;
export type AccKey = keyof typeof ACC;
export const accVar = (k: AccKey): string => `var(${ACC[k]})`;
/** Paint a module's accent on an element (sets --acc). */
export function accent<T extends HTMLElement>(e: T, k: AccKey): T { e.style.setProperty('--acc', accVar(k)); return e; }

const join = (...c: unknown[]): string => c.filter((x): x is string => typeof x === 'string' && x !== '').join(' ');
const text = (tag: string, cls: string, s: string): HTMLElement => { const e = el(tag, cls || undefined); e.textContent = s; return e; };
const button = (cls: string): HTMLButtonElement => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; return b; };

export interface CapOpts {
  cls?: string;      // modifiers: 'sq' (M/S), 'red' (stop), 'warn' (a mute's red latch), or the lane's own
  led?: boolean;     // the corner LED (lit while .on / .lit, or .sg-led.on)
  on?: boolean;      // latched: rests down, lit from inside
  key?: string;      // the key printed on the cap ('=', 'esc'), a recessed legend
  acc?: AccKey;
  icon?: string;     // trusted inline SVG from the view's own source (a wave, a padlock, an arrow)
  name?: string;     // aria-label when the cap prints no word
}
/** A keycap: `button.sg-cap` = [LED] [icon] label [kbd]. The view toggles `.on` (latch) and `.pressed` (a key held). */
export function cap(label: string, o: CapOpts = {}): HTMLButtonElement {
  const b = button(join('sg-cap', o.cls, o.on && 'on'));
  if (o.led) b.appendChild(led());
  if (o.icon) b.insertAdjacentHTML('beforeend', o.icon);
  if (label) b.append(label);
  if (o.key) b.appendChild(text('kbd', '', o.key));
  if (o.name) b.setAttribute('aria-label', o.name);
  if (o.acc) accent(b, o.acc);
  return b;
}
export const led = (): HTMLElement => el('i', 'sg-led');
/** Recessed glass, lit from within: add 'tint' (the accent rims it), 'glow' (a readout that is ON), 'sg-ew'/'sg-ns' (a pane you drag). */
export const glass = (cls = ''): HTMLElement => el('div', join('sg-glass', cls));
/** A glass readout: `b` value over a `small` caption (octave, key), or cls 'row' = value left, caption right (kit, chord). */
export function screen(value = '', caption = '', cls = ''): HTMLElement {
  const g = glass(join('sg-screen', cls));
  g.appendChild(text('b', '', value));
  if (caption) g.appendChild(text('small', '', caption));
  return g;
}
/** An engraved legend (never lights); cls 'badge' = the wide-tracked wordmark. */
export const etch = (s: string, cls = ''): HTMLElement => text('span', join('sg-etch', cls), s);
/** The brushed rail a tower stands its footer on (M · S · gain). */
export const rail = (cls = ''): HTMLElement => el('div', join('sg-rail', cls));
/** A tower shell in a module's accent. */
export const tower = (acc: AccKey, cls = ''): HTMLElement => accent(el('div', join('sg-tower', cls)), acc);

export interface KnobDomOpts {
  size?: 'kx' | 'ks' | 'km' | 'kl' | 'kxl';   // 24 · 30 · 38 · 42 · 54 px (default 34)
  steps?: number;    // > 1 = the stepped switch body: flag pointer + a printed tick per step (pass the same to makeKnob)
  tick?: number;     // an engraved anchor tick at this value (0..1); see anchored()
  side?: boolean;    // dial left, caption over value to its right
  value?: string;    // the value legend (.si-kn); chip = the amber LCD chip under the dial
  chip?: boolean;
  cls?: string;      // e.g. 'steel' (a steel arc)
}
/** The knob DOM: div.si-knob > div.si-dial > [div.si-stick×steps | div.si-tick] div.si-ptr, + span.si-kl [+ span.si-kn]. */
export function knob(label: string, o: KnobDomOpts = {}): HTMLElement {
  const stepped = !!o.steps && o.steps > 1;
  const k = el('div', join('si-knob', o.size, o.side && 'side', stepped && 'si-stepped', o.cls));
  const dial = el('div', 'si-dial');
  const deg = (v: number): string => `${(-135 + v * 270).toFixed(2)}deg`;
  if (stepped) for (let i = 0; i < o.steps!; i++) dial.appendChild(el('div', 'si-stick')).style.setProperty('--ta', deg(i / (o.steps! - 1)));
  if (o.tick != null) dial.appendChild(el('div', 'si-tick')).style.setProperty('--ta', deg(o.tick));
  dial.appendChild(el('div', 'si-ptr'));
  k.appendChild(dial);
  k.appendChild(text('span', 'si-kl', label));
  if (o.value != null) k.appendChild(text('span', join('si-kn', o.chip && 'sg-chip'), o.value));
  return k;
}
/** makeKnob's onRender for an anchored knob (SWING at .5): the arc grows from the anchor, the tick glints in the detent. */
export function anchored(k: HTMLElement, a: number): (v: number) => void {
  const dial = k.querySelector<HTMLElement>('.si-dial')!;
  const tick = k.querySelector<HTMLElement>('.si-tick');
  dial.classList.add('anch');
  return (v) => {
    dial.style.setProperty('--a0', Math.min(v, a).toFixed(3));
    dial.style.setProperty('--a1', Math.max(v, a).toFixed(3));
    tick?.classList.toggle('hot', Math.abs(v - a) < 0.004);
  };
}
/** A seg: div.si-seg > button[data-v] caps. `words` = values, or [value, legend] pairs. cls: 'col', 'sm'. */
export function seg(words: ReadonlyArray<string | readonly [string, string]>, on?: string, cls = ''): HTMLElement {
  const s = el('div', join('si-seg', cls));
  for (const w of words) {
    const [v, legend] = typeof w === 'string' ? [w, w] : w;
    const b = button(v === on ? 'on' : '');
    b.dataset.v = v; b.textContent = legend; b.setAttribute('aria-pressed', String(v === on));
    s.appendChild(b);
  }
  return s;
}
/** An LCD tower card (makeFader's DOM): div.sg-lcd > span.si-fill + span.si-fl{legend} + span.si-pc. Ink = --acc. */
export function lcd(legend: string, cls = ''): HTMLElement {
  const c = el('div', join('sg-lcd', cls));
  c.append(el('span', 'si-fill'), text('span', 'si-fl', legend), el('span', 'si-pc'));
  return c;
}
export interface KeyOpts {
  lg?: boolean;      // 48 px (Z · M · B)
  sm?: boolean;      // 36 px
  wide?: boolean;    // the SPACE bar: the row's full width
  word?: boolean;    // a lowercase word on an auto-width cap (`stop`)
  tint?: AccKey;     // the face carries this accent at rest (the SPACE bar 'drums', B 'bass')
  colour?: boolean;  // a colour-row key (the amber rim)
  dormant?: boolean; // plays nothing (R, I)
  name?: string;     // aria-label when the label is a glyph
}
/** R3 · A KEYCAP (src/styles/signal/keycap.css: the Visuals room's key material): `button.sg-key[data-code]` printing
 *  its own key (`A`, `space`, `esc`, `←`). The view toggles `.pressed` (its key is down: keyboard or pointer) and `.lit`
 *  (its function is ON). Every code the KEYMAP teaches is drawn with this, once, somewhere on the device. */
export function key(code: string, label: string, o: KeyOpts = {}): HTMLButtonElement {
  const b = button(join('sg-key', o.lg && 'lg', o.sm && 'sm', o.wide && 'wide', o.word && 'word', o.tint && 'tint', o.colour && 'colour', o.dormant && 'dormant'));
  b.dataset.code = code;
  b.textContent = label;
  b.tabIndex = -1;                       // the page's keys are the instrument's; a pointer reaches the cap
  if (o.name) b.setAttribute('aria-label', o.name);
  if (o.tint) accent(b, o.tint);
  if (o.dormant) b.setAttribute('aria-disabled', 'true');
  return b;
}
/** The elastomer gate pad ('z', 'm'): hold it. cls 'dive' = the amber-tinted M. The view toggles `.on` while held. */
export const gpad = (letter: string, cls = ''): HTMLButtonElement => { const b = button(join('sg-gpad', cls)); b.textContent = letter; return b; };
