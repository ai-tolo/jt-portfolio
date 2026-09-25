#!/usr/bin/env node
// gate · the SIGNAL round gate (branch `signal`; R0 + R1 + R2 2026-09-23, R3 + R4 2026-09-24, R5 2026-09-25). One command, one verdict:
//   source ~/.nvm/nvm.sh && node scripts/signal/gate.mjs [--round r0|r1|r2|r3|r4|r5] [--skip-build] [--looks a,b,c] [--only chromium,webkit,firefox]
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
//   (`--round r2`): boot as R1 → POWER FIRST: #sgm[data-state] 'standby' with no data-live, the power #pwr
//   hit-testable (R2–R3: the disc, at the device's top middle; R4: the switch, anywhere inside the device), the device
//   box shot DARK (<browser>-standby.png) → a TRUSTED click at the power's centre (page.mouse.click): 'boot' within the
//   press's own dispatch, 'live' + data-live="1" within 2 s, the boot sound without an error (?mute=1 plays it through a
//   0-gain: no error is the whole assertion), the lit box (<browser>-live.png): the standby's mean relative luminance
//   (linear, Rec. 709) at most 55 % of the live's →
//   first sound: a trusted KeyA on the live device, < 200 ms from the key's own timeStamp to rms > −60 dBFS (the gate
//   measures it: the surface's firstSoundMs marks the power click, its first trusted pointerdown, and is reported,
//   never judged) → the loop, the throttle, the master stop (R1's own sections) → save/reload: ARMED AND SILENT (bpm +
//   voice restore, drums.on comes back false, the device back in standby) → powered again, R1's shots (lit) → POWER
//   OFF: the beat on, a trusted click on the power → 'standby' within 2 s, level().peak < 3e-5, no data-live → R1's
//   phone (Chromium) → THE HOMEPAGE (Chromium): /?mute=1 at 1440×900, #play scrolled into view: 'standby' and no
//   html[data-night]; a trusted click → data-night and 'live' within 2 s; scrolled to the top → 'standby' and
//   data-night gone within 1.5 s (+ <browser>-home-standby.png, <browser>-home-live.png).
// R3 · NOTES-SIGNAL-R3.md §3 (THE FIRST-TIMER ROUND, `--round r3`): R2's leg with these sections after the first sound:
//   KEYMAP (X C V N and Digit1, tapped through the surface AND as trusted keys, change nothing; no keycap draws them) ·
//   HOLD UNDER CHORD (the on-screen HOLD + CHORD caps: a new chord SWITCHES the held one; HOLD alone is a pedal) ·
//   DORMANT (the contract's pairs carry .dormant at the defaults and wake when their parent turns on) · KEYCAPS (one
//   visible .sg-key per taught KEYMAP code; a trusted key presses + lights its cap and a piano key) · THE SIZE FLOOR
//   (control words ≥ 12 px, screen numerals ≥ 22 px, BPM the largest) → R2's loop (the arp by its on-screen cap: V is
//   gone) + stop + reload → powered again → R2's shots + THE FIT (1440: 96–99.5 % of the page's content width, clear
//   of the nav rail by ≥ 1 %; 1024: the clearance only) → the module PNGs (<browser>-mod-{drums,keys,bass,top,keybed}.png)
//   and one pressed state (<browser>-pressed.png: KeyA + KeyZ held, the drums on) → R2's power off, phone, home.
// R4 · NOTES-SIGNAL-R4.md §1.5 (THE RENDER ROUND, `--round r4`): R3's leg (legR2 with r3 + r4), every change gated on
//   r4 so r0–r3 run as they did: THE SWITCH (`power · the switch: hit-testable, toggles the state`: #pwr hit-testable,
//   its centre anywhere inside the device box, where it stands printed; the trusted click → boot → live, the boot sound,
//   the dark and the power-off rows are R2's) · THE LOOP holds a CHORD, no arp (the arp left the surface: drums + bass
//   seq + C E G held, rms > −60 dBFS after 4 bars; the throttle rides the same loop) · DORMANT without the three arp
//   knobs and their "arp on" wake · the size floor's BPM rivals take the keys' foot glass too (.kv-clabel) · THE TITLES
//   (a section after the size floor, read while live: DRUMS · KEYS · BASS visible, each centred within 3 px over its
//   tower and above its top, ≥ 16 px, three different inks) · the module PNGs <browser>-mod-{drums,keys,bass,head,
//   keybed,switch}.png. The keymap, hold, keycap, fit, reload, stop, phone and home rows are R3's.
// R5 · NOTES-SIGNAL-R5.md §1.4 (THE COMPARTMENT ROUND, `--round r5`): R4's leg (legR2 with r3 + r4 + r5), the new rows
//   gated on r5 so r0–r4 run as they did: four sections after the keycaps, read while live (the standby makes all but #pwr
//   inert) · THE KEY (`key · click steps, drag walks`: a trusted page.mouse.click at [data-ctl="key"]'s centre → music.key
//   + 1 mod 12 within 150 ms of the release, the screen's b printing its sharp name; a trusted drag from that centre, 30 px
//   DOWN in 3 moves → 1–5 steps back (2 at 14 px a step), the screen matching the state; k0 back by harmony.set('music'))
//   · THE SCALE (`scale · MAJ / MIN toggle`: MAJ .on + aria-pressed at the default; a trusted click on MIN → 'minor', its
//   button lit, the piano's .sgh-w.color set re-assigned; a trusted click on MAJ → all of it back; no [data-ctl="key-"] /
//   [data-ctl="key+"] on the device and no .sg-cap in [data-ctl="keycaps"] printing an arrow) · THE RAIL (`rail · the
//   window line, no names`: no .sgh-oname and no text in .sgh-rail; its .sgh-win shown, wider than 0, inside the rail's
//   box) · THE FOOT (`keys foot · CHORD · glass · HOLD`: [data-slot="keys"] .kv-harm's own [data-ctl] children are chord ·
//   chord-glass · hold, the glass wider than either cap). The rest (the switch, the titles, the loop's chord with the arp
//   off, dormant, keycaps, the size floor, hold, fit, reload, stop, phone, home, the module + pressed shots) is R4's.
// KILL DISCIPLINE · R0: Chrome's whole process group. R1 + R2: each child and everything under it, the WebKit shim (by this
//   run's marker) and every ms-playwright process that was not running at start and has been orphaned. SIGKILLed, the
//   server closed, in `finally` AND on SIGINT/SIGTERM/SIGHUP/uncaughtException; the last line proves none survives.
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { serveDist } from "./serve-dist.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const ROUND = arg("round", "r0"), TAG = `${ROUND}-gate`, R1 = ROUND === "r1", R2 = ROUND === "r2", R3 = ROUND === "r3";
const R4 = ROUND === "r4";                                                       // R3's leg with the r4 hooks (NOTES-SIGNAL-R4.md §1.5)
const R5 = ROUND === "r5";                                                       // R4's leg with the r5 rows (NOTES-SIGNAL-R5.md §1.4)
const LEGS = R1 || R2 || R3 || R4 || R5;                                         // the Playwright rounds: one child per browser
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
const LEG_MS = Number(arg("leg-ms", R3 || R4 || R5 ? 180_000 : 120_000));       // each browser's clock (a knob for proving the HUNG path)
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
const LOOP = (arpBy) => {   // NOTES-SIGNAL-R1 §4 (3), through the real keymap's actions (the context already runs)
  const s = window.__signal, i = s.instrument;
  s.press("Space");                                          // drums on (a tap)
  s.press("KeyB");                                           // bass on …
  i.bass.set("mode", "seq");                                 // … in SEQ, via state
  for (const k of ["KeyA", "KeyD", "KeyG"]) s.press(k, true); // C E G held
  let how;
  if (arpBy === "chord") how = "chord";                      // R4: the arp left the surface; the held chord is the keys' part
  else if (arpBy === "click") {                              // R3: V left the keyboard; the arp is its on-screen cap
    how = s.click('[data-ctl="arp"]') ? 'click [data-ctl="arp"]' : "NO [data-ctl=arp]: harmony.set('arp') instead";
    if (!s.state().harmony.arp.on) i.harmony.set("arp", { ...i.harmony.state().arp, on: true });
  } else s.press("KeyV");                                    // the arp
  const st = s.state();
  return { drums: st.drums.on, bass: st.bass.on, mode: st.bass.mode, arp: st.harmony.arp.on, bpm: st.bpm,
    clock: i.time.running(), held: i.keys.held().length, how };
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
async function loopRows(k) {
  const { name, page, row, step } = k;
  // (3) THE LOOP: drums · bass seq · a held chord · the arp (R4: the chord alone: the arp left the surface); 4 bars;
  // Chromium also 20 s at CPU throttle 4×, riding the same loop
  step("loop");
  const lp = await page.evaluate(LOOP, k.r4 ? "chord" : "click");   // R3: KeyV is gone from the contract; r1–r3 turn the arp on through the cap
  const barMs = 240_000 / lp.bpm;
  const four = await page.evaluate(SAMPLE, Math.round(4 * barMs + 150));
  const bar4 = four.xs.filter(([t]) => t >= 3 * barMs).map(([, v]) => v);
  const keysPart = k.r4 ? `chord (${lp.held} held) · arp ${lp.arp ? "ON" : "OFF"}`
    : `arp ${lp.arp ? "on" : "OFF"}${lp.how ? ` (${lp.how})` : ""} · ${lp.held} held`;
  row("loop · 4 bars > −60 dBFS", four.end.rms > RMS_MIN && lp.drums && lp.bass && lp.mode === "seq" && (k.r4 ? lp.held === 3 : lp.arp),
    `rms ${dB(four.end.rms)} after 4 bars (${(4 * barMs / 1000).toFixed(1)} s @ ${lp.bpm} bpm) · bar 4 min ${dB(Math.min(...bar4))} / median ${dB(median(bar4))} · drums ${lp.drums ? "on" : "OFF"} · bass ${lp.bass ? lp.mode : "OFF"} · ${keysPart} · gaps ${four.g1.gaps}`);
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
async function shotRows(k) {
  const { name, page, row, step } = k;
  // (6) SHOTS: 1440×900 + 1024×768 + the keybed row pinned (R3: + THE FIT, read before the keybed pin scrolls)
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
    if (k.r3) await fitRows(k, w);
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
const POWER_FACTS = () => {   // the host contract as the page holds it now, and where a hand would press the power (#pwr)
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
    x, y, pw: pr ? pr.width : 0, ph: pr ? pr.height : 0, hit: !!(p && hitEl && (hitEl === p || p.contains(hitEl))), hitDesc: desc(hitEl),
    dev: dr ? { l: dr.left, t: dr.top, w: dr.width, h: dr.height } : null, night: html.hasAttribute("data-night"),
    ctx: window.__signal ? window.__signal.ctxState() : null, muted, ih: innerHeight, sy: Math.round(scrollY) };
};
const WAIT_POWER = (limitMs) => new Promise((ok) => {   // #pwr mounts once the boot resolves (Signal.astro's script)
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
 *  first click that reaches #pwr (read in the window's BUBBLE phase, after the power's own handler: `after` is what the
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

// (the size-floor rows compare with a 0.01 px tolerance: WebKit reports a 12 px word under the host's zoom as 11.999999 px)
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
  const PWR = k.r4 ? "switch" : "disc";   // the details' word for #pwr (R2–R3 the disc, R4 THE SWITCH)
  // the power's centre from the page's own box; if that point does not hit #pwr, Playwright's box (what a real hand
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

  // (2) POWER FIRST: the device boots into STANDBY, dark, and answers only the power (#pwr)
  step("standby");
  const pw0 = await page.evaluate(WAIT_POWER, 5000);
  await page.evaluate(SETTLE);
  await page.waitForTimeout(1000);                              // the first-sight flare (0.9 s) has passed
  const sb = await page.evaluate(POWER_FACTS);
  const dark = await shotBox(page, join(OUT, `${name}-standby.png`));
  row("power · standby at boot", sb.state === "standby" && sb.live === null && sb.devLive === null && sb.devCls === false && sb.root && sb.pwr && sb.lit === false,
    `#sgm[data-state] ${sb.state} · data-live ${sb.live ?? "absent"} (.device: ${sb.devLive ?? "absent"}, .live ${sb.devCls}) · #sgm > .device.sig.sig-device ${sb.root} · #pwr ${sb.pwr ? `in ${sb.slot}, lit ${sb.lit}, aria-pressed ${sb.pressed}` : `MISSING${pw0.pwr ? "" : " (never mounted in 5 s)"}`} · ctx ${sb.ctx}`);
  const dx = sb.dev ? sb.x - (sb.dev.l + sb.dev.w / 2) : NaN, dy = sb.dev ? sb.y - sb.dev.t : NaN;
  if (k.r4) {   // R4 §1.5 (1): THE SWITCH stands where its lane put it (the brief: any place): inside the device, hit-testable
    const fromR = sb.dev ? sb.dev.l + sb.dev.w - sb.x : NaN;
    const inside = !!sb.dev && sb.x >= sb.dev.l && sb.x <= sb.dev.l + sb.dev.w && sb.y >= sb.dev.t && sb.y <= sb.dev.t + sb.dev.h;
    row("power · the switch: hit-testable, toggles the state", sb.pwr && sb.hit && inside,
      `${sb.pwr ? `#pwr centre ${sb.x.toFixed(0)},${sb.y.toFixed(0)} (${sb.pw.toFixed(0)}×${sb.ph.toFixed(0)} px drawn, in ${sb.slot}) · ${fromR.toFixed(0)} px from the device's right edge, ${dy.toFixed(0)} px under its top: ${inside ? "inside" : "OUTSIDE"} the ${sb.dev ? `${sb.dev.w.toFixed(0)}×${sb.dev.h.toFixed(0)}` : "?"} px device` : `#pwr MISSING${pw0.pwr ? "" : " (never mounted in 5 s)"}`} · elementFromPoint → ${sb.hitDesc} · the toggle: the trusted clicks below (standby → boot → live, then live → standby)`);
  } else {
    const topMid = !!sb.dev && Math.abs(dx) <= 4 && dy > 0 && dy <= 0.1 * sb.dev.h;
    row("power · the disc: top middle, hit", sb.pwr && sb.hit && topMid,
      `#pwr centre ${sb.x.toFixed(0)},${sb.y.toFixed(0)} (${sb.pw.toFixed(0)} px drawn) · ${dx >= 0 ? "+" : ""}${dx.toFixed(1)} px off the device's centre line · ${dy.toFixed(0)} px under its top edge (${sb.dev ? pct(dy / sb.dev.h) : "?"} of ${sb.dev ? sb.dev.h.toFixed(0) : "?"} px) · elementFromPoint → ${sb.hitDesc}`);
  }

  // (3) THE PRESS: a trusted click at the power's centre → boot at once → live within 2 s; the boot sound; the dark vs the lit
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
    `live at ${rel(live1)} after the click (TRACE_MS 1380) · #sgm data-live ${on1.live ?? "absent"} · .device data-live ${on1.devLive ?? "absent"} · .device.live ${on1.devCls} · ${PWR} lit ${on1.lit} · aria-pressed ${on1.pressed}`);
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

  // R3 (NOTES-SIGNAL-R3 §3 rows 1–5): the taught keymap, HOLD under CHORD, the dormant pairs, the keycaps, the size floor
  // (+ R4 §1.5 (8): the titles, read here while the device is live: the standby greys all three to one engraving)
  // (+ R5 §1.4 (1)–(4), after the keycaps, live: the KEY screen's click + drag, the MAJ · MIN toggle, the rail's window
  // line, the keys' foot)
  const r5Secs = k.r5 ? [keyRows, scaleRows, railRows, footRows] : [];
  if (k.r3) for (const sec of [keymapRows, holdRows, dormantRows, keycapRows, ...r5Secs, floorRows, ...(k.r4 ? [titleRows] : [])]) {
    try { await sec(k); }                                     // one section's throw is its own red row; the leg runs on
    catch (e) { row(`${sec.name} · ran to its end`, false, String(e?.message ?? e).split("\n")[0].slice(0, 300)); }
  }

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
  if (k.r3) await moduleShotRows(k, aim);   // R3 §3 (7): back at 1440×900, powered: each module + one pressed state

  // (9) POWER OFF: the beat on, a trusted click on the power while live → standby within 2 s, silent, no data-live
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
    `powered again after the reload: live at ${rel(live2)}${again} · the beat before the press: max rms ${dB(loud)} · trusted click (${co ? `isTrusted ${co.trusted}, '${co.after}' within its dispatch` : "NONE reached #pwr"}) → powerdown ${rel(pd)} → standby ${rel(sbAt)} · peak at standby ${off.level ? dB(off.level.peak) : "?"} (under 3e-5 from ${rel(qAt)}; the loudest read after that ${dB(off.rec ? off.rec.maxAfter : 0)}) · data-live ${off.live ?? "absent"} (.device ${off.devLive ?? "absent"}, .live ${off.devCls}) · ${PWR} lit ${off.lit} · ctx ${off.ctx}`);

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
        `#play ${pv.found ? `top ${pv.top} (${pv.h} px tall) at scrollY ${pv.y}` : "MISSING"} · #pwr ${hw.pwr ? `mounted (ready ${hw.ready})` : "never mounted in 12 s"} · data-state ${h0.state} · html[data-night] ${h0.night ? "PRESENT" : "absent"} · out.muted() ${h0.muted} · elementFromPoint at the ${PWR} → ${h0.hitDesc} · ${hs}`);
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
        `scrollY ${top.from} → ${top.y} · the host pressed the ${PWR} ${hc2 ? `at ${rel(hc2.t - o)} (isTrusted ${hc2.trusted})` : "NEVER"} · powerdown ${rel(hpd)} · data-night gone ${rel(hday)} · standby ${rel(hsb)} (1380 ms of it is the line running back) · data-live ${h2.live ?? "absent"}`);
      row("home · no console errors", herrs.length === 0, errLine(herrs));
    } finally { await hc.close().catch(() => {}); }
  }
}

