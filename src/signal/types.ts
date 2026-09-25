// SIGNAL · THE PORTFOLIO REBUILD · THE CONTRACT (planner-owned; FROZEN during a round — authors code
// against it, only the planner edits it). Read NOTES-SIGNAL-R1.md first (laws, scopes, file ownership),
// then the code map docs/signal-map/{A..G}.md for the Studio facts each module ports (file:line).
//
// ONE PAGE, ONE CONTEXT, LEAVES ONLY. `src/signal/*` is a leaves-only port of the Signal Studio engine:
// the sampler, the timekeeper, the drums, the bass, the chord machine, the one low-pass, the effect
// returns. It never imports the Studio's shell, capture, store or views, and has NO runtime dependency on
// the Studio repo: every ported leaf is COPIED here with its source (repo, path, lines) in a banner.
// Erasable TypeScript only (types, interfaces, `as const`; no enums, no namespaces, no parameter
// properties): node 24 runs the *.test.mjs suites on the .ts files directly, with no loader.
//
// THE VISITOR'S JOB: have fun and make music. Zero setup, nothing hidden, no tutorial: every component
// is visible and playable; the page teaches by being touched.
//
// TIME, the one rule every module shares: ONE integer-frame lattice (FrameGrid) in AudioContext time.
// A bar is `barFrames` frames; line i of perBar lines in bar j is at originFrame + j·barFrames +
// round(i·barFrames/perBar). Every sounding event is BOOKED ahead on the lattice by the one scheduler
// (a 25 ms timer; look-ahead ≥ 120 ms, wider when the tab is hidden; late lines are SKIPPED, never
// crammed); every booked voice is TRACKED so a master stop can un-book it. The bpm is DERIVED
// (240·sr/barFrames). A tempo change lands on the next beat keeping the bar and beat count.
//
// SOUND SAFETY: the context is created SUSPENDED at boot and resumed on the first gesture; nothing
// sounds before it. The first key pressed after that resume sounds within 200 ms: the house kit and
// the default keys voice are fetched and DECODED before the first click (decodeAudioData works on a
// suspended context). ?mute=1 replaces the destination with a silent tap for the gate (SignalOut).
//
// LEVELS: everything a module makes lands on ONE master chain (out.ts) that is the Studio's, stage
// for stage. Keys (and their returns) and the bass pass through the kick sidechain `duck`; drums do
// not. The clamp curve is the last thing before the DAC.

// ─────────────────────────────────────────────────────────────── the lattice (grid.ts, from THE PAGE)

/** THE LATTICE. Integer frames per bar so every loop of k bars is exactly k·barFrames frames. */
export interface FrameGrid { sr: number; barFrames: number; originFrame: number }

export const BPM_MIN = 60;
export const BPM_MAX = 180;
export const BPM_DEFAULT = 120;

/** A booked lattice line: absolute ctx frame + where it is. `step` is the 16th inside the bar (0..15). */
export interface Booking { frame: number; bar: number; step: number }
/** A sub-16th line, for the arp and the gate: `i` of `perBar` lines in `bar`. */
export interface Line { frame: number; bar: number; i: number; perBar: number }

export type Part = 'drums' | 'bass' | 'arp' | 'gate';

export interface Timekeeper {
  grid(): FrameGrid;
  bpm(): number;
  /** Clamped to BPM_MIN..BPM_MAX; lands on the NEXT BEAT keeping the beat count (never mid-beat). */
  setBpm(bpm: number): void;
  /** TAP tempo (the `=` key, the TAP cap): the median inter-tap interval of ≥3 taps within 2 s. */
  tap(nowMs?: number): void;
  running(): boolean;
  /** A part that wants the clock (the Studio's wantsClock law): the first want seats the origin 50 ms
   *  ahead and starts the scheduler; the last un-want stops it and drops the origin. */
  want(part: Part, on: boolean): void;
  /** The next line of `perBar` lines at or after `fromFrame` (default: now + 20 ms) — a joining part
   *  starts on its own division's line, in phase with everything already running. */
  nextLine(perBar: number, fromFrame?: number): Line;
  /** Every 16th line inside the horizon, once, in order (the scheduler's hook for drums + bass +
   *  harmony). Returns an unsubscribe. */
  onStep(fn: (b: Booking) => void): () => void;
  onBar(fn: (bar: number, frame: number) => void): () => void;
  /** The playhead for the view in HEARD time (ctx − output latency): bar, 16th step, phase 0..1. */
  playhead(): { bar: number; step: number; phase: number };
  /** The master stop's time half: scheduler off, wants cleared, origin dropped. Modules kill their own
   *  bookings in their stop(). */
  stop(): void;
}

