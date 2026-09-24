// SIGNAL · lane O · THE FOUR ROOMS: the REV ladder's assets, fetched, decoded, checked and mounted.
//
// The assets are four stereo AAC-LC 96 kbps .m4a at 24 kHz under `<ripRoot>/ir/` with `ir.json` beside them
// ({slot, url, seconds, onsetMs, bytes}[]), written by scripts/signal/ir-encode.mjs (E-effects-out.md §4.3): SM / MED /
// HALL are the Studio bundle's own cuts (vvv_room_small 0.45 s, vvv_chamber_medium 1.10 s, vvv_concerthall_large
// 2.20 s), VAST is vvv_cathedral_vast cut at 4.0 s, all with the bundle's 120 ms exponential taper, at the printed set
// gain. They replace ir-default.ts (483 KB of base64 PCM) + ir-set.ts:27-90 (the decode + OfflineAudioContext
// resample): decodeAudioData on the live context resamples to its own rate, which is what a ConvolverNode needs.
//
// LOAD ORDER (E §4.3): prefetch() fetches the manifest and decodes SM at idle after boot (8 KB; no mount).
// mountFirst() — the integrator's wake(), and effects.apply() the first time reverb > 0 — mounts SM on the macrotask
// after its decode lands (never inside the click that asked), then MED, HALL, VAST, ONE PER requestIdleCallback
// (a `.buffer` assign is synchronous on the main thread: E budgeted ≈ 35 ms per IR-second; measured 2026-09-23 in
// headless Chrome 153 on the M3: assign 1.1 / 2.6 / 4.9 / 8.4 ms, decode 2.8 / 4.7 / 7.1 / 12.3 ms for SM / MED / HALL /
// VAST). want(slot) — a rung picked before it is mounted — skips the idle waits for that rung.
//
// THE ONSET CHECK (E §4.3): a decoder that kept the AAC priming (2112 samples at 24 k) would add 88 ms of pre-delay.
// ir.json stores each file's onset as ffmpeg decodes it (edit list honoured): the first sample, either channel, above
// peak·1e-2. The decoded buffer is shifted so ITS first such sample lands there, then trimmed to the stored length
// (the decoder's +1.2–1.4 k padding frames go).
//
// THE MOUNT: from signal-studio-v6lib/src/engine/core.ts:749-780 (2a9e4a7) — setIrSlot's silent law, ADAPTED: the
// rung's OUTPUT gain is pinned to 0, the buffer assigned (which resets the convolver), then eased back τ 6 ms after
// 20 ms, to 1 always (selection lives on effects.ts's per-rung INPUT taps, E §4.4, not on these gains).

import type { IrAsset, RevSize } from './types.ts';

export const REV_SLOTS: readonly RevSize[] = ['sm', 'med', 'hall', 'vast'];
/** The onset rule: the first sample above this fraction of the file's peak (either channel). */
export const IR_ONSET_RATIO = 1e-2;
/** setIrSlot (core.ts:777-779): the slot gain eases back τ 6 ms, 20 ms after the assign. */
export const IR_MOUNT_DELAY = 0.02;
export const IR_MOUNT_TAU = 0.006;

type Chans = ReadonlyArray<ArrayLike<number>>;

/** First index where any channel exceeds peak·ratio; 0 for silence. */
export function onsetIndex(chans: Chans, ratio = IR_ONSET_RATIO): number {
  let peak = 0;
  let n = 0;
  for (const x of chans) {
    n = Math.max(n, x.length);
    for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; }
  }
  if (!(peak > 0)) return 0;
  const th = peak * ratio;
  for (let i = 0; i < n; i++) for (const x of chans) if (i < x.length && Math.abs(x[i]) > th) return i;
  return 0;
}

/** Shift the decoded channels so their onset lands on the stored one, trimmed (or zero-padded) to the stored length.
 *  Pure: the node suite runs it on synthetic buffers. `shift` > 0 = the decoder was late (priming kept). */
export function prepIr(chans: Chans, sr: number, asset: Pick<IrAsset, 'seconds' | 'onsetMs'>):
  { chans: Float32Array[]; shift: number; length: number } {
  const length = Math.max(1, Math.round(asset.seconds * sr));
  const want = Math.max(0, Math.round((asset.onsetMs / 1000) * sr));
  const shift = onsetIndex(chans) - want;
  const out = chans.map((x) => {
    const y = new Float32Array(length);
    for (let i = 0; i < length; i++) { const j = i + shift; if (j >= 0 && j < x.length) y[i] = x[j]; }
    return y;
  });
  return { chans: out, shift, length };
}

