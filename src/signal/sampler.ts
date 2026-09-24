// SIGNAL · lane K · THE SAMPLER. One module, five Studio leaves, ported VERBATIM (C §7; NOTES-SIGNAL-R1 §1 KEYS).
// Nothing in the blocks below is new code: each carries a banner naming its source (repo, path, lines, commit), and
// a diff of a block against those lines shows only the dropped import lines — the Studio spreads these across five
// files that import each other (./types, ./multisample-map.ts, ./zone-dsp.ts); here they share one scope, so those
// imports are gone and nothing else changed. The one addition is the last line: the contract's name for the player.
// R2 (lane A) changes ONE NUMBER inside the player's block, marked [R2]: setRate's τ ceiling 1.0 → 2.0 (the Studio's own
// diveTime clamp, core.ts:1879), so the DIVE SPEED dial's slow end (1.5 s) reaches the voices whole; the Studio's player
// flattened 1.0..1.5 s to 1.0 on the keys while its drone fell at the full τ. The block's doc line says so too.
//
// Why these and only these (docs/signal-map/C-keys-sampler.md §7): the SamplePlayer seam and the keys source it
// satisfies (types.ts), the zone map (multisample-map.ts), the loop-seam bake + the two level scans the mount uses
// (zone-dsp.ts), the player (mock-sample-player.ts: despite its name it is the Studio's REAL runtime player for
// built voices, C §1), and the multisample voice (multisample.ts: the bake at LOAD, the live re-level, the
// click-free release law). Dropped (C §7): the Material import, DrumSampleSource, Pad/RepitchParams, analyzeZone
// and every rip-time helper (the rips arrive with their loop points), index.ts, pitch.ts, repitch-keys, chop-kit.
// Erasable TypeScript only: node 24 type-strips this file for sampler.test.mjs with no loader.

// ═══ from signal-studio-v6lib/src/engine/sampler/types.ts:18-71 (2a9e4a7) — the SamplePlayer seam ═══
export interface SamplePlayOpts {
  /** The ONE source buffer. Slices are zero-copy views via `offset`+`duration`. */
  buffer: AudioBuffer;
  /** ctx time to start (seconds, AudioContext clock). */
  when: number;
  /** Start offset within `buffer` (seconds). Native `start(when, offset, ...)`. */
  offset?: number;
  /** Play length (seconds). Native `start(when, offset, duration)`. Omit = to end. */
  duration?: number;
  /** playbackRate (default 1) — the only pitch control (2^(semis/12)). */
  rate?: number;
  /** Linear output gain / velocity (default 1). */
  gain?: number;
  /** Stereo pan, -1..1 (default 0). */
  pan?: number;
  /** Play the [offset, offset+duration] region reversed (requires a one-time copy). */
  reverse?: boolean;
  /** Loop the region (repitch sustain mode). */
  loop?: boolean;
  /** Loop start within buffer (seconds); defaults to `offset`. */
  loopStart?: number;
  /** Loop end within buffer (seconds); defaults to `offset + duration`. */
  loopEnd?: number;
  /** In-ramp (seconds) — declick. Default ~0.003 (2–5 ms). */
  fadeIn?: number;
  /** Out-ramp (seconds) — declick + decay tail. Default ~0.004. */
  fadeOut?: number;
  /** Where this voice connects. Chop: the drum-chain entry (pre-drumCover). Repitch: a sub-bus. */
  destination: AudioNode;
}

export interface SampleVoice {
  /** This voice's output node (already connected to `opts.destination`). */
  readonly out: AudioNode;
  /** Stop with an out-ramp ending at `when + releaseSec` (default: the voice's fadeOut — the old
   *  declick-only behavior). W15: RE-STOP is allowed — a later call whose ramp would end EARLIER
   *  tightens the stop (the Web Audio spec lets repeated `source.stop()` replace the stop time, so
   *  rescheduling is free); a later-or-equal end is a no-op, so a choke can never be UN-choked.
   *  Safe to call twice; safe after natural end. */
  stop(when?: number, releaseSec?: number): void;
  /** Glide the playbackRate in place (tape repitch) — for re-pitching a SUSTAINED voice (e.g. a held
   *  repitch loop on ←/→ transpose) without re-triggering it from the buffer head. `tau` is the
   *  setTargetAtTime time-constant (default 0.03, clamped 0.005..2.0 [R2: was ..1.0]) — bend() leans on it for the
   *  slow-fall / quick-recover DIVE feel. Optional. */
  setRate?(rate: number, when?: number, tau?: number): void;
  /** Resolves (best effort) when the voice has finished + disconnected. */
  readonly ended: Promise<void>;
}

export interface SamplePlayer {
  readonly ctx: BaseAudioContext;
  /** Fire one voice. Fresh `createBufferSource()` per call; downstream nodes may be pooled. */
  play(opts: SamplePlayOpts): SampleVoice;
}

// ═══ from signal-studio-v6lib/src/engine/sampler/types.ts:91-114 (2a9e4a7) — KeysSampleSource (multisample.ts extends it) ═══
export interface KeysSampleSource {
  /** Start a pitched voice for `freq` (Hz) keyed by `id` (mirrors engine.noteOn). `vel` is 0..1
   *  (default 1 = full — direct callers/harnesses stay level-identical; the engine passes real vel
   *  so MIDI-in dynamics and, once zones carry loVel/hiVel, layer selection both flow through). */
  noteOn(id: string, freq: number, when?: number, vel?: number): void;
  /** Release the voice for `id` (one-shot voices ignore; loop voices stop). */
  noteOff(id: string, when?: number): void;
  /**
   * Fire a fixed-length pitched one-shot at `when` (seconds) — for SEQUENCED triggering (the arp,
   * which fires in tick() with no key id and needs each step to ring for `durSec`, NOT a whole
   * buffer decay that would overlap copies). Untracked by id; self-ends; stopped by `allOff`.
   */
  hit(freq: number, when: number, durSec: number, vel?: number): void;
  /** Re-pitch the SUSTAINED voice for `id` in place (←/→ transpose) — glides, doesn't re-trigger.
   *  No-op if no such voice is ringing. */
  retune(id: string, freq: number, when?: number, tau?: number): boolean | void;
  /** Momentary pitch bend in CENTS across every LIVE voice (the DIVE gesture) — glides each held
   *  voice off its tracked base rate, `0` restores exactly; new voices start pre-bent while the
   *  bend holds. Optional (multisample implements it; repitch/chop ignore it). */
  bend?(cents: number, tau?: number): void;
  allOff(when?: number, keepIds?: readonly string[]): void;
  /** The sub-bus output (A connects this alongside keysBus, crossfaded by layerMix). */
  readonly out: AudioNode;
}

