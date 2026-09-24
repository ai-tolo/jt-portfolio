#!/usr/bin/env node
// THE ROOMS · encode the keys REV ladder (docs/signal-map/E-effects-out.md §4.3) from the printed Valhalla captures in
// ~/SignalLibrary/ir/*.wav into four stereo AAC-LC 96 kbps .m4a at 24 kHz + ir.json ({slot, url, seconds, onsetMs,
// bytes}[], the contract's IrAsset) under public/s/59e8a3b3/ir/. src/signal/ir.ts fetches and mounts them.
//
//   node scripts/signal/ir-encode.mjs [--out public/s/59e8a3b3/ir] [--src ~/SignalLibrary/ir] [--ird <ir-default.ts>]
//
// THE RECIPE, per room (the Studio bundle's, recovered from ir-default.ts; see the notes at each step):
//   1. the print as it is: the WAVs already carry the set gain (set_gain_linear 9.5641, +19.6 dB) — the sidecar's peak
//      must equal the file's, so nothing is re-gained here ("as printed");
//   2. cut from sample 0 (the onset kept) at SM 0.45 · MED 1.10 · HALL 2.20 s (the bundle's cuts of vvv_room_small /
//      vvv_chamber_medium / vvv_concerthall_large) · VAST 4.0 s of vvv_cathedral_vast (EDC −36 dB there, the depth the
//      bundle accepted for HALL);
//   3. 2:1 to 24 kHz through a zero-phase 255-tap Blackman sinc (cutoff 11.6 kHz): ird's E-gain within ±0.03 dB;
//   4. the bundle's 120 ms exponential taper over the last 2880 frames, reaching exactly zero:
//      g(u) = (e^(−6u) − e^(−6)) / (1 − e^(−6)), u = 0..1 (fitted to ird's own tail: ±0.02 at every 4 ms window);
//   5. s16 → ffmpeg aac_at, CBR 96 kbps, 24 kHz stereo, +faststart (mono is rejected: L/R correlation ≈ 0 is the width);
//   6. decode it back with ffmpeg (edit list honoured) and MEASURE: E-gain at 48 k = 10·log10(2·Σx²) per channel over
//      the stored length (24 k → 48 k doubles Σx²), checked against ir-default.ts's (+13.7 / +13.4 / +17.0 dB): the
//      mean of L/R must sit within ±0.15 dB (the codec's own energy wander between two encodes of the same input is
//      ~0.1 dB, so a smaller trim would chase noise); a room outside it is trimmed by the difference and re-encoded
//      once (the trim is printed; at 96 k none is needed). onsetMs = the decoded file's first sample above peak·1e-2
//      (ir.ts shifts a browser's decode onto it).
// Scratch WAVs go to $IR_SCRATCH (default the OS temp dir), prefixed ir-enc-. Exit 1 on any failed check.
import { readFileSync, writeFileSync, mkdirSync, statSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const FFMPEG = existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SR_IN = 48000, SR_OUT = 24000;
const TAPER_SEC = 0.12, TAPER_K = 6;
const FIR_TAPS = 255, FIR_FC = 11600;
const BITRATE = '96k';
const ONSET_RATIO = 1e-2;
const MATCH_DB = 0.15;                    // |decoded E-gain − ird's| above this → one trim + re-encode
const BUDGET = 130_000;                   // bytes, all four
const ROOMS = [
  { slot: 'sm', wav: 'vvv_room_small', sec: 0.45, ird: 'room' },
  { slot: 'med', wav: 'vvv_chamber_medium', sec: 1.10, ird: 'chamber' },
  { slot: 'hall', wav: 'vvv_concerthall_large', sec: 2.20, ird: 'hall' },
  { slot: 'vast', wav: 'vvv_cathedral_vast', sec: 4.0, ird: null },
];
// ir-default.ts's E-gain at 48 k per channel (dB), measured 2026-09-23 from its base64 PCM (the 24 k energy × 2);
// --ird recomputes them from the file.
const IRD_EGAIN = { room: [13.707, 13.722], chamber: [13.452, 13.396], hall: [16.974, 17.011] };

// ─── args
const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) die(`unexpected argument ${argv[i]}`);
  opt[argv[i].slice(2)] = argv[i + 1]; i++;
}
const OUT = resolve(REPO, opt.out ?? 'public/s/59e8a3b3/ir');
const SRC = resolve((opt.src ?? join(homedir(), 'SignalLibrary/ir')).replace(/^~(?=\/)/, homedir()));
const SCRATCH = mkdtempSync(join(process.env.IR_SCRATCH || tmpdir(), 'ir-enc-'));
function die(msg) { console.error(`ir-encode: ${msg}`); process.exit(1); }
const PUBLIC = join(REPO, 'public');
if (!OUT.startsWith(PUBLIC + '/')) die(`--out must live under public/ (got ${OUT})`);
const URL_DIR = '/' + relative(PUBLIC, OUT).split('\\').join('/');

