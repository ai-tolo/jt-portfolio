// SIGNAL R1 · lane S · db.ts — WHERE THE INSTRUMENT REMEMBERS. IndexedDB `signal-portfolio` v1 (types.ts DB_NAME and
// DB_VERSION, handed in by the integrator), ONE object store 'state' (keyPath id), ONE row:
//
//   { id: 'state', v: 1, ...SignalState }        ~4 KB of plain data, no PCM (the rack rides inside it)
//
// Law 4: everything the visitor set comes back after a reload. An old, foreign or broken row loads FIELD BY FIELD
// (mergeState): unknown fields dropped, a wrong type or a wrong-length array replaced by its default, a number outside
// its range clamped. Never a throw, never a blank instrument.
//
// from signal-studio-page/src/page/db.ts:68-157 (296ea5c) — ADAPTED to raw IndexedDB (the portfolio has no `idb`):
//   the upgrade only CREATES what is missing (68-73) · the store-less database is HEALED one version up rather than
//   assumed (75-113) · a `blocking` request (here: onversionchange) closes the connection and drops the handle, so
//   the gate can delete the database under a live page and the next write lands in a fresh one (94-97) · the open
//   NEVER rejects: a failure is a warning plus a neutral answer (125-157). One warning per kind (open, read, write),
//   not one per call. DIFFERENCE: the first open asks for NO version (it gets whatever exists, or creates v1), then
//   verifies; so a healed database never costs a VersionError on the boots after it (the page's 103-106 detour).
// from signal-studio-page/src/page/db.ts:216-312 (296ea5c) — parsePageState's law, ADAPTED as mergeState: each field
//   is checked on its own and a bad one falls to its default, so one corrupt field cannot cost the visitor the rest.
//   DIFFERENCE: no `v: 1` envelope gate; the contract loads old or foreign saves field by field (types.ts SignalState).
// from signal-studio-page/src/page/main.ts:412-425 (296ea5c) — the save cadence, ADAPTED: a write lands 250 ms after
//   the FIRST unsaved change and later changes do not push it back (a knob swept for a minute still saves about four
//   times a second; a timer reset by every change would never fire while he plays), and at once on pagehide and on
//   hidden. NEW: one write in flight at a time; saves that arrive during it queue ONE more write, carrying the newest
//   state. flush() writes now and resolves when the transaction completes.
//
// FOR THE INTEGRATOR: (1) `load()` hands back the raw row (minus `id`); pass it through `mergeState(DEFAULT_STATE, x)`.
// (2) Subscribe `save` to instrument.onChange only AFTER the loaded state is applied, or the first save can write the
// defaults over the visitor's row. (3) DEFAULT_STATE's drum grid and bass strip are ALL RESTS (this lane cannot import
// the generators): on a fresh install (`load()` → null) call drums.regenerate() and bass.regenerate() after load;
// a SAVED all-rest grid is the visitor's and stays. (4) DEFAULT_STATE is deep-frozen: hand modules a copy
// (`defaultState()` or `mergeState(DEFAULT_STATE, x)`), never the constant itself.

import {
  ARP_DIVS, BPM_DEFAULT, BPM_MAX, BPM_MIN, DRUM_LANES, GATE_DIVS, LFO_DIVS, VOICE_DEFAULT, VOICES,
} from './types.ts';
import type {
  BassMode, BassState, BassStep, DelayDiv, DriveType, DrumDelayDiv, DrumLane, DrumPatternName, DrumTexture, DrumVel,
  DrumsState, HarmonyState, KeysState, LfoShape, ModMode, Music, RevSize, ScaleName, SignalState, Store,
} from './types.ts';

// ─────────────────────────────────────────────────────────────── the value sets types.ts keeps as types only

