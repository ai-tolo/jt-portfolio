// SIGNAL · lane K · THE KEYS. The four rips under the visitor's fingers: one owner for everything between a
// manifest on the unlisted path and `keys.out` (the dry sum the integrator wires into the one low-pass).
//
//   pick(v) ──▶ <ripRoot>/<v>.json ──parseManifest──▶ specs (loop points: 48 k samples ÷ the manifest's sr)
//          ──middleFirst──▶ fetch pool(6) + decodeAudioData, the zones nearest middle C first
//          ──▶ the first 7 settled: createMultisample(first batch) ─swap─▶ ready()   (pending notes sound here)
//          ──▶ all settled:         createMultisample(every zone)  ─swap─▶ full      (held notes keep their voice)
//
//   resident gain (the current voice) ──────────────────────────────┐
//   resident gain (a voice or a batch that still rings, ≤ 300 ms) ──┴─▶ out (GainNode, unity) ─▶ [integrator] filter
//
// Adapted from THE PAGE's keys lane (signal-studio-page/src/page/keys.ts @ 67b6b58, per C §7 "Keep"): the guarded
// manifest parse, the pool, the per-voice GainNode destination with the Studio's keys params, the owner map that
// carries a held note across a voice swap, the drop law (dispose, disconnect 150 ms later), allOff over every
// resident. Cut (C §7): Web MIDI, the sustain machine, the expression router, the note log, the shelf. New (C §7):
// middle-first loading in two swaps, the pending set (a key pressed before the first batch lands sounds when it
// lands, if still held), allOff on blur + hidden, and the contract's Keys surface (hit, bend, retune, held).
//
// Laws kept here:
// - SHIFT 0 IS THE LAW (NOTES §1 KEYS): loop seconds = samples ÷ 48000 (the manifest's sr), never ÷ the decoded
//   buffer's rate, and never moved by the onset. The onset is a sanity check only: a warning when the decoded
//   onset differs from the manifest's by more than 0.1 s. The seam is re-baked at LOAD by createMultisample.
// - THE GUARD LAW (P/keys.ts:27-29): a broken rip never throws into the jam. Every fetch, decode, build and voice
//   call is caught; a voice that cannot load leaves the previous voice sounding; pick() never rejects.
// - NOTHING IS FETCHED UNTIL pick() (or set('voice')): the boot fetches the saved voice INSTEAD of the default
//   (G §3), so createKeys itself is silent on the network.
// Erasable TypeScript only (node 24 type-strips this file for keys.test.mjs).

import {
  VOICES, VOICE_DEFAULT, LFO_DIVS,
  type CreateKeys, type DelayDiv, type DriveType, type Keys, type KeysDeps, type KeysState, type LfoDiv,
  type LfoShape, type ModMode, type RevSize, type VoiceId,
} from './types.ts';
import {
  createMultisample, createSamplePlayer,
  type MultisampleInstrument, type MultisampleParams, type MultisampleZone,
} from './sampler.ts';

// ─────────────────────────────────────────────────────────────── constants

/** The Studio's keys mount (views/instrument/index.ts:1198), as THE PAGE mounts a rip (P/keys.ts:44-45). */
const MS_PARAMS: Partial<MultisampleParams> = { layerMix: 1, mode: 'loop', release: 0.09, hitFade: 0.018 };
/** The keyboard's constant velocity (core.ts:869, passed at 880). */
export const VEL_DEFAULT = 0.9;
/** Middle-first: the first playable batch (at the rips' 3 st spacing, 60 ± 9 st) … */
export const FIRST_BATCH = 7;
/** … ordered by distance from middle C. */
export const MIDDLE_MIDI = 60;
/** RipZone loop points are INTEGER samples at 48 k in the shipped file (types.ts RipZone). */
export const RIP_SR = 48000;
/** The onset fingerprint's threshold (scripts/signal/rip-encode.mjs ONSET_ABS) and the warning bound. */
export const ONSET_ABS = 0.02;
export const ONSET_WARN_SEC = 0.1;
/** A voice is not dropped while its last note fades: release 0.09 s + margin (P/keys.ts:53). */
export const TAIL_MS = 300;
/** The module footer's gain knob sends 1.25·v (unity at the 0.8 detent: E §7). */
export const KEYS_GAIN_MAX = 1.25;
const FETCH_CONCURRENCY = 6;        // P/keys.ts:49 — the browser's per-host cap anyway; bounds decode memory spikes
const BUILD_TIMEOUT_MS = 60000;     // P/keys.ts:52 — a hung host must not leave a voice loading forever
const DISCONNECT_MS = 150;          // P/keys.ts:333-335 — after dispose's 30 ms release, never mid-ramp