// ═══ from signal-studio-v6lib/src/engine/sampler/multisample-map.ts:1-88 (2a9e4a7) — whole ═══
// w13-voices — MULTISAMPLE ZONE MAP (pure math, ZERO imports so Node type-strips + tests it directly,
// mirroring the pitch.ts leaf convention). This is the math that turns a played note into
// (which recorded sample, what SMALL repitch) — the heart of a built "voice".
//
// A voice = N pitch zones, each a real sample recorded at a known root note. A played note picks the
// NEAREST zone and plays it at rate = freq / zoneRootFreq. Because the nearest zone is always close,
// the repitch is always tiny — so a Rhodes stays a Rhodes across the whole keyboard instead of
// chipmunking the way single-sample repitch (repitch-keys.ts) does past ~an octave from its root.

/** MIDI note (69 = A4) → frequency (Hz). Inlined (mirrors pitch.ts midiToFreq) to keep this a leaf. */
function midiToFreq(note: number): number { return 440 * Math.pow(2, (note - 69) / 12); }
/** Frequency (Hz) → nearest MIDI note. Inlined (mirrors pitch.ts freqToMidi). */
function freqToMidi(freq: number): number { return Math.round(69 + 12 * Math.log2(freq / 440)); }

export interface ZoneKey {
  /** MIDI note this zone's sample was recorded at (its natural pitch). */
  rootMidi: number;
  /** Optional inclusive key range this zone owns. Omitted → nearest-root selection covers the keyboard. */
  loKey?: number;
  hiKey?: number;
  /** SL73 M2 — the velocity band this layer covers, 1..127 (from bandsFor). When ANY zone carries a
   *  band, selection filters by velocity band first, then pitch. BOTH absent = a full-range layer. */
  loVel?: number;
  hiVel?: number;
}

/** The zone whose explicit key-range contains `midi`, else the NEAREST recorded root. Ties break to
 *  the LOWER root (deterministic). Returns -1 for an empty set. */
export function selectZoneIndex(zones: ReadonlyArray<ZoneKey>, midi: number): number {
  if (!zones.length) return -1;
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    if (z.loKey != null && z.hiKey != null && midi >= z.loKey && midi <= z.hiKey) return i;
  }
  let best = 0, bestD = Infinity;
  for (let i = 0; i < zones.length; i++) {
    const d = Math.abs(zones[i].rootMidi - midi);
    if (d < bestD) { bestD = d; best = i; } // strict `<` keeps the first (lower) root on a tie
  }
  return best;
}

/** playbackRate to move a sample recorded at `rootMidi` to `targetFreq`, plus a global `tuneSemis`. */
export function rateForRoot(rootMidi: number, targetFreq: number, tuneSemis = 0): number {
  if (!(targetFreq > 0)) return 1;
  return (targetFreq / midiToFreq(rootMidi)) * Math.pow(2, tuneSemis / 12);
}

/** SL73 M2/M3 — VELOCITY-AWARE zone selection. Two stages, mirroring the drum kit's pickLayer:
 *   1. Band filter — pick the velocity band for `vel` (0..1, exactly as pickLayer maps it: v127 =
 *      round(vel·127)). A band whose [loVel,hiVel] contains v wins; on a gap the nearest band by edge
 *      distance wins (bandsFor bands cover 1..127 with no gaps, so the fallback only matters for
 *      hand-crafted zones). HARD switch — no crossfade (v1 rec); the sampler's own velocity→gain
 *      still tracks dynamics WITHIN a band.
 *   2. Pitch select — run the unchanged `selectZoneIndex` over ONLY the chosen band's zones (nearest
 *      recorded root / explicit key-range), mapping the local index back to the original array.
 *  A voice with NO velocity bands (single-layer) skips stage 1 entirely → byte-identical to before. */
export function selectZoneVel(zones: ReadonlyArray<ZoneKey>, midi: number, vel = 1): number {
  if (!zones.length) return -1;
  const banded = zones.some((z) => z.loVel != null && z.hiVel != null);
  if (!banded) return selectZoneIndex(zones, midi); // pure pitch selection — pre-M2 behavior, exact
  const v = Math.max(1, Math.min(127, Math.round(vel * 127))); // vel is 0..1, mirrors pickLayer
  const loOf = (z: ZoneKey): number => z.loVel ?? 1, hiOf = (z: ZoneKey): number => z.hiVel ?? 127;
  // choose the winning band (in-band wins; else nearest edge) — mirrors pickLayer (drum-kit.ts)
  let bandLo = loOf(zones[0]), bandHi = hiOf(zones[0]), bestDist = Infinity;
  for (const z of zones) {
    const lo = loOf(z), hi = hiOf(z);
    if (v >= lo && v <= hi) { bandLo = lo; bandHi = hi; break; }
    const dist = v < lo ? lo - v : v - hi;
    if (dist < bestDist) { bestDist = dist; bandLo = lo; bandHi = hi; }
  }
  // pitch-select within the chosen band, mapping the filtered index back to the original array
  const orig: number[] = [], cand: ZoneKey[] = [];
  for (let i = 0; i < zones.length; i++) { const z = zones[i]; if (loOf(z) === bandLo && hiOf(z) === bandHi) { orig.push(i); cand.push(z); } }
  const local = selectZoneIndex(cand, midi);
  return local < 0 ? -1 : orig[local];
}