/** ir.json → validated assets, urls resolved against `base` (the manifest's folder, with a trailing slash). Entries
 *  that are not a known slot or carry a non-finite number are dropped; the first entry per slot wins. */
export function parseIrManifest(raw: unknown, base: string): IrAsset[] {
  const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && Array.isArray((raw as { irs?: unknown }).irs))
    ? (raw as { irs: unknown[] }).irs : [];
  const out: IrAsset[] = [];
  const seen = new Set<string>();
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const r = e as Record<string, unknown>;
    const slot = r.slot as RevSize;
    if (!REV_SLOTS.includes(slot) || seen.has(slot)) continue;
    const url = typeof r.url === 'string' && r.url ? r.url : `${slot}.m4a`;
    const seconds = Number(r.seconds), onsetMs = Number(r.onsetMs), bytes = Number(r.bytes ?? 0);
    if (!(seconds > 0) || !Number.isFinite(seconds) || !(onsetMs >= 0) || !Number.isFinite(onsetMs) || !Number.isFinite(bytes)) continue;
    seen.add(slot);
    out.push({ slot, url: /^([a-z][a-z0-9+.-]*:|\/)/i.test(url) ? url : base + url, seconds, onsetMs, bytes });
  }
  return out;
}

/** One rung of the ladder as effects.ts builds it: the convolver and the gain after it (the mount law's gain). */
export interface IrRung { conv: ConvolverNode; out: GainNode }

export interface IrSet {
  /** Fetch the manifest and decode SM at idle (no mount). Boot calls it; it never throws. */
  prefetch(): void;
  /** Mount SM (the macrotask after its decode lands), then MED, HALL, VAST one per idle callback. Idempotent. */
  mountFirst(): void;
  /** A rung picked before it is mounted: fetch, decode and mount it now, skipping the idle waits. */
  want(slot: RevSize): void;
  mounted(slot: RevSize): boolean;
  /** The mounted IR's length in seconds (0 until mounted): the tail a park or a hush waits out. */
  seconds(slot: RevSize): number;
  assets(): Array<IrAsset & { mounted: boolean }>;
}

export interface IrSetDeps {
  ctx: BaseAudioContext;
  ripRoot: string;
  rungs: Record<RevSize, IrRung>;
  /** Injected by the node suite; the page uses the global fetch. */
  fetch?: (url: string) => Promise<{ ok: boolean; status?: number; json(): Promise<unknown>; arrayBuffer(): Promise<ArrayBuffer> }>;
  /** Injected by the node suite; the page uses requestIdleCallback (setTimeout where there is none: Safari). */
  idle?: (fn: () => void) => void;
  onMount?: (slot: RevSize) => void;
}

const warn = (...a: unknown[]): void => { try { console.warn('[signal-ir]', ...a); } catch { /* no console */ } };

function defaultIdle(fn: () => void): void {
  const w = globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(() => fn(), { timeout: 2000 });
  else setTimeout(fn, 60);
}

/** decodeAudioData in both of its shapes (old WebKit answers only through the callbacks). */
function decode(ctx: BaseAudioContext, ab: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      const p = ctx.decodeAudioData(ab, resolve, reject) as Promise<AudioBuffer> | undefined;
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    } catch (e) { reject(e); }
  });
}

