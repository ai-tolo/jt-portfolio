#!/usr/bin/env node
// gate · the SIGNAL round gate (branch `signal`; R0 + R1 + R2, 2026-09-23). One command, one verdict:
//   source ~/.nvm/nvm.sh && node scripts/signal/gate.mjs [--round r0|r1|r2] [--skip-build] [--looks a,b,c] [--only chromium,webkit,firefox]
// build (exit code only) → serve-dist :4637 → the round's browsers → one table → the KILL line, always the last line.
// R0 · headless Chrome/CDP :9345 (own profile <scratch>/<round>-gate-chrome, muted, DPR 1) → each look at 1440×900 +
//   1024×768: console clean, the asked .look shown at 700–1100 px unscaled, no sideways scroll, a viewport PNG + a
//   below-the-fold keybed PIN → ~/Documents/studio-build/signal-<round>/gate/ → the phone at 390×844 (mobile + touch).
// R1 · NOTES-SIGNAL-R1.md §4 against window.__signal (types.ts SignalTestSurface) in Playwright 1.63 (studio-mocks/pw):
//   ONE CHILD PER BROWSER (`--r1-leg <browser>`, JSON lines on stdout) for chromium · webkit · firefox, each on a 120 s
//   clock the parent owns: a hang is SIGKILLed with its browser and reported HUNG, loudly, never as a failure. A leg
//   opens /signal/?mute=1 and sends NO input unless out.muted() holds (WebKit + Firefox play aloud otherwise), then:
//   boot (ready ≤ 10 s after navigation, .sig-device rendered, no console errors) · first sound (a TRUSTED KeyA: the one
//   input every engine lets resume a context; firstSoundMs < 200) · the loop (Space, KeyB + seq, C-E-G held, KeyV:
//   rms > −60 dBFS after 4 bars; Chromium also 20 s at CPU throttle 4× through a CDP session: glitches().gaps 0 and rms
//   never under −60 dBFS) · master stop (Escape: peak < 3e-5 ≈ −90 dBFS within 150 ms, still silent over the next 1 s
//   while the render keeps counting) · save/reload (bpm 100, drums on, voice pad survive a reload) · shots at 1440×900
//   + 1024×768 and the keybed row pinned → <browser>-<w>[-keybed].png · the phone at 390×844 + touch (Chromium): the
//   still and its line, no device. WebKit is the frozen macOS-14 build: it launches through rip-verify.mjs's
//   inspector-pipe shim (the PushAPIEnabled rename), reused as it is; its close is capped at 5 s.
// R2 · NOTES-SIGNAL-R2.md (the power, the dark, the swap) in the SAME children, clocks and kill discipline
//   (`--round r2`): boot as R1 → POWER FIRST: #sgm[data-state] 'standby' with no data-live, the
//   disc #pwr at the device's top middle and hit-testable, the device box shot DARK (<browser>-standby.png) → a TRUSTED
//   click at the disc's centre (page.mouse.click): 'boot' within the press's own dispatch, 'live' + data-live="1" within
//   2 s, the boot sound without an error (?mute=1 plays it through a 0-gain: no error is the whole assertion), the lit
//   box (<browser>-live.png): the standby's mean relative luminance (linear, Rec. 709) at most 55 % of the live's →
//   first sound: a trusted KeyA on the live device, < 200 ms from the key's own timeStamp to rms > −60 dBFS (the gate
//   measures it: the surface's firstSoundMs marks the power click, its first trusted pointerdown, and is reported,
//   never judged) → the loop, the throttle, the master stop (R1's own sections) → save/reload: ARMED AND SILENT (bpm +
//   voice restore, drums.on comes back false, the device back in standby) → powered again, R1's shots (lit) → POWER
//   OFF: the beat on, a trusted click on the disc → 'standby' within 2 s, level().peak < 3e-5, no data-live → R1's
//   phone (Chromium) → THE HOMEPAGE (Chromium): /?mute=1 at 1440×900, #play scrolled into view: 'standby' and no
//   html[data-night]; a trusted click → data-night and 'live' within 2 s; scrolled to the top → 'standby' and
//   data-night gone within 1.5 s (+ <browser>-home-standby.png, <browser>-home-live.png).
// KILL DISCIPLINE · R0: Chrome's whole process group. R1 + R2: each child and everything under it, the WebKit shim (by this
//   run's marker) and every ms-playwright process that was not running at start and has been orphaned. SIGKILLed, the
//   server closed, in `finally` AND on SIGINT/SIGTERM/SIGHUP/uncaughtException; the last line proves none survives.
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { serveDist } from "./serve-dist.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const ROUND = arg("round", "r0"), TAG = `${ROUND}-gate`, R1 = ROUND === "r1", R2 = ROUND === "r2";
const LEGS = R1 || R2;                                                           // the Playwright rounds: one child per browser
const PORT = Number(arg("port", 4637)), CDP_PORT = Number(arg("cdp-port", 9345)), BASE = `http://127.0.0.1:${PORT}`;
const SCRATCH = arg("scratch", "/private/tmp/claude-501/-Users-tolo/a1c7365a-3a62-4cf9-a768-e8fc57dd9bca/scratchpad");
const PROFILE = join(SCRATCH, `${TAG}-chrome`);
const OUT = join(homedir(), "Documents/studio-build", `signal-${ROUND}`, "gate");
const LOOKS = arg("looks", "a,b,c").split(","), SIZES = [[1440, 900], [1024, 768]];
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const KEYBED = '[data-row="keybed"], .la-kb, .lb-keybed, .lc-bed, [class*="keybed"]';
const LIMIT_MS = (LEGS ? 15 : 8) * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nap = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); // a sync sleep for exit paths
// ── R1 ──
const PW = "/Users/tolo/studio-mocks/pw/node_modules/playwright/index.mjs";
const RIP_VERIFY = fileURLToPath(new URL("./rip-verify.mjs", import.meta.url)); // doubles as the WebKit pipe shim
const LEG = arg("r1-leg", null);                                                   // child mode: one browser's leg
const BROWSERS = arg("only", "chromium,webkit,firefox").split(",").filter(Boolean);
const LEG_MS = Number(arg("leg-ms", 120_000));                                   // each browser's clock (a knob for proving the HUNG path)
const SIGNAL_URL = `${BASE}/signal/?mute=1`;
const RMS_MIN = 0.001;                  // −60 dBFS: the loop sounds
const PEAK_QUIET = 3e-5;                // −90.5 dBFS: the master stop is silent
const R1_KEYBED = '.sgh-keybed, [data-sig="keybed"], [class*="keybed"]';
const SHIM = process.env.GATE_SHIM || `--rip-shim-${TAG}-${process.pid}`; // marks this run's shim (rip-verify drops --rip-shim*)

