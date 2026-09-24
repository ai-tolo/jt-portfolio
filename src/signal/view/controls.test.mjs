// controls.test.mjs — lane V0: the one drag law of view/controls.ts (the Studio's controls.ts, verbatim) on a DOM stub.
// run: source ~/.nvm/nvm.sh && node src/signal/view/controls.test.mjs   (exit 0 = green; prints `controls: N/N`)
import { clamp, el, makeGhost, makeKnob, makeFader, makeHSlider, makeSeg } from './controls.ts';
import { ACC, accent, anchored, cap, knob as knobDom, lcd, seg as segDom } from './common.ts';
import { createStubInstrument, defaultState } from './stub-instrument.ts';

// ── a DOM stub: just enough element for controls.ts (classList, style, dataset, listeners, a tiny selector engine) ──
class FakeEl {
  constructor(tag) {
    this.tagName = tag.toUpperCase(); this.cls = new Set(); this.children = []; this.listeners = {}; this.attrs = {};
    this.dataset = {}; this.textContent = ''; this.innerHTML = ''; this.captured = null;
    this.rect = { left: 0, top: 0, width: 100, height: 100 };
    const props = {};
    this.style = { setProperty: (k, v) => { props[k] = String(v); }, getPropertyValue: (k) => props[k] ?? '' };
    const cls = this.cls;
    this.classList = {
      add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c),
      toggle: (c, f) => { const on = f === undefined ? !cls.has(c) : !!f; if (on) cls.add(c); else cls.delete(c); return on; },
    };
  }
  set className(v) { this.cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this.cls.add(c)); }
  get className() { return [...this.cls].join(' '); }
  appendChild(c) { this.children.push(c); return c; }
  append(...n) { for (const x of n) { if (typeof x === 'string') this.textContent += x; else this.appendChild(x); } }
  insertAdjacentHTML(_where, html) { this.innerHTML += html; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  fire(type, p = {}) {
    const ev = { type, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, pointerId: 7, shiftKey: false, clientX: 0, clientY: 0, deltaX: 0, deltaY: 0, timeStamp: 1000, ...p };
    (this.listeners[type] || []).forEach((fn) => fn(ev));
    return ev;
  }
  setPointerCapture(id) { this.captured = id; }
  getBoundingClientRect() { const r = this.rect; return { ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height }; }
  *walk() { for (const c of this.children) { yield c; yield* c.walk(); } }
  matches(sel) {
    const m = /^([a-z]+)?((?:\.[\w-]+)*)(?:\[data-([\w-]+)\])?$/.exec(sel);
    if (!m) throw new Error('stub selector: ' + sel);
    if (m[1] && m[1].toUpperCase() !== this.tagName) return false;
    if (m[2] && !m[2].split('.').filter(Boolean).every((c) => this.cls.has(c))) return false;
    return !m[3] || this.dataset[m[3]] !== undefined;
  }
  querySelector(sel) { for (const e of this.walk()) if (e.matches(sel)) return e; return null; }
  querySelectorAll(sel) { return [...this.walk()].filter((e) => e.matches(sel)); }
}
globalThis.document = { createElement: (t) => new FakeEl(t) };

// ── the harness ──
let pass = 0, total = 0; const fails = [];
const t = (name, fn) => { total++; try { fn(); pass++; } catch (e) { fails.push(`✗ ${name}: ${e.message}`); } };
const near = (a, b, msg = '') => { if (!(Math.abs(a - b) < 1e-9)) throw new Error(`${msg} expected ${b}, got ${a}`); };
const is = (a, b, msg = '') => { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };

function knob(init, opts, paint) {
  const host = new FakeEl('div'); host.className = 'si-knob';
  const dial = new FakeEl('div'); dial.className = 'si-dial'; host.appendChild(dial);
  const got = [];
  const k = makeKnob(host, init, (v) => got.push(v), paint, opts);
  return { host, dial, k, got };
}
// a pointer drag: down at y0, then each move is an offset UP in px (optionally with shift)
function drag(host, ...moves) {
  const y0 = 500; host.fire('pointerdown', { clientY: y0 });
  for (const m of moves) { const [dy, shift] = Array.isArray(m) ? m : [m, false]; host.fire('pointermove', { clientY: y0 - dy, shiftKey: shift }); }
}