// ─────────────────────────────────────────────────────────────── the sound exit (out.ts)

export interface SignalOut {
  ctx: AudioContext;
  /** The kick sidechain gain (keys glue + bass land here; effects.ts owns the envelope bookings). */
  duck: GainNode;
  /** Where the drum bus lands (preLimit): drums bypass glue and duck, the Studio's law. */
  drumsIn: GainNode;
  /** Peak/RMS of what leaves (post-clamp), read from a pair of analysers. For the meter and the gate. */
  level(): { peak: number; rms: number };
  /** ?mute=1: the destination is a silent gain; level() keeps reading. */
  muted(): boolean;
  /** Master stop's exit half: nothing here ramps (modules do); this only guarantees the analysers keep
   *  reading and, when the page is muted, that nothing reaches the speakers. */
  panic(): void;
}

// ─────────────────────────────────────────────────────────────── drums (drums.ts + drum-pattern.ts)

export const DRUM_LANES = ['kick', 'snare', 'hat', 'openhat', 'clap', 'shaker'] as const;
export type DrumLane = (typeof DRUM_LANES)[number];
export type DrumVel = 0 | 1 | 2 | 3;                        // SEQ_TIER [0, .45, .8, 1]
export type DrumPatternName = 'floor' | 'back' | 'half' | 'break';
export type DrumDelayDiv = '1/16' | '1/8' | '1/8d' | '1/4' | '1/2';   // the drums' OWN delay (beats .25 .5 .75 1 2)
export type DrumTexture = 'tape' | 'drive';

/** THE GRID IS THE TRUTH (a deliberate deviation from the Studio's auto/seq split, Law 4: nothing hidden):
 *  the 6×16 grid always shows what plays. `pattern` + `density` regenerate it (generateDrumPattern,
 *  groove 0.3, verbatim); a hand edit is kept until the next regenerate. */
export interface DrumsState {
  on: boolean;
  pattern: DrumPatternName;
  seq: Record<DrumLane, DrumVel[]>;   // 6 × 16
  density: number;                    // 0..1 (regenerates), default 0.5
  swing: number;                      // 0..1, default 0 (reset = 0)
  cover: number;                      // 0..1 the ② low-pass position (x, xToF), default 1 = open
  coverDb: number;                    // ② resonance node, −24..+18 dB, default 0
  lowcut: number;                     // 0..1 the ① high-pass position, default 0 = open
  lowcutDb: number;                   // ① resonance, −24..+18 dB, default 0
  texture: DrumTexture;               // default 'tape'
  textureAmt: number;                 // 0..1, default 0 (below 0.01 = off)
  delay: { mix: number; time: DrumDelayDiv; feedback: number };   // defaults 0 · '1/8' · 0.35
  sidechain: number;                  // 0..1 kick → duck depth, default 0.3
  gain: number; mute: boolean;        // 0..1.25 (unity 0.8·1.25 = 1), false
}

export interface Drums {
  state(): DrumsState;
  set<K extends keyof DrumsState>(k: K, v: DrumsState[K]): void;
  setStep(lane: DrumLane, i: number, v: DrumVel): void;
  /** Regenerate the grid from pattern + density (the pattern seg, the DENSITY knob). */
  regenerate(): void;
  /** A one-shot from the view (a lane pad press): now + 10 ms, the grid's gain law (vel 1 = accent). */
  hit(lane: DrumLane, vel?: number): void;
  /** The scheduler's hook: book every lane due at this step (swing + jitter as the Studio). */
  book(b: Booking): void;
  /** Kill booked + sounding voices (≤ 30 ms), zero the delay return, cancel duck automation. */
  stop(): void;
  ready(): boolean;                   // all six lanes decoded
}