// ════ R1 · THE LEG (child mode): one browser, one page, JSON lines on stdout; the parent owns the clock ═══════════════
const dB = (x) => (x > 0 ? `${(20 * Math.log10(x)).toFixed(1)} dBFS` : "−∞ dBFS");
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
function diffState(a, b, p = "state", out = []) {
  if (typeof a === "number" && typeof b === "number") { if (Math.abs(a - b) > 1e-9) out.push(`${p}: ${a} → ${b}`); return out; }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    if (a !== b) out.push(`${p}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
    return out;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffState(a[k], b[k], `${p}.${k}`, out);
  return out;
}
// in page (Playwright serializes these: self-contained, one argument)
const WAIT_READY = (limitMs) => new Promise((ok) => {
  const t0 = performance.now();
  const tick = () => {
    let r = false;
    try { r = !!(window.__signal && window.__signal.ready()); } catch { r = false; }
    const now = performance.now();
    if (r || now - t0 > limitMs) ok({ ready: r, at: Math.round(now), surface: !!window.__signal });
    else setTimeout(tick, 20);
  };
  tick();
});
const BOOT_FACTS = () => {
  const s = window.__signal, d = document.querySelector(".sig-device"), fit = document.getElementById("sig-fit");
  const cs = d && getComputedStyle(d), r = d && d.getBoundingClientRect();
  let muted = null, worklet = null;
  try { muted = s.instrument.out.muted(); } catch { muted = null; }
  try { worklet = s.instrument.effects.worklet(); } catch { worklet = null; }
  return { device: !!d, display: cs ? cs.display : "missing", rects: d ? d.getClientRects().length : 0,
    w: d ? d.offsetWidth : 0, h: d ? d.offsetHeight : 0, dw: r ? Math.round(r.width) : 0, dh: r ? Math.round(r.height) : 0,
    booted: !!d && d.dataset.booted === "1", zoom: fit ? getComputedStyle(fit).getPropertyValue("--sig-zoom").trim() : "",
    muted, worklet, ctx: s ? s.ctxState() : null, sr: s ? s.instrument.ctx.sampleRate : null };
};
const WAIT_FIRST_SOUND = (limitMs) => new Promise((ok) => {
  const s = window.__signal, t0 = performance.now();
  const tick = () => {
    const v = s.firstSoundMs();
    if (v !== null || performance.now() - t0 > limitMs) ok({ ms: v, ctx: s.ctxState(), rms: s.level().rms });
    else setTimeout(tick, 10);
  };
  tick();
});
const LOOP = () => {   // NOTES-SIGNAL-R1 §4 (3), through the real keymap's actions (the context already runs)
  const s = window.__signal, i = s.instrument;
  s.press("Space");                                          // drums on (a tap)
  s.press("KeyB");                                           // bass on …
  i.bass.set("mode", "seq");                                 // … in SEQ, via state
  for (const k of ["KeyA", "KeyD", "KeyG"]) s.press(k, true); // C E G held
  s.press("KeyV");                                           // the arp
  const st = s.state();
  return { drums: st.drums.on, bass: st.bass.on, mode: st.bass.mode, arp: st.harmony.arp.on, bpm: st.bpm,
    clock: i.time.running(), held: i.keys.held().length };
};
const SAMPLE = (ms) => new Promise((ok) => {   // rms every 100 ms for `ms`, in page (no round trips under a throttle)
  const s = window.__signal, xs = [], t0 = performance.now(), g0 = s.glitches();
  const id = setInterval(() => {
    const t = performance.now() - t0;
    xs.push([Math.round(t), s.level().rms]);
    if (t >= ms) { clearInterval(id); ok({ xs, end: s.level(), g0, g1: s.glitches(), wall: Math.round(t) }); }
  }, 100);
});
const STOP = ({ quiet, hold }) => new Promise((ok) => {   // Escape, then the peak polled every ~2-4 ms
  const s = window.__signal, b0 = s.glitches().blocks, t0 = performance.now();
  s.press("Escape");
  let at = null, maxAfter = 0, n = 0;
  const id = setInterval(() => {
    const t = performance.now() - t0, l = s.level();
    n++;
    if (at === null) { if (l.peak < quiet) at = t; } else maxAfter = Math.max(maxAfter, l.peak);
    if ((at !== null && t >= at + hold) || t > hold + 1500) {
      clearInterval(id);
      const st = s.state();
      ok({ at: at === null ? null : Math.round(at * 10) / 10, maxAfter, n, end: s.level(), b0, b1: s.glitches().blocks,
        ctx: s.ctxState(), drums: st.drums.on, bass: st.bass.on, arp: st.harmony.arp.on, hold: st.harmony.hold,
        held: s.instrument.keys.held().length });
    }
  }, 2);
});
const PLAYBACK = () => {   // Chrome's device-side count (AudioPlaybackStats), when the engine has it
  const p = window.__signal.instrument.ctx.playbackStats;
  return p && typeof p.underrunEvents === "number" ? { ev: p.underrunEvents, dur: p.underrunDuration } : null;
};
const CHANGE3 = async () => {   // NOTES-SIGNAL-R1 §4 (5): three things off where they were
  const s = window.__signal, i = s.instrument;
  for (const k of ["KeyA", "KeyD", "KeyG"]) s.press(k, false);   // the loop's chord keys up (the stop released the notes)
  i.time.setBpm(100);
  i.drums.set("on", true);
  await i.keys.pick("pad");
  const st = s.state();
  return { bpm: st.bpm, drums: st.drums.on, voice: st.keys.voice };
};
const SETTLE = () => {
  document.documentElement.style.scrollBehavior = "auto";
  scrollTo(0, 0);
  return document.fonts.ready.then(() => new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(() => f(true)))));
};
const SHOT_FACTS = () => {
  const d = document.querySelector(".sig-device"), fit = document.getElementById("sig-fit"), r = d && d.getBoundingClientRect();
  return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight,
    dev: r ? { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) } : null,
    zoom: fit ? getComputedStyle(fit).getPropertyValue("--sig-zoom").trim() : "" };
};
const PIN = async (sel) => {   // the keybed row centred in the viewport (the page clamps a scroll past its end)
  const kb = document.querySelector(sel);
  if (!kb) return { found: false };
  const r0 = kb.getBoundingClientRect(), fold = r0.bottom > innerHeight;
  document.documentElement.style.scrollBehavior = "auto";
  scrollTo(0, Math.max(0, scrollY + r0.top - Math.max(0, (innerHeight - r0.height) / 2)));
  await new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(f)));
  const r = kb.getBoundingClientRect();
  return { found: true, cls: String(kb.className), fold, top: Math.round(r.top), bottom: Math.round(r.bottom), ih: innerHeight, y: Math.round(scrollY) };
};
const PHONE = async () => {
  const see = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { display: cs.display, shown: cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0,
      w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) };
  };
  const still = document.querySelector(".sig-still"), line = document.querySelector(".sig-line");
  const dev = document.querySelector(".sig-device"), host = document.getElementById("sig-host");
  let img = null;
  const m = still && /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(still).backgroundImage || "");
  if (m) img = await new Promise((ok) => {
    const i = new Image();
    i.onload = () => ok({ src: m[1], w: i.naturalWidth, h: i.naturalHeight });
    i.onerror = () => ok({ src: m[1], w: 0, h: 0 });
    i.src = m[1];
  });
  return { still: see(still), line: see(line), text: line ? line.textContent.trim() : "", img,
    device: dev ? { rects: dev.getClientRects().length, host: host ? getComputedStyle(host).display : "missing" } : null,
    coarse: matchMedia("(pointer: coarse)").matches, touch: navigator.maxTouchPoints,
    sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, surface: !!window.__signal };
};

// ── THE LEG'S SECTIONS: R1's own code, moved out of leg() unchanged, so R2 runs its loop, stop, shots and phone ──
async function bootRows({ name, browser, page, errs, row, step, errLine }) {
  // (1) BOOT
  step("boot");
  await page.goto(SIGNAL_URL, { waitUntil: "load", timeout: 30_000 });
  const rd = await page.evaluate(WAIT_READY, 12_000);
  const bf = await page.evaluate(BOOT_FACTS);
  row("boot · muted (?mute=1)", bf.muted === true, `out.muted() ${bf.muted} · ${name} ${browser.version()} · ctx ${bf.ctx} before any gesture${bf.ctx === "running" ? " (auto-started)" : ""} @ ${bf.sr} Hz · fx ${bf.worklet}`);
  if (bf.muted !== true) throw new Error("ABORTED before any input: the page is not muted (sound safety)");
  row("boot · ready ≤ 10 s", rd.ready && rd.at <= 10_000, rd.ready ? `__signal.ready() at ${rd.at} ms after navigation` : `not ready at ${rd.at} ms · __signal ${rd.surface ? "present" : "absent"}`);
  row("boot · .sig-device rendered", bf.device && bf.display !== "none" && bf.rects > 0 && bf.w > 0 && bf.h > 0 && bf.booted,
    `${bf.w}×${bf.h} drawn ${bf.dw}×${bf.dh} (zoom ${bf.zoom || "?"}) · display ${bf.display} · data-booted ${bf.booted}`);
  row("boot · no console errors", errs.length === 0, errLine(errs));
  if (!rd.ready) throw new Error("the instrument never became ready: nothing after boot can be judged");

  return { rd, bf };
}
async function loopRows({ name, page, row, step }) {
  // (3) THE LOOP: drums · bass seq · a held chord · the arp; 4 bars; Chromium also 20 s at CPU throttle 4×
  step("loop");
  const lp = await page.evaluate(LOOP);
  const barMs = 240_000 / lp.bpm;
  const four = await page.evaluate(SAMPLE, Math.round(4 * barMs + 150));
  const bar4 = four.xs.filter(([t]) => t >= 3 * barMs).map(([, v]) => v);
  row("loop · 4 bars > −60 dBFS", four.end.rms > RMS_MIN && lp.drums && lp.bass && lp.mode === "seq" && lp.arp,
    `rms ${dB(four.end.rms)} after 4 bars (${(4 * barMs / 1000).toFixed(1)} s @ ${lp.bpm} bpm) · bar 4 min ${dB(Math.min(...bar4))} / median ${dB(median(bar4))} · drums ${lp.drums ? "on" : "OFF"} · bass ${lp.bass ? lp.mode : "OFF"} · arp ${lp.arp ? "on" : "OFF"} · ${lp.held} held · gaps ${four.g1.gaps}`);
  if (name === "chromium") {
    step("throttle");
    const cdp = await page.context().newCDPSession(page);
    const pb0 = await page.evaluate(PLAYBACK);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    let th;
    try { th = await page.evaluate(SAMPLE, 20_000); }
    finally { await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }).catch(() => {}); }
    const rs = th.xs.map(([, v]) => v), g0 = th.g0, g1 = th.g1, pb1 = await page.evaluate(PLAYBACK);
    const pb = pb0 && pb1 ? ` · Chrome's playbackStats in the same window: underrunEvents +${pb1.ev - pb0.ev}, underrunDuration +${((pb1.dur - pb0.dur) * 1000).toFixed(1)} ms` : " · (no ctx.playbackStats)";
    // judged across the 20 s window (the counts are cumulative since boot: a gap before the throttle is not this row's)
    row("throttle 4× · glitches().gaps 0", g1.gaps - g0.gaps === 0 && g1.blocks > g0.blocks,
      `+${g1.gaps - g0.gaps} gaps in the window (${g1.gaps} since boot) · blocks +${g1.blocks - g0.blocks} in ${(th.wall / 1000).toFixed(1)} s · maxGapMs ${g1.maxGapMs.toFixed(1)} · lagMs +${((g1.lagMs ?? 0) - (g0.lagMs ?? 0)).toFixed(1)}${pb}`);
    row("throttle 4× · rms stays > −60 dBFS", rs.length > 0 && Math.min(...rs) > RMS_MIN,
      `min ${dB(Math.min(...rs))} · median ${dB(median(rs))} over ${rs.length} reads in ${(th.wall / 1000).toFixed(1)} s`);
  }
}
async function stopRows({ page, row, step }) {
  // (4) MASTER STOP
  step("stop");
  const st = await page.evaluate(STOP, { quiet: PEAK_QUIET, hold: 1000 });
  row("stop · < −90 dBFS within 150 ms", st.at !== null && st.at <= 150,
    st.at !== null ? `peak < 3e-5 at ${st.at} ms after Escape (${st.n} polls)` : `never under 3e-5 in 2.5 s · peak ${dB(st.end.peak)}`);
  row("stop · still silent 1 s later", st.at !== null && st.maxAfter < PEAK_QUIET && st.end.rms < PEAK_QUIET && st.b1 > st.b0,
    `max peak ${dB(st.maxAfter)} over the next 1 s · rms ${dB(st.end.rms)} · render blocks ${st.b0} → ${st.b1} · ctx ${st.ctx} · after: drums ${st.drums ? "ON" : "off"} · bass ${st.bass ? "ON" : "off"} · arp ${st.arp ? "ON" : "off"} · hold ${st.hold ? "ON" : "off"} · ${st.held} held`);
}
async function shotRows({ name, page, row, step }) {
  // (6) SHOTS: 1440×900 + 1024×768 + the keybed row pinned
  for (const [w, h] of SIZES) {
    step(`shot ${w}`);                                       // a page error during the resize is tagged with its width
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(SETTLE);
    await page.waitForTimeout(350);                            // the host's ResizeObserver refit lands
    const m = await page.evaluate(SHOT_FACTS);
    const file = join(OUT, `${name}-${w}.png`);
    await page.screenshot({ path: file });
    row(`shot ${w} · no sideways scroll`, m.sw <= m.iw && !!m.dev && m.dev.l >= 0 && m.dev.r <= m.iw,
      `scrollWidth ${m.sw} / innerWidth ${m.iw} · device x ${m.dev ? `${m.dev.l}..${m.dev.r} (${m.dev.w}×${m.dev.h}, zoom ${m.zoom})` : "missing"} · ${file}`);
    const p = await page.evaluate(PIN, R1_KEYBED);
    await page.waitForTimeout(120);
    const kfile = join(OUT, `${name}-${w}-keybed.png`);
    await page.screenshot({ path: kfile });
    row(`shot ${w} · keybed pinned`, p.found && p.top >= -1 && p.bottom <= p.ih + 1, p.found
      ? `.${p.cls.split(" ")[0]} top ${p.top} / bottom ${p.bottom} of ${p.ih} · scrollY ${p.y}${p.fold ? " · was below the fold" : " · was in view"} · ${kfile}`
      : "no keybed row");
  }
}
async function phoneRows({ name, browser, row, step, listen, errLine }) {
  // (7) THE PHONE (Chromium): 390×844, mobile + touch
  if (name === "chromium") {
    step("phone");
    const pc = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const pp = await pc.newPage(), perrs = [];
    listen(pp, perrs);
    await pp.goto(SIGNAL_URL, { waitUntil: "load", timeout: 30_000 });
    await pp.evaluate(SETTLE);
    await pp.waitForTimeout(300);
    const ph = await pp.evaluate(PHONE);
    const file = join(OUT, `${name}-390.png`);
    await pp.screenshot({ path: file });
    row("phone · the still + one line", !!(ph.still?.shown && ph.img?.w > 0 && ph.line?.shown && ph.text && ph.still.bottom <= ph.ih && ph.line.bottom <= ph.ih),
      `still ${ph.still ? `${ph.still.w}×${ph.still.h}` : "missing"} (${ph.img ? (ph.img.w ? `${ph.img.w}×${ph.img.h} decoded` : "did NOT decode") : "no image"}) · line "${ph.text.slice(0, 44)}…" ends at ${ph.line?.bottom ?? "?"} of ${ph.ih} · pointer:coarse ${ph.coarse} · touch ${ph.touch} · scrollWidth ${ph.sw}/${ph.iw} · ${file}`);
    row("phone · .sig-device not displayed", !!ph.device && ph.device.rects === 0,
      ph.device ? `layout boxes ${ph.device.rects} · #sig-host display ${ph.device.host} · __signal ${ph.surface ? "PRESENT (booted)" : "absent (no boot)"}` : "no .sig-device in the markup");
    row("phone · no console errors", perrs.length === 0, errLine(perrs));
    await pc.close();
  }
}
// ════ R1 · THE LEG ═══════════════════════════════════════════════════════════════════════════════════════════════
async function legR1(k) {
  const { page, row, step } = k;
  const { bf } = await bootRows(k);

  // (2) FIRST SOUND: a trusted key (a user activation in every engine), through the real keymap
  step("first sound");
  await page.keyboard.down("KeyA");
  const fs = await page.evaluate(WAIT_FIRST_SOUND, 3000);
  await page.keyboard.up("KeyA");
  row("first sound < 200 ms", fs.ms !== null && fs.ms < 200, fs.ms !== null
    ? `firstSoundMs ${fs.ms.toFixed(1)} ms (trusted KeyA → rms > −60 dBFS, rendered) · ctx ${bf.ctx} → ${fs.ctx}${bf.ctx === "running" ? " (already running: the resume path was NOT exercised)" : " (the resume is inside the number)"}`
    : `no first sound in 3 s · ctx ${bf.ctx} → ${fs.ctx} · rms ${dB(fs.rms)}`);

  await loopRows(k);
  await stopRows(k);

  // (5) SAVE / RELOAD
  step("reload");
  const c3 = await page.evaluate(CHANGE3);
  await page.waitForTimeout(900);                              // the store saves 250 ms after the last change
  const S0 = await page.evaluate(() => window.__signal.state());
  await page.reload({ waitUntil: "load", timeout: 30_000 });
  const rr = await page.evaluate(WAIT_READY, 12_000);
  const S1 = rr.surface ? await page.evaluate(() => window.__signal.state()) : null;
  const d = S1 ? diffState(S0, S1) : [];
  row("save/reload · state() equal", !!S1 && Math.abs(S1.bpm - 100) < 1e-6 && S1.drums.on === true && S1.keys.voice === "pad",
    S1 ? `after reload: bpm ${S1.bpm} · drums.on ${S1.drums.on} · voice ${S1.keys.voice} (set: ${c3.bpm} · ${c3.drums} · ${c3.voice}) · ready ${rr.ready ? `at ${rr.at} ms` : "NO"} · whole state(): ${d.length ? `${d.length} diff(s): ${d.slice(0, 4).join(" | ")}` : "deepEqual"}`
      : "no __signal after the reload");

  await shotRows(k);
  await phoneRows(k);
}

