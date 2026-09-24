// SIGNAL · lane K · sampler.test.mjs — the Studio's sampler suites, PORTED: every check below is the Studio's own,
// run against src/signal/sampler.ts (the five leaves in one module). Only the imports changed; one check is new (the
// contract's player alias, at the end).
//   source ~/.nvm/nvm.sh && node src/signal/sampler.test.mjs      (exit 0 = green; prints sampler: N/N)
// ═══ from signal-studio-v6lib/src/engine/sampler/multisample.test.mjs:1-480 (2a9e4a7) — lines 10-12 (three imports) repointed ═══
// w13-voices — multisample tests, no real Web Audio: zone-map math (leaf import) plus (W15) the
// mock player's stop/setRate scheduling and the multisample node's zone prep / release times /
// bend rate math, plus (W16) decay-zone ring-out playback and the mount-time gain recompute —
// exercised through fake ctx + player seams (a fake AudioParam just records its schedule; a fake
// SamplePlayer records play opts + per-voice stop/setRate calls and exposes end() so a test can
// fire a voice's natural end).
// Plain ESM so `tsc` skips it; Node 24 type-strips the imported .ts (value imports inside
// multisample.ts carry .ts extensions for exactly this — it pulls in zone-dsp.ts, lane A's leaf).
//   node src/engine/sampler/multisample.test.mjs
import {
  selectZoneIndex, chooseZoneRate, rateForRoot, selectZoneVel,          // multisample-map.ts
  createMockSamplePlayer, createSamplePlayer,                            // mock-sample-player.ts (+ the contract alias)
  createMultisample, defaultMultisampleParams,                          // multisample.ts
  bakeLoopCrossfade, rmsOver, DEFAULT_XFADE_SEC,                         // zone-dsp.ts
} from './sampler.ts';

