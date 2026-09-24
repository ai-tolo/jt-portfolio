// SIGNAL · lane D · THE HOUSE KIT — six AAC-LC one-shots (base64 in src/components/signal-drumkit.ts, the repo's own
// copy, byte-identical to signal-studio-v6lib/src/engine/signal-drumkit.ts), decoded ONCE on the live context at boot.
// decodeAudioData works on a suspended context, so the kit is ready before the first gesture (A §8 REWRITE "Kit").
//
// Sources (read-only, copied):
//   b64ToArrayBuffer        from signal-studio-v6lib/src/engine/dsp.ts:229-235 (2a9e4a7) — verbatim.
//   LANE_KIT_KEY            from signal-studio-v6lib/src/engine/drum-kit.ts:26-28 (2a9e4a7) — LANE_BAKED_KEY with the
//                           Studio's `perc` lane renamed `shaker` (types.ts DRUM_LANES); the kit key was already `shaker`.
//   decodeKit               adapted from signal-studio-v6lib/src/engine/dsp.ts:237-273 (2a9e4a7) decodeKit/decodeKitReady:
//                           ONE context, so the per-context WeakMap cache is cut (A §8 CUT); awaitable; NEVER rejects.
// A lane that fails to decode is left out of the resolved object (the DrumKit type is the promise, a missing buffer
// is the exception): drums.ts books nothing for it (the page's precedent, P/click.ts:111) and drums.ready() says false,
// so the gate names the failure instead of the page going silent.
import type { DecodeKit, DrumKit, DrumLane } from './types.ts';
import { DRUM_LANES } from './types.ts';
import { DRUMKIT } from '../components/signal-drumkit.ts';

/** drum-kit.ts:26-28 — the kit key each lane plays (perc → shaker). */
export const LANE_KIT_KEY: Readonly<Record<DrumLane, string>> = {
  kick: 'kick', snare: 'snare', hat: 'hat', openhat: 'openhat', clap: 'clap', shaker: 'shaker',
};

// ── from signal-studio-v6lib/src/engine/dsp.ts:229-235 (2a9e4a7), verbatim ──
function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64),
    ab = new ArrayBuffer(bin.length),
    u8 = new Uint8Array(ab);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return ab;
}

/** Decode all six lanes on `ctx`, keyed by DRUM_LANES. decodeAudioData detaches its ArrayBuffer, so each lane gets a
 *  fresh one (dsp.ts:223). Resolves when every lane has either decoded or failed; never rejects. */
export const decodeKit: DecodeKit = (ctx) => {
  const one = (lane: DrumLane): Promise<AudioBuffer | null> => {
    const b64 = DRUMKIT[LANE_KIT_KEY[lane]];
    if (!b64) return Promise.resolve(null);
    let p: Promise<AudioBuffer>;
    try { p = ctx.decodeAudioData(b64ToArrayBuffer(b64)); } catch { return Promise.resolve(null); }
    return p.then((b) => b, () => null); // left out: drums.ready() reports it
  };
  // all six decode in parallel; the kit is keyed in DRUM_LANES order whatever order they land in
  return Promise.all(DRUM_LANES.map(one)).then((bufs) => {
    const kit: Partial<Record<DrumLane, AudioBuffer>> = {};
    DRUM_LANES.forEach((lane, i) => { const b = bufs[i]; if (b) kit[lane] = b; });
    return kit as DrumKit;
  });
};
