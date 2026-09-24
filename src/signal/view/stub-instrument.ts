// SIGNAL R1 · lane V0 · view/stub-instrument.ts: an IN-MEMORY SignalInstrument for the view lanes' labs (new code, no
// Studio source). No audio, ever: the ctx is a plain object cast and every node a stand-in. State is DEFAULT-shaped
// (the defaults written in src/signal/types.ts; gain 1 = unity, docs/signal-map/G §1); every module's set() /
// setStep() / regenerate() mutates it and fires onChange. keys.held() is settable: stub.setHeld([60, 64, 67, 71]).
// time.playhead() runs from performance.now() at the stub's bpm while any part wants the clock: time.want('drums',
// true), or drums/bass `on`, or arp.on (the wantsClock law). harmony.name() knows one chord: [60,64,67,71] = Cmaj7 · I.
// stop() is the contract's shape with nothing to silence: module stops (held notes cleared), time.stop(), out.panic();
// the `on` flags are left as they are. Never shipped: the integrator composes the real modules in instrument.ts.
import { BPM_DEFAULT, BPM_MAX, BPM_MIN, DRUM_LANES, VOICE_DEFAULT } from '../types.ts';
import type {
  Bass, BassStep, Booking, DrumLane, DrumPatternName, DrumVel, Drums, Effects, Harmony, HarmonyState, Keys, Line, Part,
  SignalInstrument, SignalOut, SignalState, Timekeeper, VoiceId,
} from '../types.ts';

export interface StubInstrument extends SignalInstrument {
  /** Replace what sounds: MIDI numbers (ids become 'p'+midi) or [id, midi] pairs. Fires onHeldChange. */
  setHeld(held: ReadonlyArray<number | readonly [string, number]>): void;
}

// the four patterns as the lab draws them (FLOOR = the R0 mock's loop); density < .5 drops the ghosts, > .75 adds hat ghosts
const PATTERNS: Record<DrumPatternName, Record<DrumLane, string>> = {
  floor: { kick: '3000200030002010', snare: '0000300000003001', hat: '0201020102010202', openhat: '0030003000300030', clap: '0000200000002000', shaker: '1001001010010010' },
  back: { kick: '3000000030200000', snare: '0000300000003000', hat: '2020202020202020', openhat: '0000000000000030', clap: '0000000000000000', shaker: '0010001000100010' },
  half: { kick: '3000000000200000', snare: '0000000030000000', hat: '2000200020002000', openhat: '0000000000000000', clap: '0000000030000000', shaker: '0101010101010101' },
  break: { kick: '3000000000300000', snare: '0000300100003000', hat: '2020202220202020', openhat: '0000000000000200', clap: '0000000000000000', shaker: '0000100000001000' },
};
export function drumSeq(p: DrumPatternName, density: number): Record<DrumLane, DrumVel[]> {
  const out = {} as Record<DrumLane, DrumVel[]>;
  for (const lane of DRUM_LANES) {
    out[lane] = [...PATTERNS[p][lane]].map((c, i): DrumVel => {
      const v = Number(c) as DrumVel;
      if (v === 1 && density < 0.5) return 0;
      if (v === 0 && lane === 'hat' && density > 0.75 && i % 2 === 1) return 1;
      return v;
    });
  }
  return out;
}
// the Studio's default strip (core:1663): an accent on 1, mids on 5 9 13; density > .6 adds ghosts between
export const bassSeq = (density: number): BassStep[] =>
  Array.from({ length: 16 }, (_, i): BassStep => ({ v: (i === 0 ? 3 : i % 4 === 0 ? 2 : density > 0.6 && i % 4 === 2 ? 1 : 0) as DrumVel, oct: 'base', slide: false }));

export function defaultState(): SignalState {
  return {
    v: 1, bpm: BPM_DEFAULT,
    drums: { on: false, pattern: 'floor', seq: drumSeq('floor', 0.5), density: 0.5, swing: 0, cover: 1, coverDb: 0, lowcut: 0, lowcutDb: 0,
      texture: 'tape', textureAmt: 0, delay: { mix: 0, time: '1/8', feedback: 0.35 }, sidechain: 0.3, gain: 1, mute: false },
    bass: { on: false, mode: 'drone', seq: bassSeq(0.5), root: null, armed: false, heat: 0.5, weight: 0.5, glide: 0, density: 0.5, groove: 0.3,
      cut: 1, cutDb: 0, lowcut: 0, lowcutDb: 0, gain: 1, mute: false },
    keys: { voice: VOICE_DEFAULT, filter: 1, motion: { amount: 0, shape: 'sine', div: '1/8' },
      fx: { drive: 0, driveType: 'warm', mod: 0, modMode: 'chorus', modRate: 0.5, delay: 0, delayDiv: '1/8', reverb: 0.22, revSize: 'sm' }, gain: 1, mute: false },
    harmony: { music: { key: 0, scale: 'major', oct: 0 }, chord: false, hold: false, arp: { on: false, div: '1/8', length: 0.5, groove: 0 },
      rack: Array.from({ length: 8 }, () => null), gate: { div: '1/16', swing: 0 }, dive: { speedSec: 0.45, dist: 24 } },
    solo: null,
  };
}

