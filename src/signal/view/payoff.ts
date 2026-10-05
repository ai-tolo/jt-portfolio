// SIGNAL · THE PAYOFF (2026-10-05, the first-song round). What the site shows when a song is exported: for many visitors
// their first audio file ever, so the press is a ceremony with an object, not a utility click. THREE DIRECTIONS live here
// behind the `?dir=` dev switch (export-view.ts reads it) while Jon picks from their renders; the pick stays, the rest go.
//   1 · THE TAPE    a cassette in the LISTEN room's language (the same shell, hubs and label geometry as the wallet's tapes)
//                   drops out from under the device and sits beneath it as "your tape" for the session: the label printed
//                   with the name, the waveform and the length in its window.
//   2 · THE SLEEVE  a paper card in the work room's material (paper on paper, hairlines at 18 % ink, mono keys) slides
//                   out from under the device: the name, the drawn waveform, day · key · tempo · length.
//   3 · THE DEVICE  no object: the device celebrates in its own hardware grammar — the head's screen prints the song's
//                   facts, the rocker's red breathes, the trace flares, the piano's lamps sweep — and the file is the thing.
// The slot (directions 1 and 2) is a sibling inserted after `.sgm` (never inside the device), zoomed with the device,
// 0 tall until the ceremony; the card beneath glides down as it opens. A new power-on folds it (export-view resets).
// Lighting and geometry here are the payoff's own; nothing in the engine, the keymap or the views' effects changes.
export interface SongInfo {
  name: string;       // the file's name (songName)
  seconds: number;    // the trimmed length
  key: string;        // 'A'
  scale: string;      // 'major' | 'minor'
  bpm: number;
  day: string;        // 2026-10-05
  peaks: number[];    // 0..1
  blob: Blob;         // the WAV itself (the tape plays it back)
}
export interface Payoff {
  /** Run the ceremony; resolves when the object has landed (the download fires then). */
  show(info: SongInfo, first: boolean, firstLine: string): Promise<void>;
  /** After the landing (the cap says saved): the device's own residue, if any. */
  after?(info: SongInfo): Promise<void>;
  /** true once the object has been seen (an object marks the first time itself, when it is in view). */
  seen: boolean;
  /** A new song (the power came on): fold the object away. */
  reset(): void;
  dispose(): void;
}