// ─── WAV in: RIFF walk, 24-bit PCM LE → Float64 per channel
function readWav(path) {
  const b = readFileSync(path);
  if (b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WAVE') die(`${path}: not RIFF/WAVE`);
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('latin1', p, p + 4), size = b.readUInt32LE(p + 4), body = p + 8;
    if (id === 'fmt ') {
      fmt = { tag: b.readUInt16LE(body), ch: b.readUInt16LE(body + 2), sr: b.readUInt32LE(body + 4), bits: b.readUInt16LE(body + 14) };
      if (fmt.tag === 0xfffe && size >= 26) fmt.tag = b.readUInt16LE(body + 24);
    } else if (id === 'data') data = { at: body, size: Math.min(size, b.length - body) };
    p = body + size + (size & 1);
  }
  if (!fmt || !data) die(`${path}: no fmt/data chunk`);
  if (fmt.tag !== 1 || fmt.bits !== 24 || fmt.sr !== SR_IN || fmt.ch !== 2) die(`${path}: want 24-bit stereo PCM @ ${SR_IN}, got tag ${fmt.tag} ${fmt.bits}-bit ${fmt.ch} ch @ ${fmt.sr}`);
  const n = Math.floor(data.size / 6), chans = [new Float64Array(n), new Float64Array(n)];
  for (let i = 0, q = data.at; i < n; i++) for (let c = 0; c < 2; c++, q += 3)
    chans[c][i] = (((b[q] | (b[q + 1] << 8) | (b[q + 2] << 16)) << 8) >> 8) / 8388608;
  return chans;
}

// ─── WAV out: 16-bit PCM stereo (aac_at takes s16; quantised once, here, rounded)
function writeWav16(path, chans, sr) {
  const n = chans[0].length, C = chans.length, bytes = n * C * 2, b = Buffer.alloc(44 + bytes);
  b.write('RIFF', 0, 'latin1'); b.writeUInt32LE(36 + bytes, 4); b.write('WAVE', 8, 'latin1'); b.write('fmt ', 12, 'latin1');
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(C, 22); b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * C * 2, 28); b.writeUInt16LE(C * 2, 32); b.writeUInt16LE(16, 34); b.write('data', 36, 'latin1'); b.writeUInt32LE(bytes, 40);
  let clipped = 0;
  for (let i = 0, p = 44; i < n; i++) for (let c = 0; c < C; c++, p += 2) {
    let v = Math.round(chans[c][i] * 32768);
    if (v > 32767 || v < -32768) { clipped++; v = Math.max(-32768, Math.min(32767, v)); }
    b.writeInt16LE(v, p);
  }
  writeFileSync(path, b);
  return clipped;
}

// ─── 2:1, zero phase: y[i] = Σ h[k]·x[2i + k − M]
function decimate(x, n24) {
  const N = FIR_TAPS, M = (N - 1) / 2, fc = FIR_FC / SR_IN, h = new Float64Array(N);
  let hs = 0;
  for (let k = 0; k < N; k++) {
    const m = k - M;
    const s = m === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * m) / (Math.PI * m);
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * k) / (N - 1)) + 0.08 * Math.cos((4 * Math.PI * k) / (N - 1));
    h[k] = s * w; hs += h[k];
  }
  for (let k = 0; k < N; k++) h[k] /= hs;                       // unity DC
  const y = new Float64Array(n24);
  for (let i = 0; i < n24; i++) {
    let a = 0;
    const c = 2 * i;
    for (let k = 0; k < N; k++) { const j = c + k - M; if (j >= 0 && j < x.length) a += h[k] * x[j]; }
    y[i] = a;
  }
  return y;
}

function taper(y, sr) {
  const T = Math.round(TAPER_SEC * sr), n = y.length, e = Math.exp(-TAPER_K);
  for (let j = 0; j < T; j++) { const u = j / (T - 1); y[n - T + j] *= (Math.exp(-TAPER_K * u) - e) / (1 - e); }
  return y;
}