// ─────────────────────────────────────────────────────────────── bass (bass.ts + bass-pattern.ts)

export type BassMode = 'drone' | 'pluck' | 'seq';
export interface BassStep { v: DrumVel; oct: 'base' | 'sub'; slide: boolean }   // v 0 = rest; 3 = accent

export interface BassState {
  on: boolean;
  mode: BassMode;                     // default 'drone'
  seq: BassStep[];                    // 16 cells; one cell = an 8th (PULSE 2 sixteenths): a TWO-BAR strip
  root: number | null;                // MIDI: pinned root (folded to 45..115 Hz at use); null = follows the lowest held key
  armed: boolean;                     // ROOT-LOCK armed: the next onset pins its lowest note
  heat: number; weight: number; glide: number;   // INTENSITY (0..1, .5) · SUB (0..1, .5) · GLIDE (0..1 → τ 8..300 ms, 0)
  density: number; groove: number;    // the generator (0..1: .5, .3); pluck = 0.6·groove
  cut: number; cutDb: number;         // ② tone low-pass position (1 = open) + resonance dB (0)
  lowcut: number; lowcutDb: number;   // ① (0 = open, 0)
  gain: number; mute: boolean;
}

export interface Bass {
  state(): BassState;
  set<K extends keyof BassState>(k: K, v: BassState[K]): void;
  setStep(i: number, s: BassStep): void;
  regenerate(): void;
  /** The keys tell the bass what sounds (the arp pool while the arp runs): MIDI notes, ascending. The
   *  lowest wins unless a root is pinned; an ONSET (a note absent last call) may pin when armed. */
  held(notes: number[]): void;
  /** Gate + dive reach the bass too (the Studio chops bassGate; the drone dives). */
  gesture(name: 'gate' | 'dive', on: boolean, arg?: number): void;
  book(b: Booking): void;
  stop(): void;
}

// ─────────────────────────────────────────────────────────────── keys: the rips and the sampler

/** One shipped rip (public/s/<hex>/<id>.json, written by scripts/signal/rip-encode.mjs). Unlisted path. */
export interface RipManifest {
  id: string; name: string; role: 'keys';
  sr: 48000; channels: 1 | 2; bytes: number;
  zones: RipZone[];
}
export interface RipZone {
  file: string;                       // relative to the manifest's folder
  rootMidi: number; loKey: number; hiKey: number;
  gain: number;                       // informational (createMultisample re-levels from the audio)
  mode: 'sustain' | 'decay';
  loopStart: number; loopEnd: number; // INTEGER samples at 48 k in the shipped (cut) file → seconds = /48000
  frames: number;                     // the cut file's length at 48 k
  onset: number;                      // first |x| > 0.02 in the cut file: a sanity check only (shift 0 is the law)
}

export const RIP_ROOT = '/s/59e8a3b3';                       // the unlisted folder (manifests + zones + ir/)
export const VOICES = ['rhodes', 'piano', 'pad', 'lead'] as const;
export type VoiceId = (typeof VOICES)[number];
export const VOICE_DEFAULT: VoiceId = 'rhodes';
export const VOICE_NAMES: Record<VoiceId, string> = { rhodes: 'RHODES', piano: 'PIANO', pad: 'PAD', lead: 'LEAD' };

export type LfoShape = 'sine' | 'sawi' | 'saw' | 'sqr';      // the Studio's four (sawi = falling ramp)
export const LFO_DIVS = ['1/1', '1/2', '1/4', '1/4T', '1/8', '1/8T', '1/16', '1/16T', '1/32'] as const;
export type LfoDiv = (typeof LFO_DIVS)[number];
export type DriveType = 'warm' | 'crunch' | 'tape' | 'fuzz';
export type ModMode = 'phaser' | 'flanger' | 'doubler' | 'chorus';
export type DelayDiv = '1/4' | '1/8' | '1/8d' | '1/16';      // the keys delay (beats 1 .5 .75 .25)
export type RevSize = 'sm' | 'med' | 'hall' | 'vast';

