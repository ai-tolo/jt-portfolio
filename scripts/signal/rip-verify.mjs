#!/usr/bin/env node
// THE RIPS gate · decode shipped rip manifests (scripts/signal/rip-encode.mjs) the way the page will, and check that
// the loop survived the codec: decoded length vs frames, the onset shift, and the loop seam. Builds nothing.
//
//   node scripts/signal/rip-verify.mjs [--root public] [--no-pw] public/s/<hex>/rhodes.json [more manifests…]
//
// Every manifest is measured in headless Chrome (CDP, muted, own profile under $RIP_SCRATCH/rip-chrome-<pid>);
// the FIRST one also in WebKit + Firefox through Playwright (one child each, 90 s, SIGKILL on a hang).
// Chrome, the server and every Playwright process this run started die in a finally and on SIGINT.
// WebKit: Playwright 1.63 drives the frozen macOS-14 build (2251), which rejects one page setting (PushAPIEnabled)
// and then can't close the page, so newPage() never resolves. This file doubles as a pipe shim that renames that
// one setting on the way in; the child never waits on close.
import http from 'node:http';
import { readFileSync, existsSync, statSync, rmSync, createReadStream, createWriteStream } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { join, resolve, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1', PORT = 4639, CDP_PORT = 9351, ORIGIN = `http://${HOST}:${PORT}`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PW = '/Users/tolo/studio-mocks/pw/node_modules/playwright/index.mjs';
const SELF = fileURLToPath(import.meta.url), REPO = resolve(dirname(SELF), '../..');
const PROFILE = join(process.env.RIP_SCRATCH || tmpdir(), `rip-chrome-${process.pid}`);
const SHIM = `--rip-shim-${process.pid}`;             // marks this run's WebKit shim in ps
const SHIFT_MAX = 2048, SEAM_MAX = -30, LEN_SLACK = 64, CHILD_MS = 90_000, CHROME_MS = 120_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, what) => Promise.race([p, sleep(ms).then(() => { throw new Error(`${what}: no answer in ${ms / 1000}s`); })]);

