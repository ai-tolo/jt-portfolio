// eq-response.test.mjs — lane V1: the verbatim EQ curve port (eq-response.ts + filter-curve.ts's re-exports) in node.
// run: source ~/.nvm/nvm.sh && node src/signal/view/eq-response.test.mjs   (exit 0 = green; prints `eq-response: N/N`)
// The maths is pure; the one browser object (OfflineAudioContext) is a counting fake with a flat response. A drift guard
// compares every ported line with the Studio's source when that tree is on this machine (skipped, not failed, when not).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// a counting OfflineAudioContext: the port must create exactly ONE, as (1, 128, 48000), lazily at the first draw
const made = [];
globalThis.OfflineAudioContext = class {
  constructor(...a) { made.push(a); }
  createBiquadFilter() {
    return { type: 'lowpass', frequency: { value: 350 }, Q: { value: 1 }, getFrequencyResponse(f, mag, ph) { mag.fill(1); ph.fill(0); } };
  }
};
const eq = await import('./eq-response.ts');
const fc = await import('./filter-curve.ts');

let pass = 0, total = 0; const fails = [];
const t = (name, fn) => { total++; try { fn(); pass++; } catch (e) { fails.push(`✗ ${name}: ${e.message}`); } };
const is = (a, b, m = '') => { if (a !== b) throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const near = (a, b, eps = 1e-9, m = '') => { if (!(Math.abs(a - b) <= eps)) throw new Error(`${m} expected ${b}, got ${a}`); };

// ── the dsp leaves (copied from dsp.ts) ──
t('xToF: 0 → 20 Hz, 1 → 20 kHz, clamped outside', () => { near(eq.xToF(0), 20); near(eq.xToF(1), 20000, 1e-6); near(eq.xToF(-1), 20); near(eq.xToF(2), 20000, 1e-6); });
t('xToF is log: .5 → 632.46 Hz (the geometric mean)', () => near(eq.xToF(0.5), Math.sqrt(20 * 20000), 1e-6));
t('fToX inverts xToF across the axis', () => { for (let x = 0; x <= 1.0001; x += 0.05) near(eq.fToX(eq.xToF(x)), Math.min(1, x), 1e-9, `x=${x}`); });
t('fToX clamps below 20 Hz and above 20 kHz', () => { is(eq.fToX(5), 0); near(eq.fToX(40000), 1, 1e-12); });
t('nodeQ: 0 dB → −3.01 (Butterworth flat)', () => near(eq.nodeQ(0), -3.01));
t('nodeQ: |dB| ≥ 3 → 2 × the node dB (the EQ8 margin)', () => { near(eq.nodeQ(6), 12); near(eq.nodeQ(-6), -12); near(eq.nodeQ(18), 36); near(eq.nodeQ(-24), -48); near(eq.nodeQ(3), 6); });
t('nodeDbFromQ inverts nodeQ over the glass range −24..+18', () => { for (let db = -24; db <= 18; db += 0.5) near(eq.nodeDbFromQ(eq.nodeQ(db)), db, 2e-3, `db=${db}`); });
t('filter-curve re-exports the same four leaves', () => { is(fc.xToF, eq.xToF); is(fc.fToX, eq.fToX); is(fc.nodeQ, eq.nodeQ); is(fc.nodeDbFromQ, eq.nodeDbFromQ); });

// ── the response law ──
t('dbToY: 0 dB sits at 75 of 200 (the dashed zero line), +18 at the top, −30 at the floor', () => { near(eq.dbToY(0, 200), 75); near(eq.dbToY(18, 200), 0); near(eq.dbToY(-30, 200), 200); });
t('48 dB per glass height (EQ_DB_TOP − EQ_DB_BOT)', () => is(eq.EQ_DB_TOP - eq.EQ_DB_BOT, 48));
const P = (o = {}) => ({ hpX: 0, hpRes: -3.01, hpSlope: 1, lpX: 1, lpRes: -3.01, slope: 1, ...o });
t('eqSpec: both nodes parked open → no filter at all (a dead-flat curve)', () => is(eq.eqSpec(P()).length, 0));
t('eqSpec: the low-cut engages past x .006 (4 high-pass poles)', () => { is(eq.eqSpec(P({ hpX: 0.006 })).length, 0); const s = eq.eqSpec(P({ hpX: 0.3 })); is(s.length, 4); is(s.every((b) => b.type === 'highpass'), true); });
t('eqSpec: the high-cut engages below x .994 (4 low-pass poles)', () => { is(eq.eqSpec(P({ lpX: 0.995 })).length, 0); const s = eq.eqSpec(P({ lpX: 0.5 })); is(s.length, 4); is(s.every((b) => b.type === 'lowpass'), true); });
t('eqSpec: the primary pole carries the node Q, the slope poles ride flat (−3.01)', () => {
  const s = eq.eqSpec(P({ hpX: 0.3, hpRes: eq.nodeQ(6), lpX: 0.6, lpRes: eq.nodeQ(-6) }));
  near(s[0].q, 12); near(s[4].q, -12); for (const i of [1, 2, 3, 5, 6, 7]) near(s[i].q, -3.01);
});
t('eqSpec: slope 1 stacks every pole on the corner; slope 0 parks them at the band edges (20 Hz / 20 kHz)', () => {
  const steep = eq.eqSpec(P({ hpX: 0.3, lpX: 0.5, slope: 1, hpSlope: 1 }));
  for (const b of steep) near(b.freq, b.type === 'highpass' ? eq.xToF(0.3) : eq.xToF(0.5), 1e-6);
  const soft = eq.eqSpec(P({ hpX: 0.3, lpX: 0.5, slope: 0, hpSlope: 0 }));
  for (const i of [1, 2, 3]) near(soft[i].freq, 20, 1e-9); for (const i of [5, 6, 7]) near(soft[i].freq, 20000, 1e-6);
});

t('hpCascadeCorner: an open low-cut (x ≤ .02) collapses every slope pole to 10 Hz', () => { for (let i = 0; i < 3; i++) near(eq.eqSpec(P({ hpX: 0.015 }))[i + 1].freq, 10, 1e-9); });

// ── the path + the one context ──
t('no OfflineAudioContext exists before the first draw', () => is(made.length, 0));
t('eqPath: 129 points over the viewBox; a flat response draws the zero line (y 75)', () => {
  const d = eq.eqPath(600, 200, P({ hpX: 0.3, lpX: 0.6 }));
  const pts = d.match(/[ML][\d.]+ [\d.]+/g);
  is(pts.length, 129); is(pts[0], 'M0.0 75.0'); is(pts[128], 'L600.0 75.0');
});
t('the first draw made exactly ONE OfflineAudioContext(1, 128, 48000)', () => { is(made.length, 1); is(JSON.stringify(made[0]), '[1,128,48000]'); });
t('later draws reuse it (and the biquad pool)', () => { eq.eqPath(600, 200, P({ hpX: 0.5, lpX: 0.7 })); eq.nodeY(0.5, P({ hpX: 0.5 }), 200); is(made.length, 1); });
t('nodeY clamps into the box', () => near(eq.nodeY(0.4, P(), 200), 75));

// ── the drift guard: every ported line equals the Studio's, when the Studio tree is here ──
const STUDIO = '/Users/tolo/sites/signal-studio-v6lib/src';
const here = (f) => readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8').split('\n');
if (existsSync(`${STUDIO}/views/instrument/eq-response.ts`)) {
  const src = readFileSync(`${STUDIO}/views/instrument/eq-response.ts`, 'utf8').split('\n');
  const dsp = readFileSync(`${STUDIO}/engine/dsp.ts`, 'utf8').split('\n');
  const fcs = readFileSync(`${STUDIO}/views/instrument/filter-curve.ts`, 'utf8').split('\n');
  const mine = here('./eq-response.ts'), mineFc = here('./filter-curve.ts');
  t('drift: eq-response.ts lines 1-6 + 8-96 are the Studio\'s, in order, verbatim', () => {
    const want = [...src.slice(0, 6), ...src.slice(7)];
    let j = 0;
    for (const line of mine) if (j < want.length && line === want[j]) j++;
    is(j, want.length, 'matched lines');
  });
  t('drift: the dsp leaves are dsp.ts:7, 173-178, 190-208, 215-220 minus `export`', () => {
    const want = [7, ...Array.from({ length: 6 }, (_, i) => 173 + i), ...Array.from({ length: 19 }, (_, i) => 190 + i), ...Array.from({ length: 6 }, (_, i) => 215 + i)]
      .map((n) => dsp[n - 1].replace('export const ', 'const '));
    let j = 0;
    for (const line of mine) if (j < want.length && line === want[j]) j++;
    is(j, want.length, 'matched dsp lines');
  });
  t('drift: filter-curve.ts is the Studio\'s 117 lines, only the two specifiers gaining .ts', () => {
    const body = mineFc.slice(mineFc.length - fcs.length);
    for (let i = 0; i < fcs.length; i++) {
      const w = i === 6 || i === 9 ? fcs[i].replace("'./eq-response'", "'./eq-response.ts'") : fcs[i];
      if (body[i] !== w) throw new Error(`line ${i + 1}: ${JSON.stringify(body[i])} ≠ ${JSON.stringify(w)}`);
    }
  });
} else {
  console.log('eq-response: drift guard skipped (no Studio tree at ' + STUDIO + ')');
}

for (const f of fails) console.log(f);
console.log(`eq-response: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