export interface KeysState {
  voice: VoiceId;
  filter: number;                     // 0..1 the one low-pass position (≥ FILTER_OPEN = true bypass), default 1
  motion: { amount: number; shape: LfoShape; div: LfoDiv };  // 0..1 (0 = OFF), 'sine', '1/8'
  fx: { drive: number; driveType: DriveType;                 // 0, 'warm'
        mod: number; modMode: ModMode; modRate: number;      // 0, 'chorus', 0.5 (×1)
        delay: number; delayDiv: DelayDiv;                   // 0, '1/8'
        reverb: number; revSize: RevSize };                  // 0.22, 'sm' (the one non-candid default: a laptop needs a room)
  gain: number; mute: boolean;
}

export interface Keys {
  state(): KeysState;
  set<K extends keyof KeysState>(k: K, v: KeysState[K]): void;
  /** Lazy on pick: fetch + decode the voice's zones, MIDDLE OCTAVES FIRST (a first batch of ~7 zones
   *  becomes playable, then the rest swaps in under held notes); resolves when the first batch plays. */
  pick(v: VoiceId): Promise<void>;
  ready(): boolean;                   // the current voice's first batch decoded
  /** id = the hand's key ('k'+code, 'p'+midi, 'c<pad>.<i>', 'a<n>' for the arp); a repeated id chokes. */
  noteOn(id: string, midi: number, vel?: number, when?: number): void;
  noteOff(id: string, when?: number): void;
  /** The arp's one-shot: no id, its own 18 ms fade, booked at `when` for `durSec`. */
  hit(midi: number, when: number, durSec: number, vel?: number): void;
  /** DIVE: every sounding voice glides `cents` (τ = tauSec down, default .45; .07 back); new voices start bent. [R2] */
  bend(cents: number, tauSec?: number): void;
  /** ←/→ on a sounding chord: re-pitch held ids in place (the same zone; a glide of τ). */
  retune(map: Record<string, number>, tauSec?: number): void;
  held(): ReadonlyArray<[string, number]>;   // [id, midi] sounding (hold included) — the chord screen's source
  onHeldChange(cb: (held: ReadonlyArray<[string, number]>) => void): () => void;
  /** Every voice down on a 30 ms ramp (blur, visibility, master stop). */
  allOff(): void;
  stop(): void;                       // allOff + the returns hushed by effects.ts
  out: GainNode;                      // the keys' summed voices, dry, pre-filter (effects.ts takes it)
}

// ─────────────────────────────────────────────────────────────── the one low-pass (filter.ts, verbatim from THE PAGE)

export const FILTER_MIN_HZ = 40;
export const FILTER_MAX_HZ = 20000;
export const FILTER_OPEN = 0.995;                            // the page's value (its 56 tests pin it)
export type FilterHz = (p: number) => number;
export interface SignalFilter { set(p: number): void; get(): number; input: AudioNode; output: AudioNode }

// ─────────────────────────────────────────────────────────────── effects + returns (effects.ts, fx-worklet.ts)

export interface IrAsset { slot: RevSize; url: string; seconds: number; onsetMs: number; bytes: number }

/** The keys FX exactly as the Studio wires them: DRIVE insert (sig-sat) → MOD parallel wet (sig-mod) →
 *  DELAY + REVERB returns, all summing into the keys `glue` → glueMakeup → out.duck. Built once. */
export interface Effects {
  /** The keys chain from the filter's output on: keys.out → filter (filter.ts, lane K) → effects.input →
   *  gate amp → DRIVE → post → keysGain → dry + MOD + DEL + REV returns → glue → makeup → out.duck.
   *  The integrator wires keys.out → filter.input and filter.output → effects.input. */
  input: AudioNode;
  apply(fx: KeysState['fx'], bpm: number): void;   // levels, flavours, delay time (re-timed on every bpm change)
  /** The kick sidechain envelope (drums call it per kick; the Studio's duckHit, depth = drums.sidechain). */
  duckHit(when: number, sidechain: number, beatSec: number): void;
  /** Master stop: returns → 0 in 15 ms, feedback cut, held for the mounted room's tail, then restored. */
  hush(): void;
  /** The gate chop (the Z pad): keys amp 1 → 0.06 in 12 ms, held 0.55·sd, back by 0.9·sd. */
  chop(when: number, stepSec: number): void;
  releaseGate(): void;
  worklet(): 'ready' | 'fallback';    // fallback = WaveShaper drive + MOD bypass (no audioWorklet: insecure origin)
  irs(): Array<IrAsset & { mounted: boolean }>;
}