const PATTERN_NAMES = ['floor', 'back', 'half', 'break'] as const satisfies readonly DrumPatternName[];
const DRUM_DELAY_DIVS = ['1/16', '1/8', '1/8d', '1/4', '1/2'] as const satisfies readonly DrumDelayDiv[];
const DRUM_TEXTURES = ['tape', 'drive'] as const satisfies readonly DrumTexture[];
const DRUM_VELS = [0, 1, 2, 3] as const satisfies readonly DrumVel[];
const BASS_MODES = ['drone', 'pluck', 'seq'] as const satisfies readonly BassMode[];
const BASS_OCTS = ['base', 'sub'] as const satisfies readonly BassStep['oct'][];
const LFO_SHAPES = ['sine', 'sawi', 'saw', 'sqr'] as const satisfies readonly LfoShape[];
const DRIVE_TYPES = ['warm', 'crunch', 'tape', 'fuzz'] as const satisfies readonly DriveType[];
const MOD_MODES = ['phaser', 'flanger', 'doubler', 'chorus'] as const satisfies readonly ModMode[];
const KEYS_DELAY_DIVS = ['1/4', '1/8', '1/8d', '1/16'] as const satisfies readonly DelayDiv[];
const REV_SIZES = ['sm', 'med', 'hall', 'vast'] as const satisfies readonly RevSize[];
const SCALES = ['major', 'minor', 'chrom'] as const satisfies readonly ScaleName[];
const SOLOS = ['drums', 'keys', 'bass'] as const satisfies readonly NonNullable<SignalState['solo']>[];

// Each list above must name EVERY member of its union (a type-only check: `tsc` fails here if the contract grows one).
type Covers<U, L extends readonly unknown[]> = [U] extends [L[number]] ? true : false;
type Must<T extends true> = T;
export type _SetsCoverTheContract = [
  Must<Covers<DrumPatternName, typeof PATTERN_NAMES>>, Must<Covers<DrumDelayDiv, typeof DRUM_DELAY_DIVS>>,
  Must<Covers<DrumTexture, typeof DRUM_TEXTURES>>, Must<Covers<DrumVel, typeof DRUM_VELS>>,
  Must<Covers<BassMode, typeof BASS_MODES>>, Must<Covers<BassStep['oct'], typeof BASS_OCTS>>,
  Must<Covers<LfoShape, typeof LFO_SHAPES>>, Must<Covers<DriveType, typeof DRIVE_TYPES>>,
  Must<Covers<ModMode, typeof MOD_MODES>>, Must<Covers<DelayDiv, typeof KEYS_DELAY_DIVS>>,
  Must<Covers<RevSize, typeof REV_SIZES>>, Must<Covers<ScaleName, typeof SCALES>>,
  Must<Covers<NonNullable<SignalState['solo']>, typeof SOLOS>>,
];

// ─────────────────────────────────────────────────────────────── DEFAULT_STATE (types.ts's defaults, every field)

const rests = (): DrumVel[] => Array.from({ length: 16 }, (): DrumVel => 0);
const restStep = (): BassStep => ({ v: 0, oct: 'base', slide: false });

