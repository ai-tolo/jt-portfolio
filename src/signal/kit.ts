// SIGNAL · lane D · THE HOUSE KIT — six AAC-LC one-shots, decoded ONCE on the live context at boot. decodeAudioData
// works on a suspended context, so the kit is ready before the first gesture (A §8 REWRITE "Kit").
// R2 (lane A): THE KIT AS FILES. The six hits are static files on the unlisted path, `<ripRoot>/kit/<lane>.m4a`
// (public/s/59e8a3b3/kit/), written byte for byte by scripts/signal/kit-extract.mjs from src/components/signal-drumkit.ts
// (the repo's own copy, byte-identical to signal-studio-v6lib/src/engine/signal-drumkit.ts). The bundle no longer
// imports the base64 module: ~90 KB of string and the boot task that parsed + atob'd it are gone; the six fetches run
// beside the voice's first batch.
//
// Sources (read-only, copied):
//   LANE_KIT_KEY            from signal-studio-v6lib/src/engine/drum-kit.ts:26-28 (2a9e4a7) — LANE_BAKED_KEY with the
//                           Studio's `perc` lane renamed `shaker` (types.ts DRUM_LANES); the kit key was already `shaker`.
//   decodeKit               adapted from signal-studio-v6lib/src/engine/dsp.ts:237-273 (2a9e4a7) decodeKit/decodeKitReady:
//                           ONE context, so the per-context WeakMap cache is cut (A §8 CUT); awaitable; NEVER rejects.
//                           R2: each lane's bytes come from a fetch (b64ToArrayBuffer, dsp.ts:229-235, left with the base64).
// A lane that fails to fetch or decode is left out of the resolved object (the DrumKit type is the promise, a missing
// buffer is the exception): drums.ts books nothing for it (the page's precedent, P/click.ts:111) and drums.ready() says
// false, so the gate names the failure instead of the page going silent.
import type { DecodeKit, DrumKit, DrumLane } from './types.ts';
import { DRUM_LANES, RIP_ROOT } from './types.ts';

/** drum-kit.ts:26-28 — the kit key each lane plays (perc → shaker). The extractor names each file by its lane and
 *  fills it with DRUMKIT[LANE_KIT_KEY[lane]]. */
export const LANE_KIT_KEY: Readonly<Record<DrumLane, string>> = {
  kick: 'kick', snare: 'snare', hat: 'hat', openhat: 'openhat', clap: 'clap', shaker: 'shaker',
};

/** The kit's folder under the rip root (scripts/signal/kit-extract.mjs writes it). */
export const KIT_DIR = 'kit';

/** Where a lane's hit lives: `<root>/kit/<lane>.m4a` (a trailing slash on the root is ignored). */
export function kitUrl(lane: DrumLane, root: string = RIP_ROOT): string {
  return `${String(root ?? '').replace(/\/+$/, '')}/${KIT_DIR}/${lane}.m4a`;
}

/** Fetch + decode all six lanes on `ctx`, keyed by DRUM_LANES, from `root` (default RIP_ROOT; the instrument passes its
 *  own ripRoot). Every lane fetches into its own ArrayBuffer (decodeAudioData detaches it, dsp.ts:223), all six in
 *  parallel. Resolves when every lane has either decoded or failed; never rejects. A second argument is additive to
 *  the contract's DecodeKit (ctx) => Promise<DrumKit>. */
export function decodeKit(ctx: BaseAudioContext, root: string = RIP_ROOT): Promise<DrumKit> {
  const one = (lane: DrumLane): Promise<AudioBuffer | null> => {
    let p: Promise<AudioBuffer>;
    try {
      p = fetch(kitUrl(lane, root))
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
        .then((ab) => ctx.decodeAudioData(ab));
    } catch { return Promise.resolve(null); }   // no fetch at all (a very old engine): the lane is left out
    return p.then((b) => b, () => null);        // left out: drums.ready() reports it
  };
  // the kit is keyed in DRUM_LANES order whatever order the lanes land in
  return Promise.all(DRUM_LANES.map(one)).then((bufs) => {
    const kit: Partial<Record<DrumLane, AudioBuffer>> = {};
    const missing: string[] = [];
    DRUM_LANES.forEach((lane, i) => { const b = bufs[i]; if (b) kit[lane] = b; else missing.push(lane); });
    if (missing.length) { try { console.warn(`[signal/kit] left out (fetch or decode failed): ${missing.join(' ')}`); } catch { /* */ } }
    return kit as DrumKit;
  });
}

decodeKit satisfies DecodeKit;