// ─────────────────────────────────────────────────────────────── harmony (music.ts, arp.ts, chords.ts)

export type ScaleName = 'major' | 'minor' | 'chrom';
export interface Music { key: number; scale: ScaleName; oct: number }   // key 0..11 (C = 0), oct −1..+1

export const ARP_DIVS = ['1/4', '1/8', '1/8T', '1/16', '1/16T', '1/32'] as const;   // lines per beat 1 2 3 4 6 8
export type ArpDiv = (typeof ARP_DIVS)[number];
export const GATE_DIVS = ['1/8', '1/8T', '1/16', '1/16T', '1/32'] as const;          // 2 3 4 6 8 per beat
export type GateDiv = (typeof GATE_DIVS)[number];

/** HOLD UNDER CHORD (R3, Jon's law). HOLD alone stacks like a sustain pedal: every released note keeps ringing, and
 *  tapping a ringing letter again releases it. HOLD with CHORD is ONE CHORD AT A TIME: a new chord (a letter press
 *  that starts a chord no finger is holding) SWITCHES — everything the hold owns (every latched id no finger holds:
 *  letters, their '~' extensions, stage keys, pad tones) releases, the new chord takes over the hold, and holding
 *  persists. Tap-again on a ringing letter still releases it (and only it). Keys a finger still holds are the
 *  finger's, not the hold's: they stay. Under ARP the same law runs on the pool. HOLD off releases everything held.
 *  What a PAD does under HOLD (chords.ts: chord-mono, the same pad re-strikes) is unchanged. */
export interface HarmonyState {
  music: Music;                       // C major, oct 0
  chord: boolean;                     // CHORD: a letter plays its diatonic triad (colour row: a major triad)
  hold: boolean;                      // HOLD: notes stay after release; tap again releases (the Studio's latch); see above
  arp: { on: boolean; div: ArpDiv; length: number; groove: number };   // '1/8' · LENGTH 0.06..1.3 (0.5) · 0..1 (0)
  rack: Array<number[] | null>;       // 8 pads, each a stamped set of MIDI notes (absolute, FROZEN)
  gate: { div: GateDiv; swing: number };        // '1/16', 0
  dive: { speedSec: number; dist: number };     // 0.05..1.5 (0.45) · 2..36 st (24)
}

export interface Harmony {
  state(): HarmonyState;
  set<K extends keyof HarmonyState>(k: K, v: HarmonyState[K]): void;
  /** The hand's keys: a letter's scale offset (or colour-row offset) → the MIDI note(s) it plays now. */
  midiFor(offset: number, colour: boolean): number;
  /** The chord machine's naming law (chord-name.ts, verbatim): the name of what sounds, and its degree
   *  ('I'..'vii°', null when off-map: dark is the ONLY off-map signal). */
  name(notes: number[]): { label: string; degree: string | null };
  /** Pads: an occupied pad plays (gated until release; chord-mono under HOLD); an empty pad with
   *  something sounding STAMPS it; shift clears. The pad's chord root pins the bass (never over a hand pin). */
  trigger(i: number, shift?: boolean): void;
  release(i: number): void;
  /** Letters and stage keys route through here so HOLD/CHORD/ARP see them. */
  keyDown(id: string, midi: number, chord?: number[]): void;
  keyUp(id: string): void;
  /** The arp (its own division's lines inside this step) + the gate chops. */
  book(b: Booking): void;
  gesture(name: 'gate' | 'dive', on: boolean): void;
  transpose(d: -1 | 1): void;         // ←/→: a sounding chord moves diatonically; else the octave
  stop(): void;                       // arp pool cleared, hold released, pads released, gestures off
}

// ─────────────────────────────────────────────────────────────── the keyboard (keymap.ts)