const SR = 48000;
const clone = <T>(x: T): T => structuredClone(x);
const stand = <T>(): T => ({ connect() {}, disconnect() {} }) as unknown as T;   // a node that is not one

export function createStubInstrument(): StubInstrument {
  const S = defaultState();
  const listeners = new Set<() => void>();
  const changed = (): void => { listeners.forEach((cb) => cb()); };

  // ── time: 16ths counted from performance.now(); origin seated 50 ms ahead on the first want ──
  let bpm = BPM_DEFAULT, t0 = 0, last = -1, taps: number[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  const wants = new Set<Part>();
  const stepFns = new Set<(b: Booking) => void>(), barFns = new Set<(bar: number, frame: number) => void>();
  const barFrames = (): number => Math.round((240 * SR) / bpm);
  const pos = (): number => ((performance.now() - t0) / 1000) * (bpm / 60) * 4;   // 16ths since the origin
  const tick = (): void => {
    const p = Math.floor(pos());
    while (last < p) {
      last++;
      if (last < 0) continue;
      const bar = Math.floor(last / 16), step = last % 16, frame = Math.round(bar * barFrames() + (step * barFrames()) / 16);
      stepFns.forEach((f) => f({ frame, bar, step }));
      if (step === 0) barFns.forEach((f) => f(bar, frame));
    }
  };
  const halt = (): void => { if (timer) clearInterval(timer); timer = null; };
  const time: Timekeeper = {
    grid: () => ({ sr: SR, barFrames: barFrames(), originFrame: 0 }),
    bpm: () => bpm,
    setBpm(b) {
      const nb = Math.min(BPM_MAX, Math.max(BPM_MIN, b));
      if (nb === bpm) return;
      const p = pos(); bpm = nb; t0 = performance.now() - (p / 4 / (bpm / 60)) * 1000;   // the count carries on
      changed();
    },
    tap(nowMs = performance.now()) {
      if (taps.length && nowMs - taps[taps.length - 1] > 2000) taps = [];
      taps.push(nowMs);
      if (taps.length < 3) return;
      const d = taps.slice(1).map((t, i) => t - taps[i]).sort((a, b) => a - b);
      time.setBpm(60000 / d[Math.floor(d.length / 2)]);
    },
    running: () => wants.size > 0,
    want(part, on) {
      const was = wants.size > 0;
      if (on) wants.add(part); else wants.delete(part);
      if (!was && wants.size) {
        t0 = performance.now() + 50; last = -1;
        timer = setInterval(tick, 25);
        (timer as unknown as { unref?: () => void }).unref?.();
      } else if (was && !wants.size) halt();
    },
    nextLine(perBar, fromFrame): Line {
      const bf = barFrames(), span = bf / perBar;
      const now = fromFrame ?? Math.round(((performance.now() - t0) / 1000 + 0.02) * SR);
      const n = Math.max(0, Math.ceil(now / span - 1e-9)), bar = Math.floor(n / perBar), i = n % perBar;
      return { frame: bar * bf + Math.round(i * span), bar, i, perBar };
    },
    onStep(fn) { stepFns.add(fn); return () => { stepFns.delete(fn); }; },
    onBar(fn) { barFns.add(fn); return () => { barFns.delete(fn); }; },
    playhead() {
      if (!wants.size) return { bar: 0, step: 0, phase: 0 };
      const p = Math.max(0, pos()), s = Math.floor(p);
      return { bar: Math.floor(s / 16), step: s % 16, phase: p - s };   // phase = how far through this 16th
    },
    stop() { wants.clear(); halt(); },
  };

  // ── keys first (the held map feeds the bass and harmony) ──
  const held = new Map<string, number>();
  const heldFns = new Set<(h: ReadonlyArray<[string, number]>) => void>();
  const heldArr = (): ReadonlyArray<[string, number]> => [...held.entries()];
  const heldChanged = (): void => {
    const h = heldArr();
    heldFns.forEach((cb) => cb(h));
    bass.held([...new Set(h.map(([, m]) => m))].sort((a, b) => a - b));
  };
  let keysReady = true;
  const keys: Keys = {
    state: () => clone(S.keys),
    set(k, v) { S.keys[k] = v; changed(); },
    pick(v: VoiceId) {
      S.keys.voice = v; keysReady = false; changed();
      return new Promise<void>((res) => { setTimeout(() => { keysReady = true; changed(); res(); }, 350); });
    },
    ready: () => keysReady,
    noteOn(id, midi) { held.set(id, midi); heldChanged(); },
    noteOff(id) { if (held.delete(id)) heldChanged(); },
    hit() {}, bend() {},
    retune(map) { for (const [id, m] of Object.entries(map)) if (held.has(id)) held.set(id, m); heldChanged(); },
    held: heldArr,
    onHeldChange(cb) { heldFns.add(cb); return () => { heldFns.delete(cb); }; },
    allOff() { if (held.size) { held.clear(); heldChanged(); } },
    stop() { keys.allOff(); },
    out: stand<GainNode>(),
  };

  const drums: Drums = {
    state: () => clone(S.drums),
    set(k, v) { S.drums[k] = v; if (k === 'on') time.want('drums', !!v); changed(); },
    setStep(lane, i, v) { S.drums.seq[lane][i] = v; changed(); },
    regenerate() { S.drums.seq = drumSeq(S.drums.pattern, S.drums.density); changed(); },
    hit() {}, book() {}, stop() {},
    ready: () => true,
  };

  const bass: Bass = {
    state: () => clone(S.bass),
    set(k, v) { S.bass[k] = v; if (k === 'on') time.want('bass', !!v); changed(); },
    setStep(i, s) { S.bass.seq[i] = { ...s }; changed(); },
    regenerate() { S.bass.seq = bassSeq(S.bass.density); changed(); },
    held(notes) { if (S.bass.armed && notes.length) { S.bass.root = notes[0]; S.bass.armed = false; changed(); } },   // armed: the lowest pins
    gesture() {}, book() {}, stop() {},
  };

  const CMAJ7 = [60, 64, 67, 71];
  const harmony: Harmony = {
    state: () => clone(S.harmony),
    set(k, v) {
      S.harmony[k] = v;
      if (k === 'arp') time.want('arp', (v as HarmonyState['arp']).on);
      changed();
    },
    midiFor: (offset) => 60 + S.harmony.music.key + 12 * S.harmony.music.oct + offset,
    name(notes) {
      const n = [...new Set(notes)].sort((a, b) => a - b);
      return n.length === CMAJ7.length && n.every((m, i) => m === CMAJ7[i]) ? { label: 'Cmaj7', degree: 'I' } : { label: '', degree: null };
    },
    trigger(i, shift) {
      const pad = S.harmony.rack[i];
      if (shift) { if (pad) { S.harmony.rack[i] = null; changed(); } return; }
      if (pad) { pad.forEach((m, j) => held.set(`c${i}.${j}`, m)); heldChanged(); return; }
      const sounding = [...new Set(held.values())].sort((a, b) => a - b);
      if (sounding.length) { S.harmony.rack[i] = sounding; changed(); }
    },
    release(i) { let hit = false; for (const id of [...held.keys()]) if (id.startsWith(`c${i}.`)) hit = held.delete(id) || hit; if (hit) heldChanged(); },
    keyDown(id, midi, chord) { held.set(id, midi); chord?.forEach((m, j) => held.set(`${id}~${j}`, m)); heldChanged(); },
    keyUp(id) {
      if (S.harmony.hold) return;
      let hit = false;
      for (const k of [...held.keys()]) if (k === id || k.startsWith(`${id}~`)) hit = held.delete(k) || hit;
      if (hit) heldChanged();
    },
    book() {}, gesture() {},
    transpose(d) {
      const oct = Math.max(-1, Math.min(1, S.harmony.music.oct + d));
      if (oct !== S.harmony.music.oct) { S.harmony.music = { ...S.harmony.music, oct }; changed(); }
    },
    stop() { keys.allOff(); },
  };

  const ctx = { sampleRate: SR, state: 'running', get currentTime() { return performance.now() / 1000; }, resume: () => Promise.resolve(), suspend: () => Promise.resolve() } as unknown as AudioContext;
  const sounding = (): boolean => wants.size > 0 || held.size > 0;
  const out: SignalOut = {
    ctx, duck: stand<GainNode>(), drumsIn: stand<GainNode>(),
    level: () => {   // a believable wobble while something "plays", the floor otherwise (dBFS)
      const t = performance.now();
      return sounding() ? { peak: -9 + 3 * Math.sin(t / 170), rms: -19 + 2 * Math.sin(t / 290) } : { peak: -120, rms: -120 };
    },
    muted: () => true,
    panic() {},
  };
  const effects: Effects = {
    input: stand<AudioNode>(), apply() {}, duckHit() {}, hush() {}, chop() {}, releaseGate() {},
    worklet: () => 'fallback', irs: () => [],
  };

  return {
    ctx, time, out, effects, drums, bass, keys, harmony,
    wake: () => Promise.resolve(),
    stop() { drums.stop(); bass.stop(); keys.stop(); harmony.stop(); time.stop(); out.panic(); changed(); },
    setSolo(s) { S.solo = s; changed(); },
    state: () => clone({ ...S, bpm }),
    load(p) {
      if (typeof p.bpm === 'number') time.setBpm(p.bpm);
      if (p.drums) S.drums = { ...S.drums, ...p.drums };
      if (p.bass) S.bass = { ...S.bass, ...p.bass };
      if (p.keys) S.keys = { ...S.keys, ...p.keys };
      if (p.harmony) S.harmony = { ...S.harmony, ...p.harmony };
      if (p.solo !== undefined) S.solo = p.solo;
      time.want('drums', S.drums.on); time.want('bass', S.bass.on); time.want('arp', S.harmony.arp.on);
      changed();
    },
    onChange(cb) { listeners.add(cb); return () => { listeners.delete(cb); }; },
    setHeld(h) {
      held.clear();
      for (const x of h) { if (typeof x === 'number') held.set(`p${x}`, x); else held.set(x[0], x[1]); }
      heldChanged();
    },
  };
}
