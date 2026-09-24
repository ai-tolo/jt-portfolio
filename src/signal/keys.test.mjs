// SIGNAL · lane K · keys.test.mjs — the keys lane without a browser: (1) the manifest → zone-spec parse on the four
// shipped rips (read from public/ via fs, passed in as objects), (2) middle-first order, (3) the SEAM CLICK CHECK
// (voice-verify T8's law on a synthetic 48 k loop with a deliberately mismatched seam, through the keys' own seconds
// conversion and createMultisample's load-time bake), (4) createKeys end to end on a fake context + a gated fake
// fetch (pending keys, the two swaps under held notes, eviction, blur/hidden, a voice switch, a broken voice), and
// (5) MOTION's phase law and its one-writer timer.
//   source ~/.nvm/nvm.sh && node src/signal/keys.test.mjs      (exit 0 = green; prints keys: N/N)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createKeys, parseManifest, middleFirst, firstOver, defaultKeysState, cleanMotion, cleanFx,
  FIRST_BATCH, MIDDLE_MIDI, RIP_SR, TAIL_MS, VEL_DEFAULT, KEYS_GAIN_MAX,
} from './keys.ts';
import { createMotion, lfoDepth, motionP, lfoBeats, DIV_BEATS, MOTION_OFF, MOTION_TICK_MS } from './motion.ts';
import { createMultisample } from './sampler.ts';
import { RIP_ROOT, VOICES, LFO_DIVS } from './types.ts';

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${extra}`); }
}
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flush = async (n = 4) => { for (let i = 0; i < n; i++) await sleep(0); };

const HERE = dirname(fileURLToPath(import.meta.url));
const PUB = join(HERE, '../../public');
const manifestOf = (id) => JSON.parse(readFileSync(join(PUB, RIP_ROOT, `${id}.json`), 'utf8'));
const MAN = Object.fromEntries(VOICES.map((v) => [v, manifestOf(v)]));

// ─────────────────────────────────────────────────────────────── 1 · the manifest parse
console.log('\n[keys] parseManifest — the shipped rhodes rip (public/s/59e8a3b3/rhodes.json, read via fs)');
{
  const man = MAN.rhodes;
  const rip = parseManifest(man, RIP_ROOT);
  ok('21 zones, all usable; id, name, sr, channels carried', rip.specs.length === 21 && rip.total === 21 && rip.id === 'rhodes'
    && rip.name === 'Rhodes' && rip.sr === 48000 && rip.channels === 1 && rip.bytes === man.bytes);
  ok('urls = RIP_ROOT + "/" + file (relative to the manifest\'s folder)',
    rip.specs[0].url === '/s/59e8a3b3/rhodes/024.m4a' && rip.specs.every((s, i) => s.url === `${RIP_ROOT}/${man.zones[i].file}`));
  ok('loop seconds = INTEGER samples ÷ 48000, exactly (never ÷ a decoded rate; shift 0)',
    rip.specs.every((s, i) => s.zone.loopStart === man.zones[i].loopStart / 48000 && s.zone.loopEnd === man.zones[i].loopEnd / 48000));
  ok('roots, key ranges, gain, mode carried as numbers / the two modes',
    rip.specs.every((s, i) => s.zone.rootMidi === man.zones[i].rootMidi && s.zone.loKey === man.zones[i].loKey
      && s.zone.hiKey === man.zones[i].hiKey && s.zone.gain === man.zones[i].gain && s.zone.mode === 'sustain'));
  ok('frames + onset kept for the sanity check (not applied)', rip.specs.every((s, i) => s.frames === man.zones[i].frames && s.onset === man.zones[i].onset));
  const lo = rip.specs.map((s) => s.zone.loKey), hi = rip.specs.map((s) => s.zone.hiKey);
  ok('key ranges tile 0..127 with no gap or overlap', lo[0] === 0 && hi.at(-1) === 127 && lo.every((l, i) => i === 0 || l === hi[i - 1] + 1));
  ok('no velocity bands, no xfade (the bake takes its 30 ms default)', rip.specs.every((s) => s.zone.loVel === undefined && s.zone.hiVel === undefined && s.zone.xfade === undefined));
}
console.log('\n[keys] parseManifest — every shipped rip passes the sampler\'s loopValid at load');
for (const v of VOICES) {
  const rip = parseManifest(MAN[v], RIP_ROOT);
  const bad = rip.specs.filter((s) => {
    const z = s.zone, dur = s.frames / 48000;
    return !(z.loopStart > 0 && z.loopStart < z.loopEnd && z.loopEnd <= dur && z.loopEnd - z.loopStart >= 0.05);
  });
  const tails = new Set(rip.specs.map((s, i) => s.frames - MAN[v].zones[i].loopEnd));
  ok(`${v}: ${rip.specs.length} zones, every loop valid (start > 0, ≥ 50 ms, ends inside the cut file; the encoder's 4096-sample tail)`,
    rip.specs.length === MAN[v].zones.length && bad.length === 0 && tails.size === 1 && tails.has(4096),
    `bad ${bad.map((s) => s.zone.rootMidi)} tails ${[...tails]}`);
}
console.log('\n[keys] parseManifest — the guard law (a broken rip never throws past the loader)');
{
  let threw = 0;
  for (const bad of [null, 7, 'x', {}, { zones: [] }, { zones: 'no' }]) { try { parseManifest(bad, RIP_ROOT); } catch { threw++; } }
  ok('not a rip (no zones) → throws (the loader catches: the voice stays where it was)', threw === 6);
  const rip = parseManifest({
    sr: 48000,
    zones: [
      null, { file: 5, rootMidi: 60 }, { file: '', rootMidi: 60 }, { file: 'v/061.m4a', rootMidi: 'sixty' },
      { file: 'v/062.m4a', rootMidi: NaN }, { file: '/v/063.m4a', rootMidi: 63, loopStart: null, loopEnd: 96000, mode: 'wobble', gain: null },
    ],
  }, '/s/abc/');
  ok('unusable zones dropped and counted (5 of 6)', rip.specs.length === 1 && rip.total === 6);
  const z = rip.specs[0];
  ok('JSON null → undefined; an unknown mode → undefined (the sampler reads absent as sustain)', z.zone.loopStart === undefined
    && z.zone.loopEnd === 2 && z.zone.mode === undefined && z.zone.gain === undefined);
  ok('no double slash from a trailing-slash root or a leading-slash file', z.url === '/s/abc/v/063.m4a');
  ok('sr absent or nonsense → 48000 (RipZone points are 48 k samples)',
    parseManifest({ zones: [{ file: 'a', rootMidi: 60, loopEnd: 48000 }] }, '').specs[0].zone.loopEnd === 1
    && parseManifest({ sr: -1, zones: [{ file: 'a', rootMidi: 60, loopEnd: 48000 }] }, '').sr === RIP_SR);
}