// ── clamp / el ──
t('clamp holds both bounds', () => { is(clamp(-1, 0, 1), 0); is(clamp(2, 0, 1), 1); is(clamp(0.4, 0, 1), 0.4); });
t('el(): tag, class, html', () => { const e = el('span', 'si-kl', 'SWING'); is(e.tagName, 'SPAN'); is(e.className, 'si-kl'); is(e.innerHTML, 'SWING'); });

// ── knob: the one drag law ──
t('knob paints --v (3 decimals) at init', () => { const { dial } = knob(0.3); is(dial.style.getPropertyValue('--v'), '0.300'); });
t('knob: 160 px up = the full swing 0 → 1', () => { const { host, k, got } = knob(0); drag(host, 160); near(k.get(), 1); near(got.at(-1), 1); });
t('knob: 80 px = half a swing (.25 → .75)', () => { const { host, k, dial } = knob(0.25); drag(host, 80); near(k.get(), 0.75); is(dial.style.getPropertyValue('--v'), '0.750'); });
t('knob: 16 px = 0.1', () => { const { host, k } = knob(0.5); drag(host, 16); near(k.get(), 0.6); });
t('knob: down past the floor clamps to 0, up past the top to 1', () => { const a = knob(0.2); drag(a.host, -200); near(a.k.get(), 0); const b = knob(0.9); drag(b.host, 400); near(b.k.get(), 1); });
t('knob: Shift = ×8 fine (80 px → +1/16)', () => { const { host, k } = knob(0.5); drag(host, [80, true]); near(k.get(), 0.5 + 80 / 1280); });
t('knob: Shift 160 px = 1/8 of a swing', () => { const { host, k } = knob(0); drag(host, [160, true]); near(k.get(), 0.125); });
t('knob: Shift is re-read on every move (same travel, fine divisor)', () => { const { host, k } = knob(0.2); drag(host, 32, [32, true]); near(k.get(), 0.2 + 32 / 1280); });
t('knob: a detent catches within ±6 px (5 px below .5 → .5)', () => { const { host, k } = knob(0.3, { detents: [0.5] }); drag(host, 27); near(k.get(), 0.5); });
t('knob: a detent passes through beyond ±6 px (7 px below)', () => { const { host, k } = knob(0.3, { detents: [0.5] }); drag(host, 25); near(k.get(), 0.3 + 25 / 160); });
t('knob: a detent catches from above (5 px over → .5)', () => { const { host, k } = knob(0.3, { detents: [0.5] }); drag(host, 37); near(k.get(), 0.5); });
t('knob: a detent passes above beyond ±6 px (7 px over)', () => { const { host, k } = knob(0.3, { detents: [0.5] }); drag(host, 39); near(k.get(), 0.3 + 39 / 160); });
t('knob: steps quantize (5 steps: 19 px → 0, 21 px → .25)', () => { const a = knob(0, { steps: 5 }); drag(a.host, 19); near(a.k.get(), 0); const b = knob(0, { steps: 5 }); drag(b.host, 21); near(b.k.get(), 0.25); });
t('knob: steps land on the grid (100 px → .75, 160 px → 1)', () => { const a = knob(0, { steps: 5 }); drag(a.host, 100); near(a.k.get(), 0.75); const b = knob(0, { steps: 5 }); drag(b.host, 160); near(b.k.get(), 1); });
t('knob: steps ≤ 1 = continuous', () => { const { host, k } = knob(0, { steps: 1 }); drag(host, 21); near(k.get(), 21 / 160); });
t('knob: wheel notch up = +2 px of swing', () => { const { host, k } = knob(0.5); const ev = host.fire('wheel', { deltaY: -100, timeStamp: 1000 }); near(k.get(), 0.5 + 2 / 160); is(ev.defaultPrevented, true); });
t('knob: wheel notch down = −2 px of swing', () => { const { host, k } = knob(0.5); host.fire('wheel', { deltaY: 3, timeStamp: 1000 }); near(k.get(), 0.5 - 2 / 160); });
t('knob: wheel is throttled to one step per 55 ms', () => {
  const { host, k } = knob(0.5);
  host.fire('wheel', { deltaY: -40, timeStamp: 1000 }); host.fire('wheel', { deltaY: -40, timeStamp: 1030 });
  near(k.get(), 0.5 + 2 / 160, 'second notch inside 55 ms dropped;');
  host.fire('wheel', { deltaY: -40, timeStamp: 1060 }); near(k.get(), 0.5 + 4 / 160, 'third notch after 55 ms;');
});
t('knob: Shift wheel = 1/8 of a notch', () => { const { host, k } = knob(0.5); host.fire('wheel', { deltaY: -100, shiftKey: true, timeStamp: 1000 }); near(k.get(), 0.5 + 2 / 160 / 8); });
t('knob: sub-pixel wheel residue is swallowed, value untouched', () => { const { host, k, got } = knob(0.5); const ev = host.fire('wheel', { deltaY: 0.4, deltaX: 0, timeStamp: 1000 }); near(k.get(), 0.5); is(got.length, 0); is(ev.defaultPrevented, true); });
t('knob: a horizontal swipe passes through (not prevented)', () => { const { host, k } = knob(0.5); const ev = host.fire('wheel', { deltaY: 0.2, deltaX: 12, timeStamp: 1000 }); near(k.get(), 0.5); is(ev.defaultPrevented, false); });
t('knob: wheel respects steps', () => { const { host, k } = knob(0.5, { steps: 5 }); host.fire('wheel', { deltaY: -100, timeStamp: 1000 }); near(k.get(), 0.5); });
t('knob: dblclick resets to dflt and reports it', () => { const { host, k, got } = knob(0.9, { dflt: 0.3 }); host.fire('dblclick'); near(k.get(), 0.3); near(got.at(-1), 0.3); });
t('knob: no dflt = no reset (tempo law)', () => { const { host, k, got } = knob(0.9); host.fire('dblclick'); near(k.get(), 0.9); is(got.length, 0); });
t('knob: set() is visual only (no onChange) and quantizes', () => { const { k, got, dial } = knob(0, { steps: 3 }); k.set(0.8); near(k.get(), 1); is(got.length, 0); is(dial.style.getPropertyValue('--v'), '1.000'); k.set(0.7); near(k.get(), 0.5); k.set(0.2); near(k.get(), 0); });
t('knob: pointerdown grips + captures; pointerup lets go', () => {
  const { host, k } = knob(0.5); host.fire('pointerdown', { clientY: 500 });
  is(host.cls.has('grip'), true); is(host.captured, 7); is(host.dataset.drag, '1');
  host.fire('pointerup'); is(host.cls.has('grip'), false); is(host.dataset.drag, '');
  host.fire('pointermove', { clientY: 300 }); near(k.get(), 0.5, 'a move after release is ignored;');
});
t('knob: pointercancel ends the drag too', () => { const { host, k } = knob(0.5); host.fire('pointerdown', { clientY: 500 }); host.fire('pointercancel'); host.fire('pointermove', { clientY: 400 }); near(k.get(), 0.5); });
t('knob: every drag starts from the committed value (no jump on re-grab)', () => { const { host, k } = knob(0.2); drag(host, 16); host.fire('pointerup'); drag(host, 16); near(k.get(), 0.4); });
t('knob: the ghost shows, follows and fades', () => {
  const host = new FakeEl('div'); const dial = new FakeEl('div'); dial.className = 'si-dial'; host.appendChild(dial);
  const g = makeGhost(host); const chip = host.querySelector('.si-ghost');
  makeKnob(host, 0.5, () => {}, undefined, { ghost: g, label: (v) => 'MIX ' + Math.round(v * 100) });
  host.fire('pointerdown', { clientY: 500 }); is(chip.textContent, 'MIX 50'); is(chip.cls.has('on'), true);
  host.fire('pointermove', { clientY: 484 }); is(chip.textContent, 'MIX 60');
  host.fire('pointerup'); is(chip.cls.has('on'), false); is(chip.cls.has('fade'), true);
});
t('knob: setSteps swaps the quantize law at runtime', () => { const { host, k } = knob(0, {}); k.setSteps(5); drag(host, 21); near(k.get(), 0.25); host.fire('pointerup'); k.setSteps(0); drag(host, 3); near(k.get(), 0.25 + 3 / 160); });
t('knob: paint + onRender see every committed value', () => { const seen = []; const r = []; const { host } = knob(0, { onRender: (v) => r.push(v) }, (v) => seen.push(v)); drag(host, 16); near(seen.at(-1), 0.1); near(r.at(-1), 0.1); is(seen.length, 2); });