// ════ R3 · THE FIRST-TIMER ROUND (NOTES-SIGNAL-R3.md §3): in page (self-contained, one argument) ═══════════════════
/** The taught set (types.ts KEYMAP, R3), hardcoded: the page does not expose the map. */
const R3_TAUGHT = ["Space", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "KeyW", "KeyE", "KeyT",
  "KeyY", "KeyU", "KeyO", "KeyB", "KeyZ", "KeyM", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Equal", "Escape"];
/** What R3 took off the keyboard: X HOLD · C CHORD · V ARP · N LOCK, and the pads' digits. */
const R3_GONE = ["KeyX", "KeyC", "KeyV", "KeyN", "Digit1"];
/** The contract's dormant pairs (types.ts CTL comment), as the gate finds them on the device. */
const R3_DORMANT = ['[data-ctl="drums-fb"]', '[data-ctl="drums-time"]', '[data-ctl="keys-rate"]', '[data-ctl="keys-shape"]',
  '[data-ctl="arp-rate"]', '[data-ctl="arp-length"]', '[data-ctl="arp-groove"]', '[data-ctl="bass-strip"]',
  '.sg-key[data-code="KeyR"]', '.sg-key[data-code="KeyI"]'];
/** R4 (NOTES-SIGNAL-R4 §1.5 (3)): R3's list minus the three arp knobs (the arp left the surface with its cap). */
const R4_DORMANT = R3_DORMANT.filter((sel) => !/"arp-(rate|length|groove)"/.test(sel));
/** R4 (§1.5 (5)): BPM's rivals, the chord glass's name under both of its names (r3 code draws it in the hands' top strip,
 *  .sgh-clabel; r4 code in the keys' foot, .kv-clabel). */
const R4_RIVALS = ".sig .sg-screen > b, .sig .sgh-clabel, .sig .kv-clabel";
const KM_SNAP = () => {   // what an unmapped key could have changed, and which codes the surface draws
  const s = window.__signal, i = s.instrument, st = s.state();
  let snd = null;
  try { snd = i.harmony.sounding().map((x) => x[1]).join(" "); } catch { snd = "n/a"; }
  return { hold: st.harmony.hold, chord: st.harmony.chord, arp: st.harmony.arp.on, armed: st.bass.armed,
    rack: JSON.stringify(st.harmony.rack), held: i.keys.held().length, sounding: snd, drums: st.drums.on, bass: st.bass.on,
    drawn: [...document.querySelectorAll(".sig .sg-key[data-code]")].map((e) => e.dataset.code) };
};
const KM_TAP = (codes) => { for (const c of codes) window.__signal.press(c); return true; };   // taps (on omitted)
const HOLD_RUN = async () => {   // §3 (2): both hold rows in one pass, every step recorded
  const s = window.__signal, i = s.instrument, w = (ms) => new Promise((r) => setTimeout(r, ms));
  const snd = () => { try { return i.harmony.sounding().map((x) => x[1]).sort((a, b) => a - b); } catch { return null; } };
  const ap = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return "missing";
    const a = e.getAttribute("aria-pressed") ?? e.querySelector("[aria-pressed]")?.getAttribute("aria-pressed");
    return a ?? "no aria-pressed";
  };
  const steps = {};
  const rec = (tag) => {
    const h = s.state().harmony;
    steps[tag] = { snd: snd(), held: i.keys.held().length, down: document.querySelectorAll(".sig .sg-key.pressed").length,
      hold: h.hold, chord: h.chord, apHold: ap('[data-ctl="hold"]'), apChord: ap('[data-ctl="chord"]') };
  };
  const out = { steps, has: typeof i.harmony.sounding === "function" };
  rec("before");
  // a new chord switches
  out.cHold = s.click('[data-ctl="hold"]');
  out.cChord = s.click('[data-ctl="chord"]');
  await w(40); rec("on");
  s.press("KeyA"); await w(60); rec("A");
  s.press("KeyF"); await w(60); rec("F");
  await w(300); rec("F+300");
  out.cHoldOff = s.click('[data-ctl="hold"]');
  await w(60); rec("off");
  // the pedal without chord
  out.cChordOff = s.click('[data-ctl="chord"]');
  out.cHoldOn = s.click('[data-ctl="hold"]');
  await w(40); rec("pedal");
  out.mA = i.harmony.midiFor(0, false); out.mD = i.harmony.midiFor(4, false);
  s.press("KeyA"); await w(60); rec("pA");
  s.press("KeyD"); await w(60); rec("pD");
  s.press("KeyA"); await w(60); rec("pA2");
  out.cHoldOff2 = s.click('[data-ctl="hold"]');
  await w(60); rec("pOff");
  // whatever happened above, the rest of the leg starts with HOLD and CHORD off (not judged: the rows read the steps)
  const h = s.state().harmony;
  out.forced = [];
  if (h.hold) { i.harmony.set("hold", false); out.forced.push("hold"); }
  if (h.chord) { i.harmony.set("chord", false); out.forced.push("chord"); }
  if (out.forced.length) await w(40);
  rec("end");
  return out;
};
const DORM_READ = (sels) => sels.map((sel) => {
  const e = document.querySelector(`.sig ${sel}`);
  return { sel, st: e ? (e.classList.contains("dormant") ? "dormant" : "awake") : "missing" };
});
const DORM_WAKE = async (sels) => {   // §3 (3): each parent on → its children awake; each parent back → dormant again
  const i = window.__signal.instrument, w = (ms) => new Promise((r) => setTimeout(r, ms));
  const read = (xs) => xs.map((sel) => { const e = document.querySelector(`.sig ${sel}`); return e ? (e.classList.contains("dormant") ? "dormant" : "awake") : "missing"; });
  const poll = async (xs, want) => {   // a microtask + 50 ms, then every 10 ms up to 300 ms: the time it took is reported
    const t0 = performance.now();
    await Promise.resolve(); await w(50);
    for (;;) {
      const r = read(xs), t = performance.now() - t0;
      if (r.every((x) => x === want) || t > 300) return { ok: r.every((x) => x === want), ms: Math.round(t), r };
      await w(10);
    }
  };
  const pick = (...ctl) => sels.filter((sel) => ctl.some((c) => sel.includes(`"${c}"`)));   // by name: R3's list → sels[0..7]
  const groups = [
    { name: "drums delay mix .5", kids: pick("drums-fb", "drums-time"), on: () => i.drums.set("delay", { ...i.drums.state().delay, mix: 0.5 }), off: () => i.drums.set("delay", { ...i.drums.state().delay, mix: 0 }) },
    { name: "keys motion .5", kids: pick("keys-rate", "keys-shape"), on: () => i.keys.set("motion", { ...i.keys.state().motion, amount: 0.5 }), off: () => i.keys.set("motion", { ...i.keys.state().motion, amount: 0 }) },
    { name: "arp on", kids: pick("arp-rate", "arp-length", "arp-groove"), on: () => i.harmony.set("arp", { ...i.harmony.state().arp, on: true }), off: () => i.harmony.set("arp", { ...i.harmony.state().arp, on: false }) },
    { name: "bass seq", kids: pick("bass-strip"), on: () => i.bass.set("mode", "seq"), off: () => i.bass.set("mode", "drone") },
  ].filter((g) => g.kids.length);   // R4's list has no arp knob: no "arp on" group (the gate never switches the arp on)
  const out = [];
  for (const g of groups) {
    g.on();
    const wake = await poll(g.kids, "awake");
    g.off();
    const back = await poll(g.kids, "dormant");
    out.push({ name: g.name, kids: g.kids, wake, back });
  }
  return out;
};
const CAPS_DRAWN = (codes) => {
  const all = [...document.querySelectorAll(".sig .sg-key[data-code]")];
  return { per: codes.map((c) => { const els = all.filter((e) => e.dataset.code === c); return { c, n: els.length, vis: els.filter((e) => e.getClientRects().length > 0).length }; }),
    extra: [...new Set(all.map((e) => e.dataset.code).filter((c) => !codes.includes(c)))], total: all.length };
};
/** Optionally taps `tap` through the surface, then polls every 5 ms until every check holds or limitMs passes. A check
 *  is { sel, has?: [classes], lacks?: [classes] } on the first match, or { sel, any: true }: some element matches. */