const LFO_SHAPES: readonly LfoShape[] = ['sine', 'sawi', 'saw', 'sqr'];
const DRIVE_TYPES: readonly DriveType[] = ['warm', 'crunch', 'tape', 'fuzz'];
const MOD_MODES: readonly ModMode[] = ['phaser', 'flanger', 'doubler', 'chorus'];
const DELAY_DIVS: readonly DelayDiv[] = ['1/4', '1/8', '1/8d', '1/16'];
const REV_SIZES: readonly RevSize[] = ['sm', 'med', 'hall', 'vast'];

// ─────────────────────────────────────────────────────────────── the rip manifest (pure)

/** One zone to fetch: its URL + the zone fields createMultisample takes (loop points already in SECONDS). */
export interface RipZoneSpec {
  url: string;
  file: string;
  /** The cut file's length at 48 k, and its first |x| > 0.02 (a sanity check only), as the manifest has them. */
  frames: number | undefined;
  onset: number | undefined;
  zone: Omit<MultisampleZone, 'buffer'>;
}
export interface ParsedRip {
  id: string; name: string;
  /** The rate the manifest's sample counts are at (48000 for every shipped rip). */
  sr: number;
  channels: number; bytes: number;
  specs: RipZoneSpec[];
  /** Zones the manifest lists (specs.length < total when some were unusable). */
  total: number;
}

// ═══ from signal-studio-page/src/page/keys.ts:73 (67b6b58) ═══
const num = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);

// ═══ adapted from signal-studio-page/src/page/keys.ts:81-113 (67b6b58) — ripZones, re-typed to types.ts RipManifest ═══
/** The manifest's zones as fetchable specs. Zones without a file or a finite rootMidi are dropped here (the caller
 *  counts them against `total`); JSON null → undefined. Throws only when the JSON is not a rip at all. Loop points
 *  convert with the MANIFEST's rate (48000), never the decoded buffer's: a 44.1 k context decodes the same seconds. */
export function parseManifest(json: unknown, root: string): ParsedRip {
  const man = json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
  if (!man || !Array.isArray(man.zones) || !man.zones.length) throw new Error('not a keys rip (no zones)');
  const sr = num(man.sr) !== undefined && (man.sr as number) > 0 ? (man.sr as number) : RIP_SR;
  const base = String(root ?? '').replace(/\/+$/, '');
  const secs = (x: unknown): number | undefined => { const n = num(x); return n === undefined ? undefined : n / sr; };
  const specs: RipZoneSpec[] = [];
  for (const raw of man.zones as unknown[]) {
    const z = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
    if (!z || typeof z.file !== 'string' || !z.file) continue;
    const rootMidi = num(z.rootMidi);
    if (rootMidi === undefined) continue;
    specs.push({
      url: `${base}/${z.file.replace(/^\/+/, '')}`,
      file: z.file,
      frames: num(z.frames),
      onset: num(z.onset),
      zone: {
        rootMidi,
        loKey: num(z.loKey), hiKey: num(z.hiKey), gain: num(z.gain),
        mode: z.mode === 'decay' ? 'decay' : z.mode === 'sustain' ? 'sustain' : undefined,
        loopStart: secs(z.loopStart), loopEnd: secs(z.loopEnd),
      },
    });
  }
  return {
    id: typeof man.id === 'string' ? man.id : '',
    name: typeof man.name === 'string' ? man.name : '',
    sr, channels: num(man.channels) ?? 1, bytes: num(man.bytes) ?? 0,
    specs, total: man.zones.length,
  };
}