// ── fader: absolute, rect read per move, high at the top ──
function fader(init) {
  const host = new FakeEl('div'); host.className = 'sg-lcd'; host.rect = { left: 0, top: 100, width: 60, height: 200 };
  const fill = new FakeEl('span'); fill.className = 'si-fill'; const pc = new FakeEl('span'); pc.className = 'si-pc';
  host.appendChild(fill); host.appendChild(pc);
  const got = []; const f = makeFader(host, init, (v) => got.push(v));
  return { host, fill, pc, f, got };
}
t('fader: press sets v = 1 − y/h (absolute)', () => { const { host, f, fill, pc, got } = fader(0); host.fire('pointerdown', { clientY: 150 }); near(f.get(), 0.75); is(fill.style.height, '75.0%'); is(pc.textContent, '75'); near(got.at(-1), 0.75); });
t('fader: drags while held, clamps at both ends', () => { const { host, f } = fader(0.5); host.fire('pointerdown', { clientY: 200 }); host.fire('pointermove', { clientY: 20 }); near(f.get(), 1); host.fire('pointermove', { clientY: 900 }); near(f.get(), 0); });
t('fader: the rect is re-read per move (a moved card still maps)', () => { const { host, f } = fader(0); host.fire('pointerdown', { clientY: 200 }); host.rect = { left: 0, top: 0, width: 60, height: 200 }; host.fire('pointermove', { clientY: 50 }); near(f.get(), 0.75); });
t('fader: empty (≤ .004) marks .mt', () => { const { f, fill } = fader(0.5); is(fill.cls.has('mt'), false); f.set(0.003); is(fill.cls.has('mt'), true); });
t('fader: set() is visual only; moves without a press do nothing', () => { const { host, f, got } = fader(0.2); f.set(0.6); is(got.length, 0); host.fire('pointermove', { clientY: 100 }); near(f.get(), 0.6); });