const WAIT_CAPS = ({ tap, checks, limitMs }) => new Promise((ok) => {
  if (tap) window.__signal.press(tap);
  const t0 = performance.now();
  const read = () => checks.map((c) => {
    if (c.any) { const n = document.querySelectorAll(c.sel).length; return { sel: c.sel, ok: n > 0, got: `${n} match` }; }
    const e = document.querySelector(c.sel);
    if (!e) return { sel: c.sel, ok: false, got: "missing" };
    const cls = [...e.classList].filter((x) => ["pressed", "lit", "latched", "dormant"].includes(x));
    const good = (c.has || []).every((x) => e.classList.contains(x)) && (c.lacks || []).every((x) => !e.classList.contains(x));
    return { sel: c.sel, ok: good, got: cls.length ? `.${cls.join(".")}` : "no state class" };
  });
  const tick = () => {
    const r = read(), t = performance.now() - t0;
    if (r.every((x) => x.ok) || t > limitMs) ok({ ok: r.every((x) => x.ok), ms: Math.round(t), r, drums: window.__signal.state().drums.on });
    else setTimeout(tick, 5);
  };
  tick();
});
const SIZE_FLOOR = (rivalSel) => {   // §3 (5): computed font-size in the device's own (unzoomed) px (R4: rivalSel = R4_RIVALS)
  const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
  const fs = (e) => parseFloat(getComputedStyle(e).fontSize);
  const path = (e) => {
    const c = e.closest("[data-ctl]"), cls = [...e.classList].slice(0, 2).join(".");
    const own = `${e.tagName.toLowerCase()}${cls ? `.${cls}` : ""}${e.dataset.code ? `[data-code=${e.dataset.code}]` : ""}`;
    return `${c && c !== e ? `[data-ctl=${c.dataset.ctl}] ` : e.dataset.ctl ? `[data-ctl=${e.dataset.ctl}]` : ""}${own} "${e.textContent.trim().slice(0, 12)}"`;
  };
  const words = [...document.querySelectorAll(".sig :is(.sg-cap, .si-seg > button, .si-kl, .si-kn, .sg-etch, .sg-key, .sg-screen > small, .sg-lcd .si-fl)")]
    .filter((e) => vis(e) && e.textContent.trim()).map((e) => ({ px: fs(e), p: path(e) })).sort((a, b) => a.px - b.px);
  const nums = [...document.querySelectorAll(".sig .sg-screen > b")].filter(vis).map((e) => ({ px: fs(e), p: path(e) })).sort((a, b) => a.px - b.px);
  const bpm = document.querySelector('.sig [data-ctl="drums-bpm"] .sgh-bpm') || document.querySelector('.sig [data-ctl="drums-bpm"] b');
  const rivals = [...document.querySelectorAll(rivalSel || ".sig .sg-screen > b, .sig .sgh-clabel")].filter((e) => e !== bpm && vis(e))
    .map((e) => ({ px: fs(e), p: path(e) })).sort((a, b) => b.px - a.px);
  const fit = document.getElementById("sig-fit");
  return { words, nums, bpm: bpm ? { px: fs(bpm), p: path(bpm), vis: vis(bpm) } : null, rivals,
    zoom: fit ? getComputedStyle(fit).getPropertyValue("--sig-zoom").trim() : "" };
};
const FIT_FACTS = () => {   // §3 (6): the page's content column, the drawn device, the nav rail
  const pg = document.querySelector(".sig-page"), cs = pg && getComputedStyle(pg);
  const pl = cs ? parseFloat(cs.paddingLeft) : 0, pr = cs ? parseFloat(cs.paddingRight) : 0;
  const d = document.getElementById("sig-device"), r = d && d.getBoundingClientRect();
  const rail = document.querySelector(".awayrail"), rcs = rail && getComputedStyle(rail);
  const rr = rail && rail.getClientRects().length && rcs.display !== "none" && rcs.visibility !== "hidden" ? rail.getBoundingClientRect() : null;
  const fit = document.getElementById("sig-fit");
  return { iw: innerWidth, ih: innerHeight, pl, pr, content: innerWidth - pl - pr, page: !!pg,
    dev: r ? { l: r.left, r: r.right, w: r.width, h: r.height } : null,
    rail: rr && rr.width > 0 ? { l: rr.left, r: rr.right, w: rr.width, pos: rcs.position } : null,
    zoom: fit ? getComputedStyle(fit).getPropertyValue("--sig-zoom").trim() : "" };
};
// ── R4 · THE RENDER ROUND (NOTES-SIGNAL-R4.md §1.5): in page (self-contained, one argument) ──
/** §1.5 (8): the head's three words, each against its tower's box, in drawn px (the host's zoom is inside both boxes);
 *  `op` = the opacity it is drawn at (its own × every ancestor's: the dark's fades act on the strata). */
