// take.test.mjs — the export round (2026-09-30): the take's pure parts in node.
//   §1 packChunk: float → 16-bit, the peak · §2 trimBounds: silence either side falls away, air kept · §3 wavHeader: a
//   RIFF/WAVE header the byte sizes agree on · §4 wavOf on a run of chunks: the blob's size = 44 + the run's bytes
//   node src/signal/take.test.mjs   (exit 0 = green; prints `take: N/N`)
import { packChunk, trimBounds, wavHeader, wavOf, TAKE_CHUNK, TAKE_PAD_S, TAKE_TAIL_S } from './take.ts';

let n = 0, ok = 0;
const t = (name, cond) => { n++; if (cond) ok++; else console.log('  ✗', name); };
const SR = 48000;
const silent = () => packChunk(new Float32Array(TAKE_CHUNK), new Float32Array(TAKE_CHUNK));
const loud = (v = 0.5) => packChunk(new Float32Array(TAKE_CHUNK).fill(v), new Float32Array(TAKE_CHUNK).fill(-v));

// §1
{
  const c = packChunk(new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2]), new Float32Array([0, 0.25, 0, 0, 0, 0, 0]));
  t('pack · n', c.n === 7);
  t('pack · interleaved L then R', c.pcm[0] === 0 && c.pcm[1] === 0 && c.pcm[2] === 16383 && c.pcm[3] === 8191);
  t('pack · full scale', c.pcm[6] === 32767 && c.pcm[8] === -32768);
  t('pack · clamped', c.pcm[10] === 32767 && c.pcm[12] === -32768);
  t('pack · peak', c.peak === 2);
  t('pack · silence has no peak', silent().peak === 0);
}
// §2
{
  const run = [];
  for (let i = 0; i < 20; i++) run.push(silent());
  run.push(loud()); run.push(loud()); run.push(loud());
  for (let i = 0; i < 20; i++) run.push(silent());
  const b = trimBounds(run, SR);
  const pad = Math.ceil((TAKE_PAD_S * SR) / TAKE_CHUNK), tail = Math.ceil((TAKE_TAIL_S * SR) / TAKE_CHUNK);
  t('trim · found', !!b);
  t('trim · starts pad before the first sound', b && b[0] === 20 - pad);
  t('trim · ends tail after the last sound', b && b[1] === 23 + tail);
  t('trim · all silence = null', trimBounds([silent(), silent()], SR) === null);
  t('trim · clamped at the front', trimBounds([loud(), silent()], SR)[0] === 0);
  t('trim · clamped at the back', trimBounds([silent(), loud()], SR)[1] === 2);
  t('trim · under the floor is silence', trimBounds([packChunk(new Float32Array(TAKE_CHUNK).fill(0.001), new Float32Array(TAKE_CHUNK))], SR) === null);
}
// §3
{
  const h = wavHeader(1000, SR);
  const v = new DataView(h);
  const s = (o, k) => String.fromCharCode(...new Uint8Array(h, o, k));
  t('wav · RIFF/WAVE/fmt /data', s(0, 4) === 'RIFF' && s(8, 4) === 'WAVE' && s(12, 4) === 'fmt ' && s(36, 4) === 'data');
  t('wav · sizes', v.getUint32(4, true) === 36 + 4000 && v.getUint32(40, true) === 4000);
  t('wav · pcm 16-bit stereo at the rate', v.getUint16(20, true) === 1 && v.getUint16(22, true) === 2 && v.getUint32(24, true) === SR && v.getUint16(34, true) === 16);
  t('wav · byte rate + block align', v.getUint32(28, true) === SR * 4 && v.getUint16(32, true) === 4);
}
// §4
{
  const run = [silent(), silent(), loud(), loud(), silent(), silent(), silent(), silent(), silent(), silent(), silent()];
  const w = wavOf(run, SR);
  const b = trimBounds(run, SR);
  const frames = (b[1] - b[0]) * TAKE_CHUNK;
  t('wavOf · frames = the trimmed run', w && w.frames === frames);
  t('wavOf · blob = header + the run', w && w.blob.size === 44 + frames * 4);
  t('wavOf · type', w && w.blob.type === 'audio/wav');
  t('wavOf · silence = null', wavOf([silent()], SR) === null);
}
console.log(`take: ${ok}/${n}`);
process.exit(ok === n ? 0 : 1);
