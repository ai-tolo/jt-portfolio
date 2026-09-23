#!/usr/bin/env node
// gate · the SIGNAL round gate (branch `signal`; R0 2026-09-23). One command, one verdict:
//   source ~/.nvm/nvm.sh && node scripts/signal/gate.mjs [--round r0] [--skip-build] [--looks a,b,c]
// build (exit code only) → serve-dist :4637 → headless Chrome/CDP :9345 (own profile <scratch>/<round>-gate-chrome,
// muted, DPR 1) → each look at 1440×900 + 1024×768: console clean, the asked .look shown at 700–1100 px unscaled,
// no sideways scroll, a viewport PNG + a below-the-fold keybed PIN → ~/Documents/studio-build/signal-<round>/gate/
// → the phone at 390×844 (mobile + touch). Chrome's whole process group is SIGKILLed and the server closed in
// `finally` AND on SIGINT/SIGTERM/uncaughtException; the last row: no `<round>-gate` headless probe survives.
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveDist } from "./serve-dist.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const ROUND = arg("round", "r0"), TAG = `${ROUND}-gate`;
const PORT = Number(arg("port", 4637)), CDP_PORT = Number(arg("cdp-port", 9345)), BASE = `http://127.0.0.1:${PORT}`;
const SCRATCH = arg("scratch", "/private/tmp/claude-501/-Users-tolo/a1c7365a-3a62-4cf9-a768-e8fc57dd9bca/scratchpad");
const PROFILE = join(SCRATCH, `${TAG}-chrome`);
const OUT = join(homedir(), "Documents/studio-build", `signal-${ROUND}`, "gate");
const LOOKS = arg("looks", "a,b,c").split(","), SIZES = [[1440, 900], [1024, 768]];
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const KEYBED = '[data-row="keybed"], .la-kb, .lb-keybed, .lc-bed, [class*="keybed"]';
const LIMIT_MS = 8 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nap = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); // a sync sleep for exit paths