const TITLES = () => ["drums", "keys", "bass"].map((n) => {
  const e = document.querySelector(`.sig [data-ctl="title-${n}"]`), s = document.querySelector(`.sig [data-slot="${n}"]`);
  if (!e) return { n, found: false };
  const cs = getComputedStyle(e), r = e.getBoundingClientRect(), sr = s ? s.getBoundingClientRect() : null;
  let op = 1;
  for (let x = e; x; x = x.parentElement) op *= Number(getComputedStyle(x).opacity);
  return { n, found: true, slot: !!sr, text: e.textContent.trim(), px: parseFloat(cs.fontSize), color: cs.color, op,
    vis: e.getClientRects().length > 0 && r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && op > 0,
    dx: sr ? r.left + r.width / 2 - (sr.left + sr.width / 2) : NaN, above: sr ? sr.top - r.bottom : NaN };
});

// ── R5 · THE COMPARTMENT ROUND (NOTES-SIGNAL-R5.md §1.4): the key's names, then in page (self-contained, one argument) ──
/** The KEY screen's spelling (music.ts NOTE_NAMES: the sharps, the Studio's): the screen prints R5_NOTE_NAMES[music.key]. */
const R5_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
/** Where a hand would press `.sig <sel>`: its getBoundingClientRect centre, what elementFromPoint finds there, whether the
 *  point is inside the viewport, and the power state (the standby makes all but #pwr inert: a press needs 'live'). */
const AIM_AT = (sel) => {
  const e = document.querySelector(`.sig ${sel}`), sgm = document.getElementById("sgm");
  const state = sgm ? sgm.getAttribute("data-state") : null;
  if (!e) return { found: false, state, sy: Math.round(scrollY) };
  const desc = (x) => {
    if (!x) return "nothing";
    const c = (x.getAttribute("class") || "").trim().split(/\s+/)[0], h = x.closest("[data-ctl]");
    return `${x.tagName.toLowerCase()}${x.id ? `#${x.id}` : ""}${c ? `.${c}` : ""}${h ? ` in [data-ctl=${h.dataset.ctl}]` : ""}`;
  };
  const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const inView = r.width > 0 && r.height > 0 && x >= 0 && y >= 0 && x < innerWidth && y < innerHeight;
  const at = inView ? document.elementFromPoint(x, y) : null;
  return { found: true, x, y, w: r.width, h: r.height, inView, hit: !!(at && (at === e || e.contains(at))), hitDesc: desc(at),
    state, sy: Math.round(scrollY) };
};
/** §1.4 (1): music.key and what the KEY screen's b prints (a ♯ read as #). */
const KEY_READ = () => {
  const b = document.querySelector('.sig [data-ctl="key"] b');
  return { key: window.__signal.instrument.harmony.state().music.key, text: b ? b.textContent.replace(/\u266f/g, "#").trim() : null };
};
/** Arms a recorder on the KEY screen: the first pointerdown that reaches it (window capture: its isTrusted, its own time),
 *  the next pointerup, every key the state walks through (a 2 ms poll, off by itself after 3 s) and, with o.want, the
 *  first poll that finds the key there, then the first that finds the screen printing o.name. */
const KEY_ARM = (o) => {
  const H = window.__signal.instrument.harmony, t0 = performance.now();
  const text = () => { const b = document.querySelector('.sig [data-ctl="key"] b'); return b ? b.textContent.replace(/\u266f/g, "#").trim() : null; };
  const g = { down: null, up: null, trusted: null, keyAt: null, textAt: null, walk: [H.state().music.key] };
  const stamp = (ev) => { const now = performance.now(), ts = ev.timeStamp; return ts <= now && now - ts <= 1000 ? ts : now; };
  const onDown = (ev) => {
    const e = document.querySelector('.sig [data-ctl="key"]');
    if (g.down === null && e && (ev.target === e || e.contains(ev.target))) { g.down = stamp(ev); g.trusted = ev.isTrusted; }
  };
  const onUp = (ev) => { if (g.down !== null && g.up === null) g.up = stamp(ev); };
  addEventListener("pointerdown", onDown, true);
  addEventListener("pointerup", onUp, true);
  let id = 0;
  const off = () => { clearInterval(id); removeEventListener("pointerdown", onDown, true); removeEventListener("pointerup", onUp, true); };
  id = setInterval(() => {
    const now = performance.now(), k = H.state().music.key;
    if (now - t0 > 3000) { off(); return; }
    if (k !== g.walk[g.walk.length - 1]) g.walk.push(k);
    if (o.want === null) return;
    if (g.keyAt === null && k === o.want) g.keyAt = now;
    if (g.keyAt !== null && g.textAt === null && text() === o.name) g.textAt = now;
  }, 2);
  window.__gateKey5 = { g, off };
  return true;
};
/** After the click: until the key and then the screen arrived, or limitMs after the release (1.5 s when no release came). */
const KEY_WAIT = (limitMs) => new Promise((ok) => {
  const k = window.__gateKey5, t0 = performance.now();
  const tick = () => {
    const g = k.g, now = performance.now();
    if ((g.keyAt !== null && g.textAt !== null) || (g.up !== null && now - g.up > limitMs) || now - t0 > 1500) {
      k.off();
      const b = document.querySelector('.sig [data-ctl="key"] b');
      ok({ ...g, key: window.__signal.instrument.harmony.state().music.key, text: b ? b.textContent.replace(/\u266f/g, "#").trim() : null });
    } else setTimeout(tick, 5);
  };
  tick();
});
/** After the drag: until the key has held still 40 ms with the screen printing its name (o.names), or o.limitMs; then the
 *  recorder off (its walk and its pointerdown reported). */
const KEY_SETTLE = (o) => new Promise((ok) => {
  const H = window.__signal.instrument.harmony, k = window.__gateKey5, t0 = performance.now();
  let last = null, since = t0;
  const tick = () => {
    const b = document.querySelector('.sig [data-ctl="key"] b'), now = performance.now(), key = H.state().music.key;
    const text = b ? b.textContent.replace(/\u266f/g, "#").trim() : null, match = text === o.names[((key % 12) + 12) % 12];
    if (key !== last) { last = key; since = now; }
    if ((match && now - since >= 40) || now - t0 > o.limitMs) {
      if (k) k.off();
      ok({ key, text, match, ms: Math.round(now - t0), walk: k ? k.g.walk : [], down: k ? k.g.down : null, trusted: k ? k.g.trusted : null });
    } else setTimeout(tick, 5);
  };
  tick();
});
/** The key back where the row found it (by state, never judged). */
const KEY_RESTORE = (k0) => {
  const H = window.__signal.instrument.harmony, m = H.state().music;
  if (m.key !== k0) H.set("music", { ...m, key: k0 });
  return H.state().music.key;
};
/** §1.4 (2): the MAJ · MIN toggle as the page holds it (each button's .on + aria-pressed), the scale in the state, the
 *  piano's whites wearing the colour rim (their MIDI, ascending), and what must be gone: the key- / key+ hooks, and any
 *  on-screen cap in the keycap block printing an arrow (a glyph, an arrow class, an up / down / left / right name). */
