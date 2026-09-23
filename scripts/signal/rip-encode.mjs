#!/usr/bin/env node
// THE RIPS · encode one ~/SignalLibrary voice (signal-studio/voice-backup@1) into the shipped zones + a RipManifest
// (src/signal/types.ts). Each sustain zone is cut at loopEnd + PAD with the tail overwritten by a copy of the loop
// start, so a codec shift of a few hundred samples still lands inside the loop. Zero deps beyond ffmpeg.
//
//   node scripts/signal/rip-encode.mjs --voice keys--Rd-2-Gallery --id rhodes --name "Rhodes" \
//        [--budget 1400000] [--out public/s/<hex>] [--bitrate 112k | --q 8] [--codec aac_at|aac|opus]
//
// --out defaults to a fresh unlisted public/s/<8 hex>/ (printed). Writes <out>/<id>/<root3>.m4a + <out>/<id>.json.
// Default is AudioToolbox AAC-LC CBR, 80k mono / 112k stereo. Not VBR: the loops live in the quiet, decayed tails and
// VBR starves them (at -q:a 8, 14 of 21 Rhodes seams missed -30 dB in every browser; CBR 112k clears all 21).
// --q <0-14> = aac_at VBR instead. --codec aac|opus exist for the codec comparison only.
// Scratch WAVs go to $RIP_SCRATCH (default the OS temp dir), prefixed rip-.
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { homedir, tmpdir } from 'node:os';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SR = 48000;
const PAD = 4096;                      // periodic tail past loopEnd
const FADE_IN = Math.round(0.002 * SR), FADE_OUT = Math.round(0.005 * SR);
const NEAR_ZERO = 1e-3;                // |x[0]| at or under this = "already starts near zero" (no fade-in)
const DECAY_CAP = 8 * SR;
const MONO_CORR = 0.985;               // every zone at or above → downmix to mono
const ONSET_ABS = 0.02;                // the alignment fingerprint threshold (rip-verify + the runtime use the same)
const CORE = [36, 84], MAX_GAP = 6;    // budget drops never leave a gap > 6 st between kept roots across the core

// ─── args
const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) die(`unexpected argument ${argv[i]}`);
  opt[argv[i].slice(2)] = argv[i + 1]; i++;
}
const VOICE = opt.voice, ID = opt.id, NAME = opt.name;
if (!VOICE || !ID || !NAME) die('usage: rip-encode.mjs --voice <library id> --id <rhodes|piano|pad|lead> --name <label> [--budget N] [--out dir] [--bitrate 112k | --q 0-14] [--codec aac_at|aac|opus]');
const BUDGET = Number(opt.budget ?? 1_400_000);
const Q = opt.q == null ? null : Number(opt.q), BITRATE = opt.bitrate ?? null;
const CODEC = opt.codec ?? 'aac_at';
const cbr = (ch) => BITRATE ?? (ch === 2 ? '112k' : '80k');
const OUT = resolve(REPO, opt.out ?? join('public/s', randomBytes(4).toString('hex')));
const SCRATCH = mkdtempSync(join(process.env.RIP_SCRATCH || tmpdir(), 'rip-enc-'));
function die(msg) { console.error(`rip-encode: ${msg}`); process.exit(1); }

// ─── codecs (aac_at is the shipped one; the others exist for the seam diagnosis)
const CODECS = {
  aac_at: { ext: 'm4a', args: (ch, fallback) => Q != null && !fallback ? ['-c:a', 'aac_at', '-aac_at_mode', 'vbr', '-q:a', String(Q)]
                                                                     : ['-c:a', 'aac_at', '-aac_at_mode', 'cbr', '-b:a', cbr(ch)] },
  aac:    { ext: 'm4a', args: (ch) => ['-c:a', 'aac', '-b:a', cbr(ch)] },
  opus:   { ext: 'webm', args: () => ['-c:a', 'libopus', '-b:a', BITRATE ?? '64k'] },
};
if (!CODECS[CODEC]) die(`unknown --codec ${CODEC}`);
let cbrFallback = false;