// ─────────────────────────────────────────────────────────────── 2 · middle-first
console.log('\n[keys] middle-first order');
{
  const order = middleFirst(parseManifest(MAN.rhodes, RIP_ROOT).specs).map((s) => s.zone.rootMidi);
  ok('rhodes: 60 57 63 54 66 51 69 48 72 … (nearest middle C first, a tie to the LOWER root)',
    same(order.slice(0, 9), [60, 57, 63, 54, 66, 51, 69, 48, 72]) && order.length === 21, order.join(' '));
  ok(`the first batch (FIRST_BATCH = ${FIRST_BATCH}) = the middle octaves 51..69, centre ${MIDDLE_MIDI}`,
    same(order.slice(0, FIRST_BATCH).sort((a, b) => a - b), [51, 54, 57, 60, 63, 66, 69]));
  ok('…the extremes last (24, the lowest root, is the final zone)', order.at(-1) === 24 && order.at(-2) === 27);
  const pad = middleFirst(parseManifest(MAN.pad, RIP_ROOT).specs).map((s) => s.zone.rootMidi);
  ok('pad (15 roots, 36..78): the same middle batch', same(pad.slice(0, 7).sort((a, b) => a - b), [51, 54, 57, 60, 63, 66, 69]));
  ok('a custom centre (72) reorders around it', middleFirst(parseManifest(MAN.rhodes, RIP_ROOT).specs, 72)[0].zone.rootMidi === 72);
  const specs = [{ zone: { rootMidi: 62 } }, { zone: { rootMidi: 58 } }];
  ok('equidistant roots: the lower first (the zone map\'s tie law)', middleFirst(specs)[0].zone.rootMidi === 58);
  ok('the input is not mutated', specs[0].zone.rootMidi === 62);
}

// ─────────────────────────────────────────────────────────────── 3 · the seam click check
// voice-verify T8's law (signal-studio-v6lib src/engine/voice-verify.ts:289-307, 2a9e4a7): the max per-sample delta
// across the loop seam stays under 3× the local attack delta (the note's own natural motion just after its attack).
console.log('\n[keys] SEAM CLICK CHECK — a mismatched 48 k loop, the keys\' seconds conversion, the load-time bake');
function maxDelta(y, a, b) {
  let m = 0;
  for (let i = Math.max(1, a); i < Math.min(y.length, b); i++) { const d = Math.abs(y[i] - y[i - 1]); if (d > m) m = d; }
  return m;
}
function tone(sr, hz, sec, amp = 0.5, atkSec = 0.03) {
  const n = Math.round(sec * sr), x = new Float32Array(n), atk = Math.round(atkSec * sr);
  for (let i = 0; i < n; i++) x[i] = amp * Math.min(1, i / atk) * Math.sin((2 * Math.PI * hz * i) / sr);
  return x;
}
const fakeBuf = (sr, chans) => ({ numberOfChannels: chans.length, length: chans[0].length, sampleRate: sr, duration: chans[0].length / sr, getChannelData: (c) => chans[c] });
function recordingPlayer(sr) {
  const plays = [];
  const ctx = { sampleRate: sr, currentTime: 0, createGain: () => ({ gain: { setTargetAtTime() {}, value: 1 }, connect() {}, disconnect() {} }),
    createBuffer: (nCh, len, rate) => fakeBuf(rate, Array.from({ length: nCh }, () => new Float32Array(len))) };
  return { plays, player: { ctx, play(opts) { plays.push(opts); return { out: {}, stop() {}, setRate() {}, ended: new Promise(() => {}) }; } } };
}
// the loop points are chosen at 48 k, as the encoder writes them: s on a rising zero crossing past 0.5 s, e = s + 60
// periods + P/3 (a third of a period off: a hard wrap step of ~0.87·amp)
const HZ = 220, SR48 = 48000;
const t48 = tone(SR48, HZ, 1.2);
let S48 = 0;
for (let i = Math.round(0.5 * SR48); ; i++) if (t48[i - 1] < 0 && t48[i] >= 0) { S48 = i; break; }
const P48 = SR48 / HZ, E48 = Math.round(S48 + 60 * P48 + P48 / 3);
const seamManifest = { id: 't', sr: 48000, zones: [{ file: 't/057.m4a', rootMidi: 57, loKey: 0, hiKey: 127, gain: 1, mode: 'sustain',
  loopStart: S48, loopEnd: E48, frames: t48.length, onset: firstOver(t48) }] };
