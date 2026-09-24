// SIGNAL R1 · lane S · glitch-worklet.ts — THE DROPOUT METER the gate reads through window.__signal.glitches().
// New code: neither Studio tree has one (docs/signal-map/G-state-boot-gate.md §8.2 sketches the probe).
//
// An AudioWorkletProcessor 'sig-glitch' hung as a SINK (one input, NO output) on a tap: the out's post-clamp node,
// or nothing. Every process() call is one render quantum. It counts them (`blocks`) and reads the global
// `currentFrame`: when the frame advanced by MORE than 1.5 quanta beyond what the calls so far rendered, quanta were
// skipped, a dropout (`gaps`; `maxGapMs` = the longest stretch of frames no call covered). A call that finds the frame
// NOT advanced (Chromium hands process() a stale currentFrame now and then while the main thread holds the graph,
// then catches up with a double or triple step on the next call: MEASURED, the r1-G probe, frame span = exactly
// (calls − 1) × 128) owes its quantum to the next step, which is then no gap. The counts are posted to the node on
// the first block and then every 250 ms of audio time, so read() is at most 250 ms stale; blocks 0 = installed but no
// quantum rendered yet (a suspended context). What `gaps` cannot see: an underrun. The graph renders every quantum,
// late but in order, and currentFrame never skips (MEASURED in Chromium, the r1-S smoke: a render thread overloaded for
// 3 s fell 1.03 s behind the wall clock with gaps 0). So read() carries one more number, beyond the brief's three:
// `lagMs`, the render time lost against the wall clock while the context runs (createLagMeter, below).
//
// The processor is a source string (a Blob URL), registered ONCE PER CONTEXT through a WeakMap:
// from signal-studio-page/src/engine/fx-worklet.ts:1025-1048 (296ea5c) — ADAPTED: a failure of any kind (no
//   audioWorklet on an insecure origin, a refused module, a refused node) resolves a STUB that reads
//   {blocks: −1, gaps: 0, maxGapMs: 0} (and lagMs, which needs no worklet); the install never rejects.
// Its arithmetic is GAP_MATH_SRC, which glitch-worklet's suite evaluates as well: the tested maths IS the shipped maths.

export const GLITCH_PROCESSOR = 'sig-glitch';
/** A call that finds currentFrame more than this many quanta on from the last one (after any quantum a stale call
 *  before it still owed) is a dropout. */
export const GAP_QUANTA = 1.5;
/** The processor posts its counts this often (audio time). */
export const GLITCH_POST_MS = 250;
/** The Web Audio render quantum, when the input carries no channel to measure it by. */
export const QUANTUM = 128;

export interface GlitchReading {
  blocks: number; gaps: number; maxGapMs: number;
  /** ADDITIVE (not in types.ts): ms the context's clock has fallen behind the wall clock while running, cumulative
   *  since the install (createLagMeter). */
  lagMs: number;
}
export interface GlitchMeter {
  /** The newest counts the processor posted (cumulative since the install). */
  read(): GlitchReading;
  /** Unhook from the tap and let the processor end (its process() returns false). */
  dispose(): void;
}

/**
 * The meter's arithmetic, as plain JS source (it runs inside AudioWorkletGlobalScope, which imports nothing):
 *   gapInit()                    → a fresh state
 *   gapStep(st, frame, quantum)  → one process() call at `frame` (the global currentFrame); `quantum` = its length
 *   gapRead(st, sampleRate)      → { blocks, gaps, maxGapMs }
 * The first call is never a gap. A frame that does not advance a whole quantum (a stale currentFrame: Chromium, under
 * load) is no gap either: the frames it fell short by are OWED, and the next advancing step pays them back first (the
 * catch-up step after a stale call is 2 or 3 quanta, and no quantum was skipped). A debt the next step does not use is
 * dropped with it: only the step straight after the stale calls may cancel against them.
 */
export const GAP_MATH_SRC = `
function gapInit() { return { blocks: 0, gaps: 0, maxGapFrames: 0, last: -1, owed: 0 }; }
function gapStep(st, frame, quantum) {
  st.blocks++;
  if (st.last >= 0) {
    var d = frame - st.last;
    if (d < quantum) {
      st.owed += quantum - d;
    } else {
      var miss = d - quantum - st.owed;
      st.owed = 0;
      if (miss > ${GAP_QUANTA - 1} * quantum) {
        st.gaps++;
        if (miss > st.maxGapFrames) st.maxGapFrames = miss;
      }
    }
  }
  st.last = frame;
  return st;
}
function gapRead(st, sr) {
  return { blocks: st.blocks, gaps: st.gaps, maxGapMs: sr > 0 ? (st.maxGapFrames / sr) * 1000 : 0 };
}
`;

/** The whole worklet module: the maths above plus the processor. */
export const GLITCH_WORKLET_SRC = `${GAP_MATH_SRC}
class SigGlitch extends AudioWorkletProcessor {
  constructor() {
    super();
    this.st = gapInit();
    this.every = Math.max(${QUANTUM}, Math.round((sampleRate * ${GLITCH_POST_MS}) / 1000));
    this.next = -1;
    this.alive = true;
    this.port.onmessage = (e) => { if (e.data === 'dispose') this.alive = false; };
  }
  process(inputs) {
    var ch = inputs[0] && inputs[0][0];
    gapStep(this.st, currentFrame, ch && ch.length ? ch.length : ${QUANTUM});
    if (this.next < 0 || currentFrame >= this.next) {
      this.next = currentFrame + this.every;
      this.port.postMessage(gapRead(this.st, sampleRate));
    }
    return this.alive;
  }
}
registerProcessor('${GLITCH_PROCESSOR}', SigGlitch);
`;

