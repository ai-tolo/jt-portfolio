// SIGNAL · EXPORT YOUR SONG (2026-09-30, the export round; 2026-10-05 THE FIRST-SONG ROUND). The head's export corner
// (Signal.astro's [data-corner="export"], at the keys column's right edge). The instrument keeps everything (take.ts),
// so there is nothing to arm: the control is DORMANT until a sound has been made, then it is the most alive thing in
// the head short of the power switch — a glass SCREEN with the song's clock (22 px amber over `song`: your song is this
// long) and a taller CAP whose LED and inner glow breathe. A press prints the take as a WAV named for the day, the key
// and the tempo, and runs THE PRINT (payoff.ts, Jon's pick of 2026-10-05: the device celebrates in its own grammar — a
// band of light crosses the chassis, the titles and the piano's lamps light under it), then hands the file to the browser
// as a download as the band leaves; after `saved` the screen keeps the evidence (length · key · tempo) before the clock
// comes back. The words on the cap say what happens: export → printing → saved, then export again. A new power-on starts
// a new song (the state on #sgm, watched here). FIRST TIME on this device (localStorage, in try/catch): the screen
// prints `first` once among the facts; every later song gets the same ceremony without it.
import type { SignalInstrumentX } from '../instrument.ts';
import { createTake, type Take } from '../take.ts';
import { accent, cap, screen } from './common.ts';
import { createPayoff, type Payoff, type SongInfo } from './payoff.ts';

const el = (tag: string, cls: string): HTMLElement => { const e = document.createElement(tag); e.className = cls; return e; };

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M4.6 6.8 8 10.2l3.4-3.4M3 13h10"/></svg>';
const FIRST_KEY = 'signal-first-song';

export const fmtClock = (s: number): string => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
export const dayOf = (when = new Date()): string => `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
/** The file's name: the day, the key, the tempo. */
export function songName(key: number, scale: string, bpm: number, when = new Date()): string {
  const k = (KEY_NAMES[((key % 12) + 12) % 12] || 'C').replace('#', 's');
  const mode = scale === 'minor' ? 'minor' : 'major';
  return `signal-${dayOf(when)}-${k}-${mode}-${Math.round(bpm)}bpm.wav`;
}
const firstTime = (): boolean => { try { return localStorage.getItem(FIRST_KEY) !== '1'; } catch { return false; } };
const markFirst = (): void => { try { localStorage.setItem(FIRST_KEY, '1'); } catch { /* a locked store: every song is the first */ } };

export function mountExportView(host: HTMLElement, inst: SignalInstrumentX): { dispose(): void } {
  // THE BOW (2026-10-05, dev switch): ?head=1|2|3 renders the group's three placements (export.css); 3 mounts it in the
  // keybed's block instead of the head's corner. Removed after Jon's pick.
  const headDir = ((): string => { try { return new URLSearchParams(location.search).get('head') ?? ''; } catch { return ''; } })();
  const sig = host.closest<HTMLElement>('.sig');
  if (headDir && sig) sig.setAttribute('data-head', headDir);
  const mountIn = (headDir === '3' && sig?.querySelector<HTMLElement>('.sgh-caps')) || host;
  const wrap = el('div', 'sgx');
  const scr = accent(screen('0:00', 'song', 'sgx-screen'), 'tempo');
  const scrB = scr.querySelector<HTMLElement>('b')!;
  const scrS = scr.querySelector<HTMLElement>('small')!;
  const button = cap('', { led: true, icon: ICON, cls: 'sgx-cap', name: 'Export your song', acc: 'tempo' });
  button.dataset.ctl = 'export';
  const word = el('span', 'sgx-word'); word.textContent = 'export';
  button.appendChild(word);
  wrap.append(scr, button);
  button.classList.add('dormant'); scr.classList.add('dormant');
  button.setAttribute('aria-disabled', 'true');

  let take: Take | null = null;
  let payoff: Payoff | null = null;
  let alive = true;
  let tick: ReturnType<typeof setInterval> | null = null;
  let wordT: ReturnType<typeof setTimeout> | null = null;
  const led = button.querySelector<HTMLElement>('.sg-led');

  const paint = (): void => {
    if (!take || button.classList.contains('busy')) return;
    const has = take.hasSound();
    scrB.textContent = fmtClock(take.seconds());
    wrap.classList.toggle('alive', has);
    button.classList.toggle('dormant', !has);
    scr.classList.toggle('dormant', !has);
    if (has) button.removeAttribute('aria-disabled'); else button.setAttribute('aria-disabled', 'true');
    if (led) led.classList.toggle('on', has);
  };
  const say = (w: string, back?: number): void => {
    word.textContent = w;
    if (wordT) { clearTimeout(wordT); wordT = null; }
    if (back) wordT = setTimeout(() => { word.textContent = 'export'; button.classList.remove('busy', 'saved'); scrS.textContent = 'song'; wordT = null; paint(); }, back);
  };
  const download = (blob: Blob, name: string): void => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const print = (): void => {
    if (!take || !take.hasSound() || button.classList.contains('busy')) return;
    button.classList.add('busy');
    say('printing');
    setTimeout(() => {
      if (!alive || !take) return;
      const w = take.wav();
      if (!w) { say('export'); button.classList.remove('busy'); return; }
      const m = inst.harmony.state().music;
      const bpm = inst.time.bpm();
      const when = new Date();
      const name = songName(m.key, m.scale, bpm, when);
      const info: SongInfo = { name, seconds: w.seconds, key: KEY_NAMES[((m.key % 12) + 12) % 12] || 'C', scale: m.scale === 'minor' ? 'minor' : 'major', bpm: Math.round(bpm), day: dayOf(when), first: firstTime() };
      scrB.textContent = fmtClock(w.seconds);   // the clock stops on the song's length: ONE source for it
      const land = (): void => {
        if (!alive) return;
        download(w.blob, name);
        markFirst();
        button.classList.add('saved');
        if (led) { led.classList.remove('sg-t-flash'); void led.offsetWidth; led.classList.add('sg-t-flash'); }
        say('saved');
        // the evidence on the screen runs with the cap held at `saved`; then the clock paints again
        const rest = (): void => { if (!alive) return; wordT = setTimeout(() => { word.textContent = 'export'; button.classList.remove('busy', 'saved'); scrS.textContent = 'song'; wordT = null; paint(); }, 600); };
        if (payoff) void payoff.after(info).then(rest, rest); else rest();
      };
      if (payoff) void payoff.show(info).then(land, land);
      else land();
    }, 360);
  };
  button.addEventListener('click', print);

  // a new power-on = a new song: the state lives on #sgm (power.ts writes it)
  const sgm = host.closest<HTMLElement>('.sgm');
  let mo: MutationObserver | null = null;
  if (sgm) {
    mo = new MutationObserver(() => { if (sgm.dataset.state === 'boot' && take) { take.reset(); payoff?.reset(); paint(); } });
    mo.observe(sgm, { attributes: true, attributeFilter: ['data-state'] });
  }

  void createTake(inst.ctx, inst.out.post).then((t) => {
    if (!alive) { t?.dispose(); return; }
    take = t;
    if (!take) return;                     // no AudioWorklet: the corner stays empty
    mountIn.appendChild(wrap);
    if (sgm) payoff = createPayoff(sgm, scrB, scrS);
    paint();
    tick = setInterval(paint, 250);
  });

  return {
    dispose() {
      alive = false;
      if (tick) clearInterval(tick);
      if (wordT) clearTimeout(wordT);
      mo?.disconnect();
      payoff?.dispose();
      take?.dispose();
      wrap.remove();
    },
  };
}