for (const sr of [48000, 44100]) {
  const raw = sr === SR48 ? t48 : tone(sr, HZ, 1.2);            // what decodeAudioData hands back at this context rate
  const before = Float32Array.from(raw);
  const spec = parseManifest(seamManifest, '/s/t').specs[0];
  const { plays, player } = recordingPlayer(sr);
  const ms = createMultisample([{ ...spec.zone, buffer: fakeBuf(sr, [raw]) }], player, { params: { layerMix: 1, mode: 'loop', release: 0.09, hitFade: 0.018 } });
  ms.noteOn('k', 220);
  const o = plays[0], baked = o.buffer.getChannelData(0);
  const s = Math.round(o.loopStart * sr), e = Math.round(o.loopEnd * sr);   // where the source wraps, in this buffer
  const unroll = (x) => { const y = new Float32Array(e + 3 * (e - s)); y.set(x.subarray(0, e)); for (let k = 0; k < 3; k++) y.set(x.subarray(s, e), e + k * (e - s)); return y; };
  const yB = unroll(baked), yR = unroll(raw);
  const atk = maxDelta(yB, Math.round(0.03 * sr), Math.round(0.13 * sr));
  const from = e - Math.round(0.04 * sr);                       // the 30 ms fade + margin, then three wraps
  const seamB = maxDelta(yB, from, yB.length), seamR = maxDelta(yR, from, yR.length);
  const tag = `${sr / 1000} k`;
  ok(`${tag}: the loop reaches the sampler in seconds = samples/48000 (${S48}..${E48} → ${o.loopStart.toFixed(6)}..${o.loopEnd.toFixed(6)} s)`,
    o.loopStart === S48 / 48000 && o.loopEnd === E48 / 48000 && o.loop === true);
  ok(`${tag}: the check has teeth — the RAW wrap clicks (seamΔ ${seamR.toFixed(4)} ≥ 3 × attackΔ ${atk.toFixed(4)})`, seamR >= 3 * atk);
  ok(`${tag}: BAKED at load, the wrap is click-free: seamΔ ${seamB.toFixed(4)} < 3 × attackΔ (${(3 * atk).toFixed(4)}) — T8's law`, seamB < 3 * atk);
  ok(`${tag}: …and within max(.08, 3·attackΔ), the Studio gate's exact form`, seamB < Math.max(0.08, 3 * atk));
  ok(`${tag}: the last pre-wrap sample lands EXACTLY on x[loopStart − 1] (the wrap = the signal's own motion)`, baked[e - 1] === raw[s - 1]);
  ok(`${tag}: the decoded buffer is untouched (the bake runs on a copy)`, baked !== raw && raw.every((v, i) => v === before[i]));
}

// ─────────────────────────────────────────────────────────────── 4 · createKeys end to end (fake context + gated fetch)
console.log('\n[keys] createKeys — a fake context, a gated fetch, the four rips\' real manifests');
function fakeParam(v = 0) {
  const events = [];
  return {
    value: v, events,
    setValueAtTime(x, t) { events.push(['set', x, t]); return this; },
    linearRampToValueAtTime(x, t) { events.push(['ramp', x, t]); return this; },
    setTargetAtTime(x, t, tau) { events.push(['target', x, t, tau]); return this; },
    cancelAndHoldAtTime(t) { events.push(['hold', t]); return this; },
    cancelScheduledValues(t) { events.push(['cancel', t]); return this; },
  };
}
function fakeNode(extra) {
  const n = { outs: [], everOuts: [], disconnects: 0, ...extra };
  n.connect = (x) => { n.outs.push(x); n.everOuts.push(x); return x; };
  n.disconnect = () => { n.disconnects++; n.outs = []; };
  return n;
}
// a zone "file" carries its own recipe; the fake decoder renders it at the context's rate (a sine at the root,
// a 5 ms attack), as long as the cut file (frames at 48 k)
const enc = (o) => new TextEncoder().encode(JSON.stringify(o)).buffer;
function synthDecode(ab, sr) {
  const m = JSON.parse(new TextDecoder().decode(new Uint8Array(ab)));
  const n = Math.round((m.frames * sr) / 48000), hz = 440 * 2 ** ((m.root - 69) / 12), atk = Math.round(0.005 * sr);
  const chans = [];
  for (let c = 0; c < m.ch; c++) {
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = 0.3 * Math.min(1, i / atk) * Math.sin((2 * Math.PI * hz * i) / sr);
    chans.push(x);
  }
  return fakeBuf(sr, chans);
}
function fakeCtx(sr = 48000) {
  const made = { gains: [], srcs: [], decodes: 0 };
  const ctx = {
    currentTime: 0, state: 'running', sampleRate: sr, made,
    createGain() { const g = fakeNode({ kind: 'gain', gain: fakeParam(1) }); made.gains.push(g); return g; },
    createStereoPanner() { return fakeNode({ kind: 'pan', pan: fakeParam(0) }); },
    createBufferSource() {
      const s = fakeNode({ kind: 'src', buffer: null, loop: false, loopStart: 0, loopEnd: 0, playbackRate: fakeParam(1), onended: null, starts: [], stops: [] });
      s.start = (...a) => { s.starts.push(a); };
      s.stop = (t) => { s.stops.push(t); };
      made.srcs.push(s);
      return s;
    },
    createBuffer(nCh, len, rate) { return fakeBuf(rate, Array.from({ length: nCh }, () => new Float32Array(len))); },
    async decodeAudioData(ab) { made.decodes++; return synthDecode(ab, ctx.sampleRate); },
  };
  return ctx;
}
function routesFor(root) {
  const r = new Map();
  for (const v of VOICES) {
    const man = MAN[v];
    r.set(`${root}/${v}.json`, { json: man });
    for (const z of man.zones) r.set(`${root}/${z.file}`, { ab: enc({ root: z.rootMidi, frames: z.frames, ch: man.channels }) });
  }
  return r;
}
// every request waits at a gate until the test releases it (an abort rejects it at once, as a real fetch does)
function gatedFetch(routes) {
  const log = [], gates = [];
  const abortErr = () => Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
  const fetch = (url, opts = {}) => new Promise((resolve, reject) => {
    log.push(url);
    if (opts.signal?.aborted) { reject(abortErr()); return; }
    const gate = {
      url,
      go() {
        if (opts.signal?.aborted) { reject(abortErr()); return; }
        const hit = routes.get(url);
        if (!hit) { resolve({ ok: false, status: 404, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) }); return; }
        resolve({ ok: true, status: 200, json: async () => structuredClone(hit.json), arrayBuffer: async () => hit.ab.slice(0) });
      },
    };
    gates.push(gate);
    opts.signal?.addEventListener('abort', () => { const i = gates.indexOf(gate); if (i >= 0) gates.splice(i, 1); reject(abortErr()); }, { once: true });
  });
  const release = (pred) => { const go = gates.filter((g) => pred(g.url)); for (const g of go) gates.splice(gates.indexOf(g), 1); for (const g of go) g.go(); return go.length; };
  return { fetch, log, waiting: () => gates.map((g) => g.url), release, releaseUrl: (u) => release((x) => x === u), releaseAll: () => release(() => true) };
}
async function drain(net, max = 60) {
  for (let i = 0; i < max; i++) { await flush(); if (!net.waiting().length) return; net.releaseAll(); }
}
const rootOf = (url) => { const m = /\/(\d{3})\.m4a$/.exec(url); return m ? Number(m[1]) : null; };

