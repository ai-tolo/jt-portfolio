// SIGNAL · lane D · THE DRUMS — the house kit booked on THE lattice through the Studio's drum voice, stage for stage.
//
// THE GRID IS THE TRUTH (types.ts DrumsState). One 6×16 grid of DrumVel cells is what book() plays, with the Studio's
// SEQ-branch law: SEQ_TIER · humanize · swing · the kick straight and ducking. DENSITY and the pattern seg REGENERATE
// the grid (generateDrumPattern, groove 0.3, verbatim); a hand edit is kept until the next regenerate. There is no
// AUTO branch: the generator's active steps equal auto's at the same density by construction (drum-pattern.ts:11-14),
// so nothing the visitor hears is missing from what the grid shows.
//
// THE CHAIN (docs/signal-map/A-drums.md §1), verbatim from the core:
//   voice (BufferSource → Gain, constant) → drumLP1..4 (② cover) → drumHP..4 (① low-cut)
//   → dry ‖ TEXTURE (drumWet → texShaper 4× → texLP) → drumGlue → drumWarm tanh(1.18x) 2× → drumTrim
//   → drumGainNode (+ ROOM ×0.16, + the drums' OWN delay) → stopGate → drumBus (`bus`) → out.drumsIn.
// Drums bypass the keys glue and the duck (core.ts:605-608); each kick books the duck on the keys + bass through
// effects.duckHit (A §5).
//
// TIME (A §7). book() receives each 16th line of the lattice from the Timekeeper and books every due lane as a
// TRACKED voice (P/click.ts): stop() cancels the ones not started and ramps the sounding ones out in ≤ 30 ms, so a
// master stop never leaves a booked hit or a ringing openhat behind (the core could not: core.ts:1159).
//
// ONE WRITER PER NODE (E §7): gain × (1 − mute) on drumGainNode (here), the master stop on stopGate (here), the
// solo on `bus` (the integrator's, ramped), the duck envelope on out.duck (effects.duckHit; this module only resets
// it where the Studio's drum setters did: beat off core.ts:1446, sidechain off core.ts:1468).
//
// from signal-studio-v6lib/src/engine/dsp.ts:7,133-169,174-178,197-208,219 (2a9e4a7) — clamp, drumTexCurve, softCurve,
//   warmCurve, xToF, hp/lpCascadeCorner, nodeQ: verbatim.
// from signal-studio-v6lib/src/engine/drum-kit.ts:29-31 (2a9e4a7) — LANE_BAKED_TRIM, `perc` → `shaker`.
// from signal-studio-v6lib/src/engine/core.ts:385-397,998-1025,1037-1066,1082-1110,1113-1132,1192-1210,1299-1321,1443-1479
//   (2a9e4a7) — the gain law, the drum graph, the room, the delay, the play law, SEQ_TIER/setDrumStep, the duck's call
//   side, the step body (SEQ branch), setBeat and the drum setters.
// from signal-studio-v6lib/src/engine/sample-player.ts:97-190 (2a9e4a7) — the drum-default voice.
// from signal-studio-v6lib/src/views/instrument/rhythm.ts:144 (2a9e4a7) — genGroove 0.3.
// from signal-studio-page/src/page/click.ts:47-48,96-128,145-153,183-200 (67b6b58) — the tracked voice: register,
//   release/cancel, the sweep, the stop law.
// Inline, `S` = signal-studio-v6lib and `P` = signal-studio-page at those commits; every block names its lines.
// Cut (A §8): the auto branch, the chop sink, the K1 user kit + choke, determinism/offline, capture taps, the core clock.
import type {
  Booking, CreateDrums, DrumDelayDiv, DrumLane, DrumPatternName, Drums, DrumsDeps, DrumsState, DrumTexture,
  DrumVel, FrameGrid, Timekeeper,
} from './types.ts';
import { BPM_DEFAULT, DRUM_LANES } from './types.ts';
import { generateDrumPattern } from './drum-pattern.ts';

// ─────────────────────────────────────────────────────────────── dsp helpers
// from S/src/engine/dsp.ts (2a9e4a7), verbatim; each keeps its source line numbers. Private copies (NOTES-SIGNAL-R1 §0).

// dsp.ts:7
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

// dsp.ts:174-178 (fToX dropped: nothing here reads a frequency back)
const FMIN = 20,
  FMAX = 20000,
  FLR = Math.log(FMAX / FMIN);
const xToF = (x: number): number => FMIN * Math.exp(clamp(x, 0, 1) * FLR);