export function createIrSet(d: IrSetDeps): IrSet {
  const { ctx, rungs } = d;
  const base = `${d.ripRoot.replace(/\/+$/, '')}/ir/`;
  const doFetch = d.fetch ?? ((url: string) => fetch(url));
  const idle = d.idle ?? defaultIdle;
  const macrotask = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

  let manifestP: Promise<IrAsset[]> | null = null;
  let assetList: IrAsset[] = [];
  const loads: Partial<Record<RevSize, Promise<AudioBuffer | null>>> = {};
  const mounting: Partial<Record<RevSize, Promise<boolean>>> = {};
  const mountedSec: Partial<Record<RevSize, number>> = {};
  const urgent = new Set<RevSize>();
  const hurry: Partial<Record<RevSize, () => void>> = {};
  let first = false;

  function manifest(): Promise<IrAsset[]> {
    if (manifestP) return manifestP;
    const p = (async (): Promise<IrAsset[]> => {
      const r = await doFetch(`${base}ir.json`);
      if (!r.ok) throw new Error(`ir.json ${r.status ?? ''}`);
      const list = parseIrManifest(await r.json(), base);
      if (!list.length) throw new Error('ir.json holds no usable room');
      assetList = list;
      return list;
    })();
    manifestP = p;
    p.catch((e) => { warn('manifest', e); if (manifestP === p) manifestP = null; });   // a later call retries
    return p;
  }

  function load(slot: RevSize): Promise<AudioBuffer | null> {
    const hit = loads[slot];
    if (hit) return hit;
    const p = (async (): Promise<AudioBuffer | null> => {
      const a = (await manifest()).find((x) => x.slot === slot);
      if (!a) throw new Error(`no ${slot} in ir.json`);
      const r = await doFetch(a.url);
      if (!r.ok) throw new Error(`${a.url} ${r.status ?? ''}`);
      const dec = await decode(ctx, await r.arrayBuffer());
      const src: Float32Array[] = [];
      for (let c = 0; c < dec.numberOfChannels; c++) src.push(dec.getChannelData(c));
      const prep = prepIr(src, dec.sampleRate, a);
      if (Math.abs(prep.shift) > Math.round(0.002 * dec.sampleRate)) warn(slot, 'onset shifted by', prep.shift, 'frames (decoder priming)');
      const buf = ctx.createBuffer(prep.chans.length, prep.length, dec.sampleRate);
      prep.chans.forEach((x, c) => buf.getChannelData(c).set(x));
      return buf;
    })().catch((e) => { warn(slot, e); delete loads[slot]; return null; });
    loads[slot] = p;
    return p;
  }

  /** An idle callback, or a macrotask once the rung is wanted (want() also cuts a pending wait short). */
  function waitFor(slot: RevSize, viaIdle: boolean): Promise<void> {
    if (!viaIdle || urgent.has(slot)) return macrotask();
    return new Promise((resolve) => {
      let done = false;
      const go = (): void => { if (done) return; done = true; if (hurry[slot] === go) delete hurry[slot]; resolve(); };
      hurry[slot] = go;
      idle(go);
    });
  }

  function assign(slot: RevSize, buf: AudioBuffer): void {
    const r = rungs[slot];
    if (!r) return;
    if (buf.sampleRate !== ctx.sampleRate) { warn(slot, 'is', buf.sampleRate, 'Hz, the context', ctx.sampleRate, ': not mounted'); return; }
    const g = r.out.gain;
    const t = ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0, t);
    r.conv.buffer = buf;
    if (t === 0) g.setValueAtTime(1, 0);
    else g.setTargetAtTime(1, t + IR_MOUNT_DELAY, IR_MOUNT_TAU);
    mountedSec[slot] = buf.duration;
    try { d.onMount?.(slot); } catch { /* a listener's problem */ }
  }

  function mount(slot: RevSize, viaIdle: boolean): Promise<boolean> {
    const hit = mounting[slot];
    if (hit) return hit;
    const p = (async (): Promise<boolean> => {
      if (mountedSec[slot]) return true;
      await waitFor(slot, viaIdle);
      const buf = await load(slot);
      if (!buf) return false;
      await waitFor(slot, viaIdle);                   // the assign is the stall: its own idle slot, never the click
      assign(slot, buf);
      return true;
    })().catch((e) => { warn(slot, e); return false; }).then((ok) => { if (!ok) delete mounting[slot]; return ok; });
    mounting[slot] = p;
    return p;
  }

  return {
    prefetch(): void {
      idle(() => { void load('sm'); });
    },
    mountFirst(): void {
      if (first) return;
      first = true;
      void (async () => {
        await mount('sm', false);
        for (const s of ['med', 'hall', 'vast'] as const) await mount(s, true);
      })();
    },
    want(slot: RevSize): void {
      if (!REV_SLOTS.includes(slot) || mountedSec[slot]) return;
      urgent.add(slot);
      const h = hurry[slot];
      if (h) h();
      if (!mounting[slot]) void mount(slot, false);
    },
    mounted: (slot: RevSize): boolean => !!mountedSec[slot],
    seconds: (slot: RevSize): number => mountedSec[slot] ?? 0,
    assets: (): Array<IrAsset & { mounted: boolean }> => assetList.map((a) => ({ ...a, mounted: !!mountedSec[a.slot] })),
  };
}