// ─── WAV in: RIFF walk, 24-bit PCM LE → Float32 per channel
function readWav(path) {
  const b = readFileSync(path);
  if (b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WAVE') die(`${path}: not RIFF/WAVE`);
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('latin1', p, p + 4), size = b.readUInt32LE(p + 4), body = p + 8;
    if (id === 'fmt ') {
      fmt = { tag: b.readUInt16LE(body), ch: b.readUInt16LE(body + 2), sr: b.readUInt32LE(body + 4), bits: b.readUInt16LE(body + 14) };
      if (fmt.tag === 0xfffe && size >= 26) fmt.tag = b.readUInt16LE(body + 24);   // WAVE_FORMAT_EXTENSIBLE sub-format
    } else if (id === 'data') data = { at: body, size: Math.min(size, b.length - body) };
    p = body + size + (size & 1);
  }
  if (!fmt || !data) die(`${path}: no fmt/data chunk`);
  if (fmt.tag !== 1 || fmt.bits !== 24 || fmt.sr !== SR || fmt.ch < 1 || fmt.ch > 2)
    die(`${path}: want 24-bit PCM @ ${SR}, got tag ${fmt.tag} ${fmt.bits}-bit ${fmt.ch} ch @ ${fmt.sr}`);
  const n = Math.floor(data.size / (3 * fmt.ch)), chans = Array.from({ length: fmt.ch }, () => new Float32Array(n));
  for (let i = 0, q = data.at; i < n; i++) for (let c = 0; c < fmt.ch; c++, q += 3)
    chans[c][i] = (((b[q] | (b[q + 1] << 8) | (b[q + 2] << 16)) << 8) >> 8) / 8388608;
  return chans;
}

// ─── WAV out: 32-bit float (keeps the 24-bit source honest; ffmpeg quantises once, at the encoder)
function writeWavF32(path, chans) {
  const n = chans[0].length, ch = chans.length, bytes = n * ch * 4, h = Buffer.alloc(44);
  h.write('RIFF', 0, 'latin1'); h.writeUInt32LE(36 + bytes, 4); h.write('WAVEfmt ', 8, 'latin1');
  h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * ch * 4, 28); h.writeUInt16LE(ch * 4, 32); h.writeUInt16LE(32, 34);
  h.write('data', 36, 'latin1'); h.writeUInt32LE(bytes, 40);
  const f = new Float32Array(n * ch);
  for (let c = 0; c < ch; c++) { const x = chans[c]; for (let i = 0; i < n; i++) f[i * ch + c] = x[i]; }
  writeFileSync(path, Buffer.concat([h, Buffer.from(f.buffer, f.byteOffset, f.byteLength)]));
}

const correlation = ([L, R]) => {
  if (!R) return 1;
  let lr = 0, ll = 0, rr = 0;
  for (let i = 0; i < L.length; i++) { lr += L[i] * R[i]; ll += L[i] * L[i]; rr += R[i] * R[i]; }
  return ll && rr ? lr / Math.sqrt(ll * rr) : 1;
};

// ─── the cut: sustain → [0, loopEnd + PAD) with the tail = the loop made periodic; decay → whole file (≤ 8 s)
// one mode per voice: a lone 'decay' zone with valid loop points inside a sustain voice (CFX Moody's root 63) is
// coerced to sustain, so neighbouring keys do not ring out while their neighbours hold (reader C §8.6)
function coerceModes(zones) {
  const sustain = zones.filter((z) => z.mode === 'sustain').length;
  if (sustain < zones.length / 2) return;
  for (const z of zones) if (z.mode === 'decay' && z.loopStart > 0 && z.loopEnd > z.loopStart + 0.05) { z.mode = 'sustain'; z.coerced = true; }
}
function cut(z, src) {
  const n = src[0].length;
  const ls0 = Math.round(z.loopStart * SR), le0 = Math.round(z.loopEnd * SR);
  let out, ls, le;
  if (z.mode === 'decay') {
    const len = Math.min(n, DECAY_CAP);
    out = src.map((x) => x.slice(0, len));
    ls = Math.min(Math.max(ls0, 0), len - 1); le = Math.min(Math.max(le0, ls + 1), len);
  } else {
    le = Math.min(le0, n); ls = ls0;
    // a loop that starts at (or near) the attack repeats the attack on every cycle (the Studio's analyzer gave
    // Lead Feedbacker's 69..84 a whole-file loop): move the start into the sustain, ≥ 1 s in and past 40 % of the loop end
    if (ls < 0.25 * SR && le > 1.5 * SR) { ls = Math.round(Math.max(1.0 * SR, 0.4 * le)); z.relooped = true; }
    if (!(ls >= 0 && ls < le)) die(`${z.file}: bad loop ${z.loopStart}..${z.loopEnd} s`);
    out = src.map((x) => { const o = new Float32Array(le + PAD); o.set(x.subarray(0, le)); return o; });
  }
  const startsNearZero = out.every((o) => Math.abs(o[0]) <= NEAR_ZERO);
  if (!startsNearZero) for (const o of out) for (let i = 0; i < FADE_IN; i++) o[i] *= i / FADE_IN;
  if (z.mode !== 'decay') {           // after the fade-in, so the tail is an exact copy of what sits at loopStart
    const L = le - ls;
    for (const o of out) for (let i = 0; i < PAD; i++) o[le + i] = o[ls + (i % L)];
  }
  for (const o of out) { const m = o.length; for (let i = 0; i < FADE_OUT; i++) o[m - 1 - i] *= i / FADE_OUT; }
  let onset = -1;
  for (let i = 0, x = out[0]; i < x.length; i++) if (Math.abs(x[i]) > ONSET_ABS) { onset = i; break; }
  return { out, ls, le, frames: out[0].length, onset, fadedIn: !startsNearZero, clampedEnd: le0 > n };
}

