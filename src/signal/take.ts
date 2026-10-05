// SIGNAL · THE TAKE (2026-09-30, the export round). The instrument listens all the time — the story's own law: there is
// no record button to forget. A worklet on the engine's one exit (out.ts `post`, post-clamp, pre-mute) keeps what was
// played, up to TAKE_MAX_S deep, as 16-bit stereo; "export your song" prints it as a WAV, the silence either side
// trimmed. Nothing here sounds: the node's output lands on a 0-gain sink so the graph keeps pulling it.
//
//   createTake(ctx, tap) ─▶ { seconds(), hasSound(), reset(), wav(), dispose() }
//
// Registration follows fx-worklet.ts: per context, a Blob-URL addModule, false when the browser has no AudioWorklet
// (then there is no take and the export control never mounts).

/** How much is kept: the LAST five minutes (a rolling window; older sound falls off the front). */
export const TAKE_MAX_S = 300;
/** Below this peak a chunk is silence (≈ −56 dBFS; a master stop takes the exit under −90). */
export const TAKE_SILENCE = 0.0015;
/** Air kept before the first sound and after the last, in seconds. */
export const TAKE_PAD_S = 0.15;
export const TAKE_TAIL_S = 0.4;
/** Frames per chunk the worklet posts (32 render quanta). */
export const TAKE_CHUNK = 4096;

const WORKLET_SRC = `
class SignalTake extends AudioWorkletProcessor {
  constructor() { super(); this.n = 0; this.L = new Float32Array(${TAKE_CHUNK}); this.R = new Float32Array(${TAKE_CHUNK}); }
  flush() {
    if (!this.n) return;
    const L = this.L.slice(0, this.n), R = this.R.slice(0, this.n);
    this.port.postMessage({ l: L, r: R }, [L.buffer, R.buffer]);
    this.n = 0;
  }
  process(inputs) {
    const inp = inputs[0];
    if (!inp || !inp.length || !inp[0]) return true;
    const l = inp[0], r = inp[1] || inp[0], k = l.length;
    if (this.n + k > ${TAKE_CHUNK}) this.flush();
    this.L.set(l, this.n); this.R.set(r, this.n); this.n += k;
    if (this.n >= ${TAKE_CHUNK}) this.flush();
    return true;
  }
}
registerProcessor('signal-take', SignalTake);
`;

const _byCtx = new WeakMap<BaseAudioContext, Promise<boolean>>();
export function ensureTakeWorklet(ctx: BaseAudioContext): Promise<boolean> {
  const hit = _byCtx.get(ctx);
  if (hit) return hit;
  const anyCtx = ctx as BaseAudioContext & { audioWorklet?: AudioWorklet };
  if (!anyCtx.audioWorklet) { const p = Promise.resolve(false); _byCtx.set(ctx, p); return p; }
  const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }));
  const p = anyCtx.audioWorklet.addModule(url)
    .then(() => { URL.revokeObjectURL(url); return true; })
    .catch((e) => { URL.revokeObjectURL(url); console.warn('[signal-take] addModule failed', e); return false; });
  _byCtx.set(ctx, p);
  return p;
}

/** One posted chunk, kept as interleaved 16-bit stereo with its peak (0..1) and its length in frames. */
export interface TakeChunk { pcm: Int16Array; peak: number; n: number }

/** Float stereo → one interleaved Int16 chunk + its peak. Pure; the suites call it. */
export function packChunk(l: Float32Array, r: Float32Array): TakeChunk {
  const n = Math.min(l.length, r.length);
  const pcm = new Int16Array(n * 2);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const a = l[i], b = r[i];
    const pa = a < 0 ? -a : a, pb = b < 0 ? -b : b;
    if (pa > peak) peak = pa;
    if (pb > peak) peak = pb;
    pcm[i * 2] = a <= -1 ? -32768 : a >= 1 ? 32767 : (a * 32767) | 0;
    pcm[i * 2 + 1] = b <= -1 ? -32768 : b >= 1 ? 32767 : (b * 32767) | 0;
  }
  return { pcm, peak, n };
}

/** The chunks that make the song: from TAKE_PAD_S before the first sounding chunk to TAKE_TAIL_S after the last.
 *  Returns [first, lastExclusive] chunk indices, or null when nothing sounded. Pure. */
export function trimBounds(chunks: ReadonlyArray<TakeChunk>, sampleRate: number, silence = TAKE_SILENCE): [number, number] | null {
  let first = -1, last = -1;
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].peak > silence) { if (first < 0) first = i; last = i; }
  }
  if (first < 0) return null;
  const frames = chunks[0]?.n || TAKE_CHUNK;
  const pad = Math.ceil((TAKE_PAD_S * sampleRate) / frames);
  const tail = Math.ceil((TAKE_TAIL_S * sampleRate) / frames);
  return [Math.max(0, first - pad), Math.min(chunks.length, last + 1 + tail)];
}

