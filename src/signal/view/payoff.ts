// SIGNAL · THE PAYOFF (2026-10-05, the first-song round; Jon's pick: THE DEVICE). What the instrument does when a song
// is exported: for many visitors their first audio file ever, so the press is a ceremony in the device's own hardware
// grammar, nothing added to the page. THE PRINT: one band of the keys' own light travels across the whole chassis as
// the cap says `printing`, each module title brightening as it passes and the piano's lamps lighting in turn under it;
// the rocker's red breathes once; the file lands as the band leaves. THE EVIDENCE stays on the device: after `saved`
// the head's screen prints the song's length, its key and its tempo (and, on a first-time device, `first`), then the
// clock comes back. Lighting only: nothing in the engine, the keymap, the views' effects or the geometry changes.
// (The tape and the sleeve directions were rendered and judged on 2026-10-05; Jon chose the device.)
export interface SongInfo {
  name: string;       // the file's name (songName)
  seconds: number;    // the trimmed length
  key: string;        // 'A'
  scale: string;      // 'major' | 'minor'
  bpm: number;
  day: string;        // 2026-10-05
  first: boolean;     // the first song on this device
}
export interface Payoff {
  /** The print: resolves when the band has left the chassis (the download fires then). */
  show(info: SongInfo): Promise<void>;
  /** After `saved`: the evidence on the screen; resolves when the clock is back. */
  after(info: SongInfo): Promise<void>;
  /** A new song (the power came on): nothing to fold; the cycle stops. */
  reset(): void;
  dispose(): void;
}

const fmt = (s: number): string => { const t = Math.max(0, Math.floor(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };   // floors, as the clock does: one length
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const reduce = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How long the band takes to cross the chassis (export.css sgx-band matches it). */
export const PRINT_MS = 1150;
/** Each fact holds this long on the screen after the save. */
export const EVIDENCE_MS = 1800;

export function createPayoff(sgm: HTMLElement, screenB: HTMLElement, screenS: HTMLElement): Payoff {
  const dev = sgm.querySelector<HTMLElement>('.device') ?? sgm;
  // the band's housing: inside the device, over the strata, clipped to the chassis; drawn by export.css
  const band = document.createElement('i');
  band.className = 'sgx-band';
  band.setAttribute('aria-hidden', 'true');
  dev.appendChild(band);
  // the piano's lamps and the titles light in turn under the band: each gets its moment once (lighting only, from here)
  dev.querySelectorAll<HTMLElement>('.sgh-w').forEach((k, i) => k.style.setProperty('--sgx-i', String(i)));
  const titles: Record<string, number> = { drums: 120, keys: 500, bass: 880 };
  dev.querySelectorAll<HTMLElement>('.sg-title').forEach((t) => { const d = titles[t.dataset.title ?? '']; if (d != null) t.style.setProperty('--sgx-t', `${d}ms`); });
  let gen = 0;
  const lit = (on: boolean): void => { for (const e of [sgm, dev, sgm.querySelector('#pwr')]) e?.classList.toggle('sgx-print', on); };
  const blink = (): void => { screenB.classList.remove('sg-t-blink'); void screenB.offsetWidth; screenB.classList.add('sg-t-blink'); };
  return {
    async show() {
      lit(true);
      await wait(reduce() ? 0 : PRINT_MS);
      lit(false);
    },
    async after(info) {
      const g = ++gen;
      const steps: Array<[string, string]> = [[fmt(info.seconds), 'saved'], [`${info.key} ${info.scale === 'minor' ? 'min' : 'maj'}`, 'key'], [String(info.bpm), 'bpm']];
      if (info.first) steps.push(['first', 'song']);
      for (const [b, s] of steps) {
        if (g !== gen) return;
        screenB.textContent = b; screenS.textContent = s; blink();
        await wait(reduce() ? 600 : EVIDENCE_MS);
      }
      if (g !== gen) return;
      screenB.textContent = fmt(info.seconds); screenS.textContent = 'song'; blink();
    },
    reset() { gen++; lit(false); },
    dispose() { gen++; lit(false); band.remove(); },
  };
}