/** e.code → the action: THE TAUGHT SET (R3), every key of it drawn on the surface as a keycap that lights.
 *  Letters are the Studio's (A S D F G H J K L white, W E T Y U O the colour row); Space drums · B bass · Z gate (held)
 *  · M dive (held) · ←/→ octave · ↑/↓ voice · = tap · Esc stop. R3 REMOVED X HOLD · C CHORD · V ARP · N LOCK (on-screen
 *  toggles only now) and Digit1–8 (the pads row left the surface; the rack model + its state stay in the engine). */
export type KeyAction =
  | { kind: 'note'; offset: number; colour: boolean }
  | { kind: 'gate' } | { kind: 'dive' }                       // held
  | { kind: 'oct'; d: -1 | 1 }                                // ArrowLeft/Right (a sounding chord transposes instead)
  | { kind: 'voice'; d: -1 | 1 }                              // ArrowUp/Down
  | { kind: 'beat' } | { kind: 'bass' }                       // Space · B
  | { kind: 'tap' }                                           // Equal
  | { kind: 'stop' };                                         // Escape = master stop

export const KEYMAP: Readonly<Record<string, KeyAction>> = {
  KeyA: { kind: 'note', offset: 0, colour: false }, KeyS: { kind: 'note', offset: 2, colour: false },
  KeyD: { kind: 'note', offset: 4, colour: false }, KeyF: { kind: 'note', offset: 5, colour: false },
  KeyG: { kind: 'note', offset: 7, colour: false }, KeyH: { kind: 'note', offset: 9, colour: false },
  KeyJ: { kind: 'note', offset: 11, colour: false }, KeyK: { kind: 'note', offset: 12, colour: false },
  KeyL: { kind: 'note', offset: 14, colour: false },
  KeyW: { kind: 'note', offset: 1, colour: true }, KeyE: { kind: 'note', offset: 3, colour: true },
  KeyT: { kind: 'note', offset: 6, colour: true }, KeyY: { kind: 'note', offset: 8, colour: true },
  KeyU: { kind: 'note', offset: 10, colour: true }, KeyO: { kind: 'note', offset: 13, colour: true },
  KeyZ: { kind: 'gate' }, KeyB: { kind: 'bass' }, KeyM: { kind: 'dive' },
  Space: { kind: 'beat' }, Equal: { kind: 'tap' }, Escape: { kind: 'stop' },
  ArrowLeft: { kind: 'oct', d: -1 }, ArrowRight: { kind: 'oct', d: 1 },
  ArrowUp: { kind: 'voice', d: 1 }, ArrowDown: { kind: 'voice', d: -1 },
};

/** The keys the surface draws as keycaps (R3): every KEYMAP code, plus the two laptop-row keys inside the colour row
 *  that play nothing (R and I), drawn dormant so the row on screen IS the row under the hand. */
export const KEYCAP_ROWS = {
  colour: ['KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO'],
  home: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'],
} as const;

/** The keybed the page draws: C3..C7 (MIDI 48..96, 29 whites, R3: the rack's voicings no longer need C2); the
 *  octave range −1..+1 keeps every letter on the stage (docs/signal-map/D §6: oct −1 = 48..62 · 0 = 60..74 · +1 = 72..86). */
export const STAGE_LO = 48;
export const STAGE_HI = 96;

// ─────────────────────────────────────────────────────────────── the device (R3: THE FIRST-TIMER ROUND)

/** The device's reference width in CSS px. The host (the /signal page, StudioOne) zooms the device from outside:
 *  zoom = min(0.98 · the content column ÷ DEVICE_W, the room's height ÷ the device's height), so it stands at
 *  97–99 % of the page's content width where the height allows and never touches the nav rail. */
export const DEVICE_W = 1280;
/** The size floor (Law 5): no control word under 12 px, no screen numeral under 22 px; BPM the largest numeral. */
export const WORD_MIN_PX = 12;
export const NUMERAL_MIN_PX = 22;