/** A RIFF/WAVE header for 16-bit stereo PCM of `frames` frames. Pure. */
export function wavHeader(frames: number, sampleRate: number, channels = 2): ArrayBuffer {
  const bytes = frames * channels * 2;
  const b = new ArrayBuffer(44);
  const v = new DataView(b);
  const str = (o: number, s: string): void => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * channels * 2, true); v.setUint16(32, channels * 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, bytes, true);
  return b;
}

/** The WAV of a run of chunks, trimmed by trimBounds. Pure (Blob only). */
export function wavOf(chunks: ReadonlyArray<TakeChunk>, sampleRate: number): { blob: Blob; frames: number } | null {
  const b = trimBounds(chunks, sampleRate);
  if (!b) return null;
  const run = chunks.slice(b[0], b[1]);
  const frames = run.reduce((s, c) => s + c.n, 0);
  const parts: BlobPart[] = [wavHeader(frames, sampleRate)];
  for (const c of run) parts.push(c.pcm.buffer as ArrayBuffer);
  return { blob: new Blob(parts, { type: 'audio/wav' }), frames };
}

export interface Take {
  /** Seconds of the song so far: from the first sound to now (capped at TAKE_MAX_S). 0 before any sound. */
  seconds(): number;
  hasSound(): boolean;
  /** A new song: the power came on. */
  reset(): void;
  /** The song as a WAV, or null when nothing sounded. */
  wav(): { blob: Blob; frames: number; seconds: number } | null;
  /** The song's shape: `n` peaks (0..1) over the trimmed run, for a drawn waveform (the payoff, 2026-10-05). Read-only. */
  peaks(n: number): number[];
  dispose(): void;
}

/** `n` peaks over the trimmed run of chunks, each the max of its share, normalised to the loudest. Pure. */
export function peaksOf(chunks: ReadonlyArray<TakeChunk>, sampleRate: number, n: number): number[] {
  const b = trimBounds(chunks, sampleRate);
  if (!b || n <= 0) return [];
  const run = chunks.slice(b[0], b[1]);
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < run.length; i++) {
    const k = Math.min(n - 1, Math.floor((i / run.length) * n));
    if (run[i].peak > out[k]) out[k] = run[i].peak;
  }
  const top = Math.max(...out, 1e-6);
  return out.map((v) => v / top);
}

/** Hang the take on the exit. Resolves null when the browser has no AudioWorklet. */
export async function createTake(ctx: AudioContext, tap: AudioNode): Promise<Take | null> {
  if (!(await ensureTakeWorklet(ctx))) return null;
  let node: AudioWorkletNode;
  try {
    node = new AudioWorkletNode(ctx, 'signal-take', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' });
  } catch (e) { console.warn('[signal-take] the node could not be built', e); return null; }
  const sink = ctx.createGain(); sink.gain.value = 0;
  try { tap.connect(node); node.connect(sink); sink.connect(ctx.destination); } catch (e) { console.warn('[signal-take] could not wire', e); return null; }

  const sr = ctx.sampleRate;
  const maxFrames = TAKE_MAX_S * sr;
  let chunks: TakeChunk[] = [];
  let kept = 0;            // frames in `chunks`
  let total = 0;           // frames received since the reset (monotonic)
  let firstSound = -1;     // `total` at the first sounding chunk since the reset
  node.port.onmessage = (e: MessageEvent<{ l: Float32Array; r: Float32Array }>) => {
    const c = packChunk(e.data.l, e.data.r);
    chunks.push(c); kept += c.n; total += c.n;
    if (firstSound < 0 && c.peak > TAKE_SILENCE) firstSound = total - c.n;
    while (kept > maxFrames && chunks.length > 1) { const d = chunks.shift()!; kept -= d.n; }
  };
  return {
    seconds: () => (firstSound < 0 ? 0 : Math.min(TAKE_MAX_S, (total - firstSound) / sr)),
    hasSound: () => firstSound >= 0,
    reset() { chunks = []; kept = 0; total = 0; firstSound = -1; },
    wav() {
      const w = wavOf(chunks, sr);
      return w ? { ...w, seconds: w.frames / sr } : null;
    },
    peaks: (n) => peaksOf(chunks, sr, n),
    dispose() {
      node.port.onmessage = null;
      try { tap.disconnect(node); } catch { /* */ }
      try { node.disconnect(); sink.disconnect(); } catch { /* */ }
      chunks = [];
    },
  };
}