// ════ R2 · THE POWER (NOTES-SIGNAL-R2.md): in page (self-contained, one argument) ═══════════════════════════════════
const POWER_FACTS = () => {   // the host contract as the page holds it now, and where a hand would press the disc
  const sgm = document.getElementById("sgm"), dev = sgm && sgm.querySelector(":scope > .device");
  const p = document.getElementById("pwr"), html = document.documentElement;
  const pr = p && p.getBoundingClientRect(), dr = dev && dev.getBoundingClientRect();
  const x = pr ? pr.left + pr.width / 2 : 0, y = pr ? pr.top + pr.height / 2 : 0;
  const hitEl = pr ? document.elementFromPoint(x, y) : null;
  const desc = (e) => {
    if (!e) return "nothing";
    const c = (e.getAttribute("class") || "").trim().split(/\s+/)[0];
    return `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}${c ? `.${c}` : ""}`;
  };
  let muted = null;
  try { muted = window.__signal ? window.__signal.instrument.out.muted() : null; } catch { muted = null; }
  return { sgm: !!sgm, root: !!(dev && dev.matches(".device.sig.sig-device")), state: sgm ? sgm.getAttribute("data-state") : null,
    live: sgm ? sgm.getAttribute("data-live") : null, devLive: dev ? dev.getAttribute("data-live") : null,
    devCls: dev ? dev.classList.contains("live") : null, pwr: !!p, slot: p ? desc(p.parentElement) : "none",
    lit: p ? p.classList.contains("lit") : null, pressed: p ? p.getAttribute("aria-pressed") : null,
    x, y, pw: pr ? pr.width : 0, hit: !!(p && hitEl && (hitEl === p || p.contains(hitEl))), hitDesc: desc(hitEl),
    dev: dr ? { l: dr.left, t: dr.top, w: dr.width, h: dr.height } : null, night: html.hasAttribute("data-night"),
    ctx: window.__signal ? window.__signal.ctxState() : null, muted, ih: innerHeight, sy: Math.round(scrollY) };
};
const WAIT_POWER = (limitMs) => new Promise((ok) => {   // the disc mounts once the boot resolves (Signal.astro's script)
  const t0 = performance.now();
  const tick = () => {
    let r = false;
    try { r = !!(window.__signal && window.__signal.ready()); } catch { r = false; }
    const p = !!document.getElementById("pwr"), now = performance.now();
    if ((r && p) || now - t0 > limitMs) ok({ ready: r, pwr: p, at: Math.round(now), surface: !!window.__signal });
    else setTimeout(tick, 20);
  };
  tick();
});
/** Arms a recorder: a timestamp for each #sgm data-state/data-live and html data-night change (an `init` row first), the
 *  first click that reaches #pwr (read in the window's BUBBLE phase, after the disc's own handler: `after` is what the
 *  press did within its own dispatch) and, with o.quiet, the first level() peak under it after that click + the loudest
 *  read from then on. */