/** THE SURFACE HOOKS (what the gate and the test surface's click() find; every view keeps these exact strings):
 *  data-ctl on the control's host (its .si-knob / button / glass), data-code on every KEYCAP (`.sg-key`) for the
 *  KEYMAP code it draws. `.dormant` (material.css) on a control whose effect waits on another control:
 *    drums-fb · drums-time      while drums.delay.mix < 0.01
 *    keys-rate · keys-shape     while keys.motion.amount < 0.005 (MOTION_OFF)
 *    arp-rate · arp-length · arp-groove   while !harmony.arp.on
 *    bass-strip                 while bass.mode !== 'seq'
 *    the R and I keycaps        always (they play nothing)
 *  Keycap states: `.pressed` while its key is down (keyboard or pointer), `.lit` while its function is ON (drums
 *  running, bass on, a note sounding, a gesture held, anything running for esc). */
export const CTL = {
  drums: ['drums-power', 'drums-bpm', 'drums-tap', 'drums-cover', 'drums-grid', 'drums-pattern', 'drums-swing', 'drums-density',
    'drums-sidechain', 'drums-texture', 'drums-texseg', 'drums-delay', 'drums-mix', 'drums-fb', 'drums-time', 'drums-mute', 'drums-solo', 'drums-gain'],
  keys: ['keys-voice', 'keys-voice-up', 'keys-voice-down', 'keys-filter', 'keys-gate', 'gate-rate', 'gate-swing', 'keys-dive', 'dive-speed', 'dive-dist',
    'keys-motion', 'keys-rate', 'keys-shape', 'keys-fx-drive', 'keys-fx-mod', 'keys-fx-delay', 'keys-fx-reverb', 'keys-modrate',
    'hold', 'chord', 'arp', 'arp-rate', 'arp-length', 'arp-groove', 'keys-mute', 'keys-solo', 'keys-gain'],
  bass: ['bass-power', 'bass-tone', 'bass-mode', 'bass-lock', 'bass-root', 'bass-strip', 'bass-density', 'bass-groove', 'bass-heat', 'bass-weight',
    'bass-glide', 'bass-mute', 'bass-solo', 'bass-gain'],
  hands: ['oct-', 'oct+', 'octave', 'key-', 'key+', 'key', 'scale', 'chord-glass', 'stop', 'keycaps', 'piano', 'rail'],
} as const;

// ─────────────────────────────────────────────────────────────── persistence (db.ts)

export const DB_NAME = 'signal-portfolio';
export const DB_VERSION = 1;
/** Everything the visitor set, saved on every change (debounced 250 ms) and restored on load. Old or
 *  foreign saves load field by field with defaults (never a throw, never a blank instrument). */
export interface SignalState {
  v: 1;
  bpm: number;
  drums: DrumsState;
  bass: BassState;
  keys: KeysState;
  harmony: HarmonyState;
  solo: 'drums' | 'keys' | 'bass' | null;
}

// ─────────────────────────────────────────────────────────────── the instrument (instrument.ts), and the test surface

export interface SignalInstrument {
  ctx: AudioContext;
  time: Timekeeper; out: SignalOut; effects: Effects; drums: Drums; bass: Bass; keys: Keys; harmony: Harmony;
  /** The first gesture: resume the context; resolves when running. Idempotent. */
  wake(): Promise<void>;
  /** Master stop (Escape, the red keycap): every module's stop() (voices ≤ 30 ms, returns hushed,
   *  bookings cancelled), time.stop(), out.panic(). Output below −90 dBFS within 150 ms. */
  stop(): void;
  setSolo(s: SignalState['solo']): void;
  state(): SignalState;
  load(s: Partial<SignalState>): void;
  onChange(cb: () => void): () => void;   // the view repaints from this; the store saves from this
}

/** window.__signal when ?mute=1 or ?test=1 — what the gate reads. */
export interface SignalTestSurface {
  ready: () => boolean;                        // kit + default voice's first batch decoded
  ctxState: () => AudioContextState;
  level: () => { peak: number; rms: number };  // post-clamp
  firstSoundMs: () => number | null;           // ms from the first gesture to the first block over −60 dBFS
  glitches: () => { blocks: number; gaps: number; maxGapMs: number };   // an AudioWorklet counting late process() calls
  state: () => SignalState;
  press: (code: string, on: boolean, shift?: boolean) => void;   // synthetic keys through the real keymap
  click: (selector: string) => boolean;        // a pointerdown+up on a control, through the real handlers
  stop: () => void;
  instrument: SignalInstrument;
}