// ─── measurements
const egainDb = (x, n, up) => { let s = 0; for (let i = 0; i < Math.min(n, x.length); i++) s += x[i] * x[i]; return 10 * Math.log10(s * up); };
function onsetIndex(chans) {
  let peak = 0;
  for (const x of chans) for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  const th = peak * ONSET_RATIO;
  for (let i = 0; i < chans[0].length; i++) for (const x of chans) if (Math.abs(x[i]) > th) return { i, peak };
  return { i: 0, peak };
}
function edcAt(chans, sr, db) {
  const n = chans[0].length, E = new Float64Array(n + 1);
  for (let i = n - 1; i >= 0; i--) E[i] = E[i + 1] + chans[0][i] ** 2 + chans[1][i] ** 2;
  for (let i = 0; i < n; i++) if (10 * Math.log10(E[i] / E[0]) <= db) return i / sr;
  return n / sr;
}
function corrLR(chans, n) {
  let lr = 0, ll = 0, rr = 0;
  for (let i = 0; i < n; i++) { lr += chans[0][i] * chans[1][i]; ll += chans[0][i] ** 2; rr += chans[1][i] ** 2; }
  return lr / Math.sqrt(ll * rr);
}
/** the lag (samples) at which the decode best matches the source, over the first 100 ms */
function lagOf(src, dec) {
  let best = -Infinity, at = 0;
  const n = Math.min(2400, src.length);
  for (let lag = -64; lag <= 64; lag++) {
    let s = 0;
    for (let i = 0; i < n; i++) { const j = i + lag; if (j >= 0 && j < dec.length) s += src[i] * dec[j]; }
    if (s > best) { best = s; at = lag; }
  }
  return at;
}

function decodeM4a(path) {
  const raw = execFileSync(FFMPEG, ['-v', 'error', '-i', path, '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '2', '-ar', String(SR_OUT), '-'],
    { maxBuffer: 256 * 1024 * 1024 });
  const f = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4), n = f.length / 2;
  const L = new Float64Array(n), R = new Float64Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return [L, R];
}

function encode(wavPath, m4aPath) {
  execFileSync(FFMPEG, ['-v', 'error', '-y', '-i', wavPath, '-c:a', 'aac_at', '-aac_at_mode', 'cbr', '-b:a', BITRATE,
    '-ar', String(SR_OUT), '-ac', '2', '-movflags', '+faststart', m4aPath]);
}

// ird's E-gains, recomputed when asked
function irdEgains(path) {
  const src = readFileSync(path, 'utf8');
  const re = /id: "(\w+)",[^\n]*storedRate: (\d+), channels: (\d+), seconds: ([\d.]+),\s*\n\s*pcm16: "([A-Za-z0-9+/=]+)"/g;
  const out = {};
  let m;
  while ((m = re.exec(src))) {
    const bin = Buffer.from(m[5], 'base64'), C = +m[3], frames = bin.length / (2 * C), e = new Array(C).fill(0);
    for (let i = 0, p = 0; i < frames; i++) for (let c = 0; c < C; c++, p += 2) e[c] += (bin.readInt16LE(p) / 32768) ** 2;
    out[m[1]] = e.map((s) => 10 * Math.log10(s * (48000 / +m[2])));
  }
  return out;
}
const IRD = opt.ird ? irdEgains(resolve(opt.ird.replace(/^~(?=\/)/, homedir()))) : IRD_EGAIN;