const ARM_REC = (o) => {
  const sgm = document.getElementById("sgm"), html = document.documentElement, p = document.getElementById("pwr"), s = window.__signal;
  const rec = { armed: performance.now(), origin: null, click: null, log: [], quietAt: null, maxAfter: 0 };
  const snap = (init) => rec.log.push({ t: performance.now(), init, state: sgm.getAttribute("data-state"),
    live: sgm.getAttribute("data-live"), night: html.hasAttribute("data-night") });
  snap(true);
  const mo = new MutationObserver(() => snap(false));
  mo.observe(sgm, { attributes: true, attributeFilter: ["data-state", "data-live"] });
  mo.observe(html, { attributes: true, attributeFilter: ["data-night"] });
  const onClick = (e) => {
    if (rec.click || !p || !(e.target === p || p.contains(e.target))) return;
    const now = performance.now(), ts = e.timeStamp;
    rec.click = { t: ts <= now && now - ts <= 1000 ? ts : now, now, trusted: e.isTrusted, after: sgm.getAttribute("data-state") };
  };
  addEventListener("click", onClick);
  const id = o && o.quiet && s ? setInterval(() => {
    if (!rec.click) return;
    const pk = s.level().peak;
    if (rec.quietAt === null) { if (pk < o.quiet) rec.quietAt = performance.now(); } else rec.maxAfter = Math.max(rec.maxAfter, pk);
  }, 4) : null;
  window.__gateRec = { rec, stop: () => { mo.disconnect(); removeEventListener("click", onClick); if (id !== null) clearInterval(id); } };
  return true;
};
const WAIT_STATE = (o) => new Promise((ok) => {   // until #sgm is o.want (and html data-night is o.night, when a boolean)
  const sgm = document.getElementById("sgm"), dev = sgm.querySelector(":scope > .device"), p = document.getElementById("pwr");
  const html = document.documentElement, g = window.__gateRec, s = window.__signal, t0 = performance.now();
  const tick = () => {
    const st = sgm.getAttribute("data-state"), n = html.hasAttribute("data-night"), now = performance.now();
    if ((st === o.want && (typeof o.night !== "boolean" || n === o.night)) || now - t0 > o.limitMs) {
      if (g) g.stop();
      ok({ state: st, night: n, live: sgm.getAttribute("data-live"), devLive: dev ? dev.getAttribute("data-live") : null,
        devCls: dev ? dev.classList.contains("live") : null, lit: p ? p.classList.contains("lit") : null,
        pressed: p ? p.getAttribute("aria-pressed") : null, level: s ? s.level() : null, ctx: s ? s.ctxState() : null,
        rec: g ? g.rec : null, waited: Math.round(now - t0), sy: Math.round(scrollY) });
    } else setTimeout(tick, 10);
  };
  tick();
});
/** The trusted KeyA's own time as the page's listeners see it (after the key door: a door-shadowed code reads ''), and
 *  the first 4 ms poll of level() over −60 dBFS after it (the surface's arithmetic, marked at THIS key). */
const ARM_KEY = () => {
  const s = window.__signal, sgm = document.getElementById("sgm");
  const g = { t: null, code: null, state: null, at: null, rms: 0 };
  const on = (e) => {
    if (!e.isTrusted || e.repeat || g.t !== null || String(e.key).toLowerCase() !== "a") return;
    const now = performance.now(), ts = e.timeStamp;
    g.t = ts <= now && now - ts <= 1000 ? ts : now;
    g.code = e.code;
    g.state = sgm ? sgm.getAttribute("data-state") : null;
  };
  addEventListener("keydown", on, true);
  const id = setInterval(() => {
    if (g.t === null || g.at !== null) return;
    const l = s.level();
    if (l.rms > 0.001) { g.at = performance.now(); g.rms = l.rms; }
  }, 4);
  window.__gateKey = { g, off: () => { clearInterval(id); removeEventListener("keydown", on, true); } };
  return { ctx: s.ctxState(), surfaceMs: s.firstSoundMs() };
};
const WAIT_KEY = (limitMs) => new Promise((ok) => {
  const k = window.__gateKey, s = window.__signal, t0 = performance.now();
  const tick = () => {
    const g = k.g;
    if (g.at !== null || performance.now() - t0 > limitMs) {
      k.off();
      const rms = g.at !== null ? g.rms : s.level().rms;
      setTimeout(() => ok({ ms: g.at !== null && g.t !== null ? g.at - g.t : null, keyed: g.t !== null, code: g.code, state: g.state,
        rms, ctx: s.ctxState(), surfaceMs: s.firstSoundMs() }), 30);   // the surface polls every 10 ms: its turn first
    } else setTimeout(tick, 10);
  };
  tick();
});
const DEVICE_BOX = () => {
  const d = document.querySelector("#sgm > .device"), r = d && d.getBoundingClientRect();
  return r ? { x: r.left, y: r.top, w: r.width, h: r.height, iw: innerWidth, ih: innerHeight } : null;
};
const PLAY_IN_VIEW = () => {   // the homepage: the play room scrolled to the viewport's top (the document scrolls on desks)
  document.documentElement.style.scrollBehavior = "auto";
  const p = document.getElementById("play");
  if (!p) return { found: false };
  p.scrollIntoView({ block: "start" });
  return new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const r = p.getBoundingClientRect();
    f({ found: true, top: Math.round(r.top), h: Math.round(r.height), y: Math.round(scrollY), ih: innerHeight });
  })));
};
const SCROLL_TOP = () => {   // the recorder's origin is the scroll itself
  const g = window.__gateRec, from = Math.round(scrollY);
  document.documentElement.style.scrollBehavior = "auto";
  g.rec.origin = performance.now();
  scrollTo(0, 0);
  return { from, y: Math.round(scrollY) };
};

// ── a PNG's mean light, node side (zlib only): Playwright's screenshots are 8-bit, non-interlaced grey/RGB(A) ──────
/** Y = the mean RELATIVE LUMINANCE (sRGB decoded to linear light, Rec. 709 weights): what the dark is judged on.
 *  luma = the mean gamma-encoded Rec. 601 luma, reported beside it. */
