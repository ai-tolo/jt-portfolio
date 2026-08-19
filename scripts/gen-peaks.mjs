#!/usr/bin/env node
// Pre-render waveform peaks for the house Transport: decode via ffmpeg to
// mono 8kHz PCM, bucket to N min/max pairs, emit JSON to public/peaks/.
// Usage: node scripts/gen-peaks.mjs <audio-file...>   (peaks named by basename)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const N = 160; // buckets — enough for a clean small waveform
for (const file of process.argv.slice(2)) {
  const raw = execFileSync("ffmpeg", ["-i", file, "-ac", "1", "-ar", "8000", "-f", "s16le", "-v", "quiet", "-"], { maxBuffer: 1 << 28 });
  const samples = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 2));
  const dur = samples.length / 8000;
  const per = Math.floor(samples.length / N);
  const peaks = [];
  for (let i = 0; i < N; i++) {
    let max = 0;
    for (let j = i * per; j < (i + 1) * per; j++) {
      const v = Math.abs(samples[j]);
      if (v > max) max = v;
    }
    peaks.push(Math.round((max / 32768) * 100) / 100);
  }
  const base = path.basename(file).replace(/\.[a-z0-9]+$/i, "");
  const out = `public/peaks/${base}.json`;
  fs.writeFileSync(out, JSON.stringify({ duration: Math.round(dur * 10) / 10, peaks }));
  console.log(out, "dur", Math.round(dur * 10) / 10 + "s");
}