function deepFreeze<T>(o: T): T {
  if (o !== null && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

/** The contract's defaults (types.ts), deep-frozen. The drum grid and the bass strip are all rests: see the header. */
export const DEFAULT_STATE: SignalState = deepFreeze<SignalState>({
  v: 1,
  bpm: BPM_DEFAULT,
  drums: {
    on: false,
    pattern: 'floor',
    seq: Object.fromEntries(DRUM_LANES.map((l) => [l, rests()])) as Record<DrumLane, DrumVel[]>,
    density: 0.5, swing: 0,
    cover: 1, coverDb: 0, lowcut: 0, lowcutDb: 0,
    texture: 'tape', textureAmt: 0,
    delay: { mix: 0, time: '1/8', feedback: 0.35 },
    sidechain: 0.3,
    gain: 1, mute: false,
  },
  bass: {
    on: false,
    mode: 'drone',
    seq: Array.from({ length: 16 }, restStep),
    root: null, armed: false,
    heat: 0.5, weight: 0.5, glide: 0,
    density: 0.5, groove: 0.3,
    cut: 1, cutDb: 0, lowcut: 0, lowcutDb: 0,
    gain: 1, mute: false,
  },
  keys: {
    voice: VOICE_DEFAULT,
    filter: 1,
    motion: { amount: 0, shape: 'sine', div: '1/8' },
    fx: {
      drive: 0, driveType: 'warm',
      mod: 0, modMode: 'chorus', modRate: 0.5,
      delay: 0, delayDiv: '1/8',
      reverb: 0.22, revSize: 'sm',
    },
    gain: 1, mute: false,
  },
  harmony: {
    music: { key: 0, scale: 'major', oct: 0 },
    chord: false, hold: false,
    arp: { on: false, div: '1/8', length: 0.5, groove: 0 },
    rack: Array.from({ length: 8 }, (): number[] | null => null),
    gate: { div: '1/16', swing: 0 },
    dive: { speedSec: 0.45, dist: 24 },
  },
  solo: null,
});

// ─────────────────────────────────────────────────────────────── mergeState: field by field

/** One field's law: the saved value when it is sound, else the default (a fresh copy, never a shared reference). */
type Check<T> = (x: unknown, d: T) => T;
/** A checker for every key of T: the compiler refuses a spec that forgets a field. */
type Spec<T> = { [K in keyof T]-?: Check<T[K]> };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
/** A field's own value; a getter that throws (a foreign object handed in directly, not an IndexedDB row) reads as
 *  missing, so the field loads its default rather than throwing through the boot. */
const own = (o: Record<string, unknown>, k: string): unknown => {
  try { return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; } catch { return undefined; }
};
const item = (a: unknown[], i: number): unknown => { try { return a[i]; } catch { return undefined; } };
/** clamp, with −0 folded to 0 (Math.round(−0.4) is −0, and −0 is not deep-equal to 0) */
const clampTo = (x: number, lo: number, hi: number): number => { const v = Math.min(hi, Math.max(lo, x)); return v === 0 ? 0 : v; };

function num(lo: number, hi: number): Check<number> {
  return (x, d) => (typeof x === 'number' && Number.isFinite(x) ? clampTo(x, lo, hi) : d);
}
function int(lo: number, hi: number): Check<number> {
  return (x, d) => (typeof x === 'number' && Number.isFinite(x) ? clampTo(Math.round(x), lo, hi) : d);
}
const bool: Check<boolean> = (x, d) => (typeof x === 'boolean' ? x : d);
function oneOf<T>(set: readonly T[]): Check<T> {
  return (x, d) => ((set as readonly unknown[]).includes(x) ? (x as T) : d);
}
/** An object: only the spec's keys, each through its own check (unknown keys are dropped here). */
function obj<T extends object>(spec: Spec<T>): Check<T> {
  const keys = Object.keys(spec) as Array<keyof T & string>;
  return (x, d) => {
    const o = isObj(x) ? x : {};
    const out = {} as T;
    for (const k of keys) out[k] = spec[k](own(o, k), d[k]);
    return out;
  };
}
/** A fixed-length array: the wrong length (or not an array) is the default array; else each item on its own. */
function list<T>(len: number, check: Check<T>): Check<T[]> {
  return (x, d) => {
    const src = Array.isArray(x) && x.length === len ? (x as unknown[]) : null;
    const out: T[] = [];
    for (let i = 0; i < len; i++) out.push(check(src ? item(src, i) : d[i], d[i]));
    return out;
  };
}
/** A MIDI note: a finite number, rounded, 0..127; else null. */
function midiOf(x: unknown): number | null {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  const m = Math.round(x);
  return m >= 0 && m <= 127 ? m : null;
}
/** bass.root: null stays null (follows the hand); a MIDI note stays; anything else is the default. */
const rootMidi: Check<number | null> = (x, d) => (x === null ? null : (midiOf(x) ?? d));
/** A rack pad: null (empty) or a stamped SET of MIDI notes; bad notes and repeats are dropped, nothing left = empty. */
const pad: Check<number[] | null> = (x, d) => {
  if (x === null) return null;
  const src = Array.isArray(x) ? (x as unknown[]) : d;
  if (src === null) return null;
  const notes: number[] = [];
  for (let i = 0; i < src.length; i++) { const m = midiOf(item(src, i)); if (m !== null && !notes.includes(m)) notes.push(m); }
  return notes.length ? notes : null;
};
const solo: Check<SignalState['solo']> = (x, d) =>
  (x === null ? null : (SOLOS as readonly unknown[]).includes(x) ? (x as SignalState['solo']) : d);

const unit = num(0, 1);
const gain = num(0, 1.25);        // the mixer's range (G §1: drumGain / keysGain / bassGain 0..1.25)
const resDb = num(-24, 18);       // a filter node's resonance, dB (types.ts DrumsState.coverDb; bass.ts DB_MIN/DB_MAX)
const vel = oneOf(DRUM_VELS);

const LANES = Object.fromEntries(DRUM_LANES.map((l) => [l, list(16, vel)])) as Spec<Record<DrumLane, DrumVel[]>>;

const DRUMS: Spec<DrumsState> = {
  on: bool, pattern: oneOf(PATTERN_NAMES), seq: obj(LANES),
  density: unit, swing: unit,
  cover: unit, coverDb: resDb, lowcut: unit, lowcutDb: resDb,
  texture: oneOf(DRUM_TEXTURES), textureAmt: unit,
  delay: obj<DrumsState['delay']>({ mix: unit, time: oneOf(DRUM_DELAY_DIVS), feedback: unit }),
  sidechain: unit,
  gain, mute: bool,
};
const STEP: Spec<BassStep> = { v: vel, oct: oneOf(BASS_OCTS), slide: bool };
const BASS: Spec<BassState> = {
  on: bool, mode: oneOf(BASS_MODES), seq: list(16, obj(STEP)),
  root: rootMidi, armed: bool,
  heat: unit, weight: unit, glide: unit,
  density: unit, groove: unit,
  cut: unit, cutDb: resDb, lowcut: unit, lowcutDb: resDb,
  gain, mute: bool,
};
const KEYS: Spec<KeysState> = {
  voice: oneOf(VOICES), filter: unit,
  motion: obj<KeysState['motion']>({ amount: unit, shape: oneOf(LFO_SHAPES), div: oneOf(LFO_DIVS) }),
  fx: obj<KeysState['fx']>({
    drive: unit, driveType: oneOf(DRIVE_TYPES),
    mod: unit, modMode: oneOf(MOD_MODES), modRate: unit,
    delay: unit, delayDiv: oneOf(KEYS_DELAY_DIVS),
    reverb: unit, revSize: oneOf(REV_SIZES),
  }),
  gain, mute: bool,
};
const HARMONY: Spec<HarmonyState> = {
  music: obj<Music>({ key: int(0, 11), scale: oneOf(SCALES), oct: int(-1, 1) }),
  chord: bool, hold: bool,
  arp: obj<HarmonyState['arp']>({ on: bool, div: oneOf(ARP_DIVS), length: num(0.06, 1.3), groove: unit }),
  rack: list(8, pad),
  gate: obj<HarmonyState['gate']>({ div: oneOf(GATE_DIVS), swing: unit }),
  dive: obj<HarmonyState['dive']>({ speedSec: num(0.05, 1.5), dist: num(2, 36) }),
};
const STATE = obj<SignalState>({
  v: () => 1,
  bpm: num(BPM_MIN, BPM_MAX),
  drums: obj(DRUMS), bass: obj(BASS), keys: obj(KEYS), harmony: obj(HARMONY),
  solo,
});

/**
 * DEFAULTS ⊕ SAVED, field by field (the page's parsePageState law). `saved` may be anything: a row, a stale or foreign
 * object, null. Every field of the result is either the saved value (sound, in range) or the default; unknown fields
 * are dropped; `saved` is never mutated; the result shares no object with either argument, so it is safe to hand to
 * the modules and to mutate.
 */
export function mergeState(defaults: SignalState, saved: unknown): SignalState {
  return STATE(saved, defaults);
}

/** A fresh, mutable copy of DEFAULT_STATE. */
export const defaultState = (): SignalState => STATE(null, DEFAULT_STATE);

// ─────────────────────────────────────────────────────────────── the store

const STORE_NAME = 'state';
const ROW_ID = 'state';
/** A write lands this long after the first unsaved change (NOTES-SIGNAL-R1 §1 STATE). */
export const SAVE_DELAY_MS = 250;
/** load() answers null rather than hold the boot hostage to a blocked or silent database. */
export const LOAD_TIMEOUT_MS = 3000;

type Kind = 'open' | 'read' | 'write';

function factory(): IDBFactory | null {
  try { return typeof indexedDB === 'undefined' || !indexedDB ? null : indexedDB; } catch { return null; }
}
const named = (e: unknown, name: string): boolean => (e as { name?: unknown } | null)?.name === name;

function openOnce(idb: IDBFactory, name: string, version: number | undefined,
  gone: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = version === undefined ? idb.open(name) : idb.open(name, version);
    req.onupgradeneeded = () => {
      // Create what is missing; touch nothing that exists (page db.ts:68-73).
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      // Another connection wants to delete or upgrade (the gate's fresh-profile step, a second tab's heal).
      // Holding on would block it forever: close, drop the handle, and the next call opens again.
      db.onversionchange = () => { try { db.close(); } catch { /* already closed */ } gone(db); };
      db.onclose = () => gone(db);   // closed abnormally (site data cleared under us)
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error(`opening ${name} failed`));
    // onblocked: an older connection elsewhere is being asked to close (its versionchange); the open waits for it.
  });
}