// ─────────────────────────────────────────────────────────────── FACTORIES (one exported constructor per lane; the
// integrator composes them, mechanically). Lanes import ONLY ./types.ts and their own files: every other module
// arrives as an INSTANCE through these parameters, never through an import.

export interface TimeDeps { ctx: AudioContext; bpm?: number }
export type CreateTimekeeper = (d: TimeDeps) => Timekeeper;                                   // time.ts (lane T)

export interface OutDeps { ctx: AudioContext; muted: boolean }
export type CreateOut = (d: OutDeps) => SignalOut;                                            // out.ts (lane O)

export interface EffectsDeps { ctx: AudioContext; out: SignalOut; ripRoot: string }
/** Resolves once the worklet is registered or the fallback is chosen; NEVER rejects. IRs load lazily. */
export type CreateEffects = (d: EffectsDeps) => Promise<Effects>;                             // effects.ts (lane O)

export type DrumKit = Record<DrumLane, AudioBuffer>;
export type DecodeKit = (ctx: BaseAudioContext) => Promise<DrumKit>;                          // kit.ts (lane D)
export interface DrumsDeps { ctx: AudioContext; out: SignalOut; effects: Effects; kit: DrumKit }
export type CreateDrums = (d: DrumsDeps) => Drums;                                            // drums.ts (lane D)

export interface BassDeps { ctx: AudioContext; out: SignalOut; effects: Effects }
export type CreateBass = (d: BassDeps) => Bass;                                               // bass.ts (lane B)

export interface KeysDeps { ctx: AudioContext; ripRoot: string }
export type CreateKeys = (d: KeysDeps) => Keys;                                               // keys.ts (lane K)
export type CreateFilter = (ctx: AudioContext) => SignalFilter;                               // filter.ts (lane K)
export interface MotionDeps { keys: Keys; time: Timekeeper; filter: SignalFilter; ctx: AudioContext }
/** Writes p into the filter from keys.state().motion + the lattice phase (16 ms timer while on). */
export type CreateMotion = (d: MotionDeps) => { dispose(): void };                            // motion.ts (lane K)

export interface HarmonyDeps { keys: Keys; bass: Bass; time: Timekeeper; effects: Effects; ctx: AudioContext }
export type CreateHarmony = (d: HarmonyDeps) => Harmony;                                      // harmony.ts (lane H)

export interface Store { load(): Promise<Partial<SignalState> | null>; save(s: SignalState): void; flush(): Promise<void> }
export type CreateStore = (d: { name: string; version: number }) => Store;                    // db.ts (lane S)

export interface KeymapDeps {
  target: Window;
  /** Fired on keydown (on = true, not for repeats) and keyup (on = false) for every mapped code the page owns;
   *  `shift` is the modifier state at the event. Unmapped keys are ignored. Blur fires on=false for every code down. */
  onAction(a: KeyAction, on: boolean, shift: boolean, code: string): void;
  /** The page owns the keys only while nothing else does (a text field, ⌘/ctrl/alt). */
  owns?(ev: KeyboardEvent): boolean;
}
export type CreateKeymap = (d: KeymapDeps) => { attach(): void; detach(): void; down(): ReadonlyArray<string> };  // keymap.ts (lane H)

export interface SurfaceDeps { instrument: SignalInstrument; onAction: KeymapDeps['onAction'] }
export type MountTestSurface = (d: SurfaceDeps) => Promise<SignalTestSurface>;                // test-surface.ts (lane S; installs the glitch worklet as a sink on out)

/** Views: each stratum mounts its DOM into `root`, binds gestures to the instrument, and repaints on
 *  instrument.onChange + a rAF for playheads/levels. They import ./types.ts, ./view/controls.ts, ./view/common.ts
 *  and their own files only. */
export type MountView = (root: HTMLElement, inst: SignalInstrument) => { dispose(): void };
// mountDrumsView (view/drums-view.ts, V1) · mountBassView (view/bass-view.ts, V1) · mountKeysView (view/keys-view.ts, V2)
// mountHandsView (view/hands-view.ts, V3: the top strip, the pianohead, the rack, the keybed, the gate row)