let pass = 0, fail = 0;
const approx = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${extra}`); }
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// A realistic build: a Rhodes sampled every 3 semitones from A0 (21) to C7 (96).
const roots = [];
for (let m = 21; m <= 96; m += 3) roots.push(m);
const zones = roots.map((r) => ({ rootMidi: r }));

console.log('\n[multisample] zone selection');
ok('empty set → -1', selectZoneIndex([], 60) === -1);
ok('single zone always chosen', selectZoneIndex([{ rootMidi: 60 }], 12) === 0 && selectZoneIndex([{ rootMidi: 60 }], 120) === 0);
ok('exact root picks a root within 0 of the note', zones[selectZoneIndex(zones, 60)].rootMidi === 60);
ok('off-root picks the NEAREST root (≤ half-spacing)', Math.abs(zones[selectZoneIndex(zones, 61)].rootMidi - 61) <= 2, `root ${zones[selectZoneIndex(zones, 61)].rootMidi}`);
{
  const zr = [{ rootMidi: 40, loKey: 0, hiKey: 47 }, { rootMidi: 60, loKey: 48, hiKey: 127 }];
  ok('explicit key-range overrides nearest (high half)', selectZoneIndex(zr, 50) === 1);
  ok('explicit key-range overrides nearest (low half)', selectZoneIndex(zr, 30) === 0);
}
ok('equidistant tie → lower root', selectZoneIndex([{ rootMidi: 58 }, { rootMidi: 62 }], 60) === 0);

console.log('\n[multisample] repitch stays musical — the whole point');
ok('a note at its exact root → rate 1.0', approx(chooseZoneRate([{ rootMidi: 60 }], mtof(60)).rate, 1));
{
  // Across the FULL playable range, every note's repitch must be ≤ half the 3-semi spacing (1.5 semis)
  // → rate within [2^(-1.5/12), 2^(1.5/12)] ≈ [0.9170, 1.0905]. That bound IS studio quality.
  let maxRate = 0, minRate = Infinity;
  for (let m = 21; m <= 96; m++) {
    const r = chooseZoneRate(zones, mtof(m)).rate;
    maxRate = Math.max(maxRate, r); minRate = Math.min(minRate, r);
  }
  const lo = Math.pow(2, -1.5 / 12), hi = Math.pow(2, 1.5 / 12);
  ok('every note across A0–C7 repitched ≤ 1.5 semis (0.917–1.091)', minRate >= lo - 1e-6 && maxRate <= hi + 1e-6, `min ${minRate.toFixed(4)} max ${maxRate.toFixed(4)}`);
  // Contrast: single-sample repitch (one root at C4=60) chipmunks to rate ~8 at the top of the range.
  ok('single-sample would chipmunk (rate ~8×) — multisample removes it', approx(chooseZoneRate([{ rootMidi: 60 }], mtof(96)).rate, 8, 0.02), `got ${chooseZoneRate([{ rootMidi: 60 }], mtof(96)).rate.toFixed(3)}`);
}
ok('global tune +12 semis → 2× rate', approx(chooseZoneRate([{ rootMidi: 69 }], 440, 12).rate / chooseZoneRate([{ rootMidi: 69 }], 440).rate, 2));

console.log('\n[multisample] SL73 M2 velocity-band selection (selectZoneVel / chooseZoneRate 4th arg)');
{
  // 2-layer voice at ONE root — the only difference is the band, so selection is pure velocity.
  const two = [
    { rootMidi: 57, loKey: 0, hiKey: 127, loVel: 1, hiVel: 95 },   // idx 0 — soft
    { rootMidi: 57, loKey: 0, hiKey: 127, loVel: 96, hiVel: 127 }, // idx 1 — hard
  ];
  // vel is 0..1 (v127 = round(vel·127), mirroring pickLayer).
  ok('soft velocity (0.3 → v38) → soft layer', selectZoneVel(two, 57, 0.3) === 0);
  ok('hard velocity (0.9 → v114) → hard layer', selectZoneVel(two, 57, 0.9) === 1);
  ok('HARD SWITCH at the band edge: v95 (95/127) → soft, v96 (96/127) → hard', selectZoneVel(two, 57, 95 / 127) === 0 && selectZoneVel(two, 57, 96 / 127) === 1);
  ok('full velocity 1.0 → v127 → hard; near-zero → soft', selectZoneVel(two, 57, 1) === 1 && selectZoneVel(two, 57, 0.01) === 0);
  ok('chooseZoneRate threads vel (4th arg) → soft idx 0 @ rate 1', (() => { const p = chooseZoneRate(two, mtof(57), 0, 0.3); return p.index === 0 && approx(p.rate, 1); })());
  ok('chooseZoneRate threads vel (4th arg) → hard idx 1 @ rate 1', (() => { const p = chooseZoneRate(two, mtof(57), 0, 0.9); return p.index === 1 && approx(p.rate, 1); })());

  // 3-band × 2-root grid — velocity picks the band, THEN nearest root within it (the two stages).
  const bands = [[1, 63], [64, 105], [106, 127]];
  const grid = [];
  for (const [lo, hi] of bands) for (const root of [48, 72]) grid.push({ rootMidi: root, loKey: root === 48 ? 0 : 60, hiKey: root === 48 ? 59 : 127, loVel: lo, hiVel: hi });
  const mid = selectZoneVel(grid, 72, 80 / 127);   // v80 → band [64,105]; midi 72 → root 72
  ok('3×2 grid: mid vel + high pitch → mid band, root 72', grid[mid].loVel === 64 && grid[mid].rootMidi === 72, JSON.stringify(grid[mid]));
  const soft = selectZoneVel(grid, 48, 30 / 127);  // v30 → band [1,63]; midi 48 → root 48
  ok('3×2 grid: soft vel + low pitch → soft band, root 48', grid[soft].loVel === 1 && grid[soft].rootMidi === 48);

  // back-compat: untagged zones ignore velocity entirely (pure pitch, === selectZoneIndex).
  const untag = [{ rootMidi: 55 }, { rootMidi: 67 }];
  ok('untagged zones: velocity inert', selectZoneVel(untag, 60, 0.1) === selectZoneVel(untag, 60, 0.9) && selectZoneVel(untag, 60, 0.5) === selectZoneIndex(untag, 60));
}

console.log('\n[multisample] rateForRoot (same-zone glide for ←/→ transpose)');
ok('exact root → 1.0', approx(rateForRoot(69, 440), 1));
ok('+1 semitone → 2^(1/12)', approx(rateForRoot(69, mtof(70)), Math.pow(2, 1 / 12)));
ok('bad freq → 1.0 (no NaN rate)', rateForRoot(69, 0) === 1 && rateForRoot(69, -5) === 1);

// ── W15 fakes — just enough Web Audio surface, every schedule call recorded ──────────────────────
function fakeParam(v = 0) {
  const events = [];
  return {
    value: v, events,
    setValueAtTime(val, t) { events.push(['set', val, t]); },
    linearRampToValueAtTime(val, t) { events.push(['ramp', val, t]); },
    setTargetAtTime(val, t, tau) { events.push(['target', val, t, tau]); },
    cancelAndHoldAtTime(t) { events.push(['hold', t]); },
    cancelScheduledValues(t) { events.push(['cancel', t]); },
  };
}
function fakeBuf(sr, chans) { // chans: Float32Array[]
  return {
    numberOfChannels: chans.length, length: chans[0].length, sampleRate: sr,
    duration: chans[0].length / sr,
    getChannelData: (c) => chans[c],
  };
}
function fakeCtx() {
  const made = { srcs: [], gains: [] };
  return {
    currentTime: 0, made,
    createGain() { const g = { gain: fakeParam(0), connect() {}, disconnect() {} }; made.gains.push(g); return g; },
    createStereoPanner() { return { pan: fakeParam(0), connect() {}, disconnect() {} }; },
    createBufferSource() {
      const src = {
        buffer: null, loop: false, loopStart: 0, loopEnd: 0,
        playbackRate: fakeParam(1), onended: null, starts: [], stops: [],
        connect() {}, disconnect() {},
        start(...a) { src.starts.push(a); },
        stop(t) { src.stops.push(t); },
      };
      made.srcs.push(src);
      return src;
    },
    createBuffer(nCh, len, sr) { return fakeBuf(sr, Array.from({ length: nCh }, () => new Float32Array(len))); },
  };
}

console.log('\n[mock-player] stop(when, releaseSec) — re-stop tightens, never loosens (W15)');
{
  const ctx = fakeCtx();
  const player = createMockSamplePlayer(ctx);
  const buf = fakeBuf(48000, [new Float32Array(48000)]);
  const v = player.play({ buffer: buf, when: 0, loop: true, destination: { connect() {} } });
  const g = ctx.made.gains[0], src = ctx.made.srcs[0];
  const rampsTo0 = () => g.gain.events.filter((e) => e[0] === 'ramp' && e[1] === 0);
  ok('loop voice schedules no natural stop', src.stops.length === 0);
  v.stop(1.0, 0.5);
  ok('stop ramps to 0 at when+release', approx(rampsTo0().at(-1)[2], 1.5));
  ok('source.stop at ramp end + 5ms', approx(src.stops.at(-1), 1.505));
  ok('envelope held at stop time (no value snap)', g.gain.events.some((e) => e[0] === 'hold' && approx(e[1], 1.0)));
  v.stop(1.0, 0.1); // tighter — the old `stopped` latch would have eaten this
  ok('re-stop with EARLIER end reschedules', approx(rampsTo0().at(-1)[2], 1.1) && approx(src.stops.at(-1), 1.105));
  const nEv = g.gain.events.length, nSt = src.stops.length;
  v.stop(1.0, 0.3); // looser — must NOT un-choke
  ok('re-stop with LATER end is a no-op', g.gain.events.length === nEv && src.stops.length === nSt);
}
{
  const ctx = fakeCtx();
  const player = createMockSamplePlayer(ctx);
  const buf = fakeBuf(48000, [new Float32Array(48000)]);
  const v = player.play({ buffer: buf, when: 0, loop: true, fadeOut: 0.05, destination: { connect() {} } });
  v.stop(2.0);
  const end = ctx.made.gains[0].gain.events.filter((e) => e[0] === 'ramp' && e[1] === 0).at(-1)[2];
  ok('releaseSec omitted → the voice fadeOut (old declick behavior)', approx(end, 2.05));
  const v2 = player.play({ buffer: buf, when: 0, loop: true, destination: { connect() {} } });
  v2.stop(2.0, 0);
  const end2 = ctx.made.gains[1].gain.events.filter((e) => e[0] === 'ramp' && e[1] === 0).at(-1)[2];
  ok('release floor 0.5ms (never a hard cut)', approx(end2, 2.0005, 1e-6), `end ${end2}`);
}

console.log('\n[mock-player] setRate(rate, when, tau) — tau clamp 0.005..1.0 (W15)');
{
  const ctx = fakeCtx();
  const player = createMockSamplePlayer(ctx);
  const buf = fakeBuf(48000, [new Float32Array(48000)]);
  const v = player.play({ buffer: buf, when: 0, loop: true, destination: { connect() {} } });
  const pr = ctx.made.srcs[0].playbackRate;
  const last = () => pr.events.filter((e) => e[0] === 'target').at(-1);
  v.setRate(0.5, 1.0);
  ok('default tau 0.03', approx(last()[3], 0.03));
  v.setRate(0.5, 1.0, 0.45);
  ok('explicit tau passes through (the dive fall)', approx(last()[3], 0.45));
  v.setRate(0.5, 1.0, 5);
  ok('tau clamps high → 1.0', approx(last()[3], 1.0));
  v.setRate(0.5, 1.0, 0.0001);
  ok('tau clamps low → 0.005', approx(last()[3], 0.005));
  ctx.made.srcs[0].onended(); // natural end
  const n = pr.events.length;
  v.setRate(2, 1.0); v.stop(1.0, 0.1);
  ok('after natural end: setRate + stop are no-ops', pr.events.length === n && ctx.made.srcs[0].stops.length === 0);
}

// ── The multisample node through a fake SamplePlayer (records opts + per-voice calls) ────────────
function msRig(zoneList, params) {
  const ctx = fakeCtx();
  const plays = [];
  const player = {
    ctx,
    play(opts) {
      const rec = { opts, stops: [], rates: [] };
      rec.voice = {
        out: {},
        stop(when, release) { rec.stops.push([when, release]); },
        setRate(r, when, tau) { rec.rates.push([r, when, tau]); },
        // resolvable so W16 can fire a natural end; unresolved elsewhere = the old never-ends fake.
        ended: new Promise((res) => { rec.end = res; }),
      };
      plays.push(rec);
      return rec.voice;
    },
  };
  return { ctx, plays, inst: createMultisample(zoneList, player, { params }) };
}
function toneZone(rootMidi, { sr = 48000, dur = 1.0, loopStart, loopEnd } = {}) {
  const n = Math.round(dur * sr);
  const data = new Float32Array(n);
  // ramp + wiggle: monotonic drift makes any seam rewrite unmistakable sample-for-sample.
  for (let i = 0; i < n; i++) data[i] = i / n + 0.05 * Math.sin((2 * Math.PI * 220 * i) / sr);
  return { rootMidi, buffer: fakeBuf(sr, [data]), loopStart, loopEnd };
}
function flatZone(rootMidi, { sr = 48000, dur = 1.0, amp = 0.1, mode, loopStart, loopEnd } = {}) {
  // constant |amp| everywhere → rms == amp EXACTLY, so the W16 re-level assertions are closed-form.
  const data = new Float32Array(Math.round(dur * sr)).fill(amp);
  return { rootMidi, buffer: fakeBuf(sr, [data]), mode, loopStart, loopEnd };
}

console.log('\n[multisample] W15 param defaults');
{
  const p = defaultMultisampleParams();
  ok('release default 0.1', p.release === 0.1);
  ok('hitFade default 0.02', p.hitFade === 0.02);
  ok('prior fields intact (mode loop, mix 1, decay 1)', p.mode === 'loop' && p.layerMix === 1 && p.decay === 1);
}

console.log('\n[multisample] zone prep — baked-crossfade COPY, input never mutated');
{
  const sr = 48000;
  const z = toneZone(69, { sr, loopStart: 0.3, loopEnd: 0.9 });
  const before = Float32Array.from(z.buffer.getChannelData(0));
  const { plays, inst } = msRig([z]);
  inst.noteOn('a', 440);
  const played = plays[0].opts.buffer;
  ok('loop-pointed zone plays a COPY, not the input', played !== z.buffer);
  const after = z.buffer.getChannelData(0);
  ok('input buffer bit-identical after construction', before.every((x, i) => x === after[i]));
  const pc = played.getChannelData(0);
  const startS = Math.round(0.3 * sr), endS = Math.round(0.9 * sr);
  let changed = 0, headSame = true, loSeam = Infinity, hiSeam = -Infinity;
  for (let i = 0; i < pc.length; i++) {
    if (pc[i] !== before[i]) { changed++; if (i <= startS) headSame = false; loSeam = Math.min(loSeam, i); hiSeam = Math.max(hiSeam, i); }
  }
  ok('bake actually rewrote the seam (copy ≠ input)', changed > 0);
  ok('bake left [0..loopStart] untouched (loop points stay honest)', headSame);
  ok('rewrites confined to the fade window before loopEnd', loSeam >= endS - Math.ceil(0.04 * sr) && hiSeam <= endS + 8, `[${loSeam}, ${hiSeam}] vs end ${endS}`);
  ok('loop window passed through unchanged (seconds)', approx(plays[0].opts.loopStart, 0.3) && approx(plays[0].opts.loopEnd, 0.9));
}
{
  const cases = [
    ['no points', toneZone(69, {})],
    ['loopStart 0 (attack-looping)', toneZone(69, { loopStart: 0, loopEnd: 0.5 })],
    ['loop < 50ms', toneZone(69, { loopStart: 0.3, loopEnd: 0.34 })],
    ['loopEnd past buffer', toneZone(69, { loopStart: 0.3, loopEnd: 1.2 })],
    ['inverted points', toneZone(69, { loopStart: 0.9, loopEnd: 0.3 })],
  ];
  for (const [name, z] of cases) {
    const { plays, inst } = msRig([z]);
    inst.noteOn('a', 440);
    ok(`${name} → raw buffer passes through un-copied`, plays[0].opts.buffer === z.buffer);
  }
}

console.log('\n[multisample] release times — retrigger 25ms / noteOff release / allOff 30ms / hit fadeOut');
{
  const { plays, inst } = msRig([toneZone(69, { loopStart: 0.3, loopEnd: 0.9 })]);
  inst.noteOn('a', 440);
  inst.noteOn('a', 440); // same-id retrigger
  ok('retrigger chokes the prev voice at 25ms', plays[0].stops.length === 1 && approx(plays[0].stops[0][1], 0.025));
  inst.noteOff('a', 1.0);
  ok('noteOff releases at params.release (default 0.1)', plays[1].stops.length === 1 && plays[1].stops[0][0] === 1.0 && approx(plays[1].stops[0][1], 0.1));
  inst.setParams({ release: 0.25 });
  inst.noteOn('b', 440);
  inst.noteOff('b', 2.0);
  ok('noteOff tracks a live release change', approx(plays[2].stops[0][1], 0.25));
  inst.noteOn('c', 440);
  inst.hit(440, 0, 0.2);
  inst.allOff(3.0);
  ok('allOff chokes the held voice at 30ms', approx(plays[3].stops[0][1], 0.03));
  ok('allOff chokes the hit voice at 30ms too', approx(plays[4].stops[0][1], 0.03));
  ok('hit carries fadeOut = params.hitFade (default 0.02)', approx(plays[4].opts.fadeOut, 0.02));
  inst.setParams({ hitFade: 0.05 });
  inst.hit(440, 0, 0.2);
  ok('hit tracks a live hitFade change', approx(plays[5].opts.fadeOut, 0.05));
  ok('held (noteOn) voices keep the player fadeOut default', plays[0].opts.fadeOut === undefined);
}

console.log('\n[multisample] bend — DIVE rate math on the mock seam (baseRate is authoritative)');
{
  const { plays, inst } = msRig([toneZone(69, { loopStart: 0.3, loopEnd: 0.9 })]);
  inst.noteOn('a', 440); // the zone root → base rate 1
  ok('root note starts at rate 1', approx(plays[0].opts.rate, 1));
  inst.bend(-1200);
  let last = plays[0].rates.at(-1);
  ok('bend(-1200) → setRate(base × 0.5)', approx(last[0], 0.5));
  ok('dive falls slow: default tau 0.45', approx(last[2], 0.45));
  inst.noteOn('b', 880); // starts DURING the bend → pre-bent
  ok('new voice starts pre-bent (base 2 × 0.5 = 1)', approx(plays[1].opts.rate, 1));
  inst.retune('a', 880); // ←/→ transpose mid-dive
  last = plays[0].rates.at(-1);
  ok('retune mid-dive glides to new-base × bend (2 × 0.5)', approx(last[0], 1));
  inst.bend(0);
  last = plays[0].rates.at(-1);
  ok('bend(0) restores the RETUNED base exactly (2, no drift)', approx(last[0], 2));
  ok('recover is quick: default tau 0.07', approx(last[2], 0.07));
  ok('restore hits every held voice (b back to its base 2)', approx(plays[1].rates.at(-1)[0], 2));
  inst.bend(-2400, 0.3);
  last = plays[0].rates.at(-1);
  ok('explicit tau overrides the default', approx(last[2], 0.3) && approx(last[0], 0.5));
  // still diving −2400 here: core sends hit() the UNDIVED pitch — the sink's own bend state dives it.
  inst.hit(440, 0, 0.2);
  ok('hit during a dive starts pre-bent (1 × 0.25)', approx(plays.at(-1).opts.rate, 0.25));
}

console.log('\n[multisample] W16 decay zones — full-buffer ring-out, no loop, no bake');
{
  const z = flatZone(69, { dur: 2.0, mode: 'decay', loopStart: 0.3, loopEnd: 0.9 });
  const { plays, inst } = msRig([z]); // params.mode defaults to 'loop' — the held-key path
  inst.noteOn('a', 440);
  const o = plays[0].opts;
  ok('held decay voice does NOT loop', o.loop === false);
  // w16r2: held decay voices are OPEN-ENDED (duration undefined) — the un-looped source ends when
  // its CONTENT runs out, which is rate-aware, so a mid-ring DIVE/retune stretches the ring-out
  // instead of hard-cutting at a stale wall-clock end (review fix #2).
  ok('duration = undefined (open-ended, content-domain natural ring-out)', o.duration === undefined);
  ok('bake skipped: raw buffer passes through despite valid loop points', o.buffer === z.buffer);
  inst.noteOff('a', 1.0);
  ok('noteOff still damps at params.release (default 0.1)', plays[0].stops.length === 1 && plays[0].stops[0][0] === 1.0 && approx(plays[0].stops[0][1], 0.1));
}
{
  // back-compat + the explicit tag: absent mode and 'sustain' both loop exactly as W15 (bake included).
  for (const [name, z] of [
    ['mode absent', toneZone(69, { loopStart: 0.3, loopEnd: 0.9 })],
    ["mode 'sustain'", { ...toneZone(69, { loopStart: 0.3, loopEnd: 0.9 }), mode: 'sustain' }],
  ]) {
    const { plays, inst } = msRig([z]);
    inst.noteOn('a', 440);
    ok(`${name} → loops a baked copy, no duration`, plays[0].opts.loop === true && plays[0].opts.duration === undefined && plays[0].opts.buffer !== z.buffer);
  }
}
{
  // the ring-out ignores bend scaling AND the {decay} one-shot gate; hit() stays durSec-gated.
  const z = flatZone(69, { dur: 2.0, mode: 'decay' });
  const { plays, inst } = msRig([z], { decay: 0.5 });
  inst.bend(-1200);
  inst.noteOn('a', 440);
  ok('held ring-out is open-ended regardless of bend (rate-aware by construction)', plays[0].opts.duration === undefined);
  inst.bend(0);
  inst.hit(440, 0, 0.2);
  ok('hit() on a decay zone unchanged: durSec gate, not the buffer', approx(plays[1].opts.duration, 0.2) && plays[1].opts.loop === false);
}
{
  // oneshot params.mode on a decay zone: the plain one-shot path, {decay} gate and all (unchanged).
  const z = flatZone(69, { dur: 2.0, mode: 'decay' });
  const { plays, inst } = msRig([z], { mode: 'oneshot', decay: 0.5 });
  inst.noteOn('a', 440);
  ok('oneshot mode keeps the decay gate (2.0 × 0.5)', approx(plays[0].opts.duration, 1.0));
}
{
  // ended-cleanup mirrors the !loop noteOn path: the map entry clears at natural end, so a re-press
  // is a fresh voice with NO retrigger choke fired at the dead one.
  const z = flatZone(69, { dur: 2.0, mode: 'decay' });
  const { plays, inst } = msRig([z]);
  inst.noteOn('a', 440);
  inst.noteOn('a', 440); // still ringing → the normal 25ms retrigger choke
  ok('retrigger while ringing still chokes at 25ms', plays[0].stops.length === 1 && approx(plays[0].stops[0][1], 0.025));
  plays[1].end();
  await plays[1].voice.ended; // the cleanup .then was attached first, so it has already run
  inst.noteOn('a', 440);
  ok('after natural end the entry is gone — no stop on the dead voice', plays[1].stops.length === 0 && plays.length === 3);
  inst.noteOff('a', 5.0);
  ok('noteOff lands on the NEW voice', plays[2].stops.length === 1);
}

console.log('\n[multisample] W16 mount-time re-level — live gain overrides z.gain (−14 target)');
const T14 = Math.pow(10, -14 / 20); // ≈ 0.1995 — the performance-loudness target RMS
const PK = Math.pow(10, -6 / 20); // ≈ 0.5012 — the w17.6 peak ceiling (−6 dBFS)
{
  const z = flatZone(69, { amp: 0.1, loopStart: 0.3, loopEnd: 0.9 });
  z.gain = 0.7; // a persisted W15 (−18-target) gain — playback must NOT use it
  const { plays, inst } = msRig([z]);
  inst.noteOn('a', 440);
  ok('sustain gain = 10^(−14/20)/loopRMS — stored 0.7 overridden', approx(plays[0].opts.gain, T14 / 0.1));
  inst.hit(440, 0, 0.2, 0.5);
  ok('velocity still multiplies the LIVE gain', approx(plays[1].opts.gain, 0.5 * (T14 / 0.1)));
}
{
  // region proof, sustain: measures the LOOP, not the whole buffer. Edges 0.2 are louder than the
  // 0.1 loop body (a whole-buffer RMS would read differently) but below the w17.6 peak ceiling, so
  // the RMS target still drives the gain.
  const sr = 48000;
  const data = new Float32Array(sr);
  const s = Math.round(0.3 * sr), e = Math.round(0.9 * sr);
  for (let i = 0; i < sr; i++) data[i] = i >= s && i < e ? 0.1 : 0.2;
  const { plays, inst } = msRig([{ rootMidi: 69, buffer: fakeBuf(sr, [data]), loopStart: 0.3, loopEnd: 0.9 }]);
  inst.noteOn('a', 440);
  ok('sustain measures the loop region only', approx(plays[0].opts.gain, T14 / 0.1));
}
{
  // w17.6 peak ceiling: a hot ATTACK (0.8) louder than the −14 loop body caps the gain so the
  // loudest sample plays at −6 dBFS (PK/0.8) — the fix for "distorted alone / super in chords".
  // Still proves the loop region is measured: a whole-buffer RMS would drop byRms below PK/0.8.
  const sr = 48000;
  const data = new Float32Array(sr);
  const s = Math.round(0.3 * sr), e = Math.round(0.9 * sr);
  for (let i = 0; i < sr; i++) data[i] = i >= s && i < e ? 0.1 : 0.8;
  const { plays, inst } = msRig([{ rootMidi: 69, buffer: fakeBuf(sr, [data]), loopStart: 0.3, loopEnd: 0.9 }]);
  inst.noteOn('a', 440);
  ok('peak ceiling caps a hot attack to −6 dBFS', approx(plays[0].opts.gain, PK / 0.8));
}
{
  // region proof, decay: measures the first 1.5s, not the (near-silent) tail of the ring-out.
  const sr = 48000;
  const data = new Float32Array(3 * sr);
  const cut = Math.round(1.5 * sr);
  for (let i = 0; i < data.length; i++) data[i] = i < cut ? 0.1 : 0.004;
  const { plays, inst } = msRig([{ rootMidi: 69, buffer: fakeBuf(sr, [data]), mode: 'decay' }]);
  inst.noteOn('a', 440);
  ok('decay measures the first 1.5s only', approx(plays[0].opts.gain, T14 / 0.1));
}
{
  const hot = flatZone(69, { amp: 1.0, loopStart: 0.3, loopEnd: 0.9 });
  { const { plays, inst } = msRig([hot]); inst.noteOn('a', 440); ok('hot buffer clamps at the 0.4 floor', approx(plays[0].opts.gain, 0.4)); }
  const faint = flatZone(69, { amp: 0.001, loopStart: 0.3, loopEnd: 0.9 });
  { const { plays, inst } = msRig([faint]); inst.noteOn('a', 440); ok('faint buffer clamps at the 2.5 ceiling', approx(plays[0].opts.gain, 2.5)); }
  const silent = flatZone(69, { amp: 0.00005, loopStart: 0.3, loopEnd: 0.9 });
  silent.gain = 0.7;
  { const { plays, inst } = msRig([silent]); inst.noteOn('a', 440); ok('silence (rms < 1e-4) skips the override → stored gain 0.7', approx(plays[0].opts.gain, 0.7)); }
}
{
  // a decay capture shorter than the 1.5s window: rmsOver clamps to the buffer — still levels.
  const z = flatZone(69, { dur: 0.5, mode: 'decay' });
  const { plays, inst } = msRig([z]);
  inst.noteOn('a', 440);
  ok('short decay buffer (<1.5s) levels off its whole length', approx(plays[0].opts.gain, T14 / 0.1));
}

// ── R17 — a zone may carry its OWN seam length (HI-FI sizes it to the loop) ────────────────────
console.log('\n[multisample] R17 per-zone xfade — the bake honours it, and its absence changes nothing');
{
  const sr = 48000;
  const width = (z) => {
    // how far back from loopEnd the bake rewrote, in seconds
    const before = Float32Array.from(z.buffer.getChannelData(0));
    const { plays, inst } = msRig([z]);
    inst.noteOn('a', 440);
    const pc = plays[0].opts.buffer.getChannelData(0);
    const endS = Math.round(z.loopEnd * sr);
    let first = -1;
    for (let i = 0; i < pc.length; i++) if (pc[i] !== before[i]) { first = i; break; }
    return { sec: first < 0 ? 0 : (endS - first) / sr, copied: plays[0].opts.buffer !== z.buffer, first };
  };
  const plain = width(toneZone(69, { sr, dur: 4, loopStart: 0.5, loopEnd: 3.5 }));
  const long = width({ ...toneZone(69, { sr, dur: 4, loopStart: 0.5, loopEnd: 3.5 }), xfade: 0.25 });
  ok('a zone with NO xfade still bakes the 30ms default (pre-R17 behaviour, untouched)', approx(plain.sec, 0.03, 0.004), `${plain.sec.toFixed(4)}s`);
  ok('a zone WITH xfade:0.25 bakes a 250ms seam', approx(long.sec, 0.25, 0.01), `${long.sec.toFixed(4)}s`);
  ok('both still play a COPY (the stored buffer is never mutated)', plain.copied && long.copied);

  // garbage in the store must degrade to the default, never to a crash or a silent buffer
  for (const [label, bad] of [['0', 0], ['negative', -1], ['NaN', NaN], ['a string', '0.2']]) {
    const r = width({ ...toneZone(69, { sr, dur: 4, loopStart: 0.5, loopEnd: 3.5 }), xfade: bad });
    ok(`xfade ${label} → the 30ms default, not a crash`, approx(r.sec, 0.03, 0.004), `${r.sec.toFixed(4)}s`);
  }
  // an absurd stored value can only be clamped by the bake, never overrun the buffer
  {
    const z = { ...toneZone(69, { sr, dur: 4, loopStart: 0.5, loopEnd: 3.5 }), xfade: 99 };
    const { plays, inst } = msRig([z]);
    inst.noteOn('a', 440);
    const pc = plays[0].opts.buffer.getChannelData(0);
    ok('an absurd xfade clamps: every sample finite, buffer intact', pc.length === Math.round(4 * sr) && pc.every((v) => Number.isFinite(v)));
  }
  // a DECAY zone never wraps, so it is never baked — an xfade on one must be inert
  {
    const z = { ...flatZone(69, { sr, dur: 2, mode: 'decay', loopStart: 0.3, loopEnd: 1.5 }), xfade: 0.25 };
    const { plays, inst } = msRig([z]);
    inst.noteOn('a', 440);
    ok('a decay zone is still not baked, xfade or no xfade', plays[0].opts.buffer === z.buffer && plays[0].opts.loop !== true);
  }
}


// ═══ from signal-studio-v6lib/src/engine/sampler/zone-dsp.test.mjs:14-37 + 243-316 + 381 (2a9e4a7) — the synthetic-PCM
// helpers, the rmsOver block and the two bakeLoopCrossfade blocks (what the portfolio ships of zone-dsp), in their own
// scope: `ok`/`approx` above are the same helpers as the zone-dsp suite's (zone-dsp.test.mjs:7-12). ═══
{
const SR = 48000;
// ---- synthetic PCM (what render.ts captures look like: attack → decay → sustain → release) ----
const ENV = { attack: 0.03, decay: 0.15, sustain: 0.8, release: 0.15 };
function envAt(i, n, o = ENV) {
  const t = i / SR, dur = n / SR;
  let env;
  if (t < o.attack) env = t / o.attack;
  else if (t < o.attack + o.decay) env = 1 - (1 - o.sustain) * ((t - o.attack) / o.decay);
  else env = o.sustain;
  const rt = dur - t;
  if (rt < o.release) env *= Math.max(0, rt / o.release);
  return env;
}
function tone(freq, dur, { amp = 0.35, kind = 'sine', env = ENV } = {}) {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const th = (2 * Math.PI * freq * i) / SR;
    let s;
    if (kind === 'saw') { s = 0; for (let k = 1; k <= 12 && k * freq < SR / 2; k++) s += Math.sin(k * th) / k; s *= 0.7; }
    else s = Math.sin(th);
    out[i] = amp * envAt(i, n, env) * s;
  }
  return out;
}

console.log('\n[rmsOver] exported (lane B re-levels every zone from its buffer at mount)');
{
  const b = new Float32Array([0, 0.5, -0.5, 0.5]);
  ok('exact rms over the full buffer', approx(rmsOver(b, 0, 4), Math.sqrt(0.75 / 4), 1e-9));
  ok('sub-range [1,2) → 0.5', rmsOver(b, 1, 2) === 0.5);
  ok('empty + inverted ranges → 0', rmsOver(b, 3, 3) === 0 && rmsOver(b, 3, 1) === 0);
  ok('out-of-range bounds clamp to the buffer', rmsOver(b, -5, 99) === rmsOver(b, 0, 4));
  const nanB = new Float32Array([NaN, NaN]);
  ok('NaN input → 0, never NaN', rmsOver(nanB, 0, 2) === 0);
}

console.log('\n[bakeLoopCrossfade] a deliberately misaligned seam: bake removes the wrap click');
{
  // flat 220 Hz sine; loopEnd forced P/3 off phase → an ugly wrap the bake must repair.
  const flat = { attack: 0.005, decay: 0.005, sustain: 1, release: 0.005 };
  const buf = tone(220, 2.0, { amp: 0.5, env: flat });
  const P = SR / 220;
  let s = 0;
  for (let i = Math.round(0.5 * SR); ; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { s = i; break; }
  const e = Math.round(s + 137 * P + P / 3);
  const baked = buf.slice();
  bakeLoopCrossfade(baked, SR, s / SR, e / SR); // default 0.03s fade
  const jumpUn = Math.abs(buf[s] - buf[e - 1]);
  const jumpBk = Math.abs(baked[s] - baked[e - 1]);
  ok('setup: unbaked wrap is a real click (>0.2)', jumpUn > 0.2, `jump ${jumpUn.toFixed(3)}`);
  ok('bake reduces the wrap discontinuity', jumpBk < jumpUn, `un ${jumpUn.toFixed(4)} baked ${jumpBk.toFixed(4)}`);
  ok('baked wrap is within natural motion (≤0.02)', jumpBk <= 0.02, `got ${jumpBk.toFixed(4)}`);
  ok('last pre-wrap sample lands EXACTLY on x[loopStart−1]', baked[e - 1] === buf[s - 1]);
  const fade = Math.floor(0.03 * SR);
  let preOk = true;
  for (let i = s - 10; i < e - fade; i++) if (baked[i] !== buf[i]) { preOk = false; break; }
  ok('loop body before the fade untouched', preOk);
  ok('material at/after loopEnd untouched', baked[e] === buf[e] && baked[e + 100] === buf[e + 100] && baked[0] === buf[0]);
}

console.log('\n[bakeLoopCrossfade] correlation-aware blend law + no-op guards');
{
  // w15r2: the blend law is correlation-aware. CORRELATED regions (an all-ones plateau, ρ=1 —
  // the phase-aligned pitched path) take the constant-gain LINEAR blend, which is exactly
  // level-preserving: the old unconditional equal-power law swelled such material +3 dB mid-fade
  // (a periodic pulse at every loop pass on clean sustains).
  const ones = new Float32Array(SR).fill(1);
  bakeLoopCrossfade(ones, SR, 0.2, 0.7);
  const s = Math.round(0.2 * SR), e = Math.round(0.7 * SR), fade = Math.floor(0.03 * SR);
  let flatOk = true;
  for (const i of [0, Math.floor(fade / 2) - 1, fade - 1]) {
    if (!approx(ones[e - fade + i], 1, 1e-5)) flatOk = false;
  }
  ok('correlated (ρ=1) fade is level-preserving linear — no +3dB swell', flatOk);
  ok('outside the fade stays 1', ones[s] === 1 && ones[e - fade - 1] === 1 && ones[e] === 1);

  // ANTI-correlated regions (ρ = −1 by construction: the pre-loopStart window is +0.5, the
  // pre-loopEnd window −0.5) keep the equal-power law — a linear blend would null mid-fade there.
  {
    const u = new Float32Array(SR).fill(0.01); // tiny bias keeps ZC/guards out of the way
    const us = Math.round(0.3 * SR), ue = Math.round(0.7 * SR);
    const uf = Math.floor(0.03 * SR);
    for (let i = us - uf; i < us; i++) u[i] = 0.5;   // material before loopStart
    for (let i = ue - uf; i < ue; i++) u[i] = -0.5;  // material before loopEnd (opposite sign)
    bakeLoopCrossfade(u, SR, us / SR, ue / SR);
    const j = Math.floor(uf / 2) - 1, t = (j + 1) / uf;
    const expected = Math.cos(t * Math.PI / 2) * -0.5 + Math.sin(t * Math.PI / 2) * 0.5;
    ok('anti-correlated fade keeps the equal-power law', approx(u[ue - uf + j], expected, 1e-4));
  }

  const g = tone(220, 0.4, { amp: 0.5 });
  const snap = g.slice();
  bakeLoopCrossfade(g, SR, 10 / SR, 0.3);      // loopStart·sr < 16 → no-op
  bakeLoopCrossfade(g, SR, 0.3, 0.2);          // end ≤ start → no-op
  bakeLoopCrossfade(g, SR, 0.1, 99);           // end past the buffer → no-op
  bakeLoopCrossfade(g, 0, 0.1, 0.3);           // bad sr → no-op
  bakeLoopCrossfade(g, SR, NaN, 0.3);          // NaN bounds → no-op
  ok('invalid regions are strict no-ops', g.every((v, i) => v === snap[i]));
}
ok('DEFAULT_XFADE_SEC is still the w15 30ms', DEFAULT_XFADE_SEC === 0.03);
}

// ═══ lane K (new) ═══
console.log('\n[lane K] the contract\'s name for the player');
ok('createSamplePlayer is the Studio\'s player (mock-sample-player, the real runtime one: C §1)', createSamplePlayer === createMockSamplePlayer);

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}: ${pass} passed, ${fail} failed`);
console.log(`sampler: ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