// dsp.ts:197-208
const hpCascadeCorner = (hpHz: number, hpFreq01: number, slope: number, i: number): number => {
  const cf = clamp((hpFreq01 - 0.02) / 0.08, 0, 1);
  const eng = clamp((slope - i / 3) * 3, 0, 1);
  return 10 * Math.pow((20 * Math.pow(hpHz / 20, eng)) / 10, cf);
};
const lpCascadeCorner = (baseHz: number, slope: number, i: number): number => {
  const eng = clamp((slope - i / 3) * 3, 0, 1);
  return 20000 * Math.pow(baseHz / 20000, eng);
};

// dsp.ts:219 — node dB → the primary pole's Web Audio Q (dB): −3.01 flat at 0 dB
const nodeQ = (db: number): number => 2 * db - 3.01 * (1 - Math.min(1, Math.abs(db) / 3));

// dsp.ts:133-149
function drumTexCurve(flavor: string, a: number) {
  const n = 512,
    c = new Float32Array(n),
    k = a * a;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    if (flavor === 'drive') {
      const kp = k * 7 + k * k * 12,
        kn = k * 3 + k * k * 5;
      c[i] = x >= 0 ? ((1 + kp) * x) / (1 + kp * x) : ((1 + kn) * x) / (1 - kn * x);
    } else {
      const d = 1 + a * 3.4 + a * a * 5;
      c[i] = Math.tanh((x + 0.16 * a * x * x) * d);
    }
  }
  return c;
}

// dsp.ts:151-159
function softCurve() {
  const n = 1024,
    c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * 1.12);
  }
  return c;
}

// dsp.ts:161-169
function warmCurve() {
  const n = 256,
    c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * 1.18);
  }
  return c;
}

// ─────────────────────────────────────────────────────────────── tables
/** S/src/engine/drum-kit.ts:29-31 LANE_BAKED_TRIM, `perc` → `shaker` (value unchanged). */
const TRIM: Readonly<Record<DrumLane, number>> = { kick: 1.0, snare: 0.92, hat: 0.34, openhat: 0.42, clap: 0.72, shaker: 0.4 };
/** S core.ts:1113 */
const KITGAIN = 0.5;
/** S core.ts:1192 — cell 0/1/2/3 → base velocity (off/ghost/mid/accent) */
const SEQ_TIER = [0, 0.45, 0.8, 1.0];
/** S core.ts:1082 — beats per echo; the core's index 0..4 keyed by the contract's names. */
const DRUM_DELAY_DIVS: Readonly<Record<DrumDelayDiv, number>> = { '1/16': 0.25, '1/8': 0.5, '1/8d': 0.75, '1/4': 1, '1/2': 2 };
/** S core.ts:1041-1044 — [delaySec, gain, pan] */
const ROOM_TAPS: Array<[number, number, number]> = [
  [0.0083, 0.52, -0.45], [0.0137, 0.43, 0.55], [0.0193, 0.35, -0.30],
  [0.0251, 0.29, 0.40], [0.0317, 0.23, -0.20], [0.0397, 0.18, 0.28],
];
/** S rhythm.ts:144 genGroove — the tower never exposed a drum GROOVE (A §2). */
const GEN_GROOVE = 0.3;
/** S core.ts:250 drumSlope 1 · drumHpSlope 1 — DrumsState carries no slope, so both stay at the Studio's default. */
const SLOPE = 1;
/** P click.ts:47-48 — the master-stop fade on a sounding voice (setTargetAtTime τ) and when its source is cut. */
const KILL_TAU = 0.004;
const KILL_STOP_SEC = 0.03;
/** The stop gate reopens on this τ: open to 99 % by the 10 ms a pad hit waits, before any booked line (≥ 4 ms). */
const GATE_OPEN_TAU = 0.002;
/** S views/instrument/index.ts:856 — a pad audition starts now + 10 ms. */
const HIT_LEAD = 0.01;
/** S core.ts:1446 (beat off) · 1468 (sidechain off) — the duck's return τ. */
const DUCK_RESET_BEAT_TAU = 0.05;
const DUCK_RESET_SC_TAU = 0.04;

export const DRUM_PATTERN_NAMES: readonly DrumPatternName[] = ['floor', 'back', 'half', 'break'];
export const DRUM_DELAY_DIV_NAMES: readonly DrumDelayDiv[] = ['1/16', '1/8', '1/8d', '1/4', '1/2'];

/** The grid the generator writes for (density, pattern): generateDrumPattern(density, 0.3, pattern), `perc` → `shaker`. */
export function patternSeq(density: number, pattern: DrumPatternName): Record<DrumLane, DrumVel[]> {
  const g = generateDrumPattern(density, GEN_GROOVE, pattern);
  return {
    kick: g.kick.slice(), snare: g.snare.slice(), hat: g.hat.slice(),
    openhat: g.openhat.slice(), clap: g.clap.slice(), shaker: g.perc.slice(),
  };
}