const rows = [];
const check = (look, width, name, pass, detail = "") => {
  rows.push({ look, width, name, pass: !!pass, detail: String(detail) });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${look} ${width || ""} ${name}`);
};
let chrome = null, server = null, ws = null, builder = null, cleaned = false, buildExit = null, errs = [];
// ── kill discipline ─────────────────────────────────────────────────────────────────────────────────────
function cleanup() {
  if (cleaned) return; cleaned = true;
  try { builder?.kill("SIGTERM"); } catch {}
  try { ws?.close(); } catch {}
  if (chrome?.pid) {
    try { chrome.kill("SIGKILL"); } catch {}
    try { process.kill(-chrome.pid, "SIGKILL"); } catch {} // the group: GPU, renderer, network, storage helpers
  }
  if (server) { try { server.closeAllConnections(); server.close(); } catch {} }
}
function leaks() {
  const pg = (...a) => { try { return execFileSync("pgrep", a, { encoding: "utf8" }); } catch (e) { return e.stdout || ""; } };
  const lines = [...pg("-fl", "--", "--headless").split("\n").filter((l) => l.includes(TAG)),
    ...pg("-fl", "--", `${TAG}-chrome`).split("\n")].filter(Boolean);
  return [...new Set(lines)];
}
function sweep() { // give the killed probes ≤2 s to exit, SIGKILL any straggler, report what was found
  let found = leaks();
  for (let i = 0; i < 10 && found.length; i++) { nap(200); found = leaks(); }
  for (const l of found) { try { process.kill(Number(l.split(" ")[0]), "SIGKILL"); } catch {} }
  if (found.length) nap(300);
  return { found, still: found.length ? leaks() : [] };
}
function report() {
  const allPass = rows.length > 0 && rows.every((r) => r.pass);
  console.log(`\n${"look".padEnd(6)}${"width".padEnd(7)}${"assertion".padEnd(27)}${"pass".padEnd(6)}detail`);
  for (const r of rows) console.log(`${r.look.padEnd(6)}${String(r.width).padEnd(7)}${r.name.padEnd(27)}${(r.pass ? "PASS" : "FAIL").padEnd(6)}${r.detail}`);
  try { writeFileSync(join(OUT, "gate.json"), JSON.stringify({ round: ROUND, at: new Date().toISOString(), buildExit, allPass, rows }, null, 2) + "\n"); } catch {}
  console.log(`\ngate ${ROUND}: ${allPass ? "ALL PASS" : `${rows.filter((r) => !r.pass).length} FAIL`} · PNGs + gate.json in ${OUT}`);
  return allPass;
}
const bail = (why) => (e) => {
  console.error(`\ngate: ${why}${e instanceof Error ? ` · ${e.stack}` : ""}`);
  cleanup(); const sw = sweep();
  check("-", 0, "gate ran to the end", false, `${why}${sw.found.length ? ` · swept ${sw.found.length} probe(s)` : ""}`);
  report();
  process.exit(1);
};
for (const s of ["SIGINT", "SIGTERM", "uncaughtException", "unhandledRejection"]) process.on(s, bail(s));
process.on("exit", cleanup);
setTimeout(bail(`watchdog: over ${LIMIT_MS / 1000} s`), LIMIT_MS).unref();
// ── build ───────────────────────────────────────────────────────────────────────────────────────────────
async function build() {
  if (argv.includes("--skip-build")) { check("-", 0, "build exit 0", true, "skipped (--skip-build)"); return 0; }
  const t0 = Date.now(); let out = "";
  const code = await new Promise((ok) => {
    builder = spawn("npm", ["run", "build"], { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] });
    for (const s of [builder.stdout, builder.stderr]) s.on("data", (d) => (out += d));
    builder.on("error", (e) => { out += e.message; ok(127); }).on("close", (c) => ok(c ?? 1));
  });
  builder = null;
  check("-", 0, "build exit 0", code === 0, `npm run build → exit ${code} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (code !== 0) console.error(out.split("\n").slice(-40).join("\n"));
  return code;
}
// ── CDP (the studio-mocks/cdp.mjs pattern, plus events, errors and timeouts) ──────────────────────────────
let seq = 0; const pend = new Map(), subs = new Map();
const on = (method, f) => subs.set(method, [...(subs.get(method) || []), f]);
const off = (method, f) => subs.set(method, (subs.get(method) || []).filter((g) => g !== f));
function cdp(method, params = {}) {
  return new Promise((ok, fail) => {
    const id = ++seq;
    const t = setTimeout(() => { pend.delete(id); fail(new Error(`CDP ${method}: no answer in 20 s`)); }, 20000);
    pend.set(id, (m) => { clearTimeout(t); m.error ? fail(new Error(`CDP ${method}: ${m.error.message}`)) : ok(m.result); });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const once = (method, ms) => new Promise((ok, fail) => {
  const f = (p) => { clearTimeout(t); off(method, f); ok(p); };
  const t = setTimeout(() => { off(method, f); fail(new Error(`no ${method} in ${ms} ms`)); }, ms);
  on(method, f);
});
async function ev(expression) {
  const r = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(`eval: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r.result.value;
}
async function launchChrome() {
  if (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`).then(() => true, () => false))
    throw new Error(`:${CDP_PORT} already answers CDP (a leaked probe? pgrep -fl -- --headless)`);
  rmSync(PROFILE, { recursive: true, force: true }); mkdirSync(PROFILE, { recursive: true }); // a fresh profile each run
  chrome = spawn(CHROME, ["--headless=new", "--mute-audio", "--autoplay-policy=no-user-gesture-required",
    "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${CDP_PORT}`, "--window-size=1440,900", "about:blank"],
  { stdio: "ignore", detached: true }); // detached = its own process group, so one kill takes every helper
  chrome.on("error", (e) => console.error(`gate: chrome did not start: ${e.message}`));
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
  }
  if (!target) throw new Error("headless Chrome gave no page target in 10 s");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = () => fail(new Error("CDP socket failed to open")); });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    else if (m.method) for (const f of subs.get(m.method) || []) f(m.params);
  };
  on("Runtime.exceptionThrown", (p) => errs.push(`uncaught: ${p.exceptionDetails.exception?.description || p.exceptionDetails.text}`));
  on("Runtime.consoleAPICalled", (p) => {
    if (p.type === "error" || p.type === "assert") errs.push(`console.${p.type}: ${p.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
  });
  on("Log.entryAdded", ({ entry: x }) => { if (x.level === "error") errs.push(`${x.source}: ${x.text}${x.url ? ` (${x.url})` : ""}`); });
  for (const d of ["Page", "Runtime", "Log"]) await cdp(`${d}.enable`);
}
async function open(url) {
  errs = [];
  const loaded = once("Page.loadEventFired", 20000); loaded.catch(() => {}); // awaited below; no stray rejection
  const nav = await cdp("Page.navigate", { url });
  if (nav.errorText) throw new Error(`navigate ${url}: ${nav.errorText}`);
  await loaded;
  await ev("document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))");
  await sleep(300); // the host's ResizeObserver refit has landed
}
async function shot(file) {
  const { data } = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, file), Buffer.from(data, "base64"));
}
const SHOWN = `[...document.querySelectorAll(".look")].filter((l) => getComputedStyle(l).display !== "none")`;
const MEASURE = `(() => { const shown = ${SHOWN}, s = shown[0], fit = document.getElementById("sig-fit");
  return { shown: shown.map((l) => l.dataset.look || l.className), h: s ? s.offsetHeight : 0,
    drawn: s ? Math.round(s.getBoundingClientRect().height) : 0,
    zoom: fit ? getComputedStyle(fit).getPropertyValue("--sig-zoom").trim() || "1" : "?",
    sw: document.documentElement.scrollWidth, iw: innerWidth }; })()`;
const PIN = `(async () => { const s = ${SHOWN}[0], kb = s && s.querySelector(${JSON.stringify(KEYBED)});
  if (!kb) return { found: false };
  const fold = kb.getBoundingClientRect().bottom > innerHeight;
  kb.scrollIntoView({ block: "start", behavior: "instant" });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const r = kb.getBoundingClientRect();
  return { found: true, cls: kb.className, fold, top: Math.round(r.top), bottom: Math.round(r.bottom), ih: innerHeight, y: Math.round(scrollY) }; })()`;
const PHONE = `(() => { const see = (el) => { if (!el) return null; const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { display: cs.display, shown: cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0, h: Math.round(r.height) }; };
  return { phone: see(document.querySelector(".sig-phone")), host: see(document.querySelector(".sig-host")),
    coarse: matchMedia("(pointer: coarse)").matches, touch: navigator.maxTouchPoints, iw: innerWidth }; })()`;
const errLine = () => (errs.length ? `${errs.length}: ${errs.slice(0, 3).join(" | ").slice(0, 400)}` : "0 errors");
// ── the run ─────────────────────────────────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
console.log(`gate ${ROUND} · ${REPO} → ${BASE}/signal/ · CDP :${CDP_PORT}`);
try {
  buildExit = await build();
  if (buildExit === 0) {
    server = await serveDist({ port: PORT });
    await launchChrome();
    for (const [w, h] of SIZES) {
      await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
      for (const x of LOOKS) {
        await open(`${BASE}/signal/?look=${x}&mute=1`);
        const m = await ev(MEASURE);
        check(x, w, "the asked look shown", m.shown.length === 1 && m.shown[0] === x, `shown: ${m.shown.join(",") || "none"}`);
        check(x, w, "height 700–1100 unscaled", m.h >= 700 && m.h <= 1100, `${m.h} px (drawn ${m.drawn} px at zoom ${m.zoom})`);
        check(x, w, "no sideways scroll", m.sw <= m.iw, `scrollWidth ${m.sw} / innerWidth ${m.iw}`);
        await shot(`${x}-${w}.png`);
        const p = await ev(PIN); await sleep(120); await shot(`${x}-${w}-keybed.png`);
        check(x, w, "keybed pinned in view", p.found && p.top >= -1 && p.bottom <= p.ih + 1, p.found
          ? `.${p.cls} top ${p.top} / bottom ${p.bottom} of ${p.ih} · scrollY ${p.y}${p.fold ? " · was below the fold" : " · was already in view"}`
          : "no keybed row in the shown look");
        check(x, w, "console clean", errs.length === 0, errLine());
      }
    }
    await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cdp("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await open(`${BASE}/signal/?look=a&mute=1`);
    const ph = await ev(PHONE); await shot("phone-390.png");
    check("phone", 390, ".sig-phone visible", ph.phone?.shown,
      `display ${ph.phone?.display ?? "missing"} · ${ph.phone?.h ?? 0} px · innerWidth ${ph.iw} · pointer:coarse ${ph.coarse} · touch ${ph.touch}`);
    check("phone", 390, ".sig-host not displayed", ph.host?.display === "none", `display ${ph.host?.display ?? "missing"}`);
    check("phone", 390, "console clean", errs.length === 0, errLine());
  }
} catch (e) { check("-", 0, "gate ran to the end", false, e.message); }
finally { cleanup(); }
const sw = sweep();
check("-", 0, `no leaked ${TAG} probes`, sw.found.length === 0, sw.found.length
  ? `swept ${sw.found.length}: ${sw.found.join(" | ").slice(0, 240)} · still alive ${sw.still.length}`
  : `pgrep -fl -- --headless | grep ${TAG} → nothing`);
process.exit(report() ? 0 : 1);