/** MIDDLE-FIRST (C §7 New): nearest to `centre` first; a tie goes to the lower root (the zone map's own tie law). */
export function middleFirst<T extends { zone: { rootMidi: number } }>(specs: readonly T[], centre = MIDDLE_MIDI): T[] {
  return specs.slice().sort((a, b) =>
    Math.abs(a.zone.rootMidi - centre) - Math.abs(b.zone.rootMidi - centre) || a.zone.rootMidi - b.zone.rootMidi);
}

/** The onset fingerprint: the first |x| > threshold (rip-encode.mjs's `onset`), −1 when none. */
export function firstOver(x: ArrayLike<number>, threshold = ONSET_ABS): number {
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > threshold) return i;
  return -1;
}

// ─────────────────────────────────────────────────────────────── the state (defaults = types.ts KeysState's comments)

export function defaultKeysState(): KeysState {
  return {
    voice: VOICE_DEFAULT,
    filter: 1,
    motion: { amount: 0, shape: 'sine', div: '1/8' },
    fx: { drive: 0, driveType: 'warm', mod: 0, modMode: 'chorus', modRate: 0.5, delay: 0, delayDiv: '1/8', reverb: 0.22, revSize: 'sm' },
    gain: 1,
    mute: false,
  };
}

const isVoice = (v: unknown): v is VoiceId => typeof v === 'string' && (VOICES as readonly string[]).includes(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown, dflt: T): T =>
  typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : dflt;
const unit = (v: unknown, dflt: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : dflt);

/** A motion value over the current one, field by field (a partial or a foreign value never blanks a field). */
export function cleanMotion(v: unknown, cur: KeysState['motion']): KeysState['motion'] {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    amount: unit(o.amount, cur.amount),
    shape: oneOf(LFO_SHAPES, o.shape, cur.shape),
    div: oneOf<LfoDiv>(LFO_DIVS, o.div, cur.div),
  };
}
/** The FX value over the current one, field by field (effects.ts owns what they do; keys only keeps them). */
export function cleanFx(v: unknown, cur: KeysState['fx']): KeysState['fx'] {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    drive: unit(o.drive, cur.drive), driveType: oneOf(DRIVE_TYPES, o.driveType, cur.driveType),
    mod: unit(o.mod, cur.mod), modMode: oneOf(MOD_MODES, o.modMode, cur.modMode), modRate: unit(o.modRate, cur.modRate),
    delay: unit(o.delay, cur.delay), delayDiv: oneOf(DELAY_DIVS, o.delayDiv, cur.delayDiv),
    reverb: unit(o.reverb, cur.reverb), revSize: oneOf(REV_SIZES, o.revSize, cur.revSize),
  };
}
const copyState = (s: KeysState): KeysState => ({ ...s, motion: { ...s.motion }, fx: { ...s.fx } });

// ─────────────────────────────────────────────────────────────── helpers

// ═══ from signal-studio-page/src/page/keys.ts:151-158 (67b6b58) ═══
/** Run jobs with at most n in flight; results in job order. Jobs must not reject. */
async function pool<T>(jobs: Array<() => Promise<T>>, n: number): Promise<T[]> {
  const out = new Array<T>(jobs.length);
  let next = 0;
  const worker = async (): Promise<void> => { while (next < jobs.length) { const i = next++; out[i] = await jobs[i](); } };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, jobs.length)) }, worker));
  return out;
}

// ═══ from signal-studio-page/src/page/keys.ts:168-169 (67b6b58) ═══
const clamp01 = (x: number, dflt: number): number => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : dflt);
const hzOf = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

const finiteOr = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
const isZone = (z: MultisampleZone | null | undefined): z is MultisampleZone => !!z;
const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// ─────────────────────────────────────────────────────────────── the keys