/**
 * THE RENDER'S LAG: how far the context's clock has fallen behind the wall clock while it runs, in ms, CUMULATIVE since
 * the install (judge a window by its difference). Main thread only (ctx.currentTime against performance.now(); no
 * worklet needed), stretch by stretch: a suspended or closed stretch is not lag, and a stretch where audio runs AHEAD
 * (currentTime moves in device-callback steps) counts as 0, never negative. Measured in Chromium (the r1-S smoke):
 * installed on a SUSPENDED context (the page's boot) it reads 6-11 ms and stays flat; installed on a RUNNING one it
 * steps 15-55 ms in its first 250 ms (the render moving onto the worklet thread), then stays flat within ±3 ms; a
 * render overloaded for 3 s added 1020 ms, for good, since the time it lost is never rendered.
 */
export function createLagMeter(ctx: BaseAudioContext,
  now: () => number = () => performance.now()): { ms(): number; dispose(): void } {
  const c = ctx as Partial<BaseAudioContext>;
  if (typeof c.currentTime !== 'number' || typeof c.addEventListener !== 'function') {
    return { ms: () => 0, dispose() { /* no clock to read */ } };
  }
  let folded = 0, w0 = 0, a0 = 0, running = false;
  const behind = (): number => Math.max(0, (now() - w0) / 1000 - (ctx.currentTime - a0));
  const seat = (): void => { running = ctx.state === 'running'; w0 = now(); a0 = ctx.currentTime; };
  const onState = (): void => { if (running) folded += behind(); seat(); };
  seat();
  ctx.addEventListener('statechange', onState);
  return {
    ms: () => (folded + (running ? behind() : 0)) * 1000,
    dispose: () => ctx.removeEventListener('statechange', onState),
  };
}
const tenth = (x: number): number => Math.round(x * 10) / 10;

const STUB = { blocks: -1, gaps: 0, maxGapMs: 0 };
/** No processor: blocks −1; the lag still reads (it needs no worklet). */
function stub(ctx: BaseAudioContext): GlitchMeter {
  const lag = createLagMeter(ctx);
  return { read: () => ({ ...STUB, lagMs: tenth(lag.ms()) }), dispose: () => lag.dispose() };
}

// Registration is PER CONTEXT (page fx-worklet.ts:1025-1028): a module-level promise would answer "ready" for a
// context that never loaded the processor, and the node would throw `unknown processor`.
const _byCtx = new WeakMap<BaseAudioContext, Promise<boolean>>();

function ensureGlitchWorklet(ctx: BaseAudioContext): Promise<boolean> {
  const hit = _byCtx.get(ctx);
  if (hit) return hit;
  const wk = (ctx as BaseAudioContext & { audioWorklet?: AudioWorklet }).audioWorklet;
  let p: Promise<boolean>;
  if (!wk || typeof AudioWorkletNode === 'undefined' || typeof URL === 'undefined'
    || typeof URL.createObjectURL !== 'function' || typeof Blob === 'undefined') {
    p = Promise.resolve(false);
  } else {
    try {
      const url = URL.createObjectURL(new Blob([GLITCH_WORKLET_SRC], { type: 'application/javascript' }));
      p = wk.addModule(url).then(
        () => { URL.revokeObjectURL(url); return true; },
        (e: unknown) => { URL.revokeObjectURL(url); console.warn('[signal] the glitch meter could not load', e); return false; },
      );
    } catch (e) {
      console.warn('[signal] the glitch meter could not load', e);
      p = Promise.resolve(false);
    }
  }
  _byCtx.set(ctx, p);
  return p;
}

const count = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
function asReading(x: unknown): Omit<GlitchReading, 'lagMs'> | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  const blocks = count(o.blocks), gaps = count(o.gaps), maxGapMs = count(o.maxGapMs);
  return blocks === null || gaps === null || maxGapMs === null ? null : { blocks, gaps, maxGapMs };
}

/**
 * Hang the meter on `tap` (a sink: nothing leaves it). Resolves once the processor runs in this context, or with the
 * stub ({blocks: −1, gaps: 0, maxGapMs: 0, lagMs}) when it cannot; never rejects. Without a tap the node hangs on
 * nothing and still counts quanta (a zero-output AudioWorkletNode is rendered on its own: measured in Chromium).
 */
export async function installGlitchMeter(ctx: BaseAudioContext, tap?: AudioNode | null): Promise<GlitchMeter> {
  let ok = false;
  try { ok = await ensureGlitchWorklet(ctx); } catch { ok = false; }
  if (!ok) return stub(ctx);
  let node: AudioWorkletNode;
  try {
    node = new AudioWorkletNode(ctx, GLITCH_PROCESSOR, {
      numberOfInputs: 1, numberOfOutputs: 0,
      channelCount: 1, channelCountMode: 'explicit', channelInterpretation: 'speakers',
    });
  } catch (e) {
    console.warn('[signal] the glitch meter could not start', e);
    return stub(ctx);
  }
  const lag = createLagMeter(ctx);
  let last: Omit<GlitchReading, 'lagMs'> = { blocks: 0, gaps: 0, maxGapMs: 0 };
  node.port.onmessage = (e: MessageEvent) => { const r = asReading(e.data); if (r) last = r; };
  if (tap) { try { tap.connect(node); } catch (e) { console.warn('[signal] the glitch meter could not reach its tap', e); } }
  let hung = true;
  return {
    read: () => ({ ...last, lagMs: tenth(lag.ms()) }),
    dispose() {
      if (!hung) return;
      hung = false;
      lag.dispose();
      if (tap) { try { tap.disconnect(node); } catch { /* already apart */ } }
      try { node.port.postMessage('dispose'); } catch { /* port closed */ }
      node.port.onmessage = null;
    },
  };
}