const el = (tag: string, cls: string, text?: string): HTMLElement => { const e = document.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; };
const svgNS = 'http://www.w3.org/2000/svg';
const fmt = (s: number): string => { const t = Math.max(0, Math.round(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const reduce = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The waveform as a mirrored polyline (a thin line, never a fill) in a w × h box. */
function waveSvg(peaks: number[], w: number, h: number, cls: string): SVGSVGElement {
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('class', cls); svg.setAttribute('aria-hidden', 'true');
  const n = Math.max(1, peaks.length), mid = h / 2;
  const top: string[] = [], bot: string[] = [];
  peaks.forEach((p, i) => { const x = (i / (n - 1 || 1)) * w; const a = Math.max(0.6, p * (h / 2 - 1)); top.push(`${x.toFixed(1)},${(mid - a).toFixed(1)}`); bot.unshift(`${x.toFixed(1)},${(mid + a).toFixed(1)}`); });
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', `M${top.join(' L')} L${bot.join(' L')} Z`);
  svg.appendChild(path);
  return svg;
}

/** The slot under the device for directions 1 and 2: inserted after .sgm, zoomed with it, grows to its content. */
function makeSlot(sgm: HTMLElement, cls: string): HTMLElement {
  const slot = el('div', `sgx-payoff ${cls}`);
  slot.setAttribute('aria-live', 'polite');
  sgm.insertAdjacentElement('afterend', slot);
  return slot;
}
const open = (slot: HTMLElement, inner: HTMLElement): void => {
  slot.style.height = reduce() ? 'auto' : `${inner.offsetHeight}px`;
  slot.classList.add('open');
};
const fold = (slot: HTMLElement): void => { slot.classList.remove('open', 'landed'); slot.style.height = '0px'; };

// ── 1 · THE TAPE ─────────────────────────────────────────────────────────────────────────────────────────────────────
function tape(sgm: HTMLElement, onSeen: () => void): Payoff {
  const slot = makeSlot(sgm, 'sgx-dir-tape');
  const inner = el('div', 'sgx-slot-in');
  const tp = document.createElement('button'); tp.type = 'button'; tp.className = 'sgx-tape';   // the tape IS the switch, as in LISTEN
  tp.setAttribute('aria-label', 'Play your tape');
  const label = el('div', 'sgx-tape-label');
  const head = el('div', 'sgx-tape-head');
  const name = el('span', 'sgx-tape-name');
  const yours = el('span', 'sgx-tape-yours', 'in your downloads');
  head.append(name, yours);
  const wave = el('div', 'sgx-tape-wave');
  const firstLn = el('span', 'sgx-tape-first');
  label.append(head, firstLn, wave);   // the line sits under the name, above the waveform: the band over the hubs
  const hubL = el('img', 'sgx-hub sgx-hub-l') as HTMLImageElement; hubL.src = '/studio/tape-hub-l.webp'; hubL.alt = '';
  const hubR = el('img', 'sgx-hub sgx-hub-r') as HTMLImageElement; hubR.src = '/studio/tape-hub-r.webp'; hubR.alt = '';
  const reelL = el('img', 'sgx-reel sgx-reel-l') as HTMLImageElement; reelL.src = '/studio/tape-core-l.webp'; reelL.alt = '';
  const reelR = el('img', 'sgx-reel sgx-reel-r') as HTMLImageElement; reelR.src = '/studio/tape-core-r.webp'; reelR.alt = '';
  const screen = el('div', 'sgx-tape-screen', '0:00');
  const shell = el('img', 'sgx-shell') as HTMLImageElement; shell.src = '/studio/tape-shell-800.webp'; shell.alt = ''; shell.width = 1600; shell.height = 979;
  tp.append(label, hubL, hubR, reelL, reelR, screen, shell);
  inner.append(tp);
  slot.appendChild(inner);
  // playback: the exported WAV through a plain audio element (never the engine); the reels turn and the window counts
  let audio: HTMLAudioElement | null = null;
  let url = '';
  let length = 0;
  let tick: ReturnType<typeof setInterval> | null = null;
  const stopTick = (): void => { if (tick) { clearInterval(tick); tick = null; } };
  const atRest = (): void => { stopTick(); tp.classList.remove('playing'); screen.textContent = fmt(length); tp.setAttribute('aria-label', 'Play your tape'); };
  const toggle = (): void => {
    if (!audio) return;
    if (audio.paused) {
      void audio.play().then(() => {
        tp.classList.add('playing'); tp.setAttribute('aria-label', 'Pause your tape');
        stopTick(); tick = setInterval(() => { screen.textContent = fmt(audio?.currentTime ?? 0); }, 250);
      }).catch(() => { /* the browser said no: the tape stays at rest */ });
    } else { audio.pause(); atRest(); }
  };
  tp.addEventListener('click', toggle);
  const unload = (): void => { if (audio) { try { audio.pause(); } catch { /* */ } audio.src = ''; audio = null; } if (url) { URL.revokeObjectURL(url); url = ''; } atRest(); };
  const self: Payoff = {
    seen: false,
    async show(info, first, firstLine) {
      unload();
      length = info.seconds;
      url = URL.createObjectURL(info.blob);
      audio = new Audio(url); audio.preload = 'auto';
      audio.addEventListener('ended', atRest);
      name.textContent = info.name.replace(/\.wav$/, '');
      wave.replaceChildren(waveSvg(info.peaks, 480, 36, 'sgx-wave'));
      screen.textContent = fmt(info.seconds);
      firstLn.textContent = first ? firstLine : '';
      slot.classList.remove('landed');
      open(slot, inner);
      tp.classList.add('drop');
      await wait(reduce() ? 50 : 760);
      slot.classList.add('landed');
      await wait(reduce() ? 0 : 200);
    },
    reset() { unload(); fold(slot); tp.classList.remove('drop'); },
    dispose() { unload(); io?.disconnect(); slot.remove(); },
  };
  // the first time is spent when the tape is SEEN, not when the file is printed unseen below the fold
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && e.intersectionRatio >= 0.5 && slot.classList.contains('open')) { self.seen = true; onSeen(); } }, { threshold: [0.5] }) : null;
  io?.observe(tp);
  return self;
}