const SCALE_FACTS = () => {
  const seg = document.querySelector('.sig [data-ctl="scale"]'), kc = document.querySelector('.sig [data-ctl="keycaps"]');
  const one = (v) => {
    const b = seg && seg.querySelector(`button[data-v="${v}"]`);
    return b ? { on: b.classList.contains("on"), ap: b.getAttribute("aria-pressed"), text: b.textContent.trim() } : null;
  };
  const ARROW = /[\u2190-\u21ff\u25b2-\u25c5\u27f0-\u27ff\u2900-\u297f\u2b00-\u2bff\u2039\u203a\u00ab\u00bb<>]/;
  const caps = kc ? [...kc.querySelectorAll(".sg-cap")] : [];
  const arrows = caps.filter((e) => ARROW.test(e.textContent) || /arrow/i.test(e.getAttribute("class") || "")
    || /arrow|\b(up|down|left|right)\b/i.test(e.getAttribute("aria-label") || ""))
    .map((e) => `${(e.getAttribute("class") || "").trim().split(/\s+/).slice(0, 2).join(".")} "${e.textContent.trim() || e.getAttribute("aria-label") || ""}"`);
  return { seg: !!seg, segDesc: seg ? `${seg.tagName.toLowerCase()}.${(seg.getAttribute("class") || "").trim().split(/\s+/).join(".")}` : "",
    segText: seg ? seg.textContent.trim().slice(0, 24) : "", buttons: seg ? seg.querySelectorAll("button[data-v]").length : 0,
    major: one("major"), minor: one("minor"), scale: window.__signal.instrument.harmony.state().music.scale,
    colour: [...document.querySelectorAll(".sig .sgh-w.color")].map((e) => Number(e.dataset.m)).sort((a, b) => a - b),
    gone: [...document.querySelectorAll('.sig [data-ctl="key-"], .sig [data-ctl="key+"]')].map((e) => e.dataset.ctl),
    keycaps: !!kc, caps: caps.length, arrows };
};
/** Until the state holds o.want and its button is .on + aria-pressed "true" (the paint landed), or o.limitMs. */
const SCALE_WAIT = (o) => new Promise((ok) => {
  const t0 = performance.now();
  const tick = () => {
    const b = document.querySelector(`.sig [data-ctl="scale"] button[data-v="${o.want}"]`), now = performance.now();
    const done = window.__signal.instrument.harmony.state().music.scale === o.want && !!b && b.classList.contains("on")
      && b.getAttribute("aria-pressed") === "true";
    if (done || now - t0 > o.limitMs) ok({ done, ms: Math.round(now - t0) });
    else setTimeout(tick, 5);
  };
  tick();
});
/** The scale back where the row found it (by state; true when the clicks had left it elsewhere). */
const SCALE_RESTORE = (s0) => {
  const H = window.__signal.instrument.harmony, m = H.state().music;
  if (m.scale === s0) return false;
  H.set("music", { ...m, scale: s0 });
  return true;
};
/** §1.4 (3): the rail: its C names (.sgh-oname) and its text, and the window line: shown (display, visibility, [hidden],
 *  the opacity it is drawn at), its drawn box, and whether that box lies inside the rail's. */
const RAIL_FACTS = () => {
  const rail = document.querySelector(".sig .sgh-rail");
  if (!rail) return { rail: false, wins: document.querySelectorAll(".sig .sgh-win").length };
  const rr = rail.getBoundingClientRect(), win = rail.querySelector(".sgh-win");
  let w = null;
  if (win) {
    const r = win.getBoundingClientRect(), cs = getComputedStyle(win);
    let op = 1;
    for (let x = win; x; x = x.parentElement) op *= Number(getComputedStyle(x).opacity);
    w = { w: r.width, h: r.height, x: r.left - rr.left, y: r.top - rr.top, hidden: win.hidden, display: cs.display, vis: cs.visibility, op,
      inside: r.left >= rr.left - 0.5 && r.right <= rr.right + 0.5 && r.top >= rr.top - 0.5 && r.bottom <= rr.bottom + 0.5 };
  }
  return { rail: true, ctl: rail.dataset.ctl || null, names: rail.querySelectorAll(".sgh-oname").length, text: rail.textContent.trim(),
    rw: rr.width, rh: rr.height, win: w, wins: document.querySelectorAll(".sig .sgh-win").length };
};
/** §1.4 (4): the keys' foot: its own [data-ctl] children in DOM order (each one's drawn box), and every [data-ctl] under it. */
const FOOT_FACTS = () => {
  const harm = document.querySelector('.sig [data-slot="keys"] .kv-harm');
  if (!harm) return { harm: false, slot: !!document.querySelector('.sig [data-slot="keys"]') };
  const box = (e) => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { ctl: e.dataset.ctl, l: r.left, w: r.width, vis: e.getClientRects().length > 0 && r.width > 0 && r.height > 0 && cs.visibility !== "hidden" };
  };
  return { harm: true, kids: [...harm.children].filter((e) => e.hasAttribute("data-ctl")).map(box),
    all: [...harm.querySelectorAll("[data-ctl]")].map((e) => e.dataset.ctl) };
};