// ── hslider (kept verbatim; the ribbon lanes may use it) ──
t('hslider: x maps to 0..1 and prints through fmt', () => {
  const host = new FakeEl('div'); host.rect = { left: 10, top: 0, width: 200, height: 12 };
  ['si-sfill', 'si-shandle', 'si-sval'].forEach((c) => { const e = new FakeEl('span'); e.className = c; host.appendChild(e); });
  const s = makeHSlider(host, 0, () => {}, (v) => v.toFixed(2)); host.fire('pointerdown', { clientX: 60 });
  near(s.get(), 0.25); is(host.querySelector('.si-sval').textContent, '0.25'); is(host.querySelector('.si-shandle').style.left, '25.0%');
});

// ── seg: ported to <button data-v> caps ──
function seg(words, on) {
  const host = new FakeEl('div'); host.className = 'si-seg';
  for (const w of words) { const b = new FakeEl('button'); b.dataset.v = w; if (w === on) b.classList.add('on'); host.appendChild(b); }
  const picks = []; const s = makeSeg(host, (v) => picks.push(v));
  return { host, s, picks, btn: (w) => host.children.find((b) => b.dataset.v === w) };
}
t('seg: the lit cap is the initial value', () => { const { s } = seg(['floor', 'back', 'half'], 'back'); is(s.get(), 'back'); });
t('seg: nothing lit = the first cap', () => { const { s } = seg(['floor', 'back'], null); is(s.get(), 'floor'); });
t('seg: a click picks, lights one, reports once', () => {
  const { s, picks, btn } = seg(['floor', 'back', 'half'], 'floor'); btn('half').fire('click');
  is(s.get(), 'half'); is(picks.join(), 'half'); is(btn('half').cls.has('on'), true); is(btn('floor').cls.has('on'), false);
  is(btn('half').getAttribute('aria-pressed'), 'true'); is(btn('floor').getAttribute('aria-pressed'), 'false');
});
t('seg: set() is visual only', () => { const { s, picks, btn } = seg(['a', 'b'], 'a'); s.set('b'); is(s.get(), 'b'); is(picks.length, 0); is(btn('b').cls.has('on'), true); });
t('seg: the port reads <button> caps, not <b>', () => {
  const host = new FakeEl('div'); const b = new FakeEl('b'); b.dataset.v = 'x'; host.appendChild(b);
  const s = makeSeg(host, () => {}); is(s.get(), '');
});