/** The contract's defaults (types.ts DrumsState): FLOOR at density .5 already on the grid, everything else neutral. */
export function defaultDrumsState(): DrumsState {
  return {
    on: false, pattern: 'floor', seq: patternSeq(0.5, 'floor'), density: 0.5, swing: 0,
    cover: 1, coverDb: 0, lowcut: 0, lowcutDb: 0, texture: 'tape', textureAmt: 0,
    delay: { mix: 0, time: '1/8', feedback: 0.35 }, sidechain: 0.3, gain: 1, mute: false,
  };
}

// ─────────────────────────────────────────────────────────────── factory

/** What the drums read of the Timekeeper: the lattice (swing frames, the kick's beat for duckHit) and the bpm (the
 *  drums' own delay time). NOT in DrumsDeps (a contract gap, reported): without it the drums learn the bar from two
 *  consecutive bookings and assume BPM_DEFAULT before that. */
export type DrumsTempo = Pick<Timekeeper, 'grid' | 'bpm'>;
export type DrumsFactoryDeps = DrumsDeps & { time?: DrumsTempo };

/** Drums + the one node the integrator needs: `bus` = drumBus (post chain, post stop gate, → out.drumsIn). The
 *  integrator's SOLO writes `bus.gain` (ramped, τ 5 ms, E §7); mute/gain stay on the module's own gain node and the
 *  master stop on its stop gate, so no two writers share a node. */
export interface SignalDrums extends Drums { readonly bus: GainNode }

interface Voice {
  frame: number;          // the ctx frame it starts on
  endFrame: number;       // its scheduled stop, in frames (the sweep's clock)
  stopAt: number;         // its scheduled stop, in seconds
  src: AudioBufferSourceNode;
  gain: GainNode;
}