const warnings = [];
const realWarn = console.warn;
console.warn = (...a) => { warnings.push(a.map(String).join(' ')); };
globalThis.window = new EventTarget();
globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
const ROOT = RIP_ROOT;
const routes = routesFor(ROOT);
const net = gatedFetch(routes);
globalThis.fetch = net.fetch;
const ctx = fakeCtx();
const keys = createKeys({ ctx, ripRoot: ROOT + '/' });
const heldEvents = [];
keys.onHeldChange((h) => heldEvents.push(h));
const lastSrc = () => ctx.made.srcs.at(-1);
const voiceGainOf = (src) => src.everOuts[0];
const residentOf = (src) => voiceGainOf(src).everOuts[0];
const residentGains = () => ctx.made.gains.filter((g) => g.everOuts.includes(keys.out));
const releaseEnd = (src) => voiceGainOf(src).gain.events.filter((e) => e[0] === 'ramp' && e[1] === 0).at(-1)?.[2];
const startGain = (src) => voiceGainOf(src).gain.events.find((e) => e[0] === 'ramp')?.[1];
const url = (v, root) => `${ROOT}/${v}/${String(root).padStart(3, '0')}.m4a`;

{
  ok('createKeys fetches NOTHING (the boot fetches the saved voice INSTEAD of the default: G §3)', net.log.length === 0);
  ok('keys.out = a GainNode at unity, the first node built', keys.out === ctx.made.gains[0] && keys.out.gain.value === 1 && keys.out.gain.events.length === 0);
  ok('state() = the contract\'s defaults (rhodes, filter 1 open, MOTION off sine 1/8, FX candid + a small room)',
    same(keys.state(), defaultKeysState()) && keys.state().voice === 'rhodes' && keys.state().filter === 1
    && keys.state().fx.reverb === 0.22 && keys.state().fx.revSize === 'sm' && keys.state().motion.div === '1/8');
  ok('ready() false before any pick; held() empty', keys.ready() === false && keys.held().length === 0);

  keys.noteOn('kKeyA', 60);
  keys.noteOn('kKeyS', 62);
  keys.noteOff('kKeyS');
  keys.hit(64, 0, 0.2);
  ok('keys before the voice WAIT: nothing sounds, nothing is held, nothing fetched', ctx.made.srcs.length === 0 && keys.held().length === 0 && heldEvents.length === 0);

  let landed = false;
  const p = keys.pick('rhodes');
  void p.then(() => { landed = true; });
  const p2 = keys.pick('rhodes');
  await flush();
  ok('pick fetches the manifest first; a second pick of the same voice joins it (one request, the same promise)',
    same(net.log, [`${ROOT}/rhodes.json`]) && p2 === p);
  net.releaseUrl(`${ROOT}/rhodes.json`);
  await flush();
  ok('zones requested MIDDLE-FIRST, six in flight: 60 57 63 54 66 51', same(net.log.slice(1).map(rootOf), [60, 57, 63, 54, 66, 51]), net.log.slice(1).map(rootOf).join(' '));
  net.release((u) => rootOf(u) === 57 || rootOf(u) === 60);
  await flush();
  ok('as slots free the next in order follow (69, then 48)', same(net.log.slice(7).map(rootOf), [69, 48]), net.log.slice(7).map(rootOf).join(' '));
  ok('not ready until the first seven have settled', keys.ready() === false && !landed && ctx.made.srcs.length === 0);
  net.release((u) => [63, 54, 66, 51, 69].includes(rootOf(u)));
  await flush();
  ok('the first batch landed: ready(), pick() resolved, one resident on keys.out', keys.ready() && landed && residentGains().length === 1);
  const srcA = ctx.made.srcs[0];
  ok('…the key held through the load SOUNDED as the batch landed (zone 60, rate 1, looping)', ctx.made.srcs.length === 1
    && srcA.playbackRate.value === 1 && srcA.loop === true && srcA.buffer.length === Math.round(MAN.rhodes.zones[12].frames));
  ok('…held() = [[kKeyA, 60]], onHeldChange fired once with a copy', same(keys.held(), [['kKeyA', 60]]) && heldEvents.length === 1
    && same(heldEvents[0], [['kKeyA', 60]]) && heldEvents[0] !== keys.held());
  ok('…the key released before the voice never sounded; the early booked hit was dropped', ctx.made.srcs.length === 1);

  keys.noteOn('kKeyD', 40);
  const srcD = lastSrc();
  ok('during the first batch a far key plays the nearest BATCH root (51 → rate 2^(−11/12))', approx(srcD.playbackRate.value, 2 ** (-11 / 12)));

  await drain(net);
  ok('every zone requested exactly once (21), in middle-first order', net.log.length === 22 && new Set(net.log).size === 22
    && same(net.log.slice(1).map(rootOf), middleFirst(parseManifest(MAN.rhodes, ROOT).specs).map((s) => s.zone.rootMidi)));
  ok('the full set swapped in: a second resident on keys.out', residentGains().length === 2);
  ok('NO NOTE CUTS: the keys held on the first batch keep sounding through the swap', srcA.stops.length === 0 && srcD.stops.length === 0);
  keys.noteOn('kKeyF', 40);
  const srcF = lastSrc();
  ok('new keys play the full set: 40 → its own zone 39 (rate 2^(1/12)), on the new resident',
    approx(srcF.playbackRate.value, 2 ** (1 / 12)) && residentOf(srcF) === residentGains()[1] && residentOf(srcA) === residentGains()[0]);
  ok('velocity: the keyboard constant 0.9 (vs 1.0 on the same zone)', (() => {
    keys.noteOn('vel1', 40, 1); const g1 = startGain(lastSrc()); keys.noteOff('vel1');
    return approx(startGain(srcF) / g1, VEL_DEFAULT, 1e-9);
  })());
  keys.noteOff('kKeyA');
  keys.noteOff('kKeyD');
  ok('released on the batch that owns them, with the 90 ms release', approx(releaseEnd(srcA), 0.09, 1e-9) && approx(releaseEnd(srcD), 0.09, 1e-9)
    && approx(srcA.stops.at(-1), 0.095, 1e-9));
  ok('held() now [[kKeyF, 40]]', same(keys.held(), [['kKeyF', 40]]));
  const [firstGain, fullGain] = residentGains();
  ok('the first batch is not dropped while its tails ring', firstGain.disconnects === 0);
  await sleep(TAIL_MS + 250);
  ok(`…and is dropped ${TAIL_MS} ms after its last note (disposed, gain disconnected 150 ms later); the current batch stays`,
    firstGain.disconnects > 0 && fullGain.disconnects === 0);

  keys.retune({ kKeyF: 41, nobody: 50 });
  const rt = srcF.playbackRate.events.filter((e) => e[0] === 'target').at(-1);
  ok('retune glides a held id IN PLACE (the same zone 39: 2^(2/12)), the player\'s τ .03; an unknown id is ignored',
    approx(rt[1], 2 ** (2 / 12)) && rt[3] === 0.03 && srcF.starts.length === 1);
  ok('…held() and onHeldChange follow the retune', same(keys.held(), [['kKeyF', 41]]) && same(heldEvents.at(-1), [['kKeyF', 41]]));
  keys.retune({ kKeyF: 43 }, 0.2);
  ok('retune(map, τ) passes τ through', srcF.playbackRate.events.filter((e) => e[0] === 'target').at(-1)[3] === 0.2);
  keys.retune({ kKeyF: 41 });

  keys.bend(-1200);
  const bt = srcF.playbackRate.events.filter((e) => e[0] === 'target').at(-1);
  ok('bend(−1200): every held voice glides ×0.5 off its base, τ .45 falling', approx(bt[1], 2 ** (2 / 12) * 0.5) && bt[3] === 0.45);
  keys.noteOn('kKeyG', 60);
  ok('…a voice born mid-dive starts bent', approx(lastSrc().playbackRate.value, 0.5));
  keys.bend(0);
  const bz = srcF.playbackRate.events.filter((e) => e[0] === 'target').at(-1);
  ok('bend(0): back to the base exactly, τ .07 recovering', approx(bz[1], 2 ** (2 / 12)) && bz[3] === 0.07);
  keys.bend(-600, 0.9);
  ok('bend(cents, τ): an explicit τ (the DIVE SPEED) passes through', srcF.playbackRate.events.filter((e) => e[0] === 'target').at(-1)[3] === 0.9);
  keys.bend(0);

  keys.hit(72, 0.5, 0.2);
  const h = lastSrc();
  const hEnd = voiceGainOf(h).gain.events.filter((e) => e[0] === 'set');
  ok('hit(): a one-shot booked at `when` for `durSec` (start 0.5, 0.2 s, not looping, not held)',
    same(h.starts[0], [0.5, 0, 0.2]) && h.loop === false && keys.held().every(([id]) => id !== '') && keys.held().length === 2);
  ok('…its own 18 ms fade (the out-ramp starts at 0.7 − 0.018)', hEnd.some((e) => approx(e[2], 0.682, 1e-9)));

  const heldBefore = heldEvents.length;
  keys.allOff();
  const live = [srcF, ctx.made.srcs.find((s) => s.playbackRate.value === 0.5), h];
  ok('allOff: every held voice AND the booked hit get the 30 ms ramp', live.every((s) => approx(releaseEnd(s), 0.03, 1e-9)));
  ok('…held() empty and onHeldChange fired with []', keys.held().length === 0 && heldEvents.length === heldBefore + 1 && same(heldEvents.at(-1), []));

  keys.noteOn('kKeyA', 60);
  const b1 = lastSrc();
  globalThis.window.dispatchEvent(new Event('blur'));
  ok('window blur → allOff (a lost keyup never hangs a note)', approx(releaseEnd(b1), 0.03, 1e-9) && keys.held().length === 0);
  keys.noteOn('kKeyA', 60);
  const b2 = lastSrc();
  globalThis.document.dispatchEvent(new Event('visibilitychange'));
  ok('visibilitychange while visible: nothing', b2.stops.length === 0 && keys.held().length === 1);
  globalThis.document.visibilityState = 'hidden';
  globalThis.document.dispatchEvent(new Event('visibilitychange'));
  globalThis.document.visibilityState = 'visible';
  ok('visibilitychange → hidden: allOff', approx(releaseEnd(b2), 0.03, 1e-9) && keys.held().length === 0);

  // a voice switch under a held key
  keys.noteOn('kKeyA', 60);
  const r1 = lastSrc();
  let pianoIn = false;
  const pp = keys.pick('piano');
  void pp.then(() => { pianoIn = true; });
  ok('pick(piano): state().voice = piano at once; ready() false while it loads', keys.state().voice === 'piano' && keys.ready() === false);
  keys.noteOn('kKeyS', 62);
  const r2 = lastSrc();
  ok('…meanwhile the keys keep playing the voice that sounds (rhodes)', residentOf(r2) === fullGain && r2.buffer.numberOfChannels === 1);
  await drain(net);
  ok('piano landed (first batch, then full): ready(), pick resolved', keys.ready() && pianoIn && keys.state().voice === 'piano');
  keys.noteOn('kKeyD', 64);
  ok('new keys play piano (its stereo zones)', lastSrc().buffer.numberOfChannels === 2);
  ok('the rhodes keys held across the switch were not cut', r1.stops.length === 0 && r2.stops.length === 0 && same(keys.held().map(([id]) => id), ['kKeyA', 'kKeyS', 'kKeyD']));
  keys.noteOff('kKeyA'); keys.noteOff('kKeyS'); keys.noteOff('kKeyD');
  await sleep(TAIL_MS + 250);
  ok('…rhodes leaves once its last tail has rung (only piano\'s batch stays connected)',
    residentGains().filter((g) => g.disconnects === 0).length === 1 && fullGain.disconnects > 0);

  // a broken voice
  routes.delete(`${ROOT}/lead.json`);
  const nWarn = warnings.length;
  const pl = keys.pick('lead');
  await drain(net);
  await pl;
  ok('a voice that cannot load: pick() resolves (never rejects), the seg reverts to what sounds, one warning',
    keys.state().voice === 'piano' && keys.ready() && warnings.slice(nWarn).filter((w) => w.includes('lead did not load')).length === 1);
  keys.noteOn('kKeyA', 60);
  ok('…and the keys still play piano', lastSrc().buffer.numberOfChannels === 2);
  keys.noteOff('kKeyA');

  // stepping past a voice: its fetches are aborted, nothing of it lands
  const nLog = net.log.length, nRes = residentGains().length;
  const pa = keys.pick('pad');
  await flush();
  net.releaseUrl(`${ROOT}/pad.json`);
  await flush();
  ok('pick(pad) starts pad\'s zones…', net.waiting().filter((u) => u.includes('/pad/')).length === 6 && net.log.length === nLog + 7);
  const pb = keys.pick('piano');
  await flush();
  await pa; await pb;
  ok('…stepping back to the sounding voice aborts them (no gate left, no resident built, ready at once)',
    net.waiting().length === 0 && residentGains().length === nRes && keys.ready() && keys.state().voice === 'piano');

  // set(): stored + sanitized; set('voice') picks
  keys.set('filter', 0.3);
  const f1 = keys.state().filter;
  keys.set('filter', NaN); keys.set('filter', '0.1');
  const f2 = keys.state().filter;
  keys.set('filter', 7);
  ok('set(filter): the hand\'s p stored (clamped; NaN and non-numbers ignored) — motion.ts writes it into the filter',
    f1 === 0.3 && f2 === 0.3 && keys.state().filter === 1);
  keys.set('motion', { amount: 2, shape: 'tri', div: '1/8T' });
  ok('set(motion): amount clamped, an unknown shape keeps the current one, a real div taken',
    same(keys.state().motion, { amount: 1, shape: 'sine', div: '1/8T' }));
  keys.set('fx', { ...keys.state().fx, delay: 0.5, revSize: 'huge', driveType: 'fuzz', mod: -3 });
  const fx = keys.state().fx;
  ok('set(fx): kept for effects.apply, field by field (bad values keep the current one)', fx.delay === 0.5 && fx.revSize === 'sm' && fx.driveType === 'fuzz' && fx.mod === 0);
  keys.set('gain', 2); const g1 = keys.state().gain; keys.set('gain', 0.8);
  keys.set('mute', true); keys.set('mute', 'yes');
  ok(`set(gain) clamps to 0..${KEYS_GAIN_MAX}; set(mute) takes booleans only`, g1 === KEYS_GAIN_MAX && keys.state().gain === 0.8 && keys.state().mute === true);
  const snap = keys.state(); snap.motion.amount = 0.5; snap.fx.delay = 0.9; snap.filter = 0;
  ok('state() is a copy: mutating it changes nothing', keys.state().motion.amount === 1 && keys.state().fx.delay === 0.5 && keys.state().filter === 1);
  const nLog2 = net.log.length;
  keys.set('voice', 'banjo');
  ok('set(voice) with an unknown voice: nothing', net.log.length === nLog2 && keys.state().voice === 'piano');
  keys.set('voice', 'rhodes');
  ok('set(voice, v) picks it (lazy: rhodes was dropped, so it loads again)', keys.state().voice === 'rhodes' && keys.ready() === false);
  await drain(net);
  ok('…and lands', keys.ready() && keys.state().voice === 'rhodes');

  // master stop: allOff + the dive released
  keys.noteOn('kKeyA', 60);
  keys.bend(-2400);
  const s1 = lastSrc();
  keys.stop();
  keys.noteOn('kKeyS', 60);
  ok('stop(): every voice down (30 ms) and the DIVE let go: the next key starts at pitch', approx(releaseEnd(s1), 0.03, 1e-9) && lastSrc().playbackRate.value === 1);
  keys.allOff();
  ok('no onHeldChange listener error leaked, no unexpected warning', warnings.every((w) => w.includes('lead did not load')), warnings.join(' | '));
}