// ── common.ts: the builders emit exactly the DOM controls.ts drives ──
t('knob(): .si-knob > .si-dial > .si-ptr, caption + value; makeKnob drags it', () => {
  const k = knobDom('swing', { size: 'km', value: '50', chip: true });
  is(k.className, 'si-knob km'); is(k.querySelector('.si-dial').querySelector('.si-ptr') !== null, true);
  is(k.querySelector('.si-kl').textContent, 'swing'); is(k.querySelector('.si-kn').className, 'si-kn sg-chip');
  const kk = makeKnob(k, 0, () => {}); k.fire('pointerdown', { clientY: 500 }); k.fire('pointermove', { clientY: 420 }); near(kk.get(), 0.5);
});
t('knob(): a stepped body prints one tick per step, -135° → +135°', () => {
  const k = knobDom('time', { steps: 5 }); const ticks = k.querySelectorAll('.si-stick');
  is(k.cls.has('si-stepped'), true); is(ticks.length, 5);
  is(ticks[0].style.getPropertyValue('--ta'), '-135.00deg'); is(ticks[2].style.getPropertyValue('--ta'), '0.00deg'); is(ticks[4].style.getPropertyValue('--ta'), '135.00deg');
});
t('anchored(): the arc spans anchor↔v, the tick glints in the detent', () => {
  const k = knobDom('swing', { tick: 0.5 }); const dial = k.querySelector('.si-dial'); const tick = k.querySelector('.si-tick');
  makeKnob(k, 0.3, () => {}, undefined, { detents: [0.5], onRender: anchored(k, 0.5) });
  is(dial.cls.has('anch'), true); is(dial.style.getPropertyValue('--a0'), '0.300'); is(dial.style.getPropertyValue('--a1'), '0.500'); is(tick.cls.has('hot'), false);
  k.fire('pointerdown', { clientY: 500 }); k.fire('pointermove', { clientY: 473 }); is(tick.cls.has('hot'), true, 'caught in the detent:');
});
t('seg(): button[data-v] caps, the chosen one lit + pressed; makeSeg reads it', () => {
  const s = segDom(['floor', ['back', 'BK']], 'back', 'sm'); const bs = s.querySelectorAll('button[data-v]');
  is(s.className, 'si-seg sm'); is(bs.length, 2); is(bs[1].textContent, 'BK'); is(bs[1].cls.has('on'), true); is(bs[1].getAttribute('aria-pressed'), 'true');
  const picks = []; const sg = makeSeg(s, (v) => picks.push(v)); is(sg.get(), 'back'); bs[0].fire('click'); is(picks.join(), 'floor');
});
t('lcd(): .sg-lcd > .si-fill + .si-fl + .si-pc; makeFader drives it', () => {
  const c = lcd('drive'); is(c.querySelector('.si-fl').textContent, 'drive'); c.rect = { left: 0, top: 0, width: 60, height: 100 };
  const f = makeFader(c, 0, () => {}); c.fire('pointerdown', { clientY: 40 }); near(f.get(), 0.6); is(c.querySelector('.si-fill').style.height, '60.0%');
});
t('cap(): a type=button keycap with LED, key legend, latch, accent, name', () => {
  const b = cap('tap', { led: true, key: '=', on: true, acc: 'tempo', cls: 'sq' });
  is(b.tagName, 'BUTTON'); is(b.type, 'button'); is(b.className, 'sg-cap sq on'); is(b.children[0].className, 'sg-led');
  is(b.querySelector('kbd').textContent, '='); is(b.textContent, 'tap'); is(b.style.getPropertyValue('--acc'), 'var(--sg-amber)');
  is(cap('', { name: 'lock' }).getAttribute('aria-label'), 'lock');
});
t('ACC names the material tokens; accent() paints --acc', () => { is(ACC.drums, '--sg-drums'); is(ACC.bass, '--sg-bass-lit'); const e = new FakeEl('div'); accent(e, 'reverb'); is(e.style.getPropertyValue('--acc'), 'var(--sg-reverb)'); });