// ─── in page (stringified; must stay self-contained): fetch → one AudioContext @ 48 k → decodeAudioData → measure
async function measure(url) {
  const out = { url, rows: [] };
  try {
    const man = await (await fetch(url, { cache: 'no-store' })).json();
    Object.assign(out, { id: man.id, name: man.name, channels: man.channels, bytes: man.bytes });
    const base = url.slice(0, url.lastIndexOf('/') + 1);
    let ctx;
    try { ctx = new AudioContext({ sampleRate: 48000 }); }
    catch (e) { out.note = `AudioContext refused (${e.message}); OfflineAudioContext`; ctx = new OfflineAudioContext(1, 1, 48000); }
    out.rate = ctx.sampleRate;
    for (const z of man.zones) {
      const r = { root: z.rootMidi, mode: z.mode, frames: z.frames, onset: z.onset };
      try {
        const res = await fetch(base + z.file, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${z.file}`);
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        const x = buf.getChannelData(0);
        Object.assign(r, { len: buf.length, ch: buf.numberOfChannels, sr: buf.sampleRate });
        let on = -1;
        for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > 0.02) { on = i; break; }
        r.dOnset = on; r.shift = on >= 0 && z.onset >= 0 ? on - z.onset : null;
        const seam = (shift) => {             // 256 samples at loopEnd+s vs loopStart+s: [relative dB, error dBFS after gain]
          const s = Math.max(shift, -z.loopStart), a0 = z.loopEnd + s, b0 = z.loopStart + s;   // a loop at 0 can't go earlier
          if (a0 + 256 > x.length) throw new Error(`seam window out of range (${a0 + 256} > ${x.length})`);
          let d = 0, e = 0;
          for (let i = 0; i < 256; i++) { const a = x[a0 + i], b = x[b0 + i]; d += (a - b) ** 2; e += (a * a + b * b) / 2; }
          return [e > 0 ? 10 * Math.log10(Math.max(d, 1e-30) / e) : null, 10 * Math.log10(Math.max(d, 1e-30) / 256 * z.gain * z.gain)];
        };
        if (z.mode === 'sustain') {
          if (r.shift !== null) [r.seam, r.errDb] = seam(r.shift);
          r.seam0 = seam(0)[0];               // as if the container's own trim is trusted (no fingerprint)
        }
      } catch (e) { r.err = String(e && e.name ? `${e.name}: ${e.message}` : e); }
      out.rows.push(r);
    }
    if (ctx.close) await ctx.close().catch(() => {});
  } catch (e) { out.err = String(e && e.name ? `${e.name}: ${e.message}` : e); }
  return out;
}
const EXPR = (url) => `(${measure.toString()})(${JSON.stringify(url)})`;

// ─── child mode: one Playwright browser, one manifest, JSON on stdout
if (process.argv[2] === '--child') {
  const [, , , browser, url, marker] = process.argv;
  const pw = await import(PW);
  const opts = { headless: true };
  if (browser === 'webkit') {
    process.env.RIP_WK_REAL = pw.webkit.executablePath();
    Object.assign(opts, { executablePath: process.execPath, ignoreDefaultArgs: true,
      args: [SELF, marker, '--inspector-pipe', '--headless', '--no-startup-window'] });
  }
  const b = await pw[browser].launch(opts);
  const page = await b.newPage();
  await page.goto(`${ORIGIN}/`);
  process.stdout.write(JSON.stringify(await page.evaluate(EXPR(url))));
  await withTimeout(b.close(), 5000, 'close').catch(() => {});
  process.exit(0);
}

// ─── shim mode: stands in for WebKit's pw_run.sh, proxying the NUL-framed inspector pipe (fd 3 in, fd 4 out)
if (process.argv.includes('--inspector-pipe') && process.env.RIP_WK_REAL) {
  const wk = spawn(process.env.RIP_WK_REAL, process.argv.slice(2).filter((a) => !a.startsWith('--rip-shim')),
    { stdio: ['ignore', 'inherit', 'inherit', 'pipe', 'pipe'] });
  let buf = '';
  createReadStream(null, { fd: 3, encoding: 'utf8' }).on('data', (d) => {
    buf += d;
    for (let i; (i = buf.indexOf('\0')) >= 0; buf = buf.slice(i + 1)) wk.stdio[3].write(buf.slice(0, i).replace(/PushAPIEnabled/g, 'FullScreenEnabled') + '\0');
  }).on('end', () => wk.stdio[3].end());
  wk.stdio[4].pipe(createWriteStream(null, { fd: 4 }));
  wk.on('exit', (code) => process.exit(code ?? 0));
  await new Promise(() => {});
}

// ─── args
let root = join(REPO, 'public'), usePw = true;
const files = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--root') root = resolve(argv[++i]);
  else if (argv[i] === '--no-pw') usePw = false;
  else files.push(resolve(argv[i]));
}
if (!files.length) { console.error('usage: rip-verify.mjs [--root public] [--no-pw] <manifest.json>…'); process.exit(1); }
for (const f of files) if (!f.startsWith(root + '/') || !existsSync(f)) { console.error(`rip-verify: ${f} is not a file under ${root}`); process.exit(1); }
const urls = files.map((f) => ORIGIN + f.slice(root.length));

// ─── the server (static, no Range) + teardown
const TYPES = { '.json': 'application/json', '.m4a': 'audio/mp4', '.mp4': 'audio/mp4', '.webm': 'audio/webm', '.ogg': 'audio/ogg' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, ORIGIN).pathname);
  if (p === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><title>rip-verify</title>'); }
  const f = join(root, p);
  if (!f.startsWith(root + '/') || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(f));
});
let chrome = null, ws = null;
const children = new Set();
const pwPids = () => { try { return new Set(execFileSync('pgrep', ['-f', 'ms-playwright']).toString().split('\n').filter(Boolean)); } catch { return new Set(); } };
const pwBefore = pwPids();                          // anything already running is someone else's: never touched
const killNewPw = () => { for (const p of pwPids()) if (!pwBefore.has(p)) try { process.kill(Number(p), 'SIGKILL'); } catch {} };
function teardown() {
  try { ws?.close(); } catch {}
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) try { chrome.kill('SIGKILL'); } catch {}
  try { execFileSync('pkill', ['-9', '-f', PROFILE]); } catch {}   // helpers carry --user-data-dir
  try { execFileSync('pkill', ['-9', '-f', '--', SHIM]); } catch {}
  for (const c of children) try { c.kill('SIGKILL'); } catch {}
  killNewPw();
  try { server.closeAllConnections?.(); server.close(); } catch {}
  try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { teardown(); process.exit(130); });

// ─── Chrome over CDP
async function chromeRun(list) {
  try { await fetch(`http://${HOST}:${CDP_PORT}/json/version`); throw new Error(`port ${CDP_PORT} is already serving CDP (a leaked probe?)`); }
  catch (e) { if (String(e.message).includes('already')) throw e; }
  chrome = spawn(CHROME, ['--headless=new', '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--disable-gpu',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
    `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${CDP_PORT}`, 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://${HOST}:${CDP_PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
  }
  if (!target) throw new Error('chrome: no page target');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = () => no(new Error('chrome: websocket failed')); });
  let id = 0; const pend = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const cdp = (method, params = {}) => new Promise((ok) => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
  await cdp('Page.navigate', { url: `${ORIGIN}/` });
  for (let i = 0; i < 40; i++) {
    const r = await cdp('Runtime.evaluate', { expression: 'location.origin + "|" + document.readyState', returnByValue: true });
    if (r.result?.result?.value === `${ORIGIN}|complete`) break;
    await sleep(100);
  }
  const results = [];
  for (const u of list) {
    const r = await withTimeout(cdp('Runtime.evaluate', { expression: EXPR(u), awaitPromise: true, returnByValue: true }), CHROME_MS, `chrome ${u}`);
    results.push(r.result?.result?.value ?? { url: u, rows: [], err: r.result?.exceptionDetails?.exception?.description || JSON.stringify(r.error || r.result) });
  }
  await withTimeout(cdp('Browser.close'), 3000, 'Browser.close').catch(() => {});
  return results;
}

// ─── Playwright children (WebKit hung once on this Mac: the parent owns the clock)
function childRun(browser, url) {
  return new Promise((done) => {
    const c = spawn(process.execPath, [SELF, '--child', browser, url, SHIM], { stdio: ['ignore', 'pipe', 'pipe'] });
    children.add(c);
    let out = '', err = '', over = false;
    c.stdout.on('data', (d) => (out += d)); c.stderr.on('data', (d) => (err += d));
    const timer = setTimeout(() => {
      over = true; c.kill('SIGKILL'); killNewPw();
      done({ browser, verdict: 'HUNG', why: `no result in ${CHILD_MS / 1000}s${err.trim() ? ` · stderr: ${err.trim()}` : ''}` });
    }, CHILD_MS);
    c.on('exit', (code, sig) => {
      children.delete(c); clearTimeout(timer); killNewPw();
      if (over) return;
      try { done({ browser, ...JSON.parse(out) }); }
      catch { done({ browser, verdict: 'FAIL', why: (err.trim() || out.trim() || `child exit ${code ?? sig}`) }); }
    });
  });
}

// ─── judgement + print
const f1 = (v) => (v == null ? '–' : v.toFixed(1));
function judge(res) {
  if (res.verdict) return res;                                  // HUNG / FAIL from the child wrapper
  if (res.err) return { ...res, verdict: 'FAIL', why: res.err };
  const bad = [];
  for (const r of res.rows) {
    if (r.err) { bad.push(`${r.root}: ${r.err}`); continue; }
    if (r.shift == null || Math.abs(r.shift) > SHIFT_MAX) bad.push(`${r.root}: shift ${r.shift}`);
    if (r.mode === 'sustain' && !(r.seam <= SEAM_MAX)) bad.push(`${r.root}: seam ${f1(r.seam)} dB`);
    if (!(r.len >= r.frames - LEN_SLACK)) bad.push(`${r.root}: decoded ${r.len} < frames ${r.frames} − ${LEN_SLACK}`);
  }
  return { ...res, verdict: bad.length ? 'FAIL' : 'PASS', why: bad.join(' · ') };
}
function print(browser, res) {
  const j = judge(res), rows = res.rows || [];
  console.log(`\n── ${browser} · ${res.id ?? res.url ?? ''} ${res.name ? `"${res.name}"` : ''} ${res.channels ? `· ${res.channels} ch · ${rows.length} zones · ${res.bytes} B` : ''}${res.note ? ` · ${res.note}` : ''}`);
  if (rows.length) {
    console.log('  root mode      frames   len−fr  onset  dOnset  shift  seam dB  err dBFS  seam@0');
    for (const r of rows) console.log(`  ${String(r.root).padStart(4)} ${r.mode.padEnd(7)} ${String(r.frames).padStart(8)} ${String(r.len == null ? '–' : (r.len - r.frames >= 0 ? '+' : '') + (r.len - r.frames)).padStart(8)} ${String(r.onset).padStart(6)} ${String(r.dOnset ?? '–').padStart(7)} ${String(r.shift ?? '–').padStart(6)} ${f1(r.seam).padStart(8)} ${f1(r.errDb).padStart(9)} ${f1(r.seam0).padStart(7)}${r.err ? `  ERR ${r.err}` : ''}`);
    const ok = rows.filter((r) => !r.err), sus = ok.filter((r) => r.seam != null);
    const worst = sus.reduce((a, r) => (!a || r.seam > a.seam ? r : a), null);
    const loud = sus.reduce((a, r) => (!a || r.errDb > a.errDb ? r : a), null);
    if (ok.length) console.log(`  max |shift| ${Math.max(...ok.map((r) => Math.abs(r.shift ?? Infinity)))} · worst seam ${worst ? `${f1(worst.seam)} dB @ ${worst.root}` : '–'} · loudest seam error ${loud ? `${f1(loud.errDb)} dBFS @ ${loud.root}` : '–'} · len−frames ${Math.min(...ok.map((r) => r.len - r.frames))}..${Math.max(...ok.map((r) => r.len - r.frames))}`);
  }
  console.log(`  → ${j.verdict}${j.why ? ` · ${j.why}` : ''}`);
  return j.verdict;
}

// ─── run
const verdicts = [];
let leak = false;
try {
  await new Promise((ok, no) => server.once('error', no).listen(PORT, HOST, ok));
  console.log(`rip-verify · serving ${root} at ${ORIGIN} · ${files.length} manifest(s)`);
  const chromeRes = await chromeRun(urls).catch((e) => urls.map((u) => ({ url: u, rows: [], err: `chrome: ${e.message}` })));
  chromeRes.forEach((r) => verdicts.push(['chrome', r.id ?? r.url, print('chrome', r)]));
  if (chrome && chrome.exitCode === null) { chrome.kill('SIGKILL'); }
  if (usePw) for (const b of ['webkit', 'firefox']) {
    const r = await childRun(b, urls[0]);
    verdicts.push([b, r.id ?? urls[0], print(b, r)]);
  }
} finally {
  teardown();
  await sleep(300);
  let lines = '';
  try { lines = execFileSync('pgrep', ['-fl', '--', '--headless']).toString(); } catch {}
  const left = lines.split('\n').filter((l) => l.includes('rip-chrome'));
  leak = left.length > 0;
  console.log(`\nleak check (pgrep -fl -- '--headless' | grep rip-chrome): ${leak ? `LEAK\n${left.join('\n')}` : 'nothing'}`);
}
console.log('\nverdicts: ' + verdicts.map(([b, id, v]) => `${b}/${id} ${v}`).join(' · '));
process.exit(!leak && verdicts.length && verdicts.every(([, , v]) => v === 'PASS') ? 0 : 1);
