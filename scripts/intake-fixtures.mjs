#!/usr/bin/env node
// intake-fixtures · Stream A's parser gate (2026-10-05). The twelve memos in src/data/intake-fixtures.json through a
// parser, N runs, every fate compared: the verdict words lit, the ticket kinds (order-free), how many execute.
//   node scripts/intake-fixtures.mjs                                  → the local parser (src/lib/intake-local.ts)
//   node scripts/intake-fixtures.mjs --endpoint http://localhost:4637/api/intake [--runs 2]   → the Claude endpoint
// Prints one row per memo per run and `fixtures: N/N`; exit 0 only when every row passes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const ENDPOINT = arg('endpoint', null);
const RUNS = Number(arg('runs', ENDPOINT ? 2 : 1));
const file = fileURLToPath(new URL('../src/data/intake-fixtures.json', import.meta.url));
const { fixtures } = JSON.parse(readFileSync(file, 'utf8'));
const { localParse } = await import('../src/lib/intake-local.ts');

async function parse(text) {
  if (!ENDPOINT) return localParse(text);
  const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json', origin: new URL(ENDPOINT).origin }, body: JSON.stringify({ text }) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || j.fallback) throw new Error(`HTTP ${r.status} ${j?.error ?? ''}`.trim());
  return j;
}
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

let n = 0, ok = 0;
for (let run = 1; run <= RUNS; run++) {
  for (const f of fixtures) {
    n++;
    let r, why = '';
    try { r = await parse(f.text); } catch (e) { why = String(e.message || e); }
    if (r) {
      const kinds = r.tickets.map((t) => t.kind);
      const exec = r.tickets.filter((t) => t.execute).length;
      const probs = [];
      if (!same(r.verdicts, f.expect.verdicts)) probs.push(`verdicts ${r.verdicts.join('+')} ≠ ${f.expect.verdicts.join('+')}`);
      if (!same(kinds, f.expect.kinds)) probs.push(`kinds ${kinds.join(',') || '∅'} ≠ ${f.expect.kinds.join(',') || '∅'}`);
      if (exec !== f.expect.execute) probs.push(`execute ${exec} ≠ ${f.expect.execute}`);
      if (f.expect.minItems && r.tickets[0] && r.tickets[0].items.length < f.expect.minItems) probs.push(`items ${r.tickets[0].items.length} < ${f.expect.minItems}`);
      why = probs.join('; ');
    }
    const pass = r && !why;
    if (pass) ok++;
    const titles = r ? r.tickets.map((t) => `${t.kind}${t.execute ? '!' : ''} “${t.title}”${t.when ? ` @${t.when}` : ''}`).join(' · ') : '';
    console.log(`${pass ? 'PASS' : 'FAIL'}  run ${run}  ${f.id.padEnd(18)} ${pass ? titles : why}${pass ? '' : titles ? `  [${titles}]` : ''}`);
  }
}
console.log(`fixtures: ${ok}/${n}${ENDPOINT ? ' (endpoint)' : ' (local)'}`);
process.exit(ok === n ? 0 : 1);