// ── the stub instrument (the view lanes' labs stand on it) ──
t('stub: DEFAULT-shaped state (contract defaults, a drawn FLOOR grid)', () => {
  const st = createStubInstrument().state(); const d = defaultState();
  is(st.bpm, 120); is(st.drums.pattern, 'floor'); is(st.drums.density, 0.5); is(st.drums.sidechain, 0.3); is(st.drums.delay.feedback, 0.35);
  is(st.bass.mode, 'drone'); is(st.keys.voice, 'rhodes'); is(st.keys.fx.reverb, 0.22); is(st.harmony.arp.length, 0.5); is(st.harmony.rack.length, 8);
  is(st.drums.seq.kick.length, 16); is(Object.keys(st.drums.seq).join(), 'kick,snare,hat,openhat,clap,shaker'); is(st.drums.seq.kick.some((v) => v > 0), true);
  is(JSON.stringify(st.harmony), JSON.stringify(d.harmony));
});
t('stub: set / setStep / regenerate mutate and fire onChange; state() is a copy', () => {
  const s = createStubInstrument(); let n = 0; s.onChange(() => n++);
  s.drums.setStep('snare', 2, 3); s.bass.set('mode', 'seq'); s.drums.set('pattern', 'half'); s.drums.regenerate(); s.keys.set('filter', 0.4);
  is(n, 5); is(s.drums.state().seq.snare[2], 0, 'regenerate redraws the grid:'); is(s.bass.state().mode, 'seq'); is(s.keys.state().filter, 0.4);
  const c = s.state(); c.drums.swing = 0.9; is(s.state().drums.swing, 0);
});
t('stub: setHeld feeds held(), onHeldChange and the one chord name', () => {
  const s = createStubInstrument(); const seen = []; s.keys.onHeldChange((h) => seen.push(h.length));
  s.setHeld([60, 64, 67, 71]); is(JSON.stringify(s.keys.held()[0]), '["p60",60]'); is(seen.join(), '4');
  is(JSON.stringify(s.harmony.name(s.keys.held().map(([, m]) => m))), '{"label":"Cmaj7","degree":"I"}');
  is(JSON.stringify(s.harmony.name([60, 64])), '{"label":"","degree":null}');
});
t('stub: the playhead runs only while a part wants the clock', () => {
  const s = createStubInstrument(); is(s.time.running(), false); is(JSON.stringify(s.time.playhead()), '{"bar":0,"step":0,"phase":0}');
  s.drums.set('on', true); is(s.time.running(), true); s.drums.set('on', false); is(s.time.running(), false);
  s.time.want('drums', true); s.stop(); is(s.time.running(), false);
});

for (const f of fails) console.log(f);
console.log(`controls: ${pass}/${total}`);
process.exitCode = pass === total ? 0 : 1;