// ── R3 · THE LEG'S SECTIONS ──
async function keymapRows({ page, row, step }) {
  // (1) THE KEYMAP: X C V N and Digit1 are gone: through the surface (taps) AND as trusted keys, nothing changes
  step("keymap");
  const s0 = await page.evaluate(KM_SNAP);
  await page.evaluate(KM_TAP, R3_GONE);
  await page.waitForTimeout(60);
  const s1 = await page.evaluate(KM_SNAP);
  for (const c of R3_GONE) await page.keyboard.press(c);
  await page.waitForTimeout(60);
  const s2 = await page.evaluate(KM_SNAP);
  const keys = ["hold", "chord", "arp", "armed", "rack", "held", "sounding", "drums", "bass"];
  const diff = (a, b) => keys.filter((x) => a[x] !== b[x]).map((x) => `${x} ${a[x]} → ${b[x]}`);
  const d1 = diff(s0, s1), d2 = diff(s1, s2), drawnGone = R3_GONE.filter((c) => s0.drawn.includes(c));
  row("keymap · no X C V N, no digits", d1.length === 0 && d2.length === 0 && drawnGone.length === 0,
    `surface taps ${R3_GONE.join(" ")}: ${d1.length ? `CHANGED ${d1.join(" | ")}` : "nothing changed"} · the same as trusted keys: ${d2.length ? `CHANGED ${d2.join(" | ")}` : "nothing changed"} (hold ${s2.hold} · chord ${s2.chord} · arp ${s2.arp} · bass.armed ${s2.armed} · ${s2.held} held) · keycaps of those codes: ${drawnGone.length ? `DRAWN ${drawnGone.join(" ")}` : "none"} · the surface draws ${s0.drawn.length ? `${s0.drawn.length}: ${s0.drawn.join(" ")}` : "NO .sg-key[data-code]"}`);
}
async function holdRows({ page, row, step }) {
  // (2) HOLD UNDER CHORD (types.ts, above HarmonyState): a new chord switches; HOLD alone is a sustain pedal
  step("hold under chord");
  const h = await page.evaluate(HOLD_RUN);
  const S = h.steps, eq = (a, b) => Array.isArray(a) && a.length === b.length && a.every((x, j) => x === b[j]);
  const fmt = (st) => (st ? `[${st.snd ? st.snd.join(" ") : "n/a"}] held ${st.held}` : "?");
  const C = [60, 64, 67], F = [65, 69, 72];
  const miss = !h.cHold ? "no [data-ctl=hold] on the surface" : !h.cChord ? "no [data-ctl=chord] on the surface" : "";
  row("hold under chord · a new chord switches", !miss && h.has && S.on.apHold === "true" && S.on.apChord === "true"
      && eq(S.A.snd, C) && S.A.held === 3 && S.A.down === 0 && eq(S.F.snd, F) && eq(S["F+300"].snd, F)
      && eq(S.off.snd, []) && S.off.held === 0,
    `${miss ? `${miss} · ` : ""}${h.has ? "" : "NO harmony.sounding() · "}hold + chord clicked: aria-pressed ${S.on.apHold} / ${S.on.apChord} (state hold ${S.on.hold} · chord ${S.on.chord}) · tap A → ${fmt(S.A)}, ${S.A.down} caps down (want [60 64 67] held 3) · tap F → ${fmt(S.F)} (want [65 69 72]) · +300 ms → ${fmt(S["F+300"])} · hold off → ${fmt(S.off)} (want [] held 0)`);
  const P = [h.mA, h.mD];
  row("hold under chord · pedal without chord", !miss && h.has && S.pedal.apHold === "true" && S.pedal.apChord === "false"
      && eq(S.pA.snd, [h.mA]) && eq(S.pD.snd, P) && eq(S.pA2.snd, [h.mD]) && eq(S.pOff.snd, []) && S.pOff.held === 0
      && S.end.apHold === "false" && S.end.apChord === "false" && h.forced.length === 0,
    `chord off + hold on: aria-pressed hold ${S.pedal.apHold} / chord ${S.pedal.apChord} · tap A → ${fmt(S.pA)} (want [${h.mA}]) · tap D → ${fmt(S.pD)} (want [${h.mA} ${h.mD}]: harmony.midiFor(0) + midiFor(4)) · tap A again → ${fmt(S.pA2)} (want [${h.mD}]) · hold off → ${fmt(S.pOff)} · at the end aria-pressed hold ${S.end.apHold} / chord ${S.end.apChord}${h.forced.length ? ` · the clicks left ${h.forced.join(" + ")} ON: forced off by state for the rest of the leg` : ""}`);
}
async function dormantRows({ page, row, step, r4 }) {
  // (3) DORMANT: present at the defaults, and each pair wakes with its parent (R4: the arp knobs are gone)
  step("dormant");
  const DORM = r4 ? R4_DORMANT : R3_DORMANT;
  const d0 = await page.evaluate(DORM_READ, DORM);
  const bad = d0.filter((x) => x.st !== "dormant");
  row("dormant · present at the defaults", bad.length === 0,
    `${d0.length - bad.length}/${d0.length} .dormant${bad.length ? ` · ${bad.map((x) => `${x.sel} ${x.st.toUpperCase()}`).join(" · ")}` : ""}`);
  const wk = await page.evaluate(DORM_WAKE, DORM);
  const short = (sel) => sel.replace(/^\[data-ctl="(.*)"\]$/, "$1");
  row("dormant · wakes", wk.every((g) => g.wake.ok && g.back.ok),
    wk.map((g) => `${g.name} → ${g.kids.map(short).join("+")} ${g.wake.ok ? `awake in ${g.wake.ms} ms` : `NOT awake in ${g.wake.ms} ms (${g.wake.r.join(" ")})`}, restored → ${g.back.ok ? "dormant again" : `NOT dormant (${g.back.r.join(" ")})`}`).join(" · "));
}
async function keycapRows({ page, row, step }) {
  // (4) KEYCAPS: one visible cap per taught code; a trusted key presses + lights its cap (and a piano key for a letter)
  step("keycaps");
  const cd = await page.evaluate(CAPS_DRAWN, R3_TAUGHT);
  const missing = cd.per.filter((x) => x.n === 0).map((x) => x.c), dup = cd.per.filter((x) => x.n > 1).map((x) => `${x.c}×${x.n}`);
  const hidden = cd.per.filter((x) => x.n === 1 && x.vis === 0).map((x) => x.c);
  row("keycaps · the taught set drawn", missing.length === 0 && dup.length === 0 && hidden.length === 0,
    `${cd.per.length - missing.length - dup.length - hidden.length}/${cd.per.length} drawn once and visible · missing ${missing.join(" ") || "none"} · duplicated ${dup.join(" ") || "none"} · hidden ${hidden.join(" ") || "none"} · ${cd.total} .sg-key[data-code] on the device (beyond the taught set: ${cd.extra.join(" ") || "none"})`);
  const cap = (c) => `.sig .sg-key[data-code="${c}"]`;
  const say = (w) => `${w.ok ? `${w.ms} ms` : `NOT in ${w.ms} ms`} (${w.r.map((x) => `${x.sel.replace(".sig ", "")} ${x.got}`).join(", ")})`;
  const res = [];
  await page.keyboard.down("KeyA");
  const aDown = await page.evaluate(WAIT_CAPS, { checks: [{ sel: cap("KeyA"), has: ["pressed", "lit"] }, { sel: ".sig .sgh-w.press", any: true }], limitMs: 150 });
  await page.keyboard.up("KeyA");
  const aUp = await page.evaluate(WAIT_CAPS, { checks: [{ sel: cap("KeyA"), lacks: ["pressed", "lit"] }], limitMs: 150 });
  res.push(`trusted KeyA down → .pressed.lit + a .sgh-w.press ${say(aDown)} · up → both gone ${say(aUp)}`);
  const spOn = await page.evaluate(WAIT_CAPS, { tap: "Space", checks: [{ sel: cap("Space"), has: ["lit"] }], limitMs: 100 });
  const spOff = await page.evaluate(WAIT_CAPS, { tap: "Space", checks: [{ sel: cap("Space"), lacks: ["lit"] }], limitMs: 100 });
  res.push(`press('Space') → drums ${spOn.drums ? "on" : "OFF"}, .lit ${say(spOn)} · again → drums ${spOff.drums ? "ON" : "off"}, unlit ${say(spOff)}`);
  await page.keyboard.down("KeyZ");
  const zDown = await page.evaluate(WAIT_CAPS, { checks: [{ sel: cap("KeyZ"), has: ["pressed", "lit"] }], limitMs: 150 });
  await page.keyboard.up("KeyZ");
  const zUp = await page.evaluate(WAIT_CAPS, { checks: [{ sel: cap("KeyZ"), lacks: ["pressed", "lit"] }], limitMs: 150 });
  res.push(`trusted KeyZ down → .pressed.lit ${say(zDown)} · up → gone ${say(zUp)}`);
  row("keycaps · press lights", aDown.ok && aUp.ok && spOn.ok && spOn.drums && spOff.ok && !spOff.drums && zDown.ok && zUp.ok,
    `${res.join(" · ")} · (ms from the poll's start, the key already dispatched)`);
}
async function floorRows({ page, row, step, r4 }) {
  // (5) THE SIZE FLOOR (Law 5): words ≥ 12, screen numerals ≥ 22, BPM the largest (R4: its rivals read .kv-clabel too)
  step("size floor");
  const f = await page.evaluate(SIZE_FLOOR, r4 ? R4_RIVALS : null);
  const unz = `computed px = the device's own unzoomed px (the host zooms it ${f.zoom || "?"}: the floor is written in these)`;
  const lo = f.words.filter((x) => x.px < 12 - 0.01);
  row("size floor · words ≥ 12 px", f.words.length > 0 && lo.length === 0,
    `${f.words.length} visible words · ${lo.length} under 12 px · smallest: ${f.words.slice(0, 3).map((x) => `${x.px} px ${x.p}`).join(" | ") || "none found"} · ${unz}`);
  const nlo = f.nums.filter((x) => x.px < 22 - 0.01);
  row("size floor · numerals ≥ 22 px", f.nums.length > 0 && nlo.length === 0,
    `${f.nums.length} visible .sg-screen > b · ${nlo.length} under 22 px · smallest: ${f.nums.slice(0, 3).map((x) => `${x.px} px ${x.p}`).join(" | ") || "none found"}`);
  const top = f.rivals[0];
  row("size floor · BPM the largest", !!f.bpm && f.bpm.vis && (!top || f.bpm.px >= top.px),
    f.bpm ? `BPM ${f.bpm.px} px (${f.bpm.p}${f.bpm.vis ? "" : ", NOT visible"}) · the next largest numeral: ${top ? `${top.px} px ${top.p}` : "none"} (of ${f.rivals.length} .sg-screen > b + .sgh-clabel${r4 ? " + .kv-clabel" : ""})`
      : `no [data-ctl="drums-bpm"] .sgh-bpm / b on the device · the largest numeral: ${top ? `${top.px} px ${top.p}` : "none"}`);
}
async function titleRows({ page, row, step }) {
  // (8) R4 §1.5 (8): THE TITLES: DRUMS · KEYS · BASS, each centred over its tower (≤ 3 px) and above it, ≥ 16 px, in three
  // different inks (the towers' accents; read live: the standby greys all three alike)
  step("titles");
  const t = await page.evaluate(TITLES);
  const WANT = { drums: "DRUMS", keys: "KEYS", bass: "BASS" };
  const each = t.map((x) => ({ ...x, ok: !!(x.found && x.slot && x.vis && x.text === WANT[x.n] && Math.abs(x.dx) <= 3 && x.above >= -0.5 && x.px >= 16 - 0.01) }));
  const inks = new Set(t.filter((x) => x.found).map((x) => x.color)), three = t.every((x) => x.found) && inks.size === 3;
  const sg = (v) => { const r = Math.round(v * 10) / 10 || 0; return `${r >= 0 ? "+" : ""}${r.toFixed(1)}`; };   // −0.0 → +0.0
  const say = (x) => {
    if (!x.found) return `[data-ctl=title-${x.n}] MISSING`;
    const bits = [x.text === WANT[x.n] ? x.text : `"${x.text}" (want ${WANT[x.n]})`];
    if (x.slot) bits.push(`${sg(x.dx)} px off the ${x.n} tower's centre${Math.abs(x.dx) <= 3 ? "" : " (> 3)"}`,
      `${x.above.toFixed(1)} px above its top${x.above >= -0.5 ? "" : " (OVERLAPS it)"}`);
    else bits.push(`NO [data-slot=${x.n}]`);
    bits.push(`${x.px} px${x.px >= 16 - 0.01 ? "" : " (< 16)"}`, x.color);
    if (!x.vis) bits.push(`NOT visible (drawn at opacity ${x.op})`);
    return bits.join(", ");
  };
  row("titles · three, over their towers, in their inks", each.every((x) => x.ok) && three,
    `${each.map(say).join(" · ")} · the inks: ${three ? "three different" : `${inks.size} different`} (drawn px, the host's zoom inside)`);
}
async function fitRows({ page, row }, w) {
  // (6) THE FIT: 1440 → 96–99.5 % of the content column + clear of the rail; 1024 → the clearance only
  const f = await page.evaluate(FIT_FACTS);
  const share = f.dev && f.content > 0 ? f.dev.w / f.content : NaN;
  const railR = f.rail ? f.rail.r : f.pl, gap = f.dev ? f.dev.l - railR : NaN, need = 0.01 * f.content;
  const col = `content ${f.content.toFixed(0)} = innerWidth ${f.iw} − .sig-page padding ${f.pl}|${f.pr}${f.page ? "" : " (NO .sig-page)"}`;
  if (w === 1440) row(`fit ${w} · 93–99.5 % of the column (the height may bind at 900 tall)`, Number.isFinite(share) && share >= 0.93 && share <= 0.995,
    `#sig-device drawn ${f.dev ? `${f.dev.w.toFixed(1)}×${f.dev.h.toFixed(1)} at x ${f.dev.l.toFixed(1)}..${f.dev.r.toFixed(1)}` : "MISSING"} · ${col} · ${Number.isFinite(share) ? `${(100 * share).toFixed(2)} %` : "?"} · zoom ${f.zoom}`);
  row(`fit ${w} · clear of the rail`, Number.isFinite(gap) && gap >= need,
    `${f.rail ? `.awayrail (${f.rail.pos}) ${f.rail.l.toFixed(0)}..${f.rail.r.toFixed(0)}` : `no .awayrail rendered: the page's padding-left ${f.pl}`} · device left ${f.dev ? f.dev.l.toFixed(1) : "?"} · gap ${Number.isFinite(gap) ? gap.toFixed(1) : "?"} px, want ≥ ${need.toFixed(1)} (1 % of ${f.content.toFixed(0)})`);
}
async function moduleShotRows({ name, page, row, step, r4 }, aim) {
  // (7) SHOTS (Chromium): each module clipped to its box, and one pressed state, at 1440×900 powered
  if (name !== "chromium") return;
  step("module shots");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(SETTLE);
  await page.waitForTimeout(350);
  let pf = await page.evaluate(POWER_FACTS), note = "";
  if (pf.state !== "live") {   // the 1024 pin's scroll may have let the room law power it off: on again
    note = ` · it was ${pf.state}: powered on again first`;
    const a = await aim(page, pf);
    await page.mouse.click(a.x, a.y);
    await page.evaluate(WAIT_STATE, { want: "live", limitMs: 2500 });
    await page.waitForTimeout(1300);
    pf = await page.evaluate(POWER_FACTS);
  }
  const mods = r4   // R4 §1.5 (7): the head in the top strip's place, and the switch on its own
    ? [["drums", '[data-slot="drums"]'], ["keys", '[data-slot="keys"]'], ["bass", '[data-slot="bass"]'], ["head", ".sig-head"], ["keybed", ".sgh-keybed"], ["switch", "#pwr"]]
    : [["drums", '[data-slot="drums"]'], ["keys", '[data-slot="keys"]'], ["bass", '[data-slot="bass"]'], ["top", ".sgh-top"], ["keybed", ".sgh-keybed"]];
  const files = [], notes = [];
  for (const [m, sel] of mods) {
    const file = join(OUT, `${name}-mod-${m}.png`);
    rmSync(file, { force: true });
    const loc = page.locator(`.sig ${sel}`).first();
    const box = await loc.boundingBox().catch(() => null);
    if (!box) { notes.push(`${m}: no ${sel}`); files.push(file); continue; }
    await loc.screenshot({ path: file, timeout: 10_000 }).catch((e) => notes.push(`${m}: ${String(e.message).split("\n")[0].slice(0, 80)}`));
    files.push(file);
  }
  // the pressed state: the drums on, KeyA + KeyZ held, the whole viewport taken while held
  await page.evaluate(SETTLE);
  const drumsWere = await page.evaluate(() => window.__signal.state().drums.on);
  if (!drumsWere) await page.evaluate(() => window.__signal.press("Space"));
  await page.keyboard.down("KeyA");
  await page.keyboard.down("KeyZ");
  await page.waitForTimeout(250);
  const held = await page.evaluate(() => ({ caps: [...document.querySelectorAll(".sig .sg-key.pressed")].map((e) => e.dataset.code),
    drums: window.__signal.state().drums.on, state: document.getElementById("sgm")?.getAttribute("data-state") }));
  const pfile = join(OUT, `${name}-pressed.png`);
  rmSync(pfile, { force: true });
  await page.screenshot({ path: pfile });
  files.push(pfile);
  await page.keyboard.up("KeyZ");
  await page.keyboard.up("KeyA");
  if (!drumsWere) await page.evaluate(() => { if (window.__signal.state().drums.on) window.__signal.press("Space"); });
  const sizes = files.map((f) => { try { return statSync(f).size; } catch { return 0; } });
  const least = (f) => (f.endsWith("-mod-switch.png") ? 1_024 : 10_240);   // a module shot is tens of KB; the 68 × 30 switch a few
  const ok = sizes.every((b, j) => b > least(files[j]));
  row("shots · modules written", ok,
    `${files.map((f, j) => `${f.split("/").pop()} ${sizes[j] ? `${(sizes[j] / 1024).toFixed(0)} KB` : "MISSING"}`).join(" · ")} · pressed while held: caps .pressed ${held.caps.join("+") || "none"} · drums ${held.drums ? "on" : "OFF"} · ${held.state}${note}${notes.length ? ` · ${notes.join(" | ")}` : ""} · in ${OUT}`);
}
// ── R5 · THE LEG'S SECTIONS (NOTES-SIGNAL-R5.md §1.4): after the keycaps, while the device is live ──
/** Where a trusted press on `.sig <sel>` lands: its page centre when a hand there reaches it, else Playwright's box centre
 *  (where a real hand aims too); a centre outside the viewport is scrolled in first, and `how` says so. */
async function aimR5(page, sel) {
  let f = await page.evaluate(AIM_AT, sel), note = "";
  if (f.found && !f.inView) {
    await page.evaluate((s) => { document.documentElement.style.scrollBehavior = "auto"; document.querySelector(`.sig ${s}`)?.scrollIntoView({ block: "nearest" }); }, sel);
    await page.waitForTimeout(150);
    f = await page.evaluate(AIM_AT, sel);
    note = ` (scrolled into view: scrollY ${f.sy})`;
  }
  const scrolled = note !== "";
  if (!f.found) return { ...f, scrolled, how: `MISSING${note}` };
  if (f.hit) return { ...f, scrolled, how: `its centre ${f.x.toFixed(0)},${f.y.toFixed(0)}${note}` };
  const b = await page.locator(`.sig ${sel}`).first().boundingBox().catch(() => null);
  return b ? { ...f, scrolled, x: b.x + b.width / 2, y: b.y + b.height / 2, how: `Playwright's box centre (its own centre hit ${f.hitDesc})${note}` }
    : { ...f, scrolled, how: `its centre, which hit ${f.hitDesc} (no Playwright box)${note}` };
}
async function keyRows({ page, row, step }) {
  // (1) R5 §1.4 (1): THE KEY SCREEN (the keybed's top-left block): a trusted click steps to the next key, a trusted vertical
  // drag walks it from the key at the press (14 px a step, down = lower); the screen prints the key's sharp name each time;
  // k0 comes back by state
  step("key");
  const r0 = await page.evaluate(KEY_READ), k0 = r0.key;
  const a = await aimR5(page, '[data-ctl="key"]');
  if (!a.found) {
    row("key · click steps, drag walks", false, `no [data-ctl="key"] on the device · music.key ${k0} · the device ${a.state}`);
    return;
  }
  const want = (k0 + 1) % 12, name = R5_NOTE_NAMES[want], q = (s) => (s === null ? "no b" : `"${s}"`);
  const t = (x) => (x === null ? "never" : `${Math.round(x)} ms`);
  try {
    // the click: down + up at the centre (within 3 px of the press: the next key)
    await page.evaluate(KEY_ARM, { want, name });
    await page.mouse.click(a.x, a.y);
    const c = await page.evaluate(KEY_WAIT, 150);
    const from = c.up ?? c.down, since = (x) => (x !== null && from !== null ? x - from : null);
    const dKey = since(c.keyAt), dText = since(c.textAt);
    const clickOk = c.trusted === true && c.key === want && dKey !== null && dKey <= 150 && c.text === name && dText !== null && dText <= 150;
    // the drag: from the same centre, down, 30 px DOWN in 3 moves, up (two steps back at 14 px a step)
    const k1 = c.key;
    await page.evaluate(KEY_ARM, { want: null, name: null });
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    try { await page.mouse.move(a.x, a.y + 30, { steps: 3 }); } finally { await page.mouse.up(); }
    const d = await page.evaluate(KEY_SETTLE, { limitMs: 400, names: R5_NOTE_NAMES });
    const back = (k1 - d.key + 12) % 12;
    const dragOk = d.trusted === true && back >= 1 && back <= 5 && d.match;
    const k2 = await page.evaluate(KEY_RESTORE, k0);
    const walk1 = c.walk.join(" → ") === `${k0} → ${want}` ? "" : `; the walk ${c.walk.join(" → ")}`;
    row("key · click steps, drag walks", clickOk && dragOk,
      `k0 ${k0} ${q(r0.text)} · the device ${a.state} · a trusted click at ${a.how}${c.down === null ? ": NO pointerdown reached [data-ctl=key]" : ` (isTrusted ${c.trusted})`} → key ${c.key} ${q(c.text)} (want ${want} "${name}": the state ${t(dKey)}, the screen ${t(dText)} after the release, ≤ 150${walk1}) · a trusted drag 30 px down in 3 moves${d.down === null ? " (NO pointerdown reached it)" : ""} → key ${d.key} ${q(d.text)}: ${back} step${back === 1 ? "" : "s"} back (want 2 at 14 px a step; judged 1–5), the screen ${d.match ? "matches" : "does NOT match"} the state, the walk ${d.walk.join(" → ")} · restored to ${k2} by harmony.set('music')`);
  } finally {
    await page.evaluate(() => { window.__gateKey5?.off(); }).catch(() => {});   // never leave a 2 ms poll running into the throttle
    if (a.scrolled) await page.evaluate(SETTLE).catch(() => {});
  }
}
async function scaleRows({ page, row, step }) {
  // (2) R5 §1.4 (2): THE SCALE TOGGLE beside the KEY screen (a .si-seg.col, MAJ over MIN): MAJ lit at the default; a trusted
  // click on MIN → 'minor', aria-pressed flips, the piano's colour rims re-assign (the .sgh-w.color set changes); a trusted
  // click on MAJ brings it all back; and the arrow caps are gone (no key- / key+ hook on the device; no on-screen cap in the
  // keycap block prints an arrow: only the real ← → keys may)
  step("scale");
  const f0 = await page.evaluate(SCALE_FACTS), s0 = f0.scale;
  let scrolled = false;
  const press = async (v) => {
    const a = await aimR5(page, `[data-ctl="scale"] button[data-v="${v}"]`);
    scrolled ||= !!a.scrolled;
    if (!a.found) return { f: await page.evaluate(SCALE_FACTS), say: `${v.toUpperCase()} MISSING` };
    await page.mouse.click(a.x, a.y);
    const w = await page.evaluate(SCALE_WAIT, { want: v, limitMs: 300 });
    await page.waitForTimeout(60);                              // the piano's rims repaint from the same change
    return { f: await page.evaluate(SCALE_FACTS), say: `a trusted click on ${v} at ${a.how} → ${w.done ? `'${v}' + its button lit in ${w.ms} ms` : `NOT '${v}' + lit in ${w.ms} ms`}` };
  };
  const both = !!(f0.major && f0.minor);
  let p1 = null, p2 = null, forced = false;
  try {
    if (both) { p1 = await press("minor"); p2 = await press("major"); }
  } finally {
    forced = await page.evaluate(SCALE_RESTORE, s0).catch(() => false);   // the rest of the leg runs in the scale it had
    if (scrolled) await page.evaluate(SETTLE).catch(() => {});
  }
  const f1 = p1 ? p1.f : null, f2 = p2 ? p2.f : null;
  const lit = (f, v) => !!(f && f[v] && f[v].on && f[v].ap === "true");
  const dark = (f, v) => !!(f && f[v] && !f[v].on && f[v].ap === "false");
  const same = (x, y) => x.length === y.length && x.every((m, j) => m === y[j]);
  const atDefault = s0 === "major" && lit(f0, "major") && dark(f0, "minor");
  const toMinor = !!f1 && f1.scale === "minor" && lit(f1, "minor") && dark(f1, "major") && !same(f0.colour, f1.colour);
  const toMajor = !!f2 && f2.scale === "major" && lit(f2, "major") && dark(f2, "minor") && same(f0.colour, f2.colour);
  const noArrows = f0.keycaps && f0.gone.length === 0 && f0.arrows.length === 0;
  const btn = (f, v) => (f && f[v] ? `${f[v].text || v} ${f[v].on ? ".on" : "off"} aria-pressed ${f[v].ap}` : `${v} MISSING`);
  const rims = (f) => (f ? `[${f.colour.join(" ")}]` : "?");
  row("scale · MAJ / MIN toggle", atDefault && toMinor && toMajor && noArrows,
    `${f0.seg ? `[data-ctl=scale] = ${f0.segDesc} (${f0.buttons} button[data-v])` : "no [data-ctl=scale] on the device"} · at the default '${s0}': ${btn(f0, "major")} · ${btn(f0, "minor")}${both ? ` · ${p1.say}: ${btn(f1, "minor")} · ${btn(f1, "major")} · '${f1.scale}' · ${p2.say}: ${btn(f2, "major")} · ${btn(f2, "minor")} · '${f2.scale}'` : ` (no MAJ / MIN buttons${f0.seg ? `: it prints "${f0.segText}"` : ""})`} · the whites with the colour rim ${rims(f0)} → ${rims(f1)} → ${rims(f2)} (want a change, then back) · key- / key+ ${f0.gone.length ? `ON THE DEVICE (${f0.gone.join(" ")})` : "gone"} · arrow caps in [data-ctl=keycaps]: ${f0.keycaps ? (f0.arrows.length ? `${f0.arrows.length} (${f0.arrows.join(" | ")})` : `none (${f0.caps} .sg-cap in it)`) : "NO [data-ctl=keycaps]"}${forced ? ` · the clicks left the scale off '${s0}': restored by state` : ""}`);
}
async function railRows({ page, row, step }) {
  // (3) R5 §1.4 (3): THE RAIL is the window line alone: no C names (no .sgh-oname, no text in it), the .sgh-win shown, wider
  // than 0, inside the rail (the rail's 12 px stay the drag target; the line is what shows)
  step("rail");
  const f = await page.evaluate(RAIL_FACTS), w = f.win;
  const shown = !!w && !w.hidden && w.display !== "none" && w.vis !== "hidden" && w.op > 0 && w.w > 0 && w.h > 0;
  row("rail · the window line, no names", f.rail && f.names === 0 && f.text === "" && shown && w.inside,
    f.rail ? `.sgh-rail${f.ctl ? `[data-ctl=${f.ctl}]` : " (no data-ctl)"} ${f.rw.toFixed(0)}×${f.rh.toFixed(1)} px · .sgh-oname ${f.names}${f.text ? ` · its text "${f.text.slice(0, 40)}"` : " · no text"} · .sgh-win ${w ? `${w.w.toFixed(1)}×${w.h.toFixed(1)} px at ${w.x.toFixed(1)},${w.y.toFixed(1)} in the rail, ${shown ? "shown" : `NOT shown (hidden ${w.hidden}, display ${w.display}, visibility ${w.vis}, opacity ${w.op})`}, ${w.inside ? "inside the rail" : "OUTSIDE the rail's box"}` : `NOT in the rail (${f.wins} on the device)`}`
      : `no .sgh-rail on the device (${f.wins} .sgh-win)`);
}
async function footRows({ page, row, step }) {
  // (4) R5 §1.4 (4): THE KEYS' FOOT is the chord's: CHORD · the glass · HOLD, the .kv-harm's own hooks in that order, the
  // glass (flex 1 1 auto: the whole middle) wider than either cap
  step("keys foot");
  const f = await page.evaluate(FOOT_FACTS);
  if (!f.harm) { row("keys foot · CHORD · glass · HOLD", false, `no [data-slot="keys"] .kv-harm${f.slot ? "" : " (no [data-slot=keys] either)"}`); return; }
  const order = f.kids.map((x) => x.ctl).join(" "), by = (c) => f.kids.find((x) => x.ctl === c);
  const ch = by("chord"), gl = by("chord-glass"), ho = by("hold");
  const wide = !!(ch && gl && ho) && gl.w > ch.w && gl.w > ho.w, vis = f.kids.length > 0 && f.kids.every((x) => x.vis);
  const drawn = [...f.kids].sort((x, y) => x.l - y.l).map((x) => x.ctl).join(" "), all = f.all.join(" ");
  row("keys foot · CHORD · glass · HOLD", order === "chord chord-glass hold" && wide && vis,
    `.kv-harm > [data-ctl]: ${order || "none"} (want chord chord-glass hold)${drawn !== order ? ` · drawn left to right: ${drawn}` : ""} · widths ${f.kids.map((x) => `${x.ctl} ${x.w.toFixed(0)}${x.vis ? "" : " (NOT visible)"}`).join(" · ") || "none"} px${ch && gl && ho ? ` · the glass ${wide ? "wider than" : "NOT wider than"} each cap` : ""}${all !== order ? ` · every [data-ctl] under it: ${all || "none"}` : ""}`);
}
async function legR3(k) { return legR2({ ...k, r3: true }); }   // R2's leg; its r3 hooks insert the sections above
async function legR4(k) { return legR2({ ...k, r3: true, r4: true }); }   // R3's leg; its r4 hooks change the rows (R4 §1.5)
async function legR5(k) { return legR2({ ...k, r3: true, r4: true, r5: true }); }   // R4's leg; its r5 hooks add the rows (R5 §1.4)

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
    if (R5) await legR5(k);
    else if (R4) await legR4(k);
    else if (R3) await legR3(k);
    else if (R2) await legR2(k);
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
    const NW = R4 || R5 ? 54 : 44, nm = (s) => ((R4 || R5) && s.length >= NW ? `${s} ` : s.padEnd(NW));   // R4 + R5: long names keep a gap
    console.log(`\n${"browser".padEnd(10)}${"assertion".padEnd(NW)}${"pass".padEnd(6)}detail`);
    for (const r of rows) console.log(`${r.who.padEnd(10)}${nm(r.name)}${r.status.padEnd(6)}${r.detail}`);
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