/** Choose the zone + the (always small) playbackRate for a target frequency. null on an empty set /
 *  bad frequency. `vel` (0..1, default 1 = full) selects the velocity layer when zones carry bands;
 *  it is inert for single-layer voices. `vel` is the LAST param (not before `tuneSemis`) so every
 *  existing `chooseZoneRate(zones, freq, tune)` call site stays valid + correct. */
export function chooseZoneRate(zones: ReadonlyArray<ZoneKey>, freq: number, tuneSemis = 0, vel = 1): { index: number; rate: number } | null {
  if (!zones.length || !(freq > 0)) return null;
  const index = selectZoneVel(zones, freqToMidi(freq), vel);
  if (index < 0) return null;
  return { index, rate: rateForRoot(zones[index].rootMidi, freq, tuneSemis) };
}

// ═══ from signal-studio-v6lib/src/engine/sampler/zone-dsp.ts:56-65 (2a9e4a7) — rmsOver ═══
/** RMS over [from, to) in f64 (a f32 running sum drifts over 150k samples). 0 on empty/NaN.
 *  Exported (w16): lane B's mount re-levels every zone live from its buffer with this. */
export function rmsOver(data: Float32Array, from: number, to: number): number {
  const a = Math.max(0, from), b = Math.min(data.length, to);
  if (b <= a) return 0;
  let e = 0;
  for (let i = a; i < b; i++) e += data[i] * data[i];
  const r = Math.sqrt(e / (b - a));
  return Number.isFinite(r) ? r : 0;
}

// ═══ from signal-studio-v6lib/src/engine/sampler/zone-dsp.ts:67-76 (2a9e4a7) — peakOver ═══
/** Absolute peak over [from, to) — 0 on empty/NaN. Exported (w17.6): the mount peak-CAPS the level
 *  gain with the whole-buffer peak so a hot ATTACK transient (louder than the loop-region RMS the
 *  −14 dBFS target measures) can't ride the bus at ~0 dBFS — that was single notes "a bit distorted
 *  alone", and chords summing those hot peaks was "super distorted in chords". */
export function peakOver(data: Float32Array, from: number, to: number): number {
  const a = Math.max(0, from), b = Math.min(data.length, to);
  let p = 0;
  for (let i = a; i < b; i++) { const v = Math.abs(data[i]); if (v > p) p = v; }
  return Number.isFinite(p) ? p : 0;
}

// ═══ from signal-studio-v6lib/src/engine/sampler/zone-dsp.ts:362 (2a9e4a7) — DEFAULT_XFADE_SEC ═══
export const DEFAULT_XFADE_SEC = 0.03; // the w15 bake default — a short seam stitch on short loops

// ═══ from signal-studio-v6lib/src/engine/sampler/zone-dsp.ts:377-411 (2a9e4a7) — bakeLoopCrossfade ═══
/**
 * In-place equal-power crossfade so the wrap loopEnd→loopStart is continuous: over the last
 * `fade` samples before loopEnd we blend toward the material just before loopStart, landing
 * EXACTLY on x[loopStart−1] at the final pre-wrap sample — the wrap then steps to x[loopStart]
 * with the signal's own natural motion, i.e. no click even on a bass fundamental. Fade length =
 * min(fadeSec, half the loop, the pre-loopStart material available). No-op when loopStart·sr < 16
 * or the region is invalid (mount calls this on a COPY; stored loop points stay editable).
 */
export function bakeLoopCrossfade(data: Float32Array, sampleRate: number, loopStart: number, loopEnd: number, fadeSec = DEFAULT_XFADE_SEC): void {
  if (!data || !(sampleRate > 0) || !Number.isFinite(loopStart) || !Number.isFinite(loopEnd)) return;
  const s = Math.round(loopStart * sampleRate);
  const e = Math.round(loopEnd * sampleRate);
  if (s < 16 || e <= s || e > data.length) return;
  const fade = Math.floor(Math.min(Number.isFinite(fadeSec) ? fadeSec * sampleRate : 0, (e - s) / 2, s));
  if (fade < 2) return;
  // Blend law by correlation: the pitched path aligns the two regions to the SAME phase, and an
  // equal-power (cos/sin) blend of correlated material swells up to +3 dB mid-fade — a periodic
  // pulse on clean sustains. Correlated (ρ ≥ 0.5) → constant-gain LINEAR blend (level-preserving
  // for in-phase material, still lands exactly on x[loopStart−1]). Uncorrelated (the fallback
  // path's unaligned material) → keep equal-power, where linear would DIP −3 dB instead.
  let num = 0, ea = 0, eb = 0;
  for (let i = 0; i < fade; i++) {
    const av = data[e - fade + i], bv = data[s - fade + i];
    num += av * bv; ea += av * av; eb += bv * bv;
  }
  const rho = num / Math.sqrt(ea * eb + 1e-24);
  const HALF_PI = Math.PI / 2;
  for (let i = 0; i < fade; i++) {
    const t = (i + 1) / fade; // hits 1 at the last pre-wrap sample → x[e−1] becomes x[s−1] exactly
    const di = e - fade + i;
    data[di] = rho >= 0.5
      ? (1 - t) * data[di] + t * data[s - fade + i]
      : Math.cos(t * HALF_PI) * data[di] + Math.sin(t * HALF_PI) * data[s - fade + i];
  }
}

// ═══ from signal-studio-v6lib/src/engine/sampler/mock-sample-player.ts:1-192 (2a9e4a7) — whole; line 12 (its import of ./types) dropped: the seam is above; [R2] setRate's τ ceiling ═══
// Stream D — a minimal, REAL SamplePlayer.
//
// This is what Stream D builds + tests against until A's generalised `playSample`
// lands; it is also a viable fallback (it makes sound). Per voice: a fresh
// `createBufferSource()` (never pooled — pooling a source is illegal once started)
// → gain (declick + velocity) → stereo pan → `opts.destination`. Zero-copy slicing
// via native `start(when, offset, duration)`; reverse is the one exception (Web
// Audio can't play a buffer backwards, so it copies+reverses the slice region).
//
// When A's SamplePlayer lands, swap this out at the mount sites — same interface.


