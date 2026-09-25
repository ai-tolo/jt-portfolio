// towers.test.mjs — lane V1: mountDrumsView + mountBassView (and filter-curve.ts through them) on V0's stub instrument,
// in node, on a DOM stub. Every gesture must reach the instrument; every state change must reach the paint; a gesture
// repaints even when the instrument's echo never comes; the keyboard is only REFLECTED (a keycap .pressed while its key is
// down: Space · Equal · KeyB), never acted on; dispose leaves no frame, no repaint and no window listener behind.
// R3 (THE FIRST-TIMER ROUND): the drums tower = head (BPM glass · `=` · kit) · cover · grid · pattern · knob row · delay unit
// · texture · footer · the SPACE bar; the bass = `303` etched · tone · mode row (seg · padlock · ROOT screen) · strip · knobs · the rail · the B bar. The hooks are types.ts CTL.
// run: source ~/.nvm/nvm.sh && node src/signal/view/towers.test.mjs   (exit 0 = green; prints `towers: N/N`)

// ── a DOM stub: elements with classes, style, dataset, listeners that bubble, a tiny HTML parser (filter-curve.ts and the
//    padlock icon write markup) and a selector engine (compound classes, tag, [attr], descendant) ──
const VOID = new Set(['br', 'img', 'input', 'hr', 'meta', 'link']);
class TextNode { constructor(s) { this.nodeType = 3; this.parentNode = null; this.textContent = s; } }
class El {
  constructor(tag) {
    this.nodeType = 1; this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null; this.attrs = {};
    this.listeners = {}; this.cls = new Set(); this.dataset = {}; this.tabIndex = 0; this.type = ''; this.rect = null; this.captured = null;
    const props = {};
    const base = { setProperty: (k, v) => { props[k] = String(v); }, getPropertyValue: (k) => props[k] ?? '', removeProperty: (k) => { delete props[k]; } };
    this.style = new Proxy(base, { get: (t, k) => (k in t ? t[k] : props[k] ?? ''), set: (_t, k, v) => { props[k] = String(v); return true; } });
    const cls = this.cls;
    this.classList = {
      add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c),
      toggle: (c, f) => { const on = f === undefined ? !cls.has(c) : !!f; if (on) cls.add(c); else cls.delete(c); return on; },
    };
  }
  set className(v) { this.cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => this.cls.add(c)); }
  get className() { return [...this.cls].join(' '); }
  get textContent() { return this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.children.forEach((c) => { c.parentNode = null; }); this.children = []; if (v !== '') this.appendChild(new TextNode(String(v))); }
  set innerHTML(html) { this.textContent = ''; parseInto(this, String(html)); }
  insertAdjacentHTML(_where, html) { parseInto(this, String(html)); }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
  append(...n) { for (const x of n) this.appendChild(typeof x === 'string' ? new TextNode(x) : x); }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === documentBody; }
  setAttribute(k, v) { if (k === 'class') this.className = v; else if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-(\w)/g, (_m, c) => c.toUpperCase())] = String(v); else this.attrs[k] = String(v); }
  getAttribute(k) { return k === 'class' ? this.className : this.attrs[k] ?? null; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); }
  setPointerCapture(id) { this.captured = id; }
  releasePointerCapture() { this.captured = null; }
  getBoundingClientRect() { const r = this.rect || { left: 0, top: 0, width: 100, height: 100 }; return { ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height }; }
  get elements() { return this.children.filter((c) => c.nodeType === 1); }
  *walk() { for (const c of this.elements) { yield c; yield* c.walk(); } }
  matchesOne(sel) {
    const m = /^([a-z]+)?((?:\.[\w-]+)*)(?:\[([\w-]+)\])?$/.exec(sel);
    if (!m) throw new Error('stub selector: ' + sel);
    if (m[1] && m[1].toUpperCase() !== this.tagName) return false;
    if (m[2] && !m[2].split('.').filter(Boolean).every((c) => this.cls.has(c))) return false;
    if (m[3]) { const a = m[3]; if (a.startsWith('data-')) return this.dataset[a.slice(5)] !== undefined; return this.attrs[a] !== undefined; }
    return true;
  }
  matches(sel) {   // descendant combinator: the last part matches this, the earlier parts an ancestor chain
    const parts = sel.trim().split(/\s+/);
    if (!this.matchesOne(parts[parts.length - 1])) return false;
    let n = this.parentNode, i = parts.length - 2;
    while (i >= 0 && n && n.nodeType === 1) { if (n.matchesOne(parts[i])) i--; n = n.parentNode; }
    return i < 0;
  }
  querySelector(sel) { for (const e of this.walk()) if (e.matches(sel)) return e; return null; }
  querySelectorAll(sel) { return [...this.walk()].filter((e) => e.matches(sel)); }
  // an event that bubbles to the root (stopPropagation honoured); pointer/mouse fields default to a primary press
  fire(type, p = {}) {
    let stopped = false;
    const ev = { type, target: this, bubbles: true, defaultPrevented: false, button: 0, pointerId: 1, shiftKey: false, altKey: false, clientX: 0, clientY: 0, deltaX: 0, deltaY: 0, timeStamp: (clock += 16), ...p,
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() { stopped = true; } };
    for (let n = this; n && !stopped; n = n.parentNode) { ev.currentTarget = n; for (const fn of [...(n.listeners[type] || [])]) fn(ev); }
    return ev;
  }
}
function parseInto(parent, html) {
  const re = /<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g;
  const stack = [parent];
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
    if (m[2]) {
      const e = new El(m[2]);
      for (const a of m[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) e.setAttribute(a[1], a[2] ?? '');
      top.appendChild(e);
      if (!m[4] && !VOID.has(m[2].toLowerCase())) stack.push(e);
      continue;
    }
    if (m[5]) top.appendChild(new TextNode(m[5]));
  }
}
let clock = 1000;
const documentBody = new El('body');
const docL = {};
globalThis.document = {
  createElement: (t) => new El(t), body: documentBody, activeElement: null, visibilityState: 'visible',
  addEventListener(t, fn) { (docL[t] ||= []).push(fn); }, removeEventListener(t, fn) { docL[t] = (docL[t] || []).filter((f) => f !== fn); },
};
// the window the keyboard reflection listens on: a key event is delivered to every listener of its type (capture or not)
const winL = {};
globalThis.window = {
  addEventListener(t, fn) { (winL[t] ||= []).push(fn); }, removeEventListener(t, fn) { winL[t] = (winL[t] || []).filter((f) => f !== fn); },
};
const key = (type, code, p = {}) => { for (const fn of [...(winL[type] || [])]) fn({ type, code, repeat: false, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...p }); };
const winN = (type) => (winL[type] || []).length;
// rAF by hand: pump() runs the frames queued so far (each view re-queues itself once per frame)
let rafQ = new Map(), rafId = 0;
globalThis.requestAnimationFrame = (fn) => { rafQ.set(++rafId, fn); return rafId; };
globalThis.cancelAnimationFrame = (id) => { rafQ.delete(id); };
const pump = (n = 1) => { for (let k = 0; k < n; k++) { const q = rafQ; rafQ = new Map(); clock += 40; q.forEach((fn) => fn(clock)); } };
// the one browser audio object the curve needs: a flat-response OfflineAudioContext that counts itself
const ctxMade = [];
globalThis.OfflineAudioContext = class {
  constructor(...a) { ctxMade.push(a); }
  createBiquadFilter() { return { type: 'lowpass', frequency: { value: 350 }, Q: { value: 1 }, getFrequencyResponse(f, mag, ph) { mag.fill(1); ph.fill(0); } }; }
};