function pngLight(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) throw new Error("not a PNG");
  let off = 8, w = 0, h = 0, depth = 0, type = 0, lace = 0;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off), kind = buf.toString("latin1", off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len);
    if (kind === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; lace = data[12]; }
    else if (kind === "IDAT") idat.push(data);
    else if (kind === "IEND") break;
    off += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[type];
  if (depth !== 8 || !ch || lace) throw new Error(`PNG colour type ${type}, depth ${depth}, interlace ${lace}: not decoded here`);
  const raw = inflateSync(Buffer.concat(idat)), stride = w * ch, px = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], s = y * (stride + 1) + 1, o = y * stride, u = o - stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? px[o + i - ch] : 0, b = y ? px[u + i] : 0, c = y && i >= ch ? px[u + i - ch] : 0;
      let v = raw[s + i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[o + i] = v & 255;
    }
  }
  const lin = Array.from({ length: 256 }, (_, i) => { const s = i / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  let Y = 0, L = 0;
  for (let i = 0, n = w * h; i < n; i++) {
    const o = i * ch, r = px[o], g = ch >= 3 ? px[o + 1] : r, b = ch >= 3 ? px[o + 2] : r;
    Y += 0.2126 * lin[r] + 0.7152 * lin[g] + 0.0722 * lin[b];
    L += 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return { w, h, Y: Y / (w * h), luma: L / (w * h) / 255 };
}

// ════ R2 · THE LEG: power first; R1's loop, stop, shots and phone run through R1's own sections ══════════════════════
async function legR2(k) {
  const { name, browser, page, errs, row, step, listen, errLine } = k;
  const warns = [], bootNet = [];
  page.on("console", (m) => { if (m.type() === "warning") warns.push(m.text()); });
  page.on("response", (r) => { if (r.url().includes("/boot.m4a")) bootNet.push({ status: r.status(), len: r.headers()["content-length"] || "" }); });
  page.on("requestfailed", (r) => { if (r.url().includes("/boot.m4a")) bootNet.push({ status: `FAILED (${r.failure()?.errorText ?? "?"})`, len: "" }); });
  const ms = (x) => (typeof x === "number" ? `${Math.round(x)} ms` : "never");
  const rel = (x) => (typeof x === "number" ? `${x < -0.5 ? "−" : "+"}${Math.abs(Math.round(x))} ms` : "never");   // after the origin
  const pct = (x) => (Number.isFinite(x) ? `${(100 * x).toFixed(1)} %` : "∞");
  const when = (rec, pred, base) => { const e = rec ? rec.log.find((x) => !x.init && pred(x)) : null; return e ? e.t - base : null; };
  // the disc's centre from the page's own box; if that point does not hit the disc, Playwright's box (what a real hand
  // aims at) is tried, and the detail says so
  const aim = async (p, f) => {
    if (f.hit) return { x: f.x, y: f.y, how: "its getBoundingClientRect centre" };
    const b = await p.locator("#pwr").boundingBox().catch(() => null);
    return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2, how: `Playwright's box centre (the page's own centre hit ${f.hitDesc})` }
      : { x: f.x, y: f.y, how: `its page centre, which hit ${f.hitDesc} (no Playwright box)` };
  };
  const shotBox = async (p, file) => {   // the device box, clipped to the viewport; its light, decoded here
    const b = await p.evaluate(DEVICE_BOX);
    if (!b) throw new Error("no #sgm > .device to shoot");
    const x = Math.max(0, Math.ceil(b.x)), y = Math.max(0, Math.ceil(b.y));
    const clip = { x, y, width: Math.max(1, Math.floor(Math.min(b.x + b.w, b.iw) - x)), height: Math.max(1, Math.floor(Math.min(b.y + b.h, b.ih) - y)) };
    const buf = await p.screenshot({ path: file, clip });
    return { ...pngLight(buf), whole: b.y >= 0 && b.y + b.h <= b.ih + 0.5, file };
  };

  // (1) BOOT: R1's rows (muted, ready ≤ 10 s, rendered, no console errors)
  await bootRows(k);

  // (2) POWER FIRST: the device boots into STANDBY, dark, and answers only the disc
  step("standby");
  const pw0 = await page.evaluate(WAIT_POWER, 5000);
  await page.evaluate(SETTLE);
  await page.waitForTimeout(1000);                              // the first-sight flare (0.9 s) has passed
  const sb = await page.evaluate(POWER_FACTS);
  const dark = await shotBox(page, join(OUT, `${name}-standby.png`));
  row("power · standby at boot", sb.state === "standby" && sb.live === null && sb.devLive === null && sb.devCls === false && sb.root && sb.pwr && sb.lit === false,
    `#sgm[data-state] ${sb.state} · data-live ${sb.live ?? "absent"} (.device: ${sb.devLive ?? "absent"}, .live ${sb.devCls}) · #sgm > .device.sig.sig-device ${sb.root} · #pwr ${sb.pwr ? `in ${sb.slot}, lit ${sb.lit}, aria-pressed ${sb.pressed}` : `MISSING${pw0.pwr ? "" : " (never mounted in 5 s)"}`} · ctx ${sb.ctx}`);
  const dx = sb.dev ? sb.x - (sb.dev.l + sb.dev.w / 2) : NaN, dy = sb.dev ? sb.y - sb.dev.t : NaN;
  const topMid = !!sb.dev && Math.abs(dx) <= 4 && dy > 0 && dy <= 0.1 * sb.dev.h;
  row("power · the disc: top middle, hit", sb.pwr && sb.hit && topMid,
    `#pwr centre ${sb.x.toFixed(0)},${sb.y.toFixed(0)} (${sb.pw.toFixed(0)} px drawn) · ${dx >= 0 ? "+" : ""}${dx.toFixed(1)} px off the device's centre line · ${dy.toFixed(0)} px under its top edge (${sb.dev ? pct(dy / sb.dev.h) : "?"} of ${sb.dev ? sb.dev.h.toFixed(0) : "?"} px) · elementFromPoint → ${sb.hitDesc}`);

  // (3) THE PRESS: a trusted click at the disc's centre → boot at once → live within 2 s; the boot sound; the dark vs the lit
  step("power on");
  const a1 = await aim(page, sb);
  await page.evaluate(ARM_REC, {});
  await page.mouse.click(a1.x, a1.y);
  const on1 = await page.evaluate(WAIT_STATE, { want: "live", limitMs: 2500 });
  const c1 = on1.rec && on1.rec.click, b1 = c1 ? c1.t : on1.rec.armed;
  const boot1 = when(on1.rec, (e) => e.state === "boot", b1), live1 = when(on1.rec, (e) => e.state === "live", b1);
  row("power · trusted click → boot at once", !!c1 && c1.trusted === true && c1.after === "boot",
    c1 ? `click isTrusted ${c1.trusted} at ${a1.how} · data-state within the press's own dispatch: ${c1.after} (observed ${rel(boot1)}) · ctx ${sb.ctx} → ${on1.ctx}`
      : `NO click reached #pwr at ${a1.x.toFixed(0)},${a1.y.toFixed(0)} (${a1.how}) · data-state ${on1.state}`);
  row("power · live ≤ 2 s · data-live=1", on1.state === "live" && live1 !== null && live1 <= 2000 && on1.live === "1" && on1.devLive === "1" && on1.devCls === true,
    `live at ${rel(live1)} after the click (TRACE_MS 1380) · #sgm data-live ${on1.live ?? "absent"} · .device data-live ${on1.devLive ?? "absent"} · .device.live ${on1.devCls} · disc lit ${on1.lit} · aria-pressed ${on1.pressed}`);
  await page.waitForTimeout(1300);                              // the bulb-up (BULB_MS 950, its stagger ≤ 290 ms) is over
  const pwrWarns = warns.filter((w) => w.includes("[signal/power]"));
  row("power · boot sound: no error", errs.length === 0 && pwrWarns.length === 0 && bootNet.some((r) => r.status === 200),
    `${bootNet.length ? bootNet.map((r) => `boot.m4a HTTP ${r.status}${r.len ? ` (${r.len} B)` : ""}`).join(" · ") : "boot.m4a NEVER REQUESTED"} · [signal/power] warnings: ${pwrWarns.length ? pwrWarns.slice(0, 2).join(" | ").slice(0, 200) : "none"} · ${errLine(errs)} · under ?mute=1 it plays through a 0-gain straight to the destination (not heard, never in level())`);
  const lit = await shotBox(page, join(OUT, `${name}-live.png`));
  const rY = lit.Y > 0 ? dark.Y / lit.Y : Infinity, rL = lit.luma > 0 ? dark.luma / lit.luma : Infinity;
  row("power · standby dark (≤ 55 % of live)", rY <= 0.55,
    `mean relative luminance of the device box (linear sRGB, Rec. 709): standby ${dark.Y.toFixed(4)} / live ${lit.Y.toFixed(4)} = ${pct(rY)} · gamma luma (Rec. 601): ${dark.luma.toFixed(3)} / ${lit.luma.toFixed(3)} = ${pct(rL)} · ${dark.w}×${dark.h} px${dark.whole && lit.whole ? "" : " (CLIPPED by the viewport)"} · ${dark.file} · ${lit.file}`);

  // (4) FIRST SOUND: a trusted KeyA on the LIVE device
  step("first sound");
  const k0 = await page.evaluate(ARM_KEY);
  await page.keyboard.down("KeyA");
  const fs = await page.evaluate(WAIT_KEY, 3000);
  await page.keyboard.up("KeyA");
  const surf = fs.surfaceMs === null ? "null" : `${fs.surfaceMs.toFixed(0)} ms`;
  row("first sound < 200 ms (KeyA, live)", fs.ms !== null && fs.ms < 200, fs.ms !== null
    ? `${fs.ms.toFixed(1)} ms from the trusted KeyA's own timeStamp (seen as code ${fs.code || "'' (the key door took it)"} in state ${fs.state}) → rms > −60 dBFS, polled every 4 ms, rendered · ctx ${k0.ctx} at the key (the power press resumed it) · the surface's firstSoundMs ${surf}: marked at the power click (its first trusted pointerdown), so the trace + the bulb-up are inside it: reported, not judged`
    : `no sound in 3 s after KeyA · the key ${fs.keyed ? `was seen as code ${fs.code || "''"} in state ${fs.state}` : "was NOT seen by the page"} · ctx ${fs.ctx} · rms ${dB(fs.rms)} · the surface's firstSoundMs ${surf}`);

  // (5) THE LOOP (+ Chromium's 20 s at CPU 4×) and (6) THE MASTER STOP: R1's own sections
  await loopRows(k);
  await stopRows(k);

  // (7) SAVE / RELOAD: a reload is ARMED AND SILENT (R2): bpm + voice restore, drums.on comes back false, standby again
  step("reload");
  const c3 = await page.evaluate(CHANGE3);
  await page.waitForTimeout(900);                               // the store saves 250 ms after the last change
  const S0 = await page.evaluate(() => window.__signal.state());
  await page.reload({ waitUntil: "load", timeout: 30_000 });
  const rr = await page.evaluate(WAIT_READY, 12_000);
  await page.evaluate(WAIT_POWER, 5000);
  const S1 = rr.surface ? await page.evaluate(() => window.__signal.state()) : null;
  const af = await page.evaluate(POWER_FACTS);
  const lv = rr.surface ? await page.evaluate(() => window.__signal.level()) : { peak: 0, rms: 0 };
  const d = S1 ? diffState(S0, S1) : [];
  row("save/reload · armed and silent", !!S1 && Math.abs(S1.bpm - 100) < 1e-6 && S1.keys.voice === "pad" && S1.drums.on === false,
    S1 ? `after reload: bpm ${S1.bpm} · voice ${S1.keys.voice} · drums.on ${S1.drums.on} (set before it: ${c3.bpm} · ${c3.voice} · drums ${c3.drums}) · bass.on ${S1.bass.on} · arp ${S1.harmony.arp.on} · hold ${S1.harmony.hold} · ready ${rr.ready ? `at ${rr.at} ms` : "NO"} · ctx ${af.ctx} · peak ${dB(lv.peak)} · state() vs before: ${d.length ? `${d.length} diff(s): ${d.slice(0, 4).join(" | ")}` : "deepEqual"}`
      : "no __signal after the reload");
  row("save/reload · back in standby", af.state === "standby" && af.live === null && af.devCls === false && af.pwr && af.lit === false,
    `#sgm[data-state] ${af.state} · data-live ${af.live ?? "absent"} · .device.live ${af.devCls} · #pwr ${af.pwr ? `lit ${af.lit}, aria-pressed ${af.pressed}` : "MISSING"}`);

  // (8) POWERED AGAIN (a trusted click), then R1's shots at 1440 + 1024 with the keybed pinned: the device lit
  step("power again");
  await page.evaluate(SETTLE);
  const pa = await page.evaluate(POWER_FACTS);
  const a2 = await aim(page, pa);
  await page.evaluate(ARM_REC, {});
  await page.mouse.click(a2.x, a2.y);
  const on2 = await page.evaluate(WAIT_STATE, { want: "live", limitMs: 2500 });
  const b2 = on2.rec && on2.rec.click ? on2.rec.click.t : on2.rec.armed, live2 = when(on2.rec, (e) => e.state === "live", b2);
  await page.waitForTimeout(1300);
  await shotRows(k);

  // (9) POWER OFF: the beat on, a trusted click on the disc while live → standby within 2 s, silent, no data-live
  step("power off");
  await page.evaluate(SETTLE);
  let pre = await page.evaluate(POWER_FACTS), again = "";
  if (pre.state !== "live") {   // the shots' scroll let the room law take it (or the press above missed): power it first
    again = ` · it was ${pre.state} before the beat: pressed on again first`;
    const a = await aim(page, pre);
    await page.evaluate(ARM_REC, {});
    await page.mouse.click(a.x, a.y);
    await page.evaluate(WAIT_STATE, { want: "live", limitMs: 2500 });
    await page.waitForTimeout(300);
    pre = await page.evaluate(POWER_FACTS);
  }
  await page.evaluate(() => window.__signal.press("Space"));    // the beat on (a tap): the off has something to silence
  const beat = await page.evaluate(SAMPLE, 1200);
  const loud = Math.max(0, ...beat.xs.map(([, v]) => v));
  const a3 = await aim(page, pre);
  await page.evaluate(ARM_REC, { quiet: PEAK_QUIET });
  await page.mouse.click(a3.x, a3.y);
  const off = await page.evaluate(WAIT_STATE, { want: "standby", limitMs: 2500 });
  const co = off.rec && off.rec.click, b3 = co ? co.t : off.rec.armed;
  const pd = when(off.rec, (e) => e.state === "powerdown", b3), sbAt = when(off.rec, (e) => e.state === "standby", b3);
  const qAt = off.rec && off.rec.quietAt !== null ? off.rec.quietAt - b3 : null;
  row("power off · standby ≤ 2 s, silent", pre.state === "live" && loud > RMS_MIN && !!co && co.trusted === true && off.state === "standby"
      && sbAt !== null && sbAt <= 2000 && !!off.level && off.level.peak < PEAK_QUIET && off.live === null && off.devLive === null && off.devCls === false,
    `powered again after the reload: live at ${rel(live2)}${again} · the beat before the press: max rms ${dB(loud)} · trusted click (${co ? `isTrusted ${co.trusted}, '${co.after}' within its dispatch` : "NONE reached #pwr"}) → powerdown ${rel(pd)} → standby ${rel(sbAt)} · peak at standby ${off.level ? dB(off.level.peak) : "?"} (under 3e-5 from ${rel(qAt)}; the loudest read after that ${dB(off.rec ? off.rec.maxAfter : 0)}) · data-live ${off.live ?? "absent"} (.device ${off.devLive ?? "absent"}, .live ${off.devCls}) · disc lit ${off.lit} · ctx ${off.ctx}`);

  // (10) THE PHONE (Chromium): R1's section
  await phoneRows(k);

  // (11) THE HOMEPAGE (Chromium): the host's night + its scroll-away power-off, on the built site
  if (name === "chromium") {
    step("home");
    const hc = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const hp = await hc.newPage(), herrs = [];
    listen(hp, herrs);
    try {
      await hp.goto(`${BASE}/?mute=1`, { waitUntil: "load", timeout: 30_000 });
      const hw = await hp.evaluate(WAIT_POWER, 12_000);
      const pv = await hp.evaluate(PLAY_IN_VIEW);
      await hp.waitForTimeout(500);                             // the host's observers and its fit have run
      const h0 = await hp.evaluate(POWER_FACTS);
      const hs = join(OUT, `${name}-home-standby.png`);
      await hp.screenshot({ path: hs });
      row("home · #play in view: standby, day", pv.found && hw.pwr && h0.state === "standby" && !h0.night && h0.muted === true,
        `#play ${pv.found ? `top ${pv.top} (${pv.h} px tall) at scrollY ${pv.y}` : "MISSING"} · #pwr ${hw.pwr ? `mounted (ready ${hw.ready})` : "never mounted in 12 s"} · data-state ${h0.state} · html[data-night] ${h0.night ? "PRESENT" : "absent"} · out.muted() ${h0.muted} · elementFromPoint at the disc → ${h0.hitDesc} · ${hs}`);
      if (h0.muted !== true) throw new Error("home: the instrument is not muted: no input (sound safety)");
      const ha = await aim(hp, h0);
      await hp.evaluate(ARM_REC, {});
      await hp.mouse.click(ha.x, ha.y);
      const h1 = await hp.evaluate(WAIT_STATE, { want: "live", night: true, limitMs: 2500 });
      const hk = h1.rec && h1.rec.click, hb = hk ? hk.t : h1.rec.armed;
      const nOn = when(h1.rec, (e) => e.night, hb), hLive = when(h1.rec, (e) => e.state === "live", hb);
      await hp.waitForTimeout(1300);
      const hl = join(OUT, `${name}-home-live.png`);
      await hp.screenshot({ path: hl });
      row("home · power: night + live ≤ 2 s", h1.state === "live" && h1.night && nOn !== null && nOn <= 2000 && hLive !== null && hLive <= 2000,
        `trusted click at ${ha.how} (${hk ? `isTrusted ${hk.trusted}, '${hk.after}' within its dispatch` : "NONE reached #pwr"}) → html[data-night] ${rel(nOn)} · live ${rel(hLive)} · data-live ${h1.live ?? "absent"} · ${hl}`);
      await hp.evaluate(ARM_REC, {});
      const top = await hp.evaluate(SCROLL_TOP);
      const h2 = await hp.evaluate(WAIT_STATE, { want: "standby", night: false, limitMs: 2500 });
      const o = h2.rec.origin, hc2 = h2.rec.click;
      const hpd = when(h2.rec, (e) => e.state === "powerdown", o), hsb = when(h2.rec, (e) => e.state === "standby", o), hday = when(h2.rec, (e) => !e.night, o);
      row("home · scroll to top: standby + day ≤ 1.5 s", h2.state === "standby" && !h2.night && hsb !== null && hsb <= 1500 && hday !== null && hday <= 1500,
        `scrollY ${top.from} → ${top.y} · the host pressed the disc ${hc2 ? `at ${rel(hc2.t - o)} (isTrusted ${hc2.trusted})` : "NEVER"} · powerdown ${rel(hpd)} · data-night gone ${rel(hday)} · standby ${rel(hsb)} (1380 ms of it is the line running back) · data-live ${h2.live ?? "absent"}`);
      row("home · no console errors", herrs.length === 0, errLine(herrs));
    } finally { await hc.close().catch(() => {}); }
  }
}

async function leg(name) {
  const T0 = Date.now();
  let at = "start", browser = null;
  const say = (o) => process.stdout.write(JSON.stringify(o) + "\n");
  const step = (s) => { at = s; say({ step: s, ms: Date.now() - T0 }); };
  const row = (n, pass, detail = "") => say({ row: { name: n, pass: !!pass, detail: String(detail) } });
  const first = (e) => String(e?.message ?? e).split("\n")[0].slice(0, 300);
  process.on("unhandledRejection", (e) => say({ note: `${at}: unhandled rejection: ${first(e)}` }));
  process.on("uncaughtException", (e) => say({ note: `${at}: uncaught: ${first(e)}` }));
  const errs = [];
  const errLine = (list) => (list.length ? `${list.length}: ${list.slice(0, 3).join(" | ").slice(0, 360)}` : "0 errors");
  const listen = (p, list) => {
    p.on("pageerror", (e) => list.push(`[${at}] pageerror: ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error") list.push(`[${at}] console.error: ${m.text()}`); });
    p.on("crash", () => list.push(`[${at}] the page crashed`));
  };
  try {
    step("launch");
    const pw = await import(PW);
    const opts = { headless: true, timeout: 45_000 };
    if (name === "webkit") {   // rip-verify.mjs stands in for pw_run.sh and renames PushAPIEnabled on the inspector pipe
      process.env.RIP_WK_REAL = pw.webkit.executablePath();
      Object.assign(opts, { executablePath: process.execPath, ignoreDefaultArgs: true,
        args: [RIP_VERIFY, SHIM, "--inspector-pipe", "--headless", "--no-startup-window"] });
    }
    if (name === "firefox") opts.firefoxUserPrefs = { "media.volume_scale": "0.0" };   // a second mute under ?mute=1
    browser = await pw[name].launch(opts);
    say({ version: browser.version() });
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
    listen(page, errs);

    const k = { name, browser, page, errs, row, step, listen, errLine };
    if (R2) await legR2(k);
    else await legR1(k);
    row("no console errors (the whole leg)", errs.length === 0, errLine(errs));
  } catch (e) {
    row(`${at} · ran to its end`, false, first(e));
  } finally {
    step("close");
    if (browser) await Promise.race([browser.close().catch(() => {}), sleep(5000)]);   // the frozen WebKit takes ~30 s: capped
  }
  process.stdout.write(JSON.stringify({ done: true, ms: Date.now() - T0 }) + "\n", () => process.exit(0));
  await new Promise(() => {});   // exits in the write's callback (stdout is an async pipe on macOS)
}
if (LEG) await leg(LEG);

// ════ THE PARENT ════════════════════════════════════════════════════════════════════════════════════════════════
const rows = [];
const check = (who, width, name, pass, detail = "") => {
  const status = pass === "HUNG" ? "HUNG" : pass ? "PASS" : "FAIL";
  rows.push({ who, width, name, status, detail: String(detail) });
  console.log(`  ${status}  ${who} ${width || ""} ${name}`);
};
let chrome = null, server = null, ws = null, builder = null, cleaned = false, buildExit = null, errs = [];
// ── R1's children and what they leave ─────────────────────────────────────────────────────────────────────
const kids = new Set(), complete = [];
let pwBefore = new Set();
function psAll() {
  try {
    return execFileSync("ps", ["-ax", "-o", "pid=,ppid=,stat=,command="], { encoding: "utf8", maxBuffer: 32 << 20 }).split("\n")
      .map((l) => l.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/)).filter((m) => m && !m[3].startsWith("Z")) // a zombie is dead
      .map((m) => ({ pid: +m[1], ppid: +m[2], cmd: m[4] }));
  } catch { return []; }
}
/** Everything of this run's R1 alive now: the children and all under them, the WebKit shim (its per-run marker) and
 *  the ms-playwright processes that were not running at start and are orphaned (a SIGKILLed child's browser and its
 *  helpers, WebKit's launchd-spawned services). Someone else's live Playwright (parented, not ours) is never touched. */
function ours() {
  const all = psAll(), mine = new Set();
  for (const c of kids) if (all.some((x) => x.pid === c.pid)) mine.add(c.pid);
  for (const x of all) if (x.cmd.includes(SHIM) || (x.ppid === 1 && x.cmd.includes("ms-playwright") && !pwBefore.has(x.pid))) mine.add(x.pid);
  for (let grew = true; grew;) { grew = false; for (const x of all) if (!mine.has(x.pid) && mine.has(x.ppid)) { mine.add(x.pid); grew = true; } }
  return all.filter((x) => mine.has(x.pid));
}
function killOurs() {
  const list = ours();   // the tree is read BEFORE a child dies (after, its browser is an orphan: still caught)
  for (const c of kids) { try { process.kill(-c.pid, "SIGKILL"); } catch {} } // each child leads its own group
  for (const x of list) { try { process.kill(x.pid, "SIGKILL"); } catch {} }
  return list;
}
// ── kill discipline ─────────────────────────────────────────────────────────────────────────────────────
function cleanup() {
  if (cleaned) return; cleaned = true;
  try { builder?.kill("SIGTERM"); } catch {}
  try { ws?.close(); } catch {}
  if (chrome?.pid) {
    try { chrome.kill("SIGKILL"); } catch {}
    try { process.kill(-chrome.pid, "SIGKILL"); } catch {} // the group: GPU, renderer, network, storage helpers
  }
  if (LEGS) killOurs();
  if (server) { try { server.closeAllConnections(); server.close(); } catch {} }
}
function leaks() {
  if (LEGS) return ours().map((x) => `${x.pid} ${x.cmd.slice(0, 160)}`);
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
function killLine(sw, closed) {
  const n = (xs) => (xs.length ? `${xs.length} ALIVE (${xs.map((l) => l.split(" ")[0]).join(" ")})` : "none");
  const srv = closed === null ? `:${PORT} closing` : closed ? `:${PORT} closed` : `:${PORT} STILL ANSWERS`;
  const pass = sw.still.length === 0 && sw.found.length === 0 && closed !== false;
  if (!LEGS) return `KILL ${pass ? "PASS" : "FAIL"} · ${TAG} --headless probes: ${n(sw.still)}${sw.found.length ? ` (swept ${sw.found.length})` : ""} · ${srv}`;
  const left = ours(), shim = left.filter((x) => x.cmd.includes(SHIM)), pwl = left.filter((x) => x.cmd.includes("ms-playwright"));
  const kid = left.filter((x) => [...kids].some((c) => c.pid === x.pid));
  const foreign = psAll().filter((x) => x.cmd.includes("ms-playwright") && !pwBefore.has(x.pid) && !left.some((y) => y.pid === x.pid));
  const ok = pass && left.length === 0 && kid.length === 0;
  return `KILL ${ok ? "PASS" : "FAIL"} · gate children: ${kid.length ? `${kid.length} ALIVE` : "none"} · new ms-playwright pids of this run: ${pwl.length ? `${pwl.length} ALIVE` : "none"} · shim ${SHIM}: ${shim.length ? `${shim.length} ALIVE` : "none"}${sw.found.length ? ` (swept ${sw.found.length})` : ""} · ${srv}${foreign.length ? ` · ${foreign.length} foreign ms-playwright pid(s) left untouched` : ""}`;
}
function report() {
  const fails = rows.filter((r) => r.status === "FAIL"), hung = rows.filter((r) => r.status === "HUNG");
  const allPass = rows.length > 0 && fails.length === 0 && (!LEGS || complete.length > 0);
  if (LEGS) {
    console.log(`\n${"browser".padEnd(10)}${"assertion".padEnd(44)}${"pass".padEnd(6)}detail`);
    for (const r of rows) console.log(`${r.who.padEnd(10)}${r.name.padEnd(44)}${r.status.padEnd(6)}${r.detail}`);
  } else {
    console.log(`\n${"look".padEnd(6)}${"width".padEnd(7)}${"assertion".padEnd(27)}${"pass".padEnd(6)}detail`);
    for (const r of rows) console.log(`${r.who.padEnd(6)}${String(r.width).padEnd(7)}${r.name.padEnd(27)}${r.status.padEnd(6)}${r.detail}`);
  }
  try { writeFileSync(join(OUT, "gate.json"), JSON.stringify({ round: ROUND, at: new Date().toISOString(), buildExit, allPass, rows }, null, 2) + "\n"); } catch {}
  for (const h of hung) {
    console.log(`\n!!!!!!!!!! HUNG · ${h.who.toUpperCase()} · ${h.detail}`);
    console.log(`!!!!!!!!!! ${h.who} is REPORTED, NOT FAILED: its remaining assertions did NOT run. This is not a pass for ${h.who}.`);
  }
  const by = (st) => [...new Set(rows.filter((r) => r.status === st).map((r) => r.who))];
  console.log(`\ngate ${ROUND}: ${allPass ? (hung.length ? "ALL PASS in what ran" : "ALL PASS") : `${fails.length} FAIL${fails.length ? ` (${by("FAIL").join(" · ")})` : ""}`}${LEGS ? ` · ran to the end: ${complete.join(" · ") || "none"}${hung.length ? ` · HUNG, INCOMPLETE: ${by("HUNG").join(" · ")}` : ""}` : ""} · PNGs + gate.json in ${OUT}`);
  return allPass;
}
const bail = (why) => (e) => {
  console.error(`\ngate: ${why}${e instanceof Error ? ` · ${e.stack}` : ""}`);
  cleanup(); const sw = sweep();
  check("-", 0, "gate ran to the end", false, `${why}${sw.found.length ? ` · swept ${sw.found.length} probe(s)` : ""}`);
  report();
  console.log(killLine(sw, null));
  process.exit(1);
};
for (const s of ["SIGINT", "SIGTERM", "SIGHUP", "uncaughtException", "unhandledRejection"]) process.on(s, bail(s));
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
// ── R0 · CDP (the studio-mocks/cdp.mjs pattern, plus events, errors and timeouts) ──────────────────────────
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
const PIN_R0 = `(async () => { const s = ${SHOWN}[0], kb = s && s.querySelector(${JSON.stringify(KEYBED)});
  if (!kb) return { found: false };
  const fold = kb.getBoundingClientRect().bottom > innerHeight;
  kb.scrollIntoView({ block: "start", behavior: "instant" });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const r = kb.getBoundingClientRect();
  return { found: true, cls: kb.className, fold, top: Math.round(r.top), bottom: Math.round(r.bottom), ih: innerHeight, y: Math.round(scrollY) }; })()`;
const PHONE_R0 = `(() => { const see = (el) => { if (!el) return null; const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { display: cs.display, shown: cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0, h: Math.round(r.height) }; };
  return { phone: see(document.querySelector(".sig-phone")), host: see(document.querySelector(".sig-host")),
    coarse: matchMedia("(pointer: coarse)").matches, touch: navigator.maxTouchPoints, iw: innerWidth }; })()`;
const errLine = () => (errs.length ? `${errs.length}: ${errs.slice(0, 3).join(" | ").slice(0, 400)}` : "0 errors");
async function runR0() {
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
      const p = await ev(PIN_R0); await sleep(120); await shot(`${x}-${w}-keybed.png`);
      check(x, w, "keybed pinned in view", p.found && p.top >= -1 && p.bottom <= p.ih + 1, p.found
        ? `.${p.cls} top ${p.top} / bottom ${p.bottom} of ${p.ih} · scrollY ${p.y}${p.fold ? " · was below the fold" : " · was already in view"}`
        : "no keybed row in the shown look");
      check(x, w, "console clean", errs.length === 0, errLine());
    }
  }
  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await open(`${BASE}/signal/?look=a&mute=1`);
  const ph = await ev(PHONE_R0); await shot("phone-390.png");
  check("phone", 390, ".sig-phone visible", ph.phone?.shown,
    `display ${ph.phone?.display ?? "missing"} · ${ph.phone?.h ?? 0} px · innerWidth ${ph.iw} · pointer:coarse ${ph.coarse} · touch ${ph.touch}`);
  check("phone", 390, ".sig-host not displayed", ph.host?.display === "none", `display ${ph.host?.display ?? "missing"}`);
  check("phone", 390, "console clean", errs.length === 0, errLine());
}
// ── R1 + R2 · one child per browser, on the parent's clock ──────────────────────────────────────────────────────
function runLeg(browser) {
  return new Promise((done) => {
    const t0 = Date.now(), r = { browser, rows: 0, done: false, hung: false, step: "spawn", version: "", err: "", code: null, ms: 0 };
    const c = spawn(process.execPath, [SELF, "--r1-leg", browser, "--round", ROUND, "--port", String(PORT)],
      { cwd: REPO, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, GATE_SHIM: SHIM } });
    kids.add(c);
    let buf = "", settled = false, timer = null;
    const line = (l) => {
      let m; try { m = JSON.parse(l); } catch { return; }
      if (m.step) r.step = m.step;
      if (m.version) r.version = m.version;
      if (m.note) r.err += `\n${m.note}`;
      if (m.row) { r.rows++; check(browser, "", m.row.name, m.row.pass, m.row.detail); }
      if (m.done) r.done = true;
    };
    c.stdout.on("data", (d) => { buf += d; for (let i; (i = buf.indexOf("\n")) >= 0; buf = buf.slice(i + 1)) line(buf.slice(0, i)); });
    c.stderr.on("data", (d) => { r.err = (r.err + d).slice(-4000); });
    const finish = () => {
      if (settled) return; settled = true;
      clearTimeout(timer); r.ms = Date.now() - t0;
      killOurs();              // while the child is still in `kids`: its whole tree, if anything of it is left
      kids.delete(c);
      done(r);
    };
    timer = setTimeout(() => { r.hung = true; killOurs(); setTimeout(finish, 3000); }, LEG_MS);
    c.on("error", (e) => { r.err += `\nspawn: ${e.message}`; finish(); });
    c.on("close", (code, sig) => { r.code = code ?? sig; finish(); });
  });
}
async function runR1() {
  for (const b of BROWSERS) {
    if (!["chromium", "webkit", "firefox"].includes(b)) { check(b, "", "a known browser", false, "chromium · webkit · firefox"); continue; }
    console.log(`\n── ${b} · its own child, ${LEG_MS / 1000} s on the parent's clock`);
    const r = await runLeg(b);
    const tail = r.err.trim().split("\n").filter(Boolean).slice(-3).join(" ⏎ ").slice(0, 320);
    if (r.hung) check(b, "", "HUNG", "HUNG", `no answer in ${LEG_MS / 1000} s at "${r.step}" · SIGKILLed with its browser · ${r.rows} assertion(s) came before${tail ? ` · ${tail}` : ""}`);
    else if (r.done) complete.push(b);
    if (!r.hung && !r.done) check(b, "", "the leg ran to the end", false, `child exit ${r.code} at "${r.step}"${tail ? ` · ${tail}` : ""}`);
    console.log(`   ${b} ${r.version || "(no version)"} · ${(r.ms / 1000).toFixed(1)} s${r.hung ? " · HUNG" : ""}${!r.hung && tail ? ` · notes: ${tail}` : ""}`);
  }
}
// ── the run ─────────────────────────────────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
if (LEGS) pwBefore = new Set(psAll().filter((x) => x.cmd.includes("ms-playwright")).map((x) => x.pid)); // never touched
console.log(`gate ${ROUND} · ${REPO} → ${BASE}/signal/ · ${LEGS ? `Playwright ${BROWSERS.join(" · ")}, ${LEG_MS / 1000} s each · ${pwBefore.size} ms-playwright pid(s) running before (never touched)` : `CDP :${CDP_PORT}`}`);
try {
  buildExit = await build();
  if (buildExit === 0) {
    server = await serveDist({ port: PORT });
    if (LEGS) await runR1(); else await runR0();
  }
} catch (e) { check("-", 0, "gate ran to the end", false, e.message); }
finally { cleanup(); }
const sw = sweep();
check("-", 0, LEGS ? "nothing of this run survives" : `no leaked ${TAG} probes`, sw.found.length === 0, sw.found.length
  ? `swept ${sw.found.length}: ${sw.found.join(" | ").slice(0, 240)} · still alive ${sw.still.length}`
  : LEGS ? "children · their browsers · the shim · new orphaned ms-playwright pids → nothing" : `pgrep -fl -- --headless | grep ${TAG} → nothing`);
const closed = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1500) }).then(() => false, () => true);
const ok = report();
console.log(killLine(sw, closed));
process.exit(ok && closed && sw.still.length === 0 ? 0 : 1);