const FADE_IN = 0.003; // 3 ms
const FADE_OUT = 0.004; // 4 ms

const reverseCache = new WeakMap<AudioBuffer, Map<string, AudioBuffer>>();

/** Copy+reverse the [offset, offset+duration] region into a small buffer (cached). */
function reversedRegion(ctx: BaseAudioContext, buf: AudioBuffer, offset: number, duration: number): AudioBuffer {
  const key = `${offset.toFixed(5)}:${duration.toFixed(5)}`;
  let perBuf = reverseCache.get(buf);
  if (!perBuf) { perBuf = new Map(); reverseCache.set(buf, perBuf); }
  const hit = perBuf.get(key);
  if (hit) return hit;

  const sr = buf.sampleRate;
  const startF = Math.max(0, Math.floor(offset * sr));
  const lenF = Math.max(1, Math.min(buf.length - startF, Math.ceil(duration * sr)));
  const out = ctx.createBuffer(buf.numberOfChannels, lenF, sr);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < lenF; i++) dst[i] = src[startF + lenF - 1 - i] ?? 0;
  }
  perBuf.set(key, out);
  return out;
}

export function createMockSamplePlayer(ctx: BaseAudioContext): SamplePlayer {
  return {
    ctx,
    play(opts: SamplePlayOpts): SampleVoice {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      const reverse = !!opts.reverse;
      const offset = Math.max(0, opts.offset ?? 0);
      const duration = opts.duration != null ? Math.max(0, opts.duration) : undefined;

      const cropped = reverse && duration != null;
      if (cropped) {
        src.buffer = reversedRegion(ctx, opts.buffer, offset, duration);
      } else {
        src.buffer = opts.buffer;
      }
      const rate = opts.rate ?? 1;
      src.playbackRate.value = rate;
      // When reverse crops the region into a small buffer the clamp may make it
      // SHORTER than `duration`; the wall-clock end + ramps must track the REAL
      // buffer, not the requested duration (else the fade/stop fire after silence).
      const effDur = cropped ? src.buffer.duration : duration;

      if (opts.loop) {
        src.loop = true;
        if (cropped) {
          // The reversed crop lives at [0, buffer.duration] — loop the whole crop,
          // not the original-buffer-relative [offset, offset+duration] window.
          src.loopStart = 0;
          src.loopEnd = src.buffer.duration;
        } else {
          src.loopStart = opts.loopStart ?? offset;
          src.loopEnd = opts.loopEnd ?? (duration != null ? offset + duration : opts.buffer.duration);
        }
      }

      // pan
      let tail: AudioNode = g;
      if (opts.pan && Math.abs(opts.pan) > 1e-3 && typeof ctx.createStereoPanner === 'function') {
        const p = ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, opts.pan));
        g.connect(p);
        tail = p;
      }
      src.connect(g);
      tail.connect(opts.destination);

      // Declick envelope. fin/fout are wall-clock; the slice's wall length is
      // effDur/rate, which can be SHORTER than fin+fout for a tiny / up-pitched
      // slice — so collapse to a triangular peak rather than scheduling an
      // out-ramp whose endpoint precedes its own anchor (an inverted segment that
      // snaps instead of declicking).
      const vel = Math.max(0, opts.gain ?? 1);
      const fin = Math.max(0.0005, opts.fadeIn ?? FADE_IN);
      const fout = Math.max(0.0005, opts.fadeOut ?? FADE_OUT);
      const when = Math.max(opts.when, ctx.currentTime);

      let naturalEnd = Infinity;
      const wall = effDur != null && !opts.loop ? effDur / rate : Infinity;
      g.gain.setValueAtTime(0, when);
      if (wall === Infinity) {
        g.gain.linearRampToValueAtTime(vel, when + fin); // loop / open-ended
      } else {
        naturalEnd = when + wall;
        if (wall >= fin + fout) {
          g.gain.linearRampToValueAtTime(vel, when + fin);
          g.gain.setValueAtTime(vel, naturalEnd - fout);
          g.gain.linearRampToValueAtTime(0, naturalEnd);
        } else {
          // Too short for distinct in/out ramps — symmetric triangle, peak mid.
          g.gain.linearRampToValueAtTime(vel, when + wall / 2);
          g.gain.linearRampToValueAtTime(0, naturalEnd);
        }
      }

      src.start(when, cropped ? 0 : offset, opts.loop ? undefined : duration);
      if (naturalEnd < Infinity) { try { src.stop(naturalEnd + 0.01); } catch { /* */ } }

      let done = false; // natural end reached — nothing left to stop or glide
      // Seeded with naturalEnd: a stop whose ramp would end AT/AFTER the already-scheduled natural
      // fade is a no-op (the natural fade reaches zero sooner) — else cancelAndHold would strip that
      // fade and the start(when,offset,duration) bound would hard-cut at non-zero gain (a click).
      let pendingStopEnd = naturalEnd; // earliest scheduled stop-ramp end; re-stops may only TIGHTEN it
      let resolveEnded: () => void = () => {};
      const ended = new Promise<void>((res) => { resolveEnded = res; });
      src.onended = () => { done = true; try { src.disconnect(); g.disconnect(); tail.disconnect(); } catch { /* */ } resolveEnded(); };

      return {
        out: tail,
        stop(at?: number, releaseSec?: number) {
          // W15 re-stop: the old one-shot `stopped` latch ate every second call, so a noteOff's
          // musical release could never be tightened by a retrigger choke / allOff. The Web Audio
          // spec allows repeated source.stop() (the LAST call's time wins), so rescheduling is free;
          // the one rule is the EARLIEST ramp end wins — a later-ending re-stop must not UN-choke.
          if (done) return;
          const t = Math.max(at ?? ctx.currentTime, ctx.currentTime);
          // [SIGNAL R1 review] a voice BOOKED ahead and stopped before its start (the arp's plucks inside the horizon
          // when the master stop / ARP off / allOff comes) never plays: a stop before the start is the Web Audio law
          // for that. The ramp below would anchor at the gain param's DEFAULT (1: its automation starts at `when`),
          // cancel the fade-in, and let the pluck start unfaded at up to 0.67 for 25 ms after the stop.
          if (t < when) {
            if (pendingStopEnd <= t) return;              // already un-booked
            pendingStopEnd = t;
            try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); src.stop(t); } catch { /* already stopped */ }
            return;
          }
          const release = Math.max(0.0005, releaseSec ?? fout); // default = the old declick fadeOut
          const end = t + release;
          if (end >= pendingStopEnd) return;
          pendingStopEnd = end;
          try {
            // w18 — KEEP LOOPING through the release. (w17.8 set `src.loop = false` here on an immediate
            // release, on the theory that a real captured loop's wrap seam — "only reduced" by the
            // crossfade — would pop if the release fade spanned a wrap. That reasoning was WRONG and the
            // line CAUSED the very pop it meant to fix: bakeLoopCrossfade forces x[e−1] := x[s−1], so the
            // WRAP e−1 → s reproduces the natural motion s−1 → s and is continuous REGARDLESS of phase
            // lock. But loop=false made the head play FORWARD across x[e−1] → x[e] — a full loop of
            // accrued phase error the bake never conditioned. That boundary is smooth only on a
            // phase-PERFECT synthetic loop (why __runVoiceTests passed) and is 50–90× the click floor on
            // a real imperfect capture = the intermittent, single-note, key-up pop; worse for short
            // loops, where the head always reaches e within the fade. Regression-gated by voice-verify
            // T8 (repro: debug-probes/w18-seam-probe.mjs). So: do nothing to src.loop — the baked wrap
            // carries the release cleanly. Decay zones never loop, so this branch is keys/bass sustain.)
            // Anchor the release ramp at the envelope's value AT t, THEN ramp to 0. The anchor is the
            // load-bearing part — a linearRampToValueAtTime(0) with no explicit start event does NOT
            // begin at the current gain; it SNAPS (measured on an immediate release: 0.67 → 0.32 at the
            // release quantum, a ~6 dB step) and that snap — not any loop seam — was the intermittent,
            // single-note, key-up POP. (w18: proven with debug-probes/w18-gainprobe.mjs — cancelAndHold
            // alone snaps; cancel+setValueAtTime holds.) Two anchoring cases:
            //  • IMMEDIATE release (keyboard note-off, t ≈ now): g.gain.value IS the true current gain,
            //    so anchor it explicitly. cancelAndHoldAtTime snaps here; setValueAtTime does not.
            //  • FUTURE-timed stop (offline goldens / scheduled release): reading g.gain.value NOW would
            //    sample the wrong instant, so cancelAndHoldAtTime freezes the curve's value AT t (these
            //    paths already render clean — T1–T6 — so keep them exactly).
            const v0 = Math.max(g.gain.value, 1e-4);
            if (t <= ctx.currentTime + 0.005) {
              g.gain.cancelScheduledValues(t);
              g.gain.setValueAtTime(v0, t);
            } else if (typeof g.gain.cancelAndHoldAtTime === 'function') {
              g.gain.cancelAndHoldAtTime(t);
            } else {
              g.gain.cancelScheduledValues(t);
              g.gain.setValueAtTime(v0, t);
            }
            g.gain.linearRampToValueAtTime(0, end);
            src.stop(end + 0.005);
          } catch { /* already stopped */ }
        },
        setRate(r, at, tau) {
          // glide playbackRate (tape repitch / DIVE bend) for a sustained/looping voice — re-pitch
          // in place without re-triggering. τ shapes the glide: transpose keeps the 0.03 default,
          // bend passes ~0.45 falling / ~0.07 recovering. The naturalEnd of a fixed-duration voice
          // was computed from the original rate, so only re-pitch open-ended (loop) voices here.
          if (done) return;
          const t = Math.max(at ?? ctx.currentTime, ctx.currentTime);
          const tc = Math.min(2.0, Math.max(0.005, tau ?? 0.03));   // [R2] ceiling 1.0 → 2.0 (see the file's header)
          try { src.playbackRate.setTargetAtTime(Math.max(0.0001, r), t, tc); } catch { /* */ }
        },
        ended,
      };
    },
  };
}

