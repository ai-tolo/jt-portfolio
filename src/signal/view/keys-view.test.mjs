// keys-view.test.mjs — lane V2: mountKeysView on V0's stub instrument, in node, on a DOM stub. The glass's maths (the 24 dB/oct
// Butterworth drawn from its two biquads, the bypass, the MOTION ghost's range), every gesture → the instrument, every state
// change → the paint. No audio, no browser (the look is verified by headless screenshots, NOTES-SIGNAL-R1 §2 V2).
// run: source ~/.nvm/nvm.sh && node src/signal/view/keys-view.test.mjs   (exit 0 = green; prints `keys-view: N/N`)
import { readFileSync } from 'node:fs';

// ── a DOM stub (V0's controls.test.mjs pattern + parentNode, remove, createElementNS, hidden, attribute selectors) ──
class FakeEl {
  constructor(tag, ns = null) {
    this.tagName = tag.toUpperCase(); this.ns = ns; this.cls = new Set(); this.children = []; this.listeners = {}; this.attrs = {};
    this.dataset = {}; this.textContent = ''; this.innerHTML = ''; this.captured = null; this.parentNode = null; this.hidden = false;
    this.rect = { left: 0, top: 0, width: 100, height: 100 }; this.offsetWidth = 0;
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
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); this.children.push(c); c.parentNode = this; return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  append(...n) { for (const x of n) { if (typeof x === 'string') this.textContent += x; else this.appendChild(x); } }
  insertAdjacentHTML(_w, html) { this.innerHTML += html; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = v; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  fire(type, p = {}) {
    const ev = { type, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, pointerId: 7, button: 0, shiftKey: false, clientX: 0, clientY: 0, deltaX: 0, deltaY: 0, timeStamp: 1000, ...p };
    (this.listeners[type] || []).forEach((fn) => fn(ev));
    return ev;
  }
  setPointerCapture(id) { this.captured = id; }
  getBoundingClientRect() { const r = this.rect; return { ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height }; }
  *walk() { for (const c of this.children) { yield c; yield* c.walk(); } }
  matches(sel) {
    const m = /^([a-z]+)?((?:\.[\w-]+)*)(?:\[data-([\w-]+)(?:="([^"]*)")?\])?$/.exec(sel);
    if (!m) throw new Error('stub selector: ' + sel);
    if (m[1] && m[1].toUpperCase() !== this.tagName) return false;
    if (m[2] && !m[2].split('.').filter(Boolean).every((c) => this.cls.has(c))) return false;
    if (m[3] && this.dataset[m[3]] === undefined) return false;
    return m[4] === undefined || this.dataset[m[3]] === m[4];
  }
  querySelector(sel) { for (const e of this.walk()) if (e.matches(sel)) return e; return null; }
  querySelectorAll(sel) { return [...this.walk()].filter((e) => e.matches(sel)); }
}
globalThis.document = { createElement: (t) => new FakeEl(t), createElementNS: (ns, t) => new FakeEl(t, ns) };
let rafQ = new Map(), rafId = 0;
globalThis.requestAnimationFrame = (fn) => { const id = ++rafId; rafQ.set(id, fn); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQ.delete(id); };
const flushRaf = (n = 1) => { for (let k = 0; k < n; k++) { const q = rafQ; rafQ = new Map(); q.forEach((fn) => fn(performance.now())); } };

const V = await import('./keys-view.ts');
const { createStubInstrument } = await import('./stub-instrument.ts');
const { FILTER_OPEN, LFO_DIVS, VOICES } = await import('../types.ts');

// ── the harness ──
let pass = 0, total = 0; const fails = [];
const t = async (name, fn) => { total++; try { await fn(); pass++; } catch (e) { fails.push(`✗ ${name}: ${e.message}`); } };
const near = (a, b, eps = 1e-9, msg = '') => { if (!(Math.abs(a - b) <= eps)) throw new Error(`${msg} expected ${b} ±${eps}, got ${a}`); };
const is = (a, b, msg = '') => { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (c, msg = 'assertion') => { if (!c) throw new Error(msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tick = () => new Promise((r) => setTimeout(r, 0));   // the view paints on a microtask after onChange

// ════════ the maths ════════
await t('Butterworth Qs are the 4th-order pole pair (0.5412, 1.3066)', () => { near(V.BUTTER_Q[0], 0.5411961, 1e-6); near(V.BUTTER_Q[1], 1.3065630, 1e-6); });
await t('pToHz: 40 Hz at 0, 20 kHz at 1, √(40·20000) at .5; NaN reads open', () => { near(V.pToHz(0), 40, 1e-9); near(V.pToHz(1), 20000, 1e-6); near(V.pToHz(0.5), Math.sqrt(40 * 20000), 1e-6); near(V.pToHz(NaN), 20000, 1e-6); near(V.pToHz(2), 20000, 1e-6); });
await t('hzToX inverts pToHz (the corner sits at x = p)', () => { for (const p of [0, 0.13, 0.5, 0.87, 1]) near(V.hzToX(V.pToHz(p)), p, 1e-12); });
await t('butterDb: −3.01 dB AT the corner (200 Hz · 1 kHz · 5 kHz · 15 kHz)', () => { for (const fc of [200, 1000, 5000, 15000]) near(V.butterDb(fc, fc), -3.0103, 0.002, `fc ${fc}:`); });
await t('butterDb: flat a decade below the corner (|dB| < 0.001)', () => { for (const fc of [400, 2000, 8000]) near(V.butterDb(fc / 10, fc), 0, 0.001, `fc ${fc}:`); });
await t('butterDb: −24 dB an octave above a 1 kHz corner (the 4th-order slope)', () => near(V.butterDb(2000, 1000), -24.1, 0.2));
await t('butterDb: maximally flat — never above 0 dB anywhere under the corner', () => { for (let f = 20; f < 1000; f *= 1.07) ok(V.butterDb(f, 1000) <= 1e-9, `${f} Hz = ${V.butterDb(f, 1000)}`); });
await t('butterDb: monotone falling above the corner', () => { let last = 0; for (let f = 1000; f < 20000; f *= 1.05) { const d = V.butterDb(f, 1000); ok(d <= last + 1e-9, `${f}`); last = d; } });
await t('lpBiquadMag: one section at its own corner = its Q (the resonant height)', () => { near(V.lpBiquadMag(1000, 1000, 1.3066), 1.3066, 1e-3); near(V.lpBiquadMag(1000, 1000, 0.5412), 0.5412, 1e-3); });
await t('dbToY: 0 dB at y 75, +18 at 0, −30 at 200 (the Studio glass axis)', () => { is(V.dbToY(0), 75); is(V.dbToY(18), 0); is(V.dbToY(-30), 200); near(V.dbToY(-3), 87.5, 1e-9); });
await t('lowpassPath: p ≥ FILTER_OPEN = a flat line on 0 dB (the true bypass)', () => { is(V.lowpassPath(FILTER_OPEN), 'M0 75.0L600 75.0'); is(V.lowpassPath(1), 'M0 75.0L600 75.0'); });
await t('lowpassPath: just under FILTER_OPEN is a curve again (the bypass is a leg, not a corner)', () => ok(V.lowpassPath(FILTER_OPEN - 0.01).split('L').length > 100));
await t('lowpassPath: the curve crosses −3 dB at x = p·600 and 0 dB well left of it', () => {
  const pts = V.lowpassPath(0.5, 600, 200, 600).slice(1).split('L').map((s) => s.split(' ').map(Number));
  const at = (x) => pts.reduce((b, q) => (Math.abs(q[0] - x) < Math.abs(b[0] - x) ? q : b));
  near(at(300)[1], V.dbToY(-3.0103), 0.15, 'corner y;'); near(at(100)[1], 75, 0.1, 'passband y;');
  ok(at(420)[1] > 190, 'an octave+ above is near the floor');
});
await t('lowpassPath: stays inside the box (0..200); ends where it meets the floor (no line along the bottom edge)', () => {
  const pts = V.lowpassPath(0.2).slice(1).split('L').map((s) => s.split(' ').map(Number)); ok(pts.every(([x, y]) => x >= 0 && x <= 600 && y >= 0 && y <= 200));
  is(pts.at(-1)[1], 200, 'the last point is on the floor;'); is(pts.filter(([, y]) => y >= 200).length, 1, 'exactly one floor point;'); ok(pts.length < 151);
  is(V.lowpassPath(0.97).slice(1).split('L').length, 151, 'a corner near the top never reaches the floor: all 151 points;');
});
await t('nodeX: the corner, 2.5 % in from each edge; open = the right edge', () => { is(V.nodeX(0.4), 0.4); is(V.nodeX(0), 0.025); is(V.nodeX(0.99), 0.975); is(V.nodeX(FILTER_OPEN), 0.975); is(V.nodeX(NaN), 0.975); });
await t('motionGhostP: breathes between p and p·(1 − amount) (sine: top on the beat, floor half a cycle on)', () => {
  const m = { amount: 0.4, shape: 'sine', div: '1/8' };
  near(V.motionGhostP(0.8, m, 0), 0.8, 1e-12); near(V.motionGhostP(0.8, m, 0.25), 0.8 * 0.6, 1e-12);   // 1/8 = .5 beat per cycle
  let lo = 1, hi = 0; for (let b = 0; b < 4; b += 0.01) { const g = V.motionGhostP(0.8, m, b); lo = Math.min(lo, g); hi = Math.max(hi, g); }
  near(hi, 0.8, 1e-6); near(lo, 0.48, 1e-4);
});
await t('motionGhostP: every shape stays inside [p(1−a), p]', () => {
  for (const shape of ['sine', 'sawi', 'saw', 'sqr']) for (const div of LFO_DIVS) for (let b = 0; b < 8; b += 0.037) {
    const g = V.motionGhostP(0.6, { amount: 0.5, shape, div }, b); ok(g >= 0.3 - 1e-12 && g <= 0.6 + 1e-12, `${shape} ${div} ${b}: ${g}`);
  }
});
await t('motionGhostP: sqr is open the first half of each cycle, closed the second', () => { const m = { amount: 1, shape: 'sqr', div: '1/4' }; is(V.motionGhostP(0.5, m, 0.2), 0.5); is(V.motionGhostP(0.5, m, 0.7), 0); });
await t('motionGhostP = lane K\'s motionP (the copy tracks the writer: every shape × division × a beat sweep)', async () => {
  const { motionP } = await import('../motion.ts');
  for (const shape of ['sine', 'sawi', 'saw', 'sqr']) for (const div of LFO_DIVS) for (let b = 0; b < 6; b += 0.043) {
    const m = { amount: 0.63, shape, div }; near(V.motionGhostP(0.71, m, b), motionP(0.71, m, b), 1e-12, `${shape} ${div} ${b}:`);
  }
});
await t('pToHz = lane K\'s filterHz (the node stands on the corner the filter really has)', async () => {
  const { filterHz } = await import('../filter.ts');
  for (let p = -0.2; p <= 1.2; p += 0.013) near(V.pToHz(p), filterHz(p), 1e-9, `p ${p}:`);
});
await t('heardBeats: the playhead while the clock runs (bar·4 + (step + phase)/4)', () => {
  const inst = { ctx: { state: 'running', currentTime: 9 }, time: { bpm: () => 120, running: () => true, playhead: () => ({ bar: 2, step: 6, phase: 0.5 }) } };
  near(V.heardBeats(inst, 0), 8 + 6.5 / 4, 1e-12);
});
await t('heardBeats: free-runs at the tempo on the context clock less its latency; the page clock while asleep', () => {
  const run = { ctx: { state: 'running', currentTime: 10, outputLatency: 0.5 }, time: { bpm: () => 90, running: () => false, playhead: () => ({ bar: 0, step: 0, phase: 0 }) } };
  near(V.heardBeats(run, 0), 9.5 * 1.5, 1e-12);
  const asleep = { ctx: { state: 'suspended', currentTime: 0 }, time: run.time };
  near(V.heardBeats(asleep, 4000), 4 * 1.5, 1e-12);
});
await t('amtFmt: OFF below .005, else the whole %', () => { is(V.amtFmt(0), 'OFF'); is(V.amtFmt(0.0049), 'OFF'); is(V.amtFmt(0.005), '1'); is(V.amtFmt(0.4), '40'); is(V.amtFmt(1), '100'); });
await t('RATE: 9 detents, divToV/vToDiv round-trip every division', () => { is(LFO_DIVS.length, 9); LFO_DIVS.forEach((d, i) => { near(V.divToV(d), i / 8, 1e-12); is(V.vToDiv(i / 8), d); }); is(V.vToDiv(0.06), '1/1'); is(V.vToDiv(0.07), '1/2'); });
await t('MOD RATE: the centre detent catches within ±.06 and passes beyond', () => { is(V.snapModRate(0.53), 0.5); is(V.snapModRate(0.445), 0.5); is(V.snapModRate(0.57), 0.57); is(V.snapModRate(0.43), 0.43); near(V.modRateMult(0.5), 1, 1e-12); near(V.modRateMult(1), 4, 1e-12); near(V.modRateMult(0), 0.25, 1e-12); });
await t('gain: the Studio trim ghost (.8 = unity 0.0 dB, 1 = +1.9, 0 = −∞); the dial ↔ gain 0..1.25', () => {
  is(V.gainFmt(0.8), 'GAIN 0.0 dB'); is(V.gainFmt(1), 'GAIN +1.9 dB'); is(V.gainFmt(0), 'GAIN −∞ dB'); is(V.gainFmt(0.4), 'GAIN -6.0 dB');
  near(V.gainToV(1), 0.8, 1e-12); is(V.gainToV(2), 1); is(V.gainToV(-1), 0);
});

// ════════ the mount ════════
function mount() {
  const inst = createStubInstrument();
  const calls = [];
  for (const k of ['set', 'pick']) { const f = inst.keys[k].bind(inst.keys); inst.keys[k] = (...a) => { calls.push([k, ...a]); return f(...a); }; }
  const sSolo = inst.setSolo.bind(inst); inst.setSolo = (s) => { calls.push(['solo', s]); sSolo(s); };
  const root = new FakeEl('div');
  const view = V.mountKeysView(root, inst);
  const T = root.children[0];
  const q = (sel) => T.querySelector(sel), qa = (sel) => T.querySelectorAll(sel);
  return { inst, calls, root, view, T, q, qa };
}
const knobOf = (T, label) => T.querySelectorAll('.si-knob').find((k) => k.querySelector('.si-kl')?.textContent === label);
const drag = (host, ...moves) => { host.fire('pointerdown', { clientY: 500 }); for (const dy of moves) host.fire('pointermove', { clientY: 500 - dy }); host.fire('pointerup'); };
const mainNode = (q) => q('.kv-filter').children.find((c) => c.cls.has('kv-lp') && !c.cls.has('kv-gnode'));

await t('source: imports ONLY ../types.ts, ./controls.ts, ./common.ts (types.ts: the views\' import law)', () => {
  const src = readFileSync(new URL('./keys-view.ts', import.meta.url), 'utf8');
  const froms = [...src.matchAll(/^\s*import\b[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
  ok(froms.length >= 3); ok(froms.every((f) => ['../types.ts', './controls.ts', './common.ts'].includes(f)), froms.join(', '));
  ok(!/\bimport\s*\(/.test(src), 'no dynamic import'); ok(!/\btitle\s*=/.test(src.replace(/\/\/.*$/gm, '')), 'no title=');
});
await t('mount: one tower in root, the keys accent, head · glass · body · foot', () => {
  const { root, T, view } = mount();
  is(root.children.length, 1); ok(T.cls.has('sg-tower') && T.cls.has('kv-tower')); is(T.style.getPropertyValue('--acc'), 'var(--sg-keys)');
  is(T.children.map((c) => c.className).join(' | '), 'kv-head | sg-glass tint sg-ew kv-filter | kv-body | sg-rail kv-foot');
  view.dispose();
});
await t('header: KEYS is a static span (no LED, never lit); the voice seg holds the four rips, RHODES on', () => {
  const { T, q, view } = mount();
  const pow = q('.kv-pow'); is(pow.tagName, 'SPAN'); is(pow.textContent, 'KEYS'); is(pow.children.length, 0); ok(!pow.cls.has('on'));
  const b = q('.kv-voices').querySelectorAll('button'); is(b.map((x) => x.textContent).join(' '), 'RHODES PIANO PAD LEAD'); is(b.map((x) => x.dataset.v).join(' '), VOICES.join(' '));
  ok(b[0].cls.has('on')); is(b.filter((x) => x.cls.has('on')).length, 1); ok(!T.innerHTML.includes('title='));
  view.dispose();
});
await t('voice: a click picks (keys.pick), lights the cap, carries .loading until ready(), then settles', async () => {
  const { inst, calls, q, view } = mount();
  const piano = q('.kv-voices').querySelectorAll('button').find((x) => x.dataset.v === 'piano');
  piano.fire('click');
  ok(calls.some((c) => c[0] === 'pick' && c[1] === 'piano'), 'pick called'); is(inst.keys.state().voice, 'piano');
  ok(piano.cls.has('on')); ok(piano.cls.has('loading'), 'loading while !ready'); is(q('.kv-voices').querySelectorAll('button.loading').length, 1);
  await sleep(420); flushRaf();
  ok(inst.keys.ready()); ok(!piano.cls.has('loading'), 'settled'); ok(piano.cls.has('on'));
  view.dispose();
});
await t('voice: a pick from elsewhere (the keyboard ↑/↓) repaints the seg through onChange', async () => {
  const { inst, q, view } = mount();
  inst.keys.pick('lead'); await tick();
  const lead = q('.kv-voices').querySelectorAll('button').find((x) => x.dataset.v === 'lead');
  ok(lead.cls.has('on') && lead.cls.has('loading')); is(q('.kv-voices').querySelectorAll('button.on').length, 1);
  view.dispose();
});
await t('glass: grid (8 lines + the 0 dB dash), fill, ghost, curve; labels 100 1k 10k at their log x', () => {
  const { q, qa, view } = mount();
  const lines = q('.kv-filter').querySelectorAll('line'); is(lines.length, 9); is(lines.filter((l) => l.cls.has('maj')).length, 3); ok(lines.at(-1).cls.has('zero'));
  const labs = qa('.kv-fq'); is(labs.map((l) => l.textContent).join(' '), '100 1k 10k');
  near(parseFloat(labs[1].style.left), V.hzToX(1000) * 100, 0.01);
  is(q('.si-afpath').getAttribute('d'), 'M0 75.0L600 75.0', 'born open = flat;');
  near(parseFloat(mainNode(q).style.left), 97.5, 1e-9, 'open: the node at the right edge;'); near(parseFloat(mainNode(q).style.top), 37.5, 1e-9, 'on 0 dB;');
  view.dispose();
});
await t('glass: drag = p RELATIVE to the full width (−¼ width → p .75), the curve + node follow, keys.set("filter")', () => {
  const { inst, q, view } = mount();
  const g = q('.kv-filter'); g.rect = { left: 0, top: 0, width: 400, height: 88 };
  g.fire('pointerdown', { clientX: 300, clientY: 40, timeStamp: 1000 }); ok(g.captured === 7);
  g.fire('pointermove', { clientX: 200, clientY: 40 }); flushRaf(); g.fire('pointerup', { timeStamp: 1100 });
  near(inst.keys.state().filter, 0.75, 1e-12);
  near(parseFloat(mainNode(q).style.left), 75, 1e-9);
  ok(q('.si-afpath').getAttribute('d').split('L').length > 100, 'a curve now');
  view.dispose();
});
await t('glass: a second grab starts from where the hand left it (no jump); clamps at 0', () => {
  const { inst, q, view } = mount();
  const g = q('.kv-filter'); g.rect = { left: 0, top: 0, width: 400, height: 88 };
  g.fire('pointerdown', { clientX: 300, timeStamp: 1000 }); g.fire('pointermove', { clientX: 260 }); flushRaf(); g.fire('pointerup', { timeStamp: 1100 });
  near(inst.keys.state().filter, 0.9, 1e-12);
  g.fire('pointerdown', { clientX: 10, timeStamp: 5000 }); g.fire('pointermove', { clientX: -900 }); flushRaf(); g.fire('pointerup', { timeStamp: 5100 });
  is(inst.keys.state().filter, 0);
  view.dispose();
});
await t('glass: moves are coalesced to one apply per frame; the last move lands on pointerup', () => {
  const { inst, calls, q, view } = mount();
  const g = q('.kv-filter'); g.rect = { left: 0, top: 0, width: 400, height: 88 };
  g.fire('pointerdown', { clientX: 400, timeStamp: 1000 });
  for (let x = 399; x >= 300; x--) g.fire('pointermove', { clientX: x });
  is(calls.filter((c) => c[0] === 'set' && c[1] === 'filter').length, 0, 'nothing before the frame;');
  flushRaf(); is(calls.filter((c) => c[0] === 'set' && c[1] === 'filter').length, 1, 'one per frame;');
  g.fire('pointermove', { clientX: 200 }); g.fire('pointerup', { timeStamp: 1200 });
  near(inst.keys.state().filter, 0.5, 1e-12);
  view.dispose();
});
await t('glass: tap, tap within 320 ms = reset to 1 (open, flat, the node at the right edge)', async () => {
  const { inst, q, view } = mount();
  const g = q('.kv-filter'); g.rect = { left: 0, top: 0, width: 400, height: 88 };
  inst.keys.set('filter', 0.3); await tick();
  near(parseFloat(mainNode(q).style.left), 30, 1e-9);
  g.fire('pointerdown', { clientX: 100, timeStamp: 2000 }); g.fire('pointerup', { timeStamp: 2060 });
  g.fire('pointerdown', { clientX: 100, timeStamp: 2250 });
  is(inst.keys.state().filter, 1); is(q('.si-afpath').getAttribute('d'), 'M0 75.0L600 75.0'); near(parseFloat(mainNode(q).style.left), 97.5, 1e-9);
  view.dispose();
});
await t('glass: a slow second tap (≥ 320 ms) or a moved first one is not a reset', () => {
  const { inst, q, view } = mount();
  const g = q('.kv-filter'); g.rect = { left: 0, top: 0, width: 400, height: 88 };
  inst.keys.set('filter', 0.3);
  g.fire('pointerdown', { clientX: 100, timeStamp: 2000 }); g.fire('pointerup', { timeStamp: 2050 });
  g.fire('pointerdown', { clientX: 100, timeStamp: 2400 }); g.fire('pointerup', { timeStamp: 2450 }); near(inst.keys.state().filter, 0.3, 1e-12, 'slow;');
  g.fire('pointerdown', { clientX: 100, timeStamp: 3000 }); g.fire('pointermove', { clientX: 120 }); flushRaf(); g.fire('pointerup', { timeStamp: 3050 });
  const p = inst.keys.state().filter; g.fire('pointerdown', { clientX: 120, timeStamp: 3100 }); g.fire('pointerup', { timeStamp: 3120 });
  near(inst.keys.state().filter, p, 1e-12, 'moved;');
  view.dispose();
});
await t('glass: a filter written elsewhere (a load) repaints the curve + node from the state', async () => {
  const { inst, q, view } = mount();
  inst.load({ keys: { ...inst.keys.state(), filter: 0.42 } }); await tick();
  near(parseFloat(mainNode(q).style.left), 42, 1e-9); ok(q('.si-afpath').getAttribute('d').startsWith('M0.0 75.0'), 'passband on 0 dB at 40 Hz;');
  view.dispose();
});
await t('ghost: hidden while MOTION is OFF; with MOTION on it rides p·(1 − amount·d) on the frame; OFF hides it again', async () => {
  const { inst, q, view } = mount();
  const gn = q('.kv-gnode'), gp = q('.kv-ghostpath');
  flushRaf(); ok(gn.hidden, 'hidden at rest'); is(gp.getAttribute('visibility'), 'hidden');
  inst.keys.set('filter', 0.8); inst.keys.set('motion', { amount: 0.5, shape: 'sine', div: '1/8' }); await tick();
  let lo = 1, hi = 0; const t0 = performance.now();
  while (performance.now() - t0 < 300) { flushRaf(); if (!gn.hidden) { const x = parseFloat(gn.style.left) / 100; lo = Math.min(lo, x); hi = Math.max(hi, x); } }
  ok(!gn.hidden, 'shown'); is(gp.getAttribute('visibility'), 'visible'); ok(lo >= 0.4 - 1e-9 && hi <= 0.8 + 1e-9, `range ${lo}..${hi}`); ok(hi - lo > 0.1, `it moves (${lo}..${hi})`);
  near(parseFloat(mainNode(q).style.left), 80, 1e-9, 'the hand\'s node stays put;');
  inst.keys.set('motion', { amount: 0.004, shape: 'sine', div: '1/8' }); await tick(); flushRaf(); ok(gn.hidden, 'OFF again hides it');
  view.dispose();
});
await t('MOTION: drag up 40 px = +.25 through keys.set("motion"), shape + div kept; the chip prints the %', async () => {
  const { inst, T, view } = mount();
  inst.keys.set('motion', { amount: 0, shape: 'saw', div: '1/4T' }); await tick();
  const k = knobOf(T, 'motion'); drag(k, 40);
  const m = inst.keys.state().motion; near(m.amount, 0.25, 1e-12); is(m.shape, 'saw'); is(m.div, '1/4T');
  is(k.querySelector('.si-kn').textContent, '25'); is(k.querySelector('.si-dial').style.getPropertyValue('--v'), '0.250');
  view.dispose();
});
await t('MOTION: reads OFF at 0 (an amber LCD chip), dbl-click resets to 0', () => {
  const { inst, T, view } = mount();
  const k = knobOf(T, 'motion'); is(k.querySelector('.si-kn').textContent, 'OFF'); ok(k.querySelector('.si-kn').cls.has('sg-chip')); ok(k.cls.has('kxl'));
  drag(k, 80); near(inst.keys.state().motion.amount, 0.5, 1e-12); k.fire('dblclick'); is(inst.keys.state().motion.amount, 0); is(k.querySelector('.si-kn').textContent, 'OFF');
  view.dispose();
});
await t('RATE: stepped over the 9 divisions (9 ticks), 20 px = one detent, the chip prints it; dbl-click = 1/8', () => {
  const { inst, T, view } = mount();
  const k = knobOf(T, 'rate'); ok(k.cls.has('si-stepped')); is(k.querySelectorAll('.si-stick').length, 9); is(k.querySelector('.si-kn').textContent, '1/8');
  drag(k, 20); is(inst.keys.state().motion.div, '1/8T'); is(k.querySelector('.si-kn').textContent, '1/8T');
  drag(k, -200); is(inst.keys.state().motion.div, '1/1');
  k.fire('dblclick'); is(inst.keys.state().motion.div, '1/8'); is(k.querySelector('.si-kn').textContent, '1/8');
  view.dispose();
});
await t('RATE: a drag inside one detent writes nothing (no set per pixel)', () => {
  const { calls, T, view } = mount();
  const k = knobOf(T, 'rate'); k.fire('pointerdown', { clientY: 500 }); for (let y = 1; y < 8; y++) k.fire('pointermove', { clientY: 500 - y }); k.fire('pointerup');
  is(calls.filter((c) => c[0] === 'set' && c[1] === 'motion').length, 0);
  view.dispose();
});
await t('shapes: four caps with LEDs + drawn glyphs, sine on; a click sets the shape and moves the light', () => {
  const { inst, qa, view } = mount();
  const caps = qa('.kv-shape'); is(caps.length, 4); is(caps.map((c) => c.dataset.v).join(' '), 'sine sawi saw sqr');
  ok(caps.every((c) => c.querySelector('.sg-led') && c.innerHTML.includes('<svg'))); ok(caps[0].cls.has('on'));
  caps[3].fire('click'); is(inst.keys.state().motion.shape, 'sqr'); ok(caps[3].cls.has('on')); ok(!caps[0].cls.has('on')); is(caps[3].getAttribute('aria-pressed'), 'true');
  view.dispose();
});
await t('FX: four LCD towers DRIVE MOD DEL REV, each in its green, fills from the state', () => {
  const { q, qa, view } = mount();
  const cards = qa('.sg-lcd'); is(cards.map((c) => c.querySelector('.si-fl').textContent).join(' '), 'DRIVE MOD DEL REV');
  is(qa('.kv-fxcol').map((c) => c.style.getPropertyValue('--acc')).join(' '), 'var(--sg-drive) var(--sg-mod) var(--sg-delay) var(--sg-reverb)');
  is(q('.sg-lcd[data-key="reverb"]').querySelector('.si-fill').style.height, '22.0%'); ok(q('.sg-lcd[data-key="drive"]').querySelector('.si-fill').cls.has('mt'));
  view.dispose();
});
await t('FX: press on a tower = absolute v = 1 − y/h → keys.set("fx", {...fx, key}) (the rest kept)', () => {
  const { inst, q, view } = mount();
  const c = q('.sg-lcd[data-key="drive"]'); c.rect = { left: 0, top: 100, width: 70, height: 200 };
  c.fire('pointerdown', { clientY: 150 }); near(inst.keys.state().fx.drive, 0.75, 1e-12);
  c.fire('pointermove', { clientY: 250 }); near(inst.keys.state().fx.drive, 0.25, 1e-12); c.fire('pointerup');
  const fx = inst.keys.state().fx; near(fx.reverb, 0.22, 1e-12); is(fx.driveType, 'warm'); is(c.querySelector('.si-fill').style.height, '25.0%');
  view.dispose();
});
await t('FX: a programmatic fall rides .si-fall; a rise does not; a grab clears it before the value moves', async () => {
  const { inst, q, view } = mount();
  const c = q('.sg-lcd[data-key="mod"]'); c.rect = { left: 0, top: 0, width: 70, height: 200 };
  inst.keys.set('fx', { ...inst.keys.state().fx, mod: 0.8 }); await tick(); ok(!c.cls.has('si-fall'), 'rise'); is(c.querySelector('.si-fill').style.height, '80.0%');
  inst.keys.set('fx', { ...inst.keys.state().fx, mod: 0.3 }); await tick(); ok(c.cls.has('si-fall'), 'fall'); is(c.querySelector('.si-fill').style.height, '30.0%');
  c.fire('pointerdown', { clientY: 20 }); ok(!c.cls.has('si-fall'), 'grab clears'); c.fire('pointermove', { clientY: 190 }); await tick(); ok(!c.cls.has('si-fall'), 'a drag never falls'); c.fire('pointerup');
  view.dispose();
});
await t('flavours: WARM CRUNCH TAPE FUZZ · PHS FLNG DBL CHRS · 4 note glyphs · SM MED HALL VAST, defaults lit', () => {
  const { qa, view } = mount();
  const subs = qa('.kv-sub'); is(subs.length, 4);
  is(subs[0].querySelectorAll('button').map((b) => b.textContent).join(' '), 'WARM CRUNCH TAPE FUZZ');
  is(subs[1].querySelectorAll('button').map((b) => b.textContent).join(' '), 'PHS FLNG DBL CHRS');
  const del = subs[2].querySelectorAll('button'); is(del.map((b) => b.dataset.v).join(' '), '1/4 1/8 1/8d 1/16'); ok(del.every((b) => b.innerHTML.startsWith('<svg'))); is(del[2].getAttribute('aria-label'), 'dotted 1/8');
  is(subs[3].querySelectorAll('button').map((b) => b.textContent).join(' '), 'SM MED HALL VAST');
  is(subs.map((s) => s.querySelector('button.on').dataset.v).join(' '), 'warm chorus 1/8 sm');
  view.dispose();
});
await t('flavours: a click → keys.set("fx") with that flavour, the amounts kept', () => {
  const { inst, qa, view } = mount();
  const b = qa('.kv-sub')[3].querySelectorAll('button').find((x) => x.dataset.v === 'hall'); b.fire('click');
  is(inst.keys.state().fx.revSize, 'hall'); near(inst.keys.state().fx.reverb, 0.22, 1e-12); ok(b.cls.has('on'));
  const d = qa('.kv-sub')[2].querySelectorAll('button').find((x) => x.dataset.v === '1/8d'); d.fire('click'); is(inst.keys.state().fx.delayDiv, '1/8d');
  view.dispose();
});
await t('MOD RATE: a 9 px absolute ribbon inside MOD\'s seg; press = v; the centre detent lands on .5', () => {
  const { inst, q, qa, view } = mount();
  const tr = q('.kv-mrtrack'); ok(qa('.kv-sub')[1].querySelector('.kv-mrtrack') === tr); tr.rect = { left: 0, top: 0, width: 60, height: 9 };
  is(tr.querySelector('.si-sfill').style.width, '50.0%');
  tr.fire('pointerdown', { clientX: 51 }); near(inst.keys.state().fx.modRate, 0.85, 1e-12);
  tr.fire('pointermove', { clientX: 32 }); is(inst.keys.state().fx.modRate, 0.5); is(tr.querySelector('.si-sfill').style.width, '50.0%');
  tr.fire('pointermove', { clientX: 6 }); near(inst.keys.state().fx.modRate, 0.1, 1e-12); tr.fire('pointerup');
  ok(q('.sg-lcd[data-key="mod"]').querySelector('.si-ghost').textContent.startsWith('×'), 'the MOD card\'s ghost names the multiplier');
  view.dispose();
});
await t('empty meters: the fill carries .mt at v ≤ .004 (the seg dims by CSS :has)', async () => {
  const { inst, q, view } = mount();
  ok(q('.sg-lcd[data-key="delay"]').querySelector('.si-fill').cls.has('mt'));
  inst.keys.set('fx', { ...inst.keys.state().fx, delay: 0.3 }); await tick(); ok(!q('.sg-lcd[data-key="delay"]').querySelector('.si-fill').cls.has('mt'));
  view.dispose();
});
await t('footer: M = keys mute latch (red), S = solo keys, S again = none; another solo dims the tower', async () => {
  const { inst, T, q, view } = mount();
  const [m, s] = q('.kv-foot').querySelectorAll('button'); ok(m.cls.has('sq') && m.cls.has('warn')); ok(s.cls.has('sq')); is(m.textContent + s.textContent, 'ms');
  m.fire('click'); is(inst.keys.state().mute, true); ok(m.cls.has('on')); m.fire('click'); is(inst.keys.state().mute, false); ok(!m.cls.has('on'));
  s.fire('click'); is(inst.state().solo, 'keys'); ok(s.cls.has('on')); ok(!T.cls.has('solo-dim'));
  s.fire('click'); is(inst.state().solo, null); ok(!s.cls.has('on'));
  inst.setSolo('drums'); await tick(); ok(T.cls.has('solo-dim')); ok(!s.cls.has('on')); s.fire('click'); is(inst.state().solo, 'keys'); ok(!T.cls.has('solo-dim'));
  view.dispose();
});
await t('gain: dial 0..1 → keys.gain 0..1.25; unity (gain 1) at .8, a plain arc; the tick glints only while held in the detent; dbl-click = unity', () => {
  const { inst, T, view } = mount();
  const k = knobOf(T, 'gain'); ok(k.cls.has('side')); const tk = k.querySelector('.si-tick'); ok(tk); is(k.querySelector('.si-dial').style.getPropertyValue('--v'), '0.800');
  ok(!k.querySelector('.si-dial').cls.has('anch'), 'a plain arc (the drums\' + bass\' footer);'); ok(!tk.cls.has('hot'), 'at rest the tick is engraved;');
  k.fire('pointerdown', { clientY: 500 }); k.fire('pointermove', { clientY: 498 }); ok(tk.cls.has('hot'), 'held in the detent it glints;'); near(inst.keys.state().gain, 1, 1e-12, 'the detent holds unity;');
  k.fire('pointermove', { clientY: 484 }); ok(!tk.cls.has('hot'), 'out of the detent;'); k.fire('pointerup');
  near(inst.keys.state().gain, 0.9 * 1.25, 1e-12);
  k.fire('dblclick'); near(inst.keys.state().gain, 1, 1e-12);
  view.dispose();
});
await t('paint: a load repaints every control from the state', async () => {
  const { inst, T, q, qa, view } = mount();
  const fx = { drive: 0.4, driveType: 'crunch', mod: 0.6, modMode: 'flanger', modRate: 0.7, delay: 0.25, delayDiv: '1/16', reverb: 0.35, revSize: 'vast' };
  inst.load({ keys: { voice: 'pad', filter: 0.6, motion: { amount: 0.4, shape: 'sawi', div: '1/16' }, fx, gain: 0.5, mute: true } }); await tick();
  ok(q('.kv-voices').querySelectorAll('button').find((b) => b.dataset.v === 'pad').cls.has('on'));
  is(knobOf(T, 'motion').querySelector('.si-kn').textContent, '40'); is(knobOf(T, 'rate').querySelector('.si-kn').textContent, '1/16');
  ok(qa('.kv-shape').find((b) => b.dataset.v === 'sawi').cls.has('on'));
  is(q('.sg-lcd[data-key="drive"]').querySelector('.si-fill').style.height, '40.0%');
  is(qa('.kv-sub').map((s) => s.querySelector('button.on').dataset.v).join(' '), 'crunch flanger 1/16 vast');
  is(q('.kv-mrtrack').querySelector('.si-sfill').style.width, '70.0%');
  ok(q('.kv-foot').querySelector('button').cls.has('on')); is(knobOf(T, 'gain').querySelector('.si-dial').style.getPropertyValue('--v'), '0.400');
  near(parseFloat(mainNode(q).style.left), 60, 1e-9);
  view.dispose();
});
await t('paint: many changes in one turn paint ONCE, from inst.state() (coalesced on a microtask)', async () => {
  const { inst, q, view } = mount();
  const fill = q('.sg-lcd[data-key="drive"]').querySelector('.si-fill');
  let states = 0; const S0 = inst.state.bind(inst); inst.state = () => { states++; return S0(); };
  for (let i = 1; i <= 10; i++) inst.keys.set('fx', { ...inst.keys.state().fx, drive: i / 10 });
  is(states, 0, 'nothing painted inside the turn;'); is(fill.style.height, '0.0%');
  await tick(); is(states, 1, 'one paint for ten changes;'); is(fill.style.height, '100.0%');
  view.dispose();
});
await t('dispose: the tower leaves root, the frame stops, onChange no longer paints', async () => {
  rafQ = new Map();
  const { inst, root, T, q, view } = mount(); is(rafQ.size, 1, 'one frame while mounted;');
  view.dispose(); is(root.children.length, 0); is(rafQ.size, 0, 'no frame queued;');
  const before = q('.sg-lcd[data-key="drive"]').querySelector('.si-fill').style.height;
  inst.keys.set('fx', { ...inst.keys.state().fx, drive: 0.9 }); await tick(); is(q('.sg-lcd[data-key="drive"]').querySelector('.si-fill').style.height, before);
  view.dispose(); ok(T);
});
await t('hooks: a data-ctl on each control the gate may click (the hands\' convention)', () => {
  const { T, view } = mount();
  is([...T.walk()].filter((e) => e.dataset.ctl).map((e) => e.dataset.ctl).join(' '), 'keys-voice keys-filter keys-motion keys-rate keys-shape keys-modrate keys-mute keys-solo keys-gain');
  view.dispose();
});
await t('no words that explain: no title=, no text beyond the legends', () => {
  const { T, view } = mount();
  const words = [...T.walk()].filter((e) => !e.cls.has('si-pc') && !e.innerHTML).map((e) => e.textContent).filter(Boolean);   // .si-pc is display:none (material); innerHTML replaced the legend (a real DOM drops it)
  is(words.join(' '), 'KEYS RHODES PIANO PAD LEAD 100 1k 10k motion OFF rate 1/8 DRIVE WARM CRUNCH TAPE FUZZ MOD PHS FLNG DBL CHRS rate DEL REV SM MED HALL VAST m s gain');
  ok(![...T.walk()].some((e) => 'title' in e.attrs));
  view.dispose();
});

for (const f of fails) console.log(f);
console.log(`keys-view: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