// ─── the run
mkdirSync(OUT, { recursive: true });
const manifest = [], log = [];
let failed = false;
const fail = (msg) => { failed = true; console.error(`  FAIL ${msg}`); };
try {
  for (const room of ROOMS) {
    const wavPath = join(SRC, `${room.wav}.wav`);
    const side = JSON.parse(readFileSync(join(SRC, `${room.wav}.json`), 'utf8'));
    const [L48, R48] = readWav(wavPath);
    let pk = 0;
    for (let i = 0; i < L48.length; i++) pk = Math.max(pk, Math.abs(L48[i]), Math.abs(R48[i]));
    // 1. as printed: the file IS the sidecar's print (its peak), at the set gain the sidecar records
    if (Math.abs(pk - side.peak) > 2e-4) fail(`${room.wav}: file peak ${pk.toFixed(5)} ≠ sidecar ${side.peak.toFixed(5)} (not the print?)`);
    if (Math.abs(side.set_gain_linear - 9.5641109422886) > 1e-6) fail(`${room.wav}: set gain ${side.set_gain_linear} ≠ 9.5641`);
    // 2-4. cut, decimate, taper (the decimator reads past the cut; the taper ends it at exact zero)
    const n24 = Math.round(room.sec * SR_OUT);
    const src = [taper(decimate(L48, n24), SR_OUT), taper(decimate(R48, n24), SR_OUT)];
    const srcGain = src.map((x) => egainDb(x, n24, 2));
    let trimDb = 0, dec = null, m4a = join(OUT, `${room.slot}.m4a`), gains = null, attempt = 0;
    for (;;) {
      const g = 10 ** (trimDb / 20);
      const wav = join(SCRATCH, `ir-enc-${room.slot}.wav`);
      const clipped = writeWav16(wav, src.map((x) => x.map((v) => v * g)), SR_OUT);
      if (clipped) fail(`${room.slot}: ${clipped} samples clipped at s16`);
      encode(wav, m4a);
      dec = decodeM4a(m4a);
      gains = dec.map((x) => egainDb(x, n24, 2));
      const ref = room.ird ? IRD[room.ird] : null;
      if (!ref || attempt > 0) break;
      const d = (gains[0] + gains[1]) / 2 - (ref[0] + ref[1]) / 2;
      if (Math.abs(d) <= MATCH_DB) break;
      trimDb = -d; attempt++;
    }
    const decN = dec[0].length;
    if (decN < n24) fail(`${room.slot}: decoded ${decN} frames < the stored ${n24}`);
    const cut = dec.map((x) => x.subarray(0, n24));
    const on = onsetIndex(cut), srcOn = onsetIndex(src);
    const lag = lagOf(src[0], dec[0]);
    if (lag !== 0) fail(`${room.slot}: the decode lags the source by ${lag} samples (priming not trimmed?)`);
    const bytes = statSync(m4a).size;
    const ref = room.ird ? IRD[room.ird] : null;
    const onsetMs = Math.round((on.i / SR_OUT) * 1000 * 1000) / 1000;
    manifest.push({ slot: room.slot, url: `${URL_DIR}/${room.slot}.m4a`, seconds: room.sec, onsetMs, bytes });
    const row = {
      slot: room.slot, from: `${room.wav} @ ${room.sec}s`, bytes,
      egain48: gains.map((v) => +v.toFixed(2)), ird48: ref ? ref.map((v) => +v.toFixed(2)) : null,
      d_dB: ref ? +(((gains[0] + gains[1]) - (ref[0] + ref[1])) / 2).toFixed(3) : null,
      trim_dB: +trimDb.toFixed(3), src48: srcGain.map((v) => +v.toFixed(2)),
      onsetMs, srcOnsetMs: +((srcOn.i / SR_OUT) * 1000).toFixed(3), lag, decodedFrames: decN, storedFrames: n24,
      peak: +on.peak.toFixed(4), corrLR: +corrLR(cut, n24).toFixed(3),
      edc20: +edcAt(cut, SR_OUT, -20).toFixed(3), edc40: +edcAt(cut, SR_OUT, -40).toFixed(3),
      srcEdc20: +edcAt(src, SR_OUT, -20).toFixed(3), srcEdc40: +edcAt(src, SR_OUT, -40).toFixed(3),
    };
    if (ref && Math.abs(row.d_dB) > MATCH_DB) fail(`${room.slot}: E-gain ${row.d_dB} dB off ir-default.ts (gate ±${MATCH_DB})`);
    log.push(row);
  }
  const total = manifest.reduce((s, m) => s + m.bytes, 0);
  if (total > BUDGET) fail(`total ${total} B > ${BUDGET} B`);
  writeFileSync(join(OUT, 'ir.json'), '[\n' + manifest.map((m) => '  ' + JSON.stringify(m)).join(',\n') + '\n]\n');
  console.log(`ir-encode → ${relative(REPO, OUT)}/ (aac_at CBR ${BITRATE}, ${SR_OUT} Hz stereo, faststart)`);
  console.log('slot  bytes   E-gain@48k L/R (dB)   ird L/R        Δ dB    trim   onset ms (src)   lag  frames dec/stored  corrLR  EDC −20/−40 s (src)');
  for (const r of log) {
    console.log(`${r.slot.padEnd(5)} ${String(r.bytes).padStart(6)}  ${r.egain48.map((v) => v.toFixed(2)).join(' / ').padEnd(20)} `
      + `${(r.ird48 ? r.ird48.map((v) => v.toFixed(2)).join(' / ') : '—').padEnd(14)} ${(r.d_dB == null ? '—' : (r.d_dB >= 0 ? '+' : '') + r.d_dB.toFixed(3)).padStart(7)} `
      + `${r.trim_dB.toFixed(3).padStart(6)}   ${r.onsetMs.toFixed(3).padStart(7)} (${r.srcOnsetMs.toFixed(3)})   ${String(r.lag).padStart(3)}  `
      + `${r.decodedFrames}/${r.storedFrames}`.padEnd(19) + ` ${r.corrLR.toFixed(3).padStart(6)}  ${r.edc20.toFixed(3)}/${r.edc40.toFixed(3)} (${r.srcEdc20.toFixed(3)}/${r.srcEdc40.toFixed(3)})`);
  }
  console.log(`total ${total} B (${(total / 1000).toFixed(1)} KB, budget ${BUDGET / 1000} KB) · ir.json ${statSync(join(OUT, 'ir.json')).size} B`);
} finally {
  try { rmSync(SCRATCH, { recursive: true, force: true }); } catch { /* scratch */ }
}
if (failed) { console.error('ir-encode: FAILED'); process.exit(1); }