// ═══ from signal-studio-v6lib/src/engine/sampler/multisample.ts:1-313 (2a9e4a7) — whole; lines 27-29 (imports of ./types, ./multisample-map.ts, ./zone-dsp.ts) dropped: all above ═══
// w13-voices — MULTISAMPLE (zone-mapped) keyboard voice: the playback half of a built "voice".
//
// A drop-in KeysSampleSource (structurally also a BassSampleSource) that holds N pitch zones instead
// of one buffer. It registers through the SAME engine seam as repitch-keys (setKeysSampleSource), so
// the engine CORE IS UNTOUCHED — keyboard/arp/duck/solo/resample/tap all work unchanged; this file
// lives entirely inside sampler/ (the module's standing rule). Modeled directly on repitch-keys.ts;
// the only real difference is per-note ZONE SELECTION (multisample-map.ts) so the repitch stays tiny.
//
// Velocity: the held-key path `noteOn` carries no velocity (QWERTY has none), so velocity LAYERS are
// stored on a zone but not yet selected here — that lands with MIDI-in playing (a v2 seam bump). The
// `hit` (arp/sequenced) path already carries `vel` and applies it as gain.
//
// W15 (voice fidelity): loop-pointed zones get a BAKED-crossfade COPY at construction (the native
// loop wrap has no crossfade — the naked seam was Jon's "held note repeats the attack" report);
// noteOff/allOff/retrigger release times are musical, not the player's 4ms declick (a bass cycle is
// ~24ms — the declick IS the pop); bend() is the DIVE gesture, riding on per-voice baseRate.
//
// W16 (instrument feel): zones carry a playback `mode` from the capture's envelope classification —
// 'decay' zones (piano/EP-like, the note dies on its own) play their FULL buffer un-looped (looping
// decaying material was Jon's "held notes audibly cycle" report; the ring-out IS the note), while
// 'sustain' zones loop as before. And gain is recomputed LIVE at mount from the buffer against the
// −14 dBFS performance target ("default load super low"), overriding the persisted z.gain.
//
// Value imports carry .ts extensions (allowImportingTsExtensions) so Node can type-strip + resolve
// this file directly for multisample.test.mjs — the render.ts/plan.ts convention.