// ─── encode one zone at a channel count → bytes on disk
function encode(z, mono) {
  const src = mono ? [z.src[0].map((l, i) => (l + z.src[1][i]) / 2)] : z.src;
  const c = cut(z, src), ch = src.length, tmp = join(SCRATCH, `rip-${ID}-${z.root3}.wav`);
  writeWavF32(tmp, c.out);
  const dst = join(OUT, ID, `${z.root3}.${CODECS[CODEC].ext}`);
  const run = (fallback) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp,
    ...CODECS[CODEC].args(ch, fallback), '-ar', String(SR), '-ac', String(ch), '-map_metadata', '-1', '-fflags', '+bitexact',
    ...(CODECS[CODEC].ext === 'm4a' ? ['-movflags', '+faststart'] : []), dst], { stdio: ['ignore', 'ignore', 'pipe'] });
  try { run(cbrFallback); } catch (e) {
    if (CODEC !== 'aac_at' || Q == null || cbrFallback) die(`ffmpeg failed on ${z.file}: ${e.stderr}`);
    console.log(`  aac_at refused VBR -q:a (${String(e.stderr).trim()}); falling back to CBR ${cbr(ch)}`);
    cbrFallback = true; run(true);
  }
  rmSync(tmp, { force: true });
  return { ...c, out: undefined, mono, ch, dst, bytes: statSync(dst).size };
}

// ─── coverage law for budget drops
function covered(roots) {
  const s = [...roots].sort((a, b) => a - b);
  const below = s.filter((r) => r <= CORE[0]), above = s.filter((r) => r >= CORE[1]);
  const pts = [below.length ? below.at(-1) : CORE[0], ...s.filter((r) => r > CORE[0] && r < CORE[1]), above.length ? above[0] : CORE[1]];
  return pts.every((r, i) => i === 0 || r - pts[i - 1] <= MAX_GAP);
}

// ─── main
const vdir = join(homedir(), 'SignalLibrary/voices', VOICE);
const man = JSON.parse(readFileSync(join(vdir, 'manifest.json'), 'utf8'));
if (man.schema !== 'signal-studio/voice-backup@1') die(`${VOICE}: schema ${man.schema}`);
const zones = man.assets.filter((a) => a.kind === 'zone').map((a) => ({ ...a }));
coerceModes(zones);
if (!zones.length) die(`${VOICE}: no zones`);
if (zones.some((a) => (a.loVel != null && a.loVel > 0) || (a.hiVel != null && a.hiVel < 127)))
  die(`${VOICE}: velocity-layered voice (single layer only)`);
if (new Set(zones.map((z) => z.rootMidi)).size !== zones.length) die(`${VOICE}: duplicate roots (layers?)`);
zones.sort((a, b) => a.rootMidi - b.rootMidi);

console.log(`rip-encode · ${VOICE} → ${ID} "${NAME}" · ${CODEC} ${CODEC === 'aac_at' && Q != null ? `vbr q${Q}` : CODEC === 'opus' ? BITRATE ?? '64k' : `cbr ${BITRATE ?? '80k mono / 112k stereo'}`} · budget ${BUDGET}`);
for (const z of zones) {
  z.root3 = String(z.rootMidi).padStart(3, '0');
  z.src = readWav(join(vdir, z.file));
  if (z.src.length === 1) z.src.push(z.src[0]);
  z.corr = correlation(z.src);
}
rmSync(join(OUT, ID), { recursive: true, force: true });
mkdirSync(join(OUT, ID), { recursive: true });