console.log('\n[keys] createKeys — edge paths: a zone that fails, a first batch that fails, a rip of ≤ 7 zones');
{
  const routes2 = routesFor(ROOT);
  routes2.delete(url('rhodes', 42));
  const net2 = gatedFetch(routes2);
  globalThis.fetch = net2.fetch;
  const ctx2 = fakeCtx(44100);
  const k2 = createKeys({ ctx: ctx2, ripRoot: ROOT });
  const n0 = warnings.length;
  k2.noteOn('kKeyA', 60);
  const done = k2.pick('rhodes');
  await drain(net2); await done;
  ok('one zone 404s: the rest play, one warning "1 of 21 zones did not load"', k2.ready()
    && warnings.slice(n0).filter((w) => w.includes('1 of 21 zones did not load')).length === 1);
  ok('a 44.1 k context: the same seconds (buffers decoded at 44.1 k, the pending key sounded at rate 1)',
    ctx2.made.srcs[0].buffer.sampleRate === 44100 && ctx2.made.srcs[0].playbackRate.value === 1);

  const routes3 = routesFor(ROOT);
  for (const r of [60, 57, 63, 54, 66, 51, 69]) routes3.delete(url('rhodes', r));
  const net3 = gatedFetch(routes3);
  globalThis.fetch = net3.fetch;
  const ctx3 = fakeCtx();
  const k3 = createKeys({ ctx: ctx3, ripRoot: ROOT });
  const d3 = k3.pick('rhodes');
  await drain(net3); await d3;
  const gains3 = ctx3.made.gains.filter((g) => g.everOuts.includes(k3.out));
  k3.noteOn('x', 60);
  ok('the whole first batch fails: the rest land as ONE swap (no empty instrument), ready()', k3.ready() && gains3.length === 1);
  ok('…a key in the hole plays the nearest remaining root (48 and 72 tie at 12 st: the lower, rate 2)',
    ctx3.made.srcs.length === 1 && approx(ctx3.made.srcs[0].playbackRate.value, 2, 1e-9));

  const small = { id: 'pad', name: 'Pad', role: 'keys', sr: 48000, channels: 1, bytes: 1,
    zones: [48, 54, 60, 66, 72].map((r, i, a) => ({ file: `pad/${String(r).padStart(3, '0')}.m4a`, rootMidi: r, loKey: i ? r - 2 : 0, hiKey: i === a.length - 1 ? 127 : r + 3,
      gain: 1, mode: 'sustain', loopStart: 48000, loopEnd: 96000, frames: 100096, onset: 20 })) };
  const routes4 = new Map([[`${ROOT}/pad.json`, { json: small }], ...small.zones.map((z) => [`${ROOT}/${z.file}`, { ab: enc({ root: z.rootMidi, frames: z.frames, ch: 1 }) }])]);
  const net4 = gatedFetch(routes4);
  globalThis.fetch = net4.fetch;
  const ctx4 = fakeCtx();
  const k4 = createKeys({ ctx: ctx4, ripRoot: ROOT });
  const d4 = k4.pick('pad');
  await drain(net4); await d4;
  const n4 = net4.log.length;
  await k4.pick('pad');
  ok('a rip of ≤ 7 zones: the first batch IS the voice (one build, and a re-pick fetches nothing)',
    k4.ready() && ctx4.made.gains.filter((g) => g.everOuts.includes(k4.out)).length === 1 && net4.log.length === n4);
  ok('no onset warning on a rip whose decoded onsets agree', !warnings.some((w) => w.includes('onset moved')));

  // a pick that fails after it aborted the sounding voice's full set: that set is fetched again
  const routes5 = routesFor(ROOT);
  routes5.delete(`${ROOT}/lead.json`);
  const net5 = gatedFetch(routes5);
  globalThis.fetch = net5.fetch;
  const ctx5 = fakeCtx();
  const k5 = createKeys({ ctx: ctx5, ripRoot: ROOT });
  const MID = [60, 57, 63, 54, 66, 51, 69];
  void k5.pick('rhodes');
  await flush(); net5.releaseUrl(`${ROOT}/rhodes.json`);
  for (let i = 0; i < 12 && !k5.ready(); i++) { await flush(); net5.release((u) => MID.includes(rootOf(u))); }
  await flush();
  const res5 = () => ctx5.made.gains.filter((g) => g.everOuts.includes(k5.out)).length;
  const inFlight = net5.waiting().length;
  ok('(setup) rhodes\' first batch plays while the rest is still in flight', k5.ready() && res5() === 1 && inFlight > 0);
  const pl5 = k5.pick('lead');
  await flush();
  ok('pick(lead) aborts rhodes\' remaining zones', net5.waiting().every((u) => u.endsWith('/lead.json')));
  net5.releaseAll();
  await pl5; await flush();
  ok('lead fails: the seg reverts to rhodes, which still plays', k5.state().voice === 'rhodes' && k5.ready());
  await drain(net5);
  k5.noteOn('x', 40);
  ok('…and rhodes\' full set is fetched again and swaps in (40 plays its own zone 39)', res5() === 2
    && approx(ctx5.made.srcs.at(-1).playbackRate.value, 2 ** (1 / 12), 1e-9));
}
console.warn = realWarn;

