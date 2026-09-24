// SIGNAL · R2 lane A · THE KIT AS FILES. The house kit's six AAC-LC one-shots leave the bundle: this reads the six
// base64 lanes of src/components/signal-drumkit.ts (the repo's own copy, byte-identical to
// signal-studio-v6lib/src/engine/signal-drumkit.ts) and writes each one's RAW BYTES (they already are MP4/M4A files:
// bytes 4..8 = "ftyp", brand M4A) as public/s/59e8a3b3/kit/<lane>.m4a, one file per DRUM_LANES lane through kit.ts's
// LANE_KIT_KEY (so the names here and the URLs kit.ts fetches come from one source). kit.ts fetches them at boot.
//
// The unlisted folder ships IMMUTABLE (CLAUDE.md): a file that exists with DIFFERENT bytes is never overwritten here;
// a changed kit goes to a new 8-hex folder. Identical bytes are left alone (the script is idempotent).
//   source ~/.nvm/nvm.sh && node scripts/signal/kit-extract.mjs            write the six files (or confirm them)
//   source ~/.nvm/nvm.sh && node scripts/signal/kit-extract.mjs --check    write nothing; exit 1 unless all six match
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DRUMKIT } from '../../src/components/signal-drumkit.ts';
import { DRUM_LANES, RIP_ROOT } from '../../src/signal/types.ts';
import { KIT_DIR, LANE_KIT_KEY } from '../../src/signal/kit.ts';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(REPO, 'public', RIP_ROOT.replace(/^\/+/, ''), KIT_DIR);
const check = process.argv.includes('--check');

let bad = 0, total = 0;
const rows = [];
if (!check) mkdirSync(OUT, { recursive: true });
for (const lane of DRUM_LANES) {
  const key = LANE_KIT_KEY[lane];
  const b64 = DRUMKIT[key];
  const file = join(OUT, `${lane}.m4a`);
  const rel = relative(REPO, file);
  if (typeof b64 !== 'string' || !b64.length) { bad++; rows.push(`  ✗ ${lane}: no DRUMKIT.${key}`); continue; }
  const bytes = Buffer.from(b64, 'base64');
  if (bytes.toString('latin1', 4, 8) !== 'ftyp') { bad++; rows.push(`  ✗ ${lane}: DRUMKIT.${key} is not an MP4 (no ftyp box)`); continue; }
  total += bytes.length;
  const brand = bytes.toString('latin1', 8, 12).trim();
  const have = existsSync(file) ? readFileSync(file) : null;
  if (have && have.equals(bytes)) { rows.push(`  ✓ ${rel}  ${bytes.length} B (${brand}) — already there, identical`); continue; }
  if (have) { bad++; rows.push(`  ✗ ${rel} exists with DIFFERENT bytes (${have.length} B vs ${bytes.length} B): /s/ ships immutable — a new kit needs a new 8-hex folder`); continue; }
  if (check) { bad++; rows.push(`  ✗ ${rel} missing`); continue; }
  writeFileSync(file, bytes);
  rows.push(`  ✓ ${rel}  ${bytes.length} B (${brand}) — written`);
}
console.log(`[kit-extract] ${check ? 'check' : 'write'} → ${relative(REPO, OUT)}/`);
for (const r of rows) console.log(r);
console.log(`kit-extract: ${DRUM_LANES.length - bad}/${DRUM_LANES.length} lanes · ${(total / 1024).toFixed(1)} KB`);
process.exit(bad ? 1 : 0);