interface Resident {
  voice: VoiceId;
  /** Every zone that would decode is in this instrument (false = the middle-first batch). */
  full: boolean;
  ms: MultisampleInstrument;
  /** This batch's own sub-bus → out. Never shared: createMultisample writes its .gain (layerMix). */
  gain: GainNode;
  /** The ids this resident is sounding (the owner map's inverse). A resident that rings is never dropped. */
  ids: Set<string>;
  /** performance.now() ms after which its last release or booked hit has faded (wall clock: ctx time is frozen
   *  while the context is suspended, and eviction must still converge). */
  quietAt: number;
}

interface Load {
  voice: VoiceId;
  ac: AbortController;
  /** Resolves when the first batch plays, or the load ends (aborted, failed): never rejects. */
  first: Promise<void>;
  settle(): void;
}

interface Pending { midi: number; vel: number; when: number | undefined }

export const createKeys: CreateKeys = ({ ctx, ripRoot }: KeysDeps): Keys => {
  const root = String(ripRoot ?? '').replace(/\/+$/, '');
  /** The dry sum of every resident, pre-filter, never automated here (the integrator's filter takes it). */
  const out = ctx.createGain();
  const state = defaultKeysState();

  const residents = new Set<Resident>();
  let cur: Resident | null = null;
  const loads = new Map<VoiceId, Load>();
  let bendCents = 0;

  const owner = new Map<string, Resident>();           // id → the batch sounding it (an old batch keeps its notes)
  const heldMidi = new Map<string, number>();          // id → midi: held() (HOLD included: harmony simply never releases)
  const pending = new Map<string, Pending>();          // pressed before the first batch landed, still down
  const heldCbs = new Set<(held: ReadonlyArray<[string, number]>) => void>();

  const heldList = (): Array<[string, number]> =>
    Array.from(heldMidi, ([id, m]): [string, number] => [id, m]).sort((a, b) => a[1] - b[1]);
  const emitHeld = (): void => {
    for (const cb of Array.from(heldCbs)) {
      try { cb(heldList()); } catch (e) { console.warn('[signal/keys] onHeldChange listener threw', e); }
    }
  };

  // ── residents: build, swap, evict, drop ──────────────────────────────────────────────────────────
  function build(voice: VoiceId, zones: MultisampleZone[], full: boolean): Resident {
    const gain = ctx.createGain();
    // ascending roots: the zone map breaks a nearest-root tie to the FIRST (lower) zone (multisample-map.ts:38)
    const sorted = zones.slice().sort((a, b) => a.rootMidi - b.rootMidi);
    const ms = createMultisample(sorted, createSamplePlayer(ctx), { destination: gain, params: MS_PARAMS });
    gain.connect(out);
    // a DIVE held while the batch lands: its voices start bent like every other voice (P/keys.ts:325-326)
    if (bendCents !== 0) { try { ms.bend(bendCents); } catch { /* */ } }
    return { voice, full, ms, gain, ids: new Set(), quietAt: 0 };
  }

  function swapIn(r: Resident): void {
    const prev = cur;
    residents.add(r);
    cur = r;
    if (prev && prev !== r) evictSoon();
    flushPending();
  }

  // ═══ adapted from signal-studio-page/src/page/keys.ts:330-336 (67b6b58) ═══
  const drop = (r: Resident): void => {
    for (const [id, o] of owner) if (o === r) owner.delete(id);
    try { r.ms.dispose(); } catch { /* */ }
    // disconnect after dispose's 30 ms release so a tail is never cut mid-ramp; the zone buffers go with the last
    // reference to r (dispose() alone frees nothing)
    setTimeout(() => { try { r.gain.disconnect(); } catch { /* */ } }, DISCONNECT_MS);
  };

  let evictTimer: ReturnType<typeof setTimeout> | null = null;
  let evictAt = Infinity;
  function evictSoon(ms = 0): void {
    const at = now() + Math.max(0, ms);
    if (evictTimer !== null && evictAt <= at) return;   // an earlier sweep is booked; it re-books itself
    if (evictTimer !== null) clearTimeout(evictTimer);
    evictAt = at;
    evictTimer = setTimeout(evict, Math.max(0, ms));
  }
  // ═══ adapted from signal-studio-page/src/page/keys.ts:372-387 (67b6b58): keep = the current batch only ═══
  function evict(): void {
    evictTimer = null; evictAt = Infinity;
    const t = now();
    let next = Infinity;
    for (const r of Array.from(residents)) {
      if (r === cur) continue;
      if (r.ids.size) continue;                                   // still held: its release books the next sweep
      if (t < r.quietAt) { next = Math.min(next, r.quietAt); continue; }   // still ringing out: let it finish
      residents.delete(r);
      drop(r);
    }
    if (next < Infinity) evictSoon(next - t + 10);
  }

  // ── notes ────────────────────────────────────────────────────────────────────────────────────────
  function release(r: Resident, id: string, when?: number): void {
    try { r.ms.noteOff(id, when); } catch { /* */ }
    r.ids.delete(id);
    if (owner.get(id) === r) owner.delete(id);
    const ahead = when !== undefined ? Math.max(0, when - ctx.currentTime) * 1000 : 0;
    r.quietAt = Math.max(r.quietAt, now() + ahead + TAIL_MS);
    if (r !== cur && !r.ids.size) evictSoon(r.quietAt - now() + 10);
  }

  /** Start `id` on the current batch. Returns whether held() changed. */
  function start(id: string, midi: number, vel: number, when: number | undefined): boolean {
    const r = cur;
    if (!r) return false;
    const prev = owner.get(id);
    if (prev && prev !== r) release(prev, id);   // the batch changed under a re-struck id: finish it there (P/keys.ts:478-479)
    try {
      r.ms.noteOn(id, hzOf(midi), when, vel);   // the same id on the same batch chokes at 25 ms (multisample.ts:228-229)
    } catch (e) {
      console.warn('[signal/keys] noteOn failed', e);
      return heldMidi.delete(id);
    }
    owner.set(id, r);
    r.ids.add(id);
    const had = heldMidi.get(id);
    heldMidi.set(id, midi);
    return had !== midi;
  }

  function flushPending(): void {
    if (!cur || !pending.size) return;
    const list = Array.from(pending);
    pending.clear();
    let changed = false;
    // the context's clock is NOW: a key held through the load starts as the batch lands (its `when` is behind us)
    for (const [id, p] of list) changed = start(id, p.midi, p.vel, undefined) || changed;
    if (changed) emitHeld();
  }

  function allOff(): void {
    const t = now();
    // every batch down on the sampler's 30 ms allOff ramp (multisample.ts:284-295), booked hits un-booked with them
    for (const r of residents) { try { r.ms.allOff(); } catch { /* */ } r.ids.clear(); r.quietAt = t + 60; }
    owner.clear();
    pending.clear();
    const had = heldMidi.size > 0;
    heldMidi.clear();
    if (residents.size > 1) evictSoon(80);
    if (had) emitHeld();
  }

  // ── loading: middle-first, two swaps ─────────────────────────────────────────────────────────────
  function startLoad(v: VoiceId, needFirst: boolean): Load {
    const ac = new AbortController();
    let settleFirst: () => void = () => {};
    const first = new Promise<void>((res) => { settleFirst = res; });
    const L: Load = { voice: v, ac, first, settle: () => settleFirst() };
    loads.set(v, L);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ac.abort(); }, BUILD_TIMEOUT_MS);
    const live = (): boolean => !ac.signal.aborted && loads.get(v) === L;
    const alive = (): void => { if (!live()) throw new Error('aborted'); };   // superseded: silent; timed out: the failure path

    void (async () => {
      // the first swap's bookkeeping (written from the settle callback). `done` starts true when the voice already
      // sounds from a partial batch: then only the full set is owed.
      const batch = { done: !needFirst, resident: null as Resident | null, zones: 0 };
      if (batch.done) L.settle();
      try {
        const res = await fetch(`${root}/${v}.json`, { signal: ac.signal });
        if (!res.ok) throw new Error(`${v}.json → ${res.status}`);
        const rip = parseManifest(await res.json(), root);
        alive();
        const order = middleFirst(rip.specs);
        const K = Math.min(FIRST_BATCH, order.length);
        const results: Array<MultisampleZone | null | undefined> = new Array(order.length);   // undefined = in flight
        const moved: string[] = [];
        let failed = rip.total - rip.specs.length;

        const onSettle = (): void => {
          if (batch.done || !live()) return;
          for (let i = 0; i < K; i++) if (results[i] === undefined) return;
          const zs = results.slice(0, K).filter(isZone);
          if (!zs.length) return;           // the whole first batch failed: the full set becomes the first swap
          batch.done = true;
          batch.zones = zs.length;
          batch.resident = build(v, zs, false);
          swapIn(batch.resident);
          L.settle();
        };

        const jobs = order.map((s, i) => async (): Promise<null> => {
          let z: MultisampleZone | null = null;
          if (live()) {
            try {
              const r = await fetch(s.url, { signal: ac.signal });
              if (!r.ok) throw new Error(`${s.file} → ${r.status}`);
              const buffer = await ctx.decodeAudioData(await r.arrayBuffer());
              // the onset: a SANITY CHECK only (shift 0 is the law: the container's own trim is trusted)
              const on = firstOver(buffer.getChannelData(0));
              if (s.onset !== undefined && s.onset >= 0 && on >= 0) {
                const d = on / buffer.sampleRate - s.onset / rip.sr;
                if (Math.abs(d) > ONSET_WARN_SEC) moved.push(`${s.zone.rootMidi} (${d > 0 ? '+' : ''}${Math.round(d * 1000)} ms)`);
              }
              z = { ...s.zone, buffer };
            } catch {
              if (!ac.signal.aborted) failed++;
            }
          }
          results[i] = z;
          onSettle();
          return null;
        });
        await pool(jobs, FETCH_CONCURRENCY);
        alive();

        const all = results.filter(isZone);
        if (!all.length) throw new Error('no zone decoded');
        if (failed) console.warn(`[signal/keys] ${v}: ${failed} of ${rip.total} zones did not load; playing the rest`);
        if (moved.length) {
          console.warn(`[signal/keys] ${v}: the decoded onset moved > ${ONSET_WARN_SEC * 1000} ms on ${moved.join(', ')}; `
            + `loop points kept at samples/${rip.sr} (shift 0 is the law)`);
        }
        if (!batch.done || all.length > batch.zones) swapIn(build(v, all, true));
        else if (batch.resident) batch.resident.full = true;   // the first batch was the whole rip
      } catch (e) {
        if (timedOut || !ac.signal.aborted) {
          const why = timedOut ? `took over ${BUILD_TIMEOUT_MS / 1000} s` : String(e);
          console.warn(`[signal/keys] ${v} did not load (${why}); the voice stays where it was`);
          // the voice seg shows what SOUNDS: back to the current voice (P/keys.ts:450 "the previous voice keeps sounding")
          if (cur && cur.voice !== v && state.voice === v) {
            state.voice = cur.voice;
            if (!cur.full && !loads.has(cur.voice)) startLoad(cur.voice, false);   // its full set was aborted by this pick
          }
        }
      } finally {
        clearTimeout(timer);
        if (loads.get(v) === L) loads.delete(v);
        L.settle();
      }
    })();
    return L;
  }

  function pick(v: VoiceId): Promise<void> {
    if (!isVoice(v)) return Promise.resolve();
    state.voice = v;
    // stepping past voices: stop fetching/decoding the ones nobody wants any more (P/keys.ts:384-385)
    for (const [id, L] of Array.from(loads)) if (id !== v) { loads.delete(id); L.ac.abort(); L.settle(); }
    const L = loads.get(v);
    if (cur && cur.voice === v) {
      if (!cur.full && !L) startLoad(v, false);
      return Promise.resolve();
    }
    return (L ?? startLoad(v, true)).first;
  }

  // ── a lost keyup means a note forever (C §1 Hazard): blur and a hidden tab put every voice down ──────
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    try { window.addEventListener('blur', () => allOff()); } catch { /* */ }
  }
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    try {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') allOff(); });
    } catch { /* */ }
  }

  // ── the contract ─────────────────────────────────────────────────────────────────────────────────
  return {
    state: () => copyState(state),

    set(k, v) {
      const val = v as unknown;
      switch (k) {
        case 'voice': if (isVoice(val)) void pick(val); break;
        case 'filter': if (typeof val === 'number' && Number.isFinite(val)) state.filter = Math.max(0, Math.min(1, val)); break;
        case 'motion': state.motion = cleanMotion(val, state.motion); break;
        case 'fx': state.fx = cleanFx(val, state.fx); break;
        case 'gain': if (typeof val === 'number' && Number.isFinite(val)) state.gain = Math.max(0, Math.min(KEYS_GAIN_MAX, val)); break;
        case 'mute': if (typeof val === 'boolean') state.mute = val; break;
      }
    },

    pick,
    ready: () => !!cur && cur.voice === state.voice,

    noteOn(id, midi, vel = VEL_DEFAULT, when) {
      if (typeof id !== 'string' || !Number.isFinite(midi)) return;
      const v = clamp01(vel, VEL_DEFAULT);
      const w = finiteOr(when);
      if (!cur) { pending.set(id, { midi, vel: v, when: w }); return; }   // sounds when the first batch lands
      if (start(id, midi, v, w)) emitHeld();
    },

    noteOff(id, when) {
      if (pending.delete(id)) return;                    // released before its voice landed: never sounds
      const r = owner.get(id);
      if (r) release(r, id, finiteOr(when));
      if (heldMidi.delete(id)) emitHeld();
    },

    hit(midi, when, durSec, vel = VEL_DEFAULT) {
      const r = cur;
      if (!r || !Number.isFinite(midi) || !Number.isFinite(durSec)) return;   // a booked step before the voice: dropped
      const t = finiteOr(when) ?? ctx.currentTime;
      try { r.ms.hit(hzOf(midi), t, durSec, clamp01(vel, VEL_DEFAULT)); } catch (e) { console.warn('[signal/keys] hit failed', e); return; }
      r.quietAt = Math.max(r.quietAt, now() + (Math.max(0, t - ctx.currentTime) + Math.max(0, durSec)) * 1000 + TAIL_MS);
    },

    // `tauSec` is optional and beyond the contract (harmony's DIVE SPEED may pass it); omitted = the sampler's
    // own asymmetry, .45 s falling / .07 s recovering (multisample.ts:271-282).
    bend(cents: number, tauSec?: number) {
      bendCents = Number.isFinite(cents) ? cents : 0;
      const tau = finiteOr(tauSec);
      for (const r of residents) { try { r.ms.bend(bendCents, tau); } catch { /* */ } }
    },

    retune(map, tauSec) {
      let changed = false;
      const tau = finiteOr(tauSec);
      for (const [id, midi] of Object.entries(map ?? {})) {
        if (!Number.isFinite(midi)) continue;
        const p = pending.get(id);
        if (p) { p.midi = midi; continue; }
        const r = owner.get(id);
        if (!r) continue;
        try { r.ms.retune(id, hzOf(midi), undefined, tau); } catch { /* */ }   // the same zone, a glide (multisample.ts:262-269)
        if (heldMidi.get(id) !== midi) { heldMidi.set(id, midi); changed = true; }
      }
      if (changed) emitHeld();
    },

    held: () => heldList(),
    onHeldChange(cb) { heldCbs.add(cb); return () => { heldCbs.delete(cb); }; },

    allOff,

    stop() {
      allOff();
      // master stop ends the DIVE too: the next note after a stop starts at pitch (nothing is left sounding to glide)
      if (bendCents !== 0) { bendCents = 0; for (const r of residents) { try { r.ms.bend(0); } catch { /* */ } } }
    },

    out,
  };
};