// ─────────────────────────────────────────────────────────────── 5 · MOTION
console.log('\n[motion] the phase law (C §6: p = pHand·(1 − amount·d), d = (1 − L(frac(beats/DIV)))/2)');
{
  ok('the RATE table = the Studio\'s SYNCS b for every LFO_DIVS detent', LFO_DIVS.length === 9 && same(LFO_DIVS.map((d) => DIV_BEATS[d]),
    [4, 2, 1, 2 / 3, 0.5, 1 / 3, 0.25, 1 / 6, 0.125]));
  ok('sine: the hand\'s corner ON the beat (d 0), the floor half a cycle on (d 1)', lfoDepth('sine', '1/4', 0) === 0 && approx(lfoDepth('sine', '1/4', 0.5), 1));
  ok('sawi (the falling ramp) closes slowly then snaps open: it pumps', approx(lfoDepth('sawi', '1/4', 0.25), 0.25) && approx(lfoDepth('sawi', '1/4', 0.999), 0.999) && lfoDepth('sawi', '1/4', 1) === 0);
  ok('saw snaps shut on the beat and opens', approx(lfoDepth('saw', '1/4', 0), 1) && approx(lfoDepth('saw', '1/4', 0.75), 0.25));
  ok('sqr: open the first half, closed the second', lfoDepth('sqr', '1/4', 0.25) === 0 && lfoDepth('sqr', '1/4', 0.75) === 1);
  ok('1/8 cycles twice a beat; 1/8T three times; 1/1 once a bar', approx(lfoDepth('sine', '1/8', 0.25), 1) && approx(lfoDepth('sine', '1/8T', 1 / 6), 1) && approx(lfoDepth('sine', '1/1', 2), 1));
  ok('motionP = pHand·(1 − amount·d): only ever CLOSES from the hand', approx(motionP(0.8, { amount: 0.5, shape: 'sine', div: '1/4' }, 0.5), 0.4)
    && motionP(0.8, { amount: 1, shape: 'sine', div: '1/4' }, 0) === 0.8 && motionP(0.8, { amount: 1, shape: 'sine', div: '1/4' }, 0.5) === 0);
  const lattice = { running: () => true, grid: () => ({ sr: 48000, barFrames: 96000, originFrame: 4800 }), bpm: () => 120 };
  ok('phase from the LATTICE in ctx time: one beat after the origin reads 1 beat', approx(lfoBeats(lattice, { currentTime: 0.6 }), 1)
    && approx(lfoBeats(lattice, { currentTime: 0.1 }), 0));
  ok('clock stopped: free-running at the tempo', approx(lfoBeats({ running: () => false, grid: () => null, bpm: () => 90 }, { currentTime: 2 }), 3));
}
console.log('\n[motion] createMotion — the one writer (a 16 ms timer; nothing while suspended; the hand\'s p when off)');
{
  const writes = [];
  const filter = { set: (p) => writes.push(p), get: () => writes.at(-1) ?? 1, input: {}, output: {} };
  const ks = { filter: 0.8, motion: { amount: 0, shape: 'sine', div: '1/4' } };
  const keysFake = { state: () => ({ ...ks, motion: { ...ks.motion } }) };
  const time = { running: () => true, grid: () => ({ sr: 48000, barFrames: 96000, originFrame: 4800 }), bpm: () => 120 };
  const mctx = { state: 'suspended', currentTime: 0.35 };        // half a beat past the origin: sine d = 1 at 1/4
  const m = createMotion({ keys: keysFake, time, filter, ctx: mctx });
  await sleep(3 * MOTION_TICK_MS);
  ok('a suspended context: nothing written (a frozen clock would stack glides for the first note)', writes.length === 0);
  mctx.state = 'running';
  await sleep(3 * MOTION_TICK_MS);
  ok('running, MOTION off: the hand\'s p written ONCE', same(writes, [0.8]));
  ks.filter = 0.6;
  await sleep(3 * MOTION_TICK_MS);
  ok('…and again only when the hand moves (the next tick)', same(writes, [0.8, 0.6]));
  ks.motion.amount = MOTION_OFF / 2;
  await sleep(3 * MOTION_TICK_MS);
  ok(`amount below ${MOTION_OFF} reads OFF: nothing new`, writes.length === 2);
  ks.motion.amount = 1;
  await sleep(4 * MOTION_TICK_MS);
  const on = writes.slice(2);
  ok('MOTION on: EVERY tick writes pHand·(1 − amount·d) at the lattice phase (here the floor: 0)', on.length >= 2 && on.every((p) => p === 0), on.join(','));
  mctx.currentTime = 0.1 + 1;                                     // on a beat: the hand's corner
  await sleep(3 * MOTION_TICK_MS);
  ok('…on the beat the sine is back at the hand\'s corner', approx(writes.at(-1), 0.6, 1e-12));
  const n = writes.length;
  ks.motion.amount = 0;
  await sleep(4 * MOTION_TICK_MS);
  ok('MOTION off again: one write of the hand\'s p, then quiet', writes.length === n + 1 && writes.at(-1) === 0.6);
  m.dispose();
  const k = writes.length;
  ks.filter = 0.1; ks.motion.amount = 1;
  await sleep(3 * MOTION_TICK_MS);
  ok('dispose() stops the timer', writes.length === k);
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}: ${pass} passed, ${fail} failed`);
console.log(`keys: ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