const { mountDrumsView, stepEdit, gainToV, vToGain, GAIN_UNITY, typedBpm, phBeats, DLY_BEATS, DLY_AUDIBLE, CLICK_MS, CLICK_PX } = await import('./drums-view.ts');
const { mountBassView, noteLabel, bassNoteName, foldMidi, bassCell, nudge, BAR_H } = await import('./bass-view.ts');
const { createStubInstrument } = await import('./stub-instrument.ts');
const { BPM_MIN, BPM_MAX, CTL } = await import('../types.ts');

// ── the harness ──
let pass = 0, total = 0; const fails = [];
const t = async (name, fn) => { total++; try { await fn(); pass++; } catch (e) { fails.push(`✗ ${name}: ${e.message}`); } };
const is = (a, b, m = '') => { if (a !== b) throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const near = (a, b, eps = 1e-6, m = '') => { if (!(Math.abs(a - b) <= eps)) throw new Error(`${m} expected ${b}, got ${a}`); };
const yes = (c, m = 'expected true') => { if (!c) throw new Error(m); };
const tick = () => new Promise((r) => setTimeout(r, 0));   // the views repaint on a microtask; let it land
const drag = (host, dy, p = {}) => { host.fire('pointerdown', { clientY: 500, ...p }); host.fire('pointermove', { clientY: 500 - dy, ...p }); host.fire('pointerup', { clientY: 500 - dy, ...p }); };

function mountAll() {
  const inst = createStubInstrument();
  const hits = [], regen = { drums: 0, bass: 0 };
  const h = inst.drums.hit; inst.drums.hit = (l, v) => { hits.push(l); return h(l, v); };
  const rd = inst.drums.regenerate; inst.drums.regenerate = () => { regen.drums++; return rd(); };
  const rb = inst.bass.regenerate; inst.bass.regenerate = () => { regen.bass++; return rb(); };
  const dRoot = new El('div'), bRoot = new El('div');
  documentBody.append(dRoot, bRoot);
  const drums = mountDrumsView(dRoot, inst), bass = mountBassView(bRoot, inst);
  return { inst, hits, regen, dRoot, bRoot, drums, bass, D: dRoot.elements[0], B: bRoot.elements[0] };
}

// ═══ DRUMS ═══
{
  const { inst, hits, regen, dRoot, D, drums: dView, bass: bView } = mountAll();
  const knobAt = (label) => D.querySelectorAll('.si-knob').find((k) => k.querySelector('.si-kl').textContent === label);
  const cell = (li, i) => D.querySelectorAll('.sd-lane')[li].querySelectorAll('.sd-cell')[i];
  const S = () => inst.state();

  await t('drums: one tower in the root, in the drums accent, nine rows in order (the SPACE bar last)', () => {
    is(dRoot.elements.length, 1); yes(D.classList.contains('sg-tower') && D.classList.contains('sd-tower'));
    is(D.style.getPropertyValue('--acc'), 'var(--sg-drums)');
    is(D.elements.map((e) => [...e.cls].find((c) => c.startsWith('sd-'))).join(' '), 'sd-head sd-eqhost sd-grid sd-pat sd-krow sd-delay sd-tex sd-foot sd-pow');
  });
  await t('drums: the head = the BPM glass (drums-bpm) · the `=` keycap · the kit etched; the power is the SPACE bar keycap', () => {
    const pow = D.querySelector('.sd-pow'); is(pow.textContent, 'space'); is(pow.dataset.code, 'Space'); yes(pow.classList.contains('sg-key') && pow.classList.contains('wide'));
    is(D.querySelector('.sd-kit').textContent, 'house kit'); is(D.querySelector('.sgh-tempo').dataset.ctl, 'drums-bpm'); is(D.querySelector('.sd-tap').dataset.code, 'Equal');
  });
  await t('drums: every CTL.drums hook is on the tower, once (types.ts: the surface hooks)', () => {
    is([...D.walk()].filter((e) => e.dataset.ctl).map((e) => e.dataset.ctl).sort().join(' '), [...CTL.drums].sort().join(' '));
  });
  await t('drums: the grid is 6 lanes × 16 cells, the lane words are pads', () => {
    const lanes = D.querySelectorAll('.sd-lane'); is(lanes.length, 6);
    is(lanes.map((l) => l.querySelector('.sd-pad').textContent).join(' '), 'kick snare hat open clap shkr');
    for (const l of lanes) is(l.querySelectorAll('.sd-cell').length, 16);
    is(D.querySelectorAll('.sd-pad').every((p) => p.tagName === 'BUTTON' && p.type === 'button'), true);
  });
  await t('drums: a beat gap before cells 5, 9, 13 only', () => {
    const b = D.querySelectorAll('.sd-lane')[0].querySelectorAll('.sd-cell').map((c, i) => (c.classList.contains('beat') ? i : -1)).filter((i) => i >= 0);
    is(b.join(), '4,8,12');
  });
  await t('drums: the first paint shows the state\'s grid (every tier on every cell)', () => {
    const seq = S().drums.seq;
    ['kick', 'snare', 'hat', 'openhat', 'clap', 'shaker'].forEach((lane, li) => {
      for (let i = 0; i < 16; i++) {
        const c = cell(li, i), v = seq[lane][i];
        is([1, 2, 3].map((k) => c.classList.contains('v' + k)).join(), [1, 2, 3].map((k) => k === v).join(), `${lane}[${i}]`);
      }
    });
  });
  await t('stepEdit: plain = MID, Shift = ACCENT, Alt = GHOST; the held tier clears', () => {
    const P = { shiftKey: false, altKey: false }, SH = { shiftKey: true, altKey: false }, AL = { shiftKey: false, altKey: true };
    is(stepEdit(0, P), 2); is(stepEdit(2, P), 0); is(stepEdit(3, P), 2); is(stepEdit(1, P), 2);
    is(stepEdit(0, SH), 3); is(stepEdit(3, SH), 0); is(stepEdit(2, SH), 3);
    is(stepEdit(0, AL), 1); is(stepEdit(1, AL), 0); is(stepEdit(2, AL), 1);
    is(stepEdit(0, { shiftKey: true, altKey: true }), 3);   // Shift wins (rhythm.ts:194)
  });
  await t('typedBpm: digits only, rounded, clamped to BPM_MIN..BPM_MAX; nothing to commit = null', () => {
    is(typedBpm('128'), 128); is(typedBpm('127.6'), 128); is(typedBpm('127.4'), 127); is(typedBpm(' 96 bpm'), 96);
    is(typedBpm('20'), BPM_MIN); is(typedBpm('0'), BPM_MIN); is(typedBpm('999'), BPM_MAX);
    is(typedBpm(''), null); is(typedBpm('abc'), null); is(typedBpm('.'), null); is(typedBpm('1.2.3'), null);
  });
  await t('the delay lamp\'s clock: DLY_BEATS per TIME division, phBeats = the playhead in heard beats; the pinned thresholds', () => {
    is(JSON.stringify(DLY_BEATS), '{"1/16":0.25,"1/8":0.5,"1/8d":0.75,"1/4":1,"1/2":2}');
    is(phBeats({ bar: 0, step: 0, phase: 0 }), 0); is(phBeats({ bar: 2, step: 6, phase: 0.5 }), 9.625); is(phBeats({ bar: 1, step: 15, phase: 1 }), 8);
    is(DLY_AUDIBLE, 0.01); is(CLICK_MS, 250); is(CLICK_PX, 3);
  });
  await t('drums: a cell press writes the grid through drums.setStep, and the cell repaints', async () => {
    const c = cell(0, 1);
    c.fire('pointerdown'); await tick(); is(S().drums.seq.kick[1], 2); yes(c.classList.contains('v2'), 'v2 painted');
    c.fire('pointerdown', { shiftKey: true }); await tick(); is(S().drums.seq.kick[1], 3); yes(c.classList.contains('v3') && !c.classList.contains('v2'));
    c.fire('pointerdown', { shiftKey: true }); await tick(); is(S().drums.seq.kick[1], 0); yes(![1, 2, 3].some((k) => c.classList.contains('v' + k)));
    c.fire('pointerdown', { altKey: true }); await tick(); is(S().drums.seq.kick[1], 1); yes(c.classList.contains('v1'));
  });
  await t('drums: a right-button press writes nothing', async () => {
    const before = S().drums.seq.snare[2]; cell(1, 2).fire('pointerdown', { button: 2 }); await tick(); is(S().drums.seq.snare[2], before);
  });
  await t('drums: a lane pad auditions its lane (drums.hit) and lights', () => {
    const pads = D.querySelectorAll('.sd-pad'); pads[0].fire('pointerdown'); pads[4].fire('pointerdown');
    is(hits.join(), 'kick,clap'); yes(pads[4].classList.contains('hit'));
  });
  await t('drums: the SPACE bar toggles drums.on; the paint latches it (.on + aria-pressed), lights it (.lit) + the tower', async () => {
    const pow = D.querySelector('.sd-pow');
    pow.fire('click'); await tick(); is(S().drums.on, true); yes(pow.classList.contains('on') && pow.classList.contains('lit') && D.classList.contains('is-on')); is(pow.getAttribute('aria-pressed'), 'true');
    pow.fire('click'); await tick(); is(S().drums.on, false); yes(!pow.classList.contains('on') && !pow.classList.contains('lit') && !D.classList.contains('is-on')); is(pow.getAttribute('aria-pressed'), 'false');
  });
  await t('drums: the pattern seg picks + regenerates; the grid repaints', async () => {
    const caps = D.querySelectorAll('.sd-pat button'); is(caps.map((c) => c.textContent).join(' '), 'floor back half break');
    const n0 = regen.drums; caps[3].fire('click'); await tick();
    is(S().drums.pattern, 'break'); is(regen.drums, n0 + 1); yes(caps[3].classList.contains('on') && !caps[0].classList.contains('on'));
    const hat = S().drums.seq.hat; for (let i = 0; i < 16; i++) is(cell(2, i).classList.contains('v2'), hat[i] === 2, `hat[${i}]`);
  });
  await t('drums: SWING drag up 40 px = .25 (160 px a swing); dbl-click resets to 0', async () => {
    const k = knobAt('swing'); drag(k, 40); await tick(); near(S().drums.swing, 0.25); is(k.querySelector('.si-dial').style.getPropertyValue('--v'), '0.250');
    k.fire('dblclick'); await tick(); is(S().drums.swing, 0);
  });
  await t('drums: DENSITY writes density AND regenerates; dbl-click resets to .5', async () => {
    const k = knobAt('density'), n0 = regen.drums; drag(k, -16); await tick(); near(S().drums.density, 0.4); yes(regen.drums > n0);
    k.fire('dblclick'); await tick(); near(S().drums.density, 0.5);
  });
  await t('drums: TEXTURE knob → textureAmt; the TAPE/DRIVE seg → texture', async () => {
    drag(knobAt('texture'), 32); await tick(); near(S().drums.textureAmt, 0.2);
    D.querySelectorAll('.sd-texseg button')[1].fire('click'); await tick(); is(S().drums.texture, 'drive');
  });
  await t('drums: SIDECHAIN drag, dbl-click resets to .3', async () => {
    const k = knobAt('sidechain'); drag(k, 80); await tick(); near(S().drums.sidechain, 0.8); k.fire('dblclick'); await tick(); near(S().drums.sidechain, 0.3);
  });
  await t('drums: the DELAY unit writes delay {mix, feedback, time} and keeps the rest; FB + TIME are .dormant while MIX < .01', async () => {
    const dz = () => ['fb', 'time'].map((l) => knobAt(l).classList.contains('dormant')).join(), dz0 = dz();
    drag(knobAt('mix'), 48); await tick(); near(S().drums.delay.mix, 0.3); is(S().drums.delay.time, '1/8'); near(S().drums.delay.feedback, 0.35);
    is(dz0, 'true,true', 'MIX 0:'); is(dz(), 'false,false', 'MIX .3:');
    drag(knobAt('fb'), 16); await tick(); near(S().drums.delay.feedback, 0.45); near(S().drums.delay.mix, 0.3);
  });
  await t('drums: TIME is a 5-step switch 1/16 1/8 1/8· 1/4 1/2 with the amber chip', async () => {
    const k = knobAt('time'); const chip = k.querySelector('.sg-chip');
    is(k.querySelectorAll('.si-stick').length, 5); yes(k.classList.contains('si-stepped'));
    is(chip.textContent, '1/8');
    drag(k, 40); await tick(); is(S().drums.delay.time, '1/8d'); is(chip.textContent, '1/8·');
    drag(k, 40); await tick(); is(S().drums.delay.time, '1/4');
    drag(k, 200); await tick(); is(S().drums.delay.time, '1/2'); is(chip.textContent, '1/2');
    drag(k, -400); await tick(); is(S().drums.delay.time, '1/16');
    near(S().drums.delay.mix, 0.3);
    k.fire('dblclick'); await tick(); is(S().drums.delay.time, '1/16', 'no reset on the stepped switch (as the Studio)');
  });
  await t('drums: the gain trim = 1.25·v, the unity detent + reset at .8', async () => {
    is(gainToV(1), 0.8); near(vToGain(GAIN_UNITY), 1); near(gainToV(1.25), 1);
    const k = D.querySelector('.sd-foot .si-knob');
    const tk = k.querySelector('.si-tick');
    is(k.querySelector('.si-dial').style.getPropertyValue('--v'), '0.800'); yes(!tk.classList.contains('hot'), 'the unity tick is engraved (unlit) at rest');
    k.fire('pointerdown', { clientY: 500 }); k.fire('pointermove', { clientY: 497 }); yes(tk.classList.contains('hot'), 'it glints while the hand holds the detent');
    k.fire('pointerup', {}); yes(!tk.classList.contains('hot'), 'and goes dark on release');
    drag(k, -32); await tick(); near(S().drums.gain, 1.25 * 0.6); yes(!tk.classList.contains('hot'));
    k.fire('dblclick'); await tick(); near(S().drums.gain, 1);
    drag(k, 3); await tick(); near(S().drums.gain, 1, 1e-9, 'held in the ±6 px detent');
  });
  await t('drums: M mutes; S solos drums, again un-solos; another solo dims the tower', async () => {
    const [m, s] = D.querySelectorAll('.sd-foot .sg-cap');
    yes(m.classList.contains('warn') && m.classList.contains('sq') && s.classList.contains('sq'));
    m.fire('click'); await tick(); is(S().drums.mute, true); yes(m.classList.contains('on'));
    m.fire('click'); await tick(); is(S().drums.mute, false);
    s.fire('click'); await tick(); is(S().solo, 'drums'); yes(s.classList.contains('on') && !D.classList.contains('solo-dim'));
    s.fire('click'); await tick(); is(S().solo, null); yes(!s.classList.contains('on'));
    inst.setSolo('keys'); await tick(); yes(D.classList.contains('solo-dim')); inst.setSolo(null); await tick(); yes(!D.classList.contains('solo-dim'));
  });
  await t('drums: a state loaded from outside repaints every control', async () => {
    const d = S().drums;
    inst.load({ drums: { ...d, swing: 0.7, density: 0.2, textureAmt: 0.9, sidechain: 0.05, texture: 'tape', pattern: 'half', delay: { mix: 0.5, time: '1/2', feedback: 0.6 }, gain: 0.5, mute: true } });
    await tick();
    is(knobAt('swing').querySelector('.si-dial').style.getPropertyValue('--v'), '0.700');
    is(knobAt('density').querySelector('.si-dial').style.getPropertyValue('--v'), '0.200');
    is(knobAt('texture').querySelector('.si-dial').style.getPropertyValue('--v'), '0.900');
    is(knobAt('sidechain').querySelector('.si-dial').style.getPropertyValue('--v'), '0.050');
    is(knobAt('mix').querySelector('.si-dial').style.getPropertyValue('--v'), '0.500');
    is(knobAt('fb').querySelector('.si-dial').style.getPropertyValue('--v'), '0.600');
    is(knobAt('time').querySelector('.sg-chip').textContent, '1/2');
    is(D.querySelector('.sd-foot .si-knob .si-dial').style.getPropertyValue('--v'), '0.400');
    yes(D.querySelectorAll('.sd-pat button')[2].classList.contains('on')); yes(D.querySelectorAll('.sd-texseg button')[0].classList.contains('on'));
    yes(D.querySelectorAll('.sd-foot .sg-cap')[0].classList.contains('on'));
  });
  // ── the cover glass (filter-curve.ts verbatim, through the view) ──
  const glassD = D.querySelector('.sd-eqhost .si-fcurve');
  glassD.rect = { left: 0, top: 0, width: 268, height: 58 };
  await t('cover glass: the Studio\'s DOM (svg grid + fill + path, ① hollow + ② nodes), inked in the drums accent', () => {
    yes(glassD.classList.contains('si-screen') && glassD.classList.contains('si-glass-tint')); is(glassD.style.getPropertyValue('--fc'), 'var(--sg-drums)');
    is(glassD.querySelectorAll('.si-afgrid line').length, 4); yes(!!glassD.querySelector('.si-affill') && !!glassD.querySelector('.si-afpath'));
    yes(!!glassD.querySelector('.si-fn-hp') && !!glassD.querySelector('.si-fn-lp'));
  });
  await t('cover glass: parked open, the nodes sit at the edges on the 0 dB line', () => {
    const hp = glassD.querySelector('.si-fn-hp'), lp = glassD.querySelector('.si-fn-lp');
    is(hp.style.left, '2.5%'); is(lp.style.left, '97.5%'); is(hp.style.top, '37.5%'); is(lp.style.top, '37.5%');
  });
  await t('cover glass: drag ② → cover (x) + coverDb (48 dB per glass height); the curve redraws; the ghost reads it', async () => {
    const lp = glassD.querySelector('.si-fn-lp'), path = glassD.querySelector('.si-afpath');
    lp.fire('pointerdown', { clientX: 100, clientY: 100 });
    lp.fire('pointermove', { clientX: 100 - 67, clientY: 100 - 14.5 });
    lp.fire('pointerup', { clientX: 100 - 67, clientY: 100 - 14.5 });
    await tick();
    near(S().drums.cover, 0.75, 1e-9); near(S().drums.coverDb, 12, 1e-9);
    is(lp.style.left, '75.0%'); is(lp.style.top, `${(((18 - 12) / 48) * 100).toFixed(1)}%`);
    yes(path.getAttribute('d').startsWith('M0.0 ') && path.getAttribute('d').split('L').length === 129, 'a 129-point path');
    is(D.querySelector('.sd-eqhost .si-ghost').textContent, 'COVER 3.6k +12 dB');
  });
  await t('cover glass: dbl-tap ② resets it open and flat', async () => {
    const lp = glassD.querySelector('.si-fn-lp');
    lp.fire('pointerdown', { clientX: 10, clientY: 10, timeStamp: 50000 }); lp.fire('pointerup', { timeStamp: 50010 });
    lp.fire('pointerdown', { clientX: 10, clientY: 10, timeStamp: 50100 });
    await tick(); is(S().drums.cover, 1); is(S().drums.coverDb, 0);
  });
  await t('cover glass: drag ① → lowcut + lowcutDb (clamped to −24)', async () => {
    const hp = glassD.querySelector('.si-fn-hp');
    hp.fire('pointerdown', { clientX: 0, clientY: 0 }); hp.fire('pointermove', { clientX: 53.6, clientY: 58 }); hp.fire('pointerup', { clientX: 53.6, clientY: 58 });
    await tick(); near(S().drums.lowcut, 0.2, 1e-9); is(S().drums.lowcutDb, -24);
  });
  await t('cover glass: a state from outside moves the nodes', async () => {
    inst.load({ drums: { ...S().drums, lowcut: 0.3, lowcutDb: 6, cover: 0.6, coverDb: -6 } }); await tick();
    is(glassD.querySelector('.si-fn-hp').style.left, '30.0%'); is(glassD.querySelector('.si-fn-lp').style.left, '60.0%');
    is(glassD.querySelector('.si-fn-hp').style.top, '25.0%'); is(glassD.querySelector('.si-fn-lp').style.top, '50.0%');
  });
  // ── the playhead ──
  await t('drums: the playhead column follows time.playhead() while drums.on and the clock runs', async () => {
    let step = 5; inst.time.playhead = () => ({ bar: 3, step, phase: 0 });
    pump(); is(D.querySelectorAll('.sd-cell.ph').length, 0, 'drums off: no column');
    inst.drums.set('on', true); await tick(); pump();
    const col = () => D.querySelectorAll('.sd-cell.ph').map((c) => c.parentNode.elements.indexOf(c) - 1);
    is(col().join(), '5,5,5,5,5,5');
    step = 6; pump(); is(col().join(), '6,6,6,6,6,6');
    inst.drums.set('on', false); await tick(); pump(); is(col().length, 0);
  });
  await t('drums: the SPACE bar carries its key (data-code Space) and is .pressed while Space is down; `=` flashes the tap keycap (display only)', async () => {
    const pow = D.querySelector('.sd-pow'); is(pow.dataset.code, 'Space');
    const on0 = S().drums.on;
    key('keydown', 'Space'); yes(pow.classList.contains('pressed'), 'down');
    key('keydown', 'Space', { repeat: true }); yes(pow.classList.contains('pressed'), 'a repeat is the same finger');
    key('keyup', 'Space'); yes(!pow.classList.contains('pressed'), 'up');
    await tick(); is(S().drums.on, on0, 'the reflection never acts (the keymap does)');
    key('keydown', 'Space', { metaKey: true }); yes(!pow.classList.contains('pressed'), '⌘ is not the page\'s');
    key('keyup', 'Space');
    document.activeElement = { tagName: 'INPUT' }; key('keydown', 'Space'); yes(!pow.classList.contains('pressed'), 'typing is not the page\'s');
    document.activeElement = null; key('keyup', 'Space');
    key('keydown', 'KeyA'); yes(!pow.classList.contains('pressed'), 'another key');
    key('keydown', 'Space'); key('blur', ''); yes(!pow.classList.contains('pressed'), 'a lost window lets go');
    key('keydown', 'Space'); document.visibilityState = 'hidden'; (docL.visibilitychange || []).forEach((fn) => fn({}));
    yes(!pow.classList.contains('pressed'), 'a hidden tab lets go'); document.visibilityState = 'visible'; key('keyup', 'Space');
    const tap = D.querySelector('.sd-tap');
    key('keydown', 'Equal'); yes(tap.classList.contains('pressed') && tap.classList.contains('lit'), '= down: pressed + the tap flash');
    key('keyup', 'Equal'); yes(!tap.classList.contains('pressed'), '= up');
  });
  await t('drums: dispose removes the tower, stops the frames and the repaint', async () => {
    const queued = rafQ.size;                    // the drums frame + the bass frame
    dView.dispose(); is(dRoot.elements.length, 0);
    is(rafQ.size, queued - 1, 'the drums frame is cancelled'); pump(); is(rafQ.size, queued - 1, 'and never re-queues');
    const cls = D.querySelector('.sd-pow').className;
    inst.drums.set('on', true); await tick(); is(D.querySelector('.sd-pow').className, cls, 'no repaint after dispose');
    key('keydown', 'Space'); is(D.querySelector('.sd-pow').classList.contains('pressed'), false, 'no key listener after dispose');
    key('keyup', 'Space');
  });
  bView.dispose();
}

// ═══ BASS ═══
{
  const { inst, regen, bRoot, B, drums: dView, bass: bView } = mountAll();
  dView.dispose();
  const knobAt = (label) => B.querySelectorAll('.si-knob').find((k) => k.querySelector('.si-kl').textContent === label);
  const bars = () => B.querySelectorAll('.sb-bar');
  const S = () => inst.state();

  await t('bass: one tower in the bass accent, seven rows in order (the B bar last); the head = the 303 engraving alone', () => {
    is(bRoot.elements.length, 1); is(B.style.getPropertyValue('--acc'), 'var(--sg-bass-lit)');
    is(B.elements.map((e) => [...e.cls].find((c) => c.startsWith('sb-'))).join(' '), 'sb-head sb-eqhost sb-mode sb-bars sb-knobs sb-foot sb-pow');
    const head = B.querySelector('.sb-head'); is(head.elements.length, 1, 'one thing in the head');
    const v = head.elements[0]; yes(v.classList.contains('sg-etch') && v.classList.contains('sb-voice'), 'the engraving'); is(v.textContent, '303');
    is(B.querySelector('.sb-head .sg-key'), null, 'no key up here'); is(B.querySelector('.sb-head .sg-screen'), null, 'no screen up here');
  });
  await t('bass: the B bar = one wide keycap at the foot, right under the rail (KeyB, `B`, the bass tint, bass-power)', () => {
    const pow = B.elements[B.elements.length - 1];
    yes(pow.classList.contains('sb-pow') && pow.classList.contains('sg-key') && pow.classList.contains('wide') && pow.classList.contains('tint'), '.sb-pow.sg-key.wide.tint');
    yes(!pow.classList.contains('lg'), 'a bar, not the R3 head key');
    is(pow.tagName, 'BUTTON'); is(pow.type, 'button'); is(pow.textContent, 'B'); is(pow.dataset.code, 'KeyB'); is(pow.dataset.ctl, 'bass-power');
    is(pow.getAttribute('aria-label'), 'Bass on/off'); is(pow.style.getPropertyValue('--acc'), 'var(--sg-bass-lit)');
    yes(B.elements[B.elements.length - 2] === B.querySelector('.sb-foot'), 'the rail (M · S · GAIN) sits directly above the bar');
    is(B.querySelectorAll('.sg-key').length, 1, 'one keycap on the tower');
    yes(!pow.classList.contains('lit') && !pow.classList.contains('pressed'), 'at rest: off, up');
  });
  await t('bass: the ROOT screen lives in the mode row, right beside the padlock (seg · padlock · screen), numeral over `root`', () => {
    const row = B.querySelector('.sb-mode');
    is(row.elements.map((e) => [...e.cls].find((c) => c.startsWith('sb-'))).join(' '), 'sb-modes sb-pin sb-note');
    const note = row.querySelector('.sb-note'); yes(note.classList.contains('sg-screen') && note.classList.contains('sg-glass'), 'a glass screen');
    is(note.dataset.ctl, 'bass-root'); is(note.querySelector('b').textContent, 'C1'); is(note.querySelector('small').textContent, 'root');
    is(note.style.getPropertyValue('--acc'), 'var(--sg-amber)'); yes(!note.classList.contains('lit') && !note.classList.contains('glow'), 'dim while it follows');
  });
  await t('bass: every CTL.bass hook is on the tower, once (types.ts: the surface hooks)', () => {
    is([...B.walk()].filter((e) => e.dataset.ctl).map((e) => e.dataset.ctl).sort().join(' '), [...CTL.bass].sort().join(' '));
  });
  await t('bass: sixteen bars, a downbeat tick on 1 5 9 13', () => { is(bars().length, 16); is(bars().map((b, i) => (b.classList.contains('dn') ? i : -1)).filter((i) => i >= 0).join(), '0,4,8,12'); });
  await t('bass: the first paint = the state\'s strip (height by tier)', () => {
    const seq = S().bass.seq; bars().forEach((b, i) => { is(b.querySelector('.sb-bv').style.height, BAR_H[seq[i].v], `bar ${i}`); is(b.classList.contains('on'), seq[i].v > 0); });
  });
  await t('bass: the strip is idle + dormant (dim, no pointer) unless the mode is SEQ', async () => {
    yes(B.querySelector('.sb-bars').classList.contains('idle')); yes(B.querySelector('.sb-bars').classList.contains('dormant'));
    const caps = B.querySelectorAll('.sb-modes button'); is(caps.map((c) => c.textContent).join(' '), 'drone pluck seq');
    caps[2].fire('click'); await tick(); is(S().bass.mode, 'seq'); yes(!B.querySelector('.sb-bars').classList.contains('idle')); yes(!B.querySelector('.sb-bars').classList.contains('dormant')); yes(caps[2].classList.contains('on'));
    caps[1].fire('click'); await tick(); is(S().bass.mode, 'pluck'); yes(B.querySelector('.sb-bars').classList.contains('idle')); yes(B.querySelector('.sb-bars').classList.contains('dormant'));
    caps[2].fire('click'); await tick();
  });
  await t('nudge: 0→1→2→3→0, keeping oct + slide', () => {
    is(JSON.stringify(nudge({ v: 0, oct: 'sub', slide: true })), '{"v":1,"oct":"sub","slide":true}');
    is(nudge({ v: 3, oct: 'base', slide: false }).v, 0); is(nudge({ v: 3, oct: 'sub', slide: true }).oct, 'sub'); is(nudge(undefined).v, 1);
  });
  await t('bass: a bar press cycles its velocity through bass.setStep; the height repaints', async () => {
    const b = bars()[3]; const v0 = S().bass.seq[3].v;
    for (let k = 1; k <= 4; k++) {
      b.fire('pointerdown'); await tick();
      is(S().bass.seq[3].v, (v0 + k) % 4); is(b.querySelector('.sb-bv').style.height, BAR_H[(v0 + k) % 4]);
    }
  });
  await t('bass: a sub cell draws its mark, a slide its chevron (only when it sounds)', async () => {
    inst.bass.setStep(6, { v: 2, oct: 'sub', slide: true }); inst.bass.setStep(7, { v: 0, oct: 'sub', slide: true }); await tick();
    yes(bars()[6].classList.contains('sub') && bars()[6].classList.contains('slide'));
    yes(!bars()[7].classList.contains('sub') && !bars()[7].classList.contains('slide'));
  });
  await t('bass: DENSITY + GROOVE write and regenerate the strip', async () => {
    const n0 = regen.bass;
    drag(knobAt('density'), 40); await tick(); near(S().bass.density, 0.75); is(regen.bass, n0 + 1);
    drag(knobAt('groove'), -16); await tick(); near(S().bass.groove, 0.2); is(regen.bass, n0 + 2);
    const seq = S().bass.seq; bars().forEach((b, i) => is(b.querySelector('.sb-bv').style.height, BAR_H[seq[i].v]));
  });
  await t('bass: INTENSITY = heat, SUB = weight, GLIDE = glide (the ghost prints τ)', async () => {
    drag(knobAt('intensity'), 16); await tick(); near(S().bass.heat, 0.6);
    drag(knobAt('sub'), -40); await tick(); near(S().bass.weight, 0.25);
    const g = knobAt('glide'); drag(g, 80); await tick(); near(S().bass.glide, 0.5);
    is(g.querySelector('.si-ghost').textContent, `GLIDE ${Math.round((0.008 + 0.5 * 0.292) * 1000)}MS`);
    g.fire('dblclick'); await tick(); is(S().bass.glide, 0);
    knobAt('intensity').fire('dblclick'); await tick(); near(S().bass.heat, 0.5);
  });
  await t('noteLabel / bassNoteName: the Studio\'s octave (MIDI 36 = C1), folded to 45..115 Hz as it sounds', () => {
    is(noteLabel(36), 'C1'); is(noteLabel(60), 'C3'); is(noteLabel(61), 'C#3');
    is(foldMidi(60), 36); is(foldMidi(72), 36); is(foldMidi(48), 36); is(foldMidi(64), 40); is(foldMidi(57), 45); is(foldMidi(45), 33);
    is(bassNoteName(60), 'C1'); is(bassNoteName(64), 'E1'); is(bassNoteName(69), 'A1'); is(bassNoteName(45), 'A0'); is(bassNoteName(61), 'C♯1');
  });
  await t('bass: the padlock arms (pulses), an onset pins (lit + the ROOT screen beside it lit + glowing), a press unpins + disarms', async () => {
    const pin = B.querySelector('.sb-pin'), note = B.querySelector('.sb-note');
    yes(!!pin.querySelector('svg rect') && !!pin.querySelector('svg path') && !!pin.querySelector('.sg-led')); is(pin.getAttribute('aria-label'), 'root lock');
    pin.fire('click'); await tick(); is(S().bass.armed, true); yes(pin.classList.contains('on') && pin.classList.contains('arm')); yes(!note.classList.contains('lit'));
    inst.setHeld([64, 67]); await tick(); is(S().bass.root, 64); is(S().bass.armed, false);
    yes(pin.classList.contains('on') && !pin.classList.contains('arm')); is(note.querySelector('b').textContent, 'E1'); yes(note.classList.contains('lit') && note.classList.contains('glow'));
    pin.fire('click'); await tick(); is(S().bass.root, null); is(S().bass.armed, false); yes(!pin.classList.contains('on')); yes(!note.classList.contains('lit') && !note.classList.contains('glow'));
    pin.fire('click'); await tick(); is(S().bass.armed, true); pin.fire('click'); await tick(); is(S().bass.armed, false); is(S().bass.root, null);
  });
  await t('bass: unpinned, the ROOT screen follows the lowest held key, and stays on it after the release', async () => {
    const note = B.querySelector('.sb-note');
    inst.setHeld([67, 55, 71]); pump(); is(note.querySelector('b').textContent, 'G1');
    inst.setHeld([]); pump(); pump(); is(note.querySelector('b').textContent, 'G1'); yes(!note.classList.contains('lit'));
  });
  await t('bassCell: one cell per 8th across two bars', () => {
    is(bassCell(0, 0), 0); is(bassCell(0, 1), 0); is(bassCell(0, 2), 1); is(bassCell(0, 15), 7); is(bassCell(1, 0), 8); is(bassCell(1, 15), 15); is(bassCell(2, 0), 0); is(bassCell(7, 6), 11);
  });
  await t('bass: the playhead walks the strip at the bass\'s rate while it plays SEQ on a running clock', async () => {
    let p = { bar: 1, step: 6, phase: 0 }; inst.time.playhead = () => p;
    const at = () => bars().map((b, i) => (b.classList.contains('ph') ? i : -1)).filter((i) => i >= 0).join();
    pump(); is(at(), '', 'off: none');
    inst.bass.set('on', true); await tick(); pump(); is(at(), '11');
    p = { bar: 1, step: 8, phase: 0 }; pump(); is(at(), '12');
    inst.bass.set('mode', 'drone'); await tick(); pump(); is(at(), '', 'drone: none');
    inst.bass.set('mode', 'seq'); await tick(); pump(); is(at(), '12');
    inst.bass.set('on', false); await tick(); pump(); is(at(), '');
  });
  await t('bass: B presses the B bar (data-code; display only, released on keyup); the padlock has no key (N left the keymap)', async () => {
    const pow = B.querySelector('.sb-pow'), pin = B.querySelector('.sb-pin');
    is(pow.dataset.code, 'KeyB'); is(pin.dataset.code, undefined);
    const b0 = JSON.stringify(S().bass);
    key('keydown', 'KeyB'); yes(pow.classList.contains('pressed'));
    key('keydown', 'KeyN'); yes(!pin.classList.contains('pressed'));
    key('keyup', 'KeyB'); yes(!pow.classList.contains('pressed'));
    key('keyup', 'KeyN');
    await tick(); is(JSON.stringify(S().bass), b0, 'the reflection never acts');
  });
  await t('bass: the B bar toggles bass.on, lights (.lit + aria-pressed) and lights the tower', async () => {
    const pow = B.querySelector('.sb-pow'); pow.fire('click'); await tick(); is(S().bass.on, true); yes(pow.classList.contains('lit') && B.classList.contains('is-on')); is(pow.getAttribute('aria-pressed'), 'true');
    pow.fire('click'); await tick(); is(S().bass.on, false); yes(!pow.classList.contains('lit') && !B.classList.contains('is-on'));
  });
  await t('bass: M, S, the gain trim', async () => {
    const [m, s] = B.querySelectorAll('.sb-foot .sg-cap');
    m.fire('click'); await tick(); is(S().bass.mute, true); yes(m.classList.contains('on'));
    s.fire('click'); await tick(); is(S().solo, 'bass'); s.fire('click'); await tick(); is(S().solo, null);
    inst.setSolo('drums'); await tick(); yes(B.classList.contains('solo-dim')); inst.setSolo(null); await tick(); yes(!B.classList.contains('solo-dim'));
    const k = B.querySelector('.sb-foot .si-knob'); drag(k, 32); await tick(); near(S().bass.gain, 1.25); k.fire('dblclick'); await tick(); near(S().bass.gain, 1);
  });
  await t('tone glass: ② → cut + cutDb, ① → lowcut + lowcutDb (bass accent)', async () => {
    const g = B.querySelector('.sb-eqhost .si-fcurve'); g.rect = { left: 0, top: 0, width: 268, height: 58 };
    is(g.style.getPropertyValue('--fc'), 'var(--sg-bass-lit)');
    const lp = g.querySelector('.si-fn-lp'), hp = g.querySelector('.si-fn-hp');
    lp.fire('pointerdown', { clientX: 200, clientY: 30 }); lp.fire('pointermove', { clientX: 200 - 134, clientY: 30 - 7.25 }); lp.fire('pointerup', {}); await tick();
    near(S().bass.cut, 0.5, 1e-9); near(S().bass.cutDb, 6, 1e-9); is(B.querySelector('.sb-eqhost .si-ghost').textContent, 'TONE 632Hz +6 dB');
    hp.fire('pointerdown', { clientX: 0, clientY: 0 }); hp.fire('pointermove', { clientX: 26.8, clientY: 0 }); hp.fire('pointerup', {}); await tick();
    near(S().bass.lowcut, 0.1, 1e-9); is(S().bass.lowcutDb, 0);
  });
  await t('one OfflineAudioContext(1, 128, 48000) served every curve on the page', () => { is(ctxMade.length, 1); is(JSON.stringify(ctxMade[0]), '[1,128,48000]'); });
  await t('bass: dispose removes the tower and every window listener', () => {
    bView.dispose(); is(bRoot.elements.length, 0);
    is(winN('keydown') + winN('keyup') + winN('blur') + (docL.visibilitychange || []).length, 0, 'nothing left listening');
  });
}

// ═══ A GESTURE REPAINTS EVEN WHEN THE INSTRUMENT'S ECHO IS LATE (an onChange that never fires) ═══
{
  const inst = createStubInstrument();
  inst.onChange = () => () => {};                 // an instrument that never calls back
  const dRoot = new El('div'), bRoot = new El('div');
  documentBody.append(dRoot, bRoot);
  const dv = mountDrumsView(dRoot, inst), bv = mountBassView(bRoot, inst);
  const D = dRoot.elements[0], B = bRoot.elements[0];
  await t('echo-less: the SPACE bar, a grid cell, the B keycap and a mode cap still paint what the hand did', async () => {
    D.querySelector('.sd-pow').fire('click'); await tick(); yes(D.querySelector('.sd-pow').classList.contains('on'));
    const c = D.querySelectorAll('.sd-lane')[5].querySelectorAll('.sd-cell')[3]; const v0 = inst.state().drums.seq.shaker[3];
    c.fire('pointerdown'); await tick(); is(c.classList.contains('v2'), v0 !== 2);
    B.querySelector('.sb-pow').fire('click'); await tick(); yes(B.querySelector('.sb-pow').classList.contains('lit'));
    B.querySelectorAll('.sb-modes button')[2].fire('click'); await tick(); yes(!B.querySelector('.sb-bars').classList.contains('idle'));
    B.querySelector('.sb-pin').fire('click'); await tick(); yes(B.querySelector('.sb-pin').classList.contains('arm'));
  });
  dv.dispose(); bv.dispose();
}

for (const f of fails) console.log(f);
console.log(`towers: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