/** The store-less database, HEALED rather than assumed (page db.ts:75-113): `indexedDB.open(name)` with no version (a
 *  devtools poke, a gate seeder) creates v1 with NO stores, and a later open at v1 never runs an upgrade. So: open at
 *  whatever version exists, verify, and when the store is missing (or the version is below ours) re-open higher. */
async function openVerified(idb: IDBFactory, name: string, version: number,
  gone: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  let db = await openOnce(idb, name, undefined, gone);
  if (db.version < version || !db.objectStoreNames.contains(STORE_NAME)) {
    const next = Math.max(db.version + 1, version);
    db.onversionchange = null; db.onclose = null;
    db.close();
    db = await openOnce(idb, name, next, gone);
  }
  return db;
}

function readRow(db: IDBDatabase): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    const t = db.transaction(STORE_NAME, 'readonly');
    const req = t.objectStore(STORE_NAME).get(ROW_ID);
    t.oncomplete = () => resolve(req.result);
    t.onabort = () => reject(t.error ?? req.error ?? new Error('read aborted'));
  });
}

function writeRow(db: IDBDatabase, row: object): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_NAME, 'readwrite');
    t.oncomplete = () => resolve();
    t.onabort = () => reject(t.error ?? new Error('write aborted'));
    t.objectStore(STORE_NAME).put(row);   // the structured clone happens here, synchronously
    // Commit NOW rather than when the event loop comes back round: a write begun in pagehide must not wait on a task
    // the unloading document may never run (IDBTransaction.commit: Chrome 76, Firefox 74, Safari 15).
    if (typeof t.commit === 'function') { try { t.commit(); } catch { /* already finishing */ } }
  });
}