export function createDrums(d: DrumsFactoryDeps): SignalDrums {
  const { ctx, out, effects, kit } = d;
  const time = d.time || null;
  const sr = ctx.sampleRate;
  const st: DrumsState = defaultDrumsState();
  /** S core.ts:1122-1123, 1304 draw rng.bi(); the page has no replay, so Math.random (A §8 REWRITE). */
  const bi = (): number => Math.random() * 2 - 1;

  // ─────────────────────────────────────────────────────────────── the tempo, read off the lattice
  let barF = 0;                       // the lattice bar in frames, as the latest booking showed it
  let prevN = Number.NaN, prevFrame = 0;
  /** The bar length (frames) of the lattice this booking is on. Exact when the Timekeeper's grid reproduces the
   *  booking's frame (types.ts: originFrame + bar·barFrames + round(step·barFrames/16)); a grid that does not (a
   *  tempo change still pending) keeps the last exact one. Without a Timekeeper: learned from two consecutive lines. */
  function latticeBar(b: Booking): number {
    const n = b.bar * 16 + b.step;
    let g: FrameGrid | null = null;
    try { g = time ? time.grid() : null; } catch { g = null; }
    const gOk = !!g && Number.isFinite(g.barFrames) && g.barFrames > 0;
    if (g && gOk && g.originFrame + b.bar * g.barFrames + Math.round((b.step * g.barFrames) / 16) === b.frame) barF = g.barFrames;
    else if (n === prevN + 1 && b.frame > prevFrame) {
      const f = (b.frame - prevFrame) * 16; // a line is floor or ceil of barFrames/16: within 16 frames = same tempo
      if (!barF || Math.abs(f - barF) > 16) barF = f;
    }
    prevN = n; prevFrame = b.frame;
    if (!barF) barF = g && gOk ? g.barFrames : Math.round((240 * sr) / BPM_DEFAULT);
    return barF;
  }
  function bpmNow(): number {
    let b = Number.NaN;
    try { b = time ? time.bpm() : barF > 0 ? (240 * sr) / barF : BPM_DEFAULT; } catch { b = Number.NaN; }
    return Number.isFinite(b) && b > 0 ? b : BPM_DEFAULT;
  }
  /** S core.ts:1093 drumDelaySec */
  function delaySec(bpm: number): number { return clamp((60 / bpm) * (DRUM_DELAY_DIVS[st.delay.time] || 0.5), 0.02, 7.9); }

  // ── the chain: S core.ts:998-1025 (verbatim; the cover/low-cut read the contract's 0..1 positions + node dB) ──
  const drumLP1 = ctx.createBiquadFilter(); drumLP1.type = 'lowpass'; drumLP1.frequency.value = xToF(st.cover); drumLP1.Q.value = nodeQ(st.coverDb); // W26: Q = node dB
  const drumLP2 = ctx.createBiquadFilter(); drumLP2.type = 'lowpass'; drumLP2.frequency.value = xToF(st.cover); drumLP2.Q.value = -3.01; // W26: Butterworth-flat slope poles
  const drumLP3 = ctx.createBiquadFilter(); drumLP3.type = 'lowpass'; drumLP3.frequency.value = 20000; drumLP3.Q.value = -3.01;
  const drumLP4 = ctx.createBiquadFilter(); drumLP4.type = 'lowpass'; drumLP4.frequency.value = 20000; drumLP4.Q.value = -3.01;
  const drumLPx = [drumLP2, drumLP3, drumLP4];
  const drumHP = ctx.createBiquadFilter(); drumHP.type = 'highpass'; drumHP.frequency.value = xToF(st.lowcut); drumHP.Q.value = nodeQ(st.lowcutDb); // W26: Q = node dB
  const drumHP2 = ctx.createBiquadFilter(); drumHP2.type = 'highpass'; drumHP2.Q.value = -3.01; drumHP2.frequency.value = 20; // W26: Butterworth-flat slope poles
  const drumHP3 = ctx.createBiquadFilter(); drumHP3.type = 'highpass'; drumHP3.Q.value = -3.01; drumHP3.frequency.value = 20;
  const drumHP4 = ctx.createBiquadFilter(); drumHP4.type = 'highpass'; drumHP4.Q.value = -3.01; drumHP4.frequency.value = 20;
  const drumHPx = [drumHP2, drumHP3, drumHP4]; // W22 low-cut slope cascade
  const drumDry = ctx.createGain(); drumDry.gain.value = 1;
  const drumWet = ctx.createGain(); drumWet.gain.value = 0;
  const texShaper = ctx.createWaveShaper(); texShaper.oversample = '4x';
  const texLP = ctx.createBiquadFilter(); texLP.type = 'lowpass'; texLP.frequency.value = 18000; texLP.Q.value = -6.02; // W58: Q unit fix
  const drumGlue = ctx.createDynamicsCompressor(); drumGlue.threshold.value = -8; drumGlue.knee.value = 12; drumGlue.ratio.value = 1.8; drumGlue.attack.value = 0.006; drumGlue.release.value = 0.15;
  const drumWarm = ctx.createWaveShaper(); drumWarm.curve = warmCurve(); drumWarm.oversample = '2x';
  const drumTrim = ctx.createGain(); drumTrim.gain.value = 1;
  // S core.ts:385 (the module's GAIN × MUTE node) · core.ts:369 (drumBus)
  const drumGainNode = ctx.createGain(); drumGainNode.gain.value = 1;
  // A §8 REWRITE stop(): after drumGainNode, so the master stop silences dry + room + echoes at once and neither the
  // room comb (fb .33) nor the delay lines can ring past it; reopened by the next voice (book or hit).
  const stopGate = ctx.createGain(); stopGate.gain.value = 1;
  const drumBus = ctx.createGain(); drumBus.gain.value = 1;
  drumLP1.connect(drumLP2); drumLP2.connect(drumLP3); drumLP3.connect(drumLP4); // W23 cover slope cascade
  drumLP4.connect(drumHP); drumHP.connect(drumHP2); drumHP2.connect(drumHP3); drumHP3.connect(drumHP4); // W21/W22 low-cut + slope cascade
  drumHP4.connect(drumDry); drumDry.connect(drumGlue);
  drumHP4.connect(drumWet); drumWet.connect(texShaper); texShaper.connect(texLP); texLP.connect(drumGlue);
  drumGlue.connect(drumWarm); drumWarm.connect(drumTrim); drumTrim.connect(drumGainNode);
  drumGainNode.connect(stopGate); stopGate.connect(drumBus); drumBus.connect(out.drumsIn); // core:608 drumBus → preLimit

  // ── the ROOM: S core.ts:1037-1066 (verbatim) — always on, no control ──
  const drumRoomSend = ctx.createGain(); drumRoomSend.gain.value = 1;
  const drumRoomSum = ctx.createGain(); drumRoomSum.gain.value = 1;
  for (const [ts, g, p] of ROOM_TAPS) {
    const dl = ctx.createDelay(0.1); dl.delayTime.value = ts;
    const tg = ctx.createGain(); tg.gain.value = g;
    drumRoomSend.connect(dl); dl.connect(tg);
    if (ctx.createStereoPanner) { const pan = ctx.createStereoPanner(); pan.pan.value = p; tg.connect(pan); pan.connect(drumRoomSum); }
    else tg.connect(drumRoomSum);
  }
  const drumRoomFbDelay = ctx.createDelay(0.2); drumRoomFbDelay.delayTime.value = 0.041;
  const drumRoomFbDamp = ctx.createBiquadFilter(); drumRoomFbDamp.type = 'lowpass'; drumRoomFbDamp.frequency.value = 3600; drumRoomFbDamp.Q.value = -6.02; // W58: Q unit fix
  const drumRoomFb = ctx.createGain(); drumRoomFb.gain.value = 0.33;
  drumRoomSum.connect(drumRoomFbDelay); drumRoomFbDelay.connect(drumRoomFbDamp); drumRoomFbDamp.connect(drumRoomFb);
  drumRoomFb.connect(drumRoomFbDelay); // the comb loop
  const drumRoomLP = ctx.createBiquadFilter(); drumRoomLP.type = 'lowpass'; drumRoomLP.frequency.value = 5200; drumRoomLP.Q.value = -6.02; // W58: Q unit fix
  const drumRoomSat = ctx.createWaveShaper(); drumRoomSat.curve = softCurve(); drumRoomSat.oversample = '2x';
  const drumRoomMix = ctx.createGain(); drumRoomMix.gain.value = 0.16; // the glue level (subtle, tune by ear)
  drumRoomSum.connect(drumRoomLP); drumRoomFb.connect(drumRoomLP); // ER + tail to the output path
  drumRoomLP.connect(drumRoomSat); drumRoomSat.connect(drumRoomMix); drumRoomMix.connect(drumGainNode);
  drumTrim.connect(drumRoomSend); // the parallel send (dry path above is untouched)

  // ── the drums' OWN delay: S core.ts:1085-1101 (verbatim) + applyDrumDelay core.ts:1093, 1102-1107 ──
  const ddPre = ctx.createGain(); ddPre.gain.value = 1;
  const ddL = ctx.createDelay(8), ddR = ctx.createDelay(8); // max 8s covers '1/2' down to ~20 BPM
  const ddDamp = ctx.createBiquadFilter(); ddDamp.type = 'lowpass'; ddDamp.frequency.value = 3200; ddDamp.Q.value = -6.02; // W58: Q unit fix
  const ddFb = ctx.createGain(); ddFb.gain.value = 0;   // feedback amount (≤0.9), restored when the beat runs
  const ddMix = ctx.createGain(); ddMix.gain.value = 0; // wet level — OFF by default
  const ddPanL = ctx.createStereoPanner ? ctx.createStereoPanner() : null,
    ddPanR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (ddPanL && ddPanR) { ddPanL.pan.value = -0.6; ddPanR.pan.value = 0.6; }
  let delayBpm = bpmNow();
  ddL.delayTime.value = delaySec(delayBpm); ddR.delayTime.value = delaySec(delayBpm);
  drumTrim.connect(ddPre); ddPre.connect(ddL); ddL.connect(ddR);
  if (ddPanL && ddPanR) { ddL.connect(ddPanL); ddPanL.connect(ddMix); ddR.connect(ddPanR); ddPanR.connect(ddMix); }
  else { ddL.connect(ddMix); ddR.connect(ddMix); }
  ddR.connect(ddDamp); ddDamp.connect(ddFb); ddFb.connect(ddL); // cross-damped feedback (R→damp→fb→L)
  ddMix.connect(drumGainNode);

  // ─────────────────────────────────────────────────────────────── appliers (S core.ts, verbatim laws)
  /** S core.ts:1102-1107 applyDrumDelay — wet + feedback GATED by the beat (the tail dies when the drums stop); the
   *  time follows the tempo (core.ts:1867), re-read on every booking. */
  function applyDelay(): void {
    const t = ctx.currentTime, bpm = bpmNow(), dt = delaySec(bpm), live = st.on;
    delayBpm = bpm;
    ddL.delayTime.setTargetAtTime(dt, t, 0.03); ddR.delayTime.setTargetAtTime(dt, t, 0.03);
    ddFb.gain.setTargetAtTime(live ? clamp(st.delay.feedback, 0, 0.9) : 0, t, 0.04); // clamp <1 → never runs away
    ddMix.gain.setTargetAtTime(live ? clamp(st.delay.mix, 0, 1) : 0, t, 0.03);  // gated off on beat-stop → tail dies
  }
  /** S core.ts:1451-1467 setDrumLpCascade + setCover + applyDrumEq. ② = xToF(cover) with Q nodeQ(coverDb);
   *  ① = xToF(lowcut) with Q nodeQ(lowcutDb) (the glass's law, S rhythm.ts:330-332); Q clamped −50..40 (core.ts:1888-1890). */
  function applyEq(): void {
    const t = ctx.currentTime;
    const put = (p: AudioParam, v: number): void => { if (t === 0) p.setValueAtTime(v, 0); else p.setTargetAtTime(v, t, 0.03); };
    const lpHz = xToF(st.cover), lpQ = clamp(nodeQ(st.coverDb), -50, 40);
    const hpHz = xToF(st.lowcut), hpQ = clamp(nodeQ(st.lowcutDb), -50, 40);
    put(drumLP1.frequency, lpHz); put(drumLP1.Q, lpQ);
    for (let i = 0; i < drumLPx.length; i++) put(drumLPx[i].frequency, lpCascadeCorner(lpHz, SLOPE, i));
    put(drumHP.frequency, hpHz); put(drumHP.Q, hpQ);
    for (let i = 0; i < drumHPx.length; i++) put(drumHPx[i].frequency, hpCascadeCorner(hpHz, st.lowcut, SLOPE, i));
  }
  /** S core.ts:1472-1479 applyDrumTex (character = textureAmt, drumTex = texture). */
  let curTexAmt = -1, curTexFlav = '';
  function applyTex(): void {
    const v = st.textureAmt, fl = st.texture || 'tape', t = ctx.currentTime;
    if (v !== curTexAmt || fl !== curTexFlav) { texShaper.curve = v < 0.01 ? null : drumTexCurve(fl, v); curTexAmt = v; curTexFlav = fl; }
    drumWet.gain.setTargetAtTime(v < 0.01 ? 0 : clamp(v * 0.7 + v * v * 0.9, 0, 1.5), t, 0.03);
    texLP.frequency.setTargetAtTime(v < 0.01 ? 18000 : clamp(17000 - v * 6500, 9000, 17000), t, 0.05);
    drumTrim.gain.setTargetAtTime(1 / (1 + v * 0.45), t, 0.03);
  }
  /** S core.ts:388-397 applyModuleGain (drums): gain × (1 − mute), τ 20 ms, pinned exactly at t = 0. */
  function applyGain(): void {
    const v = clamp(st.gain, 0, 1.25) * (1 - (st.mute ? 1 : 0));
    const t = ctx.currentTime;
    if (t === 0) { drumGainNode.gain.setValueAtTime(v, 0); return; }
    drumGainNode.gain.setTargetAtTime(v, t, 0.02);
  }
  /** S core.ts:1446 / 1468 — the duck back to 1: only the drums know their kicks were un-booked. */
  function duckReset(tau: number): void {
    const t = ctx.currentTime, p = out.duck.gain;
    p.cancelScheduledValues(t); p.setTargetAtTime(1, t, tau);
  }

  // ─────────────────────────────────────────────────────────────── voices (tracked)
  let voices: Voice[] = [];
  let gateOpen = true;

  // P click.ts:96-106 (verbatim): release = out of the graph; cancel = a voice not started yet never plays.
  const release = (v: Voice): void => {
    try { v.src.disconnect(); } catch { /* already gone */ }
    try { v.gain.disconnect(); } catch { /* already gone */ }
  };
  const cancel = (v: Voice): void => {
    try { v.src.onended = null; v.src.stop(); } catch { /* never started / already stopped */ }
    release(v);
  };
  /** P click.ts:145-153 — onended is the normal exit; this catches a context that never fires it. */
  function sweep(nowF: number): void {
    if (!voices.length) return;
    const keep: Voice[] = [];
    for (const v of voices) { if (v.endFrame + sr < nowF) release(v); else keep.push(v); }
    voices = keep;
  }
  /** Every voice not started by now leaves (the drums were switched off: nothing new may sound). */
  function unbookFuture(): void {
    const nowF = Math.round(ctx.currentTime * sr);
    const keep: Voice[] = [];
    for (const v of voices) { if (v.frame > nowF) cancel(v); else keep.push(v); }
    voices = keep;
  }
  function openGate(): void {
    if (gateOpen) return;
    gateOpen = true;
    const now = ctx.currentTime;
    stopGate.gain.cancelScheduledValues(now);
    stopGate.gain.setTargetAtTime(1, now, GATE_OPEN_TAU);
  }

  /** One hit. S core.ts:1118-1132 playSample (the baked path, core.ts:1159) through S sample-player.ts:97-190's drum
   *  default (source → constant gain → drumLP1, start(when), stop(when + duration + 0.05)), registered as P click.ts:
   *  108-128 does. g = vel · trim · KITGAIN · (1 + bi·0.05), rate = 1 + bi·0.012 (the draw order kept: rate, then gain). */
  function spawn(lane: DrumLane, when: number, vel: number): void {
    const buf = kit[lane];
    if (!buf || !(vel >= 0.02)) return; // core.ts:1119 (a lane that failed to decode books nothing, P click.ts:111)
    openGate();
    const r = 1 + bi() * 0.012;
    const g = vel * TRIM[lane] * KITGAIN * (1 + bi() * 0.05);
    const at = Math.max(0, when);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = r;
    const gain = ctx.createGain();
    gain.gain.value = g; // constant: a fade-in would soften the transient (sample-player.ts:150-159)
    src.connect(gain);
    gain.connect(drumLP1);
    const stopAt = at + buf.duration + 0.05;
    const v: Voice = { frame: Math.round(at * sr), endFrame: Math.round(stopAt * sr), stopAt, src, gain };
    src.onended = (): void => {
      release(v);
      const i = voices.indexOf(v);
      if (i >= 0) voices.splice(i, 1);
    };
    try { src.start(at); src.stop(stopAt); } catch { release(v); return; }
    voices.push(v);
  }

  /** S core.ts:1201-1210 — the call side of duckHit: muted drums do not pump, sidechain < 1 % is off; the kick's
   *  velocity is ignored. The envelope itself is effects.duckHit's (core.ts:1210-1215). */
  function duck(t: number, barFrames: number): void {
    if (st.mute || st.sidechain < 0.01) return;
    effects.duckHit(t, st.sidechain, barFrames / 4 / sr);
  }

  // ─────────────────────────────────────────────────────────────── the contract

  /** S core.ts:1299-1321, the SEQ branch on the lattice (A §2-3, §8 REWRITE "tick's drum branch"). Fixed lane order;
   *  the kick fires straight at the line and ducks (any kick cell, ghost included); the others at the swung line
   *  + ONE ±5 ms jitter per step (core.ts:1304). Swing in frames: round(swing·0.66·barFrames/16) on 2/6/10/14,
   *  round(swing·0.5·barFrames/16) on the odd 16ths, 0/4/8/12 never move (core.ts:1303). */
  function book(b: Booking): void {
    const bf = latticeBar(b);
    const nowF = Math.round(ctx.currentTime * sr);
    sweep(nowF);
    if (!st.on) return;
    const step = b.step;
    if (!Number.isInteger(step) || step < 0 || step > 15 || !Number.isFinite(b.frame)) return;
    if (bpmNow() !== delayBpm) applyDelay(); // follow the tempo (S core.ts:1867 re-times the drum delay)
    const stepF = bf / 16;
    let swF = 0;
    if (st.swing > 0) { if (step % 4 === 2) swF = Math.round(st.swing * 0.66 * stepF); else if (step % 2 === 1) swF = Math.round(st.swing * 0.5 * stepF); }
    const t = b.frame / sr;
    const tt = (b.frame + swF) / sr + bi() * 0.005;
    for (const lane of DRUM_LANES) {
      const cell = st.seq[lane][step];
      if (!(cell > 0)) continue;
      const vel = SEQ_TIER[cell] * (1 + bi() * 0.08); // vh(): vel ±8 %
      if (lane === 'kick') { spawn('kick', t, vel); duck(t, bf); }
      else spawn(lane, tt, vel);
    }
  }

  /** A pad press: now + 10 ms (S index.ts:856), the grid's gain law (vel 1 = accent); no duck (the audition never
   *  pumped, S index.ts:851-866). While the drums are off it plays dry + room: the delay is gated by `on`. */
  function hit(lane: DrumLane, vel = 1): void {
    if (!DRUM_LANES.includes(lane)) return;
    spawn(lane, ctx.currentTime + HIT_LEAD, clamp(Number.isFinite(vel) ? vel : 1, 0, 1));
  }

  /** The master stop's drums half (P click.ts:183-200 + A §8 REWRITE stop()): voices not started are un-booked,
   *  sounding ones fade (τ 4 ms) and are cut at +30 ms, the delay return + feedback go to 0, the stop gate closes
   *  (τ 4 ms: −90 dB inside 45 ms) so the room comb and the delay lines cannot ring past it. `on` → false, as the
   *  Studio's kill() turns the beat off (core.ts:1957). The duck automation is effects.hush()'s. */
  function stop(): void {
    const now = ctx.currentTime, nowF = Math.round(now * sr);
    st.on = false;
    const keep: Voice[] = [];
    for (const v of voices) {
      if (v.frame > nowF) { cancel(v); continue; }
      try {
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setTargetAtTime(0, now, KILL_TAU);
        v.src.stop(Math.min(v.stopAt, now + KILL_STOP_SEC));
      } catch { release(v); continue; }
      keep.push(v);
    }
    voices = keep;
    for (const p of [ddMix.gain, ddFb.gain]) { p.cancelScheduledValues(now); p.setTargetAtTime(0, now, KILL_TAU); }
    gateOpen = false;
    stopGate.gain.cancelScheduledValues(now);
    stopGate.gain.setTargetAtTime(0, now, KILL_TAU);
  }

  function regenerate(): void { st.seq = patternSeq(st.density, st.pattern); }

  /** S core.ts:1194-1197 setDrumStep: out-of-range index or lane ignored, anything but 1..3 clears. */
  function setStep(lane: DrumLane, i: number, v: DrumVel): void {
    i = i | 0;
    if (i < 0 || i > 15 || !DRUM_LANES.includes(lane)) return;
    const c = (v as number) | 0;
    st.seq[lane][i] = (c >= 1 && c <= 3 ? c : 0) as DrumVel;
  }

  const num = (x: unknown, cur: number, lo: number, hi: number): number =>
    typeof x === 'number' && Number.isFinite(x) ? clamp(x, lo, hi) : cur;
  const cell = (c: unknown): DrumVel => { const n = typeof c === 'number' ? c | 0 : 0; return (n >= 1 && n <= 3 ? n : 0) as DrumVel; };

  /** Every write is sanitised (a foreign or old save never throws, never blanks the grid). Setting `pattern` or
   *  `density` REGENERATES the grid, so a load must set them BEFORE `seq`. */
  function set<K extends keyof DrumsState>(k: K, v: DrumsState[K]): void {
    const x: unknown = v;
    switch (k) {
      case 'on': { // S core.ts:1443-1448 setBeat: the clock itself is the Timekeeper's (the integrator's want)
        const on = x === true;
        const was = st.on;
        st.on = on;
        if (was && !on) { unbookFuture(); duckReset(DUCK_RESET_BEAT_TAU); }
        applyDelay(); // ring the delay on start, gate it (tail dies) on stop
        return;
      }
      case 'pattern':
        if (typeof x === 'string' && (DRUM_PATTERN_NAMES as readonly string[]).includes(x)) st.pattern = x as DrumPatternName;
        regenerate();
        return;
      case 'seq': {
        const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
        const next = {} as Record<DrumLane, DrumVel[]>;
        for (const lane of DRUM_LANES) {
          const row = o[lane];
          next[lane] = Array.isArray(row) ? Array.from({ length: 16 }, (_, i) => cell(row[i])) : st.seq[lane].slice();
        }
        st.seq = next;
        return;
      }
      case 'density': st.density = num(x, st.density, 0, 1); regenerate(); return;
      case 'swing': st.swing = num(x, st.swing, 0, 1); return;
      case 'cover': st.cover = num(x, st.cover, 0, 1); applyEq(); return;
      case 'coverDb': st.coverDb = num(x, st.coverDb, -24, 18); applyEq(); return;
      case 'lowcut': st.lowcut = num(x, st.lowcut, 0, 1); applyEq(); return;
      case 'lowcutDb': st.lowcutDb = num(x, st.lowcutDb, -24, 18); applyEq(); return;
      case 'texture': if (x === 'tape' || x === 'drive') st.texture = x as DrumTexture; applyTex(); return;
      case 'textureAmt': st.textureAmt = num(x, st.textureAmt, 0, 1); applyTex(); return;
      case 'delay': {
        const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
        const tm = o.time;
        st.delay = {
          mix: num(o.mix, st.delay.mix, 0, 1),
          time: typeof tm === 'string' && (DRUM_DELAY_DIV_NAMES as readonly string[]).includes(tm) ? (tm as DrumDelayDiv) : st.delay.time,
          feedback: num(o.feedback, st.delay.feedback, 0, 1), // ≤ 0.9 at the node (core.ts:1105)
        };
        applyDelay();
        return;
      }
      case 'sidechain': // S core.ts:1468 setSidechain
        st.sidechain = num(x, st.sidechain, 0, 1);
        if (st.sidechain < 0.01) duckReset(DUCK_RESET_SC_TAU);
        return;
      case 'gain': st.gain = num(x, st.gain, 0, 1.25); applyGain(); return;
      case 'mute': st.mute = x === true; applyGain(); return;
      default: return;
    }
  }

  function state(): DrumsState {
    const seq = {} as Record<DrumLane, DrumVel[]>;
    for (const lane of DRUM_LANES) seq[lane] = st.seq[lane].slice();
    return { ...st, seq, delay: { ...st.delay } };
  }

  const ready = (): boolean => DRUM_LANES.every((l) => !!kit[l]);

  // settle every node on the state (the core's apply() at boot); at t = 0 the EQ + gain pin exactly
  applyEq(); applyTex(); applyDelay(); applyGain();

  return { state, set, setStep, regenerate, hit, book, stop, ready, bus: drumBus };
}

// The factory stays assignable to the frozen contract's CreateDrums (types only; erased at runtime).
type Assert<T extends true> = T;
export type CreateDrumsIsContract = Assert<typeof createDrums extends CreateDrums ? true : false>;
