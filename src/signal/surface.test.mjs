// SIGNAL R1 · lane S · test-surface.ts + glitch-worklet.ts tests. New code.
//   source ~/.nvm/nvm.sh && node src/signal/surface.test.mjs
// (1) the firstSound arithmetic on a fake clock · (2) the gap arithmetic on synthetic currentFrame sequences, run from
// GAP_MATH_SRC itself (the string the worklet ships) · (3) the whole processor source inside a fake
// AudioWorkletGlobalScope: counts, the 250 ms posts, a dropout, dispose · (4) installGlitchMeter: one registration per
// context, a sink on the tap, the stub on every failure · (5) mountTestSurface: press/wake order, the real keymap,
// window.__signal, first sound on real timers · (6) click() and the trusted-gesture listener against a fake DOM ·
// (7) the additive lagMs (createLagMeter): render time lost to the wall clock, which `gaps` cannot see.
import { deepStrictEqual } from 'node:assert';
import { KEYMAP } from './types.ts';
import {
  createLagMeter, GAP_MATH_SRC, GAP_QUANTA, GLITCH_POST_MS, GLITCH_PROCESSOR, GLITCH_WORKLET_SRC, QUANTUM, installGlitchMeter,
} from './glitch-worklet.ts';
import {
  createFirstSound, FIRST_SOUND_GIVE_UP_MS, FIRST_SOUND_POLL_MS, FIRST_SOUND_RMS, mountTestSurface,
} from './test-surface.ts';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}  ${x}`); } };
const eq = (n, a, b) => { try { deepStrictEqual(a, b); ok(n, true); } catch (e) { ok(n, false, e.message.split('\n').slice(0, 10).join('\n')); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const warns = [];
const realWarn = console.warn;
console.warn = (...a) => { warns.push(a.map(String).join(' ')); };

/** A clock the test drives: every(fn, ms) timers fire in order as advance() passes them. */
function fakeClock(start = 0) {
  let t = start;
  const timers = new Set();
  return {
    now: () => t,
    every(fn, ms) { const h = { fn, ms, next: t + ms }; timers.add(h); return () => timers.delete(h); },
    advance(ms) {
      const end = t + ms;
      for (;;) {
        let h = null;
        for (const x of timers) if (x.next <= end && (!h || x.next < h.next)) h = x;
        if (!h) break;
        t = h.next; h.next += h.ms; h.fn();
      }
      t = end;
    },
    live: () => timers.size,
  };
}

console.log('\n[first sound] the arithmetic (a fake clock, a scripted level)');
{
  ok('−60 dBFS, polled every 10 ms, given up after 20 s', FIRST_SOUND_RMS === 0.001 && FIRST_SOUND_POLL_MS === 10 && FIRST_SOUND_GIVE_UP_MS === 20000);
  const c = fakeClock(1000);
  let rms = 0;
  const fs = createFirstSound(() => ({ peak: rms, rms }), c);
  ok('null before any gesture, nothing polling', fs.value() === null && c.live() === 0);
  ok('the first mark takes and starts the poll', fs.mark() === true && c.live() === 1);
  c.advance(80);
  ok('silence: still null', fs.value() === null);
  rms = 0.001; c.advance(10);
  ok('exactly −60 dBFS is not yet a sound', fs.value() === null);
  rms = 0.0011; c.advance(10);
  ok('the first poll above −60 dBFS: 100 ms after the mark', fs.value() === 100, `${fs.value()}`);
  ok('the poll stops once it has its answer', c.live() === 0);
  ok('a second mark is ignored', fs.mark() === false && fs.value() === 100);

  const c2 = fakeClock(5000);
  const loud = createFirstSound(() => ({ rms: 0.5 }), c2);
  loud.mark(4970); c2.advance(10);
  ok('a trusted event\'s own timeStamp (30 ms back) counts from the event: 40 ms', loud.value() === 40, `${loud.value()}`);
  const c3 = fakeClock(5000);
  const future = createFirstSound(() => ({ rms: 0.5 }), c3);
  future.mark(6000); c3.advance(10);
  ok('a stamp in the future is not believed (now is used): 10 ms', future.value() === 10);
  const c4 = fakeClock(5000);
  const stale = createFirstSound(() => ({ rms: 0.5 }), c4);
  stale.mark(0); c4.advance(10);
  ok('a stamp from another clock (5 s back) is not believed: 10 ms', stale.value() === 10);

  const c5 = fakeClock(0);
  let mode = 'nan';
  const odd = createFirstSound(() => { if (mode === 'throw') throw new Error('no analyser'); return { rms: mode === 'nan' ? NaN : 0.2 }; }, c5);
  odd.mark(); c5.advance(30);
  ok('a NaN level is not a sound', odd.value() === null);
  mode = 'throw'; c5.advance(30);
  ok('a throwing level() is not a sound and does not throw', odd.value() === null);
  mode = 'ok'; c5.advance(10);
  ok('…and the first real reading still lands (70 ms)', odd.value() === 70, `${odd.value()}`);

  const c6 = fakeClock(0);
  const never = createFirstSound(() => ({ rms: 0 }), c6);
  never.mark(); c6.advance(FIRST_SOUND_GIVE_UP_MS + 50);
  ok('20 s of silence: null for good, and the poll is stopped', never.value() === null && c6.live() === 0);

  const c7 = fakeClock(0);
  const gone = createFirstSound(() => ({ rms: 1 }), c7);
  gone.mark(); gone.dispose(); c7.advance(100);
  ok('dispose() stops the poll', c7.live() === 0 && gone.value() === null);
}

const { gapInit, gapStep, gapRead } = new Function(`${GAP_MATH_SRC}\nreturn { gapInit, gapStep, gapRead };`)();
const run = (frames, q = 128, sr = 48000) => { const st = gapInit(); for (const f of frames) gapStep(st, f, q); return gapRead(st, sr); };
const steady = (n, from = 0, q = 128) => Array.from({ length: n }, (_, i) => from + i * q);

console.log('\n[gaps] the dropout arithmetic on synthetic currentFrame sequences (GAP_MATH_SRC, as shipped)');
{
  ok('a gap is MORE than 1.5 quanta of 128 frames', GAP_QUANTA === 1.5 && QUANTUM === 128);
  eq('one second, every quantum in order: 375 blocks, no gap', run(steady(375)), { blocks: 375, gaps: 0, maxGapMs: 0 });
  const one = run([...steady(10), 9 * 128 + 256]);
  ok('one quantum skipped (d = 256): one gap of 128 frames = 2.667 ms', one.blocks === 11 && one.gaps === 1 && near(one.maxGapMs, 128 / 48), JSON.stringify(one));
  eq('d = 192 (exactly 1.5 quanta) is not a gap', run([0, 192]), { blocks: 2, gaps: 0, maxGapMs: 0 });
  const edge = run([0, 193]);
  ok('d = 193 is: 65 frames missing', edge.gaps === 1 && near(edge.maxGapMs, 65 / 48), JSON.stringify(edge));
  const two = run([0, 128, 384, 512, 1792]);
  ok('two gaps (d 256, d 1280): counted, the longest is 1152 frames = 24 ms', two.gaps === 2 && near(two.maxGapMs, 24), JSON.stringify(two));
  eq('the first call is never a gap (a meter installed mid-run)', run([1e6, 1e6 + 128]), { blocks: 2, gaps: 0, maxGapMs: 0 });
  eq('a frame that goes back re-seats without counting', run([0, 128, 64, 192]), { blocks: 4, gaps: 0, maxGapMs: 0 });
  eq('a frame that repeats is not a gap', run([0, 128, 128, 256]), { blocks: 4, gaps: 0, maxGapMs: 0 });
  eq('suspend + resume: the frame count carries on, no gap', run([...steady(100), ...steady(100, 100 * 128)]), { blocks: 200, gaps: 0, maxGapMs: 0 });
  eq('a 256-frame quantum (the input says so): steps of 256 are fine', run([0, 256, 512], 256), { blocks: 3, gaps: 0, maxGapMs: 0 });
  const big = run([0, 256, 768], 256);
  ok('…and a skipped 256-frame quantum is one gap of 5.333 ms', big.gaps === 1 && near(big.maxGapMs, 256 / 48), JSON.stringify(big));
  const at441 = run([0, 128, 256 + 441], 128, 44100);
  ok('at 44.1 kHz: 441 missing frames = 10 ms', at441.gaps === 1 && near(at441.maxGapMs, 10), JSON.stringify(at441));
  eq('no sample rate: maxGapMs 0, never NaN', run([0, 512], 128, 0), { blocks: 2, gaps: 1, maxGapMs: 0 });
  // Chromium under load (the r1-G probe, CPU ×4): process() gets the SAME currentFrame twice, then the next call
  // catches up by 2 (or 3) quanta; the frame span = (calls − 1) × 128, so no quantum was skipped
  eq('a stale frame, then a double step: no gap', run([0, 128, 256, 256, 512, 640]), { blocks: 6, gaps: 0, maxGapMs: 0 });
  eq('two stale frames, then a triple step: no gap', run([0, 128, 128, 128, 512, 640]), { blocks: 6, gaps: 0, maxGapMs: 0 });
  const probe = [0];
  for (let i = 1; i < 400; i++) probe.push(probe[i - 1] + (i % 50 === 7 ? 0 : i % 50 === 8 ? 256 : 128));
  eq('the probe\'s pattern, eight stale calls in 400 (span = (calls − 1)·128): no gap', run(probe), { blocks: 400, gaps: 0, maxGapMs: 0 });
  const real = run([0, 128, 256, 256, 512, 896]);
  ok('a real dropout after a caught-up stale frame still counts: 256 frames', real.gaps === 1 && near(real.maxGapMs, 256 / 48), JSON.stringify(real));
  const short = run([0, 128, 128, 512]);
  ok('a stale frame pays back ONE quantum only: a step of 3 after it = one quantum missing', short.gaps === 1 && near(short.maxGapMs, 128 / 48), JSON.stringify(short));
  const stale = run([0, 128, 128, 256, 384, 640]);
  ok('a debt the next step did not use is dropped: a later skipped quantum counts', stale.gaps === 1 && near(stale.maxGapMs, 128 / 48), JSON.stringify(stale));
}

/** Evaluate the whole worklet module in a fake AudioWorkletGlobalScope: currentFrame + sampleRate as globals. */
function loadProcessor(sr = 48000) {
  const scope = { currentFrame: 0 };
  const registered = new Map();
  class AudioWorkletProcessor {
    constructor() {
      const posts = [];
      this.port = { onmessage: null, posts, postMessage: (m) => posts.push({ frame: scope.currentFrame, m: structuredClone(m) }) };
    }
  }
  Object.defineProperty(globalThis, 'currentFrame', { get: () => scope.currentFrame, configurable: true });
  Object.defineProperty(globalThis, 'sampleRate', { value: sr, configurable: true, writable: true });
  new Function('AudioWorkletProcessor', 'registerProcessor', GLITCH_WORKLET_SRC)(AudioWorkletProcessor, (n, c) => registered.set(n, c));
  return { scope, registered };
}

console.log('\n[processor] the shipped source in a fake AudioWorkletGlobalScope');
{
  const { scope, registered } = loadProcessor();
  ok(`it registers '${GLITCH_PROCESSOR}'`, registered.has('sig-glitch') && GLITCH_PROCESSOR === 'sig-glitch');
  const P = registered.get('sig-glitch');
  const p = new P();
  const input = [[new Float32Array(128)]];
  let alive = true;
  for (let i = 0; i < 375; i++) { scope.currentFrame = i * 128; alive = p.process(input, [], {}) && alive; }
  const posts = p.port.posts;
  ok('process() keeps the node alive', alive === true);
  ok('the first block posts at once', posts[0]?.frame === 0 && posts[0]?.m.blocks === 1);
  const spacing = posts.slice(1).map((x, i) => x.frame - posts[i].frame);
  ok(`then every ${GLITCH_POST_MS} ms of audio (12000..12128 frames apart): ${spacing.join(', ')}`, spacing.length === 3 && spacing.every((d) => d >= 12000 && d <= 12128));
  eq('one second in order: no gap', { gaps: posts.at(-1).m.gaps, maxGapMs: posts.at(-1).m.maxGapMs }, { gaps: 0, maxGapMs: 0 });
  ok('the posted blocks count every call up to the post', posts.every((x) => x.m.blocks === x.frame / 128 + 1));
  scope.currentFrame = 374 * 128 + 5 * 128;           // four quanta never rendered
  p.process(input, [], {});
  for (let i = 1; i < 100; i++) { scope.currentFrame += 128; p.process(input, [], {}); }
  const after = p.port.posts.at(-1).m;
  ok('a dropout of four quanta: gaps 1, maxGapMs 10.667 (posted on the next 250 ms line)', after.gaps === 1 && near(after.maxGapMs, 512 / 48), JSON.stringify(after));
  const q = new P();
  for (let i = 0; i < 50; i++) { scope.currentFrame = 1e5 + i * 128; q.process([[]], [], {}); }
  for (let i = 50; i < 60; i++) { scope.currentFrame = 1e5 + i * 128; q.process([], [], {}); }
  scope.currentFrame += 128; q.process([[]], [], {});
  const qs = gapRead(q.st, 48000);
  ok('an input with no channel (nothing connected) measures by 128 frames: 61 blocks, no false gaps', qs.blocks === 61 && qs.gaps === 0, JSON.stringify(qs));
  p.port.onmessage({ data: 'dispose' });
  scope.currentFrame += 128;
  ok('"dispose" ends it: process() returns false', p.process(input, [], {}) === false);
  delete globalThis.currentFrame;
  delete globalThis.sampleRate;
}

console.log('\n[install] one registration per context, a sink on the tap, the stub on every failure');
{
  const STUB = { blocks: -1, gaps: 0, maxGapMs: 0, lagMs: 0 };
  const m0 = await installGlitchMeter({ audioWorklet: { addModule: () => Promise.resolve() } }, null);
  eq('Node as it is (no AudioWorkletNode): the stub', m0.read(), STUB);
  m0.dispose();
  const nodes = [];
  class FakeNode {
    constructor(ctx, name, opts) {
      this.ctx = ctx; this.name = name; this.opts = opts;
      const sent = [];
      this.port = { onmessage: null, sent, postMessage: (m) => sent.push(m) };
      nodes.push(this);
    }
  }
  globalThis.AudioWorkletNode = FakeNode;
  eq('a context without audioWorklet (an insecure origin): the stub', (await installGlitchMeter({}, null)).read(), STUB);
  let adds = 0;
  const urls = [], revoked = [];
  const realRevoke = URL.revokeObjectURL;
  URL.revokeObjectURL = (u) => { revoked.push(u); realRevoke(u); };
  const mkCtx = (refuse = false) => ({ audioWorklet: { addModule: async (u) => { adds++; urls.push(u); if (refuse) throw new Error('refused'); } } });
  const tap = { connected: [], disconnected: [], connect(n) { this.connected.push(n); }, disconnect(n) { this.disconnected.push(n); } };
  const ctx = mkCtx();
  const m1 = await installGlitchMeter(ctx, tap);
  const node = nodes[0];
  ok('the module is added once, from a blob: URL', adds === 1 && urls[0].startsWith('blob:'));
  ok('…which is revoked once it has loaded', revoked.includes(urls[0]));
  ok(`the node is '${GLITCH_PROCESSOR}' on this context`, node?.name === 'sig-glitch' && node.ctx === ctx);
  ok('a sink: one input, NO output, one channel', node.opts.numberOfInputs === 1 && node.opts.numberOfOutputs === 0 && node.opts.channelCount === 1);
  ok('hung on the tap', tap.connected[0] === node);
  eq('before the first post: zeros (installed, nothing rendered yet)', m1.read(), { blocks: 0, gaps: 0, maxGapMs: 0, lagMs: 0 });
  node.port.onmessage({ data: { blocks: 375, gaps: 1, maxGapMs: 2.5 } });
  eq('read() = the newest post (+ lagMs)', m1.read(), { blocks: 375, gaps: 1, maxGapMs: 2.5, lagMs: 0 });
  node.port.onmessage({ data: 'noise' });
  node.port.onmessage({ data: { blocks: 'x', gaps: 0, maxGapMs: 0 } });
  node.port.onmessage({ data: null });
  eq('posts that are not counts are ignored', m1.read(), { blocks: 375, gaps: 1, maxGapMs: 2.5, lagMs: 0 });
  const r = m1.read(); r.gaps = 99;
  ok('read() hands out a copy', m1.read().gaps === 1);
  const m2 = await installGlitchMeter(ctx);
  ok('a second meter on the same context: no second addModule', adds === 1 && nodes.length === 2);
  ok('no tap: hung on nothing', tap.connected.length === 1);
  await installGlitchMeter(mkCtx(), tap);
  ok('another context registers its own', adds === 2 && nodes.length === 3);
  m1.dispose();
  ok('dispose(): off the tap, the processor told to end, the listener gone',
    tap.disconnected[0] === node && node.port.sent.includes('dispose') && node.port.onmessage === null);
  m1.dispose();
  ok('dispose() twice is harmless', tap.disconnected.length === 1);
  m2.dispose();
  warns.length = 0;
  const refusing = mkCtx(true);
  const m3 = await installGlitchMeter(refusing, tap);
  eq('a refused module (CSP, a bad build): the stub', m3.read(), STUB);
  const before = adds;
  eq('…remembered for that context (no retry)', (await installGlitchMeter(refusing, tap)).read(), STUB);
  ok('…with no second addModule and one warning', adds === before && warns.length === 1, `${adds - before} ${JSON.stringify(warns)}`);
  globalThis.AudioWorkletNode = class { constructor() { throw new Error('unknown processor'); } };
  eq('a refused node: the stub', (await installGlitchMeter(mkCtx(), tap)).read(), STUB);
  URL.revokeObjectURL = realRevoke;
  delete globalThis.AudioWorkletNode;
}

/** An instrument with the surface's reach only: a context state, a level, readiness, wake/stop and a log. */
function fakeInstrument() {
  const log = [];
  let rms = 0;
  const inst = {
    ctx: { state: 'suspended' },
    out: { level: () => ({ peak: rms * 1.41, rms }), muted: () => true },
    drums: { ready: () => flags.drums }, keys: { ready: () => flags.keys },
    wake() { log.push('wake'); inst.ctx.state = 'running'; return Promise.resolve(); },
    stop() { log.push('stop'); },
    state() { return { v: 1, marker: 'state' }; },
  };
  const flags = { drums: false, keys: false };
  return { inst, log, flags, setRms: (v) => { rms = v; } };
}

console.log('\n[surface] window.__signal: the reads, the real keymap, wake before the action');
{
  const { inst, log, flags, setRms } = fakeInstrument();
  const acts = [];
  const onAction = (a, on, shift, code) => { log.push(`act:${code}:${on}:${shift}`); acts.push({ a, on, shift, code }); };
  const s = await mountTestSurface({ instrument: inst, onAction });
  ok('published as window.__signal', globalThis.__signal === s);
  ok('the instrument rides along', s.instrument === inst);
  const r0 = s.ready(); flags.drums = true; const r1 = s.ready(); flags.keys = true; const r2 = s.ready();
  ok('ready() = the kit AND the voice\'s first batch', !r0 && !r1 && r2);
  ok('ctxState reads the live context', s.ctxState() === 'suspended');
  eq('glitches() in Node: the stub', s.glitches(), { blocks: -1, gaps: 0, maxGapMs: 0, lagMs: 0 });
  setRms(0.25);
  eq('level() is out.level()', s.level(), { peak: 0.25 * 1.41, rms: 0.25 });
  setRms(0);
  ok('state() is instrument.state()', s.state().marker === 'state');
  s.press('KeyA', true);
  ok('a key-down: wake FIRST, then the action', log.join() === 'wake,act:KeyA:true:false', log.join());
  ok('the action is KEYMAP.KeyA itself, with the code', acts[0].a === KEYMAP.KeyA && acts[0].code === 'KeyA');
  ok('the context woke', s.ctxState() === 'running');
  log.length = 0;
  s.press('KeyA', false);
  ok('a key-up: the action alone, no wake', log.join() === 'act:KeyA:false:false', log.join());
  s.press('KeyB', true, true);
  ok('shift rides along', acts.at(-1).a === KEYMAP.KeyB && acts.at(-1).shift === true);
  log.length = 0;
  for (const c of ['KeyX', 'KeyC', 'KeyV', 'KeyN', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8']) { s.press(c, true); s.press(c, false); s.press(c); }
  ok('[R3] the keys that left the keyboard (X C V N, Digit1–8) fire nothing and wake nothing', log.length === 0, log.join());
  log.length = 0;
  s.press('Escape', true);
  ok('Escape: the stop action, no wake (it is never a user activation)', log.join() === 'act:Escape:true:false', log.join());
  log.length = 0;
  s.press('F13', true); s.press('NotAKey', false);
  ok('an unmapped code does nothing', log.length === 0);
  s.press('constructor', true); s.press('__proto__', true); s.press('toString', true);
  ok('an inherited name is not a key (constructor, __proto__, toString)', log.length === 0, log.join());
  log.length = 0;
  s.press('Space');
  ok('`on` omitted (NOTES §4 writes press(\'Space\')): a tap, wake, then down, then up',
    log.join() === 'wake,act:Space:true:false,act:Space:false:false', log.join());
  log.length = 0;
  s.press('Escape');
  ok('…Escape omitted: the stop down + up, still no wake', log.join() === 'act:Escape:true:false,act:Escape:false:false', log.join());
  log.length = 0;
  s.press('KeyZ', undefined, true);
  ok('…shift rides along on both edges', log.join() === 'wake,act:KeyZ:true:true,act:KeyZ:false:true', log.join());
  log.length = 0;
  ok('click() with no document: false', s.click('#pad') === false);
  s.stop();
  ok('stop() is the master stop', log.includes('stop'));
  flags.drums = null; inst.drums.ready = () => { throw new Error('not built'); };
  ok('ready() is false, not a throw, when a module is not there', s.ready() === false);
}

console.log('\n[surface · first sound] on real timers: the first gesture to the first block over −60 dBFS');
{
  const { inst, setRms } = fakeInstrument();
  const s = await mountTestSurface({ instrument: inst, onAction: () => {} });
  s.press('Escape', true);
  s.press('KeyS', false);
  setRms(0.5);
  await sleep(40);
  ok('Escape or a key-up first: no mark, so no number, even with sound', s.firstSoundMs() === null);
  setRms(0);
  s.press('KeyA', true);
  setTimeout(() => setRms(0.01), 60);
  await sleep(150);
  const ms = s.firstSoundMs();
  ok(`press(KeyA) → sound 60 ms later → firstSoundMs ${ms?.toFixed(1)} (60..200)`, ms !== null && ms >= 59 && ms < 200);
  s.press('KeyS', true);
  await sleep(30);
  ok('later presses do not re-mark', s.firstSoundMs() === ms);
}

console.log('\n[surface · DOM] click() through the real handlers; the trusted-gesture listener');
{
  class FakeEvent { constructor(type, init = {}) { Object.assign(this, init); this.type = type; this.isTrusted = false; } }
  globalThis.MouseEvent = class MouseEvent extends FakeEvent {};
  globalThis.PointerEvent = class PointerEvent extends globalThis.MouseEvent {};
  const got = [];
  const el = { getBoundingClientRect: () => ({ left: 100, top: 40, width: 20, height: 60 }), dispatchEvent(e) { got.push(e); return true; } };
  const winL = {};
  globalThis.addEventListener = (t, fn, cap) => { (winL[t] ??= []).push({ fn, cap }); };
  globalThis.document = { querySelector: (sel) => { if (sel === '((') throw new SyntaxError('bad selector'); return sel === '#pad' ? el : null; } };
  const { inst, log, setRms } = fakeInstrument();
  const s = await mountTestSurface({ instrument: inst, onAction: () => {} });
  ok('capture-phase listeners on window for pointerdown and keydown', winL.pointerdown?.[0]?.cap === true && winL.keydown?.[0]?.cap === true);
  const fire = (t, e) => winL[t].forEach(({ fn }) => fn({ type: t, button: 0, timeStamp: performance.now(), ...e }));
  setRms(0.5);
  fire('pointerdown', { isTrusted: false });
  fire('keydown', { isTrusted: true, code: 'Escape', key: 'Escape' });
  fire('keydown', { isTrusted: true, code: 'KeyA', repeat: true });
  fire('keydown', { isTrusted: true, code: 'KeyA', metaKey: true });
  fire('keydown', { isTrusted: true, code: 'F13' });
  fire('pointerdown', { isTrusted: true, button: 2 });
  await sleep(40);
  ok('synthetic events, Escape, repeats, chords, unmapped keys and a right click are not the first gesture', s.firstSoundMs() === null);
  fire('pointerdown', { isTrusted: true, timeStamp: performance.now() - 20 });
  await sleep(30);
  const fs = s.firstSoundMs();
  ok(`a trusted pointerdown marks from its own timeStamp (20 ms back): ${fs?.toFixed(1)} ms (≥ 20)`, fs !== null && fs >= 20 && fs < 150);
  ok('click("#pad") → true', s.click('#pad') === true);
  ok('three events, in order: pointerdown, pointerup, click', got.map((e) => e.type).join() === 'pointerdown,pointerup,click', got.map((e) => e.type).join());
  ok('the pointer events are PointerEvents, the click a MouseEvent',
    got[0] instanceof globalThis.PointerEvent && got[1] instanceof globalThis.PointerEvent && !(got[2] instanceof globalThis.PointerEvent));
  ok('bubbling, cancelable, composed', got.every((e) => e.bubbles && e.cancelable && e.composed));
  ok('at the element\'s centre (110, 70)', got.every((e) => e.clientX === 110 && e.clientY === 70));
  ok('a primary mouse: pointerId 1, button 0, buttons 1 then 0', got[0].pointerId === 1 && got[0].pointerType === 'mouse'
    && got[0].isPrimary === true && got[0].button === 0 && got[0].buttons === 1 && got[1].buttons === 0 && got[2].detail === 1);
  ok('click() wakes the instrument', log.includes('wake'));
  ok('no match → false; a malformed selector → false, no throw', s.click('#nope') === false && s.click('((') === false);
  delete globalThis.PointerEvent;
  got.length = 0;
  s.click('#pad');
  ok('no PointerEvent (an old engine): MouseEvents carry the pointer types', got.map((e) => e.type).join() === 'pointerdown,pointerup,click' && got[0] instanceof globalThis.MouseEvent);
  delete globalThis.MouseEvent;
  delete globalThis.addEventListener;
  delete globalThis.document;
}

console.log('\n[lag] lagMs: render time lost to the wall clock while running (what `gaps` cannot see)');
{
  function fakeCtx(state) {
    const ls = new Set();
    const c = {
      state, currentTime: 0,
      addEventListener: (t, f) => { if (t === 'statechange') ls.add(f); },
      removeEventListener: (t, f) => { ls.delete(f); },
      setState(x) { c.state = x; for (const f of [...ls]) f(); },
      listeners: () => ls.size,
    };
    return c;
  }
  let wall = 0;
  const now = () => wall;
  const ctx = fakeCtx('running');
  const lag = createLagMeter(ctx, now);
  ok('0 at the start, one statechange listener', lag.ms() === 0 && ctx.listeners() === 1);
  wall += 1000; ctx.currentTime += 1.0;
  ok('audio in step with the wall clock: 0', near(lag.ms(), 0));
  wall += 1000; ctx.currentTime += 1.005;
  ok('audio a step ahead (currentTime moves in device-callback steps): 0, never negative', lag.ms() === 0);
  wall += 3000; ctx.currentTime += 1.97;
  ok(`the busy smoke's numbers (3 s of wall, 1.97 s of audio): ${lag.ms().toFixed(1)} ms behind`, near(lag.ms(), 1025, 0.5));
  ctx.setState('suspended'); wall += 5000;
  ok('a suspended stretch is not lag', near(lag.ms(), 1025, 0.5));
  ctx.setState('running'); wall += 1000; ctx.currentTime += 1.0;
  ok('resumed in step: the lost time stays, nothing new is added', near(lag.ms(), 1025, 0.5));
  wall += 1000; ctx.currentTime += 0.9;
  ok('a second shortfall adds on (100 ms)', near(lag.ms(), 1125, 0.5));
  ctx.setState('closed'); wall += 9000;
  ok('closed: frozen', near(lag.ms(), 1125, 0.5));
  lag.dispose();
  ok('dispose() removes its listener', ctx.listeners() === 0);
  const boot = fakeCtx('suspended');
  const l2 = createLagMeter(boot, now);
  wall += 2000;
  ok('a context suspended from boot counts nothing until it runs', l2.ms() === 0);
  boot.setState('running'); wall += 500; boot.currentTime += 0.5;
  ok('…then in step: 0', near(l2.ms(), 0));
  ok('a context with no clock (Node): 0', createLagMeter({}, now).ms() === 0);
  const c3 = fakeCtx('running');
  const m = await installGlitchMeter(c3, null);
  const r = m.read();
  ok('the stub (no worklet here) still reads the lag', r.blocks === -1 && typeof r.lagMs === 'number' && r.lagMs >= 0);
  m.dispose();
  ok('…and its dispose() lets the context go', c3.listeners() === 0);
}

console.warn = realWarn;
delete globalThis.__signal;
console.log(`\n${fail ? '✗' : '✓'} surface: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