export interface MultisampleZone extends ZoneKey {
  /** The recorded sample for this zone (one note of the instrument). */
  buffer: AudioBuffer;
  /** Sustain loop points within the buffer (seconds) — set by the capture's loop finder. */
  loopStart?: number;
  loopEnd?: number;
  /** Playback mode from the capture's envelope classification (W16): 'sustain' loops between the
   *  loop points as before; 'decay' (piano/EP-like) plays the full buffer un-looped — the natural
   *  ring-out IS the note. Absent = 'sustain' (back-compat: W15 zones loop exactly as today). */
  mode?: 'sustain' | 'decay';
  /** R17 — loop-seam crossfade for THIS zone, seconds. Written at capture by the HI-FI preset,
   *  sized to the loop (zone-dsp's loopCrossfadeSec). Absent = the bake's 30ms default, so every
   *  zone rendered before R17 bakes byte-identically to before. */
  xfade?: number;
  /** Per-zone linear gain so zones sit at a matched level (the capture normalises). Default 1.
   *  W16: kept as the STORE's truth only — playback overrides it with a mount-time live recompute
   *  (see the re-level block below), falling back here only when the measured region is silent. */
  gain?: number;
  // loVel/hiVel (the velocity band this layer covers) are inherited from ZoneKey — SL73 M2 wakes them:
  // chooseZoneRate now band-filters on velocity, so a multi-layer voice selects the right layer per hit.
}

export interface MultisampleParams {
  /** Global transpose on top of per-note repitch, semitones (the {tune} macro). */
  tune: number;
  /** Stereo pan, -1..1. */
  pan: number;
  /** Crossfade vs the morph synth: 0 = synth only, 1 = sample only (drives `out` gain). */
  layerMix: number;
  /** 'loop' sustains a held key; 'oneshot' rings once. Built instruments default to loop. */
  mode: 'oneshot' | 'loop';
  /** 0..1 one-shot gate as a fraction of the buffer (the {decay} macro). */
  decay: number;
  /** noteOff release (seconds) — the stop ramp of a held voice. W15: was the player's fixed 4ms
   *  declick, audibly a pop on bass (one E1 cycle is ~24ms). Default 0.1. */
  release: number;
  /** One-shot (arp/seq `hit`) fadeOut (seconds) — the step's own out-ramp. Default 0.02. */
  hitFade: number;
}

export function defaultMultisampleParams(): MultisampleParams {
  return { tune: 0, pan: 0, layerMix: 1, mode: 'loop', decay: 1, release: 0.1, hitFade: 0.02 };
}

export interface MultisampleInstrument extends KeysSampleSource {
  readonly zones: ReadonlyArray<MultisampleZone>;
  readonly params: MultisampleParams;
  /** DIVE: required here (optional on the seam) — the engine's gesture path feature-detects it. */
  bend(cents: number, tau?: number): void;
  setParams(patch: Partial<MultisampleParams>): void;
  dispose(): void;
}

export interface MultisampleOpts {
  /** Sub-bus destination. If omitted an internal GainNode is created as `out`. */
  destination?: AudioNode;
  params?: Partial<MultisampleParams>;
}

// ── W15 zone prep: bake the loop seam once, at construction ──────────────────
// The native AudioBufferSourceNode loop wraps loopEnd→loopStart with NO crossfade, so even good
// loop points click on every pass. Zones that arrive with real points get a baked COPY — fresh
// buffer, channels copied, bakeLoopCrossfade written in-place per channel (the fade length is a
// pure function of the same points+rate, so every channel bakes identically) — and playback uses
// the copy. The INPUT buffer is never mutated: the zone stays the persisted, editable truth
// (recall may re-analyze the points; a bake must never compound into the stored samples).
// W16: SUSTAIN zones only — a decay zone never wraps (it plays un-looped to the buffer end), so
// baking would just smear its tail toward pre-loopStart material for nothing. Skip the copy.
function loopValid(z: MultisampleZone): boolean {
  return z.loopStart != null && z.loopEnd != null
    && z.loopStart > 0 && z.loopStart < z.loopEnd
    && z.loopEnd <= z.buffer.duration
    && z.loopEnd - z.loopStart >= 0.05;
}

function bakedCopy(ctx: BaseAudioContext, z: MultisampleZone): AudioBuffer {
  const src = z.buffer;
  const copy = ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate);
  for (let c = 0; c < src.numberOfChannels; c++) {
    const dst = copy.getChannelData(c);
    dst.set(src.getChannelData(c));
    // R17: a zone may carry its OWN seam length (HI-FI sizes it to the loop). Passing undefined
    // takes bakeLoopCrossfade's 30ms default — the pre-R17 behaviour, unchanged. The bake still
    // clamps to half the loop and to the pre-loopStart material, so a bad stored value can only
    // shorten the fade, never overrun the buffer.
    bakeLoopCrossfade(dst, src.sampleRate, z.loopStart as number, z.loopEnd as number,
      Number.isFinite(z.xfade) && (z.xfade as number) > 0 ? z.xfade : undefined);
  }
  return copy;
}