function withTimeout<T>(p: Promise<T>, ms: number, late: () => T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; resolve(late()); } }, ms);
    const done = (v: T): void => { if (!settled) { settled = true; clearTimeout(timer); resolve(v); } };
    p.then(done, () => done(late()));
  });
}

/**
 * The visitor store (types.ts Store). Never rejects, never throws into the audio path: where IndexedDB is missing or
 * refuses (a private window, a quota wall, Node), load() is null, saves are dropped and one warning says so.
 */
export function createStore(d: { name: string; version: number }): Store {
  const name = d.name;
  const version = Number.isInteger(d.version) && d.version >= 1 ? d.version : 1;
  let handle: Promise<IDBDatabase | null> | null = null;
  let live: IDBDatabase | null = null;       // the open connection: a write can start inside the pagehide task
  const warned = new Set<Kind>();
  const warn = (k: Kind, e: unknown): void => {
    if (warned.has(k)) return;
    warned.add(k);
    const what = k === 'read' ? 'the saved state could not be read, starting from the defaults'
      : k === 'write' ? 'a save failed, recent changes may not survive a reload'
        : 'IndexedDB is unavailable, changes will not survive a reload';
    console.warn(`[signal] ${name}: ${what}`, e);
  };
  const gone = (db: IDBDatabase): void => { if (live === db) { live = null; handle = null; } };
  const conn = (): Promise<IDBDatabase | null> => {
    if (!handle) {
      const idb = factory();
      if (!idb) {
        warn('open', 'no indexedDB here');
        handle = Promise.resolve(null);
      } else {
        let p: Promise<IDBDatabase>;
        try { p = openVerified(idb, name, version, gone); } catch (e) { p = Promise.reject(e); }
        handle = p.then((db) => { live = db; return db; }, (e) => { warn('open', e); return null; });
      }
    }
    return handle;
  };

  /** One operation against the live connection (synchronously when it is open, so a pagehide write starts inside the
   *  pagehide task). A connection that closed under us is dropped and the op tried once more on a fresh one; any other
   *  failure is a warning and the neutral answer. */
  async function withDb<T>(k: Kind, fallback: T, op: (db: IDBDatabase) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt++) {
      let db: IDBDatabase | null = null;
      try {
        db = live ?? (await conn());
        if (!db) return fallback;
        return await op(db);
      } catch (e) {
        if (attempt === 0 && db && named(e, 'InvalidStateError')) { gone(db); continue; }
        warn(k, e);
        return fallback;
      }
    }
    return fallback;
  }

  // ── the save cadence ────────────────────────────────────────────────────────────────────────────
  let latest: SignalState | null = null;
  let gen = 0;         // bumps on every save()
  let started = 0;     // the generation the newest write carries
  let done = 0;        // the newest generation whose write has finished (committed, or failed and warned)
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inflight: Promise<void> | null = null;

  const arm = (): void => { if (!timer) timer = setTimeout(fire, SAVE_DELAY_MS); };
  const disarm = (): void => { if (timer) { clearTimeout(timer); timer = null; } };
  function fire(): void {
    timer = null;
    if (gen > started && !inflight) void write();
  }
  /** Write the newest state now. Transactions on one connection commit in the order they were opened, so a pagehide
   *  write may overtake the one-in-flight rule without reordering anything. */
  function write(): Promise<void> {
    const g = gen;
    const s = latest;
    started = g;
    const row = s ? { ...s, id: ROW_ID, v: 1 as const } : null;
    const after = (): void => {
      if (g > done) done = g;
      if (inflight === p) inflight = null;
      if (gen > started && !inflight) arm();        // the saves that arrived meanwhile: ONE more write
    };
    const p: Promise<void> = (row ? withDb('write', undefined, (db) => writeRow(db, row)) : Promise.resolve())
      .then(after, after);
    inflight = p;
    return p;
  }
  const urgent = (): void => { if (gen > started) { disarm(); void write(); } };
  try {
    if (typeof addEventListener === 'function') addEventListener('pagehide', urgent);
    if (typeof document !== 'undefined' && document) {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') urgent(); });
    }
  } catch { /* no window: saves still land on the timer */ }

  return {
    /** The saved row minus its id (raw: pass it through mergeState), or null: none, unreadable, or no IndexedDB. */
    load(): Promise<Partial<SignalState> | null> {
      const read = withDb<unknown>('read', null, readRow).then((row): Partial<SignalState> | null => {
        if (!isObj(row)) return null;
        const rest: Record<string, unknown> = { ...row };
        delete rest.id;
        return rest as Partial<SignalState>;
      });
      return withTimeout(read, LOAD_TIMEOUT_MS, () => {
        warn('read', new Error(`no answer in ${LOAD_TIMEOUT_MS} ms`));
        return null;
      });
    },
    save(s: SignalState): void {
      latest = s;
      gen++;
      if (!inflight) arm();
    },
    /** Write what is pending now; resolves when every save made before the call has committed (or failed). */
    async flush(): Promise<void> {
      const target = gen;
      while (done < target) {
        if (inflight) { await inflight; continue; }
        disarm();
        await write();
      }
    },
  };
}