// ── 2 · THE SLEEVE ───────────────────────────────────────────────────────────────────────────────────────────────────
function sleeve(sgm: HTMLElement, onSeen: () => void): Payoff {
  const slot = makeSlot(sgm, 'sgx-dir-sleeve');
  const inner = el('div', 'sgx-slot-in');
  const card = el('div', 'sgx-sleeve');
  const kicker = el('p', 'sgx-sl-k', 'your song');
  const name = el('p', 'sgx-sl-name');
  const wave = el('div', 'sgx-sl-wave');
  const rows = el('dl', 'sgx-sl-rows');
  const cells: Record<string, HTMLElement> = {};
  for (const k of ['day', 'key', 'tempo', 'length']) { const dt = el('dt', '', k); const dd = el('dd', ''); cells[k] = dd; rows.append(dt, dd); }
  const line = el('p', 'sgx-sl-line');
  card.append(kicker, name, wave, rows, line);
  inner.appendChild(card);
  slot.appendChild(inner);
  const self: Payoff = {
    seen: false,
    async show(info, first, firstLine) {
      name.textContent = info.name.replace(/\.wav$/, '');
      wave.replaceChildren(waveSvg(info.peaks, 360, 56, 'sgx-wave'));
      cells.day.textContent = info.day; cells.key.textContent = `${info.key} ${info.scale}`; cells.tempo.textContent = `${info.bpm} bpm`; cells.length.textContent = fmt(info.seconds);
      line.textContent = first ? firstLine : 'in your downloads';
      slot.classList.remove('landed');
      open(slot, inner);
      card.classList.add('out');
      await wait(reduce() ? 50 : 700);
      slot.classList.add('landed');
      await wait(reduce() ? 0 : 150);
      self.seen = true; onSeen();
    },
    reset() { fold(slot); card.classList.remove('out'); },
    dispose() { slot.remove(); },
  };
  return self;
}

// ── 3 · THE DEVICE ───────────────────────────────────────────────────────────────────────────────────────────────────
function device(sgm: HTMLElement, screenB: HTMLElement, screenS: HTMLElement): Payoff {
  const dev = sgm.querySelector<HTMLElement>('.device') ?? sgm;
  // the piano's lamps sweep: each white key gets its index once (lighting only, from here)
  const whites = Array.from(dev.querySelectorAll<HTMLElement>('.sgh-w'));
  whites.forEach((k, i) => k.style.setProperty('--sgx-i', String(i)));
  let gen = 0;
  const cheer = (on: boolean): void => { for (const e of [sgm, dev, sgm.querySelector('#pwr')]) e?.classList.toggle('sgx-cheer', on); };
  return {
    seen: true,   // no object to see: the first time is spent at the save
    async show() {
      // while it prints: the piano's lamps sweep up the bed and the rocker's red breathes — one state at a time
      cheer(true);
      await wait(reduce() ? 0 : 1250);
      cheer(false);
    },
    async after(info) {
      // the residue, on the device's own screen: the facts after the save, then the clock holds the length
      const g = ++gen;
      const steps: Array<[string, string]> = [[`${info.key} ${info.scale === 'minor' ? 'min' : 'maj'}`, 'key'], [String(info.bpm), 'bpm'], ['first', 'song']];
      for (const [b, s] of steps) { if (s === 'song' && b === 'first' && !firstSeen) continue; await wait(reduce() ? 0 : 900); if (g !== gen) return; screenB.textContent = b; screenS.textContent = s; }
      await wait(reduce() ? 0 : 900); if (g !== gen) return;
      screenB.textContent = fmt(info.seconds); screenS.textContent = 'song';
    },
    reset() { gen++; },
    dispose() { gen++; },
  };
  // (the first-time line has no home on the device: the device prints `first` over `song` once instead)
}
let firstSeen = false;

export type Dir = 0 | 1 | 2 | 3;
export function createPayoff(dir: Dir, sgm: HTMLElement, screenB: HTMLElement, screenS: HTMLElement, onSeen: () => void): Payoff | null {
  if (dir === 1) return tape(sgm, onSeen);
  if (dir === 2) return sleeve(sgm, onSeen);
  if (dir === 3) { firstSeen = (() => { try { return localStorage.getItem('signal-first-song') !== '1'; } catch { return false; } })(); return device(sgm, screenB, screenS); }
  return null;
}