export function createMultisample(zones: MultisampleZone[], player: SamplePlayer, opts: MultisampleOpts = {}): MultisampleInstrument {
  const ctx = player.ctx;
  const out = (opts.destination as AudioNode) ?? ctx.createGain();
  let params: MultisampleParams = { ...defaultMultisampleParams(), ...opts.params };

  // Playback buffers, parallel to `zones`: baked seam copies where the loop points are valid AND
  // the zone sustains, the raw zone buffer otherwise (a zone without points plays exactly as
  // before — recall backfills; a decay zone never loops, so its raw buffer is already right).
  const playBufs: AudioBuffer[] = zones.map((z) => (loopValid(z) && (z.mode ?? 'sustain') !== 'decay' ? bakedCopy(ctx, z) : z.buffer));

  // ── W16 mount-time re-level: playback gain recomputed LIVE from the buffer ──────────────────────
  // Persisted zone gains were normalised against W15's −18 dBFS target ("default load super low");
  // the store keeps them untouched, but playback always re-levels here against the −14 performance
  // target — so already-saved W15 voices come up at the new loudness with no backfill-version dance.
  // Measure what a held note actually plays: the LOOP region for sustain zones, the first 1.5s (the
  // body of the ring-out, before the tail drags the average down) for decay zones. A silent region
  // skips the override and keeps the stored gain (mirrors zone-dsp's silence guard).
  const PLAY_TARGET_RMS = Math.pow(10, -14 / 20);
  // w17.6 PEAK CEILING (−6 dBFS): the RMS target alone leveled the LOOP/BODY, but a note's ATTACK
  // transient is louder — so single notes rode the bus at ~0 dBFS ("a bit distorted alone") and
  // chords summed those hot peaks into gross clipping through the shared glue/limiter ("super
  // distorted in chords"). Cap the gain so the loudest sample of a voice never exceeds −6 dBFS,
  // leaving polyphonic headroom. Whichever of the two limits is quieter wins.
  const PLAY_PEAK_CEIL = Math.pow(10, -6 / 20);
  const GAIN_SILENCE_RMS = 1e-4;
  const playGains: number[] = zones.map((z) => {
    const sr = z.buffer.sampleRate;
    const ch0 = z.buffer.getChannelData(0);
    const decayZone = (z.mode ?? 'sustain') === 'decay';
    const from = decayZone ? 0 : Math.round((z.loopStart ?? 0) * sr);
    const to = decayZone ? Math.round(1.5 * sr) : Math.round((z.loopEnd ?? z.buffer.duration) * sr);
    const rms = rmsOver(ch0, from, to); // rmsOver clamps to the buffer + returns 0 on empty/NaN
    if (!(rms >= GAIN_SILENCE_RMS)) return z.gain ?? 1;
    const peak = peakOver(ch0, 0, ch0.length); // WHOLE-buffer peak = the attack transient, not just the body
    const byRms = PLAY_TARGET_RMS / rms;
    const byPeak = peak > 0 ? PLAY_PEAK_CEIL / peak : byRms;
    return Math.max(0.4, Math.min(2.5, Math.min(byRms, byPeak)));
  });

  // layerMix drives the sub-bus level (the crossfade's sample side), glided like repitch-keys.
  const setMix = (m: number): void => {
    const g = (out as GainNode).gain;
    if (g) { try { g.setTargetAtTime(Math.max(0, Math.min(1, m)), ctx.currentTime, 0.02); } catch { g.value = Math.max(0, Math.min(1, m)); } }
  };
  setMix(params.layerMix);

  // held voices track their zone ROOT so a ←/→ retune glides within the SAME zone's timbre (never
  // re-pitches zone-A's buffer by zone-B's ratio) — and their baseRate (the UNBENT rate, kept
  // current through retune) so bend() rides on top and `bend(0)` restores exactly, no drift.
  // Arp one-shots are id-less → choked by allOff.
  const voices = new Map<string, { voice: SampleVoice; rootMidi: number; baseRate: number }>();
  const hitVoices = new Set<SampleVoice>();

  // momentary DIVE offset (cents); 0 = no bend. New voices start pre-bent while it holds.
  let bendCents = 0;
  const bendMult = (): number => (bendCents !== 0 ? Math.pow(2, bendCents / 1200) : 1);

  function startVoice(freq: number, t: number, spec: { loop: boolean; durSec?: number; vel: number; fadeOut?: number }): { voice: SampleVoice; rootMidi: number; baseRate: number; looped: boolean } | null {
    // SL73 M2 — velocity now picks the layer (HARD switch, no crossfade — the v1 rec): chooseZoneRate
    // band-filters on spec.vel, then the existing gain:vel·playGain (below) tracks dynamics within the
    // chosen band. (A per-voice velocity→lowpass to further smooth the band step is a deliberate v2
    // deferral — it needs a filter node threaded through the shared player and is live-only, no golden
    // stake; band selection + continuous gain already deliver the adopted hard-switch behavior.)
    const pick = chooseZoneRate(zones, freq, params.tune, spec.vel);
    if (!pick) return null;
    const z = zones[pick.index];
    const bufDur = z.buffer.duration;
    // W16: a held (spec.loop) voice only LOOPS when its zone sustains — a decay zone plays the FULL
    // buffer un-looped instead: the natural ring-out is the note, and looping decaying material is
    // the audible-cycling bug. noteOff's release (the damper) still applies through the same stop
    // path; the {decay} gate stays a one-shot affair (a ring-out is never truncated by it).
    const loop = spec.loop && (z.mode ?? 'sustain') !== 'decay';
    // `duration` is BUFFER-domain seconds; wall-clock = duration/rate. A live bend scales the rate,
    // so one-shots scale their content duration by the SAME multiplier — wall = (dur·m)/(rate·m) is
    // bend-invariant and a dived 303 step keeps its rhythm instead of stretching 4x and piling up.
    // The decay-zone held note is the exception: duration UNDEFINED (open-ended) — the un-looped
    // source ends when its CONTENT is exhausted, which is rate-aware by construction, so a live
    // DIVE/retune genuinely stretches the ring-out like tape. (Passing bufDur instead froze a
    // wall-clock naturalEnd at the STARTING rate: a mid-ring dive then hard-cut the note ~4x early
    // at audible level — the pop class W15 outlawed. The intake's edge fade-out means the buffer's
    // last samples are silence, so the natural end is click-free without a scheduled envelope.)
    const m = bendMult();
    const duration = loop || spec.loop
      ? undefined
      : (spec.durSec != null ? Math.max(0.02, Math.min(spec.durSec * m, bufDur)) : Math.max(0.02, Math.min(bufDur, bufDur * Math.max(0.02, Math.min(1, params.decay)) * m)));
    const voice = player.play({
      buffer: playBufs[pick.index],
      when: t,
      offset: 0,
      duration,
      rate: pick.rate * m,
      gain: Math.max(0, Math.min(1, spec.vel)) * playGains[pick.index],
      pan: params.pan,
      loop,
      loopStart: z.loopStart ?? 0,
      loopEnd: z.loopEnd ?? bufDur,
      fadeOut: spec.fadeOut,
      destination: out,
    });
    return { voice, rootMidi: z.rootMidi, baseRate: pick.rate, looped: loop };
  }

  function noteOn(id: string, freq: number, when?: number, vel = 1): void {
    if (!(freq > 0)) return;
    const t = Math.max(when ?? ctx.currentTime, ctx.currentTime);
    const prev = voices.get(id);
    // retrigger choke: 25ms — long enough to not pop on bass, short enough to feel instant.
    if (prev) { try { prev.voice.stop(t, 0.025); } catch { /* */ } voices.delete(id); }
    const started = startVoice(freq, t, { loop: params.mode === 'loop', vel });
    if (!started) return;
    voices.set(id, started);
    // un-looped voices self-clean at natural end — one-shot mode AND (W16) a held decay zone whose
    // ring-out ran its course (its noteOff is then a harmless no-op: the map entry is already gone
    // and the player ignores stop-after-end).
    if (!started.looped) void started.voice.ended.then(() => { if (voices.get(id)?.voice === started.voice) voices.delete(id); });
  }

  function noteOff(id: string, when?: number): void {
    const v = voices.get(id);
    if (!v) return;
    // the musical release lives HERE (params.release), not in the player's declick default.
    if (params.mode === 'loop') { try { v.voice.stop(when, params.release); } catch { /* */ } voices.delete(id); }
  }

  // Sequenced one-shot (the arp): fixed durSec, velocity as gain, fire-and-forget.
  function hit(freq: number, when: number, durSec: number, vel = 1): void {
    if (!(freq > 0)) return;
    const t = Math.max(when ?? ctx.currentTime, ctx.currentTime);
    const started = startVoice(freq, t, { loop: false, durSec, vel, fadeOut: params.hitFade });
    if (!started) return;
    hitVoices.add(started.voice);
    void started.voice.ended.then(() => hitVoices.delete(started.voice));
  }

  // Re-pitch a SUSTAINED voice in place (←/→ transpose / the bass drone glide) — glides within its
  // own zone; no re-trigger. Updates the voice's baseRate so a bend released mid-glide still
  // restores to the NEW pitch. Optional `tau` = the glide time (the GLIDE knob rides this seam;
  // omitted keeps the player's 0.03 default so keys transpose feels unchanged).
  // W16: returns whether a LIVE voice was retuned — false means the id isn't ringing (e.g. a decay
  // zone's '__drone' rang out and self-cleaned), so the caller can re-strike instead of gliding air.
  function retune(id: string, freq: number, when?: number, tau?: number): boolean {
    if (!(freq > 0)) return false;
    const v = voices.get(id);
    if (!v || !v.voice.setRate) return false;
    v.baseRate = rateForRoot(v.rootMidi, freq, params.tune);
    v.voice.setRate(v.baseRate * bendMult(), when, tau);
    return true;
  }

  // Momentary pitch bend (the DIVE gesture): glide every LIVE held voice off its tracked baseRate;
  // `0` restores exactly (baseRate is authoritative — we never read the bent rate back). Default τ
  // is asymmetric on purpose: slow fall into the dive (0.45), quick recover (0.07).
  function bend(cents: number, tau?: number): void {
    bendCents = cents;
    const mult = bendMult();
    const t = ctx.currentTime;
    const tc = tau ?? (cents !== 0 ? 0.45 : 0.07);
    for (const v of voices.values()) {
      if (v.voice.setRate) { try { v.voice.setRate(v.baseRate * mult, t, tc); } catch { /* */ } }
    }
  }

  function allOff(when?: number, keepIds?: readonly string[]): void {
    // 30ms: a real (if quick) release — the hard-stop path must not pop any more than noteOff does.
    // `keepIds` spares named sustained voices (the bass '__drone' rides keys-side arp/latch chokes
    // WITHOUT a kill-and-revive re-attack — the synth drone survives those, so must the sample's).
    for (const [id, v] of voices) {
      if (keepIds && keepIds.includes(id)) continue;
      try { v.voice.stop(when, 0.03); } catch { /* */ }
      voices.delete(id);
    }
    for (const v of hitVoices) { try { v.stop(when, 0.03); } catch { /* */ } }
    hitVoices.clear();
  }

  return {
    zones,
    out,
    get params() { return params; },
    setParams(patch) { params = { ...params, ...patch }; if (patch.layerMix != null) setMix(params.layerMix); },
    noteOn,
    noteOff,
    hit,
    retune,
    bend,
    allOff,
    dispose() {
      allOff();
      if (!opts.destination) { try { out.disconnect(); } catch { /* */ } }
    },
  };
}

// ═══ lane K (new): the contract's name for the player. mock-sample-player IS the Studio's real runtime player for
// built voices (views/instrument/index.ts:520 passes no player, so sampler/index.ts:98 falls back to it: C §1). ═══
export const createSamplePlayer = createMockSamplePlayer;