const mono = zones.every((z) => z.corr >= MONO_CORR);
const worst = zones.reduce((a, b) => (b.corr < a.corr ? b : a));
console.log(`  channels: ${mono ? 'MONO (L+R)/2' : 'STEREO'} — lowest L/R correlation ${worst.corr.toFixed(4)} @ root ${worst.rootMidi} (mono needs ≥ ${MONO_CORR} on every zone)`);
for (const z of zones) z.enc = encode(z, mono);

// budget: drop from the extremes, lowest then highest, while the core stays covered (zones encode independently)
let kept = zones.slice(), low = true, total = kept.reduce((s, z) => s + z.enc.bytes, 0);
const dropped = [];
while (total > BUDGET) {
  const lo = kept[0], hi = kept.at(-1);
  const drop = (low ? [lo, hi] : [hi, lo]).find((c) => kept.length > 1 && covered(kept.filter((z) => z !== c).map((z) => z.rootMidi)));
  if (!drop) die(`over budget (${total} > ${BUDGET}) and no extreme zone can drop without a > ${MAX_GAP} st gap in ${CORE.join('..')}`);
  rmSync(drop.enc.dst, { force: true });
  kept = kept.filter((z) => z !== drop); dropped.push(drop.rootMidi);
  console.log(`  over budget (${total} B) → drop root ${drop.rootMidi} (${drop.enc.bytes} B)`);
  total -= drop.enc.bytes; low = drop !== lo;
}

// key ranges: the kept roots tile 0..127 by nearest root (a tie goes to the lower root)
const rip = kept.map((z, i) => ({
  file: `${ID}/${z.root3}.${CODECS[CODEC].ext}`,
  rootMidi: z.rootMidi,
  loKey: i === 0 ? 0 : Math.floor((kept[i - 1].rootMidi + z.rootMidi) / 2) + 1,
  hiKey: i === kept.length - 1 ? 127 : Math.floor((z.rootMidi + kept[i + 1].rootMidi) / 2),
  gain: z.gain, mode: z.mode,
  loopStart: z.enc.ls, loopEnd: z.enc.le, frames: z.enc.frames, onset: z.enc.onset,
}));
const channels = kept[0].enc.ch;
const head = { id: ID, name: NAME, role: 'keys', sr: SR, channels, bytes: total, zones: [] };
const json = JSON.stringify(head).replace('"zones":[]', `"zones":[\n${rip.map((z) => JSON.stringify(z)).join(',\n')}\n]`) + '\n';
writeFileSync(join(OUT, `${ID}.json`), json);
rmSync(SCRATCH, { recursive: true, force: true });

console.log('  root mode     frames  loop(s)        L/R    onset  bytes   kbps  notes');
for (const z of kept) {
  const e = z.enc, secs = e.frames / SR;
  const notes = [e.fadedIn && 'fade-in', e.clampedEnd && 'loopEnd clamped to file end', e.onset < 0 && 'NO ONSET > 0.02'].filter(Boolean).join(', ');
  console.log(`  ${String(z.rootMidi).padStart(4)} ${z.mode.padEnd(7)} ${String(e.frames).padStart(8)}  ${(e.ls / SR).toFixed(3)}–${(e.le / SR).toFixed(3)}  ${z.corr.toFixed(4)} ${String(e.onset).padStart(7)} ${String(e.bytes).padStart(6)} ${(e.bytes * 8 / secs / 1000).toFixed(0).padStart(5)}  ${notes}`);
}
console.log(`  dropped: ${dropped.length ? dropped.join(', ') : 'none'} · kept ${kept.length}/${zones.length} zones · ${channels === 1 ? 'mono' : 'stereo'} · ${total} B (${(total / 1e6).toFixed(3)} MB) of ${BUDGET}${cbrFallback ? ' · VBR refused, CBR fallback' : ''}`);
const show = (p) => (relative(REPO, p).startsWith('..') ? p : relative(REPO, p));
console.log(`  out: ${show(OUT)}  manifest: ${show(join(OUT, `${ID}.json`))}`);
